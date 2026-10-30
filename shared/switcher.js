/* 시연용 창구 전환(S10m, 🩵 미르 10-30) — 호창님 «시민용과 공무원용을 서로 쉽게 전환하여 볼 수 있도록».
   각 창구 <head> 에 이 한 줄만 둔다: <script src="../shared/switcher.js"></script>
   ① 맨 위 고정 띠 [주민 화면 | 공무원 화면] — 지금 보는 쪽은 aria-current="page"
   ② 주민이 요청을 보낸 뒤 «공무원 화면»으로 가면 ?req=<접수번호> 를 붙여, 공무원 «오늘 › 새 주민 신호»에서 그 줄을 강조
      (같은 브라우저 localStorage «daeum.requests» = shared/requests.js 를 두 창구가 함께 쓴다)
   ③ PC 1280px 이상 «나란히 보기» → shared/pair.html(두 창구를 좌우 iframe 으로, ?sw=embed 면 띠를 그리지 않음)
   데이터를 새로 만들거나 보내지 않는다. 가구·요청은 모두 가상(시연). */
(function () {
  "use strict";
  var doc = document, html = doc.documentElement;
  var me = doc.currentScript;
  var SHARED = new URL(".", me ? me.src : location.href);
  var ROOT = new URL("../", SHARED);
  var URLS = { citizen: new URL("citizen/index.html", ROOT).href, officer: new URL("officer/index.html", ROOT).href, pair: new URL("pair.html", SHARED).href };
  var path = location.pathname;
  var side = /\/citizen\//.test(path) ? "citizen" : /\/officer\//.test(path) ? "officer" : /\/shared\/pair\.html$/.test(path) ? "pair" : "";
  var params = new URLSearchParams(location.search);
  var embed = params.get("sw") === "embed";
  var LAST = "daeum.sw.last";
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  if (side === "citizen" || side === "officer") ss(LAST, side);

  // 스타일은 즉시 붙이고, 띠 자리(padding-top)도 먼저 잡아 둔다 — 띠가 늦게 그려져도 본문이 밀리지 않게
  var link = doc.createElement("link");
  link.rel = "stylesheet"; link.href = new URL("switcher.css", SHARED).href;
  doc.head.appendChild(link);
  if (!embed) html.classList.add("sw-on"); else html.classList.add("sw-embed");

  var ICON = {
    citizen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
    officer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6Z"/><path d="m9 12 2 2 4-4"/></svg>',
    pair: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="7.5" height="14" rx="2"/><rect x="13.5" y="5" width="7.5" height="14" rx="2"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  /* 주민 접수 직후라면 그 접수번호 — 공무원 화면으로 넘길 때 붙인다 */
  function justSentId() {
    if (side !== "citizen") return "";
    var done = doc.getElementById("step-done"), id = doc.getElementById("req-id");
    return done && !done.hidden && id && /^REQ-/.test(id.textContent.trim()) ? id.textContent.trim() : "";
  }
  function officerHref() { var id = justSentId(); return URLS.officer + (id ? "?req=" + encodeURIComponent(id) : "") + "#today"; }

  function bar() {
    var b = doc.createElement("div");
    b.className = "sw-bar";
    b.innerHTML =
      '<span class="sw-k" aria-hidden="true">시연 화면</span>' +
      '<nav class="sw-seg" aria-label="시연 화면 전환">' +
        '<a href="' + URLS.citizen + '" data-sw-to="citizen" data-h="selection"' + (side === "citizen" ? ' aria-current="page"' : "") + '>' + ICON.citizen + '<span>주민 화면</span></a>' +
        '<a href="' + URLS.officer + '#today" data-sw-to="officer" data-h="selection"' + (side === "officer" ? ' aria-current="page"' : "") + '>' + ICON.officer + '<span>공무원 화면</span></a>' +
      '</nav>' +
      '<button type="button" class="sw-pair" aria-pressed="' + (side === "pair") + '" data-h="light" title="PC에서 두 화면을 좌우로 함께 봅니다">' + ICON.pair + '<span>나란히 보기</span></button>';
    b.querySelector(".sw-pair").addEventListener("click", function () {
      if (side === "pair") location.href = (ss(LAST) === "citizen" ? URLS.citizen : URLS.officer + "#today");
      else location.href = URLS.pair;
    });
    var skip = doc.querySelector("body > .skip");
    doc.body.insertBefore(b, skip ? skip.nextSibling : doc.body.firstChild);
  }

  /* 주민 → 공무원 연결: 띠의 «공무원 화면»과 접수 화면의 [data-sw-to="officer"] 모두 접수번호를 달고 간다.
     나란히 보기 안(embed)에서는 창을 바꾸지 않고, 옆 공무원 칸에 «방금 온 신호»를 알린다. */
  doc.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var to = a.getAttribute("data-sw-to");
    if (!to) {
      var p = new URL(a.href, location.href).pathname;
      to = /\/officer\/(index\.html)?$/.test(p) ? "officer" : /\/citizen\/(index\.html)?$/.test(p) ? "citizen" : "";
    }
    if (!to) return;
    if (embed && window.parent !== window) {
      e.preventDefault();
      window.parent.postMessage({ sw: "focus", to: to, req: to === "officer" ? justSentId() : "" }, location.origin);
      return;
    }
    if (to === "officer" && side === "citizen") { e.preventDefault(); location.href = officerHref(); }
  });

  /* ── 공무원 쪽: 방금 들어온 주민 신호 강조 ── */
  var fresh = {}, noteEl = null, mo = null;
  function mark() {
    var ol = doc.getElementById("todayRequests"); if (!ol) return;
    Object.keys(fresh).forEach(function (id) {
      var li = ol.querySelector('li[data-req="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
      if (!li || li.classList.contains("sw-fresh")) return;
      li.classList.add("sw-fresh");
      var b = li.querySelector("b");
      if (b && !li.querySelector(".sw-tag")) { var t = doc.createElement("span"); t.className = "d-tag acc sw-tag"; t.textContent = "방금"; b.insertAdjacentElement("afterend", t); }
    });
  }
  function reveal(id) {
    if (location.hash !== "#today" && location.hash !== "") location.hash = "#today";
    var more = doc.getElementById("moreToday"); if (more) more.open = true;
    mark();
    setTimeout(function () {
      var li = doc.querySelector('#todayRequests li.sw-fresh') || doc.getElementById("todayRequests");
      if (li) { li.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); if (li.tabIndex < 0) li.tabIndex = -1; li.focus({ preventScroll: true }); }
    }, 60);
    hideNote();
  }
  function hideNote() { if (noteEl) { noteEl.remove(); noteEl = null; } }
  function note(rec) {
    hideNote();
    var n = doc.createElement("div");
    n.className = "sw-note"; n.setAttribute("role", "status");
    var where = rec && rec.region ? rec.region + " · " : "";
    n.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="t"><b>방금 들어온 주민 신호</b>' + where + "오늘 › 새 주민 신호에 올라왔어요</span>" +
      '<button type="button" class="go" data-h="light">보기</button><button type="button" class="x" aria-label="알림 닫기">' + ICON.x + "</button>";
    n.querySelector(".go").addEventListener("click", function () { reveal(rec && rec.id); });
    n.querySelector(".x").addEventListener("click", hideNote);
    doc.body.appendChild(n);
    noteEl = n;
  }
  function flag(id, open) {
    if (!id) return;
    fresh[id] = 1;
    var R = window.DaeumRequests, rec = R && R.get ? R.get(id) : null;
    if (open) reveal(id); else note(rec || { id: id });
  }
  function officerInit() {
    var ol = doc.getElementById("todayRequests");
    if (ol && window.MutationObserver) { mo = new MutationObserver(mark); mo.observe(ol, { childList: true }); }
    var R = window.DaeumRequests;
    var known = {};
    if (R) R.list().forEach(function (r) { known[r.id] = 1; });
    // ① 주민 화면에서 넘어온 경우 — 그 줄을 바로 펼쳐 보여 준다
    var q = params.get("req");
    if (q) { fresh[q] = 1; setTimeout(function () { reveal(q); }, 250); }
    // ② 다른 탭·나란히 보기의 주민 칸에서 새로 보낸 경우 — 알림만 띄우고 누르면 보여 준다
    if (R && R.onChange) R.onChange(function (list) {
      list.forEach(function (r) { if (!known[r.id]) { known[r.id] = 1; if (r.status === "new" && !r.seed) flag(r.id, false); } });
    });
    // ③ 나란히 보기에서 주민 칸의 «공무원 화면에서 보기»를 누른 경우
    window.addEventListener("message", function (e) {
      if (e.origin !== location.origin || !e.data || e.data.sw !== "fresh") return;
      if (e.data.req) flag(e.data.req, true); else reveal("");
    });
  }

  /* ── 나란히 보기 페이지 ── */
  function pairInit() {
    var c = doc.getElementById("swCitizen"), o = doc.getElementById("swOfficer");
    if (!c || !o) return;
    c.src = URLS.citizen + "?sw=embed";
    o.src = URLS.officer + "?sw=embed#today";
    window.addEventListener("message", function (e) {
      if (e.origin !== location.origin || !e.data || e.data.sw !== "focus") return;
      var target = e.data.to === "citizen" ? c : o;
      target.classList.add("sw-flash"); setTimeout(function () { target.classList.remove("sw-flash"); }, 1400);
      if (e.data.to === "officer") o.contentWindow.postMessage({ sw: "fresh", req: e.data.req || "" }, location.origin);
      target.focus();
    });
  }

  function start() {
    if (!embed) bar();
    if (side === "officer") officerInit();
    if (side === "pair") pairInit();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start); else start();
})();
