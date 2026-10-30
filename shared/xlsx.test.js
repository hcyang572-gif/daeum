/* 닿음 S10j-2 엑셀·한글 내려받기 시험 — 실행: node shared/xlsx.test.js (03_시제품 폴더에서)
   엑셀: ZIP 구조·시트 순서·머리행·틀 고정·자동 필터·A4 인쇄(한 쪽 너비·머리행 반복·쪽 번호)·수식(합계·비율·증감·요약 참조)·데이터 출처 시트·이스케이프
   한글: mimetype 첫 자리·무압축·표 계산식(FORMULA =SUM)·쪽 번호 «- n -»·A4·개조식 기호
   보고서: S10j 모델 → 엑셀 spec·한글 doc(같은 숫자, 개인 식별값 없음)
   «실제 프로그램으로 열기»는 python shared/office_check.py <파일> (Excel·한글 COM) */
"use strict";
var assert = require("assert"), path = require("path"), zlib = require("zlib");
require(path.join(__dirname, "..", "officer", "features.js"));
require(path.join(__dirname, "report.js"));
require(path.join(__dirname, "report_doc.js"));
var X = require(path.join(__dirname, "xlsx.js")), W = require(path.join(__dirname, "hwpx.js"));
var F = globalThis.DaeumFeatures, D = F.reportDoc, HH = require(path.join(__dirname, "..", "data/households.json"));
var pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("  통과 " + name); } catch (e) { fail++; console.log("  실패 " + name + " — " + e.message); } }

// 무압축 ZIP 읽기(시험용)
function unzip(buf) {
  var b = Buffer.from(buf), out = [], p = 0;
  while (b.readUInt32LE(p) === 0x04034b50) {
    var method = b.readUInt16LE(p + 8), crc = b.readUInt32LE(p + 14), size = b.readUInt32LE(p + 18), nl = b.readUInt16LE(p + 26), el = b.readUInt16LE(p + 28);
    var name = b.slice(p + 30, p + 30 + nl).toString("utf8"), data = b.slice(p + 30 + nl + el, p + 30 + nl + el + size);
    out.push({ name: name, method: method, crc: crc, data: data, text: data.toString("utf8") }); p += 30 + nl + el + size;
  }
  return out;
}
function get(files, n) { var f = files.filter(function (x) { return x.name === n; })[0]; if (!f) throw new Error("없음: " + n); return f.text; }
// 간이 XML 짝 맞춤 검사(여는/닫는 태그 순서)
function wellFormed(xml) {
  var st = [], re = /<(\/?)([A-Za-z_][\w:.-]*)([^>]*?)(\/?)>/g, m;
  xml = xml.replace(/<\?xml[^>]*\?>/, "");
  while ((m = re.exec(xml))) { if (m[4]) continue; if (m[1]) { var top = st.pop(); if (top !== m[2]) throw new Error("짝 안 맞음 " + top + " / " + m[2]); } else st.push(m[2]); }
  if (st.length) throw new Error("닫히지 않음 " + st.join(","));
  return true;
}

