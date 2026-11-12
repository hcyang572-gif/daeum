/* 닿음 공통 부품 — «사례별 예시 칩 + 직접 입력»(S12-i1 ⚙️ 파로, 2026-11-12 · 시안 S12-h v2.2 공통 부품)
   쓰임: 기록(i2)·현장(i3) 화면이 같은 부품을 가져다 쓴다. 칩을 누르면 입력칸이 채워지고(여러 개면 « · »로 이어 붙임),
   입력칸은 언제나 직접 고쳐 쓸 수 있다. 화면 그리기는 문자열(html) + 이어 붙이기(bind) 두 함수뿐 — 프레임워크 없음.
   ⛔ 칩 문구에 이름·주소·전화 같은 개인정보를 넣지 않는다(예시는 상황 낱말만).

   DaeumChips.html({ id, label, examples:[문구] | cases:{사례이름:[문구]}, caseKey, value, placeholder, maxlength, multi, hint }) → html
   DaeumChips.bind(root, id, onChange(value)) — 칩 누름·입력을 받아 onChange 로 넘긴다(저장은 부르는 쪽)
   DaeumChips.pick(value, chip, multi) → 새 값(순수 함수, 시험용)                                                         */
(function (root) {
  "use strict";
  var SEP = " · ";
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function parts(v) { return String(v || "").split(SEP).map(function (x) { return x.trim(); }).filter(Boolean); }
  /** 칩 하나를 눌렀을 때의 새 값: 한 개 고르기면 바꿔 넣고(같은 칩을 다시 누르면 비움), 여러 개면 넣고/빼기 */
  function pick(value, chip, multi) {
    var cur = parts(value), has = cur.indexOf(chip) >= 0;
    if (!multi) return has && cur.length === 1 ? "" : chip;
    if (has) return cur.filter(function (x) { return x !== chip; }).join(SEP);
    return cur.concat([chip]).join(SEP);
  }
  function examplesOf(o) {
    if (o.examples && o.examples.length) return o.examples;
    var c = o.cases || {}, k = o.caseKey;
    if (k && c[k]) return c[k];
    var all = []; Object.keys(c).forEach(function (n) { (c[n] || []).forEach(function (x) { if (all.indexOf(x) < 0) all.push(x); }); });
    return all;
  }
  function html(o) {
    o = o || {};
    var id = o.id, ex = examplesOf(o).slice(0, o.max || 6), cur = parts(o.value);
    return '<div class="chipin" data-chipin="' + esc(id) + '"' + (o.multi ? ' data-multi="1"' : "") + ">" +
      (o.label ? '<label class="chipin-l" for="' + esc(id) + '">' + esc(o.label) + (o.hint ? "<small>" + esc(o.hint) + "</small>" : "") + "</label>" : "") +
      (ex.length ? '<div class="chipin-ex" role="group" aria-label="' + esc((o.label || "") + " 예시") + '">' + ex.map(function (x) {
        return '<button type="button" class="chipin-c" data-chip="' + esc(x) + '" aria-pressed="' + (cur.indexOf(x) >= 0 ? "true" : "false") + '">' + esc(x) + "</button>";
      }).join("") + "</div>" : "") +
      '<input class="in1 chipin-i" id="' + esc(id) + '" maxlength="' + (o.maxlength || 60) + '" placeholder="' + esc(o.placeholder || "직접 쓰기") + '" value="' + esc(o.value || "") + '" autocomplete="off">' +
      "</div>";
  }
  function bind(scope, id, onChange) {
    var box = (scope || document).querySelector('[data-chipin="' + id + '"]'); if (!box) return;
    var inp = box.querySelector(".chipin-i"), multi = box.hasAttribute("data-multi");
    function mark() { var cur = parts(inp.value); box.querySelectorAll(".chipin-c").forEach(function (b) { b.setAttribute("aria-pressed", cur.indexOf(b.dataset.chip) >= 0 ? "true" : "false"); }); }
    box.querySelectorAll(".chipin-c").forEach(function (b) {
      b.addEventListener("click", function () {
        inp.value = pick(inp.value, b.dataset.chip, multi).slice(0, +inp.maxLength > 0 ? +inp.maxLength : 60);
        mark(); try { navigator.vibrate && navigator.vibrate(8); } catch (e) { /* 없음 */ }
        if (onChange) onChange(inp.value);
      });
    });
    inp.addEventListener("input", function () { mark(); if (onChange) onChange(inp.value); });
  }
  var api = { html: html, bind: bind, pick: pick, SEP: SEP };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DaeumChips = api;
})(typeof window !== "undefined" ? window : globalThis);
