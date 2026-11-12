/* 닿음 S11-i — 공무원 업무 도우미 보강 9가지의 «순수 함수» (⚙️ 파로, 2026-11-03)
   호창님 11-02 결정: «주민용 화면 전면 제거, 복지사각지대 명단을 받은 담당공무원 업무 도우미에 선택과 집중» + «A, A1·A2·A3·B1·B2 추천대로»
   + 추가 C1·C2·C3(«추천들 구현해줘»). 근거: 01_리서치/S11-h_보강후보.md · 01_리서치/현장설문/결과_정리.md
   화면 그리기·CSS 없음(11-03 지시: 새 시안 확정 뒤 화면을 다시 짠다). 저장은 F.store(localStorage)만, 서버 전송 0.
   이름공간 window.DaeumFeatures(= features.js 와 같은 F). features.js 뒤에 읽는다. node: require("./features.js") 다음 require("./fieldwork.js").

   ⛔ 지키는 것
   - «위기 점수»를 만들지 않는다 · 누락 가구 «후보»를 자체 계산하지 않는다(B안 폐기) · 행복이음·정보원과 겹치는 기능을 «개발»하지 않는다.
   - 개인정보: 이름·주민등록번호·연락처·주소를 만들지도 내보내지도 않는다(가림 4칸 = 성명·주민번호·연락처·주소). 들어온 글은 mask() 로 가린다.
   - 간격·순서·문안은 «시연 기본값»이다(지침 원문 대조 전). 실제 운영 전 기관 지침으로 바꾼다.

   ── 화면에 넘겨줄 데이터 모양(새 시안에 그대로 이어 붙이는 약속) ─────────────────────────────
   [F.deadline] (S11-i 3차 시안 신설) .plan(n, until, perDay, {today}) → {days:[{date,kind:"today"|"go"|"spare"|"end",day?}], left, need, spare, over, perDayNeed, line}
     .split(ranked, perDay) → [[가구번호…] 1일차, [2일차] …] (방문 순서 그대로 하루 상한씩)
   [A1 명단 차수 대조] F.rounds
     .compare(prev, cur, {attempts, links, outcomes}) → { prevYm, curYm, counts:{new, stayed, dropped},
        groups:{ new:[{id, rank, cnt, tone:"new"}], stayed:[{id, rank, prevRank, cnt, note, tone:"stay"}], dropped:[{id, prevRank, note, tone:"gone"}] },
        line:"2026-09 → 2026-10 · 새로 6 · 계속 3 · 빠짐 4", legend:[{tone,label,say}] }
        prev/cur = {ym:"YYYY-MM", ids:[가구번호…], ranks?:{id:"순위"}, cnts?:{id:횟수}}
     .remember(rounds, cur) → 새 rounds 배열(같은 ym 은 바꿔 끼우고 최근 3차수만) · 저장 키 F.store «rounds»
     .latestPair(rounds) → {prev, cur} | null
   [A2 헛걸음 줄이기] F.visitTime
     .BANDS = [{k:"am",label:"오전",from:9,to:12}, {k:"noon",label:"이른 오후",from:12,to:15}, {k:"late",label:"오후 늦게",from:15,to:18}, {k:"eve",label:"저녁",from:18,to:21}]
     .profile(attempts, hid, {tips}) → { hid, absences:[{at, band, label}], met:[…], best:{k, label, hours:"15~18시", why}|null, avoid:[k], line:"이 집은 오전에 2번 비어 있었습니다 → 오후 늦게(15~18시) 방문 추천" }
     .afterThree(attempts, hid, {checked, tips, area, now}) → { active:bool, absentVisits:n,
        steps:[{key:"tong", title:"통·이장 안부 확인 협조", done, text(협조 요청 문안 — 이름·주소 없음)}, {key:"neighbor", title:"이웃 탐문 기록", done, log:[{at,text}]}, {key:"close", title:"종결 판단", done, options:[{key,label,next}]}],
        next:"지금 할 일 한 줄" }
   [A3 질문 길잡이] F.askGuide
     .TYPES = {생계:[{key,q,field}], 주거:[…], 건강:[…], 고립:[…]}
     .detect(text) → ["생계","고립"…]   (상담 글에서 위기 유형 짐작 — 고르는 건 공무원)
     .check(text, types, checked) → { types, items:[{type,key,q,field,asked,by:"글"|"체크"|null}], missing:[…], askedN, total, line:"꼭 물을 것 8개 중 6개 확인 · 빠짐 2" }
     .draft(ctx) → { fields:[{key,label,value}], text }  — 행복이음 입력 칸 순서(F.handoff.FIELDS 순서)로 정렬한 확정용 초안
        ctx = {label, area, at, method, needs[], summary, services[], next, urgent, guide(check 결과)}
   [B1 연계 의뢰서] F.referral
     .ORGS = {mental, care, emergency, housing} → {key, org, title, purpose, ask[], docs[]}
     .suggest({needs, services, text}) → [orgKey…]
     .build(rec, orgKey, {now, office}) → hwpx doc(shared/hwpx.js DaeumHwpx.build 입력 모양) — 가림 4칸은 «행복이음 확인 후 기재» 빈칸
     .fileName(orgKey, now) → "연계의뢰서_정신건강복지센터_20261103.hwpx"
   [B2 사후관리 달력] F.aftercare
     .STEPS = [m1 30일, m3 90일, m6 180일]
     .schedule(links, outcomes, followups, now) → [{key:"<linkId>:m1", linkId, householdId, label, area, services, step, stepLabel, base, date, state:"done"|"overdue"|"today"|"soon"|"later", doneAt, overdueDays}]
        (followups 저장소·키는 features.js F.followUp 과 같다 — 어느 쪽에서 표시해도 함께 바뀜)
     .month(items, "YYYY-MM", {promises}) → { ym, weeks:[[{date, inMonth, items:[…], promises:[…], red:bool}]×7] }
     .today(items, now) → { today:[…], overdue:[…], line:"오늘 재확인 2집 · 기한 지남 1집" }
   [C1 집 앞 30초 요약] F.homeCard
     .NOTE_TAGS = ["개가 있음","귀가 어두우심","오후에만 계심",…] · 저장 키 F.store «homeNotes» {hid:[꼬리표]}
     .build(hid, {household, attempts, records, notes, promises, tips, now}) → { hid, title, area, lastVisit:{date, how, point}|null,
        cautions:[{t, k:"note"|"time"|"risk"}], promises:[열린 약속], visitTime:(A2 profile.best), lines:[30초에 읽을 3~5줄] }
   [C2 약속 챙기기] F.promises
     .extract(text, {householdId, label, area, at}) → [{id, householdId, label, area, text, kind:"doc"|"call"|"visit"|"apply"|"check", due:"YYYY-MM-DD"|null, src, done:false}]
     .merge(list, found) → 새 list(같은 집·같은 문장 중복 없음) · .toggle(list, id, at) · .open(list, hid?) · .dueToday(list, now) → {today, overdue}
     저장 키 F.store «promises»
   [C3 큰 글씨 안내문] F.bigPrint
     .build({services, docSets, nextVisit, area, office, now}) → { title, minPt:18, blocks:[{h, items[]}], contact, next, html(인쇄용 — 글자 18pt 이상, 개인정보 0) }
   ──────────────────────────────────────────────────────────────────────────────── */
