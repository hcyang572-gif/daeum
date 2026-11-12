/* 닿음 현장 기능 — S12-i3(⚙️ 파로, 2026-11-12 · 승인 시안 S12-h v2.2 «현장 어려움 ①~⑥» + 현장 추가 발굴 가구)
   ① 도로명주소 자동 정리·«확인 필요»(오늘 탭 명단 카드 아래 · 집 앞 요약 한 줄)
   ② 부재 → 간접 확인·부재 메모·문 앞 방문 안내 쪽지·안내 문자·다음 방문 제안(현장 확인 «문 앞(부재)»)
   ③ 한 장 인계 카드(보고 탭) ④ 화면 가림·3분 자리 비움 자동 잠금(모든 화면, 머리 단추)
   ⑤ 2인 방문 권장·동료와 같이 가기(집 앞 요약) ⑥ 읍면·담당별 남은 가구 막대(보고 탭)
   ⑦ 명단 밖 «추가 발굴 가구» 간단 등록(집 앞 요약 아래 작게) → 행복이음 신규 상담 입력용 초안
   계산은 officer/fieldwork.js 순수 함수(F.addr·F.nextTry·F.pairNeed·F.remain·F.handoff·F.newFind), 입력칸은 shared/chips.js «예시 칩 + 직접 입력».
   app/app.js 가 DaeumField.use(ctx) 로 도구를 넘기고, 각 화면에서 html()·bind() 를 부른다.
   저장: 이 기기 localStorage «daeum.s12.field»(시연 처음 상태로 지우는 접두어 daeum.s12.) — 서버 전송 0.
   ⛔ 주민 신고 접수 없음 · 공유·쪽지·문자·인계 카드·잠금 화면엔 가구번호·읍면·시각만(성명·주소·연락처·위기 사유 원문 0) · 동료 안부(안전 모드)는 건드리지 않음. */
