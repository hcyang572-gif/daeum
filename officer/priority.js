/* 닿음 S11-d2 — 방문 우선순위 근거 · 실시간 신고 끼워 넣기 · 명단 밖 가구(A안) (화면과 무관한 순수 함수, ⚙️ 파로 2026-11-02)
   정본 규격: 01_리서치/S11-d2_우선순위_규칙.md(🟣 가람). 가중치·문턱은 «시연용 잠정값»(실증 근거 없음, 도입 때 현장과 다시 정함).
   지키는 것:
   - 닿음은 발굴(선별)을 하지 않는다. 정보원이 준 발굴우선순위를 뼈대로, 현장 사정(특보·혼자 사는 고령·상담 공백·주민 신호·미처리 기간)을 얹어
     «오늘 누구를 먼저 볼지»와 «이유 한 줄»만 만든다. 명단 밖 가구도 스스로 계산하지 않는다(B안 폐기) — 현장에서 본 집을 메모하고 다음 명단과 대조할 뿐.
   - 화면에는 점수 숫자를 띄우지 않는다(S6h·S9a-2) → «정보원 N순위 → 오늘 M번째 · 이유»만. 가산 내역은 «자세히» 안에서만.
   브라우저: window.DaeumPriority / node: require */
(function (root) {
  "use strict";
  var DAY = 86400000, OLD_AGE = 75, MUST_HOURS = 48, ROUND_DAYS = 60;

  function sod(d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d; }
  function days(a, b) { return Math.round((sod(b) - sod(a)) / DAY); }
  function josa(w, a, b) { var c = String(w || "").charCodeAt(String(w || "").length - 1); if (!(c >= 0xac00 && c <= 0xd7a3)) return w + a; return w + ((c - 0xac00) % 28 ? a : b); }
  function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function wxShort(name) { return /한파/.test(name || "") ? "한파" : /폭염/.test(name || "") ? "폭염" : "특보"; }

  /** 혼자 사는 고령: 정보원 «우선방문대상자_고독사»=Y 또는 75세 이상 1인 */
  function aloneOld(h, m) { return !!((m && m.lonely) || (h && h.single && h.members && h.members[0] && h.members[0].age >= OLD_AGE)); }
  /** 지난 상담 후 지난 날(닿음 «만남» 기록·가구 시연값 중 가장 최근). 기록 없으면 null */
  function gapDays(h, attempts, today) {
    var best = h && h.daysSinceContact != null ? +h.daysSinceContact : null;
    (attempts || []).forEach(function (t) { if (t && t.householdId === h.id && t.result === "met") { var d = days(t.at, today); if (best == null || d < best) best = d; } });
    return best;
  }
  /** 미처리 경과일 = (발굴횟수 − 1) × 60 + (오늘 − 발굴년월 1일). 처리여부가 «미처리»일 때만 */
  function pendingDays(m, today) {
    if (!m || !/미처리/.test(m.proc || "") || !/^\d{4}-\d{1,2}/.test(m.ym || "")) return null;
    var p = m.ym.split("-"), first = new Date(+p[0], +p[1] - 1, 1);
    return Math.max(0, ((+m.cnt || 1) - 1) * ROUND_DAYS + days(first, today));
  }

  /**
   * households: 오늘 담은 가구(가구 객체). ctx = {
   *   today, meta: {id:{prio,cnt,proc,ym,lonely}}, weather: {name}|null, noResponse: {id:{hours,device}},
   *   requests: [요청], tips: [제보], attempts: [시도], pins: [id], deferred: [id] }
   * → [{ id, h, band:"must"|"adj", listRank, G, K, parts:[{k,pts,label,detail}], must, todayRank, line, detail:[…] }] (오늘 순서대로)
   */
  function compute(households, ctx) {
    ctx = ctx || {};
    var today = ctx.today ? new Date(ctx.today) : new Date(), meta = ctx.meta || {}, w = ctx.weather || null, nr = ctx.noResponse || {};
    var pins = ctx.pins || [], deferred = ctx.deferred || [], n = (households || []).length;
    var reqBy = {}, tipBy = {};
    (ctx.requests || []).forEach(function (r) { if (r && r.householdId && r.status !== "done" && r.status !== "cancelled") (reqBy[r.householdId] = reqBy[r.householdId] || []).push(r); });
    (ctx.tips || []).forEach(function (t) { if (t && t.householdId) (tipBy[t.householdId] = tipBy[t.householdId] || []).push(t); });
    var out = (households || []).map(function (h, i) {
      var m = meta[h.id] || {}, parts = [], must = null;
      var listRank = isFinite(parseFloat(m.prio)) ? parseFloat(m.prio) : n + 1;
      var age = h.members && h.members[0] ? h.members[0].age : null, old = aloneOld(h, m);
      // A·B 특보 + 혼자 사는 고령(화면에서는 한 이유로 묶는다)
      var A = w && old ? 2 : 0, B = old ? 1 : 0;
      if (A || B) parts.push({ k: "AB", pts: A + B, label: (A ? wxShort(w.name) + "에 " : "") + (age ? age + "세 " : "") + "혼자",
        detail: (A ? "+2 " + w.name + "(시연 가상) · " : "") + "+1 혼자 사는 고령(" + (m.lonely ? "정보원 고독사 우선방문 Y" : "75세 이상 1인") + ")" });
      // C 지난 상담 공백
      var gap = gapDays(h, ctx.attempts, today), C = gap == null || gap >= 730 ? 2 : gap >= 365 ? 1 : 0;
      if (C) parts.push({ k: "C", pts: C, label: gap == null ? "상담 기록 없음" : gap >= 730 ? "2년 넘게 상담 없음" : "1년 넘게 상담 없음",
        detail: "+" + C + " 지난 상담 공백 " + (gap == null ? "(기록 없음)" : gap + "일") });
      // D 주민·이웃 신호 / 무반응 — 긴급 신고·무반응 48시간 이상은 «오늘 꼭»
      var rq = reqBy[h.id] || [], urg = rq.filter(function (r) { return r.urgent; })[0], x = nr[h.id], D = 0, dl = "", dd = "";
      var calm = rq.filter(function (r) { return !r.urgent; }); // 긴급 신고는 «오늘 꼭»으로만(가산과 겹치지 않게)
      if (calm.length || (tipBy[h.id] || []).length) { D = 2; var r0 = calm[0]; dl = r0 && r0.signal === "neighbor" ? "이웃 알림" : r0 ? "주민 신호" : "이웃·통장 제보"; dd = "+2 " + dl; }
      if (x && x.hours >= 24 && x.hours < MUST_HOURS && 3 > D) { D = 3; dl = "안부 응답 " + x.hours + "시간 없음"; dd = "+3 " + (x.device || "협약 기관") + " 안부 응답 " + x.hours + "시간 없음(협약 시·가상)"; }
      if (D) parts.push({ k: "D", pts: D, label: dl, detail: dd });
      // E 미처리 기간
      var pd = pendingDays(m, today), E = pd == null ? 0 : pd >= 112 ? 2 : pd >= 56 ? 1 : 0;
      if (E) parts.push({ k: "E", pts: E, label: (+m.cnt || 1) + "차례 발굴, " + pd + "일 미처리", detail: "+" + E + " 미처리 " + pd + "일(발굴 " + (+m.cnt || 1) + "회)" });
      if (pins.indexOf(h.id) >= 0) must = "담당자가 앞에 둠";
      else if (urg) must = josa(urg.proxy && urg.proxy.relation ? urg.proxy.relation : "주민", "이", "가") + " «" + clip(urg.situation, 18) + "» 긴급 신고";
      else if (x && x.hours >= MUST_HOURS) must = (x.device || "협약 기관") + " 안부 응답 " + x.hours + "시간 없음(가상)";
      var G = parts.reduce(function (s, p) { return s + p.pts; }, 0);
      return { id: h.id, h: h, i: i, listRank: listRank, gap: gap == null ? 1e9 : gap, G: G, K: listRank - G, parts: parts, must: must,
        band: must ? "must" : "adj", deferred: deferred.indexOf(h.id) >= 0 };
    });
    var bandOrd = function (r) { return r.band === "must" ? 0 : r.deferred ? 2 : 1; };
    out.sort(function (a, b) { return bandOrd(a) - bandOrd(b) || a.K - b.K || a.listRank - b.listRank || b.gap - a.gap || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
    var ORD = { D: 0, AB: 1, E: 2, C: 3 };
    out.forEach(function (r, i) {
      r.todayRank = i + 1;
      var ps = r.parts.slice().sort(function (a, b) { return b.pts - a.pts || ORD[a.k] - ORD[b.k]; });
      var listed = r.listRank <= n;
      // 순위가 오른 집은 큰 이유 둘, 그대로이거나 내려간 집은 2점 이상 이유만(억지로 붙이지 않는다)
      var why = (listed && r.todayRank < r.listRank ? ps : ps.filter(function (p) { return p.pts >= 2; })).slice(0, 2).map(function (p) { return p.label; });
      if (r.must) r.line = "오늘 꼭 · " + r.must;
      else r.line = (listed ? "정보원 " + r.listRank + "순위 → 오늘 " : "오늘 ") + r.todayRank + "번째" + (why.length ? " · " + why.join(" · ") : "");
      r.detail = (listed ? ["정보원 발굴 " + r.listRank + "순위"] : ["정보원 순위 없음(주민 신호·옛 명단)"])
        .concat(r.must ? ["오늘 꼭: " + r.must] : [])
        .concat(ps.map(function (p) { return p.detail; }))
        .concat(r.parts.length ? ["앞당김 " + r.G + "칸(1점 = 1칸) · 특보·무반응은 시연 가상값 · 가중치는 시연용 잠정값"] : ["가산 없음"]);
      delete r.i;
    });
    return out;
  }

  // ── 실시간 신고 끼워 넣기(경로) ── pts: [{id,x,y}], office {x,y}, kmBetween(a,b)
  function legKm(a, b, km) { return km(a, b); }
  /** 최소 추가 거리 자리: fixed 개(이미 다녀온 집)는 그대로 두고 남은 틈 중 가장 덜 늘어나는 곳. → { order, at, addKm } */
  function insertCheapest(order, p, office, ret, km, fixed) {
    fixed = Math.max(0, fixed || 0);
    var best = null;
    for (var i = fixed; i <= order.length; i++) {
      var a = i === 0 ? office : order[i - 1], b = i < order.length ? order[i] : (ret ? office : null);
      var add = legKm(a, p, km) + (b ? legKm(p, b, km) - legKm(a, b, km) : 0);
      if (!best || add < best.addKm - 1e-9) best = { at: i, addKm: add };
    }
    var o = order.slice(); o.splice(best.at, 0, p);
    return { order: o, at: best.at, addKm: +best.addKm.toFixed(2) };
  }
  function pathKm(start, list, end, km) { var cur = start, t = 0; list.forEach(function (s) { t += km(cur, s); cur = s; }); if (end && list.length) t += km(cur, end); return t; }
  /** 긴급: 바로 다음 방문으로 고정, 그 뒤 남은 집만 2-opt로 다시 짠다(출발 = 신고 집, 끝 = 복귀면 시청) → { order, at } */
  function urgentNext(order, p, office, ret, km, fixed) {
    fixed = Math.max(0, fixed || 0);
    var head = order.slice(0, fixed), best = order.slice(fixed), end = ret ? office : null, bestKm = pathKm(p, best, end, km), imp = true, guard = 0;
    while (imp && guard++ < 50) {
      imp = false;
      for (var i = 0; i < best.length - 1; i++) for (var k = i + 1; k < best.length; k++) {
        var c = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1)), v = pathKm(p, c, end, km);
        if (v + 1e-9 < bestKm) { best = c; bestKm = v; imp = true; }
      }
    }
    return { order: head.concat([p], best), at: fixed };
  }
  /** 근무 시간 넘김 → 미룰 집 제안: «오늘 꼭»·고정 제외, 보정 순위가 가장 낮은 집(리스트 끝)부터 */
  function deferCandidate(ranked, inRoute, keep) {
    for (var i = ranked.length - 1; i >= 0; i--) { var r = ranked[i]; if (r.band !== "must" && inRoute.indexOf(r.id) >= 0 && (keep || []).indexOf(r.id) < 0) return r.id; }
    return null;
  }

  // ── 명단 밖 가구(A안) ──
  var FROM = { field: "현장에서 봄", neighbor: "옆집", leader: "통장·이장", request: "주민 신고", partner: "협약 기관" };
  var SIGNS = ["우편물 쌓임", "난방 안 됨", "끼니 거름", "거동 불편", "체납 고지서", "위생 나쁨", "불 꺼짐", "기타"];
  var STATUS = { registered: "등록됨", visited: "확인 방문함", in_list: "명단에 있음", near: "확인 필요", not_in_list: "신규 발굴 의뢰", referred: "의뢰함", closed: "종결" };
  /** 주소 대조용: 경상북도·상주시·공백·층·호 지우기(이 기기 안에서만 쓰고 화면에 적지 않는다) */
  function normAddr(a) {
    return String(a || "").replace(/경상북도|경북|상주시/g, "").replace(/\d+\s*층|\d+\s*호/g, "").replace(/[\s,()·-]/g, "");
  }
  function roadOf(a) { var m = normAddr(a).match(/^(.*?(?:리|로|길|동))(\d+)?/); return m ? m[1] : ""; }
  /** 메모 하나 + 명단 줄들([{id, addr, prio}]) → in_list | near | not_in_list | null(주소 없음) */
  function matchOne(memo, list) {
    var a = normAddr(memo.addr); if (!a) return { status: null };
    for (var i = 0; i < list.length; i++) if (normAddr(list[i].addr) === a) return { status: "in_list", hit: list[i] };
    var road = roadOf(memo.addr);
    for (var j = 0; j < list.length; j++) if (road && roadOf(list[j].addr) === road) return { status: "near", hit: list[j] };
    return { status: "not_in_list" };
  }
  /** 다음 정보원 명단 불러온 직후 자동 대조. memos 를 고친 새 배열 + 요약. round = "2026-11" 같은 명단 차수 */
  function matchAll(memos, list, round, now) {
    var at = (now ? new Date(now) : new Date()).toISOString(), sum = { n: 0, inList: 0, notIn: 0, near: 0, noAddr: 0 };
    var out = (memos || []).map(function (m) {
      if (!m || m.status === "closed" || m.status === "in_list") return m;
      var r = matchOne(m, list || []); m = JSON.parse(JSON.stringify(m)); m.history = m.history || [];
      if (!r.status) { sum.noAddr++; return m; }
      sum.n++;
      var prevOut = m.match && m.match.status === "not_in_list" && m.match.round !== round;
      m.match = { round: round, status: r.status, listId: r.hit ? r.hit.id : null, listRank: r.hit ? r.hit.prio || null : null, twice: r.status === "not_in_list" && !!prevOut };
      if (r.status === "in_list") { sum.inList++; m.status = "in_list"; }
      else if (r.status === "near") { sum.near++; m.status = "near"; }
      else { sum.notIn++; if (m.status !== "referred") m.status = "not_in_list"; }
      m.history.push({ at: at, status: m.status, by: "auto", note: round + " 명단 대조" });
      return m;
    });
    sum.text = sum.n || sum.noAddr ? "명단 밖 메모 " + sum.n + "곳 맞춰 봄 · 명단에 있음 " + sum.inList + " · 없음 " + sum.notIn + "(신규 발굴 의뢰) · 확인 필요 " + sum.near + (sum.noAddr ? " · 주소 없어 못 맞춘 메모 " + sum.noAddr : "") : "";
    return { memos: out, summary: sum };
  }
  /** 꼬리표(화면) */
  function memoTags(m) {
    var t = [];
    if (m.urgent && m.status !== "referred" && m.status !== "closed") t.push({ t: "지금 등록 권장", k: "live" });
    if (m.status === "in_list") t.push({ t: "현장에서 먼저 봄", k: "ok" });
    else if (m.status === "not_in_list") t.push({ t: m.match && m.match.twice ? "2차례 명단 밖" : "신규 발굴 의뢰", k: "warn" });
    else if (m.status === "near") t.push({ t: "확인 필요", k: "warn" });
    else if (m.status === "referred") t.push({ t: "의뢰함 " + String(m.referredAt || "").slice(5, 10).replace("-", "-"), k: "" });
    else if (m.status === "visited") t.push({ t: "확인 방문함", k: "" });
    else if (m.status === "closed") t.push({ t: "종결", k: "" });
    else t.push({ t: "다음 명단과 대조 예정", k: "" });
    return t;
  }
  /** 보고 한 줄: 최근 30일 현장에서 찾은 명단 밖 가구 N곳 · 행복이음 의뢰 M곳 */
  function reportLine(memos, now) {
    var t = (now ? new Date(now) : new Date()).getTime();
    var mine = (memos || []).filter(function (m) { var a = new Date(m && m.at).getTime(); return isFinite(a) && t - a <= 30 * DAY && t - a >= -DAY; });
    var ref = mine.filter(function (m) { return m.status === "referred"; }).length;
    return { n: mine.length, referred: ref, text: "최근 30일 현장에서 찾은 명단 밖 가구 " + mine.length + "곳 · 행복이음 의뢰 " + ref + "곳" };
  }

  var api = { OLD_AGE: OLD_AGE, MUST_HOURS: MUST_HOURS, compute: compute, aloneOld: aloneOld, gapDays: gapDays, pendingDays: pendingDays,
    insertCheapest: insertCheapest, urgentNext: urgentNext, deferCandidate: deferCandidate,
    FROM: FROM, SIGNS: SIGNS, STATUS: STATUS, normAddr: normAddr, matchOne: matchOne, matchAll: matchAll, memoTags: memoTags, reportLine: reportLine, josa: josa };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DaeumPriority = api;
})(typeof window !== "undefined" ? window : this);
