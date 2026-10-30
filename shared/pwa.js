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
  if (/Android/i.test(navigator.userAgent) && and) setTimeout(function () { if (!deferred && !seen) { box.hidden = false; and.hidden = false; } }, 3000);
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e; if (seen) return; box.hidden = false; if (btn) btn.hidden = false; if (and) and.hidden = true;
  });
  // 설치 진행·완료를 알려 주고, 한 번 설치한 폰에서는 단추를 다시 띄우지 않는다(여러 번 눌러 아이콘이 여러 개 생기던 문제)
  var msg = box.querySelector("[data-pwa=msg]"), KEY = "daeum-installed";
  var say = function (t) { box.hidden = false; if (btn) btn.hidden = true; if (and) and.hidden = true; if (msg) { msg.hidden = false; msg.textContent = t; } };
  var DONE = "설치 완료 — 이 창을 닫고 홈 화면의 «닿음» 아이콘으로 여세요. 전체 화면 앱으로 열립니다.";
  var seen = null; try { seen = localStorage.getItem(KEY); } catch (e) {}
  if (seen) say(DONE);
  // 지운 뒤 다시 설치할 수 있게: 브라우저가 «설치 안 됨»이라고 하고 표시가 10분 넘게 묵었으면 표시를 지운다
  if (navigator.getInstalledRelatedApps) navigator.getInstalledRelatedApps().then(function (a) {
    if (a && a.length) say(DONE);
    else if (seen && Date.now() - Number(seen) > 600000) { try { localStorage.removeItem(KEY); } catch (e) {} seen = null; if (msg) msg.hidden = true; box.hidden = true; if (deferred) { box.hidden = false; btn.hidden = false; } }
  }).catch(function () {});
  if (btn) btn.addEventListener("click", function () {
    if (!deferred) return;
    var d = deferred; deferred = null; btn.hidden = true;
    d.prompt();
    d.userChoice.then(function (c) {
      if (c && c.outcome === "accepted") {
        try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
        say("설치하는 중입니다 — 홈 화면에 «닿음» 아이콘이 생길 때까지 잠시(수십 초) 기다려 주세요. 다시 누르지 않아도 됩니다.");
      } else { btn.hidden = false; deferred = d; }
    }).catch(function () {});
  });
  window.addEventListener("appinstalled", function () { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} say(DONE); });
})();
