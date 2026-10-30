/* 닿음 S10h ④ 오래된 집 자체 시험 — 실행: node officer/old_house.test.js (03_시제품 폴더에서). 의존성 없음. */
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var OH = require(path.join(__dirname, "old_house.js"));
var D = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "old_house.json"), "utf8"));
var HH = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "households.json"), "utf8")).households;
var JS = fs.readFileSync(path.join(__dirname, "..", "data", "old_house.js"), "utf8");

var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

console.log("④ 오래된 집(건축HUB 건축물대장)");
t("출처·기준일·노후 기준이 파일에 있다", function () {
  assert.strictEqual(D.source.id, "D15"); assert.ok(/15134735/.test(D.source.URL)); assert.ok(/^\d{4}-\d\d-\d\d$/.test(D.base));
  assert.ok(/useAprDay/.test(D.source.노후기준));
});
t("읍면 18곳 + 동 지역, 시연 가구가 있는 북부 4개 읍면은 값이 있다", function () {
  ["함창읍", "사벌국면", "공검면", "이안면", "동 지역"].forEach(function (n) { assert.ok(D.areas[n] && D.areas[n].노후비율 != null, n); });
  assert.strictEqual(Object.keys(D.areas).length, 19);
});
t("비율 = 노후 ÷ (전체 − 미상), 0~1", function () {
  Object.keys(D.areas).forEach(function (n) {
    var a = D.areas[n], k = a.전체동수 - a.미상;
    assert.ok(a.노후동수 <= k, n); assert.ok(Math.abs(a.노후비율 - a.노후동수 / k) < 0.0006, n);
  });
});
t("⛔ 키·건물 주소가 결과 파일에 없다", function () {
  var s = JSON.stringify(D) + JS;
  assert.ok(!/serviceKey|DATA_GO_KR_KEY/i.test(s)); assert.ok(!/번지|platPlc|bun"/.test(s));
});
t("가상 표식은 가구마다 고정이고 읍면 비율에 가깝다", function () {
  OH.set(D);
  var by = {};
  HH.forEach(function (h) { assert.strictEqual(OH.isOld(h), OH.isOld(h)); var b = by[h.area] = by[h.area] || [0, 0]; b[0]++; if (OH.isOld(h)) b[1]++; });
  Object.keys(by).forEach(function (n) { var r = by[n][1] / by[n][0]; assert.ok(Math.abs(r - D.areas[n].노후비율) < 0.2, n + " " + r); });
});
t("방문 전 카드 한 줄·출처 줄 문구", function () {
  OH.set(D);
  assert.ok(/^이안면 30년 넘은 주택 \d+\.\d%\(주거용 건물 .*동 수 기준\)$/.test(OH.areaLine("이안면")));
  assert.strictEqual(OH.areaLine("없는곳"), null);
  assert.ok(/^출처: 국토교통부 «건축HUB 건축물대장정보»\(공공데이터포털 15134735\) 표제부, 기준일 /.test(OH.sourceLine(D)));
  assert.ok(/가상/.test(OH.tagText()));
});
console.log((fail ? "실패 " + fail + " · " : "") + "통과 " + pass);
process.exit(fail ? 1 : 0);
