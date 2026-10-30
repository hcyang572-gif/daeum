/* 닿음 공무원 창구 — 기능 모듈(features.js·report.js)을 미르 C 관제 자리에 연결 — S9b-2(⚙️ 파로, 2026-10-29)
   - 상태는 officer.js(window.DaeumOfficer) 한 곳, 계산은 DaeumFeatures 한 곳, 여기서는 «그리기와 단추»만.
   - 마크업은 tokens.css·officer.css 에 이미 있는 클래스(d-card·d-tag·d-btn·pane·slot-list·kpi·rank·grid·chips·note·ghost·mini)만 쓴다.
   - officer.js 가 보내는 신호: daeum:officer-show {tab} · daeum:officer-summary {...} · daeum:officer-link */
(function () {
  "use strict";
  var F = window.DaeumFeatures, O = null, REQ = window.DaeumRequests;
  if (!F || !F.today) return;

  // ── 작은 도구 ───────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function q(root, sel) { return root ? root.querySelector(sel) : null; }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "text") e.textContent = v;
      else if (k === "class") e.className = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function clear(e) { if (e) e.textContent = ""; return e; }
  function empty(text) { return h("li", { class: "d-slot", text: text }); }
  function btn(label, on, cls, hp) { return h("button", { type: "button", class: cls || "ghost mini", "data-h": hp || "light", onclick: on, text: label }); }
  function haptic(k) { if (window.DaeumUI) DaeumUI.haptic(k); }
  function st(name, d) { return F.store.get(name, d); }
  function put(name, v) { F.store.set(name, v); }
  // 화면낭독기에 알리는 줄: 지금 보이는 상태 줄(#mountStatus*) 하나, 없으면 몸통 끝의 공용 줄
  function say(msg) {
    var s = [].filter.call(document.querySelectorAll('[id^="mountStatus"]'), function (x) { return x.offsetParent !== null; })[0];
    if (!s) { s = $("mountStatusG") || document.body.appendChild(h("p", { id: "mountStatusG", class: "sr", role: "status", "aria-live": "polite" })); }
    s.textContent = ""; setTimeout(function () { s.textContent = msg; }, 30);
  }
  function copy(text) {
    function fb() {
      var t = h("textarea", { "aria-hidden": "true" }); t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (e) { /* 무시 */ } t.remove();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(fb); else fb();
    say("복사했습니다. 붙여 넣을 곳에서 Ctrl+V 하세요."); haptic("success");
  }
  var CH = { visit: "방문", phone: "전화", center: "내방", ai: "AI 초기상담 결과" };
  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function download(name, text, type) {
    var blob = new Blob(["﻿" + text], { type: (type || "text/csv") + ";charset=utf-8" }); // 한글 엑셀이 깨지지 않게 BOM
    var a = h("a", { href: URL.createObjectURL(blob), download: name }); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    say("파일을 내려받았습니다 — " + name); haptic("success");
  }
  // 읍면동 담당자 화면·보고 = «자기 동» 기준(현장 현실성 10-29). 시군구 전체는 아래 수요 보드(읍면 × 서비스)가 보여 준다.
  function homeArea() { return F.report && F.report.homeArea ? F.report.homeArea(households()) : null; }

  // ── 공통 입력 묶음 ─────────────────────────────────────
  function households() { return O.rows().map(function (r) { return r.h; }); }
  function base(now) {
    var D = O.data();
    return { households: households(), areas: D.areas, office: D.meta.office, requests: REQ.list(),
      attempts: st("attempts", []), tips: st("tips", []), picked: O.picked(), links: O.links(),
      outcomes: st("outcomes", {}), consults: st("consults", []), now: now || new Date() };
  }

  // ── ① 오늘 할 일 ───────────────────────────────────────
  function todayItem(it) {
    var li = h("li", { class: it.overdue ? "is-over" : null, "data-req": it.kind === "request" ? it.requestId : null }); // data-req: shared/switcher.js «방금 온 신호» 강조(S10m)
    var tag = it.urgent ? h("span", { class: "d-tag neg", text: "긴급" }) : it.overdue ? h("span", { class: "d-tag warn", text: "기한 지남" }) : null;
    var body = h("div", { class: "grow" }, [h("b", { text: it.label }), tag ? " " : null, tag,
      h("div", { class: "small", text: it.area + " · " + it.why + (it.due ? " · 기한 " + it.due.slice(5) : "") + (it.channel ? " · " + (CH[it.channel] || it.channel) : "") })]);
    li.appendChild(body);
    var acts = h("div", { class: "acts" });
    if (it.kind === "request") {
      if (F.reply) acts.appendChild(btn("답변 초안", function () { toggleReply(li, it.requestId); }));
      var r = REQ.get(it.requestId);
      if (r && r.status === "new") acts.appendChild(btn("확인함", function () { REQ.setStatus(it.requestId, "seen", "officer", "오늘 할 일에서 확인"); haptic("success"); O.refresh(); }));
    } else {
      if (F.visitCard) acts.appendChild(btn("방문 전 카드", function () { openCard(it.householdId || it.id); }));
      acts.appendChild(btn("기록", function () { goContacts(it.householdId || it.id); }));
    }
    li.appendChild(acts);
    return li;
  }
  function fillList(id, items, emptyText, max) {
    var ol = clear($(id)); if (!ol) return;
    if (!items.length) { ol.appendChild(empty(emptyText)); return; }
    items.slice(0, max || 6).forEach(function (it) { ol.appendChild(todayItem(it)); });
    if (items.length > (max || 6)) ol.appendChild(h("li", { class: "small", text: "외 " + (items.length - (max || 6)) + "건" }));
  }
  function renderToday(t) {
    var c = t.counts;
    if (window.DaeumUI) DaeumUI.countUp($("todayCount"), c.stops, "가구"); else $("todayCount").innerHTML = c.stops + "<small>가구</small>";
    $("kpiReq").textContent = c.newRequests; $("kpiDue").textContent = c.dueSoon; $("kpiRevisit").textContent = c.revisits;
    var nr = $("navRevisit"); if (nr) nr.textContent = c.revisits || "";
    var sg = $("sigLine"); if (sg) sg.classList.toggle("on", c.newRequests > 0);
    var dueHint = q($("tab-today"), '[data-slot="kpi-due"] em'); if (dueHint) dueHint.textContent = "처리 기한 하루 이내·지남(시연 설정)";
    var S = {}; t.sections.forEach(function (s) { S[s.key] = s; });
    fillList("todayRequests", S["new"].items, "새로 들어온 요청이 없습니다.");
    fillList("todayDue", S.due.items, "기한이 다가오는 요청이 없습니다.");
    fillList("todayRevisit", S.revisit.items, "오늘 다시 찾아갈 집이 없습니다.");
    // 동선
    var box = clear($("todayRoute")), R = t.route;
    if (!R.order.length) box.appendChild(h("p", { class: "d-slot", text: "가구 명단에서 방문할 집을 담으면 동선을 묶어 드립니다." }));
    else {
      var sum = "방문 " + R.order.length + "곳 · 이동 " + R.km.toFixed(1) + "km(추정) · 예상 " + (R.minutes / 60).toFixed(1) + "시간";
      if ($("todayKm")) { routeArt(R.order); $("todayKm").innerHTML = R.km.toFixed(1) + "<small>km 이동(추정)</small>"; $("todayMeta").textContent = "방문 " + R.order.length + "곳 · 예상 " + (R.minutes / 60).toFixed(1) + "시간 · " + routeAreas(R.order); }
      box.appendChild(h("p", { class: "small" + ($("todayKm") ? " sr" : ""), text: sum }));
      var ol = h("ol", { class: "slot-list visits" }), lastA = null;
      R.order.slice(0, 8).forEach(function (s, i) {
        ol.appendChild(h("li", { class: s.kind === "request" ? "req" : null }, [h("span", { class: "vn num", text: String(i + 1), "aria-hidden": "true" }), h("span", { class: "grow" }, [h("span", { class: "sr", text: (i + 1) + "번 " }), h("b", { text: s.label }),
          h("span", { class: "small", text: " " + s.area + (s.kind === "request" ? " · 주민 신호" : "") })]),
          O.row(s.id) ? h("div", { class: "acts" }, [btn("방문 전 카드", function () { openCard(s.id); })]) : null]));
        lastA = s.area;
      });
      if (R.order.length > 8) ol.appendChild(h("li", { class: "small", text: "외 " + (R.order.length - 8) + "곳 — «순서 다시 짜기 · 지도»에서 전부 봅니다" }));
      box.appendChild(ol);
      box.appendChild(sheetActs());
    }
    if (!R.order.length && $("todayKm")) { clear($("todayArt")); $("todayKm").textContent = ""; $("todayMeta").textContent = "가구 명단에서 방문할 집을 담으면 순서를 묶어 드립니다"; }
    renderTodayGaps();
    var go = q($("tab-today"), 'a[href="#route"]');
    if (go && !go._m) { go._m = 1; go.addEventListener("click", function () { if (lastToday) O.setPicked(lastToday.route.order.map(function (s) { return s.id; })); }); }
    // 닿음이 미리 정리한 일(타임라인)
    var auto = clear($("todayAuto"));
    var lines = [
      "가구 명단 " + O.rows().length + "곳을 지역 신호(주민 요청·이웃 알림·제보·지난 시도) 순으로 다시 놓았습니다(최종 순서는 담당자)",
      "새 주민 신호 " + c.newRequests + "건의 처리 기한을 계산했습니다(긴급 1·일반 3영업일, 시연 설정)",
      "지난 시도 결과로 재방문·재연락 " + c.revisits + "건의 날짜·시간대를 제안했습니다",
      c.stops ? "오늘 방문 " + c.stops + "곳을 읍면별로 묶어 방문 순서를 짰습니다(총 이동 " + R.km.toFixed(1) + "km, 추정)" : "오늘 방문이 정해지지 않아 동선은 비워 두었습니다"
    ];
    if (F.safety) { var od = F.safety.overdue(st("safety", {}), new Date()); if (od.length) lines.unshift("⚠ 귀청 확인이 늦은 방문 " + od.length + "건 — 팀장 확인 필요"); }
    lines.forEach(function (l) { auto.appendChild(h("li", { text: l })); });
  }

  // 오늘 동선 실크 위 그림 — 방문 순서대로 가상 좌표(x,y)를 이은 선과 번호(장식, 같은 내용이 옆 목록에 있다)
  var SVGNS = "http://www.w3.org/2000/svg";
  function sv(tag, at) { var e = document.createElementNS(SVGNS, tag); Object.keys(at || {}).forEach(function (k) { e.setAttribute(k, at[k]); }); return e; }
  function routeArt(order) {
    var svg = clear($("todayArt")); if (!svg) return;
    var pts = order.slice(0, 12).map(function (s) {
      if (isFinite(s.x) && isFinite(s.y)) return s;
      var r = O.row(s.id); return r && r.h && isFinite(r.h.x) ? { x: r.h.x, y: r.h.y, kind: s.kind } : null; // 동선 줄에 좌표가 없으면 명단 가구 좌표
    }).filter(Boolean); if (pts.length < 1) return;
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var span = Math.max(x1 - x0, y1 - y0) || 1, P = 14, W = 100 - 2 * P;
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var xy = pts.map(function (p) { return [50 + (p.x - cx) / span * W, 50 - (p.y - cy) / span * W]; }); // 북쪽이 위
    var g = sv("g", { fill: "none", stroke: "rgba(255,255,255,.07)", "stroke-width": ".4" });
    [22, 40, 58, 76].forEach(function (y, i) { g.appendChild(sv("path", { d: "M-5 " + y + "c20-" + (6 + i) + " 40 4 60-3s30-" + (8 - i) + " 50-2" })); });
    svg.appendChild(g);
    if (xy.length > 1) svg.appendChild(sv("path", { class: "art-line", d: "M" + xy.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" L"), pathLength: "1" }));
    // 가까운 집 번호 겹침 풀기 — 네이버 지도와 같은 계산(route_map.js spreadBy). 실제 자리엔 작은 점 + 지시선
    var RMS = window.DaeumRouteMap && window.DaeumRouteMap.spreadBy;
    var off = RMS ? RMS(xy.map(function (p) { return { x: p[0], y: p[1] }; }), 10) : xy.map(function () { return [0, 0]; });
    xy.forEach(function (p, i) {
      var q = [p[0] + off[i][0], p[1] + off[i][1]];
      if (off[i][0] || off[i][1]) {
        svg.appendChild(sv("line", { x1: p[0].toFixed(1), y1: p[1].toFixed(1), x2: q[0].toFixed(1), y2: q[1].toFixed(1), class: "art-lead", stroke: "#fff", "stroke-width": ".5", "stroke-opacity": ".7" }));
        svg.appendChild(sv("circle", { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: "1.3", class: "art-dot", fill: "#fff" }));
      }
      svg.appendChild(sv("circle", { cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: "4.2", class: "art-pin" + (pts[i].kind === "request" ? " req" : "") }));
      var t = sv("text", { x: q[0].toFixed(1), y: (q[1] + 1.5).toFixed(1), class: "art-no" }); t.textContent = String(i + 1); svg.appendChild(t);
    });
  }
  function routeAreas(order) {
    var seen = [];
    order.forEach(function (s) { if (s.area && seen.indexOf(s.area) < 0) seen.push(s.area); });
    return seen.length > 3 ? seen.slice(0, 3).join("·") + " 외 " + (seen.length - 3) + "곳" : seen.join("·");
  }

  // 오늘 할 일 «③ 연계 누락» — 4단계 멈춘 집 수(흐름 순서). 자세한 목록은 연계·보고서 화면
  var GAP_ORDER = ["req_stalled", "met_nolink", "link_nocheck", "applied_nodecision"];
  var GAP_SHORT = { req_stalled: ["주민 신호", "확인 뒤 멈춤"], met_nolink: ["상담", "연계 없음"], link_nocheck: ["안내", "신청 확인 안 함"], applied_nodecision: ["신청", "결정 확인 안 함"] };
  function gapData() {
    var g = F.linkGap.build(Object.assign({}, base(), { outcomes: st("outcomes", {}) }));
    g.stages = g.stages.slice().sort(function (a, b) { return GAP_ORDER.indexOf(a.key) - GAP_ORDER.indexOf(b.key); });
    return g;
  }
  function renderTodayGaps() {
    var ol = clear($("todayGaps")); if (!ol) return;
    if (!F.linkGap) { ol.appendChild(empty("연계 누락 계산 기능이 없습니다.")); return; }
    var g = gapData();
    $("kpiGap").textContent = g.total;
    var ng = $("navGap"); if (ng) ng.textContent = g.total || "";
    g.stages.forEach(function (s) {
      var n = s.items.length, nm = GAP_SHORT[s.key] || [s.label, ""];
      ol.appendChild(h("li", { class: n ? "on" : null }, [h("span", { class: "gs-k" }, [h("b", { text: nm[0] }), h("span", { class: "small", text: nm[1] })]),
        h("b", { class: "num gs-n", text: String(n) }), h("span", { class: "sr", text: "곳" })]));
    });
  }

  // ── ② 가구 명단 머리(지역 신호 요약·이웃 제보 넣기) ───────
  function renderHouseholds() {
    var box = clear($("householdsSignals")); if (!box) return;
    var o = F.households.order(Object.assign(base(), { officerOrder: st("order", []) }));
    var chips = h("div", { class: "chips" });
    o.groups.forEach(function (g) { chips.appendChild(h("span", { class: "chip" + (g.key === "signal" ? " r" : ""), text: g.label + " " + g.count })); });
    var sel = h("select", { id: "tipHouse", "aria-label": "제보할 가구" });
    O.rows().slice(0, 300).forEach(function (r) { sel.appendChild(h("option", { value: r.h.id, text: r.h.label + " · " + r.h.area })); });
    var txt = h("input", { id: "tipText", type: "text", maxlength: "200", placeholder: "예) 며칠째 우편물이 쌓여 있어요", "aria-label": "이웃·통반장 제보 내용" });
    var from = h("select", { id: "tipFrom", "aria-label": "제보한 사람" }, ["이웃", "통장·이장", "집주인", "명예사회복지공무원"].map(function (x) { return h("option", { text: x }); }));
    var add = btn("제보 넣기", function () {
      if (!txt.value.trim()) { txt.focus(); return; }
      var r = O.row(sel.value);
      put("tips", F.households.addTip(st("tips", []), { householdId: sel.value, area: r ? r.h.area : "", from: from.value, text: txt.value.trim() }));
      txt.value = ""; haptic("success"); say("제보를 넣었습니다. 그 집이 명단 앞쪽으로 옵니다."); O.refresh();
    }, "ghost");
    box.appendChild(h("div", { class: "pane d-card" }, [
      h("h3", null, [h("span", { class: "d-tag acc", text: "순서" }), "지역 신호로 순서를 맞췄어요"]),
      chips, h("p", { class: "note", text: o.note }),
      h("details", null, [h("summary", { text: "이웃·통반장 제보 넣기" }),
        h("div", { class: "bar" }, [h("label", null, ["가구 ", sel]), h("label", null, ["누가 ", from]), h("label", { class: "grow" }, ["내용 ", txt]), add])])
    ]));
  }

  // ── ③ 방문·연락 기록 ───────────────────────────────────
  var curHouse = null;
  function goContacts(id) { curHouse = id; location.hash = "#contacts"; if (location.hash === "#contacts") renderContacts(); }
  function saveAttempt(result, reason) {
    var hid = $("cHouse").value, ch = (document.querySelector('input[name="cCh"]:checked') || {}).value || "visit";
    var note = $("cNote").value.trim();
    try {
      put("attempts", F.contacts.add(st("attempts", []), { householdId: hid, channel: ch, result: result, reason: reason, note: note }));
    } catch (e) { say(e.message); return; }
    curHouse = hid; $("cNote").value = ""; haptic("success");
    var s = F.contacts.suggestNext(st("attempts", []), hid);
    say(s.closed ? "기록했습니다 — " + s.closedWhy : "기록했습니다 — 다음 시도 " + s.next.date + " " + s.next.slot + "(" + (CH[s.next.channel] || "") + ")");
    O.refresh();
  }
  function renderContacts() {
    var form = $("contactForm"), log = $("contactsRoot"); if (!form) return;
    var rows = O.rows(), picked = O.picked();
    if (!form._built) {
      form._built = 1; clear(form);
      var sel = h("select", { id: "cHouse", onchange: function () { curHouse = this.value; renderContacts(); } });
      var chs = h("fieldset", { class: "bar" }, [h("legend", { class: "sr", text: "연락 방법" })].concat(["visit", "phone", "ai"].map(function (k, i) {
        return h("label", null, [h("input", { type: "radio", name: "cCh", value: k, checked: i === 0, "data-h": "selection" }), " " + CH[k]]);
      })));
      var res = h("div", { class: "rep-acts", role: "group", "aria-label": "시도 결과 한 번 누르기" });
      ["met", "no_answer", "wrong_contact", "refused", "moved"].forEach(function (k) {
        res.appendChild(btn(F.contacts.RESULTS[k], function () { saveAttempt(k); }, "ghost", "medium"));
      });
      res.appendChild(btn("비해당…", function () { var r = $("cReasons"); r.hidden = !r.hidden; if (!r.hidden) r.querySelector("button").focus(); }, "ghost", "light"));
      var reasons = h("div", { id: "cReasons", class: "rep-acts", role: "group", "aria-label": "비해당 사유 한 번 고르기", hidden: true },
        F.contacts.NON_ELIGIBLE_REASONS.map(function (x) { return btn(x.label, function () { $("cReasons").hidden = true; saveAttempt("not_eligible", x.key); }, "ghost", "success"); }));
      form.appendChild(h("label", null, ["가구 ", sel]));
      form.appendChild(chs);
      form.appendChild(h("label", null, ["메모(선택) ", h("input", { id: "cNote", type: "text", maxlength: "120", placeholder: "예) 문 앞 안내문 남김" })]));
      form.appendChild(h("p", { class: "small", text: "결과를 누르면 바로 저장되고 다음 시도 일정이 나옵니다. 정보원 AI 초기상담 전화 결과(안 닿음 등)도 «AI 초기상담 결과»로 남기면 방문 일정으로 이어집니다." }));
      form.appendChild(res); form.appendChild(reasons);
      form.appendChild(h("div", { id: "safetyRoot" }));
      form.appendChild(h("p", { id: "mountStatus", class: "small", role: "status", "aria-live": "polite" }));
    }
    // 가구 고르기: 오늘 담은 가구 → 시도 기록이 있는 가구 → 명단 앞 20
    var att = st("attempts", []), ids = [];
    function add(id) { if (id && ids.indexOf(id) < 0 && O.row(id)) ids.push(id); }
    picked.forEach(add); att.forEach(function (t) { add(t.householdId); }); rows.slice(0, 20).forEach(function (r) { add(r.h.id); }); add(curHouse);
    var sel2 = $("cHouse"); clear(sel2);
    ids.forEach(function (id) { var r = O.row(id); sel2.appendChild(h("option", { value: id, text: r.h.label + " · " + r.h.area })); });
    if (curHouse && ids.indexOf(curHouse) >= 0) sel2.value = curHouse; else curHouse = sel2.value;
    if (F.safety) renderSafety(curHouse);
    // 기록과 다음 일정
    clear(log);
    var hh = {}; att.forEach(function (t) { hh[t.householdId] = 1; });
    var list = Object.keys(hh).map(function (id) { return { id: id, s: F.contacts.suggestNext(att, id) }; })
      .sort(function (a, b) { return (a.s.closed - b.s.closed) || ((a.s.next && a.s.next.date) < (b.s.next && b.s.next.date) ? -1 : 1); });
    if (!list.length) { if ($("planRoot")) $("planRoot").hidden = true; log.appendChild(h("p", { class: "d-slot", text: "아직 기록이 없습니다. 결과를 한 번 누르면 여기에 쌓이고, 위에 닷새치 재시도 일정이 생깁니다." })); return; }
    renderPlan(log, att);
    var ol = h("ol", { class: "slot-list" });
    list.forEach(function (x) {
      var r = O.row(x.id), s = x.s, lbl = r ? r.h.label + " · " + r.h.area : x.id;
      var line = s.closed ? s.closedWhy : s.next.date.slice(5) + " " + s.next.slot + " " + (CH[s.next.channel] || "") + " — " + s.next.why;
      var body = h("div", { class: "grow" }, [h("b", { text: lbl }), " ",
        h("span", { class: "d-tag " + (s.closed ? "pos" : s.escalate ? "warn" : "acc"), text: s.closed ? "끝남" : s.escalate ? "간접 확인" : "다음 시도" }),
        h("div", { class: "small", text: "시도 " + s.tries + "회 · " + line }),
        h("div", { class: "small", text: "시간대: " + F.contacts.timeline(att, x.id).line })]);
      if (s.escalate) body.appendChild(h("ul", { class: "small" }, s.checklist.map(function (c) { return h("li", { text: c }); })));
      var li = h("li", null, [body]);
      var acts = h("div", { class: "acts" });
      if (!s.closed) acts.appendChild(btn("이 집 기록", function () { curHouse = x.id; renderContacts(); $("cHouse").focus(); }));
      if (F.handoff) acts.appendChild(btn("행복이음에 옮길 초안", function () { toggleHandoff(li, x.id); }));
      li.appendChild(acts);
      ol.appendChild(li);
    });
    log.appendChild(ol);
  }

  // ── ④ 상담 기록 → 행복이음 입력 초안·사례관리 서식 ─────────
  function renderConsult(d) {
    var slot = q($("consultForms"), '[data-slot="forms"]'); if (!slot) return;
    clear(slot);
    var dr = F.consult.draft(d.text, { label: d.label, area: d.area, channel: "visit", aiResult: d.res, services: d.services });
    var cs = st("consults", []); cs.unshift({ id: "K" + Date.now(), householdId: d.householdId, at: new Date().toISOString(), fields: dr.fields });
    put("consults", cs.slice(0, 100));
    if (dr.urgent) slot.appendChild(h("p", { class: "d-tag neg", text: "긴급 — 당일 연계 검토" }));
    var dl = h("dl", { class: "result" });
    dr.fields.forEach(function (f) {
      dl.appendChild(h("dt", { text: f.label }));
      dl.appendChild(h("dd", null, [f.value || h("span", { class: "muted", text: "(직접 입력)" })]));
    });
    slot.appendChild(dl);
    slot.appendChild(h("div", { class: "rep-acts" }, [
      btn("행복이음에 옮길 초안 복사", function () { copy(dr.copyText); }, "ghost", "success"),
      btn("사례관리 서식 복사", function () { copy(dr.caseText || "(욕구 영역을 찾지 못했습니다)"); }, "ghost", "success")
    ]));
    var cf = dr.caseForm.filter(function (c) { return c.finding; });
    if (cf.length) slot.appendChild(h("details", null, [h("summary", { text: "사례관리 욕구 영역 " + cf.length + "곳" }),
      h("ul", { class: "small" }, cf.map(function (c) { return h("li", { text: c.domain + ": " + c.finding }); }))]));
    slot.appendChild(h("p", { class: "note", text: dr.note + " 정식 기록은 행복이음(모바일 행복이음 포함)에 하며, 이 초안은 행복이음 상담 요약 기능이 정식 도입되기 전(2028 계획)까지 입력을 돕는 가교입니다. 시도 이력·연계 결과까지 합친 묶음은 «연계·보고서 → 행복이음에 옮길 초안»에 있습니다." }));
    slot.appendChild(h("p", { id: "mountStatus2", class: "small", role: "status" }));
  }

  // ── ⑤ 통계·보고서 ──────────────────────────────────────
  var lastStats = null, lastCd = null;
  function kpi(label, n, em) { return h("div", { class: "kpi d-card" }, [h("span", { text: label }), h("b", { class: "num", text: String(n) }), em ? h("em", { text: em }) : null]); }
  function rankList(items, total) {
    var ul = h("ul", { class: "rank" }), max = Math.max(1, Math.max.apply(null, items.map(function (x) { return x.n; }).concat([1])));
    items.forEach(function (it, i) {
      var bar = h("span", { class: "rank-bar", "aria-hidden": "true" }, [h("i")]); bar.firstChild.style.width = (it.n ? Math.max(3, Math.round(it.n / max * 100)) : 0) + "%";
      ul.appendChild(h("li", { class: i === 0 && it.n ? "rank-top" : null }, [h("span", { class: "rank-nm", text: it.label }), h("b", { class: "rank-n", text: it.n + (it.unit || "건") }),
        h("em", { class: "rank-p", text: total ? Math.round(it.n / total * 100) + "%" : "" }), bar]));
    });
    return ul;
  }
  function renderStats() {
    var root = $("statsRoot"); if (!root) return;
    var b = base(), home = homeArea(), S = F.report.aggregate(Object.assign({}, b, { area: home })), H = S.households, Q = S.requests;
    lastStats = S;
    var dash = clear(q(root, '[data-slot="dashboard"]'));
    // 위 숫자는 담당 읍면 가구만 센다 — 시군구 전체는 아래 수요 보드(읍면 × 서비스)에 있다(S10d)
    var mine = []; households().forEach(function (x) { if (x.area && mine.indexOf(x.area) < 0) mine.push(x.area); });
    var scope = home ? home + " 담당 가구" : mine.length ? "담당 " + mine.length + "개 읍면(" + mine.join("·") + ") 가구" : "담당 가구";
    dash.appendChild(h("p", { class: "small", text: scope + " 기준입니다. 시군구 전체 현황은 아래 수요 보드에서 볼 수 있어요. 닿음 보조 집계라 공식 실적은 행복이음 숫자와 맞춰 봅니다." }));
    dash.appendChild(h("div", { class: "kpis" }, [
      kpi("발굴 명단", H.total, "가구"), kpi("접촉", H.contacted, H.total ? Math.round(H.contacted / H.total * 100) + "%" : ""),
      kpi("만남·상담", H.met, "가구"), kpi("비해당", H.nonEligible, "가구"), kpi("주민 신호", Q.total, "긴급 " + Q.urgent),
      kpi("오늘 재시도", S.followUp ? S.followUp.retryDue : "—", "가구"), kpi("연계", S.links.total, S.links.households + "가구")
    ]));
    dash.appendChild(h("h4", { text: "요청 처리 단계" }));
    dash.appendChild(rankList(S.funnel.map(function (f) { return { label: f.label, n: f.n }; }), S.funnel[0].n));
    if (S.nonEligibleBy.length) { dash.appendChild(h("h4", { text: "비해당 사유" })); dash.appendChild(rankList(S.nonEligibleBy.map(function (x) { return { label: x.label, n: x.n, unit: "가구" }; }), H.nonEligible)); }
    var cd = F.report.countdown(F.report.currentRound(), { done: H.closed, total: H.total });
    lastCd = cd;
    var dl = clear(q(root, '[data-slot="deadline"]'));
    dl.appendChild(h("h4", null, [cd.round.label + (cd.upcoming ? " 준비 " : " 마감 역산 "), h("span", { class: "d-tag " + (cd.upcoming || cd.onTrack ? "pos" : "warn"), text: cd.upcoming ? "시작 전" : cd.onTrack ? "일정 안" : "뒤처짐" })]));
    dl.appendChild(rankList([{ label: "기간 경과", n: cd.elapsedPct, unit: "%" }, { label: "처리 완료", n: cd.donePct, unit: "%" }], 0));
    dl.appendChild(h("p", { class: "small", text: cd.message }));
    dl.appendChild(h("p", { class: "note", text: "출처: " + cd.round.source + " · 명단은 가상 가구" }));
    if (F.linkGap) renderGaps(b);
    if (F.handoff) renderHandoff(b);
    renderReportActs();
  }
  function renderReportActs() {
    var root = $("reportRoot"); if (!root || root._m) return; root._m = 1;
    [].forEach.call(root.querySelectorAll("[data-report]"), function (bt) {
      bt.disabled = false;
      bt.addEventListener("click", function () { makeReport(bt.getAttribute("data-report")); });
    });
  }
  var lastReport = null;
  function makeReport(kind) {
    if (!lastStats) renderStats();
    var home = lastStats.scope;
    var rep = F.report[kind](lastStats, { countdown: lastCd, office: "상주시 " + (home || "○○") + " 행정복지센터 맞춤형복지팀(시연)" });
    lastReport = rep;
    var pv = clear(q($("reportRoot"), '[data-slot="preview"]'));
    pv.appendChild(h("h4", { text: rep.title }));
    rep.sections.forEach(function (s) { pv.appendChild(h("p", { class: "small" }, [h("b", { text: "□ " + s.heading })])); pv.appendChild(h("ul", { class: "small" }, s.lines.map(function (l) { return h("li", { text: l }); }))); });
    pv.appendChild(h("div", { class: "rep-acts" }, [
      btn("인쇄·PDF", function () { printReport(rep); }, "ghost", "medium"),
      btn("한글 붙여넣기 문안 복사", function () { copy(rep.text); }, "ghost", "success")
    ]));
    pv.appendChild(h("p", { class: "note", text: rep.note + " · 출력 " + rep.printedAt }));
    pv.appendChild(h("p", { id: "mountStatus3", class: "small", role: "status" }));
    haptic("success");
  }
  // A4 인쇄 — 보이지 않는 틀(iframe)에 보고서만 담아 인쇄 대화상자를 연다(PDF 저장도 같은 대화상자)
  function printReport(rep) {
    var css = new URL("../shared/tokens.css", location.href).href;
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var html = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(rep.title) + '</title><link rel="stylesheet" href="' + css + '">' +
      '<style>@page{size:A4;margin:18mm}html,body{background:#fff;color:#111}body{font:11pt/1.6 var(--f);margin:0}h1{font-size:15pt;margin:0 0 4pt}' +
      '.m{color:#444;font-size:9pt;margin:0 0 12pt}h2{font-size:11.5pt;margin:12pt 0 4pt}ul{margin:0;padding-left:16pt}table{border-collapse:collapse;width:100%;margin-top:10pt;font-size:9.5pt}' +
      'th,td{border:1px solid #999;padding:3pt 6pt;text-align:left}th{background:#eee}.n{margin-top:14pt;font-size:8.5pt;color:#444}</style></head><body>' +
      '<h1>' + esc(rep.title) + '</h1><p class="m">출력 ' + esc(rep.printedAt) + ' · 닿음(시연, 가상 자료)</p>' +
      (rep.raw || "") +
      rep.sections.map(function (s) { return "<h2>□ " + esc(s.heading) + "</h2><ul>" + s.lines.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>"; }).join("") +
      (rep.table.head.length ? "<table><thead><tr>" + rep.table.head.map(function (x) { return "<th>" + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rep.table.rows.map(function (r) { return "<tr>" + r.map(function (x) { return "<td>" + esc(x) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>" : "") +
      '<p class="n">※ ' + esc(rep.note) + " 가구는 시연용 가상 자료이며 «추정»은 가정값에 따른 값입니다.</p></body></html>";
    var fr = $("printFrame");
    if (fr) fr.remove();
    fr = h("iframe", { id: "printFrame", title: "인쇄용 보고서", "aria-hidden": "true", tabindex: "-1" });
    fr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(fr);
    var d = fr.contentWindow.document; d.open(); d.write(html); d.close();
    setTimeout(function () { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { window.print(); } }, 350);
  }

  // ── 신호 받기 ──────────────────────────────────────────
  var lastToday = null;
  function onShow(e) {
    O = window.DaeumOfficer; if (!O || !O.data()) return;
    var tab = e.detail.tab;
    lastToday = F.today.build(base());
    var nav = $("navToday"); if (nav) nav.textContent = lastToday.counts.stops || "";
    if (tab === "today") renderToday(lastToday);
    if (tab === "list") renderHouseholds();
    if (tab === "contacts") renderContacts();
    if (tab === "board" || tab === "report") renderStats();
  }
  document.addEventListener("daeum:officer-show", onShow);
  document.addEventListener("daeum:officer-summary", function (e) { O = window.DaeumOfficer; renderConsult(e.detail); });

  // ── ⑫ 국민 요청 답변 초안 (오늘 할 일 줄 아래로 펼침) ───────────
  function toggleReply(li, reqId) {
    var old = q(li, ".reply"); if (old) { old.remove(); return; }
    var r = REQ.get(reqId); if (!r) return;
    var d = F.reply.draft(r);
    var box = h("div", { class: "reply hinfo", role: "region", "aria-label": "답변 초안" }, [
      h("p", { class: "small" }, [h("b", { text: "문자 문안 " }), "(" + d.smsLen + "자)"]), h("p", { text: d.sms }),
      h("p", { class: "small" }, [h("b", { text: "전화 대본" })]), h("ol", { class: "small" }, d.phone.map(function (l) { return h("li", { text: l }); })),
      h("div", { class: "rep-acts" }, [btn("문자 문안 복사", function () { copy(d.sms); }, "ghost", "success"), btn("전화 대본 복사", function () { copy(d.phone.join("\n")); }, "ghost", "success")]),
      h("p", { class: "note", text: d.note })
    ]);
    li.appendChild(box);
  }

  // ── ⑧ 방문 전 한 장 카드 (대화상자 — Esc 로 닫힘, 인쇄 가능) ──────
  function openCard(id) {
    var r = O.row(id); if (!r) return;
    var c = F.visitCard.build({ household: r.h, factors: r.factors, signals: r.signals, attempts: st("attempts", []), safety: st("safety", {}), tips: st("tips", []) });
    var dlg = $("visitCard");
    if (!dlg) { dlg = h("dialog", { id: "visitCard", class: "pane d-card", "aria-labelledby": "vcTitle" }); document.body.appendChild(dlg); }
    clear(dlg);
    var TAG = { "가능성": "pos", "확인 필요": "warn", "어려움": "neg" };
    function sec(title, kids) { return h("section", null, [h("h4", { text: title })].concat(kids)); }
    dlg.appendChild(h("h3", { id: "vcTitle" }, [h("span", { class: "d-tag acc", text: "방문 전" }), c.title, c.twoPerson ? h("span", { class: "d-tag neg", text: "2인 방문" }) : null]));
    dlg.appendChild(h("p", { class: "small", text: c.members }));
    dlg.appendChild(sec("왜 이 집인지", [h("ul", { class: "small" }, (c.why.length ? c.why : ["명단 사유 없음"]).map(function (x) { return h("li", { text: x }); }))]));
    dlg.appendChild(sec("지난 시도", [c.tries.length ? h("ul", { class: "small" }, c.tries.map(function (t) { return h("li", { text: t.at + " " + (CH[t.channel] || "") + " — " + t.result + (t.note ? " (" + t.note + ")" : "") }); })) : h("p", { class: "small", text: "처음 찾아가는 집입니다." }),
      c.next ? h("p", { class: "small", text: "다음: " + c.next }) : null]));
    if (c.cautions.length) dlg.appendChild(sec("주의 사항", [h("ul", { class: "small" }, c.cautions.map(function (x) { return h("li", { text: x }); }))]));
    dlg.appendChild(sec("자격 대조(가능성)", [h("ul", { class: "slot-list" }, c.eligibility.map(function (e) {
      return h("li", null, [h("span", { class: "d-tag " + TAG[e.status], text: e.status }), h("span", { class: "grow" }, [h("b", { text: e.name }), h("div", { class: "small", text: e.why })])]);
    })), h("p", { class: "note", text: c.disclaimer })]));
    dlg.appendChild(h("div", { class: "rep-acts" }, [
      btn("이 집 기록하기", function () { dlg.close(); goContacts(id); }, "ghost", "light"),
      btn("인쇄", function () { printHtml(c.title + " 방문 전 카드", dlg.innerHTML.replace(/<div class="rep-acts">[\s\S]*$/, "")); }, "ghost", "light"),
      btn("닫기", function () { dlg.close(); }, "ghost", "light")
    ]));
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    haptic("light");
  }
  function printHtml(title, body) {
    printReport({ title: title, printedAt: new Date().toLocaleString("ko-KR"), sections: [], table: { head: [], rows: [] }, note: "방문 전 카드(시연·가상 자료)", raw: body });
  }

  // ── ⑨ 안전 방문 · ⑩ 강제개문 체크리스트 (방문·연락 화면 기록 양식 아래) ─────
  function renderSafety(id) {
    var box = clear($("safetyRoot")); if (!box || !id) return;
    var r = O.row(id), S = st("safety", {}), two = F.safety.twoPerson(S, st("attempts", []), st("tips", []), id);
    var flags = S.flags || {}, open = F.safety.open(S).filter(function (v) { return v.householdId === id; })[0];
    var od = F.safety.overdue(S, new Date());
    var kids = [h("h4", null, ["안전 방문 ", two.two ? h("span", { class: "d-tag neg", text: "2인 방문" }) : h("span", { class: "d-tag pos", text: "표시 없음" })])];
    if (two.two) kids.push(h("p", { class: "small", text: two.why }));
    var cb = h("input", { type: "checkbox", id: "sfFlag", checked: !!flags[id], "data-h": "selection" });
    cb.addEventListener("change", function () { put("safety", F.safety.flag(st("safety", {}), id, cb.checked, "위험 이력")); renderSafety(id); });
    kids.push(h("label", null, [cb, " 위험 이력 — 다음 방문부터 2인으로"]));
    var buddy = h("input", { id: "sfBuddy", type: "text", maxlength: "20", placeholder: "동행자 이름(선택)", "aria-label": "동행자" });
    if (!open) kids.push(h("div", { class: "rep-acts" }, [buddy, btn("방문 시작", function () {
      put("safety", F.safety.start(st("safety", {}), { householdId: id, buddy: buddy.value.trim() })); haptic("medium");
      say("방문 시작을 남겼습니다. " + F.safety.VISIT_MIN + "분 안에 «귀청 확인»을 눌러 주세요."); renderSafety(id);
    }, "ghost", "medium")]));
    else kids.push(h("div", { class: "rep-acts" }, [h("span", { class: "small", text: "방문 중 · " + open.startAt.slice(11, 16) + " 시작" + (open.buddy ? " · 동행 " + open.buddy : "") + " · " + open.dueAt.slice(11, 16) + "까지 확인" }),
      btn("귀청 확인", function () { put("safety", F.safety.checkin(st("safety", {}), open.id)); haptic("success"); say("귀청 확인을 남겼습니다."); renderSafety(id); }, "ghost", "success")]));
    if (od.length) kids.push(h("p", { class: "d-tag warn", role: "alert", text: "팀장 확인 화면(시연): 귀청 확인이 늦은 방문 " + od.length + "건 — " + od.map(function (v) { var x = O.row(v.householdId); return x ? x.h.label : v.householdId; }).join(", ") }));
    kids.push(h("details", null, [h("summary", { text: "민원·위험 상황 기록 서식" }),
      h("p", { class: "small", text: "있는 그대로 적어 두면 민원 대응·2인 방문 지정의 근거가 됩니다." }),
      btn("서식 복사", function () { copy(F.safety.complaintForm({ label: r ? r.h.label : id, area: r ? r.h.area : "", buddy: open ? open.buddy : "" })); }, "ghost", "success")]));
    // ⑩
    var lg = st("entry", []), es = F.forcedEntry.status(lg, id);
    var ul = h("ol", { class: "slot-list" });
    es.steps.forEach(function (s) {
      var c2 = h("input", { type: "checkbox", checked: s.done, "data-h": "selection", "aria-label": s.label });
      c2.addEventListener("change", function () { put("entry", c2.checked ? F.forcedEntry.record(st("entry", []), id, s.key) : F.forcedEntry.undo(st("entry", []), id, s.key)); renderSafety(id); });
      ul.appendChild(h("li", null, [h("label", { class: "grow" }, [c2, " " + s.label]), h("span", { class: "small", text: s.at ? s.at.slice(5, 16).replace("T", " ") : "" })]));
    });
    kids.push(h("details", { open: es.done > 0 && es.done < es.total }, [h("summary", { text: "강제개문·긴급 조치 체크리스트 (" + es.done + "/" + es.total + ")" }), ul,
      es.next ? h("p", { class: "small", text: "다음: " + es.next }) : h("p", { class: "small", text: "모든 단계를 기록했습니다." }), h("p", { class: "note", text: F.forcedEntry.note })]));
    box.appendChild(h("div", { class: "hinfo" }, kids));
  }

  // ── ⑪ 연계 누락 보드 ───────────────────────────────────
  function renderGaps(b) {
    var root = $("gapRoot"); if (!root) return;
    var g = gapData();
    var slot = clear(q(root, '[data-slot="gaps"]'));
    slot.appendChild(h("p", { class: "small", text: g.total ? "멈춘 집 " + g.total + "곳 — 오래 멈춘 순" : "멈춘 집이 없습니다." }));
    var grid = h("ol", { class: "gap4", "aria-label": "연계 단계별 멈춘 집(흐름 순서)" });
    g.stages.forEach(function (s, si) {
      var ol = h("ol", { class: "slot-list" });
      if (!s.items.length) ol.appendChild(empty("없음"));
      s.items.slice(0, 6).forEach(function (it) {
        var acts = h("div", { class: "acts" });
        if (s.key === "met_nolink") acts.appendChild(btn("상담 기록", function () { O.openRecord(it.id); }));
        var mark = function (res, msg) { return function () { put("outcomes", F.linkGap.markOutcome(st("outcomes", {}), it.linkId, res)); haptic("success"); say(msg); renderStats(); }; };
        if (s.key === "link_nocheck") { acts.appendChild(btn("신청함", mark("applied", "«신청함»으로 남겼습니다. 결정 결과를 " + F.linkGap.GAP.afterApply + "일 뒤에 다시 챙깁니다."))); acts.appendChild(btn("안 하기로 함", mark("not_applied", "«안 하기로 함»으로 남겼습니다."))); }
        if (s.key === "applied_nodecision") acts.appendChild(btn("결정 결과 확인함", mark("decided", "결정 결과 확인을 남겼습니다.")));
        if (s.key === "req_stalled") acts.appendChild(btn("방문 예정으로", function () { REQ.setStatus(it.requestId, "visiting", "officer", "연계 누락 보드"); O.refresh(); }));
        if (s.key !== "req_stalled") acts.appendChild(btn("이 집 다음 시도", function () { goContacts(it.id); }));
        ol.appendChild(h("li", null, [h("div", { class: "grow" }, [h("b", { text: it.label }), h("div", { class: "small", text: (it.area ? it.area + " · " : "") + it.why })]), acts]));
      });
      var nm = GAP_SHORT[s.key] || [s.label, ""];
      grid.appendChild(h("li", { class: "gcol" + (s.items.length ? " on" : "") }, [h("h4", null, [h("span", { class: "gstep num", "aria-hidden": "true", text: String(si + 1) }),
        h("span", { class: "grow" }, [h("b", { text: nm[0] + " 다음" }), h("span", { class: "small", text: s.label })]),
        h("span", { class: "d-tag " + (s.items.length ? "warn" : "pos"), text: s.items.length + "곳" })]), ol]));
    });
    slot.appendChild(grid);
    if (g.notApplied.length) {
      slot.appendChild(h("h4", { text: "안내했는데 신청 안 한 서비스" }));
      slot.appendChild(rankList(g.notApplied.slice(0, 6).map(function (x) { return { label: x.name, n: x.n }; }), 0));
    }
    slot.appendChild(h("p", { class: "note", text: g.note }));
  }

  // ── S9h-④ 행복이음으로 옮길 기록 (통계·보고서 화면, 연계 누락 보드 아래) ─────────
  function toggleHandoff(li, id) {
    var old = q(li, ".handoff"); if (old) { old.remove(); return; }
    var r = O.row(id), b = F.handoff.build(Object.assign(base(), { household: r ? r.h : { id: id, label: id } }));
    li.appendChild(handoffBox(b, r ? r.h.label : id));
  }
  function handoffBox(b, title) {
    var dl = h("dl", { class: "result" });
    b.fields.forEach(function (f) { dl.appendChild(h("dt", { text: f.label })); dl.appendChild(h("dd", null, [f.value || h("span", { class: "muted", text: "(해당 없음·직접 입력)" })])); });
    return h("div", { class: "handoff hinfo", role: "region", "aria-label": title + " 행복이음에 옮길 초안" }, [dl,
      h("div", { class: "rep-acts" }, [btn("초안 복사(같은 망에서)", function () { copy(b.text); }, "ghost", "success"),
        btn("인쇄해 보고 입력", function () { printHandoff([b], title + " 행복이음에 옮길 초안"); }, "ghost", "light")]),
      h("p", { class: "note", text: b.note })]);
  }
  function printHandoff(items, title) {
    var body = items.map(function (b) {
      return "<h2>□ " + esc(b.label || b.fields[0].value) + "</h2><table><tbody>" + b.fields.map(function (f) { return "<tr><th>" + esc(f.label) + "</th><td>" + esc(f.value || "(해당 없음·직접 입력)") + "</td></tr>"; }).join("") + "</tbody></table>";
    }).join("");
    printReport({ title: title, printedAt: new Date().toLocaleString("ko-KR"), sections: [], table: { head: [], rows: [] }, note: F.handoff.NOTE, raw: body });
  }
  function renderHandoff(b) {
    var tab = $("tab-board"); if (!tab) return;
    var root = $("handoffRoot");
    if (!root) { // 최소 마크업만(배치·꾸밈은 미르 손질 몫)
      root = h("div", { class: "panel d-card", id: "handoffRoot", "data-feature": "handoff" });
      var after = $("gapRoot"); if (after && after.parentNode) after.parentNode.insertBefore(root, after.nextSibling); else tab.appendChild(root);
    }
    clear(root);
    var bt = F.handoff.batch(Object.assign({}, b, { sent: st("handoff", {}) }));
    root.appendChild(h("h3", null, ["행복이음에 옮길 초안 ", h("small", { class: "tag", text: "시도 이력·상담·연계 결과를 행복이음 입력 순서(12칸)대로" })]));
    root.appendChild(h("p", { class: "small", text: bt.items.length ? "기록이 있는 집 " + bt.items.length + "곳 · 아직 안 옮긴 집 " + bt.pending + "곳" : "아직 옮길 기록이 없습니다. 방문·연락 결과나 상담 기록을 남기면 여기에 모입니다." }));
    if (bt.items.length) {
      var ol = h("ol", { class: "slot-list" });
      bt.items.slice(0, 8).forEach(function (it) {
        var li = h("li", null, [h("div", { class: "grow" }, [h("b", { text: it.label }), " ", h("span", { class: "d-tag " + (it.pending ? "warn" : "pos"), text: it.pending ? "옮길 것" : "옮김" }),
          h("div", { class: "small", text: (it.area ? it.area + " · " : "") + "채운 칸 " + it.filled + "/" + it.fields.length })])]);
        li.appendChild(h("div", { class: "acts" }, [btn("보기", function () { var o = q(li, ".handoff"); if (o) o.remove(); else li.appendChild(handoffBox(it, it.label)); })]));
        ol.appendChild(li);
      });
      if (bt.items.length > 8) ol.appendChild(h("li", { class: "small", text: "외 " + (bt.items.length - 8) + "곳 — 파일에는 전부 들어갑니다" }));
      root.appendChild(ol);
      var pend = bt.items.filter(function (x) { return x.pending; });
      root.appendChild(h("div", { class: "rep-acts" }, [
        btn("파일 내려받기(CSV)", function () { download("행복이음_옮길초안_" + F.util.ymd(new Date()).replace(/-/g, "") + ".csv", bt.csv); }, "ghost", "success"),
        btn("옮길 것 인쇄", function () { printHandoff(pend.length ? pend : bt.items, "행복이음에 옮길 초안 " + F.util.ymd(new Date())); }, "ghost", "light"),
        btn("다 옮겼다고 표시", function () { put("handoff", F.handoff.markSent(st("handoff", {}), pend.map(function (x) { return x.id; }))); say("옮긴 것으로 표시했습니다. 새 기록이 생기면 다시 «옮길 것»이 됩니다."); renderStats(); }, "ghost", "light")
      ]));
    }
    root.appendChild(h("p", { id: "mountStatus4", class: "small", role: "status", "aria-live": "polite" }));
    root.appendChild(h("p", { class: "note", text: F.handoff.NOTE }));
    root.appendChild(h("p", { class: "note", text: F.handoff.FUTURE + " 명단 «불러오기»(들어오는 것)는 다음 단계에서 붙입니다." }));
  }

  // ── S9h-② 닷새치 재시도 일정 (방문·연락 화면 «시도 기록과 다음 일정» 맨 위) ─────────
  function renderPlan(log, att) {
    var root = $("planRoot"), slot = root ? clear(q(root, '[data-slot="plan"]')) : null;
    var pl = F.contacts.plan(att, households(), new Date(), 5, { links: O.links(), outcomes: st("outcomes", {}), followups: st("followups", {}) });
    var n = pl.reduce(function (a, d) { return a + d.items.length; }, 0);
    if (root) root.hidden = !n;
    if (!n) return;
    var grid = h("div", { class: "days5", role: "list", "aria-label": "닷새치 재시도 일정" });
    pl.forEach(function (d) {
      var ol = h("ol", { class: "slot-list" });
      if (!d.items.length) ol.appendChild(empty("없음"));
      d.items.slice(0, 5).forEach(function (x) {
        ol.appendChild(h("li", null, [h("div", { class: "grow" }, [h("b", { text: x.slot + " " + (CH[x.channel] || "") + " · " + x.label }),
          x.overdue ? h("span", { class: "d-tag warn", text: "밀림" }) : null, x.escalate ? h("span", { class: "d-tag neg", text: "간접 확인" }) : null,
          x.kind === "followup" ? h("span", { class: "d-tag pos", text: "사후관리" }) : null,
          h("div", { class: "small", text: x.why })]), h("div", { class: "acts" }, [x.kind === "followup"
            ? btn("재점검함", function () { put("followups", F.followUp.mark(st("followups", {}), x.key)); haptic("success"); say("재점검을 남겼습니다. 다음 재점검은 자동으로 일정에 올라옵니다."); renderContacts(); })
            : btn("기록", function () { curHouse = x.id; renderContacts(); $("cHouse").focus(); })])]));
      });
      if (d.items.length > 5) ol.appendChild(h("li", { class: "small", text: "외 " + (d.items.length - 5) + "곳" }));
      grid.appendChild(h("section", { class: "day" + (d.items.length ? "" : " is-empty"), role: "listitem" }, [h("h4", null, [d.label + " ", h("span", { class: "d-tag " + (d.items.length ? "acc" : "pos"), text: d.items.length + "곳" })]), ol]));
    });
    if (slot) slot.appendChild(grid);
    else { log.appendChild(h("h4", { text: "닷새치 재시도·사후관리 일정 — 안 해 본 시간대로 배치(주말·공휴일 건너뜀)" })); log.appendChild(grid); }
  }

  // ── S9h-① 하루 동선 1장 (오늘 할 일 «오늘 동선 묶음»·방문 경로 화면) ─────────
  function sheetData() {
    var RP = window.DaeumRoutePlan, D = O.data(), R = O.route ? O.route() : null, d;
    if (R && R.order && R.order.length) {
      d = { start: R.start, end: R.end, km: R.km, isRoad: R.isRoad, ret: R.ret,
        stops: R.order.map(function (id, i) { var x = R.rows[i] || {}; return { id: id, arrive: x.arrive, leave: x.leave, lunchBefore: x.lunchBefore }; }) };
    } else {
      var order = ((lastToday && lastToday.route.order) || []).map(function (s) { return O.row(s.id); }).filter(Boolean);
      var pts = order.map(function (r) { return { id: r.h.id, x: r.h.x, y: r.h.y }; });
      var sch = RP ? RP.schedule(pts, RP.approxLegs(pts, D.meta.office, true), { start: "09:30", ret: true }) : { rows: [] };
      d = { start: "09:30", end: sch.end, km: sch.km, isRoad: false, ret: true,
        stops: pts.map(function (p, i) { var x = sch.rows[i] || {}; return { id: p.id, arrive: x.arrive, leave: x.leave, lunchBefore: x.lunchBefore }; }) };
    }
    var rows = {}; d.stops.forEach(function (s) { var r = O.row(s.id); if (r) rows[s.id] = { household: r.h, factors: r.factors, signals: r.signals }; });
    d.rows = rows;
    d.candidates = O.rows().slice(0, 80).map(function (r) { return { household: r.h, signals: r.signals }; });
    d.attempts = st("attempts", []); d.safety = st("safety", {}); d.tips = st("tips", []);
    return F.daySheet.build(d);
  }
  function printSheet() {
    var sh = sheetData();
    if (!sh.stops.length) { say("담은 가구가 없습니다. 가구 명단에서 방문할 집을 먼저 담아 주세요."); return; }
    var body = "<p>" + esc(sh.summary) + "</p><table><thead><tr><th>순</th><th>시각</th><th>집·사유</th><th>지난 시도 / 안내할 것(가능성)</th><th>주의 / 부재면</th></tr></thead><tbody>" +
      sh.stops.map(function (x) {
        return (x.lunchBefore ? "<tr><td colspan=\"5\">점심</td></tr>" : "") + "<tr><td>" + x.no + "</td><td>" + esc(x.time) + "</td><td><b>" + esc(x.label) + "</b> · " + esc(x.area) +
          (x.twoPerson ? " <b>[2인 방문]</b>" : "") + "<br>" + esc(x.members) + (x.why.length ? "<br>" + esc(x.why.join(" / ")) : "") + "</td><td>" + esc(x.lastTry) +
          (x.bring.length ? "<br>" + esc(x.bring.join(", ")) : "") + "</td><td>" + esc(x.cautions.join(" / ")) + (x.ifAbsent ? "<br>부재면: " + esc(x.ifAbsent) : "") + "</td></tr>";
      }).join("") + "</tbody></table>" +
      (sh.standby.length ? "<h2>□ 부재로 시간이 남으면 들를 집</h2><ul>" + sh.standby.map(function (x) { return "<li>" + esc(x.label + " · " + x.area + " — " + x.why) + "</li>"; }).join("") + "</ul>" : "") +
      "<p>※ 방문 시작·귀청 확인은 «방문·연락» 화면에서 누릅니다. 상담·조사 결과의 정식 기록은 행복이음에 합니다.</p>";
    printReport({ title: sh.title, printedAt: new Date().toLocaleString("ko-KR"), sections: [], table: { head: [], rows: [] }, note: sh.note, raw: body });
  }
  function sheetActs() {
    return h("div", { class: "rep-acts" }, [btn("하루 동선 1장 인쇄", printSheet, "ghost", "medium"),
      btn("하루 동선 문안 복사", function () { copy(sheetData().text); }, "ghost", "success")]);
  }
  // 방문 경로 화면: 안내 줄 아래에 같은 단추(한 번만 붙인다)
  document.addEventListener("daeum:officer-show", function (e) {
    if (e.detail.tab !== "route") return;
    var anchor = document.querySelector(".route-side .route-hint") || $("routeRoad"); if (!anchor || $("sheetActs")) return;
    var a = sheetActs(); a.id = "sheetActs"; anchor.parentNode.insertBefore(a, anchor);
  });

})();
