/* 닿음 S10j 보고서 문서 시험 — 실행: node shared/report_doc.test.js (03_시제품 폴더에서)
   정부 보고서 틀(제목·날짜 온점·□○-· 단계·장 순서·끝.)·그림 5종·출처 꼬리표·가상 표기·공유 링크 왕복·개인 식별값 없음. */
"use strict";
var assert = require("assert");
var path = require("path");
require(path.join(__dirname, "..", "officer", "features.js"));
require(path.join(__dirname, "report.js"));
require(path.join(__dirname, "report_doc.js"));
var F = globalThis.DaeumFeatures, D = F.reportDoc;
var HH = require(path.join(__dirname, "..", "data/households.json"));
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

var now = new Date("2026-10-30T15:00:00");
var hh = HH.households.filter(function (h) { return ["함창읍", "공검면", "이안면", "사벌국면"].indexOf(h.area) >= 0; }).slice(0, 60);
var attempts = [];
hh.slice(0, 24).forEach(function (h, i) {
  var day = 20 + (i % 10);
  attempts.push({ householdId: h.id, result: i % 4 === 0 ? "met" : i % 7 === 0 ? "not_eligible" : "no_answer", reason: i % 7 === 0 ? "income_over" : "", at: "2026-10-" + day + "T10:00:00" });
});
var requests = [{ id: "REQ-1", region: "함창읍", status: "new", urgent: true, createdAt: "2026-10-29T09:00:00" }, { id: "REQ-2", region: "공검면", status: "done", createdAt: "2026-10-21T09:00:00", history: [{ status: "done", at: "2026-10-24T09:00:00" }] }];
var links = [{ householdId: hh[0].id, area: hh[0].area, at: "2026-10-22T10:00:00", serviceIds: ["S01"], serviceNames: ["긴급복지 생계지원"] }];
var input = { households: hh, areas: HH.areas, requests: requests, attempts: attempts, links: links, tips: [], now: now };
var S = F.report.aggregate(input);
var cd = F.report.countdown(F.report.currentRound(now), { now: now, done: S.households.closed, total: S.households.total });
var M = D.build("weekly", S, input, cd, {});
var H = D.html(M), T = D.text(M);

