/* AI 사용 기간·끄기 스위치 시험(11-02). 실행: node shared/edge/daeum-ai/gate.test.mjs (03_시제품에서, node 24 이상). AI·DB 호출 0회. */
import assert from "node:assert";
import { aiGate, DEFAULT_AI_UNTIL } from "./gate.ts";

let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }
const at = (s) => Date.parse(s);

t("기본 종료일은 2026-11-26 00:00 한국시각", () => assert.equal(DEFAULT_AI_UNTIL, "2026-11-26T00:00:00+09:00"));
t("지금(11-02)은 열림·남은 24일", () => { const g = aiGate(at("2026-11-02T12:00:00+09:00"), {}); assert.equal(g.open, true); assert.equal(g.daysLeft, 24); });
t("종료 1초 전은 열림", () => assert.equal(aiGate(at("2026-11-25T23:59:59+09:00"), {}).open, true));
t("종료 시각 정각은 닫힘(ended)", () => { const g = aiGate(at("2026-11-26T00:00:00+09:00"), {}); assert.equal(g.open, false); assert.equal(g.why, "ended"); assert.equal(g.daysLeft, 0); });
t("날짜 지난 경우(12월) 닫힘", () => assert.equal(aiGate(at("2026-12-15T09:00:00+09:00"), {}).why, "ended"));
t("OFF=1 이면 기간 안이어도 닫힘", () => { const g = aiGate(at("2026-11-02T12:00:00+09:00"), { off: "1" }); assert.equal(g.open, false); assert.equal(g.why, "off"); });
t("OFF=true/on 도 닫힘", () => { assert.equal(aiGate(0, { off: "true" }).why, "off"); assert.equal(aiGate(0, { off: "ON" }).why, "off"); });
t("OFF=0·빈값은 무시", () => { assert.equal(aiGate(at("2026-11-02T00:00:00+09:00"), { off: "0" }).open, true); assert.equal(aiGate(at("2026-11-02T00:00:00+09:00"), { off: "" }).open, true); });
t("연장(UNTIL)하면 12월에도 열림", () => { const g = aiGate(at("2026-12-15T09:00:00+09:00"), { until: "2027-01-31T00:00:00+09:00" }); assert.equal(g.open, true); assert.equal(g.until, "2027-01-31T00:00:00+09:00"); });
t("연장 날짜도 지나면 닫힘", () => assert.equal(aiGate(at("2027-02-01T00:00:00+09:00"), { until: "2027-01-31T00:00:00+09:00" }).why, "ended"));
t("연장 중이어도 OFF가 우선", () => assert.equal(aiGate(at("2026-12-15T09:00:00+09:00"), { until: "2027-01-31T00:00:00+09:00", off: "1" }).why, "off"));
t("UNTIL 형식 오류는 기본값으로(무한 연장 방지)", () => { const g = aiGate(at("2026-12-15T09:00:00+09:00"), { until: "언젠가" }); assert.equal(g.open, false); assert.equal(g.until, DEFAULT_AI_UNTIL); });
t("UNTIL 을 앞당기면 즉시 닫힘", () => assert.equal(aiGate(at("2026-11-10T00:00:00+09:00"), { until: "2026-11-09" }).why, "ended"));

console.log(`\n기간·스위치 시험: 통과 ${pass} · 실패 ${fail}`);
process.exitCode = fail ? 1 : 0;
