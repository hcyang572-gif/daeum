/* 복지 사각지대 현장 업무 도우미(닿음) — 보고 탭(#docs·#perf) — 실적·사후관리 P3(perfView·bindPerf) · 문서함 P2(docsView·bindDocs·docModel·getDoc·printDoc) · 가구별 기록(hrecView·bindHrec) · A4 출력 틀(docPreview·sheet·paper) · hwpx(d1Hwpx·d2Hwpx·d5Hwpx·d7Hwpx·d8Hwpx)
   101회차 ⚙️ 파로(2026-11-14): app/app.js 에서 그대로 옮겨 나눔(동작 변경 0). 화면 함수 본문은 app.js 때와 같은 글자·같은 들여쓰기.
   잇는 법: app.js 가 원래 자리 순서대로 DaeumTabs.report(AK) 를 부른다. AK = 공통 이름 창구(app.js·다른 탭의 이름을 «읽을 때의 값»으로 돌려줌).
   받는 이름은 relink() 가 지역 변수로 채우고(부를 때 한 번 + app.js 가 모든 탭을 읽은 뒤 한 번 더), 여러 파일이 함께 바꾸는 값은 AK.이름 으로 읽고 쓴다. */
(window.DaeumTabs = window.DaeumTabs || {}).report = function (AK) {
  "use strict";
  var F, SY, NT, SH, U, RCP, BP, BY, W, RM_, app, I, ii, A, LS_DOCS, LS_FILL, esc, lsGet, lsSet, ymd, fnm, md, mdDot, hm, clip, vib, uniq, meta,
      listIds, roundYm, logs, prAll, prToggle, attempts, plan, neighborLog, deadline, ageLine, days, lastLog, statusOf, SIGN_OF, top, qv, qcards, FD,
      isField, needSvc, askedOf, refWhyOf, memoNoWhy, reopenRec, copy, toast, C2, C3, colTo, render;
  function relink() {
    F = AK.F; SY = AK.SY; NT = AK.NT; SH = AK.SH; U = AK.U; RCP = AK.RCP; BP = AK.BP; BY = AK.BY;
    W = AK.W; RM_ = AK.RM_; app = AK.app; I = AK.I; ii = AK.ii; A = AK.A; LS_DOCS = AK.LS_DOCS; LS_FILL = AK.LS_FILL;
    esc = AK.esc; lsGet = AK.lsGet; lsSet = AK.lsSet; ymd = AK.ymd; fnm = AK.fnm; md = AK.md; mdDot = AK.mdDot; hm = AK.hm;
    clip = AK.clip; vib = AK.vib; uniq = AK.uniq; meta = AK.meta; listIds = AK.listIds; roundYm = AK.roundYm; logs = AK.logs; prAll = AK.prAll;
    prToggle = AK.prToggle; attempts = AK.attempts; plan = AK.plan; neighborLog = AK.neighborLog; deadline = AK.deadline; ageLine = AK.ageLine; days = AK.days; lastLog = AK.lastLog;
    statusOf = AK.statusOf; SIGN_OF = AK.SIGN_OF; top = AK.top; qv = AK.qv; qcards = AK.qcards; FD = AK.FD; isField = AK.isField; needSvc = AK.needSvc;
    askedOf = AK.askedOf; refWhyOf = AK.refWhyOf; memoNoWhy = AK.memoNoWhy; reopenRec = AK.reopenRec; copy = AK.copy; toast = AK.toast; C2 = AK.C2; C3 = AK.C3;
    colTo = AK.colTo; render = AK.render;
  }
  relink();
  // ═════ P3 실적·사후관리 — 명단 진도·읍면별·이번 주 할 일(약속·재방문·연계 뒤 확인) ═════
  // 104회차 ⚙️ 파로C V4-3(정본 시안 v4 Version 16 perf): 실적·사후관리 8칸 — 칸마다 «작은 이름표 + 굵은 한 줄 결론 + 그래프 + 근거 각주».
  //   숫자 기준 하나: 처리 = 명단 «처리여부»(오늘 탭 listStats 와 같은 규칙) · 방문·상담 = 방문 기록 · 연계 = 연계 저장소(links)·결과(outcomes) + 이 화면 결과 칩.
  //   배열: 폰 1단(진도→사후관리→근무일→흐름→서비스→위기→추이→차수) · 폴드·태블릿 [진도·흐름][사후관리·근무일+추이][위기·서비스][차수·읍면] · PC 12칸 [4·4·4][8·4][4·4·4].
  var LS_LRES = "daeum.s12.linkRes", LRES = [["got", "받음"], ["wait", "기다림"], ["no", "안 됨"], ["lost", "연락 안 됨"]], todoMore = false;
  function pxCss() { if (typeof document === "undefined" || !document.getElementById || document.getElementById("pxCss")) return; var l = document.createElement("link"); l.id = "pxCss"; l.rel = "stylesheet"; l.href = "app/tab_report.css?v=s12z109"; document.head.appendChild(l); } // 연결 지점: index.html 에 한 줄 넣으면 이 함수는 할 일 없음
  function isOffD(d) { return F.util && F.util.isOff ? F.util.isOff(d) : d.getDay() % 6 === 0; }
  function wdCount(a, b) { var n = 0, d = U.startOfDay(a); b = U.startOfDay(b); while (d < b) { d = new Date(d.getTime() + 864e5); if (!isOffD(d)) n++; } return n; }
  function isProc(x) { return /처리\s*완료|완료/.test((x || {}).proc || ""); }
  /** 연계 한 건의 결과: 이 화면 칩 > 결과 저장소(결정 확인 = 받음 · 신청함 = 기다림 · 안 하기로 = 안 됨) > 안내만 함 = 기다림 */
  function linkRes(l, oc, lr) { if (lr[l.id]) return lr[l.id]; var o = oc[l.id]; return !o || o.result === "applied" ? "wait" : o.result === "not_applied" ? "no" : "got"; }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function perfModel(now) {
    now = now || new Date();
    var ids = listIds(), m = meta(), today = ymd(now), dl = deadline(), ds = days(), per = dl.perDay || 5;
    var proc = ids.filter(function (id) { return isProc(m[id]); }).length, un = ids.length - proc;
    var dv = ds.filter(function (d) { return d.ids.some(function (id) { return statusOf(id) !== "planned"; }); }).pop() || null, d1 = { n: dv ? dv.n : 1, visit: 0, met: 0, absent: 0 };
    if (dv) dv.ids.forEach(function (id) { var s = statusOf(id); if (s !== "planned") d1.visit++; if (s === "done") d1.met++; if (s === "absent") d1.absent++; });
    var wk = weekRange(now), from6 = new Date(wk.from.getTime() - 35 * 864e5), LG = logs().filter(function (l) { return new Date(l.at) >= from6; });
    var links = F.store.get("links", []) || [], oc = F.store.get("outcomes", {}) || {}, lr = lsGet(LS_LRES, {}) || {};
    var lk6 = links.filter(function (l) { return new Date(l.at) >= from6; }), lkR = lk6.map(function (l) { return linkRes(l, oc, lr); });
    var got = lkR.filter(function (r) { return r === "got"; }).length, dec = lkR.filter(function (r) { return r === "got" || r === "no"; }).length;
    var fn = [["방문", LG.length], ["만남·상담", LG.filter(function (l) { return l.result === "met"; }).length], ["연계 의뢰", lk6.length], ["서비스 받음", got]];
    // 연계 서비스별(지난 6주가 비면 전체) — [이름, [받음, 기다림, 안 됨, 연락 안 됨]]
    var svS = {}, svL = lk6.length ? lk6 : links, RK = LRES.map(function (x) { return x[0]; });
    svL.forEach(function (l) { var j = RK.indexOf(linkRes(l, oc, lr)); (l.serviceNames || []).forEach(function (n) { var k = String(n).replace(/\s*(생계지원|서비스)$/, ""); (svS[k] = svS[k] || [0, 0, 0, 0])[j]++; }); });
    var sv = Object.keys(svS).map(function (k) { return [k, svS[k]]; }).sort(function (a, b) { return sum(b[1]) - sum(a[1]); }).slice(0, 5);
    // 위기 유형 — 명단 위기정보의 주된 신호 1개(첫 지표)
    var IN = AK.IND || {}, crS = {};
    ids.forEach(function (id) { var ind = (BY[id] || {}).indicators || {}, k = Object.keys(ind).filter(function (x) { return ind[x]; })[0]; if (k) { var nm = IN[k] || k; crS[nm] = (crS[nm] || 0) + 1; } });
    var cr = Object.keys(crS).map(function (k) { return [k, crS[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6);
    // 사후관리 — 약속·연계 뒤 확인·다시 방문(이번 주 안) + 끝난 것
    var prs = prAll(), ac = F.aftercare.schedule(links, oc, F.store.get("followups", {}), now), att = attempts(), wk1 = ymd(wk.to), todo = [];
    var nextD = ds.filter(function (d) { return d.ids.some(function (id) { return statusOf(id) === "planned"; }); })[0];
    prs.forEach(function (p) { if (!p.done && p.due && p.due <= wk1) todo.push({ k: "p", id: p.id, t: p.householdId + " " + p.text, s: "약속", due: p.due, late: p.due < today }); });
    ac.forEach(function (x) { if (/today|overdue|soon/.test(x.state) && x.date <= wk1) todo.push({ k: "f", id: x.key, lid: x.linkId, t: x.householdId + " " + x.stepLabel, s: x.services + " 연계 뒤", due: x.date, late: x.state === "overdue" }); });
    ids.forEach(function (id) { if (statusOf(id) === "absent") { var vt = F.visitTime.profile(att, id, { neighborLog: neighborLog() }); todo.push({ k: "v", id: "V:" + id, t: id + " 다시 방문", s: "부재 " + vt.absences.length + "회" + (vt.best ? ", " + vt.best.label : "") + " · 방문 기록 저장 시 자동으로 끝남", due: nextD && nextD.date ? nextD.date : ymd(U.addWorkdays(now, 1)), late: false }); } });
    todo.sort(function (a, b) { return (b.late ? 1 : 0) - (a.late ? 1 : 0) || (a.due < b.due ? -1 : a.due > b.due ? 1 : 0); });
    var doneN = prs.filter(function (p) { return p.done; }).length + ac.filter(function (x) { return x.state === "done"; }).length, lateN = todo.filter(function (x) { return x.late; }).length;
    // 주별 추이(6주) · 이번 주 근무일 · 다음 주
    var wks = [5, 4, 3, 2, 1, 0].map(function (k) { var f = new Date(wk.from.getTime() - k * 7 * 864e5), t = new Date(f.getTime() + 7 * 864e5), o = { f: f, n: 0, met: 0 };
      LG.forEach(function (l) { var x = new Date(l.at); if (x >= f && x < t) { o.n++; if (l.result === "met") o.met++; } }); return o; });
    function evOf(d) {
      var ev = [];
      ds.forEach(function (x) { if (x.date === d) ev.push(x.n + "일차 " + x.ids.length + "가구"); });
      prs.forEach(function (p) { if (!p.done && p.due === d) ev.push(p.householdId + " 약속"); });
      ac.forEach(function (x) { if (x.date === d && x.state !== "done") ev.push(x.householdId + " 확인"); });
      if (dl.until === d) ev.push("명단 기한");
      return ev;
    }
    var week = [0, 1, 2, 3, 4].map(function (i) { var d = ymd(new Date(wk.from.getTime() + i * 864e5)); return { d: d, ev: evOf(d) }; });
    var nxt = [7, 8, 9, 10, 11].map(function (i) { var d = ymd(new Date(wk.from.getTime() + i * 864e5)); return { d: d, ev: evOf(d) }; }).filter(function (x) { return x.ev.length; });
    // 차수별 처리(지난 차수 = 방문 기록·시도가 있는 가구) · 읍면별 처리(이번 차수)
    var rounds = (F.store.get("rounds", []) || []).slice().sort(function (a, b) { return a.ym < b.ym ? -1 : 1; }), cym = roundYm(), seen = {};
    logs().forEach(function (l) { seen[l.household_no] = 1; }); att.forEach(function (t) { seen[t.householdId] = 1; });
    var rd = rounds.filter(function (r) { return r.ym !== cym; }).slice(-2).map(function (r) { var L = r.ids || []; return [r.ym, L.length, L.filter(function (id) { return seen[id]; }).length]; }).concat([[cym, ids.length, proc]]);
    var ar = {}; ids.forEach(function (id) { var a = BY[id].area; ar[a] = ar[a] || [0, 0]; ar[a][0]++; if (isProc(m[id])) ar[a][1]++; });
    var areas = Object.keys(ar).map(function (a) { return [a, ar[a][0], ar[a][1]]; }).sort(function (a, b) { return b[2] - a[2] || b[1] - a[1]; }).slice(0, 6);
    return { total: ids.length, proc: proc, un: un, per: per, need: Math.ceil(un / per), left: dl.until ? wdCount(now, new Date(dl.until + "T12:00:00")) : null, d1: d1,
      fn: fn, got: got, dec: dec, lkN: lk6.length, sv: sv, cr: cr, todo: todo, doneN: doneN, lateN: lateN, planN: todo.length - lateN, wks: wks, week: week, nxt: nxt, rd: rd, areas: areas, today: today };
  }
  function pxBlk(k, kick, ccl, body, ft, t) { return '<section class="card px-b" data-k="' + k + '"><div class="px-kick' + (t ? " t" : "") + '">' + kick + '</div><b class="px-ccl">' + ccl + "</b>" + body + (ft ? '<div class="px-ft">' + ft + "</div>" : "") + "</section>"; }
  /** 막대 줄: rows = [이름, 폭%, 오른쪽 글, 색 클래스] */
  function pxBars(rows, cls) { return '<div class="px-bars">' + rows.map(function (r) { return '<div class="px-bar' + (cls ? " " + cls : "") + '"><span>' + esc(r[0]) + '</span><span class="px-tr"><i class="' + (r[3] || "") + '" style="width:' + Math.max(0, Math.min(100, Math.round(r[1]))) + '%"></i></span><span class="v">' + esc(r[2]) + "</span></div>"; }).join("") + "</div>"; }
  function pct(a, b) { return b ? Math.round(a / b * 100) + "%" : "—"; }
  function perfView() {
    pxCss();
    var now = new Date(), M = perfModel(now), mode = (typeof document !== "undefined" && document.documentElement && document.documentElement.getAttribute("data-mode")) || "phone", wide = mode !== "phone", pc = mode === "pc";
    if (!M.total) return top("perf", "<strong>실적</strong>가상 데이터") + '<main class="wrap"><div class="emptyc blk"><b>첫 방문을 기록하면</b>처리 가구와 남은 가구가 여기서 바로 셈해집니다 · 처리 진도·방문에서 연계까지·사후관리·위기 유형이 쌓입니다.<a class="btn pri" href="#today" data-pick="1" data-dock="1" data-dock-sub="행복이음 «발굴대상자 조회» 엑셀">명단 불러오기</a></div></main>';
    var ic = function (n) { return (ii && ii(n)) || ""; };
    // A 처리 진도
    var C = 2 * Math.PI * 50, len = C * M.proc / M.total;
    var A_ = pxBlk("a", "처리 진도 · 이번 차수 " + esc(roundYm()), "남은 " + M.un + "가구 · 하루 " + M.per + "가구면 " + M.need + "근무일" + (M.left != null ? ", 마감까지 " + M.left + "근무일" : ""),
      '<div class="px-don"><div class="px-dn"><svg viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="50" fill="none" stroke="#E3DFD7" stroke-width="16"/><circle cx="66" cy="66" r="50" fill="none" stroke="#1F6676" stroke-width="16" stroke-dasharray="' + len.toFixed(1) + " " + C.toFixed(1) + '"/></svg><span><b>' + pct(M.proc, M.total) + "</b><small>" + M.proc + "/" + M.total + " 가구</small></span></div>" +
      '<div class="px-led">' + [["처리", M.proc], ["미처리", M.un], [M.d1.n + "일차 방문", M.d1.visit], ["상담", M.d1.met, M.d1.absent ? "부재 " + M.d1.absent : ""]].map(function (x) { return "<div><b>" + x[1] + "</b><span>" + x[0] + "</span>" + (x[2] ? "<em>" + x[2] + "</em>" : "") + "</div>"; }).join("") + "</div></div>",
      ic("db") + "<span>처리 = 명단 «처리여부» 열 · 오늘 탭·명단 확인과 같은 숫자</span>", true);
    // B 방문에서 연계까지
    var f = M.fn, fmx = Math.max(1, f[0][1]);
    var B_ = pxBlk("b", "방문에서 연계까지 · 지난 6주", "방문 " + f[0][1] + "번 중 " + f[1][1] + "번 상담이 되었고, " + (M.dec ? "결과가 난 연계 " + M.dec + "건 중 " + M.got + "건이 서비스를 받았습니다" : "연계 " + f[2][1] + "건은 결과를 기다리고 있습니다"),
      pxBars(f.map(function (r, i) { return [r[0], r[1] / fmx * 100, r[1] + (i ? " · " + pct(r[1], i === 3 ? M.dec : f[i - 1][1]) : ""), i === 3 ? "g" : i ? "" : "l"]; }), "fn"),
      ic("help") + "<span>상담률 = 상담 ÷ 방문 · 연계율 = 연계 ÷ 상담 · 받음률 = 받음 ÷ 결과 난 연계</span>", true);
    // C 사후관리
    var lr = lsGet(LS_LRES, {}) || {}, links = F.store.get("links", []) || [], oc = F.store.get("outcomes", {}) || {}, KC = { p: "약속", f: "확인", v: "재방문" }, TC = { p: "g", f: "t", v: "w" };
    function chips(x) {
      if (x.k !== "f") return "";
      var l = links.filter(function (z) { return z.id === x.lid; })[0], cur = l ? linkRes(l, oc, lr) : "wait";
      return '<span class="px-chips" role="group" aria-label="연계 결과">' + LRES.map(function (c) { return '<button type="button" class="chip" data-lres="' + esc(x.lid) + '" data-v="' + c[0] + '" aria-pressed="' + (cur === c[0]) + '">' + c[1] + "</button>"; }).join("") + "</span>";
    }
    function dueTxt(x) { return x.late ? U.daysBetween(x.due, now) + "일 지남" : x.due === M.today ? "오늘" : esc(md(x.due)); }
    var strip = '<div class="px-strip"><i class="ok" style="flex:' + M.doneN + '"></i><i class="pl" style="flex:' + M.planN + '"></i><i class="lt" style="flex:' + M.lateN + '"></i></div>' +
      '<div class="px-lg"><span><i class="ok"></i>끝남 ' + M.doneN + '</span><span><i class="pl"></i>예정 ' + M.planN + '</span><span><i class="lt"></i>기한 지남 ' + M.lateN + "</span></div>";
    var open = M.todo.length, shown = todoMore ? M.todo : M.todo.slice(0, 3);
    function ckb(x) { return x.k === "v" ? "" : '<button type="button" class="px-ck" data-todo="' + esc(x.id) + '" data-k="' + x.k + '" aria-label="' + esc(x.t) + ' 끝냄 표시"></button>'; } // 옛 실적 «끝냄 표시» 기능 유지(시안엔 없음 — 보고 참조)
    var list = '<div class="px-lst">' + shown.map(function (x) { return '<div class="px-li' + (x.late ? " late" : "") + '">' + ckb(x) + '<span class="tag ' + TC[x.k] + '">' + KC[x.k] + '</span><span class="lc"><b>' + esc(x.t) + "</b><span>" + esc(x.s) + "</span>" + chips(x) + '</span><span class="rk">' + dueTxt(x) + "</span></div>"; }).join("") + "</div>" +
      (!todoMore && open > 3 ? '<button type="button" class="btn t full" data-act="moretodo">' + (open - 3) + "건 더 보기</button>" : "");
    var table = '<table class="px-pt"><thead><tr><th>구분</th><th>가구 · 할 일</th><th>기한</th><th>연계 결과</th></tr></thead><tbody>' + M.todo.map(function (x) { return "<tr" + (x.late ? ' class="late"' : "") + '><td>' + ckb(x) + '<span class="tag ' + TC[x.k] + '">' + KC[x.k] + "</span></td><td><b>" + esc(x.t) + "</b><small>" + esc(x.s) + '</small></td><td class="n">' + dueTxt(x) + "</td><td>" + (x.k === "f" ? chips(x) : "<small>기록 저장 시</small>") + "</td></tr>"; }).join("") + "</tbody></table>";
    var oldest = M.todo.filter(function (x) { return x.late; })[0];
    var C_ = pxBlk("c", "사후관리 · 연계 뒤 확인과 약속", open ? (oldest ? "기한 지난 " + M.lateN + "건부터 · 가장 오래된 것은 " + esc(oldest.t) + "(" + dueTxt(oldest) + ")" : "이번 주 할 일 " + open + "건 · 기한 지난 것은 없습니다") : "이번 주는 다시 볼 집이 없습니다",
      strip + (pc ? table : list), ic("checkC") + "<span>" + (pc ? "안 끝난 " + open + "건 · " : "") + "끝난 " + M.doneN + "건은 실적 보고서에 함께 담깁니다</span>", true);
    // H 이번 주 근무일
    var evN = sum(M.week.map(function (w) { return w.ev.length; })), vdays = M.week.filter(function (w) { return w.ev.some(function (e) { return /일차/.test(e); }); }).length;
    var H_ = pxBlk("h", "이번 주 근무일", "방문 " + vdays + "일 · 일정 " + evN + "건" + (wide && M.nxt.length ? " · 다음 주 미리" : ""),
      '<div class="px-week">' + M.week.map(function (w) { var d = new Date(w.d + "T00:00:00"); return '<div class="' + (w.d === M.today ? "td" : w.d < M.today ? "past" : "") + '"><b>' + W.charAt(d.getDay()) + d.getDate() + "</b>" + w.ev.slice(0, 2).map(function (e) { return '<span class="ev">' + esc(e) + "</span>"; }).join("") + (w.ev.length > 2 ? '<span class="evm">+' + (w.ev.length - 2) + "</span>" : "") + "</div>"; }).join("") + "</div>" +
      (wide && M.nxt.length ? '<div class="px-lst">' + M.nxt.slice(0, pc ? 4 : 3).map(function (x) { return '<div class="px-li"><span class="rk">' + esc(mdDot(x.d)) + '</span><span class="lc"><b>' + esc(x.ev[0]) + "</b><span>" + (x.ev.length > 1 ? "외 " + (x.ev.length - 1) + "건" : "다음 주") + "</span></span></div>"; }).join("") + "</div>" : ""),
      ic("calendar") + "<span>오늘 " + esc(mdDot(M.today)) + " · 방문은 하루 " + M.per + "가구 기준 · 기한·약속은 근무일에 맞춰 들어갑니다</span>");
    // D 위기 유형 · E 연계 서비스별
    var crMx = M.cr.length ? M.cr[0][1] : 1;
    var D_ = pxBlk("d", "위기 유형 · 이번 차수 " + M.total + "가구", M.cr.length ? esc(M.cr[0][0]) + (M.cr[1] ? "·" + esc(M.cr[1][0]) : "") + "이 가장 많습니다" : "위기정보가 아직 없습니다",
      pxBars(M.cr.map(function (r, i) { return [r[0], r[1] / crMx * 100, r[1] + "가구", i < 2 ? "" : "l"]; }), "wl"), ic("db") + "<span>명단 «위기정보» 열의 주된 신호 1개 기준</span>");
    var svMx = Math.max(1, Math.max.apply(null, M.sv.map(function (r) { return sum(r[1]); }).concat([0]))), SC = ["", "l", "r", "n"], svT = [0, 0, 0, 0];
    M.sv.forEach(function (r) { r[1].forEach(function (v, j) { svT[j] += v; }); });
    var E_ = pxBlk("e", "연계 서비스별 · 지난 6주 " + M.lkN + "건", M.sv.length ? esc(M.sv[0][0]) + (M.sv[1] ? "·" + esc(M.sv[1][0]) : "") + " 연계가 가장 많습니다" : "연계 기록이 아직 없습니다",
      '<div class="px-bars">' + M.sv.map(function (r) { var n = sum(r[1]); return '<div class="px-bar wl"><span>' + esc(r[0]) + '</span><span class="px-tr stk"><span style="width:' + Math.round(n / svMx * 100) + '%">' + r[1].map(function (v, j) { return v ? '<i class="' + SC[j] + '" style="flex:' + v + '"></i>' : ""; }).join("") + '</span></span><span class="v">' + n + "건</span></div>"; }).join("") + "</div>" +
      '<div class="px-lg">' + LRES.map(function (c, j) { return '<span><i class="s' + j + '"></i>' + c[1] + " " + svT[j] + "</span>"; }).join("") + "</div>", ic("link") + "<span>결과는 사후관리 칸 칩으로 고칩니다 · 안내·의뢰이며 선정 결정 아님</span>");
    // F 주별 추이
    var wmx = Math.max(1, Math.max.apply(null, M.wks.map(function (w) { return w.n; }))), w0 = M.wks[0].n, w5 = M.wks[5].n;
    var F_ = pxBlk("f", "주별 추이 · 지난 6주", w5 > w0 ? "방문이 주 " + w0 + "건에서 " + w5 + "건으로 늘었습니다" : w5 < w0 ? "이번 주 방문은 " + w5 + "건으로 6주 전(" + w0 + "건)보다 적습니다" : "방문이 주 " + w5 + "건 안팎으로 고릅니다",
      '<div class="px-cols">' + M.wks.map(function (w, i) { return '<div class="' + (i === 5 ? "cur" : "") + '"><b>' + w.n + '</b><span class="pp"><i style="height:' + Math.round(w.n / wmx * 100) + '%"></i><i class="l" style="height:' + Math.round(w.met / wmx * 100) + '%"></i></span><span>' + (i === 5 ? "이번 주" : (w.f.getMonth() + 1) + "." + w.f.getDate()) + "</span></div>"; }).join("") + "</div>" +
      '<div class="px-lg"><span><i class="pl"></i>방문 ' + sum(M.wks.map(function (w) { return w.n; })) + '</span><span><i class="s1"></i>상담 ' + sum(M.wks.map(function (w) { return w.met; })) + '</span><span><i class="cu"></i>이번 주</span></div>', "");
    // G 차수별 처리 · 읍면별 진도
    var cur = M.rd[M.rd.length - 1], past = M.rd.slice(0, -1), allDone = past.every(function (r) { return r[2] >= r[1]; });
    var gccl = (past.length ? past.map(function (r) { return +r[0].slice(5) + "월"; }).join("·") + " 차수는 " + (allDone ? "모두 처리" : "일부 남음") + ", " : "") + "이번 차수는 " + pct(cur[2], cur[1]) + "입니다";
    var gR = pxBars(M.rd.map(function (r) { return [r[0] + " 차수", r[2] / Math.max(1, r[1]) * 100, r[2] + "/" + r[1], r[2] < r[1] ? "g" : ""]; }), "wl");
    var gA = pxBars(M.areas.map(function (a) { return [a[0], a[2] / Math.max(1, a[1]) * 100, a[2] + "/" + a[1]]; }), "wl");
    var G_ = pxBlk("g", "차수별 처리 · 읍면별 진도", gccl, gR + '<div class="px-ridge"></div>' + gA, "");
    var G1 = pxBlk("g1", "차수별 처리", gccl, gR, ic("db") + "<span>명단 «처리여부» 열 기준 · 지난 차수는 방문 기록이 있는 가구</span>");
    var G2 = pxBlk("g2", "읍면별 처리 · 이번 차수", M.areas.length ? esc(M.areas[0][0]) + "이 " + M.areas[0][2] + "가구로 앞서 있습니다" : "읍면 정보가 없습니다", gA, ic("route") + "<span>같은 날 가까운 읍면끼리 묶어 돕니다</span>");
    function row(cells, spans) { return '<div class="px-row' + (pc ? " p12" : "") + '">' + cells.map(function (c, i) { return '<div class="px-rc"' + (pc ? ' style="grid-column:span ' + spans[i] + '"' : "") + ">" + c + "</div>"; }).join("") + "</div>"; }
    var body = !wide ? A_ + C_ + H_ + B_ + E_ + D_ + F_ + G_ : pc ? row([A_, B_, F_], [4, 4, 4]) + row([C_, H_], [8, 4]) + row([D_, E_, G_], [4, 4, 4]) : row([A_, B_]) + row([C_, H_ + F_]) + row([D_, E_]) + row([G1, G2]);
    return top("perf", "<strong>" + esc(roundYm()) + " 명단 실적</strong>가상 데이터") + '<main class="wrap px-perf">' +
      '<div class="dhead"><h1><span class="px-nw">' + M.total + "가구 중 " + M.proc + '가구 처리,</span> <span class="px-nw">남은 ' + M.un + "가구</span></h1><p>" + M.d1.n + "일차 " + M.d1.visit + "가구를 찾아가 " + M.d1.met + "가구와 상담" + (M.d1.absent ? " · 부재 " + M.d1.absent + "가구는 다시 갑니다" : "") + "</p></div>" + body +
      '<button type="button" class="btn pri" data-act="perfdoc" data-dock="1" data-dock-sub="문서함 · 주간 실적 보고서">' + (I.report || "") + "주간 실적 보고서 보기</button>" +
      '<p class="demo"><span class="samp">가상 데이터</span><span>숫자는 현장 기록을 규칙으로 센 것입니다(손 집계 없음)</span></p></main>';
  }
  function bindPerf() {
    var pd = app.querySelector('[data-act="perfdoc"]'); if (pd) pd.addEventListener("click", function () { vib(); pvOpen = "d5"; pvZ = 1; docSel = "d5"; docHid = null; location.hash = "#docs"; }); // 105회차: 시안 V16 «주간 실적 보고서 보기» = 보고서 보기 화면으로 바로 · 74회차 주 단추: 문서함 «주간·월간 추진 실적 보고»로
    var mt = app.querySelector('[data-act="moretodo"]'); if (mt) mt.addEventListener("click", function () { todoMore = true; vib(); render(); });
    app.querySelectorAll("[data-todo]").forEach(function (b) { b.addEventListener("click", function () {
      var id = b.dataset.todo, k = b.dataset.k;
      if (k === "p") prToggle(id);
      else if (k === "f") F.store.set("followups", F.aftercare.mark(F.store.get("followups", {}), id));
      vib(); render();
    }); });
    app.querySelectorAll("[data-lres]").forEach(function (b) { b.addEventListener("click", function () { var a = lsGet(LS_LRES, {}) || {}; a[b.dataset.lres] = b.dataset.v; lsSet(LS_LRES, a); vib(); render(); }); });
  }

  // ═════ P2 문서함(⑦) ═════
  var DOCS = [
    { k: "d2", nm: "출장 결과 보고(복명서)", sub: "방문한 날 · hwpx 1쪽", meter: [["r", 8], ["a", 3], ["e", 1]] },
    { k: "d1", nm: "상담일지 초안", sub: "행복이음 입력 순서 복사 · 보관 hwpx", meter: [["m", 5], ["a", 4]] },
    { k: "d3", nm: "서비스 연계 의뢰서", sub: "연계 확정 때 · hwpx 1쪽", meter: [["m", 4], ["r", 3], ["a", 2]] },
    { k: "d4", nm: "안내 문자 문안", sub: "이름·주소 빼고 쉬운 말 · 복사", meter: [["m", 2], ["a", 3]] },
    { k: "d5", nm: "주간·월간 추진 실적 보고", sub: "수급권자 현황 15062448 비교 · hwpx", meter: [["r", 9], ["m", 2], ["a", 1]] },
    { k: "d6", nm: "차수 처리 결과 명단", sub: "발굴 명단 + 방문 기록 · xlsx", meter: [["m", 12], ["r", 4]] },
    { k: "d7", nm: "한 장 인계 카드", sub: "선택 · 담당 교체·부재 때 · hwpx 1쪽", meter: [["m", 3], ["r", 6], ["a", 1], ["e", 1]] },
    { k: "d8", nm: "큰 글씨 안내문", sub: "선택 · 어르신 가구에 남김 · hwpx 1쪽", meter: [["r", 4], ["a", 1]] }
  ];
  var DOC_OPT = { d7: 1, d8: 1 }; // 선택 문서 — «만들 문서 N건» 합계에서 뺀다(S12-d 40)
  var docSel = "d2", docDay = null, docHid = null, docOrg = null, docPer = "wk", made1 = {}, docOrgPick = {};
  var pvOpen = null, pvZ = 1, pvSrc = true, pvInl = false; // 105회차 ⚙️ 파로B(⑧-3b · 시안 v4 V16 v4-1·v3-6): «보고서 보기» 화면 — 연 문서·확대 배율·출처 색
  if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("hashchange", function () { if (!/^#docs/.test(location.hash || "")) pvOpen = null; }); // S12-v U14(B9): 사용자가 고른 받는 기관(가구별)
  var docBase = null; // S12-e 43: 지난 방문일(이력)을 고르면 그날이 주간·월간 실적 기간의 기준이 된다(이번 차수면 null = 오늘)
  function curDays() { return days().filter(function (d) { return d.ids.some(function (id) { return statusOf(id) !== "planned"; }); }); }
  /** S12-e 43 문서함 이력 — 이번 차수 계획 밖 방문 기록(지난 차수·지난 몇 주 시연 기록 + 직접 남긴 기록)을 방문한 날별로 묶는다.
      이번 차수 명단 가구의 «순위 매긴 뒤» 기록은 이번 차수 방문일에 이미 들어가므로 뺀다 */
  function histDays() {
    var p = plan(), inPlan = {}, cur = {};
    if (p) p.rows.forEach(function (r) { inPlan[r.household_no] = 1; });
    days().forEach(function (d) { if (d.date) cur[d.date] = 1; });
    var g = {};
    logs().forEach(function (l) {
      if (!BY[l.household_no] || !l.at) return;
      if (inPlan[l.household_no] && (!p || !p.ranked_at || l.at > p.ranked_at)) return;
      var d = ymd(l.at); if (cur[d]) return;
      (g[d] = g[d] || []).push(l);
    });
    return Object.keys(g).sort().map(function (d) { var L = g[d].sort(function (a, b) { return a.at < b.at ? -1 : 1; }); return { n: "h" + d, date: d, ids: uniq(L.map(function (l) { return l.household_no; })), logs: L, past: true }; });
  }
  function reportDays() { return histDays().concat(curDays()).sort(function (a, b) { return (a.date || "9") < (b.date || "9") ? -1 : (a.date || "9") > (b.date || "9") ? 1 : 0; }); }
  var RES2ST = { met: "done", absent: "absent", refuse: "refused" };
  /** 지난 방문일의 한 가구 — 그날 마지막 기록으로 만든다(같은 가구가 뒤에 다시 만나졌어도 그날 결과 그대로) */
  function caseOfLog(l) {
    var memo = l.memo || "", tags = l.tags || [], st = RES2ST[l.result] || "planned";
    var refs = st === "done" ? F.referral.suggest({ text: memo, needs: F.askGuide.detect(memo) }).filter(function (x) { return x !== "emergency"; }) : [];
    return { id: l.household_no, st: st, memo: memo, tags: tags, refs: refs, field: tags.filter(isField), at: l.at, h: BY[l.household_no], past: true };
  }
  function dayCases(dd) {
    if (!dd) return [];
    if (!dd.past) return dd.ids.map(caseOf);
    return dd.ids.map(function (id) { return caseOfLog(dd.logs.filter(function (l) { return l.household_no === id; }).pop()); });
  }
  /** 월요일(주 시작) 날짜 */
  function monOf(d) { var n = U.startOfDay(typeof d === "string" ? new Date(d + "T00:00:00") : d); return ymd(new Date(n.getTime() - ((n.getDay() + 6) % 7) * 864e5)); }
  function wkLbl(mon) { var t = monOf(new Date()); if (mon === t) return "이번 주"; var d = new Date(mon + "T00:00:00"); return (d.getMonth() + 1) + "." + d.getDate() + " 주"; }
  function caseOf(id) {
    var L = lastLog(id), st = statusOf(id), memo = L ? L.memo : "", tags = L && L.tags || [];
    var refs = st === "done" ? F.referral.suggest({ text: memo, needs: F.askGuide.detect(memo) }).filter(function (x) { return x !== "emergency"; }) : [];
    var field = tags.filter(isField);
    return { id: id, st: st, memo: memo, tags: tags, refs: refs, field: field, at: L ? L.at : null, h: BY[id] };
  }
  function weekRange(b) { var n = U.startOfDay(b || docBase || new Date()), mon = new Date(n.getTime() - ((n.getDay() + 6) % 7) * 864e5); return { from: mon, to: new Date(mon.getTime() + 4 * 864e5) }; }
  /** 이번 달 1일 ~ 말일(S12-d 39 월간) */
  function monthRange(b) { var n = U.startOfDay(b || docBase || new Date()); return { from: new Date(n.getFullYear(), n.getMonth(), 1), to: new Date(n.getFullYear(), n.getMonth() + 1, 0) }; }
  /** 실적 보고 저장 키 — 주간 «wk:월요일:d5» · 월간 «mo:YYYY-MM:d5» */
  function perKey(per) { return per === "mo" ? "mo:" + ymd(monthRange().from).slice(0, 7) + ":d5" : "wk:" + ymd(weekRange().from) + ":d5"; }
  function docModel() {
    var rd = reportDays(), cd = rd.filter(function (d) { return !d.past; }), dd = rd.length ? (rd.filter(function (d) { return d.n === docDay; })[0] || cd[cd.length - 1] || rd[rd.length - 1]) : null;
    docBase = dd && dd.past && dd.date ? new Date(dd.date + "T12:00:00") : null;
    var cases = dayCases(dd), met = cases.filter(function (x) { return x.st === "done"; }), ab = cases.filter(function (x) { return x.st === "absent"; });
    var done = lsGet(LS_DOCS, {}) || {}, key = dd ? (dd.past ? "h:" + dd.date : roundYm() + ":" + dd.n) : "";
    var linked = met.filter(function (x) { return x.refs.length; });
    var cnt = { d2: dd ? 1 : 0, d1: met.length, d3: linked.length, d4: ab.length + linked.length, d5: 1, d6: 1, d7: handCands(cases).length, d8: bigCands(cases).length };
    var got = function (k) { return (done[key + ":" + k] || []).length; };
    var wk = weekRange(), wkKey = ymd(wk.from);
    var pend = dd && dd.past ? { d2: 0, d1: 0, d3: 0, d4: 0, d5: 0, d6: 0, d7: 0, d8: 0 } : { d2: Math.max(0, cnt.d2 - got("d2")), d1: Math.max(0, cnt.d1 - got("d1")), d3: Math.max(0, cnt.d3 - got("d3")), d4: Math.max(0, cnt.d4 - got("d4")), d5: (done[perKey(docPer)] || []).length ? 0 : 1, d6: (done["round:" + roundYm() + ":d6"] || []).length ? 0 : 1, d7: Math.max(0, cnt.d7 - got("d7")), d8: Math.max(0, cnt.d8 - got("d8")) };
    // 지난 방문일 = 그때 이미 받은 문서(이력) — 대기 0, 다시 받기·인쇄만
    return { rd: rd, dd: dd, past: !!(dd && dd.past), cases: cases, met: met, ab: ab, linked: linked, cnt: cnt, pend: pend, key: key, wkKey: wkKey, pending: Object.keys(pend).reduce(function (s, k) { return s + (DOC_OPT[k] ? 0 : pend[k]); }, 0) };
  }
  function markDone(M, k, id) {
    var done = lsGet(LS_DOCS, {}) || {}, key = k === "d5" ? perKey(docPer) : k === "d6" ? "round:" + roundYm() + ":d6" : M.key + ":" + k;
    var a = done[key] || []; if (a.indexOf(id) < 0) a.push(id); done[key] = a; lsSet(LS_DOCS, done);
  }
  function fills() { return lsGet(LS_FILL, {}) || {}; }
  /** 복명서 칸 — 칸마다 출처(data 명단·한국사회보장정보원 / rule 규칙 / ai 자동 문장 / empty 입력 필요) */
  function d2Fields(M) {
    var dd = M.dd, logsD = M.cases.filter(function (x) { return x.at; }).map(function (x) { return x.at; }).sort();
    var areas = uniq(dd.ids.map(function (id) { return BY[id].area; }));
    var rf = M.cases.filter(function (x) { return x.st === "refused"; }), sigN = M.cases.filter(function (x) { return x.field.length; }).length;
    var base = M.past ? new Date(dd.date + "T12:00:00") : new Date(), ym = (M.past ? dd.date.slice(0, 7) : roundYm()).split("-"), nextAb = ymd(U.addWorkdays(base, A.retryGap));
    var gist = M.met.slice(0, 3).map(function (x) { return x.id + " " + clip(x.memo.replace(/^확인:[^.]*\.\s*/, ""), 40); });
    var f = fills()[M.key] || {};
    return [
      { k: "출장 일시", src: "rule", v: (dd.date ? mdDot(dd.date).replace(/\.\(/, ".(") : "") + (logsD.length ? " " + hm(logsD[0]) + "~" + hm(logsD[logsD.length - 1]) : "") },
      { k: "출장지", src: "data", v: areas.join(" · ") + "(가구 " + dd.ids.length + ")" },
      { k: "목적", src: "data", v: ym[0] + "년 " + (+ym[1]) + "월 차수 복지사각지대 발굴대상자 현장 확인(한국사회보장정보원 명단)" },
      { k: "결과", src: "rule", v: "만남 " + M.met.length + " · 부재 " + M.ab.length + (rf.length ? " · 거절 " + rf.length : "") + " · 명단 사유 밖 징후 " + sigN + "가구" },
      { k: "요지", src: "ai", v: gist.join(" / ") || "만난 가구 없음" },
      { k: "조치", src: "rule", v: "연계 의뢰서 " + M.linked.length + "건" + (M.ab.length ? " · 재방문 " + mdDot(nextAb) : "") }
    ]; // 78회차 ⓪-4(11-13 호창님 «동행자란인데 해당란은 불필요해»): «동행자» 칸 전면 삭제(필수 검사·화면·hwpx·A4 모두 이 목록에서 나옴) — ⛔ 다시 넣지 않는다
  }
  var SRC_CLS = { data: "var(--src-data)", rule: "var(--src-rule)", ai: "var(--src-ai)", empty: "var(--src-empty)" };
  var MET_SRC = { m: "data", r: "rule", a: "ai", e: "empty" };
  /** 방문한 날 고르기 — 위에는 «이번 차수 방문일»만 둔다(11-03 호창님 «날짜들이 막 생겨나 엉망»).
      지난 날짜는 아래 «주별 문서 이력» 표에서 누른다. 지난 날을 보고 있으면 그날 칩 하나만 더 보인다 */
  function dayPick(M) {
    var g = [], last = null;
    M.rd.filter(function (d) { return !d.past || d.n === M.dd.n; }).forEach(function (d) { var mon = d.date ? monOf(d.date) : "—"; if (!last || last.mon !== mon) { last = { mon: mon, ds: [] }; g.push(last); } last.ds.push(d); });
    return '<div class="dpick dpick-wk" role="group" aria-label="방문한 날(주별)">' + g.map(function (w) {
      return '<span class="dwk-l">' + esc(w.mon === "—" ? "날짜 없음" : wkLbl(w.mon)) + "</span>" + w.ds.map(function (d) { return '<button type="button" data-day="' + d.n + '" aria-pressed="' + (d.n === M.dd.n) + '"' + (d.past ? ' class="past"' : "") + ">" + (d.date ? mdDot(d.date) : d.n + "일차") + "</button>"; }).join("");
    }).join("") + "</div>";
  }
  /** 주별 문서 이력 — 방문한 날마다 생긴 문서 수를 주 단위로 쌓는다(규칙 집계). 지난 주 = 그때 받은 문서, 이번 차수 = 남은 건수 함께 */
  function docHist(M) {
    var done = lsGet(LS_DOCS, {}) || {}, W2 = {}, order = [];
    M.rd.forEach(function (d) {
      var mon = d.date ? monOf(d.date) : "—", cs = dayCases(d), met = cs.filter(function (x) { return x.st === "done"; }), ab = cs.filter(function (x) { return x.st === "absent"; }), lk = met.filter(function (x) { return x.refs.length; });
      if (!W2[mon]) { W2[mon] = { mon: mon, days: [], d2: 0, d1: 0, d3: 0, d4: 0, left: 0, cur: false }; order.push(mon); }
      var o = W2[mon], key = d.past ? "" : roundYm() + ":" + d.n;
      o.days.push(d); o.d2 += 1; o.d1 += met.length; o.d3 += lk.length; o.d4 += ab.length + lk.length;
      if (!d.past) { o.cur = true; var got = function (k) { return (done[key + ":" + k] || []).length; }; o.left += Math.max(0, 1 - got("d2")) + Math.max(0, met.length - got("d1")) + Math.max(0, lk.length - got("d3")) + Math.max(0, ab.length + lk.length - got("d4")); }
    });
    var rows = order.slice(-6).reverse().map(function (m) { var o = W2[m], n = o.d2 + o.d1 + o.d3 + o.d4 + 1;
      return '<tr' + (o.cur ? ' class="cur"' : "") + "><th>" + esc(m === "—" ? "날짜 없음" : wkLbl(m)) + '</th><td class="dh-days">' + o.days.map(function (d) { return '<button type="button" data-day="' + d.n + '"' + (d.n === M.dd.n ? ' aria-current="true"' : "") + ">" + (d.date ? mdDot(d.date) : d.n + "일차") + "</button>"; }).join("") + '</td><td data-src="rule">' + o.d2 + '</td><td data-src="rule">' + o.d1 + '</td><td data-src="rule">' + o.d3 + '</td><td data-src="rule">' + o.d4 + '</td><td data-src="rule">1</td><td class="dh-sum"><b>' + n + "</b>" + (o.cur ? (o.left ? " · " + o.left + "건 남음" : " · 다 받음") : " · 받음") + "</td></tr>"; }).join("");
    var tot = order.slice(-6).reduce(function (a, m) { var o = W2[m]; return a + o.d2 + o.d1 + o.d3 + o.d4 + 1; }, 0);
    return '<section class="dhist blk pg-break" aria-label="주별 문서 이력"><h2>주별 문서 이력 <small>지난 ' + Math.min(6, order.length) + "주 · 문서 " + tot + '건</small></h2>' +
      '<table class="doc-t dhist-t"><caption class="sr">주별 방문한 날과 문서 건수</caption><thead><tr><th>주</th><th>방문한 날</th><th>복명서</th><th>상담일지</th><th>연계 의뢰서</th><th>안내 문자</th><th>주간 실적</th><th>합계</th></tr></thead><tbody>' + rows + "</tbody></table>" +
      '<p class="srcline">날짜를 누르면 그날 문서를 다시 보고 받을 수 있습니다 · 건수는 방문 기록을 규칙으로 센 것(만남 = 상담일지 1 · 연계 후보가 있는 만남 = 의뢰서 1 · 부재·연계 = 안내 문자 1)</p></section>';
  }
  // ═════ S12-x 가구별 기록·문서(호창님 11-12 «가구마다 잘 저장 · 열어 보고 편집» · «목록화·찾기·편집·활용») — 규칙은 app/hrec.js ═════
  //   65회차(⚙️ 파로): 마크업·동작 이름 = 시안 v3 hrecList·hrecView 그대로(hf·hsort·hpick·hopen·hedit·hsave·hre·hbulk) — 데이터는 실제 방문 기록(app/hrec.js).
  //   첫 화면엔 검색칸 + «걸러 보기» 단추 + 목록만. 걸러 보기 칩은 단추를 눌러야 펼쳐진다. 폰 = 목록↔한 가구(닫기) · 폴드·PC = 목록 아래 한 가구.
  var HRX = window.DaeumHrec, LS_HEDIT = "daeum.s12x.recEdit", LS_HDOC = "daeum.s12x.hdoc";
  var HR = { f: { q: "", res: "", per: "", doc: "" }, sort: "mod", sel: {}, open: null, edit: null, fo: false };
  function hrGroups() { return HRX ? HRX.group(logs(), BY, lsGet(LS_HEDIT, {}) || {}) : []; }
  function hrList() { return HRX ? HRX.sort(HRX.filter(hrGroups(), { q: HR.f.q, res: HR.f.res, period: HR.f.per === "t" ? "today" : HR.f.per === "w" ? "week" : "", doc: HR.f.doc }), HR.sort === "no" ? "hid" : "recent") : []; }
  function hrNsel() { return Object.keys(HR.sel).filter(function (k) { return HR.sel[k]; }).length; }
  function hrPhone() { return (document.documentElement.getAttribute("data-mode") || "phone") === "phone"; }
  function hrTag(g, docs) { return docs.some(function (d) { return d.stale; }) ? '<span class="stale">다시 만들기</span>' : '<span class="tag ' + HRX.RK[g.res] + '">' + HRX.RES[g.res] + "</span>"; }
  function hrecList() {
    var R = hrList(), f = HR.f, n = hrNsel(), nf = ["res", "per", "doc"].filter(function (g) { return f[g]; }).length, de = lsGet(LS_HDOC, {}) || {}, all = hrGroups();
    function chip(g, v, l) { return '<button type="button" class="hchip pr" data-act="hf" data-g="' + g + '" data-k="' + v + '" aria-pressed="' + (f[g] === v) + '">' + l + "</button>"; }
    return '<section class="card hrec-list"><h3>가구별 기록<span>' + all.length + "가구 · 방문 " + all.reduce(function (a, g) { return a + g.visits.length; }, 0) + "번</span></h3>" +
      '<div class="hrec-tools"><div class="hrec-sbar"><label class="hrec-search">' + I.search + '<input id="hq" type="search" value="' + esc(f.q) + '" placeholder="가구번호·읍면·날짜(11.12)·메모" aria-label="가구별 기록 찾기"></label>' +
      '<button type="button" class="hrec-ftog pr" data-act="hfo" aria-expanded="' + HR.fo + '">' + I.filter + "걸러 보기" + (nf ? '<span class="n">' + nf + "</span>" : "") + "</button></div>" +
      (HR.fo ? '<div class="hrec-fpanel"><div class="hrec-filter" role="group" aria-label="결과"><span class="fk">결과</span>' + ["met", "absent", "refuse"].map(function (v) { return chip("res", v, HRX.RES[v]); }).join("") + "</div>" +
        '<div class="hrec-filter" role="group" aria-label="기간"><span class="fk">기간</span>' + chip("per", "t", "오늘") + chip("per", "w", "이번 주") + "</div>" +
        '<div class="hrec-filter" role="group" aria-label="문서 종류"><span class="fk">문서</span>' + HRX.DOCK.map(function (d) { return chip("doc", d.k, d.nm); }).join("") + "</div>" +
        '<div class="hrec-sort"><span>' + R.length + '가구 <button type="button" class="lnk pr" data-act="hall">보이는 가구 모두 고르기</button></span><span class="seg2" role="group" aria-label="정렬">' + [["mod", "최근 수정 순"], ["no", "가구번호 순"]].map(function (x) { return '<button type="button" class="pr" data-act="hsort" data-k="' + x[0] + '" aria-pressed="' + (HR.sort === x[0]) + '">' + x[1] + "</button>"; }).join("") + "</span></div></div>" : "") + "</div>" +
      '<div class="hrec-rows">' + (R.length ? R.map(function (g) {
        return '<div class="hrec-line"><button type="button" class="hrec-pick pr" data-act="hpick" data-k="' + g.hid + '" aria-pressed="' + !!HR.sel[g.hid] + '" aria-label="' + g.hid + ' 고르기"><i>' + I.check + "</i></button>" +
          '<button type="button" class="hrec-row pr' + (HR.open === g.hid ? " on" : "") + '" data-act="hopen" data-k="' + g.hid + '" aria-expanded="' + (HR.open === g.hid) + '"><span class="hrec-no">' + g.hid + '</span><span class="hrec-mid"><b>' + esc(g.area) + "</b><small>방문 " + HRX.md(g.last.at) + (g.visits.length > 1 ? " · " + g.visits.length + "차" : "") + "</small></span>" + hrTag(g, HRX.docsOf(g, de)) + '<span class="hrec-mod">고침 <b>' + HRX.when(g.touched) + "</b></span></button></div>";
      }).join("") : '<div class="hrec-empty">맞는 가구가 없습니다 — 찾는 말이나 걸러 보기를 바꿔 보세요.</div>') + "</div>" +
      (n ? '<div class="hrec-bulk" role="status"><span>' + n + '가구 골랐습니다</span><button type="button" class="btn sm pri pr" data-act="hbulk">' + I.down + '한 번에 내려받기</button><button type="button" class="btn sm ghost pr" data-act="hselx" aria-label="고르기 풀기">' + I.x + "</button></div>" : "") +
      '<p class="srcline">기록과 직접 고친 문서 본문은 같은 계정 PC·폰에 실시간 연동 · 가구 번호·읍면만(성명·주소·연락처 없음) · 가상 데이터</p></section>';
  }
  function hrAuto(g) { var v = g.last; return (HRX.md(v.at) + " " + (v.res === "absent" ? "방문했으나 만나지 못함." : v.res === "refuse" ? "방문했으나 상담을 원하지 않음." : "방문하여 대상자를 만남.") + " " + (v.tags.length ? v.tags.join("·") + " 상황을 확인함." : "")).trim(); }
  function hrecOne() {
    var g = hrGroups().filter(function (x) { return x.hid === HR.open; })[0]; if (!g) return "";
    var v = g.last, de = lsGet(LS_HDOC, {}) || {}, docs = HRX.docsOf(g, de);
    var hist = g.visits.slice().reverse().map(function (x) { return '<li><span class="r">' + x.n + '차</span><i class="d"></i><span><b>' + HRX.md(x.at) + " " + HRX.hm(x.at) + "</b><small>" + HRX.RES[x.res] + " — " + esc(x.memo || "기록 없음") + (x.edited ? " · 고친 시각 " + HRX.when(x.edited) : "") + "</small></span></li>"; }).join("");
    var dl = docs.map(function (d) {
      var key = g.hid + "|" + d.k, ed = HR.edit === key;
      return '<div class="hdoc' + (d.stale ? " stale" : "") + '"><span class="di h">HWP</span><span class="nm"><b>' + d.nm + (d.stale ? '<span class="stale">다시 만들기</span>' : "") + "</b><small>" + (d.stale ? "기록이 바뀌었습니다" : d.edited ? "본문 고침 " + HRX.when(d.edited) : "기록과 같음") + "</small></span>" +
        (ed ? '<textarea class="hrec-memo" id="hrDocTxt" rows="7" aria-label="' + d.nm + ' 본문 고치기">' + esc(d.text) + '</textarea><div class="acts"><button type="button" class="pr" data-act="hcancel">취소</button><button type="button" class="pr" data-act="hsave" data-k="' + key + '">' + I.check + "저장</button></div>"
          : '<div class="acts">' + (d.stale ? '<button type="button" class="re pr" data-act="hre" data-k="' + key + '">' + I.sync + "다시 만들기</button>" : "") +
            '<button type="button" class="pr" data-act="hdoc" data-k="hwpx" data-d="' + key + '">' + I.down + 'hwpx</button><button type="button" class="pr" data-act="hdoc" data-k="인쇄" data-d="' + key + '">' + I.print + '인쇄</button><button type="button" class="pr" data-act="hdoc" data-k="복사" data-d="' + key + '">' + I.copy + '복사</button><button type="button" class="pr" data-act="hdoc" data-k="고치기" data-d="' + key + '">' + I.pen + "본문 고치기</button></div>") + "</div>"; // 84회차 ⑧ «보내기»(실제로 보내지 않음) 삭제 — 연동 상태는 머리 연동 점 · ㉖ 글자 «본문 고치기»
    }).join("");
    return '<section class="card hrec-view" aria-label="' + g.hid + ' 기록">' +
      '<div class="hrec-head">' + (hrPhone() ? '<button type="button" class="evb pr" data-act="hclose" aria-label="목록으로">' + I.x + "</button>" : "") + '<span class="hrec-no">' + g.hid + '</span><span class="t"><b>' + esc(g.area) + "</b><small>방문 " + HRX.md(v.at) + " · 고침 " + HRX.when(g.touched) + "</small></span>" + hrTag(g, docs) + "</div>" +
      '<div class="hrec-sec"><h4>차수별 기록</h4><ol class="hrec-hist">' + hist + "</ol></div>" +
      '<div class="hrec-sec"><h4>상황</h4><div class="hrec-sit">' + (v.tags.length ? v.tags.map(function (z) { return '<button type="button" class="hchip pr" aria-pressed="true" tabindex="-1">' + esc(z) + "</button>"; }).join("") : '<p class="hrec-memo">고른 상황 없음</p>') + "</div></div>" +
      '<div class="hrec-sec"><h4>자동 문장</h4><p class="hrec-auto"><span class="ai">' + esc(hrAuto(g)) + "</span></p></div>" +
      '<div class="hrec-sec"><h4>메모</h4><p class="hrec-memo">' + esc(v.memo) + "</p></div>" +
      '<div class="hrec-acts"><button type="button" class="btn ghost pr" data-act="hedit" data-k="' + g.hid + '">' + I.pen + "고치기</button></div>" + // 마지막 기록 고치기 = 오늘 탭 «기록 고치기»와 같은 편집 화면(reopenRec)
      '<div class="hrec-sec"><h4>만든 문서들</h4><div class="hrec-docs">' + dl + "</div></div></section>";
  }
  function hrBody() { return HR.open && hrPhone() ? hrecOne() : hrecList() + (HR.open ? hrecOne() : ""); }
  function hrecView() { return HRX ? '<div class="hrec" id="hrec" aria-label="가구별 기록·문서">' + hrBody() + "</div>" : ""; }
  function hrDoc(key) { var p = key.split("|"), g = hrGroups().filter(function (x) { return x.hid === p[0]; })[0]; return g ? HRX.docsOf(g, lsGet(LS_HDOC, {}) || {}).filter(function (d) { return d.k === p[1]; })[0] : null; }
  function hrHwpx(hids) {
    var gs = hrGroups().filter(function (g) { return hids.indexOf(g.hid) >= 0; }); if (!gs.length) return;
    // S12-z: 한 가구 = «마지막 방문일_가구번호_가구별기록.hwpx» · 여러 가구 = ZIP 하나(안에 «날짜/YYYY-MM-DD/»·«가구별/가구번호/» 폴더 — 브라우저는 폴더를 못 만들어 ZIP이 폴더 역할)
    needLibs().then(function () {
      var n = new Date(), made = n.getFullYear() + ". " + (n.getMonth() + 1) + ". " + n.getDate() + ".", de = lsGet(LS_HDOC, {}) || {}, W = window.DaeumHwpx, X = window.DaeumXlsx;
      if (gs.length === 1) return W.download(HRX.hwpxDoc(gs, de, made), fnm(gs[0].last.at, gs[0].hid, "가구별기록", "hwpx"));
      return X.save(X.zip(HRX.zipFiles(gs, function (g) { return W.build(HRX.hwpxDoc([g], de, made)); }, fnm)), fnm(n, gs.length + "가구", "가구별기록", "zip"), "application/zip");
    }).then(function () { toast(gs.length > 1 ? "ZIP을 받았습니다 · 가구 " + gs.length + "곳(날짜별·가구별 폴더)" : "hwpx를 받았습니다 · 가구 " + gs[0].hid); }, function () { toast("문서 부품을 불러오지 못했습니다 — 전파가 돌아오면 다시 눌러 주세요"); });
  }
  function hrPrint(d, hid) { // S12-z: 인쇄 창 제목(= PDF 저장 이름)도 «방문일_가구번호_문서종류»
    var f = document.createElement("iframe"); f.setAttribute("aria-hidden", "true"); f.setAttribute("tabindex", "-1"); f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
    document.body.appendChild(f);
    var w = f.contentWindow, dc = w.document; dc.open(); var g0 = hrGroups().filter(function (x) { return x.hid === hid; })[0]; dc.write('<!doctype html><meta charset="utf-8"><title>' + esc(fnm(g0 ? g0.last.at : new Date(), hid, d.nm)) + '</title><style>body{font:14px/1.7 "Noto Sans KR",sans-serif;margin:20mm}pre{white-space:pre-wrap;font:inherit}</style><pre>' + esc(d.text) + "</pre>"); dc.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) { /* 인쇄 막힘 */ } setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1000); }, 50);
  }
  function bindHrec() {
    var box = app.querySelector("#hrec"); if (!box) return;
    function redraw() { box.innerHTML = hrBody(); }
    box.addEventListener("input", function (e) {
      if (e.target.id !== "hq") return;
      HR.f.q = e.target.value; redraw(); var q = box.querySelector("#hq"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } // 시안: 쓰는 중에도 칸 유지
    });
    box.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-act]") : null; if (!t || !box.contains(t)) return;
      var k = t.dataset.k, f = HR.f;
      switch (t.dataset.act) {
        case "hfo": HR.fo = !HR.fo; break;
        case "hf": { var g = t.dataset.g; f[g] = f[g] === k ? "" : k; break; }
        case "hsort": HR.sort = k; break;
        case "hall": hrList().forEach(function (x) { HR.sel[x.hid] = true; }); break;
        case "hpick": HR.sel[k] = !HR.sel[k]; break;
        case "hselx": HR.sel = {}; break;
        case "hbulk": hrHwpx(Object.keys(HR.sel).filter(function (z) { return HR.sel[z]; })); return;
        case "hopen": HR.open = HR.open === k ? null : k; HR.edit = null; break;
        case "hclose": HR.open = null; HR.edit = null; break;
        case "hedit": reopenRec(k, false); return; // 오늘 탭 «기록 고치기»와 같은 편집 화면 · 고쳐도 방문 일시 유지·고친 시각 남김
        case "hcancel": HR.edit = null; break;
        case "hsave": {
          var ta = box.querySelector("#hrDocTxt"), gg = hrGroups().filter(function (x) { return x.hid === k.split("|")[0]; })[0]; if (!ta || !gg) return;
          // S12-y(70회차): 본문 고침도 같은 계정 PC·폰 실시간 연동(sync.js saveDoc → doc_edit) · 연동이 없으면 이 기기 저장
          var kp = k.split("|"); HR.edit = null;
          if (SY.saveDoc) SY.saveDoc(kp[0], kp[1], ta.value, gg.last.id); else { var all = lsGet(LS_HDOC, {}) || {}; all[k] = { text: ta.value.slice(0, 4000), at: new Date().toISOString(), base: gg.last.id }; lsSet(LS_HDOC, all); }
          redraw(); toast(SY.state().mode === "live" ? "문서 본문을 저장했습니다 · 같은 계정 PC·폰에 반영" : "문서 본문을 이 기기에 저장했습니다 · 연결되면 같은 계정에 보냅니다"); return;
        }
        case "hre": { var kq = k.split("|"); if (SY.dropDoc) SY.dropDoc(kq[0], kq[1]); else { var a2 = lsGet(LS_HDOC, {}) || {}; delete a2[k]; lsSet(LS_HDOC, a2); } redraw(); toast("바뀐 기록으로 다시 만들었습니다"); return; }
        case "hdoc": {
          var key = t.dataset.d, d = hrDoc(key); if (!d) return;
          if (k === "hwpx") hrHwpx([key.split("|")[0]]);
          else if (k === "인쇄") hrPrint(d, key.split("|")[0]);
          else if (k === "복사") copy(d.text);
          else if (k === "고치기") { HR.edit = key; redraw(); var tx = box.querySelector("#hrDocTxt"); if (tx) tx.focus(); }
          return;
        }
        default: return;
      }
      redraw();
    });
  }
  function docsView() {
    var M = docModel(), now = new Date();
    if (!M.dd) return top("docs", "<strong>문서함</strong>가상 데이터") + '<main class="wrap"><div class="emptyc blk"><b>아직 방문 기록이 없습니다</b>폰에서 «기록 저장»을 누르면 이 화면이 바로 채워집니다.<a class="btn pri" data-dock="1" data-dock-lbl="현장 탭으로" data-dock-sub="기록 저장하면 문서가 채워짐" href="#home">현장 탭으로</a></div>' + hrecView() + "</main>";
    if (!docDay) docDay = M.dd.n;
    var D0 = DOCS.filter(function (d) { return d.k === docSel; })[0];
    var ph = (typeof document !== "undefined" && document.documentElement && document.documentElement.getAttribute("data-mode") || "phone") === "phone";
    pvInl = !ph; // 107회차 ⚙️ 파로B(⑧-2b 차이 6): 큰 화면 오른쪽 칸 = 시안 V16 pvView(inline) — 큰 A4 + HWPX·PDF·인쇄 + 쪽 n/N(«1 만들기 → 2 받기» 없음)
    // 105회차 ⚙️ 파로B(⑧-3b · 시안 v4 V16 v4-1): 문서 줄마다 «보기»(주 단추·눈) + «만들기/받기/인쇄·PDF»(보조) 나란히 · 대기 0건 문서도 «보기» · 대기 건 있는 문서가 위로
    var list = DOCS.map(function (d, i) { return [d, i]; }).sort(function (a, b) { return (M.cnt[b[0].k] > 0) - (M.cnt[a[0].k] > 0) || a[1] - b[1]; }).map(function (r) {
      var d = r[0], q = M.pend[d.k], tot = M.cnt[d.k];
      var made = tot > 0 && q === 0, m1 = !!made1[(d.k === "d5" ? "d5:" + docPer : d.k) + ":" + (d.k === docSel ? docHid || "" : "")];
      var lbl2 = made ? "받음" + ii("check") : !ph || m1 ? (ph ? "인쇄·PDF" : "받기") : "만들기"; // 107회차 차이 7: 큰 화면은 시안 V16처럼 «보기·받기»(누르면 만들기까지 한 번에)
      return '<div role="button" tabindex="0" class="row dv' + (d.k === docSel ? " sel" : "") + (made ? " made" : "") + '" data-doc="' + d.k + '"><span class="q' + (q ? "" : " z") + '">' + q + '</span><span class="nm"><b>' + d.nm + "</b><small>" + esc(d.sub) + (tot ? " · " + tot + "건" : " · 해당 없음") + '</small><span class="dmeter" aria-hidden="true">' + d.meter.map(function (x) { var q = MET_SRC[x[0]]; return '<i class="' + x[0] + " pat-" + q + '" data-src="' + q + '" data-pat="' + q + '" style="flex:' + x[1] + '"></i>'; }).join("") + "</span></span>" +
        '<span class="rv-acts"><button type="button" class="btn pri rv-mk" data-pv="' + d.k + '" aria-label="' + esc(d.nm) + ' 보기">' + ii("eye") + "보기</button>" + (tot ? '<button type="button" class="btn sbtn rv-mk" data-mkget="' + d.k + '"' + (ph && m1 && !made ? ' data-print="1"' : "") + ">" + lbl2 + "</button>" : "") + "</span></div>";
    }).join("");
    var pv = docPreview(M, docSel), inl = pvInl && !!pvArticle(pv);
    var dayLbl = (M.dd.date ? md(M.dd.date) : M.dd.n + "일차") + " 방문 " + M.cases.filter(function (x) { return x.st !== "planned"; }).length + "곳";
    return top("docs", "<strong>" + esc(dayLbl) + "</strong>가상 데이터") + '<main class="wrap">' +
      '<div class="dhead"><h1>' + (M.past ? "그날 받은 문서 <span>" + Object.keys(M.cnt).reduce(function (a, k) { return a + (DOC_OPT[k] || k === "d6" ? 0 : M.cnt[k]); }, 0) + "</span>건" : "만들 문서 <span>" + M.pending + "</span>건") + '</h1><p>막대 색 = 칸을 채운 곳 · <b style="color:#5D6B80">남색</b> 한국사회보장정보원 명단·API · 회색 규칙 숫자 · 노랑 자동 문장(확인) · 빨강 빈칸(입력 필요)</p></div>' +
      (M.rd.filter(function (d) { return !d.past; }).length > 1 || M.past ? dayPick(M) : "") +
      // S12-x 66회차: 시안 v3 scrReport — 첫 칸(문서 목록) | 둘째 칸(미리보기) | 셋째 칸(이력·가구별 기록·남은 가구·인계 카드)
      '<div class="dep blk rv-dep">' + list + "</div>" + C2 + // 105회차: 머리 줄(대기·문서·채워진 칸) 없음 — 시안 V16 문서 줄과 같게
      '<section class="prev blk" id="docPrev" tabindex="-1" aria-label="' + esc(D0.nm) + ' 미리보기">' + (inl ? pvInline(D0, pv) : pv) + "</section>" + C3 + docHist(M) + hrecView() + (FD ? FD.reportCards() : "") + // S12-x 가구별 기록·문서 · S12-i3 ⑥남은 가구 막대 ③인계 카드
      qcards("이 탭의 다른 기능", [
        ["folder", "가구별 기록·문서", "찾기·고치기·다시 만들기", 'data-qto="#hrec"'],
        ["down", "한 번에 내려받기", "고른 문서 묶어서", 'data-qto="[data-act=hbulk]"'],
        ["hist", "주별 이력", "방문 기록·문서 6주", 'data-qto=".dhist"'],
        FD ? ["chart", "남은 가구 막대", "읍면·담당별", 'data-qto=".fd-remain"'] : null,
        FD ? ["copy", "한 장 인계 카드", "담당 교체·부재 때", 'data-qto=".fd-hand"'] : null,
        ["report", "실적·사후관리", "읍면별 진도·이번 주 할 일", 'data-go="#perf"']
      ]) + docDock(M, D0) +
      '<p class="demo"><span class="samp">가상 데이터</span><span>개인정보 4칸(성명·주민등록번호·연락처·주소) 미기재 · 가구 번호·읍면만 · 상담일지 입력·전자서명은 행복이음에서</span></p>' + (pvOpen ? pvView(D0, pv) : "") + "</main>";
  }
  // ── 105회차 ⚙️ 파로B(⑧-3b · 시안 v4 V16 v3-6): «보고서 보기» 전체 화면 — A4(595×842) 한 장 단위로 통째로 줄이고 늘림 ──
  //   내용 = 미리보기와 같은 docPreview(같은 숫자·같은 문장) 중 <article class="print-doc"> 만 · 쪽 나누기는 그린 뒤 블록 높이로(pvLayout)
  //   단추 = 받기(hwpx·xlsx·문안 복사 — 기존 getDoc) · PDF·인쇄(기존 printDoc) · 아래 떠 있는 줄 = − 폭 맞춤 + · 출처 색
  var PV_EXT = { d1: ["HWPX", 1], d2: ["HWPX"], d3: ["HWPX"], d4: ["문안 복사"], d5: ["HWPX"], d6: ["XLSX"], d7: ["HWPX"], d8: ["HWPX"] };
  function pvArticle(html) { var a = html.indexOf("<article"), b = html.lastIndexOf("</article>"); return a >= 0 && b > a ? html.slice(a, b + 10) : ""; }
  function pvView(D0, pvHtml) {
    var art = pvArticle(pvHtml), ex = PV_EXT[D0.k] || ["HWPX"], ext = ex[0] === "문안 복사" ? "문안" : ex[0].toLowerCase(), dis = art ? "" : " disabled";
    var body = art ? '<div class="rvw-pg"><div class="rvw-paper">' + art + "</div></div>" : '<div class="rvw-pg rvw-none"><div class="rvw-paper">' + (pvHtml || "") + "</div></div>";
    return '<div class="rvw' + (pvSrc ? "" : " clean") + '" role="dialog" aria-modal="true" aria-label="' + esc(D0.nm) + ' 보기" data-pvdoc="' + D0.k + '">' +
      '<div class="rvw-t"><div class="r1"><button type="button" class="ky" data-pvx="1" aria-label="닫기">' + ii("chevL") + '</button><span class="ti"><b>' + esc(D0.nm) + "</b><small>" + ext + ' · A4 <span class="pvN">1</span>쪽 · 시연 데이터</small></span><span class="pgn" aria-live="polite"><span class="pvn">1</span>/<span class="pvN">1</span></span></div>' +
      '<div class="r2"><button type="button" class="btn pri" data-pvdl="file"' + dis + ">" + ii(ex[0] === "문안 복사" ? "copy" : "down") + esc(ex[0]) + '</button><button type="button" class="btn sbtn" data-pvdl="pdf"' + dis + ">" + ii("down") + 'PDF</button><button type="button" class="btn sbtn" data-pvdl="print"' + dis + ">" + ii("print") + "인쇄</button></div></div>" +
      '<div class="rvw-s">' + body + "</div>" +
      '<div class="rvw-z" role="group" aria-label="확대·축소"><button type="button" data-pvz="-" aria-label="축소"><span aria-hidden="true" class="rvw-minus"></span></button><button type="button" data-pvz="0" aria-pressed="' + (pvZ === 1) + '">폭 맞춤</button><button type="button" data-pvz="+" aria-label="확대">' + ii("plus") + '</button><i></i><button type="button" data-pvsrc="1" aria-pressed="' + pvSrc + '">출처 색</button></div></div>';
  }
  /** 107회차 ⚙️ 파로B(⑧-2b 차이 6 · 시안 v4 V16 pvView(id, inline)): 큰 화면 오른쪽 칸 = 큰 A4 쪽 + 머리(이름·형식·쪽 n/N·전체 화면) + HWPX·PDF·인쇄.
      빈칸 입력은 A4 위에서 그대로(빨간 칸) · 인쇄용 원본 <article>은 화면에선 숨기고(입력칸 뺌) 인쇄 때만 나온다 */
  function pvInline(D0, pvHtml) {
    var art = pvArticle(pvHtml), ex = PV_EXT[D0.k] || ["HWPX"], ext = ex[0] === "문안 복사" ? "문안" : ex[0].toLowerCase();
    var ctlH = pvHtml.slice(0, pvHtml.indexOf("<article")), emp = (art.match(/<input data-fill="[^"]*" class=""/g) || []).length;
    return ctlH + '<div class="rvw inl' + (pvSrc ? "" : " clean") + '" role="region" aria-label="' + esc(D0.nm) + ' 보기" data-pvdoc="' + D0.k + '">' +
      '<div class="rvw-t"><div class="r1"><span class="ti"><b>' + esc(D0.nm) + "</b><small>" + ext + ' · A4 <span class="pvN">1</span>쪽 · 시연 데이터</small></span><span class="pgn" aria-live="polite"><span class="pvn">1</span>/<span class="pvN">1</span></span><button type="button" class="ky" data-pvfull="' + D0.k + '" aria-label="전체 화면">' + ii("eye") + "</button></div>" +
      '<div class="r2"><button type="button" class="btn pri" data-pvdl="file">' + ii(ex[0] === "문안 복사" ? "copy" : "down") + esc(ex[0]) + '</button><button type="button" class="btn sbtn" data-pvdl="pdf">' + ii("down") + 'PDF</button><button type="button" class="btn sbtn" data-pvdl="print">' + ii("print") + "인쇄</button></div>" +
      (emp ? '<button type="button" class="rvw-why" data-act="fillgo">빨간 빈칸 ' + emp + "곳을 채우면 받을 수 있습니다 · 눌러서 채우기</button>" : "") + "</div>" +
      '<div class="rvw-s"><div class="rvw-pg"><div class="rvw-paper">' + art + "</div></div></div>" +
      '<div class="rvw-z" role="group" aria-label="확대·축소"><button type="button" data-pvz="-" aria-label="축소"><span aria-hidden="true" class="rvw-minus"></span></button><button type="button" data-pvz="0" aria-pressed="' + (pvZ === 1) + '">폭 맞춤</button><button type="button" data-pvz="+" aria-label="확대">' + ii("plus") + '</button><i></i><button type="button" data-pvsrc="1" aria-pressed="' + pvSrc + '">출처 색</button></div></div>' +
      art.replace('<article class="print-doc"', '<article class="print-doc rv-src"').replace(/<input data-fill="[^"]*"[^>]*>/g, "");
  }
  /** 그린 뒤: 블록(머리·읽는 법·본문 덩이·꼬리)을 A4 높이(842)에 차례로 담아 쪽을 나누고, 폭에 맞춰 배율을 정한다. 한 덩이가 한 쪽보다 크면 그 쪽만 길어진다 */
  var PV_H = 842, PV_W = 595;
  function pvLayout() { Array.prototype.forEach.call(app.querySelectorAll(".rvw"), pvLayout1); } // 107회차: 큰 화면 칸(.rvw.inl)과 전체 화면이 함께 있을 수 있음
  /** 108회차 ⚙️ 파로(⑧-4): 큰 화면 A4 칸 높이 = 칸(.col)의 보이는 높이 − 칸 안 윗자리 − 아래 여백 (옛 «칸 높이 − 24»는 칸 위 여백 22px·머리 띠 탓에 31px 넘쳐 칸 아래가 잘림) */
  function pvFit(v) {
    var col = v.closest(".col"); if (!col) { v.style.setProperty("--pvh", "760px"); return; }
    var top = v.getBoundingClientRect().top - col.getBoundingClientRect().top + col.scrollTop, pb = parseFloat(getComputedStyle(col).paddingBottom) || 0;
    v.style.setProperty("--pvh", Math.max(420, Math.floor(col.clientHeight - top - Math.max(pb, 12))) + "px");
  }
  function pvLayout1(v) {
    if (v.classList.contains("inl")) { pvFit(v); if (typeof requestAnimationFrame === "function") requestAnimationFrame(function () { pvFit(v); }); } // 시안 V16 pvBind --pvh · 108회차: 머리 띠(.hbar)가 붙은 뒤 한 번 더
    var sc = v.querySelector(".rvw-s"), one = sc.querySelector(".rvw-pg:not(.rvw-none) .print-doc");
    if (one && !sc.getAttribute("data-split")) {
      var inner = PV_H - 46 - 52 - 24, blocks = [];
      Array.prototype.forEach.call(one.children, function (el) { if (el.classList.contains("doc-body")) Array.prototype.forEach.call(el.children, function (c) { blocks.push([c, 1]); }); else blocks.push([el, 0]); });
      var pages = [[]], h = 0;
      blocks.forEach(function (b) {
        var cs = getComputedStyle(b[0]); if (cs.display === "none") return;
        var bh = b[0].getBoundingClientRect().height + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0), sx = parseFloat((one.closest(".rvw-paper").style.transform.match(/scale\(([\d.]+)\)/) || [0, 1])[1]) || 1;
        bh = bh / sx; // 줄인 채로 잰 높이 → A4 원래 크기
        if (h > 0 && h + bh > inner) { pages.push([]); h = 0; }
        pages[pages.length - 1].push(b); h += bh;
      });
      var N = pages.length, oh = one.outerHTML, head = oh.slice(0, oh.indexOf(">") + 1);
      sc.innerHTML = pages.map(function (pg, k) {
        var out = "", inBody = false;
        pg.forEach(function (b) { if (b[1] && !inBody) { out += '<div class="doc-body">'; inBody = true; } if (!b[1] && inBody) { out += "</div>"; inBody = false; } out += b[0].outerHTML; });
        if (inBody) out += "</div>";
        return '<div class="rvw-pg"><div class="rvw-paper">' + head + out + '</article><div class="rvw-pf">' + (k + 1) + " / " + N + "</div></div></div>";
      }).join("");
      sc.setAttribute("data-split", "1");
      v.querySelectorAll(".pvN").forEach(function (e) { e.textContent = N; });
    }
    var cw = Math.max(200, sc.clientWidth - 24), s = Math.min(1.6, cw / PV_W) * pvZ;
    sc.querySelectorAll(".rvw-pg").forEach(function (w) { var p = w.firstChild; p.style.transform = "scale(" + s.toFixed(4) + ")"; var hh = Math.max(PV_H, p.scrollHeight); w.style.width = (PV_W * s).toFixed(1) + "px"; w.style.height = (hh * s).toFixed(1) + "px"; });
    var pn = v.querySelector(".pvn"), pgs = sc.querySelectorAll(".rvw-pg");
    sc.onscroll = function () { var mid = sc.scrollTop + sc.clientHeight * 0.4, n = 1; Array.prototype.forEach.call(pgs, function (g, k) { if (g.offsetTop <= mid) n = k + 1; }); if (pn) pn.textContent = n; };
  }
  function pvClose() { pvOpen = null; render(); var b = app.querySelector('.dep [data-pv="' + docSel + '"]'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
  /** 보고서 보기 안 «받기» — 미리보기 흐름(1 만들기 → 2 받기)을 한 번에. 빨간 빈칸이 남았으면 보기를 닫고 빈칸으로 */
  function pvGet(M) {
    if (app.querySelector("#docPrev input[data-fill]:not(.ok)")) { pvOpen = null; render(); if (!fillGo()) toPrev(); toast("빨간 빈칸을 채우면 받기가 켜집니다"); return; }
    made1[(docSel === "d5" ? "d5:" + docPer : docSel) + ":" + (docHid || "")] = true;
    getDoc(M, docSel, !!(PV_EXT[docSel] || [])[1]);
  }
  function bindPv(M) { Array.prototype.forEach.call(app.querySelectorAll(".rvw"), function (v) { bindPv1(M, v); }); }
  function bindPv1(M, v) {
    var x = v.querySelector("[data-pvx]");
    if (x) { x.addEventListener("click", function () { vib(); pvClose(); }); try { x.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
      v.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); pvClose(); } }); }
    var fu = v.querySelector("[data-pvfull]"); if (fu) fu.addEventListener("click", function () { vib(); pvOpen = docSel; render(); }); // 큰 화면 칸 눈 단추 = 전체 화면 보기
    v.querySelectorAll("[data-pvdl]").forEach(function (b) { b.addEventListener("click", function () { vib(); if (b.dataset.pvdl === "pdf") toast("인쇄 창의 «대상»에서 «PDF로 저장»을 고르면 PDF로 받습니다"); if (b.dataset.pvdl === "file") pvGet(M); else printDoc(); }); }); // 107회차: PDF = 기존 인쇄 경로(창 제목 = 파일 이름) + 저장 안내
    v.querySelectorAll("[data-pvz]").forEach(function (b) { b.addEventListener("click", function () { var z = b.dataset.pvz; pvZ = z === "0" ? 1 : Math.max(0.6, Math.min(2.4, +(pvZ * (z === "+" ? 1.25 : 0.8)).toFixed(3))); vib(); app.querySelectorAll('.rvw [data-pvz="0"]').forEach(function (z0) { z0.setAttribute("aria-pressed", String(pvZ === 1)); }); pvLayout(); }); });
    var sr = v.querySelector("[data-pvsrc]"); sr.addEventListener("click", function () { pvSrc = !pvSrc; vib(); v.classList.toggle("clean", !pvSrc); app.querySelectorAll(".rvw").forEach(function (w) { w.classList.toggle("clean", !pvSrc); }); app.querySelectorAll(".rvw [data-pvsrc]").forEach(function (q) { q.setAttribute("aria-pressed", String(pvSrc)); }); toast(pvSrc ? "출처 색을 켰습니다 · 남색 명단·API · 회색 규칙 · 노랑 자동 문장 · 빨강 빈칸" : "출처 색을 껐습니다 · 실제 종이와 같은 모습"); });
    pvLayout();
    if (!pvLayout.rz && typeof window !== "undefined") { pvLayout.rz = 1; window.addEventListener("resize", function () { if (app.querySelector(".rvw")) pvLayout(); }); }
  }
  /** 74회차 문서함 주 단추 — 대기 문서가 있으면 고른 문서 «1 만들기 → 2 받기»(미리보기 안 같은 단추를 대신 누름), 없으면 «실적 보기». 보조 = 미리보기로 */
  function docDock(M, D0) {
    if (!M.pending) return '<a class="btn pri" data-dock="1" data-dock-lbl="실적·사후관리 보기" data-dock-sub="문서 대기 0 · 읍면별 진도" href="#perf">실적 보기</a>';
    var m1 = !!made1[(docSel === "d5" ? "d5:" + docPer : docSel) + ":" + (docHid || "")];
    return '<button type="button" class="btn sbtn" data-dock="2" data-dock-lbl="미리보기" data-qto="#docPrev">' + (I.eye || "") + "미리보기</button>" +
      '<button type="button" class="btn pri" data-act="dockdoc" data-dock="1" data-dock-lbl="' + esc((/\(([^)]+)\)$/.exec(D0.nm) || [, D0.nm])[1] + (m1 || pvInl ? " 받기" : " 만들기")) + '" data-dock-sub="' + (pvInl ? "누르면 만들고 바로 받기 · 대기 " + M.pending + "건" : m1 ? "2 받기 · hwpx·xlsx" : "1 만들기 → 2 받기 · 대기 " + M.pending + "건") + '">문서</button>';
  }
  function flowBtns(k, ready, label2, label3, why) { // why: «받기»가 꺼진 이유 한 줄(68회차 ⑭ — 꺼진 단추 바로 아래)
    if (pvInl) return ""; // 107회차 ⚙️ 파로B(차이 6): 큰 화면은 두 단계 없이 HWPX 한 번(pvGet이 만들기까지)
    var m1 = !!made1[k + ":" + (docHid || "")], on = m1 && ready ? "" : " disabled";
    return '<div class="flow2"><button type="button" class="' + (m1 ? "d1" : "d2") + '" data-act="make">' + (m1 ? "1 만들기" + ii("check") : "1 만들기") + "</button><em>" + ii("arrow") + "</em>" +
      '<button type="button" class="' + (m1 ? "d2" : "") + '" data-act="get"' + on + ">2 " + label2 + "</button>" +
      (label3 ? '<button type="button" class="' + (m1 ? "d2" : "") + '" data-act="get" data-alt="1"' + on + ">2 " + label3 + "</button>" : "") + (m1 && !ready && why ? '<button type="button" class="fwhy" data-act="fillgo" title="빈칸으로 이동">' + esc(why) + " · 눌러서 채우기</button>" : "") + "</div>";
  }
  /** D1 상담일지 초안 — 미리보기·복사·보관 hwpx 가 같은 값을 쓰게 한 곳에서 만든다(규칙 «자동 정리») */
  function d1Draft(x) {
    return F.askGuide.draft({ label: "가구 " + x.id, area: x.h.area, at: x.at, method: "방문 상담", needs: F.askGuide.detect(x.memo), summary: x.memo, services: x.tags.filter(function (t) { return !isField(t) && !SIGN_REV[t] && !/^(주거|생계|건강|고립)$/.test(t); }), next: (F.promises.open(prAll(), x.id)[0] || {}).text || "", guide: F.askGuide.check(x.memo, null, askedOf(x.id)) });
  }
  /** D1 보관용 hwpx 문서 모델 — 가구 번호·읍면만, 성명·주민등록번호·연락처·주소 칸 없음 */
  /** D2 복명서 hwpx — 79회차 ⓓ-뒷단(SPEC docs78 D2): 제목 → 결재란 → 결론 → 출장 개요 양식표(출장자 서명 빈칸 포함) → 가구별 결과 표 한 장 → 붙임 → 끝.
      fs = d2Fields(M)(«동행자» 칸 없음 — ⛔ 다시 넣지 않는다) · rows = [[가구, 읍면, 결과, 현장 확인 내용, 다음 조치]] */
  function d2Hwpx(fs, rows, made, office, TW) {
    var V = {}; fs.forEach(function (f) { V[f.k] = f.v; });
    var team = String(office || "").split(" · ").pop() || "맞춤형복지팀";
    var form = fs.filter(function (f) { return f.k !== "요지"; }).map(function (f) { return [f.k, f.v]; }); // 요지 = 아래 가구별 표와 같은 말 → 표만
    form.splice(Math.min(2, form.length), 0, ["출장자", team + " 사회복지 담당 ________ (서명)"]);
    var w = [5000, 5600, 4600, 0, 16000]; w[3] = TW - w[0] - w[1] - w[2] - w[4];
    return { plain: true, title: "복명서", blocks: [
      { t: "t2", title: "복명서", sub: "복지사각지대 발굴대상자 현장 확인 출장" }, { t: "sign", made: made + " · " + office },
      { t: "concl", text: (V["결과"] || "") + (V["조치"] ? " — " + V["조치"] : "") },
      { t: "sec", text: "출장 개요" }, { t: "form", rows: form },
      { t: "sec", text: "가구별 결과" },
      { t: "tbl2", title: "<표 1> 가구별 방문 결과", unit: "(가구 " + rows.length + ")", head: ["가구", "읍면", "결과", "현장 확인 내용", "다음 조치"], al: ["C", "C", "C", "L", "L"], widths: w, rows: rows.map(function (r) { return [r[0], r[1], r[2], r[3] || "—", r[4]]; }), split: true },
      { t: "p", kind: "small", text: "※ 가구 = 한국사회보장정보원 발굴대상자 명단 · 현장 확인 내용 = 현장 기록 자동 정리(담당자 확인)" },
      { t: "p", kind: "att", text: "붙임  가구별 방문 기록 " + rows.filter(function (r) { return r[2] !== "방문 전"; }).length + "건.  끝." },
      { t: "p", kind: "tail", text: "닿음 · 시연용 가상 데이터 · 개인정보 4칸 미기재" }] };
  }
  // 79회차 ⓓ-뒷단(SPEC docs78 §3·§4): 제목 → 결재란 → 한 줄 결론 → 양식표 → 다음 방문 확인 목록 → 끝. → 꼬리 한 줄
  function d1Hwpx(x, dft, made, office, TW) {
    var F0 = {}; dft.fields.forEach(function (f) { F0[f.key || f.label] = f.value; });
    var gv = function (k, lb) { return F0[k] != null ? F0[k] : F0[lb] || ""; };
    var plan = String(gv("plan", "향후 계획")), cut = plan.indexOf("다음 방문 때 확인: "), planMain = (cut >= 0 ? plan.slice(0, cut) : plan).replace(/\s*·\s*$/, "").trim();
    var checks = cut >= 0 ? plan.slice(cut + 11).split(" / ").filter(Boolean) : [];
    var asked = String(gv("situation", "가구 상황")).replace(/^확인함:\s*/, "");
    var when = String(gv("consultAt", "상담·조사 일시")).replace(/^(\d{4})-(\d{2})-(\d{2})/, function (_, y, m, d) { return y + ". " + (+m) + ". " + (+d) + "."; });
    var method = gv("method", "상담 방법") || "방문 상담", team = String(office || "").split(" · ").pop() || "맞춤형복지팀";
    var main = String(gv("main", "주요 호소(상담 내용 요약)")).replace(/^확인:\s*/, ""), needs = String(gv("needs", "욕구 영역")), act = String(gv("action", "조치·서비스 연계")).replace(/^연계 후보 안내:\s*/, "");
    var rows = [["상담 일시", when], ["상담 장소", /방문/.test(method) ? "가정 방문(현장)" : "행정복지센터"], ["상담 방법", method], ["상담자", team + " 사회복지 담당 ________ (서명)"],
      ["주요 호소", main || "기록 없음"], ["욕구 영역", needs || "—"], ["긴급 여부", gv("urgent", "긴급 여부") || "일반"], ["조치·연계", act ? "연계 후보 안내 — " + act : "—"]];
    if (gv("result", "연계 결과(신청·결정)")) rows.push(["연계 결과", gv("result", "연계 결과(신청·결정)")]);
    if (gv("notEligible", "비해당 사유")) rows.push(["비해당 사유", gv("notEligible", "비해당 사유")]);
    rows.push(["향후 계획", planMain || "—"]);
    var concl = [needs ? needs.replace(/, /g, "·") + " 욕구 확인" : "상담 완료", act ? act.replace(/, /g, "·") + " 연계 안내" : "", planMain].filter(Boolean).join(" — ");
    var B = [{ t: "t2", title: "상담일지 초안(보관용)", sub: "가구 " + x.id + " · " + x.h.area + " · 자동 정리 · 담당자 확인 전", }, { t: "sign", made: made + " · " + office },
      { t: "concl", text: concl }, { t: "sec", text: "상담 내용(행복이음 입력 순서)" }, { t: "form", rows: rows }];
    if (asked) rows.push(["이번에 확인함", asked.replace(/ · /g, ", ")]);
    if (checks.length) { B.push({ t: "sec", text: "다음 방문 때 확인할 것" }); B.push({ t: "chk", items: checks }); }
    B.push({ t: "p", kind: "small", text: "※ 현장 기록을 규칙으로 자동 정리한 초안 · 입력·전자서명은 담당자가 행복이음에서 · 개인정보 4칸(성명·주민등록번호·연락처·주소) 미기재, 가구 번호·읍면만" },
      { t: "p", kind: "end", text: "끝." }, { t: "p", kind: "tail", text: "닿음 · 시연용 가상 데이터 · 개인정보 4칸 미기재" });
    return { plain: true, title: "상담일지 초안(보관용)", blocks: B };
  }
  /** D5 주간·월간 실적 hwpx 문서 모델 — 숫자는 periodModel 규칙 집계만 */
  // 79회차 ⓓ-뒷단(SPEC docs78 §3·§4 D5): 제목 → 결재란 → 결론 → 읽는 법 → 숫자 카드 → 구성비 띠 → 실적 표(전 기간 대비) → 문제점·건의 → 향후 계획 → 참고(지역 현황) → 끝.
  function d5Hwpx(w, made, office, TW) {
    var mo = w.per === "mo", P = w.prev || null, pre = mo ? "전 달" : "전 주", cur = mo ? "이번 달" : "이번 주";
    var dlt = function (a, b) { var d = a - b; return d > 0 ? "+" + d : String(d); }; // 음수 = ASCII «-»(한글 계산식이 읽음)
    var links = w.links || 0, remain = Math.max(0, w.listN - w.doneN);
    var B = [{ t: "t2", title: w.name + " 추진 실적 보고", sub: mdDot(w.from) + " ~ " + mdDot(w.to) }, { t: "sign", made: made + " · " + office },
      { t: "concl", text: w.concl.replace(/\.$/, "") + (P ? "(" + pre + " 대비 상담 " + dlt(w.met, P.met) + "가구)" : "") + (links ? " — 연계 의뢰 " + links + "건" : "") },
      { t: "legend", items: [["방문 곳 수", "기간 안에 방문 기록이 있는 가구 수(한 가구를 여러 번 가도 1곳, 마지막 결과로 셈)"], ["처리 완료", "이번 차수 명단 가구 중 «만남·상담»까지 끝낸 가구"], ["증감", pre + " 같은 규칙 집계와의 차이(늘면 +, 줄면 -)"]],
        colors: [["pine", "만남·상담"], ["mustard", "부재(다시 방문)"], ["grey", "거절·참고"], ["red", "기한·위험"]] },
      { t: "kpi2", items: [{ k: "방문", v: String(w.total), u: "곳", s: P ? pre + " " + P.total + "곳 · " + dlt(w.total, P.total) : "" }, { k: "만남·상담", v: String(w.met), u: "가구", s: links ? "연계 의뢰 " + links + "건" : "연계 의뢰 없음" }, { k: "명단 처리", v: String(w.doneN), u: "가구", s: "명단 " + w.listN + "가구 중" }] },
      { t: "stack", title: "[그림 1] " + cur + " 방문 결과 구성비(단위: 가구)", unit: "가구", items: [{ label: "만남·상담", n: w.met, c: 1 }, { label: "부재", n: w.absent, c: 4 }, { label: "거절", n: w.refuse, c: 5 }] },
      { t: "sec", text: "추진 실적" },
      { t: "tbl2", title: "<표 1> " + cur + " 방문 결과", unit: "(단위: 가구)", head: P ? ["구분", cur, pre, "증감"] : ["구분", cur], widths: P ? [Math.round(TW * .3), Math.round(TW * .7 / 3), Math.round(TW * .7 / 3), TW - Math.round(TW * .3) - 2 * Math.round(TW * .7 / 3)] : [Math.round(TW * .3), TW - Math.round(TW * .3)],
        rows: [["만남·상담", w.met, P && P.met], ["부재(다시 방문)", w.absent, P && P.absent], ["거절", w.refuse, P && P.refuse]].map(function (r) { return P ? [r[0], String(r[1]), String(r[2]), dlt(r[1], r[2])] : [r[0], String(r[1])]; }),
        sum: P ? ["합계", String(w.total), String(P.total), dlt(w.total, P.total)] : ["합계", String(w.total)], fx: true },
      { t: "ci", lv: 2, text: "읍면별: " + (w.areas.map(function (a) { return a[0] + " " + a[1] + "곳"; }).join(", ") || "없음") },
      { t: "ci", lv: 2, text: "명단 처리: " + w.listN + "가구 중 " + w.doneN + "가구 확인(남은 " + remain + "가구)" },
      { t: "ci", lv: 2, text: "연계 의뢰: " + links + "건(만남 가구 중 연계 기관이 걸린 가구)" }];
    if (mo) { B.push({ t: "sec", text: "주차별 추세" }); B.push({ t: "bars", title: "[그림 2] 주차별 방문 곳 수(단위: 곳)", items: (w.weeks.length ? w.weeks : [["—", 0]]).map(function (x) { return { label: x[0], done: x[1], text: x[1] + "곳" }; }) }); }
    B.push({ t: "sec", text: "문제점·건의" });
    if (w.absent) B.push({ t: "ci", lv: 2, text: "부재 " + w.absent + "가구 — 만나기 좋은 시간대로 바꿔 다시 방문" });
    if (w.refuse) B.push({ t: "ci", lv: 2, text: "거절 " + w.refuse + "가구 — 근무일 5일 뒤 다시 권유, 통·이장 안부 확인 협조 검토" });
    if (!w.absent && !w.refuse) B.push({ t: "ci", lv: 2, text: "특이 사항 없음" });
    B.push({ t: "sec", text: "향후 계획" });
    B.push({ t: "ci", lv: 2, text: (mo ? "다음 달" : "다음 주") + " 방문 예정: 남은 명단 " + remain + "가구" + (w.absent ? " · 부재 " + w.absent + "가구 재방문 우선" : "") });
    if (links) B.push({ t: "ci", lv: 2, text: "연계 " + links + "건 결과 회신 확인(근무일 5일 안)" });
    B.push({ t: "sec", text: "참고(지역 현황)" });
    if (mo && w.rcpRows.length) {
      B.push({ t: "tbl2", title: "<표 2> 상주시 수급권자 현황", unit: "(단위: 명·가구)", head: ["사업명", "수급권자(명)", "수급가구(가구)"], widths: [Math.round(TW * .46), Math.round(TW * .27), TW - Math.round(TW * .46) - Math.round(TW * .27)],
        rows: w.rcpRows.concat([["이번 달 상담 가구 비율", "", (w.cmp.match(/([\d.]+%)/) || ["", "—"])[1]]]), src: "※ 출처: 한국사회보장정보원 «복지사업 시군구별 수급권자 현황»(15062448, 2025-12) · 비율 = 상담 " + w.met + "가구 ÷ 기초생활보장 수급가구(백분율)" });
    } else B.push({ t: "ci", lv: 2, text: w.rcp + " — 한국사회보장정보원 복지사업 시군구별 수급권자 현황(15062448)" });
    if (w.bp) B.push({ t: "ci", lv: 2, text: w.bp + " — 보건복지부 기초연금 인구 수급율 현황(15161618)" });
    B.push({ t: "p", kind: "small", text: "※ 숫자는 현장 기록 규칙 집계 · 담당자 확인 후 확정" }, { t: "p", kind: "end", text: "끝." }, { t: "p", kind: "tail", text: "닿음 · 시연용 가상 데이터 · 개인정보 4칸 미기재" });
    return { plain: true, title: w.name + " 추진 실적 보고", blocks: B };
  }
  // ── S12-d 40 선택 문서: D7 한 장 인계 카드 · D8 큰 글씨 안내문(호창님 B 선택) ──
  /** D7 대상 = 그날 방문 기록이 있는 가구 전부 */
  function handCands(cases) { return cases.filter(function (x) { return x.st !== "planned"; }); }
  /** D8 대상 = 만남·부재 가구 중 65세 이상(없으면 만남·부재 전부 — 시연 화면이 비지 않게) */
  function bigCands(cases) {
    var c = cases.filter(function (x) { return x.st === "done" || x.st === "absent"; });
    var old = c.filter(function (x) { var m = x.h.members && x.h.members[0]; return m && m.age >= 65; });
    return old.length ? old : c;
  }
  var ST_LBL = { done: "만남·상담", absent: "부재", refused: "거절" };
  var EASY = { care: "안부 확인·생활 도움(돌봄) 신청", mental: "마음 건강 상담", housing: "집 고치기·주거 지원 신청", emergency: "급한 생활비 지원 검토" };
  /** 다음 할 일·날짜 — 부재 = 근무일 2일 뒤 재방문 · 거절 = 근무일 5일 뒤 다시 권유 · 만남 = 열린 약속(없으면 연계 결과 확인 근무일 5일 뒤) */
  function nextStep(x, now) {
    var pr = F.promises.open(prAll(), x.id)[0], vt = F.visitTime.profile(attempts(), x.id, {});
    var slot = vt.best ? vt.best.label : "";
    if (x.st === "absent") { var d = U.addWorkdays(now, A.retryGap); return { date: d, text: "다시 방문" + (slot ? "(" + slot + ")" : ""), slot: slot, best: vt.best }; }
    if (x.st === "refused") return { date: U.addWorkdays(now, 5), text: "다시 권유(근무일 5일 뒤)", slot: slot, best: vt.best };
    if (pr) return { date: pr.due && /^\d{4}-\d{2}-\d{2}/.test(pr.due) ? pr.due.slice(0, 10) : U.addWorkdays(now, 5), text: clip(pr.text, 40), slot: slot, best: vt.best };
    return { date: U.addWorkdays(now, 5), text: x.refs.length ? "연계 결과 확인" : "안부 확인", slot: slot, best: vt.best };
  }
  /** D7 인계 카드 칸 — 미리보기·hwpx 가 같은 값을 쓴다. 가구 번호·읍면만(개인정보 4칸 없음) */
  function d7Fields(M, x, now) {
    var mt = meta()[x.id] || {}, nx = nextStep(x, now), tries = attempts().filter(function (a) { return a.householdId === x.id; }).length;
    var to = (fills()[M.key] || {})["to_" + x.id] || "";
    return { nx: nx, tries: tries, to: to, fields: [
      { k: "가구", src: "data", v: "가구 " + x.id + " · " + x.h.area + " · " + ageLine(x.h) },
      { k: "발굴 순위", src: "data", v: x.past && !mt.prio ? "한국사회보장정보원 지난 차수 명단(" + String(x.at || "").slice(0, 7) + ")" : "한국사회보장정보원 " + (mt.prio || "—") + "순위 · " + roundYm() + " 차수" },
      { k: "마지막 방문", src: "rule", v: (x.at ? mdDot(x.at) + " " + hm(x.at) + " · " : "") + (ST_LBL[x.st] || "방문 전") },
      { k: "지금 상황", src: "ai", v: clip(String(x.memo || "").replace(/^확인:[^.]*\.\s*/, ""), 90) || "기록 없음" },
      { k: "현장 확인 징후", src: "rule", v: x.field.join(" · ") || "없음" },
      { k: "연계", src: "rule", v: x.refs.map(function (r) { return F.referral.ORGS[r].org.replace(/\(.*\)/, ""); }).join(" · ") || "없음" },
      { k: "넘겨줄 일", src: "rule", v: mdDot(nx.date) + " " + nx.text },
      { k: "만나기 좋은 때", src: "rule", v: nx.best ? nx.best.label + "(" + nx.best.hours + ")" : "기록이 더 쌓이면 나옵니다" },
      { k: "방문·연락", src: "rule", v: tries + "회" },
      { k: "방문 시 유의", src: (fills()[M.key] || {})["note_" + x.id] ? "rule" : "empty", v: (fills()[M.key] || {})["note_" + x.id] || "", input: "note_" + x.id }, // 79회차 SPEC D7: 사전 연락·반려동물·동행 요청 등 담당자가 적는 한 줄
      { k: "받는 사람", src: to ? "rule" : "empty", v: to, input: "to_" + x.id }] };
  }
  // 79회차 ⓓ-뒷단(SPEC docs78 D7): 결론 상자 추가 · «방문·연락»은 카드에만 · «넘겨줄 일·만나기 좋은 때»는 목록에만(표 중복 삭제) · «방문 시 유의» 칸 · 날짜 «11. 20.(금)»
  function d7Hwpx(x, D, made, office, TW) {
    var w3 = Math.floor(TW / 3), dupe = { "방문·연락": 1, "넘겨줄 일": 1, "만나기 좋은 때": 1, "받는 사람": 1 }, best = D.nx.best ? D.nx.best.label + "(" + D.nx.best.hours + ")" : "";
    var rows = D.fields.filter(function (f) { return !dupe[f.k]; }).map(function (f) { return [f.k, f.v || (f.k === "방문 시 유의" ? "없음(담당자가 적은 유의 사항 없음)" : "—")]; });
    return { plain: true, title: "한 장 인계 카드", blocks: [
      { t: "t2", title: "한 장 인계 카드", sub: "가구 " + x.id + " · " + x.h.area + " · 담당자 교체·부재 때 넘김", made: made + " · " + office },
      { t: "concl", text: (ST_LBL[x.st] || "방문 전") + " " + D.tries + "회 — " + mdDot(D.nx.date) + " " + D.nx.text + (D.nx.best ? " · " + D.nx.best.label + " 방문 권장" : "") },
      { t: "kpi2", items: [{ k: "마지막 결과", v: ST_LBL[x.st] || "방문 전" }, { k: "방문·연락", v: String(D.tries), u: "회" }, { k: "다음 할 날", v: mdDot(D.nx.date) }] },
      { t: "sec", text: "가구 상황" },
      { t: "form", rows: rows },
      { t: "sec", text: "넘겨줄 일" },
      { t: "ci", lv: 2, text: "**" + mdDot(D.nx.date) + "** " + D.nx.text },
      { t: "ci", lv: 2, text: "만나기 좋은 때: " + (best || "기록이 더 쌓이면 나옵니다") },
      { t: "ci", lv: 3, text: "성명·연락처·주소는 행복이음에서 확인" },
      { t: "sec", text: "주고받기" },
      { t: "tbl2", head: ["넘긴 사람", "받는 사람", "넘긴 날"], al: ["C", "C", "C"], widths: [w3, w3, TW - w3 * 2], rows: [["(서명)", D.to ? D.to + " (서명)" : "(서명)", made]] },
      { t: "p", kind: "small", text: "※ 가구 칸 = 한국사회보장정보원 발굴대상자 명단 · 상황 칸 = 현장 기록 자동 정리(담당자 확인)" },
      { t: "p", kind: "end", text: "끝." }, { t: "p", kind: "tail", text: "닿음 · 시연용 가상 데이터 · 개인정보 4칸 미기재" }] };
  }
  /** D8 큰 글씨 안내문 — 집에 남기는 종이라 가구 번호·이름·주소·사정은 적지 않는다. 22pt 칸만 쓴다 */
  function d8Model(x, now) {
    var nx = nextStep(x, now), ab = x.st === "absent";
    var help = x.refs.map(function (r) { return EASY[r] || F.referral.ORGS[r].org.replace(/\(.*\)/, ""); });
    return { nx: nx, ab: ab, visit: x.at ? md(x.at) + " " + hm(x.at) : "", // 79회차 SPEC D8: 찾아뵌 날짜·시각을 큰 글씨로
      title: ab ? "오늘 찾아뵈었는데 안 계셨어요" : "오늘 말씀 나눠 주셔서 고맙습니다",
      sub: x.h.area + " 행정복지센터 맞춤형복지팀에서 다녀갔습니다",
      cards: [
        { k: ab ? "다시 찾아뵙는 날" : "다음에 연락드리는 날", v: md(nx.date) + (nx.slot ? " " + nx.slot : "") },
        ab ? { k: "준비하실 것", v: "없습니다. 집에 계시면 됩니다" } : { k: "도와 드릴 일", v: help.length ? help.join(", ") : "말씀하신 일을 함께 알아보겠습니다" },
        { k: "궁금하시면 전화 주세요", v: "전화 ____________", s: x.h.area + " 행정복지센터 맞춤형복지팀" }] };
  }
  // 79회차 ⓓ-뒷단(SPEC docs78 D8): 찾아뵌 날 카드 추가 · 담당자용 ※ 설명은 종이에서 삭제(화면 «읽는 법»에만) · 제목 선 없앰(카드 선과 두 겹 방지)
  function d8Hwpx(B, made) {
    var cards = (B.visit ? [{ k: B.ab ? "찾아뵌 날" : "다녀간 날", v: B.visit }] : []).concat(B.cards);
    return { plain: true, title: "큰 글씨 안내문", blocks: [{ t: "t2", title: B.title, sub: B.sub, norule: true }]
      .concat(cards.map(function (c) { return { t: "kpi2", big: true, items: [c] }; }))
      .concat([{ t: "p", kind: "big", text: "집에 안 계실 때는 문자나 전화로 먼저 연락드립니다" }]) };
  }
  function hhPick(arr) {
    if (!arr.length) return "";
    if (!docHid || !arr.some(function (x) { return x.id === docHid; })) docHid = arr[0].id;
    return arr.length > 1 ? '<div class="hh-pick" role="group" aria-label="가구">' + arr.map(function (x) { return '<button type="button" data-hh="' + x.id + '" aria-pressed="' + (x.id === docHid) + '">' + x.id + "</button>"; }).join("") + "</div>" : "";
  }
  // ── S12-e 43 A4 출력 틀: 머리(기관·문서명·기준일)·«읽는 법» 상자·꼬리(출력 시각·쪽번호 자리)·쪽 나눔 표시 ──
  //   class: .print-doc(문서 한 장 묶음) · .doc-head · .doc-legend · .doc-body · .doc-foot(쪽번호는 @page 여백이 맡음) · .no-print(인쇄 때 숨김)
  //          .pg-keep(쪽 경계에서 자르지 않음) · .pg-break(이 앞에서 새 쪽) · .only-screen / .xrow(화면에선 접고 인쇄 때만 다 보임)
  //   흑백 구분: .pat-<값> + [data-pat] — 출처 data|rule|ai|empty · 그래프 계열 met|absent|refuse|visit([data-series]도 같은 값)
  var SRC_LB = { data: "남색 = 한국사회보장정보원 명단·API", rule: "회색 = 규칙으로 센 숫자", ai: "노랑 = 자동 정리 문장(담당자 확인)", empty: "빨강 = 손으로 채울 칸" };
  function swatch(src) { return '<i class="sw pat-' + src + '" data-src="' + src + '" data-pat="' + src + '" style="background:' + SRC_CLS[src] + '"></i>'; }
  function srcSw(list) { return '<div class="legend dl-sw">' + (list || ["data", "rule", "ai", "empty"]).map(function (k) { return '<span data-src="' + k + '">' + swatch(k) + esc(SRC_LB[k]) + "</span>"; }).join("") + "</div>"; }
  var SER = { met: ["만남·상담", "#2E8270"], absent: ["부재", "#C2862C"], refuse: ["거절", "#8A9396"], visit: ["방문한 곳", "#5D6B80"] };
  function serSw(keys) { return '<div class="legend dl-sw dl-ser">' + keys.map(function (k) { return '<span data-series="' + k + '"><i class="sw pat-' + k + '" data-series="' + k + '" data-pat="' + k + '" style="background:' + SER[k][1] + '"></i>' + esc(SER[k][0]) + "</span>"; }).join("") + "</div>"; }
  /** «읽는 법» 작은 상자 — rows: [[이름, 뜻]] · sw: 색 범례 html */
  function legendBox(rows, sw, cls) {
    return '<aside class="doc-legend pg-keep' + (cls ? " " + cls : "") + '" aria-label="읽는 법"><b class="dl-t">읽는 법</b><dl>' + rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + "</dl>" + (sw == null ? srcSw() : sw) + "</aside>";
  }
  function dotDate(d) { d = typeof d === "string" && d.length === 10 ? new Date(d + "T00:00:00") : new Date(d); return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate() + "."; }
  /** 한 장 묶음 — 머리·읽는 법·본문·꼬리. 인쇄(window.print)는 이 묶음만 A4로 낸다(미르 @media print) */
  function sheet(k, name, basis, legend, body) {
    var now = new Date();
    return '<article class="print-doc" data-doc="' + k + '" data-doc-name="' + esc(name) + '">' +
      '<header class="doc-head"><span class="dh-org">상주시청</span><b class="dh-name">' + esc(name) + '</b><span class="dh-date">' + esc(basis) + "</span></header>" +
      legend + '<div class="doc-body">' + body + "</div>" +
      '<footer class="doc-foot"><span class="df-l">닿음 · 시연용 가상 데이터 · 개인정보 4칸 미기재</span><span class="df-r">출력 ' + dotDate(now) + " " + hm(now) + "</span></footer></article>";
  }
  function ctl(html) { if (pvInl) return html ? '<div class="doc-ctl no-print">' + html + "</div>" : ""; return '<div class="doc-ctl no-print">' + html + '<button type="button" class="pr-btn" data-act="print">인쇄·PDF</button></div>'; } // 107회차: 큰 화면은 인쇄·받기를 보기 머리 줄(HWPX·PDF·인쇄)이 맡음
  var LEG = '<div class="legend"><span><i style="background:var(--src-data)"></i>한국사회보장정보원 명단·API</span><span><i style="background:var(--src-rule)"></i>규칙 숫자</span><span><i style="background:var(--src-ai)"></i>자동 문장 확인</span><span><i style="background:var(--src-empty)"></i>입력 필요</span></div>'; // 사용 방법 화면용(옛 범례 줄)
  function cell(f) { var v = f.src === "ai" ? "<mark>" + esc(f.v) + "</mark>" : f.src === "rule" ? '<span class="rule">' + esc(f.v) + "</span>" : esc(f.v); if (f.input) v = '<input data-fill="' + f.input + '" class="' + (f.v ? "ok" : "") + '" value="' + esc(f.v) + '" placeholder="입력 필요" aria-label="' + esc(f.k) + '"><span class="pr-val">' + (f.v ? esc(f.v) : "&nbsp;") + "</span>"; return v; }
  function paper(title, sub, fields) {
    return '<div class="paper">' + rulerOf(fields.map(function (f) { return f.src; })) + "<h3>" + esc(title) + '</h3><div class="sub">' + esc(sub) + '</div><table class="doc-t pg-keep"><caption class="sr">' + esc(title) + '</caption>' + fields.map(function (f) { return "<tr><th>" + esc(f.k) + '</th><td data-src="' + f.src + '">' + cell(f) + "</td></tr>"; }).join("") + "</table></div>";
  }
  /** 가로 누적 막대(흑백에서도 칸마다 이름·숫자가 글자로 붙는다) */
  function stackFig(cap, parts) {
    var tot = parts.reduce(function (a, p) { return a + p[1]; }, 0);
    return '<figure class="doc-chart pg-keep" data-chart="stack"><figcaption>' + esc(cap) + " <small>합계 " + tot + '곳</small></figcaption><div class="dc-stack" role="img" aria-label="' + esc(parts.map(function (p) { return SER[p[0]][0] + " " + p[1]; }).join(", ")) + '">' +
      parts.filter(function (p) { return p[1]; }).map(function (p) { return '<i class="dc-seg pat-' + p[0] + '" data-series="' + p[0] + '" data-pat="' + p[0] + '" style="flex:' + p[1] + ";background:" + SER[p[0]][1] + '"><span>' + esc(SER[p[0]][0]) + " " + p[1] + "</span></i>"; }).join("") + (tot ? "" : '<i class="dc-seg dc-zero">기록 없음</i>') + "</div></figure>";
  }
  /** 세로 막대(주차·주별) — 막대 위에 숫자, 아래에 이름 */
  function colFig(cap, cols, key) {
    var mx = Math.max(1, Math.max.apply(null, cols.map(function (c) { return c[1]; })));
    return '<figure class="doc-chart pg-keep" data-chart="cols"><figcaption>' + esc(cap) + '</figcaption><div class="dc-cols" role="img" aria-label="' + esc(cols.map(function (c) { return c[0] + " " + c[1]; }).join(", ")) + '">' +
      cols.map(function (c) { return '<div class="dc-c"><em>' + c[1] + '</em><span class="dc-bar pat-' + key + '" data-series="' + key + '" data-pat="' + key + '" style="height:' + (c[1] / mx * 100).toFixed(0) + "%;background:" + SER[key][1] + '"></span><b>' + esc(c[0]) + "</b></div>"; }).join("") + "</div></figure>";
  }
  function srcLine(t) { return '<p class="srcline">' + t + "</p>"; }
  function rulerOf(list) { return '<div class="ruler">' + list.map(function (q) { return '<i class="pat-' + q + '" data-src="' + q + '" data-pat="' + q + '" style="background:' + SRC_CLS[q] + '"></i>'; }).join("") + "</div>"; }
  function docPreview(M, k) {
    var now = M.past && M.dd.date ? new Date(M.dd.date + "T17:30:00") : new Date(), area = BY[M.dd.ids[0]].area;
    var vday = M.dd.date ? dotDate(M.dd.date) : M.dd.n + "일차", bas = "방문일 " + vday + (M.past ? " · 지난 기록" : "");
    if (k === "d2") {
      docHid = "";
      var fs = d2Fields(M), empties = fs.filter(function (f) { return f.src === "empty"; }).length;
      var hh = '<table class="doc-t doc-hh pg-keep"><caption>가구별 결과</caption><thead><tr><th>가구</th><th>읍면</th><th>결과</th><th>요지</th></tr></thead><tbody>' + M.cases.map(function (c) { return "<tr><td>" + c.id + "</td><td>" + esc(c.h.area) + '</td><td data-src="rule"><span class="rule">' + (ST_LBL[c.st] || "방문 전") + '</span></td><td data-src="ai">' + (c.st === "done" ? "<mark>" + esc(clip(c.memo, 46)) + "</mark>" : c.st === "absent" ? "다시 방문" : c.st === "refused" ? "근무일 5일 뒤 다시 권유" : "") + "</td></tr>"; }).join("") + "</tbody></table>";
      return ctl(flowBtns("d2", !empties, "hwpx 받기", null, empties ? fs.filter(function (f) { return f.src === "empty"; }).map(function (f) { return "«" + f.k + "»"; }).join("·") + " 칸이 비어 받기가 꺼져 있습니다" : "")) + sheet("d2", "복명서", bas, legendBox([["결과", "그날 확정한 방문 결과를 센 가구 수(만남·부재·거절)"], ["명단 사유 밖 징후", "현장 확인에서 «문제 있음»을 고른 가구 수"], ["기준", "방문일 하루 · 출장 시각은 첫 기록~마지막 기록"], ["출처", "가구 = 한국사회보장정보원 발굴대상자 명단 · 나머지 = 현장 기록"]], serSw(["met", "absent", "refuse"]) + srcSw()),
        stackFig("그날 방문 결과", [["met", M.met.length], ["absent", M.ab.length], ["refuse", M.cases.filter(function (x) { return x.st === "refused"; }).length]]) + paper("복명서", "상주시청 · " + area + " 맞춤형복지팀 · " + mdDot(now) + " 작성", fs) + hh +
        '<p class="srcline only-screen">빈칸이 0이 되면 받기가 켜집니다 · 칸 이름은 시군 서식에 맞춰 바꿀 수 있는 가정(정의서 §7)</p>');
    }
    if (k === "d1") {
      if (!M.met.length) return '<div class="emptyc"><b>만난 가구가 없습니다</b>상담일지 초안은 «만남»으로 확정한 가구에만 생깁니다.</div>';
      var pk = hhPick(M.met), x = M.cases.filter(function (c) { return c.id === docHid; })[0];
      var dft = d1Draft(x);
      return ctl(pk + flowBtns("d1", true, "입력 순서 복사", "보관 hwpx 받기")) + sheet("d1", "상담일지 초안", bas + " · 가구 " + x.id, legendBox([["칸 순서", "행복이음 상담일지 입력 순서 그대로"], ["노랑 칸", "현장 기록을 규칙으로 정리한 문장 — 담당자가 고친 뒤 입력"], ["출처", "연계 후보 = 한국사회보장정보원 복지서비스 OpenAPI(15090532·15108347)"]], srcSw(["data", "rule", "ai"])),
        '<div class="paper">' + rulerOf(["data", "rule", "ai", "ai"]) + '<h3>상담일지 초안</h3><div class="sub">행복이음 입력용 · 자동 정리 · 공무원 확정 전 · 보관 hwpx는 가구 번호·읍면만</div><table class="doc-t pg-keep"><caption class="sr">상담일지 초안 항목</caption>' +
        dft.fields.map(function (f) { var a = /main|situation|plan|needs|action/.test(f.key); return "<tr><th>" + esc(f.label) + '</th><td data-src="' + (a ? "ai" : "rule") + '">' + (a ? "<mark>" + esc(f.value) + "</mark>" : '<span class="rule">' + esc(f.value) + "</span>") + "</td></tr>"; }).join("") + "</table></div>" +
        srcLine(esc(dft.note)));
    }
    if (k === "d3") {
      var cand = M.linked.length ? M.linked : M.met;
      if (!cand.length) return '<div class="emptyc"><b>연계할 가구가 없습니다</b>«만남» 기록에서 연계 후보를 고르면 의뢰서가 생깁니다.</div>';
      var pk3 = hhPick(cand), y = M.cases.filter(function (c) { return c.id === docHid; })[0];
      var keys = Object.keys(F.referral.ORGS), pk = docOrgPick[docHid]; docOrg = pk && keys.indexOf(pk) >= 0 ? pk : y.refs[0] && keys.indexOf(y.refs[0]) >= 0 ? y.refs[0] : "care"; // S12-v U14(B9): 고른 기관이 없을 때만 추천 기관
      var o = F.referral.ORGS[docOrg];
      var fs3 = [{ k: "받는 기관", src: "rule", v: o.org }, { k: "대상", src: "data", v: "가구 " + y.id + " · " + y.h.area + " · " + ageLine(y.h) + " (성명·연락처는 행복이음 확인 후 기재)" },
        { k: "의뢰 사유", src: refWhyOf(y.id, y.memo) ? "hand" : "ai", v: clip(refWhyOf(y.id, y.memo) || memoNoWhy(y.memo), 90) }, { k: "요청", src: "rule", v: o.ask.join(" · ") }, { k: "붙임", src: "rule", v: o.docs.join(", ") }];
      return ctl(pk3 + '<div class="hh-pick" role="group" aria-label="받는 기관">' + keys.filter(function (kk) { return kk !== "emergency"; }).map(function (kk) { return '<button type="button" data-org="' + kk + '" aria-pressed="' + (kk === docOrg) + '">' + esc(F.referral.ORGS[kk].org.replace(/\(.*\)/, "")) + "</button>"; }).join("") + "</div>" +
        flowBtns("d3", true, "hwpx 받기")) + sheet("d3", "서비스 연계 의뢰서", bas + " · 가구 " + y.id, legendBox([["의뢰 사유", "현장 기록에서 옮긴 문장 — 보내기 전 담당자 확인"], ["요청·붙임", "받는 기관별로 정해 둔 항목"], ["출처", "연계 후보 = 한국사회보장정보원 복지서비스 OpenAPI(15090532·15108347) · 본인 동의 확인 후 발송"]], srcSw(["data", "rule", "ai"])),
        paper(o.title, o.org + " 앞", fs3));
    }
    if (k === "d4") {
      var cand4 = M.ab.concat(M.linked);
      if (!cand4.length) return '<div class="emptyc"><b>보낼 안내가 없습니다</b>부재·연계 가구가 생기면 문안이 만들어집니다.</div>';
      var pk4 = hhPick(cand4), z = M.cases.filter(function (c) { return c.id === docHid; })[0];
      var vt = F.visitTime.profile(attempts(), z.id, { neighborLog: neighborLog() });
      var msg = NT.alimtalk(z.st === "absent" ? "absent" : "link", { area: z.h.area, date: z.at ? ymd(z.at) : null, time: z.at ? hm(z.at) : null, nextDate: ymd(U.addWorkdays(now, A.retryGap)), nextSlot: vt.best && /오전/.test(vt.best.label) ? "오전" : "오후" });
      var bad = NT.lint(msg.body, [z.id]);
      return ctl(pk4 + flowBtns("d4", !bad.length, "문안 복사")) + sheet("d4", "안내 문자 문안", bas + " · 가구 " + z.id, legendBox([["글자 수", msg.chars + "자 — 알림톡 한 통 기준"], ["점검", "이름·주소·서비스명·광고성 낱말이 없는지 규칙으로 확인 · " + (bad.length ? "걸림 " + bad.join(", ") : "통과")], ["출처", NT.SOURCE_TALK]], srcSw(["rule", "ai"])),
        '<div class="paper">' + rulerOf(["rule", "ai", "ai"]) + "<h3>" + esc(msg.title) + '</h3><div class="sub">알림톡 미리보기 · 발송은 담당자가 · ' + msg.chars + '자</div><pre class="doc-pre pg-keep">' + esc(msg.body) + "</pre></div>");
    }
    if (k === "d5") {
      docHid = "";
      var w = periodModel(docPer), mo = docPer === "mo", fs5 = [{ k: "기간", src: "rule", v: mdDot(w.from) + " ~ " + mdDot(w.to) }, { k: "방문", src: "rule", v: "만남 " + w.met + " · 부재 " + w.absent + " · 거절 " + w.refuse + " (총 " + w.total + "곳)" },
        { k: "읍면별", src: "rule", v: w.areas.map(function (a) { return a[0] + " " + a[1]; }).join(" · ") || "—" }, { k: "처리 완료", src: "rule", v: "명단 " + w.listN + "가구 중 " + w.doneN + "가구 확인" }]
        .concat(mo ? [{ k: "주차별 추세", src: "rule", v: w.weeks.map(function (x) { return x[0] + " " + x[1] + "곳"; }).join(" · ") || "—" }, { k: "수급권자 현황 비교", src: "data", v: w.cmp }] : [])
        .concat([{ k: "지역 배경", src: "data", v: w.rcp }]).concat(w.bp ? [{ k: "기초연금", src: "data", v: w.bp }] : []).concat([{ k: "한 줄 결론", src: "ai", v: w.concl }]);
      var perSw = '<div class="hh-pick" role="group" aria-label="보고 기간">' + [["wk", "주간"], ["mo", "월간"]].map(function (p) { return '<button type="button" data-per="' + p[0] + '" aria-pressed="' + (p[0] === docPer) + '">' + p[1] + "</button>"; }).join("") + "</div>";
      var lg5 = [["방문 곳 수", "기간 안에 방문 기록이 있는 가구 수 — 한 가구를 여러 번 가도 1곳(마지막 결과로 셈)"], ["처리 완료", "이번 차수 명단 가구 중 «만남·상담»까지 끝낸 가구"], ["기준", (mo ? "그달 1일~말일" : "월~금 한 주") + " · " + mdDot(w.from) + " ~ " + mdDot(w.to)], ["출처", "현장 기록 규칙 집계 · 지역 배경 = 한국사회보장정보원 «복지사업 시군구별 수급권자 현황»(15062448, 기준 2025-12)" + (w.bp ? " · 기초연금 = 보건복지부 «기초연금 인구 수급율 현황»(15161618, 시군구 단위)" : "")]];
      return ctl(perSw + flowBtns("d5:" + docPer, true, "hwpx 받기")) + sheet("d5", w.name + " 추진 실적 보고", "기간 " + dotDate(w.from) + " ~ " + dotDate(w.to), legendBox(lg5, serSw(["met", "absent", "refuse"].concat(mo ? ["visit"] : [])) + srcSw(["data", "rule", "ai"])),
        stackFig((mo ? "그달" : "그 주") + " 방문 결과", [["met", w.met], ["absent", w.absent], ["refuse", w.refuse]]) + (mo && w.weeks.length ? colFig("주차별 방문 곳 수", w.weeks, "visit") : "") +
        paper(w.name + " 추진 실적 보고", "상주시청 · " + area + " 맞춤형복지팀", fs5) + (mo && w.rcpRows.length ? '<table class="doc-t doc-rcp pg-keep"><caption>상주시 수급권자 현황(한국사회보장정보원 15062448, 2025-12)</caption><thead><tr><th>사업명</th><th>수급권자</th><th>수급가구</th></tr></thead><tbody>' + w.rcpRows.map(function (r) { return "<tr><td>" + esc(r[0]) + '</td><td data-src="data">' + esc(r[1]) + '</td><td data-src="data">' + esc(r[2]) + "</td></tr>"; }).join("") + "</tbody></table>" : ""));
    }
    if (k === "d7") {
      var c7 = handCands(M.cases);
      if (!c7.length) return '<div class="emptyc"><b>넘길 가구가 없습니다</b>방문 기록이 있는 가구에만 인계 카드가 생깁니다.</div>';
      var pk7 = hhPick(c7), x7 = M.cases.filter(function (c) { return c.id === docHid; })[0], D7 = d7Fields(M, x7, now);
      return ctl(pk7 + flowBtns("d7", true, "hwpx 받기")) + sheet("d7", "한 장 인계 카드", bas + " · 가구 " + x7.id, legendBox([["발굴 순위", "한국사회보장정보원 명단의 차수 순위"], ["방문·연락", "이 가구에 남은 방문·연락 기록 횟수"], ["넘겨줄 일", "부재 = 근무일 2일 뒤 재방문 · 거절 = 근무일 5일 뒤 다시 권유 · 만남 = 열린 약속"], ["받는 사람", "비워 두면 종이에 손으로 적습니다"]]),
        paper("한 장 인계 카드", "가구 " + x7.id + " · " + x7.h.area + " · 담당자 교체·부재 때 넘김", D7.fields));
    }
    if (k === "d8") {
      var c8 = bigCands(M.cases);
      if (!c8.length) return '<div class="emptyc"><b>남길 안내문이 없습니다</b>만남·부재 가구가 생기면 큰 글씨 안내문이 만들어집니다.</div>';
      var pk8 = hhPick(c8), x8 = M.cases.filter(function (c) { return c.id === docHid; })[0], B8 = d8Model(x8, now);
      // 집에 남기는 종이 — «읽는 법»은 담당자 화면에만(인쇄본에는 넣지 않음)
      return ctl(pk8 + flowBtns("d8", true, "hwpx 받기")) + sheet("d8", "큰 글씨 안내문", "방문일 " + vday, legendBox([["날짜", "부재 = 근무일 2일 뒤 · 만남 = 다음 연락 예정일"], ["넣지 않는 것", "가구 번호·성명·주소·사정 — 집에 남기는 종이라서"], ["전화번호", "담당자가 손으로 적습니다 · 한글에서 22pt 굵은 글씨로 열립니다"]], "", "no-print"),
        paper(B8.title, B8.sub, B8.cards.map(function (c) { return { k: c.k, src: "rule", v: c.v + (c.s ? " · " + c.s : "") }; })));
    }
    docHid = "";
    var R = roundRows();
    return ctl(flowBtns("d6", true, "xlsx 받기")) + sheet("d6", "차수 처리 결과 명단", roundYm() + " 차수 · 명단 " + R.length + "가구", legendBox([["결과", "가구마다 마지막 방문 기록(만남·부재·거절·방문 전)"], ["다음 확인", "열린 약속의 날짜와 내용"], ["출처", "명단 열 = 한국사회보장정보원 발굴대상자 조회 서식(가구 번호·읍면·순위만, 개인정보 4칸 제외) · 방문 4열 = 현장 기록"]], srcSw(["data", "rule"])),
      '<div class="paper">' + rulerOf(["data", "data", "rule"]) + '<h3>차수 처리 결과 명단</h3><div class="sub">' + esc(roundYm()) + " 명단 " + R.length + "가구 · 명단 열 + 방문 4열(방문일·결과·연계·다음 확인)</div>" +
      '<table class="doc-t wide"><caption class="sr">차수 처리 결과 명단</caption><thead><tr><th>가구</th><th>읍면</th><th>발굴 순위</th><th>방문일</th><th>결과</th><th>연계</th><th>다음 확인</th></tr></thead><tbody>' + R.map(function (r) { return "<tr>" + r.map(function (v, i) { return "<td" + (i >= 3 ? ' data-src="rule"><span class="rule">' + esc(v) + "</span>" : ' data-src="data">' + esc(v)) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>");
  }
  var SIGN_REV = {}; Object.keys(SIGN_OF).forEach(function (k) { SIGN_REV[SIGN_OF[k]] = k; });
  /** D5 실적 집계 — 숫자는 현장 기록 규칙 집계만(per: "wk" 주간 | "mo" 월간). 월간은 주차별 추세 + 15062448 비교 */
  function periodModel(per) {
    var mo = per === "mo", w = mo ? monthRange() : weekRange(), to2 = new Date(w.to.getTime() + 864e5), L = logs().filter(function (l) { var t = new Date(l.at); return t >= w.from && t < to2; });
    var last = {}; L.forEach(function (l) { if (!last[l.household_no] || last[l.household_no].at < l.at) last[l.household_no] = l; });
    var ids = Object.keys(last), met = ids.filter(function (i) { return last[i].result === "met"; }).length, ab = ids.filter(function (i) { return last[i].result === "absent"; }).length, rf = ids.filter(function (i) { return last[i].result === "refuse"; }).length;
    var ar = {}; ids.forEach(function (i) { if (BY[i]) ar[BY[i].area] = (ar[BY[i].area] || 0) + 1; });
    var listN = listIds().length, doneN = listIds().filter(function (i) { return statusOf(i) === "done"; }).length;
    var b = RCP && RCP.rows ? RCP.rows.filter(function (r) { return r["사업명"] === "기초생활보장(맞춤형급여)"; })[0] : null;
    return { from: w.from, to: w.to, met: met, absent: ab, refuse: rf, total: ids.length, areas: Object.keys(ar).map(function (a) { return [a, ar[a]]; }), listN: listN, doneN: doneN,
      rcp: b ? "상주시 기초생활보장 수급가구 " + b["수급가구수"].toLocaleString() + "(" + b["기준년월"] + ")" : "수급권자 현황 자료 없음",
      concl: (mo ? "이번 달 " : "이번 주 ") + ids.length + "곳 방문해 " + met + "가구 상담" + (ab ? ", 부재 " + ab + "가구는 " + (mo ? "다음 방문 때" : "다음 주") + " 다시 방문" : "") + ".",
      name: mo ? "월간" : "주간", per: mo ? "mo" : "wk", weeks: mo ? weekTrend(w, L) : [], rcpRows: rcpRows(),
      cmp: b ? "이번 달 상담 " + met + "가구 = 상주 기초생활보장 수급가구 " + b["수급가구수"].toLocaleString() + "의 " + (met / b["수급가구수"] * 100).toFixed(2) + "%(" + b["기준년월"] + " 기준)" : "수급권자 현황 자료 없음",
      // 79회차 SPEC §4 D5: 전 주(월) 대비 · 연계 건수 · 수급가구 수(비교 표 한 줄)
      prev: prevCounts(mo, w), links: ids.filter(function (i) { return last[i].result === "met" && F.referral.suggest({ text: last[i].memo, needs: F.askGuide.detect(last[i].memo) }).filter(function (x) { return x !== "emergency"; }).length; }).length,
      rcpN: b ? b["수급가구수"] : 0, bp: bpLine() };
  }
  /** 94회차: «상주시 기초연금 수급률 76.26%(2025-12) · 경북 22개 시군 중 8위» — 자료 없으면 빈 문자열(줄 자체를 안 그림) */
  function bpLine() { return BP && BP.rate ? "상주시 기초연금 수급률 " + BP.rate.toFixed(2) + "%(" + BP.ym + ") · 경북 " + BP.of + "개 시군 중 " + BP.rank + "위" : ""; }
  /** 바로 앞 기간(전 주 월~금 · 전 달) 방문 결과 — 같은 규칙(가구마다 마지막 결과)으로 센다 */
  function prevCounts(mo, w) {
    var p = mo ? monthRange(new Date(w.from.getFullYear(), w.from.getMonth() - 1, 15)) : weekRange(new Date(w.from.getTime() - 7 * 864e5)), to2 = new Date(p.to.getTime() + 864e5), last = {};
    logs().forEach(function (l) { var t = new Date(l.at); if (t >= p.from && t < to2 && (!last[l.household_no] || last[l.household_no].at < l.at)) last[l.household_no] = l; });
    var ids = Object.keys(last), c = function (r) { return ids.filter(function (i) { return last[i].result === r; }).length; };
    return { met: c("met"), absent: c("absent"), refuse: c("refuse"), total: ids.length };
  }
  /** 월간 주차별 방문 곳 수(월요일 시작 주, 규칙 집계) */
  function weekTrend(w, L) {
    var out = [], s = new Date(w.from.getTime()), i = 1;
    while (s <= w.to) {
      var e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7 - ((s.getDay() + 6) % 7)), seen = {};
      L.forEach(function (l) { var t = new Date(l.at); if (t >= s && t < e) seen[l.household_no] = 1; });
      out.push([i + "주", Object.keys(seen).length]); s = e; i++;
    }
    return out;
  }
  /** 한국사회보장정보원 15062448 상주 행 — 사업명·수급권자수·수급가구수(위 4줄) */
  function rcpRows() { return RCP && RCP.rows ? RCP.rows.slice(0, 4).map(function (r) { return [r["사업명"], r["수급권자수"].toLocaleString(), r["수급가구수"].toLocaleString()]; }) : []; }
  function roundRows() {
    var p = plan(), mt = meta();
    return listIds().map(function (id) {
      var L = lastLog(id), st = statusOf(id), c = caseOf(id), pr = F.promises.open(prAll(), id)[0];
      return [id, BY[id].area, String((mt[id] || {}).prio || "—"), L ? ymd(L.at) : "", st === "done" ? "만남" : st === "absent" ? "부재" : st === "refused" ? "거절" : "방문 전", c.refs.length ? F.referral.ORGS[c.refs[0]].org.replace(/\(.*\)/, "") : "", pr ? (pr.due || "") + " " + clip(pr.text, 18) : ""];
    });
  }
  var hwpxP = null, libFail = false;
  function needLibs() {
    if (window.DaeumHwpx && window.DaeumXlsx) return Promise.resolve();
    if (hwpxP) return hwpxP;
    function load(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); no(new Error("lib")); }; document.head.appendChild(s); }); }
    hwpxP = (window.DaeumXlsx ? Promise.resolve() : load("shared/xlsx.js?v=s12z109")).then(function () { return window.DaeumHwpx ? null : load("shared/hwpx.js?v=s12z109"); })
      .then(function () { libFail = false; }, function (e) { hwpxP = null; libFail = true; throw e; }); // S12-v U13(B8): 실패를 기억하지 않는다
    return hwpxP;
  }
  window.addEventListener("online", function () { // S12-v U13(B8): 전파가 돌아오면 실패했던 원문·문서 부품을 다시 부른다
    if (AK.svFail) { AK.svFail = false; needSvc().then(function () { if (AK.cur === "talk") render(); }, function () { if (AK.cur === "talk") render(); }); }
    if (libFail) { libFail = false; needLibs().then(function () { toast("문서 부품을 다시 불러왔습니다 · «받기»를 다시 눌러 주세요"); }, function () { /* 다음 online 때 */ }); }
  });
  function d2Rows(M, now) { return M.cases.map(function (c) { var nx = c.st === "planned" ? null : nextStep(c, now); return [c.id, c.h.area, c.st === "done" ? "만남" : c.st === "absent" ? "부재" : c.st === "refused" ? "거절" : "방문 전", c.st === "done" ? clip(String(c.memo || "").replace(/^확인:\s*/, ""), 60) : "", nx ? mdDot(nx.date) + " " + nx.text : "—"]; }); }
  /** 104회차 ⚙️ 파로C — 오늘 탭 «복명서 바로 받기»(AK.dayZip, 파로A 59b8624 연결): 그날 복명서 1건 + 만난 가구 상담일지 초안을 ZIP 하나로(shared/doczip.js DaeumDocZip.download).
      문서는 새로 만들지 않고 문서함 «받기»와 같은 d2Hwpx·d1Hwpx 모델을 그대로 묶는다. 방문한 날이 없으면 문서함으로. dayZipInput 은 시험용(묶을 입력만) */
  function dayZipInput(M, TW) {
    var now = M.past && M.dd.date ? new Date(M.dd.date + "T17:30:00") : new Date(), area = BY[M.dd.ids[0]].area, made = now.getFullYear() + ". " + (now.getMonth() + 1) + ". " + now.getDate() + ".", office = "상주시청 · " + area + " 맞춤형복지팀";
    return { day: M.dd.date || ymd(now), d2: { doc: d2Hwpx(d2Fields(M), d2Rows(M, now), made, office, TW || 0) },
      d1: M.met.map(function (x) { return { hid: x.id, at: x.at, doc: d1Hwpx(x, d1Draft(x), made, office, TW || 0) }; }) };
  }
  function dayZip() {
    var M = docModel(); if (!M.dd || !M.dd.ids.length) { location.hash = "#docs"; return Promise.resolve(false); }
    function load(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); no(new Error("lib")); }; document.head.appendChild(s); }); }
    return SH.busy(needLibs().then(function () { return window.DaeumDocZip ? null : load("shared/doczip.js?v=s12z109"); }).then(function () {
      var inp = dayZipInput(M, window.DaeumHwpx && window.DaeumHwpx.TW);
      return window.DaeumDocZip.download(inp).then(function () { markDone(M, "d2", "day"); inp.d1.forEach(function (x) { markDone(M, "d1", x.hid); }); toast("복명서·상담일지 " + inp.d1.length + "가구를 ZIP 하나로 받았습니다"); return true; });
    }), "복명서 묶는 중").catch(function () { toast("문서 부품을 불러오지 못했습니다 · 문서함에서 하나씩 받아 주세요"); return false; });
  }
  function getDoc(M, k, alt) {
    var now = M.past && M.dd.date ? new Date(M.dd.date + "T17:30:00") : new Date(), area = BY[M.dd.ids[0]].area, made = now.getFullYear() + ". " + (now.getMonth() + 1) + ". " + now.getDate() + ".", office = "상주시청 · " + area + " 맞춤형복지팀";
    if (k === "d1" && !alt) { var x = M.cases.filter(function (c) { return c.id === docHid; })[0]; copy(d1Draft(x).text); markDone(M, k, x.id); render(); return; }
    if (k === "d4") { var z = M.cases.filter(function (c) { return c.id === docHid; })[0]; var vt = F.visitTime.profile(attempts(), z.id, {}); copy(NT.alimtalk(z.st === "absent" ? "absent" : "link", { area: z.h.area, date: z.at ? ymd(z.at) : null, time: z.at ? hm(z.at) : null, nextDate: ymd(U.addWorkdays(now, A.retryGap)), nextSlot: vt.best && /오전/.test(vt.best.label) ? "오전" : "오후" }).copy); markDone(M, k, z.id); render(); return; }
    var vday = M.dd.date ? M.dd.date + "T12:00:00" : now; // S12-z: 파일 이름 날짜 = 방문한 날(가구 문서는 그 가구 방문 시각) · 실적·차수 결과는 만든 날
    SH.busy(needLibs().then(function () {
      var W2 = window.DaeumHwpx, TW = W2 && W2.TW || 0;
      if (k === "d1") {
        var x1 = M.cases.filter(function (c) { return c.id === docHid; })[0];
        return W2.download(d1Hwpx(x1, d1Draft(x1), made, office, TW), fnm(x1.at || vday, x1.id, "상담일지초안", "hwpx")).then(function () { markDone(M, k, x1.id); });
      }
      if (k === "d2") {
        var fs = d2Fields(M), rows2 = d2Rows(M, now);
        return W2.download(d2Hwpx(fs, rows2, made, office, TW), fnm(vday, null, "복명서", "hwpx")).then(function () { markDone(M, k, "day"); });
      }
      if (k === "d3") {
        var y = M.cases.filter(function (c) { return c.id === docHid; })[0];
        var rec = { text: F.askGuide.draft({ label: "가구 " + y.id, area: y.h.area, at: y.at, method: "방문 상담", needs: F.askGuide.detect(y.memo), summary: memoNoWhy(y.memo), guide: F.askGuide.check(y.memo, null, {}) }).text, area: y.h.area, label: "가구 " + y.id, at: y.at, why: refWhyOf(y.id, y.memo) };
        return W2.download(F.referral.build(rec, docOrg, { office: y.h.area + " 맞춤형복지팀" }), F.referral.fileName(docOrg, y.at || vday, y.id)).then(function () { markDone(M, k, y.id); });
      }
      if (k === "d5") {
        var w = periodModel(docPer);
        return W2.download(d5Hwpx(w, made, office, TW), fnm(now, null, w.per === "mo" ? "월간실적" : "주간실적", "hwpx")).then(function () { markDone(M, k, w.per); });
      }
      if (k === "d7") {
        var x7 = M.cases.filter(function (c) { return c.id === docHid; })[0];
        return W2.download(d7Hwpx(x7, d7Fields(M, x7, now), made, office, TW), fnm(x7.at || vday, x7.id, "인계카드", "hwpx")).then(function () { markDone(M, k, x7.id); });
      }
      if (k === "d8") {
        var x8 = M.cases.filter(function (c) { return c.id === docHid; })[0];
        return W2.download(d8Hwpx(d8Model(x8, now), made), fnm(x8.at || vday, x8.id, "큰글씨안내문", "hwpx")).then(function () { markDone(M, k, x8.id); });
      }
      if (k === "d6") {
        var R = roundRows();
        return window.DaeumXlsx.download({ title: "차수 처리 결과 명단", subtitle: roundYm() + " 명단", made: made + " " + hm(now), office: office, conclusion: "명단 " + R.length + "가구 중 " + R.filter(function (r) { return r[4] === "만남"; }).length + "가구 상담", note: "※ 시연용 가상 자료 · 개인정보 4칸 없음",
          sheets: [{ name: "처리 결과", title: "<표 1> 차수 처리 결과", unit: "단위: 가구", columns: [{ key: "a", h: "가구", type: "text", w: 10 }, { key: "b", h: "읍면", type: "text", w: 10 }, { key: "c", h: "발굴 순위", type: "text", w: 9 }, { key: "d", h: "방문일", type: "text", w: 12 }, { key: "e", h: "결과", type: "text", w: 9 }, { key: "f", h: "연계", type: "text", w: 22 }, { key: "g", h: "다음 확인", type: "text", w: 28 }], rows: R, total: false, src: "※ 출처: 한국사회보장정보원 발굴대상자 조회 서식(가상) + 닿음 현장 기록" }],
          sources: [{ kind: "가상", org: "닿음", name: "시연용 가상 가구", date: ymd(now), use: "명단·방문 결과" }], footer: "닿음" }, fnm(now, null, "차수결과_" + roundYm() + "차수", "xlsx")).then(function () { markDone(M, k, "round"); });
      }
    }), "문서를 만드는 중…").then(function () { toast("내려받았습니다"); render(); }, function () { toast(libFail || navigator.onLine === false ? "연결이 끊겨 파일을 만들지 못했습니다 — 연결되면 다시 불러옵니다" : "파일을 만들지 못했습니다 — 다시 눌러 주세요"); });
  }
  /** S12-e 43: 지금 미리보기 한 장을 A4로 — 창 제목을 문서 이름으로 바꿔 PDF 저장 이름이 «복명서_20261103»처럼 나오게 */
  function printDoc() {
    var a = app.querySelector(".print-doc"); if (!a) return;
    var old = document.title, M = docModel();
    document.title = fnm(M.dd && M.dd.date ? M.dd.date + "T12:00:00" : new Date(), docHid, a.dataset.docName || "문서"); // S12-z: PDF 저장 이름도 같은 규칙
    document.body.classList.add("printing-doc");
    var back = function () { document.title = old; document.body.classList.remove("printing-doc"); window.removeEventListener("afterprint", back); };
    window.addEventListener("afterprint", back);
    try { window.print(); } catch (e) { /* 인쇄 불가 */ }
    setTimeout(back, 1500);
  }
  /** S12-d 40: 목록에서 문서를 고르면 미리보기로 옮긴다 — 폰(한 줄 배치)에서 미리보기가 목록 아래에 있어 안 보이던 문제. 이미 화면 안이면 포커스만 */
  function toPrev() {
    var pv = document.getElementById("docPrev"); if (!pv) return;
    var r = pv.getBoundingClientRect(), vh = window.innerHeight || 800;
    pv.focus({ preventScroll: true });
    if (r.top >= 0 && r.top < vh * 0.5) return;
    var col = app.querySelector(".col"); if (!col) return; // S12-x 65회차: 스크롤 칸 = 셸 .col(옛 window)
    var y = col.scrollTop + r.top - col.getBoundingClientRect().top - 12;
    col.scrollTo(RM_ ? { top: y } : { top: y, behavior: "smooth" });
  }
  /** 78회차 ⓪-4: 빨간 필수칸(입력 필요) 안내를 누르면 첫 빈 입력칸으로 스크롤+초점 — 옛 흐름은 미리보기 맨 위로만 가서 «빨간 부분 클릭이 안 됨» */
  function fillGo() {
    var el = app.querySelector('#docPrev input[data-fill]:not(.ok)') || app.querySelector('.main input[data-fill]:not(.ok)'); if (!el) return false;
    var c = el.closest(".col"), td = el.closest("td") || el;
    if (el.closest(".rvw-s")) td.scrollIntoView({ block: "center" }); // 107회차: 큰 화면 칸의 A4 안 빈칸
    else if (c) { var y = c.scrollTop + td.getBoundingClientRect().top - c.getBoundingClientRect().top - c.clientHeight / 3; colTo(c, Math.max(0, y)); } else td.scrollIntoView({ block: "center" });
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    td.classList.remove("m-just"); void td.offsetWidth; td.classList.add("m-just");
    return true;
  }
  function bindDocs() {
    bindHrec();
    if (FD) FD.bindReport(app);
    var M = docModel(); if (!M.dd) return;
    app.querySelectorAll(".dep [data-doc]").forEach(function (b) { // 105회차: 줄(div role=button) 누름·Enter·Space = 고르기 · 미리보기 안 <article data-doc> 는 제외
      function pick() { docSel = b.dataset.doc; docHid = null; render(); toPrev(); }
      b.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("button")) return; pick(); });
      b.addEventListener("keydown", function (e) { if (e.target === b && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(); } });
    });
    app.querySelectorAll(".dep [data-pv]").forEach(function (b) { b.addEventListener("click", function () { vib(); if (docSel !== b.dataset.pv) docHid = null; docSel = b.dataset.pv; pvOpen = docSel; pvZ = 1; render(); }); });
    app.querySelectorAll(".dep [data-mkget]").forEach(function (b) { b.addEventListener("click", function () { // 줄의 보조 단추 = 그 문서를 고르고 주 단추(만들기→받기)와 같은 흐름 · 폰 «인쇄·PDF»는 인쇄 창
      vib(); var k = b.dataset.mkget, pr = !!b.dataset.print; if (docSel !== k) docHid = null; docSel = k; render();
      if (pr) { printDoc(); return; }
      if (app.querySelector("#docPrev .rvw.inl")) { pvGet(docModel()); return; } // 107회차 차이 7: 큰 화면 «받기» = 만들기까지 한 번에(빈칸 남으면 빈칸으로)
      var d = app.querySelector('[data-act="dockdoc"]'); if (d) d.click(); else { var g = app.querySelector('#docPrev [data-act="get"]:not([disabled])'); if (g) g.click(); else toPrev(); }
    }); });
    bindPv(M);
    app.querySelectorAll("[data-day]").forEach(function (b) { b.addEventListener("click", function () { var v = b.dataset.day; docDay = /^h/.test(v) ? v : +v; docHid = null; render(); if (b.closest(".dhist")) toPrev(); }); });
    var pr = app.querySelector('[data-act="print"]'); if (pr) pr.addEventListener("click", function () { printDoc(); });
    app.querySelectorAll("[data-hh]").forEach(function (b) { b.addEventListener("click", function () { docHid = b.dataset.hh; render(); }); });
    app.querySelectorAll("[data-org]").forEach(function (b) { b.addEventListener("click", function () { docOrg = docOrgPick[docHid] = b.dataset.org; made1["d3:" + docHid] = made1["d3:" + docHid] || false; render(); }); });
    var mk = app.querySelector('[data-act="make"]'); if (mk) mk.addEventListener("click", function () { vib(); made1[(docSel === "d5" ? "d5:" + docPer : docSel) + ":" + (docHid || "")] = true; render(); });
    var dd = app.querySelector('[data-act="dockdoc"]'); if (dd) dd.addEventListener("click", function () { // 74회차: 주 단추 = 미리보기 안 «만들기»·«받기»를 대신 누름(받기가 꺼져 있으면 미리보기 빈칸으로)
      if (app.querySelector("#docPrev .rvw.inl")) { vib(); pvGet(M); return; } // 107회차: 큰 화면은 한 번에 받기
      var pv = app.querySelector("#docPrev"), m = pv && pv.querySelector('[data-act="make"]'), g = pv && pv.querySelector('[data-act="get"]:not([disabled])');
      var m1 = !!made1[(docSel === "d5" ? "d5:" + docPer : docSel) + ":" + (docHid || "")];
      if (!m1 && m) m.click(); else if (g) g.click(); else if (!fillGo() && pv) { pv.scrollIntoView({ block: "start" }); try { pv.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } toast("빨간 빈칸을 채우면 받기가 켜집니다"); }
    });
    app.querySelectorAll('[data-act="fillgo"]').forEach(function (b) { b.addEventListener("click", function () { if (!fillGo()) toast("채울 빈칸을 찾지 못했습니다"); }); });
    app.querySelectorAll('[data-act="get"]').forEach(function (gt) { gt.addEventListener("click", function () { vib(); getDoc(M, docSel, !!gt.dataset.alt); }); });
    app.querySelectorAll("[data-per]").forEach(function (b) { b.addEventListener("click", function () { docPer = b.dataset.per === "mo" ? "mo" : "wk"; render(); }); });
    app.querySelectorAll("[data-fill]").forEach(function (inp) { inp.addEventListener("change", function () { var a = fills(), o = a[M.key] || {}; o[inp.dataset.fill] = inp.value.trim().slice(0, 40); a[M.key] = o; lsSet(LS_FILL, a); render(); }); });
  }


  // ── 내보내기(app.js·다른 탭이 읽는 이름) ──
  AK.put({
    perfView: function () { return perfView; }, perfModel: function () { return perfModel; }, bindPerf: function () { return bindPerf; }, docModel: function () { return docModel; }, LS_HEDIT: function () { return LS_HEDIT; },
    docsView: function () { return docsView; }, ST_LBL: function () { return ST_LBL; }, LEG: function () { return LEG; }, bindDocs: function () { return bindDocs; },
    dayZip: function () { return dayZip; }, dayZipInput: function () { return dayZipInput; }
  });
  return relink;
};
