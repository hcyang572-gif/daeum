/* AI 추천 검증 화면 자료 만들기 — S10l ②(⚙️ 파로, 2026-10-30). AI 호출 0회.
   실행: node shared/ai_check_build.js   (03_시제품 폴더에서) → shared/ai_check_data.js 를 다시 쓴다.
   원자료(측정 정본): ../01_리서치/AI추천_정확도_측정.md §7-3
     AI 결과      01_리서치/AI정확도_측정도구/results.json   (보정 후 20건, 10-30 00:1x)
     규칙만 결과  01_리서치/AI정확도_측정도구/S6d_after.json (보정 후 20건, AI 0회)
     가상 사연    01_리서치/AI정확도_측정도구/cases.json     (정답표 커밋 796286d)
   화면에 쓰는 숫자는 모두 여기서 원자료로 다시 센다(손으로 적은 숫자 0개 — 보정 전 16건 비교만 측정 문서 §7-3 표 값).
   ⛔ «다시 재기» 단추는 두지 않는다(AI 비용·하루 상한) — 결과 표시만. */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var TOOL = path.join(ROOT, "../01_리서치/AI정확도_측정도구");

// 틀린 추천의 «왜» — 측정 문서 §3·§7-3 표의 문구(없으면 «정답표에 없음»)
var WHY = {
  "G4|3": "직접 요구 아님 — 정답표에 없음",
  "G5|3": "장애인 특화 서비스가 아님",
  "C1|1": "정답표에 없음 · 화면 첫 줄은 규칙이 고정한 109 상담전화",
  "C5|3": "장례비 사연에 교육 지원 — 정답표에 없음",
  "P3|2": "정답표에 없음"
};

function pct(a, b) { return Math.round(a / b * 1000) / 10; }
function sum(arr, f) { return arr.reduce(function (s, x) { return s + f(x); }, 0); }
function tally(list) {
  return { n: list.length, hit1: sum(list, function (x) { return x.hit1 ? 1 : 0; }), hit3: sum(list, function (x) { return x.hit3 ? 1 : 0; }),
    ok3: sum(list, function (x) { return x.ok3; }), n3: sum(list, function (x) { return x.n3; }) };
}

function build() {
  var cases = JSON.parse(fs.readFileSync(path.join(TOOL, "cases.json"), "utf8"));
  var ai = JSON.parse(fs.readFileSync(path.join(TOOL, "results.json"), "utf8"));
  var rules = JSON.parse(fs.readFileSync(path.join(TOOL, "S6d_after.json"), "utf8"));
  var rows = cases.map(function (c) {
    var a = ai[c.id], r = rules[c.id];
    if (!a || !r) throw new Error(c.id + " 결과 없음");
    return { id: c.id, kind: c.kind, text: c.text,
      ai: { hit1: a.hit1, hit3: a.hit3, ok3: a.ok3, n3: a.n3, top3: a.top3.map(function (t) { return { name: t.name, ok: t.ok }; }), dropped: a.unknownDropped || 0 },
      rules: { hit1: r.hit1, hit3: r.hit3, ok3: r.ok3, n3: r.n3, top3: r.top3.map(function (t) { return { name: t.name, ok: t.ok }; }) } };
  });
  var A = tally(rows.map(function (x) { return x.ai; })), R = tally(rows.map(function (x) { return x.rules; }));
  A.dropped = sum(rows, function (x) { return x.ai.dropped; });
  var kinds = ["일반", "위기", "대리"].map(function (k) {
    var sub = rows.filter(function (x) { return x.kind === k; });
    return { kind: k, ai: tally(sub.map(function (x) { return x.ai; })), rules: tally(sub.map(function (x) { return x.rules; })) };
  });
  var wrong = [];
  rows.forEach(function (x) {
    x.ai.top3.forEach(function (t, i) {
      if (!t.ok) wrong.push({ id: x.id, kind: x.kind, text: x.text, rank: i + 1, name: t.name, why: WHY[x.id + "|" + (i + 1)] || "정답표에 없음" });
    });
  });
  var used = Object.keys(ai).map(function (k) { return ai[k].usage; }).filter(Boolean);
  var tokIn = Math.round(sum(used, function (u) { return u.input_tokens; }) / used.length);
  var tokOut = Math.round(sum(used, function (u) { return u.output_tokens; }) / used.length);
  [A, R].forEach(function (t) { t.p1 = pct(t.hit1, t.n); t.p3 = pct(t.hit3, t.n); t.pOk = pct(t.ok3, t.n3); });
  var svc = JSON.parse(fs.readFileSync(path.join(ROOT, "citizen/data/services.json"), "utf8"));
  var catalogSrc = Object.keys(svc.meta.sources).filter(function (k) { return svc.meta.sources[k]; }).map(function (k) {
    var s = svc.meta.sources[k];
    return { name: s.name.replace(/\(OpenAPI\)$/, ""), no: s.page.replace(/^.*\/data\/(\d+)\/.*$/, "$1"), called: s.called };
  });
  return {
    meta: { measured: "2026-10-30", doc: "AI추천_정확도_측정.md §7-3", gold: "796286d", model: "Claude Sonnet 5.5(claude-sonnet-5-5)",
      catalog: svc.services.length, catalogSrc: catalogSrc, sent: 50, tokIn: tokIn, tokOut: tokOut,
      sentHit: { before: [140, 235], after: [151, 235] } },     // §7 «후보 50건 안 정답 포함률» 표
    ai: A, rules: R, kinds: kinds, wrong: wrong, rows: rows,
    // 같은 16건 보정 전후(§3·§7-3 표) — results_before_S6d.json 은 다시 잰 건만 남아 있어 표 값을 옮긴다
    calib: [{ label: "보정 전 · 10-29", hit1: 14, n: 16, ok3: 41, n3: 48 }, { label: "보정 후 · 10-30", hit1: 15, n: 16, ok3: 44, n3: 48 }]
  };
}

function write() {
  var d = build();
  var out = "/* 자동 생성 — node shared/ai_check_build.js (손으로 고치지 말 것). 원자료: 01_리서치/AI정확도_측정도구 · 측정 2026-10-30 */\n" +
    "window.DaeumAICheckData = " + JSON.stringify(d, null, 1) + ";\n";
  fs.writeFileSync(path.join(__dirname, "ai_check_data.js"), out, "utf8");
  return d;
}

if (typeof module !== "undefined") module.exports = { build: build, write: write, pct: pct };
if (require.main === module) {
  var d = write();
  console.log("AI 첫 추천 " + d.ai.hit1 + "/" + d.ai.n + " · 상위3 적합 " + d.ai.ok3 + "/" + d.ai.n3 + " · 규칙만 " + d.rules.hit1 + "/" + d.rules.n + " · 틀린 " + d.wrong.length + "개");
}
