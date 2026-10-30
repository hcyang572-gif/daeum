/* 닿음 주민 창구 — S9h C안(10-29): «이웃 알림·도움 요청 → 읍면동 공무원 방문 순서에 반영»하는 신호 입구가 주인공.
   ① 알리기(이웃·가족·본인) → ③ 보내기 → ④ 접수. ② 서비스 카드(복지 찾기)는 복지로와 겹치므로 보조 길로만 둔다. */
(function () {
  "use strict";
  var C = window.DAEUM_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var S = { proxy: true, who: "neighbor", relation: "이웃", chips: {}, catalog: null, result: null, input: null };

  var EXAMPLES = [
    { title: "옆집 어르신이 걱정돼요", who: "neighbor", text: "옆집 할머니 댁 우편물이 일주일째 쌓여 있고 밤에도 불이 안 켜져요. 혼자 사시는데 요즘 통 안 보이세요." },
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
  var STEPS = ["ask", "result", "request", "done", "checklist", "progress"];
  function show(step, focus) {
    if (STEPS.indexOf(step) < 0) step = "ask";
    if (step === "request" && S.done) { step = "done"; history.replaceState(null, "", "#done"); }
    if (((step === "result" || step === "checklist") && !S.result) || (step === "request" && !S.input) || (step === "done" && !S.done)) step = "ask";
    STEPS.forEach(function (s) { $("step-" + s).hidden = s !== step; });
    // 주민 메뉴 2칸(S10b): 보낸 알림 화면만 «보낸 알림», 나머지 흐름은 모두 «알리기»
    var seg = step === "progress" ? "progress" : "ask";
    document.querySelectorAll(".top .seg [data-seg]").forEach(function (b) { if (b.dataset.seg === seg) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    if (step === "checklist") renderChecklist();
    if (step === "progress") renderProgress();
    window.scrollTo(0, 0);
    if (focus !== false) { var h = document.querySelector("#step-" + step + " h1"); if (h) h.focus(); }
  }
  function go(step) {
    if (location.hash === "#" + step) show(step); else location.hash = step;
  }
  window.addEventListener("hashchange", function () { show((location.hash || "#ask").slice(1)); });

  // ── ① 상황 말하기 ──
  // who: "neighbor"(이웃이 걱정돼요) | "family"(가족 일) | "self"(제 일). setProxy(true/false)는 옛 호출 호환
  var WHO_BY_KEY = { "2": "neighbor", "1": "family", "0": "self" };
  function setProxy(who) {
    if (who === true) who = "family"; else if (who === false) who = "self";
    S.who = who; S.proxy = who !== "self";
    document.querySelectorAll(".who-btn").forEach(function (b) { b.setAttribute("aria-checked", String(WHO_BY_KEY[b.dataset.proxy] === who)); });
    $("relation-wrap").hidden = who !== "family";
    $("situation-label").textContent = who === "neighbor" ? "걱정되는 모습" : who === "family" ? "가족분의 상황" : "상황";
    $("situation").placeholder = who === "neighbor"
      ? "예) 옆집 할머니 댁 우편물이 며칠째 쌓여 있고 인기척이 없어요."
      : who === "family" ? "예) 어머니가 78세이신데 혼자 지내세요. 요즘 자꾸 깜빡하세요."
      : "예) 82살이고 혼자 살아요. 무릎이 아파 병원 다니기가 힘들어요.";
    // 이웃 일로 «받을 서비스 찾기»는 맞지 않는다(남의 자격을 대신 따지는 셈) — 보조 길을 숨긴다
    $("find").hidden = who === "neighbor";
  }
  function relation() { return S.who === "neighbor" ? "이웃" : S.who === "family" ? $("relation").value : ""; }
  function buildChips() {
    var box = $("chips");
    DaeumAI.chips.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = c[1]; b.setAttribute("data-h", "selection");
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
      b.type = "button"; b.className = "example"; b.setAttribute("data-h", "selection");
      b.innerHTML = "<b></b><span></span>";
      b.querySelector("b").textContent = ex.title;
      b.querySelector("span").textContent = ex.text;
      b.addEventListener("click", function () {
        setProxy(ex.who || !!ex.proxy);
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
    var mic = $("mic"), note = $("mic-note"), lab = $("mic-label");
    function micState(on) {
      mic.setAttribute("aria-pressed", String(on));
      mic.setAttribute("aria-label", on ? "듣고 있어요. 누르면 멈춥니다" : "말로 하기");
      lab.textContent = on ? "듣고 있어요 · 누르면 멈춤" : "눌러서 말하기";
    }
    if (!SR) { mic.hidden = true; lab.textContent = "글로 적어 주세요"; note.textContent = "이 브라우저는 말로 입력을 지원하지 않아요. 글로 적어 주세요."; return; }
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
      rec.onend = function () { rec = null; micState(false); };
      try {
        rec.start();
        micState(true);
      } catch (err) { rec = null; }
    });
  }

  function readInput() {
    var text = $("situation").value.trim();
    var chips = Object.keys(S.chips).filter(function (k) { return S.chips[k]; });
    $("ask-error").hidden = true;
    if (text.length < 4 && !chips.length) {
      $("ask-error").textContent = "상황을 조금만 더 적어 주시거나, 해당하는 것을 눌러 주세요.";
      $("ask-error").hidden = false; ui("error"); return null;
    }
    return { text: text, chips: chips, proxy: { isProxy: S.proxy, relation: relation() } };
  }
  // 주인공 길: 서비스 찾기 없이 바로 담당 공무원에게 알린다(AI 호출 없음 — 긴급 낱말·나이는 규칙으로만 읽는다)
  function toSignal() {
    var input = readInput(); if (!input) return;
    S.input = input; S.result = null; S.done = null;
    openRequest();
  }
  function find() {
    var input = readInput(); if (!input) return;
    var text = input.text, chips = input.chips;
    if (!S.catalog) { $("ask-error").textContent = "서비스 목록을 아직 읽지 못했어요. 잠시 뒤 다시 눌러 주세요."; $("ask-error").hidden = false; return; }
    var btn = $("find"); btn.disabled = true; $("find-label").textContent = "찾고 있어요…";
    var stopFinding = finding();
    S.input = input;
    DaeumAI.recommend(S.input, S.catalog).then(function (res) {
      return stopFinding().then(function () {
        S.result = res; S.done = null;
        renderResult(res);
        go("result");
        ui(res.items.length ? "success" : "warning");
      });
    }).catch(function () {
      stopFinding();
      $("ask-error").textContent = "찾는 중에 문제가 생겼어요. 다시 눌러 주세요."; $("ask-error").hidden = false; ui("error");
    }).then(function () { btn.disabled = false; $("find-label").textContent = "받을 수 있는 도움 먼저 살펴보기"; });
  }
  function ui(kind) { if (window.DaeumUI) DaeumUI.haptic(kind); }
  // 찾는 중 덮개 — 단계 문구 3개를 차례로 켜고, 최소 1.1초는 보여 준다(움직임 줄이기면 바로 닫음)
  function finding() {
    var box = $("finding"), lis = box.querySelectorAll("li"), t0 = Date.now(), i = 0, timer;
    var quick = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    [].forEach.call(lis, function (li) { li.className = ""; });
    box.hidden = false;
    function step() { if (i < lis.length) { lis[i].className = "on"; i++; timer = setTimeout(step, 380); } }
    step();
    return function () {
      var wait = quick ? 0 : Math.max(0, 1100 - (Date.now() - t0));
      return new Promise(function (ok) { setTimeout(function () { clearTimeout(timer); box.hidden = true; ok(); }, wait); });
    };
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
    var li = el("li", "card d-card is-urgent hotline");
    li.setAttribute("role", "alert");
    li.appendChild(el("h2", null, title));
    li.insertAdjacentHTML("beforeend", html);
    return li;
  }
  // nb(이웃·가족 일): 알리는 분이 대신 걸어도 되는 곳으로 문구만 바꾼다(번호는 같다)
  function hotlineCards(pr, nb) {
    var out = [];
    if (pr.urgentSuicide) out.push(nb
      ? hotCard("지금 함께 상담할 수 있는 곳",
        '<p class="hot-num"><a href="tel:109">109</a> 자살예방 상담전화 · 24시간 · 무료</p>' +
        '<p class="why">곁에서 걱정하는 분이 걸어도 상담할 수 있습니다. 지금 위험해 보이면 <a href="tel:112">112</a>·<a href="tel:119">119</a>로 먼저 연락해 주세요.</p>')
      : hotCard("지금 바로 이야기 나눌 곳이 있어요",
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
  // 알리기 길(서비스 찾기를 안 거친 경우)에도 같은 위기 카드를 요청 화면·완료 화면에 띄운다(S10n C-01)
  function renderHot(boxId, pr) {
    var box = $(boxId); if (!box) return;
    var hot = hotlineCards(pr || {}, S.who !== "self");
    box.innerHTML = "";
    hot.forEach(function (c, i) { c.style.setProperty("--d", i); box.appendChild(c); });
    box.hidden = !hot.length;
  }
  function profileNow() { return S.result ? S.result.profile || {} : DaeumAI.analyze(S.input); }
  function renderResult(res) {
    $("summary").textContent = res.summary;
    $("result-count").textContent = res.items.length;
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
    hot.forEach(function (c, i) { c.style.setProperty("--d", i); ol.appendChild(c); });
    if (!res.items.length) {
      var li = el("li", "empty", "말씀만으로는 딱 맞는 서비스를 찾지 못했어요. 아래 «담당 공무원에게 도움 요청»을 누르시면 공무원이 직접 살펴봅니다.");
      ol.appendChild(li);
    }
    res.items.forEach(function (it, idx) {
      var s = it.service, li = el("li", "card d-card svc" + (idx === 0 ? " first" : "") + (s.urgent ? " is-urgent" : ""));
      li.style.setProperty("--d", hot.length + idx);
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
      if (/^D\d+$/.test(s.dataset || "")) src.setAttribute("data-src-ref", s.dataset); // 공통 출처 꼬리표(shared/guide.js)가 «공공데이터» 표식·«자료 표»를 붙인다
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
    var r = S.result, box = $("req-preview"), nb = S.who === "neighbor";
    box.innerHTML = "";
    var who = nb ? "이웃(걱정되는 집 알림)" : S.input.proxy.isProxy ? S.input.proxy.relation + "의 일(대신 요청)" : "본인";
    box.appendChild(el("p", null, "누구: " + who));
    box.appendChild(el("p", null, (nb ? "걱정되는 모습: " : "상황: ") + (S.input.text || "(고른 항목만)")));
    if (r) box.appendChild(el("p", null, "살펴본 서비스: " + (r.items.map(function (i) { return i.service.name; }).join(", ") || "없음")));
    $("req-h").innerHTML = nb ? "걱정되는 이웃을<br>알려요" : "담당 공무원에게<br>도움을 요청해요";
    $("req-lead").textContent = nb ? "담당 공무원이 그 집을 찾아가 안부와 사정을 살핍니다." : "읍면동 복지 담당 공무원이 내용을 보고 연락하거나 찾아갑니다.";
    $("region-what").textContent = nb ? "그 집이 있는 곳" : "사시는 곳";
    $("place-wrap").hidden = !nb;
    $("contact-wrap").hidden = nb;
    $("name-label").textContent = nb ? "알려 주시는 분 이름(선택·가명 가능)" : "부르실 이름(가명 가능)";
    $("req-back").setAttribute("data-go", r ? "result" : "ask");
    $("req-error").hidden = true;
    $("consent").checked = false;
    renderHot("req-hot", profileNow());
    go("request");
  }
  function submitRequest(e) {
    e.preventDefault();
    var r = S.result, nb = S.who === "neighbor";
    function fail(msg, el) { $("req-error").textContent = msg; $("req-error").hidden = false; el.focus(); ui("error"); }
    // 읍면동을 고르지 않으면 첫 항목으로 잘못 접수되지 않게 막는다(S10n C-04)
    if (!$("region").value) return fail((nb ? "그 집이 있는" : "사시는") + " 읍면동을 골라 주세요.", $("region"));
    if (!$("consent").checked) return fail("동의에 체크해 주셔야 " + (nb ? "알림을" : "요청을") + " 보낼 수 있어요.", $("consent"));
    var p = r ? r.profile : DaeumAI.analyze(S.input); // 서비스 찾기를 안 거쳤으면 규칙으로만(나이·긴급 낱말)
    var rec = DaeumRequests.add({
      signal: S.who,
      place: nb ? $("place").value.trim().slice(0, 40) : "",
      region: $("region").value,
      contactPref: nb ? "visit" : (document.querySelector('input[name="contact"]:checked') || {}).value || "visit",
      displayName: $("display-name").value.trim().slice(0, 20),
      proxy: { isProxy: S.input.proxy.isProxy, relation: S.input.proxy.relation },
      subject: { age: p.age, ageBand: p.ageBand, tags: p.tags, childAges: p.childAges },
      situation: S.input.text,
      summary: r ? r.summary : "",
      matched: r ? r.items.map(function (i) { return { id: i.service.id, name: i.service.name, reason: i.reason }; }) : [],
      urgent: !!(r ? r.urgent : p.urgent),
      householdId: null, // 공무원이 발굴 명단의 가구와 이으면 채운다(시연: 공무원 창구 «시연용 국민 요청 넣기»가 같은 읍면 가구와 잇는다)
      mode: r ? r.mode : "rules",
      consent: { agreed: true, at: new Date().toISOString(), text: $("consent-text").textContent }
    });
    if (!rec) { $("req-error").textContent = "이 브라우저에 저장하지 못했어요(사생활 보호 모드일 수 있어요). 129로 전화해 주세요."; $("req-error").hidden = false; return; }
    S.done = rec;
    if (FX.progress) FX.progress.remember(rec.id);
    if (FX.checklist) FX.checklist.save(rec.id, FX.checklist.load("draft"));
    $("req-id").textContent = rec.id;
    $("done-h").textContent = nb ? "알려 주셔서 고맙습니다" : "잘 받았습니다";
    $("done-say").innerHTML = nb
      ? "담당 공무원이 그 집을 찾아가는 순서에 반영합니다. 지금 위험해 보이면 <a href=\"tel:112\">112</a>·<a href=\"tel:119\">119</a>로 먼저 연락해 주세요."
      : "담당 공무원이 확인하면 고르신 방법으로 연락드립니다. 급하시면 <a href=\"tel:129\">129</a>로 전화해 주세요.";
    renderHot("done-hot", p);
    // 완료 화면은 요청 화면 자리를 대신한다 — 뒤로 가기로 양식이 다시 열려 같은 내용이 또 접수되지 않게(S10n C-02)
    history.replaceState(null, "", "#done");
    show("done");
    ui("success");
  }

  function reset() {
    S.result = null; S.done = null; S.input = null; S.chips = {};
    $("situation").value = ""; $("display-name").value = ""; $("place").value = ""; $("region").value = "";
    document.querySelectorAll(".chip").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    setProxy("neighbor");
    go("ask");
  }

  // ── ⑥ 신청 준비물 · ⑦ 내 요청 진행 상황 (계산은 progress.js, 여기서는 그리기만) ──
  var FX = window.DaeumFeatures || {};
  function renderChecklist() {
    var root = $("checklist-root"); if (!root || !FX.checklist || !S.result) return;
    var checked = FX.checklist.load("draft");
    var c = FX.checklist.build(S.result.items.map(function (i) { return i.service; }), (S.catalog || {}).doc_sets, { proxy: S.input && S.input.proxy.isProxy, checked: checked });
    root.innerHTML = "";
    if (!c.total) { root.appendChild(el("p", "d-slot", "찾은 도움에 적힌 준비 서류가 없어요. 신분증을 챙기고 문의 전화로 확인하세요.")); return; }
    var head = el("p", "lead"); head.innerHTML = '챙긴 서류 <strong class="num">' + c.done + "</strong> / " + c.total + (c.ready ? ' <span class="d-tag pos">다 챙겼어요</span>' : "");
    root.appendChild(head);
    var box = el("div", "req d-card"); box.setAttribute("role", "group"); box.setAttribute("aria-label", "준비 서류 목록");
    c.items.forEach(function (it) {
      var lab = el("label", "radio"), cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = it.checked; cb.setAttribute("data-h", "selection");
      cb.addEventListener("change", function () { FX.checklist.save("draft", FX.checklist.toggle(FX.checklist.load("draft"), it.key)); renderChecklist(); if (FX.checklist.build && cb.checked) ui("light"); });
      lab.appendChild(cb);
      var t = el("span", null, it.text); t.appendChild(el("small", "note", " · " + it.forServices.slice(0, 2).join(", ") + (it.forServices.length > 2 ? " 외 " + (it.forServices.length - 2) + "가지" : ""))); lab.appendChild(t);
      box.appendChild(lab);
    });
    root.appendChild(box);
    root.appendChild(el("p", "note", c.tip));
    var where = el("div", "always d-card"); where.appendChild(el("strong", null, "신청하는 곳"));
    c.services.forEach(function (s) { where.appendChild(el("p", "note", s.name + " — " + (s.apply || "주소지 행정복지센터") + (s.contact ? " · 문의 " + s.contact : ""))); });
    root.appendChild(where);
    root.appendChild(el("p", "note", c.note));
  }
  function renderProgress() {
    var root = $("progress-root"); if (!root || !FX.progress) return;
    var list = FX.progress.mine(DaeumRequests.list(), FX.progress.myIds());
    root.innerHTML = "";
    if (!list.length) { root.appendChild(el("p", "d-slot", "이 기기에서 보낸 알림이 아직 없어요. 첫 화면에서 «담당 공무원에게 알리기»를 누르면 여기서 확인할 수 있어요.")); return; }
    list.forEach(function (p) {
      var card = el("article", "card d-card");
      card.appendChild(el("h2", null, p.title));
      var meta = el("p", "meta", "접수번호 " + p.id + " · " + (p.waitedDays > 0 ? p.waitedDays + "일째" : "오늘 접수") + " · 마지막 변경 " + p.lastUpdate); card.appendChild(meta);
      var now = el("p", "why"); now.appendChild(el("span", "d-tag " + (p.cancelled ? "warn" : p.finished ? "pos" : "acc"), p.current.label)); now.appendChild(document.createTextNode(" " + p.current.say)); card.appendChild(now);
      var dl = el("dl");
      p.steps.forEach(function (s) {
        // 기호는 화면낭독기에 숨기고, 상태를 말로 읽힌다
        var dt = el("dt");
        dt.appendChild(el("span", null, s.state === "done" ? "✓ " : s.state === "current" ? "● " : "○ ")).setAttribute("aria-hidden", "true");
        dt.appendChild(el("span", "sr-only", s.state === "done" ? "완료: " : s.state === "current" ? "진행 중: " : "아직: "));
        dt.appendChild(document.createTextNode(s.label));
        dl.appendChild(dt);
        dl.appendChild(el("dd", null, s.at ? s.at : s.state === "todo" ? "아직" : "진행 중"));
      });
      card.appendChild(dl);
      card.appendChild(el("p", "src", p.contactLine));
      root.appendChild(card);
    });
  }

  // ── 시작 ──
  function init() {
    var mode = DaeumAI.mode();
    var badge = $("mode-badge");
    badge.hidden = false;
    badge.textContent = mode === "ai" ? "AI 안내" : "AI 연결 전 시연 모드";
    $("region-name").textContent = C.regionName || "상주시";
    $("consent-text").textContent = $("consent-text").textContent.replace("상주시", C.regionName || "상주시");
    var ph = document.createElement("option"); ph.value = ""; ph.textContent = "읍면동을 골라 주세요"; ph.disabled = true; ph.selected = true; $("region").appendChild(ph);
    (C.regions || []).forEach(function (r) { var o = document.createElement("option"); o.textContent = r; $("region").appendChild(o); });
    $("region").value = "";

    document.querySelectorAll(".who-btn").forEach(function (b) { b.addEventListener("click", function () { setProxy(WHO_BY_KEY[b.dataset.proxy]); }); });
    document.querySelectorAll("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () { b.dataset.go === "new" ? reset() : go(b.dataset.go); });
    });
    $("find").addEventListener("click", find);
    $("to-signal").addEventListener("click", toSignal);
    $("checklist-print").addEventListener("click", function () { window.print(); });
    $("to-request").addEventListener("click", openRequest);
    $("req-form").addEventListener("submit", submitRequest);
    buildChips(); buildExamples(); setupVoice(); setProxy("neighbor");

    loadCatalog().then(function (d) { S.catalog = d; }).catch(function (e) {
      $("ask-error").textContent = "서비스 목록을 읽지 못했어요. 새로고침해 주세요. (" + e.message + ")"; $("ask-error").hidden = false;
    });
    // 보낸 알림(#progress)은 앞 단계 상태가 필요 없으니 그대로 연다. 나머지는 첫 화면으로(S10n C-03)
    var first = location.hash === "#progress" ? "progress" : "ask";
    show(first, false);
    if (location.hash && location.hash !== "#" + first) history.replaceState(null, "", "#" + first);

    // 서비스워커는 shared/pwa.js 가 /daeum/sw.js 하나로 등록한다(2026-10-30 PWA 정리)
  }
  document.addEventListener("DOMContentLoaded", init);
})();
