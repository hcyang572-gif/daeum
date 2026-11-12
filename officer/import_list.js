/* 닿음 S11-k ① 명단 불러오기 — 한국사회보장정보원 «복지사각지대 발굴대상자 조회» 엑셀/CSV 읽기(⚙️ 파로, 2026-11-03 · s11c.js 에서 옮김)
   화면과 무관한 순수 함수 + 파일 읽기. 읽는 열: COLS·BEN 만. 성명·주민등록번호·전화·연락처·우편번호·(행안부)주소·담당자는 «읽지 않는다».
   (행복이음)주소는 «지도 위치 찾기»에만 이 기기 안에서 쓰고 화면·저장소에 적지 않는다. 서버 전송 0.
   window.DaeumImport / node: require */
(function (root) {
  "use strict";
  var doc = root.document;
  var COLS = [
    ["id", "가구번호", /^(관리\s*번호|가구\s*(번호|id|코드)|대상\s*번호|발굴\s*번호|일련\s*번호|id|household)$/i],
    ["area", "읍면동", /^(읍면동|행정동|소재\s*행정동|읍\s*면\s*동|관할\s*읍면동|동\s*명|읍면|area|region)$/i],
    ["sig", "위기정보", /(위기\s*(정보|신호|유형|사유)|발굴\s*사유|발굴\s*변수|위기사유|signal)/i],
    ["age", "연령", /^(연령|나이|만\s*나이|age)$/i],
    ["mem", "가구원수", /(가구\s*원\s*수|세대\s*원\s*수|가구원|members)/i],
    ["addr", "위치(이 기기 안에서만)", /^(\(행복이음\)\s*주소|주소)$/],
    ["prio", "발굴우선순위", /^발굴\s*우선\s*순위$/],
    ["cnt", "발굴횟수", /^발굴\s*횟수$/],
    ["ym", "발굴년월", /^발굴\s*년월$/], // S11-d2: 미처리 기간 계산(우선순위 근거 E)
    ["proc", "처리여부", /^처리\s*여부$/],
    ["lonely", "우선방문(고독사)", /^우선\s*방문\s*대상자?_?\s*고독사$/],
    ["child", "우선방문(e아동)", /^우선\s*방문\s*대상자?_?\s*e\s*아동$/i],
    ["aiReq", "정보원 AI초기상담 상태", /^AI\s*초기\s*상담\s*요청\s*상태$/i],
    ["aiRes", "정보원 AI초기상담 결과", /^AI\s*초기\s*상담\s*(상담)?\s*결과$/i]
  ];
  // 급여·자격 열(값 Y/예/O/1 이면 «받음»): 이름 그대로 꼬리표에 쓴다
  var BEN = ["기초생계급여", "기초의료급여", "기초주거급여", "기초교육급여", "긴급복지", "차상위장애인", "차상위본인부담경감대상자", "차상위자활", "차상위계층확인", "한부모가족", "타법의료", "장애인연금", "기초연금"];
  var SKIP = /(성명|이름|대상자명|연락처|전화|휴대|주민\s*등록|생년월일|주소|우편|담당자|name|phone)/i;
  var READ_OK = /^(관리\s*번호|\(행복이음\)\s*주소|주소)$/;
  function yes(v) { return /^(y|yes|예|o|○|1|대상|해당)$/i.test(String(v == null ? "" : v).trim()); }
  /** 가상 가구 위치 찾기: 주소 «… <읍면동> 가상리 <번호>» → 가구(data/tools/make_demo_list.py 와 같은 규칙). 실제 주소는 찾지 않는다(주소→좌표 변환은 도입 때) */
  function addrKey(a) { var m = String(a || "").match(/(\S+(?:읍|면|동))\s+가상리\s+(\d+)/); return m ? m[1] + "|" + (+m[2]) : ""; }
  function addrIndex() {
    var o = O(), D = o && o.data ? o.data() : null, ix = {};
    ((D && D.households) || []).forEach(function (h) { var n = +String(h.id).split("-")[1]; if (n) ix[h.area + "|" + n] = h.id; });
    return ix;
  }
  function parseCSV(text) {
    text = text.replace(/^﻿/, "");
    var delim = (text.split(/\r?\n/)[0].match(/\t/g) || []).length > (text.split(/\r?\n/)[0].match(/,/g) || []).length ? "\t" : ",";
    var rows = [], row = [], cur = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
  }
  var XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    XLSX_SRI = "sha512-r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfuyQM4tIRAI062MaV8sfjQKYVGjOBaZBOA87z+IhZE9DA==";
  // 67회차: 같은 출처 사본 먼저(행정망·전파 약한 곳에서 CDN이 막혀 .xlsx 를 못 읽던 것 — 에뮬 오프라인 실측), 안 되면 CDN. 둘 다 같은 SRI
  //   상대 경로는 «이 스크립트» 기준(첫 화면 / 와 사무 화면 /officer/ 가 달라서) — shared/vendor/README.md 와 같은 방식
  var XLSX_LOCAL = (function () { try { return new URL("../shared/vendor/xlsx-0.18.5.full.min.js", (doc && doc.currentScript && doc.currentScript.src) || root.location.href).href; } catch (e) { return ""; } })();
  function loadXLSX() {
    if (root.XLSX) return Promise.resolve(root.XLSX);
    function one(src) {
      return new Promise(function (ok, no) {
        var s = doc.createElement("script"); s.src = src; s.integrity = XLSX_SRI; s.crossOrigin = "anonymous"; s.referrerPolicy = "no-referrer";
        s.onload = function () { root.XLSX ? ok(root.XLSX) : no(new Error("xlsx")); }; s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); no(new Error("xlsx")); };
        doc.head.appendChild(s);
      });
    }
    return (XLSX_LOCAL ? one(XLSX_LOCAL) : Promise.reject()).catch(function () { return one(XLSX_URL); });
  }
  function readFile(f) {
    var isX = /\.xlsx?$/i.test(f.name);
    return new Promise(function (ok, no) {
      var r = new FileReader();
      r.onerror = function () { no(new Error("read")); };
      r.onload = function () {
        if (!isX) {
          var t = r.result;
          if (/�/.test(t.slice(0, 400))) { var r2 = new FileReader(); r2.onload = function () { ok(parseCSV(r2.result)); }; r2.onerror = function () { no(new Error("read")); }; try { r2.readAsText(f, "euc-kr"); } catch (e) { ok(parseCSV(t)); } return; }
          ok(parseCSV(t)); return;
        }
        loadXLSX().then(function (X) {
          try { // 67회차: 깨진·암호 걸린 파일이면 X.read 가 던진다 — 잡지 않으면 «읽는 중»에서 멈추고 안내도 없었다
            var wb = X.read(new Uint8Array(r.result), { type: "array" }), ws = wb.SheetNames.length ? wb.Sheets[wb.SheetNames[0]] : null;
            ok(ws ? X.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }) : []);
          } catch (e) { no(new Error("broken")); }
        }, function () { no(new Error("lib")); });
      };
      if (isX) r.readAsArrayBuffer(f); else r.readAsText(f, "utf-8");
    });
  }
  /** 머리줄 찾기(위 10줄 안에서 맞는 열이 가장 많은 줄) → 열 맞춤 */
  function mapCols(rows) {
    var best = { i: -1, n: 0, m: null };
    rows.slice(0, 10).forEach(function (r, i) {
      var m = {}, n = 0;
      r.forEach(function (h, j) { h = String(h).trim(); if (!h || SKIP.test(h) && !READ_OK.test(h)) return; COLS.forEach(function (c) { if (m[c[0]] == null && c[2].test(h)) { m[c[0]] = j; n++; } }); });
      if (n > best.n) best = { i: i, n: n, m: m };
    });
    return best;
  }

  /** rows(2차원 배열) + 가구 목록 → { ok, err, meta:{id:{prio,cnt,proc,lonely,child,ben,hasBen,aiReq,aiRes,vars,ym}}, ids, cols:[{src,dst,key}], skipped:[열 이름], miss, n, ym } */
  // S12-i1(11-12): 옛 30가구 상한을 풀었다 — 한 차수 명단 전체(시연 48가구)를 그대로 싣는다. MAX 는 브라우저 저장소 보호용 안전 상한일 뿐이다.
  var MAX = 2000;
  function importRows(rows, households) {
    var hd = mapCols(rows || []);
    if (!(rows || []).some(function (r) { return (r || []).some(function (x) { return String(x == null ? "" : x).trim(); }); })) return { ok: false, err: "blank" }; // 67회차: 아무것도 없는 파일
    if (hd.i < 0 || (hd.m.id == null && hd.m.addr == null)) return { ok: false, err: "cols" };
    var head = rows[hd.i], body = rows.slice(hd.i + 1).filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
    var benCol = []; head.forEach(function (h, j) { if (BEN.indexOf(String(h).trim()) >= 0) benCol.push(j); });
    var cell = function (r, k) { return hd.m[k] != null ? String(r[hd.m[k]] == null ? "" : r[hd.m[k]]).trim() : ""; };
    if (hd.m.prio != null) body = body.map(function (r, i) { return { r: r, i: i, p: parseFloat(cell(r, "prio")) }; })
      .sort(function (a, b) { var x = isFinite(a.p) ? a.p : 1e9, y = isFinite(b.p) ? b.p : 1e9; return x - y || a.i - b.i; }).map(function (x) { return x.r; });
    var by = {}, ix = {}; (households || []).forEach(function (h) { by[h.id] = h; var n = +String(h.id).split("-")[1]; if (n) ix[h.area + "|" + n] = h.id; });
    var ids = [], miss = 0, dup = 0, seen = {}, meta = {};
    body.forEach(function (r) {
      var id = cell(r, "id").toUpperCase();
      if (!(id && by[id]) && hd.m.addr != null) id = ix[addrKey(cell(r, "addr"))] || "";
      if (!id || !by[id]) { miss++; return; }
      if (seen[id]) { dup++; return; } seen[id] = 1; ids.push(id); // 67회차: 같은 가구 두 줄 이상 = 첫 줄(발굴 순위가 앞선 줄)만, 건수는 알린다
      var ben = benCol.filter(function (j) { return yes(r[j]); }).map(function (j) { return String(head[j]).trim(); });
      meta[id] = { prio: cell(r, "prio"), cnt: +cell(r, "cnt") || 0, proc: cell(r, "proc"), lonely: yes(cell(r, "lonely")), child: yes(cell(r, "child")),
        ben: ben, hasBen: benCol.length > 0, aiReq: cell(r, "aiReq"), aiRes: cell(r, "aiRes"), vars: cell(r, "sig"), ym: cell(r, "ym").slice(0, 7) };
    });
    var cols = COLS.filter(function (c) { return hd.m[c[0]] != null; }).map(function (c) { return { key: c[0], src: String(head[hd.m[c[0]]]).trim(), dst: c[1] }; });
    var skipped = head.filter(function (h) { h = String(h).trim(); return h && SKIP.test(h) && !READ_OK.test(h); }).map(function (h) { return String(h).trim(); });
    var ys = Object.keys(meta).map(function (k) { return meta[k].ym; }).filter(Boolean).sort();
    if (!body.length) return { ok: false, err: "empty", cols: cols, total: head.filter(function (h) { return String(h).trim(); }).length };
    if (!ids.length) return { ok: false, err: "nomatch", n: body.length };
    return { ok: true, meta: meta, ids: ids.slice(0, MAX), cut: ids.length > MAX, cols: cols, skipped: skipped, miss: miss, dup: dup, n: body.length,
      total: head.filter(function (h) { return String(h).trim(); }).length, benCols: benCol.length, ym: ys.length ? ys[ys.length - 1] : "" };
  }

  /** S12-i1: importRows 결과를 이 기기 저장소에 싣는다(공무원 화면 ①·앱 «오늘» 명단 카드가 같은 규칙으로) — 서버 전송 0.
   *  ls = { get(k,d), set(k,v) }, F = DaeumFeatures(차수 기억용, 없으면 건너뜀). 반환: 실은 가구 수 */
  function commit(r, fileName, ls, F, now) {
    if (!r || !r.ok) return 0;
    now = now || new Date();
    var ym0 = now.getFullYear() + "-" + (now.getMonth() < 9 ? "0" : "") + (now.getMonth() + 1);
    var M = {}; r.ids.forEach(function (id) { M[id] = r.meta[id]; if (!M[id].ym) M[id].ym = ym0; });
    ls.set("daeum.s11.importMeta", M); ls.set("daeum.s11.import", { name: fileName, n: r.ids.length, at: now.getTime() });
    if (F && F.rounds && F.store) {
      var cur = { ym: r.ym || ym0, ids: r.ids, ranks: {}, cnts: {}, name: fileName, at: now.toISOString() };
      r.ids.forEach(function (id) { cur.ranks[id] = M[id].prio; cur.cnts[id] = M[id].cnt; });
      F.store.set("rounds", F.rounds.remember(F.store.get("rounds", []), cur));
    }
    return r.ids.length;
  }

  var api = { MAX: MAX, commit: commit, COLS: COLS, BEN: BEN, SKIP: SKIP, mapCols: mapCols, parseCSV: parseCSV, readFile: readFile, importRows: importRows, addrKey: addrKey };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DaeumImport = api;
})(typeof window !== "undefined" ? window : globalThis);
