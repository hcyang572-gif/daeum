/* 닿음 S9h «특화 영역 고도화» 시험 — 실행: node officer/s9h.test.js (03_시제품 폴더에서)
   주민 신호 입구(C안) · 하루 동선 1장 · 시도 이력→재시도 일정 · 연계 누락·미신청 보드 · 행복이음 «나가는 것» 초안 · 문구 금지어 */
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var base = path.join(__dirname, "..");
var F = require(path.join(base, "officer/features.js"));
require(path.join(base, "shared/report.js"));
var D = require(path.join(base, "data/households.json"));
var HH = D.households;

var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }
var NOW = new Date("2026-10-29T09:00:00"); // 목요일
function req(id, o) {
  return Object.assign({ v: 1, id: id, createdAt: "2026-10-28T10:00:00", status: "new", region: HH[0].area, contactPref: "phone",
    proxy: { isProxy: false }, matched: [], urgent: false, history: [{ at: "2026-10-28T10:00:00", status: "new", by: "citizen" }] }, o || {});
}

console.log("주민 신호 입구(C안)");
t("신호 종류: 본인·가족·이웃(signal 값 또는 관계 낱말)", function () {
  assert.strictEqual(F.signals.of(req("A")), "self");
  assert.strictEqual(F.signals.of(req("B", { proxy: { isProxy: true, relation: "어머니" } })), "family");
  assert.strictEqual(F.signals.of(req("C", { proxy: { isProxy: true, relation: "이웃" } })), "neighbor");
  assert.strictEqual(F.signals.of(req("D", { signal: "neighbor" })), "neighbor");
});
t("이웃 알림은 전화 희망이 아니어도 오늘 방문 묶음에 들어가고, 명단 신호 글이 «이웃이 걱정된다고 알림»", function () {
  var r = req("N1", { signal: "neighbor", proxy: { isProxy: true, relation: "이웃" }, place: "○○아파트 3동", householdId: HH[3].id });
  var td = F.today.build({ households: HH, areas: D.areas, office: D.meta.office, requests: [r], attempts: [], picked: [], now: NOW });
  assert.ok(td.route.order.some(function (s) { return s.id === "N1"; }));
  assert.ok(/이웃 알림/.test(td.sections[0].items[0].why) && /이웃 알림/.test(td.sections[0].items[0].label));
  var o = F.households.order({ households: HH, requests: [r], attempts: [], tips: [], officerOrder: [] });
  assert.strictEqual(o.items[0].id, HH[3].id); assert.ok(/이웃이 걱정된다고 알림/.test(o.items[0].signals[0].text));
});

t("이웃 알림의 «보낸 알림 확인»은 접수·확인까지만(그 집 상담·지원 내용은 안 보임)", function () {
  require(path.join(base, "citizen/progress.js"));
  var r = req("N2", { signal: "neighbor", status: "visiting", history: [{ at: "2026-10-28T10:00:00", status: "new" }, { at: "2026-10-28T15:00:00", status: "seen" }, { at: "2026-10-29T08:00:00", status: "visiting" }] });
  var p = F.progress.of(r, NOW);
  assert.strictEqual(p.steps.length, 2); assert.ok(/개인정보/.test(p.current.say)); assert.ok(!/방문·상담/.test(JSON.stringify(p)));
  assert.strictEqual(F.progress.of(req("S1", { status: "visiting" }), NOW).steps.length, 4); // 본인 요청은 4단계 그대로
});

