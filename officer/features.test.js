/* 닿음 S9b-1 기능 로직 자체 시험 — 실행: node officer/features.test.js (03_시제품 폴더에서)
   의존성 없음(node 내장 assert). 데이터는 data/households.json(가상)·citizen/data/services.json 을 그대로 읽는다. */
"use strict";
var assert = require("assert");
var path = require("path");
var base = path.join(__dirname, "..");
var F = require(path.join(base, "officer/features.js"));
require(path.join(base, "shared/report.js"));
require(path.join(base, "citizen/progress.js"));
var D = require(path.join(base, "data/households.json"));
var S = require(path.join(base, "citizen/data/services.json"));

var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

var NOW = new Date("2026-10-29T09:00:00"); // 목요일
function req(id, o) {
  return Object.assign({ v: 1, id: id, createdAt: "2026-10-27T10:00:00", status: "new", region: "함창읍", contactPref: "visit",
    proxy: { isProxy: false }, matched: [{ id: "C1", name: "노인맞춤돌봄서비스" }], urgent: false,
    history: [{ at: "2026-10-27T10:00:00", status: "new", by: "citizen" }] }, o || {});
}
var HH = D.households;

console.log("① 오늘 할 일");
var attempts = [];
attempts = F.contacts.add(attempts, { householdId: HH[0].id, channel: "visit", result: "no_answer", at: "2026-10-27T10:00:00" });
attempts = F.contacts.add(attempts, { householdId: HH[1].id, channel: "phone", result: "met", at: "2026-10-27T11:00:00" });
var requests = [req("REQ-1", { urgent: true, createdAt: "2026-10-28T09:00:00" }), req("REQ-2", { region: "중동면" }),
  req("REQ-3", { status: "done" }), req("REQ-4", { status: "seen", createdAt: "2026-10-20T09:00:00", contactPref: "phone" })];
var today = F.today.build({ households: HH, areas: D.areas, office: D.meta.office, requests: requests, attempts: attempts, picked: [HH[5].id], now: NOW });
t("새 요청 2건(완료·확인 제외), 긴급이 맨 위", function () {
  assert.strictEqual(today.counts.newRequests, 2); assert.strictEqual(today.sections[0].items[0].id, "REQ-1");
});
t("기한 임박: 긴급(1영업일 → 10-29 오늘)·지난 요청 포함, 완료 제외", function () {
  var ids = today.sections[1].items.map(function (x) { return x.id; });
  assert.ok(ids.indexOf("REQ-1") >= 0 && ids.indexOf("REQ-4") >= 0 && ids.indexOf("REQ-3") < 0, ids.join(","));
  assert.ok(today.sections[1].items.filter(function (x) { return x.id === "REQ-4"; })[0].overdue);
});
t("재방문: 부재 1회 가구는 오늘 나오고, 만난 가구는 빠짐", function () {
  var ids = today.sections[2].items.map(function (x) { return x.id; });
  assert.deepStrictEqual(ids, [HH[0].id]);
});
t("동선: 방문 요청 2 + 재방문 1 + 고른 가구 1 = 4곳, 묶음 km ≤ 명단 순 km", function () {
  assert.strictEqual(today.route.order.length, 4); assert.ok(today.route.km <= today.route.naiveKm);
});

console.log("② 가구 명단(점수 없음)");
var tips = F.households.addTip([], { householdId: HH[10].id, from: "통장", text: "요즘 우편물이 쌓여 있어요", at: "2026-10-28T09:00:00" });
var rq = [req("REQ-H", { householdId: HH[20].id })];
var ord = F.households.order({ households: HH, requests: rq, attempts: attempts, tips: tips, officerOrder: [HH[30].id], now: NOW });
t("공무원 고정 → 주민 요청 → 제보 → 지난 시도 → 명단 순", function () {
  var top = ord.items.slice(0, 4).map(function (x) { return x.id; });
  assert.deepStrictEqual(top, [HH[30].id, HH[20].id, HH[10].id, HH[0].id]);
  assert.strictEqual(ord.items[4].id, HH[1].id); // 신호 없음 그룹은 원래 명단 순
});
t("결과에 점수·위기 점수 필드가 없음", function () {
  ord.items.forEach(function (x) { assert.ok(!("score" in x) && !("total" in x) && !("risk" in x)); });
});
t("고정 토글", function () { assert.deepStrictEqual(F.households.togglePin([HH[30].id], HH[30].id), []); });

