/* S11-d2 → S11-k 시험(⚙️ 파로, 2026-11-02 · 11-03 3차 규칙). 실행: node officer/s11d2.test.js (03_시제품 에서). 브라우저·네트워크 0.
   ① 앞당김 3차(축 4개·최대 7칸) = 규격서(01_리서치/S11-d2_우선순위_규칙.md 1-5) · 시안 S11-k ③ 9가구 순서와 같은 값
      (11-04 · 한파주의보 · Q-033 AI 초기상담 안 닿음 · P-013 부재 10-30·11-03)
   ② 신고 끼워 넣기 걷어냄(11-03 호창님 «신고접수 기능은 빼기로») — requests 인자를 받지 않음
   ③ 명단 밖 가구 A안 대조(in_list·near·not_in_list·2차례) · 보고 한 줄
   ④ 시연 시드: 명단 열·명단 밖 메모 4·확정 기록 2·방문 계획·방문 결과 상시, 시연 신고 0, 실제로 불러온 명단은 덮지 않음
   ⑤ 주간 보고 기간: 월요일에도 7일 · 명단 서식 «발굴년월» 열 읽기 · 금지 문구 */
"use strict";
var assert = require("assert"), path = require("path"), fs = require("fs");
var base = path.join(__dirname, "..");
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

var P = require(path.join(base, "officer/priority.js"));
var D = require(path.join(base, "data/households.json"));
function hh(id) { return D.households.filter(function (h) { return h.id === id; })[0]; }
var IDS = ["A-009", "Q-033", "P-026", "P-033", "P-013", "B-015", "A-056", "B-059", "A-086"];
var CNT = [1, 1, 1, 1, 1, 3, 2, 2, 1], PROC = ["미처리", "미처리", "처리중", "미처리", "미처리", "처리중", "미처리", "미처리", "미처리"], LON = [1, 1, 0, 1, 1, 1, 1, 1, 1];
var META = {}; IDS.forEach(function (id, i) { META[id] = { prio: String(i + 1), cnt: CNT[i], proc: PROC[i], ym: "2026-10", lonely: !!LON[i], aiRes: id === "Q-033" ? "안 닿음" : "" }; });
var ATT = [{ householdId: "P-013", channel: "visit", result: "no_answer", at: "2026-10-30T10:00:00" }, { householdId: "P-013", channel: "visit", result: "absent", at: "2026-11-03T10:30:00" }];
var CTX = { today: "2026-11-04T09:00:00", meta: META, weather: { name: "한파주의보" }, attempts: ATT };
var R = P.compute(IDS.map(hh), CTX), BY = {}; R.forEach(function (r) { BY[r.id] = r; });
function ids(a) { return a.map(function (r) { return r.id; }); }

