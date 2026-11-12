/* 닿음 «데이터 흐름» 그림(S12-r, 🩵 미르 2026-11-12) — shared/data.html 전용. 스타일 data_flow.css.
   «어떤 정보 · 어디서 → 닿음이 하는 일 → 쓰이는 화면»을 한 줄씩. 실시간 줄은 «실시간» 표지 + 불씨 구슬.
   줄을 누르면 아래 «활용 데이터» 표의 해당 줄로 간다(#D1,D2 해시 → DaeumGuide.hit).
   정본: 01_리서치/S12-r_데이터활용_전수표.md §4(흐름 노드·화살표 12개). 숫자는 guide.js DATA에서 센다(DaeumGuide.counts). */
(function () {
  "use strict";
  var G = window.DaeumGuide;
  /* S12-v U5: 구성도(build_s12u.py 생성 SVG, 손으로 안 고침) 안 연계처·좌표 숫자도 meta로 맞춘다 */
  function syncSys(L) {
    var fig = document.getElementById("system-diagram");
    if (!fig || !L || !L.fromMeta) return;
    var R = [[/공공데이터 연계처 \d+곳/g, "공공데이터 연계처 " + L.extra + "곳"], [/연계처 \d+곳 · \d+종 기관/g, "연계처 " + L.extra + "곳 · " + L.sources + "종 기관"],
      [/지도 좌표 \d+곳/g, "지도 좌표 " + L.geoOk + "곳"], [/같은 동네 \d+곳/g, "같은 동네 " + L.total + "곳"], [/연계처 \d+곳·/g, "연계처 " + L.total + "곳·"]];
    Array.prototype.forEach.call(fig.querySelectorAll("text, desc"), function (n) {
      var t = n.textContent, v = t; R.forEach(function (r) { v = v.replace(r[0], r[1]); });
      if (v !== t) n.textContent = v;
    });
  }
  if (G && G.links) syncSys(G.links());
  var box = document.getElementById("dataFlow");
  if (!box || !G) return;
  /* S12-v U5: 연계처 숫자는 데이터 파일 meta에서(DaeumGuide.links) */
  var L = G.links();
  function lk(k) { return L[k]; }

  var I = {
    list: '<path d="M8 6h11M8 12h11M8 18h7"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.2"/><path d="M16 14.2c2.4.2 4 1.8 4.5 4.3"/>',
    house: '<path d="M4 11 12 4.5 20 11"/><path d="M6 9.5V19h12V9.5"/><path d="M10 19v-5h4v5"/>',
    cross: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 18h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16"/>',
    sync: '<path d="M4 9a8 8 0 0 1 14-3l2 2"/><path d="M20 4v4h-4"/><path d="M20 15a8 8 0 0 1-14 3l-2-2"/><path d="M4 20v-4h4"/>',
    spark: '<path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z"/><path d="M18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.2-2.2.9-2.5 2.5-.3-1.6-1-2.3-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5z"/>',
    bars: '<path d="M4 20h16"/><rect x="6" y="11" width="3" height="6" rx="1"/><rect x="10.5" y="7" width="3" height="10" rx="1"/><rect x="15" y="13" width="3" height="4" rx="1"/>',
    sun: '<circle cx="9" cy="9" r="3.2"/><path d="M9 2.5v1.6M2.5 9h1.6M4.4 4.4l1.1 1.1M13.6 4.4l-1.1 1.1"/><path d="M8.5 19.5h9a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.3 2.9 2.9 0 0 0 .3 5.7z"/>',
    heart: '<path d="M12 19.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/><path d="M7.5 12h2.5l1.2-2.2 1.6 4.2 1.2-2H17"/>',
    scr: '<rect x="4" y="5" width="16" height="11" rx="2.5"/><path d="M9 20h6M12 16v4"/>'
  };
  function ic(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + I[k] + "</svg>"; }

  /* 묶음 → 줄. ids = 아래 표 줄 번호. live: 실시간 · both: 오가는 실시간 · plan: 예정 */
  var BANDS = [
    { h: "방문 전 — 받아 둔 공공데이터로 준비", lanes: [
      { g: "list", info: "발굴 명단", from: "한국사회보장정보원 · 담당자가 올림", tag: "virt", tagT: "시연은 가상", act: "위기 신호 순서로 정리", to: ["오늘", "방문"], ids: "U1,V1" },
      { g: "snow", info: "기상특보", from: "기상청", act: "한파·폭염 날 홀몸 어르신 먼저", to: ["오늘"], ids: "D11" },
      { g: "people", info: "인구 · 1인 세대", from: "행정안전부", act: "읍면 고독사 위험도", sub: "닿음 추정 지수", to: ["보고", "방문 전 카드"], ids: "D12,D13,M1" },
      { g: "house", info: "건물 나이", from: "국토교통부 건축물대장", act: "30년 넘은 집 비율", sub: "난방·전기·누수 살피기", to: ["가구 명단", "방문 전 카드"], ids: "D15,P22" },
      { g: "cross", info: "병·의원·약국 190곳", from: "국립중앙의료원", act: "방문 시각에 문 연 곳", to: ["방문 전 카드"], ids: "MED" },
      { g: "pin", info: "연계처 " + lk("total") + "곳", from: "한국사회보장정보원 자원정보 " + lk("res") + " · " + lk("orgs") + "개 기관 " + lk("extra"), act: "좌표 붙여 가까운 순", sub: "좌표: 주소정보누리집(한 번 변환)", to: ["연계 카드", "방문 전 카드"], ids: "P3,P11,P12,P13,P14,P16,P17,P18,P19,P20,K1" }
    ] },
    { h: "현장 — 실시간", live: true, lanes: [
      { g: "route", info: "지도 · 도로 경로", from: "네이버클라우드플랫폼", live: 1, act: "도로 기준 방문 순서", sub: "누를 때마다 새로 계산", to: ["방문 › 지도"], ids: "N1,N2" },
      { g: "sync", info: "방문 계획 · 결과", from: "닿음 전용 서버", live: 1, both: 1, act: "PC ⇄ 폰 바로 반영", sub: "같은 계정, 바뀌는 즉시", to: ["오늘", "방문", "기록"], ids: "L1" }
    ] },
    { h: "기록 · 보고", lanes: [
      { g: "spark", info: "복지서비스 목록", from: "한국사회보장정보원 · 중앙·지자체", live: 1, liveT: "AI 요청 시 실시간", act: "연계 후보 + AI 추천", sub: "목록 안의 서비스만 고름", to: ["기록"], ids: "D1,D2,L4" },
      { g: "bars", info: "수급권자 현황", from: "한국사회보장정보원", act: "수요 보드 · 연계가 멈춘 집", to: ["보고"], ids: "D5" }
    ] },
    { h: "예정 — 개발·활용신청 중", plan: true, lanes: [
      { g: "sun", info: "날씨(시간 단위)", from: "기상청 단기예보", plan: 1, act: "화면 위 날씨 띠", to: ["모든 화면"], ids: "F1" },
      { g: "heart", info: "AED · 장기요양기관", from: "국립중앙의료원 · 국민건강보험공단", plan: 1, act: "지도 «주변 정보» 층", to: ["방문 › 지도"], ids: "F2,F3,F4" }
    ] }
  ];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var n = G.counts();
  var h = '';
  h += '<span class="dv-eye">DATA FLOW · 어떤 정보 → 어디서 → 어떻게 쓰임</span>';
  h += '<h2 class="dv-t" id="dvH">공공데이터는 <em>방문 준비</em>에, 실시간 정보는 <em>현장</em>에</h2>';
  h += '<div class="dv-key" role="group" aria-label="숫자와 색 읽는 법"><ul class="dv-nums">' +
    '<li><b>' + n.portal + '</b><small>공공데이터(종)</small></li>' +
    '<li class="is-live"><b>' + n.live + '</b><small>실시간(건)</small></li>' +
    '<li><b>' + n.plan + '</b><small>예정(건)</small></li>' +
    '<li class="is-zero"><b>0</b><small>실제 주민 정보</small></li></ul>' +
    '<ul class="dv-sw"><li><i class="sw-live"></i>실시간 — 누르거나 바뀔 때 그 순간 값</li><li><i class="sw-store"></i>받아 둔 자료 — 기준일 표기</li>' +
    '<li><i class="sw-go"></i>닿음이 하는 일</li><li><i class="sw-plan"></i>예정</li></ul></div>';
  h += '<div class="dv-cols" aria-hidden="true"><span>어떤 정보 · 어디서</span><span>닿음이 하는 일</span><span>쓰이는 화면</span></div>';
  var k = 0;
  BANDS.forEach(function (b) {
    h += '<section class="dv-band' + (b.live ? " is-live" : "") + (b.plan ? " is-plan" : "") + '"><h3 class="dv-bh">' + esc(b.h) +
      (b.live ? ' <span class="d-tag live">실시간</span>' : "") + (b.plan ? ' <span class="d-tag plan">예정</span>' : "") + '</h3><ol class="dv-lanes">';
    b.lanes.forEach(function (l) {
      var cls = "dv-lane" + (l.live ? " is-live" : "") + (l.both ? " is-both" : "") + (l.plan ? " is-plan" : "");
      var tag = l.live ? '<span class="d-tag live">' + esc(l.liveT || "실시간") + "</span>" : l.plan ? '<span class="d-tag plan">예정</span>' : l.tag ? '<span class="d-tag ' + l.tag + '">' + esc(l.tagT) + "</span>" : "";
      var say = l.info + "(" + l.from + ") → " + l.act + " → " + l.to.join("·") + (l.live ? " · 실시간" : l.plan ? " · 예정" : "") + " — 아래 표에서 보기";
      var bead = l.live ? '<i class="dv-bead"></i>' : "";
      h += '<li><a class="' + cls + '" href="#' + l.ids + '" style="--d:' + (k++ * 70) + 'ms" aria-label="' + esc(say) + '">' +
        '<span class="dv-src"><span class="dv-disc">' + ic(l.g) + '</span><span class="dv-tx"><b>' + esc(l.info) + tag + '</b><small>' + esc(l.from) + '</small></span></span>' +
        '<span class="dv-pipe dv-p1" aria-hidden="true">' + bead + (l.both ? '<i class="dv-back"></i>' : "") + '</span>' +
        '<span class="dv-do">' + esc(l.act) + (l.sub ? "<small>" + esc(l.sub) + "</small>" : "") + '</span>' +
        '<span class="dv-pipe dv-p2" aria-hidden="true">' + bead + (l.both ? '<i class="dv-back"></i>' : "") + '</span>' +
        '<span class="dv-to">' + l.to.map(function (t) { return "<span>" + ic("scr") + esc(t) + "</span>"; }).join("") + '</span></a></li>';
    });
    h += "</ol></section>";
  });
  h += '<p class="dv-foot">줄을 누르면 아래 표의 출처 줄로 갑니다. 연계처 ' + lk("total") + '곳 = 한국사회보장정보원 자원정보 ' + lk("res") + ' + 보건복지부·상주시·국립중앙의료원 등 ' + lk("orgs") + '개 기관 ' + lk("extra") + '. 인구·건물 나이는 읍면 단위 합계만 쓰고, 가구는 모두 가상입니다.</p>';
  box.innerHTML = h;

  /* 화면에 들어올 때 한 번 재생(움직임 줄이기면 정지 그림 — CSS가 막음) */
  function play() { box.classList.add("dv-play"); }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { play(); io.disconnect(); } }, { threshold: .15 });
    io.observe(box);
  } else play();
})();
