/* 닿음 현장 확인 설문 — 복지 담당자가 폰에서 5분 안에 답한다. 이름·개인정보는 받지 않는다.
   저장: 닿음 Supabase field_survey(anon=넣기만). 한 기기 한 번(무작위 토큰 + 로컬 표시, 서버 unique).
   조회: 01_리서치/현장설문/read_survey.js — 문항 id 를 바꾸면 그쪽 LABELS 도 함께 고친다. */
(function () {
  "use strict";
  var C = window.SURVEY_CONFIG || {};
  var MEMO_MAX = 300, TEXT_MAX = 500;

  var S = function (id, label, options, extra) { return Object.assign({ id: id, type: "single", label: label, options: options }, extra || {}); };
  var M = function (id, label, options, extra) { return Object.assign({ id: id, type: "multi", label: label, options: options }, extra || {}); };
  var T = function (id, label, hint) { return { id: id, type: "text", label: label, hint: hint }; };

  // 우리가 이해한 발굴 과정(01_리서치/현행_위기가구_발굴절차.md · 정보원_명단_형태.md 바탕, 2026-10-29)
  var FLOW = [
    ["f1", "사회보장정보원이 격월(연 5~6회) 단전·단수·체납 등 위기정보(약 50종)를 모아 위기 가능성이 높은 명단을 만든다"],
    ["f2", "명단은 복지부(정보원 시스템) → 시군구를 거쳐 읍면동에 통보된다"],
    ["f3", "읍면동에서 담당자별로 조사할 가구를 나눈다"],
    ["f4", "방문 전에 전화·AI 초기상담 등으로 먼저 확인한다"],
    ["f5", "가정을 방문해 실제 위기 여부를 조사한다"],
    ["f6", "조사 결과를 정해진 기한 안에 행복이음에 입력한다"],
    ["f7", "필요한 공공·민간 서비스를 연계하거나 신청을 돕는다"],
    ["f8", "연계 뒤 다시 확인하며 사후관리한다"]
  ];

  var RATE = [
    ["route", "하루 방문 동선을 한 장(지도·순서)으로 정리"],
    ["retry", "연락 시도 이력을 남기면 다음 시도 일정을 자동 제안"],
    ["link", "연계 누락·미신청 가구를 알림으로 표시"],
    ["draft", "행복이음 입력 순서대로 정리한 초안을 복사"]
  ];

  var SECTIONS = [
    { title: "응답자", items: [
      S("workplace", "근무처", ["시군구(시청) 복지 부서", "읍면동 행정복지센터", "기타"]),
      S("career", "복지 업무 경력", ["1년 미만", "1~3년", "3~5년", "5년 이상"]),
      M("duty", "맡은 일 (여러 개 고르기)", ["통합사례관리", "맞춤형복지(찾아가는 보건복지)", "기초생활보장", "기타"], { memo: "기타라면 무엇인지" })
    ]},
    { title: "우리가 이해한 발굴 과정", desc: "저희가 공개 자료로 정리한 순서입니다. 실제와 맞는지 단계마다 골라 주세요.", items: [
      { id: "flow", type: "flow" },
      T("flow_missing", "빠진 단계나 실제 순서가 있다면 적어 주세요 (선택)", "예: 3과 4 순서가 반대, 통장·이장 확인 단계가 있음")
    ]},
    { title: "명단 받기", items: [
      S("list_route", "정보원 발굴 명단은 어떻게 받나요?", ["시군구가 행복이음으로 읍면동에 통보", "공문·메일 등 다른 경로", "둘 다", "모름"], { memo: "다른 경로라면 무엇인지" }),
      S("list_export", "명단 화면에 엑셀 저장·출력 버튼이 있나요?", ["있다", "없다", "모름"]),
      S("list_score", "명단에 점수·순위·우선순위가 표시되나요?", ["있다", "없다", "모름"], { memo: "있다면 어떤 형태인지" }),
      S("list_count", "한 차수에 내 몫은 대략 몇 건인가요?", ["10건 미만", "10~30건", "30~50건", "50~100건", "100건 이상", "모름"])
    ]},
    { title: "방문 전", items: [
      M("plan_method", "방문 순서·일정은 무엇으로 정하나요? (여러 개)", ["행복이음 화면", "엑셀", "수첩·종이", "지도 앱(네이버·카카오 등)", "동료·통장과 상의", "기타"], { memo: "덧붙일 말" }),
      S("mobile_feature", "모바일 행복이음(또는 업무폰)에 일정·지도 기능이 있나요?", ["일정·지도 둘 다 있다", "일정만 있다", "지도만 있다", "둘 다 없다", "안 쓴다·모름"]),
      M("device", "현장에서 쓰는 기기 (여러 개)", ["업무폰", "개인폰", "태블릿", "종이"])
    ]},
    { title: "방문·연락", items: [
      S("visits_day", "하루에 방문하는 가구 수", ["1~3곳", "4~6곳", "7~10곳", "10곳 넘게"]),
      S("miss_rate", "허탕(부재·비대상) 비율은 체감상 어느 정도인가요?", ["10% 미만", "10~30%", "30~50%", "50% 넘게"]),
      S("retry_count", "연락이 안 되면 몇 번까지 다시 시도하나요?", ["1~2번", "3번", "4~5번", "6번 이상", "정해진 기준 없음"]),
      S("retry_where", "시도 횟수는 어디에 적나요?", ["행복이음에 시도 칸이 있다", "칸이 없어 안 적는다", "따로 적는다(엑셀·수첩)"], { memo: "덧붙일 말" })
    ]},
    { title: "조사 후", items: [
      T("input_fields", "조사 결과 입력 칸과 기한은 어떻게 되나요?", "예: 대상 여부·위기 유형·조치 내용, 통보 후 ○주 안"),
      S("input_time", "한 가구 결과 입력에 걸리는 시간", ["10분 미만", "10~30분", "30분~1시간", "1시간 넘게"]),
      S("progress_report", "진도(처리 현황) 보고를 시스템에서 자동으로 뽑을 수 있나요?", ["된다", "안 된다(손으로 집계)", "모름"]),
      S("case_areas", "사례관리 상담 기록 영역은 10영역이 맞나요?", ["맞다", "다르다", "모름"], { memo: "다르다면 몇 영역·무엇인지" })
    ]},
    { title: "망분리", items: [
      S("netsep", "행정망 PC 말고 인터넷 PC나 폰으로 외부 웹 도구를 쓸 수 있나요?", ["인터넷 PC로 쓸 수 있다", "폰으로만 쓸 수 있다", "둘 다 어렵다", "모름"], { memo: "덧붙일 말" })
    ]},
    { title: "도움 정도", desc: "이런 기능이 있다면 얼마나 도움이 될까요? (1 전혀 아님 ~ 5 매우 큼)", items: [
      { id: "rate", type: "rate" },
      S("hardest", "가장 힘든 단계 하나", ["명단 받기·나누기", "방문 순서·일정", "연락·재방문", "현장 조사", "결과 입력", "진도 보고", "연계·사후관리"]),
      T("wish", "바라는 점 (선택)", "자유롭게 적어 주세요")
    ]}
  ];

  var app = document.getElementById("app");
  var fill = document.getElementById("barFill");
  var stepTxt = document.getElementById("stepTxt");
  var A = { flow: {}, flow_memo: {}, rate: {} };
  var page = -1; // -1 소개, 0..n-1 구역, n 감사

  function store(fn) { try { return fn(); } catch (e) { return null; } }
  function token() {
    var t = store(function () { return localStorage.getItem(C.tokenKey); });
    if (!t) {
      var b = new Uint8Array(18); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach(function (_, i) { b[i] = Math.random() * 256; });
      t = Array.prototype.map.call(b, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      store(function () { localStorage.setItem(C.tokenKey, t); });
    }
    return t;
  }
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  var uid = 0;
  function memoBox(key, ph, bag) {
    var id = "m" + (++uid);
    var ta = el("textarea", { id: id, rows: "2", maxlength: String(MEMO_MAX), placeholder: ph || "메모 (선택)", "aria-label": ph || "메모" });
    ta.value = (bag || A)[key] || "";
    ta.addEventListener("input", function () { (bag || A)[key] = ta.value.slice(0, MEMO_MAX); });
    return ta;
  }
  function choice(q, opt, multi) {
    var name = "q_" + q.id;
    var input = el("input", { type: multi ? "checkbox" : "radio", name: name, value: opt });
    var cur = A[q.id];
    input.checked = multi ? (cur || []).indexOf(opt) >= 0 : cur === opt;
    input.addEventListener("change", function () {
      if (multi) {
        var arr = (A[q.id] || []).filter(function (v) { return v !== opt; });
        if (input.checked) arr.push(opt);
        A[q.id] = arr;
      } else A[q.id] = opt;
    });
    return el("label", { class: "opt" }, [input, el("span", { text: opt })]);
  }
  function question(q) {
    if (q.type === "flow") return flowBlock();
    if (q.type === "rate") return rateBlock();
    var gid = "g" + (++uid);
    var box = el("fieldset", { class: "q" }, [el("legend", { id: gid, text: q.label })]);
    if (q.type === "text") {
      var ta = el("textarea", { rows: "3", maxlength: String(TEXT_MAX), placeholder: q.hint || "", "aria-labelledby": gid });
      ta.value = A[q.id] || "";
      ta.addEventListener("input", function () { A[q.id] = ta.value.slice(0, TEXT_MAX); });
      box.appendChild(ta);
      return box;
    }
    var list = el("div", { class: "opts" });
    q.options.forEach(function (o) { list.appendChild(choice(q, o, q.type === "multi")); });
    box.appendChild(list);
    if (q.memo) box.appendChild(memoBox(q.id + "_memo", q.memo + " (선택)"));
    return box;
  }
  function flowBlock() {
    var wrap = el("ol", { class: "flow" });
    FLOW.forEach(function (f, i) {
      var key = f[0];
      var memo = memoBox(key, "실제로는 어떻게 다른지 한 줄", A.flow_memo);
      memo.hidden = A.flow[key] !== "다르다";
      var gid = "fl" + key;
      var opts = el("div", { class: "seg", role: "radiogroup", "aria-labelledby": gid });
      ["맞다", "다르다", "모름"].forEach(function (v) {
        var inp = el("input", { type: "radio", name: "flow_" + key, value: v });
        inp.checked = A.flow[key] === v;
        inp.addEventListener("change", function () {
          A.flow[key] = v; memo.hidden = v !== "다르다";
          if (v === "다르다") memo.focus();
        });
        opts.appendChild(el("label", { class: "opt sm" }, [inp, el("span", { text: v })]));
      });
      wrap.appendChild(el("li", { class: "q" }, [
        el("p", { id: gid, class: "fl" }, [el("b", { class: "num", text: String(i + 1) }), el("span", { text: f[1] })]),
        opts, memo
      ]));
    });
    return wrap;
  }
  function rateBlock() {
    var wrap = el("div");
    RATE.forEach(function (r) {
      var gid = "rt" + r[0];
      var row = el("div", { class: "seg five", role: "radiogroup", "aria-labelledby": gid });
      [1, 2, 3, 4, 5].forEach(function (n) {
        var inp = el("input", { type: "radio", name: "rate_" + r[0], value: String(n), "aria-label": n + "점" });
        inp.checked = A.rate[r[0]] === n;
        inp.addEventListener("change", function () { A.rate[r[0]] = n; });
        row.appendChild(el("label", { class: "opt sm" }, [inp, el("span", { class: "num", text: String(n) })]));
      });
      wrap.appendChild(el("fieldset", { class: "q" }, [el("legend", { id: gid, text: r[1] }), row, el("p", { class: "scale", text: "1 전혀 아님 · 5 매우 큼" })]));
    });
    return wrap;
  }

  // 개인정보로 보이는 숫자(휴대전화·주민번호)는 보내지 않는다
  var PII = /(01[016789][-\s.]?\d{3,4}[-\s.]?\d{4})|(\d{6}[-\s]?[1-4]\d{6})/;
  function hasPII() {
    var texts = [];
    Object.keys(A).forEach(function (k) { if (typeof A[k] === "string") texts.push(A[k]); });
    Object.keys(A.flow_memo).forEach(function (k) { texts.push(A.flow_memo[k]); });
    return texts.some(function (t) { return PII.test(t); });
  }

  function progress() {
    var n = SECTIONS.length, p = page < 0 ? 0 : page >= n ? 100 : Math.round((page / n) * 100);
    fill.style.width = p + "%";
    fill.parentNode.setAttribute("aria-valuenow", String(p));
    stepTxt.textContent = page < 0 ? "약 5분 · 이름 불필요" : page >= n ? "응답 완료" : (page + 1) + " / " + n + " · " + SECTIONS[page].title;
  }
  function nav(kids) { return el("div", { class: "nav" }, kids); }
  function btn(text, onclick, cls) { return el("button", { type: "button", class: "btn " + (cls || ""), onclick: onclick, text: text }); }
  function go(p) { page = p; render(); app.focus(); window.scrollTo(0, 0); }

  function intro() {
    return [el("section", { class: "card hero" }, [
      el("h1", { text: "현장 확인 설문" }),
      el("p", { text: "상주시청 직원이 사회보장 데이터 활용 공모에 낼 «위기가구 발굴 업무 도우미»를 만들고 있습니다." }),
      el("p", { text: "현장과 동떨어지지 않도록 실제 업무 방식을 여쭙니다. 5분이면 되고, 이름은 적지 않으셔도 됩니다." }),
      el("p", { class: "warn", text: "개인정보·대상자 명단·내부 문서 내용은 적지 말아 주세요." })
    ]), nav([btn("시작하기", function () { go(0); }, "main")])];
  }
  function sectionView(i) {
    var s = SECTIONS[i];
    var card = el("section", { class: "card" }, [el("h2", { text: s.title }), s.desc ? el("p", { class: "desc", text: s.desc }) : null]);
    s.items.forEach(function (q) { card.appendChild(question(q)); });
    var last = i === SECTIONS.length - 1;
    var msg = el("p", { class: "msg", role: "alert" });
    return [card, msg, nav([
      btn("이전", function () { go(i - 1); }, "ghost"),
      btn(last ? "제출하기" : "다음", function (e) { last ? submit(e.currentTarget, msg) : go(i + 1); }, "main")
    ])];
  }
  function thanks(already) {
    return [el("section", { class: "card hero done" }, [
      el("div", { class: "check", "aria-hidden": "true", text: "✓" }),
      el("h1", { text: already ? "이미 응답하셨습니다" : "감사합니다" }),
      el("p", { text: already ? "이 기기에서는 응답이 이미 접수되었습니다. 시간 내 주셔서 고맙습니다." : "보내 주신 답은 시제품을 현장에 맞게 고치는 데만 씁니다." }),
      el("p", { class: "desc", text: "이 창은 닫으셔도 됩니다." })
    ])];
  }

  function submit(button, msg) {
    msg.textContent = "";
    if (hasPII()) { msg.textContent = "전화번호·주민번호처럼 보이는 숫자가 있습니다. 지운 뒤 다시 제출해 주세요."; return; }
    button.disabled = true; button.textContent = "보내는 중…";
    var body = { form_version: C.formVersion, client_token: token(), answers: A };
    fetch(C.url + "/rest/v1/" + C.table, {
      method: "POST",
      headers: { apikey: C.key, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (r.status === 201 || r.status === 409) {
        store(function () { localStorage.setItem(C.doneKey, new Date().toISOString()); });
        page = SECTIONS.length; render(r.status === 409);
        return;
      }
      throw new Error("HTTP " + r.status);
    }).catch(function (e) {
      button.disabled = false; button.textContent = "다시 제출하기";
      msg.textContent = "보내지 못했습니다(" + e.message + "). 잠시 뒤 다시 눌러 주세요. 답한 내용은 그대로 남아 있습니다.";
    });
  }

  function render(already) {
    progress();
    app.innerHTML = "";
    var nodes = page < 0 ? intro() : page >= SECTIONS.length ? thanks(already) : sectionView(page);
    nodes.forEach(function (n) { if (n) app.appendChild(n); });
  }

  if (store(function () { return localStorage.getItem(C.doneKey); })) { page = SECTIONS.length; render(true); }
  else render();
})();
