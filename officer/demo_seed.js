/* 닿음 공무원 창구 — 시연 기록을 «열어 본 날» 기준으로 깔기 — S9j(⚙️ 파로, 2026-10-30)
   왜: 시도·연계·주민 신호 기록이 비어 있으면 «재방문·재연락»·«닷새치 재시도»·«연계 누락»·«기한 임박»이 모두 빈칸이고,
       날짜를 박아 두면 발표 날 캡처에 «지난 날짜»가 뜬다. 그래서 모든 시연 기록을 «오늘로부터 며칠 전»으로만 정의하고,
       날이 바뀌어 열면 시연 기록만 지우고 그날 기준으로 다시 깐다.
   지키는 것:
   - 담당자가 직접 남긴 기록(seed 표시 없음)은 건드리지 않는다. 시연 기록에는 seed:"S9j" 를 붙인다.
   - 가구는 data/households.json 의 가상 가구 중 «발굴 명단 안»(위기 정보가 하나 이상 있는 집)만 쓴다(S10n O-04 — 명단 밖이면 머리말·읍면이 비고 현황 집계와 어긋났다), 주민 신호도 가상(개인정보 0). S10b(10-30): 가구가 읍면에 흩어져 북부 4곳(함창읍·공검면·이안면·사벌국면) 가구로 깐다. 국민 창구 «내 요청»에는 안 보인다(그 기기에서 낸 번호만 보여 줌).
   - 끄기: 주소 끝에 ?demo=off (기존 시연 기록도 지움) · config DAEUM_CONFIG.demoSeed === false.
   순서: features.js·requests.js 뒤, mount.js·officer.js 앞에서 읽는다(첫 화면이 깔린 기록으로 그려지게). */
