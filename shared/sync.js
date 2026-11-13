/* 닿음 PC↔폰 실시간 연동 — 방문 계획(visit_plan)·방문 결과(visit_log) (⚙️ 파로, S11-k «파로 주의 10», 2026-11-03)
   - 서버: 닿음 전용 Supabase «daeum»(config.syncUrl). ⛔ 상주 정책플랫폼 Supabase 와 무관 — 그쪽 주소는 여기 올 수 없다(아래 GUARD).
   - 같은 공무원 계정으로 로그인한 PC와 폰이 같은 행을 구독한다(Realtime postgres_changes, RLS owner_id = auth.uid()).
   - 로그인 전·서버 준비 전·끊김: 이 기기 localStorage 에만 저장하고, 다시 붙으면 쌓아 둔 것을 자동으로 보낸다.
   - 저장 범위: 가구 관리 번호·순서·상태·메모(F.mask 가림 뒤)만. 성명·주민등록번호·연락처·주소는 칸이 없다.
   window.DaeumSync */
(function (root) {
  "use strict";
  var C = root.DAEUM_CONFIG || {}, F = root.DaeumFeatures || {};
  var K = { plan: "daeum.visit.plan", log: "daeum.visit.log", queue: "daeum.visit.queue", failed: "daeum.visit.failed", safe: "daeum.s12.safeAlerts", doc: "daeum.s12x.hdoc" };
  // S12-y(70회차): doc = 가구별 문서 본문 직접 고침 { "가구번호|문서종류": { text, at, base, sv } } — 서버 표 doc_edit(본인 행만). sv = 서버에서 받은 것
  var DOCK = /^(log|bok|ref|sms)$/;
  // S12-v U30(5-5): 같은 출처 사본(shared/vendor) — 이 파일 주소 기준으로 풀어 사무 화면(officer/)에서도 같은 파일을 가리킨다
  var LIB = new URL("vendor/supabase-js-2.45.4.min.js", (root.document && root.document.currentScript || {}).src || (root.location && root.location.href) || "http://localhost/shared/").href;
  var GUARD = /gicjzrxgktpovnphtjhi\.supabase\.co$/; // 닿음 전용 프로젝트만 허용
  var S = { mode: "local", why: "login", user: null, at: null, client: null, ch: null, subs: [], gen: 0, conUser: null, flushing: null, pullAgain: false, pulling: null };
  // 74회차 ⓪-1: 이메일 가입·확인 메일 복귀 처리(73회차 #access_token 받기) 제거 — 시연 로그인만
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
  function docs() { return get(K.doc, {}) || {}; }
  function docPending(key) { return queue().some(function (op) { return (op.t === "doc" || op.t === "undoc") && op.key === key; }); }
  function docOp(key, e) { var p = key.split("|"); return { t: "doc", key: key, row: { household_no: p[0], kind: p[1], body: e.text, base: String(e.base || ""), updated_at: e.at } }; }
  /** 서버 doc_edit 행 → 이 기기 사본. 서버가 기준이되 아직 못 보낸 것은 이 기기 것을 지키고, 한 번도 안 올린 옛 기기 사본(sv 없음)은 올린다 */
  function docsMerge(rows, fresh) {
    var cur = docs(), out = {}, srv = {}, up = 0;
    (rows || []).forEach(function (x) { if (!x || !fresh(x.updated_at)) return; var k = x.household_no + "|" + x.kind; srv[k] = 1; out[k] = { text: String(x.body || ""), at: x.updated_at, base: x.base || "", sv: 1 }; });
    Object.keys(srv).forEach(function (k) { if (docPending(k)) { if (cur[k]) out[k] = cur[k]; else delete out[k]; } }); // 못 보낸 고침·지움이 서버 옛 값보다 먼저
    Object.keys(cur).forEach(function (k) {
      if (srv[k] || !cur[k]) return;
      if (docPending(k)) out[k] = cur[k];
      else if (!cur[k].sv) { out[k] = cur[k]; enqueue(docOp(k, cur[k])); up = 1; } // 옛 판(이 기기에만 저장)에서 고친 본문 — 지우지 않고 올린다 · sv 인데 서버에 없음 = 다른 기기에서 «다시 만들기»
    });
    set(K.doc, out);
    if (up && S.mode === "live") later(function () { flush(); });
  }
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
  function enqueue(op) {
    var q = queue();
    // S12-v U1: 계획은 «통째로 맞추기»라 같은 차수의 앞선 계획 보내기는 새것 하나로 대신한다(옛 것이 막혀 뒤를 붙잡지 않게)
    if (op.t === "plan") q = q.filter(function (x) { return !(x.t === "plan" && x.round_ym === op.round_ym); });
    op.qid = uid(); // 73회차 🐞(b): 보낸 «그 건»만 대기열에서 지우려고 붙이는 표
    q.push(op); set(K.queue, q.slice(-200)); } // 로그인 안 한 채 오래 써도 200건까지만
  /** 73회차 🐞(b): 보내기가 끝난 건만 대기열에서 뺀다 — 옛날엔 맨 앞(shift)을 뺐는데, 보내는 사이 같은 차수 계획을 다시 저장하면
   *  옛 건은 이미 새 건으로 바뀌어 있어 «새 건»이 지워졌다(날짜를 0.8초 안에 연달아 바꾸면 나중 값이 다른 기기에 안 감) */
  function dropSent(op) {
    var q = queue(), k = JSON.stringify(op), i = -1;
    q.some(function (x, j) { if (op.qid ? x.qid === op.qid : JSON.stringify(x) === k) { i = j; return true; } return false; });
    if (i >= 0) { q.splice(i, 1); set(K.queue, q); } }
  function planPending(ym) { return queue().some(function (op) { return op.t === "plan" && op.round_ym === ym; }); }
  /** 계획 행(서버 칸 이름) — 확정·편집·(시연) 상태 바꿈 모두 같은 모양으로 보낸다. updated_at 은 지금(«오늘 고친 차수» 판정에 쓰임) */
  function planOp(p) {
    var now = new Date().toISOString();
    return { t: "plan", round_ym: p.round_ym, rows: (p.rows || []).map(function (r) {
      return { round_ym: p.round_ym, day: r.day, seq: r.seq, household_no: r.household_no, planned_at: r.planned_at, status: r.status || "planned", list_rank: r.list_rank, visit_rank: r.visit_rank, ranked_at: p.ranked_at, until_date: p.until, updated_at: now };
    }) };
  }

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
    // S12-y: 문서 본문 표(doc_edit)는 따로 받는다 — 표가 아직 없거나(SQL 적용 전) 막혀도 계획·기록 연동은 그대로(그땐 본문만 이 기기 저장)
    var dq = S.noDoc ? Promise.resolve(null) : Promise.resolve(c.from("doc_edit").select("*")).then(function (x) { return x; }, function (e) { return { error: e }; });
    return Promise.all([c.from("visit_plan").select("*"), c.from("visit_log").select("*").gte("at", since).order("at"), dq]).then(function (r) {
      var e = r[0].error || r[1].error;
      if (e) { mode("local", /does not exist|42P01|schema cache|PGRST205/.test((e.code || "") + " " + (e.message || "")) ? "no-table" : "error"); throw e; }
      // 45 미르(호창님 11-03 «언제든 심사자가 시연해도»): 시연 모드에선 서버 행도 «오늘 고친 것»만 받는다 — 어제 누가 처리·삭제한 계획·기록은
      //   다음 날 접속하면 보이지 않고 그날 시연 초기 상태(officer/demo_seed.js)로 돌아간다. 같은 날 PC↔폰 실시간 연동은 그대로. 끄기: config.demoDailyReset === false 또는 ?demo=off
      var daily = C.demoDailyReset !== false && C.demoSeed !== false;
      try { if (/[?&]demo=off\b/.test(root.location.search)) daily = false; } catch (e) { /* 주소 없음(시험 환경) */ }
      var t0 = new Date(); t0.setHours(0, 0, 0, 0); t0 = t0.toISOString();
      var fresh = function (v) { return !daily || !v || v >= t0; }; // 시각이 없는 행은 그대로 받는다
      // S12-v U2: 행마다 거르면 «오늘 고친 한 줄»만 남아 계획이 1~2줄로 줄었다 → 차수 단위로: 오늘 고친 행이 하나라도 있는 차수는 그 차수 행 전체를 받는다
      var hot = {}; (r[0].data || []).forEach(function (x) { if (fresh(x.updated_at)) hot[x.round_ym] = 1; });
      var pr = (r[0].data || []).filter(function (x) { return hot[x.round_ym]; });
      r[1].data = (r[1].data || []).filter(function (x) { return fresh(x.created_at); });
      var p = rowsToPlan(pr); if (p && !planPending(p.round_ym)) { if (daily) p.from_seed = "S9j"; set(K.plan, p); } // 73회차 🐞(b): 못 보낸 새 계획이 있으면 서버 옛 값으로 덮지 않는다(마지막 값 우선) // from_seed: 다음 날 시연 시드가 그날 기준으로 다시 깐다
      var local = logs().filter(function (x) { return x.seed || x.__local; }), ids = {};
      (r[1].data || []).forEach(function (x) { ids[x.id] = 1; });
      var merged = local.filter(function (x) { return !ids[x.id]; }).concat((r[1].data || []).map(function (x) { return { id: x.id, household_no: x.household_no, at: x.at, result: x.result, memo: x.memo, tags: x.tags || [], promises: x.promises || [] }; }));
      set(K.log, merged.sort(function (a, b) { return a.at < b.at ? -1 : 1; }));
      if (r[2] && r[2].error) { if (/does not exist|42P01|schema cache|PGRST205/.test((r[2].error.code || "") + " " + (r[2].error.message || ""))) S.noDoc = true; }
      else if (r[2]) docsMerge(r[2].data, fresh);
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
    // S12-v U1: 지우고 다시 넣기 → unique(owner_id,round_ym,household_no)에 걸려 넣기만 실패하면 서버 계획이 비었다.
    //   upsert 로 바꿔 끼우고, 같은 차수에서 이번 계획에 없는 가구만 지운다
    if (op.t === "plan") job = (op.rows.length ? c.from("visit_plan").upsert(op.rows, { onConflict: "owner_id,round_ym,household_no" }) : Promise.resolve({})).then(function (r) {
      if (r && r.error) throw r.error;
      var keep = op.rows.map(function (x) { return '"' + String(x.household_no).replace(/[^A-Z0-9-]/g, "") + '"'; });
      var d = c.from("visit_plan").delete().eq("round_ym", op.round_ym);
      return keep.length ? d.not("household_no", "in", "(" + keep.join(",") + ")") : d; });
    else if (op.t === "log") job = c.from("visit_log").insert(op.row);
    else if (op.t === "unlog") job = c.from("visit_log").delete().eq("id", op.id); // S12-v U16(F4) 되돌리기·고치기
    else if ((op.t === "doc" || op.t === "undoc") && S.noDoc) job = Promise.resolve({}); // 서버 표 없음 — 이 기기 사본만(보낸 것으로 치고 대기열을 막지 않는다)
    else if (op.t === "doc") job = c.from("doc_edit").upsert([Object.assign({ owner_id: S.user.id }, op.row)], { onConflict: "owner_id,household_no,kind" });
    else if (op.t === "undoc") job = c.from("doc_edit").delete().eq("household_no", op.key.split("|")[0]).eq("kind", op.key.split("|")[1]);
    else if (op.t === "status") job = c.from("visit_plan").update({ status: op.status, updated_at: new Date().toISOString() }).eq("round_ym", op.round_ym).eq("household_no", op.household_no);
    else job = Promise.resolve({});
    return job.then(function (r) {
      // 이미 들어간 기록(같은 id, 23505)은 보낸 것으로 친다 — 끊겼다 다시 보낼 때 생긴다
      if (r && r.error && (op.t === "doc" || op.t === "undoc") && /does not exist|42P01|schema cache|PGRST205/.test((r.error.code || "") + " " + (r.error.message || ""))) { S.noDoc = true; r = {}; }
      if (r && r.error && !(op.t === "log" && r.error.code === "23505")) throw r.error;
      dropSent(op); S.at = new Date(); S.fails = 0; emit("sent");
      return flush1();
    }).catch(function (e) {
      // 84회차 ⑦: 영구 오류(권한 42501·제약 23xxx·형식 22xxx·없는 칸 42703·PGRST204)는 다시 보내도 같다 → «보내지 못한 기록»(failed)으로 옮기고 다음 것을 보낸다
      if (permanentErr(e)) {
        var fl = get(K.failed, []) || []; fl.push({ op: op, at: new Date().toISOString(), code: String(e.code || ""), msg: String(e.message || "").slice(0, 120) }); set(K.failed, fl.slice(-50));
        dropSent(op); S.fails = 0; S.lastErr = String(e.code || e.message || "").slice(0, 80);
        if (root.console) console.warn("[닿음 연동] 서버가 받지 않는 기록 — 보내지 못한 기록으로 옮김", e.code, e.message);
        emit("sent"); return flush1();
      }
      if (root.console) console.warn("[닿음 연동] 보내기 실패 — 이 기기에 남겨 둠", e && e.message);
      // S12-v U1: 맨 앞이 3번 넘게 실패하면 «막힘»으로 알린다(화면이 S.why === "stuck" 으로 안내)
      S.fails = (S.fails || 0) + 1; S.lastErr = String(e && (e.message || e.code) || "").slice(0, 80);
      mode("offline", S.fails >= 3 ? "stuck" : "send");
      retryLater(); });
  }
  function permanentErr(e) { var c = String(e && e.code || ""); return /^(42501|23\d{3}|22[0-9A-Z]{3}|42703|PGRST204)$/.test(c); }
  /** 일시 오류(네트워크·5xx·429)는 간격을 늘려 가며(4·8·16·32·60초) 다시 보낸다 — 실시간 채널이 살아 있을 때만 «연동됨»으로 되돌려 보낸다 */
  var retryT = null;
  function retryLater() {
    if (retryT) return;
    var ms = Math.min(60000, 2000 * Math.pow(2, Math.min(S.fails || 1, 5)));
    retryT = setTimeout(function () { retryT = null;
      if (S.user && S.ch && S.mode === "offline" && (S.why === "send" || S.why === "stuck") && queue().length) { mode("live"); flush(); } }, ms);
    if (retryT && retryT.unref) retryT.unref(); // 시험(node)에서 시계가 프로세스를 붙잡지 않게
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
      // S12-y: 문서 본문 표는 있을 때만 구독(없는 표를 구독하면 채널 전체가 오류로 떨어진다)
      if (!S.noDoc) ch = ch.on("postgres_changes", { event: "*", schema: "public", table: "doc_edit", filter: "owner_id=eq." + uid0 }, function () { later(pull); });
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
    state: function () { return { mode: S.mode, why: S.why, user: S.user ? { id: S.user.id, email: S.user.email, demo: api.isDemoUser(S.user) } : null, at: S.at, pending: queue().length, failed: (get(K.failed, []) || []).length, enabled: enabled(), fails: S.fails || 0, lastErr: S.lastErr || "" }; },
    on: function (f) { S.subs.push(f); },
    /** 68회차 S12-z4 팀 연동(shared/team_sync.js)이 같은 연결·같은 로그인으로 서버 함수·팀 채널을 쓰게 — 로그인 전이면 null */
    live: function () { return S.client && S.user && S.mode === "live" ? { client: S.client, uid: S.user.id } : null; },
    plan: plan, logs: logs, docs: docs,
    /** S12-y 문서 본문 직접 고침 저장 — 이 기기에 먼저 두고, 로그인·연결이면 같은 계정 PC·폰에 실시간(doc_edit). 끊김·로그인 전이면 쌓아 뒀다 보낸다.
     *  base = 고칠 때의 마지막 기록 id(기록이 바뀌면 «다시 만들기»). 본문도 메모처럼 가린 뒤에만(이름·연락처 등) */
    saveDoc: function (hid, kind, text, base) {
      var key = hid + "|" + kind, e = { text: mask(text || "").slice(0, 4000), at: new Date().toISOString(), base: String(base || "").slice(0, 64) };
      var all = docs(); all[key] = e; set(K.doc, all);
      if (!/^[A-Z]{1,3}-\d{1,5}$/.test(String(hid)) || !DOCK.test(String(kind))) { emit("data"); return Promise.resolve(e); } // 서버 칸 규칙 밖(가구번호 모양 등) — 이 기기에만
      set(K.queue, queue().filter(function (op) { return !((op.t === "doc" || op.t === "undoc") && op.key === key); })); enqueue(docOp(key, e));
      emit("data"); return flush().then(function () { return e; });
    },
    /** S12-y «다시 만들기» — 고친 본문을 버리고 기록 그대로로(같은 계정 다른 기기에서도) */
    dropDoc: function (hid, kind) {
      var key = hid + "|" + kind, all = docs(), had = all[key]; delete all[key]; set(K.doc, all);
      set(K.queue, queue().filter(function (op) { return !((op.t === "doc" || op.t === "undoc") && op.key === key); }));
      if (had && had.sv) enqueue({ t: "undoc", key: key }); // 한 번도 안 올린 것은 서버에 지울 것이 없다
      emit("data"); return flush().then(function () { return true; });
    },
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
    /** S12-v U24(1-5): o.wipe 이면 서버 로그아웃 뒤 이 기기의 닿음 저장분(daeum.* — 방문 기록·계획·명단 메타·보낼 줄 등)과 sessionStorage 를 지운다.
     *  서버에 못 닿아도(끊김) 이 기기 정리는 한다. 시연 데이터는 다음에 열 때 demo_seed.js 가 다시 깐다(daeum.demo.seededFor 도 지워지므로) */
    signOut: function (o) {
      o = o || {};
      var done = function () { setUser(null); if (o.wipe) api.wipeDevice(); };
      // 67회차 S12-z2: 이 기기만 로그아웃(scope local). 기본값(global)은 같은 계정의 다른 기기(PC↔폰, 같은 시연 번호를 쓰는 다른 심사위원)까지 모두 끊었다
      return client().then(function (c) { return c.auth.signOut({ scope: "local" }); }).then(done, function (e) { done(); if (!o.wipe) throw e; });
    },
    /** 62회차 «계정 지우기»: 서버 함수 daeum_delete_me(본인 JWT → 본인 방문 계획·결과 행 + auth 사용자 삭제, 시연 계정 거절)를 부른 뒤
     *  이 기기의 세션·닿음 저장분도 지운다. 서버가 거절하면(시연 계정·끊김) 아무것도 지우지 않고 오류를 그대로 던진다 */
    isDemoUser: function (u) { u = u || S.user; return !!u && ((u.app_metadata && String(u.app_metadata.daeum_demo) === "true") || /^daeum\.judge\d+@example\.com$/i.test(u.email || "")); },
    deleteAccount: function () {
      if (!S.user) return Promise.reject(new Error("로그인 뒤에 지울 수 있습니다"));
      if (api.isDemoUser(S.user)) return Promise.reject(new Error("시연 계정은 지울 수 없습니다(매일 새벽 처음 상태로 돌아갑니다)"));
      var res;
      return client().then(function (c) {
        return c.rpc("daeum_delete_me").then(function (r) {
          if (r.error) throw new Error(String(r.error.message || "서버가 거절했습니다").replace(/^daeum:\s*/, ""));
          res = r.data || {};
          // 서버에서 계정이 이미 없어졌으므로 이 기기 세션만 끊는다(전역 로그아웃 요청은 실패해도 무시)
          return c.auth.signOut({ scope: "local" }).catch(function () {});
        });
      }).then(function () { setUser(null); api.wipeDevice(); return res; });
    },
    /** 이 기기의 닿음 저장분 일괄 삭제 — 지운 키 개수 */
    wipeDevice: function () {
      var n = 0;
      [root.localStorage, root.sessionStorage].forEach(function (st) {
        try { if (!st) return; var ks = []; for (var i = 0; i < st.length; i++) ks.push(st.key(i));
          ks.forEach(function (k) { if (/^daeum[.-]/.test(k) || /^sb-.*-auth-token/.test(k)) { st.removeItem(k); n++; } }); } catch (e) { /* 저장소를 못 쓰면 그대로 */ }
      });
      return n;
    },
    /** 방문 계획 확정 — 이 기기에 저장하고 서버(로그인 시)에 같은 차수 행을 바꿔 끼운다 */
    savePlan: function (p) {
      p = JSON.parse(JSON.stringify(p)); delete p.seed; p.saved_at = new Date().toISOString(); set(K.plan, p);
      enqueue(planOp(p));
      emit("data"); return flush();
    },
    /** 방문 결과 저장 — 메모는 가린 뒤에만. 계획 행 상태도 함께 바꾼다 */
    addLog: function (row) {
      var r = { id: uid(), household_no: row.household_no, at: row.at || new Date().toISOString(), result: row.result, memo: mask(row.memo || "").slice(0, 1000),
        tags: (row.tags || []).slice(0, 12).map(function (x) { return mask(x).slice(0, 40); }) /* S12-v U22: 꼬리표도 같은 가림 */, promises: (row.promises || []).map(function (x) { return { text: mask(x.text).slice(0, 80), due: x.due || null, kind: x.kind || "" }; }).slice(0, 8), __local: true };
      var L = logs(); L.push(r); set(K.log, L);
      var p = plan(), st = r.result === "met" ? "done" : r.result === "absent" ? "absent" : r.result === "refuse" ? "refused" : null;
      if (p && st) { p.rows.forEach(function (x) { if (x.household_no === r.household_no) x.status = st; }); set(K.plan, p);
        // S12-v U2: 시연 계획(그날 시드)은 상태 한 줄만 바꾸면 서버엔 어제 계획이 남는다 → 계획 전체를 오늘 것으로 맞춘다
        enqueue(p.from_seed || p.seed ? planOp(p) : { t: "status", round_ym: p.round_ym, household_no: r.household_no, status: st }); }
      var send = Object.assign({}, r); delete send.__local;
      enqueue({ t: "log", row: send });
      emit("data"); return flush().then(function () { return r; });
    },
    /** S12-v U16(F4) 기록 빼기(«되돌리기 5초»·«기록 고치기») — 아직 안 보냈으면 대기열에서 빼고, 보냈으면 서버 행을 지운다(RLS 본인 행만).
     *  계획 행 상태는 그 가구의 남은 마지막 기록으로(없으면 방문 전) 되돌린다 */
    removeLog: function (id) {
      var L = logs(), r = L.filter(function (x) { return x.id === id; })[0]; if (!r) return Promise.resolve(false);
      set(K.log, L.filter(function (x) { return x.id !== id; }));
      var q = queue(), inQ = q.some(function (op) { return op.t === "log" && op.row && op.row.id === id; });
      if (inQ) set(K.queue, q.filter(function (op) { return !(op.t === "log" && op.row && op.row.id === id); }));
      else if (!r.seed) enqueue({ t: "unlog", id: id });
      var p = plan();
      if (p) {
        var rest = logs().filter(function (x) { return x.household_no === r.household_no; }).sort(function (a, b) { return a.at < b.at ? -1 : 1; }).pop();
        var st = rest ? (rest.result === "met" ? "done" : rest.result === "absent" ? "absent" : rest.result === "refuse" ? "refused" : "planned") : "planned";
        p.rows.forEach(function (x) { if (x.household_no === r.household_no) x.status = st; }); set(K.plan, p);
        enqueue(p.from_seed || p.seed ? planOp(p) : { t: "status", round_ym: p.round_ym, household_no: r.household_no, status: st });
      }
      emit("data"); return flush().then(function () { return true; });
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
