/* S12-d 39 시험(⚙️ 파로, 2026-11-03). 실행: node shared/s12_39.test.js (03_시제품 에서). 네트워크 0.
   ① D1 상담일지 초안 = 복사 + 보관 hwpx(만들기 → 받기), 개인정보 4칸 없음·«자동 정리»
   ② D5 실적 보고 = 주간/월간 전환, 월간 hwpx 에 15062448 수급권자 현황 비교(규칙 집계)
   만든 hwpx 는 OUT 폴더(기본 os.tmpdir())에 남긴다 → python shared/office_check.py <파일> 로 검사. */
"use strict";
var fs = require("fs"), path = require("path"), os = require("os"), assert = require("assert");
var ROOT = path.join(__dirname, "..");
var H = require("./hwpx.js");
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }
var app = fs.readFileSync(path.join(ROOT, "app/app.js"), "utf8");
var OUT = process.env.OUT || os.tmpdir();
function grab(name) { var m = app.match(new RegExp("function " + name + "\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}")); assert.ok(m, name + " 없음"); return m[0]; }
function mdDot(d) { d = new Date(d); return (d.getMonth() + 1) + ". " + d.getDate() + "."; }
var d1Hwpx = new Function(grab("d1Hwpx") + "; return d1Hwpx;")();
var d5Hwpx = new Function("mdDot", grab("d5Hwpx") + "; return d5Hwpx;")(mdDot);
function unzipText(u8) { return Buffer.from(u8).toString("utf8"); } // 무압축 ZIP — 본문 XML 이 그대로 보인다

t("D1: 복사 + «보관 hwpx 받기» 두 번째 받기 단추(만들기 → 받기 흐름)", function () {
  assert.ok(/flowBtns\("d1", true, "입력 순서 복사", "보관 hwpx 받기"\)/.test(app));
  assert.ok(/data-act="get" data-alt="1"/.test(app));
  assert.ok(/getDoc\(M, docSel, !!gt\.dataset\.alt\)/.test(app));
  assert.ok(/if \(k === "d1" && !alt\)/.test(app) && /상담일지초안_/.test(app));
});
t("D1 hwpx: 가구 번호·읍면만, 개인정보 4칸 값 없음, «자동 정리», AI 작성 표현 없음", function () {
  var x = { id: "H-007", h: { area: "화서면" } };
  var dft = { fields: [{ label: "대상", value: "가구 H-007 · 화서면" }, { label: "주요 내용", value: "보일러 고장, 약값 밀림." }, { label: "욕구", value: "주거, 건강" }] };
  var doc = d1Hwpx(x, dft, "2026. 11. 3.", "상주시청 · 화서면 맞춤형복지팀", H.TW);
  var u8 = H.build(doc), txt = unzipText(u8);
  assert.ok(txt.indexOf("H-007") >= 0 && txt.indexOf("화서면") >= 0 && txt.indexOf("자동 정리") >= 0);
  ["성명:", "주민등록번호:", "연락처:", "주소:"].forEach(function (k) { assert.ok(txt.indexOf(k) < 0, k); });
  assert.ok(!/AI가 (쓴|썼|작성|정리)|AI 작성|AI 초안/.test(JSON.stringify(doc)));
  fs.writeFileSync(path.join(OUT, "s12_39_d1.hwpx"), Buffer.from(u8));
});
t("D5: 주간/월간 전환 단추 · 기간별 저장 키 · 월간 이름", function () {
  assert.ok(/data-per="' \+ p\[0\]/.test(app) && /\["wk", "주간"\], \["mo", "월간"\]/.test(app));
  assert.ok(/function perKey\(per\)/.test(app) && /"mo:" \+ ymd\(monthRange\(\)\.from\)\.slice\(0, 7\) \+ ":d5"/.test(app));
  assert.ok(/nm: "주간·월간 추진 실적 보고"/.test(app) && /월간실적_/.test(app));
  assert.ok(!/function weekModel\(/.test(app), "옛 주간 전용 집계는 periodModel 로 합침");
});
t("D5 월간 hwpx: 주차별 추세 + 15062448 수급권자 현황 표·비교 줄", function () {
  var w = { per: "mo", name: "월간", from: new Date(2026, 10, 1), to: new Date(2026, 10, 30), met: 6, absent: 2, refuse: 1, total: 9, areas: [["화서면", 5], ["모동면", 4]], listN: 40, doneN: 6,
    weeks: [["1주", 0], ["2주", 9]], rcp: "상주시 기초생활보장 수급가구 4,916(2025-12)", rcpRows: [["기초생활보장(맞춤형급여)", "6,073", "4,916"], ["기초생계급여", "4,537", "3,868"]],
    cmp: "이번 달 상담 6가구 = 상주 기초생활보장 수급가구 4,916의 0.12%(2025-12 기준)", concl: "이번 달 9곳 방문해 6가구 상담." };
  var doc = d5Hwpx(w, "2026. 11. 3.", "상주시청 · 화서면 맞춤형복지팀", H.TW), s = JSON.stringify(doc);
  assert.strictEqual(doc.title, "월간 추진 실적 보고");
  assert.ok(s.indexOf("15062448") >= 0 && s.indexOf("주차별 추세") >= 0 && s.indexOf("0.12%") >= 0);
  var u8 = H.build(doc); assert.ok(unzipText(u8).indexOf("4,916") >= 0);
  fs.writeFileSync(path.join(OUT, "s12_39_d5_month.hwpx"), Buffer.from(u8));
  var wk = Object.assign({}, w, { per: "wk", name: "주간", weeks: [] }), dw = d5Hwpx(wk, "2026. 11. 3.", "상주시청", H.TW);
  assert.strictEqual(dw.title, "주간 추진 실적 보고"); assert.ok(JSON.stringify(dw).indexOf("주차별 추세") < 0);
  fs.writeFileSync(path.join(OUT, "s12_39_d5_week.hwpx"), Buffer.from(H.build(dw)));
});
t("D5 비교 산식 = 상담 가구 ÷ 15062448 수급가구 × 100(규칙 집계, 문장 생성 없음)", function () {
  assert.ok(/\(met \/ b\["수급가구수"\] \* 100\)\.toFixed\(2\)/.test(app));
});
console.log("\nS12-d 39: 통과 " + pass + " · 실패 " + fail + " · hwpx → " + OUT);
process.exit(fail ? 1 : 0);
