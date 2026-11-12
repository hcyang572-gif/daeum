/* 닿음 아이콘 체계 78 — 🩵 미르 2026-11-13 시안 → ⚙️ 파로 79회차 앱 적용(원본 _design/icons78/icons78.js)
   79회차 결정(11-13 호창님 «b로 해줘»): «오늘» 탭도 달력 — today = calendar 별칭, 옛 집 그림은 house 로 남김.
   기준 = 77회차 결과 아이콘(만났어요·부재·거절): 24 격자 · 선 1.6 · 끝·이음 둥글게 · 모서리 1~1.5 · 덧칠 면 하나(.ic-d) · 광학 중심 12,12
   규격서: _design/icons78/SPEC.md   견본: _design/icons78/index.html
   S12-x 묶음(shared/icons_s12x.js)과 같은 사용법 — DaeumIcons.I.<이름> (SVG 문자열). 이 파일로 바꿔 끼우면 옛 이름은 그대로 돈다.
   ⚠ 바뀐 뜻 하나: 옛 «eye»(빗금 눈 = 가림)는 «eyeOff», 새 «eye»는 뜬 눈(미리보기·판단 근거).
   선 굵기는 CSS 가 크기 단계마다 고친다(stroke-width 속성보다 CSS 가 이긴다): 16→2.0 · 20→1.8 · 24→1.6 · 28→1.5 · 40↑→1.4 */
