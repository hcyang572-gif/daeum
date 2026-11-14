/* 복지 사각지대 현장 업무 도우미(닿음) — 방문 탭(#plan·#route) — 공통 지도 SVG(mapSvg) · 방문 계획 P1(planView·bindPlan·reorder·replan·moveIn·공유) · 동선 M1(routeView·bindRoute·네이버 지도 rmLoad·rtMapBind·연계처 resBlock·navBack)
   101회차 ⚙️ 파로(2026-11-14): app/app.js 에서 그대로 옮겨 나눔(동작 변경 0). 화면 함수 본문은 app.js 때와 같은 글자·같은 들여쓰기.
   잇는 법: app.js 가 원래 자리 순서대로 DaeumTabs.visit(AK) 를 부른다. AK = 공통 이름 창구(app.js·다른 탭의 이름을 «읽을 때의 값»으로 돌려줌).
   받는 이름은 relink() 가 지역 변수로 채우고(부를 때 한 번 + app.js 가 모든 탭을 읽은 뒤 한 번 더), 여러 파일이 함께 바꾸는 값은 AK.이름 으로 읽고 쓴다.
   102회차 ⚙️ 파로B(2026-11-14, 정본 시안 v3 Version 8 «방문»): 출발 카드(날짜 앞뒤·달력·출발지 3종·시각 — V3-1·V3-2·VISIT-I2) · 머리 한 줄(I1) · 다음 일차로 보내기(I3) ·
   가구 넣기 가까운 순 시트(I4) · 다른 일차와 날짜 바꾸기(I5) · 실제 시각 재계산 카드(I6, B8 주) · 부재 시간대(A1) · 남은 집 다시 짜기·다음 근무일로(A2, B1a 주) ·
   찾아가는 길(A3) · 내 위치 점(A4) · 일차 카드 특보·비 예보(A5, B1b). 계산은 shared/visit_day.js(DaeumVisitDay), 다른 탭은 AK.visitDay·visitResched·visitLater·visitAgain 으로 부른다. */
