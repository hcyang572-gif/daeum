/* 복지 사각지대 현장 업무 도우미(닿음) — S12-d 1부 «단계 레일» 4화면 (⚙️ 파로, 2026-11-03)
   기준: 01_리서치/S12-a3_기능_정의서.md(§3·§5·§7·§8) · 시안 04_발표/S12-c_시안/daeum_S12c_시안.html B탭(D-077)
   화면: #today 오늘(P0, PC) · #home:가구 집 앞 요약(M2, 폰 ③) · #record:가구 상담 후 기록(M5, 폰 ⑥) · #docs 문서함(P2, PC ⑦)
   나머지 단계는 «준비 중» 대신 기존 화면으로 잇는다: ①순서 = officer #s4 · ②동선 = officer #s6 · 실적 = officer #s9 · ④⑤ = 기록 화면 «현장 확인·연계 후보».
   계산은 기존 순수 함수(DaeumFeatures·DaeumPriority·DaeumRoutePlan·DaeumOldHouse·DaeumNotify), 저장·PC↔폰 실시간은 DaeumSync(같은 계정 로그인, 코드·QR 없음).
   ⛔ 넣지 않는 것: 주민 화면 · 신고 접수/명단 밖 가구 등록 · 위험 점수 · «오늘 줄인 시간» 띠 · .ics · 다크 화면. 용어: «한국사회보장정보원»(줄임 금지)·«근무일». */
