/* 닿음 방문 하루 계산 — 출발지·날짜·실제 시각 재계산·남은 집 다시 짜기·날씨 예보 한 조각·찾아가는 길 (102회차 ⚙️ 파로B, 2026-11-14)
   근거: 정본 시안 v3 Version 8 «방문» 화면(plan·route) · 요구 원장 docs/REQUIREMENTS_LEDGER_98.md
     B9 출발지·날짜(주) = V3-1·V3-2·VISIT-I2·VISIT-I5 · B8 재계산(주) = VISIT-I6 → TODAY-I2 가 부름
     B1a 재계획(주) = VISIT-A2 → TODAY-A2·FIELD-A5 가 부름 · B1b 날씨(주) = TODAY-I5 → VISIT-A5 가 부름 · VISIT-A1 부재 시간대 · VISIT-A3 찾아가는 길 · VISIT-I4 가까운 가구
   화면 없이 값만 계산하는 순수 함수(node 시험: node shared/visit_day.test.js). 화면은 app/tab_visit.js, 다른 탭은 AK.visitDay 로 같은 함수를 부른다.
   ⛔ 지명→좌표는 명단 데이터의 읍면 중심(가상 대략값)만 쓴다 — 외부 지오코딩 호출 없음. 위치는 기기 안에서만(서버로 보내지 않음). */
