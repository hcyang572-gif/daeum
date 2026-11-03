/* S12-d 38b 시험(⚙️ 파로, 2026-11-03). 실행: node shared/s12_38b.test.js (03_시제품 에서). 네트워크 0.
   ① 연계처 = 자원정보서비스 15001839 정적 스냅샷(키 없음·위치 지어내지 않음) ② «승인 후 연결» 표기 제거
   ③ 상담일지 초안 = 규칙 «자동 정리»(AI 작성 표현 없음) ④ 안전 모드 알림 = 화면 배너·안부 확인 완료(카카오·문자 없음) */
"use strict";
var fs = require("fs"), path = require("path"), assert = require("assert");
var ROOT = path.join(__dirname, "..");
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }
var app = fs.readFileSync(path.join(ROOT, "app/app.js"), "utf8");
var idx = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
var resJ = JSON.parse(fs.readFileSync(path.join(ROOT, "data/resources.json"), "utf8"));
var resS = fs.readFileSync(path.join(ROOT, "data/resources.js"), "utf8");

t("연계처 스냅샷: 한국사회보장정보원 15001839·기준일·상주 시설 목록", function () {
  assert.strictEqual(resJ.source["번호"], "15001839"); assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(resJ.source["기준일"]));
  assert.ok(resJ.facilities.length >= 1 && resJ.total >= resJ.facilities.length);
  assert.strictEqual(resJ.total, resJ.facilities.reduce(function (n, f) { return n + f.svcs.length; }, 0));
});
t("연계처 스냅샷에 키·좌표 없음(자료에 위치가 없으면 지어내지 않음)", function () {
  assert.ok(!/serviceKey|DATA_GO_KR/i.test(resS));
  resJ.facilities.forEach(function (f) { assert.ok(!("x" in f) && !("lat" in f) && !("lng" in f), f.name); });
});
t("index.html 이 연계처 스냅샷을 app.js 보다 먼저 읽음", function () {
  var a = idx.indexOf("data/resources.js"), b = idx.indexOf("app/app.js"); assert.ok(a > 0 && a < b);
});
t("«승인 후 연결» 표기 없음 · 15001839 «연동» 표기", function () {
  assert.ok(app.indexOf("승인 후 연결") < 0); assert.ok(/15001839 연동/.test(app)); assert.ok(/function resBlock\(/.test(app) && /resBlock\(c\.d\.ids\)/.test(app));
});
t("상담일지 초안 = «자동 정리» · AI가 썼다는 표현 없음", function () {
  assert.ok(/자동 정리 · 담당자 확인 전/.test(app));
  assert.ok(!/AI가 (쓴|썼|작성|정리)|AI 작성|AI 초안|AI 정리/.test(app));
});
t("받아쓴 말 다듬기: 군말·되풀이 빼고 마침표", function () {
  var m = app.match(/function tidy\(t\) \{[\s\S]*?\n  \}/); assert.ok(m); var tidy = new Function(m[0] + "; return tidy;")();
  assert.strictEqual(tidy("음 어 보일러가 고장 나서 고장 나서 추워요. 약값이 밀렸어요"), "보일러가 고장 나서 추워요. 약값이 밀렸어요.");
  assert.strictEqual(tidy("가방 가 있어요"), "가방 가 있어요.");
  assert.strictEqual(tidy(""), "");
});
t("안전 모드 시간 초과 → 다른 화면 배너 + «안부 확인 완료»로 해제, 카카오·문자 경로 없음", function () {
  assert.ok(/function alertBar\(/.test(app) && /data-sfack=/.test(app) && /안부 확인 완료/.test(app));
  assert.ok(/safePush\(sf, "on"\)/.test(app) && /safePush\(sf, "ok"\)/.test(app) && /safePush\(sf, "end"\)/.test(app));
  var blk = app.slice(app.indexOf("function safePush"), app.indexOf("function talkView"));
  assert.ok(!/kakao|sms|문자 보내|알림톡/i.test(blk));
});
t("시연 데이터만으로도 PC 첫 화면에 알림이 보임(빈 화면 아님)", function () {
  assert.ok(/id: "DEMO"/.test(app) && /시연·가상/.test(app) && /시연 알림 다시 보기/.test(app));
});

console.log("\n38b 시험: 통과 " + pass + " · 실패 " + fail);
process.exitCode = fail ? 1 : 0;
