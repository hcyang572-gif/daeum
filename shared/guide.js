/* 닿음 안내 부품(S10i, 🩵 미르 10-30) — 첫 방문 소개 4장 · 사용 방법 · 활용 데이터 표 · 출처 꼬리표 통일.
   각 화면에 이 한 줄만 둔다: <script src="../shared/guide.js"></script> (스타일 guide.css 는 스스로 붙인다)
   - 단추: [data-guide="intro|help|data"] 를 누르면 해당 대화상자. data-guide-side="officer|citizen" 으로 사용 방법 첫 칸을 고른다.
   - 출처 꼬리표: 화면의 .src-tag · .src-line · p.src, 그리고 «출처»로 시작하는 문단을 찾아
     «공공데이터»/«가상» 표식을 붙이고 «자료 표» 연결(→ 활용 데이터 해당 줄)을 단다. data-src-ref="D13,D12" 를 달면 그 줄로 바로 간다.
     화면이 다시 그려져도(MutationObserver) 같은 규칙을 다시 건다 — 각 창구 코드는 꼬리표 글만 쓰면 된다.
   - 첫 방문 소개는 한 번만(localStorage «daeum.intro.seen»). 자동 점검 브라우저(navigator.webdriver)·나란히 보기(iframe)에서는 띄우지 않는다(?intro=1 이면 띄움).
   - 데이터 표 정본: 01_리서치/활용데이터_목록.md · 03_시제품/data/README.md. 숫자·기준일을 바꾸면 이 표도 함께 고친다. */
