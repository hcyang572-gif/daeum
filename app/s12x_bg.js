/* S12-x 바탕 층 — 🩵 미르 2026-11-12 · 시안 S12-h v2.2 «바탕: 모래 결 + 젖은 흑사 광택(117/123) + 상주 지형 단면» 그대로 옮김
   같은 난수 씨앗·같은 수치. 고정층(position:fixed, z-index:-1)이라 스크롤해도 흔들리지 않는다.
   움직임: 지형 등고선이 천천히 흐르고 금빛 동선 점선이 흐른다(약 20장/초). 움직임 줄이기면 한 장만 그림 · 탭 숨김이면 멈춤 · 화면 전환 중 멈춤. */
(function () {
  "use strict";
  var doc = document; if (!doc || !doc.body) return;
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function lay(cls, tag) { var e = doc.createElement(tag || "div"); e.className = "x-lay " + cls; e.setAttribute("aria-hidden", "true"); doc.body.insertBefore(e, doc.body.firstChild); return e; }
  var terr = lay("terrain", "canvas"), spk = lay("spk"), sand = lay("sand");
  try {
    // 모래 결(마스크)
    var n = 160, c = doc.createElement("canvas"); c.width = c.height = n;
    var x = c.getContext("2d"), im = x.createImageData(n, n), r = rng(0x9E3779B9);
    for (var i = 0; i < n * n; i++) { var b = Math.min(7, Math.floor(r() * 8)); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = 255; im.data[i * 4 + 3] = Math.round((b + .5) / 8 * 255); }
    x.putImageData(im, 0, 0); var u = "url(" + c.toDataURL() + ")"; sand.style.webkitMaskImage = u; sand.style.maskImage = u;
    // 젖은 흑사 광택
    var N = 300, K = 3, c2 = doc.createElement("canvas"); c2.width = c2.height = N * K;
    var y = c2.getContext("2d"), r2 = rng(0x2545F491), dk = [22, 22, 24], lt = [255, 255, 255];
    var dot = function (cx, cy, rad, f) { y.beginPath(); y.arc(cx, cy, rad, 0, Math.PI * 2); y.fillStyle = f; y.fill(); };
    var cnt = Math.round(N * N * .006);
    for (var j = 0; j < cnt; j++) {
      var cx = (2 + r2() * (N - 4)) * K, cy = (2 + r2() * (N - 4)) * K, d = .55 + r2() * .25, rad = d / 2 * K, a = .55 + r2() * .35, sa = a * .35 * 1.3;
      var g = y.createRadialGradient(cx + rad * .5, cy + rad * .7, 0, cx + rad * .5, cy + rad * .7, rad * 2.1); g.addColorStop(0, "rgba(0,0,0," + sa.toFixed(2) + ")"); g.addColorStop(1, "rgba(0,0,0,0)"); dot(cx + rad * .5, cy + rad * .7, rad * 2.1, g);
      var top = [Math.min(255, dk[0] + 38), Math.min(255, dk[1] + 42), Math.min(255, dk[2] + 44)];
      var bb = y.createRadialGradient(cx - rad * .35, cy - rad * .4, rad * .1, cx, cy, rad); bb.addColorStop(0, "rgba(" + top + "," + a.toFixed(2) + ")"); bb.addColorStop(1, "rgba(" + dk + "," + a.toFixed(2) + ")"); dot(cx, cy, rad, bb);
      dot(cx - rad * .38, cy - rad * .42, rad * .28 * 1.25, "rgba(" + lt + "," + (.5 + r2() * .25).toFixed(2) + ")");
    }
    spk.style.backgroundImage = "url(" + c2.toDataURL() + ")";
  } catch (e) { /* 질감이 없어도 화면은 그대로 */ }
  // 상주 지형 단면 등고선 + 금빛 동선 + 빛 띠
  var tx = terr.getContext && terr.getContext("2d"); if (!tx) return;
  var TW = 0, TH = 0, DPR = Math.min(2, window.devicePixelRatio || 1);
  function size() { var w = window.innerWidth, h = window.innerHeight; if (w === TW && h === TH) return; TW = w; TH = h; terr.width = w * DPR; terr.height = h * DPR; draw(performance.now()); }
  function draw(t) {
    var w = TW, h = TH; tx.setTransform(DPR, 0, 0, DPR, 0, 0); tx.clearRect(0, 0, w, h);
    var ph = t / 1000 * .05, L = 11;
    for (var k = 0; k < L; k++) {
      var y0 = h * (.30 + k * .062); tx.beginPath();
      for (var xx = 0; xx <= w; xx += 8) { var uu = xx / w; var yy = y0 + Math.sin(uu * 3.1 + k * .7 + ph) * 14 + Math.sin(uu * 7.3 - k * .4 + ph * 1.7) * 6 + Math.sin(uu * 1.3 + ph * .6) * 22 * (1 - k / L); if (xx) tx.lineTo(xx, yy); else tx.moveTo(xx, yy); }
      tx.strokeStyle = "rgba(31,102,118," + (.035 + .03 * (k % 3 === 0)).toFixed(3) + ")"; tx.lineWidth = k % 3 === 0 ? 1.3 : .9; tx.stroke();
    }
    tx.beginPath(); var yb = h * .62;
    for (var x2 = 0; x2 <= w; x2 += 6) { var u2 = x2 / w; var y2 = yb + Math.sin(u2 * 2.4 + ph * 1.2) * 26 + Math.sin(u2 * 6.1 + ph) * 7; if (x2) tx.lineTo(x2, y2); else tx.moveTo(x2, y2); }
    tx.setLineDash([2, 9]); tx.lineDashOffset = -t / 60; tx.strokeStyle = "rgba(138,106,53,.22)"; tx.lineWidth = 2; tx.lineCap = "round"; tx.stroke(); tx.setLineDash([]);
    var gr = tx.createLinearGradient(0, 0, w, h), s = (Math.sin(ph * 2) + 1) / 2;
    gr.addColorStop(Math.max(0, s - .25), "rgba(255,255,255,0)"); gr.addColorStop(s, "rgba(255,255,255,.10)"); gr.addColorStop(Math.min(1, s + .25), "rgba(255,255,255,0)"); tx.fillStyle = gr; tx.fillRect(0, 0, w, h);
  }
  size();
  window.addEventListener("resize", function () { clearTimeout(window.__xrz); window.__xrz = setTimeout(size, 120); });
  if (RM) return;
  var last = 0;
  function loop(t) { if (!doc.hidden && !doc.body.classList.contains("sh-moving") && t - last > 48) { draw(t); last = t; } requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();

/* 폭 판정 — 승인 시안 v3 와 같은 문턱(폰<600 · 폴드<800 · 태블릿<1200 · PC — 104회차 900→800)을 <html data-mode> 로 붙인다.
   app/v3.css 의 html[data-mode=x] .app 규칙이 이것을 본다. 기능은 같고 배열만 바뀐다. 🩵 미르 2026-11-12 */
(function () {
  "use strict";
  var de = document.documentElement, last = "";
  function modeOf(w) { return w < 600 ? "phone" : w < 800 ? "fold" : w < 1200 ? "tab" : "pc"; } // 104회차 파로B: 폴드 문턱 900→800 — 정본 시안 v4 기기표(폴드 750 = fold · 태블릿 세로 820 = tab)와 같게
  function set() {
    var m = modeOf(window.innerWidth || de.clientWidth || 360);
    if (m === last) return; last = m; de.setAttribute("data-mode", m);
    try { window.dispatchEvent(new CustomEvent("daeum:mode", { detail: m })); } catch (e) {}
  }
  set();
  var t = 0; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(set, 80); }, { passive: true });
  window.DaeumMode = function () { return last; };
})();

/* 고정 띠(.hbar) 자리 — 폰에서 머리(.top)가 위에 붙어 있으면 그 높이를 --top-h 로. 옆 메뉴(PC)·숨김이면 0. 🩵 미르 2026-11-12 */
(function () {
  "use strict";
  var de = document.documentElement, last = -1;
  function measure() {
    var t = document.querySelector("header.top"), h = 0;
    if (t) { var cs = getComputedStyle(t); if (cs.display !== "none" && cs.position === "sticky") h = Math.round(t.getBoundingClientRect().height); }
    if (h !== last) { last = h; de.style.setProperty("--top-h", h + "px"); }
  }
  var q = 0; function soon() { if (q) return; q = requestAnimationFrame(function () { q = 0; measure(); }); }
  window.addEventListener("resize", soon, { passive: true });
  window.addEventListener("hashchange", soon);
  if (window.MutationObserver) { var app = document.getElementById("app"); if (app) new MutationObserver(soon).observe(app, { childList: true }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", measure); else measure();
})();
