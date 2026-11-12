/* 닿음 S12-m 연계 카드(⚙️ 파로, 2026-11-12) — 집 앞 요약(가구 카드) 아래 «치매·마음건강·돌봄» 한 줄 + 같은 읍면동 연계처.
   데이터: data/public_extra.js(window.__DAEUM_PUBLIC_EXTRA__, 🔵 소라 f562894 — 상주 공공데이터 712건, 키 없는 정적 스냅샷).
   · 좌표: data/public_extra_geo.js(행정안전부 주소정보누리집 좌표제공 API 변환 2026-11-12, 692건 성공·16건 실패 = 모두 2018 경로당, data/tools/geocode_public_extra_juso.py) + 원본 좌표 4건 → 같은 읍면동 안에서 가구와 가까운 순(직선거리 «약»).
     좌표 못 받은 곳·가구 좌표 없을 때는 읍면동 묶음 그대로(뒤로).
   · 경로당 581곳은 2018-06-30 기준(stale) → 늘 «방문 전 확인» 표시.
   · 판단은 담당 공무원 — 점수·추천 없음, 가구 사정에 맞는 칸만 눈에 띄게(나이 65세 이상·혼자 사심).
   ⛔ 주민 화면·신고 접수 없음 · 서버 전송 0 · 가구 개인정보는 화면 안에서만 씀. */
