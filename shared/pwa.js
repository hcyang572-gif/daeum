/* 닿음 PWA 공통(모든 화면) — ① /daeum/sw.js 등록 ② 옛 주민 창구 서비스워커 정리 ③ 첫 화면 «홈 화면에 설치» 안내.
   설치 안내는 #pwa-install 이 있는 화면(첫 화면)에서만 보이고, 이미 설치된 앱으로 열렸으면 숨긴다. */
(function () {
  var me = document.currentScript && document.currentScript.src;
  var root = me ? new URL("../", me) : new URL("./", location.href);
  var standalone = matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches || navigator.standalone === true;
  if (standalone) document.documentElement.classList.add("pwa-app");

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.getRegistrations().then(function (rs) {
      rs.forEach(function (r) { if (/\/citizen\/$/.test(r.scope)) r.unregister(); });
    }).catch(function () {});
    navigator.serviceWorker.register(new URL("sw.js", root).href, { scope: root.pathname }).catch(function () {});
  }

  var box = document.getElementById("pwa-install");
  if (!box || standalone) return;
  var btn = box.querySelector("[data-pwa=btn]"), ios = box.querySelector("[data-pwa=ios]");
  var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var deferred = null;
  // 카카오톡 인앱 브라우저는 설치(beforeinstallprompt·홈 화면 추가)를 막는다 → 초대장으로 들어오면 바깥 브라우저(크롬·사파리)로 넘긴다
  if (/KAKAOTALK/i.test(navigator.userAgent)) {
    var ext = function () { location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(location.href); };
    var kk = box.querySelector("[data-pwa=kakao]"), kb = box.querySelector("[data-pwa=ext]");
    box.hidden = false; if (kk) kk.hidden = false;
    if (kb) kb.addEventListener("click", ext);
    ext();
    return;
  }
  if (isIOS) { box.hidden = false; if (ios) ios.hidden = false; }
  // 안드로이드에서 설치 신호가 늦거나 오지 않으면(삼성 인터넷 등) 메뉴로 추가하는 길을 알려 준다
  var and = box.querySelector("[data-pwa=and]");
  if (/Android/i.test(navigator.userAgent) && and) setTimeout(function () { if (!deferred) { box.hidden = false; and.hidden = false; } }, 3000);
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e; box.hidden = false; if (btn) btn.hidden = false; if (and) and.hidden = true;
  });
  if (btn) btn.addEventListener("click", function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function () { deferred = null; box.hidden = true; }).catch(function () {});
  });
  window.addEventListener("appinstalled", function () { box.hidden = true; });
})();