(function (root, factory) {
  var M = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = M; else root.DaeumVisitDay = M;
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  var DEP_KEY = "daeum.officer.depart", WAY_KEY = "daeum.officer.ways";
  var TIMES = ["09:00", "09:30", "10:00"], KINDS = ["here", "work", "text"], WORK_END = 18 * 60;
  var WD = ["일", "월", "화", "수", "목", "금", "토"];

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hm(min) { min = Math.round(min); return pad(Math.floor(min / 60) % 24) + ":" + pad(min % 60); }
  function pm(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "")); return m ? +m[1] * 60 + +m[2] : null; }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  // ── B9 출발지·출발 시각(V3-1·VISIT-I2) ──
  /** 저장 값 정리 — 기본은 «근무지 09:30»(다른 탭의 시각표와 같은 출발) */
  function normDep(o) {
    o = o || {};
    var h = o.here && isFinite(+o.here.x) && isFinite(+o.here.y) ? { x: +o.here.x, y: +o.here.y, at: o.here.at || null } : null;
    return { kind: KINDS.indexOf(o.kind) >= 0 ? o.kind : "work", text: String(o.text || "").replace(/\s+/g, " ").trim().slice(0, 40), time: TIMES.indexOf(o.time) >= 0 ? o.time : "09:30", here: h };
  }
  function nearestArea(pt, areas) {
    var best = null, bd = Infinity;
    (areas || []).forEach(function (a) { var d = dist(pt, a); if (d < bd) { bd = d; best = a; } });
    return best ? { name: best.name, km: bd } : null;
  }
  /** 직접 입력한 말 → 아는 곳(근무지 별칭·읍면 이름). 모르면 null */
  function matchPlace(text, ctx) {
    var t = String(text || "").replace(/\s+/g, "");
    if (!t) return null;
    if (/^(시청|상주시청|근무지|사무실|청사)$/.test(t) || /상주시청/.test(t)) return { x: ctx.office.x, y: ctx.office.y, name: ctx.office.name || "상주시청" };
    var hit = null;
    (ctx.areas || []).forEach(function (a) { var s = String(a.name || ""), stem = s.replace(/(읍|면|동)$/, ""); if (!hit && s && (t.indexOf(s) >= 0 || (stem.length >= 2 && t.indexOf(stem) >= 0))) hit = a; });
    return hit ? { x: hit.x, y: hit.y, name: hit.name } : null;
  }
  /** 출발점 좌표·이름·안내 한 줄. ctx = {office:{x,y,name}, areas:[{name,x,y}], here:{x,y}|null, demoHere:{x,y}|null} */
  function placeOf(dep, ctx) {
    dep = normDep(dep); ctx = ctx || {};
    var off = ctx.office || { x: 0, y: 0, name: "상주시청" }, offName = off.name || "상주시청";
    var work = { x: off.x, y: off.y, name: "내 근무지", note: "내 근무지 · " + offName, kind: "work", known: true };
    if (dep.kind === "work") return work;
    if (dep.kind === "here") {
      var h = dep.here || ctx.here, demo = false;
      if (!h && ctx.demoHere) { h = ctx.demoHere; demo = true; }
      if (!h) return { x: off.x, y: off.y, name: "지금 위치", note: "위치를 아직 받지 못해 근무지 기준으로 셉니다", kind: "here", known: false };
      var na = nearestArea(h, ctx.areas);
      return { x: h.x, y: h.y, name: "지금 위치", note: "현재 위치 · " + (na ? na.name + " 부근" : "상주시 안") + (demo ? "(시연 위치)" : ""), kind: "here", known: true, demo: demo };
    }
    var m = matchPlace(dep.text, ctx);
    if (!dep.text) return { x: off.x, y: off.y, name: "직접 입력한 곳", note: "", kind: "text", known: false };
    if (m) return { x: m.x, y: m.y, name: dep.text, note: m.name + " 기준으로 셉니다", kind: "text", known: true };
    return { x: off.x, y: off.y, name: dep.text, note: "«" + dep.text + "» 위치를 몰라 근무지 기준으로 셉니다", kind: "text", known: false };
  }
  /** 하루 시각표 — origin 에서 출발해 back(근무지)으로 복귀. RP = DaeumRoutePlan. legs 를 주면(도로 결과) 그대로 */
  function schedule(RP, stops, o) {
    o = o || {};
    var origin = o.origin || { x: 0, y: 0 }, back = o.back || origin, legs = o.legs;
    if (!legs) {
      legs = RP.approxLegs(stops, origin, false);
      if (stops.length) legs = legs.concat(RP.approxLegs([back], stops[stops.length - 1], false));
    }
    var st = pm(o.start) != null ? pm(o.start) : 570, lunch = o.lunch !== undefined ? o.lunch : st >= 12 * 60 ? null : undefined;
    return RP.schedule(stops, legs, { start: hm(st), ret: true, lunch: lunch });
  }

  // ── B9 날짜(V3-2·VISIT-I5) — 근무일 단위 앞뒤 화살표, 달력은 주말·공휴일이면 다음 근무일 ──
  function toDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "")); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function weekendOff(d) { var w = d.getDay(); return w === 0 || w === 6; }
  function stepWorkday(s, dir, isOff) {
    var d = toDate(s); if (!d) return null; isOff = isOff || weekendOff; dir = dir < 0 ? -1 : 1;
    var n = 0; do { d.setDate(d.getDate() + dir); n++; } while (isOff(d) && n < 30);
    return ymd(d);
  }
  function snapWorkday(s, isOff) {
    var d = toDate(s); if (!d) return null; isOff = isOff || weekendOff;
    var n = 0; while (isOff(d) && n < 30) { d.setDate(d.getDate() + 1); n++; }
    return ymd(d);
  }
  /** «11월 16일(월)» */
  function dateLabel(s) { var d = toDate(s); return d ? d.getMonth() + 1 + "월 " + d.getDate() + "일(" + WD[d.getDay()] + ")" : "날짜 미정"; }
  function mdShort(s) { var d = toDate(s); return d ? pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "(" + WD[d.getDay()] + ")" : ""; }
  /** 일차 n 의 날짜를 to 로 — 앞 일차보다 늦고 뒤 일차보다 일러야. 같은 날이 다른 일차면 swap 후보로 알려 줌 */
  function dateCheck(days, n, to) {
    var pv = days.filter(function (d) { return d.n === n - 1; })[0], nx = days.filter(function (d) { return d.n === n + 1; })[0];
    var same = days.filter(function (d) { return d.n !== n && d.date === to; })[0];
    if (same) return { ok: false, why: "same", other: same.n };
    if (pv && pv.date && to <= pv.date) return { ok: false, why: "before", other: pv.n };
    if (nx && nx.date && to >= nx.date) return { ok: false, why: "after", other: nx.n };
    return { ok: true };
  }

  // ── VISIT-I4 «가구 넣기» — 이 일차 동선(출발점 포함)에서 가까운 순 ──
  function nearestTo(dayPts, cands, k) {
    var out = (cands || []).map(function (c) {
      var m = Infinity; (dayPts || []).forEach(function (p) { var d = dist(p, c); if (d < m) m = d; });
      return { id: c.id, n: c.n, area: c.area, km: Math.round(m * 1.3 * 10) / 10 };
    }).sort(function (a, b) { return a.km - b.km || (a.id < b.id ? -1 : 1); });
    return k ? out.slice(0, k) : out;
  }

  // ── B8 실제 시각으로 다시 셈(VISIT-I6 주 → TODAY-I2) ──
  /** sch = 계획 시각표({rows:[{id,arrive,leave,travelMin,lunchBefore}], back}) · actual = {id: "HH:MM"(기록·떠난 시각)}
      → {rows:[{id, arrive, plan, moved, done}], back, shift, over, last:{id, stay}} — 기록 뒤 남은 집 도착·복귀를 실제 시각 기준으로 */
  function resched(sch, actual, o) {
    o = o || {}; actual = actual || {};
    var rows = [], t = null, shift = 0, last = null, lunchEnd = 13 * 60;
    (sch.rows || []).forEach(function (r) {
      var pa = pm(r.arrive), pl = pm(r.leave), cons = pl != null && pa != null ? pl - pa : 30;
      if (actual[r.id] != null && pm(actual[r.id]) != null) {
        t = pm(actual[r.id]); last = { id: r.id, stay: Math.max(0, t - pa), at: actual[r.id] };
        rows.push({ id: r.id, arrive: r.arrive, plan: r.arrive, moved: 0, done: true }); return;
      }
      if (t == null) { rows.push({ id: r.id, arrive: r.arrive, plan: r.arrive, moved: 0, done: false }); return; }
      if (r.lunchBefore && t < lunchEnd) t = Math.max(t, lunchEnd);
      var a = t + (r.travelMin || 0), mv = a - pa; t = a + cons;
      if (!shift && mv) shift = mv;
      rows.push({ id: r.id, arrive: hm(a), plan: r.arrive, moved: mv, done: false });
    });
    var bp = sch.back ? pm(sch.back.arrive) : null, bm = t != null && sch.back ? t + (sch.back.travelMin || 0) : bp;
    return { rows: rows, back: bm != null ? hm(bm) : null, backPlan: sch.back ? sch.back.arrive : null, shift: shift, over: bm != null && bm > (o.workEnd || WORK_END), last: last, show: Math.abs(shift) >= (o.min || 10) || (bm != null && bm > (o.workEnd || WORK_END)) };
  }

  // ── B1a 남은 집 다시 짜기(VISIT-A2 주 → TODAY-A2·FIELD-A5) ──
  /** from = 지금 자리{x,y} · stops = 남은 집[{id,x,y}] · back = 근무지 · nowMin = 지금 시각(분)
      → {ids: 새 순서, later: 근무시간 안에 못 가는 집(다음 근무일로), sch} — 최근접 이웃 → 2-opt, 복귀가 18시를 넘으면 뒤에서부터 덜어냄 */
  function replanRemaining(RP, from, stops, back, nowMin, o) {
    o = o || {};
    var ord = stops.length > 1 ? RP.twoOpt(RP.nearest(stops, from), from, false) : stops.slice(), later = [];
    var sch = schedule(RP, ord, { origin: from, back: back, start: hm(nowMin) });
    while (ord.length > 1 && sch.endMin > (o.workEnd || WORK_END)) { later.unshift(ord.pop().id); sch = schedule(RP, ord, { origin: from, back: back, start: hm(nowMin) }); }
    return { ids: ord.map(function (s) { return s.id; }), later: later, sch: sch };
  }
  /** 부재 집을 오늘 다시 들르기 — 남은 순서 끝 쪽(추천 시간대가 오후면 맨 끝, 아니면 바로 다음 뒤)에 끼울 자리 */
  function againSlot(leftIds, bestBand) { return /late|eve|noon/.test(bestBand || "") ? leftIds.length : Math.min(1, leftIds.length); }

  // ── VISIT-A1 부재 시간대 «오전 부재 2번 · 오후 권장» ──
  function absHint(pf) {
    if (!pf || !pf.absences || !pf.absences.length) return "";
    var cnt = {}, ord = [];
    pf.absences.forEach(function (a) { if (!cnt[a.label]) ord.push(a.label); cnt[a.label] = (cnt[a.label] || 0) + 1; });
    var best = pf.best ? pf.best.label.replace(/^이른 /, "") : "";
    return ord.map(function (l) { return l + " 부재 " + cnt[l] + "번"; }).join(" · ") + (best ? " · " + best + " 권장" : "");
  }

  // ── B1b 날씨 예보 한 조각(TODAY-I5 주 → VISIT-A5) — 특보·급변(지금 안 오는데 오늘 안에 옴) 때만 ──
  var PTY = { 1: "비", 2: "비·눈", 3: "눈", 4: "소나기", 5: "빗방울", 6: "빗방울·눈날림", 7: "눈날림" };
  /** w.fc = [{h:15, pty:1, pop:60}] (서버 초단기·단기예보에서 시각별) · nowH = 지금 시(0~23) */
  function fcPiece(w, nowH) {
    if (!w || !w.fc || !w.fc.length || (+w.pty || 0) > 0) return null;
    var f = w.fc.filter(function (x) { return x && +x.pty > 0 && PTY[+x.pty] && +x.h > nowH && +x.h <= 21; }).sort(function (a, b) { return a.h - b.h; })[0];
    if (!f) return null;
    var nm = PTY[+f.pty], pop = +f.pop > 0 ? " " + Math.round(+f.pop) + "%" : "";
    return { txt: +f.h + "시 " + nm + pop, short: (+f.h >= 12 ? "오후 " : "오전 ") + nm + pop, k: /눈/.test(nm) && !/비/.test(nm) ? "snow" : "rain", h: +f.h };
  }
  /** 일차 카드 배지 — 실제 특보가 먼저, 없으면 예보 한 조각 */
  function dayBadge(w, nowH) {
    var a = w && (w.warn || []).filter(function (x) { return /주의보|경보/.test(String(x)); })[0];
    if (a) return { txt: String(a), k: /한파|대설/.test(a) ? "snow" : /호우|태풍|폭우/.test(a) ? "rain" : "warn" };
    var f = fcPiece(w, nowH);
    return f ? { txt: f.short, k: f.k } : null;
  }
  /** 시연 상황 «오후 비 예보»·«한파특보» — 주소에 ?wx=rain|cold 일 때만(가짜 값, 띠에 «시연» 표시) */
  function demoWeather(kind, now) {
    now = now || new Date();
    var d = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
    if (kind === "rain") return { t: 8.2, sky: 4, pty: 0, rn1: 0, warn: [], pre: [], at: d + "1100", fc: [{ h: 15, pty: 1, pop: 60 }], src: "기상청", demo: true };
    if (kind === "cold") return { t: -11.4, sky: 1, pty: 0, rn1: 0, warn: ["한파주의보"], pre: [], at: d + "0500", fc: [], src: "기상청", demo: true };
    return null;
  }

  // ── VISIT-A3 찾아가는 길 메모 {hid:{t, at}} ──
  var DEMO_WAYS = ["마을회관 뒤 두 번째 골목 · 파란 대문 · 차는 회관 앞", "농로 끝 비닐하우스 옆 · 차는 다리 앞에", "시장 골목 상가 2층 · 계단은 약국 왼쪽", "초등학교 뒤 첫 집 · 마당 넓음", "둑길 끝 하천변 · 차는 둑 아래"];
  function hash(s) { var h = 0; String(s).split("").forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return h; }
  function wayOf(store, hid, demo) {
    var v = store && store[hid];
    if (v && v.t) return { t: String(v.t), at: v.at || null, mine: true };
    return demo ? { t: DEMO_WAYS[hash(hid) % DEMO_WAYS.length], demo: true } : null;
  }
  function setWay(store, hid, text, at) {
    var o = Object.assign({}, store || {}), t = String(text || "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (t) o[hid] = { t: t, at: at || new Date().toISOString() }; else delete o[hid];
    return o;
  }

  return {
    DEP_KEY: DEP_KEY, WAY_KEY: WAY_KEY, TIMES: TIMES, KINDS: KINDS, WORK_END: WORK_END,
    hm: hm, pm: pm, normDep: normDep, nearestArea: nearestArea, matchPlace: matchPlace, placeOf: placeOf, schedule: schedule,
    stepWorkday: stepWorkday, snapWorkday: snapWorkday, dateLabel: dateLabel, mdShort: mdShort, dateCheck: dateCheck,
    nearestTo: nearestTo, resched: resched, replanRemaining: replanRemaining, againSlot: againSlot, absHint: absHint,
    fcPiece: fcPiece, dayBadge: dayBadge, demoWeather: demoWeather, wayOf: wayOf, setWay: setWay
  };
});
