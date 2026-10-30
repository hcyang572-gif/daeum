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

console.log("정부 보고서 틀");
t("aggregate 가 마지막 입력·결과를 기억(F.report.last) — 화면과 같은 숫자", function () { assert.strictEqual(F.report.last.stats, S); assert.strictEqual(F.report.last.input, input); });
t("날짜는 온점 «2026. 10. 30.»([법] 규정 제7조)", function () { assert.strictEqual(D.dot("2026-10-30"), "2026. 10. 30."); assert.ok(H.indexOf("2026. 10. 30.") >= 0); });
t("장 순서 Ⅰ개요 → Ⅱ현황 → Ⅲ문제점·분석 → Ⅳ대책·조치 → Ⅴ향후 계획", function () {
  var ch = M.body.filter(function (n) { return n.t === "ch"; }).map(function (n) { return n.text; });
  assert.deepStrictEqual(ch, ["개요", "현황", "문제점·분석", "대책·조치", "향후 계획"]);
  ["Ⅰ.", "Ⅱ.", "Ⅲ.", "Ⅳ.", "Ⅴ."].forEach(function (r) { assert.ok(H.indexOf(r) >= 0, r); });
});
t("개조식 기호 □ ○ - · 는 4단계 이내, 단계를 건너뛰지 않음", function () {
  var prev = 0;
  M.body.forEach(function (n) { if (n.t === "ch") prev = 0; if (n.t !== "li") return; assert.ok(n.lv >= 1 && n.lv <= 4); assert.ok(n.lv <= prev + 1, "건너뜀: " + n.text); prev = n.lv; });
  assert.deepStrictEqual(D.SYM, ["□", "○", "-", "·"]);
});
t("한글 문안: 단계마다 2칸 들여쓰기·«끝.»·데이터 출처", function () {
  assert.ok(/\n□ 보고 목적/.test(T)); assert.ok(/\n  ○ /.test(T)); assert.ok(/\n    - /.test(T));
  assert.ok(T.indexOf("\n끝.\n") >= 0); assert.ok(T.indexOf("데이터 출처") >= 0);
});
t("1쪽: 제목 상자·작성 부서·한 줄 결론·숫자 카드 5개·«끝.»", function () {
  assert.ok(/class="rp-head"/.test(H)); assert.ok(H.indexOf(M.office) >= 0); assert.ok(/한 줄 결론/.test(H));
  assert.strictEqual(M.kpis.length, 5); assert.ok(/<p class="rp-end">끝\.<\/p>/.test(H));
});
t("«잠정» 표기 없음", function () { assert.ok(H.indexOf("잠정") < 0 && T.indexOf("잠정") < 0); });

console.log("그림·출처");
t("그림 5종(도넛·막대·막대·지도·추세) 번호 순서대로, 표 1개", function () {
  var f = M.body.filter(function (n) { return n.t === "fig"; });
  assert.deepStrictEqual(f.map(function (n) { return n.kind; }), ["donut", "bars", "bars", "map", "trend"]);
  f.forEach(function (n, i) { assert.strictEqual(n.no, i + 1); assert.ok(H.indexOf("[그림 " + n.no + "]") >= 0); });
  assert.ok(H.indexOf("&lt;표 1&gt;") >= 0);
});
t("그림·표마다 «※ 출처»와 «가상»/«공공데이터» 꼬리표", function () {
  M.body.filter(function (n) { return n.t === "fig" || n.t === "tbl"; }).forEach(function (n) { assert.ok(n.src && n.tags && n.tags.length, n.title); });
  assert.ok(/rp-tag v">가상/.test(H)); assert.ok(/rp-tag p">공공데이터/.test(H)); assert.ok(/※ 출처:/.test(H));
  assert.ok(M.sources.some(function (s) { return /보건복지부/.test(s.text); }));
});
t("도넛 조각 합 = 명단 가구 수", function () {
  var d = M.body.filter(function (n) { return n.kind === "donut"; })[0].data;
  assert.strictEqual(d.reduce(function (s, x) { return s + x.n; }, 0), S.households.total);
});
t("표 합계 = 각 줄 합(명단·접촉)", function () {
  var tb = M.body.filter(function (n) { return n.t === "tbl"; })[0];
  assert.strictEqual(tb.foot[1], tb.rows.reduce(function (s, r) { return s + r[1]; }, 0));
  assert.strictEqual(tb.foot[2], tb.rows.reduce(function (s, r) { return s + r[2]; }, 0));
});
t("추세: 차수 시작~오늘 누적, 마지막 값 = 접촉 가구 수", function () {
  var tr = M.body.filter(function (n) { return n.kind === "trend"; })[0].data;
  assert.strictEqual(tr.start, "2026-10-19"); assert.strictEqual(tr.points.length, 12);
  assert.strictEqual(tr.points[tr.points.length - 1], S.households.contacted);
});
t("지도: 상주 24개 읍면동 점, 명단 있는 곳만 이름표", function () {
  var p = M.body.filter(function (n) { return n.kind === "map"; })[0].data;
  assert.strictEqual(p.length, 24); assert.strictEqual((H.match(/class="rp-ml"/g) || []).length >= 4, true);
});
t("그림마다 숫자 대체 글(role=img aria-label)", function () { assert.ok((H.match(/role="img" aria-label="[^"]+\d/g) || []).length >= 5); });

console.log("공유");
t("공유 링크 왕복(j.) — 같은 모델", function () { var z = D.encodeSync(M); assert.ok(z.indexOf("j.") === 0); assert.deepStrictEqual(D.decodeSync(z), JSON.parse(JSON.stringify(M))); });
t("공유 모델에 가구 번호·가구 이름·좌표 원본 없음(개인 식별값 0)", function () {
  var js = JSON.stringify(M);
  assert.ok(!/[A-Z]-\d{3}/.test(js), "가구 번호"); assert.ok(js.indexOf("가구 " + hh[0].id) < 0); assert.ok(js.indexOf("REQ-") < 0);
});
t("HTML 이스케이프 — 읍면 이름에 꺾쇠가 와도 태그가 되지 않음", function () {
  var M2 = JSON.parse(JSON.stringify(M)); M2.title = "<script>x</script>"; assert.ok(D.html(M2).indexOf("<script>x") < 0);
});
t("월간 보고서도 같은 틀", function () { var m = D.build("monthly", S, input, cd, {}); assert.ok(/월간 추진 현황/.test(m.title)); assert.ok(/다음 달 목표/.test(D.text(m))); });

console.log("결과: 통과 " + pass + " · 실패 " + fail);
if (fail) process.exit(1);
