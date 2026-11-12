/* 닿음 팀 화면 — 동료 안부 팀 연동·팀 현황 (⚙️ 파로, 68회차 S12-z4, 2026-11-12)
   - 스스로 DOM 에 붙는 것: ②맨 위 팀 안부 알림 줄 ③팀 창(dialog). 69회차: 떠 있던 ①«팀» 단추는 걷고 진입은 앱 «더 보기» 메뉴(app.js morePanel → DaeumTeamUI.open()).
   - 메뉴 항목 아래 작은 글은 DaeumTeamUI.label() — 알림·짝 요청·방문 중 수.
   - 데이터·판정은 shared/team_sync.js(window.DaeumTeam). PC·폰 같은 기능, 폭에 따라 배열만 다르다.
   - 가구는 가명 관리 번호·읍면까지만. 팀원 이름은 본인이 정한 표시 이름(직함 권장). 위치(GPS)는 보내지도 보여 주지도 않는다. */
(function () {
  "use strict";
  var TM = window.DaeumTeam, SY = window.DaeumSync;
  if (!TM) return;
  var RES = { met: "만남", absent: "부재", refuse: "거부", indirect_ok: "간접 확인" };
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9.5" r="2.5"/><path d="M3.5 19c.6-3.3 2.9-5 5.5-5s4.9 1.7 5.5 5"/><path d="M14.8 14.6c.7-.4 1.4-.6 2.2-.6 2 0 3.6 1.3 4 4"/></svg>';
  var host, dlg;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function hm(v) { var d = new Date(v); return isNaN(d) ? "" : ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function tag(sim) { return sim ? '<span class="sim-tag tm-sim">시연·가상</span>' : ""; }
  function live() { return !!(SY && SY.live && SY.live()); }
  function toast(t) {
    var el = document.createElement("div"); el.className = "tm-toast"; el.setAttribute("role", "status"); el.textContent = t;
    document.body.appendChild(el); setTimeout(function () { el.classList.add("out"); setTimeout(function () { el.remove(); }, 400); }, 2600);
  }

  // ═════ ①메뉴 항목 글(69회차 — 떠 있는 «팀» 단추 대신 «더 보기» 메뉴) ═════
  function label() {
    var c = TM.counts(), inc = TM.incoming().length, al = TM.alerts().length;
    return al ? "팀 안부 알림 " + al + "건" : inc ? "짝 지정 요청 " + inc + "건" : TM.live() ? "팀 현황 · 방문 중 " + c.visiting + "명" : "1차 동료·팀장 짝 지정 · 팀 현황";
  }

  // ═════ ②맨 위 알림 줄(나를 1차·2차로 지정한 팀원만) ═════
  function alertsHTML() {
    return TM.alerts().map(function (a, i) {
      var who = esc(a.alias) + tag(a.sim), where = "가구 " + esc(a.hid) + (a.area ? " " + esc(a.area) : "");
      if (a.kind === "help") return '<div class="tm-al help" role="alert"><i></i><div><b>조용한 도움 요청 · ' + who + " · " + where + "</b><span>" + a.el + "분째 방문 중 · 바로 전화하거나 함께 가 주세요</span></div>" +
        '<button type="button" data-tmack="' + i + '">연락했어요</button></div>';
      var step = a.lv >= 2 ? "2차 · 팀장에게도 갔습니다" : "1차 동료(나)에게 온 알림 · " + Math.max(1, a.min + 15 - a.el) + "분 뒤 팀장에게도";
      return '<div class="tm-al lv' + a.lv + '" role="alert"><i></i><div><b>' + who + " · " + where + " 방문 " + a.el + "분째</b><span>예정 " + a.min + "분을 넘겼습니다 · " + step + " · 전화로 안부를 확인한 뒤 눌러 주세요</span></div>" +
        '<button type="button" data-tmack="' + i + '">안부 확인 완료</button></div>';
    }).join("");
  }
  function drawAlerts() {
    if (!host) return; var L = TM.alerts(); host.innerHTML = alertsHTML(); host.hidden = !L.length;
    host.querySelectorAll("[data-tmack]").forEach(function (b) { b.addEventListener("click", function () {
      var a = L[+b.dataset.tmack]; if (!a) return; b.disabled = true;
      TM.ack(a).then(function (r) { toast(r && r.sim ? "확인했습니다(시연 가상 팀원 — 이 기기에서만 닫음)" : a.kind === "help" ? "도움 요청 확인 · 현장 폰에도 반영했습니다" : "안부 확인 완료 · 현장 폰 예정 시간 20분 늘림"); },
        function (e) { b.disabled = false; toast(e.message); });
    }); });
  }

  // ═════ ③팀 창 ═════
  function memberCard(v) {
    var tags = (v.me ? '<span class="tm-t me">나</span>' : "") + (v.lead ? '<span class="tm-t">팀장</span>' : "") + tag(v.sim);
    var now = !v.known ? '<p class="tm-now idle">오늘 소식 없음</p>'
      : v.now ? '<p class="tm-now' + (v.now.over ? " over" : "") + '"><i></i><span><b>방문 중</b> · 가구 ' + esc(v.now.hid) + (v.now.area ? " · " + esc(v.now.area) : "") + '</span><span class="tm-min"><b class="num">' + v.now.el + "</b>분째 / 예정 " + v.now.min + "분" + (v.now.over ? " · 넘김" : "") + "</span></p>"
      : '<p class="tm-now idle">방문 사이 · 이동·사무 중</p>';
    var done = v.done.length ? '<ul class="tm-done" aria-label="오늘 마친 가구">' + v.done.map(function (d) { return '<li class="r-' + esc(d.res) + '"><b>' + esc(d.hid) + "</b> " + esc(RES[d.res] || d.res) + " <small>" + hm(d.at) + (d.area ? " · " + esc(d.area) : "") + "</small></li>"; }).join("") + "</ul>" : "";
    var pv = v.now ? Math.max(0, Math.min(1, (+v.now.el || 0) / Math.max(1, +v.now.min || 1))) : 0; // 69회차: 진행 막대(team.css --p) = 경과분/예정분, 0~1
    return '<article class="tm-card' + (v.now ? " on" : "") + (v.now && v.now.over ? " over" : "") + '"' + (v.now ? ' style="--p:' + pv.toFixed(3) + '"' : "") + '><header><b>' + esc(v.alias) + "</b>" + tags + "</header>" + now +
      (v.known ? '<p class="tm-sum">오늘 마침 <b class="num">' + v.done.length + '</b>가구 · 남은 계획 <b class="num">' + v.left + "</b>가구</p>" : "") + done + "</article>";
  }
  function linkRow(rank, b) {
    var cur = rank === 1 ? TM.peer() : TM.lead(), me = b.me;
    var opts = '<option value="">' + (rank === 1 ? "1차 동료 고르기" : "2차 팀장 고르기") + "</option>" + (b.members || []).filter(function (m) { return m.id !== me; })
      .map(function (m) { return '<option value="' + esc(m.id) + '"' + (cur && cur.id === m.id ? " selected" : "") + ">" + esc(m.alias) + (m.sim ? " (시연·가상)" : "") + "</option>"; }).join("");
    var st = !cur ? "" : cur.state === "accepted" ? '<span class="tm-st ok">연결됨</span>' : cur.state === "declined" ? '<span class="tm-st no">거절됨 · 다른 사람을 고르세요</span>' : '<span class="tm-st wait">수락 기다림</span>';
    return '<label class="tm-lk"><span>' + (rank === 1 ? "1차 동료 <small>예정 시간을 넘기면</small>" : "2차 팀장 <small>15분 더 지나면</small>") + '</span><select data-tmrank="' + rank + '">' + opts + "</select>" + st + "</label>";
  }
  function bodyHTML() {
    var b = TM.board();
    if (!live()) {
      var pn = TM.peerName();
      return '<p class="tm-p">로그인하고 연동이 켜지면 팀 코드로 동료와 이어집니다. 방문 중 예정 시간을 넘기면 1차 동료 화면에, 15분 더 지나면 팀장 화면에도 알림이 뜹니다.</p>' +
        (pn ? '<p class="tm-off">연동 꺼짐 — 알림이 가지 않습니다 · 1차 동료 <b>' + esc(pn) + "</b>에게 직접 전화하세요</p>" : "") +
        '<p class="tm-hint">계정 단추에서 로그인하거나 «시연 계정으로 바로 체험»을 누르세요.</p>';
    }
    b = TM.live() ? b : null; // 연동 중인데 아직 서버에서 못 받았으면 이 기기에 남은 옛 팀 정보로 그리지 않는다
    if (!b) {
      if (TM.error()) return '<p class="tm-off">' + esc(TM.error()) + "</p>";
      if (!TM._seen) return '<p class="tm-p">팀 정보를 불러오는 중…</p>';
      return '<div class="tm-forms"><form class="tm-f" data-tmf="create"><h4>팀 만들기</h4><label>팀 이름<input name="a" maxlength="30" required placeholder="예: 함창읍 맞춤형복지팀"></label>' +
        '<label>내 표시 이름<input name="b" maxlength="12" required placeholder="예: 이주무관"></label><button class="tm-btn pri">만들고 팀 코드 받기</button></form>' +
        '<form class="tm-f" data-tmf="join"><h4>팀 코드 넣기</h4><label>팀 코드 6자<input name="a" maxlength="6" required autocapitalize="characters" placeholder="예: K7MP2Q"></label>' +
        '<label>내 표시 이름<input name="b" maxlength="12" required placeholder="예: 박주무관"></label><button class="tm-btn pri">팀에 들어가기</button></form></div>' +
        '<p class="tm-hint">표시 이름은 실명 대신 직함으로 써도 됩니다. 팀 코드는 같은 팀 사람에게만 알려 주세요.</p>';
    }
    var c = TM.counts(), inc = TM.incoming();
    var h = '<div class="tm-head"><div><b class="tm-name">' + esc(b.team.name) + '</b><span class="tm-code">팀 코드 <b class="num">' + esc(b.team.code) + "</b></span></div>" +
      (b.team.demo ? '<p class="tm-demo">시연 팀 · 같은 시연 팀 화면을 함께 보고 있을 수 있습니다 · 매일 새벽 3시 30분 처음 상태로</p>' : "") + "</div>";
    if (inc.length) h += '<section class="tm-sec tm-inc"><h4>나에게 온 짝 요청</h4>' + inc.map(function (x) {
      return '<div class="tm-req"><span><b>' + esc(x.alias) + "</b>님이 나를 " + (x.rank === 1 ? "1차 동료" : "2차 팀장") + "로 지정했습니다</span>" +
        '<button type="button" class="tm-btn pri" data-tmdec="' + esc(x.link) + '" data-yes="1">수락</button><button type="button" class="tm-btn" data-tmdec="' + esc(x.link) + '">거절</button></div>'; }).join("") + "</section>";
    h += '<section class="tm-sec"><h4>팀 현황 <small>실시간 · 위치는 보내지 않습니다</small></h4>';
    if (!b.active) h += '<p class="tm-hint">짝(1차 동료·2차 팀장)이 수락되면 팀원끼리 현황이 보입니다. 아래에서 짝을 고르거나 받은 요청을 수락하세요.</p>';
    else h += '<div class="tm-kpi"><span><b class="num">' + c.visiting + "</b>방문 중</span><span><b class=\"num\">" + c.done + "</b>오늘 마친 가구</span><span><b class=\"num\">" + c.left + "</b>남은 계획</span></div>";
    var V = (b.members || []).map(function (m) { return TM.view(m.id); }).filter(function (v) { return v && (v.known || v.me || b.active && v.active); });
    V.sort(function (x, y) { return (y.me - x.me) || ((y.now ? 1 : 0) - (x.now ? 1 : 0)) || (y.lead - x.lead); });
    h += '<div class="tm-grid">' + V.map(memberCard).join("") + "</div></section>";
    h += '<section class="tm-sec"><h4>내 안부 짝</h4><div class="tm-lks">' + linkRow(1, b) + linkRow(2, b) + "</div>" +
      '<p class="tm-hint">상대가 «수락»해야 연결됩니다 · 예정 시간을 넘기면 1차 동료 화면에, 15분 더 지나면 팀장 화면에도 · 조용한 도움 요청은 두 사람 모두에게 · 앱 화면 알림만(문자·카톡 없음)</p></section>';
    if (!b.team.demo) h += '<p class="tm-foot"><button type="button" class="tm-btn ghost" data-tmleave="1">팀 나가기</button></p>';
    return h;
  }
  function drawBody() {
    if (!dlg || !dlg.open) return;
    var ae = document.activeElement; if (ae && dlg.contains(ae) && /^(INPUT|SELECT)$/.test(ae.tagName)) return; // 입력 중엔 다시 그리지 않는다
    var bd = dlg.querySelector(".tm-body"); bd.innerHTML = bodyHTML(); bind(bd);
  }
  function busy(el, p) { el.disabled = true; return p.then(function (v) { el.disabled = false; return v; }, function (e) { el.disabled = false; toast(e.message); throw e; }); }
  function bind(bd) {
    bd.querySelectorAll("[data-tmf]").forEach(function (f) { f.addEventListener("submit", function (e) {
      e.preventDefault(); var a = f.elements.a.value.trim(), b = f.elements.b.value.trim(), btn = f.querySelector("button");
      busy(btn, f.dataset.tmf === "create" ? TM.create(a, b) : TM.join(a, b)).then(function (d) { toast(f.dataset.tmf === "create" ? "팀을 만들었습니다 · 팀 코드 " + (d && d.code || "") + " 를 동료에게 알려 주세요" : "팀에 들어갔습니다 · 1차 동료·2차 팀장을 고르세요"); drawBody(); }, function () {});
    }); });
    bd.querySelectorAll("[data-tmrank]").forEach(function (s) { s.addEventListener("change", function () {
      busy(s, TM.setLink(+s.dataset.tmrank, s.value)).then(function () { s.blur(); toast(s.value ? "지정했습니다 · 상대가 수락하면 연결됩니다" : "지정을 풀었습니다"); drawBody(); }, function () {});
    }); });
    bd.querySelectorAll("[data-tmdec]").forEach(function (b) { b.addEventListener("click", function () {
      var yes = !!b.dataset.yes; busy(b, TM.decide(b.dataset.tmdec, yes)).then(function () { toast(yes ? "수락했습니다 · 이제 그 사람의 안부 알림이 이 화면에 뜹니다" : "거절했습니다"); drawBody(); }, function () {});
    }); });
    var lv = bd.querySelector("[data-tmleave]"); if (lv) lv.addEventListener("click", function () {
      if (!window.confirm("팀에서 나갈까요? 내 짝 지정과 오늘 현황도 함께 지워집니다.")) return;
      busy(lv, TM.leave()).then(function () { toast("팀에서 나왔습니다"); drawBody(); }, function () {});
    });
  }
  function open() {
    if (dlg && dlg.open) return;
    dlg = document.createElement("dialog"); dlg.className = "tm-dlg"; dlg.setAttribute("aria-label", "우리 팀 · 동료 안부");
    dlg.innerHTML = '<div class="tm-in"><header class="tm-top"><h3>' + ICON + "우리 팀 · 동료 안부</h3>" + '<button type="button" class="tm-x" aria-label="닫기">×</button></header><div class="tm-body"></div></div>';
    document.body.appendChild(dlg); dlg.querySelector(".tm-x").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () { dlg.remove(); dlg = null; });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    drawBody(); if (live()) TM.refresh();
  }
  function draw() { drawAlerts(); drawBody(); }
  function mount() {
    if (host) return;
    host = document.createElement("div"); host.className = "tm-alerts"; host.hidden = true; host.setAttribute("aria-label", "팀 안부 알림");
    document.body.appendChild(host);
    TM.on(function (w) { if (w === "board" || w === "error") TM._seen = true; draw(); });
    if (SY && SY.on) SY.on(function (w) { if (w === "mode") draw(); });
    setInterval(function () { drawAlerts(); if (dlg && dlg.open) drawBody(); }, 30e3); // 몇 분째·단계는 시각으로 바뀐다
    draw();
  }
  window.DaeumTeamUI = { open: open, mount: mount, label: label };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
