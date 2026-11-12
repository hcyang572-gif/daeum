/* 닿음 S9c — 하루 방문 동선 계산(화면·지도와 무관한 순수 함수). 브라우저: window.DaeumRoutePlan / node: require.
   - 가상 가구 좌표(시청 (0,0) 기준 평면 km) → 위경도(대략값, 시연용)
   - 순서 후보: 최근접 이웃 → 2-opt 다듬기(직선거리 × 우회 계수 근사)
   - 도로 결과(네이버 Directions 15, 서버 경유)가 오면 구간별 실제 거리·시간으로 시각표를 다시 짠다
   - 시각표: 출발 시각 + 이동 + 상담, 점심 시간에 걸리면 점심 뒤로 미룸 */
(function (root) {
  "use strict";
  // 상주시청(경북 상주시 상산로 223) 대략 위경도 — 공개 지도 위치. 가구 좌표는 이 점 기준 가상 값이다.
  var ORIGIN = { lat: 36.4109, lng: 128.1590 };
  var KM_PER_LAT = 111.0;
  var KM_PER_LNG = 111.32 * Math.cos(ORIGIN.lat * Math.PI / 180);
  var DETOUR = 1.3, KMH = 40, CONSULT_MIN = 30;
  var MAX_ROAD_STOPS = 30; // 한 번에 도로 경로를 받는 최대 방문 수(서버가 15곳씩 나눠 부름)

  function toLatLng(p) { return { lat: +(ORIGIN.lat + p.y / KM_PER_LAT).toFixed(6), lng: +(ORIGIN.lng + p.x / KM_PER_LNG).toFixed(6) }; }
  function kmBetween(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) * DETOUR; }

  /** 출발점 office, 방문지 stops[{id,x,y}], 복귀 여부 ret → 총 근사 km */
  function tourKm(order, office, ret) {
    var cur = office, km = 0;
    order.forEach(function (s) { km += kmBetween(cur, s); cur = s; });
    if (ret && order.length) km += kmBetween(cur, office);
    return km;
  }
  function nearest(stops, office) {
    var left = stops.slice(), cur = office, out = [];
    while (left.length) {
      var bi = 0, bd = Infinity;
      for (var i = 0; i < left.length; i++) { var d = kmBetween(cur, left[i]); if (d < bd) { bd = d; bi = i; } }
      cur = left.splice(bi, 1)[0]; out.push(cur);
    }
    return out;
  }
  /** 2-opt: 구간을 뒤집어 짧아지면 바꾼다(최대 반복 제한). */
  function twoOpt(order, office, ret) {
    var best = order.slice(), bestKm = tourKm(best, office, ret), improved = true, guard = 0;
    while (improved && guard++ < 50) {
      improved = false;
      for (var i = 0; i < best.length - 1; i++) {
        for (var k = i + 1; k < best.length; k++) {
          var cand = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1));
          var km = tourKm(cand, office, ret);
          if (km + 1e-9 < bestKm) { best = cand; bestKm = km; improved = true; }
        }
      }
    }
    return best;
  }
  function sameOrder(a, b) { return a.length === b.length && a.every(function (s, i) { return s.id === b[i].id; }); }

  /** 순서 후보(서로 다른 것만, 짧은 순). 도로 비교는 화면이 이 후보들로 서버에 묻는다. */
  function candidates(stops, office, ret, extra) {
    var out = [], list = [twoOpt(nearest(stops, office), office, ret)];
    if (extra && extra.length === stops.length) list.push(twoOpt(extra, office, ret));
    list.forEach(function (o) { if (!out.some(function (x) { return sameOrder(x, o); })) out.push(o); });
    return out.sort(function (a, b) { return tourKm(a, office, ret) - tourKm(b, office, ret); });
  }

  /** 구간 근사(도로 결과가 없을 때) — 각 구간 {m, s} */
  function approxLegs(order, office, ret) {
    var legs = [], cur = office;
    var pts = order.concat(ret && order.length ? [office] : []);
    pts.forEach(function (p) { var km = kmBetween(cur, p); legs.push({ m: Math.round(km * 1000), s: Math.round(km / KMH * 3600), approx: true }); cur = p; });
    return legs;
  }

  /** 같은 경유지 조합·순서·복귀 여부면 같은 키 → 도로 결과 재사용(호출 절약) */
  function cacheKey(order, ret) { return (ret ? "R:" : "O:") + order.map(function (s) { return s.id; }).join(","); }

  function hm(min) { min = Math.round(min); var h = Math.floor(min / 60) % 24, m = min % 60; return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m; }
  function parseHm(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "")); return m ? (+m[1]) * 60 + (+m[2]) : 9 * 60 + 30; }

  /**
   * 하루 시각표. legs[i] = i번째 방문지까지 이동(마지막에 복귀 구간이 하나 더 있을 수 있음).
   * opts: { start:"09:30", consultMin:30, lunch:["12:00","13:00"] | null, ret:bool }
   * → { rows:[{id, arrive, leave, travelMin, km, lunchBefore}], back, endMin, travelMin, consultMin, km }
   */
  function schedule(order, legs, opts) {
    opts = opts || {};
    var consult = opts.consultMin != null ? +opts.consultMin : CONSULT_MIN;
    var t = parseHm(opts.start || "09:30");
    var L = opts.lunch === null ? null : (opts.lunch || ["12:00", "13:00"]).map(parseHm);
    var lunchDone = false, rows = [], travelMin = 0, km = 0;
    order.forEach(function (s, i) {
      var leg = legs[i] || { m: 0, s: 0 }, tm = leg.s / 60, lunchBefore = false;
      // 출발 전에 점심이 시작됐거나, 도착·상담이 점심 시작을 넘기면 점심 뒤로
      if (L && !lunchDone && (t >= L[0] || t + tm + consult > L[0])) { t = t < L[0] ? L[1] : t + (L[1] - L[0]); lunchDone = true; lunchBefore = true; }
      t += tm; travelMin += tm; km += leg.m / 1000;
      var arrive = t; t += consult;
      rows.push({ id: s.id, arrive: hm(arrive), leave: hm(t), travelMin: Math.round(tm), km: +(leg.m / 1000).toFixed(1), lunchBefore: lunchBefore, approx: !!(leg.approx || leg.split) });
    });
    var back = null;
    if (opts.ret && legs.length > order.length) {
      var b = legs[order.length]; t += b.s / 60; travelMin += b.s / 60; km += b.m / 1000;
      back = { arrive: hm(t), travelMin: Math.round(b.s / 60), km: +(b.m / 1000).toFixed(1), approx: !!(b.approx || b.split) };
    }
    var approx = !legs.length || legs.slice(0, order.length + (back ? 1 : 0)).some(function (l) { return !l || l.approx || l.split; });
    return { rows: rows, back: back, endMin: Math.round(t), end: hm(t), travelMin: Math.round(travelMin), consultMin: consult * order.length, km: +km.toFixed(1), approx: approx };
  }

  /** O-06: 근무 시간 넘김 — 마침(복귀) 18:00 넘음 또는 이동+상담 8시간(480분) 넘음. → { over, end, workMin, why:[] } */
  var WORK_END = "18:00", WORK_MIN = 480;
  function overWork(sch) {
    var why = [], workMin = (sch.travelMin || 0) + (sch.consultMin || 0);
    if (sch.endMin > parseHm(WORK_END)) why.push((sch.back ? "복귀 " : "마침 ") + sch.end + " — 18시를 넘습니다");
    if (workMin > WORK_MIN) why.push("이동+상담 " + (workMin / 60).toFixed(1) + "시간 — 8시간을 넘습니다");
    return { over: why.length > 0, end: sch.end, workMin: workMin, why: why };
  }

  /** 순서 옮기기(끌어 놓기·위/아래 단추 공용) — 새 배열 */
  function move(arr, from, to) {
    var a = arr.slice(); if (from < 0 || from >= a.length || to < 0 || to >= a.length || from === to) return a;
    var x = a.splice(from, 1)[0]; a.splice(to, 0, x); return a;
  }

  // ── S12-i4 도로 경로 «기기 안 당일 보관»·대체·다시 짜기·일정 공유 (순수 함수, 저장소는 넣어 준다) ──
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function dayStamp(now) { var d = now != null ? new Date(now) : new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  /**
   * 같은 경로(경유지·순서·복귀)는 그날 이 기기 안에서 다시 부르지 않는다. 날짜가 바뀌면 통째로 버린다.
   * storage: localStorage 모양({getItem,setItem,removeItem}) 또는 null(보관 없이 동작) · nowFn: 시험용 시계
   * 모든 읽기·쓰기는 try/catch — 사생활 보호 창·저장 막힘에서도 화면은 그대로 돈다.
   * block(why): 상한(429)에 닿으면 그날은 서버를 더 부르지 않는다(어림값으로 바로 대체).
   */
  function dayCache(storage, lsKey, nowFn, max) {
    lsKey = lsKey || "daeum.road.day"; max = max || 40;
    var mem = null;
    function today() { return dayStamp(nowFn ? nowFn() : Date.now()); }
    function read() {
      var t = today(), o = mem;
      if (!o) { try { o = storage ? JSON.parse(storage.getItem(lsKey) || "null") : null; } catch (e) { o = null; } }
      if (!o || o.day !== t || typeof o.r !== "object" || !o.r) o = { day: t, r: {}, ks: [], block: null };
      if (!Array.isArray(o.ks)) o.ks = Object.keys(o.r);
      mem = o; return o;
    }
    function write(o) { mem = o; try { if (storage) storage.setItem(lsKey, JSON.stringify(o)); } catch (e) { /* 용량 초과·막힘 — 기억(mem)으로만 */ } }
    return {
      get: function (k) { var o = read(); return o.r[k] || null; },
      put: function (k, v) {
        var o = read(); if (!o.r[k]) o.ks.push(k); o.r[k] = v;
        while (o.ks.length > max) delete o.r[o.ks.shift()];
        write(o);
      },
      blocked: function () { return read().block; },
      block: function (why) { var o = read(); o.block = why || "limit"; write(o); },
      day: function () { return read().day; },
      clearOld: function () { try { if (storage && storage.removeItem) storage.removeItem("daeum.officer.road"); } catch (e) { /* 옛 7일 보관 지움 */ } }
    };
  }
  /** 도로 결과 대신 쓰는 직선 어림값(구간마다 approx) — 화면은 수치 앞에 «약» */
  function approxRoad(order, office, ret) {
    var legs = approxLegs(order, office, ret), m = 0, s = 0;
    legs.forEach(function (l) { m += l.m; s += l.s; });
    return { legs: legs, m: m, s: s, path: null, approx: true };
  }
  /** 다시 짜기 후보: 최근접+2-opt · (명단 순서)+2-opt · 각각 거꾸로 — 서로 다른 것만, 최대 n개(도로 호출 수 = 후보 수) */
  function replanCandidates(stops, office, ret, listOrder, n) {
    var base = candidates(stops, office, ret, listOrder), out = [];
    base.concat(base.map(function (o) { return o.slice().reverse(); })).forEach(function (o) {
      if (out.length < (n || 3) && !out.some(function (x) { return sameOrder(x, o); })) out.push(o);
    });
    return out;
  }
  /** 후보별 결과({legs,s,m,approx}) 중 가장 빠른 것 — 도로 결과가 하나라도 있으면 도로 결과끼리만 비교. → 번호 */
  function pickBest(results) {
    var anyRoad = results.some(function (r) { return r && !r.approx; }), bi = -1, bs = Infinity, bm = Infinity;
    results.forEach(function (r, i) {
      if (!r || (anyRoad && r.approx)) return;
      var s = r.s != null ? r.s : (r.legs || []).reduce(function (a, l) { return a + l.s; }, 0), m = r.m != null ? r.m : (r.legs || []).reduce(function (a, l) { return a + l.m; }, 0);
      if (s < bs - 1e-9 || (Math.abs(s - bs) < 1e-9 && m < bm)) { bi = i; bs = s; bm = m; }
    });
    return bi;
  }
  /**
   * 하루 일정 공유 문장(Web Share). ⛔ 개인정보 금지 — 가구번호·읍면·시각만 쓴다(이름·주소·나이·사유·메모를 넘겨도 읽지 않는다).
   * info: { label:"11월 12일(목) 1일차", start:"09:30", stops:[{id, area, arrive}], back:"15:20"|null, approx:bool, km, travelMin }
   */
  function shareText(info) {
    info = info || {};
    var safe = function (v) { return String(v == null ? "" : v).replace(/\s+/g, " ").slice(0, 24); };
    var L = ["[닿음] " + safe(info.label || "방문 일정") + " 방문 일정", safe(info.start || "09:30") + " 상주시청 출발"];
    (info.stops || []).forEach(function (s, i) { L.push((i + 1) + ". " + safe(s.arrive) + " " + safe(s.id) + " (" + safe(s.area) + ")"); });
    if (info.back) L.push(safe(info.back) + " 시청 복귀");
    if (info.km != null) L.push("이동 " + (info.approx ? "약 " : "") + info.km + "km" + (info.travelMin != null ? " · " + (info.approx ? "약 " : "") + info.travelMin + "분" : ""));
    L.push("※ 가구번호·읍면·시각만 담았습니다(시연용 가상 가구)");
    return L.join(String.fromCharCode(10));
  }

  var api = { ORIGIN: ORIGIN, DETOUR: DETOUR, KMH: KMH, CONSULT_MIN: CONSULT_MIN, MAX_ROAD_STOPS: MAX_ROAD_STOPS,
    toLatLng: toLatLng, kmBetween: kmBetween, tourKm: tourKm, nearest: nearest, twoOpt: twoOpt, candidates: candidates,
    approxLegs: approxLegs, cacheKey: cacheKey, schedule: schedule, overWork: overWork, move: move, hm: hm, parseHm: parseHm,
    dayStamp: dayStamp, dayCache: dayCache, approxRoad: approxRoad, replanCandidates: replanCandidates, pickBest: pickBest, shareText: shareText };
  // 브라우저: 기기 안 당일 보관 하나를 공용으로(route_map.js 의 서버 호출·app.js 시각표가 같은 것을 본다)
  if (typeof window !== "undefined") { try { api.roadStore = dayCache(window.localStorage, "daeum.road.day"); } catch (e) { api.roadStore = dayCache(null, "daeum.road.day"); } api.roadStore.clearOld(); }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DaeumRoutePlan = api;
})(this);
