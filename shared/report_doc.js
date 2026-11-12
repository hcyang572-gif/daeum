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
    calc: { tag: "닿음 집계", text: "닿음 자동 집계(AI 미사용) — 화면·보고서·내려받기 모두 같은 숫자, 공식 실적은 행복이음 숫자와 대조" }
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
  /** [그림] 추세 판정 — 그래프에 그린 두 숫자(마지막 날 누적 접촉 vs 같은 날 목표선)로만 정한다(처리 진도와 섞지 않음) */
  function trendGoal(tr) { return tr.total * Math.max(0, tr.points.length - 1) / tr.span; }
  function trendAbove(tr) { var last = tr.points[tr.points.length - 1] || 0; return last >= trendGoal(tr); }
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
  // ── 주요 사례(가림) ──
  var IND = { power_cut: "단전", water_cut: "단수", gas_cut: "가스 중단", health_ins_arrears: "건보료 체납", telecom_arrears: "통신비 체납", mgmt_fee_arrears: "관리비 체납",
    rent_arrears: "임차료 체납", medical_overspend: "의료비 과다", job_loss: "실직", loan_overdue: "채무 연체", benefit_stopped: "급여 중지" };
  var REL = { neighbor: "이웃 알림", self: "본인 요청" };
  function pii(x) { return String(x || "").replace(/\d{6}\s*-?\s*[1-4]\d{6}/g, "******-*******").replace(/0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}/g, "0**-****-****").replace(/([A-Z]-\d)\d\d(?!\d)/g, "$1●●"); }
  function maskId(label) { return String(label || "가구").replace(/(\d)\d\d$/, "$1●●"); }
  function kindOf(h) {
    if (!h) return "";
    var age = h.members && h.members[0] ? h.members[0].age : null, n = h.members ? h.members.length : 0, t = [];
    if (h.single && age >= 75) t.push("75세 이상 1인 가구"); else if (h.single) t.push("1인 가구"); else if (n) t.push(n + "인 가구");
    if (h.disability) t.push("장애");
    var ind = Object.keys(h.indicators || {}).filter(function (k) { return h.indicators[k] && IND[k]; }).map(function (k) { return IND[k]; });
    if (ind.length) t.push("위기정보 " + ind.slice(0, 3).join("·"));
    return t.join(", ");
  }
  function cases(input, scope) {
    var H = {}; (input.households || []).forEach(function (h) { H[h.id] = h; });
    var out = [];
    (input.links || []).slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; }).forEach(function (l) {
      if (out.length >= 2 || (scope && l.area !== scope)) return;
      var h = H[l.householdId], names = (l.serviceNames || []).slice(0, 3);
      out.push({ head: maskId(l.label) + " · " + (l.area || "") + (kindOf(h) ? " · " + kindOf(h) : ""), body: "방문 상담 뒤 " + (names.join("·") || "서비스") + " 연계(" + dot(ymd(l.at)) + ") — 신청·결정 결과는 행복이음에서 확인" });
    });
    (input.requests || []).filter(function (r) { return r.status !== "cancelled" && r.situation && (!scope || r.region === scope); })
      .sort(function (a, b) { return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || (a.createdAt < b.createdAt ? 1 : -1); }).slice(0, 3 - out.length).forEach(function (r) {
        var who = r.proxy && r.proxy.isProxy ? (r.proxy.relation ? r.proxy.relation + " 대신 알림" : "대신 알림") : (REL[r.signal] || "본인 요청");
        var sit = pii(r.situation).replace(/\s+/g, " "); if (sit.length > 46) sit = sit.slice(0, 45) + "…";
        out.push({ head: "주민 신호 · " + (r.region || "") + " · " + who + (r.urgent ? " · 급함" : ""), body: "«" + sit + "» → " + (r.status === "new" ? "접수 당일 확인 대상" : r.status === "done" ? "연계 완료" : "담당자 확인·방문 예정") });
      });
    return out;
  }

  /** S11-d4 C안 [그림 1] — 누적 처리 완료(굵은 초록) vs 목표선(회색 점선), 누적 접촉은 옅은 회색 보조선. 가구 수로만 말함(% 없음). d = {start,end,span,total,done:[일별 누적],contact:[일별 누적],goal}.
      색은 직접 지정(PNG 로 구울 때도 같은 그림) — 초록 #2F5D50 · 경고 빨강 #B42318 */
  function paceSvg(d) {
    // 가로축은 «자료가 있는 구간»(시작~보고일 + 여유)만 — 마감까지 다 그리면 자료가 왼쪽 구석에 몰려 라벨이 겹친다(테오 11-02 지적 4)
    var last = d.done.length - 1, span = Math.max(1, d.span), xmax = Math.min(span, Math.max(last + 4, Math.round(last * 1.5)));
    var dn = d.done[last] || 0, ct = d.contact[d.contact.length - 1] || 0, goal = d.goal, gap = dn - goal, gEnd = d.total * xmax / span;
    var top = Math.max(dn, ct, goal, gEnd), step = top > 100 ? 50 : top > 50 ? 20 : 10, mx = Math.ceil(top * 1.1 / step) * step;
    var W = 670, H = 215, L = 34, R = 20, T = 14, B = 34, pw = W - L - R, ph = H - T - B;
    var X = function (i) { return (L + pw * i / xmax).toFixed(1); }, Y = function (v) { return (T + ph * (1 - v / mx)).toFixed(1); };
    var line = function (a) { return a.map(function (v, i) { return X(i) + "," + Y(v); }).join(" "); };
    var grid = "", v;
    for (v = 0; v <= mx; v += step) grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + (v ? "#D9D9D9" : "#B3B3B3") + '" stroke-width=".8"/><text x="' + (L - 6) + '" y="' + (+Y(v) + 3) + '" text-anchor="end" font-size="9" fill="#595959">' + v + "</text>";
    var md = function (iso) { var q = String(iso).split("-"); return +q[1] + ". " + +q[2] + "."; };
    var tk = function (i, l1, l2) { return '<text x="' + X(i) + '" y="' + (H - 20) + '" text-anchor="middle" font-size="9" fill="#595959">' + esc(l1) + "</text>" + (l2 ? '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="9" fill="#595959">' + esc(l2) + "</text>" : ""); };
    var ticks = tk(0, md(d.start), "시작") + tk(last, md(d.today || d.start), "보고일");
    var lab = function (x, y, txt, col, w, an) { return '<text x="' + x + '" y="' + y + '" font-size="10" font-weight="' + (w || 400) + '" fill="' + col + '"' + (an ? ' text-anchor="' + an + '"' : "") + ">" + esc(txt) + "</text>"; };
    var gapTxt = (gap < 0 ? "−" + (-gap) : "+" + gap) + "가구";
    var yd = +Y(dn), yg = +Y(goal), xl = +X(last);
    return '<svg class="rpc-pace" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="누적 처리 완료 ' + dn + "가구, 목표선 " + goal + "가구, 누적 접촉 " + ct + "가구, 명단 " + d.total + '가구" font-family="Malgun Gothic, Pretendard, sans-serif">' +
      '<rect width="' + W + '" height="' + H + '" fill="#fff"/>' + grid + ticks +
      '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(xmax) + '" y2="' + Y(gEnd) + '" stroke="#B3B3B3" stroke-width="1.3" stroke-dasharray="5 4"/>' +
      '<polyline points="' + line(d.contact) + '" fill="none" stroke="#A6A6A6" stroke-width="1.2"/>' +
      '<polyline points="' + line(d.done) + '" fill="none" stroke="#2F5D50" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + xl + '" cy="' + yd + '" r="3.4" fill="#2F5D50"/><circle cx="' + xl + '" cy="' + yg + '" r="3" fill="#fff" stroke="#595959"/>' +
      (gap < 0 ? '<line x1="' + xl + '" x2="' + xl + '" y1="' + (yd - 4) + '" y2="' + (yg + 4) + '" stroke="#B42318" stroke-width="1.5"/>' : "") +
      lab(xl + 9, (yd + yg) / 2 + 3, gapTxt, gap < 0 ? "#B42318" : "#2F5D50", 700) + lab(xl + 9, yd + 15, "처리 완료 " + dn, "#2F5D50", 700) + lab(xl - 8, yg - 10, "목표선 " + goal, "#595959", 400, "end") +
      lab(xl - 8, +Y(ct) - 7, "접촉 " + ct, "#8C8C8C", 400, "end") + lab(W - R, +Y(gEnd) - 7, "점선: 마감 " + md(d.end) + "에 명단 " + d.total + "가구", "#595959", 400, "end") + "</svg>";
  }

  // ═══ S11-d4 C안(공문 정제형) 모델 — 내용: 02_원고/S11-d4_보고서_내용안.md §1 산식 · 글 속 **굵게** !!빨강!! 표시는 화면·한글이 글자 모양으로 바꾼다 ═══
  var WD = ["일", "월", "화", "수", "목", "금", "토"];
  function isOff(d) { return F.util && F.util.isOff ? F.util.isOff(d) : (d.getDay() === 0 || d.getDay() === 6); }
  function md(iso) { var p = String(iso).slice(0, 10).split("-"); return +p[1] + ". " + +p[2] + "."; }
  function plain(s) { return String(s == null ? "" : s).replace(/\*\*|!!/g, ""); }
  function minus(n) { return n < 0 ? "−" + (-n) : String(n); }
  function nextWork(from, n) { var d = new Date(from.getTime()); while (n > 0) { d = new Date(d.getTime() + DAY); if (!isOff(d)) n--; } return d; }
  function wdLabel(d) { return (d.getMonth() + 1) + ". " + d.getDate() + ".(" + WD[d.getDay()] + ")"; }
  /** 읍면 목표선: 명단 × 경과 ÷ 차수, 합계에 맞춰 «가장 큰 나머지» 순으로 올림 */
  function areaGoals(rows, total, goal) {
    var raw = rows.map(function (a) { return total ? a.households * goal / total : 0; }), g = raw.map(Math.floor), left = goal - g.reduce(function (s, x) { return s + x; }, 0);
    raw.map(function (r, i) { return [r - g[i], i]; }).sort(function (x, y) { return y[0] - x[0]; }).forEach(function (x) { if (left > 0) { g[x[1]]++; left--; } });
    return g;
  }

  function build(kind, stats, input, cd, o) {
    o = o || {};
    var H = stats.households, Q = stats.requests, Lk = stats.links, fu = stats.followUp || { retryDue: 0, escalate: 0, gaps: 0, notApplied: [] };
    var now = input.now ? new Date(input.now) : new Date();
    var name = kind === "monthly" ? "월간" : "주간", thisW = kind === "monthly" ? "이번 달" : "이번 주";
    var rep = (F.report && F.report[kind]) ? F.report[kind](stats, { countdown: cd, office: o.office, now: input.now }) : null;
    var period = rep ? rep.period : { from: ymd(now), to: ymd(now) };
    if (kind === "weekly" && period.from && period.from === period.to) period = { from: ymd(new Date(new Date(period.to + "T00:00:00").getTime() - 6 * DAY)), to: period.to };
    var scope = stats.scope, office = "상주시청"; // 11-02 호창님: 기관 표기는 «상주시청»만
    var areasMine = stats.byArea.filter(function (a) { return a.households; }).map(function (a) { return a.area; });
    var scopeTxt = scope ? scope : (areasMine.length ? "담당 " + areasMine.length + "개 읍면(" + areasMine.join("·") + ")" : "담당 지역");
    var r = cd.round, today = ymd(now), span = Math.max(1, days(r.start, r.end)), el = Math.max(0, Math.min(span, days(r.start, today)));
    var total = H.total, done = H.closed, goal = Math.round(total * el / span), diff = done - goal;
    var remain = total - done, inContact = Math.max(0, H.contacted - done), notC = Math.max(0, total - H.contacted);
    // 남은 평일(보고일 다음 날 ~ 마감) → 하루 목표 → 주 목표 = 하루 목표 × 다음 주 평일 수(공휴일 주 보정)
    var wdL = 0, endD = new Date(r.end + "T00:00:00"), c = new Date(today + "T00:00:00");
    while (c < endD) { c = new Date(c.getTime() + DAY); if (c <= endD && !isOff(c)) wdL++; }
    var perDay = wdL ? Math.ceil(remain / wdL) : remain, wk = 0, k;
    for (k = 1; k <= 7; k++) if (!isOff(new Date(new Date(today + "T00:00:00").getTime() + k * DAY))) wk++;
    wk = Math.min(5, wk) || 5;
    var weekGoal = perDay * wk, weekDone = (stats.closedDays || []).filter(function (d) { return d >= period.from && d <= period.to; }).length;
    var retry = fu.retryDue || 0, esc = Math.min(fu.escalate || 0, retry), newVisit = Math.max(0, weekGoal - (retry - esc)), retryPart = Math.min(Math.max(0, retry - esc), weekGoal);
    var short = Math.max(0, weekGoal - weekDone);
    // 읍면별: 명단 있는 곳만, 목표선·차이
    var rowsA = stats.byArea.filter(function (a) { return a.households; }), goalsA = areaGoals(rowsA, total, goal);
    var areaRows = rowsA.map(function (a, i) { return [a.area, a.households, a.closed || 0, goalsA[i], (a.closed || 0) - goalsA[i], a.retry || 0, a.open || 0]; });
    var worst = null; areaRows.forEach(function (x, i) { if (x[4] < 0 && (worst === null || x[4] < areaRows[worst][4])) worst = i; });
    // 누적 처리·접촉(날마다)
    var tr = trend(input, stats, cd), doneDaily = [], i2;
    for (i2 = 0; i2 <= el; i2++) doneDaily.push((stats.closedDays || []).filter(function (d) { return Math.max(0, days(r.start, d)) <= i2; }).length);
    var contactDaily = tr.points.slice(0, el + 1); while (contactDaily.length < el + 1) contactDaily.push(contactDaily[contactDaily.length - 1] || 0);
    var contactN = contactDaily[contactDaily.length - 1] || 0;
    var pace = { start: r.start, end: r.end, today: today, span: span, total: total, done: doneDaily, contact: contactDaily, goal: goal };

    var up = !!cd.upcoming, B = [];
    var diffTxt = diff < 0 ? "!!" + (-diff) + "가구 뒤처짐!!" : diff > 0 ? "**" + diff + "가구 앞섬**" : "같은 수준";
    var L1 = "명단 " + num(total) + "가구 중 **" + num(done) + "가구 처리 완료** — 고르게 처리했을 때(" + num(goal) + "가구)보다 " + diffTxt;
    var L2 = "다음 주 **" + weekGoal + "가구(하루 " + perDay + "가구)**를 처리하면 " + md(r.end) + " 마감 안에 끝남";
    var verdicts = up ? [r.label + " 시작 " + dot(r.start) + " 전 — 지난 차수 마무리 단계"] : [L1, L2];
    function ch(t) { B.push({ t: "ch", text: t }); }
    function li(lv, text) { B.push({ t: "li", lv: lv, text: text }); }
    ch("결론"); verdicts.forEach(function (v) { li(2, v); });
    var kpis = [
      { k: "처리 완료", v: String(done), u: "가구", s: "목표선 " + goal + " · " + (diff < 0 ? "!!−" + (-diff) + "가구!!" : diff > 0 ? "+" + diff + "가구" : "±0") },
      { k: "다음 주 필요", v: String(weekGoal), u: "가구", s: thisW + " 처리 " + weekDone + " · " + (short ? "!!부족 " + short + "가구!!" : "충분") },
      { k: "처리 중 주민 신고", v: String(Q.open || 0), u: "건", s: Q.openUrgent ? "긴급 " + Q.openUrgent + "건 포함" : "긴급 없음" }];
    var asks = [];
    if (!up) {
      ch("핵심 수치"); B.push({ t: "kpis" });
      var figTitle = diff < 0 ? "처리 완료가 목표선보다 " + (-diff) + "가구 아래" : "처리 완료가 목표선보다 " + diff + "가구 위";
      B.push({ t: "fig", kind: "pace", no: 1, title: figTitle, sub: (diff < 0 ? (contactN >= goal ? "접촉은 앞서 마무리 단계가 밀림 · " : "처리·접촉 모두 목표선 아래 · ") : "") + "(단위: 가구, " + dot(r.start) + " ~ " + md(today) + " 누적)", data: pace, sheet: "처리 추세", tags: ["공개 자료", "가상"],
        src: r.source + " · 처리·접촉 기록: 시연용 가상", note: "※ 목표선 = 명단 " + total + " × 경과 " + el + "일 ÷ 차수 " + span + "일(고르게 처리했다면 보고일까지 마쳤어야 할 가구)" });
      ch("위험 요인");
      if (esc) li(2, "3회 부재 **" + esc + "가구**가 재방문 동선을 막아 신규 방문이 밀림");
      if (Q.open) li(2, "처리 중 주민 신고 **" + Q.open + "건" + (Q.openUrgent ? "(긴급 " + Q.openUrgent + ")" : "") + "** — 접수 다음 근무일 안 확인 필요");
      if (!esc && !Q.open) li(2, "특이한 위험 요인 없음");
      var due1 = nextWork(now, 1); // 결정 요청 기한은 모두 «다음 주 동선 편성 전»(다음 근무일) — 11-02 테오 지적 1
      if (esc) asks.push({ main: "3회 부재 " + esc + "가구 — 통·이장 안부 확인 협조를 해당 읍면에 요청(공문) 승인", sub: "협의 후 확정 — 승인 시 직접 방문에서 " + esc + "가구가 빠져 신규 방문 확보", due: wdLabel(due1) + " 17:00" });
      if (diff < 0 && short > 0 && worst !== null) asks.push({ main: areaRows[worst][0] + " 방문 지원 — 다음 주 " + short + "가구분 인력 협조", sub: "승인 시 마감 안 완료 가능(미승인 시 하루 목표 재계산)", due: wdLabel(due1) + " 12:00" });
      asks.sort(function (a, b) { return a.due.slice(-5) < b.due.slice(-5) ? -1 : a.due.slice(-5) > b.due.slice(-5) ? 1 : 0; }); // 같은 날 기한은 이른 시각이 위로(11-02 테오 남은 하)
      ch("결정 요청");
      if (asks.length) B.push({ t: "ask", items: asks }); else li(2, "요청 없음");
      B.push({ t: "break" });
      ch("처리 상태");
      li(2, "남은 " + num(remain) + "가구 중 " + num(inContact) + "가구는 이미 만났거나 연락 중 — 새로 찾아갈 집은 " + num(notC) + "가구");
      li(3, "처리 **" + done + "** · 접촉 중 **" + inContact + "**" + (retry ? "(그중 재방문 " + retry + (esc ? ", 3회 부재 " + esc + " 포함" : "") + ")" : "") + " · 미접촉 **" + notC + "** = 명단 " + total);
    }
    ch("읍면별 현황");
    li(2, worst !== null ? areaRows[worst][0] + "이 목표선보다 " + (-areaRows[worst][4]) + "가구 뒤처져 가장 늦음" : "모든 읍면이 목표선 이상");
    var sum = areaRows.reduce(function (s, x) { for (var j = 1; j < 7; j++) s[j] += x[j]; return s; }, ["합계", 0, 0, 0, 0, 0, 0]);
    B.push({ t: "tbl", no: 1, title: "읍면별 처리 현황", unit: "(단위: 가구, 건)", head: ["읍면", "명단", "처리 완료", "목표선", "차이", "재방문", "처리 중 신고"], rows: areaRows, foot: sum, hl: worst, signCol: 4,
      src: "읍면 목표선 = 읍면 명단 × " + el + " ÷ " + span + "(합계 " + goal + "에 맞춰 반올림) · 읍면 이름: 행정안전부 주민등록 인구통계(2026-09) · 수치: 시연용 가상", tags: ["가상", "공공데이터"], sheet: "읍면별", note: "읍면 목표선 = 읍면 명단 × " + el + " ÷ " + span + "(합계 " + goal + "에 맞춰 반올림)" });
    ch("주민 신고·서비스 연계");
    li(2, "주민 신고 " + num(Q.total) + "건 중 " + (Q.byStatus.done || 0) + "건 연계 완료, " + (Q.open || 0) + "건은 처리 중" + (Q.openUrgent ? "(긴급 " + Q.openUrgent + ")" : ""));
    if (Q.total) li(3, stats.funnel.map(function (f) { return f.label.replace("요청 ", "") + " **" + f.n + "**"; }).join(" → "));
    li(2, "서비스 연계 " + num(Lk.total) + "건(" + Lk.households + "가구)" + (fu.gaps ? " — 그중 " + fu.gaps + "곳은 신청·결과 확인이 멈춤" : ""));
    if (Lk.byService.length) li(3, Lk.byService.slice(0, 3).map(function (s) { return s.name + " **" + s.n + "**"; }).join(" · "));
    if (!up) {
      ch("다음 주 계획");
      li(2, "다음 주 **" + weekGoal + "가구** = 재방문 **" + retryPart + "** + 신규 방문 **" + newVisit + "**" + (esc ? " (3회 부재 " + esc + "가구는 결정 요청 1 승인 시 통·이장 안부 확인으로)" : ""));
      if (Q.open) li(2, "처리 중 주민 신고 " + Q.open + "건은 다음 근무일 안 확인" + (Q.openUrgent ? ", 긴급 " + Q.openUrgent + "건 우선" : ""));
      if (fu.gaps) li(2, "연계가 멈춘 " + fu.gaps + "곳은 해당 기관에 신청·결정 결과 확인");
    }
    var srcRound = { tag: "공개 자료", text: "발굴 차수 일정: " + r.source };
    ch("붙임 — 자료 출처");
    li(2, "차수 일정 " + r.source + " · 읍면 이름 행정안전부 주민등록 인구통계(2026-09)");
    B.push({ t: "note", text: "※ 가구·신고·연계 숫자는 시연용 가상 자료(실제 개인정보 없음)이며 자동 집계(AI 미사용)입니다. 공식 실적은 행복이음 숫자와 대조." });

    var title = (scope ? scope + " " : "") + "복지 사각지대 현장 업무 " + name + " 현황";
    return {
      v: 2, kind: kind, title: title, subtitle: r.label.replace(/^(\d{4})년 제(\d+)차.*$/, "$1년 제$2차 발굴 명단") + " · " + dot(period.from) + " ~ " + md(period.to), period: period, made: today, madeTime: pad(now.getHours()) + ":" + pad(now.getMinutes()),
      office: office, scope: scope, scopeTxt: scopeTxt, verdict: verdicts.map(plain).join(" "), verdicts: verdicts, onTrack: diff >= 0, upcoming: up,
      kpis: up ? [] : kpis, gauge: [], summary: verdicts.map(plain), asks: asks.map(function (a) { return a.main; }),
      plan: { goal: goal, diff: diff, perDay: perDay, weekGoal: weekGoal, weekDone: weekDone, retry: retryPart, fresh: newVisit, short: short, wk: wk },
      body: B, sources: [SRC.virtual, srcRound, SRC.region, SRC.calc], pasteText: null
    };
  }

  // ── 그림(SVG 문자열) — S10k: shared/chart.js 로 옮겼다(화면과 함께 씀). 색은 클래스(c1~c5)로, 인쇄 땐 CSS 가 회색 단계로 바꾼다 ──
  var C = root.DaeumChart || (typeof require === "function" ? require("./chart.js") : null);
  function donut(d) { return C.donut(d); }
  function bars(d) { return C.bars(d); }
  function map(pts) { return C.map(pts); }
  function trendSvg(t) { return C.trendSvg(t); }
  function tagHtml(t) { return '<span class="rp-tag' + (t === "가상" ? " v" : t === "공공데이터" ? " p" : "") + '">' + esc(t) + "</span>"; }

  /** 글 속 **굵게** · !!빨강!! → HTML (먼저 이스케이프) */
  function rich(s) { return esc(s).replace(/!!(.+?)!!/g, '<b class="rpc-red">$1</b>').replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); }
  function cellNum(n, i, signCol) { return i === signCol && typeof n === "number" ? (n > 0 ? "+" + n : minus(n)) : num(n); }
  /** 모델 → 보고서 HTML(화면·인쇄·공유 보기 공통) — C안 공문 정제형: 칠한 칸 없이 선·글자만 */
  function html(m) {
    var out = [];
    out.push('<article class="rp-doc rpc" lang="ko" aria-label="' + esc(m.title) + '">');
    out.push('<header class="rp-head rpc-head"><h2 class="rp-title rpc-title">' + esc(m.title) + '</h2><p class="rpc-sub">' + esc(m.subtitle || "") + '</p></header><p class="rpc-meta">보고일 ' + esc(dot(m.made)) + " · " + esc(m.office) + "</p>");
    m.body.forEach(function (n) {
      if (n.t === "ch") out.push('<h3 class="rpc-sec"><span aria-hidden="true">□</span> ' + esc(n.text) + "</h3>");
      else if (n.t === "li") out.push('<p class="rpc-li l' + n.lv + '"><span class="rp-sym" aria-hidden="true">' + SYM[n.lv - 1] + "</span><span>" + rich(n.text) + "</span></p>");
      else if (n.t === "kpis") out.push('<div class="rpc-kpis">' + m.kpis.map(function (k) { return '<div class="rpc-kpi"><span class="rpc-kk">' + esc(k.k) + '</span><b class="rpc-kv num">' + esc(k.v) + "<small>" + esc(k.u) + '</small></b><span class="rpc-ks">' + rich(k.s) + "</span></div>"; }).join("") + "</div>");
      else if (n.t === "fig") out.push('<figure class="rpc-fig"><figcaption><b>[그림 ' + n.no + "] " + esc(n.title) + '</b><span class="rpc-unit">' + esc(n.sub) + "</span></figcaption>" + paceSvg(n.data) + '<p class="rpc-note">' + esc(n.note) + "</p></figure>");
      else if (n.t === "ask") out.push('<table class="rpc-tbl rpc-ask"><caption class="rp-sr">요청 사항과 기한</caption><thead><tr><th scope="col">요청 사항</th><th scope="col" class="r">기한</th></tr></thead><tbody>' + n.items.map(function (x) { return '<tr><td><span class="rpc-am">' + esc(x.main) + '</span><span class="rpc-as">' + esc(x.sub) + '</span></td><td class="r rpc-due">' + esc(x.due) + "</td></tr>"; }).join("") + "</tbody></table>");
      else if (n.t === "tbl") {
        var worstRow = n.hl;
        out.push('<div class="rp-tblw rpc-tblw"><div class="rp-tscroll"><table class="rpc-tbl">' + (n.title ? '<caption class="rp-sr">' + esc(n.title) + '</caption>' : '') + '<thead><tr>' + n.head.map(function (x, i) { return '<th scope="col"' + (i ? ' class="r"' : "") + ">" + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          n.rows.map(function (r, ri) { return "<tr" + (ri === worstRow ? ' class="hl"' : "") + ">" + r.map(function (x, i) { return i ? '<td class="r num">' + esc(cellNum(x, i, n.signCol)) + "</td>" : '<th scope="row">' + esc(x) + "</th>"; }).join("") + "</tr>"; }).join("") +
          '</tbody><tfoot><tr>' + n.foot.map(function (x, i) { return i ? '<td class="r num">' + esc(cellNum(x, i, n.signCol)) + "</td>" : '<th scope="row">' + esc(x) + "</th>"; }).join("") + "</tr></tfoot></table></div>" +
          '<p class="rpc-note">※ ' + esc(n.note || n.src) + "</p></div>");
      } else if (n.t === "note") out.push('<p class="rpc-note">' + esc(n.text) + "</p>");
      else if (n.t === "break") out.push('<div class="rpc-pb" aria-hidden="true"></div>');
    });
    out.push('<p class="rp-made">닿음 출력 ' + esc(dot(m.made) + " " + m.madeTime) + "</p></article>");
    return out.join("");
  }
  function li(lv, text) { return '<p class="rp-li l' + lv + '"><span class="rp-sym" aria-hidden="true">' + SYM[lv - 1] + "</span><span>" + esc(text) + "</span></p>"; }

  /** 한글(hwp) 붙여넣기용 개조식 글 — 단계마다 2칸(한글 1자) 들여쓰기 */
  function text(m) {
    var L = [m.title, m.subtitle || "", "보고일 " + dot(m.made) + " · " + m.office, ""];
    m.body.forEach(function (n) {
      if (n.t === "ch") { L.push(""); L.push("□ " + n.text); }
      else if (n.t === "li") L.push(new Array(n.lv).join("  ") + SYM[n.lv - 1] + " " + plain(n.text));
      else if (n.t === "kpis") m.kpis.forEach(function (k) { L.push("  " + k.k + " " + k.v + k.u + " (" + plain(k.s) + ")"); });
      else if (n.t === "fig") L.push("  [그림 " + n.no + "] " + n.title + " " + n.sub, "  " + n.note);
      else if (n.t === "ask") n.items.forEach(function (x, i) { L.push("  " + (i + 1) + ". " + x.main + " — " + x.sub + " [기한 " + x.due + "]"); });
      else if (n.t === "tbl") { L.push("  <표 " + n.no + "> " + n.title + " " + n.unit); L.push("  " + n.head.join("\t")); n.rows.concat([n.foot]).forEach(function (r) { L.push("  " + r.map(function (x, i) { return cellNum(x, i, n.signCol); }).join("\t")); }); L.push("  ※ " + (n.note || n.src)); }
      else if (n.t === "note") L.push(n.text);
    });
    L.push("", "데이터 출처");
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
    m.body.forEach(function (n) { if ((n.t === "fig" || n.t === "tbl") && n.src) add(srcRow((n.tags || [])[0] || "닿음 집계", n.src, n.t === "tbl" ? "<표 " + n.no + "> " + n.title : "[그림 " + n.no + "] " + (n.kind === "map" ? "지도(화면·PDF)" : (n.sheet || "")))); });
    return out;
  }
  function numOf(v) { var x = Number(String(v).replace(/,/g, "")); return isFinite(x) && String(v).trim() !== "" ? x : null; }
  function bodyLines(m, withRefs) {
    var L = [], c = 0;
    m.body.forEach(function (n) {
      if (n.t === "ch") L.push({ lv: 0, text: "□ " + n.text });
      else if (n.t === "li") L.push({ lv: n.lv, text: SYM[n.lv - 1] + " " + plain(n.text) });
      else if (withRefs && n.t === "fig") L.push({ lv: 4, text: "※ [그림 " + n.no + "] " + n.title + (n.sheet ? " → «" + n.sheet + "» 시트" : "") });
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
      } else if (n.t === "fig" && n.kind === "pace") {
        var d = n.data, base = new Date(d.start + "T00:00:00");
        sheets.push({ name: n.sheet || "처리 추세", title: "[그림 " + n.no + "] " + n.title, unit: "단위: 가구", src: "※ 출처: " + n.src, tags: n.tags, note: "하루 증감 = 오늘 누적 − 어제 누적(수식) · 목표선 = 명단 × 경과일 ÷ 차수 일수(수식)",
          columns: [{ key: "d", h: "날짜", type: "date" }, { key: "c", h: "누적 처리 완료", type: "int" }, { key: "x", h: "하루 증감", type: "int", fx: "{c}-{c:prev}", calc: function (g) { return g("c") - g.prev("c"); } }, { key: "k", h: "누적 접촉", type: "int" },
            { key: "i", h: "경과일", type: "int" }, { key: "g", h: "목표선", type: "dec", fx: d.total + "*{i}/" + d.span, calc: function (g) { return d.total * g("i") / d.span; } }],
          rows: d.done.map(function (v, i) { var x = new Date(base.getTime() + i * DAY); return [dot(ymd(x)), v, null, d.contact[i] || 0, i, null]; }), total: false });
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
    // 만남·상담 = «명단 처리» 시트의 그 줄, 서비스 연계 = «연계 서비스» 합계(같을 때) 또는 읍면별 표 연계 합계 — 값도 함께 둔다
    var figOf = function (sheet) { return m.body.filter(function (n) { return n.t === "fig" && n.sheet === sheet; })[0]; };
    var met = kp[2], dn = figOf("명단 처리");
    if (met && met.type === "int" && dn) { var mr = dn.data.filter(function (x) { return x.label === "만남·상담"; })[0]; if (mr && mr.n === met.v) met.ref = { sheet: "명단 처리", col: "n", row: "만남·상담" }; }
    var lk = kp[3], lf = figOf("연계 서비스");
    if (lk && lk.type === "int") {
      var lsum = lf ? lf.data.reduce(function (s, x) { return s + x.n; }, 0) : null;
      if (lf && lsum === lk.v) lk.ref = { sheet: "연계 서비스", col: "n" };
      else if (tb && numOf(tb.foot[5]) === lk.v) lk.ref = { sheet: tb.sheet, col: "k5" };
    }
    sheets.unshift({ name: "보고서 본문", title: m.title, note: dot(m.period.from) + " ~ " + dot(m.period.to) + " · 정부 보고서 개조식(□ ○ - ·)", text: bodyLines(m, true).concat([{ lv: 2, text: "끝." }]) });
    return {
      title: m.title, subtitle: dot(m.period.from) + " ~ " + dot(m.period.to), made: dot(m.made) + " " + m.madeTime, office: m.office,
      note: "※ 가구·주민 신호·연계 숫자는 시연용 가상 자료입니다(실제 개인정보 없음).", conclusion: m.verdict, kpis: kp,
      lines: [{ lv: 1, text: "□ 핵심 현황" }].concat(m.summary.map(function (s) { return { lv: 2, text: "○ " + s }; }), [{ lv: 1, text: "□ 조치 사항" }], m.asks.map(function (s) { return { lv: 2, text: "○ " + s }; })),
      sheets: sheets, sources: sources(m), footer: "닿음 · 시연용 가상 자료"
    };
  }
  /** 모델 → DaeumHwpx.build(doc) 의 doc — C안 공문 정제형. [그림 1]은 PNG(opts.chartPng: Uint8Array)로 넣는다(없으면 숫자 한 줄) */
  function hwpxDoc(m, opts) {
    opts = opts || {};
    // 79회차 ⓓ-뒷단(SPEC docs78 R1): 구조는 그대로 — 결재란 · 읽는 법 상자(앱 화면 «읽는 법»과 같은 뜻) · 음수 ASCII «-»
    var asc = function (s) { return String(s == null ? "" : s).replace(/−/g, "-"); };
    var B = [{ t: "t2", title: m.title, sub: m.subtitle }, { t: "sign", made: "보고일 " + dot(m.made) + " · " + m.office },
      { t: "legend", items: [["처리 완료", "방문해 결과를 기록한 가구"], ["목표선", "명단 ÷ 차수 일수 × 경과일(고르게 처리했다면 보고일까지 마쳤어야 할 가구)"], ["증감", "늘면 +, 줄면 -"]],
        colors: [["pine", "처리·정상"], ["mustard", "부족·주의"], ["red", "기한·위험"], ["grey", "참고"]] }];
    m.body.forEach(function (n) {
      if (n.t === "ch") B.push({ t: "sec", text: n.text });
      else if (n.t === "li") B.push({ t: "ci", lv: n.lv, text: asc(n.text) });
      else if (n.t === "kpis") B.push({ t: "kpi2", items: m.kpis.map(function (k) { return { k: k.k, v: asc(k.v), u: k.u, s: asc(k.s) }; }) });
      else if (n.t === "fig") {
        B.push({ t: "cap2", title: "[그림 " + n.no + "] " + n.title, sub: n.sub });
        if (opts.chartPng) B.push({ t: "img", data: opts.chartPng, width: 0.8, alt: "누적 처리 완료 " + n.data.done[n.data.done.length - 1] + "가구, 목표선 " + n.data.goal + "가구" });
        else B.push({ t: "ci", lv: 2, text: "누적 처리 완료 **" + n.data.done[n.data.done.length - 1] + "가구** · 목표선 " + n.data.goal + "가구 · 접촉 " + n.data.contact[n.data.contact.length - 1] + "가구" });
        B.push({ t: "p", kind: "small", text: n.note });
      }
      else if (n.t === "ask") B.push({ t: "tbl2", grid: "ask", nospace: true, head: ["요청 사항", "기한"], al: ["L", "R"], widths: [TWW - 9200, 9200], rows: n.items.map(function (x) { return [x.main + "\n" + x.sub, "!!" + x.due + "!!"]; }) });
      else if (n.t === "tbl") {
        var nh = n.head.length, rest = Math.floor((TWW - 7000 - 8000) / (nh - 2)), ws = [7000]; for (var wi = 1; wi < nh - 1; wi++) ws.push(rest); ws.push(TWW - 7000 - rest * (nh - 2));
        var f = function (r) { return r.map(function (x, i) { return cellNum(x, i, n.signCol).replace("−", "-"); }); }; // 표 안 음수는 ASCII 빼기(한글 계산식이 읽을 수 있게)
        B.push({ t: "tbl2", head: n.head, widths: ws, rows: n.rows.map(f), fx: true, hl: n.hl == null ? [] : [n.hl], hlCols: [0, n.signCol], sum: f(n.foot), src: "※ " + (n.note || n.src) });
      }
      else if (n.t === "note") B.push({ t: "p", kind: "small", text: n.text });
      else if (n.t === "break") B.push({ t: "break" });
    });
    B.push({ t: "p", kind: "end", text: "끝." }, { t: "p", kind: "tail", text: "닿음 · 시연용 가상 데이터 · 개인정보 4칸 미기재" });
    return { title: m.title, made: dot(m.made), office: m.office, plain: true, blocks: B };
  }
  var TWW = 48190; // 본문 폭(hwpx.js 의 TW 와 같음)

  // 파일 이름 = 날짜_종류(예 20261102_주간보고서.hwpx) — 11-02 지시
  function fname(m, ext) { return String(m.made).slice(0, 10) + "_전체_" + (m.kind === "monthly" ? "월간" : "주간") + "보고서" + (m.scope ? "_" + String(m.scope).replace(/\s+/g, "") : "") + "." + ext; } // S12-z 이름 규칙
  var api = { paceSvg: paceSvg, build: build, html: html, text: text, trend: trend, areaPoints: areaPoints, dot: dot, encode: encode, decode: decode, encodeSync: encodeSync, decodeSync: decodeSync, SYM: SYM, xlsxSpec: xlsxSpec, hwpxDoc: hwpxDoc, fname: fname, cases: cases, pii: pii, sources: sources, trendAbove: trendAbove };
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
  function saveXlsx(m) { return need("xlsx.js", "DaeumXlsx").then(function (X) { return X.download(xlsxSpec(m), fname(m, "xlsx")); }); }
  /** 그림 1(SVG 문자열) → PNG 바이트(브라우저 캔버스 3배 확대). 못 만들면 null — 한글 파일은 숫자 한 줄로 대신한다 */
  function chartPng(m) {
    var f = m.body.filter(function (n) { return n.t === "fig" && n.kind === "pace"; })[0];
    if (!f || typeof Image === "undefined") return Promise.resolve(null);
    return new Promise(function (ok) {
      try {
        var svg = paceSvg(f.data), img = new Image(), url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        img.onload = function () { try { var cv = document.createElement("canvas"); cv.width = 2010; cv.height = 645; var cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, 2010, 645); cx.drawImage(img, 0, 0, 2010, 645);
          cv.toBlob(function (b) { if (!b) return ok(null); b.arrayBuffer().then(function (ab) { ok(new Uint8Array(ab)); }, function () { ok(null); }); }, "image/png"); } catch (e) { ok(null); } };
        img.onerror = function () { ok(null); }; img.src = url;
      } catch (e) { ok(null); }
    });
  }
  function saveHwpx(m) { return need("xlsx.js", "DaeumXlsx").then(function () { return need("hwpx.js", "DaeumHwpx"); }).then(function (W) { return chartPng(m).then(function (png) { var d = hwpxDoc(m, { chartPng: png }); d.plain = true; return W.download(d, fname(m, "hwpx")); }); }); }
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
  /** 화면 집계(F.report.last)로 보고서 모델 — 보고 화면 «한글 보고서 받기» 단추(s11.js)와 위 «주간/월간» 단추가 같이 쓴다. 집계 전이면 null */
  function modelOf(kind) {
    var last = F.report && F.report.last; if (!last || !F.report.countdown) return null;
    var S = last.stats, H = S.households;
    var cd = F.report.countdown(F.report.currentRound(last.input.now), { now: last.input.now, done: H.closed, total: H.total });
    return build(kind === "monthly" ? "monthly" : "weekly", S, last.input, cd, {});
  }
  api.modelOf = modelOf;
  api.chartPng = chartPng; api.mount = mount; api.printDoc = printDoc; api.linkOf = linkOf; api.saveXlsx = saveXlsx; api.saveHwpx = saveHwpx;

  // 공무원 창구 현황 탭: «주간/월간 보고서» 단추를 먼저 받아 정부 보고서 문서로 그린다(mount.js 의 옛 간이 미리보기 대신).
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest("#reportRoot [data-report]");
    var last = F.report && F.report.last;
    if (!b || !last || !F.report.countdown) return; // 집계 전이면 mount.js 가 집계한 뒤 이 단추를 다시 누른다
    e.stopPropagation(); e.preventDefault();
    var m = modelOf(b.getAttribute("data-report") === "monthly" ? "monthly" : "weekly");
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
