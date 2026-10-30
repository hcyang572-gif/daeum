/* 닿음 S10l ③ 추천 현장 적합률 자체 시험 — 실행: node officer/s10l3.test.js (03_시제품 폴더에서). 의존성 없음. */
"use strict";
var assert = require("assert");
var path = require("path");
var F = require(path.join(__dirname, "fit_rate.js"));
var D = require(path.join(__dirname, "..", "data/households.json"));

var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }
function at(i) { return new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(); }

console.log("③ 추천 맞아요/아니에요");
t("빈 기록이면 시연 예시(가상)로 — demo 표시·적합률 계산", function () {
  var s = F.summary([]); assert.strictEqual(s.demo, true); assert.strictEqual(s.n, F.DEMO.length);
  assert.strictEqual(s.rate, Math.round(s.yes * 100 / s.n)); assert.ok(s.misses.every(function (m) { return m.demo; }));
});
t("시연 예시 가구 번호는 모두 가상 명단에 있는 번호", function () {
  var ids = D.households.map(function (h) { return h.id; });
  F.DEMO.forEach(function (x) { assert.ok(ids.indexOf(x.householdId) >= 0, x.householdId); });
});
t("실제 표시가 1건이라도 생기면 예시는 빠진다", function () {
  var l = F.mark([], { householdId: "B-048", serviceId: "S02", serviceName: "긴급복지지원", verdict: "no", at: at(1) });
  var s = F.summary(l); assert.strictEqual(s.demo, false); assert.strictEqual(s.n, 1); assert.strictEqual(s.rate, 0); assert.strictEqual(s.misses.length, 1);
});
t("다시 누르면 바뀌고(한 가구·한 서비스 1건), 같은 것을 또 누르면 취소", function () {
  var r = { householdId: "A-005", serviceId: "S01", serviceName: "생계급여" };
  var l = F.mark([], Object.assign({ verdict: "yes" }, r));
  l = F.mark(l, Object.assign({ verdict: "no" }, r)); assert.strictEqual(l.length, 1); assert.strictEqual(F.verdictOf(l, "A-005", "S01"), "no");
  l = F.mark(l, Object.assign({ verdict: "no" }, r)); assert.strictEqual(l.length, 0); assert.strictEqual(F.verdictOf(l, "A-005", "S01"), null);
});
t("최근 30건만 센다(오래된 것은 적합률에서 빠짐)", function () {
  var l = [];
  for (var i = 0; i < 40; i++) l = F.mark(l, { householdId: "H" + i, serviceId: "S01", verdict: i < 10 ? "no" : "yes", at: at(i) });
  var s = F.summary(l); assert.strictEqual(s.n, 30); assert.strictEqual(s.rate, 100); assert.strictEqual(s.total, 40); assert.strictEqual(s.misses.length, 10);
});
t("저장 항목에 이름·상담 원문 칸이 없다(가구 번호·서비스·표시·출처·시각만)", function () {
  var l = F.mark([], { householdId: "B-035", serviceId: "S05", serviceName: "노인맞춤돌봄서비스", verdict: "yes", source: "ai", label: "가구 B-035 김가상", text: "상담 원문" });
  assert.deepStrictEqual(Object.keys(l[0]).sort(), ["at", "householdId", "serviceId", "serviceName", "source", "verdict"]);
});
t("출처 꼬리표 문구", function () { assert.strictEqual(F.SOURCE, "출처: 담당자 표시 기록(이 기기)"); });

console.log("\n결과: 통과 " + pass + " · 실패 " + fail);
if (fail) process.exit(1);
