/* 복지 사각지대 현장 업무 도우미(닿음) — 기록 탭(#record) — 상담 후 기록 M5(record·bindRecord·saveRecord·recOf·saveRec) · 자동 정리(tidy·recDraft) · AI 요약(askAI) · 말하기(toggleMic·micRec) · 다음 할 일 카드(nextStepCard) · 되돌리기·고치기(reopenRec·toastAct·fixHid)
   101회차 ⚙️ 파로(2026-11-14): app/app.js 에서 그대로 옮겨 나눔(동작 변경 0). 화면 함수 본문은 app.js 때와 같은 글자·같은 들여쓰기.
   잇는 법: app.js 가 원래 자리 순서대로 DaeumTabs.record(AK) 를 부른다. AK = 공통 이름 창구(app.js·다른 탭의 이름을 «읽을 때의 값»으로 돌려줌).
   받는 이름은 relink() 가 지역 변수로 채우고(부를 때 한 번 + app.js 가 모든 탭을 읽은 뒤 한 번 더), 여러 파일이 함께 바꾸는 값은 AK.이름 으로 읽고 쓴다. */
(window.DaeumTabs = window.DaeumTabs || {}).record = function (AK) {
  "use strict";
  var F, SY, CH, U, BY, IND, app, I, ii, A, LS_REC, LS_SAFE, REFUSE_EX, esc, lsGet, lsSet, ymd, md, mdDot, hm, clip, vib, uniq, attempts, neighborLog,
      indText, ageLine, lastLog, daySumNums, statusOf, typesFor, SVC, svcFor, dayCtx, arriveOf, qcards, pickHid, phEmpty, FD, safeOn, safePush,
      bindSafe, checkList, badTypes, needSvc, LS_HEDIT, copy, toast, C2, render;
  function relink() {
    F = AK.F; SY = AK.SY; CH = AK.CH; U = AK.U; BY = AK.BY; IND = AK.IND; app = AK.app; I = AK.I;
    ii = AK.ii; A = AK.A; LS_REC = AK.LS_REC; LS_SAFE = AK.LS_SAFE; REFUSE_EX = AK.REFUSE_EX; esc = AK.esc; lsGet = AK.lsGet; lsSet = AK.lsSet;
    ymd = AK.ymd; md = AK.md; mdDot = AK.mdDot; hm = AK.hm; clip = AK.clip; vib = AK.vib; uniq = AK.uniq; attempts = AK.attempts;
    neighborLog = AK.neighborLog; indText = AK.indText; ageLine = AK.ageLine; lastLog = AK.lastLog; daySumNums = AK.daySumNums; statusOf = AK.statusOf; typesFor = AK.typesFor; SVC = AK.SVC;
    svcFor = AK.svcFor; dayCtx = AK.dayCtx; arriveOf = AK.arriveOf; qcards = AK.qcards; pickHid = AK.pickHid; phEmpty = AK.phEmpty; FD = AK.FD; safeOn = AK.safeOn;
    safePush = AK.safePush; bindSafe = AK.bindSafe; checkList = AK.checkList; badTypes = AK.badTypes; needSvc = AK.needSvc; LS_HEDIT = AK.LS_HEDIT; copy = AK.copy; toast = AK.toast;
    C2 = AK.C2; render = AK.render;
  }
  relink();
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
  /** 104회차 ⚙️ 파로C RECORD-A2(시안 V16 하루 마무리 «저장 안 한 기록 n가구 · 초안만 있습니다 [지금 저장]»):
      이 기기에 초안만 남고 «기록 저장»을 안 누른 가구 번호 목록. ids 를 주면 그 가구들만(오늘 일차 등).
      내용이 하나라도 있는 초안만 센다(현장 확인·징후·상황 고르기·연계 후보·메모·거절 사유) — 화면만 열어 본 집은 빼고,
      다른 기기에서 이미 저장해 마지막 기록이 초안보다 나중이면 뺀다(고치는 중인 집은 셈). 연결: 오늘 탭 하루 마무리 줄(파로A)·머리 작은 점(app.js COMMON-A2) */
  function unsavedRecs(ids) {
    var all = lsGet(LS_REC, {}) || {};
    function on(m) { return Object.keys(m || {}).some(function (k) { return m[k]; }); }
    return Object.keys(all).filter(function (hid) {
      var o = all[hid]; if (!o || !BY[hid] || (ids && ids.indexOf(hid) < 0)) return false;
      var c = o.cmp || {}, has = !!(String(o.memo || "").trim() || String(o.refuse || "").trim() || on(o.signs) || on(o.checks) || on(o.svcs) || (c.taps || 0) > 0 || on(c.cus));
      if (!has) return false;
      var L = lastLog(hid); return !(L && o.at && L.at >= o.at && fixHid !== hid);
    }).sort();
  }
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
      "<p><b>상황</b><span>" + (L.length ? esc(L.filter(function (l) { return !/^(대응|다음 확인|약속):/.test(l); }).slice(0, 4).join(" ")) : '<span class="empty">상황을 고르면 채워짐</span>') + "</span></p>" +
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
    if (!aiP) aiP = new Promise(function (ok, no) { var s = document.createElement("script"); s.src = "shared/ai.js?v=s12z109"; s.onload = function () { window.DaeumAI ? ok(window.DaeumAI) : no(new Error("ai")); }; s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); no(new Error("ai")); }; document.head.appendChild(s); })
      .catch(function (e) { aiP = null; throw e; });
    return aiP;
  }
  var NEED_OF_TYPE = { "주거": ["주거", "에너지"], "생계": ["생계"], "건강": ["의료"], "고립": ["돌봄"], "돌봄": ["돌봄"] };
  function aiText(o, ctx) { return F.mask((RC.lines(o.cmp, ctx).join(" ") + (o.memo ? " 말씀: " + tidy(o.memo) : "")).trim()).slice(0, 1000); }
  function aiCtx(hid, o, AI) {
    var h = BY[hid], pri = {};
    uniq(typesFor(h).concat(badTypes(hid, o))).forEach(function (t) { (SVC[t] || []).forEach(function (s) { pri[s[0]] = (pri[s[0]] || []).concat(NEED_OF_TYPE[t] || []); }); });
    var services = Object.keys(AK.SVDB || {}).map(function (k) { var s = AK.SVDB[k], tg = AI.needsFromRule(s.rule); return { id: s.id, name: s.name, org: s.provider, tags: uniq(tg.concat(pri[k] || [])), ptags: pri[k] ? uniq(pri[k]) : undefined, target: s.target, support: s.support, rule: s.rule }; });
    return { label: "방문 상담", factors: Object.keys(h.indicators || {}).filter(function (k) { return h.indicators[k]; }).map(function (k) { return { key: k, name: IND[k] || k }; }), services: services };
  }
  function askAI(hid, o, ctx) {
    if (aiBusy[hid]) return; aiBusy[hid] = true; render();
    var text = aiText(o, ctx), done = function (r) { aiBusy[hid] = false; var n = recOf(hid); n.ai = r; saveRec(hid, n); if (AK.cur === "record") render(); }; // 84회차 ②: 기다리는 동안 고친 상황·메모를 덮지 않게 최신 초안을 다시 읽어 ai 칸만 붙인다
    needAI().then(function (AI) { return needSvc().then(function () { return AI.summarize(text, aiCtx(hid, o, AI)); }).then(function (r) {
      if (r.source !== "ai") return done({ src: "rule", at: new Date().toISOString(), why: r.fallback ? "연결 실패" : "AI 꺼짐" });
      var byId = {}; Object.keys(AK.SVDB || {}).forEach(function (k) { byId[AK.SVDB[k].id] = AK.SVDB[k]; });
      done({ src: "ai", at: new Date().toISOString(), summary: F.mask(String(r.summary || "")).slice(0, 300), picks: (r.serviceIds || []).filter(function (id) { return byId[id]; }).slice(0, 3).map(function (id) { return { name: byId[id].name, why: F.mask(String((r.reasons || {})[id] || "")).slice(0, 120) }; }), use: false });
    }); }).catch(function () { done({ src: "rule", at: new Date().toISOString(), why: "연결 실패" }); });
  }
  function recAISec(hid, o) {
    var a = o.ai, busy = aiBusy[hid], hint = '<small class="dnote">보내기 전에 이름·주소·연락처를 가립니다 · «씨·어르신» 없이 쓴 이름은 다 못 가릴 수 있으니 이름은 쓰지 마세요</small>';
    if (busy) return '<section class="card draft rc-ai" aria-live="polite"><h3>AI 요약 · 연계 추천<span>묻는 중…</span></h3>' + hint + "</section>";
    if (a && a.src === "ai") return '<section class="card draft rc-ai" aria-live="polite"><h3>AI 요약 · 연계 추천<span>' + (a.use ? "기록에 넣음" : "담당자 확인 전") + "</span></h3>" +
      "<p><b>요약</b><span>" + esc(a.summary || "—") + "</span></p>" + (a.picks && a.picks.length ? "<p><b>추천</b><span>" + a.picks.map(function (p) { return "<b>" + esc(p.name) + "</b>" + (p.why ? " — " + esc(p.why) : ""); }).join("<br>") + "</span></p>" : "") +
      '<div class="row2"><button type="button" class="btn sm ghost" data-act="aiask">다시 묻기</button><button type="button" class="btn sm" data-act="aiuse" aria-pressed="' + !!a.use + '">' + (a.use ? ii("check") + "기록에 넣음" : "기록에 넣기") + "</button></div>" +
      '<small class="dnote">출처: 한국사회보장정보원 복지서비스 목록(15090532·15108347) 안에서만 고름 · 판정은 담당 공무원</small></section>';
    return '<section class="card draft rc-ai"><h3>AI 요약 · 연계 추천<span>누를 때만</span></h3>' +
      (a && a.src === "rule" ? '<p class="mute">AI에 연결되지 않아 위 «자동 정리» 문장을 그대로 씁니다.</p>' : "") +
      '<button type="button" class="btn sm ghost" data-act="aiask">' + (I.talk || "") + (a ? "다시 묻기" : "AI에게 요약·추천 받기") + "</button>" + hint + "</section>";
  }
  function recPaper(hid, o, ctx) {
    var h = BY[hid], c = o.cmp, nx = RC.nextOf(c.next, ctx.now), L = RC.lines(c, ctx).filter(function (l) { return !/^(대응|다음 확인|약속):/.test(l) && !/^본인이|^의사 확인/.test(l); });
    return RC.paperHtml({ hid: hid, area: h.area, date: mdDot(new Date()), reasons: indText(h), checks: ctx.checkN ? "점검 " + ctx.checkN + "항목 · 문제 " + ctx.badN + "항목" + (RC.vals(c, "sit").length ? " · " + RC.vals(c, "sit").join(", ") : "") : "",
      lines: L, memo: tidy(o.memo || ""), will: c.will, act: RC.vals(c, "act"), next: nx ? nx.text : "", prom: RC.vals(c, "prom") }); // 105회차: 약속 칸
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
        recAISec(hid, o) + C2 + recPaper(hid, o, ctx); // 104회차 ⑧-3(시안 v4 V16 record: main = 결과·상황 고르기·자동 문장·덧붙이기·AI | side = «실제 보고서 형태로 보기» 한 장) · 기록-개2: 초안 카드 빼고 보고서 미리보기 하나
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
        ["folder", "문서함", "복명서·상담일지가 채워짐", 'data-go="#docs"'],
        ["hist", "실적 · 할 일", "다시 방문·약속", 'data-go="#perf"']
      ]) + "</main>";
  }
  var micRec = null, micT = null;
  /** S12-x 84회차 ①: «쓰는 중» 판정 하나 — 초점이 글자 칸(INPUT·TEXTAREA·SELECT·contenteditable)이거나 받아쓰기 중이면 true.
      실시간·시계 다시 그리기가 쓰던 글(기록 직접 입력 #rcIn·칩 직접 쓰기 등)을 지우지 않게 세 곳이 함께 쓴다(record.js 도 window.isTyping 으로) */
  var NOTYPE = /^(button|submit|reset|checkbox|radio|range|file|color|image|hidden)$/i;
  function isTyping() {
    if (micRec) return true;
    var ae = document.activeElement; if (!ae || ae === document.body || ae === document.documentElement) return false;
    if (ae.isContentEditable) return true;
    if (ae.tagName === "TEXTAREA" || ae.tagName === "SELECT") return true;
    if (ae.tagName === "INPUT") return !NOTYPE.test(ae.type || "text");
    return !!(ae.hasAttribute && ae.hasAttribute("data-fill"));
  }
  window.isTyping = isTyping;
  function bindRecord(want) {
    var k = pickHid(want); if (!k) return;
    var hid = k.hid, o = recOf(hid), ctx = recCtx(hid, o);
    if (o.res === "met") { o.cmp = RC.sync(o.cmp, ctx); saveRec(hid, o); }
    function rerender() { saveRec(hid, o); render(); }
    function live() { // 입력 중엔 화면 전체를 다시 그리지 않고 초안·보고서 칸만 바꾼다(입력칸 포커스 유지)
      if (o.res !== "met") return;
      var d = app.querySelector('[data-rc="draft"]'); if (d) d.outerHTML = recDraftSec(hid, o, ctx);
      var p = app.querySelector(".rc-paperw"); if (p) p.outerHTML = recPaper(hid, o, ctx); // 78회차 ⓪-3: 늘 펼침(접힘 상태 없음)
    }
    app.querySelectorAll("[data-res]").forEach(function (b) { b.addEventListener("click", function () { o.res = b.dataset.res; vib(); rerender(); }); });
    app.querySelectorAll("[data-sign]").forEach(function (b) { b.addEventListener("click", function () { var s = b.dataset.sign; o.signs[s] = !o.signs[s]; rerender(); }); });
    app.querySelectorAll("[data-cf]").forEach(function (b) {
      b.addEventListener("click", function () { vib(); RC.openSheet(o.cmp, b.dataset.cf, ctx, { save: function (c) { o.cmp = c; saveRec(hid, o); }, close: function () { render(); } }); });
    });
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
    rec.onend = function () { clearInterval(micT); micRec = null; var n = recOf(hid), m = document.getElementById("memo"); n.memo = (m && m.isConnected ? m.value : base + got).trim(); saveRec(hid, n); render(); }; // 84회차 ㉓: 받아쓰는 동안 손으로 고친 글을 살린다(메모 칸 현재 값 기준)
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
    if (res === "met" && cm) RC.vals(cm, "prom").forEach(function (t, i) { // 105회차 ⚙️ 파로B(기록-추3): «약속» 줄에서 고른 것 = 약속 한 건씩(기한 = 다음 확인 날짜, 없으면 근무일 기준 재확인일) · 같은 글이 이미 있으면 건너뜀
      if (found.some(function (x) { return x.text === t; })) return;
      found.push({ id: "PR-" + now.getTime() + "-p" + i, householdId: hid, label: "가구 " + hid, area: h.area, text: t, kind: /서류|신청서/.test(t) ? "doc" : /전화|알려|연락|부탁/.test(t) ? "call" : /동행|방문/.test(t) ? "visit" : "check", due: nx && nx.due || dr.due, src: "방문 기록 · 약속", at: now.toISOString(), done: false, doneAt: null });
    });
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
    b.addEventListener("click", function () { clearTimeout(AK.toastT); el.className = "toast"; fn(); });
    el.appendChild(b); clearTimeout(AK.toastT); AK.toastT = setTimeout(function () { el.className = "toast"; }, ms || 5000);
  }


  // ── 내보내기(app.js·다른 탭이 읽는 이름) ──
  AK.put({
    recOf: function () { return recOf; }, refWhyOf: function () { return refWhyOf; }, memoNoWhy: function () { return memoNoWhy; }, saveRec: function () { return saveRec; },
    chosenSvcs: function () { return chosenSvcs; }, record: function () { return record; }, isTyping: function () { return isTyping; }, bindRecord: function () { return bindRecord; },
    saveRecord: function () { return saveRecord; }, nextStepCard: function () { return nextStepCard; }, reopenRec: function () { return reopenRec; },
    unsavedRecs: function () { return unsavedRecs; }
  });
  AK.put2("micRec", function () { return micRec; }, function (v) { micRec = v; });
  AK.put2("fixHid", function () { return fixHid; }, function (v) { fixHid = v; });
  return relink;
};