(function () {
  "use strict";
  var F = window.DaeumFeatures, P = window.DaeumPriority, RP = window.DaeumRoutePlan, SY = window.DaeumSync, OH = window.DaeumOldHouse, NT = window.DaeumNotify;
  var U = F.util;
  var D = window.__DAEUM_HOUSEHOLDS__ || { households: [], meta: { office: { x: 0, y: 0 } }, indicators: [] };
  var AL = window.__DAEUM_ALERTS__ || null, RCP = window.__DAEUM_RECIPIENTS__ || null;
  if (OH && window.__DAEUM_OLDHOUSE__) OH.set(window.__DAEUM_OLDHOUSE__);
  var BY = {}; D.households.forEach(function (h) { BY[h.id] = h; });
  var OFFICE = D.meta.office || { x: 0, y: 0 };
  var IND = {}; (D.indicators || []).forEach(function (i) { IND[i.key] = i.name; });
  var NAME = "복지 사각지대 현장 업무 도우미", SUB = "닿음", OFF = "officer/index.html";
  var W = "일월화수목금토";
  var RM_ = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var app = document.getElementById("app");
  // 정의서 §7 가정값(조정 가능한 가정 — 화면 숫자의 근거 꼬리표에 그대로 적는다)
  var A = { missRate: 0.3, safetyMin: 40, retryGap: 2 };
  var LS_META = "daeum.s11.importMeta", LS_DL = "daeum.officer.deadline", LS_REC = "daeum.s12.rec", LS_SAFE = "daeum.s12.safety", LS_DOCS = "daeum.s12.docs", LS_FILL = "daeum.s12.fill";

  // ── 도구 ──
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 */ } }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return U.ymd(d); }
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
  function weather() {
    if (!AL || !AL.weather) return null;
    var sc = AL.weather.scenarios && AL.weather.scenarios[AL.weather.active]; if (!sc) return null;
    return { name: sc.name, level: sc.level === 1 ? "경보" : "주의보" };
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
    return P.compute(listIds().map(function (id) { return BY[id]; }), { today: at, meta: meta(), weather: weather(), attempts: att, pins: F.store.get("order", []) || [], deferred: lsGet("daeum.officer.deferred", []) || [] });
  }
  function rankBy() { var o = {}; rank().forEach(function (r) { o[r.id] = r; }); return o; }
  function indText(h) { var out = []; Object.keys(h.indicators || {}).forEach(function (k) { if (h.indicators[k]) out.push(IND[k] || k); }); return out; }
  function ageLine(h) { var a = h.members && h.members[0] ? h.members[0].age : null; return (a ? Math.floor(a / 10) * 10 + "대 " : "") + (h.single ? "혼자" : (h.members || []).length + "인"); }
  function routeOrder(ids) {
    var stops = ids.map(function (id) { return { id: id, x: BY[id].x, y: BY[id].y }; });
    return (stops.length > 1 ? RP.twoOpt(RP.nearest(stops, OFFICE), OFFICE, true) : stops).map(function (s) { return s.id; });
  }
  function sched(ids) { var order = ids.map(function (id) { return { id: id, x: BY[id].x, y: BY[id].y, h: BY[id] }; }); return RP.schedule(order, RP.approxLegs(order, OFFICE, true), { start: "09:30", ret: true }); }
  function days() {
    var p = plan(), dl = deadline(), out = [];
    if (p) {
      var g = {}; p.rows.forEach(function (r) { (g[r.day] = g[r.day] || []).push(r); });
      Object.keys(g).sort(function (a, b) { return a - b; }).forEach(function (k) {
        var rows = g[k].sort(function (a, b) { return a.seq - b.seq; });
        out.push({ n: +k, date: rows[0].planned_at ? ymd(rows[0].planned_at) : null, ids: rows.map(function (r) { return r.household_no; }).filter(function (id) { return BY[id]; }), rows: rows, confirmed: true });
      });
    } else {
      var rk = rank(), groups = F.deadline.split(rk, dl.perDay || 5), dp = F.deadline.plan(rk.length, dl.until, dl.perDay || 5);
      groups.forEach(function (ids, i) { out.push({ n: i + 1, date: dp.go && dp.go[i] ? dp.go[i] : ymd(U.addWorkdays(new Date(), i + 1)), ids: routeOrder(ids), rows: null, confirmed: false }); });
    }
    out.forEach(function (d) { d.s = sched(d.ids); });
    return out;
  }
  function lastLog(hid) { return logs().filter(function (l) { return l.household_no === hid; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; })[0] || null; }
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
    "건강": [["WLF00003179", "긴급복지 의료지원", "15090532"], ["WLF00000102", "의료급여", "15090532"]],
    "고립": [["WLF00003191", "노인맞춤돌봄서비스", "15090532"], ["WLF00004190", "상주시 효도수당", "15108347"], ["WLF00005442", "긴급돌봄 지원사업", "15090532"]]
  };
  function svcFor(h) { var out = []; typesFor(h).forEach(function (t) { (SVC[t] || []).forEach(function (s) { if (!out.some(function (o) { return o[0] === s[0]; })) out.push(s); }); }); if (!out.length) out = SVC["생계"].slice(0, 1); return out.slice(0, 5); }
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
    else if (m === "offline") { txt = "끊김 · 이 기기에 임시 저장"; off = true; }
    else { off = true; txt = s.why === "no-table" ? "이 기기에 저장 · 서버 준비 전" : "이 기기에 저장 · 로그인하면 연동"; }
    return '<button class="sync' + (off ? " off" : "") + '" data-act="account" title="같은 공무원 계정으로 로그인한 PC와 폰이 같은 계획·기록을 봅니다"><i></i>' + esc(txt) + (s.pending ? " · 보낼 것 " + s.pending : "") + "</button>";
  }
  function brand() { return '<a class="word" href="#today" aria-label="' + NAME + ' 오늘로"><i aria-hidden="true"></i><span><b class="bn"><span>복지 사각지대</span> <span>현장 업무 도우미</span></b><small>' + SUB + "</small></span></a>"; }
  function top(on, dayHtml) {
    var tabs = [["오늘", "#today", "today"], ["방문 계획", OFF + "#s4", "plan"], ["문서함", "#docs", "docs"], ["실적", OFF + "#s9", "perf"]];
    return '<header class="top"><div class="top-in">' + brand() + '<nav class="seg well" aria-label="메뉴">' + tabs.map(function (t) { return '<a href="' + t[1] + '"' + (t[2] === on ? ' class="on" aria-current="page"' : "") + ">" + t[0] + "</a>"; }).join("") + "</nav>" +
      '<div class="day">' + (dayHtml || "") + "</div>" + syncChip() + "</div></header>";
  }

  // ═════ P0 오늘 ═════
  var STN = [["순서", "명단 43열"], ["동선", "자원 15001839"], ["요약", "15083323"], ["확인", "선정기준 15090532"], ["상담", "민간 15116392"], ["기록", "서비스 목록 15108347"], ["보고", "수급권자 15062448"]];
  function stationHref(i, hid) {
    return [OFF + "#s4", OFF + "#s6" + (hid ? ":" + hid : ""), "#home" + (hid ? ":" + hid : ""), "#record" + (hid ? ":" + hid : ""), "#record" + (hid ? ":" + hid : ""), "#record" + (hid ? ":" + hid : ""), "#docs"][i];
  }
  function stepsOf(hid, confirmed) {
    var st = statusOf(hid), sf = lsGet(LS_SAFE, null);
    if (st !== "planned") return 6;
    if (sf && sf.hid === hid) return 3;
    return confirmed ? 2 : 1;
  }
  function today() {
    var c = dayCtx(), now = new Date();
    var dm = docModel(), pend = dm.pending;
    if (!c) return top("today", "<strong>" + md(now) + "</strong>가상 데이터") + '<main class="wrap"><div class="emptyc blk"><b>방문 계획이 아직 없습니다</b>방문 계획 화면에서 한국사회보장정보원 명단을 불러오면 이 화면이 채워집니다.<br><br><a class="cta" href="' + OFF + '#s1"><b>명단 불러오기</b><small>행복이음 내려받기 서식(43열)</small></a></div></main>';
    var first = c.planned[0] || null, area = BY[c.d.ids[0]] ? BY[c.d.ids[0]].area : "";
    var whenLbl = c.isToday ? "오늘" : (c.d.date ? md(c.d.date) : "다음 방문일");
    var rb = rankBy(), p = plan(), mt = meta();
    var rows = c.d.ids.map(function (id, i) {
      var h = BY[id], r = rb[id], m = mt[id] || {}, pr = p && p.rows.filter(function (x) { return x.household_no === id; })[0];
      var lr = pr && pr.list_rank != null ? pr.list_rank : r ? r.listRank : m.prio || "—";
      var why = r && r.line ? r.line.replace(/^.*?번째( · )?/, "") : "";
      var bits = [why, m.aiRes ? "AI초기상담 " + m.aiRes : ""].filter(Boolean);
      var n = stepsOf(id, c.d.confirmed), st = statusOf(id);
      var bar = '<div class="bar well" aria-label="7단계 중 ' + n + '단계">' + [0, 1, 2, 3, 4, 5, 6].map(function (k) { return "<i" + (k < n ? ' class="on"' : k === n && st === "planned" && id === first ? ' class="now"' : "") + "></i>"; }).join("") + "</div>";
      var stLbl = st === "done" ? " · 만남" : st === "absent" ? " · 부재" : st === "refused" ? " · 거절" : "";
      return '<a class="r" href="' + (st === "planned" ? "#home:" + id : "#docs") + '"><span class="t">' + esc(c.d.s.rows[i] ? c.d.s.rows[i].arrive : "") + '</span><span class="h"><b>' + id + "</b><small>" + esc(h.area + " · " + ageLine(h) + stLbl) + '</small></span><span class="w">한국사회보장정보원 <b>' + esc(lr) + "순위</b> → <b>" + (i + 1) + "번째</b>" + (bits.length ? " · " + esc(clip(bits.join(" · "), 46)) : "") + "</span>" + bar + "</a>";
    }).join("");
    var dl = deadline(), dp = dl.until ? F.deadline.plan(0, dl.until, dl.perDay || 5) : null;
    var remain = listIds().filter(function (id) { var s = statusOf(id); return s !== "done" && s !== "refused"; }).length;
    var visitDays = dp && dp.set ? dp.days.filter(function (x) { return x.kind !== "today"; }).length : 0;
    var cap = Math.floor(visitDays * (dl.perDay || 5) * (1 - A.missRate)), over = Math.max(0, remain - cap);
    var dead = dp && dp.set ? '<div class="dead blk"><div class="k">기한 점검 · ' + esc(roundYm()) + ' 명단</div><div class="n">' + dp.left + '<small> 근무일 남음</small></div><p>' + esc(dl.until.slice(5).replace("-", ".")) + "까지 · 남은 가구 <b>" + remain + "</b> · 이대로면 기한을 넘길 가구 <b>" + over + "</b><br>하루 " + (dl.perDay || 5) + "집 · 허탕률 " + Math.round(A.missRate * 100) + "% 가정(조정 가능)</p></div>" : "";
    var fan = '<div class="fan" id="fan"><div class="d">상담일지 초안<i class="ai"></i><i></i><i></i></div><div class="d">출장 결과 보고(복명서)<i></i><i class="ai"></i><i></i></div><div class="d">서비스 연계 의뢰서<i></i><i></i><i class="ai"></i></div><div class="d">주간 추진 실적<i></i><i></i><i></i></div></div><a class="fan-done" href="#docs"><b>' + pend + "</b>건 완성 대기</a>";
    var hid0 = first || c.d.ids[0];
    var rail = '<div class="rail" id="rail"><div class="track"><i></i></div>' + STN.map(function (s, i) { return '<a class="st' + (i === 6 ? " last" : "") + '" href="' + stationHref(i, hid0) + '"><span class="c">' + (i + 1) + '</span><span class="l">' + s[0] + '</span><span class="p">' + s[1] + "</span></a>"; }).join("") + "</div>";
    var html = top("today", "<strong>" + md(now) + "</strong>" + esc(area) + " 맞춤형복지 담당 · 가상") + '<main class="wrap">' +
      '<div class="hero"><div><h1>나가기 전부터<br><span>보고서까지,</span> 한 번에</h1><p>한국사회보장정보원 명단을 받은 날부터 방문·기록·보고까지 같은 내용을 두 번 쓰지 않습니다.</p></div>' +
      '<a class="cta" href="' + (first ? "#home:" + first : "#docs") + '"><b>' + (first ? (c.isToday ? "오늘 일 시작" : whenLbl + " 방문 준비") : "문서 만들기") + "</b><small>방문 " + c.planned.length + "곳 · 문서 " + pend + "건 대기</small></a></div>" +
      '<section class="scene well" id="scene" aria-label="데이터 → 기능 → 목표"><canvas id="cv" aria-hidden="true"></canvas>' +
      '<div class="col"><h2><em>데이터</em>한국사회보장정보원</h2><div class="chips">' +
      '<div class="chip blk" data-feeds="0,2,3,6"><b>발굴대상자 명단 43열</b><small>행복이음 내려받기 서식</small></div>' +
      '<div class="chip blk" data-feeds="2,3,4,5"><b>복지서비스 OpenAPI</b><small>15090532 · 15108347</small></div>' +
      '<div class="chip blk" data-feeds="1,4"><b>민간·사회서비스 자원</b><small>15116392 · 15001839 · 15057683</small></div>' +
      '<div class="chip blk" data-feeds="6"><b>수급권자 현황</b><small>15062448</small></div></div></div>' +
      '<div class="col"><h2><em>기능</em>하루 7단계가 앞 결과를 이어 받음</h2>' + rail + "</div>" +
      '<div class="col"><h2><em>목표</em>두 번 쓰지 않는 보고서</h2>' + fan + "</div></section>" +
      '<div class="board"><div class="rows blk"><div class="rows-h"><span>' + esc(whenLbl) + " 방문 · " + c.d.ids.length + "곳" + (c.d.confirmed ? " · 확정" : " · 자동 배정안") + '</span><span>출발 상주시청 · ' + esc(c.d.s.end || "") + " 복귀</span></div>" + rows + "</div>" +
      '<div class="side">' + dead + '<div class="links blk"><h3>이어지는 화면</h3><a href="' + OFF + '#s4">방문 계획<span>일차·순서 바꾸기</span></a><a href="' + OFF + "#s6" + (hid0 ? ":" + hid0 : "") + '">동선·길안내<span>네이버 지도</span></a><a href="' + OFF + '#s9">실적·사후관리<span>재방문·약속</span></a><a href="' + OFF + '#s1">명단 불러오기<span>엑셀 43열</span></a></div></div></div>' +
      '<p class="foot"><span class="demo-tag">가상 데이터</span><span>가구 번호·나이·사유·메모는 모두 시연용 가상 · 실제 개인정보 없음</span><a href="shared/data.html">활용 데이터</a><a href="?demo=reset#today">시연 처음 상태로</a></p></main>';
    return html;
  }
  var played = false;
  function bindToday() {
    var rail = document.getElementById("rail"), fan = document.getElementById("fan");
    if (!rail) return;
    var sts = rail.querySelectorAll(".st");
    function finish() { rail.classList.add("go"); sts.forEach(function (s) { s.classList.add("on"); }); if (fan) fan.classList.add("done"); }
    if (played || RM_) { finish(); return; }
    played = true;
    setTimeout(function () { rail.classList.add("go"); }, 300);
    sts.forEach(function (s, i) { setTimeout(function () { s.classList.add("on"); }, 420 + i * 230); });
    setTimeout(function () { if (fan) fan.classList.add("done"); }, 420 + 7 * 230 + 150);
    particles(sts);
  }
  /** 첫 화면 3초: 왼쪽 데이터 칩에서 입자가 흘러 정거장에 꽂힌다(한 번 재생 후 정지) */
  function particles(sts) {
    var sc = document.getElementById("scene"), cv = document.getElementById("cv"); if (!sc || !cv || !cv.getContext) return;
    var R = sc.getBoundingClientRect(), k = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(R.width * k); cv.height = Math.round(R.height * k);
    var g = cv.getContext("2d"); g.setTransform(k, 0, 0, k, 0, 0);
    var dots = [];
    sc.querySelectorAll(".chip").forEach(function (ch, ci) {
      var a = ch.getBoundingClientRect(), x0 = a.right - R.left, y0 = a.top + a.height / 2 - R.top;
      (ch.dataset.feeds || "").split(",").forEach(function (si, j) {
        var s = sts[+si]; if (!s) return; var c = s.querySelector(".c").getBoundingClientRect();
        for (var n = 0; n < 3; n++) dots.push({ x0: x0, y0: y0, x1: c.left + c.width / 2 - R.left, y1: c.top + c.height / 2 - R.top, t0: 120 + ci * 120 + j * 160 + n * 90 + (+si) * 60, d: 900 });
      });
    });
    var t0 = performance.now(), end = Math.max.apply(null, dots.map(function (d) { return d.t0 + d.d; })) + 200;
    function frame(t) {
      var e = t - t0; g.clearRect(0, 0, R.width, R.height);
      dots.forEach(function (d) {
        var u = (e - d.t0) / d.d; if (u < 0 || u > 1) return;
        var s = u * u * (3 - 2 * u), mx = (d.x0 + d.x1) / 2, my = Math.min(d.y0, d.y1) - 40;
        var x = (1 - s) * (1 - s) * d.x0 + 2 * (1 - s) * s * mx + s * s * d.x1, y = (1 - s) * (1 - s) * d.y0 + 2 * (1 - s) * s * my + s * s * d.y1;
        g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fillStyle = "rgba(12,135,103," + (0.35 + 0.65 * (1 - u)) + ")"; g.fill();
      });
      if (e < end) requestAnimationFrame(frame); else g.clearRect(0, 0, R.width, R.height);
    }
    requestAnimationFrame(frame);
  }

  // ═════ M2 집 앞 요약(③) ═════
  function phBrand() { return '<div class="ph-brand"><span>' + NAME + "</span><small>" + SUB + '</small><span class="sp">' + syncChip() + "</span></div>"; }
  function mini(now, hid) {
    return '<nav class="mini well" aria-label="7단계">' + STN.map(function (s, i) { var cls = i < now ? "on" : i === now ? "now" : ""; return '<a class="' + cls + '" href="' + stationHref(i, hid) + '"' + (i === now ? ' aria-current="step"' : "") + ">" + s[0] + "</a>"; }).join("") + "</nav>";
  }
  function bnav(on, hid) {
    var it = [["동선", OFF + "#s6" + (hid ? ":" + hid : ""), "route"], ["집 앞", "#home" + (hid ? ":" + hid : ""), "home"], ["기록", "#record" + (hid ? ":" + hid : ""), "record"], ["오늘", "#today", "today"]];
    return '<div class="bnav"><nav aria-label="현장 메뉴">' + it.map(function (x) { return '<a href="' + x[1] + '"' + (x[2] === on ? ' class="on" aria-current="page"' : "") + ">" + x[0] + "</a>"; }).join("") + "</nav></div>";
  }
  function pickHid(want) {
    var c = dayCtx(); if (!c) return null;
    if (want && BY[want]) { var d = dayOfHid(c.ds, want); if (d) c.d = d; return { c: c, hid: want }; }
    return { c: c, hid: c.planned[0] || c.d.ids[c.d.ids.length - 1] };
  }
  function phEmpty() { return '<main class="ph">' + phBrand() + '<div class="emptyc blk"><b>방문 계획이 없습니다</b>사무실 PC에서 방문 계획을 확정하면 같은 계정의 폰에 바로 나타납니다.</div></main>' + bnav("home", null); }
  function home(want) {
    var k = pickHid(want); if (!k) return phEmpty();
    var c = k.c, hid = k.hid, h = BY[hid], m = meta()[hid] || {}, r = rankBy()[hid], att = attempts(), w = weather();
    var p = plan(), pr = p && p.rows.filter(function (x) { return x.household_no === hid; })[0];
    var lr = pr && pr.list_rank != null ? pr.list_rank : r ? r.listRank : m.prio || "—";
    var i = c.d.ids.indexOf(hid), eta = arriveOf(c, hid);
    var vt = F.visitTime.profile(att, hid, { neighborLog: neighborLog() }), L = lastLog(hid);
    var reasons = indText(h);
    var lines = [];
    lines.push({ lb: "발굴 이유", t: (reasons.join(" · ") || "위기정보") + (m.lonely ? " · 고독사 우선방문 대상" : ""), plug: ["명단 43열"] });
    var past = [];
    if (L) past.push(mdDot(L.at) + " " + (L.result === "met" ? "만남" : L.result === "absent" ? "부재" : "거절") + (L.memo ? " — " + clip(L.memo, 34) : ""));
    else if (vt.absences.length) past.push(vt.absences.length + "번 부재(" + uniq(vt.absences.map(function (a) { return a.label; })).join("·") + ")");
    else past.push("처음 찾아가는 집" + (r && r.gap != null ? " · 상담 공백 " + r.gap + "일" : ""));
    if (m.aiRes) past.push("AI초기상담 " + m.aiRes);
    lines.push({ lb: "지난 기록", t: past.join(" · "), plug: L ? ["명단 43열", "현장 기록"] : ["명단 43열"] });
    var warn = [], wplug = [];
    if (OH && OH.get() && OH.isOld(h)) { warn.push("오래된 집이 많은 읍면(30년 넘은 주택 " + Math.round(OH.rate(h.area) * 100) + "%)"); wplug.push("건축물대장"); }
    if (w) { warn.push(w.name + " — " + (/폭염/.test(w.name) ? "시원한 곳·마실 물" : "난방이 되는지 먼저")); wplug.push("기상청 특보"); }
    var notes = (F.store.get("homeNotes", {}) || {})[hid] || [];
    if (notes.length) warn.push(notes.slice(0, 2).join(" · "));
    warn.push("2인 방문 확인");
    lines.push({ lb: "주의", t: warn.join(" · "), plug: wplug, warn: true });
    var sv = svcFor(h);
    lines.push({ lb: "받는 급여 · 관련 서비스", t: (h.status && h.status !== "없음" ? h.status : "받는 급여 없음") + " · " + sv.slice(0, 2).map(function (s) { return s[1]; }).join(", "), plug: ["복지서비스 OpenAPI 15090532"] });
    if (vt.best && vt.absences.length) lines.push({ lb: "다음엔 이 시간대", t: vt.best.label + "(" + vt.best.hours + ") — 비어 있던 시간을 피함", plug: ["현장 기록"] });
    var sign = notes.length + (L && L.tags ? L.tags.filter(function (t) { return FIELD_SIGNS.indexOf(t) >= 0; }).length : 0);
    var prev = c.d.ids[i - 1], next = c.d.ids[i + 1];
    return '<main class="ph">' + phBrand() + mini(2, hid) +
      '<section class="idc blk" aria-label="가구"><span class="num">' + hid + '</span><span class="who">' + esc(h.area + " · " + ageLine(h) + " 사심 · 발굴 " + (+m.cnt || 1) + "회째") + '</span><span class="rk well">한국사회보장정보원<br>발굴 순위<b>' + esc(lr) + "</b></span>" +
      '<span class="eta">' + (eta ? "도착 예정 <b>" + esc(eta) + "</b> · " : "") + c.d.ids.length + "곳 중 <b>" + (i + 1) + "번째</b>" + (c.isToday ? "" : " · " + (c.d.date ? md(c.d.date) : "")) + "</span></section>" +
      '<ul class="stops blk">' + lines.slice(0, 5).map(function (x, n) { return '<li class="' + (x.warn ? "warn" : "") + '"><i>' + (x.warn ? "!" : n + 1) + '</i><div><span class="lb">' + esc(x.lb) + "</span>" + esc(x.t) + (x.plug.length ? "<br>" + x.plug.map(function (p) { return '<span class="plug">' + esc(p) + "</span>"; }).join("") : "") + "</div></li>"; }).join("") + "</ul>" +
      '<section class="basis well" aria-label="판단 근거 카드"><div class="ttl"><span>판단 근거 카드</span><span>점수 없음 · 판단은 담당자</span></div><div><b>' + reasons.length + "</b>명단 사유</div><div><b>" + (+m.cnt || 1) + "</b>발굴 횟수</div><div><b>" + (sign || "?") + "</b>현장 징후</div>" +
      "<p>현장 징후는 집 안에서 «기록»의 체크로 채웁니다. 명단 사유 밖 징후는 보고서에 따로 셉니다.</p></section>" +
      '<button class="big" type="button" data-act="enter">들어가기 <small>안전 모드 ' + A.safetyMin + "분</small></button>" +
      '<div class="subnav">' + (prev ? '<a href="#home:' + prev + '">← 앞 집 ' + prev + "</a>" : "<span></span>") + '<a href="' + OFF + "#s6:" + hid + '">동선·길안내</a>' + (next ? '<a href="#home:' + next + '">다음 집 ' + next + " →</a>" : "<span></span>") + "</div>" +
      "</main>" + bnav("home", hid);
  }
  function bindHome(want) {
    var k = pickHid(want); if (!k) return;
    var b = app.querySelector('[data-act="enter"]'); if (b) b.addEventListener("click", function () { vib(); lsSet(LS_SAFE, { hid: k.hid, at: new Date().toISOString(), min: A.safetyMin }); location.hash = "#record:" + k.hid; });
  }

  // ═════ M5 상담 후 기록(⑥) — ④ 현장 확인·⑤ 연계 후보가 미리 채워짐 ═════
  function recOf(hid) {
    var all = lsGet(LS_REC, {}) || {}, o = all[hid];
    if (!o) {
      var h = BY[hid], sg = {}, sv = {};
      signsFor(h).forEach(function (s) { sg[s] = true; });
      svcFor(h).slice(0, 2).forEach(function (s) { sv[s[0]] = true; });
      o = { res: "met", signs: sg, svcs: sv, memo: "", refuse: "", at: new Date().toISOString() };
    }
    return o;
  }
  function saveRec(hid, o) { var all = lsGet(LS_REC, {}) || {}; all[hid] = o; lsSet(LS_REC, all); }
  function chosenSvcs(hid, o) { return svcFor(BY[hid]).filter(function (s) { return o.svcs[s[0]]; }); }
  function chosenSigns(o) { return Object.keys(o.signs || {}).filter(function (k) { return o.signs[k]; }); }
  var NEED = { "주거": "난방·주거비 도움", "생계": "생활비 부담 덜기", "건강": "병원·약 챙기기", "고립": "안부 확인·말벗" };
  function markWords(t) { return esc(t).replace(/(끊겨|끊김|끊긴|밀려|밀림|밀렸|체납|아프|아파|병원|약|혼자|외롭|굶|끼니|추워|난방|보일러|독촉|연체|월세|우울)/g, "<mark>$1</mark>"); }
  /** 상담일지 초안(규칙): 체크·연계 후보·말한 글 → 쟁점·욕구·다음. 숫자·날짜는 규칙, 문장은 담당자가 확인 */
  function recDraft(hid, o) {
    var h = BY[hid], sg = chosenSigns(o), sv = chosenSvcs(hid, o), memo = o.memo || "";
    var types = uniq(F.askGuide.detect(memo + " " + sg.join(" ")).concat(typesFor(h)));
    var due = ymd(U.addWorkdays(new Date(), A.retryGap));
    var pr = F.promises.extract(memo, { householdId: hid, label: "가구 " + hid, area: h.area, at: new Date() });
    var issue = clip(memo.split(/[.。\n]/)[0] || "", 50);
    return { issue: [sg.slice(0, 3).join(" · "), issue].filter(Boolean).join(" — "), need: types.map(function (t) { return NEED[t]; }).filter(Boolean).join(" · "),
      next: pr[0] ? (pr[0].due ? mdDot(pr[0].due) + " " : "") + pr[0].text : sv.length ? mdDot(due) + " " + sv[0][1] + " 신청 여부 확인" : mdDot(due) + " 전화로 안부 확인", due: pr[0] && pr[0].due || due, pr: pr, sv: sv, sg: sg };
  }
  function record(want) {
    var k = pickHid(want); if (!k) return phEmpty();
    var c = k.c, hid = k.hid, h = BY[hid], o = recOf(hid), now = new Date();
    var sf = lsGet(LS_SAFE, null), safe = "";
    if (sf && sf.hid === hid) {
      var el = Math.max(0, Math.round((now - new Date(sf.at)) / 60000)), lim = sf.min || A.safetyMin;
      safe = el >= lim ? '<div class="safe well late" role="alert"><i></i><span><b>' + lim + "분 지났습니다 · 괜찮으세요?</b></span><button type=\"button\" data-act=\"safeok\">괜찮아요 · 20분 더</button></div>"
        : '<div class="safe well"><i></i><span>안전 모드 <b>' + el + "분째</b> · " + lim + "분이 지나면 괜찮은지 묻습니다</span></div>";
    }
    var sg = signsFor(h), extra = FIELD_SIGNS.filter(function (s) { return sg.indexOf(s) < 0; });
    var sv = svcFor(h), dr = recDraft(hid, o), filled = dr.sg.length + dr.sv.length;
    var nextId = c.d.ids.filter(function (id) { return id !== hid && statusOf(id) === "planned"; })[0];
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var met = '<section class="pre blk"><div class="ttl"><span>이미 채워진 칸</span><b>' + filled + "칸 · 다시 안 써도 됨</b></div>" +
      '<div class="grp">현장 확인 · 명단 위기정보로 미리 고름(아니면 눌러 빼기)</div><div class="tok">' + sg.concat(extra).map(function (s) { return '<button type="button" data-sign="' + esc(s) + '" aria-pressed="' + !!o.signs[s] + '">' + esc(s) + "</button>"; }).join("") + "</div>" +
      '<div class="grp">연계 후보 · 한국사회보장정보원 복지서비스</div><div class="tok">' + sv.map(function (s) { return '<button type="button" class="s" data-svc="' + s[0] + '" aria-pressed="' + !!o.svcs[s[0]] + '">' + esc(s[1]) + "<small>" + s[2] + "</small></button>"; }).join("") + "</div></section>" +
      '<div class="micw"><button type="button" class="mic" data-act="mic" aria-label="1분 말하기"' + (SR ? "" : " disabled") + '><svg class="ring" viewBox="0 0 112 112" aria-hidden="true"><circle cx="56" cy="56" r="52" fill="none" stroke="#E1E5EB" stroke-width="6"/><circle id="ring" cx="56" cy="56" r="52" fill="none" stroke="#0C8767" stroke-width="6" stroke-linecap="round" stroke-dasharray="327" stroke-dashoffset="327" transform="rotate(-90 56 56)"/></svg><svg width="26" height="32" viewBox="0 0 18 22" aria-hidden="true"><rect x="5" y="1" width="8" height="13" rx="4" fill="#fff"/><path d="M2 10a7 7 0 0 0 14 0M9 17v4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>' +
      '<div class="tx"><b id="mict">0:00 / 1:00</b>' + (SR ? "말로 1분이면 됩니다. 음성 원본은 남기지 않고 받아쓴 글만 씁니다." : "이 브라우저는 받아쓰기를 지원하지 않습니다 · 아래에 글로 남겨 주세요.") + "</div></div>" +
      '<label class="sr" for="memo">상담 내용</label><textarea id="memo" class="memo" rows="3" placeholder="만난 내용을 짧게(이름·주소·연락처는 적지 마세요)">' + esc(o.memo) + "</textarea>" +
      '<section class="draft blk" aria-live="polite"><div class="ttl">상담일지 초안<span>자동 정리 · 확인 전</span></div>' +
      "<p><b>쟁점</b>" + (dr.issue ? markWords(dr.issue) : '<span class="empty">말하거나 체크하면 채워짐</span>') + "</p><p><b>욕구</b>" + esc(dr.need || "—") + (dr.sv.length ? " · 연계 후보 " + esc(dr.sv.map(function (s) { return s[1]; }).join(", ")) : "") + '</p><p><b>다음</b><span class="rule">' + esc(dr.next) + "</span></p></section>";
    var att = attempts().filter(function (t) { return t.householdId === hid && /no_answer|absent/.test(t.result); }).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var n = att.length + 1, vt = F.visitTime.profile(attempts(), hid, { neighborLog: neighborLog() });
    var a3 = n >= 3 ? F.visitTime.afterThree(attempts().concat([{ householdId: hid, channel: "visit", result: "no_answer", at: now.toISOString() }]), hid, { area: h.area, neighborLog: neighborLog() }) : null;
    var absent = '<section class="absent blk"><b class="h">이번이 ' + (n >= 3 ? "세 번째 이상" : n === 2 ? "두 번째" : "첫") + " 부재입니다</b>" +
      '<div class="tries">' + att.slice(-2).map(function (t) { return "<span>" + esc(mdDot(t.at) + " " + hm(t.at)) + " 부재</span>"; }).join("") + "<span>지금 " + hm(now) + " 부재</span></div>" +
      "다음 시도: <b>" + esc(md(U.addWorkdays(now, A.retryGap))) + (vt.best ? " " + esc(vt.best.label + "(" + vt.best.hours + ")") : "") + "</b> · 근무일 " + A.retryGap + "일 뒤(가정) · 확정하면 방문 계획의 재시도에 들어갑니다." +
      (a3 ? '<div class="msg">' + esc(a3.steps[0].text) + '</div><div style="margin-top:8px"><button type="button" class="sbtn" data-act="copytong">통·이장 협조 문안 복사</button></div>' : "") +
      '<div class="grp" style="margin-top:10px;font-size:11px;font-weight:800;color:var(--mute)">문 앞에서 본 것</div><div class="tok">' + ["우편물 쌓임", "불 꺼져 있음", "이웃이 최근 봄", "인기척 없음"].map(function (s) { return '<button type="button" data-sign="' + s + '" aria-pressed="' + !!o.signs[s] + '">' + s + "</button>"; }).join("") + "</div></section>";
    var refuse = '<section class="absent blk"><b class="h">지금은 필요 없다고 하셨습니다</b>근무일 5일 뒤(' + esc(md(U.addWorkdays(now, 5))) + ') 다시 권하도록 할 일에 넣습니다.<div style="margin-top:8px"><label class="sr" for="refuseWhy">거절 사유</label><input class="in1" id="refuseWhy" maxlength="60" placeholder="거절 사유 한 줄(예: 자녀가 도와준다고 하심)" value="' + esc(o.refuse || "") + '"></div></section>';
    var nextLbl = nextId ? "다음 집 " + nextId + (arriveOf(c, nextId) ? " · " + arriveOf(c, nextId) : "") : "오늘 방문 끝 → 문서함";
    return '<main class="ph">' + phBrand() + mini(5, hid) + safe +
      '<div class="idc blk" style="padding:10px 14px"><span class="num" style="font-size:26px">' + hid + '</span><span class="who">' + esc(h.area + " · " + ageLine(h)) + " · 만난 결과</span></div>" +
      '<div class="switch well" role="radiogroup" aria-label="만난 결과">' + [["met", "만남"], ["absent", "부재"], ["refuse", "거절"]].map(function (x) { return '<button type="button" role="radio" data-res="' + x[0] + '" aria-checked="' + (o.res === x[0]) + '">' + x[1] + "</button>"; }).join("") + "</div>" +
      (o.res === "met" ? met : o.res === "absent" ? absent : refuse) +
      '<button class="big dark" type="button" data-act="save">확정 <small>' + esc(nextLbl) + "</small></button>" +
      '<div class="subnav"><a href="#home:' + hid + '">← 집 앞 요약</a><span>' + (SY.state().mode === "live" ? "확정하면 사무실 PC에 바로" : "확정하면 이 기기에 저장") + "</span></div>" +
      "</main>" + bnav("record", hid);
  }
  var micRec = null, micT = null;
  function bindRecord(want) {
    var k = pickHid(want); if (!k) return;
    var hid = k.hid, o = recOf(hid), memoEl = document.getElementById("memo"), t = null;
    function rerender() { saveRec(hid, o); render(); }
    app.querySelectorAll("[data-res]").forEach(function (b) { b.addEventListener("click", function () { o.res = b.dataset.res; vib(); rerender(); }); });
    app.querySelectorAll("[data-sign]").forEach(function (b) { b.addEventListener("click", function () { var s = b.dataset.sign; o.signs[s] = !o.signs[s]; rerender(); }); });
    app.querySelectorAll("[data-svc]").forEach(function (b) { b.addEventListener("click", function () { var s = b.dataset.svc; o.svcs[s] = !o.svcs[s]; rerender(); }); });
    if (memoEl) memoEl.addEventListener("input", function () { o.memo = memoEl.value; saveRec(hid, o); clearTimeout(t); t = setTimeout(function () { var pos = memoEl.selectionStart; render(); var m2 = document.getElementById("memo"); if (m2) { m2.focus(); try { m2.setSelectionRange(pos, pos); } catch (e) { /* 무시 */ } } }, 900); });
    var ri = document.getElementById("refuseWhy"); if (ri) ri.addEventListener("input", function () { o.refuse = ri.value; saveRec(hid, o); });
    var ok = app.querySelector('[data-act="safeok"]'); if (ok) ok.addEventListener("click", function () { var sf = lsGet(LS_SAFE, null); if (sf) { sf.min = (sf.min || A.safetyMin) + 20; lsSet(LS_SAFE, sf); } render(); });
    var cp = app.querySelector('[data-act="copytong"]'); if (cp) cp.addEventListener("click", function () { var a3 = F.visitTime.afterThree(attempts(), hid, { area: BY[hid].area }); copy(a3.steps[0].text); });
    var mic = app.querySelector('[data-act="mic"]'); if (mic) mic.addEventListener("click", function () { toggleMic(hid, o, mic); });
    var sv = app.querySelector('[data-act="save"]'); if (sv) sv.addEventListener("click", function () { vib(); saveRecord(k.c, hid); });
  }
  function toggleMic(hid, o, btn) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    if (micRec) { micRec.stop(); return; }
    var rec = new SR(), t0 = Date.now(), base = o.memo ? o.memo + " " : "", got = "";
    rec.lang = "ko-KR"; rec.continuous = true; rec.interimResults = true; micRec = rec; btn.classList.add("rec");
    var ring = document.getElementById("ring"), lab = document.getElementById("mict"), memo = document.getElementById("memo");
    micT = setInterval(function () { var s = Math.min(60, (Date.now() - t0) / 1000); if (ring) ring.setAttribute("stroke-dashoffset", (327 * (1 - s / 60)).toFixed(0)); if (lab) lab.textContent = "0:" + pad(Math.floor(s)) + " / 1:00"; if (s >= 60) rec.stop(); }, 250);
    rec.onresult = function (e) { var fin = "", tmp = ""; for (var i = 0; i < e.results.length; i++) { if (e.results[i].isFinal) fin += e.results[i][0].transcript; else tmp += e.results[i][0].transcript; } got = fin; if (memo) memo.value = base + fin + tmp; };
    rec.onerror = function () { toast("받아쓰기를 쓸 수 없습니다 — 글로 남겨 주세요"); };
    rec.onend = function () { clearInterval(micT); micRec = null; o.memo = (base + got).trim(); saveRec(hid, o); render(); };
    try { rec.start(); toast("말씀하세요 · 다시 누르면 멈춥니다"); } catch (e) { clearInterval(micT); micRec = null; }
  }
  function saveRecord(c, hid) {
    var o = recOf(hid), h = BY[hid], now = new Date(), dr = recDraft(hid, o), res = o.res;
    var sgTxt = dr.sg.length ? "확인: " + dr.sg.join(", ") + ". " : "";
    var memo = res === "met" ? (sgTxt + (o.memo || "") + (dr.sv.length ? " 연계 후보: " + dr.sv.map(function (s) { return s[1]; }).join(", ") + "." : "")).trim()
      : res === "refuse" ? "거절: " + (o.refuse || "사유 없음") : "부재" + (dr.sg.length ? " · " + dr.sg.join(", ") : "");
    var found = res === "met" ? dr.pr.slice() : [];
    if (res === "met" && !found.length && dr.sv.length) found.push({ id: "PR-" + now.getTime() + "-s", householdId: hid, label: "가구 " + hid, area: h.area, text: dr.sv[0][1] + " 신청 여부 확인", kind: "apply", due: dr.due, src: "방문 기록", at: now.toISOString(), done: false, doneAt: null });
    if (res === "refuse") found.push({ id: "PR-" + now.getTime() + "-r", householdId: hid, label: "가구 " + hid, area: h.area, text: "거절 뒤 다시 권유", kind: "visit", due: ymd(U.addWorkdays(now, 5)), src: "방문 결과", at: now.toISOString(), done: false, doneAt: null });
    if (found.length) F.store.set("promises", F.promises.merge(F.store.get("promises", []), found));
    var tags = uniq(dr.sg.concat(dr.sv.map(function (s) { return s[1]; })).concat(F.askGuide.detect(memo))).slice(0, 12);
    SY.addLog({ household_no: hid, result: res, memo: memo, tags: tags, promises: found });
    var all = lsGet(LS_REC, {}) || {}; delete all[hid]; lsSet(LS_REC, all);
    var sf = lsGet(LS_SAFE, null); if (sf && sf.hid === hid) { try { localStorage.removeItem(LS_SAFE); } catch (e) { /* 무시 */ } }
    var nx = c.d.ids.filter(function (id) { return id !== hid && statusOf(id) === "planned"; })[0];
    toast("확정했습니다 · " + (SY.state().mode === "live" ? "사무실 PC 문서함에 반영됨" : "이 기기에 저장"));
    location.hash = nx ? "#home:" + nx : "#docs";
  }

  // ═════ P2 문서함(⑦) ═════
  var DOCS = [
    { k: "d2", nm: "출장 결과 보고(복명서)", sub: "방문한 날 · hwpx 1쪽", meter: [["r", 8], ["a", 3], ["e", 1]] },
    { k: "d1", nm: "상담일지 초안", sub: "행복이음 입력 순서로 복사", meter: [["m", 5], ["a", 4]] },
    { k: "d3", nm: "서비스 연계 의뢰서", sub: "연계 확정 때 · hwpx 1쪽", meter: [["m", 4], ["r", 3], ["a", 2]] },
    { k: "d4", nm: "안내 문자 문안", sub: "이름·주소 빼고 쉬운 말 · 복사", meter: [["m", 2], ["a", 3]] },
    { k: "d5", nm: "주간 추진 실적 보고", sub: "수급권자 현황 15062448 비교 · hwpx", meter: [["r", 9], ["m", 2], ["a", 1]] },
    { k: "d6", nm: "차수 처리 결과 명단", sub: "명단 43열 + 방문 4열 · xlsx", meter: [["m", 12], ["r", 4]] }
  ];
  var docSel = "d2", docDay = null, docHid = null, docOrg = null, made1 = {};
  function reportDays() { return days().filter(function (d) { return d.ids.some(function (id) { return statusOf(id) !== "planned"; }); }); }
  function caseOf(id) {
    var L = lastLog(id), st = statusOf(id), memo = L ? L.memo : "", tags = L && L.tags || [];
    var refs = st === "done" ? F.referral.suggest({ text: memo, needs: F.askGuide.detect(memo) }).filter(function (x) { return x !== "emergency"; }) : [];
    var field = tags.filter(function (t) { return FIELD_SIGNS.indexOf(t) >= 0; });
    return { id: id, st: st, memo: memo, tags: tags, refs: refs, field: field, at: L ? L.at : null, h: BY[id] };
  }
  function weekRange() { var n = U.startOfDay(new Date()), mon = new Date(n.getTime() - ((n.getDay() + 6) % 7) * 864e5); return { from: mon, to: new Date(mon.getTime() + 4 * 864e5) }; }
  function docModel() {
    var rd = reportDays(), dd = rd.length ? (rd.filter(function (d) { return d.n === docDay; })[0] || rd[rd.length - 1]) : null;
    var cases = dd ? dd.ids.map(caseOf) : [], met = cases.filter(function (x) { return x.st === "done"; }), ab = cases.filter(function (x) { return x.st === "absent"; });
    var done = lsGet(LS_DOCS, {}) || {}, key = dd ? roundYm() + ":" + dd.n : "";
    var linked = met.filter(function (x) { return x.refs.length; });
    var cnt = { d2: dd ? 1 : 0, d1: met.length, d3: linked.length, d4: ab.length + linked.length, d5: 1, d6: 1 };
    var got = function (k) { return (done[key + ":" + k] || []).length; };
    var wk = weekRange(), wkKey = ymd(wk.from);
    var pend = { d2: Math.max(0, cnt.d2 - got("d2")), d1: Math.max(0, cnt.d1 - got("d1")), d3: Math.max(0, cnt.d3 - got("d3")), d4: Math.max(0, cnt.d4 - got("d4")), d5: (done["wk:" + wkKey + ":d5"] || []).length ? 0 : 1, d6: (done["round:" + roundYm() + ":d6"] || []).length ? 0 : 1 };
    return { rd: rd, dd: dd, cases: cases, met: met, ab: ab, linked: linked, cnt: cnt, pend: pend, key: key, wkKey: wkKey, pending: Object.keys(pend).reduce(function (s, k) { return s + pend[k]; }, 0) };
  }
  function markDone(M, k, id) {
    var done = lsGet(LS_DOCS, {}) || {}, key = k === "d5" ? "wk:" + M.wkKey + ":d5" : k === "d6" ? "round:" + roundYm() + ":d6" : M.key + ":" + k;
    var a = done[key] || []; if (a.indexOf(id) < 0) a.push(id); done[key] = a; lsSet(LS_DOCS, done);
  }
  function fills() { return lsGet(LS_FILL, {}) || {}; }
  /** 복명서 칸 — 칸마다 출처(data 명단·한국사회보장정보원 / rule 규칙 / ai 자동 문장 / empty 입력 필요) */
  function d2Fields(M) {
    var dd = M.dd, logsD = M.cases.filter(function (x) { return x.at; }).map(function (x) { return x.at; }).sort();
    var areas = uniq(dd.ids.map(function (id) { return BY[id].area; }));
    var rf = M.cases.filter(function (x) { return x.st === "refused"; }), sigN = M.cases.filter(function (x) { return x.field.length; }).length;
    var ym = roundYm().split("-"), nextAb = ymd(U.addWorkdays(new Date(), A.retryGap));
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
  function docsView() {
    var M = docModel(), now = new Date();
    if (!M.dd) return top("docs", "<strong>문서함</strong>가상 데이터") + '<main class="wrap"><div class="emptyc blk"><b>아직 방문 기록이 없습니다</b>폰에서 «확정»을 누르면 이 화면이 바로 채워집니다.</div></main>';
    if (!docDay) docDay = M.dd.n;
    var D0 = DOCS.filter(function (d) { return d.k === docSel; })[0];
    var list = DOCS.map(function (d) {
      var q = d.k === "d5" || d.k === "d6" ? M.pend[d.k] : M.pend[d.k], tot = M.cnt[d.k];
      var made = tot > 0 && q === 0;
      return '<button type="button" class="row' + (d.k === docSel ? " sel" : "") + (made ? " made" : "") + '" data-doc="' + d.k + '"><span class="q' + (q ? "" : " z") + '">' + q + '</span><span class="nm"><b>' + d.nm + "</b><small>" + esc(d.sub) + (tot ? " · " + tot + "건" : " · 해당 없음") + '</small></span><span class="meter" aria-hidden="true">' + d.meter.map(function (x) { return '<i class="' + x[0] + '" style="flex:' + x[1] + '"></i>'; }).join("") + '</span><span class="go">' + (made ? "받음 ✓" : d.k === docSel ? "만드는 중" : "만들기") + "</span></button>";
    }).join("");
    var pv = docPreview(M, docSel);
    var dayLbl = (M.dd.date ? md(M.dd.date) : M.dd.n + "일차") + " 방문 " + M.cases.filter(function (x) { return x.st !== "planned"; }).length + "곳";
    return top("docs", "<strong>" + esc(dayLbl) + "</strong>가상 데이터") + '<main class="wrap">' +
      '<div class="dhead"><h1>만들 문서 <span>' + M.pending + '</span>건</h1><p>막대 색 = 칸을 채운 곳 · <b style="color:#5D6B80">남색</b> 한국사회보장정보원 명단·API · 회색 규칙 숫자 · 노랑 자동 문장(확인) · 빨강 빈칸(입력 필요)</p></div>' +
      (M.rd.length > 1 ? '<div class="dpick" role="group" aria-label="방문한 날">' + M.rd.map(function (d) { return '<button type="button" data-day="' + d.n + '" aria-pressed="' + (d.n === M.dd.n) + '">' + (d.date ? mdDot(d.date) : d.n + "일차") + "</button>"; }).join("") + "</div>" : "") +
      '<div class="dgrid"><div class="dep blk"><div class="hd"><span>대기</span><span>문서</span><span>채워진 칸</span><span></span></div>' + list + "</div>" +
      '<section class="prev blk" aria-label="' + esc(D0.nm) + ' 미리보기">' + pv + "</section></div>" +
      '<p class="foot"><span class="demo-tag">가상 데이터</span><span>개인정보 4칸(성명·주민등록번호·연락처·주소) 미기재 · 가구 번호·읍면만 · 상담일지 입력·전자서명은 행복이음에서</span></p></main>';
  }
  function flowBtns(k, ready, label2) {
    var m1 = !!made1[k + ":" + (docHid || "")];
    return '<div class="flow2"><button type="button" class="' + (m1 ? "d1" : "d2") + '" data-act="make">' + (m1 ? "1 만들기 ✓" : "1 만들기") + "</button><em>→</em>" +
      '<button type="button" class="' + (m1 ? "d2" : "") + '" data-act="get"' + (m1 && ready ? "" : " disabled") + ">2 " + label2 + "</button></div>";
  }
  function hhPick(arr) {
    if (!arr.length) return "";
    if (!docHid || !arr.some(function (x) { return x.id === docHid; })) docHid = arr[0].id;
    return arr.length > 1 ? '<div class="hh-pick" role="group" aria-label="가구">' + arr.map(function (x) { return '<button type="button" data-hh="' + x.id + '" aria-pressed="' + (x.id === docHid) + '">' + x.id + "</button>"; }).join("") + "</div>" : "";
  }
  var LEG = '<div class="legend"><span><i style="background:var(--src-data)"></i>한국사회보장정보원 명단·API</span><span><i style="background:var(--src-rule)"></i>규칙 숫자</span><span><i style="background:var(--src-ai)"></i>자동 문장 확인</span><span><i style="background:var(--src-empty)"></i>입력 필요</span></div>';
  function cell(f) { var v = f.src === "ai" ? "<mark>" + esc(f.v) + "</mark>" : f.src === "rule" ? '<span class="rule">' + esc(f.v) + "</span>" : esc(f.v); if (f.input) v = '<input data-fill="' + f.input + '" class="' + (f.v ? "ok" : "") + '" value="' + esc(f.v) + '" placeholder="입력 필요" aria-label="' + esc(f.k) + '">'; return v; }
  function paper(title, sub, fields) {
    return '<div class="paper"><div class="ruler">' + fields.map(function (f) { return '<i style="background:' + SRC_CLS[f.src] + '"></i>'; }).join("") + "</div><h3>" + esc(title) + '</h3><div class="sub">' + esc(sub) + '</div><table class="doc-t">' + fields.map(function (f) { return "<tr><th>" + esc(f.k) + "</th><td>" + cell(f) + "</td></tr>"; }).join("") + "</table></div>";
  }
  function docPreview(M, k) {
    var now = new Date(), area = BY[M.dd.ids[0]].area;
    if (k === "d2") {
      docHid = "";
      var fs = d2Fields(M), empties = fs.filter(function (f) { return f.src === "empty"; }).length;
      return flowBtns("d2", !empties, "hwpx 받기") + paper("복명서", "상주시청 · " + area + " 맞춤형복지팀 · " + mdDot(now) + " 작성", fs) + LEG +
        '<p class="srcline">가구 칸 = 한국사회보장정보원 발굴대상자 명단 · 시각·결과 = 현장 기록 · 빈칸이 0이 되면 받기가 켜집니다 · 칸 이름은 시군 서식에 맞춰 바꿀 수 있는 가정(정의서 §7)</p>';
    }
    if (k === "d1") {
      if (!M.met.length) return '<div class="emptyc"><b>만난 가구가 없습니다</b>상담일지 초안은 «만남»으로 확정한 가구에만 생깁니다.</div>';
      var pk = hhPick(M.met), x = M.cases.filter(function (c) { return c.id === docHid; })[0];
      var dft = F.askGuide.draft({ label: "가구 " + x.id, area: x.h.area, at: x.at, method: "방문 상담", needs: F.askGuide.detect(x.memo), summary: x.memo, services: x.tags.filter(function (t) { return FIELD_SIGNS.indexOf(t) < 0 && !SIGN_REV[t] && !/^(주거|생계|건강|고립)$/.test(t); }), next: (F.promises.open(F.store.get("promises", []), x.id)[0] || {}).text || "", guide: F.askGuide.check(x.memo, null, {}) });
      return pk + flowBtns("d1", true, "입력 순서 복사") + '<div class="paper"><div class="ruler"><i style="background:var(--src-data)"></i><i style="background:var(--src-rule)"></i><i style="background:var(--src-ai)"></i><i style="background:var(--src-ai)"></i></div><h3>상담일지 초안</h3><div class="sub">행복이음 입력용 · 공무원 확정 전</div><table class="doc-t">' +
        dft.fields.map(function (f) { return "<tr><th>" + esc(f.label) + "</th><td>" + (/main|situation|plan|needs|action/.test(f.key) ? "<mark>" + esc(f.value) + "</mark>" : '<span class="rule">' + esc(f.value) + "</span>") + "</td></tr>"; }).join("") + "</table></div>" + LEG +
        '<p class="srcline">' + esc(dft.note) + " · 연계 후보 = 한국사회보장정보원 복지서비스 OpenAPI(15090532·15108347)</p>";
    }
    if (k === "d3") {
      var cand = M.linked.length ? M.linked : M.met;
      if (!cand.length) return '<div class="emptyc"><b>연계할 가구가 없습니다</b>«만남» 기록에서 연계 후보를 고르면 의뢰서가 생깁니다.</div>';
      var pk3 = hhPick(cand), y = M.cases.filter(function (c) { return c.id === docHid; })[0];
      var keys = Object.keys(F.referral.ORGS); if (!docOrg || keys.indexOf(docOrg) < 0 || (y.refs[0] && !made1["d3:" + docHid])) docOrg = y.refs[0] || "care";
      var o = F.referral.ORGS[docOrg];
      var fs3 = [{ k: "받는 기관", src: "rule", v: o.org }, { k: "대상", src: "data", v: "가구 " + y.id + " · " + y.h.area + " · " + ageLine(y.h) + " (성명·연락처는 행복이음 확인 후 기재)" },
        { k: "의뢰 사유", src: "ai", v: clip(y.memo, 90) }, { k: "요청", src: "rule", v: o.ask.join(" · ") }, { k: "붙임", src: "rule", v: o.docs.join(", ") }];
      return pk3 + '<div class="hh-pick" role="group" aria-label="받는 기관">' + keys.filter(function (kk) { return kk !== "emergency"; }).map(function (kk) { return '<button type="button" data-org="' + kk + '" aria-pressed="' + (kk === docOrg) + '">' + esc(F.referral.ORGS[kk].org.replace(/\(.*\)/, "")) + "</button>"; }).join("") + "</div>" +
        flowBtns("d3", true, "hwpx 받기") + paper(o.title, o.org + " 앞", fs3) + LEG + '<p class="srcline">서비스·의뢰 칸 = 현장 기록의 연계 후보(한국사회보장정보원 복지서비스 OpenAPI 15090532·15108347) · 본인 동의 확인 후 발송</p>';
    }
    if (k === "d4") {
      var cand4 = M.ab.concat(M.linked);
      if (!cand4.length) return '<div class="emptyc"><b>보낼 안내가 없습니다</b>부재·연계 가구가 생기면 문안이 만들어집니다.</div>';
      var pk4 = hhPick(cand4), z = M.cases.filter(function (c) { return c.id === docHid; })[0];
      var vt = F.visitTime.profile(attempts(), z.id, { neighborLog: neighborLog() });
      var msg = NT.alimtalk(z.st === "absent" ? "absent" : "link", { area: z.h.area, date: z.at ? ymd(z.at) : null, time: z.at ? hm(z.at) : null, nextDate: ymd(U.addWorkdays(now, A.retryGap)), nextSlot: vt.best && /오전/.test(vt.best.label) ? "오전" : "오후" });
      var bad = NT.lint(msg.body, [z.id]);
      return pk4 + flowBtns("d4", !bad.length, "문안 복사") + '<div class="paper"><div class="ruler"><i style="background:var(--src-rule)"></i><i style="background:var(--src-ai)"></i><i style="background:var(--src-ai)"></i></div><h3>' + esc(msg.title) + '</h3><div class="sub">알림톡 미리보기 · 발송은 담당자가 · ' + msg.chars + '자</div><pre class="doc-pre">' + esc(msg.body) + "</pre></div>" + LEG +
        '<p class="srcline">이름·주소·서비스명 미포함 · 광고성 낱말 점검 ' + (bad.length ? "⚠ " + esc(bad.join(", ")) : "통과") + " · " + esc(NT.SOURCE_TALK) + "</p>";
    }
    if (k === "d5") {
      docHid = "";
      var w = weekModel(), fs5 = [{ k: "기간", src: "rule", v: mdDot(w.from) + " ~ " + mdDot(w.to) }, { k: "방문", src: "rule", v: "만남 " + w.met + " · 부재 " + w.absent + " · 거절 " + w.refuse + " (총 " + w.total + "곳)" },
        { k: "읍면별", src: "rule", v: w.areas.map(function (a) { return a[0] + " " + a[1]; }).join(" · ") || "—" }, { k: "처리 완료", src: "rule", v: "명단 " + w.listN + "가구 중 " + w.doneN + "가구 확인" },
        { k: "지역 배경", src: "data", v: w.rcp }, { k: "한 줄 결론", src: "ai", v: w.concl }];
      return flowBtns("d5", true, "hwpx 받기") + paper("주간 추진 실적 보고", "상주시청 · " + area + " 맞춤형복지팀", fs5) + LEG + '<p class="srcline">숫자는 규칙 집계(현장 기록) · 지역 배경 = 한국사회보장정보원 «복지사업 시군구별 수급권자 현황»(15062448, 기준 2025-12)</p>';
    }
    docHid = "";
    var R = roundRows();
    return flowBtns("d6", true, "xlsx 받기") + '<div class="paper"><div class="ruler"><i style="background:var(--src-data)"></i><i style="background:var(--src-data)"></i><i style="background:var(--src-rule)"></i></div><h3>차수 처리 결과 명단</h3><div class="sub">' + esc(roundYm()) + " 명단 " + R.length + "가구 · 명단 열 + 방문 4열(방문일·결과·연계·다음 확인)</div>" +
      '<table class="doc-t wide"><tr><th>가구</th><th>읍면</th><th>발굴 순위</th><th>방문일</th><th>결과</th><th>연계</th><th>다음 확인</th></tr>' + R.slice(0, 8).map(function (r) { return "<tr>" + r.map(function (v, i) { return "<td>" + (i >= 3 ? '<span class="rule">' + esc(v) + "</span>" : esc(v)) + "</td>"; }).join("") + "</tr>"; }).join("") + (R.length > 8 ? '<tr><td colspan="7" style="text-align:center;color:var(--mute)">… ' + (R.length - 8) + "가구 더</td></tr>" : "") + "</table></div>" + LEG +
      '<p class="srcline">명단 열 = 한국사회보장정보원 발굴대상자 조회 서식(43열 중 가구 번호·읍면·순위만 표시, 개인정보 4칸 제외) · 방문 4열 = 현장 기록</p>';
  }
  var SIGN_REV = {}; Object.keys(SIGN_OF).forEach(function (k) { SIGN_REV[SIGN_OF[k]] = k; });
  function weekModel() {
    var w = weekRange(), to2 = new Date(w.to.getTime() + 864e5), L = logs().filter(function (l) { var t = new Date(l.at); return t >= w.from && t < to2; });
    var last = {}; L.forEach(function (l) { if (!last[l.household_no] || last[l.household_no].at < l.at) last[l.household_no] = l; });
    var ids = Object.keys(last), met = ids.filter(function (i) { return last[i].result === "met"; }).length, ab = ids.filter(function (i) { return last[i].result === "absent"; }).length, rf = ids.filter(function (i) { return last[i].result === "refuse"; }).length;
    var ar = {}; ids.forEach(function (i) { if (BY[i]) ar[BY[i].area] = (ar[BY[i].area] || 0) + 1; });
    var listN = listIds().length, doneN = listIds().filter(function (i) { return statusOf(i) === "done"; }).length;
    var b = RCP && RCP.rows ? RCP.rows.filter(function (r) { return r["사업명"] === "기초생활보장(맞춤형급여)"; })[0] : null;
    return { from: w.from, to: w.to, met: met, absent: ab, refuse: rf, total: ids.length, areas: Object.keys(ar).map(function (a) { return [a, ar[a]]; }), listN: listN, doneN: doneN,
      rcp: b ? "상주시 기초생활보장 수급가구 " + b["수급가구수"].toLocaleString() + "(" + b["기준년월"] + ")" : "수급권자 현황 자료 없음",
      concl: "이번 주 " + ids.length + "곳 방문해 " + met + "가구 상담" + (ab ? ", 부재 " + ab + "가구는 다음 주 다시 방문" : "") + "." };
  }
  function roundRows() {
    var p = plan(), mt = meta();
    return listIds().map(function (id) {
      var L = lastLog(id), st = statusOf(id), c = caseOf(id), pr = F.promises.open(F.store.get("promises", []), id)[0];
      return [id, BY[id].area, String((mt[id] || {}).prio || "—"), L ? ymd(L.at) : "", st === "done" ? "만남" : st === "absent" ? "부재" : st === "refused" ? "거절" : "방문 전", c.refs.length ? F.referral.ORGS[c.refs[0]].org.replace(/\(.*\)/, "") : "", pr ? (pr.due || "") + " " + clip(pr.text, 18) : ""];
    });
  }
  var hwpxP = null;
  function needLibs() {
    if (window.DaeumHwpx && window.DaeumXlsx) return Promise.resolve();
    if (hwpxP) return hwpxP;
    function load(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
    hwpxP = (window.DaeumXlsx ? Promise.resolve() : load("shared/xlsx.js")).then(function () { return window.DaeumHwpx ? null : load("shared/hwpx.js"); });
    return hwpxP;
  }
  function getDoc(M, k) {
    var now = new Date(), area = BY[M.dd.ids[0]].area, made = now.getFullYear() + ". " + (now.getMonth() + 1) + ". " + now.getDate() + ".", office = "상주시청 · " + area + " 맞춤형복지팀";
    var stamp = ymd(now).replace(/-/g, "");
    if (k === "d1") { var x = M.cases.filter(function (c) { return c.id === docHid; })[0]; copy(F.askGuide.draft({ label: "가구 " + x.id, area: x.h.area, at: x.at, method: "방문 상담", needs: F.askGuide.detect(x.memo), summary: x.memo, next: (F.promises.open(F.store.get("promises", []), x.id)[0] || {}).text || "", guide: F.askGuide.check(x.memo, null, {}) }).text); markDone(M, k, x.id); render(); return; }
    if (k === "d4") { var z = M.cases.filter(function (c) { return c.id === docHid; })[0]; var vt = F.visitTime.profile(attempts(), z.id, {}); copy(NT.alimtalk(z.st === "absent" ? "absent" : "link", { area: z.h.area, date: z.at ? ymd(z.at) : null, time: z.at ? hm(z.at) : null, nextDate: ymd(U.addWorkdays(now, A.retryGap)), nextSlot: vt.best && /오전/.test(vt.best.label) ? "오전" : "오후" }).copy); markDone(M, k, z.id); render(); return; }
    needLibs().then(function () {
      var W2 = window.DaeumHwpx, TW = W2 && W2.TW || 0;
      if (k === "d2") {
        var fs = d2Fields(M);
        return W2.download({ title: "복명서", subtitle: "복지사각지대 발굴대상자 현장 확인 출장", made: made, office: office,
          blocks: [{ t: "ch", text: "Ⅰ. 출장 개요" }, { t: "tbl", title: "<표 1> 출장 결과", head: ["항목", "내용"], widths: TW ? [Math.round(TW * .2), TW - Math.round(TW * .2)] : undefined, rows: fs.map(function (f) { return [f.k, f.v]; }) },
            { t: "ch", text: "Ⅱ. 가구별 결과" }].concat(M.cases.map(function (c) { return { t: "li", lv: 1, text: c.id + "(" + c.h.area + ") — " + (c.st === "done" ? "만남: " + clip(c.memo, 80) : c.st === "absent" ? "부재 · 재방문 예정" : c.st === "refused" ? "거절 · 근무일 5일 뒤 다시 권유" : "방문 전") }; }))
            .concat([{ t: "p", kind: "note", text: "※ 가구 칸 = 한국사회보장정보원 발굴대상자 명단 · 개인정보 4칸 미기재 · 시연용 가상 가구 · 담당자 확인 후 확정  끝." }]) }, "복명서_" + stamp + ".hwpx").then(function () { markDone(M, k, "day"); });
      }
      if (k === "d3") {
        var y = M.cases.filter(function (c) { return c.id === docHid; })[0];
        var rec = { text: F.askGuide.draft({ label: "가구 " + y.id, area: y.h.area, at: y.at, method: "방문 상담", needs: F.askGuide.detect(y.memo), summary: y.memo, guide: F.askGuide.check(y.memo, null, {}) }).text, area: y.h.area, label: "가구 " + y.id, at: y.at };
        return W2.download(F.referral.build(rec, docOrg, { office: y.h.area + " 맞춤형복지팀" }), F.referral.fileName(docOrg)).then(function () { markDone(M, k, y.id); });
      }
      if (k === "d5") {
        var w = weekModel();
        return W2.download({ title: "주간 추진 실적 보고", subtitle: mdDot(w.from) + " ~ " + mdDot(w.to), made: made, office: office,
          blocks: [{ t: "ch", text: "Ⅰ. 한 줄 결론" }, { t: "li", lv: 1, text: w.concl }, { t: "ch", text: "Ⅱ. 추진 실적" },
            { t: "tbl", title: "<표 1> 이번 주 방문 결과", head: ["구분", "가구"], rows: [["만남·상담", String(w.met)], ["부재(다시 방문)", String(w.absent)], ["거절", String(w.refuse)], ["합계", String(w.total)]] },
            { t: "li", lv: 1, text: "읍면별: " + (w.areas.map(function (a) { return a[0] + " " + a[1]; }).join(", ") || "없음") },
            { t: "li", lv: 1, text: "명단 처리: " + w.listN + "가구 중 " + w.doneN + "가구 확인" },
            { t: "ch", text: "Ⅲ. 지역 배경" }, { t: "li", lv: 1, text: w.rcp + " — 한국사회보장정보원 복지사업 시군구별 수급권자 현황(15062448)" },
            { t: "p", kind: "note", text: "※ 숫자는 현장 기록 규칙 집계 · 시연용 가상 가구 · 담당자 확인 후 확정  끝." }] }, "주간실적_" + stamp + ".hwpx").then(function () { markDone(M, k, "wk"); });
      }
      if (k === "d6") {
        var R = roundRows();
        return window.DaeumXlsx.download({ title: "차수 처리 결과 명단", subtitle: roundYm() + " 명단", made: made + " " + hm(now), office: office, conclusion: "명단 " + R.length + "가구 중 " + R.filter(function (r) { return r[4] === "만남"; }).length + "가구 상담", note: "※ 시연용 가상 자료 · 개인정보 4칸 없음",
          sheets: [{ name: "처리 결과", title: "<표 1> 차수 처리 결과", unit: "단위: 가구", columns: [{ key: "a", h: "가구", type: "text", w: 10 }, { key: "b", h: "읍면", type: "text", w: 10 }, { key: "c", h: "발굴 순위", type: "text", w: 9 }, { key: "d", h: "방문일", type: "text", w: 12 }, { key: "e", h: "결과", type: "text", w: 9 }, { key: "f", h: "연계", type: "text", w: 22 }, { key: "g", h: "다음 확인", type: "text", w: 28 }], rows: R, total: false, src: "※ 출처: 한국사회보장정보원 발굴대상자 조회 서식(가상) + 닿음 현장 기록" }],
          sources: [{ kind: "가상", org: "닿음", name: "시연용 가상 가구", date: ymd(now), use: "명단·방문 결과" }], footer: "닿음" }, "차수결과_" + roundYm() + "_" + stamp + ".xlsx").then(function () { markDone(M, k, "round"); });
      }
    }).then(function () { toast("내려받았습니다"); render(); }, function () { toast("파일을 만들지 못했습니다 — 다시 눌러 주세요"); });
  }
  function bindDocs() {
    var M = docModel(); if (!M.dd) return;
    app.querySelectorAll("[data-doc]").forEach(function (b) { b.addEventListener("click", function () { docSel = b.dataset.doc; docHid = null; render(); }); });
    app.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", function () { docDay = +b.dataset.day; docHid = null; render(); }); });
    app.querySelectorAll("[data-hh]").forEach(function (b) { b.addEventListener("click", function () { docHid = b.dataset.hh; render(); }); });
    app.querySelectorAll("[data-org]").forEach(function (b) { b.addEventListener("click", function () { docOrg = b.dataset.org; made1["d3:" + docHid] = made1["d3:" + docHid] || false; render(); }); });
    var mk = app.querySelector('[data-act="make"]'); if (mk) mk.addEventListener("click", function () { vib(); made1[docSel + ":" + (docHid || "")] = true; render(); });
    var gt = app.querySelector('[data-act="get"]'); if (gt) gt.addEventListener("click", function () { vib(); getDoc(M, docSel); });
    app.querySelectorAll("[data-fill]").forEach(function (inp) { inp.addEventListener("change", function () { var a = fills(), o = a[M.key] || {}; o[inp.dataset.fill] = inp.value.trim().slice(0, 40); a[M.key] = o; lsSet(LS_FILL, a); render(); }); });
  }

  // ── 계정·연동 창(같은 계정 로그인 → PC·폰 실시간. 코드·QR 넘김 없음) ──
  function accountPanel() {
    var s = SY.state(), why = { login: "로그인 전 — 이 기기에만 저장합니다.", "no-table": "연동 서버가 아직 준비되지 않아 이 기기에만 저장합니다.", off: "연동이 꺼져 있습니다.", lib: "연동 부품을 받지 못했습니다.", error: "서버 응답 오류 — 이 기기에 저장 중.", socket: "실시간 연결이 끊겨 이 기기에 임시 저장 중입니다.", send: "보내기 실패 — 다시 붙으면 자동으로 보냅니다." };
    var d = document.createElement("dialog"); d.className = "acct";
    d.innerHTML = '<form method="dialog" class="acct-in"><h3>PC와 폰 실시간 연동</h3><p>같은 공무원 계정으로 PC와 폰에서 로그인하면 방문 계획과 현장 기록이 서로 바로 나타납니다. 서버에는 가구 번호·순서·상태·가린 메모만 갑니다.</p>' +
      "<p>" + syncChip() + " " + esc(s.mode === "live" ? "실시간 연동 중" : why[s.why] || "") + "</p>" +
      (s.user ? "<p>로그인: <b>" + esc(s.user.email) + '</b></p><div class="acct-b"><button class="sbtn" type="button" data-act="out">로그아웃</button><button class="sbtn pri" value="close">닫기</button></div>'
        : '<label>전자우편<input type="email" id="aEmail" autocomplete="username" required></label><label>비밀번호<input type="password" id="aPw" autocomplete="current-password" minlength="8" required></label><p id="aMsg" role="status"></p><div class="acct-b"><button class="sbtn" type="button" data-act="up">처음이면 가입</button><button class="sbtn pri" type="button" data-act="in">로그인</button></div>') +
      '<p>시연 데이터: 모든 가구·메모는 가상입니다 · <a href="?demo=reset#today">시연 처음 상태로</a> · <a href="shared/data.html">활용 데이터</a></p><button class="acct-x" value="close" aria-label="닫기">×</button></form>';
    document.body.appendChild(d); d.showModal();
    d.addEventListener("close", function () { d.remove(); });
    function go(fn) { var e = d.querySelector("#aEmail").value.trim(), p = d.querySelector("#aPw").value, m = d.querySelector("#aMsg"); if (!e || p.length < 8) { m.textContent = "전자우편과 8자 이상 비밀번호를 넣어 주세요."; return; } m.textContent = "확인 중…";
      fn(e, p).then(function (r) { if (fn === SY.signUp && !(r.data && r.data.session)) { m.textContent = "가입 확인 메일을 보냈습니다. 메일의 확인 단추를 누른 뒤 로그인해 주세요."; return; } d.close(); render(); }, function (er) { m.textContent = "실패: " + (er && er.message ? er.message : "다시 시도해 주세요"); }); }
    var bi = d.querySelector('[data-act="in"]'), bu = d.querySelector('[data-act="up"]'), bo = d.querySelector('[data-act="out"]');
    if (bi) bi.addEventListener("click", function () { go(SY.signIn); });
    if (bu) bu.addEventListener("click", function () { go(SY.signUp); });
    if (bo) bo.addEventListener("click", function () { SY.signOut().then(function () { d.close(); render(); }); });
  }
  function copy(t) { (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("복사했습니다"); }, function () { window.prompt("복사해 주세요", t); }); }
  var toastT = null;
  function toast(t) { var el = document.getElementById("toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); } el.textContent = t; el.className = "toast on"; clearTimeout(toastT); toastT = setTimeout(function () { el.className = "toast"; }, 2600); }

  // ── 길잡이(해시) ──
  var cur = "", curArg = null;
  var TITLES = { today: "오늘", home: "집 앞 요약", record: "상담 후 기록", docs: "문서함" };
  function parse() { var m = /^#(today|home|record|docs)(?::([A-Z]{1,3}-\d{1,5}))?$/.exec(location.hash || ""); return m ? { s: m[1], h: m[2] || null } : null; }
  function render() {
    var a = parse(); if (!a) { location.replace("#today"); return; }
    var chg = a.s !== cur || a.h !== curArg; cur = a.s; curArg = a.h;
    var html = cur === "today" ? today() : cur === "home" ? home(curArg) : cur === "record" ? record(curArg) : docsView();
    document.body.dataset.s = cur;
    app.innerHTML = html;
    document.title = TITLES[cur] + " · " + NAME + " — " + SUB;
    if (cur === "today") bindToday(); else if (cur === "home") bindHome(curArg); else if (cur === "record") bindRecord(curArg); else bindDocs();
    app.querySelectorAll('[data-act="account"]').forEach(function (b) { b.addEventListener("click", accountPanel); });
    if (chg) window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", function () { if (micRec) micRec.stop(); render(); });
  SY.on(function (what) {
    var ae = document.activeElement;
    if (ae && (ae.id === "memo" || ae.id === "refuseWhy" || ae.hasAttribute && ae.hasAttribute("data-fill"))) return; // 쓰는 중에는 다시 그리지 않는다
    if (micRec) return;
    if (what === "data" || what === "mode" || what === "sent") render();
  });
  setInterval(function () { if (cur === "record" && !micRec && !(document.activeElement && /^(memo|refuseWhy)$/.test(document.activeElement.id))) render(); }, 60000); // 안전 모드 분 표시
  window.DaeumApp = { days: days, statusOf: statusOf, docModel: docModel, render: render };
  render();
  SY.init();
})();
