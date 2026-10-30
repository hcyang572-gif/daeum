/* 현장 설문 v3.1(10-30) — 첫 화면 한 화면 고정(html.lock)·«개인적 관심» 톤, 제품 이름·그림 뺌. v3: 시작 화면에 «닿음이 무엇인지» 그림 한 줄, 문항마다 «왜 묻나요»(why)·답하는 법(hint), 기능 판단 2화면(feat_a·feat_b → answers.feat). 이하 v2 설명:
   위기가구 발굴 현장 설문 v2 — 한 화면 한 문항, 모두 건너뛸 수 있고, 하나만 고르는 문항은 고르면 바로 다음으로 넘어간다. 이름·개인정보는 받지 않는다.
   저장: 닿음 Supabase field_survey(anon=넣기만). 제출마다 새 토큰(서버 unique) — 10-30부터 같은 기기도 다시 응답 가능(중복은 집계 때 판단). 컬럼은 v1 그대로, 답은 answers(JSON) 안에.
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

  // v3(10-30): 오늘 넣기로 한 기능 중 «현장이 실제로 쓸지» 판단이 필요한 것만 — 답 이름 A.feat[key] = 쓸 것 같다/아니다/모르겠다
  var FEAT_A = [
    ["heat", "폭염·한파 특보 날, 혼자 사는 어르신 집부터 방문 순서", "특보가 뜨면 그날 목록 맨 위로"],
    ["oldhouse", "지은 지 오래된 집 표시", "난방·누수 걱정이 큰 집을 미리 알아보기"],
    ["clinic", "방문 가구 가까운 병원·약국 보기", "현장에서 바로 안내하실 때"],
    ["sensor", "AI 스피커·센서가 한동안 반응 없을 때 알림", "설치된 집만, 먼저 연락할 집으로"],
    ["post", "우체국 집배원 안부살핌 의뢰", "연락이 안 닿는 집 확인을 맡기기"],
    ["calendar", "방문 일정을 폰 달력으로 내보내기", "업무폰 달력에 바로 들어가게"]
  ];
  var FEAT_B = [
    ["risk_area", "읍면동별 고독사 위험도 한눈에", "우리 읍면동이 다른 곳과 견주어 어느 정도인지"],
    ["msg", "방문 안내 알림톡 문구 미리 보기", "보내기 전에 주민이 받을 글 확인"],
    ["report", "보고서를 한글·엑셀(수식 그대로)로 내려받기", "정부 보고서 서식 그대로, 숫자만 고쳐 쓰기"],
    ["ai_ok", "AI가 추천한 연계 서비스에 «맞아요/아니에요» 누르기", "추천이 맞는지 현장 판단을 한 번에 남기기"]
  ];
  var FEAT_OPTS = ["쓸 것 같다", "아니다", "모르겠다"];

  // why = 왜 묻는지(v3.1: 제품 홍보 말투 없이 «궁금해서요» 톤) · hint = 어떻게 답하면 되는지(예시 한 줄)
  var Q = [
    { id: "flow", type: "flow", label: "위기가구 발굴 및 관리업무 절차 순서가 맞는지 확인해주세요.",
      hint: "실제와 다른 단계만 눌러 주세요. 모두 맞으면 «모두 맞아요».", why: "실제 흐름을 제대로 알고 싶어서요." },
    { id: "list_count", type: "single", label: "격월로 내려오는 명단에서, 한 번에 맡는 가구는 대략 몇 곳인가요?",
      hint: "예: 지난 차수에 25가구를 맡으셨다면 «10~30건».", why: "맡는 일의 양을 가늠해 보려고요.",
      options: ["10건 미만", "10~30건", "30~50건", "50~100건", "100건 이상", "잘 모르겠다"] },
    { id: "list_export", type: "single", label: "행복이음의 발굴 대상자 명단을 엑셀로 내려받을 수 있나요?",
      why: "명단을 다른 데서 다루기 쉬운지 궁금해서요.", options: ["있다", "없다", "잘 모르겠다"] },
    { id: "list_score", type: "single", label: "그 명단에 위험도 점수나 순위가 함께 나오나요?",
      why: "이미 있는지 알고 싶어서요.", options: ["있다", "없다", "잘 모르겠다"] },
    { id: "plan_method", type: "multi", label: "방문 순서·일정은 지금 무엇으로 정하시나요?",
      hint: "해당하는 것을 모두 골라 주세요.", why: "지금 쓰시는 방식이 궁금해서요.",
      options: ["행복이음 화면", "엑셀", "수첩·종이", "지도 앱", "동료·통장과 상의", "기타"] },
    { id: "mobile_feature", type: "single", label: "모바일 행복이음(또는 업무폰)에 방문 일정이나 지도 기능이 있나요?",
      why: "이미 있는 것과 겹치지 않게 보려고요.",
      options: ["일정·지도 둘 다 있다", "일정만 있다", "지도만 있다", "둘 다 없다", "안 쓴다·잘 모르겠다"] },
    { id: "visits_day", type: "single", label: "방문 나가는 날, 하루에 몇 가구쯤 도시나요?",
      hint: "예: 보통 5곳이면 «4~6곳».", why: "하루 일의 양을 가늠해 보려고요.", options: ["1~3곳", "4~6곳", "7~10곳", "10곳 넘게"] },
    { id: "miss_rate", type: "single", label: "가 보면 안 계시거나 대상이 아닌 집은 열 집 중 몇 집쯤인가요?",
      hint: "체감으로 골라 주세요. 예: 열 집 중 두 집이면 «10~30%».", why: "헛걸음이 얼마나 되는지 궁금해서요.",
      options: ["10% 미만", "10~30%", "30~50%", "절반 넘게"] },
    { id: "retry_count", type: "single", label: "연락이 닿지 않으면 몇 번까지 다시 시도하시나요?",
      why: "다시 연락하는 기준이 있는지 궁금해서요.", options: ["1~2번", "3번", "4~5번", "6번 이상", "정해진 기준 없음"] },
    { id: "retry_where", type: "single", label: "몇 번 연락·방문했는지는 어디에 남기시나요?",
      why: "기록이 어디에 남는지 궁금해서요.", options: ["행복이음에 적는 칸이 있다", "칸이 없어 남기지 않는다", "엑셀·수첩에 따로 적는다"] },
    { id: "input_time", type: "single", label: "한 가구 조사 결과를 행복이음에 입력하는 데 얼마나 걸리나요?",
      why: "기록 일이 얼마나 걸리는지 알고 싶어서요.", options: ["10분 미만", "10~30분", "30분~1시간", "1시간 넘게"] },
    { id: "input_fields", type: "single", label: "조사 결과 입력 화면의 칸 순서가 이와 비슷한가요?", preface: INPUT_GUESS, prefaceTitle: "저희가 짐작한 입력 순서",
      hint: "«12칸 보기»를 눌러 보고 골라 주세요.", why: "짐작한 순서가 맞는지 보려고요.",
      options: ["거의 같다", "일부 다르다", "많이 다르다", "잘 모르겠다"], memoOn: ["일부 다르다", "많이 다르다"], memoPh: "어떻게 다른지 한 줄 (선택)" },
    { id: "progress_report", type: "single", label: "몇 가구 방문·완료했는지 위에 보고할 때, 시스템에서 바로 뽑히나요?",
      why: "보고를 손으로 하시는지 궁금해서요.", options: ["바로 뽑힌다", "손으로 집계한다", "잘 모르겠다"] },
    { id: "netsep", type: "single", label: "이런 도구가 일반 인터넷 웹사이트라면, 업무 중에 열어 쓰실 수 있을까요?",
      hint: "행복이음 업무 PC는 보통 인터넷이 막혀 있어, 따로 인터넷 PC나 폰으로 열어야 합니다.", why: "어떤 환경에서 쓸 수 있을지 궁금해서요.",
      options: ["사무실 인터넷 PC로 열 수 있다", "폰으로만 열 수 있다", "둘 다 어렵다", "잘 모르겠다"] },
    { id: "rate", type: "rate", label: "이런 게 있으면 도움이 될까요?",
      hint: "1 별로 · 5 아주 많이. 아는 것만 눌러 주세요.", why: "어떤 게 쓸모 있을지 가늠해 보려고요." },
    { id: "feat_a", type: "feat", items: FEAT_A, label: "이런 게 있으면 쓸 것 같으세요? (방문·현장)",
      hint: "하나씩 «쓸 것 같다 / 아니다 / 모르겠다»로 골라 주세요.", why: "현장에 쓸모 있는 것만 추려 보려고요." },
    { id: "feat_b", type: "feat", items: FEAT_B, label: "이런 게 있으면 쓸 것 같으세요? (기록·보고)",
      hint: "하나씩 골라 주세요. 모르는 건 건너뛰셔도 됩니다.", why: "현장에 쓸모 있는 것만 추려 보려고요." },
    { id: "hardest", type: "single", label: "가장 손이 많이 가는 단계는 어디인가요?",
      why: "가장 힘든 곳이 어디인지 알고 싶어서요.",
      options: ["명단 받기·나누기", "방문 순서·일정", "연락·재방문", "현장 조사", "결과 입력", "현황 보고", "연계·사후관리"] },
    { id: "wish", type: "text", label: "마지막으로, 현장 일에서 이것만은 덜고 싶다는 것이 있다면 적어 주세요",
      hint: "예: 같은 내용을 두 번 적는 일. 없으시면 바로 보내셔도 됩니다." }
  ];
  var N = Q.length;
  var INTRO_BODY = "개인적인 관심으로 알아보고 있습니다. 평소 일하시는 방식을 몇 가지 여쭙니다.";
  var INTRO_TEXT = "현장 설문 현장 복지 업무, 덜 수 있는 방법이 있을까요? 약 4분 이름 없이 건너뛰어도 됩니다 " + INTRO_BODY;

  var $ = function (id) { return document.getElementById(id); };
  var app = $("app"), top = $("top"), fill = $("barFill"), backBtn = $("backBtn");
  var actions = $("actions"), mainBtn = $("mainBtn"), skipBtn = $("skipBtn"), msg = $("msg");

  function store(fn) { try { return fn(); } catch (e) { return null; } }
  var A = store(function () { return JSON.parse(localStorage.getItem(C.draftKey) || "null"); }) || {};
  A.flow = A.flow || {}; A.flow_memo = A.flow_memo || {}; A.rate = A.rate || {}; A.feat = A.feat || {};
  var page = -1; // -1 소개, 0..N-1 문항, N 감사
  var saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { store(function () { localStorage.setItem(C.draftKey, JSON.stringify(A)); }); }, 250); }
  function buzz() { try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) {} }

  /* ── 글꼴: 프리텐다드가 준비되면 «다음 화면 전환 때» 바꾼다(읽는 도중 글자가 바뀌어 출렁이지 않게) ── */
  var fontReady = false, fontOn = false;
  window.__pf = function () {
    if (!document.fonts || !document.fonts.load) return;
    var text = Q.map(function (q) { return q.label + (q.hint || "") + (q.why || "") + (q.options || []).join("") + (q.preface || []).join(""); }).join("")
      + FEAT_A.concat(FEAT_B).map(function (f) { return f[1] + f[2]; }).join("") + FEAT_OPTS.join("") + INTRO_TEXT
      + FLOW.map(function (f) { return f[1]; }).join("") + RATE.map(function (r) { return r[1]; }).join("")
      + "왜 묻나요 시작하기 이어서 답하기 다음 건너뛰기 보내기 고맙습니다 0123456789";
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

  function featList(q) {
    var wrap = el("div", { class: "feats" });
    q.items.forEach(function (f) {
      var gid = "ft" + f[0];
      var row = el("div", { class: "seg3", role: "radiogroup", "aria-labelledby": gid });
      FEAT_OPTS.forEach(function (o) {
        var on = A.feat[f[0]] === o;
        var b = el("button", { type: "button", class: "pick" + (on ? " on" : ""), role: "radio", "aria-checked": String(on), text: o });
        b.addEventListener("click", function () { buzz(); A.feat[f[0]] = o; save(); setOn(row, b); refreshActions(Q[page]); });
        row.appendChild(b);
      });
      wrap.appendChild(el("div", { class: "feat" }, [
        el("p", { id: gid, class: "fl", text: f[1] }), el("p", { class: "fe", text: f[2] }), row]));
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
    if (q.type === "feat") return q.items.some(function (f) { return !!A.feat[f[0]]; });
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
    padForActions();
  }
  // 아래 버튼 줄 높이만큼만 비운다 — 고정 150px이면 버튼이 하나인 소개 화면이 빈 칸으로 조금씩 밀려 올라간다
  function padForActions() {
    app.style.paddingBottom = actions.hidden ? "" : (actions.offsetHeight + 16) + "px";
  }
  window.addEventListener("resize", padForActions);
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
    else if (q.type === "feat") body = featList(q);
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
      q.hint ? el("p", { class: "hint", text: q.hint }) : null,
      q.why ? el("p", { class: "why" }, [el("b", { text: "왜 묻나요" }), el("span", { text: q.why })]) : null
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
      el("h1", { class: "lead", html: "현장 복지 업무,<br>덜 수 있는 방법이<br>있을까요?" }),
      el("p", { class: "body", text: INTRO_BODY }),
      el("p", { class: "chips" }, [el("span", { text: "약 4분" }), el("span", { text: "이름 없이" }), el("span", { text: "건너뛰어도 됩니다" })]),
      el("p", { class: "note", text: "개인정보나 대상자 정보는 적지 말아 주세요." })
    ]);
  }
  function thanks(already) {
    actions.hidden = true; padForActions();
    return el("section", { class: "screen done" }, [
      el("div", { class: "seal", "aria-hidden": "true", html: '<svg viewBox="0 0 48 48" width="30" height="30"><path class="tick" d="M13 25l7.5 7.5L35 17" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
      el("h1", { class: "lead sm", text: already ? "이미 응답해 주셨어요" : "고맙습니다" }),
      el("p", { class: "body", text: already ? "이 기기에서 보내 주신 답이 이미 접수되어 있습니다." : "보내 주신 답은 이 궁리에만 쓰겠습니다." }),
      el("button", { type: "button", class: "btn main close", text: "창 닫기", onclick: closeWin }),
      el("p", { class: "note", id: "closeNote", text: "" })
    ]);
  }
  // 카톡 안 브라우저는 전용 주소로 닫고, 그 밖에는 window.close — 브라우저가 막으면 닫는 법을 알려 준다
  function closeWin() {
    if (/KAKAOTALK/i.test(navigator.userAgent)) { location.href = "kakaotalk://inappbrowser/close"; return; }
    try { window.close(); } catch (e) {}
    setTimeout(function () {
      var n = $("closeNote");
      if (n && !window.closed) n.textContent = "이 브라우저는 직접 닫아야 합니다. 화면 위 × 또는 탭 닫기를 눌러 주세요.";
    }, 300);
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
        // 10-30 호창님: 응답한 뒤에도 다시 들어와 새로 답할 수 있게 — 토큰을 버려 다음 제출은 새 행이 된다
        store(function () { localStorage.removeItem(C.tokenKey); localStorage.removeItem(C.doneKey); localStorage.removeItem(C.draftKey); });
        A = { flow: {}, flow_memo: {}, rate: {}, feat: {} };
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
    document.documentElement.classList.toggle("lock", page < 0);
    var node = page < 0 ? intro() : page >= N ? thanks(already) : questionView(page);
    if (!reduce) node.classList.add("enter");
    app.replaceChildren ? app.replaceChildren(node) : (app.textContent = "", app.appendChild(node));
  }
  function go(p) {
    page = Math.max(-1, Math.min(N, p));
    try { history.pushState({ p: page }, ""); } catch (e) {}
    render(); if (window.scrollY) window.scrollTo(0, 0); app.focus({ preventScroll: true });
  }
  window.addEventListener("popstate", function (e) {
    if (page >= N) return;
    page = e.state && typeof e.state.p === "number" ? e.state.p : -1;
    render(); if (window.scrollY) window.scrollTo(0, 0);
  });
  backBtn.addEventListener("click", function () { history.back(); });

  try { history.replaceState({ p: -1 }, ""); } catch (e) {}
  // 예전에 «이미 응답» 표시가 남은 기기도 처음부터 다시 열리게 표시·토큰을 지운다
  if (store(function () { return localStorage.getItem(C.doneKey); })) {
    store(function () { localStorage.removeItem(C.doneKey); localStorage.removeItem(C.tokenKey); });
  }
  render();
})();
