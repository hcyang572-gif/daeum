/* 닿음 도움 요청 저장소 — 국민 창구가 쓰고 공무원 창구가 읽는다.
   시연에서는 같은 브라우저의 localStorage(키: DAEUM_CONFIG.requestsKey = "daeum.requests")에 JSON 배열로 둔다.
   형식은 shared/README.md «도움 요청 형식». 실제 운영에서는 같은 형식을 Supabase 테이블로 옮긴다. */
(function () {
  "use strict";
  var KEY = (window.DAEUM_CONFIG && window.DAEUM_CONFIG.requestsKey) || "daeum.requests";

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function pad(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }
  function nextId(list, now) {
    var day = now.getFullYear() + pad(now.getMonth() + 1, 2) + pad(now.getDate(), 2);
    var prefix = "REQ-" + day + "-";
    var max = 0;
    list.forEach(function (r) {
      if (r && typeof r.id === "string" && r.id.indexOf(prefix) === 0) max = Math.max(max, parseInt(r.id.slice(prefix.length), 10) || 0);
    });
    return prefix + pad(max + 1, 4);
  }

  window.DaeumRequests = {
    key: KEY,
    list: read,
    get: function (id) { return read().filter(function (r) { return r.id === id; })[0] || null; },
    /** 새 요청 저장. 성공하면 저장된 객체(id·createdAt·status 채움), 실패하면 null */
    add: function (req) {
      var list = read();
      var now = new Date();
      var rec = Object.assign({ v: 1 }, req, { id: nextId(list, now), createdAt: now.toISOString(), status: "new", history: [{ at: now.toISOString(), status: "new", by: "citizen" }] });
      list.push(rec);
      return write(list) ? rec : null;
    },
    /** 상태 변경(공무원 창구용): status ∈ new|seen|visiting|done|cancelled */
    setStatus: function (id, status, by, note) {
      var list = read(), hit = null;
      list.forEach(function (r) {
        if (r.id === id) {
          r.status = status;
          (r.history = r.history || []).push({ at: new Date().toISOString(), status: status, by: by || "officer", note: note || "" });
          hit = r;
        }
      });
      return hit && write(list) ? hit : null;
    },
    /** 다른 탭에서 바뀌면 알려 준다(공무원 창구 실시간 반영용). 해제 함수 반환 */
    onChange: function (fn) {
      function h(e) { if (e.key === KEY) fn(read()); }
      window.addEventListener("storage", h);
      return function () { window.removeEventListener("storage", h); };
    }
  };
})();