var spec = {
  title: "시험 <보고서> & 표", subtitle: "2026. 10. 19. ~ 2026. 10. 30.", made: "2026. 10. 30. 15:00", office: "상주시 시험팀", conclusion: "한 줄 결론", note: "※ 가상",
  kpis: [{ k: "명단", v: 30, u: "가구", ref: { sheet: "읍면별", col: "n" } }, { k: "접촉률", v: 0.4, type: "pct", fx: "IF([읍면별:n]=0,0,[읍면별:c]/[읍면별:n])" }, { k: "마감", v: "D-3", type: "text" }],
  lines: [{ lv: 1, text: "□ 핵심" }, { lv: 2, text: "○ 둘째" }],
  sheets: [
    { name: "읍면별", title: "<표 1> 읍면별", unit: "단위: 가구", src: "※ 출처: 행정안전부(2026-09)", tags: ["가상", "공공데이터"],
      columns: [{ key: "a", h: "읍면", type: "text" }, { key: "n", h: "명단", type: "int" }, { key: "c", h: "접촉", type: "int" },
        { key: "r", h: "접촉률", type: "pct", fx: "IF({n}=0,0,{c}/{n})", calc: function (g) { return g("n") ? g("c") / g("n") : 0; } },
        { key: "s", h: "비중", type: "pct", fx: "IF({n:sum}=0,0,{n}/{n:sum})", calc: function (g, cx) { return g("n") / cx.sum("n"); } }],
      rows: [["가읍", 10, 4, null, null], ["나면", 20, 8, null, null]], total: "합계" },
    { name: "추세", title: "추세", columns: [{ key: "d", h: "날짜", type: "date" }, { key: "c", h: "누적", type: "int" }, { key: "x", h: "증감", type: "int", fx: "{c}-{c:prev}" }, { key: "f", h: "첫날 대비", type: "pct", fx: "{c}/{c:first}" }],
      rows: [["10. 19.", 2, null, null], ["10. 20.", 5, null, null]], total: false },
    { name: "넓은:표/이름*이 아주 길어서 서른한 글자를 넘는 시트", title: "넓은 표", columns: "abcdefghij".split("").map(function (k) { return { key: k, h: "항목 " + k + " 아주 긴 머리말", type: "int", w: 14 }; }), rows: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]] },
    { name: "본문", title: "본문", text: [{ lv: 0, text: "Ⅰ. 개요" }, { lv: 1, text: "□ 목적" }, { lv: 2, text: "○ 설명" }] }
  ],
  sources: [{ kind: "공공데이터", org: "행정안전부", name: "주민등록 인구통계", date: "2026-09", use: "읍면" }, { kind: "가상", org: "닿음 시연 자료", name: "가구", date: "가상", use: "전체" }]
};
var XF = unzip(X.build(spec));
var wb = get(XF, "xl/workbook.xml");
function sheetOf(name) { var ids = []; wb.replace(/<sheet name="([^"]+)" sheetId="(\d+)"/g, function (_, n, i) { ids.push([n, i]); }); var hit = ids.filter(function (x) { return x[0] === name; })[0]; return get(XF, "xl/worksheets/sheet" + hit[1] + ".xml"); }

console.log("엑셀 — 꾸러미");
t("ZIP: 필수 부품·무압축·CRC 일치", function () {
  ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "docProps/core.xml"].forEach(function (n) { get(XF, n); });
  XF.forEach(function (f) { assert.strictEqual(f.method, 0); if (zlib.crc32) assert.strictEqual(f.crc, zlib.crc32(f.data) >>> 0, f.name); else assert.strictEqual(f.crc, X.crc32(new Uint8Array(f.data))); });
});
t("모든 XML 짝 맞음", function () { XF.forEach(function (f) { if (/\.(xml|rels)$/.test(f.name)) wellFormed(f.text); }); });
t("시트 순서: 요약 → 주제별 → 데이터 출처(마지막), 31자·금지 글자 정리", function () {
  var names = []; wb.replace(/<sheet name="([^"]+)"/g, function (_, n) { names.push(n.replace(/&amp;/g, "&")); });
  assert.strictEqual(names[0], "요약"); assert.strictEqual(names[names.length - 1], "데이터 출처"); assert.strictEqual(names.length, 6);
  names.forEach(function (n) { assert.ok(n.length <= 31 && !/[\[\]:*?\/\\]/.test(n), n); });
});
t("열 때 다시 계산(fullCalcOnLoad)", function () { assert.ok(/<calcPr[^>]*fullCalcOnLoad="1"/.test(wb)); });

