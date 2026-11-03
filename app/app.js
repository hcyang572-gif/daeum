/* 복지 사각지대 현장 업무 도우미(닿음) — S12-d 1부 «단계 레일» 4화면 (⚙️ 파로, 2026-11-03)
   기준: 01_리서치/S12-a3_기능_정의서.md(§3·§5·§7·§8) · 시안 04_발표/S12-c_시안/daeum_S12c_시안.html B탭(D-077)
   화면: #today 오늘(P0, PC) · #home:가구 집 앞 요약(M2, 폰 ③) · #record:가구 상담 후 기록(M5, 폰 ⑥) · #docs 문서함(P2, PC ⑦)
   나머지 단계는 «준비 중» 대신 기존 화면으로 잇는다: ①순서 = officer #s4 · ②동선 = officer #s6 · 실적 = officer #s9 · ④⑤ = 기록 화면 «현장 확인·연계 후보».
   계산은 기존 순수 함수(DaeumFeatures·DaeumPriority·DaeumRoutePlan·DaeumOldHouse·DaeumNotify), 저장·PC↔폰 실시간은 DaeumSync(같은 계정 로그인, 코드·QR 없음).
   38b(11-03): ②상담일지 초안 = 규칙 기반 «자동 정리»(실제 AI 없음) · ③안전 모드 시간 초과 = 같은 계정 다른 화면 배너(DaeumSync.safety, 카카오·문자 없음)
     · 연계처 = 한국사회보장정보원 자원정보서비스 15001839 정적 스냅샷(data/resources.js, 키 없음 · 자료에 위치가 없어 지도 핀 대신 목록)
   ⛔ 넣지 않는 것: 주민 화면 · 신고 접수/명단 밖 가구 등록 · 위험 점수 · «오늘 줄인 시간» 띠 · .ics · 다크 화면. 용어: «한국사회보장정보원»(줄임 금지)·«근무일». */
