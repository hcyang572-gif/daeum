/* 복지 사각지대 현장 업무 도우미(닿음) — 현장 탭(#home·#check·#talk) — 집 앞 요약 M2(home·bindHome·pickHid·phEmpty) · 현장 확인 M3(checkView·bindCheck·CHECKS) · 상담 도움 M4(talkView·bindTalk·needSvc·SVDB)
   102회차 ⚙️ 파로C(2026-11-14): 정본 시안 v3 Version 8 현장 화면 구현 — FIELD-I1~I5·A1~A4(모양은 app/tab_field.css). 안전 모드 동작(켜기·끝·안부)은 app.js 그대로 쓰고,
   «길게 눌러 도움 요청(1.2초)»·«무사히 끝났나요?» 시트·가구별 예상 시간 제안만 여기서 얹는다.
   101회차 ⚙️ 파로(2026-11-14): app/app.js 에서 그대로 옮겨 나눔(동작 변경 0). 화면 함수 본문은 app.js 때와 같은 글자·같은 들여쓰기.
   잇는 법: app.js 가 원래 자리 순서대로 DaeumTabs.field(AK) 를 부른다. AK = 공통 이름 창구(app.js·다른 탭의 이름을 «읽을 때의 값»으로 돌려줌).
   받는 이름은 relink() 가 지역 변수로 채우고(부를 때 한 번 + app.js 가 모든 탭을 읽은 뒤 한 번 더), 여러 파일이 함께 바꾸는 값은 AK.이름 으로 읽고 쓴다. */
