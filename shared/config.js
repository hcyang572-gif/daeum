/* 닿음 설정 — 국민·공무원 창구 공통. 비밀값(API 키)은 절대 여기 두지 않는다(정적 배포라 누구나 보인다). */
window.DAEUM_CONFIG = {
  // Supabase Edge Function «daeum-ai» 주소(닿음 전용 프로젝트 daeum). 비우면 규칙 기반 시연 모드로 동작한다.
  // 허용 출처: github.io · localhost:8000 · 127.0.0.1:8000 (그 밖은 403 → 자동으로 규칙 모드)
  aiEndpoint: "https://gicjzrxgktpovnphtjhi.supabase.co/functions/v1/daeum-ai",
  // 함수는 --no-verify-jwt 로 배포돼 키 없이 부른다. 넣더라도 공개(anon) 키만. Claude API 키는 Edge Function 비밀에만 둔다.
  aiAnonKey: "",
  aiTimeoutMs: 15000,

  // 적용 예시 지역: 상주시 24개 읍면동(1읍 17면 6동). 가구는 모두 가상(실제 주민 아님). 두 창구의 읍면동 이름 정본은 이 목록 하나다.
  // 출처: 위키백과 «상주시» 행정 구역 표 · 도로명주소 목록(dorojuso.kr) 대조(2026-10-29).
  // data/households.json areas[].name(make_households.py SANGJU)과 같은 순서·이름이어야 한다 — 공무원 창구가 불일치를 콘솔에 경고한다.
  regionName: "상주시",
  regions: ["함창읍",
    "사벌국면", "중동면", "낙동면", "청리면", "공성면", "외남면", "내서면", "모동면", "모서면",
    "화동면", "화서면", "화북면", "외서면", "은척면", "공검면", "이안면", "화남면",
    "남원동", "북문동", "계림동", "동문동", "동성동", "신흥동"],

  // 국민 창구가 읽는 서비스 데이터(citizen/ 기준 상대경로). 앞에서부터 시도한다.
  serviceSources: ["data/services.json", "data/services.sample.json"],
  // .json 이 막힌 환경(행정망 등)에서 쓰는 짝 .js(window.__DAEUM_SERVICES__)
  serviceScriptFallback: "data/services.js",

  // 국민 «도움 요청» 저장소(localStorage 키). 형식은 shared/README.md
  requestsKey: "daeum.requests"
};
