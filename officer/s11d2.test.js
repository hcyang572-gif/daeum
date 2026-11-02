/* S11-d2 시험(⚙️ 파로, 2026-11-02). 실행: node officer/s11d2.test.js (03_시제품 에서). 브라우저·네트워크 0.
   ① 우선순위 보정 = 규격서(01_리서치/S11-d2_우선순위_규칙.md) 1-5 표 재현(오늘 2026-11-03, 한파주의보) · 이유 한 줄 · 점수 숫자 비표시
   ② 실시간 신고 끼워 넣기 = 3-4 표(Q-002 일반 → 10번째 66.1km·17:10 / 긴급 → 3곳 마친 뒤 바로 다음) · 미룰 집 제안
   ③ 명단 밖 가구 A안 대조(in_list·near·not_in_list·2차례) · 보고 한 줄
   ④ 시연 시드: 명단 열·명단 밖 메모 4·확정 기록 2 상시, 실제로 불러온 명단은 덮지 않음
   ⑤ 주간 보고 기간: 월요일에도 7일 · 명단 서식 «발굴년월» 열 읽기 · 금지 문구 */
"use strict";
var assert = require("assert"), path = require("path"), fs = require("fs");
var base = path.join(__dirname, "..");
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

var P = require(path.join(base, "officer/priority.js")), RP = require(path.join(base, "officer/route_plan.js"));
var D = require(path.join(base, "data/households.json")), AL = require(path.join(base, "data/alerts_demo.json"));
function hh(id) { return D.households.filter(function (h) { return h.id === id; })[0]; }
var IDS = ["A-009", "Q-033", "P-026", "P-033", "P-013", "B-015", "A-056", "B-059", "A-086"];
var CNT = [1, 1, 1, 1, 1, 3, 2, 2, 1], PROC = ["미처리", "미처리", "처리중", "미처리", "미처리", "처리중", "미처리", "미처리", "미처리"], LON = [1, 1, 0, 1, 1, 1, 1, 1, 1];
var META = {}; IDS.forEach(function (id, i) { META[id] = { prio: String(i + 1), cnt: CNT[i], proc: PROC[i], ym: "2026-10", lonely: !!LON[i] }; });
var NR = {}; AL.noResponse.items.forEach(function (x) { NR[x.householdId] = x; });
var URG = { householdId: "P-033", urgent: true, status: "new", proxy: { isProxy: true, relation: "아들" }, situation: "혼자 사시는 어머니 댁 보일러가 고장 났는데 가스비도 밀려서 당장 추우세요" };
var CTX = { today: "2026-11-03T09:00:00", meta: META, weather: { name: "한파주의보" }, noResponse: NR, requests: [URG] };
var R = P.compute(IDS.map(hh), CTX), BY = {}; R.forEach(function (r) { BY[r.id] = r; });