console.log("① 앞당김 3차(규격서 1-5 · 시안 S11-k ③)");
t("방문 순서 = A-009 → Q-033 → P-033 → P-026 → P-013 → A-056 → B-015 → B-059 → A-086(시안 ③과 같음)", function () {
  assert.deepStrictEqual(ids(R), ["A-009", "Q-033", "P-033", "P-026", "P-013", "A-056", "B-015", "B-059", "A-086"]);
});
t("앞당김 G = 2·3·3·2·3·4·2·3·4 · 보정값 K = 발굴 순위 − G", function () {
  assert.deepStrictEqual(R.map(function (r) { return r.G; }), [2, 3, 3, 2, 3, 4, 2, 3, 4]);
  R.forEach(function (r) { assert.strictEqual(r.K, r.listRank - r.G, r.id); });
});
t("축별 칸: A-056 오늘의 위험 2·만남 공백 1·처리 기한 1 · Q-033 닿지 않음(AI) · P-013 닿지 않음(부재 2번) · P-026 오늘의 위험 0(75세 미만·고독사 N)", function () {
  assert.deepStrictEqual(BY["A-056"].ax, { g: 2, n: 1, d: 0, r: 1 });
  assert.deepStrictEqual(BY["Q-033"].rows, ["g2", "d1"]); assert.deepStrictEqual(BY["P-013"].rows, ["g2", "d2"]); assert.strictEqual(BY["P-013"].absent, 2);
  assert.deepStrictEqual(BY["P-026"].ax, { g: 0, n: 2, d: 0, r: 0 }); assert.deepStrictEqual(BY["A-086"].rows, ["g2", "n2"]);
});
t("상한: 축마다 가장 큰 줄 하나 · 닿지 않음은 AI·부재 둘 다여도 1칸 · 경보 + 혼자 사는 고령 = 3 · 전체 최대 7", function () {
  var m2 = JSON.parse(JSON.stringify(META)); m2["P-013"].aiRes = "안 닿음"; m2["A-086"].cnt = 2;
  var r2 = P.compute(IDS.map(hh), Object.assign({}, CTX, { meta: m2, weather: { name: "한파경보" } })), b2 = {}; r2.forEach(function (r) { b2[r.id] = r; });
  assert.strictEqual(b2["P-013"].ax.d, 1); assert.deepStrictEqual(b2["P-013"].rows, ["g1", "d1", "d2"]);
  assert.deepStrictEqual(b2["A-086"].ax, { g: 3, n: 2, d: 0, r: 1 }); assert.strictEqual(b2["A-086"].G, 6);
  assert.strictEqual(b2["P-026"].ax.g, 1, "경보 · 혼자 사는 고령 아님 = +1(g3)");
  r2.forEach(function (r) { assert.ok(r.G <= 7); });
});
t("동점: P-033·P-026(K 1) → 오늘의 위험 큰 P-033 먼저 · A-009·Q-033(K −1) → 발굴 순위 · B-059·A-086(K 5) → 발굴 순위", function () {
  assert.ok(BY["P-033"].todayRank < BY["P-026"].todayRank && BY["P-033"].K === BY["P-026"].K);
  assert.ok(BY["A-009"].todayRank < BY["Q-033"].todayRank && BY["B-059"].todayRank < BY["A-086"].todayRank);
});
t("이유 한 줄 «발굴 N순위 → 오늘 M번째 · 이유» · 점수 숫자 없음 · «정보원» 줄임 없음", function () {
  assert.strictEqual(BY["P-013"].line, "발굴 5순위 → 오늘 5번째 · 한파주의보 · 부재 2번");
  assert.strictEqual(BY["Q-033"].line, "발굴 2순위 → 오늘 2번째 · 한파주의보 · AI 초기상담 안 닿음");
  R.forEach(function (r) { assert.ok(!/점|가산|[+]\d|(^|[^회])정보원/.test(r.line), "줄: " + r.line); });
});
t("근거(detail) 끝 줄 = «앞당김 N칸(오늘의 위험 a·만남 공백 b·닿지 않음 c·처리 기한 d, 최대 7)» · 첫 줄 정식 명칭", function () {
  var d = BY["A-056"].detail;
  assert.strictEqual(d[0], "한국사회보장정보원 발굴 7순위");
  assert.strictEqual(d[d.length - 1], "앞당김 4칸(오늘의 위험 2·만남 공백 1·닿지 않음 0·처리 기한 1, 최대 7)");
});
t("민감도(규격서 1-7): 특보 없음 → P-026·P-033만 바뀜 · 한파경보 → 기준과 같음", function () {
  assert.deepStrictEqual(ids(P.compute(IDS.map(hh), Object.assign({}, CTX, { weather: null }))), ["A-009", "Q-033", "P-026", "P-033", "P-013", "A-056", "B-015", "B-059", "A-086"]);
  assert.deepStrictEqual(ids(P.compute(IDS.map(hh), Object.assign({}, CTX, { weather: { name: "한파경보" } }))), ids(R));
});
t("순서 밖: 이번 차수 만남·거절·처리 완료 → 빼고 .excluded 로 · 간접 확인(indirect_ok) 뒤 부재는 0", function () {
  var a = ATT.concat([{ householdId: "A-009", channel: "visit", result: "met", at: "2026-11-03T15:00:00" }, { householdId: "B-015", channel: "visit", result: "refused", at: "2026-11-02T15:00:00" },
    { householdId: "A-086", channel: "visit", result: "met", at: "2026-09-20T10:00:00" }]);
  var m2 = JSON.parse(JSON.stringify(META)); m2["B-059"].proc = "처리 완료";
  var r = P.compute(IDS.map(hh), Object.assign({}, CTX, { attempts: a, meta: m2 }));
  assert.deepStrictEqual(r.excluded.map(function (x) { return x.id; }).sort(), ["A-009", "B-015", "B-059"]);
  assert.ok(ids(r).indexOf("A-086") >= 0, "지난 차수 만남은 순서 안");
  var r3 = P.compute(IDS.map(hh), Object.assign({}, CTX, { attempts: ATT.concat([{ householdId: "P-013", channel: "visit", result: "indirect_ok", at: "2026-11-03T16:00:00" }]) }));
  assert.strictEqual(r3.filter(function (x) { return x.id === "P-013"; })[0].ax.d, 0);
});
t("담당자 «앞에 두기»는 맨 위 · «내일로»는 맨 끝 · 미처리 경과일 = (횟수−1)×60 + 발굴년월 1일부터", function () {
  var r3 = P.compute(IDS.map(hh), Object.assign({}, CTX, { pins: ["B-059"], deferred: ["A-009"] }));
  assert.strictEqual(r3[0].id, "B-059"); assert.ok(/^담당자가 앞에 둠 · /.test(r3[0].line)); assert.strictEqual(r3[r3.length - 1].id, "A-009");
  assert.strictEqual(P.pendingDays(META["A-056"], "2026-11-04T09:00:00"), 94); assert.strictEqual(P.pendingDays(META["P-026"], "2026-11-04T09:00:00"), null);
});

