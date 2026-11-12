/* 닿음 안내 부품(S10i, 🩵 미르 10-30) — 첫 방문 소개 4장 · 사용 방법 · 활용 데이터 표 · 출처 꼬리표 통일.
   각 화면에 이 한 줄만 둔다: <script src="../shared/guide.js"></script> (스타일 guide.css 는 스스로 붙인다)
   - 단추: [data-guide="intro|help|data"] 를 누르면 해당 대화상자. (S11-i: 주민 화면 제거 — 사용 방법은 공무원 화면 하나)
   - 출처 꼬리표: 화면의 .src-tag · .src-line · p.src, 그리고 «출처»로 시작하는 문단을 찾아
     «공공데이터»/«가상» 표식을 붙이고 «자료 표» 연결(→ 활용 데이터 해당 줄)을 단다. data-src-ref="D13,D12" 를 달면 그 줄로 바로 간다.
     화면이 다시 그려져도(MutationObserver) 같은 규칙을 다시 건다 — 각 창구 코드는 꼬리표 글만 쓰면 된다.
   - 첫 방문 소개는 한 번만(localStorage «daeum.intro.seen»). 자동 점검 브라우저(navigator.webdriver)·나란히 보기(iframe)에서는 띄우지 않는다(?intro=1 이면 띄움).
   - 데이터 표 정본: 01_리서치/S12-r_데이터활용_전수표.md(S12-r 11-12: 연계처 10종·자원정보·동기화·AI·카카오 추가, 달력 규격 줄 삭제) · 03_시제품/data/README.md. 숫자·기준일을 바꾸면 이 표도 함께 고친다. */