(window.DaeumTabs = window.DaeumTabs || {}).field = function (AK) {
  "use strict";
  var F, OH, BY, app, I, ii, A, esc, md, mdDot, clip, vib, uniq, meta, weather, attempts, plan, neighborLog, rankBy, indText, ageLine, lastLog,
      typesFor, FIELD_SIGNS, svcFor, dayCtx, arriveOf, dayOfHid, qcards, qchips, FD, elMin, safeOn, safeEnter, minPick, minChips, bindChips, bindSafe,
      recOf, saveRec, saveRecord, C2, keepPlace, render;
  function relink() {
    F = AK.F; OH = AK.OH; BY = AK.BY; app = AK.app; I = AK.I; ii = AK.ii; A = AK.A; esc = AK.esc;
    md = AK.md; mdDot = AK.mdDot; clip = AK.clip; vib = AK.vib; uniq = AK.uniq; meta = AK.meta; weather = AK.weather; attempts = AK.attempts;
    plan = AK.plan; neighborLog = AK.neighborLog; rankBy = AK.rankBy; indText = AK.indText; ageLine = AK.ageLine; lastLog = AK.lastLog; typesFor = AK.typesFor; FIELD_SIGNS = AK.FIELD_SIGNS;
    svcFor = AK.svcFor; dayCtx = AK.dayCtx; arriveOf = AK.arriveOf; dayOfHid = AK.dayOfHid; qcards = AK.qcards; qchips = AK.qchips; FD = AK.FD; elMin = AK.elMin;
    safeOn = AK.safeOn; safeEnter = AK.safeEnter; minPick = AK.minPick; minChips = AK.minChips; bindChips = AK.bindChips; bindSafe = AK.bindSafe; recOf = AK.recOf; saveRec = AK.saveRec;
    saveRecord = AK.saveRecord; C2 = AK.C2; keepPlace = AK.keepPlace; render = AK.render;
  }
  relink();
  // ═════ M2 집 앞 요약(③) ═════
  function phBrand() { return ""; } // S12-x 65회차: 폰 현장 화면 머리도 셸 머리(topHTML) 하나로 — 옛 .ph-brand 걷어냄
  // S12-x 66회차(미르 넘김 ①): 옛 7단계 띠(nav.mini.well)는 머리 아래 고정 띠(.hbar)와 겹쳐 뺐다 → 시안 v3 현장 단계 줄 .steps(집 앞·확인·상담 3칸)
  //   now = 2(집 앞)·3(확인)·4(상담) — 옛 7단계 번호 그대로 받는다. 기록(5)·동선(1)은 단계 줄 없음(시안).
  function mini(now, hid) {
    if (now < 2 || now > 4) return "";
    return '<div class="steps" role="tablist" aria-label="현장 단계">' + [["#home:", "집 앞"], ["#check:", "확인"], ["#talk:", "상담"]].map(function (x, i) {
      var k = i + 2; return '<button type="button" role="tab" class="pr' + (k === now ? " on" : k < now ? " dn" : "") + '" data-go="' + x[0] + hid + '" aria-selected="' + (k === now) + '"><i>' + (k < now ? ii("check") : i + 1) + "</i>" + x[1] + "</button>";
    }).join("") + "</div>";
  }
  // 103회차 V4-4(시안 v4): 큰 화면 칸 정리·단 첫 카드 윗선 = 방문 탭과 같은 도우미(window.DaeumVxWide, app/tab_visit.js) — 폰은 그대로
  function fxWide() { var m = document.documentElement.getAttribute("data-mode") || "phone"; return m === "phone" ? "" : " vx-main vx-field"; }
  function fxLay() { var W = window.DaeumVxWide; if (!W) return; W.layout(); Promise.resolve().then(W.align); setTimeout(W.align, 400); }
  function bnav() { return ""; } // S12-x 65회차: 아래 탭은 셸(.tabs) 하나 — 현장 화면 옛 탭 줄 걷어냄
  function pickHid(want) {
    var c = dayCtx(); if (!c) return null;
    if (want && BY[want]) { var d = dayOfHid(c.ds, want); if (d) c.d = d; return { c: c, hid: want }; }
    return { c: c, hid: c.planned[0] || c.d.ids[c.d.ids.length - 1] };
  }
  function phEmpty() { return '<main class="phx">' + phBrand() + '<div class="emptyc blk"><b>방문 계획이 없습니다</b>사무실 PC에서 방문 계획을 확정하면 같은 계정의 폰에 바로 나타납니다.</div></main>' + bnav("home", null); }
  // ═════ 102회차 ⚙️ 파로C — 시안 v3 Version 8 현장 탭(FIELD-I1~I5·A1~A4) 공통 조각 ═════
  var LS_SMIN_K = "daeum.s12.safeMin"; // app.js LS_SMIN 과 같은 열쇠(들어가기 때 minPick() 이 읽는다)
  var memoOpen = {}, emerOpen = {}, svcOpen = {}, moveAsked = {};
  function ic(n) { return ii(n) || (I && I[n]) || ""; }
  function lrOf(hid) {
    var m = meta()[hid] || {}, r = rankBy()[hid], p = plan(), pr = p && p.rows.filter(function (x) { return x.household_no === hid; })[0];
    return pr && pr.list_rank != null ? pr.list_rank : r ? r.listRank : m.prio || "—";
  }
  /** FIELD-I3 가구 카드(시안 fieldTop) — 부제 짧게 «나이·사는 형태 · 순위 N». 집 앞·확인·상담 세 화면이 같은 카드 */
  function hhCard(c, hid, tail) {
    var h = BY[hid], m = meta()[hid] || {}, reasons = indText(h), i = c.d.ids.indexOf(hid), eta = arriveOf(c, hid), prev = c.d.ids[i - 1], next = c.d.ids[i + 1];
    return '<section class="card next idc" aria-label="가구"><div class="hh"><span class="no">' + (i + 1) + '</span><span class="t"><b>' + esc(h.area + " " + hid) + "</b><small>" + esc(ageLine(h) + " · 순위 " + lrOf(hid)) + (tail ? " · " + esc(tail) : "") + '</small></span><span class="when"><b class="num">' + esc(eta || "—") + "</b><small>" + (c.isToday ? "도착 예정" : esc(c.d.date ? md(c.d.date) : "예정")) + "</small></span></div>" +
      '<div class="tags">' + reasons.slice(0, 2).map(function (t) { return '<span class="tag w">' + esc(t) + "</span>"; }).join("") + (m.lonely ? '<span class="tag r">고독사 우선방문</span>' : "") + "</div>" +
      '<div class="row2 hhnav">' + (prev ? '<a class="evb pr" href="#home:' + prev + '">' + ii("chevL") + '앞 가구</a>' : '<span class="evb pr" aria-disabled="true">' + ii("chevL") + '앞 가구</span>') + '<span class="why">' + (i + 1) + " / " + c.d.ids.length + "</span>" + (next ? '<a class="evb pr" href="#home:' + next + '">다음 가구' + ii("chevR") + '</a>' : '<span class="evb pr" aria-disabled="true">다음 가구' + ii("chevR") + '</span>') + "</div></section>";
  }
  /** FIELD-I4 이 집 예상 시간 제안 — 2인 방문 권장·거동 불편이면 60분, 아니면 기본(A.safetyMin) */
  function sugMin(hid) {
    var h = BY[hid] || {}, o = recOf ? recOf(hid) || {} : {}, L = lastLog ? lastLog(hid) : null, d = (A && A.safetyMin) || 40;
    var pair = FD && FD.pairWarn ? FD.pairWarn(hid) : "";
    var slow = /거동/.test((indText(h) || []).join(" ")) || !!(o.signs && o.signs["거동 불편"]) || !!(L && L.tags && L.tags.indexOf("거동 불편") >= 0);
    if (pair) return { min: 60, why: "2인 방문 권장" };
    if (slow) return { min: 60, why: "거동 불편 · 천천히" };
    return { min: d, why: "" };
  }
  function minBy() { return F.store.get("safeMinBy", {}) || {}; }
  function selMin(hid) { var v = +minBy()[hid]; return v > 0 ? v : sugMin(hid).min; }
  function who() { var W = F.safety && F.safety.WHO || { peer: "동료", lead: "팀장" }; return { peer: String(W.peer).replace(/^동료 /, ""), lead: W.lead, gap: F.safety && F.safety.LEAD || 15 }; }
  function team() { return window.DaeumTeam || null; }
  function teamOn() { var T = team(); try { return !!(T && T.live && T.live()); } catch (e) { return false; } }
  function simT() { return teamOn() ? "" : '<span class="sim-tag">시연·가상</span>'; } // 받는 사람 이름은 시연용 가상(팀 연동 중이면 실제 짝)
  function tmCard(hid) {
    var CH = (F.safety && F.safety.CHIPS) || [15, 30, 40, 60, 90], sg = sugMin(hid), sel = selMin(hid), W = who();
    return '<section class="card fx-card fx-tm" aria-label="예상 시간"><b>예상 시간</b><div class="fx-chips" role="group" aria-label="이 집 예상 시간 — 넘기면 괜찮은지 묻고 안부 알림">' + CH.map(function (t) {
      return '<button type="button" class="fx-chip" data-smin="' + t + '" aria-pressed="' + (t === sel) + '"><span class="num">' + t + "</span>분" + (t === sg.min ? '<span class="fx-tag g">제안</span>' : "") + "</button>";
    }).join("") + '</div><div class="fx-note">' + ic("shield") + "<span>" + (sg.why ? esc(sg.why) + " · " + sg.min + "분을 먼저 제안 · " : "") + "지나면 " + esc(W.peer) + simT() + ", " + W.gap + "분 뒤 " + esc(W.lead) + "</span></div></section>";
  }
  /** FIELD-A1 지난 약속·다음 방문 때 확인 — 약속 자료(prAll: 이 기기 + 서버 방문 기록) 재사용 */
  function promiseOf(hid) {
    try { var all = AK.prAll ? AK.prAll() : null, p = all && F.promises && F.promises.open ? F.promises.open(all, hid)[0] : null; if (!p) return "";
      return p.text + (p.due ? " · " + md(p.due) + "까지" : ""); } catch (e) { return ""; }
  }
  function promiseCard(hid) { var t = promiseOf(hid); return t ? '<section class="card fx-card fx-pr" aria-label="지난 약속"><span class="fx-ico g">' + ic("calendar") + '</span><div><div class="fx-kick">지난 약속 · 다음 방문 때 확인</div><b>' + esc(t) + "</b></div></section>" : ""; }
  /** 안전 모드 카드(시안 safetyCard) — 집 앞 위·확인 둘째 칸. 무사히 나왔어요(bindSafe) · 길게 눌러 도움 요청(1.2초) */
  function safeCard(hid) {
    var sf = safeOn(hid); if (!sf) return "";
    var el = elMin(sf.at), est = sf.min || A.safetyMin, C = 2 * Math.PI * 42, pct = Math.min(1, el / Math.max(1, est)), W = who(), on = teamOn(), late = el >= est;
    return '<section class="card fx-safe' + (late ? " late" : "") + '" aria-label="안전 모드"><div class="fx-sr"><div class="fx-ring"><svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="7"/><circle cx="48" cy="48" r="42" fill="none" stroke="' + (late ? "#F2B8AE" : "#D6B67A") + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (C * pct).toFixed(1) + " " + C.toFixed(1) + '"/></svg><span><b class="num">' + el + "</b><small>분째 / " + est + "분</small></span></div>" +
      '<div class="fx-st"><div class="fx-sk">' + ic("shield") + "안전 모드 · " + esc(hid) + "</div><div class=\"fx-sb\">" + (on ? (late ? est + "분 지났습니다 · 괜찮으세요?" : est + "분이 지나면 " + esc(W.peer) + "에게") : "연동 꺼짐 — 알림이 가지 않습니다") + "</div><div class=\"fx-ss\">" + (on ? W.gap + "분 더 지나면 " + esc(W.lead) + "에게도" : esc(W.peer) + simT() + "에게 전화로 알려 두세요") + "</div></div></div>" +
      '<div class="fx-btns"><button type="button" class="fx-btn s" data-act="safeend">' + ic("check") + '무사히 나왔어요</button><button type="button" class="fx-btn hold" data-act="fhold" aria-label="길게 눌러 도움 요청 — 1.2초 누르고 있으면 조용히 보냅니다"><span class="fill" aria-hidden="true"></span>' + ic("warn") + "길게 눌러 도움 요청</button></div></section>";
  }
  /** 조용한 도움 요청 — 1.2초 길게 누를 때만(실수 방지). 소리·큰 알림 없이 가구 번호·읍면만 */
  function sendHelp(hid) {
    var LS = AK.LS_SAFE, sf = AK.lsGet(LS, null); if (!sf || sf.hid !== hid) return;
    sf.help = (sf.help || 0) + 1; sf.hat = new Date().toISOString(); AK.lsSet(LS, sf);
    var SY = AK.SY, a = SY && SY.safety ? SY.safety.list()[sf.id] : null; if (AK.safePush) AK.safePush(sf, a && a.state === "ok" ? "ok" : "on");
    try { if (navigator.vibrate) navigator.vibrate([12, 70, 12]); } catch (e) { /* 무시 */ }
    var W = who(); AK.toast(teamOn() ? "조용한 도움 요청을 보냈습니다 · " + W.peer + "·" + W.lead : "팀 연동 꺼짐 — 도움 요청이 동료에게 가지 않습니다 · " + W.peer + "에게 직접 전화하세요");
  }
  function bindHold(hid) {
    var b = app.querySelector('[data-act="fhold"]'); if (!b) return;
    var f = b.querySelector(".fill"), t = 0, held = false;
    function start(e) { if (e && e.type === "keydown" && (e.repeat || (e.key !== "Enter" && e.key !== " "))) return; if (e && e.type === "keydown") e.preventDefault(); held = false; clearTimeout(t); if (f) { f.style.transition = "transform 1.2s linear"; f.style.transform = "scaleX(1)"; } vib(); t = setTimeout(function () { held = true; sendHelp(hid); if (f) { f.style.transition = "none"; f.style.transform = "scaleX(0)"; } }, 1200); }
    function stop() { clearTimeout(t); if (f) { f.style.transition = "transform .2s"; f.style.transform = "scaleX(0)"; } }
    b.addEventListener("pointerdown", start); b.addEventListener("keydown", start);
    ["pointerup", "pointerleave", "pointercancel", "keyup", "blur"].forEach(function (ev) { b.addEventListener(ev, stop); });
    b.addEventListener("click", function (e) { e.preventDefault(); if (held) { held = false; return; } AK.toast("실수로 보내지 않게 길게 눌러야 보냅니다"); });
  }
  /** FIELD-A2 안전 모드를 켠 채 다른 집 앞으로 오면 «○○ 무사히 끝났나요?» — 다른 시트가 열려 있으면 띄우지 않음 */
  function ownSf() { var sf = AK.lsGet(AK.LS_SAFE, null); if (!sf) return null; var tb = null; try { tb = sessionStorage.getItem("daeum.tab"); } catch (e) { tb = null; } return !sf.tab || !tb || sf.tab === tb ? sf : null; }
  function closeMove() { var s = document.getElementById("fx-move"); if (s) s.parentNode.removeChild(s); }
  function askMove(hid) {
    var sf = ownSf(), cur0 = document.getElementById("fx-move");
    if (!sf || sf.hid === hid) { closeMove(); return; }
    var key = sf.id + "|" + hid; if (cur0 && cur0.getAttribute("data-k") === key) return; // 시계로 다시 그려도 열린 시트는 그대로
    closeMove(); if (moveAsked[key]) return;
    if (document.querySelector('dialog[open], [role="dialog"]:not(#fx-move), .ov.on, .sheet')) return;
    moveAsked[key] = 1;
    var wide = /^(tab|pc)$/.test(document.documentElement.getAttribute("data-mode") || ""), d = document.createElement("div");
    d.id = "fx-move"; d.className = "fx-mv"; d.setAttribute("data-k", key);
    d.innerHTML = '<div class="fx-scrim"></div><div class="fx-sheet' + (wide ? " side" : "") + '" role="dialog" aria-modal="true" aria-label="안전 모드 확인"><i class="fx-grab" aria-hidden="true"></i><div class="fx-sbd"><div class="fx-sr2"><span class="fx-ico">' + ic("shield") + '</span><div><b>' + esc(sf.hid) + ' 무사히 끝났나요?</b><div class="fx-sub">안전 모드가 아직 켜져 있습니다 · ' + elMin(sf.at) + '분째</div></div></div>' +
      '<div class="fx-btns"><button type="button" class="fx-btn p lg" data-mv="ok">' + ic("check") + '네, 끝났어요</button><button type="button" class="fx-btn s lg" data-mv="stay">아직 안에 있어요</button></div><div class="fx-note">' + ic("help") + "<span>끝내지 않으면 예정 시간을 넘겨 동료에게 거짓 알림이 갈 수 있습니다</span></div></div></div>";
    document.body.appendChild(d);
    d.querySelector('[data-mv="ok"]').addEventListener("click", function () {
      var s2 = AK.lsGet(AK.LS_SAFE, null); if (s2 && s2.id === sf.id) { s2.fin = "safe"; if (AK.safePush) AK.safePush(s2, "end"); try { localStorage.removeItem(AK.LS_SAFE); } catch (e) { /* 무시 */ } }
      try { if (navigator.vibrate) navigator.vibrate(18); } catch (e) { /* 무시 */ } closeMove(); AK.toast(sf.hid + " 안전 모드를 끝냈습니다"); render();
    });
    d.querySelector('[data-mv="stay"]').addEventListener("click", function () { vib(); closeMove(); location.hash = "#home:" + sf.hid; });
    var fb = d.querySelector('[data-mv="ok"]'); if (fb && fb.focus) fb.focus();
  }
  if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("hashchange", function () { if (!/^#home:/.test(location.hash)) closeMove(); });

  function home(want) {
    var k = pickHid(want); if (!k) return phEmpty();
    var c = k.c, hid = k.hid, h = BY[hid], m = meta()[hid] || {}, r = rankBy()[hid], att = attempts(), w = weather();
    var vt = F.visitTime.profile(att, hid, { neighborLog: neighborLog() }), L = lastLog(hid);
    var reasons = indText(h);
    var lines = [];
    lines.push({ lb: "발굴 이유", t: (reasons.join(" · ") || "위기정보") + (m.lonely ? " · 고독사 우선방문 대상" : ""), plug: ["발굴 명단"] });
    var past = [], memo = L && L.memo ? String(L.memo) : "";
    if (L) past.push(mdDot(L.at) + " " + (L.result === "met" ? "만남" : L.result === "absent" ? "부재" : "거절"));
    else if (vt.absences.length) past.push(vt.absences.length + "번 부재(" + uniq(vt.absences.map(function (a) { return a.label; })).join("·") + ")");
    else past.push("처음 찾아가는 집" + (r && r.gap != null ? " · 상담 공백 " + r.gap + "일" : ""));
    if (m.aiRes) past.push("AI초기상담 " + m.aiRes);
    lines.push({ lb: "지난 기록", t: past.join(" · "), plug: L ? ["발굴 명단", "현장 기록"] : ["발굴 명단"], memo: memo });
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
    var mo = !!memoOpen[hid], son = safeOn(hid);
    // 102회차: 시안 v3 V8 scrField(door) — 단계 줄 · 가구 카드(짧은 부제) | 안전 모드(켜졌을 때) · 지난 약속 · 도착 전 요약(메모 눌러 펼치기) · 예상 시간(제안) | 연계처 · 현장 보조
    //   FIELD-I1 «다음 단계 미리보기» 칩 줄 삭제 · FIELD-I2 «판단 근거»는 현장 확인 한 곳만 · 시안처럼 «쓸 수 있는 것» 카드 줄 없음
    return '<main class="phx' + fxWide() + '">' + mini(2, hid) + hhCard(c, hid) +
      safeCard(hid) + promiseCard(hid) +
      '<section class="card ft stops" aria-label="도착 전 요약"><div class="ch"><h3>도착 전 요약</h3><span class="samp">' + Math.min(5, lines.length) + '줄</span></div><div class="brief">' + lines.slice(0, 5).map(function (x, n) {
        var mm = x.memo ? '<span class="fx-memo">' + " — " + esc(mo ? x.memo : clip(x.memo, 26)) + "</span>" + (x.memo.length > 26 ? '<button type="button" class="fx-more" data-act="memo" aria-expanded="' + mo + '">' + (mo ? "접기" : "눌러 펼치기") + "</button>" : "") : "";
        return '<div class="bl' + (x.warn ? " w" : "") + '"><span class="ic' + (x.warn ? "" : " n") + '">' + (x.warn ? (I.warn || "!") : n + 1) + "</span><p>" + esc(x.t) + "<small>" + esc(x.lb) + mm + "</small>" + (x.plug.length ? '<span class="srcs">' + x.plug.map(function (p) { return '<span class="plug">' + esc(p) + "</span>"; }).join("") + "</span>" : "") + "</p></div>"; }).join("") + "</div>" +
      '<div class="cact"><button class="btn sm ghost noans" type="button" data-act="noans" data-dock="2" data-dock-lbl="못 만남">' + (I.away || "") + "응답 없음(부재) · 문 앞 확인으로</button></div></section>" + // S12-v U4(F3): 초인종 → 응답 없음 → 문 앞 확인 → 확정
      (son ? "" : tmCard(hid)) + // FIELD-I4 예상 시간 칩(가구별 «제안») — 안전 모드가 켜져 있으면 숨김(시안)
      (son ? '<button class="btn safe" type="button" data-act="enter" data-dock="1">' + (I.shield || "") + '확인으로 <small>안전 모드 ' + elMin(son.at) + "분째 · 예정 " + (son.min || A.safetyMin) + "분</small></button>" // S12-v U3: 이미 켜진 집은 새로 켜지 않고 이어 간다
        : '<button class="btn safe" type="button" data-act="enter" data-dock="1">' + (I.shield || "") + '들어가기 <small>안전 모드 <span data-sminv>' + selMin(hid) + "</span>분</small></button>") +
      C2 +
      (window.DaeumLink ? window.DaeumLink.html(h) : "") + // S12-m 치매·마음건강·돌봄 한 줄 + 같은 읍면동 연계처(app/linkcard.js)
      (FD ? FD.homeExtra(hid) : "") + // S12-i3 ①주소 확인 필요 ⑤2인 방문 ⑦추가 발굴 가구(작게)
      "</main>";
  }
  function bindHome(want) {
    fxLay(); // 103회차 V4-4
    var k = pickHid(want); if (!k) return;
    if (FD) FD.bindHome(app, k.hid);
    bindChips(); // [data-smin] 누름 → 안전 모드 기본 분(LS_SMIN)·«들어가기» 분 글자
    app.querySelectorAll("[data-smin]").forEach(function (b) { b.addEventListener("click", function () { var all = minBy(); all[k.hid] = +b.dataset.smin; F.store.set("safeMinBy", all); }); }); // 이 집 고른 값(다른 집엔 안 번짐)
    var mb = app.querySelector('[data-act="memo"]'); if (mb) mb.addEventListener("click", function () { memoOpen[k.hid] = !memoOpen[k.hid]; keepPlace('[data-act="memo"]'); render(); });
    var b = app.querySelector('[data-act="enter"]'); if (b) b.addEventListener("click", function () { vib(); if (!safeOn(k.hid)) AK.lsSet(LS_SMIN_K, selMin(k.hid)); safeEnter(k.hid); location.hash = "#check:" + k.hid; });
    var na = app.querySelector('[data-act="noans"]'); if (na) na.addEventListener("click", function () { vib(); var o = recOf(k.hid); o.res = "absent"; saveRec(k.hid, o); location.hash = "#check:" + k.hid; });
    bindSafe(); bindHold(k.hid);
    askMove(k.hid);
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
  // FIELD-A4 «문제 있음» 줄의 짧은 예시 칩(시안 CK) — 고른 칩은 현장 징후(o.signs)로 들어가 기록 자동 문장으로 이어진다
  var PROB = {
    food: ["냉장고 비어 있음", "끼니 거름", "유통기한 지난 음식", "병원 못 감"],
    bill: ["고지서 쌓임", "단전 예고장", "연체 문자", "전기장판만 씀"],
    fam: ["연락 끊김", "이웃만 가끔", "말벗 없음"],
    mail: ["우편물 쌓임", "이웃이 걱정함"],
    carer: ["도와줄 사람 없음", "씻기 어려움", "보일러 고장", "약 떨어짐"],
    heat: ["보일러 고장", "전기장판만 씀", "난방비 부담"],
    util: ["단전 예고장", "가스 끊김", "물 끊김"],
    leak: ["누수", "곰팡이", "창문 깨짐"],
    med: ["약 떨어짐", "복약 잊음", "병원 못 감"],
    adl: ["혼자 걷기 어려움", "씻기 어려움", "넘어짐 위험"]
  };
  function probOf(o, key) { return ((o.probs || {})[key]) || []; }
  /** FIELD-A3 위급 징후 바로 걸기 — 119·정신건강위기상담전화 1577-0199 */
  function emerCard(hid) {
    var op = !!emerOpen[hid], son = !!safeOn(hid);
    return '<section class="card fx-card fx-emer' + (op ? " on" : "") + '" aria-label="위급 징후"><button type="button" class="fx-li" data-act="emer" aria-expanded="' + op + '"><span class="fx-ico r">' + ic("warn") + '</span><span class="fx-lc"><b>위급 징후가 보이면</b><span>쓰러짐·의식 흐림·자해 위험</span></span>' + ic(op ? "chevU" : "chevD") + "</button>" +
      (op ? '<div class="fx-btns"><a class="fx-btn d lg" href="tel:119" data-act="emcall" data-v="119">' + ic("phone") + '119</a><a class="fx-btn d lg" href="tel:15770199" data-act="emcall" data-v="1577-0199">' + ic("phone") + '1577-0199</a></div><div class="fx-note">' + ic("help") + "<span>1577-0199 정신건강위기상담전화 · " + (son ? "걸고 나면 동료 안부에도 알립니다" : "안전 모드를 켜 두면 동료 안부에도 알립니다") + "</span></div>" : "") + "</section>";
  }
  /** 104회차 큰 화면 확인 둘째 단 맨 위 «이 가구» 요약(시안 v4 hhBrief) — 읍면·나이 / 위기정보 / 상담 공백·발굴 횟수. 폰은 위 가구 카드로 충분해 안 붙인다 */
  function hhBrief(hid) {
    var h = BY[hid], m = meta()[hid] || {}, r = rankBy()[hid], reasons = indText(h) || [];
    var rows = [["pin", h.area + " · " + ageLine(h)], ["warn", reasons.slice(0, 2).join(" · ") || "위기정보"], ["clock", (r && r.gap != null ? "상담 공백 " + r.gap + "일 · " : "") + "발굴 " + (+m.cnt || 1) + "번"]];
    return '<section class="card fx-card fx-hb" aria-label="이 가구"><div class="fx-kick">이 가구 · ' + esc(hid) + '</div><div class="list vx-lst">' +
      rows.map(function (x, i) { return '<div class="li"><span class="ico' + (i === 1 ? " g" : "") + '">' + ic(x[0]) + '</span><span class="lc"><b>' + esc(x[1]) + "</b></span></div>"; }).join("") + "</div></section>";
  }
  function checkView(want) {
    var k = pickHid(want); if (!k) return phEmpty();
    var hid = k.hid, h = BY[hid], o = recOf(hid), absent = o.res === "absent", L = checkList(h, absent), ck = o.checks || {}, m = meta()[hid] || {};
    var doneN = L.filter(function (c) { return ck[c.k]; }).length, badN = L.filter(function (c) { return ck[c.k] === "bad"; }).length, reasons = indText(h);
    var rows = L.map(function (c, i) {
      var st = ck[c.k] || "", pc = !absent && st === "bad" ? PROB[c.k] || [] : [], got = probOf(o, c.k);
      return '<li class="ck-row' + (st ? " " + st : "") + '" style="--tc:' + TYPE_COL[c.type] + '"><span class="ck-n">' + (st === "ok" ? ii("check") : st === "bad" ? "!" : i + 1) + '</span><div class="ck-q"><b>' + esc(c.q) + '</b><small><em>' + esc(c.type) + "</em>" + (c.why ? " 명단 위기정보에서 골라 둠" : absent ? " 부재 때 확인" : " 기본 확인") + (st === "bad" ? " · 징후 «" + esc(c.sign) + "»로 기록" : "") + "</small></div>" +
        '<div class="ck-b" role="group" aria-label="' + esc(c.q) + '"><button type="button" data-ck="' + c.k + '" data-v="ok" aria-pressed="' + (st === "ok") + '">괜찮음</button><button type="button" class="bad" data-ck="' + c.k + '" data-v="bad" aria-pressed="' + (st === "bad") + '">문제 있음</button></div>' +
        (pc.length ? '<div class="fx-chips fx-prob" role="group" aria-label="' + esc(c.q) + ' — 본 것 고르기">' + pc.map(function (t) { return '<button type="button" class="fx-chip sm" data-prob="' + c.k + '" data-v="' + esc(t) + '" aria-pressed="' + (got.indexOf(t) >= 0) + '">' + esc(t) + "</button>"; }).join("") + "</div>" : "") + "</li>";
    }).join("");
    var crit = absent ? "" : '<div class="fx-note">' + ic("help") + "<span>소득·재산 기준은 여기서 판정하지 않습니다 · «문제 있음»에서 고른 짧은 말은 기록 문장으로 이어집니다</span></div>";
    var pr = promiseOf(hid);
    // 102회차: 시안 v3 V8 scrField(check) — 단계 줄 · 가구 카드 | 집 안/문 앞 · 현장 확인(문제 칩) | 위급 징후 · 판단 근거(3칸) · 안전 모드
    // 104회차 파로B: 큰 화면은 정본 시안 v4 Version 16 check 그대로 — 첫 단 = (단계 줄·가구 카드 = 시안 fieldTop) 집 안/문 앞·현장 확인 | 둘째 단 = «이 가구» 요약(hhBrief)·위급·판단 근거·안전 모드. 폰은 옛 순서 그대로
    var wd = !!fxWide();
    return '<main class="phx' + fxWide() + '">' + mini(3, hid) + hhCard(k.c, hid, "확인 " + doneN + "/" + L.length) +
      '<div class="subseg" role="radiogroup" aria-label="어디서 확인하나요"><button type="button" role="radio" class="pr' + (absent ? "" : " on") + '" data-place="met" aria-checked="' + !absent + '">' + ii("met") + '집 안 · 만남</button><button type="button" role="radio" class="pr' + (absent ? " on" : "") + '" data-place="absent" aria-checked="' + absent + '">' + ii("away") + '문 앞 · 못 만남</button></div>' +
      (absent && pr ? '<div class="fx-info">' + ic("calendar") + " 지난 약속 · " + esc(pr) + "</div>" : "") + (wd ? "" : C2) +
      '<section class="card"><h3>현장 확인<span class="num">' + doneN + "/" + L.length + '</span></h3><ul class="cks">' + rows + "</ul>" +
      // S12-v U18(F7): 누르지 않은 줄만 «괜찮음»으로 채움 · 다시 누르면 채운 줄만 비움
      (L.length && (doneN < L.length || (o.allOk || []).length) ? '<button type="button" class="sbtn ck-all" data-act="ckall" aria-pressed="' + !!(o.allOk || []).length + '">' + ic("checkC") + ((o.allOk || []).length ? "모두 괜찮음 취소" : "나머지 모두 괜찮음 · " + (L.length - doneN) + "줄") + "</button>" : "") +
      '<div class="fx-tags"><span class="fx-tag' + (badN ? " r" : "") + '">문제 있음 ' + badN + '</span><span class="fx-tag ok">괜찮음 ' + (doneN - badN) + '</span><span class="fx-tag">안 봄 ' + (L.length - doneN) + "</span></div>" + crit + "</section>" +
      C2 + (wd ? hhBrief(hid) : "") + // 68회차 ⑮ 폴드·PC: 현장 확인 목록 | (104회차: 큰 화면은 «이 가구» 요약부터) 부재 정리·판단 근거·다음 단추 두 칸
      (absent && FD ? FD.awayPanel(hid) : "") + // S12-i3 ② 간접 확인·부재 메모·쪽지·문자·다음 방문
      (absent ? "" : emerCard(hid)) +
      '<section class="card vs" aria-label="판단 근거 카드"><div class="ch"><h3>판단 근거</h3><span class="samp">점수 없음</span></div><dl class="evt fx-ev3"><div><dt>명단 사유</dt><dd>' + reasons.length + '가지</dd></div><div><dt>발굴 횟수</dt><dd>' + (+m.cnt || 1) + '회</dd></div><div><dt>현장에서 더 본 징후</dt><dd>' + badN + '건</dd></div></dl><div class="fx-note">' + ic("help") + "<span>판단은 담당자 · 현장 징후는 기록과 보고서에 그대로 들어갑니다</span></div></section>" +
      safeCard(hid) +
      (absent ? '<button class="btn pri" type="button" data-act="absave" data-dock="1">' + (I.away || "") + '부재로 기록 저장 <small>' + esc(FD && FD.nextOf(hid) ? FD.nextOf(hid).line : "다음 시도 시간대 자동") + "</small></button>" // S12-v U4(F3): 기록 화면을 건너뛰고 바로 확정
        : '<a class="btn pri" data-dock="1" href="#talk:' + hid + '">' + (I.talk || "") + '상담 시작 <small>질문 ' + Math.min(5, questionsFor(hid, o).length) + "개 · 서비스 " + svcFor(h, badTypes(hid, o)).length + "개 준비됨</small></a>") +
      (absent ? '<a class="btn sm ghost" href="#record:' + hid + '">기록 화면에서 더 쓰기</a>' : '<span class="why">체크는 기록 화면에 미리 채워집니다</span>') +
      "</main>";
  }
  function bindCheck(want) {
    fxLay(); // 103회차 V4-4
    var k = pickHid(want); if (!k) return;
    var hid = k.hid, o = recOf(hid); o.checks = o.checks || {};
    if (FD && o.res === "absent") FD.bindAway(app, hid);
    var as = app.querySelector('[data-act="absave"]'); if (as) as.addEventListener("click", function () { vib(); saveRec(hid, o); saveRecord(k.c, hid); });
    app.querySelectorAll("[data-place]").forEach(function (b) { b.addEventListener("click", function () { o.res = b.dataset.place; vib(); saveRec(hid, o); render(); }); });
    app.querySelectorAll("[data-ck]").forEach(function (b) { b.addEventListener("click", function () {
      var c = checkList(BY[hid], o.res === "absent").filter(function (x) { return x.k === b.dataset.ck; })[0]; if (!c) return;
      var v = o.checks[c.k] === b.dataset.v ? "" : b.dataset.v; o.checks[c.k] = v;
      o.signs = o.signs || {}; if (v === "bad") o.signs[c.sign] = true; else delete o.signs[c.sign]; // S12-v U11: 명단 위기정보는 미리 징후로 넣지 않는다
      if (v !== "bad" && o.probs && o.probs[c.k]) { o.probs[c.k].forEach(function (t) { delete o.signs[t]; }); delete o.probs[c.k]; } // 문제 칩도 함께 거둠
      if (o.allOk) o.allOk = o.allOk.filter(function (x) { return x !== c.k; }); // 손으로 고친 줄은 «모두 괜찮음» 묶음에서 뺀다
      vib(); saveRec(hid, o); render();
    }); });
    app.querySelectorAll("[data-prob]").forEach(function (b) { b.addEventListener("click", function () { // FIELD-A4 문제 칩 → 현장 징후
      var key = b.dataset.prob, t = b.dataset.v; o.probs = o.probs || {}; o.signs = o.signs || {};
      var a = o.probs[key] = (o.probs[key] || []).slice(), i = a.indexOf(t);
      if (i >= 0) { a.splice(i, 1); var still = Object.keys(o.probs).some(function (x) { return (o.probs[x] || []).indexOf(t) >= 0; }); if (!still) delete o.signs[t]; } else { a.push(t); o.signs[t] = true; }
      keepPlace('[data-prob="' + key + '"][data-v="' + t + '"]'); saveRec(hid, o); render();
    }); });
    var ca = app.querySelector('[data-act="ckall"]'); if (ca) ca.addEventListener("click", function () {
      var L = checkList(BY[hid], o.res === "absent");
      if ((o.allOk || []).length) { o.allOk.forEach(function (x) { if (o.checks[x] === "ok") o.checks[x] = ""; }); o.allOk = []; }
      else o.allOk = L.filter(function (c) { return !o.checks[c.k]; }).map(function (c) { o.checks[c.k] = "ok"; return c.k; });
      vib(); saveRec(hid, o); render();
    });
    var em = app.querySelector('[data-act="emer"]'); if (em) em.addEventListener("click", function () { emerOpen[hid] = !emerOpen[hid]; keepPlace('[data-act="emer"]'); render(); });
    app.querySelectorAll('[data-act="emcall"]').forEach(function (a) { a.addEventListener("click", function () { // 걸면 켜진 안전 모드에 도움 요청 한 번(동료 안부에 알림)
      try { if (navigator.vibrate) navigator.vibrate([20, 60, 20]); } catch (e) { /* 무시 */ }
      if (safeOn(hid)) sendHelp(hid);
    }); });
    bindSafe(); bindHold(hid);
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
    var refW = FD ? FD.referWhy(hid) : "", wideT = !!fxWide(); // 108회차: 넓은 화면(폴드·태블릿·PC) 첫 칸으로
    var cards = sv.map(function (s) {
      var x = loaded ? SVDB[s[0]] : null, on = !!(o.svcs || {})[s[0]], op = !!svcOpen[hid + "|" + s[0]];
      // FIELD-I5 «원문 더 보기» — 접힘: 지원 대상·내용 앞부분 · 펼침: 대상·내용·신청·문의 전문(시안 v3 V8)
      var src = x && /^D2/.test(String(x.id || "")) ? "15108347" : "15090532";
      var body = x ? '<dl class="fx-dl"><dt>지원 대상</dt><dd>' + esc(op ? plain(x.target) : clip(plain(x.target), 46)) + "</dd><dt>지원 내용</dt><dd>" + esc(op ? plain(x.support) : clip(plain(x.support), 34)) + "</dd>" + (op ? "<dt>신청</dt><dd>" + esc(plain(x.apply)) + "</dd><dt>문의</dt><dd>" + esc(plain(x.contact)) + "</dd>" : "") + "</dl>"
        : loaded ? '<p class="mute">원문 자료에 이 서비스가 없습니다 · 복지로에서 확인</p>' : '<p class="mute">' + (svFail ? "연결되면 원문 요약을 다시 불러옵니다" : "원문 요약 불러오는 중…") + "</p>";
      // S12-x 66회차(미르 넘김 ③): 시안 v3 .svc 카드 — 고르는 단추(data-svc)는 그대로
      return '<div class="svc' + (on ? " on" : "") + '"><div class="h"><span><span class="tag">' + esc(s[2]) + "</span><br><b>" + esc(s[1]) + '</b></span>' + (x ? '<span class="fx-tag">' + src + "</span>" : "") + '<span class="pick" aria-hidden="true">' + I.check + "</span></div>" + body +
        '<div class="fx-svb">' + (x ? '<button type="button" class="fx-more" data-svmore="' + s[0] + '" aria-expanded="' + op + '">' + (op ? "접기" : "원문 더 보기") + "</button>" : "<span></span>") +
        '<button type="button" class="evb svc-t" data-svc="' + s[0] + '" aria-pressed="' + on + '">' + (on ? ii("check") + "연계 후보로 넣음" : ii("plus") + "연계 후보로 넣기") + "</button></div>" +
        '<div class="fx-note">' + ic("help") + "<span>요약일 뿐 선정 결정이 아닙니다 · 판정은 담당 확인</span></div></div>";
    }).join("");
    // S12-x 66회차: 시안 v3 scrField(consult) — 첫 칸(단계 줄 · 안전 모드 · 질문 순서) | 둘째 칸(받을 수 있는 서비스 · 의뢰 사유 · 기록으로)
    return '<main class="phx' + fxWide() + '">' + mini(4, hid) + hhCard(k.c, hid) +
      '<section class="card qwrap" aria-label="질문 순서 카드"><h3>질문 순서<span>현장 확인에서 고른 것부터</span></h3><div class="deck">' + deck + "</div>" + dots +
      (qi < Q.length ? '<div class="row2"><button type="button" class="btn sm ghost" data-act="qskip">넘기기</button><button type="button" class="btn sm pri" data-act="qok">물어봤어요' + ii("chevR") + '</button></div>' : "") + "</section>" + (wideT ? refW : "") + C2 + // 108회차 ⚙️ 파로(⑧-4): 넓은 화면은 «연계 의뢰 사유»를 첫 칸(질문 순서 아래)로 — 둘째 칸 = 시안 V16 talk side(받을 수 있는 서비스)만, 두 단 높이 균형
      '<section class="card" aria-label="받을 수 있는 서비스"><h3>받을 수 있는 서비스<span>고른 것 ' + Object.keys(o.svcs || {}).filter(function (x) { return o.svcs[x]; }).length + '개 → 의뢰서로</span></h3><div class="list svcs">' + cards + "</div>" +
      '<span class="why srcline">서비스 원문 요약입니다. 선정 결정이 아닙니다 · 출처: <i class="src-ico" aria-hidden="true"></i>한국사회보장정보원 중앙부처복지서비스(15090532)·지자체복지서비스(15108347) 공공데이터 2026-11-02 수집본 · 판정은 담당 공무원</span></section>' +
      (wideT ? "" : refW) + // S12-i3 연계 의뢰 사유(예시 칩 + 직접 입력) — 폰은 서비스 뒤 그대로
      '<a class="btn pri" data-dock="1" href="#record:' + hid + '">' + (I.record || "") + '상담 끝 · 기록하기 <small>고른 것 ' + Object.keys(o.svcs || {}).filter(function (x) { return o.svcs[x]; }).length + "개 미리 채움</small></a>" +
      '<span class="why">질문·서비스는 상담일지에 그대로 들어갑니다</span>' +
      "</main>";
  }
  function bindTalk(want) {
    fxLay(); // 103회차 V4-4
    var k = pickHid(want); if (!k) return;
    var hid = k.hid, o = recOf(hid), Q = questionsFor(hid, o);
    if (!SVDB && !svFail) needSvc().then(function () { if (AK.cur === "talk") render(); }, function () { if (AK.cur === "talk") render(); }); // 원문 없이도 이름은 보임 · 실패 안내는 한 번만 그림
    function step(mark) {
      var i = qIdx[hid] || 0, q = Q[i];
      if (mark && q) { var all = F.store.get("askChecked", {}) || {}, m = all[hid] || {}; m[q.key] = true; all[hid] = m; F.store.set("askChecked", all); }
      qIdx[hid] = i + 1; vib(); render();
    }
    var ok = app.querySelector('[data-act="qok"]'); if (ok) ok.addEventListener("click", function () { step(true); });
    var sk = app.querySelector('[data-act="qskip"]'); if (sk) sk.addEventListener("click", function () { step(false); });
    var re = app.querySelector('[data-act="qre"]'); if (re) re.addEventListener("click", function () { qIdx[hid] = 0; render(); });
    app.querySelectorAll("[data-svc]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); o.svcs = o.svcs || {}; o.svcs[b.dataset.svc] = !o.svcs[b.dataset.svc]; vib(); keepPlace('[data-svc="' + b.dataset.svc + '"]'); saveRec(hid, o); render(); }); });
    app.querySelectorAll("[data-svmore]").forEach(function (b) { b.addEventListener("click", function () { var kk = hid + "|" + b.dataset.svmore; svcOpen[kk] = !svcOpen[kk]; keepPlace('[data-svmore="' + b.dataset.svmore + '"]'); render(); }); });
    if (FD) FD.bindRefer(app, hid);
    bindSafe();
  }


  // ── 내보내기(app.js·다른 탭이 읽는 이름) ──
  AK.put({
    pickHid: function () { return pickHid; }, phEmpty: function () { return phEmpty; }, home: function () { return home; }, bindHome: function () { return bindHome; },
    isField: function () { return isField; }, checkList: function () { return checkList; }, badTypes: function () { return badTypes; }, checkView: function () { return checkView; },
    bindCheck: function () { return bindCheck; }, needSvc: function () { return needSvc; }, askedOf: function () { return askedOf; }, questionsFor: function () { return questionsFor; },
    talkView: function () { return talkView; }, bindTalk: function () { return bindTalk; },
    // 102회차: 시험·다른 탭이 읽는 현장 조각(FIELD-I4 제안 분 · A1 약속 · A3 위급 카드 · A4 문제 칩)
    fieldSugMin: function () { return sugMin; }, fieldSelMin: function () { return selMin; }, fieldPromise: function () { return promiseOf; },
    fieldEmer: function () { return emerCard; }, fieldSafeCard: function () { return safeCard; }, FIELD_PROB: function () { return PROB; }
  });
  AK.put2("SVDB", function () { return SVDB; }, function (v) { SVDB = v; });
  AK.put2("svFail", function () { return svFail; }, function (v) { svFail = v; });
  return relink;
};
