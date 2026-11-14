/* 닿음 V4-2 «발굴 명단 엑셀 올리기» — 읽은 명단 확인 계산(103회차 ⚙️ 파로, 2026-11-14)
   근거: 정본 시안 v4 Version 14 «명단 불러오기» 3단계(파일 고르기 → 열 확인 → 명단 반영) · 요구 원장 V4-2(v4-2a~d).
   화면 없이 값만 계산하는 순수 함수 — 읽기·싣기는 officer/import_list.js(DaeumImport.readFile·importRows·commit) 그대로 쓰고,
   여기서는 «오늘 명단에 반영» 전에 보여 줄 확인 숫자(가구 수·우선방문·미처리·급여·읍면·같은 가구 두 줄·명단에 없는 줄·주소 확인 필요),
   열 맞춤 표(읽는 열 14 · 급여·자격 13 · 읽지 않은 열 묶음), 앞 5줄 미리보기만 만든다.
   ⛔ 성명·주민등록번호·전화·주소 글은 결과에 싣지 않는다(주소는 확인 필요 «건수»만). 서버 전송 0.
   브라우저: window.DaeumImportCheck · node: require("./import_check.js") — 시험 node shared/import_check.test.js */
(function (root) {
  "use strict";
  // 시안 IMP_COLS 순서·이름 그대로 — [importRows 열 열쇠, 서식의 기본 열 이름, 닿음에서 쓰는 이름]
  var COLS = [
    ["id", "관리번호", "가구번호"], ["area", "읍면동", "읍면동"], ["sig", "위기정보", "위기정보"], ["age", "연령", "연령"], ["mem", "가구원수", "가구원수"],
    ["addr", "(행복이음)주소", "위치 · 이 기기 안에서만"], ["prio", "발굴우선순위", "발굴우선순위"], ["cnt", "발굴횟수", "발굴횟수"], ["ym", "발굴년월", "발굴년월"],
    ["proc", "처리여부", "처리여부"], ["lonely", "우선방문대상자_고독사", "우선방문(고독사)"], ["child", "우선방문대상자_e아동", "우선방문(e아동)"],
    ["aiReq", "AI초기상담요청상태", "AI초기상담 상태"], ["aiRes", "AI초기상담결과", "AI초기상담 결과"]
  ];
  // 읽지 않는 열 묶음(시안 IMP_SKIP 6) — 파일에 실제로 있던 것만 보여 준다
  var SKIP_CATS = [
    ["성명", /(성명|이름|대상자명|name)/i], ["주민등록번호", /(주민\s*등록|생년월일)/], ["연락처", /(연락처|전화|휴대|phone)/i],
    ["우편번호", /우편/], ["(행안부)주소", /주소/], ["담당자", /담당자/]
  ];
  function unproc(m) { return !/처리\s*완료|완료/.test((m && m.proc) || ""); }
  function decade(h) { var a = h && h.members && h.members[0] ? h.members[0].age : null; return a ? Math.floor(a / 10) * 10 + "대" : ""; }
  function who(h) { if (!h) return ""; var n = (h.members || []).length || 1; return [decade(h), n + "인"].filter(Boolean).join(" · "); }
  function firstSig(v) { return String(v || "").split(/[,·/|]/)[0].trim(); }

  /** 읽지 않은 열 이름들 → 시안 묶음 이름(있는 것만, 순서 고정) */
  function skipCats(skipped) {
    var s = (skipped || []).map(function (x) { return String(x); });
    return SKIP_CATS.filter(function (c) {
      return s.some(function (h) {
        if (c[0] === "(행안부)주소") return /주소/.test(h) && !/^\(행복이음\)\s*주소$/.test(h);
        if (c[0] === "연락처") return c[1].test(h);
        return c[1].test(h) && !(c[0] === "성명" && /주소|전화/.test(h));
      });
    }).map(function (c) { return c[0]; });
  }

  /** r = DaeumImport.importRows 결과(ok) · rows = 읽은 2차원 배열(주소 확인용) · households = 가구 목록 · F = DaeumFeatures(F.addr 있으면 주소 확인)
   *  → { n, ym, prio, unproc, ben, areas:[[읍면, 가구]], dup, miss, addrNeed, cols:[{file, dst, ok}], colN, colTotal, benN, benTotal, skip:[묶음], preview:[{rank,id,area,who,sig}] } */
  function summary(r, rows, households, F, benTotal) {
    if (!r || !r.ok) return null;
    var by = {}; (households || []).forEach(function (h) { by[h.id] = h; });
    var ar = {}, prio = 0, un = 0, ben = 0;
    r.ids.forEach(function (id) {
      var m = r.meta[id] || {}, h = by[id];
      if (h) ar[h.area] = (ar[h.area] || 0) + 1;
      if (m.lonely || m.child) prio++;
      if (unproc(m)) un++;
      if (m.ben && m.ben.length) ben++;
    });
    var areas = Object.keys(ar).map(function (a) { return [a, ar[a]]; }).sort(function (x, y) { return y[1] - x[1] || (x[0] < y[0] ? -1 : 1); });
    var got = {}; (r.cols || []).forEach(function (c) { got[c.key] = c.src; });
    // 실제 행복이음 서식엔 관리번호·연령·가구원수 열이 없을 수 있다 — 없으면 다른 길(주소로 가구 찾기·가구 자료)로 채운 것을 그대로 적는다(시안은 14/14 가정)
    var ALT = { id: got.addr != null ? "주소로 가구를 찾음" : "", age: "가구 자료에서", mem: "가구 자료에서" };
    var cols = COLS.map(function (c) { var hit = got[c[0]] != null; return { key: c[0], file: hit ? got[c[0]] : c[1], dst: hit ? c[2] : ALT[c[0]] || "", ok: hit, alt: !hit && !!ALT[c[0]] }; });
    var addrNeed = null;
    try {
      if (F && F.addr && F.addr.scan && rows && rows.length && root.DaeumImport) {
        var IM = root.DaeumImport, hd = IM.mapCols(rows);
        if (hd.i >= 0) {
          var head = rows[hd.i].map(function (x) { return String(x).trim(); }), body = rows.slice(hd.i + 1);
          var ids = body.map(function (row) { var x = IM.importRows([rows[hd.i], row], households); return x.ok ? x.ids[0] : ""; });
          addrNeed = F.addr.scan(head, body, ids).need.length;
        }
      }
    } catch (e) { addrNeed = null; }
    var preview = r.ids.slice(0, 5).map(function (id, i) {
      var m = r.meta[id] || {}, h = by[id];
      return { rank: m.prio ? String(m.prio) : String(i + 1), id: id, area: h ? h.area : "", who: who(h), sig: firstSig(m.vars) || "—" };
    });
    return { n: r.ids.length, ym: r.ym || "", prio: prio, unproc: un, ben: ben, areas: areas, dup: r.dup || 0, miss: r.miss || 0, addrNeed: addrNeed,
      cols: cols, colN: cols.filter(function (c) { return c.ok; }).length, colTotal: COLS.length, benN: r.benCols || 0, benTotal: benTotal || 13,
      skip: skipCats(r.skipped), preview: preview };
  }

  var api = { COLS: COLS, SKIP_CATS: SKIP_CATS.map(function (c) { return c[0]; }), summary: summary, skipCats: skipCats, who: who };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DaeumImportCheck = api;
})(typeof window !== "undefined" ? window : globalThis);
