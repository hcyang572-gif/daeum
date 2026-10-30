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
  // 관공서 공휴일(대체공휴일 포함) — 「관공서의 공휴일에 관한 규정」. 2026년은 확정분, 2027년은 음력·대체 규칙으로 계산한 «추정»
  // (한국천문연구원 월력요항·관보 대조 전). 목록 밖 임시공휴일은 반영되지 않는다(한계).
  var HOLIDAYS = {
    "2026-12-25": "성탄절",
    "2027-01-01": "신정", "2027-02-08": "설날 연휴", "2027-02-09": "설날 대체공휴일(추정)", "2027-03-01": "삼일절",
    "2027-05-05": "어린이날", "2027-05-13": "부처님오신날(추정)", "2027-08-16": "광복절 대체공휴일(추정)",
    "2027-09-14": "추석 연휴(추정)", "2027-09-15": "추석(추정)", "2027-09-16": "추석 연휴(추정)",
    "2027-10-04": "개천절 대체공휴일(추정)", "2027-10-11": "한글날 대체공휴일(추정)", "2027-12-27": "성탄절 대체공휴일(추정)"
  };
  function isOff(d) { var w = d.getDay(); return w === 0 || w === 6 || !!HOLIDAYS[ymd(d)]; }
  /** 영업일 더하기(토·일·관공서 공휴일 건너뜀 — 임시공휴일은 미반영) */
  function addWorkdays(d, n) {
    d = startOfDay(d);
    while (n > 0) { d = new Date(d.getTime() + DAY); if (!isOff(d)) n--; }
    return d;
  }
  /** 영업일 빼기(시연 기록을 «오늘» 기준으로 거꾸로 깔 때) */
  function subWorkdays(d, n) {
    d = startOfDay(d);
    while (n > 0) { d = new Date(d.getTime() - DAY); if (!isOff(d)) n--; }
    return d;
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  F.util = { ymd: ymd, daysBetween: daysBetween, addWorkdays: addWorkdays, subWorkdays: subWorkdays, startOfDay: startOfDay, isOff: isOff, HOLIDAYS: HOLIDAYS };

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
    outcomes: "daeum.officer.outcomes",   // ⑪ 연계 결과 확인 {linkId:{result:"applied"|"decided"|"not_applied",at}}
    handoff: "daeum.officer.handoff",     // S9h-④ 행복이음으로 옮긴 시각 {householdId: iso}
    followups: "daeum.officer.followups"  // S9j 사후관리 재점검 완료 {"<linkId>:m1"|"<linkId>:m3": iso}
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
      order: order.map(function (s) { var o = { id: s.id, label: s.label, area: s.area, kind: s.kind }; if (s.alert) o.alert = s.alert; return o; }),
      km: +km.toFixed(1), naiveKm: +naiveKm.toFixed(1),
      minutes: Math.round(km / KMH * 60 + order.length * VISIT_MIN)
    };
  }
  F.route = { plan: planRoute, DETOUR: DETOUR, KMH: KMH, VISIT_MIN: VISIT_MIN };

  // ── 요청 처리 기한(시연 설정) ─────────────────────────────
  // ⚠️ 지침상 개별 처리 기한은 미확인(01_리서치/현행_위기가구_발굴절차.md 3행). 시연 기본값: 긴급 당일·일반 3영업일(O-08).
  var DUE = { urgent: 0, normal: 3, soonDays: 1 }; // O-08: 긴급은 «오늘 먼저»와 맞게 접수 당일이 기한
  function requestDue(r) { return addWorkdays(new Date(r.createdAt), r.urgent ? DUE.urgent : DUE.normal); }
  function isOpen(r) { return r && r.status !== "done" && r.status !== "cancelled"; }
  // ── 주민 신호 종류(S9h C안: 주민 창구 = «이웃 제보·도움 요청 → 방문 순서 반영» 입구) ──
  // self = 본인 요청 · family = 가족이 대신 · neighbor = 이웃이 걱정된다고 알림(r.signal 이 있으면 그것을 따른다)
  function signalOf(r) {
    if (!r) return "self";
    if (r.signal === "self" || r.signal === "family" || r.signal === "neighbor") return r.signal;
    var p = r.proxy || {};
    if (!p.isProxy) return "self";
    return /이웃|통장|이장|집주인|관리/.test(p.relation || "") ? "neighbor" : "family";
  }
  var SIGNAL_TEXT = { self: "주민이 직접 도움 요청", family: "가족이 대신 도움 요청", neighbor: "이웃이 걱정된다고 알림" };
  var SIGNAL_SHORT = { self: "도움 요청", family: "가족 대신 요청", neighbor: "이웃 알림" };
  function signalText(r) { return SIGNAL_TEXT[signalOf(r)] + (r && r.urgent ? "(긴급 낱말)" : ""); }
  F.signals = { of: signalOf, text: signalText, TEXT: SIGNAL_TEXT, SHORT: SIGNAL_SHORT };
  function reqLabel(r) {
    var k = signalOf(r);
    var who = k === "family" ? " (" + (r.proxy.relation || "가족") + " 대신)" : k === "neighbor" ? (r.place ? " · " + String(r.place).slice(0, 20) : "") : "";
    return (r.displayName && k !== "neighbor" ? r.displayName + " " : "") + SIGNAL_SHORT[k] + " " + r.id + who;
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
  // S10o-2 ④ 3번째 허탕 뒤 «간접 확인 순서표» — 누구에게 먼저 묻나(통반장 → 이웃 → 집주인 → 흔적 → 안내문 → 협의체).
  // who 가 있는 줄은 «제보로 남기기»(F.households.addTip)로 이어져 그 집이 명단·동선 앞쪽으로 온다(기존 이웃·통반장 제보 재사용).
  var INDIRECT_STEPS = [
    { key: "tong", who: "통장·이장", text: "통장·이장에게 실거주 여부 묻기" },
    { key: "neighbor", who: "이웃", text: "이웃에게 최근 모습·출입 묻기" },
    { key: "landlord", who: "집주인", text: "집주인·관리사무소에게 실거주·다른 연락처 묻기" },
    { key: "trace", who: "", text: "우편함·전기·가스 계량기 사용 흔적 보기(사진은 개인 식별 안 되게)" },
    { key: "note", who: "", text: "방문 안내문(연락 달라는 쪽지) 남기기" },
    { key: "council", who: "명예사회복지공무원", text: "지역사회보장협의체·명예사회복지공무원에게 함께 살펴 달라고 부탁" }
  ];
  /** 순서표 + 체크 상태. checked = {key:true} (store «indirect»[householdId]) */
  function indirectOrder(checked) {
    checked = checked || {};
    var steps = INDIRECT_STEPS.map(function (x, i) { return { no: i + 1, key: x.key, who: x.who, text: x.text, done: !!checked[x.key] }; });
    var next = steps.filter(function (x) { return !x.done; })[0] || null;
    return { steps: steps, done: steps.filter(function (x) { return x.done; }).length, next: next,
      source: "출처: 서울 강남구 «3회 방문 뒤 간접조사» 공개 사례(gangnam.go.kr) · 재시도 3번은 현장 설문 응답(소수) — 횟수·순서는 시연 기본값" };
  }
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
    var gap = last.channel === "ai" ? 1 : Math.min(out.failed, 3); // 1·2·3 영업일 간격으로 늘림(가정)
    // 정보원 AI 초기상담 전화(채널 "ai")가 못 닿았으면 담당자 전화를 한 번 더 걸기보다 방문으로 넘긴다(현행 절차: AI 전화 → 심층상담·방문)
    var channel = last.result === "wrong_contact" || last.channel === "ai" ? "visit" : last.channel === "phone" && out.failed >= 2 ? "visit" : last.channel;
    var why = last.result === "refused" ? "거부 — 시간을 두고 다른 담당자·이웃 통해 다시 권유"
      : last.result === "wrong_contact" ? "연락처·주소 틀림 — 방문으로 실거주 확인"
      : last.channel === "ai" ? "AI 초기상담 전화 안 닿음 — 방문으로 확인"
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
    INDIRECT_STEPS: INDIRECT_STEPS, indirectOrder: indirectOrder, labelOf: labelOf,
    /** 마지막 기록으로 «간접 확인»에 처음 들어섰나(3번째 허탕을 막 누른 순간 순서표를 띄우려고) */
    justEscalated: function (attempts, householdId, now) {
      var all = attempts || [], mine = all.filter(function (t) { return t.householdId === householdId; });
      if (!mine.length) return false;
      var last = mine[mine.length - 1], before = all.filter(function (t) { return t !== last; });
      return !!suggestNext(all, householdId, now).escalate && !(before.some(function (t) { return t.householdId === householdId; }) && suggestNext(before, householdId, now).escalate);
    },
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
          channel: signalOf(r) === "neighbor" ? "visit" : r.contactPref || "phone",
          why: r.urgent ? "긴급 낱말 있음 — 오늘 먼저" : signalOf(r) === "neighbor" ? "이웃 알림 — 찾아가 실거주·안부 확인" : SIGNAL_TEXT[signalOf(r)], due: ymd(requestDue(r)) };
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
      // S10h ⑧: 협약 기관 무반응 신호(가상) 가구가 맨 먼저 — alertIds 는 alerts.js todayIds()
      (data.alertIds || []).forEach(function (id) { var h = byId[id]; if (h) push({ id: h.id, label: h.label, area: h.area, kind: "household", alert: "noresp", x: h.x, y: h.y }); });
      reqs.forEach(function (r) {
        if (r.contactPref !== "visit" && signalOf(r) !== "neighbor") return;
        var a = areaC[r.region] || { x: 0, y: 0 };
        push({ id: r.id, label: reqLabel(r), area: r.region || "미상", kind: "request", x: a.x, y: a.y });
      });
      revisit.filter(function (x) { return x.channel === "visit"; }).forEach(function (x) { var h = byId[x.id]; if (h) push({ id: h.id, label: h.label, area: h.area, kind: "household", x: h.x, y: h.y }); });
      (data.picked || []).forEach(function (id) { var h = byId[id]; if (h) push({ id: h.id, label: h.label, area: h.area, kind: "household", x: h.x, y: h.y }); });
      var route = planRoute(stops, data.office, data.areas);

      return {
        date: today,
        counts: { newRequests: newItems.length, dueSoon: dueItems.length, revisits: revisit.length, stops: stops.length, noResp: stops.filter(function (s) { return s.alert === "noresp"; }).length },
        sections: [
          { key: "new", title: "새 주민 신호", hint: "주민 창구로 들어온 도움 요청·이웃 알림", items: newItems },
          { key: "due", title: "기한 임박", hint: "처리 기한(시연 설정: 긴급 당일·일반 3영업일) 하루 이내·지남", items: dueItems },
          { key: "revisit", title: "재방문·재연락", hint: "지난 시도 결과로 오늘 다시 할 집", items: revisit },
          { key: "route", title: "오늘 동선", hint: "읍면별로 묶고 가까운 순", items: route.order }
        ],
        route: route
      };
    }
  };

  // ── ② 가구 명단: 지역 신호로 순서 조정(점수 없음) ───────────
  F.households = {
    /** 읍면동 고르기에 띄울 곳 — 가구가 1곳 이상 있는 읍면동만(정본 순서 유지). areas = [{name}], households = [{area}] */
    areaChoices: function (areas, households) {
      var n = {}; (households || []).forEach(function (h) { n[h.area] = (n[h.area] || 0) + 1; });
      return (areas || []).filter(function (a) { return n[a.name] > 0; }).map(function (a) { return { name: a.name, count: n[a.name] }; });
    },
    /** data = {households (정보원 명단 순서 그대로), requests, attempts, tips, officerOrder:[id]} */
    order: function (data) {
      var hh = data.households || [], pins = data.officerOrder || [];
      var tips = data.tips || [], attempts = data.attempts || [];
      var reqByHH = {}; (data.requests || []).filter(isOpen).forEach(function (r) { if (r.householdId) (reqByHH[r.householdId] = reqByHH[r.householdId] || []).push(r); });
      var items = hh.map(function (h, i) {
        var sig = [];
        (reqByHH[h.id] || []).forEach(function (r) { sig.push({ kind: "request", text: signalText(r) }); });
        if (h.request && !reqByHH[h.id]) sig.push({ kind: "request", text: signalText(h.request) });
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
        note: "방문 순서를 정한 근거만 보여 줍니다. 위험 판단은 한국사회보장정보원 명단 그대로이고, 닿음은 주민 요청·이웃 제보·지난 시도 같은 지역 신호가 있는 집을 앞에 둘 뿐입니다. 최종 순서는 담당자가 정합니다."
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

  // ── ⑪ 연계 누락·미신청 보드 (상담 → 안내 → 신청 → 결정, 어디서 멈췄나) ───────
  // 현장 고충 5: 위기가구 서비스 연계율 24.9%(2021), 예측 63.3만 → 수급 22.8만(01_리서치/현행_위기가구_발굴절차.md §6).
  // 행복이음은 연계율을 «집계»하지만, 담당자 개인의 «안내했는데 신청 안 한 집» 알림은 공개 자료에서 확인되지 않는다(행복이음_기능_대조.md §3).
  var GAP = { afterLink: 14, afterSeen: 3, afterApply: 30 }; // 시연 기본값: 안내 뒤 14일·요청 확인 뒤 3영업일·신청 뒤 30일
  var OUTCOME = { applied: "신청함", decided: "결정 확인", not_applied: "안 하기로 함" };
  function outcomeKey(o) { if (!o) return null; var r = o.result; return r === "applied" || r === "not_applied" ? r : "decided"; } // 옛 값(«확인»·«선정»)은 결정 확인으로 본다
  F.linkGap = {
    GAP: GAP, OUTCOME: OUTCOME,
    /** d = {households, requests, attempts, links, outcomes, now} */
    build: function (d) {
      var now = d.now ? new Date(d.now) : new Date();
      var hh = {}; (d.households || []).forEach(function (h) { hh[h.id] = h; });
      var links = d.links || [], outc = d.outcomes || {};
      var linked = {}; links.forEach(function (l) { linked[l.householdId] = 1; });
      function L(id) { var h = hh[id]; return h ? { label: h.label, area: h.area } : { label: id, area: "" }; }
      function svc(l) { return (l.serviceNames || l.serviceIds || []).slice(0, 3).join(", "); }
      var last = {}; (d.attempts || []).slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; }).forEach(function (t) { last[t.householdId] = t; });
      var a = Object.keys(last).filter(function (id) { return last[id].result === "met" && !linked[id]; }).map(function (id) {
        var days = Math.max(0, daysBetween(last[id].at, now));
        return Object.assign({ id: id, days: days, why: "만남·상담 " + days + "일 지남 — 연계 저장 없음" }, L(id));
      });
      var b = links.filter(function (l) { return !outc[l.id] && daysBetween(l.at, now) >= GAP.afterLink; }).map(function (l) {
        var days = daysBetween(l.at, now);
        return { id: l.householdId, linkId: l.id, label: l.label || L(l.householdId).label, area: l.area || L(l.householdId).area, days: days,
          services: svc(l), why: "안내 " + days + "일 지남 — 신청했는지 확인 안 함" + (svc(l) ? " (" + svc(l) + ")" : "") };
      });
      var e = links.filter(function (l) { var o = outc[l.id]; return o && outcomeKey(o) === "applied" && daysBetween(o.at, now) >= GAP.afterApply; }).map(function (l) {
        var days = daysBetween(outc[l.id].at, now);
        return { id: l.householdId, linkId: l.id, label: l.label || L(l.householdId).label, area: l.area || L(l.householdId).area, days: days,
          services: svc(l), why: "신청 " + days + "일 지남 — 선정·탈락 결과 확인 안 함" };
      });
      var c = (d.requests || []).filter(function (r) { return r.status === "seen" || r.status === "visiting"; }).map(function (r) {
        var hs = (r.history || []).slice(-1)[0], x = startOfDay(hs ? hs.at : r.createdAt), wd = 0, end = startOfDay(now);
        while (x < end) { x = new Date(x.getTime() + DAY); if (x.getDay() % 6) wd++; }
        return { id: r.id, requestId: r.id, label: reqLabel(r), area: r.region || "", days: wd,
          why: "«" + (r.status === "seen" ? "확인" : "방문 예정") + "» 뒤 " + wd + "영업일 변화 없음" };
      }).filter(function (x) { return x.days >= GAP.afterSeen; });
      // 서비스별 «안내했는데 신청 안 함»(결과 미확인 14일 이상·안 하기로 함) — 어떤 사업이 새는지 본다
      var bySvc = {};
      links.forEach(function (l) {
        var k = outcomeKey(outc[l.id]); if (k === "applied" || k === "decided") return;
        if (!k && daysBetween(l.at, now) < GAP.afterLink) return;
        (l.serviceNames || l.serviceIds || []).forEach(function (n) { bySvc[n] = (bySvc[n] || 0) + 1; });
      });
      function by(p, q2) { return q2.days - p.days; }
      return {
        stages: [
          { key: "met_nolink", label: "상담했는데 연계 없음", items: a.sort(by) },
          { key: "req_stalled", label: "주민 신호 확인 뒤 멈춤", items: c.sort(by) },
          { key: "link_nocheck", label: "안내했는데 신청 확인 안 함", items: b.sort(by) },
          { key: "applied_nodecision", label: "신청했는데 결과 확인 안 함", items: e.sort(by) }
        ],
        total: a.length + b.length + c.length + e.length,
        notApplied: Object.keys(bySvc).map(function (n) { return { name: n, n: bySvc[n] }; }).sort(function (x, y) { return y.n - x.n; }),
        note: "멈춤 기준(시연 설정): 신호 확인 뒤 " + GAP.afterSeen + "영업일 · 안내 뒤 " + GAP.afterLink + "일 · 신청 뒤 " + GAP.afterApply +
          "일. 선정·탈락은 소관 기관이 결정하고, 여기서는 담당자가 «확인했는지»만 챙깁니다."
      };
    },
    /** result: "applied"(신청함) | "decided"(결정 확인) | "not_applied"(안 하기로 함). 옛 값은 결정 확인으로 읽는다 */
    markOutcome: function (outcomes, linkId, result, at) { var o = Object.assign({}, outcomes || {}); o[linkId] = { result: result, at: new Date(at || Date.now()).toISOString() }; return o; }
  };

  var CH_TXT = { visit: "방문", phone: "전화", center: "내방", ai: "AI 전화" };

  // ── S9h-① 하루 동선 1장 (A4 한 장: 순서·예상 시각·왜 이 집·지난 시도·주의·부재면 다음 시도·대기 방문) ──
  // 현장 고충 3(1인당 45.2→113.4건, «가가호호 방문이 사실상 어렵다») · 고충 2(부재·연락두절). 행복이음 모바일은 조회·기록·신청이고
  // 일정·동선 기능은 공개 자료에서 확인되지 않는다(행복이음_기능_대조.md §2-3). 정식 기록은 행복이음에, 이 장은 «나가기 전 한 장».
  F.daySheet = {
    /** d = {start, end, km, isRoad, ret, stops:[{id, arrive, leave, lunchBefore}], rows:{id:{household, factors, signals}},
     *       candidates:[{household, signals}] (대기 후보), attempts, safety, tips, now} */
    build: function (d) {
      var now = d.now ? new Date(d.now) : new Date(), rows = d.rows || {}, att = d.attempts || [];
      var inRoute = {}; (d.stops || []).forEach(function (s) { inRoute[s.id] = 1; });
      var areas = {};
      var stops = (d.stops || []).map(function (s, i) {
        var r = rows[s.id] || {}, h = r.household || { id: s.id, label: s.id };
        areas[h.area] = 1;
        var c = F.visitCard.build({ household: h, factors: r.factors, signals: r.signals, attempts: att, safety: d.safety, tips: d.tips, now: now });
        // 부재일 때 다음 시도: 지금 기록에 «도착 시각 부재»를 하나 더해 계산(가정)
        var at = new Date(now), hm = String(s.arrive || "10:00").split(":"); at.setHours(+hm[0] || 10, +hm[1] || 0, 0, 0);
        var ifAbsent = suggestNext(att.concat([{ householdId: h.id, channel: "visit", result: "no_answer", at: at.toISOString() }]), h.id, now);
        var lastTry = c.tries.length ? c.tries[c.tries.length - 1] : null;
        return {
          no: i + 1, id: h.id, time: (s.arrive || "") + (s.leave ? "~" + s.leave : ""), lunchBefore: !!s.lunchBefore,
          label: h.label || h.id, area: h.area || "", members: c.members,
          why: c.why.slice(0, 2), lastTry: lastTry ? lastTry.at + " " + (CH_TXT[lastTry.channel] || "") + " " + lastTry.result : "첫 방문",
          twoPerson: c.twoPerson, cautions: c.cautions.filter(function (x) { return !/^2인 방문/.test(x); }).slice(0, 2),
          bring: c.recommend.slice(0, 3),
          ifAbsent: ifAbsent.escalate ? "안내문 남기고 통반장·이웃 간접 확인으로 전환"
            : ifAbsent.next ? "안내문 남김 → 다음 " + ifAbsent.next.date.slice(5) + " " + ifAbsent.next.slot + " " + (CH_TXT[ifAbsent.next.channel] || "") : ""
        };
      });
      // 대기 방문: 재시도 날이 됐거나 지역 신호가 있는 집 중 같은 동네 먼저(부재로 시간이 남을 때 들른다)
      var today = ymd(now), standby = [];
      (d.candidates || []).forEach(function (x) {
        var h = x.household; if (!h || inRoute[h.id] || standby.length >= 8) return;
        var s = suggestNext(att, h.id, now);
        var due = s.tries && !s.closed && s.next && s.next.date <= today;
        var sig = (x.signals || []).filter(function (g) { return g.kind !== "history"; })[0];
        if (!due && !sig) return;
        standby.push({ id: h.id, label: h.label, area: h.area, near: areas[h.area] ? 1 : 0, why: due ? s.next.why : sig.text });
      });
      standby.sort(function (p, q2) { return q2.near - p.near; }); standby = standby.slice(0, 4);
      var two = stops.filter(function (x) { return x.twoPerson; }).length;
      var summary = "방문 " + stops.length + "곳 · 출발 " + (d.start || "09:30") + (d.end ? " · " + (d.ret ? "복귀 " : "마침 ") + d.end : "") +
        (d.km != null ? " · 이동 " + (+d.km).toFixed(1) + "km(" + (d.isRoad ? "도로" : "근사") + ")" : "") + (two ? " · 2인 방문 " + two + "곳" : "");
      var lines = [ymd(now) + " 하루 방문 동선 — " + summary, ""];
      stops.forEach(function (x) {
        if (x.lunchBefore) lines.push("  (점심)");
        lines.push(x.no + ". " + x.time + " " + x.label + " · " + x.area + (x.twoPerson ? " [2인 방문]" : ""));
        if (x.why.length) lines.push("   왜: " + x.why.join(" / "));
        lines.push("   지난 시도: " + x.lastTry + (x.bring.length ? " · 안내할 것(가능성): " + x.bring.join(", ") : ""));
        if (x.cautions.length) lines.push("   주의: " + x.cautions.join(" / "));
        if (x.ifAbsent) lines.push("   부재면: " + x.ifAbsent);
      });
      if (standby.length) { lines.push("", "부재로 시간이 남으면 들를 집"); standby.forEach(function (x) { lines.push(" - " + x.label + " · " + x.area + " — " + x.why); }); }
      lines.push("", "※ 방문 시작·귀청 확인은 «방문·연락» 화면에서 누릅니다. 상담·조사 결과의 정식 기록은 행복이음에 합니다.");
      return { date: ymd(now), title: ymd(now) + " 하루 방문 동선", summary: summary, stops: stops, standby: standby, text: lines.join("\n"),
        note: "예상 시각은 " + (d.isRoad ? "도로 경로" : "직선거리 근사") + " 기준입니다. 자격은 «가능성» 표시일 뿐 선정 결정이 아닙니다. 가구는 시연용 가상 자료입니다." };
    }
  };

  // ── S9h-② 시도 이력 한 줄 요약 · 며칠치 재시도 일정 ─────────────────────
  F.contacts.CHANNELS = CH_TXT;
  /** 한 집의 시도 이력: 시간대별로 무엇을 해 봤는지(같은 시간대 반복 부재를 피하려고) */
  F.contacts.timeline = function (attempts, householdId) {
    var mine = (attempts || []).filter(function (t) { return t.householdId === householdId; }).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var bySlot = { "오전": [], "오후": [], "저녁": [] };
    mine.forEach(function (t) { bySlot[slotOf(t.at)].push((CH_TXT[t.channel] || t.channel) + " " + (RESULTS[t.result] || t.result)); });
    var items = mine.map(function (t) { return { at: ymd(t.at).slice(5) + " " + slotOf(t.at), channel: CH_TXT[t.channel] || t.channel, result: RESULTS[t.result] || t.result, note: t.note || "" }; });
    var line = SLOTS.map(function (k) { return k + " " + (bySlot[k].length ? bySlot[k].length + "회(" + bySlot[k][bySlot[k].length - 1] + ")" : "안 해 봄"); }).join(" · ");
    return { tries: mine.length, items: items, bySlot: bySlot, line: line };
  };
  /** 오늘부터 days 영업일치 재시도 일정(지난 제안일은 오늘로) → [{date, label, items:[{id,label,area,slot,channel,why,escalate,overdue}]}] */
  F.contacts.plan = function (attempts, households, now, days, extra) {
    now = now ? new Date(now) : new Date(); days = days || 5;
    var byId = {}; (households || []).forEach(function (h) { byId[h.id] = h; });
    var dates = [startOfDay(now)]; while (dates.length < days) dates.push(addWorkdays(dates[dates.length - 1], 1));
    var W = ["일", "월", "화", "수", "목", "금", "토"], today = ymd(now);
    var out = dates.map(function (dt, i) { return { date: ymd(dt), label: i === 0 ? "오늘" : ymd(dt).slice(5) + " (" + W[dt.getDay()] + ")", items: [] }; });
    uniq((attempts || []).map(function (t) { return t.householdId; })).forEach(function (id) {
      var s = suggestNext(attempts, id, now); if (s.closed || !s.next) return;
      var day = s.next.date <= today ? out[0] : out.filter(function (x) { return x.date === s.next.date; })[0];
      if (!day) return; // 범위 밖
      var h = byId[id] || {};
      day.items.push({ id: id, label: h.label || id, area: h.area || "", slot: s.next.slot, channel: s.next.channel, why: s.next.why, escalate: s.escalate, overdue: s.next.date < today });
    });
    // S9j 사후관리: 연계 «결정 확인» 뒤 1·3개월 재점검(절차 8단계)도 같은 틀에 넣는다
    if (extra) F.followUp.due(extra.links, extra.outcomes, extra.followups, now).forEach(function (f) {
      var day = f.date <= today ? out[0] : out.filter(function (x) { return x.date === f.date; })[0];
      if (!day) return;
      var h = byId[f.householdId] || {};
      day.items.push({ id: f.householdId, kind: "followup", key: f.key, label: f.label || h.label || f.householdId, area: f.area || h.area || "",
        slot: "오전", channel: "phone", why: f.why, escalate: false, overdue: f.date < today });
    });
    var ORD = { "오전": 0, "오후": 1, "저녁": 2 };
    out.forEach(function (x) { x.items.sort(function (p, q2) { return (q2.overdue - p.overdue) || ORD[p.slot] - ORD[q2.slot]; }); });
    return out;
  };

  // ── S9j 사후관리 재점검(1·3개월) ─────────────────────────
  // 절차 8단계(사후관리)가 비어 있다는 점검(01_리서치/S9h_현장하루_점검.md §3-1). 간격 1·3개월은 시연 기본값(지침상 주기 미확인).
  var FOLLOW = [{ k: "m1", days: 30, label: "1개월" }, { k: "m3", days: 90, label: "3개월" }];
  F.followUp = {
    STEPS: FOLLOW,
    /** links·outcomes(«결정 확인»)·followups(완료 표시) → 아직 안 한 재점검 [{key, linkId, householdId, date, label, area, services, why}] */
    due: function (links, outcomes, followups, now) {
      now = now ? new Date(now) : new Date(); outcomes = outcomes || {}; followups = followups || {};
      var res = [];
      (links || []).forEach(function (l) {
        var o = outcomes[l.id]; if (!o || outcomeKey(o) !== "decided") return;
        var prevDone = true;
        FOLLOW.forEach(function (st) {
          var key = l.id + ":" + st.k; if (followups[key]) return; // 했음
          if (!prevDone) return; prevDone = false;               // 1개월을 안 했으면 3개월은 아직 띄우지 않는다
          var d = startOfDay(new Date(new Date(o.at).getTime() + st.days * DAY)); while (isOff(d)) d = new Date(d.getTime() + DAY);
          var svc = (l.serviceNames || l.serviceIds || []).slice(0, 2).join(", ");
          res.push({ key: key, linkId: l.id, householdId: l.householdId, date: ymd(d), label: l.label, area: l.area, services: svc,
            why: "사후관리 " + st.label + " 재점검 — 지원 받는 중인지·새 위기 없는지 확인" + (svc ? " (" + svc + ")" : "") + " · 결정 확인 " + ymd(o.at).slice(5) });
        });
      });
      return res.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    },
    mark: function (followups, key, at) { var o = Object.assign({}, followups || {}); o[key] = new Date(at || Date.now()).toISOString(); return o; }
  };

  // ── S9h-④ 행복이음으로 «나가는 것»: 입력 순서대로 정리한 초안(복사·인쇄·파일) ─────────
  // ⚠️ 현실 제약: 행복이음은 업무망(행정망) 안, 닿음 시제품은 인터넷 PC·폰 → 망분리 때문에 같은 PC에서 «복사→붙여넣기»가 안 될 수 있다.
  //    그래서 ①같은 망에 설치해 운영할 때 복사 ②한 장 인쇄해 보고 입력 ③파일 내려받기 → 기관이 허용한 자료 전송(망연계) 경로, 세 길을 둔다.
  //    항목 이름·순서는 행복이음 실제 화면을 보지 못해 «상담·조사 기록에 흔히 들어가는 순서»로 추정했다(미대조 — 행복이음_기능_대조.md §5).
  //    «들어오는 것»(명단 불러오기)은 S9f에서, 직접 API 연계는 «향후 구상»으로만 적는다.
  var HANDOFF = [
    ["subject", "대상 가구(읍면동)"], ["consultAt", "상담·조사 일시"], ["method", "상담 방법"], ["tries", "방문·연락 시도 이력"],
    ["main", "주요 호소(상담 내용 요약)"], ["needs", "욕구 영역"], ["situation", "가구 상황"], ["urgent", "긴급 여부"],
    ["action", "조치·서비스 연계"], ["result", "연계 결과(신청·결정)"], ["notEligible", "비해당 사유"], ["plan", "향후 계획"]
  ];
  F.handoff = {
    FIELDS: HANDOFF,
    FUTURE: "향후 구상: 행복이음과 직접 주고받는 연계(API)는 업무망 분리 해결·개인정보 처리 법적 근거·보건복지부·한국사회보장정보원 승인이 모두 갖춰져야 가능합니다. 시제품은 복사·인쇄·파일까지만 합니다.",
    NOTE: "행복이음에 옮겨 적기 위한 초안입니다. 항목 이름·순서는 실제 입력 화면과 대조 전(추정)이며, 입력·확정은 담당 공무원이 합니다. 망분리 환경에서는 인쇄해 보고 입력하거나 기관이 허용한 자료 전송 경로로 파일을 옮기세요.",
    /** d = {household:{id,label,area}, attempts, consults:[{householdId,at,fields}], links, outcomes, plan?, now} */
    build: function (d) {
      var h = d.household || {}, id = h.id;
      var tl = F.contacts.timeline(d.attempts, id);
      var cs = (d.consults || []).filter(function (c) { return c.householdId === id; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; })[0];
      var cf = {}; ((cs && cs.fields) || []).forEach(function (f) { cf[f.key] = f.value; });
      var lk = (d.links || []).filter(function (l) { return l.householdId === id; });
      var outc = d.outcomes || {};
      var last = (d.attempts || []).filter(function (t) { return t.householdId === id; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; })[0] || null;
      var nx = suggestNext(d.attempts, id, d.now);
      var v = {
        subject: (h.label || id || "") + (h.area ? " · " + h.area : ""),
        consultAt: cf.consultAt || (last ? ymd(last.at) : ""),
        method: cf.method || (last ? CH_TXT[last.channel] || "" : ""),
        tries: tl.items.map(function (t) { return t.at + " " + t.channel + " " + t.result + (t.note ? "(" + t.note + ")" : ""); }).join(" / "),
        main: cf.main || "", needs: cf.needs || "", situation: cf.situation || "", urgent: cf.urgent || "",
        action: lk.length ? "서비스 안내: " + uniq([].concat.apply([], lk.map(function (l) { return l.serviceNames || l.serviceIds || []; }))).join(", ") : cf.action || "",
        result: lk.map(function (l) { var o = outc[l.id]; return o ? (OUTCOME[outcomeKey(o)] || o.result) + " " + ymd(o.at) : "결과 확인 전"; }).join(" / "),
        notEligible: last && last.result === "not_eligible" ? labelOf(NON_ELIGIBLE_REASONS, last.reason) + (last.note ? "(" + last.note + ")" : "") : "",
        plan: d.plan || (!last ? cf.plan || "" : nx.closed ? nx.closedWhy : nx.next ? "다음 시도 " + nx.next.date + " " + nx.next.slot + " " + (CH_TXT[nx.next.channel] || "") + " — " + nx.next.why : "")
      };
      var fields = HANDOFF.map(function (f) { return { key: f[0], label: f[1], value: v[f[0]] || "" }; });
      return { id: id, fields: fields, filled: fields.filter(function (f) { return f.value; }).length,
        text: fields.map(function (f) { return "[" + f.label + "] " + (f.value || "(해당 없음·직접 입력)"); }).join("\n"), note: F.handoff.NOTE };
    },
    /** 기록이 있는 집 전부 → {items, pending, csv}. sent(id별 마지막으로 옮긴 시각)보다 새 기록이 있으면 pending */
    batch: function (d) {
      var hh = {}; (d.households || []).forEach(function (h) { hh[h.id] = h; });
      var all = (d.attempts || []).concat(d.consults || [], d.links || []);
      var ids = uniq(all.map(function (x) { return x.householdId; }).filter(Boolean));
      var sent = d.sent || {}, outc = d.outcomes || {};
      function lastAt(id) {
        var t = ""; all.forEach(function (x) { if (x.householdId === id && x.at > t) t = x.at; });
        (d.links || []).forEach(function (l) { var o = outc[l.id]; if (l.householdId === id && o && o.at > t) t = o.at; });
        return t;
      }
      var items = ids.map(function (id) {
        var b = F.handoff.build(Object.assign({}, d, { household: hh[id] || { id: id, label: id } }));
        b.label = (hh[id] || {}).label || id; b.area = (hh[id] || {}).area || ""; b.updatedAt = lastAt(id);
        b.pending = !sent[id] || sent[id] < b.updatedAt; return b;
      }).sort(function (x, y) { return (y.pending - x.pending) || (x.updatedAt < y.updatedAt ? 1 : -1); });
      function cell(x) { x = String(x == null ? "" : x); return /[",\r\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }
      var csv = [HANDOFF.map(function (f) { return cell(f[1]); }).join(",")].concat(items.map(function (b) { return b.fields.map(function (f) { return cell(f.value); }).join(","); })).join("\r\n");
      return { items: items, pending: items.filter(function (b) { return b.pending; }).length, csv: csv };
    },
    markSent: function (sent, ids, at) { var o = Object.assign({}, sent || {}), t = new Date(at || Date.now()).toISOString(); (ids || []).forEach(function (id) { o[id] = t; }); return o; }
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

  // ── S10o-2 ⑤ 명단 정리 입구 — 받은 명단을 붙여넣으면 «이전 차수 비해당» 배지·지난 사유로 «확인만 할 집 / 다시 볼 집»을 가른다 ──
  // 현장 공백: 같은 사람이 차수마다 다시 올라와 매번 비대상을 다시 처리하고, 이전 차수 발굴 사유가 안 보인다
  //   ([C] 나라살림연구소 2024-03-25, 01_리서치/현장공백_지도.md §1 ①). 행복이음 명단 화면의 실제 모양은 미확인 → 붙여넣기·손입력 두 길.
  // ⚠️ 지난 차수 기록은 시연용 «가상» 값(가구 번호로 정해지는 규칙)이다. 실제 운영은 담당자가 남긴 비해당 사유(attempts)만 쓴다.
  var PRIOR_ROUND = "2026년 제4차(가상)";
  function hashId(s) { var x = 0; s = String(s); for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x; }
  function crisisKeys(h) { var ind = (h && h.indicators) || {}; return Object.keys(ind).filter(function (k) { return ind[k] === true || (typeof ind[k] === "number" && ind[k] > 0); }); }
  function normId(t) { var m = /^([A-Za-z])\s*-?\s*(\d{1,3})$/.exec(String(t).trim()); if (!m) return ""; var n = String(+m[2]); while (n.length < 3) n = "0" + n; return m[1].toUpperCase() + "-" + n; }
  F.intake = {
    PRIOR_ROUND: PRIOR_ROUND,
    /** 붙여넣은 글에서 가구 번호(A-005·a005·A 5)를 뽑는다 → {ids, dup} (같은 번호 두 번이면 dup 로 센다) */
    parse: function (text) {
      var ids = [], dup = 0, re = /(?:^|[^A-Za-z0-9])([A-Za-z])\s?-?\s?(\d{1,3})(?![0-9])/g, m;
      while ((m = re.exec(String(text || "")))) { var id = normId(m[1] + "-" + m[2]); if (!id) continue; if (ids.indexOf(id) >= 0) dup++; else ids.push(id); }
      return { ids: ids, dup: dup };
    },
    normId: normId,
    crisisKeys: crisisKeys,
    /** 시연용 «지난 차수 비해당» 가상 기록 — 위기 정보가 있는 집의 약 5분의 1. crisis = 그때의 위기 정보(일부 집은 하나 적게 → 새 위기 정보 생김) */
    priorRounds: function (households) {
      var out = {}, reasons = NON_ELIGIBLE_REASONS.filter(function (r) { return r.key !== "other"; });
      (households || []).forEach(function (h) {
        var c = crisisKeys(h); if (!c.length) return;
        var x = hashId(h.id); if (x % 5 !== 0) return;
        var then = (x >> 3) % 3 === 0 ? c.slice(0, -1) : c.slice();
        out[h.id] = { round: PRIOR_ROUND, reason: reasons[(x >> 5) % reasons.length].key, crisis: then, virtual: true };
      });
      return out;
    },
    /** 시연용 붙여넣기 예시: 지난 차수 비해당 집 반 + 처음 올라온 집 반(가상 가구 번호만) */
    sample: function (households, prior, n) {
      n = n || 10;
      var withP = [], without = [];
      (households || []).forEach(function (h) { if (!crisisKeys(h).length) return; (prior[h.id] ? withP : without).push(h.id); });
      var half = Math.min(withP.length, Math.ceil(n / 2));
      return withP.slice(0, half).concat(without.slice(0, n - half));
    },
    /**
     * d = { ids, households, indicators:[{key,name}], prior:{id:{round,reason,crisis}}, attempts, requests, tips }
     * → { items:[{id,label,area,prior:{round,reason,reasonLabel,source}|null,bucket:"check"|"review",why,changes:[]}], check, review, unknown }
     */
    classify: function (d) {
      var byId = {}; (d.households || []).forEach(function (h) { byId[h.id] = h; });
      var nm = {}; (d.indicators || []).forEach(function (x) { nm[x.key] = x.name; });
      var prior = d.prior || {}, att = (d.attempts || []).slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; });
      var items = [], unknown = [];
      (d.ids || []).forEach(function (id) {
        var h = byId[id];
        if (!h) { unknown.push(id); return; }
        // 지난 비해당: 담당자가 닿음에 남긴 비해당 사유(가장 최근)가 먼저, 없으면 지난 차수(가상)
        var mine = att.filter(function (t) { return t.householdId === id && t.result === "not_eligible"; }).slice(-1)[0];
        var p = mine ? { round: "닿음 기록 " + String(mine.at).slice(0, 10), reason: mine.reason, crisis: null, source: "담당자 기록" }
          : prior[id] ? { round: prior[id].round, reason: prior[id].reason, crisis: prior[id].crisis, source: "지난 차수(가상)" } : null;
        var changes = [];
        if (p) {
          if (p.crisis) crisisKeys(h).forEach(function (k) { if (p.crisis.indexOf(k) < 0) changes.push("새 위기 정보 " + (nm[k] || k)); });
          if ((d.requests || []).some(function (r) { return r.householdId === id && r.status !== "cancelled" && r.status !== "done"; })) changes.push("주민 신호");
          if ((d.tips || []).some(function (t) { return t.householdId === id; })) changes.push("이웃·통반장 제보");
        }
        var rl = p ? (labelOf(NON_ELIGIBLE_REASONS, p.reason) || "사유 미상") : "";
        var bucket = !p || changes.length ? "review" : "check";
        var why = !p ? "이번 차수에 처음 올라온 집 — 방문·확인 대상"
          : changes.length ? "지난 비해당(" + rl + ") 뒤 달라진 점: " + changes.join(", ") + " — 다시 봅니다"
          : "지난 비해당(" + rl + ")과 위기 정보가 같음 — 사유가 그대로인지 확인만";
        items.push({ id: id, label: h.label, area: h.area, prior: p ? { round: p.round, reason: p.reason, reasonLabel: rl, source: p.source } : null, bucket: bucket, why: why, changes: changes });
      });
      return { items: items, check: items.filter(function (x) { return x.bucket === "check"; }), review: items.filter(function (x) { return x.bucket === "review"; }), unknown: unknown };
    }
  };

  // ── S10o-2 (S10l ⑥ 합침) 연계 누락 보드 «미신청» 칸 보강 — 서비스별 «안내했는데 신청 안 한 집»과 동네 미신청 수요(가상)를 한 줄로 ──
  // rows = [{name, stalled(가구, 이 기기 기록), demand(문의-신청-연계, 가상), real?:{households, month}(사보원 공개 통계 실제 값)}]
  // 순서 = 멈춘 집 많은 순 → 동네 미신청(가상) 많은 순. 실제 수급가구 수는 «참고»로만 붙이고 순서에 쓰지 않는다(가상 값과 섞지 않으려고).
  F.linkGap.unappliedOrder = function (rows) {
    return (rows || []).filter(function (r) { return (r.stalled || 0) + (r.demand || 0) > 0; }).slice()
      .sort(function (a, b) { return (b.stalled || 0) - (a.stalled || 0) || (b.demand || 0) - (a.demand || 0) || String(a.name).localeCompare(String(b.name), "ko"); });
  };

  return F;
});
