/* 닿음 S9c — 네이버 지도(NCP Web Dynamic Map) 그리기 + 도로 경로 서버(daeum-route) 호출. window.DaeumRouteMap
   - 지도 키는 공개값(Client ID)만 쓴다. 비밀키(Client Secret)는 서버 함수 비밀에만 있다.
   - 지도 로딩 실패 원인을 구분해 둔다: auth(인증 실패 — Client ID 또는 Web 서비스 URL 미등록), network(스크립트 못 받음), timeout
   - 도로 결과는 같은 경유지·순서·복귀 여부면 «그날» 이 기기 안에서 다시 부르지 않는다(S12-i4, 날짜 바뀌면 버림) */
(function () {
  "use strict";
  var C = window.DAEUM_CONFIG || {};
  var state = { status: "idle", reason: "", promise: null, map: null, overlays: [], stops: [], animateNext: true, anim: 0 };
  // S11-c 경로 그리기 움직임(고도화 #16): 방문 화면에 «들어올 때마다» 묶은 뒤 경로를 1.1초 동안 그리고 번호 핀을 차례로 띄운다.
  // 같은 화면 안에서 순서만 바꿀 때는 움직이지 않는다(바뀐 것만 움직인다). 움직임 줄이기 설정이면 끈다.
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.addEventListener("hashchange", function () { if (/^#route(:|$)/.test(location.hash)) state.animateNext = true; });
  var GAP = 34; // 번호 표지(32px)끼리 이만큼(px) 안이면 겹친 것으로 보고 둥글게 벌린다

  function load() {
    // 실패로 굳은 뒤에는 예전에 «성공»으로 끝난 약속을 돌려주지 않는다 — 돌려주면 부르는 쪽(officer.js drawMap)이
    // 성공으로 알고 다시 그리고, 다시 load 를 불러 끝없는 고리가 돈다(S10e, 10-30 재현: 1.5초에 202회)
    if (state.status === "fail") return Promise.reject(state.reason || "fail");
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

  function clear() { state.overlays.forEach(function (o) { try { o.setMap(null); } catch (e) { /* 무시 */ } }); state.overlays = []; state.stops = []; }

  // ── 가까운 집 번호 겹침 풀기(S10d 🩵 미르) ─────────────────
  // 화면 픽셀로 GAP 안에 모인 표지를 한 무리로 묶어, 무리 가운데를 중심으로 고르게 벌려 놓는다.
  // 실제 집 자리에는 작은 점을 남기고 지시선으로 번호와 잇는다. 확대·이동이 끝날 때마다(idle) 다시 계산한다.
  function stopHtml(s, dx, dy, pop) {
    var cls = "nm-stop" + (s.req ? " req" : "") + (s.cls ? " " + s.cls : "") + (pop ? " pop" : ""); // s.cls: 현장 폰 동선(dn 끝난 집·nx 다음 집)
    if (!dx && !dy) return '<div class="nm-spot" aria-hidden="true"><div class="' + cls + '"' + (pop ? ' style="animation-delay:' + (180 + s.no * 90) + 'ms"' : "") + '>' + s.no + "</div></div>";
    var len = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    return '<div class="nm-spot spread" aria-hidden="true"><i class="nm-lead" style="width:' + len.toFixed(1) + "px;transform:rotate(" + ang.toFixed(1) + 'deg)"></i><i class="nm-dot"></i>' +
      '<div class="' + cls + '" style="transform:translate(' + dx.toFixed(1) + "px," + dy.toFixed(1) + 'px)">' + s.no + "</div></div>";
  }
  function spread(pts) {
    var n = pts.length, par = pts.map(function (_, i) { return i; }), out = pts.map(function () { return [0, 0]; });
    function root(i) { while (par[i] !== i) i = par[i] = par[par[i]]; return i; }
    for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
      var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
      if (dx * dx + dy * dy < GAP * GAP) par[root(i)] = root(j);
    }
    var groups = {};
    for (var k = 0; k < n; k++) (groups[root(k)] = groups[root(k)] || []).push(k);
    Object.keys(groups).forEach(function (g) {
      var m = groups[g]; if (m.length < 2) return;
      var cx = 0, cy = 0; m.forEach(function (i) { cx += pts[i].x; cy += pts[i].y; }); cx /= m.length; cy /= m.length;
      // 무리 안 순서는 원래 방향(가운데에서 본 각도)대로 — 지시선이 서로 엇갈리지 않게
      var ang = function (i) { var a = Math.atan2(pts[i].y - cy, pts[i].x - cx); return isFinite(a) && (pts[i].x !== cx || pts[i].y !== cy) ? a : -Math.PI / 2 + i * 1e-3; };
      m.sort(function (a, b) { return ang(a) - ang(b); });
      var R = Math.max(GAP / (2 * Math.sin(Math.PI / m.length)), GAP * .75), a0 = ang(m[0]);
      m.forEach(function (i, q) {
        var a = a0 + q * 2 * Math.PI / m.length;
        out[i] = [cx + R * Math.cos(a) - pts[i].x, cy + R * Math.sin(a) - pts[i].y];
      });
    });
    return out;
  }
  // 그림 지도(SVG)용 — 좌표 단위가 화면 픽셀이 아니므로 «표지 지름 + 여유(gap)»를 GAP 에 맞춰 늘렸다 줄인다(S10d 파로)
  function spreadBy(pts, gap) {
    var f = GAP / gap, off = spread(pts.map(function (p) { return { x: p.x * f, y: p.y * f }; }));
    return off.map(function (d) { return [d[0] / f, d[1] / f]; });
  }
  function declutter() {
    var map = state.map, N = window.naver && naver.maps; if (!map || !N || !state.stops.length) return;
    var proj = map.getProjection(); if (!proj || !proj.fromCoordToOffset) return;
    var pts = state.stops.map(function (it) { return proj.fromCoordToOffset(it.m.getPosition()); });
    var off = spread(pts);
    state.stops.forEach(function (it, i) {
      var dx = Math.round(off[i][0]), dy = Math.round(off[i][1]), key = dx + "," + dy;
      if (it.key === key) return; it.key = key;
      it.m.setIcon({ content: stopHtml(it.s, dx, dy), anchor: new N.Point(0, 0) });
    });
  }
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
      N.Event.addListener(state.map, "idle", declutter);
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
    // 42 다른 일차(흐린 점선·작은 점) — 범위 맞춤에는 넣지 않는다(지금 일차가 화면에 크게)
    (opts.ghosts || []).forEach(function (gs) {
      if (!gs.length) return;
      state.overlays.push(new N.Polyline({ map: map, path: [o].concat(gs.map(function (s) { return new N.LatLng(s.lat, s.lng); })).concat(opts.ret ? [o] : []),
        strokeColor: "#7B8BA3", strokeOpacity: .55, strokeWeight: 3, strokeStyle: "shortdash", strokeLineCap: "round", strokeLineJoin: "round", zIndex: 1 }));
      gs.forEach(function (s) { state.overlays.push(new N.Marker({ map: map, position: new N.LatLng(s.lat, s.lng), clickable: false, zIndex: 5,
        icon: { content: '<i class="nm-ghost" aria-hidden="true"></i>', anchor: new N.Point(6, 6) } })); });
    });
    var anim = state.animateNext && !REDUCED && !!window.requestAnimationFrame; state.animateNext = false;
    if (line.length > 1) {
      var poly = new N.Polyline({ map: map, path: anim ? line.slice(0, 1).concat(line.slice(0, 1)) : line, strokeColor: opts.color || "#5B4FD0", strokeOpacity: .9,
        strokeWeight: 5, strokeStyle: opts.path ? "solid" : "shortdash", strokeLineCap: "round", strokeLineJoin: "round" });
      state.overlays.push(poly);
      if (anim) growLine(poly, line, N);
    }
    opts.stops.forEach(function (s) {
      var p = new N.LatLng(s.lat, s.lng); bounds.extend(p);
      var mk = new N.Marker({ map: map, position: p, title: s.no + ". " + s.label, zIndex: 100 + s.no,
        icon: { content: stopHtml(s, 0, 0, anim), anchor: new N.Point(0, 0) } });
      state.overlays.push(mk); state.stops.push({ m: mk, s: s, key: "0,0" });
    });
    line.forEach(function (p) { bounds.extend(p); });
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    declutter(); // fitBounds 가 바로 끝나 idle 이 늦을 때도 첫 그림부터 풀어 둔다
    return true;
  }
  // 경로선을 1.1초 동안 앞에서부터 그린다(감속 곡선). 새로 그리면 이전 움직임은 멈춘다
  function growLine(poly, line, N) {
    var id = ++state.anim, cum = [0];
    for (var i = 1; i < line.length; i++) { var a = line[i - 1], b = line[i], dx = b.lng() - a.lng(), dy = b.lat() - a.lat(); cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy)); }
    var L = cum[cum.length - 1] || 1, t0 = null;
    function step(t) {
      if (id !== state.anim) return;
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - k, 3), want = L * e, out = [line[0]], j = 1;
      while (j < line.length && cum[j] <= want) { out.push(line[j]); j++; }
      if (j < line.length) { var a = line[j - 1], b = line[j], f = (want - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1); out.push(new N.LatLng(a.lat() + (b.lat() - a.lat()) * f, a.lng() + (b.lng() - a.lng()) * f)); }
      if (out.length < 2) out.push(line[0]);
      try { poly.setPath(out); } catch (x) { return; }
      if (k < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
  function refresh() { if (state.map && window.naver) { try {
    var el = state.map.getElement(), w = el && el.clientWidth, h = el && el.clientHeight; // 화면 크기가 바뀌면 지도 판 크기도 맞춘다(0px 이면 건너뜀)
    if (w && h) state.map.setSize(new naver.maps.Size(w, h));
    naver.maps.Event.trigger(state.map, "resize"); state.map.refreshStyles && state.map.refreshStyles(); } catch (e) { /* 무시 */ } } }

  // ── 도로 경로(서버 경유) ─────────────────────────────────
  // S12-i4: 같은 경로(경유지·순서·복귀)는 «그날 이 기기 안»에서만 다시 쓴다 — 날짜가 바뀌면 버린다(옛 7일 보관 폐지).
  //   보관은 DaeumRoutePlan.roadStore(localStorage, try/catch) 하나를 app.js 시각표와 함께 본다. 서버는 결과를 저장하지 않는다(약관 §7.3).
  //   상한(429)에 닿으면 그날은 더 부르지 않고, 오류·끊김·상한 모두 화면 오류 없이 직선 어림값(«약»)으로 대체된다.
  var RPm = window.DaeumRoutePlan;
  var store = RPm && RPm.roadStore ? RPm.roadStore : (function () { var m = {}; return { get: function (k) { return m[k] || null; }, put: function (k, v) { m[k] = v; }, blocked: function () { return m.__b || null; }, block: function (w) { m.__b = w || "limit"; } }; })();
  function cacheGet(key) { return store.get(key); }
  function cachePut(key, r) { store.put(key, r); }
  /** points [[lng,lat]...] → Promise<{legs,m,s,path,cached}> 실패하면 reject({code, error}) — 부르는 쪽은 실패 때 어림값을 그대로 둔다 */
  function road(key, points) {
    var hit = cacheGet(key); if (hit) return Promise.resolve(Object.assign({ cached: true }, hit));
    if (!C.routeEndpoint) return Promise.reject({ code: "no-endpoint" });
    if (store.blocked()) return Promise.reject({ code: "limit", error: "오늘 상한 — 어림값 사용" });
    if (typeof navigator !== "undefined" && navigator.onLine === false) return Promise.reject({ code: "offline" });
    var ctl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    return fetch(C.routeEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: points }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { clearTimeout(to);
        if (r.status === 429 || j.code === "limit") store.block("limit"); // 그날은 더 부르지 않음
        if (!r.ok || !j.legs) throw { code: j.code || "http-" + r.status, error: j.error || "", detail: j.detail || "" }; return j; }); })
      .then(function (j) { cachePut(key, { legs: j.legs, m: j.m, s: j.s, path: j.path }); return j; },
        function (e) { clearTimeout(to); throw e && e.code ? e : { code: "network" }; });
  }
  /** 실패해도 늘 이어지는 판: 도로 결과 또는 직선 어림값(approx:true). order=[{id,x,y}], office={x,y} */
  function roadOrApprox(key, points, order, office, ret) {
    return road(key, points).then(function (j) { return { legs: j.legs, m: j.m, s: j.s, path: j.path, approx: false }; },
      function () { return RPm ? RPm.approxRoad(order, office, ret) : { legs: [], m: 0, s: 0, path: null, approx: true }; });
  }

  window.DaeumRouteMap = { load: load, draw: draw, refresh: refresh, road: road, roadOrApprox: roadOrApprox, cacheGet: cacheGet, state: state, _spread: spread, spreadBy: spreadBy };
})();
