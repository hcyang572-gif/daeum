/* S11-b 재구축 1(11-03) — 시안 B «소나무빛» 화면 동작. 정본 시안: _design/S11_전면개편_설계/index.html
   ① 첫 화면 숫자(실제 자료) ② 첫 실행 둘러보기 4컷(자동 + 건너뛰기) ③ 데이터 활용 흐름 + 데이터 카드 시트 + 머리줄 ⓘ
   ④ 오늘(진행 고리·할 일 3줄 — 기존 칸 값을 옮김) ⑤ 방문 거리 막대 ⑥ 기록: AI 처리 4칸·근거 형광·확인 단계 꼬리표·확정 전 복사 잠금
   ⑦ 보고: 읍면 지표(행안부·건축HUB 실제 값) · 보고서 받기.
   새 계산은 만들지 않는다 — officer.js·mount.js·shared/ai.js 결과를 읽어 보이기만 한다. 문구는 사실만(감성 문장 금지). */
(function (root) {
  "use strict";
  var doc = root.document;
  var RM = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(id) { return doc.getElementById(id); }
  function qa(sel, r) { return [].slice.call((r || doc).querySelectorAll(sel)); }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* 막힘 */ } }
  function fmt(n) { return Number(n).toLocaleString("ko-KR"); }
  function setAll(cls, v) { qa("." + cls).forEach(function (e) { e.textContent = v; }); }

  // ── 데이터 카드 정의(시안 D 그대로 — 기관·번호·기준일은 data/README.md 와 같음) ──
  var D = {
    svc: { mk: "api", org: "한국사회보장정보원", name: "중앙부처·지자체 복지서비스", no: "OpenAPI 15090532 · 15108347", n: "369",
      what: "정부 부처와 시·도·시·군이 운영하는 복지서비스 목록과 지원 조건입니다.", ex: "에너지바우처 · 기후에너지환경부 / 상주시 효도수당 · 상주시",
      base: "2026-11-02 수집", count: "중앙부처 351건 + 지자체 18건(경북 13 · 상주 5)",
      uses: [["route", "방문 › 서비스 후보", "나이·사정 조건으로 집마다 표시"], ["record", "기록 › AI 연계 후보", "규칙이 추린 50건 중 AI 선택, 근거 낱말 표시"], ["report", "보고 › 서비스 연계", "안내·신청 건을 서비스별 집계"]] },
    d5: { mk: "file", org: "한국사회보장정보원", name: "복지사업 시군구별 수급권자 현황", no: "파일 15062448", n: "3,868",
      what: "복지사업별로 시군구의 수급자 수와 수급가구 수를 센 통계입니다.", ex: "상주시 기초생계급여 수급가구 3,868 · 수급권자 4,537(2025-12)",
      base: "2025-12 기준 · 2026-10-29 받음", count: "상주시 10개 사업",
      uses: [["report", "보고 › 상주 비교 기준", "이번 차수 연계 실적 옆에 표시"], ["region", "보고 › 더 보기 › 다른 시군", "경북 시군 규모 비교"]] },
    list: { mk: "virt", org: "한국사회보장정보원", name: "복지사각지대 발굴관리시스템 명단", no: "가상 시연(같은 형식)", n: "300",
      what: "단전·체납 등 위기 신호가 겹친 가구를 골라 읍면에 보내는 명단입니다. 실제 명단은 비공개 행정망 자료라 같은 형식의 가상 가구를 씁니다.",
      ex: "가상 가구 · 읍면 · 위기 신호(가상)", base: "합성 2026-10-29(시드 고정)", count: "가상 가구 · 오늘 9곳",
      uses: [["today", "오늘 › 방문할 집", "새 명단과 이어서 볼 집 합산"], ["route", "방문 › 방문 순서", "가까운 집끼리 묶어 순서·시각 산출"]] },
    pop: { mk: "file", org: "행정안전부", name: "행정동 연령별 인구 · 세대원수별 세대", no: "파일 15097972 · 15097974", n: "",
      what: "읍면동별 나이별 인구와 1인 세대 수 통계입니다.", ex: "읍면동별 1인 세대 비율 · 75세 이상 비율(2026-09-30)",
      base: "2026-09-30 기준", count: "상주 24개 읍면동",
      uses: [["report", "보고 › 읍면 지표", "1인 세대·75세 이상 비율, 고독사 위험도(닿음 추정)"], ["route", "방문 › 자세히", "그 읍면 위험도 한 줄"]] },
    wx: { mk: "virt", org: "기상청", name: "기상특보 조회서비스", no: "OpenAPI 15000415 · 시연은 저장 시나리오", n: "",
      what: "기상청이 발표하는 한파·폭염 등 특보입니다.", ex: "한파주의보 발효(가상 시나리오)", base: "실시간 호출 없음", count: "시나리오 2종(한파·폭염)",
      uses: [["today", "오늘 › 순서 조정 한 줄", "특보 때 홀로 사는 75세 이상 가구 앞당김"]] },
    bld: { mk: "api", org: "국토교통부", name: "건축HUB 건축물대장정보", no: "OpenAPI 15134735 · 미리 받아 저장", n: "",
      what: "건물별 사용승인일 등이 적힌 건축물대장입니다.", ex: "읍면별 30년 넘은 주택 비율", base: "2026-10-30 받음", count: "읍면별 집계",
      uses: [["report", "보고 › 읍면 지표", "오래된 집 비율"], ["route", "방문 › 자세히", "난방 점검 메모"]] },
    med: { mk: "api", org: "국립중앙의료원", name: "병·의원 찾기 · 약국 정보", no: "OpenAPI 15000736 · 15000576 · 미리 받아 저장", n: "",
      what: "병원·약국 위치와 진료 시간입니다.", ex: "방문 시각에 문 연 가까운 약국 1곳 표시", base: "2026-10-30 받음", count: "상주 의료기관·약국",
      uses: [["route", "방문 › 자세히", "방문 시각 기준 문 연 곳"]] },
    s1: { mk: "soon", org: "한국사회보장정보원", name: "민간복지서비스정보", no: "파일 15116392 · 확장 예정", n: "",
      what: "민간 기관의 복지 지원 사업 목록입니다.", ex: "미적재", base: "—", count: "—", uses: [["record", "기록 › AI 연계 후보", "민간 사업 추가 예정"]] },
    s2: { mk: "soon", org: "한국사회보장정보원", name: "사회서비스 제공기관 정보 검색", no: "OpenAPI 15057683 · 확장 예정", n: "",
      what: "돌봄 등 사회서비스 제공기관 목록입니다.", ex: "미적재", base: "—", count: "—", uses: [["route", "방문 › 자세히", "가까운 제공기관 추가 예정"]] }
  };
  var MKL = { api: "OpenAPI로 받음(실제)", file: "파일로 받음(실제)", virt: "가상 시연", soon: "확장 예정" };
  // 화면별 «이 화면에 쓰인 데이터»(ⓘ)
  var SCR = { home: ["svc", "d5", "list"], today: ["list", "wx", "pop", "bld"], route: ["list", "svc", "bld", "med", "pop"], contacts: ["list"],
    record: ["svc", "s1"], report: ["svc", "d5", "pop", "bld"], board: ["svc", "list"], data: ["svc", "d5", "list", "pop", "wx", "bld", "med"],
    list: ["list", "pop", "bld"], intake: ["list"], cost: ["list"], region: ["d5", "pop"] };
  var LINK = { svc: ["t2", "t4", "t3"], list: ["t1"], d5: ["t3"], pop: ["t1", "t3"], wx: ["t1"], bld: ["t1", "t3"], med: ["t1"], s1: ["t2"], s2: ["t2"] };
  var T2R = { t1: ["r1"], t2: ["r2"], t4: ["r2"], t3: ["r3"] };
  var NAMES = { home: "첫 화면", today: "1 오늘", route: "2 방문", record: "3 기록", report: "4 보고", data: "데이터 활용" };

  function tab() { var t = (root.location.hash || "#home").slice(1); return $("tab-" + t) ? t : "home"; }

  // ── 시트 ──
  var sheet, scrim, lastFocus = null;
  function buildSheet() {
    scrim = doc.createElement("div"); scrim.className = "s11-scrim"; scrim.addEventListener("click", closeSheet);
    sheet = doc.createElement("div"); sheet.className = "s11-sheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-label", "데이터");
    sheet.innerHTML = '<div class="grab"></div><div class="sh-body"></div>';
    doc.body.appendChild(scrim); doc.body.appendChild(sheet);
    sheet.addEventListener("click", function (e) {
      var x = e.target.closest("[data-close]"); if (x) { closeSheet(); return; }
      var c = e.target.closest("[data-card]"); if (c) { openSheet(cardHTML(c.dataset.card)); return; }
      var u = e.target.closest("[data-go]"); if (u) { closeSheet(); root.location.hash = "#" + u.dataset.go; }
    });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && doc.body.classList.contains("s11-sheet-on")) closeSheet(); });
  }
  function openSheet(html) {
    if (!doc.body.classList.contains("s11-sheet-on")) lastFocus = doc.activeElement;
    sheet.querySelector(".sh-body").innerHTML = html; doc.body.classList.add("s11-sheet-on"); sheet.scrollTop = 0;
    var b = sheet.querySelector(".x"); if (b) try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
  }
  function closeSheet() { doc.body.classList.remove("s11-sheet-on"); var f = $("s11Flow"); if (f) { f.classList.remove("lit"); delete f.dataset.sel; hot(); } if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  var X = '<button type="button" class="x" data-close aria-label="닫기">×</button>';
  function listHTML(t) {
    var ks = SCR[t] || SCR.home;
    return '<div class="sh-h"><h3>이 화면에 쓰인 데이터</h3>' + X + '</div><p class="sm">' + esc(NAMES[t] || "이 화면") + ' · 누르면 데이터 카드</p><div class="sl">' +
      ks.map(function (k) { var d = D[k]; return '<button type="button" class="use" data-card="' + k + '"><span><b><i class="mk ' + d.mk + '"></i>' + esc(d.org) + ' · ' + esc(d.name) + '</b><span>' + esc(MKL[d.mk]) + ' · ' + esc(d.no) + '</span></span><span aria-hidden="true">›</span></button>'; }).join("") + "</div>";
  }
  function cardHTML(k) {
    var d = D[k]; if (!d) return listHTML(tab());
    return '<div class="sh-h"><span class="s11-xs" style="font-weight:600"><i class="mk ' + d.mk + '"></i> ' + esc(MKL[d.mk]) + '</span>' + X + '</div>' +
      '<div class="dc"><h3>' + esc(d.org) + ' · ' + esc(d.name) + '</h3><p class="what">' + esc(d.what) + '</p>' +
      '<div class="ex"><small>예시</small>' + esc(d.ex) + '</div>' +
      '<dl><dt>데이터</dt><dd>' + esc(d.no) + '</dd><dt>기준</dt><dd>' + esc(d.base) + '</dd><dt>건수</dt><dd>' + esc(d.count) + '</dd></dl>' +
      '<span class="lbl2">어디에 어떻게 반영되나요</span><div class="sl" style="margin-top:0">' +
      d.uses.map(function (u) { return '<button type="button" class="use" data-go="' + u[0] + '"><span><b>' + esc(u[1]) + '</b><span>' + esc(u[2]) + '</span></span><span aria-hidden="true">›</span></button>'; }).join("") + "</div></div>";
  }

  // ── 데이터 활용 흐름 ──
  function buildFlow() {
    var f = $("s11Flow"); if (!f) return;
    var down = '<div class="arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 4v16M6 14l6 6 6-6"/></svg></div>';
    function node(k, main) { var d = D[k]; return '<button type="button" class="dn ' + (main ? "main" : "aux") + '" data-node="' + k + '"><i class="mk ' + d.mk + '"></i><span><b>' + esc(main ? d.name : d.org + " · " + d.name) + '</b>' + (main ? '<span>' + esc(d.no) + '</span>' : "") + '</span><em>' + esc(main ? d.n : "") + '</em></button>'; }
    f.insertAdjacentHTML("beforeend",
      '<div class="dgrp"><h4>한국사회보장정보원</h4>' + ["svc", "d5", "list"].map(function (k) { return node(k, true); }).join("") +
      '<h4>보조</h4>' + ["pop", "wx", "bld", "med"].map(function (k) { return node(k, false); }).join("") +
      '<h4>확장 예정</h4>' + ["s1", "s2"].map(function (k) { return node(k, false); }).join("") + "</div>" + down +
      '<div class="dgrp"><h4>닿음이 하는 일</h4><div class="task" data-k="t1">가까운 집끼리 묶고 위험 가구 앞당김</div>' +
      '<div class="task" data-k="t2"><span class="ab" style="background:var(--pine);color:#fff">AI</span>사정에 맞는 서비스 선택(후보 50건 안)</div>' +
      '<div class="task" data-k="t4"><span class="ab" style="background:var(--pine);color:#fff">AI</span>상담 내용 → 행복이음 입력 초안</div>' +
      '<div class="task" data-k="t3">기록 집계 · 보고서 작성</div></div>' + down +
      '<div class="dgrp"><h4>공무원이 얻는 것</h4><a class="res" data-k="r1" href="#route">방문 순서</a><a class="res" data-k="r2" href="#record">서비스 후보 · 상담 초안</a><a class="res" data-k="r3" href="#report">보고서</a></div>');
    f.addEventListener("click", function (e) {
      var n = e.target.closest("[data-node]"); if (!n) return;
      f.dataset.sel = n.dataset.node; f.classList.add("lit"); hot(); openSheet(cardHTML(n.dataset.node));
    });
  }
  function links() {
    var f = $("s11Flow"); if (!f) return; var svg = f.querySelector("svg.links");
    if (!svg || root.getComputedStyle(svg).display === "none" || !f.offsetWidth) { if (svg) svg.innerHTML = ""; return; }
    var R = f.getBoundingClientRect(), h = "";
    function pt(el, side) { var r = el.getBoundingClientRect(); return [side === "r" ? r.right - R.left : r.left - R.left, r.top - R.top + r.height / 2]; }
    function cur(a, b, k1, k2) { var p = pt(a, "r"), q = pt(b, "l"), m = (p[0] + q[0]) / 2; h += '<path data-a="' + k1 + '" data-b="' + k2 + '" d="M' + p[0] + " " + p[1] + "C" + m + " " + p[1] + " " + m + " " + q[1] + " " + q[0] + " " + q[1] + '"/>'; }
    Object.keys(LINK).forEach(function (k) { var a = f.querySelector('[data-node="' + k + '"]'); LINK[k].forEach(function (t) { var b = f.querySelector('[data-k="' + t + '"]'); if (a && b) cur(a, b, k, t); }); });
    Object.keys(T2R).forEach(function (t) { var a = f.querySelector('[data-k="' + t + '"]'); T2R[t].forEach(function (r) { var b = f.querySelector('[data-k="' + r + '"]'); if (a && b) cur(a, b, t, r); }); });
    svg.innerHTML = h; hot();
  }
  function hot() {
    var f = $("s11Flow"); if (!f) return; var k = f.dataset.sel, ts = k ? (LINK[k] || []) : [], rs = [];
    ts.forEach(function (t) { rs = rs.concat(T2R[t] || []); });
    qa("[data-node],[data-k]", f).forEach(function (el) { var id = el.dataset.node || el.dataset.k; el.classList.toggle("hot", !!k && (id === k || ts.indexOf(id) >= 0 || rs.indexOf(id) >= 0)); });
    qa(".links path", f).forEach(function (p) { p.classList.toggle("hot", !!k && ((p.dataset.a === k) || (ts.indexOf(p.dataset.a) >= 0 && rs.indexOf(p.dataset.b) >= 0))); });
  }

  // ── 숫자 굴러가기(640ms) ──
  function roll(el, to) {
    if (!el) return; var txt = fmt(to);
    if (RM || !(to > 0) || !root.requestAnimationFrame) { el.textContent = txt; return; }
    var t0 = null; (function f(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 640), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(to * e)); if (k < 1) root.requestAnimationFrame(f); })(root.performance ? root.performance.now() : 0);
  }

  // ── 첫 화면·공통 숫자 ──
  function O() { return root.DaeumOfficer; }
  function fillCounts(animate) {
    var o = O(), n = o && o.picked ? o.picked().length : 0;
    if (n) qa(".s11-todayn").forEach(function (e) { if (animate && e.closest("#tab-home")) roll(e, n); else e.textContent = n; });
    var R = (o && o.recipients && o.recipients()) || root.__DAEUM_RECIPIENTS__, row = R && R.rows ? R.rows.filter(function (r) { return r["사업명"] === "기초생계급여"; })[0] : null;
    if (row) {
      if (animate) roll($("s11Rcp"), row["수급가구수"]); else $("s11Rcp").textContent = fmt(row["수급가구수"]);
      if ($("s11Rcp2")) $("s11Rcp2").textContent = fmt(row["수급가구수"]);
      ["s11RcpMonth", "s11RcpMonth2"].forEach(function (id) { if ($(id)) $(id).textContent = row["기준년월"]; });
    }
    if (animate) qa("#tab-home .s11-svcn").forEach(function (e) { roll(e, 369); });
  }

  // ── 오늘 ──
  function fillToday() {
    function txt(id) { var e = $(id); var t = e ? e.textContent.trim() : ""; return /^\d/.test(t) ? t : "—"; }
    setAll("s11-rev", txt("kpiRevisit")); setAll("s11-gap", txt("kpiGap")); setAll("s11-req", txt("kpiReq"));
    var o = O(), F = root.DaeumFeatures, ids = o && o.picked ? o.picked() : [], did = 0;
    try {
      var today = new Date(), ymd = today.getFullYear() + "-" + ("0" + (today.getMonth() + 1)).slice(-2) + "-" + ("0" + today.getDate()).slice(-2), seen = {};
      ((F && F.store && F.store.get("attempts", [])) || []).forEach(function (a) { var d = new Date(a.at); var y = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); if (y === ymd && ids.indexOf(a.householdId) >= 0) seen[a.householdId] = 1; });
      did = Object.keys(seen).length;
    } catch (e) { did = 0; }
    setAll("s11-done", did);
    var arc = $("s11Arc"); if (arc && ids.length) arc.setAttribute("stroke-dashoffset", (339.3 * (1 - did / ids.length)).toFixed(1));
    var d = new Date(); if ($("s11Date")) $("s11Date").textContent = (d.getMonth() + 1) + "월 " + d.getDate() + "일 " + "일월화수목금토".charAt(d.getDay()) + "요일";
  }

  // ── 방문 ──
  function grow(box) { if (!box) return; qa("i[data-w]", box).forEach(function (i) { i.style.width = RM ? i.dataset.w + "%" : "0"; }); if (RM) return; root.requestAnimationFrame(function () { root.requestAnimationFrame(function () { qa("i[data-w]", box).forEach(function (i) { i.style.width = i.dataset.w + "%"; }); }); }); }
  function fillDist() {
    var F = root.DaeumFront, S = F && F.SNAP; if (!S || !$("s11Dist")) return;
    var b = qa("#s11Dist .row b"); if (b.length === 2) { b[0].textContent = S.naive.toFixed(1) + "km"; b[1].textContent = S.plan.toFixed(1) + "km"; }
    var w = qa("#s11Dist i[data-w]"); if (w[1]) w[1].dataset.w = (S.plan / S.naive * 100).toFixed(1);
  }

  // ── 기록: AI 초안 ──
  var REC = { st: "", text: "", res: null };
  function needWords(text, needs) {
    var K = root.DaeumAI && root.DaeumAI.needKeywords; if (!K) return [];
    var out = []; K.forEach(function (k) { if (needs.indexOf(k[1]) < 0) return; var m = String(text).match(new RegExp(k[0].source, "g")); (m || []).forEach(function (w) { if (out.indexOf(w) < 0) out.push(w); }); });
    return out;
  }
  function markText(text, words) {
    var t = esc(text); if (!words.length) return t;
    var re = new RegExp("(" + words.map(function (w) { return esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).sort(function (a, b) { return b.length - a.length; }).join("|") + ")", "g");
    return t.replace(re, function (w) { return '<mark data-w="' + w + '">' + w + "</mark>"; });
  }
  function setSt(st) {
    REC.st = st; var ord = ["ai", "edit", "ok"], k = ord.indexOf(st);
    qa("#s11State span").forEach(function (s) { var i = ord.indexOf(s.dataset.st); s.classList.toggle("on", i === k || (st === "ok" && i === 2)); s.classList.toggle("done", k >= 0 && i < k && !(st === "ai" && i === 1)); });
    if (st === "ai") qa("#s11State span")[1].classList.remove("done");
    var c = $("s11Confirm"), cp = $("s11Copy"); if (!c) return;
    c.disabled = !st || st === "ok"; c.textContent = st === "ok" ? "확정됨" : "공무원 확정";
    cp.disabled = st !== "ok"; cp.querySelector("span").textContent = st === "ok" ? "행복이음 입력 순서로 복사" : "확정 후 복사 가능";
    var lk = cp.querySelector("svg"); if (lk) lk.style.display = st === "ok" ? "none" : "";
  }
  function svcOf(id) { var o = O(); var L = o && o.services ? o.services() : []; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  function renderDraft(det) {
    var res = det.res || {}, text = det.text || "", body = qa("#s11Draft .s11-draft-body")[0]; if (!body) return;
    REC.text = text; REC.res = res; REC.label = det.label || ""; REC.area = det.area || "";
    var needs = res.needs || [], ids = (res.serviceIds || []).slice(0, 3), allW = [];
    var rows = ids.map(function (id) {
      var s = svcOf(id); if (!s) return "";
      var tags = (res.why && res.why[id]) || (s.tags || []).filter(function (t) { return needs.indexOf(t) >= 0; });
      var ws = needWords(text, tags); allW = allW.concat(ws);
      var ev = ws.length ? ws.map(function (w) { return '<mark data-w="' + esc(w) + '">' + esc(w) + "</mark>"; }).join(" ") : esc(tags.length ? "욕구: " + tags.join(", ") : (res.reasons && res.reasons[id]) || "사전 지표");
      var mk = /^L|^local|^sj|상주|경상북도/.test((s.id || "") + (s.org || "")) ? "svc" : "svc";
      return '<div class="why" data-hl="' + esc(ws.join(" ")) + '"><span><b>' + esc(s.name) + "</b>근거 " + ev + '</span><button type="button" class="s11-di" data-card="' + mk + '" aria-label="데이터 카드"><i class="mk api"></i></button></div>';
    }).join("");
    var d = new Date(Date.now() + 7 * 864e5);
    body.innerHTML =
      '<div class="fld"><small>주요 욕구</small><p>' + esc(needs.join(" · ") || "—") + "</p></div>" +
      '<div class="fld"><small>상담 요약 · 눌러서 수정</small><p contenteditable="true" class="ed" id="s11Sum" role="textbox" aria-multiline="true" aria-label="상담 요약 수정">' + esc(res.summary || "") + "</p></div>" +
      '<div class="fld"><small>연계 후보 · 근거</small>' + (rows || '<p class="sm">맞는 서비스를 찾지 못했습니다. 통합사례관리 회의 안건으로 올립니다.</p>') + "</div>" +
      '<div class="fld"><small>다음 할 일</small><p contenteditable="true" class="ed" id="s11Next" role="textbox" aria-label="다음 할 일 수정">' + (d.getMonth() + 1) + "-" + d.getDate() + " 신청 여부 전화 확인</p></div>";
    var talk = $("s11Talk"); if (talk) { talk.hidden = !text.trim(); talk.querySelector("p").innerHTML = markText(text, allW); }
    // AI 처리 4칸
    var red = 0; if (res.redacted) Object.keys(res.redacted).forEach(function (k) { red += +res.redacted[k] || 0; });
    var o = O(), total = o && o.services ? o.services().length : 0;
    var P = { red: res.source === "ai" ? red : 0, cand: Math.min(50, total || 50), pick: (res.serviceIds || []).length, out: 0 };
    qa("#s11Pipe b").forEach(function (b) { b.textContent = P[b.dataset.k]; });
    var line = $("s11AiLine");
    if (line) line.textContent = res.source === "ai" ? "이름·연락처를 가린 뒤 외부 AI(Claude)로 보냈습니다 · 후보는 정보원 복지서비스 목록 안 · 목록 밖 답은 버림"
      : "AI 연결 전 시연 모드: 규칙 기반 초안(외부 전송 0건)" + (res.fallback ? " · AI 응답 실패로 규칙 추천으로 먼저 보여 드립니다" : "") + " · 후보는 정보원 복지서비스 목록 안";
    if ($("s11RecMeta")) $("s11RecMeta").textContent = [new Date().toTimeString().slice(0, 5), det.area, det.label].filter(Boolean).join(" · ");
    setSt("ai");
    qa("#s11Draft .ed").forEach(function (e) { e.addEventListener("input", function () { if (REC.st === "ai") setSt("edit"); }); });
  }
  function draftText() {
    var g = function (id) { var e = $(id); return e ? e.textContent.trim() : ""; };
    var res = REC.res || {}, names = (res.serviceIds || []).slice(0, 3).map(function (id) { var s = svcOf(id); return s ? s.name : id; });
    return ["[행복이음 입력 초안 — 공무원 확정]", "주요 욕구: " + ((res.needs || []).join(", ") || "-"), "상담 요약: " + g("s11Sum"), "연계 후보: " + (names.join(", ") || "-"), "다음 할 일: " + g("s11Next")].join("\n");
  }
  function bindRecord() {
    var c = $("s11Confirm"), cp = $("s11Copy"); if (!c) return;
    c.addEventListener("click", function () {
      if (!REC.st || REC.st === "ok") return; setSt("ok");
      var fx = qa("#s11Draft .done-fx")[0]; if (fx && !RM) { fx.classList.remove("on"); void fx.offsetWidth; fx.classList.add("on"); }
      qa("#s11Draft .ed").forEach(function (e) { e.setAttribute("contenteditable", "false"); });
    });
    cp.addEventListener("click", function () {
      if (REC.st !== "ok") return; var t = draftText(), sp = cp.querySelector("span");
      function ok() { sp.textContent = "복사했습니다 — 행복이음에 붙여 넣기"; }
      if (root.navigator.clipboard && root.navigator.clipboard.writeText) root.navigator.clipboard.writeText(t).then(ok, function () { sp.textContent = "복사가 막혔습니다 — 자세히 칸의 초안을 쓰세요"; });
      else ok();
    });
    // 근거 낱말: 초안 쪽 근거에 손대면 상담 내용의 같은 낱말이 함께 빛남
    var draft = $("s11Draft");
    function lit(on, ws) { qa("#s11Talk mark, #s11Draft mark").forEach(function (m) { m.classList.toggle("lit", on && ws.indexOf(m.dataset.w) >= 0); }); }
    ["mouseover", "focusin"].forEach(function (ev) { draft.addEventListener(ev, function (e) { var w = e.target.closest(".why"); lit(!!w, w ? (w.dataset.hl || "").split(" ") : []); }); });
    draft.addEventListener("mouseleave", function () { lit(false, []); });
    draft.addEventListener("click", function (e) { var m = e.target.closest("mark"); if (m) lit(true, [m.dataset.w]); });
    // 가구·상담 내용이 바뀌면 초안은 다시 «만들기 전»으로
    function reset() { if (!REC.st) return; REC.st = ""; REC.res = null; qa("#s11State span").forEach(function (s) { s.className = ""; }); c.disabled = true; c.textContent = "공무원 확정"; cp.disabled = true; cp.querySelector("span").textContent = "확정 후 복사 가능"; var lk = cp.querySelector("svg"); if (lk) lk.style.display = ""; qa("#s11Draft .s11-draft-body")[0].innerHTML = '<p class="sm">상담 내용이 바뀌었습니다. «AI 초안 만들기»를 다시 누르세요.</p>'; $("s11Talk").hidden = true; }
    if ($("recHouse")) $("recHouse").addEventListener("change", reset);
    if ($("recText")) $("recText").addEventListener("input", reset);
    if ($("btnSample")) $("btnSample").addEventListener("click", reset);
    doc.addEventListener("daeum:officer-summary", function (e) { renderDraft(e.detail || {}); });
  }

  // ── 보고 ──
  var AREAS = ["함창읍", "사벌국면", "공검면", "이안면"];
  function fillArea() {
    var L = (root.DaeumLonely && root.DaeumLonely.get()) || root.__DAEUM_LONELY__, H = (root.DaeumOldHouse && root.DaeumOldHouse.get()) || root.__DAEUM_OLDHOUSE__, box = $("s11AreaT"); if (!box || !L) return;
    var ar = L.areas.filter(function (a) { return AREAS.indexOf(a.name) >= 0; }); if (!ar.length) return;
    function pc(x) { return x == null ? "—" : (x * 100).toFixed(1) + "%"; }
    function cell(x) { return '<div class="cell"><span>' + pc(x) + '</span><div class="tr"><i data-w="' + (x == null ? 0 : (x * 100).toFixed(1)) + '"></i></div></div>'; }
    var total = L.areas.length;
    box.innerHTML = '<div class="hd"><span>읍면</span><span>1인 세대</span><span>75세 이상</span><span>30년 넘은 집</span><span>위험도</span></div>' +
      ar.map(function (a) {
        var h = H && H.areas ? H.areas[a.name] : null, cls = a.tier === "높음" ? "hi" : a.tier === "보통" ? "mid" : "lo";
        return '<div class="rw"><b>' + esc(a.name) + "</b>" + cell(a.oneRate) + cell(a.a75Rate) + cell(h ? h["노후비율"] : null) + '<span class="tier ' + cls + '" title="상주 ' + total + '개 읍면동 중 ' + a.rank + '위(닿음 추정)">' + a.rank + "위</span></div>";
      }).join("");
    grow(box);
  }
  function bindReport() {
    var b = $("s11Dl"); if (!b) return;
    b.addEventListener("click", function () {
      var r = $("reportRoot"); if (r) r.scrollIntoView({ block: "start", behavior: RM ? "auto" : "smooth" });
      var w = r && r.querySelector('[data-report="weekly"]:not([disabled])'); if (w) w.click();
    });
  }

  // ── 첫 실행 둘러보기 4컷 ──
  var TOUR = [["1/4", "닿음 시작", "위기가구 명단 이후의 현장 업무를 오늘 → 방문 → 기록 → 보고 순서로 정리합니다. 데이터는 한국사회보장정보원 복지서비스 정보 외 6종입니다.", "home"],
    ["2/4", "오늘 · 방문", "방문할 집과 다시 찾을 집을 한 화면에 모읍니다. 방문 순서는 가까운 집끼리 묶어 이동 거리를 줄입니다.", "route"],
    ["3/4", "기록 · AI 초안", "상담 내용을 AI가 행복이음 입력 순서로 정리합니다. 근거 낱말을 확인하고 확정하면 복사할 수 있습니다.", "record"],
    ["4/4", "보고", "방문 기록이 쌓이면 서비스 연계 현황과 한글·엑셀 보고서가 채워집니다.", "report"]];
  var tourEl, tourI = 0, LS_TOUR = "daeum.s11.tour";
  function buildTour() {
    tourEl = doc.createElement("div"); tourEl.className = "s11-tour"; tourEl.setAttribute("role", "dialog"); tourEl.setAttribute("aria-modal", "true"); tourEl.setAttribute("aria-labelledby", "s11TourH");
    tourEl.innerHTML = '<div class="coach"><div class="dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div><span class="k"></span><h3 class="ch" id="s11TourH"></h3><p class="cp"></p><div class="row"><button type="button" class="tskip">건너뛰기</button><button type="button" class="next">다음</button></div></div>';
    doc.body.appendChild(tourEl);
    tourEl.querySelector(".tskip").addEventListener("click", tourEnd);
    tourEl.querySelector(".next").addEventListener("click", function () { if (tourI >= TOUR.length - 1) tourEnd(); else tourShow(tourI + 1); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && doc.body.classList.contains("s11-tour-on")) tourEnd(); });
  }
  function tourShow(i) {
    tourI = i; var s = TOUR[i]; doc.body.classList.add("s11-tour-on");
    tourEl.querySelector(".k").textContent = s[0]; tourEl.querySelector(".ch").textContent = s[1]; tourEl.querySelector(".cp").textContent = s[2];
    qa(".dots i", tourEl).forEach(function (d, k) { d.classList.toggle("on", k === i); });
    tourEl.querySelector(".next").textContent = i === TOUR.length - 1 ? "시작하기" : "다음";
    var c = tourEl.querySelector(".coach"); c.style.animation = "none"; void c.offsetWidth; c.style.animation = "";
    qa(".tabs a").forEach(function (a) { a.classList.toggle("spot", a.dataset.tab === s[3]); });
    if (tab() !== s[3]) root.location.hash = "#" + s[3];
    try { tourEl.querySelector(".next").focus({ preventScroll: true }); } catch (e) { /* 구형 */ }
  }
  function tourEnd() { doc.body.classList.remove("s11-tour-on"); qa(".tabs a.spot").forEach(function (a) { a.classList.remove("spot"); }); lsSet(LS_TOUR, "done"); root.location.hash = "#today"; }

  // ── 화면 바뀔 때 ──
  function onShow() {
    var t = tab();
    qa(".rail-data").forEach(function (a) { var on = t === "data"; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (t === "home") fillCounts(true);
    if (t === "today") { fillCounts(false); fillToday(); if (root.matchMedia && root.matchMedia("(min-width: 1024px)").matches && $("todayOld")) $("todayOld").open = true; }
    if (t === "route") { fillDist(); grow($("s11Dist")); }
    if (t === "report") fillArea();
    if (t === "data") setTimeout(links, 30);
    var info = $("s11Info"); if (info) info.hidden = !SCR[t];
  }

  function boot() {
    buildSheet(); buildFlow(); buildTour(); bindRecord(); bindReport();
    doc.addEventListener("click", function (e) {
      var c = e.target.closest("[data-card]"); if (c && !sheet.contains(c)) { e.preventDefault(); openSheet(cardHTML(c.dataset.card)); return; }
      var tb = e.target.closest("[data-tour-start]"); if (tb) { tourShow(0); return; }
      var om = e.target.closest("[data-open-more]"); if (om) { e.preventDefault(); var po = $("todayOld"), m = $("moreToday"); if (po) po.open = true; if (m) { m.open = true; m.scrollIntoView({ block: "start", behavior: RM ? "auto" : "smooth" }); } }
    });
    if ($("s11Info")) $("s11Info").addEventListener("click", function () { openSheet(listHTML(tab())); });
    doc.addEventListener("daeum:officer-show", function () { setTimeout(onShow, 0); });
    root.addEventListener("resize", function () { if (tab() === "data") links(); });
    // 기존 칸이 늦게 채워지면(자료 불러오기) 다시 옮긴다
    var tries = 0, iv = setInterval(function () { tries++; if (tab() === "today") fillToday(); if (tab() === "home") fillCounts(false); if (tab() === "report") fillArea(); if (tries > 12) clearInterval(iv); }, 500);
    onShow();
    var q = root.location.search || "";
    if (!/tour=0/.test(q) && lsGet(LS_TOUR) !== "done" && !/^#(today|route|record|report|data|contacts|board|intake|list|cost|region)$/.test(root.location.hash)) setTimeout(function () { tourShow(0); }, 400);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
  root.DaeumS11 = { D: D, SCR: SCR, tourShow: tourShow };
})(window);