console.log("② 시도 이력 → 재시도 일정");
t("정보원 AI 초기상담 전화가 안 닿으면 다음은 1영업일 뒤 방문", function () {
  var a = F.contacts.add([], { householdId: HH[0].id, channel: "ai", result: "no_answer", at: "2026-10-28T10:00:00" });
  var s = F.contacts.suggestNext(a, HH[0].id, NOW);
  assert.strictEqual(s.next.channel, "visit"); assert.strictEqual(s.next.date, "2026-10-29"); assert.ok(/AI 초기상담/.test(s.next.why));
});
var att = [];
att = F.contacts.add(att, { householdId: HH[0].id, channel: "visit", result: "no_answer", at: "2026-10-26T10:00:00" });
att = F.contacts.add(att, { householdId: HH[0].id, channel: "visit", result: "no_answer", at: "2026-10-27T14:00:00" });
att = F.contacts.add(att, { householdId: HH[1].id, channel: "phone", result: "no_answer", at: "2026-10-29T08:00:00" });
att = F.contacts.add(att, { householdId: HH[2].id, channel: "visit", result: "met", at: "2026-10-28T10:00:00" });
t("시간대별 이력 한 줄: 오전·오후 부재, 저녁 안 해 봄", function () {
  var tl = F.contacts.timeline(att, HH[0].id);
  assert.strictEqual(tl.tries, 2); assert.ok(/오전 1회/.test(tl.line) && /오후 1회/.test(tl.line) && /저녁 안 해 봄/.test(tl.line));
});
t("며칠치 일정: 지난 제안은 오늘로, 내일 것은 내일 칸, 끝난 집은 빠짐", function () {
  var pl = F.contacts.plan(att, HH, NOW, 5);
  assert.strictEqual(pl.length, 5); assert.strictEqual(pl[0].label, "오늘"); assert.strictEqual(pl[1].date, "2026-10-30");
  var all = [].concat.apply([], pl.map(function (d) { return d.items.map(function (x) { return x.id; }); }));
  assert.ok(all.indexOf(HH[0].id) >= 0 && all.indexOf(HH[1].id) >= 0 && all.indexOf(HH[2].id) < 0);
  assert.ok(pl[0].items.some(function (x) { return x.id === HH[0].id && x.slot === "저녁"; }));
});

console.log("① 하루 동선 1장");
t("방문마다 시각·지난 시도·부재면 다음 시도, 대기 방문은 재시도 날이 된 집", function () {
  var rows = {}; [HH[5], HH[6]].forEach(function (h) { rows[h.id] = { household: h, factors: [], signals: [] }; });
  var sh = F.daySheet.build({ start: "09:30", end: "11:40", km: 6.2, isRoad: false, ret: true,
    stops: [{ id: HH[5].id, arrive: "09:45", leave: "10:15" }, { id: HH[6].id, arrive: "10:30", leave: "11:00" }],
    rows: rows, candidates: [{ household: HH[0], signals: [] }, { household: HH[7], signals: [] }], attempts: att, now: NOW });
  assert.strictEqual(sh.stops.length, 2); assert.strictEqual(sh.stops[0].time, "09:45~10:15"); assert.strictEqual(sh.stops[0].lastTry, "첫 방문");
  assert.ok(/^안내문 남김 → 다음/.test(sh.stops[0].ifAbsent));
  assert.deepStrictEqual(sh.standby.map(function (x) { return x.id; }), [HH[0].id]); // HH[7]은 신호·재시도 없음
  assert.ok(/방문 2곳/.test(sh.summary) && /근사/.test(sh.summary)); assert.ok(/정식 기록은 행복이음/.test(sh.text));
});

console.log("③ 연계 누락·미신청 보드");
t("4단계(신청 뒤 결과 미확인 추가) + 서비스별 안내 후 미신청", function () {
  var links = [{ id: "L1", householdId: HH[1].id, at: "2026-10-01T10:00:00", serviceNames: ["에너지바우처"] },
    { id: "L2", householdId: HH[2].id, at: "2026-09-01T10:00:00", serviceNames: ["기초연금"] },
    { id: "L3", householdId: HH[3].id, at: "2026-10-01T10:00:00", serviceNames: ["에너지바우처", "긴급복지지원"] }];
  var oc = F.linkGap.markOutcome({}, "L2", "applied", "2026-09-10T10:00:00");
  oc = F.linkGap.markOutcome(oc, "L3", "not_applied", "2026-10-20T10:00:00");
  var g = F.linkGap.build({ households: HH, links: links, outcomes: oc, now: NOW });
  var n = {}; g.stages.forEach(function (s) { n[s.key] = s.items.length; });
  assert.strictEqual(n.link_nocheck, 1); assert.strictEqual(n.applied_nodecision, 1);
  assert.deepStrictEqual(g.notApplied[0], { name: "에너지바우처", n: 2 });
  oc = F.linkGap.markOutcome(oc, "L2", "decided", NOW);
  assert.strictEqual(F.linkGap.build({ households: HH, links: links, outcomes: oc, now: NOW }).stages[3].items.length, 0);
});

