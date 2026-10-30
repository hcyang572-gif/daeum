/* 닿음 그림 부품 — S10k(⚙️ 파로, 2026-10-30). 보고서(report_doc.js)와 화면(officer/mount.js)이 같은 그림을 쓴다.
   근거: 01_리서치/그림화_후보.md §2·§4(🩵 미르). 규칙: 그림은 숫자를 담을 때만 · 색은 클래스/토큰 변수로(다크·인쇄는 CSS가 바꿈)
   · 그림마다 role="img"+aria-label(값을 문장으로)과 눈에 보이는 숫자 범례 · 색만으로 구분하지 않음(글·무늬·두께 함께).
   donut·bars·map·trendSvg 는 S10j 보고서에서 그대로 옮겼다(출력 글자 하나 바뀌지 않음 — shared/chart.test.js).
   ring·dualBar·funnel·flow(S10k)·dayline·slotGrid·histLine·stepper(S10k-2) 는 화면용 새 부품(스타일 shared/chart.css, 클래스 머리 ch-).
   순수 함수(문자열 반환) — node 시험 가능. 이름공간: window.DaeumChart */
(function (root, factory) {
  var ns = factory();
  root.DaeumChart = ns;
  if (typeof module !== "undefined" && module.exports) module.exports = ns;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  function dot(s) { if (!s) return ""; var p = String(s).slice(0, 10).split("-"); return +p[0] + ". " + +p[1] + ". " + +p[2] + "."; }
  function num(n) { return n == null ? "-" : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clamp(v) { v = +v || 0; return v < 0 ? 0 : v > 100 ? 100 : v; }

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

  // ═══════════ S10k 화면용 새 부품 ═══════════
  /** 진행 고리 — o: {done, total, cur(0부터, 지금 차례), states(집마다 기록 여부 — 없으면 앞에서부터 done 개), unit} · total 12곳까지는 집마다 한 조각, 넘으면 이어진 고리 */
  function ring(o) {
    var tot = Math.max(0, o.total | 0), done = o.states ? o.states.slice(0, tot).filter(Boolean).length : Math.min(tot, Math.max(0, o.done | 0)), unit = o.unit || "곳", R = 48, C = 2 * Math.PI * R;
    var segs = "";
    if (tot && tot <= 12) {
      var gap = tot > 1 ? 4 : 0, len = C / tot - gap;
      for (var i = 0; i < tot; i++) segs += '<circle class="ch-seg' + ((o.states ? o.states[i] : i < done) ? " on" : "") + (i === o.cur ? " cur" : "") + '" cx="60" cy="60" r="' + R + '" stroke-dasharray="' + len.toFixed(2) + " " + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-(i * (len + gap))).toFixed(2) + '"/>';
    } else if (tot) {
      var dl = done / tot * C;
      segs = '<circle class="ch-seg" cx="60" cy="60" r="' + R + '"/>' + (dl ? '<circle class="ch-seg on" cx="60" cy="60" r="' + R + '" stroke-dasharray="' + dl.toFixed(2) + " " + (C - dl).toFixed(2) + '"/>' : "");
    } else segs = '<circle class="ch-seg" cx="60" cy="60" r="' + R + '"/>';
    var lab = tot ? "오늘 찾아갈 집 " + tot + unit + " 중 기록 남긴 곳 " + done + unit + ", 남은 곳 " + (tot - done) + unit + (o.cur != null && o.cur < tot ? ", 지금 " + (o.cur + 1) + "번째" : "") : "오늘 찾아갈 집 없음";
    return '<svg class="ch-ring" viewBox="0 0 120 120" role="img" aria-label="' + esc(lab) + '"><g transform="rotate(-90 60 60)">' + segs + "</g>" +
      '<text x="60" y="60" class="ch-rn">' + done + '<tspan class="ch-ru">/' + tot + "</tspan></text>" +
      '<text x="60" y="80" class="ch-rs">기록</text></svg>';
  }
  /** 두 겹 진도 막대 — o: {done, elapsed(%), late(bool), tag("D-12")} · 아래 겹 = 기간 경과(빗금), 위 겹 = 처리 완료(채움), 세로 눈금 = 오늘 */
  function dualBar(o) {
    var d = clamp(o.done), e = clamp(o.elapsed), lab = "처리 완료 " + Math.round(d) + "%, 기간 경과 " + Math.round(e) + "%" + (o.tag ? ", 마감 " + o.tag : "") + (o.late ? " — 일정보다 뒤처짐" : " — 일정 안");
    return '<div class="ch-dual' + (o.late ? " late" : "") + '" role="img" aria-label="' + esc(lab) + '">' +
      '<div class="ch-dt"><i class="ch-de" style="width:' + e + '%"></i><i class="ch-dd" style="width:' + d + '%"></i><i class="ch-dm" style="left:' + e + '%"></i></div>' +
      '<p class="ch-dk" aria-hidden="true"><span><i class="ch-kd"></i>처리 완료 <b class="num">' + Math.round(d) + '%</b></span><span><i class="ch-ke"></i>기간 경과 <b class="num">' + Math.round(e) + "%</b></span>" + (o.tag ? '<span class="ch-tag">' + esc(o.tag) + "</span>" : "") + "</p></div>";
  }
  /** 깔때기 — steps: [{label, n}] · 막대 길이 = 첫 단계 대비, 줄 사이에 «다음 단계로 넘어간 비율» */
  function funnel(steps, o) {
    o = o || {}; var top = steps.length ? steps[0].n : 0, unit = o.unit || "가구";
    var lab = steps.map(function (s, i) { return s.label + " " + s.n + unit + (i ? "(앞 단계의 " + pct(s.n, steps[i - 1].n) + "%)" : ""); }).join(", ");
    return '<ol class="ch-funnel" role="img" aria-label="' + esc(lab) + '">' + steps.map(function (s, i) {
      var w = top ? Math.max(s.n ? 3 : 0, Math.round(s.n / top * 100)) : 0;
      return (i ? '<li class="ch-fx" aria-hidden="true"><span>↓ ' + pct(s.n, steps[i - 1].n) + "%</span></li>" : "") +
        '<li class="ch-fs"><span class="ch-fl">' + esc(s.label) + '</span><span class="ch-fb"><i class="c1" style="width:' + w + '%"></i></span><b class="num">' + num(s.n) + '</b><em class="num">' + pct(s.n, top) + "%</em></li>";
    }).join("") + "</ol>";
  }
  /** 흐름도 — stages: [{label, sub, n}] · 단계를 화살표로 잇고, 멈춘 집 수를 마디 크기·테두리로(0이면 비움) */
  function flow(stages, o) {
    o = o || {}; var unit = o.unit || "곳", mx = Math.max.apply(null, stages.map(function (s) { return s.n; }).concat([1]));
    var lab = stages.map(function (s) { return s.label + (s.sub ? "(" + s.sub + ")" : "") + " " + s.n + unit; }).join(" → ");
    return '<ol class="ch-flow" role="img" aria-label="' + esc("멈춘 집: " + lab) + '">' + stages.map(function (s) {
      var sz = s.n ? Math.round(40 + 16 * Math.sqrt(s.n / mx)) : 36;
      return '<li class="ch-fn' + (s.n ? " on" : "") + '"><span class="ch-fd num" style="--sz:' + sz + 'px">' + num(s.n) + '</span><b>' + esc(s.label) + "</b>" + (s.sub ? '<span class="ch-fsub">' + esc(s.sub) + "</span>" : "") + "</li>";
    }).join("") + "</ol>";
  }

  // ═══════════ S10k-2 새 부품 — 시간 띠·요일×시간대 격자·이력 타임라인·진행 단계 ═══════════
  function hmMin(s) { var m = /^(\d{1,2}):(\d{2})/.exec(String(s || "")); return m ? +m[1] * 60 + +m[2] : null; }
  function hmStr(t) { t = Math.round(t); var h = Math.floor(t / 60), m = ((t % 60) + 60) % 60; return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m; }
  function dur(m) { m = Math.round(m); var h = Math.floor(m / 60), r = m % 60; return h ? h + "시간" + (r ? " " + r + "분" : "") : r + "분"; }
  function p2f(v) { return (+v).toFixed(2) + "%"; }
  var WD = ["일", "월", "화", "수", "목", "금", "토"], SLOT3 = ["오전", "오후", "저녁"];
  function slotOfD(d) { var h = d.getHours(); return h < 12 ? "오전" : h < 17 ? "오후" : "저녁"; }
  function dayOf(s) { s = String(s || ""); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); } return new Date(s); }
  function md(d) { return (d.getMonth() + 1) + "." + d.getDate() + "(" + WD[d.getDay()] + ")"; }
  var REACHED = { met: 1, not_eligible: 1 };

  /** 하루 시간 띠 — o: {stops:[{no, arrive, leave, travelMin, lunchBefore}], back:{arrive, travelMin}|null, lunch:["12:00","13:00"], workEnd:"18:00", workMin:480}
   *  09~18시 축(넘치면 늘림)에 이동(빗금)·상담(채움+번호)·점심(점선) 블록, 18시 선, 이동+상담이 8시간을 넘는 시각 표지. 좁은 화면은 CSS 가 세로로 접는다. */
  function dayline(o) {
    var L = o.lunch || ["12:00", "13:00"], ld = (hmMin(L[1]) - hmMin(L[0])) || 60, we = hmMin(o.workEnd || "18:00"), cap = o.workMin || 480;
    var bl = [], mv = 0, cs = 0, say = [];
    (o.stops || []).forEach(function (s, i) {
      var a = hmMin(s.arrive), b = hmMin(s.leave), tm = Math.max(0, +s.travelMin || 0), no = s.no || i + 1; if (a == null) return;
      if (s.lunchBefore) bl.push({ k: "ln", a: a - tm - ld, b: a - tm });
      if (tm) bl.push({ k: "mv", a: a - tm, b: a }); mv += tm;
      if (b != null) { bl.push({ k: "vs", a: a, b: b, no: no }); cs += b - a; }
      say.push(no + "번 " + hmStr(a) + (b != null ? "~" + hmStr(b) : ""));
    });
    if (o.back && hmMin(o.back.arrive) != null) { var ba = hmMin(o.back.arrive), bt = Math.max(0, +o.back.travelMin || 0); if (bt) bl.push({ k: "mv", a: ba - bt, b: ba }); mv += bt; }
    if (!bl.length) return '<div class="ch-day" role="img" aria-label="오늘 시각표 없음"></div>';
    bl.sort(function (x, y) { return x.a - y.a; });
    var first = Math.min.apply(null, bl.map(function (x) { return x.a; })), last = Math.max.apply(null, bl.map(function (x) { return x.b; }));
    var a0 = Math.min(9 * 60, Math.floor(first / 60) * 60), a1 = Math.max(we, Math.ceil(last / 60) * 60), span = a1 - a0;
    function P(t) { return (t - a0) / span * 100; }
    var cum = 0, overAt = null;
    bl.forEach(function (x) { if (x.k === "ln" || overAt != null) return; var d = x.b - x.a; if (cum + d > cap) overAt = x.a + (cap - cum); cum += d; });
    var late = last > we, hours = "";
    for (var t = a0; t <= a1; t += 60) hours += '<span class="ch-dy-h" style="--a:' + p2f(P(t)) + '"><b>' + t / 60 + "</b></span>";
    var blocks = bl.map(function (x) {
      var st = ' style="--a:' + p2f(P(x.a)) + ";--w:" + p2f((x.b - x.a) / span * 100) + '"';
      if (x.k === "vs") return '<i class="ch-dy-b vs"' + st + '><b class="num">' + x.no + '</b><span class="ch-dy-t">' + hmStr(x.a) + "~" + hmStr(x.b) + " 상담</span></i>";
      if (x.k === "ln") return '<i class="ch-dy-b ln"' + st + '><span class="ch-dy-t">점심</span></i>';
      return '<i class="ch-dy-b mv"' + st + "></i>";
    }).join("");
    var lab = "하루 시각표 " + hmStr(first) + " 출발, " + say.join(", ") + ", 마침 " + hmStr(last) + (o.back ? "(복귀)" : "") +
      ". 이동 " + dur(mv) + " · 상담 " + dur(cs) + (late ? " — 18시를 넘음" : " — 18시 안") + (overAt != null ? ", 이동+상담이 8시간을 넘는 때 " + hmStr(overAt) : "");
    return '<div class="ch-day' + (late ? " late" : "") + (overAt != null ? " over" : "") + '" role="img" aria-label="' + esc(lab) + '" style="--hrs:' + span / 60 + '">' +
      '<div class="ch-dy-tr">' + hours + (late ? '<i class="ch-dy-late" style="--a:' + p2f(P(we)) + ";--w:" + p2f(100 - P(we)) + '"></i>' : "") + blocks +
      '<span class="ch-dy-end" style="--a:' + p2f(P(we)) + '"><em>18시</em></span>' +
      (overAt != null ? '<span class="ch-dy-over" style="--a:' + p2f(P(overAt)) + '"><em>8시간 ' + hmStr(overAt) + "</em></span>" : "") + "</div>" +
      '<p class="ch-dk" aria-hidden="true"><span><i class="ch-k-mv"></i>이동 <b class="num">' + dur(mv) + '</b></span><span><i class="ch-k-vs"></i>상담 <b class="num">' + dur(cs) + "</b></span>" +
      (bl.some(function (x) { return x.k === "ln"; }) ? '<span><i class="ch-k-ln"></i>점심</span>' : "") +
      '<span class="ch-tag' + (late ? " ch-bad" : "") + '">마침 ' + hmStr(last) + (late ? " · 18시 넘음" : "") + "</span>" +
      (overAt != null ? '<span class="ch-tag ch-bad">8시간 넘음 ' + hmStr(overAt) + "</span>" : "") + "</p></div>";
  }

  /** 요일 × 시간대 점 격자 — o: {attempts:[{at, channel, result}], next:{date, slot, channel}|null, escalate, cap(3), channels:{visit:"방문"…}, results:{no_answer:"부재"…}}
   *  만남 = 채운 점, 허탕 = 빈 점(번호 = 시도 순서), 방문 허탕 cap 번째 = 겹테두리 + «간접 확인», 다음 제안 칸 = 굵은 테두리 + «다음» */
  function slotGrid(o) {
    var cap = o.cap || 3, CHN = o.channels || {}, RS = o.results || {};
    var att = (o.attempts || []).slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var days = [1, 2, 3, 4, 5], cells = {}, vMiss = 0, met = 0, miss = 0, say = [];
    att.forEach(function (t, i) {
      var d = new Date(t.at), wd = d.getDay(), sl = slotOfD(d), ok = !!REACHED[t.result], esc3 = false;
      if (days.indexOf(wd) < 0) days.push(wd);
      if (!ok && t.channel === "visit" && t.result === "no_answer") { vMiss++; esc3 = vMiss === cap; }
      if (ok) met++; else miss++;
      (cells[wd + sl] = cells[wd + sl] || []).push({ n: i + 1, ok: ok, esc: esc3, tip: md(d) + " " + sl + " " + (CHN[t.channel] || t.channel) + " " + (RS[t.result] || t.result) });
      say.push((i + 1) + ") " + md(d) + " " + sl + " " + (CHN[t.channel] || t.channel) + " " + (RS[t.result] || t.result) + (esc3 ? "(방문 허탕 " + cap + "번째 — 간접 확인)" : ""));
    });
    var nx = o.next && o.next.date ? { wd: dayOf(o.next.date).getDay(), sl: o.next.slot } : null;
    if (nx && days.indexOf(nx.wd) < 0) days.push(nx.wd);
    days.sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); });
    var head = '<span class="ch-sl-c ch-sl-hd"></span>' + days.map(function (d) { return '<span class="ch-sl-c ch-sl-hd">' + WD[d] + "</span>"; }).join("");
    var rows = SLOT3.map(function (sl) {
      return '<span class="ch-sl-c ch-sl-rh">' + sl + "</span>" + days.map(function (d) {
        var list = cells[d + sl] || [], isNx = nx && nx.wd === d && nx.sl === sl;
        return '<span class="ch-sl-c' + (isNx ? " nx" : "") + '">' + list.map(function (p) {
          return '<i class="ch-sl-d' + (p.ok ? " ok" : " miss") + (p.esc ? " esc" : "") + '" title="' + esc(p.tip) + '">' + p.n + "</i>" + (p.esc ? '<em class="ch-sl-x">간접 확인</em>' : "");
        }).join("") + (isNx ? '<em class="ch-sl-nx">' + (o.escalate ? "간접 확인" : "다음") + "</em>" : "") + "</span>";
      }).join("");
    }).join("");
    var nxTxt = o.next && o.next.date ? md(dayOf(o.next.date)) + " " + o.next.slot + " " + (CHN[o.next.channel] || o.next.channel || "") : "";
    var lab = (att.length ? "시도 " + att.length + "회: " + say.join(", ") : "시도 기록 없음") + (nxTxt ? ". 다음 제안 " + nxTxt + (o.escalate ? "(간접 확인으로 전환)" : "") : "") + ". 방문 허탕 " + cap + "번이면 간접 확인(기본값)";
    return '<div class="ch-slot" role="img" aria-label="' + esc(lab) + '"><div class="ch-sl-g" style="--cols:' + days.length + '">' + head + rows + "</div>" +
      '<p class="ch-dk" aria-hidden="true"><span><i class="ch-k-ok"></i>만남 <b class="num">' + met + '</b></span><span><i class="ch-k-miss"></i>허탕 <b class="num">' + miss + "</b></span>" +
      (nxTxt ? '<span><i class="ch-k-nx"></i>' + (o.escalate ? "간접 확인 " : "다음 ") + esc(nxTxt) + "</span>" : "") +
      '<span><i class="ch-k-esc"></i>방문 허탕 ' + cap + "번째 = 간접 확인</span></p></div>";
  }

  /** 방문 이력 타임라인 — o: {items:[{at, channel, result, note}], next:{date, slot, channel}|null, now, channels, results}
   *  날짜 축 위 점: 모양 = 방법(방문 ○·전화 □·AI 전화 ◇), 채움 = 닿음 / 빈 점 = 허탕, 다음 예정 = 점선 빈 점. 아래 번호 목록에 값을 그대로 적는다. */
  function histLine(o) {
    var CHN = o.channels || {}, RS = o.results || {}, now = o.now ? new Date(o.now) : new Date();
    var it = (o.items || []).slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var nd = o.next && o.next.date ? dayOf(o.next.date) : null;
    function d0(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
    var ts = it.map(function (t) { return d0(new Date(t.at)); }), tn = d0(now);
    var lo = Math.min.apply(null, ts.concat([tn])), hi = Math.max.apply(null, ts.concat([tn, nd ? d0(nd) : tn]));
    if (hi - lo < 2 * 864e5) hi = lo + 2 * 864e5;
    function P(v) { return 6 + (v - lo) / (hi - lo) * 88; }
    var lanes = [], pts = it.map(function (t, i) {
      var x = P(ts[i]), ln = 0; while (lanes[ln] != null && x - lanes[ln] < 8 && ln < 2) ln++; lanes[ln] = x;
      var shp = t.channel === "phone" ? "ph" : t.channel === "ai" ? "ai" : "vi";
      return '<i class="ch-hl-p ' + shp + (REACHED[t.result] ? " ok" : " miss") + '" style="--a:' + p2f(x) + ";--ln:" + ln + '"><b>' + (i + 1) + "</b></i>";
    }).join("");
    var nxP = nd ? '<i class="ch-hl-p nx" style="--a:' + p2f(P(d0(nd))) + ';--ln:0"><b>다음</b></i>' : "";
    var list = it.map(function (t, i) { var d = new Date(t.at); return '<li><b class="num">' + (i + 1) + "</b> " + md(d) + " " + slotOfD(d) + " · " + esc(CHN[t.channel] || t.channel) + " — " + esc(RS[t.result] || t.result) + (t.note ? " (" + esc(t.note) + ")" : "") + "</li>"; }).join("") +
      (nd ? '<li class="nx"><b>다음</b> ' + md(nd) + " " + esc(o.next.slot || "") + " · " + esc(CHN[o.next.channel] || o.next.channel || "") + "</li>" : "");
    var lab = it.length ? "지난 시도 " + it.length + "회: " + it.map(function (t, i) { var d = new Date(t.at); return (i + 1) + ") " + md(d) + " " + (CHN[t.channel] || t.channel) + " " + (RS[t.result] || t.result); }).join(", ") : "지난 시도 없음";
    if (nd) lab += ". 다음 예정 " + md(nd) + " " + (o.next.slot || "") + " " + (CHN[o.next.channel] || "");
    return '<div class="ch-hist"><div class="ch-hl-tr" role="img" aria-label="' + esc(lab) + '" style="--lanes:' + Math.max(1, lanes.length) + '"><i class="ch-hl-ax"></i>' +
      '<span class="ch-hl-t" style="--a:' + p2f(P(tn)) + '"><em>오늘</em></span>' + pts + nxP + "</div>" +
      '<p class="ch-hl-e" aria-hidden="true"><span>' + md(new Date(lo)) + "</span><span>" + md(new Date(hi)) + "</span></p>" +
      '<p class="ch-dk" aria-hidden="true"><span><i class="ch-k-vi"></i>방문</span><span><i class="ch-k-ph"></i>전화</span><span><i class="ch-k-ok"></i>닿음(채움)</span><span><i class="ch-k-miss"></i>허탕(빈 점)</span>' + (nd ? '<span><i class="ch-k-nx"></i>다음 예정</span>' : "") + "</p>" +
      '<ol class="ch-hl-list small">' + list + "</ol></div>";
  }

  /** 진행 단계 도식 — steps: [{label, at, state:"done"|"current"|"todo"}], o: {cancelled} · PC 가로 레일, 좁은 화면 세로 레일(CSS) */
  function stepper(steps, o) {
    o = o || {}; var ST = { done: "완료", current: "진행 중", todo: "아직" };
    var lab = "진행 단계: " + steps.map(function (s) { return s.label + " " + ST[s.state] + (s.at ? "(" + s.at + ")" : ""); }).join(" → ") + (o.cancelled ? " — 취소함" : "");
    return '<ol class="ch-step' + (o.cancelled ? " cancel" : "") + '" role="img" aria-label="' + esc(lab) + '" style="--n:' + steps.length + '">' + steps.map(function (s, i) {
      return '<li class="ch-st st-' + s.state + '"><span class="ch-st-m num" aria-hidden="true">' + (s.state === "done" ? "✓" : i + 1) + "</span><b>" + esc(s.label) + '</b><span class="ch-st-at num">' + esc(s.at || ST[s.state]) + "</span></li>";
    }).join("") + "</ol>";
  }

  return { dot: dot, num: num, pct: pct, esc: esc, donut: donut, bars: bars, map: map, trendSvg: trendSvg, ring: ring, dualBar: dualBar, funnel: funnel, flow: flow, dayline: dayline, slotGrid: slotGrid, histLine: histLine, stepper: stepper };
});
