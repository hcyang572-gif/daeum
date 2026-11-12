/* 닿음 S12-s «주변 정보» 겹층(⚙️ 파로, 2026-11-12) — 네이버 지도(officer/route_map.js) 위에 세 층을 켜고 끈다. window.DaeumNearby
   층: ① 방문 가구(동선 번호 핀 — route_map 이 그린 것을 보이기/숨기기만) ② 연계처(치매·마음건강·돌봄) ③ 경로당(2018 명단 → «방문 전 확인»)
   데이터: data/public_extra.js(🔵 소라 상주 공공데이터 712건 정적 스냅샷) + data/public_extra_geo.js(주소정보누리집 좌표 692/708, 실패 16 = 2018 경로당).
   거리: 가구 기준 직선거리 «약 n km»(S12-m e338989 linkcard 방식 그대로 — 하버사인). 좌표 없는 곳은 뒤로.
   표지를 누르면 이름·전화(tel: 바로 걸기)·출처 아이콘. 지도 키 실패·지도 못 그림 → 같은 목록이 열려 대신 보인다(빈 화면 없음).
   ⛔ 가구 정보는 화면 안에서만 · 서버 전송 0 · 판단은 담당 공무원(점수·추천 없음). */
(function (root) {
  "use strict";
  var KEY = "daeum.nearby.on.v1", SENIOR_PER_HH = 3;
  var DEF = { hh: true, link: true, senior: false }; // 경로당은 2018 명단·수가 많아 처음엔 끔
  var CARE_WORD = { "방문 돌봄": 1, "요양원": 1, "요양원(소규모)": 1, "어르신 복지관": 1, "어르신 복지": 1 };
  var L = function () { return root.DaeumLink || {}; };

  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function normEmd(s) { return L().normEmd ? L().normEmd(s) : String(s || "").replace(/\s+/g, ""); }
  function word(k) { return L().word ? L().word(k) : String(k || "복지시설").split(" · ")[0]; }
  function km(a, b) { var R = 6371, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lng - a.lng) * r, q = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) * Math.sin(dn / 2); return 2 * R * Math.asin(Math.sqrt(q)); }
  function telNo(t) { return String(t || "").replace(/[^0-9]/g, ""); }
  function srcOf(d, id) { var s = (d.sources || []).filter(function (x) { return x.id === id; })[0]; return s ? s.name : id; }
  function cat(x) { return /^치매안심센터/.test(x.k) ? "치매" : x.k === "정신건강복지센터" ? "마음건강" : x.k === "경로당" ? "경로당" : "돌봄"; }

  /** 순수 계산. hhs=[{id,area,lat,lng}], px=공공데이터, geo=좌표 → { link:[], senior:[], seniorTotal, hasGeo } (가까운 순) */
  function model(hhs, px, geo) {
    var d = px || root.__DAEUM_PUBLIC_EXTRA__, g = geo || root.__DAEUM_PUBLIC_GEO__;
    if (!d || !d.items || !d.items.length || !hhs || !hhs.length) return null;
    var it = d.items, byIx = g && g.by_index ? g.by_index : {};
    function ll(i) { var x = it[i]; if (x.la != null && x.ln != null) return { lat: x.la, lng: x.ln }; var v = byIx[String(i)]; return v ? { lat: v[0], lng: v[1] } : null; }
    var picked = {}, seniorEmd = {};
    function take(i, layer, h) {
      var p = ll(i), dk = p && h.lat != null ? km(h, p) : null, cur = picked[i];
      if (!cur) cur = picked[i] = { i: i, layer: layer, p: p, km: null, hid: h.id };
      if (dk != null && (cur.km == null || dk < cur.km)) { cur.km = dk; cur.hid = h.id; }
    }
    function nearest(list, h) { // 가구에서 가까운 순(좌표 없는 곳 뒤)
      return list.map(function (i) { var p = ll(i); return { i: i, k: p && h.lat != null ? km(h, p) : null }; })
        .sort(function (a, b) { return (a.k == null) - (b.k == null) || (a.k || 0) - (b.k || 0); });
    }
    var dem = [], mind = [], care = [];
    it.forEach(function (x, i) { if (/^치매안심센터/.test(x.k)) dem.push(i); else if (x.k === "정신건강복지센터") mind.push(i); else if (x.src === "15004317") care.push(i); });
    hhs.forEach(function (h) {
      var emd = normEmd(h.area);
      var dn = nearest(dem, h)[0]; if (dn) take(dn.i, "link", h);
      var mn = nearest(mind, h)[0]; if (mn) take(mn.i, "link", h);
      care.forEach(function (i) { take(i, "link", h); });
      var same = [], sc = [];
      it.forEach(function (x, i) { if (normEmd(x.emd) !== emd) return; if (x.k === "경로당") sc.push(i); else if (CARE_WORD[word(x.k)] || /재가|돌봄/.test(x.k)) same.push(i); });
      same.forEach(function (i) { take(i, "link", h); });
      sc.forEach(function (i) { seniorEmd[i] = 1; });
      nearest(sc, h).slice(0, SENIOR_PER_HH).forEach(function (o) { take(o.i, "senior", h); });
    });
    var out = { link: [], senior: [], seniorTotal: Object.keys(seniorEmd).length, hasGeo: !!g, fetched: d.fetched || "", geoSrc: g ? g.source : "" };
    Object.keys(picked).forEach(function (k) {
      var c = picked[k], x = it[c.i];
      out[c.layer].push({ ix: c.i, n: x.n, k: x.k, cat: cat(x), w: word(x.k), a: String(x.a || "").replace(/^경상북도\s*|^경북\s*/, ""), emd: x.emd,
        tel: x.tel || "", src: x.src, srcName: srcOf(d, x.src), base: x.base || "", stale: !!x.stale,
        lat: c.p ? c.p.lat : null, lng: c.p ? c.p.lng : null, km: c.km == null ? null : Math.round(c.km * 10) / 10, hid: c.hid });
    });
    var by = function (a, b) { return (a.km == null) - (b.km == null) || (a.km || 0) - (b.km || 0) || (a.n < b.n ? -1 : 1); };
    out.link.sort(by); out.senior.sort(by);
    return out;
  }

  // ── 켜고 끄기 기억(이 기기만, 실패해도 기본값) ─────────────
  function loadOn() { var o = Object.assign({}, DEF); try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) Object.keys(DEF).forEach(function (k) { if (typeof s[k] === "boolean") o[k] = s[k]; }); } catch (e) { /* 기본값 */ } return o; }
  function saveOn(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* 무시 */ } }

  // ── 그리기: 단추·목록 ───────────────────────────────────
  var GLYPH = { // 20 격자 · 선 1.7 · 둥근 끝(닿음 아이콘 묶음과 같은 결)
    hh: '<path d="M4 9.5 10 4.5l6 5V16H4z"/><path d="M8.5 16v-3.5h3V16"/>',
    link: '<path d="M7.4 12.6 12.6 7.4"/><path d="M9 5.6l1.4-1.4a3 3 0 0 1 4.2 4.2L13.2 9.8"/><path d="M11 14.4l-1.4 1.4a3 3 0 0 1-4.2-4.2l1.4-1.4"/>',
    senior: '<path d="M3.5 16h13"/><path d="M5 16V9l5-3.5L15 9v7"/><path d="M8.5 16v-3h3v3"/>'
  };
  function ico(k) { return '<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + GLYPH[k] + "</svg>"; }
  function kmTxt(x) { return x.km != null ? "약 " + x.km.toFixed(1) + " km" : "위치 미확인"; }
  function item(x) {
    return '<li class="nb-it ' + (x.layer || (x.cat === "경로당" ? "senior" : "link")) + (x.stale ? " stale" : "") + '" data-ix="' + x.ix + '">' +
      '<span class="nb-k">' + esc(x.cat === "돌봄" ? x.w : x.cat) + "</span>" +
      '<div class="nb-tx"><b>' + esc(x.n) + "</b><small>" + esc(x.a) + "</small>" +
      '<span class="nb-meta"><em class="nb-km">' + kmTxt(x) + "</em>" + (x.km != null ? "<span>" + esc(x.hid) + " 기준</span>" : "") +
      (x.stale ? '<em class="nb-chk">방문 전 확인 · ' + esc(x.base) + " 명단</em>" : "") + "</span>" +
      '<span class="nb-src"><i class="src-ico" aria-hidden="true"></i>' + esc(x.srcName) + "(" + esc(x.src) + ")</span></div>" +
      (x.tel ? '<a class="nb-tel" href="tel:' + esc(telNo(x.tel)) + '" aria-label="' + esc(x.n) + " 전화 걸기 " + esc(x.tel) + '"><svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 3.5h-2a.9.9 0 0 0-.9 1A12.6 12.6 0 0 0 15.5 16.7a.9.9 0 0 0 1-.9v-2l-3-1.3-1.5 1.5a9.5 9.5 0 0 1-5-5l1.5-1.5z"/></svg><span>' + esc(x.tel) + "</span></a>" : "") +
      "</li>";
  }
  function panelHtml(m, on, nHh) {
    var nL = m ? m.link.length : 0, nS = m ? m.senior.length : 0;
    function tg(k, lb, n) { return '<button type="button" class="nb-tg ' + k + '" data-nb="' + k + '" aria-pressed="' + (on[k] ? "true" : "false") + '">' + ico(k) + "<span>" + lb + "</span><b>" + n + "</b></button>"; }
    var rows = !m ? "" : (on.link ? m.link.map(function (x) { x.layer = "link"; return item(x); }).join("") : "") + (on.senior ? m.senior.map(function (x) { x.layer = "senior"; return item(x); }).join("") : "");
    return '<div class="nb-bar" role="group" aria-label="지도 주변 정보 켜고 끄기"><span class="nb-eye">주변 정보</span>' +
      tg("hh", "방문 가구", nHh) + tg("link", "연계처", nL) + tg("senior", "경로당", nS) + '<span class="na">AED — 활용 승인 뒤 같은 층에 추가</span></div>' + // S12-x #97: 연계처·경로당·특보만 · AED는 승인 뒤(회색 한 줄) · 119·무더위쉼터 없음
      (m ? '<details class="nb-list"><summary><span>가까운 순 목록</span><small>' + (on.link ? "연계처 " + nL + "곳" : "") + (on.link && on.senior ? " · " : "") + (on.senior ? "경로당 " + nS + "곳(같은 동네 " + m.seniorTotal + "곳 중 집마다 가까운 " + SENIOR_PER_HH + "곳)" : "") + (!on.link && !on.senior ? "켜진 층 없음" : "") + "</small></summary>" +
        (rows ? '<ul class="nb-ul">' + rows + "</ul>" : '<p class="nb-none">위 단추로 연계처·경로당을 켜면 여기에 가까운 순으로 나옵니다.</p>') +
        '<p class="srcline nb-foot">거리: 방문 가구에서 직선거리 «약»(도로 거리 아님) · 위치: ' + esc(m.geoSrc || "자료 원본 좌표") + " · 자료: " + esc(m.fetched) + " 수집 정적 스냅샷 · 경로당은 2018년 명단이라 문을 닫았거나 옮겼을 수 있어 방문 전 확인 · 가구 위치는 가상(시연용) · 연계 여부는 담당 공무원 판단</p></details>" :
        '<p class="nb-none">주변 정보 자료를 불러오지 못했습니다. 동선 지도는 그대로 씁니다.</p>');
  }
  function iwHtml(x) {
    return '<div class="nb-iw ' + (x.stale ? "stale" : "") + '"><span class="nb-k">' + esc(x.cat === "돌봄" ? x.w : x.cat) + "</span><b>" + esc(x.n) + "</b>" +
      "<small>" + esc(x.a) + "</small><span class=\"nb-meta\"><em class=\"nb-km\">" + kmTxt(x) + "</em>" + (x.km != null ? "<span>" + esc(x.hid) + " 기준</span>" : "") + "</span>" +
      (x.stale ? '<em class="nb-chk">방문 전 확인 · ' + esc(x.base) + " 명단</em>" : "") +
      (x.tel ? '<a class="nb-tel" href="tel:' + esc(telNo(x.tel)) + '">전화 ' + esc(x.tel) + "</a>" : "") +
      '<span class="nb-src"><i class="src-ico" aria-hidden="true"></i>' + esc(x.srcName) + "(" + esc(x.src) + ")</span></div>";
  }
  function pinHtml(x, layer) { return '<div class="nb-pin ' + layer + (x.stale ? " stale" : "") + '" aria-hidden="true">' + ico(layer) + "</div>"; }

  // ── 붙이기: 지도 칸(wrap) 바로 뒤에 단추·목록, 지도 그릴 때마다 표지 다시 ─────────
  /** wrap=지도 칸, hhs=[{id,area,lat,lng}] → { onDrawn(map,N,state), fallback(), model } 또는 null */
  function attach(wrap, hhs, px, geo) {
    if (!wrap || !wrap.parentNode) return null;
    var m = model(hhs, px, geo), on = loadOn(), mk = [], iw = null, last = null, mapClick = null;
    var box = wrap.nextElementSibling && wrap.nextElementSibling.classList && wrap.nextElementSibling.classList.contains("nbl") ? wrap.nextElementSibling : null;
    if (!box) { box = document.createElement("section"); box.className = "nbl blk"; box.setAttribute("aria-label", "지도 주변 정보"); wrap.parentNode.insertBefore(box, wrap.nextSibling); }
    function paint() {
      var wasOpen = !!(box.querySelector(".nb-list") || {}).open;
      box.innerHTML = panelHtml(m, on, hhs.length);
      var dl = box.querySelector(".nb-list"); if (dl && (wasOpen || wrap.classList.contains("no-naver") || !(root.naver && root.naver.maps))) dl.open = true;
      box.querySelectorAll("[data-nb]").forEach(function (b) { b.addEventListener("click", function () { var k = b.dataset.nb; on[k] = !on[k]; saveOn(on); paint(); show(); }); });
    }
    function show() {
      mk.forEach(function (o) { try { o.m.setVisible(!!on[o.layer]); } catch (e) { /* 무시 */ } });
      if (iw && last && !on[last]) { try { iw.close(); } catch (e) { /* 무시 */ } }
      var st = last && last.stops; if (!st) { var RM = root.DaeumRouteMap; st = RM && RM.state && RM.state.stops; }
      (st || []).forEach(function (it) { try { it.m.setVisible(!!on.hh); } catch (e) { /* 무시 */ } });
    }
    function onDrawn(map, N, state) {
      mk.forEach(function (o) { try { o.m.setMap(null); } catch (e) { /* 무시 */ } }); mk = [];
      if (iw) { try { iw.close(); } catch (e) { /* 무시 */ } }
      last = state || null;
      if (!m || !map || !N) return;
      iw = new N.InfoWindow({ content: "", borderWidth: 0, backgroundColor: "transparent", disableAnchor: true, pixelOffset: new N.Point(0, -14) });
      ["link", "senior"].forEach(function (layer) {
        m[layer].forEach(function (x) {
          if (x.lat == null) return;
          var mm = new N.Marker({ map: map, position: new N.LatLng(x.lat, x.lng), title: x.n, zIndex: layer === "link" ? 40 : 30, visible: !!on[layer],
            icon: { content: pinHtml(x, layer), anchor: new N.Point(15, 15) } });
          N.Event.addListener(mm, "click", function () { iw.setContent(iwHtml(x)); iw.open(map, mm); });
          mk.push({ m: mm, layer: layer });
        });
      });
      if (mapClick) { try { N.Event.removeListener(mapClick); } catch (e) { /* 무시 */ } } // 지도 판은 다시 쓰이므로 듣기를 쌓지 않는다
      mapClick = N.Event.addListener(map, "click", function () { try { iw.close(); } catch (e) { /* 무시 */ } });
      show();
    }
    paint();
    return { onDrawn: onDrawn, fallback: function () { var dl = box.querySelector(".nb-list"); if (dl) dl.open = true; box.classList.add("nb-solo"); }, model: m, box: box };
  }

  var api = { model: model, panelHtml: panelHtml, iwHtml: iwHtml, attach: attach, DEF: DEF, SENIOR_PER_HH: SENIOR_PER_HH };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DaeumNearby = api;
})(typeof window !== "undefined" ? window : globalThis);
