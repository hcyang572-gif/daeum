/* 닿음 ⑤ 통계·보고서 로직 — S9b-1(⚙️ 파로, 2026-10-29). 화면 그리기·CSS 없음.
   이름공간 window.DaeumFeatures.report.
   ⭐ 숫자는 이 파일 aggregate() 한 곳에서만 센다(화면·보고서·인쇄가 같은 값을 쓰게). AI는 쓰지 않는다.

   ── S9b-2 마운트 약속: data-feature="stats" ─────────────────────────────
   F.report.aggregate({households, requests, attempts, links, tips, now, from?, to?}) → Stats =
     { period:{from,to}, households:{total, contacted, notContacted, met, nonEligible, closed, pending},
       nonEligibleBy:[{key,label,n}], requests:{total, byStatus:{new,seen,visiting,done,cancelled}, urgent, proxy, avgDays},
       links:{total, households, byService:[{id,name,n}]}, byArea:[{area, households, contacted, requests, links}],
       funnel:[{key:"request"|"seen"|"visiting"|"done", label, n}], attempts:{total, byResult:{…}} }
   F.report.countdown(round, {now, done, total}) → Countdown =
     { round:{no,label,start,end,source}, daysLeft, workdaysLeft, weeksLeft, done, total, remaining,
       perWorkday, perWeek, elapsedPct, donePct, onTrack:bool, message }
   F.report.weekly(stats, {now, countdown?, office?}) / F.report.monthly(...) → Report =
     { kind:"weekly"|"monthly", title, period:{from,to}, printedAt, sections:[{heading, lines:[문장]}],
       table:{head:[…], rows:[[…]]}, text:"한글(hwp) 붙여넣기용 개조식", note }
   인쇄·PDF는 화면(미르)이 Report.sections·table 을 A4 인쇄 CSS로 그린다. 한글 붙여넣기는 Report.text 복사.
   ─────────────────────────────────────────────────────────────────────── */
