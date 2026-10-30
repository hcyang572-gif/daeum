/* S10i 안내 부품 시험 — node shared/guide.test.js
   화면 없이 guide.js 의 활용 데이터 표·출처 추정 규칙만 본다(문서 객체는 최소 흉내). */
"use strict";
var fs = require("fs"), path = require("path"), assert = require("assert");
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

var stubEl = { appendChild: function () {}, setAttribute: function () {} };
global.location = { pathname: "/03_시제품/officer/index.html", href: "http://127.0.0.1:8000/officer/index.html", search: "" };
global.document = { currentScript: { src: "http://127.0.0.1:8000/shared/guide.js" }, readyState: "loading", head: stubEl,
  querySelector: function () { return null; }, createElement: function () { return Object.create(stubEl); }, addEventListener: function () {} };
global.window = global;
eval(fs.readFileSync(path.join(__dirname, "guide.js"), "utf8"));
var G = global.DaeumGuide;
var ROOT = path.join(__dirname, "..");

console.log("활용 데이터 표");
t("줄 번호가 겹치지 않고 모든 줄에 기관·이름·받는 방식·쓰는 화면·하는 일", function () {
  var seen = {};
  G.DATA.forEach(function (d) {
    assert.ok(!seen[d.id], "중복 " + d.id); seen[d.id] = 1;
    ["org", "name", "how", "does"].forEach(function (k) { assert.ok(d[k], d.id + " " + k); });
    assert.ok(d.screens.length >= 1, d.id + " 화면");
    assert.ok(["pub", "virt", "self", "svc", "ref"].indexOf(d.kind) >= 0, d.id + " 종류");
  });
});
t("공공데이터 줄은 기준일과 원문 주소, 데이터 파일 출처와 기준일이 맞음", function () {
  G.DATA.filter(function (d) { return d.kind === "pub"; }).forEach(function (d) { assert.ok(d.base && d.url, d.id); });
  var lr = JSON.parse(fs.readFileSync(path.join(ROOT, "data/lonely_risk.json"), "utf8"));
  var s = JSON.stringify(lr);
  assert.ok(/15097974/.test(s) && /15097972/.test(s), "D12·D13 파일 출처");
  var rc = JSON.parse(fs.readFileSync(path.join(ROOT, "data/recipients_sangju.json"), "utf8"));
  assert.ok(/2025-12/.test(rc.source) && /15062448/.test(rc.source), "D5 기준월");
  var ad = JSON.parse(fs.readFileSync(path.join(ROOT, "data/alerts_demo.json"), "utf8"));
  assert.strictEqual(ad.weather.source.portal, "15000415");
});
t("가상 데이터 줄은 «가상» 종류로만", function () {
  ["V1", "V2", "V3", "V4"].forEach(function (id) { assert.strictEqual(G.DATA.filter(function (d) { return d.id === id; })[0].kind, "virt"); });
});

console.log("출처 꼬리표 규칙");
t("화면 출처 글 → 데이터 줄", function () {
  assert.deepStrictEqual(G.infer("출처: 한국사회보장정보원 «복지사업 시군구별 수급권자 현황»(공공데이터포털 15062448)"), ["D5"]);
  assert.deepStrictEqual(G.infer("출처: 행정안전부 «지역별(행정동) 세대원수별 주민등록 세대수»·«성별 연령별 주민등록 인구수»").sort(), ["D12", "D13"]);
  assert.ok(G.infer("출처: 기상청 «기상특보 조회서비스»(공공데이터포털 15000415) 특보 코드 체계 · 오늘 특보는 시연 시나리오(가상)").indexOf("D11") >= 0);
  assert.ok(G.infer("출처: 국립중앙의료원 «전국 약국 정보 조회 서비스(15000576)»").indexOf("MED") >= 0);
  assert.deepStrictEqual(G.infer("출처: 보건복지부 2026-10-19 보도(정책브리핑) · 명단은 가상 가구"), ["V1", "R6"]);
  assert.deepStrictEqual(G.infer("AI 요약"), []);
});
t("정체성 문구 — 첫 화면 제목·설명에 «현장 업무 도우미», «발굴 도우미» 없음", function () {
  ["index.html", "officer/index.html", "citizen/index.html", "shared/guide.js", "shared/data.html"].forEach(function (f) {
    var s = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.ok(!/발굴 도우미/.test(s), f);
  });
  var ix = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.ok(/<title>[^<]*복지 사각지대 현장 업무 도우미/.test(ix) && /name="description" content="[^"]*현장 업무 도우미/.test(ix));
});
t("두 창구·첫 화면이 안내 부품을 싣고 더보기에 사용 방법·활용 데이터", function () {
  ["index.html", "officer/index.html", "citizen/index.html"].forEach(function (f) {
    var s = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.ok(/guide\.js/.test(s), f + " guide.js");
    assert.ok(/data-guide="help"/.test(s), f + " 사용 방법");
  });
  ["officer/index.html", "citizen/index.html"].forEach(function (f) { assert.ok(/data-guide="data"/.test(fs.readFileSync(path.join(ROOT, f), "utf8")), f); });
});

console.log("\n결과: 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
