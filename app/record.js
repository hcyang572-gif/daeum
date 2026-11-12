/* 닿음 기록 탭 — «상황 고르기 → 상담일지 문장 자동 조립»(S12-i2 ⚙️ 파로, 2026-11-12 · 승인 시안 S12-h v2.2)
   ① 상황 고르기: 6줄(함께 사는 사람·위기 유형·현장 상황·본인 의사·대응·다음 확인)을 하단 시트에서 고른다.
      앞 단계(현장 점검에서 고른 징후·상담에서 고른 서비스·명단 위기정보)는 미리 반영 — 글자 입력 0, 목표 누름 10번 안팎.
      맞는 것이 없으면 시트 아래 «직접 입력»으로 보탠다. 문장은 정해진 규칙으로 이어 붙인다(문장 생성 모델 없음).
   ② 덧붙이기: 말하기(시간 제한 없음) · 글로 쓰기 — 칸 위 «예시로 채우기» 칩(위기 유형별 2~3문장, 자주 쓴 것 앞으로)은
      공통 부품 DaeumChips 를 그대로 쓰고 입력칸만 여러 줄(textarea)로 바꾼다.
   ③ 실제 보고서 형태로 보기: 상담일지 한 장(읽는 법 먼저).
   그리기는 문자열(html) 순수 함수 → node 시험 가능(app/record.test.js). DOM 은 openSheet·bindEx 두 곳뿐.
   ⛔ 칩·문장에 이름·주소·전화 같은 개인정보를 넣지 않는다(상황 낱말만).                                           */
