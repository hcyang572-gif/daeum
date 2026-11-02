/* 닿음 PC↔폰 연동 시험(⚙️ 파로, 2026-11-03 실기기 교착 수정). 실행: node shared/sync.test.js (03_시제품 에서). 네트워크 0 — 가짜 supabase.
   ① 인증 이벤트 안에서 서버를 바로 부르지 않음(교착 원인) ② 세션 읽기가 멈춰도 저장된 세션으로 붙음
   ③ 초기 세션 + 인증 이벤트가 겹쳐도 채널은 1개 ④ 보내기는 한 번에 하나(중복 넣기 0) ⑤ 같은 id 중복(23505)은 보낸 것으로
   ⑥ 실시간 알림 → 다시 읽음 ⑦ 탭 안 잠금 = 다른 탭과 공유하지 않음 */
"use strict";
var fs = require("fs"), path = require("path"), assert = require("assert");
var ROOT = path.join(__dirname, "..");
var pass = 0, fail = 0, q = [];
function t(name, fn) { q.push([name, fn]); }
var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

function boot(opt) {
  opt = opt || {};
  var store = {}, calls = [], channels = [], authCb = null, inAuthCb = false, sub = null;
  var g = {};
  g.localStorage = { getItem: function (k) { return k in store ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); } };
  g.console = { warn: function () {} };
  g.crypto = { randomUUID: function () { return "u-" + Math.random().toString(16).slice(2); } };
  g.addEventListener = function () {};
  g.document = { addEventListener: function () {}, visibilityState: "visible" };
  g.DAEUM_CONFIG = { syncUrl: "https://gicjzrxgktpovnphtjhi.supabase.co", syncKey: "sb_publishable_test", syncSessionWaitMs: 80 };
  var user = { id: "U1", email: "t@x" };
  if (opt.stored) store["daeum.auth"] = JSON.stringify({ user: user, expires_at: Math.floor(Date.now() / 1000) + 3600 });
  var serverLogs = opt.serverLogs || [];
  function q(table) {
    var b = { _t: table, _op: "select" };
    b.select = function () { return b; }; b.gte = function () { return b; }; b.order = function () { return b; }; b.eq = function () { return b; };
    b.delete = function () { b._op = "delete"; return b; };
    b.update = function () { b._op = "update"; return b; };
    b.insert = function (row) { b._op = "insert"; b._row = row; return b; };
    b.then = function (ok, no) {
      if (inAuthCb) calls.push("IN-AUTH-CALLBACK");
      calls.push(b._op + ":" + b._t);
      var res = { data: b._op === "select" ? (b._t === "visit_log" ? serverLogs : []) : null, error: null };
      if (b._op === "insert" && b._t === "visit_log" && opt.dup) res = { error: { code: "23505", message: "duplicate" } };
      return new Promise(function (r) { setTimeout(function () { r(res); }, 5); }).then(ok, no);
    };
    return b;
  }
  var lockSeen = null;
  g.supabase = { createClient: function (u, k, o) {
    lockSeen = o.auth.lock;
    return {
      auth: {
        onAuthStateChange: function (cb) { authCb = function (ev, s) { inAuthCb = true; try { cb(ev, s); } finally { inAuthCb = false; } }; if (opt.initialEvent) setTimeout(function () { authCb("INITIAL_SESSION", { user: user }); }, 1); },
        getSession: function () { return opt.hangSession ? new Promise(function () {}) : Promise.resolve({ data: { session: opt.loggedIn ? { user: user } : null } }); },
        signInWithPassword: function () { setTimeout(function () { authCb("SIGNED_IN", { user: user }); }, 1); return Promise.resolve({ data: { session: { user: user } } }); },
        signOut: function () { return Promise.resolve({}); }
      },
      from: q,
      channel: function (name) { var ch = { name: name, h: [] }; ch.on = function (a, f, cb) { ch.h.push(cb); return ch; }; ch.subscribe = function (cb) { sub = cb; setTimeout(function () { cb("SUBSCRIBED"); }, 2); return ch; }; channels.push(ch); return ch; },
      removeChannel: function (ch) { ch.removed = true; }
    };
  } };
  var code = fs.readFileSync(path.join(ROOT, "shared/sync.js"), "utf8");
  new Function("window", "globalThis", "setTimeout", code.replace(/\(typeof window !== "undefined" \? window : globalThis\)/, "(window)"))(g, g, setTimeout);
  return { S: g.DaeumSync, calls: calls, channels: channels, store: store, auth: function (ev, s) { authCb(ev, s); }, lock: function () { return lockSeen; }, user: user, g: g };
}

