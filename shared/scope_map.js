/* 닿음 «맡는 구간» 그림(S12-n → S12-n2 고급화) — 🩵 미르 2026-11-12
   겉모습 = A안 «세라믹 스튜디오»(도자기 받침·무광 오브제 6개·오목 원판), 움직임 = B안 «유리 계기»
   (렌즈가 선을 따라 미끄러지며 지나간 단계가 하나씩 또렷해짐 · 약 3초 한 번). 호창님 11-12 «A안으로 하는데 애니메이션 효과는 B안».
   복지 사각지대 발굴 업무 전 과정 위에서 닿음이 돕는 6단계만 받침 위에 올린다. 앞뒤(한국사회보장정보원·배정·행복이음·사후 관리)는 «기존 체계».
   외부 라이브러리 없음(CSS + SVG + Web Animations API). 움직임 줄이기 설정이면 완성 그림만.
   쓰는 법
     DaeumScopeMap.mount(el)                 큰 그림(화면에 보일 때 한 번 재생 · 다시 보기 단추)
     DaeumScopeMap.mount(el, { card: true }) 접는 카드(처음 한 번 펼쳐 보여 주고, 본 뒤로는 접힌 채 시작 — localStorage 기억)
     DaeumScopeMap.mini(el, "route")         화면 머리 아래 작은 위치 띠(렌즈가 앞 화면 단계에서 지금 단계로 미끄러져 옴)
     DaeumScopeMap.mountAll(root)            root 안 [data-scope-map="full|card"] 자리를 모두 채움 */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var LS_SEEN = "daeum.s12n.scopeSeen";
  var CS = document.currentScript, BASE = CS && CS.src ? CS.src.replace(/[^\/]*$/, "") : "shared/";
  var LOGO = BASE + "icons/daeum.svg"; // 닿음 앱 아이콘(S12-k A안) — 모양·색 그대로
  var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  // ── 재질 그라데이션(문서에 한 번만 심음). 무광 도자기 + 깊은 초록 유약, 빛은 위 왼쪽 ──
  var DEFS = '<linearGradient id="dsm-cB" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#F3F0EA"/><stop offset="1" stop-color="#DCD7CD"/></linearGradient>' +
    '<linearGradient id="dsm-cB2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#CFC9BD"/></linearGradient>' +
    '<linearGradient id="dsm-cS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D6D0C4"/><stop offset="1" stop-color="#BDB6A8"/></linearGradient>' +
    '<linearGradient id="dsm-cT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EAE6DE"/></linearGradient>' +
    '<linearGradient id="dsm-cA" x1=".1" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#3FA487"/><stop offset=".55" stop-color="#127A5E"/><stop offset="1" stop-color="#0A5A45"/></linearGradient>' +
    '<linearGradient id="dsm-cAD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E654E"/><stop offset="1" stop-color="#073D30"/></linearGradient>' +
    '<radialGradient id="dsm-sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3A2E18" stop-opacity=".30"/><stop offset=".6" stop-color="#3A2E18" stop-opacity=".10"/><stop offset="1" stop-color="#3A2E18" stop-opacity="0"/></radialGradient>';
  function plantDefs() {
    if (document.getElementById("dsm-defs")) return;
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("id", "dsm-defs"); s.setAttribute("width", "0"); s.setAttribute("height", "0"); s.setAttribute("aria-hidden", "true"); s.setAttribute("focusable", "false");
    s.style.cssText = "position:absolute;width:0;height:0;overflow:hidden"; // display:none 이면 그라데이션이 안 잡힌다
    s.innerHTML = "<defs>" + DEFS + "</defs>";
    (document.body || document.documentElement).appendChild(s);
  }

  // ── 오브제 6개(64 격자). 칠은 CSS(.dsm-o .m-*)가 맡는다 ──
  var SH = '<ellipse class="m-sh" cx="34" cy="57" rx="22" ry="5"/>';
  var OBJ = {
    plan: SH + '<rect class="m-s" x="14" y="17" width="36" height="38" rx="5"/><rect class="m-b" x="11" y="13" width="36" height="39" rx="5"/>' +
      '<rect class="m-ad" x="21" y="9" width="16" height="8" rx="3"/><rect class="m-l" x="17" y="24" width="23" height="3" rx="1.5"/><rect class="m-l" x="17" y="31" width="17" height="3" rx="1.5"/><rect class="m-l" x="17" y="38" width="20" height="3" rx="1.5"/>' +
      '<circle class="m-a" cx="45" cy="45" r="8"/><circle class="m-hl" cx="42.4" cy="42.2" r="2.4"/>',
    route: SH + '<path class="m-s" d="M6 39 L36 48 L58 35 L58 39.5 L36 52.5 L6 43.5Z"/>' +
      '<path class="m-b" d="M6 39 L26 29 L36 33 L16 43.5Z"/><path class="m-t" d="M16 43.5 L36 33 L46 31 L26 46.5Z"/><path class="m-b" d="M26 46.5 L46 31 L58 35 L36 48Z"/>' +
      '<path class="m-dash" d="M13 40.5 C20 37 24 40 30 39 S40 34 47 36"/>' +
      '<path class="m-ad" d="M36 19 L42 33 L48 19Z"/><circle class="m-a" cx="42" cy="17" r="8.5"/><circle class="m-hl" cx="39.2" cy="14" r="2.6"/>',
    visit: SH + '<path class="m-s" d="M41 30 L54 23 L54 44 L41 51Z"/><path class="m-b" d="M12 30 L26.5 17 L41 30 L41 51 L12 51Z"/>' +
      '<path class="m-a" d="M26.5 17 L40 9.5 L55.5 23.5 L41 30Z"/><path class="m-t" d="M26.5 17 L41 30 L42.5 29.2 L28 16.2Z"/>' +
      '<rect class="m-ad" x="22" y="37" width="9" height="14" rx="1.6"/><path class="m-l" d="M45 31 L50 28.5 L50 34 L45 36.5Z"/>',
    safety: SH + '<path class="m-s" d="M34 9 L52 15 L52 28 C52 40 44 49 34 53 C24 49 16 40 16 28 L16 15Z"/>' +
      '<path class="m-b" d="M31.5 6 L49.5 12 L49.5 25 C49.5 37 41.5 46 31.5 50 C21.5 46 13.5 37 13.5 25 L13.5 12Z"/>' +
      '<path class="m-a" d="M31.5 12.5 L43.5 16.5 L43.5 25.5 C43.5 33.5 38.5 39.8 31.5 43 C24.5 39.8 19.5 33.5 19.5 25.5 L19.5 16.5Z"/>' +
      '<path class="m-t" d="M31.5 12.5 L43.5 16.5 L43.5 19 L31.5 15Z" opacity=".5"/><circle class="m-hl" cx="25.5" cy="20" r="2.4"/>',
    record: SH + '<rect class="m-s" x="13" y="13" width="32" height="42" rx="5"/><rect class="m-b" x="10" y="10" width="32" height="42" rx="5"/>' +
      '<rect class="m-a" x="15" y="17" width="12" height="6" rx="3"/><rect class="m-l" x="29" y="17" width="8" height="6" rx="3"/><rect class="m-l" x="15" y="29" width="22" height="3" rx="1.5"/><rect class="m-l" x="15" y="36" width="15" height="3" rx="1.5"/>' +
      '<g transform="rotate(32 48 34)"><rect class="m-a" x="45" y="14" width="7" height="32" rx="3.5"/><path class="m-ad" d="M45 46 L52 46 L48.5 53Z"/><rect class="m-hl" x="46.4" y="16" width="1.6" height="26" rx=".8"/></g>',
    link: SH + '<circle class="m-rb" cx="40" cy="33" r="12"/><circle class="m-ra" cx="25" cy="33" r="12"/>' +
      '<path class="m-rb" d="M40 21 A12 12 0 0 0 30.4 25.8"/><circle class="m-hl" cx="17.5" cy="26" r="2"/>'
  };
  // 기존 체계 — 오목 원판 안의 가는 선 그림(기관 로고 아님)
  var GLY = {
    src: '<path d="M6 3h7l3 3v11H6z M13 3v3h3 M8.5 10h5 M8.5 13h5"/>',
    assign: '<path d="M3 17V8l5-3 5 3v9 M1.5 17h13 M14 11h4.5 M16.5 9l2 2-2 2"/>',
    decide: '<path d="M2.5 4h15v9.5h-15z M7.5 17h5 M10 13.5V17 M7 9l2 2 4-4"/>',
    after: '<path d="M16 10a6 6 0 1 1-2-4.5 M16 3.5V6h-2.5 M10 7v3.2l2.2 1.4"/>'
  };

  // ── 전 과정. ext=기존 체계 · h=그 단계 화면(있을 때만 이동) ──
  var FLOW = [
    { k: "src", ext: 1, t: "한국사회보장정보원", s: "위기정보 수집 → 발굴 명단", end: "시작" },
    { k: "assign", ext: 1, t: "시군구·읍면동 배정", s: "담당 공무원에게" },
    { k: "plan", t: "방문 계획", s: "일차·순서", h: "#plan" },
    { k: "route", t: "동선", s: "지도·길안내", h: "#route" },
    { k: "visit", t: "현장 방문", s: "집 앞 요약·확인", h: "#home" },
    { k: "safety", t: "동료 안부", s: "시간 넘기면 알림", h: "#check" },
    { k: "record", t: "기록", s: "상황 고르면 문장", h: "#record" },
    { k: "link", t: "연계", s: "서비스·의뢰서·보고", h: "#docs" },
    { k: "decide", ext: 1, t: "행복이음", s: "입력·서비스 결정" },
    { k: "after", ext: 1, t: "사후 관리", s: "재방문·모니터링", end: "끝" }
  ];
  var STEPS = FLOW.filter(function (x) { return !x.ext; });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function obj(k, cls) { return '<svg class="dsm-o ' + (cls || "dsm-art") + '" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + OBJ[k] + "</svg>"; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 개인 창 등 — 무시 */ } }

  // ── 큰 그림 ──
  var played = false; // 이 쪽을 연 뒤 한 번 재생했으면 다시 그릴 때(화면 갱신)는 완성 그림으로
  function nodeHtml(x, i) {
    if (x.ext) return '<li class="dsm-n dsm-ext" data-i="' + i + '"><span class="dsm-vis"><span class="dsm-disc"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">' + GLY[x.k] + '</svg></span></span>' +
      '<span class="dsm-tx"><b>' + esc(x.t) + "</b><small>" + esc(x.s) + '</small><em class="dsm-tag">' + (x.end ? x.end + " · " : "") + "기존 체계</em></span></li>";
    var n = STEPS.indexOf(x) + 1;
    return '<li class="dsm-n dsm-st" data-i="' + i + '"><span class="dsm-vis">' + obj(x.k) + '</span><span class="dsm-tx"><i class="dsm-no">' + pad(n) + "</i><b>" + esc(x.t) + "</b><small>" + esc(x.s) + "</small></span></li>";
  }
  function bodyHtml() {
    var pre = FLOW.slice(0, 2).map(nodeHtml).join("");
    var mid = FLOW.slice(2, 8).map(function (x, j) { return nodeHtml(x, j + 2); }).join("");
    var post = nodeHtml(FLOW[8], 8) + nodeHtml(FLOW[9], 9);
    return '<div class="dsm-flow"><i class="dsm-rail" aria-hidden="true"></i><i class="dsm-go" aria-hidden="true"></i>' +
      '<ol class="dsm-list" aria-label="복지 사각지대 발굴 업무 전 과정">' +
      '<li class="dsm-grp"><ol class="dsm-ext-l">' + pre + "</ol></li>" +
      '<li class="dsm-zone"><p class="dsm-zl"><img src="' + LOGO + '" alt="">닿음이 돕는 구간</p><span class="sr">닿음이 돕는 곳:</span><ol class="dsm-steps">' + mid + "</ol></li>" +
      '<li class="dsm-grp"><ol class="dsm-ext-l">' + post + "</ol></li></ol>" +
      '<i class="dsm-lens" aria-hidden="true"></i></div>';
  }
  function fullHtml() {
    return '<div class="dsm-h"><div><span class="dsm-eye">복지 사각지대 발굴 업무 전 과정</span><h2 class="dsm-t">닿음은 <em>명단을 받은 뒤의 현장</em>을 맡습니다</h2></div>' +
      '<button type="button" class="dsm-re" data-dsm="replay"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1M4.5 3.5v3h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>다시 보기</button></div>' +
      bodyHtml() +
      '<p class="dsm-foot">회색은 지금 쓰는 체계 그대로입니다. 행복이음 입력과 서비스 결정은 닿음이 대신하지 않습니다. 사후 관리에서 다시 방문하면 방문 계획으로 돌아옵니다.</p>';
  }

  // 띠 위 위치 재기: 그림 중심들을 띠 축(가로=x, 세로=y)에 놓는다
  function measure(root) {
    var flow = root.querySelector(".dsm-flow"), rail = root.querySelector(".dsm-rail"), go = root.querySelector(".dsm-go");
    if (!flow || !rail) return null;
    var fr = flow.getBoundingClientRect(), vs = root.querySelectorAll(".dsm-n .dsm-vis");
    if (!fr.width || !vs.length) return null;
    var pts = [].map.call(vs, function (v) { var r = v.getBoundingClientRect(); return { x: r.left + r.width / 2 - fr.left, y: r.top + r.height / 2 - fr.top }; });
    var vert = Math.abs(pts[pts.length - 1].y - pts[0].y) > Math.abs(pts[pts.length - 1].x - pts[0].x);
    var a = vert ? "y" : "x", s = pts[0][a], e = pts[pts.length - 1][a], len = Math.max(1, e - s);
    var g0 = pts[2][a], g1 = pts[7][a];
    if (vert) {
      rail.style.cssText = "left:" + pts[0].x + "px;top:" + s + "px;height:" + len + "px";
      go.style.cssText = "left:" + (pts[2].x - 0.5) + "px;top:" + g0 + "px;height:" + (g1 - g0) + "px";
    } else {
      rail.style.cssText = "top:" + pts[0].y + "px;left:" + s + "px;width:" + len + "px";
      go.style.cssText = "top:" + (pts[2].y - 0.5) + "px;left:" + g0 + "px;width:" + (g1 - g0) + "px";
    }
    root.classList.toggle("dsm-v", vert);
    return { vert: vert, pts: pts };
  }

  // 시간표(ms): 앞 두 칸은 빠르게, 닿음 6단계는 렌즈가 하나씩 지나며 또렷하게, 뒤 두 칸 → 렌즈가 사라짐(약 3.2초)
  var T = [150, 480, 850, 1170, 1490, 1810, 2130, 2450, 2760, 3000];
  var END = 3200;
  function play(root) {
    var g = measure(root); if (!g) { finish(root); return; }
    root.classList.remove("dsm-done"); root.classList.remove("dsm-play");
    [].forEach.call(root.querySelectorAll(".dsm-n"), function (n) { n.style.setProperty("--d", Math.max(0, T[+n.dataset.i] - 120) + "ms"); });
    root.style.setProperty("--go-d", T[2] + "ms"); root.style.setProperty("--go-t", (T[7] - T[2]) + "ms"); root.style.setProperty("--zl-d", (T[7] + 150) + "ms");
    void root.offsetWidth; // 처음부터 다시
    root.classList.add("dsm-play");
    var lens = root.querySelector(".dsm-lens");
    (root._anims || []).forEach(function (an) { an.cancel(); }); root._anims = [];
    if (lens && lens.animate) {
      var kf = [{ offset: 0, transform: "translate(" + g.pts[0].x + "px," + g.pts[0].y + "px) scale(.7)", opacity: 0 }];
      g.pts.forEach(function (p, i) { kf.push({ offset: T[i] / END, transform: "translate(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px)", opacity: 1 }); });
      var L = g.pts[g.pts.length - 1];
      kf.push({ offset: 1, transform: "translate(" + L.x.toFixed(1) + "px," + L.y.toFixed(1) + "px) scale(.7)", opacity: 0 });
      root._anims.push(lens.animate(kf, { duration: END, easing: "cubic-bezier(.45,.05,.55,.95)", fill: "both" }));
    }
    clearTimeout(root._t);
    root._t = setTimeout(function () { finish(root); lsSet(LS_SEEN, "1"); }, END + 300);
    played = true;
  }
  function finish(root) {
    clearTimeout(root._t);
    (root._anims || []).forEach(function (an) { an.cancel(); }); root._anims = [];
    root.classList.remove("dsm-play"); root.classList.add("dsm-done");
    measure(root);
  }
  function watch(root) {
    if (RM || played) { finish(root); return; }
    if (!("IntersectionObserver" in window)) { play(root); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); play(root); } }); }, { threshold: 0.35 });
    io.observe(root);
  }
  function wire(root) {
    var re = root.querySelector('[data-dsm="replay"]');
    if (re) re.addEventListener("click", function () { if (RM) { finish(root); return; } play(root); });
    if ("ResizeObserver" in window) { var w0 = 0; new ResizeObserver(function () { var w = root.clientWidth; if (w !== w0) { w0 = w; if (root.classList.contains("dsm-play")) play(root); else measure(root); } }).observe(root); }
  }

  var cardOpen = null; // 이 쪽을 연 동안의 펼침 상태(화면이 다시 그려져도 갑자기 접히지 않게)
  function mount(el, opt) {
    if (!el) return null;
    plantDefs();
    opt = opt || {};
    if (opt.card) {
      if (cardOpen === null) cardOpen = lsGet(LS_SEEN) !== "1";
      el.innerHTML = '<details class="dsm-card"' + (cardOpen ? " open" : "") + '><summary><span class="dsm-sum-ic">' + obj("visit", "dsm-sum-art") + '</span><span class="dsm-sum-t"><b>닿음이 맡는 구간</b><small>발굴 업무 전 과정 중 어디인지</small></span><span class="dsm-sum-go" aria-hidden="true"></span></summary><section class="dsm" aria-label="닿음이 맡는 구간"></section></details>';
      var d = el.querySelector("details"), sec = el.querySelector(".dsm");
      var fill = function () { if (!sec.firstChild) { sec.innerHTML = fullHtml(); wire(sec); } watch(sec); };
      if (d.open) fill();
      d.addEventListener("toggle", function () { cardOpen = d.open; if (d.open) fill(); else lsSet(LS_SEEN, "1"); });
      return sec;
    }
    el.innerHTML = '<section class="dsm dsm-solo" aria-label="닿음이 맡는 구간">' + fullHtml() + "</section>";
    var s = el.firstChild; wire(s); watch(s); return s;
  }
  function mountAll(root) {
    [].forEach.call((root || document).querySelectorAll("[data-scope-map]"), function (el) { if (el._dsm) return; el._dsm = 1; mount(el, { card: el.getAttribute("data-scope-map") === "card" }); });
  }

  // ── 작은 위치 띠: 오목한 도자기 홈 + 점 6개, 렌즈가 지금 단계로 미끄러짐 ──
  var miniLast = {}; // 띠 묶음별로 앞 화면에서 켜져 있던 단계(미끄러짐 출발점)
  function mini(el, key, group) {
    if (!el) return;
    plantDefs();
    var gk = group || "app", last = gk in miniLast ? miniLast[gk] : -1;
    var idx = -1; STEPS.forEach(function (x, i) { if (x.k === key) idx = i; });
    var dots = STEPS.map(function (x, i) {
      var on = i === idx, tag = x.h && !on ? "a" : "span";
      return "<" + tag + ' class="dsm-md' + (on ? " on" : "") + (i < idx ? " past" : "") + '"' + (tag === "a" ? ' href="' + x.h + '"' : "") + (on ? ' aria-current="step"' : "") + ' title="' + esc(x.t) + '" aria-label="' + (i + 1) + "단계 " + esc(x.t) + '"></' + tag + ">";
    }).join("");
    var cur = idx >= 0 ? STEPS[idx] : null;
    el.innerHTML = '<nav class="dsm-mini' + (idx < 0 ? " none" : "") + '" aria-label="발굴 업무 중 지금 위치: ' + (cur ? esc(cur.t) : "닿음 구간") + '">' +
      '<img class="dsm-mlogo" src="' + LOGO + '" alt="닿음 구간" title="닿음이 돕는 구간 — 앞(발굴 명단·배정)과 뒤(행복이음·사후 관리)는 기존 체계">' +
      '<span class="dsm-mline">' + dots + '<i class="dsm-mk" aria-hidden="true">' + (cur ? obj(cur.k, "dsm-mart") : "") + "</i></span>" +
      '<span class="dsm-mc">' + (cur ? '<i>' + (idx + 1) + "/6</i><b>" + esc(cur.t) + "</b>" : "") + "</span></nav>";
    var nav = el.firstChild, kn = nav.querySelector(".dsm-mk");
    if (idx < 0) { miniLast[gk] = -1; return; }
    var place = function (i, still) { if (still) kn.classList.add("still"); kn.style.setProperty("--x", i); if (still) { void kn.offsetWidth; kn.classList.remove("still"); } };
    if (last >= 0 && last !== idx && !RM) {
      place(last, true);
      requestAnimationFrame(function () { requestAnimationFrame(function () { place(idx, false); }); });
    } else place(idx, true);
    miniLast[gk] = idx;
  }

  window.DaeumScopeMap = { mount: mount, mountAll: mountAll, mini: mini, steps: STEPS.map(function (x) { return x.k; }), FLOW: FLOW };
})();
