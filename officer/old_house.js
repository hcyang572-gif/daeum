/* S10h ④ 오래된 집 — 국토교통부 건축HUB 건축물대장(D15)으로 미리 집계한 data/old_house.json(읍면별 30년 넘은 주택 비율)을 읽어
   가구 명단·오늘 동선·방문 전 카드에 «오래된 집» 표식을 붙인다.
   ⛔ 가구는 가상이라 실제 건물과 잇지 않는다(설계 01_리서치/데이터준비/old_house_design.md §2):
      - 동네 값(공공데이터) = «이 읍면 30년 넘은 주택 ○%(주거용 건물 동 수 기준)»
      - 집 표식(가상) = 가구 번호로 만든 고정 난수 < 그 읍면 비율 이면 «오래된 집». 실제 이 집의 건축연도가 아니다.
   서비스키는 화면에 없다 — 집계는 개발 PC에서 data/tools/fetch_old_house.py 로만. 시험: node officer/old_house.test.js */
(function (root) {
  "use strict";
  var DATA = null;

  function pct(x) { return (x * 100).toFixed(1) + "%"; }
  // 가구 번호 → 0~1 고정 난수(FNV-1a). 같은 가구는 언제나 같은 값
  function unit(id) {
    var h = 2166136261, s = String(id);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return (h % 100000) / 100000;
  }
  function area(d, name) { return d && d.areas && d.areas[name] && d.areas[name].노후비율 != null ? d.areas[name] : null; }
  function rate(d, name) { var a = area(d, name); return a ? a.노후비율 : null; }
  // 가상 표식: 이 가구를 시연에서 «오래된 집»으로 볼지(동네 비율을 확률로)
  function isOld(d, h) { var r = h ? rate(d, h.area) : null; return r != null && unit(h.id) < r; }
  function sourceLine(d) {
    return "출처: 국토교통부 «건축HUB 건축물대장정보»(공공데이터포털 15134735) 표제부, 기준일 " + d.base;
  }
  // 방문 전 카드 한 줄
  function areaLine(d, name) {
    var a = area(d, name); if (!a) return null;
    return name + " 30년 넘은 주택 " + pct(a.노후비율) + "(주거용 건물 " + (a.전체동수 - a.미상).toLocaleString() + "동 중 " + a.노후동수.toLocaleString() + "동, 건물 동 수 기준)";
  }
  var TIP = "난방·전기 배선·누수·화재경보기를 함께 살펴보세요";

  var API = {
    set: function (d) { DATA = d; }, get: function () { return DATA; },
    unit: unit, sourceLine: sourceLine, TIP: TIP,
    rate: function (name, d) { return rate(d || DATA, name); },
    isOld: function (h, d) { return isOld(d || DATA, h); },
    areaLine: function (name, d) { return areaLine(d || DATA, name); },
    // 화면 꼬리표 글(guide.js 가 «공공데이터»·«가상» 표식과 자료 표 연결을 붙인다)
    tagText: function (d) { d = d || DATA; return d ? sourceLine(d) + " · «오래된 집» 표식은 읍면 비율로 가상 가구에 붙인 시연용 가상 표시(실제 건물 아님)" : ""; }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.DaeumOldHouse = API;
})(typeof window !== "undefined" ? window : this);
