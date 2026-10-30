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
  var U = F.util, TAG = "S9j", VERSION = 4, FLAG = "daeum.demo.seededFor"; // v4(S10n-2 O-08): 긴급 신호는 당일 기한이라 오늘 접수로 깐다 · v2: 읍면 배치(S10b) — 옛 남원동 가구 번호 기록을 지우고 다시 깐다 · v3(S10n O-04): 시연 기록 가구를 모두 발굴 명단(위기 정보가 있는 집) 안 가구로 바꿈
  // 가구 번호 머리글자 = 읍면 코드(data/tools/make_households.py SANGJU 순서)
  var AREA_OF = { A: "함창읍", B: "사벌국면", P: "공검면", Q: "이안면" };
  function areaOf(hid) { return AREA_OF[String(hid).charAt(0)] || ""; }

  // S10p-3 F-1 «시연 초기화»: 주소 끝 ?demo=reset → 담기·앞에 두기·특보 선택·시도 기록 등 시연 조작을 지우고 기본값으로(도로 경로 캐시는 남김 — 호출 한도 보호)
  try {
    if (/[?&]demo=reset(?![a-z])/.test(root.location.search)) {
      var LS = root.localStorage, ks = [];
      for (var i = 0; i < LS.length; i++) ks.push(LS.key(i));
      ks.forEach(function (k) { if (/^daeum\.(officer\.|requests|demo\.|citizen\.)/.test(k) && k !== "daeum.officer.road") LS.removeItem(k); });
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
  }

  var now = new Date(), today = U.ymd(now);
  var seeded = lsGet(FLAG, null);
  if (off) { if (seeded) { clear(); try { root.localStorage.removeItem(FLAG); } catch (e) { /* 무시 */ } } return; }
  if (seeded && seeded.day === today && seeded.v === VERSION) return; // 오늘 이미 깔았음 — 담당자가 누른 결과를 지우지 않는다

  // ── 시간 도구: n 영업일 전 hh:mm / n 일 전 hh:mm ──
  function wd(n, hh, mm) { var d = n > 0 ? U.subWorkdays(now, n) : U.startOfDay(now); d.setHours(hh, mm || 0, 0, 0); return d.toISOString(); }
  function cd(n, hh, mm) { var d = U.startOfDay(new Date(now.getTime() - n * 86400000)); d.setHours(hh, mm || 0, 0, 0); return d.toISOString(); }
  function att(id, hid, ch, result, at, note, reason) { return { id: "TD-" + id, householdId: hid, channel: ch, result: result, reason: reason || "", note: note || "", at: at, seed: TAG }; }

  clear();

  // ① 시도 이력 → 재시도(오늘·내일·모레에 고르게 걸리도록 «영업일 전»으로 정의 — 규칙은 features.js suggestNext)
  var A = [
    att(1, "A-003", "phone", "no_answer", wd(1, 10, 20)),                           // 부재 1회 → 오늘 오후 재연락
    att(2, "A-059", "ai", "no_answer", wd(1, 11, 0), "정보원 AI 초기상담 전화 안 닿음"), // AI 전화 안 닿음 → 오늘 방문
    att(3, "P-013", "visit", "no_answer", wd(3, 10, 0)),
    att(4, "P-013", "visit", "no_answer", wd(1, 14, 30), "현관에 우편물 쌓임"),        // 부재 2회 → 다음 영업일 저녁
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

  // ③ 주민 신호(가상) — 처리 기한(긴급 당일·일반 3영업일, 시연 설정)이 «오늘·내일·지남»에 걸리게
  function rq(n, createdAt, o) {
    var id = "REQ-" + U.ymd(createdAt).replace(/-/g, "") + "-S" + n;
    return Object.assign({ v: 1, id: id, createdAt: createdAt, status: "new", region: areaOf(o.householdId), contactPref: "phone",
      proxy: { isProxy: false, relation: "" }, subject: { age: null, ageBand: null, tags: [], childAges: [] }, summary: "", matched: [],
      urgent: false, mode: "rules", demo: true, seed: TAG,
      consent: { agreed: true, at: createdAt, text: "시연용 가상 요청(S9j 시연 기록)" },
      history: [{ at: createdAt, status: "new", by: "citizen" }] }, o);
  }
  var t0 = wd(0, 8, 40), t4 = wd(4, 9, 30), t3 = wd(3, 11, 0);
  var R = [
    rq(1, t0, { householdId: "Q-002", signal: "neighbor", place: "골목 끝 파란 대문 집", contactPref: "visit",
      proxy: { isProxy: true, relation: "이웃" }, subject: { tags: ["alone", "senior"] },
      situation: "옆집 할머니 댁 우편물이 일주일째 쌓여 있고 밤에 불이 안 켜져요" }),
    rq(2, wd(0, 8, 10), { householdId: "P-033", urgent: true, proxy: { isProxy: true, relation: "아들" }, subject: { tags: ["alone", "energy", "senior"] },
      situation: "혼자 사시는 어머니 댁 보일러가 고장 났는데 가스비도 밀려서 당장 추우세요" }),
    rq(3, t4, { householdId: "A-024", status: "seen", subject: { tags: ["unemployed", "housing"] },
      situation: "공장 일을 그만두고 월세가 두 달 밀렸어요",
      history: [{ at: t4, status: "new", by: "citizen" }, { at: t3, status: "seen", by: "officer", note: "연계 후보 확인" }] })
  ];
  lsSet(RKEY, (lsGet(RKEY, []) || []).filter(notSeed).concat(R));

  lsSet(FLAG, { day: today, v: VERSION, at: now.toISOString() });
})(typeof window !== "undefined" ? window : globalThis);
