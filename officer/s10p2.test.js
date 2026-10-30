/* S10p-2 첫 화면 «하루 방문 시각표» 카드 감소율 계산 — node officer/s10p2.test.js */
var F = require("./front.js"), assert = require("assert");
assert.strictEqual(F.gainPct({ naive: 135.9164, plan: 73.7051 }), 46); // 10-30 라이브 재측정값(45.8% → 46)
assert.strictEqual(F.gainPct(null), null);
assert.strictEqual(F.gainPct({ naive: 0, plan: 0 }), null);
var fs = require("fs"), html = fs.readFileSync(__dirname + "/index.html", "utf8");
assert.strictEqual((html.match(/class="pd-card d-card"/g) || []).length, 3, "주 화면 카드 3개");
assert.ok(html.indexOf('<details class="today-old') > 0, "옛 오늘 내용은 접힘");
assert.ok(fs.readFileSync(__dirname + "/mount.js", "utf8").indexOf("달력 파일(.ics)") > 0, ".ics 단추 유지");
console.log("S10p-2 첫 화면 시험 6개 통과");