console.log("③ 방문·연락 기록");
t("부재 → 1영업일 뒤, 안 해 본 시간대로", function () {
  var s = F.contacts.suggestNext(attempts, HH[0].id, NOW);
  assert.strictEqual(s.failed, 1); assert.strictEqual(s.next.slot, "오후"); assert.strictEqual(s.next.date, "2026-10-29"); // 10-28 제안이 지났으므로 오늘로
});
t("방문 부재 3회 → 간접 확인 체크리스트로 전환", function () {
  var a = [];
  ["2026-10-20T10:00:00", "2026-10-22T15:00:00", "2026-10-26T18:30:00"].forEach(function (at) { a = F.contacts.add(a, { householdId: "X", channel: "visit", result: "no_answer", at: at }); });
  var s = F.contacts.suggestNext(a, "X", NOW); assert.ok(s.escalate); assert.ok(s.checklist.length >= 3);
});
t("전화 2회 실패 → 방문으로 바꿔 제안, 주말 건너뜀", function () {
  var a = F.contacts.add([], { householdId: "Y", channel: "phone", result: "no_answer", at: "2026-10-29T10:00:00" });
  a = F.contacts.add(a, { householdId: "Y", channel: "phone", result: "no_answer", at: "2026-10-30T14:00:00" }); // 금
  var s = F.contacts.suggestNext(a, "Y", new Date("2026-10-30T15:00:00"));
  assert.strictEqual(s.next.channel, "visit"); assert.strictEqual(s.next.date, "2026-11-03"); // 금+2영업일 = 화
});
t("비해당은 사유 필수, 한 번 고르면 닫힘", function () {
  assert.throws(function () { F.contacts.add([], { householdId: "Z", result: "not_eligible" }); });
  var a = F.contacts.markNotEligible([], "Z", "income_over", "", "2026-10-28T10:00:00");
  var s = F.contacts.suggestNext(a, "Z", NOW); assert.ok(s.closed); assert.ok(/소득·재산/.test(s.closedWhy));
});

console.log("④ 상담 기록 초안");
var dr = F.consult.draft("혼자 사시는 어르신입니다. 겨울에 보일러가 고장 나 추워요. 병원비가 밀려 약을 못 사요. 끼니를 굶을 때가 있어요.",
  { label: "가구 A-001", area: "함창읍", channel: "visit", at: NOW, services: [{ name: "에너지바우처" }] });
t("욕구 영역 추출(에너지·건강·식생활), 굶음 낱말로 긴급", function () {
  ["에너지", "건강", "식생활"].forEach(function (n) { assert.ok(dr.needs.indexOf(n) >= 0, n); });
  assert.ok(dr.urgent);
});
t("행복이음 붙여넣기 문안·사례관리 10영역", function () {
  assert.ok(/\[상담 일시\] 2026-10-29 09:00/.test(dr.copyText)); assert.strictEqual(dr.caseForm.length, 10);
  assert.ok(/생활환경/.test(dr.caseText) && /일상생활유지/.test(dr.caseText));
});

console.log("⑤ 통계·보고서");
var reqs2 = [req("R1", { status: "done", history: [{ at: "2026-10-27T10:00:00", status: "new" }, { at: "2026-10-29T10:00:00", status: "done" }] }),
  req("R2", { status: "seen", urgent: true }), req("R3", { status: "cancelled" }), req("R4", { proxy: { isProxy: true, relation: "딸" } })];
