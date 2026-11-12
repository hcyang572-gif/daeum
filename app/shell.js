/* 닿음 화면 틀(셸) — 시안 S12-h v2.2 «탭 5»(S12-i1 ⚙️ 파로, 2026-11-12 · 시안 커밋 a3b3585)
   탭 5 = 오늘 · 방문 · 현장 · 기록 · 보고. PC·폰 같은 메뉴 이름·순서·기능(폭에 따라 배열만 — 폰 아래 탭, 폴드 두 손 나눔 3|2, PC 왼쪽 레일).
   이 파일이 맡는 것(탭 내용은 app/app.js 가 그린다):
   ① 탭 링크 html(nav) — 기존 화면 주소(#today·#plan·#route·#home·#check·#talk·#record·#docs·#perf)를 탭 묶음으로 잇는다
   ② 묶음 안 작은 칸(방문: 계획|동선 · 보고: 문서|실적·사후관리) — 옛 4탭에서 닿던 화면을 하나도 잃지 않게
   ③ 하단 고정 행동줄 — 화면이 [data-dock] 을 붙인 주 행동 단추를 탭바 바로 위 같은 자리로 옮긴다(이벤트는 그대로 따라감)
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
    return '<div class="rbrand"><span class="mark logo"><img src="shared/icons/daeum.svg?v=s12z73" alt=""></span><span><b>닿음</b><small>복지 사각지대<br>현장 업무 도우미</small></span></div>' +
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

  // ── 브라우저에서만 ──
  var doc = root.document, RM = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var lastTab = null, lastTap = 0;
  /** 그린 뒤 한 번 부른다: 작은 칸 끼우기 · 행동줄 옮기기 · 전환 움직임 */
  function after(app, view, hid) {
    if (!app) return;
    var main = app.querySelector("main"), col0 = app.querySelector("main > .col") || main; // S12-x 66회차: <main class="main"> 안 칸(.col) 2~3개 — 작은 칸은 첫 칸 맨 위
    // ② 작은 칸
    var st = subtabs(view, hid);
    if (st && col0 && !col0.querySelector(".subtabs")) {
      var tmp = doc.createElement("div"); tmp.innerHTML = st;
      col0.insertBefore(tmp.firstChild, col0.firstChild);
    }
    // ③ 행동줄
    var old = app.querySelector(":scope > .actbar"); if (old) old.remove();
    var items = Array.prototype.slice.call(app.querySelectorAll("[data-dock]"));
    doc.body.classList.toggle("has-dock", items.length > 0);
    app.classList.toggle("hasact", items.length > 0); // S12-x 65회차: 시안 v3 — 행동줄이 있으면 칸 아래 여백(app/v3_live.css ①)
    if (items.length) {
      items.sort(function (a, b) { return (+b.getAttribute("data-dock") || 1) - (+a.getAttribute("data-dock") || 1); }); // 2(보조) 왼쪽 → 1(주) 오른쪽
      var bar = doc.createElement("div"); bar.className = "actbar" + (items.length > 1 ? " two" : ""); bar.setAttribute("role", "group"); bar.setAttribute("aria-label", "다음 단계");
      items.slice(0, 2).forEach(function (el) { bar.appendChild(el); });
      app.appendChild(bar);
    }
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
  }
  var api = { TABS: TABS, SUB: SUB, tabOf: tabOf, links: links, tabsHTML: tabsHTML, railHTML: railHTML, subtabs: subtabs, after: after, busy: busy };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DaeumShell = api;
})(typeof window !== "undefined" ? window : globalThis);
