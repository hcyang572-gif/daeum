/* 복지 사각지대 현장 업무 도우미(닿음) — 오늘 탭(#today) + 발굴 명단 엑셀 올리기(V4-2)
   103회차 ⚙️ 파로(2026-11-14): 정본 시안 v4 Version 14(_design/S12-z98_고도화시안/v4/index.html «오늘»·«명단 불러오기») 그대로 다시 짬.
     원장 TODAY-I1 시간줄을 지금 할 일 바로 아래 · I2 «n/4가구 · 부재 1» 진척 칩 · I3 사유 태그 1개+작은 순위 · I4 단계 띠가 하루 상태를 따름(todayScope)
          I6 빈 화면 «명단 불러오기» · I7 시연 동료 알림 처음 한 번만 · A1 약속·다시 들르기 줄 · A2 부재 «오늘 다시 들르기/다른 날로»(방문 탭 visitAgain·visitLater)
          A3 하루 마무리 카드 · A4 «오늘 몫 미리 받아 둠» 표시 · A5 혼자 사는 집 출발 때 안전 모드 잠깐 안내
     V4-2 명단 불러오기 3단계(파일 고르기 → 읽은 열 확인 → 오늘 명단에 반영, 끌어 놓기·다시 올리기·시연 명단으로 시작) — 계산은 shared/import_check.js
     V4-4 큰 화면: 폴드·태블릿 2단 / 태블릿 가로(1100↑)·PC 3단(4·4·4, 명단 5·4·3) · 머리 줄은 칸 위 한 줄(<!--hd--> 표지, app.js colsOf) · 단 첫 카드 윗선 맞춤(alignCols)
   104회차 ⚙️ 파로A(2026-11-14): 정본 시안 v4 Version 16 — 맨 위 명단 줄 «새 명단 올리기»(listStrip, 옆 카드 글자 단추 삭제) · 다시 올리기 «지금 명단 바꾸기»(기록 유지 안내·토스트)
     · 열 맞춤은 다른 길로 채운 열도 셈(시안 14/14) · 하루 마무리 «저장 안 한 기록»(RECORD-A2) · «복명서 바로 받기» = AK.dayZip(보고 탭 연결 지점, 없으면 #docs)
   겉모습은 app/tab_today.css(시안 CSS를 tx- 이름으로 옮김). 화면 문구·숫자는 시연 가상 데이터에서 계산(시안의 고정 숫자를 베끼지 않음).
   잇는 법: app.js 가 원래 자리 순서대로 DaeumTabs.today(AK) 를 부른다. AK = 공통 이름 창구, 받는 이름은 relink() 가 채운다. */
