/* 닿음 S10o-2 주 기능 반영 시험 — 실행: node officer/s10o2.test.js (03_시제품 폴더에서)
   ⑤ 명단 정리 입구(붙여넣기 → 이전 차수 비해당 배지 → 확인만 할 집 / 다시 볼 집) · ② 3번째 허탕 뒤 간접 확인 순서표 · ③ 미신청 칸 보강 순서 */
"use strict";
var assert = require("assert");
var path = require("path");
var F = require(path.join(__dirname, "features.js"));
var D = require(path.join(__dirname, "..", "data/households.json"));

var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }
var HH = D.households, I = F.intake;
var withCrisis = HH.filter(function (h) { return I.crisisKeys(h).length; });

console.log("⑤ 명단 정리 입구");
t("붙여넣기: 여러 모양(A-005·a005·B 48)을 같은 번호로, 중복은 한 번만 세고 dup 로", function () {
  var r = I.parse("A-005\na005, 가구 B 48 / P-1\tA-005");
  assert.deepStrictEqual(r.ids, ["A-005", "B-048", "P-001"]);
  assert.strictEqual(r.dup, 2);
});
t("붙여넣기: 번호 아닌 낱말·긴 숫자는 줍지 않음", function () {
  assert.deepStrictEqual(I.parse("상주시 2026년 5차 명단 AB-1234").ids, []);
});
var prior = I.priorRounds(HH);
t("지난 차수(가상): 위기 정보가 있는 집 안에서만, 일부만(약 1/5), 늘 같은 결과, «가상» 표시", function () {
  var ks = Object.keys(prior);
  assert.ok(ks.length > 5 && ks.length < withCrisis.length / 2, "개수 " + ks.length);
  ks.forEach(function (id) { assert.ok(withCrisis.some(function (h) { return h.id === id; })); assert.ok(prior[id].virtual); assert.ok(/가상/.test(prior[id].round)); });
  assert.deepStrictEqual(I.priorRounds(HH), prior);
});
var ids = I.sample(HH, prior, 10);
t("예시 명단: 10곳, 지난 비해당 집과 처음 올라온 집이 섞임", function () {
  assert.strictEqual(ids.length, 10);
  assert.ok(ids.some(function (id) { return prior[id]; }) && ids.some(function (id) { return !prior[id]; }));
});
var c = I.classify({ ids: ids.concat(["Z-999"]), households: HH, indicators: D.indicators, prior: prior });
t("갈래: 처음 올라온 집 = 다시 볼 집 · 지난 비해당 + 변화 없음 = 확인만 할 집 · 모르는 번호는 따로", function () {
  assert.deepStrictEqual(c.unknown, ["Z-999"]);
  c.items.forEach(function (x) {
    if (!x.prior) assert.strictEqual(x.bucket, "review");
    else if (!x.changes.length) { assert.strictEqual(x.bucket, "check"); assert.ok(/확인만/.test(x.why)); }
    else assert.strictEqual(x.bucket, "review");
  });
  assert.ok(c.check.length >= 1 && c.review.length >= 1);
  assert.strictEqual(c.check.length + c.review.length, 10);
});
t("배지 내용: 지난 사유 이름·차수·출처(가상)", function () {
  var x = c.items.filter(function (y) { return y.prior; })[0];
  assert.ok(x.prior.reasonLabel && x.prior.reasonLabel !== "사유 미상");
  assert.ok(/가상/.test(x.prior.round) && /가상/.test(x.prior.source));
});
t("새 위기 정보가 생긴 지난 비해당 집은 «다시 볼 집»(지표 이름으로 알림)", function () {
  var id = Object.keys(prior).filter(function (k) { var h = HH.filter(function (y) { return y.id === k; })[0]; return prior[k].crisis.length < I.crisisKeys(h).length; })[0];
  assert.ok(id, "변화 있는 가상 집이 하나는 있어야 함");
  var r = I.classify({ ids: [id], households: HH, indicators: D.indicators, prior: prior }).items[0];
  assert.strictEqual(r.bucket, "review"); assert.ok(/새 위기 정보/.test(r.why));
});
t("주민 신호·제보가 생기면 지난 비해당이어도 «다시 볼 집»", function () {
  var id = c.check[0].id;
  var r1 = I.classify({ ids: [id], households: HH, prior: prior, requests: [{ householdId: id, status: "new" }] }).items[0];
  var r2 = I.classify({ ids: [id], households: HH, prior: prior, tips: [{ householdId: id, text: "x" }] }).items[0];
  assert.strictEqual(r1.bucket, "review"); assert.ok(/주민 신호/.test(r1.why));
  assert.strictEqual(r2.bucket, "review"); assert.ok(/제보/.test(r2.why));
});
t("담당자가 닿음에 남긴 비해당 사유가 가상 기록보다 먼저(비해당 사유 기록과 묶임)", function () {
  var h = withCrisis.filter(function (x) { return !prior[x.id]; })[0];
  var att = F.contacts.markNotEligible([], h.id, "family_support", "", "2026-10-20T10:00:00");
  var r = I.classify({ ids: [h.id], households: HH, prior: prior, attempts: att }).items[0];
  assert.strictEqual(r.bucket, "check"); assert.strictEqual(r.prior.source, "담당자 기록");
  assert.ok(/가족·친지/.test(r.prior.reasonLabel));
});

