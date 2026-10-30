/* 닿음 S10l ④ 도입 비용·탄소 · ⑤ 다른 시군 바꿔 보기 시험 — 실행: node officer/s10l45.test.js (03_시제품 폴더에서)
   ④ 기대값은 01_리서치/MN-D02_도입비용_탄소_추정.md §6(상주 기본값) 그대로. */
"use strict";
var assert = require("assert");
var path = require("path");
var X = require(path.join(__dirname, "expand.js"));
var R = require(path.join(__dirname, "..", "data/regions_gb.json"));
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }
function near(a, b, eps) { assert.ok(Math.abs(a - b) <= (eps || 0.05), a + " ≠ " + b); }

console.log("④ 도입 비용·탄소(MN-D02)");
var r = X.calc({});
t("상주 기본값 = MN-D02 §6: 방문 960건 · AI 월 30,720원 · 상한 192,000원", function () {
  assert.strictEqual(r.visits, 960); assert.strictEqual(r.aiMonth, 30720); assert.strictEqual(r.aiCap, 192000);
});
t("연 도입 비용 약 237~537만원(유지보수 200~500만원 가정 포함)", function () {
  assert.strictEqual(r.yearLow, 30720 * 12 + 2000000); assert.strictEqual(r.yearHigh, 30720 * 12 + 5000000);
});
t("이동: 명단 순 2,462km → 20% 감소 492km, CO₂ 107.1kg/월(2.174 kg/L)", function () {
  near(r.kmNaive, 2462.4); near(r.kmCut, 492.48); near(r.co2Cut, 107.07, 0.01);
});
t("배출계수는 국내 실측 2.174(EPA 2.348 아님)", function () { assert.strictEqual(X.K.co2_kg_per_L, 2.174); assert.ok(/한국석유관리원/.test(X.COST_SRC.co2)); });
t("시연 단축률 43%면 CO₂ 230.2kg/월", function () { near(X.calc({ saveRate: 0.43 }).co2Cut, 230.2, 0.1); });
t("AI 비용은 하루 상한을 넘지 않음 · 이상한 입력은 기본값", function () {
  assert.strictEqual(X.calc({ officers: 1000 }).aiMonth, 192000);
  assert.strictEqual(X.calc({ officers: "abc", visitDays: -3 }).visits, 960);
});

console.log("⑤ 다른 시군으로 바꿔 보기");
t("경북 22개 시군, 상주 세대수 48,817(행안부 2026-09)·읍면동 24곳", function () {
  assert.strictEqual(R.sigungu.length, 22);
  var s = X.regionView(R, "상주시"); assert.strictEqual(s.hh, 48817); assert.strictEqual(s.areaCount, 24); assert.strictEqual(s.vsBase, null);
});
t("다른 시군을 고르면 읍면동·세대·수급 비율이 그 시군 값으로, 상주와 비교값 붙음", function () {
  var v = X.regionView(R, "문경시");
  assert.ok(v.areaCount > 5 && v.hh > 10000 && v.hh !== 48817);
  assert.ok(v.basicRate > 0); assert.strictEqual(v.vsBase.name, "상주시");
  assert.ok(v.areas.every(function (a) { return a.oneRate > 0 && a.oneRate < 1; }));
});
t("포항시는 남구·북구를 합친 한 곳(수급 통계도 시 단위로 합산)", function () {
  var v = X.regionView(R, "포항시"); assert.ok(v && v.basicRate > 5);
  assert.ok(!R.sigungu.some(function (s) { return / /.test(s.name); }));
});
t("출처 칸(D12·D13·D5·D2)과 기준월이 자료에 있음, 키 같은 비밀값 없음", function () {
  assert.deepStrictEqual(R.sources.map(function (s) { return s.id; }), ["D12", "D13", "D5", "D2"]);
  assert.ok(R.base && R.d5Month);
  assert.ok(!/serviceKey|DATA_GO_KR/.test(JSON.stringify(R)));
});

console.log("\n결과: 통과 " + pass + " · 실패 " + fail);
if (fail) process.exit(1);
