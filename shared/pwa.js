/* 닿음 PWA 공통(모든 화면) — ① /daeum/sw.js 등록 ② 옛 주민 창구 서비스워커 정리 ③ «홈 화면에 설치» 상태 판정.
   76회차부터 안내는 «더 보기 › 이 기기» 한 줄(app.js morePanel)에서만 — 이미 설치된 앱으로 열렸으면 숨긴다. */
(function () {
  var me = document.currentScript && document.currentScript.src;
  var root = me ? new URL("../", me) : new URL("./", location.href);
  var standalone = matchMedia("(display-mode: fullscreen), (display-mode: standalone), (display-mode: minimal-ui)").matches || navigator.standalone === true;
  if (standalone) document.documentElement.classList.add("pwa-app");

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.getRegistrations().then(function (rs) {
      rs.forEach(function (r) { if (/\/citizen\/$/.test(r.scope)) r.unregister(); });
    }).catch(function () {});
    navigator.serviceWorker.register(new URL("sw.js", root).href, { scope: root.pathname }).catch(function () {});
  }

  // 72회차 ④ 폰에서 띠가 안 보이던 원인: 앱(app.js)이 먼저 그리며 띠를 «오늘» 칸으로 옮기는데, 첫 화면이 «오늘»이 아니면(동선·현장 등 주소로 새로고침)
  //   띠가 문서에서 떼어진 채라 getElementById 가 null → 설치 안내가 아예 켜지지 않았다. 떼어 둔 원본(window.__daeumPwa)을 먼저 쓴다.
  //   안 보일 때 이유는 window.__daeumPwaWhy(standalone·hide7d·kakao·ios·prompt·android-manual·manual·installed)로 텍스트로 확인한다.
  var box = window.__daeumPwa || document.getElementById("pwa-install");
  var why = function (w) { window.__daeumPwaWhy = w; if (box) box.setAttribute("data-why", w); };
  if (!box) { window.__daeumPwaWhy = "no-box"; return; }
  if (standalone) { why("standalone"); return; }
  // 76회차(11-13 호창님 «홈화면에 설치 안내는 오늘탭에 넣지 말고 … 더보기 안에»): 띠(#pwa-install)는 화면에 붙이지 않고 상태만 판정한다.
  //   «더 보기 › 이 기기 › 홈 화면에 설치» 줄이 window.__daeumPwaApi 로 읽는다(설치 신호 있으면 바로 설치 · 없으면 브라우저별 안내 · 설치돼 있으면 숨김).
  //   옛 닫기(×) 7일 숨김(daeum-pwa-hide)은 띠가 없어졌으므로 판정에서 뺀다.
  var xb = box.querySelector("[data-pwa=x]"); if (xb) xb.addEventListener("click", function () { try { localStorage.setItem(HIDE, String(Date.now())); } catch (e) {} box.hidden = true; if (box.parentNode) box.parentNode.removeChild(box); window.__daeumPwa = null; });
  var btn = box.querySelector("[data-pwa=btn]"), ios = box.querySelector("[data-pwa=ios]");
  var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var deferred = null;
  // 카카오톡 인앱 브라우저는 설치(beforeinstallprompt·홈 화면 추가)를 막는다 → 초대장으로 들어오면 바깥 브라우저(크롬·사파리)로 넘긴다
  if (/KAKAOTALK/i.test(navigator.userAgent)) {
    var ext = function () { location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(location.href); };
    var kk = box.querySelector("[data-pwa=kakao]"), kb = box.querySelector("[data-pwa=ext]");
    why("kakao"); box.hidden = false; if (kk) kk.hidden = false;
    if (kb) kb.addEventListener("click", ext);
    ext();
    return;
  }
  if (isIOS) { why("ios"); box.hidden = false; if (ios) ios.hidden = false; }
  // 안드로이드에서 설치 신호가 늦거나 오지 않으면(삼성 인터넷 등) 메뉴로 추가하는 길을 알려 준다
  var and = box.querySelector("[data-pwa=and]");
  // 72회차 ④: 안드로이드가 아니어도 폰·태블릿(터치·좁은 화면)이면 같은 수동 안내 — 브라우저마다 설치 신호를 안 보내는 경우가 많다. 기다림 3초 → 1.5초
  // 73회차 🐞(e): 폴드를 펼친 크롬은 «데스크톱 사이트» 주소표(UA에 Android 없음·Linux x86_64)라 일반 안내가 떴다 →
  //   userAgentData(platform·mobile)·navigator.platform(Linux arm)·터치+굵은 포인터(Linux 데스크톱에 터치 화면은 드묾)로 안드로이드를 함께 판별
  var uad = navigator.userAgentData || null, plat = String(navigator.platform || ""), ua = navigator.userAgent || "";
  var coarse = false; try { coarse = matchMedia("(pointer: coarse)").matches; } catch (e) {}
  var isAnd = /Android/i.test(ua) || !!(uad && /Android/i.test(uad.platform || "")) || /Linux arm|Linux aarch|armv|aarch64/i.test(plat) ||
    (/Linux/i.test(plat + " " + ua) && !/CrOS/i.test(ua) && (navigator.maxTouchPoints || 0) > 1 && coarse);
  window.__daeumPwaAnd = isAnd;
  var gen = box.querySelector("[data-pwa=gen]"), touch = (navigator.maxTouchPoints || 0) > 0 && Math.min(screen.width || 9999, screen.height || 9999) < 900;
  if (!isIOS && (isAnd || touch)) setTimeout(function () { if (deferred || seen || installed) return; box.hidden = false; if (isAnd && and) { and.hidden = false; why("android-manual"); } else if (gen) { gen.hidden = false; why("manual"); } }, 1500);
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e;
    if (seen && !recent()) { try { localStorage.removeItem(KEY); } catch (e2) {} seen = null; installed = false; } // 설치 신호가 왔다 = 지금은 설치 안 됨(지웠음)
    if (seen) return; why("prompt"); box.hidden = false; if (btn) btn.hidden = false; if (and) and.hidden = true; if (gen) gen.hidden = true;
  });
  // 설치 진행·완료를 알려 주고, 한 번 설치한 폰에서는 단추를 다시 띄우지 않는다(여러 번 눌러 아이콘이 여러 개 생기던 문제)
  var msg = box.querySelector("[data-pwa=msg]"), KEY = "daeum-installed";
  var say = function (t) { why("installed"); box.hidden = false; if (btn) btn.hidden = true; if (and) and.hidden = true; if (gen) gen.hidden = true; if (msg) { msg.hidden = false; msg.textContent = t; } };
  var DONE = "설치 완료 — 이 창을 닫고 홈 화면의 «닿음» 아이콘으로 여세요. 전체 화면 앱으로 열립니다.";
  var seen = null; try { seen = localStorage.getItem(KEY); } catch (e) {}
  // 73회차 🐞(e): 이미 설치한 폰에서 크롬으로 열면 «설치 완료» 띠가 계속 떴다 → 설치 직후(10분 안)만 알려 주고, 그 뒤엔 띠를 아예 띄우지 않는다
  var installed = false, recent = function () { return seen && Date.now() - Number(seen) < 600000; };
  var hideInstalled = function () { installed = true; why("installed-hide"); box.hidden = true; };
  if (seen) { if (recent()) say(DONE); else hideInstalled(); }
  // 지운 뒤 다시 설치할 수 있게: 브라우저가 «설치 안 됨»이라고 하고 표시가 10분 넘게 묵었으면 표시를 지운다
  if (navigator.getInstalledRelatedApps) navigator.getInstalledRelatedApps().then(function (a) {
    if (a && a.length) { if (recent()) say(DONE); else hideInstalled(); }
    else if (seen && Date.now() - Number(seen) > 600000) { try { localStorage.removeItem(KEY); } catch (e) {} seen = null; installed = false; if (msg) msg.hidden = true; box.hidden = true; if (deferred) { box.hidden = false; btn.hidden = false; } }
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
  window.__daeumPwaApi = {
    hidden: function () { var w = window.__daeumPwaWhy; return standalone || installed || w === "installed-hide" || w === "standalone"; },
    can: function () { return !!deferred; },
    guide: function () {
      if (/KAKAOTALK/i.test(navigator.userAgent)) return "카카오톡 안에서는 설치가 안 됩니다 — 바깥 브라우저(크롬·사파리)로 연 뒤 설치하세요";
      if (isIOS) return "아이폰: 아래 공유 단추 → «홈 화면에 추가»";
      if (isAnd) return "안드로이드: 오른쪽 위 ⋮ 메뉴 → «홈 화면에 추가» 또는 «앱 설치»";
      if (touch) return "브라우저 메뉴(⋮ 또는 공유) → «홈 화면에 추가»";
      return "PC: 주소창 오른쪽 설치 아이콘(⊕) 또는 브라우저 메뉴 → «앱» → «이 사이트를 앱으로 설치»";
    },
    install: function () {
      if (!deferred) return Promise.resolve("none");
      var d = deferred; deferred = null; d.prompt();
      return d.userChoice.then(function (c) {
        if (c && c.outcome === "accepted") { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} installed = true; return "accepted"; }
        deferred = d; return "dismissed";
      }).catch(function () { deferred = d; return "error"; });
    }
  };
  window.addEventListener("appinstalled", function () { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} say(DONE); });
})();
