/* 닿음 S11-i 시험 — 실행: node officer/fieldwork.test.js (03_시제품 폴더에서)
   공무원 업무 도우미 보강 순수 함수(A안 신고 접수·A1 차수 대조·A2 헛걸음·A3 질문 길잡이·B1 의뢰서·B2 사후관리 달력·C1 30초 카드·C2 약속·C3 큰 글씨)
   + 시연 데이터가 «언제 열어도 꽉 참» + 개인정보·금지 문구 + 보고 숫자 48.3% 그대로.
   HWPX_OUT=<폴더> 를 주면 의뢰서 견본 .hwpx 를 써 둔다(한글 실검증용: python shared/office_check.py <파일>). */
"use strict";
var assert = require("assert"), path = require("path"), fs = require("fs");
var base = path.join(__dirname, "..");
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

var RealDate = Date;
function withNow(iso, fn) {
  var fixed = new RealDate(iso).getTime();
  function FakeDate(a) { if (!(this instanceof FakeDate)) return new RealDate(fixed).toString(); return arguments.length ? new (Function.prototype.bind.apply(RealDate, [null].concat([].slice.call(arguments))))() : new RealDate(fixed); }
  FakeDate.prototype = RealDate.prototype; FakeDate.now = function () { return fixed; }; FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC;
  global.Date = FakeDate;
  try { return fn(); } finally { global.Date = RealDate; }
}
var mem = {};
global.localStorage = { getItem: function (k) { return k in mem ? mem[k] : null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; }, key: function (i) { return Object.keys(mem)[i]; }, get length() { return Object.keys(mem).length; } };
global.location = { search: "" };
global.window = global;
global.DAEUM_CONFIG = { requestsKey: "daeum.requests" };
var F = require(path.join(base, "officer/features.js"));
require(path.join(base, "officer/fieldwork.js"));
require(path.join(base, "shared/progress.js"));
global.DaeumRequests = { key: "daeum.requests", list: function () { return JSON.parse(mem["daeum.requests"] || "[]"); } };
var H = require(path.join(base, "shared/hwpx.js"));
var SVC = require(path.join(base, "data/services.json"));
var NOW = new Date("2026-11-04T09:00:00"); // 수요일
var PII = /\d{6}-?[1-4]\d{6}|0\d{1,2}-\d{3,4}-\d{4}|가상리/;

console.log("S11-i 시험");

console.log("S11-k 신설 · 걷어낸 것");
t("F.deadline.plan: 9가구·기한 11-13(금)·하루 5집 → 근무일 8일 · 2일 방문 · 여유 5일(시안 ② 띠와 같음)", function () {
  var p = F.deadline.plan(9, "2026-11-13", 5, { today: NOW });
  assert.strictEqual(p.left, 8); assert.strictEqual(p.need, 2); assert.strictEqual(p.spare, 5); assert.ok(!p.over);
  assert.strictEqual(p.days.map(function (d) { return d.kind; }).join(","), "today,go,go,spare,spare,spare,spare,end");
  assert.ok(/근무일 8일 남음/.test(p.line) && !/영업일/.test(p.line));
  var q = F.deadline.plan(9, "2026-11-05", 5, { today: NOW }); assert.ok(q.over && /하루 9집/.test(q.line));
  assert.ok(!F.deadline.plan(9, null, 5).set);
});
t("F.deadline.split: 방문 순서 그대로 하루 상한씩 묶음", function () {
  assert.deepStrictEqual(F.deadline.split(["A", "B", "C", "D", "E", "F", "G"], 5), [["A", "B", "C", "D", "E"], ["F", "G"]]);
});
t("신고 접수 함수 걷어냄(F.intakeReport 없음)", function () { assert.strictEqual(F.intakeReport, undefined); });

