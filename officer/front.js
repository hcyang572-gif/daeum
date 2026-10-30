/* S10p-2(10-30 A안) 공무원 첫 화면 «공공데이터 → 닿음 → 현장 개선» — 주 화면 3카드의 숫자만 채운다.
   틀(띠·카드·전/후 그림)은 officer/index.html, 계산은 기존 화면과 같은 함수를 빌려 쓴다(새 계산 없음).
   ①시각표: DaeumOfficer.gain() — 명단 순번대로 vs 닿음이 묶은 순서, 직선×1.3 근사(재측정 기록 _design/S10p-2_이동거리_재측정.md)
   ②연계 누락: DaeumMountData.gapData().total(가상 기록)
   ③현황: DaeumLonely(행안부 공개 CSV → 닿음 추정 지수)·DaeumOfficer.recipients()(사보원 수급권자 현황, 실제 값) */
(function (root) {
  "use strict";
  var doc = root.document;
  function $(id) { return doc.getElementById(id); }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function tag(kind, text) { return el("span", "d-tag " + kind, text); }

  // 감소율(%) — 순수 계산, 시험용으로 밖에 연다
  function gainPct(g) { return g && g.naive > 0 ? Math.round((g.naive - g.plan) / g.naive * 100) : null; }

  // S10p-3 F-1: 첫 화면 숫자는 «시연 기본값» 스냅숏으로 고정한다(담기·앞에 두기·특보 선택이 브라우저에 남아도 발표·원고 숫자와 같게).
  // 값은 빈 프로필 실측(_design/S10p-2_이동거리_재측정.md). 지금 담은 집 기준 값이 다르면 작게 함께 적는다.
  var SNAP = { n: 9, naive: 127.31, plan: 65.77, pct: 48 }; // 2026-10-30 빈 프로필 실측 (127.31-65.77)/127.31 = 48.3%
  function renderGain(O) {
    var box = $("fGain"); if (!box || !SNAP.pct) return;
    var g = null; try { g = O.gain ? O.gain() : null; } catch (e) { g = null; }
    var p = gainPct(g);
    box.textContent = "";
    box.appendChild(doc.createTextNode("이동 거리 "));
    box.appendChild(el("b", "num", SNAP.pct + "%"));
    box.appendChild(doc.createTextNode(" 줄임 "));
    box.appendChild(tag("warn", "가상"));
    box.appendChild(el("small", null, "시연 기본값 " + SNAP.n + "곳: 명단 순서 " + SNAP.naive.toFixed(1) + "km → 묶은 순서 " + SNAP.plan.toFixed(1) + "km · 시청 복귀 · 직선×1.3 추정" +
      (p != null && p > 0 && p !== SNAP.pct ? " (지금 담은 기준 " + p + "%)" : "")));
  }

  function renderWx(O) {
    var box = $("fWx"), AL = root.DaeumAlerts; if (!box) return;
    var d = AL && AL.get ? AL.get() : null, w = d ? AL.weather(d, O.weatherChoice ? O.weatherChoice() : null) : null;
    if (!w) { box.hidden = true; return; }
    var hot = O.rows().filter(function (r) { return r.alert && r.alert.heat; }).length;
    box.textContent = "";
    box.appendChild(tag("warn", "가상")); box.appendChild(doc.createTextNode(" "));
    box.appendChild(el("b", null, w.name + "(시연)"));
    box.appendChild(doc.createTextNode(" · 홀로 사는 75세 이상 " + hot + "곳을 위로 "));
    box.appendChild(tag("pub", "공공데이터"));
    box.hidden = false;
  }

  function renderRisk(O) {
    var ol = $("fRisk"), L = root.DaeumLonely, d = L && L.get ? L.get() : null; if (!ol || !d) return;
    ol.textContent = "";
    L.ranked(d).slice(0, 3).forEach(function (r) { ol.appendChild(riskLi(r, d)); });
    var R = O.recipients ? O.recipients() : null, rc = $("fRecip");
    if (rc && R && R.basic_rate) {
      var basic = R.rows.filter(function (x) { return x["사업명"] === "기초생활보장(맞춤형급여)"; })[0];
      rc.textContent = "";
      rc.appendChild(doc.createTextNode("기초생활보장 수급가구 "));
      rc.appendChild(el("b", "num", basic ? basic["수급가구수"].toLocaleString() : R.basic_rate.value_pct.toFixed(1) + "%"));
      rc.appendChild(doc.createTextNode(basic ? "가구(" + R.basic_rate.value_pct.toFixed(1) + "%, 근사) " : " "));
      rc.appendChild(tag("pub", "공공데이터"));
      rc.hidden = false;
    }
    var src = $("fRiskSrc"), dd = $("fRiskSrcD"), sum = $("fRiskSum");
    if (src && dd && (dd.hidden || (R && src.textContent.indexOf("15062448") < 0))) { // 한 번만 쓴다 — 출처 꼬리표 장식(guide.js)이 붙인 표식·링크를 지우지 않게
      var ym = R ? ((R.rows[0] || {})["기준년월"] || "") : "";
      if (sum) sum.textContent = "출처: 행정안전부 인구·세대(" + d.base + ")" + (R ? " · 사회보장정보원 수급권자 현황(" + ym + ")" : "");
      src.removeAttribute("data-src-done");
      src.textContent = "출처: 행정안전부 «주민등록 인구·세대»(공공데이터포털 15097972·15097974) 기준 " + d.base +
        (R ? " · 한국사회보장정보원 «복지사업 시군구별 수급권자 현황»(15062448) 기준 " + ym +
          " · 수급가구 비율은 분자 " + ym + "·분모 2026-09(상주시 세대수)로 시점이 다른 근사값" : "") +
        " · 위험도는 닿음 추정 지수(공식 통계 아님)";
      dd.hidden = false;
    }
    // S10p-3 F-6: 현황·보고 화면 맨 위 — 위험 높은 읍면 5곳(같은 자료)
    var r5 = $("rRisk");
    if (r5) { r5.textContent = ""; L.ranked(d).slice(0, 5).forEach(function (r) { r5.appendChild(riskLi(r, d)); }); }
  }
  function riskLi(r, d) {
    var li = el("li"); li.appendChild(el("b", null, r.name));
    var bar = el("span", "rk"); bar.setAttribute("aria-hidden", "true");
    var fill = el("i"); fill.style.width = Math.max(4, Math.min(100, r.index)) + "%"; bar.appendChild(fill); li.appendChild(bar);
    li.appendChild(el("span", "v", r.index.toFixed(0)));
    li.appendChild(el("span", "sr", " 고독사 위험도 지수 " + r.index.toFixed(1) + " · " + r.tier + " · 상주 " + d.areas.length + "곳 중 " + r.rank + "위"));
    return li;
  }

  function render(today) {
    var O = root.DaeumOfficer; if (!O || !O.data || !O.data()) return;
    var M = root.DaeumMountData;
    try { renderGain(O); } catch (e) { /* 숫자 하나 못 내도 첫 화면은 그대로 */ }
    try { renderWx(O); } catch (e) { }
    try {
      var t = today || (M ? M.today() : null);
      if (t && $("fRevisitN")) $("fRevisitN").textContent = t.counts.revisits;
      if (M && $("fGap")) $("fGap").textContent = M.gapData().total;
    } catch (e) { }
    try { renderRisk(O); } catch (e) { }
  }

  var API = { render: render, gainPct: gainPct, SNAP: SNAP };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.DaeumFront = API;
})(typeof window !== "undefined" ? window : this);