console.log("① 방문 우선순위 보정(규격서 1-5 표)");
t("오늘 순서 = P-033 · P-026 · A-009 · Q-033 · P-013 · A-056 · B-015 · B-059 · A-086", function () {
  assert.deepStrictEqual(R.map(function (r) { return r.id; }), ["P-033", "P-026", "A-009", "Q-033", "P-013", "A-056", "B-015", "B-059", "A-086"]);
});
t("가산 G·보정키 K가 표와 같다(A-009 6/−5 · P-033 4/0 · A-056 5/2 · A-086 5/4 …)", function () {
  var want = { "A-009": [6, -5], "Q-033": [6, -4], "P-026": [2, 1], "P-033": [4, 0], "P-013": [3, 2], "B-015": [3, 3], "A-056": [5, 2], "B-059": [4, 4], "A-086": [5, 4] };
  Object.keys(want).forEach(function (id) { assert.deepStrictEqual([BY[id].G, BY[id].K], want[id], id); });
});
t("«오늘 꼭» 칸 = 긴급 신고(P-033)·무반응 48시간 이상(P-026)만, 무반응 30·26시간은 가산", function () {
  assert.deepStrictEqual(R.filter(function (r) { return r.band === "must"; }).map(function (r) { return r.id; }), ["P-033", "P-026"]);
  assert.ok(BY["A-009"].parts.some(function (p) { return p.k === "D" && p.pts === 3; }));
});
t("이유 한 줄: «정보원 N순위 → 오늘 M번째 · 이유» / «오늘 꼭 · …», 숫자 점수(G·K) 없음", function () {
  assert.ok(/^오늘 꼭 · 아들이 «.+» 긴급 신고$/.test(BY["P-033"].line), BY["P-033"].line);
  assert.strictEqual(BY["A-009"].line, "정보원 1순위 → 오늘 3번째 · 안부 응답 30시간 없음 · 한파에 86세 혼자");
  assert.strictEqual(BY["A-056"].line, "정보원 7순위 → 오늘 6번째 · 한파에 90세 혼자 · 2차례 발굴, 93일 미처리");
  assert.ok(/2년 넘게 상담 없음/.test(BY["A-086"].line));
  R.forEach(function (r) { assert.ok(!/점|가산|[+]\d/.test(r.line), "줄에 점수: " + r.line); });
});
t("«자세히» 가산 내역에만 +숫자와 출처(시연 가상·잠정값)", function () {
  var d = BY["A-009"].detail.join(" / ");
  assert.ok(/\+2 한파주의보/.test(d) && /\+3 AI 스피커 안부 응답 30시간/.test(d) && /잠정값/.test(d), d);
});
t("민감도: 특보가 없어도 보정 순위 칸 순서 불변(9곳 중 8곳이 같은 +2) — 오늘 꼭 칸 안 두 집만 자리 바뀜(규격서 1-7 «같음»과 다른 점)", function () {
  var r2 = P.compute(IDS.map(hh), Object.assign({}, CTX, { weather: null })), ids = function (a) { return a.map(function (r) { return r.id; }); };
  assert.deepStrictEqual(ids(r2).slice(2), ids(R).slice(2)); assert.deepStrictEqual(ids(r2).slice(0, 2).sort(), ["P-026", "P-033"]);
});
t("담당자 «앞에 두기»는 오늘 꼭 맨 위 · 미처리 경과일 = (횟수−1)×60 + 발굴년월 1일부터", function () {
  var r3 = P.compute(IDS.map(hh), Object.assign({}, CTX, { pins: ["B-059"] }));
  assert.strictEqual(r3.filter(function (r) { return r.band === "must"; }).length, 3); assert.ok(/담당자가 앞에 둠/.test(r3.filter(function (r) { return r.id === "B-059"; })[0].line));
  assert.strictEqual(P.pendingDays(META["A-056"], "2026-11-03T09:00:00"), 93); assert.strictEqual(P.pendingDays(META["P-026"], "2026-11-03T09:00:00"), null);
});

