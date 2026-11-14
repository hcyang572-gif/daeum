/* 닿음 서비스워커(범위 /daeum/) — 폰 «홈 화면에 설치» 조건용 최소본.
   ⭐ 모든 요청 network-first: 새 배포가 언제나 바로 보이고, 끊겼을 때만 마지막으로 받은 사본을 쓴다.
   다른 도메인(Supabase·글꼴 CDN 등)은 건드리지 않는다. 옛 citizen/sw.js 캐시는 여기서 지운다. */
const CACHE = "daeum-9b6c69be14";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req, { cache: "no-cache" }).then((r) => {
    if (r.ok && r.type === "basic") { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
    return r;
  }).catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then((hit) => hit || Response.error())));
});

/* 101회차 ⚙️ 파로-서버B 웹 푸시 — 앱이 닫혀 있어도 동료 도움 요청·방문 시간 넘김·팀장 «오늘 복명서 준비됨».
   서버(daeum-push)가 보내는 본문: {k:종류, t:제목, b:내용, u:누르면 열 화면(해시), tag}. 가구 실명·주소·위치는 실려 오지 않는다.
   누르면: 열린 닿음 창이 있으면 그 창을 앞으로 + 화면에 {type:"daeum-push", k, u} 전달(화면이 해당 탭을 연다), 없으면 새 창으로 연다. */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { t: "닿음", b: e.data ? e.data.text() : "" }; }
  const icon = new URL("shared/icons/icon-192.png", self.registration.scope).href;
  const urgent = d.k === "help" || d.k === "over1" || d.k === "over2";
  e.waitUntil(self.registration.showNotification(d.t || "닿음", {
    body: d.b || "", icon, badge: icon, tag: d.tag || d.k || "daeum", renotify: true, requireInteraction: urgent,
    vibrate: urgent ? [200, 100, 200] : undefined, data: { k: d.k || "", u: typeof d.u === "string" && /^#[\w:-]{0,40}$/.test(d.u) ? d.u : "" }
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const dd = e.notification.data || {};
  const target = new URL(self.registration.scope);
  target.hash = dd.u || "";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs.find((w) => w.url.indexOf(self.registration.scope) === 0);
    if (c) {
      c.postMessage({ type: "daeum-push", k: dd.k, u: dd.u });
      return c.focus().catch(() => {}).then(() => c);
    }
    return self.clients.openWindow ? self.clients.openWindow(target.href) : null;
  }));
});
// 브라우저가 구독을 갈아 끼우면(만료·키 교체) 새 구독을 서버에 다시 알린다 — 로그인 토큰은 열린 화면이 가진다 → 화면에 맡긴다
self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => cs.forEach((c) => c.postMessage({ type: "daeum-push-resub" }))));
});
