/* 닿음 S9c — 네이버 지도(NCP Web Dynamic Map) 그리기 + 도로 경로 서버(daeum-route) 호출. window.DaeumRouteMap
   - 지도 키는 공개값(Client ID)만 쓴다. 비밀키(Client Secret)는 서버 함수 비밀에만 있다.
   - 지도 로딩 실패 원인을 구분해 둔다: auth(인증 실패 — Client ID 또는 Web 서비스 URL 미등록), network(스크립트 못 받음), timeout
   - 도로 결과는 같은 경유지·순서·복귀 여부면 브라우저에 7일 보관해 다시 부르지 않는다(Directions 15 호출 절약) */
(function () {
  "use strict";
  var C = window.DAEUM_CONFIG || {};
  var LS_ROAD = "daeum.officer.road";
  var state = { status: "idle", reason: "", promise: null, map: null, overlays: [] };

  function load() {
    if (state.promise) return state.promise;
    var id = C.naverMapKeyId;
    if (!id) { state.status = "fail"; state.reason = "no-key"; return (state.promise = Promise.reject("no-key")); }
    state.status = "loading";
    state.promise = new Promise(function (resolve, reject) {
      var done = false;
      function fail(why) { if (done) return; done = true; state.status = "fail"; state.reason = why; if (window.console) console.warn("[닿음 지도] 네이버 지도 로딩 실패 — " + why); reject(why); }
      // 네이버가 인증 실패 때 부르는 전역 함수(Client ID 오류·Web 서비스 URL 미등록 모두 여기로 온다 — 자세한 코드는 콘솔의 네이버 메시지)
      window.navermap_authFailure = function () { fail("auth"); };
      var s = document.createElement("script");
      s.src = "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=" + encodeURIComponent(id);
      s.async = true;
      s.onerror = function () { fail("network"); };
      s.onload = function () {
        // 스크립트가 온 뒤 인증 결과가 조금 늦게 올 수 있어 한 박자 기다린다
        setTimeout(function () {
          if (done) return;
          if (window.naver && naver.maps && naver.maps.Map) { done = true; state.status = "ready"; resolve(naver.maps); }
          else fail("no-api");
        }, 300);
      };
      setTimeout(function () { fail("timeout"); }, 10000);
      document.head.appendChild(s);
    });
    return state.promise;
  }

  function clear() { state.overlays.forEach(function (o) { try { o.setMap(null); } catch (e) { /* 무시 */ } }); state.overlays = []; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /**
   * 지도 그리기. opts: { box: HTMLElement, office:{lat,lng,name}, stops:[{lat,lng,no,label,req}], path:[[lng,lat]]|null, ret:bool }
   * path 가 없으면 점선 직선(근사)으로 잇는다. 지도 위 장식 없음 — 번호 표지와 경로선만.
   */
  function draw(opts) {
    var N = window.naver && naver.maps; if (!N || state.status !== "ready") return false;
    if (!state.map || state.map.getElement() !== opts.box) {
      opts.box.textContent = "";
      state.map = new N.Map(opts.box, {
        center: new N.LatLng(opts.office.lat, opts.office.lng), zoom: 11,
        scaleControl: true, mapDataControl: false, logoControlOptions: { position: N.Position.BOTTOM_LEFT },
        zoomControl: true, zoomControlOptions: { position: N.Position.TOP_RIGHT, style: N.ZoomControlStyle.SMALL }
      });
    }
    var map = state.map; clear();
    var bounds = new N.LatLngBounds();
    var o = new N.LatLng(opts.office.lat, opts.office.lng); bounds.extend(o);
    state.overlays.push(new N.Marker({ map: map, position: o, title: opts.office.name || "출발",
      icon: { content: '<div class="nm-office" aria-hidden="true">' + esc(opts.office.short || "시청") + "</div>", anchor: new N.Point(22, 14) } }));
    var line;
    if (opts.path && opts.path.length > 1) line = opts.path.map(function (p) { return new N.LatLng(p[1], p[0]); });
    else {
      line = [o].concat(opts.stops.map(function (s) { return new N.LatLng(s.lat, s.lng); }));
      if (opts.ret && opts.stops.length) line.push(o);
    }
    if (line.length > 1) state.overlays.push(new N.Polyline({ map: map, path: line, strokeColor: opts.color || "#5B4FD0", strokeOpacity: .9,
      strokeWeight: 5, strokeStyle: opts.path ? "solid" : "shortdash", strokeLineCap: "round", strokeLineJoin: "round" }));
    opts.stops.forEach(function (s) {
      var p = new N.LatLng(s.lat, s.lng); bounds.extend(p);
      state.overlays.push(new N.Marker({ map: map, position: p, title: s.no + ". " + s.label, zIndex: 100 + s.no,
        icon: { content: '<div class="nm-stop' + (s.req ? " req" : "") + '" aria-hidden="true">' + s.no + "</div>", anchor: new N.Point(16, 16) } }));
    });
    line.forEach(function (p) { bounds.extend(p); });
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    return true;
  }
  function refresh() { if (state.map && window.naver) { try { naver.maps.Event.trigger(state.map, "resize"); state.map.refreshStyles && state.map.refreshStyles(); } catch (e) { /* 무시 */ } } }

  // ── 도로 경로(서버 경유) ─────────────────────────────────
  function cacheAll() { try { return JSON.parse(localStorage.getItem(LS_ROAD) || "{}"); } catch (e) { return {}; } }
  function cacheGet(key) { var c = cacheAll()[key]; return c && Date.now() - c.at < 7 * 864e5 ? c.r : null; }
  function cachePut(key, r) {
    var c = cacheAll(); c[key] = { at: Date.now(), r: r };
    var ks = Object.keys(c).sort(function (a, b) { return c[b].at - c[a].at; });
    ks.slice(20).forEach(function (k) { delete c[k]; }); // 최근 20개만
    try { localStorage.setItem(LS_ROAD, JSON.stringify(c)); } catch (e) { /* 용량 초과 — 보관 생략 */ }
  }
  /** points [[lng,lat]...] → Promise<{legs,m,s,path,cached}> 실패하면 reject({code, error}) */
  function road(key, points) {
    var hit = cacheGet(key); if (hit) return Promise.resolve(Object.assign({ cached: true }, hit));
    if (!C.routeEndpoint) return Promise.reject({ code: "no-endpoint" });
    var ctl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    return fetch(C.routeEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: points }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { clearTimeout(to); if (!r.ok || !j.legs) throw { code: j.code || "http-" + r.status, error: j.error || "", detail: j.detail || "" }; return j; }); })
      .then(function (j) { cachePut(key, { legs: j.legs, m: j.m, s: j.s, path: j.path }); return j; },
        function (e) { clearTimeout(to); throw e && e.code ? e : { code: "network" }; });
  }

  window.DaeumRouteMap = { load: load, draw: draw, refresh: refresh, road: road, cacheGet: cacheGet, state: state };
})();
