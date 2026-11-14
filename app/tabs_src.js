/* 시험 도우미(node 전용 — 브라우저는 읽지 않음) · 101회차 ⚙️ 파로(2026-11-14)
   app.js 를 탭 모듈(app/tab_*.js)로 나눈 뒤에도 시험이 «화면 코드 전체 글자»를 예전 순서 그대로 보게 한다:
   app.js 의 `  useTab("이름");` 줄 자리에 app/tab_이름.js 글자를 끼워 넣는다(= 나누기 전 app.js 와 같은 순서).
   쓰는 법: var A = require("../app/tabs_src.js")();  ·  파일 목록만: require("../app/tabs_src.js").files */
"use strict";
var fs = require("fs"), path = require("path");
var NAMES = ["common", "today", "field", "record", "visit", "report"];
function all() {
  var a = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  return a.replace(/^  useTab\("(\w+)"\);$/gm, function (_, n) { return fs.readFileSync(path.join(__dirname, "tab_" + n + ".js"), "utf8"); });
}
module.exports = all;
module.exports.files = ["app/app.js"].concat(NAMES.map(function (n) { return "app/tab_" + n + ".js"; }));
