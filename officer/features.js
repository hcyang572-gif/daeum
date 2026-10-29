/* 닿음 공무원 창구 기능 로직 ①~④ — S9b-1(⚙️ 파로, 2026-10-29)
   화면 그리기·CSS 없음. 순수 함수 위주이고 저장은 store.* 만 localStorage 를 만진다.
   이름공간: window.DaeumFeatures (shared/report.js·citizen/progress.js 와 같은 이름공간을 함께 채운다).
   node 에서는 require("./features.js") 로 같은 객체를 받는다(features.test.js).

   ⛔ 원칙
   - «위기 점수»를 만들지 않는다. 대상자 선별·위험 예측은 사회보장정보원 발굴관리시스템이 이미 한다
     (01_리서치/현행_위기가구_발굴절차.md). 닿음은 «명단 이후 업무»를 줄이고, 순서는 지역 신호로 «조정 제안»만 한다.
     최종 순서·판단은 담당 공무원이 정한다(officerOrder).
   - AI 호출 없음. 상담 초안은 규칙 기반(낱말 사전)이다. AI 요약 결과(ai.js summarize 결과)가 있으면 받아 쓴다.

   ── S9b-2 마운트 약속: data-feature 별 render 데이터 모양 ─────────────────────
   [today]   F.today.build({households, requests, attempts, picked, now}) →
     { date:"YYYY-MM-DD", counts:{newRequests, dueSoon, revisits, stops},
       sections:[{ key:"new"|"due"|"revisit"|"route", title, hint, items:[TodayItem] }],
       route:{ order:[{id,label,area,kind}], km, naiveKm, minutes } }
     TodayItem = { id, kind:"request"|"household", label, area, why, due?:"YYYY-MM-DD", overdue?:bool,
                   urgent?:bool, channel?:"visit"|"phone"|"center", requestId?, householdId? }
   [households] F.households.order({households, requests, attempts, tips, officerOrder}) →
     { items:[{ id, kind, label, area, signals:[{kind:"request"|"tip"|"history", text}],
                group:"pinned"|"signal"|"none", groupLabel, baseIndex, pinned:bool }],
       groups:[{key, label, count}], note }   ← 점수 칸 없음. 정렬 = 공무원 고정 → 신호 있음 → 원래 명단 순
   [contacts] F.contacts.suggestNext(attempts, householdId, now) →
     { householdId, tries, failed, lastResult, next:{ date, slot, channel, why } | null,
       escalate:bool, checklist:[문장], closed:bool, closedWhy? }
     F.contacts.add(attempts, {householdId, channel, result, reason?, note?, at?}) → 새 attempts 배열
     F.contacts.NON_ELIGIBLE_REASONS = [{key,label}]  ← «비해당 사유 한 번 고르기» 단추 목록
   [consult] F.consult.draft(text, {label, area, at, channel, aiResult?, services?}) →
     { fields:[{key,label,value,auto:bool}], caseForm:[{domain, finding}], urgent:bool,
       copyText:"행복이음 붙여넣기용", caseText:"사례관리 서식 붙여넣기용", note }
   ─────────────────────────────────────────────────────────────────────────── */
