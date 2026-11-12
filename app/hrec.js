/* 닿음 «가구별 기록·문서» — S12-x(⚙️ 파로 64회차, 2026-11-12)
   호창님 11-12: «기록한 내용은 보고탭에 가구마다 잘 저장되고 필요시 열어보고 편집도 가능하면 좋겠어»
                 «저장된 가구별 보고서가 잘 목록화되고 필요시 쉽게 찾아보고 편집 및 활용가능해야해.»
   이 파일 = 규칙만(화면 그리기·저장은 app/app.js). node 에서도 돈다 → 시험 app/hrec.test.js
   ① group(logs, byId, edits) — 방문 기록(visit_log 모양)을 가구별로 묶는다. 한 가구 여러 번 방문 = 차수별로 쌓음(덮어쓰지 않음)
   ② docsOf(g) — 그 가구 기록으로 만들어지는 문서(상담일지 초안·출장 결과 보고·연계 의뢰서·안내 문자) + 본문(규칙 문장)
   ③ 본문 직접 고침 = docEdits[hid|kind] = { text, at, base(고칠 때의 마지막 기록 id) } — 기록이 바뀌면 base 가 달라져 «기록이 바뀜 — 다시 만들기»
   ④ filter(list, { q, res, period, doc, now }) · sort(list, "recent"|"hid")
   65회차: 화면(app/app.js) 동작 이름은 시안 v3 그대로 — hf(걸러 보기)·hsort·hpick·hopen·hedit·hsave·hre·hbulk
   ⛔ 판정·점수 없음(담당자 판단) · 성명·주소·연락처 없음(가구 관리 번호·읍면만) · 기록은 sync.js 가림(mask)을 거친 것만 */
