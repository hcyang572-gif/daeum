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
  var CH = { visit: "방문", phone: "전화", center: "내방" };

  // ── 공통 입력 묶음 ─────────────────────────────────────
  function households() { return O.rows().map(function (r) { return r.h; }); }
  function base(now) {
    var D = O.data();
    return { households: households(), areas: D.areas, office: D.meta.office, requests: REQ.list(),
      attempts: st("attempts", []), tips: st("tips", []), picked: O.picked(), links: O.links(), now: now || new Date() };
  }

  // ── ① 오늘 할 일 ───────────────────────────────────────
  function todayItem(it) {
    var li = h("li", { class: it.overdue ? "is-over" : null });
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
    var dueHint = q($("tab-today"), '[data-slot="kpi-due"] em'); if (dueHint) dueHint.textContent = "처리 기한 하루 이내·지남(시연 설정)";
    var S = {}; t.sections.forEach(function (s) { S[s.key] = s; });
    fillList("todayRequests", S["new"].items, "새로 들어온 요청이 없습니다.");
    fillList("todayDue", S.due.items, "기한이 다가오는 요청이 없습니다.");
    fillList("todayRevisit", S.revisit.items, "오늘 다시 찾아갈 집이 없습니다.");
    // 동선
    var box = clear($("todayRoute")), R = t.route;
    if (!R.order.length) box.appendChild(h("p", { class: "d-slot", text: "가구 명단에서 방문할 집을 담으면 동선을 묶어 드립니다." }));
    else {
      box.appendChild(h("p", { class: "small", text: "방문 " + R.order.length + "곳 · 이동 " + R.km.toFixed(1) + "km(추정) · 명단 순서보다 " +
        Math.max(0, R.naiveKm - R.km).toFixed(1) + "km 짧음 · 예상 " + (R.minutes / 60).toFixed(1) + "시간" }));
      var ol = h("ol", { class: "slot-list" }), lastA = null;
      R.order.slice(0, 8).forEach(function (s, i) {
        ol.appendChild(h("li", null, [h("span", { class: "num", text: String(i + 1) }), " ", h("span", { class: "grow", text: s.label }),
          h("span", { class: "small", text: s.area !== lastA ? s.area : "" }),
          O.row(s.id) ? h("div", { class: "acts" }, [btn("방문 전 카드", function () { openCard(s.id); })]) : null]));
        lastA = s.area;
      });
      if (R.order.length > 8) ol.appendChild(h("li", { class: "small", text: "외 " + (R.order.length - 8) + "곳 — «경로대로 출발»에서 전부 봅니다" }));
      box.appendChild(ol);
    }
    var go = q($("tab-today"), 'a[href="#route"]');
    if (go && !go._m) { go._m = 1; go.addEventListener("click", function () { if (lastToday) O.setPicked(lastToday.route.order.map(function (s) { return s.id; })); }); }
    // 밤사이 자동 처리(타임라인)
    var auto = clear($("todayAuto"));
    var lines = [
      "가구 명단 " + O.rows().length + "곳을 지역 신호(주민 요청·이웃 제보·지난 시도) 순으로 다시 놓았습니다",
      "국민 요청 " + c.newRequests + "건의 처리 기한을 계산했습니다(긴급 1·일반 3영업일, 시연 설정)",
      "지난 시도 결과로 재방문·재연락 " + c.revisits + "건의 날짜·시간대를 제안했습니다",
      c.stops ? "오늘 방문 " + c.stops + "곳을 읍면별로 묶어 " + Math.max(0, R.naiveKm - R.km).toFixed(1) + "km 줄였습니다(추정)" : "오늘 방문이 정해지지 않아 동선은 비워 두었습니다"
    ];
    if (F.safety) { var od = F.safety.overdue(st("safety", {}), new Date()); if (od.length) lines.unshift("⚠ 귀청 확인이 늦은 방문 " + od.length + "건 — 팀장 확인 필요"); }
    lines.forEach(function (l) { auto.appendChild(h("li", { text: l })); });
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
      var chs = h("fieldset", { class: "bar" }, [h("legend", { class: "sr", text: "연락 방법" })].concat(["visit", "phone"].map(function (k, i) {
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
      form.appendChild(h("p", { class: "small", text: "결과를 누르면 바로 저장되고 다음 시도 일정이 나옵니다." }));
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
    if (!list.length) { log.appendChild(h("p", { class: "d-slot", text: "아직 기록이 없습니다. 왼쪽에서 결과를 한 번 누르면 여기에 쌓입니다." })); return; }
    var ol = h("ol", { class: "slot-list" });
    list.forEach(function (x) {
      var r = O.row(x.id), s = x.s, lbl = r ? r.h.label + " · " + r.h.area : x.id;
      var line = s.closed ? s.closedWhy : s.next.date.slice(5) + " " + s.next.slot + " " + (CH[s.next.channel] || "") + " — " + s.next.why;
      var body = h("div", { class: "grow" }, [h("b", { text: lbl }), " ",
        h("span", { class: "d-tag " + (s.closed ? "pos" : s.escalate ? "warn" : "acc"), text: s.closed ? "끝남" : s.escalate ? "간접 확인" : "다음 시도" }),
        h("div", { class: "small", text: "시도 " + s.tries + "회 · " + line })]);
      if (s.escalate) body.appendChild(h("ul", { class: "small" }, s.checklist.map(function (c) { return h("li", { text: c }); })));
      var li = h("li", null, [body]);
      if (!s.closed) li.appendChild(h("div", { class: "acts" }, [btn("이 집 기록", function () { curHouse = x.id; renderContacts(); $("cHouse").focus(); })]));
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
      btn("행복이음 입력 초안 복사", function () { copy(dr.copyText); }, "ghost", "success"),
      btn("사례관리 서식 복사", function () { copy(dr.caseText || "(욕구 영역을 찾지 못했습니다)"); }, "ghost", "success")
    ]));
    var cf = dr.caseForm.filter(function (c) { return c.finding; });
    if (cf.length) slot.appendChild(h("details", null, [h("summary", { text: "사례관리 욕구 영역 " + cf.length + "곳" }),
      h("ul", { class: "small" }, cf.map(function (c) { return h("li", { text: c.domain + ": " + c.finding }); }))]));
    slot.appendChild(h("p", { class: "note", text: dr.note }));
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
    var b = base(), S = F.report.aggregate(b), H = S.households, Q = S.requests;
    lastStats = S;
    var dash = clear(q(root, '[data-slot="dashboard"]'));
    dash.appendChild(h("div", { class: "kpis" }, [
      kpi("발굴 명단", H.total, "가구"), kpi("접촉", H.contacted, H.total ? Math.round(H.contacted / H.total * 100) + "%" : ""),
      kpi("만남·상담", H.met, "가구"), kpi("비해당", H.nonEligible, "가구"), kpi("국민 요청", Q.total, "긴급 " + Q.urgent), kpi("연계", S.links.total, S.links.households + "가구")
    ]));
    dash.appendChild(h("h4", { text: "요청 처리 단계" }));
    dash.appendChild(rankList(S.funnel.map(function (f) { return { label: f.label, n: f.n }; }), S.funnel[0].n));
    if (S.nonEligibleBy.length) { dash.appendChild(h("h4", { text: "비해당 사유" })); dash.appendChild(rankList(S.nonEligibleBy.map(function (x) { return { label: x.label, n: x.n, unit: "가구" }; }), H.nonEligible)); }
    var cd = F.report.countdown(F.report.currentRound(), { done: H.closed, total: H.total });
    lastCd = cd;
    var dl = clear(q(root, '[data-slot="deadline"]'));
    dl.appendChild(h("h4", null, [cd.round.label + " 마감 역산 ", h("span", { class: "d-tag " + (cd.onTrack ? "pos" : "warn"), text: cd.onTrack ? "일정 안" : "뒤처짐" })]));
    dl.appendChild(rankList([{ label: "기간 경과", n: cd.elapsedPct, unit: "%" }, { label: "처리 완료", n: cd.donePct, unit: "%" }], 0));
    dl.appendChild(h("p", { class: "small", text: cd.message }));
    dl.appendChild(h("p", { class: "note", text: "출처: " + cd.round.source + " · 명단은 가상 가구" }));
    if (F.linkGap) renderGaps(b);
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
    var rep = F.report[kind](lastStats, { countdown: lastCd, office: "상주시 ○○ 행정복지센터 맞춤형복지팀(시연)" });
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
    if (tab === "board") renderStats();
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
    var g = F.linkGap.build(Object.assign({}, b, { outcomes: st("outcomes", {}) }));
    var slot = clear(q(root, '[data-slot="gaps"]'));
    slot.appendChild(h("p", { class: "small", text: g.total ? "멈춘 집 " + g.total + "곳 — 오래 멈춘 순" : "멈춘 집이 없습니다." }));
    var grid = h("div", { class: "today-grid" });
    g.stages.forEach(function (s) {
      var ol = h("ol", { class: "slot-list" });
      if (!s.items.length) ol.appendChild(empty("없음"));
      s.items.slice(0, 6).forEach(function (it) {
        var acts = h("div", { class: "acts" });
        if (s.key === "met_nolink") acts.appendChild(btn("상담 기록", function () { O.openRecord(it.id); }));
        if (s.key === "link_nocheck") acts.appendChild(btn("결과 확인함", function () { put("outcomes", F.linkGap.markOutcome(st("outcomes", {}), it.linkId, "확인")); haptic("success"); renderStats(); }));
        if (s.key === "req_stalled") acts.appendChild(btn("방문 예정으로", function () { REQ.setStatus(it.requestId, "visiting", "officer", "연계 누락 보드"); O.refresh(); }));
        ol.appendChild(h("li", null, [h("div", { class: "grow" }, [h("b", { text: it.label }), h("div", { class: "small", text: (it.area ? it.area + " · " : "") + it.why })]), acts]));
      });
      grid.appendChild(h("article", { class: "pane d-card" }, [h("h3", null, [h("span", { class: "d-tag " + (s.items.length ? "warn" : "pos"), text: String(s.items.length) }), s.label]), ol]));
    });
    slot.appendChild(grid);
    slot.appendChild(h("p", { class: "note", text: g.note }));
  }
})();
