/* 닿음 «그날 복명서+상담일지 한 번에 받기(ZIP)» 부품 — 101회차 ⑧-1④(⚙️ 파로, 2026-11-14 · 요구 원장 «보고 추가2», docs/REPORT_TAB_98.md:19).
   문서를 «새로 만들지» 않는다. app.js 가 이미 만드는 복명서(d2Hwpx)·상담일지 초안(d1Hwpx)의 결과(hwpx 문서 모델 또는 바이트)를 받아
   ZIP 하나로 묶기만 한다. ZIP 은 shared/xlsx.js 의 무압축 zip·docName·save 를 그대로 쓴다(외부 라이브러리 없음).
   복명서에는 동행자 칸이 없다(11-13 결정) — 이 부품은 문서 내용을 더하지 않으므로 그 결정을 그대로 따른다.

   ── API ─────────────────────────────────────────────
   DaeumDocZip.files(input)    → [{name, data}]    ZIP 안 파일 목록(시험·미리보기용)
   DaeumDocZip.build(input)    → Uint8Array        ZIP 바이트(node 에서도 동작)
   DaeumDocZip.zipName(day)    → "2026-11-14_전체_복명서·상담일지.zip"
   DaeumDocZip.download(input) → Promise           브라우저 내려받기(DaeumXlsx.save)

   input = {
     day: "2026-11-14" | Date,                              // 방문한 날(파일 이름 날짜)
     d2:  { doc: <hwpx 문서 모델 | Uint8Array> },           // 그날 복명서 1건(없으면 생략 가능)
     d1:  [{ hid: "H-0123", at: "2026-11-14T10:20", doc: <모델 | Uint8Array> }]   // 가구별 상담일지 초안
   }
   ZIP 안 이름(모두 S12-z 규칙 «YYYY-MM-DD_가구번호_문서종류.확장자»):
     2026-11-14_전체_복명서.hwpx
     상담일지/2026-11-14_H-0123_상담일지초안.hwpx   (같은 이름이 겹치면 «_2»)
     읽어보기.txt                                   (담긴 문서 목록·가상 자료 안내)
   ⛔ 실제 개인정보를 넣지 않는다 — 가구 번호·읍면만(문서 모델이 이미 그렇다). */
(function (root, factory) {
  var ns = factory(root);
  root.DaeumDocZip = ns;
  if (typeof module !== "undefined" && module.exports) module.exports = ns;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  function X() { var x = root.DaeumXlsx; if (!x || !x.zip) throw new Error("DaeumXlsx(shared/xlsx.js)가 먼저 불러와져야 합니다"); return x; }
  function asBytes(doc) {
    if (doc instanceof Uint8Array) return doc;
    var W = root.DaeumHwpx; if (!W || !W.build) throw new Error("DaeumHwpx(shared/hwpx.js)가 먼저 불러와져야 합니다");
    return W.build(doc);
  }
  function dayOf(d) { d = d ? new Date(d) : new Date(); return isNaN(d) ? new Date() : d; }
  function ymdDot(d) { return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate() + "."; }

  function files(input) {
    input = input || {};
    var x = X(), day = dayOf(input.day), out = [], seen = {}, list = [];
    function put(name, data) {
      var n = name, i = 2, dot = name.lastIndexOf(".");
      while (seen[n]) { n = name.slice(0, dot) + "_" + i++ + name.slice(dot); }
      seen[n] = 1; out.push({ name: n, data: data }); return n;
    }
    if (input.d2 && input.d2.doc) list.push("복명서 1건 — " + put(x.docName(day, null, "복명서", "hwpx"), asBytes(input.d2.doc)));
    var d1 = (input.d1 || []).filter(function (c) { return c && c.doc; });
    d1.forEach(function (c) {
      var nm = put("상담일지/" + x.docName(c.at ? dayOf(c.at) : day, c.hid, "상담일지초안", "hwpx"), asBytes(c.doc));
      list.push("상담일지 초안 — " + nm);
    });
    if (!out.length) throw new Error("묶을 문서가 없습니다");
    var readme = ["닿음 · " + ymdDot(day) + " 방문한 날 문서 묶음", "",
      "복명서 " + (input.d2 && input.d2.doc ? 1 : 0) + "건 · 상담일지 초안 " + d1.length + "건", ""]
      .concat(list.map(function (s) { return "- " + s; }))
      .concat(["", "※ 상담일지 초안은 공무원 확인 전 자동 정리본입니다. 행복이음 입력 전 내용을 확인하세요.",
        "※ 가구 번호·읍면만 담았습니다(성명·주소·연락처 없음). 시연용 가상 자료."]).join("\r\n");
    out.push({ name: "읽어보기.txt", data: "﻿" + readme });
    return out;
  }
  function build(input, when) { return X().zip(files(input), when); }
  function zipName(day) { return X().docName(dayOf(day), null, "복명서·상담일지", "zip"); }
  function download(input) {
    try { return X().save(build(input), zipName(input && input.day), "application/zip"); } catch (e) { return Promise.reject(e); }
  }
  return { files: files, build: build, zipName: zipName, download: download };
});
