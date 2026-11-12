/* 복지 사각지대 현장 업무 도우미(닿음) — S12-d 1부 «단계 레일» 4화면 (⚙️ 파로, 2026-11-03)
   기준: 01_리서치/S12-a3_기능_정의서.md(§3·§5·§7·§8) · 시안 04_발표/S12-c_시안/daeum_S12c_시안.html B탭(D-077)
   화면: #today 오늘(P0, PC) · #home:가구 집 앞 요약(M2, 폰 ③) · #record:가구 상담 후 기록(M5, 폰 ⑥) · #docs 문서함(P2, PC ⑦)
   나머지 단계는 «준비 중» 대신 기존 화면으로 잇는다: ①순서 = officer #s4 · ②동선 = officer #s6 · 실적 = officer #s9 · ④⑤ = 기록 화면 «현장 확인·연계 후보».
   계산은 기존 순수 함수(DaeumFeatures·DaeumPriority·DaeumRoutePlan·DaeumOldHouse·DaeumNotify), 저장·PC↔폰 실시간은 DaeumSync(같은 계정 로그인, 코드·QR 없음).
   38b(11-03): ②상담일지 초안 = 규칙 기반 «자동 정리»(실제 AI 없음) · ③안전 모드 시간 초과 = 같은 계정 다른 화면 배너(DaeumSync.safety, 카카오·문자 없음)
     · 연계처 = 한국사회보장정보원 자원정보서비스 15001839 정적 스냅샷(data/resources.js, 키 없음 · 자료에 위치가 없어 지도 핀 대신 목록)
   ⛔ 넣지 않는 것: 주민 화면 · 신고 접수(명단 밖 가구는 담당자가 현장에서 직접 본 경우만 임시 번호 — S12-i3) · 위험 점수 · «오늘 줄인 시간» 띠 · .ics · 다크 화면. 용어: «한국사회보장정보원»(줄임 금지)·«근무일». */
(function () {
  "use strict";
  var F = window.DaeumFeatures, P = window.DaeumPriority, RP = window.DaeumRoutePlan, SY = window.DaeumSync, OH = window.DaeumOldHouse, NT = window.DaeumNotify;
  var SH = window.DaeumShell || { links: function () { return ""; }, tabsHTML: function () { return ""; }, railHTML: function () { return ""; }, tabOf: function () { return 0; }, TABS: [], after: function () {}, busy: function (p) { return p; } }, IM = window.DaeumImport, CH = window.DaeumChips; // S12-i1 셸·명단 불러오기·예시 칩
  var U = F.util;
  var D = window.__DAEUM_HOUSEHOLDS__ || { households: [], meta: { office: { x: 0, y: 0 } }, indicators: [] };
  var AL = window.__DAEUM_ALERTS__ || null, RCP = window.__DAEUM_RECIPIENTS__ || null, RES = window.__DAEUM_RESOURCES__ || null;
  if (OH && window.__DAEUM_OLDHOUSE__) OH.set(window.__DAEUM_OLDHOUSE__);
  var BY = {}; D.households.forEach(function (h) { BY[h.id] = h; });
  var OFFICE = D.meta.office || { x: 0, y: 0 };
  var IND = {}; (D.indicators || []).forEach(function (i) { IND[i.key] = i.name; });
  var NAME = "복지 사각지대 현장 업무 도우미", SUB = "닿음"; // S12-v U17(F5): 옛 공무원 화면(officer/) 링크 없음 — «명단 불러오기»는 모두 #today 파일 고르기
  var W = "일월화수목금토";
  var RM_ = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var app = document.getElementById("app");
  const I = Object.assign({}, DaeumIcons.I); // S12-x 65회차: 시안 v3 아이콘(shared/icons_s12x.js — index.html 이 먼저 불러옴) · 머리 단추·탭·레일·가구별 기록
  // 정의서 §7 가정값(조정 가능한 가정 — 화면 숫자의 근거 꼬리표에 그대로 적는다)
  var A = { missRate: 0.3, safetyMin: 40, retryGap: 2 };
  var LS_META = "daeum.s11.importMeta", LS_DL = "daeum.officer.deadline", LS_REC = "daeum.s12.rec", LS_SAFE = "daeum.s12.safety", LS_DOCS = "daeum.s12.docs", LS_FILL = "daeum.s12.fill", LS_SDEMO = "daeum.s12.safeDemo", LS_DOUT = "daeum.officer.dayOut", LS_DMOVE = "daeum.officer.dayMove", LS_DDATE = "daeum.officer.dayDate", LS_SMIN = "daeum.s12.safeMin", LS_SDAY = "daeum.s12.safeDay"; // S12-i5 예상 시간 칩·하루 요약
  var LS_HOW = "daeum.s12.howtoSeen"; // S12-v U40(F2) «닿음이 하는 일» 그림은 처음 한 번만 펼침(시연 처음 상태로 하면 다시 펼침)
  var SX = F && F.safety ? F.safety : null; // S12-i5 동료 안부 고도화(officer/fieldwork.js)

  // S12-i1 «예시 칩 + 직접 입력» 사용 예: 거절 사유(상황 낱말만, 개인정보 없음)
  var REFUSE_EX = ["자녀가 도와준다고 하심", "지금은 필요 없다고 하심", "이미 다른 지원을 받는 중", "다음에 다시 오라고 하심", "가족과 상의 후 연락하기로"];
  // ── 도구 ──
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 */ } }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return U.ymd(d); }
  /** S12-z 저장 이름 «YYYY-MM-DD_가구번호(가명)_문서종류.확장자»(여러 가구 = «전체») — 규칙 정본은 shared/xlsx.js docName, 부품을 아직 안 불렀을 때(인쇄 제목)도 같게 */
  function fnm(d, hid, kind, ext) { var X = window.DaeumXlsx; if (X && X.docName) return X.docName(d, hid, kind, ext); d = d ? new Date(d) : new Date(); return ymd(isNaN(d) ? new Date() : d) + "_" + (String(hid || "").replace(/\s+/g, "") || "전체") + "_" + String(kind || "문서").replace(/[\\/:*?"<>|\s]+/g, "") + (ext ? "." + ext : ""); }
  function md(d) { d = typeof d === "string" && d.length === 10 ? new Date(d + "T00:00:00") : new Date(d); return (d.getMonth() + 1) + "월 " + d.getDate() + "일(" + W.charAt(d.getDay()) + ")"; }
  function mdDot(d) { d = typeof d === "string" && d.length === 10 ? new Date(d + "T00:00:00") : new Date(d); return (d.getMonth() + 1) + ". " + d.getDate() + ".(" + W.charAt(d.getDay()) + ")"; }
  function hm(d) { d = new Date(d); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function vib() { try { navigator.vibrate && navigator.vibrate(8); } catch (e) { /* 없음 */ } }
  function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }

  // ── 데이터 모델(officer/flow.js 와 같은 규칙 — 같은 저장소를 읽어 두 화면이 어긋나지 않게) ──
  function meta() { return lsGet(LS_META, {}) || {}; }
  function listIds() {
    var m = meta();
    return Object.keys(m).filter(function (k) { return k !== "__seed" && BY[k]; })
      .sort(function (a, b) { var x = parseFloat(m[a].prio), y = parseFloat(m[b].prio); return (isFinite(x) ? x : 1e9) - (isFinite(y) ? y : 1e9) || (a < b ? -1 : 1); });
  }
  function roundYm() { var m = meta(), ys = Object.keys(m).map(function (k) { return m[k] && m[k].ym; }).filter(Boolean).sort(); return ys.length ? ys[ys.length - 1] : ymd(new Date()).slice(0, 7); }
  /** S12-v U15(B10): 특보 = 위쪽 실제 날씨 띠(DaeumWeather, 기상청)가 받은 값만. 시연용 가짜 특보(alerts_demo.js)는 쓰지 않는다 — 못 받으면 «주의» 줄에서 뺀다 */
  function weather() { var WX = window.DaeumWeather; return WX && WX.alertOf && WX.current ? WX.alertOf(WX.current()) : null; }
  window.addEventListener("daeum:wx", function () { if (/^(home|today|plan|route)$/.test(cur)) render(); });
  var RES2ATT = { met: "met", absent: "no_answer", refuse: "refused", indirect_ok: "indirect_ok" };
  function logs() { return SY.logs(); }
  /** S12-v U9: 약속 = 이 기기 사본(F.store) + 서버 방문 기록의 promises(다른 화면에서 생긴 것). 같은 가구·같은 글은 이 기기 사본이 이긴다(끝냄 표시는 이 기기에) */
  function prAll() {
    var own = F.store.get("promises", []) || [], have = {};
    own.forEach(function (p) { have[p.householdId + "|" + p.text] = 1; });
    var rest = [];
    logs().forEach(function (l) { (l.promises || []).forEach(function (x, i) {
      if (!x || !x.text || have[l.household_no + "|" + x.text]) return; have[l.household_no + "|" + x.text] = 1;
      rest.push({ id: "PL-" + l.id + "-" + i, householdId: l.household_no, label: "가구 " + l.household_no, area: (BY[l.household_no] || {}).area || "", text: x.text, kind: x.kind || "", due: x.due || null, src: "방문 기록(다른 화면)", at: l.at, done: false, doneAt: null });
    }); });
    return own.concat(rest);
  }
  /** 끝냄 표시 — 서버에서 온 약속은 이 기기 사본으로 옮긴 뒤 바꾼다 */
  function prToggle(id) {
    var own = F.store.get("promises", []) || [];
    if (!own.some(function (p) { return p.id === id; })) { var x = prAll().filter(function (p) { return p.id === id; })[0]; if (x) own = own.concat([x]); }
    F.store.set("promises", F.promises.toggle(own, id));
  }
  function attempts() {
    return (F.store.get("attempts", []) || []).concat(logs().map(function (l) { return { id: "VL:" + l.id, householdId: l.household_no, channel: "visit", result: RES2ATT[l.result] || l.result, at: l.at, note: l.memo }; }));
  }
  function plan() { var p = SY.plan(); return p && p.round_ym === roundYm() && p.rows && p.rows.length ? p : null; }
  function neighborLog() { return F.store.get("neighborLog", []) || []; }
  function deadline() { var d = lsGet(LS_DL, null), p = plan(); if (d && d.until) return d; if (p && p.until) return { until: p.until, perDay: p.per_day || 5 }; return { until: null, perDay: 5 }; }
  function rank() {
    var p = plan(), at = p && p.ranked_at ? new Date(p.ranked_at) : new Date();
    var att = attempts().filter(function (t) { return !p || new Date(t.at) < at; });
    return P.compute(listIds().map(function (id) { return BY[id]; }), { today: at, meta: meta(), weather: weather(), attempts: att, pins: F.store.get("order", []) || [], deferred: lsGet("daeum.officer.deferred", []) || [] });
  }
  function rankBy() { var o = {}; rank().forEach(function (r) { o[r.id] = r; }); return o; }
  function indText(h) { var out = []; Object.keys(h.indicators || {}).forEach(function (k) { if (h.indicators[k]) out.push(IND[k] || k); }); return out; }
  function ageLine(h) { var a = h.members && h.members[0] ? h.members[0].age : null; return (a ? Math.floor(a / 10) * 10 + "대 " : "") + (h.single ? "혼자" : (h.members || []).length + "인"); }
  function routeOrder(ids) {
    var stops = ids.map(function (id) { return { id: id, x: BY[id].x, y: BY[id].y }; });
    return (stops.length > 1 ? RP.twoOpt(RP.nearest(stops, OFFICE), OFFICE, true) : stops).map(function (s) { return s.id; });
  }
  /** 77회차: 가구 하나를 뺀 새 순서 — 지금 순서가 최적이었으면 남은 가구로 다시 최적화, 손으로 바꾼 순서면 그 순서를 지킨다 */
  function planDrop(ids, id) { var rest = ids.filter(function (x) { return x !== id; }); return ids.join() === routeOrder(ids).join() ? routeOrder(rest) : rest; }
  function sched(ids) { var order = ids.map(function (id) { return { id: id, x: BY[id].x, y: BY[id].y, h: BY[id] }; });
    // S12-i4: 그날 이 기기 안에 받아 둔 도로 결과(네이버 Directions 15)가 있으면 그 구간, 없으면 직선 어림값(«약»). 구간 수가 안 맞으면 어림값
    var hit = RP.roadStore && order.length ? RP.roadStore.get(RP.cacheKey(order, true)) : null, legs = hit && hit.legs && hit.legs.length === order.length + 1 ? hit.legs : RP.approxLegs(order, OFFICE, true);
    return RP.schedule(order, legs, { start: "09:30", ret: true }); }
  function yak(s) { return s && s.approx ? "약 " : ""; } // 어림값이면 수치 앞에 «약»
  function days() {
    var p = plan(), dl = deadline(), out = [];
    if (p) {
      var g = {}; p.rows.forEach(function (r) { (g[r.day] = g[r.day] || []).push(r); });
      Object.keys(g).sort(function (a, b) { return a - b; }).forEach(function (k) {
        var rows = g[k].sort(function (a, b) { return a.seq - b.seq; }), live = function (r) { return BY[r.household_no]; };
        // 42 편집: 뺀 가구는 행을 지우지 않고 status "later"(표 제약에 이미 있는 값)로 남긴다 → 같은 계정 폰에도 그대로 실시간 반영, 되살리면 "planned"
        out.push({ n: +k, date: rows[0].planned_at ? ymd(rows[0].planned_at) : null, ids: rows.filter(function (r) { return live(r) && r.status !== "later"; }).map(function (r) { return r.household_no; }),
          out: rows.filter(function (r) { return live(r) && r.status === "later"; }).map(function (r) { return r.household_no; }), rows: rows, confirmed: true });
      });
    } else {
      var rk = rank(), groups = F.deadline.split(rk, dl.perDay || 5), dp = F.deadline.plan(rk.length, dl.until, dl.perDay || 5), outs = lsGet(LS_DOUT, {}) || {};
      // S12-i4 «동선 안 가구 추가»: 다른 일차 가구를 이 일차로 옮긴 기록(확정 전). 옮기면 원래 일차에 한 집은 늘 남긴다
      var mvs = lsGet(LS_DMOVE, {}) || {};
      Object.keys(mvs).forEach(function (id) { var to = +mvs[id] - 1; if (!groups[to]) return;
        var fr = -1; groups.forEach(function (g, gi) { if (g.indexOf(id) >= 0) fr = gi; });
        if (fr < 0 || fr === to || groups[fr].length < 2) return;
        groups[fr] = groups[fr].filter(function (x) { return x !== id; }); groups[to] = groups[to].concat([id]); });
      groups.forEach(function (ids, i) {
        var o = (outs[i + 1] || []).filter(function (x) { return ids.indexOf(x) >= 0; });
        if (o.length >= ids.length) o = o.slice(0, ids.length - 1); // 한 집은 늘 남는다(빈 일차 금지)
        var mine = (lsGet("daeum.officer.dayOrder", {}) || {})[i + 1], auto = routeOrder(ids.filter(function (x) { return o.indexOf(x) < 0; }));
        var same = mine && mine.length === auto.length && auto.every(function (x) { return mine.indexOf(x) >= 0; });
        var myDate = (lsGet(LS_DDATE, {}) || {})[i + 1]; // 72회차 ①: 담당자가 바꾼 방문 날짜(확정 전은 이 기기, 확정 뒤엔 visit_plan.planned_at 으로 실시간)
        out.push({ n: i + 1, date: myDate || (dp.go && dp.go[i] ? dp.go[i] : ymd(U.addWorkdays(new Date(), i + 1))), ids: same ? mine : auto, out: o, rows: null, confirmed: false });
      });
    }
    out.forEach(function (d) { d.s = sched(d.ids); });
    return out;
  }
  function lastLog(hid) { return logs().filter(function (l) { return l.household_no === hid; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; })[0] || null; }
  /** 68회차 ⑫ 오늘 끝 카드의 하루 요약 — 만남·부재·거절 가구 수(복명서와 같은 셈, 화면 오감 없이 바로) */
  function daySumNums(ids) {
    var n = { done: 0, absent: 0, refused: 0 }; (ids || []).forEach(function (id) { var st = statusOf(id); if (n[st] != null) n[st]++; });
    return '<div class="dsum" aria-label="오늘 방문 결과"><span><b>' + n.done + "</b>만남·상담</span><span class=\"ab\"><b>" + n.absent + "</b>부재</span><span><b>" + n.refused + "</b>거절</span></div>";
  }
  function statusOf(hid) {
    var p = plan(), r = p && p.rows.filter(function (x) { return x.household_no === hid; })[0], L = lastLog(hid);
    if (L && (!p || !p.ranked_at || L.at > p.ranked_at)) return L.result === "met" ? "done" : L.result === "absent" ? "absent" : L.result === "refuse" ? "refused" : (r ? r.status : "planned");
    return r ? r.status : "planned";
  }
  function fieldDay(ds) {
    var t = ymd(new Date()), td = ds.filter(function (d) { return d.date === t; })[0];
    if (td) return td;
    return ds.filter(function (d) { return d.ids.some(function (id) { return statusOf(id) === "planned"; }); })[0] || ds[ds.length - 1] || null;
  }
  function typesFor(h) {
    var t = [], I = h.indicators || {};
    if (I.power_cut || I.gas_cut || I.water_cut || I.rent_arrears || I.mgmt_fee_arrears) t.push("주거");
    if (I.telecom_arrears || I.loan_overdue || I.job_loss || I.health_ins_arrears || I.benefit_stopped) t.push("생계");
    if (I.medical_overspend || h.disability) t.push("건강");
    if (h.single && h.members[0] && h.members[0].age >= 65) t.push("고립");
    if (h.members && h.members[0] && h.members[0].age >= 75) t.push("돌봄");
    return uniq(t);
  }

  // ── 현장 확인 낱말(④)·연계 후보(⑤) — 명단 위기정보 열 → 미리 고른 체크 ──
  var SIGN_OF = { power_cut: "전기 끊김", water_cut: "물 끊김", gas_cut: "가스·난방 끊김", health_ins_arrears: "건강보험료 밀림", telecom_arrears: "통신비 밀림", mgmt_fee_arrears: "관리비 밀림",
    rent_arrears: "월세 밀림", medical_overspend: "병원비 부담", job_loss: "일자리 잃음", loan_overdue: "빚 독촉", benefit_stopped: "받던 급여 끊김" };
  var FIELD_SIGNS = ["우편물 쌓임", "끼니 거름", "복약 관리 어려움", "거동 불편", "연락하는 가족 없음", "집 고칠 곳 있음", "난방 안 됨"];
  // 한국사회보장정보원 복지서비스 OpenAPI 실데이터(data/services.json, 2026-11-02 수집)의 서비스 ID — 15090532 중앙부처 · 15108347 지자체
  var SVC = {
    "주거": [["WLF00000072", "에너지바우처", "15090532"], ["WLF00003201", "주거급여", "15090532"], ["WLF00001162", "긴급복지 연료비", "15090532"]],
    "생계": [["WLF00003180", "긴급복지 생계지원", "15090532"], ["WLF00003257", "이동통신요금감면", "15090532"]],
    "건강": [["WLF00003179", "긴급복지 의료지원", "15090532"]],
    "고립": [["WLF00003191", "노인맞춤돌봄서비스", "15090532"], ["WLF00004190", "상주시 효도수당", "15108347"], ["WLF00005442", "긴급돌봄 지원사업", "15090532"]],
    "돌봄": [["WLF00005442", "긴급돌봄 지원사업", "15090532"], ["WLF00003191", "노인맞춤돌봄서비스", "15090532"]]
  };
  function svcFor(h, extra) { var out = []; uniq(typesFor(h).concat(extra || [])).forEach(function (t) { (SVC[t] || []).forEach(function (s) { if (!out.some(function (o) { return o[0] === s[0]; })) out.push(s); }); }); if (!out.length) out = SVC["생계"].slice(0, 1); return out.slice(0, 5); }
  function signsFor(h) { var I = h.indicators || {}; return Object.keys(SIGN_OF).filter(function (k) { return I[k]; }).map(function (k) { return SIGN_OF[k]; }); }

  // ── 오늘의 일차 ──
  function dayCtx() {
    var ds = days(), d = fieldDay(ds); if (!d) return null;
    var t = ymd(new Date());
    return { ds: ds, d: d, isToday: d.date === t, planned: d.ids.filter(function (id) { return statusOf(id) === "planned"; }) };
  }
  function arriveOf(c, hid) { var i = c.d.ids.indexOf(hid); return i >= 0 && c.d.s.rows[i] ? c.d.s.rows[i].arrive : ""; }
  function dayOfHid(ds, hid) { return ds.filter(function (d) { return d.ids.indexOf(hid) >= 0; })[0] || null; }

  // ── 상태 표지 ──
  function syncChip() {
    var s = SY.state(), m = s.mode, txt, off = false;
    if (m === "live") txt = "PC·폰 실시간 연동";
    else if (m === "connecting") { txt = "연결 중"; off = true; }
    else if (m === "offline") { txt = s.why === "stuck" ? "보내기 막힘 · 계정 창에서 확인" : "끊김 · 이 기기에 임시 저장"; off = true; } // S12-v U1: 맨 앞 보내기가 3번 넘게 실패
    else { off = true; txt = s.why === "no-table" ? "이 기기에 저장 · 서버 준비 전" : "이 기기에 저장 · 로그인하면 연동"; }
    return { cls: off ? (m === "offline" ? "out" : "off") : "", txt: txt + (s.pending ? " · 보낼 것 " + s.pending : "") };
  }
  // S12-x 65회차: 머리 = 시안 v3 topHTML 그대로(표장+연동 점 · PC/태블릿은 연동 글자 · 방패(동료 안부)·눈(화면 가림)·?(사용 방법)·…(더 보기))
  //   폰에서 오늘 밖 탭은 표장 옆 글자가 «탭 이름 / 설명»(시안). 옛 머리(.top-in·탭 nav·7단계 옆줄·날짜 칸)는 걷어냄 — 탭·레일은 render 가 셸에 한 번만.
  function top() { return ""; } // 화면 함수들이 부르던 옛 머리 자리(빈 문자열) — 새 머리는 render() 의 topHTML()
  function topHTML() {
    var si = syncChip(), md_ = document.documentElement.getAttribute("data-mode") || "phone", wide = md_ === "pc" || md_ === "tab";
    var k = SH.tabOf ? SH.tabOf(cur) : 0, T = SH.TABS && SH.TABS[k], D_ = { visit: "순서·동선", field: "집 앞·확인·상담", rec: "고르면 문장", rep: "문서·실적" };
    // 76회차(11-13 호창님 «동료 안부 확인기능을 … 최상단 더보기 왼쪽에 빨강으로 강조된 버튼으로»): 진입은 머리 «안부» 단추 하나(더 보기 바로 왼쪽)
    //   문제(새 판정 없음 — 기존 경보 그대로: 내 안전 모드 예정 시간 넘김 · safeAlerts 의 시간 넘김/조용한 도움 요청 · 팀 알림 TM.alerts)면 .alarm(부드러운 맥박)
    var sf = lsGet(LS_SAFE, null), ba = buddyAlarm(), sk, skt, skl;
    if (sf && sf.hid) { var mn = elMin(sf.at), pl = sf.min || A.safetyMin, over = mn >= pl; skt = over ? "확인" : Math.max(0, pl - mn) + "분"; skl = "안전 · 안전 모드 켜짐 · 가구 " + esc(sf.hid) + (over ? " · 예정 시간 넘김" : " · " + skt + " 남음"); }
    else { skt = "안전"; skl = "안전 — 나의 안전 알리기 · 동료 안부 · 팀 연결"; }
    if (ba) skl += " · 동료 확인 필요";
    sk = '<button class="ky pr bud' + (ba ? " alarm" : "") + (sf && sf.hid ? " on" : "") + '" data-act="safety" aria-label="' + skl + '">' + I.shield + '<span class="bt">' + skt + "</span><i class=\"bd\" aria-hidden=\"true\"></i></button>";
    var veil = document.body.classList.contains("fd-veil");
    var title = cur === "today" || !T || wide ? "<b>닿음</b><small>" + NAME + "</small>" : "<b>" + T[1] + "</b><small>" + (D_[T[0]] || "") + "</small>";
    return '<button class="brand brandb pr" data-act="account" aria-label="계정·연동 — ' + esc(si.txt) + '"><span class="markw"><span class="mark logo"><img src="shared/icons/daeum.svg?v=s12z81" alt=""></span><i class="sd ' + si.cls + '"></i></span><span style="min-width:0">' + title + "</span></button>" +
      (wide ? '<button class="sync pcs pr ' + si.cls + '" data-act="account"><i></i>' + esc(si.txt) + "</button>" : "") +
      (wide && SY.state().user ? '<button class="ky pr outk" data-act="account" aria-label="로그아웃 — ' + esc(SY.state().user.email || "") + '">' + (I.lock || "") + "<span>로그아웃</span></button>" : "") + // 73회차 🔐
      '<button class="ky pr" data-fd-veil="1" aria-pressed="' + veil + '" aria-label="화면 가림">' + I.eye + "</button>" +
      '<button class="ky pr" data-go="#help" aria-label="사용 방법">' + I.help + (wide ? "<span>사용 방법</span>" : "") + "</button>" +
      sk + '<button class="ky pr" data-act="more" aria-label="더 보기">' + I.more + "</button>";
  }
  // 머리 «…» 더 보기 — 시안 v3 moreSheet 그대로(.ov > .scrim + .sheet > .list > .li) · 항목은 라이브에 있는 기능만
  //   폰 = 아래에서 올라오는 시트 · 폴드·태블릿·PC = 가운데 창(v3.css). 바깥(scrim)·«닫기»·Esc 로 닫힘. 다시 그리기(실시간) 뒤에도 열린 채 유지(render 끝).
  var OV = { el: null, on: false };
  function sheetClose() { OV.on = false; OV.kind = ""; if (OV.el) { OV.el.classList.remove("on"); OV.el.innerHTML = ""; if (OV.el.parentNode) OV.el.parentNode.removeChild(OV.el); } }
  function sheetOpen(html, label) {
    if (!OV.el) {
      OV.el = document.createElement("div"); OV.el.className = "ov"; OV.el.id = "ov";
      OV.el.addEventListener("click", function (e) { var pi = e.target.closest ? e.target.closest("[data-pwai]") : null; if (pi) { pwaTap(pi); return; } var t = e.target.closest ? e.target.closest("[data-ov]") : null; if (!t) return; var k = t.getAttribute("data-ov"); sheetClose(); if (k === "account") accountPanel(); else if (k === "team") { if (window.DaeumTeamUI) window.DaeumTeamUI.open(); } else if (k === "ob") { if (window.DaeumOnboard) window.DaeumOnboard.open(); } else if (k === "nudge") nudgeToggle(); else if (k === "fs") { if (SH.fs) toast(SH.fs.toggle() ? "전체화면을 켰습니다" : "전체화면을 껐습니다 · 더 보기에서 다시 켭니다"); } else if (k === "pick") { if (cur === "today") { var f = document.getElementById("listFile"); if (f) f.click(); } else { pickNext = true; location.hash = "#today"; } } });
      document.addEventListener("keydown", function (e) { if (OV.on && e.key === "Escape") sheetClose(); });
    }
    OV.el.innerHTML = '<div class="scrim" data-ov="x"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(label || "") + '"><div class="grab"></div>' + html + "</div>";
    OV.el.classList.add("on"); OV.on = true; app.appendChild(OV.el);
    var f0 = OV.el.querySelector(".li"); if (f0) try { f0.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
  }
  // 76회차: «더 보기 › 이 기기» 홈 화면에 설치 — 설치 신호 있으면 바로 설치 · 없으면 브라우저별 안내 펼침 · 설치돼 있으면(앱으로 열림 포함) 줄을 숨김
  function pwaLi(li) {
    var P = window.__daeumPwaApi; if (!P || P.hidden()) return "";
    return li("button", 'type="button" data-pwai="1" aria-expanded="false"', I.upload || I.more, "홈 화면에 설치", P.can() ? "누르면 바로 설치 · 앱처럼 전체 화면으로 열림" : "앱처럼 전체 화면으로 열림 · 누르면 방법 안내");
  }
  function pwaTap(b) {
    var P = window.__daeumPwaApi; if (!P) return;
    var sm = b.querySelector("small");
    if (P.can()) { sheetClose(); P.install().then(function (r) { if (r === "accepted") toast("설치하는 중입니다 — 홈 화면에 «닿음» 아이콘이 생길 때까지 잠시 기다려 주세요"); }); return; }
    var open = b.getAttribute("aria-expanded") === "true";
    b.setAttribute("aria-expanded", open ? "false" : "true");
    if (sm) sm.textContent = open ? "앱처럼 전체 화면으로 열림 · 누르면 방법 안내" : P.guide();
  }
  function morePanel() {
    OV.kind = "more"; var si = syncChip(), sf = lsGet(LS_SAFE, null);
    var li = function (tag, attr, ic, b, sm) { return "<" + tag + ' class="li pr" ' + attr + ">" + ic + "<span><b>" + b + "</b><small>" + sm + "</small></span></" + tag + ">"; };
    var su = SY.state().user; // 73회차 🔐: 맨 위 = 로그아웃(로그인 때, 이 기기 기록 지우기 선택 창) / 들어가기(로그인 전) — 옛 «계정 · 연동» 줄을 합침
    sheetOpen("<h3>더 보기</h3><div class=\"list\">" +
      (su ? li("button", 'type="button" data-ov="account" data-out="1"', I.lock || I.user, "로그아웃 · 시연 바꾸기", (demoNo(su) ? "지금 시연 " + demoNo(su) + " · " : "") + esc(si.txt)) // 75회차: 이메일 주소는 보이지 않게
        : li("button", 'type="button" data-ov="account"', I.user, "시연으로 둘러보기", "누구나 시연 1·2·3 · 같은 번호면 PC·폰 실시간")) +
      li("a", 'href="#help" data-ov="go"', I.help, "사용 방법", "닿음이 맡는 구간 · 처음 3단계 · 동료 안부") +
      li("button", 'type="button" data-ov="pick"', I.upload || I.db, "발굴대상자 명단 불러오기", "행복이음에서 받은 한국사회보장정보원 조회 서식 엑셀") +
      li("a", 'href="shared/data.html"', I.db, "쓰는 데이터와 출처", "한국사회보장정보원 공공데이터 · 공공 보조") +
      li("a", 'href="shared/ai_check.html"', I.check, "AI 문장 점검", "규칙 문장과 AI 요약 견주기") +
      (window.DaeumOnboard ? li("button", 'type="button" data-ov="ob"', I.help, "처음 안내 다시 보기", "명단 → 동선 → 현장 → 기록 → 보고 · 그림 다섯 장") : "") + // S12-z3 추천안(가): 자동은 처음 한 번, 다시 보기는 여기 // 69회차: 떠 있던 «팀» 단추 → 메뉴(PC 레일·폰 머리 모두 같은 «더 보기»)
      pwaLi(li) +
      li("button", 'type="button" data-ov="nudge" aria-pressed="' + (nudgeOn() ? "true" : "false") + '"', I.bell || I.help, "다음 할 일 안내 · " + (nudgeOn() ? "켜짐" : "꺼짐"), nudgeOn() ? "주 단추 위 한 줄 안내 · 누르면 끕니다" : "꺼져 있음 · 누르면 다시 켭니다") +
      (SH.fs && SH.fs.able() ? li("button", 'type="button" data-ov="fs" aria-pressed="' + (SH.fs.on() ? "true" : "false") + '"', I.more || I.help, "전체화면 · " + (SH.fs.on() ? "켜짐" : "꺼짐"), SH.fs.on() ? "주소창 없이 넓게 · 누르면 끕니다" : "꺼져 있음 · 누르면 다시 켭니다") : "") + // 75회차 ⓪-2
      li("button", 'type="button" data-fd-lock="1" data-ov="lock"', I.lock, "지금 잠그기", "자리 비우면 3분 뒤 자동 잠금 · 가구번호만 표시") +
      li("a", 'href="?demo=reset#today"', I.sync || I.db, "시연 데이터 처음 상태로", "가상 48가구 · 지난 기록") +
      '</div><button type="button" class="btn ghost pr" data-ov="x">닫기</button>', "더 보기");
  }
  // 74회차 🧭 «다음 할 일» — 쓰는 도중의 상태(명단·확정·남은 가구·현장·만들 문서)를 보고 셸(SH.nextStep)이 한 줄을 정한다.
  //   끄기: 더 보기 «다음 할 일 안내» → html[data-nudge="off"](이 기기 localStorage, 막히면 켜진 채로)
  var LS_NUDGE = "daeum.s12.nudge";
  function nudgeOn() { try { return localStorage.getItem(LS_NUDGE) !== "off"; } catch (e) { return true; } }
  function nudgeApply() { document.documentElement.setAttribute("data-nudge", nudgeOn() ? "on" : "off"); }
  function nudgeToggle() { var on = !nudgeOn(); try { localStorage.setItem(LS_NUDGE, on ? "on" : "off"); } catch (e) { /* 저장 막힘 — 이번 화면만 */ } document.documentElement.setAttribute("data-nudge", on ? "on" : "off"); toast(on ? "다음 할 일 안내를 켰습니다" : "다음 할 일 안내를 껐습니다 · 더 보기에서 다시 켭니다"); }
  function nudgeState(pending) {
    var c = dayCtx(), first = c && c.planned ? c.planned[0] || null : null;
    var fhid = /^(home|check|talk|record)$/.test(cur) ? curArg || first : null;
    var inField = !!(fhid && BY[fhid] && statusOf(fhid) === "planned");
    var hid = inField ? fhid : first;
    return { listN: listIds().length, confirmed: !!plan(), planned: c && c.planned ? c.planned.length : 0, hid: hid, area: hid && BY[hid] ? BY[hid].area : "", inField: inField, view: cur, pending: pending || 0 };
  }
  function nudgeOpt(pending) {
    if (!SH.nextStep) return {};
    var st = SH.nextStep(nudgeState(pending)), here = st.at.indexOf(cur) >= 0;
    var ti = SH.tabOf ? SH.tabOf(cur) : -1, mine = SH.TABS && SH.TABS[ti] ? SH.TABS[ti][0] : "";
    var fr = SH.fresh ? SH.fresh(st.k + "|" + (here ? cur : "tab:" + st.tab)) : true; // 같은 안내는 처음 한 번만 빛남
    var show = here && SH.fresh ? SH.fresh(st.k, undefined, "daeum.s12.nxShown") : false; // 75회차 ⓪-3: 안내 줄은 상태가 바뀐 뒤 그 일을 하는 화면에서 한 번만(약 4초) · 다른 탭에선 안 띄움
    return { nx: st, show: show, glow: here && fr, tabGlow: !here && fr && mine !== st.tab ? st.tab : null };
  }
  // 방패: 안전 모드가 켜져 있으면 그 집 현장 확인(안전 띠·«괜찮아요»가 있는 곳)으로, 꺼져 있으면 사용 방법(동료 안부 설명)
  // 76회차(11-13 호창님 «안전과 관련한 기능을 해당버튼에서 모두 처리»): 머리 «안전» 단추 → 안전 화면 하나(더 보기와 같은 시트)
  //   ①나의 안전(안전 모드 진행·괜찮아요·도움 요청·무사히 끝남 = 기존 safeBanner/bindSafe 그대로) ②동료 안부(기존 alertBar/bindAlerts·하루 요약·팀 알림) ③팀 연결(우리 팀 · 팀 코드 = DaeumTeamUI)
  //   기능 로직은 그대로 — 본문(오늘 띠·현장/상담/기록 카드)과 더 보기에 흩어져 있던 자리만 이리로 옮겼다. 집 앞 «들어가기»(안전 모드 켜기)는 방문 흐름이라 그대로.
  function safetyPanel() {
    var sf = lsGet(LS_SAFE, null), T = tm(), ta = 0; try { ta = T && T.alerts ? T.alerts().length : 0; } catch (e) { ta = 0; }
    var my;
    if (sf && sf.hid) my = safeBanner(sf.hid) + '<a class="sp-go pr" href="#check:' + esc(sf.hid) + '" data-ov="go">가구 ' + esc(sf.hid) + " 현장 화면으로 ›</a>";
    else {
      var here = /^(home|check|talk|record)$/.test(cur) && curArg && BY[curArg] && statusOf(curArg) === "planned" ? curArg : null, nx = here || (nudgeState(0).hid || null);
      my = '<p class="sp-off">안전 모드 꺼짐 · 집에 들어갈 때 켜면 예정 시간을 넘길 때 1차 동료 → 2차 팀장에게 알립니다</p>' +
        (here ? '<button type="button" class="btn safe" data-sp="enter">' + (I.shield || "") + "가구 " + esc(here) + " 들어가기 <small>안전 모드 " + minPick() + "분</small></button>"
          : nx ? '<a class="sp-go pr" href="#home:' + esc(nx) + '" data-ov="go">다음 가구 ' + esc(nx) + " 집 앞으로 › «들어가기»를 누르면 켜집니다</a>" : "");
    }
    var bar = alertBar();
    sheetOpen('<h3 class="sp-h">' + (I.shield || "") + "안전</h3>" +
      '<section class="sp-sec" aria-label="나의 안전"><div class="sp-k">나의 안전</div>' + my + "</section>" +
      '<section class="sp-sec" aria-label="동료 안부"><div class="sp-k">동료 안부' + (ta ? ' <em class="li-n">' + ta + "</em>" : "") + "</div>" + (bar || "") +
        (!/sfa/.test(bar || "") && !ta ? '<p class="sp-off">지금 확인할 동료 알림이 없습니다</p>' : "") + (cur !== "today" && SX ? daySumSafe() : "") +
        (ta ? '<button type="button" class="li pr" data-sp="team">' + (I.user || "") + "<span><b>팀 알림 " + ta + "건 보기</b><small>1차 동료·팀장 알림 · 연락했어요</small></span></button>" : "") + "</section>" +
      (window.DaeumTeamUI ? '<section class="sp-sec" aria-label="팀 연결"><div class="sp-k">팀 연결</div><button type="button" class="li pr" data-sp="team">' + (I.user || "") + "<span><b>우리 팀 · 팀 코드" + (teamN() ? ' <em class="li-n">' + teamN() + "</em>" : "") + "</b><small>" + esc(window.DaeumTeamUI.label ? window.DaeumTeamUI.label() : "1차 동료·팀장 짝 지정 · 팀 현황") + "</small></span></button></section>" : "") +
      '<button type="button" class="btn ghost pr" data-ov="x">닫기</button>', "안전");
    OV.kind = "safety";
    var root = OV.el; bindSafe(root); bindAlerts(root);
    root.querySelectorAll('[data-sp="team"]').forEach(function (b) { b.addEventListener("click", function () { sheetClose(); if (window.DaeumTeamUI) window.DaeumTeamUI.open(); }); });
    var en = root.querySelector('[data-sp="enter"]'); if (en) en.addEventListener("click", function () { var h = curArg; vib(); safeEnter(h); sheetClose(); location.hash = "#check:" + h; render(); });
  }
  function daySumSafe() { try { return daySum(); } catch (e) { return ""; } }
  function safetyKey() { safetyPanel(); }
  /** 76회차: 동료 «문제» 여부 — 새 판정 없이 기존 경보만: 내 안전 모드 예정 넘김 · safeAlerts(시간 넘김·조용한 도움 요청, 시연 경보 포함) · 팀 알림(TM.alerts) */
  function buddyAlarm() {
    var n = 0, sf = lsGet(LS_SAFE, null);
    if (sf && sf.hid && elMin(sf.at) >= (sf.min || A.safetyMin)) n++;
    try { n += safeAlerts().filter(function (a) { return !a.done && (a.help || a.late); }).length; } catch (e) { /* 무시 */ }
    try { var T = tm(); n += T && T.alerts ? T.alerts().length : 0; } catch (e) { /* 무시 */ }
    return n;
  }
  if (typeof window !== "undefined") window.__daeumBuddyAlarm = function () { return buddyAlarm(); };
  function budMark() { if (typeof document === "undefined") return; var n = buddyAlarm(); document.querySelectorAll('.ky.bud').forEach(function (b) { b.classList.toggle("alarm", !!n); var l = (b.getAttribute("aria-label") || "").replace(/ · 동료 확인 필요$/, ""); b.setAttribute("aria-label", n ? l + " · 동료 확인 필요" : l); }); }

  // ═════ P0 오늘 ═════
  // S12-v U40(F6): [단계, 근거 데이터(번호 없이 — 번호는 «활용 데이터» 화면에만), 탭] · 탭 이름을 단계 앞에 작게 붙여 «현장» 탭과 «요약» 단계가 따로 노는 혼란을 막는다
  var STN = [["순서", "발굴 명단", "방문"], ["동선", "명단 우선방문 열", "방문"], ["요약", "명단 급여 열", "현장"], ["확인", "명단 위기정보", "현장"], ["상담", "복지서비스 원문", "현장"], ["기록", "복지서비스 목록", "기록"], ["보고", "수급권자 현황", "보고"]];
  function stLbl(i) { var x = STN[i]; return (x[2] !== x[0] ? '<small class="stp">' + x[2] + "</small>" : "") + x[0]; }
  function stTxt(i) { var x = STN[i]; return x[2] !== x[0] ? x[2] + "·" + x[0] : x[0]; }
  function stationHref(i, hid) {
    var x = hid ? ":" + hid : "";
    return ["#plan", "#route" + x, "#home" + x, "#check" + x, "#talk" + x, "#record" + x, "#docs"][i];
  }
  function stepsOf(hid, confirmed) {
    var st = statusOf(hid), sf = lsGet(LS_SAFE, null);
    if (st !== "planned") return 6;
    if (sf && sf.hid === hid) return 3;
    return confirmed ? 2 : 1;
  }
  // S12-x 66회차: 오늘 = 시안 v3 scrToday 구조 — 첫 칸(제목 .ph · 지금 할 일 · 맡는 구간 · 발굴 명단 · 이어지는 화면) | 둘째 칸(오늘 방문 시간줄 .tl) | 셋째 칸(주소 정리 · 남은 기한 · 가상 데이터 꼬리)
  function todayHead(now) { return '<div class="ph"><h2>오늘 할 일</h2><span>' + esc(md(now)) + "</span></div>"; }
  function demoTail() { return '<div class="demo"><span class="samp">가상 데이터</span><span>가구 번호·나이·사유·메모는 모두 시연용 가상 · 실제 개인정보 없음</span><a class="pr" href="#help">사용 방법</a><a class="pr" href="shared/data.html">활용 데이터</a><a class="pr" href="?demo=reset#today">시연 처음 상태로</a></div>'; }
  // 74회차 «보이되 조용하게» — 이 탭의 다른 기능을 이름표(.ql) + 작은 기능 카드(.qg › button.qf: 아이콘·이름·한 줄 효과, 숫자는 .v) · 칩 줄(.qcs › .chip)
  //   카드 한 장 = [아이콘 열쇠, 이름(html — 숫자는 qv()), 한 줄 효과, 동작 속성] · 동작: data-go="#화면"(주소 이동) · data-pick(명단 고르기) · data-qto="선택자"(같은 화면 그 칸으로 내려가기)
  function qv(n) { return '<span class="v">' + esc(n) + "</span>"; }
  function qf(x) { return '<button type="button" class="qf" ' + x[3] + '><span class="ic">' + (I[x[0]] || I.more || "") + "</span><span><b>" + x[1] + "</b><small>" + esc(x[2]) + "</small></span></button>"; }
  function qcards(label, items) { items = items.filter(Boolean); return items.length ? '<div class="ql">' + esc(label) + '</div><div class="qg">' + items.map(qf).join("") + "</div>" : ""; }
  function qchips(items, label) { return '<div class="qcs" role="list"' + (label ? ' aria-label="' + esc(label) + '"' : "") + ">" + items.map(function (c) { return '<span class="chip' + (c[2] ? " on" : "") + '" role="listitem">' + (c[0] ? I[c[0]] || "" : "") + esc(c[1]) + "</span>"; }).join("") + "</div>"; }
  function linksRow(hid0) { // 오늘 탭 «이 탭의 다른 기능» — 옛 «이어지는 화면» 링크 줄을 기능 카드로(기능·주소 그대로)
    var ids = listIds(), dl = deadline(), dp = dl.until ? F.deadline.plan(0, dl.until, dl.perDay || 5) : null, sf = lsGet(LS_SAFE, null);
    return qcards("이 탭의 다른 기능", [
      ["db", "발굴 명단 " + qv(ids.length) + "가구", "읍면 막대 · 미처리·우선방문", 'data-qto=".lcard"'],
      dp && dp.set ? ["clock", "남은 기한 " + qv(dp.left) + "근무일", "기한 넘길 가구 미리 셈", 'data-qto=".card.dead"'] : ["clock", "남은 기한", "기한을 넣으면 하루 몇 가구인지 셈", 'data-go="#plan"'],
      FD ? ["pin", "주소 정리", "도로명주소 «확인 필요» 표시", 'data-qto=".fd-addr"'] : null,
      ["today", "방문 계획", "일차·순서 바꾸기", 'data-go="#plan"'],
      ["route", "동선·길안내", "네이버 지도", 'data-go="#route' + (hid0 ? ":" + hid0 : "") + '"'],
      ["report", "실적·사후관리", "재방문·약속", 'data-go="#perf"'],
      ["upload", "명단 불러오기", "행복이음 «발굴대상자 조회» 엑셀", 'data-pick="1"']
    ]);
  }
  function today() {
    var c = dayCtx(), now = new Date();
    var dm = docModel(), pend = dm.pending;
    if (!c) return '<main class="wrap">' + todayHead(now) + '<section class="card emp"><span class="eic">' + (I.today || "") + '</span><b>방문 계획이 아직 없습니다</b><span class="why">방문 계획 화면에서 한국사회보장정보원 명단을 불러오면 이 화면이 채워집니다.</span><a class="btn pri" href="#today" data-pick="1" data-dock="1" data-dock-sub="행복이음 «발굴대상자 조회» 엑셀">' + (I.upload || "") + "명단 불러오기</a></section>" + listCard() + "</main>";
    var first = c.planned[0] || null;
    var whenLbl = c.isToday ? "오늘" : (c.d.date ? md(c.d.date) : "다음 방문일");
    var rb = rankBy(), p = plan(), mt = meta();
    var rows = c.d.ids.map(function (id, i) {
      var h = BY[id], r = rb[id], m = mt[id] || {}, pr = p && p.rows.filter(function (x) { return x.household_no === id; })[0];
      var lr = pr && pr.list_rank != null ? pr.list_rank : r ? r.listRank : m.prio || "—";
      var why = r && r.line ? r.line.replace(/^.*?번째( · )?/, "") : "";
      var bits = [why, m.aiRes ? "AI초기상담 " + m.aiRes : ""].filter(Boolean);
      var st = statusOf(id), tm = esc(c.d.s.rows[i] ? c.d.s.rows[i].arrive : "");
      var sub = "한국사회보장정보원 " + lr + "순위 → " + (i + 1) + "번째" + (bits.length ? " · " + clip(bits.join(" · "), 46) : "");
      var nm = '<span class="nm"><b>' + esc(h.area + " · " + id) + "</b><small>" + esc(ageLine(h) + " · " + sub) + "</small></span>";
      // S12-v U12(B7): 부재 가구는 집 앞 요약으로 다시 들어감 · U16(F4): 끝난 가구 줄에 «기록 고치기»
      if (st === "done" || st === "refused") return '<div class="tli done"><span class="tm num">' + tm + '</span><span class="pin">' + (i + 1) + "</span>" + nm.replace("<small>", "<small>" + (st === "done" ? "만남" : "거절") + " · 기록 저장됨 · ") + '<button type="button" class="evb pr" data-fix="' + id + '" aria-label="기록 고치기 · ' + id + '">기록 고치기</button></div>';
      return '<a class="tli pr' + (id === first ? " cur" : "") + '" href="#home:' + id + '"><span class="tm num">' + tm + '</span><span class="pin">' + (i + 1) + "</span>" + (st === "absent" ? nm.replace("<small>", "<small>부재 · ") : nm) + '<span class="st">' + (id === first ? "다음" : st === "absent" ? "다시" : "") + "</span></a>";
    }).join("");
    var dl = deadline(), dp = dl.until ? F.deadline.plan(0, dl.until, dl.perDay || 5) : null;
    var remain = listIds().filter(function (id) { var s = statusOf(id); return s !== "done" && s !== "refused"; }).length, total = listIds().length || 1;
    var visitDays = dp && dp.set ? dp.days.filter(function (x) { return x.kind !== "today"; }).length : 0;
    var cap = Math.floor(visitDays * (dl.perDay || 5) * (1 - A.missRate)), over = Math.max(0, remain - cap);
    var dead = dp && dp.set ? '<section class="card dead"><h3>' + esc(roundYm()) + " 명단 남은 기한<span>근무일 기준 · " + esc(dl.until.slice(5).replace("-", ".")) + "까지</span></h3>" +
      '<div class="stat3"><div><b class="num">' + dp.left + '</b><small>남은 근무일</small></div><div><b class="num">' + remain + '</b><small>남은 가구</small></div><div><b class="num ac">' + over + "</b><small>기한 넘길 가구</small></div></div>" +
      '<div class="bar"><i style="--w:' + Math.round((total - remain) / total * 100) + '%"></i></div><span class="why">하루 ' + (dl.perDay || 5) + "가구 · 만나지 못할 비율 " + Math.round(A.missRate * 100) + "%(가정 · 조정 가능)</span></section>" : "";
    var hid0 = first || c.d.ids[0];
    // S12-x #72(호창님 11-12 결정): 오늘 탭 머리 = «오늘 할 일 + 날짜» → 지금 할 일 → 구간 그림(접는 카드 · 첫 실행만 펼침). 소개 문장·데이터→기능→목표 그림은 뺀다.
    var fi = first ? c.d.ids.indexOf(first) : -1, fh = first ? BY[first] : null, fr = first ? rb[first] : null;
    var fwhy = fr && fr.line ? clip(fr.line.replace(/^.*?번째( · )?/, ""), 40) : (fh ? indText(fh).slice(0, 2).join(" · ") : "");
    var next = first ? '<section class="card next" aria-label="지금 할 일"><div class="ch"><span class="k">지금 할 일 · ' + (fi + 1) + "번째 가구" + (c.isToday ? "" : " · " + esc(whenLbl)) + '</span><span class="mini" aria-hidden="true"><i></i><i></i><i></i>' + (I.home2 || "") + "</span></div>" +
        '<div class="hh"><span class="no">' + (fi + 1) + '</span><span class="t"><b>' + esc(fh.area + " " + first) + "</b><small>" + esc(ageLine(fh) + (fwhy ? " · " + fwhy : "")) + '</small></span><span class="when"><b class="num">' + esc(arriveOf(c, first) || "—") + "</b><small>도착 예정</small></span></div>" +
        '<div class="tags">' + indText(fh).slice(0, 3).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" +
        '<div class="row2"><a class="btn" href="#route:' + first + '" data-dock="2" data-dock-lbl="길 안내">' + (I.nav || "") + '길 안내</a><a class="btn pri" data-dock="1" data-dock-sub="집 앞 요약 열기 · 30초 읽기" href="#home:' + first + '">' + (I.door || "") + (c.isToday ? "도착했어요" : esc(whenLbl) + " 방문 준비") + "</a></div></section>"
      : '<section class="card next" aria-label="지금 할 일"><span class="k">' + esc(whenLbl) + ' 방문 끝</span><div class="hh"><span class="no donechk">' + (I.check || "✓") + '</span><span class="t"><b>' + c.d.ids.length + "곳 모두 기록했습니다</b><small>보고 탭에 문서 " + pend + '건이 채워져 있습니다</small></span></div>' + daySumNums(c.d.ids) + '<div class="row2"><a class="btn pri" data-dock="1" data-dock-lbl="복명서 만들기" data-dock-sub="보고 탭 · 만들 문서 ' + pend + '건" href="#docs">' + (I.report || "") + "보고서 열기</a></div></section>";
    var si = syncChip();
    return '<main class="wrap">' + todayHead(now) + next +
      '<div data-scope-map="card"></div>' + // S12-n 닿음이 맡는 구간(접는 카드 · 첫 실행만 펼침)
      listCard() + linksRow(hid0) + C2 +
      '<section class="card"><h3>' + esc(whenLbl) + " 방문 " + c.d.ids.length + "곳" + (c.d.confirmed ? " · 확정" : " · 자동 배정안") + "<span>출발 상주시청 · " + esc(c.d.s.end || "") + ' 복귀</span></h3><div class="tl">' + rows + "</div>" +
      '<div class="srcs"><span class="sync ' + si.cls + '"><i></i>' + esc(si.txt) + "</span></div></section>" + C3 +
      (FD ? FD.addrCard() : "") + dead + demoTail() + "</main>";
  }
  // S12-i1: «발굴 명단» 카드 — 기본 탑재(가상 48가구) + 같은 서식 파일 불러오기(이 기기 안에서만 읽음, 서버 전송 0)
  var listMsg = null;
  function listCard() { // S12-x 66회차: 시안 v3 listCard 마크업(.card.ft · .xl · .towns.sm) — 기능(파일 고르기·결과 문구·가상 명단 파일)은 그대로
    var ids = listIds(), m = meta(), imp = lsGet("daeum.s11.import", null) || {}, ar = {}, un = 0, pv = 0;
    ids.forEach(function (id) { var a = BY[id].area; ar[a] = (ar[a] || 0) + 1; var x = m[id] || {}; if (!/처리\s*완료|완료/.test(x.proc || "")) un++; if (x.lonely || x.child) pv++; });
    var top3 = Object.keys(ar).sort(function (a, b) { return ar[b] - ar[a]; }), mx = top3.length ? ar[top3[0]] : 1;
    return '<section class="card ft lcard" aria-label="발굴 명단"><div class="ch"><h3>발굴 명단</h3><span class="samp">' + (imp.demo ? "기본 탑재(가상)" : "불러옴") + "</span></div>" +
      '<div class="xl"><span class="xlic" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span style="min-width:0;flex:1"><b>' + esc(roundYm()) + " · " + ids.length + "가구 · " + top3.length + "개 읍면</b><small>미처리 " + un + " · 우선방문 " + pv + "가구</small></span></div>" +
      '<div class="towns sm">' + top3.slice(0, 5).map(function (a) { return "<div><span>" + esc(a) + '</span><i style="--w:' + Math.round(ar[a] / mx * 100) + '%"></i><b class="num">' + ar[a] + "</b></div>"; }).join("") + "</div>" +
      '<label class="btn sm ghost lc-up ibt">' + (I.upload || "") + '<input type="file" id="listFile" accept=".xlsx,.xls,.csv" hidden><span><b>명단 불러오기</b><small>행복이음 «발굴대상자 조회» 엑셀</small></span></label>' + // 77회차: 아이콘 왼쪽 + 제목·부제 두 줄(.btn.ibt) — 세로로 쌓아 아이콘이 위 끝·글자가 아래 끝에 붙던 것 고침
      (listMsg ? '<p class="why lc-msg' + (listMsg.ok ? "" : " bad") + '" role="status">' + listMsg.text + "</p>" : "") +
      '<span class="why">' + esc(imp.name || "가상 명단") + ' · 성명·주민등록번호·전화는 읽지 않음 · <a href="data/demo_list_full.xlsx" download>가상 명단 파일</a></span></section>';
  }
  function bindList() {
    var f = document.getElementById("listFile"); if (!f || !IM) return;
    f.addEventListener("change", function () {
      var file = f.files && f.files[0]; f.value = ""; if (!file) return;
      if (file.size > 5 * 1024 * 1024) { listMsg = { ok: false, text: "파일이 너무 큽니다(5MB까지)." }; render(); return; }
      SH.busy(IM.readFile(file), "명단을 읽는 중… (이 기기 안에서만)").then(function (rows) {
        var r = IM.importRows(rows, D.households);
        if (!r.ok) { listMsg = { ok: false, text: r.err === "blank" ? "빈 파일입니다 — 행복이음 «발굴대상자 조회»에서 내려받은 엑셀을 골라 주세요." : r.err === "cols" ? "가구를 가리키는 열(«소재행정동»·«(행복이음)주소» 또는 «관리번호»)을 찾지 못했습니다." : r.err === "empty" ? "가구 줄이 없는 빈 서식입니다." : "명단의 가구를 지도에서 찾지 못했습니다(" + r.n + "줄)." }; render(); return; }
        IM.commit(r, file.name, { get: lsGet, set: lsSet }, F);
        if (FD) FD.scanImport(rows, D.households, file.name); // S12-i3 ① 도로명주소 정리(주소 글은 저장하지 않음)
        listMsg = { ok: true, text: "<b>" + esc(file.name) + "</b> · " + r.ids.length + "가구를 실었습니다" + (r.dup ? " · 같은 가구 " + r.dup + "줄은 한 번만" : "") + (r.miss ? " · 못 찾은 줄 " + r.miss : "") + (r.cut ? " · " + IM.MAX + "가구까지만" : "") + " · 서버 전송 0 · 지난 방문 기록은 그대로 · " + '<a href="#plan">방문 계획 보기</a>' }; // 67회차: 불러온 뒤 바로 다음 단계
        render();
      }, function (er) { listMsg = { ok: false, text: er && er.message === "lib" ? "엑셀 읽기 부품을 받지 못했습니다 — 연결을 확인하거나 CSV로 저장해 불러와 주세요." : "파일을 읽지 못했습니다(손상·암호 걸린 파일) — 엑셀에서 다시 저장하거나 CSV로 저장해 불러와 주세요." }; render(); });
    });
  }
  function bindToday() {
    bindList();
    if (pickNext) { pickNext = false; var lf = document.getElementById("listFile"); if (lf) try { lf.click(); } catch (e) { /* 손으로 누르면 됨 */ } }
  }

  // ═════ M2 집 앞 요약(③) ═════
  function phBrand() { return ""; } // S12-x 65회차: 폰 현장 화면 머리도 셸 머리(topHTML) 하나로 — 옛 .ph-brand 걷어냄
  // S12-x 66회차(미르 넘김 ①): 옛 7단계 띠(nav.mini.well)는 머리 아래 고정 띠(.hbar)와 겹쳐 뺐다 → 시안 v3 현장 단계 줄 .steps(집 앞·확인·상담 3칸)
  //   now = 2(집 앞)·3(확인)·4(상담) — 옛 7단계 번호 그대로 받는다. 기록(5)·동선(1)은 단계 줄 없음(시안).
  function mini(now, hid) {
    if (now < 2 || now > 4) return "";
    return '<div class="steps" role="tablist" aria-label="현장 단계">' + [["#home:", "집 앞"], ["#check:", "확인"], ["#talk:", "상담"]].map(function (x, i) {
      var k = i + 2; return '<button type="button" role="tab" class="pr' + (k === now ? " on" : k < now ? " dn" : "") + '" data-go="' + x[0] + hid + '" aria-selected="' + (k === now) + '"><i>' + (k < now ? "✓" : i + 1) + "</i>" + x[1] + "</button>";
    }).join("") + "</div>";
  }
  function bnav() { return ""; } // S12-x 65회차: 아래 탭은 셸(.tabs) 하나 — 현장 화면 옛 탭 줄 걷어냄
  function pickHid(want) {
    var c = dayCtx(); if (!c) return null;
    if (want && BY[want]) { var d = dayOfHid(c.ds, want); if (d) c.d = d; return { c: c, hid: want }; }
    return { c: c, hid: c.planned[0] || c.d.ids[c.d.ids.length - 1] };
  }
  function phEmpty() { return '<main class="phx">' + phBrand() + '<div class="emptyc blk"><b>방문 계획이 없습니다</b>사무실 PC에서 방문 계획을 확정하면 같은 계정의 폰에 바로 나타납니다.</div></main>' + bnav("home", null); }
  function home(want) {
    var k = pickHid(want); if (!k) return phEmpty();
    var c = k.c, hid = k.hid, h = BY[hid], m = meta()[hid] || {}, r = rankBy()[hid], att = attempts(), w = weather();
    var p = plan(), pr = p && p.rows.filter(function (x) { return x.household_no === hid; })[0];
    var lr = pr && pr.list_rank != null ? pr.list_rank : r ? r.listRank : m.prio || "—";
    var i = c.d.ids.indexOf(hid), eta = arriveOf(c, hid);
    var vt = F.visitTime.profile(att, hid, { neighborLog: neighborLog() }), L = lastLog(hid);
    var reasons = indText(h);
    var lines = [];
    lines.push({ lb: "발굴 이유", t: (reasons.join(" · ") || "위기정보") + (m.lonely ? " · 고독사 우선방문 대상" : ""), plug: ["발굴 명단"] });
    var past = [];
    if (L) past.push(mdDot(L.at) + " " + (L.result === "met" ? "만남" : L.result === "absent" ? "부재" : "거절") + (L.memo ? " — " + clip(L.memo, 34) : ""));
    else if (vt.absences.length) past.push(vt.absences.length + "번 부재(" + uniq(vt.absences.map(function (a) { return a.label; })).join("·") + ")");
    else past.push("처음 찾아가는 집" + (r && r.gap != null ? " · 상담 공백 " + r.gap + "일" : ""));
    if (m.aiRes) past.push("AI초기상담 " + m.aiRes);
    lines.push({ lb: "지난 기록", t: past.join(" · "), plug: L ? ["발굴 명단", "현장 기록"] : ["발굴 명단"] });
    var warn = [], wplug = [];
    if (OH && OH.get() && OH.isOld(h)) { warn.push("오래된 집이 많은 읍면(30년 넘은 주택 " + Math.round(OH.rate(h.area) * 100) + "%)"); wplug.push("건축물대장"); }
    if (w) { warn.push(w.name + " — " + (/폭염/.test(w.name) ? "시원한 곳·마실 물" : /한파/.test(w.name) ? "난방이 되는지 먼저" : /호우|태풍/.test(w.name) ? "집 주변 물길·축대 먼저" : /대설/.test(w.name) ? "집 앞 비탈길·지붕 먼저" : "방문 안전 먼저")); wplug.push("기상청 특보"); }
    var notes = (F.store.get("homeNotes", {}) || {})[hid] || [];
    if (notes.length) warn.push(notes.slice(0, 2).join(" · "));
    var pw = FD ? FD.pairWarn(hid) : "2인 방문 확인"; if (pw) warn.push(pw); // S12-i3 ⑤: 위험 이력 집만 «2인 방문 권장»
    if (warn.length) lines.push({ lb: "주의", t: warn.join(" · "), plug: wplug, warn: true });
    var sv = svcFor(h);
    lines.push({ lb: "받는 급여 · 관련 서비스", t: (h.status && h.status !== "없음" ? h.status : "받는 급여 없음") + " · " + sv.slice(0, 2).map(function (s) { return s[1]; }).join(", "), plug: ["복지서비스 OpenAPI 15090532"] });
    if (vt.best && vt.absences.length) lines.push({ lb: "다음엔 이 시간대", t: vt.best.label + "(" + vt.best.hours + ") — 비어 있던 시간을 피함", plug: ["현장 기록"] });
    var sign = notes.length + (L && L.tags ? L.tags.filter(isField).length : 0);
    var prev = c.d.ids[i - 1], next = c.d.ids[i + 1];
    // S12-x 66회차: 시안 v3 scrField(brief) — 첫 칸(단계 줄 · 가구 카드 · 도착 전 요약 + 부재) | 둘째 칸(예상 시간 · 들어가기 · 판단 근거 · 연계처 · 현장 보조)
    return '<main class="phx">' + mini(2, hid) +
      '<section class="card next idc" aria-label="가구"><div class="hh"><span class="no">' + (i + 1) + '</span><span class="t"><b>' + esc(h.area + " " + hid) + "</b><small>" + esc(ageLine(h) + " 사심 · 발굴 " + (+m.cnt || 1) + "회째 · 한국사회보장정보원 발굴 순위 " + lr) + '</small></span><span class="when"><b class="num">' + esc(eta || "—") + "</b><small>" + (c.isToday ? "도착 예정" : esc(c.d.date ? md(c.d.date) : "예정")) + "</small></span></div>" +
      '<div class="tags">' + reasons.slice(0, 4).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + (m.lonely ? '<span class="tag w">고독사 우선방문</span>' : "") + "</div>" +
      '<div class="row2 hhnav">' + (prev ? '<a class="evb pr" href="#home:' + prev + '">‹ 앞 가구</a>' : '<span class="evb pr" aria-disabled="true">‹ 앞 가구</span>') + '<span class="why">' + (i + 1) + " / " + c.d.ids.length + "</span>" + (next ? '<a class="evb pr" href="#home:' + next + '">다음 가구 ›</a>' : '<span class="evb pr" aria-disabled="true">다음 가구 ›</span>') + "</div></section>" +
      '<section class="card ft stops" aria-label="도착 전 요약"><div class="ch"><h3>도착 전 요약</h3><span class="samp">' + Math.min(5, lines.length) + '줄</span></div><div class="brief">' + lines.slice(0, 5).map(function (x, n) { return '<div class="bl' + (x.warn ? " w" : "") + '"><span class="ic' + (x.warn ? "" : " n") + '">' + (x.warn ? (I.warn || "!") : n + 1) + "</span><p>" + esc(x.t) + "<small>" + esc(x.lb) + "</small>" + (x.plug.length ? '<span class="srcs">' + x.plug.map(function (p) { return '<span class="plug">' + esc(p) + "</span>"; }).join("") + "</span>" : "") + "</p></div>"; }).join("") + "</div>" +
      '<div class="cact"><button class="btn sm ghost noans" type="button" data-act="noans" data-dock="2" data-dock-lbl="못 만남">' + (I.away || "") + "응답 없음(부재) · 문 앞 확인으로</button></div></section>" + // S12-v U4(F3): 초인종 → 응답 없음 → 문 앞 확인 → 확정
      '<section class="card basis" aria-label="판단 근거 카드"><div class="ch"><h3>판단 근거</h3><span class="samp">점수 없음</span></div><div class="evt"><div><dt>명단 사유</dt><dd>' + reasons.length + "가지</dd></div><div><dt>발굴 횟수</dt><dd>" + (+m.cnt || 1) + "회</dd></div><div><dt>현장 징후</dt><dd>" + (sign || 0) + "건" + (sign ? "" : " · 집 안에서 채움") + "</dd></div></div>" +
      '<span class="why">현장 징후는 집 안에서 «확인» 체크로 채웁니다. 명단 사유 밖 징후는 보고서에 따로 셉니다. 판단은 담당자가 합니다.</span></section>' + C2 + // 68회차 ⑮ 판단 근거를 첫 칸으로(폴드·PC 첫 칸이 짧아 칸 균형 기울던 것)
      minChips() + // S12-i5 ① 예상 시간 칩(탭 한 번)
      (safeOn(hid) ? '<button class="btn safe" type="button" data-act="enter" data-dock="1">' + (I.shield || "") + '안전 모드 켜져 있음 · 계속 <small>' + elMin(safeOn(hid).at) + "분째 · 예정 " + (safeOn(hid).min || A.safetyMin) + "분</small></button>" // S12-v U3: 이미 켜진 집은 새로 켜지 않고 이어 간다
        : '<button class="btn safe" type="button" data-act="enter" data-dock="1">' + (I.shield || "") + '들어가기 <small>안전 모드 <span data-sminv>' + minPick() + "</span>분</small></button>") +
      (window.DaeumLink ? window.DaeumLink.html(h) : "") + // S12-m 치매·마음건강·돌봄 한 줄 + 같은 읍면동 연계처(app/linkcard.js)
      (FD ? FD.homeExtra(hid) : "") + // S12-i3 ①주소 확인 필요 ⑤2인 방문 ⑦추가 발굴 가구(작게)
      qcards("이 가구에서 쓸 수 있는 것", [
        ["eye", "판단 근거", "명단 위기정보 원문 · 점수 없음", 'data-qto=".basis"'],
        FD && FD.pairWarn(hid) ? ["people", "2인 방문 권장", "동료와 같이 가기", 'data-qto=".fd-pair"'] : null,
        window.DaeumLink ? ["phone", "연계처", "치매·마음건강·돌봄 · 바로 전화", 'data-qto=".lkc"'] : null,
        FD ? ["pen", "추가 발굴 가구", "명단 밖 이웃 간단 등록", 'data-qto=".fd-nf"'] : null,
        ["route", "동선·길안내", "네이버 지도 · 다음 가구", 'data-go="#route:' + hid + '"']
      ]) +
      '<div class="ql">다음 단계에서 이어지는 것</div>' + qchips([["check", "확인 줄 · 괜찮음/문제 있음"], ["door", "문 앞·못 만남 → 부재 기록"], ["talk", "질문 순서 카드"], ["report", "받을 수 있는 서비스"], ["pen", "상담일지 초안"]], "다음 단계 미리보기") + "</main>";
  }
  function bindHome(want) {
    var k = pickHid(want); if (!k) return;
    if (FD) FD.bindHome(app, k.hid);
    bindChips();
    var b = app.querySelector('[data-act="enter"]'); if (b) b.addEventListener("click", function () { vib(); safeEnter(k.hid); location.hash = "#check:" + k.hid; });
    var na = app.querySelector('[data-act="noans"]'); if (na) na.addEventListener("click", function () { vib(); var o = recOf(k.hid); o.res = "absent"; saveRec(k.hid, o); location.hash = "#check:" + k.hid; });
  }
  // S12-i3 현장 기능(app/field.js) — 도구 묶음을 한 번 넘긴다(화면 가림·자동 잠금 단추도 여기서 붙음)
  var FD = window.DaeumField && window.DaeumField.use ? window.DaeumField : null;
  if (FD && CH) FD.use({ F: F, CH: CH, BY: BY, A: A, lsGet: lsGet, lsSet: lsSet, vib: vib, statusOf: statusOf, listIds: listIds, meta: meta, dayCtx: dayCtx, attempts: attempts,
    neighborLog: neighborLog, logs: logs, lastLog: lastLog, recOf: recOf, typesFor: typesFor, chosenSvcs: chosenSvcs, roundYm: roundYm,
    toast: function (t) { toast(t); }, copy: function (t) { copy(t); }, render: function () { render(); } });
  else FD = null;

  // ═════ 안전 모드(④⑤⑥ 공통) — «들어가기»부터 확정까지 ═════
  // 38b ③: 예정 시간을 넘기면 같은 계정의 다른 화면(사무실 PC 등)·같은 브라우저 다른 창에 배너. 「안부 확인 완료」로 양쪽 모두 해제.
  // i6: 창마다 이름표(sessionStorage) — 안전 모드를 켠 창만 «이 기기»로 본다(같은 브라우저 두 창 시연에서 PC 창이 남의 안전 모드를 제 것으로 보지 않게)
  var TAB = (function () { try { var t = sessionStorage.getItem("daeum.tab"); if (!t) { t = Math.random().toString(36).slice(2, 10); sessionStorage.setItem("daeum.tab", t); } return t; } catch (e) { return "t"; } })();
  function ownTab(sf) { return !sf.tab || sf.tab === TAB; }
  function elMin(at) { return Math.max(0, Math.round((new Date() - new Date(at)) / 60000)); }
  function devName() { return window.matchMedia && matchMedia("(max-width: 760px)").matches ? "폰" : "PC"; }
  /** S12-v U3: 이 집에 켜진 안전 모드(없으면 null) */
  function safeOn(hid) { var sf = lsGet(LS_SAFE, null); return sf && sf.hid === hid ? sf : null; }
  /** S12-v U3(B2): 들어가기 — 같은 집이면 켜진 것을 그대로 이어 쓰고(새 id 없음), 다른 집 것이 남아 있으면 먼저 끝낸 뒤(fin moved) 새로 켠다.
      전에는 앞의 안전 모드에 «끝»이 가지 않아 40분 뒤 거짓 «시간 넘김·팀장 알림»이 떴다 */
  function safeEnter(hid) {
    var old = lsGet(LS_SAFE, null);
    if (old && old.hid === hid) return old;
    if (old) { old.fin = "moved"; safePush(old, "end"); }
    var sf = { id: "SF-" + hid + "-" + Date.now(), hid: hid, at: new Date().toISOString(), min: minPick(), tab: TAB }; lsSet(LS_SAFE, sf); safePush(sf, "on"); return sf;
  }
  function live() { return SY.state().mode === "live"; }
  /** S12-v U3(F1): 동료·팀장 이름은 시연용 가상 — 이름 뒤에 «시연·가상» 꼬리표(모양은 CSS .sim-tag). 입력은 이미 esc 된 글 */
  //   69회차(⚙️ 파로): 꼬리표는 «가상»일 때만 — 팀에서 수락된 짝이 실제 팀원(sim 아님)이면 붙이지 않는다. 짝이 없으면 기본 이름(시연용 가상)이라 붙인다.
  function simTag(h) {
    if (!SX || !SX.WHO) return h; var T = tm();
    var isSim = function (l) { return !T || !l || l.state !== "accepted" || !!l.sim; };
    [[SX.WHO.peer, T ? T.peer() : null], [SX.WHO.lead, T ? T.lead() : null]].forEach(function (x) { if (isSim(x[1])) h = h.split(esc(x[0])).join(esc(x[0]) + '<span class="sim-tag">시연·가상</span>'); });
    return h;
  }
  /** 팀 연동(shared/team_sync.js — app.js 뒤에 적재되므로 그때그때 찾는다) */
  function tm() { var w = typeof window !== "undefined" ? window : null; return w && w.DaeumTeam || null; }
  function teamLive() { var T = tm(); return !!(T && T.live && T.live()); }
  /** «직접 전화» 받는 사람 — 팀에서 수락된 1차 동료 이름(예: «박주무관에게»), 없으면 «동료에게» */
  function peerWho() { var T = tm(), n = T && T.peerName ? T.peerName() : ""; return n ? n + "에게" : "동료에게"; }
  /** 알림이 실제로 어디까지 가는지 정직하게 — 팀 연동 중이면 1차 동료·팀장 화면, 아니면 다른 사람에게 안 감(같은 계정 다른 화면은 내 화면일 뿐) */
  function reachLine() {
    if (teamLive()) return "1차 동료·팀장 화면에 뜹니다";
    return (live() ? "팀 연동 꺼짐 — 같은 계정 내 다른 화면에만 뜹니다" : "연동 꺼짐 — 다른 사람에게 가지 않습니다") + " · " + peerWho() + " 직접 전화하세요";
  }
  /** 팀 알림·짝 요청 건수 — «더 보기» 단추 점(data-badge)과 «우리 팀» 항목 알약(.li-n) */
  function teamN() { var T = tm(); if (!T) return 0; try { return (T.alerts ? T.alerts().length : 0) + (T.incoming ? T.incoming().length : 0); } catch (e) { return 0; } }
  function moreDot() { if (typeof document === "undefined") return; var n = teamN(); document.querySelectorAll('[data-act="more"]').forEach(function (b) { if (n) b.setAttribute("data-badge", String(n)); else b.removeAttribute("data-badge"); b.classList.toggle("has-dot", !!n); });  budMark(); }
  function reachTo() { return teamLive() ? "1차 동료·팀장 화면" : live() ? "같은 계정 내 다른 화면(팀 연동 꺼짐)" : "이 기기에만(연동 꺼짐)"; }
  // 팀 짝·연동이 바뀌면(수락·연동 켜짐/꺼짐) 안전 모드 띠 문구·전화 단추·꼬리표를 다시 그린다 — team_sync.js 가 뒤에 적재되므로 한 박자 뒤에 붙인다
  if (typeof window !== "undefined") setTimeout(function () { var T = tm(); if (T && T.on) T.on(function (w) { if ((w === "board" || w === "error") && lsGet(LS_SAFE, null)) render(); else moreDot(); }); moreDot(); }, 0);
  function safePush(sf, state) { if (!SY.safety) return; SY.safety.send({ id: sf.id || "SF-" + sf.hid, hid: sf.hid, area: (BY[sf.hid] || {}).area || "", at: sf.at, min: sf.min, state: state, by: devName(), help: sf.help || 0, hok: sf.hok || 0, hat: sf.hat || "", fin: sf.fin || "" }); dayNote(); }
  // ── S12-i5 동료 안부 고도화: ①예상 시간 칩 ②1차 동료 → 2차 팀장 ③조용한 도움 요청 ④무사 종료 ⑤하루 요약 ──
  function minPick() { return SX ? SX.pick(lsGet(LS_SMIN, A.safetyMin)) : A.safetyMin; }
  function minChips() {
    if (!SX) return ""; var mp = minPick();
    return '<div class="sfchips" role="group" aria-label="이 집 예상 시간 — 넘기면 괜찮은지 묻고 안부 알림"><span>예상 시간</span>' + SX.CHIPS.map(function (n) { return '<button type="button" data-smin="' + n + '" aria-pressed="' + (n === mp) + '">' + n + "분</button>"; }).join("") + "</div>";
  }
  function bindChips() {
    app.querySelectorAll("[data-smin]").forEach(function (b) { b.addEventListener("click", function () {
      vib(); var n = +b.dataset.smin; lsSet(LS_SMIN, n);
      app.querySelectorAll("[data-smin]").forEach(function (x) { x.setAttribute("aria-pressed", String(+x.dataset.smin === n)); });
      var v = app.querySelector("[data-sminv]"); if (v) v.textContent = n;
    }); });
  }
  /** 하루 기록 — 같은 계정의 모든 화면에서 받은 안전 모드 알림을 오늘 날짜로 모은다(이 기기에만, 서버 0) */
  function dayNote() {
    if (!SX) return null; var lg = SX.note(lsGet(LS_SDAY, null), null), all = SY.safety ? SY.safety.list() : {};
    Object.keys(all).forEach(function (k) { lg = SX.note(lg, all[k]); });
    lsSet(LS_SDAY, lg); return lg;
  }
  function dayIds() { var c = dayCtx(); return c ? c.d.ids : D.households.slice(0, 3).map(function (h) { return h.id; }); }
  function daySum() {
    if (!SX) return ""; var lg = dayNote(), real = lg && Object.keys(lg.items).length;
    var s = SX.summary(real ? lg : SX.demo(dayIds(), function (h) { return (BY[h] || {}).area || ""; }));
    return '<div class="sfsum blk" aria-label="오늘 동료 안부 요약"><span class="k">오늘 동료 안부' + (real ? "" : ' <em class="sim-tag">시연·가상</em>') + "</span>" +
      [[s.visits, "곳 방문"], [s.over, "번 시간 넘김"], [s.help, "번 도움 요청"], [s.safe, "곳 무사 종료"]].map(function (x) { return '<span class="n"><b>' + x[0] + "</b>" + x[1] + "</span>"; }).join("") +
      (s.lead ? '<span class="lead">팀장까지 간 알림 ' + s.lead + "번</span>" : "") + "</div>";
  }
  function safeTools(sf) {
    var on = (sf.help || 0) > (sf.hok || 0);
    var to = reachTo();
    return '<span class="sf-t"><button type="button" class="sf-q' + (on ? " on" : "") + '" data-act="safehelp" aria-label="' + (on ? "도움 요청을 보냈습니다 · " + to + "에 떠 있습니다" : "조용한 도움 요청 · 누르면 " + to + "에 가구 번호·읍면이 갑니다") + '"><i></i></button>' +
      (teamLive() ? "" : '<a class="sf-call" href="tel:" aria-label="' + esc(peerWho()) + ' 직접 전화">' + esc(peerWho().replace(/에게$/, "")) + "에게 전화</a>") + // 팀 연동 꺼짐이면 동료가 모르니 전화 앱을 바로 연다(69회차: 1차 동료 이름)

      '<button type="button" class="sf-end" data-act="safeend">무사히 끝남</button></span>';
  }
  function safeBanner(hid) {
    var sf = lsGet(LS_SAFE, null); if (!sf || sf.hid !== hid) return "";
    var el = elMin(sf.at), lim = sf.min || A.safetyMin, st = SX ? SX.stage(sf) : { lv: el >= lim ? 1 : 0, line: lim + "분이 지나면 괜찮은지 묻습니다" };
    // S12-v U3(F1): «사무실 화면에도 알림»은 연동 중일 때만 — 로그인 안 한 폰에 거짓 안심 문구를 띄우지 않는다
    // S12-x 66회차: 시안 v3 safePanel — 동료 안부 카드(.card.buddy.ft) 안에 경과 고리(.ring) + 글(.tx) + 단추(괜찮아요·도움 요청·무사히 끝남). 문구·동작 이름은 그대로
    var R = 56, CC = 2 * Math.PI * R, pp = Math.min(1, el / Math.max(1, lim)), late = el >= lim;
    var ring = '<div class="ring"><svg viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="' + R + '" fill="none" stroke="var(--track)" stroke-width="11"/><circle cx="66" cy="66" r="' + R + '" fill="none" stroke="' + (late ? "var(--sos0)" : "#2E8270") + '" stroke-width="11" stroke-linecap="round" stroke-dasharray="' + CC.toFixed(1) + '" stroke-dashoffset="' + (CC * (1 - pp)).toFixed(1) + '"/></svg><div class="c"><b class="num">' + el + "</b><small>/ " + lim + "분</small></div></div>";
    return late ? '<section class="card buddy ft sfb late lv' + st.lv + '" role="alert"><div class="safep">' + ring + '<div class="tx"><b>' + lim + "분 지났습니다 · 괜찮으세요?</b><small>" + simTag(esc(st.line)) + " · " + esc(reachLine()) + "</small><div class=\"row2\"><button type=\"button\" class=\"btn sm safe\" data-act=\"safeok\">안부 확인 완료 · 20분 더</button></div>" + safeTools(sf) + "</div></div></section>"
      : '<section class="card buddy ft sfb"><div class="safep">' + ring + '<div class="tx"><b>안전 모드 · ' + el + "분째</b><small>" + simTag(esc(st.line)) + (teamLive() ? "" : " · " + esc(reachLine())) + "</small>" + safeTools(sf) + "</div></div></section>";
  }
  function bindSafe(root) { root = root || app; var ok = root.querySelector('[data-act="safeok"]'); if (ok) ok.addEventListener("click", function () { var sf = lsGet(LS_SAFE, null); if (sf) { sf.min = Math.max(sf.min || A.safetyMin, elMin(sf.at)) + 20; lsSet(LS_SAFE, sf); safePush(sf, "ok"); toast(teamLive() ? "안부 확인 완료 · 1차 동료·팀장 화면 알림도 해제" : live() ? "안부 확인 완료 · 같은 계정 다른 화면 알림도 해제" : "안부 확인 완료"); } render(); });
    var hp = root.querySelector('[data-act="safehelp"]'); if (hp) hp.addEventListener("click", function () { // ③ 조용한 도움 요청 — 소리·큰 알림 없이 한 번에
      var sf = lsGet(LS_SAFE, null); if (!sf) return; sf.help = (sf.help || 0) + 1; sf.hat = new Date().toISOString(); lsSet(LS_SAFE, sf);
      var a = SY.safety ? SY.safety.list()[sf.id] : null; safePush(sf, a && a.state === "ok" ? "ok" : "on");
      try { if (navigator.vibrate) navigator.vibrate([12, 70, 12]); } catch (e) { /* 무시 */ }
      hp.classList.add("on"); hp.setAttribute("aria-label", teamLive() ? "도움 요청을 보냈습니다 · 1차 동료·팀장 화면에 떠 있습니다" : "팀 연동 꺼짐 — 도움 요청이 동료에게 가지 않습니다 · " + peerWho() + " 직접 전화하세요");
      if (!teamLive()) toast("팀 연동 꺼짐 — 도움 요청이 동료에게 가지 않습니다 · " + peerWho() + " 직접 전화하세요");
    });
    var en = root.querySelector('[data-act="safeend"]'); if (en) en.addEventListener("click", function () { // ④ 무사 종료 — 타이머 정리 + 동료 화면에 «무사히 끝남»
      vib(); var sf = lsGet(LS_SAFE, null); if (sf) { sf.fin = "safe"; safePush(sf, "end"); try { localStorage.removeItem(LS_SAFE); } catch (e) { /* 무시 */ } toast(teamLive() ? "무사히 끝났습니다 · 1차 동료·팀장 화면 알림도 정리했습니다" : live() ? "무사히 끝났습니다 · 같은 계정 다른 화면 알림도 정리했습니다" : "무사히 끝났습니다"); } render();
    });
  }
  /** 다른 화면에서 «안부 확인 완료»·확정이 오면 이 기기 안전 모드도 맞춘다 */
  function safeAdopt() {
    var sf = lsGet(LS_SAFE, null); if (!sf || !SY.safety) return;
    var a = SY.safety.list()[sf.id]; if (!a) return;
    if (a.state === "end") { try { localStorage.removeItem(LS_SAFE); } catch (e) { /* 무시 */ } }
    else if (a.min !== sf.min || (a.hok || 0) > (sf.hok || 0)) { sf.min = a.min; sf.hok = Math.max(sf.hok || 0, a.hok || 0); lsSet(LS_SAFE, sf); } // 다른 화면의 «연락했어요»도 맞춘다
  }
  /** 화면 맨 위 알림 줄 — 시간을 넘긴 안전 모드 + PC 첫 화면의 시연 알림(동료, 가상) */
  function safeAlerts() {
    var own = lsGet(LS_SAFE, null), all = SY.safety ? SY.safety.list() : {}, out = [];
    if (own && !ownTab(own)) own = null; // i6: 같은 브라우저 다른 창(시연 PC↔폰)은 «내 것»이 아님 — 조용한 도움 요청이 동료 창에 뜨게
    Object.keys(all).forEach(function (k) {
      var a = all[k], mine = own && own.id === a.id, who = a.by === "폰" ? "현장 폰" : mine ? "이 기기" : "같은 계정 " + (a.by || "화면");
      if (a.state === "end") { // ④ 무사 종료 — 사무실 화면에 10분 동안 조용히 남긴다
        if (a.fin === "safe" && /^(today|perf|plan)$/.test(cur) && Date.now() - (a.rev || 0) < 600e3) out.push({ id: a.id, hid: a.hid, area: a.area, done: true, at: a.rev, who: who });
        return;
      }
      var el = elMin(a.at), late = el >= a.min, st = SX ? SX.stage(a) : { lv: late ? 1 : 0, help: false, next: null };
      var help = st.help && !mine; // ③ 조용한 도움 요청은 보낸 기기에는 띄우지 않는다(티 안 나게)
      if (mine && /^(check|talk|record)$/.test(cur) && curArg === a.hid) return; // 그 집 화면엔 이미 띠가 있다
      if (help) out.push({ id: a.id, hid: a.hid, area: a.area, help: true, hat: a.hat, who: who });
      if (!late && a.state === "ok") return; // 72회차 ②: 한 번 «안부 확인 완료»한 알림은 다시 시간을 넘기기 전까지 칸을 차지하지 않는다
      if (late || /^(today|perf|plan)$/.test(cur)) out.push({ id: a.id, hid: a.hid, area: a.area, el: el, min: a.min, late: late, lv: st.lv, next: st.next, who: who });
    });
    if (cur === "today" && lsGet(LS_SDEMO, "") !== ymd(new Date())) {
      var dh = D.households[D.households.length - 1];
      if (dh) out.push({ id: "DEMO", hid: dh.id, area: dh.area, el: 52, min: A.safetyMin, late: true, lv: 1, next: { who: SX ? SX.WHO.lead : "팀장", inMin: 3 }, who: SX ? SX.WHO.peer : "동료", demo: true }); // 이름 뒤 «시연·가상» 꼬리표는 simTag
    }
    return out.sort(function (x, y) { return (y.help ? 2 : y.late ? 1 : 0) - (x.help ? 2 : x.late ? 1 : 0); });
  }
  function alertBar() {
    var L = safeAlerts(), sum = cur === "today" ? daySum() : ""; // ⑤ 하루 요약은 «오늘» 화면(PC·폰 같음)
    if (!L.length) return sum; // 72회차 ②: 알림이 없으면 칸 자체를 숨긴다(옛 «알림 없음» 빈 문구 삭제)
    return L.map(function (a) {
      if (a.help) return '<div class="sfa help" role="alert" data-sfid="' + esc(a.id) + '"><i></i><div><b>조용한 도움 요청 · ' + esc(a.who) + " · 가구 " + esc(a.hid) + " " + esc(a.area) + "</b><span>" + (a.hat ? hm(a.hat) + " 현장에서 보냄 · " : "") + "있는 곳: 방문 중인 가구(" + esc(a.area) + ") · 바로 전화하거나 함께 가 주세요</span></div>" +
        '<button type="button" data-sfhelp="' + esc(a.id) + '">연락했어요</button></div>';
      if (a.done) return '<div class="sfa calm done" role="status"><i></i><span>' + esc(a.who) + " · 가구 " + esc(a.hid) + " 방문 <b>무사히 끝남</b>" + (a.at ? " · " + hm(a.at) : "") + "</span></div>";
      var stg = a.lv >= 2 ? "2차 알림 · " + esc(SX ? SX.WHO.lead : "팀장") + "에게도 갔습니다" : a.next ? "1차 알림(동료) · " + Math.max(1, a.next.inMin) + "분 뒤 " + esc(a.next.who) + "에게도" : "";
      stg = simTag(stg);
      return a.late ? '<div class="sfa lv' + (a.lv || 1) + '" role="alert" data-sfid="' + esc(a.id) + '"><i></i><div><b>' + simTag(esc(a.who)) + " · 가구 " + esc(a.hid) + " " + esc(a.area) + ' 방문 <span data-sfel>' + a.el + "</span>분째</b><span>예정 " + a.min + "분을 넘겼습니다" + (stg ? " · " + stg : "") + " · 전화로 안부를 확인한 뒤 눌러 주세요</span></div>" +
        '<button type="button" data-sfack="' + esc(a.id) + '">안부 확인 완료</button></div>'
        : '<div class="sfa calm" role="status"><i></i><span>' + esc(a.who) + " · 가구 " + esc(a.hid) + " 방문 중 <b>" + a.el + "분째</b> · 예정 " + a.min + "분</span></div>";
    }).join("") + sum;
  }
  function bindAlerts(root) {
    root = root || app; root.querySelectorAll("[data-sfack]").forEach(function (b) { b.addEventListener("click", function () {
      vib(); var id = b.dataset.sfack;
      if (id === "DEMO") lsSet(LS_SDEMO, ymd(new Date()));
      else { var a = SY.safety.list()[id]; if (a) safePush(Object.assign({}, a, { min: elMin(a.at) + 20 }), "ok"); safeAdopt(); } // 도움 요청 횟수 등은 그대로 싣는다
      toast(id === "DEMO" ? "안부 확인 완료(시연 알림)" : live() ? "안부 확인 완료 · 현장 폰 알림도 해제했습니다" : "안부 확인 완료 · 이 브라우저의 다른 창에도 반영"); render();
    }); });
    root.querySelectorAll("[data-sfhelp]").forEach(function (b) { b.addEventListener("click", function () { // ③ 받은 쪽: «연락했어요»로 도움 요청을 닫는다
      vib(); var a = SY.safety && SY.safety.list()[b.dataset.sfhelp]; if (a) safePush(Object.assign({}, a, { hok: a.help }), a.state === "ok" ? "ok" : "on"); safeAdopt();
      toast(live() ? "도움 요청 확인 · 현장 폰에도 반영했습니다" : "도움 요청 확인 · 이 브라우저의 다른 창에도 반영"); render();
    }); });
  }

  // ═════ M3 현장 확인(④) — 명단 위기정보 유형으로 체크 5~8줄을 미리 골라 둔다. 한 줄에 한 번 누름 ═════
  // [키, 확인할 것, «문제 있음»이면 남길 현장 징후, 유형]
  var CHECKS = {
    "주거": [["heat", "난방·보일러가 돌아가는지", "난방 안 됨"], ["util", "전기·가스·물이 나오는지", "전기·가스 끊긴 흔적"], ["leak", "누수·곰팡이·고칠 곳", "집 고칠 곳 있음"]],
    "생계": [["food", "냉장고·먹을 것이 있는지", "끼니 거름"], ["bill", "독촉장·고지서가 쌓였는지", "고지서 쌓임"]],
    "건강": [["med", "약 봉투·복약 상태", "복약 관리 어려움"], ["adl", "혼자 걷기·씻기가 되는지", "거동 불편"]],
    "고립": [["fam", "연락하는 가족·이웃이 있는지", "연락하는 가족 없음"], ["mail", "우편물·신문이 쌓였는지", "우편물 쌓임"]],
    "돌봄": [["carer", "끼니·씻기를 도와줄 사람이 있는지", "돌볼 사람 없음"]]
  };
  var CHECK_BASE = ["live", "명단 주소에 실제로 사는지", "실거주 확인 필요"];
  var CHECK_ABSENT = [["mailbox", "우편함·문 앞에 쌓인 것", "우편물 쌓임", "고립"], ["light", "불빛·인기척", "인기척 없음", "고립"], ["nbr", "이웃에게 최근 모습 묻기", "이웃이 최근 못 봄", "고립"], ["tong", "통·이장에게 근황 묻기", "통·이장 확인 필요", "고립"], ["meter", "계량기·보일러 연통 돌아가는지", "난방 안 됨", "주거"]];
  function isField(t) { if (FIELD_SIGNS.indexOf(t) >= 0) return true; var all = [CHECK_BASE].concat(CHECK_ABSENT); Object.keys(CHECKS).forEach(function (k) { all = all.concat(CHECKS[k]); }); return all.some(function (c) { return c[2] === t; }); }
  var TYPE_COL = { "주거": "#2F6FB1", "생계": "#B7791F", "건강": "#A63D31", "고립": "#6B5BA8", "돌봄": "#2E8270", "공통": "#47535B" };
  function checkList(h, absent) {
    if (absent) return CHECK_ABSENT.map(function (c) { return { k: c[0], q: c[1], sign: c[2], type: c[3] }; });
    var out = [{ k: CHECK_BASE[0], q: CHECK_BASE[1], sign: CHECK_BASE[2], type: "공통" }], ts = typesFor(h);
    var order = ts.concat(["고립", "생계", "주거", "건강", "돌봄"].filter(function (t) { return ts.indexOf(t) < 0; }));
    order.forEach(function (t) { (CHECKS[t] || []).forEach(function (c) { if (out.length < 8 && (ts.indexOf(t) >= 0 || out.length < 5)) out.push({ k: c[0], q: c[1], sign: c[2], type: t, why: ts.indexOf(t) >= 0 }); }); });
    return out;
  }
  function badTypes(hid, o) { var bad = o.checks || {}; return uniq(checkList(BY[hid], o.res === "absent").filter(function (c) { return bad[c.k] === "bad" && c.type !== "공통"; }).map(function (c) { return c.type; })); }
  function checkView(want) {
    var k = pickHid(want); if (!k) return phEmpty();
    var hid = k.hid, h = BY[hid], o = recOf(hid), absent = o.res === "absent", L = checkList(h, absent), ck = o.checks || {};
    var doneN = L.filter(function (c) { return ck[c.k]; }).length, badN = L.filter(function (c) { return ck[c.k] === "bad"; }).length, reasons = indText(h);
    var C = 2 * Math.PI * 22, off = C * (1 - (L.length ? doneN / L.length : 0));
    var rows = L.map(function (c, i) {
      var st = ck[c.k] || "";
      return '<li class="ck-row' + (st ? " " + st : "") + '" style="--tc:' + TYPE_COL[c.type] + '"><span class="ck-n">' + (st === "ok" ? "✓" : st === "bad" ? "!" : i + 1) + '</span><div class="ck-q"><b>' + esc(c.q) + '</b><small><em>' + esc(c.type) + "</em>" + (c.why ? " 명단 위기정보에서 골라 둠" : absent ? " 부재 때 확인" : " 기본 확인") + (st === "bad" ? " · 징후 «" + esc(c.sign) + "»로 기록" : "") + "</small></div>" +
        '<div class="ck-b" role="group" aria-label="' + esc(c.q) + '"><button type="button" data-ck="' + c.k + '" data-v="ok" aria-pressed="' + (st === "ok") + '">괜찮음</button><button type="button" class="bad" data-ck="' + c.k + '" data-v="bad" aria-pressed="' + (st === "bad") + '">문제 있음</button></div></li>';
    }).join("");
    var crit = absent ? "" : '<span class="why crit"><b>소득·재산 기준은 여기서 판정하지 않습니다</b> — 선정기준 원문(한국사회보장정보원 복지서비스)은 «상담» 화면에 요약해 두었습니다 · 판정은 담당 확인</span>';
    // S12-x 66회차: 시안 v3 scrField(check) — 첫 칸(단계 줄 · 안전 모드 · 가구 카드 · 집 안/문 앞) | 둘째 칸(현장 확인 목록 · 판단 근거 막대 · 상담으로)
    return '<main class="phx">' + mini(3, hid) +
      '<section class="card next ck-head"><div class="hh"><span class="no">' + (k.c.d.ids.indexOf(hid) + 1) + '</span><span class="t"><b>' + esc(h.area + " " + hid) + "</b><small>" + esc(ageLine(h)) + " · 확인 " + doneN + "/" + L.length + '</small></span><svg class="ck-ring" viewBox="0 0 56 56" role="img" aria-label="확인 ' + doneN + "/" + L.length + '"><circle cx="28" cy="28" r="22" fill="none" stroke="#E1E5EB" stroke-width="7"/><circle cx="28" cy="28" r="22" fill="none" stroke="var(--go)" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 28 28)"/><text x="28" y="33" text-anchor="middle" font-size="15" font-weight="900" fill="#11181C">' + doneN + "/" + L.length + "</text></svg></div></section>" +
      '<div class="subseg" role="radiogroup" aria-label="어디서 확인하나요"><button type="button" role="radio" class="pr' + (absent ? "" : " on") + '" data-place="met" aria-checked="' + !absent + '">집 안 · 만남</button><button type="button" role="radio" class="pr' + (absent ? " on" : "") + '" data-place="absent" aria-checked="' + absent + '">문 앞 · 못 만남</button></div>' + C2 +
      '<section class="card"><h3>현장 확인<span class="num">' + doneN + "/" + L.length + '</span></h3><ul class="cks">' + rows + "</ul>" +
      // S12-v U18(F7): 누르지 않은 줄만 «괜찮음»으로 채움 · 다시 누르면 채운 줄만 비움
      (L.length && (doneN < L.length || (o.allOk || []).length) ? '<button type="button" class="sbtn ck-all" data-act="ckall" aria-pressed="' + !!(o.allOk || []).length + '">' + ((o.allOk || []).length ? "모두 괜찮음 취소" : "나머지 모두 괜찮음 · " + (L.length - doneN) + "줄") + "</button>" : "") +
      '<div class="meter" aria-hidden="true"><i class="m3" style="width:' + (L.length ? badN / L.length * 100 : 0).toFixed(1) + '%"></i><i class="m-ok" style="width:' + (L.length ? (doneN - badN) / L.length * 100 : 0).toFixed(1) + '%"></i></div><div class="mlg"><span>문제 있음 <b>' + badN + "</b></span><span>괜찮음 <b>" + (doneN - badN) + "</b></span><span>안 봄 <b>" + (L.length - doneN) + "</b></span></div>" + crit + "</section>" +
      C2 + // 68회차 ⑮ 폴드·PC: 현장 확인 목록 | 부재 정리·판단 근거·다음 단추 두 칸(한 칸에 다 몰려 기울던 것)
      (absent && FD ? FD.awayPanel(hid) : "") + // S12-i3 ② 간접 확인·부재 메모·쪽지·문자·다음 방문
      '<section class="card vs" aria-label="판단 근거 카드"><div class="ch"><h3>판단 근거</h3><span class="samp">점수 없음</span></div><div class="evt"><div><dt>명단 사유</dt><dd>' + reasons.length + '가지</dd></div><div><dt>현장에서 더 본 징후</dt><dd>' + badN + '건</dd></div></div><span class="why">판단은 담당자 · 현장 징후는 기록과 보고서에 그대로 들어갑니다</span></section>' +
      (absent ? '<button class="btn pri" type="button" data-act="absave" data-dock="1">' + (I.away || "") + '부재로 기록 저장 <small>' + esc(FD && FD.nextOf(hid) ? FD.nextOf(hid).line : "다음 시도 시간대 자동") + "</small></button>" // S12-v U4(F3): 기록 화면을 건너뛰고 바로 확정
        : '<a class="btn pri" data-dock="1" href="#talk:' + hid + '">' + (I.talk || "") + '상담 시작 <small>질문 ' + Math.min(5, questionsFor(hid, o).length) + "개 · 서비스 " + svcFor(h, badTypes(hid, o)).length + "개 준비됨</small></a>") +
      (absent ? '<a class="btn sm ghost" href="#record:' + hid + '">기록 화면에서 더 쓰기</a>' : '<span class="why">체크는 기록 화면에 미리 채워집니다</span>') +
      qcards("이 단계의 다른 기능", [
        absent ? null : ["check", "나머지 모두 괜찮음", "누르지 않은 줄만 한 번에", 'data-qto="[data-act=ckall]"'],
        ["eye", "판단 근거", "명단 사유와 현장 징후 나란히", 'data-qto=".vs"'],
        absent && FD ? ["away", "부재일 때", "간접 확인·쪽지·문자·다음 방문", 'data-qto=".fd-away"'] : ["away", "못 만났어요", "문 앞 확인 → 부재 기록", 'data-go="#check:' + hid + '"'],
        ["home2", "집 앞 요약", "발굴 이유·지난 기록 다시 보기", 'data-go="#home:' + hid + '"']
      ]) + "</main>";
  }
  function bindCheck(want) {
    var k = pickHid(want); if (!k) return;
    var hid = k.hid, o = recOf(hid); o.checks = o.checks || {};
    if (FD && o.res === "absent") FD.bindAway(app, hid);
    var as = app.querySelector('[data-act="absave"]'); if (as) as.addEventListener("click", function () { vib(); saveRec(hid, o); saveRecord(k.c, hid); });
    app.querySelectorAll("[data-place]").forEach(function (b) { b.addEventListener("click", function () { o.res = b.dataset.place; vib(); saveRec(hid, o); render(); }); });
    app.querySelectorAll("[data-ck]").forEach(function (b) { b.addEventListener("click", function () {
      var c = checkList(BY[hid], o.res === "absent").filter(function (x) { return x.k === b.dataset.ck; })[0]; if (!c) return;
      var v = o.checks[c.k] === b.dataset.v ? "" : b.dataset.v; o.checks[c.k] = v;
      o.signs = o.signs || {}; if (v === "bad") o.signs[c.sign] = true; else delete o.signs[c.sign]; // S12-v U11: 명단 위기정보는 미리 징후로 넣지 않는다
      if (o.allOk) o.allOk = o.allOk.filter(function (x) { return x !== c.k; }); // 손으로 고친 줄은 «모두 괜찮음» 묶음에서 뺀다
      vib(); saveRec(hid, o); render();
    }); });
    var ca = app.querySelector('[data-act="ckall"]'); if (ca) ca.addEventListener("click", function () {
      var L = checkList(BY[hid], o.res === "absent");
      if ((o.allOk || []).length) { o.allOk.forEach(function (x) { if (o.checks[x] === "ok") o.checks[x] = ""; }); o.allOk = []; }
      else o.allOk = L.filter(function (c) { return !o.checks[c.k]; }).map(function (c) { o.checks[c.k] = "ok"; return c.k; });
      vib(); saveRec(hid, o); render();
    });
    bindSafe();
  }

  // ═════ M4 상담 도움(⑤) — 질문 순서 카드 + 받을 수 있는 서비스 원문 요약(판정 아님) ═════
  var SVDB = null, svP = null, svFail = false;
  // S12-v U13(B8): 실패하면 약속을 비워 두고(svP = null) «연결되면 다시 불러옵니다» → online 때 다시 부른다(새로고침 없이)
  function needSvc() {
    if (SVDB) return Promise.resolve(SVDB);
    if (!svP) svP = new Promise(function (ok, no) { if (window.__DAEUM_SERVICES__) return ok(); var s = document.createElement("script"); s.src = "data/services.js"; s.onload = ok; s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); no(new Error("svc")); }; document.head.appendChild(s); })
      .then(function () { SVDB = {}; ((window.__DAEUM_SERVICES__ || {}).services || []).forEach(function (x) { SVDB[x.id.replace(/^D\d-/, "")] = x; }); svFail = false; return SVDB; },
        function (e) { svP = null; svFail = true; throw e; });
    return svP;
  }
  function plain(t) { var d = document.createElement("textarea"); d.innerHTML = String(t || ""); return d.value.replace(/\s+/g, " ").trim(); }
  function askedOf(hid) { return ((F.store.get("askChecked", {}) || {})[hid]) || {}; }
  function questionsFor(hid, o) {
    var ty = uniq(badTypes(hid, o).concat(typesFor(BY[hid]))).filter(function (t) { return F.askGuide.TYPES[t]; }); if (!ty.length) ty = ["생계"];
    var out = [], bt = badTypes(hid, o), mx = 4;
    // 유형마다 돌아가며 한 개씩(문제 있음으로 고른 유형이 앞) — 5장 안에 여러 유형이 고루 들어가게
    for (var r = 0; r < mx; r++) ty.forEach(function (t) { var q = F.askGuide.TYPES[t][r]; if (q && (r < 2 || bt.indexOf(t) >= 0)) out.push({ type: t, key: q.key, q: q.q }); });
    return out.slice(0, Math.max(3, Math.min(5, out.length)));
  }
  var qIdx = {};
  function talkView(want) {
    var k = pickHid(want); if (!k) return phEmpty();
    var hid = k.hid, h = BY[hid], o = recOf(hid), Q = questionsFor(hid, o), asked = askedOf(hid), qi = Math.min(qIdx[hid] || 0, Q.length);
    var aN = Q.filter(function (q) { return asked[q.key]; }).length;
    var deck = qi >= Q.length ? '<div class="qcard done"><b>질문 ' + Q.length + "개 중 " + aN + '개 확인</b><span>' + (aN < Q.length ? "못 물은 것은 상담일지 «다음 방문 때 확인»에 자동으로 들어갑니다" : "빠진 질문 없음") + '</span><button type="button" class="sbtn" data-act="qre">처음부터 다시 보기</button></div>'
      : Q.slice(qi, qi + 3).map(function (q, j) { return '<div class="qcard' + (j ? " back b" + j : "") + '" style="--tc:' + TYPE_COL[q.type] + '"' + (j ? ' aria-hidden="true"' : "") + '><span class="qt"><em>' + esc(q.type) + "</em>" + (qi + j + 1) + " / " + Q.length + (asked[q.key] ? " · 물어봄" : "") + "</span><b>" + esc(q.q.replace(/\(([^)]*)\)/, " — $1")) + "</b></div>"; }).join("");
    var dots = '<div class="qdots">' + Q.map(function (q, i) { return '<i class="' + (asked[q.key] ? "on" : "") + (i === qi ? " now" : "") + '"></i>'; }).join("") + "</div>";
    var sv = svcFor(h, badTypes(hid, o)), loaded = !!SVDB;
    var cards = sv.map(function (s) {
      var x = loaded ? SVDB[s[0]] : null, on = !!(o.svcs || {})[s[0]];
      var body = x ? '<dl><dt>지원 대상</dt><dd>' + esc(clip(plain(x.target), 110)) + "</dd><dt>지원 내용</dt><dd>" + esc(clip(plain(x.support), 90)) + "</dd><dt>신청</dt><dd>" + esc(clip(plain(x.apply), 70)) + "</dd><dt>문의</dt><dd>" + esc(clip(plain(x.contact), 40)) + "</dd></dl>"
        : loaded ? '<p class="mute">원문 자료에 이 서비스가 없습니다 · 복지로에서 확인</p>' : '<p class="mute">' + (svFail ? "연결되면 원문 요약을 다시 불러옵니다" : "원문 요약 불러오는 중…") + "</p>";
      // S12-x 66회차(미르 넘김 ③): 옛 article.svc → 시안 v3 .svc 카드(.h 머리 · dl · 고르기) — 고르는 단추(data-svc)는 그대로
      return '<div class="svc' + (on ? " on" : "") + '"><div class="h"><span><span class="tag">' + esc(s[2]) + "</span><br><b>" + esc(s[1]) + '</b></span><span class="pick" aria-hidden="true">' + (I.check || "✓") + "</span></div>" + body +
        '<button type="button" class="evb svc-t" data-svc="' + s[0] + '" aria-pressed="' + on + '">' + (on ? "✓ 연계 후보로 넣음" : "연계 후보로 넣기") + "</button></div>";
    }).join("");
    // S12-x 66회차: 시안 v3 scrField(consult) — 첫 칸(단계 줄 · 안전 모드 · 질문 순서) | 둘째 칸(받을 수 있는 서비스 · 의뢰 사유 · 기록으로)
    return '<main class="phx">' + mini(4, hid) +
      '<section class="card qwrap" aria-label="질문 순서 카드"><h3>질문 순서<span>' + esc(h.area + " " + hid) + " · 현장 확인에서 고른 것부터</span></h3><div class=\"deck\">" + deck + "</div>" + dots +
      (qi < Q.length ? '<div class="row2"><button type="button" class="btn sm ghost" data-act="qskip">넘기기</button><button type="button" class="btn sm pri" data-act="qok">물어봤어요 ›</button></div>' : "") + "</section>" + C2 +
      '<section class="card" aria-label="받을 수 있는 서비스"><h3>받을 수 있는 서비스<span>고른 것 ' + Object.keys(o.svcs || {}).filter(function (x) { return o.svcs[x]; }).length + '개 → 의뢰서로</span></h3><div class="list svcs">' + cards + "</div>" +
      '<span class="why srcline">서비스 원문 요약입니다. 선정 결정이 아닙니다 · 출처: <i class="src-ico" aria-hidden="true"></i>한국사회보장정보원 중앙부처복지서비스(15090532)·지자체복지서비스(15108347) 공공데이터 2026-11-02 수집본 · 판정은 담당 공무원</span></section>' +
      (FD ? FD.referWhy(hid) : "") + // S12-i3 연계 의뢰 사유(예시 칩 + 직접 입력)
      '<a class="btn pri" data-dock="1" href="#record:' + hid + '">' + (I.record || "") + '상담 끝 · 기록하기 <small>고른 것 ' + Object.keys(o.svcs || {}).filter(function (x) { return o.svcs[x]; }).length + "개 미리 채움</small></a>" +
      '<span class="why">질문·서비스는 상담일지에 그대로 들어갑니다</span>' +
      qcards("이 단계의 다른 기능", [
        ["talk", "질문 순서 카드", "넘기기 · 물어봤어요", 'data-qto=".qwrap"'],
        ["report", "받을 수 있는 서비스", "한국사회보장정보원 원문 요약", 'data-qto=".svcs"'],
        FD ? ["pen", "연계 의뢰 사유", "예시 칩 + 직접 입력", 'data-qto=".fd-ref"'] : null,
        ["check", "현장 확인 다시", "괜찮음/문제 있음 고치기", 'data-go="#check:' + hid + '"']
      ]) + "</main>";
  }
  function bindTalk(want) {
    var k = pickHid(want); if (!k) return;
    var hid = k.hid, o = recOf(hid), Q = questionsFor(hid, o);
    if (!SVDB && !svFail) needSvc().then(function () { if (cur === "talk") render(); }, function () { if (cur === "talk") render(); }); // 원문 없이도 이름은 보임 · 실패 안내는 한 번만 그림
    function step(mark) {
      var i = qIdx[hid] || 0, q = Q[i];
      if (mark && q) { var all = F.store.get("askChecked", {}) || {}, m = all[hid] || {}; m[q.key] = true; all[hid] = m; F.store.set("askChecked", all); }
      qIdx[hid] = i + 1; vib(); render();
    }
    var ok = app.querySelector('[data-act="qok"]'); if (ok) ok.addEventListener("click", function () { step(true); });
    var sk = app.querySelector('[data-act="qskip"]'); if (sk) sk.addEventListener("click", function () { step(false); });
    var re = app.querySelector('[data-act="qre"]'); if (re) re.addEventListener("click", function () { qIdx[hid] = 0; render(); });
    app.querySelectorAll("[data-svc]").forEach(function (b) { b.addEventListener("click", function () { o.svcs = o.svcs || {}; o.svcs[b.dataset.svc] = !o.svcs[b.dataset.svc]; vib(); saveRec(hid, o); render(); }); });
    if (FD) FD.bindRefer(app, hid);
    bindSafe();
  }

  // ═════ M5 상담 후 기록(⑥) — ④ 현장 확인·⑤ 연계 후보가 미리 채워짐 ═════
  function recOf(hid) {
    var all = lsGet(LS_REC, {}) || {}, o = all[hid];
    if (!o) {
      // S12-v U11: 명단 위기정보·연계 후보를 미리 고르지 않는다 — 고르지 않고 확정해도 «현장에서 안내함·현장 상황»으로 남던 것(감사 때 사실과 다른 기록).
      //   명단 위기정보는 «명단 사유» 줄(indText)에만, 현장 상황·대응은 담당자가 «문제 있음»·«연계 후보로 넣기»를 눌렀을 때만
      o = { res: "met", signs: {}, svcs: {}, checks: {}, memo: "", refuse: "", at: new Date().toISOString() };
    }
    return o;
  }
  /** S12-v U4: 부재 메모는 FD 한 곳(없으면 옛 기록 칸) */
  function awayOf(hid, o) { return FD ? (FD.get(hid).away || "") : (o.away || ""); }
  /** S12-v U10: 의뢰 사유 — 이 기기 입력(FD) → 없으면 서버 기록 메모의 «의뢰 사유: …» */
  function refWhyOf(id, memo) { var v = FD && FD.get(id).refwhy; if (v) return v; var m = /의뢰 사유: (.+)$/.exec(String(memo || "")); return m ? m[1].trim() : ""; }
  function memoNoWhy(memo) { return String(memo || "").replace(/\s*의뢰 사유: .+$/, ""); }
  function saveRec(hid, o) { var all = lsGet(LS_REC, {}) || {}; all[hid] = o; lsSet(LS_REC, all); }
  function chosenSvcs(hid, o) { return svcFor(BY[hid], badTypes(hid, o)).filter(function (s) { return o.svcs[s[0]]; }); }
  function chosenSigns(o) { return Object.keys(o.signs || {}).filter(function (k) { return o.signs[k]; }); }
  var NEED = { "주거": "난방·주거비 도움", "생계": "생활비 부담 덜기", "건강": "병원·약 챙기기", "고립": "안부 확인·말벗" };
  function markWords(t) { return esc(t).replace(/(끊겨|끊김|끊긴|밀려|밀림|밀렸|체납|아프|아파|병원|약|혼자|외롭|굶|끼니|추워|난방|보일러|독촉|연체|월세|우울)/g, "<mark>$1</mark>"); }
  /** 받아쓴 말 다듬기(규칙): 군말·되풀이 빼고 문장 끝을 마침표로 — 뜻은 바꾸지 않는다 */
  function tidy(t) {
    t = String(t || "").replace(/(^|\s)(음+|어+|아+|그+|저기|뭐랄까|이제|막)(?=\s|[,.]|$)/g, "$1").replace(/\s+/g, " ").replace(/(^| )((?:\S+ ){0,2}\S+)(?: \2)+(?= |$)/g, "$1$2").replace(/\s*,\s*/g, ", ").trim();
    return t.replace(/([.。!?]) +/g, "$1\n").split("\n").map(function (x) { x = x.trim(); return x && !/[.。!?]$/.test(x) ? x + "." : x; }).filter(Boolean).join(" ");
  }
  /** 상담일지 초안(규칙 «자동 정리» — 실제 AI 아님): 체크·연계 후보·말한 글 → 쟁점·욕구·다음. 숫자·날짜는 규칙, 문장은 담당자가 확인 */
  function recDraft(hid, o) {
    var h = BY[hid], sg = chosenSigns(o), sv = chosenSvcs(hid, o), memo = o.memo || "";
    var types = uniq(F.askGuide.detect(memo + " " + sg.join(" ")).concat(typesFor(h)));
    var due = ymd(U.addWorkdays(new Date(), A.retryGap));
    var pr = F.promises.extract(memo, { householdId: hid, label: "가구 " + hid, area: h.area, at: new Date() });
    var said = tidy(memo).replace(/([.。!?]) +/g, "$1\n").split("\n").filter(Boolean).slice(0, 2).map(function (x) { return clip(x, 46); }).join(" ");
    return { issue: [sg.length ? sg.slice(0, 4).join(", ") + " 확인" : "", said ? "본인 말씀: " + said : ""].filter(Boolean).join(" · "), need: types.map(function (t) { return NEED[t]; }).filter(Boolean).join(" · "),
      next: pr[0] ? (pr[0].due ? mdDot(pr[0].due) + " " : "") + pr[0].text : sv.length ? mdDot(due) + " " + sv[0][1] + " 신청 여부 확인" : mdDot(due) + " 전화로 안부 확인", due: pr[0] && pr[0].due || due, pr: pr, sv: sv, sg: sg };
  }
  // S12-i2: 기록 메인 = «상황 고르기 → 문장 자동 조립»(app/record.js DaeumRecord) · 서브 = 말하기(시간 제한 없음)·글로 쓰기 · 실제 보고서 형태로 보기
  var RC = window.DaeumRecord, recFold = true, exGrp = { memo: null, away: null };
  function recCtx(hid, o) {
    var h = BY[hid], L = checkList(h, o.res === "absent"), ck = o.checks || {};
    return { types: uniq(typesFor(h).concat(badTypes(hid, o))), listTypes: typesFor(h), fieldTypes: badTypes(hid, o), signs: chosenSigns(o), svcNames: chosenSvcs(hid, o).map(function (s) { return s[1]; }),
      single: !!h.single, kid: (h.members || []).some(function (m) { return m && m.age != null && m.age < 19; }), res: o.res, now: new Date(),
      checkN: L.filter(function (c) { return ck[c.k]; }).length, badN: L.filter(function (c) { return ck[c.k] === "bad"; }).length };
  }
  function recDraftSec(hid, o, ctx) {
    var c = o.cmp, L = RC.lines(c, ctx), dr = recDraft(hid, o), nx = RC.nextOf(c.next, ctx.now), act = RC.vals(c, "act"), said = tidy(o.memo || "");
    return '<section class="card draft" aria-live="polite" data-rc="draft"><h3>상담일지 초안<span>자동 정리 · 담당자 확인 전</span></h3>' +
      "<p><b>상황</b><span>" + (L.length ? esc(L.filter(function (l) { return !/^(대응|다음 확인):/.test(l); }).slice(0, 4).join(" ")) : '<span class="empty">상황을 고르면 채워짐</span>') + "</span></p>" +
      "<p><b>말씀</b><span>" + (said ? markWords(clip(said, 120)) : "—") + "</span></p>" +
      "<p><b>연계</b><span>" + (act.length ? esc(act.join(", ")) : '<span class="empty">대응을 고르면 채워짐</span>') + '</span></p><p><b>다음</b><span class="rule">' + esc(nx ? nx.text : dr.next) + "</span></p>" +
      '<small class="dnote">고른 상황·덧붙인 말·연계를 정해진 규칙으로 옮긴 것입니다 · 위에서 고치면 다시 정리됩니다</small></section>';
  }
  // ── S12-v U6·U23(E1·1-4) AI 요약·연계 추천 — shared/ai.js ↔ 서버 함수 daeum-ai(config.aiEndpoint). 실패·꺼짐이면 위 «자동 정리» 문장을 그대로 쓴다 ──
  //   보내는 글 = 고른 상황 문장 + 덧붙인 말, 화면에서 F.mask 로 먼저 가린 뒤(ai.js 가 한 번 더, 서버 redact.ts 가 또 한 번). 가구 번호·읍면은 보내지 않는다.
  //   누를 때만 부른다(입력마다 부르지 않음 — 하루 상한 보호). 결과는 «담당자 확인 전»이고, «기록에 넣기»를 눌러야 확정 기록에 실린다.
  var aiP = null, aiBusy = {};
  function needAI() {
    if (window.DaeumAI) return Promise.resolve(window.DaeumAI);
    if (!aiP) aiP = new Promise(function (ok, no) { var s = document.createElement("script"); s.src = "shared/ai.js?v=s12z81"; s.onload = function () { window.DaeumAI ? ok(window.DaeumAI) : no(new Error("ai")); }; s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); no(new Error("ai")); }; document.head.appendChild(s); })
      .catch(function (e) { aiP = null; throw e; });
    return aiP;
  }
  var NEED_OF_TYPE = { "주거": ["주거", "에너지"], "생계": ["생계"], "건강": ["의료"], "고립": ["돌봄"], "돌봄": ["돌봄"] };
  function aiText(o, ctx) { return F.mask((RC.lines(o.cmp, ctx).join(" ") + (o.memo ? " 말씀: " + tidy(o.memo) : "")).trim()).slice(0, 1000); }
  function aiCtx(hid, o, AI) {
    var h = BY[hid], pri = {};
    uniq(typesFor(h).concat(badTypes(hid, o))).forEach(function (t) { (SVC[t] || []).forEach(function (s) { pri[s[0]] = (pri[s[0]] || []).concat(NEED_OF_TYPE[t] || []); }); });
    var services = Object.keys(SVDB || {}).map(function (k) { var s = SVDB[k], tg = AI.needsFromRule(s.rule); return { id: s.id, name: s.name, org: s.provider, tags: uniq(tg.concat(pri[k] || [])), ptags: pri[k] ? uniq(pri[k]) : undefined, target: s.target, support: s.support, rule: s.rule }; });
    return { label: "방문 상담", factors: Object.keys(h.indicators || {}).filter(function (k) { return h.indicators[k]; }).map(function (k) { return { key: k, name: IND[k] || k }; }), services: services };
  }
  function askAI(hid, o, ctx) {
    if (aiBusy[hid]) return; aiBusy[hid] = true; render();
    var text = aiText(o, ctx), done = function (r) { aiBusy[hid] = false; o.ai = r; saveRec(hid, o); if (cur === "record") render(); };
    needAI().then(function (AI) { return needSvc().then(function () { return AI.summarize(text, aiCtx(hid, o, AI)); }).then(function (r) {
      if (r.source !== "ai") return done({ src: "rule", at: new Date().toISOString(), why: r.fallback ? "연결 실패" : "AI 꺼짐" });
      var byId = {}; Object.keys(SVDB || {}).forEach(function (k) { byId[SVDB[k].id] = SVDB[k]; });
      done({ src: "ai", at: new Date().toISOString(), summary: F.mask(String(r.summary || "")).slice(0, 300), picks: (r.serviceIds || []).filter(function (id) { return byId[id]; }).slice(0, 3).map(function (id) { return { name: byId[id].name, why: F.mask(String((r.reasons || {})[id] || "")).slice(0, 120) }; }), use: false });
    }); }).catch(function () { done({ src: "rule", at: new Date().toISOString(), why: "연결 실패" }); });
  }
  function recAISec(hid, o) {
    var a = o.ai, busy = aiBusy[hid], hint = '<small class="dnote">보내기 전에 이름·주소·연락처를 가립니다 · «씨·어르신» 없이 쓴 이름은 다 못 가릴 수 있으니 이름은 쓰지 마세요</small>';
    if (busy) return '<section class="card draft rc-ai" aria-live="polite"><h3>AI 요약 · 연계 추천<span>묻는 중…</span></h3>' + hint + "</section>";
    if (a && a.src === "ai") return '<section class="card draft rc-ai" aria-live="polite"><h3>AI 요약 · 연계 추천<span>' + (a.use ? "기록에 넣음" : "담당자 확인 전") + "</span></h3>" +
      "<p><b>요약</b><span>" + esc(a.summary || "—") + "</span></p>" + (a.picks && a.picks.length ? "<p><b>추천</b><span>" + a.picks.map(function (p) { return "<b>" + esc(p.name) + "</b>" + (p.why ? " — " + esc(p.why) : ""); }).join("<br>") + "</span></p>" : "") +
      '<div class="row2"><button type="button" class="btn sm ghost" data-act="aiask">다시 묻기</button><button type="button" class="btn sm" data-act="aiuse" aria-pressed="' + !!a.use + '">' + (a.use ? "✓ 기록에 넣음" : "기록에 넣기") + "</button></div>" +
      '<small class="dnote">출처: 한국사회보장정보원 복지서비스 목록(15090532·15108347) 안에서만 고름 · 판정은 담당 공무원</small></section>';
    return '<section class="card draft rc-ai"><h3>AI 요약 · 연계 추천<span>누를 때만</span></h3>' +
      (a && a.src === "rule" ? '<p class="mute">AI에 연결되지 않아 위 «자동 정리» 문장을 그대로 씁니다.</p>' : "") +
      '<button type="button" class="btn sm ghost" data-act="aiask">' + (I.talk || "") + (a ? "다시 묻기" : "AI에게 요약·추천 받기") + "</button>" + hint + "</section>";
  }
  function recPaper(hid, o, ctx) {
    var h = BY[hid], c = o.cmp, nx = RC.nextOf(c.next, ctx.now), L = RC.lines(c, ctx).filter(function (l) { return !/^(대응|다음 확인):/.test(l) && !/^본인이|^의사 확인/.test(l); });
    return RC.paperHtml({ hid: hid, area: h.area, date: mdDot(new Date()), reasons: indText(h), checks: ctx.checkN ? "점검 " + ctx.checkN + "항목 · 문제 " + ctx.badN + "항목" + (RC.vals(c, "sit").length ? " · " + RC.vals(c, "sit").join(", ") : "") : "",
      lines: L, memo: tidy(o.memo || ""), will: c.will, act: RC.vals(c, "act"), next: nx ? nx.text : "" });
  }
  function record(want) {
    var k = pickHid(want); if (!k) return phEmpty();
    var c = k.c, hid = k.hid, h = BY[hid], o = recOf(hid), now = new Date();
    var safe = "", ctx = recCtx(hid, o); // 76회차: 안전 카드는 머리 «안전» 화면으로
    var nextId = c.d.ids.filter(function (id) { return id !== hid && statusOf(id) === "planned"; })[0];
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, met = "";
    if (o.res === "met") {
      o.cmp = RC.sync(o.cmp, ctx);
      met = RC.composerHtml(o.cmp, ctx, recFold) +
        RC.subHtml({ sr: !!SR, ex: RC.exHtml({ id: "memo", set: "memo", grp: exGrp.memo, pri: RC.vals(o.cmp, "cri"), value: o.memo || "", label: "글로 쓰기 · 예시로 채우기", rows: 3 }) }) +
        C2 + recDraftSec(hid, o, ctx) + recAISec(hid, o) + recPaper(hid, o, ctx); // S12-x 66회차: 둘째 칸 = 초안 확인(시안 «오른손 · 초안 확인»)
    }
    var att = attempts().filter(function (t) { return t.householdId === hid && /no_answer|absent/.test(t.result); }).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var n = att.length + 1, vt = F.visitTime.profile(attempts(), hid, { neighborLog: neighborLog() });
    var fd = FD ? FD.get(hid) : {}, fnx = FD ? FD.nextOf(hid) : null, awayV = FD ? fd.away || "" : o.away || "";
    var a3 = n >= 3 ? F.visitTime.afterThree(attempts().concat([{ householdId: hid, channel: "visit", result: "no_answer", at: now.toISOString() }]), hid, { area: h.area, neighborLog: neighborLog() }) : null;
    var absent = '<section class="card absent"><b class="h">이번이 ' + (n >= 3 ? "세 번째 이상" : n === 2 ? "두 번째" : "첫") + " 부재입니다</b>" +
      '<div class="tries">' + att.slice(-2).map(function (t) { return "<span>" + esc(mdDot(t.at) + " " + hm(t.at)) + " 부재</span>"; }).join("") + "<span>지금 " + hm(now) + " 부재</span></div>" +
      (fnx ? (fnx.close ? "<b>" + esc(fnx.line) + "</b>" : "다음 시도: <b>" + esc(fnx.line) + "</b>") + " · 저장하면 실적 › 할 일에 «다시 방문»으로 남깁니다." // S12-v U12(B7) · U4(F10): 현장 확인과 같은 계산(FD.nextOf)
        : "다음 시도: <b>" + esc(md(U.addWorkdays(now, A.retryGap))) + (vt.best ? " " + esc(vt.best.label + "(" + vt.best.hours + ")") : "") + "</b> · 근무일 " + A.retryGap + "일 뒤(가정) · 저장하면 실적 › 할 일에 «다시 방문»으로 남깁니다.") +
      (a3 ? '<div class="msg">' + esc(a3.steps[0].text) + '</div><div style="margin-top:8px"><button type="button" class="sbtn" data-act="copytong">통·이장 협조 문안 복사</button></div>' : "") +
      '<div class="grp" style="margin-top:10px;font-size:11px;font-weight:800;color:var(--mute)">문 앞에서 본 것</div><div class="tok">' + uniq(chosenSigns(o).concat(["우편물 쌓임", "불 꺼져 있음", "이웃이 최근 봄", "인기척 없음"])).map(function (s) { return '<button type="button" data-sign="' + s + '" aria-pressed="' + !!o.signs[s] + '">' + s + "</button>"; }).join("") + "</div>" +
      (fd.indirect ? '<p class="rc-indirect">간접 확인: ' + esc(fd.indirect) + ' <a href="#check:' + hid + '">고치기</a></p>' : "") +
      '<div class="rc-awayex">' + RC.exHtml({ id: "memo", set: "away", grp: exGrp.away, value: awayV, label: "부재 메모 · 예시로 채우기(문 앞 확인과 같은 칸)", rows: 2 }) + "</div></section>";
    var refuse = '<section class="card absent"><b class="h">지금은 필요 없다고 하셨습니다</b>근무일 5일 뒤(' + esc(md(U.addWorkdays(now, 5))) + ') 다시 권하도록 할 일에 넣습니다.<div style="margin-top:8px">' + (CH ? CH.html({ id: "refuseWhy", label: "거절 사유", hint: "예시를 누르거나 직접 쓰기", examples: REFUSE_EX, value: o.refuse || "", placeholder: "거절 사유 한 줄", maxlength: 60 })
      : '<label class="sr" for="refuseWhy">거절 사유</label><input class="in1" id="refuseWhy" maxlength="60" placeholder="거절 사유 한 줄(예: 자녀가 도와준다고 하심)" value="' + esc(o.refuse || "") + '">') + "</div></section>";
    var nextLbl = nextId ? "다음 가구 " + nextId + (arriveOf(c, nextId) ? " · " + arriveOf(c, nextId) : "") : "오늘 방문 끝 → 문서함";
    var fixNote = fixHid === hid ? '<p class="rc-indirect" role="status">이미 저장한 기록을 고칩니다 · 다시 저장하면 앞 기록을 대신합니다</p>' : ""; // S12-v U16(F4)
    // S12-x 66회차: 시안 v3 scrRecord — 가구 카드(.card.next) · 결과 한 번 누르기(.res 3칸) · 상황 고르기 | 둘째 칸 초안·AI·상담일지 종이
    var si = c.d.ids.indexOf(hid);
    return '<main class="phx rc-main">' + safe + fixNote +
      '<section class="card next idc"><div class="hh"><span class="no">' + (si + 1) + '</span><span class="t"><b>' + esc(h.area + " " + hid) + "</b><small>" + esc(ageLine(h)) + " · 방금 상담 · 안전 모드 " + (safeOn(hid) ? "켜짐" : "꺼짐") + "</small></span></div></section>" +
      '<section class="card"><h3>결과 한 번 누르기</h3><div class="res" role="radiogroup" aria-label="만난 결과">' + [["met", "만났어요", I.met], ["absent", "부재", I.away], ["refuse", "거절", I.no]].map(function (x) { return '<button type="button" role="radio" class="pr' + (o.res === x[0] ? " on" : "") + '" data-res="' + x[0] + '" aria-checked="' + (o.res === x[0]) + '">' + (x[2] || "") + x[1] + "</button>"; }).join("") + "</div></section>" +
      (o.res === "met" ? met : o.res === "absent" ? absent : refuse) + (o.res === "met" ? "" : C2) +
      '<button class="btn pri" type="button" data-act="save" data-dock="1">' + (I.check || "") + "기록 저장 <small>" + esc(nextLbl) + "</small></button>" +
      '<span class="why">' + (SY.state().mode === "live" ? "저장하면 사무실 PC에 바로 갑니다" : "저장하면 이 기기에 남습니다") + "</span>" +
      qcards("덧붙이기 · 보기", [
        o.res === "met" ? ["report", "보고서로 보기", "상담일지 한 장 미리보기", 'data-qto=".rc-paperw"'] : null,
        o.res === "met" ? ["pen", "말하기 · 글로 쓰기", "받아쓴 글만 남김 · 예시 칩", 'data-qto=".rc-sub"'] : null,
        o.res === "absent" && a3 ? ["copy", "통·이장 협조 문안", "세 번째 부재 · 복사", 'data-qto="[data-act=copytong]"'] : null,
        ["print", "문서함", "복명서·상담일지가 채워짐", 'data-go="#docs"'],
        ["hist", "실적 · 할 일", "다시 방문·약속", 'data-go="#perf"']
      ]) + "</main>";
  }
  var micRec = null, micT = null;
  function bindRecord(want) {
    var k = pickHid(want); if (!k) return;
    var hid = k.hid, o = recOf(hid), ctx = recCtx(hid, o);
    if (o.res === "met") { o.cmp = RC.sync(o.cmp, ctx); saveRec(hid, o); }
    function rerender() { saveRec(hid, o); render(); }
    function live() { // 입력 중엔 화면 전체를 다시 그리지 않고 초안·보고서 칸만 바꾼다(입력칸 포커스 유지)
      if (o.res !== "met") return;
      var d = app.querySelector('[data-rc="draft"]'); if (d) d.outerHTML = recDraftSec(hid, o, ctx);
      var p = app.querySelector(".rc-paperw"); if (p) { var op = p.open; p.outerHTML = recPaper(hid, o, ctx); if (op) app.querySelector(".rc-paperw").open = true; }
    }
    app.querySelectorAll("[data-res]").forEach(function (b) { b.addEventListener("click", function () { o.res = b.dataset.res; vib(); rerender(); }); });
    app.querySelectorAll("[data-sign]").forEach(function (b) { b.addEventListener("click", function () { var s = b.dataset.sign; o.signs[s] = !o.signs[s]; rerender(); }); });
    app.querySelectorAll("[data-cf]").forEach(function (b) {
      b.addEventListener("click", function () { vib(); RC.openSheet(o.cmp, b.dataset.cf, ctx, { save: function (c) { o.cmp = c; saveRec(hid, o); }, close: function () { render(); } }); });
    });
    var fold = app.querySelector(".rc-fold"); if (fold) fold.addEventListener("toggle", function () { recFold = fold.open; });
    if (o.res !== "refuse") {
      var set = o.res === "absent" ? "away" : "memo";
      RC.bindEx(app, "memo", set, function (v) { if (set === "away") { if (FD) FD.set(hid, "away", v); else o.away = v; } else o.memo = v; saveRec(hid, o); live(); }, function (g) { exGrp[set] = g; render(); });
    }
    var ty = app.querySelector('[data-act="typing"]'); if (ty) ty.addEventListener("click", function () { var m = document.getElementById("memo"); if (m) { m.focus(); try { m.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { /* 무시 */ } } });
    if (CH && app.querySelector('[data-chipin="refuseWhy"]')) CH.bind(app, "refuseWhy", function (v) { o.refuse = v; saveRec(hid, o); }); // S12-i1 공통 부품 사용 예
    else { var ri = document.getElementById("refuseWhy"); if (ri) ri.addEventListener("input", function () { o.refuse = ri.value; saveRec(hid, o); }); }
    bindSafe();
    var cp = app.querySelector('[data-act="copytong"]'); if (cp) cp.addEventListener("click", function () { var a3 = F.visitTime.afterThree(attempts(), hid, { area: BY[hid].area }); copy(a3.steps[0].text); });
    var mic = app.querySelector('[data-act="mic"]'); if (mic) mic.addEventListener("click", function () { toggleMic(hid, o, mic); });
    var aq = app.querySelector('[data-act="aiask"]'); if (aq) aq.addEventListener("click", function () { vib(); askAI(hid, o, ctx); }); // S12-v U6(E1)
    var au = app.querySelector('[data-act="aiuse"]'); if (au) au.addEventListener("click", function () { if (o.ai) { o.ai.use = !o.ai.use; vib(); rerender(); } });
    var sv = app.querySelector('[data-act="save"]'); if (sv) sv.addEventListener("click", function () { vib(); saveRecord(k.c, hid); });
  }
  function toggleMic(hid, o, btn) { // 시간 제한 없음 — 다시 누르거나 말이 끊기면 멈추고 받아쓴 글을 칸에 둔다
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    if (micRec) { micRec.stop(); return; }
    var rec = new SR(), t0 = Date.now(), base = o.memo ? o.memo + " " : "", got = "", box = btn.closest ? btn.closest(".rc-sub") : null;
    rec.lang = "ko-KR"; rec.continuous = true; rec.interimResults = true; micRec = rec; btn.classList.add("rec"); btn.setAttribute("aria-label", "말하기 멈추기"); if (box) box.classList.add("on");
    var lab = document.getElementById("mict"), memo = document.getElementById("memo");
    micT = setInterval(function () { if (lab) lab.textContent = RC.clock((Date.now() - t0) / 1000); }, 250);
    rec.onresult = function (e) { var fin = "", tmp = ""; for (var i = 0; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript; else tmp += e.results[i][0].transcript; } got = fin; if (memo) memo.value = base + fin + tmp; };
    rec.onerror = function () { toast("받아쓰기를 쓸 수 없습니다 — 글로 남겨 주세요"); };
    rec.onend = function () { clearInterval(micT); micRec = null; o.memo = (base + got).trim(); saveRec(hid, o); render(); };
    try { rec.start(); toast("말씀하세요 · 다시 누르면 멈춥니다"); } catch (e) { clearInterval(micT); micRec = null; }
  }
  function saveRecord(c, hid) {
    var o = recOf(hid), h = BY[hid], now = new Date(), dr = recDraft(hid, o), res = o.res, ctx = recCtx(hid, o), fdv = FD ? FD.get(hid) : {};
    var cm = res === "met" ? RC.sync(o.cmp, ctx) : null, L = cm ? RC.lines(cm, ctx) : [], sit = cm ? RC.vals(cm, "sit") : dr.sg, act = cm ? RC.vals(cm, "act") : [], nx = cm ? RC.nextOf(cm.next, now) : null;
    var memo = res === "met" ? ((sit.length ? "확인: " + sit.join(", ") + ". " : "") + L.filter(function (l) { return !/^현장 상황:/.test(l); }).join(" ") + (o.memo ? " 말씀: " + tidy(o.memo) : "")).trim()
      : res === "refuse" ? "거절: " + (o.refuse || "사유 없음") : "부재" + (dr.sg.length ? " · " + dr.sg.join(", ") : "") + (awayOf(hid, o) ? " · " + awayOf(hid, o) : "") + (fdv.indirect ? " · 간접 확인: " + fdv.indirect : "");
    if (res === "met" && o.ai && o.ai.src === "ai" && o.ai.use) memo = (memo + " AI 요약(담당자 확인): " + o.ai.summary + (o.ai.picks && o.ai.picks.length ? " · AI 추천: " + o.ai.picks.map(function (p) { return p.name; }).join(", ") : "")).trim(); // S12-v U6: «기록에 넣기»를 누른 것만
    if (res === "met" && fdv.refwhy) memo = (memo + " 의뢰 사유: " + fdv.refwhy).trim(); // S12-v U10: 의뢰 사유도 기록에 실어 서버로 → PC 문서함·의뢰서가 읽는다
    var found = res === "met" ? dr.pr.slice() : [];
    if (res === "met" && !found.length && act.length) found.push({ id: "PR-" + now.getTime() + "-s", householdId: hid, label: "가구 " + hid, area: h.area, text: act[0].replace(/ (신청 안내|안내|의뢰|연계)$/, "") + " 신청 여부 확인", kind: "apply", due: nx && nx.due || dr.due, src: "방문 기록", at: now.toISOString(), done: false, doneAt: null });
    else if (res === "met" && !found.length && nx && nx.due) found.push({ id: "PR-" + now.getTime() + "-n", householdId: hid, label: "가구 " + hid, area: h.area, text: nx.visit ? "다시 방문해 안부 확인" : "전화로 안부 확인", kind: "visit", due: nx.due, src: "방문 기록", at: now.toISOString(), done: false, doneAt: null });
    if (res === "refuse") found.push({ id: "PR-" + now.getTime() + "-r", householdId: hid, label: "가구 " + hid, area: h.area, text: "거절 뒤 다시 권유", kind: "visit", due: ymd(U.addWorkdays(now, 5)), src: "방문 결과", at: now.toISOString(), done: false, doneAt: null });
    if (found.length) F.store.set("promises", F.promises.merge(F.store.get("promises", []), found));
    var tags = uniq((cm ? RC.vals(cm, "cri") : []).concat(sit).concat(act.length ? act : dr.sv.map(function (s) { return s[1]; })).concat(F.askGuide.detect(memo))).slice(0, 12);
    // S12-v U16(F4): «기록 고치기»로 연 집이면 앞 기록(과 그때 만든 약속)을 빼고 새로 넣는다 · 되살릴 수 있게 초안·현장 메모를 남겨 둔다
    var LA = lsGet(LS_LAST, {}) || {};
    var fixAt = null; // S12-x: 고친 기록은 방문 일시를 그대로 두고(차수 유지) 고친 시각만 따로 남긴다
    if (fixHid === hid) { var pv = lastLog(hid), ps = LA[hid]; if (pv) fixAt = pv.at; if (pv && SY.removeLog) SY.removeLog(pv.id); if (ps && ps.pr) dropPromises(ps.pr); }
    fixHid = null;
    var snap = { rec: JSON.parse(JSON.stringify(o)), fd: { away: fdv.away || "", indirect: fdv.indirect || "", refwhy: fdv.refwhy || "" }, pr: found.map(function (x) { return x.id; }) };
    SY.addLog({ household_no: hid, at: fixAt || undefined, result: res, memo: memo, tags: tags, promises: found });
    var lg = lastLog(hid); snap.lid = lg ? lg.id : null; LA[hid] = snap; lsSet(LS_LAST, LA);
    if (fixAt && lg) { var HE = lsGet(LS_HEDIT, {}) || {}; HE[lg.id] = now.toISOString(); lsSet(LS_HEDIT, HE); }
    var all = lsGet(LS_REC, {}) || {}; delete all[hid]; lsSet(LS_REC, all);
    if (FD) ["away", "indirect", "refwhy"].forEach(function (x) { FD.set(hid, x, ""); }); // 기록에 실었으니 다음 방문에 옛 메모가 다시 채워지지 않게
    var sf = lsGet(LS_SAFE, null); if (sf && sf.hid === hid) { sf.fin = sf.fin || "rec"; safePush(sf, "end"); try { localStorage.removeItem(LS_SAFE); } catch (e) { /* 무시 */ } }
    var nx2 = c.d.ids.filter(function (id) { return id !== hid && statusOf(id) === "planned"; })[0];
    toastAct("기록을 저장했습니다 · " + (SY.state().mode === "live" ? "사무실 PC 문서함에 반영됨" : "이 기기에 저장"), "되돌리기", function () { reopenRec(hid, true); }, 5000);
    flowNext = { from: hid, to: nx2 || null, ids: c.d.ids.slice(), dest: nx2 ? "#route:" + nx2 : "#today" }; // S12-x «다음 할 일»: 저장한 자리 다음 화면 맨 위에 주 단추 하나
    location.hash = flowNext.dest;
  }
  // ── S12-x 업무 흐름(호창님 11-12 «일하는 흐름에 맞춰 자연스럽게») — 오늘 → 순서·동선 → 집 앞 → 들어가기 → 상담 끝 → 기록 → 저장 → 문서/다음 가구 → 하루 요약 ──
  var flowNext = null;
  function nextStepCard() {
    var f = flowNext; if (!f) return "";
    if (location.hash !== f.dest) { flowNext = null; return ""; }
    if (f.to && BY[f.to]) {
      var c = dayCtx(), t = c ? arriveOf(c, f.to) : "";
      return '<section class="card next nextstep" role="status" aria-label="다음 할 일"><span class="k">기록 저장됨 · ' + esc(f.from) + '</span><b>다음 가구 ' + esc(f.to) + " · " + esc(BY[f.to].area) + (t ? " · " + esc(t) + " 도착 예정" : "") + '</b><div class="row2"><a class="btn sm ghost" href="#docs">문서 만들기</a></div></section>'; // 68회차 ⑪: 집 앞으로 가는 주 단추는 동선 화면 «도착했어요» 하나(같은 곳 주 단추 둘 → 하나)
    }
    // 68회차 ⑫: 마지막 가구 → 바로 «오늘». 오늘 칸이 이 날을 보이면 끝 카드(방문 끝·하루 요약·보고서 열기)가 바로 아래라 한 줄만, 다른 날로 넘어갔으면 이 카드가 요약을 대신 보인다
    var dc = dayCtx(), same = dc && dc.d.ids.join() === (f.ids || []).join();
    if (same) return '<p class="nextstep-k" role="status">기록 저장됨 · ' + esc(f.from) + " · 오늘 마지막 가구</p>";
    return '<section class="card next nextstep" role="status" aria-label="하루 요약"><span class="k">기록 저장됨 · ' + esc(f.from) + '</span><b>이날 방문을 모두 마쳤습니다</b>' + daySumNums(f.ids) + '<div class="row2"><a class="btn pri" href="#docs">' + (I.report || "") + "보고서 열기</a></div></section>";
  }
  // ── S12-v U16(F4) 되돌리기 5초 · 기록 고치기 ──
  var LS_LAST = "daeum.s12.recLast", fixHid = null;
  function dropPromises(ids) { if (!ids || !ids.length) return; F.store.set("promises", (F.store.get("promises", []) || []).filter(function (p) { return ids.indexOf(p.id) < 0; })); }
  /** undo=true: 마지막 기록을 바로 빼고 초안을 되살림(«되돌리기») · undo=false: 초안만 되살리고 다시 확정할 때 앞 기록을 대신함(«기록 고치기») */
  function reopenRec(hid, undo) {
    var LA = lsGet(LS_LAST, {}) || {}, sn = LA[hid], L = lastLog(hid), same = sn && L && sn.lid === L.id;
    if (same) {
      var all = lsGet(LS_REC, {}) || {}; all[hid] = sn.rec; lsSet(LS_REC, all);
      if (FD && sn.fd) ["away", "indirect", "refwhy"].forEach(function (x) { if (sn.fd[x]) FD.set(hid, x, sn.fd[x]); });
    }
    if (undo) {
      if (L && SY.removeLog) SY.removeLog(L.id);
      if (same) { dropPromises(sn.pr); delete LA[hid]; lsSet(LS_LAST, LA); }
      fixHid = null; toast("되돌렸습니다 · 고친 뒤 다시 «기록 저장»을 누르세요");
    } else { fixHid = L ? hid : null; }
    if (location.hash === "#record:" + hid) render(); else location.hash = "#record:" + hid;
  }
  function toastAct(t, lbl, fn, ms) {
    toast(t); var el = document.getElementById("toast"); if (!el) return;
    var b = document.createElement("button"); b.type = "button"; b.className = "toast-act"; b.textContent = lbl;
    b.addEventListener("click", function () { clearTimeout(toastT); el.className = "toast"; fn(); });
    el.appendChild(b); clearTimeout(toastT); toastT = setTimeout(function () { el.className = "toast"; }, ms || 5000);
  }

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
          '<text x="' + X(p) + '" y="' + (+Y(p) + (nx ? 6 : 4.5)).toFixed(1) + '" text-anchor="middle" font-size="' + (nx ? 16 : 13) + '" font-weight="900" fill="' + (nx ? "#fff" : dn ? "#1B4D42" : "#11181C") + '">' + (dn ? "✓" : i + 1) + "</text></g>";
        if (nx || o.labels) g += '<text x="' + X(p) + '" y="' + (+Y(p) - r - 6).toFixed(1) + '" text-anchor="middle" font-size="11.5" font-weight="800" fill="#11181C" paint-order="stroke" stroke="#fff" stroke-width="4" font-family="IBM Plex Mono,monospace">' + id + "</text>";
      });
    });
    g += '<g filter="url(#' + o.id + 'sh)"><rect x="' + (+X(off) - 15) + '" y="' + (+Y(off) - 15) + '" width="30" height="30" rx="8" fill="#1B2328"/><text x="' + X(off) + '" y="' + (+Y(off) + 5) + '" text-anchor="middle" font-size="14" font-weight="900" fill="#fff">시</text></g>' +
      '<text x="' + X(off) + '" y="' + (+Y(off) + 30) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#47535B" paint-order="stroke" stroke="#fff" stroke-width="4">상주시청</text>';
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
    var ds = days(), dl = deadline(), p = plan();
    if (!ds.length) return top("plan", "<strong>방문 계획</strong>가상 데이터") + '<main class="wrap"><div class="emptyc blk"><b>명단이 아직 없습니다</b>한국사회보장정보원 발굴대상자 명단(행복이음 내려받기)을 불러오면 일차가 자동으로 나뉩니다.<br><br><a class="cta" href="#today" data-pick="1"><b>명단 불러오기</b><small>엑셀 파일</small></a></div></main>';
    if (!planDay || !ds.some(function (d) { return d.n === planDay; })) planDay = ds[0].n; // 72회차 ①: 방문 탭은 1일차부터(옛: 남은 집이 있는 첫 일차 → 2일차부터 보이던 것)
    var D4 = ds.filter(function (d) { return d.n === planDay; })[0], rb = rankBy(), mt = meta(), total = ds.reduce(function (a, d) { return a + d.ids.length; }, 0);
    var cards = ds.map(function (d) {
      var st = d.ids.map(statusOf), dn = st.filter(function (x) { return x !== "planned"; }).length;
      return '<button type="button" class="dcard' + (d.n === planDay ? " on" : "") + '" data-day="' + d.n + '"><span class="dn">' + d.n + '<small>일차</small></span><span class="dd">' + (d.date ? md(d.date) : "날짜 미정") + '</span><span class="dm"><b>' + d.ids.length + "</b>가구 · " + yak(d.s) + d.s.km + "km · " + d.s.end + ' 복귀</span><span class="dp" aria-hidden="true">' + d.ids.map(function (id) { var s = statusOf(id); return '<i class="' + (s === "planned" ? "" : s === "done" ? "ok" : "ab") + '"></i>'; }).join("") + "</span>" + (dn ? '<span class="dk">' + dn + "/" + d.ids.length + " 끝</span>" : "") + "</button>";
    }).join("");
    var ow = RP.overWork(D4.s), tl = '<li class="tp"><span class="t">09:30</span><span class="ax"><b class="o">시</b></span><span class="c">상주시청 출발</span></li>';
    D4.ids.forEach(function (id, i) {
      var row = D4.s.rows[i], h = BY[id], r = rb[id], m = mt[id] || {}, st = statusOf(id), pr = p && p.rows.filter(function (x) { return x.household_no === id; })[0];
      var lr = pr && pr.list_rank != null ? pr.list_rank : r ? r.listRank : m.prio || "—";
      if (row.lunchBefore) tl += '<li class="lunch"><span></span><span class="ax"></span><span class="c">12:00–13:00 점심</span></li>';
      tl += '<li class="leg"><span></span><span class="ax"></span><span class="c">차로 ' + (row.approx ? "약 " : "") + row.travelMin + "분 · " + row.km + "km" + (row.approx ? "" : " · 도로") + "</span></li>" +
        '<li class="stop' + (st !== "planned" ? " dn" : "") + '" draggable="true" data-di="' + i + '"><span class="t">' + row.arrive + "<small>~" + row.leave + '</small></span><span class="ax"><b>' + (i + 1) + '</b></span><div class="c"><div class="nm"><b>' + id + "</b>" + esc(h.area + " · " + ageLine(h)) + stTag(st) + '</div><div class="why"><span class="rk">한국사회보장정보원 ' + esc(lr) + "순위</span>" + esc(clip(indText(h).join(" · "), 40)) + "</div></div>" +
        '<div class="mv"><button type="button" data-mv="' + i + ':-1" aria-label="' + id + ' 앞으로"' + (i ? "" : " disabled") + '>▲</button><button type="button" data-mv="' + i + ':1" aria-label="' + id + ' 뒤로"' + (i < D4.ids.length - 1 ? "" : " disabled") + ">▼</button>" +
        '<button type="button" class="x" data-out="' + id + '" aria-label="' + id + ' 이 일차에서 빼기" title="이 일차에서 빼기"' + (st === "planned" && D4.ids.length > 1 ? "" : ' aria-disabled="true" data-why="' + (st !== "planned" ? "visited" : "last") + '"') + ">✕</button></div></li>"; // 77회차: disabled 면 눌러도 아무 반응이 없어 «먹통» → 흐리게 두고 누르면 이유를 알린다
    });
    var addable = ds.filter(function (d) { return d.n !== D4.n && d.ids.length > 1; }).reduce(function (a, d) { return a.concat(d.ids.filter(function (id) { return statusOf(id) === "planned"; }).map(function (id) { return { id: id, n: d.n }; })); }, []);
    var addSel = addable.length && D4.ids.length < RP.MAX_ROAD_STOPS ? '<label class="addin"><span class="sr">다른 일차 가구를 이 일차에 넣기</span><select data-act="addin"><option value="">+ 가구 넣기</option>' + addable.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.id) + " · " + esc(BY[x.id].area) + " · " + x.n + "일차에서</option>"; }).join("") + "</select></label>" : "";
    var outL = '<li class="outs"><div class="otools"><button type="button" class="sbtn go" data-act="opt">다시 짜기<small> 도로 기준 가장 빠른 순서</small></button>' + addSel +
      '<button type="button" class="sbtn" data-act="share" data-sday="' + D4.n + '">일정 공유</button>' +
      '<span>▲▼ 또는 끌어서 순서 · ✕로 빼기 · «가구 넣기»로 다른 일차에서 옮기면 경로·거리·시간이 바로 다시 계산됩니다 · 공유에는 가구번호·읍면·시각만</span></div>' +
      (D4.out && D4.out.length ? '<div class="oh">이 일차에서 뺀 가구 <b>' + D4.out.length + "</b></div><ul>" + D4.out.map(function (id) { var h = BY[id]; return '<li><b>' + id + "</b><span>" + esc(h.area + " · " + ageLine(h)) + '</span><button type="button" class="sbtn" data-back="' + id + '">되살리기</button></li>'; }).join("") + "</ul>" : "") + "</li>";
    tl += '<li class="tp"><span class="t">' + (D4.s.back ? D4.s.back.arrive : D4.s.end) + '</span><span class="ax"><b class="o">시</b></span><span class="c">복귀 · 이동 ' + D4.s.travelMin + "분 · 상담 " + D4.s.consultMin + "분</span></li>" + outL;
    var dp = dl.until ? F.deadline.plan(listIds().filter(function (id) { var s = statusOf(id); return s !== "done" && s !== "refused"; }).length, dl.until, dl.perDay || 5) : null;
    var per = [3, 4, 5, 6, 7, 8].map(function (n) { return '<option value="' + n + '"' + (n === (dl.perDay || 5) ? " selected" : "") + ">하루 " + n + "가구</option>"; }).join("");
    var sync = SY.state();
    var conf = p ? '<div class="conf ok"><b>확정됨</b><span>' + (sync.mode === "live" ? "같은 계정 폰에 나타나 있습니다" : "로그인하면 같은 계정 폰에도 나타납니다") + '</span><a class="sbtn" data-dock="1" data-dock-lbl="동선·길안내 열기" data-dock-sub="확정됨 · 네이버 지도로 길안내" href="#route' + (D4.ids[0] ? ":" + (D4.ids.filter(function (id) { return statusOf(id) === "planned"; })[0] || D4.ids[0]) : "") + '">폰 동선 화면 보기</a></div>'
      : '<button type="button" class="btn pri" data-act="confirm" data-dock="1" data-dock-sub="' + ds.length + "일차 " + total + '가구 · 폰에 바로">' + (I.check || "") + '방문 계획 확정 <small>' + ds.length + "일차 " + total + "가구 · 확정하면 같은 계정 폰에 바로</small></button>";
    return top("plan", "<strong>" + esc(roundYm()) + " 명단</strong>" + total + "가구 · 가상") + '<main class="wrap">' +
      '<div class="dhead"><h1><span>' + ds.length + "일</span>이면 명단을 다 봅니다</h1><p>한국사회보장정보원 발굴 순위를 그대로 따르되, 같은 날 묶인 집은 시청에서 가까운 순서로 이었습니다. 가구를 빼거나 되살리고, 순서를 바꾸면 도착 시각·거리·최적화 비교가 다시 계산되고 같은 계정 폰에도 바로 반영됩니다.</p></div>" +
      '<div class="dcards" role="group" aria-label="일차">' + cards + "</div>" + dayDateRow(D4, p) +
      (ow.over ? '<p class="warnline">' + esc(ow.why.join(" · ")) + " — 한 가구를 다음 일차로 미뤄 보세요.</p>" : "") +
      '<ol class="tline blk" aria-label="' + D4.n + '일차 순서">' + tl + "</ol>" + C2 + // S12-x 66회차: 첫 칸 = 일차·순서 | 둘째 칸 = 지도·최적화 비교·확정·기한
      '<div class="mapw blk"><div class="rt-map rt-plan" id="pmmap"><div class="rt-svg">' + mapSvg({ id: "pm", days: ds.map(function (d) { return { ids: d.ids, focus: d.n === planDay }; }), done: listIds().filter(function (id) { return statusOf(id) !== "planned"; }), labels: true, h: 380, label: D4.n + "일차 방문 순서 지도" }) + '</div><div class="rt-nmap" aria-label="네이버 지도 — ' + D4.n + '일차 방문 순서"><div class="rt-nbox"></div></div></div>' +
      '<div class="mlg"><span><i class="a"></i>' + D4.n + '일차</span><span class="rt-lg-b"><i class="b"></i>다른 일차</span><span class="rt-lg-t">직선 거리 근사 · 네이버 지도를 불러오는 중</span></div></div>' +
      '<div id="pmopt">' + rtOptHtml(rtCmp(rtListOrder(D4.ids), D4.ids)) + "</div>" + conf +
      qcards("이 탭의 다른 기능", [
        ["sync", "다시 짜기", "도로 기준 가장 빠른 순서", 'data-qto="[data-act=opt]"'],
        ["people", "가구 넣기", "다른 일차에서 옮겨 오기", 'data-qto="[data-act=addin]"'],
        ["clock", D4.n + "일차 날짜", "달력으로 바꾸기 · 순서 검사", 'data-qto="#dayDate"'],
        ["send", "일정 공유", "가구번호·읍면·시각만", 'data-qto="[data-act=share]"'],
        ["today", "하루 " + qv(dl.perDay || 5) + "가구", "기한 안에 다 보는 계획", 'data-qto=".dlset"'],
        D4.out && D4.out.length ? ["x", "뺀 가구 " + qv(D4.out.length), "되살리기", 'data-qto="[data-back]"'] : null,
        ["route", "동선·길안내", "네이버 지도 · 폰 화면", 'data-go="#route"']
      ]) +
      '<div class="dlset blk"><div class="k">기한 점검</div><div class="dlrow"><label>명단 기한<input type="date" id="dlUntil" value="' + esc(dl.until || "") + '"></label><label>하루 방문<select id="dlPer">' + per + "</select></label></div>" +
      (dp && dp.set ? '<div class="dln"><b>' + dp.left + "</b> 근무일 남음 · " + (dp.over ? '<em class="bad">이대로면 넘김</em>' : '<em class="ok">여유 ' + dp.spare + "일</em>") + "</div><p>" + esc(dp.line) + "</p>" : "<p>기한을 넣으면 하루 몇 가구씩 봐야 하는지 계산합니다.</p>") + "</div>" +
      '<p class="demo"><span class="samp">가상 데이터</span><span>가구 번호·읍면만 표시 · 이동 시간은 직선 거리 근사(«약») · 순서 근거 = 한국사회보장정보원 발굴 순위 + 거리</span><a href="#today" data-pick="1">명단 불러오기(엑셀)</a></p></main>';
  }
  /** 72회차 ①: 고른 일차의 방문 날짜 바꾸기(PC·폰 같은 칸, 폭에 따라 배열만) */
  function dayDateRow(D4, p) {
    return '<div class="ddate blk" data-fix72="ddate"><label for="dayDate"><b>' + D4.n + '일차 방문 날짜</b></label><input type="date" id="dayDate" value="' + esc(D4.date || "") + '">' +
      '<small>' + (p ? "바꾸면 같은 계정 폰에도 바로" : "확정하면 같은 계정 폰에도") + "</small></div>";
  }
  /** 일차 하나의 방문 날짜를 바꾼다 — 확정 계획이면 그 일차 visit_plan 행의 planned_at(시각은 그대로)을 바꿔 같은 계정 폰에 실시간, 확정 전이면 이 기기에 */
  function setDayDate(D4, date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || date === D4.date) return false;
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
    toast(D4.n + "일차 방문 날짜를 " + md(date) + "로 바꿨습니다" + (p ? (SY.state().mode === "live" ? " · 같은 계정 폰에도 반영" : " · 로그인하면 폰과 연동") : ""));
    render(); return true;
  }
  function bindPlan() {
    var ds = days(); if (!ds.length) return;
    var D4 = ds.filter(function (d) { return d.n === planDay; })[0];
    var dd = document.getElementById("dayDate"); if (dd && D4) dd.addEventListener("change", function () { vib(); if (!setDayDate(D4, dd.value)) dd.value = D4.date || ""; });
    app.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", function () { planDay = +b.dataset.day; render(); }); });
    app.querySelectorAll("[data-mv]").forEach(function (b) { b.addEventListener("click", function () { var a = b.dataset.mv.split(":"), i = +a[0]; vib(); reorder(D4, RP.move(D4.ids, i, i + +a[1])); }); });
    // 42 편집 — 빼기·되살리기·최적 순서·끌어서 순서(PC). 바꿀 때마다 reorder → 저장(확정 계획이면 실시간) → 다시 그림(지도·비교 카드 재계산)
    app.querySelectorAll(".tline [data-out]").forEach(function (b) { b.addEventListener("click", function () { var id = b.dataset.out;
      if (b.getAttribute("aria-disabled") === "true" || D4.ids.length < 2) { toast(b.dataset.why === "visited" ? id + " 은(는) 이미 방문 기록이 있어 일정에서 뺄 수 없습니다" : "마지막 한 가구는 뺄 수 없습니다 · 다른 일차로 옮기려면 그 일차의 «가구 넣기»"); return; }
      vib(); reorder(D4, planDrop(D4.ids, id), (D4.out || []).concat([id])); toast(id + " 을(를) 이 일차에서 뺐습니다 · 아래 «되살리기»로 되돌립니다"); }); }); // 77회차: 최적 순서였으면 남은 가구로 다시 최적화, 직접 바꾼 순서면 그 순서 유지
    app.querySelectorAll("[data-back]").forEach(function (b) { b.addEventListener("click", function () { var id = b.dataset.back; vib(); var wasOpt = D4.ids.join() === routeOrder(D4.ids).join(); // 최적 순서였으면 되살린 집까지 넣어 다시 잇고, 직접 바꾼 순서면 끝에 붙인다
      reorder(D4, wasOpt ? routeOrder(D4.ids.concat([id])) : D4.ids.concat([id]),(D4.out || []).filter(function (x) { return x !== id; })); toast(id + " 을(를) 되살렸습니다"); }); });
    var ob = app.querySelector('[data-act="opt"]'); if (ob) ob.addEventListener("click", function () { vib(); replan(D4, ob); });
    var po = document.getElementById("pmopt"); if (po) po.addEventListener("click", function (e) { if (e.target.closest('[data-act="reopt"]')) { vib(); reorder(D4, routeOrder(D4.ids)); toast("최적 순서로 다시 맞췄습니다"); } }); // 77회차
    var ad = app.querySelector('[data-act="addin"]'); if (ad) ad.addEventListener("change", function () { var id = ad.value; if (!id) return; vib(); moveIn(D4, id); });
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
        toast("다시 짰습니다 · 이동 " + (r.approx ? "약 " : "") + (Math.round(r.m / 100) / 10).toFixed(1) + "km · " + (r.approx ? "약 " : "") + Math.round(r.s / 60) + "분" + (r.approx ? "(직선 거리 어림)" : "(도로)"));
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
    return RP.shareText({ label: (d.date ? md(d.date) + " " : "") + d.n + "일차", start: "09:30",
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
    rmP = new Promise(function (ok, no) { var s = document.createElement("script"); s.src = "officer/route_map.js?v=s12z81"; s.onload = function () { window.DaeumRouteMap ? ok(window.DaeumRouteMap) : no("no-rm"); }; s.onerror = function () { rmP = null; no("network"); }; document.head.appendChild(s); });
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
      (man ? '<p class="rt-re"><button type="button" class="sbtn sm" data-act="reopt">최적 순서로 다시 맞추기</button></p>' : "") +
      (r.dKm >= 0.05 ? '<p class="rt-pct">이동 거리 ' + f0(r.pct) + "% 줄임 · 상담 시간은 그대로</p>" : "") +
      '<p class="rt-src">' + (r.road ? "거리·시간: 네이버 Directions 15 도로 경로(닿음 서버 daeum-route)" : r.fixed ? "거리·시간: 시연 고정값 — 직선거리 × 1.3(우회 계수) · 시속 40km 근사(실제 운영은 네이버 도로 경로)" : "거리·시간: 직선거리 × 1.3(우회 계수) · 시속 40km 근사 — 도로 경로를 받으면 실제 값으로 바뀝니다") +
      " · 순서: 최근접 이웃 → 2-opt · 상주시청 출발·복귀 · 가구 위치는 가상(시연용)</p></section>";
  }
  function routeView(want) {
    var k = pickHid(want); if (!k) return phEmpty();
    var c = k.c, hid = k.hid, h = BY[hid], i = c.d.ids.indexOf(hid), row = c.d.s.rows[i] || {};
    var done = c.d.ids.filter(function (id) { return statusOf(id) !== "planned"; }), left = c.d.ids.filter(function (id) { return statusOf(id) === "planned"; });
    var vt = F.visitTime.profile(attempts(), hid, { neighborLog: neighborLog() }), segs = Math.ceil(left.length / 6);
    var stops = c.d.ids.map(function (id, j) { var st = statusOf(id); return '<a class="rs' + (st !== "planned" ? " dn" : "") + (id === hid ? " nx" : "") + '" href="#route:' + id + '"><i>' + (st !== "planned" ? "✓" : j + 1) + '</i><b>' + id + "</b><span>" + esc(BY[id].area) + stTag(st) + '</span><em>' + esc((c.d.s.rows[j] || {}).arrive || "") + "</em></a>"; }).join("");
    // S12-x 66회차: 시안 v3 scrVisit — 첫 칸(지도·최적화 비교·다음 가구·길안내) | 둘째 칸(방문 순서 목록·지나는 길 연계처)
    return '<main class="phx">' +
      '<div class="mapw blk ph-map rt-map" id="rtmap"><div class="rt-svg">' + mapSvg({ id: "rm", days: [{ ids: c.d.ids, focus: true }], done: done, next: hid, h: 360, label: "오늘 동선 지도" }) + '</div><div class="rt-nmap" aria-label="네이버 지도 — 오늘 방문 순서"><div class="rt-nbox"></div></div>' +
      '<div class="mtop"><span>' + (c.isToday ? "오늘" : c.d.date ? md(c.d.date) : c.d.n + "일차") + " · " + c.d.ids.length + "가구</span><span>" + yak(c.d.s) + c.d.s.km + "km · " + c.d.s.end + " 복귀</span></div></div>" +
      '<div id="rtopt">' + rtOptHtml(rtCmp(rtListOrder(c.d.ids), c.d.ids)) + "</div>" +
      '<section class="nextc blk"><span class="pin">' + (i + 1) + '</span><div><b>다음 가구 ' + hid + "</b><small>" + esc(h.area + " · " + ageLine(h)) + (vt.best && vt.absences.length ? " · " + esc(vt.absences[0].label) + " 부재 " + vt.absences.length + "번 → " + esc(vt.best.label) : "") + '</small></div><span class="eta">' + esc(row.arrive || "") + "<small>" + (row.km != null ? row.km + "km · " + row.travelMin + "분" : "") + "</small></span>" +
      '<div class="dprog" style="grid-template-columns:repeat(' + c.d.ids.length + ',1fr)">' + c.d.ids.map(function (id) { return '<i class="' + (id === hid ? "n" : statusOf(id) !== "planned" ? "d" : "") + '"></i>'; }).join("") + '</div><div class="dprog-l"><span>' + done.length + "가구 끝</span><span>남은 " + left.length + "가구</span></div></section>" +
      '<button type="button" class="btn nav" data-act="nav" data-dock="2" data-dock-lbl="길안내" title="네이버 지도 길안내 — 폰은 지도 앱, PC는 새 창으로 열림">' + (I.nav || "") + '<span>네이버 지도로 길안내</span><small>남은 ' + Math.min(6, left.length || c.d.ids.length) + "곳 경유</small></button>" +
      (segs > 1 ? '<div class="segs">' + Array.apply(null, { length: segs }).map(function (_, kk) { return '<button type="button" class="sbtn" data-seg="' + kk + '">' + (kk * 6 + 1) + "~" + Math.min(left.length, kk * 6 + 6) + "번째</button>"; }).join("") + "</div>" : "") +
      '<p class="navnote">이름·주소 대신 «방문 1·2…»만 넘깁니다 · 네이버 지도 앱이 없으면 웹 길찾기로 <button type="button" class="sbtn shr" data-act="share" data-sday="' + c.d.n + '">' + (c.isToday ? "오늘" : "이날") + ' 일정 공유<small> 가구번호·읍면·시각만</small></button></p>' +
      C2 + '<div class="rlist blk">' + stops + "</div>" + resBlock(c.d.ids) +
      qcards("이 탭의 다른 기능", [
        ["nav", "구간 나눠 길안내", "6곳씩 · 네이버 지도 경유 한도", segs > 1 ? 'data-qto=".segs"' : 'data-qto="[data-act=nav]"'],
        ["send", "일정 공유", "가구번호·읍면·시각만", 'data-qto=".navnote [data-act=share]"'],
        ["pin", "주변 정보", "연계처·경로당 «방문 전 확인»", 'data-qto=".nbl"'],
        ["today", "방문 계획", "일차·순서 바꾸기 · 확정", 'data-go="#plan"']
      ]) +
      '<a class="btn pri" data-dock="1" data-dock-sub="' + esc(hid) + ' · 집 앞 요약 보기" href="#home:' + hid + '">' + (I.door || "") + "도착했어요 <small>집 앞 요약 보기</small></a></main>";
  }
  function bindRoute(want) {
    var k = pickHid(want); if (!k) return;
    var c = k.c, left = c.d.ids.filter(function (id) { return statusOf(id) === "planned"; });
    var nb = app.querySelector('[data-act="nav"]'); if (nb) nb.addEventListener("click", function () { vib(); launch(left.length ? left : c.d.ids, 0); });
    app.querySelectorAll("[data-seg]").forEach(function (b) { b.addEventListener("click", function () { launch(left, +b.dataset.seg); }); });
    rtMapBind("rtmap", "rtopt", c.d.ids, k.hid, "#0B6178");
    var ro = document.getElementById("rtopt"); if (ro) ro.addEventListener("click", function (e) { if (e.target.closest('[data-act="reopt"]')) { vib(); reorder(c.d, routeOrder(c.d.ids)); toast("최적 순서로 다시 맞췄습니다"); } }); // 77회차
    bindShare(days());
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

  // ═════ P3 실적·사후관리 — 명단 진도·읍면별·이번 주 할 일(약속·재방문·연계 뒤 확인) ═════
  function perfView() {
    var now = new Date(), today = ymd(now), ids = listIds(), dl = deadline(), ds = days();
    if (!ids.length) return top("perf", "<strong>실적</strong>가상 데이터") + '<main class="wrap"><div class="emptyc blk"><b>현장 기록이 들어오면 채워집니다</b>방문 계획을 확정하고 폰에서 «기록 저장»을 누르면 이 화면에 바로 쌓입니다.<a class="btn pri" href="#today" data-pick="1" data-dock="1" data-dock-sub="행복이음 «발굴대상자 조회» 엑셀">명단 불러오기</a></div></main>';
    var S = { done: 0, absent: 0, refused: 0, planned: 0 }; ids.forEach(function (id) { S[statusOf(id)] = (S[statusOf(id)] || 0) + 1; });
    var total = ids.length, seen = S.done + S.absent + S.refused, C = 2 * Math.PI * 70, acc = 0;
    var arcs = [["done", "#2E8270"], ["absent", "#C2862C"], ["refused", "#8A9396"]].map(function (a) { var v = S[a[0]] / total, s = '<circle cx="90" cy="90" r="70" fill="none" stroke="' + a[1] + '" stroke-width="22" stroke-dasharray="' + (C * v).toFixed(1) + " " + C.toFixed(1) + '" stroke-dashoffset="' + (-C * acc).toFixed(1) + '" transform="rotate(-90 90 90)"/>'; acc += v; return v ? s : ""; }).join("");
    var ar = {}; ids.forEach(function (id) { var a = BY[id].area, st = statusOf(id); ar[a] = ar[a] || { done: 0, absent: 0, refused: 0, planned: 0, n: 0 }; ar[a][st]++; ar[a].n++; });
    var areas = Object.keys(ar).sort(function (a, b) { return ar[b].n - ar[a].n; }), mx = Math.max.apply(null, areas.map(function (a) { return ar[a].n; }));
    var abar = areas.map(function (a) { var x = ar[a]; return '<div class="ab-r"><span class="ab-n">' + esc(a) + '</span><span class="ab-b" style="width:' + (x.n / mx * 100).toFixed(0) + '%">' + ["done", "absent", "refused", "planned"].map(function (k) { return x[k] ? '<i class="' + k + '" style="flex:' + x[k] + '"></i>' : ""; }).join("") + '</span><span class="ab-v">' + x.done + "/" + x.n + "</span></div>"; }).join("");
    var field = ids.filter(function (id) { return caseOf(id).field.length; }).length;
    var prs = prAll(), ac = F.aftercare.schedule(F.store.get("links", []), F.store.get("outcomes", {}), F.store.get("followups", {}), now);
    var wk = weekRange(new Date()), wk1 = ymd(wk.to), nextD = ds.filter(function (d) { return d.ids.some(function (id) { return statusOf(id) === "planned"; }); })[0], att = attempts();
    var todo = [];
    prs.forEach(function (p) { if (!p.done && p.due && p.due <= wk1) todo.push({ k: "p", id: p.id, t: p.householdId + " " + p.text, s: "약속", due: p.due, late: p.due < today }); });
    ac.forEach(function (x) { if (/today|overdue|soon/.test(x.state) && x.date <= wk1) todo.push({ k: "f", id: x.key, t: x.householdId + " " + x.stepLabel, s: "연계 뒤 확인 · " + x.services, due: x.date, late: x.state === "overdue" }); });
    ids.forEach(function (id) { if (statusOf(id) === "absent") { var vt = F.visitTime.profile(att, id, { neighborLog: neighborLog() }); todo.push({ k: "v", id: "V:" + id, t: id + " 다시 방문", s: "부재 " + vt.absences.length + "회" + (vt.best ? " → " + vt.best.label : ""), due: nextD && nextD.date ? nextD.date : ymd(U.addWorkdays(now, 1)), late: false }); } });
    prs.filter(function (p) { return p.done && p.doneAt && new Date(p.doneAt) >= wk.from; }).forEach(function (p) { todo.push({ k: "p", id: p.id, t: p.householdId + " " + p.text, s: "끝냄", due: "9", done: true }); });
    todo.sort(function (a, b) { return (a.done ? 1 : 0) - (b.done ? 1 : 0) || (b.late ? 1 : 0) - (a.late ? 1 : 0) || (a.due < b.due ? -1 : a.due > b.due ? 1 : 0); });
    var KC = { p: "약속", f: "확인", v: "재방문" };
    var tl = todo.slice(0, 9).map(function (x) { return '<li class="' + (x.done ? "dn" : "") + (x.late ? " late" : "") + '"><button type="button" class="ckb' + (x.done ? " on" : "") + '" data-todo="' + esc(x.id) + '" data-k="' + x.k + '" aria-label="끝냄 표시"' + (x.k === "v" ? " disabled" : "") + '></button><span class="kd k-' + x.k + '">' + KC[x.k] + "</span><div><b>" + esc(x.t) + "</b><small>" + esc(x.s) + '</small></div><span class="due">' + (x.done ? "끝" : x.late ? U.daysBetween(x.due, now) + "일 지남" : x.due === today ? "오늘" : esc(x.due.slice(5).replace("-", "."))) + "</span></li>"; }).join("");
    // 이번 주 근무일 띠
    var wd = [0, 1, 2, 3, 4].map(function (i) { var d = ymd(new Date(wk.from.getTime() + i * 864e5)); var ev = [];
      ds.forEach(function (x) { if (x.date === d) ev.push(["v", x.n + "일차 " + x.ids.length + "가구"]); });
      prs.forEach(function (p) { if (!p.done && p.due === d) ev.push(["p", p.householdId + " 약속"]); });
      ac.forEach(function (x) { if (x.date === d && x.state !== "done") ev.push(["f", x.householdId + " 확인"]); });
      if (dl.until === d) ev.push(["d", "명단 기한"]);
      return '<div class="wd' + (d === today ? " today" : d < today ? " past" : "") + '"><b>' + W.charAt(new Date(d + "T00:00:00").getDay()) + "<small>" + (+d.slice(8)) + "</small></b>" + ev.slice(0, 3).map(function (e) { return '<span class="ev e-' + e[0] + '">' + esc(e[1]) + "</span>"; }).join("") + (ev.length > 3 ? '<span class="evm">+' + (ev.length - 3) + "</span>" : "") + "</div>"; }).join("");
    // 42 주별 방문 기록 — 지난 6주(월요일 시작) 방문 결과를 규칙으로 센다(시연 기록 + 이 계정이 직접 남긴 기록 모두)
    var LG = logs(), wks = [5, 4, 3, 2, 1, 0].map(function (k) { var f = new Date(wk.from.getTime() - k * 7 * 864e5), t = new Date(f.getTime() + 7 * 864e5); var o = { f: f, met: 0, absent: 0, refuse: 0, n: 0 };
      LG.forEach(function (l) { var x = new Date(l.at); if (x >= f && x < t && o[l.result] != null) { o[l.result]++; o.n++; } }); return o; });
    var wmx = Math.max(1, Math.max.apply(null, wks.map(function (w) { return w.n; }))), wsum = wks.reduce(function (a, w) { return a + w.n; }, 0), wmet = wks.reduce(function (a, w) { return a + w.met; }, 0);
    var wbars = wks.map(function (w, i) { return '<div class="wb' + (i === 5 ? " now" : "") + '"><span class="wv">' + w.n + '</span><span class="wcol" style="height:' + (w.n / wmx * 100).toFixed(0) + '%">' + [["refuse", "#8A9396"], ["absent", "#C2862C"], ["met", "#2E8270"]].map(function (r) { return w[r[0]] ? '<i style="flex:' + w[r[0]] + ";background:" + r[1] + '"></i>' : ""; }).join("") + '</span><b>' + (i === 5 ? "이번 주" : (w.f.getMonth() + 1) + "." + w.f.getDate()) + "</b></div>"; }).join("");
    var concl = "명단 " + total + "가구 중 " + seen + "가구를 찾아갔고 " + S.done + "가구와 상담했습니다" + (S.absent ? " · 부재 " + S.absent + "가구는 다시 갑니다" : "") + ".";
    return top("perf", "<strong>" + esc(roundYm()) + " 명단 실적</strong>가상 데이터") + '<main class="wrap">' +
      '<div class="dhead"><h1>' + esc(concl) + '</h1><p>숫자는 현장 기록을 규칙으로 센 것입니다(손 집계 없음) · 주간 실적 보고서는 «문서함»에서 두 번 눌러 받습니다.</p></div>' +
      '<section class="ringc blk"><svg viewBox="0 0 180 180" class="pfring" role="img" aria-label="진도 ' + seen + "/" + total + '"><circle cx="90" cy="90" r="70" fill="none" stroke="#E1E5EB" stroke-width="22"/>' + arcs + '<text x="90" y="88" text-anchor="middle" font-size="34" font-weight="900" fill="#11181C">' + Math.round(seen / total * 100) + '%</text><text x="90" y="110" text-anchor="middle" font-size="12" font-weight="700" fill="#47535B">' + seen + "/" + total + " 가구</text></svg>" +
      '<ul class="rlg"><li><i style="background:#2E8270"></i>만남·상담<b>' + S.done + '</b></li><li><i style="background:#C2862C"></i>부재 · 다시 감<b>' + S.absent + '</b></li><li><i style="background:#8A9396"></i>거절<b>' + S.refused + '</b></li><li><i style="background:#E1E5EB"></i>방문 전<b>' + S.planned + "</b></li></ul>" +
      '<div class="fsig well"><b>' + field + '</b>가구에서 명단 사유 밖 징후를 현장에서 더 봄<small>현장 확인 «문제 있음» 기준 · 보고서에 따로 셉니다</small></div></section>' +
      '<section class="areac blk"><h2>읍면별 진도</h2>' + abar + '<div class="mlg"><span><i class="a"></i>만남</span><span><i class="c"></i>부재</span><span><i class="d"></i>거절</span><span><i class="e"></i>방문 전</span></div></section>' +
      C2 + '<section class="todoc blk"><h2>이번 주 할 일 <small>' + todo.filter(function (x) { return !x.done; }).length + "건 남음</small></h2>" + (tl ? '<ul class="todo2">' + tl + "</ul>" : '<p class="mute">이번 주는 다시 볼 집이 없습니다.</p>') + "</section>" +
      '<section class="week blk" aria-label="이번 주"><h2>이번 주 근무일</h2><div class="wds">' + wd + "</div></section>" +
      C3 + '<section class="wtrend blk" aria-label="주별 방문 기록"><h2>주별 방문 기록 <small>지난 6주 ' + wsum + "건 · 상담 " + wmet + '건</small></h2><div class="wbars">' + wbars + '</div><div class="mlg"><span><i class="a"></i>만남·상담</span><span><i class="c"></i>부재</span><span><i class="d"></i>거절</span></div></section>' +
      qcards("이 탭의 다른 기능", [
        ["people", "읍면별 진도", "만남·부재·거절·방문 전", 'data-qto=".areac"'],
        ["check", "이번 주 할 일 " + qv(todo.filter(function (x) { return !x.done; }).length) + "건", "약속·연계 뒤 확인·다시 방문", 'data-qto=".todoc"'],
        ["today", "이번 주 근무일", "요일별 방문·약속·기한", 'data-qto=".week"'],
        ["hist", "주별 방문 기록", "지난 6주 · 만남·부재·거절", 'data-qto=".wtrend"'],
        ["print", "문서함", "복명서·상담일지·실적 보고", 'data-go="#docs"']
      ]) +
      '<button type="button" class="btn pri" data-act="perfdoc" data-dock="1" data-dock-sub="문서함 · 수급권자 현황 비교 hwpx">' + (I.report || "") + "주간 실적 보고서 만들기</button>" +
      '<p class="demo"><span class="samp">가상 데이터</span><span>다음 차수 명단이 오면 «명단 불러오기»에서 이번 차수와 자동으로 견줍니다</span><a href="#today" data-pick="1">명단 불러오기</a></p></main>';
  }
  function bindPerf() {
    var pd = app.querySelector('[data-act="perfdoc"]'); if (pd) pd.addEventListener("click", function () { vib(); docSel = "d5"; docHid = null; location.hash = "#docs"; }); // 74회차 주 단추: 문서함 «주간·월간 추진 실적 보고»로
    app.querySelectorAll("[data-todo]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.dataset.todo, k = b.dataset.k;
      if (k === "p") prToggle(id);
      else if (k === "f") F.store.set("followups", F.aftercare.mark(F.store.get("followups", {}), id));
      vib(); render();
    }); });
  }

  // ═════ P2 문서함(⑦) ═════
  var DOCS = [
    { k: "d2", nm: "출장 결과 보고(복명서)", sub: "방문한 날 · hwpx 1쪽", meter: [["r", 8], ["a", 3], ["e", 1]] },
    { k: "d1", nm: "상담일지 초안", sub: "행복이음 입력 순서 복사 · 보관 hwpx", meter: [["m", 5], ["a", 4]] },
    { k: "d3", nm: "서비스 연계 의뢰서", sub: "연계 확정 때 · hwpx 1쪽", meter: [["m", 4], ["r", 3], ["a", 2]] },
    { k: "d4", nm: "안내 문자 문안", sub: "이름·주소 빼고 쉬운 말 · 복사", meter: [["m", 2], ["a", 3]] },
    { k: "d5", nm: "주간·월간 추진 실적 보고", sub: "수급권자 현황 15062448 비교 · hwpx", meter: [["r", 9], ["m", 2], ["a", 1]] },
    { k: "d6", nm: "차수 처리 결과 명단", sub: "발굴 명단 + 방문 기록 · xlsx", meter: [["m", 12], ["r", 4]] },
    { k: "d7", nm: "한 장 인계 카드", sub: "선택 · 담당 교체·부재 때 · hwpx 1쪽", meter: [["m", 3], ["r", 6], ["a", 1], ["e", 1]] },
    { k: "d8", nm: "큰 글씨 안내문", sub: "선택 · 어르신 가구에 남김 · hwpx 1쪽", meter: [["r", 4], ["a", 1]] }
  ];
  var DOC_OPT = { d7: 1, d8: 1 }; // 선택 문서 — «만들 문서 N건» 합계에서 뺀다(S12-d 40)
  var docSel = "d2", docDay = null, docHid = null, docOrg = null, docPer = "wk", made1 = {}, docOrgPick = {}; // S12-v U14(B9): 사용자가 고른 받는 기관(가구별)
  var docBase = null; // S12-e 43: 지난 방문일(이력)을 고르면 그날이 주간·월간 실적 기간의 기준이 된다(이번 차수면 null = 오늘)
  function curDays() { return days().filter(function (d) { return d.ids.some(function (id) { return statusOf(id) !== "planned"; }); }); }
  /** S12-e 43 문서함 이력 — 이번 차수 계획 밖 방문 기록(지난 차수·지난 몇 주 시연 기록 + 직접 남긴 기록)을 방문한 날별로 묶는다.
      이번 차수 명단 가구의 «순위 매긴 뒤» 기록은 이번 차수 방문일에 이미 들어가므로 뺀다 */
  function histDays() {
    var p = plan(), inPlan = {}, cur = {};
    if (p) p.rows.forEach(function (r) { inPlan[r.household_no] = 1; });
    days().forEach(function (d) { if (d.date) cur[d.date] = 1; });
    var g = {};
    logs().forEach(function (l) {
      if (!BY[l.household_no] || !l.at) return;
      if (inPlan[l.household_no] && (!p || !p.ranked_at || l.at > p.ranked_at)) return;
      var d = ymd(l.at); if (cur[d]) return;
      (g[d] = g[d] || []).push(l);
    });
    return Object.keys(g).sort().map(function (d) { var L = g[d].sort(function (a, b) { return a.at < b.at ? -1 : 1; }); return { n: "h" + d, date: d, ids: uniq(L.map(function (l) { return l.household_no; })), logs: L, past: true }; });
  }
  function reportDays() { return histDays().concat(curDays()).sort(function (a, b) { return (a.date || "9") < (b.date || "9") ? -1 : (a.date || "9") > (b.date || "9") ? 1 : 0; }); }
  var RES2ST = { met: "done", absent: "absent", refuse: "refused" };
  /** 지난 방문일의 한 가구 — 그날 마지막 기록으로 만든다(같은 가구가 뒤에 다시 만나졌어도 그날 결과 그대로) */
  function caseOfLog(l) {
    var memo = l.memo || "", tags = l.tags || [], st = RES2ST[l.result] || "planned";
    var refs = st === "done" ? F.referral.suggest({ text: memo, needs: F.askGuide.detect(memo) }).filter(function (x) { return x !== "emergency"; }) : [];
    return { id: l.household_no, st: st, memo: memo, tags: tags, refs: refs, field: tags.filter(isField), at: l.at, h: BY[l.household_no], past: true };
  }
  function dayCases(dd) {
    if (!dd) return [];
    if (!dd.past) return dd.ids.map(caseOf);
    return dd.ids.map(function (id) { return caseOfLog(dd.logs.filter(function (l) { return l.household_no === id; }).pop()); });
  }
  /** 월요일(주 시작) 날짜 */
  function monOf(d) { var n = U.startOfDay(typeof d === "string" ? new Date(d + "T00:00:00") : d); return ymd(new Date(n.getTime() - ((n.getDay() + 6) % 7) * 864e5)); }
  function wkLbl(mon) { var t = monOf(new Date()); if (mon === t) return "이번 주"; var d = new Date(mon + "T00:00:00"); return (d.getMonth() + 1) + "." + d.getDate() + " 주"; }
  function caseOf(id) {
    var L = lastLog(id), st = statusOf(id), memo = L ? L.memo : "", tags = L && L.tags || [];
    var refs = st === "done" ? F.referral.suggest({ text: memo, needs: F.askGuide.detect(memo) }).filter(function (x) { return x !== "emergency"; }) : [];
    var field = tags.filter(isField);
    return { id: id, st: st, memo: memo, tags: tags, refs: refs, field: field, at: L ? L.at : null, h: BY[id] };
  }
  function weekRange(b) { var n = U.startOfDay(b || docBase || new Date()), mon = new Date(n.getTime() - ((n.getDay() + 6) % 7) * 864e5); return { from: mon, to: new Date(mon.getTime() + 4 * 864e5) }; }
  /** 이번 달 1일 ~ 말일(S12-d 39 월간) */
  function monthRange(b) { var n = U.startOfDay(b || docBase || new Date()); return { from: new Date(n.getFullYear(), n.getMonth(), 1), to: new Date(n.getFullYear(), n.getMonth() + 1, 0) }; }
  /** 실적 보고 저장 키 — 주간 «wk:월요일:d5» · 월간 «mo:YYYY-MM:d5» */
  function perKey(per) { return per === "mo" ? "mo:" + ymd(monthRange().from).slice(0, 7) + ":d5" : "wk:" + ymd(weekRange().from) + ":d5"; }
  function docModel() {
    var rd = reportDays(), cd = rd.filter(function (d) { return !d.past; }), dd = rd.length ? (rd.filter(function (d) { return d.n === docDay; })[0] || cd[cd.length - 1] || rd[rd.length - 1]) : null;
    docBase = dd && dd.past && dd.date ? new Date(dd.date + "T12:00:00") : null;
    var cases = dayCases(dd), met = cases.filter(function (x) { return x.st === "done"; }), ab = cases.filter(function (x) { return x.st === "absent"; });
    var done = lsGet(LS_DOCS, {}) || {}, key = dd ? (dd.past ? "h:" + dd.date : roundYm() + ":" + dd.n) : "";
    var linked = met.filter(function (x) { return x.refs.length; });
    var cnt = { d2: dd ? 1 : 0, d1: met.length, d3: linked.length, d4: ab.length + linked.length, d5: 1, d6: 1, d7: handCands(cases).length, d8: bigCands(cases).length };
    var got = function (k) { return (done[key + ":" + k] || []).length; };
    var wk = weekRange(), wkKey = ymd(wk.from);
    var pend = dd && dd.past ? { d2: 0, d1: 0, d3: 0, d4: 0, d5: 0, d6: 0, d7: 0, d8: 0 } : { d2: Math.max(0, cnt.d2 - got("d2")), d1: Math.max(0, cnt.d1 - got("d1")), d3: Math.max(0, cnt.d3 - got("d3")), d4: Math.max(0, cnt.d4 - got("d4")), d5: (done[perKey(docPer)] || []).length ? 0 : 1, d6: (done["round:" + roundYm() + ":d6"] || []).length ? 0 : 1, d7: Math.max(0, cnt.d7 - got("d7")), d8: Math.max(0, cnt.d8 - got("d8")) };
    // 지난 방문일 = 그때 이미 받은 문서(이력) — 대기 0, 다시 받기·인쇄만
    return { rd: rd, dd: dd, past: !!(dd && dd.past), cases: cases, met: met, ab: ab, linked: linked, cnt: cnt, pend: pend, key: key, wkKey: wkKey, pending: Object.keys(pend).reduce(function (s, k) { return s + (DOC_OPT[k] ? 0 : pend[k]); }, 0) };
  }
  function markDone(M, k, id) {
    var done = lsGet(LS_DOCS, {}) || {}, key = k === "d5" ? perKey(docPer) : k === "d6" ? "round:" + roundYm() + ":d6" : M.key + ":" + k;
    var a = done[key] || []; if (a.indexOf(id) < 0) a.push(id); done[key] = a; lsSet(LS_DOCS, done);
  }
  function fills() { return lsGet(LS_FILL, {}) || {}; }
  /** 복명서 칸 — 칸마다 출처(data 명단·한국사회보장정보원 / rule 규칙 / ai 자동 문장 / empty 입력 필요) */
  function d2Fields(M) {
    var dd = M.dd, logsD = M.cases.filter(function (x) { return x.at; }).map(function (x) { return x.at; }).sort();
    var areas = uniq(dd.ids.map(function (id) { return BY[id].area; }));
    var rf = M.cases.filter(function (x) { return x.st === "refused"; }), sigN = M.cases.filter(function (x) { return x.field.length; }).length;
    var base = M.past ? new Date(dd.date + "T12:00:00") : new Date(), ym = (M.past ? dd.date.slice(0, 7) : roundYm()).split("-"), nextAb = ymd(U.addWorkdays(base, A.retryGap));
    var gist = M.met.slice(0, 3).map(function (x) { return x.id + " " + clip(x.memo.replace(/^확인:[^.]*\.\s*/, ""), 40); });
    var f = fills()[M.key] || {};
    return [
      { k: "출장 일시", src: "rule", v: (dd.date ? mdDot(dd.date).replace(/\.\(/, ".(") : "") + (logsD.length ? " " + hm(logsD[0]) + "~" + hm(logsD[logsD.length - 1]) : "") },
      { k: "출장지", src: "data", v: areas.join(" · ") + "(가구 " + dd.ids.length + ")" },
      { k: "목적", src: "data", v: ym[0] + "년 " + (+ym[1]) + "월 차수 복지사각지대 발굴대상자 현장 확인(한국사회보장정보원 명단)" },
      { k: "결과", src: "rule", v: "만남 " + M.met.length + " · 부재 " + M.ab.length + (rf.length ? " · 거절 " + rf.length : "") + " · 명단 사유 밖 징후 " + sigN + "가구" },
      { k: "요지", src: "ai", v: gist.join(" / ") || "만난 가구 없음" },
      { k: "조치", src: "rule", v: "연계 의뢰서 " + M.linked.length + "건" + (M.ab.length ? " · 재방문 " + mdDot(nextAb) : "") },
      { k: "동행자", src: f.with ? "rule" : "empty", v: f.with || "", input: "with" }
    ];
  }
  var SRC_CLS = { data: "var(--src-data)", rule: "var(--src-rule)", ai: "var(--src-ai)", empty: "var(--src-empty)" };
  var MET_SRC = { m: "data", r: "rule", a: "ai", e: "empty" };
  /** 방문한 날 고르기 — 위에는 «이번 차수 방문일»만 둔다(11-03 호창님 «날짜들이 막 생겨나 엉망»).
      지난 날짜는 아래 «주별 문서 이력» 표에서 누른다. 지난 날을 보고 있으면 그날 칩 하나만 더 보인다 */
  function dayPick(M) {
    var g = [], last = null;
    M.rd.filter(function (d) { return !d.past || d.n === M.dd.n; }).forEach(function (d) { var mon = d.date ? monOf(d.date) : "—"; if (!last || last.mon !== mon) { last = { mon: mon, ds: [] }; g.push(last); } last.ds.push(d); });
    return '<div class="dpick dpick-wk" role="group" aria-label="방문한 날(주별)">' + g.map(function (w) {
      return '<span class="dwk-l">' + esc(w.mon === "—" ? "날짜 없음" : wkLbl(w.mon)) + "</span>" + w.ds.map(function (d) { return '<button type="button" data-day="' + d.n + '" aria-pressed="' + (d.n === M.dd.n) + '"' + (d.past ? ' class="past"' : "") + ">" + (d.date ? mdDot(d.date) : d.n + "일차") + "</button>"; }).join("");
    }).join("") + "</div>";
  }
  /** 주별 문서 이력 — 방문한 날마다 생긴 문서 수를 주 단위로 쌓는다(규칙 집계). 지난 주 = 그때 받은 문서, 이번 차수 = 남은 건수 함께 */
  function docHist(M) {
    var done = lsGet(LS_DOCS, {}) || {}, W2 = {}, order = [];
    M.rd.forEach(function (d) {
      var mon = d.date ? monOf(d.date) : "—", cs = dayCases(d), met = cs.filter(function (x) { return x.st === "done"; }), ab = cs.filter(function (x) { return x.st === "absent"; }), lk = met.filter(function (x) { return x.refs.length; });
      if (!W2[mon]) { W2[mon] = { mon: mon, days: [], d2: 0, d1: 0, d3: 0, d4: 0, left: 0, cur: false }; order.push(mon); }
      var o = W2[mon], key = d.past ? "" : roundYm() + ":" + d.n;
      o.days.push(d); o.d2 += 1; o.d1 += met.length; o.d3 += lk.length; o.d4 += ab.length + lk.length;
      if (!d.past) { o.cur = true; var got = function (k) { return (done[key + ":" + k] || []).length; }; o.left += Math.max(0, 1 - got("d2")) + Math.max(0, met.length - got("d1")) + Math.max(0, lk.length - got("d3")) + Math.max(0, ab.length + lk.length - got("d4")); }
    });
    var rows = order.slice(-6).reverse().map(function (m) { var o = W2[m], n = o.d2 + o.d1 + o.d3 + o.d4 + 1;
      return '<tr' + (o.cur ? ' class="cur"' : "") + "><th>" + esc(m === "—" ? "날짜 없음" : wkLbl(m)) + '</th><td class="dh-days">' + o.days.map(function (d) { return '<button type="button" data-day="' + d.n + '"' + (d.n === M.dd.n ? ' aria-current="true"' : "") + ">" + (d.date ? mdDot(d.date) : d.n + "일차") + "</button>"; }).join("") + '</td><td data-src="rule">' + o.d2 + '</td><td data-src="rule">' + o.d1 + '</td><td data-src="rule">' + o.d3 + '</td><td data-src="rule">' + o.d4 + '</td><td data-src="rule">1</td><td class="dh-sum"><b>' + n + "</b>" + (o.cur ? (o.left ? " · " + o.left + "건 남음" : " · 다 받음") : " · 받음") + "</td></tr>"; }).join("");
    var tot = order.slice(-6).reduce(function (a, m) { var o = W2[m]; return a + o.d2 + o.d1 + o.d3 + o.d4 + 1; }, 0);
    return '<section class="dhist blk pg-break" aria-label="주별 문서 이력"><h2>주별 문서 이력 <small>지난 ' + Math.min(6, order.length) + "주 · 문서 " + tot + '건</small></h2>' +
      '<table class="doc-t dhist-t"><caption class="sr">주별 방문한 날과 문서 건수</caption><thead><tr><th>주</th><th>방문한 날</th><th>복명서</th><th>상담일지</th><th>연계 의뢰서</th><th>안내 문자</th><th>주간 실적</th><th>합계</th></tr></thead><tbody>' + rows + "</tbody></table>" +
      '<p class="srcline">날짜를 누르면 그날 문서를 다시 보고 받을 수 있습니다 · 건수는 방문 기록을 규칙으로 센 것(만남 = 상담일지 1 · 연계 후보가 있는 만남 = 의뢰서 1 · 부재·연계 = 안내 문자 1)</p></section>';
  }
  // ═════ S12-x 가구별 기록·문서(호창님 11-12 «가구마다 잘 저장 · 열어 보고 편집» · «목록화·찾기·편집·활용») — 규칙은 app/hrec.js ═════
  //   65회차(⚙️ 파로): 마크업·동작 이름 = 시안 v3 hrecList·hrecView 그대로(hf·hsort·hpick·hopen·hedit·hsave·hre·hbulk) — 데이터는 실제 방문 기록(app/hrec.js).
  //   첫 화면엔 검색칸 + «걸러 보기» 단추 + 목록만. 걸러 보기 칩은 단추를 눌러야 펼쳐진다. 폰 = 목록↔한 가구(닫기) · 폴드·PC = 목록 아래 한 가구.
  var HRX = window.DaeumHrec, LS_HEDIT = "daeum.s12x.recEdit", LS_HDOC = "daeum.s12x.hdoc";
  var HR = { f: { q: "", res: "", per: "", doc: "" }, sort: "mod", sel: {}, open: null, edit: null, fo: false };
  function hrGroups() { return HRX ? HRX.group(logs(), BY, lsGet(LS_HEDIT, {}) || {}) : []; }
  function hrList() { return HRX ? HRX.sort(HRX.filter(hrGroups(), { q: HR.f.q, res: HR.f.res, period: HR.f.per === "t" ? "today" : HR.f.per === "w" ? "week" : "", doc: HR.f.doc }), HR.sort === "no" ? "hid" : "recent") : []; }
  function hrNsel() { return Object.keys(HR.sel).filter(function (k) { return HR.sel[k]; }).length; }
  function hrPhone() { return (document.documentElement.getAttribute("data-mode") || "phone") === "phone"; }
  function hrTag(g, docs) { return docs.some(function (d) { return d.stale; }) ? '<span class="stale">다시 만들기</span>' : '<span class="tag ' + HRX.RK[g.res] + '">' + HRX.RES[g.res] + "</span>"; }
  function hrecList() {
    var R = hrList(), f = HR.f, n = hrNsel(), nf = ["res", "per", "doc"].filter(function (g) { return f[g]; }).length, de = lsGet(LS_HDOC, {}) || {}, all = hrGroups();
    function chip(g, v, l) { return '<button type="button" class="hchip pr" data-act="hf" data-g="' + g + '" data-k="' + v + '" aria-pressed="' + (f[g] === v) + '">' + l + "</button>"; }
    return '<section class="card hrec-list"><h3>가구별 기록<span>' + all.length + "가구 · 방문 " + all.reduce(function (a, g) { return a + g.visits.length; }, 0) + "번</span></h3>" +
      '<div class="hrec-tools"><div class="hrec-sbar"><label class="hrec-search">' + I.search + '<input id="hq" type="search" value="' + esc(f.q) + '" placeholder="가구번호·읍면·날짜(11.12)·메모" aria-label="가구별 기록 찾기"></label>' +
      '<button type="button" class="hrec-ftog pr" data-act="hfo" aria-expanded="' + HR.fo + '">' + I.filter + "걸러 보기" + (nf ? '<span class="n">' + nf + "</span>" : "") + "</button></div>" +
      (HR.fo ? '<div class="hrec-fpanel"><div class="hrec-filter" role="group" aria-label="결과"><span class="fk">결과</span>' + ["met", "absent", "refuse"].map(function (v) { return chip("res", v, HRX.RES[v]); }).join("") + "</div>" +
        '<div class="hrec-filter" role="group" aria-label="기간"><span class="fk">기간</span>' + chip("per", "t", "오늘") + chip("per", "w", "이번 주") + "</div>" +
        '<div class="hrec-filter" role="group" aria-label="문서 종류"><span class="fk">문서</span>' + HRX.DOCK.map(function (d) { return chip("doc", d.k, d.nm); }).join("") + "</div>" +
        '<div class="hrec-sort"><span>' + R.length + '가구 <button type="button" class="lnk pr" data-act="hall">보이는 가구 모두 고르기</button></span><span class="seg2" role="group" aria-label="정렬">' + [["mod", "최근 수정 순"], ["no", "가구번호 순"]].map(function (x) { return '<button type="button" class="pr" data-act="hsort" data-k="' + x[0] + '" aria-pressed="' + (HR.sort === x[0]) + '">' + x[1] + "</button>"; }).join("") + "</span></div></div>" : "") + "</div>" +
      '<div class="hrec-rows">' + (R.length ? R.map(function (g) {
        return '<div class="hrec-line"><button type="button" class="hrec-pick pr" data-act="hpick" data-k="' + g.hid + '" aria-pressed="' + !!HR.sel[g.hid] + '" aria-label="' + g.hid + ' 고르기"><i>' + I.check + "</i></button>" +
          '<button type="button" class="hrec-row pr' + (HR.open === g.hid ? " on" : "") + '" data-act="hopen" data-k="' + g.hid + '" aria-expanded="' + (HR.open === g.hid) + '"><span class="hrec-no">' + g.hid + '</span><span class="hrec-mid"><b>' + esc(g.area) + "</b><small>방문 " + HRX.md(g.last.at) + (g.visits.length > 1 ? " · " + g.visits.length + "차" : "") + "</small></span>" + hrTag(g, HRX.docsOf(g, de)) + '<span class="hrec-mod">고침 <b>' + HRX.when(g.touched) + "</b></span></button></div>";
      }).join("") : '<div class="hrec-empty">맞는 가구가 없습니다 — 찾는 말이나 걸러 보기를 바꿔 보세요.</div>') + "</div>" +
      (n ? '<div class="hrec-bulk" role="status"><span>' + n + '가구 골랐습니다</span><button type="button" class="btn sm pri pr" data-act="hbulk">' + I.down + '한 번에 내려받기</button><button type="button" class="btn sm ghost pr" data-act="hselx" aria-label="고르기 풀기">' + I.x + "</button></div>" : "") +
      '<p class="srcline">기록과 직접 고친 문서 본문은 같은 계정 PC·폰에 실시간 연동 · 가구 번호·읍면만(성명·주소·연락처 없음) · 가상 데이터</p></section>';
  }
  function hrAuto(g) { var v = g.last; return (HRX.md(v.at) + " " + (v.res === "absent" ? "방문했으나 만나지 못함." : v.res === "refuse" ? "방문했으나 상담을 원하지 않음." : "방문하여 대상자를 만남.") + " " + (v.tags.length ? v.tags.join("·") + " 상황을 확인함." : "")).trim(); }
  function hrecOne() {
    var g = hrGroups().filter(function (x) { return x.hid === HR.open; })[0]; if (!g) return "";
    var v = g.last, de = lsGet(LS_HDOC, {}) || {}, docs = HRX.docsOf(g, de);
    var hist = g.visits.slice().reverse().map(function (x) { return '<li><span class="r">' + x.n + '차</span><i class="d"></i><span><b>' + HRX.md(x.at) + " " + HRX.hm(x.at) + "</b><small>" + HRX.RES[x.res] + " — " + esc(x.memo || "기록 없음") + (x.edited ? " · 고친 시각 " + HRX.when(x.edited) : "") + "</small></span></li>"; }).join("");
    var dl = docs.map(function (d) {
      var key = g.hid + "|" + d.k, ed = HR.edit === key;
      return '<div class="hdoc' + (d.stale ? " stale" : "") + '"><span class="di h">HWP</span><span class="nm"><b>' + d.nm + (d.stale ? '<span class="stale">다시 만들기</span>' : "") + "</b><small>" + (d.stale ? "기록이 바뀌었습니다" : d.edited ? "본문 고침 " + HRX.when(d.edited) : "기록과 같음") + "</small></span>" +
        (ed ? '<textarea class="hrec-memo" id="hrDocTxt" rows="7" aria-label="' + d.nm + ' 본문 고치기">' + esc(d.text) + '</textarea><div class="acts"><button type="button" class="pr" data-act="hcancel">취소</button><button type="button" class="pr" data-act="hsave" data-k="' + key + '">' + I.check + "저장</button></div>"
          : '<div class="acts">' + (d.stale ? '<button type="button" class="re pr" data-act="hre" data-k="' + key + '">' + I.sync + "다시 만들기</button>" : "") +
            '<button type="button" class="pr" data-act="hdoc" data-k="hwpx" data-d="' + key + '">' + I.down + 'hwpx</button><button type="button" class="pr" data-act="hdoc" data-k="인쇄" data-d="' + key + '">' + I.print + '인쇄</button><button type="button" class="pr" data-act="hdoc" data-k="복사" data-d="' + key + '">' + I.copy + '복사</button><button type="button" class="pr" data-act="hdoc" data-k="보내기" data-d="' + key + '">' + I.send + '보내기</button><button type="button" class="pr" data-act="hdoc" data-k="고치기" data-d="' + key + '">' + I.pen + "본문</button></div>") + "</div>";
    }).join("");
    return '<section class="card hrec-view" aria-label="' + g.hid + ' 기록">' +
      '<div class="hrec-head">' + (hrPhone() ? '<button type="button" class="evb pr" data-act="hclose" aria-label="목록으로">' + I.x + "</button>" : "") + '<span class="hrec-no">' + g.hid + '</span><span class="t"><b>' + esc(g.area) + "</b><small>방문 " + HRX.md(v.at) + " · 고침 " + HRX.when(g.touched) + "</small></span>" + hrTag(g, docs) + "</div>" +
      '<div class="hrec-sec"><h4>차수별 기록</h4><ol class="hrec-hist">' + hist + "</ol></div>" +
      '<div class="hrec-sec"><h4>상황</h4><div class="hrec-sit">' + (v.tags.length ? v.tags.map(function (z) { return '<button type="button" class="hchip pr" aria-pressed="true" tabindex="-1">' + esc(z) + "</button>"; }).join("") : '<p class="hrec-memo">고른 상황 없음</p>') + "</div></div>" +
      '<div class="hrec-sec"><h4>자동 문장</h4><p class="hrec-auto"><span class="ai">' + esc(hrAuto(g)) + "</span></p></div>" +
      '<div class="hrec-sec"><h4>메모</h4><p class="hrec-memo">' + esc(v.memo) + "</p></div>" +
      '<div class="hrec-acts"><button type="button" class="btn ghost pr" data-act="hedit" data-k="' + g.hid + '">' + I.pen + "고치기</button></div>" + // 마지막 기록 고치기 = 오늘 탭 «기록 고치기»와 같은 편집 화면(reopenRec)
      '<div class="hrec-sec"><h4>만든 문서들</h4><div class="hrec-docs">' + dl + "</div></div></section>";
  }
  function hrBody() { return HR.open && hrPhone() ? hrecOne() : hrecList() + (HR.open ? hrecOne() : ""); }
  function hrecView() { return HRX ? '<div class="hrec" id="hrec" aria-label="가구별 기록·문서">' + hrBody() + "</div>" : ""; }
  function hrDoc(key) { var p = key.split("|"), g = hrGroups().filter(function (x) { return x.hid === p[0]; })[0]; return g ? HRX.docsOf(g, lsGet(LS_HDOC, {}) || {}).filter(function (d) { return d.k === p[1]; })[0] : null; }
  function hrHwpx(hids) {
    var gs = hrGroups().filter(function (g) { return hids.indexOf(g.hid) >= 0; }); if (!gs.length) return;
    // S12-z: 한 가구 = «마지막 방문일_가구번호_가구별기록.hwpx» · 여러 가구 = ZIP 하나(안에 «날짜/YYYY-MM-DD/»·«가구별/가구번호/» 폴더 — 브라우저는 폴더를 못 만들어 ZIP이 폴더 역할)
    needLibs().then(function () {
      var n = new Date(), made = n.getFullYear() + ". " + (n.getMonth() + 1) + ". " + n.getDate() + ".", de = lsGet(LS_HDOC, {}) || {}, W = window.DaeumHwpx, X = window.DaeumXlsx;
      if (gs.length === 1) return W.download(HRX.hwpxDoc(gs, de, made), fnm(gs[0].last.at, gs[0].hid, "가구별기록", "hwpx"));
      return X.save(X.zip(HRX.zipFiles(gs, function (g) { return W.build(HRX.hwpxDoc([g], de, made)); }, fnm)), fnm(n, gs.length + "가구", "가구별기록", "zip"), "application/zip");
    }).then(function () { toast(gs.length > 1 ? "ZIP을 받았습니다 · 가구 " + gs.length + "곳(날짜별·가구별 폴더)" : "hwpx를 받았습니다 · 가구 " + gs[0].hid); }, function () { toast("문서 부품을 불러오지 못했습니다 — 전파가 돌아오면 다시 눌러 주세요"); });
  }
  function hrPrint(d, hid) { // S12-z: 인쇄 창 제목(= PDF 저장 이름)도 «방문일_가구번호_문서종류»
    var f = document.createElement("iframe"); f.setAttribute("aria-hidden", "true"); f.setAttribute("tabindex", "-1"); f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
    document.body.appendChild(f);
    var w = f.contentWindow, dc = w.document; dc.open(); var g0 = hrGroups().filter(function (x) { return x.hid === hid; })[0]; dc.write('<!doctype html><meta charset="utf-8"><title>' + esc(fnm(g0 ? g0.last.at : new Date(), hid, d.nm)) + '</title><style>body{font:14px/1.7 "Noto Sans KR",sans-serif;margin:20mm}pre{white-space:pre-wrap;font:inherit}</style><pre>' + esc(d.text) + "</pre>"); dc.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) { /* 인쇄 막힘 */ } setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1000); }, 50);
  }
  function bindHrec() {
    var box = app.querySelector("#hrec"); if (!box) return;
    function redraw() { box.innerHTML = hrBody(); }
    box.addEventListener("input", function (e) {
      if (e.target.id !== "hq") return;
      HR.f.q = e.target.value; redraw(); var q = box.querySelector("#hq"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } // 시안: 쓰는 중에도 칸 유지
    });
    box.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-act]") : null; if (!t || !box.contains(t)) return;
      var k = t.dataset.k, f = HR.f;
      switch (t.dataset.act) {
        case "hfo": HR.fo = !HR.fo; break;
        case "hf": { var g = t.dataset.g; f[g] = f[g] === k ? "" : k; break; }
        case "hsort": HR.sort = k; break;
        case "hall": hrList().forEach(function (x) { HR.sel[x.hid] = true; }); break;
        case "hpick": HR.sel[k] = !HR.sel[k]; break;
        case "hselx": HR.sel = {}; break;
        case "hbulk": hrHwpx(Object.keys(HR.sel).filter(function (z) { return HR.sel[z]; })); return;
        case "hopen": HR.open = HR.open === k ? null : k; HR.edit = null; break;
        case "hclose": HR.open = null; HR.edit = null; break;
        case "hedit": reopenRec(k, false); return; // 오늘 탭 «기록 고치기»와 같은 편집 화면 · 고쳐도 방문 일시 유지·고친 시각 남김
        case "hcancel": HR.edit = null; break;
        case "hsave": {
          var ta = box.querySelector("#hrDocTxt"), gg = hrGroups().filter(function (x) { return x.hid === k.split("|")[0]; })[0]; if (!ta || !gg) return;
          // S12-y(70회차): 본문 고침도 같은 계정 PC·폰 실시간 연동(sync.js saveDoc → doc_edit) · 연동이 없으면 이 기기 저장
          var kp = k.split("|"); HR.edit = null;
          if (SY.saveDoc) SY.saveDoc(kp[0], kp[1], ta.value, gg.last.id); else { var all = lsGet(LS_HDOC, {}) || {}; all[k] = { text: ta.value.slice(0, 4000), at: new Date().toISOString(), base: gg.last.id }; lsSet(LS_HDOC, all); }
          redraw(); toast(SY.state().mode === "live" ? "문서 본문을 저장했습니다 · 같은 계정 PC·폰에 반영" : "문서 본문을 이 기기에 저장했습니다 · 연결되면 같은 계정에 보냅니다"); return;
        }
        case "hre": { var kq = k.split("|"); if (SY.dropDoc) SY.dropDoc(kq[0], kq[1]); else { var a2 = lsGet(LS_HDOC, {}) || {}; delete a2[k]; lsSet(LS_HDOC, a2); } redraw(); toast("바뀐 기록으로 다시 만들었습니다"); return; }
        case "hdoc": {
          var key = t.dataset.d, d = hrDoc(key); if (!d) return;
          if (k === "hwpx") hrHwpx([key.split("|")[0]]);
          else if (k === "인쇄") hrPrint(d, key.split("|")[0]);
          else if (k === "복사") copy(d.text);
          else if (k === "고치기") { HR.edit = key; redraw(); var tx = box.querySelector("#hrDocTxt"); if (tx) tx.focus(); }
          else if (SY.state().mode === "live") toast("같은 계정 PC·폰에 이미 반영됐습니다(기록 실시간 연동)"); else { toast("로그인하면 같은 계정 PC·폰에 바로 반영됩니다"); accountPanel(); }
          return;
        }
        default: return;
      }
      redraw();
    });
  }
  function docsView() {
    var M = docModel(), now = new Date();
    if (!M.dd) return top("docs", "<strong>문서함</strong>가상 데이터") + '<main class="wrap"><div class="emptyc blk"><b>아직 방문 기록이 없습니다</b>폰에서 «기록 저장»을 누르면 이 화면이 바로 채워집니다.<a class="btn pri" data-dock="1" data-dock-lbl="현장 탭으로" data-dock-sub="기록 저장하면 문서가 채워짐" href="#home">현장 탭으로</a></div>' + hrecView() + "</main>";
    if (!docDay) docDay = M.dd.n;
    var D0 = DOCS.filter(function (d) { return d.k === docSel; })[0];
    var list = DOCS.map(function (d) {
      var q = d.k === "d5" || d.k === "d6" ? M.pend[d.k] : M.pend[d.k], tot = M.cnt[d.k];
      var made = tot > 0 && q === 0;
      return '<button type="button" class="row' + (d.k === docSel ? " sel" : "") + (made ? " made" : "") + '" data-doc="' + d.k + '"><span class="q' + (q ? "" : " z") + '">' + q + '</span><span class="nm"><b>' + d.nm + "</b><small>" + esc(d.sub) + (tot ? " · " + tot + "건" : " · 해당 없음") + '</small></span><span class="dmeter" aria-hidden="true">' + d.meter.map(function (x) { var q = MET_SRC[x[0]]; return '<i class="' + x[0] + " pat-" + q + '" data-src="' + q + '" data-pat="' + q + '" style="flex:' + x[1] + '"></i>'; }).join("") + '</span><span class="go">' + (made ? "받음 ✓" : d.k === docSel ? "만드는 중" : "만들기") + "</span></button>";
    }).join("");
    var pv = docPreview(M, docSel);
    var dayLbl = (M.dd.date ? md(M.dd.date) : M.dd.n + "일차") + " 방문 " + M.cases.filter(function (x) { return x.st !== "planned"; }).length + "곳";
    return top("docs", "<strong>" + esc(dayLbl) + "</strong>가상 데이터") + '<main class="wrap">' +
      '<div class="dhead"><h1>' + (M.past ? "그날 받은 문서 <span>" + Object.keys(M.cnt).reduce(function (a, k) { return a + (DOC_OPT[k] || k === "d6" ? 0 : M.cnt[k]); }, 0) + "</span>건" : "만들 문서 <span>" + M.pending + "</span>건") + '</h1><p>막대 색 = 칸을 채운 곳 · <b style="color:#5D6B80">남색</b> 한국사회보장정보원 명단·API · 회색 규칙 숫자 · 노랑 자동 문장(확인) · 빨강 빈칸(입력 필요)</p></div>' +
      (M.rd.filter(function (d) { return !d.past; }).length > 1 || M.past ? dayPick(M) : "") +
      // S12-x 66회차: 시안 v3 scrReport — 첫 칸(문서 목록) | 둘째 칸(미리보기) | 셋째 칸(이력·가구별 기록·남은 가구·인계 카드)
      '<div class="dep blk"><div class="hd"><span>대기</span><span>문서</span><span>채워진 칸</span><span></span></div>' + list + "</div>" + C2 +
      '<section class="prev blk" id="docPrev" tabindex="-1" aria-label="' + esc(D0.nm) + ' 미리보기">' + pv + "</section>" + C3 + docHist(M) + hrecView() + (FD ? FD.reportCards() : "") + // S12-x 가구별 기록·문서 · S12-i3 ⑥남은 가구 막대 ③인계 카드
      qcards("이 탭의 다른 기능", [
        ["user", "가구별 기록·문서", "찾기·고치기·다시 만들기", 'data-qto="#hrec"'],
        ["down", "한 번에 내려받기", "고른 문서 묶어서", 'data-qto="[data-act=hbulk]"'],
        ["hist", "주별 이력", "방문 기록·문서 6주", 'data-qto=".dhist"'],
        FD ? ["people", "남은 가구 막대", "읍면·담당별", 'data-qto=".fd-remain"'] : null,
        FD ? ["copy", "한 장 인계 카드", "담당 교체·부재 때", 'data-qto=".fd-hand"'] : null,
        ["report", "실적·사후관리", "읍면별 진도·이번 주 할 일", 'data-go="#perf"']
      ]) + docDock(M, D0) +
      '<p class="demo"><span class="samp">가상 데이터</span><span>개인정보 4칸(성명·주민등록번호·연락처·주소) 미기재 · 가구 번호·읍면만 · 상담일지 입력·전자서명은 행복이음에서</span></p></main>';
  }
  /** 74회차 문서함 주 단추 — 대기 문서가 있으면 고른 문서 «1 만들기 → 2 받기»(미리보기 안 같은 단추를 대신 누름), 없으면 «실적 보기». 보조 = 미리보기로 */
  function docDock(M, D0) {
    if (!M.pending) return '<a class="btn pri" data-dock="1" data-dock-lbl="실적·사후관리 보기" data-dock-sub="문서 대기 0 · 읍면별 진도" href="#perf">실적 보기</a>';
    var m1 = !!made1[(docSel === "d5" ? "d5:" + docPer : docSel) + ":" + (docHid || "")];
    return '<button type="button" class="btn sbtn" data-dock="2" data-dock-lbl="미리보기" data-qto="#docPrev">' + (I.eye || "") + "미리보기</button>" +
      '<button type="button" class="btn pri" data-act="dockdoc" data-dock="1" data-dock-lbl="' + esc((/\(([^)]+)\)$/.exec(D0.nm) || [, D0.nm])[1] + (m1 ? " 받기" : " 만들기")) + '" data-dock-sub="' + (m1 ? "2 받기 · hwpx·xlsx" : "1 만들기 → 2 받기 · 대기 " + M.pending + "건") + '">문서</button>';
  }
  function flowBtns(k, ready, label2, label3, why) { // why: «받기»가 꺼진 이유 한 줄(68회차 ⑭ — 꺼진 단추 바로 아래)
    var m1 = !!made1[k + ":" + (docHid || "")], on = m1 && ready ? "" : " disabled";
    return '<div class="flow2"><button type="button" class="' + (m1 ? "d1" : "d2") + '" data-act="make">' + (m1 ? "1 만들기 ✓" : "1 만들기") + "</button><em>→</em>" +
      '<button type="button" class="' + (m1 ? "d2" : "") + '" data-act="get"' + on + ">2 " + label2 + "</button>" +
      (label3 ? '<button type="button" class="' + (m1 ? "d2" : "") + '" data-act="get" data-alt="1"' + on + ">2 " + label3 + "</button>" : "") + (m1 && !ready && why ? '<span class="fwhy" role="note">' + esc(why) + "</span>" : "") + "</div>";
  }
  /** D1 상담일지 초안 — 미리보기·복사·보관 hwpx 가 같은 값을 쓰게 한 곳에서 만든다(규칙 «자동 정리») */
  function d1Draft(x) {
    return F.askGuide.draft({ label: "가구 " + x.id, area: x.h.area, at: x.at, method: "방문 상담", needs: F.askGuide.detect(x.memo), summary: x.memo, services: x.tags.filter(function (t) { return !isField(t) && !SIGN_REV[t] && !/^(주거|생계|건강|고립)$/.test(t); }), next: (F.promises.open(prAll(), x.id)[0] || {}).text || "", guide: F.askGuide.check(x.memo, null, askedOf(x.id)) });
  }
  /** D1 보관용 hwpx 문서 모델 — 가구 번호·읍면만, 성명·주민등록번호·연락처·주소 칸 없음 */
  function d1Hwpx(x, dft, made, office, TW) {
    return { title: "상담일지 초안(보관용)", subtitle: "가구 " + x.id + " · " + x.h.area + " · 자동 정리 · 담당자 확인 전", made: made, office: office,
      blocks: [{ t: "ch", text: "Ⅰ. 상담 내용" }, { t: "tbl", title: "<표 1> 행복이음 입력 순서", head: ["항목", "내용"], widths: TW ? [Math.round(TW * .22), TW - Math.round(TW * .22)] : undefined, rows: dft.fields.map(function (f) { return [f.label, f.value]; }) },
        { t: "p", kind: "note", text: "※ 현장 기록을 규칙으로 자동 정리한 초안 · 개인정보 4칸(성명·주민등록번호·연락처·주소) 미기재, 가구 번호·읍면만 · 입력·전자서명은 담당자가 행복이음에서 · 시연용 가상 가구  끝." }] };
  }
  /** D5 주간·월간 실적 hwpx 문서 모델 — 숫자는 periodModel 규칙 집계만 */
  function d5Hwpx(w, made, office, TW) {
    var mo = w.per === "mo", B = [{ t: "ch", text: "Ⅰ. 한 줄 결론" }, { t: "li", lv: 1, text: w.concl }, { t: "ch", text: "Ⅱ. 추진 실적" },
      { t: "tbl", title: "<표 1> " + (mo ? "이번 달" : "이번 주") + " 방문 결과", head: ["구분", "가구"], rows: [["만남·상담", String(w.met)], ["부재(다시 방문)", String(w.absent)], ["거절", String(w.refuse)], ["합계", String(w.total)]] },
      { t: "li", lv: 1, text: "읍면별: " + (w.areas.map(function (a) { return a[0] + " " + a[1]; }).join(", ") || "없음") },
      { t: "li", lv: 1, text: "명단 처리: " + w.listN + "가구 중 " + w.doneN + "가구 확인" }];
    if (mo) B.push({ t: "li", lv: 1, text: "주차별 추세: " + (w.weeks.map(function (x) { return x[0] + " " + x[1] + "곳"; }).join(", ") || "없음") });
    B.push({ t: "ch", text: "Ⅲ. 지역 배경" });
    if (mo && w.rcpRows.length) {
      B.push({ t: "tbl", title: "<표 2> 상주시 수급권자 현황(한국사회보장정보원 15062448, 2025-12)", head: ["사업명", "수급권자", "수급가구"], rows: w.rcpRows });
      B.push({ t: "li", lv: 1, text: "비교: " + w.cmp });
    } else B.push({ t: "li", lv: 1, text: w.rcp + " — 한국사회보장정보원 복지사업 시군구별 수급권자 현황(15062448)" });
    B.push({ t: "p", kind: "note", text: "※ 숫자는 현장 기록 규칙 집계 · 시연용 가상 가구 · 담당자 확인 후 확정  끝." });
    return { title: w.name + " 추진 실적 보고", subtitle: mdDot(w.from) + " ~ " + mdDot(w.to), made: made, office: office, blocks: B };
  }
  // ── S12-d 40 선택 문서: D7 한 장 인계 카드 · D8 큰 글씨 안내문(호창님 B 선택) ──
  /** D7 대상 = 그날 방문 기록이 있는 가구 전부 */
  function handCands(cases) { return cases.filter(function (x) { return x.st !== "planned"; }); }
  /** D8 대상 = 만남·부재 가구 중 65세 이상(없으면 만남·부재 전부 — 시연 화면이 비지 않게) */
  function bigCands(cases) {
    var c = cases.filter(function (x) { return x.st === "done" || x.st === "absent"; });
    var old = c.filter(function (x) { var m = x.h.members && x.h.members[0]; return m && m.age >= 65; });
    return old.length ? old : c;
  }
  var ST_LBL = { done: "만남·상담", absent: "부재", refused: "거절" };
  var EASY = { care: "안부 확인·생활 도움(돌봄) 신청", mental: "마음 건강 상담", housing: "집 고치기·주거 지원 신청", emergency: "급한 생활비 지원 검토" };
  /** 다음 할 일·날짜 — 부재 = 근무일 2일 뒤 재방문 · 거절 = 근무일 5일 뒤 다시 권유 · 만남 = 열린 약속(없으면 연계 결과 확인 근무일 5일 뒤) */
  function nextStep(x, now) {
    var pr = F.promises.open(prAll(), x.id)[0], vt = F.visitTime.profile(attempts(), x.id, {});
    var slot = vt.best ? vt.best.label : "";
    if (x.st === "absent") { var d = U.addWorkdays(now, A.retryGap); return { date: d, text: "다시 방문" + (slot ? "(" + slot + ")" : ""), slot: slot, best: vt.best }; }
    if (x.st === "refused") return { date: U.addWorkdays(now, 5), text: "다시 권유(근무일 5일 뒤)", slot: slot, best: vt.best };
    if (pr) return { date: pr.due && /^\d{4}-\d{2}-\d{2}/.test(pr.due) ? pr.due.slice(0, 10) : U.addWorkdays(now, 5), text: clip(pr.text, 40), slot: slot, best: vt.best };
    return { date: U.addWorkdays(now, 5), text: x.refs.length ? "연계 결과 확인" : "안부 확인", slot: slot, best: vt.best };
  }
  /** D7 인계 카드 칸 — 미리보기·hwpx 가 같은 값을 쓴다. 가구 번호·읍면만(개인정보 4칸 없음) */
  function d7Fields(M, x, now) {
    var mt = meta()[x.id] || {}, nx = nextStep(x, now), tries = attempts().filter(function (a) { return a.householdId === x.id; }).length;
    var to = (fills()[M.key] || {})["to_" + x.id] || "";
    return { nx: nx, tries: tries, to: to, fields: [
      { k: "가구", src: "data", v: "가구 " + x.id + " · " + x.h.area + " · " + ageLine(x.h) },
      { k: "발굴 순위", src: "data", v: x.past && !mt.prio ? "한국사회보장정보원 지난 차수 명단(" + String(x.at || "").slice(0, 7) + ")" : "한국사회보장정보원 " + (mt.prio || "—") + "순위 · " + roundYm() + " 차수" },
      { k: "마지막 방문", src: "rule", v: (x.at ? mdDot(x.at) + " " + hm(x.at) + " · " : "") + (ST_LBL[x.st] || "방문 전") },
      { k: "지금 상황", src: "ai", v: clip(String(x.memo || "").replace(/^확인:[^.]*\.\s*/, ""), 90) || "기록 없음" },
      { k: "현장 확인 징후", src: "rule", v: x.field.join(" · ") || "없음" },
      { k: "연계", src: "rule", v: x.refs.map(function (r) { return F.referral.ORGS[r].org.replace(/\(.*\)/, ""); }).join(" · ") || "없음" },
      { k: "넘겨줄 일", src: "rule", v: mdDot(nx.date) + " " + nx.text },
      { k: "만나기 좋은 때", src: "rule", v: nx.best ? nx.best.label + "(" + nx.best.hours + ")" : "기록이 더 쌓이면 나옵니다" },
      { k: "방문·연락", src: "rule", v: tries + "회" },
      { k: "받는 사람", src: to ? "rule" : "empty", v: to, input: "to_" + x.id }] };
  }
  function d7Hwpx(x, D, made, office, TW) {
    var w1 = Math.round(TW * 0.24), w3 = Math.floor(TW / 3);
    return { plain: true, title: "한 장 인계 카드", blocks: [
      { t: "t2", title: "한 장 인계 카드", sub: "가구 " + x.id + " · " + x.h.area + " · 담당자 교체·부재 때 넘김", made: made + "  " + office },
      { t: "kpi2", items: [{ k: "마지막 결과", v: ST_LBL[x.st] || "방문 전" }, { k: "방문·연락", v: String(D.tries), u: "회" }, { k: "다음 할 날", v: md(D.nx.date) }] },
      { t: "sec", text: "가구 상황" },
      { t: "tbl2", head: ["항목", "내용"], al: ["L", "L"], widths: [w1, TW - w1], rows: D.fields.filter(function (f) { return !f.input; }).map(function (f) { return [f.k, f.v]; }) },
      { t: "sec", text: "넘겨줄 일" },
      { t: "ci", lv: 2, text: "**" + md(D.nx.date) + "** " + D.nx.text },
      { t: "ci", lv: 2, text: "만나기 좋은 때: " + (D.nx.best ? D.nx.best.label + "(" + D.nx.best.hours + ")" : "기록이 더 쌓이면 나옵니다") },
      { t: "ci", lv: 3, text: "성명·연락처·주소는 행복이음에서 확인" },
      { t: "sec", text: "주고받기" },
      { t: "tbl2", head: ["넘긴 사람", "받는 사람", "넘긴 날"], al: ["C", "C", "C"], widths: [w3, w3, TW - w3 * 2], rows: [["(서명)", D.to ? D.to + " (서명)" : "(서명)", made]] },
      { t: "p", kind: "small", text: "※ 가구 칸 = 한국사회보장정보원 발굴대상자 명단 · 상황 칸 = 현장 기록 자동 정리(담당자 확인) · 개인정보 4칸 미기재 · 시연용 가상 가구  끝." }] };
  }
  /** D8 큰 글씨 안내문 — 집에 남기는 종이라 가구 번호·이름·주소·사정은 적지 않는다. 22pt 칸만 쓴다 */
  function d8Model(x, now) {
    var nx = nextStep(x, now), ab = x.st === "absent";
    var help = x.refs.map(function (r) { return EASY[r] || F.referral.ORGS[r].org.replace(/\(.*\)/, ""); });
    return { nx: nx, ab: ab,
      title: ab ? "오늘 찾아뵈었는데 안 계셨어요" : "오늘 말씀 나눠 주셔서 고맙습니다",
      sub: x.h.area + " 행정복지센터 맞춤형복지팀에서 다녀갔습니다",
      cards: [
        { k: ab ? "다시 찾아뵙는 날" : "다음에 연락드리는 날", v: md(nx.date) + (nx.slot ? " " + nx.slot : "") },
        ab ? { k: "준비하실 것", v: "없습니다. 집에 계시면 됩니다" } : { k: "도와 드릴 일", v: help.length ? help.join(", ") : "말씀하신 일을 함께 알아보겠습니다" },
        { k: "궁금하시면 전화 주세요", v: "☎ ____________", s: x.h.area + " 행정복지센터 맞춤형복지팀" }] };
  }
  function d8Hwpx(B, made) {
    return { plain: true, title: "큰 글씨 안내문", blocks: [{ t: "t2", title: B.title, sub: B.sub, made: made }]
      .concat(B.cards.map(function (c) { return { t: "kpi2", big: true, items: [c] }; }))
      .concat([{ t: "p", kind: "small", text: "※ 큰 글씨 안내문 · 성명·주소·사정은 적지 않았습니다 · 전화번호는 담당자가 손으로 적어 드립니다 · 시연용 가상 가구" }]) };
  }
  function hhPick(arr) {
    if (!arr.length) return "";
    if (!docHid || !arr.some(function (x) { return x.id === docHid; })) docHid = arr[0].id;
    return arr.length > 1 ? '<div class="hh-pick" role="group" aria-label="가구">' + arr.map(function (x) { return '<button type="button" data-hh="' + x.id + '" aria-pressed="' + (x.id === docHid) + '">' + x.id + "</button>"; }).join("") + "</div>" : "";
  }
  // ── S12-e 43 A4 출력 틀: 머리(기관·문서명·기준일)·«읽는 법» 상자·꼬리(출력 시각·쪽번호 자리)·쪽 나눔 표시 ──
  //   class: .print-doc(문서 한 장 묶음) · .doc-head · .doc-legend · .doc-body · .doc-foot(쪽번호는 @page 여백이 맡음) · .no-print(인쇄 때 숨김)
  //          .pg-keep(쪽 경계에서 자르지 않음) · .pg-break(이 앞에서 새 쪽) · .only-screen / .xrow(화면에선 접고 인쇄 때만 다 보임)
  //   흑백 구분: .pat-<값> + [data-pat] — 출처 data|rule|ai|empty · 그래프 계열 met|absent|refuse|visit([data-series]도 같은 값)
  var SRC_LB = { data: "남색 = 한국사회보장정보원 명단·API", rule: "회색 = 규칙으로 센 숫자", ai: "노랑 = 자동 정리 문장(담당자 확인)", empty: "빨강 = 손으로 채울 칸" };
  function swatch(src) { return '<i class="sw pat-' + src + '" data-src="' + src + '" data-pat="' + src + '" style="background:' + SRC_CLS[src] + '"></i>'; }
  function srcSw(list) { return '<div class="legend dl-sw">' + (list || ["data", "rule", "ai", "empty"]).map(function (k) { return '<span data-src="' + k + '">' + swatch(k) + esc(SRC_LB[k]) + "</span>"; }).join("") + "</div>"; }
  var SER = { met: ["만남·상담", "#2E8270"], absent: ["부재", "#C2862C"], refuse: ["거절", "#8A9396"], visit: ["방문한 곳", "#5D6B80"] };
  function serSw(keys) { return '<div class="legend dl-sw dl-ser">' + keys.map(function (k) { return '<span data-series="' + k + '"><i class="sw pat-' + k + '" data-series="' + k + '" data-pat="' + k + '" style="background:' + SER[k][1] + '"></i>' + esc(SER[k][0]) + "</span>"; }).join("") + "</div>"; }
  /** «읽는 법» 작은 상자 — rows: [[이름, 뜻]] · sw: 색 범례 html */
  function legendBox(rows, sw, cls) {
    return '<aside class="doc-legend pg-keep' + (cls ? " " + cls : "") + '" aria-label="읽는 법"><b class="dl-t">읽는 법</b><dl>' + rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + "</dl>" + (sw == null ? srcSw() : sw) + "</aside>";
  }
  function dotDate(d) { d = typeof d === "string" && d.length === 10 ? new Date(d + "T00:00:00") : new Date(d); return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate() + "."; }
  /** 한 장 묶음 — 머리·읽는 법·본문·꼬리. 인쇄(window.print)는 이 묶음만 A4로 낸다(미르 @media print) */
  function sheet(k, name, basis, legend, body) {
    var now = new Date();
    return '<article class="print-doc" data-doc="' + k + '" data-doc-name="' + esc(name) + '">' +
      '<header class="doc-head"><span class="dh-org">상주시청</span><b class="dh-name">' + esc(name) + '</b><span class="dh-date">' + esc(basis) + "</span></header>" +
      legend + '<div class="doc-body">' + body + "</div>" +
      '<footer class="doc-foot"><span class="df-l">닿음 · 시연용 가상 데이터 · 개인정보 4칸 미기재</span><span class="df-r">출력 ' + dotDate(now) + " " + hm(now) + "</span></footer></article>";
  }
  function ctl(html) { return '<div class="doc-ctl no-print">' + html + '<button type="button" class="pr-btn" data-act="print">인쇄·PDF</button></div>'; }
  var LEG = '<div class="legend"><span><i style="background:var(--src-data)"></i>한국사회보장정보원 명단·API</span><span><i style="background:var(--src-rule)"></i>규칙 숫자</span><span><i style="background:var(--src-ai)"></i>자동 문장 확인</span><span><i style="background:var(--src-empty)"></i>입력 필요</span></div>'; // 사용 방법 화면용(옛 범례 줄)
  function cell(f) { var v = f.src === "ai" ? "<mark>" + esc(f.v) + "</mark>" : f.src === "rule" ? '<span class="rule">' + esc(f.v) + "</span>" : esc(f.v); if (f.input) v = '<input data-fill="' + f.input + '" class="' + (f.v ? "ok" : "") + '" value="' + esc(f.v) + '" placeholder="입력 필요" aria-label="' + esc(f.k) + '"><span class="pr-val">' + (f.v ? esc(f.v) : "&nbsp;") + "</span>"; return v; }
  function paper(title, sub, fields) {
    return '<div class="paper">' + rulerOf(fields.map(function (f) { return f.src; })) + "<h3>" + esc(title) + '</h3><div class="sub">' + esc(sub) + '</div><table class="doc-t pg-keep"><caption class="sr">' + esc(title) + '</caption>' + fields.map(function (f) { return "<tr><th>" + esc(f.k) + '</th><td data-src="' + f.src + '">' + cell(f) + "</td></tr>"; }).join("") + "</table></div>";
  }
  /** 가로 누적 막대(흑백에서도 칸마다 이름·숫자가 글자로 붙는다) */
  function stackFig(cap, parts) {
    var tot = parts.reduce(function (a, p) { return a + p[1]; }, 0);
    return '<figure class="doc-chart pg-keep" data-chart="stack"><figcaption>' + esc(cap) + " <small>합계 " + tot + '곳</small></figcaption><div class="dc-stack" role="img" aria-label="' + esc(parts.map(function (p) { return SER[p[0]][0] + " " + p[1]; }).join(", ")) + '">' +
      parts.filter(function (p) { return p[1]; }).map(function (p) { return '<i class="dc-seg pat-' + p[0] + '" data-series="' + p[0] + '" data-pat="' + p[0] + '" style="flex:' + p[1] + ";background:" + SER[p[0]][1] + '"><span>' + esc(SER[p[0]][0]) + " " + p[1] + "</span></i>"; }).join("") + (tot ? "" : '<i class="dc-seg dc-zero">기록 없음</i>') + "</div></figure>";
  }
  /** 세로 막대(주차·주별) — 막대 위에 숫자, 아래에 이름 */
  function colFig(cap, cols, key) {
    var mx = Math.max(1, Math.max.apply(null, cols.map(function (c) { return c[1]; })));
    return '<figure class="doc-chart pg-keep" data-chart="cols"><figcaption>' + esc(cap) + '</figcaption><div class="dc-cols" role="img" aria-label="' + esc(cols.map(function (c) { return c[0] + " " + c[1]; }).join(", ")) + '">' +
      cols.map(function (c) { return '<div class="dc-c"><em>' + c[1] + '</em><span class="dc-bar pat-' + key + '" data-series="' + key + '" data-pat="' + key + '" style="height:' + (c[1] / mx * 100).toFixed(0) + "%;background:" + SER[key][1] + '"></span><b>' + esc(c[0]) + "</b></div>"; }).join("") + "</div></figure>";
  }
  function srcLine(t) { return '<p class="srcline">' + t + "</p>"; }
  function rulerOf(list) { return '<div class="ruler">' + list.map(function (q) { return '<i class="pat-' + q + '" data-src="' + q + '" data-pat="' + q + '" style="background:' + SRC_CLS[q] + '"></i>'; }).join("") + "</div>"; }
  function docPreview(M, k) {
    var now = M.past && M.dd.date ? new Date(M.dd.date + "T17:30:00") : new Date(), area = BY[M.dd.ids[0]].area;
    var vday = M.dd.date ? dotDate(M.dd.date) : M.dd.n + "일차", bas = "방문일 " + vday + (M.past ? " · 지난 기록" : "");
    if (k === "d2") {
      docHid = "";
      var fs = d2Fields(M), empties = fs.filter(function (f) { return f.src === "empty"; }).length;
      var hh = '<table class="doc-t doc-hh pg-keep"><caption>가구별 결과</caption><thead><tr><th>가구</th><th>읍면</th><th>결과</th><th>요지</th></tr></thead><tbody>' + M.cases.map(function (c) { return "<tr><td>" + c.id + "</td><td>" + esc(c.h.area) + '</td><td data-src="rule"><span class="rule">' + (ST_LBL[c.st] || "방문 전") + '</span></td><td data-src="ai">' + (c.st === "done" ? "<mark>" + esc(clip(c.memo, 46)) + "</mark>" : c.st === "absent" ? "다시 방문" : c.st === "refused" ? "근무일 5일 뒤 다시 권유" : "") + "</td></tr>"; }).join("") + "</tbody></table>";
      return ctl(flowBtns("d2", !empties, "hwpx 받기", null, empties ? fs.filter(function (f) { return f.src === "empty"; }).map(function (f) { return "«" + f.k + "»"; }).join("·") + " 칸이 비어 받기가 꺼져 있습니다" : "")) + sheet("d2", "복명서", bas, legendBox([["결과", "그날 확정한 방문 결과를 센 가구 수(만남·부재·거절)"], ["명단 사유 밖 징후", "현장 확인에서 «문제 있음»을 고른 가구 수"], ["기준", "방문일 하루 · 출장 시각은 첫 기록~마지막 기록"], ["출처", "가구 = 한국사회보장정보원 발굴대상자 명단 · 나머지 = 현장 기록"]], serSw(["met", "absent", "refuse"]) + srcSw()),
        stackFig("그날 방문 결과", [["met", M.met.length], ["absent", M.ab.length], ["refuse", M.cases.filter(function (x) { return x.st === "refused"; }).length]]) + paper("복명서", "상주시청 · " + area + " 맞춤형복지팀 · " + mdDot(now) + " 작성", fs) + hh +
        '<p class="srcline only-screen">빈칸이 0이 되면 받기가 켜집니다 · 칸 이름은 시군 서식에 맞춰 바꿀 수 있는 가정(정의서 §7)</p>');
    }
    if (k === "d1") {
      if (!M.met.length) return '<div class="emptyc"><b>만난 가구가 없습니다</b>상담일지 초안은 «만남»으로 확정한 가구에만 생깁니다.</div>';
      var pk = hhPick(M.met), x = M.cases.filter(function (c) { return c.id === docHid; })[0];
      var dft = d1Draft(x);
      return ctl(pk + flowBtns("d1", true, "입력 순서 복사", "보관 hwpx 받기")) + sheet("d1", "상담일지 초안", bas + " · 가구 " + x.id, legendBox([["칸 순서", "행복이음 상담일지 입력 순서 그대로"], ["노랑 칸", "현장 기록을 규칙으로 정리한 문장 — 담당자가 고친 뒤 입력"], ["출처", "연계 후보 = 한국사회보장정보원 복지서비스 OpenAPI(15090532·15108347)"]], srcSw(["data", "rule", "ai"])),
        '<div class="paper">' + rulerOf(["data", "rule", "ai", "ai"]) + '<h3>상담일지 초안</h3><div class="sub">행복이음 입력용 · 자동 정리 · 공무원 확정 전 · 보관 hwpx는 가구 번호·읍면만</div><table class="doc-t pg-keep"><caption class="sr">상담일지 초안 항목</caption>' +
        dft.fields.map(function (f) { var a = /main|situation|plan|needs|action/.test(f.key); return "<tr><th>" + esc(f.label) + '</th><td data-src="' + (a ? "ai" : "rule") + '">' + (a ? "<mark>" + esc(f.value) + "</mark>" : '<span class="rule">' + esc(f.value) + "</span>") + "</td></tr>"; }).join("") + "</table></div>" +
        srcLine(esc(dft.note)));
    }
    if (k === "d3") {
      var cand = M.linked.length ? M.linked : M.met;
      if (!cand.length) return '<div class="emptyc"><b>연계할 가구가 없습니다</b>«만남» 기록에서 연계 후보를 고르면 의뢰서가 생깁니다.</div>';
      var pk3 = hhPick(cand), y = M.cases.filter(function (c) { return c.id === docHid; })[0];
      var keys = Object.keys(F.referral.ORGS), pk = docOrgPick[docHid]; docOrg = pk && keys.indexOf(pk) >= 0 ? pk : y.refs[0] && keys.indexOf(y.refs[0]) >= 0 ? y.refs[0] : "care"; // S12-v U14(B9): 고른 기관이 없을 때만 추천 기관
      var o = F.referral.ORGS[docOrg];
      var fs3 = [{ k: "받는 기관", src: "rule", v: o.org }, { k: "대상", src: "data", v: "가구 " + y.id + " · " + y.h.area + " · " + ageLine(y.h) + " (성명·연락처는 행복이음 확인 후 기재)" },
        { k: "의뢰 사유", src: refWhyOf(y.id, y.memo) ? "hand" : "ai", v: clip(refWhyOf(y.id, y.memo) || memoNoWhy(y.memo), 90) }, { k: "요청", src: "rule", v: o.ask.join(" · ") }, { k: "붙임", src: "rule", v: o.docs.join(", ") }];
      return ctl(pk3 + '<div class="hh-pick" role="group" aria-label="받는 기관">' + keys.filter(function (kk) { return kk !== "emergency"; }).map(function (kk) { return '<button type="button" data-org="' + kk + '" aria-pressed="' + (kk === docOrg) + '">' + esc(F.referral.ORGS[kk].org.replace(/\(.*\)/, "")) + "</button>"; }).join("") + "</div>" +
        flowBtns("d3", true, "hwpx 받기")) + sheet("d3", "서비스 연계 의뢰서", bas + " · 가구 " + y.id, legendBox([["의뢰 사유", "현장 기록에서 옮긴 문장 — 보내기 전 담당자 확인"], ["요청·붙임", "받는 기관별로 정해 둔 항목"], ["출처", "연계 후보 = 한국사회보장정보원 복지서비스 OpenAPI(15090532·15108347) · 본인 동의 확인 후 발송"]], srcSw(["data", "rule", "ai"])),
        paper(o.title, o.org + " 앞", fs3));
    }
    if (k === "d4") {
      var cand4 = M.ab.concat(M.linked);
      if (!cand4.length) return '<div class="emptyc"><b>보낼 안내가 없습니다</b>부재·연계 가구가 생기면 문안이 만들어집니다.</div>';
      var pk4 = hhPick(cand4), z = M.cases.filter(function (c) { return c.id === docHid; })[0];
      var vt = F.visitTime.profile(attempts(), z.id, { neighborLog: neighborLog() });
      var msg = NT.alimtalk(z.st === "absent" ? "absent" : "link", { area: z.h.area, date: z.at ? ymd(z.at) : null, time: z.at ? hm(z.at) : null, nextDate: ymd(U.addWorkdays(now, A.retryGap)), nextSlot: vt.best && /오전/.test(vt.best.label) ? "오전" : "오후" });
      var bad = NT.lint(msg.body, [z.id]);
      return ctl(pk4 + flowBtns("d4", !bad.length, "문안 복사")) + sheet("d4", "안내 문자 문안", bas + " · 가구 " + z.id, legendBox([["글자 수", msg.chars + "자 — 알림톡 한 통 기준"], ["점검", "이름·주소·서비스명·광고성 낱말이 없는지 규칙으로 확인 · " + (bad.length ? "걸림 " + bad.join(", ") : "통과")], ["출처", NT.SOURCE_TALK]], srcSw(["rule", "ai"])),
        '<div class="paper">' + rulerOf(["rule", "ai", "ai"]) + "<h3>" + esc(msg.title) + '</h3><div class="sub">알림톡 미리보기 · 발송은 담당자가 · ' + msg.chars + '자</div><pre class="doc-pre pg-keep">' + esc(msg.body) + "</pre></div>");
    }
    if (k === "d5") {
      docHid = "";
      var w = periodModel(docPer), mo = docPer === "mo", fs5 = [{ k: "기간", src: "rule", v: mdDot(w.from) + " ~ " + mdDot(w.to) }, { k: "방문", src: "rule", v: "만남 " + w.met + " · 부재 " + w.absent + " · 거절 " + w.refuse + " (총 " + w.total + "곳)" },
        { k: "읍면별", src: "rule", v: w.areas.map(function (a) { return a[0] + " " + a[1]; }).join(" · ") || "—" }, { k: "처리 완료", src: "rule", v: "명단 " + w.listN + "가구 중 " + w.doneN + "가구 확인" }]
        .concat(mo ? [{ k: "주차별 추세", src: "rule", v: w.weeks.map(function (x) { return x[0] + " " + x[1] + "곳"; }).join(" · ") || "—" }, { k: "수급권자 현황 비교", src: "data", v: w.cmp }] : [])
        .concat([{ k: "지역 배경", src: "data", v: w.rcp }, { k: "한 줄 결론", src: "ai", v: w.concl }]);
      var perSw = '<div class="hh-pick" role="group" aria-label="보고 기간">' + [["wk", "주간"], ["mo", "월간"]].map(function (p) { return '<button type="button" data-per="' + p[0] + '" aria-pressed="' + (p[0] === docPer) + '">' + p[1] + "</button>"; }).join("") + "</div>";
      var lg5 = [["방문 곳 수", "기간 안에 방문 기록이 있는 가구 수 — 한 가구를 여러 번 가도 1곳(마지막 결과로 셈)"], ["처리 완료", "이번 차수 명단 가구 중 «만남·상담»까지 끝낸 가구"], ["기준", (mo ? "그달 1일~말일" : "월~금 한 주") + " · " + mdDot(w.from) + " ~ " + mdDot(w.to)], ["출처", "현장 기록 규칙 집계 · 지역 배경 = 한국사회보장정보원 «복지사업 시군구별 수급권자 현황»(15062448, 기준 2025-12)"]];
      return ctl(perSw + flowBtns("d5:" + docPer, true, "hwpx 받기")) + sheet("d5", w.name + " 추진 실적 보고", "기간 " + dotDate(w.from) + " ~ " + dotDate(w.to), legendBox(lg5, serSw(["met", "absent", "refuse"].concat(mo ? ["visit"] : [])) + srcSw(["data", "rule", "ai"])),
        stackFig((mo ? "그달" : "그 주") + " 방문 결과", [["met", w.met], ["absent", w.absent], ["refuse", w.refuse]]) + (mo && w.weeks.length ? colFig("주차별 방문 곳 수", w.weeks, "visit") : "") +
        paper(w.name + " 추진 실적 보고", "상주시청 · " + area + " 맞춤형복지팀", fs5) + (mo && w.rcpRows.length ? '<table class="doc-t doc-rcp pg-keep"><caption>상주시 수급권자 현황(한국사회보장정보원 15062448, 2025-12)</caption><thead><tr><th>사업명</th><th>수급권자</th><th>수급가구</th></tr></thead><tbody>' + w.rcpRows.map(function (r) { return "<tr><td>" + esc(r[0]) + '</td><td data-src="data">' + esc(r[1]) + '</td><td data-src="data">' + esc(r[2]) + "</td></tr>"; }).join("") + "</tbody></table>" : ""));
    }
    if (k === "d7") {
      var c7 = handCands(M.cases);
      if (!c7.length) return '<div class="emptyc"><b>넘길 가구가 없습니다</b>방문 기록이 있는 가구에만 인계 카드가 생깁니다.</div>';
      var pk7 = hhPick(c7), x7 = M.cases.filter(function (c) { return c.id === docHid; })[0], D7 = d7Fields(M, x7, now);
      return ctl(pk7 + flowBtns("d7", true, "hwpx 받기")) + sheet("d7", "한 장 인계 카드", bas + " · 가구 " + x7.id, legendBox([["발굴 순위", "한국사회보장정보원 명단의 차수 순위"], ["방문·연락", "이 가구에 남은 방문·연락 기록 횟수"], ["넘겨줄 일", "부재 = 근무일 2일 뒤 재방문 · 거절 = 근무일 5일 뒤 다시 권유 · 만남 = 열린 약속"], ["받는 사람", "비워 두면 종이에 손으로 적습니다"]]),
        paper("한 장 인계 카드", "가구 " + x7.id + " · " + x7.h.area + " · 담당자 교체·부재 때 넘김", D7.fields));
    }
    if (k === "d8") {
      var c8 = bigCands(M.cases);
      if (!c8.length) return '<div class="emptyc"><b>남길 안내문이 없습니다</b>만남·부재 가구가 생기면 큰 글씨 안내문이 만들어집니다.</div>';
      var pk8 = hhPick(c8), x8 = M.cases.filter(function (c) { return c.id === docHid; })[0], B8 = d8Model(x8, now);
      // 집에 남기는 종이 — «읽는 법»은 담당자 화면에만(인쇄본에는 넣지 않음)
      return ctl(pk8 + flowBtns("d8", true, "hwpx 받기")) + sheet("d8", "큰 글씨 안내문", "방문일 " + vday, legendBox([["날짜", "부재 = 근무일 2일 뒤 · 만남 = 다음 연락 예정일"], ["넣지 않는 것", "가구 번호·성명·주소·사정 — 집에 남기는 종이라서"], ["전화번호", "담당자가 손으로 적습니다 · 한글에서 22pt 굵은 글씨로 열립니다"]], "", "no-print"),
        paper(B8.title, B8.sub, B8.cards.map(function (c) { return { k: c.k, src: "rule", v: c.v + (c.s ? " · " + c.s : "") }; })));
    }
    docHid = "";
    var R = roundRows();
    return ctl(flowBtns("d6", true, "xlsx 받기")) + sheet("d6", "차수 처리 결과 명단", roundYm() + " 차수 · 명단 " + R.length + "가구", legendBox([["결과", "가구마다 마지막 방문 기록(만남·부재·거절·방문 전)"], ["다음 확인", "열린 약속의 날짜와 내용"], ["출처", "명단 열 = 한국사회보장정보원 발굴대상자 조회 서식(가구 번호·읍면·순위만, 개인정보 4칸 제외) · 방문 4열 = 현장 기록"]], srcSw(["data", "rule"])),
      '<div class="paper">' + rulerOf(["data", "data", "rule"]) + '<h3>차수 처리 결과 명단</h3><div class="sub">' + esc(roundYm()) + " 명단 " + R.length + "가구 · 명단 열 + 방문 4열(방문일·결과·연계·다음 확인)</div>" +
      '<table class="doc-t wide"><caption class="sr">차수 처리 결과 명단</caption><thead><tr><th>가구</th><th>읍면</th><th>발굴 순위</th><th>방문일</th><th>결과</th><th>연계</th><th>다음 확인</th></tr></thead><tbody>' + R.map(function (r) { return "<tr>" + r.map(function (v, i) { return "<td" + (i >= 3 ? ' data-src="rule"><span class="rule">' + esc(v) + "</span>" : ' data-src="data">' + esc(v)) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>");
  }
  var SIGN_REV = {}; Object.keys(SIGN_OF).forEach(function (k) { SIGN_REV[SIGN_OF[k]] = k; });
  /** D5 실적 집계 — 숫자는 현장 기록 규칙 집계만(per: "wk" 주간 | "mo" 월간). 월간은 주차별 추세 + 15062448 비교 */
  function periodModel(per) {
    var mo = per === "mo", w = mo ? monthRange() : weekRange(), to2 = new Date(w.to.getTime() + 864e5), L = logs().filter(function (l) { var t = new Date(l.at); return t >= w.from && t < to2; });
    var last = {}; L.forEach(function (l) { if (!last[l.household_no] || last[l.household_no].at < l.at) last[l.household_no] = l; });
    var ids = Object.keys(last), met = ids.filter(function (i) { return last[i].result === "met"; }).length, ab = ids.filter(function (i) { return last[i].result === "absent"; }).length, rf = ids.filter(function (i) { return last[i].result === "refuse"; }).length;
    var ar = {}; ids.forEach(function (i) { if (BY[i]) ar[BY[i].area] = (ar[BY[i].area] || 0) + 1; });
    var listN = listIds().length, doneN = listIds().filter(function (i) { return statusOf(i) === "done"; }).length;
    var b = RCP && RCP.rows ? RCP.rows.filter(function (r) { return r["사업명"] === "기초생활보장(맞춤형급여)"; })[0] : null;
    return { from: w.from, to: w.to, met: met, absent: ab, refuse: rf, total: ids.length, areas: Object.keys(ar).map(function (a) { return [a, ar[a]]; }), listN: listN, doneN: doneN,
      rcp: b ? "상주시 기초생활보장 수급가구 " + b["수급가구수"].toLocaleString() + "(" + b["기준년월"] + ")" : "수급권자 현황 자료 없음",
      concl: (mo ? "이번 달 " : "이번 주 ") + ids.length + "곳 방문해 " + met + "가구 상담" + (ab ? ", 부재 " + ab + "가구는 " + (mo ? "다음 방문 때" : "다음 주") + " 다시 방문" : "") + ".",
      name: mo ? "월간" : "주간", per: mo ? "mo" : "wk", weeks: mo ? weekTrend(w, L) : [], rcpRows: rcpRows(),
      cmp: b ? "이번 달 상담 " + met + "가구 = 상주 기초생활보장 수급가구 " + b["수급가구수"].toLocaleString() + "의 " + (met / b["수급가구수"] * 100).toFixed(2) + "%(" + b["기준년월"] + " 기준)" : "수급권자 현황 자료 없음" };
  }
  /** 월간 주차별 방문 곳 수(월요일 시작 주, 규칙 집계) */
  function weekTrend(w, L) {
    var out = [], s = new Date(w.from.getTime()), i = 1;
    while (s <= w.to) {
      var e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7 - ((s.getDay() + 6) % 7)), seen = {};
      L.forEach(function (l) { var t = new Date(l.at); if (t >= s && t < e) seen[l.household_no] = 1; });
      out.push([i + "주", Object.keys(seen).length]); s = e; i++;
    }
    return out;
  }
  /** 한국사회보장정보원 15062448 상주 행 — 사업명·수급권자수·수급가구수(위 4줄) */
  function rcpRows() { return RCP && RCP.rows ? RCP.rows.slice(0, 4).map(function (r) { return [r["사업명"], r["수급권자수"].toLocaleString(), r["수급가구수"].toLocaleString()]; }) : []; }
  function roundRows() {
    var p = plan(), mt = meta();
    return listIds().map(function (id) {
      var L = lastLog(id), st = statusOf(id), c = caseOf(id), pr = F.promises.open(prAll(), id)[0];
      return [id, BY[id].area, String((mt[id] || {}).prio || "—"), L ? ymd(L.at) : "", st === "done" ? "만남" : st === "absent" ? "부재" : st === "refused" ? "거절" : "방문 전", c.refs.length ? F.referral.ORGS[c.refs[0]].org.replace(/\(.*\)/, "") : "", pr ? (pr.due || "") + " " + clip(pr.text, 18) : ""];
    });
  }
  var hwpxP = null, libFail = false;
  function needLibs() {
    if (window.DaeumHwpx && window.DaeumXlsx) return Promise.resolve();
    if (hwpxP) return hwpxP;
    function load(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); no(new Error("lib")); }; document.head.appendChild(s); }); }
    hwpxP = (window.DaeumXlsx ? Promise.resolve() : load("shared/xlsx.js?v=s12z81")).then(function () { return window.DaeumHwpx ? null : load("shared/hwpx.js?v=s12z81"); })
      .then(function () { libFail = false; }, function (e) { hwpxP = null; libFail = true; throw e; }); // S12-v U13(B8): 실패를 기억하지 않는다
    return hwpxP;
  }
  window.addEventListener("online", function () { // S12-v U13(B8): 전파가 돌아오면 실패했던 원문·문서 부품을 다시 부른다
    if (svFail) { svFail = false; needSvc().then(function () { if (cur === "talk") render(); }, function () { if (cur === "talk") render(); }); }
    if (libFail) { libFail = false; needLibs().then(function () { toast("문서 부품을 다시 불러왔습니다 · «받기»를 다시 눌러 주세요"); }, function () { /* 다음 online 때 */ }); }
  });
  function getDoc(M, k, alt) {
    var now = M.past && M.dd.date ? new Date(M.dd.date + "T17:30:00") : new Date(), area = BY[M.dd.ids[0]].area, made = now.getFullYear() + ". " + (now.getMonth() + 1) + ". " + now.getDate() + ".", office = "상주시청 · " + area + " 맞춤형복지팀";
    if (k === "d1" && !alt) { var x = M.cases.filter(function (c) { return c.id === docHid; })[0]; copy(d1Draft(x).text); markDone(M, k, x.id); render(); return; }
    if (k === "d4") { var z = M.cases.filter(function (c) { return c.id === docHid; })[0]; var vt = F.visitTime.profile(attempts(), z.id, {}); copy(NT.alimtalk(z.st === "absent" ? "absent" : "link", { area: z.h.area, date: z.at ? ymd(z.at) : null, time: z.at ? hm(z.at) : null, nextDate: ymd(U.addWorkdays(now, A.retryGap)), nextSlot: vt.best && /오전/.test(vt.best.label) ? "오전" : "오후" }).copy); markDone(M, k, z.id); render(); return; }
    var vday = M.dd.date ? M.dd.date + "T12:00:00" : now; // S12-z: 파일 이름 날짜 = 방문한 날(가구 문서는 그 가구 방문 시각) · 실적·차수 결과는 만든 날
    SH.busy(needLibs().then(function () {
      var W2 = window.DaeumHwpx, TW = W2 && W2.TW || 0;
      if (k === "d1") {
        var x1 = M.cases.filter(function (c) { return c.id === docHid; })[0];
        return W2.download(d1Hwpx(x1, d1Draft(x1), made, office, TW), fnm(x1.at || vday, x1.id, "상담일지초안", "hwpx")).then(function () { markDone(M, k, x1.id); });
      }
      if (k === "d2") {
        var fs = d2Fields(M);
        return W2.download({ title: "복명서", subtitle: "복지사각지대 발굴대상자 현장 확인 출장", made: made, office: office,
          blocks: [{ t: "ch", text: "Ⅰ. 출장 개요" }, { t: "tbl", title: "<표 1> 출장 결과", head: ["항목", "내용"], widths: TW ? [Math.round(TW * .2), TW - Math.round(TW * .2)] : undefined, rows: fs.map(function (f) { return [f.k, f.v]; }) },
            { t: "ch", text: "Ⅱ. 가구별 결과" }].concat(M.cases.map(function (c) { return { t: "li", lv: 1, text: c.id + "(" + c.h.area + ") — " + (c.st === "done" ? "만남: " + clip(c.memo, 80) : c.st === "absent" ? "부재 · 재방문 예정" : c.st === "refused" ? "거절 · 근무일 5일 뒤 다시 권유" : "방문 전") }; }))
            .concat([{ t: "p", kind: "note", text: "※ 가구 칸 = 한국사회보장정보원 발굴대상자 명단 · 개인정보 4칸 미기재 · 시연용 가상 가구 · 담당자 확인 후 확정  끝." }]) }, fnm(vday, null, "복명서", "hwpx")).then(function () { markDone(M, k, "day"); });
      }
      if (k === "d3") {
        var y = M.cases.filter(function (c) { return c.id === docHid; })[0];
        var rec = { text: F.askGuide.draft({ label: "가구 " + y.id, area: y.h.area, at: y.at, method: "방문 상담", needs: F.askGuide.detect(y.memo), summary: memoNoWhy(y.memo), guide: F.askGuide.check(y.memo, null, {}) }).text, area: y.h.area, label: "가구 " + y.id, at: y.at, why: refWhyOf(y.id, y.memo) };
        return W2.download(F.referral.build(rec, docOrg, { office: y.h.area + " 맞춤형복지팀" }), F.referral.fileName(docOrg, y.at || vday, y.id)).then(function () { markDone(M, k, y.id); });
      }
      if (k === "d5") {
        var w = periodModel(docPer);
        return W2.download(d5Hwpx(w, made, office, TW), fnm(now, null, w.per === "mo" ? "월간실적" : "주간실적", "hwpx")).then(function () { markDone(M, k, w.per); });
      }
      if (k === "d7") {
        var x7 = M.cases.filter(function (c) { return c.id === docHid; })[0];
        return W2.download(d7Hwpx(x7, d7Fields(M, x7, now), made, office, TW), fnm(x7.at || vday, x7.id, "인계카드", "hwpx")).then(function () { markDone(M, k, x7.id); });
      }
      if (k === "d8") {
        var x8 = M.cases.filter(function (c) { return c.id === docHid; })[0];
        return W2.download(d8Hwpx(d8Model(x8, now), made), fnm(x8.at || vday, x8.id, "큰글씨안내문", "hwpx")).then(function () { markDone(M, k, x8.id); });
      }
      if (k === "d6") {
        var R = roundRows();
        return window.DaeumXlsx.download({ title: "차수 처리 결과 명단", subtitle: roundYm() + " 명단", made: made + " " + hm(now), office: office, conclusion: "명단 " + R.length + "가구 중 " + R.filter(function (r) { return r[4] === "만남"; }).length + "가구 상담", note: "※ 시연용 가상 자료 · 개인정보 4칸 없음",
          sheets: [{ name: "처리 결과", title: "<표 1> 차수 처리 결과", unit: "단위: 가구", columns: [{ key: "a", h: "가구", type: "text", w: 10 }, { key: "b", h: "읍면", type: "text", w: 10 }, { key: "c", h: "발굴 순위", type: "text", w: 9 }, { key: "d", h: "방문일", type: "text", w: 12 }, { key: "e", h: "결과", type: "text", w: 9 }, { key: "f", h: "연계", type: "text", w: 22 }, { key: "g", h: "다음 확인", type: "text", w: 28 }], rows: R, total: false, src: "※ 출처: 한국사회보장정보원 발굴대상자 조회 서식(가상) + 닿음 현장 기록" }],
          sources: [{ kind: "가상", org: "닿음", name: "시연용 가상 가구", date: ymd(now), use: "명단·방문 결과" }], footer: "닿음" }, fnm(now, null, "차수결과_" + roundYm() + "차수", "xlsx")).then(function () { markDone(M, k, "round"); });
      }
    }), "문서를 만드는 중…").then(function () { toast("내려받았습니다"); render(); }, function () { toast(libFail || navigator.onLine === false ? "연결이 끊겨 파일을 만들지 못했습니다 — 연결되면 다시 불러옵니다" : "파일을 만들지 못했습니다 — 다시 눌러 주세요"); });
  }
  /** S12-e 43: 지금 미리보기 한 장을 A4로 — 창 제목을 문서 이름으로 바꿔 PDF 저장 이름이 «복명서_20261103»처럼 나오게 */
  function printDoc() {
    var a = app.querySelector(".print-doc"); if (!a) return;
    var old = document.title, M = docModel();
    document.title = fnm(M.dd && M.dd.date ? M.dd.date + "T12:00:00" : new Date(), docHid, a.dataset.docName || "문서"); // S12-z: PDF 저장 이름도 같은 규칙
    document.body.classList.add("printing-doc");
    var back = function () { document.title = old; document.body.classList.remove("printing-doc"); window.removeEventListener("afterprint", back); };
    window.addEventListener("afterprint", back);
    try { window.print(); } catch (e) { /* 인쇄 불가 */ }
    setTimeout(back, 1500);
  }
  /** S12-d 40: 목록에서 문서를 고르면 미리보기로 옮긴다 — 폰(한 줄 배치)에서 미리보기가 목록 아래에 있어 안 보이던 문제. 이미 화면 안이면 포커스만 */
  function toPrev() {
    var pv = document.getElementById("docPrev"); if (!pv) return;
    var r = pv.getBoundingClientRect(), vh = window.innerHeight || 800;
    pv.focus({ preventScroll: true });
    if (r.top >= 0 && r.top < vh * 0.5) return;
    var col = app.querySelector(".col"); if (!col) return; // S12-x 65회차: 스크롤 칸 = 셸 .col(옛 window)
    var y = col.scrollTop + r.top - col.getBoundingClientRect().top - 12;
    col.scrollTo(RM_ ? { top: y } : { top: y, behavior: "smooth" });
  }
  function bindDocs() {
    bindHrec();
    if (FD) FD.bindReport(app);
    var M = docModel(); if (!M.dd) return;
    app.querySelectorAll("[data-doc]").forEach(function (b) { b.addEventListener("click", function () { docSel = b.dataset.doc; docHid = null; render(); toPrev(); }); });
    app.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", function () { var v = b.dataset.day; docDay = /^h/.test(v) ? v : +v; docHid = null; render(); if (b.closest(".dhist")) toPrev(); }); });
    var pr = app.querySelector('[data-act="print"]'); if (pr) pr.addEventListener("click", function () { printDoc(); });
    app.querySelectorAll("[data-hh]").forEach(function (b) { b.addEventListener("click", function () { docHid = b.dataset.hh; render(); }); });
    app.querySelectorAll("[data-org]").forEach(function (b) { b.addEventListener("click", function () { docOrg = docOrgPick[docHid] = b.dataset.org; made1["d3:" + docHid] = made1["d3:" + docHid] || false; render(); }); });
    var mk = app.querySelector('[data-act="make"]'); if (mk) mk.addEventListener("click", function () { vib(); made1[(docSel === "d5" ? "d5:" + docPer : docSel) + ":" + (docHid || "")] = true; render(); });
    var dd = app.querySelector('[data-act="dockdoc"]'); if (dd) dd.addEventListener("click", function () { // 74회차: 주 단추 = 미리보기 안 «만들기»·«받기»를 대신 누름(받기가 꺼져 있으면 미리보기 빈칸으로)
      var pv = app.querySelector("#docPrev"), m = pv && pv.querySelector('[data-act="make"]'), g = pv && pv.querySelector('[data-act="get"]:not([disabled])');
      var m1 = !!made1[(docSel === "d5" ? "d5:" + docPer : docSel) + ":" + (docHid || "")];
      if (!m1 && m) m.click(); else if (g) g.click(); else if (pv) { pv.scrollIntoView({ block: "start" }); try { pv.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } toast("빨간 빈칸을 채우면 받기가 켜집니다"); }
    });
    app.querySelectorAll('[data-act="get"]').forEach(function (gt) { gt.addEventListener("click", function () { vib(); getDoc(M, docSel, !!gt.dataset.alt); }); });
    app.querySelectorAll("[data-per]").forEach(function (b) { b.addEventListener("click", function () { docPer = b.dataset.per === "mo" ? "mo" : "wk"; render(); }); });
    app.querySelectorAll("[data-fill]").forEach(function (inp) { inp.addEventListener("change", function () { var a = fills(), o = a[M.key] || {}; o[inp.dataset.fill] = inp.value.trim().slice(0, 40); a[M.key] = o; lsSet(LS_FILL, a); render(); }); });
  }

  // ═════ 사용 방법 — 하루 7단계를 그림 한 줄씩(S12-d 2부-3). 옛 흐름 ①~⑨ 안내(shared/guide.js)는 옛 공무원 화면 전용으로 남김 ═════
  var ICO = {
    pc: '<rect x="8" y="12" width="48" height="32" rx="5" fill="#1B2328"/><rect x="12" y="16" width="40" height="24" rx="2" fill="#E1E5EB"/><rect x="24" y="46" width="16" height="4" rx="2" fill="#1B2328"/><rect x="18" y="50" width="28" height="4" rx="2" fill="#C3C9D3"/>',
    ph: '<rect x="20" y="6" width="24" height="52" rx="6" fill="#1B2328"/><rect x="23" y="12" width="18" height="38" rx="2" fill="#E1E5EB"/><circle cx="32" cy="54" r="2" fill="#E1E5EB"/>',
    s1: '<rect x="14" y="20" width="20" height="5" rx="2.5" fill="#2E8270"/><rect x="14" y="28" width="24" height="5" rx="2.5" fill="#47535B"/><rect x="14" y="36" width="16" height="5" rx="2.5" fill="#47535B"/>',
    s2: '<path d="M26 44 L30 30 L38 34 L37 20" fill="none" stroke="#2E8270" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="37" cy="20" r="3.5" fill="#1F6676"/>',
    s3: '<rect x="25" y="17" width="14" height="3" rx="1.5" fill="#11181C"/><rect x="25" y="23" width="12" height="3" rx="1.5" fill="#47535B"/><rect x="25" y="29" width="14" height="3" rx="1.5" fill="#A63D31"/><rect x="25" y="35" width="10" height="3" rx="1.5" fill="#47535B"/>',
    s4: '<path d="M26 20 l2 2 4-4M26 29 l2 2 4-4" stroke="#2E8270" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="26" y="37" width="6" height="6" rx="1.5" fill="#1F6676"/><rect x="34" y="19" width="5" height="2.5" rx="1" fill="#47535B"/><rect x="34" y="28" width="5" height="2.5" rx="1" fill="#47535B"/><rect x="34" y="39" width="5" height="2.5" rx="1" fill="#47535B"/>',
    s5: '<rect x="24" y="17" width="16" height="10" rx="3" fill="#2F6FB1"/><rect x="24" y="31" width="16" height="10" rx="3" fill="#fff" stroke="#47535B" stroke-width="1.5"/><path d="M27 41 l-2 4 5-4" fill="#fff" stroke="#47535B" stroke-width="1.2"/>',
    s6: '<rect x="28.5" y="17" width="7" height="13" rx="3.5" fill="#1F6676"/><path d="M26 27a6 6 0 0 0 12 0M32 33v5" stroke="#11181C" stroke-width="2" fill="none" stroke-linecap="round"/>',
    s7: '<rect x="18" y="18" width="20" height="26" rx="2" fill="#fff" stroke="#47535B" stroke-width="1.5" transform="rotate(-8 28 31)"/><rect x="26" y="16" width="20" height="26" rx="2" fill="#fff" stroke="#11181C" stroke-width="1.5"/><rect x="29" y="21" width="12" height="2.5" rx="1" fill="#F2C230"/><rect x="29" y="26" width="14" height="2.5" rx="1" fill="#8A9396"/><rect x="29" y="31" width="9" height="2.5" rx="1" fill="#D0343F"/>'
  };
  function ico(dev, k) { return '<svg viewBox="0 0 64 64" aria-hidden="true">' + ICO[dev] + (k ? '<g transform="' + (dev === "ph" ? "translate(0,2)" : "translate(0,-2)") + '">' + ICO[k] + "</g>" : "") + "</svg>"; }
  var HELP = [
    { s: "s1", dev: "pc", t: "방문 계획", w: "사무실 PC · 명단을 받은 날", d: "한국사회보장정보원 발굴 순위대로 일차가 나뉘어 있습니다. ▲▼로 순서만 손보고 «확정»", f: "발굴 명단 · 발굴 순위 · 기한(근무일)", n: "확정 1번", h: "#plan" },
    { s: "s2", dev: "ph", t: "동선", w: "폰 · 출발 전", d: "남은 집이 지도에 순서대로. «네이버 지도로 길안내» 한 번이면 차 길안내가 시작됩니다", f: "방문 계획(실시간)", n: "1번", h: "#route" },
    { s: "s3", dev: "ph", t: "집 앞 요약", w: "폰 · 집 앞 차 안 30초", d: "발굴 이유·지난 기록·주의할 점·받는 급여를 5줄로. 읽고 «들어가기»", f: "명단 위기정보·급여 열 · 건축물대장 · 기상특보", n: "0번(읽기만)", h: "#home" },
    { s: "s4", dev: "ph", t: "현장 확인", w: "폰 · 집 안에서", d: "명단 위기정보에 맞춘 체크 5~8줄. 줄마다 «괜찮음»이나 «문제 있음» 한 번", f: "명단 위기정보 유형", n: "줄마다 1번", h: "#check" },
    { s: "s5", dev: "ph", t: "상담 도움", w: "폰 · 상담하면서", d: "물어볼 순서가 카드로 넘어갑니다. 받을 수 있는 서비스는 원문 요약으로(선정 결정 아님)", f: "한국사회보장정보원 복지서비스 원문", n: "카드마다 1번", h: "#talk" },
    { s: "s6", dev: "ph", t: "상담 후 기록", w: "폰 · 상담 직후", d: "앞에서 고른 징후·서비스가 이미 채워져 있습니다. 상황을 고르고, 필요하면 말하거나 몇 줄 적은 뒤 «기록 저장»", f: "④⑤에서 고른 것 · 받아쓴 글(음성 원본 남기지 않음)", n: "말하기 1번 + 기록 저장 1번", h: "#record" },
    { s: "s7", dev: "pc", t: "보고서", w: "사무실 PC · 그날 저녁·주 1번", d: "복명서·상담일지·연계 의뢰서·주간 실적이 대기합니다. «만들기 → 받기» 두 번", f: "앞 단계 기록 전부 · 수급권자 현황 15062448", n: "문서마다 2번", h: "#docs" }
  ];
  function helpView() {
    var steps = HELP.map(function (x, i) {
      return '<li class="hs dv-' + x.dev + '"><span class="hn">' + (i + 1) + '</span><div class="hi">' + ico(x.dev, x.s) + '</div><div class="hb"><span class="hw">' + esc(x.w) + "</span><b>" + esc(x.t) + "</b><p>" + esc(x.d) + '</p><div class="hf"><span class="plug">자동으로 채움</span>' + esc(x.f) + '</div></div><div class="hk"><b>' + esc(x.n) + '</b><a href="' + x.h + '">열어 보기 →</a></div></li>';
    }).join("");
    return top("help", "<strong>사용 방법</strong>처음 한 번 읽기") + '<main class="wrap">' + '<div data-scope-map="full"></div>' + // S12-n 닿음이 맡는 구간(큰 그림)
      '<div class="dhead"><h1>앞에서 누른 것이 <span>다음 화면에</span> 채워집니다</h1><p>PC에서 계획하고, 폰은 «다음» 단추만 따라가고, 저녁에 PC에서 문서를 받습니다. 같은 내용을 두 번 쓰지 않습니다.</p></div>' +
      '<ol class="once" aria-label="처음 한 번만"><li><b>1</b><span><em>같은 계정</em>으로 사무실 PC와 폰에서 로그인<small>오른쪽 위 연동 단추 · 코드·QR 없음</small></span></li><li><b>2</b><span>PC «방문 계획»에서 <em>확정</em><small>폰에 바로 나타납니다</small></span></li><li><b>3</b><span>폰은 화면 아래 <em>큰 단추</em>만 따라가기<small>동선 → 집 앞 → 확인 → 상담 → 기록</small></span></li></ol>' +
      C2 + '<div class="hlane"><span class="l-pc">' + ico("pc") + "사무실 PC</span><span class=\"l-ph\">" + ico("ph") + '현장 폰</span></div>' +
      '<ol class="hsteps">' + steps + "</ol>" + C3 + // S12-x 66회차: 첫 칸 큰 그림·처음 한 번 | 둘째 칸 단계 | 셋째 칸 색·하지 않는 것
      '<section class="hleg blk"><h2>문서 미리보기의 색</h2>' + LEG + '<p>남색 칸은 한국사회보장정보원 명단·공공데이터에서, 회색은 규칙으로 센 숫자, 노랑은 자동으로 다듬은 문장(확인 필요), 빨강은 직접 넣어야 하는 빈칸입니다. 빨강이 0이 되어야 «받기»가 켜집니다.</p></section>' +
      '<section class="card flat hnot"><b>이 도우미가 하지 않는 것</b><span>지원 대상 판정 · 위험 점수 매기기 · 성명·주민등록번호·연락처·주소 받기 · 행복이음 입력 대신하기(입력·전자서명은 행복이음에서)</span></section>' +
      '<p class="demo"><span class="samp">가상 데이터</span><span>화면의 가구는 모두 시연용 가상입니다</span><a href="shared/data.html">활용 데이터</a><a href="?demo=reset#today">시연 처음 상태로</a></p></main>';
  }

  // ── 계정·연동 창(같은 계정 로그인 → PC·폰 실시간. 코드·QR 넘김 없음) ──
  function accountPanel(opt) {
    opt = opt && opt.nodeType === undefined && !opt.target ? opt : {}; // 단추 처리기에서 이벤트가 들어와도 무시
    var s = SY.state(), why = { stuck: "서버로 보내기가 계속 실패합니다(" + (s.lastErr || "응답 오류") + ") — 기록은 이 기기에 남아 있습니다. 로그아웃 뒤 다시 로그인해 보세요.", login: "로그인 전 — 이 기기에만 저장합니다.", "no-table": "연동 서버가 아직 준비되지 않아 이 기기에만 저장합니다.", off: "연동이 꺼져 있습니다.", lib: "연동 부품을 받지 못했습니다.", error: "서버 응답 오류 — 이 기기에 저장 중.", socket: "실시간 연결이 끊겨 이 기기에 임시 저장 중입니다.", send: "보내기 실패 — 다시 붙으면 자동으로 보냅니다." };
    // 74회차 ⓪-1(11-13 호창님 «시연을 위한 로그인 기능만»): 이메일 가입·로그인·확인 메일·계정 지우기 흐름 전면 제거 — «시연 1·2·3으로 둘러보기»만 · 로그인 뒤 = 내 계정·로그아웃(시연 바꾸기)
    //   class(.lg73 아래): brand mk demo k sub who wk first n alt lk drules local ttl flat acct me av outb dock row pri · id: aWipe·aDemoMsg · data-act: out · data-demo
    var OBD = window.DaeumOnboard || null, IC2 = (OBD && OBD.IC) || {}, ic = function (k) { return IC2[k] || I[k] || ""; };
    var d = document.createElement("dialog"); d.className = "dob dob-acct " + (window.innerWidth >= 1024 ? "o-m-pc" : "o-m-phone"); d.setAttribute("aria-label", s.user ? "내 계정" : "닿음 들어가기");
    var st = '<p class="o-acct-st">' + (function (c) { return '<span class="sync ' + c.cls + '"><i></i>' + esc(c.txt) + "</span>"; })(syncChip()) + " " + esc(s.mode === "live" ? "실시간 연동 중" : why[s.why] || "") + "</p>";
    var foot = '<p class="o-foot"><span class="o-samp">가상 데이터</span>모든 가구·메모는 가상입니다 <a href="?demo=reset#today">시연 처음 상태로</a> <a href="shared/data.html">활용 데이터</a></p>';
    var arrow = ic("arrow"), body;
    if (s.user) {
      body = '<section class="lg-v" data-v="me">' +
        '<div class="ttl"><h3>내 계정</h3><span>' + (s.user.demo ? "시연 계정" : "로그인") + "</span></div>" + st + demoBox(ic, demoNo(s.user)) +
        '<div class="flat acct"><div class="me"><span class="av">' + esc(String(s.user.email || "?").charAt(0)) + '</span><span style="min-width:0"><b>' + esc(s.user.email) + "</b><small>" + (s.mode === "live" ? '<i class="o-live"></i>실시간 연동 중' : esc(why[s.why] || "")) + "</small></span></div>" +
          wipeBox(s) + '<button class="outb" type="button" data-act="out">로그아웃</button><small>폰 «더 보기» 맨 위 · PC 머리 계정 단추에서 언제든 시연을 바꾸거나 로그아웃합니다.</small></div>' +
        '<div class="dock"><div class="row"><button class="pri" value="close"><span><b>닫기</b><small>' + (s.user.demo ? "시연 계정은 매일 새벽 처음 상태로" : "PC·폰 같은 계정이면 바로 이어집니다") + "</small></span></button></div></div></section>";
    } else {
      body = '<section class="lg-v" data-v="home">' +
        '<div class="brand"><span class="mk">닿</span><b>닿음</b><small>' + esc(NAME) + "</small></div>" + demoBox(ic) +
        '<p class="local">' + ic("device") + "로그인하지 않아도 이 기기 안에서 모든 기능을 쓸 수 있습니다</p>" + PP + "</section>";
    }
    d.innerHTML = '<form method="dialog" class="o-acct lg73"><button class="o-acct-x" value="close" aria-label="닫기">' + (ic("x") || "×") + '</button><div class="o-acct-scroll">' + body + foot + "</div></form>";
    document.body.appendChild(d); d.showModal();
    d.addEventListener("close", function () { d.remove(); });
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); }); // 판 바깥(어두운 곳)을 누르면 닫힘
    var bo = d.querySelector('[data-act="out"]');
    // S12-w «시연으로 둘러보기» — 시연 1~3 중 하나를 고르면 가입·메일 확인 없이 바로(서버 시연 팀: 1→2→3→1 이 1차 안부 짝, 2차는 가상 김팀장)
    [].forEach.call(d.querySelectorAll("[data-demo]"), function (b) { b.addEventListener("click", function () {
      var n = +b.getAttribute("data-demo"), m = d.querySelector("#aDemoMsg"); if (m) m.textContent = "시연 " + n + "로 들어가는 중…";
      var w = d.querySelector("#aWipe"), wipe = !!(s.user && w && w.checked); // 74회차 ⓪-1b 시연 바꾸기: 다른 번호 기록이 섞이지 않게 기본은 이 기기 기록 지우고 다시 받기
      (s.user ? SY.signOut({ wipe: wipe }) : Promise.resolve()).then(function () { return SY.signIn(DEMO_MAIL(n), DEMO_PW); }).then(function () { d.close(); if (wipe) { try { history.replaceState(null, "", location.pathname + "#today"); } catch (e) { /* 무시 */ } location.reload(); return; } render(); toast("시연 " + n + " · " + DEMO_WHO[n - 1][0] + "(으)로 들어왔습니다 · 다른 기기에서 다른 번호를 고르면 동료 안부가 오갑니다"); },
        function (er) { if (m) m.textContent = "시연 계정에 들어가지 못했습니다 — " + authMsg(er) + " · 로그인 없이도 모든 기능을 이 기기에서 쓸 수 있습니다"; });
    }); });
    if (bo) bo.addEventListener("click", function () { var w = d.querySelector("#aWipe"), wipe = !!(w && w.checked); SY.signOut({ wipe: wipe }).then(function () { d.close(); toast("로그아웃했습니다"); if (wipe) { try { history.replaceState(null, "", location.pathname + "#today"); } catch (e) { /* 무시 */ } location.reload(); } else render(); }); });
  }
  /** 67회차 S12-z2: Supabase 인증 오류(영문)를 한국어 안내로 — 없는 계정·틀린 비밀번호는 보안상 같은 문구(서버도 구분하지 않음) */
  function authMsg(er) {
    var t = String((er && (er.code || "")) + " " + (er && er.message || "")), st = er && er.status;
    if (/invalid_credentials|Invalid login credentials/i.test(t)) return "시연 계정 확인에 실패했습니다 — 잠시 뒤 다시 눌러 주세요.";
    if (st === 429 || /rate limit|too many|over_request_rate_limit|over_email_send_rate_limit/i.test(t)) return "잠깐 사이 시도가 많았습니다 — 몇 분 뒤 다시 해 주세요(로그인 없이도 이 기기에서 모두 쓸 수 있습니다).";
    if (/Failed to fetch|NetworkError|network/i.test(t) || navigator.onLine === false) return "연결이 끊겼습니다 — 연결되면 다시 해 주세요.";
    return "다시 시도해 주세요" + (er && er.message ? "(" + String(er.message).slice(0, 60) + ")" : "") + ".";
  }
  /* S12-w 시연 계정(심사1~3). 비밀번호는 서버 db/migration_s12v_hardening.sql §4 의 $env:DEMO_PW 와 같아야 한다.
     화면 코드에 있으므로 사실상 공개 — 방어선은 서버 쪽 매일 03:30 원복(비밀번호·이메일) + 계정당 행 상한. 실제 개인정보를 넣지 말라는 안내를 같이 띄운다 */
  var DEMO_PW = "daeum-judge-2026";
  function DEMO_MAIL(n) { return "daeum.judge" + n + "@example.com"; }
  // 73회차 🔐 시연 1·2·3 이름표 — 서버 시연 팀(supabase/migration_s12z4_team.sql daeum_team_demo_seed)과 맞춤:
  //   심사1→1차 심사2 · 심사2→1차 심사3 · 심사3→1차 심사1, 2차는 모두 가상 «김팀장»(시연 계정 중 팀장 없음)
  var DEMO_WHO = [["담당 주무관", "방문 계획부터 현장 기록·보고서까지 · 늦어지면 시연 2에게 알림"], ["동료 주무관", "시연 1의 1차 안부 짝 · 늦어지면 알림을 받는 쪽"], ["동료 주무관", "시연 2의 1차 안부 짝 · 2차 확인은 가상 김팀장"]];
  function demoNo(u) { var m = /^daeum\.judge(\d)@/i.exec(u && u.email || ""); return m ? +m[1] : 0; }
  // 74회차 ⓪-1b(11-13 호창님 «큰 단추 하나 + 작은 링크»): 큰 단추 = 시연 1(담당 주무관) · 그 아래 옅은 링크 «동료 계정으로 보기 2 · 3»(동료 안부 시연용, 보이되 조용하게)
  //   cur = 지금 들어와 있는 시연 번호(로그인 전 0) — «시연 바꾸기»도 같은 구조: 지금 번호는 빼고, 1이면 큰 단추 대신 링크만
  function demoBox(ic, cur) {
    ic = ic || function () { return ""; }; cur = cur || 0;
    var big = cur === 1 ? 0 : 1, rest = [1, 2, 3].filter(function (n) { return n !== big && n !== cur; }), w1 = DEMO_WHO[0];
    return '<section class="demo' + (cur ? " sw" : "") + '" aria-label="' + (cur ? "시연 바꾸기" : "시연으로 둘러보기") + '"><span class="k">' + (cur ? "지금 시연 " + cur + " · " + DEMO_WHO[cur - 1][0] : "심사위원·처음 보는 분") + "</span><h4>" + (cur ? "시연 바꾸기" : "시연으로 둘러보기") + '</h4><p class="sub">누구나 한 번에 · 가상 48가구가 채워져 있습니다</p>' +
      (big ? '<div class="who"><button class="wk first" type="button" data-demo="1" aria-label="시연 1 ' + w1[0] + ' 계정으로 둘러보기"><span class="n">1</span><span><b>' + (cur ? "시연 1로 바꾸기" : "시연으로 둘러보기") + "</b><small>" + w1[0] + " · " + w1[1] + "</small></span>" + ic("arrow") + "</button></div>" : "") +
      '<p class="alt">' + (rest.every(function (n) { return n > 1; }) ? "동료 계정으로 보기" : "다른 번호로 보기") + " " + rest.map(function (n) { return '<button class="lk" type="button" data-demo="' + n + '" aria-label="시연 ' + n + " " + DEMO_WHO[n - 1][0] + ' 계정 보기">' + n + "</button>"; }).join('<span aria-hidden="true">·</span>') +
        '<small>두 기기에서 <b>다른 번호</b>면 동료 안부가 오가고, <b>같은 번호</b>면 PC·폰 계획·기록이 이어집니다 · 매일 새벽 처음 상태로 · 실제 개인정보는 넣지 마세요</small></p><p class="o-msg" id="aDemoMsg" role="status"></p></section>';
  }
  /* S12-v U25 처리 안내 4줄(11-12 호창님 «추천대로» 확정 문안) — 법률 분류어 없이 무엇이 어디로 가는지만 */
  var PP = '<details class="acct-pp"><summary>개인정보는 이렇게 다룹니다</summary><ol>' +
    "<li><b>모으는 것</b>업무 중 직접 입력한 방문 일정·기록·메모(시연은 가상 가구 자료)</li>" +
    "<li><b>쓰는 곳</b>닿음의 일정·기록·PC↔폰 동기화에만 씁니다. 다른 목적·제3자 제공 없음</li>" +
    "<li><b>보관·지우기</b>시연 계정의 서버 기록은 매일 새벽 처음 상태로 돌아갑니다. 로그아웃 때 «이 기기 기록도 지우기»로 기기 안 기록을 지울 수 있습니다</li>" +
    "<li><b>AI 사용 때</b>AI 요약·추천을 누를 때만, 이름·연락처·주민번호 등을 가린 뒤 외부 AI 서비스로 보냅니다. 연결이 안 되면 기기 안 자동 문장을 씁니다</li>" +
    "</ol><p>로그인하지 않아도 모든 기능을 이 기기 안에서 그대로 쓸 수 있습니다.</p></details>";
  /** S12-v U24(1-5) 로그아웃 때 «이 기기 기록도 지우기»(권장 · 기본 켬) — 안 보낸 기록이 있으면 먼저 알린다 */
  function wipeBox(s) {
    return '<label class="o-wipe" for="aWipe"><input type="checkbox" id="aWipe" checked><span>이 기기 기록도 지우기(권장 · 공용 PC·폰)<small>로그아웃할 때 이 기기 안 기록을 함께 지웁니다.</small></span></label>' + (s.pending ? '<p class="o-acct-warn" role="alert">아직 서버로 못 보낸 기록 ' + s.pending + "건도 함께 지워집니다 — 연결된 뒤 로그아웃하면 남습니다.</p>" : "");
  }
  function copy(t) { (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("복사했습니다"); }, function () { window.prompt("복사해 주세요", t); }); }
  var toastT = null;
  function toast(t) { var el = document.getElementById("toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); } el.textContent = t; el.className = "toast on"; clearTimeout(toastT); toastT = setTimeout(function () { el.className = "toast"; }, 2600); }

  // ═════ 41 PC 현장 책상 — 🩵 미르 11-03 «PC에서도 순서·동선·요약·확인·상담·기록·보고 전부» ═════
  // 폰 현장 화면(.ph)을 그대로 쓰되, PC(≥1024)에서는 좌측 메뉴열 + 위 «7단계 진행판» + 넓은 2칸 작업판 + 오른쪽 «오늘 방문·이 단계가 채우는 문서».
  // 데이터·기능은 폰과 같은 함수(새로 지어낸 값 없음). 폰(<1024)에서는 이 덧붙인 판이 모두 숨고 원래 화면 그대로.
  var FSTEP = { plan: 0, route: 1, home: 2, check: 3, talk: 4, record: 5, docs: 6 };
  var FSUB = ["방문 계획", "네이버 길안내", "집 앞 요약", "현장 확인", "상담 도움", "상담 후 기록", "문서함"];
  var FFEED = {
    route: [["출장 결과 보고(복명서)", "방문한 날 · 다녀온 집"], ["주간·월간 추진 실적 보고", "방문 가구 수"]],
    home: [["상담일지 초안", "발굴 이유 · 지난 기록"], ["한 장 인계 카드", "주의할 점 · 만나기 좋은 때"]],
    check: [["상담일지 초안", "상황 칸 — 현장 징후"], ["한 장 인계 카드", "현장 확인 징후"], ["주간·월간 추진 실적 보고", "명단 사유 밖 징후 수"]],
    talk: [["상담일지 초안", "욕구 칸 — 물어본 질문"], ["서비스 연계 의뢰서", "연계 후보 서비스"]],
    record: [["상담일지 초안", "상황·욕구·연계·다음"], ["출장 결과 보고(복명서)", "만남·부재·거절"], ["차수 처리 결과 명단", "방문 4열"]]
  };
  function stepVals(c, hid) {
    var h = BY[hid], o = recOf(hid), i = c.d.ids.indexOf(hid), row = c.d.s.rows[i] || {}, st = statusOf(hid), m = meta()[hid] || {}, r = rankBy()[hid];
    var p = plan(), pr = p && p.rows.filter(function (x) { return x.household_no === hid; })[0];
    var lr = pr && pr.list_rank != null ? pr.list_rank : r ? r.listRank : m.prio || "—";
    var L = checkList(h, o.res === "absent"), ck = o.checks || {}, dn = L.filter(function (x) { return ck[x.k]; }).length, bd = L.filter(function (x) { return ck[x.k] === "bad"; }).length;
    var Q = questionsFor(hid, o), as = askedOf(hid), aN = Q.filter(function (q) { return as[q.key]; }).length, svN = chosenSvcs(hid, o).length;
    var V = [
      [(c.d.n || 1) + "일차 " + (i + 1) + "번째", "발굴 " + lr + "순위"],
      [row.arrive ? row.arrive + " 도착" : "—", row.km != null ? row.km + "km · " + row.travelMin + "분" : c.d.s.km + "km"],
      [indText(h).length + "가지 사유", h.area],
      [dn + " / " + L.length, bd ? "징후 " + bd + "개" : dn ? "이상 없음" : "체크 전"],
      ["질문 " + aN + " / " + Q.length, "연계 후보 " + svN + "개"],
      [st === "planned" ? "저장 전" : ST_LBL[st] || "저장됨", st === "planned" ? (o.memo ? "메모 있음" : "상황 고르기") : "기록 저장됨"],
      [docModel().pending + "건", "만들 문서"]];
    // 42 진행판 색 = 칸에 적힌 값과 같은 기준: dn(초록) 다 채움 · pt(옅은 초록) 일부 · ""(회색) 아직. 단계를 «지나쳤다»는 것만으로 초록이 되지 않는다
    var met = st !== "planned";
    V.state = [p ? "dn" : "", "", "", dn && dn === L.length ? "dn" : dn ? "pt" : "", Q.length && aN === Q.length ? "dn" : aN || svN ? "pt" : "", met ? "dn" : o.memo ? "pt" : "", ""];
    V.passed = [1, 1, 1, 0, 0, 0, 0]; // 순서·동선·요약은 «본 것»이 곧 끝(기록할 값 없음) — 지나치면 초록
    return V;
  }
  // S12-x 66회차: PC·태블릿 현장 «진도» 칸 — 시안 v3 대조표 15번(PC 현장 = 레일 + 3단 주/상세/진도). 옛 .desk 틀(머리 진행판 + 옆 칸)은 걷어내고
  //   7단계 진행판·오늘 방문·이 단계 기록이 들어가는 문서를 셋째 칸(<!--c3-->) 카드 3장으로. 폰은 부르지 않는다(위 고정 띠 .hbar 와 단계 줄 .steps 로 충분).
  function desk(s, want, html) {
    var k = pickHid(want); if (!k) return html;
    var c = k.c, hid = k.hid, h = BY[hid], now = FSTEP[s], V = stepVals(c, hid), dm = docModel();
    var prog = '<section class="card dk-prog" aria-label="현장 7단계 진행판"><h3>현장 7단계 · ' + esc(hid) + "<span>" + esc(h.area + " · " + ageLine(h)) + "</span></h3>" +
      '<ol class="dk-steps">' + STN.map(function (x, i) {
        var cls = i === now ? "now" : V.state[i] || (V.passed[i] && i < now ? "dn" : "");
        return '<li class="' + cls + '"><a href="' + stationHref(i, hid) + '"' + (i === now ? ' aria-current="step"' : "") + "><i>" + (i + 1) + "</i><b>" + stLbl(i) + "</b><span>" + esc(V[i][0]) + "</span><small>" + esc(V[i][1]) + "</small></a></li>";
      }).join("") + "</ol>" +
      '<div class="row2"><a class="btn sm ghost" href="' + stationHref(now - 1, hid) + '">‹ ' + stTxt(now - 1) + '</a><a class="btn sm ghost" href="' + stationHref(now + 1, hid) + '">' + stTxt(now + 1) + " ›</a></div></section>";
    var dayL = c.d.ids.map(function (id, j) {
      var ss = statusOf(id);
      return '<a class="tli' + (id === hid ? " cur" : "") + (ss !== "planned" ? " done" : "") + '" href="#' + s + ":" + id + '"><span class="tm num">' + esc((c.d.s.rows[j] || {}).arrive || "") + '</span><span class="pin">' + (j + 1) + '</span><span class="nm"><b>' + esc(BY[id].area + " · " + id) + "</b><small>" + (ss === "done" ? "만남" : ss === "absent" ? "부재" : ss === "refused" ? "거절" : "예정") + '</small></span><span class="st">' + (id === hid ? "지금" : "") + "</span></a>";
    }).join("");
    var day = '<section class="card dk-day"><h3>' + (c.isToday ? "오늘" : c.d.date ? md(c.d.date) : c.d.n + "일차") + " 방문 " + c.d.ids.length + "곳<span>" + esc(c.d.s.km + "km 약 · " + (c.d.s.end || "") + " 복귀") + '</span></h3><div class="tl">' + dayL + "</div></section>";
    var feed = '<section class="card flat dk-feed"><h3>이 단계 기록이 들어가는 문서</h3><ul>' + (FFEED[s] || []).map(function (f) { return "<li><b>" + esc(f[0]) + "</b><span>" + esc(f[1]) + "</span></li>"; }).join("") +
      '</ul><a class="btn sm" href="#docs">문서함 열기 · ' + dm.pending + '건 대기</a><p class="dk-src"><span>근거 데이터</span>' + esc(STN[now][1]) + " · 가상 가구</p></section>";
    var i1 = html.lastIndexOf("</main>"); if (i1 < 0) return html;
    return html.slice(0, i1) + C3 + prog + day + feed + html.slice(i1);
  }

  // ── 길잡이(해시) ──
  var cur = "", curArg = null;
  var TITLES = { today: "오늘", plan: "방문 계획", route: "동선", perf: "실적·사후관리", help: "사용 방법", home: "집 앞 요약", check: "현장 확인", talk: "상담 도움", record: "상담 후 기록", docs: "문서함" };
  function toToday() { try { history.replaceState(null, "", location.pathname + location.search + "#today"); } catch (e) { location.replace("#today"); } }
  function parse() { var m = /^#(today|plan|route|perf|help|home|check|talk|record|docs)(?::([A-Z]{1,3}-\d{1,5}))?$/.exec(location.hash || ""); return m ? { s: m[1], h: m[2] || null } : null; }
  // S12-n «닿음이 맡는 구간» — 큰 그림(오늘·사용 방법) + 화면 머리 아래 작은 위치 띠(지금 단계만 켜짐)
  var SM = window.DaeumScopeMap;
  var SCOPE_OF = { today: "plan", plan: "plan", route: "route", home: "visit", check: "visit", talk: "visit", record: "record", docs: "link", perf: "link" }; // 명단·계획=방문 계획 · 동선 · 집 앞·방문 중=현장 방문 · 기록 · 문서·실적(연계·보고) · S12-x: 오늘=방문 계획(v3 miniKey)
  function scopeKey(s) { var k = SCOPE_OF[s] || null; if (k === "visit" && s !== "home" && lsGet(LS_SAFE, null)) k = "safety"; return k; } // 안전 모드 켜짐 = 동료 안부
  // S12-x(64회차 · 호창님 11-12 «날씨와 방문계획-동선-.. 바는 모든 화면에 고정, 가능한 작게»):
  //   머리 바로 아래 한 요소 .hbar = 날씨 한 줄(.wx#dwx, app/weather.js 가 채움) + 구간 위치 띠(.dsm-mini). 한 번만 만들고 화면이 바뀌면 자리만 옮기고 띠 표시만 갱신.
  //   고정 위치·높이는 CSS(🩵 미르). 65회차: 셸 .hdw 안 머리(.top) 바로 뒤 — 스크롤 칸(.col) 밖이라 모든 화면에서 고정.
  var HBAR = null;
  function hbarEl() {
    if (HBAR) return HBAR;
    HBAR = document.createElement("div"); HBAR.className = "hbar";
    var wx = document.getElementById("dwx");
    if (!wx) { wx = document.createElement("div"); wx.id = "dwx"; wx.className = "wx"; wx.setAttribute("role", "status"); wx.setAttribute("aria-label", "오늘 날씨"); wx.hidden = true; }
    var sc = document.createElement("div"); sc.className = "hbar-scope";
    HBAR.appendChild(wx); HBAR.appendChild(sc);
    return HBAR;
  }
  function hbarPlace() {
    var hb = hbarEl(), hd = app.querySelector(".hdw > .top"), mn = app.querySelector("main");
    if (hd) hd.parentNode.insertBefore(hb, hd.nextSibling); // S12-x 65회차: 셸 .hdw 안(스크롤 칸 밖) — 모든 화면 1개
    else if (mn) mn.insertBefore(hb, mn.firstChild);
    else app.insertBefore(hb, app.firstChild);
    var k = scopeKey(cur), sc = hb.querySelector(".hbar-scope");
    if (SM) SM.mini(sc, k); else sc.innerHTML = "";
  }
  function scopeMount() { if (SM) SM.mountAll(app); } // 큰 그림(오늘 접는 카드·사용 방법)만 — 작은 위치 띠는 .hbar 하나로
  // S12-x 66회차: 시안 v3 render() 의 칸 나누기 그대로 — 화면 함수는 <main> 안을 «<!--c2-->»(둘째 칸)·«<!--c3-->»(셋째 칸) 표지로 나눠 둔다.
  //   폰 = [a+b+c] · 폴드·태블릿 = [a, b+c] · PC = 셋째 칸이 있으면 [a, b, c] 아니면 [a, b]. 칸마다 따로 스크롤(.col).
  var C2 = "<!--c2-->", C3 = "<!--c3-->";
  function modeNow() { return document.documentElement.getAttribute("data-mode") || "phone"; }
  function colsOf(html) {
    var i0 = html.search(/<main[^>]*>/), i1 = html.lastIndexOf("</main>");
    var mc = i0 >= 0 ? (/class="([^"]*)"/.exec(html.slice(i0, html.indexOf(">", i0))) || [, ""])[1].replace(/(wrap|phx)/g, "").trim() : ""; // 화면 고유 클래스(rc-main 등 — 변수 담음)는 바깥 <main> 으로
    var inner = i0 >= 0 && i1 > i0 ? html.slice(html.indexOf(">", i0) + 1, i1) : html;
    var p3 = inner.indexOf(C3), ab = p3 >= 0 ? inner.slice(0, p3) : inner, c = p3 >= 0 ? inner.slice(p3 + C3.length) : "";
    var p2 = ab.indexOf(C2), a = p2 >= 0 ? ab.slice(0, p2) : ab, b = p2 >= 0 ? ab.slice(p2 + C2.length) : "";
    var m = modeNow(), cols = m === "phone" ? [a + b + c] : m === "pc" ? (c.trim() ? [a, b, c] : [a, b]) : [a, b + c];
    cols = cols.filter(function (x, i) { return i === 0 || x.trim(); });
    var gt = m === "pc" && cols.length === 3 ? ' style="grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) minmax(0,.82fr)"' : "";
    return '<main class="main' + (mc ? " " + mc : "") + '" data-cols="' + cols.length + '"' + gt + ">" + cols.map(function (x) { return '<div class="col">' + x + "</div>"; }).join("") + "</main>";
  }
  // 시안 v3 placeAct 그대로 — 폰은 CSS 자리(아래 탭 위), 폴드·태블릿·PC는 행동줄을 둘째 칸(없으면 첫 칸) 위 폭에 맞춘다
  function placeAct() {
    var AB = app.querySelector(":scope > .actbar"); if (!AB) return;
    if (modeNow() === "phone") { AB.style.left = ""; AB.style.width = ""; return; }
    var M = app.querySelector(".main"), cs = app.querySelectorAll(".main > .col"), c = cs[1] || cs[0]; if (!M || !c) return;
    AB.style.left = (M.offsetLeft + c.offsetLeft + 16) + "px"; AB.style.width = Math.max(200, c.clientWidth - 32) + "px";
  }
  var paT = 0; window.addEventListener("resize", function () { clearTimeout(paT); paT = setTimeout(placeAct, 120); }, { passive: true });
  // 72회차 ⑥ 첫 로드 깜빡임: 옛 흐름 = 로컬로 1번 그림 → 연동 «연결 중»·«연동됨»·서버 받기·보내기 끝마다 화면 전체(지도 포함)를 다시 그림(로그인 상태 4~6번).
  //   이제 ① 첫 화면은 연동이 자리 잡을(서버 받기 끝·로컬 판정·최대 1.5초) 때까지 로딩 표시를 두고 한 번에 그린다
  //   ② 그 뒤 다시 그리기는 내용이 같으면 건너뛰고, 머리·연동 글자만 바뀌었으면 그 칸만 고친다(지도·스크롤 그대로). window.__daeumRenders 로 셀 수 있다.
  var BOOT = { open: false, want: false }, RSTAT = window.__daeumRenders = { full: 0, chrome: 0, skip: 0, held: 0 }, lastBody = "", lastChrome = "";
  /** 머리(.top)와 레일 아래 연동 글자(.rfoot)만 새로 — 연동 «연결 중→연동됨» 같은 변화에 화면 전체(지도)를 다시 그리지 않게 */
  function patchChrome(foot) {
    var t = app.querySelector(".hdw > .top"), rf = app.querySelector(".rail .rfoot");
    if (t) t.innerHTML = topHTML();
    if (rf) { var tmp = document.createElement("div"); tmp.innerHTML = foot; if (tmp.firstChild) rf.parentNode.replaceChild(tmp.firstChild, rf); }
    [t, app.querySelector(".rail .rfoot")].forEach(function (el) { if (!el) return;
      el.querySelectorAll('[data-act="account"]').forEach(function (b) { b.addEventListener("click", accountPanel); });
      el.querySelectorAll('[data-act="more"]').forEach(function (b) { b.addEventListener("click", morePanel); });
      el.querySelectorAll('[data-act="safety"]').forEach(function (b) { b.addEventListener("click", safetyKey); }); });
    moreDot();
  }
  function bootOpen() { if (BOOT.open) return; BOOT.open = true; render(); }
  function render(soft) { // soft = 실시간·시계처럼 사람이 누르지 않은 다시 그리기(같으면 건너뜀)
    if (!BOOT.open) { BOOT.want = true; RSTAT.held++; return; }
    var a = parse(); if (!a) { toToday(); a = parse(); if (!a) return; } // 75회차: 해시만 바꾸고(hashchange 없음) 그대로 그린다
    var chg = a.s !== cur || a.h !== curArg; cur = a.s; curArg = a.h;
    var VIEW = { today: today, plan: planView, route: routeView, perf: perfView, help: helpView, home: home, check: checkView, talk: talkView, record: record, docs: docsView };
    var html = VIEW[cur](curArg), bar = "", nxs = nextStepCard(); // 76회차: 동료 경보 띠·하루 요약은 본문에 붙이지 않는다(머리 «안전» 화면 ②)
    var MO = /<main class="(wrap|phx)[^"]*">/; // S12-x 65회차: 다음 할 일 → 그 위에 동료 안부 띠(내용 칸 맨 앞)
    if (nxs) { var mi = html.search(MO); if (mi >= 0) { var me = html.indexOf(">", mi) + 1; html = html.slice(0, me) + nxs + html.slice(me); } }
    if (bar) { var mi2 = html.search(MO); if (mi2 >= 0) { var me2 = html.indexOf(">", mi2) + 1; html = html.slice(0, me2) + bar + html.slice(me2); } }
    if (FSTEP[cur] >= 1 && FSTEP[cur] <= 5 && /^(tab|pc)$/.test(modeNow())) html = desk(cur, curArg, html); // 41 PC·태블릿 현장 «진도» 칸(폰·폴드는 안 붙임)
    document.body.dataset.s = cur;
    var keepY = !chg ? Array.prototype.map.call(app.querySelectorAll(".main > .col"), function (c) { return c.scrollTop; }) : []; // 같은 화면 다시 그리기(실시간·안전 모드 시계)면 칸마다 읽던 자리 유지
    // S12-x 65회차 새 셸 = 시안 v3 바깥 틀 그대로: .app > 레일(PC·태블릿) · .hdw(머리 .top + 고정 띠 .hbar — 스크롤 칸 밖) · .main > .col(스크롤 칸) · 아래 탭(폰·폴드)
    //   66회차: 내용 = 시안처럼 칸 2~3개(colsOf) — 폰 한 칸 · 폴드·태블릿 두 칸 · PC 세 칸(셋째 칸이 비면 두 칸). <main class="main"> 하나 안에 .col 들.
    var dn = 0; try { dn = docModel().pending || 0; } catch (e) { dn = 0; } // 보고 탭 점 = 만들 문서 대기 건수(시안 docN)
    var si = syncChip(), foot = '<div class="rfoot"><button class="sync pcs pr ' + si.cls + '" data-act="account" style="justify-content:flex-start;padding:0"><i></i>' + esc(si.txt) + '</button><button class="rl pr" data-act="more" style="min-height:44px;font-size:13px">' + I.more + "<span>더 보기</span></button></div>";
    var body = cur + "|" + curArg + "|" + dn + "|" + modeNow() + "|" + html, chrome = topHTML() + foot;
    if (soft === true && !chg && body === lastBody && app.querySelector(".main")) { // 72회차 ⑥: 내용이 같으면 다시 그리지 않는다
      if (chrome === lastChrome) { RSTAT.skip++; return; }
      lastChrome = chrome; RSTAT.chrome++; patchChrome(foot); return;
    }
    lastBody = body; lastChrome = chrome; RSTAT.full++;
    if (HBAR && HBAR.parentNode) HBAR.parentNode.removeChild(HBAR); // 날씨 값이 지워지지 않게 띠는 떼어 두었다가 다시 붙인다
    var PWA = window.__daeumPwa || (window.__daeumPwa = document.getElementById("pwa-install")); if (PWA && PWA.parentNode) PWA.parentNode.removeChild(PWA); // 76회차: 설치 띠는 화면에 붙이지 않는다(더 보기 › 이 기기 › 홈 화면에 설치)
    app.innerHTML = '<nav class="rail" aria-label="주 메뉴">' + SH.railHTML(cur, curArg, I, { dot: dn, foot: foot }) + '</nav>' +
      '<div class="hdw"><header class="top">' + topHTML() + "</header></div>" +
      colsOf(html) +
      '<nav class="tabs" aria-label="주 메뉴">' + SH.tabsHTML(cur, curArg, I, { dot: dn }) + "</nav>";
    var cs = app.querySelectorAll(".main > .col"), col = cs[cs.length - 1] || null;
    document.title = TITLES[cur] + " · " + NAME + " — " + SUB;
    ({ today: bindToday, plan: bindPlan, route: bindRoute, perf: bindPerf, help: function () {}, home: bindHome, check: bindCheck, talk: bindTalk, record: bindRecord, docs: bindDocs })[cur](curArg);
    app.querySelectorAll('[data-act="account"]').forEach(function (b) { b.addEventListener("click", accountPanel); });
    app.querySelectorAll('[data-act="more"]').forEach(function (b) { b.addEventListener("click", morePanel); });
    app.querySelectorAll('[data-act="safety"]').forEach(function (b) { b.addEventListener("click", safetyKey); });
    bindAlerts(); safeSig = sigNow(); moreDot();
    SH.after(app, cur, curArg, nudgeOpt(dn)); // S12-i1: 작은 칸·전환 · 74회차: 주 단추 자리(.dock)·다음 할 일
    placeAct();
    scopeMount();
    hbarPlace();
    Array.prototype.forEach.call(cs, function (c, i) { c.scrollTop = keepY[i] || 0; }); // 화면이 바뀌면 맨 위 · 같은 화면이면 칸마다 읽던 자리
    if (OV.on) { if (OV.kind === "safety") safetyPanel(); else app.appendChild(OV.el); } // 더 보기 시트가 열려 있으면 다시 붙인다(실시간 다시 그리기) · 76회차: 안전 화면은 새 상태로 다시
  }
  // 폭(폰·폴드·태블릿·PC)이 바뀌면 머리 글자(PC 연동 글자·폰 탭 이름)만 다시 그린다 — app/s12x_bg.js 가 html[data-mode] 와 함께 알림
  window.addEventListener("daeum:mode", function () { var ae = document.activeElement; if (!micRec && !(ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName))) { render(); return; } var t = app.querySelector(".hdw > .top"); if (t) { t.innerHTML = topHTML(); t.querySelectorAll('[data-act="account"]').forEach(function (b) { b.addEventListener("click", accountPanel); }); t.querySelectorAll('[data-act="more"]').forEach(function (b) { b.addEventListener("click", morePanel); }); t.querySelectorAll('[data-act="safety"]').forEach(function (b) { b.addEventListener("click", safetyKey); }); } });
  // 탭·레일·머리 «사용 방법» = <button data-go="#화면"> (시안처럼 단추) → 주소(#)로 길잡이
  app.addEventListener("click", function (e) { var g = e.target && e.target.closest ? e.target.closest("[data-go]") : null; if (!g || !app.contains(g)) return; e.preventDefault(); var h = g.getAttribute("data-go"); if (location.hash !== h) location.hash = h; else render(); });
  window.addEventListener("hashchange", function () { if (micRec) micRec.stop(); var a = parse(); if (fixHid && !(a && a.h === fixHid && /^(record|check|talk)$/.test(a.s))) fixHid = null; render(); });
  // 74회차 기능 카드 data-qto — 같은 화면의 그 칸으로 내려가 초점(누르기만으로 단계를 건너뛰지 않음). 칸이 없으면 data-qelse 주소로
  app.addEventListener("click", function (e) {
    var q = e.target && e.target.closest ? e.target.closest("[data-qto]") : null; if (!q || !app.contains(q)) return;
    var el = app.querySelector(".main " + q.getAttribute("data-qto")); if (!el) { var g = q.getAttribute("data-qelse"); if (g) location.hash = g; return; }
    e.preventDefault();
    if (/^DETAILS$/.test(el.tagName)) el.open = true;
    try { el.scrollIntoView({ behavior: RM_ ? "auto" : "smooth", block: "start" }); } catch (x) { el.scrollIntoView(); }
    if (!el.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName)) el.setAttribute("tabindex", "-1");
    try { el.focus({ preventScroll: true }); } catch (x) { /* 무시 */ }
  });
  // S12-v U17(F5) «명단 불러오기» 링크 → 오늘 화면 파일 고르기 · U16(F4) «기록 고치기»
  var pickNext = false;
  app.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var pk = t.closest("[data-pick]"), fx = t.closest("[data-fix]");
    if (pk) { if (cur === "today") { e.preventDefault(); var f = document.getElementById("listFile"); if (f) f.click(); } else pickNext = true; return; }
    if (fx) { e.preventDefault(); reopenRec(fx.dataset.fix, false); }
  });
  SY.on(function (what) {
    var ae = document.activeElement;
    if (ae && (ae.id === "memo" || ae.id === "refuseWhy" || /^h(r|q)/.test(ae.id) || ae.hasAttribute && ae.hasAttribute("data-fill"))) return; // 쓰는 중에는 다시 그리지 않는다
    if (micRec) return;
    if (what === "safety-ask") { resendOwn(); return; }
    if (what === "safety") { safeAdopt(); dayNote(); }
    if (what === "mode" && SY.state().mode === "live") resendOwn();
    if (what === "data" || what === "mode" || what === "sent" || what === "safety") render(true); // 72회차 ⑥: 같으면 건너뜀·연동 글자만이면 머리만
  });
  // 안전 모드 시계 — 20초마다 넘김 여부를 다시 본다(바뀌면 다시 그림, 아니면 분 숫자만) · 60초마다 내 안전 모드를 다시 알린다(나중에 연 화면도 받게)
  var safeSig = "", safeTick = 0;
  function sigNow() { return safeAlerts().map(function (a) { return a.id + (a.late ? "!" : ""); }).join(","); }
  function resendOwn() { var sf = lsGet(LS_SAFE, null); if (sf && ownTab(sf) && SY.safety) { var a = SY.safety.list()[sf.id]; safePush(sf, a && a.state === "ok" ? "ok" : "on"); } }
  setInterval(function () {
    if (++safeTick % 3 === 0 && SY.state().mode === "live") resendOwn();
    var ae = document.activeElement, typing = micRec || (ae && (ae.id === "memo" || ae.id === "refuseWhy" || /^h(r|q)/.test(ae.id) || ae.hasAttribute && ae.hasAttribute("data-fill")));
    if (sigNow() !== safeSig && !typing) { render(true); return; }
    var all = SY.safety ? SY.safety.list() : {};
    app.querySelectorAll("[data-sfid]").forEach(function (el) { var a = all[el.dataset.sfid], n = el.querySelector("[data-sfel]"); if (a && n) n.textContent = elMin(a.at); });
  }, 20000);
  setInterval(function () { if (/^(check|talk|record)$/.test(cur) && !micRec && !(document.activeElement && /^(memo|refuseWhy)$/.test(document.activeElement.id))) render(); }, 60000); // 안전 모드 분 표시
  if (navBack()) { /* 길안내에서 돌아옴 → 동선 화면 */ }
  window.DaeumApp = { days: days, statusOf: statusOf, docModel: docModel, render: render };
  // 72회차 ⑥: 첫 화면 문 — 연동이 자리 잡으면(로컬 판정·서버 첫 받기 끝·오류) 또는 1.5초가 지나면 그때 한 번 그린다. 글꼴도 같이 기다린다(바뀌며 글자가 출렁이지 않게)
  (function () {
    // 73회차 🐞(a): 로그인 상태에선 «서버 첫 받기»(data) 뒤에 «연동됨»(live)이 와서 본문 문구(«사무실 PC에 바로 갑니다» 등)가 바뀌어
    //   화면 전체를 한 번 더 그렸다(full 2). 이제 연동 상태가 끝까지 정해질 때(live·local·offline) 연다. 로그인 기록이 없으면 기다리지 않는다.
    //   상한: 로그인 기록 있음 4초(라이브러리·채널 붙기) · 없음 1.5초(글꼴만)
    var authed = false; try { authed = !!(SY.state().enabled && localStorage.getItem("daeum.auth")); } catch (e) { authed = false; }
    var syncOk = !authed, fontOk = false, go = function () { if (syncOk && fontOk) bootOpen(); };
    SY.on(function (what) { if (syncOk || what !== "mode") return; if (/^(live|local|offline)$/.test(SY.state().mode)) { syncOk = true; go(); } });
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fontOk = true; go(); }, function () { fontOk = true; go(); }); else fontOk = true; } catch (e) { fontOk = true; }
    setTimeout(bootOpen, authed ? 4000 : 1500);
    if (!parse()) toToday();
  })();
  nudgeApply(); // 74회차: 다음 할 일 안내 켜고 끄기(이 기기)
  SY.init();
  if (window.DaeumOnboard) { window.DaeumOnboard.hook({ login: accountPanel, start: function () { if (location.hash !== "#today") location.hash = "#today"; } }); window.DaeumOnboard.maybeAuto(); } // S12-z3
})();
