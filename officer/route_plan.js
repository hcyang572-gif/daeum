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
      rows.push({ id: s.id, arrive: hm(arrive), leave: hm(t), travelMin: Math.round(tm), km: +(leg.m / 1000).toFixed(1), lunchBefore: lunchBefore, approx: !!leg.approx });
    });
    var back = null;
    if (opts.ret && legs.length > order.length) {
      var b = legs[order.length]; t += b.s / 60; travelMin += b.s / 60; km += b.m / 1000;
      back = { arrive: hm(t), travelMin: Math.round(b.s / 60), km: +(b.m / 1000).toFixed(1) };
    }
    return { rows: rows, back: back, endMin: Math.round(t), end: hm(t), travelMin: Math.round(travelMin), consultMin: consult * order.length, km: +km.toFixed(1) };
  }

  /** 순서 옮기기(끌어 놓기·위/아래 단추 공용) — 새 배열 */
  function move(arr, from, to) {
    var a = arr.slice(); if (from < 0 || from >= a.length || to < 0 || to >= a.length || from === to) return a;
    var x = a.splice(from, 1)[0]; a.splice(to, 0, x); return a;
  }

  var api = { ORIGIN: ORIGIN, DETOUR: DETOUR, KMH: KMH, CONSULT_MIN: CONSULT_MIN, MAX_ROAD_STOPS: MAX_ROAD_STOPS,
    toLatLng: toLatLng, kmBetween: kmBetween, tourKm: tourKm, nearest: nearest, twoOpt: twoOpt, candidates: candidates,
    approxLegs: approxLegs, cacheKey: cacheKey, schedule: schedule, move: move, hm: hm, parseHm: parseHm };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DaeumRoutePlan = api;
})(this);