(function (root) {
  "use strict";
  var KIND_WORD = { // 시설 종류 → 쉬운 말
    "치매안심센터": "치매", "치매안심센터 분소": "치매", "정신건강복지센터": "마음건강",
    "재가노인복지시설": "방문 돌봄", "노인돌봄 · 재가노인복지시설": "방문 돌봄", "노인돌봄 · 노인여가복지시설": "어르신 복지관",
    "노인의료복지시설 · 노인요양시설": "요양원", "노인의료복지시설 · 노인요양공동생활가정": "요양원(소규모)", "노인의료복지시설 · 노인전문병원": "요양원",
    "우체국": "우체국", "다함께돌봄센터": "아이 돌봄", "아동복지시설 · 지역아동센터": "아이 돌봄", "경로당": "경로당"
  };
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  /** 읍면동 이름 맞추기 — 2020년 «사벌면 → 사벌국면» 개칭 반영, 공백 제거 */
  function normEmd(s) { s = String(s || "").replace(/\s+/g, ""); return s === "사벌면" ? "사벌국면" : s; }
  function word(k) {
    if (KIND_WORD[k]) return KIND_WORD[k];
    if (/장애/.test(k)) return "장애인 복지";
    if (/아동/.test(k)) return "아이 돌봄";
    if (/정신/.test(k)) return "마음건강";
    if (/노인/.test(k)) return "어르신 복지";
    return String(k || "복지시설").split(" · ")[0];
  }
  function data(px) { var d = px || root.__DAEUM_PUBLIC_EXTRA__; return d && d.items && d.items.length ? d : null; }
  function geoOf(g) { return g || root.__DAEUM_PUBLIC_GEO__ || null; }
  /** 항목 좌표: 원본(la/ln) 우선, 없으면 주소정보누리집 변환본 */
  function ll(d, x, g) { if (x.la != null && x.ln != null) return { lat: x.la, lng: x.ln }; var i = d.items.indexOf(x), v = g && g.by_index ? g.by_index[String(i)] : null; return v ? { lat: v[0], lng: v[1] } : null; }
  function km(a, b) { var R = 6371, r = Math.PI / 180, dl = (b.lat - a.lat) * r, dn = (b.lng - a.lng) * r, q = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dn / 2) * Math.sin(dn / 2); return 2 * R * Math.asin(Math.sqrt(q)); }
  /** 가구 좌표(시연 가구 x·y km 격자 → 위경도, officer/route_plan.js) */
  function hhLL(h) { if (h && h.lat != null && h.lng != null) return { lat: h.lat, lng: h.lng }; var RP = root.DaeumRoutePlan; return RP && RP.toLatLng && h && h.x != null ? RP.toLatLng(h) : null; }
  function srcName(d, id) { var s = (d.sources || []).filter(function (x) { return x.id === id; })[0]; return s ? s.name : id; }
  function tel(t) { return t ? '<a class="lk-tel" href="tel:' + esc(String(t).replace(/[^0-9]/g, "")) + '">' + esc(t) + "</a>" : ""; }

  /** 가구 사정 → 눈에 띄게 할 칸(판단 아님, 순서·강조만) */
  function needOf(h) {
    var ms = (h && h.members) || [], old = ms.some(function (m) { return m.age != null && m.age >= 65; });
    var alone = !!(h && h.single);
    return { dementia: old, mind: alone, care: old && alone };
  }

  /** 순수 계산 — 가구 h, 공공데이터 px → { emd, dementia, mind, care[], near:{others[], seniorCtr[]} } */
  function pick(h, px, geo, home) {
    var d = data(px); if (!d || !h) return null;
    var g = geoOf(geo), me = home || hhLL(h);
    function dist(x) { var p = me && ll(d, x, g); x = Object.assign({}, x); x.km = p ? +km(me, p).toFixed(1) : null; return x; }
    function near(a) { return a.map(dist).sort(function (p, q) { return (p.km == null) - (q.km == null) || (p.km || 0) - (q.km || 0); }); }
    var emd = normEmd(h.area), it = d.items;
    var dem = near(it.filter(function (x) { return /^치매안심센터/.test(x.k); }));
    var demNear = me ? (dem[0] && dem[0].km != null ? dem[0] : null) : dem.filter(function (x) { return normEmd(x.emd) === emd; })[0] || null;
    var demMain = dem.filter(function (x) { return x.k === "치매안심센터"; })[0] || dem[0] || null;
    var mind = near(it.filter(function (x) { return x.k === "정신건강복지센터"; }))[0] || null;
    var care = near(it.filter(function (x) { return x.src === "15004317"; }));
    var same = near(it.filter(function (x) { return normEmd(x.emd) === emd && !/^치매안심센터/.test(x.k); }));
    var others = same.filter(function (x) { return x.k !== "경로당"; });
    var senior = same.filter(function (x) { return x.k === "경로당"; });
    return { emd: emd, need: needOf(h), dementia: demNear || demMain, dementiaNear: !!demNear, dementiaMain: demMain,
      mind: mind, care: care, others: others, seniorCtr: senior, fetched: d.fetched, geo: !!(me && g), geoSrc: g ? g.source : "" };
  }

  function chip(cls, lb, name, sub, on) {
    return '<span class="lk-c ' + cls + (on ? " on" : "") + '"><b>' + esc(lb) + "</b><span>" + esc(name) + (sub ? " " + sub : "") + "</span></span>";
  }
  function row(x, d) {
    var stale = !!x.stale;
    return '<li class="' + (stale ? "stale" : "") + '"><span class="lk-k">' + esc(word(x.k)) + "</span><div><b>" + esc(x.n) + "</b><small>" + esc(String(x.a || "").replace(/^경상북도\s*|^경북\s*/, "")) + "</small>" +
      (x.km != null ? '<span class="lk-km">약 ' + x.km + " km</span>" : "") + (stale ? '<em class="lk-stale">방문 전 확인 · ' + esc(x.base) + " 명단</em>" : "") + "</div>" + (x.tel ? tel(x.tel) : "") + "</li>";
  }

  /** 집 앞 요약에 끼우는 카드 HTML(데이터 없으면 빈 문자열) */
  function html(h, px, geo) {
    var d = data(px), p = pick(h, d, geo); if (!p) return "";
    var n = p.need, dm = p.dementia;
    var careNear = p.others.filter(function (x) { return /재가|돌봄/.test(x.k); }).length;
    var line = '<div class="lk-line" role="list">' +
      (dm ? chip("dem", "치매", dm.n.replace(/^(경상북도)?상주시치매안심센터\s*/, "치매안심센터 ").trim() + (dm.km != null ? " · 약 " + dm.km + "km" : ""), tel(dm.tel), n.dementia) : "") +
      (p.mind ? chip("mind", "마음건강", "정신건강복지센터", tel(p.mind.tel), n.mind) : "") +
      chip("care", "돌봄", careNear ? "같은 동네 방문 돌봄 " + careNear + "곳" : "어르신 돌봄 기관 " + p.care.length + "곳", "", n.care) +
      "</div>";
    var ids = {}; p.others.concat(p.seniorCtr).forEach(function (x) { ids[x.src] = 1; });
    if (dm) ids[dm.src] = 1; if (p.mind) ids[p.mind.src] = 1; p.care.forEach(function (x) { ids[x.src] = 1; });
    var srcs = Object.keys(ids).map(function (id) { return srcName(d, id) + "(" + id + ")"; });
    var careList = p.care.map(function (x) { return row(x, d); }).join("");
    var list = p.others.map(function (x) { return row(x, d); }).join("");
    var sc = p.seniorCtr;
    return '<section class="lkc blk" aria-label="연계처">' +
      '<div class="lk-h"><b>연계처 · ' + esc(p.emd) + "</b><span>판단은 담당자</span></div>" + line +
      '<details class="lk-more"><summary>같은 동네 연계처 ' + p.others.length + "곳 · 경로당 " + sc.length + "곳</summary>" +
      (list ? '<ul class="lk-l">' + list + "</ul>" : '<p class="lk-none">같은 읍면동에 등록된 시설이 없습니다. 위의 시 전체 기관으로 연결합니다.</p>') +
      (careList ? '<p class="lk-sub">어르신 돌봄 기관(시 전체)</p><ul class="lk-l">' + careList + "</ul>" : "") +
      (sc.length ? '<p class="lk-sub">경로당 — 2018년 명단이라 문을 닫았거나 옮겼을 수 있습니다. 방문 전 확인</p><ul class="lk-l">' + sc.map(function (x) { return row(x, d); }).join("") + "</ul>" : "") +
      "</details>" +
      '<p class="srcline">출처: <i class="src-ico" aria-hidden="true"></i>' + esc(srcs.join(" · ")) + " · " + esc(p.fetched || "") + " 수집 · " + (p.geo ? "위치: 주소정보누리집(행정안전부) 좌표 · 거리는 직선거리 «약» · 위치를 못 찾은 곳은 읍면동으로 묶어 뒤에" : "자료에 위치가 없는 곳은 읍면동으로 묶었습니다") + "</p></section>";
  }

  var api = { pick: pick, html: html, normEmd: normEmd, word: word, needOf: needOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DaeumLink = api;
})(typeof window !== "undefined" ? window : globalThis);
