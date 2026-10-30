// 닿음 AI — 외부 AI로 보내기 전 개인정보 가림(S10l-①, ⚙️ 파로 2026-10-30). 순수 함수, 의존성 없음.
// Deno(Edge Function)와 node 24(타입 제거 실행) 양쪽에서 그대로 돈다 — 타입은 지울 수 있는 것만 쓴다.
// 원칙: 상황 이해에 필요한 말(읍면동·나이·금액·서비스 이름·관계어)은 남기고, 사람을 특정하는 값만 표식으로 바꾼다.

export type RedactCounts = { [kind: string]: number };

const SURNAMES = "김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제탁국어은편용예봉경";
// 성씨로 시작하지만 사람 이름이 아닌 흔한 말(호칭 앞에 자주 오는 것)
const NOT_NAMES = new Set([
  "이웃", "이장", "이분", "이번", "이제", "이쪽", "우리", "우리집", "정말", "정도", "장애", "장남", "장녀", "한분", "한집", "한번", "혼자",
  "주무관", "주인", "집주인", "주민", "복지사", "사회복지사", "요양보호사", "간호사", "의사", "원장", "원래", "선생", "성함", "공무원",
  "담당", "통장", "반장", "회장", "부녀회장", "노인회장", "과장", "팀장", "계장", "면장", "동장", "읍장", "시장", "기사", "목사", "교수",
  "부모", "마음", "동네", "마을", "독거", "노인", "기초", "연금", "기초연금", "지금", "남편", "남자", "여자", "고객", "신청인", "보호자",
  "환자", "손님", "어르신", "할머니", "할아버지", "치매", "홀몸", "경로당", "요양", "도움", "소개", "방문", "안부", "옆집", "앞집", "윗집",
  "아랫집", "진짜", "구청", "시청", "동사무소", "민원", "석달", "하루", "오늘", "올해", "작년", "백세", "남매", "형제", "자매", "모두",
]);
// 상주시 읍면동(이름 뒤에 «할머니» 등이 와도 지명은 남긴다) — 끝이 읍·면·리인 말은 규칙으로 따로 거른다
const PLACE_DONG = new Set(["남원동", "북문동", "계림동", "동문동", "동성동", "신흥동", "상주동"]);

const TITLES = "할머니|할아버지|어르신|어머님|아버님|어머니|아버지|여사님|여사|선생님|씨|님";

function isName(tok: string): boolean {
  if (tok.length < 2 || tok.length > 4) return false;
  if (SURNAMES.indexOf(tok[0]) < 0) return false;
  if (NOT_NAMES.has(tok) || PLACE_DONG.has(tok)) return false;
  if (/[읍면리군구시도]$/.test(tok)) return false; // 함창읍·외남면·오태리·상주시 등 지명
  return true;
}

function digits(s: string): number { return (s.match(/\d/g) || []).length; }

type Rule = { kind: string; mark: string; re: RegExp; ok?: (m: string, ...g: string[]) => string | null };