t("인증 이벤트 안에서 서버를 부르지 않음(교착 원인 제거)", async function () {
  var b = boot({ loggedIn: false }); await b.S.init(); await wait(20);
  b.auth("SIGNED_IN", { user: b.user }); await wait(60);
  assert.ok(b.calls.indexOf("IN-AUTH-CALLBACK") < 0, b.calls.join(","));
  assert.ok(b.calls.indexOf("select:visit_log") >= 0, "미룬 뒤에는 읽음");
  assert.strictEqual(b.S.state().mode, "live");
});
t("세션 읽기가 멈춰도(다른 탭 잠금) 저장된 세션으로 붙음 — «로그인 전»으로 떨어지지 않음", async function () {
  var b = boot({ hangSession: true, stored: true }); b.S.init(); await wait(200);
  assert.strictEqual(b.S.state().user && b.S.state().user.id, "U1"); assert.strictEqual(b.S.state().mode, "live");
});
t("초기 세션 + INITIAL_SESSION 이벤트가 겹쳐도 채널 1개", async function () {
  var b = boot({ loggedIn: true, initialEvent: true }); await b.S.init(); await wait(80);
  assert.strictEqual(b.channels.filter(function (c) { return !c.removed; }).length, 1, "열린 채널 " + b.channels.length);
});
t("보내기는 한 번에 하나 — 저장 2번을 겹쳐 불러도 같은 기록을 두 번 넣지 않음", async function () {
  var b = boot({ loggedIn: true }); await b.S.init(); await wait(60);
  b.S.addLog({ household_no: "A-001", result: "absent", memo: "a" }); b.S.addLog({ household_no: "A-002", result: "absent", memo: "b" }); await wait(150);
  assert.strictEqual(b.calls.filter(function (c) { return c === "insert:visit_log"; }).length, 2, b.calls.join(","));
  assert.strictEqual(b.S.state().pending, 0); assert.strictEqual(b.S.state().mode, "live");
});
t("같은 id 가 이미 서버에 있으면(23505) 보낸 것으로 — «보낼 것 N»에 갇히지 않음", async function () {
  var b = boot({ loggedIn: true, dup: true }); await b.S.init(); await wait(60);
  await b.S.addLog({ household_no: "A-001", result: "met", memo: "x" }); await wait(60);
  assert.strictEqual(b.S.state().pending, 0); assert.strictEqual(b.S.state().mode, "live");
});
t("로그인 전에 쌓은 것은 붙자마자 자동으로 보냄", async function () {
  var b = boot({ loggedIn: false }); await b.S.init(); await wait(20);
  await b.S.addLog({ household_no: "B-015", result: "met", memo: "로그인 전" }); assert.ok(b.S.state().pending >= 1);
  b.auth("SIGNED_IN", { user: b.user }); await wait(150);
  assert.strictEqual(b.S.state().pending, 0, "남은 것 " + b.S.state().pending);
});
t("실시간 알림 → 새로고침 없이 다시 읽음", async function () {
  var b = boot({ loggedIn: true }); await b.S.init(); await wait(60);
  var n0 = b.calls.filter(function (c) { return c === "select:visit_log"; }).length;
  var ch = b.channels[b.channels.length - 1]; ch.h[1]({}); await wait(40);
  assert.ok(b.calls.filter(function (c) { return c === "select:visit_log"; }).length > n0);
});
t("인증 잠금은 이 탭 안에서만(다른 탭과 navigator.locks 공유 안 함) · 차례대로 실행", async function () {
  var b = boot({ loggedIn: true }); await b.S.init();
  var L = b.lock(); assert.strictEqual(typeof L, "function");
  var order = []; var a = L("x", -1, function () { return wait(20).then(function () { order.push(1); }); }); var c = L("x", -1, function () { order.push(2); });
  await Promise.all([a, c]); assert.deepStrictEqual(order, [1, 2]);
  var src = fs.readFileSync(path.join(ROOT, "shared/sync.js"), "utf8"); assert.ok(!/navigator\.locks/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "")));
});
t("⛔ 상주 정책플랫폼 서버 주소는 거부(GUARD 유지)", function () {
  var src = fs.readFileSync(path.join(ROOT, "shared/sync.js"), "utf8"); assert.ok(/GUARD = \/gicjzrxgktpovnphtjhi\\\.supabase\\\.co\$\//.test(src));
});
t("⑤ «더 보기» 단추 44px 이상 · ⑥ 길안내에서 돌아오면 ⑥으로", function () {
  var fl = fs.readFileSync(path.join(ROOT, "officer/flow.js"), "utf8");
  assert.ok(/data-act="moreq" style="min-height:44px"/.test(fl));
  assert.ok(/sessionStorage\.setItem\(NAVBACK/.test(fl) && /if \(!navBack\(\)\) render\(\)/.test(fl) && /pageshow/.test(fl));
});

(async function () {
  for (var i = 0; i < q.length; i++) {
    try { await q[i][1](); pass++; console.log("  통과 " + q[i][0]); } catch (e) { fail++; console.log("  실패 " + q[i][0] + " — " + e.message); }
  }
  console.log("\n연동 시험: 통과 " + pass + " · 실패 " + fail);
  process.exitCode = fail ? 1 : 0;
})();
