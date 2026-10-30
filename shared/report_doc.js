/* 닿음 보고서 문서 — S10j(🩵 미르, 2026-10-30). 정부 보고서 틀 안에 그림(숫자 카드·도넛·막대·읍면 지도·추세선)을 넣는다.
   형식 근거: 01_리서치/정부보고서_작성기준.md (자유서식이되 정부 지침을 따름 — 10-30 호창님 결정)
     · 날짜 «2026. 10. 30.»            [법] 행정 효율과 협업 촉진에 관한 규정 제7조
     · 항목 기호 □ → ○ → - → ·          [법] 같은 규정 시행규칙 제2조①(특수 기호 사용 가능) — 4단계까지
     · 들여쓰기 한 단계 1자, 내어쓰기      [편람] 행정업무운영 편람 «항목 구분» — 기호 뒤 글은 글머리 아래로 맞춤
     · 쪽 번호 중앙 하단 «- n -»          [법] 시행규칙 제18조
     · A4 세로                            [법] 시행규칙 제23조
     · 본문 끝 «끝.»                      [법] 시행규칙 제4조 준용
     · 제목 상자·1쪽 요약·장 순서(Ⅰ개요→Ⅱ현황→Ⅲ문제점·분석→Ⅳ대책·조치→Ⅴ향후 계획)·<표 N>/[그림 N] — 자체 판단(관행 정리 §2)
   이 파일은 화면 그리기(html 문자열)까지 «순수 함수»로 만들어 node 시험이 가능하다(shared/report_doc.test.js).
   브라우저에선 현황 탭의 «주간/월간 보고서» 단추를 가로채 아래 #rpDoc 에 문서를 그린다(officer/mount.js 를 고치지 않으려고 — 파로 작업과 겹침 방지).
   공유 링크는 shared/report_view.html#z=… (집계 숫자·읍면 이름만 담은 읽기 전용, 가구 번호·이름 없음).
   이름공간: window.DaeumFeatures.reportDoc */