(function (g) {
  "use strict";
  function svg(d, s) {
    return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (d ? '<g class="ic-d" fill="currentColor" stroke="none">' + d + "</g>" : "") + s + "</svg>";
  }
  function dot(x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 1) + '" fill="currentColor" stroke="none"/>'; }
  // 자주 쓰는 몸통 — 같은 모양은 같은 좌표로(문·문서·방패·종·폰·배지)
  var DOOR = "M7 20.5V5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 17 5v15.5";
  var DOORF = '<path d="' + DOOR + 'z"/>';
  var DOC = "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z";
  var SHIELD = "M12 3.2 18.8 6v5.3c0 4.4-2.9 7.7-6.8 9.5-3.9-1.8-6.8-5.1-6.8-9.5V6z";
  var BELL = "M6.2 16v-5a5.8 5.8 0 0 1 11.6 0v5l1.4 1.8a.6.6 0 0 1-.5 1H5.3a.6.6 0 0 1-.5-1z";
  var PHONE_BODY = '<rect x="6.5" y="2.8" width="11" height="18.4" rx="2.5"/>';
  var BADGE = '<circle cx="17" cy="16.5" r="4.3"/>'; // 결과·확인 배지(우하) — met 과 같은 자리
  var BADGE_OK = BADGE + '<path d="m15 16.6 1.4 1.4 2.7-2.8"/>';
  var CCW = "M4.5 12a7.5 7.5 0 1 0 2.2-5.3";
  var EYE = "M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6z";

  var I = {
    // ── 1. 길잡이(탭·레일) ──
    house: svg('<path d="M5.5 10.6 12 5l6.5 5.6V19a1 1 0 0 1-1 1H14v-5.2h-4V20H6.5a1 1 0 0 1-1-1z"/>',
      '<path d="M3.5 11.8 12 4.5l8.5 7.3"/><path d="M5.5 10.2V19a1 1 0 0 0 1 1H10v-5.2h4V20h3.5a1 1 0 0 0 1-1v-8.8"/>'),
    route: svg('<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/>',
      '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>'),
    field: svg(DOORF, '<path d="' + DOOR + 'M4 20.5h16"/>' + dot(14, 12.5)),
    record: svg('<rect x="9" y="3" width="6" height="11" rx="3"/>',
      '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>'),
    report: svg('<path d="' + DOC + '"/>', '<path d="' + DOC + '"/><path d="M14 3v4a1 1 0 0 0 1 1h4M9.5 13h5M9.5 16.5h3.5"/>'),
    more: svg("", dot(6, 12, 1.4) + dot(12, 12, 1.4) + dot(18, 12, 1.4)),
    menu: svg("", '<path d="M4.5 7h15M4.5 12h15M4.5 17h15"/>'),

    // ── 2. 결과(기준 3개 — 77회차 그대로) ──
    met: svg('<circle cx="9.5" cy="7.8" r="3.2"/>' + BADGE,
      '<circle cx="9.5" cy="7.8" r="3.2"/><path d="M3.5 20.3a6 6 0 0 1 8.6-5.4"/>' + BADGE_OK),
    away: svg('<path d="M5.5 20.5V5A1.5 1.5 0 0 1 7 3.5h5.5A1.5 1.5 0 0 1 14 5v15.5z"/><circle cx="18" cy="8.5" r="3.6"/>',
      '<path d="M5.5 20.5V5A1.5 1.5 0 0 1 7 3.5h5.5A1.5 1.5 0 0 1 14 5v15.5M3.5 20.5h17"/>' + dot(12, 12.5, 0.9) + '<circle cx="18" cy="8.5" r="3.6"/><path d="M18 6.7v1.8l1.2.9"/>'),
    no: svg('<path d="M7.6 12.2h10.8v2.3a6 6 0 0 1-6 6h-.7a5.4 5.4 0 0 1-4.3-2.2l-2.6-3.6 2.8-.6z"/>',
      '<path d="M7.6 13.4V6.6a1.3 1.3 0 0 1 2.6 0v5M10.2 11.6V4.8a1.3 1.3 0 0 1 2.6 0v6.8M12.8 11.6V5.8a1.3 1.3 0 0 1 2.6 0v6.2M15.4 12.2V8.6a1.3 1.3 0 0 1 2.6 0v5.9a6 6 0 0 1-6 6h-.7a5.4 5.4 0 0 1-4.3-2.2l-2.6-3.6a1.25 1.25 0 0 1 1.9-1.6l1.3 1.3"/>'),

    // ── 3. 현장·방문 ──
    // 79회차(11-13 호창님 «길안내 아이콘 촌스러» → 네이버 지도 «느낌»): 초록 둥근 사각 배지(#03C75A) + 흰 길찾기 경로(출발점 → 꺾인 길 → 화살촉). 색 고정(currentColor 아님) · ⛔ 네이버 로고(N) 쓰지 않음
    nav: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="#03C75A"/>' +
      '<path d="M8 17.2V12.4a2.6 2.6 0 0 1 2.6-2.6h5.6M13.6 7.1l2.7 2.7-2.7 2.7" fill="none" stroke="#FFFFFF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="17.6" r="1.7" fill="#FFFFFF"/></svg>',
    door: svg(DOORF, '<path d="' + DOOR + 'M4 20.5h16"/><path d="M10 12h5.5M13.2 9.7l2.3 2.3-2.3 2.3"/>'),
    knock: svg(DOORF, '<path d="' + DOOR + 'M4 20.5h16"/><path d="M10.5 9.5a1.8 1.8 0 1 1 2.6 1.6c-.7.4-1.1.9-1.1 1.7M12 15.2v.2"/>'),
    home2: svg('<path d="M5.5 20v-9.4L12 5.5l6.5 5.1V20z"/>', '<path d="M4 20h16M5.5 20v-9.4L12 5.5l6.5 5.1V20"/><path d="M10 20v-4.5h4V20"/>'),
    senior: svg('<path d="M3 10.5 12 5l9 5.5z"/>', // 경로당 = 정자 지붕(집과 구별)
      '<path d="M3 10.5 12 5l9 5.5zM7 10.5V20M17 10.5V20M4 20h16M9.5 15.5h5"/>'),
    pin: svg('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/>',
      '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
    phone: svg('<path d="M5 4h3.5l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7L16 14l4 1.5V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.6A1.5 1.5 0 0 1 5 4z"/>',
      '<path d="M5 4h3.5l1.5 4-2 1.3a10 10 0 0 0 6.7 6.7L16 14l4 1.5V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.6A1.5 1.5 0 0 1 5 4z"/>'),
    link: svg("", '<path d="M9.6 14.4 14.4 9.6M10.8 6.8l1.6-1.6a3.6 3.6 0 0 1 5.1 5.1l-1.6 1.6M13.2 17.2l-1.6 1.6a3.6 3.6 0 0 1-5.1-5.1l1.6-1.6"/>'),
    people: svg('<circle cx="9" cy="8.5" r="3"/><circle cx="17" cy="9.5" r="2.4"/>',
      '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16 14.6a4.5 4.5 0 0 1 4.5 4.4"/>'),
    user: svg('<circle cx="12" cy="8.5" r="3.6"/>', '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
    talk: svg('<path d="M5 5h14a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-7.5L7 19v-3.5H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
      '<path d="M5 5h14a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-7.5L7 19v-3.5H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8.5 9.2h7M8.5 12.2h4.5"/>'),
    shield: svg('<path d="' + SHIELD + '"/>', '<path d="' + SHIELD + '"/><path d="m9.2 12 2 2 3.8-3.9"/>'),
    warn: svg('<path d="M10.3 4.7a2 2 0 0 1 3.4 0l6.9 12.3a2 2 0 0 1-1.7 3H5.1a2 2 0 0 1-1.7-3z"/>',
      '<path d="M10.3 4.7a2 2 0 0 1 3.4 0l6.9 12.3a2 2 0 0 1-1.7 3H5.1a2 2 0 0 1-1.7-3z"/><path d="M12 9.8v3.8M12 16.6v.1"/>'),

    // ── 4. 때·일정 ──
    calendar: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/>', // 방문 계획·하루·근무일(«오늘» 탭 집과 나눔)
      '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.8h17M8 3v4M16 3v4"/><rect x="13.3" y="13.3" width="3.6" height="3.6" rx=".8" fill="currentColor" stroke="none"/>'),
    clock: svg('<circle cx="12" cy="12" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    hist: svg('<circle cx="12" cy="12" r="8.5"/>', '<path d="' + CCW + '"/><path d="M4.5 4v4h4M12 8v4l3 2"/>'),

    // ── 5. 문서·데이터 ──
    folder: svg('<path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4.6l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/>', // 문서함·가구별 기록
      '<path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4.6l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/><path d="M3.5 11h17"/>'),
    svc: svg('<rect x="3.8" y="4.5" width="4.4" height="4.4" rx="1"/><rect x="3.8" y="10" width="4.4" height="4.4" rx="1"/><rect x="3.8" y="15.5" width="4.4" height="4.4" rx="1"/>', // 받을 수 있는 서비스 = 고를 수 있는 목록
      '<rect x="3.8" y="4.5" width="4.4" height="4.4" rx="1"/><rect x="3.8" y="10" width="4.4" height="4.4" rx="1"/><rect x="3.8" y="15.5" width="4.4" height="4.4" rx="1"/><path d="m4.9 6.8 1 1 1.6-1.8M11.5 6.7h8.5M11.5 12.2h8.5M11.5 17.7h5.5"/>'),
    aichk: svg('<path d="M12.7 20.5H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5H14l4 4V11z"/>' + BADGE, // AI 문장 점검 = 문장 + 확인 배지
      '<path d="M12.7 20.5H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5H14l4 4V10M8.5 9h5M8.5 12.5h3.5"/>' + BADGE_OK),
    chart: svg('<rect x="5.5" y="13" width="3" height="7" rx="1"/><rect x="10.5" y="7" width="3" height="13" rx="1"/><rect x="15.5" y="10" width="3" height="10" rx="1"/>', // 읍면별 진도·남은 가구 막대
      '<rect x="5.5" y="13" width="3" height="7" rx="1"/><rect x="10.5" y="7" width="3" height="13" rx="1"/><rect x="15.5" y="10" width="3" height="10" rx="1"/><path d="M3.5 20.5h17"/>'),
    db: svg('<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/>',
      '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>'),
    upload: svg('<path d="M4.5 15h15v3.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z"/>',
      '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>'),
    down: svg('<path d="M4.5 15h15v3.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z"/>', // 받침을 upload 와 같은 상자로(옛: 선 한 줄)
      '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>'),
    copy: svg('<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="1.5"/>', '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="1.5"/><path d="M15.5 8.5V5.5A1.5 1.5 0 0 0 14 4H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/>'),
    print: svg('<rect x="6.5" y="13.5" width="11" height="7" rx="1"/>', '<path d="M7 9V3.5h10V9"/><path d="M6.5 17H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 17h-1.5"/><rect x="6.5" y="13.5" width="11" height="7" rx="1"/>'),
    send: svg('<path d="M20.5 3.5 3.5 10.6l7 2.9 2.9 7z"/>', '<path d="M20.5 3.5 3.5 10.6l7 2.9 2.9 7z"/><path d="m10.5 13.5 4.5-4.5"/>'),
    pen: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>', '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
    search: svg('<circle cx="10.5" cy="10.5" r="6.5"/>', '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>'),
    filter: svg('<path d="M4 5.5h16l-6 7.2v5.6l-4 1.7v-7.3z"/>', '<path d="M4 5.5h16l-6 7.2v5.6l-4 1.7v-7.3z"/>'),
    trash: svg('<path d="M6.5 6.5h11l-.9 12.6a1.5 1.5 0 0 1-1.5 1.4H8.9a1.5 1.5 0 0 1-1.5-1.4z"/>',
      '<path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7M6.5 6.5l.9 12.6a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12.6M10 10.5v6M14 10.5v6"/>'),

    // ── 6. 계정·기기·보안 ──
    lock: svg('<rect x="5" y="10.5" width="14" height="10" rx="2"/>',
      '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2.2"/>'),
    logout: svg('<path d="M5 6a1.5 1.5 0 0 1 1.5-1.5H10v15H6.5A1.5 1.5 0 0 1 5 18z"/>', // 로그아웃(옛: 자물쇠와 같은 모양)
      '<path d="M10 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H10M14.5 8l4 4-4 4M18.5 12h-9"/>'),
    key: svg('<circle cx="8" cy="15.5" r="3.8"/>', '<circle cx="8" cy="15.5" r="3.8"/><path d="M10.8 12.7 19.5 4M16.6 6.9l2.4 2.4M14.4 9.1l1.8 1.8"/>'),
    mail: svg('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/>', '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5"/>'),
    eye: svg('<path d="' + EYE + '"/>', '<path d="' + EYE + '"/><circle cx="12" cy="12" r="2.8"/>'), // 새: 뜬 눈 = 보기
    eyeOff: svg('<path d="' + EYE + '"/>', // 옛 «eye» = 화면 가림
      '<path d="M3 12s3.2-6 9-6c2 0 3.7.7 5 1.6M21 12s-3.2 6-9 6c-2 0-3.7-.7-5-1.6"/><path d="M4 20 20 4"/><path d="M9.5 13.5a3 3 0 0 1 4-4"/>'),
    device: svg(PHONE_BODY, PHONE_BODY + '<path d="M10.5 18.2h3"/>'),
    install: svg(PHONE_BODY, PHONE_BODY + '<path d="M12 7.2v7M9.2 11.4 12 14.2l2.8-2.8M10.5 18.2h3"/>'), // 홈 화면에 설치(옛: 올리기 화살표)
    pc: svg('<rect x="3" y="4.5" width="18" height="12" rx="1.5"/>', '<rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M9 20.5h6M12 16.5v4"/>'),
    expand: svg('<rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/>', // 전체화면(옛: 점 세 개)
      '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>'),
    moon: svg('<path d="M19.5 14.5A7.8 7.8 0 1 1 9.5 4.5a6.2 6.2 0 0 0 10 10z"/>', '<path d="M19.5 14.5A7.8 7.8 0 1 1 9.5 4.5a6.2 6.2 0 0 0 10 10z"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/>', '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v1.8M12 19.4v1.8M5.5 5.5l1.3 1.3M17.2 17.2l1.3 1.3M2.8 12h1.8M19.4 12h1.8M5.5 18.5l1.3-1.3M17.2 6.8l1.3-1.3"/>'),
    bell: svg('<path d="' + BELL + '"/>', '<path d="' + BELL + '"/><path d="M10 21a2.2 2.2 0 0 0 4 0"/>'),
    help: svg('<circle cx="12" cy="12" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4M12 16.6v.2"/>'),
    sig: svg("", '<path d="M4 18v-1M8 18v-3.5M12 18v-6"/><path d="M16 18V9M20 18V6" opacity=".3"/>'),
    coin: svg('<circle cx="12" cy="12" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5h4a1.8 1.8 0 0 1 0 3.6h-3a1.8 1.8 0 0 0 0 3.6h4M12 7.5v1.8M12 16.8v1.7"/>'),

    // ── 7. 조작(작은 글자 대신) ──
    check: svg("", '<path d="m5.5 12.5 4.2 4.2L18.5 8"/>'),
    checkC: svg('<circle cx="12" cy="12" r="8.5"/>', '<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.2 2.6 2.6 5-5.2"/>'), // 다 했음(✓ 글자 대신)
    x: svg("", '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    plus: svg("", '<path d="M12 5.5v13M5.5 12h13"/>'),
    chevL: svg("", '<path d="M14.5 6 8.5 12l6 6"/>'),
    chevR: svg("", '<path d="m9.5 6 6 6-6 6"/>'),
    chevU: svg("", '<path d="m6 14.5 6-6 6 6"/>'),
    chevD: svg("", '<path d="m6 9.5 6 6 6-6"/>'),
    arrow: svg("", '<path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5"/>'),
    arrowD: svg("", '<path d="M12 5v14M6.5 13.5 12 19l5.5-5.5"/>'),
    grip: svg("", dot(9, 7, 1.3) + dot(15, 7, 1.3) + dot(9, 12, 1.3) + dot(15, 12, 1.3) + dot(9, 17, 1.3) + dot(15, 17, 1.3)),
    sync: svg("", '<path d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9"/><path d="M18 3.5v4h-4M6 20.5v-4h4"/>'),
    reset: svg("", '<path d="' + CCW + '"/><path d="M4.5 4v4h4"/>' + dot(12, 12, 1.6)), // 시연 데이터 처음 상태로
    replay: svg('<path d="M10.4 9.1v5.8l4.6-2.9z"/>', '<path d="' + CCW + '"/><path d="M4.5 4v4h4M10.4 9.1v5.8l4.6-2.9z"/>') // 처음 안내 다시 보기
  };
  var A = { today: "calendar", team: "people", hh: "home2", visit: "route", rec: "record", rep: "report", mic: "record", done: "checkC" }; // 별칭
  Object.keys(A).forEach(function (k) { I[k] = I[A[k]]; });
  g.DaeumIcons = { I: I, svg: svg, alias: A, size: 24, stroke: 1.6, steps: { 16: 2, 20: 1.8, 24: 1.6, 28: 1.5, 40: 1.4 }, count: Object.keys(I).length - Object.keys(A).length };
})(typeof window !== "undefined" ? window : globalThis);