console.log("A1 명단 차수 대조");
t("새로·계속·빠짐 3색 + 빠진 집은 우리 기록으로 이유", function () {
  var prev = { ym: "2026-09", ids: ["A", "B", "C", "D"], ranks: { A: "1", B: "2" } }, cur = { ym: "2026-10", ids: ["B", "E", "A"], ranks: { B: "1", E: "2", A: "3" }, cnts: { B: 2 } };
  var att = [{ householdId: "C", channel: "visit", result: "not_eligible", reason: "income_over", at: "2026-09-20T10:00:00" }];
  var c = F.rounds.compare(prev, cur, { attempts: att, links: [{ id: "L1", householdId: "D", serviceNames: ["주거급여"] }], outcomes: { L1: { result: "decided", at: "2026-10-01" } } });
  assert.deepStrictEqual(c.counts, { new: 1, stayed: 2, dropped: 2 });
  assert.strictEqual(c.line, "2026-09 → 2026-10 · 새로 1 · 계속 2 · 빠짐 2");
  assert.strictEqual(c.groups.new[0].id, "E"); assert.strictEqual(c.groups.stayed[0].prevRank, "2");
  assert.ok(/비해당\(소득·재산 기준 초과\)/.test(c.groups.dropped[0].note)); assert.ok(/연계 결정 확인 — 주거급여/.test(c.groups.dropped[1].note));
  assert.deepStrictEqual(c.legend.map(function (x) { return x.tone; }), ["new", "stay", "gone"]);
});
t("차수 기억: 같은 달은 바꿔 끼우고 최근 3차수만", function () {
  var r = F.rounds.remember([{ ym: "2026-07" }, { ym: "2026-08" }, { ym: "2026-09" }], { ym: "2026-10", ids: [] });
  assert.deepStrictEqual(r.map(function (x) { return x.ym; }), ["2026-08", "2026-09", "2026-10"]);
  r = F.rounds.remember(r, { ym: "2026-10", ids: ["X"] }); assert.strictEqual(r.length, 3); assert.deepStrictEqual(r[2].ids, ["X"]);
  assert.strictEqual(F.rounds.latestPair(r).prev.ym, "2026-09"); assert.strictEqual(F.rounds.latestPair([{ ym: "1" }]), null);
});

console.log("A2 헛걸음 줄이기");
t("오전·이른 오후 부재 → «오후 늦게» 추천, 만난 적 있으면 그 시간", function () {
  var a = [{ householdId: "H", channel: "visit", result: "no_answer", at: "2026-10-28T10:00:00" }, { householdId: "H", channel: "visit", result: "no_answer", at: "2026-10-30T13:30:00" }];
  var p = F.visitTime.profile(a, "H");
  assert.strictEqual(p.best.k, "late"); assert.strictEqual(p.best.hours, "15~18시");
  assert.strictEqual(p.line, "이 집은 오전 1번 · 이른 오후 1번 비어 있었습니다 → 오후 늦게(15~18시) 방문 추천");
  p = F.visitTime.profile(a.concat([{ householdId: "H", channel: "visit", result: "met", at: "2026-10-31T19:00:00" }]), "H");
  assert.strictEqual(p.best.k, "eve"); assert.ok(/지난번 저녁에 만났습니다/.test(p.best.why));
  assert.strictEqual(F.visitTime.profile([], "H").best, null);
});
t("이웃 말(«저녁 7시 넘어 들어오시는 것 같다»)이 있으면 그 시간대", function () {
  var a = [{ householdId: "H", channel: "visit", result: "no_answer", at: "2026-10-28T10:00:00" }];
  var p = F.visitTime.profile(a, "H", { neighborLog: [{ householdId: "H", text: "옆집: 저녁 7시 넘어 들어오시는 것 같다" }] });
  assert.strictEqual(p.best.k, "eve"); assert.ok(/이웃·통장 말/.test(p.best.why));
});
t("3회 부재 뒤: 통·이장 협조 문안(이름·주소 없음) → 이웃 탐문 → 종결 판단 4갈래", function () {
  var a = ["2026-10-26T10:30:00", "2026-10-28T15:00:00", "2026-11-03T18:10:00"].map(function (at) { return { householdId: "Q", channel: "visit", result: "no_answer", at: at }; });
  var s = F.visitTime.afterThree(a, "Q", { area: "이안면", checked: { tong: "2026-11-04T09:10:00" } });
  assert.ok(s.active); assert.strictEqual(s.absentVisits, 3);
  assert.deepStrictEqual(s.steps.map(function (x) { return x.key; }), ["tong", "neighbor", "close"]);
  assert.ok(s.steps[0].done && /이안면 관내/.test(s.steps[0].text) && /3회 부재/.test(s.steps[0].text) && !PII.test(s.steps[0].text));
  assert.strictEqual(s.next, "지금 할 일: 이웃 탐문 기록"); assert.strictEqual(s.steps[2].options.length, 4);
  assert.strictEqual(F.visitTime.afterThree(a.slice(0, 2), "Q").active, false);
  var lg = F.visitTime.addNeighborLog([], "Q", "앞집 할머니: 낮엔 병원, 010-2222-3333", NOW); assert.ok(!/2222/.test(lg[0].text));
});

