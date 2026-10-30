/* 닿음 공통 엑셀 부품 — S10j-2(⚙️ 파로, 2026-10-30). 브라우저에서 .xlsx 를 직접 만든다(외부 라이브러리 없음 — OOXML 을 손으로 쓰고 ZIP(무압축)으로 묶음).
   호창님 기준(10-30): 표지/요약 시트+주제별 시트, 제목·작성일·출처 머리, 닿음 색 머리행·옅은 줄무늬, 숫자 오른쪽/글자 왼쪽, 천 단위 쉼표,
   틀 고정·자동 필터, 합계·비율·증감은 «수식», A4 인쇄(세로/넓은 표 가로·한 쪽 너비 맞춤·머리행 반복·쪽 번호 바닥글), 마지막 «데이터 출처» 시트.
   시험: node shared/xlsx.test.js · 실제 엑셀 열기 확인: python shared/xlsx_check.py <파일>

   ── API ─────────────────────────────────────────────
   DaeumXlsx.build(spec) → Uint8Array(.xlsx 바이트)          · node 에서도 동작(시험용)
   DaeumXlsx.download(spec, "파일이름.xlsx") → Promise       · 브라우저: 내려받기(가능하면 navigator.share 대신 a[download])
   DaeumXlsx.zip([{name, data}]) → Uint8Array                · 무압축 ZIP(한글 hwpx 부품도 이것을 쓴다)
   DaeumXlsx.col(0) → "A"

   spec = {
     title: "보고서 제목", subtitle: "2026. 10. 19. ~ 2026. 10. 30.", made: "2026. 10. 30. 15:00", office: "작성 부서",
     conclusion: "한 줄 결론", note: "※ 시연용 가상 자료",                       // 요약(표지) 시트 머리
     kpis: [{ k: "발굴 명단", v: 60, u: "가구", s: "설명", type: "int"|"pct"|"text",
              ref: { sheet: "읍면별", col: "n", row: "만남·상담" },              // → ='읍면별'!합계칸 (row 가 있으면 첫 칸이 그 글인 줄의 칸) — 그 시트 숫자를 고치면 요약도 바뀜
              fx: "IF([읍면별:n]=0,0,[읍면별:c]/[읍면별:n])" }],                  // [시트:열키] = 그 시트 합계칸
     lines: [{ lv: 1..4, text: "□ …" }],                                          // 요약 시트 개조식(선택)
     sheets: [{
       name: "읍면별", title: "<표 1> 읍면별 처리 현황", unit: "단위: 가구, 건", note: "", src: "※ 출처: …", tags: ["가상"],
       columns: [{ key: "a", h: "읍면", type: "text"|"int"|"dec"|"pct"|"date", w: 12,
                   fx: "IF({n}=0,0,{c}/{n})",   // {키}=같은 줄 칸, {키:sum}=자료 범위 합 SUM($B$5:$B$9), {키:prev}=윗줄 칸(첫 줄은 0), {키:first}=첫 줄 칸($B$5)
                   calc: function (g, ctx) {},   // 미리 계산값(엑셀이 열 때 다시 계산하지만 미리보기용) — g("키"), ctx.sum("키")
                   total: "sum"|"fx"|"none" }],  // 합계 줄: 숫자 열 기본 sum, fx 열 기본 fx({키:prev} 쓰면 none)
       rows: [["함창읍", 20, 8, 0.4]], total: "합계" | false,
       landscape: true|false(생략 시 표 너비로 자동),
       text: [{ lv: 0..4, text }]               // 본문형 시트(개조식 글) — columns/rows 대신
     }],
     sources: [{ kind: "공공데이터"|"공개 자료"|"가상"|"닿음 집계", org, name, date, use }],  // 마지막 «데이터 출처» 시트
     footer: "닿음"                                                                // 바닥글 오른쪽
   }
   ⛔ 실제 개인정보를 넣지 않는다 — 시연 자료는 sources 에 kind:"가상" 으로 적는다. */