var att2 = F.contacts.markNotEligible(attempts, HH[2].id, "income_over", "", "2026-10-28T10:00:00");
var links = [{ id: "L1", at: "2026-10-28T10:00:00", householdId: HH[1].id, area: HH[1].area, serviceIds: ["S04", "S05"] }];
var st = F.report.aggregate({ households: HH, requests: reqs2, attempts: att2, links: links, now: NOW });
t("집계: 접촉 3·만남 1·비해당 1(소득재산), 요청 상태별", function () {
  assert.strictEqual(st.households.total, 300); assert.strictEqual(st.households.contacted, 3);
  assert.strictEqual(st.households.met, 1); assert.strictEqual(st.households.nonEligible, 1);
  assert.strictEqual(st.nonEligibleBy[0].key, "income_over");
  assert.deepStrictEqual(st.requests.byStatus, { "new": 1, seen: 1, visiting: 0, done: 1, cancelled: 1 });
  assert.strictEqual(st.requests.avgDays, 2);
});
t("깔때기: 접수 ≥ 확인 ≥ 방문 ≥ 완료(취소 제외)", function () {
  var n = st.funnel.map(function (f) { return f.n; }); assert.deepStrictEqual(n, [3, 2, 1, 1]);
});
t("읍면동 합계 = 전체 가구", function () {
  assert.strictEqual(st.byArea.reduce(function (a, x) { return a + x.households; }, 0), 300);
});
var cd = F.report.countdown(F.report.currentRound(NOW), { now: NOW, done: 30, total: 300 });
t("차수 마감 역산(2026-5차 12-11): 남은 일수·하루 처리량", function () {
  assert.strictEqual(cd.round.no, 5); assert.strictEqual(cd.daysLeft, 43);
  assert.strictEqual(cd.workdaysLeft, 32); assert.strictEqual(cd.perWorkday, Math.ceil(270 / 32));
  assert.strictEqual(cd.onTrack, false); // 기간 18% 경과·처리 10%
});
var wk = F.report.weekly(st, { now: NOW, countdown: cd });
t("주간 보고서: 기간 월~오늘, 개조식 문안, 표 24행", function () {
  assert.strictEqual(wk.period.from, "2026-10-26"); assert.ok(/^복지 사각지대 발굴 주간/.test(wk.text));
  assert.ok(/□ 추진 현황/.test(wk.text) && /○ 발굴 명단 300가구/.test(wk.text)); assert.ok(/추정/.test(wk.text));
  assert.strictEqual(wk.table.rows.length, D.areas.length);
});
t("월간 보고서: 기간 1일~오늘", function () { assert.strictEqual(F.report.monthly(st, { now: NOW }).period.from, "2026-10-01"); });

console.log("⑥ 준비물 체크리스트");
var svcs = S.services.filter(function (s) { return s.means_tested; }).slice(0, 1).concat(S.services.filter(function (s) { return !s.means_tested; }).slice(0, 1));
var cl = F.checklist.build(svcs, S.doc_sets, { proxy: true });
t("서류 합치고 겹침 제거(신분증 1번), 대리 서류 추가", function () {
  assert.strictEqual(cl.items.filter(function (i) { return i.text === "신분증"; }).length, 1);
  assert.ok(cl.items.some(function (i) { return /위임장/.test(i.text); })); assert.strictEqual(cl.ready, false);
});
t("모두 체크하면 ready", function () {
  var c = {}; cl.items.forEach(function (i) { c = F.checklist.toggle(c, i.key); });
  assert.ok(F.checklist.build(svcs, S.doc_sets, { proxy: true, checked: c }).ready);
});

console.log("⑦ 내 요청 진행 상황");
var pr = F.progress.of(req("P1", { status: "seen", history: [{ at: "2026-10-27T10:00:00", status: "new" }, { at: "2026-10-28T09:30:00", status: "seen" }] }), NOW);
t("4단계 중 2단계 진행 중, 대기 일수", function () {
  assert.deepStrictEqual(pr.steps.map(function (s) { return s.state; }), ["done", "current", "todo", "todo"]);
  assert.strictEqual(pr.current.label, "담당자 확인"); assert.strictEqual(pr.waitedDays, 1); assert.ok(/함창읍/.test(pr.contactLine));
});
t("취소 요청·내 요청만 고르기", function () {
  assert.ok(F.progress.of(req("P2", { status: "cancelled" }), NOW).cancelled);
  assert.strictEqual(F.progress.mine([req("A1"), req("A2")], ["A2"], NOW).length, 1);
});

