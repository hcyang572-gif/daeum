/* 닿음 한글(.hwpx) 부품 — S10j-2(⚙️ 파로, 2026-10-30). 브라우저에서 한글 문서를 직접 만든다(OWPML XML + 무압축 ZIP, shared/xlsx.js 의 zip 사용).
   형식: 01_리서치/정부보고서_작성기준.md — 제목 상자·작성일/부서 오른쪽·□○-· 개조식(단계마다 1자 들여쓰기·내어쓰기)·<표 N>·※ 출처·쪽 번호 «- n -» 중앙 하단·A4 세로·«끝.»
   ⭐ 표 합계 칸 = 한글 «표 계산식»(필드 FORMULA, 예 =SUM(B2:B5)) — 한컴오피스 2024 가 같은 표에 계산식을 넣어 저장한 hwpx 를 풀어 본 구조 그대로다
     (fieldid 627469685 = "%fmu", Command 「=SUM(B1:B3);60」 = 식;마지막 결과). 셀 값을 고친 뒤 표 안에서 «계산식 새로 고침»을 하면 합계가 다시 계산된다.
   글꼴: 제목 HY헤드라인M · 본문 휴먼명조 · 표 맑은 고딕(한컴·윈도우 기본 글꼴 — 문서에 넣지 않고 이름만 지정).

   ── API ──
   DaeumHwpx.build(doc) → Uint8Array(.hwpx)      · node 에서도 동작(시험용)
   DaeumHwpx.download(doc, "이름.hwpx") → Promise · 브라우저 내려받기
   doc = { title, subtitle, made: "2026. 10. 30.", office, note,
     blocks: [ {t:"box", label:"한 줄 결론", text} | {t:"ch", text:"Ⅰ. 개요"} | {t:"li", lv:1..4, text}   // text 에 기호를 넣지 않는다(□○-· 자동)
             | {t:"p", text, kind:"note"|"src"|"end"} | {t:"break"}
             | {t:"tbl", title:"<표 1> …", unit:"(단위: …)", head:[…], rows:[[…]], align:"center"(선택), foot:{label:"합계", sum:[1,2], fx:{3:"=C{r}/B{r}*100"}}, src:"※ 출처: …", widths:[…]} ] }
   foot.sum = 합계(=SUM) 낼 열 번호, foot.fx = 그 밖의 식({r}=합계 줄 번호, 예 접촉률 =C7/B7*100). */