(window.DaeumTabs = window.DaeumTabs || {}).visit = function (AK) {
  "use strict";
  var F, RP, SY, RES, BY, OFFICE, app, I, ii, ckPath, LS_DL, LS_DOUT, LS_DMOVE, LS_DDATE, esc, lsGet, lsSet, ymd, md, hm, clip, vib, meta, listIds,
      roundYm, attempts, plan, neighborLog, deadline, rank, rankBy, indText, ageLine, routeOrder, planDrop, sched, yak, days, statusOf, top, qv,
      qcards, pickHid, phEmpty, copy, toast, C2, render, U, logs, lastLog, sched0, isTyping;
  function relink() {
    F = AK.F; RP = AK.RP; SY = AK.SY; RES = AK.RES; BY = AK.BY; OFFICE = AK.OFFICE; app = AK.app; I = AK.I;
    ii = AK.ii; ckPath = AK.ckPath; LS_DL = AK.LS_DL; LS_DOUT = AK.LS_DOUT; LS_DMOVE = AK.LS_DMOVE; LS_DDATE = AK.LS_DDATE; esc = AK.esc; lsGet = AK.lsGet;
    lsSet = AK.lsSet; ymd = AK.ymd; md = AK.md; hm = AK.hm; clip = AK.clip; vib = AK.vib; meta = AK.meta; listIds = AK.listIds;
    roundYm = AK.roundYm; attempts = AK.attempts; plan = AK.plan; neighborLog = AK.neighborLog; deadline = AK.deadline; rank = AK.rank; rankBy = AK.rankBy; indText = AK.indText;
    ageLine = AK.ageLine; routeOrder = AK.routeOrder; planDrop = AK.planDrop; sched = AK.sched; yak = AK.yak; days = AK.days; statusOf = AK.statusOf; top = AK.top;
    qv = AK.qv; qcards = AK.qcards; pickHid = AK.pickHid; phEmpty = AK.phEmpty; copy = AK.copy; toast = AK.toast; C2 = AK.C2; render = AK.render;
    U = AK.U; logs = AK.logs; lastLog = AK.lastLog; isTyping = AK.isTyping; sched0 = AK.sched; sched = schedDep; // 102회차: 출발지·출발 시각을 따르는 시각표(기본 «근무지 09:30»이면 app.js 시각표 그대로)
  }
  relink();
  // ═════ 102회차 방문 하루 — 출발지·출발 시각·날짜(B9) · 실제 시각 재계산(B8) · 남은 집 다시 짜기(B1a) · 날씨 배지(B1b) · 찾아가는 길 · 내 위치 ═════
  //   계산은 shared/visit_day.js. 출발 설정은 이 기기 «daeum.officer.depart»(계정 저장 허용 키에 넣으면 PC·폰 같은 값 — 보고 «넣을 줄»).
  //   ⛔ 위치는 이 기기 안에서만 쓰고 서버·외부로 보내지 않는다. 지명 → 좌표는 명단 데이터의 읍면 중심(가상 대략값)만.
  var VD = window.DaeumVisitDay || null, LS_AGAIN = "daeum.officer.again", HERE = null, geoW = null, VXI = {
    cloud: '<path d="M7 18.5h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 18.5z"/><path d="M9 21l1-1.5M13 21l1-1.5"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>', swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    warn: '<path d="M12 4 3 19.5h18z"/><path d="M12 10v4.5M12 17v.2"/>'
  };
  if (!VD && typeof document !== "undefined" && document.head) { // index.html 에 줄이 아직 없을 때만 스스로 불러와 다시 그림
    var vdS = document.createElement("script"); vdS.src = "shared/visit_day.js?v=s12z109"; vdS.onload = function () { VD = window.DaeumVisitDay || null; if (VD && AK.render) AK.render(); }; document.head.appendChild(vdS);
  }
  function vic(k) { return '<svg class="ic i16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (VXI[k] || "") + "</svg>"; }
  // 105회차 ⚙️ 파로A: 출발 기본값 = «지금 위치»(옛 «근무지 09:30» 기본 폐기, 시안 V16 출발 칩 첫 칸). 저장 전·auto 표시면 «자동»:
  //   위치를 받았고(상주 안 HERE_KM 이내) 또는 시연 위치가 있으면 지금 위치 · 위치 권한 거부·실패·위치 기능 없음이면 조용히 근무지(안내 문구 없이).
  //   사람이 출발 칩(지금 위치·근무지·직접 입력)을 누르면 그 값으로 고정(auto 해제). 시각만 바꾸면 자동은 그대로.
  var GEOFAIL = false, geoTried = false, HERE_KM = 45;
  function hereOk() { return !!(HERE && Math.sqrt(Math.pow(HERE.x - (OFFICE.x || 0), 2) + Math.pow(HERE.y - (OFFICE.y || 0), 2)) <= HERE_KM); } // 상주 밖(서울 시연 등) 좌표로 하루 시각표가 깨지지 않게
  function depAutoKind() { return hereOk() || (demoOn() && !GEOFAIL) ? "here" : "work"; }
  function depGet() {
    if (!VD) return { kind: "work", time: "09:30", text: "" };
    var raw = lsGet(VD.DEP_KEY, null), d = VD.normDep(raw);
    if (!raw || !raw.kind || raw.auto) { d.auto = true; d.kind = depAutoKind(); d.here = null; }
    return d;
  }
  function depSet(d) { var o = VD.normDep(d); if (d.auto) { o.auto = true; o.kind = "here"; o.here = null; } lsSet(VD.DEP_KEY, o); }
  function areas() { var D = window.__DAEUM_HOUSEHOLDS__; return (D && D.areas) || []; }
  function demoOn() { try { return !/[?&]demo=off\b/.test(location.search) && (window.DAEUM_CONFIG || {}).demoSeed !== false; } catch (e) { return true; } }
  function placeNow(ids) {
    var d = depGet(), f = ids && ids.length && BY[ids[0]] ? BY[ids[0]] : null;
    var ctx = { office: { x: OFFICE.x || 0, y: OFFICE.y || 0, name: "상주시청" }, areas: areas(), here: d.auto ? (hereOk() ? HERE : null) : HERE, demoHere: demoOn() && f ? { x: f.x - 0.4, y: f.y - 0.5 } : null };
    var p = VD.placeOf(d, ctx);
    return d.auto && !p.known ? VD.placeOf({ kind: "work", time: d.time }, ctx) : p; // 자동인데 위치를 못 받음 → 조용히 근무지
  }
  /** 자동 출발이면 방문 화면을 열 때 한 번 위치를 받아 본다 — 거부·실패면 GEOFAIL(근무지로 조용히). 좌표는 이 기기 안에서만 */
  function depAutoGeo() {
    if (geoTried || HERE || !VD || !depGet().auto) return; geoTried = true;
    var again = function () { if (!(isTyping && isTyping())) render(true); };
    if (typeof navigator === "undefined" || !navigator.geolocation) { GEOFAIL = true; again(); return; }
    var ask = function () { geoAsk(function (ok) { if (!ok) GEOFAIL = true; again(); }); };
    if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: "geolocation" }).then(function (st) { if (st.state === "denied") { GEOFAIL = true; again(); } else ask(); }, ask);
    else ask();
  }
  /** 출발지·출발 시각을 따르는 시각표 — 기본(근무지 09:30)이면 app.js 시각표(도로 결과 포함) 그대로 */
  function schedDep(ids) {
    var d = depGet();
    if (!VD || (d.kind === "work" && d.time === "09:30") || !ids || !ids.length) return sched0(ids);
    var pl = placeNow(ids), off = { x: OFFICE.x || 0, y: OFFICE.y || 0 }, stops = ids.map(function (id) { return { id: id, x: BY[id].x, y: BY[id].y, h: BY[id] }; }), legs;
    if (pl.x === off.x && pl.y === off.y && RP.roadStore) { var hit = RP.roadStore.get(RP.cacheKey(stops, true)); if (hit && hit.legs && hit.legs.length === stops.length + 1) legs = hit.legs; }
    return VD.schedule(RP, stops, { origin: pl, back: off, start: d.time, legs: legs });
  }
  /** days() 에 출발 설정을 입힌 사본 */
  function vdays() { return days().map(function (d) { return Object.assign({}, d, { s: sched(d.ids) }); }); }
  function nowH() { return new Date().getHours(); }
  function wxBadge(d) {
    var WX = window.DaeumWeather, w = WX && WX.current ? WX.current() : null; if (!VD || !w || d.date !== ymd(new Date())) return "";
    var b = VD.dayBadge(w, nowH()); return b ? '<span class="tag vx-wxb ' + b.k + '">' + vic(b.k === "snow" ? "snow" : b.k === "rain" ? "cloud" : "warn") + esc(b.txt) + "</span>" : "";
  }
  function absHint(id) { if (!VD || !F.visitTime) return ""; var h = VD.absHint(F.visitTime.profile(attempts(), id, { neighborLog: neighborLog() })); return h ? '<div class="vx-hint">' + ii("clock") + "<span>" + esc(h) + "</span></div>" : ""; }
  /** 출발 카드 — 날짜 ‹ › 달력 · 출발(지금 위치·근무지·직접 입력) · 시각 (시안 v3 plan «dep» 그대로) */
  function depCard(D4, ds) {
    var d = depGet(), pl = placeNow(D4.ids), isOff = U && U.isOff ? U.isOff : null, dt = D4.date || ymd(new Date());
    var pv = VD.stepWorkday(dt, -1, isOff), nx = VD.stepWorkday(dt, 1, isOff), cp = VD.dateCheck(ds, D4.n, pv), cn = VD.dateCheck(ds, D4.n, nx);
    var dis = function (c) { return !c.ok && c.why !== "same" ? " disabled" : ""; };
    var chips = [["지금 위치", "pin"], ["근무지", "house"], ["직접 입력", "search"]].map(function (t, i) { return '<button type="button" class="vx-chip" data-vx="dep" data-v="' + VD.KINDS[i] + '" aria-pressed="' + (d.kind === VD.KINDS[i]) + '">' + ii(t[1]) + t[0] + "</button>"; }).join("");
    return '<section class="vx-dep blk" data-fix72="ddate" aria-label="' + D4.n + '일차 출발">' +
      '<div class="vx-row"><b class="vx-k">날짜</b><button type="button" class="ky vx-ar" data-vx="dOff" data-v="-1" aria-label="앞 근무일"' + dis(cp) + ">" + ii("chevL", 20) + '</button><b class="num vx-dt">' + esc(VD.dateLabel(D4.date)) + '</b><button type="button" class="ky vx-ar" data-vx="dOff" data-v="1" aria-label="다음 근무일"' + dis(cn) + ">" + ii("chevR", 20) + "</button>" +
      '<label class="vx-chip vx-cal">' + ii("calendar") + '달력<input type="date" id="vxPick" value="' + esc(D4.date || "") + '" aria-label="방문 날짜 고르기"></label></div>' +
      '<b class="vx-k2">출발</b><div class="vx-deps">' + chips + "</div>" +
      (d.kind === "text" ? '<input class="vx-inp" data-vx="depTxt" placeholder="주소나 장소 이름(예: 집, 마을 경로당)" value="' + esc(d.text) + '" aria-label="출발 장소 직접 입력" maxlength="40">' + (d.text && pl.note ? '<div class="vx-note">' + esc(pl.note) + "</div>" : "")
        : '<div class="vx-note">' + esc(pl.note) + "</div>") +
      '<div class="vx-row vx-tm"><b class="vx-k">시각</b>' + VD.TIMES.map(function (t) { return '<button type="button" class="vx-chip num" data-vx="depT" data-v="' + t + '" aria-pressed="' + (d.time === t) + '">' + t + "</button>"; }).join("") + '<span class="vx-note r">바꾸면 도착 시각을 다시 셈</span></div></section>';
  }
  /** 위치 — 허용(granted)일 때만 지켜보고, «지금 위치»를 고를 때만 묻는다. 좌표는 이 기기 안에서만 */
  function llToKm(lat, lng) { var o = RP.ORIGIN, kl = 111.32 * Math.cos(o.lat * Math.PI / 180); return { x: +((lng - o.lng) * kl).toFixed(3), y: +((lat - o.lat) * 111.0).toFixed(3) }; }
  function geoTake(pos) { HERE = llToKm(pos.coords.latitude, pos.coords.longitude); HERE.at = new Date().toISOString(); meDraw(); }
  function geoWatch() {
    if (geoW != null || !navigator.geolocation || !navigator.permissions || !navigator.permissions.query) return;
    navigator.permissions.query({ name: "geolocation" }).then(function (st) { if (st.state === "granted" && geoW == null) geoW = navigator.geolocation.watchPosition(geoTake, function () { /* 못 받음 — 점 없음 */ }, { maximumAge: 30000, timeout: 15000 }); }, function () { /* 권한 조회 못 함 */ });
  }
  function geoAsk(done) {
    if (!navigator.geolocation) { done(false); return; }
    navigator.geolocation.getCurrentPosition(function (p) { geoTake(p); done(true); geoWatch(); }, function () { done(false); }, { maximumAge: 60000, timeout: 12000 });
  }
  var meMk = null;
  /** VISIT-A4 내 위치 점 — 그림 지도(SVG)는 다시 그릴 때(mapSvg o.me), 네이버 지도는 표지 하나를 옮김 */
  function meDraw() {
    var c = document.querySelector("#rtmap .vx-mes");
    if (c && HERE) { c.removeAttribute("hidden"); }
    var RM = window.DaeumRouteMap, box = document.querySelector("#rtmap .rt-nbox");
    if (!HERE || !RM || !RM.state || !RM.state.map || !box || !window.naver || !naver.maps) return;
    var ll = RP.toLatLng(HERE), pos = new naver.maps.LatLng(ll.lat, ll.lng);
    if (meMk && meMk.getMap() === RM.state.map) { meMk.setPosition(pos); return; }
    meMk = new naver.maps.Marker({ position: pos, map: RM.state.map, zIndex: 300, title: "내 위치", icon: { content: '<span class="vx-me" aria-label="내 위치"><i></i></span>', anchor: new naver.maps.Point(11, 11) } });
  }
  /** VISIT-I6(B8 주): 이 일차 실제 기록 시각 기준 남은 집 도착·복귀 */
  function reschedOf(d) {
    var act = {}, dt = d.date || ymd(new Date());
    d.ids.forEach(function (id) { var L = lastLog(id); if (L && L.at && ymd(L.at) === dt && statusOf(id) !== "planned") act[id] = hm(L.at); });
    return VD ? VD.resched(d.s, act) : { rows: [], show: false };
  }
  function againMap() { var m = lsGet(LS_AGAIN, {}) || {}, t = ymd(new Date()), o = {}; Object.keys(m).forEach(function (k) { if (m[k] === t) o[k] = t; }); return o; }
  /** n 다음 일차(없고 확정 계획이면 다음 근무일로 새 일차) */
  function nextDayOf(n) {
    var ds = vdays(), nx = ds.filter(function (x) { return x.n === n + 1; })[0]; if (nx) return nx;
    var cur = ds.filter(function (x) { return x.n === n; })[0], base = cur && cur.date ? cur.date : ymd(new Date());
    return plan() ? { n: n + 1, date: VD.stepWorkday(base, 1, U && U.isOff), ids: [], out: [], rows: [], confirmed: true } : null;
  }
  /** VISIT-I3·A2(B1a): 가구 하나를 다음 일차(다음 근무일)로 — 확정 계획이면 같은 계정 폰에도 */
  function toNextDay(id, n, quiet) {
    var D = nextDayOf(n); if (!D) { if (!quiet) toast("다음 일차가 없습니다 · 하루 방문 가구 수를 줄이면 일차가 늘어납니다"); return false; }
    var t0 = toast; toast = function () {}; try { moveIn(D, id); } finally { toast = t0; }
    var m = lsGet(LS_AGAIN, {}) || {}; if (m[id]) { delete m[id]; lsSet(LS_AGAIN, m); }
    if (!quiet) toast(id + " 을(를) " + D.n + "일차(" + VD.mdShort(D.date) + ")로 보냈습니다");
    return D;
  }
  /** TODAY-A2·FIELD-A5 «오늘 다시 들르기»: 오늘 남은 순서에 다시 끼움(추천 시간대가 오후면 맨 끝) — 상태는 기록대로 두고 «다시 들르기» 표시 */
  function visitAgain(hid) {
    var ds = vdays(), d = ds.filter(function (x) { return x.ids.indexOf(hid) >= 0; })[0]; if (!d || !VD) return false;
    var pf = F.visitTime ? F.visitTime.profile(attempts(), hid, { neighborLog: neighborLog() }) : null, rest = d.ids.filter(function (id) { return id !== hid; });
    var left = rest.filter(function (id) { return statusOf(id) === "planned"; }), done = rest.filter(function (id) { return statusOf(id) !== "planned"; }), k = VD.againSlot(left, pf && pf.best ? pf.best.k : "");
    var ids = done.concat(left.slice(0, k), [hid], left.slice(k)), row = sched(ids).rows.filter(function (x) { return x.id === hid; })[0];
    var m = lsGet(LS_AGAIN, {}) || {}; m[hid] = ymd(new Date()); lsSet(LS_AGAIN, m);
    reorder(d, ids);
    toast(hid + " 을(를) 오늘 " + (row ? row.arrive + "에 " : "") + "끼워 넣었습니다"); return true;
  }
  /** VISIT-A2(B1a 주): 지금 위치·시각에서 남은 집 다시 짜기 → 근무시간 안에 못 가는 집은 다음 근무일로 */
  function replanLeft(d) {
    var again = againMap(), left = d.ids.filter(function (id) { return statusOf(id) === "planned" || again[id]; }), done = d.ids.filter(function (id) { return left.indexOf(id) < 0; });
    if (!left.length) { toast("남은 집이 없습니다"); return; }
    var lastDone = done.slice().reverse()[0], from = HERE || (lastDone ? { x: BY[lastDone].x, y: BY[lastDone].y } : { x: OFFICE.x || 0, y: OFFICE.y || 0 });
    var n = new Date(), nowMin = Math.max(9 * 60, n.getHours() * 60 + n.getMinutes());
    var r = VD.replanRemaining(RP, from, left.map(function (id) { return { id: id, x: BY[id].x, y: BY[id].y }; }), { x: OFFICE.x || 0, y: OFFICE.y || 0 }, nowMin);
    reorder(d, done.concat(r.ids), d.out || []);
    var moved = r.later.filter(function (id) { return toNextDay(id, d.n, true); });
    toast((HERE ? "지금 위치" : lastDone ? lastDone + " 기준" : "근무지") + "·시각에서 남은 집 순서를 다시 짰습니다" + (moved.length ? " · " + moved.join(", ") + " 다음 근무일로" : ""));
  }
  // 날씨가 바뀌면(특보·예보 조각) 방문 계획의 일차 카드 배지를 다시 그림
  if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("daeum:wx", function () { if (AK.cur === "plan" && !(isTyping && isTyping())) render(true); });

  // ═════ 공통 지도(SVG) — 시청 (0,0) 기준 km 좌표, 북쪽이 위. 실제 도로가 아니라 순서·거리감을 보는 그림 ═════
  function mapSvg(o) {
    var W0 = 640, H0 = o.h || 400, pad = 44, pts = [{ x: 0, y: 0 }];
    o.days.forEach(function (d) { d.ids.forEach(function (id) { pts.push(BY[id]); }); });
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var k = Math.min((W0 - 2 * pad) / Math.max(1, x1 - x0), (H0 - 2 * pad - 20) / Math.max(1, y1 - y0)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    function X(p) { return (W0 / 2 + (p.x - cx) * k).toFixed(1); }
    function Y(p) { return (H0 / 2 - 8 - (p.y - cy) * k).toFixed(1); }
    var off = { x: 0, y: 0 }, done = o.done || [], g = "";
    function line(ids) { return [off].concat(ids.map(function (id) { return BY[id]; })).concat([off]).map(function (p) { return X(p) + "," + Y(p); }).join(" "); }
    o.days.filter(function (d) { return !d.focus; }).forEach(function (d) {
      g += '<polyline points="' + line(d.ids) + '" fill="none" stroke="#7B8BA3" stroke-width="2.5" stroke-dasharray="6 6" stroke-linejoin="round" opacity=".55"/>';
      d.ids.forEach(function (id) { g += '<circle cx="' + X(BY[id]) + '" cy="' + Y(BY[id]) + '" r="5" fill="#fff" stroke="#7B8BA3" stroke-width="2.5"/>'; });
    });
    o.days.filter(function (d) { return d.focus; }).forEach(function (d) {
      var pl = line(d.ids);
      g += '<polyline points="' + pl + '" fill="none" stroke="#fff" stroke-width="11" stroke-linejoin="round" stroke-linecap="round" filter="url(#' + o.id + 'sh)"/>' +
        '<polyline class="rt" pathLength="1" points="' + pl + '" fill="none" stroke="#2E8270" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>';
      d.ids.forEach(function (id, i) {
        var p = BY[id], dn = done.indexOf(id) >= 0, nx = id === o.next, r = nx ? 17 : 13;
        g += '<g filter="url(#' + o.id + 'sh)"><title>' + (i + 1) + "번째 " + id + " · " + esc(p.area) + "</title>" +
          '<circle cx="' + X(p) + '" cy="' + Y(p) + '" r="' + r + '" fill="' + (nx ? "#1F6676" : dn ? "#DDEDE8" : "#fff") + '" stroke="' + (nx ? "#174F5B" : dn ? "#2E8270" : "#1B2328") + '" stroke-width="3.5"/>' +
          '<text x="' + X(p) + '" y="' + (+Y(p) + (nx ? 6 : 4.5)).toFixed(1) + '" text-anchor="middle" font-size="' + (nx ? 16 : 13) + '" font-weight="900" fill="' + (nx ? "#fff" : dn ? "#1B4D42" : "#11181C") + '">' + (dn ? "" : i + 1) + "</text>" + (dn ? ckPath(X(p), Y(p), nx, nx ? "#fff" : "#1B4D42") : "") + "</g>";
        if (nx || o.labels) g += '<text x="' + X(p) + '" y="' + (+Y(p) - r - 6).toFixed(1) + '" text-anchor="middle" font-size="11.5" font-weight="800" fill="#11181C" paint-order="stroke" stroke="#fff" stroke-width="4" font-family="IBM Plex Mono,monospace">' + id + "</text>";
      });
    });
    g += '<g filter="url(#' + o.id + 'sh)"><rect x="' + (+X(off) - 15) + '" y="' + (+Y(off) - 15) + '" width="30" height="30" rx="8" fill="#1B2328"/><text x="' + X(off) + '" y="' + (+Y(off) + 5) + '" text-anchor="middle" font-size="14" font-weight="900" fill="#fff">시</text></g>' +
      '<text x="' + X(off) + '" y="' + (+Y(off) + 30) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#47535B" paint-order="stroke" stroke="#fff" stroke-width="4">상주시청</text>';
    if (o.me) g += '<g class="vx-mes"><title>내 위치</title><circle cx="' + X(o.me) + '" cy="' + Y(o.me) + '" r="15" fill="#2F6FDB" opacity=".16"/><circle cx="' + X(o.me) + '" cy="' + Y(o.me) + '" r="7" fill="#2F6FDB" stroke="#fff" stroke-width="3"/></g>'; // 102회차 VISIT-A4: 위치 허용 때만
    var km = k >= 60 ? 1 : k >= 25 ? 2 : 5, bar = '<g transform="translate(' + 18 + "," + (H0 - 20) + ')"><rect width="' + (km * k).toFixed(1) + '" height="6" rx="3" fill="#1B2328"/><text y="-6" font-size="11" font-weight="800" fill="#47535B">' + km + "km</text></g>" +
      '<g transform="translate(' + (W0 - 30) + ',26)"><path d="M0 -14 L7 6 L0 2 L-7 6 Z" fill="#1B2328"/><text y="20" text-anchor="middle" font-size="10.5" font-weight="800" fill="#47535B">북</text></g>';
    return '<svg class="mp" viewBox="0 0 ' + W0 + " " + H0 + '" role="img" aria-label="' + esc(o.label || "방문 순서 지도") + '"><defs><radialGradient id="' + o.id + 'bg" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#F7F9FA"/><stop offset="1" stop-color="#DDE3E9"/></radialGradient>' +
      '<filter id="' + o.id + 'sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2.5" stdDeviation="2" flood-color="#11181C" flood-opacity=".3"/></filter></defs>' +
      '<rect width="' + W0 + '" height="' + H0 + '" rx="18" fill="url(#' + o.id + 'bg)"/>' + g + bar + "</svg>";
  }

  // ═════ P1 방문 계획(①) — 한국사회보장정보원 순위 + 동선으로 일차를 나누고 순서를 정해 확정 ═════
  var planDay = null;
  function at(date, hhmm) { var d = new Date((date || ymd(new Date())) + "T00:00:00"), m = /^(\d+):(\d+)$/.exec(hhmm || "09:30"); d.setHours(+m[1], +m[2], 0, 0); return d.toISOString(); }
  function stTag(st) { return st === "done" ? '<span class="stg ok">만남</span>' : st === "absent" ? '<span class="stg ab">부재</span>' : st === "refused" ? '<span class="stg rf">거절</span>' : ""; }
  function planView() {
    if (!VD) return top("plan", "<strong>방문 계획</strong>") + '<main class="wrap"><p class="demo">방문 계획을 불러오는 중…</p></main>';
    var ds = vdays(), dl = deadline(), p = plan();
    if (!ds.length) return top("plan", "<strong>방문 계획</strong>가상 데이터") + '<main class="wrap"><div class="emptyc blk"><b>명단이 아직 없습니다</b>한국사회보장정보원 발굴대상자 명단(행복이음 내려받기)을 불러오면 일차가 자동으로 나뉩니다.<br><br><a class="cta" href="#today" data-pick="1"><b>명단 불러오기</b><small>엑셀 파일</small></a></div></main>';
    if (!planDay || !ds.some(function (d) { return d.n === planDay; })) planDay = ds[0].n; // 72회차 ①: 방문 탭은 1일차부터(옛: 남은 집이 있는 첫 일차 → 2일차부터 보이던 것)
    var D4 = ds.filter(function (d) { return d.n === planDay; })[0], rb = rankBy(), mt = meta(), total = ds.reduce(function (a, d) { return a + d.ids.length; }, 0);
    var cards = ds.map(function (d) {
      var st = d.ids.map(statusOf), dn = st.filter(function (x) { return x !== "planned"; }).length;
      return '<button type="button" class="dcard' + (d.n === planDay ? " on" : "") + '" data-day="' + d.n + '"><span class="dn">' + d.n + '<small>일차</small></span><span class="dd">' + (d.date ? md(d.date) : "날짜 미정") + '</span><span class="dm"><b>' + d.ids.length + "</b>가구 · " + yak(d.s) + d.s.km + "km · " + d.s.end + ' 복귀</span>' + wxBadge(d) + '<span class="dp" aria-hidden="true">' + d.ids.map(function (id) { var s = statusOf(id); return '<i class="' + (s === "planned" ? "" : s === "done" ? "ok" : "ab") + '"></i>'; }).join("") + "</span>" + (dn ? '<span class="dk">' + dn + "/" + d.ids.length + " 끝</span>" : "") + "</button>";
    }).join("");
    var dep = depGet(), pl = placeNow(D4.ids), ow = RP.overWork(D4.s), lastP = D4.ids.filter(function (id) { return statusOf(id) === "planned"; }).slice(-1)[0],
      tl = '<li class="tp"><span class="t">' + dep.time + '</span><span class="ax"><b class="o">' + (pl.kind === "work" ? "시" : ii("pin")) + '</b></span><span class="c">' + esc(pl.name) + "에서 출발</span></li>";
    D4.ids.forEach(function (id, i) {
      var row = D4.s.rows[i], h = BY[id], r = rb[id], m = mt[id] || {}, st = statusOf(id), pr = p && p.rows.filter(function (x) { return x.household_no === id; })[0];
      var lr = pr && pr.list_rank != null ? pr.list_rank : r ? r.listRank : m.prio || "—";
      if (row.lunchBefore) tl += '<li class="lunch"><span></span><span class="ax"></span><span class="c">점심 12:00–13:00</span></li>';
      tl += '<li class="leg"><span></span><span class="ax"></span><span class="c">차로 ' + (row.approx ? "약 " : "") + row.travelMin + "분 · " + row.km + "km" + (row.approx ? "" : " · 도로") + "</span></li>" +
        '<li class="stop' + (st !== "planned" ? " dn" : "") + '" draggable="true" data-di="' + i + '"><span class="t">' + row.arrive + "<small>~" + row.leave + '</small></span><span class="ax"><b>' + (i + 1) + '</b></span><div class="c"><div class="nm"><span class="grip" aria-hidden="true" title="끌어서 순서 바꾸기">' + ii("grip") + "</span><b>" + id + "</b>" + esc(h.area + " · " + ageLine(h)) + stTag(st) + '</div><div class="why"><span class="rk">한국사회보장정보원 ' + esc(lr) + "순위</span>" + esc(clip(indText(h).join(" · "), 40)) + "</div>" + (st === "planned" ? absHint(id) : "") + "</div>" +
        '<div class="mv"><button type="button" data-mv="' + i + ':-1" aria-label="' + id + ' 앞으로"' + (i ? "" : " disabled") + '>' + ii("chevU", 20) + '</button><button type="button" data-mv="' + i + ':1" aria-label="' + id + ' 뒤로"' + (i < D4.ids.length - 1 ? "" : " disabled") + ">" + ii("chevD", 20) + "</button>" +
        '<button type="button" class="x" data-out="' + id + '" aria-label="' + id + ' 이 일차에서 빼기" title="이 일차에서 빼기"' + (st === "planned" && D4.ids.length > 1 ? "" : ' aria-disabled="true" data-why="' + (st !== "planned" ? "visited" : "last") + '"') + ">" + ii("x", 20) + "</button></div></li>"; // 77회차: disabled 면 눌러도 아무 반응이 없어 «먹통» → 흐리게 두고 누르면 이유를 알린다
    });
    var addable = ds.filter(function (d) { return d.n !== D4.n && d.ids.length > 1; }).reduce(function (a, d) { return a.concat(d.ids.filter(function (id) { return statusOf(id) === "planned"; }).map(function (id) { return { id: id, n: d.n }; })); }, []);
    // 102회차 VISIT-I4: 옛 드롭다운(다른 일차 가구 전부) → «가구 넣기» 단추 → 시트에 이 일차 동선에서 가까운 5가구 먼저
    var addSel = addable.length && D4.ids.length < RP.MAX_ROAD_STOPS ? '<button type="button" class="sbtn" data-vx="add" data-act="addin">' + ii("plus") + "가구 넣기</button>" : "";
    var outL = '<li class="outs"><div class="otools">' + addSel + '<button type="button" class="sbtn go" data-act="opt">' + ii("route") + "빠른 순서로 다시 짜기<small> 도로 기준</small></button>" +
      '<button type="button" class="sbtn" data-act="share" data-sday="' + D4.n + '">일정 공유</button>' +
      '<span>위·아래 단추나 끌어서 순서 · 빼기 단추로 빼기 · 공유에는 가구번호·읍면·시각만</span></div>' +
      (D4.out && D4.out.length ? '<div class="oh">뺀 가구 <b>' + D4.out.length + "</b></div><ul>" + D4.out.map(function (id) { var h = BY[id]; return '<li><b>' + id + "</b><span>" + esc(h.area + " · " + ageLine(h)) + '</span><button type="button" class="sbtn" data-back="' + id + '">' + ii("replay") + '되살리기</button><button type="button" class="sbtn go" data-vx="nextday" data-v="' + id + '">다음 일차로 보내기</button></li>'; }).join("") + "</ul>" : "") + "</li>"; // 102회차 VISIT-I3
    tl += '<li class="tp"><span class="t">' + (D4.s.back ? D4.s.back.arrive : D4.s.end) + '</span><span class="ax"><b class="o">' + (pl.kind === "work" ? "시" : ii("house")) + '</b></span><span class="c">근무지 복귀 · 이동 ' + D4.s.travelMin + "분 · 상담 " + D4.s.consultMin + "분</span></li>" + outL;
    var dp = dl.until ? F.deadline.plan(listIds().filter(function (id) { var s = statusOf(id); return s !== "done" && s !== "refused"; }).length, dl.until, dl.perDay || 5) : null;
    var per = [3, 4, 5, 6, 7, 8].map(function (n) { return '<option value="' + n + '"' + (n === (dl.perDay || 5) ? " selected" : "") + ">하루 " + n + "가구</option>"; }).join("");
    var sync = SY.state();
    var conf = p ? '<div class="conf ok"><b>확정됨</b><span>' + (sync.mode === "live" ? "같은 계정 폰에 나타나 있습니다" : "로그인하면 같은 계정 폰에도 나타납니다") + '</span><a class="sbtn" data-dock="1" data-dock-lbl="동선·길안내 열기" data-dock-sub="확정됨 · 네이버 지도로 길안내" href="#route' + (D4.ids[0] ? ":" + (D4.ids.filter(function (id) { return statusOf(id) === "planned"; })[0] || D4.ids[0]) : "") + '">폰 동선 화면 보기</a></div>'
      : '<button type="button" class="btn pri" data-act="confirm" data-dock="1" data-dock-sub="' + ds.length + "일차 " + total + '가구 · 폰에 바로">' + (I.check || "") + '방문 계획 확정 <small>' + ds.length + "일차 " + total + "가구 · 확정하면 같은 계정 폰에 바로</small></button>";
    // 103회차 V4-4(시안 v4 Version 15): 조각을 만들어 폭에 따라 배열만 바꾼다 — 폰은 옛 순서 그대로.
    var vm = vxMode(), wide = vm !== "phone", m3 = vxM3(vm);
    var H = '<div class="dhead"><h1><span>' + ds.length + "일</span>이면 명단을 다 봅니다</h1><p>발굴 순위를 따르되 같은 날 집은 가까운 순서로 이었습니다.</p></div>"; // 102회차 VISIT-I1: 제목 + 한 줄
    var DC = '<div class="dcards" role="group" aria-label="일차">' + cards + "</div>", DEP = depCard(D4, ds);
    var SECT = '<div class="vx-sect' + (wide ? " in" : "") + '"><h2>' + D4.n + "일차 · " + esc(VD.dateLabel(D4.date)) + "</h2>" + (ds.length > 1 ? '<button type="button" class="vx-lk" data-vx="swap">' + vic("swap") + "다른 일차와 날짜 바꾸기</button>" : "") + "</div>";
    var WARN = ow.over ? '<p class="warnline">' + esc(ow.why.join(" · ")) + (lastP && D4.ids.length > 1 ? ' <button type="button" class="sbtn go" data-vx="nextday" data-v="' + lastP + '">' + lastP + " 다음 일차로 보내기</button>" : "") + "</p>" : "";
    var TL = wide ? '<section class="vx-tlc blk" aria-label="' + D4.n + '일차 일정">' + SECT + WARN + '<ol class="tline" aria-label="' + D4.n + '일차 순서">' + tl + "</ol></section>" // 큰 화면: «N일차 · 날짜» 소제목을 일정 카드 안 머리로(Version 15 #2)
      : SECT + WARN + '<ol class="tline blk" aria-label="' + D4.n + '일차 순서">' + tl + "</ol>";
    var MAP = '<div class="mapw blk"><div class="rt-map rt-plan" id="pmmap"><div class="rt-svg">' + mapSvg({ id: "pm", days: ds.map(function (d) { return { ids: d.ids, focus: d.n === planDay }; }), done: listIds().filter(function (id) { return statusOf(id) !== "planned"; }), labels: true, h: 380, label: D4.n + "일차 방문 순서 지도" }) + '</div><div class="rt-nmap" role="region" aria-label="네이버 지도 — ' + D4.n + '일차 방문 순서"><div class="rt-nbox"></div></div></div>' +
      '<div class="mlg"><span><i class="a"></i>' + D4.n + '일차</span><span class="rt-lg-b"><i class="b"></i>다른 일차</span><span class="rt-lg-t">직선 거리 근사 · 네이버 지도를 불러오는 중</span></div></div>';
    var OPT = '<div id="pmopt">' + rtOptHtml(rtCmp(rtListOrder(D4.ids), D4.ids)) + "</div>";
    var QC = qcards("이 탭의 다른 기능", [
        ["sync", "빠른 순서로 다시 짜기", "도로 기준 가장 빠른 순서", 'data-qto="[data-act=opt]"'],
        ["home2", "가구 넣기", "가까운 집부터 5가구", 'data-qto="[data-act=addin]"'],
        ["clock", D4.n + "일차 날짜·출발", "근무일 앞뒤 · 달력 · 출발지·시각", 'data-qto=".vx-dep"'],
        ["send", "일정 공유", "가구번호·읍면·시각만", 'data-qto="[data-act=share]"'],
        ["today", "하루 " + qv(dl.perDay || 5) + "가구", "기한 안에 다 보는 계획", 'data-qto=".dlset"'],
        D4.out && D4.out.length ? ["x", "뺀 가구 " + qv(D4.out.length), "되살리기 · 다음 일차로", 'data-qto="[data-back]"'] : null,
        ["route", "동선·길안내", "네이버 지도 · 폰 화면", 'data-go="#route"']
      ]);
    var DL = '<div class="dlset blk"><div class="k">기한 점검</div><div class="dlrow"><label>명단 기한<input type="date" id="dlUntil" value="' + esc(dl.until || "") + '"></label><label>하루 방문<select id="dlPer">' + per + "</select></label></div>" +
      (dp && dp.set ? '<div class="dln"><b>' + dp.left + "</b> 근무일 남음 · " + (dp.over ? '<em class="bad">이대로면 넘김</em>' : '<em class="ok">여유 ' + dp.spare + "일</em>") + "</div><p>" + esc(dp.line) + "</p>" : "<p>기한을 넣으면 하루 몇 가구씩 봐야 하는지 계산합니다.</p>") + "</div>";
    var DEMO = '<p class="demo"><span class="samp">가상 데이터</span><span>가구 번호·읍면만 표시 · 이동 시간은 직선 거리 근사(«약») · 순서 근거 = 한국사회보장정보원 발굴 순위 + 거리</span><a href="#today" data-pick="1">명단 불러오기(엑셀)</a></p>';
    var body;
    if (!wide) body = H + DC + DEP + TL + C2 + MAP + OPT + conf + QC + DL + DEMO; // 폰: 옛 순서 그대로(S12-x 66회차)
    else if (!m3) body = H + DC + DEP + MAP + OPT + conf + C2 + TL + QC + DL + DEMO; // 폴드·태블릿 세로 2단: 일차·출발·지도 | 일정(Version 15 wd)
    else body = H + DC + DEP + nearCard(D4, ds) + QC + DL + C2 + TL + vx3(vm) + MAP + OPT + daySum(D4, ow) + conf + DEMO; // 태블릿 가로·PC 3단 4·4·4: 일차·출발·넣을 만한 가구 | 일정 | 지도·요약(Version 15 pc)
    return top("plan", "<strong>" + esc(roundYm()) + " 명단</strong>" + total + "가구 · 가상") + '<main class="wrap' + (wide ? " vx-main vx-plan" : "") + '">' + body + "</main>";
  }
  // ── 103회차 V4-4 큰 화면 도우미(시안 v4 Version 15) ──
  var C3 = "<!--c3-->"; // 셋째 칸 표지(app.js 와 같은 글자)
  function vx3(m) { return m === "pc" ? C3 : "<!--vx3-->"; } // PC = app.js colsOf 가 셋째 칸으로 · 태블릿 가로 = colsOf 가 2단으로 합치므로 vxLayout 이 이 표지에서 뗀다(현장 진도 칸 desk 의 c3 와 섞이지 않게 다른 글자)
  function vxMode() { return document.documentElement.getAttribute("data-mode") || "phone"; }
  function vxM3(m) { return m === "pc" || (m === "tab" && window.innerWidth >= 1100); } // app.js colsOf 의 3단 문턱과 같게(main 에 m3)
  /** 큰 화면 칸 정리(그린 직후, 폰 제외). 104회차: app.js colsOf 정규식을 고쳐 안쪽 <main> 은 colsOf 가 벗기고 vx-main·vx-plan/route/field 도 바깥 .main 에 붙는다
   *  (옛 우회 «안쪽 main 벗기기·클래스 옮기기»는 걷어 냄). 여기서는 ① 태블릿 가로(1100↑) 2단이면 «vx3» 표지에서 셋째 칸을 떼어 3단
   *  ② 동선 3단 현장 진도판 자리 ③ 태블릿·PC는 제목(.dhead)을 칸 위 한 줄(.hdrow)로. 모두 이 화면 DOM 안에서만 — 다른 탭은 건드리지 않는다. 두 번 불러도 같다. */
  function vxLayout() {
    var M = app.querySelector(".main.vx-main"); if (!M) return;
    var vm = vxMode(), cols = Array.prototype.slice.call(M.querySelectorAll(":scope > .col")), col0 = cols[0], inner = M; if (!col0) return;
    if (vxM3(vm) && cols.length === 2) {
      var c3 = Array.prototype.filter.call(cols[1].childNodes, function (n) { return n.nodeType === 8 && n.nodeValue === "vx3"; })[0];
      if (c3) { var nc = document.createElement("div"); nc.className = "col"; while (c3.nextSibling) nc.appendChild(c3.nextSibling); cols[1].removeChild(c3); if (nc.childNodes.length) { M.appendChild(nc); M.setAttribute("data-cols", "3"); } }
    }
    var dh = col0.querySelector(":scope > .dhead"); if (dh) vxHr(M).appendChild(dh);
    // 104회차 현장(집 앞·확인·상담) 태블릿·PC: 맨 앞 단계 줄 + 가구 카드(시안 fieldTop)는 격자 위 한 줄로, 폭은 첫 단(태블릿)·760 이하(PC) — 폴드는 시안처럼 첫 단 맨 위 그대로
    if (M.classList.contains("vx-field") && /^(tab|pc)$/.test(vm) && !M.querySelector(":scope > .hdrow > .fx-top")) {
      var tops = [];
      for (var x = col0.firstElementChild; x; x = x.nextElementSibling) { if (/(^|\s)(steps|idc)(\s|$)/.test(x.className || "")) tops.push(x); else break; }
      if (tops.length) { var tw = document.createElement("div"); tw.className = "fx-top"; tops.forEach(function (t) { tw.appendChild(t); }); vxHr(M).appendChild(tw); }
    }
  }
  function vxHr(M) { var hr = M.querySelector(":scope > .hdrow"); if (!hr) { hr = document.createElement("div"); hr.className = "hdrow" + (vxMode() === "fold" ? " fh2" : ""); M.insertBefore(hr, M.querySelector(":scope > .col")); } return hr; } // 머리 줄은 넣을 것이 있을 때만 만든다(빈 줄이 격자 칸을 차지하지 않게)
  /** 머리 줄(.hdrow) = 제목 + 작은 칸 전환(시안 topW·폴드 fhr) — 작은 칸은 shell.js after() 가 그린 뒤 첫 칸 맨 위에 넣으므로 그 뒤에 옮긴다. 태블릿·PC 전환 폭 = 첫 칸 폭 */
  function vxHead(M, cols) {
    var sg = cols[0] && cols[0].querySelector(":scope > .subseg.subtabs"); if (sg) vxHr(M).appendChild(sg); // 104회차: 셸 작은 칸(nav.subseg.subtabs)만 — 현장 확인 «집 안/문 앞»(div.subseg)은 시안처럼 첫 단에
    var ft = M.querySelector(":scope > .hdrow > .fx-top"); if (ft) ft.style.width = vxMode() === "tab" && cols[0] ? Math.max(280, cols[0].clientWidth - 20) + "px" : "";
    var hr = M.querySelector(":scope > .hdrow"); if (!hr) return;
    var s2 = hr.querySelector(".subseg"); if (s2) s2.style.width = /^(tab|pc)$/.test(vxMode()) && cols[0] ? Math.max(280, cols[0].clientWidth - 20) + "px" : "";
  }
  /** PC 3단 첫 칸 «넣을 만한 가구»(시안 near) — 가구 넣기 시트와 같은 계산(VD.nearestTo)·같은 동작(data-vxadd), 가까운 3가구 */
  function nearCard(D4, ds) {
    if (D4.ids.length >= RP.MAX_ROAD_STOPS) return "";
    var pool = ds.filter(function (d) { return d.n !== D4.n && d.ids.length > 1; }).reduce(function (a, d) { return a.concat(d.ids.filter(function (id) { return statusOf(id) === "planned"; }).map(function (id) { return { id: id, n: d.n, x: BY[id].x, y: BY[id].y, area: BY[id].area }; })); }, []);
    if (!pool.length) return "";
    var pl = placeNow(D4.ids), L = VD.nearestTo([{ x: pl.x, y: pl.y }].concat(D4.ids.map(function (id) { return BY[id]; })), pool, 3);
    return '<section class="vx-near blk" aria-label="넣을 만한 가구"><div class="vx-sect in"><h2>넣을 만한 가구</h2><span class="vx-mt">동선에서 가까운 순</span></div><div class="list vx-lst">' +
      L.map(function (r) { return '<button type="button" class="li" data-vxadd="' + esc(r.id) + '"><span class="ico">' + ii("plus", 20) + '</span><span class="lc"><b>' + esc(r.id) + " · " + esc(r.area) + '</b><small>동선에서 <span class="vx-km">약 <span class="num">' + r.km.toFixed(1) + "</span>km</span> · " + r.n + "일차에서</small></span>" + ii("chevR", 20) + "</button>"; }).join("") + "</div></section>";
  }
  /** PC 3단 셋째 칸 «N일차 요약»(시안 sumB) — 이동·상담·복귀·날씨, 값은 이 일차 시각표에서 */
  function daySum(D4, ow) {
    var s = D4.s, back = s.back ? s.back.arrive : s.end, wx = wxBadge(D4), y = yak(s);
    var rows = [["route", "이동 " + y + s.km + "km · " + s.travelMin + "분", "출발지에서 복귀까지"], ["talk", "상담 " + s.consultMin + "분 · " + D4.ids.length + "가구", "가구별 예상 시간 합"], ["clock", "복귀 " + back + (ow.over ? " · 근무시간 넘김" : " · 근무시간 안"), "점심 12:00–13:00 포함"]];
    return '<section class="vx-sum blk" aria-label="' + D4.n + '일차 요약"><div class="vx-sect in"><h2>' + D4.n + '일차 요약</h2></div><div class="list vx-lst">' +
      rows.map(function (r) { return '<div class="li" style="cursor:default"><span class="ico">' + ii(r[0], 20) + '</span><span class="lc"><b>' + esc(r[1]) + "</b><small>" + esc(r[2]) + "</small></span></div>"; }).join("") + (wx ? '<div class="vx-wxr">' + wx + "</div>" : "") + "</div></section>";
  }
  /** V4-4: 단 첫 카드 윗선 맞춤(시안 polish — 방문 탭은 지도·일차 카드도 «첫 카드», Version 15 #1). 머리(.dhead·.hdrow)는 카드가 아니다 */
  function vxAlign() {
    var M = document.querySelector(".app .main.vx-main"); if (!M) return;
    var cols = Array.prototype.slice.call(M.querySelectorAll(":scope > .col"));
    cols.forEach(function (c) { c.style.paddingTop = ""; });
    if (cols.length < 2 || vxMode() === "phone") return;
    vxHead(M, cols);
    if (M.classList.contains("vx-field") && vxMode() === "fold" && cols[0].querySelector(":scope > .steps")) return; // 104회차: 폴드 현장은 시안처럼 단계 줄·가구 카드가 첫 단 맨 위(시안 .tw 단은 맞춤 제외) — 둘째 단은 위에서 바로
    var first = function (c) { return Array.prototype.filter.call(c.children, function (x) { return x.offsetHeight > 0 && !(M.classList.contains("vx-field") ? /(^|\s)(dhead|demo|subseg|subtabs|hdrow|steps|idc|fx-info|fx-top)(\s|$)/ : /(^|\s)(dhead|demo|subseg|subtabs|hdrow)(\s|$)/).test(x.className || "") && x.nodeName !== "SCRIPT"; })[0]; };
    var tops = cols.map(function (c) { var f = first(c); return f ? f.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop : null; });
    var v = tops.filter(function (x) { return x != null; }); if (v.length < 2) return;
    var mx = Math.max.apply(null, v);
    cols.forEach(function (c, i) { if (tops[i] != null && mx - tops[i] > .5) c.style.paddingTop = (parseFloat(getComputedStyle(c).paddingTop) + mx - tops[i]).toFixed(1) + "px"; });
  }
  if (typeof window !== "undefined") window.DaeumVxWide = { layout: vxLayout, align: vxAlign, mode: vxMode }; // 현장 탭(tab_field.js)도 같은 칸 정리·윗선 맞춤 — 현장은 단계 띠·가구 카드 아래 첫 카드를 맞춘다(시안 fieldTop)
  var vxAT = 0; if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("resize", function () { clearTimeout(vxAT); vxAT = setTimeout(vxAlign, 140); }, { passive: true });
  /** 일차 하나의 방문 날짜를 바꾼다 — 확정 계획이면 그 일차 visit_plan 행의 planned_at(시각은 그대로)을 바꿔 같은 계정 폰에 실시간, 확정 전이면 이 기기에 */
  function setDayDate(D4, date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || date === D4.date) return false;
    var same = days().filter(function (d) { return d.n !== D4.n && d.date === date; })[0];
    if (same) { toast(same.n + "일차와 같은 날입니다 · «다른 일차와 날짜 바꾸기»로 맞바꿉니다"); return false; } // 102회차 VISIT-I5
    // 73회차 🐞(c): 일차 순서 검사 — 앞 일차보다 늦고 다음 일차보다 이른 날만
    var ds0 = days(), pv = ds0.filter(function (d) { return d.n === D4.n - 1; })[0], nx = ds0.filter(function (d) { return d.n === D4.n + 1; })[0];
    if (pv && pv.date && date <= pv.date) { toast(D4.n + "일차는 " + pv.n + "일차(" + md(pv.date) + ")보다 뒤 날짜로 골라 주세요"); return false; }
    if (nx && nx.date && date >= nx.date) { toast(D4.n + "일차는 " + nx.n + "일차(" + md(nx.date) + ")보다 앞 날짜로 골라 주세요"); return false; }
    var p = plan();
    if (p) {
      p.rows = p.rows.map(function (r) {
        if (r.day !== D4.n) return r;
        var t = r.planned_at ? hm(r.planned_at) : null; // 뺀 가구(planned_at 없음)는 그대로 둔다
        return t ? Object.assign({}, r, { planned_at: at(date, t) }) : r;
      });
      if (p.seed || p.from_seed) p.from_seed = "S9j";
      SY.savePlan(p);
    } else {
      var m = lsGet(LS_DDATE, {}) || {}; m[D4.n] = date; lsSet(LS_DDATE, m);
    }
    toast((VD ? VD.dateLabel(date) : md(date)) + "로 옮겼습니다 · 도착 시각·날씨를 다시 셈" + (p ? (SY.state().mode === "live" ? " · 같은 계정 폰에도 반영" : " · 로그인하면 폰과 연동") : ""));
    render(); return true;
  }
  function bindPlan() {
    vxLayout(); // 103회차 V4-4 큰 화면 칸 정리(폰은 그대로)
    if (!VD) return;
    var ds = vdays(); if (!ds.length) return;
    var D4 = ds.filter(function (d) { return d.n === planDay; })[0];
    if (D4) bindVx(D4, ds);
    app.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", function () { planDay = +b.dataset.day; render(); }); });
    app.querySelectorAll("[data-mv]").forEach(function (b) { b.addEventListener("click", function () { var a = b.dataset.mv.split(":"), i = +a[0]; vib(); reorder(D4, RP.move(D4.ids, i, i + +a[1])); }); });
    // 42 편집 — 빼기·되살리기·최적 순서·끌어서 순서(PC). 바꿀 때마다 reorder → 저장(확정 계획이면 실시간) → 다시 그림(지도·비교 카드 재계산)
    app.querySelectorAll(".tline [data-out]").forEach(function (b) { b.addEventListener("click", function () { var id = b.dataset.out;
      if (b.getAttribute("aria-disabled") === "true" || D4.ids.length < 2) { toast(b.dataset.why === "visited" ? id + " 은(는) 이미 방문 기록이 있어 일정에서 뺄 수 없습니다" : "마지막 한 가구는 뺄 수 없습니다 · 다른 일차로 옮기려면 그 일차의 «가구 넣기»"); return; }
      vib(); reorder(D4, planDrop(D4.ids, id), (D4.out || []).concat([id])); toast(id + " 을(를) 이 일차에서 뺐습니다 · 아래 «되살리기»로 되돌립니다"); }); }); // 77회차: 최적 순서였으면 남은 가구로 다시 최적화, 직접 바꾼 순서면 그 순서 유지
    app.querySelectorAll("[data-back]").forEach(function (b) { b.addEventListener("click", function () { var id = b.dataset.back; vib(); var wasOpt = D4.ids.join() === routeOrder(D4.ids).join(); // 최적 순서였으면 되살린 집까지 넣어 다시 잇고, 직접 바꾼 순서면 끝에 붙인다
      reorder(D4, wasOpt ? routeOrder(D4.ids.concat([id])) : D4.ids.concat([id]),(D4.out || []).filter(function (x) { return x !== id; })); toast(id + " 을(를) 되살렸습니다"); }); });
    var ob = app.querySelector('[data-act="opt"]'); if (ob) ob.addEventListener("click", function () { vib(); replan(D4, ob); });
    var po = document.getElementById("pmopt"); if (po) po.addEventListener("click", function (e) { if (e.target.closest('[data-act="reopt"]')) { vib(); reorder(D4, routeOrder(D4.ids)); toast("빠른 순서로 다시 짰습니다"); } }); // 77회차
    bindShare(ds);
    var drag = null;
    app.querySelectorAll(".tline .stop[data-di]").forEach(function (li) {
      li.addEventListener("dragstart", function (e) { drag = +li.dataset.di; li.classList.add("drag"); try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(drag)); } catch (x) { /* 무시 */ } });
      li.addEventListener("dragend", function () { li.classList.remove("drag"); app.querySelectorAll(".tline .over").forEach(function (o) { o.classList.remove("over"); }); });
      li.addEventListener("dragover", function (e) { if (drag === null) return; e.preventDefault(); li.classList.add("over"); });
      li.addEventListener("dragleave", function () { li.classList.remove("over"); });
      li.addEventListener("drop", function (e) { e.preventDefault(); var to = +li.dataset.di, fr = drag; drag = null; if (fr === null || fr === to) return; reorder(D4, RP.move(D4.ids, fr, to)); });
    });
    var cf = app.querySelector('[data-act="confirm"]'); if (cf) cf.addEventListener("click", function () { vib(); confirmPlan(ds); });
    var u = document.getElementById("dlUntil"), pd = document.getElementById("dlPer");
    function setDl() { lsSet(LS_DL, { until: u.value || null, perDay: +pd.value || 5 }); render(); }
    if (u) u.addEventListener("change", setDl); if (pd) pd.addEventListener("change", setDl);
    if (D4) rtMapBind("pmmap", "pmopt", D4.ids, null, "#0B6178", ds.filter(function (d) { return d.n !== planDay; }).map(function (d) { return d.ids; }));
    if (D4) app.querySelectorAll(".vx-near [data-vxadd]").forEach(function (b) { b.addEventListener("click", function () { var id = b.dataset.vxadd; vib(); moveIn(D4, id); toast(id + " 을(를) " + D4.n + "일차에 넣었습니다 · 도착 시각 다시 셈"); }); }); // 103회차 PC «넣을 만한 가구» = 가구 넣기 시트와 같은 동작
    Promise.resolve().then(vxAlign); setTimeout(vxAlign, 400); // 103회차 V4-4 단 첫 카드 윗선(작은 칸 전환이 붙은 뒤·지도 판이 자리 잡은 뒤)
  }
  // ── 102회차 방문 계획 조작 — 출발 카드·다음 일차로·날짜 바꾸기·가구 넣기 시트 ──
  function bindVx(D4, ds) {
    depAutoGeo(); // 105회차: 출발 기본 «지금 위치» — 한 번 위치 받기(거부·실패면 근무지로 조용히)
    var dOff = function (dir) {
      var t = VD.stepWorkday(D4.date || ymd(new Date()), dir, U && U.isOff), c = VD.dateCheck(ds, D4.n, t);
      if (!c.ok) { toast(c.why === "same" ? c.other + "일차와 같은 날입니다 · «다른 일차와 날짜 바꾸기»로 맞바꿉니다" : D4.n + "일차는 " + c.other + "일차보다 " + (c.why === "before" ? "뒤" : "앞") + " 날짜로 골라 주세요"); return; }
      setDayDate(D4, t);
    };
    app.querySelectorAll('[data-vx="dOff"]').forEach(function (b) { b.addEventListener("click", function () { vib(); dOff(+b.dataset.v); }); });
    var pk = document.getElementById("vxPick");
    if (pk) pk.addEventListener("change", function () { var v = VD.snapWorkday(pk.value, U && U.isOff); if (!v) return; vib(); if (!setDayDate(D4, v)) pk.value = D4.date || ""; else if (v !== pk.value) toast(VD.dateLabel(v) + "로 옮겼습니다 · 주말은 다음 근무일로"); });
    app.querySelectorAll('[data-vx="dep"]').forEach(function (b) { b.addEventListener("click", function () {
      var d = depGet(); d.kind = b.dataset.v; d.auto = false; vib(); depSet(d); // 105회차: 사람이 고르면 자동 해제
      if (d.kind === "here" && !HERE) geoAsk(function (ok) { if (ok) { var d2 = depGet(); d2.here = HERE; depSet(d2); } render(); }); // «지금 위치»를 고를 때만 위치를 묻는다(이 기기 안에서만)
      render();
      if (d.kind === "text") { var inp = app.querySelector('[data-vx="depTxt"]'); if (inp) try { inp.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }
    }); });
    app.querySelectorAll('[data-vx="depT"]').forEach(function (b) { b.addEventListener("click", function () { var d = depGet(); d.time = b.dataset.v; vib(); depSet(d); render(); toast("출발 " + d.time + " · 도착 시각을 다시 셌습니다"); }); });
    var dt = app.querySelector('[data-vx="depTxt"]');
    if (dt) dt.addEventListener("change", function () { var d = depGet(); d.text = dt.value; depSet(d); render(); });
    app.querySelectorAll('[data-vx="nextday"]').forEach(function (b) { b.addEventListener("click", function () { vib(); toNextDay(b.dataset.v, D4.n); }); });
    var sw = app.querySelector('[data-vx="swap"]'); if (sw) sw.addEventListener("click", function () { vib(); swapAsk(D4, ds); });
    var ad = app.querySelector('[data-vx="add"]'); if (ad) ad.addEventListener("click", function () { vib(); addSheet(D4, ds, false); });
  }
  /** 시안 sheet 모양(.ov > .scrim + .sheet) — 이 탭 전용(머리 «더 보기» 시트와 같은 겉모습, 클릭은 따로) */
  var VXO = null;
  function vxClose() { if (VXO) { VXO.classList.remove("on"); if (VXO.parentNode) VXO.parentNode.removeChild(VXO); VXO = null; } }
  function vxSheet(title, body, onBind) {
    vxClose();
    VXO = document.createElement("div"); VXO.className = "ov vx-ov on";
    VXO.innerHTML = '<div class="scrim" data-vxs="x"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="grab"></div><div class="ttl vx-shd"><h3>' + esc(title) + '</h3><button type="button" class="ky" data-vxs="x" aria-label="닫기">' + ii("x", 20) + "</button></div>" + body + "</div>";
    VXO.addEventListener("click", function (e) { if (e.target.closest && e.target.closest('[data-vxs="x"]')) vxClose(); });
    document.addEventListener("keydown", function esc0(e) { if (e.key === "Escape") { vxClose(); document.removeEventListener("keydown", esc0); } });
    app.appendChild(VXO); if (onBind) onBind(VXO);
    var f0 = VXO.querySelector(".li"); if (f0) try { f0.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
  }
  /** VISIT-I4: 가구 넣기 — 이 일차 동선(출발점 포함)에서 가까운 집부터 5가구, «다른 가구 모두 보기» */
  function addSheet(D4, ds, all) {
    var pool = ds.filter(function (d) { return d.n !== D4.n && d.ids.length > 1; }).reduce(function (a, d) { return a.concat(d.ids.filter(function (id) { return statusOf(id) === "planned"; }).map(function (id) { return { id: id, n: d.n, x: BY[id].x, y: BY[id].y, area: BY[id].area }; })); }, []);
    var pl = placeNow(D4.ids), pts = [{ x: pl.x, y: pl.y }].concat(D4.ids.map(function (id) { return BY[id]; })), L = VD.nearestTo(pts, pool, all ? 0 : 5);
    var li = L.map(function (r) { return '<button type="button" class="li" data-vxadd="' + esc(r.id) + '"><span class="ico">' + ii("plus", 20) + '</span><span class="lc"><b>' + esc(r.id) + " · " + esc(r.area) + '</b><small>동선에서 <span class="vx-km">약 <span class="num">' + r.km.toFixed(1) + "</span>km</span> · " + r.n + "일차에서</small></span>" + ii("chevR", 20) + "</button>"; }).join("");
    vxSheet("가구 넣기 · 가까운 순", '<p class="vx-note">' + ii("route") + "<span>" + (all ? "다른 일차의 남은 가구를 가까운 순으로 모두 보여 줍니다" : "이 일차 동선에서 가까운 집부터 다섯 가구만 먼저 보입니다") + '</span></p><div class="list vx-lst">' + (li || '<p class="vx-note">옮겨 올 가구가 없습니다</p>') + "</div>" +
      (!all && pool.length > L.length ? '<button type="button" class="sbtn vx-all" data-vxall="1">다른 가구 모두 보기 <small>' + pool.length + "가구</small></button>" : ""), function (o) {
      o.querySelectorAll("[data-vxadd]").forEach(function (b) { b.addEventListener("click", function () { var id = b.dataset.vxadd; vib(); vxClose(); moveIn(D4, id); toast(id + " 을(를) " + D4.n + "일차에 넣었습니다 · 도착 시각 다시 셈"); }); });
      var a = o.querySelector("[data-vxall]"); if (a) a.addEventListener("click", function () { addSheet(D4, ds, true); });
    });
  }
  /** VISIT-I5: 다른 일차와 날짜 바꾸기 — 일차가 둘이면 바로, 셋 이상이면 고르는 시트 */
  function swapAsk(D4, ds) {
    var others = ds.filter(function (d) { return d.n !== D4.n && d.date; });
    if (!others.length) { toast("날짜를 바꿀 다른 일차가 없습니다"); return; }
    if (others.length === 1) { swapDates(D4, others[0]); return; }
    vxSheet(D4.n + "일차와 날짜 바꾸기", '<div class="list vx-lst">' + others.map(function (d) { return '<button type="button" class="li" data-vxsw="' + d.n + '"><span class="ico">' + vic("swap") + '</span><span class="lc"><b>' + d.n + "일차 · " + esc(VD.dateLabel(d.date)) + "</b><small>" + d.ids.length + "가구 · " + d.s.end + " 복귀</small></span>" + ii("chevR", 20) + "</button>"; }).join("") + "</div>", function (o) {
      o.querySelectorAll("[data-vxsw]").forEach(function (b) { b.addEventListener("click", function () { var t = others.filter(function (d) { return d.n === +b.dataset.vxsw; })[0]; vxClose(); if (t) swapDates(D4, t); }); });
    });
  }
  function swapDates(A, B) {
    var p = plan(), da = A.date, db = B.date; vib();
    if (p) {
      p.rows = p.rows.map(function (r) { var to = r.day === A.n ? db : r.day === B.n ? da : null; if (!to || !r.planned_at) return r; return Object.assign({}, r, { planned_at: at(to, hm(r.planned_at)) }); });
      if (p.seed || p.from_seed) p.from_seed = "S9j";
      SY.savePlan(p);
    } else { var m = lsGet(LS_DDATE, {}) || {}; m[A.n] = db; m[B.n] = da; lsSet(LS_DDATE, m); }
    toast(Math.min(A.n, B.n) + "일차와 " + Math.max(A.n, B.n) + "일차 날짜를 맞바꿨습니다" + (p && SY.state().mode === "live" ? " · 같은 계정 폰에도 반영" : ""));
    render();
  }
  /** 한 일차의 순서(ids)와 뺀 가구(outIds, 생략하면 그대로)를 저장. 확정 계획이면 visit_plan 행을 바꿔 끼워 같은 계정 폰에 실시간 반영 */
  function reorder(D4, ids, outIds) {
    var p = plan(), out = outIds || D4.out || [];
    // S12-v U1: 이 일차에 들어오는(또는 빠지는) 가구는 다른 일차 행에서도 뺀다 — moveIn 때 옛 일차 행이 남아 같은 가구가 두 일차에 겹치던 것
    var mine = {}; ids.concat(out).forEach(function (id) { mine[id] = 1; });
    if (p) { var others = p.rows.filter(function (r) { return r.day !== D4.n && !mine[r.household_no]; }), base = D4.rows, s = sched(ids);
      var row = function (id) { return base.filter(function (r) { return r.household_no === id; })[0]; };
      p.rows = others.concat(ids.map(function (id, i) { var o = row(id); return Object.assign({}, o, { seq: i + 1, planned_at: at(D4.date, s.rows[i].arrive), status: o.status === "later" ? "planned" : o.status }); }))
        .concat(out.map(function (id, j) { var o = row(id); return Object.assign({}, o, { seq: ids.length + j + 1, status: "later" }); }))
        .sort(function (a, b) { return a.day - b.day || a.seq - b.seq; });
      if (p.seed || p.from_seed) p.from_seed = "S9j"; // 시연 계획 편집분 — 다음 날 demo_seed 가 그날 기준으로 다시 깐다
      SY.savePlan(p);
    } else {
      var ord = lsGet("daeum.officer.dayOrder", {}) || {}, dout = lsGet(LS_DOUT, {}) || {};
      ord[D4.n] = ids; dout[D4.n] = out; lsSet("daeum.officer.dayOrder", ord); lsSet(LS_DOUT, dout);
    }
    render();
  }
  // ── S12-i4 다시 짜기: 순서 후보(최근접·명단 순서 2-opt와 그 반대, 최대 3개)를 도로로 재어 가장 빠른 것. 받지 못하면 직선 어림값끼리 비교 ──
  function replan(D4, btn) {
    if (D4.ids.length < 2) { toast("한 가구뿐이라 순서가 그대로입니다"); return; }
    var stops = rtStops(D4.ids), cands = RP.replanCandidates(stops, OFFICE, true, rtStops(rtListOrder(D4.ids)), 3);
    if (btn) { btn.disabled = true; btn.firstChild.textContent = "다시 짜는 중…"; }
    var tooMany = D4.ids.length > RP.MAX_ROAD_STOPS;
    rmLoad().then(function (RM) { return Promise.all(cands.map(function (o) {
      return tooMany ? RP.approxRoad(o, OFFICE, true) : RM.roadOrApprox(RP.cacheKey(o, true), rtPts(o.map(function (s) { return s.id; })), o, OFFICE, true); })); },
      function () { return cands.map(function (o) { return RP.approxRoad(o, OFFICE, true); }); })
      .then(function (rs) {
        var bi = RP.pickBest(rs), best = cands[bi < 0 ? 0 : bi], r = rs[bi < 0 ? 0 : bi];
        reorder(D4, best.map(function (s) { return s.id; }));
        toast("빠른 순서로 다시 짰습니다 · 이동 " + (r.approx ? "약 " : "") + (Math.round(r.m / 100) / 10).toFixed(1) + "km · " + (r.approx ? "약 " : "") + Math.round(r.s / 60) + "분" + (r.approx ? "(직선 거리 어림)" : "(도로)"));
      });
  }
  /** 다른 일차 가구를 이 일차로 옮긴다(확정 계획이면 visit_plan 행의 day 를 바꿔 같은 계정 폰에 실시간). 최적 순서였으면 넣은 뒤 다시 잇는다 */
  function moveIn(D4, id) {
    var p = plan(), wasOpt = D4.ids.join() === routeOrder(D4.ids).join(), ids = wasOpt ? routeOrder(D4.ids.concat([id])) : D4.ids.concat([id]);
    if (p) {
      var row = p.rows.filter(function (r) { return r.household_no === id; })[0]; if (!row) return;
      var from = row.day; row = Object.assign({}, row, { day: D4.n }); if (row.status === "later") row.status = "planned";
      reorder(Object.assign({}, D4, { rows: D4.rows.filter(function (r) { return r.household_no !== id; }).concat([row]) }), ids, (D4.out || []).filter(function (x) { return x !== id; }));
      toast(id + " 을(를) " + from + "일차에서 " + D4.n + "일차로 옮겼습니다");
    } else {
      var mv = lsGet(LS_DMOVE, {}) || {}; mv[id] = D4.n; lsSet(LS_DMOVE, mv);
      var ord = lsGet("daeum.officer.dayOrder", {}) || {}; ord[D4.n] = ids; lsSet("daeum.officer.dayOrder", ord);
      toast(id + " 을(를) " + D4.n + "일차에 넣었습니다"); render();
    }
  }
  /** 하루 일정 공유(Web Share, 없으면 복사) — ⛔ 가구번호·읍면·시각만(RP.shareText 가 그 밖은 읽지 않는다) */
  function dayShareText(d) {
    return RP.shareText({ label: (d.date ? md(d.date) + " " : "") + d.n + "일차", start: depGet().time,
      stops: d.ids.map(function (id, i) { return { id: id, area: BY[id] ? BY[id].area : "", arrive: (d.s.rows[i] || {}).arrive || "" }; }),
      back: d.s.back ? d.s.back.arrive : null, approx: !!d.s.approx, km: d.s.km, travelMin: d.s.travelMin });
  }
  function shareDay(d) {
    var t = dayShareText(d);
    if (navigator.share) { navigator.share({ title: "방문 일정", text: t }).then(function () { toast("공유했습니다"); }, function (e) { if (!e || e.name !== "AbortError") copy(t); }); return; }
    copy(t);
  }
  function bindShare(ds) {
    app.querySelectorAll('[data-act="share"]').forEach(function (b) { b.addEventListener("click", function () { var n = +b.dataset.sday, d = ds.filter(function (x) { return x.n === n; })[0]; if (d) { vib(); shareDay(d); } }); });
  }
  function confirmPlan(ds) {
    var R = rankBy(), dl = deadline(), rows = [];
    ds.forEach(function (d) { d.ids.forEach(function (id, i) { rows.push({ day: d.n, seq: i + 1, household_no: id, planned_at: at(d.date, d.s.rows[i].arrive), status: statusOf(id), list_rank: R[id] ? R[id].listRank : null, visit_rank: R[id] ? R[id].todayRank : null }); });
      (d.out || []).forEach(function (id, j) { rows.push({ day: d.n, seq: d.ids.length + j + 1, household_no: id, planned_at: null, status: "later", list_rank: R[id] ? R[id].listRank : null, visit_rank: R[id] ? R[id].todayRank : null }); }); });
    SY.savePlan({ round_ym: roundYm(), ranked_at: new Date().toISOString(), until: dl.until, per_day: dl.perDay || 5, rows: rows });
    toast("방문 계획을 확정했습니다 · " + (SY.state().mode === "live" ? "같은 계정 폰에 바로 나타납니다" : "로그인하면 폰과 연동됩니다"));
    render();
  }

  // ═════ M1 동선(②) — 남은 집 순서 지도 + 네이버 지도 길안내(앱 nmap 경유 최대 5, 없으면 웹) ═════
  var APP_URL = "https://hcyang572-gif.github.io/daeum/", NAVBACK = "daeum.nav.back";
  function merc(p) { var x = p.lng * 20037508.34 / 180, y = Math.log(Math.tan((90 + p.lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180; return x.toFixed(1) + "," + y.toFixed(1); }
  function seg(stops, k) { var s = k * 6; return { from: s, list: stops.slice(s, s + 6) }; }
  function appUrl(sg) {
    var L = sg.list, d = L[L.length - 1], q = [];
    L.slice(0, -1).forEach(function (p, i) { q.push("v" + (i + 1) + "lat=" + p.lat, "v" + (i + 1) + "lng=" + p.lng, "v" + (i + 1) + "name=" + encodeURIComponent("방문 " + (sg.from + i + 1))); });
    q.push("dlat=" + d.lat, "dlng=" + d.lng, "dname=" + encodeURIComponent("방문 " + (sg.from + L.length)), "appname=" + encodeURIComponent(APP_URL));
    return "nmap://route/car?" + q.join("&"); // 출발을 비우면 현재 위치에서 출발
  }
  function webUrl(sg, stops, office) {
    var L = sg.list, start = sg.from ? stops[sg.from - 1] : office, sn = sg.from ? "방문 " + sg.from : "시청";
    var pt = function (p, n) { return merc(p) + "," + encodeURIComponent(n) + ",,"; };
    var via = L.slice(0, -1).map(function (p, i) { return pt(p, "방문 " + (sg.from + i + 1)); }).join(":");
    return "https://map.naver.com/p/directions/" + pt(start, sn) + "/" + pt(L[L.length - 1], "방문 " + (sg.from + L.length)) + "/" + (via || "-") + "/car";
  }
  function navBack() { // 안드로이드에서 웹 대체 주소로 넘어갔다 돌아오면 동선 화면으로(30분 안 한 번)
    var v = null; try { v = JSON.parse(sessionStorage.getItem(NAVBACK) || "null"); sessionStorage.removeItem(NAVBACK); } catch (e) { return false; }
    if (!v || !/^#route(:|$)/.test(v.h || "") || Date.now() - (v.at || 0) > 30 * 60000 || v.h === location.hash) return false;
    location.replace(v.h); return true;
  }
  function launch(ids, k) {
    var stops = ids.map(function (id) { return RP.toLatLng(BY[id]); }); if (!stops.length) return;
    var off = RP.toLatLng(OFFICE), sg = seg(stops, k), web = webUrl(sg, stops, off), ua = navigator.userAgent || "";
    try { sessionStorage.setItem(NAVBACK, JSON.stringify({ h: location.hash, at: Date.now() })); } catch (e) { /* 저장 불가 */ }
    if (/Android/i.test(ua)) location.href = "intent://" + appUrl(sg).slice(7) + "#Intent;scheme=nmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;S.browser_fallback_url=" + encodeURIComponent(web) + ";end";
    else if (/iPhone|iPad|iPod/i.test(ua)) { var t0 = Date.now(), hid = false, vh = function () { if (document.hidden) hid = true; }; document.addEventListener("visibilitychange", vh); location.href = appUrl(sg); setTimeout(function () { document.removeEventListener("visibilitychange", vh); if (!hid && Date.now() - t0 < 2500) location.href = web; }, 1500); }
    else window.open(web, "_blank", "noopener");
  }
  /** 38b 연계처 — 한국사회보장정보원 자원정보서비스(15001839) 스냅샷. 자료에 위치가 없어 지도 핀 대신 «이 동선 가구와 맞는 곳» 먼저 목록으로 */
  function resMatch(ids) {
    var need = {};
    ids.forEach(function (id) {
      var h = BY[id]; if (!h) return;
      var kid = (h.members || []).filter(function (m) { return m.age != null && m.age < 18; });
      if (kid.length) (need.child = need.child || []).push(id + " 아이 " + kid.map(function (m) { return m.age + "세"; }).join("·"));
      if (h.disability) (need.disab = need.disab || []).push(id + " 장애");
    });
    return need;
  }
  function resBlock(ids) {
    if (!RES || !RES.facilities || !RES.facilities.length) return "";
    var need = resMatch(ids), fs = RES.facilities.slice().sort(function (a, b) { return (need[b.kind] ? 1 : 0) - (need[a.kind] ? 1 : 0); });
    var hit = fs.filter(function (f) { return need[f.kind]; }).length;
    var li = fs.map(function (f) {
      var why = need[f.kind] ? need[f.kind].slice(0, 2).join(" · ") : "";
      return '<li class="' + (why ? "hit" : "") + '"><span class="rk k-' + f.kind + '">' + esc(f.kindName) + "</span><div><b>" + esc(f.name) + "</b><small>" + esc(f.svcs.slice(0, 3).join(" · ") + (f.svcs.length > 3 ? " 외 " + (f.svcs.length - 3) : "")) + "</small></div>" + (why ? "<em>" + esc(why) + "</em>" : "") + "</li>";
    }).join("");
    var s = RES.source || {};
    return '<details class="resw blk"' + (hit ? " open" : "") + '><summary><b>연계처 · 자원정보서비스</b><span>상주 ' + fs.length + "곳 " + RES.total + "건" + (hit ? " · 이 동선 가구와 맞는 곳 " + hit : "") + "</span></summary>" +
      '<ul class="resl">' + li + "</ul>" +
      '<p class="srcline">출처: ' + esc(s["기관"] || "한국사회보장정보원") + " " + esc(s["데이터명"] || "자원정보서비스") + "(" + esc(s["번호"] || "15001839") + ") · " + esc(s["기준일"] || "") + " 조회 · 자료에 주소가 없어 지도에는 표시하지 않습니다 · 연계 여부는 담당 공무원 판단</p></details>";
  }
  // ── 41 동선 배경 = 네이버 지도(officer/route_map.js 를 처음 동선 화면에서만 불러옴) + 최적화 전·후 비교 ──
  //   비교 «전» = 명단(한국사회보장정보원 순위) 순서, «후» = 지금 화면 순서(최근접 이웃 → 2-opt). 둘 다 시청 출발·복귀.
  //   값: 도로 경로 서버(daeum-route, 네이버 Directions 15)가 두 순서 모두 주면 그 값, 아니면 직선거리×1.3·시속 40km 근사(«약»).
  var rmP = null, RT_DEMO_FIXED = (function () { try { return !/[?&]demo=off\b/.test(location.search) && (window.DAEUM_CONFIG || {}).demoSeed !== false; } catch (e) { return true; } })();
  function rmLoad() {
    if (window.DaeumRouteMap) return Promise.resolve(window.DaeumRouteMap);
    if (rmP) return rmP;
    rmP = new Promise(function (ok, no) { var s = document.createElement("script"); s.src = "officer/route_map.js?v=s12z109"; s.onload = function () { window.DaeumRouteMap ? ok(window.DaeumRouteMap) : no("no-rm"); }; s.onerror = function () { rmP = null; no("network"); }; document.head.appendChild(s); });
    return rmP;
  }
  function rtStops(ids) { return ids.map(function (id) { return { id: id, x: BY[id].x, y: BY[id].y }; }); }
  function rtListOrder(ids) { var inDay = {}; ids.forEach(function (id) { inDay[id] = 1; }); var o = rank().map(function (r) { return r.id; }).filter(function (id) { return inDay[id]; }); return o.length === ids.length ? o : ids.slice(); }
  function rtPts(ids) { var off = RP.toLatLng(OFFICE), a = [[off.lng, off.lat]]; ids.forEach(function (id) { var q = RP.toLatLng(BY[id]); a.push([q.lng, q.lat]); }); a.push([off.lng, off.lat]); return a; }
  function rtSum(ids, road) {
    if (road && road.legs) { var m = 0, s = 0; road.legs.forEach(function (l) { m += l.m; s += l.s; }); return { km: m / 1000, min: s / 60, road: true }; }
    var km = RP.tourKm(rtStops(ids), OFFICE, true); return { km: km, min: km / RP.KMH * 60, road: false };
  }
  function rtCmp(before, after) {
    var RM = window.DaeumRouteMap, rb = RM && RM.cacheGet(RP.cacheKey(rtStops(before), true)), ra = RM && RM.cacheGet(RP.cacheKey(rtStops(after), true));
    // 45 미르(D-080): 시연 모드에선 거리·시간 숫자를 직선×1.3 근사로 고정(시연 4곳 76.4→52.5km·115→79분·31%) — 경로 서버(429·한도) 상태와 무관하게 언제 열어도 같은 값. 지도선은 도로 경로를 받으면 그 모양 그대로.
    var fixed = RT_DEMO_FIXED, road = !fixed && !!(rb && ra), b = rtSum(before, road ? rb : null), a = rtSum(after, road ? ra : null);
    return { before: before, after: after, b: b, a: a, road: road, same: before.join() === after.join(), dKm: b.km - a.km, dMin: b.min - a.min, pct: b.km > 0 ? (b.km - a.km) / b.km * 100 : 0, path: road ? ra.path : null, fixed: fixed };
  }
  function rtOptHtml(r) {
    var y = r.road ? "" : "약 ", f1 = function (v) { return (Math.round(v * 10) / 10).toFixed(1); }, f0 = function (v) { return Math.round(v); };
    var head = r.same || r.dKm < 0.05 ? '<b class="rt-h">명단 순서가 이미 가장 짧은 길입니다</b>'
      : r.dKm > 0 ? '<b class="rt-h">이 순서로 돌면 <em>' + y + f1(r.dKm) + "km · " + f0(Math.max(0, r.dMin)) + "분</em> 짧아집니다</b>"
      : '<b class="rt-h">직접 바꾼 순서 · 명단 순서보다 ' + y + f1(-r.dKm) + "km 깁니다</b>";
    var w = r.b.km > 0 ? Math.max(8, Math.min(100, r.a.km / r.b.km * 100)) : 100;
    // 77회차(11-13 호창님 «일정 순서를 변경할 때마다 동선 최적화 결과가 달라져야»): 손으로 바꾼 순서면 그 순서 값 + 최적 순서 값을 나란히, 차이 한 줄 + 작은 «최적 순서로 다시 맞추기»
    var best = r.after && r.after.length > 1 ? routeOrder(r.after) : null, man = !!best && best.join() !== r.after.join(), o = man ? rtSum(best, null) : null, mine = man ? rtSum(r.after, null) : null;
    if (man) head = '<b class="rt-h">직접 바꾼 순서 · 최적 순서보다 <em>' + (mine.min - o.min >= 0.5 ? y + f0(mine.min - o.min) + "분" : "거의 같게") + "</em>" + (mine.min - o.min >= 0.5 ? " 더 걸립니다" : " 걸립니다") + "</b>";
    var wo = man && r.b.km > 0 ? Math.max(8, Math.min(100, o.km / r.b.km * 100)) : 0;
    return '<section class="rt-opt blk" aria-label="동선 최적화 결과"><div class="rt-tag">동선 최적화 결과</div>' + head +
      '<div class="rt-bars"><div class="rt-r"><span>명단 순서</span><i class="rt-b0" style="width:100%"></i><b>' + y + f1(r.b.km) + "km · " + f0(r.b.min) + "분</b></div>" +
      '<div class="rt-r on"><span>' + (man ? "지금 순서" : "최적 순서") + '</span><i class="rt-b1" style="width:' + w.toFixed(0) + '%"></i><b>' + y + f1(r.a.km) + "km · " + f0(r.a.min) + "분</b></div>" +
      (man ? '<div class="rt-r"><span>최적 순서</span><i class="rt-b1" style="width:' + wo.toFixed(0) + '%;opacity:.45"></i><b>약 ' + f1(o.km) + "km · " + f0(o.min) + "분</b></div>" : "") + "</div>" +
      (man ? '<p class="rt-re"><button type="button" class="sbtn sm" data-act="reopt">빠른 순서로 다시 짜기</button></p>' : "") +
      (r.dKm >= 0.05 ? '<p class="rt-pct">이동 거리 ' + f0(r.pct) + "% 줄임 · 상담 시간은 그대로</p>" : "") +
      '<p class="rt-src">' + (r.road ? "거리·시간: 네이버 Directions 15 도로 경로(닿음 서버 daeum-route)" : r.fixed ? "거리·시간: 시연 고정값 — 직선거리 × 1.3(우회 계수) · 시속 40km 근사(실제 운영은 네이버 도로 경로)" : "거리·시간: 직선거리 × 1.3(우회 계수) · 시속 40km 근사 — 도로 경로를 받으면 실제 값으로 바뀝니다") +
      " · 순서: 최근접 이웃 → 2-opt · 상주시청 출발·복귀 · 가구 위치는 가상(시연용)</p></section>";
  }
  function routeView(want) {
    var k = pickHid(want); if (!k) return phEmpty();
    if (!VD) return '<main class="phx"><p class="demo">동선을 불러오는 중…</p></main>';
    var c = Object.assign({}, k.c, { d: Object.assign({}, k.c.d, { s: sched(k.c.d.ids) }) }), hid = k.hid, h = BY[hid], i = c.d.ids.indexOf(hid), row = c.d.s.rows[i] || {};
    var ag = againMap(), done = c.d.ids.filter(function (id) { return statusOf(id) !== "planned" && !ag[id]; }), left = c.d.ids.filter(function (id) { return statusOf(id) === "planned" || ag[id]; });
    // 102회차 VISIT-I6(B8): 실제 기록 시각으로 남은 집 도착·복귀를 다시 셈 — 10분 넘게 밀리거나 18시를 넘을 때만 카드
    var rs = c.isToday || c.d.date === ymd(new Date()) ? reschedOf(c.d) : { rows: [], show: false }, eta = function (id, j) { var r = rs.rows.filter(function (x) { return x.id === id; })[0]; return r ? r.arrive : (c.d.s.rows[j] || {}).arrive || ""; };
    var backT = rs.back || (c.d.s.back ? c.d.s.back.arrive : c.d.s.end), lastL = left.filter(function (id) { return id !== hid; }).slice(-1)[0] || left.slice(-1)[0];
    var late = rs.show ? '<section class="vx-late blk" aria-label="실제 시각으로 다시 셈"><div class="vx-kick">실제 시각으로 다시 셈</div><b class="vx-lt">복귀 ' + esc(rs.back || "") + " 예상 · " + (rs.over ? "근무시간(18:00)을 넘습니다" : "근무시간 안") + "</b>" +
      (rs.last ? '<div class="vx-note">' + ii("clock") + "<span>" + esc(rs.last.id) + " 상담 " + rs.last.stay + "분 · 뒤 집 도착을 모두 " + (rs.shift > 0 ? "늦췄습니다" : "당겼습니다") + "</span></div>" : "") +
      '<div class="vx-btns"><button type="button" class="btn pri sm" data-vx="reroute">남은 집 다시 짜기</button>' + (lastL ? '<button type="button" class="sbtn" data-vx="postpone" data-v="' + lastL + '">' + lastL + " 다음 근무일로</button>" : "") + "</div></section>" : "";
    var way = VD.wayOf(lsGet(VD.WAY_KEY, {}) || {}, hid, demoOn()); // VISIT-A3 찾아가는 길(내 메모 → 없으면 시연 가상 문구)
    var vt = F.visitTime.profile(attempts(), hid, { neighborLog: neighborLog() }), segs = Math.ceil(left.length / 6);
    var stops = c.d.ids.map(function (id, j) { var st = statusOf(id); return '<a class="rs' + (st !== "planned" ? " dn" : "") + (id === hid ? " nx" : "") + '" href="#route:' + id + '"><i>' + (st !== "planned" ? ii("check") : j + 1) + '</i><b>' + id + "</b><span>" + esc(BY[id].area) + stTag(st) + '</span><em>' + esc(eta(id, j)) + "</em></a>"; }).join("");
    // S12-x 66회차: 시안 v3 scrVisit — 첫 칸(지도·최적화 비교·다음 가구·길안내) | 둘째 칸(방문 순서 목록·지나는 길 연계처)
    var vm = vxMode(), wide = vm !== "phone", m3 = vxM3(vm);
    var MAP = '<div class="mapw blk ph-map rt-map" id="rtmap"><div class="rt-svg">' + mapSvg({ id: "rm", days: [{ ids: c.d.ids, focus: true }], done: done, next: hid, h: 360, label: "오늘 동선 지도", me: HERE }) + '</div><div class="rt-nmap" role="region" aria-label="네이버 지도 — 오늘 방문 순서"><div class="rt-nbox"></div></div>' +
      '<div class="mtop"><span>' + (c.isToday ? "오늘" : c.d.date ? md(c.d.date) : c.d.n + "일차") + " · " + c.d.ids.length + "가구</span><span>" + yak(c.d.s) + c.d.s.km + "km · " + esc(backT) + " 복귀</span></div></div>";
    var OPT = '<div id="rtopt">' + rtOptHtml(rtCmp(rtListOrder(c.d.ids), c.d.ids)) + "</div>";
    var NEXT = late + '<section class="nextc blk"><span class="pin">' + (i + 1) + '</span><div><b>다음 가구 ' + hid + "</b><small>" + esc(h.area + " · " + ageLine(h)) + (vt.best && vt.absences.length ? " · " + esc(VD.absHint(vt)) : "") + '</small></div><span class="eta">' + esc(eta(hid, i)) + "<small>" + (row.km != null ? row.km + "km · " + row.travelMin + "분" : "") + "</small></span>" +
      '<div class="dprog" style="grid-template-columns:repeat(' + c.d.ids.length + ',1fr)">' + c.d.ids.map(function (id) { return '<i class="' + (id === hid ? "n" : statusOf(id) !== "planned" ? "d" : "") + '"></i>'; }).join("") + '</div><div class="dprog-l"><span>' + done.length + "가구 끝</span><span>남은 " + left.length + "가구</span></div>" +
      (way ? '<div class="vx-way">' + ii("pin") + '<span class="vx-wt"><b>찾아가는 길</b> · <span data-vxway="t">' + esc(way.t) + "</span>" + (way.demo ? '<small class="samp">가상</small>' : "") + '</span><button type="button" class="vx-lk sm" data-vx="way" data-v="' + esc(hid) + '" aria-label="' + esc(hid) + ' 찾아가는 길 메모 고치기">' + ii("pen") + "고치기</button></div>" : "") + "</section>" +
      '<button type="button" class="btn nav" data-act="nav" data-dock="2" data-dock-lbl="길안내" title="네이버 지도 길안내 — 폰은 지도 앱, PC는 새 창으로 열림">' + (I.nav || "") + '<span>네이버 지도로 길안내</span><small>남은 ' + Math.min(6, left.length || c.d.ids.length) + "곳 경유</small></button>" +
      (segs > 1 ? '<div class="segs">' + Array.apply(null, { length: segs }).map(function (_, kk) { return '<button type="button" class="sbtn" data-seg="' + kk + '">' + (kk * 6 + 1) + "~" + Math.min(left.length, kk * 6 + 6) + "번째</button>"; }).join("") + "</div>" : "") +
      '<p class="navnote">이름·주소 대신 «방문 1·2…»만 넘깁니다 · 네이버 지도 앱이 없으면 웹 길찾기로 <button type="button" class="sbtn shr" data-act="share" data-sday="' + c.d.n + '">' + (c.isToday ? "오늘" : "이날") + ' 일정 공유<small> 가구번호·읍면·시각만</small></button></p>';
    var LIST = '<div class="rlist blk">' + stops + "</div>", RES0 = resBlock(c.d.ids);
    var QC = qcards("이 탭의 다른 기능", [
        ["nav", "구간 나눠 길안내", "6곳씩 · 네이버 지도 경유 한도", segs > 1 ? 'data-qto=".segs"' : 'data-qto="[data-act=nav]"'],
        ["send", "일정 공유", "가구번호·읍면·시각만", 'data-qto=".navnote [data-act=share]"'],
        ["pin", "주변 정보", "연계처·경로당 «방문 전 확인»", 'data-qto=".nbl"'],
        ["today", "방문 계획", "일차·순서 바꾸기 · 확정", 'data-go="#plan"']
      ]);
    var ARR = '<a class="btn pri" data-dock="1" data-dock-sub="' + esc(hid) + ' · 집 앞 요약 보기" href="#home:' + hid + '">' + (I.door || "") + "도착했어요 <small>집 앞 요약 보기</small></a>";
    var body;
    if (!wide) body = MAP + OPT + NEXT + C2 + LIST + RES0 + QC + ARR; // 폰: 옛 순서 그대로(S12-x 66회차)
    else if (!m3) body = MAP + RES0 + C2 + NEXT + LIST + OPT + QC + ARR; // 폴드·태블릿 세로 2단(Version 15 #3): 지도+주변 정보(지도 바로 뒤에 붙음)·연계처 | 다음 가구+이날 일정+최적화 결과
    else body = MAP + OPT + C2 + NEXT + LIST + QC + vx3(vm) + '<div id="vxnb" hidden></div>' + RES0 + ARR; // 태블릿 가로·PC 3단 5·4·3: 지도·최적화(+진도판) | 다음 가구·일정·기능 | 주변 정보(bindRoute 가 옮김)·연계처(+오늘 방문·문서)
    return '<main class="phx' + (wide ? " vx-main vx-route" : "") + '">' + body + "</main>";
  }
  function bindRoute(want) {
    vxLayout(); // 103회차 V4-4
    var k = pickHid(want); if (!k) return;
    var c = Object.assign({}, k.c, { d: Object.assign({}, k.c.d, { s: sched(k.c.d.ids) }) }), ag = againMap(), left = c.d.ids.filter(function (id) { return statusOf(id) === "planned" || ag[id]; });
    if (VD) bindRouteVx(c.d);
    var nb = app.querySelector('[data-act="nav"]'); if (nb) nb.addEventListener("click", function () { vib(); launch(left.length ? left : c.d.ids, 0); });
    app.querySelectorAll("[data-seg]").forEach(function (b) { b.addEventListener("click", function () { launch(left, +b.dataset.seg); }); });
    rtMapBind("rtmap", "rtopt", c.d.ids, k.hid, "#0B6178");
    var nbH = document.getElementById("vxnb"), nbl = app.querySelector("#rtmap + .nbl"); if (nbH && nbl) nbH.parentNode.replaceChild(nbl, nbH); // 103회차 3단: 주변 정보(지도 뒤에 붙는 목록)를 셋째 칸 맨 위로 — 목록 갱신은 같은 요소를 그대로 씀
    Promise.resolve().then(vxAlign); setTimeout(vxAlign, 400);
    geoWatch(); // VISIT-A4: 위치 허용(granted)일 때만 내 위치 점
    var ro = document.getElementById("rtopt"); if (ro) ro.addEventListener("click", function (e) { if (e.target.closest('[data-act="reopt"]')) { vib(); reorder(c.d, routeOrder(c.d.ids)); toast("빠른 순서로 다시 짰습니다"); } }); // 77회차
    bindShare(days());
  }
  /** 102회차 동선 조작 — 남은 집 다시 짜기(A2)·다음 근무일로·찾아가는 길 고치기(A3) */
  function bindRouteVx(d) {
    var rr = app.querySelector('[data-vx="reroute"]'); if (rr) rr.addEventListener("click", function () { vib(); replanLeft(d); });
    var pp = app.querySelector('[data-vx="postpone"]'); if (pp) pp.addEventListener("click", function () { vib(); toNextDay(pp.dataset.v, d.n); });
    var wb = app.querySelector('[data-vx="way"]');
    if (wb) wb.addEventListener("click", function () {
      var hid = wb.dataset.v, box = wb.parentNode, cur0 = VD.wayOf(lsGet(VD.WAY_KEY, {}) || {}, hid, false); vib();
      box.innerHTML = ii("pin") + '<input class="vx-inp" maxlength="60" placeholder="대문·진입로·주차 자리(예: 회관 뒤 파란 대문)" aria-label="' + esc(hid) + ' 찾아가는 길" value="' + esc(cur0 ? cur0.t : "") + '"><button type="button" class="sbtn" data-vxw="ok">저장</button>';
      var inp = box.querySelector("input"), save = function () { lsSet(VD.WAY_KEY, VD.setWay(lsGet(VD.WAY_KEY, {}) || {}, hid, inp.value)); toast(inp.value.trim() ? hid + " 찾아가는 길을 남겼습니다 · 다음 방문·인수인계 때 보입니다" : hid + " 찾아가는 길 메모를 지웠습니다"); render(); };
      box.querySelector('[data-vxw="ok"]').addEventListener("click", save);
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); save(); } });
      try { inp.focus(); } catch (e) { /* 무시 */ }
    });
  }
  var rtAsked = {}, rtRO = null;
  function RT_BUSY() { var a = document.activeElement; return !!(a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) || !!document.querySelector("dialog[open]"); } // 입력 중·시트 열림이면 전체 다시 그리기 대신 지도만
  /** 네이버 지도(도로 경로선·번호 핀) + 최적화 비교 카드 — 동선(②)·방문 계획(①) 공용. wrapId 칸 안 .rt-nbox 에 그린다 */
  function rtMapBind(wrapId, optId, ids, hid, color, ghosts) {
    var wrap = document.getElementById(wrapId), box = wrap && wrap.querySelector(".rt-nbox"); if (!box) return; // 네이버가 지도 판에 position:relative 를 덮어써서 바깥 칸(절대 위치)이 아닌 안쪽 판에 그린다
    var before = rtListOrder(ids);
    var NB = window.DaeumNearby ? window.DaeumNearby.attach(wrap, ids.map(function (id) { var p = RP.toLatLng(BY[id]); return { id: id, area: BY[id].area, lat: p.lat, lng: p.lng }; })) : null; // S12-s 주변 정보 겹층
    function stops() { return ids.map(function (id, j) { var p = RP.toLatLng(BY[id]), st = statusOf(id); return { lat: p.lat, lng: p.lng, no: j + 1, label: "방문 " + (j + 1), cls: id === hid ? "nx" : st !== "planned" ? "dn" : "" }; }); }
    function paint() {
      var RM = window.DaeumRouteMap, r = rtCmp(before, ids), o = document.getElementById(optId);
      if (o) o.innerHTML = rtOptHtml(r);
      var lt = wrap.parentNode.querySelector(".rt-lg-t"); if (lt) lt.textContent = r.road ? "네이버 지도 · 도로 경로(Directions 15)" : "네이버 지도 · 선은 직선 근사(도로 경로 받는 중)";
      var mt = wrap.querySelector(".mtop span:last-child"); if (mt && r.road) mt.textContent = (Math.round(r.a.km * 10) / 10).toFixed(1) + "km · 이동 " + Math.round(r.a.min) + "분(도로)";
      if (!RM || !document.body.contains(box)) return;
      var off = RP.toLatLng(OFFICE), ra = RM.cacheGet(RP.cacheKey(rtStops(ids), true));
      var ok = RM.draw({ box: box, office: { lat: off.lat, lng: off.lng, name: "상주시청", short: "시청" }, stops: stops(), path: ra ? ra.path : null, ret: true, color: color || "#0B6178", // 77회차: 경로선 = 방문 가구 색
        ghosts: (ghosts || []).map(function (g) { return g.map(function (id) { return RP.toLatLng(BY[id]); }); }), onDrawn: NB ? NB.onDrawn : null }); // 41 남은 점: 다른 일차 흐린 점선 · S12-s 겹층
      if (!ok) return;
      if (wrapId === "rtmap") { meMk = null; meDraw(); } // VISIT-A4 다시 그린 지도에 내 위치 표지
      var shown = function () { wrap.classList.add("has-naver"); var lb = wrap.parentNode.querySelector(".rt-lg-b"); if (lb) lb.hidden = !(ghosts && ghosts.length); };
      try { naver.maps.Event.once(RM.state.map, "tilesloaded", shown); } catch (e) { /* 이벤트 없음 */ }
      setTimeout(function () { if (box.querySelector("img")) shown(); }, 1500); // 이미 받아 둔 타일이면 tilesloaded 가 안 올 수 있다
    }
    rmLoad().then(function (RM) {
      return RM.load().then(function () {
        paint();
        if (rtRO) rtRO.disconnect();
        if (window.ResizeObserver) { var was = box.clientWidth * box.clientHeight; rtRO = new ResizeObserver(function () { // 숨김(0px)에서 보이게 되면 다시 그려 범위를 맞추고, 크기만 바뀌면 판 크기만 맞춘다
          if (!document.body.contains(box)) { rtRO.disconnect(); return; }
          var now = box.clientWidth * box.clientHeight; if (!now) { was = 0; return; }
          if (!was) paint(); else RM.refresh(); was = now; }); rtRO.observe(box); }
        // 도로 경로 — 두 순서(명단·최적) 모두. 같은 순서·복귀면 7일 보관이라 다시 부르지 않는다
        if (ids.length > RP.MAX_ROAD_STOPS) return;
        [before, ids].forEach(function (ord) {
          var key = RP.cacheKey(rtStops(ord), true);
          if (RM.cacheGet(key) || rtAsked[key]) return; rtAsked[key] = 1;
          RM.road(key, rtPts(ord)).then(function () { if (document.body.contains(box)) { if (ord === ids && !RT_BUSY()) render(); else paint(); } }, function () { /* 오류·상한·끊김 — 화면 오류 없이 직선 어림값(«약») 유지 */ });
        });
      });
    }).catch(function (why) { wrap.classList.add("no-naver"); if (NB) NB.fallback(); if (window.console) console.warn("[닿음 동선] 네이버 지도 대신 그림 지도 — " + why); });
  }


  // ── 내보내기(app.js·다른 탭이 읽는 이름) ──
  AK.put({
    planView: function () { return planView; }, bindPlan: function () { return bindPlan; }, navBack: function () { return navBack; }, routeView: function () { return routeView; },
    bindRoute: function () { return bindRoute; },
    // 102회차 — 다른 탭(오늘·현장)이 같은 기능을 부르는 이름: B9 출발 시각표 · B8 실제 시각 재계산 · B1a 다음 근무일로·오늘 다시 들르기·남은 집 다시 짜기 · B1b 날씨 배지
    visitDay: function () { return VD; }, visitSched: function () { return schedDep; }, visitDays: function () { return vdays; },
    visitResched: function () { return function (d) { return reschedOf(Object.assign({}, d, { s: sched(d.ids) })); }; },
    visitLater: function () { return function (hid) { var d = vdays().filter(function (x) { return x.ids.indexOf(hid) >= 0 || (x.out || []).indexOf(hid) >= 0; })[0]; return d ? !!toNextDay(hid, d.n) : false; }; },
    visitAgain: function () { return visitAgain; }, visitReplan: function () { return function (d) { replanLeft(Object.assign({}, d, { s: sched(d.ids) })); }; },
    visitWxBadge: function () { return wxBadge; },
    // 107회차 ⚙️ 파로A: 출발 자동 판정(depGet — 위치 받음·시연 데이터면 «지금 위치», 거부·실패면 근무지)을 오늘 탭도 같이 쓴다.
    //   오늘 탭에선 위치를 «묻지» 않는다 — 이미 허용(granted)일 때만 한 번 받아 다시 그린다.
    visitDepNow: function () { return function () {
      var d = depGet();
      if (d.auto && !geoTried && !HERE && typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: "geolocation" }).then(function (st) { if (st.state === "granted") depAutoGeo(); }, function () {});
      return d;
    }; }
  });
  return relink;
};