console.log("A3 질문 길잡이");
t("상담 글에서 유형 짐작 → 꼭 물을 것 중 빠진 항목 표시 · 체크로 채움", function () {
  var txt = "혼자 사시는데 보일러가 고장 나서 추워요. 월세가 두 달 밀렸어요.";
  assert.deepStrictEqual(F.askGuide.detect(txt), ["생계", "주거", "고립"]);
  var g = F.askGuide.check(txt, ["주거", "고립"], {});
  assert.strictEqual(g.total, 8); assert.ok(g.items.filter(function (x) { return x.key === "heat"; })[0].asked);
  assert.ok(g.missing.some(function (x) { return x.key === "emerg"; }));
  var g2 = F.askGuide.check(txt, ["주거", "고립"], { emerg: true, evict: true });
  assert.strictEqual(g2.missing.length, g.missing.length - 2); assert.ok(/꼭 물을 것 8개 중 \d개 확인 · 빠짐 \d/.test(g2.line));
});
t("초안은 행복이음 입력 칸 순서 + 빠진 항목은 «다음 방문 때 확인»으로", function () {
  var g = F.askGuide.check("보일러가 고장 나서 추워요", ["주거"], {});
  var d = F.askGuide.draft({ label: "가구 P-013", area: "공검면", at: NOW, needs: ["에너지", "주거"], summary: "보일러 고장, 난방 못 함", services: ["에너지바우처"], next: "11-10 신청 여부 전화 확인", guide: g });
  var order = F.handoff.FIELDS.map(function (f) { return f[0]; }), keys = d.fields.map(function (f) { return f.key; });
  assert.deepStrictEqual(keys, keys.slice().sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); }), "행복이음 순서");
  assert.strictEqual(keys[0], "subject"); assert.ok(/^\[행복이음 입력 초안 — 공무원 확정\]\n대상 가구\(읍면동\): 가구 P-013 · 공검면/.test(d.text));
  assert.ok(/다음 방문 때 확인: .*자가·전세·월세/.test(d.text)); assert.strictEqual(d.missing, g.missing.length);
});

console.log("B1 연계 의뢰서");
var REC = { at: "2026-11-02T10:40:00", label: "가구 A-080", area: "함창읍", householdId: "A-080",
  text: "[행복이음 입력 초안 — 공무원 확정]\n주요 욕구: 생계, 정신건강\n상담 요약: 실직 뒤 잠을 못 자고 우울하다고 함. 경상북도 상주시 함창읍 가상리 140, 010-9876-5432\n연계 후보: 긴급복지 생계지원\n다음 할 일: 11-10 신청 여부 전화 확인" };