(function (root, factory) {
  var ns = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = ns;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  var F = root.DaeumFeatures = root.DaeumFeatures || {};
  var U = F.util;
  if (!U) throw new Error("fieldwork.js 는 features.js 뒤에 읽어야 합니다");
  var DAY = 86400000;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hm(d) { d = new Date(d); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var W = "일월화수목금토";
  function md(d) { d = new Date(d); return (d.getMonth() + 1) + "월 " + d.getDate() + "일(" + W.charAt(d.getDay()) + ")"; }

  // 저장 키 추가(정본 F.store.keys 에 합친다)
  if (F.store && F.store.keys) Object.assign(F.store.keys, {
    rounds: "daeum.officer.rounds",       // A1 명단 차수 [{ym, ids, ranks, cnts, name, at}] 최근 3
    neighborLog: "daeum.officer.neighborLog", // A2 이웃 탐문 기록 [{id,householdId,at,text}]
    afterThree: "daeum.officer.afterThree",   // A2 3회 부재 뒤 단계 체크 {hid:{tong:iso, neighbor:iso, close:"key"}}
    askChecked: "daeum.officer.askChecked",   // A3 꼭 물을 것 체크 {hid:{key:true}}
    homeNotes: "daeum.officer.homeNotes",     // C1 주의 꼬리표 {hid:[…]}
    promises: "daeum.officer.promises"        // C2 약속 [{id,…}]
  });

  /** 개인정보 가림(가림 4칸: 성명은 받지 않음 · 주민번호 · 연락처 · 지번/도로명 번지) */
  function mask(s) {
    return String(s || "")
      .replace(/(경상북도|경북)?\s*(상주시)?\s*[가-힣]{1,6}[읍면동]\s+[가-힣]{1,8}[리동로길]\s*\d+(-\d+)?(번지)?/g, "(주소 가림)")
      .replace(/\d{6}\s*-?\s*[1-4]\d{6}/g, "******-*******")
      .replace(/0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}/g, "0**-****-****")
      .replace(/([가-힣]+(?:로|길))\s?\d+(-\d+)?/g, "$1 ●●")
      .replace(/([가-힣]+[리동])\s?\d+(-\d+)?(번지)?/g, "$1 ●●");
  }
  F.mask = mask;

  // ═══ A1 명단 차수 대조 — 정보원 명단을 지난 차수와 견줘 «새로·계속·빠짐» 3색 ═══
  // 정보원이 고른 명단끼리의 «차집합»일 뿐이다(누락 후보 계산 아님). 빠진 집은 우리 기록(비해당·연계)으로 이유를 짐작해 붙인다.
  F.rounds = {
    LEGEND: [
      { tone: "new", label: "새로 들어온 집", say: "이번 차수에 처음 — 첫 연락부터" },
      { tone: "stay", label: "계속 남은 집", say: "지난 차수에도 있었음 — 지난 기록 이어 보기" },
      { tone: "gone", label: "빠진 집", say: "이번 명단에 없음 — 우리 기록으로 이유 확인" }
    ],
    compare: function (prev, cur, ctx) {
      ctx = ctx || {}; prev = prev || { ids: [] }; cur = cur || { ids: [] };
      var P = {}, C = {}; (prev.ids || []).forEach(function (id) { P[id] = 1; }); (cur.ids || []).forEach(function (id) { C[id] = 1; });
      var rk = cur.ranks || {}, prk = prev.ranks || {}, cn = cur.cnts || {};
      var att = ctx.attempts || [], links = ctx.links || [], outc = ctx.outcomes || {};
      function ours(id) {
        var mine = att.filter(function (t) { return t.householdId === id; }).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
        var last = mine[mine.length - 1], lk = links.filter(function (l) { return l.householdId === id; });
        if (last && last.result === "not_eligible") return "우리 기록: 비해당(" + (F.contacts.labelOf(F.contacts.NON_ELIGIBLE_REASONS, last.reason) || "사유 미상") + ")";
        if (lk.length) { var o = outc[lk[0].id]; return "우리 기록: 연계 " + (o ? (F.linkGap.OUTCOME[o.result] || "결정 확인") : "안내함") + " — " + (lk[0].serviceNames || []).slice(0, 2).join(", "); }
        if (last && last.result === "moved") return "우리 기록: 전출";
        if (mine.length) return "우리 기록: 시도 " + mine.length + "번 · 마지막 " + (F.contacts.RESULTS[last.result] || last.result);
        return "우리 기록 없음 — 빠진 이유는 행복이음에서 확인";
      }
      var g = { new: [], stayed: [], dropped: [] };
      (cur.ids || []).forEach(function (id) {
        if (P[id]) g.stayed.push({ id: id, rank: rk[id] || "", prevRank: prk[id] || "", cnt: cn[id] || 2, note: ours(id).replace(/^우리 기록 없음.*$/, "지난 차수 기록 없음 — 첫 연락부터"), tone: "stay" });
        else g.new.push({ id: id, rank: rk[id] || "", cnt: cn[id] || 1, tone: "new" });
      });
      (prev.ids || []).forEach(function (id) { if (!C[id]) g.dropped.push({ id: id, prevRank: prk[id] || "", note: ours(id), tone: "gone" }); });
      var counts = { new: g.new.length, stayed: g.stayed.length, dropped: g.dropped.length };
      return { prevYm: prev.ym || "", curYm: cur.ym || "", counts: counts, groups: g, legend: F.rounds.LEGEND,
        line: (prev.ym || "지난 차수") + " → " + (cur.ym || "이번 차수") + " · 새로 " + counts.new + " · 계속 " + counts.stayed + " · 빠짐 " + counts.dropped };
    },
    remember: function (rounds, cur) {
      var list = (rounds || []).filter(function (r) { return r && r.ym !== cur.ym; }).concat([cur]);
      return list.sort(function (a, b) { return a.ym < b.ym ? -1 : 1; }).slice(-3);
    },
    latestPair: function (rounds) { var r = (rounds || []).slice().sort(function (a, b) { return a.ym < b.ym ? -1 : 1; }); return r.length >= 2 ? { prev: r[r.length - 2], cur: r[r.length - 1] } : null; }
  };

  // ═══ A2 헛걸음 줄이기 — 부재 «시각»으로 방문 시간 추천 · 3회 부재 뒤 다음 단계 한 화면 ═══
  var BANDS = [{ k: "am", label: "오전", from: 9, to: 12 }, { k: "noon", label: "이른 오후", from: 12, to: 15 }, { k: "late", label: "오후 늦게", from: 15, to: 18 }, { k: "eve", label: "저녁", from: 18, to: 21 }];
  function bandOf(at) { var h = new Date(at).getHours(); for (var i = 0; i < BANDS.length; i++) if (h < BANDS[i].to) return BANDS[i]; return BANDS[BANDS.length - 1]; }
  var TIP_RE = [[/오전|아침/, "am"], [/점심|낮/, "noon"], [/오후 늦|해 질|퇴근|4시|5시/, "late"], [/저녁|밤|7시|8시/, "eve"]];
  function tipBand(text) { for (var i = 0; i < TIP_RE.length; i++) if (TIP_RE[i][0].test(text) && /계시|계심|들어오|돌아오|있으|있음|집에/.test(text)) return TIP_RE[i][1]; return null; }
  F.visitTime = {
    BANDS: BANDS, bandOf: function (at) { return bandOf(at).k; },
    profile: function (attempts, hid, ctx) {
      ctx = ctx || {};
      var mine = (attempts || []).filter(function (t) { return t.householdId === hid && t.channel !== "ai"; }).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
      var abs = mine.filter(function (t) { return t.result === "no_answer" && t.channel === "visit"; }).map(function (t) { var b = bandOf(t.at); return { at: t.at, band: b.k, label: b.label }; });
      var met = mine.filter(function (t) { return t.result === "met"; }).map(function (t) { var b = bandOf(t.at); return { at: t.at, band: b.k, label: b.label }; });
      var cnt = {}; abs.forEach(function (a) { cnt[a.band] = (cnt[a.band] || 0) + 1; });
      var tip = null; ((ctx.tips || []).filter(function (x) { return x.householdId === hid; })).concat(((ctx.neighborLog || []).filter(function (x) { return x.householdId === hid; }))).forEach(function (x) { var b = tipBand(x.text || ""); if (b) tip = { band: b, text: x.text }; });
      var best = null, why = "";
      if (met.length) { var m = met[met.length - 1]; best = m.band; why = "지난번 " + m.label + "에 만났습니다"; }
      else if (tip && !cnt[tip.band]) { best = tip.band; why = "이웃·통장 말: «" + clip(tip.text, 24) + "»"; }
      else if (abs.length) {
        // 비어 있던 시간대는 피하고, 비어 있던 시간보다 «늦은» 쪽을 먼저(어르신·일하는 가구는 낮에 비는 일이 잦다 — 시연 가정)
        var maxIdx = -1; abs.forEach(function (a) { BANDS.forEach(function (b, i) { if (b.k === a.band && i > maxIdx) maxIdx = i; }); });
        var free = BANDS.filter(function (b) { return !cnt[b.k]; });
        var later = free.filter(function (b) { return BANDS.indexOf(b) > maxIdx; });
        var pick = later[0] || free[free.length - 1] || null;
        if (pick) { best = pick.k; why = "비어 있던 시간(" + uniq(abs.map(function (a) { return a.label; })).join("·") + ")을 피함"; }
      }
      var B = best ? BANDS.filter(function (b) { return b.k === best; })[0] : null;
      var absTxt = uniq(abs.map(function (a) { return a.label; })).map(function (l) { return l + " " + abs.filter(function (a) { return a.label === l; }).length + "번"; }).join(" · ");
      return { hid: hid, absences: abs, met: met, avoid: Object.keys(cnt),
        best: B ? { k: B.k, label: B.label, hours: B.from + "~" + B.to + "시", why: why } : null,
        line: !abs.length && !met.length ? "아직 방문 기록이 없습니다" : (abs.length ? "이 집은 " + absTxt + " 비어 있었습니다" : "지난 방문에 만났습니다") + (B ? " → " + B.label + "(" + B.from + "~" + B.to + "시) 방문 추천" : "") };
    },
    afterThree: function (attempts, hid, ctx) {
      ctx = ctx || {};
      var mine = (attempts || []).filter(function (t) { return t.householdId === hid; }).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
      var absent = 0; for (var i = mine.length - 1; i >= 0 && mine[i].result !== "met"; i--) if (mine[i].channel === "visit" && mine[i].result === "no_answer") absent++;
      var ck = ctx.checked || {}, log = (ctx.neighborLog || []).filter(function (x) { return x.householdId === hid; });
      var area = ctx.area || "○○읍면", dates = mine.filter(function (t) { return t.result === "no_answer"; }).slice(-3).map(function (t) { return md(t.at) + " " + bandOf(t.at).label; });
      var steps = [
        { key: "tong", title: "통·이장 안부 확인 협조", done: !!ck.tong, doneAt: ck.tong || null,
          text: "[안부 확인 협조 요청] " + area + " 관내 복지 상담 대상 가구(방문 " + absent + "회 부재: " + dates.join(", ") + ")의 실거주·최근 모습 확인을 부탁드립니다. " +
            "확인하신 내용은 담당 공무원에게 전화로 알려 주세요(개인정보는 문자로 주고받지 않습니다)." },
        { key: "neighbor", title: "이웃 탐문 기록", done: !!ck.neighbor || log.length > 0, log: log.map(function (x) { return { at: x.at, text: x.text }; }),
          prompts: ["최근에 본 때", "드나드는 시간", "다른 가족·연락되는 사람", "건강 이상 낌새"] },
        { key: "close", title: "종결 판단", done: !!ck.close, choice: ck.close || null,
          options: [
            { key: "continue", label: "실거주 확인 — 방문 계속", next: "추천 시간대로 다시 방문" },
            { key: "hold", label: "장기 부재(입원·요양 등) — 사유 남기고 보류", next: "돌아오는 날 재방문 일정" },
            { key: "moved", label: "전출·빈집 확인 — 종결", next: "비해당(실거주 안 함)으로 기록 · 전입지 통보" },
            { key: "council", label: "연락 두절 지속 — 협의체·명예사회복지공무원 의뢰", next: "협의체 안건 · 2주 뒤 다시 확인" }
          ] }
      ];
      var nx = steps.filter(function (s) { return !s.done; })[0];
      return { active: absent >= F.contacts.MAX_VISIT_TRIES, absentVisits: absent, steps: steps,
        next: absent < F.contacts.MAX_VISIT_TRIES ? "방문 부재 " + absent + "회 — 추천 시간대로 한 번 더" : nx ? "지금 할 일: " + nx.title : "세 단계를 마쳤습니다 — 종결 판단대로 진행",
        source: "3회 방문 뒤 간접 확인: 서울 강남구 공개 사례(gangnam.go.kr) · 재시도 3번은 현장 설문 응답(소수) — 시연 기본값" };
    },
    addNeighborLog: function (log, hid, text, at) {
      var t = clip(mask(text), 120); if (!hid || !t) throw new Error("가구·내용 필요");
      var d = new Date(at || Date.now());
      return (log || []).concat([{ id: "NB-" + d.getTime(), householdId: hid, at: d.toISOString(), text: t }]);
    }
  };

  // ═══ A3 질문 길잡이 — 위기 유형별 «꼭 물을 것» · 빠진 항목 · 행복이음 입력 칸 순서 초안 ═══
  // 항목은 통합사례관리 초기상담 공개 매뉴얼의 큰 줄기를 «시연용»으로 줄였다(원문 대조 전 — 한계).
  function Q(key, q, re, field) { return { key: key, q: q, re: re, field: field }; }
  var TYPES = {
    "생계": [Q("income", "최근 소득이 끊기거나 줄었는지(언제부터)", /소득|수입|월급|일을 (그만|못)|실직|폐업|벌이|돈이 없/, "situation"),
      Q("debt", "밀린 공과금·월세·빚이 있는지", /체납|밀렸|밀려|연체|빚|대출|공과금/, "situation"),
      Q("food", "끼니를 거르는 일이 있는지", /끼니|굶|밥|식사|먹을/, "needs"),
      Q("benefit", "지금 받는 급여·지원이 있는지", /수급|급여|연금|지원 받|바우처/, "action")],
    "주거": [Q("tenure", "자가·전세·월세 중 무엇인지", /자가|전세|월세|보증금|셋방/, "situation"),
      Q("evict", "집을 비워야 하는 상황인지(언제까지)", /쫓겨|비워|나가라|계약 만료|퇴거/, "urgent"),
      Q("heat", "난방·전기·가스·물이 되는지", /난방|보일러|전기|가스|단전|단수|추워/, "needs"),
      Q("repair", "집 고칠 곳(누수·곰팡이·화장실)이 있는지", /누수|곰팡|화장실|지붕|고쳐|수리/, "needs")],
    "건강": [Q("ill", "아픈 곳·다니는 병원이 있는지", /아프|병원|통증|진료|입원|수술/, "situation"),
      Q("med", "약을 제때 먹는지·약값 부담", /약|처방|약값/, "situation"),
      Q("adl", "혼자 씻기·식사·외출이 되는지", /거동|혼자 못|씻|걷기|외출|휠체어/, "needs"),
      Q("mind", "잠·기분·술 문제(마음 건강)", /우울|잠을 못|불안|술|죽고|외롭/, "urgent")],
    "고립": [Q("contact", "연락하는 가족·지인이 있는지", /가족|자녀|아들|딸|연락|형제|친척/, "situation"),
      Q("visit", "최근 찾아온 사람·나간 일이 있는지", /찾아|안 나가|못 나가|들르|만나/, "situation"),
      Q("emerg", "위급할 때 부를 사람이 있는지", /위급|급할 때|119|부를 사람|비상/, "plan"),
      Q("want", "안부 확인·말벗 서비스를 원하는지", /안부|말벗|돌봄|들여다|원하/, "plan")]
  };
  var TYPE_RE = { "생계": /생활비|돈|수입|실직|폐업|일자리|체납|밀렸|밀려|빚|끼니|굶/, "주거": /월세|집|쫓겨|이사|보일러|곰팡|누수|난방/, "건강": /아프|병원|약|통증|거동|우울|치매/, "고립": /혼자|홀로|외롭|연락 끊|안 보이|찾아오는 사람|고립/ };
  F.askGuide = {
    TYPES: TYPES,
    detect: function (text) { var t = String(text || ""); return Object.keys(TYPE_RE).filter(function (k) { return TYPE_RE[k].test(t); }); },
    check: function (text, types, checked) {
      var t = String(text || ""); checked = checked || {}; types = (types && types.length ? types : F.askGuide.detect(t));
      var items = [];
      types.forEach(function (ty) { (TYPES[ty] || []).forEach(function (x) {
        var byText = x.re.test(t), byCk = !!checked[x.key];
        items.push({ type: ty, key: x.key, q: x.q, field: x.field, asked: byText || byCk, by: byCk ? "체크" : byText ? "글" : null });
      }); });
      var missing = items.filter(function (x) { return !x.asked; }), askedN = items.length - missing.length;
      return { types: types, items: items, missing: missing, askedN: askedN, total: items.length,
        line: items.length ? "꼭 물을 것 " + items.length + "개 중 " + askedN + "개 확인" + (missing.length ? " · 빠짐 " + missing.length : " · 빠짐 없음") : "위기 유형을 골라 주세요" };
    },
    draft: function (ctx) {
      ctx = ctx || {};
      var at = ctx.at ? new Date(ctx.at) : new Date(), g = ctx.guide || { items: [], missing: [] };
      var asked = g.items.filter(function (x) { return x.asked; }).map(function (x) { return x.q.replace(/\(.*?\)/g, "").replace(/(인지|는지|있는지|되는지|먹는지)$/, "").trim(); });
      var v = {
        subject: (ctx.label || "") + (ctx.area ? " · " + ctx.area : ""),
        consultAt: U.ymd(at) + " " + hm(at), method: ctx.method || "가정방문", tries: ctx.tries || "",
        main: mask(ctx.summary || ""), needs: (ctx.needs || []).join(", "),
        situation: asked.length ? "확인함: " + asked.join(" · ") : "",
        urgent: ctx.urgent ? "긴급 — 당일 긴급복지·정신건강 연계 검토" : "일반",
        action: (ctx.services || []).length ? "연계 후보 안내: " + ctx.services.join(", ") : "",
        result: "", notEligible: "",
        plan: [mask(ctx.next || ""), g.missing.length ? "다음 방문 때 확인: " + g.missing.map(function (x) { return x.q; }).join(" / ") : ""].filter(Boolean).join(" · ")
      };
      var fields = F.handoff.FIELDS.filter(function (f) { return v[f[0]]; }).map(function (f) { return { key: f[0], label: f[1], value: v[f[0]] }; });
      return { fields: fields, text: ["[행복이음 입력 초안 — 공무원 확정]"].concat(fields.map(function (f) { return f.label + ": " + f.value; })).join("\n"),
        missing: g.missing.length, note: "행복이음 입력 칸 순서(추정·미대조)로 정렬했습니다. 입력·확정은 담당 공무원이 합니다." };
    }
  };

  // ═══ B1 연계 의뢰서 — 확정 기록 → 기관별 의뢰서 hwpx 초안(shared/hwpx.js) ═══
  var ORGS = {
    mental: { key: "mental", org: "정신건강복지센터", title: "정신건강 서비스 연계 의뢰서", re: /정신|우울|죽고|극단|잠을 못|불안|술|자살/,
      purpose: "마음 건강 상담·평가와 사례관리를 의뢰합니다.", ask: ["초기 상담·선별 평가", "필요하면 위기 개입·치료 연계", "결과 회신(사례관리 계속 여부)"], docs: ["정보 제공 동의서(본인 서명)", "상담 기록 요약(이 의뢰서)"] },
    care: { key: "care", org: "노인맞춤돌봄서비스 수행기관", title: "노인맞춤돌봄서비스 연계 의뢰서", re: /돌봄|노인맞춤|안부|거동|홀로|혼자 사|어르신|말벗/,
      purpose: "안부 확인·생활 지원 서비스 대상 확인과 제공을 의뢰합니다.", ask: ["대상 조사(방문)", "서비스 계획", "제공 시작일 회신"], docs: ["서비스 신청서(읍면동 접수)", "정보 제공 동의서"] },
    emergency: { key: "emergency", org: "시·군·구 긴급지원 담당", title: "긴급복지지원 검토 의뢰서", re: /긴급|생계|끼니|굶|실직|폐업|체납|단전|단수|쫓겨/,
      purpose: "위기 사유 확인에 따른 긴급복지지원 검토를 의뢰합니다.", ask: ["위기 사유 현장 확인", "지원 종류·기간 결정·회신"], docs: ["긴급지원 신청서(또는 직권)", "위기 사유 확인 서류"] },
    housing: { key: "housing", org: "주거복지센터(주거급여·주거취약계층 지원)", title: "주거 지원 연계 의뢰서", re: /주거|월세|보증금|쫓겨|이사|곰팡|누수|보일러|집수리/,
      purpose: "주거급여·주거환경 개선·임대주택 등 주거 지원 검토를 의뢰합니다.", ask: ["주거 상태 확인(방문)", "주거급여·수선유지·임대주택 안내", "진행 결과 회신"], docs: ["주거급여 신청서(읍면동 접수)", "임대차 계약서 사본(해당 시)"] }
  };
  // 부정 마디: «없음·없다·아님·않음·괜찮·필요 없·문제 없» — 그 마디의 낱말은 추천 근거로 쓰지 않는다
  var NEG_RE = /(없음|없다|없어요|없습니다|아님|아니다|아닙니다|않음|않다|않습니다|괜찮음|괜찮다|괜찮습니다|괜찮으심|안 함)\s*$|(걱정|필요|문제|해당)(은|는)?\s*없/;
  F.referral = {
    ORGS: ORGS, NEG_RE: NEG_RE,
    /** 추천 순서 = 걸린 마디가 많은 기관 먼저. «정신건강 걱정은 없음»처럼 부정한 마디는 세지 않는다(S11-k 파로 주의 05 ②) */
    suggest: function (rec) {
      var t = [rec && rec.text, ((rec && rec.needs) || []).join(", "), ((rec && rec.services) || []).join(", ")].join("\n");
      var parts = t.split(/[\n.,;·!?]+|\s(?:그리고|하지만|그런데)\s/).map(function (x) { return x.trim(); }).filter(Boolean);
      var score = {};
      parts.forEach(function (p) {
        if (NEG_RE.test(p)) return;
        Object.keys(ORGS).forEach(function (k) { if (ORGS[k].re.test(p)) score[k] = (score[k] || 0) + 1; });
      });
      var keys = Object.keys(ORGS);
      return keys.filter(function (k) { return score[k]; }).sort(function (a, b) { return score[b] - score[a] || keys.indexOf(a) - keys.indexOf(b); });
    },
    fileName: function (orgKey, now) { return "연계의뢰서_" + ORGS[orgKey].org.replace(/[^가-힣A-Za-z0-9]/g, "") + "_" + U.ymd(now || new Date()).replace(/-/g, "") + ".hwpx"; },
    /** rec = 확정 기록 {text:"[행복이음…]\n주요 욕구: …", area, label, at} → DaeumHwpx.build 입력 */
    build: function (rec, orgKey, ctx) {
      ctx = ctx || {}; var o = ORGS[orgKey]; if (!o) throw new Error("기관 종류: " + Object.keys(ORGS).join("·"));
      var now = ctx.now ? new Date(ctx.now) : new Date(), office = ctx.office || ((rec.area || "○○읍면동") + " 맞춤형복지팀(가상)");
      var lines = String(rec.text || "").split("\n").slice(1).map(function (l) { var i = l.indexOf(": "); return i > 0 ? [l.slice(0, i), mask(l.slice(i + 2))] : null; }).filter(Boolean);
      var lb = String(rec.label || "가구"), TW = ctx.TW || (root.DaeumHwpx && root.DaeumHwpx.TW) || 0; // 표 너비 = HWPUNIT(본문 폭)
      var made = now.getFullYear() + ". " + (now.getMonth() + 1) + ". " + now.getDate() + ".";
      var blocks = [
        { t: "ch", text: "Ⅰ. 대상자" },
        { t: "tbl", title: "<표 1> 대상자 정보(개인정보 가림 4칸)", head: ["항목", "내용"], widths: TW ? [Math.round(TW * 0.28), TW - Math.round(TW * 0.28)] : undefined,
          rows: [["성명", "(행복이음 확인 후 기재)"], ["주민등록번호", "(행복이음 확인 후 기재)"], ["연락처", "(행복이음 확인 후 기재)"], ["주소", (rec.area || "") + " (상세는 행복이음 확인 후 기재) · 관리 번호 " + lb]] },
        { t: "ch", text: "Ⅱ. 상담 내용(공무원 확정 기록)" }
      ];
      lines.forEach(function (l) { blocks.push({ t: "li", lv: 1, text: l[0] + ": " + l[1] }); });
      blocks.push({ t: "ch", text: "Ⅲ. 요청 사항 · 붙임" });
      blocks.push({ t: "li", lv: 1, text: o.purpose });
      o.ask.forEach(function (a) { blocks.push({ t: "li", lv: 1, text: a }); });
      blocks.push({ t: "li", lv: 1, text: "붙임: " + o.docs.join(", ") + " · 회신: " + office });
      blocks.push({ t: "p", kind: "note", text: "※ 닿음 확정 기록으로 만든 초안 · 성명·주민등록번호·연락처·주소는 행복이음 확인 후 기재 · 본인 동의 확인 후 발송  끝." });
      return { title: o.title, subtitle: o.org + " 앞", made: made, office: office, compact: true, blocks: blocks }; // compact = 한 쪽 맞춤(S12-d 40)
    }
  };

  // ═══ B2 사후관리 달력 — 연계 후 1·3·6개월 재확인 자동 일정 · 기한 지남 빨강 · 오늘 재확인 ═══
  var STEPS = [{ k: "m1", days: 30, label: "1개월" }, { k: "m3", days: 90, label: "3개월" }, { k: "m6", days: 180, label: "6개월" }];
  function nextWork(d) { d = U.startOfDay(d); while (U.isOff(d)) d = new Date(d.getTime() + DAY); return d; }
  F.aftercare = {
    STEPS: STEPS,
    schedule: function (links, outcomes, followups, now) {
      now = now ? new Date(now) : new Date(); outcomes = outcomes || {}; followups = followups || {};
      var today = U.ymd(now), out = [];
      (links || []).forEach(function (l) {
        var o = outcomes[l.id];
        if (o && o.result === "not_applied") return; // 안 하기로 함 — 사후관리 대상 아님
        var base = o && o.result !== "applied" ? o.at : l.at; // 결정 확인일이 있으면 그날, 없으면 연계(안내)한 날부터
        var svc = (l.serviceNames || l.serviceIds || []).slice(0, 2).join(", ");
        STEPS.forEach(function (st) {
          var key = l.id + ":" + st.k, d = nextWork(new Date(new Date(base).getTime() + st.days * DAY)), date = U.ymd(d), done = followups[key] || null;
          var od = done ? 0 : U.daysBetween(d, now);
          out.push({ key: key, linkId: l.id, householdId: l.householdId, label: l.label, area: l.area, services: svc, step: st.k, stepLabel: st.label + " 재확인",
            base: U.ymd(base), date: date, doneAt: done, overdueDays: od > 0 ? od : 0,
            state: done ? "done" : date < today ? "overdue" : date === today ? "today" : U.daysBetween(now, d) <= 7 ? "soon" : "later" });
        });
      });
      return out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    },
    month: function (items, ym, ctx) {
      ctx = ctx || {};
      var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1, first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay());
      var byDay = {}; (items || []).forEach(function (x) { (byDay[x.date] = byDay[x.date] || []).push(x); });
      var pr = {}; (ctx.promises || []).forEach(function (p) { if (p.due && !p.done) (pr[p.due] = pr[p.due] || []).push(p); });
      var weeks = [];
      for (var w = 0; w < 6; w++) {
        var row = [];
        for (var i = 0; i < 7; i++) {
          var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i), k = U.ymd(d), its = byDay[k] || [];
          row.push({ date: k, day: d.getDate(), inMonth: d.getMonth() === m, off: U.isOff(d), items: its, promises: pr[k] || [], red: its.some(function (x) { return x.state === "overdue"; }) });
        }
        if (w === 5 && !row.some(function (c) { return c.inMonth; })) break;
        weeks.push(row);
      }
      return { ym: ym, weeks: weeks };
    },
    today: function (items, now) {
      var t = (items || []).filter(function (x) { return x.state === "today"; }), od = (items || []).filter(function (x) { return x.state === "overdue"; });
      return { today: t, overdue: od, line: "오늘 재확인 " + uniq(t.map(function (x) { return x.householdId; })).length + "집 · 기한 지남 " + uniq(od.map(function (x) { return x.householdId; })).length + "집" };
    },
    mark: function (followups, key, at) { return F.followUp.mark(followups, key, at); }
  };

  // ═══ C2 약속 챙기기 — 상담 기록에서 약속을 규칙 낱말로 뽑아 할 일로 ═══
  var KIND_RE = [["doc", /서류|신청서|가져다|갖다 드|챙겨 드|안내문/], ["call", /전화|연락 드|연락드|문자/], ["visit", /다시 방문|방문하겠|찾아뵙|들르겠|재방문|방문 예정/], ["apply", /신청(을|해)? ?(도와|대신|하겠|할게|드리)|접수(해|하겠)/], ["check", /알아보|알아봐|확인해 드|확인하겠|여쭤/]];
  var PROMISE_RE = /드리겠|드릴게|하겠습니다|할게요|하기로|약속|예정|뵙겠|드리기로|해 드리|알아보겠|알아봐 드/;
  var WD = { "월": 1, "화": 2, "수": 3, "목": 4, "금": 5 };
  function dueOf(s, at) {
    var base = U.startOfDay(at), m;
    if (/오늘/.test(s)) return U.ymd(base);
    if (/모레/.test(s)) return U.ymd(new Date(base.getTime() + 2 * DAY));
    if (/내일/.test(s)) return U.ymd(new Date(base.getTime() + DAY));
    if ((m = s.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/))) { var y = base.getFullYear(), d = new Date(y, +m[1] - 1, +m[2]); if (d < base) d = new Date(y + 1, +m[1] - 1, +m[2]); return U.ymd(d); }
    if ((m = s.match(/(?:^|[^\d-])(\d{1,2})-(\d{1,2})(?![\d-])/))) { var y2 = base.getFullYear(), d2 = new Date(y2, +m[1] - 1, +m[2]); if (+m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31) { if (d2 < base) d2 = new Date(y2 + 1, +m[1] - 1, +m[2]); return U.ymd(d2); } }
    if ((m = s.match(/(\d+)\s*(영업일|근무일|일)\s*(뒤|후|안에|이내)/))) return U.ymd(m[2] !== "일" ? U.addWorkdays(base, +m[1]) : new Date(base.getTime() + m[1] * DAY));
    if ((m = s.match(/다음\s?주\s*([월화수목금])요일/))) { var dd = new Date(base.getTime() + (7 - base.getDay() + WD[m[1]]) * DAY); return U.ymd(dd); }
    if (/다음\s?주/.test(s)) return U.ymd(new Date(base.getTime() + (8 - base.getDay()) * DAY)); // 다음 주 월요일
    if ((m = s.match(/(\d+|한|두|세)\s*주/))) { var n = { "한": 1, "두": 2, "세": 3 }[m[1]] || +m[1]; return U.ymd(new Date(base.getTime() + n * 7 * DAY)); }
    if (/이번\s?주/.test(s)) return U.ymd(new Date(base.getTime() + Math.max(0, 5 - base.getDay()) * DAY));
    return null;
  }
  F.promises = {
    KINDS: { doc: "서류 전달", call: "전화", visit: "다시 방문", apply: "신청 돕기", check: "알아보고 알려 드리기" },
    extract: function (text, ctx) {
      ctx = ctx || {}; var at = ctx.at ? new Date(ctx.at) : new Date(), out = [];
      String(text || "").split(/[\n.!?。]+|(?:다음 할 일|향후 계획|다음 방문 때 확인)\s*:\s*/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 3; }).forEach(function (s) {
        var kind = null; KIND_RE.forEach(function (k) { if (!kind && k[1].test(s)) kind = k[0]; });
        var isPromise = PROMISE_RE.test(s) || (kind && dueOf(s, at)) || /확인$|전화 확인|안내$/.test(s);
        if (!kind || !isPromise) return;
        out.push({ id: "PR-" + at.getTime() + "-" + (out.length + 1), householdId: ctx.householdId || null, label: ctx.label || "", area: ctx.area || "",
          text: clip(mask(s), 60), kind: kind, due: dueOf(s, at), src: ctx.src || "상담 기록", at: at.toISOString(), done: false, doneAt: null });
      });
      return out;
    },
    merge: function (list, found) {
      var have = {}; (list || []).forEach(function (p) { have[p.householdId + "|" + p.text] = 1; });
      return (list || []).concat((found || []).filter(function (p) { return !have[p.householdId + "|" + p.text]; }));
    },
    toggle: function (list, id, at) { return (list || []).map(function (p) { return p.id !== id ? p : Object.assign({}, p, { done: !p.done, doneAt: p.done ? null : new Date(at || Date.now()).toISOString() }); }); },
    open: function (list, hid) { return (list || []).filter(function (p) { return !p.done && (!hid || p.householdId === hid); }).sort(function (a, b) { return (a.due || "9") < (b.due || "9") ? -1 : 1; }); },
    dueToday: function (list, now) {
      var t = U.ymd(now || new Date()), op = F.promises.open(list);
      return { today: op.filter(function (p) { return p.due === t; }), overdue: op.filter(function (p) { return p.due && p.due < t; }),
        line: "오늘 지킬 약속 " + op.filter(function (p) { return p.due === t; }).length + " · 기한 지난 약속 " + op.filter(function (p) { return p.due && p.due < t; }).length };
    }
  };

  // ═══ C1 집 앞 30초 요약 카드 — 지난 방문 요점 · 주의할 점 · 지난번 약속 ═══
  var NOTE_TAGS = ["개가 있음", "귀가 어두우심", "오후에만 계심", "거동 불편", "치매 의심 — 천천히 설명", "보호자 동석 원함", "문 두드리기보다 전화 먼저", "음주 주의 — 2인 방문"];
  F.homeCard = {
    NOTE_TAGS: NOTE_TAGS,
    build: function (hid, ctx) {
      ctx = ctx || {}; var h = ctx.household || { id: hid, label: hid, area: "" };
      var att = (ctx.attempts || []).filter(function (t) { return t.householdId === hid; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
      var recs = (ctx.records || []).filter(function (r) { return r.householdId === hid || r.label === "가구 " + hid; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
      var lastMet = att.filter(function (t) { return t.result === "met"; })[0], rec = recs[0];
      var point = ""; if (rec) { var ln = String(rec.text || "").split("\n").filter(function (l) { return /^(상담 요약|주요 호소[^:]*):/.test(l); })[0]; point = ln ? ln.replace(/^[^:]+:\s*/, "") : ""; }
      if (!point && lastMet && lastMet.note) point = lastMet.note;
      var last = lastMet || att[0] || null;
      var vt = F.visitTime.profile(ctx.attempts, hid, { tips: ctx.tips, neighborLog: ctx.neighborLog });
      var cautions = ((ctx.notes || {})[hid] || []).map(function (t) { return { t: t, k: "note" }; });
      if (vt.best && vt.absences.length) cautions.push({ t: vt.best.label + "(" + vt.best.hours + ")에 계실 가능성 — " + vt.best.why, k: "time" });
      if (att.length && att[0].result === "refused") cautions.push({ t: "지난번 상담 거부 — 다른 이야기로 시작", k: "risk" });
      var pr = F.promises.open(ctx.promises, hid);
      // 가구 번호(P-013)는 닿음 관리 번호라 가리지 않는다 — 옛 코드는 끝 두 자리를 번지로 보고 «P-0●●»로 가렸다(S11-k 파로 주의 05 ①)
      var lb = "가구 " + hid;
      var lines = [
        last ? "지난 " + (last.result === "met" ? "만남" : "시도") + ": " + md(last.at) + " " + (F.contacts.CHANNELS[last.channel] || "") + " · " + (F.contacts.RESULTS[last.result] || "") : "처음 찾아가는 집입니다",
        point ? "요점: " + clip(mask(point), 50) : "",
        cautions.length ? "주의: " + cautions.map(function (c) { return c.t; }).slice(0, 3).join(" · ") : "",
        pr.length ? "지난번 약속: " + pr.map(function (p) { return p.text + (p.due ? "(" + p.due.slice(5).replace("-", "/") + ")" : ""); }).slice(0, 2).join(" · ") : ""
      ].filter(Boolean);
      return { hid: hid, title: lb, area: h.area || "", lastVisit: last ? { date: U.ymd(last.at), how: (F.contacts.CHANNELS[last.channel] || "") + " · " + (F.contacts.RESULTS[last.result] || ""), point: clip(mask(point), 80) } : null,
        cautions: cautions, promises: pr, visitTime: vt.best, lines: lines };
    },
    setNotes: function (notes, hid, tags) { var o = Object.assign({}, notes || {}); o[hid] = uniq((tags || []).filter(function (t) { return t && String(t).length <= 20; })); if (!o[hid].length) delete o[hid]; return o; }
  };

  // ═══ C3 어르신용 큰 글씨 안내문 — 신청 서류 · 담당 연락처(가상 표기) · 다음 방문일. 18pt 이상, 개인정보 0 ═══
  F.bigPrint = {
    MIN_PT: 18,
    build: function (ctx) {
      ctx = ctx || {};
      var svcs = (ctx.services || []).slice(0, 3), sets = ctx.docSets || {};
      function docsOf(s) { var out = []; (s.docs || []).forEach(function (d) { if (/^\$/.test(d)) (sets[d.slice(1)] || []).forEach(function (x) { out.push(x); }); else out.push(d); }); return uniq(out).slice(0, 6); }
      var blocks = svcs.map(function (s) { return { h: s.name, items: docsOf(s).map(function (d) { return d.replace(/\(신청처에 있음\)/, "(주민센터에 있어요)"); }) }; });
      var office = ctx.office || ((ctx.area || "○○") + " 행정복지센터 맞춤형복지팀");
      var contact = office + " · ☎ 054-000-0000(가상 번호)";
      var nv = ctx.nextVisit ? new Date(ctx.nextVisit) : null;
      var next = nv ? "다음에 찾아뵙는 날: " + md(nv) + (ctx.nextSlot ? " " + ctx.nextSlot : "") : "다음에 찾아뵙는 날: 전화로 알려 드릴게요";
      var title = "신청할 때 챙길 서류";
      var html = '<article class="bp" style="font-family:\'맑은 고딕\',\'Malgun Gothic\',sans-serif;font-size:20pt;line-height:1.55;color:#111">' +
        '<h1 style="font-size:30pt;margin:0 0 10pt">' + esc(title) + '</h1>' +
        blocks.map(function (b) { return '<section style="margin:0 0 12pt"><h2 style="font-size:24pt;margin:0 0 4pt">' + esc(b.h) + '</h2><ul style="margin:0;padding-left:1.2em">' +
          b.items.map(function (d) { return '<li style="font-size:20pt">☐ ' + esc(d) + "</li>"; }).join("") + "</ul></section>"; }).join("") +
        '<p style="font-size:22pt;font-weight:700;margin:14pt 0 4pt">' + esc(next) + '</p>' +
        '<p style="font-size:20pt;margin:0">궁금하면: ' + esc(contact) + '</p>' +
        '<p style="font-size:18pt;margin:10pt 0 0;color:#333">서류가 없으면 그냥 두세요. 다음에 함께 챙겨 드려요.</p></article>';
      return { title: title, minPt: 18, blocks: blocks, contact: contact, next: next, html: html };
    }
  };

  // ═══ S11-k 신설 — 확인 기한(근무일) · 일차별 묶음 (시안 «파로 주의 04») ═══
  // 근무일 = 토·일·관공서 공휴일을 뺀 날(F.util.isOff). 오늘은 계획 세우는 날, 방문은 다음 근무일부터 하루 상한씩.
  F.deadline = {
    PER_DAY: 5,
    plan: function (n, until, perDay, ctx) {
      ctx = ctx || {}; perDay = Math.max(1, +perDay || 5); n = Math.max(0, +n || 0);
      var today = U.startOfDay(ctx.today || new Date());
      if (!until) return { set: false, n: n, perDay: perDay, days: [], left: 0, need: Math.ceil(n / perDay), spare: 0, over: false, line: "기한을 정하면 하루 몇 집인지 알려 드립니다." };
      var end = U.startOfDay(until), days = [], d = new Date(today), guard = 0;
      while (d <= end && guard++ < 400) { if (!U.isOff(d)) days.push(U.ymd(d)); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); }
      var todayKey = U.ymd(today), visitDays = days.filter(function (k) { return k !== todayKey; });
      var need = Math.ceil(n / perDay), over = need > visitDays.length;
      var perDayNeed = visitDays.length ? Math.ceil(n / visitDays.length) : n;
      var go = visitDays.slice(0, need), spare = Math.max(0, visitDays.length - need);
      var cells = days.map(function (k) {
        var i = go.indexOf(k);
        return { date: k, kind: k === todayKey ? "today" : i >= 0 ? "go" : k === U.ymd(end) ? "end" : "spare", day: i >= 0 ? i + 1 : null, end: k === U.ymd(end) };
      });
      return { set: true, n: n, perDay: perDay, until: U.ymd(end), days: cells, left: days.length, need: need, spare: spare, over: over, perDayNeed: perDayNeed, go: go,
        line: over ? "기한까지 근무일 " + visitDays.length + "일 — 하루 " + perDayNeed + "집씩 봐야 합니다(상한 " + perDay + "집). 기한을 늦추거나 하루 상한을 올려 주세요."
          : "근무일 " + days.length + "일 남음 · 하루 " + perDay + "집 기준 " + need + "일 방문 · 여유 " + spare + "일(부재 다시 방문용)" };
    },
    split: function (ranked, perDay) {
      perDay = Math.max(1, +perDay || 5);
      var ids = (ranked || []).map(function (r) { return typeof r === "string" ? r : r.id; }), out = [];
      for (var i = 0; i < ids.length; i += perDay) out.push(ids.slice(i, i + perDay));
      return out;
    }
  };

  // ═══ S12-i3 현장 기능(⚙️ 파로, 2026-11-12 · 시안 S12-h v2.2 «현장 어려움 ①~⑥» + 추가 발굴 가구) — 화면 없는 순수 함수 ═══
  // ⛔ 돌려주는 값에 성명·주민등록번호·연락처·주소 원문을 넣지 않는다(주소는 이 함수 안에서만 읽고 «확인 필요» 사유만 내보냄).

  // ① 도로명주소 자동 정리 — 띄어쓰기·시도 이름 통일, 도로명/지번 구분, 두 주소 칸 대조. 지번→도로명 실제 변환은 행정안전부 도로명주소 API(도입 때)
  function addrNorm(s) {
    s = String(s == null ? "" : s).replace(/[　\s]+/g, " ").replace(/\s*([,()])\s*/g, "$1").trim();
    if (!s) return "";
    s = s.replace(/^경북\s*/, "경상북도 ").replace(/^경상북도(?=\S)/, "경상북도 ");
    if (/^[가-힣]{1,6}[읍면동]\s/.test(s)) s = "경상북도 상주시 " + s; // 읍면부터 적힌 주소
    if (/^경상북도 (?!상주시)[가-힣]{1,6}[읍면동]\s/.test(s)) s = s.replace(/^경상북도 /, "경상북도 상주시 ");
    return s.replace(/(\d+)\s*번지/g, "$1").replace(/\s+/g, " ").trim();
  }
  function addrKind(s) {
    if (/[가-힣0-9]+(로|길)\s?\d+(-\d+)?(\s|,|$)/.test(s)) return "road";
    if (/[가-힣]+[리동가]\s(산\s?)?\d+(-\d+)?(\s|,|$)/.test(s)) return "jibun";
    return "none";
  }
  F.addr = {
    norm: addrNorm, kind: addrKind,
    /** a=(행복이음)주소 · b=(행안부)주소 · area=소재행정동 → { kind, flags:[{k,why}], need } (주소 글은 돌려주지 않음) */
    check: function (a, b, area) {
      var na = addrNorm(a), nb = addrNorm(b), t = nb || na, flags = [];
      if (!na && !nb) flags.push({ k: "empty", why: "주소 칸이 비어 있음 — 도로명주소로 못 바꿈" });
      else {
        if (na && nb && na !== nb) flags.push({ k: "diff", why: "(행복이음)·(행안부) 주소가 서로 다름" });
        if (area && t.indexOf(String(area).trim()) < 0) flags.push({ k: "area", why: "소재행정동(" + area + ")과 주소의 읍면이 다름" });
        if (addrKind(t) === "none") flags.push({ k: "num", why: "번지·건물번호가 없음" });
      }
      return { kind: t ? addrKind(t) : "none", flags: flags, need: flags.length > 0 };
    },
    /** 명단 한 장 훑기: columns·rows·ids(같은 순서) → { n, tidy, road, jibun, need:[{id, area, why}] } */
    scan: function (columns, rows, ids) {
      var c = columns || [], ia = c.indexOf("(행복이음)주소"), ib = c.indexOf("(행안부)주소"), ix = c.indexOf("소재행정동");
      var out = { n: 0, tidy: 0, road: 0, jibun: 0, need: [] };
      (rows || []).forEach(function (r, i) {
        var id = (ids || [])[i]; if (!id) return; out.n++;
        var area = ix >= 0 ? String(r[ix] || "").trim() : "", k = F.addr.check(ia >= 0 ? r[ia] : "", ib >= 0 ? r[ib] : "", area);
        if (k.kind === "road") out.road++; else if (k.kind === "jibun") out.jibun++;
        if (k.need) out.need.push({ id: id, area: area, why: k.flags.map(function (f) { return f.why; }).join(" · ") });
        else out.tidy++;
      });
      return out;
    }
  };

  // ② 부재 → 다음 방문 제안: 근무일 gap일 뒤 · 추천 시간대 · 기본 3번, 3번째 부재부터 간접 확인으로 마감 권장
  F.nextTry = function (o) {
    o = o || {};
    var n = +o.absentN || 0, max = (F.contacts && F.contacts.MAX_VISIT_TRIES) || 3, gap = o.gap == null ? 2 : +o.gap;
    if (n >= max) return { close: true, nth: n, line: "부재 " + n + "번 — 통·이장·이웃 간접 확인으로 마감 권장(" + max + "번 기준 · 시연 기본값)" };
    var d = U.startOfDay(o.from || new Date()), k = 0, guard = 0;
    while (k < gap && guard++ < 60) { d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); if (!U.isOff(d)) k++; }
    var B = o.best || null;
    if (!B && o.lastBand) { var i = BANDS.map(function (b) { return b.k; }).indexOf(o.lastBand); var nb = BANDS[Math.min(BANDS.length - 1, i + 1)] || BANDS[BANDS.length - 1]; B = { k: nb.k, label: nb.label, hours: nb.from + "~" + nb.to + "시" }; }
    if (!B) B = { k: "eve", label: "저녁", hours: "18~21시" };
    var nth = n + 1, nthT = ["첫", "두", "세", "네"][nth - 1] || nth;
    return { close: false, nth: nth, date: U.ymd(d), md: md(d), band: B.k, label: B.label, hours: B.hours,
      line: md(d) + " " + B.label + "(" + B.hours + ") · " + nthT + " 번째 방문" };
  };

  // ⑤ 2인 방문 권장 — 주의 꼬리표·지난 기록에 위험 낱말이 있는 집(점수 아님, 낱말 대조)
  var PAIR_RE = /(개가|개 있|맹견|폭언|폭력|위협|흉기|주취|음주|술에? 취|난동|공격|고성|성희롱|위험)/;
  F.pairNeed = function (notes, logs) {
    var hit = null;
    (notes || []).forEach(function (t) { if (!hit && PAIR_RE.test(t)) hit = "주의 꼬리표 «" + clip(t, 16) + "»"; });
    (logs || []).forEach(function (l) { var t = [l.memo || ""].concat(l.tags || []).join(" "); if (!hit && PAIR_RE.test(t)) hit = "지난 기록에 위험 이력"; });
    return { need: !!hit, why: hit || "" };
  };

  // ⑥ 읍면·담당별 남은 가구 — rows:[{id, area, owner, st}] (st: planned·absent·done·refused) → 막대 줄
  F.remain = function (rows) {
    var g = {};
    (rows || []).forEach(function (r) {
      var k = (r.area || "미상") + "|" + (r.owner || ""), x = g[k] || (g[k] = { area: r.area || "미상", owner: r.owner || "", n: 0, total: 0, absent: 0 });
      x.total++; if (r.st !== "done" && r.st !== "refused") { x.n++; if (r.st === "absent") x.absent++; }
    });
    var list = Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.n - a.n || (a.area < b.area ? -1 : 1); });
    var mx = list.reduce(function (m, x) { return Math.max(m, x.n); }, 0) || 1;
    list.forEach(function (x) { x.w = Math.round(x.n / mx * 100); });
    return { rows: list, n: list.reduce(function (s, x) { return s + x.n; }, 0), total: list.reduce(function (s, x) { return s + x.total; }, 0) };
  };

  // ③ 한 장 인계 카드 — 가구번호·읍면·유형·횟수만. 자유 글은 mask() 로 가린다(이름·주소·연락처 0)
  F.handCard = function (o) {
    o = o || {};
    var types = (o.types || []).slice(0, 4), v = o.visits || {}, ck = o.checks || {}, links = (o.links || []).slice(0, 3);
    var lines = [
      "발굴: " + (types.length ? types.join("·") + " 위기 유형" : "위기정보") + " · 발굴 " + (+o.cnt || 1) + "회째",
      "지난 방문: " + (v.met ? "만남 " + v.met + "번" + (v.absent ? " · 부재 " + v.absent + "번" : "") : v.absent ? "부재 " + v.absent + "번" : "아직 방문 전"),
      "확인한 것: " + (ck.n ? "현장 체크 " + ck.n + "건" + (ck.bad ? "(문제 " + ck.bad + ")" : "") : "아직 없음"),
      "연계: " + (links.length ? links.join(", ") : "—"),
      "주의: " + (o.pair ? "2인 방문 권장" : "특이 없음")
    ].map(function (l) { return clip(mask(l), 60); });
    var next = clip(mask(o.next || (v.absent && !v.met ? "다른 시간대에 다시 방문 · 안 되면 간접 확인으로 마감" : v.met ? "연계 회신 확인 · 신청 여부 전화" : "첫 방문")), 60);
    var note = o.note ? clip(mask(o.note), 80) : "";
    var head = (o.id || "") + " · " + (o.area || "") + (o.round ? " · " + o.round + " 차수" : "");
    var text = "[한 장 인계 카드] " + head + "\n" + lines.map(function (l, i) { return (i + 1) + ". " + l; }).join("\n") + "\n다음 할 일: " + next + (note ? "\n한 줄: " + note : "") + "\n(이름·주소·연락처는 넣지 않습니다 — 행복이음에서 확인)";
    return { id: o.id || "", area: o.area || "", head: head, lines: lines, next: next, note: note, text: text };
  };

  // ⑦ 현장 «추가 발굴 가구» — 명단 밖 가구를 담당자가 «직접 본» 경우만 임시 번호로. 주민 신고 접수 아님
  F.newFind = {
    SIGNS: ["생계", "주거", "건강", "고립", "돌봄"],
    nextId: function (list) { var mx = 0; (list || []).forEach(function (x) { var m = /^N-(\d+)$/.exec(x.id || ""); if (m) mx = Math.max(mx, +m[1]); }); var n = mx + 1; return "N-" + (n < 10 ? "00" : n < 100 ? "0" : "") + n; },
    make: function (list, o) {
      o = o || {}; if (!o.area) throw new Error("읍면 필요");
      var at = new Date(o.at || Date.now());
      return { id: F.newFind.nextId(list), area: String(o.area).slice(0, 12), how: clip(mask(o.how || ""), 80), signs: (o.signs || []).filter(function (s) { return F.newFind.SIGNS.indexOf(s) >= 0; }), at: at.toISOString(), from: o.from || "" };
    },
    /** 행복이음 신규 상담 입력용 초안(복사해 붙여 넣기) */
    draft: function (x) {
      var d = new Date(x.at), dt = d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate() + ".";
      return "[행복이음 신규 상담 입력 초안] 임시번호 " + x.id + " · " + x.area + " · " + dt + " 현장 추가 발굴\n" +
        "발견 경위: " + (x.how || "(직접 입력)") + "\n" +
        "본 위기 신호: " + (x.signs.length ? x.signs.join("·") : "(고르지 않음)") + "\n" +
        "입력할 때: 성명·주소·연락처는 행복이음에 직접 입력(앱에 남기지 않음) · 초기상담 일정 정하기";
    }
  };
  return F;
});