console.log("② 신고 끼워 넣기 걷어냄");
t("requests·noResponse 를 넘겨도 순서가 같다(받지 않음) · 끼워 넣기 함수 없음", function () {
  var r = P.compute(IDS.map(hh), Object.assign({}, CTX, { requests: [{ householdId: "P-033", urgent: true, status: "new" }], noResponse: { "P-026": { hours: 49 } } }));
  assert.deepStrictEqual(ids(r), ids(R)); assert.strictEqual(P.insertCheapest, undefined); assert.strictEqual(P.urgentNext, undefined);
  assert.ok(!/requests|noResponse/.test(fs.readFileSync(path.join(base, "officer/flow.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")));
});
t("근무 넘김 → 미룰 집 제안 = 담당자 고정 빼고 방문 순서 맨 끝", function () {
  assert.strictEqual(P.deferCandidate(R, IDS, []), "A-086"); assert.strictEqual(P.deferCandidate(R, IDS, ["A-086"]), "B-059");
});

console.log("③ 명단 밖 가구(A안)");
var LIST = [{ id: "", addr: "경상북도 상주시 공검면 가상리 13", prio: "5" }, { id: "", addr: "경상북도 상주시 함창읍 가상리 9", prio: "1" }];
t("주소 정규화: 경상북도·상주시·공백·층·호 지움", function () { assert.strictEqual(P.normAddr("경상북도 상주시 공검면 가상리 13, 2층 201호"), "공검면가상리13"); });
t("대조: 일치 → 명단에 있음 · 같은 리 번지 다름 → 확인 필요 · 없음 → 신규 발굴 의뢰 · 주소 없음 → 못 맞춤", function () {
  var m = [{ id: "a", addr: "공검면 가상리 13", status: "registered" }, { id: "b", addr: "함창읍 가상리 77", status: "registered" }, { id: "c", addr: "이안면 가상리 5", status: "registered" }, { id: "d", addr: "", status: "registered" }];
  var r = P.matchAll(m, LIST, "2026-11", "2026-11-03T09:00:00");
  assert.deepStrictEqual(r.memos.map(function (x) { return x.status; }), ["in_list", "near", "not_in_list", "registered"]);
  assert.strictEqual(r.memos[0].match.listRank, "5");
  assert.strictEqual(r.summary.text, "명단 밖 메모 3곳 맞춰 봄 · 명단에 있음 1 · 없음 1(신규 발굴 의뢰) · 확인 필요 1 · 주소 없어 못 맞춘 메모 1");
  assert.ok(P.memoTags(r.memos[2]).some(function (x) { return x.t === "신규 발굴 의뢰"; }));
});
t("두 차수 연속 명단 밖 → «2차례 명단 밖» · 의뢰함 상태는 유지", function () {
  var m = [{ id: "a", addr: "이안면 가상리 5", status: "not_in_list", match: { round: "2026-10", status: "not_in_list" } }, { id: "b", addr: "이안면 가상리 6", status: "referred", match: { round: "2026-10", status: "not_in_list" } }];
  var r = P.matchAll(m, LIST, "2026-12");
  assert.ok(r.memos[0].match.twice); assert.ok(P.memoTags(r.memos[0]).some(function (x) { return x.t === "2차례 명단 밖"; })); assert.strictEqual(r.memos[1].status, "referred");
});
t("보고 한 줄: 최근 30일 명단 밖 가구 N곳 · 행복이음 의뢰 M곳", function () {
  var now = new Date("2026-11-03T09:00:00"), d = function (n) { return new Date(now.getTime() - n * 86400000).toISOString(); };
  var r = P.reportLine([{ at: d(3), status: "referred" }, { at: d(12), status: "not_in_list" }, { at: d(45), status: "referred" }], now);
  assert.strictEqual(r.text, "최근 30일 현장에서 찾은 명단 밖 가구 2곳 · 행복이음 의뢰 1곳");
});

console.log("④ 시연 시드(빈 저장소 → 항상 차 있음)");
var mem = {};
var D2 = D;
global.localStorage = { getItem: function (k) { return k in mem ? mem[k] : null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; }, get length() { return Object.keys(mem).length; }, key: function (i) { return Object.keys(mem)[i]; } };
global.location = { search: "", pathname: "/", hash: "" };
global.window = global;
global.DAEUM_CONFIG = { requestsKey: "daeum.requests" };
var F = require(path.join(base, "officer/features.js"));
global.DaeumRequests = { key: "daeum.requests", list: function () { return JSON.parse(mem["daeum.requests"] || "[]"); } };
function seed() { delete require.cache[require.resolve(path.join(base, "officer/demo_seed.js"))]; require(path.join(base, "officer/demo_seed.js")); }
function J(k) { return JSON.parse(mem[k] || "null"); }
t("빈 저장소 → 명단 열 9가구(발굴순위 1~9·발굴년월)·명단 밖 메모 4·확정 기록 2·방문 계획 9·방문 결과 5+지난 6주 18(S12-e 42) · 시연 신고 0(S11-k)", function () {
  seed();
  var m = J("daeum.s11.importMeta"); assert.strictEqual(m.__seed, "S9j"); assert.deepStrictEqual(IDS.map(function (id) { return m[id].prio; }), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]); assert.strictEqual(m["A-056"].ym, "2026-10");
  var o = J("daeum.officer.outside"); assert.strictEqual(o.length, 4); assert.deepStrictEqual(o.map(function (x) { return x.status; }), ["not_in_list", "in_list", "registered", "referred"]);
  o.forEach(function (x) { assert.ok(!x.name && !x.phone, "이름·전화 없음"); });
  assert.strictEqual(J("daeum.officer.records").length, 2); assert.strictEqual(DaeumRequests.list().length, 0, "시연 신고 0건");
  var p = J("daeum.visit.plan"); assert.strictEqual(p.seed, "S9j"); assert.strictEqual(p.rows.length, 9); assert.deepStrictEqual(p.rows.filter(function (r) { return r.day === 1; }).map(function (r) { return r.household_no; }), ["P-033", "P-026", "Q-033", "A-009", "P-013"]);
  var L = J("daeum.visit.log"); assert.strictEqual(L.length, 23); assert.strictEqual(L.filter(function (x) { return /^VL-H/.test(x.id); }).length, 18); L.forEach(function (x) { assert.ok(!/d{6}-?d{7}|01d-?d{3,4}-?d{4}|가상리/.test(x.memo), "메모 개인정보 없음"); });
  assert.strictEqual(m["Q-033"].aiRes, "안 닿음");
});
t("날이 바뀌어 다시 깔아도 시연 기록이 겹치지 않음 · 담당자가 남긴 메모는 남음", function () {
  var o = J("daeum.officer.outside"); o.push({ id: "OUT-mine", status: "registered", at: new Date().toISOString() }); mem["daeum.officer.outside"] = JSON.stringify(o);
  mem["daeum.demo.seededFor"] = JSON.stringify({ day: "2000-01-01", v: 5 }); seed();
  var o2 = J("daeum.officer.outside"); assert.strictEqual(o2.length, 5); assert.ok(o2.some(function (x) { return x.id === "OUT-mine"; }));
  assert.strictEqual(J("daeum.officer.records").length, 2);
});
t("실제로 불러온 명단 열(seed 표시 없음)은 시드가 덮지 않음", function () {
  mem["daeum.s11.importMeta"] = JSON.stringify({ "A-001": { prio: "1" } }); mem["daeum.demo.seededFor"] = JSON.stringify({ day: "2000-01-01", v: 5 }); seed();
  assert.deepStrictEqual(Object.keys(J("daeum.s11.importMeta")), ["A-001"]);
});

