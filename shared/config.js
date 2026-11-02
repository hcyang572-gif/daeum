/* 닿음 설정 — 국민·공무원 창구 공통. 비밀값(API 키)은 절대 여기 두지 않는다(정적 배포라 누구나 보인다). */
window.DAEUM_CONFIG = {
  // Supabase Edge Function «daeum-ai» 주소(닿음 전용 프로젝트 daeum). 비우면 규칙 기반 시연 모드로 동작한다.
  // 허용 출처: github.io · localhost:8000 · 127.0.0.1:8000 (그 밖은 403 → 자동으로 규칙 모드)
  aiEndpoint: "https://gicjzrxgktpovnphtjhi.supabase.co/functions/v1/daeum-ai",
  // 함수는 --no-verify-jwt 로 배포돼 키 없이 부른다. 넣더라도 공개(anon) 키만. Claude API 키는 Edge Function 비밀에만 둔다.
  aiAnonKey: "",
  aiTimeoutMs: 15000,

  // 네이버 지도(NCP Application «daeum», Web Dynamic Map) — Client ID 는 공개값(브라우저 지도 로딩용). 등록 Web URL: github.io · localhost
  // ⛔ Client Secret 은 여기 두지 않는다 — 도로 경로 서버 함수(daeum-route) 비밀(NCP_MAP_KEY)에만.
  naverMapKeyId: "7brwn3eeig",
  // 도로 경로(네이버 Directions 15) 서버 함수. 실패·한도·키 없음이면 화면이 직선거리 근사로 돌아간다.
  routeEndpoint: "https://gicjzrxgktpovnphtjhi.supabase.co/functions/v1/daeum-route",

  // 적용 예시 지역: 상주시 24개 읍면동(1읍 17면 6동). 가구는 모두 가상(실제 주민 아님). 두 창구의 읍면동 이름 정본은 이 목록 하나다.
  // 출처: 행정안전부 주민등록 인구통계 읍면동 목록(jumin.mois.go.kr, 2026-09) · 도로명주소 목록(dorojuso.kr) 대조(2026-10-29).
  // data/households.json areas[].name(make_households.py SANGJU)과 같은 순서·이름이어야 한다 — 공무원 창구가 불일치를 콘솔에 경고한다.
  regionName: "상주시",
  regions: ["함창읍",
    "사벌국면", "중동면", "낙동면", "청리면", "공성면", "외남면", "내서면", "모동면", "모서면",
    "화동면", "화서면", "화북면", "외서면", "은척면", "공검면", "이안면", "화남면",
    "남원동", "북문동", "계림동", "동문동", "동성동", "신흥동"],

  // 서비스 데이터(앱 뿌리 기준 상대경로 — S11-i 주민 화면 제거로 citizen/data → data 로 옮김). 앞에서부터 시도한다.
  serviceSources: ["data/services.json", "data/services.sample.json"],
  // .json 이 막힌 환경(행정망 등)에서 쓰는 짝 .js(window.__DAEUM_SERVICES__)
  serviceScriptFallback: "data/services.js",

  // S11-k PC↔폰 실시간 연동(방문 계획·방문 결과) — 닿음 전용 Supabase «daeum»(shared/sync.js 가 이 주소만 허용). 공개(publishable) 키만.
  //   표: db/migration_visit_sync.sql(visit_plan·visit_log, RLS 본인 행만). 로그인 전·서버 준비 전에는 이 기기에만 저장한다.
  syncUrl: "https://gicjzrxgktpovnphtjhi.supabase.co",
  syncKey: "sb_publishable_Gh5BZa8H-8YP4cLT3fW2-g_l0Bqn7ZR",

  // S11-c 주민 폰 → 공무원 화면 실시간 신호(닿음 전용 Supabase daeum, 표 daeum_signal — db/migration_signal.sql).
  // ⛔ S11-i(11-02 호창님 «주민용 화면 전면 제거»): 주민 화면이 없어져 이 신호 입구는 «쓰지 않음». 서버 함수·표는 지우지 않았다(되돌릴 수 있게).
  //    되살리려면 signalUrl 에 "https://gicjzrxgktpovnphtjhi.supabase.co" 를 다시 넣는다(공개용 키는 아래 그대로).
  //    지금 «실시간 신고»는 공무원이 전화·통장·이웃 방문으로 받은 신고를 공무원 화면에서 직접 «신고 접수»(이 기기 저장, 서버 전송 0).
  signalUrl: "",
  signalKey: "sb_publishable_Gh5BZa8H-8YP4cLT3fW2-g_l0Bqn7ZR",
  signalTable: "daeum_signal"
};
