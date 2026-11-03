/* 닿음 — 때맞춘 움직임(S12-d 39 · 🩵 미르 2026-11-03)
   app.js 는 상태가 바뀔 때마다 #app 을 통째로 다시 그린다(동기화 신호·20초 시계 포함).
   그래서 CSS 만으로 등장 효과를 걸면 다시 그릴 때마다 반복된다. 이 파일은 «무엇이 새로 생겼는지»를
   앞 화면과 비교해, 의미 있는 순간에만 꼬리표를 붙인다. app.js 는 건드리지 않는다.
   ① 다른 화면으로 넘어갈 때 — main 의 덩어리가 차례로 떠오름(.m-enter) + 큰 숫자 세어 올라감
   ② 확인·연계·확정·문서 완성 — 방금 켜진 것만 한 번 튐(.m-just) / 초록 물결(.m-ring)
   ③ 새 문서 종이 — 밀려 올라와 놓임(.m-paper)
   ④ 안전 모드 넘김 알림이 새로 뜰 때(.m-alert)
   움직임 줄이기 설정이면 아무것도 붙이지 않는다. */
(function () {
  "use strict";
  var app = document.getElementById("app");
  if (!app || !window.MutationObserver) return;
  var RM = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  // [선택자, 꼬리표] — «켜진 상태»를 나타내는 것만
  var WATCH = [
    ['.switch button[aria-checked="true"]', "m-just"],
    ['.ck-b button[aria-pressed="true"]', "m-just"],
    [".svc.on", "m-ring"],
    ['.svc-t[aria-pressed="true"]', "m-just"],
    ['.tok button[aria-pressed="true"]', "m-just"],
    [".ckb.on", "m-just"],
    [".ck-row.ok .ck-n", "m-just"],
    [".ck-row.bad .ck-n", "m-just"],
    [".dep .row.made .go", "m-just"],
    [".flow2 button.d1", "m-just"],
    [".flow2 button.d2", "m-just"],
    [".conf", "m-ring"],
    [".dcard.on", "m-just"],
    [".tline .stop.dn .ax b", "m-just"],
    [".sfa[role=\"alert\"]", "m-alert"]
  ];
  var COUNT = ".dead .n, .fsig b, .rlg b, .dcard .dn, .basis b, .vs b, .idc .rk b";

  function screenOf() { return (location.hash || "#today").replace(/^#/, ""); }
  function idOf(el) {
    var d = el.closest("[data-svc],[data-place],[data-res],[data-sfid],[data-fill],[data-hid],[data-day]") || el;
    var a = "";
    for (var i = 0; i < d.attributes.length; i++) { var n = d.attributes[i].name; if (n.indexOf("data-") === 0) a += n + "=" + d.attributes[i].value + ";"; }
    return a + "|" + (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  }
  function keys() {
    var out = {};
    WATCH.forEach(function (w, wi) {
      app.querySelectorAll(w[0]).forEach(function (el, i) { out[wi + ":" + idOf(el) + "#" + i] = { el: el, cls: w[1] }; });
    });
    return out;
  }
  function paperKey() {
    var p = app.querySelector(".paper");
    if (!p) return "";
    var h = p.querySelector("h3"), s = p.querySelector(".sub");
    return (h ? h.textContent : "") + "|" + (s ? s.textContent : "");
  }
  function tag(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // 같은 꼬리표를 다시 붙여도 처음부터 움직이게
    el.classList.add(cls);
    if (cls === "m-enter") return; // 자식 움직임이 끝날 때 아래 문서 수신기가 뗀다
    el.addEventListener("animationend", function h(e) { if (e.target !== el) return; el.removeEventListener("animationend", h); el.classList.remove(cls); });
  }
  function countUp(root) {
    var list = root.querySelectorAll(COUNT), t0 = null, items = [];
    list.forEach(function (el) {
      var tn = el.firstChild;
      if (!tn || tn.nodeType !== 3) return;
      var m = /^(\s*)(\d{1,4})(\s*)$/.exec(tn.nodeValue);
      if (!m || +m[2] < 2) return;
      items.push({ tn: tn, to: +m[2], pre: m[1], post: m[3] });
      tn.nodeValue = m[1] + "0" + m[3];
    });
    if (!items.length) return;
    function frame(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / 720), e = 1 - Math.pow(1 - k, 3);
      items.forEach(function (it) { it.tn.nodeValue = it.pre + Math.round(it.to * e) + it.post; });
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var lastScreen = null, lastKeys = {}, lastPaper = "", queued = false;
  function settle() {
    queued = false;
    var scr = screenOf(), now = keys(), pk = paperKey(), main = app.querySelector("main");
    if (RM.matches) { lastScreen = scr; lastKeys = now; lastPaper = pk; return; }
    if (scr !== lastScreen) {
      if (main) tag(main, "m-enter");
      if (main) countUp(main);
    } else {
      Object.keys(now).forEach(function (k) { if (!lastKeys[k]) tag(now[k].el, now[k].cls); });
      if (pk && lastPaper && pk !== lastPaper) { var p = app.querySelector(".paper"); if (p) tag(p, "m-paper"); }
    }
    lastScreen = scr; lastKeys = now; lastPaper = pk;
  }
  // m-enter 는 main 의 자식마다 움직임이 끝나므로, main 에서 animationend 를 기다리지 않고 시간으로 뗀다
  document.addEventListener("animationend", function (e) {
    if (e.animationName === "mRise" && e.target.parentElement && e.target.parentElement.classList.contains("m-enter") && !e.target.nextElementSibling) e.target.parentElement.classList.remove("m-enter");
  }, true);

  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(settle);
  }).observe(app, { childList: true });
  if (app.querySelector("main")) settle();
})();