console.log("엑셀 — 모양·인쇄");
var S1 = sheetOf("읍면별");
t("제목·작성일·출처 머리 + 4행 머리행(닿음 색 서식)", function () {
  assert.ok(/<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">&lt;표 1&gt; 읍면별/.test(S1));
  assert.ok(/<c r="A2"[^>]*><is><t[^>]*>작성 2026\. 10\. 30\. 15:00/.test(S1));
  assert.ok(/<c r="A4" s="3"[^>]*>.*읍면/.test(S1));
  assert.ok(/<fgColor rgb="FF5A4AC2"\/>/.test(get(XF, "xl/styles.xml")));
});
t("줄무늬(짝수 줄 다른 서식)·숫자 오른쪽 #,##0·비율 0.0%", function () {
  assert.ok(/<c r="B5" s="6">/.test(S1) && /<c r="B6" s="7">/.test(S1));
  var st = get(XF, "xl/styles.xml"); assert.ok(/formatCode="#,##0"/.test(st) && /formatCode="0\.0%"/.test(st)); assert.ok(/horizontal="right"/.test(st));
});
t("틀 고정(4행 아래)·자동 필터(머리~마지막 자료 줄)", function () {
  assert.ok(/<pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"\/>/.test(S1));
  assert.ok(/<autoFilter ref="A4:E6"\/>/.test(S1));
  assert.ok(/_xlnm\._FilterDatabase" localSheetId="1" hidden="1">'읍면별'!\$A\$4:\$E\$6/.test(wb));
});
t("A4·한 쪽 너비 맞춤·세로·머리행 반복·쪽 번호 바닥글", function () {
  assert.ok(/<pageSetUpPr fitToPage="1"\/>/.test(S1));
  assert.ok(/<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"\/>/.test(S1));
  assert.ok(/_xlnm\.Print_Titles" localSheetId="1">'읍면별'!\$4:\$4/.test(wb));
  assert.ok(/<oddFooter>[^<]*&amp;P \/ &amp;N[^<]*<\/oddFooter>/.test(S1));
});
t("넓은 표는 자동으로 가로, 첫 열도 고정", function () { var s = sheetOf(spec.sheets[2]._name); assert.ok(/orientation="landscape"/.test(s)); assert.ok(/xSplit="1"/.test(s)); });

console.log("엑셀 — 수식");
t("합계 줄 =SUM, 미리 계산값 포함", function () { assert.ok(/<c r="B7" s="13"><f>SUM\(B5:B6\)<\/f><v>30<\/v><\/c>/.test(S1)); assert.ok(/<c r="A7" s="12"[^>]*>.*합계/.test(S1)); });
t("비율 =IF(B=0,0,C/B) — 줄마다·합계 줄", function () {
  assert.ok(/<c r="D5" s="8"><f>IF\(B5=0,0,C5\/B5\)<\/f><v>0\.4<\/v>/.test(S1));
  assert.ok(/<c r="D7" s="14"><f>IF\(B7=0,0,C7\/B7\)<\/f><v>0\.4<\/v>/.test(S1));
});
t("{키:sum} = 절대 범위 합", function () { assert.ok(/<f>IF\(SUM\(\$B\$5:\$B\$6\)=0,0,B5\/SUM\(\$B\$5:\$B\$6\)\)<\/f>/.test(S1)); });
t("증감 {키:prev}(첫 줄 0)·{키:first}", function () {
  var s = sheetOf("추세");
  assert.ok(/<c r="C5"[^>]*><f>B5-0<\/f>/.test(s) && /<c r="C6"[^>]*><f>B6-B5<\/f>/.test(s));
  assert.ok(/<f>B6\/\$B\$5<\/f>/.test(s)); assert.ok(!/합계/.test(s));
});
t("요약 시트 숫자 = 그 시트 합계칸 참조(고치면 따라 바뀜)", function () {
  var s = sheetOf("요약");
  assert.ok(/<f>'읍면별'!\$B\$7<\/f><v>30<\/v>/.test(s));
  assert.ok(/<f>IF\('읍면별'!\$B\$7=0,0,'읍면별'!\$C\$7\/'읍면별'!\$B\$7\)<\/f>/.test(s));
});

console.log("엑셀 — 출처·안전");
t("마지막 «데이터 출처» 시트: 구분·제공기관·데이터 이름·기준일, 가상 표기", function () {
  var s = sheetOf("데이터 출처");
  ["구분", "제공기관", "데이터 이름", "기준일", "공공데이터", "행정안전부", "2026-09", "가상"].forEach(function (k) { assert.ok(s.indexOf(k) >= 0, k); });
});
t("시트 아래 출처 줄 + 꼬리표", function () { assert.ok(/※ 출처: 행정안전부\(2026-09\)  \[가상·공공데이터\]/.test(S1)); });
t("글자 이스케이프(<·&) — 제목이 태그가 되지 않음", function () { var s = sheetOf("요약"); assert.ok(s.indexOf("시험 &lt;보고서&gt; &amp; 표") >= 0 && s.indexOf("<보고서>") < 0); });
t("본문형 시트: 장 제목·□○ 단계 들여쓰기 서식", function () { var s = sheetOf("본문"); assert.ok(/s="18"[^>]*>.*Ⅰ\. 개요/.test(s) && /s="19"/.test(s) && /s="20"/.test(s)); assert.ok(/indent="1"/.test(get(XF, "xl/styles.xml"))); });

console.log("한글(hwpx)");
var hdoc = { title: "시험 <문서>", made: "2026. 10. 30.", office: "시험팀", note: "※ 가상", blocks: [
  { t: "box", label: "한 줄 결론", text: "결론" }, { t: "ch", text: "Ⅰ. 개요" }, { t: "li", lv: 1, text: "목적" }, { t: "li", lv: 2, text: "설명" }, { t: "li", lv: 3, text: "세부" },
  { t: "tbl", title: "<표 1> 시험", unit: "(단위: 가구)", head: ["읍면", "명단", "접촉", "접촉률(%)"], rows: [["가", 10, 4, 40], ["나", 20, 8, 40]], foot: { label: "합계", sum: [1, 2], fx: { 3: "=C{r}/B{r}*100" }, val: { 3: 40 } }, src: "※ 출처" },
  { t: "p", kind: "end", text: "끝." }] };
var HF = unzip(W.build(hdoc)), SEC = get(HF, "Contents/section0.xml");
t("mimetype 가 첫 자리·무압축·application/hwp+zip", function () { assert.strictEqual(HF[0].name, "mimetype"); assert.strictEqual(HF[0].method, 0); assert.strictEqual(HF[0].text, "application/hwp+zip"); });
t("필수 부품(version·header·section0·content.hpf·container) + XML 짝 맞음", function () {
  ["version.xml", "Contents/header.xml", "Contents/section0.xml", "Contents/content.hpf", "META-INF/container.xml", "settings.xml"].forEach(function (n) { wellFormed(get(HF, n)); });
});
t("표 합계 칸 = 한글 표 계산식(FORMULA =SUM(B2:B3)) + 결과 30", function () {
  assert.ok(/<hp:fieldBegin id="\d+" type="FORMULA"[^>]*fieldid="627469685">.*?<hp:stringParam name="Command">=SUM\(B2:B3\);30<\/hp:stringParam>/.test(SEC));
  assert.ok(/=SUM\(C2:C3\);12/.test(SEC)); assert.ok(/=C4\/B4\*100;40/.test(SEC));
  assert.ok(/<\/hp:fieldBegin><\/hp:ctrl><hp:t>30<\/hp:t><hp:ctrl><hp:fieldEnd beginIDRef="\d+" fieldid="627469685"\/>/.test(SEC));
});
t("A4 세로·쪽 번호 중앙 하단 «- n -»", function () { assert.ok(/<hp:pagePr landscape="WIDELY" width="59528" height="84186"/.test(SEC)); assert.ok(/<hp:pageNum pos="BOTTOM_CENTER" formatType="DIGIT" sideChar="-"\/>/.test(SEC)); });
t("개조식 기호 □ ○ - 자동·단계별 문단 모양(들여쓰기 1자씩)", function () {
  assert.ok(/<hp:t>□ 목적<\/hp:t>/.test(SEC) && /<hp:t>○ 설명<\/hp:t>/.test(SEC) && /<hp:t>- 세부<\/hp:t>/.test(SEC));
  var hd = get(HF, "Contents/header.xml"); assert.ok(/<hh:paraPr id="4"[\s\S]*?<hc:left value="1300"/.test(hd)); assert.ok(/face="휴먼명조"/.test(hd) && /face="HY헤드라인M"/.test(hd));
});
t("머리행 반복(header=1)·이스케이프·«끝.»", function () { assert.ok(/<hp:tc name="" header="1"/.test(SEC)); assert.ok(SEC.indexOf("시험 &lt;문서&gt;") >= 0); assert.ok(/<hp:t>끝\.<\/hp:t>/.test(SEC)); });

console.log("S10j 보고서 → 엑셀·한글");
var now = new Date("2026-10-30T15:00:00");
var hh = HH.households.filter(function (h) { return ["함창읍", "공검면", "이안면", "사벌국면"].indexOf(h.area) >= 0; }).slice(0, 60), attempts = [];
hh.slice(0, 24).forEach(function (h, i) { attempts.push({ householdId: h.id, result: i % 4 === 0 ? "met" : i % 7 === 0 ? "not_eligible" : "no_answer", reason: i % 7 === 0 ? "income_over" : "", at: "2026-10-" + (20 + (i % 10)) + "T10:00:00" }); });
var input = { households: hh, areas: HH.areas, attempts: attempts, tips: [], now: now, links: [{ householdId: hh[0].id, area: hh[0].area, at: "2026-10-22T10:00:00", serviceIds: ["S01"], serviceNames: ["긴급복지 생계지원"] }],
  requests: [{ id: "REQ-1", region: "함창읍", status: "new", urgent: true, createdAt: "2026-10-29T09:00:00" }, { id: "REQ-2", region: "공검면", status: "done", createdAt: "2026-10-21T09:00:00", history: [{ status: "done", at: "2026-10-24T09:00:00" }] }] };
var S = F.report.aggregate(input), cd = F.report.countdown(F.report.currentRound(now), { now: now, done: S.households.closed, total: S.households.total });
var M = D.build("weekly", S, input, cd, {}), SP = D.xlsxSpec(M), HD = D.hwpxDoc(M);
t("엑셀 시트: 본문·읍면별·명단 처리·요청 단계·연계 서비스·접촉 추세", function () {
  assert.deepStrictEqual(SP.sheets.map(function (s) { return s.name; }).sort(), ["보고서 본문", "명단 처리", "요청 단계", "연계 서비스", "읍면별", "접촉 추세"].sort());
});
t("읍면별: 숫자는 숫자로, 접촉률은 수식 열, 합계 = 명단 가구 수", function () {
  var s = SP.sheets.filter(function (x) { return x.name === "읍면별"; })[0];
  s.rows.forEach(function (r) { assert.strictEqual(typeof r[1], "number"); assert.strictEqual(r[3], null); });
  assert.ok(/IF\(\{k1\}=0,0,\{k2\}\/\{k1\}\)/.test(s.columns[3].fx));
  assert.strictEqual(s.rows.reduce(function (a, r) { return a + r[1]; }, 0), S.households.total);
});
t("요약 숫자 «발굴 명단»은 읍면별 합계 참조, 접촉률은 수식", function () { assert.deepStrictEqual(SP.kpis[0].ref, { sheet: "읍면별", col: "k1" }); assert.ok(/\[읍면별:k2\]\/\[읍면별:k1\]/.test(SP.kpis[1].fx)); assert.strictEqual(SP.kpis[1].type, "pct"); });
t("데이터 출처: 가상·공공데이터·공개 자료 + 기관·기준일", function () {
  var k = SP.sources.map(function (s) { return s.kind; }); ["가상", "공공데이터", "공개 자료"].forEach(function (x) { assert.ok(k.indexOf(x) >= 0, x); });
  var pub = SP.sources.filter(function (s) { return s.kind === "공공데이터"; })[0]; assert.strictEqual(pub.org, "행정안전부"); assert.strictEqual(pub.date, "2026-09");
});
t("보고서 엑셀이 실제로 만들어지고 XML 짝 맞음(8시트)", function () { var f = unzip(X.build(SP)); f.forEach(function (x) { if (/\.xml$/.test(x.name)) wellFormed(x.text); }); assert.strictEqual(f.filter(function (x) { return /worksheets\/sheet\d+\.xml/.test(x.name); }).length, 8); });
t("한글: 표 1 합계 칸 계산식 =SUM·접촉률 =C/B*100, 그림 데이터도 합계 계산식", function () {
  var sec = get(unzip(W.build(HD)), "Contents/section0.xml"), tb = HD.blocks.filter(function (b) { return b.t === "tbl" && /<표 1>/.test(b.title); })[0];
  var n = tb.rows.length; assert.ok(sec.indexOf("=SUM(B2:B" + (n + 1) + ");" + S.households.total) >= 0); assert.ok(sec.indexOf("=C" + (n + 2) + "/B" + (n + 2) + "*100;") >= 0);
  assert.ok((sec.match(/type="FORMULA"/g) || []).length >= 6);
  assert.ok(/Ⅰ\. 개요/.test(sec) && /Ⅴ\. 향후 계획/.test(sec) && /<hp:t>끝\.<\/hp:t>/.test(sec));
});
t("엑셀·한글 내보내기에 가구 번호·요청 번호 없음(개인 식별값 0)", function () {
  var js = JSON.stringify(SP) + JSON.stringify(HD); assert.ok(js.indexOf(hh[0].id) < 0); assert.ok(js.indexOf("REQ-") < 0);
});
t("보고서 도구 막대에 «엑셀로»·«한글로» 단추(읽기 전용 보기에도)", function () {
  var src = require("fs").readFileSync(path.join(__dirname, "report_doc.js"), "utf8");
  assert.ok(/tb\("xlsx", "엑셀로"/.test(src) && /tb\("hwpx", "한글로"/.test(src)); assert.ok(/need\("xlsx\.js", "DaeumXlsx"\)/.test(src));
});
t("공무원 창구 옛 보고서 미리보기(makeReport) 제거", function () {
  var src = require("fs").readFileSync(path.join(__dirname, "..", "officer", "mount.js"), "utf8");
  assert.ok(!/function makeReport/.test(src) && !/lastReport/.test(src)); assert.ok(/function printReport/.test(src)); // 방문 전 카드 등 다른 인쇄는 그대로
});

console.log("결과: 통과 " + pass + " · 실패 " + fail);
if (fail) process.exit(1);
