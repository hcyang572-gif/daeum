/* S10p-2 첫 화면 «하루 방문 시각표» 카드 감소율 계산 — node officer/s10p2.test.js */
var F = require("./front.js"), assert = require("assert");
assert.strictEqual(F.gainPct({ naive: 127.3071, plan: 65.7728 }), 48); // 10-30 재측정(기본 9곳, 48.3% → 48)
assert.strictEqual(F.gainPct(null), null);
assert.strictEqual(F.gainPct({ naive: 0, plan: 0 }), null);
var fs = require("fs"), html = fs.readFileSync(__dirname + "/index.html", "utf8");
assert.strictEqual((html.match(/class="pd-card d-card"/g) || []).length, 3, "주 화면 카드 3개");
assert.ok(html.indexOf('<details class="today-old') > 0, "옛 오늘 내용은 접힘");
assert.ok(fs.readFileSync(__dirname + "/mount.js", "utf8").indexOf("달력 파일(.ics)") > 0, ".ics 단추 유지");
assert.strictEqual(F.gainPct({ naive: F.SNAP.naive, plan: F.SNAP.plan }), F.SNAP.pct, "고정 스냅숏 = 산식 값(S10p-3 F-1)");
assert.ok(html.indexOf('value="9"') > 0, "시연 기본 담기 9곳(S10p-3 F-3)");
assert.ok(html.indexOf("남원동") < 0, "옛 한 읍면동 문장 없음(F-4)");
assert.ok(fs.readFileSync(__dirname + "/demo_seed.js", "utf8").indexOf("demo=reset") > 0, "시연 초기화");
console.log("S10p-2·3 첫 화면 시험 10개 통과");
