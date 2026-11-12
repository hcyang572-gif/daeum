/* 닿음 S12-x 아이콘 묶음 — 🩵 미르 2026-11-12 (호창님 «버튼 이미지 고급화·고도화»)
   규격 하나로 통일: 24 격자 · 선 1.6 · 끝·이음 둥글게 · 모서리 반경 1~1.5 · 2색(선 = 글자색, 면 = 옅은 덧칠 .ic-d)
   면 색은 CSS 가 정한다(app/s12x.css «아이콘 2색»): 기본 글자색 16% · 열쇠 단추 금빛 · 선택 탭 금빛 · 색 단추 위 흰빛.
   손그림풍·이모지 없음. 쓰는 법: DaeumIcons.I.shield (SVG 문자열) · DaeumIcons.svg(면, 선) 로 새 아이콘. */
(function (g) {
  "use strict";
  function svg(d, s) {
    return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (d ? '<g class="ic-d" fill="currentColor" stroke="none">' + d + "</g>" : "") + s + "</svg>";
  }
  var DOOR = "M7 20.5V5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 17 5v15.5";
  var DOORF = '<path d="' + DOOR + 'z"/>';
  var SHIELD = "M12 3.2 18.8 6v5.3c0 4.4-2.9 7.7-6.8 9.5-3.9-1.8-6.8-5.1-6.8-9.5V6z";
  var BELL = "M6.2 16v-5a5.8 5.8 0 0 1 11.6 0v5l1.4 1.8a.6.6 0 0 1-.5 1H5.3a.6.6 0 0 1-.5-1z";
  var I = {
    today: svg('<path d="M5.5 10.6 12 5l6.5 5.6V19a1 1 0 0 1-1 1H14v-5.2h-4V20H6.5a1 1 0 0 1-1-1z"/>',
      '<path d="M3.5 11.8 12 4.5l8.5 7.3"/><path d="M5.5 10.2V19a1 1 0 0 0 1 1H10v-5.2h4V20h3.5a1 1 0 0 0 1-1v-8.8"/>'),
    route: svg('<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/>',
      '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>'),
    field: svg(DOORF, '<path d="' + DOOR + 'M4 20.5h16"/><circle cx="14" cy="12.5" r="1" fill="currentColor" stroke="none"/>'),
    record: svg('<rect x="9" y="3" width="6" height="11" rx="3"/>',
      '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>'),
    report: svg('<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>',
      '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4a1 1 0 0 0 1 1h4M9.5 13h5M9.5 16.5h3.5"/>'),
    shield: svg('<path d="' + SHIELD + '"/>', '<path d="' + SHIELD + '"/><path d="m9.2 12 2 2 3.8-3.9"/>'),
    more: svg("", '<circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none"/>'),
    check: svg("", '<path d="m5.5 12.5 4.2 4.2L18.5 8"/>'),
    nav: svg('<path d="M12 3.2 19 19.6 12 16 5 19.6z"/>', '<path d="M12 3.2 19 19.6 12 16 5 19.6z"/>'),
    pin: svg('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/>',
      '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
    clock: svg('<circle cx="12" cy="12" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    home2: svg('<path d="M5.5 20v-9.4L12 5.5l6.5 5.1V20z"/>', '<path d="M4 20h16M5.5 20v-9.4L12 5.5l6.5 5.1V20"/><path d="M10 20v-4.5h4V20"/>'),
    warn: svg('<path d="M10.3 4.7a2 2 0 0 1 3.4 0l6.9 12.3a2 2 0 0 1-1.7 3H5.1a2 2 0 0 1-1.7-3z"/>',
      '<path d="M10.3 4.7a2 2 0 0 1 3.4 0l6.9 12.3a2 2 0 0 1-1.7 3H5.1a2 2 0 0 1-1.7-3z"/><path d="M12 9.8v3.8M12 16.6v.1"/>'),
    hist: svg('<circle cx="12" cy="12" r="8.5"/>', '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v4h4M12 8v4l3 2"/>'),
    coin: svg('<circle cx="12" cy="12" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5h4a1.8 1.8 0 0 1 0 3.6h-3a1.8 1.8 0 0 0 0 3.6h4M12 7.5v1.8M12 16.8v1.7"/>'),
    people: svg('<circle cx="9" cy="8.5" r="3"/><circle cx="17" cy="9.5" r="2.4"/>',
      '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16 14.6a4.5 4.5 0 0 1 4.5 4.4"/>'),
    phone: svg('<path d="M5 4h3.5l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7L16 14l4 1.5V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.6A1.5 1.5 0 0 1 5 4z"/>',
      '<path d="M5 4h3.5l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7L16 14l4 1.5V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.6A1.5 1.5 0 0 1 5 4z"/>'),
    x: svg("", '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    door: svg(DOORF, '<path d="' + DOOR + 'M4 20.5h16"/><path d="M10 12h5.5M13.2 9.7l2.3 2.3-2.3 2.3"/>'),
    talk: svg('<path d="M5 5h14a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-7.5L7 19v-3.5H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
      '<path d="M5 5h14a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-7.5L7 19v-3.5H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8.5 9.2h7M8.5 12.2h4.5"/>'),
    met: svg('<circle cx="11" cy="8" r="3.5"/>', '<circle cx="11" cy="8" r="3.5"/><path d="M4 20a7 7 0 0 1 14 0"/><path d="m15.8 5 1.6 1.6 3.1-3.1"/>'),
    away: svg(DOORF, '<path d="' + DOOR + 'M4 20.5h16"/><path d="m10 9.8 4 4m0-4-4 4"/>'),
    no: svg('<circle cx="12" cy="12" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>'),
    upload: svg('<path d="M4.5 15h15v3.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z"/>',
      '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>'),
    db: svg('<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/>',
      '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/>', '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v1.8M12 19.4v1.8M5.5 5.5l1.3 1.3M17.2 17.2l1.3 1.3M2.8 12h1.8M19.4 12h1.8M5.5 18.5l1.3-1.3M17.2 6.8l1.3-1.3"/>'),
    lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2"/>',
      '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2.2"/>'),
    sig: svg("", '<path d="M4 18v-1M8 18v-3.5M12 18v-6"/><path d="M16 18V9M20 18V6" opacity=".3"/>'),
    down: svg('<path d="M4.5 19.5h15"/>', '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>'),
    sync: svg("", '<path d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9"/><path d="M18 3.5v4h-4M6 20.5v-4h4"/>'),
    knock: svg(DOORF, '<path d="' + DOOR + '"/><path class="q" d="M10.5 9.5a1.8 1.8 0 1 1 2.6 1.6c-.7.4-1.1.9-1.1 1.7M12 15.2v.2"/>'),
    eye: svg('<path d="M3 12s3.2-6 9-6 9 6 9 6-3.2 6-9 6-9-6-9-6z"/>',
      '<path d="M3 12s3.2-6 9-6c2 0 3.7.7 5 1.6M21 12s-3.2 6-9 6c-2 0-3.7-.7-5-1.6"/><path d="M4 20 20 4"/><path d="M9.5 13.5a3 3 0 0 1 4-4"/>'),
    pen: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>', '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
    bell: svg('<path d="' + BELL + '"/>', '<path d="' + BELL + '"/><path d="M10 21a2.2 2.2 0 0 0 4 0"/>'),
    help: svg('<circle cx="12" cy="12" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4M12 16.6v.2"/>'),
    search: svg('<circle cx="10.5" cy="10.5" r="6.5"/>', '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>'),
    filter: svg('<path d="M4 5.5h16l-6 7.2v5.6l-4 1.7v-7.3z"/>', '<path d="M4 5.5h16l-6 7.2v5.6l-4 1.7v-7.3z"/>'),
    copy: svg('<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="1.5"/>', '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="1.5"/><path d="M15.5 8.5V5.5A1.5 1.5 0 0 0 14 4H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/>'),
    send: svg('<path d="M20.5 3.5 3.5 10.6l7 2.9 2.9 7z"/>', '<path d="M20.5 3.5 3.5 10.6l7 2.9 2.9 7z"/><path d="m10.5 13.5 4.5-4.5"/>'),
    print: svg('<rect x="6.5" y="13.5" width="11" height="7" rx="1"/>', '<path d="M7 9V3.5h10V9"/><path d="M6.5 17H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 17h-1.5"/><rect x="6.5" y="13.5" width="11" height="7" rx="1"/>'),
    user: svg('<circle cx="12" cy="8.5" r="3.6"/>', '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
    menu: svg("", '<path d="M4.5 7h15M4.5 12h15M4.5 17h15"/>')
  };
  g.DaeumIcons = { I: I, svg: svg, size: 24, stroke: 1.6, count: Object.keys(I).length };
})(typeof window !== "undefined" ? window : globalThis);
