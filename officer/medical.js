/* 닿음 S10h ③ 가까운 병원·약국 — 방문 시각에 문 연 곳 먼저(화면과 무관한 순수 함수, ⚙️ 파로 2026-10-30)
   브라우저: window.DaeumMedical / node: require.  자료: data/medical_sangju.json(국립중앙의료원 공개 자료를 미리 받은 것, 실시간 호출·키 없음)
   진료시간 h = 월~일·공휴일 8칸 «0830-1800»(빈칸 = 그날 진료 정보 없음 → 닫힘으로 본다).
   문 엶 계산은 우리가족 매니저 지도층(ft-build43 functions/map_layers.js isOpenAt)과 같은 규칙: KST 기준, 자정 넘김 운영은 어제 시작분도 봄,
   공휴일이면 8번째 칸(비었으면 요일 칸). 거리는 가상 가구 좌표 기준 직선거리(추정). */
(function (root) {
  "use strict";
  var DATA = null;
  var DAY = ["월", "화", "수", "목", "금", "토", "일"];
  function set(d) { DATA = d || null; return DATA; }
  function get() { return DATA; }

  function mins(s) { return +s.slice(0, 2) * 60 + +s.slice(2, 4); }
  function span(txt) {
    if (!txt || !/^\d{4}-\d{4}$/.test(txt)) return null;
    var p = txt.split("-"), a = mins(p[0]), b = mins(p[1]);
    if (b <= a) b += 1440;
    return [a, b];
  }
  // KST 요일(월=0..일=6)·분
  function kst(now) {
    var k = new Date(now.getTime() + 9 * 3600000), d = k.getUTCDay();
    return { idx: d === 0 ? 6 : d - 1, min: k.getUTCHours() * 60 + k.getUTCMinutes() };
  }
  function dayIdx(h, now, holiday) { var p = kst(now); return holiday && h[7] ? 7 : p.idx; }
  /** now 시각에 문을 열었나 */
  function isOpenAt(h, now, holiday) {
    if (!Array.isArray(h) || h.length < 7) return false;
    var p = kst(now), t = span(h[dayIdx(h, now, holiday)]);
    if (t && p.min >= t[0] && p.min < t[1]) return true;
    var y = span(h[(p.idx + 6) % 7]);
    return !!(y && y[1] > 1440 && p.min < y[1] - 1440);
  }
  /** 그날 진료시간 글자 «08:30~18:00» 또는 «오늘 진료 정보 없음» */
  function hoursText(h, now, holiday) {
    var i = dayIdx(h, now, holiday), t = h && h[i];
    var lbl = i === 7 ? "공휴일" : DAY[i] + "요일";
    if (!t || !/^\d{4}-\d{4}$/.test(t)) return lbl + " 진료 정보 없음";
    return lbl + " " + t.slice(0, 2) + ":" + t.slice(2, 4) + "~" + t.slice(5, 7) + ":" + t.slice(7, 9);
  }
  function km(a, b) { // 하버사인(직선)
    var R = 6371, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLn = (b.lng - a.lng) * r;
    var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLn / 2) * Math.sin(dLn / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function isPharmacy(x) { return x.k === "약국"; }
  /**
   * 가까운 곳 n개(기본 3). 문 연 곳 먼저 → 가까운 순. 약국 1곳·병의원 1곳은 (있으면) 꼭 넣는다.
   * at = {lat,lng}, opts = { now: Date, holiday: bool, n }
   * → [{ name, kind, tel, km, open, hours }]
   */
  function nearby(d, at, opts) {
    opts = opts || {}; var now = opts.now || new Date(), n = opts.n || 3, hol = !!opts.holiday;
    var all = ((d && d.items) || []).map(function (x) {
      return { x: x, km: km(at, { lat: x.la, lng: x.ln }), open: isOpenAt(x.h, now, hol) };
    });
    all.sort(function (a, b) { return (b.open - a.open) || (a.km - b.km); });
    var pick = [], ph = all.filter(function (y) { return isPharmacy(y.x); })[0], cl = all.filter(function (y) { return !isPharmacy(y.x); })[0];
    [ph, cl].forEach(function (y) { if (y) pick.push(y); });
    all.forEach(function (y) { if (pick.length < n && pick.indexOf(y) < 0) pick.push(y); });
    pick = pick.slice(0, n).sort(function (a, b) { return (b.open - a.open) || (a.km - b.km); });
    return pick.map(function (y) { return { name: y.x.n, kind: y.x.k, tel: y.x.t, km: +y.km.toFixed(1), open: y.open, hours: hoursText(y.x.h, now, hol) }; });
  }
  function sourceLine(d) {
    var s = d && d.source; if (!s) return "";
    return "출처: " + s.org + " «" + s.name + "»(" + s.portal + ") · 조회일 " + s.fetched + " · 거리는 가상 가구 위치 기준 직선거리(추정) · 진료시간은 바뀔 수 있으니 전화로 확인";
  }

  var api = { set: set, get: get, isOpenAt: isOpenAt, hoursText: hoursText, km: km, nearby: nearby, sourceLine: sourceLine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DaeumMedical = api;
})(typeof window !== "undefined" ? window : this);