(function (g) {
  "use strict";
  var CH = g.DaeumChips || (typeof require === "function" ? (function () { try { return require("../shared/chips.js"); } catch (e) { return null; } })() : null);
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function uniq(a) { var o = []; (a || []).forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); }); return o; }

  // ── 고를 거리(사례·대응 다양화) ──
  var LIVE = ["혼자", "배우자", "자녀", "부모", "손자녀", "다른 가족"];
  var CRI = ["생계", "주거", "건강", "고립", "돌봄", "체납·채무", "실직·소득 감소", "정신건강"];
  var SIT = {
    "생계": ["식사 1일 1~2끼", "냉장고가 거의 비어 있음", "공과금 고지서 쌓임", "소득 감소 진술", "받던 급여 끊김"],
    "주거": ["난방이 안 됨", "전기·가스·물 끊김 흔적", "누수·곰팡이", "임차료 체납", "관리비 체납", "퇴거 예고 받음"],
    "건강": ["만성질환 약 복용", "약을 제때 못 챙김", "거동 불편", "진료 중단", "약값·병원비 부담 진술"],
    "고립": ["최근 1주 대화 상대 없음", "가족과 연락 끊김", "우편물·신문 쌓임", "외출을 거의 안 함"],
    "돌봄": ["끼니·씻기를 도와줄 사람 없음", "아동이 혼자 있는 시간이 김", "장애 가족 돌봄 부담", "노부모 돌봄 부담"],
    "체납·채무": ["건강보험료 체납", "통신비 연체", "대출 독촉 진술"],
    "실직·소득 감소": ["최근 실직", "일용직 일감 끊김", "폐업 뒤 소득 없음"],
    "정신건강": ["우울감 진술", "잠을 못 잠", "음주 문제 의심"]
  };
  var ACT = {
    "생계": ["긴급복지 생계지원 신청 안내", "이동통신요금감면 안내", "반찬 나눔 기관 의뢰"],
    "주거": ["에너지바우처 신청 안내", "긴급복지 연료비 신청 안내", "주거급여 상담 안내", "주거 수선 민간 자원 의뢰"],
    "건강": ["긴급복지 의료지원 신청 안내", "보건소 방문건강관리 의뢰"],
    "고립": ["노인맞춤돌봄서비스 의뢰", "통장·이장 안부 확인 요청"],
    "돌봄": ["긴급돌봄 지원사업 신청 안내", "지역아동센터 안내"],
    "체납·채무": ["채무 조정 상담 기관 안내", "건강보험료 분할 납부 상담 안내"],
    "실직·소득 감소": ["고용센터 일자리 상담 안내", "긴급복지 생계지원 신청 안내"],
    "정신건강": ["정신건강복지센터 연계", "자살예방 상담전화 109 안내"]
  };
  var WILL = ["도움을 원함", "일부만 원함", "원하지 않음", "판단 어려움"];
  var NEXT = ["1주 뒤 전화", "2주 뒤 방문", "한 달 뒤 전화", "회신 오면 연락"];
  // [열쇠, 이름, 여러 개 고르기]
  var ROWS = [["live", "함께 사는 사람", false], ["cri", "위기 유형", true], ["sit", "현장 상황", true], ["will", "본인 의사", false], ["act", "대응", true], ["next", "다음 확인", false]];
  // 현장 점검 징후·명단 위기정보 낱말(app.js SIGN_OF·CHECKS) → 현장 상황 · 위기 유형
  var SIGN_SIT = {
    "끼니 거름": "식사 1일 1~2끼", "고지서 쌓임": "공과금 고지서 쌓임", "우편물 쌓임": "우편물·신문 쌓임", "복약 관리 어려움": "약을 제때 못 챙김",
    "거동 불편": "거동 불편", "난방 안 됨": "난방이 안 됨", "집 고칠 곳 있음": "누수·곰팡이", "연락하는 가족 없음": "가족과 연락 끊김",
    "돌볼 사람 없음": "끼니·씻기를 도와줄 사람 없음", "전기·가스 끊긴 흔적": "전기·가스·물 끊김 흔적", "전기 끊김": "전기·가스·물 끊김 흔적",
    "물 끊김": "전기·가스·물 끊김 흔적", "가스·난방 끊김": "전기·가스·물 끊김 흔적", "월세 밀림": "임차료 체납", "관리비 밀림": "관리비 체납",
    "건강보험료 밀림": "건강보험료 체납", "통신비 밀림": "통신비 연체", "빚 독촉": "대출 독촉 진술", "일자리 잃음": "최근 실직",
    "병원비 부담": "약값·병원비 부담 진술", "받던 급여 끊김": "받던 급여 끊김"
  };
  function criOfSit(s) { var out = null; Object.keys(SIT).some(function (k) { if (SIT[k].indexOf(s) >= 0) { out = k; return true; } return false; }); return out; }
  /** 고른 서비스 이름 → 대응 문구(한국사회보장정보원 복지서비스 이름 그대로) */
  function svcAct(name) {
    var all = []; Object.keys(ACT).forEach(function (k) { all = all.concat(ACT[k]); });
    var hit = all.filter(function (a) { return a.indexOf(name) === 0; })[0];
    return hit || name + (/돌봄서비스|센터/.test(name) ? " 의뢰" : " 신청 안내");
  }

  /** 앞 단계에서 이미 고른 것 → 미리 반영할 값 */
  function derive(ctx) {
    ctx = ctx || {};
    var sit = uniq((ctx.signs || []).map(function (s) { return SIGN_SIT[s]; }));
    var cri = uniq((ctx.types || []).filter(function (t) { return CRI.indexOf(t) >= 0; }).concat(sit.map(criOfSit)));
    var act = uniq((ctx.svcNames || []).map(svcAct));
    var live = ctx.single ? "혼자" : ctx.kid ? "자녀" : "";
    // S12-v U11: 현장(점검 «문제 있음»·현장 상황)에서 나오지 않고 명단 위기정보에서만 온 위기 유형 → «명단에서 가져옴»
    var fieldCri = uniq((ctx.fieldTypes || []).concat(sit.map(criOfSit)));
    var fromList = ctx.listTypes ? cri.filter(function (t) { return fieldCri.indexOf(t) < 0 && ctx.listTypes.indexOf(t) >= 0; }) : [];
    return { live: live, cri: cri, sit: sit, act: act, fromList: fromList };
  }
  /** 상태 만들기·맞추기: 미리 반영한 값은 담당자가 뺀 것(off)만 빼고 다시 채운다 → 현장 점검을 나중에 고쳐도 따라온다 */
  function sync(c, ctx) {
    c = c || { live: "", cri: {}, sit: {}, act: {}, will: "", next: "", cus: {}, off: {}, taps: 0 };
    ["cri", "sit", "act"].forEach(function (k) { c[k] = c[k] || {}; }); c.cus = c.cus || {}; c.off = c.off || {};
    var d = derive(ctx), pre = 0;
    if (d.live && !c.live && !c.off["live|" + d.live]) c.live = d.live;
    if (d.live && c.live === d.live) pre++;
    ["cri", "sit", "act"].forEach(function (k) { d[k].forEach(function (v) { if (!c.off[k + "|" + v]) c[k][v] = 1; if (c[k][v]) pre++; }); });
    if (ctx && ctx.res === "refuse" && !c.will && !c.off["will|원하지 않음"]) c.will = "원하지 않음";
    c.pre = pre; c.fromList = d.fromList.filter(function (v) { return c.cri[v]; });
    return c;
  }
  function multi(k) { return ROWS.filter(function (r) { return r[0] === k; })[0][2]; }
  function vals(c, k) { if (multi(k)) return Object.keys(c[k] || {}).filter(function (x) { return c[k][x]; }); return c[k] ? [c[k]] : []; }
  /** 고를 거리: 위기 유형에 맞춰 현장 상황·대응을 보여 주고, 이미 고른 것·직접 넣은 것을 붙인다 */
  function opts(c, k) {
    var base;
    if (k === "live") base = LIVE; else if (k === "cri") base = CRI; else if (k === "will") base = WILL; else if (k === "next") base = NEXT;
    else {
      var sel = vals(c, "cri"), src = k === "sit" ? SIT : ACT; base = [];
      (sel.length ? sel : ["생계", "고립"]).forEach(function (x) { base = base.concat(src[x] || []); });
    }
    return uniq(vals(c, k).filter(function (x) { return base.indexOf(x) < 0; }).concat(base).concat(c.cus[k] || []));
  }
  /** 한 번 누름: 여러 개면 넣고/빼기, 하나면 바꿔 넣기(같은 것을 다시 누르면 비움). 미리 반영한 것을 빼면 기억(off) */
  function tap(c, k, v) {
    c.taps = (c.taps || 0) + 1;
    if (multi(k)) { if (c[k][v]) { delete c[k][v]; c.off[k + "|" + v] = 1; } else { c[k][v] = 1; delete c.off[k + "|" + v]; } return c; }
    if (c[k] === v) { c[k] = ""; c.off[k + "|" + v] = 1; } else { c[k] = v; delete c.off[k + "|" + v]; }
    return c;
  }
  /** 직접 입력: 그 줄 고를 거리에 보태고 바로 고른다 */
  function add(c, k, v) {
    v = String(v || "").replace(/\s+/g, " ").trim().slice(0, 40); if (!v) return c;
    c.cus[k] = uniq((c.cus[k] || []).concat([v]));
    if (multi(k)) c[k][v] = 1; else c[k] = v;
    c.taps = (c.taps || 0) + 1; delete c.off[k + "|" + v];
    return c;
  }

  // ── 날짜 ──
  var WD = ["일", "월", "화", "수", "목", "금", "토"];
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function dot(d) { return (d.getMonth() + 1) + ". " + d.getDate() + ".(" + WD[d.getDay()] + ")"; }
  /** «다음 확인» 고른 값 → 날짜·문구(주말이면 월요일로) */
  function nextOf(v, now) {
    var n = { "1주 뒤 전화": [7, "전화 확인"], "2주 뒤 방문": [14, "다시 방문"], "한 달 뒤 전화": [30, "전화 확인"] }[v];
    if (!v) return null;
    if (!n) return { text: v === "회신 오면 연락" ? "연계 기관 회신이 오면 결과 안내" : v, due: null, visit: /방문/.test(v) };
    var d = new Date(now || new Date()); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n[0]);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return { text: dot(d) + " " + n[1], due: ymd(d), visit: n[1] === "다시 방문" };
  }

  /** 상담일지 문장 조립(규칙) — 줄마다 «.»로 끝나는 짧은 개조식 문장 */
  function lines(c, ctx) {
    ctx = ctx || {};
    var L = [], cri = vals(c, "cri"), sit = vals(c, "sit"), act = vals(c, "act"), will = c.will || "";
    var LV = { "혼자": "혼자 사는", "배우자": "배우자와 사는", "자녀": "자녀와 사는", "부모": "부모와 사는", "손자녀": "손자녀와 사는", "다른 가족": "가족과 함께 사는" };
    var lv = c.live ? (LV[c.live] || c.live + "와(과) 사는") : "";
    var fl = (c.fromList || []).filter(function (v) { return cri.indexOf(v) >= 0; }), ok = cri.filter(function (v) { return fl.indexOf(v) < 0; });
    // S12-v U11: 명단에서만 온 위기 유형은 «확인됨»이라 쓰지 않는다(감사 때 사실과 다른 기록)
    if (lv || cri.length) L.push((lv ? lv + " 가구로, " : "") + (ok.length ? ok.join("·") + " 위기가 확인됨" : fl.length ? "" : "위기 유형은 확인 중") + (fl.length ? (ok.length ? ", " : "") + "명단 위기정보 " + fl.join("·") + "(명단에서 가져옴 · 현장 확인 전)" : ""));
    if (ctx.checkN) L.push("현장 점검 " + ctx.checkN + "항목 중 문제 " + (ctx.badN || 0) + "항목");
    if (sit.length) L.push("현장 상황: " + sit.join(", "));
    if (c.live === "혼자" && (cri.indexOf("고립") >= 0 || sit.some(function (s) { return /대화 상대|연락 끊김|외출/.test(s); }))) L.push("혼자 살며 고립 신호가 겹쳐 안부 확인 주기를 짧게 잡음");
    if (cri.indexOf("정신건강") >= 0 || sit.some(function (s) { return /우울|잠을/.test(s); })) L.push("정서 상태를 살피며 상담했고, 어려울 때 연락할 곳을 안내함");
    if (sit.indexOf("아동이 혼자 있는 시간이 김") >= 0) L.push("아동 돌봄 공백이 있어 돌봄 연계를 먼저 진행함");
    if (sit.some(function (s) { return /난방|끊김 흔적/.test(s); })) L.push("겨울철에 대비해 다음 확인 때 난방 상태를 다시 봄");
    if (sit.some(function (s) { return /체납|연체|독촉/.test(s); })) L.push("체납·연체가 겹쳐 생활비 부담을 함께 살핌");
    var W = { "도움을 원함": "본인이 지원을 희망함", "일부만 원함": "본인이 일부 지원만 희망해 희망 항목 위주로 안내함", "원하지 않음": "본인이 지원을 원하지 않음 — 상황이 바뀌면 연락하도록 안내함", "판단 어려움": "의사 확인이 어려워 다시 방문해 확인하기로 함" };
    if (will) L.push(W[will] || "본인 의사: " + will);
    if (act.length) L.push(will === "원하지 않음" ? "안내만 함: " + act.join(", ") : "대응: " + act.join(", ") + "(안내·의뢰이며 선정 결정 아님)");
    var nx = nextOf(c.next, ctx.now); if (nx) L.push("다음 확인: " + nx.text);
    return L.map(function (x) { return /[.。]$/.test(x) ? x : x + "."; });
  }

  // ── 그리기 ──
  var CHEV = '<svg viewBox="0 0 24 24" class="rc-chev" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  /** 상황 고르기 카드 — 78회차 ⓪-3(11-13 호창님 «상담일지는 항상 펼친 화면으로»): 접기 없이 늘 펼침(open 인자는 옛 호출 호환용, 무시) · 줄을 누르면 하단 시트가 열린다 */
  function composerHtml(c, ctx, open) {
    var L = lines(c, ctx), picked = ROWS.filter(function (r) { return vals(c, r[0]).length; }).length;
    return '<section class="rc-cmp blk" data-rc="cmp"><div class="rc-fold rc-open"><div class="rc-sum"><span class="rc-h">상황 고르기 <small>→ 상담일지 문장 자동 작성</small></span><span class="rc-n"><b>' + picked + "</b>/" + ROWS.length + "줄</span></div>" +
      '<p class="rc-why">현장 점검·상담에서 고른 것은 미리 반영했습니다. 줄을 누르면 아래에서 고르는 창이 열립니다.</p>' +
      ((c.fromList || []).length ? '<p class="rc-why rc-fromlist">위기 유형 «' + esc(c.fromList.join("·")) + '»은 <b>명단에서 가져옴</b> — 현장에서 확인되지 않으면 빼 주세요</p>' : "") +
      '<div class="rc-rows">' + ROWS.map(function (r, i) {
        var v = vals(c, r[0]);
        return '<button type="button" class="rc-row' + (v.length ? " has" : "") + '" data-cf="' + r[0] + '"><i>' + (i + 1) + '</i><span class="rc-rn">' + r[1] + '</span><span class="rc-rv">' +
          (v.length ? v.slice(0, 3).map(function (x) { return "<em>" + esc(x) + "</em>"; }).join("") + (v.length > 3 ? '<em class="m">+' + (v.length - 3) + "</em>" : "") : "<small>고르기</small>") + "</span>" + CHEV + "</button>";
      }).join("") + "</div></div>" +
      '<div class="rc-lines" aria-live="polite"><div class="rc-lh"><b>자동 문장</b><small>미리 반영 ' + (c.pre || 0) + "개 · 직접 누름 " + (c.taps || 0) + "번 · 글자 0</small></div>" +
      (L.length ? L.map(function (l) { return "<p>· " + esc(l) + "</p>"; }).join("") : '<p class="rc-why">고르면 여기에 문장이 생깁니다.</p>') + "</div></section>";
  }
  function sheetHtml(c, k, ctx) {
    var i = 0; ROWS.forEach(function (r, j) { if (r[0] === k) i = j; });
    var r = ROWS[i], o = opts(c, k), v = vals(c, k), L = lines(c, ctx);
    return '<div class="rc-grab" aria-hidden="true"></div><div class="rc-sh-h"><h3 id="rcShT">' + r[1] + '</h3><span class="rc-num">' + (i + 1) + "/" + ROWS.length + "</span></div>" +
      '<div class="rc-steps" aria-hidden="true">' + ROWS.map(function (x, j) { return '<i class="' + (j === i ? "on" : vals(c, x[0]).length ? "dn" : "") + '"></i>'; }).join("") + "</div>" +
      '<p class="rc-why">' + (r[2] ? "여러 개 고를 수 있습니다" : "하나만 고르면 다음으로 넘어갑니다") + (k === "sit" || k === "act" ? " · 고른 위기 유형에 맞춰 보여 줍니다" : "") + "</p>" +
      '<div class="rc-opts" role="group" aria-label="' + r[1] + '">' + o.map(function (x) { return '<button type="button" data-cv="' + esc(x) + '" aria-pressed="' + (v.indexOf(x) >= 0) + '">' + esc(x) + "</button>"; }).join("") + "</div>" +
      '<div class="rc-di"><input class="in1" id="rcIn" maxlength="40" placeholder="맞는 게 없으면 직접 입력" aria-label="' + r[1] + ' 직접 입력" autocomplete="off"><button type="button" class="sbtn" data-cadd="1">추가</button></div>' +
      '<div class="rc-lines rc-mini"><div class="rc-lh"><b>지금 문장</b><small>' + L.length + "줄</small></div>" + (L.length ? L.map(function (l) { return "<p>· " + esc(l) + "</p>"; }).join("") : '<p class="rc-why">고르면 문장이 생깁니다.</p>') + "</div>" +
      '<div class="rc-nav">' + (i > 0 ? '<button type="button" class="sbtn" data-cgo="' + ROWS[i - 1][0] + '">이전</button>' : "") +
      (i < ROWS.length - 1 ? '<button type="button" class="sbtn go" data-cgo="' + ROWS[i + 1][0] + '">다음 · ' + ROWS[i + 1][1] + "</button>" : '<button type="button" class="sbtn go" data-cclose="1">다 골랐어요</button>') + "</div>";
  }
  /** 하단 시트 — 화면을 덮지 않게 아래 절반만. 닫을 때 hooks.close(), 고를 때마다 hooks.save(c) */
  var SH = null;
  function openSheet(c, k, ctx, hooks) {
    if (typeof document === "undefined") return;
    closeSheet(true);
    var ov = document.createElement("div"); ov.className = "rc-ov";
    ov.innerHTML = '<div class="rc-scrim" data-cclose="1"></div><div class="rc-sheet" role="dialog" aria-modal="true" aria-labelledby="rcShT"></div>';
    document.body.appendChild(ov);
    var box = ov.querySelector(".rc-sheet");
    SH = { ov: ov, hooks: hooks || {}, prev: document.activeElement };
    function draw(key, focus) {
      k = key; var st = box.scrollTop; box.innerHTML = sheetHtml(c, k, ctx); box.scrollTop = st;
      if (focus) { var f = box.querySelector("[data-cv]"); if (f) f.focus(); }
    }
    ov.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-cv],[data-cgo],[data-cclose],[data-cadd]") : null; if (!t) return;
      if (t.hasAttribute("data-cclose")) { closeSheet(); return; }
      if (t.hasAttribute("data-cgo")) { draw(t.getAttribute("data-cgo"), true); return; }
      if (t.hasAttribute("data-cadd")) { var inp = box.querySelector("#rcIn"); if (inp && inp.value.trim()) { add(c, k, inp.value); if (SH.hooks.save) SH.hooks.save(c); draw(k); } return; }
      tap(c, k, t.getAttribute("data-cv")); try { navigator.vibrate && navigator.vibrate(8); } catch (er) { /* 없음 */ }
      if (SH.hooks.save) SH.hooks.save(c);
      var i = 0; ROWS.forEach(function (r, j) { if (r[0] === k) i = j; });
      if (!ROWS[i][2] && c[k]) { if (i < ROWS.length - 1) draw(ROWS[i + 1][0], true); else closeSheet(); } else draw(k);
    });
    ov.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSheet();
      if (e.key === "Enter" && e.target && e.target.id === "rcIn") { e.preventDefault(); var b = box.querySelector("[data-cadd]"); if (b) b.click(); }
    });
    draw(k, true);
    requestAnimationFrame(function () { ov.classList.add("on"); });
  }
  function closeSheet(silent) {
    if (!SH) return; var s = SH; SH = null;
    s.ov.remove();
    if (!silent && s.hooks.close) s.hooks.close();
  }

  // ── 예시로 채우기(공통 부품 DaeumChips + 여러 줄 입력칸) ──
  var EX = {
    memo: {
      "생계": ["생계비 부족으로 식사가 불규칙함(1일 1~2끼)", "공과금 고지서가 여러 달 쌓여 있음", "소득 감소 진술 — 금액은 담당 확인 필요"],
      "주거": ["임차료 2개월 체납, 퇴거 예고는 없음", "난방 미가동 — 보일러 고장 진술", "누수·곰팡이 일부 확인"],
      "건강": ["만성질환 약 복용 중, 약값 부담 진술", "거동 불편 — 실내 보행은 가능", "정기 진료가 3개월째 끊김"],
      "고립": ["최근 1주 대화 상대 없음 진술", "가족과 연락이 끊긴 지 오래됨", "문 앞 우편물이 다수 쌓임"],
      "돌봄": ["끼니·씻기를 도와줄 사람이 없음", "초등 자녀가 하교 뒤 혼자 있음", "가족 돌봄 부담이 큼 — 휴식 지원 희망"],
      "체납·채무": ["건강보험료 체납으로 병원 이용을 꺼림", "대출 독촉 전화로 불안감 호소"],
      "실직·소득 감소": ["최근 실직 뒤 구직 중", "일용직 일감이 끊겨 수입이 없음"],
      "정신건강": ["우울감·불면 진술 — 전문 상담 안내", "상담 중 눈물을 보여 천천히 진행함"]
    },
    away: {
      "인기척": ["방문 시 부재, 인기척 없음", "문 앞 택배·우편물 다수", "현관 불이 켜져 있으나 응답 없음"],
      "시간대": ["오전 방문 모두 부재 — 저녁 시간대로 옮김", "이웃이 «저녁 6시 뒤 귀가»라고 함", "주말에만 집에 있다는 진술"],
      "쪽지·연락": ["방문 안내 쪽지를 문틈에 남김", "등록된 번호로 통화 시도 — 연결 안 됨", "통장에게 귀가하면 알려 달라고 부탁"]
    }
  };
  var LS_USE = "daeum.s12.exUse";
  function useGet() { try { return JSON.parse(localStorage.getItem(LS_USE) || "{}") || {}; } catch (e) { return {}; } }
  function useBump(set, key, chip, grp) { var u = useGet(); u[set + "|" + chip] = (u[set + "|" + chip] || 0) + 1; if (grp) u["g:" + set + "|" + grp] = (u["g:" + set + "|" + grp] || 0) + 1; try { localStorage.setItem(LS_USE, JSON.stringify(u)); } catch (e) { /* 저장 못 해도 칩은 동작 */ } return u; }
  /** 묶음 순서: 이 집 위기 유형 먼저 → 자주 쓴 묶음 → 나머지 */
  function groups(set, pri, use) {
    var gs = Object.keys(EX[set]), u = use || {};
    return gs.slice().sort(function (a, b) {
      var pa = (pri || []).indexOf(a), pb = (pri || []).indexOf(b);
      if ((pa >= 0) !== (pb >= 0)) return pa >= 0 ? -1 : 1;
      if (pa >= 0 && pb >= 0 && pa !== pb) return pa - pb;
      return (u["g:" + set + "|" + b] || 0) - (u["g:" + set + "|" + a] || 0) || gs.indexOf(a) - gs.indexOf(b);
    });
  }
  /** 묶음 안 문장: 자주 쓴 것 앞으로(안정 정렬) */
  function sorted(set, grp, use) { var u = use || {}, L = (EX[set][grp] || []).slice(); return L.map(function (x, i) { return [x, i]; }).sort(function (a, b) { return (u[set + "|" + b[0]] || 0) - (u[set + "|" + a[0]] || 0) || a[1] - b[1]; }).map(function (x) { return x[0]; }); }
  /** DaeumChips 의 한 줄 입력칸을 여러 줄 입력칸으로 바꾼다(부품 자체는 고치지 않음 — bind 는 .chipin-i 로 찾으므로 그대로 동작) */
  function toArea(html, rows) {
    var out = html.replace(/<input class="in1 chipin-i"([^>]*?) value="([^"]*)" autocomplete="off">/, function (m, attrs, v) { return '<textarea class="memo chipin-i"' + attrs + ' rows="' + (rows || 3) + '">' + v + "</textarea>"; });
    return out;
  }
  /** 예시로 채우기 + 글로 쓰기 칸. o = { id, set:"memo"|"away", grp, pri:[위기 유형], value, label, placeholder, use } */
  function exHtml(o) {
    var use = o.use || useGet(), gs = groups(o.set, o.pri, use), grp = o.grp && EX[o.set][o.grp] ? o.grp : gs[0];
    var tabs = '<div class="rc-exg" role="group" aria-label="예시 묶음">' + gs.map(function (x) { return '<button type="button" data-exg="' + esc(x) + '" aria-pressed="' + (x === grp) + '">' + esc(x) + "</button>"; }).join("") + "</div>";
    var chips = CH ? CH.html({ id: o.id, label: o.label || "예시로 채우기", hint: "누르면 칸에 들어갑니다 · 고쳐 써도 됩니다", examples: sorted(o.set, grp, use), value: o.value || "", placeholder: o.placeholder || "맞는 예시가 없으면 직접 쓰세요(이름·주소·연락처는 적지 마세요)", maxlength: 600, multi: true }) :
      '<label class="chipin-l" for="' + esc(o.id) + '">' + esc(o.label || "글로 쓰기") + '</label><input class="in1 chipin-i" id="' + esc(o.id) + '" maxlength="600" value="' + esc(o.value || "") + '" autocomplete="off">';
    return '<div class="rc-ex" data-rcex="' + esc(o.set) + '" data-grp="' + esc(grp) + '">' + tabs + toArea(chips, o.rows) + "</div>";
  }
  /** 칩 누름·입력 → onChange(value) · 칩 누름은 «자주 씀»으로 센다 · 묶음 바꾸기 → onGroup(grp) */
  function bindEx(scope, id, set, onChange, onGroup) {
    var box = scope.querySelector('[data-rcex="' + set + '"]'); if (!box) return;
    if (CH) CH.bind(box, id, onChange);
    else { var i = box.querySelector("#" + id); if (i) i.addEventListener("input", function () { onChange(i.value); }); }
    box.querySelectorAll(".chipin-c").forEach(function (b) { b.addEventListener("click", function () { useBump(set, id, b.dataset.chip, box.dataset.grp); }); });
    box.querySelectorAll("[data-exg]").forEach(function (b) { b.addEventListener("click", function () { if (onGroup) onGroup(b.dataset.exg); }); });
  }

  // ── 덧붙이기(말하기·글로 쓰기) — 시간 제한 없음 ──
  var MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var PEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19.5h4L19.5 9a2.1 2.1 0 0 0-3-3L6 16.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M14.5 8l3 3" stroke="currentColor" stroke-width="2"/></svg>';
  function clock(sec) { sec = Math.max(0, Math.floor(sec || 0)); return Math.floor(sec / 60) + ":" + pad(sec % 60); }
  function subHtml(o) {
    o = o || {};
    var waves = ""; for (var i = 0; i < 22; i++) waves += '<i style="animation-delay:' + ((i * 53) % 600) + 'ms"></i>';
    return '<section class="rc-sub blk"><div class="rc-sh"><b>덧붙이기</b><small>선택 · 시간 제한 없음</small></div>' +
      '<div class="rc-btns"><span class="rc-bi"><button type="button" class="rc-micb" data-act="mic" aria-label="말하기"' + (o.sr ? "" : " disabled") + ">" + MIC + "</button><b>말하기</b></span>" +
      '<span class="rc-bi"><button type="button" class="rc-pen" data-act="typing" aria-label="글로 쓰기" aria-controls="memo">' + PEN + "</button><b>글로 쓰기</b></span>" +
      '<span class="rc-mt"><b id="mict">' + clock(0) + '</b><span class="rc-wave" aria-hidden="true">' + waves + "</span><small>" +
      (o.sr ? "누르면 듣고, 다시 누르면 멈춥니다. 음성 원본은 남기지 않고 받아쓴 글만 씁니다." : "이 브라우저는 받아쓰기를 지원하지 않습니다 · 글로 남겨 주세요.") + "</small></span></div>" +
      (o.ex || "") + "</section>";
  }

  // ── 실제 보고서 형태로 보기(상담일지 한 장) ──
  /** m = { hid, area, date, reasons:[], checks:"", lines:[], memo, act:[], will, next } */
  function paperHtml(m) {
    function E(t) { return '<span class="empty">' + esc(t) + "</span>"; }
    return '<section class="rc-paperw rc-open" tabindex="-1" aria-label="상담일지 한 장 미리보기"><div class="rc-sum">실제 보고서 형태로 보기 <small>상담일지 한 장</small></div>' +
      '<div class="rc-legend"><b>읽는 법</b><span><i class="sw rule"></i>회색 = 규칙으로 센 숫자</span><span><i class="sw ai"></i>노란 밑줄 = 자동 정리 문장, 확인 필요</span><span><i class="sw empty"></i>빨간 칸 = 직접 채울 곳</span></div>' +
      '<div class="rc-paper" data-rc="paper"><span class="rc-stamp">자동 정리 · 확인 전</span><h4>상담일지</h4><div class="rc-org">상주시청 · ' + esc(m.date || "") + " · 시연 가상</div><table>" +
      "<tr><th>가구</th><td>" + esc(m.hid) + " · " + esc(m.area || "") + "</td></tr>" +
      "<tr><th>발굴 사유</th><td>" + (m.reasons && m.reasons.length ? '<span class="rule">' + esc(m.reasons.slice(0, 4).join(" · ")) + "</span>" : E("명단 확인")) + "</td></tr>" +
      "<tr><th>현장 확인</th><td>" + (m.checks ? '<span class="rule">' + esc(m.checks) + "</span>" : E("현장 점검 없음")) + "</td></tr>" +
      "<tr><th>상담 요지</th><td>" + (m.lines && m.lines.length ? '<span class="ai">' + m.lines.map(esc).join("<br>") + "</span>" : E("상황 고르기로 채우기")) + "</td></tr>" +
      "<tr><th>덧붙인 말</th><td>" + (m.memo ? '<span class="ai">' + esc(m.memo) + "</span>" : "—") + "</td></tr>" +
      "<tr><th>본인 의사</th><td>" + (m.will ? esc(m.will) : E("고르기")) + "</td></tr>" +
      "<tr><th>연계</th><td>" + (m.act && m.act.length ? esc(m.act.join(", ")) + " <small>(안내·의뢰, 선정 결정 아님)</small>" : E("대응 고르기")) + "</td></tr>" +
      "<tr><th>다음 확인</th><td>" + (m.next ? '<span class="rule">' + esc(m.next) + "</span>" : E("고르기")) + "</td></tr>" +
      "<tr><th>담당</th><td>" + E("담당자 확인 후 서명") + "</td></tr></table></div></section>";
  }

  var api = {
    LIVE: LIVE, CRI: CRI, SIT: SIT, ACT: ACT, WILL: WILL, NEXT: NEXT, ROWS: ROWS, EX: EX, SIGN_SIT: SIGN_SIT,
    derive: derive, sync: sync, vals: vals, opts: opts, tap: tap, add: add, lines: lines, nextOf: nextOf, svcAct: svcAct,
    composerHtml: composerHtml, sheetHtml: sheetHtml, openSheet: openSheet, closeSheet: closeSheet,
    groups: groups, sorted: sorted, toArea: toArea, exHtml: exHtml, bindEx: bindEx, useBump: useBump,
    subHtml: subHtml, clock: clock, paperHtml: paperHtml
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  g.DaeumRecord = api;
})(typeof window !== "undefined" ? window : globalThis);
