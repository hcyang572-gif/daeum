/* 닿음 S10h ① 고독사 위험도 자체 시험 — 실행: node officer/lonely_risk.test.js (03_시제품 폴더에서). 의존성 없음. */
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var L = require(path.join(__dirname, "lonely_risk.js"));
var D = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "lonely_risk.json"), "utf8"));
var cfg = fs.readFileSync(path.join(__dirname, "..", "shared", "config.js"), "utf8");
var REG = cfg.slice(cfg.indexOf("regions: [") + 10, cfg.indexOf("]", cfg.indexOf("regions: ["))).split(",").map(function (x) { return x.trim().replace(/"/g, ""); }).filter(Boolean);

var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

console.log("① 읍면동 고독사 위험도");
t("읍면동 24곳 = config.regions 이름·순서 그대로", function () { assert.deepStrictEqual(D.areas.map(function (a) { return a.name; }), REG); });
t("합계 = 행안부 2026-09 상주시 인구 88,825·세대 48,817(data/README)", function () {
  assert.strictEqual(D.areas.reduce(function (s, a) { return s + a.pop; }, 0), 88825);
  assert.strictEqual(D.areas.reduce(function (s, a) { return s + a.hh; }, 0), 48817);
  assert.strictEqual(D.total.pop, 88825); assert.strictEqual(D.total.hh, 48817);
});
t("비율 = 원값으로 다시 계산한 값", function () {
  D.areas.forEach(function (a) { assert.ok(Math.abs(a.oneRate - a.one / a.hh) < 1e-4, a.name); assert.ok(a.a65 <= a.pop && a.one <= a.hh, a.name); });
});
t("지수 0~100, 순위 1~24 중복 없음, 등급 8·8·8", function () {
  var ranks = D.areas.map(function (a) { return a.rank; }).sort(function (x, y) { return x - y; });
  assert.deepStrictEqual(ranks, Array.from({ length: 24 }, function (_, i) { return i + 1; }));
  D.areas.forEach(function (a) { assert.ok(a.index >= 0 && a.index <= 100); });
  ["높음", "보통", "낮음"].forEach(function (k) { assert.strictEqual(D.areas.filter(function (a) { return a.tier === k; }).length, 8, k); });
  var R = L.ranked(D, []); for (var i = 1; i < R.length; i++) assert.ok(R[i - 1].index >= R[i].index);
});
t("출처: 기관·데이터명·기준일 + 공공데이터 표식 근거(public)", function () {
  var s = L.sourceLine(D);
  ["행정안전부", "세대원수별 주민등록 세대수", "성별 연령별 주민등록 인구수", "15097974", "15097972", "기준일 " + D.base].forEach(function (w) { assert.ok(s.indexOf(w) >= 0, w); });
  assert.strictEqual(D.public, true); assert.ok(/추정/.test(D.title) && D.formula && D.limits);
});
t("담당 읍면 표시·방문 전 카드 한 줄", function () {
  var R = L.ranked(D, ["공검면", "함창읍"]);
  assert.deepStrictEqual(R.filter(function (r) { return r.focus; }).map(function (r) { return r.name; }).sort(), ["공검면", "함창읍"].sort());
  var line = L.areaLine("공검면", D);
  assert.ok(/^공검면 고독사 위험도 (높음|보통|낮음)\(상주 24곳 중 \d+위\) — 1인 세대 \d+\.\d% · 65세 이상 \d+\.\d%$/.test(line), line);
  assert.strictEqual(L.areaLine("없는면", D), null);
});
t("개인 단위 값 없음(집계 열만)", function () {
  var keys = {}; D.areas.forEach(function (a) { Object.keys(a).forEach(function (k) { keys[k] = 1; }); });
  assert.deepStrictEqual(Object.keys(keys).sort(), ["a65", "a65Rate", "a75Rate", "hh", "index", "name", "one", "oneRate", "pop", "rank", "tier"].sort());
});
t("짝 .js 사본이 .json 과 같은 내용", function () {
  var js = fs.readFileSync(path.join(__dirname, "..", "data", "lonely_risk.js"), "utf8");
  var w = {}; new Function("window", js)(w); assert.deepStrictEqual(w.__DAEUM_LONELY__, D);
});

console.log("\n결과: 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
