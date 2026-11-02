/* 닿음 도움 요청 저장소 — 국민 창구가 쓰고 공무원 창구가 읽는다.
   ① 같은 기기: localStorage(키: DAEUM_CONFIG.requestsKey = "daeum.requests")에 JSON 배열(형식 shared/README.md «도움 요청 형식»).
   ② 다른 기기(S11-c, 11-02 결정): 주민 폰이 보낸 신호를 닿음 전용 Supabase(daeum) 표 daeum_signal 에 «최소 정보»만 넣고,
      공무원 화면은 Realtime(웹소켓)으로 바로 받는다. 끊기면 5초마다 다시 읽기(폴링)로 대신한다.
      보내는 것: 신호 종류·읍면동·급함·필요 분야 꼬리표·짧은 번호. ⛔ 이름·연락처·주소·상황 글은 보내지 않는다.
      키는 공개용(publishable)만 — 넣기와 최근 2일 읽기만 된다(db/migration_signal.sql). */
(function () {
  "use strict";
  var C = window.DAEUM_CONFIG || {};
  var KEY = C.requestsKey || "daeum.requests", RKEY = KEY + ".remote";

  function readKey(k) {
    try {
      var v = JSON.parse(localStorage.getItem(k) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function writeKey(k, list) {
    try { localStorage.setItem(k, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function read() { return readKey(KEY); }
  function write(list) { return writeKey(KEY, list); }
  // 다른 기기에서 온 신호(이 기기에서 보낸 것과 번호가 같으면 뺀다)
  function all() {
    var local = read(), codes = {};
    local.forEach(function (r) { if (r && r.code) codes[r.code] = 1; });
    return local.concat(readKey(RKEY).filter(function (r) { return r && !codes[r.code]; }));
  }
  function pad(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }
  function nextId(list, now) {
    var day = now.getFullYear() + pad(now.getMonth() + 1, 2) + pad(now.getDate(), 2);
    var prefix = "REQ-" + day + "-";
    var max = 0;
    list.forEach(function (r) {
      if (r && typeof r.id === "string" && r.id.indexOf(prefix) === 0) max = Math.max(max, parseInt(r.id.slice(prefix.length), 10) || 0);
    });
    return prefix + pad(max + 1, 4);
  }
  // 짧은 번호(S-XXXX) — 사람 이름 대신 화면에 보이는 것
  function newCode() {
    var A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "", r = new Uint8Array(6);
    try { crypto.getRandomValues(r); } catch (e) { for (var i = 0; i < 6; i++) r[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < 6; j++) s += A.charAt(r[j] % A.length);
    return "S-" + s;
  }

  // ── 원격(Supabase daeum) ──
  var URL = C.signalUrl || "", PK = C.signalKey || "", TABLE = C.signalTable || "daeum_signal";
  var listeners = [], live = { mode: "off", since: null, ws: null, poll: null, hb: null, onNew: null, seen: {} };
  function fire() { var l = all(); listeners.forEach(function (fn) { try { fn(l); } catch (e) { /* 무시 */ } }); }
  function tagsOf(sub) {
    var t = sub && sub.tags; if (!t) return [];
    var a = Array.isArray(t) ? t : Object.keys(t).filter(function (k) { return t[k]; });
    return a.map(String).filter(function (x) { return /^[A-Za-z가-힣0-9_]{1,20}$/.test(x); }).slice(0, 6);
  }
  function minimal(rec) {
    return { code: rec.code, kind: rec.signal === "family" || rec.signal === "neighbor" ? rec.signal : "self",
      region: String(rec.region || ""), urgent: !!rec.urgent, tags: tagsOf(rec.subject) };
  }
  function send(rec) {
    if (!URL || !PK || !window.fetch) return Promise.resolve(false);
    if (!/^[가-힣]{2,6}[읍면동]$/.test(rec.region || "")) return Promise.resolve(false);
    return fetch(URL + "/rest/v1/" + TABLE, { method: "POST", headers: { apikey: PK, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(minimal(rec)) })
      .then(function (r) { return r.ok; }, function () { return false; });
  }
  function toRec(row) {
    var kind = row.kind === "family" || row.kind === "neighbor" ? row.kind : "self";
    return { v: 1, id: row.code, code: row.code, remote: true, signal: kind, region: row.region, urgent: !!row.urgent,
      place: "", displayName: "", contactPref: "visit", situation: "", summary: "", matched: [], householdId: null,
      proxy: { isProxy: kind !== "self", relation: kind === "family" ? "가족" : kind === "neighbor" ? "이웃" : "" },
      subject: { tags: row.tags || [] }, createdAt: row.created_at, status: "new",
      history: [{ at: row.created_at, status: "new", by: "citizen" }] };
  }
  /** 받은 행들을 원격 보관함에 합친다. 새로 온 것만 돌려준다 */
  function merge(rows) {
    var cache = readKey(RKEY), have = {}, fresh = [];
    cache.forEach(function (r) { have[r.code] = 1; });
    rows.forEach(function (row) {
      if (!row || !row.code || have[row.code]) return;
      have[row.code] = 1; var rec = toRec(row); cache.push(rec); fresh.push(rec);
    });
    // 2일 지난 것은 지운다(표도 2일까지만 읽힌다)
    var cut = Date.now() - 2 * 864e5;
    cache = cache.filter(function (r) { return Date.parse(r.createdAt) > cut; });
    if (fresh.length) writeKey(RKEY, cache);
    return fresh;
  }
  function pull(silent) {
    var q = "?select=code,kind,region,urgent,tags,created_at&order=created_at.desc&limit=50";
    return fetch(URL + "/rest/v1/" + TABLE + q, { headers: { apikey: PK } })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (rows) { var f = merge(rows.reverse()); if (f.length) { fire(); if (live.onNew && !silent && live.primed) f.forEach(function (x) { live.onNew(x); }); } live.primed = true; return true; });
  }
  function setMode(m) { live.mode = m; try { document.dispatchEvent(new CustomEvent("daeum:signal-mode", { detail: { mode: m } })); } catch (e) { /* 구형 */ } }
  function startPoll() {
    if (live.poll) return; setMode("poll");
    live.poll = setInterval(function () { pull().catch(function () { setMode("poll-fail"); }); }, 5000);
  }
  function stopPoll() { if (live.poll) { clearInterval(live.poll); live.poll = null; } }
  function connect() {
    if (!window.WebSocket) { startPoll(); return; }
    var wsUrl = URL.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(PK) + "&vsn=1.0.0", ref = 1, ok = false;
    var ws; try { ws = new WebSocket(wsUrl); } catch (e) { startPoll(); return; }
    live.ws = ws;
    var giveUp = setTimeout(function () { if (!ok) { try { ws.close(); } catch (e) { /* 무시 */ } } }, 8000);
    ws.onopen = function () {
      ws.send(JSON.stringify({ topic: "realtime:daeum-signal", event: "phx_join", ref: String(ref++), join_ref: "1",
        payload: { config: { broadcast: { self: false }, presence: { key: "" }, postgres_changes: [{ event: "INSERT", schema: "public", table: TABLE }] }, access_token: PK } }));
      live.hb = setInterval(function () { try { ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(ref++) })); } catch (e) { /* 무시 */ } }, 25000);
    };
    ws.onmessage = function (e) {
      var m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.event === "system" && m.payload && m.payload.status === "ok" && m.payload.extension === "postgres_changes") {
        ok = true; clearTimeout(giveUp); stopPoll(); setMode("live"); pull().catch(function () { /* 다음에 */ });
      } else if (m.event === "postgres_changes" && m.payload && m.payload.data && m.payload.data.record) {
        var f = merge([m.payload.data.record]); if (f.length) { fire(); if (live.onNew) f.forEach(function (x) { live.onNew(x); }); }
      } else if (m.event === "phx_reply" && m.payload && m.payload.status === "error") { try { ws.close(); } catch (x) { /* 무시 */ } }
    };
    ws.onclose = function () {
      clearTimeout(giveUp); if (live.hb) { clearInterval(live.hb); live.hb = null; } live.ws = null;
      startPoll(); // 실시간이 끊기면 폴링으로 대신하고, 20초 뒤 다시 실시간을 시도한다
      setTimeout(function () { if (!live.ws) connect(); }, 20000);
    };
    ws.onerror = function () { /* onclose 가 뒤따른다 */ };
  }

  window.DaeumRequests = {
    key: KEY,
    list: all,
    get: function (id) { return all().filter(function (r) { return r.id === id; })[0] || null; },
    /** 새 요청 저장. 성공하면 저장된 객체(id·code·createdAt·status 채움, sync = 원격 전송 Promise<bool>), 실패하면 null */
    add: function (req) {
      var list = read();
      var now = new Date();
      var rec = Object.assign({ v: 1 }, req, { id: nextId(list, now), code: newCode(), createdAt: now.toISOString(), status: "new", history: [{ at: now.toISOString(), status: "new", by: "citizen" }] });
      list.push(rec);
      if (!write(list)) return null;
      Object.defineProperty(rec, "sync", { value: send(rec), enumerable: false });
      return rec;
    },
    /** 상태 변경(공무원 창구용): status ∈ new|seen|visiting|done|cancelled */
    setStatus: function (id, status, by, note) {
      function upd(k) {
        var list = readKey(k), hit = null;
        list.forEach(function (r) {
          if (r.id === id) {
            r.status = status;
            (r.history = r.history || []).push({ at: new Date().toISOString(), status: status, by: by || "officer", note: note || "" });
            hit = r;
          }
        });
        return hit && writeKey(k, list) ? hit : null;
      }
      return upd(KEY) || upd(RKEY);
    },
    /** 다른 탭에서 바뀌거나 다른 기기 신호가 오면 알려 준다(공무원 창구 실시간 반영용). 해제 함수 반환 */
    onChange: function (fn) {
      function h(e) { if (e.key === KEY || e.key === RKEY) fn(all()); }
      window.addEventListener("storage", h);
      listeners.push(fn);
      return function () { window.removeEventListener("storage", h); listeners = listeners.filter(function (x) { return x !== fn; }); };
    },
    /** 공무원 화면: 다른 기기 신호 받기 시작. onNew(rec) 는 새 신호마다. 반환: 현재 방식(live|poll|off) */
    live: function (onNew) {
      live.onNew = onNew || null;
      if (!URL || !PK || !window.fetch) { setMode("off"); return "off"; }
      if (live.ws || live.poll) return live.mode;
      pull(true).catch(function () { /* 첫 읽기 실패 — 실시간·폴링이 이어 받는다 */ });
      connect();
      return live.mode;
    },
    liveMode: function () { return live.mode; }
  };
})();
