/* 닿음 국민 창구 서비스워커 — 상주시 정책플랫폼 sw.js 교훈을 줄여 옮김:
   ① 문서(navigate)·데이터(.json)는 network-first(실패 시 캐시) — 옛 화면·옛 목록이 남지 않게
   ② 나머지 정적 자원은 cache-first, 프리캐시는 1회용 쿼리로 HTTP 캐시를 우회해 받는다
   ⚠ 파일을 바꾸면 CACHE 이름을 올린다. */
const CACHE = "daeum-citizen-7cd6049dd3";
const ASSETS = ["./", "index.html", "citizen.css", "app.js", "progress.js", "manifest.json", "data/services.sample.json", "data/services.sample.js",
  "../shared/tokens.css", "../shared/config.js", "../shared/ai.js", "../shared/requests.js", "../shared/netguard.js", "../shared/ui.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) => {
    const url = new URL(u, self.registration.scope);
    const bust = new URL(url); bust.searchParams.set("swcb", Date.now());
    return fetch(bust, { cache: "no-store" }).then((r) => r.ok && c.put(url, r)).catch(() => {});
  }))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("daeum-citizen-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const fresh = req.mode === "navigate" || req.url.endsWith(".json");
  if (fresh) {
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true })));
  } else {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
  }
});
