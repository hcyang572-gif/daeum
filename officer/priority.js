/* 닿음 S11-i — 방문 순서 «앞당김» 3차(축 4개 · 최대 7칸) · 명단 밖 가구(A안) 대조 (화면과 무관한 순수 함수, ⚙️ 파로 2026-11-03)
   정본 규격: 01_리서치/S11-d2_우선순위_규칙.md 1-3~1-5(3차) · 시안 _design/S11-k_흐름시안 «파로 주의 11». 칸 수·문턱은 «시연용 잠정값».
   지키는 것:
   - 닿음은 발굴(선별)을 하지 않는다. 한국사회보장정보원이 준 발굴 순위를 뼈대로, 그 순위가 볼 수 없는 현장 사정 4축만 더한다:
     오늘의 위험(특보 × 혼자 사는 고령, 상한 3) · 만남 공백(상한 2) · 닿지 않음(AI 초기상담 안 닿음·이번 차수 부재 2번, 상한 1) · 처리 기한(56일 넘긴 미처리, 상한 1).
   - 위기정보 종류·개수, 나이·고독사 표시 자체, 발굴 횟수는 더하지 않는다(이중 가산 금지). 감점 없음. 주민 신고·무반응 신호는 받지 않는다(신고 접수 제거, 11-03).
   - 화면에는 점수 숫자를 띄우지 않는다 → «발굴 N순위 → 오늘 M번째 · 이유»만. 칸 내역은 근거 화면(③)에서만.
   브라우저: window.DaeumPriority / node: require */
