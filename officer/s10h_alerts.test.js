/* 닿음 S10h ⑧ 무반응 신호 · ② 폭염·한파 특보 시험 — 실행: node officer/s10h_alerts.test.js (03_시제품 폴더에서). 의존성 없음. */
"use strict";
var assert = require("assert");
var path = require("path"), fs = require("fs");
var A = require(path.join(__dirname, "alerts.js"));
var DATA = path.join(__dirname, "..", "data");
var d = JSON.parse(fs.readFileSync(path.join(DATA, "alerts_demo.json"), "utf8"));
var HH = JSON.parse(fs.readFileSync(path.join(DATA, "households.json"), "utf8")).households;
global.window = {}; require(path.join(__dirname, "features.js")); var F = global.window.DaeumFeatures;

var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }
function H(id, age, single) { return { id: id, label: "가구 " + id, area: "함창읍", x: 1, y: 1, single: single, members: [{ age: age }] }; }
var D2 = { noResponse: { items: [{ householdId: "N1", device: "AI 스피커", hours: 30 }, { householdId: "N2", device: "IoT 활동 감지", hours: 50 }] },
  weather: { active: "heat", region: "상주시", scenarios: { heat: { code: 12, level: 1, name: "폭염경보", from: "11:00" }, cold: { code: 3, level: 0, name: "한파주의보", from: "21:00" }, rain: { code: 5, level: 0, name: "호우" } } } };
// 기존 순서: 담당자 고정(P) → 신호(S) → 무반응 단독(N1, 50세) → 특보 대상(E1) → 무반응+특보(N2, 80세 홀몸) → 기타
var LIST = [H("P", 40, false), H("S", 50, true), H("N1", 50, true), H("E1", 80, true), H("N2", 80, true), H("Z", 30, false), H("E2", 76, true)];

console.log("⑧ 무반응 신호 · ② 폭염·한파 특보");
t("시나리오 .json 과 .js 짝이 같은 내용", function () {
  var js = fs.readFileSync(path.join(DATA, "alerts_demo.js"), "utf8"), w = {};
  new Function("window", js)(w);
  assert.deepStrictEqual(w.__DAEUM_ALERTS__, d);
});
t("무반응 가구는 모두 가상 가구 데이터의 «발굴 명단 안»(위기 정보 1개 이상)", function () {
  var by = {}; HH.forEach(function (h) { by[h.id] = h; });
  assert(d.noResponse.items.length >= 2);
  d.noResponse.items.forEach(function (x) { var h = by[x.householdId]; assert(h, x.householdId); assert(Object.keys(h.indicators).some(function (k) { return h.indicators[k]; }), "명단 밖 " + x.householdId); });
});
t("시연 데이터에 무반응+특보 겹침 1곳 이상·무반응 단독 1곳 이상", function () {
  var by = {}; HH.forEach(function (h) { by[h.id] = h; });
  var both = d.noResponse.items.filter(function (x) { return A.vulnerable(by[x.householdId]); }).length;
  assert(both >= 1 && both < d.noResponse.items.length);
});
t("특보 판정: 코드 12 폭염·3 한파만, «off»·다른 코드는 없음", function () {
  assert.strictEqual(A.weather(D2).key, "heat");
  assert.strictEqual(A.weather(D2, "cold").key, "cold");
  assert.strictEqual(A.weather(D2, "off"), null);
  assert.strictEqual(A.weather(D2, "rain"), null);
  assert.strictEqual(A.weather({}), null);
  assert.strictEqual(A.weather(d).code, 12);
});
t("특보 대상 = 홀로 사는 75세 이상(명단 특성 기준과 같음)", function () {
  assert(A.vulnerable(H("a", 75, true))); assert(!A.vulnerable(H("b", 74, true))); assert(!A.vulnerable(H("c", 90, false)));
});
t("특보 날 순서: 무반응+특보 → 무반응 → 특보 대상(기존 순서 유지) → 나머지(기존 순서 유지)", function () {
  var out = A.prioritize(LIST.slice(), function (h) { return h; }, D2, { weather: A.weather(D2) });
  assert.deepStrictEqual(out.map(function (h) { return h.id; }), ["N2", "N1", "E1", "E2", "P", "S", "Z"]);
});
t("겹친 집은 이유 두 줄(무반응 줄이 먼저), 단독은 한 줄", function () {
  var out = A.prioritize(LIST.slice(), function (h) { return h; }, D2, { weather: A.weather(D2) });
  assert.strictEqual(out[0].alert.lines.length, 2);
  assert(/^무반응 50시간 — IoT 활동 감지 신호\(협약 기관, 가상\)$/.test(out[0].alert.lines[0]), out[0].alert.lines[0]);
  assert(/폭염경보 발효\(시연 시나리오, 가상\)/.test(out[0].alert.lines[1]));
  assert.strictEqual(out[1].alert.lines.length, 1);
  assert.strictEqual(out[6].alert, null);
});
t("특보 없는 날: 무반응만 위로, 나머지 기존 순서 그대로", function () {
  var out = A.prioritize(LIST.slice(), function (h) { return h; }, D2, { weather: null });
  assert.deepStrictEqual(out.map(function (h) { return h.id; }), ["N1", "N2", "P", "S", "E1", "Z", "E2"]);
  assert(!out.some(function (h) { return h.alert && h.alert.heat; }));
});
t("한파주의보 이유 문구", function () {
  var out = A.prioritize([H("E1", 80, true)], function (h) { return h; }, D2, { weather: A.weather(D2, "cold") });
  assert(/^한파주의보 발효/.test(out[0].alert.lines[0]));
});
t("오늘 동선용 무반응 id: 오래 무반응 순, 명단에 없는 집 제외", function () {
  assert.deepStrictEqual(A.todayIds(D2), ["N2", "N1"]);
  assert.deepStrictEqual(A.todayIds(D2, function (id) { return id === "N1"; }), ["N1"]);
});
t("오늘 할 일: 무반응 가구가 오늘 동선에 자동으로 들어가고 alert 표시·개수", function () {
  var hh = [H("N1", 50, true), H("X", 60, false)];
  var r = F.today.build({ households: hh, requests: [], attempts: [], picked: ["X"], alertIds: ["N1", "없는집"], now: new Date("2026-10-30T09:00:00+09:00") });
  assert.strictEqual(r.counts.stops, 2); assert.strictEqual(r.counts.noResp, 1);
  var n = r.route.order.filter(function (s) { return s.id === "N1"; })[0];
  assert.strictEqual(n.alert, "noresp");
  assert(!r.route.order.filter(function (s) { return s.id === "X"; })[0].alert);
});
t("출처 꼬리표: 무반응=«가상»·«협약 시»·센서 안 만듦 / 특보=기상청·공공데이터포털 15000415·«가상»", function () {
  var a = A.sourceNoResp(d), b = A.sourceWeather(d);
  ["가상", "협약 시", "센서를 만들지 않고", "동의"].forEach(function (w) { assert(a.indexOf(w) >= 0, w); });
  assert(!/센서[^를]*개발/.test(a));
  ["출처: 기상청", "기상특보 조회서비스", "공공데이터포털 15000415", "3 한파", "12 폭염", "가상", "실시간 호출 없음"].forEach(function (w) { assert(b.indexOf(w) >= 0, w); });
});
t("시나리오 파일에 서비스키·실주소 없음", function () {
  var s = JSON.stringify(d);
  assert(!/serviceKey|ServiceKey|apikey/i.test(s));
  assert(!/\d+-\d+번지|로 \d+/.test(s));
});

console.log("결과: 통과 " + pass + " · 실패 " + fail);
if (fail) process.exit(1);
