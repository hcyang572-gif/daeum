/* 닿음 화면 틀(셸) — 시안 S12-h v2.2 «탭 5»(S12-i1 ⚙️ 파로, 2026-11-12 · 시안 커밋 a3b3585)
   탭 5 = 오늘 · 방문 · 현장 · 기록 · 보고. PC·폰 같은 메뉴 이름·순서·기능(폭에 따라 배열만 — 폰 아래 탭, 폴드 두 손 나눔 3|2, PC 왼쪽 레일).
   이 파일이 맡는 것(탭 내용은 app/app.js 가 그린다):
   ① 탭 링크 html(nav) — 기존 화면 주소(#today·#plan·#route·#home·#check·#talk·#record·#docs·#perf)를 탭 묶음으로 잇는다
   ② 묶음 안 작은 칸(방문: 계획|동선 · 보고: 문서|실적·사후관리) — 옛 4탭에서 닿던 화면을 하나도 잃지 않게
   ③ 주 단추 자리(.dock, 74회차) — 화면이 [data-dock] 을 붙인 주 단추 하나·보조 하나를 .app 바로 아래 «다음 할 일 + 주 단추» 칸으로 옮긴다(이벤트는 그대로 따라감)
   ④ 화면 전환 — transform·opacity 만 280ms, 탭 방향대로 밀림 · 260ms 안 이중 탭 무시 · 움직임 줄이기면 끔
   ⑤ 시간 걸리는 작업 진행 표시 busy(promise, 문구) — 0.3초 넘을 때만 위쪽 진행 막대
   ⛔ 넣지 않는 것: 주민 화면 · 신고 접수 · .ics · 다크 화면.                                                              */
