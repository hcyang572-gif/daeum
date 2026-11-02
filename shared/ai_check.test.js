/* AI 추천 검증 화면 시험 — S10l ②(⚙️ 파로, 2026-10-30). 실행: node shared/ai_check.test.js (03_시제품 폴더에서). AI 호출 0회.
   ①ai_check_data.js 가 원자료(01_리서치/AI정확도_측정도구)에서 새로 만든 값과 같은가(손으로 고친 숫자 없음)
   ②측정 문서 §7-3 의 실측값과 같은가(부풀림 없음) ③화면에 «다시 재기»·AI 호출이 없는가 ④출처·«가상» 꼬리표 */
"use strict";
var fs = require("fs"), path = require("path"), assert = require("assert");
var ROOT = path.join(__dirname, "..");
global.window = globalThis;
var B = require("./ai_check_build.js");
eval(fs.readFileSync(path.join(__dirname, "ai_check_data.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "ai_check.js"), "utf8"));
var D = window.DaeumAICheckData, V = window.DaeumAICheck;
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

t("자료 파일 = 원자료에서 새로 만든 값(다시 만들기 빠뜨림 없음)", function () {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(D)), JSON.parse(JSON.stringify(B.build())));
});
t("AI 20건(11-02 재측정): 첫 추천 20/20(100.0%)·상위3 포함 20/20·상위3 적합 54/60(90.0%)·목록 밖 0", function () {
  assert.deepStrictEqual([D.ai.n, D.ai.hit1, D.ai.hit3, D.ai.ok3, D.ai.n3, D.ai.dropped], [20, 20, 20, 54, 60, 0]);
  assert.strictEqual(V.fmtPct(D.ai.hit1, D.ai.n), "100.0%"); assert.strictEqual(V.fmtPct(D.ai.ok3, D.ai.n3), "90.0%");
});
t("규칙만 20건(보정 후): 첫 추천 14/20·상위3 적합 34/60 — 측정 문서 §7 값", function () {
  assert.deepStrictEqual([D.rules.hit1, D.rules.n, D.rules.ok3, D.rules.n3], [14, 20, 34, 60]);
});
t("구분별 AI(11-02): 일반 10/10·위기 5/5·대리 5/5, 상위3 25/30·14/15·15/15", function () {
  var m = {}; D.kinds.forEach(function (k) { m[k.kind] = [k.ai.hit1, k.ai.n, k.ai.ok3, k.ai.n3]; });
  assert.deepStrictEqual(m, { "일반": [10, 10, 25, 30], "위기": [5, 5, 14, 15], "대리": [5, 5, 15, 15] });
});
t("틀린 추천 6개 = 상위3 중 정답표 밖 개수(60-54), C1 3순위 주거지원 포함", function () {
  assert.strictEqual(D.wrong.length, D.ai.n3 - D.ai.ok3);
  assert.ok(D.wrong.some(function (w) { return w.id === "C1" && w.rank === 3 && /주거지원/.test(w.name); }));
  D.wrong.forEach(function (w) { assert.ok(w.why && w.why.length > 3, w.id + " 이유 없음"); });
});
t("평균 토큰 입력 12,928·출력 782(측정 문서 §7-3 11-02)", function () {
  assert.deepStrictEqual([D.meta.tokIn, D.meta.tokOut], [12928, 782]);
});
t("측정 문서에 같은 숫자가 적혀 있음(20/20·54/60·14/20·34/60)", function () {
  var md = fs.readFileSync(path.join(ROOT, "../01_리서치/AI추천_정확도_측정.md"), "utf8");
  ["20/20 (100.0%)", "54/60 (90.0%)", "14/20", "34/60", "15/16 (93.8%)", "14/16 (87.5%)", "151/235 (64.3%)"].forEach(function (s) { assert.ok(md.indexOf(s) >= 0, s + " 없음"); });
});
t("비교 막대 3묶음, 각 값이 0~100%", function () {
  var g = V.compareModel(D); assert.strictEqual(g.length, 3);
  g.forEach(function (x) { [x.rules, x.ai].forEach(function (v) { var p = V.pct(v[0], v[1]); assert.ok(p >= 0 && p <= 100); }); });
});
t("출처 꼬리표: 측정 문서·측정일 / 공공데이터 서비스 목록 번호", function () {
  assert.ok(/출처: .*AI추천_정확도_측정\.md.*측정일 2026-11-02/.test(V.srcMeasure(D)));
  assert.ok(/공공데이터 · 서비스 목록: .*15090532.*15108347/.test(V.srcCatalog(D)));
});
t("사연 펼침에 «가상» 꼬리표, 틀린 추천 «정답표 밖» 표시 칸", function () {
  var h = V.detail(D.rows.filter(function (r) { return r.id === "C1"; })[0]);
  assert.ok(/class="virt">가상</.test(h)); assert.ok(/<li class="no">/.test(h));
});
t("화면에 «다시 재기»·AI 호출 없음(결과 표시만)", function () {
  var src = fs.readFileSync(path.join(__dirname, "ai_check.js"), "utf8") + fs.readFileSync(path.join(__dirname, "ai_check.html"), "utf8");
  assert.ok(!/다시 재기|recommend\(|fetch\(|functions\/v1|ai\.js/.test(src));
});
t("HTML: 모든 출처 칸·제목 id 존재, 44px 이상 누름 칸", function () {
  var html = fs.readFileSync(path.join(__dirname, "ai_check.html"), "utf8");
  ["acKpis", "acKpiSrc", "acBars", "acBarsSrc", "acKinds", "acKindsSrc", "acSteps", "acStepsSrc", "acGrid", "acGridSrc", "acWrong", "acWrongSrc", "acCalib", "acCalibSrc", "acLim"].forEach(function (id) {
    assert.ok(html.indexOf('id="' + id + '"') >= 0, id);
  });
  assert.ok(/\.cell \{[^}]*min-height: 64px/.test(html)); assert.ok(/\.ac-back \{[^}]*min-height: var\(--tap\)/.test(html));
});
t("공무원 화면 메뉴에 검증 화면 링크 한 줄", function () {
  var oh = fs.readFileSync(path.join(ROOT, "officer/index.html"), "utf8");
  assert.strictEqual((oh.match(/\.\.\/shared\/ai_check\.html/g) || []).length, 1);
});

console.log("\nAI 검증 화면 시험: 통과 " + pass + " · 실패 " + fail);
if (fail) process.exit(1);
