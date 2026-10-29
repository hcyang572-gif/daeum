/* 닿음 S9j 시험 — 실행: node officer/s9j.test.js (03_시제품 폴더에서)
   시연 기록 «오늘 기준» 깔기 · 사후관리 1·3개월 재점검 · 공휴일 반영 · 2027 1차 예정 차수 */
"use strict";
var assert = require("assert");
var path = require("path");
var base = path.join(__dirname, "..");

var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

// 가짜 브라우저 저장소 + 시계 고정
var RealDate = Date;
function withNow(iso, fn) {
  var fixed = new RealDate(iso).getTime();
  function FakeDate(a) { if (!(this instanceof FakeDate)) return new RealDate(fixed).toString(); return arguments.length ? new (Function.prototype.bind.apply(RealDate, [null].concat([].slice.call(arguments))))() : new RealDate(fixed); }
  FakeDate.prototype = RealDate.prototype; FakeDate.now = function () { return fixed; }; FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC;
  global.Date = FakeDate;
  try { return fn(); } finally { global.Date = RealDate; }
}
var mem = {};
global.localStorage = { getItem: function (k) { return k in mem ? mem[k] : null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; } };
global.location = { search: "" };
global.window = global;
global.DAEUM_CONFIG = { requestsKey: "daeum.requests" };

var F = require(path.join(base, "officer/features.js"));
require(path.join(base, "shared/report.js"));
global.DaeumRequests = { key: "daeum.requests", list: function () { return JSON.parse(mem["daeum.requests"] || "[]"); } };
var HH = require(path.join(base, "data/households.json")).households;
function seed() { delete require.cache[require.resolve(path.join(base, "officer/demo_seed.js"))]; require(path.join(base, "officer/demo_seed.js")); }
function build(now) {
  return F.today.build({ households: HH, requests: DaeumRequests.list(), attempts: F.store.get("attempts", []), picked: [], now: now });
}

console.log("S9j 시험");
[["2026-10-30T09:00:00", "금"], ["2026-11-04T09:00:00", "수"], ["2026-12-14T09:00:00", "월(5차 뒤)"]].forEach(function (c) {
  var NOW = new Date(c[0]), today = F.util.ymd(NOW);
  t(c[1] + " " + today + " — 시연 기록이 오늘 기준으로 깔리고 지난 날짜가 «밀림»으로 쌓이지 않음", function () {
    withNow(c[0], seed);
    var b = build(NOW), sec = {}; b.sections.forEach(function (s) { sec[s.key] = s.items; });
    assert.ok(sec.new.length >= 2, "새 주민 신호 " + sec.new.length);
    assert.ok(sec.revisit.length >= 2, "오늘 재방문 " + sec.revisit.length);
    sec.revisit.forEach(function (x) { assert.strictEqual(x.due, today, "재방문 기한이 오늘이 아님 " + x.due); assert.ok(!x.overdue, "재방문이 밀림으로 표시"); });
    var due = sec.due.map(function (x) { return x.why; }).join("/");
    assert.ok(/오늘 기한/.test(due), "기한 임박에 «오늘 기한» 없음: " + due);
    var pl = F.contacts.plan(F.store.get("attempts", []), HH, NOW, 5, { links: F.store.get("links", []), outcomes: F.store.get("outcomes", {}), followups: F.store.get("followups", {}) });
    assert.strictEqual(pl[0].date, today);
    var n = pl.reduce(function (a, d) { return a + d.items.length; }, 0);
    assert.ok(n >= 6, "닷새치 일정 " + n + "건");
    assert.ok(pl.slice(1).some(function (d) { return d.items.length; }), "내일 이후 일정이 비어 있음");
    var fu = pl[0].items.filter(function (x) { return x.kind === "followup"; });
    assert.strictEqual(fu.length, 1, "오늘 칸 사후관리 1건이어야 함");
    var g = F.linkGap.build({ households: HH, requests: DaeumRequests.list(), attempts: F.store.get("attempts", []), links: F.store.get("links", []), outcomes: F.store.get("outcomes", {}), now: NOW });
    g.stages.forEach(function (s) { assert.ok(s.items.length >= 1, "연계 누락 «" + s.label + "» 비어 있음"); });
  });
});