(function (root) {
  "use strict";
  var C = null, F = null, CH = null;
  var KEY = "daeum.s12.field", IDLE_MS = 180000;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function st() { var s = (C && C.lsGet(KEY, null)) || {}; s.hh = s.hh || {}; s.newhh = s.newhh || []; return s; }
  function save(s) { C.lsSet(KEY, s); }
  function get(hid) { return st().hh[hid] || {}; }
  function put(hid, k, v) { var s = st(), o = s.hh[hid] || (s.hh[hid] = {}); if (v === "" || v == null) delete o[k]; else o[k] = v; save(s); }

  // ── 사례별 예시 문구(시안 S12-h v2.2 EX 그대로 · 상황 낱말만, 개인정보 없음) ──
  var EX = {
    away: { "인기척": ["방문 시 부재, 인기척 없음", "문 앞 택배·우편물 다수", "현관 불이 켜져 있으나 응답 없음"],
      "시간대": ["오전 방문 두 번 모두 부재 — 저녁 시간대로 옮김", "이웃 «저녁 6시 뒤 귀가» 진술", "주말에만 집에 있다는 진술"],
      "쪽지·연락": ["방문 안내 쪽지를 문틈에 남김", "등록된 번호로 통화 시도 — 연결 안 됨", "통장에게 귀가하면 알려 달라고 부탁"] },
    indirect: { "이웃": ["이웃 «최근에도 오가는 것 봤다» 진술", "이웃 «며칠째 못 봤다» 진술"],
      "통장·이장": ["통장 «혼자 지내며 외출이 드묾»", "이장 «지난주 마을회관에서 봤다»"],
      "계량기·우편": ["전기 계량기 돌아감 — 거주 중으로 보임", "우편함에 고지서 3개월분 쌓임", "가스 계량기 멈춤 — 공급 중단 의심"] },
    refwhy: { "식사·생계": ["혼자 사는 어르신으로 식사가 불규칙함(1일 1~2끼)", "소득이 끊겨 당장 생계 유지가 어려움"],
      "돌봄": ["거동이 불편해 일상 돌봄이 필요함", "가까운 연락 상대가 없어 정기 안부 확인이 필요함"],
      "건강·의료": ["약값 부담으로 만성질환 약 복용을 거름", "진료가 3개월째 끊겨 건강 상태 확인이 필요함"],
      "주거·난방": ["보일러 고장으로 겨울 난방을 못 함", "누수·곰팡이로 주거 수선이 필요함"],
      "정서": ["우울감 진술 — 전문 상담 연계가 필요함"] },
    sms: { "재방문": ["지난번 찾아뵈었을 때 계시지 않아 다시 들르려 합니다.", "편한 시간이 있으시면 주민센터로 알려 주세요."],
      "서류": ["신청에 필요한 서류는 신분증과 통장 사본입니다.", "서류 준비가 어려우시면 방문해서 함께 챙겨 드리겠습니다."],
      "회신": ["신청 결과는 다음 주 중 전화로 알려 드리겠습니다.", "궁금한 점은 담당 번호로 언제든 연락 주세요."] },
    handoff: { "다음 할 일": ["연계 회신 확인 뒤 신청 여부 전화", "저녁 시간대 세 번째 방문, 안 되면 간접 확인으로 마감", "신청 서류 받으러 한 번 더 방문"],
      "주의": ["2인 방문 권장 — 지난 기록에 위험 이력", "오전에는 통화가 잘 안 됨", "자녀와 먼저 통화하길 원함"] },
    newfind: { "현장 관찰": ["방문 가는 길에 옆집 문 앞 고지서·우편물 다수 확인", "같은 건물 다른 집 현관에 단전 예고장이 붙어 있음", "겨울인데 깨진 창문을 비닐로만 막아 둠"],
      "동행·가족 언급": ["동행한 이장이 «혼자 사는 어르신이 몇 주째 안 보인다»고 언급", "방문 가구 가족이 «옆집 어르신이 식사를 거른다»고 언급"],
      "방문 가구 안": ["방문 가구에 함께 사는 다른 세대원에게 따로 위기 신호가 보임"] }
  };
  var REF_OF = { "생계": "식사·생계", "돌봄": "돌봄", "고립": "돌봄", "건강": "건강·의료", "주거": "주거·난방" };
  /** 사례 묶음에서 앞에 올 묶음(prefer)을 먼저 늘어놓은 예시 목록 */
  function exList(k, prefer, max) {
    var g = EX[k] || {}, keys = Object.keys(g), order = (prefer || []).filter(function (x) { return g[x]; });
    keys.forEach(function (x) { if (order.indexOf(x) < 0) order.push(x); });
    var out = []; order.forEach(function (x) { g[x].forEach(function (t) { if (out.indexOf(t) < 0) out.push(t); }); });
    return out.slice(0, max || 6);
  }
  /** 예시 칩 + 직접 입력. data-fill 을 붙여 «쓰는 중에는 다시 그리지 않는다»(app.js render 가드)에 걸리게 한다 */
  function chip(id, label, k, value, o) {
    o = o || {};
    return CH.html({ id: id, label: label, hint: o.hint, examples: exList(k, o.prefer, o.max), value: value || "", multi: o.multi !== false, maxlength: o.maxlength || 120, placeholder: o.ph || "직접 쓰기 · 예시를 눌러 채운 뒤 고쳐 쓰기" })
      .replace('<input class="in1 chipin-i"', '<input data-fill="" data-fd="1" class="in1 chipin-i"');
  }
  // 다시 그려도 쓰던 칸으로 돌아오게(1분 시계 등이 화면을 다시 그릴 때)
  var focusId = null;
  function keepFocus(scope) {
    (scope || document).querySelectorAll("[data-fd]").forEach(function (inp) {
      inp.addEventListener("focus", function () { focusId = inp.id; });
      inp.addEventListener("blur", function () { setTimeout(function () { if (document.contains(inp)) focusId = null; }, 0); });
    });
    if (focusId) { var el = document.getElementById(focusId); if (el && el.hasAttribute("data-fd")) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* 무시 */ } } }
  }
  function now() { return new Date(); }
  function hm(d) { d = new Date(d); return (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes(); }
  function share(text, ok) {
    var done = function () { if (ok) ok(); };
    if (navigator.share) { navigator.share({ text: text }).then(done, function () { /* 취소 */ }); return; }
    C.copy(text); done();
  }

  // ── 아래에서 올라오는 시트(dialog) — 앱 화면을 다시 그려도 닫히지 않는다 ──
  function sheet(html, onBind) {
    document.querySelectorAll("dialog.fd-sheet").forEach(function (d) { d.close(); });
    var d = document.createElement("dialog"); d.className = "fd-sheet";
    d.innerHTML = '<div class="fd-sh-in"><span class="fd-grab" aria-hidden="true"></span>' + html + '<button type="button" class="fd-x" data-x="1" aria-label="닫기">×</button></div>';
    document.body.appendChild(d);
    d.addEventListener("close", function () { d.remove(); });
    d.addEventListener("click", function (e) { if (e.target === d || e.target.closest("[data-x]")) d.close(); });
    d.showModal();
    if (onBind) onBind(d);
    return d;
  }
  function printOnly(html) {
    var p = document.getElementById("fdPrint"); if (!p) { p = document.createElement("div"); p.id = "fdPrint"; document.body.appendChild(p); }
    p.innerHTML = html; document.body.classList.add("fd-printing");
    var off = function () { document.body.classList.remove("fd-printing"); window.removeEventListener("afterprint", off); };
    window.addEventListener("afterprint", off);
    setTimeout(function () { window.print(); setTimeout(off, 1500); }, 30);
  }

  // ═════ ① 도로명주소 자동 정리 ═════
  // 시연 기본 명단은 주소가 모두 깔끔해 «확인 필요» 예가 없다 → 세 가구만 «시연 가상 결과»로 어긋나게 해서 보여 준다(화면에 꼬리표).
  var DEMO_BAD = [[5, "diff"], [17, "num"], [30, "area"]];
  function demoScan() {
    var L = root.__DAEUM_DEMO_LIST__; if (!L || !F.addr) return null;
    var c = L.columns, ia = c.indexOf("(행복이음)주소"), ib = c.indexOf("(행안부)주소"), ix = c.indexOf("소재행정동");
    var rows = L.rows.map(function (r) { return r.slice(); });
    DEMO_BAD.forEach(function (b) {
      var r = rows[b[0]]; if (!r) return;
      if (b[1] === "diff") r[ib] = String(r[ib]).replace(/(\d+)$/, function (n) { return +n + 11; });
      if (b[1] === "num") { r[ia] = String(r[ia]).replace(/\s*\d+$/, ""); r[ib] = ""; }
      if (b[1] === "area") r[ib] = String(r[ib]).replace(r[ix], r[ix] === "공검면" ? "이안면" : "공검면");
    });
    var s = F.addr.scan(c, rows, L.householdIds); s.demo = true; s.name = "가상 명단"; return s;
  }
  /** 불러온 파일: 줄마다 가구를 찾고(불러오기와 같은 규칙) 주소는 이 함수 안에서만 읽는다. 저장은 «가구번호·읍면·사유»만 */
  function scanImport(rows, households, name) {
    var IM = root.DaeumImport; if (!IM || !F.addr || !rows || !rows.length) return null;
    var hd = IM.mapCols(rows); if (hd.i < 0) return null;
    var head = rows[hd.i], body = rows.slice(hd.i + 1), ids = body.map(function (r) { var x = IM.importRows([head, r], households); return x.ok ? x.ids[0] : ""; });
    var s = F.addr.scan(head.map(function (h) { return String(h).trim(); }), body, ids); s.name = name || ""; s.at = Date.now();
    var all = st(); all.addr = s; save(all); return s;
  }
  function addrRes() {
    var imp = C.lsGet("daeum.s11.import", null) || {}, a = st().addr;
    if (a && !imp.demo && imp.name && a.name === imp.name) return a;
    return demoScan();
  }
  function addrNeed(hid) { var a = addrRes(); return a ? a.need.filter(function (x) { return x.id === hid; })[0] || null : null; }
  function addrCard() {
    var a = addrRes(); if (!a) return "";
    var n = a.need.length;
    return '<section class="fd-card fd-addr blk" aria-label="도로명주소 정리"><div class="fd-h"><b>도로명주소 정리</b>' + (a.demo ? '<span class="fd-tag">시연 가상 결과</span>' : "") + "</div>" +
      '<div class="fd-n3"><span><b class="num">' + a.tidy + "</b>정리됨</span><span><b class=\"num\">" + a.jibun + "</b>지번 → 도로명 대기</span><span class=\"" + (n ? "w" : "") + '"><b class="num">' + n + "</b>확인 필요</span></div>" +
      (n ? '<ul class="fd-need">' + a.need.slice(0, 6).map(function (x) { return '<li><a href="#home:' + esc(x.id) + '"><b class="num">' + esc(x.id) + "</b><small>" + esc(x.area) + "</small></a><span>" + esc(x.why) + "</span></li>"; }).join("") + (n > 6 ? "<li><span>… 외 " + (n - 6) + "가구</span></li>" : "") + "</ul>" : "") +
      '<p class="fd-src">띄어쓰기·시도 이름을 맞추고 두 주소 칸을 대조합니다 · 지번→도로명 실제 변환은 행정안전부 도로명주소 API(도입 때) · 주소 글은 화면·저장소에 남기지 않음</p></section>';
  }

  // ═════ ⑤ 2인 방문 권장 ═════
  function pairOf(hid) {
    var notes = (C.F.store.get("homeNotes", {}) || {})[hid] || [], logs = C.logs().filter(function (l) { return l.household_no === hid; });
    return F.pairNeed(notes, logs);
  }
  function pairWarn(hid) { var p = pairOf(hid); return p.need ? "2인 방문 권장(" + p.why + ")" : ""; }
  function pairCard(hid) {
    var p = pairOf(hid); if (!p.need) return "";
    var ask = get(hid).pair;
    return '<section class="fd-card fd-pair blk" aria-label="2인 방문 권장"><div class="fd-h"><b>2인 방문 권장</b><span class="fd-tag w">' + esc(p.why) + "</span></div>" +
      '<p class="fd-why">혼자 들어가지 않도록 동료에게 동행을 요청하세요. 요청에는 가구번호·읍면·시각만 갑니다.</p>' +
      (ask ? '<p class="fd-ok">✓ ' + esc(hm(ask.at)) + " 동행 요청함 · 2인 방문</p>" : "") +
      '<button type="button" class="sbtn fd-btn" data-fd-act="pair">' + (ask ? "동행 요청 다시 보내기" : "동료와 같이 가기") + "</button></section>";
  }
  function pairSheet(hid) {
    var h = C.BY[hid], c = C.dayCtx(), eta = "";
    if (c) { var i = c.d.ids.indexOf(hid); eta = i >= 0 && c.d.s.rows[i] ? c.d.s.rows[i].arrive : ""; }
    var d = now(), when = (d.getMonth() + 1) + ". " + d.getDate() + ". " + (eta || hm(d));
    var text = "[닿음 · 동행 요청] " + when + " " + h.area + " 방문에 같이 가 주실 수 있나요? 가구 " + hid + " · 2인 방문 권장 집입니다(이름·주소는 PC 명단에서 확인).";
    sheet('<h3>동료와 같이 가기</h3><p class="fd-why">' + esc(hid) + "는 <b>2인 방문 권장</b> 집입니다. 아래 문구를 메신저·문자로 보냅니다.</p>" +
      '<div class="fd-paper fd-sens">' + esc(text) + "</div>" +
      '<p class="fd-src">가구번호·읍면·시각만 들어갑니다 · 위치는 보내지 않습니다</p>' +
      '<div class="fd-row"><button type="button" class="sbtn" data-x="1">닫기</button><button type="button" class="sbtn go" data-fd-send="1">동행 요청 보내기</button></div>', function (dl) {
      dl.querySelector("[data-fd-send]").addEventListener("click", function () { share(text, function () { put(hid, "pair", { at: new Date().toISOString() }); C.toast("동행 요청을 보냈습니다 · 2인 방문"); dl.close(); C.render(); }); });
    });
  }

  // ═════ ⑦ 현장 추가 발굴 가구 ═════
  function areas(first) {
    var a = []; if (first) a.push(first);
    C.listIds().forEach(function (id) { var x = (C.BY[id] || {}).area; if (x && a.indexOf(x) < 0) a.push(x); });
    return a.slice(0, 8);
  }
  function nfCard() {
    var n = st().newhh.length;
    return '<section class="fd-card fd-nf" aria-label="명단 밖 가구"><div class="fd-h"><b>명단 밖 가구를 봤다면</b><span class="fd-tag">현장 보조</span></div>' +
      '<p class="fd-why">현장에서 직접 본 위기 가구만 임시 번호로 남깁니다. 주민 신고를 받는 창구가 아닙니다.</p>' +
      '<div class="fd-row"><button type="button" class="sbtn fd-btn" data-fd-act="nf">추가 발굴 가구 등록</button>' + (n ? '<button type="button" class="sbtn" data-fd-act="nflist">등록한 ' + n + "가구</button>" : "") + "</div></section>";
  }
  function nfSheet(hid) {
    var s = st(), id = F.newFind.nextId(s.newhh), h = C.BY[hid] || {}, A = areas(h.area), sel = { area: h.area || A[0], signs: {} }, how = "";
    function body() {
      return '<h3>추가 발굴 가구 · <span class="num">' + id + "</span></h3>" +
        '<div class="fd-f"><span class="fd-l">읍면</span><div class="fd-opts" role="radiogroup" aria-label="읍면">' + A.map(function (a) { return '<button type="button" role="radio" data-nfa="' + esc(a) + '" aria-checked="' + (sel.area === a) + '">' + esc(a) + "</button>"; }).join("") + "</div></div>" +
        '<div class="fd-f"><span class="fd-l">본 위기 신호 · 여러 개</span><div class="fd-opts" role="group" aria-label="위기 신호">' + F.newFind.SIGNS.map(function (g) { return '<button type="button" data-nfs="' + g + '" aria-pressed="' + !!sel.signs[g] + '">' + g + "</button>"; }).join("") + "</div></div>" +
        chip("fdNfHow", "발견 경위", "newfind", how, { multi: false }) +
        '<p class="fd-src">앱에는 임시 번호·읍면·경위만 남깁니다. 이름·주소는 행복이음 신규 상담에 직접 입력합니다.</p>' +
        '<button type="button" class="sbtn go fd-wide" data-nfsave="1">등록 · 행복이음 신규 상담 초안</button>';
    }
    sheet(body(), function bindNf(dl) {
      var inn = dl.querySelector(".fd-sh-in");
      function re() { inn.innerHTML = '<span class="fd-grab" aria-hidden="true"></span>' + body() + '<button type="button" class="fd-x" data-x="1" aria-label="닫기">×</button>'; wire(); }
      function wire() {
        inn.querySelectorAll("[data-nfa]").forEach(function (b) { b.addEventListener("click", function () { sel.area = b.dataset.nfa; C.vib(); re(); }); });
        inn.querySelectorAll("[data-nfs]").forEach(function (b) { b.addEventListener("click", function () { sel.signs[b.dataset.nfs] = !sel.signs[b.dataset.nfs]; C.vib(); re(); }); });
        CH.bind(inn, "fdNfHow", function (v) { how = v; });
        inn.querySelector("[data-nfsave]").addEventListener("click", function () {
          var all = st(), x = F.newFind.make(all.newhh, { area: sel.area, how: how, signs: Object.keys(sel.signs).filter(function (k) { return sel.signs[k]; }), from: hid });
          all.newhh.push(x); save(all); C.vib();
          inn.innerHTML = '<span class="fd-grab" aria-hidden="true"></span><h3>등록했습니다 · <span class="num">' + x.id + '</span></h3><p class="fd-why">행복이음 «신규 상담»에 아래 초안을 붙여 넣고, 성명·주소·연락처는 그 화면에 직접 입력하세요.</p>' +
            '<pre class="fd-paper">' + esc(F.newFind.draft(x)) + "</pre>" +
            '<div class="fd-row"><button type="button" class="sbtn" data-x="1">닫기</button><button type="button" class="sbtn go" data-nfcopy="1">초안 복사</button></div><button type="button" class="fd-x" data-x="1" aria-label="닫기">×</button>';
          inn.querySelector("[data-nfcopy]").addEventListener("click", function () { C.copy(F.newFind.draft(x)); });
          C.render();
        });
      }
      wire();
    });
  }
  function nfList() {
    var L = st().newhh;
    sheet("<h3>현장 추가 발굴 " + L.length + "가구</h3>" + (L.length ? '<ul class="fd-nfl">' + L.map(function (x) {
      return '<li><span><b class="num">' + esc(x.id) + "</b><small>" + esc(x.area + " · " + (x.signs.join("·") || "신호 없음") + " · " + (new Date(x.at).getMonth() + 1) + "." + new Date(x.at).getDate()) + '</small></span><button type="button" class="sbtn" data-nfc="' + esc(x.id) + '">초안 복사</button><button type="button" class="sbtn" data-nfd="' + esc(x.id) + '" aria-label="' + esc(x.id) + ' 지우기">지우기</button></li>';
    }).join("") + "</ul>" : '<p class="fd-why">아직 없습니다.</p>') + '<p class="fd-src">행복이음 신규 상담에 넣은 뒤에는 지워 두세요.</p>', function (dl) {
      dl.querySelectorAll("[data-nfc]").forEach(function (b) { b.addEventListener("click", function () { var x = st().newhh.filter(function (y) { return y.id === b.dataset.nfc; })[0]; if (x) C.copy(F.newFind.draft(x)); }); });
      dl.querySelectorAll("[data-nfd]").forEach(function (b) { b.addEventListener("click", function () { var s = st(); s.newhh = s.newhh.filter(function (y) { return y.id !== b.dataset.nfd; }); save(s); dl.close(); C.render(); C.toast("지웠습니다"); }); });
    });
  }

  // ═════ 집 앞 요약(현장 탭) 덧붙임 ═════
  function homeExtra(hid) {
    var an = addrNeed(hid);
    return (an ? '<p class="fd-anote" role="note"><b>주소 확인 필요</b>' + esc(an.why) + " · 행복이음·주민등록 주소를 확인하고 가세요</p>" : "") + pairCard(hid) + nfCard();
  }
  function bindHome(scope, hid) {
    var p = scope.querySelector('[data-fd-act="pair"]'); if (p) p.addEventListener("click", function () { pairSheet(hid); });
    var n = scope.querySelector('[data-fd-act="nf"]'); if (n) n.addEventListener("click", function () { nfSheet(hid); });
    var l = scope.querySelector('[data-fd-act="nflist"]'); if (l) l.addEventListener("click", nfList);
  }

  // ═════ ② 부재 — 간접 확인·부재 메모·쪽지·안내 문자·다음 방문 ═════
  function nextOf(hid) {
    var vt = F.visitTime.profile(C.attempts(), hid, { neighborLog: C.neighborLog() });
    return F.nextTry({ absentN: vt.absences.length + 1, best: vt.best, from: now(), gap: C.A.retryGap });
  }
  function awayPanel(hid) {
    var o = get(hid), nx = nextOf(hid);
    return '<section class="fd-card fd-away blk" aria-label="부재일 때"><div class="fd-h"><b>부재일 때</b><span class="fd-tag">간접 확인 · 쪽지 · 다음 방문</span></div>' +
      chip("fdIndirect", "간접 확인 내용", "indirect", o.indirect, { hint: "이웃·통장·이장·계량기·우편함" }) +
      chip("fdAway", "부재 메모", "away", o.away) +
      '<div class="fd-next' + (nx.close ? " w" : "") + '"><small>' + (nx.close ? "다음 단계" : "다음 방문 제안") + "</small><b>" + esc(nx.line) + "</b>" + (nx.close ? "" : "<span>비어 있던 시간대를 피해서 · 기본 3번 · 다시 방문 간격 근무일 " + C.A.retryGap + "일(시연 기본값)</span>") + "</div>" +
      '<div class="fd-row"><button type="button" class="sbtn" data-fd-act="note">문 앞 방문 안내 쪽지</button><button type="button" class="sbtn" data-fd-act="sms">안내 문자</button></div>' +
      '<p class="fd-src">쪽지·문자에는 담당 전화만 적힙니다 · 가구 정보(이름·사유)는 넣지 않습니다</p></section>';
  }
  var NOTE_HTML = '<div class="fd-note"><h4>찾아뵈었습니다</h4><p>오늘 찾아뵈었는데 계시지 않아 쪽지를 남깁니다.<br>편하실 때 연락 주세요.</p><p class="fd-tel">054-○○○-○○○○</p><p class="fd-org">상주시청 복지 담당</p></div>';
  function noteSheet() {
    sheet("<h3>방문 안내 쪽지</h3>" + NOTE_HTML + '<p class="fd-src">가구 정보(이름·사유)는 넣지 않습니다. 담당 전화만 적힙니다(시연은 가린 번호).</p>' +
      '<div class="fd-row"><button type="button" class="sbtn" data-x="1">닫기</button><button type="button" class="sbtn go" data-fd-print="1">인쇄</button></div>', function (dl) {
      dl.querySelector("[data-fd-print]").addEventListener("click", function () { printOnly(NOTE_HTML); });
    });
  }
  function smsSheet(hid) {
    var o = get(hid), nx = nextOf(hid), v = o.sms || "";
    var pre = nx.close ? "" : "지난번 찾아뵈었을 때 계시지 않아 " + nx.md + " " + nx.label + "쯤 다시 들르려 합니다.";
    sheet("<h3>안내 문자</h3>" + chip("fdSms", "문안", "sms", v || pre, { prefer: ["재방문"], maxlength: 200 }) +
      '<p class="fd-src">이름·사유는 넣지 않습니다 · 받는 번호는 행복이음에서 확인 · 발송은 기관 문자 시스템이나 업무폰으로</p>' +
      '<div class="fd-row"><button type="button" class="sbtn" data-x="1">닫기</button><button type="button" class="sbtn go" data-fd-copy="1">문안 복사</button></div>', function (dl) {
      CH.bind(dl, "fdSms", function (x) { put(hid, "sms", x); });
      dl.querySelector("[data-fd-copy]").addEventListener("click", function () { var t = dl.querySelector("#fdSms").value.trim(); if (t) { put(hid, "sms", t); C.copy(t); } });
    });
  }
  function bindAway(scope, hid) {
    CH.bind(scope, "fdIndirect", function (v) { put(hid, "indirect", v); });
    CH.bind(scope, "fdAway", function (v) { put(hid, "away", v); });
    var a = scope.querySelector('[data-fd-act="note"]'); if (a) a.addEventListener("click", noteSheet);
    var b = scope.querySelector('[data-fd-act="sms"]'); if (b) b.addEventListener("click", function () { smsSheet(hid); });
    keepFocus(scope);
  }

  // ═════ 상담 — 연계 의뢰 사유 ═════
  function referWhy(hid) {
    var pre = C.typesFor(C.BY[hid]).map(function (t) { return REF_OF[t]; }).filter(Boolean);
    return '<section class="fd-card fd-ref blk" aria-label="연계 의뢰 사유">' + chip("fdRef", "연계 의뢰 사유", "refwhy", get(hid).refwhy, { prefer: pre, hint: "의뢰서 «의뢰 사유» 칸으로 갑니다" }) + "</section>";
  }
  function bindRefer(scope, hid) { CH.bind(scope, "fdRef", function (v) { put(hid, "refwhy", v); }); keepFocus(scope); }

  // ═════ ⑥ 읍면·담당별 남은 가구 · ③ 한 장 인계 카드(보고 탭) ═════
  function ownerMap(ids) {
    var m = C.meta(), cnt = {}, own = {}, any = false;
    ids.forEach(function (id) { var x = m[id] || {}; if (x.owner) { own[id] = x.owner; any = true; } var a = (C.BY[id] || {}).area; cnt[a] = (cnt[a] || 0) + 1; });
    if (any) return { by: own, demo: false };
    var L = "ABCDEFGH", ar = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a] || (a < b ? -1 : 1); }), by = {};
    ids.forEach(function (id) { var a = (C.BY[id] || {}).area, i = ar.indexOf(a); by[id] = "담당 " + L.charAt(Math.floor(i / 2) % L.length); });
    return { by: by, demo: true };
  }
  function remainCard() {
    var ids = C.listIds(); if (!ids.length) return "";
    var om = ownerMap(ids), R = F.remain(ids.map(function (id) { return { id: id, area: (C.BY[id] || {}).area, owner: om.by[id], st: C.statusOf(id) }; }));
    return '<section class="fd-card fd-remain blk" aria-label="읍면·담당별 남은 가구"><div class="fd-h"><b>읍면·담당별 남은 가구</b><span class="fd-tag">합계 ' + R.n + " / " + R.total + "</span></div>" +
      '<div class="fd-bars">' + R.rows.map(function (x) { return '<div><span>' + esc(x.area) + "<small>" + esc(x.owner) + '</small></span><i style="--w:' + x.w + '%"' + (x.absent ? ' class="ab"' : "") + '></i><b class="num">' + x.n + "</b></div>"; }).join("") + "</div>" +
      '<p class="fd-src">한국사회보장정보원 발굴 명단 · 남은 가구 = 만남·거절로 끝나지 않은 집(부재 포함, 막대 끝 주황)' + (om.demo ? " · 담당 배정은 시연 가상" : "") + "</p></section>";
  }
  function handIds() {
    var c = C.dayCtx(), out = [];
    if (c) c.d.ids.forEach(function (id) { if (out.indexOf(id) < 0) out.push(id); });
    C.listIds().forEach(function (id) { if (out.length < 12 && out.indexOf(id) < 0 && C.statusOf(id) !== "planned") out.push(id); });
    return out.slice(0, 12);
  }
  function handOf(hid) {
    var h = C.BY[hid], m = C.meta()[hid] || {}, o = C.recOf(hid) || {}, ck = o.checks || {}, ks = Object.keys(ck).filter(function (k) { return ck[k]; });
    var vt = F.visitTime.profile(C.attempts(), hid, { neighborLog: C.neighborLog() }), L = C.lastLog(hid), stt = C.statusOf(hid);
    var met = vt.met.length || (stt === "done" ? 1 : 0), ab = vt.absences.length || (stt === "absent" ? 1 : 0);
    var links = []; try { links = C.chosenSvcs(hid, o).map(function (s) { return s[1]; }); } catch (e) { /* 연계 없음 */ }
    var nx = stt === "absent" || (!met && ab) ? nextOf(hid) : null;
    return F.handCard({ id: hid, area: h.area, round: C.roundYm(), types: C.typesFor(h), cnt: +m.cnt || 1, visits: { met: met, absent: ab },
      checks: { n: ks.length, bad: ks.filter(function (k) { return ck[k] === "bad"; }).length }, links: links, pair: pairOf(hid).need,
      next: nx ? (nx.close ? nx.line : nx.md + " " + nx.label + " 다시 방문 · 안 되면 간접 확인으로 마감") : (L && L.result === "met" ? "연계 회신 확인 · 신청 여부 전화" : ""), note: get(hid).handoff });
  }
  function handCard() {
    var ids = handIds(); if (!ids.length) return "";
    return '<section class="fd-card fd-hand blk" aria-label="한 장 인계 카드"><div class="fd-h"><b>한 장 인계 카드</b><span class="fd-tag">가구별 5줄 + 다음 할 일</span></div>' +
      '<p class="fd-why">휴가·인사이동 때 다음 담당자에게 이 한 장을 넘깁니다. 이름·주소는 넣지 않습니다.</p>' +
      '<div class="fd-hcs">' + ids.map(function (id) { return '<button type="button" class="sbtn num" data-fd-hand="' + esc(id) + '">' + esc(id) + "</button>"; }).join("") + "</div></section>";
  }
  function handHtml(H) { return '<div class="fd-handoff"><div class="fd-hd2"><b class="num">' + esc(H.id) + "</b><span>" + esc(H.head.replace(H.id + " · ", "")) + "</span></div><ol>" + H.lines.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + '</ol><div class="fd-nx"><b>다음 할 일</b><span>' + esc(H.next) + "</span></div>" + (H.note ? '<p class="fd-hn">' + esc(H.note) + "</p>" : "") + "</div>"; }
  function handSheet(hid) {
    function body() { var H = handOf(hid); return "<h3>한 장 인계 카드</h3>" + handHtml(H); }
    sheet('<div data-fd-hbody="1">' + body() + "</div>" + chip("fdHand", "다음 담당자에게 한 줄", "handoff", get(hid).handoff, { multi: false }) +
      '<p class="fd-src">가구번호·읍면·위기 유형·횟수만 · 자유 글의 전화·주소 모양은 자동으로 가립니다</p>' +
      '<div class="fd-row"><button type="button" class="sbtn" data-fd-hp="1">인쇄</button><button type="button" class="sbtn go" data-fd-hc="1">복사</button></div>', function (dl) {
      CH.bind(dl, "fdHand", function (v) { put(hid, "handoff", v); dl.querySelector("[data-fd-hbody]").innerHTML = body(); });
      dl.querySelector("[data-fd-hc]").addEventListener("click", function () { C.copy(handOf(hid).text); });
      dl.querySelector("[data-fd-hp]").addEventListener("click", function () { printOnly("<h2>한 장 인계 카드</h2>" + handHtml(handOf(hid))); });
    });
  }
  function reportCards() { return '<div class="fd-rep">' + remainCard() + handCard() + "</div>"; }
  function bindReport(scope) { scope.querySelectorAll("[data-fd-hand]").forEach(function (b) { b.addEventListener("click", function () { handSheet(b.dataset.fdHand); }); }); }

  // ═════ ④ 화면 가림 · 자동 잠금 — 머리 단추 두 개(모든 화면), 잠금 화면엔 가구번호만 ═════
  var ICO = { eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>', eyeOff: '<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3.2 3.8M6.2 7.6A16 16 0 0 0 2.5 12S6 18 12 18c1.5 0 2.9-.4 4.1-1"/>', lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>' };
  function svg(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + ICO[k] + "</svg>"; }
  function veilOn() { return document.body.classList.contains("fd-veil"); }
  function keys() {
    var v = veilOn();
    return '<span class="fd-keys"><button type="button" class="fd-k' + (v ? " on" : "") + '" data-fd-veil="1" aria-pressed="' + v + '" aria-label="화면 가림" title="화면 가림 · 가구번호만 보이게">' + svg(v ? "eyeOff" : "eye") + '<span>가림</span></button><button type="button" class="fd-k" data-fd-lock="1" aria-label="지금 잠그기" title="지금 잠그기 · 자리 비우면 3분 뒤 자동">' + svg("lock") + "<span>잠금</span></button></span>";
  }
  function inject(app) {
    if (!app) return;
    app.querySelectorAll(".ph-brand .sp, .top-in").forEach(function (box) {
      if (box.querySelector(".fd-keys")) return;
      var sync = box.classList.contains("top-in") ? box.querySelector(".sync") : null, w = document.createElement("span");
      w.innerHTML = keys(); var k = w.firstChild;
      if (sync) box.insertBefore(k, sync); else box.insertBefore(k, box.firstChild);
    });
  }
  function setVeil(on) {
    document.body.classList.toggle("fd-veil", on);
    try { sessionStorage.setItem("daeum.s12.veil", on ? "1" : ""); } catch (e) { /* 무시 */ }
    document.querySelectorAll("[data-fd-veil]").forEach(function (b) { b.setAttribute("aria-pressed", on); b.classList.toggle("on", on); b.innerHTML = svg(on ? "eyeOff" : "eye") + "<span>가림</span>"; });
  }
  var lockEl = null, idleT = null, hidAt = 0, alertT = null;
  function lockAlerts() { var a = document.getElementById("app"); return a ? a.querySelectorAll('.sfa[role="alert"], .safe.late').length : 0; }
  function lockIds() { var c = C && C.dayCtx(); return c ? c.d.ids : []; }
  function paintLock() {
    if (!lockEl) return; var n = lockAlerts(), b = lockEl.querySelector(".fd-lk-al");
    b.innerHTML = n ? "<b>동료 안부 알림 " + n + "건</b> — 열어서 확인해 주세요" : ""; b.hidden = !n;
  }
  function lock() {
    if (lockEl) return;
    document.querySelectorAll("dialog[open]").forEach(function (d) { d.close(); });
    lockEl = document.createElement("div"); lockEl.className = "fd-lock"; lockEl.setAttribute("role", "dialog"); lockEl.setAttribute("aria-modal", "true"); lockEl.setAttribute("aria-label", "잠긴 화면");
    lockEl.innerHTML = '<div class="fd-lk-bx"><span class="fd-lk-ic">' + svg("lock") + '</span><h3>잠겼습니다</h3><p>자리를 비워 화면을 가렸습니다. 가구번호만 보입니다.</p><div class="fd-lk-l">' + lockIds().map(function (id) { return '<span class="num">' + esc(id) + "</span>"; }).join("") + '</div><p class="fd-lk-al" role="alert" hidden></p><button type="button" class="sbtn go" data-fd-unlock="1">다시 열기</button></div>';
    document.body.appendChild(lockEl); document.body.classList.add("fd-locked");
    paintLock(); alertT = setInterval(paintLock, 20000);
    var u = lockEl.querySelector("[data-fd-unlock]"); u.addEventListener("click", unlock); setTimeout(function () { u.focus(); }, 50);
  }
  function unlock() { if (!lockEl) return; clearInterval(alertT); lockEl.remove(); lockEl = null; document.body.classList.remove("fd-locked"); idle(); }
  function idle() { clearTimeout(idleT); idleT = setTimeout(function () { if (!document.hidden) lock(); }, IDLE_MS); }
  var mounted = false;
  function mount() {
    if (mounted || typeof document === "undefined") return; mounted = true;
    try { if (sessionStorage.getItem("daeum.s12.veil")) document.body.classList.add("fd-veil"); } catch (e) { /* 무시 */ }
    var app = document.getElementById("app");
    if (app && root.MutationObserver) new MutationObserver(function () { inject(app); }).observe(app, { childList: true });
    inject(app);
    document.addEventListener("click", function (e) {
      var v = e.target.closest && e.target.closest("[data-fd-veil]"); if (v) { setVeil(!veilOn()); C.toast(veilOn() ? "화면을 가렸습니다 · 가구번호만 보입니다" : "가림을 풀었습니다"); return; }
      var l = e.target.closest && e.target.closest("[data-fd-lock]"); if (l) lock();
    });
    ["pointerdown", "keydown", "touchstart", "wheel"].forEach(function (ev) { document.addEventListener(ev, function () { if (!lockEl) idle(); }, { passive: true }); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) hidAt = Date.now(); else if (hidAt && Date.now() - hidAt >= IDLE_MS) lock(); else idle(); });
    idle();
  }

  /** app.js 가 한 번 넘겨 주는 도구 묶음 */
  function use(ctx) { C = ctx; F = ctx.F; CH = ctx.CH; if (typeof document !== "undefined") mount(); }
  var api = {
    use: use, EX: EX, exList: exList,
    addrCard: addrCard, addrNeed: addrNeed, scanImport: scanImport,
    homeExtra: homeExtra, bindHome: bindHome, pairWarn: pairWarn,
    awayPanel: awayPanel, bindAway: bindAway, referWhy: referWhy, bindRefer: bindRefer,
    reportCards: reportCards, bindReport: bindReport,
    /** 다른 화면(기록 i2·문서)이 읽는 값: {indirect, away, sms, refwhy, handoff, pair} */
    get: function (hid) { return C ? get(hid) : {}; },
    /** S12-v U4: 부재 메모·간접 확인은 이 한 곳에만 쓴다(기록 화면도 여기로) */
    set: function (hid, k, v) { if (C) put(hid, k, v); },
    /** S12-v U4(F10): 다음 방문 제안 — 현장 확인·기록 화면이 같은 계산을 읽는다 */
    nextOf: function (hid) { return C ? nextOf(hid) : null; },
    newList: function () { return C ? st().newhh.slice() : []; },
    lock: function () { lock(); }, unlock: unlock
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DaeumField = api;
})(typeof window !== "undefined" ? window : globalThis);
