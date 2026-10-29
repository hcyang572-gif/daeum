/* 닿음 국민 창구 — ① 상황 말하기 → ② 서비스 카드 → ③ 도움 요청 → ④ 접수 */
(function () {
  "use strict";
  var C = window.DAEUM_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var S = { proxy: false, relation: "", chips: {}, catalog: null, result: null, input: null };

  var EXAMPLES = [
    { title: "혼자 사는 80대 어르신", proxy: false, text: "82살이고 혼자 살아요. 무릎이 아파서 병원 다니기가 힘들고, 겨울에 난방비가 걱정이에요." },
    { title: "실직한 40대 한부모", proxy: false, text: "40대인데 지난달 회사에서 권고사직을 당했어요. 혼자 초등학생 아이 둘을 키우고 있어서 생활비가 막막합니다." },
    { title: "자녀가 부모님 대신", proxy: true, relation: "어머니", text: "어머니가 78세이신데 시골에서 혼자 지내세요. 요즘 자꾸 깜빡하시고, 기초연금은 받고 계신지 모르겠어요." }
  ];

  // ── 데이터 읽기: services.json → services.sample.json → 짝 .js(행정망에서 .json 이 막힐 때) ──
  function loadCatalog() {
    var srcs = (C.serviceSources || ["data/services.sample.json"]).slice();
    function next() {
      if (!srcs.length) return loadScript();
      var u = srcs.shift();
      return fetch(u, { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      }).then(function (d) {
        if (!d || !Array.isArray(d.services) || !d.services.length) throw new Error("빈 목록");
        return d;
      }).catch(next);
    }
    function loadScript() {
      return new Promise(function (ok, no) {
        if (window.__DAEUM_SERVICES__) return ok(window.__DAEUM_SERVICES__);
        var s = document.createElement("script");
        s.src = C.serviceScriptFallback || "data/services.sample.js";
        s.onload = function () { window.__DAEUM_SERVICES__ ? (window.DaeumNet && DaeumNet.noteJsonFallback(), ok(window.__DAEUM_SERVICES__)) : no(new Error("사본 없음")); };
        s.onerror = function () { no(new Error("서비스 목록을 읽지 못했습니다")); };
        document.head.appendChild(s);
      });
    }
    return next();
  }

  // ── 화면 전환(해시 — 뒤로 가기 단추가 그대로 먹게) ──
  var STEPS = ["ask", "result", "request", "done"];
  function show(step, focus) {
    if ((step === "result" && !S.result) || (step === "request" && !S.result) || (step === "done" && !S.done)) step = "ask";
    STEPS.forEach(function (s) { $("step-" + s).hidden = s !== step; });
    window.scrollTo(0, 0);
    if (focus !== false) { var h = document.querySelector("#step-" + step + " h1"); if (h) h.focus(); }
  }
  function go(step) {
    if (location.hash === "#" + step) show(step); else location.hash = step;
  }
  window.addEventListener("hashchange", function () { show((location.hash || "#ask").slice(1)); });

  // ── ① 상황 말하기 ──
  function setProxy(on) {
    S.proxy = on;
    document.querySelectorAll(".who-btn").forEach(function (b) { b.setAttribute("aria-checked", String((b.dataset.proxy === "1") === on)); });
    $("relation-wrap").hidden = !on;
    $("situation-label").textContent = on ? "가족분의 상황" : "상황";
    $("situation").placeholder = on
      ? "예) 어머니가 78세이신데 혼자 지내세요. 요즘 자꾸 깜빡하세요."
      : "예) 82살이고 혼자 살아요. 무릎이 아파 병원 다니기가 힘들어요.";
  }
  function buildChips() {
    var box = $("chips");
    DaeumAI.chips.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = c[1];
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        S.chips[c[0]] = !S.chips[c[0]];
        b.setAttribute("aria-pressed", String(!!S.chips[c[0]]));
      });
      box.appendChild(b);
    });
  }
  function buildExamples() {
    var box = $("examples");
    EXAMPLES.forEach(function (ex) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "example";
      b.innerHTML = "<b></b><span></span>";
      b.querySelector("b").textContent = ex.title;
      b.querySelector("span").textContent = ex.text;
      b.addEventListener("click", function () {
        setProxy(!!ex.proxy);
        if (ex.relation) $("relation").value = ex.relation;
        $("situation").value = ex.text;
        $("situation").focus();
      });
      box.appendChild(b);
    });
  }

  // 음성 입력 — 브라우저 온라인 음성 인식(Web Speech API). 없는 브라우저는 단추를 숨긴다.
  function setupVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var mic = $("mic"), note = $("mic-note");
    if (!SR) { mic.hidden = true; note.textContent = "이 브라우저는 말로 입력을 지원하지 않아요. 글로 적어 주세요."; return; }
    var rec = null, base = "";
    mic.addEventListener("click", function () {
      if (rec) { rec.stop(); return; }
      if (window.DaeumNet && DaeumNet.isOffline()) { note.textContent = "인터넷에 연결된 뒤에 말로 입력할 수 있어요."; return; }
      rec = new SR();
      rec.lang = "ko-KR"; rec.interimResults = true; rec.continuous = true;
      base = $("situation").value ? $("situation").value.replace(/\s*$/, " ") : "";
      rec.onresult = function (e) {
        var txt = "";
        for (var i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
        $("situation").value = base + txt;
      };
      rec.onerror = function (e) {
        note.textContent = e.error === "not-allowed" ? "마이크 사용을 허용해 주셔야 말로 입력할 수 있어요." : "음성을 알아듣지 못했어요. 다시 눌러 주세요.";
      };
      rec.onend = function () { rec = null; mic.textContent = "말로 하기"; mic.setAttribute("aria-pressed", "false"); };
      try {
        rec.start();
        mic.textContent = "듣고 있어요 · 누르면 멈춤"; mic.setAttribute("aria-pressed", "true");
      } catch (err) { rec = null; }
    });
  }

  function find() {
    var text = $("situation").value.trim();
    var chips = Object.keys(S.chips).filter(function (k) { return S.chips[k]; });
    $("ask-error").hidden = true;
    if (text.length < 4 && !chips.length) {
      $("ask-error").textContent = "상황을 조금만 더 적어 주시거나, 해당하는 것을 눌러 주세요.";
      $("ask-error").hidden = false; return;
    }
    if (!S.catalog) { $("ask-error").textContent = "서비스 목록을 아직 읽지 못했어요. 잠시 뒤 다시 눌러 주세요."; $("ask-error").hidden = false; return; }
    var btn = $("find"); btn.disabled = true; btn.textContent = "찾고 있어요…";
    S.input = { text: text, chips: chips, proxy: { isProxy: S.proxy, relation: S.proxy ? $("relation").value : "" } };
    DaeumAI.recommend(S.input, S.catalog).then(function (res) {
      S.result = res; S.done = null;
      renderResult(res);
      go("result");
    }).catch(function () {
      $("ask-error").textContent = "찾는 중에 문제가 생겼어요. 다시 눌러 주세요."; $("ask-error").hidden = false;
    }).then(function () { btn.disabled = false; btn.textContent = "받을 수 있는 도움 찾기"; });
  }

  // ── ② 서비스 카드 ──
  function docsOf(svc) {
    var sets = (S.catalog && S.catalog.doc_sets) || {}, out = [];
    (svc.docs || []).forEach(function (d) {
      if (d.charAt(0) === "$") (sets[d.slice(1)] || []).forEach(function (x) { out.push(x); }); else out.push(d);
    });
    if (S.input && S.input.proxy.isProxy && out.length) (sets.proxy || []).forEach(function (x) { out.push(x); });
    return out.filter(function (x, i) { return out.indexOf(x) === i; });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  // 위기 상담전화 고정 카드 — AI 답과 상관없이 늘 맨 위(서비스 목록 밖의 고정 안내). 생명 > 폭력 피해 > 생계 순
  function hotCard(title, html) {
    var li = el("li", "card is-urgent hotline");
    li.setAttribute("role", "alert");
    li.appendChild(el("h2", null, title));
    li.insertAdjacentHTML("beforeend", html);
    return li;
  }
  function hotlineCards(pr) {
    var out = [];
    if (pr.urgentSuicide) out.push(hotCard("지금 바로 이야기 나눌 곳이 있어요",
      '<p class="hot-num"><a href="tel:109">109</a> 자살예방 상담전화 · 24시간 · 무료</p>' +
      '<p class="why">예전 번호 1393은 109로 통합되었습니다. 혼자 견디지 않으셔도 됩니다. 위험이 급하면 <a href="tel:112">112</a>·<a href="tel:119">119</a>로 바로 연락해 주세요.</p>'));
    if (pr.urgentViolence) out.push(hotCard("폭력 피해 상담은 여기로",
      '<p class="hot-num"><a href="tel:1366">1366</a> 여성긴급전화 · 24시간</p>' +
      '<p class="why">지금 위험하면 <a href="tel:112">112</a>로 바로 신고해 주세요.</p>'));
    if (pr.urgentCrisis) out.push(hotCard("갑자기 생계가 어려워졌다면",
      '<p class="hot-num"><a href="tel:129">129</a> 보건복지상담센터</p>' +
      '<p class="why">긴급복지지원은 먼저 돕고 나중에 확인합니다. 주소지 읍면동 행정복지센터에서도 바로 신청할 수 있어요.</p>'));
    return out;
  }
  function renderResult(res) {
    $("summary").textContent = res.summary;
    $("mode-note").hidden = !res.notice;
    $("mode-note").textContent = res.notice || "";
    var pr = res.profile || {};
    // 생명 위기·생계 위기는 맨 위 고정 카드로 알린다(S5b-2). 띠는 «마음이 힘듦»만 있을 때.
    var hot = hotlineCards(pr);
    // 고정 카드가 없고 마음 힘듦·«막막» 같은 낱말만 있으면 안내 띠만
    $("urgent").hidden = hot.length > 0 || !pr.urgent;
    $("urgent").innerHTML = pr.urgentMental
      ? '마음이 많이 힘드시면 지금 바로 <a href="tel:109">109</a>(24시간)로 전화해 주세요. 혼자 견디지 않으셔도 됩니다.'
      : '갑자기 생계가 어려워졌다면 <a href="tel:129">129</a>(보건복지상담센터)로 바로 상담할 수 있어요. 긴급복지지원은 먼저 돕고 나중에 확인합니다.';
    if (res.mode === "rules" && C.aiEndpoint && window.DaeumNet) DaeumNet.noteAiDown(res.notice);
    var ol = $("cards"); ol.innerHTML = "";
    hot.forEach(function (c) { ol.appendChild(c); });
    if (!res.items.length) {
      var li = el("li", "empty", "말씀만으로는 딱 맞는 서비스를 찾지 못했어요. 아래 «담당 공무원에게 도움 요청»을 누르시면 공무원이 직접 살펴봅니다.");
      ol.appendChild(li);
    }
    res.items.forEach(function (it) {
      var s = it.service, li = el("li", "card" + (s.urgent ? " is-urgent" : ""));
      li.appendChild(el("h2", null, s.name));
      var meta = el("p", "meta", s.provider + (s.dataset === "D4" ? " · 민간 지원" : ""));
      // «중앙»+«보건복지부»가 붙어 «중앙보건복지부»로 읽히지 않게: 전국 사업은 «전국», 꼬리표 뒤에 띄어쓰기
      var AREA_LABEL = { "상주": "상주시", "경북": "경상북도", "중앙": "전국" };
      if (AREA_LABEL[s.area]) {
        var at = el("span", "area-tag area-" + s.area, AREA_LABEL[s.area]);
        meta.insertBefore(document.createTextNode(" "), meta.firstChild);
        meta.insertBefore(at, meta.firstChild);
      }
      li.appendChild(meta);
      li.appendChild(el("p", "why", it.reason));
      var dl = el("dl");
      [["무엇을 받나요", s.support], ["누가 받나요", s.target], ["어디서 신청하나요", s.apply], ["문의", s.contact]].forEach(function (row) {
        if (!row[1]) return;
        dl.appendChild(el("dt", null, row[0])); dl.appendChild(el("dd", null, row[1]));
      });
      li.appendChild(dl);
      var docs = docsOf(s);
      if (docs.length) {
        var det = el("details"); det.appendChild(el("summary", null, "준비할 서류 보기"));
        var ul = el("ul"); docs.forEach(function (d) { ul.appendChild(el("li", null, d)); });
        det.appendChild(ul); li.appendChild(det);
      }
      var src = el("p", "src");
      src.appendChild(document.createTextNode("출처: "));
      var a = el("a", null, s.url.replace(/^https?:\/\//, "").replace(/\/$/, ""));
      a.href = s.url; a.target = "_blank"; a.rel = "noopener";
      src.appendChild(a);
      li.appendChild(src);
      ol.appendChild(li);
    });
  }

  // ── ③ 도움 요청 ──
  function openRequest() {
    var r = S.result, p = r.profile, box = $("req-preview");
    box.innerHTML = "";
    var who = S.input.proxy.isProxy ? S.input.proxy.relation + "의 일(대신 요청)" : "본인";
    box.appendChild(el("p", null, "누구: " + who));
    box.appendChild(el("p", null, "상황: " + (S.input.text || "(고른 항목만)")));
    box.appendChild(el("p", null, "찾은 서비스: " + (r.items.map(function (i) { return i.service.name; }).join(", ") || "없음")));
    $("req-error").hidden = true;
    $("consent").checked = false;
    go("request");
  }
  function submitRequest(e) {
    e.preventDefault();
    if (!$("consent").checked) { $("req-error").textContent = "동의에 체크해 주셔야 요청을 보낼 수 있어요."; $("req-error").hidden = false; $("consent").focus(); return; }
    var r = S.result, p = r.profile;
    var rec = DaeumRequests.add({
      region: $("region").value,
      contactPref: (document.querySelector('input[name="contact"]:checked') || {}).value || "visit",
      displayName: $("display-name").value.trim().slice(0, 20),
      proxy: { isProxy: S.input.proxy.isProxy, relation: S.input.proxy.relation },
      subject: { age: p.age, ageBand: p.ageBand, tags: p.tags, childAges: p.childAges },
      situation: S.input.text,
      summary: r.summary,
      matched: r.items.map(function (i) { return { id: i.service.id, name: i.service.name, reason: i.reason }; }),
      urgent: !!r.urgent,
      mode: r.mode,
      consent: { agreed: true, at: new Date().toISOString(), text: $("consent-text").textContent }
    });
    if (!rec) { $("req-error").textContent = "이 브라우저에 저장하지 못했어요(사생활 보호 모드일 수 있어요). 129로 전화해 주세요."; $("req-error").hidden = false; return; }
    S.done = rec;
    $("req-id").textContent = rec.id;
    go("done");
  }

  function reset() {
    S.result = null; S.done = null; S.chips = {};
    $("situation").value = ""; $("display-name").value = "";
    document.querySelectorAll(".chip").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    setProxy(false);
    go("ask");
  }

  // ── 시작 ──
  function init() {
    var mode = DaeumAI.mode();
    var badge = $("mode-badge");
    badge.hidden = false;
    badge.textContent = mode === "ai" ? "AI 안내" : "AI 연결 전 시연 모드";
    $("region-name").textContent = C.regionName || "상주시";
    $("consent-text").textContent = $("consent-text").textContent.replace("상주시", C.regionName || "상주시");
    (C.regions || []).forEach(function (r) { var o = document.createElement("option"); o.textContent = r; $("region").appendChild(o); });

    document.querySelectorAll(".who-btn").forEach(function (b) { b.addEventListener("click", function () { setProxy(b.dataset.proxy === "1"); }); });
    document.querySelectorAll("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () { b.dataset.go === "new" ? reset() : go(b.dataset.go); });
    });
    $("find").addEventListener("click", find);
    $("to-request").addEventListener("click", openRequest);
    $("req-form").addEventListener("submit", submitRequest);
    buildChips(); buildExamples(); setupVoice(); setProxy(false);

    loadCatalog().then(function (d) { S.catalog = d; }).catch(function (e) {
      $("ask-error").textContent = "서비스 목록을 읽지 못했어요. 새로고침해 주세요. (" + e.message + ")"; $("ask-error").hidden = false;
    });
    show("ask", false);
    if (location.hash && location.hash !== "#ask") history.replaceState(null, "", "#ask");

    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function () {});
  }
  document.addEventListener("DOMContentLoaded", init);
})();
