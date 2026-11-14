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
  var AL = window.__DAEUM_ALERTS__ || null, RCP = window.__DAEUM_RECIPIENTS__ || null, RES = window.__DAEUM_RESOURCES__ || null, BP = window.__DAEUM_BASE_PENSION__ || null; // 94회차: 기초연금 수급률(보건복지부 15161618, 시군구 단위 — 상주 전체 한 줄 비교만, 방문 순서 점수엔 안 씀)
  if (OH && window.__DAEUM_OLDHOUSE__) OH.set(window.__DAEUM_OLDHOUSE__);
  var BY = {}; D.households.forEach(function (h) { BY[h.id] = h; });
  var OFFICE = D.meta.office || { x: 0, y: 0 };
  var IND = {}; (D.indicators || []).forEach(function (i) { IND[i.key] = i.name; });
  var NAME = "복지 사각지대 현장 업무 도우미", SUB = "닿음"; // S12-v U17(F5): 옛 공무원 화면(officer/) 링크 없음 — «명단 불러오기»는 모두 #today 파일 고르기
  var W = "일월화수목금토";
  var RM_ = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var app = document.getElementById("app");
  const I = Object.assign({}, DaeumIcons.I);
  /** 79회차 아이콘 체계 78: 글자 기호 대신 쓰는 작은 아이콘(크기 단계 16·20·24·28 → svg.ic.i16 …, v3.css 아이콘 2색 절) */
  function ii(n, sz) { return (I[n] || "").replace('class="ic"', 'class="ic i' + (sz || 16) + '"'); }
  /** 지도 순번 원 안의 «다 했음» 표지 — 글자 ✓ 대신 check 아이콘 선(같은 24 좌표계를 원 크기로 줄임) */
  function ckPath(x, y, big, col) { var k = (big ? 16 : 13) / 16; return '<path d="m5.5 12.5 4.2 4.2L18.5 8" fill="none" stroke="' + col + '" stroke-width="' + (2.6 / k).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round" transform="translate(' + (+x - 12 * k).toFixed(1) + " " + (+y - 12 * k).toFixed(1) + ") scale(" + k.toFixed(3) + ')"/>'; } // S12-x 65회차: 시안 v3 아이콘(shared/icons_s12x.js — index.html 이 먼저 불러옴) · 머리 단추·탭·레일·가구별 기록
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
    sk = '<button class="ky pr bud' + (ba ? " alarm" : "") + (sf && sf.hid ? " on" : "") + '" data-act="safety" aria-label="' + skl + '">' + I.shield + '<span class="bt">' + skt + "</span><i class=\"bd\" aria-hidden=\"true\">" + (ba || "") + "</i></button>"; // 78회차 ⓪-1: 확인할 것 수(점·숫자)
    var veil = document.body.classList.contains("fd-veil");
    var title = cur === "today" || !T || wide ? "<b>닿음</b><small>" + NAME + "</small>" : "<b>" + T[1] + "</b><small>" + (D_[T[0]] || "") + "</small>";
    // 107회차 ⚙️ 파로A(🎴 결 판단): 표장 금빛 점(105회차 COMMON-A2) 삭제 — 시안 V16 에 없음. 대신 시안 머리 작은 붉은 점(«…» 단추, --sos0 10px):
    //   시안 조건 «하루 마무리(저장 안 된 기록)·연동 꺼짐(연동 대기)» → 앱 = 오늘 방문이 끝났는데 저장 안 한 기록이 있음 · 연동 끊김 · 보낼 것 대기
    var hd = 0; try { hd = AK.dayEndUnsaved ? AK.dayEndUnsaved() : 0; } catch (e) { hd = 0; }
    var ss_ = SY.state(), hdot = hd > 0 || ss_.mode === "offline" || !!ss_.pending, hdl = hdot ? " · " + (hd > 0 ? "저장 안 한 기록 " + hd + "가구" : "연동 대기") : "";
    return '<button class="brand brandb pr" data-act="account" aria-label="계정·연동 — ' + esc(si.txt) + '"><span class="markw"><span class="mark logo"><img src="shared/icons/daeum.svg?v=s12z109" alt=""></span><i class="sd ' + si.cls + '"></i></span><span style="min-width:0">' + title + "</span></button>" +
      (wide ? '<button class="sync pcs pr ' + si.cls + '" data-act="account"><i></i>' + esc((demoNo(SY.state().user) ? "시연 " + demoNo(SY.state().user) + " · " : "") + si.txt) + "</button>" : "") + // 95회차 ⑤: PC 머리에 지금 시연 번호 — 설명서 «PC에 보이는 번호를 폰 «시연 바꾸기»에서 고름»
      (wide && SY.state().user ? '<button class="ky pr outk" data-act="account" aria-label="로그아웃 — ' + esc(SY.state().user.email || "") + '">' + I.logout + "<span>로그아웃</span></button>" : "") + // 73회차 🔐
      '<button class="ky pr" data-fd-veil="1" aria-pressed="' + veil + '" aria-label="화면 가림">' + I.eyeOff + "</button>" +
      '<button class="ky pr help" data-go="#help" aria-label="사용 방법">' + I.help + (wide ? "<span>사용 방법</span>" : "") + "</button>" +
      sk + '<button class="ky pr" data-act="more" aria-label="더 보기' + hdl + '">' + I.more + (hdot ? '<i class="hdot" aria-hidden="true"></i>' : "") + "</button>";
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
  /** 84회차 ⑥ «시연 처음 상태로» — 바로 지우지 않고 확인 시트(지워지는 것 한 줄 · 못 보낸 기록 경고 · 로그인 중이면 서버 자료 안내).
      지우는 범위는 officer/demo_seed.js RESET_RE(못 보낸 기록 daeum.visit.queue 는 남김). 시트 안 «처음 상태로»(data-reset-go)만 실제 주소로 간다 */
  function resetAsk() {
    var s = SY.state(), dlg = document.querySelector("dialog.dob-acct[open]"); if (dlg) try { dlg.close(); } catch (e) { /* 무시 */ }
    sheetOpen('<div class="ttl"><h3>시연 데이터를 처음 상태로</h3></div>' +
      "<p>이 기기의 방문 계획·현장 기록·고친 문서·안전 모드·채운 칸을 지우고 가상 48가구 처음 상태로 되돌립니다. 도로 경로 기억과 로그인은 그대로입니다.</p>" +
      (s.pending ? '<p class="o-acct-warn" role="alert">아직 서버로 못 보낸 기록 ' + s.pending + "건은 지우지 않고 남겨 둡니다 — 연결되면 보냅니다.</p>" : "") +
      (s.user ? "<p><small>로그인 중이라 같은 계정 서버 자료는 다시 받아옵니다. 시연 계정 서버 자료는 매일 새벽 처음 상태로 돌아갑니다.</small></p>" : "") +
      '<div class="row2"><a class="btn pr" href="?demo=reset#today" data-reset-go="1">처음 상태로</a><button type="button" class="btn ghost pr" data-ov="x">그만두기</button></div>', "시연 처음 상태로");
  }
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("[data-reset]") : null; if (!a) return;
    e.preventDefault(); e.stopPropagation(); if (OV.on) sheetClose(); resetAsk();
  }, true);
  // 76회차: «더 보기 › 이 기기» 홈 화면에 설치 — 설치 신호 있으면 바로 설치 · 없으면 브라우저별 안내 펼침 · 설치돼 있으면(앱으로 열림 포함) 줄을 숨김
  function pwaLi(li) {
    var P = window.__daeumPwaApi; if (!P || P.hidden()) return "";
    return li("button", 'type="button" data-pwai="1" aria-expanded="false"', I.install, "홈 화면에 설치", P.can() ? "누르면 바로 설치 · 앱처럼 전체 화면으로 열림" : "앱처럼 전체 화면으로 열림 · 누르면 방법 안내");
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
      (su ? li("button", 'type="button" data-ov="account" data-out="1"', I.logout, "로그아웃 · 시연 바꾸기", (demoNo(su) ? "지금 시연 " + demoNo(su) + " · " : "") + esc(si.txt)) // 75회차: 이메일 주소는 보이지 않게
        : li("button", 'type="button" data-ov="account"', I.user, "시연으로 둘러보기", "누구나 시연 1~6 · 같은 번호면 PC·폰 실시간")) +
      li("a", 'href="#help" data-ov="go"', I.help, "사용 방법", "닿음이 맡는 구간 · 처음 3단계 · 동료 안부") +
      li("button", 'type="button" data-ov="pick"', I.upload || I.db, "발굴대상자 명단 불러오기", "행복이음에서 받은 한국사회보장정보원 조회 서식 엑셀") +
      li("a", 'href="shared/data.html"', I.db, "쓰는 데이터와 출처", "한국사회보장정보원 공공데이터 · 공공 보조") +
      li("a", 'href="shared/ai_check.html"', I.aichk, "AI 추천 검증", "가상 사연 20건 · 추천 정확도") +
      (window.DaeumOnboard ? li("button", 'type="button" data-ov="ob"', I.replay, "처음 안내 다시 보기", "명단 → 동선 → 현장 → 기록 → 보고 · 그림 다섯 장") : "") + // S12-z3 추천안(가): 자동은 처음 한 번, 다시 보기는 여기 // 69회차: 떠 있던 «팀» 단추 → 메뉴(PC 레일·폰 머리 모두 같은 «더 보기»)
      pwaLi(li) +
      li("button", 'type="button" data-ov="nudge" aria-pressed="' + (nudgeOn() ? "true" : "false") + '"', I.bell || I.help, "다음 할 일 안내 · " + (nudgeOn() ? "켜짐" : "꺼짐"), nudgeOn() ? "주 단추 위 한 줄 안내 · 누르면 끕니다" : "꺼져 있음 · 누르면 다시 켭니다") +
      (SH.fs && SH.fs.able() ? li("button", 'type="button" data-ov="fs" aria-pressed="' + (SH.fs.on() ? "true" : "false") + '"', I.expand, "전체화면 · " + (SH.fs.on() ? "켜짐" : "꺼짐"), SH.fs.on() ? "주소창 없이 넓게 · 누르면 끕니다" : "꺼져 있음 · 누르면 다시 켭니다") : "") + // 75회차 ⓪-2
      li("button", 'type="button" data-fd-lock="1" data-ov="lock"', I.lock, "지금 잠그기", "자리 비우면 3분 뒤 자동 잠금 · 가구번호만 표시") +
      li("a", 'href="?demo=reset#today" data-reset="1"', I.reset, "시연 데이터 처음 상태로", "가상 48가구 · 지난 기록 · 누르면 먼저 묻습니다") +
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
    if (sf && sf.hid) my = safeBanner(sf.hid) + '<a class="sp-go pr" href="#check:' + esc(sf.hid) + '" data-ov="go">가구 ' + esc(sf.hid) + " 현장 화면으로" + ii("chevR") + "</a>";
    else {
      var here = /^(home|check|talk|record)$/.test(cur) && curArg && BY[curArg] && statusOf(curArg) === "planned" ? curArg : null, nx = here || (nudgeState(0).hid || null);
      my = '<p class="sp-off">안전 모드 꺼짐 · 집에 들어갈 때 켜면 예정 시간을 넘길 때 1차 동료 → 2차 팀장에게 알립니다</p>' +
        (here ? '<button type="button" class="btn safe" data-sp="enter">' + (I.shield || "") + "가구 " + esc(here) + " 들어가기 <small>안전 모드 " + minPick() + "분</small></button>"
          : nx ? '<a class="sp-go pr" href="#home:' + esc(nx) + '" data-ov="go">다음 가구 ' + esc(nx) + " 집 앞으로" + ii("chevR") + " «들어가기»를 누르면 켜집니다</a>" : "");
    }
    var bar = alertBar(), TU = window.DaeumTeamUI, tb = ta && TU && TU.alertsBlock ? '<div class="sp-tm">' + TU.alertsBlock() + "</div>" : ""; // 78회차 ⓪-1: 배너로 잠깐 뜬 팀 알림은 여기서 보고 «안부 확인 완료»
    sheetOpen('<h3 class="sp-h">' + (I.shield || "") + "안전</h3>" +
      '<section class="sp-sec" aria-label="나의 안전"><div class="sp-k">나의 안전</div>' + my + "</section>" +
      '<section class="sp-sec" aria-label="동료 안부"><div class="sp-k">동료 안부' + (ta ? ' <em class="li-n">' + ta + "</em>" : "") + "</div>" + (bar || "") + tb +
        (!/sfa/.test(bar || "") && !ta ? '<p class="sp-off">지금 확인할 동료 알림이 없습니다</p>' : "") + (cur !== "today" && SX ? daySumSafe() : "") +
        (ta ? '<button type="button" class="li pr" data-sp="team">' + I.bell + "<span><b>팀 알림 " + ta + "건 보기</b><small>1차 동료·팀장 알림 · 연락했어요</small></span></button>" : "") + "</section>" +
      (window.DaeumTeamUI ? '<section class="sp-sec" aria-label="팀 연결"><div class="sp-k">팀 연결</div><button type="button" class="li pr" data-sp="team">' + I.people + "<span><b>우리 팀 · 팀 코드" + (teamN() ? ' <em class="li-n">' + teamN() + "</em>" : "") + "</b><small>" + esc(window.DaeumTeamUI.label ? window.DaeumTeamUI.label() : "1차 동료·팀장 짝 지정 · 팀 현황") + "</small></span></button></section>" : "") +
      '<button type="button" class="btn ghost pr" data-ov="x">닫기</button>', "안전");
    OV.kind = "safety";
    var root = OV.el; bindSafe(root); bindAlerts(root); if (tb && TU.bindAcks) TU.bindAcks(root, function () { if (OV.on && OV.kind === "safety") safetyPanel(); moreDot(); });
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
  function budMark() { if (typeof document === "undefined") return; var n = buddyAlarm(); document.querySelectorAll('.ky.bud').forEach(function (b) { b.classList.toggle("alarm", !!n); var bd = b.querySelector(".bd"); if (bd) bd.textContent = n ? String(n) : ""; var l = (b.getAttribute("aria-label") || "").replace(/ · 동료 확인 필요$/, ""); b.setAttribute("aria-label", n ? l + " · 동료 확인 필요" : l); }); }

  // ═════ 101회차 탭 모듈 연결(⚙️ 파로 2026-11-14) — 탭 화면은 app/tab_*.js 로 나눴다(동작 변경 0) ═════
  //   공통 조각 tab_common · 오늘 tab_today · 현장(집 앞·현장 확인·상담 도움) tab_field · 기록 tab_record · 방문(계획·동선·지도) tab_visit · 보고(문서함·실적·가구별 기록) tab_report
  //   각 파일 = DaeumTabs.<이름>(AK) 공장. 원래 자리 순서대로 부르고(useTab), 모두 읽은 뒤 klink()·relink 로 서로의 이름을 채운다.
  //   AK = 공통 이름 창구: put(읽기 전용 이름 묶음) · put2(여러 파일이 함께 바꾸는 값 — SVDB·svFail·micRec·fixHid·toastT·cur·pickNext).
  var AK = {
    put: function (o) { Object.keys(o).forEach(function (n) { Object.defineProperty(AK, n, { get: o[n], configurable: true, enumerable: true }); }); },
    put2: function (n, get, set) { Object.defineProperty(AK, n, { get: get, set: set, configurable: true, enumerable: true }); }
  }, KL = [];
  function useTab(n) { var T = window.DaeumTabs && window.DaeumTabs[n]; if (typeof T !== "function") throw new Error("탭 모듈 없음: app/tab_" + n + ".js"); KL.push(T(AK)); }
  var C2 = "<!--c2-->", C3 = "<!--c3-->"; // 칸 나누기 표지(아래 colsOf) — 탭 모듈이 읽으므로 연결 전에 둔다
  var STN, stLbl, stTxt, stationHref, today, bindToday, pickHid, home, bindHome, checkList, checkView, bindCheck, askedOf, questionsFor, talkView,
      bindTalk, recOf, chosenSvcs, record, isTyping, bindRecord, nextStepCard, reopenRec, planView, bindPlan, navBack, routeView, bindRoute, perfView,
      bindPerf, docModel, docsView, ST_LBL, LEG, bindDocs;
  function klink() {
    STN = AK.STN; stLbl = AK.stLbl; stTxt = AK.stTxt; stationHref = AK.stationHref; today = AK.today; bindToday = AK.bindToday; pickHid = AK.pickHid; home = AK.home;
    bindHome = AK.bindHome; checkList = AK.checkList; checkView = AK.checkView; bindCheck = AK.bindCheck; askedOf = AK.askedOf; questionsFor = AK.questionsFor; talkView = AK.talkView; bindTalk = AK.bindTalk;
    recOf = AK.recOf; chosenSvcs = AK.chosenSvcs; record = AK.record; isTyping = AK.isTyping; bindRecord = AK.bindRecord; nextStepCard = AK.nextStepCard; reopenRec = AK.reopenRec; planView = AK.planView;
    bindPlan = AK.bindPlan; navBack = AK.navBack; routeView = AK.routeView; bindRoute = AK.bindRoute; perfView = AK.perfView; bindPerf = AK.bindPerf; docModel = AK.docModel; docsView = AK.docsView;
    ST_LBL = AK.ST_LBL; LEG = AK.LEG; bindDocs = AK.bindDocs;
  }
  AK.put({
    F: function () { return F; }, RP: function () { return RP; }, SY: function () { return SY; }, OH: function () { return OH; },
    NT: function () { return NT; }, SH: function () { return SH; }, IM: function () { return IM; }, CH: function () { return CH; },
    U: function () { return U; }, D: function () { return D; }, RCP: function () { return RCP; }, RES: function () { return RES; },
    BP: function () { return BP; }, BY: function () { return BY; }, OFFICE: function () { return OFFICE; }, IND: function () { return IND; },
    W: function () { return W; }, RM_: function () { return RM_; }, app: function () { return app; }, I: function () { return I; },
    ii: function () { return ii; }, ckPath: function () { return ckPath; }, A: function () { return A; }, LS_DL: function () { return LS_DL; },
    LS_REC: function () { return LS_REC; }, LS_SAFE: function () { return LS_SAFE; }, LS_DOCS: function () { return LS_DOCS; }, LS_FILL: function () { return LS_FILL; },
    LS_DOUT: function () { return LS_DOUT; }, LS_DMOVE: function () { return LS_DMOVE; }, LS_DDATE: function () { return LS_DDATE; }, REFUSE_EX: function () { return REFUSE_EX; },
    esc: function () { return esc; }, lsGet: function () { return lsGet; }, lsSet: function () { return lsSet; }, ymd: function () { return ymd; },
    fnm: function () { return fnm; }, md: function () { return md; }, mdDot: function () { return mdDot; }, hm: function () { return hm; },
    clip: function () { return clip; }, vib: function () { return vib; }, uniq: function () { return uniq; }, meta: function () { return meta; },
    listIds: function () { return listIds; }, roundYm: function () { return roundYm; }, weather: function () { return weather; }, logs: function () { return logs; },
    prAll: function () { return prAll; }, prToggle: function () { return prToggle; }, attempts: function () { return attempts; }, plan: function () { return plan; },
    neighborLog: function () { return neighborLog; }, deadline: function () { return deadline; }, rank: function () { return rank; }, rankBy: function () { return rankBy; },
    indText: function () { return indText; }, ageLine: function () { return ageLine; }, routeOrder: function () { return routeOrder; }, planDrop: function () { return planDrop; },
    sched: function () { return sched; }, yak: function () { return yak; }, days: function () { return days; }, lastLog: function () { return lastLog; },
    daySumNums: function () { return daySumNums; }, statusOf: function () { return statusOf; }, typesFor: function () { return typesFor; }, SIGN_OF: function () { return SIGN_OF; },
    FIELD_SIGNS: function () { return FIELD_SIGNS; }, SVC: function () { return SVC; }, svcFor: function () { return svcFor; }, dayCtx: function () { return dayCtx; },
    arriveOf: function () { return arriveOf; }, dayOfHid: function () { return dayOfHid; }, syncChip: function () { return syncChip; }, top: function () { return top; },
    FD: function () { return FD; }, elMin: function () { return elMin; }, safeOn: function () { return safeOn; }, safeEnter: function () { return safeEnter; },
    safePush: function () { return safePush; }, minPick: function () { return minPick; }, minChips: function () { return minChips; }, bindChips: function () { return bindChips; },
    bindSafe: function () { return bindSafe; }, copy: function () { return copy; }, toast: function () { return toast; }, C2: function () { return C2; },
    C3: function () { return C3; }, colTo: function () { return colTo; }, keepPlace: function () { return keepPlace; }, render: function () { return render; }
  });
  AK.put2("toastT", function () { return toastT; }, function (v) { toastT = v; });
  AK.put2("cur", function () { return cur; }, function (v) { cur = v; });
  AK.put2("pickNext", function () { return pickNext; }, function (v) { pickNext = v; });
  useTab("common");
  useTab("today");

  // ═════ 안전 모드(④⑤⑥ 공통) — «들어가기»부터 확정까지 ═════
  // 38b ③: 예정 시간을 넘기면 같은 계정의 다른 화면(사무실 PC 등)·같은 브라우저 다른 창에 배너. 「안부 확인 완료」로 양쪽 모두 해제.
  // i6: 창마다 이름표(sessionStorage) — 안전 모드를 켠 창만 «이 기기»로 본다(같은 브라우저 두 창 시연에서 PC 창이 남의 안전 모드를 제 것으로 보지 않게)
  var TAB = (function () { try { var t = sessionStorage.getItem("daeum.tab"); if (!t) { t = Math.random().toString(36).slice(2, 10); sessionStorage.setItem("daeum.tab", t); } return t; } catch (e) { return "t"; } })();
  function ownTab(sf) { return !sf.tab || sf.tab === TAB; }
  function elMin(at) { return Math.max(0, Math.round((new Date() - new Date(at)) / 60000)); }
  function devName() { return /^(tab|pc)$/.test(modeNow()) ? "PC" : "폰"; } // 84회차 ⑯ 폭 판정은 html[data-mode] 하나(폰·폴드 = 폰)
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
  // ── 105회차 ⚙️ 파로A: 길게 누름(도움 요청) · «5분 전에 나에게 먼저»(안전 모드) ──
  /** 길게 누름 — HOLD_MS 동안 누르고 있어야 fire. 눌림 진행 = 안의 .fill 이 가로로 차오름, 손 떼면·벗어나면·스크롤(cancel)이면 취소.
      키보드: Enter/Space 를 HOLD_MS 동안 누르고 있기(누름 자동 반복은 무시). 눌림 없이 click 만 오는 보조기기(detail 0)는 확인 창(ask)으로 대신.
      짧게 누르면 보내지 않고 «길게 눌러야 보냅니다»만 알린다. 시작 = 가벼운 진동, 보냄 = 강한 진동(시안 hap light/heavy) */
  var HOLD_MS = 1200, PRE_MIN = 5;
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* 없음 */ } }
  function holdBind(b, fire, ask) {
    if (!b || b.__hold) return; b.__hold = 1;
    var T = 0, armed = false, held = false, f = b.querySelector(".fill");
    function go() {
      if (armed) return; armed = true; held = false; b.classList.add("holding");
      if (f) { f.style.transition = "transform " + HOLD_MS / 1000 + "s linear"; f.style.transform = "scaleX(1)"; }
      buzz(8);
      T = setTimeout(function () { armed = false; held = true; b.classList.remove("holding"); buzz([40, 60, 40]); fire(); }, HOLD_MS);
    }
    function stop() {
      clearTimeout(T); if (!armed) return; armed = false; b.classList.remove("holding");
      if (f) { f.style.transition = "transform .2s"; f.style.transform = "scaleX(0)"; }
    }
    b.addEventListener("pointerdown", function (e) { if (e.button > 0) return; go(); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { b.addEventListener(ev, stop); });
    b.addEventListener("contextmenu", function (e) { e.preventDefault(); }); // 폰에서 길게 누를 때 뜨는 메뉴 막기
    b.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!e.repeat) go(); } });
    b.addEventListener("keyup", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stop(); } });
    b.addEventListener("blur", stop);
    b.addEventListener("click", function (e) {
      e.preventDefault(); if (held || armed) { held = false; return; }
      if (e.detail === 0 && ask) { if (window.confirm(ask)) fire(); return; } // 보조기기(화면 읽기 등) — 확인 한 번
      toast((HOLD_MS / 1000) + "초 길게 눌러야 보냅니다 · 잘못 눌림 방지");
    });
  }
  /** «5분 전에 나에게 먼저»(시안 V16 안전 모드 카드): 예정 시간 PRE_MIN분 전 = 동료·팀장보다 먼저 나(이 기기)에게. 예정이 바뀌면(«20분 더») 다시 한 번.
      sf.pre5 = 알린 예정 시간(분). 순수 판정 — now 는 ms */
  function preDue(sf, now) {
    if (!sf || !sf.hid || !sf.at) return false; var lim = +sf.min || A.safetyMin, el = (now - new Date(sf.at).getTime()) / 60000;
    return lim > PRE_MIN && sf.pre5 !== lim && el >= lim - PRE_MIN && el < lim;
  }
  /** 알림 권한이 이미 «허용»이면 폰 알림(서비스워커 → 없으면 Notification), 아니면 화면 안 알림(토스트). 진동은 둘 다. 서버·외부 전송 0, 권한은 여기서 묻지 않는다 */
  function selfNote(title, body) {
    buzz([30, 80, 30]); toast(title + " · " + body);
    var N = typeof window !== "undefined" ? window.Notification : null; if (!N || N.permission !== "granted") return "screen";
    var opt = { body: body, tag: "daeum-pre5", icon: "shared/icons/icon-192.png", renotify: true };
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function (r) { r.showNotification(title, opt); }, function () { try { new N(title, opt); } catch (e) { /* 무시 */ } });
      else new N(title, opt);
    } catch (e) { return "screen"; }
    return "push";
  }
  function selfPre() {
    var sf = lsGet(LS_SAFE, null); if (!sf || !ownTab(sf) || !preDue(sf, Date.now())) return;
    var lim = +sf.min || A.safetyMin; sf.pre5 = lim; lsSet(LS_SAFE, sf);
    selfNote("안전 모드 " + PRE_MIN + "분 전 · 가구 " + sf.hid, PRE_MIN + "분 뒤 1차 동료에게 알림이 갑니다 · 괜찮으면 «무사히 끝남»");
  }
  function safeTools(sf) {
    var on = (sf.help || 0) > (sf.hok || 0);
    var to = reachTo();
    // 105회차 ⚙️ 파로A(시안 V16 «길게 눌러 도움 요청»): 1.2초 길게 눌러야 보냄 — 눌림 진행 = .fill 가로 차오름(holdBind), 손 떼면 취소
    return '<span class="sf-t"><button type="button" class="sf-q' + (on ? " on" : "") + '" data-act="safehelp" style="position:relative;overflow:hidden" aria-label="' + (on ? "도움 요청을 보냈습니다 · " + to + "에 떠 있습니다 · 다시 보내려면 길게 누르세요" : "조용한 도움 요청 · 1.2초 길게 누르면 " + to + "에 가구 번호·읍면이 갑니다 · 키보드는 Enter를 누르고 있기") + '">' +
      '<span class="fill" aria-hidden="true" style="position:absolute;inset:0;background:rgba(184,71,58,.2);transform-origin:left;transform:scaleX(0);pointer-events:none"></span><i></i><span class="sos-lbl">길게 눌러 도움 요청</span></button>' + // 84회차 ⑪ 아이콘 옆 글자(모양은 미르)
      (teamLive() ? "" : '<a class="sf-call" href="tel:" data-act="sfcall" aria-label="' + esc(peerWho().replace(/에게$/, "")) + ' 직접 전화 · 전화 앱을 엽니다(번호는 직접)">' + esc(peerWho().replace(/에게$/, "")) + "에게 전화 <small>번호는 직접</small></a>") + // 84회차 ⑩: 번호 없는 tel: 이라 문구를 «전화 앱 열기»로 · PC·태블릿은 안내 토스트(기능 동일) // 팀 연동 꺼짐이면 동료가 모르니 전화 앱을 바로 연다(69회차: 1차 동료 이름)

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
      : '<section class="card buddy ft sfb"><div class="safep">' + ring + '<div class="tx"><b>안전 모드 · ' + el + "분째</b><small>" + simTag(esc(st.line)) + (lim > PRE_MIN ? " · " + PRE_MIN + "분 전에 나에게 먼저" : "") + (teamLive() ? "" : " · " + esc(reachLine())) + "</small>" + safeTools(sf) + "</div></div></section>";
  }
  function bindSafe(root) { root = root || app; var ok = root.querySelector('[data-act="safeok"]'); if (ok) ok.addEventListener("click", function () { var sf = lsGet(LS_SAFE, null); if (sf) { sf.min = Math.max(sf.min || A.safetyMin, elMin(sf.at)) + 20; lsSet(LS_SAFE, sf); safePush(sf, "ok"); toast(teamLive() ? "안부 확인 완료 · 1차 동료·팀장 화면 알림도 해제" : live() ? "안부 확인 완료 · 같은 계정 다른 화면 알림도 해제" : "안부 확인 완료"); } render(); });
    var sc = root.querySelector('[data-act="sfcall"]'); if (sc) sc.addEventListener("click", function (e) { if (/^(tab|pc)$/.test(modeNow())) { e.preventDefault(); toast("PC에서는 전화를 걸 수 없습니다 · 폰 현장 화면의 «전화 앱 열기»로 거세요"); } }); // 84회차 ⑩
    var hp = root.querySelector('[data-act="safehelp"]'); if (hp) holdBind(hp, function () { // ③ 조용한 도움 요청 — 소리·큰 알림 없이 · 105회차: 1.2초 길게 눌러야(오발송 방지)
      var sf = lsGet(LS_SAFE, null); if (!sf) return; sf.help = (sf.help || 0) + 1; sf.hat = new Date().toISOString(); lsSet(LS_SAFE, sf);
      var a = SY.safety ? SY.safety.list()[sf.id] : null; safePush(sf, a && a.state === "ok" ? "ok" : "on");
      hp.classList.add("on"); hp.setAttribute("aria-label", teamLive() ? "도움 요청을 보냈습니다 · 1차 동료·팀장 화면에 떠 있습니다" : "팀 연동 꺼짐 — 도움 요청이 동료에게 가지 않습니다 · " + peerWho() + " 직접 전화하세요");
      toast(teamLive() ? "조용한 도움 요청을 보냈습니다 · 1차 동료·팀장" : "팀 연동 꺼짐 — 도움 요청이 동료에게 가지 않습니다 · " + peerWho() + " 직접 전화하세요");
    }, "조용한 도움 요청을 보낼까요?");
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


  useTab("field");
  useTab("record");
  useTab("visit");
  useTab("report");
  klink();
  // S12-i3 현장 기능(app/field.js) — 도구 묶음을 한 번 넘긴다(화면 가림·자동 잠금 단추도 여기서 붙음)
  var FD = window.DaeumField && window.DaeumField.use ? window.DaeumField : null;
  if (FD && CH) FD.use({ F: F, CH: CH, BY: BY, A: A, lsGet: lsGet, lsSet: lsSet, vib: vib, statusOf: statusOf, listIds: listIds, meta: meta, dayCtx: dayCtx, attempts: attempts,
    neighborLog: neighborLog, logs: logs, lastLog: lastLog, recOf: recOf, typesFor: typesFor, chosenSvcs: chosenSvcs, roundYm: roundYm,
    toast: function (t) { toast(t); }, copy: function (t) { copy(t); }, render: function () { render(); } });
  else FD = null;
  KL.forEach(function (relink) { relink(); }); // 모든 탭을 읽은 뒤 서로의 이름을 다시 채움(FD 포함)

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
    { s: "s1", dev: "pc", t: "방문 계획", w: "사무실 PC · 명단을 받은 날", d: "한국사회보장정보원 발굴 순위대로 일차가 나뉘어 있습니다. 위·아래 단추로 순서만 손보고 «확정»", f: "발굴 명단 · 발굴 순위 · 기한(근무일)", n: "확정 1번", h: "#plan" },
    { s: "s2", dev: "ph", t: "동선", w: "폰 · 출발 전", d: "남은 집이 지도에 순서대로. «네이버 지도로 길안내» 한 번이면 차 길안내가 시작됩니다", f: "방문 계획(실시간)", n: "1번", h: "#route" },
    { s: "s3", dev: "ph", t: "집 앞 요약", w: "폰 · 집 앞 차 안 30초", d: "발굴 이유·지난 기록·주의할 점·받는 급여를 5줄로. 읽고 «들어가기»", f: "명단 위기정보·급여 열 · 건축물대장 · 기상특보", n: "0번(읽기만)", h: "#home" },
    { s: "s4", dev: "ph", t: "현장 확인", w: "폰 · 집 안에서", d: "명단 위기정보에 맞춘 체크 5~8줄. 줄마다 «괜찮음»이나 «문제 있음» 한 번", f: "명단 위기정보 유형", n: "줄마다 1번", h: "#check" },
    { s: "s5", dev: "ph", t: "상담 도움", w: "폰 · 상담하면서", d: "물어볼 순서가 카드로 넘어갑니다. 받을 수 있는 서비스는 원문 요약으로(선정 결정 아님)", f: "한국사회보장정보원 복지서비스 원문", n: "카드마다 1번", h: "#talk" },
    { s: "s6", dev: "ph", t: "상담 후 기록", w: "폰 · 상담 직후", d: "앞에서 고른 징후·서비스가 이미 채워져 있습니다. 상황을 고르고, 필요하면 말하거나 몇 줄 적은 뒤 «기록 저장»", f: "④⑤에서 고른 것 · 받아쓴 글(음성 원본 남기지 않음)", n: "말하기 1번 + 기록 저장 1번", h: "#record" },
    { s: "s7", dev: "pc", t: "보고서", w: "사무실 PC · 그날 저녁·주 1번", d: "복명서·상담일지·연계 의뢰서·주간 실적이 대기합니다. «만들기 → 받기» 두 번", f: "앞 단계 기록 전부 · 수급권자 현황 15062448", n: "문서마다 2번", h: "#docs" }
  ];
  function helpView() {
    var steps = HELP.map(function (x, i) {
      return '<li class="hs dv-' + x.dev + '"><span class="hn">' + (i + 1) + '</span><div class="hi">' + ico(x.dev, x.s) + '</div><div class="hb"><span class="hw">' + esc(x.w) + "</span><b>" + esc(x.t) + "</b><p>" + esc(x.d) + '</p><div class="hf"><span class="plug">자동으로 채움</span>' + esc(x.f) + '</div></div><div class="hk"><b>' + esc(x.n) + '</b><a href="' + x.h + '">열어 보기' + ii("arrow") + '</a></div></li>';
    }).join("");
    return top("help", "<strong>사용 방법</strong>처음 한 번 읽기") + '<main class="wrap">' + '<div data-scope-map="full"></div>' + // S12-n 닿음이 맡는 구간(큰 그림)
      '<div class="dhead"><h1>앞에서 누른 것이 <span>다음 화면에</span> 채워집니다</h1><p>PC에서 계획하고, 폰은 «다음» 단추만 따라가고, 저녁에 PC에서 문서를 받습니다. 같은 내용을 두 번 쓰지 않습니다.</p></div>' +
      '<ol class="once" aria-label="처음 한 번만"><li><b>1</b><span><em>같은 계정</em>으로 사무실 PC와 폰에서 로그인<small>오른쪽 위 연동 단추 · 코드·QR 없음</small></span></li><li><b>2</b><span>PC «방문 계획»에서 <em>확정</em><small>폰에 바로 나타납니다</small></span></li><li><b>3</b><span>폰은 화면 아래 <em>큰 단추</em>만 따라가기<small>동선 → 집 앞 → 확인 → 상담 → 기록</small></span></li></ol>' +
      C2 + '<div class="hlane"><span class="l-pc">' + ico("pc") + "사무실 PC</span><span class=\"l-ph\">" + ico("ph") + '현장 폰</span></div>' +
      '<ol class="hsteps">' + steps + "</ol>" + C3 + // S12-x 66회차: 첫 칸 큰 그림·처음 한 번 | 둘째 칸 단계 | 셋째 칸 색·하지 않는 것
      '<section class="hleg blk"><h2>문서 미리보기의 색</h2>' + LEG + '<p>남색 칸은 한국사회보장정보원 명단·공공데이터에서, 회색은 규칙으로 센 숫자, 노랑은 자동으로 다듬은 문장(확인 필요), 빨강은 직접 넣어야 하는 빈칸입니다. 빨강이 0이 되어야 «받기»가 켜집니다.</p></section>' +
      '<section class="card flat hnot"><b>이 도우미가 하지 않는 것</b><span>지원 대상 판정 · 위험 점수 매기기 · 성명·주민등록번호·연락처·주소 받기 · 행복이음 입력 대신하기(입력·전자서명은 행복이음에서)</span></section>' +
      '<p class="demo"><span class="samp">가상 데이터</span><span>화면의 가구는 모두 시연용 가상입니다</span><a href="shared/data.html">활용 데이터</a><a href="?demo=reset#today" data-reset="1">시연 처음 상태로</a></p></main>';
  }

  // ── 계정·연동 창(같은 계정 로그인 → PC·폰 실시간. 코드·QR 넘김 없음) ──
  function accountPanel(opt) {
    opt = opt && opt.nodeType === undefined && !opt.target ? opt : {}; // 단추 처리기에서 이벤트가 들어와도 무시
    var s = SY.state(), why = { stuck: "서버로 보내기가 계속 실패합니다(" + (s.lastErr || "응답 오류") + ") — 기록은 이 기기에 남아 있습니다. 로그아웃 뒤 다시 로그인해 보세요.", login: "로그인 전 — 이 기기에만 저장합니다.", "no-table": "연동 서버가 아직 준비되지 않아 이 기기에만 저장합니다.", off: "연동이 꺼져 있습니다.", lib: "연동 부품을 받지 못했습니다.", error: "서버 응답 오류 — 이 기기에 저장 중.", socket: "실시간 연결이 끊겨 이 기기에 임시 저장 중입니다.", send: "보내기 실패 — 다시 붙으면 자동으로 보냅니다." };
    // 74회차 ⓪-1(11-13 호창님 «시연을 위한 로그인 기능만»): 이메일 가입·로그인·확인 메일·계정 지우기 흐름 전면 제거 — «시연 1·2·3으로 둘러보기»만 · 로그인 뒤 = 내 계정·로그아웃(시연 바꾸기)
    //   class(.lg73 아래): brand mk demo k sub who wk first n alt lk drules local ttl flat acct me av outb dock row pri · id: aWipe·aDemoMsg · data-act: out · data-demo
    var OBD = window.DaeumOnboard || null, IC2 = (OBD && OBD.IC) || {}, ic = function (k) { return IC2[k] || I[k] || ""; };
    var d = document.createElement("dialog"); d.className = "dob dob-acct " + (/^(tab|pc)$/.test(modeNow()) ? "o-m-pc" : "o-m-phone"); d.setAttribute("aria-label", s.user ? "내 계정" : "닿음 들어가기");
    var st = '<p class="o-acct-st">' + (function (c) { return '<span class="sync ' + c.cls + '"><i></i>' + esc(c.txt) + "</span>"; })(syncChip()) + " " + esc(s.mode === "live" ? "실시간 연동 중" : why[s.why] || "") + "</p>" + (s.failed ? '<p class="o-acct-warn" role="status">서버가 받지 않은 기록 ' + s.failed + "건은 이 기기에 따로 보관했습니다 — 나머지 기록은 계속 보냅니다.</p>" : ""); // 84회차 ⑦
    var foot = '<p class="o-foot"><span class="o-samp">가상 데이터</span>모든 가구·메모는 가상입니다 <a href="?demo=reset#today" data-reset="1">시연 처음 상태로</a> <a href="shared/data.html">활용 데이터</a></p>';
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
    d.innerHTML = '<form method="dialog" class="o-acct lg73"><button class="o-acct-x" value="close" aria-label="닫기">' + ic("x") + '</button><div class="o-acct-scroll">' + body + foot + "</div></form>";
    document.body.appendChild(d); d.showModal();
    d.addEventListener("close", function () { d.remove(); });
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); }); // 판 바깥(어두운 곳)을 누르면 닫힘
    var bo = d.querySelector('[data-act="out"]');
    // S12-w «시연으로 둘러보기» — 시연 1~3 중 하나를 고르면 가입·메일 확인 없이 바로(서버 시연 팀 3묶음: 1↔2·3↔4·5↔6 이 1차 안부 짝, 2차는 묶음마다 가상 김팀장 — supabase/migration_s12x_demo6.sql)
    [].forEach.call(d.querySelectorAll("[data-demo]"), function (b) { b.addEventListener("click", function () {
      var big = b.hasAttribute("data-slot"), n = big ? demoSlot() : +b.getAttribute("data-demo"), m = d.querySelector("#aDemoMsg"); if (m) m.textContent = "시연 " + n + "로 들어가는 중…";
      if (s.user && !big && n >= 1 && n <= DEMO_SLOTS) { try { localStorage.setItem(SLOT_KEY, String(n)); } catch (e) { /* 저장 불가 — 이번만 */ } } // 90회차: 시연 바꾸기로 고른 번호를 이 기기 몫으로(짝 번호 2·4·6은 demoSlot이 같은 묶음 담당으로 읽음)
      var w = d.querySelector("#aWipe"), wipe = !!(s.user && w && w.checked); // 74회차 ⓪-1b 시연 바꾸기: 다른 번호 기록이 섞이지 않게 기본은 이 기기 기록 지우고 다시 받기
      (s.user ? SY.signOut({ wipe: wipe }) : Promise.resolve()).then(function () { return SY.signIn(DEMO_MAIL(n), DEMO_PW).catch(function (er) { if (!big || n === 1) throw er; n = 1; return SY.signIn(DEMO_MAIL(1), DEMO_PW); }); }).then(function () { /* 몫 계정이 아직 서버에 없으면 시연 1로 */ d.close(); if (wipe) { try { history.replaceState(null, "", location.pathname + "#today"); } catch (e) { /* 무시 */ } location.reload(); return; } render(); toast("시연 " + n + " · " + whoOf(n)[0] + "(으)로 들어왔습니다 · 다른 기기에서 다른 번호를 고르면 동료 안부가 오갑니다"); },
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
  /** 84회차 ③: 큰 단추 «시연으로 둘러보기»는 시연 1~6 가운데 이 브라우저 몫으로(처음 한 번 무작위, 이후 같은 번호) — 심사위원 여럿이 한 계정을 함께 써
      서로의 계획·동료 짝을 지우던 것 방지. 키는 daeum.* 밖(로그아웃 «기기 기록 지우기»·시연 초기화에도 유지). 서버 계정 2~6·짝은 줄B(supabase/*.sql)가 같은 규칙으로 */
  var DEMO_SLOTS = 6, SLOT_KEY = "daeumDemoSlot";
  function demoSlot() {
    var n = 0; try { n = +localStorage.getItem(SLOT_KEY) || 0; } catch (e) { n = 0; }
    // 84회차: 몫은 묶음 단위(1·3·5 = 담당 주무관) — 모두 담당으로 시작하고 작은 링크가 짝(2·4·6). 옛 2·4·6 몫은 같은 묶음의 1·3·5로 옮긴다
    if (n >= 2 && n <= DEMO_SLOTS && n % 2 === 0) { n = n - 1; try { localStorage.setItem(SLOT_KEY, String(n)); } catch (e) { /* 무시 */ } }
    if (!(n >= 1 && n <= DEMO_SLOTS)) { n = 1 + 2 * Math.floor(Math.random() * (DEMO_SLOTS / 2)); try { localStorage.setItem(SLOT_KEY, String(n)); } catch (e) { /* 저장 불가 — 이번만 */ } }
    return n;
  }
  function whoOf(n) { return DEMO_WHO[n - 1] || ["담당 주무관", "방문 계획부터 현장 기록·보고서까지"]; }
  // 73회차 🔐 시연 1·2·3 이름표 — 서버 시연 팀(supabase/migration_s12z4_team.sql daeum_team_demo_seed)과 맞춤:
  //   84회차: 시연 1~6 · 팀 3묶음(심사N) — 1↔2 · 3↔4 · 5↔6 이 서로 1차 짝, 2차는 묶음마다 가상 «김팀장»(시연 계정 중 팀장 없음)
  var DEMO_WHO = [["담당 주무관", "방문 계획부터 현장 기록·보고서까지 · 늦어지면 시연 2에게 알림"], ["동료 주무관", "시연 1의 1차 안부 짝 · 2차 확인은 가상 김팀장"], ["담당 주무관", "방문 계획부터 현장 기록·보고서까지 · 늦어지면 시연 4에게 알림"], ["동료 주무관", "시연 3의 1차 안부 짝 · 2차 확인은 가상 김팀장"], ["담당 주무관", "방문 계획부터 현장 기록·보고서까지 · 늦어지면 시연 6에게 알림"], ["동료 주무관", "시연 5의 1차 안부 짝 · 2차 확인은 가상 김팀장"]];
  function demoNo(u) { var m = /^daeum\.judge(\d)@/i.exec(u && u.email || ""); return m ? +m[1] : 0; }
  // 74회차 ⓪-1b(11-13 호창님 «큰 단추 하나 + 작은 링크»): 큰 단추 = 시연 1(담당 주무관) · 그 아래 옅은 링크 «동료 계정으로 보기 2 · 3»(동료 안부 시연용, 보이되 조용하게)
  //   cur = 지금 들어와 있는 시연 번호(로그인 전 0) — «시연 바꾸기»도 같은 구조: 지금 번호는 빼고, 1이면 큰 단추 대신 링크만
  function demoBox(ic, cur) {
    ic = ic || function () { return ""; }; cur = cur || 0;
    // 84회차: 큰 단추 = 이 브라우저 몫(demoSlot) · 작은 링크 = 같은 묶음 팀(1·2 / 3·4 / 5·6)의 다른 계정만(짝 하나면 링크 하나)
    var mine = demoSlot(), big = cur === mine ? 0 : mine, lo = (cur || mine) % 2 ? (cur || mine) : (cur || mine) - 1;
    // 90회차(호창님 승인): 시연 바꾸기(로그인 뒤)는 1~6 모두 — PC와 다른 묶음 번호를 받은 폰도 PC와 같은 번호를 고를 수 있게. 로그인 전 화면은 짝 링크 그대로
    var rest = (cur ? [1, 2, 3, 4, 5, 6] : [lo, lo + 1]).filter(function (n) { return n !== big && n !== cur; }), w1 = whoOf(big || mine);
    return '<section class="demo' + (cur ? " sw" : "") + '" aria-label="' + (cur ? "시연 바꾸기" : "시연으로 둘러보기") + '"><span class="k">' + (cur ? "지금 시연 " + cur + " · " + whoOf(cur)[0] : "심사위원·처음 보는 분") + "</span><h4>" + (cur ? "시연 바꾸기" : "시연으로 둘러보기") + '</h4><p class="sub">누구나 한 번에 · 가상 48가구가 채워져 있습니다</p><p class="brw">Chrome 브라우저에 최적화되어 있습니다</p>' + // 109회차 ⚙️ 파로: 호창님 11-14 «크롬에 최적화» — 작고 조용한 한 줄(폰·PC 같은 자리)
      (big ? '<div class="who"><button class="wk first" type="button" data-demo="' + big + '" data-slot="1" aria-label="시연 ' + big + " " + w1[0] + ' 계정으로 둘러보기"><span class="n">' + big + '</span><span><b>' + (cur ? "시연 " + big + "로 바꾸기" : "시연으로 둘러보기") + "</b><small>" + w1[0] + " · " + w1[1] + "</small></span>" + ic("arrow") + "</button></div>" : "") +
      '<p class="alt">' + (rest.length ? (cur ? "다른 번호로 바꾸기" : "동료 계정으로 보기") + " " : "") + rest.map(function (n) { return '<button class="lk" type="button" data-demo="' + n + '" aria-label="시연 ' + n + " " + whoOf(n)[0] + ' 계정 보기">' + n + "</button>"; }).join('<span aria-hidden="true">·</span>') +
        '<small>' + (cur ? "PC와 <b>같은 번호</b>를 고르면 PC·폰 계획·기록이 이어지고, <b>짝 번호</b>(1·2 / 3·4 / 5·6)면 동료 안부가 오갑니다" : "두 기기에서 <b>다른 번호</b>면 동료 안부가 오가고, <b>같은 번호</b>면 PC·폰 계획·기록이 이어집니다") + ' · 매일 새벽 처음 상태로 · 실제 개인정보는 넣지 마세요</small></p><p class="o-msg" id="aDemoMsg" role="status"></p></section>';
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

  // 107회차 ⚙️ 파로A(🎴 결 판단 855d975): 41·66회차 PC·태블릿 현장 «진도» 셋째 칸(7단계 진행판·오늘 방문·이 단계 문서 카드 3장)과 그 표·계산 함수 삭제.
  //   시안 V16 현장(확인·상담·기록)은 main+side 두 단뿐이고, 단계 이름은 머리 아래 6단계 띠(.hbar) 한 벌.

  // ── 길잡이(해시) ──
  var cur = "", curArg = null;
  var TITLES = { today: "오늘", plan: "방문 계획", route: "동선", perf: "실적·사후관리", help: "사용 방법", home: "집 앞 요약", check: "현장 확인", talk: "상담 도움", record: "상담 후 기록", docs: "문서함" };
  function toToday() { try { history.replaceState(null, "", location.pathname + location.search + "#today"); } catch (e) { location.replace("#today"); } }
  function parse() { var m = /^#(today|plan|route|perf|help|home|check|talk|record|docs)(?::([A-Z]{1,3}-\d{1,5}))?$/.exec(location.hash || ""); return m ? { s: m[1], h: m[2] || null } : null; }
  // S12-n «닿음이 맡는 구간» — 큰 그림(오늘·사용 방법) + 화면 머리 아래 작은 위치 띠(지금 단계만 켜짐)
  var SM = window.DaeumScopeMap;
  var SCOPE_OF = { today: "plan", plan: "plan", route: "route", home: "visit", check: "visit", talk: "visit", record: "record", docs: "link", perf: "link" }; // 명단·계획=방문 계획 · 동선 · 집 앞·방문 중=현장 방문 · 기록 · 문서·실적(연계·보고) · S12-x: 오늘=방문 계획(v3 miniKey)
  function scopeKey(s) { var k = s === "today" && AK.todayScope ? AK.todayScope() : SCOPE_OF[s] || null; if (k === "visit" && s !== "home" && lsGet(LS_SAFE, null)) k = "safety"; return k; } // 안전 모드 켜짐 = 동료 안부 // 103회차 TODAY-I4: 오늘 = 하루 상태 따라(tab_today todayScope)
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
  function modeNow() { return document.documentElement.getAttribute("data-mode") || "phone"; }
  var TWO_COL = /^(home|check|talk|record|docs|perf|help)$/; // 107회차 ⚙️ 파로A ⑧-2b③: 시안 V16 compose — 3단은 오늘·방문(aside·pc 3칸)만, 현장·기록·보고·사용 방법은 넓은 화면도 2단
  function colsOf(html) {
    // 108회차 ⚙️ 파로(⑧-4): 보고·문서 2단 = 시안 V16 docs(main = 문서 줄·내려받기·이력 | side = A4 보기만) — 셋째 칸(이력·가구별 기록·인계)은 첫 칸 아래로
    m3Last = m3Key(); // 104회차: 이 폭 판정으로 그렸음(아래 resize 가 1100 넘나듦을 알아챈다)
    var i0 = html.search(/<main\b[^>]*>/), i1 = html.lastIndexOf("</main>"); // 104회차 파로B: 66회차부터 이 정규식에 숨어 있던 깨진 글자(백스페이스)를 \b 로 — 이제 모든 탭의 안쪽 <main> 을 벗겨 카드가 칸 바로 아래 온다
    if (i0 < 0 && /^<main class="tx-main/.test(html)) i0 = 0; // 103회차 오늘 탭 특례 — 정규식을 고친 뒤로는 위에서 이미 찾으므로 실제로는 쓰이지 않는다(오늘 탭 파일은 그대로 두어 남김)
    var mc = i0 >= 0 ? (/class="([^"]*)"/.exec(html.slice(i0, html.indexOf(">", i0))) || [, ""])[1].replace(/\b(wrap|phx)\b/g, " ").replace(/\s+/g, " ").trim() : ""; // 화면 고유 클래스(rc-main·vx-main 등 — 변수 담음)는 바깥 <main> 으로, 옛 묶음 이름(wrap·phx)은 버림
    var ok = i0 >= 0 && i1 > i0, pre = ok ? html.slice(0, i0) : "", post = ok ? html.slice(i1 + 7) : ""; // <main> 바깥 글(지금은 없음)도 잃지 않게 첫 칸 앞·끝 칸 뒤로
    var inner = ok ? pre + html.slice(html.indexOf(">", i0) + 1, i1) : html, hd = /^\s*<[!]--hd-->([\s\S]*?)<[!]--\/hd-->/.exec(inner), hdr = ""; // 103회차 V4-4: 태블릿·PC는 «<!--hd-->머리<!--/hd-->»를 칸 위 한 줄로
    if (hd && /^(tab|pc)$/.test(modeNow())) { inner = inner.slice(hd[0].length); hdr = '<div class="hdrow">' + hd[1] + "</div>"; }
    var p3 = inner.indexOf(C3), ab = p3 >= 0 ? inner.slice(0, p3) : inner, c = p3 >= 0 ? inner.slice(p3 + C3.length) : "";
    var p2 = ab.indexOf(C2), a = p2 >= 0 ? ab.slice(0, p2) : ab, b = p2 >= 0 ? ab.slice(p2 + C2.length) : "";
    var m = modeNow(), m3 = m === "pc" || (m === "tab" && / m3 /.test(" " + mc + " ") && window.innerWidth >= 1100), two = typeof cur === "string" && TWO_COL.test(cur), cols = m === "phone" ? [a + b + c] : m3 && !two ? (c.trim() ? [a, b, c] : [a, b]) : typeof cur === "string" && cur === "docs" ? [a + c, b] : [a, b + c]; // m3 = 태블릿 가로(1100↑)도 3단(시안 many) · 107회차: 현장·기록·보고·사용 방법은 PC도 2단(셋째 칸은 둘째 칸 아래로)
    cols = cols.filter(function (x, i) { return i === 0 || x.trim(); });
    if (post.trim()) cols[cols.length - 1] += post;
    var gt = m === "pc" && cols.length === 3 ? ' style="grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) minmax(0,.82fr)"' : "";
    return '<main class="main' + (mc ? " " + mc : "") + '" data-cols="' + cols.length + '"' + gt + ">" + hdr + cols.map(function (x) { return '<div class="col">' + x + "</div>"; }).join("") + "</main>";
  }
  // 시안 v3 placeAct 그대로 — 폰은 CSS 자리(아래 탭 위), 폴드·태블릿·PC는 행동줄을 둘째 칸(없으면 첫 칸) 위 폭에 맞춘다
  function placeAct() {
    var AB = app.querySelector(":scope > .actbar"); if (!AB) return;
    if (modeNow() === "phone") { AB.style.left = ""; AB.style.width = ""; return; }
    var M = app.querySelector(".main"), cs = app.querySelectorAll(".main > .col"), c = cs[1] || cs[0]; if (!M || !c) return;
    AB.style.left = (M.offsetLeft + c.offsetLeft + 16) + "px"; AB.style.width = Math.max(200, c.clientWidth - 32) + "px";
  }
  var paT = 0; window.addEventListener("resize", function () { clearTimeout(paT); paT = setTimeout(placeAct, 120); }, { passive: true });
  // 104회차 파로B: 태블릿 안에서 창 폭이 1100(시안 many — 2단↔3단)을 넘나들면 다시 그린다. 모드 자체가 바뀌는 것(폴드↔태블릿↔PC)은 daeum:mode 가 맡으므로 여기선 같은 «태블릿» 안에서만.
  function m3Key() { return modeNow() + (modeNow() === "tab" && window.innerWidth >= 1100 ? "3" : ""); }
  var m3Last = "", m3T = 0;
  window.addEventListener("resize", function () { clearTimeout(m3T); m3T = setTimeout(function () {
    var k = m3Key(), was = m3Last; if (!was || k === was) return;
    if (k.slice(0, 3) === "tab" && was.slice(0, 3) === "tab" && !isTyping()) render(); // render 가 m3Last 를 새로 적는다
  }, 160); }, { passive: true });
  // 107회차 ⚙️ 파로A ⑧-2b④: 폴드·태블릿 세로(750·820) 2단 높이 균형 — 시안 V16 수준(짧은 단 ÷ 긴 단 0.6 이상).
  //   그린 뒤 실제 높이를 재어 두 단 «경계»의 블록만 옆 단으로 옮긴다(첫 단 끝 → 둘째 단 맨 앞 · 둘째 단 맨 앞 → 첫 단 끝 — 읽는 순서 그대로, 내용은 그대로).
  //   소제목(.ph 등)은 다음 블록과, 작은 설명(.why·.mute·.note)·숨은 블록은 앞 블록과 함께 움직인다. 고정 블록(단계 줄·가구 카드·지도·미리보기·작은 칸)은 넘지 않는다.
  //   방문(계획·동선)·상담·보고(문서·실적)만. 옮길수록 나빠지면 되돌리고 멈춘다. 결과는 .main[data-bal="전→후"] (⑧-4 화면 점검이 읽는다).
  var BAL_SCR = /^(plan|route|talk|docs|perf)$/, BAL_MIN = 0.6, BAL_MAX = 8;
  var BAL_PIN = /(^|\s)(steps|idc|dhead|demo|subseg|subtabs|hdrow|fx-top|stick|foot|prev|map|vx-map|rt-map|rtmap|dock)(\s|$)/;
  var BAL_HEAD = /(^|\s)(ph|vx-sect|sect|sec-t|secT)(\s|$)/, BAL_TAIL = /(^|\s)(why|mute|note|srcline)(\s|$)/;
  function balUnits(c) { // 단 안 요소를 «같이 움직일 묶음»으로
    var out = [], cur_ = null, glue = false;
    Array.prototype.forEach.call(c.children, function (x) {
      var cl = String(x.className || ""), pin = BAL_PIN.test(cl) || x.id === "docPrev" || x.id === "rtmap" || x.nodeName === "NAV", hid = !(x.offsetHeight > 0);
      if (cur_ && !pin && !cur_.pin && (glue || BAL_TAIL.test(cl) || hid)) cur_.els.push(x);
      else { cur_ = { els: [x], pin: pin }; out.push(cur_); }
      if (pin && cur_.els.length > 1) cur_.pin = true;
      glue = BAL_HEAD.test(cl) && !pin;
    });
    return out.filter(function (u) { return u.els.some(function (x) { return x.offsetHeight > 0; }) || u.pin; });
  }
  function balH(c) { var t = Infinity, b = -Infinity; Array.prototype.forEach.call(c.children, function (x) { var r = x.getBoundingClientRect(); if (r.height > 0) { if (r.top < t) t = r.top; if (r.bottom > b) b = r.bottom; } }); return b > t ? b - t : 0; }
  // 108회차 ⚙️ 파로(⑧-4): 칸마다 따로 스크롤(.col)하므로 «눈에 보이는 높이» = min(내용 높이, 칸 보이는 높이)로 잰다 — 두 단이 모두 화면을 채우면 균형 1(옮기지 않음)
  function balV(c, h) { var v = c && c.clientHeight > 0 ? c.clientHeight : Infinity; return Math.min(h, v); }
  function balR(c0, c1) { var a = balH(c0), b = balH(c1), ea = balV(c0, a), eb = balV(c1, b), mx = Math.max(ea, eb); return { r: mx ? Math.min(ea, eb) / mx : 1, a: a, b: b, raw: Math.max(a, b) ? Math.min(a, b) / Math.max(a, b) : 1 }; }
  function balanceCols(force) {
    var m = modeNow(); if (!(m === "fold" || m === "tab") || !(force || BAL_SCR.test(cur))) return null;
    var M = app.querySelector(".main"), cs = M ? M.querySelectorAll(":scope > .col") : []; if (cs.length !== 2) return null;
    var c0 = cs[0], c1 = cs[1], s = balR(c0, c1), r0 = s.r, n = 0;
    while (s.r < BAL_MIN && n < BAL_MAX) {
      var u0 = balUnits(c0), u1 = balUnits(c1), mv, back;
      if (s.a > s.b) { // 첫 단이 길다 → 첫 단 마지막 묶음을 둘째 단 맨 앞으로
        mv = u0[u0.length - 1]; if (!mv || mv.pin || u0.length < 2) break;
        var at = c1.firstChild; mv.els.forEach(function (x) { c1.insertBefore(x, at); });
        back = function () { mv.els.forEach(function (x) { c0.appendChild(x); }); };
      } else { // 둘째 단이 길다 → 둘째 단 첫 묶음을 첫 단 끝으로
        mv = u1[0]; if (!mv || mv.pin || u1.length < 2) break;
        mv.els.forEach(function (x) { c0.appendChild(x); });
        back = function () { var at2 = c1.firstChild; mv.els.forEach(function (x) { c1.insertBefore(x, at2); }); };
      }
      var s2 = balR(c0, c1); if (s2.r <= s.r + 0.005) { back(); break; }
      s = s2; n++;
    }
    M.setAttribute("data-bal", r0.toFixed(2) + "→" + s.r.toFixed(2));
    M.setAttribute("data-balraw", s.raw.toFixed(2)); // 내용 높이 그대로 비(참고용)
    return { before: r0, after: s.r, moved: n };
  }
  var balT = 0; window.addEventListener("resize", function () { clearTimeout(balT); balT = setTimeout(function () { if (!isTyping()) balanceCols(); }, 180); }, { passive: true });
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
  // 78회차 ⓪-2(11-13 호창님 «연계 후보로 넣기를 눌렀을때 화면이 이상하게 움직여»): 원인 = 칸(.col)에 CSS scroll-behavior:smooth 가 걸려 있어
  //   다시 그린 새 칸(맨 위 0)에 읽던 자리를 넣으면 맨 위에서 그 자리까지 «부드럽게 굴러 내려오는» 움직임이 보였다 → 되살릴 때만 즉시(auto)로.
  //   + 누른 단추 위쪽 내용(다음 할 일·카드 높이)이 바뀌어도 그 단추가 화면의 같은 높이에 남도록 차이만큼 맞춘다(keepPlace).
  function colTo(c, y) { var sb = c.style.scrollBehavior; c.style.scrollBehavior = "auto"; c.scrollTop = y; c.style.scrollBehavior = sb; }
  var keepAt = null;
  function keepPlace(sel) {
    var el = app.querySelector(sel); if (!el) return;
    var y0 = el.getBoundingClientRect().top;
    keepAt = function () {
      var n = app.querySelector(sel); if (!n) return;
      var c = n.closest(".col"), dy = n.getBoundingClientRect().top - y0;
      if (Math.abs(dy) > 1) { if (c) colTo(c, c.scrollTop + dy); else window.scrollBy(0, dy); }
      try { n.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
    };
  }
  function bootOpen() { if (BOOT.open) return; BOOT.open = true; render(); if (window.__daeumBoot) window.__daeumBoot.done(); } // 97회차: 첫 화면을 그렸으면 진척 100% → 핀이 집에 닿고 로딩 층이 사라짐(index.html #dboot)
  /** 84회차 ④: 화면 그리기가 예외로 멈추면 «불러오는 중»에 갇히지 않게 비상 카드 — 오늘로 가기 · 시연 처음 상태로 */
  var renderFails = 0;
  function render(soft) {
    try { renderCore(soft); renderFails = 0; }
    catch (e) {
      renderFails++; lastBody = ""; lastChrome = "";
      try { console.error("[닿음] 화면을 그리지 못했습니다", cur, curArg, e); } catch (x) { /* 무시 */ }
      try {
        app.innerHTML = '<main class="wrap"><section class="card" role="alert" style="margin:24px auto;max-width:520px"><h3>이 화면을 그리지 못했습니다</h3>' +
          '<p>저장된 자료 가운데 읽지 못한 것이 있습니다. 기록은 이 기기에 그대로 있습니다.</p><div class="row2">' +
          (cur !== "today" || renderFails < 2 ? '<a class="btn sm" href="#today">오늘로 가기</a>' : "") +
          '<a class="btn sm ghost" href="?demo=reset#today" data-reset="1">시연 처음 상태로</a></div></section></main>';
      } catch (x) { /* 무시 */ }
    }
  }
  window.addEventListener("error", function (e) { try { console.error("[닿음] 오류", e && (e.error || e.message)); } catch (x) { /* 무시 */ } });
  window.addEventListener("unhandledrejection", function (e) { try { console.error("[닿음] 처리 안 된 약속 오류", e && e.reason); } catch (x) { /* 무시 */ } });
  function renderCore(soft) { // soft = 실시간·시계처럼 사람이 누르지 않은 다시 그리기(같으면 건너뜀)
    if (!BOOT.open) { BOOT.want = true; RSTAT.held++; return; }
    var a = parse(); if (!a) { toToday(); a = parse(); if (!a) return; } // 75회차: 해시만 바꾸고(hashchange 없음) 그대로 그린다
    var chg = a.s !== cur || a.h !== curArg; cur = a.s; curArg = a.h;
    var VIEW = { today: today, plan: planView, route: routeView, perf: perfView, help: helpView, home: home, check: checkView, talk: talkView, record: record, docs: docsView };
    var html = VIEW[cur](curArg), bar = "", nxs = nextStepCard(); // 76회차: 동료 경보 띠·하루 요약은 본문에 붙이지 않는다(머리 «안전» 화면 ②)
    var MO = /<main class="(wrap|phx)[^"]*">/; // S12-x 65회차: 다음 할 일 → 그 위에 동료 안부 띠(내용 칸 맨 앞)
    if (nxs) { var mi = html.search(MO); if (mi >= 0) { var me = html.indexOf(">", mi) + 1; html = html.slice(0, me) + nxs + html.slice(me); } }
    if (bar) { var mi2 = html.search(MO); if (mi2 >= 0) { var me2 = html.indexOf(">", mi2) + 1; html = html.slice(0, me2) + bar + html.slice(me2); } }
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
    balanceCols(); // 107회차 ⑧-2b④: 폴드·태블릿 세로 2단 높이 균형(방문·상담·보고)
    Array.prototype.forEach.call(cs, function (c, i) { colTo(c, keepY[i] || 0); }); // 화면이 바뀌면 맨 위 · 같은 화면이면 칸마다 읽던 자리
    if (keepAt) { var ka = keepAt; keepAt = null; ka(); } // 78회차 ⓪-2: 누른 단추를 같은 화면 높이에 그대로(위 내용 높이가 바뀌어도)
    if (OV.on) { if (OV.kind === "safety") safetyPanel(); else app.appendChild(OV.el); } // 더 보기 시트가 열려 있으면 다시 붙인다(실시간 다시 그리기) · 76회차: 안전 화면은 새 상태로 다시
  }
  // 폭(폰·폴드·태블릿·PC)이 바뀌면 머리 글자(PC 연동 글자·폰 탭 이름)만 다시 그린다 — app/s12x_bg.js 가 html[data-mode] 와 함께 알림
  window.addEventListener("daeum:mode", function () { if (!isTyping()) { render(); return; } var t = app.querySelector(".hdw > .top"); if (t) { t.innerHTML = topHTML(); t.querySelectorAll('[data-act="account"]').forEach(function (b) { b.addEventListener("click", accountPanel); }); t.querySelectorAll('[data-act="more"]').forEach(function (b) { b.addEventListener("click", morePanel); }); t.querySelectorAll('[data-act="safety"]').forEach(function (b) { b.addEventListener("click", safetyKey); }); } });
  // 탭·레일·머리 «사용 방법» = <button data-go="#화면"> (시안처럼 단추) → 주소(#)로 길잡이
  app.addEventListener("click", function (e) { var g = e.target && e.target.closest ? e.target.closest("[data-go]") : null; if (!g || !app.contains(g)) return; e.preventDefault(); var h = g.getAttribute("data-go"); if (location.hash !== h) location.hash = h; else render(); });
  window.addEventListener("hashchange", function () { if (AK.micRec) AK.micRec.stop(); var a = parse(); if (AK.fixHid && !(a && a.h === AK.fixHid && /^(record|check|talk)$/.test(a.s))) AK.fixHid = null; render(); });
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
    if (isTyping()) return; // 쓰는 중(글자 칸 초점·받아쓰기)에는 다시 그리지 않는다 — 84회차 ① 판정 하나로
    if (what === "safety-ask") { resendOwn(); return; }
    if (what === "safety") { safeAdopt(); dayNote(); }
    if (what === "mode" && SY.state().mode === "live") resendOwn();
    if (what === "data" || what === "mode" || what === "sent" || what === "safety") render(true); // 72회차 ⑥: 같으면 건너뜀·연동 글자만이면 머리만
  });
  if (F.acct && F.acct.on) F.acct.on(function (what) { if (what === "data" && !isTyping()) render(true); }); // 102회차 ⚙️ 파로B: 계정 저장(다른 기기에서 바꾼 업무 기록)을 받으면 바로 다시 그림
  // 안전 모드 시계 — 20초마다 넘김 여부를 다시 본다(바뀌면 다시 그림, 아니면 분 숫자만) · 60초마다 내 안전 모드를 다시 알린다(나중에 연 화면도 받게)
  var safeSig = "", safeTick = 0;
  function sigNow() { return safeAlerts().map(function (a) { return a.id + (a.late ? "!" : ""); }).join(","); }
  function resendOwn() { var sf = lsGet(LS_SAFE, null); if (sf && ownTab(sf) && SY.safety) { var a = SY.safety.list()[sf.id]; safePush(sf, a && a.state === "ok" ? "ok" : "on"); } }
  setInterval(function () {
    if (++safeTick % 3 === 0 && SY.state().mode === "live") resendOwn();
    selfPre(); // 105회차: 예정 5분 전 나에게 먼저
    var typing = isTyping();
    if (sigNow() !== safeSig && !typing) { render(true); return; }
    var all = SY.safety ? SY.safety.list() : {};
    app.querySelectorAll("[data-sfid]").forEach(function (el) { var a = all[el.dataset.sfid], n = el.querySelector("[data-sfel]"); if (a && n) n.textContent = elMin(a.at); });
  }, 20000);
  setInterval(function () { if (/^(check|talk|record)$/.test(cur) && !isTyping()) render(true); }, 60000); // 안전 모드 분 표시
  if (navBack()) { /* 길안내에서 돌아옴 → 동선 화면 */ }
  window.DaeumApp = { days: days, statusOf: statusOf, docModel: docModel, render: render };
  // 72회차 ⑥: 첫 화면 문 — 연동이 자리 잡으면(로컬 판정·서버 첫 받기 끝·오류) 또는 1.5초가 지나면 그때 한 번 그린다. 글꼴도 같이 기다린다(바뀌며 글자가 출렁이지 않게)
  (function () {
    // 73회차 🐞(a): 로그인 상태에선 «서버 첫 받기»(data) 뒤에 «연동됨»(live)이 와서 본문 문구(«사무실 PC에 바로 갑니다» 등)가 바뀌어
    //   화면 전체를 한 번 더 그렸다(full 2). 이제 연동 상태가 끝까지 정해질 때(live·local·offline) 연다. 로그인 기록이 없으면 기다리지 않는다.
    //   상한: 로그인 기록 있음 4초(라이브러리·채널 붙기) · 없음 1.5초(글꼴만)
    var authed = false; try { authed = !!(SY.state().enabled && localStorage.getItem("daeum.auth")); } catch (e) { authed = false; }
    var syncOk = !authed, fontOk = false, DB = window.__daeumBoot, go = function () { if (DB) { if (fontOk) DB.mark("font"); if (syncOk) DB.mark("sync"); } if (syncOk && fontOk) bootOpen(); }; // 97회차: 글꼴·연동도 진척에 반영
    if (DB) DB.need(authed);
    SY.on(function (what) { if (syncOk || what !== "mode") return; if (/^(live|local|offline)$/.test(SY.state().mode)) { syncOk = true; go(); } });
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fontOk = true; go(); }, function () { fontOk = true; go(); }); else fontOk = true; } catch (e) { fontOk = true; }
    setTimeout(bootOpen, authed ? 4000 : 1500);
    if (!parse()) toToday();
  })();
  nudgeApply(); // 74회차: 다음 할 일 안내 켜고 끄기(이 기기)
  SY.init();
  if (window.DaeumOnboard) { window.DaeumOnboard.hook({ login: accountPanel, start: function () { if (location.hash !== "#today") location.hash = "#today"; } }); window.DaeumOnboard.maybeAuto(); } // S12-z3
})();
