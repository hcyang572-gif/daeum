/* 위기가구 발굴 현장 설문 v2 — 한 화면 한 문항, 모두 건너뛸 수 있고, 하나만 고르는 문항은 고르면 바로 다음으로 넘어간다. 이름·개인정보는 받지 않는다.
   저장: 닿음 Supabase field_survey(anon=넣기만). 한 기기 한 번(무작위 토큰 + 로컬 표시, 서버 unique). 컬럼은 v1 그대로, 답은 answers(JSON) 안에.
   답 키는 v1 과 같은 이름을 쓴다 → 01_리서치/현장설문/read_survey.js 가 그대로 읽는다(빠진 문항은 «무응답»으로 나온다).
   v2 에서 뺀 문항: workplace·career(10-30 호창님)·duty·list_route·device·case_areas.
   10-30 되살림(선택형으로): list_score·mobile_feature·input_fields(v1 서술형 → 선택형, 다르면 input_fields_memo).
   v3 화면(10-30): 성능 — 아래 단추 줄은 한 번만 만들고 글자·동작만 바꾼다, 전환은 transform·opacity 180ms, 글꼴 교체는 화면 전환 순간에만.
   문항 id 를 바꾸면 read_survey.js LABELS 도 함께 고친다. */
(function () {
  "use strict";
  var C = window.SURVEY_CONFIG || {};
  var MEMO_MAX = 300, TEXT_MAX = 500, SHORT_MAX = 100;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 저희가 이해한 발굴 순서(01_리서치/현행_위기가구_발굴절차.md · 정보원_명단_형태.md 바탕)
  var FLOW = [
    ["f1", "사회보장정보원이 격월로 단전·단수·체납 등 위기정보(약 50종)를 모아 명단을 만든다"],
    ["f2", "명단이 복지부 → 시군구 → 읍면동으로 내려온다"],
    ["f3", "읍면동에서 담당자별로 조사할 가구를 나눈다"],
    ["f4", "방문 전에 전화·AI 초기상담으로 먼저 확인한다"],
    ["f5", "가정을 방문해 실제 위기 여부를 조사한다"],
    ["f6", "조사 결과를 기한 안에 행복이음에 입력한다"],
    ["f7", "필요한 공공·민간 서비스를 연계하거나 신청을 돕는다"],
    ["f8", "연계 뒤 다시 확인하며 사후관리한다"]
  ];
  var RATE = [
    ["route", "하루 방문 동선을 지도·순서 한 장으로"],
    ["retry", "연락 시도를 남기면 다음 시도 일정 제안"],
    ["link", "연계가 빠진 가구를 알림으로 표시"],
    ["draft", "행복이음 입력 순서대로 정리한 초안 복사"]
  ];
  // 저희가 추정한 행복이음 조사 결과 입력 순서 — 03_시제품/officer/features.js HANDOFF(12칸)와 같은 이름·순서
  var INPUT_GUESS = ["대상 가구(읍면동)", "상담·조사 일시", "상담 방법", "방문·연락 시도 이력", "주요 호소(상담 내용 요약)", "욕구 영역",
    "가구 상황", "긴급 여부", "조치·서비스 연계", "연계 결과(신청·결정)", "비해당 사유", "향후 계획"];

  var Q = [
    { id: "flow", type: "flow", label: "저희가 정리한 발굴 순서입니다", hint: "실제와 다른 단계만 눌러 주세요. 모두 맞으면 그대로 넘어가시면 됩니다." },
    { id: "list_count", type: "single", label: "한 차수에 맡는 발굴 대상은 대략 몇 건인가요?", options: ["10건 미만", "10~30건", "30~50건", "50~100건", "100건 이상", "잘 모르겠다"] },
    { id: "list_export", type: "single", label: "행복이음에서 위기가구 발굴 대상자 명단을 볼 때, 그 명단을 엑셀로 내려받을 수 있나요?", options: ["있다", "없다", "잘 모르겠다"] },
    { id: "list_score", type: "single", label: "행복이음 위기가구 명단에 점수·순위(위험도)가 표시되나요?", options: ["있다", "없다", "잘 모르겠다"] },
    { id: "plan_method", type: "multi", label: "방문 순서·일정은 무엇으로 정하시나요?", hint: "해당하는 것을 모두 골라 주세요.", options: ["행복이음 화면", "엑셀", "수첩·종이", "지도 앱", "동료·통장과 상의", "기타"] },
    { id: "mobile_feature", type: "single", label: "모바일 행복이음(또는 업무폰)에 방문 일정이나 지도 기능이 있나요?", options: ["일정·지도 둘 다 있다", "일정만 있다", "지도만 있다", "둘 다 없다", "안 쓴다·잘 모르겠다"] },
    { id: "visits_day", type: "single", label: "하루에 몇 가구쯤 방문하시나요?", options: ["1~3곳", "4~6곳", "7~10곳", "10곳 넘게"] },
    { id: "miss_rate", type: "single", label: "가 보면 안 계시거나 대상이 아닌 경우는 어느 정도인가요?", hint: "체감으로 골라 주세요.", options: ["10% 미만", "10~30%", "30~50%", "절반 넘게"] },
    { id: "retry_count", type: "single", label: "연락이 닿지 않으면 몇 번까지 다시 시도하시나요?", options: ["1~2번", "3번", "4~5번", "6번 이상", "정해진 기준 없음"] },
    { id: "retry_where", type: "single", label: "시도한 횟수는 어디에 남기시나요?", options: ["행복이음에 적는 칸이 있다", "칸이 없어 남기지 않는다", "엑셀·수첩에 따로 적는다"] },
    { id: "input_time", type: "single", label: "한 가구 조사 결과를 입력하는 데 얼마나 걸리나요?", options: ["10분 미만", "10~30분", "30분~1시간", "1시간 넘게"] },
    { id: "input_fields", type: "single", label: "조사 결과 입력 화면의 칸 순서가 이와 비슷한가요?", preface: INPUT_GUESS, prefaceTitle: "저희가 추정한 입력 순서",
      options: ["거의 같다", "일부 다르다", "많이 다르다", "잘 모르겠다"], memoOn: ["일부 다르다", "많이 다르다"], memoPh: "어떻게 다른지 한 줄 (선택)" },
    { id: "progress_report", type: "single", label: "처리 현황 보고는 시스템에서 바로 뽑히나요?", options: ["바로 뽑힌다", "손으로 집계한다", "잘 모르겠다"] },
    { id: "netsep", type: "single", label: "이런 도구가 일반 인터넷 웹사이트로 만들어진다면, 업무 중에 열어 쓰실 수 있을까요?", hint: "행복이음을 쓰는 업무 PC는 보통 인터넷이 막혀 있어, 따로 인터넷 PC나 폰으로 열어야 합니다.", options: ["사무실 인터넷 PC로 열 수 있다", "폰으로만 열 수 있다", "둘 다 어렵다", "잘 모르겠다"] },
    { id: "rate", type: "rate", label: "이런 기능이 있다면 얼마나 도움이 될까요?", hint: "1 별로 · 5 아주 많이" },
    { id: "hardest", type: "single", label: "가장 손이 많이 가는 단계는 어디인가요?", options: ["명단 받기·나누기", "방문 순서·일정", "연락·재방문", "현장 조사", "결과 입력", "현황 보고", "연계·사후관리"] },
    { id: "wish", type: "text", label: "마지막으로, 바라는 점이 있다면 적어 주세요", hint: "없으시면 바로 보내셔도 됩니다." }
  ];
  var N = Q.length;

  var $ = function (id) { return document.getElementById(id); };
  var app = $("app"), top = $("top"), fill = $("barFill"), backBtn = $("backBtn");
  var actions = $("actions"), mainBtn = $("mainBtn"), skipBtn = $("skipBtn"), msg = $("msg");

  function store(fn) { try { return fn(); } catch (e) { return null; } }
  var A = store(function () { return JSON.parse(localStorage.getItem(C.draftKey) || "null"); }) || {};
  A.flow = A.flow || {}; A.flow_memo = A.flow_memo || {}; A.rate = A.rate || {};
  var page = -1; // -1 소개, 0..N-1 문항, N 감사
  var saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { store(function () { localStorage.setItem(C.draftKey, JSON.stringify(A)); }); }, 250); }
  function buzz() { try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) {} }

  /* ── 글꼴: 프리텐다드가 준비되면 «다음 화면 전환 때» 바꾼다(읽는 도중 글자가 바뀌어 출렁이지 않게) ── */
  var fontReady = false, fontOn = false;
  window.__pf = function () {
    if (!document.fonts || !document.fonts.load) return;
    var text = Q.map(function (q) { return q.label + (q.hint || "") + (q.options || []).join("") + (q.preface || []).join(""); }).join("")
      + FLOW.map(function (f) { return f[1]; }).join("") + RATE.map(function (r) { return r[1]; }).join("")
      + "위기가구 발굴 현장의 이야기를 듣고 싶습니다 시작하기 이어서 답하기 다음 건너뛰기 보내기 고맙습니다 0123456789";
    document.fonts.load('16px "Pretendard Variable"', text).then(function () { fontReady = true; if (page < 0 && performance.now() < 1500) applyFont(); }, function () {});
  };
  function applyFont() { if (fontReady && !fontOn) { fontOn = true; document.documentElement.classList.add("pf"); } }
  if (window.__pfCss) window.__pf();

  function token() {
    var t = store(function () { return localStorage.getItem(C.tokenKey); });
    if (!t) {
      var b = new Uint8Array(18);
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b);
      else for (var i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
      t = Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      store(function () { localStorage.setItem(C.tokenKey, t); });
    }
    return t;
  }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  var CHECK = '<svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function setOn(group, b) { Array.prototype.forEach.call(group.children, function (x) { var m = x === b; x.classList.toggle("on", m); x.setAttribute("aria-checked", String(m)); }); }

  /* ── 문항 본문 ── */
  var advTimer = 0;
  function optionList(q) {
    var multi = q.type === "multi";
    var list = el("div", { class: "opts", role: multi ? "group" : "radiogroup", "aria-labelledby": "qh" });
    var memo = null;
    if (q.memoOn) {
      memo = el("textarea", { class: "memo", rows: "2", maxlength: String(SHORT_MAX), placeholder: q.memoPh || "덧붙일 말 (선택)", "aria-label": q.memoPh || "덧붙일 말" });
      memo.value = A[q.id + "_memo"] || ""; memo.hidden = q.memoOn.indexOf(A[q.id]) < 0;
      memo.addEventListener("input", function () { A[q.id + "_memo"] = memo.value.slice(0, SHORT_MAX); save(); });
    }
    q.options.forEach(function (o) {
      var on = multi ? (A[q.id] || []).indexOf(o) >= 0 : A[q.id] === o;
      var b = el("button", { type: "button", class: "opt" + (on ? " on" : ""), role: multi ? "checkbox" : "radio", "aria-checked": String(on) },
        [el("span", { class: "opt-t", text: o }), el("span", { class: "mark" + (multi ? " sq" : ""), html: CHECK, "aria-hidden": "true" })]);
      b.addEventListener("click", function () {
        buzz();
        if (multi) {
          var now = !b.classList.contains("on");
          A[q.id] = (A[q.id] || []).filter(function (v) { return v !== o; });
          if (now) A[q.id].push(o);
          b.classList.toggle("on", now); b.setAttribute("aria-checked", String(now));
          save(); refreshActions(q); return;
        }
        A[q.id] = o; save(); setOn(list, b); refreshActions(q);
        clearTimeout(advTimer);
        if (memo && q.memoOn.indexOf(o) >= 0) { memo.hidden = false; return; } // 다르다고 고르면 메모 칸을 열고 머문다
        if (memo) { memo.hidden = true; delete A[q.id + "_memo"]; memo.value = ""; }
        advTimer = setTimeout(function () { go(page + 1); }, reduce ? 80 : 200);
      });
      list.appendChild(b);
    });
    var wrap = el("div", {}, [list, memo]);
    return wrap;
  }

  function prefaceBox(q) {
    var ol = el("ol", { class: "guess" });
    q.preface.forEach(function (t) { ol.appendChild(el("li", { text: t })); });
    return el("details", { class: "pref" }, [el("summary", {}, [el("span", { text: q.prefaceTitle }), el("span", { class: "pref-n", text: q.preface.length + "칸 보기" })]), ol]);
  }

  function flowList() {
    var list = el("ol", { class: "flow", "aria-labelledby": "qh" });
    FLOW.forEach(function (f, i) {
      var key = f[0], diff = A.flow[key] === "다르다";
      var memo = el("textarea", { class: "memo", rows: "2", maxlength: String(MEMO_MAX), placeholder: "실제로는 어떤지 한 줄 (선택)", "aria-label": (i + 1) + "단계 실제 모습" });
      memo.value = A.flow_memo[key] || ""; memo.hidden = !diff;
      memo.addEventListener("input", function () { A.flow_memo[key] = memo.value.slice(0, MEMO_MAX); save(); });
      var b = el("button", { type: "button", class: "step" + (diff ? " on" : ""), "aria-pressed": String(diff) }, [
        el("span", { class: "sn", text: String(i + 1) }),
        el("span", { class: "st", text: f[1] }),
        el("span", { class: "tag", text: "다름" })
      ]);
      b.addEventListener("click", function () {
        buzz();
        var now = !b.classList.contains("on");
        b.classList.toggle("on", now); b.setAttribute("aria-pressed", String(now));
        memo.hidden = !now;
        if (now) A.flow[key] = "다르다"; else delete A.flow[key];
        A.flow_mode = "pick"; save(); refreshActions(Q[page]);
      });
      list.appendChild(el("li", {}, [b, memo]));
    });
    return list;
  }

  function rateList() {
    var wrap = el("div", { class: "rates" });
    RATE.forEach(function (r) {
      var gid = "rt" + r[0];
      var row = el("div", { class: "seg", role: "radiogroup", "aria-labelledby": gid });
      [1, 2, 3, 4, 5].forEach(function (n) {
        var b = el("button", { type: "button", class: "dot5" + (A.rate[r[0]] === n ? " on" : ""), role: "radio", "aria-checked": String(A.rate[r[0]] === n), "aria-label": n + "점", text: String(n) });
        b.addEventListener("click", function () { buzz(); A.rate[r[0]] = n; save(); setOn(row, b); refreshActions(Q[page]); });
        row.appendChild(b);
      });
      wrap.appendChild(el("div", { class: "rate" }, [el("p", { id: gid, class: "rl", text: r[1] }), row]));
    });
    return wrap;
  }

  function textBox(q) {
    var ta = el("textarea", { class: "memo big", rows: "5", maxlength: String(TEXT_MAX), placeholder: "자유롭게 적어 주세요", "aria-labelledby": "qh" });
    ta.value = A[q.id] || "";
    ta.addEventListener("input", function () { A[q.id] = ta.value.slice(0, TEXT_MAX); save(); });
    return ta;
  }

  function answered(q) {
    if (q.type === "multi") return (A[q.id] || []).length > 0;
    if (q.type === "flow") return Object.keys(A.flow).length > 0;
    if (q.type === "rate") return Object.keys(A.rate).length > 0;
    if (q.type === "text") return !!(A[q.id] || "").trim();
    return !!A[q.id];
  }

  /* ── 아래 단추 줄: 한 번 만든 것을 재사용(전환마다 고정 층을 새로 만들지 않는다) ── */
  var onMain = null, onSkip = null;
  mainBtn.addEventListener("click", function (e) { if (onMain) onMain(e); });
  skipBtn.addEventListener("click", function () { if (onSkip) onSkip(); });
  function setActions(mainText, main, skip) {
    actions.hidden = false;
    mainBtn.disabled = false; mainBtn.textContent = mainText; onMain = main;
    onSkip = skip || null; skipBtn.hidden = !skip; msg.textContent = "";
  }
  function refreshActions(q) {
    if (page < 0 || page >= N) return;
    if (q.type === "flow") {
      var d = Object.keys(A.flow).filter(function (k) { return A.flow[k] === "다르다"; }).length;
      mainBtn.textContent = d ? "다음 · " + d + "곳 다름" : "모두 맞아요";
      return;
    }
    var last = page === N - 1;
    mainBtn.textContent = last ? "보내기" : "다음";
    skipBtn.hidden = !onSkip || answered(q) || last;
  }

  function flowNext() {
    var vals = Object.keys(A.flow).map(function (k) { return A.flow[k]; });
    var unsure = vals.length && vals.every(function (v) { return v === "모름"; });
    if (!unsure) FLOW.forEach(function (f) { if (A.flow[f[0]] !== "다르다") A.flow[f[0]] = "맞다"; }); // 다르다고 누르지 않은 단계 = 맞다
    A.flow_mode = "pick"; save(); go(page + 1);
  }

  function questionView(i) {
    var q = Q[i], last = i === N - 1, body, extra = null;
    if (q.type === "flow") body = flowList();
    else if (q.type === "rate") body = rateList();
    else if (q.type === "text") body = textBox(q);
    else body = optionList(q);

    if (q.type === "flow") {
      var missing = el("textarea", { class: "memo", rows: "2", maxlength: String(TEXT_MAX), placeholder: "예: 통장·이장 확인 단계가 먼저 있다", "aria-label": "빠진 단계" });
      missing.value = A.flow_missing || ""; missing.hidden = !A.flow_missing;
      missing.addEventListener("input", function () { A.flow_missing = missing.value.slice(0, TEXT_MAX); save(); });
      var more = el("button", { type: "button", class: "link", text: "빠진 단계가 있나요?" });
      more.addEventListener("click", function () { missing.hidden = false; more.hidden = true; missing.focus(); });
      more.hidden = !!A.flow_missing;
      var unsure = el("button", { type: "button", class: "link", text: "잘 모르겠어요" });
      unsure.addEventListener("click", function () { FLOW.forEach(function (f) { A.flow[f[0]] = "모름"; }); A.flow_memo = {}; A.flow_mode = "unsure"; save(); go(i + 1); });
      extra = el("div", { class: "flow-more" }, [more, unsure, missing]);
    }
    var head = el("div", { class: "qhead" }, [
      el("p", { class: "count" }, [el("b", { text: String(i + 1) }), el("span", { text: " / " + N })]),
      el("h1", { id: "qh", class: "qt", text: q.label }),
      q.hint ? el("p", { class: "hint", text: q.hint }) : null
    ]);
    setActions(last ? "보내기" : "다음",
      q.type === "flow" ? flowNext : last ? function () { submit(); } : function () { go(i + 1); },
      q.type === "flow" || last ? null : function () { go(i + 1); });
    refreshActions(q);
    return el("section", { class: "screen" }, [head, q.preface ? prefaceBox(q) : null, body, extra]);
  }

  /* ── 소개·감사 ── */
  function hasDraft() { return Object.keys(A).some(function (k) { var v = A[k]; return v && (typeof v !== "object" || Object.keys(v).length); }); }
  function firstOpen() { for (var i = 0; i < N; i++) if (!answered(Q[i])) return i; return N - 1; }
  function row(k, v) { return el("li", {}, [el("span", { class: "k", text: k }), el("span", { class: "v", text: v })]); }
  function intro() {
    var resume = hasDraft();
    setActions(resume ? "이어서 답하기" : "시작하기", function () { go(resume ? firstOpen() : 0); }, null);
    return el("section", { class: "screen intro" }, [
      el("p", { class: "kicker" }, [el("i", { class: "dot", "aria-hidden": "true" }), el("span", { text: "현장 설문" })]),
      el("h1", { class: "lead", html: "위기가구 발굴,<br>현장의 이야기를<br>듣고 싶습니다" }),
      el("p", { class: "body", text: "위기가구 발굴 업무를 돕는 도구를 생각하고 있습니다. 실제로 어떻게 일하시는지 알아야 쓸모 있게 만들 수 있어 몇 가지 여쭙니다." }),
      el("ul", { class: "facts" }, [row("걸리는 시간", "약 3분"), row("이름", "적지 않습니다"), row("문항", "언제든 건너뛸 수 있습니다")]),
      el("p", { class: "note", text: "개인정보나 대상자 정보는 적지 말아 주세요." })
    ]);
  }
  function thanks(already) {
    actions.hidden = true;
    return el("section", { class: "screen done" }, [
      el("div", { class: "seal", "aria-hidden": "true", html: '<svg viewBox="0 0 48 48" width="30" height="30"><path class="tick" d="M13 25l7.5 7.5L35 17" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
      el("h1", { class: "lead sm", text: already ? "이미 응답해 주셨어요" : "고맙습니다" }),
      el("p", { class: "body", text: already ? "이 기기에서 보내 주신 답이 이미 접수되어 있습니다." : "보내 주신 답은 도구를 현장에 맞게 다듬는 데만 쓰겠습니다." }),
      el("p", { class: "note", text: "이 창은 닫으셔도 됩니다." })
    ]);
  }

  /* ── 보내기 ── */
  var PII = /(01[016789][-\s.]?\d{3,4}[-\s.]?\d{4})|(\d{6}[-\s]?[1-4]\d{6})/; // 휴대전화·주민번호 모양은 보내지 않는다
  function hasPII() {
    var texts = [];
    Object.keys(A).forEach(function (k) { if (typeof A[k] === "string") texts.push(A[k]); });
    Object.keys(A.flow_memo).forEach(function (k) { texts.push(A.flow_memo[k]); });
    return texts.some(function (t) { return PII.test(t); });
  }
  function submit() {
    msg.textContent = "";
    if (hasPII()) { msg.textContent = "전화번호·주민번호처럼 보이는 숫자가 있습니다. 지운 뒤 다시 보내 주세요."; return; }
    mainBtn.disabled = true; mainBtn.textContent = "보내는 중…";
    var body = { form_version: C.formVersion, client_token: token(), answers: A };
    fetch(C.url + "/rest/v1/" + C.table, {
      method: "POST",
      headers: { apikey: C.key, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (r.status === 201 || r.status === 409) {
        clearTimeout(saveT);
        store(function () { localStorage.setItem(C.doneKey, new Date().toISOString()); localStorage.removeItem(C.draftKey); });
        page = N; render(r.status === 409); return;
      }
      throw new Error("HTTP " + r.status);
    }).catch(function (e) {
      mainBtn.disabled = false; mainBtn.textContent = "다시 보내기";
      msg.textContent = "보내지 못했습니다(" + e.message + "). 잠시 뒤 다시 눌러 주세요. 답은 그대로 남아 있습니다.";
    });
  }

  /* ── 화면 전환 ── 안드로이드 뒤로 단추(카톡 인앱 포함)가 창을 닫지 않고 이전 문항으로 가게 history 를 쓴다 */
  function progress() {
    var inQ = page >= 0 && page < N;
    top.hidden = !inQ;
    var p = inQ ? (page + 1) / N : page >= N ? 1 : 0;
    fill.style.transform = "scaleX(" + p + ")";
    fill.parentNode.setAttribute("aria-valuenow", String(Math.round(p * 100)));
  }
  function render(already) {
    clearTimeout(advTimer);
    applyFont();
    progress();
    var node = page < 0 ? intro() : page >= N ? thanks(already) : questionView(page);
    if (!reduce) node.classList.add("enter");
    app.replaceChildren ? app.replaceChildren(node) : (app.textContent = "", app.appendChild(node));
  }
  function go(p) {
    page = Math.max(-1, Math.min(N, p));
    try { history.pushState({ p: page }, ""); } catch (e) {}
    render(); window.scrollTo(0, 0); app.focus({ preventScroll: true });
  }
  window.addEventListener("popstate", function (e) {
    if (page >= N) return;
    page = e.state && typeof e.state.p === "number" ? e.state.p : -1;
    render(); window.scrollTo(0, 0);
  });
  backBtn.addEventListener("click", function () { history.back(); });

  try { history.replaceState({ p: -1 }, ""); } catch (e) {}
  if (store(function () { return localStorage.getItem(C.doneKey); })) { page = N; render(true); }
  else render();
})();
