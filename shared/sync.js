/* 닿음 PC↔폰 실시간 연동 — 방문 계획(visit_plan)·방문 결과(visit_log) (⚙️ 파로, S11-k «파로 주의 10», 2026-11-03)
   - 서버: 닿음 전용 Supabase «daeum»(config.syncUrl). ⛔ 상주 정책플랫폼 Supabase 와 무관 — 그쪽 주소는 여기 올 수 없다(아래 GUARD).
   - 같은 공무원 계정으로 로그인한 PC와 폰이 같은 행을 구독한다(Realtime postgres_changes, RLS owner_id = auth.uid()).
   - 로그인 전·서버 준비 전·끊김: 이 기기 localStorage 에만 저장하고, 다시 붙으면 쌓아 둔 것을 자동으로 보낸다.
   - 저장 범위: 가구 관리 번호·순서·상태·메모(F.mask 가림 뒤)만. 성명·주민등록번호·연락처·주소는 칸이 없다.
   window.DaeumSync */
(function (root) {
  "use strict";
  var C = root.DAEUM_CONFIG || {}, F = root.DaeumFeatures || {};
  var K = { plan: "daeum.visit.plan", log: "daeum.visit.log", queue: "daeum.visit.queue", safe: "daeum.s12.safeAlerts" };
  var LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  var GUARD = /gicjzrxgktpovnphtjhi\.supabase\.co$/; // 닿음 전용 프로젝트만 허용
  var S = { mode: "local", why: "login", user: null, at: null, client: null, ch: null, subs: [], gen: 0, conUser: null, flushing: null, pullAgain: false, pulling: null };
  var SESSION_WAIT = C.syncSessionWaitMs || 6000; // 세션 읽기가 이보다 오래 걸리면 저장된 세션으로 바로 붙는다(잠금 경합 대비)

  /* 실기기(11-03) 교훈: supabase-js 기본 인증 잠금(navigator.locks)은 «같은 주소의 모든 탭»이 나눠 쓴다.
     인증 이벤트 안에서 바로 서버를 부르면 잠금이 안 풀려(교착) 이후 조회·보내기·새로고침 뒤 세션 읽기가 모두 멈췄다.
     → ①이벤트 처리는 setTimeout 으로 미루고 ②잠금은 «이 탭 안에서만» 줄 세운다(탭끼리 서로 막지 않게). */
  var tabLock = Promise.resolve();
  function lockInTab(name, timeout, fn) { var run = tabLock.then(function () { return fn(); }); tabLock = run.catch(function () {}); return run; }
  function later(f) { setTimeout(f, 0); }

  function get(k, d) { try { var v = root.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function set(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function emit(what) { S.subs.forEach(function (f) { try { f(what); } catch (e) { if (root.console) console.warn("[닿음 연동]", e); } }); }
  function mask(s) { return F.mask ? F.mask(s) : String(s || ""); }
  function uid() { // 서버 id 와 같은 값(uuid)을 이 기기에서 먼저 정해 두 사본이 겹치지 않게
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }); }
  function host() { try { return new URL(C.syncUrl || "").host; } catch (e) { return ""; } }
  function enabled() { return !!(C.syncUrl && C.syncKey && GUARD.test(host())); }

  // ── 이 기기 사본 ──
  function plan() { return get(K.plan, null); }
  function logs() { return get(K.log, []) || []; }
  function queue() { return get(K.queue, []) || []; }
  /* 38b ③ 안전 모드 알림 — 테이블 없이 같은 채널의 broadcast(«safety»)로만 주고받는다(서버에 남지 않음).
     같은 브라우저의 다른 창은 localStorage(storage 이벤트)로 받는다 → 로그인 전 시연에서도 두 창이 이어진다.
     싣는 것: 알림 id·가구 관리 번호·읍면·시작 시각·예정 분·상태(on/ok/end)·rev · (S12-i5) 도움 요청 횟수·확인 횟수·끝난 방식 뿐. 성명·주소·연락처 없음. */
  function safeAll() { return get(K.safe, {}) || {}; }
  function safeMerge(a) {
    if (!a || !a.id || !a.hid) return false;
    var all = safeAll(), old = all[a.id];
    if (old && (old.rev || 0) >= (a.rev || 0)) return false;
    all[a.id] = { id: String(a.id).slice(0, 60), hid: String(a.hid).slice(0, 12), area: String(a.area || "").slice(0, 20), at: a.at, min: +a.min || 40, state: a.state, rev: +a.rev || Date.now(), by: String(a.by || "").slice(0, 12),
      help: Math.min(Math.max(+a.help || 0, old ? old.help || 0 : 0), 99), hok: Math.min(Math.max(+a.hok || 0, old ? old.hok || 0 : 0), 99), hat: a.hat ? String(a.hat).slice(0, 30) : "", fin: a.fin === "safe" ? "safe" : a.fin ? "rec" : "" }; // S12-i5 도움 요청 횟수·확인 횟수·요청 시각·끝난 방식
    var cut = Date.now() - 12 * 3600e3; // 반나절 지난 것은 지운다
    Object.keys(all).forEach(function (k) { if (new Date(all[k].at).getTime() < cut || (all[k].state === "end" && k !== a.id && all[k].rev < Date.now() - 600e3)) delete all[k]; });
    set(K.safe, all); return true;
  }
  function safeSend(a) {
    a.rev = Math.max(Date.now(), ((safeAll()[a.id] || {}).rev || 0) + 1);
    safeMerge(a); emit("safety");
    if (S.ch && S.mode === "live" && S.ch.send) { try { S.ch.send({ type: "broadcast", event: "safety", payload: a }); } catch (e) { /* 다음 다시 보내기 때 */ } }
    return a;
  }
  function enqueue(op) { var q = queue(); q.push(op); set(K.queue, q.slice(-200)); } // 로그인 안 한 채 오래 써도 200건까지만

  function loadLib() {
    if (root.supabase && root.supabase.createClient) return Promise.resolve(root.supabase);
    return new Promise(function (ok, no) {
      var s = document.createElement("script"); s.src = LIB; s.crossOrigin = "anonymous"; s.async = true;
      s.onload = function () { root.supabase ? ok(root.supabase) : no(new Error("lib")); }; s.onerror = function () { no(new Error("lib")); };
      document.head.appendChild(s);
    });
  }
  function client() {
    if (S.client) return Promise.resolve(S.client);
    if (!enabled()) return Promise.reject(new Error("off"));
    return loadLib().then(function (L) {
      S.client = L.createClient(C.syncUrl, C.syncKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "daeum.auth", lock: lockInTab } });
      // ⛔ 이 안에서 서버를 바로 부르지 않는다(교착) — 미뤄서 붙는다
      S.client.auth.onAuthStateChange(function (ev, session) { var u = session && session.user || null; later(function () { setUser(u); }); });
      return S.client;
    });
  }
  function mode(m, why) { S.mode = m; S.why = why || ""; emit("mode"); }
  /** 사용자가 바뀐 때만 다시 붙는다(초기 세션 읽기와 인증 이벤트가 겹쳐 채널이 두 번 열리던 것 방지) */
  function setUser(u) {
    var id = u && u.id || null; S.user = u || null;
    if (id === S.conUser && (S.ch || S.mode === "connecting")) return;
    connect();
  }
  /** 저장된 세션(이 기기 저장소)을 바로 읽는다 — 세션 읽기가 늦을 때의 대체 */
  function storedUser() { var a = get("daeum.auth", null); return a && a.user && a.expires_at && a.expires_at * 1000 > Date.now() ? a.user : null; }

  // ── 서버 → 이 기기 ──
  function rowsToPlan(rows) {
    if (!rows || !rows.length) return null;
    var ym = rows.map(function (r) { return r.round_ym; }).sort().pop(), mine = rows.filter(function (r) { return r.round_ym === ym; });
    return { round_ym: ym, ranked_at: mine[0].ranked_at, until: mine[0].until_date, per_day: 5, remote: true,
      rows: mine.map(function (r) { return { day: r.day, seq: r.seq, household_no: r.household_no, planned_at: r.planned_at, status: r.status, list_rank: r.list_rank, visit_rank: r.visit_rank }; })
        .sort(function (a, b) { return a.day - b.day || a.seq - b.seq; }) };
  }
  function pull() { // 겹쳐 불리면 한 번 더만(실시간 알림이 몰려도 조회는 최대 2번)
    if (S.pulling) { S.pullAgain = true; return S.pulling; }
    S.pulling = pull1().then(function (v) { S.pulling = null; if (S.pullAgain) { S.pullAgain = false; return pull(); } return v; },
      function (e) { S.pulling = null; S.pullAgain = false; throw e; });
    return S.pulling;
  }
  function pull1() {
    var c = S.client; if (!c || !S.user) return Promise.resolve();
    var since = new Date(Date.now() - 200 * 864e5).toISOString();
    return Promise.all([c.from("visit_plan").select("*"), c.from("visit_log").select("*").gte("at", since).order("at")]).then(function (r) {
      var e = r[0].error || r[1].error;
      if (e) { mode("local", /does not exist|42P01|schema cache|PGRST205/.test((e.code || "") + " " + (e.message || "")) ? "no-table" : "error"); throw e; }
      // 45 미르(호창님 11-03 «언제든 심사자가 시연해도»): 시연 모드에선 서버 행도 «오늘 고친 것»만 받는다 — 어제 누가 처리·삭제한 계획·기록은
      //   다음 날 접속하면 보이지 않고 그날 시연 초기 상태(officer/demo_seed.js)로 돌아간다. 같은 날 PC↔폰 실시간 연동은 그대로. 끄기: config.demoDailyReset === false 또는 ?demo=off
      var daily = C.demoDailyReset !== false && C.demoSeed !== false;
      try { if (/[?&]demo=off\b/.test(root.location.search)) daily = false; } catch (e) { /* 주소 없음(시험 환경) */ }
      var t0 = new Date(); t0.setHours(0, 0, 0, 0); t0 = t0.toISOString();
      var fresh = function (v) { return !daily || !v || v >= t0; }; // 시각이 없는 행은 그대로 받는다
      var pr = (r[0].data || []).filter(function (x) { return fresh(x.updated_at); });
      r[1].data = (r[1].data || []).filter(function (x) { return fresh(x.created_at); });
      var p = rowsToPlan(pr); if (p) { if (daily) p.from_seed = "S9j"; set(K.plan, p); } // from_seed: 다음 날 시연 시드가 그날 기준으로 다시 깐다
      var local = logs().filter(function (x) { return x.seed || x.__local; }), ids = {};
      (r[1].data || []).forEach(function (x) { ids[x.id] = 1; });
      var merged = local.filter(function (x) { return !ids[x.id]; }).concat((r[1].data || []).map(function (x) { return { id: x.id, household_no: x.household_no, at: x.at, result: x.result, memo: x.memo, tags: x.tags || [], promises: x.promises || [] }; }));
      set(K.log, merged.sort(function (a, b) { return a.at < b.at ? -1 : 1; }));
      S.at = new Date(); emit("data");
    });
  }
  /** 쌓아 둔 것을 차례로 보낸다 — 한 번에 하나만 돈다(두 번 돌면 같은 기록을 두 번 넣다 «중복»으로 끊겼다) */
  function flush() {
    if (S.flushing) return S.flushing;
    S.flushing = flush1().then(function (v) { S.flushing = null; return v; }, function (e) { S.flushing = null; throw e; });
    return S.flushing;
  }
  function flush1() {
    var c = S.client, q = queue(); if (!c || !S.user || !q.length || S.mode !== "live") return Promise.resolve();
    var op = q[0], job;
    if (op.t === "plan") job = c.from("visit_plan").delete().eq("round_ym", op.round_ym).then(function (r) { if (r.error) throw r.error; return c.from("visit_plan").insert(op.rows); });
    else if (op.t === "log") job = c.from("visit_log").insert(op.row);
    else if (op.t === "status") job = c.from("visit_plan").update({ status: op.status, updated_at: new Date().toISOString() }).eq("round_ym", op.round_ym).eq("household_no", op.household_no);
    else job = Promise.resolve({});
    return job.then(function (r) {
      // 이미 들어간 기록(같은 id, 23505)은 보낸 것으로 친다 — 끊겼다 다시 보낼 때 생긴다
      if (r && r.error && !(op.t === "log" && r.error.code === "23505")) throw r.error;
      var rest = queue(); rest.shift(); set(K.queue, rest); S.at = new Date(); emit("sent");
      return flush1();
    }).catch(function (e) { if (root.console) console.warn("[닿음 연동] 보내기 실패 — 이 기기에 남겨 둠", e && e.message); mode("offline", "send"); });
  }
  function connect() {
    var c = S.client, g = ++S.gen; // 새로 붙을 때마다 세대 번호 — 늦게 끝난 옛 시도는 무시
    if (S.ch) { try { c.removeChannel(S.ch); } catch (e) { /* 무시 */ } S.ch = null; }
    S.conUser = S.user ? S.user.id : null;
    if (!S.user) { mode("local", "login"); return; }
    mode("connecting");
    var uid0 = S.user.id;
    pull().then(function () {
      if (g !== S.gen) return;
      var ch = c.channel("daeum-" + uid0)
        .on("postgres_changes", { event: "*", schema: "public", table: "visit_plan", filter: "owner_id=eq." + uid0 }, function () { later(pull); })
        .on("postgres_changes", { event: "*", schema: "public", table: "visit_log", filter: "owner_id=eq." + uid0 }, function () { later(pull); })
        .on("broadcast", { event: "safety" }, function (m) { var pl = m && m.payload; if (pl && pl.ask) later(function () { emit("safety-ask"); }); else if (safeMerge(pl)) later(function () { emit("safety"); }); });
      S.ch = ch;
      ch.subscribe(function (st) {
        if (g !== S.gen) return;
        if (st === "SUBSCRIBED") { mode("live"); later(function () { pull().catch(function () {}); flush(); try { ch.send({ type: "broadcast", event: "safety", payload: { ask: 1 } }); } catch (e) { /* 무시 */ } }); } // 늦게 연 화면: 다른 화면에 안전 모드 다시 알려 달라고 묻는다 // 끊긴 사이 바뀐 것도 다시 읽는다
        else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") mode("offline", "socket");
      });
    }).catch(function () { /* mode 는 pull 이 정함 */ });
  }

  // ── 바깥에서 부르는 것 ──
  var api = {
    keys: K,
    state: function () { return { mode: S.mode, why: S.why, user: S.user ? { id: S.user.id, email: S.user.email } : null, at: S.at, pending: queue().length, enabled: enabled() }; },
    on: function (f) { S.subs.push(f); },
    plan: plan, logs: logs,
    safety: { list: safeAll, send: safeSend },
    init: function () {
      if (!enabled()) { mode("local", "off"); return Promise.resolve(); }
      return client().then(function (c) {
        // 세션 읽기가 늦으면(다른 탭 잠금 등) 저장된 세션으로 먼저 붙고, 읽기가 끝나면 그 값으로 맞춘다
        var slow = new Promise(function (ok) { setTimeout(function () { ok({ slow: true }); }, SESSION_WAIT); });
        var real = c.auth.getSession().then(function (r) { var u = r && r.data && r.data.session ? r.data.session.user : null; return { user: u }; });
        real.then(function (x) { if ((x.user && x.user.id) !== S.conUser) setUser(x.user); }, function () {});
        return Promise.race([real, slow]);
      }).then(function (r) {
        setUser(r.slow ? storedUser() : r.user);
      }).catch(function () { mode("local", "lib"); });
    },
    signIn: function (email, pw) { return client().then(function (c) { return c.auth.signInWithPassword({ email: email, password: pw }); }).then(function (r) { if (r.error) throw r.error; return r; }); },
    signUp: function (email, pw) { return client().then(function (c) { return c.auth.signUp({ email: email, password: pw }); }).then(function (r) { if (r.error) throw r.error; return r; }); },
    signOut: function () { return client().then(function (c) { return c.auth.signOut(); }).then(function () { setUser(null); }); },
    /** 방문 계획 확정 — 이 기기에 저장하고 서버(로그인 시)에 같은 차수 행을 바꿔 끼운다 */
    savePlan: function (p) {
      p = JSON.parse(JSON.stringify(p)); delete p.seed; p.saved_at = new Date().toISOString(); set(K.plan, p);
      enqueue({ t: "plan", round_ym: p.round_ym, rows: p.rows.map(function (r) {
        return { round_ym: p.round_ym, day: r.day, seq: r.seq, household_no: r.household_no, planned_at: r.planned_at, status: r.status || "planned", list_rank: r.list_rank, visit_rank: r.visit_rank, ranked_at: p.ranked_at, until_date: p.until };
      }) });
      emit("data"); return flush();
    },
    /** 방문 결과 저장 — 메모는 가린 뒤에만. 계획 행 상태도 함께 바꾼다 */
    addLog: function (row) {
      var r = { id: uid(), household_no: row.household_no, at: row.at || new Date().toISOString(), result: row.result, memo: mask(row.memo || "").slice(0, 1000),
        tags: (row.tags || []).slice(0, 12), promises: (row.promises || []).map(function (x) { return { text: mask(x.text).slice(0, 80), due: x.due || null, kind: x.kind || "" }; }).slice(0, 8), __local: true };
      var L = logs(); L.push(r); set(K.log, L);
      var p = plan(), st = r.result === "met" ? "done" : r.result === "absent" ? "absent" : r.result === "refuse" ? "refused" : null;
      if (p && st) { p.rows.forEach(function (x) { if (x.household_no === r.household_no) x.status = st; }); set(K.plan, p); enqueue({ t: "status", round_ym: p.round_ym, household_no: r.household_no, status: st }); }
      var send = Object.assign({}, r); delete send.__local;
      enqueue({ t: "log", row: send });
      emit("data"); return flush().then(function () { return r; });
    }
  };
  root.addEventListener && root.addEventListener("online", function () { if (S.user) connect(); });
  // 길안내 갔다 «뒤로»(뒤로 가기 캐시) 오면 실시간 연결이 끊겨 있다 — 다시 붙는다(실기기 11-03)
  root.addEventListener && root.addEventListener("pageshow", function (e) { if (e && e.persisted && S.user) later(connect); });
  // 다른 탭에서 로그인·로그아웃하면(같은 저장소 키) 이 탭도 따라간다
  root.addEventListener && root.addEventListener("storage", function (e) { if (e.key === "daeum.auth" && S.client) later(function () { setUser(storedUser()); }); else if (e.key === K.safe) later(function () { emit("safety"); }); });
  // 화면이 다시 보이면 놓친 알림이 있을 수 있으니 한 번 읽고 남은 것을 보낸다(폰 화면 꺼짐·탭 전환)
  root.document && root.document.addEventListener && root.document.addEventListener("visibilitychange", function () {
    if (root.document.visibilityState === "visible" && S.user && S.mode === "live") { pull().catch(function () {}); flush(); } });
  root.DaeumSync = api;
})(typeof window !== "undefined" ? window : globalThis);