(function (root) {
  "use strict";
  // S12-x(🩵 미르 64회차): 아이콘 = 시안 S12-h v2.2 그대로(오늘=집 · 현장=문 · 기록=마이크 · 보고=문서)
  var I = {
    today: '<path d="M4 11.5 12 4l8 7.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
    visit: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
    field: '<path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h8A1.5 1.5 0 0 1 17 4.5V21M3.5 21h17"/><circle cx="13.6" cy="12.4" r=".9" fill="currentColor"/>',
    rec: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    rep: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9.5 13h5M9.5 16.5h3.5"/>'
  };
  // 레일(PC)에만 보이는 작은 설명 — 시안 TABDEF 세 번째 칸
  var DESC = { today: "지금 할 일", visit: "순서·동선", field: "집 앞·확인·상담", rec: "고르면 문장", rep: "문서·실적" };
  // [열쇠, 이름, 주소(가구 번호를 이어 붙일지), 묶이는 화면]
  var TABS = [
    ["today", "오늘", "#today", false, ["today"]],
    ["visit", "방문", "#plan", false, ["plan", "route"]],
    ["field", "현장", "#home", true, ["home", "check", "talk"]],
    ["rec", "기록", "#record", true, ["record"]],
    ["rep", "보고", "#docs", false, ["docs", "perf"]]
  ];
  var SUB = {
    visit: [["계획·순서", "#plan", "plan", false], ["동선·길안내", "#route", "route", true]],
    rep: [["문서 6종", "#docs", "docs", false], ["실적·사후관리", "#perf", "perf", false]]
  };
  /** 화면 이름 → 탭 순번(0~4), 탭 밖(사용 방법 등)은 -1 */
  function tabOf(view) {
    if (view === "field") return 2; // 옛 PC 현장 머리 호출 이름
    for (var i = 0; i < TABS.length; i++) if (TABS[i][0] === view || TABS[i][4].indexOf(view) >= 0) return i;
    return -1;
  }
  function svg(k) { return '<svg class="ti" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + I[k] + "</svg>"; }
  /** 탭 링크 5개(폴드용 접힘선 칸 포함). on = 화면 이름 또는 탭 열쇠, hid = 지금 가구 */
  function links(on, hid) {
    var k = tabOf(on), x = hid ? ":" + hid : "";
    // S12-x: 시안처럼 왼손 3(오늘·방문·현장) | 오른손 2(기록·보고) 두 덩이(.tg) — 폰·PC에서는 한 줄(display:contents), 폴드에서만 쟁반 두 개
    var a = TABS.map(function (t, i) {
      return '<a href="' + t[2] + (t[3] ? x : "") + '" data-tab="' + t[0] + '"' + (i === k ? ' class="on" aria-current="page"' : "") + ">" + svg(t[0]) + "<span>" + t[1] + "<small>" + DESC[t[0]] + "</small></span></a>";
    });
    return '<span class="tg">' + a.slice(0, 3).join("") + '</span><i class="hinge" aria-hidden="true"></i><span class="tg">' + a.slice(3).join("") + "</span>";
  }
  // S12-x 65회차: 새 셸(시안 v3 tabsHTML·railHTML 그대로) — 단추(<button data-go="#화면">) · 아이콘 = shared/icons_s12x.js(I) · 현장 = 청록 열쇠(.key)
  //   폰·폴드 = 아래 탭(두 덩이 .tg) · 태블릿·PC = 왼쪽 레일(.rl, 작은 설명). 기능·주소는 links() 와 같다(가구 번호 이어 붙임).
  var IK = { today: "today", visit: "route", field: "field", rec: "record", rep: "report" };
  function go(t, x) { return t[2] + (t[3] ? x : ""); }
  function dotOf(t, o) { return t[0] === "rep" && o && o.dot ? '<em class="dot" style="font-style:normal">' + o.dot + "</em>" : ""; }
  function tabsHTML(view, hid, I, o) {
    var k = tabOf(view), x = hid ? ":" + hid : "";
    var b = TABS.map(function (t, i) {
      return '<button type="button" class="pr' + (t[0] === "field" ? " key" : "") + (i === k ? " on" : "") + '" data-go="' + go(t, x) + '" data-tab="' + t[0] + '" aria-current="' + (i === k ? "page" : "false") + '">' + ((I || {})[IK[t[0]]] || svg(t[0])) + "<span>" + t[1] + "</span>" + dotOf(t, o) + "</button>";
    });
    return '<div class="tg">' + b.slice(0, 3).join("") + '</div><div class="tg">' + b.slice(3).join("") + "</div>";
  }
  function railHTML(view, hid, I, o) {
    var k = tabOf(view), x = hid ? ":" + hid : "";
    return '<div class="rbrand"><span class="mark logo"><img src="shared/icons/daeum.svg?v=s12z77" alt=""></span><span><b>닿음</b><small>복지 사각지대<br>현장 업무 도우미</small></span></div>' +
      TABS.map(function (t, i) {
        return '<button type="button" class="rl pr' + (i === k ? " on" : "") + '" data-go="' + go(t, x) + '" data-tab="' + t[0] + '"' + (i === k ? ' aria-current="page"' : "") + ">" + ((I || {})[IK[t[0]]] || svg(t[0])) + "<span>" + t[1] + "<small>" + DESC[t[0]] + "</small></span>" + dotOf(t, o) + "</button>";
      }).join("") + ((o && o.foot) || "");
  }
  function subtabs(view, hid) {
    var k = tabOf(view), t = TABS[k], s = t && SUB[t[0]]; if (!s) return "";
    var x = hid ? ":" + hid : "";
    // S12-x 66회차: 시안 v3 .subseg(«계획·순서 | 동선·길안내», «문서 | 실적·사후관리») — 단추 data-go 로 주소 이동
    return '<nav class="subseg subtabs" aria-label="' + t[1] + ' 안 화면">' + s.map(function (q) { return '<button type="button" class="pr' + (q[2] === view ? " on" : "") + '" data-go="' + q[1] + (q[3] ? x : "") + '"' + (q[2] === view ? ' aria-current="page"' : "") + ">" + q[0] + "</button>"; }).join("") + "</nav>";
  }

  // ── 74회차 «다음 할 일» — 쓰는 도중의 상태를 보고 정한다(처음 한 번 안내가 아님) ──
  //   s = { listN 명단 가구 수, confirmed 방문 계획 확정, planned 남은 가구 수, hid 다음 가구, area 그 읍면, inField 현장·기록 화면에서 방문 중, view 지금 화면, pending 만들 문서 수 }
  //   돌려줌 = { k 안내 열쇠(같으면 다시 빛내지 않음), step 표 이름, tx 한 줄, tab 가리키는 탭, at 주 단추가 바로 그 일인 화면들 }
  function nextStep(s) {
    s = s || {};
    if (!s.listN) return { k: "list", step: "불러오기", tx: "발굴 명단을 불러오면 방문 순서가 바로 짜입니다", tab: "today", at: ["today"] };
    if (!s.confirmed) return { k: "plan", step: "동선 짜기", tx: "순서를 손보고 «방문 계획 확정»을 누르세요", tab: "visit", at: ["plan"] };
    if (s.planned > 0 && s.inField) return { k: "rec:" + (s.hid || ""), step: "상황 고르기 기록", tx: s.view === "record" ? "상황을 고르면 문장이 써집니다 · «기록 저장»" : "상담이 끝나면 상황을 골라 기록합니다", tab: "rec", at: ["home", "check", "talk", "record"] };
    if (s.planned > 0) return { k: "go:" + (s.hid || ""), step: "방문", tx: "다음 가구 " + (s.area ? s.area + " " : "") + (s.hid || "") + " · 집 앞에 도착하면 누르세요", tab: "field", at: ["today", "route"] };
    if (s.pending > 0) return { k: "doc", step: "복명서 만들기", tx: "방문 기록이 끝났습니다 · 복명서를 만들어 받으세요", tab: "rep", at: ["docs"] };
    return { k: "done", step: "실적 보기", tx: "오늘 할 일을 다 했습니다 · 실적을 확인하세요", tab: "rep", at: ["perf"] };
  }
  /** 같은 안내를 계속 반복하지 않게 — 열쇠가 바뀐 첫 번째만 빛남·화살표를 돌린다(이 기기 localStorage, 막히면 이 창 메모리) */
  //   slot = 저장 열쇠(기본 빛남용 · 75회차 안내 줄은 "daeum.s12.nxShown" 따로)
  var seenMem = {}, SEEN = "daeum.s12.nudgeSeen";
  function fresh(k, store, slot) {
    var key = slot || SEEN, st = store || (typeof localStorage !== "undefined" ? localStorage : null), was = seenMem[key];
    try { if (st) was = st.getItem(key); } catch (e) { /* 저장 막힘 */ }
    if (was === k) return false;
    seenMem[key] = k; try { if (st) st.setItem(key, k); } catch (e) { /* 저장 막힘 */ }
    return true;
  }
  // ── 75회차 ⓪-2 폰 전체화면 — 터치 + 좁은 폭(짧은 변 < 768) + API 있음 + 설치 앱 아님일 때만 · 첫 누름에 켜고, 풀리면 다음 누름에 다시 ──
  //   e = { touch, short, standalone, api } → 켤 수 있는 기기인가(순수 함수 — 시험용)
  function fsAble(e) { e = e || {}; return !!(e.touch && e.short > 0 && e.short < 768 && !e.standalone && e.api); }
  var LS_FS = "daeum.s12.fs";
  function fsEnv() {
    var w = root, de = w.document && w.document.documentElement, mm = function (q) { try { return !!(w.matchMedia && w.matchMedia(q).matches); } catch (e) { return false; } };
    var sc = w.screen || {}, sh = Math.min(sc.width || w.innerWidth || 0, sc.height || w.innerHeight || 0);
    return { touch: mm("(pointer: coarse)") && ((w.navigator && w.navigator.maxTouchPoints) || 0) > 0, short: sh,
      standalone: mm("(display-mode: fullscreen)") || mm("(display-mode: standalone)") || !!(w.navigator && w.navigator.standalone),
      api: !!(de && (de.requestFullscreen || de.webkitRequestFullscreen)) };
  }
  function fsOn() { try { return root.localStorage.getItem(LS_FS) !== "off"; } catch (e) { return true; } } // 기본 켜짐
  function fsIn() { var d = root.document; return !!(d && (d.fullscreenElement || d.webkitFullscreenElement)); }
  function fsEnter() {
    if (!fsOn() || fsIn() || !fsAble(fsEnv())) return false;
    var de = root.document.documentElement, f = de.requestFullscreen || de.webkitRequestFullscreen;
    try { var p = f.call(de, { navigationUI: "hide" }); if (p && typeof p.catch === "function") p.catch(function () { /* 거절 — 조용히 */ }); } catch (e) { return false; }
    return true;
  }
  function fsToggle() {
    var on = !fsOn(); try { root.localStorage.setItem(LS_FS, on ? "on" : "off"); } catch (e) { /* 저장 막힘 — 이번 화면만 */ }
    if (on) fsEnter();
    else if (fsIn()) { var d = root.document, x = d.exitFullscreen || d.webkitExitFullscreen; try { var p = x && x.call(d); if (p && p.catch) p.catch(function () {}); } catch (e) { /* 무시 */ } }
    return on;
  }
  var ARW = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var DWN = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
  /** 옮겨 온 단추를 시안 모양으로 — 주(.pri.glow: <span><b>이름</b><small>설명</small></span><span class="go">) · 보조(.sbt: 아이콘 + 짧은 이름) */
  function asPri(el, glow) {
    var sm = el.querySelector(":scope > small"); if (sm) el.removeChild(sm);
    var lbl = el.getAttribute("data-dock-lbl"), sub = el.getAttribute("data-dock-sub");
    Array.prototype.slice.call(el.children).forEach(function (n) { if (/^svg$/i.test(n.tagName)) el.removeChild(n); });
    var b = doc.createElement("b");
    if (lbl) b.textContent = lbl; else { while (el.firstChild) b.appendChild(el.firstChild); }
    el.textContent = "";
    var tx = doc.createElement("span"); tx.appendChild(b);
    if (sub) { var s2 = doc.createElement("small"); s2.textContent = sub; tx.appendChild(s2); } else if (sm) tx.appendChild(sm);
    var go = doc.createElement("span"); go.className = "go"; go.setAttribute("aria-hidden", "true"); go.innerHTML = ARW;
    el.appendChild(tx); el.appendChild(go);
    el.className = "pri" + (glow ? " glow" : "");
    return el;
  }
  function asSbt(el) {
    var sm = el.querySelector(":scope > small"), lbl = el.getAttribute("data-dock-lbl");
    var ic = el.querySelector(":scope > svg");
    if (sm && !el.getAttribute("title")) el.setAttribute("title", (el.textContent || "").replace(/\s+/g, " ").trim());
    if (!lbl) { if (sm) el.removeChild(sm); lbl = (el.textContent || "").replace(/\s+/g, " ").trim(); }
    el.textContent = "";
    if (ic) el.appendChild(ic); else { var t = doc.createElement("span"); t.innerHTML = ARW; if (t.firstChild) el.appendChild(t.firstChild); }
    el.appendChild(doc.createTextNode(lbl));
    el.className = "sbt";
    return el;
  }
  function dockEl(pri, sec, opt) {
    var nx = opt.nx || null, dk = doc.createElement("div");
    dk.className = "dock"; dk.setAttribute("role", "group"); dk.setAttribute("aria-label", "이 화면의 주 단추");
    if (nx && nx.tx && opt.show) { // 75회차 ⓪-3: 상태가 바뀐 첫 번째만 · 약 4초 뒤 · 스크롤·누름에 바로 접힘
      var n = doc.createElement("div"); n.className = "nx"; n.setAttribute("role", "status");
      n.innerHTML = '<span class="pill">다음 할 일</span><span class="tx"></span><span class="ar" aria-hidden="true">' + DWN + "</span>";
      n.querySelector(".tx").textContent = nx.tx;
      if (!opt.glow) { var ar = n.querySelector(".ar"); ar.style.animation = "none"; } // 이미 본 안내 — 화살표도 가만히
      dk.appendChild(n); dk.classList.add("hasnx");
    }
    var row = doc.createElement("div"); row.className = "row";
    if (sec) row.appendChild(asSbt(sec));
    row.appendChild(asPri(pri, !!opt.glow));
    dk.appendChild(row);
    return dk;
  }
  /** 다음 할 일이 다른 탭에 있으면 그 탭 단추(아래 탭·레일)를 살짝 빛낸다 */
  function glowTab(app, key) {
    if (!key) return;
    Array.prototype.forEach.call(app.querySelectorAll('.tabs button[data-tab="' + key + '"], .rail .rl[data-tab="' + key + '"]'), function (b) { b.classList.add("glow"); });
  }

  // ── 브라우저에서만 ──
  var doc = root.document, RM = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var lastTab = null, lastTap = 0;
  /** 그린 뒤 한 번 부른다: 작은 칸 끼우기 · 행동줄 옮기기 · 전환 움직임 */
  function after(app, view, hid, opt) {
    if (!app) return;
    var main = app.querySelector("main"), col0 = app.querySelector("main > .col") || main; // S12-x 66회차: <main class="main"> 안 칸(.col) 2~3개 — 작은 칸은 첫 칸 맨 위
    // ② 작은 칸
    var st = subtabs(view, hid);
    if (st && col0 && !col0.querySelector(".subtabs")) {
      var tmp = doc.createElement("div"); tmp.innerHTML = st;
      col0.insertBefore(tmp.firstChild, col0.firstChild);
    }
    // ③ 주 단추 자리(.dock, 74회차) — 화면이 [data-dock="1"](주)·[data-dock="2"](보조 하나)를 붙여 두면 .app 바로 아래 .dock 으로 옮긴다(옛 .actbar 자리).
    //   노드를 «옮기기»만 하므로 화면 함수가 걸어 둔 이벤트는 그대로 따라간다. opt.nx = nextStep() 결과(다음 할 일 한 줄), opt.glow = 주 단추를 빛낼지.
    var old = app.querySelector(":scope > .actbar"); if (old) old.remove();
    var oldD = app.querySelector(":scope > .dock"); if (oldD) oldD.remove();
    var items = Array.prototype.slice.call(app.querySelectorAll("[data-dock]"));
    var pri = items.filter(function (el) { return el.getAttribute("data-dock") !== "2"; })[0] || null;
    var sec = items.filter(function (el) { return el.getAttribute("data-dock") === "2"; })[0] || null;
    if (!pri && sec) { pri = sec; sec = null; }
    doc.body.classList.toggle("has-dock", !!pri);
    app.classList.toggle("hasact", !!pri);
    var hosts = [pri, sec].map(function (el) { return el && el.parentNode; });
    if (pri) app.appendChild(dockEl(pri, sec, opt || {}));
    hosts.forEach(function (h) { if (h && h !== app && /(^|\s)row2(\s|$)/.test(h.className || "") && !h.children.length && !(h.textContent || "").trim() && h.parentNode) h.parentNode.removeChild(h); }); // 75회차: 단추를 옮기고 빈 .row2 는 지운다(높이 0인데 간격만 남음)
    nxArm(app);
    glowTab(app, opt && opt.tabGlow);
    // ④ 전환(탭이 바뀔 때만)
    var k = tabOf(view);
    if (lastTab !== null && k !== lastTab && !RM.matches) {
      var box = main;
      if (box) {
        box.style.setProperty("--sh-dx", (k > lastTab ? 24 : -24) + "px");
        box.classList.remove("sh-in"); void box.offsetWidth; box.classList.add("sh-in");
        doc.body.classList.add("sh-moving");
        var done = function () { box.classList.remove("sh-in"); doc.body.classList.remove("sh-moving"); };
        box.addEventListener("animationend", done, { once: true }); setTimeout(done, 400);
      }
    }
    lastTab = k;
  }
  // 75회차 ⓪-3 안내 줄 접기 — 약 4초 뒤 스스로, 스크롤·누름이면 바로(첫 0.4초 스크롤은 무시 — 그리는 중 읽던 자리 되살리기)
  var NX_MS = 4000, nxT = null, nxAt = 0;
  function nxHide() {
    clearTimeout(nxT); nxT = null;
    var n = doc && doc.querySelector(".app > .dock > .nx:not(.out)"); if (!n) return;
    var dk = n.parentNode; n.classList.add("out");
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); if (dk) dk.classList.remove("hasnx"); }, RM.matches ? 0 : 240);
  }
  function nxArm(app) {
    clearTimeout(nxT); nxT = null;
    if (!app.querySelector(":scope > .dock > .nx")) return;
    nxAt = Date.now(); nxT = setTimeout(nxHide, NX_MS);
  }
  // ⑤ 진행 표시
  var busyN = 0, busyEl = null;
  function busy(p, label) {
    if (!doc || !p || typeof p.then !== "function") return p;
    busyN++; var shown = false;
    var tm = setTimeout(function () {
      shown = true;
      if (!busyEl) { busyEl = doc.createElement("div"); busyEl.className = "sh-busy"; busyEl.setAttribute("role", "status"); busyEl.innerHTML = '<i aria-hidden="true"></i><span></span>'; doc.body.appendChild(busyEl); }
      busyEl.querySelector("span").textContent = label || "처리하는 중…"; busyEl.classList.add("on");
    }, 300);
    function end() { clearTimeout(tm); busyN = Math.max(0, busyN - 1); if (shown && !busyN && busyEl) busyEl.classList.remove("on"); }
    p.then(end, end);
    return p;
  }
  if (doc) {
    // 260ms 안 이중 탭 무시(탭·작은 칸)
    doc.addEventListener("click", function (e) {
      var a = e.target && e.target.closest && e.target.closest(".tabs a, .tabs button, .rail .rl, .subtabs button");
      if (!a) return;
      var t = Date.now(); if (t - lastTap < 260) { e.preventDefault(); e.stopPropagation(); return; }
      lastTap = t;
    }, true);
    doc.addEventListener("scroll", function () { if (nxT && Date.now() - nxAt > 400) nxHide(); }, { capture: true, passive: true });
    doc.addEventListener("pointerdown", function () { if (nxT) nxHide(); }, true);
    // ⓪-2 폰 전체화면: 누름(click — 사용자 동작으로 인정되는 때)마다 확인, 이미 전체화면이면 아무것도 안 함
    doc.addEventListener("click", function (e) { if (e.target && e.target.closest && e.target.closest('[data-ov="fs"]')) return; fsEnter(); }, true); // «전체화면» 칸 누름은 그 칸이 처리
  }
  var api = { TABS: TABS, SUB: SUB, tabOf: tabOf, links: links, tabsHTML: tabsHTML, railHTML: railHTML, subtabs: subtabs, after: after, busy: busy, nextStep: nextStep, fresh: fresh, NX_MS: NX_MS,
    fsAble: fsAble, fs: { able: function () { return fsAble(fsEnv()); }, on: fsOn, enter: fsEnter, toggle: fsToggle } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DaeumShell = api;
})(typeof window !== "undefined" ? window : globalThis);
