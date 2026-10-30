/* 닿음 S10h ⑧·② — 방문 순서를 앞당기는 두 신호(화면과 무관한 순수 함수, ⚙️ 파로 2026-10-30)
   브라우저: window.DaeumAlerts / node: require.  자료: data/alerts_demo.json(가상 시나리오, 실시간 호출·서비스키 없음)
   ⑧ 무반응 신호: 협약 시 AI 스피커·IoT 돌봄 기관이 보내는 «일정 시간 무반응» 가구 → 명단·오늘 동선 맨 위.
      닿음은 센서를 만들지 않는다 — 받은 신호를 순서에만 반영한다(상주시 협약 미확인 → «협약 시»).
   ② 폭염·한파 특보: 기상청 특보코드 12(폭염)·3(한파)가 발효된 날 75세 이상 홀로 사는 집(명단 특성 single_elderly와 같은 기준)을 그다음 위로.
   순서: 무반응+특보 대상(이유 두 줄) → 무반응 → 특보 대상 → 나머지(기존 순서: 담당자 고정 → 지역 신호 → 명단 순). 같은 칸 안에서는 기존 순서 그대로. */
(function (root) {
  "use strict";
  var DATA = null;
  var CODES = { 12: "heat", 3: "cold" };
  var OLD_AGE = 75; // officer.js traitsOf «75세 이상 1인가구»와 같은 기준

  function set(d) { DATA = d || null; return DATA; }
  function get() { return DATA; }

  // 특보 대상: 홀로 사는 75세 이상
  function vulnerable(h) { return !!(h && h.single && h.members && h.members[0] && h.members[0].age >= OLD_AGE); }

  /** 오늘 적용할 특보(가상 시나리오). choice = "heat"|"cold"|"off"|undefined(=시나리오 기본값). 특보코드 3·12 아니면 null */
  function weather(d, choice) {
    var w = d && d.weather; if (!w || !w.scenarios) return null;
    var k = choice || w.active; if (!k || k === "off") return null;
    var s = w.scenarios[k]; if (!s || !CODES[s.code]) return null;
    return { key: CODES[s.code], code: s.code, level: s.level, name: s.name, from: s.from, region: w.region };
  }

  function noRespMap(d) {
    var m = {}; ((d && d.noResponse && d.noResponse.items) || []).forEach(function (x) { if (x && x.householdId) m[x.householdId] = x; });
    return m;
  }
  function noRespLine(x) { return "무반응 " + x.hours + "시간 — " + x.device + " 신호(협약 기관, 가상)"; }
  function heatLine(w) { return w.name + " 발효(시연 시나리오, 가상) — 75세 이상 홀로 사는 집"; }

  /**
   * list = 기존 순서의 항목들, getH(item) → 가구. opts = { weather: weather() 결과 | null }
   * → 새 배열(원본 불변). 각 항목에 alert = { rank, noResp, heat, lines:[이유…] } (해당 없으면 null)
   */
  function prioritize(list, getH, d, opts) {
    var nr = noRespMap(d), w = opts && opts.weather || null;
    var wrapped = (list || []).map(function (it, i) {
      var h = getH(it), x = h && nr[h.id], hot = !!(w && vulnerable(h));
      var lines = [];
      if (x) lines.push(noRespLine(x));
      if (hot) lines.push(heatLine(w));
      var rank = x && hot ? 0 : x ? 1 : hot ? 2 : 9;
      return { it: it, i: i, alert: lines.length ? { rank: rank, noResp: !!x, heat: hot, lines: lines } : null };
    });
    wrapped.sort(function (a, b) { return ((a.alert ? a.alert.rank : 9) - (b.alert ? b.alert.rank : 9)) || (a.i - b.i); });
    return wrapped.map(function (x) { x.it.alert = x.alert; return x.it; });
  }

  /** 오늘 동선에 자동으로 넣을 무반응 가구 id(명단에 있는 집만, 오래 무반응인 순). has(id) → 명단에 있나 */
  function todayIds(d, has) {
    var items = ((d && d.noResponse && d.noResponse.items) || []).filter(function (x) { return !has || has(x.householdId); });
    return items.slice().sort(function (a, b) { return b.hours - a.hours; }).map(function (x) { return x.householdId; });
  }

  // 출처 꼬리표(숫자·목록 옆)
  function sourceNoResp(d) {
    var n = d && d.noResponse || {};
    return "가상 신호(시연) · 실제 수신은 " + (n.partner || "협약 기관") + "과 협약하고 대상자 동의를 받은 뒤의 일입니다(상주시 협약 미확인 — 협약 시). 닿음은 센서를 만들지 않고 받은 신호를 방문 순서에만 씁니다.";
  }
  function sourceWeather(d) {
    var s = d && d.weather && d.weather.source; if (!s) return "";
    return "출처: " + s.org + " «" + s.name + "»(공공데이터포털 " + s.portal + ") 특보 코드 체계(" + s.codes + ") · 오늘 특보는 시연 시나리오(가상, 실시간 호출 없음)";
  }

  var api = { set: set, get: get, vulnerable: vulnerable, weather: weather, prioritize: prioritize, todayIds: todayIds,
    noRespMap: noRespMap, sourceNoResp: sourceNoResp, sourceWeather: sourceWeather, OLD_AGE: OLD_AGE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DaeumAlerts = api;
})(typeof window !== "undefined" ? window : this);
