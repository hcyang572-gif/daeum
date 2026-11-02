/* S11-d2(11-03) — 공무원 화면: 두 입구(정보원 정기 명단 · 실시간 신고) · 방문 우선순위 근거 · 신고 도착 카드 · 명단 밖 가구 메모(A안) · 확정 기록 · 가상 데이터 표시.
   s11c.js 뒤에 읽는다. 계산은 priority.js(순수 함수)·route_plan.js·officer.js 결과만 쓴다. 정본 규격: 01_리서치/S11-d2_우선순위_규칙.md · 시안: _시안/S11-d2_신고화면.html(가안).
   지키는 것: 점수 숫자 비표시 · 닿음은 발굴(후보 계산)을 하지 않음(명단 밖 가구는 현장 메모 → 다음 명단 대조) · 명단 밖 주소는 이 기기 안 대조 전용(화면엔 «○○읍 일대»).
   «시연: 신고 한 건 받아 보기»는 이 기기 저장소에만 넣는다(서버 전송 0). */
(function (root) {
  "use strict";
  var doc = root.document, P = root.DaeumPriority, RP = root.DaeumRoutePlan, REQ = root.DaeumRequests, FX = root.DaeumFeatures;
  if (!P || !RP || !REQ || !doc) return;
  var RM = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var K_OUT = "daeum.officer.outside", K_REC = "daeum.officer.records", K_INS = "daeum.s11d2.inserted", K_META = "daeum.s11.importMeta", K_DEFER = "daeum.officer.deferred";
  var KIND = { self: "도움 요청", family: "가족 대신 요청", neighbor: "이웃 알림" };
  var PREF = { visit: "집으로 와 주세요", phone: "전화 주세요", text: "문자 주세요" };
  function $(id) { return doc.getElementById(id); }
  function qa(s, r) { return [].slice.call((r || doc).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function lsGet(k, d) { try { var v = root.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function O() { return root.DaeumOfficer; }
  function AL() { return root.DaeumAlerts; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hm(d) { d = new Date(d); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function ymd(d) { d = new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function ready() { var o = O(); return !!(o && o.data && o.data() && o.plan && o.plan()); }
  function active(r) { return r && r.status !== "done" && r.status !== "cancelled"; }
  function kindOf(r) { return r.signal === "neighbor" || r.signal === "family" ? r.signal : r.proxy && r.proxy.isProxy ? (r.proxy.relation === "이웃" ? "neighbor" : "family") : "self"; }
  function hidOf(r) { var o = O(); return r.householdId && o.row(r.householdId) ? r.householdId : o.row(r.id) ? r.id : null; }

  // ── 순위 계산 입력 ──
  function ctx() {
    var o = O(), al = AL(), d = al && al.get ? al.get() : null, meta = lsGet(K_META, {}) || {};
    var reqs = REQ.list().slice();
    // 명단에 없는 주민 신호 줄(요청 id 가 가구 id)도 같은 규칙으로 신호 가산·긴급을 받게
    o.picked().forEach(function (id) { var r = o.row(id); if (r && r.h.request) reqs.push(Object.assign({}, r.h.request, { householdId: id })); });
    return { today: new Date(), meta: meta, weather: al && d ? al.weather(d, o.weatherChoice()) : null, noResponse: al && d ? al.noRespMap(d) : {},
      requests: reqs, tips: FX ? FX.store.get("tips", []) : [], attempts: FX ? FX.store.get("attempts", []) : [], pins: FX ? FX.store.get("order", []) : [] };
  }
  function ranked() { var o = O(); return P.compute(o.picked().map(o.row).filter(Boolean).map(function (r) { return r.h; }), ctx()); }

  // ── 경로·시각표(직선×1.3 근사, route_plan.js 그대로) ──
  function val(id, d) { var e = $(id); return e ? (e.type === "checkbox" ? e.checked : e.value) : d; }
  function sched(ids, ret) {
    var o = O(), D = o.data(), pts = ids.map(function (id) { var r = o.row(id); return r ? { id: id, x: r.h.x, y: r.h.y } : null; }).filter(Boolean);
    var s = RP.schedule(pts, RP.approxLegs(pts, D.meta.office, ret), { start: val("routeStart", "09:30"), consultMin: +val("routeConsult", 30), lunch: val("routeLunch", true) ? undefined : null, ret: ret });
    s.over = RP.overWork(s); s.pts = pts; return s;
  }
  function visitedToday() {
    var today = ymd(new Date()), m = {};
    (FX ? FX.store.get("attempts", []) : []).forEach(function (t) { if (t && String(t.at || "").slice(0, 10) === today) m[t.householdId] = 1; });
    return m;
  }
  function fixedPrefix(ids) { var v = visitedToday(), n = 0; while (n < ids.length && v[ids[n]]) n++; return n; }
  function durTxt(min) { var h = Math.floor(min / 60), m = Math.round(min % 60); return (h ? h + "시간 " : "") + m + "분"; }

  // ── 끼워 넣기 ──
  var ins = lsGet(K_INS, {}) || {};
  function plan(r, mustFirst) {
    var o = O(), D = o.data(), p0 = o.plan(), ret = p0.ret, hid = hidOf(r); if (!hid) return null;
    var cur = p0.ids.filter(function (id) { return id !== hid; }), fixed = fixedPrefix(cur);
    var hr = o.row(hid), pt = { id: hid, x: hr.h.x, y: hr.h.y }, pts = cur.map(function (id) { var x = o.row(id); return { id: id, x: x.h.x, y: x.h.y }; });
    var res, urgent = !!r.urgent, mustLeft = [];
    if (urgent) {
      var rk = ranked(); mustLeft = rk.filter(function (x) { return x.band === "must" && x.id !== hid && cur.indexOf(x.id) >= fixed; }).map(function (x) { return x.id; });
      var f2 = fixed; if (mustFirst && mustLeft.length) mustLeft.forEach(function (id) { f2 = Math.max(f2, cur.indexOf(id) + 1); });
      res = P.urgentNext(pts, pt, D.meta.office, ret, RP.kmBetween, f2);
    } else res = P.insertCheapest(pts, pt, D.meta.office, ret, RP.kmBetween, fixed);
    var ids = res.order.map(function (x) { return x.id; }), before = sched(cur, ret), after = sched(ids, ret);
    var near = null; pts.forEach(function (x, i) { var d = RP.kmBetween(x, pt) / RP.DETOUR; if (!near || d < near.km) near = { i: i, km: d }; });
    return { r: r, hid: hid, ids: ids, at: res.at, urgent: urgent, mustLeft: mustLeft, before: before, after: after, near: near, ret: ret, already: p0.ids.indexOf(hid) >= 0 };
  }
  function doInsert(r, mustFirst) {
    var pl = plan(r, mustFirst); if (!pl) return null;
    O().setRoute(pl.ids);
    if (r.status === "new" && !r.__local) REQ.setStatus(r.id, "seen", "officer", "오늘 경로에 넣음");
    if (r.__local) markLocal(r.id, "seen");
    ins[r.id] = { hid: pl.hid, at: new Date().toISOString(), n: pl.at + 1 }; lsSet(K_INS, ins);
    var rk = ranked(), cand = pl.after.over.over ? P.deferCandidate(rk, pl.ids, [pl.hid]) : null, alt = null;
    if (cand) alt = { id: cand, s: sched(pl.ids.filter(function (x) { return x !== cand; }), pl.ret) };
    renderAll();
    return { pl: pl, alt: alt };
  }
  function deferTomorrow(id) {
    var t = new Date(); t.setDate(t.getDate() + 1);
    var df = lsGet(K_DEFER, []) || []; df = df.filter(function (x) { return x.id !== id; }); df.push({ id: id, day: ymd(t), first: true }); lsSet(K_DEFER, df);
    O().setRoute(O().plan().ids.filter(function (x) { return x !== id; }));
    renderAll();
  }
  function markLocal(id, st) {
    var list = lsGet(REQ.key, []) || []; list.forEach(function (x) { if (x.id === id) { x.status = st; (x.history = x.history || []).push({ at: new Date().toISOString(), status: st, by: "officer", note: "오늘 경로에 넣음" }); } }); lsSet(REQ.key, list);
  }
  function label(id) { var r = O().row(id); return r ? (r.h.request ? (KIND[kindOf(r.h.request)] || "주민 신호") : r.h.label) + " · " + r.h.area : id; }

  // ── ① 두 입구 + 합류 경로 + 왜 이 순서 ──
  function liveReqs() { return REQ.list().filter(function (r) { return active(r) && (r.status === "new" || r.status === "seen" || r.status === "visiting"); }).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }); }
  function renderGates() {
    var box = $("s11Today"); if (!box || !ready()) return;
    var g = $("s2Gates"); if (!g) { g = doc.createElement("section"); g.id = "s2Gates"; g.className = "s2 s2-gates-wrap"; g.setAttribute("aria-label", "오늘 들어온 두 입구"); box.insertBefore(g, box.querySelector(".vg")); }
    var o = O(), p = o.plan(), rk = ranked(), reqs = liveReqs(), inRoute = {}; p.ids.forEach(function (id) { inRoute[id] = 1; });
    var listN = p.ids.filter(function (id) { var r = o.row(id); return r && !r.h.request && !reqInRoute(id); }).length;
    var mustN = rk.filter(function (x) { return x.band === "must"; }).length;
    var al = AL(), w = al && al.get && al.get() ? al.weather(al.get(), o.weatherChoice()) : null;
    var heatN = w ? rk.filter(function (x) { return x.parts.some(function (q) { return q.k === "AB" && /에 /.test(q.label); }); }).length : 0;
    var todoN = rk.filter(function (x) { return x.parts.some(function (q) { return q.k === "E"; }); }).length;
    var s = sched(p.ids, p.ret), mode = REQ.liveMode ? REQ.liveMode() : "off";
    var rows = reqs.slice(0, 3).map(function (r) {
      var hid = hidOf(r), on = hid && inRoute[hid], when = String(r.createdAt || "").slice(0, 10) === ymd(new Date()) ? hm(r.createdAt) : String(r.createdAt || "").slice(5, 10);
      return '<div class="' + (on ? "in" : "new") + '"><span><b>' + esc(r.region || "읍면 미상") + '</b> · ' + esc(KIND[kindOf(r)] || "신호") + (r.urgent ? ' <i class="s2-urg">긴급</i>' : "") + '<small>«' + esc(clip(r.situation || "", 22)) + '»</small></span>' +
        (on ? '<em>' + esc(when) + ' · 경로에 있음</em>' : hid ? '<button type="button" class="s2-ins" data-ins="' + esc(r.id) + '">끼워 넣기</button>' : '<em>' + esc(when) + ' · 확인 전</em>') + '</div>';
    }).join("") || '<div><span>새 신고 없음<small>주민 화면에서 보내면 여기로 바로 옵니다</small></span></div>';
    var pills = p.ids.map(function (id, i) { var r = o.row(id), fromReq = r && (r.h.request || reqInRoute(id)); return '<span class="' + (fromReq ? "r" : "") + '" title="' + esc(label(id)) + '">' + (i + 1) + '</span>'; }).join("");
    g.innerHTML =
      '<div class="s2-h"><div><h3>오늘 찾아갈 집 <em>' + p.ids.length + '곳</em></h3><p>두 입구에서 들어온 집을 한 경로로 묶었습니다</p></div></div>' +
      '<div class="s2-gates">' +
      '<section class="s2-gate list" aria-labelledby="s2g1"><div class="gh"><span class="num">1</span><div><b id="s2g1">정보원 정기 명단</b><small>복지사각지대 발굴관리시스템 · 정기 배정</small></div></div>' +
        '<div class="big"><strong>' + listN + '</strong><span>가구 · 오늘 방문</span></div>' +
        '<div class="rows"><div>오늘 꼭 (긴급 신고·안부 응답 48시간 없음)<em>' + mustN + '가구</em></div>' + (w ? '<div>' + esc(w.name) + ' · 혼자 사는 고령<em>' + heatN + '가구</em></div>' : "") + '<div>미처리 두 달 넘음<em>' + todoN + '가구</em></div></div>' +
        '<span class="src-line"><i class="v"></i>발굴대상자 조회 서식 그대로 · 가상 가구</span></section>' +
      '<section class="s2-gate live" aria-labelledby="s2g2"><div class="gh"><span class="num">2</span><div><b id="s2g2">실시간 신고</b><small>주민 · 이웃 · 통장이 닿음 주민 창구로</small></div><span class="s2-livetag" data-mode="' + esc(mode) + '"><i></i>' + (mode === "live" ? "연결됨" : mode === "poll" ? "5초마다 확인" : "이 기기") + '</span></div>' +
        '<div class="big"><strong>' + reqs.length + '</strong><span>건 · 오늘 확인할 신고</span></div>' +
        '<div class="rows">' + rows + '</div>' +
        '<span class="src-line"><i class="l"></i>명단이 오기 전 생긴 위기도 오늘 찾아갑니다 <button type="button" class="s2-lnk" id="s2Demo">시연: 신고 한 건 받아 보기</button></span></section>' +
      '</div>' +
      '<div class="s2-merge" aria-hidden="true"><svg viewBox="0 0 1000 48" preserveAspectRatio="none"><path class="ml" d="M 250 0 C 250 30, 500 18, 500 48"/><path class="mr" d="M 750 0 C 750 30, 500 18, 500 48"/></svg></div>' +
      '<div class="s2-route"><div class="t"><b>오늘 방문 경로</b><small>' + durTxt(s.travelMin + s.consultMin) + ' · 마침 ' + esc(s.end) + ' · 거리 기준 자동 순서</small></div><div class="pills" aria-label="방문 순서(주황 = 실시간 신고)">' + pills + '</div><a class="s2-btn s" href="#route">지도·시각표</a></div>' +
      '<div class="s2-legend"><span><i class="l"></i>정보원 명단</span><span><i class="r"></i>실시간 신고</span><span>장소·가구·신고는 모두 가상 데이터</span></div>' +
      '<p class="s2-msg" id="s2Msg" role="status" aria-live="polite"></p>';
    renderWhy(rk);
  }
  function reqInRoute(id) { return REQ.list().some(function (r) { return active(r) && r.householdId === id && ins[r.id]; }); }
  function renderWhy(rk) {
    var box = $("s11Today"); if (!box) return;
    var w = $("s2Why"); if (!w) { w = doc.createElement("section"); w.id = "s2Why"; w.className = "s2 s2-card"; w.setAttribute("aria-labelledby", "s2WhyH"); var g = $("s2Gates"); g.parentNode.insertBefore(w, g.nextSibling); }
    w.innerHTML = '<div class="s2-ch"><h3 id="s2WhyH">왜 이 집을 먼저 보나</h3><p>정보원 발굴순위 위에 현장 사정(특보·혼자 사는 고령·상담 공백·주민 신호·미처리 기간)을 얹었습니다. 점수는 띄우지 않고 이유만 적습니다. 방문 길 순서는 거리로 따로 짭니다.</p></div>' +
      '<ol class="s2-why">' + rk.map(function (x) {
        return '<li class="' + x.band + '"><span class="n" aria-hidden="true">' + (x.band === "must" ? "꼭" : x.todayRank) + '</span><div><b>' + esc(label(x.id)) + '</b><p>' + esc(x.line) + '</p>' +
          '<details><summary>자세히</summary><ul>' + x.detail.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + '</ul></details></div></li>';
      }).join("") + '</ol>' +
      '<p class="s2-src">가중치·문턱은 시연용 잠정값(도입 때 현장과 다시 정함) · 근거: 01_리서치/S11-d2_우선순위_규칙.md · 닿음은 명단을 새로 고르지 않습니다(발굴은 정보원·행복이음)</p>';
  }

  // ── ② 신고 도착 카드 ──
  var bellN = 0, lastArr = null;
  function chime() {
    try {
      var C = root.AudioContext || root.webkitAudioContext; if (!C) return;
      var ac = new C(), t = ac.currentTime; if (ac.resume) ac.resume();
      [[880, 0], [660, 0.22]].forEach(function (p) {
        var o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.value = p[0];
        g.gain.setValueAtTime(0, t + p[1]); g.gain.linearRampToValueAtTime(0.25, t + p[1] + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + p[1] + 0.6);
        o.connect(g); g.connect(ac.destination); o.start(t + p[1]); o.stop(t + p[1] + 0.65);
      });
      if (root.navigator.vibrate) root.navigator.vibrate(120);
    } catch (e) { /* 소리 막힘 — 화면 표시만 */ }
  }
  function bell() {
    var b = $("s2Bell");
    if (!b) {
      var hd = doc.querySelector("header.top"), anchor = $("s11Info"); if (!hd) return;
      b = doc.createElement("button"); b.type = "button"; b.id = "s2Bell"; b.className = "s2-bell";
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg><em hidden></em>';
      hd.insertBefore(b, anchor || null);
      b.addEventListener("click", function () { if (lastArr) arrive(lastArr, true); else { root.location.hash = "#today"; var g = $("s2Gates"); if (g) g.scrollIntoView({ block: "start" }); } });
    }
    var em = b.querySelector("em"); em.hidden = !bellN; em.textContent = bellN;
    b.setAttribute("aria-label", bellN ? "새 신고 " + bellN + "건" : "신고 알림(새 신고 없음)");
  }
  function arrive(r, quiet) {
    if (!ready()) return;
    lastArr = r;
    var old = $("s2Arrive"); if (old) old.remove();
    var pl = plan(r, false), card = doc.createElement("aside"); card.id = "s2Arrive"; card.className = "s2 s2-arrive" + (RM ? "" : " shake"); card.setAttribute("role", "alertdialog"); card.setAttribute("aria-labelledby", "s2ArrH");
    var k = kindOf(r), mins = pl ? Math.max(0, Math.round(pl.after.endMin - pl.before.endMin)) : 0;
    var why = !pl ? "명단 가구와 이어지지 않은 신호입니다 — 명단 밖 가구로 메모해 두면 다음 명단과 맞춰 봅니다" : pl.already ? "이미 오늘 경로에 있는 집입니다" :
      (pl.near ? "지금 경로 " + (pl.near.i + 1) + "번 집에서 " + (pl.near.km < 1 ? Math.round(pl.near.km * 1000) + "m" : pl.near.km.toFixed(1) + "km") : "") + " · 끼워 넣으면 오늘 일정 +" + mins + "분" + (pl.urgent ? " · 긴급이라 바로 다음 방문으로" : "");
    card.innerHTML = '<div class="hd"><span class="s2-livetag"><i></i>실시간 신고</span><span class="s2-chip">' + esc(KIND[k] || "신호") + '</span>' + (r.urgent ? '<span class="s2-chip urg">긴급</span>' : "") + '<span class="ago">' + (Date.now() - new Date(r.createdAt || Date.now()).getTime() < 600000 ? "방금 · " : "") + esc(hm(r.createdAt || new Date())) + '</span><button type="button" class="x" aria-label="닫기">×</button></div>' +
      '<h3 id="s2ArrH">' + (r.situation ? "«" + esc(clip(r.situation, 40)) + "»" : "다른 기기에서 온 " + esc(KIND[k] || "신호") + " · 번호 " + esc(r.code || "")) + '</h3>' +
      '<div class="meta"><span>' + esc(r.region || "읍면 미상") + '</span>' + (r.subject && (r.subject.tags || []).indexOf("senior") >= 0 ? "<span>어르신(신고 내용)</span>" : "") + '<span>' + esc(PREF[r.contactPref] || "연락 방법 미상") + '</span></div>' +
      '<p class="why">' + esc(why) + '</p>' +
      (pl && pl.urgent && pl.mustLeft.length ? '<p class="q">어디 먼저 갈까요? <button type="button" class="s2-btn p sm" data-go="new">새 긴급 신고 먼저</button><button type="button" class="s2-btn s sm" data-go="must">예정된 오늘 꼭 먼저</button></p>' : "") +
      '<div class="act">' + (pl && !pl.already ? '<button type="button" class="s2-btn p" data-go="ins"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h10M10 6l6 6-6 6"/><path d="M20 4v16"/></svg>오늘 경로에 끼워 넣기</button>' : "") +
        (pl ? '<button type="button" class="s2-btn s" data-go="tmr">내일 명단에</button>' : '<button type="button" class="s2-btn p" data-go="memo">명단 밖 가구로 메모</button>') + '</div>' +
      '<p class="res" role="status" aria-live="polite"></p>' +
      '<div class="snd"><button type="button" data-go="chime"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>도착 소리 다시</button><span>«딩동» 두 음 · 진동 1회 · 다른 기기 신호는 이름·주소 없이 옵니다</span></div>';
    doc.body.appendChild(card);
    var res = card.querySelector(".res");
    function done(out) {
      var pl2 = out.pl;
      res.innerHTML = esc(label(pl2.hid)) + "을(를) 오늘 경로 " + (pl2.at + 1) + "번째에 넣었습니다 · 마침 " + esc(pl2.before.end) + " → " + esc(pl2.after.end) +
        (out.alt ? '<br><b>근무 시간을 넘습니다.</b> <button type="button" class="s2-btn s sm" data-go="defer" data-id="' + esc(out.alt.id) + '">' + esc(label(out.alt.id)) + ' 내일 첫 방문으로 미루기 → 마침 ' + esc(out.alt.s.end) + '</button>' : "") +
        '<br><a class="s2-lnk" href="#route">방문 순서 보기 ›</a> <button type="button" class="s2-lnk" data-go="rec">방문 뒤 기록 쓰기 ›</button>';
      qa('[data-go="ins"],[data-go="tmr"],.q', card).forEach(function (e) { e.remove(); });
      bellN = Math.max(0, bellN - 1); bell();
      var m = $("s2Msg"); if (m) m.textContent = res.textContent.replace(/방문 순서 보기 ›.*$/, "");
    }
    card.addEventListener("click", function (e) {
      var b = e.target.closest("[data-go], .x"); if (!b) return;
      var go = b.classList.contains("x") ? "x" : b.dataset.go;
      if (go === "x") { card.remove(); return; }
      if (go === "chime") { chime(); return; }
      if (go === "ins" || go === "new" || go === "must") { var out = doInsert(r, go === "must"); if (out) done(out); return; }
      if (go === "tmr") { var hid = hidOf(r); if (hid) { var t = new Date(); t.setDate(t.getDate() + 1); var df = lsGet(K_DEFER, []) || []; df = df.filter(function (x) { return x.id !== hid; }); df.push({ id: hid, day: ymd(t) }); lsSet(K_DEFER, df); }
        res.textContent = "내일 명단 맨 앞에 담았습니다(내일 화면을 열면 들어옵니다)."; bellN = Math.max(0, bellN - 1); bell(); return; }
      if (go === "memo") { openMemo({ from: "request", requestId: r.id, area: r.region, place: r.place || "", urgent: !!r.urgent }); card.remove(); return; }
      if (go === "defer") { deferTomorrow(b.dataset.id); res.insertAdjacentHTML("beforeend", "<br>" + esc(label(b.dataset.id)) + "을(를) 내일 첫 방문으로 미뤘습니다."); b.remove(); return; }
      if (go === "rec") { card.remove(); var h = (ins[r.id] || {}).hid || hidOf(r); if (h) O().openRecord(h); }
    });
    if (!quiet) { chime(); bellN++; bell(); }
    var fb = card.querySelector(".s2-btn.p"); if (fb) try { fb.focus({ preventScroll: true }); } catch (e) { /* 구형 */ }
  }
  var known = {};
  function watch() {
    REQ.list().forEach(function (r) { known[r.id] = 1; });
    REQ.onChange(function (list) {
      list.forEach(function (r) { if (!known[r.id]) { known[r.id] = 1; if (r.status === "new" && !r.seed) setTimeout(function () { arrive(r); }, 120); } });
      renderAll();
    });
  }
  // 시연: 이 기기 저장소에만 신고 한 건(가까운 명단 가구와 이어진 이웃 알림) — 서버 전송 0
  function demoArrive() {
    if (!ready()) return;
    var o = O(), p = o.plan(), D = o.data(), on = {}; p.ids.forEach(function (id) { on[id] = 1; });
    var used = {}; REQ.list().forEach(function (r) { if (r.householdId) used[r.householdId] = 1; });
    var pts = p.ids.map(function (id) { return o.row(id).h; }), best = null;
    o.rows().forEach(function (r) {
      if (on[r.h.id] || used[r.h.id] || r.h.request) return;
      var d = Math.min.apply(null, pts.map(function (h) { return RP.kmBetween(h, r.h); }));
      if (!best || d < best.d) best = { d: d, h: r.h };
    });
    var now = new Date(), list = lsGet(REQ.key, []) || [], n = list.filter(function (x) { return /-L\d+$/.test(x.id); }).length + 1;
    var rec = { v: 1, id: "REQ-" + ymd(now).replace(/-/g, "") + "-L" + n, code: "L" + pad(n), createdAt: now.toISOString(), status: "new", region: best ? best.h.area : (D.areas[0] || {}).name,
      householdId: best ? best.h.id : null, signal: "neighbor", place: "시장 뒤 골목 끝 집", contactPref: "visit", proxy: { isProxy: true, relation: "이웃" },
      subject: { age: null, ageBand: null, tags: ["alone", "senior"], childAges: [] }, situation: "며칠째 안 보이고 우편물이 쌓였어요", summary: "", matched: [], urgent: false, mode: "rules", demo: true, __local: true,
      consent: { agreed: true, at: now.toISOString(), text: "시연용 가상 신고(이 기기에만 저장)" }, history: [{ at: now.toISOString(), status: "new", by: "citizen" }] };
    list.push(rec); if (!lsSet(REQ.key, list)) return;
    known[rec.id] = 1; o.refresh(); arrive(rec);
  }

  // ── ③ 명단 밖 가구(A안) ──
  function memos() { var m = lsGet(K_OUT, []); return Array.isArray(m) ? m : []; }
  function saveMemos(m) { return lsSet(K_OUT, m); }
  function renderOut() {
    var box = $("s11Today"); if (!box || !ready()) return;
    var c = $("s2Out"); if (!c) { c = doc.createElement("section"); c.id = "s2Out"; c.className = "s2 s2-card"; c.setAttribute("aria-labelledby", "s2OutH"); var w = $("s2Why"); w.parentNode.insertBefore(c, w.nextSibling); }
    var list = memos().filter(function (m) { return m.status !== "closed"; }), ym = ymd(new Date()).slice(0, 7);
    c.innerHTML = '<div class="s2-ch row"><div><h3 id="s2OutH">명단 밖 가구</h3><p>현장에서 본 «명단에 없는 걱정되는 집». 다음 정보원 명단을 불러오면 이 기기 안에서 주소로 맞춰 봅니다. 닿음이 후보를 계산하지는 않습니다.</p></div><button type="button" class="s2-btn p" id="s2MemoBtn">명단 밖 가구 메모</button></div>' +
      '<ul class="s2-out">' + (list.length ? list.map(function (m) {
        var tg = P.memoTags(m).map(function (t) { return '<i class="s2-tag ' + t.k + '">' + esc(t.t) + "</i>"; }).join("");
        var act = m.status === "not_in_list" || (m.urgent && m.status !== "referred") ? '<button type="button" class="s2-btn s sm" data-out="ref" data-id="' + esc(m.id) + '">행복이음에 등록했어요</button>' :
          m.status === "near" ? '<button type="button" class="s2-btn s sm" data-out="same" data-id="' + esc(m.id) + '">같은 집</button><button type="button" class="s2-btn s sm" data-out="diff" data-id="' + esc(m.id) + '">다른 집</button>' :
          m.status === "registered" && !m.addr ? '<button type="button" class="s2-btn s sm" data-out="in" data-id="' + esc(m.id) + '">명단에 있음</button><button type="button" class="s2-btn s sm" data-out="notin" data-id="' + esc(m.id) + '">명단에 없음</button>' : "";
        return '<li><div><b>' + esc(m.area) + ' 일대</b> · ' + esc(P.FROM[m.from] || "현장") + ' · ' + esc((m.signs || []).join("·")) + (m.place ? '<small>' + esc(m.place) + '</small>' : "") +
          (m.status === "registered" && !m.addr ? '<small>대조하려면 주소가 필요합니다 — 수동으로 고를 수 있어요</small>' : "") + '</div><span class="tg">' + tg + '</span><span class="ac">' + act +
          '<button type="button" class="s2-lnk" data-out="close" data-id="' + esc(m.id) + '">종결</button></span></li>';
      }).join("") : '<li><div>아직 메모가 없습니다<small>옆집·통장·주민 신고로 들은 집을 30초 안에 남겨 두세요</small></div></li>') + '</ul>' +
      '<p class="s2-src">' + esc(P.reportLine(memos()).text) + ' · 이름·전화는 받지 않음 · 주소는 대조 전용(이 기기 안, 서버 전송 0)</p>';
  }
  function onOut(e) {
    var b = e.target.closest("[data-out],#s2MemoBtn"); if (!b) return;
    if (b.id === "s2MemoBtn") { openMemo({}); return; }
    var id = b.dataset.id, m = memos(), now = new Date().toISOString();
    m.forEach(function (x) {
      if (x.id !== id) return;
      var st = { ref: "referred", same: "in_list", diff: "not_in_list", "in": "in_list", notin: "not_in_list", close: "closed" }[b.dataset.out];
      x.status = st; if (st === "referred") x.referredAt = now;
      (x.history = x.history || []).push({ at: now, status: st, by: "officer" });
    });
    saveMemos(m); renderOut();
  }
  function openMemo(pre) {
    var o = O(), areas = o.data().areas.map(function (a) { return a.name; }).filter(function (n) { return o.data().households.some(function (h) { return h.area === n; }); });
    var dl = $("s2MemoDlg"); if (dl) dl.remove();
    dl = doc.createElement("dialog"); dl.id = "s2MemoDlg"; dl.className = "s2 s2-dlg"; dl.setAttribute("aria-labelledby", "s2MemoH");
    dl.innerHTML = '<form method="dialog" novalidate><h3 id="s2MemoH">명단에 없는 걱정되는 집</h3><p class="s2-src">이름·전화는 적지 않습니다. 주소는 다음 명단과 맞춰 보는 데만 쓰고 이 기기에만 남습니다.</p>' +
      '<label>읍면동<select name="area" required>' + areas.map(function (a) { return '<option' + (a === pre.area ? " selected" : "") + '>' + esc(a) + "</option>"; }).join("") + '</select></label>' +
      '<label>주소(선택 · 대조 전용)<input name="addr" maxlength="60" placeholder="예) 함창읍 가상리 140" autocomplete="off"></label>' +
      '<label>찾아가는 길(선택)<input name="place" maxlength="60" value="' + esc(pre.place || "") + '" placeholder="예) 마을회관 뒤 파란 지붕" autocomplete="off"></label>' +
      '<label>누가 알렸나<select name="from">' + Object.keys(P.FROM).map(function (k) { return '<option value="' + k + '"' + (k === (pre.from || "field") ? " selected" : "") + '>' + esc(P.FROM[k]) + "</option>"; }).join("") + '</select></label>' +
      '<fieldset><legend>본 것(하나 이상)</legend>' + P.SIGNS.map(function (s, i) { return '<label class="ck"><input type="checkbox" name="sign" value="' + esc(s) + '"' + (i === 0 && pre.from === "request" ? " checked" : "") + '>' + esc(s) + "</label>"; }).join("") + '</fieldset>' +
      '<div class="two"><label>나이대<select name="ageBand"><option>모름</option><option>60대</option><option>70대</option><option>80대 이상</option></select></label><label>혼자 사나<select name="alone"><option>모름</option><option>예</option><option>아니오</option></select></label></div>' +
      '<label class="ck"><input type="checkbox" name="urgent"' + (pre.urgent ? " checked" : "") + '>지금 위험해 보임</label>' +
      '<p class="err" role="alert" hidden></p><div class="act"><button type="button" class="s2-btn s" value="cancel">닫기</button><button type="submit" class="s2-btn p">메모 저장</button></div></form>';
    doc.body.appendChild(dl);
    var f = dl.querySelector("form");
    f.querySelector('[value="cancel"]').addEventListener("click", function () { dl.close(); dl.remove(); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var signs = qa('input[name="sign"]:checked', f).map(function (x) { return x.value; }), err = f.querySelector(".err");
      if (!signs.length) { err.textContent = "본 것을 하나 이상 골라 주세요."; err.hidden = false; return; }
      var now = new Date(), m = memos(), n = m.filter(function (x) { return x.id.indexOf("OUT-" + ymd(now).replace(/-/g, "")) === 0; }).length + 1;
      var urgent = f.urgent.checked;
      m.push({ id: "OUT-" + ymd(now).replace(/-/g, "") + "-" + n, at: now.toISOString(), area: f.area.value, addr: f.addr.value.trim(), place: f.place.value.trim(), from: f.from.value,
        requestId: pre.requestId || null, signs: signs, ageBand: f.ageBand.value, alone: f.alone.value, urgent: urgent, status: "registered", match: null,
        history: [{ at: now.toISOString(), status: "registered", by: "officer" }] });
      if (!saveMemos(m)) { err.textContent = "이 기기에 저장하지 못했습니다."; err.hidden = false; return; }
      dl.close(); dl.remove(); renderOut();
      var msg = $("s2Msg"); if (msg) msg.textContent = urgent ? "위험해 보이면 다음 명단을 기다리지 마세요 · 행복이음에 자체 발굴로 지금 등록" : "메모했습니다 · 다음 명단을 불러오면 자동으로 맞춰 봅니다";
      var oc = $("s2Out"); if (oc) oc.scrollIntoView({ block: "nearest" });
    });
    if (dl.showModal) dl.showModal(); else dl.setAttribute("open", "");
  }
  /** s11c.js 명단 불러오기 직후: 명단 밖 메모를 새 명단과 맞춰 본다 → 요약 한 줄 */
  function matchImported(list, round) {
    var r = P.matchAll(memos(), list, round); if (!r.summary.text) return "";
    saveMemos(r.memos); renderOut(); return r.summary.text;
  }

  // ── ④ 확정 기록 ──
  function renderRecs() {
    var host = doc.querySelector("#tab-record .s11"); if (!host) return;
    var c = $("s2Recs"); if (!c) { c = doc.createElement("section"); c.id = "s2Recs"; c.className = "s2 s2-card"; c.setAttribute("aria-labelledby", "s2RecH"); host.appendChild(c); }
    var list = lsGet(K_REC, []) || [];
    c.innerHTML = '<div class="s2-ch"><h3 id="s2RecH">지난 확정 기록 <em>' + list.length + '건</em></h3><p>공무원이 확정한 행복이음 입력 순서 초안입니다. 정식 기록은 행복이음에 입력합니다.</p></div>' +
      '<ul class="s2-recs">' + (list.length ? list.slice(0, 8).map(function (x) {
        var lb = String(x.label || "가구").replace(/(\d)\d\d$/, "$1●●"), first = String(x.text || "").split("\n");
        return '<li><b>' + esc(String(x.at || "").slice(5, 10).replace("-", "월 ") + "일") + ' · ' + esc(x.area || "") + ' · ' + esc(lb) + (x.seed ? ' <i class="s2-tag">가상</i>' : "") + '</b><small>' + esc(clip((first[2] || "").replace(/^상담 요약:\s*/, ""), 46)) + '</small>' +
          '<details><summary>전체 보기</summary><pre>' + esc(x.text) + '</pre></details></li>';
      }).join("") : '<li>아직 확정한 기록이 없습니다<small>위에서 AI 초안을 만들고 «공무원 확정»을 누르면 여기에 남습니다</small></li>') + '</ul>';
  }
  doc.addEventListener("daeum:record-confirmed", function (e) {
    var d = e.detail || {}, list = lsGet(K_REC, []) || [], now = new Date();
    list.unshift({ id: "RC-" + now.getTime(), at: now.toISOString(), label: d.label, area: d.area, text: d.text });
    lsSet(K_REC, list.slice(0, 50)); renderRecs();
  });

  // ── ⑤ 보고 한 줄 · 가상 데이터 표시 ──
  function renderReport() {
    var host = $("s11RNum"); if (!host) return;
    var p = $("s2RepOut"); if (!p) { p = doc.createElement("p"); p.id = "s2RepOut"; p.className = "s2 s2-rep"; host.parentNode.insertBefore(p, host.nextSibling); }
    var reqs = REQ.list().filter(function (r) { return r.status !== "cancelled"; }), inRoute = reqs.filter(function (r) { return ins[r.id] || (r.householdId && O() && O().picked().indexOf(r.householdId) >= 0); }).length;
    p.innerHTML = '<span><b>두 입구</b> 정보원 명단 ' + (O() ? O().picked().filter(function (id) { var r = O().row(id); return r && !r.h.request; }).length : 0) + '곳 + 실시간 신고 ' + reqs.length + '건(오늘 경로에 든 신고 ' + inRoute + '건)</span>' +
      '<span><b>명단 밖</b> ' + esc(P.reportLine(memos()).text) + '</span>';
  }
  function demoBar() {
    var v = doc.querySelector("p.virtual"); if (!v || $("s2Reset")) return;
    var b = doc.createElement("a"); b.id = "s2Reset"; b.className = "s2-reset"; b.href = "?demo=reset&tour=0#today"; b.textContent = "시연 데이터 처음 상태로";
    b.setAttribute("title", "담기·끼워 넣기·메모·시도 기록을 지우고 오늘 기준 가상 데이터로 다시 깝니다");
    v.appendChild(doc.createTextNode(" · ")); v.appendChild(b);
  }

  function renderAll() { if (!ready()) return; try { renderGates(); renderOut(); renderRecs(); renderReport(); bell(); } catch (e) { if (root.console) console.warn("[닿음 S11-d2]", e); } }
  function boot() {
    demoBar(); watch();
    doc.addEventListener("daeum:officer-show", function () { setTimeout(renderAll, 0); });
    doc.addEventListener("click", function (e) {
      var d = e.target.closest("#s2Demo"); if (d) { demoArrive(); return; }
      var i = e.target.closest("[data-ins]"); if (i) { var r = REQ.get(i.dataset.ins) || (lsGet(REQ.key, []) || []).filter(function (x) { return x.id === i.dataset.ins; })[0]; if (r) arrive(r, true); return; }
      if (e.target.closest("#s2Out")) onOut(e);
    });
    var tries = 0; (function wait() { if (ready()) renderAll(); else if (tries++ < 80) setTimeout(wait, 100); })();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
  root.DaeumS11d2 = { matchImported: matchImported, ranked: ranked, plan: plan, insert: doInsert, arrive: arrive, demoArrive: demoArrive };
})(window);