(function () {
  "use strict";
  var doc = document;
  var me = doc.currentScript;
  var SHARED = new URL(".", me ? me.src : location.href);
  var ROOT = new URL("../", SHARED);
  var DATA_URL = new URL("data.html", SHARED).href;
  var path = location.pathname;
  var SIDE = "officer";
  var ON_DATA_PAGE = /\/shared\/data\.html$/.test(path);

  (function css() {
    if (doc.querySelector('link[data-guide-css]')) return;
    var l = doc.createElement("link"); l.rel = "stylesheet"; l.href = new URL("guide.css", SHARED).href; l.setAttribute("data-guide-css", "");
    doc.head.appendChild(l);
  })();

  function u(p) { return new URL(p, ROOT).href; }

  /* S12-v U5: 연계처·좌표 숫자의 원천 = 데이터 파일 머리말(meta) 한 곳.
     data/public_extra.js(count·sources) + data/resources.js(total) + data/public_extra_geo.js(tried·ok·fail).
     파일을 안 불러온 화면(ai_check 등)은 아래 대체값을 쓰고, guide.test.js 가 대체값 = meta 를 확인한다(갈라지면 시험 실패). */
  var LINK_FALLBACK = { extra: 712, res: 23, total: 735, sources: 10, orgs: 7, geoTried: 708, geoOk: 692, geoFail: 16 };
  function links() {
    var X = window.__DAEUM_PUBLIC_EXTRA__, R = window.__DAEUM_RESOURCES__, Q = window.__DAEUM_PUBLIC_GEO__, o = {}, k;
    for (k in LINK_FALLBACK) o[k] = LINK_FALLBACK[k];
    if (X) {
      o.extra = X.count != null ? X.count : (X.items || []).length;
      if (X.sources) { var g = {}; X.sources.forEach(function (s) { g[String(s.name).split("_")[0]] = 1; }); o.sources = X.sources.length; o.orgs = Object.keys(g).length; }
    }
    if (R && R.total != null) o.res = R.total;
    if (Q && Q.tried != null) { o.geoTried = Q.tried; o.geoOk = Q.ok; o.geoFail = Q.fail; }
    o.total = o.extra + o.res;
    o.fromMeta = !!(X && R && Q);
    return o;
  }
  var LK = links();

  /* ── 활용 데이터 표(정본) ── kind: pub 공공데이터 · virt 가상(시연) · self 닿음 자체 · ref 참고 자료 */
  var DATA = [
    { id: "D1", kind: "pub", org: "한국사회보장정보원", name: "중앙부처복지서비스", no: "15090532", url: "https://www.data.go.kr/data/15090532/openapi.do",
      how: "OpenAPI · 받아서 저장(키는 화면에 두지 않음)", cycle: "필요할 때 다시 받음", base: "2026-11-02 조회",
      screens: [["공무원", "기록 › 연계 후보"], ["공무원", "AI 추천 검증"]],
      does: "상황에 맞는 국가 복지서비스 후보 · 대상·신청 방법" },
    { id: "D2", kind: "pub", org: "한국사회보장정보원", name: "지자체복지서비스", no: "15108347", url: "https://www.data.go.kr/data/15108347/openapi.do",
      how: "OpenAPI · 받아서 저장", cycle: "필요할 때 다시 받음", base: "2026-11-02 조회",
      screens: [["공무원", "기록 › 연계 후보"], ["공무원", "다른 시군 보기"]],
      does: "상주시(시군) 자체 사업 후보 · 시군별 서비스 수" },
    { id: "D5", kind: "pub", org: "한국사회보장정보원", name: "복지사업 시군구별 수급권자 현황", no: "15062448", url: "https://www.data.go.kr/data/15062448/fileData.do",
      how: "파일(CSV) · 상주시 행만 뽑음", cycle: "포털 갱신 때", base: "기준 2025-12",
      screens: [["공무원", "보고 › 연계가 멈춘 집"], ["공무원", "보고"], ["공무원", "다른 시군 보기"]],
      does: "기초생활·차상위·기초연금·장애인연금 수급 규모(실제 값)" },
    { id: "D12", kind: "pub", org: "행정안전부", name: "지역별(행정동) 성별 연령별 주민등록 인구수", no: "15097972", url: "https://www.data.go.kr/data/15097972/fileData.do",
      how: "파일(CSV) · 읍면동 24곳", cycle: "매월", base: "기준 2026-09-30",
      screens: [["공무원", "보고 › 읍면 지표"], ["공무원", "방문 전 카드"], ["공무원", "다른 시군 보기"]],
      does: "읍면동 65세 이상 비율 → 고독사 위험도(닿음 추정 지수)" },
    { id: "D13", kind: "pub", org: "행정안전부", name: "지역별(행정동) 세대원수별 주민등록 세대수", no: "15097974", url: "https://www.data.go.kr/data/15097974/fileData.do",
      how: "파일(CSV) · 읍면동 24곳", cycle: "매월", base: "기준 2026-09-30",
      screens: [["공무원", "보고 › 읍면 지표"], ["공무원", "방문 전 카드"], ["공무원", "다른 시군 보기"]],
      does: "읍면동 1인 세대 비율 → 고독사 위험도(닿음 추정 지수)" },
    { id: "M1", kind: "pub", org: "행정안전부", name: "주민등록 인구 및 세대현황(월간)", no: "", url: "https://jumin.mois.go.kr/statMonth.do",
      how: "통계 누리집 표 · 읍면동별 세대수", cycle: "매월", base: "2026-09",
      screens: [["공무원", "오늘 · 방문(가상 가구 배치)"], ["공무원", "도입 비용·탄소"]],
      does: "읍면동 이름·세대 비율로 가상 가구 300곳을 나눠 놓음 · 시 전체 세대수" },
    { id: "D11", kind: "pub", org: "기상청", name: "기상특보 조회서비스", no: "15000415", url: "https://www.data.go.kr/data/15000415/openapi.do",
      how: "OpenAPI 특보 코드 체계 · 시연은 저장된 시나리오", cycle: "실시간(운영 시)", base: "코드 3 한파 · 12 폭염",
      screens: [["공무원", "오늘 › 폭염·한파 신호"], ["공무원", "방문"]],
      does: "폭염·한파 특보 때 홀몸·고령 가구 방문 순서 조정 제안" },
    { id: "MED", kind: "pub", org: "국립중앙의료원", name: "전국 병·의원 찾기 서비스 · 전국 약국 정보 조회 서비스", no: "15000736·15000576", url: "https://www.data.go.kr/data/15000736/openapi.do",
      how: "OpenAPI · 받아서 저장(상주 190곳, 요양병원 제외)", cycle: "필요할 때 다시 받음", base: "2026-10-30 조회",
      screens: [["공무원", "방문 전 카드 › 가까운 병원·약국"]],
      does: "방문 시각에 문 연 곳 먼저 2~3곳 · 진료시간 · 전화" },
    { id: "D15", kind: "pub", org: "국토교통부", name: "건축HUB 건축물대장정보 서비스(표제부)", no: "15134735", url: "https://www.data.go.kr/data/15134735/openapi.do",
      how: "OpenAPI · 개발 PC에서 받아 읍면별 합계만 저장(건물 주소 저장 안 함)", cycle: "필요할 때 다시 받음(원본 월간)", base: "2026-10-30 조회",
      screens: [["공무원", "가구 명단 · 오늘 동선 › 오래된 집"], ["공무원", "방문 전 카드"]],
      does: "읍면별 30년 넘은 주택 비율(주거용 건물 동 수 기준) → 가상 가구에 «오래된 집» 시연 표식 · 난방·전기·누수 살피기" },
    { id: "P3", kind: "pub", org: "한국사회보장정보원", name: "자원정보서비스 현황", no: "15001839", url: "https://www.data.go.kr/data/15001839/openapi.do",
      how: "OpenAPI · 받아서 저장(상주시 23곳)", cycle: "필요할 때 다시 받음", base: "2026-11-03 조회",
      screens: [["공무원", "연계 카드"], ["공무원", "방문 전 카드"]],
      does: "상주시 민간 연계처(돌봄센터 등) — 같은 동네·가까운 순" },
    { id: "P11", kind: "pub", org: "보건복지부", name: "사회복지시설 정보", no: "15160109", url: "https://www.data.go.kr/data/15160109/fileData.do",
      how: "파일 · 상주 90곳만 뽑음", cycle: "포털 갱신 때", base: "기준 2026-03-18",
      screens: [["공무원", "연계 카드"]], does: "노인여가·복지시설 연계처" },
    { id: "P12", kind: "pub", org: "경상북도 상주시", name: "상주시 경로당 등록 현황", no: "15005238", url: "https://www.data.go.kr/data/15005238/fileData.do",
      how: "파일 · 581곳", cycle: "포털 갱신 때", base: "기준 2018-06-30(오래됨)",
      screens: [["공무원", "연계 카드"]], does: "마을 경로당 — 기준일이 오래돼 «방문 전 확인» 경고와 함께만 보임" },
    { id: "P13", kind: "pub", org: "경상북도 상주시", name: "상주시 장애인복지시설", no: "15005324", url: "https://www.data.go.kr/data/15005324/fileData.do",
      how: "파일 · 13곳", cycle: "포털 갱신 때", base: "기준 2024-09-05",
      screens: [["공무원", "연계 카드"]], does: "장애 가구 연계처" },
    { id: "P14", kind: "pub", org: "국립중앙의료원", name: "치매안심센터 정보 · 분소 정보", no: "15138421·15145246", url: "https://www.data.go.kr/data/15138421/fileData.do",
      how: "파일 · 센터 1 + 분소 2(함창·화서)", cycle: "포털 갱신 때", base: "기준 2026-10-27",
      screens: [["공무원", "연계 카드 › 치매"]], does: "인지저하가 의심되는 어르신 → 관할 센터·전화" },
    { id: "P16", kind: "pub", org: "한국보건의료정보원", name: "참여 정신건강복지센터 목록", no: "15167096", url: "https://www.data.go.kr/data/15167096/fileData.do",
      how: "파일 · 1곳", cycle: "포털 갱신 때", base: "기준 2026-09-21",
      screens: [["공무원", "연계 카드 › 마음건강"]], does: "우울·고립이 의심되는 가구 → 센터 연결" },
    { id: "P17", kind: "pub", org: "보건복지부", name: "노인돌봄서비스 기관 현황", no: "15004317", url: "https://www.data.go.kr/data/15004317/fileData.do",
      how: "파일 · 3곳", cycle: "포털 갱신 때", base: "기준 2024-04-23",
      screens: [["공무원", "연계 카드 › 돌봄"]], does: "홀로 사는 어르신 돌봄 수행기관" },
    { id: "P18", kind: "pub", org: "우정사업본부", name: "전국 우체국 현황", no: "15070368", url: "https://www.data.go.kr/data/15070368/fileData.do",
      how: "파일 · 상주 19곳", cycle: "포털 갱신 때", base: "기준 2026-08-31",
      screens: [["공무원", "연계 카드"]], does: "연락이 닿지 않는 가구 근처 읍면 거점" },
    { id: "P19", kind: "pub", org: "국민연금공단", name: "국민연금공단 지사 및 상담센터", no: "15010814", url: "https://www.data.go.kr/data/15010814/fileData.do",
      how: "파일 · 1곳", cycle: "포털 갱신 때", base: "기준 2026-08-01",
      screens: [["공무원", "연계 카드"]], does: "연금 상담 연계처" },
    { id: "P20", kind: "pub", org: "국민건강보험공단", name: "국민건강보험공단 본부 및 지사", no: "15142232", url: "https://www.data.go.kr/data/15142232/fileData.do",
      how: "파일 · 1곳", cycle: "포털 갱신 때", base: "기준 2025-02-24",
      screens: [["공무원", "연계 카드"]], does: "보험료 문의 연계처" },
    { id: "P22", kind: "pub", org: "국토교통부", name: "전국 법정동 코드", no: "15063424", url: "https://www.data.go.kr/data/15063424/fileData.do",
      how: "파일 · 상주 법정동·리 236개", cycle: "정적", base: "코드표",
      screens: [["공무원", "(화면 없음) 건축물대장 수집용"]], does: "건축물대장(D15)을 읍면별로 모으기 위한 코드표" },

    { id: "V1", kind: "virt", org: "닿음(시연)", name: "가상 가구 300곳 · 가상 발굴 명단", no: "", url: "",
      how: "생성기 data/tools/make_households.py(시드 고정)", cycle: "고정", base: "2026-10-29 생성",
      screens: [["공무원", "오늘 · 방문 · 다시 찾을 집 · 연계가 멈춘 집 · 가구 명단"]],
      does: "한국사회보장정보원 발굴 명단(행복이음 통보) 모양을 본뜬 시연 가구. 실제 주민·개인정보 0건. 위기정보(비공개·행정망)는 항목 구조만 본뜸" },
    { id: "V2", kind: "virt", org: "닿음(시연)", name: "가상 신호 시나리오", no: "", url: "",
      how: "손으로 쓴 파일 data/alerts_demo.json", cycle: "고정", base: "2026-10-30",
      screens: [["공무원", "오늘 › 무반응 신호 · 오늘 특보"]],
      does: "협약 기관(AI 스피커·IoT) 무반응 신호와 오늘 특보 상황(실제 신호 아님)" },
    { id: "V3", kind: "virt", org: "닿음(시연)", name: "지난 차수 기록 · 방문 결과·메모 예시", no: "", url: "",
      how: "시연 기본값", cycle: "고정", base: "—",
      screens: [["공무원", "보고 › 명단 정리"], ["공무원", "보고 › 연계가 멈춘 집"], ["공무원", "⑧ 보고서 › 방문 결과"]],
      does: "지난 차수 명단·비해당 사유·시연용 방문 결과와 메모(모두 가상)" },
    { id: "V4", kind: "virt", org: "닿음(시연)", name: "AI 추천 검증 사연 20건", no: "", url: "",
      how: "손으로 쓴 가상 사연", cycle: "고정", base: "2026-10-29",
      screens: [["공무원", "AI 추천 검증"]],
      does: "추천 정확도를 재는 시험 사연(실제 상담 아님)" },

    { id: "S1", kind: "self", org: "닿음", name: "AI 추천 검증 측정 결과", no: "", url: "",
      how: "자체 측정(D1·D2 목록 + 가상 사연 20건)", cycle: "다시 잴 때", base: "측정일은 화면 표기",
      screens: [["공무원", "AI 추천 검증"]], does: "추천 서비스가 사연에 맞는 비율" },
    { id: "S2", kind: "self", org: "이 기기", name: "담당자 표시 기록", no: "", url: "",
      how: "이 기기(브라우저)에만 저장", cycle: "누를 때마다", base: "—",
      screens: [["공무원", "추천 현장 적합률"], ["공무원", "다시 찾을 집 · 기록"]], does: "담당자가 남긴 시도·연계·적합 표시를 모아 셈" },

    { id: "U1", kind: "svc", org: "한국사회보장정보원(행복이음 통보)", name: "복지사각지대 발굴대상자 명단(엑셀·CSV) 올리기", no: "", url: "",
      how: "담당자가 내려받아 올림 · 이 브라우저 안에서만 읽음(성명·주민번호·전화는 읽지 않음)", cycle: "차수마다", base: "시연은 가상 9가구 파일",
      screens: [["공무원", "명단 불러오기 → 오늘 · 방문"]], does: "명단의 가구·위기 신호를 오늘 방문 순서로 정리" },
    { id: "N1", kind: "svc", live: true, org: "네이버클라우드플랫폼", name: "Maps Directions 15(도로 경로)", no: "", url: "https://www.ncloud.com/product/applicationService/maps",
      how: "서버 함수가 대신 호출(비밀 키 비노출) · 결과는 저장하지 않음", cycle: "누를 때마다", base: "실패하면 직선거리×1.3 «약»",
      screens: [["공무원", "방문 › 도로 기준 순서"]], does: "도로 거리·시간으로 방문 순서 후보 비교" },
    { id: "N2", kind: "svc", live: true, org: "네이버클라우드플랫폼", name: "Maps Web Dynamic Map(웹 지도)", no: "", url: "https://www.ncloud.com/product/applicationService/maps",
      how: "화면을 열 때 지도를 불러옴 · 길찾기 앱으로 이어 줌", cycle: "열 때마다", base: "—",
      screens: [["공무원", "방문 › 지도"]], does: "지도 위 방문 가구·동선" },
    { id: "L1", kind: "svc", live: true, org: "닿음 전용 서버(Supabase)", name: "PC ↔ 폰 실시간 동기화", no: "", url: "",
      how: "같은 공무원 계정의 PC·폰이 방문 계획·결과의 변화를 구독", cycle: "바뀌는 즉시", base: "상주 정책플랫폼과 분리된 서버",
      screens: [["공무원", "오늘 · 방문 · 기록(PC·폰 공통)"]], does: "사무실 PC에서 짠 계획이 폰에, 현장 기록이 PC에 곧바로" },
    { id: "L4", kind: "svc", live: true, org: "Anthropic Claude(닿음 서버 경유)", name: "AI 상담 정리 · 연계 후보 추천", no: "", url: "",
      how: "보내기 전 이름·전화·주민번호를 가림 · 추천은 D1·D2 목록에 있는 것만", cycle: "요청할 때", base: "실패하면 규칙 모드",
      screens: [["공무원", "기록 › 자동 정리"], ["공무원", "AI 추천 검증"]], does: "상담 내용을 기록 문장으로 · 맞는 복지서비스 후보" },
    { id: "K1", kind: "svc", org: "행정안전부", name: "주소정보누리집 좌표제공 API(주소 → 건물 출입구 좌표)", no: "", url: "https://business.juso.go.kr/addrlink/openApi/apiExprn.do",
      how: "한 번 변환해 저장(화면에서는 부르지 않음) · " + LK.geoTried + "건 중 " + LK.geoOk + " 성공(못 찾은 " + LK.geoFail + "곳은 2018 경로당)", cycle: "정적", base: "2026-11-12 변환",
      screens: [["공무원", "연계 카드 › 가까운 순"]], does: "연계처 주소에 좌표를 붙여 가구에서 가까운 순으로" },

    { id: "R1", kind: "ref", org: "한국석유관리원·충북대", name: "한국유화학회지 2016(33권 4호) 휘발유 CO₂ 계수", no: "", url: "",
      how: "논문 값 2.174 kgCO₂/L", cycle: "—", base: "2016", screens: [["공무원", "도입 비용·탄소"]], does: "이동 거리 감소 → CO₂ 감소 추정" },
    { id: "R2", kind: "ref", org: "Anthropic · 한국자금중개", name: "AI 가격표 · 매매기준율", no: "", url: "",
      how: "누리집 확인", cycle: "—", base: "2026-10-29 · 2026-10-28", screens: [["공무원", "도입 비용·탄소"]], does: "AI 월 비용 추정(원화)" },
    { id: "R4", kind: "ref", org: "서울 강남구", name: "«3회 방문 뒤 간접조사» 공개 사례", no: "", url: "",
      how: "공개 누리집(gangnam.go.kr)", cycle: "—", base: "—", screens: [["공무원", "보고 › 다시 찾을 집"]], does: "3번째 허탕 뒤 이웃·통반장 확인 순서" },
    { id: "R5", kind: "ref", org: "나라살림연구소", name: "차수마다 같은 사람이 다시 오른다는 현장 지적", no: "", url: "",
      how: "공개 보고", cycle: "—", base: "2024-03-25", screens: [["공무원", "보고 › 명단 정리"]], does: "지난 차수 비해당 집 표시의 근거" },
    { id: "R6", kind: "ref", org: "보건복지부", name: "복지 사각지대 발굴 차수 일정(정책브리핑 보도)", no: "", url: "https://www.korea.kr/news/policyNewsView.do?newsId=148973765",
      how: "보도 자료", cycle: "차수마다", base: "2026-10-19", screens: [["공무원", "보고 › 마감 역산"]], does: "이번 차수 기간·마감까지 남은 날" },

    { id: "F1", kind: "pub", plan: true, org: "기상청", name: "단기예보 · 초단기실황", no: "15084084", url: "https://www.data.go.kr/data/15084084/openapi.do",
      how: "OpenAPI · 서버 함수 또는 주기 저장(키 비노출)", cycle: "시간 단위", base: "개발 중",
      screens: [["공무원", "화면 위 날씨 띠 · 방문 안전 한 줄"]], does: "방문 가구 읍면동의 기온·하늘·강수" },
    { id: "F2", kind: "svc", plan: true, org: "네이버클라우드플랫폼 지도 + 위 연계처 좌표", name: "지도 «주변 정보» 겹층", no: "", url: "",
      how: "새 데이터 아님 — 연계처·경로당 좌표를 지도 층으로", cycle: "정적", base: "개발 중",
      screens: [["공무원", "방문 › 지도"]], does: "오늘 방문 가구 곁 연계처·경로당을 켜고 끄기" },
    { id: "F3", kind: "pub", plan: true, org: "국립중앙의료원", name: "AED(자동심장충격기) 위치", no: "15000652", url: "https://www.data.go.kr/data/15000652/openapi.do",
      how: "OpenAPI · 활용신청 중", cycle: "수시", base: "승인 뒤 추가",
      screens: [["공무원", "문 앞 안전 카드 · 지도 층"]], does: "방문 가구에서 가장 가까운 AED" },
    { id: "F4", kind: "pub", plan: true, org: "국민건강보험공단", name: "장기요양기관 검색", no: "15059029", url: "https://www.data.go.kr/data/15059029/openapi.do",
      how: "OpenAPI · 활용신청 중", cycle: "수시", base: "승인 뒤 추가",
      screens: [["공무원", "연계 카드 · 지도 층"]], does: "장기요양 연계처" }
  ];
  var BY = {}; DATA.forEach(function (d) { BY[d.id] = d; });
  var KIND = { pub: "공공데이터", svc: "업무 연결 — 명단 올리기·지도·길찾기·동기화·AI", virt: "가상 데이터(시연)", self: "닿음 자체 측정·기록", ref: "참고 자료", plan: "예정 — 개발·활용신청 중" };
  /* S12-r: 셈 — 공공데이터포털 번호 수(예정 제외) · 실시간 줄 · 예정 줄. data.html 흐름 그림 범례도 이 값을 쓴다 */
  function counts() {
    var nos = {}; DATA.forEach(function (d) { if (d.kind === "pub" && !d.plan && d.no) d.no.split("·").forEach(function (x) { nos[x.trim()] = 1; }); });
    return { portal: Object.keys(nos).length, live: DATA.filter(function (d) { return d.live; }).length, plan: DATA.filter(function (d) { return d.plan; }).length,
      virt: DATA.filter(function (d) { return d.kind === "virt"; }).length };
  }

  /* 출처 글 → 데이터 줄 추정(구체적인 것 먼저) */
  var RULES = [
    [/15062448|수급권자 현황/, "D5"], [/15097974|세대원수별/, "D13"], [/15097972|성별 연령별/, "D12"],
    [/주민등록 인구·세대 통계/, "D13"], [/행정안전부 주민등록 세대수|주민등록 인구통계|주민등록 인구 및 세대/, "M1"],
    [/15000415|기상특보|특보 코드/, "D11"], [/15000576|15000736|국립중앙의료원/, "MED"], [/15134735|건축HUB|건축물대장/, "D15"],
    [/15108347|지자체복지서비스/, "D2"], [/15090532|중앙부처복지서비스/, "D1"], [/서비스 목록/, "D1"],
    [/Directions|도로 경로/, "N1"], [/Web Dynamic Map|네이버 지도/, "N2"], [/네이버/, "N1"], [/실시간 동기화/, "L1"], [/주소정보누리집/, "K1"], [/15001839|자원정보/, "P3"],
    [/15160109|사회복지시설 정보/, "P11"], [/15005238|경로당/, "P12"], [/15005324|장애인복지시설/, "P13"], [/15138421|15145246|치매안심센터/, "P14"], [/15167096|정신건강복지센터/, "P16"],
    [/15004317|노인돌봄서비스 기관/, "P17"], [/15070368|우체국/, "P18"], [/15010814|국민연금공단/, "P19"], [/15142232|건강보험공단/, "P20"], [/15063424|법정동 코드/, "P22"],
    [/15084084|단기예보|초단기실황/, "F1"], [/15000652|AED/, "F3"], [/15059029|장기요양기관/, "F4"], [/AI 스피커|무반응|협약 기관|가상 신호/, "V2"], [/지난 차수|동네 미신청/, "V3"], [/가상 사연/, "V4"],
    [/발굴 명단|가상 가구|가구 수는 가상|명단은 가상|가상 명단|가구는 가상/, "V1"],
    [/자체 측정/, "S1"], [/담당자 표시 기록|담당자 기록/, "S2"],
    [/석유관리원|kgCO/, "R1"], [/Anthropic|매매기준율/, "R2"], [/강남구/, "R4"], [/나라살림/, "R5"],
    [/보건복지부 2026-10-19|정책브리핑/, "R6"], [/bokjiro\.go\.kr/, "D1"]
  ];
  function infer(text) {
    var ids = [];
    RULES.forEach(function (r) { if (r[0].test(text) && ids.indexOf(r[1]) < 0) ids.push(r[1]); });
    return ids;
  }

  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 막힘 */ } }

  /* ── 출처 꼬리표 ── */
  var SRC_SEL = ".src-tag, .src-line, .src, [data-src-ref]";
  function isSrcText(t) { return /^\s*출처\s*[:：]/.test(t); }
  function hasTag(node, re) { return [].some.call(node.querySelectorAll(".d-tag, .tag"), function (x) { return re.test(x.textContent); }); }
  function decorate(node) {
    if (node.closest(".dg-skip, #dgData, #dgHelp, #dgIntro, .sw-bar, script, style")) return;
    if (node.getAttribute("data-src-done") === "1" && node.querySelector(".src-go")) return;
    var text = node.textContent || "";
    var ids = node.getAttribute("data-src-ref") ? node.getAttribute("data-src-ref").split(/\s*,\s*/) : infer(text);
    ids = ids.filter(function (i) { return BY[i]; });
    node.setAttribute("data-src-done", "1");
    if (!ids.length) return;
    node.classList.add("dg-src");
    var pub = ids.some(function (i) { return BY[i].kind === "pub"; });
    var virt = ids.some(function (i) { return BY[i].kind === "virt"; }) || /가상/.test(text);
    var first = node.firstChild;
    if (virt && !hasTag(node, /가상/)) node.insertBefore(el("span", "d-tag virt", "가상"), first);
    if (pub && !hasTag(node, /공공데이터/)) node.insertBefore(el("span", "d-tag pub", "공공데이터"), node.firstChild);
    var a = el("a", "src-go", "자료 표");
    a.href = DATA_URL + "#" + ids[0];
    a.setAttribute("data-src-ids", ids.join(","));
    a.setAttribute("aria-label", "활용 데이터 표에서 이 출처 보기 — " + ids.map(function (i) { return BY[i].name; }).join(", "));
    node.appendChild(a);
  }
  function scan(root) {
    root = root || doc.body; if (!root || !root.querySelectorAll) return;
    [].forEach.call(root.querySelectorAll(SRC_SEL), decorate);
    [].forEach.call(root.querySelectorAll("p, small"), function (p) {
      if (p.matches(SRC_SEL) || p.closest(SRC_SEL)) return;
      if (isSrcText(p.textContent || "")) decorate(p);
    });
  }
  var pending = 0;
  function later() { if (pending) return; pending = setTimeout(function () { pending = 0; scan(); }, 120); }

  /* ── 대화상자 공통 ── */
  var X = '<svg class="d-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  function dialog(id, title, wide) {
    var d = doc.getElementById(id); if (d) return d;
    d = el("dialog", "d-sheet dg" + (wide ? " dg-wide" : "")); d.id = id; d.setAttribute("aria-labelledby", id + "H");
    var hd = el("div", "sh-h"); var h = el("h2", null, title); h.id = id + "H"; hd.appendChild(h);
    var c = el("button", "d-round"); c.type = "button"; c.setAttribute("data-close", ""); c.setAttribute("aria-label", "닫기"); c.innerHTML = X; hd.appendChild(c);
    d.appendChild(hd); d.appendChild(el("div", "dg-body"));
    doc.body.appendChild(d); return d;
  }
  function open(d) { if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute("open", ""); }

  /* ── 그림(SVG) — 화면 축소 그림 · 소개 그림. 색은 guide.css 클래스(토큰)로만 ── */
  function svg(vb, inner, label) { return '<svg class="dg-pic" viewBox="' + vb + '" role="img" aria-label="' + label + '">' + inner + "</svg>"; }
  function frame(body) { return '<rect class="f0" x="1" y="1" width="62" height="86" rx="10"/><rect class="f1" x="7" y="9" width="30" height="5" rx="2.5"/>' + body; }
  var MINI = {
    today: '<rect class="f2" x="7" y="19" width="50" height="30" rx="6"/><path class="ln" d="M14 41l9-9 8 5 9-11 9 6"/><circle class="dt" cx="14" cy="41" r="2.4"/><circle class="dt" cx="49" cy="32" r="2.4"/><rect class="f2" x="7" y="53" width="24" height="26" rx="6"/><rect class="f2" x="33" y="53" width="24" height="26" rx="6"/><rect class="f3" x="11" y="58" width="10" height="4" rx="2"/><rect class="f3" x="37" y="58" width="10" height="4" rx="2"/>',
    route: '<path class="ln" d="M14 22v52"/><circle class="dt" cx="14" cy="24" r="3"/><circle class="dt" cx="14" cy="42" r="3"/><circle class="dt" cx="14" cy="60" r="3"/><circle class="dt" cx="14" cy="76" r="3"/><rect class="f2" x="22" y="20" width="35" height="8" rx="4"/><rect class="f2" x="22" y="38" width="35" height="8" rx="4"/><rect class="f2" x="22" y="56" width="35" height="8" rx="4"/><rect class="f2" x="22" y="72" width="28" height="8" rx="4"/>',
    contacts: '<path class="ln" d="M44 34a13 13 0 1 1-4-9.4"/><path class="ln" d="M44 20v7h-7"/><rect class="f2" x="7" y="56" width="50" height="9" rx="4.5"/><rect class="f2" x="7" y="69" width="50" height="9" rx="4.5"/><rect class="f3" x="11" y="59" width="14" height="3" rx="1.5"/><rect class="f3" x="11" y="72" width="20" height="3" rx="1.5"/>',
    board: '<rect class="f2" x="7" y="20" width="50" height="12" rx="6"/><rect class="f3" x="9" y="23" width="12" height="6" rx="3"/><rect class="f3" x="22" y="23" width="12" height="6" rx="3"/><rect class="hl" x="35" y="23" width="12" height="6" rx="3"/><rect class="f2" x="7" y="38" width="50" height="40" rx="6"/><rect class="f3" x="12" y="45" width="34" height="5" rx="2.5"/><rect class="f3" x="12" y="55" width="24" height="5" rx="2.5"/><rect class="f3" x="12" y="65" width="16" height="5" rx="2.5"/>',
    report: '<rect class="f2" x="7" y="20" width="23" height="16" rx="5"/><rect class="f2" x="34" y="20" width="23" height="16" rx="5"/><rect class="f2" x="7" y="40" width="50" height="38" rx="6"/><rect class="hl" x="14" y="62" width="6" height="10" rx="1.5"/><rect class="hl" x="24" y="54" width="6" height="18" rx="1.5"/><rect class="hl" x="34" y="58" width="6" height="14" rx="1.5"/><rect class="hl" x="44" y="48" width="6" height="24" rx="1.5"/>',
    intake: '<rect class="f2" x="7" y="20" width="50" height="22" rx="6"/><rect class="f3" x="11" y="25" width="30" height="3" rx="1.5"/><rect class="f3" x="11" y="31" width="22" height="3" rx="1.5"/><rect class="f2" x="7" y="47" width="50" height="9" rx="4.5"/><rect class="hl" x="44" y="49" width="10" height="5" rx="2.5"/><rect class="f2" x="7" y="60" width="50" height="9" rx="4.5"/><rect class="f2" x="7" y="73" width="50" height="9" rx="4.5"/><rect class="hl" x="44" y="75" width="10" height="5" rx="2.5"/>',
    list: '<rect class="f2" x="7" y="20" width="50" height="8" rx="4"/><rect class="f2" x="7" y="32" width="50" height="8" rx="4"/><rect class="f2" x="7" y="44" width="50" height="8" rx="4"/><rect class="f2" x="7" y="56" width="50" height="8" rx="4"/><rect class="f2" x="7" y="68" width="50" height="8" rx="4"/><rect class="hl" x="47" y="22" width="7" height="4" rx="2"/><rect class="hl" x="47" y="34" width="7" height="4" rx="2"/>',
    record: '<rect class="f2" x="7" y="20" width="50" height="28" rx="6"/><rect class="f3" x="11" y="25" width="38" height="3" rx="1.5"/><rect class="f3" x="11" y="31" width="32" height="3" rx="1.5"/><rect class="f3" x="11" y="37" width="36" height="3" rx="1.5"/><rect class="f2" x="7" y="52" width="50" height="26" rx="6"/><path class="ln" d="M14 60h20M14 66h28M14 72h14"/>',
    ask: '<circle class="hl" cx="32" cy="38" r="13"/><rect class="f0w" x="29" y="30" width="6" height="11" rx="3"/><rect class="f2" x="7" y="58" width="50" height="9" rx="4.5"/><rect class="f2" x="7" y="71" width="50" height="9" rx="4.5"/>',
    progress: '<rect class="f2" x="7" y="20" width="50" height="58" rx="6"/><circle class="dt" cx="16" cy="32" r="3"/><circle class="dt" cx="16" cy="48" r="3"/><circle class="f3c" cx="16" cy="64" r="3"/><path class="ln" d="M16 35v10M16 51v10"/><rect class="f3" x="24" y="30" width="26" height="4" rx="2"/><rect class="f3" x="24" y="46" width="22" height="4" rx="2"/><rect class="f3" x="24" y="62" width="18" height="4" rx="2"/>',
    find: '<circle class="ln" cx="28" cy="36" r="10"/><path class="ln" d="M35 43l9 9"/><rect class="f2" x="7" y="60" width="50" height="8" rx="4"/><rect class="f2" x="7" y="72" width="50" height="8" rx="4"/>'
  };
  function mini(k, label) { return svg("0 0 64 88", frame(MINI[k] || ""), label + " 화면 그림"); }

  /* ── 사용 방법 ── */
  var HELP = {
    officer: [
      ["s1", "① 명단 불러오기", "officer/index.html#s1", "행복이음에서 내보낸 «발굴대상자 조회» 엑셀 · 열 자동 맞춤 · 개인정보 열은 읽지 않음 · 지난 차수와 견주기"],
      ["s2", "② 전체 명단·기한", "officer/index.html#s2", "확인 기한(근무일) → 하루 몇 집·며칠 · 새로·계속·빠짐"],
      ["s3", "③ 우선순위 근거", "officer/index.html#s3", "한국사회보장정보원 순위 → 방문 순서 · 현장 사정 4가지만큼(최대 7칸) 앞당김"],
      ["s4", "④ 일차별 방문", "officer/index.html#s4", "하루 상한씩 묶은 동선·시간줄·지도 · 확정하면 같은 계정 폰에 바로"],
      ["s5", "⑤ 집 앞 30초 요약(폰)", "officer/index.html#s5", "문 두드리기 전 수치 3칸·세 줄 요약·주의할 점·지난번 약속·꼭 물을 것"],
      ["s6", "⑥ 동선·길안내(폰)", "officer/index.html#s6", "다음 집·하루 진행 · 네이버 지도 길안내(이름·주소 대신 «방문 N»)"],
      ["s7", "⑦ 확인·메모(폰)", "officer/index.html#s7", "만남·부재·거절 · 메모에서 약속·어려움 찾기 · 부재 3회째 간접 확인"],
      ["s8", "⑧ 보고서", "officer/index.html#s8", "폰 메모가 들어온 결과 보고서 초안 · 한글(hwpx) · 행복이음 입력 초안 · 연계 의뢰서"],
      ["s9", "⑨ 사후관리", "officer/index.html#s9", "1·3·6개월 재확인·약속·다시 갈 집을 달력 한 장에"]
    ]
  };
  function renderHelp(box) {
    // S11-i(11-02): 주민 화면 제거 — 공무원 화면 하나만 보여 준다
    box.innerHTML = "";
    var ul = el("ul", "dg-help"); ul.setAttribute("aria-label", "공무원 화면");
    HELP.officer.forEach(function (it) {
      var li = el("li"); var a = el("a", "dg-hi"); a.href = u(it[2]);
      a.innerHTML = mini(it[0], it[1]);
      var t = el("span"); t.appendChild(el("b", null, it[1])); t.appendChild(el("small", null, it[3])); a.appendChild(t);
      li.appendChild(a); ul.appendChild(li);
    });
    box.appendChild(ul);
    var foot = el("p", "dg-foot");
    var b1 = el("button", "d-btn d-btn-s", "소개 다시 보기"); b1.type = "button"; b1.setAttribute("data-guide", "intro");
    var b2 = el("button", "d-btn d-btn-s", "활용 데이터"); b2.type = "button"; b2.setAttribute("data-guide", "data");
    foot.appendChild(b1); foot.appendChild(b2); box.appendChild(foot);
  }

  /* ── 활용 데이터 표 ── */
  function renderData(box, hitIds) {
    box.innerHTML = "";
    var n = counts();
    var sum = el("div", "dg-sum");
    sum.innerHTML = '<span class="dg-k"><b class="num">' + n.portal + '</b>종</span><span class="d-tag pub">공공데이터</span>' +
      '<span class="dg-k"><b class="num">' + n.live + '</b>건</span><span class="d-tag live">실시간</span>' +
      '<span class="dg-k"><b class="num">' + n.virt + '</b>종</span><span class="d-tag virt">가상</span>' +
      '<span class="dg-k"><b class="num">' + n.plan + '</b>건</span><span class="d-tag plan">예정</span>' +
      '<span class="dg-note">실제 주민·개인정보 0건</span>';
    box.appendChild(sum);
    ["pub", "svc", "virt", "self", "ref", "plan"].forEach(function (k) {
      var rows = DATA.filter(function (d) { return k === "plan" ? d.plan : (d.kind === k && !d.plan); }); if (!rows.length) return;
      var sec = el("section", "dg-sec"); var h = el("h3", null, KIND[k]); sec.appendChild(h);
      var tb = el("table", "dg-tbl"); var cap = el("caption", "sr", KIND[k] + " 목록"); tb.appendChild(cap);
      var th = el("thead"); var tr = el("tr");
      ["제공기관 · 데이터", "받는 방식 · 갱신", "쓰는 화면", "하는 일"].forEach(function (c) { var x = el("th", null, c); x.scope = "col"; tr.appendChild(x); });
      th.appendChild(tr); tb.appendChild(th);
      var bd = el("tbody");
      rows.forEach(function (d) {
        var r = el("tr"); r.id = "src-" + d.id; r.setAttribute("data-id", d.id); r.tabIndex = -1;
        var c1 = el("td"); c1.setAttribute("data-l", "데이터");
        c1.appendChild(el("span", "dg-org", d.org));
        if (d.live) c1.appendChild(el("span", "d-tag live", "실시간")); else if (d.plan) c1.appendChild(el("span", "d-tag plan", "예정"));
        c1.appendChild(el("b", "dg-nm", d.name));
        c1.appendChild(el("span", "dg-no", (d.no ? "공공데이터포털 " + d.no + " · " : "") + d.base));
        var c2 = el("td", null, d.how + " · " + d.cycle); c2.setAttribute("data-l", "받는 방식");
        var c3 = el("td"); c3.setAttribute("data-l", "쓰는 화면");
        d.screens.forEach(function (s) { var x = el("span", "dg-scr"); x.appendChild(el("i", null, s[0])); x.appendChild(doc.createTextNode(s[1])); c3.appendChild(x); });
        var c4 = el("td", null, d.does); c4.setAttribute("data-l", "하는 일");
        [c1, c2, c3, c4].forEach(function (c) { r.appendChild(c); }); bd.appendChild(r);
      });
      tb.appendChild(bd); sec.appendChild(tb); box.appendChild(sec);
    });
    box.appendChild(el("p", "dg-foot2", "공공데이터 이용허락: 행정안전부·한국사회보장정보원 파일은 이용허락 제한 없음, 기상청·병원·약국 OpenAPI는 출처표시(제1유형) — 각 화면 «출처» 꼬리표로 표시. «실시간»은 누르거나 바뀔 때마다 그 순간의 값을 받는 것, 나머지는 받아 저장한 자료(기준일 표기). 정본: 01_리서치/S12-r_데이터활용_전수표.md"));
    hit(box, hitIds);
  }
  function hit(box, ids) {
    [].forEach.call(box.querySelectorAll("tr.dg-hit"), function (r) { r.classList.remove("dg-hit"); });
    if (!ids || !ids.length) return;
    var first = null;
    ids.forEach(function (i) { var r = box.querySelector('tr[data-id="' + i + '"]'); if (r) { r.classList.add("dg-hit"); first = first || r; } });
    if (first) setTimeout(function () { try { first.scrollIntoView({ block: "center" }); first.focus({ preventScroll: true }); } catch (e) { first.scrollIntoView(); } }, 60);
  }

  /* ── 첫 방문 소개 4장 ── */
  var SLIDES = [
    { h: "복지 사각지대 현장 업무 도우미", p: "명단은 한국사회보장정보원이, 기록은 행복이음이. 그 사이 현장 업무(오늘·방문·기록·보고)는 닿음이.",
      pic: '<rect class="f2" x="6" y="34" width="62" height="40" rx="12"/><rect class="f3" x="16" y="46" width="34" height="5" rx="2.5"/><rect class="f3" x="16" y="56" width="26" height="5" rx="2.5"/>' +
        '<rect class="en" x="98" y="20" width="84" height="68" rx="16"/><circle class="w" cx="122" cy="46" r="5"/><circle class="w2" cx="140" cy="46" r="5"/><rect class="w2" x="114" y="62" width="52" height="6" rx="3"/>' +
        '<rect class="f2" x="212" y="34" width="62" height="40" rx="12"/><path class="ln" d="M224 48h38M224 58h28M224 66h20"/>' +
        '<path class="ln ar" d="M72 54h20M188 54h20"/><path class="ln" d="M87 49l5 5-5 5M203 49l5 5-5 5"/>' +
        '<text class="tx" x="37" y="92" text-anchor="middle">발굴 명단</text><text class="tx b" x="140" y="104" text-anchor="middle">닿음</text><text class="tx" x="243" y="92" text-anchor="middle">행복이음 기록</text>',
      label: "한국사회보장정보원 발굴 명단에서 닿음을 거쳐 행복이음 기록으로" },
    { h: "공무원의 하루", p: "오늘 방문할 집 확인 → 방문 → 상담 기록(AI 초안·확정) → 보고서. 다시 찾을 집·명단 정리는 «더 보기»에.",
      pic: (function () {
        var s = '<path class="ln" d="M40 56h200"/>', xs = [40, 107, 173, 240], t = ["명단", "계획", "현장", "보고"], w = ["사무실", "사무실", "폰", "사무실"];
        xs.forEach(function (x, i) { s += '<circle class="' + (i === 0 ? "en" : "dt") + '" cx="' + x + '" cy="56" r="' + (i === 0 ? 11 : 8) + '"/><text class="tx" x="' + x + '" y="32" text-anchor="middle">' + w[i] + '</text><text class="tx b" x="' + x + '" y="88" text-anchor="middle">' + t[i] + "</text>"; });
        return s;
      })(), label: "명단·계획·현장·보고 — 명단을 받은 날부터 사후관리까지" },
    { h: "공공데이터 + 가상 가구", p: "숫자·지도·추천 옆 «출처» 꼬리표 → 활용 데이터 표의 해당 줄.",
      pic: '<rect class="f2" x="24" y="22" width="232" height="72" rx="14"/><rect class="f3" x="40" y="38" width="96" height="7" rx="3.5"/><rect class="f3" x="40" y="52" width="70" height="7" rx="3.5"/>' +
        '<rect class="pb" x="40" y="70" width="64" height="14" rx="7"/><text class="tx pt" x="72" y="80.5" text-anchor="middle">공공데이터</text>' +
        '<rect class="vb" x="110" y="70" width="40" height="14" rx="7"/><text class="tx vt" x="130" y="80.5" text-anchor="middle">가상</text>' +
        '<rect class="hl" x="176" y="36" width="12" height="44" rx="3"/><rect class="hl" x="196" y="50" width="12" height="30" rx="3"/><rect class="hl" x="216" y="44" width="12" height="36" rx="3"/>',
      label: "공공데이터와 가상 표식이 붙은 숫자 카드", last: true }
  ];
  function renderIntro(d) {
    var box = d.querySelector(".dg-body"); box.innerHTML = "";
    var i = 0;
    var stage = el("div", "dg-stage"); stage.setAttribute("aria-live", "polite");
    var dots = el("div", "dg-dots"); dots.setAttribute("aria-hidden", "true");
    SLIDES.forEach(function () { dots.appendChild(el("i")); });
    var nav = el("div", "dg-nav");
    var prev = el("button", "d-btn d-btn-s", "이전"); prev.type = "button"; prev.setAttribute("data-h", "light");
    var next = el("button", "d-btn d-btn-p", "다음"); next.type = "button"; next.setAttribute("data-h", "light");
    nav.appendChild(prev); nav.appendChild(next);
    box.appendChild(stage); box.appendChild(dots); box.appendChild(nav);
    function draw() {
      var s = SLIDES[i];
      stage.innerHTML = "";
      var c = el("div", "dg-slide");
      c.innerHTML = svg("0 0 280 116", s.pic, s.label);
      c.appendChild(el("p", "cnum", (i + 1) + " / " + SLIDES.length));
      c.appendChild(el("h3", null, s.h)); c.appendChild(el("p", "dg-p", s.p));
      if (s.last) {
        var row = el("p", "dg-row");
        var b1 = el("button", "d-btn d-btn-s", "사용 방법"); b1.type = "button"; b1.setAttribute("data-guide", "help");
        var b2 = el("button", "d-btn d-btn-s", "활용 데이터"); b2.type = "button"; b2.setAttribute("data-guide", "data");
        row.appendChild(b1); row.appendChild(b2); c.appendChild(row);
      }
      stage.appendChild(c);
      [].forEach.call(dots.children, function (x, k) { x.className = k === i ? "on" : ""; });
      prev.disabled = i === 0; prev.style.visibility = i === 0 ? "hidden" : "";
      next.textContent = s.last ? "시작" : "다음";
    }
    prev.addEventListener("click", function () { if (i > 0) { i--; draw(); } });
    next.addEventListener("click", function () { if (SLIDES[i].last) { d.close ? d.close() : d.removeAttribute("open"); return; } i++; draw(); next.focus(); });
    d.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" && !SLIDES[i].last) { i++; draw(); }
      else if (e.key === "ArrowLeft" && i > 0) { i--; draw(); }
    });
    draw();
  }

  var api = {
    intro: function () {
      var d = dialog("dgIntro", "닿음 소개", false); d.classList.add("dg-intro");
      renderIntro(d); open(d);
      d.addEventListener("close", function () { lsSet("daeum.intro.seen", "1"); }, { once: true });
    },
    help: function (side) { var d = dialog("dgHelp", "사용 방법", true); renderHelp(d.querySelector(".dg-body"), side || SIDE || "officer"); open(d); },
    data: function (ids) { var d = dialog("dgData", "활용 데이터", true); open(d); renderData(d.querySelector(".dg-body"), ids); },
    renderData: renderData, renderHelp: renderHelp, hit: hit, infer: infer, scan: scan, DATA: DATA, counts: counts, links: links
  };
  window.DaeumGuide = api;

  /* 눌림: [data-guide] 단추 · 출처 꼬리표 «자료 표» */
  doc.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var g = t.closest("[data-guide]");
    if (g) {
      e.preventDefault();
      var kind = g.getAttribute("data-guide"), cur = g.closest("dialog");
      if (cur && cur.open && cur.id !== "dg" + kind.charAt(0).toUpperCase() + kind.slice(1)) { try { cur.close(); } catch (x) { /* 무시 */ } }
      if (kind === "intro") api.intro(); else if (kind === "help") api.help(g.getAttribute("data-guide-side")); else api.data();
      return;
    }
    var s = t.closest("a.src-go");
    if (s && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      var ids = (s.getAttribute("data-src-ids") || "").split(",");
      if (ON_DATA_PAGE) { var m = doc.getElementById("dataMain"); if (m) hit(m, ids); return; }
      api.data(ids);
    }
  });

  function boot() {
    scan();
    try { new MutationObserver(later).observe(doc.body, { childList: true, subtree: true }); } catch (e) { /* 구형 */ }
    var q = new URLSearchParams(location.search);
    var forced = q.get("intro") === "1";
    var embedded = q.get("sw") === "embed" || window.self !== window.top;
    if (ON_DATA_PAGE) return;
    if (forced || (!lsGet("daeum.intro.seen") && !navigator.webdriver && !embedded)) api.intro();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
})();
