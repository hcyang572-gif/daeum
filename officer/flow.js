/* 닿음 공무원 화면 — S11-k 흐름 ①~⑨ (⚙️ 파로, 2026-11-03 · 기준 시안 _design/S11-k_흐름시안/index.html 3차, 커밋 584027d)
   PC: ① 명단 불러오기 → ② 전체 명단·기한 → ③ 우선순위 근거 → ④ 일차별 방문 → ⑧ 보고서 → ⑨ 사후관리
   폰: ⑤ 집 앞 30초 요약 → ⑥ 동선·길안내 → ⑦ 확인·메모
   계산은 이미 있는 순수 함수만 부른다(DaeumFeatures = F, DaeumPriority, DaeumRoutePlan, DaeumImport). 저장은 F.store·DaeumSync.
   ⛔ 되살리지 않는 것: 신고 접수·주민 화면·달력에 넣기(.ics)·PC→폰 코드/QR 넘김·시간 절감 띠·다크 화면. 용어: «한국사회보장정보원»(줄임 금지)·«근무일». */
(function () {
  "use strict";
  var F = window.DaeumFeatures, P = window.DaeumPriority, RP = window.DaeumRoutePlan, RM = window.DaeumRouteMap, SY = window.DaeumSync, IM = window.DaeumImport;
  var U = F.util, C = window.DAEUM_CONFIG || {};
  var D = window.__DAEUM_HOUSEHOLDS__ || { households: [], meta: { office: { x: 0, y: 0, name: "상주시청" } }, indicators: [] };
  var AL = window.__DAEUM_ALERTS__ || null;
  var BY = {}; D.households.forEach(function (h) { BY[h.id] = h; });
  var OFFICE = D.meta.office || { x: 0, y: 0 };
  var IND = {}; (D.indicators || []).forEach(function (i) { IND[i.key] = i.name; });
  var RM_ = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = "일월화수목금토", NUM = "①②③④⑤⑥⑦⑧⑨";
  var app = document.getElementById("app");
  var LS_META = "daeum.s11.importMeta", LS_IMPORT = "daeum.s11.import", LS_DL = "daeum.officer.deadline", LS_REPORT = "daeum.officer.reportDone";
  var COL = { gam: "#C9521B", river: "#0E6A6F", ink: "#132029", ink3: "#6E7C84", line: "rgba(19,32,41,.12)" };
  var AXC = { g: "#C9521B", n: "#0E6A6F", d: "#B07A12", r: "#3D5A80" };

  // ── 도구 ──
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ic(id, cls) { return '<svg class="ic' + (cls ? " " + cls : "") + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 */ } }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function md(d) { d = new Date(d); return (d.getMonth() + 1) + "월 " + d.getDate() + "일(" + W.charAt(d.getDay()) + ")"; }
  function mdS(d) { d = new Date(d); return (d.getMonth() + 1) + "." + d.getDate() + " " + W.charAt(d.getDay()); }
  function hm(d) { d = new Date(d); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function ymd(d) { return U.ymd(d); }
  function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function vib() { try { navigator.vibrate && navigator.vibrate(8); } catch (e) { /* 없음 */ } }
  function isPhone() { return window.matchMedia && matchMedia("(max-width: 699px)").matches; }
  function josa(w, a, b) { return P.josa(w, a, b); }

  // ── 데이터 모델 ──
  function meta() { return lsGet(LS_META, {}) || {}; }
  function listIds() {
    var m = meta();
    return Object.keys(m).filter(function (k) { return k !== "__seed" && BY[k]; })
      .sort(function (a, b) { var x = parseFloat(m[a].prio), y = parseFloat(m[b].prio); return (isFinite(x) ? x : 1e9) - (isFinite(y) ? y : 1e9) || (a < b ? -1 : 1); });
  }
  function roundYm() { var m = meta(), ys = Object.keys(m).map(function (k) { return m[k] && m[k].ym; }).filter(Boolean).sort(); return ys.length ? ys[ys.length - 1] : ymd(new Date()).slice(0, 7); }
  function weather() {
    if (!AL || !AL.weather) return null;
    var sc = AL.weather.scenarios && AL.weather.scenarios[AL.weather.active]; if (!sc) return null;
    return { name: sc.name, level: sc.level === 1 ? "경보" : "주의보", demo: true };
  }
  var RES2ATT = { met: "met", absent: "no_answer", refuse: "refused", indirect_ok: "indirect_ok" };
  function logs() { return SY.logs(); }
  function attempts() {
    return (F.store.get("attempts", []) || []).concat(logs().map(function (l) { return { id: "VL:" + l.id, householdId: l.household_no, channel: "visit", result: RES2ATT[l.result] || l.result, at: l.at, note: l.memo }; }));
  }
  function plan() { var p = SY.plan(); return p && p.round_ym === roundYm() && p.rows && p.rows.length ? p : null; }
  function neighborLog() { return F.store.get("neighborLog", []) || []; }
  function deadline() { var d = lsGet(LS_DL, null), p = plan(); if (d && d.until) return d; if (p && p.until) return { until: p.until, perDay: p.per_day || 5 }; return { until: null, perDay: 5 }; }
  function rank() {
    var p = plan(), at = p && p.ranked_at ? new Date(p.ranked_at) : new Date();
    var att = attempts().filter(function (t) { return !p || new Date(t.at) < at; });
    var order = F.store.get("order", []) || [];
    return P.compute(listIds().map(function (id) { return BY[id]; }), { today: at, meta: meta(), weather: weather(), attempts: att, pins: order, deferred: lsGet("daeum.officer.deferred", []) || [] });
  }
  function rankBy() { var o = {}; rank().forEach(function (r) { o[r.id] = r; }); return o; }
  function indText(h) {
    var out = []; Object.keys(h.indicators || {}).forEach(function (k) { if (h.indicators[k]) out.push(IND[k] || k); }); return out;
  }
  function ageLine(h) { var a = h.members && h.members[0] ? h.members[0].age : null; return (a ? a + "세 " : "") + (h.single ? "혼자" : (h.members || []).length + "인 가구"); }

  /** 하루 안 순서: 가까운 집부터 잇고(2-opt) 오전 부재가 많은 집은 오후로 */
  function routeOrder(ids) {
    var stops = ids.map(function (id) { return { id: id, x: BY[id].x, y: BY[id].y }; });
    var ord = stops.length > 1 ? RP.twoOpt(RP.nearest(stops, OFFICE), OFFICE, true) : stops;
    var att = attempts(), late = [], keep = [];
    ord.forEach(function (s) { var vt = F.visitTime.profile(att, s.id, { neighborLog: neighborLog() }); (vt.best && /late|eve/.test(vt.best.k) && vt.absences.length ? late : keep).push(s.id); });
    return keep.concat(late);
  }
  function legsFor(ids) {
    var order = ids.map(function (id) { return { id: id, x: BY[id].x, y: BY[id].y, h: BY[id] }; });
    var key = RP.cacheKey(order.map(function (o) { return o.h; }), true), hit = RM && RM.cacheGet ? RM.cacheGet(key) : null;
    return { order: order, key: key, legs: hit && hit.legs ? hit.legs : RP.approxLegs(order, OFFICE, true), road: !!(hit && hit.legs), path: hit && hit.path };
  }
  function sched(ids, start) {
    var L = legsFor(ids); var s = RP.schedule(L.order, L.legs, { start: start || "09:30", ret: true }); s.road = L.road; s.path = L.path; s.key = L.key; return s;
  }
  /** 일차 묶음: 확정 계획이 있으면 그것, 없으면 순위 → 하루 상한씩 → 하루 안 동선 */
  function days() {
    var p = plan(), dl = deadline(), out = [];
    if (p) {
      var g = {}; p.rows.forEach(function (r) { (g[r.day] = g[r.day] || []).push(r); });
      Object.keys(g).sort(function (a, b) { return a - b; }).forEach(function (k) {
        var rows = g[k].sort(function (a, b) { return a.seq - b.seq; });
        out.push({ n: +k, date: rows[0].planned_at ? ymd(rows[0].planned_at) : null, ids: rows.map(function (r) { return r.household_no; }), rows: rows, confirmed: true });
      });
    } else {
      var rk = rank(), groups = F.deadline.split(rk, dl.perDay || 5), dp = F.deadline.plan(rk.length, dl.until, dl.perDay || 5);
      groups.forEach(function (ids, i) {
        var date = dp.go && dp.go[i] ? dp.go[i] : ymd(U.addWorkdays(new Date(), i + 1));
        var mine = (lsGet("daeum.officer.dayOrder", {}) || {})[i + 1], auto = routeOrder(ids);
        var same = mine && mine.length === auto.length && auto.every(function (x) { return mine.indexOf(x) >= 0; });
        out.push({ n: i + 1, date: date, ids: same ? mine : auto, rows: null, confirmed: false });
      });
    }
    out.forEach(function (d) { d.s = sched(d.ids, "09:30"); });
    return out;
  }
  function statusOf(hid) {
    var p = plan(), r = p && p.rows.filter(function (x) { return x.household_no === hid; })[0];
    var L = logs().filter(function (l) { return l.household_no === hid; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; })[0];
    if (L && (!p || !p.ranked_at || L.at > p.ranked_at)) return L.result === "met" ? "done" : L.result === "absent" ? "absent" : L.result === "refuse" ? "refused" : (r ? r.status : "planned");
    return r ? r.status : "planned";
  }
  function lastLog(hid) { return logs().filter(function (l) { return l.household_no === hid; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; })[0] || null; }
  /** 폰이 보는 «오늘의 일차»: 오늘 날짜 일차 → 남은 집이 있는 가장 이른 일차 → 마지막 일차 */
  function fieldDay(ds) {
    var t = ymd(new Date());
    var td = ds.filter(function (d) { return d.date === t; })[0];
    if (td) return td;
    var open = ds.filter(function (d) { return d.ids.some(function (id) { return statusOf(id) === "planned"; }); })[0];
    return open || ds[ds.length - 1] || null;
  }

  // ── 상태 표지 ──
  var TAG = { done: '<span class="st-tag st-done">만남</span>', absent: '<span class="st-tag st-away">부재</span>', refused: '<span class="st-tag st-late">거절</span>', planned: '<span class="st-tag st-todo">예정</span>', later: '<span class="st-tag st-todo">내일로</span>' };
  function pips(r) { return r && r.parts && r.parts.length ? '<span class="pips">' + r.parts.map(function (p) { return '<i class="ax-' + p.k + '"></i>'; }).join("") + "</span>" : ""; }
  function syncChip(phone) {
    var s = SY.state(), m = s.mode, txt, off = false;
    if (m === "live") txt = phone ? "방금" : "동기화됨";
    else if (m === "connecting") { txt = "연결 중"; off = true; }
    else if (m === "offline") { txt = "연결 끊김 · 이 기기에 임시 저장"; off = true; }
    else { off = true; txt = s.why === "no-table" ? "이 기기에 저장 · 연동 서버 준비 전" : "이 기기에 저장 · 로그인하면 폰과 연동"; }
    return '<button class="sync' + (off ? " off" : "") + '" data-act="account" title="같은 공무원 계정으로 로그인한 PC와 폰이 같은 계획을 봅니다"><i></i>' + esc(txt) + (s.pending ? " · 보낼 것 " + s.pending : "") + "</button>";
  }

  // ── 앱 머리(PC) ──
  var TABS = [["i-list", "명단", 1], ["i-route", "방문 계획", 3], ["i-doc", "보고", 8], ["i-calc", "사후관리", 9]];
  function tabOf(n) { return n <= 2 ? 1 : n <= 4 ? 2 : n === 8 ? 3 : n === 9 ? 4 : 0; }
  function top(n) {
    var on = tabOf(n), dl = deadline(), dp = dl.until ? F.deadline.plan(listIds().length, dl.until, dl.perDay) : null;
    return '<header class="top"><a class="logo" href="../index.html#today" aria-label="복지 사각지대 현장 업무 도우미 오늘 화면으로"><svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><defs><linearGradient id="lg0" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A8A8F"/><stop offset="1" stop-color="#0B5458"/></linearGradient></defs><rect width="30" height="30" rx="9" fill="url(#lg0)"/><rect x=".5" y=".5" width="29" height="29" rx="8.5" fill="none" stroke="#fff" stroke-opacity=".25"/><path d="M8 19c3-6 11-6 14 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="15" cy="11" r="3" fill="#F2A57B"/></svg><div><b>현장 업무 도우미</b><br><small>복지 사각지대 · 닿음</small></div></a>' +
      '<nav class="tabs" aria-label="업무 순서">' + TABS.map(function (t, i) { return (i ? '<span class="sep"></span>' : "") + '<a class="tab' + (i + 1 === on ? " on" : i + 1 < on ? " past" : "") + '" href="#s' + t[2] + '"' + (i + 1 === on ? ' aria-current="page"' : "") + ">" + ic(t[0], "s") + t[1] + "</a>"; }).join("") +
      '<span class="sep"></span><a class="tab" href="#s5" title="현장에서 폰으로 보는 화면">' + ic("i-phone", "s") + "현장</a></nav>" +
      '<div class="round">' + syncChip(false) + (dp && dp.set ? '<span class="dchip">기한 ' + esc(dl.until.slice(5).replace("-", ".")) + " · 근무일 " + dp.left + "일</span>" : "") +
      '<button class="ava" data-act="account" title="계정 · 연동">' + ic("i-shield", "s") + "</button></div></header>";
  }
  function pc(n, cls, inner) { return '<div class="pc">' + top(n) + '<main class="body ' + cls + '" id="main" tabindex="-1">' + inner + "</main></div>"; }

  // ═════ ① 명단 불러오기 ═════
  var importMsg = null;
  function s1() {
    var imp = lsGet(LS_IMPORT, null), rounds = (F.store.get("rounds", []) || []).slice().sort(function (a, b) { return a.ym < b.ym ? 1 : -1; });
    var ym = roundYm(), n = listIds().length;
    var cols = importMsg && importMsg.cols ? importMsg.cols : [
      { src: "발굴우선순위", dst: "한국사회보장정보원 순위", ax: "", note: "뼈대" }, { src: "연령 · 가구원수 · 우선방문대상자_고독사", dst: "혼자 사는 고령", ax: "g" },
      { src: "AI초기상담 결과", dst: "닿지 않음", ax: "d" }, { src: "처리여부 · 발굴년월 · 발굴횟수", dst: "처리 기한", ax: "r" }];
    var AXOF = { prio: "", lonely: "g", age: "g", mem: "g", aiRes: "d", aiReq: "d", proc: "r", ym: "r", cnt: "r" };
    var mc = cols.map(function (c) {
      var ax = c.ax != null ? c.ax : AXOF[c.key] || "";
      return '<div class="mc"><span class="src">' + esc(c.src) + "</span>" + ic("i-next", "s arw") + '<span class="dst">' + (ax ? '<span class="pips"><i class="ax-' + ax + '"></i></span> ' : "") + esc(c.dst) + (c.note ? ' <small class="sub">· ' + esc(c.note) + "</small>" : "") + '</span><span class="st-tag st-done">맞춤</span></div>';
    }).join("") + '<div class="mc skip"><span class="src">' + esc(importMsg && importMsg.skipped && importMsg.skipped.length ? importMsg.skipped.slice(0, 4).join(" · ") : "성명 · 주민등록번호 · 연락처 · 주소") + "</span>" + ic("i-next", "s arw") + '<span class="dst">읽지 않음</span><span class="st-tag st-todo">건너뜀</span></div>';
    var state = importMsg && importMsg.busy ? '<span class="st-tag st-doing">읽는 중</span>' : importMsg && !importMsg.ok ? '<span class="st-tag st-late">열 못 찾음</span>' : '<span class="st-tag st-done">' + (importMsg && importMsg.total ? importMsg.total + "열 중 " + importMsg.cols.length + "열" : "43열 중 11열") + "</span>";
    var rd = '<div class="rd cur"><span class="rd-ic">' + ic("i-sheet") + "</span><div><b>" + esc(ym) + ' 발굴대상자 조회</b><span class="sub">' + esc(imp ? clip(imp.name, 34) : "시연용 가상 명단") + " · " + n + "가구" + (imp && imp.demo ? " · 시연" : "") + '</span></div><span class="st-tag st-doing">진행 중</span></div>' +
      rounds.filter(function (r) { return r.ym !== ym; }).slice(0, 2).map(function (r) { return '<div class="rd"><span class="rd-ic">' + ic("i-sheet") + "</span><div><b>" + esc(r.ym) + ' 발굴대상자 조회</b><span class="sub">' + (r.ids || []).length + '가구 · 지난 차수</span></div><span class="st-tag st-done">완료</span></div>'; }).join("");
    var msg = importMsg && importMsg.text ? '<p class="impmsg' + (importMsg.ok ? "" : " bad") + '" role="status">' + importMsg.text + "</p>" : "";
    return pc(1, "s1", '<div class="left"><div><div class="lab">새 차수 시작 · ' + esc(ym) + '</div><h2 class="h-scr" style="margin-top:8px">이번 달 발굴 명단을 불러옵니다</h2></div>' +
      '<label class="drop" id="drop"><svg class="drop-art" viewBox="0 0 200 128" width="200" height="128" aria-hidden="true"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#F1F5F4"/></linearGradient><filter id="ss" x="-20%" y="-20%" width="140%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#0E3A3D" flood-opacity=".22"/></filter></defs><g transform="translate(18 24) rotate(-7)"><rect width="128" height="88" rx="8" fill="#E3EBE9" stroke="#C9D4D1"/></g><g transform="translate(26 18) rotate(-3)"><rect width="128" height="88" rx="8" fill="#EFF4F3" stroke="#C9D4D1"/></g><g transform="translate(34 10)" filter="url(#ss)"><rect width="128" height="92" rx="8" fill="url(#sg)" stroke="#BFCBC8"/><path d="M8 0h112a8 8 0 0 1 8 8v10H0V8a8 8 0 0 1 8-8Z" fill="#0E6A6F"/><g fill="#fff" font-family="IBM Plex Sans KR" font-size="7.5" font-weight="600"><text x="7" y="12">순위</text><text x="30" y="12">가구</text><text x="64" y="12">읍면</text><text x="98" y="12">횟수</text></g><g stroke="#DCE4E2"><path d="M0 33h128M0 48h128M0 63h128M0 78h128M25 18v74M58 18v74M92 18v74"/></g><g fill="#C8D2CF"><rect x="8" y="24" width="10" height="4" rx="2"/><rect x="29" y="24" width="22" height="4" rx="2"/><rect x="62" y="24" width="22" height="4" rx="2"/><rect x="8" y="39" width="10" height="4" rx="2"/><rect x="29" y="39" width="22" height="4" rx="2"/><rect x="62" y="39" width="22" height="4" rx="2"/><rect x="8" y="54" width="10" height="4" rx="2"/><rect x="29" y="54" width="22" height="4" rx="2"/></g></g><g transform="translate(166 98)"><circle r="16" fill="#C9521B"/><path d="M0 -7v11M-5.5 -1.5 0 4l5.5-5.5" stroke="#fff" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></svg>' +
      '<div><h3>행복이음에서 내보낸<br>«발굴대상자 조회» 엑셀을 놓으세요</h3><p>.xlsx · .csv · 열 이름은 자동으로 맞춥니다</p><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="b b-main">' + ic("i-up") + '엑셀 파일 고르기</span><a class="b b-sub" href="#s2">' + (n ? "불러온 명단 보기" : "시연 명단으로 보기") + '</a></div><p class="sub" style="margin:10px 0 0"><a class="lnk" href="../data/demo_list.xlsx" download>시연용 명단 파일 받기(.xlsx · 가상 9가구)</a></p></div><input type="file" id="file" accept=".xlsx,.xls,.csv,.txt" hidden></label>' + msg +
      '<div class="mapcols"><div class="mapcols-h"><b>열 맞춤 미리보기</b><span class="sub" style="margin-left:auto;margin-right:10px">색 점 = ③ 앞당김 기준에 쓰는 열</span>' + state + "</div>" + mc +
      '<div style="padding:2px 16px 12px"><div class="progress"><i style="width:' + (importMsg && importMsg.busy ? 50 : 100) + '%"></i></div></div></div></div>' +
      '<div class="right"><div class="lab">차수 기록</div><div class="rounds">' + rd + '</div><div class="lab" style="margin-top:4px">불러오면 바로 이어지는 일</div><ul class="then"><li>' + ic("i-loop") + "<span><b>지난 차수와 견주기</b> · 새로 들어온 집, 계속 남은 집, 빠진 집을 나눕니다</span></li><li>" + ic("i-cal") + '<span><b>확인 기한 정하기</b> · 하루 몇 집, 며칠이 필요한지 계산합니다</span></li></ul>' +
      '<div class="privacy" style="margin-top:auto">' + ic("i-shield") + "<span>파일은 이 PC 브라우저 안에서만 읽고 서버로 보내지 않습니다. 성명·주민등록번호·연락처·주소 열은 읽지 않습니다.</span></div></div>");
  }
  function bind1() {
    var f = document.getElementById("file"), drop = document.getElementById("drop");
    function take(file) {
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { importMsg = { ok: false, text: "파일이 너무 큽니다(5MB까지)." }; render(); return; }
      importMsg = { busy: true, ok: true, text: "«" + esc(file.name) + "» 읽는 중… (이 기기 안에서만)" }; render();
      IM.readFile(file).then(function (rows) {
        var r = IM.importRows(rows, D.households);
        if (!r.ok) { importMsg = { ok: false, cols: r.cols, text: r.err === "cols" ? "가구를 가리키는 열을 찾지 못했습니다. «발굴대상자 조회» 엑셀(머리글에 «소재행정동»·«(행복이음)주소») 또는 «관리번호» 열이 있는 CSV인지 확인해 주세요." : r.err === "empty" ? "가구 줄이 없는 빈 서식입니다. 조회 결과가 담긴 파일을 불러와 주세요." : "명단의 가구를 지도에서 찾지 못했습니다(" + r.n + "줄). 시연에서는 «시연용 가상 명단»의 가상 주소만 지도에 놓입니다." }; render(); return; }
        var M = {}; r.ids.forEach(function (id) { M[id] = r.meta[id]; if (!M[id].ym) M[id].ym = ymd(new Date()).slice(0, 7); });
        lsSet(LS_META, M); lsSet(LS_IMPORT, { name: file.name, n: r.ids.length, at: Date.now() });
        var cur = { ym: r.ym || ymd(new Date()).slice(0, 7), ids: r.ids, ranks: {}, cnts: {}, name: file.name, at: new Date().toISOString() };
        r.ids.forEach(function (id) { cur.ranks[id] = M[id].prio; cur.cnts[id] = M[id].cnt; });
        F.store.set("rounds", F.rounds.remember(F.store.get("rounds", []), cur));
        importMsg = { ok: true, cols: r.cols, skipped: r.skipped, total: r.total, text: "<b>" + esc(file.name) + "</b> · " + r.ids.length + "가구를 불러왔습니다" + (r.miss ? " · 못 찾은 줄 " + r.miss : "") + (r.cut ? " · 30가구까지만" : "") + " · 서버 전송 0" };
        render();
      }, function () { importMsg = { ok: false, text: "파일을 읽지 못했습니다. " + (/\.xlsx?$/i.test(file.name) ? "엑셀 읽기 부품을 받지 못했을 수 있습니다 — CSV로 저장해 다시 불러와 주세요." : "CSV(쉼표 구분)인지 확인해 주세요.") }; render(); });
    }
    if (f) f.addEventListener("change", function () { take(f.files && f.files[0]); f.value = ""; });
    if (drop) {
      drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("over"); });
      drop.addEventListener("dragleave", function () { drop.classList.remove("over"); });
      drop.addEventListener("drop", function (e) { e.preventDefault(); drop.classList.remove("over"); take(e.dataTransfer.files && e.dataTransfer.files[0]); });
    }
  }

  // ═════ ② 전체 명단 · 기한 ═════
  function s2() {
    var ids = listIds(), m = meta(), dl = deadline(), dp = F.deadline.plan(ids.length, dl.until, dl.perDay || 5), RB = rankBy();
    var pair = F.rounds.latestPair(F.store.get("rounds", []) || []), cmp = pair ? F.rounds.compare(pair.prev, pair.cur, { attempts: attempts(), links: F.store.get("links", []), outcomes: F.store.get("outcomes", {}) }) : null;
    var tone = {}; if (cmp) { cmp.groups.new.forEach(function (x) { tone[x.id] = "new"; }); cmp.groups.stayed.forEach(function (x) { tone[x.id] = "stay"; }); }
    var areas = {}; ids.forEach(function (id) { var a = BY[id].area; areas[a] = (areas[a] || 0) + 1; });
    var areaLine = Object.keys(areas).sort(function (a, b) { return areas[b] - areas[a]; }).map(function (a) { return a + " " + areas[a]; }).join(" · ");
    var ribbon = dp.set ? '<div class="ribbon num" style="grid-template-columns:repeat(' + Math.min(dp.days.length, 10) + ',1fr)">' + dp.days.slice(0, 10).map(function (d) {
      var dt = new Date(d.date + "T00:00:00"), lab = W.charAt(dt.getDay()) + (d.kind === "today" ? " · 오늘" : d.kind === "go" ? " · " + d.day + "일차" : d.end ? " · 기한" : "");
      return '<div class="rb ' + (d.kind === "today" ? "today" : d.kind === "go" ? "go" : d.end ? "end" : "spare") + '"><b>' + dt.getDate() + "</b><span>" + lab + "</span></div>"; }).join("") + (dp.days.length > 10 ? "" : "") + "</div>" +
      '<div class="dl-say">' + (dp.over ? '<span class="warnline">' + ic("i-warn", "s") + esc(dp.line) + "</span>" : '<span>근무일 <b class="num">' + dp.left + '</b>일 남음</span><span>하루 <b class="num">' + dp.perDay + '</b>집 기준 <b class="num">' + dp.need + '</b>일 방문</span><span>여유 <b class="num">' + dp.spare + "</b>일(부재 다시 방문용)</span>") + "</div>"
      : '<div class="dl-empty"><span class="st-tag st-todo">기한 미정</span><span>기한을 정하면 하루 몇 집인지 알려 드립니다.</span></div>';
    var rows = ids.map(function (id) {
      var h = BY[id], mm = m[id] || {}, r = RB[id], g = r ? r.gap : h.daysSinceContact, gp = g == null ? 100 : Math.min(100, g / 900 * 100), cnt = +mm.cnt || 1, st = statusOf(id);
      var procTag = /처리\s*중/.test(mm.proc || "") ? '<span class="st-tag st-doing">처리 중</span>' : /완료/.test(mm.proc || "") ? '<span class="st-tag st-done">처리 완료</span>' : '<span class="st-tag st-todo">' + esc(mm.proc || "미처리") + "</span>";
      return "<tr><td><span class=\"rk num\">" + esc(mm.prio || "—") + '</span></td><td><div class="hh"><span style="display:flex;gap:8px;align-items:center"><span class="hid">' + id + "</span>" + (tone[id] === "new" ? '<span class="st-tag st-new">새로</span>' : tone[id] === "stay" ? '<span class="st-tag st-stay">계속</span>' : "") + (st !== "planned" ? TAG[st] : "") + "</span><small>" + esc(h.area) + "</small></div></td>" +
        '<td class="num">' + esc(ageLine(h)) + (h.disability ? '<br><small class="sub">장애 가구원</small>' : "") + "</td><td><span class=\"why-t\">" + indText(h).map(esc).join("<i></i>") + "</span></td>" +
        '<td><span class="gapbar num ' + (g == null || g >= 365 ? "hi" : "") + '"><span><i style="width:' + gp + '%"></i></span>' + (g == null ? "기록 없음" : g + "일") + "</span></td>" +
        '<td><span class="cnt" title="' + cnt + '회">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= cnt ? "on" : "") + '"></i>'; }).join("") + '</span> <span class="sub num">' + cnt + "회</span></td><td>" + procTag + (r && r.pend >= 56 ? ' <span class="st-tag st-late" title="지난 차수 기한을 넘김 · ③ 처리 기한 축">이월 ' + r.pend + "일</span>" : "") + "</td></tr>";
    }).join("");
    var c = cmp ? cmp.counts : null;
    return pc(2, "s2", '<div class="s2-head"><div class="deadline"><div class="dl-top"><div><div class="lab" style="color:var(--gam-ink)">확인 기한</div><p class="dl-q">언제까지 ' + ids.length + '가구를 다 볼까요?</p></div>' +
      '<div class="dl-date"><button data-act="dl" data-d="-1" aria-label="하루 앞으로">‹</button><label><strong>' + ic("i-cal") + (dl.until ? md(dl.until) : "기한 정하기") + '</strong><input type="date" id="dlInput" value="' + esc(dl.until || "") + '" aria-label="확인 기한"></label><button data-act="dl" data-d="1" aria-label="하루 뒤로">›</button></div></div>' + ribbon + "</div>" +
      '<div class="s2-side"><div><div class="lab">' + esc(roundYm()) + ' 발굴 명단</div><div class="bignum num" style="margin-top:10px">' + ids.length + '<small>가구</small></div><div class="sub" style="margin-top:6px">' + esc(areaLine) + "</div></div>" +
      (c ? '<div style="border-top:1px solid var(--line);padding-top:12px"><div class="lab">지난 차수(' + esc(cmp.prevYm) + ")와 견주면</div>" +
        '<div class="cmpbar"><i style="flex:' + (c.new || .001) + ';background:var(--river)"></i><i style="flex:' + (c.stayed || .001) + ';background:var(--warn)"></i><i style="flex:' + (c.dropped || .001) + ';background:repeating-linear-gradient(-45deg,#C4CDD1 0 3px,#E3E8EA 3px 6px)"></i></div>' +
        '<div class="cmp-leg num"><span><span class="dot" style="background:var(--river)"></span> 새로<b>' + c.new + '</b></span><span><span class="dot" style="background:var(--warn)"></span> 계속<b>' + c.stayed + '</b></span><span><span class="dot" style="background:#B5C0C5"></span> 빠짐<b>' + c.dropped + "</b></span></div>" +
        '<div class="sub" style="margin-top:6px">' + (c.dropped ? "빠진 " + c.dropped + "가구는 지난 차수 확인 기록으로 정리돼 있습니다" : "빠진 집 없음") + "</div></div>" : "") + "</div></div>" +
      '<div class="s2-list"><div class="tbl-wrap"><table class="list"><thead><tr><th>순위</th><th>가구</th><th>나이·가구</th><th>명단에 오른 이유</th><th>상담 공백</th><th>발굴</th><th>처리</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      '<div class="tbl-foot"><span class="sub">순위는 한국사회보장정보원 발굴 순위 그대로입니다. 다음 단계에서 현장 사정 4가지(오늘의 위험·만남 공백·닿지 않음·처리 기한)만큼 앞당깁니다.</span><a class="b b-main" href="#s3">우선순위 분석' + ic("i-next") + "</a></div></div>");
  }
  function bind2() {
    var inp = document.getElementById("dlInput");
    function setUntil(v) { var d = deadline(); lsSet(LS_DL, { until: v, perDay: d.perDay || 5 }); render(); }
    if (inp) inp.addEventListener("change", function () { if (inp.value) setUntil(inp.value); });
    app.querySelectorAll('[data-act="dl"]').forEach(function (b) {
      b.addEventListener("click", function () {
        var d = deadline(), base = d.until ? new Date(d.until + "T00:00:00") : U.addWorkdays(new Date(), 7), k = +b.dataset.d, x = new Date(base);
        do { x = new Date(x.getFullYear(), x.getMonth(), x.getDate() + k); } while (U.isOff(x));
        if (x <= U.startOfDay(new Date())) return; setUntil(ymd(x));
      });
    });
  }

  // ═════ ③ 우선순위 근거 ═════
  var sel3 = null, hl3 = null;
  function s3() {
    var w = weather();
    return pc(3, "s3", '<div class="l"><div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><div class="lab">한국사회보장정보원 순위 → 방문 순서</div><h2 class="h-scr" style="margin-top:8px">현장 사정만큼 앞당깁니다</h2></div>' +
      (w ? '<span class="chip gam">' + ic(/폭염/.test(w.name) ? "i-warn" : "i-snow", "s") + esc(w.name) + " 반영(시연 가상)</span>" : '<span class="chip">특보 없음 · 오늘의 위험 0</span>') + "</div>" +
      '<svg class="bump" id="bump" role="img" aria-label="한국사회보장정보원 순위와 방문 순서를 잇는 선"></svg>' +
      '<div class="s3-foot"><div class="axleg"><span class="ax-g"><i></i>오늘의 위험</span><span class="ax-n"><i></i>만남 공백</span><span class="ax-d"><i></i>닿지 않음</span><span class="ax-r"><i></i>처리 기한</span></div><a class="b b-main" href="#s4">일차별 방문 짜기' + ic("i-next") + '</a></div></div><div class="r" id="why3"></div>');
  }
  function bind3() {
    var R = rank(); if (!R.length) { document.getElementById("why3").innerHTML = emptyBox("명단을 먼저 불러와 주세요.", "#s1", "명단 불러오기"); return; }
    if (!sel3 || !R.some(function (r) { return r.id === sel3; })) sel3 = (R.filter(function (r) { return r.G >= 4; })[0] || R[0]).id;
    var per = deadline().perDay || 5;
    function bump() {
      var svg = document.getElementById("bump"), n = R.length, L = 124, Rx = 404, top = 34, step = 46, H = top + n * step + 6;
      svg.setAttribute("viewBox", "0 0 540 " + H);
      var s = "";
      for (var d = 0; d * per < n; d++) {
        var y0 = top - 8 + d * per * step + (d ? 4 : 0), hh = Math.min(per, n - d * per) * step - (d ? 4 : 0);
        s += '<rect x="' + (Rx - 22) + '" y="' + y0 + '" width="' + (540 - (Rx - 22)) + '" height="' + hh + '" rx="12" fill="' + (d % 2 ? "rgba(14,106,111,.06)" : "rgba(201,82,27,.06)") + '"/>' +
          '<text x="532" y="' + (y0 + 13) + '" text-anchor="end" font-family="IBM Plex Sans KR" font-size="11" font-weight="600" fill="' + (d % 2 ? COL.river : COL.gam) + '">' + (d + 1) + "일차</text>";
      }
      s += '<text x="' + (L + 11) + '" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="' + COL.ink3 + '" font-family="IBM Plex Sans KR">한국사회보장정보원 순위</text><text x="' + (Rx - 1) + '" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="' + COL.ink3 + '" font-family="IBM Plex Sans KR">방문 순서</text>';
      var order = R.slice().sort(function (a, b) { return a.listRank - b.listRank; }), lr = {}; order.forEach(function (r, i) { lr[r.id] = i + 1; });
      var lit = function (r) { return hl3 ? r.rows.indexOf(hl3) >= 0 : r.id === sel3; };
      order.forEach(function (r) {
        var y1 = top + (lr[r.id] - 1) * step + 14, y2 = top + (r.todayRank - 1) * step + 14, on = lit(r), up = r.todayRank < lr[r.id], dn = r.todayRank > lr[r.id];
        var col = on ? (hl3 ? AXC[hl3.charAt(0)] : COL.gam) : up ? "#E7B597" : dn ? "#B9C3C7" : "#D3DADD";
        s += '<path d="M' + (L + 26) + " " + y1 + " C " + (L + Rx) / 2 + " " + y1 + ", " + (L + Rx) / 2 + " " + y2 + ", " + (Rx - 16) + " " + y2 + '" fill="none" stroke="' + col + '" stroke-width="' + (on ? 4 : 2) + '" stroke-linecap="round" opacity="' + (hl3 && !on ? .55 : 1) + '"' + (on && !RM_ && !hl3 ? ' class="draw" style="--len:320"' : "") + "/>";
      });
      order.forEach(function (r) {
        var y1 = top + (lr[r.id] - 1) * step, y2 = top + (r.todayRank - 1) * step, on = r.id === sel3, l = lit(r), d = lr[r.id] - r.todayRank, cells = "", k = 0;
        P.AXES.forEach(function (a, ai) { for (var c = 0; c < a.max; c++) { cells += '<rect x="' + (Rx + 20 + k * 8.6 + ai * 3) + '" y="' + (y2 + 20) + '" width="7" height="5" rx="1.5" fill="' + (c < r.ax[a.k] ? AXC[a.k] : "#E3E9E7") + '"/>'; k++; } });
        s += '<g class="row" data-id="' + r.id + '" tabindex="0" role="button" aria-label="' + r.id + " 근거 보기 · 앞당김 " + r.G + '칸"><rect x="0" y="' + (y1 - 6) + '" width="' + (L + 30) + '" height="40" rx="10" fill="' + (on ? "rgba(201,82,27,.07)" : "transparent") + '"/>' +
          '<text x="' + (L - 14) + '" y="' + (y1 + 12) + '" text-anchor="end" font-family="IBM Plex Mono" font-weight="600" font-size="13.5" fill="' + (on ? COL.ink : "#33424A") + '">' + r.id + "</text>" +
          '<text x="' + (L - 14) + '" y="' + (y1 + 28) + '" text-anchor="end" font-family="IBM Plex Sans KR" font-size="11.5" fill="' + COL.ink3 + '">' + esc(r.h.area) + " · " + (r.h.members && r.h.members[0] ? r.h.members[0].age + "세" : "") + "</text>" +
          '<rect x="' + (L - 2) + '" y="' + (y1 + 1) + '" width="26" height="26" rx="8" fill="' + (on ? "#fff" : "#F3F6F5") + '" stroke="' + (on ? COL.gam : COL.line) + '" stroke-width="' + (on ? 2 : 1) + '"/><text x="' + (L + 11) + '" y="' + (y1 + 18.5) + '" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="12.5" fill="' + COL.ink + '">' + (r.listRank <= n ? r.listRank : "—") + "</text>" +
          '<rect x="' + (Rx - 14) + '" y="' + (y2 + 1) + '" width="26" height="26" rx="8" fill="' + (on ? COL.gam : l && hl3 ? AXC[hl3.charAt(0)] : "#fff") + '" stroke="' + (on ? COL.gam : COL.line) + '"/><text x="' + (Rx - 1) + '" y="' + (y2 + 18.5) + '" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="12.5" fill="' + (on || (l && hl3) ? "#fff" : COL.ink) + '">' + r.todayRank + "</text>" +
          '<text x="' + (Rx + 20) + '" y="' + (y2 + 13) + '" font-family="IBM Plex Sans KR" font-size="11.5" fill="' + (d > 0 ? COL.gam : COL.ink3) + '" font-weight="' + (d ? 600 : 400) + '">' + (d > 0 ? "▲ " + d + "칸" : d < 0 ? "▼ " + (-d) + "칸" : "그대로") + "</text>" + cells + "</g>";
      });
      svg.innerHTML = s;
      svg.querySelectorAll(".row").forEach(function (g) { var f = function () { sel3 = g.dataset.id; hl3 = null; bump(); why(); }; g.addEventListener("click", f); g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }); });
    }
    function why() {
      var r = R.filter(function (x) { return x.id === sel3; })[0], d = r.listRank - r.todayRank, h = r.h;
      var meter = P.AXES.map(function (a) { var c = ""; for (var k = 0; k < a.max; k++) c += '<i class="' + (k < r.ax[a.k] ? "on" : "") + '" style="--i:' + k + '"></i>'; return '<div class="mg ax-' + a.k + " " + (r.ax[a.k] ? "has" : "") + '"><div class="cells">' + c + "</div><small>" + a.name + " " + r.ax[a.k] + "/" + a.max + "</small></div>"; }).join("");
      var crit = P.AXES.map(function (a) {
        return '<div class="ax ax-' + a.k + '"><div class="ax-l" title="판정 데이터 · ' + esc(a.data) + '"><b>' + a.name + "</b><span>최대 " + a.max + "칸</span></div><div>" +
          P.ROWS.filter(function (x) { return x.ax === a.k; }).map(function (x) { return '<div class="cr ' + (r.rows.indexOf(x.id) >= 0 ? "hit" : "") + '" data-row="' + x.id + '" tabindex="0"><span class="mk"></span><div><span>' + esc(x.text) + "</span><small>" + esc(x.why) + "</small></div><b>+" + x.pts + "</b></div>"; }).join("") + "</div></div>";
      }).join("");
      var wx = weather();
      document.getElementById("why3").innerHTML = '<div class="pick"><div class="pick-h"><div><b>가구 ' + r.id + '</b><span class="sub">' + esc(h.area) + " · " + esc(ageLine(h)) + (h.disability ? " · 장애 가구원" : "") + "</span></div>" +
        '<div class="mv"><span>발굴 순위<b class="num">' + (r.listRank <= R.length ? r.listRank : "—") + "</b></span>" + ic("i-next", "s") + '<span class="to">방문 순서<b class="num">' + r.todayRank + '</b></span><em class="' + (d ? "" : "same") + '">' + (d > 0 ? d + "칸 앞당김" : d < 0 ? (-d) + "칸 밀림" : "자리 그대로") + "</em></div></div>" +
        '<div class="meter-h"><span class="lab">앞당김 칸</span><span><b class="num">' + r.G + '</b><span class="sub"> / 7칸</span></span></div><div class="meter">' + meter + "</div></div>" +
        '<div class="crit' + (wx ? "" : " nowx") + '"><div class="crit-h"><b>앞당김 기준표</b><span class="sub">혼자 사는 고령 = 75세 이상 1인 또는 고독사 우선방문 Y · 시연용 잠정값</span></div>' + crit +
        '<div class="crit-no"><b>더하지 않음</b><span>위기정보 종류·개수, 나이·고독사 표시 자체, 발굴 횟수 — 한국사회보장정보원 순위에 이미 들어갔을 수 있어 다시 더하지 않습니다. 감점은 없습니다.</span></div></div>' +
        '<div class="formula">방문 순서 = <code>발굴 순위 − 앞당김 칸</code>이 작은 집부터(이 집 ' + r.listRank + " − " + r.G + " = " + r.K + "). 같으면 ① 오늘의 위험이 큰 집 ② 발굴 순위가 앞선 집. " + (d < 0 ? "▼는 다른 집이 앞당겨져 생긴 자리 이동이지 감점이 아닙니다." : r.G && !d ? "앞당김이 있어도 앞집들도 함께 당겨져 자리는 그대로입니다." : "") +
        (R.excluded && R.excluded.length ? "<br>순서 밖: " + R.excluded.map(function (x) { return x.id + "(" + x.why + ")"; }).join(" · ") : "") + "</div>";
      document.querySelectorAll("#why3 .cr").forEach(function (c) {
        var on = function () { hl3 = c.dataset.row; bump(); }, off = function () { hl3 = null; bump(); };
        c.addEventListener("mouseenter", on); c.addEventListener("mouseleave", off); c.addEventListener("focus", on); c.addEventListener("blur", off);
        c.addEventListener("click", function () { var m = R.filter(function (x) { return x.rows.indexOf(c.dataset.row) >= 0; }).map(function (x) { return x.id; }); if (m.length) { sel3 = m.indexOf(sel3) >= 0 ? m[(m.indexOf(sel3) + 1) % m.length] : m[0]; hl3 = null; bump(); why(); } });
      });
    }
    bump(); why();
  }
  function emptyBox(t, href, btn) { return '<div class="emptybox"><p>' + esc(t) + "</p>" + (href ? '<a class="b b-sub b-sm" href="' + href + '">' + esc(btn) + "</a>" : "") + "</div>"; }

  // ═════ 지도(SVG 대체 — 네이버 지도를 못 불러올 때) · 상주 북부 · 시청 (0,0) 기준 km ═════
  var BOUND = [[-27, 10], [-25, 19], [-17, 24], [-8, 23.5], [0, 25], [7, 23.5], [11, 19], [14, 12], [17, 5], [18, -3], [15, -10], [10, -18], [3, -22], [-6, -22], [-14, -20], [-22, -17], [-28, -9], [-30, 1]];
  var RIVER = [[11.5, 27], [9.6, 21], [8.2, 16], [8.8, 11], [10.4, 6], [9.6, 1], [10.8, -4], [13.4, -10], [11.6, -17], [12.6, -24]];
  var IAN = [[-14, 21], [-8, 18.6], [-3, 16.4], [2, 15], [5.5, 14.8], [8.3, 14.6]], BYS = [[-7, -2], [-3, 0], [1, 1.4], [5, 2.8], [9.7, 3.4]];
  var RD3 = [[1.5, 28], [1.6, 21], [2.3, 15], [1.8, 10], [0.8, 4], [0, 0], [-1.6, -7], [-3.4, -15], [-5.5, -24]], EXP = [[4.6, 28], [4.4, 20], [4.0, 13], [3.3, 6], [1.8, -1], [0.6, -9], [-0.6, -24]];
  var RD_W = [[0, 0], [-6, 1.2], [-11, 1], [-16, -1]], RD_IAN = [[1.8, 16.6], [-1.5, 17.6], [-4.8, 17.8], [-10, 17]], RD_SB = [[0.8, 4], [3.5, 6.2], [6, 6.8], [9, 7.5]];
  var AREAS = [["함창읍", 2.6, 19.6], ["사벌국면", 6.6, 8.4], ["공검면", -0.6, 11], ["이안면", -6, 20.2], ["은척면", -10, 17], ["외서면", -10, 10], ["중동면", 13, 2], ["시내", -1.6, -1.8]];
  var RLAB = [["국도 3호선", RD3, 2.4], ["중부내륙고속도로", EXP, 1.9], ["이안천", IAN, 2.6]];
  var HILLS = [[-8, 11, 5.5, 1], [-13, 21, 6, 2], [7.5, 22, 3, 3], [-4, 4, 4, 4], [13.5, 9, 3.5, 5]];
  function smooth(p, closed) {
    var n = p.length, d = "M" + p[0][0].toFixed(1) + " " + p[0][1].toFixed(1), g = function (i) { return closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]; };
    for (var i = 0; i < (closed ? n : n - 1); i++) { var p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2); d += " C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + " " + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + " " + p2[0].toFixed(1) + " " + p2[1].toFixed(1); }
    return d + (closed ? "Z" : "");
  }
  /** o = {w,h,id, days:[{ids,c,w,op,dash,draw,labels}], done:[id], next:id, me:[x,y]|null} — 범위는 가구 좌표에 맞춰 잡는다 */
  function mapSVG(o) {
    var w = o.w, h = o.h, id = o.id, pts = [[0, 0]];
    (o.days || []).forEach(function (dy) { dy.ids.forEach(function (x) { pts.push([BY[x].x, BY[x].y]); }); });
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var b = [Math.min.apply(null, xs) - 2.5, Math.min.apply(null, ys) - 1.5, Math.max.apply(null, xs) + 2.5, Math.max.apply(null, ys) + 2.5];
    var pt = o.padTop || 0, pb = o.padBottom || 0, ah = h - pt - pb;
    var s = Math.min(w / (b[2] - b[0]), ah / (b[3] - b[1])), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, C0 = [w / 2, pt + ah / 2];
    var Pp = function (x, y) { return [C0[0] + (x - cx) * s, C0[1] - (y - cy) * s]; }, PP = function (a) { return a.map(function (q) { return Pp(q[0], q[1]); }); };
    var svg = '<defs><linearGradient id="' + id + 'l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2F6F0"/><stop offset="1" stop-color="#E7EEE5"/></linearGradient><radialGradient id="' + id + 'h"><stop offset="0" stop-color="#CBDAC4" stop-opacity=".95"/><stop offset="1" stop-color="#CBDAC4" stop-opacity="0"/></radialGradient><filter id="' + id + 's" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="2.6" flood-color="#0E2E30" flood-opacity=".35"/></filter><pattern id="' + id + 'g" width="' + s * 2 + '" height="' + s * 2 + '" patternUnits="userSpaceOnUse"><path d="M' + s * 2 + " 0H0V" + s * 2 + '" fill="none" stroke="rgba(19,32,41,.035)"/></pattern></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="#DCE5E3"/><path d="' + smooth(PP(BOUND), true) + '" fill="url(#' + id + 'l)"/><rect width="' + w + '" height="' + h + '" fill="url(#' + id + 'g)"/><path d="' + smooth(PP(BOUND), true) + '" fill="none" stroke="rgba(14,106,111,.38)" stroke-width="1.4" stroke-dasharray="7 3 2 3"/>';
    HILLS.forEach(function (hl) { var c = Pp(hl[0], hl[1]); svg += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + hl[2] * s * 1.1 + '" fill="url(#' + id + 'h)"/>'; });
    var line = function (p, st, wd, ex) { return '<path d="' + smooth(PP(p)) + '" fill="none" stroke="' + st + '" stroke-width="' + wd + '" stroke-linecap="round" stroke-linejoin="round" ' + (ex || "") + "/>"; };
    var tw = Math.min(6, Math.max(3, s * .2));
    svg += line(IAN, "#A9D2CE", tw) + line(BYS, "#A9D2CE", tw) + line(RIVER, "#8FC5C0", Math.min(15, Math.max(8, s * .55))) + line(RIVER, "#B8DDD8", Math.min(8, Math.max(4, s * .28)));
    [RD_W, RD_IAN, RD_SB].forEach(function (r) { svg += line(r, "#CDD5D1", 5) + line(r, "#fff", 3.2); });
    svg += line(RD3, "#C7CFCB", 7) + line(RD3, "#fff", 5) + line(EXP, "#D2AE7E", 7) + line(EXP, "#F7E4C1", 4.5);
    RLAB.forEach(function (rl) { var i = Math.floor(rl[2]), a = Pp.apply(null, rl[1][i]), c = Pp.apply(null, rl[1][i + 1]), ang = Math.atan2(c[1] - a[1], c[0] - a[0]) * 180 / Math.PI, ad = ang > 90 || ang < -90 ? ang + 180 : ang, mx = a[0] + (c[0] - a[0]) * (rl[2] - i), my = a[1] + (c[1] - a[1]) * (rl[2] - i);
      if (mx < 10 || mx > w - 10 || my < 40 || my > h - 10) return; svg += '<text x="' + mx + '" y="' + (my - 6) + '" text-anchor="middle" font-family="IBM Plex Sans KR" font-size="10" font-weight="600" fill="' + (rl[0] === "이안천" ? "#3E8A86" : "#7B6A4E") + '" transform="rotate(' + ad.toFixed(1) + " " + mx + " " + my + ')" paint-order="stroke" stroke="rgba(242,246,240,.9)" stroke-width="3">' + rl[0] + "</text>"; });
    AREAS.forEach(function (ar) { var c = Pp(ar[1], ar[2]); if (c[0] < 20 || c[0] > w - 20 || c[1] < 40 || c[1] > h - 10) return; svg += '<text x="' + c[0] + '" y="' + c[1] + '" text-anchor="middle" font-family="IBM Plex Sans KR" font-size="' + Math.max(11, Math.min(13.5, s * .85)) + '" font-weight="700" fill="rgba(19,32,41,.40)" letter-spacing=".18em" paint-order="stroke" stroke="rgba(241,245,239,.92)" stroke-width="4">' + ar[0] + "</text>"; });
    var oc = Pp(0, 0); svg += '<g transform="translate(' + oc[0] + " " + Math.min(oc[1], h - 16) + ')" filter="url(#' + id + 's)"><rect x="-30" y="-12" width="60" height="23" rx="7" fill="#132029"/><text y="3.8" text-anchor="middle" font-family="IBM Plex Sans KR" font-size="11" font-weight="600" fill="#fff">상주시청</text></g>';
    (o.days || []).forEach(function (dy) {
      var Q = PP([[0, 0]].concat(dy.ids.map(function (x) { return [BY[x].x, BY[x].y]; }))), d = "M" + Q[0][0].toFixed(1) + " " + Q[0][1].toFixed(1);
      for (var i = 1; i < Q.length; i++) { var a = Q[i - 1], c = Q[i], mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2, dx = c[0] - a[0], dy2 = c[1] - a[1]; d += " Q" + (mx - dy2 * .16).toFixed(1) + " " + (my + dx * .16).toFixed(1) + " " + c[0].toFixed(1) + " " + c[1].toFixed(1); }
      svg += '<path d="' + d + '" fill="none" stroke="#fff" stroke-width="' + (dy.w + 4) + '" stroke-linecap="round" stroke-linejoin="round" opacity="' + dy.op + '"/><path d="' + d + '" fill="none" stroke="' + dy.c + '" stroke-width="' + dy.w + '" stroke-linecap="round" stroke-linejoin="round" opacity="' + dy.op + '" ' + (dy.dash ? 'stroke-dasharray="1 8"' : "") + " " + (!RM_ && dy.draw ? 'class="draw" style="--len:2400"' : "") + "/>";
      dy.ids.forEach(function (x, i) {
        var c = Pp(BY[x].x, BY[x].y), isDone = (o.done || []).indexOf(x) >= 0, isNext = o.next === x;
        if (dy.op < 1) { svg += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="5" fill="#fff" stroke="' + dy.c + '" stroke-width="2.4" opacity=".8"/>'; return; }
        var fill = isNext ? COL.gam : isDone ? "#DDEFEE" : dy.c, tc = isDone ? COL.river : "#fff";
        svg += '<g transform="translate(' + c[0].toFixed(1) + " " + c[1].toFixed(1) + ')">' + (isNext ? '<circle r="16" fill="' + COL.gam + '" class="pulse"/>' : "") + '<ellipse cx="0" cy="1" rx="5" ry="2" fill="rgba(19,32,41,.25)"/><g filter="url(#' + id + 's)"><path d="M0 14 -6.5 6A12.5 12.5 0 1 1 6.5 6Z" fill="' + fill + '" stroke="#fff" stroke-width="2" transform="translate(0 -14)"/></g><text y="-9.5" text-anchor="middle" font-family="IBM Plex Mono" font-weight="700" font-size="12" fill="' + tc + '">' + (isDone ? "✓" : i + 1) + "</text>" +
          (dy.labels ? '<g transform="translate(14 -20)"><rect width="' + (x.length * 7 + 12) + '" height="19" rx="6" fill="rgba(255,255,255,.94)" stroke="rgba(19,32,41,.12)"/><text x="6" y="13" font-family="IBM Plex Mono" font-weight="600" font-size="11" fill="#132029">' + x + "</text></g>" : "") + "</g>";
      });
    });
    var km5 = 5 * s, sy = h - pb - 20; svg += '<g transform="translate(16 ' + sy + ')"><rect x="-6" y="-18" width="' + (km5 + 40) + '" height="26" rx="7" fill="rgba(255,255,255,.82)"/><path d="M0 0h' + km5 + "M0 -5v5M" + km5 / 2 + " -3v3M" + km5 + ' -5v5" stroke="#132029" stroke-width="1.5" fill="none"/><text x="' + (km5 + 6) + '" y="1" font-family="IBM Plex Mono" font-size="10.5" font-weight="600" fill="#132029">5km</text></g>';
    svg += '<g transform="translate(' + (w - 30) + " " + (pt + 30) + ')"><circle r="14" fill="rgba(255,255,255,.85)" stroke="rgba(19,32,41,.12)"/><path d="M0 -9 4 3 0 0.5 -4 3Z" fill="' + COL.gam + '"/><path d="M0 9 4 3 0 0.5 -4 3Z" fill="#9AA7AD"/><text y="-17" text-anchor="middle" font-family="IBM Plex Sans KR" font-size="9" font-weight="700" fill="#132029">북</text></g>';
    return svg;
  }
  /** 지도 칸: 네이버 지도를 먼저, 못 부르면 SVG 그림(직선 근사) */
  function drawMap(box, o, naverStops) {
    var r = box.getBoundingClientRect(), w = Math.max(280, Math.round(r.width)), h = Math.max(260, Math.round(r.height));
    box.innerHTML = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="방문 동선 지도(그림)">' + mapSVG(Object.assign({ w: w, h: h }, o)) + "</svg>";
    if (!RM || !naverStops || !naverStops.stops.length) return;
    RM.load().then(function () {
      if (!document.body.contains(box)) return;
      var nbox = document.createElement("div"); nbox.className = "nmap"; box.appendChild(nbox);
      var off = RP.toLatLng(OFFICE);
      var ok = RM.draw({ box: nbox, office: { lat: off.lat, lng: off.lng, name: "상주시청", short: "시청" }, stops: naverStops.stops, path: naverStops.path || null, ret: true, color: COL.gam });
      if (!ok) { nbox.remove(); return; }
      // 바둑판 조각(타일)이 실제로 그려진 뒤에만 그림 지도를 가린다 — 못 그리면 그림 지도가 그대로 보임
      nbox.style.opacity = "0";
      var shown = function () { nbox.style.opacity = "1"; box.classList.add("has-naver"); };
      try { naver.maps.Event.once(RM.state.map, "tilesloaded", shown); } catch (e) { /* 이벤트 없음 */ }
    }, function () { /* 그림 지도 그대로 */ });
  }
  function navStops(ids, path) { return { stops: ids.map(function (id, i) { var p = RP.toLatLng(BY[id]); return { lat: p.lat, lng: p.lng, no: i + 1, label: "방문 " + (i + 1) }; }), path: path }; }

  // ═════ ④ 일차별 방문 ═════
  var day4 = null;
  function s4() {
    var ds = days(), dl = deadline(), p = plan(); if (!ds.length) return pc(4, "s4", '<div class="l">' + emptyBox("명단을 먼저 불러와 주세요.", "#s1", "명단 불러오기") + "</div>");
    if (!day4 || !ds.some(function (d) { return d.n === day4; })) { var fd = fieldDay(ds); day4 = fd ? fd.n : 1; }
    var D4 = ds.filter(function (d) { return d.n === day4; })[0], RB = rankBy(), att = attempts(), col = day4 % 2 ? COL.gam : COL.river;
    var title = ds.length === 1 ? "하루면 다 봅니다" : ds.length === 2 ? "이틀이면 다 봅니다" : ds.length + "일이면 다 봅니다";
    var cards = ds.map(function (d) { return '<button class="dc ' + (d.n === day4 ? "on" : "") + " " + (d.n % 2 ? "" : "d2") + '" data-day="' + d.n + '"><span class="t"><i style="background:' + (d.n % 2 ? COL.gam : COL.river) + '"></i>' + d.n + '일차</span><span class="d">' + (d.date ? mdS(d.date) : "날짜 미정") + '</span><span class="m num"><span><b>' + d.ids.length + "</b>집</span><span><b>" + d.s.km + "</b>km" + (d.s.road ? "" : " 약") + "</span><span>이동 <b>" + d.s.travelMin + "</b>분</span><span><b>" + d.s.end + "</b> 끝</span></span></button>"; }).join("");
    var ow = RP.overWork(D4.s), tl = '<div class="tl-row" style="--dc:' + col + '"><div class="tl-t"><b>09:30</b><small>출발</small></div><div class="tl-ax"><b class="o">시</b></div><div style="padding-top:10px;font-weight:600">상주시청 맞춤형복지팀</div></div>';
    D4.ids.forEach(function (id, i) {
      var row = D4.s.rows[i], h = BY[id], r = RB[id], vt = F.visitTime.profile(att, id, { neighborLog: neighborLog() }), st = statusOf(id);
      var pm = vt.best && /late|eve/.test(vt.best.k) && vt.absences.length;
      if (row.lunchBefore) tl += '<div class="tl-row" style="--dc:' + col + '"><div></div><div class="tl-ax"></div><div class="tl-lunch">' + ic("i-cup", "s") + "12:00–13:00 점심</div></div>";
      tl += '<div class="tl-row" style="--dc:' + col + '"><div></div><div class="tl-ax"></div><div class="tl-leg num">' + ic("i-car") + row.travelMin + "분 · " + row.km + "km" + (row.approx ? " 약" : "") + "</div></div>" +
        '<div class="tl-row" style="--dc:' + col + '" draggable="true" data-i="' + i + '"><div class="tl-t num"><b>' + row.arrive + "</b><small>~" + row.leave + '</small></div><div class="tl-ax"><b>' + (i + 1) + "</b></div>" +
        '<div class="tl-card"><div class="nm"><span class="hid">' + id + '</span><span class="sub">' + esc(h.area) + " · " + (h.members[0] ? h.members[0].age + "세" : "") + "</span>" + (st !== "planned" ? TAG[st] : "") + "</div>" +
        (pm ? '<span class="chip gam">' + ic("i-clock", "s") + esc(vt.absences.length && vt.absences[0].label) + " 부재 " + vt.absences.length + "번 → " + esc(vt.best.label) + "로</span>" : '<span class="sub">' + esc(indText(h)[0] || "") + "</span>") +
        '<div class="ds">' + pips(r) + " " + (r ? r.parts.map(function (q) { return q.label; }).slice(0, 2).map(esc).join(" · ") : "") + "</div></div></div>";
    });
    tl += '<div class="tl-row" style="--dc:' + col + '"><div class="tl-t num"><b>' + (D4.s.back ? D4.s.back.arrive : D4.s.end) + '</b><small>복귀</small></div><div class="tl-ax"><b class="o">시</b></div><div style="padding-top:10px" class="sub">상주시청 · 이동 ' + D4.s.travelMin + "분 · 상담 " + D4.s.consultMin + "분</div></div>";
    var sync = SY.state();
    return pc(4, "s4", '<div class="l"><div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><div class="lab">' + (dl.until ? "기한 " + md(dl.until) + "까지" : "기한 미정 · ② 에서 정하기") + '</div><h2 class="h-scr" style="margin-top:8px">' + title + '</h2></div><span class="sub">하루 ' + (dl.perDay || 5) + "집 · 상담 30분 · 점심 12~13시</span></div>" +
      '<div class="daycards">' + cards + "</div>" + (ow.over ? '<p class="warnline">' + ic("i-warn", "s") + esc(ow.why.join(" · ")) + " — 한 집을 다음 일차로 미뤄 보세요.</p>" : "") +
      '<div class="tl" id="tl4">' + tl + "</div>" +
      '<div class="l-foot"><span class="sub">순서는 끌어서 바꿀 수 있습니다 · 이동 시간은 ' + (D4.s.road ? "도로 경로 기준" : "직선 거리 근사(«약»)") + '</span><button class="b b-sub b-sm" data-act="print">' + ic("i-print", "s") + "일정표 인쇄</button></div></div>" +
      '<div class="r"><div class="mapbox" id="map4"></div><div class="maptag">' + ds.slice(0, 3).map(function (d) { return '<span class="glass-chip"><span class="dot" style="background:' + (d.n % 2 ? COL.gam : COL.river) + '"></span>' + d.n + "일차</span>"; }).join("") + "</div>" +
      '<div class="mapctl"><div><div class="lab">' + ds.map(function (d) { return d.n; }).join("·") + "일차 " + ds.reduce(function (a, d) { return a + d.ids.length; }, 0) + '가구</div><div style="font:700 15px/1.35 var(--f-display);margin-top:5px">' + (p ? (sync.mode === "live" ? "확정됨 · 같은 계정 폰에 나타나 있습니다" : "확정됨 · 로그인하면 같은 계정 폰에도 나타납니다") : "확정하면 내 폰에 바로 나타납니다") + "</div>" +
      '<div style="margin-top:4px">' + syncChip(false) + "</div></div>" + (p ? '<a class="b b-sub" href="#s5">' + ic("i-phone") + "현장 화면</a>" : '<button class="b b-main" data-act="confirm">' + ic("i-check") + "방문 계획 확정</button>") + "</div></div>");
  }
  function bind4() {
    var ds = days(), D4 = ds.filter(function (d) { return d.n === day4; })[0]; if (!D4) return;
    app.querySelectorAll(".dc").forEach(function (b) { b.addEventListener("click", function () { day4 = +b.dataset.day; render(); }); });
    var others = ds.filter(function (d) { return d.n !== day4; });
    var box = document.getElementById("map4");
    var mapO = { id: "m4", days: others.map(function (d) { return { ids: d.ids, c: d.n % 2 ? COL.gam : COL.river, w: 3, op: .55, dash: true }; }).concat([{ ids: D4.ids, c: day4 % 2 ? COL.gam : COL.river, w: 5, op: 1, draw: true, labels: true }]), padTop: 50, padBottom: 96 };
    drawMap(box, mapO, navStops(D4.ids, D4.s.path));
    // 도로 경로(서버) — 캐시가 없을 때 한 번만
    if (RM && !D4.s.road && D4.ids.length && D4.ids.length <= RP.MAX_ROAD_STOPS && !roadAsked[D4.s.key]) {
      roadAsked[D4.s.key] = 1; var off = RP.toLatLng(OFFICE), pts = [[off.lng, off.lat]].concat(D4.ids.map(function (id) { var q = RP.toLatLng(BY[id]); return [q.lng, q.lat]; })).concat([[off.lng, off.lat]]);
      RM.road(D4.s.key, pts).then(function () { if (cur === 4) render(); }, function () { /* 직선 근사 유지 */ });
    }
    // 끌어서 순서 바꾸기(같은 일차 안)
    var from = null;
    app.querySelectorAll('#tl4 [draggable="true"]').forEach(function (el) {
      el.addEventListener("dragstart", function (e) { from = +el.dataset.i; e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", String(from)); } catch (x) { /* 무시 */ } });
      el.addEventListener("dragover", function (e) { e.preventDefault(); });
      el.addEventListener("drop", function (e) { e.preventDefault(); var to = +el.dataset.i; if (from == null || from === to) return; reorder(D4, RP.move(D4.ids, from, to)); });
    });
    var pr = app.querySelector('[data-act="print"]'); if (pr) pr.addEventListener("click", function () { document.body.classList.add("print-day"); window.print(); setTimeout(function () { document.body.classList.remove("print-day"); }, 500); });
    var cf = app.querySelector('[data-act="confirm"]'); if (cf) cf.addEventListener("click", function () { vib(); confirmPlan(ds); });
  }
  var roadAsked = {};
  function reorder(D4, ids) {
    var p = plan();
    if (p) { var others = p.rows.filter(function (r) { return r.day !== D4.n; }), base = D4.rows; var s = sched(ids, "09:30");
      p.rows = others.concat(ids.map(function (id, i) { var o = base.filter(function (r) { return r.household_no === id; })[0]; return Object.assign({}, o, { seq: i + 1, planned_at: at(D4.date, s.rows[i].arrive) }); })).sort(function (a, b) { return a.day - b.day || a.seq - b.seq; });
      SY.savePlan(p);
    } else { var ord = lsGet("daeum.officer.dayOrder", {}) || {}; ord[D4.n] = ids; lsSet("daeum.officer.dayOrder", ord); }
    render();
  }
  function at(date, hhmm) { var d = new Date((date || ymd(new Date())) + "T00:00:00"), m = /^(\d+):(\d+)$/.exec(hhmm || "09:30"); d.setHours(+m[1], +m[2], 0, 0); return d.toISOString(); }
  function confirmPlan(ds) {
    var R = rankBy(), dl = deadline(), rows = [];
    ds.forEach(function (d) { d.ids.forEach(function (id, i) { rows.push({ day: d.n, seq: i + 1, household_no: id, planned_at: at(d.date, d.s.rows[i].arrive), status: statusOf(id) === "planned" ? "planned" : statusOf(id), list_rank: R[id] ? R[id].listRank : null, visit_rank: R[id] ? R[id].todayRank : null }); }); });
    SY.savePlan({ round_ym: roundYm(), ranked_at: new Date().toISOString(), until: dl.until, per_day: dl.perDay || 5, rows: rows });
    toast("방문 계획을 확정했습니다 · " + (SY.state().mode === "live" ? "같은 계정 폰에 바로 나타납니다" : "로그인하면 폰과 연동됩니다"));
    render();
  }

  // ═════ 폰 공통 ═════
  function fieldCtx(hidWanted) {
    var ds = days(), fd = fieldDay(ds); if (!fd) return null;
    var idx = 0, hid = hidWanted && fd.ids.indexOf(hidWanted) >= 0 ? hidWanted : null;
    if (!hid && hidWanted) { var other = ds.filter(function (d) { return d.ids.indexOf(hidWanted) >= 0; })[0]; if (other) { fd = other; hid = hidWanted; } }
    if (!hid) hid = fd.ids.filter(function (id) { return statusOf(id) === "planned"; })[0] || fd.ids[fd.ids.length - 1];
    idx = fd.ids.indexOf(hid);
    return { ds: ds, d: fd, hid: hid, i: idx, row: fd.s.rows[idx], done: fd.ids.filter(function (id) { return statusOf(id) !== "planned"; }) };
  }
  function phHead(c, extra) {
    return '<div class="ph-h"><div class="row"><span class="meta">' + c.d.n + "일차 · " + c.d.ids.length + "집 중 " + (c.i + 1) + "번째 " + syncChip(true) + '</span><div class="prog">' + c.d.ids.map(function (id) { return '<i class="' + (id === c.hid ? "c" : statusOf(id) !== "planned" ? "d" : "") + '"></i>'; }).join("") + "</div></div>" + (extra || "") + "</div>";
  }
  function phMenu() { return '<nav class="ph-menu" aria-label="다른 화면"><a href="#s2">' + ic("i-list", "s") + '명단</a><a href="#s4">' + ic("i-route", "s") + '계획</a><a href="#s8">' + ic("i-doc", "s") + '보고</a><a href="#s9">' + ic("i-calc", "s") + "사후관리</a></nav>"; }
  function typesFor(h) {
    var t = [], I = h.indicators || {};
    if (I.medical_overspend || h.disability) t.push("건강");
    if (I.rent_arrears || I.mgmt_fee_arrears || I.gas_cut || I.power_cut || I.water_cut) t.push("주거");
    if (I.telecom_arrears || I.loan_overdue || I.job_loss || I.health_ins_arrears || I.benefit_stopped) t.push("생계");
    if (h.single && h.members[0] && h.members[0].age >= 65) t.push("고립");
    return t.filter(function (x, i) { return t.indexOf(x) === i; }).slice(0, 2);
  }

  // ═════ ⑤ 집 앞 30초 요약 ═════
  var moreQ = false;
  function s5(hid) {
    var c = fieldCtx(hid); if (!c) return phEmpty();
    var h = BY[c.hid], r = rankBy()[c.hid], m = meta()[c.hid] || {}, att = attempts(), now = new Date();
    var card = F.homeCard.build(c.hid, { household: h, attempts: att, records: lsGet("daeum.officer.records", []), notes: F.store.get("homeNotes", {}), promises: F.store.get("promises", []), tips: neighborLog(), neighborLog: neighborLog(), now: now });
    var vt = F.visitTime.profile(att, c.hid, { tips: neighborLog(), neighborLog: neighborLog() });
    var eta = c.row ? c.row.arrive : "", w = weather();
    var slip = ['<div class="sl">' + ic("i-file") + "<div>명단에 오른 이유 <b>" + esc(indText(h).join(" · ") || "위기정보") + "</b><small>" + esc([h.disability ? "장애가 있는 가구원" : "", m.lonely ? "한국사회보장정보원 고독사 우선방문 대상" : "", m.aiRes ? "AI 초기상담 " + m.aiRes : ""].filter(Boolean).join(" · ") || "발굴 " + (m.prio || "—") + "순위") + "</small></div></div>"];
    if (vt.absences.length) { var lastAbs = att.filter(function (t) { return t.householdId === c.hid && /no_answer|absent/.test(t.result); }).sort(function (a, b) { return a.at < b.at ? 1 : -1; })[0], tip = neighborLog().filter(function (x) { return x.householdId === c.hid; }).pop();
      slip.push('<div class="sl">' + ic("i-clock") + "<div>" + esc(vt.absences.map(function (a) { return a.label; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join("·")) + "에 " + vt.absences.length + "번 비어 있었습니다<small>" + esc([lastAbs ? md(lastAbs.at) + (lastAbs.note ? " " + clip(lastAbs.note, 24) : "") : "", tip ? "이웃: «" + clip(tip.text.replace(/^[^:]+:\s*/, ""), 26) + "»" : ""].filter(Boolean).join(" · ")) + "</small></div></div>"); }
    else if (card.lastVisit) slip.push('<div class="sl">' + ic("i-clock") + "<div>" + esc(card.lines[0]) + (card.lastVisit.point ? "<small>요점: " + esc(card.lastVisit.point) + "</small>" : "") + "</div></div>");
    else slip.push('<div class="sl">' + ic("i-home") + "<div>처음 찾아가는 집입니다<small>상담 공백 " + (r && r.gap != null ? r.gap + "일" : "기록 없음") + "</small></div></div>");
    if (w) slip.push('<div class="sl">' + ic(/폭염/.test(w.name) ? "i-warn" : "i-snow") + "<div>" + esc(w.name) + " 중입니다<small>" + (/폭염/.test(w.name) ? "시원한 곳과 마실 물부터 보세요" : "난방이 되는지 먼저 보세요") + "</small></div></div>");
    var notes = (F.store.get("homeNotes", {}) || {})[c.hid] || [];
    var prs = F.promises.open(F.store.get("promises", []), c.hid), today = ymd(now);
    var prTag = function (p) { if (!p.due) return ""; if (p.due < today) return '<span class="st-tag st-late">' + U.daysBetween(p.due, now) + "일 지남</span>"; if (p.due === today) return '<span class="st-tag st-late">오늘까지</span>'; return '<span class="st-tag st-new">' + p.due.slice(5).replace("-", ".") + "</span>"; };
    var types = typesFor(h), qs = []; types.forEach(function (t) { (F.askGuide.TYPES[t] || []).forEach(function (q) { qs.push({ t: t, q: q.q }); }); });
    var tcount = types.map(function (t) { return t + " " + (F.askGuide.TYPES[t] || []).length; }).join(" · ");
    var ring = 69.1 * (1 - (c.done.length + 1) / c.d.ids.length);
    return '<div class="ph">' + '<div>' + phHead(c, '<div><h2 class="h1">가구 ' + c.hid + '</h2><div class="meta">' + esc(h.area) + (eta ? " · " + eta + " 도착 예정" : "") + "</div>" +
      (r ? '<div class="whyline">' + pips(r) + "<span>" + esc(r.line).replace(/발굴 (\d+)순위/, "발굴 <b>$1순위</b>").replace(/오늘 (\d+)번째/, "오늘 <b>$1번째</b>") + "</span></div>" : "") + "</div>") + "</div>" +
      '<div class="ph-scroll"><div class="facts num"><div><span>나이·가구</span><b>' + (h.members[0] ? h.members[0].age : "—") + "<small>세 " + (h.single ? "혼자" : h.members.length + "인") + "</small></b></div><div><span>상담 공백</span><b>" + (r && r.gap != null ? r.gap + "<small>일</small>" : "<small>기록 없음</small>") + "</b></div><div><span>발굴</span><b>" + (+m.cnt || 1) + "<small>회 · " + esc(m.prio || "—") + "순위</small></b></div></div>" +
      '<div class="slip"><div class="slip-h"><svg width="24" height="24" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="11" fill="none" stroke="rgba(14,106,111,.2)" stroke-width="3"/><circle cx="13" cy="13" r="11" fill="none" stroke="#0E6A6F" stroke-width="3" stroke-dasharray="69.1" stroke-dashoffset="' + ring.toFixed(1) + '" stroke-linecap="round" transform="rotate(-90 13 13)"/></svg><b>집 앞 30초</b><span>문 두드리기 전에</span></div><div class="slip-b">' + slip.join("") + "</div></div>" +
      (notes.length ? '<div class="warnbox">' + notes.map(function (t) { return '<span class="wt">' + ic("i-warn", "s") + esc(t) + "</span>"; }).join("") + "</div>" : "") +
      (prs.length ? '<div class="sec-h"><b>지난번 약속</b>' + prTag(prs[0]) + "</div>" + prs.slice(0, 2).map(function (p) { return '<div class="promise"><span class="ck"></span><span>' + esc(p.text) + "</span>" + ic(p.kind === "call" ? "i-phone" : "i-doc") + "</div>"; }).join('<div style="height:6px"></div>') : "") +
      (qs.length ? '<div class="sec-h"><b>현장에서 꼭 물을 것</b><small>' + esc(tcount) + '</small></div><div class="qlist">' + qs.slice(0, moreQ ? qs.length : 4).map(function (q) { return '<div class="q"><span class="ck"></span><span>' + esc(q.q) + '</span><span class="tp">' + q.t + "</span></div>"; }).join("") + "</div>" +
        (qs.length > 4 ? '<div style="text-align:center;margin-top:6px"><button class="b b-ghost" data-act="moreq" style="min-height:44px">' + (moreQ ? "접기" : (qs.length - 4) + "가지 더 보기") + "</button></div>" : "") : "") + phMenu() + "</div>" +
      '<div class="ph-foot"><a class="b b-sub b-lg" aria-label="동선 지도" href="#s6:' + c.hid + '" style="width:54px;padding:0">' + ic("i-map", "l") + '</a><a class="b b-main b-lg" href="#s6:' + c.hid + '">오늘 동선·길안내</a></div></div>';
  }
  function phEmpty() { return '<div class="ph"><div class="ph-h"><h2 class="h1">방문 계획이 없습니다</h2><p class="meta">사무실 PC에서 ④ «방문 계획 확정»을 누르면 같은 계정의 폰에 바로 나타납니다.</p></div><div class="ph-scroll">' + phMenu() + '</div><div class="ph-foot" style="grid-template-columns:minmax(0,1fr)"><a class="b b-main b-lg" href="#s4">방문 계획 보기</a></div></div>'; }
  function bind5() { var b = app.querySelector('[data-act="moreq"]'); if (b) b.addEventListener("click", function () { moreQ = !moreQ; render(); }); }

  // ═════ ⑥ 동선·길안내 ═════
  var APP_URL = "https://hcyang572-gif.github.io/daeum/";
  function merc(p) { var x = p.lng * 20037508.34 / 180, y = Math.log(Math.tan((90 + p.lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180; return x.toFixed(1) + "," + y.toFixed(1); }
  function seg(stops, k) { var s = k * 6; return { from: s, list: stops.slice(s, s + 6) }; }
  function appUrl(sg) {
    var L = sg.list, d = L[L.length - 1], q = [];
    L.slice(0, -1).forEach(function (p, i) { q.push("v" + (i + 1) + "lat=" + p.lat, "v" + (i + 1) + "lng=" + p.lng, "v" + (i + 1) + "name=" + encodeURIComponent("방문 " + (sg.from + i + 1))); });
    q.push("dlat=" + d.lat, "dlng=" + d.lng, "dname=" + encodeURIComponent("방문 " + (sg.from + L.length)), "appname=" + encodeURIComponent(APP_URL));
    return "nmap://route/car?" + q.join("&"); // 출발(slat·slng)을 비우면 현재 위치에서 출발
  }
  function webUrl(sg, stops, office) {
    var L = sg.list, start = sg.from ? stops[sg.from - 1] : office, sn = sg.from ? "방문 " + sg.from : "시청";
    var pt = function (p, n) { return merc(p) + "," + encodeURIComponent(n) + ",,"; };
    var via = L.slice(0, -1).map(function (p, i) { return pt(p, "방문 " + (sg.from + i + 1)); }).join(":");
    return "https://map.naver.com/p/directions/" + pt(start, sn) + "/" + pt(L[L.length - 1], "방문 " + (sg.from + L.length)) + "/" + (via || "-") + "/car";
  }
  var NAVBACK = "daeum.nav.back";
  function navBack() { // 길안내에서 돌아왔을 때 한 번만(30분 안) — 떠난 화면(⑥)으로
    var v = null; try { v = JSON.parse(sessionStorage.getItem(NAVBACK) || "null"); sessionStorage.removeItem(NAVBACK); } catch (e) { return false; }
    if (!v || !/^#s6(:|$)/.test(v.h || "") || Date.now() - (v.at || 0) > 30 * 60000 || v.h === location.hash) return false;
    location.replace(v.h); return true;
  }
  function launch(ids, k) {
    var stops = ids.map(function (id) { return RP.toLatLng(BY[id]); }); if (!stops.length) return;
    var off = RP.toLatLng(OFFICE), sg = seg(stops, k), web = webUrl(sg, stops, off), ua = navigator.userAgent || "";
    // 실기기(11-03): 안드로이드 크롬은 앱이 없을 때 대체 웹 주소로 «현재 기록을 바꿔» 넘어가 뒤로 가기가 ⑤로 떨어진다 → 돌아오면 ⑥으로 되돌린다
    try { sessionStorage.setItem(NAVBACK, JSON.stringify({ h: location.hash, at: Date.now() })); } catch (e) { /* 저장 불가 */ }
    if (/Android/i.test(ua)) location.href = "intent://" + appUrl(sg).slice(7) + "#Intent;scheme=nmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;S.browser_fallback_url=" + encodeURIComponent(web) + ";end";
    else if (/iPhone|iPad|iPod/i.test(ua)) { var t0 = Date.now(), hid = false, vh = function () { if (document.hidden) hid = true; }; document.addEventListener("visibilitychange", vh); location.href = appUrl(sg); setTimeout(function () { document.removeEventListener("visibilitychange", vh); if (!hid && Date.now() - t0 < 2500) location.href = web; }, 1500); }
    else window.open(web, "_blank", "noopener");
  }
  function s6(hid) {
    var c = fieldCtx(hid); if (!c) return phEmpty();
    var h = BY[c.hid], r = rankBy()[c.hid], vt = F.visitTime.profile(attempts(), c.hid, { neighborLog: neighborLog() });
    var left = c.d.ids.filter(function (id) { return statusOf(id) === "planned"; }), segs = Math.ceil(left.length / 6);
    var stops = c.d.ids.map(function (id, i) { var st = statusOf(id), dn = st !== "planned", nx = id === c.hid; return '<a class="st ' + (dn ? "dn" : "") + " " + (nx ? "nx" : "") + '" href="#s5:' + id + '"><b>' + (dn ? "✓" : i + 1) + '</b><span><span class="hid">' + id + '</span> <span style="color:var(--ink-3);font-size:13px">· ' + esc(BY[id].area) + '</span></span><span class="t num">' + (dn ? TAG[st] : "") + c.d.s.rows[i].arrive + "</span></a>"; }).join("");
    var segBtns = segs > 1 ? '<div class="segs">' + Array.apply(null, { length: segs }).map(function (_, k) { return '<button class="b b-sub b-sm" data-seg="' + k + '">' + (k * 6 + 1) + "~" + Math.min(left.length, k * 6 + 6) + "</button>"; }).join("") + "</div>" : "";
    return '<div class="ph ph6"><div class="ph-map" id="map6"></div>' +
      '<div class="map-top"><span class="glass-chip">' + c.d.n + "일차 · " + c.d.ids.length + '집</span><span class="glass-chip num">' + c.d.s.km + "km" + (c.d.s.road ? "" : " 약") + " · " + c.d.s.end + ' 끝</span><a class="glass-chip" href="#s5:' + c.hid + '" aria-label="요약으로">' + ic("i-back", "s") + "요약</a></div>" +
      '<div class="sheet"><div><div class="grab"></div><div class="nextc"><div class="pinbig">' + (c.i + 1) + "</div><div><b>가구 " + c.hid + "</b><small>" + pips(r) + " " + esc(h.area) + (vt.best && vt.absences.length ? " · " + esc(vt.absences[0].label) + " 부재 " + vt.absences.length + "번 → " + esc(vt.best.label) : "") + '</small></div><div class="eta num">' + (c.row ? c.row.arrive : "") + "<small>" + (c.row ? c.row.km + "km · " + c.row.travelMin + "분" : "") + "</small></div></div>" +
      '<div class="dayprog" style="grid-template-columns:repeat(' + c.d.ids.length + ',1fr)">' + c.d.ids.map(function (id) { return '<i class="' + (id === c.hid ? "n" : statusOf(id) !== "planned" ? "" : "t") + '"></i>'; }).join("") + '</div><div class="dayprog-l"><span>' + c.done.length + "집 완료</span><span>남은 " + left.length + "집</span></div></div>" +
      '<div class="stops">' + stops + '</div><div class="ph-foot">' + segBtns + '<button class="b b-river b-lg" data-act="nav">' + '<svg class="ic l" style="fill:currentColor;stroke:none" aria-hidden="true"><use href="#i-nav"/></svg>네이버 지도로 길안내</button><div class="navnote">이름·주소 대신 «방문 ' + (c.i + 1) + "»로 넘깁니다 · 앱이 없으면 웹으로</div>" +
      '<a class="b b-sub b-lg" href="#s7:' + c.hid + '">도착했어요 · 기록 시작</a></div></div></div>';
  }
  function bind6(hid) {
    var c = fieldCtx(hid); if (!c) return;
    var box = document.getElementById("map6"), sheetH = (app.querySelector(".sheet") || { offsetHeight: 400 }).offsetHeight;
    drawMap(box, { id: "m6", days: [{ ids: c.d.ids, c: COL.gam, w: 5, op: 1, draw: true }], done: c.done, next: c.hid, padTop: 70, padBottom: sheetH + 10 }, navStops(c.d.ids, c.d.s.path));
    var left = c.d.ids.filter(function (id) { return statusOf(id) === "planned"; });
    var nb = app.querySelector('[data-act="nav"]'); if (nb) nb.addEventListener("click", function () { vib(); launch(left.length ? left : c.d.ids, 0); });
    app.querySelectorAll("[data-seg]").forEach(function (b) { b.addEventListener("click", function () { launch(left, +b.dataset.seg); }); });
  }

  // ═════ ⑦ 확인·메모 ═════
  var res7 = "met", draftKey = "daeum.visit.draft";
  function draft(hid) { var d = lsGet(draftKey, {}) || {}; return d[hid] || { memo: "", tags: null, checked: {}, at: null }; }
  function saveDraft(hid, o) { var d = lsGet(draftKey, {}) || {}; d[hid] = o; lsSet(draftKey, d); }
  function s7(hid) {
    var c = fieldCtx(hid); if (!c) return phEmpty();
    var h = BY[c.hid], dr = draft(c.hid), memo = dr.memo || "", now = new Date(), att = attempts();
    if (!dr.at) { dr.at = now.toISOString(); saveDraft(c.hid, dr); }
    var types = F.askGuide.detect(memo); typesFor(h).forEach(function (t) { if (types.indexOf(t) < 0) types.push(t); });
    var g = F.askGuide.check(memo, types, dr.checked || {});
    var found = F.promises.extract(memo, { householdId: c.hid, label: "가구 " + c.hid, area: h.area, at: now });
    var det = F.askGuide.detect(memo);
    var notes = dr.tags || ((F.store.get("homeNotes", {}) || {})[c.hid] || []).slice();
    var allTags = F.homeCard.NOTE_TAGS.slice(0, 4).concat(notes.filter(function (t) { return F.homeCard.NOTE_TAGS.slice(0, 4).indexOf(t) < 0; }));
    var tries = att.filter(function (t) { return t.householdId === c.hid && t.channel === "visit" && /no_answer|absent/.test(t.result); }).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var a3 = F.visitTime.afterThree(att.concat([{ householdId: c.hid, channel: "visit", result: "no_answer", at: now.toISOString() }]), c.hid, { checked: (F.store.get("afterThree", {}) || {})[c.hid], neighborLog: neighborLog(), area: h.area });
    var vt = F.visitTime.profile(att.concat([{ householdId: c.hid, channel: "visit", result: "no_answer", at: now.toISOString() }]), c.hid, { neighborLog: neighborLog() });
    var nextDay = c.ds.filter(function (d) { return d.n > c.d.n; })[0];
    var isLast = c.d.ids.filter(function (id) { return id !== c.hid && statusOf(id) === "planned"; }).length === 0;
    var met = '<div data-res="met"' + (res7 === "met" ? "" : " hidden") + '><label class="memo"><span class="stamp">' + ic("i-clock", "s") + mdS(now).replace(/ .$/, "") + " " + hm(now) + ' · 방문 상담</span><textarea id="memo" rows="4" placeholder="만난 내용을 짧게 — 약속·어려움은 자동으로 찾아 드립니다(이름·주소·연락처는 적지 마세요)">' + esc(memo) + "</textarea>" +
      '<span class="memo-foot"><button class="mic" type="button" data-act="mic"' + (window.SpeechRecognition || window.webkitSpeechRecognition ? "" : " hidden") + ">" + ic("i-mic", "s") + "말로 남기기</button>" + syncChip(true) + "</span></label>" +
      (found.length || det.length ? '<div class="found"><div class="found-h">' + ic("i-hand", "s") + "메모에서 찾았습니다 · 맞으면 그대로</div>" +
        found.map(function (p) { return '<div class="fr">' + ic("i-cal") + "<div>약속 · " + esc(p.text) + "<small>" + (p.due ? md(p.due) + " 할 일에 넣음" : "날짜 없음 · 할 일에 넣음") + '</small></div><span class="st-tag st-new">새 약속</span></div>'; }).join("") +
        (det.length ? '<div class="fr">' + ic("i-tag") + "<div>어려움 · " + esc(det.join(" · ")) + '<small>보고서 «욕구 영역» 칸에 들어감</small></div><span class="st-tag st-done">확인</span></div>' : "") + "</div>" : "") +
      '<div class="sec-h"><b>꼭 물을 것</b><small class="num">' + esc(g.line.replace("꼭 물을 것 ", "")) + '</small></div><div class="qlist">' + g.items.slice().sort(function (a, b) { return (a.asked ? 1 : 0) - (b.asked ? 1 : 0); }).slice(0, 6).map(function (x) { return '<button type="button" class="q' + (x.asked ? " on" : "") + '" data-q="' + x.key + '"><span class="ck"></span><span>' + esc(x.q) + "</span>" + (x.by === "글" ? "<em>글에서</em>" : '<span class="tp">' + x.type + "</span>") + "</button>"; }).join("") + "</div>" +
      '<div class="sec-h"><b>이 집 꼬리표</b><small>다음 방문 때 요약에 나옵니다</small></div><div class="tags">' + allTags.map(function (t) { return '<button type="button" class="tg' + (notes.indexOf(t) >= 0 ? " on" : "") + '" data-tag="' + esc(t) + '">' + esc(t) + "</button>"; }).join("") + '<button type="button" class="tg add" data-act="addtag">+ 직접 쓰기</button></div></div>';
    var n = tries.length + 1;
    var absent = '<div data-res="absent"' + (res7 === "absent" ? "" : " hidden") + '><div class="absent-box"><b>이번이 ' + (n >= 3 ? "세 번째 이상" : n === 2 ? "두 번째" : "첫") + " 부재입니다</b>" +
      '<div class="tries num">' + tries.slice(-2).map(function (t) { return "<span><b>" + mdS(t.at).replace(/ .$/, "") + " " + hm(t.at) + "</b>" + F.visitTime.BANDS.filter(function (b) { return b.k === F.visitTime.bandOf(t.at); })[0].label + " · 부재</span>"; }).join("") + "<span><b>" + mdS(now).replace(/ .$/, "") + " " + hm(now) + "</b>지금 · 부재</span></div>" +
      (n >= 3 ? "<span>이제 간접 확인으로 넘어갑니다.</span>" : "<span>비어 있던 시간을 피해 다시 갑니다.</span>") +
      '<div class="nextcalc"><span class="pips"><i class="ax-d"></i></span><span>다음 순서 계산 · <b>닿지 않음 +1</b>' + (n >= 2 ? " 그대로(상한 1칸)" : "(부재 2번부터)") + ". 통·이장 안부 확인이 오면 0으로 돌아갑니다.</span></div>" +
      (n >= 3 ? '<div class="msg">' + esc(a3.steps[0].text) + '</div><div style="display:flex;gap:8px"><button class="b b-sub" style="flex:1" data-act="copytong">' + ic("i-copy", "s") + '문안 복사</button><button class="b b-sub" style="flex:1" data-act="neighbor">이웃 탐문 남기기</button></div>' : "") + "</div>" +
      '<div class="sec-h"><b>다음 시도</b><small>비어 있던 시간을 피함</small></div><div class="promise" style="background:var(--river-wash);box-shadow:none">' + ic("i-clock") + "<span>" + (nextDay && nextDay.date ? md(nextDay.date) + " " : "다음 근무일 ") + esc(vt.best ? vt.best.label + "(" + vt.best.hours + ")" : "") + "</span>" + (nextDay ? '<span class="st-tag st-new">' + nextDay.n + "일차에 넣기</span>" : "") + "</div></div>";
    var refuse = '<div data-res="refuse"' + (res7 === "refuse" ? "" : " hidden") + '><div class="absent-box" style="background:var(--alert-wash);box-shadow:inset 0 0 0 1px rgba(179,50,42,.18)"><b>지금은 필요 없다고 하셨습니다</b><span>근무일 5일 뒤(' + md(U.addWorkdays(now, 5)) + ')에 한 번 더 권해 보도록 할 일에 넣습니다. 거절 사유는 한 줄만 남겨 주세요.</span><input class="refuse-in" id="refuseWhy" maxlength="60" placeholder="예: 자녀가 도와준다고 하심" value="' + esc(dr.refuse || "") + '"></div></div>';
    var isMetTxt = isLast ? "저장 · 오늘 방문 끝" : "저장 · 다음 집으로";
    return '<div class="ph"><div><div class="ph-h"><div class="row"><a class="b b-ghost" href="#s5:' + c.hid + '" style="padding:0 4px">' + ic("i-back") + '요약</a><span class="meta num">' + hm(dr.at) + " 도착 · " + Math.max(0, Math.round((now - new Date(dr.at)) / 60000)) + '분째</span></div><h2 class="h1" style="font-size:26px">가구 ' + c.hid + " · 만난 결과</h2>" +
      '<div class="seg" id="seg7" role="radiogroup" aria-label="만난 결과"><button role="radio" aria-checked="' + (res7 === "met") + '" class="' + (res7 === "met" ? "on" : "") + '" data-r="met">' + ic("i-check") + '만남</button><button role="radio" aria-checked="' + (res7 === "absent") + '" class="' + (res7 === "absent" ? "on" : "") + '" data-r="absent">' + ic("i-door") + '부재</button><button role="radio" aria-checked="' + (res7 === "refuse") + '" class="' + (res7 === "refuse" ? "on" : "") + '" data-r="refuse">' + ic("i-x") + "거절</button></div></div></div>" +
      '<div class="ph-scroll" id="body7">' + met + absent + refuse + "</div>" +
      '<div class="ph-foot" style="grid-template-columns:minmax(0,1fr)"><button class="b b-main b-lg" data-act="save7">' + isMetTxt + "</button></div></div>";
  }
  function bind7(hid) {
    var c = fieldCtx(hid); if (!c) return;
    var dr = draft(c.hid), memoEl = document.getElementById("memo"), t = null;
    app.querySelectorAll("#seg7 button").forEach(function (b) { b.addEventListener("click", function () { res7 = b.dataset.r; vib(); render(); }); });
    if (memoEl) memoEl.addEventListener("input", function () { dr.memo = memoEl.value; saveDraft(c.hid, dr); clearTimeout(t); t = setTimeout(function () { var pos = memoEl.selectionStart; render(); var m2 = document.getElementById("memo"); if (m2) { m2.focus(); try { m2.setSelectionRange(pos, pos); } catch (e) { /* 무시 */ } } }, 900); });
    var ri = document.getElementById("refuseWhy"); if (ri) ri.addEventListener("input", function () { dr.refuse = ri.value; saveDraft(c.hid, dr); });
    app.querySelectorAll("[data-q]").forEach(function (b) { b.addEventListener("click", function () { dr.checked = dr.checked || {}; dr.checked[b.dataset.q] = !dr.checked[b.dataset.q]; saveDraft(c.hid, dr); render(); }); });
    app.querySelectorAll("[data-tag]").forEach(function (b) { b.addEventListener("click", function () { var cur0 = dr.tags || ((F.store.get("homeNotes", {}) || {})[c.hid] || []).slice(), tg = b.dataset.tag, i = cur0.indexOf(tg); if (i >= 0) cur0.splice(i, 1); else cur0.push(tg); dr.tags = cur0; saveDraft(c.hid, dr); render(); }); });
    var add = app.querySelector('[data-act="addtag"]'); if (add) add.addEventListener("click", function () { var v = (window.prompt("꼬리표(20자 안, 이름·주소 없이)") || "").trim().slice(0, 20); if (!v) return; var cur0 = dr.tags || ((F.store.get("homeNotes", {}) || {})[c.hid] || []).slice(); cur0.push(F.mask(v)); dr.tags = cur0; saveDraft(c.hid, dr); render(); });
    var cp = app.querySelector('[data-act="copytong"]'); if (cp) cp.addEventListener("click", function () { var a3 = F.visitTime.afterThree(attempts(), c.hid, { area: BY[c.hid].area }); copy(a3.steps[0].text); });
    var nb = app.querySelector('[data-act="neighbor"]'); if (nb) nb.addEventListener("click", function () { var v = (window.prompt("이웃에게 들은 말(이름·주소 없이)") || "").trim(); if (!v) return; F.store.set("neighborLog", F.visitTime.addNeighborLog(neighborLog(), c.hid, v)); toast("이웃 탐문을 남겼습니다"); render(); });
    var mic = app.querySelector('[data-act="mic"]'); if (mic) mic.addEventListener("click", function () {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return; var rec = new SR(); rec.lang = "ko-KR"; rec.interimResults = false;
      rec.onresult = function (e) { var txt = e.results[0][0].transcript; dr.memo = (dr.memo ? dr.memo + " " : "") + txt; saveDraft(c.hid, dr); render(); };
      rec.onerror = function () { toast("음성 입력을 쓸 수 없습니다 — 글로 남겨 주세요"); }; rec.start(); toast("말씀하세요…");
    });
    var sv = app.querySelector('[data-act="save7"]'); if (sv) sv.addEventListener("click", function () { vib(); save7(c); });
  }
  function save7(c) {
    var dr = draft(c.hid), now = new Date(), h = BY[c.hid];
    var memo = res7 === "met" ? dr.memo || "" : res7 === "refuse" ? "거절: " + (dr.refuse || "사유 없음") : "부재" + (dr.memo ? " · " + dr.memo : "");
    var found = res7 === "met" ? F.promises.extract(memo, { householdId: c.hid, label: "가구 " + c.hid, area: h.area, at: now, src: "방문 메모" }) : [];
    if (res7 === "refuse") { var d5 = ymd(U.addWorkdays(now, 5)); found.push({ id: "PR-" + now.getTime() + "-r", householdId: c.hid, label: "가구 " + c.hid, area: h.area, text: "거절 뒤 다시 권유", kind: "visit", due: d5, src: "방문 결과", at: now.toISOString(), done: false, doneAt: null }); }
    if (found.length) F.store.set("promises", F.promises.merge(F.store.get("promises", []), found));
    if (dr.tags) F.store.set("homeNotes", F.homeCard.setNotes(F.store.get("homeNotes", {}), c.hid, dr.tags));
    var ck = F.store.get("askChecked", {}) || {}; ck[c.hid] = dr.checked || {}; F.store.set("askChecked", ck);
    SY.addLog({ household_no: c.hid, result: res7, memo: memo, tags: F.askGuide.detect(memo), promises: found });
    var d = lsGet(draftKey, {}) || {}; delete d[c.hid]; lsSet(draftKey, d);
    var nx = c.d.ids.filter(function (id) { return id !== c.hid && statusOf(id) === "planned"; })[0];
    res7 = "met"; toast("저장했습니다 · " + (SY.state().mode === "live" ? "사무실 PC에 반영됨" : "이 기기에 저장"));
    location.hash = nx ? "#s5:" + nx : "#s6:" + c.hid;
  }

  // ═════ ⑧ 보고서 ═════
  var day8 = null, sel8 = null;
  function reportDays() {
    var ds = days(); return ds.filter(function (d) { return d.ids.some(function (id) { return statusOf(id) !== "planned"; }); });
  }
  function caseOf(id) {
    var L = lastLog(id), st = statusOf(id), h = BY[id], memo = L ? L.memo : "";
    var refs = st === "done" ? F.referral.suggest({ text: memo, needs: F.askGuide.detect(memo) }) : [];
    var prs = F.promises.open(F.store.get("promises", []), id);
    var act = st === "done" ? (refs.length ? F.referral.ORGS[refs[0]].title.replace(/ 의뢰서$/, "").replace(/ 연계$/, "") : "") : "";
    var acts = [];
    if (st === "done") {
      // 조치 = 메모에서 «안내·연결·신청·의뢰·…하기로» 마디(없으면 열린 약속) + 추천 기관(긴급지원은 메모만으로 단정하지 않아 표에서 뺌)
      var cls = memo.split(/[.。\n]/).map(function (x) { return x.trim(); }).filter(Boolean);
      var cl = cls.filter(function (x) { return /(안내|연결|신청|의뢰)/.test(x); }).pop() || cls.filter(function (x) { return /(드리기로|하기로)/.test(x); }).pop();
      if (cl) acts.push(clip(cl.replace(/(을|를)?\s*안내함$/, " 안내").replace(/\s*하기로$/, "").replace(/드리기로$/, "드리기"), 24)); else if (prs[0]) acts.push(clip(prs[0].text, 22));
      if (refs.length && refs[0] !== "emergency") acts.push(F.referral.ORGS[refs[0]].org.replace(/\(.*\)/, "") + " 의뢰");
    }
    else if (st === "absent") { var vt = F.visitTime.profile(attempts(), id, { neighborLog: neighborLog() }); acts.push("다시 방문" + (vt.best ? " · " + vt.best.label : "")); }
    else if (st === "refused") acts.push("근무일 5일 뒤 다시 권유");
    return { id: id, st: st, memo: memo, found: st === "absent" ? "부재(" + (indText(h)[0] || "명단") + ")" : clip(memo.replace(/[.。]\s*$/, ""), 46), act: acts.join(" · ") || act, refs: refs, at: L ? L.at : null, h: h };
  }
  function s8() {
    var rd = reportDays(); if (!rd.length) return pc(8, "s8", '<div class="l"></div><div class="c">' + emptyBox("아직 방문 결과가 없습니다. 폰에서 «저장»을 누르면 이 화면이 바로 채워집니다.", "#s5", "현장 화면") + '</div><div class="r"></div>');
    if (!day8 || !rd.some(function (d) { return d.n === day8; })) day8 = rd[rd.length - 1].n;
    var D8 = rd.filter(function (d) { return d.n === day8; })[0], R = rankBy(), p = plan(), cases = D8.ids.map(caseOf), doneN = cases.filter(function (x) { return x.st !== "planned"; }).length;
    if (!sel8 || D8.ids.indexOf(sel8) < 0) sel8 = (cases.filter(function (x) { return x.st === "done"; }).pop() || cases[0]).id;
    var met = cases.filter(function (x) { return x.st === "done"; }), ab = cases.filter(function (x) { return x.st === "absent"; }), rf = cases.filter(function (x) { return x.st === "refused"; });
    var links = met.filter(function (x) { return x.refs.length || /안내|연결|신청|의뢰/.test(x.memo); }).length;
    var area = (function () { var a = {}; D8.ids.forEach(function (id) { a[BY[id].area] = (a[BY[id].area] || 0) + 1; }); return Object.keys(a).sort(function (x, y) { return a[y] - a[x]; })[0]; })();
    var ord = function (id) { var r0 = p && p.rows.filter(function (x) { return x.household_no === id; })[0]; var lr = r0 && r0.list_rank != null ? r0.list_rank : R[id] ? R[id].listRank : "—", vr = r0 && r0.visit_rank != null ? r0.visit_rank : R[id] ? R[id].todayRank : "—"; return lr + "→" + vr; };
    var concl = D8.ids.length + "가구 중 " + met.length + "가구 상담" + (links ? ", 서비스 연계 " + links + "건" : "") + "." + (ab.length ? " 부재 " + ab.length + "가구는 다시 방문합니다." : "") + (rf.length ? " 거절 " + rf.length + "가구는 근무일 5일 뒤 다시 권합니다." : "") + (doneN < D8.ids.length ? " 남은 " + (D8.ids.length - doneN) + "가구는 방문 전입니다." : "");
    var confirmed = (lsGet(LS_REPORT, {}) || {})[roundYm() + ":" + day8];
    var sc = caseOf(sel8), dft = F.askGuide.draft({ label: "가구 " + sel8, area: BY[sel8].area, at: sc.at || new Date(), method: "방문 상담", needs: F.askGuide.detect(sc.memo), summary: sc.memo, services: [], next: (F.promises.open(F.store.get("promises", []), sel8)[0] || {}).text || "", guide: F.askGuide.check(sc.memo, null, (F.store.get("askChecked", {}) || {})[sel8] || {}) });
    var fld = function (k) { return (dft.fields.filter(function (f) { return f.key === k; })[0] || {}).value || ""; };
    var ref = sc.refs[0] ? F.referral.ORGS[sc.refs[0]] : null;
    var made = new Date(D8.date ? D8.date + "T00:00:00" : Date.now());
    return pc(8, "s8", '<div class="l"><div style="display:flex;justify-content:space-between;align-items:center;padding:2px 8px 8px"><span class="lab">' + D8.n + "일차 · " + (D8.date ? md(D8.date) : "") + '</span><span class="sub num">' + doneN + "/" + D8.ids.length + "</span></div>" +
      (rd.length > 1 ? '<div class="daypick">' + rd.map(function (d) { return '<button class="b b-sm ' + (d.n === day8 ? "b-sub on" : "b-ghost") + '" data-day8="' + d.n + '">' + d.n + "일차</button>"; }).join("") + "</div>" : "") +
      cases.map(function (x) { return '<button class="vrow' + (x.id === sel8 ? " on" : "") + '" data-sel8="' + x.id + '"><span class="hid">' + x.id + "</span>" + TAG[x.st] + "<small>" + esc(x.st === "planned" ? "아직 기록 없음 — 폰에서 저장하면 채워짐" : x.act || clip(x.memo, 22)) + "</small></button>"; }).join("") +
      '<div style="margin-top:auto;border-top:1px solid var(--line);padding:12px 8px 0" class="sub">' + syncChip(false) + "</div></div>" +
      '<div class="c"><div class="docbar">' + (confirmed ? '<span class="st-tag st-done">확정 ' + esc(hm(confirmed)) + "</span>" : '<span class="st-tag st-doing">확정 전 초안</span>') + "<span>메모에서 자동 작성 · 확인 후 확정하면 한글 파일로 내려받습니다</span></div>" +
      '<div class="paper" id="paper"><div class="org"><span>상주시청 · ' + esc(area) + ' 맞춤형복지팀</span><span class="num">' + made.getFullYear() + ". " + (made.getMonth() + 1) + ". " + made.getDate() + ".</span></div><h4>복지 사각지대 현장 확인 결과 보고</h4><div class=\"psub\">" + esc(roundYm()) + " 발굴 명단 · " + D8.n + "일차</div>" +
      '<div class="concl"><span>결론</span><span>' + esc(concl) + '</span></div><div class="kpis num"><div><b>' + D8.ids.length + "</b><span>방문</span></div><div><b>" + met.length + "</b><span>상담</span></div><div><b>" + links + "</b><span>연계</span></div><div><b>" + ab.length + "</b><span>다시 방문</span></div></div>" +
      '<div class="ptbl-wrap"><table class="ptbl"><thead><tr><th>가구</th><th>순서</th><th>확인한 것</th><th>조치·연계</th></tr></thead><tbody>' + cases.map(function (x) { return "<tr><td>" + x.id + '</td><td class="ord">' + ord(x.id) + "</td><td>" + esc(x.st === "planned" ? "아직 기록 없음" : x.found) + "</td><td>" + esc(x.act) + "</td></tr>"; }).join("") + "</tbody></table></div>" +
      '<div class="pnote">순서 = 한국사회보장정보원 발굴 순위 → 방문 순서(현장 사정 4가지로 최대 7칸 앞당김, 기준표 3차)<br>개인정보 4칸(성명·주민등록번호·연락처·주소) 없음 · 담당자 확인 후 확정</div></div></div>' +
      '<div class="r"><button class="b b-main" style="width:100%;height:46px" data-act="hwpx">' + ic("i-down") + "확정하고 내려받기 (hwpx)</button>" +
      '<div class="act"><h5>행복이음 입력 초안 <span class="chip">' + sel8 + "</span></h5>" + (sc.st === "done" ? '<div class="fld"><span>상담 방법</span><span>' + esc(fld("method") || "방문 상담") + '</span></div><div class="fld"><span>주요 호소</span><span>' + esc(clip(fld("main"), 60)) + '</span></div><div class="fld"><span>향후 계획</span><span>' + esc(clip(fld("plan"), 60) || "—") + '</span></div><button class="b b-sub b-sm" data-act="copydraft">' + ic("i-copy", "s") + "입력 순서대로 복사</button>" : '<div class="sub">' + (sc.st === "planned" ? "아직 기록 없음 — 폰에서 저장하는 즉시 채워집니다" : "상담하지 못한 집은 초안이 없습니다") + "</div>") + "</div>" +
      '<div class="act"><h5>연계 의뢰서 ' + (ref ? '<span class="chip gam">추천 1</span>' : "") + "</h5>" + (ref ? '<div style="font-size:12.5px;color:var(--ink-2)">' + esc(ref.title) + " → " + esc(ref.org) + '<br><span class="sub">가림 4칸은 «행복이음 확인 후 기재» 빈칸</span></div>' : '<div class="sub">메모에서 추천할 기관을 찾지 못했습니다 · 아래에서 고르기</div>') +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><select id="refOrg" class="sel" aria-label="의뢰 기관">' + Object.keys(F.referral.ORGS).map(function (k) { return '<option value="' + k + '"' + (sc.refs[0] === k ? " selected" : "") + ">" + esc(F.referral.ORGS[k].org.replace(/\(.*\)/, "")) + "</option>"; }).join("") + '</select><button class="b b-sub b-sm" data-act="ref"' + (sc.st === "done" ? "" : " disabled") + ">의뢰서 만들기 (hwpx)</button></div></div>" +
      '<details class="more"><summary>' + ic("i-chev", "s") + '다른 문서</summary><div class="act" style="margin-top:8px"><h5>어르신께 드릴 큰 글씨 안내문</h5><div class="sub">18pt 이상 · 다음 방문일·연락처</div><button class="b b-sub b-sm" data-act="big">인쇄</button></div></details>' +
      '<a class="b b-ghost" href="#s9" style="margin-top:auto;align-self:flex-end">사후관리로' + ic("i-next") + "</a></div>");
  }
  function bind8() {
    app.querySelectorAll("[data-sel8]").forEach(function (b) { b.addEventListener("click", function () { sel8 = b.dataset.sel8; render(); }); });
    app.querySelectorAll("[data-day8]").forEach(function (b) { b.addEventListener("click", function () { day8 = +b.dataset.day8; sel8 = null; render(); }); });
    var cd = app.querySelector('[data-act="copydraft"]'); if (cd) cd.addEventListener("click", function () { var sc = caseOf(sel8); copy(F.askGuide.draft({ label: "가구 " + sel8, area: BY[sel8].area, at: sc.at, method: "방문 상담", needs: F.askGuide.detect(sc.memo), summary: sc.memo, next: (F.promises.open(F.store.get("promises", []), sel8)[0] || {}).text || "", guide: F.askGuide.check(sc.memo, null, {}) }).text); });
    var hx = app.querySelector('[data-act="hwpx"]'); if (hx) hx.addEventListener("click", function () { vib(); downloadReport(); });
    var rf = app.querySelector('[data-act="ref"]'); if (rf) rf.addEventListener("click", function () {
      var k = document.getElementById("refOrg").value, sc = caseOf(sel8);
      var rec = { text: F.askGuide.draft({ label: "가구 " + sel8, area: BY[sel8].area, at: sc.at, method: "방문 상담", needs: F.askGuide.detect(sc.memo), summary: sc.memo, guide: F.askGuide.check(sc.memo, null, {}) }).text, area: BY[sel8].area, label: "가구 " + sel8, at: sc.at };
      needHwpx().then(function (W2) { return W2.download(F.referral.build(rec, k, { office: BY[sel8].area + " 맞춤형복지팀" }), F.referral.fileName(k)); }).then(function () { toast("의뢰서를 내려받았습니다"); }, function () { toast("한글 파일을 만들지 못했습니다"); });
    });
    var bg = app.querySelector('[data-act="big"]'); if (bg) bg.addEventListener("click", function () {
      var nx = F.promises.open(F.store.get("promises", []), sel8)[0];
      var bp = F.bigPrint.build({ services: [], area: BY[sel8].area, nextVisit: nx && nx.due ? nx.due + "T10:00:00" : null });
      var wdw = window.open("", "_blank"); if (!wdw) return; wdw.document.write('<!doctype html><meta charset="utf-8"><title>' + esc(bp.title) + "</title><body style=\"margin:20mm\">" + bp.html + "<script>print()<\/script>"); wdw.document.close();
    });
  }
  var hwpxP = null;
  function needHwpx() {
    if (window.DaeumHwpx) return Promise.resolve(window.DaeumHwpx);
    if (hwpxP) return hwpxP;
    function load(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
    hwpxP = (window.DaeumXlsx ? Promise.resolve() : load("../shared/xlsx.js")).then(function () { return load("../shared/hwpx.js"); }).then(function () { return window.DaeumHwpx; });
    return hwpxP;
  }
  function downloadReport() {
    var rd = reportDays(), D8 = rd.filter(function (d) { return d.n === day8; })[0]; if (!D8) return;
    var R = rankBy(), p = plan(), cases = D8.ids.map(caseOf), met = cases.filter(function (x) { return x.st === "done"; }), ab = cases.filter(function (x) { return x.st === "absent"; });
    var area = BY[D8.ids[0]].area, now = new Date(), TW = 0;
    needHwpx().then(function (W2) {
      TW = W2.TW || 0;
      var ord = function (id) { var r0 = p && p.rows.filter(function (x) { return x.household_no === id; })[0]; return (r0 && r0.list_rank != null ? r0.list_rank : R[id] ? R[id].listRank : "—") + "→" + (r0 && r0.visit_rank != null ? r0.visit_rank : R[id] ? R[id].todayRank : "—"); };
      var doc = { title: "복지 사각지대 현장 확인 결과 보고", subtitle: roundYm() + " 발굴 명단 · " + D8.n + "일차", made: now.getFullYear() + ". " + (now.getMonth() + 1) + ". " + now.getDate() + ".", office: "상주시청 · " + area + " 맞춤형복지팀",
        blocks: [{ t: "ch", text: "Ⅰ. 결론" }, { t: "li", lv: 1, text: D8.ids.length + "가구 중 " + met.length + "가구 상담, 부재 " + ab.length + "가구 다시 방문." },
          { t: "ch", text: "Ⅱ. 가구별 확인 결과" },
          { t: "tbl", title: "<표 1> 가구별 확인 결과(개인정보 4칸 없음)", head: ["가구", "순서", "확인한 것", "조치·연계"], widths: TW ? [Math.round(TW * .14), Math.round(TW * .12), Math.round(TW * .44), TW - Math.round(TW * .14) - Math.round(TW * .12) - Math.round(TW * .44)] : undefined,
            rows: cases.map(function (x) { return [x.id, ord(x.id), x.st === "planned" ? "아직 기록 없음" : x.found, x.act || ""]; }) },
          { t: "p", kind: "note", text: "※ 순서 = 한국사회보장정보원 발굴 순위 → 방문 순서(현장 사정 4가지로 최대 7칸 앞당김, 기준표 3차) · 가구는 모두 시연용 가상 · 담당자 확인 후 확정  끝." }] };
      return W2.download(doc, "현장확인결과_" + roundYm() + "_" + D8.n + "일차_" + ymd(now).replace(/-/g, "") + ".hwpx");
    }).then(function () { var o = lsGet(LS_REPORT, {}) || {}; o[roundYm() + ":" + day8] = new Date().toISOString(); lsSet(LS_REPORT, o); toast("확정하고 내려받았습니다"); render(); }, function () { toast("한글 파일을 만들지 못했습니다 — 다시 눌러 주세요"); });
  }

  // ═════ ⑨ 사후관리 ═════
  function s9() {
    var now = new Date(), today = ymd(now), ym = today.slice(0, 7), ac = F.aftercare.schedule(F.store.get("links", []), F.store.get("outcomes", {}), F.store.get("followups", {}), now);
    var prs = F.store.get("promises", []) || [], ds = days(), dl = deadline(), ids = ds.reduce(function (a, d) { return a.concat(d.ids); }, []);
    var ev = {}; function add(date, k, t) { (ev[date] = ev[date] || []).push([k, t]); }
    ac.forEach(function (x) { if (x.state !== "done") add(x.date, x.state === "overdue" ? "x" : "f", x.householdId + " " + x.stepLabel.replace(" 재확인", "")); });
    prs.forEach(function (p) { if (p.due) add(p.due, p.done ? "ok" : p.due < today ? "x" : "p", p.householdId + " " + clip(p.text, 10)); });
    ds.forEach(function (d) { if (d.date) { var dn = d.ids.every(function (id) { return statusOf(id) !== "planned"; }); add(d.date, dn ? "ok" : "v", d.n + "일차 " + d.ids.length + "집"); } });
    if (dl.until) add(dl.until, "d", "명단 기한");
    var cal = F.aftercare.month([], ym, {}), cells = "일월화수목금토".split("").map(function (d) { return '<div class="wd">' + d + "</div>"; }).join("");
    var wk0 = U.startOfDay(now); wk0 = new Date(wk0.getTime() - wk0.getDay() * 864e5); var wk1 = new Date(wk0.getTime() + 6 * 864e5);
    cal.weeks.forEach(function (row) { row.forEach(function (c) { var dt = new Date(c.date + "T00:00:00"), e = ev[c.date] || [];
      cells += '<div class="cd ' + (c.inMonth ? "" : "out") + " " + (dt.getDay() === 0 ? "sun" : "") + " " + (c.date === today ? "today" : c.date < today ? "past" : dt >= wk0 && dt <= wk1 ? "wk" : "") + '"><b>' + c.day + "</b>" + e.slice(0, 3).map(function (x) { return '<span class="ev ' + x[0] + '">' + esc(x[1]) + "</span>"; }).join("") + (e.length > 3 ? '<span class="evmore">+' + (e.length - 3) + "</span>" : "") + "</div>"; }); });
    var met = ids.filter(function (id) { return statusOf(id) === "done"; }).length, ab = ids.filter(function (id) { return statusOf(id) === "absent"; }).length, rf = ids.filter(function (id) { return statusOf(id) === "refused"; }).length, total = ids.length || listIds().length, rest = total - met - ab - rf;
    var nextD = ds.filter(function (d) { return d.ids.some(function (id) { return statusOf(id) === "planned"; }); })[0];
    // 이번 주 할 일 — 기한 지남이 맨 위
    var todo = [], att = attempts();
    prs.forEach(function (p) { if (!p.done && p.due && p.due <= ymd(wk1)) todo.push({ k: "p", id: p.id, t: p.householdId + " " + p.text, s: "약속 · " + md(p.due) + "까지" + (p.due < today ? "였음" : ""), due: p.due, late: p.due < today }); });
    ac.forEach(function (x) { if ((x.state === "today" || x.state === "overdue" || x.state === "soon") && x.date <= ymd(wk1)) todo.push({ k: "f", id: x.key, t: x.householdId + " " + x.stepLabel, s: x.services + " · 결정 " + U.daysBetween(x.base, now) + "일 지남", due: x.date, late: x.state === "overdue" }); });
    ids.forEach(function (id) { var st = statusOf(id); if (st === "absent") { var vt = F.visitTime.profile(att, id, { neighborLog: neighborLog() }), nd = nextD && nextD.date ? nextD.date : ymd(U.addWorkdays(now, 1)); todo.push({ k: "v", id: "V:" + id, t: id + " 다시 방문", s: "부재 " + vt.absences.length + "회" + (vt.best ? " → " + vt.best.label + "(" + vt.best.hours + ")" : "") + ((meta()[id] || {}).aiRes ? " · AI 초기상담도 안 닿음" : ""), due: nd, late: false }); } });
    prs.filter(function (p) { return p.done && p.doneAt && new Date(p.doneAt) >= wk0; }).forEach(function (p) { todo.push({ k: "p", id: p.id, t: p.householdId + " " + p.text, s: "완료 · " + md(p.doneAt), due: "9", done: true }); });
    todo.sort(function (a, b) { return (a.done ? 1 : 0) - (b.done ? 1 : 0) || (b.late ? 1 : 0) - (a.late ? 1 : 0) || (a.due < b.due ? -1 : a.due > b.due ? 1 : 0); });
    var tag = function (x) { if (x.done) return '<span class="st-tag st-done">완료</span>'; if (x.late) return '<span class="st-tag st-late">' + U.daysBetween(x.due, now) + "일 지남</span>"; if (x.due === today) return '<span class="st-tag st-stay">오늘</span>'; return '<span class="st-tag st-new">' + x.due.slice(5).replace("-", ".").replace(/^0/, "") + "</span>"; };
    var circ = 201, off = circ * (1 - (total ? (met + ab + rf) / total : 0));
    return pc(9, "s9", '<div class="l"><div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><div class="lab">' + now.getFullYear() + "년 " + (now.getMonth() + 1) + '월</div><h2 class="h-scr" style="margin-top:8px">다시 볼 날을 놓치지 않게</h2></div><div class="legend"><span><i style="background:var(--river)"></i>방문</span><span><i style="background:var(--warn)"></i>재확인</span><span><i style="background:var(--gam)"></i>약속</span><span><i style="background:var(--alert)"></i>기한 지남</span><span><i style="background:var(--ink)"></i>명단 기한</span></div></div><div class="cal-wrap"><div class="cal">' + cells + "</div></div></div>" +
      '<div class="r"><div class="ring-wrap"><svg width="76" height="76" viewBox="0 0 78 78" aria-hidden="true"><circle cx="39" cy="39" r="32" fill="none" stroke="var(--fog-2)" stroke-width="9"/><circle cx="39" cy="39" r="32" fill="none" stroke="var(--river)" stroke-width="9" stroke-linecap="round" stroke-dasharray="201" stroke-dashoffset="' + off.toFixed(0) + '" transform="rotate(-90 39 39)"/><text x="39" y="44" text-anchor="middle" font-family="Hahmlet" font-weight="700" font-size="19" fill="#132029">' + met + "/" + total + "</text></svg>" +
      '<div><div class="lab">' + esc(roundYm()) + " 명단" + (dl.until ? " · 기한 " + dl.until.slice(5).replace("-", ".") : "") + '</div><div style="font:700 17px/1.3 var(--f-display);margin-top:6px">' + met + "가구 확인 · " + (total - met) + '가구 남음</div><div class="seg4"><i style="flex:' + (met || .001) + ';background:var(--ok)"></i><i style="flex:' + (ab + rf || .001) + ';background:var(--warn)"></i><i style="flex:' + (rest || .001) + ';background:var(--sheet-3)"></i></div><div class="sub" style="margin-top:6px">만남 ' + met + " · 부재 " + ab + (rf ? " · 거절 " + rf : "") + (nextD ? " · " + (nextD.date === today ? "오늘" : nextD.date ? md(nextD.date) : "다음") + " " + nextD.n + "일차 " + nextD.ids.filter(function (id) { return statusOf(id) === "planned"; }).length + "집" : "") + "</div></div></div>" +
      '<div style="display:flex;justify-content:space-between;align-items:baseline"><span class="lab">이번 주 할 일</span><span class="sub num">' + todo.length + "건 중 " + todo.filter(function (x) { return x.done; }).length + "건 끝</span></div>" +
      (todo.length ? '<ul class="todo">' + todo.slice(0, 8).map(function (x) { return '<li class="' + (x.done ? "dn" : "") + '"><button class="ck' + (x.done ? " on" : "") + '" data-todo="' + esc(x.id) + '" data-k="' + x.k + '" aria-label="끝냄 표시"' + (x.k === "v" ? " disabled" : "") + "></button><div>" + esc(x.t) + "<small>" + esc(x.s) + "</small></div>" + tag(x) + "</li>"; }).join("") + "</ul>" : '<div class="emptybox"><p>이번 주는 다시 볼 집이 없습니다.</p></div>') +
      '<div class="loop">' + ic("i-loop") + '<span>다음 차수 명단이 오면 ①에서 이번 차수와 자동으로 견줍니다.</span><a class="b b-ghost" href="#s1" style="height:28px">①로</a></div></div>');
  }
  function bind9() {
    app.querySelectorAll("[data-todo]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.dataset.todo, k = b.dataset.k;
      if (k === "p") F.store.set("promises", F.promises.toggle(F.store.get("promises", []), id));
      else if (k === "f") F.store.set("followups", F.aftercare.mark(F.store.get("followups", {}), id));
      vib(); render();
    }); });
  }

  // ── 계정·연동 창 ──
  function accountPanel() {
    var s = SY.state(), why = { login: "로그인 전 — 이 기기에만 저장합니다.", "no-table": "연동 서버(방문 표)가 아직 준비되지 않아 이 기기에만 저장합니다.", off: "연동이 꺼져 있습니다.", lib: "연동 부품을 받지 못했습니다.", error: "서버 응답 오류 — 이 기기에 저장 중.", socket: "실시간 연결이 끊겨 이 기기에 임시 저장 중입니다.", send: "보내기 실패 — 다시 붙으면 자동으로 보냅니다." };
    var d = document.createElement("dialog"); d.className = "acct";
    d.innerHTML = '<form method="dialog" class="acct-in"><h3>PC와 폰 실시간 연동</h3><p class="sub">같은 공무원 계정으로 PC와 폰에서 로그인하면 ④ 방문 계획과 ⑦ 방문 결과가 서로 바로 나타납니다. 서버에는 가구 번호·순서·상태·가린 메모만 갑니다.</p>' +
      '<p class="acct-st">' + syncChip(false) + " " + esc(s.mode === "live" ? "실시간 연동 중" : why[s.why] || "") + "</p>" +
      (s.user ? "<p>로그인: <b>" + esc(s.user.email) + '</b></p><div class="acct-b"><button class="b b-sub" value="out" data-act="out">로그아웃</button><button class="b b-main" value="close">닫기</button></div>'
        : '<label>전자우편<input type="email" id="aEmail" autocomplete="username" required></label><label>비밀번호<input type="password" id="aPw" autocomplete="current-password" minlength="8" required></label><p class="acct-msg" id="aMsg" role="status"></p><div class="acct-b"><button class="b b-sub" type="button" data-act="up">처음이면 가입</button><button class="b b-main" type="button" data-act="in">로그인</button></div>') +
      '<p class="sub" style="margin-top:14px">더 보기: <a href="../shared/data.html">활용 데이터</a> · <a href="../shared/ai_check.html">AI 추천 검증</a> · <a href="../data/demo_list.xlsx" download>시연 명단 파일</a></p><p class="sub">시연 데이터: 모든 가구·메모는 가상입니다 · <a href="?demo=reset#s2">시연 처음 상태로</a></p><button class="acct-x" value="close" aria-label="닫기">' + ic("i-x") + "</button></form>";
    document.body.appendChild(d); d.showModal();
    d.addEventListener("close", function () { d.remove(); });
    function go(fn) { var e = d.querySelector("#aEmail").value.trim(), p = d.querySelector("#aPw").value, m = d.querySelector("#aMsg"); if (!e || p.length < 8) { m.textContent = "전자우편과 8자 이상 비밀번호를 넣어 주세요."; return; } m.textContent = "확인 중…";
      fn(e, p).then(function (r) { if (fn === SY.signUp && !(r.data && r.data.session)) { m.textContent = "가입 확인 메일을 보냈습니다. 메일의 확인 단추를 누른 뒤 로그인해 주세요."; return; } d.close(); render(); }, function (er) { m.textContent = "실패: " + (er && er.message ? er.message : "다시 시도해 주세요"); }); }
    var bi = d.querySelector('[data-act="in"]'), bu = d.querySelector('[data-act="up"]'), bo = d.querySelector('[data-act="out"]');
    if (bi) bi.addEventListener("click", function () { go(SY.signIn); });
    if (bu) bu.addEventListener("click", function () { go(SY.signUp); });
    if (bo) bo.addEventListener("click", function () { SY.signOut().then(render); });
  }
  function copy(t) { (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("복사했습니다"); }, function () { window.prompt("복사해 주세요", t); }); }
  var toastT = null;
  function toast(t) { var el = document.getElementById("toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); } el.textContent = t; el.className = "toast on"; clearTimeout(toastT); toastT = setTimeout(function () { el.className = "toast"; }, 2600); }

  // ── 길잡이(해시) ──
  var cur = 0, curArg = null;
  function parse() { var m = /^#s([1-9])(?::([A-Z]{1,3}-\d{1,5}))?$/.exec(location.hash || ""); return m ? { n: +m[1], h: m[2] || null } : null; }
  function render() {
    var a = parse(); if (!a) { location.replace("#s" + (isPhone() ? 5 : listIds().length ? 2 : 1)); return; }
    var chg = a.n !== cur; cur = a.n; curArg = a.h;
    var ph = cur >= 5 && cur <= 7, html;
    if (cur === 7 && document.activeElement && document.activeElement.id === "memo" && !chg) { /* 쓰는 중에는 아래에서 다시 그림 */ }
    html = cur === 1 ? s1() : cur === 2 ? s2() : cur === 3 ? s3() : cur === 4 ? s4() : cur === 5 ? s5(curArg) : cur === 6 ? s6(curArg) : cur === 7 ? s7(curArg) : cur === 8 ? s8() : s9();
    document.body.classList.toggle("is-ph", ph);
    app.innerHTML = '<div class="screen on" data-s="' + cur + '">' + html + "</div>";
    document.title = "복지 사각지대 현장 업무 도우미 — 닿음 · " + NUM.charAt(cur - 1) + " " + ["명단 불러오기", "전체 명단·기한", "우선순위 근거", "일차별 방문", "집 앞 요약", "동선·길안내", "확인·메모", "보고서", "사후관리"][cur - 1];
    if (cur === 1) bind1(); else if (cur === 2) bind2(); else if (cur === 3) bind3(); else if (cur === 4) bind4(); else if (cur === 5) bind5(); else if (cur === 6) bind6(curArg); else if (cur === 7) bind7(curArg); else if (cur === 8) bind8(); else bind9();
    app.querySelectorAll('[data-act="account"]').forEach(function (b) { b.addEventListener("click", accountPanel); });
    if (chg) { var mn = document.getElementById("main"); if (mn) mn.scrollTop = 0; }
  }
  window.addEventListener("hashchange", function () { if (cur !== 7) res7 = "met"; render(); });
  var rt = null; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (cur === 4 || cur === 6) render(); }, 250); });
  SY.on(function (what) {
    if (cur === 7 && document.activeElement && /^(memo|refuseWhy)$/.test(document.activeElement.id || "")) return; // 쓰는 중에는 그리지 않는다
    if (what === "data" || what === "mode" || what === "sent") render();
  });
  // 시험·디버그용 — 화면 없이 모델만
  window.DaeumFlow = { rank: rank, days: days, statusOf: statusOf, plan: plan, render: render };
  window.addEventListener("pageshow", function (e) { if (e.persisted) navBack(); }); // 뒤로 가기 캐시로 돌아온 경우
  if (!navBack()) render();
  SY.init();
})();
