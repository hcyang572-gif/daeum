/* 닿음 국민 창구 ⑥ 신청 준비물 체크리스트 · ⑦ 내 요청 진행 상황 — S9b-1(⚙️ 파로, 2026-10-29). 화면 그리기·CSS 없음.
   이름공간 window.DaeumFeatures.checklist / .progress. 데이터: citizen/data/services.json(doc_sets·services[].docs·apply·contact·url),
   shared/requests.js(DaeumRequests — 같은 localStorage «daeum.requests»).

   ── S9b-2 마운트 약속 ─────────────────────────────────────────────
   [checklist] F.checklist.build(services, docSets, {proxy, checked}) → Checklist =
     { items:[{ key, text, checked, forServices:[이름…] }], services:[{id,name,apply,contact,url}],
       done, total, ready:bool, tip, note }
     F.checklist.toggle(checked, key) → 새 checked 객체 (저장: F.checklist.save(requestIdOr"draft", checked))
   [progress]  F.progress.of(request, now) → Progress =
     { id, title, cancelled:bool, finished:bool, current:{key,label,say},
       steps:[{ key:"new"|"seen"|"visiting"|"done", label, say, at:"YYYY-MM-DD HH:mm"|null, state:"done"|"current"|"todo" }],
       lastUpdate, waitedDays, contactLine }
     F.progress.mine(allRequests, myIds) → [Progress…] (최근 것 먼저)
     F.progress.remember(id) / F.progress.myIds() — 이 기기에서 낸 요청 번호 기억(localStorage «daeum.citizen.mine»)
   ──────────────────────────────────────────────────────────────── */
(function (root, factory) {
  var ns = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = ns;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  var F = root.DaeumFeatures = root.DaeumFeatures || {};
  var K_CHECK = "daeum.citizen.checklist", K_MINE = "daeum.citizen.mine";
  function lsGet(k, d) { try { var v = root.localStorage && root.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function stamp(iso) { if (!iso) return null; var d = new Date(iso); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function keyOf(t) { return String(t).replace(/\s+/g, "").replace(/[()·,]/g, ""); }

  // ── ⑥ 신청 준비물 체크리스트 ─────────────────────────────
  function expand(docs, sets) {
    var out = [];
    (docs || []).forEach(function (d) { if (String(d).charAt(0) === "$") (sets[d.slice(1)] || []).forEach(function (x) { out.push(x); }); else out.push(d); });
    return out;
  }
  F.checklist = {
    /** services: 고른 서비스 객체 배열(services.json services[]), docSets: services.json doc_sets */
    build: function (services, docSets, o) {
      o = o || {}; docSets = docSets || {};
      var checked = o.checked || {}, map = {}, order = [];
      (services || []).forEach(function (s) {
        expand(s.docs, docSets).forEach(function (t) {
          var k = keyOf(t);
          if (!map[k]) { map[k] = { key: k, text: t, checked: !!checked[k], forServices: [] }; order.push(k); }
          if (map[k].forServices.indexOf(s.name) < 0) map[k].forServices.push(s.name);
        });
      });
      if (o.proxy && order.length) (docSets.proxy || []).forEach(function (t) {
        var k = keyOf(t); if (!map[k]) { map[k] = { key: k, text: t, checked: !!checked[k], forServices: ["대신 신청"] }; order.push(k); }
      });
      var items = order.map(function (k) { return map[k]; });
      var done = items.filter(function (i) { return i.checked; }).length;
      var means = (services || []).some(function (s) { return s.means_tested; });
      return {
        items: items,
        services: (services || []).map(function (s) { return { id: s.id, name: s.name, apply: s.apply || "", contact: s.contact || "", url: s.url || "" }; }),
        done: done, total: items.length, ready: items.length > 0 && done === items.length,
        tip: means ? "소득·재산을 보는 지원이 있어요. 통장 사본과 동의서를 챙기면 한 번에 접수돼요." : "신분증만 있으면 되는 지원이 많아요.",
        note: "서류는 기관 사정에 따라 달라질 수 있어요. 가기 전에 문의 전화로 한 번 확인하세요."
      };
    },
    toggle: function (checked, key) { var c = Object.assign({}, checked || {}); if (c[key]) delete c[key]; else c[key] = true; return c; },
    load: function (id) { return (lsGet(K_CHECK, {}) || {})[id || "draft"] || {}; },
    save: function (id, checked) { var all = lsGet(K_CHECK, {}) || {}; all[id || "draft"] = checked || {}; return lsSet(K_CHECK, all); }
  };

  // ── ⑦ 내 요청 진행 상황 ──────────────────────────────────
  var STEPS = [
    { key: "new", label: "요청 접수", say: "요청이 잘 들어갔어요. 담당자가 곧 확인해요." },
    { key: "seen", label: "담당자 확인", say: "담당 공무원이 내용을 읽고 맞는 도움을 찾고 있어요." },
    { key: "visiting", label: "방문·상담", say: "담당자가 연락하거나 찾아가 이야기를 들어요." },
    { key: "done", label: "연계 완료", say: "도움을 이어 드렸어요. 더 필요하면 다시 요청하세요." }
  ];
  var IDX = { "new": 0, seen: 1, visiting: 2, done: 3 };
  function of(r, now) {
    now = now ? new Date(now) : new Date();
    var hist = r.history || [], cancelled = r.status === "cancelled";
    var cur = cancelled ? -1 : (IDX[r.status] != null ? IDX[r.status] : 0);
    var steps = STEPS.map(function (s, i) {
      var h = hist.filter(function (x) { return x.status === s.key; })[0];
      var at = h ? h.at : (i === 0 ? r.createdAt : null);
      return { key: s.key, label: s.label, say: s.say, at: stamp(at), state: cancelled ? (at ? "done" : "todo") : i < cur ? "done" : i === cur ? "current" : "todo" };
    });
    var last = hist.length ? hist[hist.length - 1].at : r.createdAt;
    var CP = { visit: "집으로 찾아가요", phone: "전화로 연락드려요", center: "행정복지센터에서 만나요" };
    return {
      id: r.id, title: (r.matched && r.matched[0] ? r.matched[0].name + " 등 " : "") + "도움 요청",
      cancelled: cancelled, finished: r.status === "done",
      current: cancelled ? { key: "cancelled", label: "취소함", say: "요청을 취소했어요. 필요하면 언제든 다시 요청하세요." } : { key: STEPS[cur].key, label: STEPS[cur].label, say: STEPS[cur].say },
      steps: steps, lastUpdate: stamp(last),
      waitedDays: Math.max(0, Math.floor((now - new Date(r.createdAt)) / 86400000)),
      contactLine: (r.region ? r.region + " 행정복지센터 담당자가 " : "담당자가 ") + (CP[r.contactPref] || "연락드려요")
    };
  }
  F.progress = {
    STEPS: STEPS,
    of: of,
    mine: function (all, ids, now) {
      ids = ids || [];
      return (all || []).filter(function (r) { return ids.indexOf(r.id) >= 0; })
        .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }).map(function (r) { return of(r, now); });
    },
    myIds: function () { var v = lsGet(K_MINE, []); return Array.isArray(v) ? v : []; },
    remember: function (id) { var v = F.progress.myIds(); if (id && v.indexOf(id) < 0) v.push(id); lsSet(K_MINE, v.slice(-20)); return v; }
  };
  return F;
});