t("기관 고르기 제안 · 4기관 모두 hwpx 로 만들어지고 가림 4칸·개인정보 0", function () {
  assert.deepStrictEqual(F.referral.suggest({ text: REC.text }), ["emergency", "mental"]);
  assert.deepStrictEqual(F.referral.suggest({ text: "정신건강 걱정은 없음. 보일러 고장, 가스비 밀림" }), ["housing"], "부정문은 추천 근거 아님(파로 주의 05 ②)");
  assert.deepStrictEqual(F.referral.suggest({ text: "돌봄은 필요 없다고 하심" }), []);
  Object.keys(F.referral.ORGS).forEach(function (k) {
    var doc = F.referral.build(REC, k, { now: NOW }), body = JSON.stringify(doc);
    assert.ok(!PII.test(body) && !/9876|가상리 140/.test(body), k + " 개인정보");
    assert.ok(/성명.*행복이음 확인 후 기재/.test(body) && /주민등록번호/.test(body) && /연락처/.test(body) && /A-080/.test(body), k + " 가림 4칸");
    var bytes = H.build(doc); assert.ok(bytes.length > 3000 && bytes[0] === 0x50 && bytes[1] === 0x4B, k + " zip");
    if (process.env.HWPX_OUT) fs.writeFileSync(path.join(process.env.HWPX_OUT, F.referral.fileName(k, NOW)), Buffer.from(bytes));
  });
  assert.strictEqual(F.referral.fileName("mental", NOW), "연계의뢰서_정신건강복지센터_20261104.hwpx");
});

console.log("B2 사후관리 달력");
t("1·3·6개월 일정 · 기한 지남 빨강 · 오늘 재확인 · 달력 칸", function () {
  var links = [{ id: "L1", householdId: "A", label: "가구 A", at: "2026-09-01T10:00:00", serviceNames: ["기초연금"] }, { id: "L2", householdId: "B", label: "가구 B", at: "2026-06-01T10:00:00" }, { id: "L3", householdId: "C", at: "2026-10-01T10:00:00" }];
  var oc = { L1: { result: "decided", at: "2026-10-05T10:00:00" }, L2: { result: "decided", at: "2026-05-01T10:00:00" }, L3: { result: "not_applied", at: "2026-10-02" } };
  var it = F.aftercare.schedule(links, oc, { "L2:m1": "2026-06-08" }, NOW);
  assert.strictEqual(it.length, 6, "안 하기로 한 연계는 빠짐");
  var a1 = it.filter(function (x) { return x.key === "L1:m1"; })[0]; assert.strictEqual(a1.date, "2026-11-04"); assert.strictEqual(a1.state, "today");
  var b3 = it.filter(function (x) { return x.key === "L2:m3"; })[0]; assert.strictEqual(b3.state, "overdue"); assert.ok(b3.overdueDays > 0);
  assert.strictEqual(it.filter(function (x) { return x.key === "L2:m1"; })[0].state, "done");
  var td = F.aftercare.today(it, NOW); assert.strictEqual(td.line, "오늘 재확인 1집 · 기한 지남 1집");
  var m = F.aftercare.month(it, "2026-11", { promises: [{ due: "2026-11-04", text: "서류", done: false }] });
  assert.ok(m.weeks.length >= 4 && m.weeks.every(function (w) { return w.length === 7; }));
  var cell = [].concat.apply([], m.weeks).filter(function (c) { return c.date === "2026-11-04"; })[0];
  assert.strictEqual(cell.items.length, 1); assert.strictEqual(cell.promises.length, 1);
  assert.ok(F.aftercare.STEPS.map(function (s) { return s.days; }).join() === "30,90,180");
});

console.log("C2 약속 챙기기");
t("상담 글에서 약속·기한을 규칙 낱말로 뽑기(서류·전화·방문·알아보기)", function () {
  var p = F.promises.extract("다음 주 월요일에 신청서를 가져다 드리겠습니다. 내일 따님께 전화 드릴게요. 3영업일 뒤 다시 방문하겠습니다. 날씨가 춥네요.", { householdId: "P", at: NOW });
  assert.deepStrictEqual(p.map(function (x) { return x.kind; }), ["doc", "call", "visit"]);
  assert.deepStrictEqual(p.map(function (x) { return x.due; }), ["2026-11-09", "2026-11-05", "2026-11-09"]);
  var q = F.promises.extract("[행복이음 입력 초안 — 공무원 확정]\n다음 할 일: 11-10 신청 여부 전화 확인", { householdId: "Q", at: NOW });
  assert.strictEqual(q.length, 1); assert.strictEqual(q[0].due, "2026-11-10");
  var list = F.promises.merge(p, p.concat(q)); assert.strictEqual(list.length, 4, "중복 없음");
  list = F.promises.toggle(list, list[1].id, NOW); assert.ok(list[1].done);
  assert.strictEqual(F.promises.open(list, "P").length, 2);
  var d = F.promises.dueToday([{ id: 1, due: "2026-11-04", done: false }, { id: 2, due: "2026-11-01", done: false }, { id: 3, due: "2026-11-01", done: true }], NOW);
  assert.strictEqual(d.line, "오늘 지킬 약속 1 · 기한 지난 약속 1");
});

