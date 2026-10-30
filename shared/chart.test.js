/* 닿음 S10k 그림 부품 시험 — 실행: node shared/chart.test.js (03_시제품 폴더에서)
   ① 보고서 그림이 chart.js 로 옮겨진 뒤에도 같은 글자를 내는지 ② 새 부품(고리·두 겹 막대·깔때기·흐름도)이 숫자 대체 글·색 규칙을 지키는지
   ③ 공무원 화면 4곳이 부품을 쓰고 출처 꼬리표를 다는지. */
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var C = require(path.join(__dirname, "chart.js"));
require(path.join(__dirname, "..", "officer", "features.js"));
require(path.join(__dirname, "report.js"));
require(path.join(__dirname, "report_doc.js"));
var F = globalThis.DaeumFeatures, D = F.reportDoc;
var HH = require(path.join(__dirname, "..", "data/households.json"));
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }
function rd(p) { return fs.readFileSync(path.join(__dirname, "..", p), "utf8"); }
function aria(s) { var m = /aria-label="([^"]*)"/.exec(s); return m ? m[1] : ""; }

var now = new Date("2026-10-30T15:00:00");
var hh = HH.households.slice(0, 80), attempts = [];
hh.slice(0, 30).forEach(function (h, i) { attempts.push({ householdId: h.id, result: i % 4 === 0 ? "met" : i % 7 === 0 ? "not_eligible" : "no_answer", reason: i % 7 === 0 ? "income_over" : "", at: "2026-10-" + (20 + i % 10) + "T10:00:00" }); });
var input = { households: hh, areas: HH.areas, requests: [], attempts: attempts, links: [], tips: [], now: now };
var S = F.report.aggregate(input);
var cd = F.report.countdown(F.report.currentRound(now), { now: now, done: S.households.closed, total: S.households.total });
var M = D.build("weekly", S, input, cd, {}), H = D.html(M);

console.log("보고서 ↔ 공용 부품");
t("report_doc.js 는 그림을 직접 그리지 않고 chart.js 를 부른다", function () {
  var src = rd("shared/report_doc.js");
  assert.ok(/require\("\.\/chart\.js"\)/.test(src) && /root\.DaeumChart/.test(src));
  assert.ok(src.indexOf("rp-arc") < 0 && src.indexOf("rp-mb") < 0 && src.indexOf("rp-tl") < 0);
});
t("보고서 그림 5개가 chart.js 출력과 글자 하나까지 같다", function () {
  var figs = M.body.filter(function (n) { return n.t === "fig"; });
  assert.ok(figs.length >= 3, "그림 " + figs.length);
  figs.forEach(function (n) {
    var g = n.kind === "donut" ? C.donut(n.data) : n.kind === "bars" ? C.bars(n.data) : n.kind === "map" ? C.map(n.data) : C.trendSvg(n.data);
    assert.ok(H.indexOf(g) >= 0, n.kind + " 그림이 다름");
  });
});
t("보고서 공유 보기·공무원 화면이 chart.js 를 report_doc.js 보다 먼저 싣는다", function () {
  var rv = rd("shared/report_view.html"), of = rd("officer/index.html");
  assert.ok(rv.indexOf('src="chart.js"') > 0 && rv.indexOf('src="chart.js"') < rv.indexOf('src="report_doc.js"'));
  assert.ok(of.indexOf("../shared/chart.js") > 0 && of.indexOf("../shared/chart.js") < of.indexOf("../shared/report.js"));
  assert.ok(of.indexOf("../shared/chart.css") > 0);
});