(window.DaeumTabs = window.DaeumTabs || {}).today = function (AK) {
  "use strict";
  var F, SH, IM, D, BY, I, A, esc, lsGet, lsSet, md, clip, meta, listIds, roundYm, deadline, rankBy, indText, ageLine, statusOf, dayCtx, syncChip, FD, C2, C3, render, ymd;
  function relink() {
    F = AK.F; SH = AK.SH; IM = AK.IM; D = AK.D; BY = AK.BY; I = AK.I || {}; A = AK.A; esc = AK.esc;
    lsGet = AK.lsGet; lsSet = AK.lsSet; md = AK.md; clip = AK.clip; meta = AK.meta; listIds = AK.listIds; roundYm = AK.roundYm;
    deadline = AK.deadline; rankBy = AK.rankBy; indText = AK.indText; ageLine = AK.ageLine; statusOf = AK.statusOf; dayCtx = AK.dayCtx;
    syncChip = AK.syncChip; FD = AK.FD; C2 = AK.C2; C3 = AK.C3; render = AK.render; ymd = AK.ymd;
  }
  relink();
  var LS_SDEMO = "daeum.s12.safeDemo", LS_AGAIN = "daeum.officer.again", LS_IMP = "daeum.s11.import";
  var IMP_DEMO = "발굴대상자조회_2026-10_가상.xlsx";
  // TODAY-I7: 시연 동료 안전 알림은 «처음 한 번만» — 한 번 닫으면(어느 날이든) 다시 띄우지 않는다. 띄우는 쪽(app.js safeAlerts)은 «오늘 닫았나»만 보므로 닫은 기록을 오늘로 옮겨 둔다
  function sdemoOnce() { try { var s = lsGet(LS_SDEMO, ""); if (s && s !== ymd(new Date())) lsSet(LS_SDEMO, ymd(new Date())); } catch (e) { /* 저장소 막힘 — 그대로 */ } }
  sdemoOnce();

  // ── 아이콘 = 실제 앱 아이콘 체계 78(시안 MAPI 별칭 그대로) ──
  var MAPI = { today: "calendar", visit: "route", alert: "warn", spark: "aichk", dl: "down", file: "folder", undo: "replay", home: "house", chev: "chevR", up: "chevU", down: "chevD", rec: "record", rep: "report" };
  function ic(k) { return I[MAPI[k] || k] || ""; }
  // ── 시안 공통 조각(tx- 이름) ──
  function tag(t, c, k) { return '<span class="tx-tag' + (c ? " tx-" + c : "") + '">' + (k ? ic(k) : "") + t + "</span>"; }
  function src(t) { return '<span class="tx-src">' + ic("db") + t + "</span>"; }
  function secT(h, right) { return '<div class="tx-sec-t"><h2>' + h + "</h2>" + (right || "") + "</div>"; }
  function ph(h, sub, right) { return '<div class="tx-ph"><div class="tx-tt"><h1>' + h + "</h1>" + (sub ? "<p>" + sub + "</p>" : "") + "</div>" + (right || "") + "</div>"; }
  function ring(p) { var C = 2 * Math.PI * 8; return '<svg class="tx-pr" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="#E2DDD4" stroke-width="3"/><circle cx="10" cy="10" r="8" fill="none" stroke="#1F6676" stroke-width="3" stroke-linecap="round" stroke-dasharray="' + (C * p).toFixed(1) + " " + C.toFixed(1) + '" transform="rotate(-90 10 10)"/></svg>'; }
  function stTag(st) { return st === "done" ? tag("만남", "ok") : st === "absent" ? tag("부재", "w") : st === "refused" ? tag("거절", "") : ""; }
  function li(k, b, s, cls, attr) { return '<div class="tx-li"' + (attr || ' style="cursor:default"') + '><span class="tx-ico' + (cls ? " tx-" + cls : "") + '">' + ic(k) + '</span><span class="tx-lc"><b>' + b + "</b><span>" + s + "</span></span></div>"; }
  function modeOf() { return document.documentElement.getAttribute("data-mode") || "phone"; }
  function many() { var m = modeOf(); return m === "pc" || (m === "tab" && (window.innerWidth || 0) >= 1100); } // 시안 many(): PC · 태블릿 가로(1100↑)
  function wideHd() { return /^(tab|pc)$/.test(modeOf()); } // 머리 줄을 칸 위 한 줄로(app.js colsOf 와 같은 판정)

  // ── 하루 값(시안 dayState 를 실제 기록에서) ──
  function depName() {
    var VD = AK.visitDay, d = AK.visitDepNow ? AK.visitDepNow() : VD ? VD.normDep(lsGet(VD.DEP_KEY, null)) : { kind: "work", time: "09:30", text: "" }; // 107회차: 방문 탭과 같은 자동 판정(위치 받음·시연 → 지금 위치)
    return { name: d.kind === "here" ? "지금 위치" : d.kind === "text" ? d.text || "직접 입력한 곳" : "내 근무지", time: d.time };
  }
  function againMap() { var m = lsGet(LS_AGAIN, {}) || {}, t = ymd(new Date()), o = {}; Object.keys(m).forEach(function (k) { if (m[k] === t) o[k] = 1; }); return o; }
  function openPr(id) { try { var all = AK.prAll(); return F.promises && F.promises.open ? F.promises.open(all, id)[0] || null : null; } catch (e) { return null; } }
  function dayModel() {
    var c = dayCtx(); if (!c) return null;
    var ids = c.d.ids, s = c.d.s, res = null;
    try { s = (AK.visitSched ? AK.visitSched(ids) : null) || c.d.s; } catch (e) { s = c.d.s; }
    try { res = AK.visitResched ? AK.visitResched(c.d) : null; } catch (e) { res = null; }
    var st = {}, met = 0, ab = 0, rf = 0;
    ids.forEach(function (id) { var x = statusOf(id); st[id] = x; if (x === "done") met++; else if (x === "absent") ab++; else if (x === "refused") rf++; });
    var late = res && res.show && res.shift > 0 ? res : null, arr = {}, lunch = {};
    (s.rows || []).forEach(function (r) { arr[r.id] = r.arrive; if (r.lunchBefore) lunch[r.id] = 1; });
    if (late) late.rows.forEach(function (r) { if (!r.done) arr[r.id] = r.arrive; });
    var ret = late && late.back ? late.back : (s.back && s.back.arrive) || s.end || "";
    return { c: c, ids: ids, s: s, st: st, met: met, ab: ab, rf: rf, done: met + ab + rf, total: ids.length, cur: c.planned[0] || null, late: late, arr: arr, lunch: lunch, ret: ret,
      ag: againMap(), dl: c.d.date ? md(c.d.date) : "다음 방문일", dep: depName() };
  }
  /** RECORD-A2: 오늘 집 중 기록 초안(daeum.s12.rec)만 있고 «저장»을 안 누른 집 — 저장하면 tab_record 가 초안을 지운다 */
  function unsaved(Dm) { var all = lsGet(AK.LS_REC, {}) || {}; return Dm.ids.filter(function (id) { return !!all[id]; }); }
  function reasonOf(id) { var r = rankBy()[id], w = r && r.line ? r.line.replace(/^.*?번째( · )?/, "").split(" · ")[0] : ""; return w || indText(BY[id])[0] || "발굴 명단"; }
  function rankOf(id) { var r = rankBy()[id], m = meta()[id] || {}; return r && r.listRank != null ? r.listRank : m.prio || "—"; }
  function prioTag(id) { var m = meta()[id] || {}; return m.lonely ? "고독사 우선방문" : m.child ? "e아동 우선방문" : indText(BY[id])[1] || ""; }
  /** 방금 부재(가장 최근 기록이 이 집 부재이고 아직 «다시 들르기»를 안 고름) */
  function absentNow(Dm) {
    var best = null, bt = "", lt = "";
    Dm.ids.forEach(function (id) { var L = AK.lastLog(id); if (!L || !L.at) return; if (L.at > lt) lt = L.at; if (Dm.st[id] === "absent" && !Dm.ag[id] && L.at > bt) { bt = L.at; best = id; } });
    return best && bt === lt && Dm.cur ? best : null;
  }
  /** TODAY-A2 «오늘 다시 들르기» 시각 미리 셈 — 방문 탭 visitAgain 과 같은 규칙(추천 시간대가 오후면 맨 끝) */
  function againAt(Dm, hid) {
    try {
      var pf = F.visitTime ? F.visitTime.profile(AK.attempts(), hid, { neighborLog: AK.neighborLog() }) : null, VD = AK.visitDay;
      var rest = Dm.ids.filter(function (id) { return id !== hid; }), left = rest.filter(function (id) { return Dm.st[id] === "planned"; }), done = rest.filter(function (id) { return Dm.st[id] !== "planned"; });
      var k = VD ? VD.againSlot(left, pf && pf.best ? pf.best.k : "") : left.length, ids = done.concat(left.slice(0, k), [hid], left.slice(k));
      var row = AK.sched(ids).rows.filter(function (x) { return x.id === hid; })[0];
      return { at: row ? row.arrive : "", pf: pf, hint: VD && pf ? VD.absHint(pf) : "" };
    } catch (e) { return { at: "", pf: null, hint: "" }; }
  }
  function todayScope() { // TODAY-I4: 출발 전 = 방문 계획 · 현장 중 = 현장 방문(안전 모드면 동료 안부) · 하루 마무리 = 연계
    var Dm = dayModel(); if (!Dm || !Dm.total) return "plan";
    if (!Dm.cur) return "link";
    return Dm.done || lsGet(AK.LS_SAFE, null) ? "visit" : "plan";
  }

  // ═════ 지금 할 일 카드(시안 nowCard) ═════
  function nowCard(Dm) {
    if (!Dm.cur) { // TODAY-A3 하루 마무리
      var t = ymd(new Date()), kept = 0;
      try { kept = AK.prAll().filter(function (p) { return p.done && p.doneAt && ymd(p.doneAt) === t; }).length; } catch (e) { kept = 0; }
      var abs = Dm.ids.filter(function (id) { return Dm.st[id] === "absent"; }), uns = unsaved(Dm);
      return '<section class="tx-card tx-now"><div class="tx-kick">하루 마무리 · ' + esc(Dm.dl) + "</div>" +
        '<div class="tx-big" style="margin-top:8px"><b class="tx-num">' + esc(Dm.ret || "—") + "</b><span>근무지 복귀 · 이동 " + (Dm.s.travelMin || 0) + "분 · 상담 " + (Dm.s.consultMin || 0) + "분</span></div>" +
        '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' + tag("만남 " + Dm.met, "ok") + tag("부재 " + Dm.ab, "w") + tag("거절 " + Dm.rf, "") + tag("약속 지킴 " + kept, "g") + "</div>" +
        (uns.length ? '<div class="tx-info" style="margin-top:12px;background:var(--warnBg);color:var(--warnInk);box-shadow:none">저장 안 한 기록 ' + uns.length + "가구 · " + esc(uns.slice(0, 3).join("·") + (uns.length > 3 ? " 외" : "")) + ' — 초안만 있습니다 <a class="tx-btn tx-t tx-in" href="#record:' + esc(uns[0]) + '">지금 저장</a></div>' : "") +
        (abs.length ? '<div class="tx-ridge"></div>' + abs.map(function (id) { return '<div class="tx-note">' + ic("away") + "<span>" + esc(id) + ' 부재 · <button type="button" class="tx-btn tx-t tx-in" data-tx="later" data-v="' + esc(id) + '">다음 근무일로 옮기기</button></span></div>'; }).join("") : "") +
        '<div class="tx-acts"><a class="tx-btn tx-s" href="#perf">' + ic("chart") + '실적 보기</a><a class="tx-btn tx-p" href="#docs" data-tx="zip">' + ic("dl") + "복명서 바로 받기</a></div></section>";
    }
    var ab = absentNow(Dm);
    if (ab) { // TODAY-A2 방금 부재
      var h = BY[ab], ag = againAt(Dm, ab), n = (ag.pf && ag.pf.absences ? ag.pf.absences.length : 0) || 1;
      return '<section class="tx-card tx-now"><div class="tx-kick" style="color:var(--warnInk)">방금 · 부재</div><div class="tx-row1" style="margin-top:8px"><span class="tx-tile tx-ab">' + (Dm.ids.indexOf(ab) + 1) + '</span><div class="tx-nm"><b>' + esc(h.area + " " + ab) + "</b><span>" + esc(ageLine(h) + " · 부재 " + n + "번째") + "</span></div></div>" +
        '<div class="tx-note" style="margin-top:10px">' + ic("clock") + "<span>" + esc(ag.hint || "다시 들를 때를 골라 주세요") + "</span></div>" +
        '<div class="tx-acts"><button type="button" class="tx-btn tx-p" data-tx="again" data-v="' + esc(ab) + '">' + ic("replay") + "오늘 다시 들르기" + (ag.at ? " · " + esc(ag.at) : "") + '</button><button type="button" class="tx-btn tx-s" data-tx="later" data-v="' + esc(ab) + '">다른 날로</button></div></section>';
    }
    var id = Dm.cur, o = BY[id], i = Dm.ids.indexOf(id) + 1, m = meta()[id] || {}, p2 = prioTag(id);
    var late = Dm.late ? '<div class="tx-info" style="margin-top:12px;background:var(--warnBg);color:var(--warnInk);box-shadow:none">' + esc((Dm.late.last && Dm.late.last.id) || "앞 가구") + " 상담이 길어져 뒤 집이 " + Dm.late.shift + "분 밀렸습니다 · 복귀 " + esc(Dm.ret) + " 예상</div>" : "";
    return '<section class="tx-card tx-now"><div class="tx-kick">지금 할 일 · ' + i + "번째 가구 · " + esc(Dm.dl) + "</div>" +
      '<div class="tx-row1" style="margin-top:10px"><span class="tx-tile tx-now">' + i + '</span><div class="tx-nm"><b>' + esc(o.area + " " + id) + "</b><span>" + esc(ageLine(o) + (m.aiRes ? " · AI초기상담 " + m.aiRes : "")) + '</span></div><div class="tx-tm"><b>' + esc(Dm.arr[id] || "—") + "</b><small>도착 예정</small></div></div>" +
      '<div class="tx-tags">' + tag(esc(reasonOf(id)), "w") + (p2 ? tag(esc(p2), "") : "") + "</div>" + late + "</section>";
  }
  // ═════ 오늘 방문 순서 시간줄(TODAY-I1·I3·A1) ═════
  function timeline(Dm) {
    var items = [[Dm.dep.time, null, "출발 · " + Dm.dep.name]];
    Dm.ids.forEach(function (id, i) { if (Dm.lunch[id]) items.push(["12:00", null, "점심 12:00–13:00"]); items.push([Dm.arr[id] || "", id, i]); });
    items.push([Dm.ret, null, "복귀 · 문서 정리"]);
    var all = !Dm.cur;
    return items.map(function (it) {
      if (!it[1]) return '<div class="tx-tli tx-brk' + (all || (/^출발/.test(it[2]) && Dm.done) ? " tx-past" : "") + '"><span class="tx-tm">' + esc(it[0]) + '</span><span class="tx-dot"></span><span class="tx-bd">' + esc(it[2]) + "</span><span></span></div>";
      var id = it[1], o = BY[id], st = Dm.st[id], pr = Dm.ag[id] ? null : openPr(id), isAp = !!Dm.ag[id] || !!pr, apT = isAp && id !== Dm.cur; // 지금 집은 약속이 있어도 번호 타일(시안)
      var tcls = id === Dm.cur ? "now" : st === "done" ? "done" : st === "absent" ? "ab" : isAp ? "ap" : "";
      var sub = apT ? tag("약속", "g", "calendar") + "<em>" + (Dm.ag[id] ? "부재 · 오늘 다시 들르기" : "다시 방문 · " + esc(clip(pr.text, 14))) + "</em>"
        : tag(esc(reasonOf(id)), st === "planned" ? "w" : "") + '<span class="tx-rk">' + esc(rankOf(id)) + "순위</span>";
      var lateT = Dm.late && st === "planned" ? ' style="color:var(--warnInk)"' : "";
      var done = st === "done" || st === "refused"; // 끝난 가구는 눌러서 기록 고치기(U16 F4 — app.js data-fix)
      return '<a class="tx-tli' + (id === Dm.cur ? " tx-cur" : "") + (st !== "planned" ? " tx-past" : "") + (apT ? " tx-ap" : "") + '" href="#' + (done ? "record:" : "home:") + id + '"' + (done ? ' data-fix="' + id + '"' : "") + ">" +
        '<span class="tx-tm"' + lateT + ">" + esc(it[0]) + '</span><span class="tx-tile tx-sm' + (tcls ? " tx-" + tcls : "") + '">' + (apT ? ic("calendar") : it[2] + 1) + "</span>" +
        '<span class="tx-bd"><b>' + esc(o.area + " " + id) + '</b><span class="tx-sub">' + sub + '</span></span><span class="tx-st">' + stTag(st) + "</span></a>";
    }).join("");
  }
  function offlineLine(Dm) { // TODAY-A4: 앱이 이 기기에 사본을 받아 둔 뒤(서비스워커가 붙음)만 — 연동이 끊기면 강조
    var sw = navigator.serviceWorker && navigator.serviceWorker.controller; if (!sw) return "";
    var off = !navigator.onLine || /out|off/.test(syncChip().cls || "");
    return '<div class="tx-offline' + (off ? " tx-hot" : "") + '">' + (I.checkC || "") + "<span>오늘 몫 미리 받아 둠 · " + Dm.total + "가구·서비스 원문 · 신호 없어도 열림</span></div>";
  }
  // ═════ 옆 칸: 발굴 명단 · 남은 기한·주소 정리 ═════
  function listStats() {
    var ids = listIds(), m = meta(), ar = {}, un = 0, pv = 0;
    ids.forEach(function (id) { var a = BY[id].area, x = m[id] || {}, u = !/처리\s*완료|완료/.test(x.proc || ""); ar[a] = ar[a] || [0, 0]; ar[a][0]++; if (u) { ar[a][1]++; un++; } if (x.lonely || x.child) pv++; });
    var areas = Object.keys(ar).sort(function (a, b) { return ar[b][0] - ar[a][0] || (a < b ? -1 : 1); }).map(function (a) { return [a, ar[a][0], ar[a][1]]; });
    return { ids: ids, un: un, pv: pv, areas: areas, imp: lsGet(LS_IMP, null) || {} };
  }
  function impLabel(imp) {
    var virt = imp.demo || /가상/.test(imp.name || ""), rec = imp.at && Date.now() - imp.at < 30 * 60000;
    return (imp.demo ? "기본 탑재" : rec ? "방금 올림" : imp.at ? md(new Date(imp.at)) + " 올림" : "불러옴") + (virt ? "(가상)" : "");
  }
  function listCard() {
    var L = listStats(), mx = L.areas.length ? L.areas[0][1] : 1, virt = L.imp.demo || /가상/.test(L.imp.name || "");
    return '<section class="tx-card"><div style="display:flex;align-items:baseline;gap:8px"><div style="flex:1"><div class="tx-kick tx-t">발굴 명단 · ' + esc(impLabel(L.imp)) + '</div><b style="font-size:calc(17px * var(--tz));letter-spacing:-.03em">' + esc(roundYm() + " · " + L.ids.length + "가구 · " + L.areas.length + "개 읍면") + "</b></div></div>" +
      '<div class="tx-big" style="margin-top:10px"><b class="tx-num">' + L.un + '</b><span>미처리 · 우선방문 <b class="tx-num" style="font-size:inherit;color:var(--gold)">' + L.pv + "</b>가구</span></div>" +
      '<div class="tx-bars" style="margin-top:12px">' + L.areas.slice(0, 6).map(function (a) { return '<div class="tx-bar-r"><span>' + esc(a[0]) + '</span><span class="tx-tr"><i style="width:' + Math.round(a[2] / mx * 100) + '%"></i></span><span class="tx-v">' + a[2] + "/" + a[1] + "</span></div>"; }).join("") + "</div>" +
      '<div class="tx-ridge"></div><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' + src("행복이음 «발굴대상자 조회» 엑셀" + (virt ? " · 가상" : "")) + "</div></section>"; // V16-3 입구는 맨 위 명단 줄 하나
  }
  // V16-1·2 오늘 탭 맨 위 명단 줄 — 모든 폭에서 첫 단 맨 위 · «새 명단 올리기»(청록 테두리, 주 단추보다 한 단계 아래) · 방금 올림이면 테두리 강조(tx-just)
  var JUST = null; // {re: 다시 올림?} — 이 화면을 연 동안만
  function listStrip() {
    var L = listStats(), when = JUST ? (JUST.re ? "방금 다시 올림 · 처리 기록 그대로" : "방금 올림") : L.imp.at ? md(new Date(L.imp.at)) + " 올림" : L.imp.demo ? "기본 탑재(가상)" : "불러옴";
    return '<section class="tx-card tx-flat tx-lstrip' + (JUST ? " tx-just" : "") + '"><span class="tx-ico">' + ic("folder") + '</span><span class="tx-lc"><b>' + esc("발굴 명단 · " + roundYm() + " 차수 " + L.ids.length + "가구") + "</b><span>" + esc(when + " · 미처리 " + L.un) + "</span></span>" +
      '<button type="button" class="tx-btn tx-up" data-tx="imp">' + ic("upload") + '<span class="tx-lb">새 명단 올리기</span></button></section>';
  }
  function dueCard() {
    var dl = deadline(), per = dl.perDay || 5, dp = dl.until ? F.deadline.plan(0, dl.until, per) : null;
    var remain = listIds().filter(function (id) { var s = statusOf(id); return s !== "done" && s !== "refused"; }).length;
    var due;
    if (dp && dp.set) {
      var vd = dp.days.filter(function (x) { return x.kind !== "today"; }).length, over = Math.max(0, remain - Math.floor(vd * per * (1 - A.missRate)));
      due = li("clock", "남은 기한 " + dp.left + "근무일", remain + "가구 · 하루 " + per + "가구면 " + Math.ceil(remain / per) + "근무일 · 기한 넘길 가구 " + over, "g");
    } else due = '<a class="tx-li" href="#plan"><span class="tx-ico tx-g">' + ic("clock") + '</span><span class="tx-lc"><b>남은 기한</b><span>기한을 넣으면 하루 몇 가구인지 셈</span></span>' + ic("chev") + "</a>";
    var need = FD && FD.addrNeed ? listIds().filter(function (id) { try { return !!FD.addrNeed(id); } catch (e) { return false; } }).length : null;
    // 도로명주소 정리(S12-i3 ①): 시안은 한 줄 — 누르면 «확인 필요» 가구 목록(FD.addrCard)을 그 아래 펼친다(기능 유지, 평소엔 접힘)
    var addr = need != null ? '<button type="button" class="tx-li" data-tx="addr" aria-expanded="' + addrOpen + '"><span class="tx-ico">' + ic("pin") + '</span><span class="tx-lc"><b>도로명주소 정리</b><span>«확인 필요» ' + need + "가구 표시</span></span>" + ic(addrOpen ? "up" : "down") + "</button>" : "";
    return '<section class="tx-card tx-flat"><div class="tx-lst">' + due + addr + "</div></section>" + (addrOpen && FD ? FD.addrCard() : "");
  }
  // ═════ 셋째 칸: 동료 · 지금(큰 화면) · 맡는 구간 · 이 탭의 다른 기능 ═════
  var scopeOpen = false, addrOpen = false;
  function scopeCard(open) {
    var S6 = [["방문 계획", "일차·순서"], ["동선", "지도·길안내"], ["현장 방문", "집 앞 요약·확인"], ["동료 안부", "시간 넘기면 알림"], ["기록", "상황 고르면 문장"], ["연계", "서비스·의뢰서·보고"]];
    var row = function (n, b, s, me) { return '<div class="tx-sr2' + (me ? " tx-me" : "") + '"><i>' + n + "</i><span><b>" + b + "</b>" + s + "</span></div>"; };
    var body = open ? '<div class="tx-scope" style="margin-top:10px">' + row("·", "한국사회보장정보원", "위기정보 수집, 발굴 명단 · 시작 · 기존 체계") + row("·", "시군구·읍면동 배정", "담당 공무원에게 · 기존 체계") +
      '<div class="tx-band">' + S6.map(function (s, i) { return row("0" + (i + 1), s[0], s[1], 1); }).join("") + "</div>" + row("·", "행복이음", "입력·서비스 결정 · 기존 체계") + row("·", "사후 관리", "재방문·모니터링 · 끝 · 기존 체계") +
      '<div class="tx-note" style="margin-top:6px">' + ic("help") + "<span>회색은 지금 쓰는 체계 그대로입니다. 행복이음 입력과 서비스 결정은 닿음이 대신하지 않습니다.</span></div></div>" : "";
    var appic = '<img src="shared/icons/daeum.svg" alt="" style="width:26px;height:26px;border-radius:7px">';
    return '<section class="tx-card tx-flat"><button type="button" class="tx-li" style="padding:0;min-height:48px" data-tx="scope" aria-expanded="' + !!open + '"><span class="tx-ico">' + appic + '</span><span class="tx-lc"><b>닿음이 맡는 구간</b><span>발굴 업무 전 과정 중 어디인지</span></span>' + ic(open ? "up" : "down") + "</button>" + body + "</section>";
  }
  function peers() { // 팀 연동이면 실제 팀원, 아니면 시연 동료(가상)
    var T = window.DaeumTeam, b = T && T.board ? T.board() : null, out = [];
    if (b && b.members && b.members.length > 1) {
      var p1 = T.peer(), p2 = T.lead();
      b.members.forEach(function (mm) {
        if (mm.me) return; var v = T.view(mm.id) || {}, role = p1 && p1.id === mm.id ? "1차 동료" : p2 && p2.id === mm.id ? "2차 팀장" : "같은 팀";
        var now = v.now ? "방문 중 · " + v.now.el + "분째" : v.done && v.done.length && !v.left ? "오늘 마침 · " + v.done.length + "가구" : v.done && v.done.length ? "완료 " + v.done.length + "가구" : v.lead ? "사무실" : "기록 없음";
        out.push([mm.alias || "팀원", role, now, role === "2차 팀장" ? "g" : v.now ? "" : "n"]);
      });
      return out.slice(0, 4);
    }
    return [["박주무관", "1차 동료", "방문 중 · 12분째", ""], ["김팀장", "2차 팀장", "사무실", "g"], ["이주무관", "같은 팀", "오늘 마침 · 4가구", "n"]];
  }
  function teamMini() {
    var P = peers(); if (!P.length) return "";
    return secT("동료 · 지금", '<button type="button" class="tx-lk" data-tx="team">안부' + ic("chev") + "</button>") +
      '<section class="tx-card tx-flat" style="padding:4px 14px"><div class="tx-lst">' + P.map(function (p, i) { return '<div class="tx-li" style="cursor:default;' + (i ? "" : "box-shadow:none") + '"><span class="tx-av' + (p[3] ? " tx-" + p[3] : "") + '">' + esc(p[0].charAt(0)) + '</span><span class="tx-lc"><b>' + esc(p[0]) + "</b><span>" + esc(p[2]) + "</span></span>" + tag(esc(p[1]), "") + "</div>"; }).join("") + "</div></section>";
  }
  function others() {
    return secT("이 탭의 다른 기능") + '<section class="tx-card tx-flat" style="padding:4px 14px"><div class="tx-lst">' + [["route", "방문 계획", "일차·순서 바꾸기", "#plan"], ["nav", "동선·길안내", "네이버 지도", "#route"], ["chart", "실적·사후관리", "재방문·약속", "#perf"]]
      .map(function (r) { return '<a class="tx-li" href="' + r[3] + '">' + ic(r[0]) + '<span class="tx-lc"><b>' + r[1] + "</b><span>" + r[2] + "</span></span>" + ic("chev") + "</a>"; }).join("") + "</div></section>";
  }
  /** 행동 단추 자리(시안 dockHTML·headActs): 터치 기기 = 셸이 옮기는 [data-dock] · PC = 쪽 머리 오른쪽(주 단추 tx-gox 는 화살 원) */
  function acts(sec, act) {
    if (modeOf() !== "pc") return { dock: '<div class="tx-dk" hidden>' + (sec || "") + act + "</div>", head: "" };
    var strip = function (h) { return h.replace(/ data-dock(?:-lbl|-sub)?="[^"]*"/g, ""); }, a = strip(act);
    if (/tx-gox/.test(a)) a = a.replace(/<svg[\s\S]*?<\/svg>/, "").replace(/<\/a>$/, '<span class="tx-ar">' + ic("arrow") + "</span></a>").replace('class="tx-btn tx-p', 'class="tx-btn tx-p tx-go');
    return { dock: "", head: '<div class="tx-btns" style="flex:none;flex-wrap:nowrap">' + (sec ? strip(sec) : "") + a.replace('class="tx-btn tx-p', 'class="tx-btn tx-p tx-glow') + "</div>" };
  }
  function right(r, ac) { return ac.head ? '<div style="display:flex;gap:10px;align-items:center">' + (r || "") + ac.head + "</div>" : r || ""; }
  var PROXY = '<button type="button" id="listFile" hidden data-tx="imp" tabindex="-1" aria-hidden="true"></button>'; // app.js «명단 불러오기»(data-pick)가 #listFile 을 누른다 → 명단 불러오기 화면

  // ═════ 화면 조립 — 칸 [a, b, c] · 큰 화면 머리 줄은 <!--hd--> ═════
  function page(cls, head, cols, top) {
    var m = modeOf(), hd = wideHd(), t = top || "";
    var lead = m === "phone" ? t + head : hd ? "<!--hd-->" + head + (t ? '<div class="tx-top">' + t + "</div>" : "") + "<!--/hd-->" : head + (t ? '<div class="tx-top">' + t + "</div>" : "");
    return '<main class="tx-main m3' + (cls ? " " + cls : "") + '">' + lead + cols[0] + (cols.length > 1 ? C2 + cols[1] : "") + (cols.length > 2 ? C3 + cols[2] : "") + "</main>";
  }
  function today() {
    if (IMPS) return impView();
    var Dm = dayModel(), L = listIds();
    if (!Dm || !L.length) return emptyView(L);
    var first = Dm.cur, pr = Math.round(Dm.done / (Dm.total || 1) * 100) / 100;
    var prog = '<span class="tx-prog">' + ring(pr) + '<span class="tx-num">' + Dm.done + "/" + Dm.total + "가구</span>" + (Dm.ab ? '<span class="tx-ab">· 부재 ' + Dm.ab + "</span>" : "") + "</span>";
    var main = listStrip() + nowCard(Dm) + secT("오늘 방문 순서", '<a class="tx-lk" href="#plan">순서 바꾸기' + ic("chev") + "</a>") +
      '<section class="tx-card tx-flat" style="padding:6px 0 10px"><div class="tx-tl">' + timeline(Dm) + "</div>" + offlineLine(Dm) + "</section>";
    var side = listCard() + dueCard(), aside = (many() ? teamMini() : "") + scopeCard(scopeOpen) + others();
    // 행동줄(주 1 + 보조 1) — 셸이 [data-dock] 을 아래 행동줄로 옮긴다
    var nx = Dm.cur, absN = !!absentNow(Dm), safeOn = !!lsGet(AK.LS_SAFE, null), act;
    if (!first) act = '<a class="tx-btn tx-p" href="#docs" data-tx="zip" data-dock="1" data-dock-lbl="복명서 바로 받기">' + ic("dl") + "복명서 바로 받기</a>";
    else if (!Dm.done && !safeOn && !absN) act = '<a class="tx-btn tx-p tx-gox" href="#route:' + first + '" data-tx="start" data-v="' + first + '" data-dock="1" data-dock-lbl="' + esc(Dm.dl) + ' 방문 시작">' + esc(Dm.dl) + " 방문 시작</a>";
    else act = '<a class="tx-btn tx-p tx-gox" data-dock="1" data-dock-lbl="' + esc(first) + ' 집 앞으로" href="#home:' + first + '">' + esc(nx) + " 집 앞으로</a>";
    var sec = first ? '<a class="tx-btn tx-s" href="#route:' + first + '" data-dock="2" data-dock-lbl="길 안내">' + ic("nav") + "길 안내</a>" : "";
    var ac = acts(sec, act), head = ph("오늘 할 일", esc(Dm.dl + " · 방문 " + Dm.total + "곳 · " + (Dm.c.d.confirmed ? "확정" : "자동 배정안")), right(prog, ac)), dock = ac.dock + PROXY;
    var cols = many() ? [main, side, aside] : modeOf() === "phone" ? [main + side + aside] : [main, side + aside];
    cols[0] += dock;
    return page("", head, cols);
  }
  // TODAY-I6 빈 화면 = 명단 불러오기 입구(시안 today() emptyList)
  function emptyView(L) {
    var nl = L.length > 0, nm = modeOf() === "phone", now = new Date(), imp = lsGet(LS_IMP, null) || {};
    var entry = '<section class="tx-card tx-imp-in"><div class="tx-kick tx-t">' + (nl ? "새 차수 명단" : "닿음의 첫 일") + '</div><b class="tx-ccl" style="font-size:calc(20px * var(--tz))">' + (nl ? "다음 차수 발굴 명단을 올려 주세요" : "발굴 명단 엑셀을 올리면 하루가 짜입니다") + "</b>" +
      '<p class="tx-lead">' + (nl ? esc(roundYm()) + " 차수 " + L.length + "가구의 방문 계획이 끝났습니다. 행복이음에서 새로 내려받은 «발굴대상자 조회» 엑셀을 올리면 방문 순서와 동선이 다시 짜입니다." : "행복이음 «발굴대상자 조회»에서 내려받은 엑셀을 그대로 올리면 방문 순서와 동선이 바로 짜입니다.") + "</p>" +
      '<div class="tx-isteps">' + ["파일 고르기", "열 확인", "명단 반영"].map(function (s, i) { return '<div><span class="tx-tile tx-sm">' + (i + 1) + "</span><b>" + s + "</b></div>"; }).join("") + "</div>" +
      '<div class="tx-ridge"></div><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' + src("성명·주민등록번호·전화는 읽지 않음") + '<button type="button" class="tx-btn tx-t" style="padding:0" data-tx="impdemo">시연 명단으로 시작' + ic("chev") + "</button></div></section>";
    var prev = nl ? '<section class="tx-card tx-flat"><div class="tx-kick">지난 명단</div><div class="tx-li" style="cursor:default;box-shadow:none;padding-bottom:4px"><span class="tx-ico">' + ic("folder") + '</span><span class="tx-lc"><b>' + esc(roundYm() + " 차수 · " + L.length + "가구") + "</b><span>" + esc((imp.at ? md(new Date(imp.at)) + " 올림 · " : "") + "방문 계획 끝") + "</span></span>" + tag("모두 처리", "ok") + "</div></section>" : "";
    var main = entry + (nm ? "" : nl ? prev : impWhere()), side = nl ? (nm ? prev : impWhere()) + scopeCard(scopeOpen) : scopeCard(true);
    var ac = acts("", '<a class="tx-btn tx-p" href="#today" data-pick="1" data-dock="1" data-dock-sub="행복이음 «발굴대상자 조회» 엑셀">' + ic("upload") + "명단 불러오기</a>"), dock = ac.dock + PROXY, head = ph("오늘 할 일", "", right('<div class="tx-dt">' + esc(md(now)) + "</div>", ac));
    return page("", head, nm ? [main + side + dock] : [main + dock, side]);
  }

  // ═════ V4-2 명단 불러오기(시안 imp) ═════
  var IMPS = null; // null = 오늘 화면 · {st:0 고르기 | 1 읽는 중 | 2 확인, name, rows, r, S, err}
  function impWhere() {
    return '<section class="tx-card tx-flat tx-pb"><div class="tx-kick tx-t">파일 받는 곳</div><div class="tx-lst" style="margin-top:4px">' + [["행복이음 로그인", "업무 포털에서"], ["복지사각지대 발굴대상자 조회", "이번 차수 고르기"], ["엑셀 내려받기", "받은 파일 그대로 · 고치지 않아도 됨"]]
      .map(function (r, i) { return '<div class="tx-li" style="cursor:default;' + (i ? "" : "box-shadow:none") + '"><span class="tx-tile tx-sm">' + (i + 1) + '</span><span class="tx-lc"><b>' + r[0] + "</b><span>" + r[1] + "</span></span></div>"; }).join("") +
      '</div><div class="tx-ft tx-note">' + ic("help") + "<span>열 이름을 바꾸거나 줄을 지우지 않아도 됩니다</span></div></section>";
  }
  function impView() {
    var IC = window.DaeumImportCheck, st = IMPS.st, nm = IMPS.name || IMP_DEMO, cur = st >= 2 ? 1 : 0, L = listIds(), has = !!(L.length && dayModel()), nl = !has && L.length > 0, imp = lsGet(LS_IMP, null) || {}, m = modeOf(), mn = many();
    var back = '<button type="button" class="tx-btn tx-t" style="align-self:flex-start;padding:0 6px 0 0" data-tx="impback">' + ic("chevL") + (st ? "다른 파일 고르기" : "돌아가기") + "</button>";
    var steps = '<div class="tx-isteps" role="list" aria-label="명단 불러오기 단계">' + ["파일 고르기", "열 확인", "명단 반영"].map(function (s, i) { return '<div role="listitem" class="' + (i < cur ? "tx-past" : i === cur ? "tx-cur" : "") + '"><span class="tx-tile tx-sm' + (i < cur ? " tx-done" : i === cur ? " tx-now" : "") + '">' + (i < cur ? ic("check") : i + 1) + "</span><b>" + s + "</b></div>"; }).join("") + "</div>";
    var top = back + steps, COLS = IC ? IC.COLS : [], SK = IC ? IC.SKIP_CATS : [];
    var reads = '<section class="tx-card tx-flat tx-pb"><div class="tx-kick tx-t">읽는 열 ' + COLS.length + "개 · 급여·자격 열 " + (IM && IM.BEN ? IM.BEN.length : 13) + '개</div><div class="tx-tags" style="margin-top:10px">' + COLS.map(function (c) { return tag(esc(c[2]), "t"); }).join("") + "</div>" +
      '<div class="tx-ridge"></div><div class="tx-kick" style="color:var(--sos1)">읽지 않는 열</div><div class="tx-tags" style="margin-top:10px">' + SK.map(function (c) { return tag(esc(c), "skp"); }).join("") + "</div>" +
      '<div class="tx-ft tx-note">' + ic("lock") + "<span>주소는 지도 위치 찾기에만 이 기기 안에서 씁니다 · 서버로 보내지 않습니다</span></div></section>";
    if (st === 0) {
      var err = IMPS.err ? '<p class="tx-note" role="status" style="color:var(--warnInk);margin:4px 0 0">' + IMPS.err + "</p>" : "";
      var drop = '<label class="tx-card tx-drop tx-pb"><input type="file" accept=".xlsx,.xls,.csv" class="tx-sr" id="listFile" aria-label="발굴 명단 엑셀 고르기"><span class="tx-dz">' + ic("upload") + '</span><b class="tx-ccl">엑셀 파일을 여기에 놓거나 눌러 고르기</b><span class="tx-dzs">행복이음 «복지사각지대 발굴대상자 조회»에서 받은 파일 · xlsx·xls·csv</span><span class="tx-btn tx-p">' + ic("folder") + "파일 고르기</span>" + err +
        '<span class="tx-ft" style="width:100%"><button type="button" class="tx-btn tx-s tx-full" data-tx="impdemo">' + ic("aichk") + "시연 명단으로 시작</button></span></label>";
      var now = has ? '<section class="tx-card tx-flat"><div class="tx-kick">지금 실린 명단</div><div class="tx-li" style="cursor:default;box-shadow:none;padding-bottom:4px"><span class="tx-ico">' + ic("folder") + '</span><span class="tx-lc"><b>' + esc(roundYm() + " 차수 · " + L.length + "가구") + "</b><span>" + esc(impLabel(imp)) + " · 처리 기록은 그대로 두고 명단만 바꿉니다</span></span></div></section>"
        : nl ? '<section class="tx-card tx-flat"><div class="tx-kick">지난 명단</div><div class="tx-li" style="cursor:default;box-shadow:none;padding-bottom:4px"><span class="tx-ico">' + ic("folder") + '</span><span class="tx-lc"><b>' + esc(roundYm() + " 차수 · " + L.length + "가구") + "</b><span>" + esc((imp.at ? md(new Date(imp.at)) + " 올림 · " : "") + "모두 처리") + "</span></span>" + tag("모두 처리", "ok") + "</div></section>" : "";
      var head0 = ph(has ? "명단 다시 올리기" : "발굴 명단 불러오기", "엑셀 한 파일이면 방문 순서와 동선이 바로 짜입니다");
      var cols0 = m === "phone" ? [now + drop + reads + impWhere()] : mn ? [now + drop, reads, impWhere()] : now ? [now + drop, reads + impWhere()] : [drop + impWhere(), reads];
      return page("tx-eq" + (mn ? " tx-s543" : ""), head0, cols0, top);
    }
    if (st === 1) {
      var rd = '<section class="tx-card"><div style="display:flex;gap:12px;align-items:center"><span class="tx-ico">' + ic("folder") + '</span><div style="flex:1;min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(nm) + '</b><span style="font-size:13px;color:var(--ink3)">이 기기 안에서 읽는 중 · 머리줄 찾기 · 열 맞추기</span></div></div><div class="tx-rdbar"><i></i></div></section>';
      return page("", ph("명단을 읽고 있습니다", "서버로 보내지 않습니다"), m === "phone" ? [rd + reads] : [rd, reads], top);
    }
    var S = IMPS.S, mx = S.areas.length ? S.areas[0][1] : 1;
    var notes = [["warn", "같은 가구 두 줄 " + S.dup, "발굴 순위가 앞선 첫 줄만 남김", "g"], ["checkC", "명단에 없는 줄 " + S.miss, S.miss ? "가구를 찾지 못한 줄은 싣지 않음" : "모든 줄을 가구로 맞춤", ""]];
    if (S.addrNeed != null) notes.push(["pin", "주소 확인 필요 " + S.addrNeed + "가구", "도로명주소로 정리해 표시", ""]);
    var sum = '<section class="tx-card tx-pb">' + (has ? '<div class="tx-info" style="margin-bottom:12px">' + esc("지금 실린 " + roundYm() + " 차수 " + L.length + "가구를 이 파일로 바꿉니다 · 방문·상담 기록은 그대로 둡니다") + "</div>" : "") + '<div class="tx-kick tx-t">읽은 명단</div><div class="tx-big" style="margin-top:6px"><b class="tx-num">' + S.n + "</b><span>가구 · 발굴년월 " + esc(S.ym || roundYm()) + "</span></div>" +
      '<div class="tx-led" style="margin-top:14px">' + [["우선방문", S.prio], ["미처리", S.unproc], ["급여 받음", S.ben], ["읍면", S.areas.length]].map(function (x) { return '<div><b class="tx-num">' + x[1] + "</b><span>" + x[0] + "</span></div>"; }).join("") + "</div>" +
      '<div class="tx-ridge"></div><div class="tx-bars">' + S.areas.map(function (a) { return '<div class="tx-bar-r"><span>' + esc(a[0]) + '</span><span class="tx-tr"><i style="width:' + Math.round(a[1] / mx * 100) + '%"></i></span><span class="tx-v">' + a[1] + "가구</span></div>"; }).join("") + "</div>" +
      '<div class="tx-ft tx-lst">' + notes.map(function (r, i) { return '<div class="tx-li" style="cursor:default;min-height:48px;padding:8px 2px;' + (i ? "" : "box-shadow:none") + '"><span class="tx-ico' + (r[3] ? " tx-" + r[3] : "") + '" style="width:34px;height:34px;border-radius:11px">' + ic(r[0]) + '</span><span class="tx-lc"><b>' + r[1] + "</b><span>" + r[2] + "</span></span></div>"; }).join("") + "</div></section>";
    var ck = function (t) { return '<span style="display:inline-flex;gap:6px;align-items:center">' + ic("check") + t + "</span>"; };
    var cN = S.cols.filter(function (c) { return c.ok || c.alt; }).length;
    var map = '<section class="tx-card tx-flat tx-pb"><div class="tx-kick tx-t">열 맞춤 · ' + cN + "/" + S.colTotal + '</div><b class="tx-ccl">' + (cN === S.colTotal ? "행복이음 양식 그대로 읽었습니다" : "행복이음 양식을 읽었습니다 · 없는 열은 빼고 읽음") + "</b>" +
      '<table class="tx-pt"><thead><tr><th>파일의 열</th><th>닿음에서</th></tr></thead><tbody>' + S.cols.map(function (c) { return "<tr><td" + (c.ok ? "" : ' style="color:var(--ink3)"') + ">" + esc(c.file).replace(/^(AI초기상담|우선방문대상자_)/, "$1<wbr>") + (c.ok || c.alt ? "" : " · 없음") + "</td><td>" + (c.ok || c.alt ? ck(esc(c.dst)) : '<span style="color:var(--ink3)">—</span>') + "</td></tr>"; }).join("") +
      "<tr><td>급여·자격 " + S.benN + "개 열</td><td>" + ck("받는 급여 꼬리표") + "</td></tr></tbody></table>" +
      '<div class="tx-ft"><div class="tx-kick" style="color:var(--sos1)">읽지 않은 열 ' + S.skip.length + '개</div><div class="tx-tags" style="margin-top:8px">' + S.skip.map(function (c) { return tag(esc(c), "skp"); }).join("") + "</div></div></section>";
    var pre = '<section class="tx-card tx-flat tx-pb"><div class="tx-kick tx-t">앞 5줄 미리보기</div><b class="tx-ccl">발굴우선순위 순으로 줄을 세웠습니다</b>' +
      '<table class="tx-pt"><thead><tr><th class="tx-n">순위</th><th>가구</th><th>위기정보</th></tr></thead><tbody>' + S.preview.map(function (r) { return '<tr><td class="tx-n">' + esc(r.rank) + '</td><td><b class="tx-num">' + esc(r.id) + '</b><br><span style="font-size:12.5px;color:var(--ink3);white-space:nowrap">' + esc(r.area + " · " + r.who) + '</span></td><td style="white-space:nowrap">' + esc(r.sig) + "</td></tr>"; }).join("") + "</tbody></table>" +
      '<div class="tx-ft tx-note">' + ic("lock") + "<span>성명·주민등록번호·전화는 처음부터 읽지 않아 화면에도 없습니다</span></div></section>";
    var ac = acts("", '<a class="tx-btn tx-p tx-gox" href="#today" data-tx="impok" data-dock="1" data-dock-lbl="' + (has ? "지금 명단 바꾸기" : "오늘 명단에 반영") + '">' + (has ? "지금 명단 바꾸기" : "오늘 명단에 반영") + "</a>"), ok = ac.dock;
    var head2 = ph(S.n + "가구를 읽었습니다", esc(nm + " · " + (S.ym || roundYm()) + " 차수 · " + S.areas.length + "개 읍면"), right("", ac));
    var cols2 = m === "phone" ? [sum + pre + map + ok] : mn ? [sum + ok, map, pre] : [sum + pre + ok, map];
    return page("tx-eq", head2, cols2, top);
  }
  function impErr(r) {
    return r.err === "blank" ? "빈 파일입니다 — 행복이음 «발굴대상자 조회»에서 내려받은 엑셀을 골라 주세요." : r.err === "cols" ? "가구를 가리키는 열(«소재행정동»·«(행복이음)주소» 또는 «관리번호»)을 찾지 못했습니다." : r.err === "empty" ? "가구 줄이 없는 빈 서식입니다." : "명단의 가구를 지도에서 찾지 못했습니다(" + r.n + "줄).";
  }
  function impShow(o) { IMPS = o; render(); var c = document.querySelector(".main.tx-main > .col"); if (c) c.scrollTop = 0; }
  function impParsed(rows, name) {
    var r = IM.importRows(rows, D.households), IC = window.DaeumImportCheck;
    if (!r.ok) { impShow({ st: 0, err: impErr(r) }); return; }
    impShow({ st: 2, name: name, rows: rows, r: r, S: IC.summary(r, rows, D.households, F, IM.BEN ? IM.BEN.length : 13) });
  }
  function wait(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function impRead(file) {
    if (!file || !IM) return;
    if (!/\.(xlsx?|csv)$/i.test(file.name)) { impShow({ st: 0, err: "xlsx·xls·csv 파일만 읽습니다." }); return; }
    if (file.size > 5 * 1024 * 1024) { impShow({ st: 0, err: "파일이 너무 큽니다(5MB까지)." }); return; }
    impShow({ st: 1, name: file.name });
    Promise.all([IM.readFile(file), wait(RM ? 200 : 900)]).then(function (x) { if (IMPS && IMPS.st === 1) impParsed(x[0], file.name); }, function (er) {
      impShow({ st: 0, err: er && er.message === "lib" ? "엑셀 읽기 부품을 받지 못했습니다 — 연결을 확인하거나 CSV로 저장해 올려 주세요." : "파일을 읽지 못했습니다(손상·암호 걸린 파일) — 엑셀에서 다시 저장하거나 CSV로 저장해 올려 주세요." });
    });
  }
  function impDemo() {
    var L = window.__DAEUM_DEMO_LIST__; if (!L) { impShow({ st: 0, err: "시연 명단을 받지 못했습니다 — 새로 고침 뒤 다시 눌러 주세요." }); return; }
    impShow({ st: 1, name: IMP_DEMO });
    wait(RM ? 200 : 1300).then(function () { if (IMPS && IMPS.st === 1) impParsed([L.columns].concat(L.rows), IMP_DEMO); });
  }
  function impCommit() {
    if (!IMPS || IMPS.st !== 2) return;
    var re = !!(listIds().length && dayModel()), rows = IMPS.rows, n = IM.commit(IMPS.r, IMPS.name, { get: lsGet, set: lsSet }, F);
    if (FD) FD.scanImport(rows, D.households, IMPS.name); // S12-i3 ① 도로명주소 정리(주소 글은 저장하지 않음)
    IMPS = null; JUST = { re: re }; render();
    AK.toast(re ? "명단을 새 파일로 바꿨습니다 · " + n + "가구 · 방문·상담 기록은 그대로" : n + "가구를 오늘 명단에 반영했습니다 · 방문 순서를 짰습니다 · 서버 전송 0");
  }

  // ═════ 누름 ═════
  function onTx(e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-tx]") : null; if (!t || !document.contains(t)) return;
    var k = t.getAttribute("data-tx"), v = t.getAttribute("data-v");
    if (k === "start") { // TODAY-A5: 혼자 사는 집이면 들어갈 때 안전 모드가 켜진다고 잠깐 알림(동선 화면 위)
      var h = BY[v], mm = meta()[v] || {}, sg = AK.fieldSugMin ? AK.fieldSugMin(v) : null, mi = (sg && sg.min) || (A && A.safetyMin) || 40;
      if (h && (h.single || mm.lonely)) setTimeout(function () { AK.toast(v + "는 혼자 사는 집 · 들어가면 안전 모드 " + mi + "분이 켜집니다"); }, 350);
      return; // 주소(#route:가구)는 그대로 따라감
    }
    if (k === "zip") { var Z = AK.dayZip; if (typeof Z === "function") { e.preventDefault(); Z(); } return; } // 연결 지점: tab_report.js 가 AK.put({dayZip}) — 없으면 문서함(#docs)으로 그대로 감
    if (t.tagName === "A" || t.tagName === "BUTTON") e.preventDefault();
    if (k === "imp") impShow({ st: 0 });
    else if (k === "impdemo") impDemo();
    else if (k === "impback") { if (IMPS && IMPS.st) impShow({ st: 0 }); else { IMPS = null; render(); } }
    else if (k === "impok") impCommit();
    else if (k === "scope") { scopeOpen = !scopeOpen; render(); }
    else if (k === "addr") { addrOpen = !addrOpen; render(); }
    else if (k === "team") { if (window.DaeumTeamUI) window.DaeumTeamUI.open(); }
    else if (k === "again" && AK.visitAgain) { if (AK.visitAgain(v)) render(); }
    else if (k === "later" && AK.visitLater) { if (AK.visitLater(v)) render(); }
  }
  /** V4-4: 단 첫 카드 윗선 맞춤(머리·소제목만큼 다른 단을 내림) + 같은 줄 높이(tx-eq: 마지막 카드를 늘려 단 바닥을 맞춤) + 큰 화면 단계 줄 폭 = 첫 단 폭 */
  function alignCols() {
    var M = document.querySelector(".main.tx-main"); if (!M) return;
    var cols = Array.prototype.slice.call(M.querySelectorAll(":scope > .col"));
    cols.forEach(function (c) { c.style.paddingTop = ""; Array.prototype.forEach.call(c.querySelectorAll(":scope > .tx-pb"), function (x) { x.style.minHeight = ""; }); });
    var tp = M.querySelector(".hdrow .tx-top"); if (tp) tp.style.width = cols[0] ? Math.max(280, cols[0].clientWidth - 20) + "px" : "";
    if (cols.length < 2 || modeOf() === "phone") return;
    var first = function (c) { return c.querySelector(":scope > .tx-card, :scope > section, :scope > label.tx-card"); };
    var tops = cols.map(function (c) { var f = first(c); return f ? f.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop : null; });
    var v = tops.filter(function (x) { return x != null; }); if (v.length < 2) return;
    var mx = Math.max.apply(null, v);
    cols.forEach(function (c, i) { if (tops[i] != null && mx - tops[i] > .5) c.style.paddingTop = (parseFloat(getComputedStyle(c).paddingTop) + mx - tops[i]).toFixed(1) + "px"; });
    if (!M.classList.contains("tx-eq")) return;
    var bots = cols.map(function (c) { var k = Array.prototype.filter.call(c.children, function (x) { return x.offsetHeight > 0; }), l = k[k.length - 1]; return l ? l.getBoundingClientRect().bottom - c.getBoundingClientRect().top + c.scrollTop : 0; });
    var mb = Math.max.apply(null, bots);
    cols.forEach(function (c, i) { var lp = Array.prototype.filter.call(c.querySelectorAll(":scope > .tx-pb"), function (x) { return x.offsetHeight > 0; }).pop(); if (lp && mb - bots[i] > .5) lp.style.minHeight = (lp.offsetHeight + mb - bots[i]).toFixed(1) + "px"; });
  }
  var bound = false, alT = 0;
  function bindToday() {
    if (!bound) {
      bound = true; document.addEventListener("click", onTx);
      window.addEventListener("resize", function () { clearTimeout(alT); alT = setTimeout(alignCols, 140); }, { passive: true });
    }
    sdemoOnce();
    var f = document.getElementById("listFile");
    if (f && f.type === "file") f.addEventListener("change", function () { var x = f.files && f.files[0]; f.value = ""; impRead(x); });
    var dz = document.querySelector(".tx-drop");
    if (dz) {
      dz.addEventListener("dragover", function (e) { e.preventDefault(); dz.style.outlineColor = "var(--acc)"; });
      dz.addEventListener("dragleave", function () { dz.style.outlineColor = ""; });
      dz.addEventListener("drop", function (e) { e.preventDefault(); dz.style.outlineColor = ""; var x = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; impRead(x); });
    }
    if (AK.pickNext) { AK.pickNext = false; impShow({ st: 0 }); return; } // 다른 화면의 «명단 불러오기» → 명단 불러오기 화면
    if (window.requestAnimationFrame) requestAnimationFrame(function () { requestAnimationFrame(alignCols); }); else alignCols();
  }

  // ── 내보내기(app.js·다른 탭이 읽는 이름) ──
  AK.put({
    today: function () { return today; }, bindToday: function () { return bindToday; }, todayScope: function () { return todayScope; },
    dayEndUnsaved: function () { return function () { var Dm = dayModel(); return Dm && Dm.total && !Dm.cur ? unsaved(Dm).length : 0; }; } // 107회차: 하루 마무리인데 저장 안 한 기록 수(머리 «…» 붉은 점)
  });
  return relink;
};