console.log("C1 집 앞 30초 요약");
t("지난 방문 요점 · 주의 꼬리표 + 부재 시각(A2) · 지난번 약속(C2) 한 장", function () {
  var a = [{ householdId: "P-013", channel: "visit", result: "no_answer", at: "2026-10-29T10:00:00" }, { householdId: "P-013", channel: "visit", result: "no_answer", at: "2026-11-02T14:30:00", note: "현관에 우편물" }];
  var c = F.homeCard.build("P-013", { household: { id: "P-013", label: "P-013", area: "공검면" }, attempts: a, notes: { "P-013": ["개가 있음"] },
    promises: [{ id: 1, householdId: "P-013", text: "신청서 가져다 드리기", due: "2026-11-04", done: false }], records: [], now: NOW });
  assert.strictEqual(c.title, "가구 P-013", "가구 번호를 번지로 가리지 않음(파로 주의 05 ①)"); assert.ok(c.cautions.some(function (x) { return x.t === "개가 있음"; }));
  assert.ok(c.cautions.some(function (x) { return x.k === "time" && /오후 늦게/.test(x.t); }));
  assert.ok(c.lines.length >= 3 && c.lines.length <= 5 && /지난번 약속: 신청서 가져다 드리기\(11\/04\)/.test(c.lines.join("\n")));
  var r = F.homeCard.build("A-080", { records: [REC], attempts: [], now: NOW }); assert.ok(/실직 뒤/.test(r.lastVisit === null ? r.lines.join() : "")); assert.ok(!PII.test(JSON.stringify(r)));
  assert.deepStrictEqual(F.homeCard.setNotes({}, "X", ["개가 있음", "개가 있음", ""]), { X: ["개가 있음"] });
});

console.log("C3 큰 글씨 안내문");
t("서류 목록·가상 연락처·다음 방문일 · 글자 18pt 이상 · 개인정보 0", function () {
  var svc = ["에너지바우처", "기초연금"].map(function (n) { return SVC.services.filter(function (s) { return s.name.indexOf(n) >= 0; })[0]; });
  var b = F.bigPrint.build({ services: svc, docSets: SVC.doc_sets, nextVisit: "2026-11-10T15:00:00", nextSlot: "오후", area: "공검면" });
  assert.strictEqual(b.blocks.length, 2); assert.ok(b.blocks[0].items.indexOf("신분증") >= 0);
  assert.ok(/공검면 행정복지센터 맞춤형복지팀 · ☎ 054-000-0000\(가상 번호\)/.test(b.contact)); assert.strictEqual(b.next, "다음에 찾아뵙는 날: 11월 10일(화) 오후");
  var pts = (b.html.match(/font-size:(\d+)pt/g) || []).map(function (x) { return +x.replace(/\D/g, ""); });
  assert.ok(pts.length > 3 && Math.min.apply(null, pts) >= 18, "가장 작은 글자 " + Math.min.apply(null, pts) + "pt");
  assert.ok(!/가구|[A-Q]-\d{3}|성명|주소/.test(b.html), "이름·주소·가구 번호 없음");
});

