/* 닿음 그림 부품 — S10k(⚙️ 파로, 2026-10-30). 보고서(report_doc.js)와 화면(officer/mount.js)이 같은 그림을 쓴다.
   근거: 01_리서치/그림화_후보.md §2·§4(🩵 미르). 규칙: 그림은 숫자를 담을 때만 · 색은 클래스/토큰 변수로(다크·인쇄는 CSS가 바꿈)
   · 그림마다 role="img"+aria-label(값을 문장으로)과 눈에 보이는 숫자 범례 · 색만으로 구분하지 않음(글·무늬·두께 함께).
   donut·bars·map·trendSvg 는 S10j 보고서에서 그대로 옮겼다(출력 글자 하나 바뀌지 않음 — shared/chart.test.js).
   ring·dualBar·funnel·flow 는 S10k 화면용 새 부품(스타일 shared/chart.css, 클래스 머리 ch-).
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

  return { dot: dot, num: num, pct: pct, esc: esc, donut: donut, bars: bars, map: map, trendSvg: trendSvg, ring: ring, dualBar: dualBar, funnel: funnel, flow: flow };
});