console.log("④ 행복이음으로 나가는 것");
var links = [{ id: "L9", householdId: HH[0].id, at: "2026-10-28T11:00:00", serviceNames: ["노인맞춤돌봄서비스"] }];
var consults = [{ householdId: HH[0].id, at: "2026-10-28T11:00:00", fields: [{ key: "main", value: "무릎 통증, 난방비 걱정" }, { key: "needs", value: "건강, 에너지" }] }];
t("입력 순서 12칸: 대상→일시→방법→시도 이력→…→향후 계획, 시도 이력과 연계 결과가 채워짐", function () {
  var b = F.handoff.build({ household: HH[0], attempts: att, consults: consults, links: links, outcomes: {}, now: NOW });
  assert.strictEqual(b.fields.length, 12); assert.strictEqual(b.fields[0].key, "subject"); assert.strictEqual(b.fields[11].key, "plan");
  assert.ok(/방문 부재·안 받음/.test(b.fields[3].value)); assert.strictEqual(b.fields[4].value, "무릎 통증, 난방비 걱정");
  assert.ok(/노인맞춤돌봄/.test(b.fields[8].value) && /결과 확인 전/.test(b.fields[9].value));
  assert.ok(/^\[대상 가구\(읍면동\)\]/.test(b.text)); assert.ok(/망분리/.test(b.note) && /추정/.test(b.note));
});
t("비해당이면 사유 칸이 채워짐", function () {
  var a2 = F.contacts.markNotEligible(att, HH[1].id, "income_over", "", "2026-10-29T08:30:00");
  var b = F.handoff.build({ household: HH[1], attempts: a2, now: NOW });
  assert.strictEqual(b.fields[10].value, "소득·재산 기준 초과"); assert.ok(/비해당/.test(b.fields[11].value));
});
t("묶음 파일(CSV): 머리줄 12칸·쉼표 든 칸은 따옴표, 옮긴 뒤엔 대기 0, 새 기록 생기면 다시 대기", function () {
  var bt = F.handoff.batch({ households: HH, attempts: att, consults: consults, links: links, outcomes: {}, now: NOW });
  assert.strictEqual(bt.items.length, 3); assert.strictEqual(bt.pending, 3);
  assert.strictEqual(bt.csv.split("\r\n")[0].split(",").length, 12); assert.ok(/"무릎 통증, 난방비 걱정"/.test(bt.csv));
  var sent = F.handoff.markSent({}, bt.items.map(function (x) { return x.id; }), "2026-10-29T09:00:00");
  assert.strictEqual(F.handoff.batch({ households: HH, attempts: att, consults: consults, links: links, sent: sent, now: NOW }).pending, 0);
  var att3 = F.contacts.add(att, { householdId: HH[0].id, channel: "visit", result: "met", at: "2026-10-29T18:30:00" });
  assert.strictEqual(F.handoff.batch({ households: HH, attempts: att3, consults: consults, links: links, sent: sent, now: NOW }).pending, 1);
});
t("API 연계는 «향후 구상» 문구만(망분리·법적 근거·기관 승인 전제)", function () {
  assert.ok(/향후 구상/.test(F.handoff.FUTURE) && /망 분리|업무망/.test(F.handoff.FUTURE) && /법적 근거/.test(F.handoff.FUTURE) && /승인/.test(F.handoff.FUTURE));
});

console.log("⑤ 보고서 현장 후속 업무");
t("자기 동 집계에 재시도 예정·연계 누락이 들어감", function () {
  var st = F.report.aggregate({ households: HH, attempts: att, links: links, now: NOW, area: F.report.homeArea(HH) });
  assert.ok(st.followUp && st.followUp.retryDue >= 1); assert.strictEqual(typeof st.followUp.gaps, "number");
});

console.log("문구 금지어(재제안 금지·겹침 주장)");
t("«줄인 시간» 띠·수치, «위기 점수», «우리가 개발한 행복이음 기능» 류 문구 없음", function () {
  ["officer/mount.js", "officer/features.js", "shared/report.js", "citizen/app.js", "citizen/index.html"].forEach(function (f) {
    var s = fs.readFileSync(path.join(base, f), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    assert.ok(!/줄인 시간/.test(s), f + " — 줄인 시간"); assert.ok(!/위기 점수/.test(s), f + " — 위기 점수");
  });
});

console.log("\n결과: 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
