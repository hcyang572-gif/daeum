/* 닿음 S10h ③ 가까운 병원·약국 시험 — 실행: node officer/s10h_medical.test.js (03_시제품 폴더에서). 의존성 없음. */
"use strict";
var assert = require("assert");
var path = require("path"), fs = require("fs");
var M = require(path.join(__dirname, "medical.js"));
var DATA = path.join(__dirname, "..", "data");
var d = JSON.parse(fs.readFileSync(path.join(DATA, "medical_sangju.json"), "utf8"));
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }
function at(s) { return new Date(s + "+09:00"); } // KST
var WEEK = ["0900-1800", "0900-1800", "0900-1800", "0900-1800", "0900-1800", "0900-1300", "", "1000-1400"];

console.log("③ 가까운 병원·약국");
t("자료 .json·.js 짝 같음 · 요양병원 제외 · 좌표·8칸 진료시간 모두 있음", function () {
  var w = {}; new Function("window", fs.readFileSync(path.join(DATA, "medical_sangju.js"), "utf8"))(w);
  assert.deepStrictEqual(w.__DAEUM_MEDICAL__, d);
  assert(d.items.length > 100);
  d.items.forEach(function (x) { assert(x.k !== "요양병원"); assert(isFinite(x.la) && isFinite(x.ln)); assert.strictEqual(x.h.length, 8); });
  assert(d.items.some(function (x) { return x.k === "약국"; }));
});
t("문 엶 계산: 평일 낮 엶·저녁 닫힘·토 오후 닫힘·일 정보 없음 닫힘", function () {
  assert(M.isOpenAt(WEEK, at("2026-10-30T10:00:00"))); // 금
  assert(!M.isOpenAt(WEEK, at("2026-10-30T18:00:00")));
  assert(!M.isOpenAt(WEEK, at("2026-10-31T14:00:00"))); // 토
  assert(!M.isOpenAt(WEEK, at("2026-11-01T11:00:00"))); // 일
});
t("공휴일이면 8번째 칸(평일이라도), 공휴일 칸이 비면 요일 칸", function () {
  assert(M.isOpenAt(WEEK, at("2026-12-25T11:00:00"), true));
  assert(!M.isOpenAt(WEEK, at("2026-12-25T15:00:00"), true));
  var noHol = WEEK.slice(0, 7).concat([""]);
  assert(M.isOpenAt(noHol, at("2026-12-25T15:00:00"), true));
});
t("자정 넘김 운영: 어제 시작분이 새벽까지 이어짐", function () {
  var night = ["1800-0200", "1800-0200", "1800-0200", "1800-0200", "1800-0200", "1800-0200", "1800-0200", ""];
  assert(M.isOpenAt(night, at("2026-10-30T01:00:00")));
  assert(!M.isOpenAt(night, at("2026-10-30T03:00:00")));
});
t("진료시간 글자: 요일·공휴일·정보 없음", function () {
  assert.strictEqual(M.hoursText(WEEK, at("2026-10-30T10:00:00")), "금요일 09:00~18:00");
  assert.strictEqual(M.hoursText(WEEK, at("2026-12-25T10:00:00"), true), "공휴일 10:00~14:00");
  assert.strictEqual(M.hoursText(WEEK, at("2026-11-01T10:00:00")), "일요일 진료 정보 없음");
});
t("가까운 3곳: 문 연 곳 먼저 → 가까운 순, 약국·병의원 각 1곳 이상", function () {
  var D2 = { items: [
    { n: "가까운닫힌약국", k: "약국", t: "", la: 36.41, ln: 128.16, h: ["", "", "", "", "", "", "", ""] },
    { n: "먼열린약국", k: "약국", t: "", la: 36.45, ln: 128.16, h: WEEK },
    { n: "중간의원", k: "의원", t: "054-000-0000", la: 36.42, ln: 128.16, h: WEEK },
    { n: "아주먼의원", k: "의원", t: "", la: 36.60, ln: 128.16, h: WEEK }] };
  var r = M.nearby(D2, { lat: 36.41, lng: 128.16 }, { now: at("2026-10-30T10:00:00"), n: 3 });
  assert.strictEqual(r.length, 3);
  assert.deepStrictEqual(r.map(function (x) { return x.name; }), ["중간의원", "먼열린약국", "아주먼의원"]);
  assert(r.every(function (x) { return x.open; }));
  assert(r.some(function (x) { return x.kind === "약국"; }));
  assert(Math.abs(r[0].km - 1.1) < 0.05, r[0].km);
});
t("실제 자료로 상주시청 근처 평일 10시: 3곳·문 연 곳 있음·10km 안", function () {
  var r = M.nearby(d, { lat: 36.4109, lng: 128.1590 }, { now: at("2026-10-30T10:00:00") });
  assert.strictEqual(r.length, 3); assert(r[0].open); assert(r.every(function (x) { return x.km < 10; }));
});
t("출처 꼬리표: 국립중앙의료원·조회일·공공데이터포털·직선거리(추정)", function () {
  var s = M.sourceLine(d);
  ["출처: 국립중앙의료원", "조회일 2026-10-30", "공공데이터포털 15000576", "직선거리(추정)"].forEach(function (w) { assert(s.indexOf(w) >= 0, w); });
  assert(!/serviceKey/i.test(JSON.stringify(d)));
});
console.log("결과: 통과 " + pass + " · 실패 " + fail);
if (fail) process.exit(1);
