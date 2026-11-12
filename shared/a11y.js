/* 닿음 · 웹 접근성 공통 보강(S12-q, 2026-11-12)
 * 근거: 「전자정부 웹사이트 품질관리 지침」(행정안전부 고시 제2025-46호) 웹접근성 영역 → KWCAG 2.2
 *  - 6.4.1 반복 영역 건너뛰기: 맨 앞 «본문 바로가기» 링크(키보드 첫 Tab에서 보임)
 *  - 6.1.2 초점 이동과 표시: 화면(해시) 전환 뒤 초점을 새 화면 본문(main)으로 옮긴다
 * 해시 경로(#today 등)를 쓰는 앱이라 바로가기 링크는 주소를 바꾸지 않고 초점만 옮긴다.
 * 이 파일은 앱 스크립트 «뒤»에 싣는다(앱의 hashchange 그리기가 먼저 끝나야 새 main 이 있다). */
(function () {
  "use strict";
  var doc = document;
  function mainEl() { var a = doc.getElementById("app"); return (a && a.querySelector("main")) || a; }
  function focusMain() {
    var m = mainEl(); if (!m) return;
    if (!m.hasAttribute("tabindex")) m.setAttribute("tabindex", "-1");
    if (!m.id) m.id = "daeum-main";
    try { m.focus({ preventScroll: true }); } catch (e) { m.focus(); }
  }
  function addSkip() {
    if (doc.querySelector(".skip-link")) return;
    var s = doc.createElement("a");
    s.className = "skip-link"; s.href = "#daeum-main"; s.textContent = "본문 바로가기";
    s.addEventListener("click", function (e) { e.preventDefault(); focusMain(); });
    doc.body.insertBefore(s, doc.body.firstChild);
  }
  // 7.2.1 사용자 요구에 따른 실행 · 6.1.2 초점: 동기화·시계로 화면을 «다시 그릴» 때(주소는 그대로) 키보드 초점을 잃지 않게 되돌린다
  var FOC = 'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])';
  var last = null, hashMoved = false;
  function sig(el) {
    var app = doc.getElementById("app"); if (!app || !el || !app.contains(el)) return null;
    var list = Array.prototype.slice.call(app.querySelectorAll(FOC));
    return { id: el.id || "", act: el.getAttribute("data-act") || "", href: el.getAttribute("href") || "", txt: (el.textContent || "").trim().slice(0, 40), i: list.indexOf(el) };
  }
  function restore() {
    var app = doc.getElementById("app"), ae = doc.activeElement;
    if (!app || !last || hashMoved || (ae && ae !== doc.body && ae !== doc.documentElement)) return;
    var t = last.id ? doc.getElementById(last.id) : null;
    if (!t) {
      var list = Array.prototype.slice.call(app.querySelectorAll(FOC));
      t = list.filter(function (x) { return (x.getAttribute("data-act") || "") === last.act && (x.getAttribute("href") || "") === last.href && (x.textContent || "").trim().slice(0, 40) === last.txt; })[0] || list[last.i] || null;
    }
    if (t) { try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } }
  }
  doc.addEventListener("focusin", function (e) { var s = sig(e.target); if (s) last = s; });
  function watch() {
    var app = doc.getElementById("app"); if (!app || !window.MutationObserver) return;
    new MutationObserver(function () { setTimeout(restore, 0); }).observe(app, { childList: true });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { addSkip(); watch(); }); else { addSkip(); watch(); }
  window.addEventListener("hashchange", function () { hashMoved = true; last = null; setTimeout(function () { focusMain(); hashMoved = false; }, 0); });
  window.DaeumA11y = { focusMain: focusMain };
})();