(function (root, factory) {
  var ns = factory(root);
  root.DaeumHwpx = ns;
  if (typeof module !== "undefined" && module.exports) module.exports = ns;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  var Z = root.DaeumXlsx || (typeof require !== "undefined" ? require("./xlsx.js") : null);
  var SYM = ["□", "○", "-", "·"];
  var NS = 'xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" xmlns:epub="http://www.idpf.org/2007/ops" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"';
  var XH = '<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>';
  function esc(s) { return String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ── 단위: 1pt = 100 HWPUNIT, 1mm ≈ 283.46 ──
  var PAGE = { w: 59528, h: 84186, l: 5669, r: 5669, t: 5669, b: 4252, head: 2835, foot: 2835 };
  var TW = PAGE.w - PAGE.l - PAGE.r; // 본문 폭 48190
  // 글꼴 id: 0 휴먼명조 · 1 HY헤드라인M · 2 맑은 고딕
  var FONTS = ["휴먼명조", "HY헤드라인M", "맑은 고딕"];
  // 글자 모양: [글꼴, 크기pt, 굵게, 색]
  var CP = { body: 0, title: 1, ch: 2, l1: 3, cell: 4, cellB: 5, note: 6, label: 7 };
  var CPS = [[0, 13, 0, "#000000"], [1, 20, 0, "#000000"], [1, 15, 0, "#000000"], [0, 13, 1, "#000000"], [2, 10, 0, "#000000"], [2, 10, 1, "#000000"], [0, 11, 0, "#333333"], [2, 11, 1, "#000000"]];
  // 문단 모양: [정렬, 왼쪽, 내어쓰기(음수 — 한글은 첫 줄을 왼쪽 여백에 두고 둘째 줄부터 그만큼 안으로), 위, 아래, 줄간격%, 다음과 함께]
  var PP = { body: 0, center: 1, right: 2, l1: 3, l2: 4, l3: 5, l4: 6, cellL: 7, cellR: 8, cellC: 9, ch: 10, note: 11, cap: 12 };
  var PPS = [["JUSTIFY", 0, 0, 0, 0, 160, 0], ["CENTER", 0, 0, 0, 0, 160, 0], ["RIGHT", 0, 0, 0, 0, 160, 0],
    ["JUSTIFY", 0, -1800, 1000, 0, 160, 0], ["JUSTIFY", 1300, -1800, 300, 0, 160, 0], ["JUSTIFY", 2600, -1000, 200, 0, 160, 0], ["JUSTIFY", 3900, -1000, 100, 0, 160, 0],
    ["LEFT", 0, 0, 0, 0, 130, 0], ["RIGHT", 0, 0, 0, 0, 130, 0], ["CENTER", 0, 0, 0, 0, 130, 0], ["LEFT", 0, 0, 1800, 600, 160, 1], ["LEFT", 0, 0, 200, 0, 130, 0], ["LEFT", 0, 0, 800, 150, 130, 1]];
  // 테두리/배경: 1 없음(쪽) · 2 없음(글자) · 3 표 칸 · 4 머리 칸(회색) · 5 합계 칸(옅은 회색, 위 굵은 선) · 6 제목 상자 · 7 결론 상자
  function bf(id, line, w, fill, top) {
    var s = function (n, t, ww) { return "<hh:" + n + ' type="' + t + '" width="' + ww + '" color="#000000"/>'; };
    var L = line ? "SOLID" : "NONE";
    return '<hh:borderFill id="' + id + '" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>' +
      s("leftBorder", L, w) + s("rightBorder", L, w) + s("topBorder", top ? "SOLID" : L, top || w) + s("bottomBorder", L, w) + '<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>' +
      (fill ? '<hc:fillBrush><hc:winBrush faceColor="' + fill + '" hatchColor="#999999" alpha="0"/></hc:fillBrush>' : "") + "</hh:borderFill>";
  }
  function header() {
    var langs = ["HANGUL", "LATIN", "HANJA", "JAPANESE", "OTHER", "SYMBOL", "USER"];
    var faces = langs.map(function (lg) { return '<hh:fontface lang="' + lg + '" fontCnt="' + FONTS.length + '">' + FONTS.map(function (f, i) { return '<hh:font id="' + i + '" face="' + f + '" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_' + (i === 0 ? "MYUNGJO" : "GOTHIC") + '" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>'; }).join("") + "</hh:fontface>"; }).join("");
    var bfs = [bf(1, 0, "0.1 mm"), bf(2, 0, "0.1 mm"), bf(3, 1, "0.12 mm"), bf(4, 1, "0.12 mm", "#E6E6E6"), bf(5, 1, "0.12 mm", "#F2F2F2", "0.4 mm"), bf(6, 1, "0.5 mm"), bf(7, 1, "0.12 mm", "#F2F2F2")];
    var seven = function (v) { return 'hangul="' + v + '" latin="' + v + '" hanja="' + v + '" japanese="' + v + '" other="' + v + '" symbol="' + v + '" user="' + v + '"'; };
    var cps = CPS.map(function (c, i) {
      return '<hh:charPr id="' + i + '" height="' + c[1] * 100 + '" textColor="' + c[3] + '" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2"><hh:fontRef ' + seven(c[0]) + '/><hh:ratio ' + seven(100) + '/><hh:spacing ' + seven(0) + '/><hh:relSz ' + seven(100) + '/><hh:offset ' + seven(0) + "/>" +
        (c[2] ? "<hh:bold/>" : "") + '<hh:underline type="NONE" shape="SOLID" color="#000000"/><hh:strikeout shape="NONE" color="#000000"/><hh:outline type="NONE"/><hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/></hh:charPr>';
    }).join("");
    var pps = PPS.map(function (p, i) {
      var m = '<hh:margin><hc:intent value="' + p[2] + '" unit="HWPUNIT"/><hc:left value="' + p[1] + '" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="' + p[3] + '" unit="HWPUNIT"/><hc:next value="' + p[4] + '" unit="HWPUNIT"/></hh:margin><hh:lineSpacing type="PERCENT" value="' + p[5] + '" unit="HWPUNIT"/>';
      return '<hh:paraPr id="' + i + '" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0" textDir="LTR"><hh:align horizontal="' + p[0] + '" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/>' +
        '<hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="KEEP_WORD" widowOrphan="1" keepWithNext="' + p[6] + '" keepLines="' + p[6] + '" pageBreakBefore="0" lineWrap="BREAK"/><hh:autoSpacing eAsianEng="0" eAsianNum="0"/>' +
        '<hp:switch><hp:case hp:required-namespace="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar">' + m + "</hp:case><hp:default>" + m + '</hp:default></hp:switch><hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/></hh:paraPr>';
    }).join("");
    return XH + "<hh:head " + NS + ' version="1.5" secCnt="1"><hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/><hh:refList>' +
      '<hh:fontfaces itemCnt="7">' + faces + "</hh:fontfaces>" +
      '<hh:borderFills itemCnt="' + bfs.length + '">' + bfs.join("") + "</hh:borderFills>" +
      '<hh:charProperties itemCnt="' + CPS.length + '">' + cps + "</hh:charProperties>" +
      '<hh:tabProperties itemCnt="1"><hh:tabPr id="0" autoTabLeft="0" autoTabRight="0"/></hh:tabProperties>' +
      '<hh:paraProperties itemCnt="' + PPS.length + '">' + pps + "</hh:paraProperties>" +
      '<hh:styles itemCnt="1"><hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0" nextStyleIDRef="0" langID="1042" lockForm="0"/></hh:styles>' +
      '</hh:refList><hh:compatibleDocument targetProgram="HWP201X"><hh:layoutCompatibility/></hh:compatibleDocument><hh:docOption><hh:linkinfo path="" pageInherit="0" footnoteInherit="0"/></hh:docOption><hh:trackchageConfig flags="56"/></hh:head>';
  }

  // ── 본문 ──
  var uid = 1000000;
  function nid() { return ++uid; }
  function run(cp, inner) { return '<hp:run charPrIDRef="' + cp + '">' + inner + "</hp:run>"; }
  function t(s) { return "<hp:t>" + esc(s) + "</hp:t>"; }
  function para(pp, runs, brk) { return '<hp:p id="0" paraPrIDRef="' + pp + '" styleIDRef="0" pageBreak="' + (brk ? 1 : 0) + '" columnBreak="0" merged="0">' + runs + "</hp:p>"; }
  function secPr() {
    var nf = function (place, len) { return '<hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="' + len + '" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="' + place + '" beneathText="0"/>'; };
    var pbf = function (ty) { return '<hp:pageBorderFill type="' + ty + '" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>'; };
    return '<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="0" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">' +
      '<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/><hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>' +
      '<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/><hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>' +
      '<hp:pagePr landscape="WIDELY" width="' + PAGE.w + '" height="' + PAGE.h + '" gutterType="LEFT_ONLY"><hp:margin header="' + PAGE.head + '" footer="' + PAGE.foot + '" gutter="0" left="' + PAGE.l + '" right="' + PAGE.r + '" top="' + PAGE.t + '" bottom="' + PAGE.b + '"/></hp:pagePr>' +
      "<hp:footNotePr>" + nf("EACH_COLUMN", -1) + "</hp:footNotePr><hp:endNotePr>" + nf("END_OF_DOCUMENT", 14692344) + "</hp:endNotePr>" + pbf("BOTH") + pbf("EVEN") + pbf("ODD") + "</hp:secPr>";
  }
  function tcell(c, r, w, h, bfId, inner, headRow, span) {
    return '<hp:tc name="" header="' + (headRow ? 1 : 0) + '" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="' + bfId + '"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">' + inner +
      '</hp:subList><hp:cellAddr colAddr="' + c + '" rowAddr="' + r + '"/><hp:cellSpan colSpan="' + (span || 1) + '" rowSpan="1"/><hp:cellSz width="' + w + '" height="' + h + '"/><hp:cellMargin left="510" right="510" top="141" bottom="141"/></hp:tc>';
  }
  function table(rows, opts) {
    // rows: [[{inner, w, bf, span}]] — 한 줄 칸 폭 합 = 표 폭
    var nr = rows.length, nc = opts.cols, H = opts.rowH || 1700, W = opts.width || TW;
    var body = rows.map(function (cells, r) { var c = 0; return "<hp:tr>" + cells.map(function (x) { var s = tcell(c, r, x.w, H, x.bf, x.inner, opts.headRows && r < opts.headRows, x.span); c += x.span || 1; return s; }).join("") + "</hp:tr>"; }).join("");
    return '<hp:tbl id="' + nid() + '" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="' + (opts.split ? "CELL" : "NONE") + '" repeatHeader="1" rowCnt="' + nr + '" colCnt="' + nc + '" cellSpacing="0" borderFillIDRef="3" noAdjust="0">' +
      '<hp:sz width="' + W + '" widthRelTo="ABSOLUTE" height="' + nr * H + '" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>' +
      '<hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="510" right="510" top="141" bottom="141"/>' + body + "</hp:tbl>";
  }
  function inTable(tbl, pp) { return para(pp == null ? PP.center : pp, run(CP.body, tbl + "<hp:t/>")); }
  function cellP(pp, cp, text) { return para(pp, run(cp, t(text))); }
  function formulaRun(cp, expr, val) {
    var id = nid(), cmd = expr + ";" + val;
    return run(cp, '<hp:ctrl><hp:fieldBegin id="' + id + '" type="FORMULA" name="" editable="0" dirty="0" zorder="-1" fieldid="627469685"><hp:parameters cnt="3" name=""><hp:integerParam name="Prop">8</hp:integerParam><hp:stringParam name="Command">' + esc(cmd) + '</hp:stringParam><hp:stringParam name="Formula">' + esc(cmd) + "</hp:stringParam></hp:parameters></hp:fieldBegin></hp:ctrl>" +
      t(val) + '<hp:ctrl><hp:fieldEnd beginIDRef="' + id + '" fieldid="627469685"/></hp:ctrl>');
  }
  function colName(i) { return String.fromCharCode(65 + i); }
  function num(v) { return typeof v === "number" ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : String(v == null ? "" : v); }
  function dataTable(b) {
    var nc = b.head.length, ws = b.widths || null;
    if (!ws) { var first = Math.round(TW * (nc > 4 ? 0.22 : 0.34)), rest = Math.floor((TW - first) / (nc - 1)); ws = [first]; for (var i = 1; i < nc; i++) ws.push(i === nc - 1 ? TW - first - rest * (nc - 2) : rest); }
    var rows = [b.head.map(function (h, i) { return { w: ws[i], bf: 4, inner: cellP(PP.cellC, CP.cellB, h) }; })];
    (b.rows || []).forEach(function (r) { rows.push(r.map(function (v, i) { return { w: ws[i], bf: 3, inner: cellP(b.align === "center" ? PP.cellC : i ? PP.cellR : PP.cellL, CP.cell, num(v)) }; })); });
    if (b.foot) {
      var R = rows.length + 1, f = b.foot, n = (b.rows || []).length; // 한글 표 주소: 열 A,B…, 줄 1부터(머리행 = 1)
      var sumOf = function (i) { return (b.rows || []).reduce(function (s, r) { return s + (typeof r[i] === "number" ? r[i] : 0); }, 0); };
      var vals = {};
      rows.push(b.head.map(function (_, i) {
        var inner;
        if (i === 0) inner = cellP(PP.cellC, CP.cellB, f.label || "합계");
        else if ((f.sum || []).indexOf(i) >= 0 && n) { vals[i] = sumOf(i); inner = para(PP.cellR, formulaRun(CP.cellB, "=SUM(" + colName(i) + "2:" + colName(i) + (n + 1) + ")", vals[i])); }
        else if (f.fx && f.fx[i]) {
          var ex = f.fx[i].replace(/\{r\}/g, R), v = f.val && f.val[i] != null ? f.val[i] : "";
          inner = para(PP.cellR, formulaRun(CP.cellB, ex, v));
        } else inner = cellP(PP.cellR, CP.cellB, "");
        return { w: ws[i], bf: 5, inner: inner };
      }));
    }
    var out = [];
    if (b.title) out.push(para(PP.cap, run(CP.label, t(b.title)) + (b.unit ? run(CP.note, t("  " + b.unit)) : "")));
    out.push(inTable(table(rows, { cols: nc, headRows: 1, split: true, rowH: 1500 })));
    if (b.src) out.push(para(PP.note, run(CP.note, t(b.src))));
    return out.join("");
  }
  function section(doc) {
    var P = [];
    // 첫 문단: 구역 설정 + 쪽 번호(중앙 하단 «- n -»)
    P.push(para(PP.center, run(CP.body, secPr() + '<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl><hp:ctrl><hp:pageNum pos="BOTTOM_CENTER" formatType="DIGIT" sideChar="-"/></hp:ctrl>') + run(CP.body, "<hp:t/>")));
    // 제목 상자
    P.push(inTable(table([[{ w: TW, bf: 6, inner: cellP(PP.center, CP.title, doc.title || "") + (doc.subtitle ? cellP(PP.center, CP.note, doc.subtitle) : "") }]], { cols: 1, rowH: 4200 })));
    P.push(para(PP.right, run(CP.note, t([doc.made, doc.office].filter(Boolean).join("  ")))));
    if (doc.note) P.push(para(PP.note, run(CP.note, t(doc.note))));
    (doc.blocks || []).forEach(function (b) {
      if (b.t === "ch") P.push(para(PP.ch, run(CP.ch, t(b.text))));
      else if (b.t === "li") { var lv = Math.max(1, Math.min(4, b.lv || 1)); P.push(para(PP["l" + lv], run(lv === 1 ? CP.l1 : CP.body, t(SYM[lv - 1] + " " + b.text)))); }
      else if (b.t === "p") P.push(para(b.kind === "end" ? PP.right : PP.note, run(b.kind === "end" ? CP.body : CP.note, t(b.text))));
      else if (b.t === "break") P.push(para(PP.body, run(CP.body, "<hp:t/>"), true));
      else if (b.t === "box") P.push(inTable(table([[{ w: Math.round(TW * 0.2), bf: 7, inner: cellP(PP.cellC, CP.label, b.label || "") }, { w: TW - Math.round(TW * 0.2), bf: 3, inner: cellP(PP.cellL, CP.body, b.text || "") }]], { cols: 2, rowH: 2600 })));
      else if (b.t === "tbl") P.push(dataTable(b));
    });
    return XH + "<hs:sec " + NS + ">" + P.join("") + "</hs:sec>";
  }
  function preview(doc) {
    var L = [doc.title || ""]; (doc.blocks || []).forEach(function (b) { if (b.text) L.push(b.text); });
    return L.join("\r\n").slice(0, 1000);
  }

  function build(doc) {
    doc = doc || {}; uid = 1000000;
    var now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    var files = [
      { name: "mimetype", data: "application/hwp+zip" },
      { name: "version.xml", data: XH + '<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="Hancom Office Hangul" appVersion="13, 0, 0, 3901 WIN32LEWindows_10"/>' },
      { name: "Contents/header.xml", data: header() },
      { name: "Contents/section0.xml", data: section(doc) },
      { name: "Preview/PrvText.txt", data: preview(doc) },
      { name: "settings.xml", data: XH + '<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"><ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/></ha:HWPApplicationSetting>' },
      { name: "META-INF/container.rdf", data: XH + '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/header.xml"/></rdf:Description><rdf:Description rdf:about="Contents/header.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#HeaderFile"/></rdf:Description><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/section0.xml"/></rdf:Description><rdf:Description rdf:about="Contents/section0.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#SectionFile"/></rdf:Description><rdf:Description rdf:about=""><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/></rdf:Description></rdf:RDF>' },
      { name: "Contents/content.hpf", data: XH + "<opf:package " + NS + ' version="" unique-identifier="" id=""><opf:metadata><opf:title>' + esc(doc.title || "") + '</opf:title><opf:language>ko</opf:language><opf:meta name="creator" content="text">닿음</opf:meta><opf:meta name="CreatedDate" content="text">' + now + '</opf:meta><opf:meta name="ModifiedDate" content="text">' + now + "</opf:meta></opf:metadata>" +
        '<opf:manifest><opf:item id="header" href="Contents/header.xml" media-type="application/xml"/><opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/><opf:item id="settings" href="settings.xml" media-type="application/xml"/></opf:manifest><opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>' },
      { name: "META-INF/container.xml", data: XH + '<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"><ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/><ocf:rootfile full-path="Preview/PrvText.txt" media-type="text/plain"/><ocf:rootfile full-path="META-INF/container.rdf" media-type="application/rdf+xml"/></ocf:rootfiles></ocf:container>' },
      { name: "META-INF/manifest.xml", data: XH + '<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>' }
    ];
    return Z.zip(files);
  }
  function download(doc, fileName) {
    try { return Z.save(build(doc), fileName || "닿음.hwpx", "application/hwp+zip"); } catch (e) { return Promise.reject(e); }
  }
  return { build: build, download: download, SYM: SYM, TW: TW };
});