t("같은 날 다시 열면 다시 깔지 않음(담당자가 누른 결과 보존) · 담당자 기록은 남김", function () {
  mem = {};
  withNow("2026-10-30T09:00:00", seed);
  var mine = F.contacts.add(F.store.get("attempts", []), { householdId: "A-030", channel: "phone", result: "no_answer", at: "2026-10-30T09:30:00" });
  F.store.set("attempts", mine);
  F.store.set("followups", F.followUp.mark({}, "LD-2:m1", "2026-10-30T10:00:00"));
  withNow("2026-10-30T15:00:00", seed);
  assert.ok(F.store.get("followups", {})["LD-2:m1"], "같은 날 재실행이 재점검 표시를 지움");
  withNow("2026-11-02T09:00:00", seed);
  var att = F.store.get("attempts", []);
  assert.ok(att.some(function (x) { return x.householdId === "A-030" && !x.seed; }), "담당자 기록이 지워짐");
  assert.strictEqual(att.filter(function (x) { return x.seed; }).length, 13, "시연 기록 개수");
  assert.ok(!F.store.get("followups", {})["LD-2:m1"], "날이 바뀌면 시연 재점검 표시도 새로");
});

t("?demo=off 이면 시연 기록을 지우고 깔지 않음", function () {
  global.location = { search: "?demo=off" };
  withNow("2026-11-03T09:00:00", seed);
  global.location = { search: "" };
  assert.strictEqual(F.store.get("attempts", []).filter(function (x) { return x.seed; }).length, 0);
  assert.strictEqual(DaeumRequests.list().filter(function (x) { return x.seed; }).length, 0);
});

t("사후관리: 1개월 안 했으면 3개월은 아직 안 뜨고, 1개월 하면 3개월이 뜬다", function () {
  var links = [{ id: "L1", householdId: "A-001", label: "가구 A-001", at: "2026-08-01T10:00:00", serviceNames: ["기초연금"] }];
  var oc = { L1: { result: "decided", at: "2026-08-03T10:00:00" } };
  var d1 = F.followUp.due(links, oc, {}, new Date("2026-10-30T09:00:00"));
  assert.deepStrictEqual(d1.map(function (x) { return x.key; }), ["L1:m1"]);
  var d2 = F.followUp.due(links, oc, F.followUp.mark({}, "L1:m1"), new Date("2026-10-30T09:00:00"));
  assert.deepStrictEqual(d2.map(function (x) { return x.key; }), ["L1:m3"]);
  assert.strictEqual(d2[0].date, "2026-11-02", "90일 뒤가 주말(11-01 일)이면 다음 영업일");
  assert.strictEqual(F.followUp.due(links, { L1: { result: "applied", at: "2026-08-03T10:00:00" } }, {}, new Date()).length, 0, "신청만 한 집은 사후관리 대상 아님");
});

t("공휴일: 2026-12-24(목) +1영업일 = 12-28(월) · 2027 설 연휴·대체공휴일 건너뜀", function () {
  assert.strictEqual(F.util.ymd(F.util.addWorkdays(new Date("2026-12-24T10:00:00"), 1)), "2026-12-28");
  assert.strictEqual(F.util.ymd(F.util.addWorkdays(new Date("2027-02-05T10:00:00"), 1)), "2027-02-10");
  assert.strictEqual(F.util.ymd(F.util.subWorkdays(new Date("2026-12-28T10:00:00"), 1)), "2026-12-24");
});

t("차수: 12-11 뒤에는 2027 제1차(예정·추정)를 «시작까지 N일»로 보여 줌", function () {
  var r = F.report.currentRound(new Date("2026-12-20T09:00:00"));
  assert.strictEqual(r.year, 2027); assert.ok(r.estimated);
  var cd = F.report.countdown(r, { now: new Date("2026-12-20T09:00:00"), done: 0, total: 300 });
  assert.ok(cd.upcoming && /시작 2027-01-18까지 29일/.test(cd.message), cd.message);
  assert.strictEqual(F.report.currentRound(new Date("2026-11-04T09:00:00")).no, 5, "진행 중인 5차가 우선");
});

console.log("결과: 통과 " + pass + " · 실패 " + fail);
if (fail) process.exit(1);