(function (root) {
  "use strict";
  var RES = { met: "만남", absent: "부재", refuse: "거절" };
  var DOCK = [
    { k: "log", nm: "상담일지 초안", when: function (v) { return v.res === "met"; } },
    { k: "bok", nm: "출장 결과 보고", when: function () { return true; } },
    { k: "ref", nm: "연계 의뢰서", when: function (v) { return v.res === "met" && /의뢰|연계|신청/.test(v.memo + " " + v.tags.join(" ")); } },
    { k: "sms", nm: "안내 문자", when: function (v) { return v.res === "absent"; } }
  ];
  function T(x) { var n = Date.parse(x); return isFinite(n) ? n : 0; } // 시각 비교는 숫자로(«Z»·«+09:00» 섞여도 맞게)
  function ymd(d) { d = new Date(d); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function md(d) { d = new Date(d); return (d.getMonth() + 1) + "." + d.getDate() + "."; }
  function hm(d) { d = new Date(d); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

  /** ① 가구별 묶기 — edits = { 기록id: 고친 시각 iso } (이 기기에서 «고치기»로 저장한 시각) */
  function group(logs, byId, edits) {
    var G = {};
    (logs || []).forEach(function (l) {
      if (!l || !l.household_no || !RES[l.result]) return;
      var h = byId[l.household_no] || {}, g = G[l.household_no] || (G[l.household_no] = { hid: l.household_no, area: h.area || "", visits: [] });
      g.visits.push({ id: l.id, at: l.at, res: l.result, memo: String(l.memo || ""), tags: (l.tags || []).slice(), edited: (edits && edits[l.id]) || null });
    });
    return Object.keys(G).map(function (k) {
      var g = G[k];
      g.visits.sort(function (a, b) { return T(a.at) - T(b.at); });
      g.visits.forEach(function (v, i) { v.n = i + 1; });
      var last = g.visits[g.visits.length - 1];
      g.last = last; g.res = last.res;
      g.touched = g.visits.reduce(function (m, v) { var t = v.edited && T(v.edited) > T(v.at) ? v.edited : v.at; return !m || T(t) > T(m) ? t : m; }, "");
      return g;
    });
  }
  /** ② 문서 본문 — 마지막 방문 기록에서 규칙으로 만든다(새로 지어낸 값 없음) */
  function body(k, g) {
    var v = g.last, d = md(v.at) + " " + hm(v.at), who = g.hid + "(" + g.area + ")", n = g.visits.length;
    var past = n > 1 ? " · 지난 방문 " + g.visits.slice(0, -1).map(function (x) { return md(x.at) + " " + RES[x.res]; }).join(", ") : "";
    if (k === "log") return "상담일지 초안\n가구: " + who + "\n상담 일시: " + d + " · " + v.n + "차 방문" + past + "\n상담 내용: " + (v.memo || "(기록 없음)") + (v.tags.length ? "\n주요어: " + v.tags.join(", ") : "") + "\n※ 초안 — 담당자가 확인한 뒤 행복이음에 입력";
    if (k === "bok") return "출장 결과 보고(가구 " + g.hid + ")\n일시: " + d + "\n출장지: " + g.area + "\n결과: " + RES[v.res] + " · " + v.n + "차 방문" + past + "\n요지: " + (v.memo || "—");
    if (k === "ref") return "서비스 연계 의뢰서(초안)\n대상: " + who + "\n의뢰 일자: " + md(v.at) + "\n의뢰 사유: " + ((/의뢰 사유: ([^.]*)/.exec(v.memo) || [])[1] || v.memo || "—") + "\n※ 선정 결정 아님 — 받는 기관이 판단";
    if (k === "sms") return "[상주시] 복지 안부 방문 안내\n" + md(v.at) + " 댁에 들렀으나 뵙지 못했습니다. 편하신 때에 읍면 행정복지센터 맞춤형복지팀으로 연락 주세요.";
    return "";
  }
  /** 그 가구 문서 목록 — docEdits 가 있으면 본문은 고친 것, 기록이 그 뒤 바뀌었으면 stale */
  function docsOf(g, docEdits) {
    var v = g.last;
    return DOCK.filter(function (d) { return d.when(v); }).map(function (d) {
      var e = docEdits && docEdits[g.hid + "|" + d.k], auto = body(d.k, g);
      return { k: d.k, nm: d.nm, text: e ? e.text : auto, auto: auto, edited: e ? e.at : null, stale: !!(e && e.base !== v.id) };
    });
  }
  /** ④ 찾기·걸러 보기 — q: 가구번호·읍면·메모 낱말 · res: met|absent|refuse|"" · period: today|week|month|all · doc: log|bok|ref|sms|"" (65회차: 시안 v3 «오늘·이번 주» 칩) */
  function filter(list, f) {
    f = f || {}; var now = f.now ? new Date(f.now) : new Date(), q = String(f.q || "").trim().toLowerCase(), from = null;
    if (f.period === "today") { from = new Date(now); from.setHours(0, 0, 0, 0); }
    else if (f.period === "week") { from = new Date(now); var wd = (from.getDay() + 6) % 7; from.setDate(from.getDate() - wd); from.setHours(0, 0, 0, 0); }
    else if (f.period === "month") from = new Date(now.getFullYear(), now.getMonth(), 1);
    return list.filter(function (g) {
      if (f.res && g.res !== f.res) return false;
      if (from && new Date(g.last.at) < from) return false;
      if (f.doc && !docsOf(g).some(function (d) { return d.k === f.doc; })) return false;
      if (q) { var hay = (g.hid + " " + g.area + " " + g.visits.map(function (v) { return v.memo + " " + v.tags.join(" ") + " " + dkeys(v.at); }).join(" ")).toLowerCase(); if (q.split(/\s+/).some(function (w) { return hay.indexOf(w) < 0; })) return false; }
      return true;
    });
  }
  /** S12-z 날짜로 찾기 — 방문일을 «2026-11-12 11-12 11.12 11.12. 11월12일 11월 12일» 모양으로 함께 넣어 어떤 쓰기로 찾아도 걸리게 */
  function dkeys(at) { var d = new Date(at); if (isNaN(d)) return ""; var m = d.getMonth() + 1, dd = d.getDate(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return [ymd(d), p(m) + "-" + p(dd), m + "-" + dd, m + "." + dd, m + "." + dd + ".", p(m) + "." + p(dd), m + "월" + dd + "일", m + "/" + dd].join(" "); }
  /** S12-z 여러 가구 내려받기 ZIP 안 파일 목록 — 같은 파일을 «날짜/마지막 방문일/»·«가구별/가구번호/» 두 폴더에 둔다(날짜로도 가구로도 바로 찾게).
      build(g) → 그 가구 hwpx 바이트, name(d, hid, kind, ext) → 이름 규칙(shared/xlsx.js docName) */
  function zipFiles(groups, build, name) {
    var out = [];
    groups.forEach(function (g) {
      var data = build(g), nm = name(g.last.at, g.hid, "가구별기록", "hwpx");
      out.push({ name: "날짜/" + ymd(g.last.at) + "/" + nm, data: data }, { name: "가구별/" + g.hid + "/" + nm, data: data });
    });
    return out;
  }
  function sort(list, by) {
    return list.slice().sort(by === "hid" ? function (a, b) { return a.hid < b.hid ? -1 : a.hid > b.hid ? 1 : 0; } : function (a, b) { return T(b.touched) - T(a.touched); });
  }
  /** hwpx 문서 모양(shared/hwpx.js) — 고른 가구들을 한 파일로 */
  // 79회차 ⓓ-뒷단(SPEC docs78 H1): 첫 장 가구 요약표 · 가구마다 쪽 나눔 · 메모는 «방문 기록» 표에 한 번만(문서에는 고유 항목만) · 문서 «항목: 값» 줄은 양식표로
  function hwpxDoc(groups, docEdits, made) {
    var dd = function (d) { d = new Date(d); return (d.getMonth() + 1) + ". " + d.getDate() + "."; }, nV = 0, nD = 0;
    var sum = groups.map(function (g) { var ds = docsOf(g, docEdits); nV += g.visits.length; nD += ds.length; return [g.hid, g.area, g.visits.length + "회", RES[g.res], String(ds.length)]; });
    var cnt = {}; groups.forEach(function (g) { cnt[g.res] = (cnt[g.res] || 0) + 1; });
    var blocks = [{ t: "t2", title: "가구별 방문 기록·문서", sub: "복지 사각지대 현장 업무 도우미(닿음) · 가구 " + groups.length + "곳", made: (made ? made + " · " : "") + "상주시청" },
      { t: "concl", text: "가구 " + groups.length + "곳 · 방문 " + nV + "회 — " + Object.keys(RES).filter(function (k) { return cnt[k]; }).map(function (k) { return RES[k] + " " + cnt[k]; }).join(" · ") + " · 문서 " + nD + "건" },
      { t: "sec", text: "가구 요약" },
      { t: "tbl2", head: ["가구", "읍면", "방문", "최종 결과", "문서 수"], al: ["C", "C", "C", "C", "R"], rows: sum, split: true }];
    var norm = function (s) { return String(s || "").replace(/\s+/g, " ").trim(); }, notes = [];
    var dfix = function (s) { return String(s).replace(/(^|[^\d])(\d{1,2})\.(\d{1,2})\./g, "$1$2. $3."); }; // 문서 안 날짜 «11. 13.»(SPEC §1)
    groups.forEach(function (g, i) {
      var memos = {}; g.visits.forEach(function (v) { if (v.memo) memos[norm(v.memo)] = v.n; });
      if (i) blocks.push({ t: "break" });
      blocks.push({ t: "sec", text: (i + 1) + ". 가구 " + g.hid + " · " + g.area + " · 최종 " + RES[g.res] });
      blocks.push({ t: "tbl2", title: "방문 기록", head: ["차수", "방문일", "결과", "기록"], al: ["C", "C", "C", "L"], widths: [4600, 8400, 5200, 29990],
        rows: g.visits.map(function (v) { return [v.n + "차", dd(v.at) + " " + hm(v.at), RES[v.res], v.memo || "기록 없음"]; }), split: true });
      docsOf(g, docEdits).forEach(function (d) {
        var kv = [], other = [];
        d.text.split("\n").slice(1).forEach(function (ln) {
          if (!ln.trim()) return;
          var j = ln.indexOf(": ");
          if (j > 0 && j < 14 && !/^※/.test(ln)) {
            var k = ln.slice(0, j), v = ln.slice(j + 2);
            if (/^(가구|대상|출장지)$/.test(k)) return; // 위 머리줄·표와 같은 값
            if (memos[norm(v)]) v = "(위 «방문 기록» " + memos[norm(v)] + "차 참고)";
            kv.push([k, dfix(v)]);
          } else if (/^※/.test(ln)) { if (notes.indexOf(ln) < 0) notes.push(ln); } // ※ 안내는 끝에 한 번만
          else other.push(dfix(ln));
        });
        blocks.push({ t: "cap2", title: d.nm + (d.edited ? " (직접 고침)" : "") });
        if (kv.length) blocks.push({ t: "form", rows: kv, rowH: 1984 });
        other.forEach(function (ln) { blocks.push({ t: "ci", lv: 2, text: ln }); });
      });
    });
    if (notes.length) blocks.push({ t: "p", kind: "small", text: "※ " + notes.map(function (n) { return n.replace(/^※\s*/, ""); }).join(" · ") });
    blocks.push({ t: "p", kind: "end", text: "끝." }, { t: "p", kind: "tail", text: "닿음 · 시연용 가상 데이터 · 개인정보 4칸 미기재" });
    return { plain: true, title: "가구별 방문 기록·문서", blocks: blocks };
  }
  /** 65회차: 화면 이름표(시안 v3 .tag 색: ok=만남 · w=부재 · g=거절) · 고친 때 글자(«오늘 10:48»·«11. 3. 11:02») */
  var RK = { met: "ok", absent: "w", refuse: "g" };
  function when(x, now) { if (!x) return ""; var d = new Date(x), n = now ? new Date(now) : new Date(); return (ymd(d) === ymd(n) ? "오늘 " : md(d) + " ") + hm(d); }
  var API = { RES: RES, RK: RK, when: when, DOCK: DOCK.map(function (d) { return { k: d.k, nm: d.nm }; }), group: group, body: body, docsOf: docsOf, filter: filter, sort: sort, zipFiles: zipFiles, dkeys: dkeys, hwpxDoc: hwpxDoc, ymd: ymd, md: md, hm: hm };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.DaeumHrec = API;
})(typeof window !== "undefined" ? window : this);
