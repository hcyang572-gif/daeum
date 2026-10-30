/* S10h ① 읍면동 고독사 위험도 — 행정안전부 공개 CSV(D12 연령별 인구·D13 세대원수별 세대)로 만든 data/lonely_risk.json 을 읽어
   «현황·보고서» 카드(순위 막대)와 «방문 전 카드» 한 줄에 쓴다. 지수는 닿음 추정 산식(공식 고독사 통계 아님) — 산식은 수집기 머리 주석.
   자료 만들기: python data/tools/fetch_lonely_risk.py · 시험: node officer/lonely_risk.test.js */
(function (root) {
  "use strict";
  var DATA = null;

  function pct(x) { return (x * 100).toFixed(1) + "%"; }
  // 출처 한 줄(숫자·지도 옆 꼬리표 규칙): 기관·데이터명·기준일
  function sourceLine(d) {
    return "출처: " + d.sources.map(function (s) { return s.org + " «" + s.name + "»(공공데이터포털 " + s.url.replace(/^.*\/data\/(\d+)\/.*$/, "$1") + ")"; }).join(" · ") +
      ", 기준일 " + d.base + " · 내려받은 날 " + d.fetched;
  }
  // 위험도 순 정렬 + 담당 읍면 표시. focus = 담당 읍면 이름 배열
  function ranked(d, focus) {
    var f = {}; (focus || []).forEach(function (n) { f[n] = 1; });
    return d.areas.slice().sort(function (a, b) { return a.rank - b.rank; })
      .map(function (a) { return { name: a.name, rank: a.rank, tier: a.tier, index: a.index, oneRate: a.oneRate, a65Rate: a.a65Rate, pop: a.pop, hh: a.hh, focus: !!f[a.name] }; });
  }
  function area(d, name) { return d && d.areas.filter(function (a) { return a.name === name; })[0] || null; }
  // 방문 전 카드 한 줄(데이터가 없거나 읍면이 없으면 null)
  function areaLine(d, name) {
    var a = area(d, name); if (!a) return null;
    return name + " 고독사 위험도 " + a.tier + "(상주 " + d.areas.length + "곳 중 " + a.rank + "위) — 1인 세대 " + pct(a.oneRate) + " · 65세 이상 " + pct(a.a65Rate);
  }
  var TIER = { "높음": "neg", "보통": "warn", "낮음": "pos" };

  // 화면: box(#lonelyRisk) 안을 그린다. el(tag, cls, text) 는 officer.js 의 것을 받는다
  function render(box, d, focus, el) {
    box.textContent = "";
    var h3 = el("h3", null, "읍면동 고독사 위험도 ");
    h3.appendChild(el("small", "tag", "공공데이터 · 추정 지수"));
    box.appendChild(h3);
    var R = ranked(d, focus), mine = R.filter(function (r) { return r.focus; });
    box.appendChild(el("p", "kpi-line", "상주시 전체 1인 세대 " + pct(d.total.oneRate) + " · 65세 이상 인구 " + pct(d.total.a65Rate) + " (" + d.total.hh.toLocaleString() + "세대 · " + d.total.pop.toLocaleString() + "명)"));
    if (mine.length) box.appendChild(el("p", "lr-mine", "담당 읍면: " + mine.map(function (r) { return r.name + " " + r.rank + "위(" + r.tier + ")"; }).join(" · ")));
    var ol = el("ol", "lr-list"); ol.setAttribute("aria-label", "읍면동 고독사 위험도 순위(지수 0~100, 높을수록 먼저)");
    R.forEach(function (r) {
      var li = el("li", r.focus ? "on" : null);
      var nm = el("span", "lr-name"); nm.appendChild(el("b", null, r.rank + ". " + r.name)); if (r.focus) nm.appendChild(el("span", "d-tag acc", "담당"));
      li.appendChild(nm);
      var bar = el("span", "lr-bar"); bar.setAttribute("aria-hidden", "true");
      var fill = el("i", TIER[r.tier]); fill.style.width = Math.max(2, r.index) + "%"; bar.appendChild(fill);
      li.appendChild(bar);
      li.appendChild(el("span", "lr-val", "지수 " + r.index.toFixed(1) + " · " + r.tier + " · 1인 세대 " + pct(r.oneRate) + " · 65세 이상 " + pct(r.a65Rate)));
      ol.appendChild(li);
    });
    box.appendChild(ol);
    var det = el("details", "lr-how"); det.appendChild(el("summary", null, "지수 계산 방법·한계"));
    det.appendChild(el("p", "small", d.formula + "."));
    det.appendChild(el("p", "small", d.limits + "."));
    box.appendChild(det);
    var src = el("p", "muted small src-line"); src.appendChild(el("span", "d-tag pub", "공공데이터"));
    src.appendChild(document.createTextNode(" " + sourceLine(d) + ". 이용허락 제한 없음. 지수는 닿음 추정 산식이며 공식 고독사 통계가 아닙니다."));
    box.appendChild(src);
  }

  var API = {
    set: function (d) { DATA = d; }, get: function () { return DATA; },
    ranked: ranked, area: area, sourceLine: sourceLine, render: render,
    areaLine: function (name, d) { return areaLine(d || DATA, name); }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.DaeumLonely = API;
})(typeof window !== "undefined" ? window : this);
