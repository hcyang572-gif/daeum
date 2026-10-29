/* 닿음 S9c 동선 계산 시험 — 실행: node officer/route_plan.test.js (03_시제품 폴더에서). 의존성 없음. */
"use strict";
var assert = require("assert");
var path = require("path");
var RP = require(path.join(__dirname, "route_plan.js"));
var D = require(path.join(__dirname, "..", "data/households.json"));

var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }
var office = D.meta.office;
var stops = D.households.slice(0, 12).map(function (h) { return { id: h.id, x: h.x, y: h.y }; });

t("시청 좌표 → 상주시청 위경도", function () {
  var o = RP.toLatLng(office); assert.strictEqual(o.lat, 36.4109); assert.strictEqual(o.lng, 128.159);
});
t("가상 가구 위경도가 모두 상주시 범위(위도 36.2~36.7, 경도 127.8~128.4) 안", function () {
  D.households.forEach(function (h) { var p = RP.toLatLng(h); assert(p.lat > 36.2 && p.lat < 36.7 && p.lng > 127.8 && p.lng < 128.4, h.id + " " + p.lat + "," + p.lng); });
});
t("2-opt 결과는 최근접 이웃보다 길지 않다(복귀 포함)", function () {
  var nn = RP.nearest(stops, office), opt = RP.twoOpt(nn, office, true);
  assert(RP.tourKm(opt, office, true) <= RP.tourKm(nn, office, true) + 1e-9);
  assert.strictEqual(opt.length, stops.length);
});
t("후보 순서는 같은 가구 집합을 빠짐·중복 없이 담는다", function () {
  RP.candidates(stops, office, true, stops.slice().reverse()).forEach(function (c) {
    assert.deepStrictEqual(c.map(function (s) { return s.id; }).sort(), stops.map(function (s) { return s.id; }).sort());
  });
});
t("캐시 키는 순서·복귀 여부로 갈린다", function () {
  var a = RP.cacheKey(stops, true), b = RP.cacheKey(stops.slice().reverse(), true), c = RP.cacheKey(stops, false);
  assert.notStrictEqual(a, b); assert.notStrictEqual(a, c); assert.strictEqual(a, RP.cacheKey(stops.slice(), true));
});
t("근사 구간 수 = 방문 수 + 복귀 1", function () {
  assert.strictEqual(RP.approxLegs(stops, office, true).length, stops.length + 1);
  assert.strictEqual(RP.approxLegs(stops, office, false).length, stops.length);
  assert.strictEqual(RP.approxLegs([], office, true).length, 0);
});
t("시각표: 09:30 출발·10분 이동·30분 상담 → 09:40 도착·10:10 떠남", function () {
  var s = RP.schedule([{ id: "a" }, { id: "b" }], [{ m: 5000, s: 600 }, { m: 3000, s: 300 }, { m: 8000, s: 900 }], { start: "09:30", consultMin: 30, ret: true });
  assert.strictEqual(s.rows[0].arrive, "09:40"); assert.strictEqual(s.rows[0].leave, "10:10");
  assert.strictEqual(s.rows[1].arrive, "10:15"); assert.strictEqual(s.back.arrive, "11:00");
  assert.strictEqual(s.km, 16); assert.strictEqual(s.travelMin, 30); assert.strictEqual(s.consultMin, 60);
});
t("시각표: 점심 시작을 넘길 방문은 13:00 뒤로", function () {
  var legs = [{ m: 0, s: 600 }, { m: 0, s: 600 }, { m: 0, s: 600 }, { m: 0, s: 600 }];
  var s = RP.schedule([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }], legs, { start: "10:00", consultMin: 40 });
  // 10:10~10:50, 11:00~11:40, (11:50 도착이면 12:30 끝 → 점심 뒤) 13:10~13:50
  assert.strictEqual(s.rows[1].leave, "11:40");
  assert.strictEqual(s.rows[2].lunchBefore, true); assert.strictEqual(s.rows[2].arrive, "13:10");
  assert.strictEqual(s.rows.filter(function (r) { return r.lunchBefore; }).length, 1);
});
t("시각표: 점심 끄면 점심 없이 이어진다", function () {
  var s = RP.schedule([{ id: "a" }, { id: "b" }], [{ m: 0, s: 600 }, { m: 0, s: 600 }], { start: "11:30", consultMin: 30, lunch: null });
  assert.strictEqual(s.rows[1].arrive, "12:20"); assert(!s.rows.some(function (r) { return r.lunchBefore; }));
});
t("순서 옮기기: 위·아래·범위 밖", function () {
  assert.deepStrictEqual(RP.move(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
  assert.deepStrictEqual(RP.move(["a", "b", "c"], 0, 1), ["b", "a", "c"]);
  assert.deepStrictEqual(RP.move(["a", "b", "c"], 0, 5), ["a", "b", "c"]);
});

t("S10b 읍면 배치: 시연 가구는 동(洞)이 아닌 읍면, 상위 12곳이 2개 읍면 이상 · 묶은 동선이 순서대로보다 짧다", function () {
  var kind = {}; D.areas.forEach(function (a) { kind[a.name] = a.kind; });
  D.households.forEach(function (h) { assert.notStrictEqual(kind[h.area], "동", h.id + " " + h.area); });
  var top = D.households.filter(function (h) { return Object.keys(h.indicators).some(function (k) { return h.indicators[k]; }); }).slice(0, 12)
    .map(function (h) { return { id: h.id, x: h.x, y: h.y, area: h.area }; });
  assert(new Set(top.map(function (s) { return s.area; })).size >= 2, "상위 12곳이 한 읍면뿐");
  var best = RP.candidates(top, office, true)[0];
  assert(RP.tourKm(best, office, true) < RP.tourKm(top, office, true), "묶은 동선이 더 길다");
  var s = RP.schedule(best, RP.approxLegs(best, office, true), { start: "09:30", ret: true });
  assert(RP.parseHm(s.back.arrive) <= RP.parseHm("19:00"), "복귀 " + s.back.arrive + " — 하루 동선이 비현실적");
});

console.log("결과: 통과 " + pass + " · 실패 " + fail);
if (fail) process.exit(1);