(function (root, factory) {
  var ns = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = ns;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  var F = root.DaeumFeatures = root.DaeumFeatures || {};

  // ── 공통 도구 ──────────────────────────────────────────────
  var DAY = 86400000;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { d = new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function startOfDay(d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d; }
  function daysBetween(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / DAY); }
  /** 영업일 더하기(토·일 건너뜀, 공휴일은 반영하지 않음 — 한계) */
  function addWorkdays(d, n) {
    d = startOfDay(d);
    while (n > 0) { d = new Date(d.getTime() + DAY); var w = d.getDay(); if (w !== 0 && w !== 6) n--; }
    return d;
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  F.util = { ymd: ymd, daysBetween: daysBetween, addWorkdays: addWorkdays, startOfDay: startOfDay };

  // ── 저장(localStorage) — 키 정본 ───────────────────────────
  var KEYS = {
    attempts: "daeum.officer.attempts",   // ③ 방문·연락 시도 [{id,householdId,channel,result,reason,note,at}]
    tips: "daeum.officer.tips",           // ② 이웃·통반장 제보 [{id,householdId,area,from,text,at}]
    order: "daeum.officer.order",         // ② 공무원이 고정한 순서 [householdId…]
    picked: "daeum.officer.picked",       // 기존 officer.js 와 같은 키(오늘 방문으로 고른 가구)
    links: "daeum.officer.links",         // 기존 officer.js 연계 저장
    consults: "daeum.officer.consults",   // ④ 상담 초안 [{id,householdId,at,fields}]
    safety: "daeum.officer.safety",       // ⑨ 안전 방문 {flags:{id:{on,reason,at}}, visits:[{id,householdId,buddy,startAt,dueAt,backAt}]}
    entry: "daeum.officer.entry",         // ⑩ 강제개문·긴급 조치 기록 [{householdId,step,note,at}]
    outcomes: "daeum.officer.outcomes"    // ⑪ 연계 결과 확인 {linkId:{result,at}}
  };
  function lsGet(k, d) { try { var v = root.localStorage && root.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  F.store = {
    keys: KEYS,
    get: function (name, d) { return lsGet(KEYS[name] || name, d); },
    set: function (name, v) { return lsSet(KEYS[name] || name, v); }
  };

  // ── 동선(officer.js ④ 경로와 같은 규칙: 읍면 묶음 → 가까운 이웃 순) ─────
  var DETOUR = 1.3, KMH = 40, VISIT_MIN = 30;
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) * DETOUR; }
  function pathKm(order, office, ret) {
    var cur = office, km = 0;
    order.forEach(function (s) { km += dist(cur, s); cur = s; });
    if (ret !== false && order.length) km += dist(cur, office);
    return km;
  }
  function planRoute(stops, office, areas) {
    office = office || { x: 0, y: 0 };
    var center = {}; (areas || []).forEach(function (a) { center[a.name] = a; });
    var groups = {}; stops.forEach(function (s) { (groups[s.area] = groups[s.area] || []).push(s); });
    var names = Object.keys(groups), order = [], cur = office;
    while (names.length) {
      names.sort(function (a, b) { return dist(cur, center[a] || groups[a][0]) - dist(cur, center[b] || groups[b][0]); });
      var left = groups[names.shift()].slice();
      while (left.length) { left.sort(function (a, b) { return dist(cur, a) - dist(cur, b); }); var nx = left.shift(); order.push(nx); cur = nx; }
    }
    var km = pathKm(order, office), naiveKm = pathKm(stops, office);
    return {
      order: order.map(function (s) { return { id: s.id, label: s.label, area: s.area, kind: s.kind }; }),
      km: +km.toFixed(1), naiveKm: +naiveKm.toFixed(1),
      minutes: Math.round(km / KMH * 60 + order.length * VISIT_MIN)
    };
  }
  F.route = { plan: planRoute, DETOUR: DETOUR, KMH: KMH, VISIT_MIN: VISIT_MIN };

  // ── 요청 처리 기한(시연 설정) ─────────────────────────────
  // ⚠️ 지침상 개별 처리 기한은 미확인(01_리서치/현행_위기가구_발굴절차.md 3행). 시연 기본값: 긴급 1영업일·일반 3영업일.
  var DUE = { urgent: 1, normal: 3, soonDays: 1 };
  function requestDue(r) { return addWorkdays(new Date(r.createdAt), r.urgent ? DUE.urgent : DUE.normal); }
  function isOpen(r) { return r && r.status !== "done" && r.status !== "cancelled"; }
  function reqLabel(r) {
    var who = r.proxy && r.proxy.isProxy ? " (" + (r.proxy.relation || "가족") + " 대신)" : "";
    return (r.displayName ? r.displayName + " " : "") + "요청 " + r.id + who;
  }

  // ── ③ 방문·연락 기록 → 재시도 제안 ──────────────────────
  var RESULTS = {
    met: "만남·통화됨", no_answer: "부재·안 받음", wrong_contact: "연락처·주소 틀림",
    refused: "상담 거부", not_eligible: "비해당", moved: "전출·이사"
  };
  // 비해당 사유 «한 번 고르기». 소득·재산 초과가 비대상의 44.8%(헬스경향 2022-09-01, 01_리서치 고충1) → 맨 앞
  var NON_ELIGIBLE_REASONS = [
    { key: "income_over", label: "소득·재산 기준 초과" },
    { key: "already_served", label: "이미 같은 서비스 이용 중" },
    { key: "resolved", label: "위기 상황 해소(재취업·체납 정리 등)" },
    { key: "family_support", label: "가족·친지 부양으로 해결" },
    { key: "no_residence", label: "실거주 안 함(빈집·주소만 둠)" },
    { key: "refused", label: "본인이 지원을 원하지 않음" },
    { key: "other", label: "기타(메모에 적기)" }
  ];
  var SLOTS = ["오전", "오후", "저녁"];
  function slotOf(d) { var h = new Date(d).getHours(); return h < 12 ? "오전" : h < 17 ? "오후" : "저녁"; }
  var MAX_VISIT_TRIES = 3; // 강남구 «3회 이상 방문 후 간접조사» 사례(01_리서치 현행 절차 3행, [A] 강남구) — 시연 기본값
  var INDIRECT_CHECK = [
    "통장·이장에게 실거주 여부 묻기",
    "이웃·집주인(관리사무소)에게 최근 모습 묻기",
    "우편함·전기·가스 계량기 사용 흔적 보기(사진은 개인 식별 안 되게)",
    "방문 안내문(연락 달라는 쪽지) 남기기",
    "지역사회보장협의체·명예사회복지공무원에게 함께 살펴 달라고 부탁"
  ];
  function addAttempt(attempts, a) {
    if (!a || !a.householdId || !a.result) throw new Error("householdId·result 필요");
    if (a.result === "not_eligible" && !a.reason) throw new Error("비해당은 사유(reason)를 하나 골라야 합니다");
    var at = a.at ? new Date(a.at) : new Date();
    var rec = { id: "T" + at.getTime() + "-" + ((attempts || []).length + 1), householdId: a.householdId,
      channel: a.channel || "visit", result: a.result, reason: a.reason || "", note: a.note || "", at: at.toISOString() };
    return (attempts || []).concat([rec]);
  }
  function suggestNext(attempts, householdId, now) {
    now = now ? new Date(now) : new Date();
    var mine = (attempts || []).filter(function (t) { return t.householdId === householdId; })
      .sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var out = { householdId: householdId, tries: mine.length, failed: 0, lastResult: null, next: null, escalate: false, checklist: [], closed: false };
    if (!mine.length) { out.next = { date: ymd(now), slot: "오전", channel: "phone", why: "첫 연락 — 전화로 방문 약속부터" }; return out; }
    var last = mine[mine.length - 1];
    out.lastResult = last.result;
    if (last.result === "met") { out.closed = true; out.closedWhy = "만남·통화 완료 — 상담 기록으로"; return out; }
    if (last.result === "not_eligible") { out.closed = true; out.closedWhy = "비해당: " + (labelOf(NON_ELIGIBLE_REASONS, last.reason) || "사유 미상"); return out; }
    if (last.result === "moved") { out.closed = true; out.closedWhy = "전출 — 전입지 읍면동으로 넘김"; return out; }
    // 마지막 성공 뒤 연속 실패 수
    for (var i = mine.length - 1; i >= 0 && mine[i].result !== "met"; i--) out.failed++;
    var visitsFailed = mine.filter(function (t) { return t.channel === "visit" && t.result === "no_answer"; }).length;
    var tried = uniq(mine.map(function (t) { return slotOf(t.at); }));
    var slot = SLOTS.filter(function (s) { return tried.indexOf(s) < 0; })[0] || SLOTS[(SLOTS.indexOf(slotOf(last.at)) + 1) % 3];
    var gap = Math.min(out.failed, 3); // 1·2·3 영업일 간격으로 늘림(가정)
    var channel = last.result === "wrong_contact" ? "visit" : last.channel === "phone" && out.failed >= 2 ? "visit" : last.channel;
    var why = last.result === "refused" ? "거부 — 시간을 두고 다른 담당자·이웃 통해 다시 권유"
      : last.result === "wrong_contact" ? "연락처·주소 틀림 — 방문으로 실거주 확인"
      : "부재 " + out.failed + "회 — 안 해 본 «" + slot + "» 시간대로";
    var nd = addWorkdays(last.at, last.result === "refused" ? 5 : gap);
    if (nd < startOfDay(now)) nd = startOfDay(now); // 이미 지난 제안일은 오늘로 당김
    out.next = { date: ymd(nd), slot: slot, channel: channel, why: why };
    if (visitsFailed >= MAX_VISIT_TRIES || out.failed >= MAX_VISIT_TRIES + 1) {
      out.escalate = true; out.checklist = INDIRECT_CHECK.slice();
      out.next.why = "방문 " + visitsFailed + "회 부재 — 간접 확인으로 전환";
    }
    return out;
  }
  function labelOf(list, key) { for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i].label; return ""; }
  F.contacts = { RESULTS: RESULTS, NON_ELIGIBLE_REASONS: NON_ELIGIBLE_REASONS, INDIRECT_CHECK: INDIRECT_CHECK,
    MAX_VISIT_TRIES: MAX_VISIT_TRIES, add: addAttempt, suggestNext: suggestNext,
    /** 비해당 한 번 고르기 — add 의 지름길 */
    markNotEligible: function (attempts, householdId, reasonKey, note, at) {
      return addAttempt(attempts, { householdId: householdId, channel: "visit", result: "not_eligible", reason: reasonKey, note: note, at: at });
    } };

  // ── ① 오늘 할 일 ──────────────────────────────────────────
  F.today = {
    DUE: DUE,
    requestDue: requestDue,
    /** data = {households:[] (data/households.json households), areas?, office?, requests:[], attempts:[], picked:[householdId], now} */
    build: function (data) {
      var now = data.now ? new Date(data.now) : new Date(), today = ymd(now);
      var reqs = (data.requests || []).filter(isOpen), hh = data.households || [];
      var byId = {}; hh.forEach(function (h) { byId[h.id] = h; });
      var areaC = {}; (data.areas || []).forEach(function (a) { areaC[a.name] = a; });

      var newItems = reqs.filter(function (r) { return r.status === "new"; }).map(function (r) {
        return { id: r.id, kind: "request", requestId: r.id, label: reqLabel(r), area: r.region || "미상", urgent: !!r.urgent,
          channel: r.contactPref || "phone", why: r.urgent ? "긴급 낱말 있음 — 오늘 먼저" : "국민이 직접 요청", due: ymd(requestDue(r)) };
      }).sort(function (a, b) { return (b.urgent - a.urgent) || (a.due < b.due ? -1 : 1); });

      var dueItems = reqs.filter(function (r) { return daysBetween(now, requestDue(r)) <= DUE.soonDays; }).map(function (r) {
        var d = requestDue(r), left = daysBetween(now, d);
        return { id: r.id, kind: "request", requestId: r.id, label: reqLabel(r), area: r.region || "미상", urgent: !!r.urgent,
          due: ymd(d), overdue: left < 0, why: left < 0 ? "기한 " + (-left) + "일 지남" : left === 0 ? "오늘 기한" : "내일 기한" };
      }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });

      var ids = uniq((data.attempts || []).map(function (t) { return t.householdId; }));
      var revisit = [];
      ids.forEach(function (id) {
        var s = suggestNext(data.attempts, id, now);
        if (s.closed || !s.next || s.next.date > today) return;
        var h = byId[id];
        revisit.push({ id: id, kind: "household", householdId: id, label: h ? h.label : id, area: h ? h.area : "미상",
          channel: s.next.channel, why: s.next.why + " · " + s.next.slot, due: s.next.date, overdue: s.next.date < today, escalate: s.escalate });
      });

      // 오늘 방문 묶음: 방문 요청 + 방문 재시도 + 공무원이 고른 가구
      var stops = [], seen = {};
      function push(s) { if (!seen[s.id]) { seen[s.id] = 1; stops.push(s); } }
      reqs.forEach(function (r) {
        if (r.contactPref !== "visit") return;
        var a = areaC[r.region] || { x: 0, y: 0 };
        push({ id: r.id, label: reqLabel(r), area: r.region || "미상", kind: "request", x: a.x, y: a.y });
      });
      revisit.filter(function (x) { return x.channel === "visit"; }).forEach(function (x) { var h = byId[x.id]; if (h) push({ id: h.id, label: h.label, area: h.area, kind: "household", x: h.x, y: h.y }); });
      (data.picked || []).forEach(function (id) { var h = byId[id]; if (h) push({ id: h.id, label: h.label, area: h.area, kind: "household", x: h.x, y: h.y }); });
      var route = planRoute(stops, data.office, data.areas);

      return {
        date: today,
        counts: { newRequests: newItems.length, dueSoon: dueItems.length, revisits: revisit.length, stops: stops.length },
        sections: [
          { key: "new", title: "새 요청", hint: "국민 창구에서 들어온 요청", items: newItems },
          { key: "due", title: "기한 임박", hint: "처리 기한(시연 설정: 긴급 1·일반 3영업일) 하루 이내·지남", items: dueItems },
          { key: "revisit", title: "재방문·재연락", hint: "지난 시도 결과로 오늘 다시 할 집", items: revisit },
          { key: "route", title: "오늘 동선", hint: "읍면별로 묶고 가까운 순", items: route.order }
        ],
        route: route
      };
    }
  };

  // ── ② 가구 명단: 지역 신호로 순서 조정(점수 없음) ───────────
  F.households = {
    /** data = {households (정보원 명단 순서 그대로), requests, attempts, tips, officerOrder:[id]} */
    order: function (data) {
      var hh = data.households || [], pins = data.officerOrder || [];
      var tips = data.tips || [], attempts = data.attempts || [];
      var reqByHH = {}; (data.requests || []).filter(isOpen).forEach(function (r) { if (r.householdId) (reqByHH[r.householdId] = reqByHH[r.householdId] || []).push(r); });
      var items = hh.map(function (h, i) {
        var sig = [];
        (reqByHH[h.id] || []).forEach(function (r) { sig.push({ kind: "request", text: (r.proxy && r.proxy.isProxy ? "가족·이웃이 대신 도움 요청" : "주민이 직접 도움 요청") + (r.urgent ? "(긴급 낱말)" : "") }); });
        if (h.request && !reqByHH[h.id]) sig.push({ kind: "request", text: (h.request.proxy && h.request.proxy.isProxy ? "가족·이웃이 대신 도움 요청" : "주민이 직접 도움 요청") + (h.request.urgent ? "(긴급 낱말)" : "") });
        tips.filter(function (t) { return t.householdId === h.id; }).forEach(function (t) { sig.push({ kind: "tip", text: (t.from || "이웃") + " 제보: " + String(t.text || "").slice(0, 40) }); });
        var s = suggestNext(attempts, h.id, data.now);
        if (s.tries && !s.closed && s.failed) sig.push({ kind: "history", text: "지난 시도 " + s.failed + "회 못 만남 — 재시도 " + (s.next ? s.next.date : "") });
        var pinIdx = pins.indexOf(h.id);
        return { id: h.id, kind: "household", label: h.label, area: h.area, signals: sig, baseIndex: i,
          pinned: pinIdx >= 0, pinIndex: pinIdx, closed: s.closed,
          group: pinIdx >= 0 ? "pinned" : sig.length ? "signal" : "none" };
      });
      var rank = { pinned: 0, signal: 1, none: 2 };
      var KIND_W = { request: 0, tip: 1, history: 2 };
      function firstKind(x) { return x.signals.length ? Math.min.apply(null, x.signals.map(function (s) { return KIND_W[s.kind]; })) : 9; }
      items.sort(function (a, b) {
        return rank[a.group] - rank[b.group] || (a.pinIndex - b.pinIndex) || (firstKind(a) - firstKind(b)) || (a.baseIndex - b.baseIndex);
      });
      var LBL = { pinned: "담당자가 앞에 둠", signal: "지역 신호 있음", none: "명단 순서" };
      items.forEach(function (x) { x.groupLabel = LBL[x.group]; delete x.pinIndex; });
      return {
        items: items,
        groups: ["pinned", "signal", "none"].map(function (k) { return { key: k, label: LBL[k], count: items.filter(function (x) { return x.group === k; }).length }; }),
        note: "순서는 제안입니다. 위험 점수를 매기지 않고, 주민 요청·이웃 제보·지난 시도 같은 지역 신호가 있는 집을 앞에 둡니다. 최종 순서는 담당자가 정합니다."
      };
    },
    /** 공무원이 «앞으로»를 누르면: 고정 목록 맨 뒤에 붙인다(이미 있으면 빼기 = 토글) */
    togglePin: function (officerOrder, id) {
      var o = (officerOrder || []).slice(), i = o.indexOf(id);
      if (i >= 0) o.splice(i, 1); else o.push(id);
      return o;
    },
    addTip: function (tips, t) {
      if (!t || !t.householdId || !t.text) throw new Error("householdId·text 필요");
      var at = t.at ? new Date(t.at) : new Date();
      return (tips || []).concat([{ id: "P" + at.getTime(), householdId: t.householdId, area: t.area || "", from: t.from || "이웃", text: String(t.text).slice(0, 200), at: at.toISOString() }]);
    }
  };

  // ── ④ 상담 기록 → 행복이음 입력 초안·사례관리 서식 ─────────
  // ⚠️ 행복이음 실제 입력 화면은 행정망 안이라 확인 못 함 → «상담 기록에 흔히 들어가는 항목» 구조로 만든 예시다.
  // 사례관리 욕구 영역 10개는 통합사례관리 공개 매뉴얼의 영역 이름을 따랐다(원문 대조 필요 — 한계).
  var NEEDS = [
    ["경제", /생활비|돈이 없|수입|빚|채무|대출|연체|체납|월세 밀|실직|일자리|폐업|생계/],
    ["건강", /아프|병원|수술|약|통증|치료|입원|당뇨|혈압|암|의료비/],
    ["정신건강", /우울|죽고|극단|잠을 못|불안|술|외롭/],
    ["주거", /월세|집주인|이사|쫓겨|곰팡|누수|보일러|주거/],
    ["에너지", /전기|가스|난방|보일러|추워|단전|단수/],
    ["돌봄", /혼자 못|거동|치매|돌봐|간병|요양|식사 준비/],
    ["고용", /일자리|취업|일을 못|구직|실직/],
    ["가족관계", /자녀|아들|딸|배우자|이혼|연락 끊|가족/],
    ["안전", /폭력|때리|위협|학대|넘어|낙상|화재/],
    ["법률·권익", /소송|압류|법|사기|명의/],
    ["식생활", /끼니|굶|밥|식사|반찬/]
  ];
  var CASE_DOMAINS = ["안전", "건강", "일상생활유지", "가족관계", "사회적관계", "경제", "교육", "고용", "생활환경", "법률 및 권익보장"];
  var NEED_TO_DOMAIN = { "경제": "경제", "건강": "건강", "정신건강": "건강", "주거": "생활환경", "에너지": "생활환경",
    "돌봄": "일상생활유지", "고용": "고용", "가족관계": "가족관계", "안전": "안전", "법률·권익": "법률 및 권익보장", "식생활": "일상생활유지" };
  var URGENT_RE = /죽고|극단|자살|폭력|때리|굶|쫓겨|단전|단수/;
  function sentences(t) { return String(t || "").split(/[.\n!?。]+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 3; }); }
  F.consult = {
    CASE_DOMAINS: CASE_DOMAINS,
    draft: function (text, ctx) {
      ctx = ctx || {};
      var ai = ctx.aiResult || null, sents = sentences(text);
      var needs = [], evid = {};
      NEEDS.forEach(function (n) {
        var hit = sents.filter(function (s) { return n[1].test(s); });
        if (hit.length) { needs.push(n[0]); evid[n[0]] = hit.slice(0, 2); }
      });
      if (ai && ai.needs) needs = uniq(needs.concat(ai.needs.filter(function (x) { return x !== "긴급"; })));
      var urgent = URGENT_RE.test(text) || !!(ai && ai.urgent);
      var svcNames = (ctx.services || []).map(function (s) { return s.name || s; });
      var at = ctx.at ? new Date(ctx.at) : new Date();
      var CH = { visit: "가정방문", phone: "전화", center: "내방" };
      var summary = ai && ai.summary ? ai.summary : sents.slice(0, 2).join(". ") + (sents.length ? "." : "");
      var fields = [
        ["consultAt", "상담 일시", ymd(at) + " " + pad(at.getHours()) + ":" + pad(at.getMinutes())],
        ["method", "상담 방법", CH[ctx.channel] || "가정방문"],
        ["subject", "대상", (ctx.label || "") + (ctx.area ? " · " + ctx.area : "")],
        ["main", "주요 호소(상담 내용 요약)", summary],
        ["needs", "욕구 영역", needs.join(", ")],
        ["situation", "가구 상황", sents.filter(function (s) { return /혼자|가족|자녀|배우자|살|집/.test(s); }).slice(0, 2).join(". ")],
        ["urgent", "긴급 여부", urgent ? "긴급 — 당일 긴급복지·정신건강 연계 검토" : "일반"],
        ["action", "조치 내용", svcNames.length ? "연계 후보 안내: " + svcNames.join(", ") : ""],
        ["plan", "향후 계획", urgent ? "1영업일 안에 재연락·연계 결과 확인" : "연계 신청 결과를 2주 안에 확인"]
      ].map(function (f) { return { key: f[0], label: f[1], value: f[2] || "", auto: !!f[2] }; });
      var caseForm = CASE_DOMAINS.map(function (d) {
        var from = needs.filter(function (n) { return NEED_TO_DOMAIN[n] === d; });
        var ev = []; from.forEach(function (n) { (evid[n] || []).forEach(function (s) { ev.push(s); }); });
        return { domain: d, finding: from.length ? (ev.length ? uniq(ev).join(" / ") : from.join(", ") + " 욕구 확인") : "" };
      });
      var copyText = fields.map(function (f) { return "[" + f.label + "] " + (f.value || "(직접 입력)"); }).join("\n");
      var caseText = caseForm.filter(function (c) { return c.finding; }).map(function (c) { return "○ " + c.domain + ": " + c.finding; }).join("\n");
      return { fields: fields, caseForm: caseForm, urgent: urgent, needs: needs, copyText: copyText, caseText: caseText,
        note: "초안입니다. 행복이음 입력·확정은 담당 공무원이 합니다(실제 입력 화면 항목과 대조 필요)." };
    }
  };

  // ── ⑧ 방문 전 한 장 카드 (O6·O12) ─────────────────────────
  // 자격 대조는 «가능성 표시»일 뿐 선정 결정이 아니다. 기준은 각 사업 공개 안내의 큰 줄기(연령·가구·위기 사유)만 보고, 소득·재산은 늘 «확인 필요».
  var ELIG = [
    { name: "기초연금", test: function (x) { return x.age >= 65 ? ["가능성", "만 65세 이상 — 소득인정액은 신청 때 조사"] : ["어려움", "만 65세 미만"]; } },
    { name: "노인맞춤돌봄서비스", test: function (x) { return x.age >= 65 && (x.single || x.age >= 75) ? ["가능성", "65세 이상 홀로·고령 — 수급·차상위 등 기준 확인"] : x.age >= 65 ? ["확인 필요", "65세 이상 — 돌봄 필요도 판정"] : ["어려움", "65세 미만"]; } },
    { name: "긴급복지지원", test: function (x) { return x.crisis.length ? ["가능성", "위기 사유: " + x.crisis.join(", ") + " — 소득·재산 기준 확인"] : ["확인 필요", "위기 사유는 상담으로 확인"]; } },
    { name: "국민취업지원제도", test: function (x) { return x.jobLoss && x.age >= 15 && x.age <= 69 ? ["가능성", "실직·구직 중 15~69세"] : null; } },
    { name: "장애인활동지원", test: function (x) { return x.disability ? ["확인 필요", "장애 가구원 — 서비스 지원 종합조사 필요"] : null; } },
    { name: "드림스타트", test: function (x) { return x.youngChild ? ["가능성", "12세 이하 아동 가구"] : null; } },
    { name: "에너지바우처", test: function (x) { return x.energy || x.age >= 65 || x.disability || x.youngChild ? ["확인 필요", "생계·의료급여 등 수급 가구일 때 — 수급 여부 확인"] : null; } }
  ];
  var CRISIS = { power_cut: "단전", water_cut: "단수", gas_cut: "단가스", rent_arrears: "월세 체납", medical_overspend: "의료비 과다", job_loss: "실직", benefit_stopped: "급여 중지", loan_overdue: "채무 연체" };
  F.visitCard = {
    ELIG: ELIG,
    /** d = {household, factors?:[{reason,kind}], signals?:[{text}], attempts, safety?, tips?, now} */
    build: function (d) {
      var h = d.household || {}, m = h.members || [], ind = h.indicators || {};
      var age = +((m[0] || {}).age) || 0;
      var x = { age: age, single: !!h.single, disability: !!h.disability,
        youngChild: m.some(function (p) { return p.role === "자녀" && p.age <= 12; }),
        jobLoss: !!ind.job_loss, energy: !!(ind.power_cut || ind.gas_cut),
        crisis: Object.keys(CRISIS).filter(function (k) { return ind[k]; }).map(function (k) { return CRISIS[k]; }) };
      var att = (d.attempts || []).filter(function (t) { return t.householdId === h.id; }).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
      var nx = suggestNext(d.attempts, h.id, d.now);
      var safe = F.safety.twoPerson(d.safety, d.attempts, d.tips, h.id);
      var cautions = [];
      if (safe.two) cautions.push("2인 방문 — " + safe.why);
      if (h.daysSinceContact == null || h.daysSinceContact >= 365) cautions.push("1년 넘게 연락이 없던 집 — 먼저 전화·안내문으로 방문을 알리기");
      if (x.single && age >= 75) cautions.push("75세 이상 홀로 사는 어르신 — 천천히, 큰 글씨 안내문 챙기기");
      if (x.disability) cautions.push("장애 가구원 — 이동·의사소통 도움 필요 여부 미리 확인");
      if (nx.lastResult === "refused") cautions.push("지난번 상담 거부 — 이웃·통반장과 함께 다시 권유");
      var elig = [];
      ELIG.forEach(function (e) { var r = e.test(x); if (r) elig.push({ name: e.name, status: r[0], why: r[1] }); });
      var ORD = { "가능성": 0, "확인 필요": 1, "어려움": 2 };
      elig.sort(function (a, b) { return ORD[a.status] - ORD[b.status]; });
      return {
        id: h.id, title: (h.label || h.id) + " · " + (h.area || ""),
        members: (x.single ? "1인" : m.length + "인") + " 가구 · 본인 " + (age || "?") + "세" + (x.disability ? " · 장애 가구원" : ""),
        why: (d.signals || []).map(function (s) { return s.text; }).concat((d.factors || []).filter(function (f) { return f.kind !== "요청"; }).map(function (f) { return f.reason; })).slice(0, 6),
        tries: att.slice(-4).map(function (t) { return { at: ymd(t.at) + " " + slotOf(t.at), channel: t.channel, result: RESULTS[t.result] || t.result, note: t.note || "" }; }),
        next: nx.closed ? nx.closedWhy : nx.next ? nx.next.date + " " + nx.next.slot + " — " + nx.next.why : "",
        cautions: cautions, twoPerson: safe.two, eligibility: elig,
        recommend: elig.filter(function (e) { return e.status === "가능성"; }).map(function (e) { return e.name; }),
        disclaimer: "자격 대조는 가능성 표시일 뿐 선정 결정이 아닙니다. 소득·재산·세부 기준은 신청 뒤 소관 기관이 조사·결정합니다."
      };
    }
  };

  // ── ⑨ 안전 방문 (2인 방문 표시·방문 시작/귀청 확인·민원 기록 서식) ─────
  var RISK_RE = /폭언|욕설|위협|흉기|폭력|맹견|개 조심|만취|고함/;
  var SAFE_MIN = 90; // 방문 시작 뒤 이 시간 안에 귀청 확인이 없으면 팀장 확인 대상(시연 기본값)
  function S0(st) { st = st || {}; return { flags: st.flags || {}, visits: st.visits || [] }; }
  F.safety = {
    RISK_RE: RISK_RE, VISIT_MIN: SAFE_MIN,
    flag: function (st, householdId, on, reason, at) {
      st = S0(st); var f = Object.assign({}, st.flags);
      if (on) f[householdId] = { on: true, reason: reason || "담당자 표시", at: new Date(at || Date.now()).toISOString() }; else delete f[householdId];
      return { flags: f, visits: st.visits };
    },
    /** 2인 방문이 필요한가: 담당자 표시 → 지난 기록 메모·제보에 위험 낱말 */
    twoPerson: function (st, attempts, tips, householdId) {
      st = S0(st);
      if (st.flags[householdId]) return { two: true, why: "담당자 표시(" + st.flags[householdId].reason + ")" };
      var hit = (attempts || []).concat(tips || []).filter(function (t) { return t.householdId === householdId && RISK_RE.test((t.note || "") + " " + (t.text || "")); })[0];
      return hit ? { two: true, why: "지난 기록에 «" + (((hit.note || "") + " " + (hit.text || "")).match(RISK_RE) || [""])[0] + "» — 동행 권장" } : { two: false, why: "" };
    },
    start: function (st, v) {
      st = S0(st); if (!v || !v.householdId) throw new Error("householdId 필요");
      var at = v.at ? new Date(v.at) : new Date(), min = v.minutes || SAFE_MIN;
      var rec = { id: "V" + at.getTime(), householdId: v.householdId, buddy: v.buddy || "", startAt: at.toISOString(), dueAt: new Date(at.getTime() + min * 60000).toISOString(), backAt: null };
      return { flags: st.flags, visits: st.visits.concat([rec]) };
    },
    checkin: function (st, visitId, at) {
      st = S0(st);
      return { flags: st.flags, visits: st.visits.map(function (v) { return v.id === visitId ? Object.assign({}, v, { backAt: new Date(at || Date.now()).toISOString() }) : v; }) };
    },
    open: function (st) { return S0(st).visits.filter(function (v) { return !v.backAt; }); },
    /** 귀청 확인 시각이 지난 방문 → 팀장 확인 화면에 띄운다 */
    overdue: function (st, now) { var t = new Date(now || Date.now()).toISOString(); return S0(st).visits.filter(function (v) { return !v.backAt && v.dueAt < t; }); },
    complaintForm: function (o) {
      o = o || {}; var at = o.at ? new Date(o.at) : new Date();
      return ["[민원·위험 상황 기록]", "일시: " + ymd(at) + " " + pad(at.getHours()) + ":" + pad(at.getMinutes()), "장소: " + (o.area || "") + " " + (o.label || ""),
        "동행자: " + (o.buddy || "(없음)"), "상황(들은 말·행동을 있는 그대로): ", "대응(자리 피함·112 신고·팀장 보고 등): ",
        "증거(녹음·사진 여부, 개인 식별 주의): ", "후속 조치(2인 방문 지정·민원 담당 공유): "].join("\n");
    }
  };

  // ── ⑩ 강제개문·긴급 조치 체크리스트 ─────────────────────────
  // ⚠️ 문 개방 판단·집행은 경찰·소방 몫이다. 이 목록은 담당 공무원이 «무엇을 언제 했는지» 남기는 기록 순서이며,
  //    근거 법령·기관 지침은 원문 대조 전(미대조)이다 — 실제 운영 전 기관 지침으로 바꾼다.
  var ENTRY = [
    { key: "tries", label: "연락 시도 기록(전화·문자·안내문·이웃 문의)" },
    { key: "report", label: "112·119 신고, 공동 대응 요청(문 개방은 경찰·소방이 판단)" },
    { key: "witness", label: "입회자 확인(통반장·관리사무소·가족 중)" },
    { key: "photo_before", label: "진입 전 현장 사진(얼굴·개인정보가 찍히지 않게)" },
    { key: "inside", label: "진입 뒤 상태·조치 기록(119 이송·응급 조치 등)" },
    { key: "approve", label: "팀장 보고·승인 기록" },
    { key: "after", label: "사후 조치(가족 통보·문 원상 복구·후속 상담 일정)" }
  ];
  F.forcedEntry = {
    STEPS: ENTRY,
    note: "문 개방은 경찰·소방이 판단합니다. 이 목록은 기록 순서이며 근거 지침은 원문 대조 전입니다(실제 운영 전 기관 지침으로 교체).",
    record: function (log, householdId, step, note, at) {
      if (!householdId || !step) throw new Error("householdId·step 필요");
      return F.forcedEntry.undo(log, householdId, step).concat([{ householdId: householdId, step: step, note: note || "", at: new Date(at || Date.now()).toISOString() }]);
    },
    undo: function (log, householdId, step) { return (log || []).filter(function (x) { return !(x.householdId === householdId && x.step === step); }); },
    status: function (log, householdId) {
      var mine = (log || []).filter(function (x) { return x.householdId === householdId; });
      var steps = ENTRY.map(function (s) { var r = mine.filter(function (x) { return x.step === s.key; })[0]; return { key: s.key, label: s.label, done: !!r, at: r ? r.at : null, note: r ? r.note : "" }; });
      var todo = steps.filter(function (s) { return !s.done; })[0];
      return { steps: steps, done: steps.filter(function (s) { return s.done; }).length, total: steps.length, next: todo ? todo.label : null };
    }
  };

  // ── ⑪ 연계 누락 보드 (상담 → 연계 → 결과 확인 단계에서 멈춘 집) ───────
  var GAP = { afterLink: 14, afterSeen: 3 }; // 시연 기본값: 연계 뒤 14일·요청 확인 뒤 3영업일
  F.linkGap = {
    GAP: GAP,
    /** d = {households, requests, attempts, links, outcomes, now} */
    build: function (d) {
      var now = d.now ? new Date(d.now) : new Date();
      var hh = {}; (d.households || []).forEach(function (h) { hh[h.id] = h; });
      var links = d.links || [], outc = d.outcomes || {};
      var linked = {}; links.forEach(function (l) { linked[l.householdId] = 1; });
      function L(id) { var h = hh[id]; return h ? { label: h.label, area: h.area } : { label: id, area: "" }; }
      var last = {}; (d.attempts || []).slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; }).forEach(function (t) { last[t.householdId] = t; });
      var a = Object.keys(last).filter(function (id) { return last[id].result === "met" && !linked[id]; }).map(function (id) {
        var days = Math.max(0, daysBetween(last[id].at, now));
        return Object.assign({ id: id, days: days, why: "만남·상담 " + days + "일 지남 — 연계 저장 없음" }, L(id));
      });
      var b = links.filter(function (l) { return !outc[l.id] && daysBetween(l.at, now) >= GAP.afterLink; }).map(function (l) {
        var days = daysBetween(l.at, now);
        return { id: l.householdId, linkId: l.id, label: l.label || L(l.householdId).label, area: l.area || L(l.householdId).area, days: days, why: "연계 " + days + "일 지남 — 신청·결정 결과 확인 안 함" };
      });
      var c = (d.requests || []).filter(function (r) { return r.status === "seen" || r.status === "visiting"; }).map(function (r) {
        var hs = (r.history || []).slice(-1)[0], x = startOfDay(hs ? hs.at : r.createdAt), wd = 0, end = startOfDay(now);
        while (x < end) { x = new Date(x.getTime() + DAY); if (x.getDay() % 6) wd++; }
        return { id: r.id, requestId: r.id, label: (r.displayName ? r.displayName + " " : "") + "요청 " + r.id, area: r.region || "", days: wd,
          why: "«" + (r.status === "seen" ? "확인" : "방문 예정") + "» 뒤 " + wd + "영업일 변화 없음" };
      }).filter(function (x) { return x.days >= GAP.afterSeen; });
      function by(p, q2) { return q2.days - p.days; }
      return {
        stages: [
          { key: "met_nolink", label: "상담했는데 연계 없음", items: a.sort(by) },
          { key: "req_stalled", label: "요청 확인 뒤 멈춤", items: c.sort(by) },
          { key: "link_nocheck", label: "연계했는데 결과 확인 안 함", items: b.sort(by) }
        ],
        total: a.length + b.length + c.length,
        note: "멈춤 기준(시연 설정): 요청 확인 뒤 " + GAP.afterSeen + "영업일 · 연계 뒤 " + GAP.afterLink + "일. 상담 뒤 연계 없음은 바로 표시합니다."
      };
    },
    markOutcome: function (outcomes, linkId, result, at) { var o = Object.assign({}, outcomes || {}); o[linkId] = { result: result, at: new Date(at || Date.now()).toISOString() }; return o; }
  };

  // ── ⑫ 국민 요청 답변 초안 (전화 대본·문자 문안 — 발송은 사람) ──────────
  F.reply = {
    draft: function (r, o) {
      o = o || {}; r = r || {};
      var office = o.office || ((r.region || "주소지") + " 행정복지센터 맞춤형복지팀");
      var who = r.displayName ? r.displayName + "님" : "요청하신 분";
      var svc = (r.matched || []).slice(0, 3).map(function (m) { return m.name; });
      var CP = { visit: "댁으로 찾아뵙고", phone: "전화로", center: "센터에서 뵙고" };
      var proxy = r.proxy && r.proxy.isProxy ? (r.proxy.relation || "가족") + "분 일로 " : "";
      var sms = "[" + office + "] " + who + ", " + proxy + "보내 주신 도움 요청(" + (r.id || "") + ")을 확인했습니다. " +
        (svc.length ? svc.join("·") + " 등을 " : "받으실 수 있는 지원을 ") + (CP[r.contactPref] || "전화로") + " 자세히 안내드리겠습니다. 편한 시간을 알려 주세요." +
        (r.urgent ? " 급하시면 129(보건복지상담센터)로 바로 전화하실 수 있습니다." : "");
      var sit = String(r.situation || "");
      var phone = [
        "안녕하세요, " + office + " 담당자입니다. " + who + " 맞으신가요?",
        "닿음으로 보내 주신 도움 요청을 보고 연락드렸습니다." + (proxy ? " " + proxy + "요청하신 것으로 알고 있습니다." : ""),
        sit ? "적어 주신 내용이 «" + sit.slice(0, 40) + (sit.length > 40 ? "…" : "") + "» 맞으실까요?" : "지금 어떤 점이 가장 어려우신지 여쭤봐도 될까요?",
        svc.length ? "말씀하신 상황이면 " + svc.join(", ") + " 같은 지원을 함께 알아볼 수 있습니다." : "받으실 수 있는 지원을 함께 찾아보겠습니다.",
        r.contactPref === "visit" ? "댁으로 찾아뵈려고 하는데 언제가 편하실까요? (오전·오후·저녁)" : r.contactPref === "center" ? "센터에 오실 때 신분증을 챙겨 주시면 한 번에 접수됩니다." : "필요한 서류는 문자로 다시 보내 드리겠습니다.",
        r.urgent ? "혹시 오늘 당장 위험하거나 끼니·난방이 끊긴 상황이면 바로 말씀해 주세요. 긴급 지원부터 하겠습니다." : null,
        "급하시면 129(보건복지상담센터)로도 상담하실 수 있습니다. 감사합니다."
      ].filter(Boolean);
      return { sms: sms, phone: phone, smsLen: sms.length, note: "초안입니다. 발송·통화는 담당자가 내용을 확인한 뒤 합니다(자동 발송 없음)." };
    }
  };

  return F;
});