console.log("② 실시간 신고 끼워 넣기(규격서 3-4 표)");
var OFF = D.meta.office, ROUTE = ["B-015", "B-059", "P-033", "P-026", "P-013", "A-086", "A-056", "A-009", "Q-033"].map(function (id) { var h = hh(id); return { id: id, x: h.x, y: h.y }; });
var Q = { id: "Q-002", x: hh("Q-002").x, y: hh("Q-002").y };
function end(order) { return RP.schedule(order, RP.approxLegs(order, OFF, true), { start: "09:30", ret: true }); }
t("아침 계획 65.8km · 마침 16:39", function () { assert.strictEqual(RP.tourKm(ROUTE, OFF, true).toFixed(1), "65.8"); assert.strictEqual(end(ROUTE).end, "16:39"); });
t("일반 신고 Q-002 → 최소 추가 거리 자리 = Q-033 다음 10번째, 66.1km(+0.3) · 마침 17:10, 다른 집 순서 그대로", function () {
  var a = P.insertCheapest(ROUTE, Q, OFF, true, RP.kmBetween, 0);
  assert.strictEqual(a.at, 9); assert.strictEqual(RP.tourKm(a.order, OFF, true).toFixed(1), "66.1"); assert.strictEqual(end(a.order).end, "17:10");
  assert.deepStrictEqual(a.order.filter(function (p) { return p.id !== "Q-002"; }).map(function (p) { return p.id; }), ROUTE.map(function (p) { return p.id; }));
});
t("이미 다녀온 집(앞 3곳)은 고정 — 그 앞 틈에는 넣지 않음", function () {
  var a = P.insertCheapest(ROUTE, { id: "X", x: ROUTE[0].x, y: ROUTE[0].y }, OFF, true, RP.kmBetween, 3); assert.ok(a.at >= 3);
});
t("긴급 신고(3곳 마친 뒤) → 바로 다음 방문, 남은 집만 다시 짬(규격서의 순서 유지안 90.1km·18:21보다 짧음)", function () {
  var u = P.urgentNext(ROUTE, Q, OFF, true, RP.kmBetween, 3), ids = u.order.map(function (p) { return p.id; });
  assert.deepStrictEqual(ids.slice(0, 4), ["B-015", "B-059", "P-033", "Q-002"]); assert.strictEqual(ids.length, 10);
  var keep = ROUTE.slice(0, 3).concat([Q], ROUTE.slice(3));
  assert.strictEqual(RP.tourKm(keep, OFF, true).toFixed(1), "90.1"); assert.strictEqual(end(keep).end, "18:21");
  assert.ok(RP.tourKm(u.order, OFF, true) <= RP.tourKm(keep, OFF, true));
});
t("근무 넘김 → 미룰 집 제안 = «오늘 꼭» 빼고 보정 순위 맨 끝(A-086)", function () {
  assert.strictEqual(P.deferCandidate(R, IDS.concat(["Q-002"]), ["Q-002"]), "A-086");
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
global.localStorage = { getItem: function (k) { return k in mem ? mem[k] : null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; }, get length() { return Object.keys(mem).length; }, key: function (i) { return Object.keys(mem)[i]; } };
global.location = { search: "", pathname: "/", hash: "" };
global.window = global;
global.DAEUM_CONFIG = { requestsKey: "daeum.requests" };
var F = require(path.join(base, "officer/features.js"));
global.DaeumRequests = { key: "daeum.requests", list: function () { return JSON.parse(mem["daeum.requests"] || "[]"); } };
function seed() { delete require.cache[require.resolve(path.join(base, "officer/demo_seed.js"))]; require(path.join(base, "officer/demo_seed.js")); }
function J(k) { return JSON.parse(mem[k] || "null"); }
t("빈 저장소 → 명단 열 9가구(발굴순위 1~9·발굴년월)·명단 밖 메모 4·확정 기록 2·주민 신호 3", function () {
  seed();
  var m = J("daeum.s11.importMeta"); assert.strictEqual(m.__seed, "S9j"); assert.deepStrictEqual(IDS.map(function (id) { return m[id].prio; }), ["1", "2", "3", "4", "5", "6", "7", "8", "9"]); assert.strictEqual(m["A-056"].ym, "2026-10");
  var o = J("daeum.officer.outside"); assert.strictEqual(o.length, 4); assert.deepStrictEqual(o.map(function (x) { return x.status; }), ["not_in_list", "in_list", "registered", "referred"]);
  o.forEach(function (x) { assert.ok(!x.name && !x.phone, "이름·전화 없음"); });
  assert.strictEqual(J("daeum.officer.records").length, 2); assert.strictEqual(DaeumRequests.list().length, 3);
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
  var src = fs.readFileSync(path.join(base, "officer/s11c.js"), "utf8");
  assert.ok(/\["ym", "발굴년월", \/\^발굴\\s\*년월\$\/\]/.test(src)); assert.ok(/ym: cell\(r, "ym"\)/.test(src));
});
t("금지 문구 없음(«발굴 도우미»·«줄인 시간»·«위기 점수»), 주민 화면 두 문·도착은 저장 성공 때만", function () {
  ["officer/priority.js", "officer/s11d2.js", "citizen/index.html", "citizen/app.js"].forEach(function (f) {
    var s = fs.readFileSync(path.join(base, f), "utf8"); assert.ok(!/발굴 도우미|줄인 시간|위기 점수/.test(s), f);
  });
  var html = fs.readFileSync(path.join(base, "citizen/index.html"), "utf8"), app = fs.readFileSync(path.join(base, "citizen/app.js"), "utf8");
  assert.ok(/data-door="2"[\s\S]*이웃이 걱정돼요/.test(html) && /data-door="0"[\s\S]*제 일이에요/.test(html) && /shared\/s11_page\.css/.test(html));
  assert.ok(/ok \? "담당 공무원에게 도착했어요" : "이 기기에만 저장됨/.test(app));
});

console.log("\nS11-d2 시험: 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
