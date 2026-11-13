/* 닿음 동료 안부 팀 연동 + 팀 현황 — 데이터·판정 (⚙️ 파로, 68회차 S12-z4, 2026-11-12)
   - 서버: 닿음 전용 Supabase(supabase/migration_s12z4_team.sql) 의 daeum_team_* 함수만 부른다. 연결·로그인은 DaeumSync 것을 그대로 쓴다.
   - 흐름: 팀 코드 만들기·넣기 → 1차 동료·2차 팀장 지정 → 상대 «수락» 뒤 연결.
   - 알림(앱 화면만): 예정 시간 넘김 → 1차 동료 · +15분(F.safety.LEAD) → 2차 팀장 · 조용한 도움 요청 → 둘 다.
   - 내 현황 보내기: 방문 중 가구(안전 모드가 켜진 집 = 가구 관리 번호·읍면·시작 시각) · 오늘 마친 가구와 결과 · 남은 계획 수. ⛔ GPS·실명·주소 없음.
   - 연동이 꺼져도 마지막 팀 정보는 이 기기에 남겨 «직접 전화» 단추에 1차 동료 이름을 보여 준다.
   window.DaeumTeam */
(function (root) {
  "use strict";
  var K = { board: "daeum.team.board", hide: "daeum.team.hide", pop: "daeum.team.pop" };
  var LS_SAFE = "daeum.s12.safety"; // app/app.js 안전 모드(이 기기) — 읽기만
  var POLL = 60e3, PUSH_WAIT = 1200;
  var T = { board: null, subs: [], ch: null, chTeam: null, chUid: null, timer: null, loading: null, again: false, lastPush: "", pushT: null, err: "" };

  function get(k, d) { try { var v = root.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function set(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장소 못 씀 */ } }
  function emit(w) { T.subs.forEach(function (f) { try { f(w); } catch (e) { if (root.console) console.warn("[닿음 팀]", e); } }); }
  function ms(v) { var t = v ? new Date(v).getTime() : NaN; return isNaN(t) ? 0 : t; }
  function ymd(d) { d = new Date(d); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function lead() { var S = (root.DaeumFeatures || {}).safety; return S && S.LEAD || 15; }
  function sy() { return root.DaeumSync || null; }

  // ═════ 판정(순수 함수 — 시험 대상) ═════
  function memberOf(b, id) { return b && (b.members || []).filter(function (m) { return m.id === id; })[0] || null; }
  /** 내가 지정한 짝(rank 1 = 1차 동료, 2 = 2차 팀장) — {alias, sim, state} */
  function myLink(b, rank) {
    if (!b || !b.me) return null;
    var l = (b.links || []).filter(function (x) { return x.from === b.me && x.rank === rank; })[0]; if (!l) return null;
    var m = memberOf(b, l.to); return m ? { id: m.id, alias: m.alias, sim: !!m.sim, state: l.state, link: l.id } : null;
  }
  /** 나에게 온 지정 요청(수락 기다림) */
  function incoming(b) {
    if (!b || !b.me) return [];
    return (b.links || []).filter(function (l) { return l.to === b.me && l.state === "pending"; })
      .map(function (l) { var m = memberOf(b, l.from); return { link: l.id, rank: l.rank, alias: m ? m.alias : "팀원" }; });
  }
  /** 이 사람이 나를 몇 차로 지정했고 수락됐는가(없으면 0) */
  function rankToMe(b, from) {
    var l = (b.links || []).filter(function (x) { return x.from === from && x.to === b.me && x.state === "accepted"; })[0];
    return l ? l.rank : 0;
  }
  /** 팀원 한 사람의 화면용 현황 */
  function view(b, id, now) {
    var m = memberOf(b, id), s = b && b.status ? b.status[id] : null; now = now || Date.now();
    if (!m) return null;
    var v = { id: id, alias: m.alias, sim: !!m.sim, me: !!m.me, lead: !!m.lead, active: !!m.active, known: !!s, now: null, done: [], left: 0 };
    if (!s) return v;
    if (s.now_hid && s.safe_state !== "end") {
      var el = Math.max(0, Math.floor((now - ms(s.now_at)) / 60000)), lim = +s.safe_min || 40;
      v.now = { hid: s.now_hid, area: s.now_area || "", el: el, min: lim, over: el >= lim, help: (+s.help || 0) > (+s.hok || 0) };
    }
    v.done = (s.done || []).slice().sort(function (a, c) { return ms(a.at) - ms(c.at); });
    v.left = +s.left_n || 0;
    return v;
  }
  /** 팀 전체 한 줄 — 방문 중 n명 · 완료 n가구 · 남은 계획 n */
  function counts(b, now) {
    var c = { visiting: 0, done: 0, left: 0, members: 0 };
    (b && b.members || []).forEach(function (m) { var v = view(b, m.id, now); if (!v || !v.known) return; c.members++; if (v.now) c.visiting++; c.done += v.done.length; c.left += v.left; });
    return c;
  }
  function hideKey(a) { return a.member + "|" + a.at + "|" + a.kind; }
  /** 나에게 떠야 할 팀 알림 — 1차는 시간 넘김부터, 2차(팀장)는 +15분부터, 조용한 도움 요청은 둘 다 */
  function alerts(b, now, hidden) {
    var out = []; now = now || Date.now(); hidden = hidden || {};
    if (!b || !b.me || !b.status) return out;
    Object.keys(b.status).forEach(function (id) {
      if (id === b.me) return;
      var r = rankToMe(b, id); if (!r) return;
      var v = view(b, id, now); if (!v || !v.now) return;
      var base = { member: id, alias: v.alias, sim: v.sim, hid: v.now.hid, area: v.now.area, el: v.now.el, min: v.now.min, rank: r, at: b.status[id].now_at };
      if (v.now.help) out.push(Object.assign({ kind: "help" }, base));
      var lv = v.now.el >= v.now.min + lead() ? 2 : v.now.el >= v.now.min ? 1 : 0;
      if ((r === 1 && lv >= 1) || (r === 2 && lv === 2)) out.push(Object.assign({ kind: "late", lv: lv }, base));
    });
    return out.filter(function (a) { return !hidden[hideKey(a)]; })
      .sort(function (x, y) { return (y.kind === "help") - (x.kind === "help") || y.el - x.el; });
  }
  /** 78회차 ⓪-5(11-13 호창님 «너무 자주 동료 안전 확인이 뜨지 않게»): 맨 위 배너로 «띄울» 알림만 고른다(알림 자체·안전 단추 표시·확인 기능은 그대로).
      ① 같은 방문·같은 단계(1차/2차)·같은 도움 요청은 한 번만 ② 같은 동료의 1차(시간 넘김)는 최소 간격(실제 30분 · 시연 가상 팀원 180분) 안이면 띄우지 않고 «본 것»으로만 둔다
      ③ 진짜 위험 신호 — 조용한 도움 요청·2차(팀장까지 간 넘김)는 간격과 무관하게 그대로 띄운다. mem = {d:날짜, k:{키:1}, m:{팀원:마지막으로 띄운 ms}} */
  var POP_GAP = { real: 30, sim: 180 };
  function popKey(a) { return hideKey(a) + "|" + (a.kind === "late" ? a.lv : "h"); }
  function popPlan(list, mem, now) {
    now = now || Date.now(); var d = ymd(now); mem = mem && mem.d === d ? { d: d, k: Object.assign({}, mem.k), m: Object.assign({}, mem.m) } : { d: d, k: {}, m: {} };
    var pop = [];
    (list || []).forEach(function (a) {
      var k = popKey(a); if (mem.k[k]) return; mem.k[k] = 1;
      var urgent = a.kind === "help" || (a.kind === "late" && a.lv >= 2), last = mem.m[a.member] || 0, gap = (a.sim ? POP_GAP.sim : POP_GAP.real) * 60000;
      if (!urgent && last && now - last < gap) return;
      mem.m[a.member] = now; pop.push(a);
    });
    return { pop: pop, mem: mem };
  }
  /** 이 기기 기록으로 내 현황을 만든다. 보낼 것이 없으면(오늘 기록도 방문 중도 없음) null — 시연 계정의 서버 시각표를 덮지 않게 */
  function ownSummary(o) {
    o = o || {}; var now = o.now || Date.now(), today = ymd(now), areaOf = o.areaOf || function () { return ""; };
    var sf = o.safe && o.safe.hid ? o.safe : null, rec = o.rec || null;
    var last = {};
    (o.logs || []).forEach(function (l) { if (l && l.household_no && l.at && ymd(l.at) === today && /^(met|absent|refuse|indirect_ok)$/.test(l.result)) { if (!last[l.household_no] || ms(last[l.household_no].at) <= ms(l.at)) last[l.household_no] = l; } });
    var done = Object.keys(last).map(function (h) { var l = last[h]; return { hid: h, area: areaOf(h), res: l.result, at: new Date(l.at).toISOString() }; })
      .sort(function (a, c) { return ms(a.at) - ms(c.at); }).slice(-30);
    var rows = o.plan && o.plan.rows || [], todayRows = rows.filter(function (r) { return r.planned_at && ymd(r.planned_at) === today; });
    if (!todayRows.length && rows.length) { var d0 = rows.filter(function (r) { return (r.status || "planned") === "planned"; }).map(function (r) { return r.day; }).sort(function (a, c) { return a - c; })[0]; todayRows = rows.filter(function (r) { return r.day === d0; }); }
    var left = todayRows.filter(function (r) { return (r.status || "planned") === "planned" && !last[r.household_no] && !(sf && sf.hid === r.household_no); }).length;
    if (!sf && !done.length && !o.force) return null;
    var st = sf ? (rec && rec.state === "ok" ? "ok" : "on") : "";
    return { hid: sf ? sf.hid : "", area: sf ? areaOf(sf.hid) : "", at: sf ? sf.at : null, min: sf ? +sf.min || 40 : null, state: st,
      help: sf ? +sf.help || 0 : 0, hok: sf ? +sf.hok || 0 : 0, hat: sf && sf.hat ? sf.hat : null, done: done, left: Math.min(99, left) };
  }

  // ═════ 서버 ═════
  function rpc(name, args) {
    var L = sy() && sy().live && sy().live(); if (!L) return Promise.reject(new Error("로그인하고 연동이 켜져야 팀을 쓸 수 있습니다"));
    return L.client.rpc(name, args || {}).then(function (r) { if (r.error) throw new Error(koErr(r.error)); return r.data; }, function (e) { throw new Error(koErr(e)); });
  }
  // 84회차 ⑰: 서버 오류 원문(영어일 수 있음)을 그대로 띄우지 않고 한국어 문구로 바꾼다. «daeum:» 으로 시작하는 서버 자체 문구(한국어)만 그대로 쓴다.
  function koErr(e) {
    var m = String(e && (e.message || e.error_description || e) || ""), c = String(e && e.code || "");
    if (/^daeum:\s*/.test(m)) return m.replace(/^daeum:\s*/, "");
    if (/로그인|연동/.test(m) && !/[A-Za-z]{4,}/.test(m)) return m;
    if (/Failed to fetch|NetworkError|network|timeout/i.test(m) || (typeof navigator !== "undefined" && navigator.onLine === false)) return "연결이 끊겼습니다 — 연결되면 다시 해 주세요";
    if (/JWT|token|expired|401|not authenticated/i.test(m) || c === "PGRST301") return "로그인이 끝났습니다 — 다시 로그인해 주세요";
    if (c === "42501" || /permission denied/i.test(m)) return "이 계정으로는 할 수 없는 일입니다";
    if (/rate limit|too many|429/i.test(m)) return "잠깐 사이 요청이 많았습니다 — 조금 뒤 다시 해 주세요";
    if (c === "PGRST202" || /Could not find the function/i.test(m)) return "서버 준비가 덜 됐습니다 — 잠시 뒤 다시 해 주세요";
    return "처리하지 못했습니다 — 잠시 뒤 다시 해 주세요";
  }
  var WHY = { login: "로그인이 필요합니다", demo: "시연 계정은 팀·짝 구성을 바꿀 수 없습니다(시연 팀은 미리 짜여 있고 매일 새벽 처음 상태로)", already: "이미 팀에 들어 있습니다", arg: "입력을 확인해 주세요",
    cap: "오늘은 팀을 더 만들 수 없습니다", code: "팀 코드를 찾지 못했습니다", "demo-team": "시연 팀 코드는 시연 계정 전용입니다", full: "팀 인원이 가득 찼습니다(30명)", "no-team": "팀에 들어 있지 않습니다", "not-linked": "나를 안부 짝으로 지정한 사람만 확인할 수 있습니다" };
  function act(name, args) {
    return rpc(name, args).then(function (d) { if (d && d.ok === false) throw new Error(WHY[d.why] || "처리하지 못했습니다"); return refresh().then(function () { return d; }); });
  }
  function refresh() {
    if (T.loading) { T.again = true; return T.loading; }
    T.loading = rpc("daeum_team_board").then(function (b) {
      T.board = b && b.team ? b : null; T.err = "";
      set(K.board, T.board ? { team: T.board.team, me: T.board.me, members: T.board.members, links: T.board.links, at: new Date().toISOString() } : null);
      applyWho(); adopt(); listen(); emit("board"); if (T.board) schedulePush();
    }, function (e) { var m = String(e && e.message || e); T.err = /PGRST202|Could not find the function|does not exist/.test(m) ? "팀 기능 서버 준비 전입니다 — 곧 열립니다" : m; emit("error"); })
      .then(function () { T.loading = null; if (T.again) { T.again = false; return refresh(); } });
    return T.loading;
  }
  /** 팀 채널 — 같은 팀 줄이 바뀌면 다시 읽는다(RLS 를 따라 읽을 수 있는 줄만 온다) */
  function listen() {
    var L = sy() && sy().live && sy().live(), id = T.board && T.board.team && T.board.team.id;
    if (T.ch && (!L || T.chTeam !== id || T.chUid !== L.uid)) { try { T.ch.client.removeChannel(T.ch.ch); } catch (e) { /* 무시 */ } T.ch = null; T.chTeam = null; }
    if (!L || !id || T.ch) return;
    var f = "team_id=eq." + id, again = function () { setTimeout(function () { refresh(); }, 300); };
    var ch = L.client.channel("daeum-team-" + id + "-" + L.uid.slice(0, 8))
      .on("postgres_changes", { event: "*", schema: "public", table: "daeum_team_status", filter: f }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "daeum_team_link", filter: f }, again)
      .on("postgres_changes", { event: "*", schema: "public", table: "daeum_team_member", filter: f }, again);
    ch.subscribe(); T.ch = { client: L.client, ch: ch }; T.chTeam = id; T.chUid = L.uid;
  }
  /** 동료가 서버에서 «안부 확인 완료»·«연락했어요»를 누르면 이 기기 안전 모드도 맞춘다(기존 safety 경로로 → app 의 safeAdopt) */
  function adopt() {
    var b = T.board, S = sy(); if (!b || !b.status || !S || !S.safety) return;
    var mine = b.status[b.me], sf = get(LS_SAFE, null); if (!mine || !sf || !sf.hid || mine.now_hid !== sf.hid || Math.abs(ms(mine.now_at) - ms(sf.at)) > 61e3) return;
    var a = S.safety.list()[sf.id || "SF-" + sf.hid]; if (!a) return;
    var min = +mine.safe_min || 0, hok = +mine.hok || 0;
    if (min > (+a.min || 0) || hok > (+a.hok || 0)) S.safety.send(Object.assign({}, a, { min: Math.max(min, +a.min || 0), hok: Math.max(hok, +a.hok || 0), state: mine.safe_state === "ok" ? "ok" : a.state }));
  }
  /** 기존 안부 문구(«1차 동료 박주무관 → 2차 김팀장»)를 실제 짝 이름으로 */
  var WHO0 = null;
  function applyWho() {
    var S = (root.DaeumFeatures || {}).safety; if (!S || !S.WHO) return;
    if (!WHO0) WHO0 = { peer: S.WHO.peer, lead: S.WHO.lead };
    var b = T.board || get(K.board, null), p = myLink(b, 1), l = myLink(b, 2);
    S.WHO.peer = p && p.state === "accepted" ? "동료 " + p.alias : WHO0.peer;
    S.WHO.lead = l && l.state === "accepted" ? l.alias : WHO0.lead;
  }
  function areaOf(h) { var D = root.__DAEUM_HOUSEHOLDS__; if (!D || !D.households) return ""; if (!T.by) { T.by = {}; D.households.forEach(function (x) { T.by[x.id] = x.area; }); } return T.by[h] || ""; }
  function pushNow() {
    var S = sy(); if (!T.board || !S) return Promise.resolve(false);
    var sf = get(LS_SAFE, null), rec = sf && S.safety ? S.safety.list()[sf.id || "SF-" + sf.hid] : null;
    if (rec && rec.state === "end") sf = null;
    var mine = T.board.status && T.board.status[T.board.me], today = ymd(Date.now());
    var sum = ownSummary({ plan: S.plan(), logs: S.logs(), safe: sf, rec: rec, areaOf: areaOf, force: !!(mine && !mine.sim && mine.updated_at && ymd(mine.updated_at) === today) || !!T.lastPush });
    if (!sum) return Promise.resolve(false);
    var key = JSON.stringify(sum); if (key === T.lastPush) return Promise.resolve(false);
    return rpc("daeum_team_push", { p: sum }).then(function () { T.lastPush = key; return true; }, function () { return false; });
  }
  function schedulePush() { clearTimeout(T.pushT); T.pushT = setTimeout(function () { pushNow(); }, PUSH_WAIT); }
  function hidden() { var h = get(K.hide, {}) || {}, d = ymd(Date.now()); return h.d === d ? h.k || {} : {}; }

  var api = {
    keys: K,
    /** 지금 팀 정보(연동이 꺼졌으면 마지막으로 받은 것 — 현황은 없음) */
    board: function () { return T.board || get(K.board, null); },
    live: function () { return !!T.board; },
    error: function () { return T.err; },
    on: function (f) { T.subs.push(f); },
    peer: function () { return myLink(api.board(), 1); },
    lead: function () { return myLink(api.board(), 2); },
    /** «직접 전화» 단추에 붙일 1차 동료 이름(가상 팀원이면 «시연·가상» 표시는 화면이) — 없으면 "" */
    peerName: function () { var p = myLink(api.board(), 1); return p && p.state === "accepted" ? p.alias : ""; },
    incoming: function () { return incoming(T.board); },
    view: function (id, now) { return view(T.board, id, now); },
    counts: function (now) { return counts(T.board, now); },
    alerts: function (now) { return alerts(T.board, now, hidden()); },
    /** 78회차 ⓪-5: 지금 알림 중 배너로 새로 띄울 것(이 기기 기억 K.pop 갱신) */
    popNew: function (now) { var r = popPlan(alerts(T.board, now, hidden()), get(K.pop, null), now); set(K.pop, r.mem); return r.pop; },
    refresh: refresh,
    create: function (name, alias) { return act("daeum_team_create", { p_name: name, p_alias: alias }); },
    join: function (code, alias) { return act("daeum_team_join", { p_code: code, p_alias: alias }); },
    leave: function () { return act("daeum_team_leave").then(function (d) { T.lastPush = ""; return d; }); },
    setLink: function (rank, to) { return act("daeum_team_link_set", { p_rank: rank, p_to: to || null }); },
    decide: function (link, yes) { return act("daeum_team_link_decide", { p_link: link, p_accept: !!yes }); },
    /** 받은 알림 확인 — kind "late"(안부 확인 완료) | "help"(연락했어요). 가상 팀원은 서버 줄이 없어 이 기기에서만 닫는다 */
    ack: function (a) {
      var h = get(K.hide, {}) || {}, d = ymd(Date.now()); if (h.d !== d) h = { d: d, k: {} }; h.k[hideKey(a)] = 1; set(K.hide, h); emit("board");
      if (a.sim) return Promise.resolve({ ok: true, sim: true });
      return act("daeum_team_ack", { p_member: a.member, p_kind: a.kind === "help" ? "help" : "ok" });
    },
    push: pushNow,
    init: function () {
      var S = sy(); if (!S || api._on) return; api._on = true; applyWho();
      S.on(function (w) {
        if (w === "mode") { if (S.live && S.live()) refresh(); else { listen(); if (T.board) { T.board = null; emit("board"); } } }
        if (w === "data" || w === "safety" || w === "sent") schedulePush();
      });
      if (S.live && S.live()) refresh();
      T.timer = setInterval(function () { if (S.live && S.live() && (!root.document || root.document.visibilityState !== "hidden")) refresh(); else emit("tick"); }, POLL);
    },
    _t: { popPlan: popPlan, POP_GAP: POP_GAP, myLink: myLink, incoming: incoming, view: view, counts: counts, alerts: alerts, ownSummary: ownSummary, rankToMe: rankToMe, hideKey: hideKey }
  };
  root.DaeumTeam = api;
  if (root.document && root.DaeumSync) { if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", api.init); else api.init(); }
})(typeof window !== "undefined" ? window : globalThis);