(function (root, factory) {
  var ns = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = ns;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  var F = root.DaeumFeatures = root.DaeumFeatures || {};
  var DAY = 86400000;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { d = new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function sod(d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d; }
  function workdaysBetween(a, b) { // a 다음 날부터 b 까지(포함) 평일 수. 공휴일은 features.js 목록이 있으면 뺀다
    var n = 0, d = sod(a), e = sod(b), off = F.util && F.util.isOff;
    while (d < e) { d = new Date(d.getTime() + DAY); var w = d.getDay(); if (off ? !off(d) : w !== 0 && w !== 6) n++; }
    return n;
  }
  function inRange(iso, from, to) { if (!iso) return false; var t = new Date(iso); return (!from || t >= sod(from)) && (!to || t < new Date(sod(to).getTime() + DAY)); }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  // 발굴 차수(공개 보도 기준). 2026 제5차: 10-19~12-11(8주), 전국 약 19만 명 통보 — 보건복지부 2026-10-19 보도
  // (https://www.korea.kr/news/policyNewsView.do?newsId=148973765, 01_리서치/현행_위기가구_발굴절차.md 1행 [A])
  var ROUNDS = [
    { no: 5, year: 2026, label: "2026년 제5차 복지 사각지대 발굴", start: "2026-10-19", end: "2026-12-11",
      source: "보건복지부 2026-10-19 보도(정책브리핑)" },
    // S9j: 12-11 뒤 시연이면 지난 차수만 떠서 추가. «예정·추정» — 격월(연 5~6회) 주기로 5차 종료 뒤 연말연시를 건너 1월 셋째 주 시작·8주로 가정.
    // 산식: 5차 시작 10-19 + 약 9주 ≈ 12-21 → 연말연시 업무 감안 2027-01-18 시작, 5차와 같은 8주 → 03-12 종료. 공식 일정 발표 시 교체.
    { no: 1, year: 2027, label: "2027년 제1차 복지 사각지대 발굴(예정·추정)", start: "2027-01-18", end: "2027-03-12", estimated: true,
      source: "추정 — 격월 주기(보건복지부 2026-10-19 보도 «연 5~6회»)로 계산, 공식 발표 전" }
  ];
  var STATUS_LABEL = { "new": "새 요청", seen: "확인", visiting: "방문 예정", done: "완료", cancelled: "취소" };
  var RESULT_LABEL = { met: "만남·통화됨", no_answer: "부재·안 받음", wrong_contact: "연락처·주소 틀림", refused: "상담 거부", not_eligible: "비해당", moved: "전출·이사" };
  var NE = [["income_over", "소득·재산 기준 초과"], ["already_served", "이미 같은 서비스 이용 중"], ["resolved", "위기 상황 해소"],
    ["family_support", "가족·친지 부양으로 해결"], ["no_residence", "실거주 안 함"], ["refused", "본인이 지원을 원하지 않음"], ["other", "기타"]];

  function aggregate(d) {
    d = d || {};
    var from = d.from || null, to = d.to || null, area = d.area || null;
    // area 를 주면 그 읍면동만 센다(읍면동 담당자 보고 = «자기 동» 기준). 없으면 시군구 전체(수요 보드).
    var hh = (d.households || []).filter(function (h) { return !area || h.area === area; });
    var inArea = {}; hh.forEach(function (h) { inArea[h.id] = 1; });
    var reqs = (d.requests || []).filter(function (r) { return !area || r.region === area; });
    var links = (d.links || []).filter(function (l) { return !area || l.area === area || inArea[l.householdId]; });
    var attempts = (d.attempts || []).filter(function (t) { return (!area || inArea[t.householdId]) && (!from && !to || inRange(t.at, from, to)); });
    var lastBy = {};
    (d.attempts || []).slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; }).forEach(function (t) { if (!to || inRange(t.at, null, to)) lastBy[t.householdId] = t; });
    var contactedIds = {}; attempts.forEach(function (t) { contactedIds[t.householdId] = 1; });
    var hhIds = {}; hh.forEach(function (h) { hhIds[h.id] = h; });
    var met = 0, nonE = 0, closed = 0, neBy = {};
    Object.keys(lastBy).forEach(function (id) {
      var t = lastBy[id]; if (!hhIds[id]) return;
      if (t.result === "met") { met++; closed++; }
      if (t.result === "not_eligible") { nonE++; closed++; neBy[t.reason || "other"] = (neBy[t.reason || "other"] || 0) + 1; }
      if (t.result === "moved") closed++;
    });
    var contacted = hh.filter(function (h) { return contactedIds[h.id]; }).length;
    var R = reqs.filter(function (r) { return !from && !to || inRange(r.createdAt, from, to); });
    var byStatus = { "new": 0, seen: 0, visiting: 0, done: 0, cancelled: 0 };
    var doneDays = [];
    R.forEach(function (r) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.status === "done") { var h = (r.history || []).filter(function (x) { return x.status === "done"; })[0]; if (h) doneDays.push((new Date(h.at) - new Date(r.createdAt)) / DAY); }
    });
    var L = links.filter(function (l) { return !from && !to || inRange(l.at, from, to); });
    var svcN = {}, svcName = {}, linkHH = {};
    L.forEach(function (l) { linkHH[l.householdId] = 1; (l.serviceIds || []).forEach(function (id, i) { svcN[id] = (svcN[id] || 0) + 1; if (l.serviceNames && l.serviceNames[i]) svcName[id] = l.serviceNames[i]; }); });
    var areas = {};
    function A(n) { return areas[n] || (areas[n] = { area: n, households: 0, contacted: 0, requests: 0, links: 0 }); }
    hh.forEach(function (h) { var a = A(h.area); a.households++; if (contactedIds[h.id]) a.contacted++; });
    R.forEach(function (r) { if (r.status !== "cancelled") A(r.region || "미상").requests++; });
    L.forEach(function (l) { A(l.area || "미상").links++; });
    // 현장 후속 업무(S9h): 재시도 예정·간접 확인 전환·연계 누락 — features.js 가 함께 실렸을 때만
    var follow = null;
    if (F.contacts && F.contacts.suggestNext && F.linkGap) {
      var now = d.now ? new Date(d.now) : new Date(), today = ymd(now), retry = 0, esc = 0;
      Object.keys(lastBy).forEach(function (id) { if (!inArea[id]) return; var s2 = F.contacts.suggestNext(d.attempts, id, now); if (!s2.closed && s2.next) { if (s2.next.date <= today) retry++; if (s2.escalate) esc++; } });
      var g = F.linkGap.build({ households: hh, requests: reqs, attempts: (d.attempts || []).filter(function (t) { return inArea[t.householdId]; }), links: links, outcomes: d.outcomes, now: now });
      follow = { retryDue: retry, escalate: esc, gaps: g.total, notApplied: g.notApplied.slice(0, 3) };
    }
    var byResult = {}; attempts.forEach(function (t) { byResult[t.result] = (byResult[t.result] || 0) + 1; });
    var live = R.filter(function (r) { return r.status !== "cancelled"; });
    function reached(st) { var ord = ["new", "seen", "visiting", "done"]; return live.filter(function (r) { return ord.indexOf(r.status) >= ord.indexOf(st); }).length; }
    var res = {
      period: { from: from ? ymd(from) : null, to: to ? ymd(to) : null }, scope: area,
      followUp: follow,
      households: { total: hh.length, contacted: contacted, notContacted: hh.length - contacted, met: met, nonEligible: nonE, closed: closed, pending: hh.length - closed },
      nonEligibleBy: NE.map(function (x) { return { key: x[0], label: x[1], n: neBy[x[0]] || 0 }; }).filter(function (x) { return x.n; }),
      requests: { total: R.length, byStatus: byStatus, urgent: R.filter(function (r) { return r.urgent; }).length,
        proxy: R.filter(function (r) { return r.proxy && r.proxy.isProxy; }).length,
        avgDays: doneDays.length ? +(doneDays.reduce(function (a, b) { return a + b; }, 0) / doneDays.length).toFixed(1) : null },
      links: { total: L.length, households: Object.keys(linkHH).length,
        byService: Object.keys(svcN).map(function (id) { return { id: id, name: svcName[id] || id, n: svcN[id] }; }).sort(function (a, b) { return b.n - a.n; }) },
      byArea: Object.keys(areas).map(function (k) { return areas[k]; }).sort(function (a, b) { return b.requests - a.requests || b.households - a.households; }),
      funnel: [["new", "요청 접수"], ["seen", "담당자 확인"], ["visiting", "방문·상담"], ["done", "연계 완료"]].map(function (x) { return { key: x[0], label: x[1], n: reached(x[0]) }; }),
      attempts: { total: attempts.length, byResult: byResult }
    };
    // S10j: 마지막 집계(입력·결과)를 기억 — 보고서 문서(report_doc.js)가 화면과 같은 숫자로 그림을 그린다
    if (F.report) F.report.last = { input: d, stats: res };
    return res;
  }

  /** 진행 중인 차수 → 없으면 다가올 차수(예정) → 없으면 마지막 차수 */
  function currentRound(now) {
    var t = ymd(now || new Date());
    return ROUNDS.filter(function (r) { return r.start <= t && t <= r.end; })[0]
      || ROUNDS.filter(function (r) { return r.start > t; })[0] || ROUNDS[ROUNDS.length - 1];
  }
  function countdown(round, o) {
    o = o || {};
    var now = o.now ? new Date(o.now) : new Date();
    round = round || currentRound(now);
    var start = new Date(round.start + "T00:00:00"), end = new Date(round.end + "T00:00:00");
    var daysLeft = Math.round((sod(end) - sod(now)) / DAY);
    var wdLeft = daysLeft < 0 ? 0 : workdaysBetween(new Date(sod(now).getTime() - DAY), end); // 오늘 포함
    var total = o.total || 0, done = Math.min(o.done || 0, total), remaining = total - done;
    var span = Math.max(1, (end - start) / DAY), elapsed = Math.min(1, Math.max(0, (sod(now) - start) / DAY / span));
    var donePct = total ? done / total : 0;
    var weeksLeft = Math.max(0, +(daysLeft / 7).toFixed(1));
    var res = {
      round: round, daysLeft: daysLeft, workdaysLeft: wdLeft, weeksLeft: weeksLeft, done: done, total: total, remaining: remaining,
      perWorkday: wdLeft ? Math.ceil(remaining / wdLeft) : remaining, perWeek: weeksLeft >= 1 ? Math.ceil(remaining / weeksLeft) : remaining,
      elapsedPct: Math.round(elapsed * 100), donePct: Math.round(donePct * 100), onTrack: donePct + 1e-9 >= elapsed
    };
    var toStart = Math.round((sod(start) - sod(now)) / DAY);
    res.upcoming = toStart > 0;
    res.message = res.upcoming ? round.label + " 시작 " + round.start + "까지 " + toStart + "일 — 지난 차수 마무리·명단 받을 준비 기간입니다."
      : daysLeft < 0 ? "차수 마감이 지났습니다(" + round.end + ")."
      : "마감 " + round.end + "까지 " + daysLeft + "일(평일 " + wdLeft + "일) — 남은 " + num(remaining) + "가구, 하루 " + res.perWorkday + "가구씩 처리하면 마감 안에 끝납니다." +
        (res.onTrack ? "" : " 기간 경과 " + res.elapsedPct + "% 대비 처리 " + res.donePct + "%로 뒤처져 있습니다.");
    return res;
  }

  function mondayOf(d) { d = sod(d); var w = (d.getDay() + 6) % 7; return new Date(d.getTime() - w * DAY); }
  function makeReport(kind, stats, o) {
    o = o || {};
    var now = o.now ? new Date(o.now) : new Date();
    var p = stats.period && stats.period.from ? stats.period : (kind === "weekly"
      ? { from: ymd(mondayOf(now)), to: ymd(now) }
      : { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) });
    var H = stats.households, Q = stats.requests, Lk = stats.links, cd = o.countdown;
    var scope = stats.scope || o.area || null;
    var office = o.office || (scope ? "상주시 " + scope + " 행정복지센터 맞춤형복지팀" : "상주시 희망복지지원단");
    var name = kind === "weekly" ? "주간" : "월간";
    var sections = [];
    sections.push({ heading: "추진 현황", lines: [
      "발굴 명단 " + num(H.total) + "가구 중 " + num(H.contacted) + "가구 접촉(" + (H.total ? Math.round(H.contacted / H.total * 100) : 0) + "%), 만남·상담 " + num(H.met) + "가구, 비해당 " + num(H.nonEligible) + "가구",
      "주민 신호(도움 요청·이웃 알림) " + num(Q.total) + "건(긴급 " + Q.urgent + "·대신·이웃 " + Q.proxy + ") — 완료 " + Q.byStatus.done + ", 진행 " + (Q.byStatus.seen + Q.byStatus.visiting) + ", 미확인 " + Q.byStatus["new"] + (Q.avgDays != null ? ", 평균 처리 " + Q.avgDays + "일" : ""),
      "서비스 연계 " + num(Lk.total) + "건(" + Lk.households + "가구)" + (Lk.byService.length ? " — 많은 순: " + Lk.byService.slice(0, 3).map(function (s) { return s.name + " " + s.n; }).join(", ") : "")
    ] });
    if (stats.nonEligibleBy.length) sections.push({ heading: "비해당 사유", lines: stats.nonEligibleBy.map(function (x) { return x.label + " " + x.n + "가구"; }) });
    var fu = stats.followUp;
    if (fu) sections.push({ heading: "현장 후속 업무", lines: [
      "오늘까지 다시 찾아가거나 연락할 집 " + fu.retryDue + "가구" + (fu.escalate ? "(방문 3회 부재로 간접 확인 전환 " + fu.escalate + ")" : ""),
      "연계 누락(상담 뒤 연계 없음·신청/결과 확인 안 함 등) " + fu.gaps + "곳" + (fu.notApplied.length ? " — 안내 후 신청 안 한 서비스: " + fu.notApplied.map(function (x) { return x.name + " " + x.n; }).join(", ") : "")
    ] });
    if (cd) sections.push({ heading: "차수 마감 역산(" + cd.round.label + ")", lines: [cd.message, "출처: " + cd.round.source] });
    var hot = scope ? [] : stats.byArea.filter(function (a) { return a.requests; }).slice(0, 3);
    if (hot.length) sections.push({ heading: "요청이 많은 읍면동", lines: hot.map(function (a) { return a.area + " 요청 " + a.requests + "건 · 접촉 " + a.contacted + "/" + a.households + "가구"; }) });
    var next = [];
    if (Q.byStatus["new"]) next.push("미확인 요청 " + Q.byStatus["new"] + "건 우선 확인");
    if (cd && !cd.onTrack) next.push("차수 진도 보완 — 하루 " + cd.perWorkday + "가구 목표");
    if (H.notContacted) next.push("미접촉 " + num(H.notContacted) + "가구 방문 동선 편성");
    sections.push({ heading: "다음 " + (kind === "weekly" ? "주" : "달") + " 계획", lines: next.length ? next : ["특이사항 없음"] });
    // 표: 읍면동 보고(scope)면 자기 동 지표 표, 시군구 보고면 읍면동별 표
    var table = scope ? { head: ["구분", "값", "비고"], rows: [
        ["발굴 명단", H.total + "가구", stats.period.from ? "기간 " + stats.period.from + "~" : "이번 차수"],
        ["접촉(방문·전화 시도)", H.contacted + "가구", (H.total ? Math.round(H.contacted / H.total * 100) : 0) + "%"],
        ["만남·상담", H.met + "가구", ""],
        ["비해당", H.nonEligible + "가구", stats.nonEligibleBy.length ? stats.nonEligibleBy[0].label + " 최다" : ""],
        ["미접촉", H.notContacted + "가구", ""],
        ["주민 신호(요청·이웃 알림)", Q.total + "건", "미확인 " + Q.byStatus["new"]],
        ["서비스 연계", Lk.total + "건", Lk.households + "가구"],
        ["연계 누락", (fu ? fu.gaps : "-") + "곳", "멈춘 단계 확인"]
      ] } : { head: ["읍면동", "명단 가구", "접촉", "주민 신호", "연계"],
      rows: stats.byArea.map(function (a) { return [a.area, a.households, a.contacted, a.requests, a.links]; }) };
    var title = (scope ? scope + " " : "") + "복지 사각지대 발굴 " + name + " 추진 보고 (" + p.from + " ~ " + p.to + ")";
    var text = [title, office + " · 작성 " + ymd(now), ""].concat(sections.map(function (s, i) {
      return ["□ " + s.heading].concat(s.lines.map(function (l) { return "  ○ " + l; })).join("\n");
    })).join("\n") + "\n\n※ 가구는 시연용 가상 자료, «추정» 표시는 가정값에 따른 값입니다.";
    return { kind: kind, title: title, period: p, printedAt: ymd(now) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes()),
      sections: sections, table: table, text: text, scope: scope,
      note: "닿음 자동 집계입니다(AI 미사용). 공식 실적은 행복이음 기준으로 대조하세요." };
  }

  F.report = {
    ROUNDS: ROUNDS, STATUS_LABEL: STATUS_LABEL, RESULT_LABEL: RESULT_LABEL,
    aggregate: aggregate, countdown: countdown,
    weekly: function (stats, o) { return makeReport("weekly", stats, o); },
    monthly: function (stats, o) { return makeReport("monthly", stats, o); },
    /** 읍면동 담당자의 «자기 동»: 명단 가구가 가장 많은 읍면동 */
    // 관할 = 가구 절반 넘게 모인 읍면동 하나. 여러 읍면에 흩어져 있으면(S10b 10-30, 시청 희망복지지원단이 읍면을 도는 시연) null → 전체·읍면동별 표.
    homeArea: function (households) { var n = {}, best = null, all = (households || []).length; (households || []).forEach(function (h) { n[h.area] = (n[h.area] || 0) + 1; if (!best || n[h.area] > n[best]) best = h.area; }); return best && n[best] * 2 > all ? best : null; },
    currentRound: currentRound
  };
  // S10j: 브라우저에선 보고서 문서 모듈(report_doc.js·report_doc.css)을 이 파일 옆에서 함께 싣는다 — 화면 HTML을 고치지 않고 붙이려고
  if (typeof document !== "undefined" && document.currentScript && !root.__DAEUM_RDOC_LOADING__) {
    root.__DAEUM_RDOC_LOADING__ = 1;
    var sc = document.createElement("script"); sc.src = document.currentScript.src.replace(/report\.js(\?.*)?$/, "report_doc.js"); document.head.appendChild(sc);
  }
  return F;
});