console.log("S11-d4 C안 공문 정제형");
t("aggregate 가 마지막 입력·결과를 기억(F.report.last) — 화면과 같은 숫자", function () { assert.strictEqual(F.report.last.stats, S); assert.strictEqual(F.report.last.input, input); });
t("날짜는 온점 «2026. 10. 30.»([법] 규정 제7조)", function () { assert.strictEqual(D.dot("2026-10-30"), "2026. 10. 30."); assert.ok(H.indexOf("2026. 10. 30.") >= 0); });
t("쪽 구성: 결론 → 핵심 수치 → 위험 요인 → 결정 요청 → (쪽) → 처리 상태·읍면별·주민 신고·다음 주 계획·붙임", function () {
  var ch = M.body.filter(function (n) { return n.t === "ch"; }).map(function (n) { return n.text; });
  assert.deepStrictEqual(ch, ["결론", "핵심 수치", "위험 요인", "결정 요청", "처리 상태", "읍면별 현황", "주민 신고·서비스 연계", "다음 주 계획", "붙임 — 자료 출처"]);
  assert.ok(M.body.some(function (n) { return n.t === "break"; }));
});
t("개조식 기호 □(소제목) ○ - 는 단계를 건너뛰지 않음", function () {
  var prev = 1; M.body.forEach(function (n) { if (n.t === "ch") prev = 1; if (n.t !== "li") return; assert.ok(n.lv >= 2 && n.lv <= 3 && n.lv <= prev + 1, "건너뜀: " + n.text); prev = n.lv; });
  assert.deepStrictEqual(D.SYM, ["□", "○", "-", "·"]);
});
t("한글 문안: 단계마다 2칸 들여쓰기·데이터 출처", function () { assert.ok(/\n□ 결론/.test(T)); assert.ok(/\n  ○ /.test(T)); assert.ok(T.indexOf("데이터 출처") >= 0); });
t("결론 지표 = 처리 완료 하나: 결론·핵심 수치·그림 제목·읍면 합계가 같은 숫자", function () {
  var pl = M.plan, fg = M.body.filter(function (n) { return n.kind === "pace"; })[0], tb = M.body.filter(function (n) { return n.t === "tbl"; })[0];
  assert.strictEqual(+M.kpis[0].v, S.households.closed); assert.strictEqual(fg.data.done[fg.data.done.length - 1], S.households.closed); assert.strictEqual(tb.foot[2], S.households.closed);
  assert.strictEqual(tb.foot[3], pl.goal); assert.strictEqual(tb.foot[4], S.households.closed - pl.goal); assert.strictEqual(pl.diff, S.households.closed - pl.goal);
  assert.ok(M.verdicts[0].indexOf("(" + pl.goal + "가구)") >= 0);
});
t("% 표기 없음(결론·카드·그림·표) · «오늘» 없음 · 기관 «상주시청»", function () {
  var js = JSON.stringify({ v: M.verdicts, k: M.kpis, b: M.body }); assert.ok(js.indexOf("%") < 0, "%"); assert.ok(T.indexOf("오늘") < 0); assert.strictEqual(M.office, "상주시청");
});
t("읍면 목표선 합 = 전체 목표선, 합계 줄 = 각 줄 합", function () {
  var tb = M.body.filter(function (n) { return n.t === "tbl"; })[0];
  [1, 2, 3, 4, 5, 6].forEach(function (c) { assert.strictEqual(tb.foot[c], tb.rows.reduce(function (s2, r) { return s2 + r[c]; }, 0), "열 " + c); });
  assert.strictEqual(tb.foot[1], S.households.total);
});
t("추세: 누적 처리·접촉이 차수 시작~보고일 날마다, 마지막 값 = 처리 가구 수", function () {
  var d = M.body.filter(function (n) { return n.kind === "pace"; })[0].data;
  assert.strictEqual(d.start, "2026-10-19"); assert.strictEqual(d.done.length, 12); assert.strictEqual(d.contact.length, 12); assert.strictEqual(d.done[11], S.households.closed);
});
t("그림에 숫자 대체 글(role=img aria-label), 표·카드·결정 요청 모두 HTML 에 있음", function () {
  assert.ok(/role="img" aria-label="누적 처리 완료 \d+가구/.test(H)); assert.ok(/class="rpc-kpis"/.test(H) && /class="rpc-tbl"/.test(H));
});
t("그림·표마다 «※ 출처» 줄과 «가상»/«공공데이터»·«공개 자료» 구분(출처 목록)", function () {
  M.body.filter(function (n) { return n.t === "fig" || n.t === "tbl"; }).forEach(function (n) { assert.ok(n.src && n.tags && n.tags.length, n.title); });
  assert.ok(M.sources.some(function (s2) { return /보건복지부/.test(s2.text); })); assert.ok(H.indexOf("※ ") >= 0);
});

console.log("공유");
t("공유 링크 왕복(j.) — 같은 모델", function () { var z = D.encodeSync(M); assert.ok(z.indexOf("j.") === 0); assert.deepStrictEqual(D.decodeSync(z), JSON.parse(JSON.stringify(M))); });
t("공유 모델에 가구 번호·가구 이름·좌표 원본 없음(개인 식별값 0)", function () {
  var js = JSON.stringify(M);
  assert.ok(!/[A-Z]-\d{3}/.test(js), "가구 번호"); assert.ok(js.indexOf("가구 " + hh[0].id) < 0); assert.ok(js.indexOf("REQ-") < 0);
});
t("HTML 이스케이프 — 읍면 이름에 꺾쇠가 와도 태그가 되지 않음", function () {
  var M2 = JSON.parse(JSON.stringify(M)); M2.title = "<script>x</script>"; assert.ok(D.html(M2).indexOf("<script>x") < 0);
});
t("월간 보고서도 같은 틀", function () { var m = D.build("monthly", S, input, cd, {}); assert.ok(/월간 현황/.test(m.title)); assert.ok(/이번 달 처리/.test(D.text(m))); });

console.log("결과: 통과 " + pass + " · 실패 " + fail);
if (fail) process.exit(1);
