/* 엉뚱한 연계 점검 — S9b-2(⚙️ 파로, 2026-10-29). 실행: node shared/ai_gate.test.js (03_시제품 폴더에서)
   AI 호출 0회. 사례 묶음 전체로 «특정 피해자·특정 신분 대상 사업이 그 사정 없이 추천되는가»를 본다.
   ① 국민 창구 규칙 추천: 01_리서치/AI정확도_측정도구/cases.json 20건 상위 8
   ② 공무원 창구 상담 요약: 가상 명단 154가구(data/households.json) × 지표로 만든 가상 상담 대본, 연계 후보 상위 5
   관문을 끈 결과(«고치기 전»)도 함께 세어 원인을 남긴다. */
"use strict";
var fs = require("fs"), path = require("path"), assert = require("assert");
var ROOT = path.join(__dirname, "..");
global.window = globalThis; window.console.warn = function () {}; console.info = function () {};
eval(fs.readFileSync(path.join(ROOT, "shared/config.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "shared/ai.js"), "utf8"));
var AI = window.DaeumAI;
var catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "citizen/data/services.json"), "utf8"));
var cases = JSON.parse(fs.readFileSync(path.join(ROOT, "../01_리서치/AI정확도_측정도구/cases.json"), "utf8"));
var D = JSON.parse(fs.readFileSync(path.join(ROOT, "data/households.json"), "utf8"));
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }
function bad(svc, text) { return !AI.gateOk(svc, text); }

// 관문을 잠시 끄는 스위치(«고치기 전» 재현용)
var GATES = AI.GATES, saved = GATES.splice(0, GATES.length);
function gatesOff() { GATES.splice(0, GATES.length); }
function gatesOn() { GATES.splice(0, GATES.length); saved.forEach(function (g) { GATES.push(g); }); }

// ── ① 국민 창구 ─────────────────────────────────────────
function citizenRun(on) {
  if (on) gatesOn(); else gatesOff();
  var out = [];
  cases.forEach(function (c) {
    var input = { text: c.text, chips: [], proxy: { isProxy: c.kind === "대리", relation: c.relation || "" } };
    var p = AI.analyze(input);
    AI.matchRules(p, catalog, 8, c.text).forEach(function (r) { gatesOn(); if (bad(r.service, c.text)) out.push(c.id + " " + r.service.name); if (!on) gatesOff(); });
  });
  gatesOn();
  return out;
}
console.log("① 국민 창구 사례 " + cases.length + "건");
var cBefore = citizenRun(false), cAfter = citizenRun(true);
console.log("    관문 없을 때 엉뚱한 추천 " + cBefore.length + "건" + (cBefore.length ? ": " + cBefore.slice(0, 6).join(" / ") : ""));
t("관문 있을 때 엉뚱한 추천 0건", function () { assert.deepStrictEqual(cAfter, []); });

// ── ② 공무원 창구 ───────────────────────────────────────
// officer.js loadServices 와 같은 이름 낱말 규칙(TAG_WORDS 사본 — 바꾸면 함께 바꾼다)
var TAG_WORDS = { "생계": /생계|기초생활|기초연금|생활비|자활|근로장려|실업|구직급여|푸드|긴급지원/, "의료": /의료|병원|건강|진료|본인부담|요양|치매/,
  "주거": /주거|월세|임대/, "에너지": /에너지|난방|전기요금|연료/, "돌봄": /돌봄|안심|안부|희망풍차|장기요양/,
  "일자리": /일자리|취업|고용|내일배움|실업|자활/, "장애": /장애/, "정신건강": /정신|마음|심리|자살/,
  "아동": /아동|양육|아이돌봄|교육/, "금융·채무": /채무|신용|법률/, "긴급": /긴급|자살|응급/ };
