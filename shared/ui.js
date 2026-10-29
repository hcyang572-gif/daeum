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
  window.DaeumUI = { haptic: haptic, countUp: countUp };
})();