(function (root) {
  "use strict";
  var DAY = 86400000, OLD_AGE = 75, ROUND_DAYS = 60, PEND_DAYS = 56;

  function sod(d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d; }
  function days(a, b) { return Math.round((sod(b) - sod(a)) / DAY); }
  function josa(w, a, b) { var c = String(w || "").charCodeAt(String(w || "").length - 1); if (!(c >= 0xac00 && c <= 0xd7a3)) return w + a; return w + ((c - 0xac00) % 28 ? a : b); }
  /** 특보 단계: weather.level 이 있으면 그것, 없으면 이름에서(«한파주의보» → 주의보) */
  function wxLevel(w) { if (!w) return null; if (w.level === "경보" || w.level === "주의보") return w.level; return /경보/.test(w.name || "") ? "경보" : /주의보/.test(w.name || "") ? "주의보" : null; }

  /** 혼자 사는 고령: 명단 «우선방문대상자_고독사»=Y 또는 75세 이상 1인 */
  function aloneOld(h, m) { return !!((m && m.lonely) || (h && h.single && h.members && h.members[0] && h.members[0].age >= OLD_AGE)); }
  /** 지난 대면 상담 뒤 지난 날(닿음 «만남» 기록·가구 시연값 중 가장 최근). 기록 없으면 null */
  function gapDays(h, attempts, today) {
    today = today ? new Date(today) : new Date();
    var best = h && h.daysSinceContact != null ? +h.daysSinceContact : null;
    (attempts || []).forEach(function (t) { if (t && t.householdId === h.id && t.result === "met" && new Date(t.at) <= today) { var d = days(t.at, today); if (best == null || d < best) best = d; } });
    return best;
  }
  /** 미처리 경과일 = (발굴횟수 − 1) × 60 + (오늘 − 발굴년월 1일). 처리여부가 «미처리»일 때만 */
  function pendingDays(m, today) {
    if (!m || !/미처리/.test(m.proc || "") || !/^\d{4}-\d{1,2}/.test(m.ym || "")) return null;
    var p = m.ym.split("-"), first = new Date(+p[0], +p[1] - 1, 1);
    return Math.max(0, ((+m.cnt || 1) - 1) * ROUND_DAYS + days(first, today));
  }
  /** 이번 차수 시작 = 발굴년월 1일(없으면 null — 차수 구분 없이 모든 기록) */
  function roundStart(m) { if (!m || !/^\d{4}-\d{1,2}/.test(m.ym || "")) return null; var p = m.ym.split("-"); return new Date(+p[0], +p[1] - 1, 1); }
  var ABSENT = /^(absent|no_answer)$/, REFUSE = /^(refuse|refused)$/;
  /** 이번 차수 방문 기록 요약: 부재 수(간접 확인 뒤는 0) · 만남 · 거절 */
  function roundVisits(hid, attempts, start, today) {
    today = today ? new Date(today) : new Date();
    var mine = (attempts || []).filter(function (t) { return t && t.householdId === hid && t.channel !== "ai" && t.channel !== "phone" && (!start || new Date(t.at) >= start) && new Date(t.at) <= today; })
      .sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var absent = 0, met = false, refused = false;
    mine.forEach(function (t) {
      if (ABSENT.test(t.result)) absent++;
      else if (t.result === "indirect_ok") absent = 0; // 통·이장 간접 확인으로 안부 확인 → 닿지 않음 0
      else if (t.result === "met") met = true;
      else if (REFUSE.test(t.result)) refused = true;
    });
    return { absent: absent, met: met, refused: refused };
  }
  function aiMissed(m) { return /안\s*닿|미응답|연결\s*안|불통|미연결/.test((m && m.aiRes) || ""); }

  // 축 4개(기호·이름·상한) — 화면 기준표와 같은 순서
  var AXES = [{ k: "g", name: "오늘의 위험", max: 3, data: "기상청 특보 × 명단 연령·고독사 열" }, { k: "n", name: "만남 공백", max: 2, data: "닿음 만남 기록 · 최초처리일자" },
    { k: "d", name: "닿지 않음", max: 1, data: "명단 AI초기상담 · 닿음 부재 기록" }, { k: "r", name: "처리 기한", max: 1, data: "명단 처리여부·발굴년월·횟수" }];
  var ROWS = [
    { id: "g1", ax: "g", pts: 3, text: "한파·폭염 경보 중 · 혼자 사는 고령", why: "주의보보다 한 단계 위 특보 · 칸 수 잠정값" },
    { id: "g2", ax: "g", pts: 2, text: "한파·폭염 주의보 중 · 혼자 사는 고령", why: "보건복지부 2026년 제5차 발굴 «겨울철 에너지취약» 집중 대상" },
    { id: "g3", ax: "g", pts: 1, text: "경보 중 · 혼자 사는 고령 아님", why: "경보는 누구에게나 위험 · 현장 판단 잠정값" },
    { id: "n1", ax: "n", pts: 1, text: "마지막 대면 상담 1년 넘음", why: "사회적 고립(고독사예방법 제2조) · 문턱 잠정값" },
    { id: "n2", ax: "n", pts: 2, text: "2년 넘음 · 상담 기록 없음", why: "기록 없음 = 가장 오래 못 본 집으로 봄" },
    { id: "d1", ax: "d", pts: 1, text: "AI 초기상담 전화 안 닿음(명단 열)", why: "현행 절차: AI 전화가 안 닿으면 방문으로" },
    { id: "d2", ax: "d", pts: 1, text: "이번 차수 방문 부재 2번 이상", why: "안부 확인이 계속 안 됨 · 문턱 잠정값" },
    { id: "r1", ax: "r", pts: 1, text: "지난 차수 기한 넘긴 미처리(56일 이상)", why: "발굴 1차수 = 8주(보건복지부 2026년 제5차 일정)" }
  ];

  /**
   * households: 이번 차수 명단 가구(가구 객체). ctx = {
   *   today, meta: {id:{prio,cnt,proc,ym,lonely,aiRes}}, weather: {name, level?}|null, attempts: [시도], pins: [id], deferred: [id] }
   *   ⛔ requests·noResponse·tips 는 받지 않는다(신고 접수 제거 · 닿음에 없는 데이터).
   * → [{ id, h, band:"pin"|"adj"|"later", listRank, G, K, ax:{g,n,d,r}, parts:[{k,row,pts,label,detail}], rows:[기준표 줄 id], todayRank, line, detail:[…], gap, absent }] (방문 순서대로)
   *   + 배열 속성 .excluded = [{id, why}] (이번 차수 만남·거절·처리 완료 — 순서 밖)
   */
  function compute(households, ctx) {
    ctx = ctx || {};
    var today = ctx.today ? new Date(ctx.today) : new Date(), meta = ctx.meta || {}, w = ctx.weather || null, lvl = wxLevel(w);
    var pins = ctx.pins || [], deferred = ctx.deferred || [], n = (households || []).length, excluded = [], out = [];
    (households || []).forEach(function (h) {
      var m = meta[h.id] || {}, parts = [], rows = [];
      var listRank = isFinite(parseFloat(m.prio)) ? parseFloat(m.prio) : n + 1;
      var age = h.members && h.members[0] ? h.members[0].age : null, old = aloneOld(h, m);
      var rv = roundVisits(h.id, ctx.attempts, roundStart(m), today);
      if (rv.met) { excluded.push({ id: h.id, h: h, why: "이번 차수 만남 완료" }); return; }
      if (rv.refused) { excluded.push({ id: h.id, h: h, why: "거절 — 근무일 5일 뒤 다시 권유" }); return; }
      if (/처리\s*완료|^완료$/.test(m.proc || "")) { excluded.push({ id: h.id, h: h, why: "처리 완료" }); return; }
      // 오늘의 위험(상한 3): 특보 단계 × 혼자 사는 고령
      var gr = lvl === "경보" && old ? "g1" : lvl === "주의보" && old ? "g2" : lvl === "경보" ? "g3" : null;
      if (gr) { var gp = gr === "g1" ? 3 : gr === "g2" ? 2 : 1; rows.push(gr);
        parts.push({ k: "g", row: gr, pts: gp, label: w.name + (old ? " · " + (age ? age + "세 " : "") + "혼자" : ""),
          detail: "오늘의 위험 +" + gp + " " + w.name + "(시연 가상)" + (old ? " × 혼자 사는 고령(" + (m.lonely ? "고독사 우선방문 Y" : "75세 이상 1인") + ")" : "") }); }
      // 만남 공백(상한 2)
      var gap = gapDays(h, ctx.attempts, today), N = gap == null || gap >= 730 ? 2 : gap >= 365 ? 1 : 0;
      if (N) { rows.push(N === 2 ? "n2" : "n1");
        parts.push({ k: "n", row: N === 2 ? "n2" : "n1", pts: N, label: gap == null ? "상담 기록 없음" : gap >= 730 ? "2년 넘게 상담 없음" : "1년 넘게 상담 없음",
          detail: "만남 공백 +" + N + " 마지막 대면 상담 " + (gap == null ? "기록 없음" : gap + "일 전") }); }
      // 닿지 않음(상한 1): AI 초기상담 안 닿음 또는 이번 차수 부재 2번 이상 — 둘 다여도 1칸
      var ai = aiMissed(m), ab = rv.absent >= 2;
      if (ai) rows.push("d1"); if (ab) rows.push("d2");
      if (ai || ab) parts.push({ k: "d", row: ai ? "d1" : "d2", pts: 1, label: ai ? "AI 초기상담 안 닿음" : "부재 " + rv.absent + "번",
        detail: "닿지 않음 +1 " + [ai ? "AI 초기상담 전화 안 닿음(명단 열)" : "", ab ? "이번 차수 방문 부재 " + rv.absent + "번" : ""].filter(Boolean).join(" · ") });
      // 처리 기한(상한 1): 56일 넘긴 미처리
      var pd = pendingDays(m, today);
      if (pd != null && pd >= PEND_DAYS) { rows.push("r1");
        parts.push({ k: "r", row: "r1", pts: 1, label: (+m.cnt || 1) + "차례 발굴 · " + pd + "일 미처리", detail: "처리 기한 +1 미처리 " + pd + "일(발굴 " + (+m.cnt || 1) + "회)" }); }
      var ax = { g: 0, n: 0, d: 0, r: 0 };
      parts.forEach(function (p) { ax[p.k] = Math.max(ax[p.k], p.pts); });
      AXES.forEach(function (a) { ax[a.k] = Math.min(ax[a.k], a.max); });
      var G = ax.g + ax.n + ax.d + ax.r;
      out.push({ id: h.id, h: h, m: m, listRank: listRank, gap: gap, gapKey: gap == null ? 1e9 : gap, absent: rv.absent, pend: pd, old: old, G: G, K: listRank - G, ax: ax, parts: parts, rows: rows,
        band: pins.indexOf(h.id) >= 0 ? "pin" : deferred.indexOf(h.id) >= 0 ? "later" : "adj" });
    });
    var bandOrd = function (r) { return r.band === "pin" ? 0 : r.band === "later" ? 2 : 1; };
    out.sort(function (a, b) { return bandOrd(a) - bandOrd(b) || a.K - b.K || b.ax.g - a.ax.g || a.listRank - b.listRank || b.gapKey - a.gapKey || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
    var ORD = { g: 0, d: 1, n: 2, r: 3 };
    out.forEach(function (r, i) {
      r.todayRank = i + 1;
      var listed = r.listRank <= n;
      var why = r.parts.slice().sort(function (a, b) { return b.pts - a.pts || ORD[a.k] - ORD[b.k]; }).slice(0, 2).map(function (p) { return p.k === "g" ? w.name : p.label; });
      r.line = (r.band === "pin" ? "담당자가 앞에 둠 · " : "") + (listed ? "발굴 " + r.listRank + "순위 → 오늘 " : "오늘 ") + r.todayRank + "번째" + (why.length ? " · " + why.join(" · ") : "");
      r.detail = [listed ? "한국사회보장정보원 발굴 " + r.listRank + "순위" : "발굴 순위 없음(명단 길이 + 1로 봄)"]
        .concat(r.band === "pin" ? ["담당자가 앞에 둠(점수와 무관)"] : r.band === "later" ? ["담당자가 내일로 미룸"] : [])
        .concat(r.parts.map(function (p) { return p.detail; }))
        .concat(["앞당김 " + r.G + "칸(오늘의 위험 " + r.ax.g + "·만남 공백 " + r.ax.n + "·닿지 않음 " + r.ax.d + "·처리 기한 " + r.ax.r + ", 최대 7)"]);
    });
    out.excluded = excluded;
    return out;
  }

  /** 근무 시간 넘김 → 미룰 집 제안: 담당자 고정 제외, 방문 순서가 가장 뒤인 집부터 */
  function deferCandidate(ranked, inRoute, keep) {
    for (var i = ranked.length - 1; i >= 0; i--) { var r = ranked[i]; if (r.band !== "pin" && inRoute.indexOf(r.id) >= 0 && (keep || []).indexOf(r.id) < 0) return r.id; }
    return null;
  }

  // ── 명단 밖 가구(A안) ──
  var FROM = { field: "현장에서 봄", neighbor: "옆집", leader: "통장·이장", partner: "협약 기관" };
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

  var api = { OLD_AGE: OLD_AGE, AXES: AXES, ROWS: ROWS, compute: compute, aloneOld: aloneOld, gapDays: gapDays, pendingDays: pendingDays, roundVisits: roundVisits, wxLevel: wxLevel,
    deferCandidate: deferCandidate,
    FROM: FROM, SIGNS: SIGNS, STATUS: STATUS, normAddr: normAddr, matchOne: matchOne, matchAll: matchAll, memoTags: memoTags, reportLine: reportLine, josa: josa };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DaeumPriority = api;
})(typeof window !== "undefined" ? window : this);
