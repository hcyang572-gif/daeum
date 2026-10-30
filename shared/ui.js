/* 닿음 화면 도우미 — 햅틱(우리가족 AuroraHaptic 7단계)·숫자 굴리기. 두 창구 공통, 빌드 없는 바닐라 JS.
   - 누름 진동: 요소에 data-h="selection|light|medium|heavy|success|warning|error" 를 달면 눌릴 때 진동(안드로이드 크롬·엣지만, 아이폰은 조용히 넘어감)
   - 직접 부르기: DaeumUI.haptic("success") · DaeumUI.countUp(el, 86, "가구")
   - 움직임 줄이기 설정이면 selection 진동과 숫자 굴리기를 생략한다(햅틱은 보조 수단). */
(function () {
  "use strict";
  var MAP = { selection: 8, light: 12, medium: 20, heavy: 35, success: [12, 90, 20], warning: [20, 120, 20], error: [20, 100, 12] };
  var rm = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  function off() { try { return localStorage.getItem("daeum.haptic") === "off"; } catch (e) { return false; } }
  function haptic(kind) {
    if (!MAP[kind] || off()) return;
    if (kind === "selection" && rm.matches) return;
    try { if (navigator.vibrate) navigator.vibrate(MAP[kind]); } catch (e) { /* 지원 안 함 */ }
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-h]") : null;
    if (t && !t.disabled) haptic(t.getAttribute("data-h"));
  }, true);

  /* 숫자 굴리기 640ms(우리가족 aurora_d2_parts) — 소수 자릿수는 목표값을 따른다 */
  function countUp(el, to, suffixHtml) {
    if (!el) return;
    var n = +to, dec = String(to).indexOf(".") >= 0 ? String(to).split(".")[1].length : 0;
    var tail = suffixHtml ? "<small>" + suffixHtml + "</small>" : "";
    if (!isFinite(n) || rm.matches || n === 0) { el.innerHTML = (isFinite(n) ? n.toFixed(dec) : to) + tail; return; }
    var t0 = null, dur = 640;
    function f(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3);
      el.innerHTML = (n * k).toFixed(dec) + tail;
      if (p < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }
  /* ── 종이 결·실크(우리가족 v5_a_aurora_plus.html:1056-1074 함수를 그대로 옮김, S10b) ──
     160px 노이즈 타일(한 점마다 무작위 알파) → --nz-paper·--nz-card·--nz-dock
     실크(네 색 그라데이션 + 흐린 빛 덩어리 4 + 115° 빛줄기 2 + 알갱이) → [data-silk] 요소 바탕 */
  var R = document.documentElement;
  function rng(seed) { var t = seed >>> 0; return function () { t = (t + 0x6D2B79F5) >>> 0; var r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
  function noiseTile(alpha, light, seed) {
    var S = 160, c = document.createElement("canvas"); c.width = c.height = S; var x = c.getContext("2d"), d = x.createImageData(S, S), r = rng(seed);
    for (var i = 0; i < d.data.length; i += 4) { var a = Math.round(r() * alpha * 2 * 255); if (light) { d.data[i] = 24; d.data[i + 1] = 18; d.data[i + 2] = 52; } else { d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; } d.data[i + 3] = a; }
    x.putImageData(d, 0, 0); return "url(" + c.toDataURL("image/png") + ")";
  }
  function addNoise(x, W, H, amt, seed) { try { var d = x.getImageData(0, 0, W, H), r = rng(seed); for (var i = 0; i < d.data.length; i += 4) { var n = (r() - .5) * amt; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } x.putImageData(d, 0, 0); } catch (e) { /* 막힘 */ } }
  function silk(stops, dark, seed) {
    var W = 520, H = 400, c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d");
    var g = x.createLinearGradient(0, 0, W * .4, H); stops.forEach(function (s, i) { g.addColorStop(i / (stops.length - 1), s); }); x.fillStyle = g; x.fillRect(0, 0, W, H);
    var r = rng(seed);
    x.save(); x.filter = "blur(40px)";
    [[.15, .2, .55], [.8, .1, .5], [.5, .55, .6], [.95, .6, .4]].forEach(function (p, i) { x.globalAlpha = .75; x.fillStyle = stops[(i + 1) % stops.length]; x.beginPath(); x.ellipse(W * p[0], H * p[1], W * p[2] * .5, H * p[2] * .45, r() * 3, 0, 7); x.fill(); });
    x.restore(); x.globalAlpha = 1;
    x.save(); x.translate(W * .55, H * .35); x.rotate(115 * Math.PI / 180); var lg = x.createLinearGradient(-70, 0, 70, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(.5, dark ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.34)"); lg.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = lg; x.fillRect(-70, -600, 140, 1200);
    x.translate(-150, 0); var lg2 = x.createLinearGradient(-30, 0, 30, 0); lg2.addColorStop(0, "rgba(255,255,255,0)"); lg2.addColorStop(.5, dark ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.2)"); lg2.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = lg2; x.fillRect(-30, -600, 60, 1200); x.restore();
    addNoise(x, W, H, dark ? 16 : 26, seed); return "url(" + c.toDataURL("image/jpeg", .9) + ")";
  }
  var SILK = null;
  function paintSilk(root) {
    if (!SILK) return;
    [].forEach.call((root || document).querySelectorAll("[data-silk]"), function (el) { if (SILK[el.dataset.silk]) el.style.backgroundImage = SILK[el.dataset.silk]; });
  }
  function texture() {
    try {
      var dk = R.dataset.theme === "dark" || (R.dataset.theme !== "light" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
      var set = function (k, v) { R.style.setProperty(k, v); };
      /* 종이 결은 tokens.css 의 크기 없는 SVG 결(요소 한 장)을 쓴다 — 160px 캔버스 타일은 반복 무늬가 보여 끔(S10f 10-30) */
      SILK = { night: silk(["#2A2C5C", "#3B3F7C", "#6A6CAE", "#1E2048"], true, 11) };
      paintSilk();
    } catch (e) { /* 캔버스가 없으면 tokens.css 의 SVG 결·그라데이션 실크로 대신 */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", texture); else texture();
  if (window.matchMedia) { try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", texture); } catch (e) { /* 구형 */ } }

  /* ── 더보기 대화상자(공통) — [data-sheet="id"] 단추가 <dialog id> 를 연다. 닫으면 연 단추로 초점을 돌려 준다 ── */
  function openSheet(id, opener) {
    var d = document.getElementById(id); if (!d) return;
    d._opener = opener || document.activeElement;
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
    [].forEach.call(document.querySelectorAll('[data-sheet="' + id + '"]'), function (b) { b.setAttribute("aria-expanded", "true"); });
  }
  function closeSheet(d) {
    if (!d) return;
    if (d.close && d.open) d.close(); else d.removeAttribute("open");
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var op = t.closest("[data-sheet]"); if (op) { e.preventDefault(); openSheet(op.getAttribute("data-sheet"), op); return; }
    var d = t.closest("dialog.d-sheet");
    if (!d) return;
    if (t === d) { var r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeSheet(d); return; } // 배경 누름
    if (t.closest("[data-close]") || t.closest("a[href]") || t.closest("button.sh-i")) closeSheet(d); // 닫기·링크 → 닫힘
  });
  document.addEventListener("close", function (e) {
    var d = e.target; if (!d || !d.classList || !d.classList.contains("d-sheet")) return;
    [].forEach.call(document.querySelectorAll('[data-sheet="' + d.id + '"]'), function (b) { b.setAttribute("aria-expanded", "false"); });
    if (d._opener && d._opener.focus && document.contains(d._opener)) { try { d._opener.focus(); } catch (x) { /* 무시 */ } }
  }, true);

  window.DaeumUI = { haptic: haptic, countUp: countUp, paintSilk: paintSilk, openSheet: openSheet, closeSheet: closeSheet };
})();
