/* 닿음 S10l ③ 추천 «맞아요/아니에요» 현장 적합률(검토문서 N2).
   담당자가 연계 후보(서비스 추천)마다 한 번 누르면 이 기기(localStorage)에 남고,
   «최근 30건 현장 적합률»과 «다음 측정 표본»(아니에요 목록)을 만든다.
   - 한 가구·한 서비스에 표시는 하나(다시 누르면 바뀌고, 같은 것을 또 누르면 지운다).
   - 가구는 가상 가구 번호(id)만 남긴다 — 이름·상담 원문은 저장하지 않는다.
   - 실제 표시가 0건이면 «시연 예시(가상)»를 보여 주되 늘 «가상» 꼬리표를 단다. 실제가 1건이라도 생기면 예시는 빠진다.
   node 시험: officer/s10l3.test.js */
(function (root) {
  "use strict";
  var KEY = "daeum.officer.fit", WINDOW = 30, MAX = 300;
  var SOURCE = "출처: 담당자 표시 기록(이 기기)";

  // 시연 예시 — 가상 가구 번호·내장 서비스(officer.js BUILTIN_SERVICES) 기준. 실제 기록이 아니다.
  var DEMO = [
    ["B-048", "S02", "긴급복지지원", "yes"], ["B-048", "S04", "에너지바우처", "yes"], ["B-035", "S05", "노인맞춤돌봄서비스", "yes"],
    ["B-035", "S07", "국민취업지원제도", "no"], ["A-005", "S01", "기초생활보장 생계급여", "yes"], ["A-005", "S11", "채무조정 상담", "yes"],
    ["A-007", "S06", "재난적의료비 지원", "yes"], ["A-007", "S10", "드림스타트", "no"], ["A-019", "S12", "통합사례관리", "yes"],
    ["A-019", "S03", "주거급여", "yes"]
  ].map(function (r, i) {
    return { householdId: r[0], serviceId: r[1], serviceName: r[2], verdict: r[3], source: "rule", demo: true,
      at: new Date(Date.UTC(2026, 9, 20 + Math.floor(i / 2), 1 + i)).toISOString() };
  });

  function k(hid, sid) { return hid + "|" + sid; }
  // 표시 하나 넣기/바꾸기/지우기 — 순수 함수(목록을 새로 돌려준다, 최신이 앞)
  function mark(list, rec) {
    list = (list || []).filter(function (x) { return x && x.householdId && x.serviceId; });
    var old = null, rest = list.filter(function (x) { if (k(x.householdId, x.serviceId) === k(rec.householdId, rec.serviceId)) { old = x; return false; } return true; });
    if (old && old.verdict === rec.verdict) return rest; // 같은 것을 다시 누르면 취소
    var n = { householdId: String(rec.householdId), serviceId: String(rec.serviceId), serviceName: String(rec.serviceName || rec.serviceId),
      verdict: rec.verdict === "no" ? "no" : "yes", source: rec.source === "ai" ? "ai" : "rule", at: rec.at || new Date().toISOString() };
    return [n].concat(rest).slice(0, MAX);
  }
  function verdictOf(list, hid, sid) {
    var hit = (list || []).filter(function (x) { return k(x.householdId, x.serviceId) === k(hid, sid); })[0];
    return hit ? hit.verdict : null;
  }
  // 최근 30건 적합률. 실제 0건이면 예시로(demo:true)
  function summary(list) {
    var real = (list || []).filter(function (x) { return x && !x.demo; }), demo = !real.length;
    var src = (demo ? DEMO : real).slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    var recent = src.slice(0, WINDOW), yes = recent.filter(function (x) { return x.verdict === "yes"; }).length;
    return { n: recent.length, yes: yes, no: recent.length - yes, rate: recent.length ? Math.round(yes * 100 / recent.length) : null,
      demo: demo, total: src.length, misses: src.filter(function (x) { return x.verdict === "no"; }) };
  }

  // ── 화면(브라우저에서만) ──
  function lsGet() { try { var v = JSON.parse(root.localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function lsSet(v) { try { root.localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 화면은 그대로 */ } }
  var listeners = [];
  function changed() { listeners.forEach(function (f) { try { f(); } catch (e) { } }); }
  function h(tag, cls, text) { var e = root.document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // 추천 줄(li)에 «맞아요/아니에요» 두 단추를 붙인다
  function attach(li, ctx) {
    var box = h("div", "fit-row"); box.setAttribute("role", "group"); box.setAttribute("aria-label", ctx.serviceName + " 추천이 맞는지 표시");
    box.appendChild(h("span", "small muted", "현장에서 보니"));
    var bs = [["yes", "맞아요"], ["no", "아니에요"]].map(function (p) {
      var b = h("button", "fit-btn " + p[0], p[1]); b.type = "button"; b.setAttribute("data-h", "light");
      b.addEventListener("click", function () {
        lsSet(mark(lsGet(), { householdId: ctx.householdId, serviceId: ctx.serviceId, serviceName: ctx.serviceName, verdict: p[0], source: ctx.source }));
        paint(); changed();
      });
      box.appendChild(b); return [p[0], b];
    });
    function paint() { var v = verdictOf(lsGet(), ctx.householdId, ctx.serviceId); bs.forEach(function (x) { x[1].setAttribute("aria-pressed", String(v === x[0])); }); }
    paint(); li.appendChild(box);
  }

  // 적합률 고리 + 다음 측정 표본
  function render(box) {
    if (!box) return;
    var s = summary(lsGet()); box.textContent = "";
    var hd = h("h3", null, "추천 현장 적합률 ");
    hd.appendChild(h("small", "tag", s.demo ? "시연 예시 · 가상" : "최근 " + WINDOW + "건"));
    box.appendChild(hd);
    var row = h("div", "fit-top"), pct = s.rate == null ? 0 : s.rate;
    var ring = h("div", "fit-ring"); ring.style.setProperty("--p", String(pct)); ring.setAttribute("aria-hidden", "true");
    ring.appendChild(h("b", "num", s.rate == null ? "—" : pct + "%"));
    row.appendChild(ring);
    var txt = h("div");
    txt.appendChild(h("p", "fit-kpi", (s.demo ? "[가상] " : "") + "최근 " + s.n + "건 현장 적합률 " + (s.rate == null ? "—" : s.rate + "%") + "(" + s.n + "건)"));
    txt.appendChild(h("p", "small muted", "맞아요 " + s.yes + " · 아니에요 " + s.no + (s.demo ? " — 아직 이 기기에 표시한 기록이 없어 가상 예시를 보여 줍니다. 요약의 연계 후보에서 «맞아요/아니에요»를 누르면 실제 기록으로 바뀝니다." : "")));
    txt.appendChild(h("p", "small src-tag", SOURCE + (s.demo ? " · 지금 값은 가상 예시" : "")));
    row.appendChild(txt); box.appendChild(row);
    var d = h("details", "fit-miss"), sm = h("summary", null, "다음 측정 표본(아니에요) " + s.misses.length + "건");
    d.appendChild(sm);
    var ul = h("ul", "links");
    s.misses.slice(0, 20).forEach(function (m) {
      var li = h("li"); li.appendChild(h("b", null, "가구 " + m.householdId + (m.demo ? " (가상)" : "")));
      li.appendChild(h("span", "small", " · " + m.serviceName + " · " + (m.source === "ai" ? "AI 추천" : "규칙 추천") + " · " + String(m.at).slice(5, 10)));
      ul.appendChild(li);
    });
    if (!s.misses.length) ul.appendChild(h("li", "muted", "틀린 추천이 아직 없습니다."));
    d.appendChild(ul);
    d.appendChild(h("p", "small muted", "틀린 추천은 다음 AI 검증 때 측정 표본(가상 사연)으로 다시 만들어 넣습니다. 가구 이름·상담 원문은 남기지 않습니다."));
    box.appendChild(d);
  }

  var api = { KEY: KEY, WINDOW: WINDOW, SOURCE: SOURCE, DEMO: DEMO, mark: mark, verdictOf: verdictOf, summary: summary,
    attach: attach, render: render, list: lsGet, onChange: function (f) { listeners.push(f); } };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.DaeumFit = api;
})(typeof window !== "undefined" ? window : this);