(function (root, factory) {
  var ns = factory(root);
  root.DaeumXlsx = ns;
  if (typeof module !== "undefined" && module.exports) module.exports = ns;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  // ═══════════ ZIP(무압축) ═══════════
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function u8(s) { return typeof s === "string" ? new TextEncoder().encode(s) : s; }
  /** files 순서를 그대로 지킨다(hwpx 는 mimetype 이 첫 자리여야 함) */
  function zip(files, when) {
    when = when || new Date();
    var dt = ((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
    var tm = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
    var parts = [], cen = [], off = 0;
    files.forEach(function (f) {
      var name = u8(f.name), data = u8(f.data), crc = crc32(data);
      var h = new Uint8Array(30 + name.length), v = new DataView(h.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
      v.setUint16(10, tm, true); v.setUint16(12, dt, true); v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true);
      v.setUint16(26, name.length, true); v.setUint16(28, 0, true); h.set(name, 30);
      var c = new Uint8Array(46 + name.length), w = new DataView(c.buffer);
      w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true); w.setUint16(10, 0, true);
      w.setUint16(12, tm, true); w.setUint16(14, dt, true); w.setUint32(16, crc, true); w.setUint32(20, data.length, true); w.setUint32(24, data.length, true);
      w.setUint16(28, name.length, true); w.setUint32(42, off, true); c.set(name, 46);
      parts.push(h, data); cen.push(c); off += h.length + data.length;
    });
    var cs = cen.reduce(function (s, c) { return s + c.length; }, 0), e = new Uint8Array(22), ev = new DataView(e.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, cs, true); ev.setUint32(16, off, true);
    var all = parts.concat(cen, [e]), n = all.reduce(function (s, a) { return s + a.length; }, 0), out = new Uint8Array(n), p = 0;
    all.forEach(function (a) { out.set(a, p); p += a.length; });
    return out;
  }

  // ═══════════ 도움 함수 ═══════════
  function esc(s) { return String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function col(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function qs(name) { return "'" + String(name).replace(/'/g, "''") + "'"; }
  function dispLen(v) { var s = String(v == null ? "" : v), n = 0; for (var i = 0; i < s.length; i++) n += s.charCodeAt(i) > 0x2E80 ? 2 : 1; return n; }
  function amp(s) { return String(s || "").replace(/&/g, "&&").slice(0, 80); } // 머리글·바닥글 안 & 는 && 로
  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function sheetName(n, used) {
    var s = String(n || "시트").replace(/[\[\]:*?\/\\]/g, " ").trim().slice(0, 31) || "시트", b = s, k = 2;
    while (used[s.toLowerCase()]) { var suf = " (" + k++ + ")"; s = b.slice(0, 31 - suf.length) + suf; }
    used[s.toLowerCase()] = 1; return s;
  }

  // ═══════════ 서식(styles.xml) — 닿음 색 ═══════════
  var C = { acc: "FF5A4AC2", soft: "FFECEAF8", stripe: "FFF6F5FC", ink: "FF1B1830", ink2: "FF5E5A73", line: "FFD9D6E8", deep: "FF463799" };
  var X = { def: 0, title: 1, meta: 2, head: 3, txt: 4, txtS: 5, int: 6, intS: 7, pct: 8, pctS: 9, dec: 10, decS: 11,
    tTxt: 12, tInt: 13, tPct: 14, tDec: 15, wrap: 16, label: 17, ch: 18, l1: 19, l2: 20, l3: 21, l4: 22, kInt: 23, kPct: 24, kTxt: 25, src: 26, dt: 27, dtS: 28 };
  function stylesXml() {
    var F = "맑은 고딕";
    function font(sz, bold, color) { return '<font>' + (bold ? "<b/>" : "") + '<sz val="' + sz + '"/><color rgb="' + color + '"/><name val="' + F + '"/><family val="3"/><charset val="129"/></font>'; }
    function fill(rgb) { return '<fill><patternFill patternType="solid"><fgColor rgb="' + rgb + '"/><bgColor indexed="64"/></patternFill></fill>'; }
    function side(n, st, rgb) { return st ? "<" + n + ' style="' + st + '"><color rgb="' + rgb + '"/></' + n + ">" : "<" + n + "/>"; }
    function border(l, r, t, b) { return "<border>" + side("left", l, C.line) + side("right", r, C.line) + side("top", t[0], t[1]) + side("bottom", b[0], b[1]) + "<diagonal/></border>"; }
    // xf(font, fill, border, numFmt, align)
    function xf(fo, fi, bo, nf, al) {
      return '<xf numFmtId="' + nf + '" fontId="' + fo + '" fillId="' + fi + '" borderId="' + bo + '" xfId="0"' + (nf ? ' applyNumberFormat="1"' : "") + (fo ? ' applyFont="1"' : "") + (fi ? ' applyFill="1"' : "") + (bo ? ' applyBorder="1"' : "") +
        ' applyAlignment="1"><alignment ' + al + "/></xf>";
    }
    var L = 'horizontal="left" vertical="center"', R = 'horizontal="right" vertical="center"', W = 'horizontal="left" vertical="top" wrapText="1"';
    var xfs = [
      xf(0, 0, 0, 0, 'vertical="center"'),                       // 0 기본
      xf(2, 0, 0, 0, L),                                          // 1 제목
      xf(3, 0, 0, 0, L),                                          // 2 머리 설명(작성일·단위)
      xf(1, 2, 1, 0, 'horizontal="center" vertical="center" wrapText="1"'), // 3 머리행
      xf(0, 0, 1, 0, L), xf(0, 3, 1, 0, L),                        // 4·5 글자(줄무늬)
      xf(0, 0, 1, 164, R), xf(0, 3, 1, 164, R),                    // 6·7 정수 #,##0
      xf(0, 0, 1, 165, R), xf(0, 3, 1, 165, R),                    // 8·9 비율 0.0%
      xf(0, 0, 1, 166, R), xf(0, 3, 1, 166, R),                    // 10·11 소수 #,##0.0
      xf(4, 4, 2, 0, L), xf(4, 4, 2, 164, R), xf(4, 4, 2, 165, R), xf(4, 4, 2, 166, R), // 12~15 합계 줄
      xf(0, 0, 1, 0, 'horizontal="left" vertical="center" wrapText="1"'), // 16 긴 글(줄바꿈)
      xf(4, 4, 1, 0, L),                                          // 17 항목 이름 칸
      xf(5, 0, 3, 0, L),                                          // 18 장 제목(Ⅰ.)
      xf(4, 0, 0, 0, W.replace('vertical="top"', 'vertical="top" indent="0"')), // 19 □
      xf(0, 0, 0, 0, W.replace('vertical="top"', 'vertical="top" indent="1"')), // 20 ○
      xf(0, 0, 0, 0, W.replace('vertical="top"', 'vertical="top" indent="2"')), // 21 -
      xf(0, 0, 0, 0, W.replace('vertical="top"', 'vertical="top" indent="3"')), // 22 ·
      xf(5, 0, 1, 164, R), xf(5, 0, 1, 165, R), xf(5, 0, 1, 0, R), // 23~25 요약 숫자 칸(크게)
      xf(3, 0, 0, 0, W),                                          // 26 출처 줄
      xf(0, 0, 1, 167, R), xf(0, 3, 1, 167, R)                    // 27·28 날짜 yyyy. m. d.(일련번호)
    ];
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="4"><numFmt numFmtId="164" formatCode="#,##0"/><numFmt numFmtId="165" formatCode="0.0%"/><numFmt numFmtId="166" formatCode="#,##0.0"/><numFmt numFmtId="167" formatCode="yyyy\\.\\ m\\.\\ d\\."/></numFmts>' +
      '<fonts count="6">' + font(10, 0, C.ink) + font(10, 1, "FFFFFFFF") + font(16, 1, C.ink) + font(9, 0, C.ink2) + font(10, 1, C.ink) + font(12, 1, C.deep) + "</fonts>" +
      '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' + fill(C.acc) + fill(C.stripe) + fill(C.soft) + "</fills>" +
      '<borders count="4"><border><left/><right/><top/><bottom/><diagonal/></border>' + border("thin", "thin", ["thin", C.line], ["thin", C.line]) +
      border("thin", "thin", ["medium", C.acc], ["thin", C.line]) + border(null, null, [null], ["medium", C.acc]) + "</borders>" +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="' + xfs.length + '">' + xfs.join("") + "</cellXfs>" +
      '<cellStyles count="1"><cellStyle name="표준" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0"/></styleSheet>';
  }

  // ═══════════ 칸 ═══════════
  function cNum(ref, v, s) { return '<c r="' + ref + '" s="' + s + '"><v>' + (+v) + "</v></c>"; }
  function cStr(ref, v, s) { return '<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + "</t></is></c>"; }
  function cF(ref, f, v, s) { return '<c r="' + ref + '" s="' + s + '"><f>' + esc(f) + "</f>" + (isNum(v) ? "<v>" + v + "</v>" : "") + "</c>"; }
  function cell(ref, v, s) { return v == null || v === "" ? '<c r="' + ref + '" s="' + s + '"/>' : isNum(v) ? cNum(ref, v, s) : cStr(ref, v, s); }
  /** 날짜 글(«2026. 10. 19.»·«2026-10-19»)·Date → 엑셀 날짜 일련번호(1900 체계). 못 읽으면 null(글 그대로 둔다) */
  function serial(v) {
    var y, mo, d;
    if (v instanceof Date && isFinite(v)) { y = v.getFullYear(); mo = v.getMonth() + 1; d = v.getDate(); }
    else { var mm = String(v == null ? "" : v).match(/^\s*(\d{4})\s*[.\-\/]\s*(\d{1,2})\s*[.\-\/]\s*(\d{1,2})\s*\.?\s*$/); if (!mm) return null; y = +mm[1]; mo = +mm[2]; d = +mm[3]; }
    var t = Date.UTC(y, mo - 1, d); if (!isFinite(t)) return null;
    return Math.round((t - Date.UTC(1899, 11, 30)) / 86400000);
  }
  function row(r, cells, ht) { return '<row r="' + r + '"' + (ht ? ' ht="' + ht + '" customHeight="1"' : "") + ">" + cells.join("") + "</row>"; }

  var HEAD = 4; // 머리행 위치(1 제목 · 2 작성일·단위 · 3 설명/출처 · 4 머리행)
  function sheetXml(o) {
    // o: {cols:[w], rows:[xml], merges:[ref], freeze:{y,x}, filter:ref, landscape, footer, title}
    var last = col(o.cols.length - 1);
    var pane = o.freeze ? '<pane' + (o.freeze.x ? ' xSplit="' + o.freeze.x + '"' : "") + ' ySplit="' + o.freeze.y + '" topLeftCell="' + col(o.freeze.x || 0) + (o.freeze.y + 1) + '" activePane="' + (o.freeze.x ? "bottomRight" : "bottomLeft") + '" state="frozen"/>' : "";
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:' + last + Math.max(1, o.nrows) + '"/>' +
      '<sheetViews><sheetView workbookViewId="0" showGridLines="0"' + (o.first ? ' tabSelected="1"' : "") + ">" + pane + "</sheetView></sheetViews>" +
      '<sheetFormatPr defaultRowHeight="18" customHeight="1"/><cols>' + o.cols.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join("") + "</cols>" +
      "<sheetData>" + o.rows.join("") + "</sheetData>" +
      (o.filter ? '<autoFilter ref="' + o.filter + '"/>' : "") +
      (o.merges.length ? '<mergeCells count="' + o.merges.length + '">' + o.merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join("") + "</mergeCells>" : "") +
      '<printOptions horizontalCentered="1"/><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.7" header="0.3" footer="0.3"/>' +
      '<pageSetup paperSize="9" orientation="' + (o.landscape ? "landscape" : "portrait") + '" fitToWidth="1" fitToHeight="0"/>' +
      '<headerFooter><oddFooter>' + esc("&L&8 " + amp(o.title) + "&C&9 - &P / &N -&R&8 " + amp(o.footer || "닿음")) + "</oddFooter></headerFooter></worksheet>";
  }
  function widths(columns, rows) {
    return columns.map(function (c, i) {
      if (c.w) return c.w;
      var m = dispLen(c.h) + 2;
      rows.forEach(function (r) { var v = r[i]; m = Math.max(m, (c.type === "date" ? 13 : isNum(v) ? String(Math.round(v)).length + 3 : dispLen(v)) + 2); });
      return Math.max(c.type === "text" ? 10 : 8, Math.min(46, m));
    });
  }
  var STY = { text: [X.txt, X.txtS, X.tTxt], date: [X.dt, X.dtS, X.tTxt], int: [X.int, X.intS, X.tInt], dec: [X.dec, X.decS, X.tDec], pct: [X.pct, X.pctS, X.tPct] };

  /** 자료 시트 배치 — 합계칸 위치를 먼저 알아야 요약 시트가 참조할 수 있다 */
  function layout(sh) {
    var cols = sh.columns, n = (sh.rows || []).length, first = HEAD + 1, lastData = HEAD + n;
    var keys = {}; cols.forEach(function (c, i) { keys[c.key || ("c" + i)] = i; });
    var tot = sh.total === false || !n ? 0 : lastData + 1;
    var byLabel = {}; (sh.rows || []).forEach(function (r, i) { var k = String(r[0]); if (!(k in byLabel)) byLabel[k] = first + i; });
    return { keys: keys, first: first, lastData: lastData, totalRow: tot, n: n, byLabel: byLabel };
  }
  function fxFill(tpl, r, L, isTotal) {
    return tpl.replace(/\{([A-Za-z0-9_]+)(?::(sum|prev|first))?\}/g, function (_, k, mod) {
      var i = L.keys[k]; if (i == null) throw new Error("수식 열 키 없음: " + k);
      var c = col(i);
      if (mod === "sum") return "SUM($" + c + "$" + L.first + ":$" + c + "$" + L.lastData + ")";
      if (mod === "prev") return r <= L.first ? "0" : c + (r - 1);
      if (mod === "first") return "$" + c + "$" + L.first;
      return c + (isTotal ? L.totalRow : r);
    });
  }
  function dataSheet(sh, L, ctx) {
    var cols = sh.columns, rowsIn = sh.rows || [], nc = cols.length, last = col(nc - 1), out = [], merges = [];
    var W = widths(cols, rowsIn), totalW = W.reduce(function (s, w) { return s + w; }, 0);
    if (totalW < 72) { var k = 72 / totalW; W = W.map(function (w) { return Math.round(w * k * 10) / 10; }); totalW = 72; } // 좁은 표도 제목·설명 줄이 잘리지 않게
    out.push(row(1, [cStr("A1", sh.title || sh.name, X.title)], 28)); merges.push("A1:" + last + "1");
    out.push(row(2, [cStr("A2", [ctx.made ? "작성 " + ctx.made : "", ctx.office || "", sh.unit ? "(" + sh.unit + ")" : ""].filter(Boolean).join("  ·  "), X.meta)])); merges.push("A2:" + last + "2");
    out.push(row(3, [cStr("A3", sh.note || "", X.src)], sh.note && dispLen(sh.note) > totalW * 1.1 ? 30 : null)); merges.push("A3:" + last + "3");
    out.push(row(HEAD, cols.map(function (c, i) { return cStr(col(i) + HEAD, c.h, X.head); }), 30));
    var vals = rowsIn.map(function (r) { return r.slice(); }); // 미리 계산값(수식 열은 calc 로 다시 셈)
    function sumKey(k) { var i = L.keys[k]; return vals.reduce(function (s, r) { return s + (isNum(r[i]) ? r[i] : 0); }, 0); }
    var cx = { sum: sumKey };
    vals.forEach(function (r, ri) {
      var g = function (k) { var v = r[L.keys[k]]; return isNum(v) ? v : 0; };
      g.prev = function (k) { return ri ? (isNum(vals[ri - 1][L.keys[k]]) ? vals[ri - 1][L.keys[k]] : 0) : 0; };
      cols.forEach(function (c, i) { if (c.fx && c.calc) r[i] = c.calc(g, cx); });
    });
    vals.forEach(function (r, ri) {
      var rn = L.first + ri, z = ri % 2;
      out.push(row(rn, cols.map(function (c, i) {
        var ref = col(i) + rn, s = STY[c.type || "text"][z];
        if (c.type === "date" && !c.fx) { var sn = isNum(r[i]) ? r[i] : serial(r[i]); return sn != null ? cNum(ref, sn, s) : cell(ref, r[i], STY.text[z]); }
        return c.fx ? cF(ref, fxFill(c.fx, rn, L, false), r[i], s) : cell(ref, r[i], s);
      })));
    });
    if (L.totalRow) {
      var tv = {}; cols.forEach(function (c, i) { if (c.type !== "text" && c.type !== "date") tv[c.key || ("c" + i)] = sumKey(c.key || ("c" + i)); });
      var tg = function (k) { return tv[k] || 0; }; tg.prev = function () { return 0; };
      out.push(row(L.totalRow, cols.map(function (c, i) {
        var ref = col(i) + L.totalRow, s = STY[c.type || "text"][2], mode = c.total || (c.fx ? (/:(prev|first)\}/.test(c.fx) ? "none" : "fx") : (c.type === "text" || c.type === "date" ? "none" : "sum"));
        if (i === 0) return cStr(ref, typeof sh.total === "string" ? sh.total : "합계", s);
        if (mode === "sum" && L.n) return cF(ref, "SUM(" + col(i) + L.first + ":" + col(i) + L.lastData + ")", tv[c.key || ("c" + i)], s);
        if (mode === "fx") return cF(ref, fxFill(c.fx, L.totalRow, L, true), c.calc ? c.calc(tg, cx) : undefined, s);
        return cell(ref, "", s);
      }), 20));
    }
    var end = L.totalRow || L.lastData || HEAD;
    if (sh.src || (sh.tags && sh.tags.length)) {
      var sr = end + 2; out.push(row(sr, [cStr("A" + sr, (sh.src || "") + (sh.tags && sh.tags.length ? "  [" + sh.tags.join("·") + "]" : ""), X.src)], 30)); merges.push("A" + sr + ":" + last + sr); end = sr;
    }
    return { xml: sheetXml({ cols: W, rows: out, merges: merges, nrows: end, freeze: { y: HEAD, x: nc > 6 ? 1 : 0 }, filter: L.n ? "A" + HEAD + ":" + last + L.lastData : null,
      landscape: sh.landscape != null ? !!sh.landscape : totalW > 100, footer: ctx.footer, title: ctx.title, first: false }),
      filter: L.n ? "$A$" + HEAD + ":$" + last + "$" + L.lastData : null, print: L.n ? "$" + HEAD + ":$" + HEAD : null };
  }
  function textSheet(sh, ctx) {
    var out = [], merges = [], r = 1;
    out.push(row(r, [cStr("A1", sh.title || sh.name, X.title)], 28)); r++;
    out.push(row(r, [cStr("A2", [ctx.made ? "작성 " + ctx.made : "", ctx.office || ""].filter(Boolean).join("  ·  "), X.meta)])); r++;
    if (sh.note) { out.push(row(r, [cStr("A" + r, sh.note, X.meta)])); r++; }
    r++;
    (sh.text || []).forEach(function (t) {
      var s = t.lv === 0 ? X.ch : [X.l1, X.l2, X.l3, X.l4][Math.max(1, Math.min(4, t.lv)) - 1];
      var lines = Math.max(1, Math.ceil(dispLen(t.text) / 92));
      out.push(row(r, [cStr("A" + r, t.text, s)], t.lv === 0 ? 26 : 18 * lines)); r++;
    });
    return { xml: sheetXml({ cols: [100], rows: out, merges: merges, nrows: r - 1, landscape: false, footer: ctx.footer, title: ctx.title }) };
  }
  function summarySheet(spec, reg) {
    var out = [], merges = [], r = 1, ctx = spec;
    out.push(row(r, [cStr("A1", spec.title || "닿음 자료", X.title)], 30)); merges.push("A1:D1"); r++;
    if (spec.subtitle) { out.push(row(r, [cStr("A" + r, spec.subtitle, X.meta)])); merges.push("A" + r + ":D" + r); r++; }
    out.push(row(r, [cStr("A" + r, [spec.made ? "작성 " + spec.made : "", spec.office || ""].filter(Boolean).join("  ·  "), X.meta)])); merges.push("A" + r + ":D" + r); r++;
    if (spec.note) { out.push(row(r, [cStr("A" + r, spec.note, X.meta)])); merges.push("A" + r + ":D" + r); r++; }
    r++;
    if (spec.conclusion) {
      out.push(row(r, [cStr("A" + r, "한 줄 결론", X.label), cStr("B" + r, spec.conclusion, X.wrap), cell("C" + r, "", X.wrap), cell("D" + r, "", X.wrap)], Math.max(36, 18 * Math.ceil(dispLen(spec.conclusion) / 70))));
      merges.push("B" + r + ":D" + r); r += 2;
    }
    function refOf(sheet, key, label) {
      var g = reg[sheet]; if (!g || g.L.keys[key] == null) return null;
      var rn = label != null ? g.L.byLabel[String(label)] : g.L.totalRow; if (!rn) return null;
      return qs(g.name) + "!$" + col(g.L.keys[key]) + "$" + rn;
    }
    if (spec.kpis && spec.kpis.length) {
      out.push(row(r, ["항목", "값", "단위", "설명"].map(function (h, i) { return cStr(col(i) + r, h, X.head); }), 24)); r++;
      spec.kpis.forEach(function (k) {
        var ref = "B" + r, s = k.type === "pct" ? X.kPct : isNum(k.v) ? X.kInt : X.kTxt, f = null;
        if (k.ref) { var rr = refOf(k.ref.sheet, k.ref.col, k.ref.row); if (rr) f = rr; }
        if (k.fx) { var ok = true, ff = k.fx.replace(/\[([^\]:]+):([^\]]+)\]/g, function (_, sn, key) { var rr2 = refOf(sn, key); if (!rr2) ok = false; return rr2 || "0"; }); if (ok) f = ff; }
        out.push(row(r, [cStr("A" + r, k.k, X.label), f ? cF(ref, f, isNum(k.v) ? k.v : undefined, s) : cell(ref, k.v, s), cStr("C" + r, k.u || "", X.txt), cStr("D" + r, k.s || "", X.wrap)], 22)); r++;
      });
      r++;
    }
    (spec.lines || []).forEach(function (t) {
      var s = [X.l1, X.l2, X.l3, X.l4][Math.max(1, Math.min(4, t.lv || 1)) - 1];
      out.push(row(r, [cStr("A" + r, t.text, s)], 18 * Math.max(1, Math.ceil(dispLen(t.text) / 92)))); merges.push("A" + r + ":D" + r); r++;
    });
    if (spec.sheets && spec.sheets.length) {
      r++; out.push(row(r, [cStr("A" + r, "시트 구성", X.label), cStr("B" + r, "", X.label), cStr("C" + r, "", X.label), cStr("D" + r, "", X.label)])); merges.push("A" + r + ":D" + r); r++;
      spec.sheets.forEach(function (sh) { out.push(row(r, [cStr("A" + r, sh._name, X.txt), cStr("B" + r, sh.title || "", X.txt), cell("C" + r, "", X.txt), cell("D" + r, "", X.txt)])); merges.push("B" + r + ":D" + r); r++; });
      out.push(row(r, [cStr("A" + r, "데이터 출처", X.txt), cStr("B" + r, "자료마다 제공기관·데이터 이름·기준일", X.txt), cell("C" + r, "", X.txt), cell("D" + r, "", X.txt)])); merges.push("B" + r + ":D" + r); r++;
    }
    return sheetXml({ cols: [18, 16, 8, 58], rows: out, merges: merges, nrows: r, landscape: false, footer: ctx.footer, title: ctx.title, first: true });
  }
  function sourceSheet(spec) {
    var list = (spec.sources || []).map(function (s) { return [s.kind || "", s.org || "", s.name || "", s.date || "", s.use || ""]; });
    var sh = { name: "데이터 출처", title: "데이터 출처", unit: "", note: "공공데이터는 제공기관·데이터 이름·기준일을, 시연용 자료는 «가상»으로 적었습니다(실제 개인정보 없음).",
      columns: [{ key: "k", h: "구분", type: "text", w: 12 }, { key: "o", h: "제공기관", type: "text", w: 22 }, { key: "n", h: "데이터 이름", type: "text", w: 40 }, { key: "d", h: "기준일", type: "text", w: 13 }, { key: "u", h: "쓰인 곳", type: "text", w: 30 }],
      rows: list, total: false, landscape: true };
    return dataSheet(sh, layout(sh), spec);
  }

  /** spec → .xlsx 바이트 */
  function build(spec) {
    spec = spec || {};
    var used = {}; used[sheetName("요약", {}).toLowerCase()] = 1; used["데이터 출처"] = 1;
    var reg = {};
    (spec.sheets || []).forEach(function (sh) {
      sh._name = sheetName(sh.name, used);
      if (!sh.text) { sh.columns = sh.columns || []; reg[sh.name] = { name: sh._name, L: layout(sh) }; }
    });
    var sheets = [{ name: "요약", xml: summarySheet(spec, reg) }];
    (spec.sheets || []).forEach(function (sh) {
      var o = sh.text ? textSheet(sh, spec) : dataSheet(sh, reg[sh.name].L, spec);
      sheets.push({ name: sh._name, xml: o.xml, filter: o.filter, print: o.print });
    });
    var src = sourceSheet(spec); sheets.push({ name: "데이터 출처", xml: src.xml, filter: src.filter, print: src.print });
    var names = [];
    sheets.forEach(function (s, i) {
      if (s.print) names.push('<definedName name="_xlnm.Print_Titles" localSheetId="' + i + '">' + esc(qs(s.name) + "!" + s.print) + "</definedName>");
      if (s.filter) names.push('<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">' + esc(qs(s.name) + "!" + s.filter) + "</definedName>");
    });
    var now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    var files = [
      { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>' },
      { name: "_rels/.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>' },
      { name: "docProps/core.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + esc(spec.title || "") + '</dc:title><dc:creator>닿음</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + now + "</dcterms:modified></cp:coreProperties>" },
      { name: "docProps/app.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>닿음</Application></Properties>' },
      { name: "xl/workbook.xml", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>' +
        sheets.map(function (s, i) { return '<sheet name="' + esc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") + "</sheets>" +
        (names.length ? "<definedNames>" + names.join("") + "</definedNames>" : "") + '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>' },
      { name: "xl/_rels/workbook.xml.rels", data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") +
        '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: "xl/styles.xml", data: stylesXml() }
    ];
    sheets.forEach(function (s, i) { files.push({ name: "xl/worksheets/sheet" + (i + 1) + ".xml", data: s.xml }); });
    return zip(files);
  }

  /** 브라우저 내려받기 — Blob 주소를 a[download] 로 연다 */
  function save(bytes, fileName, mime) {
    if (typeof document === "undefined") return Promise.reject(new Error("브라우저 전용"));
    var blob = new Blob([bytes], { type: mime }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = fileName; a.rel = "noopener"; a.style.display = "none"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
    return Promise.resolve(fileName);
  }
  function download(spec, fileName) {
    try { return save(build(spec), fileName || "닿음.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); }
    catch (e) { return Promise.reject(e); }
  }
  /** 파일 이름에 못 쓰는 글자 정리 + 날짜 */
  function fileName(base, ext, d) { d = d || new Date(); var p = function (n) { return (n < 10 ? "0" : "") + n; }; return String(base || "닿음").replace(/[\\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() + "_" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "." + ext; }

  return { build: build, download: download, save: save, zip: zip, col: col, crc32: crc32, fileName: fileName, HEAD: HEAD, serial: serial };
});