(function () {
  "use strict";
  var F = window.DaeumFeatures, P = window.DaeumPriority, RP = window.DaeumRoutePlan, SY = window.DaeumSync, OH = window.DaeumOldHouse, NT = window.DaeumNotify;
  var U = F.util;
  var D = window.__DAEUM_HOUSEHOLDS__ || { households: [], meta: { office: { x: 0, y: 0 } }, indicators: [] };
  var AL = window.__DAEUM_ALERTS__ || null, RCP = window.__DAEUM_RECIPIENTS__ || null, RES = window.__DAEUM_RESOURCES__ || null;
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
  var LS_META = "daeum.s11.importMeta", LS_DL = "daeum.officer.deadline", LS_REC = "daeum.s12.rec", LS_SAFE = "daeum.s12.safety", LS_DOCS = "daeum.s12.docs", LS_FILL = "daeum.s12.fill", LS_SDEMO = "daeum.s12.safeDemo";

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
      groups.forEach(function (ids, i) {
        var mine = (lsGet("daeum.officer.dayOrder", {}) || {})[i + 1], auto = routeOrder(ids);
        var same = mine && mine.length === auto.length && auto.every(function (x) { return mine.indexOf(x) >= 0; });
        out.push({ n: i + 1, date: dp.go && dp.go[i] ? dp.go[i] : ymd(U.addWorkdays(new Date(), i + 1)), ids: same ? mine : auto, rows: null, confirmed: false });
      });
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
    else if (m === "offline") { txt = "끊김 · 이 기기에 임시 저장"; off = true; }
    else { off = true; txt = s.why === "no-table" ? "이 기기에 저장 · 서버 준비 전" : "이 기기에 저장 · 로그인하면 연동"; }
    return '<button class="sync' + (off ? " off" : "") + '" data-act="account" title="같은 공무원 계정으로 로그인한 PC와 폰이 같은 계획·기록을 봅니다"><i></i>' + esc(txt) + (s.pending ? " · 보낼 것 " + s.pending : "") + "</button>";
  }
  function brand() { return '<a class="word" href="#today" aria-label="' + NAME + ' 오늘로"><i aria-hidden="true"></i><span><b class="bn"><span>복지 사각지대</span> <span>현장 업무 도우미</span></b><small>' + SUB + "</small></span></a>"; }
  function top(on, dayHtml) {
    // 🩵 미르 40: PC=좌측 메뉴열 · 폰=하단 탭바(같은 nav 하나를 CSS로 옮김). 아이콘은 선 그림(이모지 아님)
    var tabs = [["오늘", "#today", "today", '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.7" fill="currentColor" stroke="none"/>'],
      ["방문 계획", "#plan", "plan", '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>'],
      ["문서함", "#docs", "docs", '<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'],
      ["실적", "#perf", "perf", '<path d="M4 20h16"/><rect x="5.5" y="11" width="3.4" height="6" rx="1"/><rect x="10.3" y="6" width="3.4" height="11" rx="1"/><rect x="15.1" y="13" width="3.4" height="4" rx="1"/>']];
    return '<header class="top"><div class="top-in">' + brand() + '<nav class="seg well tabs" aria-label="메뉴">' + tabs.map(function (t) { return '<a href="' + t[1] + '"' + (t[2] === on ? ' class="on" aria-current="page"' : "") + '><svg class="ti" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + t[3] + "</svg><span>" + t[0] + "</span></a>"; }).join("") + "</nav>" + sideSteps() +
      '<div class="day">' + (dayHtml || "") + "</div>" + syncChip() + '<a class="hlp' + (on === "help" ? " on" : "") + '" href="#help">사용 방법</a></div></header>';
  }

  // ═════ P0 오늘 ═════
  var STN = [["순서", "명단 43열"], ["동선", "명단 우선방문 열"], ["요약", "급여 열·15090532"], ["확인", "명단 위기정보"], ["상담", "서비스 원문 15090532"], ["기록", "서비스 목록 15108347"], ["보고", "수급권자 15062448"]];
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
    var rail = '<div class="rail" id="rail"><div class="track"><i></i></div>' + STN.map(function (s, i) { return '<a class="st' + (i === 6 ? " last" : "") + '" href="' + stationHref(i, hid0) + '"><span class="c">' + (i + 1) + '</span><span class="l">' + s[0] + '</span><span class="p">' + s[1].replace(/·/g, "·|").replace(/ (\d{6,})$/, " |$1").split("|").map(function (x) { return '<span class="pp">' + x + "</span>"; }).join("<wbr>") + "</span></a>"; }).join("") + "</div>";
    var html = top("today", "<strong>" + md(now) + "</strong>" + esc(area) + " 맞춤형복지 담당 · 가상") + '<main class="wrap">' +
      '<div class="hero"><div><h1>나가기 전부터<br><span>보고서까지,</span> 한 번에</h1><p>한국사회보장정보원 명단을 받은 날부터 방문·기록·보고까지 같은 내용을 두 번 쓰지 않습니다.</p></div>' +
      '<a class="cta" href="' + (first ? "#home:" + first : "#docs") + '"><b>' + (first ? (c.isToday ? "오늘 일 시작" : whenLbl + " 방문 준비") : "문서 만들기") + "</b><small>방문 " + c.planned.length + "곳 · 문서 " + pend + "건 대기</small></a></div>" +
      '<section class="scene well" id="scene" aria-label="데이터 → 기능 → 목표"><canvas id="cv" aria-hidden="true"></canvas>' +
      '<div class="col"><h2><em>데이터</em>한국사회보장정보원</h2><div class="chips">' +
      '<div class="chip blk" data-feeds="0,2,3,6"><b>발굴대상자 명단 43열</b><small>행복이음 내려받기 서식</small></div>' +
      '<div class="chip blk" data-feeds="2,3,4,5"><b>복지서비스 OpenAPI</b><small>15090532 · 15108347</small></div>' +
      '<div class="chip blk" data-feeds="1,4"><b>자원정보서비스 · 연계처</b><small>15001839 연동 · 상주 ' + (RES ? RES.facilities.length + "곳 " + RES.total + "건" : "—") + "</small></div>" +
      '<div class="chip blk" data-feeds="6"><b>수급권자 현황</b><small>15062448</small></div></div></div>' +
      '<div class="col"><h2><em>기능</em>하루 7단계가 앞 결과를 이어 받음</h2>' + rail + "</div>" +
      '<div class="col"><h2><em>목표</em>두 번 쓰지 않는 보고서</h2>' + fan + "</div></section>" +
      '<div class="board"><div class="rows blk"><div class="rows-h"><span>' + esc(whenLbl) + " 방문 · " + c.d.ids.length + "곳" + (c.d.confirmed ? " · 확정" : " · 자동 배정안") + '</span><span>출발 상주시청 · ' + esc(c.d.s.end || "") + " 복귀</span></div>" + rows + "</div>" +
      '<div class="side">' + dead + '<div class="links blk"><h3>이어지는 화면</h3><a href="#plan">방문 계획<span>일차·순서 바꾸기</span></a><a href="#route' + (hid0 ? ":" + hid0 : "") + '">동선·길안내<span>네이버 지도</span></a><a href="#perf">실적·사후관리<span>재방문·약속</span></a><a href="' + OFF + '#s1">명단 불러오기<span>엑셀 43열</span></a></div></div></div>' +
      '<p class="foot"><span class="demo-tag">가상 데이터</span><span>가구 번호·나이·사유·메모는 모두 시연용 가상 · 실제 개인정보 없음</span><a href="#help">사용 방법</a><a href="shared/data.html">활용 데이터</a><a href="?demo=reset#today">시연 처음 상태로</a></p></main>';
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
        if (si === "") return; var s = sts[+si]; if (!s) return; var c = s.querySelector(".c").getBoundingClientRect();
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
  function phBrand() { return '<div class="ph-brand"><a href="#today" class="ph-home">' + NAME + "<small>" + SUB + '</small></a><span class="sp">' + syncChip() + '</span><a class="hlp q" href="#help" aria-label="사용 방법">?</a></div>'; }
  function mini(now, hid) {
    return '<nav class="mini well" aria-label="7단계">' + STN.map(function (s, i) { var cls = i < now ? "on" : i === now ? "now" : ""; return '<a class="' + cls + '" href="' + stationHref(i, hid) + '"' + (i === now ? ' aria-current="step"' : "") + ">" + s[0] + "</a>"; }).join("") + "</nav>";
  }
  function bnav(on, hid) {
    var x = hid ? ":" + hid : "", it = [["동선", "#route" + x, "route"], ["집 앞", "#home" + x, "home"], ["확인", "#check" + x, "check"], ["상담", "#talk" + x, "talk"], ["기록", "#record" + x, "record"]];
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
    var sign = notes.length + (L && L.tags ? L.tags.filter(isField).length : 0);
    var prev = c.d.ids[i - 1], next = c.d.ids[i + 1];
    return '<main class="ph">' + phBrand() + mini(2, hid) +
      '<section class="idc blk" aria-label="가구"><span class="num">' + hid + '</span><span class="who">' + esc(h.area + " · " + ageLine(h) + " 사심 · 발굴 " + (+m.cnt || 1) + "회째") + '</span><span class="rk well">한국사회보장정보원<br>발굴 순위<b>' + esc(lr) + "</b></span>" +
      '<span class="eta">' + (eta ? "도착 예정 <b>" + esc(eta) + "</b> · " : "") + c.d.ids.length + "곳 중 <b>" + (i + 1) + "번째</b>" + (c.isToday ? "" : " · " + (c.d.date ? md(c.d.date) : "")) + "</span></section>" +
      '<ul class="stops blk">' + lines.slice(0, 5).map(function (x, n) { return '<li class="' + (x.warn ? "warn" : "") + '"><i>' + (x.warn ? "!" : n + 1) + '</i><div><span class="lb">' + esc(x.lb) + "</span>" + esc(x.t) + (x.plug.length ? "<br>" + x.plug.map(function (p) { return '<span class="plug">' + esc(p) + "</span>"; }).join("") : "") + "</div></li>"; }).join("") + "</ul>" +
      '<section class="basis well" aria-label="판단 근거 카드"><div class="ttl"><span>판단 근거 카드</span><span>점수 없음 · 판단은 담당자</span></div><div><b>' + reasons.length + "</b>명단 사유</div><div><b>" + (+m.cnt || 1) + "</b>발굴 횟수</div><div><b>" + (sign || "?") + "</b>현장 징후</div>" +
      "<p>현장 징후는 집 안에서 «기록»의 체크로 채웁니다. 명단 사유 밖 징후는 보고서에 따로 셉니다.</p></section>" +
      '<button class="big" type="button" data-act="enter">들어가기 <small>안전 모드 ' + A.safetyMin + "분</small></button>" +
      '<div class="subnav">' + (prev ? '<a href="#home:' + prev + '">← 앞 집 ' + prev + "</a>" : "<span></span>") + '<a href="#route:' + hid + '">동선·길안내</a>' + (next ? '<a href="#home:' + next + '">다음 집 ' + next + " →</a>" : "<span></span>") + "</div>" +
      "</main>" + bnav("home", hid);
  }
  function bindHome(want) {
    var k = pickHid(want); if (!k) return;
    var b = app.querySelector('[data-act="enter"]'); if (b) b.addEventListener("click", function () { vib(); var sf = { id: "SF-" + k.hid + "-" + Date.now(), hid: k.hid, at: new Date().toISOString(), min: A.safetyMin }; lsSet(LS_SAFE, sf); safePush(sf, "on"); location.hash = "#check:" + k.hid; });
  }

  // ═════ 안전 모드(④⑤⑥ 공통) — «들어가기»부터 확정까지 ═════
  // 38b ③: 예정 시간을 넘기면 같은 계정의 다른 화면(사무실 PC 등)·같은 브라우저 다른 창에 배너. 「안부 확인 완료」로 양쪽 모두 해제.
  function elMin(at) { return Math.max(0, Math.round((new Date() - new Date(at)) / 60000)); }
  function devName() { return window.matchMedia && matchMedia("(max-width: 760px)").matches ? "폰" : "PC"; }
  function safePush(sf, state) { if (!SY.safety) return; SY.safety.send({ id: sf.id || "SF-" + sf.hid, hid: sf.hid, area: (BY[sf.hid] || {}).area || "", at: sf.at, min: sf.min, state: state, by: devName() }); }
  function safeBanner(hid) {
    var sf = lsGet(LS_SAFE, null); if (!sf || sf.hid !== hid) return "";
    var el = elMin(sf.at), lim = sf.min || A.safetyMin;
    return el >= lim ? '<div class="safe well late" role="alert"><i></i><span><b>' + lim + "분 지났습니다 · 괜찮으세요?</b><small>같은 계정 사무실 화면에도 알림이 떠 있습니다</small></span><button type=\"button\" data-act=\"safeok\">안부 확인 완료 · 20분 더</button></div>"
      : '<div class="safe well"><i></i><span>안전 모드 <b>' + el + "분째</b> · " + lim + "분이 지나면 괜찮은지 묻고 사무실 화면에도 알립니다</span></div>";
  }
  function bindSafe() { var ok = app.querySelector('[data-act="safeok"]'); if (ok) ok.addEventListener("click", function () { var sf = lsGet(LS_SAFE, null); if (sf) { sf.min = Math.max(sf.min || A.safetyMin, elMin(sf.at)) + 20; lsSet(LS_SAFE, sf); safePush(sf, "ok"); toast("안부 확인 완료 · 사무실 화면 알림도 해제"); } render(); }); }
  /** 다른 화면에서 «안부 확인 완료»·확정이 오면 이 기기 안전 모드도 맞춘다 */
  function safeAdopt() {
    var sf = lsGet(LS_SAFE, null); if (!sf || !SY.safety) return;
    var a = SY.safety.list()[sf.id]; if (!a) return;
    if (a.state === "end") { try { localStorage.removeItem(LS_SAFE); } catch (e) { /* 무시 */ } }
    else if (a.min !== sf.min) { sf.min = a.min; lsSet(LS_SAFE, sf); }
  }
  /** 화면 맨 위 알림 줄 — 시간을 넘긴 안전 모드 + PC 첫 화면의 시연 알림(동료, 가상) */
  function safeAlerts() {
    var own = lsGet(LS_SAFE, null), all = SY.safety ? SY.safety.list() : {}, out = [];
    Object.keys(all).forEach(function (k) {
      var a = all[k]; if (a.state === "end") return;
      var el = elMin(a.at), late = el >= a.min;
      if (own && own.id === a.id && /^(check|talk|record)$/.test(cur) && curArg === a.hid) return; // 그 집 화면엔 이미 띠가 있다
      if (late || /^(today|perf|plan)$/.test(cur)) out.push({ id: a.id, hid: a.hid, area: a.area, el: el, min: a.min, late: late, who: a.by === "폰" ? "현장 폰" : own && own.id === a.id ? "이 기기" : "같은 계정 " + (a.by || "화면") });
    });
    if (cur === "today" && lsGet(LS_SDEMO, "") !== ymd(new Date())) {
      var dh = D.households[D.households.length - 1];
      if (dh) out.push({ id: "DEMO", hid: dh.id, area: dh.area, el: 52, min: A.safetyMin, late: true, who: "동료 박주무관(시연·가상)" });
    }
    return out;
  }
  function alertBar() {
    var L = safeAlerts();
    if (!L.length) return cur === "today" ? '<div class="sfa calm" role="status"><i></i><span>안전 모드 알림 없음 · 방문 중 예정 시간을 넘기면 여기에 뜹니다</span><button type="button" class="lnk" data-sfdemo="1">시연 알림 다시 보기</button></div>' : "";
    return L.map(function (a) {
      return a.late ? '<div class="sfa" role="alert" data-sfid="' + esc(a.id) + '"><i></i><div><b>' + esc(a.who) + " · 가구 " + esc(a.hid) + " " + esc(a.area) + ' 방문 <span data-sfel>' + a.el + "</span>분째</b><span>예정 " + a.min + "분을 넘겼습니다 · 전화로 안부를 확인한 뒤 눌러 주세요</span></div>" +
        '<button type="button" data-sfack="' + esc(a.id) + '">안부 확인 완료</button></div>'
        : '<div class="sfa calm" role="status"><i></i><span>' + esc(a.who) + " · 가구 " + esc(a.hid) + " 방문 중 <b>" + a.el + "분째</b> · 예정 " + a.min + "분</span></div>";
    }).join("");
  }
  function bindAlerts() {
    app.querySelectorAll("[data-sfack]").forEach(function (b) { b.addEventListener("click", function () {
      vib(); var id = b.dataset.sfack;
      if (id === "DEMO") lsSet(LS_SDEMO, ymd(new Date()));
      else { var a = SY.safety.list()[id]; if (a) safePush({ id: a.id, hid: a.hid, at: a.at, min: elMin(a.at) + 20 }, "ok"); safeAdopt(); }
      toast("안부 확인 완료 · 현장 폰 알림도 해제했습니다"); render();
    }); });
    var d = app.querySelector("[data-sfdemo]"); if (d) d.addEventListener("click", function () { try { localStorage.removeItem(LS_SDEMO); } catch (e) { /* 무시 */ } render(); });
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
  var TYPE_COL = { "주거": "#2F6FB1", "생계": "#B7791F", "건강": "#C62F3A", "고립": "#6B5BA8", "돌봄": "#0C8767", "공통": "#586273" };
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
    var crit = absent ? "" : '<div class="crit well"><b>소득·재산 기준은 여기서 판정하지 않습니다</b>선정기준 원문(한국사회보장정보원 복지서비스 15090532·15108347)은 «상담» 화면에 요약해 두었습니다 · 판정은 담당 확인</div>';
    return '<main class="ph">' + phBrand() + mini(3, hid) + safeBanner(hid) +
      '<section class="ck-head blk"><div><span class="num">' + hid + '</span><span class="who">' + esc(h.area + " · " + ageLine(h)) + '</span></div><svg class="ck-ring" viewBox="0 0 56 56" aria-label="확인 ' + doneN + "/" + L.length + '"><circle cx="28" cy="28" r="22" fill="none" stroke="#E1E5EB" stroke-width="7"/><circle cx="28" cy="28" r="22" fill="none" stroke="var(--go)" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 28 28)"/><text x="28" y="33" text-anchor="middle" font-size="15" font-weight="900" fill="#111A27">' + doneN + "/" + L.length + "</text></svg></section>" +
      '<div class="switch well" role="radiogroup" aria-label="어디서 확인하나요"><button type="button" role="radio" data-place="met" aria-checked="' + !absent + '">집 안에서</button><button type="button" role="radio" data-place="absent" aria-checked="' + absent + '">문 앞(부재)</button></div>' +
      '<ul class="cks blk">' + rows + "</ul>" +
      '<section class="vs well" aria-label="판단 근거 카드"><div><b>' + reasons.length + '</b><span>명단 사유</span><i style="width:' + Math.min(100, reasons.length * 20) + '%"></i></div><div class="nw"><b>' + badN + '</b><span>현장에서 더 본 징후</span><i style="width:' + Math.min(100, badN * 20) + '%"></i></div><p>점수 없음 · 판단은 담당자 · 현장 징후는 기록과 보고서에 그대로 들어갑니다</p></section>' + crit +
      (absent ? '<a class="big dark" href="#record:' + hid + '">부재로 기록하기 <small>다음 시도 시간대 자동</small></a>'
        : '<a class="big" href="#talk:' + hid + '">상담 시작 <small>질문 ' + Math.min(5, questionsFor(hid, o).length) + "개 · 서비스 " + svcFor(h, badTypes(hid, o)).length + "개 준비됨</small></a>") +
      '<div class="subnav"><a href="#home:' + hid + '">← 집 앞 요약</a><span>체크는 기록 화면에 미리 채워집니다</span></div></main>' + bnav("check", hid);
  }
  function bindCheck(want) {
    var k = pickHid(want); if (!k) return;
    var hid = k.hid, o = recOf(hid); o.checks = o.checks || {};
    app.querySelectorAll("[data-place]").forEach(function (b) { b.addEventListener("click", function () { o.res = b.dataset.place; vib(); saveRec(hid, o); render(); }); });
    app.querySelectorAll("[data-ck]").forEach(function (b) { b.addEventListener("click", function () {
      var c = checkList(BY[hid], o.res === "absent").filter(function (x) { return x.k === b.dataset.ck; })[0]; if (!c) return;
      var v = o.checks[c.k] === b.dataset.v ? "" : b.dataset.v; o.checks[c.k] = v;
      o.signs = o.signs || {}; if (v === "bad") o.signs[c.sign] = true; else if (o.signs[c.sign] && signsFor(BY[hid]).indexOf(c.sign) < 0) delete o.signs[c.sign];
      vib(); saveRec(hid, o); render();
    }); });
    bindSafe();
  }

  // ═════ M4 상담 도움(⑤) — 질문 순서 카드 + 받을 수 있는 서비스 원문 요약(판정 아님) ═════
  var SVDB = null, svP = null;
  function needSvc() {
    if (SVDB) return Promise.resolve(SVDB);
    if (!svP) svP = new Promise(function (ok, no) { if (window.__DAEUM_SERVICES__) return ok(); var s = document.createElement("script"); s.src = "data/services.js"; s.onload = ok; s.onerror = no; document.head.appendChild(s); })
      .then(function () { SVDB = {}; ((window.__DAEUM_SERVICES__ || {}).services || []).forEach(function (x) { SVDB[x.id.replace(/^D\d-/, "")] = x; }); return SVDB; });
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
        : loaded ? '<p class="mute">원문 자료에 이 서비스가 없습니다 · 복지로에서 확인</p>' : '<p class="mute">원문 요약 불러오는 중…</p>';
      return '<article class="svc' + (on ? " on" : "") + '"><header><b>' + esc(s[1]) + '</b><span class="plug">' + s[2] + '</span></header>' + body +
        '<button type="button" class="svc-t" data-svc="' + s[0] + '" aria-pressed="' + on + '">' + (on ? "✓ 연계 후보로 넣음" : "연계 후보로 넣기") + "</button></article>";
    }).join("");
    return '<main class="ph">' + phBrand() + mini(4, hid) + safeBanner(hid) +
      '<div class="idc blk" style="padding:10px 14px"><span class="num" style="font-size:26px">' + hid + '</span><span class="who">' + esc(h.area + " · " + ageLine(h)) + " · 상담 중</span></div>" +
      '<section class="qwrap" aria-label="질문 순서 카드"><div class="qh"><span>질문 순서</span><span>현장 확인에서 고른 것부터</span></div><div class="deck">' + deck + "</div>" + dots +
      (qi < Q.length ? '<div class="qbtn"><button type="button" class="sbtn" data-act="qskip">넘기기</button><button type="button" class="sbtn go" data-act="qok">물어봤어요 →</button></div>' : "") + "</section>" +
      '<section aria-label="받을 수 있는 서비스"><div class="qh"><span>받을 수 있는 서비스 · 원문 요약</span><span>선정 결정 아님</span></div><div class="svcs">' + cards + "</div>" +
      '<p class="srcline">출처: 한국사회보장정보원 중앙부처복지서비스(15090532)·지자체복지서비스(15108347) 공공데이터 2026-11-02 수집본 · 판정은 담당 공무원</p></section>' +
      '<a class="big" href="#record:' + hid + '">상담 끝 · 기록하기 <small>고른 것 ' + Object.keys(o.svcs || {}).filter(function (x) { return o.svcs[x]; }).length + "개 미리 채움</small></a>" +
      '<div class="subnav"><a href="#check:' + hid + '">← 현장 확인</a><span>질문·서비스는 상담일지에 그대로</span></div></main>' + bnav("talk", hid);
  }
  function bindTalk(want) {
    var k = pickHid(want); if (!k) return;
    var hid = k.hid, o = recOf(hid), Q = questionsFor(hid, o);
    if (!SVDB) needSvc().then(function () { if (cur === "talk") render(); }, function () { /* 원문 없이도 이름은 보임 */ });
    function step(mark) {
      var i = qIdx[hid] || 0, q = Q[i];
      if (mark && q) { var all = F.store.get("askChecked", {}) || {}, m = all[hid] || {}; m[q.key] = true; all[hid] = m; F.store.set("askChecked", all); }
      qIdx[hid] = i + 1; vib(); render();
    }
    var ok = app.querySelector('[data-act="qok"]'); if (ok) ok.addEventListener("click", function () { step(true); });
    var sk = app.querySelector('[data-act="qskip"]'); if (sk) sk.addEventListener("click", function () { step(false); });
    var re = app.querySelector('[data-act="qre"]'); if (re) re.addEventListener("click", function () { qIdx[hid] = 0; render(); });
    app.querySelectorAll("[data-svc]").forEach(function (b) { b.addEventListener("click", function () { o.svcs = o.svcs || {}; o.svcs[b.dataset.svc] = !o.svcs[b.dataset.svc]; vib(); saveRec(hid, o); render(); }); });
    bindSafe();
  }

  // ═════ M5 상담 후 기록(⑥) — ④ 현장 확인·⑤ 연계 후보가 미리 채워짐 ═════
  function recOf(hid) {
    var all = lsGet(LS_REC, {}) || {}, o = all[hid];
    if (!o) {
      var h = BY[hid], sg = {}, sv = {};
      signsFor(h).forEach(function (s) { sg[s] = true; });
      svcFor(h).slice(0, 2).forEach(function (s) { sv[s[0]] = true; });
      o = { res: "met", signs: sg, svcs: sv, checks: {}, memo: "", refuse: "", at: new Date().toISOString() };
    }
    return o;
  }
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
  function record(want) {
    var k = pickHid(want); if (!k) return phEmpty();
    var c = k.c, hid = k.hid, h = BY[hid], o = recOf(hid), now = new Date();
    var safe = safeBanner(hid);
    var sg = uniq(signsFor(h).concat(chosenSigns(o))), extra = FIELD_SIGNS.filter(function (s) { return sg.indexOf(s) < 0; });
    var sv = svcFor(h, badTypes(hid, o)), dr = recDraft(hid, o), filled = dr.sg.length + dr.sv.length;
    var nextId = c.d.ids.filter(function (id) { return id !== hid && statusOf(id) === "planned"; })[0];
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var met = '<section class="pre blk"><div class="ttl"><span>이미 채워진 칸</span><b>' + filled + "칸 · 다시 안 써도 됨</b></div>" +
      '<div class="grp">현장 확인에서 고른 징후 · 명단 위기정보(아니면 눌러 빼기)</div><div class="tok">' + sg.concat(extra).map(function (s) { return '<button type="button" data-sign="' + esc(s) + '" aria-pressed="' + !!o.signs[s] + '">' + esc(s) + "</button>"; }).join("") + "</div>" +
      '<div class="grp">연계 후보 · 한국사회보장정보원 복지서비스</div><div class="tok">' + sv.map(function (s) { return '<button type="button" class="s" data-svc="' + s[0] + '" aria-pressed="' + !!o.svcs[s[0]] + '">' + esc(s[1]) + "<small>" + s[2] + "</small></button>"; }).join("") + "</div></section>" +
      '<div class="micw"><button type="button" class="mic" data-act="mic" aria-label="1분 말하기"' + (SR ? "" : " disabled") + '><svg class="ring" viewBox="0 0 112 112" aria-hidden="true"><circle cx="56" cy="56" r="52" fill="none" stroke="#E1E5EB" stroke-width="6"/><circle id="ring" cx="56" cy="56" r="52" fill="none" stroke="#0C8767" stroke-width="6" stroke-linecap="round" stroke-dasharray="327" stroke-dashoffset="327" transform="rotate(-90 56 56)"/></svg><svg width="26" height="32" viewBox="0 0 18 22" aria-hidden="true"><rect x="5" y="1" width="8" height="13" rx="4" fill="#fff"/><path d="M2 10a7 7 0 0 0 14 0M9 17v4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>' +
      '<div class="tx"><b id="mict">0:00 / 1:00</b>' + (SR ? "말로 1분이면 됩니다. 음성 원본은 남기지 않고 받아쓴 글만 씁니다." : "이 브라우저는 받아쓰기를 지원하지 않습니다 · 아래에 글로 남겨 주세요.") + "</div></div>" +
      '<label class="sr" for="memo">상담 내용</label><textarea id="memo" class="memo" rows="3" placeholder="만난 내용을 짧게(이름·주소·연락처는 적지 마세요)">' + esc(o.memo) + "</textarea>" +
      '<section class="draft blk" aria-live="polite"><div class="ttl">상담일지 초안<span>자동 정리 · 담당자 확인 전</span></div>' +
      "<p><b>상황</b><span>" + (dr.issue ? markWords(dr.issue) : '<span class="empty">말하거나 체크하면 채워짐</span>') + "</span></p><p><b>욕구</b><span>" + esc(dr.need || "—") + "</span></p>" +
      "<p><b>연계</b><span>" + (dr.sv.length ? esc(dr.sv.map(function (s) { return s[1]; }).join(", ")) + " 신청 안내" : '<span class="empty">연계 후보를 고르면 채워짐</span>') + '</span></p><p><b>다음</b><span class="rule">' + esc(dr.next) + "</span></p>" +
      '<small class="dnote">체크·말한 내용·연계 후보를 정해진 규칙으로 옮긴 것입니다 · 위 칸을 고치면 다시 정리됩니다</small></section>';
    var att = attempts().filter(function (t) { return t.householdId === hid && /no_answer|absent/.test(t.result); }).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var n = att.length + 1, vt = F.visitTime.profile(attempts(), hid, { neighborLog: neighborLog() });
    var a3 = n >= 3 ? F.visitTime.afterThree(attempts().concat([{ householdId: hid, channel: "visit", result: "no_answer", at: now.toISOString() }]), hid, { area: h.area, neighborLog: neighborLog() }) : null;
    var absent = '<section class="absent blk"><b class="h">이번이 ' + (n >= 3 ? "세 번째 이상" : n === 2 ? "두 번째" : "첫") + " 부재입니다</b>" +
      '<div class="tries">' + att.slice(-2).map(function (t) { return "<span>" + esc(mdDot(t.at) + " " + hm(t.at)) + " 부재</span>"; }).join("") + "<span>지금 " + hm(now) + " 부재</span></div>" +
      "다음 시도: <b>" + esc(md(U.addWorkdays(now, A.retryGap))) + (vt.best ? " " + esc(vt.best.label + "(" + vt.best.hours + ")") : "") + "</b> · 근무일 " + A.retryGap + "일 뒤(가정) · 확정하면 방문 계획의 재시도에 들어갑니다." +
      (a3 ? '<div class="msg">' + esc(a3.steps[0].text) + '</div><div style="margin-top:8px"><button type="button" class="sbtn" data-act="copytong">통·이장 협조 문안 복사</button></div>' : "") +
      '<div class="grp" style="margin-top:10px;font-size:11px;font-weight:800;color:var(--mute)">문 앞에서 본 것</div><div class="tok">' + uniq(chosenSigns(o).concat(["우편물 쌓임", "불 꺼져 있음", "이웃이 최근 봄", "인기척 없음"])).map(function (s) { return '<button type="button" data-sign="' + s + '" aria-pressed="' + !!o.signs[s] + '">' + s + "</button>"; }).join("") + "</div></section>";
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
    bindSafe();
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
    var sf = lsGet(LS_SAFE, null); if (sf && sf.hid === hid) { safePush(sf, "end"); try { localStorage.removeItem(LS_SAFE); } catch (e) { /* 무시 */ } }
    var nx = c.d.ids.filter(function (id) { return id !== hid && statusOf(id) === "planned"; })[0];
    toast("확정했습니다 · " + (SY.state().mode === "live" ? "사무실 PC 문서함에 반영됨" : "이 기기에 저장"));
    location.hash = nx ? "#route:" + nx : "#docs";
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
        '<polyline class="rt" pathLength="1" points="' + pl + '" fill="none" stroke="#0C8767" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>';
      d.ids.forEach(function (id, i) {
        var p = BY[id], dn = done.indexOf(id) >= 0, nx = id === o.next, r = nx ? 17 : 13;
        g += '<g filter="url(#' + o.id + 'sh)"><title>' + (i + 1) + "번째 " + id + " · " + esc(p.area) + "</title>" +
          '<circle cx="' + X(p) + '" cy="' + Y(p) + '" r="' + r + '" fill="' + (nx ? "#E0581F" : dn ? "#D7F0E8" : "#fff") + '" stroke="' + (nx ? "#A93C10" : dn ? "#0C8767" : "#1C2839") + '" stroke-width="3.5"/>' +
          '<text x="' + X(p) + '" y="' + (+Y(p) + (nx ? 6 : 4.5)).toFixed(1) + '" text-anchor="middle" font-size="' + (nx ? 16 : 13) + '" font-weight="900" fill="' + (nx ? "#fff" : dn ? "#075B45" : "#111A27") + '">' + (dn ? "✓" : i + 1) + "</text></g>";
        if (nx || o.labels) g += '<text x="' + X(p) + '" y="' + (+Y(p) - r - 6).toFixed(1) + '" text-anchor="middle" font-size="11.5" font-weight="800" fill="#111A27" paint-order="stroke" stroke="#fff" stroke-width="4" font-family="IBM Plex Mono,monospace">' + id + "</text>";
      });
    });
    g += '<g filter="url(#' + o.id + 'sh)"><rect x="' + (+X(off) - 15) + '" y="' + (+Y(off) - 15) + '" width="30" height="30" rx="8" fill="#1C2839"/><text x="' + X(off) + '" y="' + (+Y(off) + 5) + '" text-anchor="middle" font-size="14" font-weight="900" fill="#fff">시</text></g>' +
      '<text x="' + X(off) + '" y="' + (+Y(off) + 30) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#586273" paint-order="stroke" stroke="#fff" stroke-width="4">상주시청</text>';
    var km = k >= 60 ? 1 : k >= 25 ? 2 : 5, bar = '<g transform="translate(' + 18 + "," + (H0 - 20) + ')"><rect width="' + (km * k).toFixed(1) + '" height="6" rx="3" fill="#1C2839"/><text y="-6" font-size="11" font-weight="800" fill="#586273">' + km + "km</text></g>" +
      '<g transform="translate(' + (W0 - 30) + ',26)"><path d="M0 -14 L7 6 L0 2 L-7 6 Z" fill="#1C2839"/><text y="20" text-anchor="middle" font-size="10.5" font-weight="800" fill="#586273">북</text></g>';
    return '<svg class="mp" viewBox="0 0 ' + W0 + " " + H0 + '" role="img" aria-label="' + esc(o.label || "방문 순서 지도") + '"><defs><radialGradient id="' + o.id + 'bg" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#F7F9FA"/><stop offset="1" stop-color="#DDE3E9"/></radialGradient>' +
      '<filter id="' + o.id + 'sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2.5" stdDeviation="2" flood-color="#111A27" flood-opacity=".3"/></filter></defs>' +
      '<rect width="' + W0 + '" height="' + H0 + '" rx="18" fill="url(#' + o.id + 'bg)"/>' + g + bar + "</svg>";
  }

  // ═════ P1 방문 계획(①) — 한국사회보장정보원 순위 + 동선으로 일차를 나누고 순서를 정해 확정 ═════
  var planDay = null;
  function at(date, hhmm) { var d = new Date((date || ymd(new Date())) + "T00:00:00"), m = /^(\d+):(\d+)$/.exec(hhmm || "09:30"); d.setHours(+m[1], +m[2], 0, 0); return d.toISOString(); }
  function stTag(st) { return st === "done" ? '<span class="tg ok">만남</span>' : st === "absent" ? '<span class="tg ab">부재</span>' : st === "refused" ? '<span class="tg rf">거절</span>' : ""; }
  function planView() {
    var ds = days(), dl = deadline(), p = plan();
    if (!ds.length) return top("plan", "<strong>방문 계획</strong>가상 데이터") + '<main class="wrap"><div class="emptyc blk"><b>명단이 아직 없습니다</b>한국사회보장정보원 발굴대상자 명단(행복이음 내려받기 43열)을 불러오면 일차가 자동으로 나뉩니다.<br><br><a class="cta" href="' + OFF + '#s1"><b>명단 불러오기</b><small>엑셀 43열</small></a></div></main>';
    if (!planDay || !ds.some(function (d) { return d.n === planDay; })) { var fd = fieldDay(ds); planDay = fd ? fd.n : ds[0].n; }
    var D4 = ds.filter(function (d) { return d.n === planDay; })[0], rb = rankBy(), mt = meta(), total = ds.reduce(function (a, d) { return a + d.ids.length; }, 0);
    var cards = ds.map(function (d) {
      var st = d.ids.map(statusOf), dn = st.filter(function (x) { return x !== "planned"; }).length;
      return '<button type="button" class="dcard' + (d.n === planDay ? " on" : "") + '" data-day="' + d.n + '"><span class="dn">' + d.n + '<small>일차</small></span><span class="dd">' + (d.date ? md(d.date) : "날짜 미정") + '</span><span class="dm"><b>' + d.ids.length + "</b>집 · " + d.s.km + "km 약 · " + d.s.end + ' 복귀</span><span class="dp" aria-hidden="true">' + d.ids.map(function (id) { var s = statusOf(id); return '<i class="' + (s === "planned" ? "" : s === "done" ? "ok" : "ab") + '"></i>'; }).join("") + "</span>" + (dn ? '<span class="dk">' + dn + "/" + d.ids.length + " 끝</span>" : "") + "</button>";
    }).join("");
    var ow = RP.overWork(D4.s), tl = '<li class="tp"><span class="t">09:30</span><span class="ax"><b class="o">시</b></span><span class="c">상주시청 출발</span></li>';
    D4.ids.forEach(function (id, i) {
      var row = D4.s.rows[i], h = BY[id], r = rb[id], m = mt[id] || {}, st = statusOf(id), pr = p && p.rows.filter(function (x) { return x.household_no === id; })[0];
      var lr = pr && pr.list_rank != null ? pr.list_rank : r ? r.listRank : m.prio || "—";
      if (row.lunchBefore) tl += '<li class="lunch"><span></span><span class="ax"></span><span class="c">12:00–13:00 점심</span></li>';
      tl += '<li class="leg"><span></span><span class="ax"></span><span class="c">차로 ' + row.travelMin + "분 · " + row.km + "km 약</span></li>" +
        '<li class="stop' + (st !== "planned" ? " dn" : "") + '"><span class="t">' + row.arrive + "<small>~" + row.leave + '</small></span><span class="ax"><b>' + (i + 1) + '</b></span><div class="c"><div class="nm"><b>' + id + "</b>" + esc(h.area + " · " + ageLine(h)) + stTag(st) + '</div><div class="why"><span class="rk">한국사회보장정보원 ' + esc(lr) + "순위</span>" + esc(clip(indText(h).join(" · "), 40)) + "</div></div>" +
        '<div class="mv"><button type="button" data-mv="' + i + ':-1" aria-label="' + id + ' 앞으로"' + (i ? "" : " disabled") + '>▲</button><button type="button" data-mv="' + i + ':1" aria-label="' + id + ' 뒤로"' + (i < D4.ids.length - 1 ? "" : " disabled") + ">▼</button></div></li>";
    });
    tl += '<li class="tp"><span class="t">' + (D4.s.back ? D4.s.back.arrive : D4.s.end) + '</span><span class="ax"><b class="o">시</b></span><span class="c">복귀 · 이동 ' + D4.s.travelMin + "분 · 상담 " + D4.s.consultMin + "분</span></li>";
    var dp = dl.until ? F.deadline.plan(listIds().filter(function (id) { var s = statusOf(id); return s !== "done" && s !== "refused"; }).length, dl.until, dl.perDay || 5) : null;
    var per = [3, 4, 5, 6, 7, 8].map(function (n) { return '<option value="' + n + '"' + (n === (dl.perDay || 5) ? " selected" : "") + ">하루 " + n + "집</option>"; }).join("");
    var sync = SY.state();
    var conf = p ? '<div class="conf ok"><b>확정됨</b><span>' + (sync.mode === "live" ? "같은 계정 폰에 나타나 있습니다" : "로그인하면 같은 계정 폰에도 나타납니다") + '</span><a class="sbtn" href="#route' + (D4.ids[0] ? ":" + (D4.ids.filter(function (id) { return statusOf(id) === "planned"; })[0] || D4.ids[0]) : "") + '">폰 동선 화면 보기</a></div>'
      : '<button type="button" class="cta wide" data-act="confirm"><b>방문 계획 확정</b><small>' + ds.length + "일차 " + total + "가구 · 확정하면 같은 계정 폰에 바로</small></button>";
    return top("plan", "<strong>" + esc(roundYm()) + " 명단</strong>" + total + "가구 · 가상") + '<main class="wrap">' +
      '<div class="dhead"><h1><span>' + ds.length + "일</span>이면 명단을 다 봅니다</h1><p>한국사회보장정보원 발굴 순위를 그대로 따르되, 같은 날 묶인 집은 시청에서 가까운 순서로 이었습니다. ▲▼로 바꾸면 도착 시각이 다시 계산됩니다.</p></div>" +
      '<div class="dcards" role="group" aria-label="일차">' + cards + "</div>" +
      (ow.over ? '<p class="warnline">' + esc(ow.why.join(" · ")) + " — 한 집을 다음 일차로 미뤄 보세요.</p>" : "") +
      '<div class="pgrid"><ol class="tline blk" aria-label="' + D4.n + '일차 순서">' + tl + "</ol>" +
      '<div class="pside"><div class="mapw blk">' + mapSvg({ id: "pm", days: ds.map(function (d) { return { ids: d.ids, focus: d.n === planDay }; }), done: listIds().filter(function (id) { return statusOf(id) !== "planned"; }), labels: true, h: 380, label: D4.n + "일차 방문 순서 지도" }) +
      '<div class="mlg"><span><i class="a"></i>' + D4.n + '일차</span><span><i class="b"></i>다른 일차</span><span>직선 거리 근사 · 실제 길은 폰 «동선»에서 네이버 지도로</span></div></div>' + conf +
      '<div class="dlset blk"><div class="k">기한 점검</div><div class="dlrow"><label>명단 기한<input type="date" id="dlUntil" value="' + esc(dl.until || "") + '"></label><label>하루 방문<select id="dlPer">' + per + "</select></label></div>" +
      (dp && dp.set ? '<div class="dln"><b>' + dp.left + "</b> 근무일 남음 · " + (dp.over ? '<em class="bad">이대로면 넘김</em>' : '<em class="ok">여유 ' + dp.spare + "일</em>") + "</div><p>" + esc(dp.line) + "</p>" : "<p>기한을 넣으면 하루 몇 집씩 봐야 하는지 계산합니다.</p>") + "</div></div></div>" +
      '<p class="foot"><span class="demo-tag">가상 데이터</span><span>가구 번호·읍면만 표시 · 이동 시간은 직선 거리 근사(«약») · 순서 근거 = 한국사회보장정보원 발굴 순위 + 거리</span><a href="' + OFF + '#s1">명단 불러오기(엑셀 43열)</a></p></main>';
  }
  function bindPlan() {
    var ds = days(); if (!ds.length) return;
    var D4 = ds.filter(function (d) { return d.n === planDay; })[0];
    app.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", function () { planDay = +b.dataset.day; render(); }); });
    app.querySelectorAll("[data-mv]").forEach(function (b) { b.addEventListener("click", function () { var a = b.dataset.mv.split(":"), i = +a[0]; vib(); reorder(D4, RP.move(D4.ids, i, i + +a[1])); }); });
    var cf = app.querySelector('[data-act="confirm"]'); if (cf) cf.addEventListener("click", function () { vib(); confirmPlan(ds); });
    var u = document.getElementById("dlUntil"), pd = document.getElementById("dlPer");
    function setDl() { lsSet(LS_DL, { until: u.value || null, perDay: +pd.value || 5 }); render(); }
    if (u) u.addEventListener("change", setDl); if (pd) pd.addEventListener("change", setDl);
  }
  function reorder(D4, ids) {
    var p = plan();
    if (p) { var others = p.rows.filter(function (r) { return r.day !== D4.n; }), base = D4.rows, s = sched(ids);
      p.rows = others.concat(ids.map(function (id, i) { var o = base.filter(function (r) { return r.household_no === id; })[0]; return Object.assign({}, o, { seq: i + 1, planned_at: at(D4.date, s.rows[i].arrive) }); })).sort(function (a, b) { return a.day - b.day || a.seq - b.seq; });
      SY.savePlan(p);
    } else { var ord = lsGet("daeum.officer.dayOrder", {}) || {}; ord[D4.n] = ids; lsSet("daeum.officer.dayOrder", ord); }
    render();
  }
  function confirmPlan(ds) {
    var R = rankBy(), dl = deadline(), rows = [];
    ds.forEach(function (d) { d.ids.forEach(function (id, i) { rows.push({ day: d.n, seq: i + 1, household_no: id, planned_at: at(d.date, d.s.rows[i].arrive), status: statusOf(id), list_rank: R[id] ? R[id].listRank : null, visit_rank: R[id] ? R[id].todayRank : null }); }); });
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
  var rmP = null;
  function rmLoad() {
    if (window.DaeumRouteMap) return Promise.resolve(window.DaeumRouteMap);
    if (rmP) return rmP;
    rmP = new Promise(function (ok, no) { var s = document.createElement("script"); s.src = "officer/route_map.js?v=s12e41"; s.onload = function () { window.DaeumRouteMap ? ok(window.DaeumRouteMap) : no("no-rm"); }; s.onerror = function () { rmP = null; no("network"); }; document.head.appendChild(s); });
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
    var road = !!(rb && ra), b = rtSum(before, road ? rb : null), a = rtSum(after, road ? ra : null);
    return { b: b, a: a, road: road, same: before.join() === after.join(), dKm: b.km - a.km, dMin: b.min - a.min, pct: b.km > 0 ? (b.km - a.km) / b.km * 100 : 0, path: road ? ra.path : null };
  }
  function rtOptHtml(r) {
    var y = r.road ? "" : "약 ", f1 = function (v) { return (Math.round(v * 10) / 10).toFixed(1); }, f0 = function (v) { return Math.round(v); };
    var head = r.same || r.dKm < 0.05 ? '<b class="rt-h">명단 순서가 이미 가장 짧은 길입니다</b>'
      : r.dKm > 0 ? '<b class="rt-h">이 순서로 돌면 <em>' + y + f1(r.dKm) + "km · " + f0(Math.max(0, r.dMin)) + "분</em> 짧아집니다</b>"
      : '<b class="rt-h">직접 바꾼 순서 · 명단 순서보다 ' + y + f1(-r.dKm) + "km 깁니다</b>";
    var w = r.b.km > 0 ? Math.max(8, Math.min(100, r.a.km / r.b.km * 100)) : 100;
    return '<section class="rt-opt blk" aria-label="동선 최적화 결과"><div class="rt-tag">동선 최적화 결과</div>' + head +
      '<div class="rt-bars"><div class="rt-r"><span>명단 순서</span><i class="rt-b0" style="width:100%"></i><b>' + y + f1(r.b.km) + "km · " + f0(r.b.min) + "분</b></div>" +
      '<div class="rt-r on"><span>최적 순서</span><i class="rt-b1" style="width:' + w.toFixed(0) + '%"></i><b>' + y + f1(r.a.km) + "km · " + f0(r.a.min) + "분</b></div></div>" +
      (r.dKm >= 0.05 ? '<p class="rt-pct">이동 거리 ' + f0(r.pct) + "% 줄임 · 상담 시간은 그대로</p>" : "") +
      '<p class="rt-src">' + (r.road ? "거리·시간: 네이버 Directions 15 도로 경로(닿음 서버 daeum-route)" : "거리·시간: 직선거리 × 1.3(우회 계수) · 시속 40km 근사 — 도로 경로를 받으면 실제 값으로 바뀝니다") +
      " · 순서: 최근접 이웃 → 2-opt · 상주시청 출발·복귀 · 가구 위치는 가상(시연용)</p></section>";
  }
  function routeView(want) {
    var k = pickHid(want); if (!k) return phEmpty();
    var c = k.c, hid = k.hid, h = BY[hid], i = c.d.ids.indexOf(hid), row = c.d.s.rows[i] || {};
    var done = c.d.ids.filter(function (id) { return statusOf(id) !== "planned"; }), left = c.d.ids.filter(function (id) { return statusOf(id) === "planned"; });
    var vt = F.visitTime.profile(attempts(), hid, { neighborLog: neighborLog() }), segs = Math.ceil(left.length / 6);
    var stops = c.d.ids.map(function (id, j) { var st = statusOf(id); return '<a class="rs' + (st !== "planned" ? " dn" : "") + (id === hid ? " nx" : "") + '" href="#route:' + id + '"><i>' + (st !== "planned" ? "✓" : j + 1) + '</i><b>' + id + "</b><span>" + esc(BY[id].area) + stTag(st) + '</span><em>' + esc((c.d.s.rows[j] || {}).arrive || "") + "</em></a>"; }).join("");
    return '<main class="ph">' + phBrand() + mini(1, hid) +
      '<div class="mapw blk ph-map rt-map" id="rtmap"><div class="rt-svg">' + mapSvg({ id: "rm", days: [{ ids: c.d.ids, focus: true }], done: done, next: hid, h: 360, label: "오늘 동선 지도" }) + '</div><div class="rt-nmap" aria-label="네이버 지도 — 오늘 방문 순서"><div class="rt-nbox"></div></div>' +
      '<div class="mtop"><span>' + (c.isToday ? "오늘" : c.d.date ? md(c.d.date) : c.d.n + "일차") + " · " + c.d.ids.length + "집</span><span>" + c.d.s.km + "km 약 · " + c.d.s.end + " 복귀</span></div></div>" +
      '<div id="rtopt">' + rtOptHtml(rtCmp(rtListOrder(c.d.ids), c.d.ids)) + "</div>" +
      '<section class="nextc blk"><span class="pin">' + (i + 1) + '</span><div><b>다음 집 ' + hid + "</b><small>" + esc(h.area + " · " + ageLine(h)) + (vt.best && vt.absences.length ? " · " + esc(vt.absences[0].label) + " 부재 " + vt.absences.length + "번 → " + esc(vt.best.label) : "") + '</small></div><span class="eta">' + esc(row.arrive || "") + "<small>" + (row.km != null ? row.km + "km · " + row.travelMin + "분" : "") + "</small></span>" +
      '<div class="dprog" style="grid-template-columns:repeat(' + c.d.ids.length + ',1fr)">' + c.d.ids.map(function (id) { return '<i class="' + (id === hid ? "n" : statusOf(id) !== "planned" ? "d" : "") + '"></i>'; }).join("") + '</div><div class="dprog-l"><span>' + done.length + "집 끝</span><span>남은 " + left.length + "집</span></div></section>" +
      '<button type="button" class="big nav" data-act="nav"><span>네이버 지도로 길안내</span><small>남은 ' + Math.min(6, left.length || c.d.ids.length) + "곳 경유</small></button>" +
      (segs > 1 ? '<div class="segs">' + Array.apply(null, { length: segs }).map(function (_, kk) { return '<button type="button" class="sbtn" data-seg="' + kk + '">' + (kk * 6 + 1) + "~" + Math.min(left.length, kk * 6 + 6) + "번째</button>"; }).join("") + "</div>" : "") +
      '<p class="navnote">이름·주소 대신 «방문 1·2…»만 넘깁니다 · 네이버 지도 앱이 없으면 웹 길찾기로</p>' +
      '<div class="rlist blk">' + stops + "</div>" + resBlock(c.d.ids) +
      '<a class="big dark" href="#home:' + hid + '">도착했어요 <small>집 앞 요약 보기</small></a></main>' + bnav("route", hid);
  }
  function bindRoute(want) {
    var k = pickHid(want); if (!k) return;
    var c = k.c, left = c.d.ids.filter(function (id) { return statusOf(id) === "planned"; });
    var nb = app.querySelector('[data-act="nav"]'); if (nb) nb.addEventListener("click", function () { vib(); launch(left.length ? left : c.d.ids, 0); });
    app.querySelectorAll("[data-seg]").forEach(function (b) { b.addEventListener("click", function () { launch(left, +b.dataset.seg); }); });
    bindRouteMap(c, k.hid);
  }
  var rtAsked = {}, rtRO = null;
  function bindRouteMap(c, hid) {
    var wrap = document.getElementById("rtmap"), box = wrap && wrap.querySelector(".rt-nbox"); if (!box) return; // 네이버가 지도 판에 position:relative 를 덮어써서 바깥 칸(절대 위치)이 아닌 안쪽 판에 그린다
    var ids = c.d.ids, before = rtListOrder(ids);
    function stops() { return ids.map(function (id, j) { var p = RP.toLatLng(BY[id]), st = statusOf(id); return { lat: p.lat, lng: p.lng, no: j + 1, label: "방문 " + (j + 1), cls: id === hid ? "nx" : st !== "planned" ? "dn" : "" }; }); }
    function paint() {
      var RM = window.DaeumRouteMap, r = rtCmp(before, ids), o = document.getElementById("rtopt");
      if (o) o.innerHTML = rtOptHtml(r);
      var mt = wrap.querySelector(".mtop span:last-child"); if (mt && r.road) mt.textContent = (Math.round(r.a.km * 10) / 10).toFixed(1) + "km · 이동 " + Math.round(r.a.min) + "분(도로)";
      if (!RM || !document.body.contains(box)) return;
      var off = RP.toLatLng(OFFICE), ra = RM.cacheGet(RP.cacheKey(rtStops(ids), true));
      var ok = RM.draw({ box: box, office: { lat: off.lat, lng: off.lng, name: "상주시청", short: "시청" }, stops: stops(), path: ra ? ra.path : null, ret: true, color: "#0C8767" });
      if (!ok) return;
      var shown = function () { wrap.classList.add("has-naver"); };
      try { naver.maps.Event.once(RM.state.map, "tilesloaded", shown); } catch (e) { /* 이벤트 없음 */ }
      setTimeout(function () { if (box.querySelector("img")) shown(); }, 1500); // 이미 받아 둔 타일이면 tilesloaded 가 안 올 수 있다
    }
    rmLoad().then(function (RM) {
      return RM.load().then(function () {
        paint();
        if (rtRO) rtRO.disconnect();
        if (window.ResizeObserver) { rtRO = new ResizeObserver(function () { if (document.body.contains(box)) RM.refresh(); else rtRO.disconnect(); }); rtRO.observe(box); }
        // 도로 경로 — 두 순서(명단·최적) 모두. 같은 순서·복귀면 7일 보관이라 다시 부르지 않는다
        if (ids.length > RP.MAX_ROAD_STOPS) return;
        [before, ids].forEach(function (ord) {
          var key = RP.cacheKey(rtStops(ord), true);
          if (RM.cacheGet(key) || rtAsked[key]) return; rtAsked[key] = 1;
          RM.road(key, rtPts(ord)).then(function () { if (document.body.contains(box)) paint(); }, function () { /* 직선 근사 유지 */ });
        });
      });
    }).catch(function (why) { wrap.classList.add("no-naver"); if (window.console) console.warn("[닿음 동선] 네이버 지도 대신 그림 지도 — " + why); });
  }

  // ═════ P3 실적·사후관리 — 명단 진도·읍면별·이번 주 할 일(약속·재방문·연계 뒤 확인) ═════
  function perfView() {
    var now = new Date(), today = ymd(now), ids = listIds(), dl = deadline(), ds = days();
    if (!ids.length) return top("perf", "<strong>실적</strong>가상 데이터") + '<main class="wrap"><div class="emptyc blk"><b>현장 기록이 들어오면 채워집니다</b>방문 계획을 확정하고 폰에서 «확정»을 누르면 이 화면에 바로 쌓입니다.</div></main>';
    var S = { done: 0, absent: 0, refused: 0, planned: 0 }; ids.forEach(function (id) { S[statusOf(id)] = (S[statusOf(id)] || 0) + 1; });
    var total = ids.length, seen = S.done + S.absent + S.refused, C = 2 * Math.PI * 70, acc = 0;
    var arcs = [["done", "#0C8767"], ["absent", "#E0581F"], ["refused", "#8A9396"]].map(function (a) { var v = S[a[0]] / total, s = '<circle cx="90" cy="90" r="70" fill="none" stroke="' + a[1] + '" stroke-width="22" stroke-dasharray="' + (C * v).toFixed(1) + " " + C.toFixed(1) + '" stroke-dashoffset="' + (-C * acc).toFixed(1) + '" transform="rotate(-90 90 90)"/>'; acc += v; return v ? s : ""; }).join("");
    var ar = {}; ids.forEach(function (id) { var a = BY[id].area, st = statusOf(id); ar[a] = ar[a] || { done: 0, absent: 0, refused: 0, planned: 0, n: 0 }; ar[a][st]++; ar[a].n++; });
    var areas = Object.keys(ar).sort(function (a, b) { return ar[b].n - ar[a].n; }), mx = Math.max.apply(null, areas.map(function (a) { return ar[a].n; }));
    var abar = areas.map(function (a) { var x = ar[a]; return '<div class="ab-r"><span class="ab-n">' + esc(a) + '</span><span class="ab-b" style="width:' + (x.n / mx * 100).toFixed(0) + '%">' + ["done", "absent", "refused", "planned"].map(function (k) { return x[k] ? '<i class="' + k + '" style="flex:' + x[k] + '"></i>' : ""; }).join("") + '</span><span class="ab-v">' + x.done + "/" + x.n + "</span></div>"; }).join("");
    var field = ids.filter(function (id) { return caseOf(id).field.length; }).length;
    var prs = F.store.get("promises", []) || [], ac = F.aftercare.schedule(F.store.get("links", []), F.store.get("outcomes", {}), F.store.get("followups", {}), now);
    var wk = weekRange(), wk1 = ymd(wk.to), nextD = ds.filter(function (d) { return d.ids.some(function (id) { return statusOf(id) === "planned"; }); })[0], att = attempts();
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
      ds.forEach(function (x) { if (x.date === d) ev.push(["v", x.n + "일차 " + x.ids.length + "집"]); });
      prs.forEach(function (p) { if (!p.done && p.due === d) ev.push(["p", p.householdId + " 약속"]); });
      ac.forEach(function (x) { if (x.date === d && x.state !== "done") ev.push(["f", x.householdId + " 확인"]); });
      if (dl.until === d) ev.push(["d", "명단 기한"]);
      return '<div class="wd' + (d === today ? " today" : d < today ? " past" : "") + '"><b>' + W.charAt(new Date(d + "T00:00:00").getDay()) + "<small>" + (+d.slice(8)) + "</small></b>" + ev.slice(0, 3).map(function (e) { return '<span class="ev e-' + e[0] + '">' + esc(e[1]) + "</span>"; }).join("") + (ev.length > 3 ? '<span class="evm">+' + (ev.length - 3) + "</span>" : "") + "</div>"; }).join("");
    var concl = "명단 " + total + "가구 중 " + seen + "가구를 찾아갔고 " + S.done + "가구와 상담했습니다" + (S.absent ? " · 부재 " + S.absent + "가구는 다시 갑니다" : "") + ".";
    return top("perf", "<strong>" + esc(roundYm()) + " 명단 실적</strong>가상 데이터") + '<main class="wrap">' +
      '<div class="dhead"><h1>' + esc(concl) + '</h1><p>숫자는 현장 기록을 규칙으로 센 것입니다(손 집계 없음) · 주간 실적 보고서는 «문서함»에서 두 번 눌러 받습니다.</p></div>' +
      '<div class="pfgrid"><section class="ringc blk"><svg viewBox="0 0 180 180" class="ring" aria-label="진도 ' + seen + "/" + total + '"><circle cx="90" cy="90" r="70" fill="none" stroke="#E1E5EB" stroke-width="22"/>' + arcs + '<text x="90" y="88" text-anchor="middle" font-size="34" font-weight="900" fill="#111A27">' + Math.round(seen / total * 100) + '%</text><text x="90" y="110" text-anchor="middle" font-size="12" font-weight="700" fill="#586273">' + seen + "/" + total + " 가구</text></svg>" +
      '<ul class="rlg"><li><i style="background:#0C8767"></i>만남·상담<b>' + S.done + '</b></li><li><i style="background:#E0581F"></i>부재 · 다시 감<b>' + S.absent + '</b></li><li><i style="background:#8A9396"></i>거절<b>' + S.refused + '</b></li><li><i style="background:#E1E5EB"></i>방문 전<b>' + S.planned + "</b></li></ul>" +
      '<div class="fsig well"><b>' + field + '</b>가구에서 명단 사유 밖 징후를 현장에서 더 봄<small>현장 확인 «문제 있음» 기준 · 보고서에 따로 셉니다</small></div></section>' +
      '<section class="areac blk"><h2>읍면별 진도</h2>' + abar + '<div class="mlg"><span><i class="a"></i>만남</span><span><i class="c"></i>부재</span><span><i class="d"></i>거절</span><span><i class="e"></i>방문 전</span></div></section>' +
      '<section class="todoc blk"><h2>이번 주 할 일 <small>' + todo.filter(function (x) { return !x.done; }).length + "건 남음</small></h2>" + (tl ? '<ul class="todo2">' + tl + "</ul>" : '<p class="mute">이번 주는 다시 볼 집이 없습니다.</p>') + "</section></div>" +
      '<section class="week blk" aria-label="이번 주"><h2>이번 주 근무일</h2><div class="wds">' + wd + "</div></section>" +
      '<p class="foot"><span class="demo-tag">가상 데이터</span><span>다음 차수 명단이 오면 «명단 불러오기»에서 이번 차수와 자동으로 견줍니다</span><a href="' + OFF + '#s1">명단 불러오기</a></p></main>';
  }
  function bindPerf() {
    app.querySelectorAll("[data-todo]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.dataset.todo, k = b.dataset.k;
      if (k === "p") F.store.set("promises", F.promises.toggle(F.store.get("promises", []), id));
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
    { k: "d6", nm: "차수 처리 결과 명단", sub: "명단 43열 + 방문 4열 · xlsx", meter: [["m", 12], ["r", 4]] },
    { k: "d7", nm: "한 장 인계 카드", sub: "선택 · 담당 교체·부재 때 · hwpx 1쪽", meter: [["m", 3], ["r", 6], ["a", 1], ["e", 1]] },
    { k: "d8", nm: "큰 글씨 안내문", sub: "선택 · 어르신 가구에 남김 · hwpx 1쪽", meter: [["r", 4], ["a", 1]] }
  ];
  var DOC_OPT = { d7: 1, d8: 1 }; // 선택 문서 — «만들 문서 N건» 합계에서 뺀다(S12-d 40)
  var docSel = "d2", docDay = null, docHid = null, docOrg = null, docPer = "wk", made1 = {};
  function reportDays() { return days().filter(function (d) { return d.ids.some(function (id) { return statusOf(id) !== "planned"; }); }); }
  function caseOf(id) {
    var L = lastLog(id), st = statusOf(id), memo = L ? L.memo : "", tags = L && L.tags || [];
    var refs = st === "done" ? F.referral.suggest({ text: memo, needs: F.askGuide.detect(memo) }).filter(function (x) { return x !== "emergency"; }) : [];
    var field = tags.filter(isField);
    return { id: id, st: st, memo: memo, tags: tags, refs: refs, field: field, at: L ? L.at : null, h: BY[id] };
  }
  function weekRange() { var n = U.startOfDay(new Date()), mon = new Date(n.getTime() - ((n.getDay() + 6) % 7) * 864e5); return { from: mon, to: new Date(mon.getTime() + 4 * 864e5) }; }
  /** 이번 달 1일 ~ 말일(S12-d 39 월간) */
  function monthRange() { var n = U.startOfDay(new Date()); return { from: new Date(n.getFullYear(), n.getMonth(), 1), to: new Date(n.getFullYear(), n.getMonth() + 1, 0) }; }
  /** 실적 보고 저장 키 — 주간 «wk:월요일:d5» · 월간 «mo:YYYY-MM:d5» */
  function perKey(per) { return per === "mo" ? "mo:" + ymd(monthRange().from).slice(0, 7) + ":d5" : "wk:" + ymd(weekRange().from) + ":d5"; }
  function docModel() {
    var rd = reportDays(), dd = rd.length ? (rd.filter(function (d) { return d.n === docDay; })[0] || rd[rd.length - 1]) : null;
    var cases = dd ? dd.ids.map(caseOf) : [], met = cases.filter(function (x) { return x.st === "done"; }), ab = cases.filter(function (x) { return x.st === "absent"; });
    var done = lsGet(LS_DOCS, {}) || {}, key = dd ? roundYm() + ":" + dd.n : "";
    var linked = met.filter(function (x) { return x.refs.length; });
    var cnt = { d2: dd ? 1 : 0, d1: met.length, d3: linked.length, d4: ab.length + linked.length, d5: 1, d6: 1, d7: handCands(cases).length, d8: bigCands(cases).length };
    var got = function (k) { return (done[key + ":" + k] || []).length; };
    var wk = weekRange(), wkKey = ymd(wk.from);
    var pend = { d2: Math.max(0, cnt.d2 - got("d2")), d1: Math.max(0, cnt.d1 - got("d1")), d3: Math.max(0, cnt.d3 - got("d3")), d4: Math.max(0, cnt.d4 - got("d4")), d5: (done[perKey(docPer)] || []).length ? 0 : 1, d6: (done["round:" + roundYm() + ":d6"] || []).length ? 0 : 1, d7: Math.max(0, cnt.d7 - got("d7")), d8: Math.max(0, cnt.d8 - got("d8")) };
    return { rd: rd, dd: dd, cases: cases, met: met, ab: ab, linked: linked, cnt: cnt, pend: pend, key: key, wkKey: wkKey, pending: Object.keys(pend).reduce(function (s, k) { return s + (DOC_OPT[k] ? 0 : pend[k]); }, 0) };
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
      '<section class="prev blk" id="docPrev" tabindex="-1" aria-label="' + esc(D0.nm) + ' 미리보기">' + pv + "</section></div>" +
      '<p class="foot"><span class="demo-tag">가상 데이터</span><span>개인정보 4칸(성명·주민등록번호·연락처·주소) 미기재 · 가구 번호·읍면만 · 상담일지 입력·전자서명은 행복이음에서</span></p></main>';
  }
  function flowBtns(k, ready, label2, label3) {
    var m1 = !!made1[k + ":" + (docHid || "")], on = m1 && ready ? "" : " disabled";
    return '<div class="flow2"><button type="button" class="' + (m1 ? "d1" : "d2") + '" data-act="make">' + (m1 ? "1 만들기 ✓" : "1 만들기") + "</button><em>→</em>" +
      '<button type="button" class="' + (m1 ? "d2" : "") + '" data-act="get"' + on + ">2 " + label2 + "</button>" +
      (label3 ? '<button type="button" class="' + (m1 ? "d2" : "") + '" data-act="get" data-alt="1"' + on + ">2 " + label3 + "</button>" : "") + "</div>";
  }
  /** D1 상담일지 초안 — 미리보기·복사·보관 hwpx 가 같은 값을 쓰게 한 곳에서 만든다(규칙 «자동 정리») */
  function d1Draft(x) {
    return F.askGuide.draft({ label: "가구 " + x.id, area: x.h.area, at: x.at, method: "방문 상담", needs: F.askGuide.detect(x.memo), summary: x.memo, services: x.tags.filter(function (t) { return !isField(t) && !SIGN_REV[t] && !/^(주거|생계|건강|고립)$/.test(t); }), next: (F.promises.open(F.store.get("promises", []), x.id)[0] || {}).text || "", guide: F.askGuide.check(x.memo, null, askedOf(x.id)) });
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
    var pr = F.promises.open(F.store.get("promises", []), x.id)[0], vt = F.visitTime.profile(attempts(), x.id, {});
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
      { k: "발굴 순위", src: "data", v: "한국사회보장정보원 " + (mt.prio || "—") + "순위 · " + roundYm() + " 차수" },
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
      var dft = d1Draft(x);
      return pk + flowBtns("d1", true, "입력 순서 복사", "보관 hwpx 받기") + '<div class="paper"><div class="ruler"><i style="background:var(--src-data)"></i><i style="background:var(--src-rule)"></i><i style="background:var(--src-ai)"></i><i style="background:var(--src-ai)"></i></div><h3>상담일지 초안</h3><div class="sub">행복이음 입력용 · 자동 정리 · 공무원 확정 전 · 보관 hwpx는 가구 번호·읍면만</div><table class="doc-t">' +
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
      var w = periodModel(docPer), mo = docPer === "mo", fs5 = [{ k: "기간", src: "rule", v: mdDot(w.from) + " ~ " + mdDot(w.to) }, { k: "방문", src: "rule", v: "만남 " + w.met + " · 부재 " + w.absent + " · 거절 " + w.refuse + " (총 " + w.total + "곳)" },
        { k: "읍면별", src: "rule", v: w.areas.map(function (a) { return a[0] + " " + a[1]; }).join(" · ") || "—" }, { k: "처리 완료", src: "rule", v: "명단 " + w.listN + "가구 중 " + w.doneN + "가구 확인" }]
        .concat(mo ? [{ k: "주차별 추세", src: "rule", v: w.weeks.map(function (x) { return x[0] + " " + x[1] + "곳"; }).join(" · ") || "—" }, { k: "수급권자 현황 비교", src: "data", v: w.cmp }] : [])
        .concat([{ k: "지역 배경", src: "data", v: w.rcp }, { k: "한 줄 결론", src: "ai", v: w.concl }]);
      var perSw = '<div class="hh-pick" role="group" aria-label="보고 기간">' + [["wk", "주간"], ["mo", "월간"]].map(function (p) { return '<button type="button" data-per="' + p[0] + '" aria-pressed="' + (p[0] === docPer) + '">' + p[1] + "</button>"; }).join("") + "</div>";
      return perSw + flowBtns("d5:" + docPer, true, "hwpx 받기") + paper(w.name + " 추진 실적 보고", "상주시청 · " + area + " 맞춤형복지팀", fs5) + LEG + '<p class="srcline">숫자는 규칙 집계(현장 기록) · 지역 배경 = 한국사회보장정보원 «복지사업 시군구별 수급권자 현황»(15062448, 기준 2025-12)</p>';
    }
    if (k === "d7") {
      var c7 = handCands(M.cases);
      if (!c7.length) return '<div class="emptyc"><b>넘길 가구가 없습니다</b>방문 기록이 있는 가구에만 인계 카드가 생깁니다.</div>';
      var pk7 = hhPick(c7), x7 = M.cases.filter(function (c) { return c.id === docHid; })[0], D7 = d7Fields(M, x7, now);
      return pk7 + flowBtns("d7", true, "hwpx 받기") + paper("한 장 인계 카드", "가구 " + x7.id + " · " + x7.h.area + " · 담당자 교체·부재 때 넘김", D7.fields) + LEG +
        '<p class="srcline">가구·순위 = 한국사회보장정보원 발굴대상자 명단 · 나머지 = 현장 기록 · «받는 사람»은 비워도 받을 수 있습니다(종이에 손으로 적음)</p>';
    }
    if (k === "d8") {
      var c8 = bigCands(M.cases);
      if (!c8.length) return '<div class="emptyc"><b>남길 안내문이 없습니다</b>만남·부재 가구가 생기면 큰 글씨 안내문이 만들어집니다.</div>';
      var pk8 = hhPick(c8), x8 = M.cases.filter(function (c) { return c.id === docHid; })[0], B8 = d8Model(x8, now);
      return pk8 + flowBtns("d8", true, "hwpx 받기") + paper(B8.title, B8.sub, B8.cards.map(function (c) { return { k: c.k, src: "rule", v: c.v + (c.s ? " · " + c.s : "") }; })) + LEG +
        '<p class="srcline">한글에서 22pt 굵은 글씨로 열립니다 · 집에 남기는 종이라 가구 번호·성명·주소·사정은 넣지 않습니다 · 전화번호 칸은 손으로 적습니다</p>';
    }
    docHid = "";
    var R = roundRows();
    return flowBtns("d6", true, "xlsx 받기") + '<div class="paper"><div class="ruler"><i style="background:var(--src-data)"></i><i style="background:var(--src-data)"></i><i style="background:var(--src-rule)"></i></div><h3>차수 처리 결과 명단</h3><div class="sub">' + esc(roundYm()) + " 명단 " + R.length + "가구 · 명단 열 + 방문 4열(방문일·결과·연계·다음 확인)</div>" +
      '<table class="doc-t wide"><tr><th>가구</th><th>읍면</th><th>발굴 순위</th><th>방문일</th><th>결과</th><th>연계</th><th>다음 확인</th></tr>' + R.slice(0, 8).map(function (r) { return "<tr>" + r.map(function (v, i) { return "<td>" + (i >= 3 ? '<span class="rule">' + esc(v) + "</span>" : esc(v)) + "</td>"; }).join("") + "</tr>"; }).join("") + (R.length > 8 ? '<tr><td colspan="7" style="text-align:center;color:var(--mute)">… ' + (R.length - 8) + "가구 더</td></tr>" : "") + "</table></div>" + LEG +
      '<p class="srcline">명단 열 = 한국사회보장정보원 발굴대상자 조회 서식(43열 중 가구 번호·읍면·순위만 표시, 개인정보 4칸 제외) · 방문 4열 = 현장 기록</p>';
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
      var L = lastLog(id), st = statusOf(id), c = caseOf(id), pr = F.promises.open(F.store.get("promises", []), id)[0];
      return [id, BY[id].area, String((mt[id] || {}).prio || "—"), L ? ymd(L.at) : "", st === "done" ? "만남" : st === "absent" ? "부재" : st === "refused" ? "거절" : "방문 전", c.refs.length ? F.referral.ORGS[c.refs[0]].org.replace(/\(.*\)/, "") : "", pr ? (pr.due || "") + " " + clip(pr.text, 18) : ""];
    });
  }
  var hwpxP = null;
  function needLibs() {
    if (window.DaeumHwpx && window.DaeumXlsx) return Promise.resolve();
    if (hwpxP) return hwpxP;
    function load(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
    hwpxP = (window.DaeumXlsx ? Promise.resolve() : load("shared/xlsx.js?v=s12e40")).then(function () { return window.DaeumHwpx ? null : load("shared/hwpx.js?v=s12e40"); });
    return hwpxP;
  }
  function getDoc(M, k, alt) {
    var now = new Date(), area = BY[M.dd.ids[0]].area, made = now.getFullYear() + ". " + (now.getMonth() + 1) + ". " + now.getDate() + ".", office = "상주시청 · " + area + " 맞춤형복지팀";
    var stamp = ymd(now).replace(/-/g, "");
    if (k === "d1" && !alt) { var x = M.cases.filter(function (c) { return c.id === docHid; })[0]; copy(d1Draft(x).text); markDone(M, k, x.id); render(); return; }
    if (k === "d4") { var z = M.cases.filter(function (c) { return c.id === docHid; })[0]; var vt = F.visitTime.profile(attempts(), z.id, {}); copy(NT.alimtalk(z.st === "absent" ? "absent" : "link", { area: z.h.area, date: z.at ? ymd(z.at) : null, time: z.at ? hm(z.at) : null, nextDate: ymd(U.addWorkdays(now, A.retryGap)), nextSlot: vt.best && /오전/.test(vt.best.label) ? "오전" : "오후" }).copy); markDone(M, k, z.id); render(); return; }
    needLibs().then(function () {
      var W2 = window.DaeumHwpx, TW = W2 && W2.TW || 0;
      if (k === "d1") {
        var x1 = M.cases.filter(function (c) { return c.id === docHid; })[0];
        return W2.download(d1Hwpx(x1, d1Draft(x1), made, office, TW), "상담일지초안_" + x1.id + "_" + stamp + ".hwpx").then(function () { markDone(M, k, x1.id); });
      }
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
        var w = periodModel(docPer);
        return W2.download(d5Hwpx(w, made, office, TW), (w.per === "mo" ? "월간실적_" : "주간실적_") + stamp + ".hwpx").then(function () { markDone(M, k, w.per); });
      }
      if (k === "d7") {
        var x7 = M.cases.filter(function (c) { return c.id === docHid; })[0];
        return W2.download(d7Hwpx(x7, d7Fields(M, x7, now), made, office, TW), "인계카드_" + x7.id + "_" + stamp + ".hwpx").then(function () { markDone(M, k, x7.id); });
      }
      if (k === "d8") {
        var x8 = M.cases.filter(function (c) { return c.id === docHid; })[0];
        return W2.download(d8Hwpx(d8Model(x8, now), made), "큰글씨안내문_" + x8.id + "_" + stamp + ".hwpx").then(function () { markDone(M, k, x8.id); });
      }
      if (k === "d6") {
        var R = roundRows();
        return window.DaeumXlsx.download({ title: "차수 처리 결과 명단", subtitle: roundYm() + " 명단", made: made + " " + hm(now), office: office, conclusion: "명단 " + R.length + "가구 중 " + R.filter(function (r) { return r[4] === "만남"; }).length + "가구 상담", note: "※ 시연용 가상 자료 · 개인정보 4칸 없음",
          sheets: [{ name: "처리 결과", title: "<표 1> 차수 처리 결과", unit: "단위: 가구", columns: [{ key: "a", h: "가구", type: "text", w: 10 }, { key: "b", h: "읍면", type: "text", w: 10 }, { key: "c", h: "발굴 순위", type: "text", w: 9 }, { key: "d", h: "방문일", type: "text", w: 12 }, { key: "e", h: "결과", type: "text", w: 9 }, { key: "f", h: "연계", type: "text", w: 22 }, { key: "g", h: "다음 확인", type: "text", w: 28 }], rows: R, total: false, src: "※ 출처: 한국사회보장정보원 발굴대상자 조회 서식(가상) + 닿음 현장 기록" }],
          sources: [{ kind: "가상", org: "닿음", name: "시연용 가상 가구", date: ymd(now), use: "명단·방문 결과" }], footer: "닿음" }, "차수결과_" + roundYm() + "_" + stamp + ".xlsx").then(function () { markDone(M, k, "round"); });
      }
    }).then(function () { toast("내려받았습니다"); render(); }, function () { toast("파일을 만들지 못했습니다 — 다시 눌러 주세요"); });
  }
  /** S12-d 40: 목록에서 문서를 고르면 미리보기로 옮긴다 — 폰(한 줄 배치)에서 미리보기가 목록 아래에 있어 안 보이던 문제. 이미 화면 안이면 포커스만 */
  function toPrev() {
    var pv = document.getElementById("docPrev"); if (!pv) return;
    var r = pv.getBoundingClientRect(), vh = window.innerHeight || 800;
    pv.focus({ preventScroll: true });
    if (r.top >= 0 && r.top < vh * 0.5) return;
    var y = window.pageYOffset + r.top - 12;
    window.scrollTo(RM_ ? { top: y } : { top: y, behavior: "smooth" });
  }
  function bindDocs() {
    var M = docModel(); if (!M.dd) return;
    app.querySelectorAll("[data-doc]").forEach(function (b) { b.addEventListener("click", function () { docSel = b.dataset.doc; docHid = null; render(); toPrev(); }); });
    app.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", function () { docDay = +b.dataset.day; docHid = null; render(); }); });
    app.querySelectorAll("[data-hh]").forEach(function (b) { b.addEventListener("click", function () { docHid = b.dataset.hh; render(); }); });
    app.querySelectorAll("[data-org]").forEach(function (b) { b.addEventListener("click", function () { docOrg = b.dataset.org; made1["d3:" + docHid] = made1["d3:" + docHid] || false; render(); }); });
    var mk = app.querySelector('[data-act="make"]'); if (mk) mk.addEventListener("click", function () { vib(); made1[(docSel === "d5" ? "d5:" + docPer : docSel) + ":" + (docHid || "")] = true; render(); });
    app.querySelectorAll('[data-act="get"]').forEach(function (gt) { gt.addEventListener("click", function () { vib(); getDoc(M, docSel, !!gt.dataset.alt); }); });
    app.querySelectorAll("[data-per]").forEach(function (b) { b.addEventListener("click", function () { docPer = b.dataset.per === "mo" ? "mo" : "wk"; render(); }); });
    app.querySelectorAll("[data-fill]").forEach(function (inp) { inp.addEventListener("change", function () { var a = fills(), o = a[M.key] || {}; o[inp.dataset.fill] = inp.value.trim().slice(0, 40); a[M.key] = o; lsSet(LS_FILL, a); render(); }); });
  }

  // ═════ 사용 방법 — 하루 7단계를 그림 한 줄씩(S12-d 2부-3). 옛 흐름 ①~⑨ 안내(shared/guide.js)는 옛 공무원 화면 전용으로 남김 ═════
  var ICO = {
    pc: '<rect x="8" y="12" width="48" height="32" rx="5" fill="#1C2839"/><rect x="12" y="16" width="40" height="24" rx="2" fill="#E1E5EB"/><rect x="24" y="46" width="16" height="4" rx="2" fill="#1C2839"/><rect x="18" y="50" width="28" height="4" rx="2" fill="#C3C9D3"/>',
    ph: '<rect x="20" y="6" width="24" height="52" rx="6" fill="#1C2839"/><rect x="23" y="12" width="18" height="38" rx="2" fill="#E1E5EB"/><circle cx="32" cy="54" r="2" fill="#E1E5EB"/>',
    s1: '<rect x="14" y="20" width="20" height="5" rx="2.5" fill="#0C8767"/><rect x="14" y="28" width="24" height="5" rx="2.5" fill="#586273"/><rect x="14" y="36" width="16" height="5" rx="2.5" fill="#586273"/>',
    s2: '<path d="M26 44 L30 30 L38 34 L37 20" fill="none" stroke="#0C8767" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="37" cy="20" r="3.5" fill="#E0581F"/>',
    s3: '<rect x="25" y="17" width="14" height="3" rx="1.5" fill="#111A27"/><rect x="25" y="23" width="12" height="3" rx="1.5" fill="#586273"/><rect x="25" y="29" width="14" height="3" rx="1.5" fill="#C62F3A"/><rect x="25" y="35" width="10" height="3" rx="1.5" fill="#586273"/>',
    s4: '<path d="M26 20 l2 2 4-4M26 29 l2 2 4-4" stroke="#0C8767" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="26" y="37" width="6" height="6" rx="1.5" fill="#E0581F"/><rect x="34" y="19" width="5" height="2.5" rx="1" fill="#586273"/><rect x="34" y="28" width="5" height="2.5" rx="1" fill="#586273"/><rect x="34" y="39" width="5" height="2.5" rx="1" fill="#586273"/>',
    s5: '<rect x="24" y="17" width="16" height="10" rx="3" fill="#2F6FB1"/><rect x="24" y="31" width="16" height="10" rx="3" fill="#fff" stroke="#586273" stroke-width="1.5"/><path d="M27 41 l-2 4 5-4" fill="#fff" stroke="#586273" stroke-width="1.2"/>',
    s6: '<rect x="28.5" y="17" width="7" height="13" rx="3.5" fill="#E0581F"/><path d="M26 27a6 6 0 0 0 12 0M32 33v5" stroke="#111A27" stroke-width="2" fill="none" stroke-linecap="round"/>',
    s7: '<rect x="18" y="18" width="20" height="26" rx="2" fill="#fff" stroke="#586273" stroke-width="1.5" transform="rotate(-8 28 31)"/><rect x="26" y="16" width="20" height="26" rx="2" fill="#fff" stroke="#111A27" stroke-width="1.5"/><rect x="29" y="21" width="12" height="2.5" rx="1" fill="#F2C230"/><rect x="29" y="26" width="14" height="2.5" rx="1" fill="#8A9396"/><rect x="29" y="31" width="9" height="2.5" rx="1" fill="#D0343F"/>'
  };
  function ico(dev, k) { return '<svg viewBox="0 0 64 64" aria-hidden="true">' + ICO[dev] + (k ? '<g transform="' + (dev === "ph" ? "translate(0,2)" : "translate(0,-2)") + '">' + ICO[k] + "</g>" : "") + "</svg>"; }
  var HELP = [
    { s: "s1", dev: "pc", t: "방문 계획", w: "사무실 PC · 명단을 받은 날", d: "한국사회보장정보원 발굴 순위대로 일차가 나뉘어 있습니다. ▲▼로 순서만 손보고 «확정»", f: "명단 43열 · 발굴 순위 · 기한(근무일)", n: "확정 1번", h: "#plan" },
    { s: "s2", dev: "ph", t: "동선", w: "폰 · 출발 전", d: "남은 집이 지도에 순서대로. «네이버 지도로 길안내» 한 번이면 차 길안내가 시작됩니다", f: "방문 계획(실시간)", n: "1번", h: "#route" },
    { s: "s3", dev: "ph", t: "집 앞 요약", w: "폰 · 집 앞 차 안 30초", d: "발굴 이유·지난 기록·주의할 점·받는 급여를 5줄로. 읽고 «들어가기»", f: "명단 위기정보·급여 열 · 건축물대장 · 기상특보", n: "0번(읽기만)", h: "#home" },
    { s: "s4", dev: "ph", t: "현장 확인", w: "폰 · 집 안에서", d: "명단 위기정보에 맞춘 체크 5~8줄. 줄마다 «괜찮음»이나 «문제 있음» 한 번", f: "명단 위기정보 유형", n: "줄마다 1번", h: "#check" },
    { s: "s5", dev: "ph", t: "상담 도움", w: "폰 · 상담하면서", d: "물어볼 순서가 카드로 넘어갑니다. 받을 수 있는 서비스는 원문 요약으로(선정 결정 아님)", f: "복지서비스 15090532·15108347 원문", n: "카드마다 1번", h: "#talk" },
    { s: "s6", dev: "ph", t: "상담 후 기록", w: "폰 · 상담 직후 1분", d: "앞에서 고른 징후·서비스가 이미 채워져 있습니다. 1분 말하거나 몇 줄 적고 «확정»", f: "④⑤에서 고른 것 · 받아쓴 글(음성 원본 남기지 않음)", n: "말하기 1번 + 확정 1번", h: "#record" },
    { s: "s7", dev: "pc", t: "보고서", w: "사무실 PC · 그날 저녁·주 1번", d: "복명서·상담일지·연계 의뢰서·주간 실적이 대기합니다. «만들기 → 받기» 두 번", f: "앞 단계 기록 전부 · 수급권자 현황 15062448", n: "문서마다 2번", h: "#docs" }
  ];
  function helpView() {
    var steps = HELP.map(function (x, i) {
      return '<li class="hs dv-' + x.dev + '"><span class="hn">' + (i + 1) + '</span><div class="hi">' + ico(x.dev, x.s) + '</div><div class="hb"><span class="hw">' + esc(x.w) + "</span><b>" + esc(x.t) + "</b><p>" + esc(x.d) + '</p><div class="hf"><span class="plug">자동으로 채움</span>' + esc(x.f) + '</div></div><div class="hk"><b>' + esc(x.n) + '</b><a href="' + x.h + '">열어 보기 →</a></div></li>';
    }).join("");
    return top("help", "<strong>사용 방법</strong>처음 한 번 읽기") + '<main class="wrap">' +
      '<div class="dhead"><h1>앞에서 누른 것이 <span>다음 화면에</span> 채워집니다</h1><p>PC에서 계획하고, 폰은 «다음» 단추만 따라가고, 저녁에 PC에서 문서를 받습니다. 같은 내용을 두 번 쓰지 않습니다.</p></div>' +
      '<ol class="once" aria-label="처음 한 번만"><li><b>1</b><span><em>같은 계정</em>으로 사무실 PC와 폰에서 로그인<small>오른쪽 위 연동 단추 · 코드·QR 없음</small></span></li><li><b>2</b><span>PC «방문 계획»에서 <em>확정</em><small>폰에 바로 나타납니다</small></span></li><li><b>3</b><span>폰은 화면 아래 <em>큰 단추</em>만 따라가기<small>동선 → 집 앞 → 확인 → 상담 → 기록</small></span></li></ol>' +
      '<div class="hlane"><span class="l-pc">' + ico("pc") + "사무실 PC</span><span class=\"l-ph\">" + ico("ph") + '현장 폰</span></div>' +
      '<ol class="hsteps">' + steps + "</ol>" +
      '<section class="hleg blk"><h2>문서 미리보기의 색</h2>' + LEG + '<p>남색 칸은 한국사회보장정보원 명단·공공데이터에서, 회색은 규칙으로 센 숫자, 노랑은 자동으로 다듬은 문장(확인 필요), 빨강은 직접 넣어야 하는 빈칸입니다. 빨강이 0이 되어야 «받기»가 켜집니다.</p></section>' +
      '<section class="hnot well"><b>이 도우미가 하지 않는 것</b><span>지원 대상 판정 · 위험 점수 매기기 · 성명·주민등록번호·연락처·주소 받기 · 행복이음 입력 대신하기(입력·전자서명은 행복이음에서)</span></section>' +
      '<p class="foot"><span class="demo-tag">가상 데이터</span><span>화면의 가구는 모두 시연용 가상입니다</span><a href="shared/data.html">활용 데이터</a><a href="?demo=reset#today">시연 처음 상태로</a></p></main>';
  }

  // ── 계정·연동 창(같은 계정 로그인 → PC·폰 실시간. 코드·QR 넘김 없음) ──
  function accountPanel() {
    var s = SY.state(), why = { login: "로그인 전 — 이 기기에만 저장합니다.", "no-table": "연동 서버가 아직 준비되지 않아 이 기기에만 저장합니다.", off: "연동이 꺼져 있습니다.", lib: "연동 부품을 받지 못했습니다.", error: "서버 응답 오류 — 이 기기에 저장 중.", socket: "실시간 연결이 끊겨 이 기기에 임시 저장 중입니다.", send: "보내기 실패 — 다시 붙으면 자동으로 보냅니다." };
    var d = document.createElement("dialog"); d.className = "acct";
    d.innerHTML = '<form method="dialog" class="acct-in"><h3>PC와 폰 실시간 연동</h3><p>같은 공무원 계정으로 PC와 폰에서 로그인하면 방문 계획과 현장 기록이 서로 바로 나타납니다. 서버에는 가구 번호·순서·상태·가린 메모만 갑니다.</p>' +
      "<p>" + syncChip() + " " + esc(s.mode === "live" ? "실시간 연동 중" : why[s.why] || "") + "</p>" +
      (s.user ? "<p>로그인: <b>" + esc(s.user.email) + '</b></p><div class="acct-b"><button class="sbtn" type="button" data-act="out">로그아웃</button><button class="sbtn pri" value="close">닫기</button></div>'
        : '<label>전자우편<input type="email" id="aEmail" autocomplete="username" required autofocus></label><label>비밀번호<input type="password" id="aPw" autocomplete="current-password" minlength="8" required></label><p id="aMsg" role="status"></p><div class="acct-b"><button class="sbtn" type="button" data-act="up">처음이면 가입</button><button class="sbtn pri" type="button" data-act="in">로그인</button></div>') +
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
  function sideSteps() {
    var k = pickHid(curArg), hid = k ? k.hid : null, now = FSTEP[cur];
    return '<nav class="fsteps" aria-label="현장 7단계"><h3>현장 7단계' + (hid ? "<small>가구 " + esc(hid) + "</small>" : "") + "</h3>" +
      STN.map(function (s, i) { return '<a href="' + stationHref(i, hid) + '"' + (i === now ? ' class="on" aria-current="step"' : "") + "><i>" + (i + 1) + "</i><b>" + s[0] + "</b><small>" + FSUB[i] + "</small></a>"; }).join("") + "</nav>";
  }
  function stepVals(c, hid) {
    var h = BY[hid], o = recOf(hid), i = c.d.ids.indexOf(hid), row = c.d.s.rows[i] || {}, st = statusOf(hid), m = meta()[hid] || {}, r = rankBy()[hid];
    var p = plan(), pr = p && p.rows.filter(function (x) { return x.household_no === hid; })[0];
    var lr = pr && pr.list_rank != null ? pr.list_rank : r ? r.listRank : m.prio || "—";
    var L = checkList(h, o.res === "absent"), ck = o.checks || {}, dn = L.filter(function (x) { return ck[x.k]; }).length, bd = L.filter(function (x) { return ck[x.k] === "bad"; }).length;
    var Q = questionsFor(hid, o), as = askedOf(hid), aN = Q.filter(function (q) { return as[q.key]; }).length, svN = chosenSvcs(hid, o).length;
    return [
      [(c.d.n || 1) + "일차 " + (i + 1) + "번째", "발굴 " + lr + "순위"],
      [row.arrive ? row.arrive + " 도착" : "—", row.km != null ? row.km + "km · " + row.travelMin + "분" : c.d.s.km + "km"],
      [indText(h).length + "가지 사유", h.area],
      [dn + " / " + L.length, bd ? "징후 " + bd + "개" : dn ? "이상 없음" : "체크 전"],
      ["질문 " + aN + " / " + Q.length, "연계 후보 " + svN + "개"],
      [st === "planned" ? "확정 전" : ST_LBL[st] || "확정", st === "planned" ? (o.memo ? "메모 있음" : "말하기 1분") : "확정됨"],
      [docModel().pending + "건", "만들 문서"]];
  }
  function desk(s, want, html) {
    var k = pickHid(want); if (!k) return html;
    var c = k.c, hid = k.hid, h = BY[hid], now = FSTEP[s], V = stepVals(c, hid), st = statusOf(hid), dm = docModel();
    var head = '<section class="dk-head blk" aria-label="현장 7단계 진행판"><div class="dk-t"><span class="dk-k">현장 7단계 · 가구 <b>' + esc(hid) + "</b> · " + esc(h.area + " · " + ageLine(h)) + "</span><h1><em>" + (now + 1) + "</em>" + esc(FSUB[now]) + "</h1></div>" +
      '<div class="dk-nav">' + '<a class="sbtn" href="' + stationHref(now - 1, hid) + '">← ' + STN[now - 1][0] + "</a>" + '<a class="sbtn go" href="' + stationHref(now + 1, hid) + '">' + STN[now + 1][0] + " →</a></div>" +
      '<ol class="dk-steps" style="--p:' + (now / 6).toFixed(3) + '">' + STN.map(function (x, i) {
        var cls = i === now ? "now" : i < now || (i === 5 && st !== "planned") ? "dn" : "";
        return '<li class="' + cls + '"><a href="' + stationHref(i, hid) + '"' + (i === now ? ' aria-current="step"' : "") + "><i>" + (i + 1) + "</i><b>" + x[0] + "</b><span>" + esc(V[i][0]) + "</span><small>" + esc(V[i][1]) + "</small></a></li>";
      }).join("") + "</ol></section>";
    var dayL = c.d.ids.map(function (id, j) {
      var ss = statusOf(id), tg = ss === "done" ? '<span class="tg ok">만남</span>' : ss === "absent" ? '<span class="tg ab">부재</span>' : ss === "refused" ? '<span class="tg rf">거절</span>' : "";
      return '<li class="' + (id === hid ? "cur" : "") + (ss !== "planned" ? " dn" : "") + '"><a href="#' + s + ":" + id + '"><span class="t">' + esc((c.d.s.rows[j] || {}).arrive || "") + "</span><i>" + (ss !== "planned" ? "✓" : j + 1) + "</i><b>" + esc(id) + "</b><small>" + esc(BY[id].area) + "</small>" + tg + "</a></li>";
    }).join("");
    var feed = (FFEED[s] || []).map(function (f) { return "<li><b>" + esc(f[0]) + "</b><span>" + esc(f[1]) + "</span></li>"; }).join("");
    var aside = '<aside class="dk-aside" aria-label="오늘 방문과 문서">' +
      '<section class="dk-day blk"><h3>' + (c.isToday ? "오늘" : c.d.date ? md(c.d.date) : c.d.n + "일차") + " 방문 " + c.d.ids.length + "곳<small>" + esc(c.d.s.km + "km 약 · " + (c.d.s.end || "") + " 복귀") + "</small></h3><ol>" + dayL + "</ol></section>" +
      '<section class="dk-feed well"><h3>이 단계 기록이 들어가는 문서</h3><ul>' + feed + '</ul><a class="dk-docs" href="#docs">문서함 열기<b>' + dm.pending + "건 대기</b></a></section>" +
      '<p class="dk-src"><span>근거 데이터</span>' + esc(STN[now][1]) + " · 가상 가구</p></aside>";
    var i0 = html.indexOf('<main class="ph">'), i1 = html.indexOf("</main>", i0);
    if (i0 < 0 || i1 < 0) return html;
    return html.slice(0, i0) + '<div class="desk">' + head + '<div class="dk-body">' + html.slice(i0, i1 + 7) + aside + "</div></div>" + html.slice(i1 + 7);
  }

  // ── 길잡이(해시) ──
  var cur = "", curArg = null;
  var TITLES = { today: "오늘", plan: "방문 계획", route: "동선", perf: "실적·사후관리", help: "사용 방법", home: "집 앞 요약", check: "현장 확인", talk: "상담 도움", record: "상담 후 기록", docs: "문서함" };
  function parse() { var m = /^#(today|plan|route|perf|help|home|check|talk|record|docs)(?::([A-Z]{1,3}-\d{1,5}))?$/.exec(location.hash || ""); return m ? { s: m[1], h: m[2] || null } : null; }
  function render() {
    var a = parse(); if (!a) { location.replace("#today"); return; }
    var chg = a.s !== cur || a.h !== curArg; cur = a.s; curArg = a.h;
    var VIEW = { today: today, plan: planView, route: routeView, perf: perfView, help: helpView, home: home, check: checkView, talk: talkView, record: record, docs: docsView };
    var html = VIEW[cur](curArg), bar = alertBar();
    if (bar) { var pb = phBrand(); html = html.indexOf(pb) >= 0 ? html.replace(pb, pb + bar) : html.replace(/<main class="wrap">/, '<main class="wrap">' + bar); }
    if (FSTEP[cur] >= 1 && FSTEP[cur] <= 5) { var kk = pickHid(curArg), ar = kk ? BY[kk.hid].area : ""; html = top("field", "<strong>" + md(new Date()) + "</strong>" + esc(ar) + " 현장 · 가상") + desk(cur, curArg, html); } // 41 PC 현장 책상(폰에서는 CSS로 숨김)
    document.body.dataset.s = cur;
    app.innerHTML = html;
    document.title = TITLES[cur] + " · " + NAME + " — " + SUB;
    ({ today: bindToday, plan: bindPlan, route: bindRoute, perf: bindPerf, help: function () {}, home: bindHome, check: bindCheck, talk: bindTalk, record: bindRecord, docs: bindDocs })[cur](curArg);
    app.querySelectorAll('[data-act="account"]').forEach(function (b) { b.addEventListener("click", accountPanel); });
    bindAlerts(); safeSig = sigNow();
    if (chg) window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", function () { if (micRec) micRec.stop(); render(); });
  SY.on(function (what) {
    var ae = document.activeElement;
    if (ae && (ae.id === "memo" || ae.id === "refuseWhy" || ae.hasAttribute && ae.hasAttribute("data-fill"))) return; // 쓰는 중에는 다시 그리지 않는다
    if (micRec) return;
    if (what === "safety-ask") { resendOwn(); return; }
    if (what === "safety") safeAdopt();
    if (what === "mode" && SY.state().mode === "live") resendOwn();
    if (what === "data" || what === "mode" || what === "sent" || what === "safety") render();
  });
  // 안전 모드 시계 — 20초마다 넘김 여부를 다시 본다(바뀌면 다시 그림, 아니면 분 숫자만) · 1분마다 내 안전 모드를 다시 알린다(나중에 연 화면도 받게)
  var safeSig = "", safeTick = 0;
  function sigNow() { return safeAlerts().map(function (a) { return a.id + (a.late ? "!" : ""); }).join(","); }
  function resendOwn() { var sf = lsGet(LS_SAFE, null); if (sf && SY.safety) { var a = SY.safety.list()[sf.id]; safePush(sf, a && a.state === "ok" ? "ok" : "on"); } }
  setInterval(function () {
    if (++safeTick % 3 === 0 && SY.state().mode === "live") resendOwn();
    var ae = document.activeElement, typing = micRec || (ae && (ae.id === "memo" || ae.id === "refuseWhy" || ae.hasAttribute && ae.hasAttribute("data-fill")));
    if (sigNow() !== safeSig && !typing) { render(); return; }
    var all = SY.safety ? SY.safety.list() : {};
    app.querySelectorAll("[data-sfid]").forEach(function (el) { var a = all[el.dataset.sfid], n = el.querySelector("[data-sfel]"); if (a && n) n.textContent = elMin(a.at); });
  }, 20000);
  setInterval(function () { if (/^(check|talk|record)$/.test(cur) && !micRec && !(document.activeElement && /^(memo|refuseWhy)$/.test(document.activeElement.id))) render(); }, 60000); // 안전 모드 분 표시
  if (navBack()) { /* 길안내에서 돌아옴 → 동선 화면 */ }
  window.DaeumApp = { days: days, statusOf: statusOf, docModel: docModel, render: render };
  render();
  SY.init();
})();
