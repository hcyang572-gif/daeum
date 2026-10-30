/* 닿음 AI 창구 — 국민 창구·공무원 창구가 이 파일 하나로 AI(또는 규칙 기반 대체)를 쓴다.

   [국민] DaeumAI.recommend(input, catalog) → Promise<결과>
     input   = { text, proxy:{isProxy, relation}, chips:[태그] }
     catalog = services.json 전체({doc_sets, services})
     결과    = { mode:"ai"|"rules", profile, summary, items:[{service, reason, score}], urgent, notice }
   [공무원] DaeumAI.summarize(text, ctx) → Promise<결과>   (S5에서 officer/ai-officer.js 를 합침)
     ctx     = { label, factors:[{key,name}], services:[{id,name,org,tags,target?,support?}] }
     결과    = { summary, issues, needs, urgent, serviceIds, why:{id:[욕구]}, reasons:{id:문장}, source:"ai"|"rule", fallback? }

   ① DAEUM_CONFIG.aiEndpoint 가 있으면 Supabase Edge Function(daeum-ai)을 부른다 — Claude API 키는 서버에만 있다.
      함수가 받는 형식은 하나뿐이다: POST {situation, proxy, profile, services} → {summary, picks[{id,reason}]}.
      공무원 요약도 같은 형식으로 보낸다(상담 기록=situation, 사전 지표=profile). 쟁점·욕구·긴급은 화면 규칙으로 뽑는다.
      서버가 돌려준 서비스 ID 는 «목록에 있는 것만» 남긴다(지어낸 서비스 차단 — 서버도 거르지만 화면에서 한 번 더).
   ② 없거나 실패하면 규칙 기반 대체로 돌아간다. 국민 창구는 안내 문구로, 공무원 창구는 fallback 사유로 밝힌다. */
