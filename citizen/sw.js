/* 옛 주민 창구 서비스워커(범위 /daeum/citizen/) — 2026-10-30 PWA 정리로 은퇴.
   이제 /daeum/sw.js 하나만 쓴다. 이미 설치된 폰에서는 이 파일로 갱신되며 옛 캐시를 지우고 스스로 등록을 푼다.
   (deploy_daeum.py 의 CACHE 이름 바꾸기는 해당 줄이 없어 그냥 지나간다) */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("daeum-citizen-")).map((k) => caches.delete(k))))
    .then(() => self.registration.unregister()));
});
