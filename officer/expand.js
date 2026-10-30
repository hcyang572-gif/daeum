/* 닿음 보조 기능 — S10l ④ 도입 비용·탄소 계산 · S10l ⑤ 다른 시군으로 바꿔 보기(⚙️ 파로 2026-10-30)
   «더 보기»에만 둔다(주 기능 아님). 계산은 순수 함수(node 시험: officer/s10l45.test.js), 그리기는 브라우저에서만.
   ④ 산식·상수 정본: 01_리서치/MN-D02_도입비용_탄소_추정.md §9 — 값을 바꾸려면 MN-D02 를 먼저 고친다.
      휘발유 CO₂ 2.174 kg/L(국내 실측 기반, 한국석유관리원·충북대, 한국유화학회지 2016). ⛔ EPA 2.348 쓰지 않음.
   ⑤ 자료: data/regions_gb.json(data/tools/fetch_regions_gb.py — 행안부 D12·D13, 사보원 D5·D2, 모두 공개 자료). */
(function (root) {
  "use strict";
  // ── ④ MN-D02 §9 그대로 ──
  var DEFAULTS = { households: 48817, officers: 10, visitDays: 8, visitsPerDay: 12, aiPerVisit: 1, dailyCap: 200, kmPerL: 10, saveRate: 0.20 };
  var K = { won_per_call: 32, naive_km_per_day12: 30.78, grouped_km_per_day12: 17.55, demo_save_rate: 0.430, co2_kg_per_L: 2.174, maintenance_year_won: [2000000, 5000000] };
  function num(v, d) { v = +v; return isFinite(v) && v >= 0 ? v : d; }
  function calc(inp) {
    var i = {}; Object.keys(DEFAULTS).forEach(function (k) { i[k] = num(inp && inp[k], DEFAULTS[k]); });
    var days = i.officers * i.visitDays, visits = days * i.visitsPerDay;
    var aiCap = i.dailyCap * 30 * K.won_per_call;
    var aiMonth = Math.min(visits * i.aiPerVisit, i.dailyCap * 30) * K.won_per_call;
    var yearLow = aiMonth * 12 + K.maintenance_year_won[0], yearHigh = aiMonth * 12 + K.maintenance_year_won[1];
    var kmNaive = visits * (K.naive_km_per_day12 / 12), kmCut = kmNaive * i.saveRate;
    var co2Cut = i.kmPerL ? kmCut / i.kmPerL * K.co2_kg_per_L : 0;
    return { input: i, days: days, visits: visits, aiCap: aiCap, aiMonth: aiMonth, yearLow: yearLow, yearHigh: yearHigh,
      perHousehold: i.households ? [yearLow / i.households, yearHigh / i.households] : null,
      kmNaive: kmNaive, kmCut: kmCut, co2Cut: co2Cut, co2Year: co2Cut * 12 };
  }
  var COST_SRC = {
    co2: "출처: 한국석유관리원·충북대, 한국유화학회지 2016(33권 4호) — 국내 유통 휘발유 실측 기반 2.174 kgCO₂/L",
    ai: "출처: Anthropic 가격표(2026-10-29 확인)·한국자금중개 매매기준율 2026-10-28 · 1회 토큰은 닿음 실측(AI 추천 20건)",
    km: "출처: 닿음 시연 재측정(가상 가구 12곳, 직선×1.3) — 방문 1곳당 명단 순 2.565km",
    hh: "출처: 행정안전부 주민등록 세대수 2026-09",
    mn: "산식 정본: 01_리서치/MN-D02_도입비용_탄소_추정.md"
  };

  // ── ⑤ 시군 바꿔 보기 ──
  function pick(R, name) { var l = (R && R.sigungu) || []; for (var i = 0; i < l.length; i++) if (l[i].name === name) return l[i]; return null; }
  /** 시군 한 곳의 화면 값 + 기준(상주)과의 차이 */
  function regionView(R, name, baseName) {
    var s = pick(R, name), b = pick(R, baseName || "상주시"); if (!s) return null;
    var areas = s.areas.slice().sort(function (x, y) { return (y.oneRate + y.a65Rate) - (x.oneRate + x.a65Rate); });
    return { name: s.name, hh: s.hh, pop: s.pop, oneRate: s.oneRate, a65Rate: s.a65Rate, basicRate: s.basicRate, d2: s.d2, d2Sample: s.d2Sample || [],
      areaCount: s.areas.length, areas: areas, recipients: s.recipients || {},
      vsBase: b && b !== s ? { name: b.name, hh: b.hh, oneRate: b.oneRate, a65Rate: b.a65Rate, basicRate: b.basicRate, d2: b.d2 } : null };
  }
  var api = { DEFAULTS: DEFAULTS, K: K, calc: calc, COST_SRC: COST_SRC, regionView: regionView };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }
  root.DaeumExpand = api;

  // ── 그리기(브라우저) ─────────────────────────────────────
  var doc = root.document;
  function $(id) { return doc.getElementById(id); }
  function h(tag, attrs, kids) {
    var e = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { var v = attrs[k]; if (v == null || v === false) return; if (k === "text") e.textContent = v; else if (k === "class") e.className = v; else e.setAttribute(k, v === true ? "" : v); });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? doc.createTextNode(c) : c); });
    return e;
  }
  function won(n) { return n >= 10000 ? (Math.round(n / 1000) / 10).toLocaleString("ko-KR") + "만원" : Math.round(n).toLocaleString("ko-KR") + "원"; }
  function pct(r) { return (r * 100).toFixed(1) + "%"; }
  function tag(t, cls) { return h("span", { class: "d-tag " + (cls || "warn"), text: t }); }

  // ④ 도입 비용·탄소
  var FIELDS = [
    { k: "households", label: "시군 세대수", step: 1, tag: null },
    { k: "officers", label: "방문 담당자 수", step: 1, tag: "가정" },
    { k: "visitDays", label: "1인 월 방문일", step: 1, tag: "가정" },
    { k: "visitsPerDay", label: "하루 방문 가구", step: 1, tag: null },
    { k: "kmPerL", label: "차량 연비(km/L)", step: 0.5, tag: "가정" }
  ];
  function renderCost() {
    var box = $("costRoot"); if (!box) return;
    if (!box._m) {
      box._m = 1;
      var form = h("div", { class: "cost-in" });
      FIELDS.forEach(function (f) {
        var inp = h("input", { id: "cost-" + f.k, type: "number", min: "0", step: String(f.step), inputmode: "decimal", value: String(DEFAULTS[f.k]) });
        inp.addEventListener("input", drawCost);
        form.appendChild(h("label", null, [h("span", null, [f.label, f.tag ? " " : null, f.tag ? tag(f.tag) : null]), inp]));
      });
      var sel = h("select", { id: "cost-saveRate" }, [h("option", { value: "0.2", text: "20% — 시범 목표(보수값)" }), h("option", { value: "0.43", text: "43% — 시연 실측(가상 가구)" })]);
      sel.addEventListener("change", drawCost);
      form.appendChild(h("label", null, [h("span", null, ["이동 거리 단축률"]), sel]));
      var rs = h("button", { type: "button", class: "ghost", "data-h": "light", text: "상주 기본값으로" });
      rs.addEventListener("click", function () { FIELDS.forEach(function (f) { $("cost-" + f.k).value = DEFAULTS[f.k]; }); sel.value = "0.2"; drawCost(); });
      form.appendChild(rs);
      box.appendChild(form);
      box.appendChild(h("div", { id: "costOut", "aria-live": "polite" }));
    }
    drawCost();
  }
  function readCost() { var i = {}; FIELDS.forEach(function (f) { i[f.k] = $("cost-" + f.k).value; }); i.saveRate = $("cost-saveRate").value; return i; }
  function drawCost() {
    var out = $("costOut"); if (!out) return;
    var r = calc(readCost()); out.textContent = "";
    function kpi(label, val, sub) { return h("div", { class: "kpi d-card" }, [h("span", { text: label }), h("b", { class: "num", text: val }), sub ? h("em", { text: sub }) : null]); }
    out.appendChild(h("div", { class: "kpis" }, [
      kpi("AI 월 비용(추정)", won(r.aiMonth), "상한 " + won(r.aiCap)),
      kpi("연 도입 비용(추정)", won(r.yearLow) + "~" + won(r.yearHigh), "유지보수 포함"),
      kpi("이동 감소(추정)", Math.round(r.kmCut).toLocaleString("ko-KR") + "km", "월 · 명단 순 " + Math.round(r.kmNaive).toLocaleString("ko-KR") + "km 기준"),
      kpi("CO₂ 감소(추정)", (Math.round(r.co2Cut * 10) / 10).toLocaleString("ko-KR") + "kg", "월 · 연 " + (r.co2Year / 1000).toFixed(1) + "t")
    ]));
    out.appendChild(h("p", { class: "small" }, ["유지보수 연 200~500만원 ", tag("가정"), " 근거 없음 — 시범 운영 뒤 확정, 견적 아님."]));
    if (r.perHousehold) out.appendChild(h("p", { class: "small", text: "세대당 연 " + Math.round(r.perHousehold[0]) + "~" + Math.round(r.perHousehold[1]) + "원(추정, 규모 감각용)" }));
    out.appendChild(h("details", { class: "cost-how" }, [h("summary", { text: "산식 펼치기" }), h("ul", { class: "small" }, [
      "방문 건수/월 = 담당자 " + r.input.officers + " × 방문일 " + r.input.visitDays + " × 하루 " + r.input.visitsPerDay + " = " + r.visits + "건",
      "AI 월 = min(방문 건수, 하루 상한 200×30) × 1회 32원 = " + won(r.aiMonth),
      "연 도입 = AI 월 × 12 + 유지보수 200~500만원(가정)",
      "명단 순 km/월 = 방문 건수 × 2.565km · 감소 km = × 단축률 " + Math.round(r.input.saveRate * 100) + "%",
      "CO₂ = 감소 km ÷ 연비 " + r.input.kmPerL + " × 2.174 kg/L"
    ].map(function (t) { return h("li", { text: t }); }))]));
    [COST_SRC.co2, COST_SRC.ai, COST_SRC.km, COST_SRC.hh + " · " + COST_SRC.mn].forEach(function (t) { out.appendChild(h("p", { class: "small src-tag", text: t })); });
    out.appendChild(h("p", { class: "note", text: "모든 값은 추정입니다. CO₂ 감소는 화면 참고값이며 감축 실적·인증이 아닙니다. 승용 휘발유 차만 계산합니다." }));
  }

  // ⑤ 다른 시군
  var R = null, cur = "상주시";
  function loadRegions() {
    if (R) return Promise.resolve(R);
    if (root.__DAEUM_REGIONS_GB__) return Promise.resolve(R = root.__DAEUM_REGIONS_GB__);
    return fetch("../data/regions_gb.json").then(function (x) { if (!x.ok) throw 0; return x.json(); }).catch(function () {
      return new Promise(function (ok, no) { var s = doc.createElement("script"); s.src = "../data/regions_gb.js"; s.onload = function () { root.__DAEUM_REGIONS_GB__ ? ok(root.__DAEUM_REGIONS_GB__) : no(0); }; s.onerror = no; doc.head.appendChild(s); });
    }).then(function (j) { return (R = j); });
  }
  function renderRegion() {
    var box = $("regionRoot"); if (!box) return;
    loadRegions().then(function () {
      if (!box._m) {
        box._m = 1;
        var sel = h("select", { id: "rgPick" }, R.sigungu.map(function (s) { var o = h("option", { value: s.name, text: s.name }); if (s.name === cur) o.selected = true; return o; }));
        sel.addEventListener("change", function () { cur = sel.value; drawRegion(); });
        box.appendChild(h("label", { class: "rg-pick" }, [h("span", { text: R.sido + " 시군 고르기" }), sel]));
        box.appendChild(h("div", { id: "rgOut", "aria-live": "polite" }));
      }
      drawRegion();
    }).catch(function () { box.textContent = "공개 자료를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요."; });
  }
  function drawRegion() {
    var out = $("rgOut"), v = regionView(R, cur, "상주시"); if (!out || !v) return;
    out.textContent = "";
    function kpi(label, val, base) { return h("div", { class: "kpi d-card" }, [h("span", { text: label }), h("b", { class: "num", text: val }), base ? h("em", { text: "상주 " + base }) : null]); }
    var b = v.vsBase;
    out.appendChild(h("div", { class: "kpis" }, [
      kpi("주민등록 세대", v.hh.toLocaleString("ko-KR"), b && b.hh.toLocaleString("ko-KR")),
      kpi("읍면동", v.areaCount + "곳", null),
      kpi("1인 세대 비율", pct(v.oneRate), b && pct(b.oneRate)),
      kpi("65세 이상 비율", pct(v.a65Rate), b && pct(b.a65Rate)),
      kpi("기초수급 가구 비율(근사)", v.basicRate != null ? v.basicRate.toFixed(1) + "%" : "—", b && b.basicRate != null ? b.basicRate.toFixed(1) + "%" : null),
      kpi("시군 복지서비스(D2)", v.d2 != null ? v.d2 + "종" : "—", b && b.d2 != null ? b.d2 + "종" : null)
    ]));
    if (v.d2Sample.length) out.appendChild(h("p", { class: "small" }, [h("b", { text: "주민 창구에 붙을 시군 서비스 예: " }), v.d2Sample.join(" · ")]));
    var tb = h("tbody");
    v.areas.forEach(function (a) { tb.appendChild(h("tr", null, [h("th", { scope: "row", text: a.name }), h("td", { class: "num", text: a.hh.toLocaleString("ko-KR") }), h("td", { class: "num", text: pct(a.oneRate) }), h("td", { class: "num", text: pct(a.a65Rate) })])); });
    out.appendChild(h("h4", { text: v.name + " 읍면동 " + v.areaCount + "곳 — 1인 세대·고령 비율 높은 순" }));
    out.appendChild(h("div", { class: "scroll", tabindex: "0", "aria-label": "읍면동 표(가로로 넘겨 보기)" }, [h("table", { class: "grid rg-tbl" }, [
      h("caption", { class: "sr", text: v.name + " 읍면동별 세대·1인 세대 비율·65세 이상 비율(공개 통계)" }),
      h("thead", null, [h("tr", null, [h("th", { scope: "col", text: "읍면동" }), h("th", { scope: "col", class: "num", text: "세대" }), h("th", { scope: "col", class: "num", text: "1인 세대" }), h("th", { scope: "col", class: "num", text: "65세 이상" })])]), tb])]));
    var go = h("button", { type: "button", class: "ghost", "data-h": "light", text: v.name + " 세대수로 도입 비용 계산" });
    go.addEventListener("click", function () { root.location.hash = "#cost"; setTimeout(function () { var x = $("cost-households"); if (x) { x.value = v.hh; drawCost(); x.focus(); } }, 50); });
    out.appendChild(h("div", { class: "rep-acts" }, [go]));
    out.appendChild(h("p", { class: "small" }, [tag("가상"), " 가구 명단·하루 시각표의 가구는 상주 가상 예시 그대로입니다. 실제 도입 때는 그 시군이 받은 명단과 이 표의 읍면동으로 바뀝니다."]));
    out.appendChild(h("p", { class: "small src-tag", text: "출처: 행정안전부 «지역별(행정동) 세대원수별 주민등록 세대수»·«성별 연령별 주민등록 인구수» 기준 " + R.base + " · 한국사회보장정보원 «복지사업 시군구별 수급권자 현황» 기준 " + R.d5Month + " · «지자체복지서비스» 목록 조회 " + R.fetched + (R.d2Note ? " (" + R.d2Note + ")" : "") }));
    out.appendChild(h("p", { class: "note", text: R.limits }));
  }
  doc.addEventListener("daeum:officer-show", function (e) { var t = e.detail && e.detail.tab; if (t === "cost") renderCost(); if (t === "region") renderRegion(); });
})(typeof window !== "undefined" ? window : globalThis);