(function () {
  "use strict";

  // ── 상황 낱말 사전(태그 → 낱말 조각). 조각이 문장에 들어 있으면 그 태그로 본다. ──
  var LEX = {
    alone: ["혼자 살", "혼자 사", "혼자 지내", "홀로", "독거", "1인 가구", "혼자서 지내", "혼자 계", "사별", "혼자예요", "혼자입니다"],
    lowIncome: ["돈이 없", "생활비", "형편", "가난", "수입이 없", "수입 없", "소득이 없", "수급자", "차상위", "빠듯", "생계", "먹고살기", "연금만"],
    unemployed: ["취업 준비", "구직", "실직", "해고", "퇴사", "직장을 잃", "일자리를 잃", "일을 그만", "회사를 그만", "권고사직", "폐업", "일이 끊", "실업", "일을 못 하게", "그만두게"],
    working: ["일은 하는데", "일하는데", "알바", "아르바이트", "일용직", "벌이가 적", "월급이 적"],
    singleParent: ["한부모", "이혼", "혼자 키우", "혼자 아이", "혼자 애", "싱글맘", "싱글대디", "남편 없이", "아내 없이", "양육비"],
    child: ["아이", "자녀", "아들", "딸", "초등", "중학생", "고등학생", "애들", "애가", "손주", "손자", "손녀"],
    infant: ["아기", "갓난", "신생아", "영아", "돌 전", "백일"],
    pregnancy: ["임신", "출산 예정", "임산부", "뱃속"],
    sick: ["아프", "아파", "병원", "수술", "질병", "투병", "입원", "치료", "병원비", "약값", "당뇨", "허리", "무릎", "관절", "암 ", "암이", "혈압"],
    careNeed: ["거동", "못 걷", "걷기 힘", "걷기가 힘", "누워", "혼자 못", "돌봐", "돌볼", "돌봄", "간병", "수발", "씻기 힘", "식사를 못 챙"],
    dementia: ["치매", "깜빡", "자꾸 잊", "기억이", "기억을 못", "같은 말을 반복"],
    disability: ["장애", "휠체어", "시각장", "청각장", "지체"],
    housing: ["월세", "집세", "전세", "보증금", "집이 낡", "쫓겨", "방값", "집주인", "집 수리", "지붕", "곰팡이"],
    energy: ["난방", "보일러", "전기요금", "가스요금", "추워", "춥", "기름값", "연탄", "전기세", "냉방", "에어컨", "더위",
      "전기가 끊", "전기 끊", "단전", "가스가 끊", "가스 끊"],
    debt: ["빚", "대출", "채무", "독촉", "추심", "카드값", "사채"],
    // «막막·급하·당장»은 위기 태그가 아니라 안내 띠(SOFT_WORDS)만 켠다(재검수 ①)
    crisis: ["갑자기", "굶", "끼니", "먹을 게", "쌀이 떨", "위기", "길에 나앉"],
    violence: ["때려", "때리", "에게 맞", "한테 맞", "맞고 살", "폭행", "폭력", "학대", "스토킹", "성폭", "추행", "협박"],
    food: ["끼니", "굶", "먹을 게", "쌀이", "쌀도", "반찬", "밥을 못", "못 먹", "먹지 못"],
    mental: ["우울", "죽고 싶", "살기 싫", "죽을 것 같", "극단", "자살", "사라지고 싶", "잠을 못", "외롭", "외로워",
      "살고 싶지 않", "살고 싶지가 않", "목숨을 끊", "생을 마감", "삶을 끝", "더는 못 버티", "더 이상 못 버티", "없어지고 싶", "극단적 선택", "자해"]
  };
  // 생명 위기 낱말(mental 의 일부 — «외롭다·잠을 못 잔다»는 여기 넣지 않는다)
  var SUICIDE_WORDS = ["죽고 싶", "살기 싫", "죽을 것 같", "극단", "자살", "사라지고 싶", "살고 싶지 않", "살고 싶지가 않",
    "목숨을 끊", "생을 마감", "삶을 끝", "더는 못 버티", "더 이상 못 버티", "없어지고 싶", "자해"];
  var CRISIS_HARD = ["굶", "끼니", "먹을 게", "쌀이 떨", "쌀도 떨", "못 먹었", "길에 나앉", "전기가 끊", "단전"];  // S6d: C3 «쌀도 떨어졌어요·못 먹었습니다» 미인식 보정
  var CRISIS_SOFT = ["위기", "갑자기"];
  var CRISIS_CAUSE = ["실직", "폐업", "수입", "돈", "월세"];
  var SOFT_WORDS = ["막막", "급해", "급하", "당장"];
  var NAME_WEIGHT = { energy: 6 };   // 이름 속 상황어 가점(기본 3)
  // 어르신을 가리키는 말(나이가 없을 때 senior 로 본다)
  var SENIOR_WORDS = ["어르신", "노인", "할머니", "할아버지", "노모", "노부", "칠순", "팔순", "구순"];
  var CHILD_NEAR = /(아이|애|딸|아들|자녀|손주|손자|손녀|아기|막내|첫째|둘째|학생)/;

  // 태그 → 근거 문장 조각(쉬운 말)
  var REASON = {
    senior: "만 65세 이상", alone: "혼자 지내심", lowIncome: "생활비가 빠듯함", unemployed: "일자리를 잃음",
    working: "일하지만 소득이 적음", singleParent: "혼자 아이를 키움", child: "자녀가 있음", infant: "어린 아기가 있음",
    pregnancy: "임신·출산", sick: "아픈 곳이 있음", careNeed: "혼자 생활하기 어려움", dementia: "기억력이 걱정됨",
    disability: "장애가 있음", housing: "집·월세 걱정", energy: "난방·전기 요금 걱정", debt: "빚 걱정",
    crisis: "갑자기 어려워짐", food: "끼니 걱정", mental: "마음이 힘듦", violence: "폭력 피해"
  };
  // 빠른 선택 칩(화면에서 씀)
  var CHIPS = [
    ["alone", "혼자 지내요"], ["lowIncome", "생활비가 부족해요"], ["sick", "아픈 곳이 있어요"],
    ["careNeed", "혼자 생활이 힘들어요"], ["unemployed", "일자리를 잃었어요"], ["child", "아이를 키워요"],
    ["housing", "집·월세 걱정"], ["energy", "난방비 걱정"], ["debt", "빚 걱정"], ["disability", "장애가 있어요"]
  ];

  function has(text, words) {
    for (var i = 0; i < words.length; i++) if (text.indexOf(words[i]) >= 0) return true;
    return false;
  }

  /** 문장에서 나이·자녀 나이·상황 태그를 뽑는다 */
  function analyze(input) {
    var raw = String(input.text || "");
    var text = " " + raw.replace(/\s+/g, " ") + " ";
    var tags = {};
    Object.keys(LEX).forEach(function (k) { if (has(text, LEX[k])) tags[k] = true; });
    (input.chips || []).forEach(function (k) { tags[k] = true; });

    if (/혼자[^.,]{0,14}(키우|키워|키웁|기르)/.test(text)) tags.singleParent = true;
    // «혼자 아이를 키우» 같은 말은 한부모이지 1인 가구가 아니다
    if (tags.singleParent && !has(text, ["혼자 살", "혼자 사", "혼자 지내", "독거"])) delete tags.alone;
    // «아이»가 «아이고»처럼 감탄사로 쓰인 경우 거름
    if (tags.child && !/(아이[가는를들이도와랑]|아이 [가-힣]|자녀|아들|딸|초등|중학생|고등학생|애들|애가|손주|손자|손녀)/.test(text)) delete tags.child;
    if (tags.infant) tags.child = tags.child || false;
    if (tags.food) tags.lowIncome = true;   // 끼니 걱정은 생계 어려움이기도 하다

    // 나이: "82살", "78세", "80대", "마흔" 등
    var subjectAges = [], childAges = [], m, re = /(\d{1,3})\s*(세|살)/g;
    while ((m = re.exec(text))) {
      var n = parseInt(m[1], 10);
      if (n > 120) continue;
      var ctx = text.slice(Math.max(0, m.index - 8), m.index + m[0].length + 6);
      (CHILD_NEAR.test(ctx) && n < 25 ? childAges : subjectAges).push(n);
    }
    var decade = /(\d)0\s*대/.exec(text), ageBand = null, age = null;
    var ageLabel = null;
    if (subjectAges.length) { age = Math.max.apply(null, subjectAges); ageBand = Math.floor(age / 10) * 10 + "대"; ageLabel = age + "세"; }
    else if (decade) { age = parseInt(decade[1], 10) * 10; ageBand = decade[1] + "0대"; ageLabel = ageBand; }
    var KOR = { "마흔": 40, "쉰": 50, "예순": 60, "일흔": 70, "여든": 80, "아흔": 90 };
    if (age == null) Object.keys(KOR).forEach(function (w) { if (age == null && text.indexOf(w) >= 0) { age = KOR[w]; ageBand = KOR[w] + "대"; ageLabel = ageBand; } });
    // 초등학생 → 자녀 나이 7~12로 봄
    var childAgesGuess = !childAges.length && /초등|중학생|고등학생/.test(text) || (!childAges.length && !!tags.infant);
    if (/초등/.test(text) && !childAges.length) childAges.push(7, 12);
    if (/중학생/.test(text) && !childAges.length) childAges.push(13, 15);
    if (/고등학생/.test(text) && !childAges.length) childAges.push(16, 18);
    if (tags.infant && !childAges.length) childAges.push(0);
    if (childAges.length) tags.child = true;

    var seniorHint = has(text, SENIOR_WORDS);
    if ((age != null && age >= 65) || (age == null && seniorHint)) tags.senior = true;
    // 대신 묻기: 부모님이면 어르신일 가능성이 높지만 나이를 모르면 단정하지 않는다
    var proxy = input.proxy || {};
    Object.keys(tags).forEach(function (k) { if (!tags[k]) delete tags[k]; });
    return {
      age: age, ageBand: ageBand, ageLabel: ageLabel, ageKnown: age != null, seniorHint: seniorHint,
      childAges: childAges, childAgesGuess: childAgesGuess, tags: Object.keys(tags),
      isProxy: !!proxy.isProxy, relation: proxy.relation || "",
      urgent: !!(tags.mental || tags.crisis || has(text, SOFT_WORDS)), urgentMental: !!tags.mental,
      // 생계 위기(129 고정 카드·긴급 가점)는 좁게(S5b-2 재검수): 끼니·쫓겨남 낱말, 또는 «위기/갑자기» + 실직·폐업·수입·돈·월세.
      // «막막·급하·당장»만으로는 켜지 않는다(«취업 준비가 막막» 같은 말) — 그때는 안내 띠만.
      urgentCrisis: has(text, CRISIS_HARD) || (has(text, CRISIS_SOFT) && has(text, CRISIS_CAUSE)),
      // 폭력 피해(S5b-2): 1366 고정 카드
      urgentViolence: !!tags.violence,
      // 생명 위기 낱말(S5b-2): 이때는 결과 맨 위에 109 고정 카드
      urgentSuicide: has(text, SUICIDE_WORDS)
    };
  }

  // ── 대상 한정 관문(S9b-2, 10-29) ─────────────────────────
  // 이름이 «특정 피해자·특정 신분»을 가리키는 사업은 말 속에 그 사정이 «직접» 나올 때만 추천한다.
  // 원인: 일반 욕구 꼬리표(채무·실직·돌봄·위기)만으로 «성매매 방지 및 피해자 지원»(rule any:debt)·«출소자 취업지원»(any:unemployed)이
  //       뜨거나, 공무원 창구가 본문 «의료·법률·직업훈련·자활» 낱말로 생계·일자리 꼬리표를 붙여 실직 가구에 성매매 피해 지원을 냈다.
  var GATES = [
    [/성매매/, /성매매|성착취|성매수|성 ?구매/],
    [/성폭력/, /성폭력|성추행|성폭행|강간|성범죄|몹쓸 짓/],
    [/가정폭력|폭력 ?피해/, /폭력|때리|때려|맞았|맞아|맞고|폭행|위협|스토킹/],
    [/범죄 ?피해/, /범죄|폭행|때리|때려|강도|사기를 당|사기 피해|피해를 당|스토킹/],
    [/자동차 ?사고|교통 ?사고/, /교통사고|교통 사고|자동차 ?사고|차 사고|차에 치|사고로/],
    [/원폭/, /원폭|피폭|히로시마|나가사키/],
    [/한센/, /한센/],
    [/납북/, /납북/],
    [/북한이탈|탈북/, /북한|탈북/],
    [/노숙/, /노숙|거리에서 자|길에서 자|역에서 자|잘 곳이 없|머물 곳이 없/],
    [/중독/, /중독|알코올|술을 끊|술 때문|도박|마약/],
    [/출소|교정|보호관찰|수형/, /출소|교도소|수감|복역|보호관찰|형을 살/],
    [/자립준비|보호종료/, /보육원|시설에서 나|보호종료|자립준비|그룹홈|위탁 ?가정/],
    [/보훈|유공자|참전|고엽제|제대군인|독립유공/, /보훈|유공자|참전|고엽제|제대군인|장기복무|독립운동/],
    [/산재/, /산재|일하다 다|작업 ?중 ?다|공장에서 다|업무 ?중 ?다|현장에서 다/],
    [/결혼이민|다문화|외국인|이주민/, /다문화|결혼이민|외국인|이주|베트남|필리핀|캄보디아|중국에서 왔|귀화/],
    [/입양|가정위탁/, /입양|위탁/]
  ];
  /** 이 서비스를 이 말에 추천해도 되나 — 관문에 걸리는 이름인데 말에 그 사정이 없으면 false */
  function gateOk(svc, text) {
    var n = (svc && svc.name) || "", t = String(text || "");
    // 이름이 여러 대상을 함께 가리키면(«가정폭력·성폭력 등 폭력 피해자») 그중 하나의 사정만 나와도 된다
    var hit = false;
    for (var i = 0; i < GATES.length; i++) if (GATES[i][0].test(n)) { if (GATES[i][1].test(t)) return true; hit = true; }
    return !hit;
  }
  // 공무원 창구 욕구 범주 ← 서비스 규칙(rule) 꼬리표. boost(가점용)는 쓰지 않는다 — 본문 낱말로 범주를 붙이지 않기 위함
  var RULE_TO_NEED = { lowIncome: ["생계"], crisis: ["긴급", "생계"], food: ["생계"], unemployed: ["일자리"], sick: ["의료"], housing: ["주거"],
    energy: ["에너지"], alone: ["돌봄"], careNeed: ["돌봄"], dementia: ["돌봄", "의료"], senior: ["돌봄"], disability: ["장애"],
    child: ["아동"], infant: ["아동"], singleParent: ["아동", "생계"], debt: ["금융·채무"], mental: ["정신건강"], violence: ["긴급"], pregnancy: ["의료"] };
  function needsFromRule(rule) {
    var r = rule || {}, out = [];
    ["req", "all", "any", "name"].forEach(function (k) { (r[k] || []).forEach(function (t) { (RULE_TO_NEED[t] || []).forEach(function (n) { if (out.indexOf(n) < 0) out.push(n); }); }); });
    return out;
  }

  function tagSet(p) { var s = {}; p.tags.forEach(function (t) { s[t] = true; }); return s; }

  /** 서비스 하나를 프로필에 대 본다 → null(해당 없음) 또는 {score, reasons, ageNote} */
  function judge(svc, p, T, text) {
    var r = svc.rule || {};
    if (!gateOk(svc, text)) return null;
    var reasons = [], score = 0, ageNote = "";
    var waived = (r.ageAlt || []).some(function (t) { return T[t]; });
    if (r.ageMin != null || r.ageMax != null) {
      if (p.ageKnown && !waived) {
        if (r.ageMin != null && p.age < r.ageMin) return null;
        if (r.ageMax != null && p.age > r.ageMax) return null;
        score += 2;
        if (r.ageMin >= 60) reasons.push(p.ageLabel + "(만 " + r.ageMin + "세 이상)");
      } else if (!waived) {
        if (r.ageMin >= 60 && !T.senior) return null;      // 어르신 사업인데 어르신이라는 단서가 없음
        if (r.ageMin >= 60) { reasons.push("어르신"); ageNote = "나이 확인 필요"; score += 1; }
      } else {
        reasons.push(REASON[(r.ageAlt || []).filter(function (t) { return T[t]; })[0]]);
        score += 2;
      }
    }
    if (r.childAgeMax != null && p.childAges.length && Math.min.apply(null, p.childAges) > r.childAgeMax) return null;
    // 자녀 나이 하한(S5b-2): 말한 자녀가 모두 하한보다 어리면 제외(예: 초등생 자녀 → 중고교 입학 교복비 제외)
    if (r.childAgeMin != null && p.childAges.length && Math.max.apply(null, p.childAges) < r.childAgeMin) return null;
    // 이름이 대상을 가리키는 사업(장애·산모·한부모·치매)은 그 상황이 하나 이상 꼭 있어야 한다
    if ((r.req || []).length && !r.req.some(function (t) { return T[t]; })) return null;
    var all = r.all || [];
    for (var i = 0; i < all.length; i++) { if (!T[all[i]]) return null; }
    all.forEach(function (t) { reasons.push(REASON[t]); score += 2; });
    var any = (r.any || []).filter(function (t) { return T[t]; });
    if ((r.any || []).length && !any.length) return null;
    any.forEach(function (t) { if (reasons.indexOf(REASON[t]) < 0) reasons.push(REASON[t]); score += 2; });
    (r.boost || []).forEach(function (t) { if (T[t]) { score += 1; if (reasons.length < 3 && reasons.indexOf(REASON[t]) < 0) reasons.push(REASON[t]); } });
    if (!reasons.length) return null;
    if (svc.urgent && (p.urgentCrisis || p.urgentSuicide)) score += 100;   // 긴급 가점은 좁은 위기 판정일 때만
    score += r.base || 0;            // 기본이 되는 서비스(기초연금·구직급여 등)를 앞에 두는 가중
    // 이름에 사용자 상황이 드러난 사업을 앞에(«난방» 문장 → 에너지바우처·연료비), 상황별 기본 서비스 가점(core)
    var nameHit = (r.name || []).filter(function (t) { return T[t]; }).length;
    // 난방(energy)은 이름 가점을 크게(재검수 ⑤: «78세 혼자 난방비 걱정»에 노인 수술 사업이 앞서던 것)
    score += (r.name || []).reduce(function (a, t) { return a + (T[t] ? (NAME_WEIGHT[t] || 3) : 0); }, 0);
    // 기본 서비스 가점은 «긴급» 말고 그 서비스 고유의 상황(난방·생계·주거…)이 이름과 겹칠 때만
    var coreHit = (r.name || []).some(function (t) { return t !== "crisis" && T[t]; });
    if (coreHit || (r.core && (r.ageMin || 0) >= 60)) score += r.core || 0;
    return { score: score, reasons: reasons.slice(0, 3), ageNote: ageNote };
  }

  function ruleReason(svc, j) {
    var s = "말씀하신 «" + j.reasons.join(" · ") + "»에 해당될 수 있어요.";
    if (svc.means_tested) s += " 최종 여부는 소득·재산 확인 뒤 정해집니다.";
    if (j.ageNote) s += " (" + j.ageNote + ")";
    return s;
  }

  function matchRules(p, catalog, limit, text) {
    var T = tagSet(p), out = [];
    (catalog.services || []).forEach(function (svc) {
      var j = judge(svc, p, T, text);
      if (j) out.push({ service: svc, score: j.score, reason: ruleReason(svc, j) });
    });
    out.sort(function (a, b) { return b.score - a.score || a.service.id.localeCompare(b.service.id); });
    return out.slice(0, limit || 8);
  }

  var HONOR = { "어머니": "어머님", "아버지": "아버님", "배우자": "배우자분", "자녀": "자녀분", "형제·자매": "형제·자매분", "이웃·지인": "이웃분", "그 밖의 가족": "가족분" };
  function who(p) {
    if (!p.isProxy) return "";
    return (HONOR[p.relation] || "가족분") + " ";
  }
  function ruleSummary(p, items) {
    var bits = [];
    if (p.ageKnown) bits.push(p.ageLabel);
    else if (p.tags.indexOf("senior") >= 0) bits.push("어르신");
    p.tags.forEach(function (t) { if (t !== "senior" && REASON[t]) bits.push(REASON[t]); });
    var head = bits.length ? who(p) + "상황을 이렇게 들었어요: " + bits.join(", ") + "." : "말씀만으로는 조건을 다 알기 어려웠어요.";
    var tail = items.length ? " 받을 수 있을 만한 도움 " + items.length + "가지를 먼저 보여 드려요." : " 아래 상담 전화나 담당 공무원에게 도움을 요청해 보세요.";
    return head + tail;
  }

  function cfg() { return window.DAEUM_CONFIG || {}; }

  /** Edge Function 호출(국민·공무원 공통). 시간 초과·HTTP 오류는 예외로 던진다 */
  function post(body) {
    var c = cfg();
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var to = setTimeout(function () { try { ctl && ctl.abort(); } catch (e) {} }, c.aiTimeoutMs || 15000);
    var headers = { "Content-Type": "application/json" };
    if (c.aiAnonKey) { headers.Authorization = "Bearer " + c.aiAnonKey; headers.apikey = c.aiAnonKey; }
    return fetch(c.aiEndpoint, { method: "POST", headers: headers, signal: ctl ? ctl.signal : undefined, body: JSON.stringify(body) })
      .then(function (res) {
        clearTimeout(to);
        if (!res.ok) throw new Error("AI 서버 응답 " + res.status);
        return res.json();
      }, function (e) { clearTimeout(to); throw e; });
  }
  // 비용 상한(10-29): 함수는 services 를 앞에서 60건까지만 받는다. 화면은 규칙 관련도 순 상위 AI_MAX_SERVICES 건만 보낸다.
  var AI_MAX_SERVICES = 50;
  // S6d: AI 앞 후보 50건에 «반드시 넣을» 묶음 — 태그 점수 규칙으로는 순위 밖으로 밀려 정답이 아예 전송되지 않던 것(정확도 표본 C1~C3·C5·G3).
  // 고르는 것은 AI다 — 여기서는 후보에 넣기만 한다(규칙만 모드 결과는 바꾸지 않음). 서비스는 이름 일부로 찾는다.
  var PIN_RULES = [
    { when: function (p) { return p.urgentCrisis || p.urgentSuicide || p.urgentViolence; }, names: ["긴급복지 생계지원", "희망복지지원단"] },
    { words: ["장례", "장제", "세상을 떠", "사망", "상을 당", "장사 지내", "장사 치르"], names: ["긴급복지 장제비지원", "장제급여", "사망일시금"] },
    { words: ["농사", "농업", "영농", "농삿일", "밭일", "논일", "과수원", "농작업", "농장"], names: ["영농도우미", "농업인안전보험", "농업인 건강보험료"] }
  ];
  function pinnedIds(text, profile, all) {
    var t = " " + String(text || "").replace(/\s+/g, " ") + " ", ids = [];
    PIN_RULES.forEach(function (r) {
      var on = r.when ? r.when(profile) : has(t, r.words);
      if (!on) return;
      r.names.forEach(function (n) { all.forEach(function (s) { if ((s.name || "").indexOf(n) >= 0 && ids.indexOf(s.id) < 0) ids.push(s.id); }); });
    });
    return ids;
  }
  function clip(v, n) { v = v == null ? "" : String(v); return v.length > n ? v.slice(0, n) : v; }
  function compactSvc(s, target, support) {
    return { id: s.id, name: clip(s.name, 60), target: clip(target, 160), support: clip(support, 120) };
  }
  /** 관련도 순서로 앞을 채우고 나머지는 원래 순서로 덧붙인 뒤 max 건에서 자른다 */
  function topFirst(all, firstIds, max) {
    var seen = {}, out = [];
    firstIds.forEach(function (id) { seen[id] = 1; });
    var byId = {}; all.forEach(function (s) { byId[s.id] = s; });
    firstIds.forEach(function (id) { if (byId[id]) out.push(byId[id]); });
    all.forEach(function (s) { if (!seen[s.id]) out.push(s); });
    return out.slice(0, max || AI_MAX_SERVICES);
  }
  function logUsage(tag, ans, sent) {
    var u = ans && ans.usage;
    if (window.console) console.info("[닿음 AI] " + tag + " 보낸 서비스 " + sent + "건 · 입력 토큰 " + (u ? u.input_tokens : "?") + " · 출력 토큰 " + (u ? u.output_tokens : "?"));
  }
  /** 응답 picks 를 목록(byId)에 있는 것만 남긴다 */
  function keepKnown(ans, byId, max, text) {
    return ((ans && ans.picks) || []).filter(function (p) { return p && typeof p.id === "string" && byId[p.id] && gateOk(byId[p.id], text); }).slice(0, max || 8);
  }

  /** 서버가 외부 AI로 보내기 전에 가린 개인정보 건수(S10l-①) → 화면 한 줄 */
  function redactNote(r) {
    var n = 0; Object.keys(r || {}).forEach(function (k) { n += +r[k] || 0; });
    return n ? "개인정보 " + n + "건을 가린 뒤 AI에 보냈어요." : "";
  }

  function callEdge(input, profile, catalog) {
    // 규칙 관련도 순(맞는 것 → 위기 상담전화 → 나머지 원래 순서) 상위만 보낸다 — 전체 목록을 통째로 보내지 않는다
    var all = catalog.services || [];
    var ranked = matchRules(profile, catalog, all.length, input.text).map(function (r) { return r.service.id; });
    all.forEach(function (s) { if (s.urgent && ranked.indexOf(s.id) < 0) ranked.push(s.id); });
    // 태그 규칙에 안 걸리는 서비스(보훈·창업 등)도 문장 낱말이 이름·대상에 겹치면 그다음 순서로 올린다
    var stems = unique((String(input.text || "").match(/[가-힣A-Za-z]{2,}/g) || []).map(function (w) { return w.slice(0, 2); }))
      .filter(function (w) { return ["그리", "있어", "없어", "하고", "해서", "너무", "요즘", "지금"].indexOf(w) < 0; });
    all.map(function (s) {
      var hay = (s.name || "") + " " + (s.target || "");
      return { id: s.id, n: stems.filter(function (w) { return hay.indexOf(w) >= 0; }).length };
    }).filter(function (x) { return x.n > 0 && ranked.indexOf(x.id) < 0; })
      .sort(function (a, b) { return b.n - a.n; })
      .forEach(function (x) { ranked.push(x.id); });
    // 반드시 넣을 묶음은 규칙 상위 10건 바로 뒤에 끼운다(50건 안 보장, 규칙이 이미 앞에 둔 것은 그 자리 유지)
    var pins = pinnedIds(input.text, profile, all).filter(function (id) { var i = ranked.indexOf(id); return i < 0 || i >= 10; });
    ranked = ranked.filter(function (id) { return pins.indexOf(id) < 0; });
    Array.prototype.splice.apply(ranked, [Math.min(ranked.length, 10), 0].concat(pins));
    var compact = topFirst(all, ranked, AI_MAX_SERVICES).map(function (s) { return compactSvc(s, s.target, s.support); });
    // 학교급으로 «추정»한 자녀 나이는 숫자로 보내지 않는다(AI가 «7살, 12살»처럼 단정해 되읊음 — S5b-2 시험)
    var sentProfile = Object.assign({}, profile);
    if (profile.childAgesGuess) {
      sentProfile.childAges = [];
      sentProfile.childAgeNote = "자녀 나이는 말씀하지 않음(학교급으로 본 범위 " + profile.childAges.join("~") + "세 — 요약에 숫자로 쓰지 말 것)";
    }
    return post({ situation: String(input.text || "").slice(0, 1200), proxy: input.proxy || {}, profile: sentProfile, services: compact })
      .then(function (ans) { logUsage("국민", ans, compact.length); return ans; });
  }

  function recommend(input, catalog) {
    var profile = analyze(input);
    var rules = matchRules(profile, catalog, 10, input.text);
    var base = { profile: profile, urgent: profile.urgent };
    var c = cfg();
    if (!c.aiEndpoint) {
      return Promise.resolve(Object.assign(base, { mode: "rules", summary: ruleSummary(profile, rules), items: rules,
        notice: "AI 연결 전 시연 모드 — 말씀 속 낱말과 나이로 규칙에 맞춰 찾았어요." }));
    }
    var byId = {};
    (catalog.services || []).forEach(function (s) { byId[s.id] = s; });
    return callEdge(input, profile, catalog).then(function (ans) {
      var items = keepKnown(ans, byId, 8, input.text).map(function (p, i) {
        var svc = byId[p.id];
        var reason = String(p.reason || "").slice(0, 200);
        if (svc.means_tested && reason.indexOf("소득") < 0) reason += " 최종 여부는 소득·재산 확인 뒤 정해집니다.";
        return { service: svc, score: 100 - i, reason: reason };
      });
      if (!items.length) throw new Error("AI 답에 목록 안의 서비스가 없음");
      // 위기 낱말이 있으면 상담전화는 AI 답과 상관없이 맨 위에 둔다
      rules.filter(function (r) { return r.service.urgent; }).forEach(function (r) {
        if (!items.some(function (x) { return x.service.id === r.service.id; })) items.unshift(r);
      });
      return Object.assign(base, { mode: "ai", summary: String(ans.summary || "").slice(0, 400) || ruleSummary(profile, items), items: items, redacted: ans.redacted || null, notice: redactNote(ans.redacted) });
    }).catch(function (e) {
      if (window.console) console.warn("[닿음 AI] 규칙 모드로 전환:", e && e.message);
      return Object.assign(base, { mode: "rules", summary: ruleSummary(profile, rules), items: rules,
        notice: "지금 AI 안내에 연결되지 않아, 말씀 속 낱말과 나이로 찾았어요." });
    });
  }

  // ── 공무원 창구: 상담 기록 요약 ─────────────────────────
  // 욕구 범주 ← 지표·특성(data/households.json 의 indicators·traits 키)
  var NEED_FROM_INDICATOR = {
    power_cut: ["에너지", "긴급"], water_cut: ["긴급"], gas_cut: ["에너지", "긴급"],
    health_ins_arrears: ["의료", "생계"], telecom_arrears: ["생계"], mgmt_fee_arrears: ["주거"],
    rent_arrears: ["주거"], medical_overspend: ["의료"], job_loss: ["일자리", "생계"],
    loan_overdue: ["금융·채무"], benefit_stopped: ["생계"],
    single_elderly: ["돌봄"], disability: ["장애"], child: ["아동"]
  };
  // 욕구 범주 ← 상담 말 속 낱말
  var NEED_KEYWORDS = [
    [/전기|불이 안|난방|보일러|기름|가스|추워/, "에너지", "난방·전기 문제"],
    [/병원|약값|약을|수술|아파|아프|치료|입원/, "의료", "의료비·치료 부담"],
    [/월세|집세|집주인|이사|쫓겨|관리비/, "주거", "주거비·거처 불안"],
    [/일자리|일을 못|해고|실직|일 그만|일거리|그만두/, "일자리", "소득 활동 중단"],
    [/빚|대출|카드값|독촉|연체|이자/, "금융·채무", "채무 독촉"],
    [/혼자|외롭|밥 챙|끼니를 거|말동무|돌봐/, "돌봄", "돌봄·안부 공백"],
    [/우울|잠을 못|죽고|살기 싫|막막|힘들어/, "정신건강", "정서적 어려움"],
    [/손주|아이|학교|애들/, "아동", "아동 양육 부담"],
    [/휠체어|장애|거동/, "장애", "거동·장애 지원"],
    [/쌀|먹을 게|굶|생활비|돈이 없/, "생계", "생계비 부족"]
  ];
  var OFFICER_URGENT = /죽고|살기 싫|굶|쫓겨|불이 안/;

  function unique(a) { var s = {}, o = []; a.forEach(function (x) { if (!s[x]) { s[x] = 1; o.push(x); } }); return o; }

  function ruleSummarize(text, ctx) {
    text = String(text || ""); ctx = ctx || {};
    var issues = [], needs = [];
    (ctx.factors || []).forEach(function (f) {
      issues.push(f.name);
      needs = needs.concat(NEED_FROM_INDICATOR[f.key] || []);
    });
    var heard = [];
    NEED_KEYWORDS.forEach(function (k) { if (k[0].test(text)) { needs.push(k[1]); heard.push(k[2]); } });
    var urgent = OFFICER_URGENT.test(text);
    if (urgent) needs.unshift("긴급");
    needs = unique(needs);
    issues = unique(issues.concat(heard));
    var svc = (ctx.services || []).filter(function (s) { return gateOk(s, text); }).map(function (s) {
      var hit = (s.tags || []).filter(function (t) { return needs.indexOf(t) >= 0; });
      return { s: s, n: hit.length, hit: hit };
    }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
    var first = text.replace(/\s+/g, " ").trim();
    var summary = (ctx.label || "가구") + " 상담. " +
      (heard.length ? "상담에서 " + heard.join(", ") + "이(가) 확인됨. " : "") +
      (ctx.factors && ctx.factors.length ? "사전 지표: " + ctx.factors.map(function (f) { return f.name; }).join(", ") + ". " : "") +
      (urgent ? "긴급 대응 검토 필요. " : "") +
      (first ? "기록 " + first.length + "자." : "기록 없음.");
    return { summary: summary, issues: issues, needs: needs, urgent: urgent,
      serviceIds: svc.map(function (x) { return x.s.id; }),
      why: svc.reduce(function (m, x) { m[x.s.id] = x.hit; return m; }, {}), reasons: {}, source: "rule" };
  }

  /** 공무원 요약 — 함수 형식 그대로 보낸다. 쟁점·욕구·긴급은 규칙 값을 두고, 요약·연계 후보만 AI 답으로 바꾼다 */
  function summarize(text, ctx) {
    ctx = ctx || {};
    var r = ruleSummarize(text, ctx);
    if (!cfg().aiEndpoint || !String(text || "").trim()) return Promise.resolve(r);
    var byId = {};
    (ctx.services || []).forEach(function (s) { byId[s.id] = s; });
    var ranked = (ctx.services || []).filter(function (s) { return gateOk(s, text); }).map(function (s) {
      return { id: s.id, n: (s.tags || []).filter(function (t) { return r.needs.indexOf(t) >= 0; }).length };
    }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; }).map(function (x) { return x.id; });
    var compact = topFirst(ctx.services || [], ranked, AI_MAX_SERVICES).map(function (s) {
      return compactSvc(s, s.target || ("욕구 범주: " + (s.tags || []).join(", ")), s.support || (s.org ? "소관: " + s.org : ""));
    });
    return post({
      situation: ("[담당 공무원 상담 기록] " + String(text)).slice(0, 1200),
      proxy: { isProxy: false },
      profile: { kind: "officer.record", label: ctx.label || "", factors: (ctx.factors || []).map(function (f) { return f.name; }), needs: r.needs, urgent: r.urgent },
      services: compact
    }).then(function (ans) {
      logUsage("공무원", ans, compact.length);
      var picks = keepKnown(ans, byId, 8, text);
      if (!picks.length) throw new Error("AI 답에 목록 안의 서비스가 없음");
      var reasons = {};
      picks.forEach(function (p) { reasons[p.id] = String(p.reason || "").slice(0, 200); });
      var ids = picks.map(function (p) { return p.id; });
      // 규칙이 «긴급»으로 본 서비스는 AI가 빠뜨려도 앞에 남긴다
      if (r.urgent) r.serviceIds.filter(function (id) { return (r.why[id] || []).indexOf("긴급") >= 0 && ids.indexOf(id) < 0; })
        .reverse().forEach(function (id) { ids.unshift(id); });
      return Object.assign({}, r, { summary: String(ans.summary || "").slice(0, 400) || r.summary, serviceIds: ids, reasons: reasons, source: "ai", redacted: ans.redacted || null });
    }).catch(function (e) {
      if (window.console) console.warn("[닿음 AI] 공무원 요약 규칙 모드로 전환:", e && e.message);
      r.fallback = String((e && e.message) || e); return r;
    });
  }

  window.DaeumAI = {
    recommend: recommend, analyze: analyze, matchRules: matchRules,
    summarize: summarize, ruleSummarize: ruleSummarize, needFromIndicator: NEED_FROM_INDICATOR,
    gateOk: gateOk, needsFromRule: needsFromRule, GATES: GATES,
    chips: CHIPS, reasonLabel: REASON,
    mode: function () { return cfg().aiEndpoint ? "ai" : "rules"; }
  };
})();