// 순서가 중요하다: 주민번호 → 이메일 → 전화 → 계좌 → 주소 → 이름
const RULES: Rule[] = [
  { kind: "rrn", mark: "[주민번호]", re: /(?<!\d)\d{6}\s*[-–]\s*[1-8][\d*xX●○]{6}(?!\d)/g },
  { kind: "rrn", mark: "[주민번호]", re: /(?<!\d)\d{6}\s*[-–]\s*[1-8](?:\*|x|X|●|○){1,6}/g },
  { kind: "rrn", mark: "[주민번호]", re: /(?<!\d)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[1-8]\d{6}(?!\d)/g },
  { kind: "email", mark: "[이메일]", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  // 휴대전화·지역번호(054 등)·+82. 구분자는 -, ., 공백, 괄호. 109·129·1588 같은 대표번호는 남긴다
  { kind: "phone", mark: "[전화]", re: /(?<!\d)(?:\+82[\s.-]?|0)\d{1,2}\)?[\s.)-]{0,2}\d{3,4}[\s.-]{0,2}\d{4}(?!\d)/g },
  // 계좌번호: 하이픈 묶음 숫자(합 10~16자리) 또는 붙여 쓴 10~16자리
  { kind: "account", mark: "[계좌]", re: /(?<![\d,])\d{2,6}(?:[\s-]\d{2,7}){1,4}(?![\d,])/g, ok: (m) => (m.indexOf("-") >= 0 && digits(m) >= 10 && digits(m) <= 16 ? "[계좌]" : null) },
  { kind: "account", mark: "[계좌]", re: /(?<![\d,.])\d{10,16}(?![\d,.])/g },
  // 아파트 동·호수 «101동 1203호», «3층 302호»
  { kind: "address", mark: "[동호수]", re: /\d{1,4}\s*동\s*\d{1,5}\s*호/g },
  // 도로명 «중앙로 12-3», «남산2길 15», «왕산로 123번길 4»
  { kind: "address", mark: "[주소]", re: /([가-힣0-9]{1,10}(?:대로|로|길))\s*\d{1,4}(?:\s*번?길\s*\d{1,4})?(?:\s*[-–]\s*\d{1,4})?(?![\d,.])(?!\s*(?:세|살|원|만|천|백|명|개|년|월|일|시|분|주|달|회|번|곳|대|장|권|건|배|차례|kg|%|평|㎡|km|m\b|층|가지|군데))/g,
    ok: (_m, road) => (/(?:으로|^(?:앞|뒤|따|새|서|혼자|그대|이대|저대|마음대|제대|대)로)$/.test(road) ? null : "[주소]") },
  // 지번 «오태리 123-4», «남원동 45번지», «산 12번지»
  { kind: "address", mark: "[주소]", re: /(?:산\s*)?(?<![\d-])\d{1,4}(?:\s*[-–]\s*\d{1,4})?\s*번지/g },
  { kind: "address", mark: "[주소]", re: /(?<=[가-힣]{1,6}리\s+)\d{1,4}\s*[-–]\s*\d{1,4}(?!\d)/g },
  // «이름은 홍길동», «성함: 김순자»
  { kind: "name", mark: "[이름]", re: /(이름|성함)(\s*(?:은|는|이|이요|:)\s*)([가-힣]{2,3})/g,
    ok: (_m, a, b, c) => (isName(c) ? a + b + "[이름]" : null) },
  // «홍길동 씨/님/할머니/어르신» — 호칭 앞 2~4자, 성씨로 시작, 지명·흔한 말 제외
  { kind: "name", mark: "[이름]", re: new RegExp("(?<![가-힣])([가-힣]{2,4})(\\s?)(" + TITLES + ")(?![가-힣]*(?:앗|름))", "g"),
    ok: (_m, n, sp, t) => (isName(n) ? "[이름]" + sp + t : null) },
];

/** 문자열 하나를 가린다. counts 에 종류별 건수를 더한다. */
export function redactText(input: string, counts: RedactCounts = {}): string {
  let s = String(input ?? "");
  for (const r of RULES) {
    s = s.replace(r.re, (m: string, ...rest: unknown[]) => {
      const groups = rest.filter((x) => typeof x === "string") as string[];
      // 이미 표식이 된 부분은 다시 세지 않는다
      if (/^\[[^\]]+\]$/.test(m)) return m;
      const rep = r.ok ? r.ok(m, ...groups) : r.mark;
      if (rep == null) return m;
      counts[r.kind] = (counts[r.kind] || 0) + 1;
      return rep;
    });
  }
  return s;
}

// 화면이 뽑은 조건(profile)에 섞일 수 있는 «사람을 특정하는 칸» — 값째 표식으로 바꾼다
const PII_KEYS: { [k: string]: string } = {
  name: "name", fullname: "name", 이름: "name", 성명: "name", 성함: "name", label: "name",
  phone: "phone", tel: "phone", mobile: "phone", 전화: "phone", 연락처: "phone",
  address: "address", addr: "address", 주소: "address", road: "address",
  rrn: "rrn", ssn: "rrn", 주민번호: "rrn", 주민등록번호: "rrn",
  email: "email", 이메일: "email", account: "account", 계좌: "account", 계좌번호: "account",
};
const MARK: { [k: string]: string } = { name: "[이름]", phone: "[전화]", address: "[주소]", rrn: "[주민번호]", email: "[이메일]", account: "[계좌]" };

/** JSON 값을 깊게 돌며 문자열을 가린다(키 이름이 개인정보 칸이면 값째 바꾼다). 원본은 건드리지 않는다. */
export function redactValue(v: unknown, counts: RedactCounts = {}, depth = 0): unknown {
  if (depth > 6) return null;
  if (typeof v === "string") return redactText(v, counts);
  if (Array.isArray(v)) return v.slice(0, 100).map((x) => redactValue(x, counts, depth + 1));
  if (v && typeof v === "object") {
    const out: { [k: string]: unknown } = {};
    for (const [k, x] of Object.entries(v as { [k: string]: unknown })) {
      const kind = PII_KEYS[k.toLowerCase()];
      if (kind && x != null && x !== "" && (typeof x === "string" || typeof x === "number")) {
        // label 은 «가구 A-12»처럼 이름이 아닐 수 있으니 문장 규칙으로만 가린다
        if (k === "label") { out[k] = redactText(String(x), counts); continue; }
        counts[kind] = (counts[kind] || 0) + 1;
        out[k] = MARK[kind];
        continue;
      }
      out[k] = redactValue(x, counts, depth + 1);
    }
    return out;
  }
  return v;
}

export function total(counts: RedactCounts): number {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}