console.log("⑤ 보고 기간 · 명단 열 · 문구");
t("주간 보고 기간 = 오늘 포함 7일 — 월요일(11-02)에도 10-27~11-02(하루짜리 아님)", function () {
  require(path.join(base, "shared/report.js"));
  assert.deepStrictEqual(F.report.periodOf("weekly", new Date("2026-11-02T10:00:00")), { from: "2026-10-27", to: "2026-11-02" });
  assert.deepStrictEqual(F.report.periodOf("monthly", new Date("2026-11-02T10:00:00")), { from: "2026-11-01", to: "2026-11-02" });
});
t("명단 서식 «발굴년월» 열을 읽는다(성명·주민번호는 계속 안 읽음)", function () {
  var I = require(path.join(base, "officer/import_list.js"));
  var rows = [["중앙발굴대상자 조회결과 현황"], ["관리번호", "성명", "주민등록번호", "발굴우선순위", "발굴년월", "발굴횟수", "처리여부", "AI초기상담 결과", "연락처"], ["P-013", "홍길동", "000000-0000000", "5", "2026-10", "1", "미처리", "안 닿음", "010-0000-0000"]];
  var r = I.importRows(rows, D.households);
  assert.ok(r.ok); assert.strictEqual(r.meta["P-013"].ym, "2026-10"); assert.strictEqual(r.meta["P-013"].aiRes, "안 닿음");
  assert.ok(!/홍길동|000000|010-/.test(JSON.stringify(r.meta)), "성명·주민번호·연락처 안 읽음"); assert.deepStrictEqual(r.skipped, ["성명", "주민등록번호", "연락처"]);
});
t("금지 문구 없음(«발굴 도우미»·«줄인 시간»·«위기 점수») · S11-i 주민 화면 제거(진입 0)", function () {
  ["officer/priority.js", "officer/flow.js", "officer/index.html"].forEach(function (f) {
    var s = fs.readFileSync(path.join(base, f), "utf8"); assert.ok(!/발굴 도우미|줄인 시간|위기 점수/.test(s), f);
  });
  assert.ok(!fs.existsSync(path.join(base, "citizen")), "citizen/ 폴더 없음");
  ["index.html", "officer/index.html", "shared/data.html", "shared/guide.js", "manifest.webmanifest"].forEach(function (f) {
    assert.ok(!/citizen\//.test(fs.readFileSync(path.join(base, f), "utf8")), f + " — 주민 화면 링크 없음");
  });
});

console.log("\nS11-d2 시험: 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