console.log("시연 데이터 — 언제 열어도 꽉 참");
["2026-11-04T09:00:00", "2026-11-09T09:00:00", "2026-12-14T09:00:00"].forEach(function (iso) {
  t(iso.slice(0, 10) + " — 9가지가 모두 빈 화면 아님", function () {
    Object.keys(mem).forEach(function (k) { delete mem[k]; });
    withNow(iso, function () { delete require.cache[require.resolve(path.join(base, "officer/demo_seed.js"))]; require(path.join(base, "officer/demo_seed.js")); });
    var now = new Date(iso), S = F.store;
    assert.strictEqual(DaeumRequests.list().length, 0, "시연 신고 0건(신고 접수 제거)");
    var pair = F.rounds.latestPair(S.get("rounds", [])), c = F.rounds.compare(pair.prev, pair.cur, { attempts: S.get("attempts"), links: S.get("links"), outcomes: S.get("outcomes") });
    assert.deepStrictEqual(c.counts, { new: 6, stayed: 3, dropped: 4 }); assert.ok(c.groups.dropped.every(function (x) { return /우리 기록/.test(x.note); }));
    var vt = F.visitTime.profile(S.get("attempts"), "P-013", { tips: S.get("tips", []), neighborLog: S.get("neighborLog") }); assert.ok(vt.best, "P-013 추천 시간");
    var a3 = F.visitTime.afterThree(S.get("attempts"), "Q-032", { checked: S.get("afterThree", {})["Q-032"], neighborLog: S.get("neighborLog"), area: "이안면" });
    assert.ok(a3.active && a3.steps[0].done && a3.steps[1].done, "Q-032 3회 부재 단계");
    var recs = JSON.parse(mem["daeum.officer.records"]); assert.ok(recs.length >= 2 && F.referral.suggest({ text: recs[0].text }).length >= 1, "확정 기록 → 의뢰서 기관");
    var ac = F.aftercare.schedule(S.get("links"), S.get("outcomes"), S.get("followups"), now), td = F.aftercare.today(ac, now);
    assert.ok(ac.some(function (x) { return x.step === "m6"; }) && td.overdue.length >= 1, "6개월 일정·기한 지남");
    if (!F.util.isOff(now)) assert.ok(td.today.length >= 1, "오늘 재확인");
    var pd = F.promises.dueToday(S.get("promises"), now); assert.ok(F.promises.open(S.get("promises")).length >= 4 && pd.overdue.length >= 1);
    if (!F.util.isOff(now)) assert.ok(pd.today.length >= 1, "오늘 약속");
    var hc = F.homeCard.build("P-013", { attempts: S.get("attempts"), notes: S.get("homeNotes"), promises: S.get("promises"), neighborLog: S.get("neighborLog"), records: recs, now: now });
    assert.ok(hc.cautions.length >= 2 && hc.lines.length >= 3, "P-013 30초 카드");
    var g = F.askGuide.check("혼자 사시는데 보일러가 고장 나서 추워요", null, {}); assert.ok(g.total > 0 && g.missing.length > 0);
  });
});

console.log("지키는 것");
t("금지 문구 없음(위기 점수·줄인 시간·발굴 도우미) · 서버 호출 없음", function () {
  var s = fs.readFileSync(path.join(base, "officer/fieldwork.js"), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
  assert.ok(!/위기 점수|줄인 시간|발굴 도우미/.test(s)); assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|supabase/i.test(s));
});
t("보고 숫자 48.3% 그대로(첫 화면 고정값·보고 집계 파일 손대지 않음)", function () {
  assert.ok(/SNAP = \{ n: 9, naive: 127\.31, plan: 65\.77, pct: 48\.3 \}/.test(fs.readFileSync(path.join(base, "officer/front.js"), "utf8")));
  var a = fs.readFileSync(path.join(base, "shared/report.js"), "utf8"); assert.ok(!/fieldwork|intakeReport/.test(a));
});
t("주민 화면 진입 0 · 신호 서버 입구 꺼짐(표·함수는 그대로)", function () {
  assert.ok(!fs.existsSync(path.join(base, "citizen")));
  var cfg = fs.readFileSync(path.join(base, "shared/config.js"), "utf8"); assert.ok(/signalUrl: "",/.test(cfg) && /signalTable: "daeum_signal"/.test(cfg));
});

console.log("\nS11-i 시험: 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
