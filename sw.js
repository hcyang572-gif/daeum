/* 닿음 서비스워커(범위 /daeum/) — 폰 «홈 화면에 설치» 조건용 최소본.
   ⭐ 모든 요청 network-first: 새 배포가 언제나 바로 보이고, 끊겼을 때만 마지막으로 받은 사본을 쓴다.
   다른 도메인(Supabase·글꼴 CDN 등)은 건드리지 않는다. 옛 citizen/sw.js 캐시는 여기서 지운다. */
const CACHE = "daeum-v1";
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