function tagsOf(s, old) {
  var tags = [];
  function from(text) { Object.keys(TAG_WORDS).forEach(function (k) { if (tags.indexOf(k) < 0 && TAG_WORDS[k].test(text)) tags.push(k); }); }
  from(s.name || "");
  if (old) { if (!tags.length) from([s.target, s.support].join(" ")); }       // 고치기 전: 본문 낱말로 범주를 붙였다
  else AI.needsFromRule(s.rule).forEach(function (k) { if (tags.indexOf(k) < 0) tags.push(k); });
  return tags;
}
var SAY = { power_cut: "전기가 끊겨서 밤에는 불을 못 켜요.", water_cut: "수도가 끊겨서 물을 길어다 써요.", gas_cut: "가스가 끊겨서 보일러를 못 돌려요. 추워요.",
  health_ins_arrears: "건강보험료가 몇 달 밀렸어요.", telecom_arrears: "전화 요금도 밀려서 곧 끊긴대요.", mgmt_fee_arrears: "관리비가 밀려서 독촉장이 왔어요.",
  rent_arrears: "월세가 밀려서 집주인이 나가라고 할까 봐 걱정이에요.", medical_overspend: "허리가 아파서 병원에 다니는데 약값이 너무 많이 들어요.",
  job_loss: "다니던 공장에서 일을 그만두게 됐어요. 일자리를 찾고 있어요.", loan_overdue: "카드값이랑 대출 이자 독촉 전화가 계속 와요.",
  benefit_stopped: "받던 지원이 끊겼는데 이유를 모르겠어요. 생활비가 없어요." };
var listed = D.households.filter(function (h) { return Object.keys(h.indicators).some(function (k) { return h.indicators[k]; }); });
function officerRun(old, on) {
  if (on) gatesOn(); else gatesOff();
  var svcs = catalog.services.map(function (s) { return { id: s.id, name: s.name, tags: tagsOf(s, old), rule: s.rule }; });
  var byId = {}; svcs.forEach(function (s) { byId[s.id] = s; });
  var out = [], perSvc = {};
  listed.forEach(function (h) {
    var lines = Object.keys(SAY).filter(function (k) { return h.indicators[k]; }).map(function (k) { return "주민: " + SAY[k]; });
    if (h.single && h.members[0].age >= 75) lines.push("주민: 혼자 사니까 끼니를 거를 때가 많아요. 말동무도 없고요.");
    if (h.disability) lines.push("주민: 거동이 불편해서 밖에 잘 못 나가요.");
    var text = lines.join("\n");
    var factors = D.indicators.filter(function (d) { return h.indicators[d.key]; }).map(function (d) { return { key: d.key, name: d.name }; });
    var r = AI.ruleSummarize(text, { label: h.label, factors: factors, services: svcs });
    r.serviceIds.slice(0, 5).forEach(function (id) {
      gatesOn(); var s = byId[id];
      if (bad(s, text)) { out.push(h.id + " " + s.name); perSvc[s.name] = (perSvc[s.name] || 0) + 1; }
      if (!on) gatesOff();
    });
  });
  gatesOn();
  return { list: out, perSvc: perSvc };
}
console.log("② 공무원 창구 가상 상담 " + listed.length + "가구");
var oBefore = officerRun(true, false), oAfter = officerRun(false, true);
console.log("    고치기 전(본문 낱말 꼬리표·관문 없음) 엉뚱한 연계 " + oBefore.list.length + "건: " +
  Object.keys(oBefore.perSvc).sort(function (a, b) { return oBefore.perSvc[b] - oBefore.perSvc[a]; }).slice(0, 6).map(function (k) { return k + " " + oBefore.perSvc[k]; }).join(" / "));
t("고친 뒤 엉뚱한 연계 0건", function () { assert.deepStrictEqual(oAfter.list, []); });
t("실직 가구에 «성매매» 사업 0건, 일자리 사업은 남음", function () {
  var h = listed.filter(function (x) { return x.indicators.job_loss; })[0];
  var svcs = catalog.services.map(function (s) { return { id: s.id, name: s.name, tags: tagsOf(s, false), rule: s.rule }; });
  var r = AI.ruleSummarize("주민: " + SAY.job_loss, { label: h.label, factors: [{ key: "job_loss", name: "고용보험 상실(실직)" }], services: svcs });
  var names = r.serviceIds.slice(0, 5).map(function (id) { return svcs.filter(function (s) { return s.id === id; })[0].name; });
  assert.ok(!names.some(function (n) { return /성매매|출소/.test(n); }), names.join(","));
  assert.ok(names.length > 0);
});
t("사정이 직접 나오면 대상 사업도 추천 가능(관문은 막기만 하지 않음)", function () {
  assert.ok(AI.gateOk({ name: "성매매 방지 및 피해자 지원" }, "성매매 피해를 입어 상담받고 싶어요"));
  assert.ok(AI.gateOk({ name: "출소(예정)자 취업지원사업(허그일자리지원)" }, "작년에 출소해서 일자리를 찾고 있어요"));
  assert.ok(!AI.gateOk({ name: "출소(예정)자 취업지원사업(허그일자리지원)" }, "회사에서 해고돼서 일자리를 찾아요"));
});

console.log("\n결과: 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
