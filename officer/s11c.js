/* S11-c 재구축 2(11-04) — 공무원 화면 추가 동작. s11.js 뒤에 읽는다. 새 계산은 만들지 않고 officer.js·route_plan.js 결과를 쓴다.
   ① 상태 화면: 불러오는 중(스켈레톤) · 빈 상태(그림 + 행동 1) · 오류(원인 한 줄 + 다시 시도). ?state=loading|empty|error 로 바꿔 보기
   ② PC(≥1024) «오늘» 가운데 칸: 네이버 지도 위 오늘 방문 순서 + 시간줄
   ③ 명단 불러오기: 엑셀·CSV를 이 브라우저 안에서만 읽고(서버 전송 0) 열 이름을 자동으로 맞춰 방문 순서·지도로 잇는다
   ④ 네이버 지도 차량 길안내: nmap://route/car(출발=현재 위치, 경유 v1~v5, 도착 1곳) · 6곳 넘으면 구간 · 이름 대신 «방문 N»
   ⑤ 주민 폰 → 이 화면 실시간 신호(shared/requests.js live) — 새 카드가 위에서 들어오고 «주민 신호» 숫자가 바뀐다 */
(function (root) {
  "use strict";
  var doc = root.document, C = root.DAEUM_CONFIG || {};
  var RM_ON = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var Q = (root.location.search.match(/[?&]state=(loading|empty|error)/) || [])[1] || "";
  function $(id) { return doc.getElementById(id); }
  function qa(s, r) { return [].slice.call((r || doc).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function O() { return root.DaeumOfficer; }
  function RP() { return root.DaeumRoutePlan; }
  function tab() { return (root.location.hash || "#home").slice(1); }
  function isPC() { return root.matchMedia && root.matchMedia("(min-width: 1024px)").matches; }
  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* 막힘 */ } }

  // ── ① 상태 화면 ──
  var ICON = {
    empty: '<svg viewBox="0 0 96 72" aria-hidden="true"><rect x="10" y="58" width="76" height="3" rx="1.5" fill="#E1E7E5"/><path d="M26 58V34l22-16 22 16v24" fill="#E3EEEB" stroke="#17594F" stroke-width="2" stroke-linejoin="round"/><rect x="42" y="42" width="12" height="16" rx="2" fill="#fff" stroke="#17594F" stroke-width="2"/><circle cx="72" cy="20" r="9" fill="#F8EFDB" stroke="#D9A441" stroke-width="2"/><path d="M72 15v5l3 2" stroke="#6E4E12" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
    error: '<svg viewBox="0 0 96 72" aria-hidden="true"><circle cx="48" cy="36" r="24" fill="#FBE9E6"/><path d="M48 24v15M48 46h.01" stroke="#B23A2E" stroke-width="4" stroke-linecap="round"/></svg>'
  };
  function hideBoot() { var b = $("s11Boot"); if (b && Q !== "loading") b.hidden = true; doc.body.classList.toggle("s11-loading", Q === "loading"); }
  function errorState(main, why) {
    var b = $("s11Boot"); if (b) b.hidden = true;
    main.innerHTML = '<div class="s11-state s11-err" role="alert">' + ICON.error + '<h2>화면 자료를 불러오지 못했습니다</h2><p>' + esc(why) + '</p>' +
      '<button type="button" class="s11-btn" id="s11Retry">다시 시도</button></div>';
    $("s11Retry").addEventListener("click", function () { root.location.reload(); });
  }
  function emptyToday(on) {
    var box = $("s11Today"); if (!box) return;
    box.classList.toggle("is-empty", on);
    var e = $("s11Empty");
    if (on && !e) {
      e = doc.createElement("div"); e.id = "s11Empty"; e.className = "s11-state s11-emp card";
      e.innerHTML = ICON.empty + '<h2>오늘 담은 집이 없습니다</h2><p>행복이음에서 내려받은 명단(엑셀·CSV)을 불러오면 방문 순서와 지도가 바로 만들어집니다.</p>' +
        '<label class="s11-btn" for="s11File">명단 불러오기</label><a class="s11-lnk" href="../data/demo_list.xlsx" download="닿음_시연용_가상명단(발굴대상자 조회 서식).xlsx">시연용 가상 명단 받기</a>';
      box.insertBefore(e, box.querySelector(".vg"));
    }
    if (e) e.hidden = !on;
  }

  // ── ② PC 오늘 지도 ──
  var tm = { map: null, ov: [], key: "" };
  function planNow() {
    var o = O(), p = o && o.plan ? o.plan() : null; if (!p) return null;
    var D = o.data(), rows = p.ids.map(function (id) { return o.row(id); }).filter(Boolean);
    return { D: D, rows: rows, ret: p.ret };
  }
  function schedule(P) {
    var R = RP(), st = function (r) { return { id: r.h.id, x: r.h.x, y: r.h.y }; };
    var legs = R.approxLegs(P.rows.map(st), P.D.meta.office, P.ret);
    var s = function (id, d) { var e = $(id); return e ? (e.type === "checkbox" ? e.checked : e.value) : d; };
    return R.schedule(P.rows.map(function (r) { return { id: r.h.id }; }), legs, { start: s("routeStart", "09:30"), consultMin: +s("routeConsult", 30), lunch: s("routeLunch", true) ? undefined : null, ret: P.ret });
  }
  function todayMap() {
    if (!isPC() || tab() !== "today") return;
    var P = planNow(), box = $("s11TodayMap"), ol = $("s11TLine"); if (!P || !box) return;
    var sch = P.rows.length ? schedule(P) : null;
    ol.innerHTML = P.rows.map(function (r, i) { var w = sch && sch.rows[i]; return '<li><b>' + (w ? esc(w.arrive) : "") + '</b><i>' + (i + 1) + '</i><span>방문 ' + (i + 1) + ' · ' + esc(r.h.area) + '</span></li>'; }).join("") +
      (sch && sch.back ? '<li class="end"><b>' + esc(sch.back.arrive) + '</b><i>↩</i><span>시청 복귀 · 이동 ' + sch.km.toFixed(1) + 'km(근사)</span></li>' : "");
    var MAP = root.DaeumRouteMap; if (!MAP) return;
    MAP.load().then(function () {
      var N = root.naver && naver.maps; if (!N) return;
      var key = P.rows.map(function (r) { return r.h.id; }).join(",") + "|" + P.ret;
      if (!tm.map) tm.map = new N.Map(box, { zoom: 11, center: new N.LatLng(36.41, 128.16), scaleControl: false, mapDataControl: false, zoomControl: true,
        zoomControlOptions: { position: N.Position.TOP_RIGHT, style: N.ZoomControlStyle.SMALL }, logoControlOptions: { position: N.Position.BOTTOM_LEFT } });
      else { try { N.Event.trigger(tm.map, "resize"); } catch (e) { /* 무시 */ } }
      if (tm.key === key) return; tm.key = key;
      tm.ov.forEach(function (x) { x.setMap(null); }); tm.ov = [];
      var o = RP().toLatLng(P.D.meta.office), oL = new N.LatLng(o.lat, o.lng), path = [oL], bd = new N.LatLngBounds(); bd.extend(oL);
      tm.ov.push(new N.Marker({ map: tm.map, position: oL, icon: { content: '<div class="nm-office" aria-hidden="true">시청</div>', anchor: new N.Point(22, 14) } }));
      P.rows.forEach(function (r, i) {
        var p = RP().toLatLng(r.h), L = new N.LatLng(p.lat, p.lng); path.push(L); bd.extend(L);
        tm.ov.push(new N.Marker({ map: tm.map, position: L, zIndex: 100 + i, icon: { content: '<div class="nm-spot" aria-hidden="true"><div class="nm-stop' + (RM_ON ? "" : " pop") + '" style="animation-delay:' + (150 + i * 90) + 'ms">' + (i + 1) + '</div></div>', anchor: new N.Point(0, 0) } }));
      });
      if (P.ret && P.rows.length) path.push(oL);
      if (path.length > 1) tm.ov.push(new N.Polyline({ map: tm.map, path: path, strokeColor: "#17594F", strokeOpacity: .9, strokeWeight: 4, strokeStyle: "shortdash", strokeLineCap: "round", strokeLineJoin: "round" }));
      tm.map.fitBounds(bd, { top: 30, right: 30, bottom: 30, left: 30 });
    }, function () { box.innerHTML = '<p class="s11-xs" style="padding:16px">네이버 지도를 불러오지 못했습니다. 방문 화면의 단순 지도를 보세요.</p>'; });
  }

  // ── ③ 명단 불러오기 ──
  // S11-d(11-02): 한국사회보장정보원 «복지사각지대 발굴대상자 조회» 엑셀(1행 제목 병합 «중앙발굴대상자 조회결과 현황» · 2행 머리글 43열)을
  // 그대로 읽는다. 머리줄은 위 10줄 중 맞는 열이 가장 많은 줄(제목·병합 줄은 자동으로 건너뜀). 옛 CSV(관리번호·읍면동…)도 계속 받는다.
  // 읽는 열: 아래 COLS·BEN 만. 성명·주민등록번호·전화·휴대폰·연락처·우편번호·(행안부)주소·담당자는 «읽지 않는다»(화면에 안 나옴).
  // (행복이음)주소는 «지도 위치 찾기»에만 이 기기 안에서 쓰고 화면에 적지 않는다. 서버 전송 0.
  var COLS = [
    ["id", "가구번호", /^(관리\s*번호|가구\s*(번호|id|코드)|대상\s*번호|발굴\s*번호|일련\s*번호|id|household)$/i],
    ["area", "읍면동", /^(읍면동|행정동|소재\s*행정동|읍\s*면\s*동|관할\s*읍면동|동\s*명|읍면|area|region)$/i],
    ["sig", "위기정보", /(위기\s*(정보|신호|유형|사유)|발굴\s*사유|발굴\s*변수|위기사유|signal)/i],
    ["age", "연령", /^(연령|나이|만\s*나이|age)$/i],
    ["mem", "가구원수", /(가구\s*원\s*수|세대\s*원\s*수|가구원|members)/i],
    ["addr", "위치(이 기기 안에서만)", /^(\(행복이음\)\s*주소|주소)$/],
    ["prio", "발굴우선순위", /^발굴\s*우선\s*순위$/],
    ["cnt", "발굴횟수", /^발굴\s*횟수$/],
    ["proc", "처리여부", /^처리\s*여부$/],
    ["lonely", "우선방문(고독사)", /^우선\s*방문\s*대상자?_?\s*고독사$/],
    ["child", "우선방문(e아동)", /^우선\s*방문\s*대상자?_?\s*e\s*아동$/i],
    ["aiReq", "정보원 AI초기상담 상태", /^AI\s*초기\s*상담\s*요청\s*상태$/i],
    ["aiRes", "정보원 AI초기상담 결과", /^AI\s*초기\s*상담\s*(상담)?\s*결과$/i]
  ];
  // 급여·자격 열(값 Y/예/O/1 이면 «받음»): 이름 그대로 꼬리표에 쓴다
  var BEN = ["기초생계급여", "기초의료급여", "기초주거급여", "기초교육급여", "긴급복지", "차상위장애인", "차상위본인부담경감대상자", "차상위자활", "차상위계층확인", "한부모가족", "타법의료", "장애인연금", "기초연금"];
  var SKIP = /(성명|이름|대상자명|연락처|전화|휴대|주민\s*등록|생년월일|주소|우편|담당자|name|phone)/i;
  var READ_OK = /^(관리\s*번호|\(행복이음\)\s*주소|주소)$/;
  function yes(v) { return /^(y|yes|예|o|○|1|대상|해당)$/i.test(String(v == null ? "" : v).trim()); }
  /** 가상 가구 위치 찾기: 주소 «… <읍면동> 가상리 <번호>» → 가구(data/tools/make_demo_list.py 와 같은 규칙). 실제 주소는 찾지 않는다(주소→좌표 변환은 도입 때) */
  function addrKey(a) { var m = String(a || "").match(/(\S+(?:읍|면|동))\s+가상리\s+(\d+)/); return m ? m[1] + "|" + (+m[2]) : ""; }
  function addrIndex() {
    var o = O(), D = o && o.data ? o.data() : null, ix = {};
    ((D && D.households) || []).forEach(function (h) { var n = +String(h.id).split("-")[1]; if (n) ix[h.area + "|" + n] = h.id; });
    return ix;
  }
  // 불러온 명단의 쓸모 있는 열 → 가구별 꼬리표(오늘·방문 카드). 이 기기 저장소에만.
  var LS_META = "daeum.s11.importMeta", META = null;
  function metaAll() { if (META) return META; try { META = JSON.parse(lsGet(LS_META) || "{}") || {}; } catch (e) { META = {}; } return META; }
  function tags(id) {
    var m = metaAll()[id]; if (!m) return [];
    var t = [];
    if (m.lonely) t.push({ t: "고독사 우선방문", k: "warn" });
    if (m.child) t.push({ t: "e아동 우선방문", k: "warn" });
    if (m.prio) t.push({ t: "발굴 " + m.prio + "순위", k: "" });
    if (m.cnt > 1) t.push({ t: "발굴 " + m.cnt + "회째", k: "" });
    if (m.proc) t.push({ t: m.proc, k: /미처리/.test(m.proc) ? "warn" : "" });
    if (m.ben && m.ben.length) t.push({ t: "수급 " + m.ben.map(function (b) { return b.replace(/급여$/, ""); }).join("·"), k: "" });
    else if (m.hasBen) t.push({ t: "급여 수급 없음", k: "" });
    if (m.aiRes || (m.aiReq && !/미요청/.test(m.aiReq))) t.push({ t: "정보원 AI초기상담: " + (m.aiRes || m.aiReq), k: "info" });
    return t;
  }
  function parseCSV(text) {
    text = text.replace(/^﻿/, "");
    var delim = (text.split(/\r?\n/)[0].match(/\t/g) || []).length > (text.split(/\r?\n/)[0].match(/,/g) || []).length ? "\t" : ",";
    var rows = [], row = [], cur = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
  }
  var XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    XLSX_SRI = "sha512-r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfuyQM4tIRAI062MaV8sfjQKYVGjOBaZBOA87z+IhZE9DA==";
  function loadXLSX() {
    if (root.XLSX) return Promise.resolve(root.XLSX);
    return new Promise(function (ok, no) {
      var s = doc.createElement("script"); s.src = XLSX_URL; s.integrity = XLSX_SRI; s.crossOrigin = "anonymous"; s.referrerPolicy = "no-referrer";
      s.onload = function () { root.XLSX ? ok(root.XLSX) : no(new Error("xlsx")); }; s.onerror = function () { no(new Error("xlsx")); };
      doc.head.appendChild(s);
    });
  }
  function readFile(f) {
    var isX = /\.xlsx?$/i.test(f.name);
    return new Promise(function (ok, no) {
      var r = new FileReader();
      r.onerror = function () { no(new Error("read")); };
      r.onload = function () {
        if (!isX) {
          var t = r.result;
          if (/�/.test(t.slice(0, 400))) { var r2 = new FileReader(); r2.onload = function () { ok(parseCSV(r2.result)); }; r2.onerror = function () { no(new Error("read")); }; try { r2.readAsText(f, "euc-kr"); } catch (e) { ok(parseCSV(t)); } return; }
          ok(parseCSV(t)); return;
        }
        loadXLSX().then(function (X) {
          var wb = X.read(new Uint8Array(r.result), { type: "array" }), ws = wb.Sheets[wb.SheetNames[0]];
          ok(X.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false }));
        }, no);
      };
      if (isX) r.readAsArrayBuffer(f); else r.readAsText(f, "utf-8");
    });
  }
  /** 머리줄 찾기(위 10줄 안에서 맞는 열이 가장 많은 줄) → 열 맞춤 */
  function mapCols(rows) {
    var best = { i: -1, n: 0, m: null };
    rows.slice(0, 10).forEach(function (r, i) {
      var m = {}, n = 0;
      r.forEach(function (h, j) { h = String(h).trim(); if (!h || SKIP.test(h) && !READ_OK.test(h)) return; COLS.forEach(function (c) { if (m[c[0]] == null && c[2].test(h)) { m[c[0]] = j; n++; } }); });
      if (n > best.n) best = { i: i, n: n, m: m };
    });
    return best;
  }
  function importRows(rows, fname) {
    var o = O(), msg = $("s11ImpMsg"); if (!o) return;
    var hd = mapCols(rows);
    if (hd.i < 0 || (hd.m.id == null && hd.m.addr == null)) { msg.innerHTML = '<span class="bad">가구를 가리키는 열을 찾지 못했습니다.</span> «복지사각지대 발굴대상자 조회» 엑셀(머리글에 «소재행정동»·«(행복이음)주소») 또는 «관리번호» 열이 있는 CSV인지 확인해 주세요.'; return; }
    var head = rows[hd.i], body = rows.slice(hd.i + 1).filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
    var benCol = []; head.forEach(function (h, j) { if (BEN.indexOf(String(h).trim()) >= 0) benCol.push(j); });
    var cell = function (r, k) { return hd.m[k] != null ? String(r[hd.m[k]] == null ? "" : r[hd.m[k]]).trim() : ""; };
    // 발굴우선순위가 있으면 그 순서로(같으면 파일 순서)
    if (hd.m.prio != null) body = body.map(function (r, i) { return { r: r, i: i, p: parseFloat(cell(r, "prio")) }; })
      .sort(function (a, b) { var x = isFinite(a.p) ? a.p : 1e9, y = isFinite(b.p) ? b.p : 1e9; return x - y || a.i - b.i; }).map(function (x) { return x.r; });
    var ix = hd.m.addr != null ? addrIndex() : null, ids = [], miss = 0, seen = {}, meta = {}, cnt = { lonely: 0, child: 0, todo: 0, ben: 0, ai: 0 };
    body.forEach(function (r) {
      var id = cell(r, "id").toUpperCase();
      if (!(id && o.row(id)) && ix) id = ix[addrKey(cell(r, "addr"))] || "";
      if (!id || !o.row(id)) { miss++; return; }
      if (seen[id]) return; seen[id] = 1; ids.push(id);
      var ben = benCol.filter(function (j) { return yes(r[j]); }).map(function (j) { return String(head[j]).trim(); });
      var mm = { prio: cell(r, "prio"), cnt: +cell(r, "cnt") || 0, proc: cell(r, "proc"), lonely: yes(cell(r, "lonely")), child: yes(cell(r, "child")),
        ben: ben, hasBen: benCol.length > 0, aiReq: cell(r, "aiReq"), aiRes: cell(r, "aiRes"), vars: cell(r, "sig") };
      meta[id] = mm;
      if (mm.lonely) cnt.lonely++; if (mm.child) cnt.child++; if (/미처리/.test(mm.proc)) cnt.todo++; if (ben.length) cnt.ben++; if (mm.aiRes || (mm.aiReq && !/미요청/.test(mm.aiReq))) cnt.ai++;
    });
    var used = COLS.filter(function (c) { return hd.m[c[0]] != null; }).map(function (c) { return "«" + esc(String(head[hd.m[c[0]]]).trim()) + "»→" + c[1]; });
    if (benCol.length) used.push("급여·자격 " + benCol.length + "열→수급 꼬리표");
    var skipped = head.filter(function (h) { h = String(h).trim(); return h && SKIP.test(h) && !READ_OK.test(h); }).map(function (h) { return "«" + esc(String(h).trim()) + "»"; });
    if (!body.length) { msg.innerHTML = '<span class="bad">가구 줄이 없는 빈 서식입니다.</span> 머리글은 읽었습니다(' + head.filter(function (h) { return String(h).trim(); }).length + '열 · 쓰는 열 ' + used.length + '개). 조회 결과가 담긴 파일을 불러와 주세요.'; return; }
    if (!ids.length) { msg.innerHTML = '<span class="bad">명단의 가구를 지도에서 찾지 못했습니다(' + body.length + '줄).</span> 시연에서는 «시연용 가상 명단»의 가상 주소(«가상리»)만 지도에 놓입니다. 실제 주소는 도입 때 주소→좌표 변환을 붙입니다.'; return; }
    var cut = ids.slice(0, 30);
    META = {}; cut.forEach(function (id) { META[id] = meta[id]; }); lsSet(LS_META, JSON.stringify(META));
    o.setPicked(cut); o.refresh();
    lsSet("daeum.s11.import", JSON.stringify({ name: fname, n: cut.length, at: Date.now() }));
    msg.dataset.set = "1";
    var sum = [cnt.lonely ? "고독사 우선방문 " + cnt.lonely : "", cnt.child ? "e아동 우선방문 " + cnt.child : "", cnt.todo ? "미처리 " + cnt.todo : "", cnt.ben ? "급여 수급 " + cnt.ben : "", cnt.ai ? "정보원 AI초기상담 기록 " + cnt.ai + "(받은 정보로 표시만)" : ""].filter(Boolean).join(" · ");
    msg.innerHTML = '<b>' + esc(fname) + '</b> · ' + cut.length + '곳을 오늘 방문에 담았습니다' + (hd.m.prio != null ? '(발굴우선순위 순)' : '') + (miss ? ' · 못 찾은 줄 ' + miss : "") + (ids.length > 30 ? ' · 30곳까지만' : "") +
      (sum ? '<br>' + sum : '') +
      '<br>열 맞춤: ' + used.join(" · ") + (skipped.length ? ' · 읽지 않음: ' + skipped.join(" ") : "") + ' · 서버 전송 0 <a class="s11-lnk" href="#route">방문 순서 보기 ›</a>';
    emptyToday(false); tm.key = ""; todayMap();
  }
  function bindImport() {
    var f = $("s11File"); if (!f) return;
    f.addEventListener("change", function () {
      var file = f.files && f.files[0]; if (!file) return;
      var msg = $("s11ImpMsg"); msg.textContent = "«" + file.name + "» 읽는 중… (이 기기 안에서만)";
      if (file.size > 5 * 1024 * 1024) { msg.innerHTML = '<span class="bad">파일이 너무 큽니다(5MB까지).</span>'; f.value = ""; return; }
      readFile(file).then(function (rows) { importRows(rows, file.name); }, function () {
        msg.innerHTML = '<span class="bad">파일을 읽지 못했습니다.</span> ' + (/\.xlsx?$/i.test(file.name) ? "엑셀 읽기 부품을 받지 못했을 수 있습니다 — CSV로 저장해 다시 불러와 주세요." : "CSV(쉼표 구분)인지 확인해 주세요.");
      }).then(function () { f.value = ""; });
    });
  }

  // ── ④ 네이버 지도 길안내 ──
  var APP = "https://hcyang572-gif.github.io/daeum/";
  function navStops() {
    var o = O(), r = o && (o.route() || null), ids = r ? r.order : (o && o.plan ? (o.plan() || {}).ids : null) || [];
    return ids.map(function (id) { var x = o.row(id); if (!x) return null; var p = RP().toLatLng(x.h); return { lat: p.lat, lng: p.lng }; }).filter(Boolean);
  }
  function merc(p) { var x = p.lng * 20037508.34 / 180, y = Math.log(Math.tan((90 + p.lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180; return x.toFixed(1) + "," + y.toFixed(1); }
  function seg(stops, k) { var s = k * 6; return { from: s, list: stops.slice(s, s + 6) }; }
  function appUrl(sg) {
    var L = sg.list, d = L[L.length - 1], q = [];
    L.slice(0, -1).forEach(function (p, i) { q.push("v" + (i + 1) + "lat=" + p.lat, "v" + (i + 1) + "lng=" + p.lng, "v" + (i + 1) + "name=" + encodeURIComponent("방문 " + (sg.from + i + 1))); });
    q.push("dlat=" + d.lat, "dlng=" + d.lng, "dname=" + encodeURIComponent("방문 " + (sg.from + L.length)), "appname=" + encodeURIComponent(APP));
    return "nmap://route/car?" + q.join("&"); // 출발(slat·slng)을 비우면 네이버 지도가 현재 위치에서 출발한다
  }
  function webUrl(sg, stops, office) {
    var L = sg.list, start = sg.from ? stops[sg.from - 1] : office, sn = sg.from ? "방문 " + sg.from : "시청";
    var pt = function (p, n) { return merc(p) + "," + encodeURIComponent(n) + ",,"; };
    var via = L.slice(0, -1).map(function (p, i) { return pt(p, "방문 " + (sg.from + i + 1)); }).join(":");
    return "https://map.naver.com/p/directions/" + pt(start, sn) + "/" + pt(L[L.length - 1], "방문 " + (sg.from + L.length)) + "/" + (via || "-") + "/car";
  }
  function launch(k) {
    var stops = navStops(), msg = $("s11NavMsg"); if (!stops.length) { msg.textContent = "방문할 집을 먼저 담아 주세요."; return; }
    var o = O(), off = RP().toLatLng(o.data().meta.office), sg = seg(stops, k), web = webUrl(sg, stops, off), app = appUrl(sg), ua = root.navigator.userAgent || "";
    sessionStorageSet("daeum.s11.navseg", k);
    renderSegs(k);
    if (/Android/i.test(ua)) {
      root.location.href = "intent://" + app.slice(7) + "#Intent;scheme=nmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;S.browser_fallback_url=" + encodeURIComponent(web) + ";end";
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      var t0 = Date.now(); root.location.href = app;
      setTimeout(function () { if (!doc.hidden && Date.now() - t0 < 2500) root.location.href = web; }, 1500);
    } else { root.open(web, "_blank", "noopener"); }
    msg.textContent = "방문 " + (sg.from + 1) + "~" + (sg.from + sg.list.length) + " 길안내를 열었습니다 · 출발은 지금 위치" + (stops.length > sg.from + 6 ? " · 도착하면 «다음 구간»" : "");
  }
  function sessionStorageSet(k, v) { try { root.sessionStorage.setItem(k, String(v)); } catch (e) { /* 막힘 */ } }
  function sessionStorageGet(k) { try { return root.sessionStorage.getItem(k); } catch (e) { return null; } }
  function renderSegs(cur) {
    var stops = navStops(), n = Math.ceil(stops.length / 6), box = $("s11Segs"), go = $("s11NavGo"); if (!box || !go) return;
    go.disabled = !stops.length;
    go.querySelector("span").textContent = n > 1 ? "네이버 지도로 길안내 · 방문 1~6" : "네이버 지도로 길안내";
    box.hidden = n < 2; if (n < 2) { box.innerHTML = ""; return; }
    var h = ""; for (var k = 1; k < n; k++) { var a = k * 6 + 1, b = Math.min(stops.length, a + 5); h += '<button type="button" class="s11-seg' + (cur != null && +cur === k - 1 ? " next" : "") + '" data-seg="' + k + '">다음 구간 · 방문 ' + a + (b > a ? "~" + b : "") + "</button>"; }
    box.innerHTML = h;
  }
  function bindNav() {
    var go = $("s11NavGo"); if (!go) return;
    go.addEventListener("click", function () { launch(0); });
    $("s11Segs").addEventListener("click", function (e) { var b = e.target.closest("[data-seg]"); if (b) launch(+b.dataset.seg); });
  }

  // ── ⑤ 주민 신호 실시간 ──
  var KIND = { self: "도움 요청", family: "가족 대신 요청", neighbor: "이웃 알림" };
  var MODE = { live: "실시간 연결됨", poll: "5초마다 확인 중(실시간 대신)", "poll-fail": "서버에 닿지 못함 — 다시 시도 중", off: "같은 기기 저장만" };
  function modeLine(m) { qa(".s11-live").forEach(function (e) { e.dataset.mode = m; e.querySelector("span").textContent = "주민 신호 " + (MODE[m] || m); }); }
  // 새 신호 알림 카드는 기존 notify.js(아래 오른쪽 «방금 들어온 주민 신호»)가 띄운다 — 여기서는 숫자만 튀게 한다(겹침 방지).
  // 카드를 따로 띄우려면 ?toast=1(시연 녹화용)
  var OWN_TOAST = /[?&]toast=1/.test(root.location.search);
  function toast(rec) {
    if (!OWN_TOAST) { setTimeout(function () { qa(".s11-req").forEach(function (e) { e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); }); }, 700); return; }
    var t = doc.createElement("div"); t.className = "s11-toast"; t.setAttribute("role", "status");
    t.innerHTML = '<i class="dot" aria-hidden="true"></i><span><b>새 주민 신호 · ' + esc(KIND[rec.signal] || "신호") + (rec.urgent ? " · 급함" : "") + '</b><small>' + esc(rec.region) + ' · 번호 ' + esc(rec.code) + ' · 방금</small></span><a href="#today" class="s11-lnk">보기</a>';
    doc.body.appendChild(t);
    t.querySelector("a").addEventListener("click", function (e) { e.preventDefault(); t.remove(); var po = $("todayOld"), m = $("moreToday"); root.location.hash = "#today"; setTimeout(function () { if (po) po.open = true; if (m) { m.open = true; m.scrollIntoView({ block: "start", behavior: RM_ON ? "auto" : "smooth" }); } }, 60); });
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 400); }, 9000);
    setTimeout(function () { qa(".s11-req").forEach(function (e) { e.classList.remove("bump"); void e.offsetWidth; e.classList.add("bump"); }); }, 700);
  }
  function startLive() {
    var R = root.DaeumRequests; if (!R || !R.live) return;
    doc.addEventListener("daeum:signal-mode", function (e) { modeLine(e.detail.mode); });
    modeLine(R.live(toast) || "off");
  }

  // ── 화면 바뀔 때 ──
  var shown = false;
  function onShow() {
    if (!shown) { shown = true; hideBoot(); }
    var o = O(), t = tab();
    if (t === "today") {
      var n = o && o.picked ? o.picked().length : 0;
      emptyToday(Q === "empty" || !n);
      if (Q !== "empty" && n) todayMap();
      var im = lsGet("daeum.s11.import"); if (im && $("s11ImpMsg") && !$("s11ImpMsg").dataset.set) { try { var j = JSON.parse(im); $("s11ImpMsg").dataset.set = "1"; $("s11ImpMsg").innerHTML = "지난번 불러온 명단: <b>" + esc(j.name) + "</b> · " + j.n + "곳 · 서버 전송 0"; } catch (e) { /* 무시 */ } }
    }
    if (t === "route") renderSegs(sessionStorageGet("daeum.s11.navseg"));
  }
  function boot() {
    bindImport(); bindNav(); startLive();
    // 지난번 불러온 명단 꼬리표가 있으면 한 번 다시 그린다(officer.js 첫 그리기가 이 파일보다 먼저라 꼬리표가 빠짐)
    if (lsGet(LS_META) && lsGet(LS_META) !== "{}" && O() && O().refresh) setTimeout(function () { try { O().refresh(); } catch (e) { /* 무시 */ } }, 0);
    doc.addEventListener("daeum:officer-show", function () { setTimeout(onShow, 0); });
    root.addEventListener("resize", function () { if (tab() === "today") todayMap(); });
    if (Q === "error") setTimeout(function () { var m = doc.querySelector("main"); if (m) errorState(m, "시연: 방문 명단·지역 자료 파일을 받지 못한 경우의 화면입니다."); }, 1200);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
  root.DaeumS11c = { errorState: errorState, parseCSV: parseCSV, mapCols: mapCols, importRows: importRows, addrKey: addrKey, tags: tags, appUrl: appUrl, webUrl: webUrl, seg: seg };
})(window);