(function () {
  "use strict";
  var doc = document;
  var me = doc.currentScript;
  var SHARED = new URL(".", me ? me.src : location.href);
  var ROOT = new URL("../", SHARED);
  var DATA_URL = new URL("data.html", SHARED).href;
  var path = location.pathname;
  var SIDE = /\/citizen\//.test(path) ? "citizen" : /\/officer\//.test(path) ? "officer" : "";
  var ON_DATA_PAGE = /\/shared\/data\.html$/.test(path);

  (function css() {
    if (doc.querySelector('link[data-guide-css]')) return;
    var l = doc.createElement("link"); l.rel = "stylesheet"; l.href = new URL("guide.css", SHARED).href; l.setAttribute("data-guide-css", "");
    doc.head.appendChild(l);
  })();

  function u(p) { return new URL(p, ROOT).href; }

  /* ── 활용 데이터 표(정본) ── kind: pub 공공데이터 · virt 가상(시연) · self 닿음 자체 · ref 참고 자료 */
  var DATA = [
    { id: "D1", kind: "pub", org: "한국사회보장정보원", name: "중앙부처복지서비스", no: "15090532", url: "https://www.data.go.kr/data/15090532/openapi.do",
      how: "OpenAPI · 받아서 저장(키는 화면에 두지 않음)", cycle: "필요할 때 다시 받음", base: "2026-10-30 조회",
      screens: [["주민", "받을 수 있는 도움"], ["공무원", "상담 기록 › 연계 후보"], ["공무원", "AI 추천 검증"]],
      does: "상황에 맞는 국가 복지서비스 후보 · 대상·신청 방법" },
    { id: "D2", kind: "pub", org: "한국사회보장정보원", name: "지자체복지서비스", no: "15108347", url: "https://www.data.go.kr/data/15108347/openapi.do",
      how: "OpenAPI · 받아서 저장", cycle: "필요할 때 다시 받음", base: "2026-10-30 조회",
      screens: [["주민", "받을 수 있는 도움"], ["공무원", "상담 기록 › 연계 후보"], ["공무원", "다른 시군 보기"]],
      does: "상주시(시군) 자체 사업 후보 · 시군별 서비스 수" },
    { id: "D5", kind: "pub", org: "한국사회보장정보원", name: "복지사업 시군구별 수급권자 현황", no: "15062448", url: "https://www.data.go.kr/data/15062448/fileData.do",
      how: "파일(CSV) · 상주시 행만 뽑음", cycle: "포털 갱신 때", base: "기준 2025-12",
      screens: [["공무원", "③ 연계 누락"], ["공무원", "④ 현황 · 보고서"], ["공무원", "다른 시군 보기"]],
      does: "기초생활·차상위·기초연금·장애인연금 수급 규모(실제 값)" },
    { id: "D12", kind: "pub", org: "행정안전부", name: "지역별(행정동) 성별 연령별 주민등록 인구수", no: "15097972", url: "https://www.data.go.kr/data/15097972/fileData.do",
      how: "파일(CSV) · 읍면동 24곳", cycle: "매월", base: "기준 2026-09-30",
      screens: [["공무원", "④ 현황 › 고독사 위험도"], ["공무원", "방문 전 카드"], ["공무원", "다른 시군 보기"]],
      does: "읍면동 65세 이상 비율 → 고독사 위험도(닿음 추정 지수)" },
    { id: "D13", kind: "pub", org: "행정안전부", name: "지역별(행정동) 세대원수별 주민등록 세대수", no: "15097974", url: "https://www.data.go.kr/data/15097974/fileData.do",
      how: "파일(CSV) · 읍면동 24곳", cycle: "매월", base: "기준 2026-09-30",
      screens: [["공무원", "④ 현황 › 고독사 위험도"], ["공무원", "방문 전 카드"], ["공무원", "다른 시군 보기"]],
      does: "읍면동 1인 세대 비율 → 고독사 위험도(닿음 추정 지수)" },
    { id: "M1", kind: "pub", org: "행정안전부", name: "주민등록 인구 및 세대현황(월간)", no: "", url: "https://jumin.mois.go.kr/statMonth.do",
      how: "통계 누리집 표 · 읍면동별 세대수", cycle: "매월", base: "2026-09",
      screens: [["공무원", "오늘 · 시각표(가상 가구 배치)"], ["공무원", "도입 비용·탄소"]],
      does: "읍면동 이름·세대 비율로 가상 가구 300곳을 나눠 놓음 · 시 전체 세대수" },
    { id: "D11", kind: "pub", org: "기상청", name: "기상특보 조회서비스", no: "15000415", url: "https://www.data.go.kr/data/15000415/openapi.do",
      how: "OpenAPI 특보 코드 체계 · 시연은 저장된 시나리오", cycle: "실시간(운영 시)", base: "코드 3 한파 · 12 폭염",
      screens: [["공무원", "오늘 › 폭염·한파 신호"], ["공무원", "① 시각표"]],
      does: "폭염·한파 특보 때 홀몸·고령 가구 방문 순서 조정 제안" },
    { id: "MED", kind: "pub", org: "국립중앙의료원", name: "전국 병·의원 찾기 서비스 · 전국 약국 정보 조회 서비스", no: "15000736·15000576", url: "https://www.data.go.kr/data/15000736/openapi.do",
      how: "OpenAPI · 받아서 저장(상주 190곳, 요양병원 제외)", cycle: "필요할 때 다시 받음", base: "2026-10-30 조회",
      screens: [["공무원", "방문 전 카드 › 가까운 병원·약국"]],
      does: "방문 시각에 문 연 곳 먼저 2~3곳 · 진료시간 · 전화" },
    { id: "D15", kind: "pub", org: "국토교통부", name: "건축HUB 건축물대장정보 서비스(표제부)", no: "15134735", url: "https://www.data.go.kr/data/15134735/openapi.do",
      how: "OpenAPI · 개발 PC에서 받아 읍면별 합계만 저장(건물 주소 저장 안 함)", cycle: "필요할 때 다시 받음(원본 월간)", base: "2026-10-30 조회",
      screens: [["공무원", "가구 명단 · 오늘 동선 › 오래된 집"], ["공무원", "방문 전 카드"]],
      does: "읍면별 30년 넘은 주택 비율(주거용 건물 동 수 기준) → 가상 가구에 «오래된 집» 시연 표식 · 난방·전기·누수 살피기" },

    { id: "V1", kind: "virt", org: "닿음(시연)", name: "가상 가구 300곳 · 가상 발굴 명단", no: "", url: "",
      how: "생성기 data/tools/make_households.py(시드 고정)", cycle: "고정", base: "2026-10-29 생성",
      screens: [["공무원", "오늘 · ① 시각표 · ② 재시도 · ③ 연계 누락 · 가구 명단"]],
      does: "한국사회보장정보원 발굴 명단(행복이음 통보) 모양을 본뜬 시연 가구. 실제 주민·개인정보 0건. 위기정보(비공개·행정망)는 항목 구조만 본뜸" },
    { id: "V2", kind: "virt", org: "닿음(시연)", name: "가상 신호 시나리오", no: "", url: "",
      how: "손으로 쓴 파일 data/alerts_demo.json", cycle: "고정", base: "2026-10-30",
      screens: [["공무원", "오늘 › 무반응 신호 · 오늘 특보"]],
      does: "협약 기관(AI 스피커·IoT) 무반응 신호와 오늘 특보 상황(실제 신호 아님)" },
    { id: "V3", kind: "virt", org: "닿음(시연)", name: "지난 차수 기록 · 동네 미신청 · 주민 신호 예시", no: "", url: "",
      how: "시연 기본값", cycle: "고정", base: "—",
      screens: [["공무원", "⑤ 명단 정리"], ["공무원", "③ 연계 누락"], ["공무원", "오늘 › 새 주민 신호"]],
      does: "지난 차수 비해당 사유·미신청 칸·시연용 주민 신호" },
    { id: "V4", kind: "virt", org: "닿음(시연)", name: "AI 추천 검증 사연 20건", no: "", url: "",
      how: "손으로 쓴 가상 사연", cycle: "고정", base: "2026-10-29",
      screens: [["공무원", "AI 추천 검증"]],
      does: "추천 정확도를 재는 시험 사연(실제 상담 아님)" },

    { id: "S1", kind: "self", org: "닿음", name: "AI 추천 검증 측정 결과", no: "", url: "",
      how: "자체 측정(D1·D2 목록 + 가상 사연 20건)", cycle: "다시 잴 때", base: "측정일은 화면 표기",
      screens: [["공무원", "AI 추천 검증"]], does: "추천 서비스가 사연에 맞는 비율" },
    { id: "S2", kind: "self", org: "이 기기", name: "담당자 표시 기록", no: "", url: "",
      how: "이 기기(브라우저)에만 저장", cycle: "누를 때마다", base: "—",
      screens: [["공무원", "추천 현장 적합률"], ["공무원", "② 재시도 · 상담 기록"]], does: "담당자가 남긴 시도·연계·적합 표시를 모아 셈" },

    { id: "N1", kind: "svc", org: "네이버클라우드플랫폼", name: "Maps · Web Dynamic Map · Directions 15(도로 경로)", no: "", url: "https://www.ncloud.com/product/applicationService/maps",
      how: "API · 도로 경로는 서버 함수가 대신 호출(비밀 키 비노출)", cycle: "누를 때마다", base: "—",
      screens: [["공무원", "① 시각표 › 지도 · 도로 기준 순서"]], does: "지도 위 방문 동선 · 도로 거리·시간으로 순서 후보 비교" },

    { id: "R1", kind: "ref", org: "한국석유관리원·충북대", name: "한국유화학회지 2016(33권 4호) 휘발유 CO₂ 계수", no: "", url: "",
      how: "논문 값 2.174 kgCO₂/L", cycle: "—", base: "2016", screens: [["공무원", "도입 비용·탄소"]], does: "이동 거리 감소 → CO₂ 감소 추정" },
    { id: "R2", kind: "ref", org: "Anthropic · 한국자금중개", name: "AI 가격표 · 매매기준율", no: "", url: "",
      how: "누리집 확인", cycle: "—", base: "2026-10-29 · 2026-10-28", screens: [["공무원", "도입 비용·탄소"]], does: "AI 월 비용 추정(원화)" },
    { id: "R3", kind: "ref", org: "IETF", name: "RFC 5545 iCalendar 규격", no: "", url: "",
      how: "규격 문서", cycle: "—", base: "2009-09", screens: [["공무원", "① 시각표 › 달력에 넣기"]], does: "방문 일정을 휴대폰 달력 파일로" },
    { id: "R4", kind: "ref", org: "서울 강남구", name: "«3회 방문 뒤 간접조사» 공개 사례", no: "", url: "",
      how: "공개 누리집(gangnam.go.kr)", cycle: "—", base: "—", screens: [["공무원", "② 재시도"]], does: "3번째 허탕 뒤 이웃·통반장 확인 순서" },
    { id: "R5", kind: "ref", org: "나라살림연구소", name: "차수마다 같은 사람이 다시 오른다는 현장 지적", no: "", url: "",
      how: "공개 보고", cycle: "—", base: "2024-03-25", screens: [["공무원", "⑤ 명단 정리"]], does: "지난 차수 비해당 집 표시의 근거" },
    { id: "R6", kind: "ref", org: "보건복지부", name: "복지 사각지대 발굴 차수 일정(정책브리핑 보도)", no: "", url: "https://www.korea.kr/news/policyNewsView.do?newsId=148973765",
      how: "보도 자료", cycle: "차수마다", base: "2026-10-19", screens: [["공무원", "④ 현황 · 보고서 › 마감 역산"]], does: "이번 차수 기간·마감까지 남은 날" }
  ];
  var BY = {}; DATA.forEach(function (d) { BY[d.id] = d; });
  var KIND = { pub: "공공데이터", virt: "가상 데이터(시연)", self: "닿음 자체 측정·기록", svc: "지도·경로 서비스", ref: "참고 자료" };

  /* 출처 글 → 데이터 줄 추정(구체적인 것 먼저) */
  var RULES = [
    [/15062448|수급권자 현황/, "D5"], [/15097974|세대원수별/, "D13"], [/15097972|성별 연령별/, "D12"],
    [/주민등록 인구·세대 통계/, "D13"], [/행정안전부 주민등록 세대수|주민등록 인구통계|주민등록 인구 및 세대/, "M1"],
    [/15000415|기상특보|특보 코드/, "D11"], [/15000576|15000736|국립중앙의료원/, "MED"], [/15134735|건축HUB|건축물대장/, "D15"],
    [/15108347|지자체복지서비스/, "D2"], [/15090532|중앙부처복지서비스/, "D1"], [/서비스 목록/, "D1"],
    [/네이버|Directions/, "N1"], [/AI 스피커|무반응|협약 기관|가상 신호/, "V2"], [/지난 차수|동네 미신청/, "V3"], [/가상 사연/, "V4"],
    [/발굴 명단|가상 가구|가구 수는 가상|명단은 가상|가상 명단|가구는 가상/, "V1"],
    [/자체 측정/, "S1"], [/담당자 표시 기록|담당자 기록/, "S2"],
    [/석유관리원|kgCO/, "R1"], [/Anthropic|매매기준율/, "R2"], [/RFC 5545/, "R3"], [/강남구/, "R4"], [/나라살림/, "R5"],
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
      ["today", "오늘", "officer/index.html#today", "오늘 찾아갈 집 · 새 주민 신호 · 기한이 다가오는 일"],
      ["route", "① 하루 방문 시각표", "officer/index.html#route", "가까운 집끼리 묶은 순서와 도착 시각 · 1장 인쇄 · 달력에 넣기"],
      ["contacts", "② 재시도", "officer/index.html#contacts", "방문·전화 결과 한 번 → 안 해 본 시간대로 다음 시도 제안 · 3번째 허탕이면 이웃·통반장 확인 순서"],
      ["board", "③ 연계 누락", "officer/index.html#board", "주민 신호 → 상담 → 안내 → 신청 중 멈춘 집 · 덜 신청된 서비스"],
      ["report", "④ 현황 · 보고서", "officer/index.html#report", "이번 차수 현황 집계 · 주간·월간 보고서 자동 작성 · 인쇄·PDF"],
      ["intake", "⑤ 명단 정리", "officer/index.html#intake", "받은 명단의 가구 번호 → 지난 차수 비해당 집에 배지와 지난 사유"],
      ["list", "가구 명단", "officer/index.html#list", "방문 순서를 정한 근거 · 경로에 담기"],
      ["record", "상담 기록", "officer/index.html#record", "행복이음에 옮길 초안 · 연계 후보"]
    ],
    citizen: [
      ["ask", "알리기", "citizen/index.html#ask", "누구의 일인지 고르고 말하거나 적기 → 읍면동 복지 담당 공무원에게"],
      ["progress", "보낸 알림", "citizen/index.html#progress", "보낸 알림의 확인 · 방문 예정 · 완료"],
      ["find", "다른 도움 찾기", "citizen/index.html#ask", "받을 수 있는 복지서비스 · 복지로 · 129 상담"]
    ]
  };
  function renderHelp(box, side) {
    box.innerHTML = "";
    var seg = el("div", "dg-seg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "창구 고르기");
    var lists = {};
    [["officer", "공무원 창구"], ["citizen", "주민 창구"]].forEach(function (s) {
      var b = el("button", null, s[1]); b.type = "button"; b.setAttribute("data-side", s[0]); b.setAttribute("data-h", "selection");
      seg.appendChild(b);
      var ul = el("ul", "dg-help"); ul.setAttribute("aria-label", s[1] + " 화면");
      HELP[s[0]].forEach(function (it) {
        var li = el("li"); var a = el("a", "dg-hi"); a.href = u(it[2]);
        a.innerHTML = mini(it[0], it[1]);
        var t = el("span"); t.appendChild(el("b", null, it[1])); t.appendChild(el("small", null, it[3])); a.appendChild(t);
        li.appendChild(a); ul.appendChild(li);
      });
      lists[s[0]] = ul;
    });
    box.appendChild(seg); box.appendChild(lists.officer); box.appendChild(lists.citizen);
    var foot = el("p", "dg-foot");
    var b1 = el("button", "d-btn d-btn-s", "소개 다시 보기"); b1.type = "button"; b1.setAttribute("data-guide", "intro");
    var b2 = el("button", "d-btn d-btn-s", "활용 데이터"); b2.type = "button"; b2.setAttribute("data-guide", "data");
    foot.appendChild(b1); foot.appendChild(b2); box.appendChild(foot);
    function pick(sd) {
      [].forEach.call(seg.children, function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-side") === sd)); });
      lists.officer.hidden = sd !== "officer"; lists.citizen.hidden = sd !== "citizen";
    }
    seg.addEventListener("click", function (e) { var b = e.target.closest("button[data-side]"); if (b) pick(b.getAttribute("data-side")); });
    pick(side || "officer");
  }

  /* ── 활용 데이터 표 ── */
  function renderData(box, hitIds) {
    box.innerHTML = "";
    var n = DATA.filter(function (d) { return d.kind === "pub"; }).length;
    var sum = el("div", "dg-sum");
    sum.innerHTML = '<span class="dg-k"><b class="num">' + n + '</b>종</span><span class="d-tag pub">공공데이터</span>' +
      '<span class="dg-k"><b class="num">' + DATA.filter(function (d) { return d.kind === "virt"; }).length + '</b>종</span><span class="d-tag virt">가상</span>' +
      '<span class="dg-note">실제 주민·개인정보 0건</span>';
    box.appendChild(sum);
    ["pub", "virt", "self", "svc", "ref"].forEach(function (k) {
      var rows = DATA.filter(function (d) { return d.kind === k; }); if (!rows.length) return;
      var sec = el("section", "dg-sec"); var h = el("h3", null, KIND[k]); sec.appendChild(h);
      var tb = el("table", "dg-tbl"); var cap = el("caption", "sr", KIND[k] + " 목록"); tb.appendChild(cap);
      var th = el("thead"); var tr = el("tr");
      ["제공기관 · 데이터", "받는 방식 · 갱신", "쓰는 화면", "하는 일"].forEach(function (c) { var x = el("th", null, c); x.scope = "col"; tr.appendChild(x); });
      th.appendChild(tr); tb.appendChild(th);
      var bd = el("tbody");
      rows.forEach(function (d) {
        var r = el("tr"); r.id = "src-" + d.id; r.setAttribute("data-id", d.id); r.tabIndex = -1;
        var c1 = el("td"); c1.setAttribute("data-l", "데이터");
        c1.appendChild(el("span", "dg-org", d.org)); c1.appendChild(el("b", "dg-nm", d.name));
        c1.appendChild(el("span", "dg-no", (d.no ? "공공데이터포털 " + d.no + " · " : "") + d.base));
        var c2 = el("td", null, d.how + " · " + d.cycle); c2.setAttribute("data-l", "받는 방식");
        var c3 = el("td"); c3.setAttribute("data-l", "쓰는 화면");
        d.screens.forEach(function (s) { var x = el("span", "dg-scr"); x.appendChild(el("i", null, s[0])); x.appendChild(doc.createTextNode(s[1])); c3.appendChild(x); });
        var c4 = el("td", null, d.does); c4.setAttribute("data-l", "하는 일");
        [c1, c2, c3, c4].forEach(function (c) { r.appendChild(c); }); bd.appendChild(r);
      });
      tb.appendChild(bd); sec.appendChild(tb); box.appendChild(sec);
    });
    box.appendChild(el("p", "dg-foot2", "공공데이터 이용허락: 행정안전부·한국사회보장정보원 파일은 이용허락 제한 없음, 기상청·병원·약국 OpenAPI는 출처표시(제1유형) — 각 화면 «출처» 꼬리표로 표시. 정본: 01_리서치/활용데이터_목록.md"));
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
    { h: "복지 사각지대 현장 업무 도우미", p: "명단은 한국사회보장정보원이, 기록은 행복이음이. 그 사이 «언제·어디·다시·놓침·보고»는 닿음이.",
      pic: '<rect class="f2" x="6" y="34" width="62" height="40" rx="12"/><rect class="f3" x="16" y="46" width="34" height="5" rx="2.5"/><rect class="f3" x="16" y="56" width="26" height="5" rx="2.5"/>' +
        '<rect class="en" x="98" y="20" width="84" height="68" rx="16"/><circle class="w" cx="122" cy="46" r="5"/><circle class="w2" cx="140" cy="46" r="5"/><rect class="w2" x="114" y="62" width="52" height="6" rx="3"/>' +
        '<rect class="f2" x="212" y="34" width="62" height="40" rx="12"/><path class="ln" d="M224 48h38M224 58h28M224 66h20"/>' +
        '<path class="ln ar" d="M72 54h20M188 54h20"/><path class="ln" d="M87 49l5 5-5 5M203 49l5 5-5 5"/>' +
        '<text class="tx" x="37" y="92" text-anchor="middle">정보원 명단</text><text class="tx b" x="140" y="104" text-anchor="middle">닿음</text><text class="tx" x="243" y="92" text-anchor="middle">행복이음 기록</text>',
      label: "정보원 명단에서 닿음을 거쳐 행복이음 기록으로" },
    { h: "공무원의 하루", p: "아침 시각표 → 현장 재시도 → 오후 연계 누락 → 주간 보고서. 새 차수 명단은 ⑤에서 정리.",
      pic: (function () {
        var s = '<path class="ln" d="M24 56h232"/>', xs = [24, 82, 140, 198, 256], t = ["① 시각표", "② 재시도", "③ 연계 누락", "④ 보고서", "⑤ 명단 정리"], w = ["아침", "현장", "오후", "주·월", "새 차수"];
        xs.forEach(function (x, i) { s += '<circle class="' + (i === 0 ? "en" : "dt") + '" cx="' + x + '" cy="56" r="' + (i === 0 ? 11 : 8) + '"/><text class="tx" x="' + x + '" y="32" text-anchor="middle">' + w[i] + '</text><text class="tx b" x="' + x + '" y="88" text-anchor="middle">' + t[i] + "</text>"; });
        return s;
      })(), label: "아침 시각표부터 새 차수 명단 정리까지 다섯 단계" },
    { h: "주민 창구", p: "걱정되는 이웃·힘든 사정을 알리면 담당 공무원의 «오늘 › 새 주민 신호»에 들어갑니다.",
      pic: '<rect class="f2" x="20" y="18" width="70" height="80" rx="14"/><circle class="hl" cx="55" cy="48" r="14"/><path class="w" d="M55 58s-9-5.6-9-12.4a5 5 0 0 1 9-3 5 5 0 0 1 9 3C64 52.4 55 58 55 58Z"/><rect class="f3" x="32" y="74" width="46" height="6" rx="3"/>' +
        '<path class="ln ar" d="M100 58h70"/><path class="ln" d="M165 52l6 6-6 6"/>' +
        '<rect class="f2" x="180" y="18" width="84" height="80" rx="14"/><rect class="hl" x="192" y="32" width="60" height="14" rx="7"/><rect class="f3" x="192" y="54" width="60" height="10" rx="5"/><rect class="f3" x="192" y="70" width="44" height="10" rx="5"/>' +
        '<text class="tx" x="55" y="112" text-anchor="middle">주민</text><text class="tx" x="222" y="112" text-anchor="middle">공무원 · 오늘</text>',
      label: "주민 알림이 공무원 오늘 화면의 새 신호로" },
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
    renderData: renderData, renderHelp: renderHelp, hit: hit, infer: infer, scan: scan, DATA: DATA
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
