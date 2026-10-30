/* AI 추천 검증 화면 — S10l ②(⚙️ 파로, 2026-10-30). 자료: shared/ai_check_data.js(node shared/ai_check_build.js 로 생성).
   결과 표시만 한다 — 재측정(AI 호출) 단추 없음. 모든 숫자 옆에 출처·측정일, 사연에는 «가상» 꼬리표. */
(function () {
  "use strict";
  var W = typeof window !== "undefined" ? window : globalThis;

  function pct(a, b) { return b ? Math.round(a / b * 1000) / 10 : 0; }
  function fmtPct(a, b) { return pct(a, b).toFixed(1) + "%"; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function srcMeasure(d, extra) {
    return "출처: 닿음 자체 측정 «" + d.meta.doc + "»" + (extra ? " · " + extra : "") + " · 측정일 " + d.meta.measured;
  }
  function srcCatalog(d) {
    return "공공데이터 · 서비스 목록: " + d.meta.catalogSrc.map(function (s) { return s.name + "(공공데이터포털 " + s.no + ")"; }).join(" · ") +
      " · 받은 날 " + d.meta.catalogSrc[0].called;
  }

  // 막대 묶음 3개 — 규칙만 vs AI(20건 같은 사연)
  function compareModel(d) {
    return [
      { title: "첫 추천이 맞음", rules: [d.rules.hit1, d.rules.n], ai: [d.ai.hit1, d.ai.n] },
      { title: "상위 3개 안에 맞는 것 있음", rules: [d.rules.hit3, d.rules.n], ai: [d.ai.hit3, d.ai.n] },
      { title: "상위 3개 중 맞는 비율", rules: [d.rules.ok3, d.rules.n3], ai: [d.ai.ok3, d.ai.n3] }
    ];
  }

  function bar(cls, label, v) {
    return '<li class="bar ' + cls + '"><span class="lb">' + label + '</span><span class="tr"><span class="fl" style="width:' + pct(v[0], v[1]) + '%"></span></span>' +
      '<span class="v"><b>' + fmtPct(v[0], v[1]) + '</b> <span class="num">' + v[0] + "/" + v[1] + "</span></span></li>";
  }
  function dots(m) {
    return m.top3.map(function (t, i) { return '<span class="dot ' + (t.ok ? "ok" : "no") + '" title="' + (i + 1) + "순위 " + (t.ok ? "맞음" : "정답표 밖") + '"></span>'; }).join("");
  }
  function srText(m) { return m.top3.map(function (t, i) { return (i + 1) + "순위 " + (t.ok ? "맞음" : "틀림"); }).join(", "); }

  function render(d) {
    var $ = function (id) { return document.getElementById(id); };
    $("acKicker").textContent = "가상 사연 " + d.ai.n + "건 · " + d.meta.measured + " 측정";

    var k = [
      { big: pct(d.ai.hit1, d.ai.n).toFixed(1), unit: "%", t: "첫 추천이 맞음", f: d.ai.hit1 + "/" + d.ai.n + "건" },
      { big: pct(d.ai.ok3, d.ai.n3).toFixed(1), unit: "%", t: "상위 3개 중 맞음", f: d.ai.ok3 + "/" + d.ai.n3 + "개" },
      { big: String(d.ai.dropped), unit: "건", t: "목록에 없는 서비스", f: "AI가 지어낸 이름" }
    ];
    $("acKpis").innerHTML = k.map(function (x) {
      return '<div class="d-card kpi"><span class="bignum">' + x.big + "<small>" + x.unit + "</small></span><p>" + x.t + '</p><span class="frac num">' + x.f + "</span></div>";
    }).join("");
    $("acKpiSrc").textContent = srcMeasure(d, "AI " + d.meta.model + " · 정답표 " + d.meta.gold);

    $("acBars").innerHTML = compareModel(d).map(function (g) {
      return '<li class="bar-g"><h3>' + g.title + '</h3><ul class="bars">' + bar("ru", "규칙만", g.rules) + bar("ai", "AI", g.ai) + "</ul></li>";
    }).join("");
    $("acBarsSrc").textContent = srcMeasure(d, "같은 사연 " + d.ai.n + "건, 규칙만은 AI 호출 0회");

    $("acKinds").innerHTML = d.kinds.map(function (g) {
      return '<li class="bar-g"><h3>' + g.kind + " 사연 " + g.ai.n + "건</h3><ul class=\"bars\">" + bar("ru", "규칙만", [g.rules.hit1, g.rules.n]) + bar("ai", "AI", [g.ai.hit1, g.ai.n]) + "</ul></li>";
    }).join("");
    $("acKindsSrc").textContent = srcMeasure(d, "일반 10·위기 5·대리 5");

    var steps = [
      ["가상 사연 " + d.ai.n + "건", "일반 10 · 위기 5 · 대리 5. 실제 상담·개인정보 0건"],
      ["정답표를 먼저", "사연마다 안내해도 맞는 서비스를 측정 전에 정해 저장(" + d.meta.gold + ")"],
      ["화면과 같은 길로", "서비스 " + d.meta.catalog + "건 중 규칙이 추린 " + d.meta.sent + "건 → AI가 고름"],
      ["정답표 안이면 맞음", "소득·재산 요건은 판정하지 않음 · 109 등 고정 상담전화 카드는 채점 제외"]
    ];
    $("acSteps").innerHTML = steps.map(function (s) { return "<li><b>" + s[0] + "</b>" + s[1] + "</li>"; }).join("");
    $("acStepsSrc").innerHTML = esc(srcMeasure(d, "§2 기준")) + "<br>" + esc(srcCatalog(d)) +
      " · 평균 토큰 입력 <span class=\"num\">" + d.meta.tokIn.toLocaleString("ko-KR") + "</span>·출력 <span class=\"num\">" + d.meta.tokOut.toLocaleString("ko-KR") + "</span>(20건 평균)";

    $("acGrid").innerHTML = d.rows.map(function (r, i) {
      return '<li><button type="button" class="cell" aria-expanded="false" aria-controls="acDetail" data-i="' + i + '" data-h="selection">' +
        '<span class="id">' + r.id + '</span><span class="k">' + r.kind + "</span>" +
        '<span class="dots"><span class="m">AI</span>' + dots(r.ai) + "</span>" +
        '<span class="dots"><span class="m">규칙</span>' + dots(r.rules) + "</span>" +
        '<span class="sr">AI ' + srText(r.ai) + " · 규칙만 " + srText(r.rules) + " — 눌러서 사연과 추천 보기</span></button></li>";
    }).join("");
    $("acGridSrc").textContent = srcMeasure(d, "점 하나 = 추천 1개, 채운 점 맞음 · × 정답표 밖");
    var grid = $("acGrid"), det = $("acDetail");
    grid.addEventListener("click", function (e) {
      var b = e.target.closest(".cell"); if (!b) return;
      var open = b.getAttribute("aria-expanded") === "true";
      [].forEach.call(grid.querySelectorAll(".cell"), function (x) { x.setAttribute("aria-expanded", "false"); });
      if (open) { det.hidden = true; return; }
      b.setAttribute("aria-expanded", "true");
      det.innerHTML = detail(d.rows[+b.dataset.i]);
      det.hidden = false;
    });

    $("acWrong").innerHTML = d.wrong.map(function (w) {
      return '<li><span class="rk">' + w.id + "<br>" + w.rank + '순위</span><span><span class="nm">' + esc(w.name) + '</span><span class="ws">' + esc(w.why) + "</span></span></li>";
    }).join("");
    $("acWrongSrc").textContent = srcMeasure(d, "AI 상위 3개 " + d.ai.n3 + "개 중 정답표 밖 " + d.wrong.length + "개");

    var c = d.calib;
    $("acCalib").innerHTML = '<ul class="bars">' + c.map(function (x) { return bar(x === c[1] ? "ai" : "ru", x.label.split(" · ")[0], [x.hit1, x.n]); }).join("") + "</ul>" +
      '<p class="calib">같은 16건 첫 추천 <span class="num">' + fmtPct(c[0].hit1, c[0].n) + "</span> → <span class=\"num\">" + fmtPct(c[1].hit1, c[1].n) +
      "</span> · AI로 보낸 후보 안에 정답 <span class=\"num\">" + fmtPct(d.meta.sentHit.before[0], d.meta.sentHit.before[1]) + "</span> → <span class=\"num\">" + fmtPct(d.meta.sentHit.after[0], d.meta.sentHit.after[1]) + "</span></p>";
    $("acCalibSrc").textContent = srcMeasure(d, "§3·§7 · 보정 전 10-29, 보정 후 10-30");

    var lim = [
      "사연이 " + d.ai.n + "건뿐이라 이 표본의 값입니다. 고친 규칙 일부는 이 사연을 보고 고쳐서 개선분에 표본 맞춤이 섞여 있습니다.",
      "정답표를 개발 측 한 사람이 만들었습니다 — 사회복지 담당 공무원 검수 전입니다.",
      "사연을 개발 측이 써서 실제 말투(사투리·두서없는 말)보다 깔끔합니다.",
      "소득·재산 요건, 실제 신청 가능 여부는 재지 않았습니다.",
      "위기 사연 C1(«죽고 싶다»)은 고친 뒤에도 AI 첫 추천이 정답표 밖입니다 — 화면 첫 줄은 규칙이 고정한 109 상담전화입니다."
    ];
    $("acLim").innerHTML = lim.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
  }

  function detail(r) {
    function list(m) { return "<ol>" + m.top3.map(function (t) { return '<li class="' + (t.ok ? "ok" : "no") + '">' + esc(t.name) + "</li>"; }).join("") + "</ol>"; }
    return '<p class="cnum">' + r.id + " · " + r.kind + ' 사연<span class="virt">가상</span></p><blockquote>' + esc(r.text) + "</blockquote>" +
      '<div class="pick2"><div><h3>AI 상위 3개</h3>' + list(r.ai) + "</div><div><h3>규칙만 상위 3개</h3>" + list(r.rules) + "</div></div>";
  }

  W.DaeumAICheck = { pct: pct, fmtPct: fmtPct, compareModel: compareModel, srcMeasure: srcMeasure, srcCatalog: srcCatalog, detail: detail, render: render };
  if (typeof document !== "undefined" && document.getElementById && document.getElementById("acKpis") && W.DaeumAICheckData) render(W.DaeumAICheckData);
})();
