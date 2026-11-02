/* 닿음 PC↔폰 실시간 연동 — 방문 계획(visit_plan)·방문 결과(visit_log) (⚙️ 파로, S11-k «파로 주의 10», 2026-11-03)
   - 서버: 닿음 전용 Supabase «daeum»(config.syncUrl). ⛔ 상주 정책플랫폼 Supabase 와 무관 — 그쪽 주소는 여기 올 수 없다(아래 GUARD).
   - 같은 공무원 계정으로 로그인한 PC와 폰이 같은 행을 구독한다(Realtime postgres_changes, RLS owner_id = auth.uid()).
   - 로그인 전·서버 준비 전·끊김: 이 기기 localStorage 에만 저장하고, 다시 붙으면 쌓아 둔 것을 자동으로 보낸다.
   - 저장 범위: 가구 관리 번호·순서·상태·메모(F.mask 가림 뒤)만. 성명·주민등록번호·연락처·주소는 칸이 없다.
   window.DaeumSync */
(function (root) {
  "use strict";
  var C = root.DAEUM_CONFIG || {}, F = root.DaeumFeatures || {};
  var K = { plan: "daeum.visit.plan", log: "daeum.visit.log", queue: "daeum.visit.queue" };
  var LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  var GUARD = /gicjzrxgktpovnphtjhi\.supabase\.co$/; // 닿음 전용 프로젝트만 허용
  var S = { mode: "local", why: "login", user: null, at: null, client: null, ch: null, subs: [] };

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
      S.client = L.createClient(C.syncUrl, C.syncKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "daeum.auth" } });
      S.client.auth.onAuthStateChange(function (ev, session) { var u = session && session.user; if ((u && u.id) !== (S.user && S.user.id)) { S.user = u || null; connect(); } });
      return S.client;
    });
  }
  function mode(m, why) { S.mode = m; S.why = why || ""; emit("mode"); }

  // ── 서버 → 이 기기 ──
  function rowsToPlan(rows) {
    if (!rows || !rows.length) return null;
    var ym = rows.map(function (r) { return r.round_ym; }).sort().pop(), mine = rows.filter(function (r) { return r.round_ym === ym; });
    return { round_ym: ym, ranked_at: mine[0].ranked_at, until: mine[0].until_date, per_day: 5, remote: true,
      rows: mine.map(function (r) { return { day: r.day, seq: r.seq, household_no: r.household_no, planned_at: r.planned_at, status: r.status, list_rank: r.list_rank, visit_rank: r.visit_rank }; })
        .sort(function (a, b) { return a.day - b.day || a.seq - b.seq; }) };
  }
  function pull() {
    var c = S.client; if (!c || !S.user) return Promise.resolve();
    var since = new Date(Date.now() - 200 * 864e5).toISOString();
    return Promise.all([c.from("visit_plan").select("*"), c.from("visit_log").select("*").gte("at", since).order("at")]).then(function (r) {
      var e = r[0].error || r[1].error;
      if (e) { mode("local", /does not exist|42P01|schema cache|PGRST205/.test((e.code || "") + " " + (e.message || "")) ? "no-table" : "error"); throw e; }
      var p = rowsToPlan(r[0].data); if (p) set(K.plan, p);
      var local = logs().filter(function (x) { return x.seed || x.__local; }), ids = {};
      (r[1].data || []).forEach(function (x) { ids[x.id] = 1; });
      var merged = local.filter(function (x) { return !ids[x.id]; }).concat((r[1].data || []).map(function (x) { return { id: x.id, household_no: x.household_no, at: x.at, result: x.result, memo: x.memo, tags: x.tags || [], promises: x.promises || [] }; }));
      set(K.log, merged.sort(function (a, b) { return a.at < b.at ? -1 : 1; }));
      S.at = new Date(); emit("data");
    });
  }
  function flush() {
    var c = S.client, q = queue(); if (!c || !S.user || !q.length || S.mode !== "live") return Promise.resolve();
    var op = q[0], job;
    if (op.t === "plan") job = c.from("visit_plan").delete().eq("round_ym", op.round_ym).then(function (r) { if (r.error) throw r.error; return c.from("visit_plan").insert(op.rows); });
    else if (op.t === "log") job = c.from("visit_log").insert(op.row);
    else if (op.t === "status") job = c.from("visit_plan").update({ status: op.status, updated_at: new Date().toISOString() }).eq("round_ym", op.round_ym).eq("household_no", op.household_no);
    else job = Promise.resolve({});
    return job.then(function (r) {
      if (r && r.error) throw r.error;
      var rest = queue(); rest.shift(); set(K.queue, rest); S.at = new Date(); emit("sent");
      return flush();
    }).catch(function (e) { if (root.console) console.warn("[닿음 연동] 보내기 실패 — 이 기기에 남겨 둠", e && e.message); mode("offline", "send"); });
  }
  function connect() {
    var c = S.client;
    if (S.ch) { try { c.removeChannel(S.ch); } catch (e) { /* 무시 */ } S.ch = null; }
    if (!S.user) { mode("local", "login"); return; }
    mode("connecting");
    pull().then(function () {
      S.ch = c.channel("daeum-" + S.user.id)
        .on("postgres_changes", { event: "*", schema: "public", table: "visit_plan", filter: "owner_id=eq." + S.user.id }, function () { pull(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "visit_log", filter: "owner_id=eq." + S.user.id }, function () { pull(); })
        .subscribe(function (st) {
          if (st === "SUBSCRIBED") { mode("live"); flush(); }
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
    init: function () {
      if (!enabled()) { mode("local", "off"); return Promise.resolve(); }
      return client().then(function (c) { return c.auth.getSession(); }).then(function (r) {
        S.user = r && r.data && r.data.session ? r.data.session.user : null; connect();
      }).catch(function () { mode("local", "lib"); });
    },
    signIn: function (email, pw) { return client().then(function (c) { return c.auth.signInWithPassword({ email: email, password: pw }); }).then(function (r) { if (r.error) throw r.error; return r; }); },
    signUp: function (email, pw) { return client().then(function (c) { return c.auth.signUp({ email: email, password: pw }); }).then(function (r) { if (r.error) throw r.error; return r; }); },
    signOut: function () { return client().then(function (c) { return c.auth.signOut(); }).then(function () { S.user = null; connect(); }); },
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
  root.DaeumSync = api;
})(typeof window !== "undefined" ? window : globalThis);
