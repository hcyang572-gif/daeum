/* 닿음 S10h ⑥⑦ 자체 시험 — 실행: node officer/s10h.test.js (03_시제품 폴더에서). 의존성 없음. */
"use strict";
var assert = require("assert");
var path = require("path");
var N = require(path.join(__dirname, "notify.js"));

var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

// 하루 동선 1장 흉내 — 이름·주소·사유·주의가 들어 있어도 달력 파일에는 나오면 안 된다
var SHEET = { date: "2026-10-30", stops: [
  { no: 1, id: "B-048", label: "가구 B-048 김가상", area: "사벌국면", time: "09:42~10:12", why: ["단전·단수 신호"], cautions: ["반려견"], address: "사벌국면 가상리 12-3" },
  { no: 2, id: "A-007", label: "가구 A-007 이가상", area: "함창읍", time: "10:30~11:00", why: ["건보료 체납"], cautions: [], address: "함창읍 가상로 5" },
  { no: 3, id: "A-019", label: "가구 A-019, 박가상; 홀몸", area: "함창읍", time: "13:05~13:35", why: [], cautions: [] }
] };
var PLAN = [
  { date: "2026-10-30", label: "오늘", items: [{ id: "B-048", label: "가구 B-048 김가상", area: "사벌국면", slot: "오전", channel: "visit" }] },
  { date: "2026-11-02", label: "11-02 (월)", items: [
    { id: "C-001", label: "가구 C-001 최가상", area: "공검면", slot: "저녁", channel: "visit" },
    { id: "C-002", label: "가구 C-002", area: "공검면", slot: "오후", channel: "phone" },
    { id: "C-003", label: "가구 C-003", area: "이안면", slot: "오후", channel: "visit", kind: "followup" }] }
];
var NOW = new Date("2026-10-30T00:15:00Z");
var ev = N.fromSheet(SHEET).concat(N.fromPlan(PLAN, SHEET.date));
var out = N.ics(ev, { now: NOW });
var lines = out.split("\r\n");

console.log("⑦ 방문 일정 .ics");
t("가구 이름·상세주소·사유·주의·가구 번호 미포함", function () {
  ["김가상", "이가상", "박가상", "최가상", "가상리", "가상로", "12-3", "B-048", "A-007", "C-001", "단전", "건보료", "반려견", "홀몸"].forEach(function (w) {
    assert(out.indexOf(w) < 0, "들어감: " + w);
  });
});
t("읍면동·순번·예정 시각은 들어감", function () {
  assert(/SUMMARY:방문 1 · 사벌국면/.test(out));
  assert(out.indexOf("DTSTART;TZID=Asia/Seoul:20261030T094200") >= 0);
  assert(out.indexOf("DTEND;TZID=Asia/Seoul:20261030T101200") >= 0);
  assert(out.indexOf("DTSTART;TZID=Asia/Seoul:20261102T183000") >= 0, "저녁 시간대 18:30");
});
t("CRLF 줄끝 · 맨 끝 CRLF · 맨 LF 없음", function () {
  assert(out.slice(-2) === "\r\n");
  assert(!/[^\r]\n/.test(out), "CR 없는 LF");
});
t("한 줄 75옥텟 이하(한글 접기)", function () {
  lines.forEach(function (l) { assert(Buffer.byteLength(l, "utf8") <= 75, l.length + "자 줄: " + l.slice(0, 20)); });
  var unfolded = out.replace(/\r\n /g, "");
  assert(unfolded.indexOf("가구 이름·주소는 넣지 않았습니다") >= 0, "접었다 펴면 원문 복원");
});
t("BEGIN/END 짝 · VCALENDAR 필수 속성 · VTIMEZONE", function () {
  var b = lines.filter(function (l) { return /^BEGIN:/.test(l); }).length, e = lines.filter(function (l) { return /^END:/.test(l); }).length;
  assert.strictEqual(b, e);
  assert.strictEqual(lines[0], "BEGIN:VCALENDAR");
  ["VERSION:2.0", "PRODID:", "TZID:Asia/Seoul", "TZOFFSETTO:+0900"].forEach(function (k) { assert(out.indexOf(k) >= 0, k); });
});
t("일정 수 = 오늘 3 + 다른 날 방문 2(전화 제외·오늘 재시도 중복 제외)", function () {
  assert.strictEqual(lines.filter(function (l) { return l === "BEGIN:VEVENT"; }).length, 5);
});
t("UID 모두 다름 · DTSTAMP UTC 형식", function () {
  var u = lines.filter(function (l) { return /^UID:/.test(l); });
  assert.strictEqual(new Set(u).size, u.length);
  assert(lines.filter(function (l) { return /^DTSTAMP:/.test(l); }).every(function (l) { return l === "DTSTAMP:20261030T001500Z"; }));
});
t("TEXT 이스케이프(쉼표·쌍반점·역슬래시·줄바꿈)", function () {
  assert.strictEqual(N.esc("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});
t("빈 동선이어도 올바른 달력", function () {
  var x = N.ics([], { now: NOW }); assert(x.indexOf("BEGIN:VCALENDAR") === 0 && x.indexOf("VEVENT") < 0);
});

console.log("⑥ 알림톡 문구");
t("세 종류 모두 센터·팀 이름으로 시작, 이름·주소 없음", function () {
  ["visit", "absent", "link"].forEach(function (k) {
    var m = N.alimtalk(k, { area: "함창읍", date: "2026-11-02", time: "10:30", nextDate: "2026-11-04", nextSlot: "오후" });
    assert(m.body.indexOf("안녕하세요, 함창읍 행정복지센터 맞춤형복지팀입니다.") === 0, k);
    assert.deepStrictEqual(N.lint(m.body, ["가구", "김가상", "가상로"]), [], k);
  });
});
t("방문 예정: 날짜·시각 말로", function () {
  var m = N.alimtalk("visit", { area: "함창읍", date: "2026-11-02", time: "10:30" });
  assert(m.body.indexOf("11월 2일(월) 오전 10시 30분쯤") >= 0, m.body);
});
t("부재: 다음 방문 시간대", function () {
  var m = N.alimtalk("absent", { area: "공검면", date: "2026-10-30", time: "14:00", nextDate: "2026-11-03", nextSlot: "저녁" });
  assert(m.body.indexOf("11월 3일(화) 저녁 무렵에 다시 찾아뵙겠습니다") >= 0, m.body);
});
t("연계: 서비스명 없이", function () {
  var m = N.alimtalk("link", { area: "이안면" });
  assert(m.body.indexOf("지원의 신청을 도와드리려고") >= 0 && !/돌봄|급여|바우처/.test(m.body));
});
t("광고성 낱말 점검기 작동", function () {
  assert.strictEqual(N.lint("무료로 드립니다").length, 1);
});

console.log("\n합계 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