(function (root) {
  "use strict";
  var F = root.DaeumFeatures, REQ = root.DaeumRequests, C = root.DAEUM_CONFIG || {};
  if (!F || !F.util || !F.store) return;
  var U = F.util, TAG = "S9j", VERSION = 8, FLAG = "daeum.demo.seededFor"; // v8(S12-e 42): 지난 6주 방문 기록 18건(⑨)·시연 계획을 편집해도 다음 날엔 그날 기준으로 다시 깜 · v7(S11-k 재구축): 신고 4건 걷어냄 · 발굴년월을 «열어 본 날» 기준(이번 차수 경과 56일 미만) · Q-033 AI 초기상담 안 닿음 · 방문 계획(1일차 = 지난 근무일, 2일차 = 그다음)·방문 결과 기록 · v6(S11-i): 신고는 «공무원 접수»(전화·통장·이웃 방문)·지난 차수 명단·이웃 탐문·주의 꼬리표·약속·사후관리(1·3·6개월)도 깐다 · v5(S11-d2): 정보원 명단 열(발굴순위·횟수·처리여부·발굴년월)·명단 밖 가구 메모 4건·확정 기록 2건도 깐다 · v4(S10n-2 O-08): 긴급 신호는 당일 기한이라 오늘 접수로 깐다 · v2: 읍면 배치(S10b) — 옛 남원동 가구 번호 기록을 지우고 다시 깐다 · v3(S10n O-04): 시연 기록 가구를 모두 발굴 명단(위기 정보가 있는 집) 안 가구로 바꿈
  // 가구 번호 머리글자 = 읍면 코드(data/tools/make_households.py SANGJU 순서)
  var AREA_OF = { A: "함창읍", B: "사벌국면", P: "공검면", Q: "이안면" };
  function areaOf(hid) { return AREA_OF[String(hid).charAt(0)] || ""; }

  // S10p-3 F-1 «시연 초기화»: 주소 끝 ?demo=reset → 담기·앞에 두기·특보 선택·시도 기록 등 시연 조작을 지우고 기본값으로(도로 경로 캐시는 남김 — 호출 한도 보호)
  try {
    if (/[?&]demo=reset(?![a-z])/.test(root.location.search)) {
      var LS = root.localStorage, ks = [];
      for (var i = 0; i < LS.length; i++) ks.push(LS.key(i));
      ks.forEach(function (k) { if (/^daeum\.(officer\.|requests|demo\.|citizen\.|s11\.import)/.test(k) && k !== "daeum.officer.road") LS.removeItem(k); });
      if (root.history && root.history.replaceState) root.history.replaceState(null, "", root.location.pathname + (root.location.hash || "#today"));
    }
  } catch (e) { /* 저장소를 못 쓰면 그대로 */ }

  var off = false;
  try { off = /[?&]demo=off\b/.test(root.location.search) || C.demoSeed === false; } catch (e) { /* 무시 */ }

  function lsGet(k, d) { try { var v = root.localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 — 빈 화면으로 둔다 */ } }
  function notSeed(x) { return !(x && x.seed === TAG); }
  var RKEY = REQ ? REQ.key : (C.requestsKey || "daeum.requests");

  function clear() {
    ["attempts", "links"].forEach(function (n) { F.store.set(n, (F.store.get(n, []) || []).filter(notSeed)); });
    var oc = F.store.get("outcomes", {}) || {}, fu = F.store.get("followups", {}) || {};
    Object.keys(oc).forEach(function (k) { if (/^LD-/.test(k)) delete oc[k]; });
    Object.keys(fu).forEach(function (k) { if (/^LD-/.test(k)) delete fu[k]; });
    F.store.set("outcomes", oc); F.store.set("followups", fu);
    lsSet(RKEY, (lsGet(RKEY, []) || []).filter(notSeed));
    [OUT_KEY, REC_KEY].forEach(function (k) { lsSet(k, (lsGet(k, []) || []).filter(notSeed)); });
    // S11-i 새 저장소(시연 표시가 있는 것만 지움)
    ["rounds", "neighborLog", "promises"].forEach(function (n) { F.store.set(n, (F.store.get(n, []) || []).filter(notSeed)); });
    ["homeNotes", "afterThree"].forEach(function (n) { var o = F.store.get(n, {}) || {}; if (o.__seed === TAG) F.store.set(n, {}); });
    // S11-k 방문 결과 기록(시연분만)
    lsSet("daeum.visit.log", (lsGet("daeum.visit.log", []) || []).filter(notSeed));
  }
  var OUT_KEY = "daeum.officer.outside", REC_KEY = "daeum.officer.records", META_KEY = "daeum.s11.importMeta";

  var now = new Date(), today = U.ymd(now);
  var seeded = lsGet(FLAG, null);
  if (off) { if (seeded) { clear(); try { root.localStorage.removeItem(FLAG); } catch (e) { /* 무시 */ } } return; }
  if (seeded && seeded.day === today && seeded.v === VERSION) return; // 오늘 이미 깔았음 — 담당자가 누른 결과를 지우지 않는다
  // 45 미르(호창님 11-03 «언제든 심사자가 시연해도 문제없도록»): 날이 바뀌어 열면 시연 조작 전부(처리·삭제·직접 쓴 기록·계획)를 지우고 그날 기준 초기 상태로.
  //   ?demo=reset 과 같은 범위 + 방문 계획·결과·보낼 줄·s12 알림. 도로 경로 캐시·로그인 세션(sb-*)은 남긴다. 끄기: config.demoDailyReset === false
  if (seeded && seeded.day !== today && C.demoDailyReset !== false) {
    try { var LS2 = root.localStorage, ks2 = []; for (var j = 0; j < LS2.length; j++) ks2.push(LS2.key(j));
      ks2.forEach(function (k) { if (/^daeum\.(officer\.|requests|demo\.|citizen\.|s11\.import|visit\.(plan|log|queue)|s12\.)/.test(k) && k !== "daeum.officer.road") LS2.removeItem(k); });
    } catch (e) { /* 저장소를 못 쓰면 그대로 */ }
  }

  // ── 시간 도구: n 영업일 전 hh:mm / n 일 전 hh:mm ──
  function wd(n, hh, mm) { var d = n > 0 ? U.subWorkdays(now, n) : U.startOfDay(now); d.setHours(hh, mm || 0, 0, 0); return d.toISOString(); }
  function cd(n, hh, mm) { var d = U.startOfDay(new Date(now.getTime() - n * 86400000)); d.setHours(hh, mm || 0, 0, 0); return d.toISOString(); }
  function att(id, hid, ch, result, at, note, reason) { return { id: "TD-" + id, householdId: hid, channel: ch, result: result, reason: reason || "", note: note || "", at: at, seed: TAG }; }

  clear();

  // ① 시도 이력 → 재시도(오늘·내일·모레에 고르게 걸리도록 «영업일 전»으로 정의 — 규칙은 features.js suggestNext)
  var A = [
    att(1, "A-003", "phone", "no_answer", wd(1, 10, 20)),                           // 부재 1회 → 오늘 오후 재연락
    att(2, "A-059", "ai", "no_answer", wd(1, 11, 0), "한국사회보장정보원 AI 초기상담 전화 안 닿음"), // AI 전화 안 닿음 → 오늘 방문
    att(3, "P-013", "visit", "no_answer", wd(4, 10, 0)),
    att(4, "P-013", "visit", "no_answer", wd(2, 10, 30), "현관에 우편물 쌓임"),        // 이번 차수 부재 2번 → 닿지 않음 +1 · 오후로
    att(5, "Q-032", "visit", "no_answer", wd(6, 10, 30)),
    att(6, "Q-032", "visit", "no_answer", wd(4, 15, 0)),
    att(7, "Q-032", "visit", "no_answer", wd(1, 18, 10), "저녁에도 불 꺼져 있음"),     // 방문 3회 부재 → 간접 확인 전환
    att(8, "B-055", "phone", "refused", wd(3, 16, 0), "지금은 필요 없다고 하심"),      // 거부 → 5영업일 뒤 다시 권유
    att(9, "A-080", "visit", "met", wd(2, 10, 40), "상담함 — 연계 저장 전"),           // 상담했는데 연계 없음
    att(10, "P-017", "visit", "met", cd(21, 11, 0)),
    att(11, "Q-017", "visit", "met", cd(45, 10, 0)),
    att(12, "B-005", "visit", "met", cd(40, 14, 0)),
    att(13, "A-018", "visit", "not_eligible", wd(2, 15, 20), "", "income_over")
  ];
  F.store.set("attempts", (F.store.get("attempts", []) || []).concat(A));

  // ② 연계 → 신청 → 결정 → 사후관리(1·3개월 재점검)
  function link(id, hid, at, names) { return { id: "LD-" + id, at: at, householdId: hid, label: "가구 " + hid, area: areaOf(hid), serviceIds: [], serviceNames: names, summary: "", source: "rules", seed: TAG }; }
  var L = [
    link(1, "P-017", cd(20, 15, 0), ["긴급복지 생계지원", "에너지바우처"]),        // 안내 20일 지남 — 신청 확인 안 함
    link(2, "Q-017", cd(44, 11, 0), ["기초연금", "노인맞춤돌봄서비스"]),          // 결정 확인 33일 전 → 1개월 재점검 밀림
    link(3, "B-005", cd(39, 16, 0), ["주거급여"])                                 // 신청 34일 지남 — 결과 확인 안 함
  ];
  F.store.set("links", L.concat((F.store.get("links", []) || []).filter(notSeed)));
  var oc = F.store.get("outcomes", {}) || {};
  oc["LD-2"] = { result: "decided", at: cd(33, 10, 0), seed: TAG };
  oc["LD-3"] = { result: "applied", at: cd(34, 10, 0), seed: TAG };
  F.store.set("outcomes", oc);

  // ③ (S11-k) 주민 신고 시연 4건은 걷어냈다(신고 접수 제거, 11-03 호창님). 옛 시연 신고는 clear() 가 지운다.
  var t0 = wd(0, 8, 40);
  // 이번 차수(발굴년월): 열어 본 날이 20일 이하면 지난달, 아니면 이번 달 → 1회 발굴 집의 경과일이 늘 56일 미만(처리 기한 축이 시연마다 흔들리지 않게)
  var RYM = (function () { var d = new Date(now.getFullYear(), now.getMonth() - (now.getDate() <= 20 ? 1 : 0), 1); return d.getFullYear() + "-" + (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1); })();
  var PYM = (function () { var p = RYM.split("-"), d = new Date(+p[0], +p[1] - 2, 1); return d.getFullYear() + "-" + (d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1); })();

  // ④ S11-d2: 정보원 «발굴대상자 조회» 서식 열(시연 명단 data/demo_list.xlsx 9가구와 같은 값) — 명단을 불러오지 않아도 «정보원 N순위» 근거가 보이게.
  //    담당자가 실제 파일을 불러왔으면(seed 표시 없는 meta) 건드리지 않는다.
  var L9C = [["A-009", 1], ["Q-033", 1], ["P-026", 1], ["P-033", 1], ["P-013", 1], ["B-015", 3], ["A-056", 2], ["B-059", 2], ["A-086", 1]]; // A1 차수 대조용(= 아래 시연 명단)
  var meta0 = lsGet(META_KEY, null);
  if (!meta0 || !Object.keys(meta0).length || meta0.__seed === TAG) {
    var M = { __seed: TAG }, L9 = [["A-009", 1, "미처리", 1], ["Q-033", 1, "미처리", 1], ["P-026", 1, "처리중", 0], ["P-033", 1, "미처리", 1], ["P-013", 1, "미처리", 1],
      ["B-015", 3, "처리중", 1], ["A-056", 2, "미처리", 1], ["B-059", 2, "미처리", 1], ["A-086", 1, "미처리", 1]];
    L9.forEach(function (x, i) { M[x[0]] = { prio: String(i + 1), cnt: x[1], proc: x[2], lonely: !!x[3], child: false, ben: x[0] === "P-033" ? ["기초생계급여"] : [], hasBen: true, aiReq: x[0] === "Q-033" ? "요청" : "", aiRes: x[0] === "Q-033" ? "안 닿음" : "", vars: "", ym: RYM }; });
    lsSet(META_KEY, M);
    lsSet("daeum.s11.import", { name: "시연용 가상 명단(발굴대상자 조회 서식).xlsx", n: 9, at: now.getTime(), demo: true });
  }

  // ⑤ S11-d2: 명단 밖 가구 메모(A안) — 현장에서 본 «명단에 없는 걱정되는 집». 주소는 대조 전용(화면에는 «○○읍 일대»까지만)
  function memo(n, area, from, signs, status, at, o) {
    return Object.assign({ id: "OUT-" + U.ymd(at).replace(/-/g, "") + "-" + n, at: at, area: area, addr: "", place: "", from: from, signs: signs, ageBand: "80대 이상", alone: "예",
      urgent: false, status: status, match: null, history: [{ at: at, status: "registered", by: "officer" }], seed: TAG }, o || {});
  }
  var O = [
    memo(1, "함창읍", "leader", ["우편물 쌓임", "난방 안 됨"], "not_in_list", cd(12, 15, 0), { addr: "경상북도 상주시 함창읍 가상리 140", place: "마을회관 뒤 파란 지붕",
      match: { round: RYM, status: "not_in_list", listId: null, twice: false } }),
    memo(2, "공검면", "field", ["거동 불편"], "in_list", cd(9, 11, 20), { addr: "경상북도 상주시 공검면 가상리 13", ageBand: "80대 이상",
      match: { round: RYM, status: "in_list", listId: "P-013", listRank: "5", twice: false } }),
    memo(3, "이안면", "field", ["우편물 쌓임", "불 꺼짐"], "registered", t0, { place: "골목 끝 파란 대문 집", alone: "모름" }),
    memo(4, "사벌국면", "neighbor", ["끼니 거름"], "referred", cd(19, 10, 0), { addr: "경상북도 상주시 사벌국면 가상리 210", referredAt: cd(5, 16, 0), alone: "예",
      match: { round: RYM, status: "not_in_list", listId: null, twice: false } })
  ];
  lsSet(OUT_KEY, (lsGet(OUT_KEY, []) || []).filter(notSeed).concat(O));

  // ⑥ S11-d2: 확정한 상담 기록(행복이음 입력 순서) — 기록 화면이 비지 않게
  function rec(id, hid, at, needs, sum, svc, next) {
    return { id: "RC-" + id, at: at, householdId: hid, label: "가구 " + hid, area: areaOf(hid), seed: TAG,
      text: ["[행복이음 입력 초안 — 공무원 확정]", "주요 욕구: " + needs, "상담 요약: " + sum, "연계 후보: " + svc, "다음 할 일: " + next].join("\n") };
  }
  lsSet(REC_KEY, [
    rec(1, "A-080", wd(2, 10, 40), "생계, 일자리", "실직 뒤 생활비 부족. 월세 두 달 밀림. 구직 의사 있음.", "긴급복지 생계지원, 국민취업지원제도", "신청서 안내 후 3근무일 뒤 전화 확인"),
    rec(2, "P-017", cd(21, 11, 0), "에너지, 돌봄", "홀로 사는 84세. 난방비 부담·보일러 노후. 안부 확인 원함.", "에너지바우처, 노인맞춤돌봄서비스", "1개월 뒤 재방문(사후관리)")
  ].concat((lsGet(REC_KEY, []) || []).filter(notSeed)));

  // ⑦ S11-i — 공무원 업무 도우미 보강(A1·A2·B2·C1·C2) 시연 데이터. 모두 가상, 이름·연락처·주소 없음
  if (F.rounds) {
    // A1 지난 차수(2026-09) ↔ 이번 차수(2026-10 = ④ 시연 명단 9가구): 새로 6 · 계속 3(발굴 2~3회째) · 빠짐 4(우리 기록으로 이유)
    var cur = { ym: RYM, ids: L9C.map(function (x) { return x[0]; }), ranks: {}, cnts: {}, name: "시연용 가상 명단(발굴대상자 조회 서식).xlsx", seed: TAG };
    L9C.forEach(function (x, i) { cur.ranks[x[0]] = String(i + 1); cur.cnts[x[0]] = x[1]; });
    var prev = { ym: PYM, ids: ["B-015", "A-018", "A-056", "P-017", "B-059", "Q-017", "B-055"], ranks: { "B-015": "1", "A-018": "2", "A-056": "3", "P-017": "4", "B-059": "5", "Q-017": "6", "B-055": "7" }, cnts: {}, name: PYM + " 발굴대상자 조회(가상).xlsx", seed: TAG };
    F.store.set("rounds", (F.store.get("rounds", []) || []).filter(notSeed).concat([prev, cur]));
  }
  if (F.visitTime) {
    // A2 이웃 탐문 — Q-032(방문 3회 부재 → 간접 확인 단계) · P-013(부재 2회)
    F.store.set("neighborLog", (F.store.get("neighborLog", []) || []).filter(notSeed).concat([
      { id: "NB-1", householdId: "Q-032", at: wd(1, 18, 30), text: "옆집: 요즘 저녁 7시 넘어 들어오시는 것 같다, 낮엔 읍내 병원 다니심", seed: TAG },
      { id: "NB-2", householdId: "P-013", at: wd(1, 14, 50), text: "앞집: 오후 늦게 4시쯤엔 집에 계심, 귀가 어두우셔서 문을 크게 두드려야 함", seed: TAG }]));
    F.store.set("afterThree", { __seed: TAG, "Q-032": { tong: wd(0, 9, 10) } });
  }
  if (F.homeCard) {
    // C1 주의 꼬리표(오늘 방문 집 위주)
    F.store.set("homeNotes", { __seed: TAG, "P-013": ["개가 있음", "귀가 어두우심"], "A-009": ["오후에만 계심"], "Q-033": ["거동 불편"], "P-033": ["문 두드리기보다 전화 먼저"], "B-015": ["보호자 동석 원함"] });
  }
  if (F.promises) {
    // C2 약속 — 오늘·지남·다음 주. 확정 기록(⑥)·지난 방문 때 한 약속
    var nextMon = (function () { var d = U.startOfDay(now); d = new Date(d.getTime() + ((8 - d.getDay()) % 7 || 7) * 86400000); return U.ymd(d); })();
    var pr = function (n, hid, text, kind, due, at) { return { id: "PR-S" + n, householdId: hid, label: "가구 " + hid, area: areaOf(hid), text: text, kind: kind, due: due, src: "상담 기록", at: at, done: false, doneAt: null, seed: TAG }; };
    F.store.set("promises", (F.store.get("promises", []) || []).filter(notSeed).concat([
      pr(1, "P-013", "에너지바우처 신청서 가져다 드리기", "doc", today, wd(2, 10, 0)),
      pr(2, "A-080", "신청서 안내 후 3근무일 뒤 전화 확인", "call", U.ymd(U.addWorkdays(U.subWorkdays(now, 2), 3)), wd(2, 10, 40)),
      pr(3, "B-015", "다음 주 월요일 보호자에게 전화 드리기", "call", nextMon, wd(3, 11, 0)),
      pr(4, "Q-017", "노인맞춤돌봄 제공 시작했는지 알아봐 드리기", "check", U.ymd(U.subWorkdays(now, 2)), cd(12, 10, 0)),
      pr(5, "A-009", "주거급여 서류 목록 큰 글씨로 드리기", "doc", today, wd(1, 16, 0))]));
  }
  // B2 사후관리 1·3·6개월 — 오늘 재확인 1집(LD-4), 6개월 차례 1집(LD-5, 1·3개월은 했음). 결정 확인된 연계만 더해 «연계 누락» 숫자는 그대로
  F.store.set("links", (F.store.get("links", []) || []).concat([
    link(4, "A-056", cd(37, 10, 0), ["노인맞춤돌봄서비스"]),
    link(5, "B-059", cd(190, 14, 0), ["기초연금", "에너지바우처"])]));
  var oc2 = F.store.get("outcomes", {}) || {}, fu2 = F.store.get("followups", {}) || {};
  oc2["LD-4"] = { result: "decided", at: cd(30, 10, 0), seed: TAG };
  oc2["LD-5"] = { result: "decided", at: cd(170, 10, 0), seed: TAG };
  fu2["LD-5:m1"] = cd(140, 11, 0); fu2["LD-5:m3"] = cd(80, 11, 0);
  F.store.set("outcomes", oc2); F.store.set("followups", fu2);

  // ⑧ S11-k: 방문 계획(visit_plan 모양)과 방문 결과(visit_log 모양) — 계획은 2근무일 전 오후에 확정, 1일차 = 지난 근무일(5집 모두 다녀옴),
  //    2일차 = 다음 근무일(4집 남음). 담당자가 직접 확정한 계획(seed 표시 없음)은 덮지 않는다. 메모는 모두 가상 문장(이름·주소·연락처 없음).
  var PLAN_KEY = "daeum.visit.plan", LOG_KEY = "daeum.visit.log";
  var d0 = U.subWorkdays(now, 2), d1 = U.subWorkdays(now, 1), d2 = U.addWorkdays(d1, 1);
  function at(d, hh, mm) { var x = new Date(d); x.setHours(hh, mm || 0, 0, 0); return x.toISOString(); }
  var plan0 = lsGet(PLAN_KEY, null);
  if (!plan0 || plan0.seed === TAG || plan0.from_seed === TAG) { // from_seed: 시연 계획을 화면에서 편집한 것(날이 바뀌면 그날 기준으로 다시 깐다 — 날짜가 낡지 않게)
    var DAY1 = [["P-033", 10, 48, 4], ["P-026", 11, 23, 3], ["Q-033", 13, 19, 2], ["A-009", 14, 0, 1], ["P-013", 14, 44, 5]],
      DAY2 = [["B-015", 9, 46, 6], ["B-059", 10, 20, 8], ["A-086", 11, 9, 9], ["A-056", 13, 6, 7]];
    var VR = { "A-009": 1, "Q-033": 2, "P-033": 3, "P-026": 4, "P-013": 5, "A-056": 6, "B-015": 7, "B-059": 8, "A-086": 9 };
    var rows = [];
    DAY1.forEach(function (x, i) { rows.push({ day: 1, seq: i + 1, household_no: x[0], planned_at: at(d1, x[1], x[2]), status: x[0] === "Q-033" ? "absent" : "done", list_rank: x[3], visit_rank: VR[x[0]] }); });
    DAY2.forEach(function (x, i) { rows.push({ day: 2, seq: i + 1, household_no: x[0], planned_at: at(d2, x[1], x[2]), status: "planned", list_rank: x[3], visit_rank: VR[x[0]] }); });
    lsSet(PLAN_KEY, { round_ym: RYM, ranked_at: at(d0, 16, 0), until: U.ymd(U.addWorkdays(d0, 7)), per_day: 5, rows: rows, seed: TAG });
    function vl(n, hid, hh, mm, result, memo, tags) { return { id: "VL-S" + n, household_no: hid, at: at(d1, hh, mm), result: result, memo: memo, tags: tags || [], promises: [], seed: TAG }; }
    lsSet(LOG_KEY, (lsGet(LOG_KEY, []) || []).filter(notSeed).concat([
      vl(1, "P-033", 11, 12, "met", "통신비 3달 체납. 기초생활 수급 중. 통신비 감면 신청 방법을 안내함. 아들이 가끔 들른다고 함.", ["주거", "생계"]),
      vl(2, "P-026", 11, 47, "met", "대출 연체로 독촉 전화가 잦음. 일거리가 줄어 소득이 줄었다고 함. 서민금융 상담 연결하기로.", ["생계"]),
      vl(3, "Q-033", 13, 25, "absent", "부재. 현관 앞에 신문이 3일치 쌓여 있음.", []),
      vl(4, "A-009", 14, 24, "met", "월세 2개월 밀림. 혼자 사심. 주거급여 신청을 안내하고 서류 목록을 큰 글씨로 드리기로.", ["주거"]),
      vl(5, "P-013", 15, 8, "met", "보일러 안 돌아감, 가스비 3달 밀림. 무릎 아파 병원 못 감. 아들과 연락 뜸함. 에너지바우처 신청서 다음 주 화요일에 가져다 드리기로.", ["주거", "건강"])
    ]));
    if (F.promises) {
      var pl = (F.store.get("promises", []) || []).map(function (p) { return p.id === "PR-S1" ? Object.assign({}, p, { done: true, doneAt: at(d1, 15, 8) }) : p; });
      var tue = (function () { var x = U.startOfDay(d1); x = new Date(x.getTime() + ((9 - x.getDay()) % 7 || 7) * 86400000); return U.ymd(x); })();
      pl.push({ id: "PR-S6", householdId: "P-013", label: "가구 P-013", area: "공검면", text: "에너지바우처 신청서 다음 주 화요일에 가져다 드리기", kind: "doc", due: tue, src: "방문 메모", at: at(d1, 15, 8), done: false, doneAt: null, seed: TAG });
      F.store.set("promises", pl);
    }
  }

  // ⑨ S12-e 42(11-03 호창님 «언제 시연하더라도 가상의 데이터가 쌓여 사용감을»): 지난 차수·지난 몇 주 방문 기록(visit_log 모양)을
  //    «오늘로부터 n근무일 전»으로 깐다 → 실적 «주별 방문 기록»에 6주 누적이 보인다. 이번 차수 명단 9가구·재시도 가구는 쓰지 않는다
  //    (순위 계산·부재 횟수가 바뀌지 않게). 담당자가 직접 남긴 기록(seed 없음)은 그대로 두고 그 위에 함께 센다. 메모는 모두 가상 문장.
  var HIST = [
    [6, "A-018", 10, 30, "met", "소득 기준 넘어 기초급여 대상 아님. 통신비 감면만 안내함.", ["생계"]],
    [7, "B-055", 15, 10, "refuse", "지금은 도움 필요 없다고 하심. 다음 차수에 다시 권유.", []],
    [8, "P-017", 11, 0, "met", "홀로 사는 84세. 보일러 노후. 에너지바우처 안내.", ["주거", "돌봄"]],
    [9, "B-048", 10, 20, "met", "건강보험료 4달 밀림. 분할 납부 상담 연결.", ["생계"]],
    [11, "A-005", 14, 40, "absent", "부재. 이웃 말로 낮에는 밭에 계심.", []],
    [12, "Q-017", 10, 0, "met", "기초연금 신청 도움. 노인맞춤돌봄 안내.", ["돌봄"]],
    [13, "A-005", 17, 30, "met", "저녁에 만남. 관리비 밀림. 주거급여 서류 안내.", ["주거"]],
    [14, "A-090", 11, 10, "met", "혼자 사심. 끼니를 자주 거른다고 함. 밑반찬 지원 연계 검토.", ["건강", "돌봄"]],
    [16, "B-028", 13, 30, "absent", "부재. 현관에 우편물 쌓임.", []],
    [17, "P-021", 10, 40, "met", "실직 뒤 생활비 부족. 긴급복지 생계지원 안내.", ["생계"]],
    [18, "B-028", 16, 0, "met", "다시 방문해 만남. 단전 예고 통지 받음. 에너지 지원 연계.", ["주거"]],
    [19, "A-041", 14, 0, "refuse", "자녀가 돌본다고 하심. 연락처 남김.", []],
    [21, "P-035", 11, 20, "met", "무릎 수술 뒤 거동 불편. 방문 건강관리 연계.", ["건강"]],
    [22, "A-053", 10, 10, "met", "월세 3달 밀림. 주거급여·긴급 주거지원 안내.", ["주거"]],
    [24, "B-033", 15, 30, "absent", "부재. 불 꺼져 있음.", []],
    [26, "A-092", 10, 50, "met", "통신비·가스비 체납. 감면 신청 함께 함.", ["생계"]],
    [27, "A-036", 13, 40, "met", "우울감 호소. 정신건강복지센터 상담 연결.", ["건강"]],
    [29, "B-033", 17, 10, "met", "저녁에 만남. 혼자 사심. 노인맞춤돌봄 신청.", ["돌봄"]]
  ];
  lsSet("daeum.visit.log", (lsGet("daeum.visit.log", []) || []).concat(HIST.map(function (x, i) {
    return { id: "VL-H" + (i + 1), household_no: x[1], at: wd(x[0], x[2], x[3]), result: x[4], memo: x[5], tags: x[6], promises: [], seed: TAG };
  })).sort(function (a, b) { return a.at < b.at ? -1 : 1; }));

  lsSet(FLAG, { day: today, v: VERSION, at: now.toISOString() });
})(typeof window !== "undefined" ? window : globalThis);
