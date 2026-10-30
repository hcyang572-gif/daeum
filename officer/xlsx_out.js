/* 닿음 공무원 창구 — 화면별 «엑셀로» 단추(S10j-2 2단계, ⚙️ 파로 2026-10-30)
   - 엑셀 파일 만들기는 shared/xlsx.js(DaeumXlsx.download) 하나만 쓴다. 여기서는 «화면 자료 → spec» 만 만든다.
   - 화면과 같은 계산: officer.js(window.DaeumOfficer)·mount.js(window.DaeumMountData)·features.js(DaeumFeatures) 결과를 그대로 읽는다.
   - 공통 양식: 요약 시트(제목·작성일·한 줄 결론·핵심 숫자) + 주제별 시트 + «데이터 출처» 시트(가상 자료는 «가상»).
   - 출처 표기: 화면 출처 꼬리표(data-src-ref·«출처:» 글)를 shared/guide.js 와 같은 규칙(DaeumGuide.infer)으로 읽어 «데이터 출처» 시트에 적는다.
   ⛔ 실제 개인정보 없음 — 주민 요청의 자유 글(상황 설명)은 넣지 않고 신호 종류·읍면·상태만 적는다. */
(function () {
  "use strict";
  var F = window.DaeumFeatures, doc = document;
  var BASE = "../shared/";
  var NOTE = "※ 시연용 가상 자료입니다 — 가구·주민 신호·시도 기록은 모두 가상이며 실제 주민·개인정보는 0건입니다. 정식 기록·실적은 행복이음 기준입니다.";
  var OFFICE = "읍면동 맞춤형복지팀(시연)";

  function O() { return window.DaeumOfficer; }
  function M() { return window.DaeumMountData; }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { d = d || new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function stamp(d) { d = d || new Date(); return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate() + ". " + p2(d.getHours()) + ":" + p2(d.getMinutes()); }
  function mdhm(iso) { var d = new Date(iso); return isNaN(d) ? "" : ymd(d) + " " + p2(d.getHours()) + ":" + p2(d.getMinutes()); }
  function ch(k) { var C = (M() && M().CH) || {}; return C[k] || k || ""; }
  function txt(c, k, w) { return { key: k, h: c, type: "text", w: w }; }
  function int(c, k, w) { return { key: k, h: c, type: "int", w: w }; }
  function st(name, d) { return F.store.get(name, d); }
  function hh(id) { var r = O().row(id); return r ? r.h : null; }
  // S10h ④ 오래된 집(국토교통부 건축HUB 집계 + 가상 표식)
  function OH() { return window.DaeumOldHouse && DaeumOldHouse.get() ? DaeumOldHouse : null; }
  function oldMark(h) { return OH() && h && OH().isOld(h) ? "오래된 집" : ""; }
  function ohIds() { return OH() ? ["D15"] : []; }

  // ── 엑셀 부품은 누를 때 한 번만 싣는다(report_doc.js 와 같은 방식) ──
  var loading = null;
  function needXlsx() {
    if (window.DaeumXlsx) return Promise.resolve(window.DaeumXlsx);
    return loading || (loading = new Promise(function (ok, no) {
      var sc = doc.createElement("script"); sc.src = BASE + "xlsx.js";
      sc.onload = function () { window.DaeumXlsx ? ok(window.DaeumXlsx) : no(new Error("xlsx.js")); };
      sc.onerror = function () { loading = null; no(new Error("xlsx.js")); };
      doc.head.appendChild(sc);
    }));
  }

  // ── 출처: 화면 꼬리표 → 활용 데이터 표(guide.js 정본) ──
  var KIND = { pub: "공공데이터", virt: "가상", self: "닿음 집계", svc: "공개 자료", ref: "공개 자료" };
  function srcIds(scope, extra) {
    var G = window.DaeumGuide, ids = (extra || []).slice();
    if (G && scope) [].forEach.call(scope.querySelectorAll("[data-src-ref], .src-tag, .src-line, p.src, .note, small"), function (n) {
      var t = n.textContent || "", got = n.getAttribute("data-src-ref") ? n.getAttribute("data-src-ref").split(/\s*,\s*/) : /출처|가상/.test(t) ? G.infer(t) : [];
      got.forEach(function (i) { if (ids.indexOf(i) < 0) ids.push(i); });
    });
    return ids;
  }
  function sources(scope, extra, more) {
    var G = window.DaeumGuide, by = {}; if (G) G.DATA.forEach(function (d) { by[d.id] = d; });
    var out = srcIds(scope, extra).filter(function (i) { return by[i]; }).map(function (i) {
      var d = by[i];
      return { kind: KIND[d.kind] || "공개 자료", org: d.org, name: d.name + (d.no ? " (공공데이터포털 " + d.no + ")" : ""), date: d.base || "", use: d.does || "" };
    });
    (more || []).forEach(function (x) { out.push(x); });
    if (!out.some(function (s) { return s.kind === "가상"; })) out.push({ kind: "가상", org: "닿음(시연)", name: "가상 가구·가상 신호·이 기기 시도 기록", date: ymd(), use: "이 파일의 가구·건수 전부(실제 주민 0명)" });
    return out;
  }
  function nonEmpty(rows, n) { return rows.length ? rows : [["(없음)"].concat(new Array(n - 1).fill(null))]; }
  function sec(tab) { return doc.getElementById("tab-" + tab); }
  function head(title, conclusion, kpis, sheets, scope, extraIds, moreSrc, lines) {
    return { title: title, subtitle: "기준 " + stamp() + " (이 기기에 남은 기록 기준)", made: stamp(), office: OFFICE,
      conclusion: conclusion, note: NOTE, kpis: kpis || [], lines: lines || [], sheets: sheets,
      sources: sources(scope, extraIds, moreSrc), footer: "닿음 · 시연(가상 자료)" };
  }

  // ═══════════ 화면별 자료 → spec ═══════════
  function reqSheet(list) {
    var rows = list.map(function (r) {
      var due = F.util && r.createdAt ? ymd(F.util.addWorkdays(new Date(r.createdAt), r.urgent ? 0 : 3)) : "";
      return [r.id, mdhm(r.createdAt), r.region || "", F.signals ? F.signals.text(r) : "", r.urgent ? "긴급" : "", ({ "new": "새로 옴", seen: "담당자 확인", visiting: "방문 예정", done: "연계 완료", cancelled: "취소" })[r.status] || r.status || "", due, 1];
    });
    return { name: "주민 요청", title: "주민 요청(신호) 목록", unit: "단위: 건", tags: ["가상"],
      note: "주민이 남긴 상황 설명(자유 글)은 개인정보 보호를 위해 넣지 않았습니다. 처리 기한 = 긴급 당일·일반 3영업일(시연 설정).",
      src: "※ 출처: 주민 창구에서 들어온 요청(이 기기 저장, 시연)", columns: [txt("접수 번호", "id", 20), txt("접수 일시", "at", 17), txt("읍면동", "ar", 11), txt("신호 종류", "k", 24), txt("긴급", "u", 7), txt("상태", "s", 11), { key: "due", h: "처리 기한", type: "date", w: 12 }, int("건수", "n", 7)],
      rows: nonEmpty(rows, 8), total: rows.length ? "합계" : false };
  }

  var B = {};
  // 오늘(입구) — 방문 순서·다시 찾을 집·연계 누락·주민 요청·기한
  B.today = function () {
    var t = M().today(), S = {}; t.sections.forEach(function (s) { S[s.key] = s; });
    var R = t.route, g = M().gapData(), REQ = window.DaeumRequests;
    var route = R.order.map(function (s, i) { return [i + 1, s.label, s.area || "", s.kind === "request" ? "주민 신호" : "명단 가구", s.alert === "noresp" ? "무반응 신호(가상)" : "", oldMark(hh(s.id))]; });
    var rev = S.revisit.items.map(function (x) { return [x.label, x.area || "", x.why || "", x.due || "", ch(x.channel)]; });
    var due = S.due.items.map(function (x) { return [x.label, x.area || "", x.why || "", x.due || "", x.overdue ? "지남" : ""]; });
    var gap = g.stages.map(function (s) { return [s.label, s.items.length]; });
    var reqs = REQ.list().filter(function (r) { return r.status !== "cancelled" && r.status !== "done"; });
    return head("오늘 찾아갈 집 — " + ymd(), "오늘 찾아갈 집 " + t.counts.stops + "가구(이동 " + R.km.toFixed(1) + "km 추정) · 다시 찾을 집 " + t.counts.revisits + "곳 · 연계가 멈춘 집 " + g.total + "곳 · 새 주민 신호 " + t.counts.newRequests + "건입니다.",
      [{ k: "오늘 찾아갈 집", v: t.counts.stops, u: "가구", s: "담은 가구 + 주민 신호·재방문", type: "int" },
       { k: "이동 거리(추정)", v: R.km.toFixed(1), u: "km", s: "직선거리 × 1.3 근사", type: "text" },
       { k: "다시 찾을 집", v: t.counts.revisits, u: "곳", s: "지난 시도 결과로 다음 시도를 제안한 집", type: "int" },
       { k: "연계가 멈춘 집", v: g.total, u: "곳", s: "‘연계 누락’ 시트 합계(수식)", type: "int", ref: { sheet: "연계 누락", col: "n" } },
       { k: "새 주민 신호", v: t.counts.newRequests, u: "건", s: "처리 기한 임박 " + t.counts.dueSoon + "건", type: "int" }],
      [{ name: "방문 순서", title: "<표 1> 오늘 방문 순서", unit: "순번순", tags: ["가상"], note: "읍면별로 묶은 순서 후보입니다. 최종 순서는 담당자가 정합니다.", src: "※ 출처: 가상 가구(시연) · 순서는 닿음 계산(직선 × 1.3)",
         columns: [int("순번", "no", 6), txt("가구", "l", 14), txt("읍면동", "a", 12), txt("구분", "k", 11), txt("알림", "al", 18), txt("오래된 집(가상)", "oh", 15)], rows: nonEmpty(route, 6), total: false },
       { name: "다시 찾을 집", title: "<표 2> 다시 찾을 집(다음 시도 제안)", tags: ["가상"], note: "안 해 본 시간대·요일로 다음 시도를 제안합니다. 3번 허탕이면 이웃·통반장 확인으로 넘어갑니다.", src: "※ 출처: 담당자 표시 기록(이 기기) · 가구는 가상",
         columns: [txt("가구", "l", 14), txt("읍면동", "a", 12), txt("제안 이유", "w", 46), { key: "d", h: "기한", type: "date", w: 12 }, txt("방법", "c", 9)], rows: nonEmpty(rev, 5), total: false },
       { name: "연계 누락", title: "<표 3> 연계가 멈춘 단계", unit: "단위: 곳", tags: ["가상"], note: "주민 신호 → 상담 → 안내 → 신청 → 결정에서 멈춘 집 수 · 합계와 비율은 수식입니다.", src: "※ 출처: 이 기기 연계·시도 기록(시연)",
         columns: [txt("멈춘 단계", "s", 30), int("멈춘 집", "n", 10), { key: "r", h: "비율", type: "pct", w: 9, fx: "IF({n:sum}=0,0,{n}/{n:sum})", calc: function (gg, cx) { var t2 = cx.sum("n"); return t2 ? gg("n") / t2 : 0; } }], rows: gap, total: "합계" },
       reqSheet(reqs),
       { name: "기한", title: "<표 5> 기한이 다가오는 일", tags: ["가상"], src: "※ 출처: 주민 요청(이 기기, 시연) · 기한은 시연 설정",
         columns: [txt("가구·요청", "l", 18), txt("읍면동", "a", 12), txt("내용", "w", 44), { key: "d", h: "기한", type: "date", w: 12 }, txt("지남", "o", 7)], rows: nonEmpty(due, 5), total: false }],
      sec("today"), ["V1", "V2", "S2"].concat(ohIds()));
  };
  // 주민 요청만
  B.requests = function () {
    var list = window.DaeumRequests.list(), open = list.filter(function (r) { return r.status !== "cancelled" && r.status !== "done"; });
    return head("주민 요청 목록 — " + ymd(), "주민 요청 " + list.length + "건 중 처리 중 " + open.length + "건, 긴급 " + list.filter(function (r) { return r.urgent; }).length + "건입니다.",
      [{ k: "주민 요청", v: list.length, u: "건", s: "‘주민 요청’ 시트 합계(수식)", type: "int", ref: { sheet: "주민 요청", col: "n" } },
       { k: "처리 중", v: open.length, u: "건", s: "연계 완료·취소 제외", type: "int" }],
      [reqSheet(list)], doc.getElementById("moreToday"), ["V1"]);
  };
  // ① 하루 방문 시각표
  B.route = function () {
    var sh = M().sheetData();
    var rows = sh.stops.map(function (x) { return [x.no, x.time || "", x.label, x.area || "", x.members || "", (x.why || []).join(" / "), x.lastTry || "", (x.bring || []).join(", "), (x.cautions || []).join(" / ") + (x.twoPerson ? " [2인 방문]" : ""), x.ifAbsent || ""]; });
    var sb = (sh.standby || []).map(function (x) { return [x.label, x.area || "", x.why || ""]; });
    return head(sh.title || "하루 방문 시각표", sh.summary || "담은 가구가 없습니다.",
      [{ k: "방문", v: sh.stops.length, u: "곳", s: "시각표 순서", type: "int" }, { k: "부재 때 들를 집", v: sb.length, u: "곳", s: "시간이 남으면", type: "int" }],
      [{ name: "시각표", title: "<표 1> 하루 방문 시각표", unit: "도착~출발 시각", tags: ["가상"], landscape: true, note: "상담·조사 결과의 정식 기록은 행복이음에 합니다. 가구·시각은 시연용 가상 값입니다.", src: "※ 출처: 가상 가구(시연) · 이동 시간은 네이버 길찾기 또는 직선 × 1.3 근사",
         columns: [int("순", "no", 5), txt("시각", "t", 12), txt("가구", "l", 11), txt("읍면동", "a", 10), txt("구성", "m", 18), txt("왜 이 집인지", "w", 30), txt("지난 시도", "lt", 18), txt("안내할 것(가능성)", "b", 22), txt("주의", "c", 20), txt("부재면", "ia", 18)],
         rows: nonEmpty(rows, 10), total: false },
       { name: "부재 때 들를 집", title: "<표 2> 부재로 시간이 남으면 들를 집", tags: ["가상"], src: "※ 출처: 가상 가구(시연)",
         columns: [txt("가구", "l", 14), txt("읍면동", "a", 12), txt("이유", "w", 50)], rows: nonEmpty(sb, 3), total: false }],
      sec("route"), ["V1", "N1"]);
  };
  // ② 다시 찾을 집 · 재시도
  B.contacts = function () {
    var att = st("attempts", []), ids = [];
    att.forEach(function (t) { if (ids.indexOf(t.householdId) < 0) ids.push(t.householdId); });
    var next = ids.map(function (id) {
      var s = F.contacts.suggestNext(att, id), h = hh(id);
      return [h ? h.label : id, h ? h.area : "", s.closed ? "끝남" : s.escalate ? "간접 확인" : "다음 시도", s.tries, s.closed ? "" : s.next ? s.next.date : "", s.closed ? "" : s.next ? s.next.slot + " " + ch(s.next.channel) : "", s.closed ? s.closedWhy || "" : s.next ? s.next.why : ""];
    });
    var plan = []; M().plan().forEach(function (d) { d.items.forEach(function (x) { plan.push([d.date, x.slot || "", ch(x.channel), x.label, x.kind === "followup" ? "사후관리" : x.escalate ? "간접 확인" : x.overdue ? "밀림" : "재시도", x.why || ""]); }); });
    var log = att.slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; }).map(function (t) { var h = hh(t.householdId); return [mdhm(t.at), h ? h.label : t.householdId, h ? h.area : "", ch(t.channel), F.contacts.RESULTS[t.result] || t.result, t.note || ""]; });
    var esc = next.filter(function (r) { return r[2] === "간접 확인"; }).length;
    return head("다시 찾을 집 · 재시도 일정 — " + ymd(), next.length ? "시도 기록이 있는 집 " + next.length + "곳 중 간접 확인으로 넘어갈 집 " + esc + "곳 · 닷새 동안 재시도·사후관리 " + plan.length + "건이 잡혀 있습니다." : "아직 시도 기록이 없습니다.",
      [{ k: "시도 기록이 있는 집", v: next.length, u: "곳", type: "int" }, { k: "시도 횟수 합계", v: att.length, u: "회", s: "‘다음 시도’ 시트 합계(수식)", type: "int", ref: { sheet: "다음 시도", col: "n" } },
       { k: "간접 확인 전환", v: esc, u: "곳", s: "3번 허탕 → 이웃·통반장 확인", type: "int" }, { k: "닷새치 일정", v: plan.length, u: "건", type: "int" }],
      [{ name: "다음 시도", title: "<표 1> 집별 다음 시도 제안", tags: ["가상"], note: "시도 횟수의 정식 기록은 행복이음에 합니다.", src: "※ 출처: 담당자 표시 기록(이 기기) · 가구는 가상",
         columns: [txt("가구", "l", 12), txt("읍면동", "a", 11), txt("상태", "s", 10), int("시도", "n", 7), { key: "d", h: "다음 날짜", type: "date", w: 12 }, txt("시간대·방법", "sl", 12), txt("이유", "w", 40)], rows: nonEmpty(next, 7), total: next.length ? "합계" : false },
       { name: "닷새치 일정", title: "<표 2> 닷새치 재시도·사후관리 일정", tags: ["가상"], note: "안 해 본 시간대로 배치 · 주말·공휴일 건너뜀 · 연계 결정 뒤 1·3개월 사후관리 포함", src: "※ 출처: 담당자 표시 기록(이 기기) · 가구는 가상",
         columns: [{ key: "d", h: "날짜", type: "date", w: 12 }, txt("시간대", "s", 8), txt("방법", "c", 9), txt("가구", "l", 12), txt("구분", "k", 10), txt("이유", "w", 44)], rows: nonEmpty(plan, 6), total: false },
       { name: "시도 기록", title: "<표 3> 시도 기록(최근 순)", tags: ["가상"], src: "※ 출처: 담당자 표시 기록(이 기기)",
         columns: [txt("일시", "t", 17), txt("가구", "l", 12), txt("읍면동", "a", 11), txt("방법", "c", 9), txt("결과", "r", 16), txt("메모", "m", 36)], rows: nonEmpty(log, 6), total: false }],
      sec("contacts"), ["V1", "S2"]);
  };
  // ③ 연계 누락 · 미신청
  B.board = function () {
    var g = M().gapData(), ua = M().unapplied(g), bd = O().board();
    var stage = g.stages.map(function (s) { return [s.label, s.items.length]; });
    var items = []; g.stages.forEach(function (s) { s.items.forEach(function (it) { items.push([s.label, it.label, it.area || "", it.why || ""]); }); });
    var uaRows = ua.map(function (x, i) { return [i + 1, x.name, x.stalled || 0, x.demand || 0, x.real ? x.real.households : null]; });
    var gp = function (x) { return Math.max(0, x.asked - x.applied - x.linked); };
    var cols = [txt("읍면동", "a", 12)].concat(bd.services.map(function (s, i) { return int(s.name, "s" + i, 9); }), [{ key: "t", h: "계", type: "int", w: 8, fx: bd.services.map(function (_, i) { return "{s" + i + "}"; }).join("+"), calc: function (gg) { return bd.services.reduce(function (n, _, i) { return n + gg("s" + i); }, 0); } }]);
    function grid(fn) { return bd.areas.map(function (a) { return [a].concat(bd.services.map(function (s) { var x = bd.cell[a + "|" + s.id] || { asked: 0, applied: 0, linked: 0 }; return fn(x); }), [null]); }); }
    var R = O().recipients();
    return head("연계 누락 · 미신청 — " + ymd(), "연계가 멈춘 집 " + g.total + "곳" + (ua[0] ? " · 가장 덜 신청된 서비스는 «" + ua[0].name + "»입니다." : "입니다."),
      [{ k: "연계가 멈춘 집", v: g.total, u: "곳", s: "‘멈춘 단계’ 시트 합계(수식)", type: "int", ref: { sheet: "멈춘 단계", col: "n" } },
       { k: "안내 뒤 미신청", v: ua.reduce(function (n, x) { return n + (x.stalled || 0); }, 0), u: "가구", s: "‘미신청 순서’ 합계(수식)", type: "int", ref: { sheet: "미신청 순서", col: "st" } },
       { k: "동네 미신청(가상)", v: ua.reduce(function (n, x) { return n + (x.demand || 0); }, 0), u: "건", s: "문의 − 신청 − 연계", type: "int", ref: { sheet: "미신청 순서", col: "dm" } }],
      [{ name: "멈춘 단계", title: "<표 1> 연계 단계별 멈춘 집 수", unit: "단위: 곳", tags: ["가상"], note: "합계·비율은 수식입니다.", src: "※ 출처: 이 기기 연계·시도 기록(시연)",
         columns: [txt("멈춘 단계", "s", 34), int("멈춘 집", "n", 10), { key: "r", h: "비율", type: "pct", w: 9, fx: "IF({n:sum}=0,0,{n}/{n:sum})", calc: function (gg, cx) { var t2 = cx.sum("n"); return t2 ? gg("n") / t2 : 0; } }], rows: stage, total: "합계" },
       { name: "멈춘 집", title: "<표 2> 멈춘 집 목록(오래 멈춘 순)", tags: ["가상"], src: "※ 출처: 이 기기 연계·시도 기록 · 가구는 가상",
         columns: [txt("멈춘 단계", "s", 22), txt("가구", "l", 12), txt("읍면동", "a", 11), txt("이유", "w", 46)], rows: nonEmpty(items, 4), total: false },
       { name: "미신청 순서", title: "<표 3> 덜 신청된 서비스 순서", unit: "단위: 가구, 건", tags: ["가상", "공공데이터"], note: "순서 = 안내 뒤 미신청 많은 순 → 동네 미신청 많은 순. 상주시 수급가구는 실제 공개 통계(참고).",
         src: "※ 출처: 이 기기 연계 기록 · 동네 미신청은 가상 · 수급가구는 한국사회보장정보원 «복지사업 시군구별 수급권자 현황»(15062448)" + (R && R.rows[0] ? " 기준 " + (R.rows[0]["기준년월"] || "") : ""),
         columns: [int("순", "no", 5), txt("서비스", "n", 26), int("안내 뒤 미신청(가구)", "st", 12), int("동네 미신청(건, 가상)", "dm", 12), { key: "rl", h: "상주시 수급가구(실제)", type: "int", w: 14, total: "none" }], rows: nonEmpty(uaRows, 5), total: uaRows.length ? "합계" : false },
       { name: "읍면×서비스 미신청", title: "<표 4> 읍면 × 서비스 미신청(문의 − 신청 − 연계)", unit: "단위: 건", tags: ["가상"], landscape: true, note: "칸마다 «물었는데 아직 신청하지 않은» 수요입니다. 계·합계는 수식입니다.", src: "※ 출처: 동네 문의·신청 수는 가상(시연) + 이 기기 주민 신호·연계 저장",
         columns: cols, rows: grid(gp), total: "합계" },
       { name: "읍면×서비스 문의", title: "<표 5> 읍면 × 서비스 문의 수", unit: "단위: 건", tags: ["가상"], landscape: true, src: "※ 출처: 가상 문의 수(시연) + 이 기기 주민 신호",
         columns: cols, rows: grid(function (x) { return x.asked; }), total: "합계" }],
      sec("board"), ["V3", "D5", "S2"]);
  };
  // ④ 현황(대시보드) — 보고서는 report_doc.js 의 «엑셀로»
  B.report = function () {
    var b = M().base(), home = M().homeArea(), S = F.report.aggregate(Object.assign({}, b, { area: home })), H = S.households, Q = S.requests;
    var cd = F.report.countdown(F.report.currentRound(), { done: H.closed, total: H.total });
    var hrows = [["접촉함", H.contacted], ["아직 접촉 못 함", H.notContacted]];
    var area = S.byArea.map(function (a) { return [a.area, a.households, a.contacted, null, a.requests, a.links]; });
    return head("현황 대시보드 — " + (home || "담당 읍면") + " · " + ymd(), (home || "담당") + " 발굴 명단 " + H.total + "가구 중 " + H.contacted + "가구(" + (H.total ? Math.round(H.contacted / H.total * 100) : 0) + "%)에 접촉했고, " + cd.round.label + " " + (cd.upcoming ? "시작 전" : "처리 " + cd.donePct + "%(기간 경과 " + cd.elapsedPct + "%)") + "입니다.",
      [{ k: "발굴 명단", v: H.total, u: "가구", s: "‘읍면별’ 시트 합계(수식)", type: "int", ref: { sheet: "읍면별", col: "h" } },
       { k: "접촉", v: H.contacted, u: "가구", s: "‘읍면별’ 시트 합계(수식)", type: "int", ref: { sheet: "읍면별", col: "c" } },
       { k: "접촉률", v: H.total ? H.contacted / H.total : 0, u: "", s: "접촉 ÷ 발굴 명단(수식)", type: "pct", fx: "IF([읍면별:h]=0,0,[읍면별:c]/[읍면별:h])" },
       { k: "만남·상담", v: H.met, u: "가구", type: "int" }, { k: "비해당", v: H.nonEligible, u: "가구", type: "int" },
       { k: "주민 신호", v: Q.total, u: "건", s: "긴급 " + Q.urgent + "건", type: "int" },
       { k: "연계", v: S.links.total, u: "건", s: S.links.households + "가구", type: "int" },
       { k: "마감까지", v: cd.upcoming ? "시작 전" : cd.daysLeft >= 0 ? "D-" + cd.daysLeft : "마감", u: "", s: cd.message, type: "text" }],
      [{ name: "읍면별", title: "<표 1> 읍면별 발굴·접촉·신호·연계", unit: "단위: 가구, 건", tags: ["가상"], note: "접촉률·합계는 수식입니다 — 숫자를 고치면 요약 시트도 바뀝니다.", src: "※ 출처: 가상 가구(시연) · 이 기기 시도·연계 기록",
         columns: [txt("읍면동", "a", 12), int("발굴 명단", "h", 10), int("접촉", "c", 9), { key: "r", h: "접촉률", type: "pct", w: 9, fx: "IF({h}=0,0,{c}/{h})", calc: function (gg) { return gg("h") ? gg("c") / gg("h") : 0; } }, int("주민 신호", "q", 10), int("연계", "l", 8)],
         rows: nonEmpty(area, 6), total: area.length ? "합계" : false },
       { name: "접촉 현황", title: "<표 2> 발굴 명단 접촉 현황", unit: "단위: 가구", tags: ["가상"], src: "※ 출처: 이 기기 시도 기록(시연)",
         columns: [txt("구분", "k", 20), int("가구", "n", 10), { key: "r", h: "비율", type: "pct", w: 9, fx: "IF({n:sum}=0,0,{n}/{n:sum})", calc: function (gg, cx) { var t2 = cx.sum("n"); return t2 ? gg("n") / t2 : 0; } }], rows: hrows, total: "합계" },
       { name: "요청 처리 단계", title: "<표 3> 주민 요청 처리 단계(누적 도달)", unit: "단위: 건", tags: ["가상"], note: "각 단계에 «도달한» 요청 수입니다(뒤 단계는 앞 단계에 포함). 도달률은 첫 단계 대비 수식입니다.", src: "※ 출처: 주민 창구 요청(이 기기, 시연)",
         columns: [txt("단계", "k", 20), int("요청", "n", 10), { key: "r", h: "도달률", type: "pct", w: 9, fx: "IF({n:first}=0,0,{n}/{n:first})", calc: function (gg) { var f = S.funnel[0].n; return f ? gg("n") / f : 0; } }], rows: S.funnel.map(function (f) { return [f.label, f.n]; }), total: false },
       { name: "비해당 사유", title: "<표 4> 비해당 사유", unit: "단위: 가구", tags: ["가상"], src: "※ 출처: 담당자 표시 기록(이 기기)",
         columns: [txt("사유", "k", 30), int("가구", "n", 10), { key: "r", h: "비율", type: "pct", w: 9, fx: "IF({n:sum}=0,0,{n}/{n:sum})", calc: function (gg, cx) { var t2 = cx.sum("n"); return t2 ? gg("n") / t2 : 0; } }],
         rows: nonEmpty(S.nonEligibleBy.map(function (x) { return [x.label, x.n]; }), 3), total: S.nonEligibleBy.length ? "합계" : false },
       { name: "마감 역산", title: "<표 5> " + cd.round.label + " 마감 역산", tags: ["공개 자료"], src: "※ 출처: " + cd.round.source,
         columns: [txt("항목", "k", 22), txt("값", "v", 40)], rows: [["차수", cd.round.label], ["상태", cd.upcoming ? "시작 전" : cd.onTrack ? "일정 안" : "뒤처짐"], ["기간 경과", cd.elapsedPct + "%"], ["처리 완료", cd.donePct + "%"], ["남은 가구", cd.upcoming ? "—" : cd.remaining + "가구"], ["하루 처리량", cd.upcoming ? "—" : cd.perWorkday + "가구"], ["설명", cd.message]], total: false }],
      sec("report"), ["V1", "S2", "R6"]);
  };
  // ⑤ 명단 정리
  B.intake = function () {
    var x = M().intake();
    if (!x) return null;
    var c = x.c, row = function (it) { return [it.label, it.area || "", it.prior ? it.prior.round : "", it.prior ? it.prior.reasonLabel : "", it.why || ""]; };
    var cols = [txt("가구", "l", 12), txt("읍면동", "a", 11), txt("지난 차수", "r", 12), txt("지난 비해당 사유", "p", 24), txt("이유", "w", 40)];
    return head("명단 정리 결과 — " + x.last.at.slice(0, 10), "받은 명단 " + c.items.length + "곳 중 다시 볼 집 " + c.review.length + "곳, 확인만 할 집 " + c.check.length + "곳" + (c.unknown.length ? ", 명단에 없는 번호 " + c.unknown.length + "개" : "") + "입니다.",
      [{ k: "받은 명단", v: c.items.length, u: "곳", type: "int" }, { k: "다시 볼 집", v: c.review.length, u: "곳", s: "방문·확인", type: "int" }, { k: "확인만 할 집", v: c.check.length, u: "곳", s: "지난 사유가 그대로인지", type: "int" }],
      [{ name: "다시 볼 집", title: "<표 1> 다시 볼 집 — 방문·확인", tags: ["가상"], src: "※ 출처: 지난 차수 기록은 시연용 가상 값", columns: cols, rows: nonEmpty(c.review.map(row), 5), total: false },
       { name: "확인만 할 집", title: "<표 2> 확인만 할 집 — 지난 사유가 그대로인지", tags: ["가상"], src: "※ 출처: 지난 차수 기록은 시연용 가상 값", columns: cols, rows: nonEmpty(c.check.map(row), 5), total: false },
       { name: "명단에 없는 번호", title: "<표 3> 닿음 가상 명단에 없는 번호", tags: ["가상"], columns: [txt("가구 번호", "i", 14)], rows: nonEmpty(c.unknown.map(function (i) { return [i]; }), 1), total: false }],
      sec("intake"), ["V1", "V3"]);
  };
  // 가구 명단(전체)
  B.list = function () {
    var rows = O().rows(), picked = O().picked();
    var list = rows.map(function (r) {
      var sig = (r.signals || []).map(function (x) { return (x.kind === "request" ? "요청 · " : x.kind === "tip" ? "제보 · " : "시도 · ") + x.text; }).join(" / ");
      return [r.rank, r.h.label, r.h.area, picked.indexOf(r.h.id) >= 0 ? "담음" : "", r.pinned ? "앞으로 고정" : "", sig, O().reason(r), O().memberText(r.h), oldMark(r.h)];
    });
    var by = {}; rows.forEach(function (r) { by[r.h.area] = (by[r.h.area] || 0) + 1; });
    var area = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).map(function (a) { return [a, by[a]]; });
    var OHd = OH(), ohRows = OHd ? area.map(function (a) { var x = OHd.get().areas[a[0]] || {}; return [a[0], x.전체동수 != null ? x.전체동수 - x.미상 : null, x.노후동수 != null ? x.노후동수 : null]; }) : [];
    return head("가구 명단 — " + ymd(), "발굴 명단 " + rows.length + "가구 · 오늘 담은 집 " + picked.length + "곳 · 가구가 가장 많은 곳은 " + (area[0] ? area[0][0] + "(" + area[0][1] + "가구)" : "—") + "입니다.",
      [{ k: "발굴 명단", v: rows.length, u: "가구", s: "‘읍면별’ 시트 합계(수식)", type: "int", ref: { sheet: "읍면별", col: "n" } }, { k: "오늘 담은 집", v: picked.length, u: "곳", type: "int" }],
      [{ name: "가구 명단", title: "<표 1> 발굴 가구 명단(방문 순서를 정한 근거)", tags: ["가상"], landscape: true, note: "위험 판단은 정보원 명단 그대로이고, 닿음은 방문 순서 근거만 붙입니다. 최종 순서는 담당자.", src: "※ 출처: 한국사회보장정보원 발굴 명단 모양을 본뜬 시연용 가상 데이터",
         columns: [int("순번", "no", 6), txt("가구", "l", 11), txt("읍면동", "a", 10), txt("담기", "p", 7), txt("고정", "f", 10), txt("지역 신호", "s", 26), txt("방문 순서를 정한 근거", "w", 36), txt("구성", "m", 18), txt("오래된 집(가상)", "oh", 15)], rows: nonEmpty(list, 9), total: false },
       { name: "읍면별", title: "<표 2> 읍면별 가구 수", unit: "단위: 가구", tags: ["가상"], src: "※ 출처: 가상 가구(시연)",
         columns: [txt("읍면동", "a", 14), int("가구", "n", 10), { key: "r", h: "비율", type: "pct", w: 9, fx: "IF({n:sum}=0,0,{n}/{n:sum})", calc: function (gg, cx) { var t2 = cx.sum("n"); return t2 ? gg("n") / t2 : 0; } }], rows: nonEmpty(area, 3), total: area.length ? "합계" : false }].concat(ohRows.length ? [
       { name: "오래된 집", title: "<표 3> 읍면별 30년 넘은 주택 비율", unit: "단위: 동(주거용 건물 동 수 기준)", tags: ["공공데이터"], note: "사용승인일이 기준일보다 30년 이상 앞선 단독·공동주택 주건축물. 사용승인일 공란은 뺐습니다. 명단의 «오래된 집» 칸은 이 비율로 가상 가구에 붙인 시연용 표시입니다.",
         src: "※ " + OHd.sourceLine(OHd.get()),
         columns: [txt("읍면동", "a", 14), int("주거용 건물", "t", 12), int("30년 넘은 건물", "o", 14), { key: "r", h: "비율", type: "pct", w: 9, fx: "IF({t}=0,0,{o}/{t})", calc: function (gg) { return gg("t") ? gg("o") / gg("t") : 0; } }], rows: ohRows, total: "합계" }] : []),
      sec("list"), ["V1"].concat(ohIds()));
  };
  // 상담 기록 — 저장된 연계
  B.record = function () {
    var links = O().links(), svc = O().services(), name = function (id) { for (var i = 0; i < svc.length; i++) if (svc[i].id === id) return svc[i].name; return id; };
    var rows = []; links.forEach(function (l) { (l.serviceIds || []).forEach(function (id, i) { rows.push([mdhm(l.at), l.label, l.area || "", (l.serviceNames && l.serviceNames[i]) || name(id)]); }); });
    var by = {}; rows.forEach(function (r) { by[r[3]] = (by[r[3]] || 0) + 1; });
    var svcRows = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).map(function (k) { return [k, by[k]]; });
    return head("상담 기록 · 저장된 연계 — " + ymd(), rows.length ? "연계 저장 " + links.length + "건(서비스 " + rows.length + "개) · 가장 많이 연계한 서비스는 «" + svcRows[0][0] + "»입니다." : "아직 저장된 연계가 없습니다.",
      [{ k: "연계 저장", v: links.length, u: "건", type: "int" }, { k: "연계한 서비스", v: rows.length, u: "개", s: "‘서비스별’ 시트 합계(수식)", type: "int", ref: { sheet: "서비스별", col: "n" } }],
      [{ name: "연계 기록", title: "<표 1> 저장된 연계(최근 순)", tags: ["가상"], note: "정식 상담 기록은 행복이음에 합니다. 이 표는 닿음에서 «연계 저장»을 누른 기록입니다.", src: "※ 출처: 이 기기 연계 기록 · 가구는 가상 · 서비스 이름은 한국사회보장정보원 복지서비스 목록",
         columns: [txt("일시", "t", 17), txt("가구", "l", 12), txt("읍면동", "a", 11), txt("연계 서비스", "s", 40)], rows: nonEmpty(rows.reverse(), 4), total: false },
       { name: "서비스별", title: "<표 2> 서비스별 연계 수", unit: "단위: 건", tags: ["가상"], columns: [txt("서비스", "s", 36), int("연계", "n", 9)], rows: nonEmpty(svcRows, 2), total: svcRows.length ? "합계" : false }],
      sec("record"), ["V1", "D1", "S2"]);
  };
  // 보조: 도입 비용·탄소(추정)
  var COST_LABEL = { households: "시군 세대 수(세대)", officers: "담당자 수(명)", visitDays: "1명 월 방문일(일)", visitsPerDay: "하루 방문(곳)", aiPerVisit: "방문 1곳당 AI 호출(회)", dailyCap: "하루 AI 호출 상한(회)", kmPerL: "연비(km/L)", saveRate: "이동 거리 단축률(비율)" };
  B.cost = function () {
    var X = window.DaeumExpand; if (!X || !doc.getElementById("cost-officers")) return null;
    var i = {}; Object.keys(X.DEFAULTS).forEach(function (k) { var e = doc.getElementById("cost-" + k); if (e) i[k] = e.value; });
    var c = X.calc(i), r = function (n) { return Math.round(n); };
    return head("도입 비용 · 탄소(추정) — " + ymd(), "담당자 " + c.input.officers + "명 기준 AI 월 비용 약 " + r(c.aiMonth).toLocaleString("ko-KR") + "원, 연 도입 비용 " + r(c.yearLow).toLocaleString("ko-KR") + "~" + r(c.yearHigh).toLocaleString("ko-KR") + "원, 연 CO₂ 감소 약 " + r(c.co2Year).toLocaleString("ko-KR") + "kg(추정)입니다.",
      [{ k: "AI 월 비용(추정)", v: r(c.aiMonth), u: "원", type: "int" }, { k: "연 도입 비용(하한)", v: r(c.yearLow), u: "원", type: "int" }, { k: "연 도입 비용(상한)", v: r(c.yearHigh), u: "원", type: "int" }, { k: "연 CO₂ 감소(추정)", v: r(c.co2Year), u: "kg", type: "int" }],
      [{ name: "입력값", title: "<표 1> 넣은 값", columns: [txt("항목", "k", 26), { key: "v", h: "값", type: "dec", w: 12 }], rows: Object.keys(c.input).map(function (k) { return [COST_LABEL[k] || k, +c.input[k]]; }), total: false, note: "산식 정본: 01_리서치/MN-D02_도입비용_탄소_추정.md §9" },
       { name: "계산 결과", title: "<표 2> 계산 결과(추정)", columns: [txt("항목", "k", 30), int("값", "v", 14), txt("단위", "u", 8)],
         rows: [["월 방문일(담당자 × 방문일)", c.days, "일"], ["월 방문", c.visits, "곳"], ["AI 월 비용", r(c.aiMonth), "원"], ["연 도입 비용(하한)", r(c.yearLow), "원"], ["연 도입 비용(상한)", r(c.yearHigh), "원"], ["월 이동(명단 순)", r(c.kmNaive), "km"], ["월 이동 단축", r(c.kmCut), "km"], ["월 CO₂ 감소", r(c.co2Cut), "kg"], ["연 CO₂ 감소", r(c.co2Year), "kg"]], total: false,
         src: "※ " + [X.COST_SRC.co2, X.COST_SRC.ai, X.COST_SRC.km, X.COST_SRC.hh].join(" / ") }],
      sec("cost"), ["R1", "R2", "S1", "M1"]);
  };
  // 보조: 다른 시군 보기(공개 통계)
  B.region = function () {
    var X = window.DaeumExpand, R = (X && X.regions && X.regions()) || window.__DAEUM_REGIONS_GB__, sel = doc.getElementById("rgPick");
    if (!X || !R || !sel) return null;
    var v = X.regionView(R, sel.value); if (!v) return null;
    var rows = v.areas.map(function (a) { return [a.name, a.hh, a.oneRate, a.a65Rate]; });
    return head(v.name + " 읍면동 현황 — 공개 통계", v.name + " 세대 " + v.hh.toLocaleString("ko-KR") + " · 1인 세대 " + (v.oneRate * 100).toFixed(1) + "% · 기초수급 " + (v.basicRate * 100).toFixed(1) + "% · 시군 복지서비스 " + v.d2 + "개입니다.",
      [{ k: "세대", v: v.hh, u: "세대", s: "‘읍면동’ 시트 합계(수식)", type: "int", ref: { sheet: "읍면동", col: "h" } }, { k: "1인 세대 비율", v: v.oneRate, type: "pct" }, { k: "65세 이상 비율", v: v.a65Rate, type: "pct" }, { k: "기초수급 비율", v: v.basicRate, type: "pct" }, { k: "시군 복지서비스", v: v.d2, u: "개", type: "int" }],
      [{ name: "읍면동", title: "<표 1> " + v.name + " 읍면동별 세대·1인 세대·고령 비율", unit: "단위: 세대, %", tags: ["공공데이터"], note: "1인 세대 + 65세 이상 비율이 높은 순입니다.", src: "※ 출처: 행정안전부 주민등록 세대원수별 세대수(15097974)·성별 연령별 인구수(15097972)",
         columns: [txt("읍면동", "a", 14), int("세대", "h", 11), { key: "o", h: "1인 세대", type: "pct", w: 10, total: "none" }, { key: "g", h: "65세 이상", type: "pct", w: 10, total: "none" }], rows: rows, total: "합계" }],
      sec("region"), ["D12", "D13", "D5", "D2"]);
  };

  // ═══════════ 단추 ═══════════
  var ICO = '<svg class="d-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>';
  var NAME = { today: "오늘", requests: "주민요청", route: "하루방문시각표", contacts: "다시찾을집", board: "연계누락", report: "현황", intake: "명단정리", list: "가구명단", record: "상담기록", cost: "도입비용", region: "다른시군" };
  function say(btn, msg) { var s = btn.parentNode.querySelector(".xl-st"); if (s) { s.textContent = ""; setTimeout(function () { s.textContent = msg; }, 30); } }
  function run(key, btn) {
    var spec;
    try { spec = B[key](); } catch (e) { if (window.console) console.error("[닿음 엑셀]", e); say(btn, "엑셀을 만들지 못했습니다 — 화면을 한 번 연 뒤 다시 눌러 주세요."); return; }
    if (!spec) { say(btn, key === "intake" ? "먼저 명단을 넣고 «정리하기»를 눌러 주세요." : "아직 내보낼 자료가 없습니다."); return; }
    btn.disabled = true;
    needXlsx().then(function (X) { return X.download(spec, "닿음_" + NAME[key] + "_" + ymd().replace(/-/g, "") + ".xlsx"); })
      .then(function () { say(btn, "엑셀 파일을 내려받았습니다(시트 " + (spec.sheets.length + 2) + "개)."); if (window.DaeumUI) DaeumUI.haptic("success"); })
      .catch(function () { say(btn, "엑셀 파일을 만들지 못했습니다. 잠시 뒤 다시 눌러 주세요."); })
      .then(function () { btn.disabled = false; });
  }
  function makeBar(key, label) {
    var bar = doc.createElement("div"); bar.className = "xl-bar"; bar.setAttribute("data-xl-bar", key);
    bar.innerHTML = '<button type="button" class="d-btn d-btn-s xl-btn" data-xl="' + key + '" data-h="light">' + ICO + '<span>엑셀로</span><span class="sr"> — ' + label + ' 내려받기</span></button><span class="xl-st small" role="status" aria-live="polite"></span>';
    return bar;
  }
  // 단추 자리: 화면 맨 위(슬롯 밖이라 다시 그려도 남는다)
  var PLACE = {
    today: ["tab-today", "오늘 찾아갈 집 전체"], route: ["tab-route", "하루 방문 시각표"], contacts: ["tab-contacts", "재시도 일정·시도 기록"],
    board: ["tab-board", "연계 누락·미신청"], intake: ["tab-intake", "명단 정리 결과"], list: ["tab-list", "가구 명단 전체"], record: ["tab-record", "저장된 연계"],
    cost: ["tab-cost", "도입 비용 계산"], region: ["tab-region", "시군 읍면동 현황"], report: ["statsRoot", "현황 대시보드"], requests: ["moreToday", "주민 요청 목록"]
  };
  function mount() {
    Object.keys(PLACE).forEach(function (key) {
      var host = doc.getElementById(PLACE[key][0]); if (!host || host.querySelector('[data-xl-bar="' + key + '"]')) return;
      var bar = makeBar(key, PLACE[key][1]);
      if (key === "report") { var h3 = host.querySelector("h3"); host.insertBefore(bar, h3 ? h3.nextSibling : host.firstChild); }
      else if (key === "requests") { var body = host.querySelector(".tm-body"); (body || host).insertBefore(bar, (body || host).firstChild); }
      else host.insertBefore(bar, host.firstChild);
    });
  }
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-xl]"); if (!b || !B[b.getAttribute("data-xl")]) return;
    e.preventDefault(); run(b.getAttribute("data-xl"), b);
  });
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", mount); else mount();
  doc.addEventListener("daeum:officer-show", mount);
  window.DaeumXlsxOut = { build: function (key) { return B[key] ? B[key]() : null; }, keys: Object.keys(B) };
})();