console.log("② 재시도 3번째 허탕 → 간접 확인 순서표");
function visits(n) { var a = []; for (var i = 0; i < n; i++) a = F.contacts.add(a, { householdId: "X", channel: "visit", result: "no_answer", at: "2026-10-2" + (1 + i) + "T1" + i + ":00:00" }); return a; }
var NOW = new Date("2026-10-29T09:00:00");
t("방문 부재 2번까지는 아님, 3번째를 누른 순간만 «처음 들어섬», 4번째는 이미 들어선 뒤", function () {
  assert.strictEqual(F.contacts.justEscalated(visits(2), "X", NOW), false);
  assert.strictEqual(F.contacts.justEscalated(visits(3), "X", NOW), true);
  assert.strictEqual(F.contacts.justEscalated(visits(4), "X", NOW), false);
});
t("순서표: 통장·이장 → 이웃 → 집주인 순, 체크하면 다음 할 일이 넘어감, 출처 표기", function () {
  var o = F.contacts.indirectOrder({});
  assert.deepStrictEqual(o.steps.slice(0, 3).map(function (s) { return s.who; }), ["통장·이장", "이웃", "집주인"]);
  assert.strictEqual(o.next.key, "tong");
  var o2 = F.contacts.indirectOrder({ tong: true });
  assert.strictEqual(o2.done, 1); assert.strictEqual(o2.next.key, "neighbor");
  assert.ok(/^출처:/.test(o.source) && /시연 기본값/.test(o.source));
});

console.log("③ 미신청 칸 보강(S10l ⑥ 합침)");
t("순서 = 멈춘 집 많은 순 → 동네 미신청(가상) 많은 순, 둘 다 0이면 뺌, 실제 통계는 순서에 안 씀", function () {
  var r = F.linkGap.unappliedOrder([
    { name: "주거급여", stalled: 0, demand: 9, real: { households: 3588 } },
    { name: "에너지바우처", stalled: 2, demand: 1 },
    { name: "긴급복지지원", stalled: 2, demand: 5 },
    { name: "드림스타트", stalled: 0, demand: 0, real: { households: 99999 } }
  ]);
  assert.deepStrictEqual(r.map(function (x) { return x.name; }), ["긴급복지지원", "에너지바우처", "주거급여"]);
});

console.log("\n결과: 통과 " + pass + " · 실패 " + fail);
if (fail) process.exit(1);
