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
             | {t:"t2", title, sub, made} | {t:"sec", text} | {t:"ci", lv:2|3, text, fn:["!!빨강!!","**굵게**"]} | {t:"kpi2", items:[{k,v,u,s}]} | {t:"cap2", title, sub} | {t:"tbl2", head, al:["L","R"..], rows:[[…]], hl:[행번호], sum:[…], widths, grid:"ask"}   // S11-d4 C안(공문 정제형) 부품 — 칠한 칸 없음
             | {t:"img", data:Uint8Array, ext:"png"(기본·jpg·svg 시험), width:0~1(본문 폭 비율, 기본 1), title:"[그림 1] …", src:"※ 출처: …"}   // 그림 파일은 BinData/ 에 넣는다(S11-d4)
             | {t:"p", text, kind:"note"|"src"|"end"|"att"(붙임 줄 — 본문 글자)} | {t:"break"}
             | {t:"tbl", title:"<표 1> …", unit:"(단위: …)", head:[…], rows:[[…]], align:"center"(선택), foot:{label:"합계", sum:[1,2], fx:{3:"=C{r}/B{r}*100"}}, src:"※ 출처: …", widths:[…]} ] }
   foot.sum = 합계(=SUM) 낼 열 번호, foot.fx = 그 밖의 식({r}=합계 줄 번호, 예 접촉률 =C7/B7*100).
   79회차 ⓓ-뒷단(_design/docs78/SPEC.md) 신설 블록:
     {t:"sign", items:["담당","팀장","읍면동장"]}(결재란·오른쪽) · {t:"concl", text, label:"결론", tone:"warn"}(위·아래 굵은 선 결론 상자, 구형 box 도 이 모양)
     {t:"form", rows:[[항목,내용]] 또는 [[항목,내용,항목,내용]], title, widths}(입력 양식표 — 항목 칸 회색·가운데, 내용 칸 왼쪽, 쪼개지 않음)
     {t:"legend", items:[[이름,뜻]], colors:[["pine"|"mustard"|"red"|"grey", 뜻]]}(읽는 법 상자) · {t:"ci", mk:"1."|"☐"}(기호 바꿈) · {t:"t2", norule:true}
     {t:"p", kind:"tail"(꼬리 한 줄)|"big"(큰 글씨 한 줄)|"att2"(붙임 둘째 줄)} · 표(tbl·tbl2) 열 정렬은 al 이 없으면 자동(숫자 오른쪽·날짜·번호 가운데·글 왼쪽) */
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
  var CP = { body: 0, title: 1, ch: 2, l1: 3, cell: 4, cellB: 5, note: 6, label: 7, hdW: 8, titleW: 9, subL: 10, kpi: 11, kpiWarn: 12, kLab: 13, kSub: 14, say: 15, tag: 16, tiny: 17, headW: 18, leg0: 19, barL: 24, barV: 25, tagW: 26, legT: 27, sayL: 28 };
  // 색(S11 B 소나무빛 + 겨자 + 회색): 짙은 소나무 · 중간 · 옅은 · 겨자 · 회색  → 표 칸 배경 번호(bf)
  var PAL = [{ hex: "#17594F", bf: 8 }, { hex: "#4C8F85", bf: 15 }, { hex: "#9CC4BD", bf: 16 }, { hex: "#D9A441", bf: 14 }, { hex: "#B9C2BF", bf: 17 }];
  var CPS = [[0, 13, 0, "#000000"], [1, 20, 0, "#000000"], [1, 15, 0, "#000000"], [0, 13, 1, "#000000"], [2, 10, 0, "#000000"], [2, 10, 1, "#000000"], [0, 11, 0, "#333333"], [2, 11, 1, "#000000"],
    // 8 장 띠 흰 글 · 9 제목 흰 글 · 10 부제 · 11 숫자 카드 큰 글 · 12 경고색 큰 글 · 13 카드 라벨 · 14 카드 보조 · 15 한 줄 결론 · 16 결론 꼬리표 · 17 빈 칸(작게) · 18 머리 칸 흰 글 · 19~23 범례 ■(PAL 순) · 24 막대 라벨 · 25 막대 값 · 26 흰 꼬리표 · 27 범례 글 · 28 결론 상자 글
    [2, 14, 1, "#FFFFFF"], [1, 20, 0, "#FFFFFF"], [2, 10, 0, "#DDEBE8"], [2, 20, 1, "#17594F"], [2, 20, 1, "#8A5A0C"], [2, 9, 1, "#17594F"], [2, 9, 0, "#56635F"], [2, 11, 1, "#14211F"], [2, 9, 1, "#17594F"], [2, 6, 0, "#000000"], [2, 10, 1, "#FFFFFF"],
    [2, 10, 1, PAL[0].hex], [2, 10, 1, PAL[1].hex], [2, 10, 1, PAL[2].hex], [2, 10, 1, PAL[3].hex], [2, 10, 1, PAL[4].hex], [2, 10, 0, "#14211F"], [2, 10, 1, "#17594F"], [2, 10, 1, "#FFFFFF"], [2, 9, 0, "#333333"], [2, 12, 1, "#14211F"],
    // S11-d4 C안(공문 정제형) — 크기 4단 22·15·13·10. 29 제목 · 30 소제목 · 31 본문 굵게 · 32 본문 굵은 빨강 · 33 숫자 카드 큰 글 · 34 카드 라벨 · 35 작은 굵은 빨강 · 36 표 머리 · 37 표 칸 · 38 표 칸 빨강 · 39 표 합계 · 40 부제 · 41 카드 단위 · 42 그림 제목 · 43 본문 작은 회색 · 44 작은 굵은 초록
    [2, 22, 1, "#14211F"], [2, 15, 1, "#14211F"], [0, 13, 1, "#000000"], [0, 13, 1, "#B42318"], [2, 22, 1, "#2F5D50"], [2, 10, 0, "#333333"], [2, 10, 1, "#B42318"], [2, 10, 0, "#595959"], [2, 10, 0, "#000000"], [2, 10, 1, "#B42318"], [2, 10, 1, "#000000"], [2, 10, 0, "#595959"], [2, 13, 0, "#333333"], [2, 13, 1, "#14211F"], [0, 10, 0, "#595959"], [2, 10, 1, "#2F5D50"],
    // S12-d 40 큰 글씨(kpi2 big): 45 카드 머리말 18pt 굵게 · 46 카드 값 26pt 굵게
    [2, 18, 1, "#333333"], [2, 26, 1, "#2F5D50"],
    // 79회차 ⓓ-뒷단(SPEC docs78): 47 표 머리 굵게(먹색) · 48 꼬리 한 줄(회색 10pt)
    [2, 10, 1, "#14211F"], [2, 10, 0, "#595959"]];
  var C4 = { title: 29, sec: 30, bold: 31, red: 32, kBig: 33, kLab: 34, kRed: 35, th: 36, td: 37, tdRed: 38, tdSum: 39, sub: 40, kUnit: 41, cap: 42, small: 43, green: 44, bigLab: 45, bigVal: 46, thB: 47, tail: 48 };
  // 문단 모양: [정렬, 왼쪽, 내어쓰기(음수 — 한글은 첫 줄을 왼쪽 여백에 두고 둘째 줄부터 그만큼 안으로), 위, 아래, 줄간격%, 다음과 함께]
  var PP = { left0: 7, body: 0, center: 1, right: 2, l1: 3, l2: 4, l3: 5, l4: 6, cellL: 7, cellR: 8, cellC: 9, ch: 10, note: 11, cap: 12, tight: 13, legend: 14 };
  var PPS = [["JUSTIFY", 0, 0, 0, 0, 160, 0], ["CENTER", 0, 0, 0, 0, 160, 0], ["RIGHT", 0, 0, 0, 0, 160, 0],
    // 79회차 SPEC §1-1·1-2: 개조식 = 왼쪽 정렬(양쪽 정렬 금지) · 단계 들여쓰기 한 벌(□ 0/1800 · ○ 1300/1700 · - 2600/1300 · · 3700/1100) · □ 은 다음 문단과 함께
    ["LEFT", 0, -1800, 1000, 0, 160, 1], ["LEFT", 1300, -1700, 300, 0, 160, 0], ["LEFT", 2600, -1300, 200, 0, 160, 0], ["LEFT", 3700, -1100, 100, 0, 160, 0],
    ["LEFT", 0, 0, 0, 0, 130, 0], ["RIGHT", 0, 0, 0, 0, 130, 0], ["CENTER", 0, 0, 0, 0, 130, 0], ["LEFT", 0, 0, 1800, 600, 160, 1], ["LEFT", 0, 0, 400, 0, 130, 0], ["LEFT", 0, 0, 600, 200, 130, 1],
    ["CENTER", 0, 0, 0, 0, 100, 0], ["LEFT", 0, 0, 200, 0, 140, 0],
    // S11-d4: 15 ○ 줄 · 16 - 줄 · 17 □ 소제목 · 18 제목 · 19 그림 제목 · 20 부제
    ["LEFT", 1300, -1700, 200, 0, 145, 0], ["LEFT", 2600, -1300, 0, 0, 145, 0], ["LEFT", 0, 0, 1000, 300, 130, 1], ["CENTER", 0, 0, 0, 300, 130, 0], ["LEFT", 0, 0, 800, 100, 130, 1], ["CENTER", 0, 0, 0, 300, 130, 0],
    // S12-d 40 doc.compact(한 쪽 맞춤 선택): 21 장 제목 · 22 □ 줄 — 위 간격·줄간격만 줄임
    ["LEFT", 0, 0, 600, 250, 150, 1], ["LEFT", 0, -1800, 200, 0, 145, 1],
    // 79회차: 23 기관·날짜줄(선 밑 4pt 띄움) · 24 꼬리 한 줄 · 25 붙임 둘째 줄(«붙임» 글자 폭만큼 안으로)
    ["RIGHT", 0, 0, 400, 300, 130, 0], ["LEFT", 0, 0, 400, 0, 130, 0], ["LEFT", 2600, 0, 0, 0, 160, 0]];
  var P4 = { o: 15, d: 16, sec: 17, title: 18, cap: 19, sub: 20, made: 23, tail: 24, att2: 25 };
  var PC = { ch: 21, l1: 22 }; // doc.compact 전용
  var COMPACT = false;     // section() 동안만 켜진다
  // 테두리/배경: 1 없음(쪽) · 2 없음(글자) · 3 표 칸 · 4 머리 칸(회색) · 5 합계 칸(옅은 회색, 위 굵은 선) · 6 제목 상자 · 7 결론 상자
  function bf(id, line, w, fill, top) {
    var s = function (n, t, ww) { return "<hh:" + n + ' type="' + t + '" width="' + ww + '" color="#000000"/>'; };
    var L = line ? "SOLID" : "NONE";
    return '<hh:borderFill id="' + id + '" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>' +
      s("leftBorder", L, w) + s("rightBorder", L, w) + s("topBorder", top ? "SOLID" : L, top || w) + s("bottomBorder", L, w) + '<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>' +
      (fill ? '<hc:fillBrush><hc:winBrush faceColor="' + fill + '" hatchColor="#999999" alpha="0"/></hc:fillBrush>' : "") + "</hh:borderFill>";
  }
  // 변별 테두리: sides = {l,r,t,b: [굵기, 색] | null}
  function bfx(id, sd, fill) {
    var one = function (n, v) { return "<hh:" + n + ' type="' + (v ? "SOLID" : "NONE") + '" width="' + (v ? v[0] : "0.1 mm") + '" color="' + (v ? v[1] : "#000000") + '"/>'; };
    return '<hh:borderFill id="' + id + '" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>' +
      one("leftBorder", sd.l) + one("rightBorder", sd.r) + one("topBorder", sd.t) + one("bottomBorder", sd.b) + '<hh:diagonal type="SOLID" width="0.1 mm" color="#000000"/>' +
      (fill ? '<hc:fillBrush><hc:winBrush faceColor="' + fill + '" hatchColor="#999999" alpha="0"/></hc:fillBrush>' : "") + "</hh:borderFill>";
  }
  var WH = ["0.8 mm", "#FFFFFF"], GR = ["0.12 mm", "#B8C4BF"];
  function moreBf() {
    var tile = { l: WH, r: WH, t: null, b: null }, none = { l: null, r: null, t: null, b: null }, grid = { l: GR, r: GR, t: GR, b: GR };
    return [bfx(8, tile, "#17594F"), bfx(9, none, "#E3EEEB"), bfx(10, grid, "#FFFFFF"), bfx(11, grid, "#F3F7F5"), bfx(12, { l: GR, r: GR, t: GR, b: GR }, "#17594F"),
      bfx(13, { l: GR, r: GR, t: ["0.4 mm", "#17594F"], b: GR }, "#DCEAE6"), bfx(14, tile, "#D9A441"), bfx(15, none, "#4C8F85"), bfx(16, none, "#9CC4BD"), bfx(17, none, "#B9C2BF"),
      bfx(18, none, "#EEF2F0"), bfx(19, none, "#F8EFDB"), bfx(20, tile, "#EEF4F2"), bfx(21, { l: ["1.0 mm", "#17594F"], r: null, t: null, b: null }, "#E3EEEB"), bfx(22, { l: ["1.0 mm", "#D9A441"], r: null, t: null, b: null }, "#F8EFDB"),
      // S11-d4 C안 — 배경 칠 없음: 23 위선(굵게) · 24 카드 칸(위·아래 굵은 선) · 25 카드 가운데 칸(+옅은 세로선) · 26 표 머리(아래 굵은 선) · 27 표 줄(아래 옅은 선) · 28 표 합계 줄(없음) · 29 결정 표 머리(위·아래 굵은 선)
      bfx(23, { l: null, r: null, t: ["0.4 mm", "#14211F"], b: null }), bfx(24, { l: null, r: null, t: ["0.4 mm", "#14211F"], b: ["0.4 mm", "#14211F"] }),
      bfx(25, { l: ["0.12 mm", "#B8C4BF"], r: ["0.12 mm", "#B8C4BF"], t: ["0.4 mm", "#14211F"], b: ["0.4 mm", "#14211F"] }), bfx(26, { l: null, r: null, t: null, b: ["0.4 mm", "#14211F"] }),
      bfx(27, { l: null, r: null, t: null, b: ["0.12 mm", "#B8C4BF"] }), bfx(28, { l: null, r: null, t: null, b: null }), bfx(29, { l: null, r: null, t: ["0.4 mm", "#14211F"], b: ["0.4 mm", "#14211F"] }),
      // 79회차 SPEC §2: 30 양식표 항목 칸(가는 격자 + 옅은 회색 #EEF2F0)
      bfx(30, grid, "#EEF2F0")];
  }
  function header() {
    var langs = ["HANGUL", "LATIN", "HANJA", "JAPANESE", "OTHER", "SYMBOL", "USER"];
    var faces = langs.map(function (lg) { return '<hh:fontface lang="' + lg + '" fontCnt="' + FONTS.length + '">' + FONTS.map(function (f, i) { return '<hh:font id="' + i + '" face="' + f + '" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_' + (i === 0 ? "MYUNGJO" : "GOTHIC") + '" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font>'; }).join("") + "</hh:fontface>"; }).join("");
    var bfs = [bf(1, 0, "0.1 mm"), bf(2, 0, "0.1 mm"), bf(3, 1, "0.12 mm"), bf(4, 1, "0.12 mm", "#E6E6E6"), bf(5, 1, "0.12 mm", "#F2F2F2", "0.4 mm"), bf(6, 1, "0.5 mm"), bf(7, 1, "0.12 mm", "#F2F2F2")].concat(moreBf());
    var seven = function (v) { return 'hangul="' + v + '" latin="' + v + '" hanja="' + v + '" japanese="' + v + '" other="' + v + '" symbol="' + v + '" user="' + v + '"'; };
    var cps = CPS.map(function (c, i) {
      return '<hh:charPr id="' + i + '" height="' + c[1] * 100 + '" textColor="' + c[3] + '" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2"><hh:fontRef ' + seven(c[0]) + '/><hh:ratio ' + seven(100) + '/><hh:spacing ' + seven(0) + '/><hh:relSz ' + seven(100) + '/><hh:offset ' + seven(0) + "/>" +
        (c[2] ? "<hh:bold/>" : "") + '<hh:underline type="NONE" shape="SOLID" color="#000000"/><hh:strikeout shape="NONE" color="#000000"/><hh:outline type="NONE"/><hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/></hh:charPr>';
    }).join("");
    var pps = PPS.map(function (p, i) {
      var m = '<hh:margin><hc:intent value="' + p[2] + '" unit="HWPUNIT"/><hc:left value="' + p[1] + '" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="' + p[3] + '" unit="HWPUNIT"/><hc:next value="' + p[4] + '" unit="HWPUNIT"/></hh:margin><hh:lineSpacing type="PERCENT" value="' + p[5] + '" unit="HWPUNIT"/>';
      return '<hh:paraPr id="' + i + '" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0" textDir="LTR"><hh:align horizontal="' + p[0] + '" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/>' +
        // 한글 «어절» 줄 나눔 = breakNonLatinWord="BREAK_WORD"(한컴 바탕글과 같음). KEEP_WORD 는 «글자» 단위라 «확/인»이 갈라졌다(S10j-2 실측)
        '<hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="1" keepWithNext="' + p[6] + '" keepLines="' + p[6] + '" pageBreakBefore="0" lineWrap="BREAK"/><hh:autoSpacing eAsianEng="0" eAsianNum="0"/>' +
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
  function secPr(plain) {
    var mt = PAGE.t, mb = PAGE.b; // 79회차 SPEC §1: C안·compact 도 같은 쪽 여백(위 20·아래 15·좌우 20mm)
    var nf = function (place, len) { return '<hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="' + len + '" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="' + place + '" beneathText="0"/>'; };
    var pbf = function (ty) { return '<hp:pageBorderFill type="' + ty + '" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill>'; };
    return '<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="0" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0">' +
      '<hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/><hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>' +
      '<hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/><hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/>' +
      '<hp:pagePr landscape="WIDELY" width="' + PAGE.w + '" height="' + PAGE.h + '" gutterType="LEFT_ONLY"><hp:margin header="' + PAGE.head + '" footer="' + PAGE.foot + '" gutter="0" left="' + PAGE.l + '" right="' + PAGE.r + '" top="' + mt + '" bottom="' + mb + '"/></hp:pagePr>' +
      "<hp:footNotePr>" + nf("EACH_COLUMN", -1) + "</hp:footNotePr><hp:endNotePr>" + nf("END_OF_DOCUMENT", 14692344) + "</hp:endNotePr>" + pbf("BOTH") + pbf("EVEN") + pbf("ODD") + "</hp:secPr>";
  }
  function tcell(c, r, w, h, bfId, inner, headRow, span, mg) {
    mg = mg || [567, 567, 283, 283]; // 79회차 SPEC §2: 좌우 2.0mm · 상하 1.0mm
    return '<hp:tc name="" header="' + (headRow ? 1 : 0) + '" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="' + bfId + '"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">' + inner +
      '</hp:subList><hp:cellAddr colAddr="' + c + '" rowAddr="' + r + '"/><hp:cellSpan colSpan="' + (span || 1) + '" rowSpan="1"/><hp:cellSz width="' + w + '" height="' + h + '"/><hp:cellMargin left="' + mg[0] + '" right="' + mg[1] + '" top="' + mg[2] + '" bottom="' + mg[3] + '"/></hp:tc>';
  }
  function table(rows, opts) {
    // rows: [[{inner, w, bf, span}]] — 한 줄 칸 폭 합 = 표 폭
    var nr = rows.length, nc = opts.cols, H = opts.rowH || 1984, W = opts.width || TW, hH = opts.headH || H;
    var hOf = function (r) { return (opts.rowHs && opts.rowHs[r]) || (opts.headRows && r < opts.headRows ? hH : H); };
    var body = rows.map(function (cells, r) { var c = 0; return "<hp:tr>" + cells.map(function (x) { var s = tcell(c, r, x.w, hOf(r), x.bf, x.inner, opts.headRows && r < opts.headRows, x.span, x.mg); c += x.span || 1; return s; }).join("") + "</hp:tr>"; }).join("");
    return '<hp:tbl id="' + nid() + '" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="' + (opts.split ? "CELL" : "NONE") + '" repeatHeader="1" rowCnt="' + nr + '" colCnt="' + nc + '" cellSpacing="0" borderFillIDRef="3" noAdjust="0">' +
      '<hp:sz width="' + W + '" widthRelTo="ABSOLUTE" height="' + rows.reduce(function (a, _, r) { return a + hOf(r); }, 0) + '" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>' +
      '<hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="567" right="567" top="283" bottom="283"/>' + body + "</hp:tbl>";
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
  /** 79회차 SPEC §2 열별 정렬 자동 판정 — 숫자·금액·% = 오른쪽 · 날짜·시각·가구 번호 = 가운데 · 나머지(글) = 왼쪽. 한 열 안에서 섞이면 글이 하나라도 있으면 왼쪽 */
  function alOne(v) {
    var s = String(v == null ? "" : v).split("\n")[0].replace(/\*\*|!!/g, "").trim();
    if (!s || /^[—–-]$/.test(s)) return null;
    if (/^[+\-−±]?[\d,.]+%?$/.test(s)) return "R";
    if (/^\d{1,4}[.\- ]+\d/.test(s) || /^[A-Z]{1,2}-\d+/.test(s) || /^\d{1,2}:\d{2}/.test(s) || /^\d+차$/.test(s)) return "C";
    return "L";
  }
  function autoAl(rows, nc) {
    var out = [];
    for (var i = 0; i < nc; i++) {
      var k = {}; (rows || []).forEach(function (r) { var a = alOne(r[i]); if (a) k[a] = 1; });
      out.push(k.L || (!k.R && !k.C) ? "L" : k.C ? "C" : "R");
    }
    return out;
  }
  function dataTable(b) {
    var nc = b.head.length, ws = b.widths || null;
    if (!ws) { var first = Math.round(TW * (nc > 4 ? 0.22 : 0.3)), rest = Math.floor((TW - first) / (nc - 1)); ws = [first]; for (var i = 1; i < nc; i++) ws.push(i === nc - 1 ? TW - first - rest * (nc - 2) : rest); }
    // 79회차 SPEC §2: 소나무 채움 머리 폐기 → 머리 가운데·굵게·아래 굵은 선, 줄마다 옅은 선, 열 정렬 자동
    var al = b.align === "center" ? b.head.map(function () { return "C"; }) : (b.al || autoAl(b.rows, nc)), ppA = function (a) { return a === "R" ? PP.cellR : a === "C" ? PP.cellC : PP.cellL; };
    var rows = [b.head.map(function (h, i) { return { w: ws[i], bf: 26, inner: cellP(PP.cellC, C4.thB, h) }; })];
    (b.rows || []).forEach(function (r) { rows.push(r.map(function (v, i) { return { w: ws[i], bf: 27, inner: cellP(ppA(al[i]), CP.cell, num(v)) }; })); });
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
        return { w: ws[i], bf: 23, inner: inner };
      }));
    }
    var out = [];
    if (b.title) out.push(para(PP.cap, run(C4.thB, t(b.title)) + (b.unit ? run(C4.tail, t("  " + b.unit)) : "")));
    out.push(inTable(table(rows, { cols: nc, headRows: 1, split: !b.keep, rowH: COMPACT ? 1700 : 1984, headH: COMPACT ? 1800 : 2126 })));
    if (b.src) out.push(para(PP.note, run(C4.tail, t(b.src))));
    out.push(spacer());
    return out.join("");
  }

  // ═══ S11-d3 그림 부품 — 표 칸 색으로 그린다(그림 파일 없이도 한글에서 열리고 고칠 수 있음) ═══
  var SLOTS = 20;
  function spacer() { return para(PP.tight, run(CP.tiny, "<hp:t/>")); }
  function emptyP() { return para(PP.tight, run(CP.tiny, "<hp:t/>")); }
  var Z4 = [0, 0, 0, 0];
  /** 장 띠: 왼쪽 소나무 칸(장 번호·이름) + 오른쪽 «이 파트의 한 줄 결론» */
  function chapterBand(b) {
    var wl = Math.round(TW * 0.27), warn = b.tone === "warn";
    var right = para(PP.cellL, run(CP.tag, t("이 파트의 한 줄 결론"))) + para(PP.cellL, run(CP.say, t(b.say || "")));
    return para(PP.tight, run(CP.tiny, "<hp:t/>")) + inTable(table([[{ w: wl, bf: 8, mg: [700, 300, 141, 141], inner: cellP(PP.cellL, CP.hdW, b.text) }, { w: TW - wl, bf: warn ? 22 : 21, mg: [800, 500, 141, 141], inner: right }]], { cols: 2, rowH: 2500 })) + spacer();
  }
  /** 숫자 카드 한 줄 */
  function kpiRow(b) {
    var it = b.items, n = it.length, w = Math.floor(TW / n), ws = it.map(function (_, i) { return i === n - 1 ? TW - w * (n - 1) : w; });
    var r1 = it.map(function (k, i) { return { w: ws[i], bf: k.tone === "warn" ? 14 : 8, inner: cellP(PP.cellC, CP.tagW, k.k) }; });
    var r2 = it.map(function (k, i) { return { w: ws[i], bf: 20, inner: para(PP.cellC, run(k.tone === "warn" ? CP.kpiWarn : CP.kpi, t(k.v)) + (k.u ? run(CP.kSub, t(" " + k.u)) : "")) }; });
    var r3 = it.map(function (k, i) { return { w: ws[i], bf: 20, inner: cellP(PP.cellC, CP.kSub, k.s || "") }; });
    return inTable(table([r1, r2, r3], { cols: n, rowHs: [1500, 2600, 1700] })) + spacer();
  }
  /** 가로 막대(표 칸 색): items [{label, done, total?, text, tone}], max → 눈금 20칸 */
  function barsFig(b) {
    var it = b.items, S = SLOTS, max = b.max || Math.max.apply(null, it.map(function (x) { return x.total != null ? x.total : x.done; }).concat([1]));
    var wl = b.wl || 8400, wv = b.wv || 8200, bw = TW - wl - wv, u = Math.floor(bw / S), rows = [], widthOf = function (k, from) { var x = 0; for (var i = 0; i < k; i++) x += (from + i === S - 1) ? bw - u * (S - 1) : u; return x; };
    var out = [];
    if (b.title) out.push(para(PP.cap, run(CP.label, t(b.title))));
    it.forEach(function (x) {
      var f = x.done > 0 ? Math.max(1, Math.round(x.done / max * S)) : 0, tt = x.total != null ? Math.max(f, Math.round(x.total / max * S)) : f;
      f = Math.min(f, S); tt = Math.min(tt, S);
      var cells = [{ w: wl, bf: 2, mg: [0, 300, 0, 0], inner: cellP(PP.cellL, CP.barL, x.label) }], pos = 0;
      function seg(k, bfId) { if (k <= 0) return; cells.push({ w: widthOf(k, pos), bf: bfId, span: k, mg: Z4, inner: emptyP() }); pos += k; }
      seg(f, x.tone === "warn" ? 14 : x.tone === "grey" ? 17 : 8); seg(tt - f, x.tone === "warn" ? 19 : 16); seg(S - tt, 18);
      cells.push({ w: wv, bf: 2, mg: [300, 0, 0, 0], inner: cellP(PP.cellL, CP.barV, x.text || "") });
      rows.push(cells);
    });
    // 칸 번호가 줄마다 달라지지 않도록 모든 줄을 «라벨 + 20칸 + 값» 격자에 맞춘다(병합 칸 사용)
    out.push(inTable(table(rows, { cols: S + 2, rowH: 1600 })));
    if (b.src) out.push(para(PP.note, run(CP.note, t(b.src))));
    out.push(spacer());
    return out.join("");
  }
  /** 구성비 띠 한 줄 + 범례(■ 색 글자) */
  function stackFig(b) {
    var it = b.items, tot = it.reduce(function (s, x) { return s + x.n; }, 0) || 1, S = SLOTS, u = Math.floor(TW / S), out = [];
    // 가장 큰 나머지 방식으로 20칸 배분(0보다 크면 최소 1칸)
    var raw = it.map(function (x) { return x.n / tot * S; }), k = raw.map(function (r, i) { return it[i].n > 0 ? Math.max(1, Math.floor(r)) : 0; }), used = k.reduce(function (a, c) { return a + c; }, 0);
    while (used < S) { var bi = -1, bv = -1; raw.forEach(function (r, i) { if (it[i].n > 0 && r - k[i] > bv) { bv = r - k[i]; bi = i; } }); if (bi < 0) break; k[bi]++; used++; }
    while (used > S) { var mi = k.indexOf(Math.max.apply(null, k)); k[mi]--; used--; }
    var cells = [], pos = 0;
    k.forEach(function (c, i) { if (!c) return; var wd = 0; for (var j = 0; j < c; j++) wd += (pos + j === S - 1) ? TW - u * (S - 1) : u; cells.push({ w: wd, bf: PAL[(it[i].c || (i + 1)) - 1 > 4 ? 4 : (it[i].c || (i + 1)) - 1].bf, span: c, mg: Z4, inner: emptyP() }); pos += c; });
    if (b.title) out.push(para(PP.cap, run(CP.label, t(b.title))));
    out.push(inTable(table([cells], { cols: S, rowH: 2000 })));
    var leg = it.map(function (x, i) { var ci = Math.min(4, (x.c || (i + 1)) - 1); return run(CP.leg0 + ci, t("■ ")) + run(CP.legT, t(x.label + " " + num(x.n) + (b.unit || "") + "(" + Math.round(x.n / tot * 100) + "%)    ")); }).join("");
    out.push(para(PP.legend, leg));
    if (b.src) out.push(para(PP.note, run(CP.note, t(b.src))));
    out.push(spacer());
    return out.join("");
  }
  // ═══ S11-d4 그림 파일(PNG·JPG) 삽입 — BinData/imageN.* + <hp:pic>. 크기는 PNG IHDR 에서 읽어 가로 비율만 지정하면 높이가 따라온다 ═══
  var imgs = [];
  function pngSize(d) { return d && d.length > 24 && d[1] === 0x50 ? { w: ((d[16] << 24) | (d[17] << 16) | (d[18] << 8) | d[19]) >>> 0, h: ((d[20] << 24) | (d[21] << 16) | (d[22] << 8) | d[23]) >>> 0 } : null; }
  function imgFig(b) {
    var ext = (b.ext || "png").toLowerCase(), no = imgs.length + 1, id = "image" + no, sz = pngSize(b.data) || b.size || { w: 4, h: 3 };
    var W = Math.round(TW * (b.width || 1)), H = Math.round(W * sz.h / sz.w), out = [], zz = function (n) { return '<hc:' + n + ' e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/>'; };
    imgs.push({ id: id, name: "BinData/" + id + "." + ext, data: b.data, mime: ext === "svg" ? "image/svg+xml" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/" + ext });
    var pic = '<hp:pic id="' + nid() + '" zOrder="0" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" href="" groupLevel="0" instid="' + nid() + '" reverse="0">' +
      '<hp:offset x="0" y="0"/><hp:orgSz width="' + W + '" height="' + H + '"/><hp:curSz width="' + W + '" height="' + H + '"/><hp:flip horizontal="0" vertical="0"/><hp:rotationInfo angle="0" centerX="' + (W >> 1) + '" centerY="' + (H >> 1) + '" rotateimage="1"/>' +
      '<hp:renderingInfo>' + zz("transMatrix") + zz("scaMatrix") + zz("rotMatrix") + '</hp:renderingInfo>' +
      '<hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="' + W + '" y="0"/><hc:pt2 x="' + W + '" y="' + H + '"/><hc:pt3 x="0" y="' + H + '"/></hp:imgRect><hp:imgClip left="0" right="' + W + '" top="0" bottom="' + H + '"/><hp:inMargin left="0" right="0" top="0" bottom="0"/><hp:imgDim dimwidth="' + W + '" dimheight="' + H + '"/>' +
      '<hc:img binaryItemIDRef="' + id + '" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/><hp:effects/>' +
      '<hp:sz width="' + W + '" widthRelTo="ABSOLUTE" height="' + H + '" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:shapeComment>' + esc(b.alt || "") + '</hp:shapeComment></hp:pic>';
    if (b.title) out.push(para(PP.cap, run(CP.label, t(b.title))));
    out.push(para(PP.center, run(CP.body, pic + "<hp:t/>")));
    if (b.src) out.push(para(PP.note, run(CP.note, t(b.src))));
    out.push(spacer());
    return out.join("");
  }
  // ═══ S11-d4 C안(공문 정제형) 부품 — 칠한 칸 없이 선·글자만. 글 속 !!빨강!! **굵게** 표시를 글자 모양으로 바꾼다 ═══
  function rich(text, base, bold, red) {
    var out = "", re = /(!!.+?!!|\*\*.+?\*\*)/g, parts = String(text == null ? "" : text).split(re);
    parts.forEach(function (p) { if (!p) return; if (/^!!.+!!$/.test(p)) out += run(red, t(p.slice(2, -2))); else if (/^\*\*.+\*\*$/.test(p)) out += run(bold, t(p.slice(2, -2))); else out += run(base, t(p)); });
    return out || run(base, "<hp:t/>");
  }
  function rule() { return inTable(table([[{ w: TW, bf: 23, mg: [0, 0, 0, 0], inner: emptyP() }]], { cols: 1, rowH: 100 })); }
  function titleBlock(b) { // 79회차: 선 밑 4pt 띄우고 기관·날짜줄(맑은 고딕 10pt 회색). b.norule = 선 없음(큰 글씨 안내문 — 카드 선과 두 겹 방지)
    return para(P4.title, run(C4.title, t(b.title))) + (b.sub ? para(P4.sub, run(C4.sub, t(b.sub))) : "") + (b.norule ? "" : rule()) + (b.made ? para(P4.made, run(C4.tail, t(b.made))) : "");
  }
  /** 79회차 SPEC §3-2 결재란 — 오른쪽 위 3칸(담당/팀장/읍면동장), 윗줄 직위 7mm·아랫줄 서명 14mm, 칸 20mm */
  function signBlock(b) {
    var it = b.items || ["담당", "팀장", "읍면동장"], cw = 5669, lw = TW - cw * it.length;
    var r1 = it.map(function (k) { return { w: cw, bf: 30, mg: [100, 100, 100, 100], inner: cellP(PP.cellC, CP.cellB, k) }; });
    var r2 = it.map(function () { return { w: cw, bf: 10, mg: [100, 100, 100, 100], inner: cellP(PP.cellC, CP.cell, "") }; });
    if (b.made) { // 79회차: 결재란 왼쪽 빈 칸 = 기관·날짜줄(제목 선 아래 한 줄을 따로 쓰지 않아 1쪽에 맞춤)
      r1.unshift({ w: lw, bf: 2, mg: [0, 600, 0, 0], inner: cellP(PP.cellL, C4.tail, "") });
      r2.unshift({ w: lw, bf: 2, mg: [0, 600, 0, 0], inner: cellP(PP.cellL, C4.tail, b.made) });
      return para(PP.tight, run(CP.tiny, "<hp:t/>")) + inTable(table([r1, r2], { cols: it.length + 1, width: TW, rowHs: [1984, 3969] }), PP.left0) + spacer();
    }
    return inTable(table([r1, r2], { cols: it.length, width: cw * it.length, rowHs: [1984, 3969] }), PP.right) + spacer();
  }
  /** 79회차 SPEC §3-3 한 줄 결론 상자 — 칠 없이 위·아래 굵은 선, 왼쪽 «결론» 소나무 10pt 굵게, 오른쪽 13pt 굵게 */
  function conclBlock(b) {
    var wl = 6400, warn = b.tone === "warn";
    return inTable(table([[{ w: wl, bf: 24, mg: [400, 200, 300, 300], inner: cellP(PP.cellL, warn ? C4.kRed : CP.barV, b.label || "결론") },
      { w: TW - wl, bf: 24, mg: [300, 300, 300, 300], inner: para(PP.cellL, rich(b.text || "", C4.cap, C4.cap, C4.red)) }]], { cols: 2, rowH: 2400 })) + spacer();
  }
  /** 79회차 SPEC §2 입력 양식표 — 항목 칸 가운데·굵게·옅은 회색, 내용 칸 왼쪽, 가는 격자, 쪼개지 않음.
      rows: [[항목, 내용]] 또는 4열 [[항목, 내용, 항목, 내용]](짝수 칸 = 항목). 4열 표 안 2칸 줄은 내용이 나머지를 합친다. 내용 «\n» = 칸 안 줄바꿈 */
  function formBlock(b) {
    var four = (b.rows || []).some(function (r) { return r.length > 2; }), out = [];
    var ws = b.widths || (four ? [8200, 15895, 8200, 15895] : [10600, TW - 10600]), nc = ws.length;
    var rows = (b.rows || []).map(function (r) {
      var cells = [], c = 0;
      for (var i = 0; i < r.length; i += 2) {
        var last = i + 2 >= r.length, span = last ? nc - c - 1 : 1, wv = 0; for (var j = c + 1; j < c + 1 + span; j++) wv += ws[j];
        cells.push({ w: ws[c], bf: 30, inner: cellP(PP.cellC, CP.cellB, r[i]) });
        var vv = String(r[i + 1] == null ? "" : r[i + 1]).split("\n");
        cells.push({ w: wv, bf: 10, span: span, inner: vv.map(function (x) { return para(PP.cellL, rich(x, CP.cell, CP.cellB, C4.tdRed)); }).join("") });
        c += 1 + span;
      }
      return cells;
    });
    if (b.title) out.push(para(PP.cap, run(C4.thB, t(b.title)) + (b.unit ? run(C4.tail, t("  " + b.unit)) : "")));
    out.push(inTable(table(rows, { cols: nc, rowH: b.rowH || 2268 })));
    if (b.src) out.push(para(PP.note, run(C4.tail, t(b.src))));
    if (!b.nospace) out.push(spacer());
    return out.join("");
  }
  /** 79회차 확인 목록 — ☐ 항목을 선 없는 2열 표로(8줄 → 4줄). items: [글] */
  function chkBlock(b) {
    var it = b.items || [], n = b.cols || 2, cw = Math.floor(TW / n), rows = [];
    for (var i = 0; i < it.length; i += n) { var r = []; for (var j = 0; j < n; j++) r.push({ w: j === n - 1 ? TW - cw * (n - 1) : cw, bf: 2, mg: [1300, 300, 100, 100], inner: it[i + j] != null ? para(PP.cellL, run(CP.body, t("☐ ")) + run(CP.cell, t(it[i + j]))) : cellP(PP.cellL, CP.cell, "") }); rows.push(r); }
    return inTable(table(rows, { cols: n, rowH: 1700 }), PP.left0) + spacer();
  }
  /** 79회차 SPEC §3-4 읽는 법 상자 — 1칸 표·가는 격자. items: [[이름, 뜻]] · colors: [["pine"|"mustard"|"red"|"grey", 뜻]] */
  var LEG_CP = { pine: 19, mid: 20, light: 21, mustard: 22, red: 35, grey: 23 }; // grey = 구성비 띠 거절 칸과 같은 #B9C2BF
  function legendBlock(b) {
    var inner = para(PP.cellL, run(CP.barV, t(b.title || "읽는 법")));
    (b.items || []).forEach(function (x) { inner += para(PP.cellL, run(CP.cellB, t(x[0] + " ")) + run(CP.cell, t("= " + x[1]))); });
    if (b.colors && b.colors.length) inner += para(PP.cellL, b.colors.map(function (c) { return run(LEG_CP[c[0]] || 48, t("■ ")) + run(CP.cell, t(c[1] + "    ")); }).join(""));
    return inTable(table([[{ w: TW, bf: 10, mg: [567, 567, 283, 283], inner: inner }]], { cols: 1, rowH: 1984 })) + spacer();
  }
  function kpi2(b) {
    var it = b.items, n = it.length, w = Math.floor(TW / n);
    var cells = it.map(function (k, i) {
      var lab = b.big ? C4.bigLab : C4.kLab, val = b.big ? C4.bigVal : C4.kBig; // b.big = 큰 글씨 안내문(머리말 18pt·값 26pt)
      var inner = para(PP.center, run(lab, t(k.k))) + para(PP.center, run(val, t(k.v)) + (k.u ? run(C4.kUnit, t(" " + k.u)) : "")) + para(PP.center, rich(k.s || "", lab, lab, C4.kRed));
      return { w: i === n - 1 ? TW - w * (n - 1) : w, bf: i && i < n - 1 ? 25 : 24, mg: [300, 300, 200, 200], inner: inner };
    });
    return inTable(table([cells], { cols: n, rowH: 3200 })) + spacer();
  }
  /** 일반 표(칠 없음): 머리 아래 굵은 선·줄마다 옅은 선. al 은 열마다 "L"/"R"/"C". 칸 글에 «
» 이 있으면 둘째 줄은 작은 회색 */
  function tbl2(b) {
    var nc = b.head.length, ask = b.grid === "ask", al = b.al || autoAl(b.rows, nc); // 79회차 SPEC §2: 열 정렬 자동 판정
    var ws = b.widths || (function () { var first = Math.round(TW * (nc > 4 ? 0.22 : 0.3)), rest = Math.floor((TW - first) / (nc - 1)), o = [first]; for (var i = 1; i < nc; i++) o.push(i === nc - 1 ? TW - first - rest * (nc - 2) : rest); return o; })();
    var pp = function (a) { return a === "R" ? PP.cellR : a === "C" ? PP.cellC : PP.cellL; };
    var rows = [b.head.map(function (h, i) { return { w: ws[i], bf: ask ? 29 : 26, inner: para(PP.cellC, run(C4.thB, t(h))) }; })]; // 머리 = 가운데·굵게
    var hl = {}; (b.hl || []).forEach(function (r) { hl[r] = 1; });
    function cell(v, i, ri, sum) {
      var parts = String(v == null ? "" : v).split("\n"), main = parts[0], red = hl[ri] && (i === 0 || b.hlCols && b.hlCols.indexOf(i) >= 0);
      var cp = ask && i === 0 ? 0 : sum ? C4.tdSum : red ? C4.tdRed : C4.td;
      var inner = para(pp(al[i]), ask && i === 0 ? rich(main, 0, C4.bold, C4.red) : rich(main, cp, C4.tdSum, C4.tdRed));
      if (parts[1]) inner += para(pp(al[i]), run(C4.small, t(parts[1])));
      return { w: ws[i], bf: sum ? 23 : 27, mg: ask ? [300, 300, 220, 220] : [567, 567, 283, 283], inner: inner };
    }
    (b.rows || []).forEach(function (r, ri) { rows.push(r.map(function (v, i) { return cell(v, i, ri); })); });
    if (b.sum) rows.push(b.sum.map(function (v, i) {
      var c = cell(v, i, -1, true);
      if (b.fx && i > 0 && v !== "" && !isNaN(Number(String(v).replace(/,/g, "")))) c.inner = para(pp(al[i]), formulaRun(C4.tdSum, "=SUM(" + colName(i) + "2:" + colName(i) + (rows.length) + ")", v)); // 합계 칸 = 한글 표 계산식
      return c;
    }));
    var out = (b.title ? para(PP.cap, run(C4.thB, t(b.title)) + (b.unit ? run(C4.tail, t("  " + b.unit)) : "")) : "") + inTable(table(rows, { cols: nc, headRows: 1, rowH: 1984, headH: 2126, split: !!b.split }));
    if (b.src) out += para(PP.note, run(C4.tail, t(b.src)));
    return out + (b.nospace ? "" : spacer());
  }
  function section(doc) {
    var P = []; COMPACT = !!doc.compact; // doc.compact = 한 쪽 맞춤(여백·장 간격·표 행 높이만 줄임, 내용·글자 크기 그대로)
    // 첫 문단: 구역 설정 + 쪽 번호(중앙 하단 «- n -»)
    P.push(para(PP.center, run(CP.body, secPr(doc.plain) + '<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl><hp:ctrl><hp:pageNum pos="BOTTOM_CENTER" formatType="DIGIT" sideChar="-"/></hp:ctrl>') + run(CP.body, "<hp:t/>")));
    // 제목 — 79회차 SPEC §1: 구형 소나무 제목상자 폐기 → 모든 문서가 C안 제목(22pt·부제·선·기관·날짜줄). doc.plain 문서는 {t:"t2"} 블록이 직접 그린다
    if (!doc.plain) {
      P.push(titleBlock({ title: doc.title || "", sub: doc.subtitle, made: [doc.made, doc.office].filter(Boolean).join(" · ") }));
      if (doc.note) P.push(para(PP.note, run(C4.tail, t(doc.note))));
    }
    var pend = false; // C안: 쪽 나눔은 «다음 소제목 문단»에 붙인다(빈 문단이 새 쪽으로 밀려 빈 쪽이 생기는 것을 막음)
    (doc.blocks || []).forEach(function (b) {
      if (b.t === "hd") P.push(chapterBand(b));
      else if (b.t === "kpi") P.push(kpiRow(b));
      else if (b.t === "bars") P.push(barsFig(b));
      else if (b.t === "stack") P.push(stackFig(b));
      else if (b.t === "img") P.push(imgFig(b));
      else if (b.t === "t2") P.push(titleBlock(b));
      else if (b.t === "sec") { P.push(para(P4.sec, run(C4.sec, t("□ " + b.text)), pend)); pend = false; }
      else if (b.t === "ci") P.push(para(b.lv === 3 ? P4.d : P4.o, run(0, t((b.mk || (b.lv === 3 ? "-" : "○")) + " ")) + rich(b.text, 0, C4.bold, C4.red))); // b.mk = 기호 바꿈(번호 «1.»·체크 «☐»)
      else if (b.t === "sign") P.push(signBlock(b));
      else if (b.t === "concl") P.push(conclBlock(b));
      else if (b.t === "form") P.push(formBlock(b));
      else if (b.t === "legend") P.push(legendBlock(b));
      else if (b.t === "chk") P.push(chkBlock(b));
      else if (b.t === "kpi2") P.push(kpi2(b));
      else if (b.t === "cap2") P.push(para(P4.cap, run(C4.cap, t(b.title))) + (b.sub ? para(PP.note, run(C4.small, t(b.sub))) : ""));
      else if (b.t === "tbl2") P.push(tbl2(b));
      else if (b.t === "gap") P.push(spacer());
      else if (b.t === "ch") { P.push(para(P4.sec, run(C4.sec, t(b.text)), pend)); pend = false; } // 79회차: 구형 장 제목(HY헤드라인M)도 C안 소제목 모양
      else if (b.t === "li") { var lv = Math.max(1, Math.min(4, b.lv || 1)); P.push(para(COMPACT && lv === 1 ? PC.l1 : PP["l" + lv], run(lv === 1 ? CP.l1 : CP.body, t(SYM[lv - 1] + " " + b.text)))); }
      else if (b.t === "p" && b.kind === "small") P.push(para(PP.note, run(C4.tail, t(b.text))));
      else if (b.t === "p" && b.kind === "tail") P.push(para(P4.tail, run(C4.tail, t(b.text)))); // 꼬리 한 줄(시연 문구)
      else if (b.t === "p" && b.kind === "big") P.push(para(PP.center, run(C4.bigLab, t(b.text))));
      else if (b.t === "p" && b.kind === "att2") P.push(para(P4.att2, run(CP.body, t(b.text)))); // 붙임 둘째 줄부터
      else if (b.t === "p") P.push(b.kind === "att" ? para(PP.body, run(CP.body, t(b.text))) : para(b.kind === "end" ? PP.right : PP.note, run(b.kind === "end" ? CP.body : C4.tail, t(b.text))));
      else if (b.t === "break") { pend = true; } // 쪽 나눔은 다음 소제목 문단에 붙인다(빈 문단이 새 쪽으로 밀려 빈 쪽이 생기는 것을 막음)
      else if (b.t === "box") P.push(conclBlock(b)); // 79회차: 구형 결론 상자(소나무 칠)도 결론 상자 모양
      else if (b.t === "tbl") P.push(dataTable(b));
    });
    COMPACT = false;
    return XH + "<hs:sec " + NS + ">" + P.join("") + "</hs:sec>";
  }
  function preview(doc) {
    var L = [doc.title || ""]; (doc.blocks || []).forEach(function (b) { if (b.text) L.push(b.text); });
    return L.join("\r\n").slice(0, 1000);
  }

  function build(doc) {
    doc = doc || {}; uid = 1000000; imgs = [];
    var sec = section(doc); // 그림 목록(imgs)이 여기서 채워진다
    var now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    var files = [
      { name: "mimetype", data: "application/hwp+zip" },
      { name: "version.xml", data: XH + '<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="Hancom Office Hangul" appVersion="13, 0, 0, 3901 WIN32LEWindows_10"/>' },
      { name: "Contents/header.xml", data: header() },
      { name: "Contents/section0.xml", data: sec },
      { name: "Preview/PrvText.txt", data: preview(doc) },
      { name: "settings.xml", data: XH + '<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"><ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/></ha:HWPApplicationSetting>' },
      { name: "META-INF/container.rdf", data: XH + '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/header.xml"/></rdf:Description><rdf:Description rdf:about="Contents/header.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#HeaderFile"/></rdf:Description><rdf:Description rdf:about=""><ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" rdf:resource="Contents/section0.xml"/></rdf:Description><rdf:Description rdf:about="Contents/section0.xml"><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#SectionFile"/></rdf:Description><rdf:Description rdf:about=""><rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/></rdf:Description></rdf:RDF>' },
      { name: "Contents/content.hpf", data: XH + "<opf:package " + NS + ' version="" unique-identifier="" id=""><opf:metadata><opf:title>' + esc(doc.title || "") + '</opf:title><opf:language>ko</opf:language><opf:meta name="creator" content="text">닿음</opf:meta><opf:meta name="CreatedDate" content="text">' + now + '</opf:meta><opf:meta name="ModifiedDate" content="text">' + now + "</opf:meta></opf:metadata>" +
        '<opf:manifest><opf:item id="header" href="Contents/header.xml" media-type="application/xml"/><opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/><opf:item id="settings" href="settings.xml" media-type="application/xml"/>' + imgs.map(function (m) { return '<opf:item id="' + m.id + '" href="' + m.name + '" media-type="' + m.mime + '" isEmbeded="1"/>'; }).join("") + '</opf:manifest><opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>' },
      { name: "META-INF/container.xml", data: XH + '<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"><ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/><ocf:rootfile full-path="Preview/PrvText.txt" media-type="text/plain"/><ocf:rootfile full-path="META-INF/container.rdf" media-type="application/rdf+xml"/></ocf:rootfiles></ocf:container>' },
      { name: "META-INF/manifest.xml", data: XH + '<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>' }
    ];
    imgs.forEach(function (m) { files.push({ name: m.name, data: m.data }); });
    return Z.zip(files);
  }
  function download(doc, fileName) {
    try { return Z.save(build(doc), fileName || "닿음.hwpx", "application/hwp+zip"); } catch (e) { return Promise.reject(e); }
  }
  return { build: build, download: download, SYM: SYM, TW: TW };
});
