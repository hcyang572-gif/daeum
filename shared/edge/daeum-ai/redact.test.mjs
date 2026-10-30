/* 개인정보 가림 시험 — S10l-①(⚙️ 파로, 2026-10-30).
   실행: node shared/edge/daeum-ai/redact.test.mjs   (03_시제품 폴더에서, node 24 이상 — .ts 를 타입 제거로 그대로 읽는다)
   AI 호출 0회. ① 가려야 하는 것 ② 가리면 안 되는 것(상황 이해에 필요한 말) ③ profile 깊은 가림. */
import assert from "node:assert";
import { redactText, redactValue, total } from "./redact.ts";

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

// ① 가려야 하는 것: [입력, 결과에 없어야 할 원문 조각, 나와야 할 표식, 종류]
const MUST = [
  ["제 번호는 010-1234-5678이에요", "1234-5678", "[전화]", "phone"],
  ["010 1234 5678로 연락 주세요", "1234 5678", "[전화]", "phone"],
  ["010.9876.5432 입니다", "9876.5432", "[전화]", "phone"],
  ["01055556666 으로 문자", "55556666", "[전화]", "phone"],
  ["집 전화 054-537-1234", "537-1234", "[전화]", "phone"],
  ["054)531-7777 로 걸면 돼요", "531-7777", "[전화]", "phone"],
  ["+82 10-2222-3333", "2222-3333", "[전화]", "phone"],
  ["주민번호 450312-2345678 입니다", "2345678", "[주민번호]", "rrn"],
  ["450312-2****** 이고요", "450312", "[주민번호]", "rrn"],
  ["4503122345678", "4503122345678", "[주민번호]", "rrn"],
  ["메일은 hong.gd@naver.com 이에요", "hong.gd@naver.com", "[이메일]", "email"],
  ["농협 352-1234-5678-93 으로 넣어 주세요", "352-1234-5678-93", "[계좌]", "account"],
  ["계좌 110123456789", "110123456789", "[계좌]", "account"],
  ["상주시 중앙로 123-4에 살아요", "중앙로 123-4", "[주소]", "address"],
  ["왕산로 25번길 7 단독주택", "왕산로 25번길 7", "[주소]", "address"],
  ["함창읍 오사리 123-4 번지에 혼자", "123-4", "[주소]", "address"],
  ["낙동면 신오리 45-2 에 계세요", "45-2", "[주소]", "address"],
  ["푸른아파트 101동 1203호", "1203호", "[동호수]", "address"],
  ["홍길동 씨가 아파요", "홍길동", "[이름]", "name"],
  ["김순자 할머니가 혼자 사세요", "김순자", "[이름]", "name"],
  ["박영희님 대신 여쭤요", "박영희", "[이름]", "name"],
  ["이말순 어르신이 거동이 불편하세요", "이말순", "[이름]", "name"],
  ["어머니 성함은 최복례예요", "최복례", "[이름]", "name"],
];
console.log("① 가려야 하는 것 " + MUST.length + "건");
MUST.forEach(([inp, gone, mark, kind]) => t(inp, () => {
  const c = {};
  const out = redactText(inp, c);
  assert.ok(out.indexOf(gone) < 0, "남음: " + out);
  assert.ok(out.indexOf(mark) >= 0, "표식 없음: " + out);
  assert.ok(c[kind] >= 1, "건수 없음: " + JSON.stringify(c));
}));

// ② 가리면 안 되는 것: 결과가 입력과 똑같아야 한다
const KEEP = [
  "함창읍에 사는 70세 어머니가 혼자 지내세요",
  "기초연금을 받고 있고 월 80만원 정도 벌어요",
  "외남면 할머니가 치매 진단을 받으셨어요",
  "남원동 어르신 댁에 난방비가 걱정이에요",
  "옆집 할머니가 쓰러지셨어요",
  "우리 어머님이 82세이신데 혼자 계세요",
  "복지사님이 다녀가셨어요",
  "주무관님께 긴급복지 생계지원을 여쭤봤어요",
  "급하면 129나 109에 전화하라고 하더라고요",
  "앞으로 3개월 동안 월세 30만원이 밀려 있어요",
  "버스로 30분 걸려서 병원에 가요",
  "2026년 10월 30일에 수술했어요",
  "손주 2명을 키우고 있고 장애인연금 신청하고 싶어요",
  "따로 20만원씩 드려요",
  "부모님이 모두 80대세요",
  "1588-1234 같은 콜센터는 연결이 안 돼요",
];
console.log("② 가리면 안 되는 것 " + KEEP.length + "건");
KEEP.forEach((inp) => t(inp, () => {
  const c = {};
  const out = redactText(inp, c);
  assert.strictEqual(out, inp);
  assert.strictEqual(total(c), 0);
}));

// ③ profile·문장 섞인 경우
console.log("③ 조건(profile) 깊은 가림");
t("profile 개인정보 칸은 값째, 나머지는 그대로", () => {
  const c = {};
  const p = { age: 82, tags: ["senior", "alone"], name: "김순자", phone: "010-1111-2222", region: "함창읍", memo: "아들 연락처 010-3333-4444" };
  const o = redactValue(p, c);
  assert.strictEqual(o.name, "[이름]");
  assert.strictEqual(o.phone, "[전화]");
  assert.strictEqual(o.region, "함창읍");
  assert.strictEqual(o.age, 82);
  assert.deepStrictEqual(o.tags, ["senior", "alone"]);
  assert.strictEqual(o.memo, "아들 연락처 [전화]");
  assert.strictEqual(p.name, "김순자", "원본이 바뀜");
  assert.deepStrictEqual(c, { name: 1, phone: 2 });
});
t("한 문장 여러 종류 건수", () => {
  const c = {};
  const out = redactText("홍길동 씨(010-1234-5678)가 중앙로 12-3에 살고 김영자 할머니를 모셔요", c);
  assert.deepStrictEqual(c, { phone: 1, address: 1, name: 2 });
  assert.ok(out.indexOf("모셔요") > 0 && out.indexOf("할머니") > 0, out);
});

console.log("\n결과: 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
