/* S11-d 채점 수정 시험(⚙️ 파로, 2026-11-02). 실행: node officer/s11d.test.js (03_시제품 에서). AI 호출 0회(fetch 가짜).
   ① 규칙 모드 정직 표시: AI 응답 실패면 source=rules·fallback, 화면 머리띠 이벤트 ok=false
   ② «목록 밖 답»은 keepKnown 이 실제로 버린 개수
   ③ 발굴대상자 조회 서식 43열 머리글 → 열 맞춤(성명·주민번호·전화 등은 읽지 않음), 가상 주소 → 가구
   ④ 시연 기본 특보 = 한파 · 숫자 한 벌(48.3%·9곳) */
"use strict";
var fs = require("fs"), path = require("path"), assert = require("assert");
var ROOT = path.join(__dirname, "..");
var pass = 0, fail = 0, q = [];
function t(name, fn) { q.push([name, fn]); }

// ── 가짜 브라우저 ──
var events = [];
global.window = globalThis;
global.CustomEvent = function (type, o) { this.type = type; this.detail = o && o.detail; };
var store = {};
global.document = { readyState: "complete", getElementById: function () { return null; }, querySelectorAll: function () { return []; },
  addEventListener: function () {}, dispatchEvent: function (e) { events.push(e); }, createElement: function () { return {}; }, head: { appendChild: function () {} } };
global.location = { search: "", hash: "", pathname: "/" };
global.matchMedia = function () { return { matches: false }; };
global.addEventListener = function () {};
global.localStorage = { getItem: function (k) { return store[k] == null ? null : store[k]; }, setItem: function (k, v) { store[k] = String(v); } };
global.sessionStorage = global.localStorage;
eval(fs.readFileSync(path.join(ROOT, "shared/config.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "shared/ai.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "officer/s11c.js"), "utf8"));
var AI = window.DaeumAI, S = window.DaeumS11c;
var SVC = [{ id: "s1", name: "에너지바우처", tags: ["energy", "senior"] }, { id: "s2", name: "긴급복지 생계지원", tags: ["lowIncome", "debt"] }];
var TEXT = "혼자 사시는 82세 어르신이 난방비가 밀려 걱정이 많다고 하셨습니다.";

t("AI 응답 429 → 규칙 초안(source≠ai) + 머리띠 이벤트 ok=false", function () {
  global.fetch = function () { return Promise.resolve({ ok: false, status: 429, json: function () { return Promise.resolve({}); } }); };
  events = [];
  return AI.summarize(TEXT, { services: SVC }).then(function (r) {
    assert.notStrictEqual(r.source, "ai"); assert.ok(r.fallback, "fallback 사유");
    var ev = events.filter(function (e) { return e.type === "daeum:ai-status"; });
    assert.strictEqual(ev.length, 1); assert.strictEqual(ev[0].detail.ok, false); assert.strictEqual(ev[0].detail.code, 429);
    assert.strictEqual(AI.lastStatus().ok, false);
  });
});
t("AI 정상 → «목록 밖 답» = 실제로 버린 개수(지어낸 id 2개 → 2)", function () {
  global.fetch = function () { return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ summary: "요약", picks: [{ id: "s1", reason: "난방" }, { id: "zz-1", reason: "x" }, { id: "zz-2", reason: "y" }] }); } }); };
  events = [];
  return AI.summarize(TEXT, { services: SVC }).then(function (r) {
    assert.strictEqual(r.source, "ai"); assert.deepStrictEqual(r.dropped.out, 2); assert.ok(r.serviceIds.indexOf("zz-1") < 0);
    assert.strictEqual(events.filter(function (e) { return e.type === "daeum:ai-status"; })[0].detail.ok, true);
  });
});
t("화면 코드: 규칙 모드면 «규칙 초안»·«규칙 선택»·«시연 모드», 머리띠는 마지막 호출 결과로", function () {
  var s11 = fs.readFileSync(path.join(ROOT, "officer/s11.js"), "utf8"), off = fs.readFileSync(path.join(ROOT, "officer/officer.js"), "utf8");
  assert.ok(/isAI \? "AI 초안" : "규칙 초안"/.test(s11)); assert.ok(/규칙 선택<br>\+ 근거/.test(s11));
  assert.ok(!/out: 0 \}/.test(s11), "«목록 밖» 고정 0 남음");
  assert.ok(/daeum:ai-status/.test(off) && /시연 모드 · 규칙 초안/.test(off));
});

