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

  // ── 명단 사유(정보원 위기 정보 → 문장·꼬리표, 순서에는 쓰지 않음) ───────────────────────────────────────────────
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
    if (h.request) f.unshift({ key: "request", name: "주민 신호", pts: REQUEST_BONUS, reason: FX.signals ? FX.signals.text(h.request).replace("(긴급 낱말)", "") + "(주민 창구)" : "본인 또는 보호자가 도움을 요청했습니다", kind: "요청" });
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
  var FX = window.DaeumFeatures;
  function requestRows() {
    // 명단 가구와 이어진 요청(householdId)은 그 가구의 «주민 요청» 신호로만 보이고, 따로 줄을 만들지 않는다
    return activeRequests().filter(function (r) { return !r.householdId; }).map(function (r, i) {
      var a = areaByName(reqRegion(r)) || { name: reqRegion(r) || "미상", code: "R", x: 0, y: 0 };
      var ind = {}; D.indicators.forEach(function (d) { ind[d.key] = false; });
      var s = String(r.situation || "");
      REQ_HINT.forEach(function (h) { if (h[0].test(s)) ind[h[1]] = true; });
      var ang = (i * 2.399) % (2 * Math.PI);
      var id = String(r.id || "REQ-" + (i + 1));
      var sk = FX.signals ? FX.signals.of(r) : "self";
      var who = sk === "family" ? " (" + (r.proxy.relation || "가족") + " 대신 요청)" : sk === "neighbor" && r.place ? " · " + String(r.place).slice(0, 20) : "";
      return {
        id: id, label: (FX.signals ? FX.signals.SHORT[sk] : "주민 신호") + " " + id + who, area: a.name, areaCode: a.code,
        x: +(a.x + 1.2 * Math.cos(ang)).toFixed(2), y: +(a.y + 1.2 * Math.sin(ang)).toFixed(2),
        members: [{ role: "본인", age: 0 }], single: false, disability: false, daysSinceContact: 0,
        indicators: ind, request: r, matched: reqMatchedIds(r)
      };
    });
  }

  function rebuild() {
    var all = D.households.concat(requestRows());
    // 명단 = 정보원이 내려 준 위기 정보가 있는 가구(점수는 매기지 않는다 — S6h·S9a-2 결정).
    // 순서 = 담당자가 앞에 둔 집 → 지역 신호(주민 요청·이웃 제보·지난 시도)가 있는 집 → 원래 명단 순. 최종 결정은 담당자.
    var listed = all.map(function (h) { var s = score(h); return { h: h, total: s.total, factors: s.factors }; })
      .filter(function (r) { return r.total > 0; });
    var byId = {}; listed.forEach(function (r) { byId[r.h.id] = r; });
    var o = FX.households.order({ households: listed.map(function (r) { return r.h; }), requests: REQ.list(),
      attempts: FX.store.get("attempts", []), tips: FX.store.get("tips", []), officerOrder: FX.store.get("order", []) });
    rows = o.items.map(function (x) { var r = byId[x.id]; r.signals = x.signals; r.group = x.group; r.pinned = x.pinned; return r; });
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
    var sel = $("fArea");
    // 고른 값이 목록에 없는 곳(가구 0곳으로 숨겨진 읍면동)이면 «전체»로 되돌린다
    if (sel.selectedIndex < 0) sel.value = "";
    var area = sel.value, top = +$("fTop").value;
    var list = rows.filter(function (r) { return !area || r.h.area === area; }).slice(0, top);
    var tb = $("listTable").tBodies[0];
    tb.textContent = "";
    list.forEach(function (r) {
      var hasReq = (r.signals || []).some(function (x) { return x.kind === "request"; });
      var tr = el("tr", hasReq ? "req" : "");
      var td0 = el("td", "c-pick"), pk = el("label", "pick"), cb = el("input"); cb.type = "checkbox"; cb.checked = picked.indexOf(r.h.id) >= 0; cb.setAttribute("data-h", "selection");
      cb.setAttribute("aria-label", r.h.label + " 경로에 담기");
      cb.addEventListener("change", function () {
        if (cb.checked) { if (picked.indexOf(r.h.id) < 0) picked.push(r.h.id); }
        else picked = picked.filter(function (x) { return x !== r.h.id; });
        lsSet(LS_PICK, picked); renderSummary();
      });
      pk.appendChild(cb); td0.appendChild(pk); tr.appendChild(td0);
      tr.appendChild(el("td", "num c-rank", r.rank < 10 ? "0" + r.rank : r.rank));
      var tdL = el("td", "c-name"); tdL.appendChild(el("b", null, r.h.label)); if (hasReq) tdL.appendChild(el("span", "tag req", "주민 신호"));
      tdL.appendChild(el("span", "small area-sm", r.h.area)); tr.appendChild(tdL);
      tr.appendChild(el("td", "c-area", r.h.area));
      // 순서 고정(담당자 결정) — 점수 칸·막대는 없앴다
      var tdS = el("td", "c-score"), pin = el("button", "ghost mini", r.pinned ? "고정 풀기" : "앞으로");
      pin.type = "button"; pin.setAttribute("data-h", "light"); pin.setAttribute("aria-pressed", String(!!r.pinned));
      pin.setAttribute("aria-label", r.h.label + (r.pinned ? " 앞 순서 고정 풀기" : " 명단 앞으로 옮기기"));
      pin.addEventListener("click", function () { FX.store.set("order", FX.households.togglePin(FX.store.get("order", []), r.h.id)); rebuild(); renderList(); emit("show", { tab: "list" }); });
      tdS.appendChild(pin); tr.appendChild(tdS);
      var tdW = el("td", "why c-why");
      if ((r.signals || []).length) {
        var sg = el("div", "chips");
        r.signals.forEach(function (x) { sg.appendChild(el("span", "chip r", (x.kind === "request" ? "요청 · " : x.kind === "tip" ? "제보 · " : "시도 · ") + x.text)); });
        tdW.appendChild(sg);
      }
      tdW.appendChild(el("div", null, reasonSentence(r.factors)));
      var chips = el("div", "chips");
      r.factors.filter(function (f) { return f.kind !== "요청"; }).forEach(function (f) { chips.appendChild(el("span", "chip " + (f.kind === "특성" ? "t" : "i"), f.name)); });
      tdW.appendChild(chips); tr.appendChild(tdW);
      tr.appendChild(el("td", "small c-mem", memberText(r.h)));
      tb.appendChild(tr);
    });
    renderSummary();
  }
  function renderSummary() {
    var reqN = rows.filter(function (r) { return (r.signals || []).some(function (x) { return x.kind === "request"; }); }).length;
    var sigN = rows.filter(function (r) { return r.group === "signal"; }).length;
    $("listSummary").textContent = "발굴 명단 " + rows.length + "곳(전체 가상 가구 " + D.households.length +
      "곳) · 지역 신호 있음 " + sigN + "곳 · 주민 신호 " + reqN + "곳 · 경로에 담은 가구 " + picked.length + "곳";
  }
  function initWeights(force) {
    var saved = force ? null : lsGet(LS_W, null);
    weights = {};
    D.indicators.concat(D.traits).forEach(function (d) { weights[d.key] = saved && saved[d.key] != null ? saved[d.key] : d.weight; });
    lsSet(LS_W, weights);
  }

  // ── ④ 경로 — 네이버 지도 + 도로 기준 순서 + 하루 시각표(S9c) ─────────
  var RP = window.DaeumRoutePlan, RM = window.DaeumRouteMap, LS_ROUTE = "daeum.officer.route";
  var route = lsGet(LS_ROUTE, null) || {}; // { ids:[순서], ret, road:{key, legs, path, s, m} }
  var roadMsg = { text: "", kind: "" }, roadBusy = false;
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) * DETOUR; }
  function stopPt(r) { return { id: r.h.id, x: r.h.x, y: r.h.y, r: r }; }
  function planRoute(stops) {
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
    return order;
  }
  function pathKm(order, ret) { return RP.tourKm(order.map(stopPt), D.meta.office, ret); }
  /** 담은 가구가 바뀌면 근사 최적 순서로 새로 짜고, 같으면 사람이 바꾼 순서를 지킨다 */
  function routeStops(ret) {
    var stops = picked.map(rowById).filter(Boolean), want = stops.map(function (r) { return r.h.id; }).sort().join(",");
    var have = (route.ids || []).slice().sort().join(",");
    if (want !== have || route.ret !== ret) {
      var c = RP.candidates(stops.map(stopPt), D.meta.office, ret, planRoute(stops).map(stopPt));
      route = { ids: c.length ? c[0].map(function (p) { return p.id; }) : [], ret: ret, road: null };
      lsSet(LS_ROUTE, route);
    }
    return route.ids.map(rowById).filter(Boolean);
  }
  function roadFor(order, ret) {
    var key = RP.cacheKey(order.map(function (r) { return r.h; }), ret);
    if (route.road && route.road.key === key) return route.road;
    var c = RM && RM.cacheGet(key); return c ? Object.assign({ key: key }, c) : null;
  }
  function ptsFor(order, ret) {
    var o = RP.toLatLng(D.meta.office), pts = [[o.lng, o.lat]];
    order.forEach(function (r) { var p = RP.toLatLng(r.h); pts.push([p.lng, p.lat]); });
    if (ret && order.length) pts.push([o.lng, o.lat]);
    return pts;
  }
  var ROAD_WHY = { "no-key": "서버에 네이버 길찾기 키를 넣는 중입니다", limit: "오늘 도로 경로 조회 한도에 닿았습니다", network: "도로 경로 서버에 닿지 못했습니다",
    "no-endpoint": "도로 경로 서버 주소가 없습니다" };
  /** «도로 기준으로 순서 짜기» — 순서 후보(최대 2개)마다 도로 시간을 받아 가장 짧은 것을 고른다. 같은 조합은 보관분을 쓴다. */
  function roadOptimize() {
    if (roadBusy || !RM) return;
    var ret = $("routeReturn").checked, stops = routeStops(ret);
    if (!stops.length) return;
    if (stops.length > RP.MAX_ROAD_STOPS) { roadMsg = { text: "도로 경로는 한 번에 " + RP.MAX_ROAD_STOPS + "곳까지 받습니다. 담은 가구를 줄여 주세요.", kind: "warn" }; renderRoute(); return; }
    var cands = RP.candidates(stops.map(stopPt), D.meta.office, ret, planRoute(stops).map(stopPt)).slice(0, 2);
    var cur = stops.map(stopPt); if (!cands.some(function (c) { return RP.cacheKey(c, ret) === RP.cacheKey(cur, ret); }) && cands.length < 2) cands.push(cur);
    roadBusy = true; roadMsg = { text: "네이버 길찾기로 도로 시간을 받는 중…", kind: "" }; renderRoute();
    var results = [];
    cands.reduce(function (p, c) {
      return p.then(function () {
        var order = c.map(function (x) { return x.r; }), key = RP.cacheKey(c, ret);
        return RM.road(key, ptsFor(order, ret)).then(function (j) { results.push({ order: order, key: key, j: j }); });
      });
    }, Promise.resolve()).then(function () {
      results.sort(function (a, b) { return a.j.s - b.j.s; });
      var best = results[0];
      route = { ids: best.order.map(function (r) { return r.h.id; }), ret: ret, road: { key: best.key, legs: best.j.legs, path: best.j.path, s: best.j.s, m: best.j.m } };
      lsSet(LS_ROUTE, route);
      var gain = results.length > 1 ? Math.round((results[results.length - 1].j.s - best.j.s) / 60) : 0;
      roadMsg = { text: "도로 경로(네이버 길찾기) 기준 순서입니다 — 후보 " + results.length + "개 중 가장 빠른 순서" + (gain > 0 ? "(다른 후보보다 " + gain + "분 빠름)" : "") +
        (results.every(function (x) { return x.j.cached; }) ? " · 보관된 결과 사용" : ""), kind: "ok" };
      if (window.DaeumUI) DaeumUI.haptic("success");
    }).catch(function (e) {
      var why = ROAD_WHY[e && e.code] || ("도로 경로를 받지 못했습니다(" + (e && e.code || "오류") + ")");
      if (window.console) console.warn("[닿음 경로] 도로 경로 실패 —", e);
      roadMsg = { text: "도로 경로 준비 중 — " + why + ". 지금은 직선거리 근사 순서·시간입니다.", kind: "warn" };
    }).then(function () { roadBusy = false; renderRoute(); });
  }
  function moveStop(from, to, focusIdx) {
    var ids = RP.move(route.ids, from, to); if (ids.join() === route.ids.join()) return;
    route.ids = ids; route.road = null; lsSet(LS_ROUTE, route);
    roadMsg = { text: "순서를 바꿨습니다 — 시각표는 직선거리 근사로 다시 계산했습니다. 이 순서의 실제 도로 시간은 시각표 아래 «이 순서로 도로 시간 받기».", kind: "" };
    if (window.DaeumUI) DaeumUI.haptic("selection");
    renderRoute();
    if (focusIdx != null) { var hs = document.querySelectorAll("#routeList .grip"); if (hs[focusIdx]) hs[focusIdx].focus(); }
  }
  /** 사람이 정한 순서 그대로 도로 시간만 받기(호출 1~2회) */
  function roadThisOrder() {
    if (roadBusy || !RM) return;
    var ret = $("routeReturn").checked, order = routeStops(ret);
    if (!order.length || order.length > RP.MAX_ROAD_STOPS) return;
    var key = RP.cacheKey(order.map(function (r) { return r.h; }), ret);
    roadBusy = true; roadMsg = { text: "이 순서의 도로 시간을 받는 중…", kind: "" }; renderRoute();
    RM.road(key, ptsFor(order, ret)).then(function (j) {
      route.road = { key: key, legs: j.legs, path: j.path, s: j.s, m: j.m }; lsSet(LS_ROUTE, route);
      roadMsg = { text: "도로 경로(네이버 길찾기) 기준 — 직접 정한 순서", kind: "ok" };
    }).catch(function (e) {
      if (window.console) console.warn("[닿음 경로] 도로 경로 실패 —", e);
      roadMsg = { text: "도로 경로 준비 중 — " + (ROAD_WHY[e && e.code] || "도로 경로를 받지 못했습니다") + ". 지금은 직선거리 근사입니다.", kind: "warn" };
    }).then(function () { roadBusy = false; renderRoute(); });
  }
  function svg(tag, attrs, text) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function drawSvg(order, ret) {
    var m = $("map"); m.textContent = "";
    // 가구가 한 읍면동(남원동) 안에 모여 있으므로 보기 틀을 «시청 + 가구» 범위에 맞춘다(S9c, 10-30 미르)
    var xs = [D.meta.office.x], ys = [-D.meta.office.y];
    D.households.forEach(function (h) { xs.push(h.x); ys.push(-h.y); });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var span = Math.max(x1 - x0, (y1 - y0) * 54 / 46, 4), pad = span * 0.14, W = span + pad * 2, H = W * 46 / 54;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, vx = cx - W / 2, vy = cy - H / 2, k = W / 54;
    m.setAttribute("viewBox", [vx, vy, W, H].map(function (v) { return +v.toFixed(3); }).join(" "));
    m.style.setProperty("--k", k.toFixed(4));
    D.areas.forEach(function (a) {
      if (a.x < vx - 2 || a.x > vx + W + 2 || -a.y < vy - 2 || -a.y > vy + H + 2) return;
      m.appendChild(svg("circle", { cx: a.x, cy: -a.y, r: (a.kind === "동" ? 1.2 : a.kind === "읍" ? 2.6 : 3.2) * k * 1.6, class: "area" }));
      m.appendChild(svg("text", { x: a.x, y: -a.y - 2.6 * k, class: "alabel" }, a.name));
    });
    D.households.forEach(function (h) { m.appendChild(svg("circle", { cx: h.x, cy: -h.y, r: 0.25 * k, class: "hh" })); });
    var pts = [D.meta.office].concat(order.map(function (s) { return s.h; }));
    if (ret && order.length) pts.push(D.meta.office);
    m.appendChild(svg("polyline", { points: pts.map(function (p) { return p.x + "," + (-p.y); }).join(" "), class: "path" }));
    var ox = D.meta.office.x, oy = -D.meta.office.y;
    m.appendChild(svg("rect", { x: ox - 0.9 * k, y: oy - 0.9 * k, width: 1.8 * k, height: 1.8 * k, class: "office" }));
    m.appendChild(svg("text", { x: ox, y: oy + 2.4 * k, class: "olabel" }, "시청"));
    // 가까운 집 번호 겹침 풀기 — 네이버 지도와 같은 계산(route_map.js spreadBy). 실제 자리엔 작은 점 + 지시선
    var off = RM && RM.spreadBy ? RM.spreadBy(order.map(function (s) { return { x: s.h.x, y: -s.h.y }; }), 2.5 * k) : order.map(function () { return [0, 0]; });
    order.forEach(function (s, i) {
      var g = svg("g", { class: "stop" + (s.h.request ? " req" : "") }), x = s.h.x + off[i][0], y = -s.h.y + off[i][1];
      if (off[i][0] || off[i][1]) {
        m.appendChild(svg("line", { x1: s.h.x, y1: -s.h.y, x2: x, y2: y, class: "lead", style: "stroke:var(--ink);stroke-opacity:.6;stroke-width:" + (0.12 * k).toFixed(3) }));
        m.appendChild(svg("circle", { cx: s.h.x, cy: -s.h.y, r: 0.3 * k, class: "lead-dot", style: "fill:var(--ink)" }));
      }
      g.appendChild(svg("circle", { cx: x, cy: y, r: 0.95 * k }));
      g.appendChild(svg("text", { x: x, y: y + 0.42 * k }, i + 1));
      g.appendChild(svg("title", {}, (i + 1) + ". " + s.h.label + " · " + s.h.area));
      m.appendChild(g);
    });
    var km = W > 20 ? 5 : 1, sx = vx + 2 * k, sy = vy + H - 2 * k;
    m.appendChild(svg("line", { x1: sx, y1: sy, x2: sx + km, y2: sy, class: "scale" }));
    m.appendChild(svg("text", { x: sx + km / 2, y: sy - 0.8 * k, class: "olabel" }, "직선 " + km + "km"));
  }
  var MAP_WHY = { auth: "지도 인증 실패", network: "지도 서버 연결 실패", timeout: "응답 늦음", "no-key": "지도 키 없음", "no-api": "지도 기능 없음" };
  function showMap(naverOk) { $("nmap").hidden = !naverOk; $("map").hidden = naverOk; }
  function drawMap(order, ret, road) {
    var go = function () {
      var o = RP.toLatLng(D.meta.office);
      var ok = RM.draw({ box: $("nmap"), office: { lat: o.lat, lng: o.lng, name: D.meta.office.name, short: "시청" }, ret: ret,
        color: getComputedStyle(document.documentElement).getPropertyValue("--acc").trim() || undefined,
        path: road && road.path, stops: order.map(function (r, i) { var p = RP.toLatLng(r.h); return { lat: p.lat, lng: p.lng, no: i + 1, label: r.h.label + " · " + r.h.area, req: !!r.h.request }; }) });
      if (!ok) drawSvg(order, ret);
      return ok;
    };
    if (!RM) { showMap(false); return drawSvg(order, ret); }
    if (RM.state.status === "ready") { showMap(true); if (!go()) showMap(false); return; }
    showMap(false); drawSvg(order, ret);
    RM.load().then(function () { if (RM.state.status === "ready" && $("tab-route") && !$("tab-route").hidden) renderRoute(); },
      function () { if ($("tab-route") && !$("tab-route").hidden) mapNote(); });
  }
  function mapNote() {
    var st = RM && RM.state, rr = $("routeRoad");
    if (st && st.status === "fail" && rr.textContent.indexOf("네이버 지도") < 0)
      rr.textContent += " 네이버 지도를 불러오지 못해 단순 지도로 보여 드립니다(" + (MAP_WHY[st.reason] || st.reason) + ").";
  }
  // O-06: 18시·8시간을 넘으면 경고 줄 + «내일로 미룰 집» 고르기(뒤 순서 집부터). 미룬 집은 다음 날 처음 열 때 담기 목록 앞에 다시 담긴다
  var LS_DEFER = "daeum.officer.deferred";
  function ymdLocal(d) { function p(n) { return (n < 10 ? "0" : "") + n; } return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
  function renderOver(order, sch) {
    var box = $("routeOver");
    if (!box) { box = el("div", "route-over d-card"); box.id = "routeOver"; box.setAttribute("role", "status"); var bar = $("routeStat").closest(".bar"); bar.parentNode.insertBefore(box, bar.nextSibling); }
    var ow = order.length ? RP.overWork(sch) : { over: false };
    box.hidden = !ow.over; box.textContent = ""; if (!ow.over) return;
    box.appendChild(el("p", "warn", "근무 시간을 넘습니다 — " + ow.why.join(" · ") + ". 내일로 미룰 집을 골라 주세요."));
    var sel = el("select"); sel.id = "deferPick"; sel.setAttribute("aria-label", "내일로 미룰 집");
    order.slice().reverse().forEach(function (s) { var o = el("option", null, s.h.label + " · " + s.h.area); o.value = s.h.id; sel.appendChild(o); });
    var b = el("button", "ghost", "내일로 미루기"); b.type = "button"; b.setAttribute("data-h", "medium");
    b.addEventListener("click", function () {
      var id = sel.value, r = rowById(id); if (!id) return;
      var tm = new Date(); tm.setDate(tm.getDate() + 1);
      var df = lsGet(LS_DEFER, []); if (!Array.isArray(df)) df = [];
      df = df.filter(function (x) { return x.id !== id; }); df.push({ id: id, day: ymdLocal(tm) }); lsSet(LS_DEFER, df);
      picked = picked.filter(function (x) { return x !== id; }); lsSet(LS_PICK, picked);
      renderNav(); renderRoute();
      var st = $("routeStat"); if (st && r) st.textContent = r.h.label + "을(를) 내일로 미뤘습니다 · " + st.textContent;
    });
    var row = el("div", "rep-acts"); var lab = el("label", null, "내일로 미룰 집 "); lab.appendChild(sel); row.appendChild(lab); row.appendChild(b);
    box.appendChild(row);
  }
  // 미룬 날이 된 집을 담기 목록 앞으로(명단에 없는 집은 버린다)
  function takeDeferred() {
    var df = lsGet(LS_DEFER, []); if (!Array.isArray(df) || !df.length) return;
    var today = ymdLocal(new Date()), back = df.filter(function (x) { return x.day <= today; }).map(function (x) { return x.id; });
    if (!back.length) return;
    picked = back.filter(function (id) { return rowById(id) && picked.indexOf(id) < 0; }).concat(picked);
    lsSet(LS_PICK, picked); lsSet(LS_DEFER, df.filter(function (x) { return x.day > today; }));
  }
  var lastRoute = null;
  function renderRoute() {
    var ret = $("routeReturn").checked;
    var order = routeStops(ret), road = roadFor(order, ret);
    var needLegs = order.length + (ret && order.length ? 1 : 0);
    var isRoad = !!(road && road.legs && road.legs.length === needLegs);
    var legs = isRoad ? road.legs : RP.approxLegs(order.map(stopPt), D.meta.office, ret);
    var sch = RP.schedule(order.map(function (r) { return { id: r.h.id }; }), legs,
      { start: $("routeStart").value, consultMin: +$("routeConsult").value, lunch: $("routeLunch").checked ? undefined : null, ret: ret });
    lastRoute = { order: order.map(function (r) { return r.h.id; }), rows: sch.rows, end: sch.end, km: sch.km, isRoad: isRoad, ret: ret, start: $("routeStart").value };
    var naive = pathKm(order.slice().sort(function (a, b) { return a.rank - b.rank; }), ret);
    $("routeStat").textContent = order.length
      ? "방문 " + order.length + "곳 · 이동 " + sch.km.toFixed(1) + "km " + (isRoad ? "(도로)" : "(근사)") + " · 이동 " + sch.travelMin + "분 · 상담 " + sch.consultMin + "분 · " +
        (ret ? "복귀 " : "마침 ") + sch.end
      : "명단에서 방문할 가구를 담아 주세요.";
    renderOver(order, sch);
    var rr = $("routeRoad");
    rr.textContent = roadMsg.text || (isRoad ? "도로 경로(네이버 길찾기) 기준 시각표입니다." : "지금은 직선거리 근사 순서·시간입니다. «도로 기준으로 순서 짜기»를 누르면 실제 도로 시간으로 다시 짭니다.");
    rr.className = "route-road" + (roadMsg.kind ? " " + roadMsg.kind : isRoad ? " ok" : "");
    $("btnRoad").disabled = roadBusy || !order.length;
    $("btnRoad").setAttribute("aria-busy", roadBusy ? "true" : "false");
    drawMap(order, ret, isRoad ? road : null);
    mapNote();

    var ol = $("routeList"); ol.textContent = "";
    order.forEach(function (s, i) {
      var row = sch.rows[i];
      if (row.lunchBefore) ol.appendChild(el("li", "grp", "점심"));
      var li = el("li", "stop" + (s.h.request ? " req" : ""));
      var grip = el("button", "grip", "≡"); grip.type = "button";
      grip.setAttribute("aria-label", (i + 1) + "번 " + s.h.label + " 순서 옮기기 — 위·아래 화살표 또는 끌기");
      grip.addEventListener("keydown", function (e) {
        if (e.key === "ArrowUp" && i > 0) { e.preventDefault(); moveStop(i, i - 1, i - 1); }
        else if (e.key === "ArrowDown" && i < order.length - 1) { e.preventDefault(); moveStop(i, i + 1, i + 1); }
      });
      grip.addEventListener("pointerdown", function (e) { startDrag(e, li, i); });
      li.appendChild(grip);
      li.appendChild(el("span", "no", i + 1));
      var main = el("div", "grow");
      var t = el("div", "tm"); t.appendChild(el("b", "num", row.arrive)); t.appendChild(document.createTextNode(" ~ " + row.leave + " "));
      t.appendChild(el("b", null, s.h.label)); t.appendChild(el("span", "small", " " + s.h.area));
      main.appendChild(t);
      main.appendChild(el("span", "small", "앞 지점에서 " + row.km.toFixed(1) + "km · " + row.travelMin + "분" + (row.approx ? "(근사)" : "")));
      li.appendChild(main);
      var acts = el("div", "acts");
      var up = el("button", "ghost mini", "위로"); up.type = "button"; up.disabled = i === 0; up.setAttribute("aria-label", (i + 1) + "번 위로");
      up.addEventListener("click", function () { moveStop(i, i - 1); });
      var dn = el("button", "ghost mini", "아래로"); dn.type = "button"; dn.disabled = i === order.length - 1; dn.setAttribute("aria-label", (i + 1) + "번 아래로");
      dn.addEventListener("click", function () { moveStop(i, i + 1); });
      var go = el("button", "ghost mini", "상담 기록"); go.type = "button"; go.setAttribute("data-h", "light");
      go.addEventListener("click", function () { $("recHouse").value = s.h.id; location.hash = "#record"; });
      acts.appendChild(up); acts.appendChild(dn); acts.appendChild(go);
      li.appendChild(acts);
      ol.appendChild(li);
    });
    if (sch.back) ol.appendChild(el("li", "end", "시청 복귀 " + sch.back.arrive + " · " + sch.back.km.toFixed(1) + "km · " + sch.back.travelMin + "분"));
    if (order.length && !isRoad && !roadBusy && order.length <= RP.MAX_ROAD_STOPS) {
      var li2 = el("li", "end"), b = el("button", "ghost", "이 순서로 도로 시간 받기"); b.type = "button"; b.setAttribute("data-h", "light");
      b.addEventListener("click", roadThisOrder); li2.appendChild(b); ol.appendChild(li2);
    }
  }
  // 끌어 옮기기(마우스·손가락 공용, 손잡이에서만 시작)
  function startDrag(e, li, from) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    var items = [].slice.call($("routeList").querySelectorAll("li.stop")), to = from;
    li.classList.add("dragging");
    function mv(ev) {
      var y = ev.clientY, k = 0; // 손가락이 가리키는 «틈» 번호(0 = 맨 위 앞)
      while (k < items.length) { var r = items[k].getBoundingClientRect(); if (y < r.top + r.height / 2) break; k++; }
      to = k > from ? k - 1 : k;
      items.forEach(function (it, k) { it.classList.toggle("drop-to", k === to && to !== from); });
    }
    function up() {
      document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up);
      li.classList.remove("dragging"); items.forEach(function (it) { it.classList.remove("drop-to"); });
      if (to !== from) moveStop(from, to);
    }
    document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
  }

  // ── ⑤ 상담 기록 ─────────────────────────────────────────
  var lastResult = null;
  function fillRecHouses() {
    var sel = $("recHouse"), keep = sel.value; sel.textContent = "";
    var ids = picked.length ? picked : rows.slice(0, 20).map(function (r) { return r.h.id; });
    ids.forEach(function (id) { var r = rowById(id); if (r) { var o = el("option", null, r.h.label + " · " + r.h.area); o.value = id; sel.appendChild(o); } });
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
    // O-13: 영어 오류 코드 대신 할 일을 알려 준다
    var MIC_ERR = { "not-allowed": "마이크 사용을 허용해 주세요(주소창 왼쪽 자물쇠 → 마이크 허용).", "service-not-allowed": "마이크 사용을 허용해 주세요(주소창 왼쪽 자물쇠 → 마이크 허용).",
      "no-speech": "말소리가 들리지 않았습니다. 다시 눌러 말씀해 주세요.", "audio-capture": "마이크를 찾지 못했습니다. 마이크 연결을 확인해 주세요.",
      network: "인터넷 연결이 끊겨 받아쓰기를 못 했습니다. 연결 뒤 다시 눌러 주세요.", aborted: "받아쓰기를 멈췄습니다." };
    recog.onerror = function (e) { $("micState").textContent = MIC_ERR[e.error] || "받아쓰기가 잘 안 됐습니다. 다시 눌러 주세요."; };
    recog.onend = function () { recog = null; micBtn(false); if ($("micState").textContent === "듣는 중…") $("micState").textContent = "받아쓰기 끝"; };
    recog.start(); micBtn(true); $("micState").textContent = "듣는 중…";
  }
  function micBtn(on) {
    var b = $("btnMic"); b.setAttribute("aria-pressed", String(on));
    b.innerHTML = '<span class="dot" aria-hidden="true"></span>' + (on ? "받아쓰기 멈추기" : "받아쓰기(입력 보조)");
  }
  function summarize() {
    var r = rowById($("recHouse").value); if (!r) return;
    var text = $("recText").value;
    var out = $("recResult"); out.textContent = "";
    // O-05: 빈 상담이면 요약·초안을 만들지 않고 안내만
    if (!text.trim()) { out.appendChild(el("p", "warn", "상담 내용을 먼저 적거나 받아쓰기로 넣어 주세요.")); $("btnLink").hidden = true; return; }
    out.appendChild(el("p", "muted", "요약하는 중…"));
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
          li.appendChild(lab);
          // S10l ③ 현장 적합률: 추천마다 «맞아요/아니에요»(가상 가구 번호만 저장)
          if (window.DaeumFit) DaeumFit.attach(li, { householdId: r.h.id, serviceId: id, serviceName: s.name, source: res.source });
          ul.appendChild(li);
        });
        if (!ul.children.length) ul.appendChild(el("li", "muted", "맞는 서비스를 찾지 못했습니다. 통합사례관리 회의에 올려 보세요."));
        out.appendChild(ul);
        out.appendChild(el("p", "small muted", "서비스 목록: " + servicesSource));
        $("btnLink").hidden = !(res.serviceIds || []).length;
        emit("summary", { householdId: r.h.id, label: r.h.label, area: r.h.area, text: text, res: res,
          services: (res.serviceIds || []).slice(0, 3).map(function (id) { var s = svcById(id); return s ? s.name : id; }) });
      });
  }
  function saveLink() {
    if (!lastResult) return;
    var ids = [].map.call(document.querySelectorAll("#recResult .svc input:checked"), function (c) { return c.value; });
    if (!ids.length) return;
    var links = lsGet(LS_LINK, []);
    links.unshift({ id: "L" + Date.now(), at: new Date().toISOString(), householdId: lastResult.row.h.id,
      label: lastResult.row.h.label, area: lastResult.row.h.area, serviceIds: ids, summary: lastResult.res.summary,
      source: lastResult.res.source, serviceNames: ids.map(function (id) { var s = svcById(id); return s ? s.name : id; }) });
    lsSet(LS_LINK, links.slice(0, 200));
    // O-07: 이 가구 줄의 신호 + householdId로 이어진 열린 신호(시연 신호 넣기 등)를 함께 «담당자 확인»으로
    var hid = lastResult.row.h.id, note = "연계 후보 " + ids.length + "건 저장", reqs = [];
    if (lastResult.row.h.request) reqs.push(lastResult.row.h.request);
    activeRequests().forEach(function (r) { if (r.householdId === hid && reqs.indexOf(r) < 0) reqs.push(r); });
    reqs.forEach(function (req) { if (req && req.id && req.status === "new") REQ.setStatus(req.id, "seen", "officer", note); });
    $("btnLink").hidden = true;
    renderLinks();
    emit("link", { householdId: lastResult.row.h.id });
  }
  // 저장값(ISO·UTC)을 이 기기 시각 «MM-DD HH:MM»으로(O-01)
  function localStamp(iso) { var d = new Date(iso); if (isNaN(d)) return ""; function p(n) { return (n < 10 ? "0" : "") + n; } return p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); }
  function renderLinks() {
    var links = lsGet(LS_LINK, []), ul = $("linkList"); ul.textContent = "";
    $("linkCount").textContent = links.length ? "(" + links.length + "건)" : "";
    links.slice(0, 8).forEach(function (l) {
      var li = el("li");
      li.appendChild(el("b", null, l.label + " · " + l.area));
      li.appendChild(el("span", "small", " " + localStamp(l.at) + " → " + l.serviceIds.map(function (id) { var s = svcById(id); return s ? s.name : id; }).join(", ")));
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
  // 화면 이름(머리띠 제목) — 경로는 «오늘 할 일»의 동선 묶음에서 들어온다
  // S10g(1안): 메뉴 = 폰 5칸(오늘·경로·연계 누락·가구·현황) / PC 7칸(+다시 찾을 집·상담 기록). 셋째 값은 «폰에서 불 켤 칸»
  // — 폰엔 다시 찾을 집·상담 기록 칸이 없어 «가구»에 불을 켜고, 가구 안 전환(.seg)으로 오간다. 옛 주소(#report 등)는 그대로
  // S10o-2(10-30 호창님 확정 주 기능 5개): 메뉴 = 오늘(입구) · ①시각표 · ②재시도 · ③연계 누락 · ④현황·보고서 · ⑤명단 정리.
  // 가구 명단·상담 기록은 보조라 폰 아래 메뉴에서 빼고 «더 보기»로(셋째 값 "" = 폰에서 불 켤 칸 없음)
  var TABS = { today: ["오늘", "오늘 찾아갈 집", "today"], route: ["시각표", "① 하루 방문 시각표", "route"],
    contacts: ["재시도", "② 다시 찾을 집 · 다음 시도 제안", "contacts"], board: ["연계 누락", "③ 연계 누락 · 미신청", "board"],
    report: ["현황·보고서", "④ 현황 · 보고서", "report"], intake: ["명단 정리", "⑤ 명단 정리 입구", "intake"],
    list: ["가구 명단", "가구 명단 · 방문 순서를 정한 근거", ""], record: ["상담 기록", "상담 기록 · 행복이음에 옮길 초안", ""],
    cost: ["도입 비용·탄소", "도입 비용 · 탄소 계산(추정)", ""], region: ["다른 시군", "다른 시군으로 바꿔 보기", ""] };
  var PC = window.matchMedia ? window.matchMedia("(min-width: 1024px)") : null;
  var lastTab = "";
  function show() {
    var tab = (location.hash || "#today").slice(1);
    if (!TABS[tab]) tab = "today";
    Object.keys(TABS).forEach(function (t) { $("tab-" + t).hidden = t !== tab; });
    var wide = PC && PC.matches;
    [].forEach.call(document.querySelectorAll(".tabs a"), function (a) {
      var on = a.dataset.tab === (wide ? tab : TABS[tab][2]);
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    [].forEach.call(document.querySelectorAll(".seg a"), function (a) {
      if (a.dataset.seg === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.body.setAttribute("data-tab", tab);
    $("pageTitle").textContent = TABS[tab][1];
    document.title = "닿음 · 공무원 창구 · " + TABS[tab][1];
    if (lastTab && lastTab !== tab) window.scrollTo(0, 0);
    lastTab = tab;
    renderNav();
    if (tab === "today") renderToday();
    if (tab === "list") renderList();
    if (tab === "list" || tab === "record" || tab === "cost" || tab === "region") { var mm = document.querySelector('.d-sheet .sh-i[href="#' + tab + '"]'); [].forEach.call(document.querySelectorAll('.d-sheet .sh-i[href^="#"]'), function (a) { if (a === mm) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); }); }
    if (tab === "route") renderRoute();
    if (tab === "record") { fillRecHouses(); renderLinks(); }
    if (tab === "board" || tab === "report") renderBoard();
    emit("show", { tab: tab });
  }
  // features 연결(mount.js)용 신호 — 화면이 바뀌거나 요약이 끝나면 알린다
  function emit(kind, detail) {
    try { document.dispatchEvent(new CustomEvent("daeum:officer-" + kind, { detail: detail || {} })); } catch (e) { /* 구형 브라우저 */ }
  }
  // 메뉴 숫자·오늘 할 일 머리(그리기만 — 칸 내용은 features.js 가 data-slot 에 채운다)
  function renderNav() {
    $("navToday").textContent = picked.length || "";
    $("navList").textContent = rows.length ? rows.length.toLocaleString() : "";
  }
  function renderToday() {
    var d = new Date(), W = "일월화수목금토";
    $("todayDate").textContent = (d.getMonth() + 1) + "월 " + d.getDate() + "일 " + W.charAt(d.getDay()) + "요일";
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
      .catch(function () { used = "citizen/" + (C.serviceScriptFallback || "data/services.js"); return loadJs("../" + used, "__DAEUM_SERVICES__"); })
      .then(function (j) {
        var arr = Array.isArray(j) ? j : (j.services || []), added = 0;
        arr.forEach(function (s) {
          if (!s || !s.id || svcById(s.id)) return;
          var same = SERVICES.filter(function (b) { return normName(b.name) === normName(s.name); })[0];
          if (same) { same.citizenId = s.id; return; } // 같은 서비스는 내장 쪽 하나로(수요 보드 ID 유지)
          // 욕구 범주 = 이름 낱말 + 국민 창구 규칙(rule) 꼬리표. 본문(대상·지원 내용) 낱말로는 붙이지 않는다
          // (S9b-2: 본문 «의료·법률·직업훈련·자활» 때문에 실직 가구에 «성매매 방지 및 피해자 지원»이 붙던 원인)
          var tags = (s.tags || []).slice();
          function tagFrom(text) { Object.keys(TAG_WORDS).forEach(function (t) { if (tags.indexOf(t) < 0 && TAG_WORDS[t].test(text)) tags.push(t); }); }
          tagFrom(s.name || "");
          (AI.needsFromRule ? AI.needsFromRule(s.rule) : []).forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); });
          SERVICES.push({ id: s.id, name: s.name || s.id, org: s.provider || s.org || "", tags: tags, rule: s.rule }); added++;
        });
        if (added) servicesSource = "내장 12종 + 주민 창구 목록 " + added + "종(" + used + ")";
      }).catch(function () { /* 아직 없음 */ });
  }
  function demoRequest() {
    var samples = [
      { proxy: { isProxy: true, relation: "어머니" }, situation: "시골에 혼자 계신 어머니 집 보일러가 고장 나서 추운데 가스비도 밀렸어요", ids: ["S04", "S05"], region: "화남면", tags: ["alone", "energy", "senior"] },
      { proxy: { isProxy: false, relation: "" }, situation: "공장 일을 그만두고 월세가 두 달 밀렸어요", ids: ["S03", "S07", "S02"], region: "남원동", tags: ["unemployed", "housing"] },
      { proxy: { isProxy: true, relation: "아버지" }, situation: "아버지가 병원비 때문에 약을 끊으셨어요", ids: ["S06", "S02"], region: "함창읍", tags: ["sick", "lowIncome"] },
      { proxy: { isProxy: true, relation: "이웃" }, signal: "neighbor", place: "골목 끝 파란 대문 집", situation: "옆집 할머니 댁 우편물이 일주일째 쌓여 있고 밤에 불이 안 켜져요", ids: [], region: "남원동", tags: ["alone", "senior"] }
    ];
    var s = samples[REQ.list().length % samples.length];
    var same = rows.filter(function (r) { return r.h.area === s.region && !r.h.request; })[0];
    REQ.add({
      householdId: same ? same.h.id : null,
      region: s.region, contactPref: "visit", displayName: s.signal ? "" : "시연 요청", proxy: s.proxy, signal: s.signal, place: s.place,
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

  // mount.js 가 읽는 창구(상태는 여기 한 곳에만 있다)
  window.DaeumOfficer = {
    data: function () { return D; },
    rows: function () { return rows; },
    row: rowById,
    picked: function () { return picked.slice(); },
    setPicked: function (ids) { picked = (ids || []).filter(function (id) { return rowById(id); }); lsSet(LS_PICK, picked); renderNav(); },
    services: function () { return SERVICES; },
    links: function () { return lsGet(LS_LINK, []); },
    // 방문 경로 화면에서 마지막으로 짠 시각표(담은 가구가 그 뒤 바뀌었으면 null — 하루 동선 1장은 근사로 다시 짠다)
    route: function () { return lastRoute && lastRoute.order.slice().sort().join() === picked.slice().sort().join() ? lastRoute : null; },
    memberText: memberText,
    // S10o-2 미신청 칸 보강용: 서비스별 동네 미신청(가상 수요 보드) · 사보원 수급권자 공개 통계(실제, 없으면 null)
    svcGaps: function () {
      if (!D) return [];
      var cell = boardData();
      return BUILTIN_SERVICES.map(function (s) { return { id: s.id, name: s.name, demand: D.areas.reduce(function (n, a) { var x = cell[a.name + "|" + s.id]; return n + (x ? gap(x) : 0); }, 0) }; });
    },
    recipients: function () { return RECIP; },
    refresh: function () { rebuild(); show(); },
    openRecord: function (id) { location.hash = "#record"; setTimeout(function () { if (rowById(id)) { fillRecHouses(); var sel = $("recHouse"); if (![].some.call(sel.options, function (o) { return o.value === id; })) { var r = rowById(id), o = el("option", null, r.h.label + " · " + r.h.area); o.value = id; sel.appendChild(o); } sel.value = id; showHouseInfo(); } }, 0); }
  };
  function init() {
    var mode = AI.mode() === "ai" ? "ai" : "rule";
    $("aiMode").textContent = mode === "ai" ? "AI 연결됨" : "AI 연결 전 시연 모드";
    $("aiMode").className = "mode " + mode;
    checkRegions();
    // 경로 설정 띠: 폰에선 접어 두고(지도가 첫 화면 안에 오게) 600px 이상에선 펼친다(S10n 디자인 #14)
    var ps = $("routePlanSet"); if (ps && window.matchMedia && matchMedia("(min-width: 600px)").matches) ps.open = true;
    // 가구가 0곳인 읍면동은 고르기에서 숨긴다(시연 가구는 북부 4개 읍면에만 있음)
    FX.households.areaChoices(D.areas, D.households).forEach(function (a) { var o = el("option", null, a.name); o.value = a.name; $("fArea").appendChild(o); });
    initWeights(false);
    rebuild();
    picked = lsGet(LS_PICK, null);
    // 예전 시연 자료(남원동 가구)의 id가 남아 있으면 지금 명단에 없는 집이라 버린다 — 다 버려지면 앞 순서로 다시 담는다(S10d)
    if (Array.isArray(picked)) picked = picked.filter(function (id) { return rowById(id); });
    if (!Array.isArray(picked) || !picked.length) pickTop(); else rebuild();
    takeDeferred();
    $("fArea").addEventListener("change", renderList);
    $("fTop").addEventListener("change", renderList);
    $("btnPickTop").addEventListener("click", function () { pickTop(); renderList(); });
    $("btnDemoReq").addEventListener("click", demoRequest);
    $("routeReturn").addEventListener("change", renderRoute);
    ["routeStart", "routeConsult", "routeLunch"].forEach(function (k) { $(k).addEventListener("change", renderRoute); });
    $("btnRoad").addEventListener("click", roadOptimize);
    $("recHouse").addEventListener("change", function () { showHouseInfo(); $("recText").value = ""; $("btnLink").hidden = true; });
    $("btnSample").addEventListener("click", function () { var r = rowById($("recHouse").value); if (r) $("recText").value = sampleScript(r); });
    $("btnMic").addEventListener("click", toggleMic);
    $("btnSummarize").addEventListener("click", summarize);
    $("btnLink").addEventListener("click", saveLink);
    // 오늘 «새 주민 신호» 줄 → 접어 둔 칸을 펼치고 그리로(해시는 바꾸지 않는다)
    var sig = $("sigLine"); if (sig) sig.addEventListener("click", function (e) { e.preventDefault(); var m = $("moreToday"); if (!m) return; m.open = true; m.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); var sm = m.querySelector("summary"); if (sm) sm.focus({ preventScroll: true }); });
    var skr = $("skipRoute"); if (skr) skr.addEventListener("click", function () { var n = $("routeNote"); if (n) n.focus(); }); // 긴 시각표를 키보드로 건너뛰기
    window.addEventListener("hashchange", show);
    if (PC && PC.addEventListener) PC.addEventListener("change", show); // 폰↔PC 폭이 바뀌면 메뉴 불 다시 켜기
    REQ.onChange(function () { rebuild(); show(); }); // 국민 창구 탭에서 요청이 들어오면 반영
    renderFit();
    if (window.DaeumFit) DaeumFit.onChange(renderFit);
    show();
  }
  function renderFit() { if (window.DaeumFit) [].forEach.call(document.querySelectorAll(".fit-box"), function (b) { DaeumFit.render(b); }); }

  // 상주시 실제 현황 — 사보원 «복지사업 시군구별 수급권자 현황»(공개 통계, data/recipients_sangju.json). 가상 가구와 별개로 실제 값만 보인다.
  var RECIP = null;
  function renderRegionStat(R) {
    RECIP = R;
    var box = $("regionStat"); if (!box) return;
    var b = R.basic_rate, pick = ["기초생활보장(맞춤형급여)", "기초생계급여", "기초의료급여", "기초주거급여", "차상위본인부담경감대상자", "기초연금"];
    var rows = R.rows.filter(function (r) { return pick.indexOf(r["사업명"]) >= 0; });
    var month = rows.length ? rows[0]["기준년월"] : "";
    var h = '<h3>상주시 실제 현황 <small class="tag">공개 통계 · 실제 값</small></h3>' +
      '<p class="kpi"><b>' + b.value_pct.toFixed(1) + '%</b> 기초생활보장 수급가구 비율 <span class="muted">(근사)</span></p>' +
      '<p class="muted small">산식: ' + b.formula + ' — ' + b.note + '</p>' +
      '<table class="grid"><thead><tr><th>사업</th><th class="num">수급권자</th><th class="num">수급가구</th></tr></thead><tbody>' +
      rows.map(function (r) { return "<tr><td>" + r["사업명"] + "</td><td class=\"num\">" + r["수급권자수"].toLocaleString() + "</td><td class=\"num\">" + r["수급가구수"].toLocaleString() + "</td></tr>"; }).join("") +
      '</tbody></table>' +
      '<p class="muted small">출처: 한국사회보장정보원 «복지사업 시군구별 수급권자 현황»(공공데이터포털 15062448), 기준월 ' + month +
      ' · 분모: ' + R.households_denominator.source + ' · 내려받은 날 ' + R.fetched + '. 아래 미신청 표(가상 값)와는 별개입니다.</p>';
    box.innerHTML = h;
  }
  // file:// 로 열면 fetch 가 막힌다 — 그때는 같은 내용의 짝 .js(window.__DAEUM_…__)를 script 로 읽는다
  function loadJs(src, name) {
    return new Promise(function (ok, no) {
      if (window[name]) return ok(window[name]);
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () { window[name] ? ok(window[name]) : no(new Error("사본 없음 " + src)); };
      s.onerror = function () { no(new Error("읽지 못함 " + src)); };
      document.head.appendChild(s);
    });
  }
  function loadData(name, globalName) {
    return fetch("../data/" + name + ".json").then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .catch(function () { return loadJs("../data/" + name + ".js", globalName); });
  }
  // S10h ① 읍면동 고독사 위험도(행안부 D12·D13 공개 CSV → data/lonely_risk.json). 실패해도 나머지 화면은 그대로
  var lonelyP = loadData("lonely_risk", "__DAEUM_LONELY__").then(function (d) { if (window.DaeumLonely) DaeumLonely.set(d); return d; })
    .catch(function () { var b = $("lonelyRisk"); if (b) b.querySelector("p").textContent = "공개 통계를 불러오지 못했습니다."; return null; });
  function renderLonely() {
    lonelyP.then(function (d) {
      var box = $("lonelyRisk"); if (!d || !box || !window.DaeumLonely || !D) return;
      var focus = []; D.households.forEach(function (h) { if (focus.indexOf(h.area) < 0) focus.push(h.area); });
      DaeumLonely.render(box, d, focus, el);
    });
  }
  loadData("recipients_sangju", "__DAEUM_RECIPIENTS__").then(renderRegionStat)
    .catch(function () { var b = $("regionStat"); if (b) b.querySelector("p").textContent = "공개 통계를 불러오지 못했습니다."; });

  Promise.all([
    loadData("households", "__DAEUM_HOUSEHOLDS__").then(function (j) { D = j; }),
    loadServices()
  ]).then(function () { init(); renderLonely(); }).catch(function (e) {
    // O-13: 개발자 말 대신 할 일을. 원인은 콘솔에만
    if (window.console) console.warn("닿음 공무원 창구 자료 불러오기 실패:", e);
    var m = document.querySelector("main"); m.textContent = "";
    var p = el("p", "warn", "화면 자료를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요. 계속 안 되면 인터넷 연결을 확인해 주세요."); p.setAttribute("role", "alert"); m.appendChild(p);
  });
})();