(function (root, factory) {
  var ns = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = ns;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  var F = root.DaeumFeatures = root.DaeumFeatures || {};
  var DAY = 86400000;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { d = new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dot(s) { if (!s) return ""; var p = String(s).slice(0, 10).split("-"); return +p[0] + ". " + +p[1] + ". " + +p[2] + "."; } // [법] 규정 제7조
  function num(n) { return n == null ? "-" : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function days(a, b) { return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / DAY); }

  var SYM = ["□", "○", "-", "·"];            // 1~4단계
  var ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"];
  var SRC = {
    virtual: { tag: "가상", text: "가구·접촉·주민 신호·연계 기록: 닿음 시연용 가상 자료(실제 주민·행정자료 0건)" },
    round: null, // 차수 출처는 countdown 에서
    region: { tag: "공공데이터", text: "읍면동 이름·세대 비율: 행정안전부 주민등록 인구통계 읍면동별 세대수(2026-09)" },
    calc: { tag: "닿음 집계", text: "숫자는 닿음 report.aggregate() 한 곳에서 셈(AI 미사용) — 공식 실적은 행복이음 숫자와 대조" }
  };

  // ── 추세: 차수 시작부터 오늘까지 «처음 접촉한 가구» 누적 ──
  function trend(input, stats, cd) {
    var r = cd.round, now = ymd(input.now || new Date()), scope = stats.scope;
    var hh = (input.households || []).filter(function (h) { return !scope || h.area === scope; }), inS = {};
    hh.forEach(function (h) { inS[h.id] = 1; });
    var first = {};
    (input.attempts || []).forEach(function (t) { if (!inS[t.householdId] || !t.at) return; var d = ymd(t.at); if (!first[t.householdId] || d < first[t.householdId]) first[t.householdId] = d; });
    var span = Math.max(1, days(r.start, r.end)), last = Math.min(span, Math.max(0, days(r.start, now)));
    var byDay = {}; Object.keys(first).forEach(function (id) { var k = Math.max(0, Math.min(span, days(r.start, first[id]))); byDay[k] = (byDay[k] || 0) + 1; });
    var pts = [], c = 0; for (var i = 0; i <= last; i++) { c += byDay[i] || 0; pts.push(c); }
    return { start: r.start, end: r.end, span: span, total: hh.length, points: pts, upcoming: !!cd.upcoming };
  }
  // ── 읍면 위치: input.areas(x,y km, 시청 0,0) → 없으면 가구 좌표 평균 ──
  function areaPoints(input, stats) {
    var by = {}; stats.byArea.forEach(function (a) { by[a.area] = a; });
    var list = (input.areas || []).filter(function (a) { return a && a.name && isFinite(a.x) && isFinite(a.y); }).map(function (a) { return { name: a.name, x: +a.x, y: +a.y }; });
    if (!list.length) {
      var acc = {}; (input.households || []).forEach(function (h) { if (!isFinite(h.x)) return; var o = acc[h.area] || (acc[h.area] = { name: h.area, x: 0, y: 0, n: 0 }); o.x += h.x; o.y += h.y; o.n++; });
      list = Object.keys(acc).map(function (k) { var o = acc[k]; return { name: k, x: +(o.x / o.n).toFixed(2), y: +(o.y / o.n).toFixed(2) }; });
    }
    return list.map(function (a) { var s = by[a.name]; return { name: a.name, x: a.x, y: a.y, n: s ? s.households : 0, c: s ? s.contacted : 0, q: s ? s.requests : 0, l: s ? s.links : 0 }; });
  }

  /** 보고서 모델(직렬화 가능, 개인 식별값 없음). rep = F.report.weekly/monthly 결과(같은 숫자 원천) */
  function build(kind, stats, input, cd, o) {
    o = o || {};
    var rep = (F.report && F.report[kind]) ? F.report[kind](stats, { countdown: cd, office: o.office, now: input.now }) : null;
    var H = stats.households, Q = stats.requests, Lk = stats.links, fu = stats.followUp;
    var now = input.now ? new Date(input.now) : new Date();
    var name = kind === "monthly" ? "월간" : "주간", unit = kind === "monthly" ? "달" : "주";
    var period = rep ? rep.period : { from: ymd(now), to: ymd(now) };
    var scope = stats.scope;
    var areasMine = stats.byArea.filter(function (a) { return a.households; }).map(function (a) { return a.area; });
    var scopeTxt = scope ? scope : (areasMine.length ? "담당 " + areasMine.length + "개 읍면(" + areasMine.join("·") + ")" : "담당 지역");
    var office = o.office || (scope ? "상주시 " + scope + " 행정복지센터 맞춤형복지팀" : "상주시 희망복지지원단");
    var other = Math.max(0, H.closed - H.met - H.nonEligible), inProg = Math.max(0, H.contacted - H.closed);
    var notC = Math.max(0, H.total - H.met - H.nonEligible - other - inProg);
    var ahead = cd.onTrack;
    var verdict = cd.upcoming ? cd.round.label + " 시작 " + dot(cd.round.start) + " 전 — 지난 차수 마무리 단계입니다."
      : "처리 " + cd.donePct + "%로 기간 경과 " + cd.elapsedPct + "%보다 " + (ahead ? "앞서 있음" : "뒤처져 있음") + " — 남은 " + num(cd.remaining) + "가구는 하루 " + cd.perWorkday + "가구씩이면 " + dot(cd.round.end) + " 마감 안에 끝남";
    var srcRound = { tag: "공개 자료", text: "발굴 차수 일정: " + cd.round.source };
    var kpis = [
      { k: "발굴 명단", v: num(H.total), u: "가구", s: scopeTxt },
      { k: "접촉률", v: String(pct(H.contacted, H.total)), u: "%", s: num(H.contacted) + "가구 접촉 · 기간 경과 " + cd.elapsedPct + "%" },
      { k: "만남·상담", v: num(H.met), u: "가구", s: "비해당 " + num(H.nonEligible) + "가구" },
      { k: "서비스 연계", v: num(Lk.total), u: "건", s: Lk.households + "가구" + (fu ? " · 누락 " + fu.gaps + "곳" : "") },
      { k: cd.upcoming ? "차수 시작까지" : "차수 마감", v: cd.upcoming ? String(days(ymd(now), cd.round.start)) : (cd.daysLeft >= 0 ? "D-" + cd.daysLeft : "마감"), u: cd.upcoming ? "일" : "", s: cd.upcoming ? dot(cd.round.start) + " 시작" : "하루 " + cd.perWorkday + "가구 목표", tone: cd.upcoming || ahead ? "pos" : "warn" }
    ];
    var B = []; // 본문 마디: {t:"ch"|"li"|"fig"|"tbl"|"note"}
    function ch(t) { B.push({ t: "ch", text: t }); }
    function li(lv, text) { B.push({ t: "li", lv: lv, text: text }); }
    var fig = 0, tbl = 0;
    function figure(kind2, title, data, src, tags, ex) { fig++; B.push(Object.assign({ t: "fig", no: fig, kind: kind2, title: title, data: data, src: src, tags: tags }, ex || {})); return fig; }

    ch("개요");
    li(1, "보고 목적");
    li(2, cd.round.label + " 명단 처리와 주민 신호·서비스 연계 현황을 " + name + " 단위로 점검함");
    li(1, "보고 범위");
    li(2, "기간: " + dot(period.from) + " ~ " + dot(period.to));
    li(2, "대상: " + scopeTxt + " 발굴 명단 " + num(H.total) + "가구, 주민 신호 " + num(Q.total) + "건");

    ch("현황");
    li(1, "발굴 명단 처리");
    li(2, num(H.total) + "가구 중 " + num(H.contacted) + "가구 접촉(" + pct(H.contacted, H.total) + "%) — 만남·상담 " + num(H.met) + ", 비해당 " + num(H.nonEligible) + ", 미접촉 " + num(H.notContacted) + "가구");
    li(3, "처리 상태별 구성은 [그림 " + (fig + 1) + "] 참조");
    figure("donut", "명단 " + num(H.total) + "가구 중 " + pct(H.closed, H.total) + "%는 처리를 마침", [
      { label: "만남·상담", n: H.met, c: 1 }, { label: "비해당", n: H.nonEligible, c: 2 }, { label: "전출 등 종결", n: other, c: 3 }, { label: "접촉 중", n: inProg, c: 4 }, { label: "미접촉", n: notC, c: 5 }
    ].filter(function (x) { return x.n; }), "닿음 집계(가상 가구)", ["가상"], { sheet: "명단 처리", item: "처리 상태", unitName: "가구", agg: "share" });
    li(1, "주민 신호(도움 요청·이웃 알림)");
    li(2, num(Q.total) + "건 접수(긴급 " + Q.urgent + "·대신·이웃 " + Q.proxy + ") — 완료 " + Q.byStatus.done + ", 진행 " + (Q.byStatus.seen + Q.byStatus.visiting) + ", 미확인 " + Q.byStatus["new"] + (Q.avgDays != null ? ", 평균 처리 " + Q.avgDays + "일" : ""));
    if (Q.total) figure("bars", "요청 " + num(stats.funnel[0].n) + "건 중 " + num(stats.funnel[3].n) + "건이 연계 완료까지 감", stats.funnel.map(function (f) { return { label: f.label, n: f.n }; }), "닿음 집계(가상 주민 신호)", ["가상"], { sheet: "요청 단계", item: "처리 단계", unitName: "건", agg: "funnel" });
    li(1, "서비스 연계");
    li(2, num(Lk.total) + "건(" + Lk.households + "가구)" + (Lk.byService.length ? " — 많은 순: " + Lk.byService.slice(0, 3).map(function (s) { return s.name + " " + s.n; }).join(", ") : ""));
    if (Lk.byService.length) figure("bars", Lk.byService[0].name + " 연계가 " + Lk.byService[0].n + "건으로 가장 많음", Lk.byService.slice(0, 6).map(function (s) { return { label: s.name, n: s.n }; }), "닿음 집계(가상 연계 기록)", ["가상"], { sheet: "연계 서비스", item: "서비스", unitName: "건", agg: "share" });
    var pts = areaPoints(input, stats);
    if (stats.byArea.length) {
      li(1, "읍면별 현황");
      var topA = stats.byArea.slice().sort(function (a, b) { return b.households - a.households; })[0];
      li(2, topA.area + " 명단이 " + num(topA.households) + "가구로 가장 많고, 접촉률은 " + pct(topA.contacted, topA.households) + "%");
      var nM = figure("map", "명단 가구는 " + (areasMine.length || stats.byArea.length) + "개 읍면에 있고 " + topA.area + "이 가장 많음", pts, "읍면 위치: 행정안전부 주민등록 인구통계 읍면동 목록(2026-09) 중심 대략값 · 가구 수: 가상", ["공공데이터", "가상"]);
      tbl++;
      var rows = stats.byArea.filter(function (a) { return a.households || a.requests || a.links; });
      var sum = rows.reduce(function (s, a) { s[0] += a.households; s[1] += a.contacted; s[2] += a.requests; s[3] += a.links; return s; }, [0, 0, 0, 0]);
      B.push({ t: "tbl", no: tbl, title: "읍면별 처리 현황", unit: "(단위: 가구, %, 건)", head: ["읍면", "명단", "접촉", "접촉률", "주민 신호", "연계"],
        rows: rows.map(function (a) { return [a.area, a.households, a.contacted, pct(a.contacted, a.households) + "%", a.requests, a.links]; }),
        foot: ["합계", sum[0], sum[1], pct(sum[1], sum[0]) + "%", sum[2], sum[3]], src: "닿음 집계(가상) · 읍면 이름 행정안전부(2026-09)", tags: ["가상", "공공데이터"], see: nM, sheet: "읍면별", rate: { col: 3, num: 2, den: 1 } });
    }

    ch("문제점·분석");
    li(1, "처리 진도");
    li(2, cd.upcoming ? cd.message : "기간 경과 " + cd.elapsedPct + "% 대비 처리 " + cd.donePct + "% — " + (ahead ? "일정 안에 있음" : "뒤처져 있어 하루 처리량을 " + cd.perWorkday + "가구로 높여야 함"));
    var tr = trend(input, stats, cd);
    li(3, "차수 시작부터 누적 접촉 추세는 [그림 " + (fig + 1) + "] 참조(점선 = 마감까지 고르게 처리할 때)");
    figure("trend", ahead ? "누적 접촉이 목표선보다 위에 있음" : "누적 접촉이 목표선보다 아래에 있음", tr, cd.round.source + " · 접촉 기록: 가상", ["공개 자료", "가상"], { sheet: "접촉 추세" });
    if (stats.nonEligibleBy.length) {
      li(1, "비해당 사유");
      li(2, "비해당 " + num(H.nonEligible) + "가구 — " + stats.nonEligibleBy[0].label + "가 가장 많음");
      if (stats.nonEligibleBy.length > 1) stats.nonEligibleBy.forEach(function (x) { li(3, x.label + " " + x.n + "가구"); });
    }
    if (fu) {
      li(1, "현장 후속 업무");
      li(2, "오늘까지 다시 찾아가거나 연락할 집 " + fu.retryDue + "가구" + (fu.escalate ? "(방문 3회 부재로 간접 확인 전환 " + fu.escalate + "가구)" : ""));
      li(2, "연계 누락(상담 뒤 연계 없음·신청/결과 확인 안 함) " + fu.gaps + "곳");
      if (fu.notApplied && fu.notApplied.length) li(3, "안내 뒤 신청 안 한 서비스: " + fu.notApplied.map(function (x) { return x.name + " " + x.n; }).join(", "));
    }

    ch("대책·조치");
    var acts = [];
    if (Q.byStatus["new"]) acts.push(["미확인 주민 신호 우선 확인", "미확인 " + Q.byStatus["new"] + "건" + (Q.urgent ? "(긴급 " + Q.urgent + "건 포함)" : "") + "은 접수 당일 확인"]);
    if (fu && fu.retryDue) acts.push(["재방문·재연락 동선 편성", fu.retryDue + "가구를 오늘 방문 동선에 넣음"]);
    if (fu && fu.escalate) acts.push(["간접 확인 전환", fu.escalate + "가구는 통반장·이웃 순으로 안부 확인"]);
    if (fu && fu.gaps) acts.push(["연계 누락 점검", fu.gaps + "곳의 멈춘 단계(신청·결정·결과 확인)를 담당 기관과 확인"]);
    if (!cd.upcoming && !ahead) acts.push(["처리 진도 보완", "하루 " + cd.perWorkday + "가구 목표로 읍면별 방문 묶기"]);
    if (!acts.length) acts.push(["현 체계 유지", "특이사항 없음"]);
    acts.forEach(function (a) { li(1, a[0]); li(2, a[1]); });

    ch("향후 계획");
    li(1, "다음 " + unit + " 목표");
    if (!cd.upcoming) li(2, "하루 " + cd.perWorkday + "가구, 주 " + cd.perWeek + "가구 처리");
    if (H.notContacted) li(2, "미접촉 " + num(H.notContacted) + "가구 방문 동선 편성");
    li(1, "차수 마감");
    li(2, cd.round.label + " " + dot(cd.round.start) + " ~ " + dot(cd.round.end) + (cd.upcoming ? "" : ", 남은 평일 " + cd.workdaysLeft + "일"));
    li(3, "※ 공식 실적은 행복이음 숫자와 대조해 확정");

    var summary = [
      "명단 " + num(H.total) + "가구 중 " + num(H.contacted) + "가구 접촉(" + pct(H.contacted, H.total) + "%), 만남·상담 " + num(H.met) + "가구",
      "주민 신호 " + num(Q.total) + "건 중 미확인 " + Q.byStatus["new"] + "건, 서비스 연계 " + num(Lk.total) + "건",
      fu ? "다시 찾을 집 " + fu.retryDue + "가구 · 연계 누락 " + fu.gaps + "곳" : null
    ].filter(Boolean);
    var title = (scope ? scope + " " : "") + "복지 사각지대 발굴 " + name + " 추진 현황";
    return {
      v: 1, kind: kind, title: title, period: period, made: ymd(now), madeTime: pad(now.getHours()) + ":" + pad(now.getMinutes()),
      office: office, scope: scope, scopeTxt: scopeTxt, verdict: verdict, onTrack: !!ahead, upcoming: !!cd.upcoming,
      kpis: kpis, summary: summary, asks: acts.slice(0, 2).map(function (a) { return a[0] + " — " + a[1]; }),
      body: B, sources: [SRC.virtual, srcRound, SRC.region, SRC.calc],
      pasteText: null // 아래 text(model) 로 만든다
    };
  }

  // ── 그림(SVG 문자열) — 색은 클래스(c1~c5)로, 인쇄 땐 CSS 가 회색 단계로 바꾼다 ──
  function donut(d) {
    var tot = d.reduce(function (s, x) { return s + x.n; }, 0) || 1, R = 52, C = 2 * Math.PI * R, off = 0;
    var arcs = d.map(function (x, i) { var len = x.n / tot * C, s = '<circle class="rp-arc c' + (x.c || i + 1) + '" cx="70" cy="70" r="' + R + '" stroke-dasharray="' + len.toFixed(2) + " " + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"/>'; off += len; return s; }).join("");
    var lab = d.map(function (x) { return x.label + " " + x.n; }).join(", ");
    return '<div class="rp-donut"><svg viewBox="0 0 140 140" role="img" aria-label="' + esc(lab) + '"><g transform="rotate(-90 70 70)"><circle class="rp-track" cx="70" cy="70" r="' + R + '"/>' + arcs + '</g>' +
      '<text x="70" y="68" class="rp-dn">' + num(tot) + '</text><text x="70" y="86" class="rp-du">가구</text></svg>' +
      '<ul class="rp-legend">' + d.map(function (x, i) { return '<li><i class="c' + (x.c || i + 1) + '"></i><span>' + esc(x.label) + '</span><b class="num">' + num(x.n) + '</b><em class="num">' + pct(x.n, tot) + '%</em></li>'; }).join("") + "</ul></div>";
  }
  function bars(d) {
    var mx = Math.max.apply(null, d.map(function (x) { return x.n; }).concat([1]));
    return '<ul class="rp-bars" role="img" aria-label="' + esc(d.map(function (x) { return x.label + " " + x.n; }).join(", ")) + '">' + d.map(function (x, i) {
      return '<li><span class="rp-bl">' + esc(x.label) + '</span><span class="rp-bt"><i class="c' + (i === 0 ? 1 : 2) + '" style="width:' + Math.max(x.n ? 2 : 0, Math.round(x.n / mx * 100)) + '%"></i></span><b class="num">' + num(x.n) + "</b></li>";
    }).join("") + "</ul>";
  }
  function map(pts) {
    var W = 360, Hh = 330, k = 8, ox = 196, oy = 160; // 1km = 8px, 시청(0,0) → (196,160)
    function X(x) { return ox + x * k; } function Y(y) { return oy - y * k; }
    var mx = Math.max.apply(null, pts.map(function (p) { return p.n; }).concat([1]));
    var dots = pts.slice().sort(function (a, b) { return a.n - b.n; }).map(function (p) {
      if (!p.n) return '<circle class="rp-mo" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="3"><title>' + esc(p.name) + " 명단 없음</title></circle>";
      var r = 7 + 15 * Math.sqrt(p.n / mx), left = p.x < 0, tx = X(p.x) + (left ? -(r + 5) : r + 5), anc = left ? "end" : "start";
      return '<circle class="rp-mb" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + r.toFixed(1) + '"/>' +
        '<circle class="rp-mc" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + (r * Math.sqrt(p.n ? p.c / p.n : 0)).toFixed(1) + '"/>' +
        '<text class="rp-ml" x="' + tx.toFixed(1) + '" y="' + (Y(p.y) - 2).toFixed(1) + '" text-anchor="' + anc + '">' + esc(p.name) + " " + p.n + "</text>" +
        '<text class="rp-ms" x="' + tx.toFixed(1) + '" y="' + (Y(p.y) + 12).toFixed(1) + '" text-anchor="' + anc + '">접촉 ' + pct(p.c, p.n) + "%</text>";
    }).join("");
    var lab = pts.filter(function (p) { return p.n; }).map(function (p) { return p.name + " 명단 " + p.n + "가구 접촉 " + pct(p.c, p.n) + "%"; }).join(", ");
    return '<svg class="rp-map" viewBox="0 0 ' + W + " " + Hh + '" role="img" aria-label="' + esc(lab || "명단 가구 없음") + '">' +
      '<g class="rp-mg"><path d="M' + X(0) + " " + (Y(0) - 6) + "v12M" + (X(0) - 6) + " " + Y(0) + 'h12"/></g><text class="rp-ms" x="' + (X(0) + 8) + '" y="' + (Y(0) + 4) + '">시청</text>' +
      '<text class="rp-ms" x="' + (W - 14) + '" y="18" text-anchor="end">북 ↑</text>' + dots +
      '<g class="rp-mk" transform="translate(12 ' + (Hh - 34) + ')"><circle class="rp-mb" cx="7" cy="7" r="7"/><text class="rp-ms" x="20" y="11">원 크기 = 명단 가구</text>' +
      '<circle class="rp-mc" cx="7" cy="25" r="5"/><text class="rp-ms" x="20" y="29">안쪽 = 접촉한 비율</text></g></svg>';
  }
  function trendSvg(t) {
    var W = 360, Hh = 190, L = 34, Rr = 12, T = 14, Bm = 30, w = W - L - Rr, h = Hh - T - Bm, tot = Math.max(1, t.total);
    function X(i) { return L + i / t.span * w; } function Y(v) { return T + h - v / tot * h; }
    var line = t.points.map(function (v, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1); }).join("");
    var area = t.points.length ? line + "L" + X(t.points.length - 1).toFixed(1) + " " + Y(0) + "L" + X(0) + " " + Y(0) + "Z" : "";
    var lastI = t.points.length - 1, lastV = t.points[lastI] || 0;
    var grid = [0, .5, 1].map(function (f) { return '<line class="rp-gl" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(f * tot).toFixed(1) + '" y2="' + Y(f * tot).toFixed(1) + '"/><text class="rp-ms" x="' + (L - 6) + '" y="' + (Y(f * tot) + 4).toFixed(1) + '" text-anchor="end">' + Math.round(f * tot) + "</text>"; }).join("");
    return '<svg class="rp-trend" viewBox="0 0 ' + W + " " + Hh + '" role="img" aria-label="' + esc("차수 " + t.span + "일 중 " + lastI + "일째 누적 접촉 " + lastV + "가구, 명단 " + t.total + "가구") + '">' + grid +
      '<line class="rp-tg" x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(t.span) + '" y2="' + Y(tot) + '"/>' +
      (area ? '<path class="rp-ta" d="' + area + '"/><path class="rp-tl" d="' + line + '"/><circle class="rp-tp" cx="' + X(lastI).toFixed(1) + '" cy="' + Y(lastV).toFixed(1) + '" r="4.5"/>' +
        '<text class="rp-ml" x="' + (X(lastI) + (lastI / t.span > .7 ? -8 : 8)).toFixed(1) + '" y="' + (Y(lastV) - 8).toFixed(1) + '" text-anchor="' + (lastI / t.span > .7 ? "end" : "start") + '">' + lastV + "가구</text>" : "") +
      '<text class="rp-ms" x="' + L + '" y="' + (Hh - 8) + '">' + esc(dot(t.start)) + '</text><text class="rp-ms" x="' + (W - Rr) + '" y="' + (Hh - 8) + '" text-anchor="end">' + esc(dot(t.end)) + " 마감</text></svg>" +
      '<p class="rp-key"><i class="rp-kl"></i>누적 접촉 <i class="rp-kg"></i>마감까지 고르게 처리할 때</p>';
  }
  function tagHtml(t) { return '<span class="rp-tag' + (t === "가상" ? " v" : t === "공공데이터" ? " p" : "") + '">' + esc(t) + "</span>"; }

  /** 모델 → 보고서 HTML(화면·인쇄·공유 보기 공통) */
  function html(m) {
    var out = [];
    out.push('<article class="rp-doc" lang="ko" aria-label="' + esc(m.title) + '">');
    // ── 1쪽: 제목 상자·작성 부서/일자·요약 ──
    out.push('<section class="rp-p1"><header class="rp-head"><h2 class="rp-title">' + esc(m.title) + '</h2><p class="rp-period">' + esc(dot(m.period.from) + " ~ " + dot(m.period.to)) + "</p></header>");
    out.push('<p class="rp-meta"><span>' + esc(dot(m.made)) + "</span><span>" + esc(m.office) + "</span></p>");
    out.push('<p class="rp-vnote">※ 가구·주민 신호·연계 숫자는 시연용 <b>가상</b> 자료입니다(실제 개인정보 없음).</p>');
    out.push('<div class="rp-verdict' + (m.upcoming || m.onTrack ? "" : " warn") + '"><span class="rp-vk">한 줄 결론</span><p>' + esc(m.verdict) + "</p></div>");
    out.push('<div class="rp-kpis">' + m.kpis.map(function (k) { return '<div class="rp-kpi' + (k.tone ? " " + k.tone : "") + '"><span class="rp-kk">' + esc(k.k) + '</span><b class="rp-kv num">' + esc(k.v) + (k.u ? "<small>" + esc(k.u) + "</small>" : "") + '</b><span class="rp-ks">' + esc(k.s) + "</span></div>"; }).join("") + "</div>");
    out.push('<div class="rp-sum">' + li(1, "핵심 현황") + m.summary.map(function (s) { return li(2, s); }).join("") + li(1, "조치 사항") + m.asks.map(function (s) { return li(2, s); }).join("") + "</div>");
    out.push('<p class="rp-cont">상세 내용은 다음 쪽부터</p></section>');
    // ── 본문 Ⅰ~Ⅴ ──
    out.push('<section class="rp-body">');
    var c = 0, open = false;
    m.body.forEach(function (n) {
      if (n.t === "ch") { if (open) out.push("</div>"); out.push('<div class="rp-chap"><h3 class="rp-ch"><span class="num">' + ROMAN[c++] + ".</span> " + esc(n.text) + "</h3>"); open = true; }
      else if (n.t === "li") out.push(li(n.lv, n.text));
      else if (n.t === "fig") {
        var g = n.kind === "donut" ? donut(n.data) : n.kind === "bars" ? bars(n.data) : n.kind === "map" ? map(n.data) : trendSvg(n.data);
        out.push('<figure class="rp-fig rp-' + n.kind + 'f">' + g + '<figcaption><b>[그림 ' + n.no + "]</b> " + esc(n.title) + '<span class="rp-src">※ 출처: ' + esc(n.src) + " " + (n.tags || []).map(tagHtml).join(" ") + "</span></figcaption></figure>");
      } else if (n.t === "tbl") {
        out.push('<div class="rp-tblw"><p class="rp-tcap"><b>&lt;표 ' + n.no + "&gt;</b> " + esc(n.title) + '<span class="rp-unit">' + esc(n.unit) + '</span></p><div class="rp-tscroll"><table class="rp-tbl"><thead><tr>' +
          n.head.map(function (x) { return '<th scope="col">' + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          n.rows.map(function (r) { return "<tr>" + r.map(function (x, i) { return i ? '<td class="num">' + esc(x) + "</td>" : '<th scope="row">' + esc(x) + "</th>"; }).join("") + "</tr>"; }).join("") +
          '</tbody><tfoot><tr>' + n.foot.map(function (x, i) { return i ? '<td class="num">' + esc(x) + "</td>" : '<th scope="row">' + esc(x) + "</th>"; }).join("") + "</tr></tfoot></table></div>" +
          '<p class="rp-src">※ 출처: ' + esc(n.src) + " " + (n.tags || []).map(tagHtml).join(" ") + "</p></div>");
      }
    });
    if (open) out.push("</div>");
    out.push('<p class="rp-end">끝.</p>');
    out.push('<aside class="rp-srcs" aria-label="데이터 출처"><h4>데이터 출처</h4><ul>' + m.sources.map(function (s) { return "<li>" + tagHtml(s.tag) + " " + esc(s.text) + "</li>"; }).join("") + "</ul>" +
      '<p class="rp-made">닿음 출력 ' + esc(dot(m.made) + " " + m.madeTime) + "</p></aside>");
    out.push("</section></article>");
    return out.join("");
  }
  function li(lv, text) { return '<p class="rp-li l' + lv + '"><span class="rp-sym" aria-hidden="true">' + SYM[lv - 1] + "</span><span>" + esc(text) + "</span></p>"; }

  /** 한글(hwp) 붙여넣기용 개조식 글 — 단계마다 2칸(한글 1자) 들여쓰기 */
  function text(m) {
    var L = [m.title, dot(m.period.from) + " ~ " + dot(m.period.to), dot(m.made) + " " + m.office, "", "※ 가구·주민 신호·연계 숫자는 시연용 가상 자료", "", "[한 줄 결론] " + m.verdict, ""];
    var c = 0;
    m.body.forEach(function (n) {
      if (n.t === "ch") { L.push(""); L.push(ROMAN[c++] + ". " + n.text); }
      else if (n.t === "li") L.push(new Array(n.lv).join("  ") + SYM[n.lv - 1] + " " + n.text);
      else if (n.t === "fig") L.push("  [그림 " + n.no + "] " + n.title + " (※ 출처: " + n.src + ")");
      else if (n.t === "tbl") { L.push("  <표 " + n.no + "> " + n.title + " " + n.unit); L.push("  " + n.head.join("\t")); n.rows.concat([n.foot]).forEach(function (r) { L.push("  " + r.join("\t")); }); }
    });
    L.push("", "끝.", "", "데이터 출처");
    m.sources.forEach(function (s) { L.push("  [" + s.tag + "] " + s.text); });
    return L.join("\n");
  }

  // ── 공유 링크 부호화: j.=JSON base64url, z.=deflate-raw(브라우저 지원 시) ──
  function b64u(bytes) { var s = ""; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return (typeof btoa !== "undefined" ? btoa(s) : Buffer.from(s, "binary").toString("base64")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unb64u(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = typeof atob !== "undefined" ? atob(s) : Buffer.from(s, "base64").toString("binary"), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function utf8(s) { return new TextEncoder().encode(s); } function deutf8(a) { return new TextDecoder().decode(a); }
  function encodeSync(m) { return "j." + b64u(utf8(JSON.stringify(m))); }
  function decodeSync(s) { if (s.indexOf("j.") !== 0) throw new Error("형식"); return JSON.parse(deutf8(unb64u(s.slice(2)))); }
  function pipe(bytes, Stream) { return new Response(new Blob([bytes]).stream().pipeThrough(new Stream("deflate-raw"))).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  function encode(m) { return typeof CompressionStream === "undefined" ? Promise.resolve(encodeSync(m)) : pipe(utf8(JSON.stringify(m)), CompressionStream).then(function (b) { return "z." + b64u(b); }).catch(function () { return encodeSync(m); }); }
  function decode(s) { if (s.indexOf("z.") !== 0) return Promise.resolve(decodeSync(s)); return pipe(unb64u(s.slice(2)), DecompressionStream).then(function (b) { return JSON.parse(deutf8(b)); }); }

  // ═══════════ S10j-2 내려받기: 엑셀(.xlsx)·한글(.hwpx) — 같은 모델(m)에서 만든다(가상 집계 숫자만, 개인 식별값 없음) ═══════════
  var ORG = /(행정안전부|보건복지부|국립중앙의료원|기상청|국토교통부|한국사회보장정보원|닿음)/;
  /** 출처 글 한 줄 → {구분, 기관, 데이터 이름, 기준일} (기관·날짜는 글에서 찾고, 없으면 «-») */
  function srcRow(kind, text, use) {
    var s = String(text || ""), d = (s.match(/\d{4}-\d{2}(-\d{2})?/) || [""])[0], o = (s.match(ORG) || [""])[0];
    if (kind === "가상") { o = "닿음 시연 자료"; d = d || "가상"; }
    return { kind: kind, org: o || "-", name: s, date: d || "-", use: use || "" };
  }
  function sources(m) {
    var out = [], seen = {};
    function add(r) { var k = r.kind + "|" + r.name; if (!seen[k]) { seen[k] = 1; out.push(r); } }
    m.sources.forEach(function (s) { add(srcRow(s.tag, s.text, "보고서 전체")); });
    m.body.forEach(function (n) { if ((n.t === "fig" || n.t === "tbl") && n.src) add(srcRow((n.tags || [])[0] || "닿음 집계", n.src, n.t === "tbl" ? "<표 " + n.no + "> " + n.title : "[그림 " + n.no + "] " + (n.sheet || ""))); });
    return out;
  }
  function numOf(v) { var x = Number(String(v).replace(/,/g, "")); return isFinite(x) && String(v).trim() !== "" ? x : null; }
  function bodyLines(m, withRefs) {
    var L = [], c = 0;
    m.body.forEach(function (n) {
      if (n.t === "ch") L.push({ lv: 0, text: ROMAN[c++] + ". " + n.text });
      else if (n.t === "li") L.push({ lv: n.lv, text: SYM[n.lv - 1] + " " + n.text });
      else if (withRefs && n.t === "fig") L.push({ lv: 4, text: "※ [그림 " + n.no + "] " + n.title + (n.sheet && n.kind !== "map" ? " → «" + n.sheet + "» 시트" : "") });
      else if (withRefs && n.t === "tbl") L.push({ lv: 4, text: "※ <표 " + n.no + "> " + n.title + " → «" + n.sheet + "» 시트" });
    });
    return L;
  }
  /** 모델 → DaeumXlsx.build(spec) 의 spec. 합계·비율·증감은 엑셀 수식, 요약 숫자는 각 시트 합계칸을 참조 */
  function xlsxSpec(m) {
    var sheets = [], tb = null;
    m.body.forEach(function (n) {
      if (n.t === "tbl") {
        tb = n;
        var keys = n.head.map(function (_, i) { return "k" + i; }), R = n.rate;
        var cols = n.head.map(function (h, i) {
          if (R && i === R.col) { var a = keys[R.num], b = keys[R.den]; return { key: keys[i], h: h, type: "pct", fx: "IF({" + b + "}=0,0,{" + a + "}/{" + b + "})", calc: function (g) { return g(b) ? g(a) / g(b) : 0; } }; }
          return { key: keys[i], h: h, type: i === 0 ? "text" : "int" };
        });
        sheets.push({ name: n.sheet || "표" + n.no, title: "<표 " + n.no + "> " + n.title, unit: n.unit.replace(/^\(|\)$/g, ""), note: "합계·접촉률은 수식입니다 — 숫자를 고치면 합계와 요약 시트가 함께 바뀝니다.", src: "※ 출처: " + n.src, tags: n.tags,
          columns: cols, rows: n.rows.map(function (r) { return r.map(function (v, i) { return i === 0 ? v : R && i === R.col ? null : numOf(v); }); }), total: "합계" });
      } else if (n.t === "fig" && (n.kind === "donut" || n.kind === "bars")) {
        var share = n.agg !== "funnel";
        sheets.push({ name: n.sheet || "그림" + n.no, title: "[그림 " + n.no + "] " + n.title, unit: "단위: " + (n.unitName || "건") + ", %", src: "※ 출처: " + n.src, tags: n.tags,
          note: share ? "비율 = 항목 ÷ 합계(수식)" : "비율 = 단계 ÷ 첫 단계(수식) — 단계는 앞 단계에 포함되므로 합계를 내지 않습니다.",
          columns: [{ key: "a", h: n.item || "항목", type: "text" }, { key: "n", h: n.unitName || "건수", type: "int" },
            share ? { key: "r", h: "비율", type: "pct", fx: "IF({n:sum}=0,0,{n}/{n:sum})", calc: function (g, cx) { var t = cx.sum("n"); return t ? g("n") / t : 0; } }
                  : { key: "r", h: "첫 단계 대비", type: "pct", fx: "IF({n:first}=0,0,{n}/{n:first})" }],
          rows: n.data.map(function (x) { var f0 = n.data[0] ? n.data[0].n : 0; return [x.label, x.n, share ? null : (f0 ? x.n / f0 : 0)]; }), total: share ? "합계" : false });
      } else if (n.t === "fig" && n.kind === "trend") {
        var d = n.data, base = new Date(d.start + "T00:00:00");
        sheets.push({ name: n.sheet || "추세", title: "[그림 " + n.no + "] " + n.title, unit: "단위: 가구", src: "※ 출처: " + n.src, tags: n.tags, note: "하루 증감 = 오늘 누적 − 어제 누적(수식) · 목표선 = 명단 × 경과일 ÷ 차수 일수(수식)",
          columns: [{ key: "d", h: "날짜", type: "date" }, { key: "c", h: "누적 접촉", type: "int" }, { key: "x", h: "하루 증감", type: "int", fx: "{c}-{c:prev}", calc: function (g) { return g("c") - g.prev("c"); } },
            { key: "i", h: "경과일", type: "int" }, { key: "g", h: "목표선", type: "dec", fx: d.total + "*{i}/" + d.span, calc: function (g) { return d.total * g("i") / d.span; } }],
          rows: d.points.map(function (v, i) { var x = new Date(base.getTime() + i * DAY); return [dot(ymd(x)), v, null, i, null]; }), total: false });
      }
    });
    var kp = m.kpis.map(function (k) {
      var v = numOf(k.v), o = { k: k.k, v: v != null ? v : k.v, u: k.u, s: k.s, type: v != null ? "int" : "text" };
      if (k.u === "%") { o.type = "pct"; o.v = v != null ? v / 100 : k.v; o.u = ""; }
      return o;
    });
    if (tb) { // 표 합계와 요약 숫자가 같을 때만 참조로 잇는다(범위가 다르면 값 그대로)
      var foot = tb.foot;
      if (kp[0] && kp[0].v === foot[1]) kp[0].ref = { sheet: tb.sheet, col: "k1" };
      if (kp[1] && kp[1].type === "pct" && kp[0] && kp[0].ref) { kp[1].fx = "IF([" + tb.sheet + ":k1]=0,0,[" + tb.sheet + ":k2]/[" + tb.sheet + ":k1])"; kp[1].v = foot[1] ? foot[2] / foot[1] : 0; }
    }
    sheets.unshift({ name: "보고서 본문", title: m.title, note: dot(m.period.from) + " ~ " + dot(m.period.to) + " · 정부 보고서 개조식(□ ○ - ·)", text: bodyLines(m, true).concat([{ lv: 2, text: "끝." }]) });
    return {
      title: m.title, subtitle: dot(m.period.from) + " ~ " + dot(m.period.to), made: dot(m.made) + " " + m.madeTime, office: m.office,
      note: "※ 가구·주민 신호·연계 숫자는 시연용 가상 자료입니다(실제 개인정보 없음).", conclusion: m.verdict, kpis: kp,
      lines: [{ lv: 1, text: "□ 핵심 현황" }].concat(m.summary.map(function (s) { return { lv: 2, text: "○ " + s }; }), [{ lv: 1, text: "□ 조치 사항" }], m.asks.map(function (s) { return { lv: 2, text: "○ " + s }; })),
      sheets: sheets, sources: sources(m), footer: "닿음 · 시연용 가상 자료"
    };
  }
  /** 모델 → DaeumHwpx.build(doc) 의 doc. 표 합계 칸은 한글 표 계산식(=SUM), 접촉률은 =C/B*100 */
  function hwpxDoc(m) {
    var B = [{ t: "box", label: "한 줄 결론", text: m.verdict }];
    B.push({ t: "tbl", title: "핵심 숫자", head: m.kpis.map(function (k) { return k.k; }), rows: [m.kpis.map(function (k) { return k.v + (k.u || ""); })], align: "center", src: "" });
    B.push({ t: "li", lv: 1, text: "핵심 현황" }); m.summary.forEach(function (s) { B.push({ t: "li", lv: 2, text: s }); });
    B.push({ t: "li", lv: 1, text: "조치 사항" }); m.asks.forEach(function (s) { B.push({ t: "li", lv: 2, text: s }); });
    B.push({ t: "break" });
    var c = 0;
    m.body.forEach(function (n) {
      if (n.t === "ch") B.push({ t: "ch", text: ROMAN[c++] + ". " + n.text });
      else if (n.t === "li") B.push({ t: "li", lv: n.lv, text: n.text });
      else if (n.t === "tbl") {
        var R = n.rate, head = n.head.map(function (h, i) { return R && i === R.col ? h + "(%)" : h; });
        var rows = n.rows.map(function (r) { return r.map(function (v, i) { if (i === 0) return v; if (R && i === R.col) { var b = numOf(r[R.den]); return b ? Math.round(numOf(r[R.num]) / b * 1000) / 10 : 0; } return numOf(v); }); });
        var sum = []; for (var i = 1; i < head.length; i++) if (!R || i !== R.col) sum.push(i);
        var fx = {}, val = {};
        if (R) { var A = String.fromCharCode(65 + R.num), Bc = String.fromCharCode(65 + R.den); fx[R.col] = "=" + A + "{r}/" + Bc + "{r}*100"; val[R.col] = numOf(n.foot[R.den]) ? Math.round(numOf(n.foot[R.num]) / numOf(n.foot[R.den]) * 1000) / 10 : 0; }
        B.push({ t: "tbl", title: "<표 " + n.no + "> " + n.title, unit: n.unit, head: head, rows: rows, foot: { label: "합계", sum: sum, fx: fx, val: val }, src: "※ 출처: " + n.src + " [" + (n.tags || []).join("·") + "]" });
      } else if (n.t === "fig") {
        if (n.kind === "donut" || n.kind === "bars") {
          var share = n.agg !== "funnel";
          B.push({ t: "tbl", title: "[그림 " + n.no + "] " + n.title, unit: "(단위: " + (n.unitName || "건") + ")", head: [n.item || "항목", n.unitName || "건수"], rows: n.data.map(function (x) { return [x.label, x.n]; }),
            foot: share ? { label: "합계", sum: [1] } : null, src: "※ 출처: " + n.src + " [" + (n.tags || []).join("·") + "]" + (share ? "" : " — 단계는 앞 단계에 포함") });
        } else if (n.kind === "trend") {
          var d = n.data, last = d.points[d.points.length - 1] || 0, goal = Math.round(d.total * (d.points.length - 1) / d.span);
          B.push({ t: "p", kind: "src", text: "※ [그림 " + n.no + "] " + n.title + " — 누적 접촉 " + last + "가구, 같은 날 목표선 " + goal + "가구 (출처: " + n.src + ")" });
        } else B.push({ t: "p", kind: "src", text: "※ [그림 " + n.no + "] " + n.title + " — 읍면별 숫자는 <표 1> 참조, 지도는 화면·PDF 보고서에 있음" });
      }
    });
    B.push({ t: "p", kind: "end", text: "끝." });
    B.push({ t: "ch", text: "데이터 출처" });
    B.push({ t: "tbl", title: "", head: ["구분", "제공기관", "데이터 이름", "기준일"], rows: sources(m).map(function (s) { return [s.kind, s.org, s.name, s.date]; }), widths: [6200, 8400, 26190, 7400], src: "※ 가상 = 시연용으로 만든 자료(실제 주민·행정자료 0건)" });
    return { title: m.title, subtitle: dot(m.period.from) + " ~ " + dot(m.period.to), made: dot(m.made), office: m.office, note: "※ 가구·주민 신호·연계 숫자는 시연용 가상 자료입니다(실제 개인정보 없음).", blocks: B };
  }

  var api = { build: build, html: html, text: text, trend: trend, areaPoints: areaPoints, dot: dot, encode: encode, decode: decode, encodeSync: encodeSync, decodeSync: decodeSync, SYM: SYM, xlsxSpec: xlsxSpec, hwpxDoc: hwpxDoc, sources: sources };
  F.reportDoc = api;

  // ═══════════ 브라우저 연결 ═══════════
  if (typeof document === "undefined") return api;
  var me = document.currentScript && document.currentScript.src;
  var BASE = me ? me.replace(/[^/]*$/, "") : new URL("../shared/", location.href).href;
  if (!document.querySelector('link[data-rp-css]')) { var lk = document.createElement("link"); lk.rel = "stylesheet"; lk.href = BASE + "report_doc.css"; lk.setAttribute("data-rp-css", ""); document.head.appendChild(lk); }
  api.BASE = BASE;

  function say(box, t) { var s = box && box.querySelector(".rp-status"); if (s) { s.textContent = ""; setTimeout(function () { s.textContent = t; }, 30); } }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (ok, no) { try { var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); ok(); } catch (e) { no(e); } });
  }
  function linkOf(m) { return encode(m).then(function (z) { return BASE + "report_view.html#" + z; }); }
  /** A4 인쇄·PDF 저장 — 문서만 남기고 나머지는 숨겨 인쇄 대화상자를 연다 */
  function printDoc(docEl) {
    var old = document.getElementById("rpPrint"); if (old) old.remove();
    var host = document.createElement("div"); host.id = "rpPrint"; host.appendChild(docEl.cloneNode(true)); document.body.appendChild(host);
    document.documentElement.classList.add("rp-printing");
    var done = false; function clean() { if (done) return; done = true; document.documentElement.classList.remove("rp-printing"); host.remove(); window.removeEventListener("afterprint", clean); }
    window.addEventListener("afterprint", clean);
    setTimeout(function () { window.print(); setTimeout(clean, 1500); }, 60);
  }
  var ICO = {
    share: '<path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    print: '<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    xlsx: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    hwp: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'
  };
  // S10j-2: 엑셀·한글 부품은 누를 때 한 번만 싣는다(shared/xlsx.js·hwpx.js — 이 파일 옆)
  var loading = {};
  function need(file, name) {
    if (root[name]) return Promise.resolve(root[name]);
    return loading[file] || (loading[file] = new Promise(function (ok, no) {
      var sc = document.createElement("script"); sc.src = BASE + file; sc.onload = function () { root[name] ? ok(root[name]) : no(new Error(file)); }; sc.onerror = function () { delete loading[file]; no(new Error(file)); }; document.head.appendChild(sc);
    }));
  }
  function fname(m, ext) { return String(m.title).replace(/[\\\/:*?"<>|]+/g, " ").replace(/\s+/g, "_") + "_" + String(m.made).replace(/-/g, "") + "." + ext; }
  function saveXlsx(m) { return need("xlsx.js", "DaeumXlsx").then(function (X) { return X.download(xlsxSpec(m), fname(m, "xlsx")); }); }
  function saveHwpx(m) { return need("xlsx.js", "DaeumXlsx").then(function () { return need("hwpx.js", "DaeumHwpx"); }).then(function (W) { return W.download(hwpxDoc(m), fname(m, "hwpx")); }); }
  function tb(act, label, ico, primary) { return '<button type="button" class="d-btn ' + (primary ? "d-btn-p" : "d-btn-s") + ' rp-btn" data-rp="' + act + '" data-h="light"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICO[ico] + "</svg>" + label + "</button>"; }
  /** box 안에 도구 막대 + 문서. opts.readonly 면 «한글 문안 복사» 없이 공유 보기용 */
  function mount(box, m, opts) {
    opts = opts || {};
    box.innerHTML = '<div class="rp-bar" role="toolbar" aria-label="보고서 공유·인쇄">' + tb("share", "공유하기", "share", true) + tb("print", "PDF 저장·인쇄", "print") + tb("link", "링크 복사", "link") + tb("xlsx", "엑셀로", "xlsx") + tb("hwpx", "한글로", "hwp") +
      (opts.readonly ? "" : tb("text", "한글 붙여넣기 문안", "copy")) + '</div><p class="rp-status small" role="status" aria-live="polite"></p>' + html(m);
    box.querySelector(".rp-bar").addEventListener("click", function (e) {
      var b = e.target.closest("[data-rp]"); if (!b) return; var a = b.getAttribute("data-rp");
      if (a === "print") return printDoc(box.querySelector(".rp-doc"));
      if (a === "xlsx" || a === "hwpx") return (a === "xlsx" ? saveXlsx(m) : saveHwpx(m)).then(function (n) { say(box, (a === "xlsx" ? "엑셀" : "한글") + " 파일을 내려받았습니다 — " + n + (a === "xlsx" ? " (합계·비율은 수식)" : " (표 합계는 한글 표 계산식)")); }, function () { say(box, "파일을 만들지 못했습니다. 잠시 뒤 다시 눌러 주세요."); });
      if (a === "text") return copyText(text(m)).then(function () { say(box, "한글 붙여넣기용 개조식 문안을 복사했습니다."); }, function () { say(box, "복사하지 못했습니다. 브라우저 권한을 확인해 주세요."); });
      var urlP = opts.url ? Promise.resolve(opts.url) : linkOf(m);
      urlP.then(function (url) {
        if (a === "share" && navigator.share) {
          return navigator.share({ title: m.title, text: m.verdict + " (시연용 가상 자료)", url: url }).then(function () { say(box, "공유했습니다."); }, function (er) { if (er && er.name !== "AbortError") say(box, "공유하지 못했습니다 — 링크 복사를 써 주세요."); });
        }
        return copyText(url).then(function () { say(box, a === "share" ? "이 기기는 공유하기를 지원하지 않아 링크를 복사했습니다. 카톡·문자·메일에 붙여 넣으세요." : "읽기 전용 보고서 링크를 복사했습니다(가상 집계 숫자만 담김)."); }, function () { say(box, "링크를 복사하지 못했습니다."); });
      });
    });
    return box;
  }
  api.mount = mount; api.printDoc = printDoc; api.linkOf = linkOf; api.saveXlsx = saveXlsx; api.saveHwpx = saveHwpx;

  // 공무원 창구 현황 탭: «주간/월간 보고서» 단추를 먼저 받아 정부 보고서 문서로 그린다(mount.js 의 옛 간이 미리보기 대신).
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("#reportRoot [data-report]");
    var last = F.report && F.report.last;
    if (!b || !last || !F.report.countdown) return; // 집계 전이면 mount.js 가 집계한 뒤 이 단추를 다시 누른다
    e.stopPropagation(); e.preventDefault();
    var kind = b.getAttribute("data-report") === "monthly" ? "monthly" : "weekly", S = last.stats, H = S.households;
    var cd = F.report.countdown(F.report.currentRound(last.input.now), { now: last.input.now, done: H.closed, total: H.total });
    var m = build(kind, S, last.input, cd, {});
    var tab = document.getElementById("tab-report"), box = document.getElementById("rpDoc");
    if (!box) { box = document.createElement("div"); box.id = "rpDoc"; box.className = "rp-host"; var top = tab && tab.querySelector(".stats-top"); if (top) top.after(box); else (tab || document.body).appendChild(box); }
    mount(box, m);
    var pv = document.querySelector('#reportRoot [data-slot="preview"]');
    if (pv) pv.innerHTML = '<p class="small rp-made-note">' + esc(m.title) + ' — 아래에 만들었습니다(공유·PDF 저장은 보고서 위 단추).</p>';
    if (root.DaeumUI && DaeumUI.haptic) DaeumUI.haptic("success");
    var head = box.querySelector(".rp-title"); if (head) { head.setAttribute("tabindex", "-1"); box.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); head.focus({ preventScroll: true }); }
  }, true);
  return api;
});
