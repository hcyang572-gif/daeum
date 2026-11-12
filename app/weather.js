/* 닿음 오늘 날씨 띠(S12-t, ⚙️ 파로 2026-11-12) — 화면 위쪽 한 줄: 기온·하늘·강수·특보 + 출처 «기상청».
   기준 위치: 오늘 방문 가구의 읍면동(없으면 상주시청). 자료: 기상청 초단기실황·초단기예보(data.go.kr 15084084)·기상특보.
   ⛔ 키는 화면에 없다 — 서버 함수 daeum-weather(Supabase daeum)가 대신 부른다. 받아오기 실패·키 없음이면 띠를 숨긴다(오류 문구 0).
   S12-x(64회차): 한 줄만 — 지명·기온·하늘·특보 배지·출처. «방문 안전» 둘째 줄은 없앰(safety() 값은 남겨 다른 화면이 쓸 수 있게).
   PC·폰 같은 기능(폭만 다르게 줄바꿈). 시험: node app/weather.test.js */
(function (root) {
  "use strict";
  var OFFICE_LL = { lat: 36.4109, lng: 128.1591 }; // 상주시청(가구 좌표 (0,0) 기준점) — 국토지리정보원 지도 대략값
  var SKY = { 1: "맑음", 3: "구름 많음", 4: "흐림" };
  var PTY = { 1: "비", 2: "비·눈", 3: "눈", 5: "빗방울", 6: "빗방울·눈날림", 7: "눈날림" };

  /** 가구 평면 좌표(상주시청 기준 km, 동쪽 x·북쪽 y) → 위경도(어림) */
  function kmToLL(x, y) {
    var lat = OFFICE_LL.lat + (+y || 0) / 110.95;
    return { lat: lat, lng: OFFICE_LL.lng + (+x || 0) / (111.32 * Math.cos(lat * Math.PI / 180)) };
  }
  /** 위경도 → 기상청 동네예보 격자(LCC, 기상청 «단기예보 조회서비스 활용가이드» 변환식) */
  function grid(lat, lng) {
    var RE = 6371.00877 / 5.0, D = Math.PI / 180, s1 = 30 * D, s2 = 60 * D, olon = 126 * D, olat = 38 * D;
    var sn = Math.log(Math.cos(s1) / Math.cos(s2)) / Math.log(Math.tan(Math.PI * 0.25 + s2 * 0.5) / Math.tan(Math.PI * 0.25 + s1 * 0.5));
    var sf = Math.pow(Math.tan(Math.PI * 0.25 + s1 * 0.5), sn) * Math.cos(s1) / sn;
    var ro = RE * sf / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn);
    var ra = RE * sf / Math.pow(Math.tan(Math.PI * 0.25 + lat * D * 0.5), sn), th = lng * D - olon;
    if (th > Math.PI) th -= 2 * Math.PI; if (th < -Math.PI) th += 2 * Math.PI; th *= sn;
    return { nx: Math.floor(ra * Math.sin(th) + 43 + 0.5), ny: Math.floor(ro - ra * Math.cos(th) + 136 + 0.5) };
  }
  /** 오늘 방문 가구 → 기준 읍면동(가장 많이 가는 곳) · 없으면 null */
  function pickArea(days, byId, todayYmd) {
    if (!days || !days.length) return null;
    var d = null; days.forEach(function (x) { if (!d && x.date === todayYmd && x.ids && x.ids.length) d = x; });
    if (!d) days.forEach(function (x) { if (!d && x.ids && x.ids.length) d = x; });
    if (!d) return null;
    var cnt = {}, sum = {};
    d.ids.forEach(function (id) { var h = byId[id]; if (!h || !h.area) return; cnt[h.area] = (cnt[h.area] || 0) + 1; var s = sum[h.area] || (sum[h.area] = { x: 0, y: 0 }); s.x += +h.x || 0; s.y += +h.y || 0; });
    var best = null; Object.keys(cnt).forEach(function (a) { if (!best || cnt[a] > cnt[best]) best = a; });
    return best ? { name: best, x: sum[best].x / cnt[best], y: sum[best].y / cnt[best] } : null;
  }
  /** 방문 안전 한 줄 — 특보 또는 실황 값(기준: 기상청 특보 기준 근사 · 폭염 33℃·한파 -12℃·시간당 15mm) */
  function safety(w) {
    var all = (w.warn || []).join(" "), t = w.t, r = w.rn1 || 0;
    if (/폭염/.test(all) || (t != null && t >= 33)) return { k: "heat", line: "폭염 — 한낮 방문은 짧게, 물을 챙기고 들어갈 때 안전 모드를 켜 두세요" };
    if (/한파/.test(all) || (t != null && t <= -12)) return { k: "cold", line: "한파 — 난방·동파 여부를 함께 살피고, 들어갈 때 안전 모드를 켜 두세요" };
    if (/호우|태풍/.test(all) || r >= 15) return { k: "rain", line: "호우 — 산길·하천변 가구는 미루는 것도 검토하고, 들어갈 때 안전 모드를 켜 두세요" };
    if (/대설/.test(all)) return { k: "snow", line: "대설 — 비탈길·외딴 가구는 동료와 함께, 들어갈 때 안전 모드를 켜 두세요" };
    return null;
  }
  /** 서버 응답 → 띠 내용(값이 모자라면 null → 띠 숨김) */
  function view(w, place) {
    if (!w || typeof w.t !== "number" || !isFinite(w.t)) return null;
    var sky = w.pty && PTY[w.pty] ? PTY[w.pty] : SKY[w.sky] || "";
    var rain = w.rn1 > 0 ? "시간당 " + (w.rn1 >= 1 ? Math.round(w.rn1) : w.rn1) + "mm" : w.pty ? "" : "강수 없음";
    var warn = (w.warn || []).slice(0, 2).join("·"), at = String(w.at || "");
    return {
      place: place || "상주시", temp: Math.round(w.t * 10) / 10, sky: sky, rain: rain, warn: warn, pre: (w.pre || []).length ? (w.pre || []).slice(0, 2).join("·") + " 예비" : "",
      time: at.length >= 12 ? at.slice(8, 10) + ":" + at.slice(10, 12) : "", safe: safety(w),
    };
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  /** S12-x(64회차 · 호창님 11-12 «1줄·얇게»): 한 줄 «함창 3.5℃ 맑음 [특보 배지] 기상청» — 방문 안전 둘째 줄은 없앰(safe 값은 데이터로만 남김) */
  function short(p) { p = String(p || ""); return p.length > 2 ? p.replace(/(읍|면|동)$/, "") : p; }
  function html(v) {
    var warn = v.warn ? '<span class="al">' + esc(v.warn) + "</span>" : v.pre ? '<span class="al pre">' + esc(v.pre) + "</span>" : "";
    return '<span class="wx-t"><span class="wx-pl">' + esc(short(v.place)) + '</span> <b class="num">' + v.temp + "℃</b>" + (v.sky ? " " + esc(v.sky) : "") + "</span>" + warn +
      '<span class="src-tag"><i class="src-ico" aria-hidden="true"></i>기상청' + (v.time ? " " + v.time : "") + "</span>";
  }
  /** S12-v U15(B10): 받은 실제 특보(기상청)만 화면 «주의» 줄·방문 순위의 원천으로 — 없으면 null(시연용 가짜 특보는 쓰지 않음) */
  function alertOf(w) {
    var n = w && (w.warn || []).filter(function (x) { return /주의보|경보/.test(String(x)); })[0];
    return n ? { name: String(n), level: /경보/.test(n) ? "경보" : "주의보" } : null;
  }
  var cur = null;
  var API = { kmToLL: kmToLL, grid: grid, pickArea: pickArea, safety: safety, view: view, html: html, alertOf: alertOf, current: function () { return cur; } };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; return; }
  root.DaeumWeather = API;

  // ───── 화면(브라우저) ─────
  var C = root.DAEUM_CONFIG || {};
  var EP = C.weatherEndpoint || ""; // S12-v U15(A5): 날씨 주소는 config.js 에 따로(경로 주소에서 만들지 않음)
  if (!EP || C.weatherOff) return;
  var LS = "daeum.s12.wx", band = null, last = "";
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function byId() { var o = {}, D = root.__DAEUM_HOUSEHOLDS__; ((D && D.households) || []).forEach(function (h) { o[h.id] = h; }); return o; }
  function target() {
    var a = null;
    try { var A = root.DaeumApp; a = A && A.days ? pickArea(A.days(), byId(), ymd(new Date())) : null; } catch (e) { a = null; }
    var ll = a ? kmToLL(a.x, a.y) : OFFICE_LL, g = grid(ll.lat, ll.lng);
    return { place: a ? a.name : "상주시", nx: g.nx, ny: g.ny };
  }
  function hide() { if (band) band.hidden = true; }
  function keep(w) { // 받은 값을 기억하고, 특보가 바뀌면 화면에 알린다(집 앞 «주의» 줄·방문 순위가 다시 그려지게)
    var a = alertOf(w), b = alertOf(cur), ch = (a && a.name) !== (b && b.name); cur = w;
    if (ch) try { root.dispatchEvent(new CustomEvent("daeum:wx")); } catch (e) { /* 옛 브라우저 */ }
  }
  function show(v) {
    if (!v) { hide(); return; }
    if (!band || !band.isConnected) band = document.getElementById("dwx"); // S12-x: 자리는 app.js 의 머리 아래 띠(.hbar) 안 — 없을 때만 #app 앞에 만든다
    if (!band) {
      band = document.createElement("div"); band.id = "dwx"; band.className = "wx"; band.setAttribute("role", "status"); band.setAttribute("aria-label", "오늘 날씨");
      var app = document.getElementById("app"); if (!app || !app.parentNode) return;
      app.parentNode.insertBefore(band, app);
    }
    band.innerHTML = html(v); band.hidden = false;
    band.dataset.safe = v.safe ? v.safe.k : "";
  }
  function getCache(k) { try { var c = JSON.parse(localStorage.getItem(LS) || "null"); return c && c.k === k && Date.now() - c.at < 10 * 60e3 ? c.w : null; } catch (e) { return null; } }
  function setCache(k, w) { try { localStorage.setItem(LS, JSON.stringify({ k: k, at: Date.now(), w: w })); } catch (e) { /* 저장 못 해도 그만 */ } }
  function load(force) {
    var tg = target(), k = tg.nx + "," + tg.ny;
    if (!force && k === last && band && !band.hidden) return;
    last = k;
    var c = getCache(k); if (c) { keep(c); show(view(c, tg.place)); return; }
    if (typeof fetch !== "function") return;
    var ctl = typeof AbortController === "function" ? new AbortController() : null, tm = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    fetch(EP + "?nx=" + tg.nx + "&ny=" + tg.ny, { signal: ctl ? ctl.signal : undefined, cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (w) { clearTimeout(tm); var v = view(w, tg.place); if (v) { setCache(k, w); keep(w); } show(v); })
      .catch(function () { clearTimeout(tm); hide(); });
  }
  function start() { load(true); root.addEventListener("hashchange", function () { setTimeout(function () { load(false); }, 50); }); setInterval(function () { load(true); }, 10 * 60e3); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else setTimeout(start, 0);
})(typeof window !== "undefined" ? window : this);