var HEAD = ["발굴년월", "소재행정동", "발굴우선순위", "대상구분", "비대상사유", "비대상사유상세", "비대상상세내용", "성명", "주민등록번호", "발굴변수변동내역", "발굴횟수", "처리여부", "최초처리일자", "최초처리구분", "최초처리상태", "최종지원실적", "이동전화번호요청상태", "(행복이음)주소", "(행복이음)우편번호", "(행복이음)전화번호", "(행복이음)휴대폰번호", "(행안부)주소", "(행안부)기타주소", "(행안부)연락처", "담당자", "AI초기상담요청일시", "AI초기상담요청상태", "AI초기상담상담결과", "기초생계급여", "기초의료급여", "기초주거급여", "기초교육급여", "긴급복지", "차상위장애인", "차상위본인부담경감대상자", "차상위자활", "차상위계층확인", "한부모가족", "타법의료", "장애인연금", "기초연금", "우선방문대상자_e아동", "우선방문대상자_고독사"];
t("서식 43열: 1행 제목(병합) 건너뛰고 2행을 머리글로, 쓰는 열만 맞춤", function () {
  var title = ["중앙발굴대상자 조회결과 현황"].concat(new Array(42).fill(""));
  var hd = S.mapCols([title, HEAD]);
  assert.strictEqual(HEAD.length, 43); assert.strictEqual(hd.i, 1);
  var want = { area: "소재행정동", sig: "발굴변수변동내역", addr: "(행복이음)주소", prio: "발굴우선순위", cnt: "발굴횟수", proc: "처리여부", lonely: "우선방문대상자_고독사", child: "우선방문대상자_e아동", aiReq: "AI초기상담요청상태", aiRes: "AI초기상담상담결과" };
  Object.keys(want).forEach(function (k) { assert.strictEqual(HEAD[hd.m[k]], want[k], k); });
  ["성명", "주민등록번호", "(행복이음)전화번호", "(행복이음)휴대폰번호", "(행안부)주소", "(행안부)연락처", "담당자"].forEach(function (h) {
    Object.keys(hd.m).forEach(function (k) { assert.notStrictEqual(HEAD[hd.m[k]], h, h + " 을(를) 읽으면 안 됨"); });
  });
});
t("옛 CSV 머리글(관리번호·읍면동·위기정보)도 그대로 받음", function () {
  var hd = S.mapCols([["순번", "관리번호", "성명", "읍면동", "위기정보", "연령", "가구원수", "비고"]]);
  assert.strictEqual(hd.m.id, 1); assert.strictEqual(hd.m.area, 3); assert.strictEqual(hd.m.sig, 4);
});
t("가상 주소 열쇠: «경상북도 상주시 함창읍 가상리 9» → 함창읍|9, 실제형 주소는 빈 열쇠", function () {
  assert.strictEqual(S.addrKey("경상북도 상주시 함창읍 가상리 9"), "함창읍|9");
  assert.strictEqual(S.addrKey("경상북도 상주시 사벌국면 가상리 15"), "사벌국면|15");
  assert.strictEqual(S.addrKey("경상북도 상주시 함창읍 무엇로 12"), "");
});
t("시연 명단 xlsx 있음·옛 CSV 없음·링크 두 곳이 xlsx", function () {
  assert.ok(fs.existsSync(path.join(ROOT, "data/demo_list.xlsx"))); assert.ok(!fs.existsSync(path.join(ROOT, "data/demo_list.csv")));
  var html = fs.readFileSync(path.join(ROOT, "officer/index.html"), "utf8"), js = fs.readFileSync(path.join(ROOT, "officer/s11c.js"), "utf8");
  assert.ok(/data\/demo_list\.xlsx/.test(html) && /data\/demo_list\.xlsx/.test(js)); assert.ok(!/demo_list\.csv/.test(html + js));
});
t("특보 기본값 한파 · 감소율 48.3% 한 숫자 · 2028 문구 없음", function () {
  var A = JSON.parse(fs.readFileSync(path.join(ROOT, "data/alerts_demo.json"), "utf8"));
  assert.strictEqual(A.weather.active, "cold");
  var html = fs.readFileSync(path.join(ROOT, "officer/index.html"), "utf8"), mount = fs.readFileSync(path.join(ROOT, "officer/mount.js"), "utf8");
  assert.ok(/48\.3% 줄임/.test(html) && !/48% 줄임/.test(html) && !/본문 48\.3%/.test(html));
  assert.ok(!/2028/.test(html + mount));
});

(async function () {
  for (var i = 0; i < q.length; i++) {
    try { await q[i][1](); pass++; console.log("  통과 " + q[i][0]); } catch (e) { fail++; console.log("  실패 " + q[i][0] + " — " + e.message); }
  }
  console.log("\nS11-d 시험: 통과 " + pass + " · 실패 " + fail);
  process.exitCode = fail ? 1 : 0;
})();
