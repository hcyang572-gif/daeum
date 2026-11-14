/* 복지 사각지대 현장 업무 도우미(닿음) — 탭 공통 조각 — 단계 표지(STN·stLbl·stTxt·stationHref·stepsOf)·오늘 머리(todayHead·demoTail)·기능 카드(qv·qf·qcards·qchips)·링크 줄(linksRow)
   101회차 ⚙️ 파로(2026-11-14): app/app.js 에서 그대로 옮겨 나눔(동작 변경 0). 화면 함수 본문은 app.js 때와 같은 글자·같은 들여쓰기.
   잇는 법: app.js 가 원래 자리 순서대로 DaeumTabs.common(AK) 를 부른다. AK = 공통 이름 창구(app.js·다른 탭의 이름을 «읽을 때의 값»으로 돌려줌).
   받는 이름은 relink() 가 지역 변수로 채우고(부를 때 한 번 + app.js 가 모든 탭을 읽은 뒤 한 번 더), 여러 파일이 함께 바꾸는 값은 AK.이름 으로 읽고 쓴다. */
(window.DaeumTabs = window.DaeumTabs || {}).common = function (AK) {
  "use strict";
  var F, I, LS_SAFE, esc, lsGet, md, listIds, deadline, statusOf, FD;
  function relink() {
    F = AK.F; I = AK.I; LS_SAFE = AK.LS_SAFE; esc = AK.esc; lsGet = AK.lsGet; md = AK.md; listIds = AK.listIds; deadline = AK.deadline;
    statusOf = AK.statusOf; FD = AK.FD;
  }
  relink();
  // ═════ P0 오늘 ═════
  // S12-v U40(F6): [단계, 근거 데이터(번호 없이 — 번호는 «활용 데이터» 화면에만), 탭] · 탭 이름을 단계 앞에 작게 붙여 «현장» 탭과 «요약» 단계가 따로 노는 혼란을 막는다
  var STN = [["순서", "발굴 명단", "방문"], ["동선", "명단 우선방문 열", "방문"], ["요약", "명단 급여 열", "현장"], ["확인", "명단 위기정보", "현장"], ["상담", "복지서비스 원문", "현장"], ["기록", "복지서비스 목록", "기록"], ["보고", "수급권자 현황", "보고"]];
  function stLbl(i) { var x = STN[i]; return (x[2] !== x[0] ? '<small class="stp">' + x[2] + "</small>" : "") + x[0]; }
  function stTxt(i) { var x = STN[i]; return x[2] !== x[0] ? x[2] + "·" + x[0] : x[0]; }
  function stationHref(i, hid) {
    var x = hid ? ":" + hid : "";
    return ["#plan", "#route" + x, "#home" + x, "#check" + x, "#talk" + x, "#record" + x, "#docs"][i];
  }
  function stepsOf(hid, confirmed) {
    var st = statusOf(hid), sf = lsGet(LS_SAFE, null);
    if (st !== "planned") return 6;
    if (sf && sf.hid === hid) return 3;
    return confirmed ? 2 : 1;
  }
  // S12-x 66회차: 오늘 = 시안 v3 scrToday 구조 — 첫 칸(제목 .ph · 지금 할 일 · 맡는 구간 · 발굴 명단 · 이어지는 화면) | 둘째 칸(오늘 방문 시간줄 .tl) | 셋째 칸(주소 정리 · 남은 기한 · 가상 데이터 꼬리)
  function todayHead(now) { return '<div class="ph"><h1>오늘 할 일</h1><span>' + esc(md(now)) + "</span></div>"; }
  function demoTail() { return '<div class="demo"><span class="samp">가상 데이터</span><span>가구 번호·나이·사유·메모는 모두 시연용 가상 · 실제 개인정보 없음</span><a class="pr" href="#help">사용 방법</a><a class="pr" href="shared/data.html">활용 데이터</a><a class="pr" href="?demo=reset#today">시연 처음 상태로</a></div>'; }
  // 74회차 «보이되 조용하게» — 이 탭의 다른 기능을 이름표(.ql) + 작은 기능 카드(.qg › button.qf: 아이콘·이름·한 줄 효과, 숫자는 .v) · 칩 줄(.qcs › .chip)
  //   카드 한 장 = [아이콘 열쇠, 이름(html — 숫자는 qv()), 한 줄 효과, 동작 속성] · 동작: data-go="#화면"(주소 이동) · data-pick(명단 고르기) · data-qto="선택자"(같은 화면 그 칸으로 내려가기)
  function qv(n) { return '<span class="v">' + esc(n) + "</span>"; }
  function qf(x) { return '<button type="button" class="qf" ' + x[3] + '><span class="ic">' + (I[x[0]] || I.more || "") + "</span><span><b>" + x[1] + "</b><small>" + esc(x[2]) + "</small></span></button>"; }
  function qcards(label, items) { items = items.filter(Boolean); return items.length ? '<div class="ql">' + esc(label) + '</div><div class="qg">' + items.map(qf).join("") + "</div>" : ""; }
  function qchips(items, label) { return '<div class="qcs" role="list"' + (label ? ' aria-label="' + esc(label) + '"' : "") + ">" + items.map(function (c) { return '<span class="chip' + (c[2] ? " on" : "") + '" role="listitem">' + (c[0] ? I[c[0]] || "" : "") + esc(c[1]) + "</span>"; }).join("") + "</div>"; }
  function linksRow(hid0) { // 오늘 탭 «이 탭의 다른 기능» — 옛 «이어지는 화면» 링크 줄을 기능 카드로(기능·주소 그대로)
    var ids = listIds(), dl = deadline(), dp = dl.until ? F.deadline.plan(0, dl.until, dl.perDay || 5) : null, sf = lsGet(LS_SAFE, null);
    return qcards("이 탭의 다른 기능", [
      ["db", "발굴 명단 " + qv(ids.length) + "가구", "읍면 막대 · 미처리·우선방문", 'data-qto=".lcard"'],
      dp && dp.set ? ["clock", "남은 기한 " + qv(dp.left) + "근무일", "기한 넘길 가구 미리 셈", 'data-qto=".card.dead"'] : ["clock", "남은 기한", "기한을 넣으면 하루 몇 가구인지 셈", 'data-go="#plan"'],
      FD ? ["pin", "주소 정리", "도로명주소 «확인 필요» 표시", 'data-qto=".fd-addr"'] : null,
      ["today", "방문 계획", "일차·순서 바꾸기", 'data-go="#plan"'],
      ["route", "동선·길안내", "네이버 지도", 'data-go="#route' + (hid0 ? ":" + hid0 : "") + '"'],
      ["report", "실적·사후관리", "재방문·약속", 'data-go="#perf"'],
      ["upload", "명단 불러오기", "행복이음 «발굴대상자 조회» 엑셀", 'data-pick="1"']
    ]);
  }

  // ── 내보내기(app.js·다른 탭이 읽는 이름) ──
  AK.put({
    STN: function () { return STN; }, stLbl: function () { return stLbl; }, stTxt: function () { return stTxt; }, stationHref: function () { return stationHref; },
    todayHead: function () { return todayHead; }, demoTail: function () { return demoTail; }, qv: function () { return qv; }, qcards: function () { return qcards; },
    qchips: function () { return qchips; }, linksRow: function () { return linksRow; }
  });
  return relink;
};
