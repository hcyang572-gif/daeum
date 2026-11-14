/* 닿음 웹 푸시 화면 쪽(101회차 ⚙️ 파로-서버B) — 권한 요청·구독·해지·보내기 요청 API만. 화면 연결(단추·안내 문구)은 ⑧-3 에서.
   window.DaeumPush
     .supported()       → 이 브라우저가 웹 푸시를 받을 수 있나(서비스워커·PushManager·Notification)
     .needsInstall()    → 아이폰·아이패드인데 홈 화면 앱으로 연 게 아님(iOS 는 «홈 화면에 추가»한 앱에서만 푸시가 된다)
     .state()           → Promise<"unsupported"|"install"|"denied"|"off"|"on">
     .enable()          → (반드시 단추 누름 안에서) 권한 묻기 → 구독 → 서버 저장. Promise<{ok, why?}>
     .disable()         → 구독 해지 + 서버에서 지우기. Promise<{ok}>
     .send(kind)        → kind "help"(동료 도움 요청) · "report"(팀장에게 «오늘 복명서 준비됨») · "test"(이 기기로 시험). Promise<{ok, sent?, why?}>
                          받는 사람은 서버가 팀 짝(수락된 것)으로 정한다 — 화면이 고르지 않는다.
     .onOpen(fn)        → 알림을 눌러 이미 열린 창으로 돌아왔을 때 fn({k, u}) (u = "#team" 같은 해시)
     .setToken(fn)      → 로그인 토큰 꺼내는 함수 바꾸기(기본: supabase-js 저장소 «daeum.auth»의 access_token)
   ⛔ VAPID 비밀키는 여기 없다(서버 비밀 VAPID_PRIVATE). 아래 공개키는 서버 비밀 VAPID_PUBLIC 과 같아야 한다. */
(function (root) {
  "use strict";
  var PUBLIC_KEY = "BH9Y4sUFgifk59alOfqMat5UhIUWGPCn3rK44CpIVQ_BtG3T11Avk0RJRouzXuGWlj8g25pFvLnEQTbmsA2Nb1M";
  var C = root.DAEUM_CONFIG || {};
  function endpoint() {
    if (C.pushEndpoint) return C.pushEndpoint;
    return C.syncUrl ? String(C.syncUrl).replace(/\/+$/, "") + "/functions/v1/daeum-push" : "";
  }
  var nav = root.navigator || {};
  var tokenFn = function () {
    try {
      var s = JSON.parse(root.localStorage.getItem("daeum.auth") || "null");
      if (s && s.access_token) return s.access_token;
      if (s && s.currentSession && s.currentSession.access_token) return s.currentSession.access_token;
    } catch (e) { /* 저장소 막힘 */ }
    return "";
  };

  function keyBytes(b64u) {
    var p = b64u.replace(/-/g, "+").replace(/_/g, "/"); p += "===".slice((p.length + 3) % 4);
    var bin = root.atob(p), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function supported() { return !!(nav.serviceWorker && root.PushManager && root.Notification); }
  function isIOS() { return /iPhone|iPad|iPod/.test(nav.userAgent || "") || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1); }
  function standalone() {
    try { return nav.standalone === true || !!(root.matchMedia && root.matchMedia("(display-mode: standalone)").matches); } catch (e) { return false; }
  }
  function needsInstall() { return isIOS() && !standalone(); }
  function reg() { return nav.serviceWorker.ready; }

  function call(body) {
    var url = endpoint(), tok = tokenFn();
    if (!url) return Promise.resolve({ ok: false, why: "no-endpoint" });
    if (!tok && body.op !== "key") return Promise.resolve({ ok: false, why: "login" });
    var h = { "Content-Type": "application/json" };
    if (tok) h.Authorization = "Bearer " + tok;
    return root.fetch(url, { method: "POST", headers: h, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, why: "http-" + r.status }; }); })
      .catch(function () { return { ok: false, why: "network" }; });
  }

  function state() {
    if (!supported()) return Promise.resolve(needsInstall() ? "install" : "unsupported");
    if (root.Notification.permission === "denied") return Promise.resolve("denied");
    return reg().then(function (r) { return r.pushManager.getSubscription(); })
      .then(function (s) { return s && root.Notification.permission === "granted" ? "on" : "off"; })
      .catch(function () { return "off"; });
  }

  function saveSub(s) {
    return call({ op: "sub", sub: s.toJSON ? s.toJSON() : s, ua: (nav.userAgent || "").replace(/^Mozilla\/5\.0 /, "").slice(0, 60) });
  }

  function enable() {
    if (!supported()) return Promise.resolve({ ok: false, why: needsInstall() ? "install" : "unsupported" });
    if (!tokenFn()) return Promise.resolve({ ok: false, why: "login" });
    var ask = root.Notification.permission === "granted" ? Promise.resolve("granted") : Promise.resolve(root.Notification.requestPermission());
    return ask.then(function (p) {
      if (p !== "granted") return { ok: false, why: p === "denied" ? "denied" : "dismissed" };
      return reg().then(function (r) {
        return r.pushManager.getSubscription().then(function (old) {
          // 예전 공개키로 만든 구독이면 갈아 끼운다(서버 키와 다르면 받을 수 없다)
          var ok = old && old.options && old.options.applicationServerKey;
          if (old && ok) {
            var a = new Uint8Array(old.options.applicationServerKey), b = keyBytes(PUBLIC_KEY), same = a.length === b.length;
            for (var i = 0; same && i < a.length; i++) if (a[i] !== b[i]) same = false;
            if (same) return old;
            return old.unsubscribe().then(function () { return null; });
          }
          return old;
        }).then(function (s) {
          return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) });
        });
      }).then(saveSub);
    }).catch(function (e) { return { ok: false, why: "subscribe:" + (e && e.name || "error") }; });
  }

  function disable() {
    if (!supported()) return Promise.resolve({ ok: true });
    return reg().then(function (r) { return r.pushManager.getSubscription(); }).then(function (s) {
      if (!s) return { ok: true };
      var ep = s.endpoint;
      return s.unsubscribe().catch(function () {}).then(function () { return call({ op: "unsub", endpoint: ep }); })
        .then(function () { return { ok: true }; });
    }).catch(function () { return { ok: false, why: "error" }; });
  }

  function send(kind) {
    if (["help", "report", "test"].indexOf(kind) < 0) return Promise.resolve({ ok: false, why: "kind" });
    return call({ op: "send", kind: kind });
  }

  var openFns = [];
  if (nav.serviceWorker && nav.serviceWorker.addEventListener) {
    nav.serviceWorker.addEventListener("message", function (e) {
      var d = e && e.data || {};
      if (d.type === "daeum-push") openFns.forEach(function (f) { try { f({ k: d.k, u: d.u }); } catch (x) { /* 화면 쪽 오류 무시 */ } });
      else if (d.type === "daeum-push-resub" && root.Notification && root.Notification.permission === "granted") enable();
    });
  }

  root.DaeumPush = {
    publicKey: PUBLIC_KEY, endpoint: endpoint, supported: supported, needsInstall: needsInstall, state: state,
    enable: enable, disable: disable, send: send,
    onOpen: function (fn) { if (typeof fn === "function") openFns.push(fn); },
    setToken: function (fn) { if (typeof fn === "function") tokenFn = fn; }
  };
})(typeof window !== "undefined" ? window : this);