console.log("⑧ 방문 전 한 장 카드");
var old = HH.filter(function (x) { return x.members[0].age >= 65 && x.single; })[0];
var vc = F.visitCard.build({ household: old, attempts: [{ householdId: old.id, channel: "visit", result: "no_answer", at: "2026-10-27T10:00:00" }], now: NOW });
t("65세 이상 홀로 → 기초연금·노인맞춤돌봄 «가능성», 선정 결정 아님 문구", function () {
  assert.ok(vc.recommend.indexOf("기초연금") >= 0 && vc.recommend.indexOf("노인맞춤돌봄서비스") >= 0);
  assert.ok(/선정 결정이 아닙니다/.test(vc.disclaimer)); assert.strictEqual(vc.tries.length, 1); assert.ok(vc.next);
});
console.log("⑨ 안전 방문");
var sf = F.safety.flag({}, HH[1].id, true, "지난 방문 폭언");
t("담당자 표시 → 2인 방문, 메모 위험 낱말도 2인", function () {
  assert.strictEqual(F.safety.twoPerson(sf, [], [], HH[1].id).two, true);
  assert.strictEqual(F.safety.twoPerson({}, [{ householdId: HH[2].id, note: "맹견 있음" }], [], HH[2].id).two, true);
  assert.strictEqual(F.safety.twoPerson({}, [], [], HH[3].id).two, false);
});
var sv2 = F.safety.start(sf, { householdId: HH[1].id, buddy: "김주무관", at: "2026-10-29T09:00:00", minutes: 60 });
t("방문 시작 60분 뒤 귀청 미확인 → 팀장 확인, 귀청 확인하면 사라짐", function () {
  assert.strictEqual(F.safety.overdue(sv2, "2026-10-29T10:30:00").length, 1);
  assert.strictEqual(F.safety.overdue(F.safety.checkin(sv2, sv2.visits[0].id, "2026-10-29T09:50:00"), "2026-10-29T10:30:00").length, 0);
});
console.log("⑩ 강제개문 체크리스트");
t("단계 기록·되돌리기, 다음 단계 안내", function () {
  var lg = F.forcedEntry.record([], HH[1].id, "tries", "", NOW); lg = F.forcedEntry.record(lg, HH[1].id, "report", "112 신고", NOW);
  var s1 = F.forcedEntry.status(lg, HH[1].id); assert.strictEqual(s1.done, 2); assert.ok(/입회자/.test(s1.next));
  assert.strictEqual(F.forcedEntry.status(F.forcedEntry.undo(lg, HH[1].id, "report"), HH[1].id).done, 1);
});
console.log("⑪ 연계 누락 보드");
var gp = F.linkGap.build({ households: HH, now: NOW,
  attempts: [{ householdId: HH[5].id, result: "met", at: "2026-10-27T10:00:00" }],
  links: [{ id: "L1", householdId: HH[6].id, at: "2026-10-01T10:00:00" }],
  requests: [req("R9", { status: "seen", history: [{ at: "2026-10-23T10:00:00", status: "seen" }] })] });
t("상담 뒤 연계 없음 1·확인 뒤 멈춤 1·연계 뒤 결과 미확인 1", function () {
  assert.deepStrictEqual(gp.stages.map(function (s) { return s.items.length; }), [1, 1, 1]); assert.strictEqual(gp.total, 3);
  assert.strictEqual(F.linkGap.build({ households: HH, now: NOW, links: [{ id: "L1", householdId: HH[6].id, at: "2026-10-01T10:00:00" }], outcomes: F.linkGap.markOutcome({}, "L1", "선정") }).total, 0);
});
console.log("⑫ 요청 답변 초안");
t("문자·전화 대본, 긴급이면 129 안내, 자동 발송 없음", function () {
  var rp = F.reply.draft(req("R1", { urgent: true, displayName: "김○○" }));
  assert.ok(/김○○님/.test(rp.sms) && /129/.test(rp.sms)); assert.ok(rp.phone.length >= 5); assert.ok(/자동 발송 없음/.test(rp.note));
});

console.log("\n결과: 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