console.log("새 부품");
t("진행 고리: 12곳까지 집마다 한 조각, 기록한 집만 채움, 지금 차례 표시", function () {
  var s = C.ring({ total: 5, states: [true, false, true, false, false], cur: 1 });
  assert.strictEqual((s.match(/class="ch-seg/g) || []).length, 5);
  assert.strictEqual((s.match(/ch-seg on/g) || []).length, 2);
  assert.strictEqual((s.match(/ cur"/g) || []).length, 1);
  assert.strictEqual(aria(s), "오늘 찾아갈 집 5곳 중 기록 남긴 곳 2곳, 남은 곳 3곳, 지금 2번째");
  assert.ok(/role="img"/.test(s) && />2<tspan class="ch-ru">\/5</.test(s));
});
t("진행 고리: 0곳·13곳 이상도 깨지지 않음", function () {
  assert.strictEqual(aria(C.ring({ total: 0 })), "오늘 찾아갈 집 없음");
  var s = C.ring({ total: 20, done: 5 });
  assert.strictEqual((s.match(/class="ch-seg/g) || []).length, 2); // 바탕 + 채움
  assert.ok(/기록 남긴 곳 5곳, 남은 곳 15곳/.test(aria(s)));
});
t("두 겹 막대: 0~100 으로 자르고, 뒤처지면 late·문장에 «뒤처짐»", function () {
  var s = C.dualBar({ done: 30, elapsed: 140, late: true, tag: "D-3" });
  assert.ok(/ch-dual late/.test(s) && /class="ch-de" style="width:100%"/.test(s) && /class="ch-dd" style="width:30%"/.test(s));
  assert.strictEqual(aria(s), "처리 완료 30%, 기간 경과 100%, 마감 D-3 — 일정보다 뒤처짐");
  assert.ok(/일정 안/.test(aria(C.dualBar({ done: 60, elapsed: 40 }))));
});
t("깔때기: 단계 숫자·앞 단계 대비 비율이 글과 그림에 함께", function () {
  var s = C.funnel([{ label: "발굴 명단", n: 80 }, { label: "접촉", n: 40 }, { label: "만남·상담", n: 10 }, { label: "서비스 연계", n: 0 }]);
  assert.strictEqual(aria(s), "발굴 명단 80가구, 접촉 40가구(앞 단계의 50%), 만남·상담 10가구(앞 단계의 25%), 서비스 연계 0가구(앞 단계의 0%)");
  assert.strictEqual((s.match(/class="ch-fs"/g) || []).length, 4);
  assert.ok(/style="width:100%"/.test(s) && /style="width:50%"/.test(s) && /style="width:0%"/.test(s));
  assert.ok(/↓ 50%/.test(s));
});
t("흐름도: 4마디, 멈춘 곳만 on, 화살표 순서대로 문장", function () {
  var s = C.flow([{ label: "주민 신호", sub: "확인 뒤 멈춤", n: 2 }, { label: "상담", sub: "연계 없음", n: 0 }, { label: "안내", sub: "", n: 5 }, { label: "신청", sub: "결정 확인 안 함", n: 1 }]);
  assert.strictEqual((s.match(/class="ch-fn/g) || []).length, 4);
  assert.strictEqual((s.match(/ch-fn on/g) || []).length, 3);
  assert.strictEqual(aria(s), "멈춘 집: 주민 신호(확인 뒤 멈춤) 2곳 → 상담(연계 없음) 0곳 → 안내 5곳 → 신청(결정 확인 안 함) 1곳");
});
t("글은 모두 이스케이프(라벨에 < > \" 가 있어도 깨지지 않음)", function () {
  var s = C.funnel([{ label: '<u>"x"', n: 1 }]) + C.flow([{ label: "<s>", n: 1 }]);
  assert.ok(s.indexOf("<u>") < 0 && s.indexOf("<s>") < 0 && s.indexOf("&lt;u&gt;&quot;x&quot;") > 0 && s.indexOf("&lt;s&gt;") > 0);
});
t("새 부품·화면 CSS 에 하드코딩 색 없음(인쇄 회색 단계만 예외), 글씨 12px 이상", function () {
  var js = rd("shared/chart.js"); assert.ok(!/#[0-9a-fA-F]{3,6}\b|rgba?\(/.test(js));
  var css = rd("shared/chart.css"), noPrint = css.split("@media print")[0];
  assert.ok(!/#[0-9a-fA-F]{3,6}\b|rgba?\(/.test(noPrint));
  (css.match(/(\d+(?:\.\d+)?)px var\(--(?:f|num)\)|font-size:\s*(\d+)px/g) || []).forEach(function (m) { var v = +(/(\d+(?:\.\d+)?)px/.exec(m)[1]); assert.ok(v >= 12, m); });
  assert.ok(/prefers-reduced-motion: no-preference/.test(css));
});

console.log("공무원 화면 4곳");
var mount = rd("officer/mount.js");
t("① 오늘 ④ 현황 = 두 겹 막대 · ② 대시보드 = 깔때기+도넛 · ③ 연계 누락 = 흐름도 · ④ 오늘 머리 = 진행 고리", function () {
  assert.ok(/DaeumChart\.dualBar\(\{ done: cd\.donePct/.test(mount));
  assert.ok(/CH\.funnel\(\[\{ label: "발굴 명단"/.test(mount) && /CH\.donut\(S\.nonEligibleBy/.test(mount));
  assert.ok(/DaeumChart\.flow\(stages\)/.test(mount));
  assert.ok(/DaeumChart\.ring\(\{ total: order\.length, states: states/.test(mount) && /id="todayRing"/.test(rd("officer/index.html")));
});
t("그림마다 출처 꼬리표(가상 자료 번호 V1·V2) — guide.js 가 «가상» 표식을 붙인다", function () {
  var n = (mount.match(/src-tag[^\n]*data-src-ref[^\n]*V1|data-src-ref": "V1"/g) || []).length;
  assert.ok(n >= 3, "꼬리표 " + n);
  assert.ok(/출처: " \+ cd\.round\.source \+ " · 가구 수는 가상"/.test(mount));
});
t("부품이 없을 때(옛 캐시)는 예전 숫자 칸으로 돌아간다", function () {
  assert.ok(/kpi\("발굴 명단", H\.total/.test(mount) && /class: "num gs-n"/.test(mount));
});

console.log("결과: 통과 " + pass + " · 실패 " + fail);
if (fail) process.exitCode = 1;
