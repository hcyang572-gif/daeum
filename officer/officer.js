/* 닿음 공무원 창구 — ③명단 ④경로 ⑤상담 기록 ⑥수요 보드. 빌드 없는 바닐라 JS.
   데이터: ../data/households.json(가상), 국민 요청(shared/requests.js — DaeumRequests), 서비스 목록.
   공통: ../shared/config.js(읍면 정본·AI 주소) · ../shared/ai.js(DaeumAI.summarize) · ../shared/requests.js */
(function () {
  "use strict";
  var AI = window.DaeumAI, C = window.DAEUM_CONFIG || {}, REQ = window.DaeumRequests;
  var LS_W = "daeum.officer.weights", LS_PICK = "daeum.officer.picked",
      LS_LINK = "daeum.officer.links";
  var REQUEST_BONUS = 20, URGENT_BONUS = 15, DETOUR = 1.3, KMH = 40, VISIT_MIN = 30;

  // 내장 서비스 목록(예시). 정식 목록은 D1 중앙부처·D2 지자체 복지서비스 API로 바꾼다.
  var BUILTIN_SERVICES = [
    { id: "S01", name: "기초생활보장 생계급여", org: "보건복지부", tags: ["생계"] },
    { id: "S02", name: "긴급복지지원", org: "보건복지부", tags: ["긴급", "생계", "의료", "주거"] },
    { id: "S03", name: "주거급여", org: "국토교통부", tags: ["주거"] },
    { id: "S04", name: "에너지바우처", org: "산업통상자원부", tags: ["에너지"] },
    { id: "S05", name: "노인맞춤돌봄서비스", org: "보건복지부", tags: ["돌봄"] },
    { id: "S06", name: "재난적의료비 지원", org: "보건복지부", tags: ["의료"] },
    { id: "S07", name: "국민취업지원제도", org: "고용노동부", tags: ["일자리"] },
    { id: "S08", name: "장애인활동지원", org: "보건복지부", tags: ["장애", "돌봄"] },
    { id: "S09", name: "정신건강복지센터 상담", org: "지자체", tags: ["정신건강", "긴급"] },
    { id: "S10", name: "드림스타트", org: "지자체", tags: ["아동"] },
    { id: "S11", name: "채무조정 상담", org: "신용회복위원회", tags: ["금융·채무"] },
    { id: "S12", name: "통합사례관리", org: "지자체", tags: ["긴급", "생계", "돌봄"] }
  ];
  // 국민 창구 서비스에 욕구 범주를 붙이는 규칙 — «이름»으로 먼저 판단한다(본문은 넓은 말이 많아 잘못 붙는다)
  var TAG_WORDS = { "생계": /생계|기초생활|기초연금|생활비|자활|근로장려|실업|구직급여|푸드|긴급지원/, "의료": /의료|병원|건강|진료|본인부담|요양|치매/,
    "주거": /주거|월세|임대/, "에너지": /에너지|난방|전기요금|연료/, "돌봄": /돌봄|안심|안부|희망풍차|장기요양/,
    "일자리": /일자리|취업|고용|내일배움|실업|자활/, "장애": /장애/, "정신건강": /정신|마음|심리|자살/,
    "아동": /아동|양육|아이돌봄|교육/, "금융·채무": /채무|신용|법률/, "긴급": /긴급|자살|응급/ };
  function normName(s) { return String(s || "").replace(/[\s·()]/g, ""); }

  var D = null, SERVICES = BUILTIN_SERVICES.slice(), servicesSource = "내장 예시 목록(12종)";
  var weights = {}, picked = [], rows = [];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } }
  function svcById(id) { for (var i = 0; i < SERVICES.length; i++) if (SERVICES[i].id === id) return SERVICES[i]; return null; }
  function areaByName(n) { for (var i = 0; i < D.areas.length; i++) if (D.areas[i].name === n) return D.areas[i]; return null; }

  // ── 점수 ───────────────────────────────────────────────
  function traitsOf(h) {
    var head = h.members[0].age, t = {};
    t.single_elderly = h.single && head >= 75;
    t.single = h.single && head < 75;
    t.disability = !!h.disability;
    t.child = h.members.some(function (m) { return m.role === "자녀" && m.age < 18; });
    t.no_contact = h.daysSinceContact == null || h.daysSinceContact >= 365;
    return t;
  }
  function score(h) {
    var f = [];
    D.indicators.forEach(function (d) {
      var v = h.indicators[d.key];
      if (!v) return;
      var pts = d.key === "health_ins_arrears" ? weights[d.key] * Math.min(6, v) : weights[d.key];
      f.push({ key: d.key, name: d.key === "health_ins_arrears" ? d.name + " " + v + "개월" : d.name, pts: pts,
               reason: d.reason.replace("{v}", v), kind: "지표" });
    });
    var t = traitsOf(h);
    D.traits.forEach(function (d) {
      if (t[d.key]) f.push({ key: d.key, name: d.name, pts: weights[d.key], reason: d.reason, kind: "특성" });
    });
    if (h.request) f.unshift({ key: "request", name: "국민 요청", pts: REQUEST_BONUS, reason: "본인 또는 보호자가 도움을 요청했습니다", kind: "요청" });
    if (h.request && h.request.urgent) f.unshift({ key: "request_urgent", name: "요청 속 위기 표현", pts: URGENT_BONUS, reason: "요청 문장에 위기·마음 건강 표현이 있습니다", kind: "요청" });
    f.sort(function (a, b) { return b.pts - a.pts; });
    var total = f.reduce(function (s, x) { return s + x.pts; }, 0);
    // 지표가 하나도 없으면 특성만으로는 명단에 올리지 않는다(요청은 예외)
    var hasSignal = f.some(function (x) { return x.kind !== "특성"; });
    return { total: hasSignal ? total : 0, factors: f };
  }
  function reasonSentence(f) {
    var top = f.slice(0, 3);
    if (!top.length) return "위기 신호 없음";
    return top.map(function (x) { return x.reason; }).join(". ") + "." +
      (f.length > 3 ? " 그 밖에 " + (f.length - 3) + "개 신호." : "");
  }

  // ── 국민 요청 → 명단 행 ────────────────────────────────
  var REQ_HINT = [[/전기|전깃/, "power_cut"], [/수도|물이 안/, "water_cut"], [/가스|보일러/, "gas_cut"],
    [/월세|집세/, "rent_arrears"], [/병원|약값|의료비/, "medical_overspend"], [/일자리|실직|해고/, "job_loss"],
    [/빚|대출|독촉/, "loan_overdue"]];
  // 공통 형식(shared/README.md «도움 요청 형식»): region · proxy.isProxy · matched[{id}] · urgent · status
  function reqRegion(r) { return r.region || ""; }
  function reqMatchedIds(r) { return (r.matched || []).map(function (m) { return m && m.id; }).filter(Boolean); }
  function activeRequests() { return REQ.list().filter(function (r) { return r && r.status !== "cancelled" && r.status !== "done"; }); }
  function requestRows() {
    return activeRequests().map(function (r, i) {
      var a = areaByName(reqRegion(r)) || { name: reqRegion(r) || "미상", code: "R", x: 0, y: 0 };
      var ind = {}; D.indicators.forEach(function (d) { ind[d.key] = false; });
      var s = String(r.situation || "");
      REQ_HINT.forEach(function (h) { if (h[0].test(s)) ind[h[1]] = true; });
      var ang = (i * 2.399) % (2 * Math.PI);
      var id = String(r.id || "REQ-" + (i + 1));
      var who = r.proxy && r.proxy.isProxy ? " (" + (r.proxy.relation || "가족") + " 대신 요청)" : "";
      return {
        id: id, label: "국민 요청 " + id + who, area: a.name, areaCode: a.code,
        x: +(a.x + 1.2 * Math.cos(ang)).toFixed(2), y: +(a.y + 1.2 * Math.sin(ang)).toFixed(2),
        members: [{ role: "본인", age: 0 }], single: false, disability: false, daysSinceContact: 0,
        indicators: ind, request: r, matched: reqMatchedIds(r)
      };
    });
  }

  function rebuild() {
    var all = D.households.concat(requestRows());
    rows = all.map(function (h) { var s = score(h); return { h: h, total: s.total, factors: s.factors }; })
      .filter(function (r) { return r.total > 0; })
      .sort(function (a, b) { return b.total - a.total || a.h.id.localeCompare(b.h.id); });
    rows.forEach(function (r, i) { r.rank = i + 1; });
    // 담기 목록에서 사라진 가구 정리
    var ids = {}; rows.forEach(function (r) { ids[r.h.id] = 1; });
    picked = picked.filter(function (id) { return ids[id]; });
  }
  function rowById(id) { for (var i = 0; i < rows.length; i++) if (rows[i].h.id === id) return rows[i]; return null; }
  function pickTop() {
    var n = Math.max(1, Math.min(30, +$("fPick").value || 12));
    picked = rows.slice(0, n).map(function (r) { return r.h.id; });
    lsSet(LS_PICK, picked);
  }

  // ── ③ 명단 ─────────────────────────────────────────────
  function memberText(h) {
    if (h.request) return (h.request.situation || "").slice(0, 40);
    var head = h.members[0].age;
    return (h.single ? "1인" : h.members.length + "인") + " · 본인 " + head + "세" +
      (h.disability ? " · 장애" : "") + (h.status !== "없음" ? " · " + h.status : "");
  }
  function renderList() {
    var area = $("fArea").value, top = +$("fTop").value;
    var list = rows.filter(function (r) { return !area || r.h.area === area; }).slice(0, top);
    var tb = $("listTable").tBodies[0];
    tb.textContent = "";
    list.forEach(function (r) {
      var tr = el("tr", r.h.request ? "req" : "");
      var td0 = el("td"), cb = el("input"); cb.type = "checkbox"; cb.checked = picked.indexOf(r.h.id) >= 0;
      cb.setAttribute("aria-label", r.h.label + " 경로에 담기");
      cb.addEventListener("change", function () {
        if (cb.checked) { if (picked.indexOf(r.h.id) < 0) picked.push(r.h.id); }
        else picked = picked.filter(function (x) { return x !== r.h.id; });
        lsSet(LS_PICK, picked); renderSummary();
      });
      td0.appendChild(cb); tr.appendChild(td0);
      tr.appendChild(el("td", "num", r.rank));
      var tdL = el("td"); tdL.appendChild(el("b", null, r.h.label)); if (r.h.request) tdL.appendChild(el("span", "tag req", "국민 요청")); tr.appendChild(tdL);
      tr.appendChild(el("td", null, r.h.area));
      var tdS = el("td", "num score"); tdS.appendChild(el("b", null, r.total));
      var bar = el("span", "sbar"); var fill = el("i"); fill.style.width = Math.min(100, r.total) + "%"; bar.appendChild(fill); tdS.appendChild(bar);
      if (r.total >= 35) tdS.classList.add("hi"); else if (r.total >= 22) tdS.classList.add("mid");
      tr.appendChild(tdS);
      var tdW = el("td", "why");
      tdW.appendChild(el("div", null, reasonSentence(r.factors)));
      var chips = el("div", "chips");
      r.factors.forEach(function (f) { chips.appendChild(el("span", "chip " + (f.kind === "특성" ? "t" : f.kind === "요청" ? "r" : "i"), f.name + " +" + f.pts)); });
      tdW.appendChild(chips); tr.appendChild(tdW);
      tr.appendChild(el("td", "small", memberText(r.h)));
      tb.appendChild(tr);
    });
    renderSummary();
  }
  function renderSummary() {
    var reqN = rows.filter(function (r) { return r.h.request; }).length;
    var hi = rows.filter(function (r) { return r.total >= 35; }).length;
    $("listSummary").textContent = "위기 신호가 있는 가구 " + rows.length + "곳(전체 가상 가구 " + D.households.length +
      "곳) · 35점 이상 " + hi + "곳 · 국민 요청 " + reqN + "건 · 경로에 담은 가구 " + picked.length + "곳";
  }
  function renderWeights() {
    var g = $("weightGrid"); g.textContent = "";
    D.indicators.concat(D.traits).forEach(function (d) {
      var lab = el("label"); lab.appendChild(el("span", null, d.name + (d.key === "health_ins_arrears" ? "(개월당)" : "")));
      var inp = el("input"); inp.type = "number"; inp.min = 0; inp.max = 30; inp.value = weights[d.key];
      inp.addEventListener("change", function () { weights[d.key] = Math.max(0, +inp.value || 0); lsSet(LS_W, weights); rebuild(); renderList(); });
      lab.appendChild(inp); g.appendChild(lab);
    });
    var reset = el("button", "ghost", "기본값으로"); reset.type = "button";
    reset.addEventListener("click", function () { initWeights(true); renderWeights(); rebuild(); renderList(); });
    g.appendChild(reset);
  }
  function initWeights(force) {
    var saved = force ? null : lsGet(LS_W, null);
    weights = {};
    D.indicators.concat(D.traits).forEach(function (d) { weights[d.key] = saved && saved[d.key] != null ? saved[d.key] : d.weight; });
    lsSet(LS_W, weights);
  }

  // ── ④ 경로 ─────────────────────────────────────────────
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) * DETOUR; }
  function planRoute(stops, ret) {
    var office = D.meta.office, groups = {};
    stops.forEach(function (s) { (groups[s.h.area] = groups[s.h.area] || []).push(s); });
    var areaNames = Object.keys(groups), order = [], cur = office;
    // 읍면 순서: 현재 위치에서 가장 가까운 읍면 중심부터
    while (areaNames.length) {
      areaNames.sort(function (a, b) {
        var ca = areaByName(a) || groups[a][0].h, cb = areaByName(b) || groups[b][0].h;
        return dist(cur, ca) - dist(cur, cb);
      });
      var an = areaNames.shift(), left = groups[an].slice();
      while (left.length) { // 읍면 안: 가까운 이웃 순
        left.sort(function (a, b) { return dist(cur, a.h) - dist(cur, b.h); });
        var nx = left.shift(); order.push(nx); cur = nx.h;
      }
    }
    return { order: order, km: pathKm(order, ret) };
  }
  function pathKm(order, ret) {
    var office = D.meta.office, cur = office, km = 0;
    order.forEach(function (s) { km += dist(cur, s.h); cur = s.h; });
    if (ret && order.length) km += dist(cur, office);
    return km;
  }
  function svg(tag, attrs, text) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function renderRoute() {
    var ret = $("routeReturn").checked;
    var stops = picked.map(rowById).filter(Boolean);
    var plan = planRoute(stops, ret);
    var naive = pathKm(stops.slice().sort(function (a, b) { return a.rank - b.rank; }), ret);
    var hours = plan.km / KMH + stops.length * VISIT_MIN / 60;
    $("routeStat").textContent = stops.length
      ? "방문 " + stops.length + "곳 · 이동 " + plan.km.toFixed(1) + "km(추정) · 점수 순으로 돌 때 " + naive.toFixed(1) +
        "km → " + Math.max(0, naive - plan.km).toFixed(1) + "km 줄어듦 · 예상 " + hours.toFixed(1) + "시간"
      : "명단에서 방문할 가구를 담아 주세요.";

    var m = $("map"); m.textContent = "";
    D.areas.forEach(function (a) {
      m.appendChild(svg("circle", { cx: a.x, cy: -a.y, r: a.kind === "동" ? 1.2 : a.kind === "읍" ? 2.6 : 3.2, class: "area" }));
      m.appendChild(svg("text", { x: a.x, y: -a.y - (a.code === "A" ? 3.8 : 5.4), class: "alabel" }, a.name));
    });
    D.households.forEach(function (h) { m.appendChild(svg("circle", { cx: h.x, cy: -h.y, r: 0.25, class: "hh" })); });
    var pts = [D.meta.office].concat(plan.order.map(function (s) { return s.h; }));
    if (ret && plan.order.length) pts.push(D.meta.office);
    m.appendChild(svg("polyline", { points: pts.map(function (p) { return p.x + "," + (-p.y); }).join(" "), class: "path" }));
    m.appendChild(svg("rect", { x: -0.9, y: -0.9, width: 1.8, height: 1.8, class: "office" }));
    m.appendChild(svg("text", { x: 0, y: 2.4, class: "olabel" }, "시청"));
    plan.order.forEach(function (s, i) {
      var g = svg("g", { class: "stop" + (s.h.request ? " req" : "") });
      g.appendChild(svg("circle", { cx: s.h.x, cy: -s.h.y, r: 0.95 }));
      g.appendChild(svg("text", { x: s.h.x, y: -s.h.y + 0.42 }, i + 1));
      var t = svg("title", {}, (i + 1) + ". " + s.h.label + " · " + s.h.area + " · " + s.total + "점"); g.appendChild(t);
      m.appendChild(g);
    });
    // 축척
    m.appendChild(svg("line", { x1: -22, y1: 22, x2: -17, y2: 22, class: "scale" }));
    m.appendChild(svg("text", { x: -19.5, y: 21.2, class: "olabel" }, "직선 5km"));

    var ol = $("routeList"); ol.textContent = "";
    var lastArea = null, cur = D.meta.office;
    plan.order.forEach(function (s, i) {
      if (s.h.area !== lastArea) { ol.appendChild(el("li", "grp", s.h.area)); lastArea = s.h.area; }
      var li = el("li", "stop" + (s.h.request ? " req" : ""));
      li.appendChild(el("span", "no", i + 1));
      li.appendChild(el("b", null, s.h.label));
      li.appendChild(el("span", "small", s.total + "점 · 앞 지점에서 " + dist(cur, s.h).toFixed(1) + "km"));
      var go = el("button", "ghost mini", "상담 기록"); go.type = "button";
      go.addEventListener("click", function () { $("recHouse").value = s.h.id; location.hash = "#record"; });
      li.appendChild(go);
      ol.appendChild(li); cur = s.h;
    });
  }

  // ── ⑤ 상담 기록 ─────────────────────────────────────────
  var lastResult = null;
  function fillRecHouses() {
    var sel = $("recHouse"), keep = sel.value; sel.textContent = "";
    var ids = picked.length ? picked : rows.slice(0, 20).map(function (r) { return r.h.id; });
    ids.forEach(function (id) { var r = rowById(id); if (r) { var o = el("option", null, r.h.label + " · " + r.h.area + " · " + r.total + "점"); o.value = id; sel.appendChild(o); } });
    if (keep && rowById(keep)) {
      if (![].some.call(sel.options, function (o) { return o.value === keep; })) { var r = rowById(keep); var o = el("option", null, r.h.label + " · " + r.h.area); o.value = keep; sel.appendChild(o); }
      sel.value = keep;
    }
    showHouseInfo();
  }
  function showHouseInfo() {
    var r = rowById($("recHouse").value), box = $("recHouseInfo"); box.textContent = "";
    if (!r) return;
    box.appendChild(el("div", null, memberText(r.h)));
    var chips = el("div", "chips");
    r.factors.forEach(function (f) { chips.appendChild(el("span", "chip " + (f.kind === "특성" ? "t" : f.kind === "요청" ? "r" : "i"), f.name)); });
    box.appendChild(chips);
  }
  function sampleScript(r) {
    var h = r.h, lines = ["(가상 상담 대본) 담당자: 안녕하세요, 행정복지센터 맞춤형복지팀입니다. 요즘 어떻게 지내세요?"];
    var say = {
      power_cut: "전기가 끊겨서 밤에는 불을 못 켜요.", water_cut: "수도가 끊겨서 물을 길어다 써요.",
      gas_cut: "가스가 끊겨서 보일러를 못 돌려요. 추워요.", health_ins_arrears: "건강보험료가 몇 달 밀렸어요.",
      telecom_arrears: "전화 요금도 밀려서 곧 끊긴대요.", mgmt_fee_arrears: "관리비가 밀려서 독촉장이 왔어요.",
      rent_arrears: "월세가 밀려서 집주인이 나가라고 할까 봐 걱정이에요.", medical_overspend: "허리가 아파서 병원에 다니는데 약값이 너무 많이 들어요.",
      job_loss: "다니던 공장에서 일을 그만두게 됐어요. 일자리를 찾고 있어요.", loan_overdue: "카드값이랑 대출 이자 독촉 전화가 계속 와요.",
      benefit_stopped: "받던 지원이 끊겼는데 이유를 모르겠어요. 생활비가 없어요."
    };
    Object.keys(say).forEach(function (k) { if (h.indicators[k]) lines.push("주민: " + say[k]); });
    if (h.single && h.members[0].age >= 75) lines.push("주민: 혼자 사니까 끼니를 거를 때가 많아요. 말동무도 없고요.");
    if (h.disability) lines.push("주민: 거동이 불편해서 밖에 잘 못 나가요.");
    if (h.request) lines.push("주민: " + (h.request.situation || "도움을 요청했어요."));
    lines.push("담당자: 말씀 잘 들었습니다. 받으실 수 있는 지원을 같이 찾아보겠습니다.");
    return lines.join("\n");
  }
  var recog = null;
  function toggleMic() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { $("micState").textContent = "이 브라우저는 음성인식을 지원하지 않습니다(Edge·Chrome 권장)."; return; }
    if (recog) { recog.stop(); return; }
    recog = new SR(); recog.lang = "ko-KR"; recog.continuous = true; recog.interimResults = false;
    recog.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) $("recText").value += (($("recText").value ? "\n" : "") + "주민: " + e.results[i][0].transcript.trim());
    };
    recog.onerror = function (e) { $("micState").textContent = "음성인식 오류: " + e.error; };
    recog.onend = function () { recog = null; $("btnMic").textContent = "음성으로 받아쓰기"; if ($("micState").textContent === "듣는 중…") $("micState").textContent = "받아쓰기 끝"; };
    recog.start(); $("btnMic").textContent = "받아쓰기 멈추기"; $("micState").textContent = "듣는 중…";
  }
  function summarize() {
    var r = rowById($("recHouse").value); if (!r) return;
    var text = $("recText").value;
    var out = $("recResult"); out.textContent = ""; out.appendChild(el("p", "muted", "요약하는 중…"));
    AI.summarize(text, { label: r.h.label, factors: r.factors.filter(function (f) { return f.kind !== "요청"; }), services: SERVICES })
      .then(function (res) {
        lastResult = { res: res, row: r, text: text };
        out.textContent = "";
        if (res.fallback) out.appendChild(el("p", "warn", "AI 호출 실패로 규칙 기반 요약으로 대신했습니다(" + res.fallback + ")."));
        out.appendChild(el("p", "src", res.source === "ai" ? "AI 요약" : "규칙 기반 요약(AI 연결 전 시연 모드)"));
        if (res.urgent) out.appendChild(el("p", "urgent", "긴급: 오늘 안에 긴급복지·정신건강 연계를 검토하세요."));
        out.appendChild(el("p", null, res.summary));
        var dl = el("dl");
        dl.appendChild(el("dt", null, "쟁점")); dl.appendChild(el("dd", null, (res.issues || []).join(", ") || "—"));
        dl.appendChild(el("dt", null, "욕구")); dl.appendChild(el("dd", null, (res.needs || []).join(", ") || "—"));
        out.appendChild(dl);
        out.appendChild(el("h4", null, "연계 후보"));
        var ul = el("ul", "svc");
        (res.serviceIds || []).forEach(function (id, i) {
          var s = svcById(id); if (!s) return;
          var li = el("li"), lab = el("label"), cb = el("input"); cb.type = "checkbox"; cb.value = id; cb.checked = i < 3;
          lab.appendChild(cb); lab.appendChild(el("b", null, " " + s.name));
          lab.appendChild(el("span", "small", " · " + (s.org || "") + ((res.why && res.why[id]) ? " · 맞는 욕구: " + res.why[id].join(", ") : "")));
          if (res.reasons && res.reasons[id]) lab.appendChild(el("span", "small muted", " — " + res.reasons[id]));
          li.appendChild(lab); ul.appendChild(li);
        });
        if (!ul.children.length) ul.appendChild(el("li", "muted", "맞는 서비스를 찾지 못했습니다. 통합사례관리 회의에 올려 보세요."));
        out.appendChild(ul);
        out.appendChild(el("p", "small muted", "서비스 목록: " + servicesSource));
        $("btnLink").hidden = !(res.serviceIds || []).length;
      });
  }
  function saveLink() {
    if (!lastResult) return;
    var ids = [].map.call(document.querySelectorAll("#recResult .svc input:checked"), function (c) { return c.value; });
    if (!ids.length) return;
    var links = lsGet(LS_LINK, []);
    links.unshift({ id: "L" + Date.now(), at: new Date().toISOString(), householdId: lastResult.row.h.id,
      label: lastResult.row.h.label, area: lastResult.row.h.area, serviceIds: ids, summary: lastResult.res.summary,
      source: lastResult.res.source });
    lsSet(LS_LINK, links.slice(0, 200));
    var req = lastResult.row.h.request;
    if (req && req.id && req.status === "new") REQ.setStatus(req.id, "seen", "officer", "연계 후보 " + ids.length + "건 저장");
    $("btnLink").hidden = true;
    renderLinks();
  }
  function renderLinks() {
    var links = lsGet(LS_LINK, []), ul = $("linkList"); ul.textContent = "";
    $("linkCount").textContent = links.length ? "(" + links.length + "건)" : "";
    links.slice(0, 8).forEach(function (l) {
      var li = el("li");
      li.appendChild(el("b", null, l.label + " · " + l.area));
      li.appendChild(el("span", "small", " " + l.at.slice(5, 16).replace("T", " ") + " → " + l.serviceIds.map(function (id) { var s = svcById(id); return s ? s.name : id; }).join(", ")));
      ul.appendChild(li);
    });
    if (!links.length) ul.appendChild(el("li", "muted", "아직 없습니다."));
  }

  // ── ⑥ 수요 보드 (집계·막대 모양은 상주 정책플랫폼 관리자 stats.js 의 tally·renderRank 방식) ──
  function boardData() {
    var cell = {}; // area|sid → {asked, applied, linked}
    function c(a, s) { var k = a + "|" + s; return cell[k] || (cell[k] = { asked: 0, applied: 0, linked: 0 }); }
    D.demand.forEach(function (d) { var x = c(d.area, d.serviceId); x.asked += d.asked; x.applied += d.applied; });
    REQ.list().forEach(function (r) { if (r.status === "cancelled") return; var ar = reqRegion(r); reqMatchedIds(r).forEach(function (sid) { var b = boardId(sid); if (b && areaByName(ar)) c(ar, b).asked += 1; }); });
    lsGet(LS_LINK, []).forEach(function (l) { l.serviceIds.forEach(function (sid) { var b = boardId(sid); if (b && areaByName(l.area)) c(l.area, b).linked += 1; }); });
    return cell;
  }
  // 수요 보드는 내장 12종 기준. 국민 창구 ID(C0xx)는 같은 이름의 내장 서비스로 바꿔 센다
  function boardId(sid) {
    for (var i = 0; i < BUILTIN_SERVICES.length; i++) { var b = BUILTIN_SERVICES[i]; if (b.id === sid || b.citizenId === sid) return b.id; }
    return null;
  }
  function gap(x) { return Math.max(0, x.asked - x.applied - x.linked); }
  function renderRank(ulId, items, unit) {
    var ul = $(ulId); ul.textContent = "";
    var total = items.reduce(function (s, x) { return s + x.n; }, 0);
    items.sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name, "ko"); });
    var max = items.length ? items[0].n || 1 : 1;
    items.forEach(function (it, i) {
      var li = el("li", i === 0 && it.n > 0 ? "rank-top" : "");
      li.appendChild(el("span", "rank-nm", it.name));
      li.appendChild(el("b", "rank-n", it.n + "건"));
      li.appendChild(el("em", "rank-p", (total ? Math.round(it.n / total * 100) : 0) + "%"));
      var bar = el("span", "rank-bar"); bar.setAttribute("aria-hidden", "true");
      var fill = el("i"); fill.style.width = (it.n ? Math.max(3, Math.round(it.n / max * 100)) : 0) + "%";
      bar.appendChild(fill); li.appendChild(bar); ul.appendChild(li);
    });
  }
  function renderBoard() {
    var cell = boardData(), svcIds = BUILTIN_SERVICES.map(function (s) { return s.id; });
    renderRank("rankSvc", svcIds.map(function (sid) {
      return { name: svcById(sid).name, n: D.areas.reduce(function (s, a) { var x = cell[a.name + "|" + sid]; return s + (x ? gap(x) : 0); }, 0) };
    }), "서비스");
    renderRank("rankArea", D.areas.map(function (a) {
      return { name: a.name, n: svcIds.reduce(function (s, sid) { var x = cell[a.name + "|" + sid]; return s + (x ? gap(x) : 0); }, 0) };
    }), "읍면");
    var t = $("boardTable"); t.textContent = "";
    var hr = el("tr"); hr.appendChild(el("th", null, "읍면"));
    svcIds.forEach(function (sid) { var th = el("th", "vh", svcById(sid).name); hr.appendChild(th); });
    var th = el("thead"); th.appendChild(hr); t.appendChild(th);
    var maxGap = 1; Object.keys(cell).forEach(function (k) { maxGap = Math.max(maxGap, gap(cell[k])); });
    var tb = el("tbody");
    D.areas.forEach(function (a) {
      var tr = el("tr"); tr.appendChild(el("th", null, a.name));
      svcIds.forEach(function (sid) {
        var x = cell[a.name + "|" + sid] || { asked: 0, applied: 0, linked: 0 }, g = gap(x);
        var td = el("td", "num", g + " / " + x.asked);
        td.style.setProperty("--h", (g / maxGap).toFixed(2));
        td.title = a.name + " · " + svcById(sid).name + " — 문의 " + x.asked + ", 신청 " + x.applied + ", 연계 " + x.linked;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
  }

  // ── 탭·초기화 ──────────────────────────────────────────
  function show() {
    var tab = (location.hash || "#list").slice(1);
    if (["list", "route", "record", "board"].indexOf(tab) < 0) tab = "list";
    ["list", "route", "record", "board"].forEach(function (t) { $("tab-" + t).hidden = t !== tab; });
    [].forEach.call(document.querySelectorAll(".tabs a"), function (a) { a.classList.toggle("on", a.dataset.tab === tab); });
    if (tab === "list") renderList();
    if (tab === "route") renderRoute();
    if (tab === "record") { fillRecHouses(); renderLinks(); }
    if (tab === "board") renderBoard();
  }
  function loadServices() {
    // 국민 창구가 만든 서비스 목록이 있으면 합친다(없으면 내장 목록만)
    var srcs = (C.serviceSources || ["data/services.sample.json"]).map(function (x) { return "../citizen/" + x; });
    var used = "";
    function tryAt(i) {
      if (i >= srcs.length) return Promise.reject(0);
      return fetch(srcs[i]).then(function (r) { if (!r.ok) throw 0; used = srcs[i].replace("../", ""); return r.json(); })
        .catch(function () { return tryAt(i + 1); });
    }
    return tryAt(0)
      .then(function (j) {
        var arr = Array.isArray(j) ? j : (j.services || []), added = 0;
        arr.forEach(function (s) {
          if (!s || !s.id || svcById(s.id)) return;
          var same = SERVICES.filter(function (b) { return normName(b.name) === normName(s.name); })[0];
          if (same) { same.citizenId = s.id; return; } // 같은 서비스는 내장 쪽 하나로(수요 보드 ID 유지)
          var tags = (s.tags || []).slice();
          function tagFrom(text) { Object.keys(TAG_WORDS).forEach(function (t) { if (tags.indexOf(t) < 0 && TAG_WORDS[t].test(text)) tags.push(t); }); }
          tagFrom(s.name || "");
          if (!tags.length) tagFrom([s.target, s.support].join(" "));
          SERVICES.push({ id: s.id, name: s.name || s.id, org: s.provider || s.org || "", tags: tags }); added++;
        });
        if (added) servicesSource = "내장 12종 + 국민 창구 목록 " + added + "종(" + used + ")";
      }).catch(function () { /* 아직 없음 */ });
  }
  function demoRequest() {
    var samples = [
      { proxy: { isProxy: true, relation: "어머니" }, situation: "시골에 혼자 계신 어머니 집 보일러가 고장 나서 추운데 가스비도 밀렸어요", ids: ["S04", "S05"], region: "화남면", tags: ["alone", "energy", "senior"] },
      { proxy: { isProxy: false, relation: "" }, situation: "공장 일을 그만두고 월세가 두 달 밀렸어요", ids: ["S03", "S07", "S02"], region: "남원동", tags: ["unemployed", "housing"] },
      { proxy: { isProxy: true, relation: "아버지" }, situation: "아버지가 병원비 때문에 약을 끊으셨어요", ids: ["S06", "S02"], region: "함창읍", tags: ["sick", "lowIncome"] }
    ];
    var s = samples[REQ.list().length % samples.length];
    REQ.add({
      region: s.region, contactPref: "visit", displayName: "시연 요청", proxy: s.proxy,
      subject: { age: null, ageBand: null, tags: s.tags, childAges: [] },
      situation: s.situation, summary: "",
      matched: s.ids.map(function (id) { var x = svcById(id); return { id: id, name: x ? x.name : id, reason: "" }; }),
      urgent: false, mode: "rules", demo: true,
      consent: { agreed: true, at: new Date().toISOString(), text: "공무원 창구 «시연 요청 넣기»로 만든 가상 요청" }
    });
    rebuild(); renderList();
  }
  // 읍면 정본(shared/config.js regions)과 합성 가구 자료가 어긋나면 알린다
  function checkRegions() {
    var want = (C.regions || []).join(","), have = D.areas.map(function (a) { return a.name; }).join(",");
    if (want !== have && window.console) console.warn("[닿음] 읍면 불일치 — config.regions:", want, "/ households.json:", have);
  }

  function init() {
    var mode = AI.mode() === "ai" ? "ai" : "rule";
    $("aiMode").textContent = mode === "ai" ? "AI 연결됨" : "AI 연결 전 시연 모드";
    $("aiMode").className = "mode " + mode;
    checkRegions();
    D.areas.forEach(function (a) { var o = el("option", null, a.name); o.value = a.name; $("fArea").appendChild(o); });
    initWeights(false);
    rebuild();
    picked = lsGet(LS_PICK, null);
    if (!Array.isArray(picked) || !picked.length) pickTop(); else rebuild();
    $("fArea").addEventListener("change", renderList);
    $("fTop").addEventListener("change", renderList);
    $("btnPickTop").addEventListener("click", function () { pickTop(); renderList(); });
    $("btnDemoReq").addEventListener("click", demoRequest);
    $("btnWeights").addEventListener("click", function () { var f = $("formula"); f.open = true; $("weightGrid").hidden = false; renderWeights(); });
    $("routeReturn").addEventListener("change", renderRoute);
    $("recHouse").addEventListener("change", function () { showHouseInfo(); $("recText").value = ""; $("btnLink").hidden = true; });
    $("btnSample").addEventListener("click", function () { var r = rowById($("recHouse").value); if (r) $("recText").value = sampleScript(r); });
    $("btnMic").addEventListener("click", toggleMic);
    $("btnSummarize").addEventListener("click", summarize);
    $("btnLink").addEventListener("click", saveLink);
    window.addEventListener("hashchange", show);
    REQ.onChange(function () { rebuild(); show(); }); // 국민 창구 탭에서 요청이 들어오면 반영
    show();
  }

  Promise.all([
    fetch("../data/households.json").then(function (r) { return r.json(); }).then(function (j) { D = j; }),
    loadServices()
  ]).then(init).catch(function (e) {
    document.querySelector("main").textContent = "데이터를 불러오지 못했습니다: " + e + " (http 서버로 열어 주세요)";
  });
})();
