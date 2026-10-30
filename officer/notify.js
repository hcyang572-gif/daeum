/* 닿음 S10h ⑥⑦ — 알림톡 문구 미리보기 · 방문 일정 달력(.ics) 만들기(화면과 무관한 순수 함수, ⚙️ 파로 2026-10-30)
   브라우저: window.DaeumNotify / node: require.
   ⑥ 알림톡: «미리보기 · 실제 발송 안 함». 문구에 가구 이름·주소·서비스명을 넣지 않는다(누가 폰을 봐도 사정이 드러나지 않게).
      카카오 알림톡은 사전 승인된 정보성 템플릿만 보낼 수 있고 광고성 문구는 금지 → 혜택·할인·무료 같은 말을 쓰지 않는다.
   ⑦ .ics: IETF RFC 5545(2009) — CRLF 줄끝, 75옥텟 줄 접기, UID·DTSTAMP 필수, TZID=Asia/Seoul + VTIMEZONE.
      일정에는 읍면동·순번·예정 시각만 넣는다(가구 이름·상세주소·사유 제외). */
(function (root) {
  "use strict";
  var W = ["일", "월", "화", "수", "목", "금", "토"];
  var SLOT_TIME = { "오전": ["10:00", "11:00"], "오후": ["14:00", "15:00"], "저녁": ["18:30", "19:00"] };
  var SLOT_WORD = { "오전": "오전", "오후": "오후", "저녁": "저녁 무렵" };
  var DEMO_PHONE = "054-000-0000";

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymdOf(d) { d = new Date(d); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function md(dateStr) { var p = String(dateStr).split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]); return (+p[1]) + "월 " + (+p[2]) + "일(" + W[d.getDay()] + ")"; }
  function hmParts(s, fb) { var m = /^(\d{1,2}):(\d{2})/.exec(String(s || "")); return m ? [+m[1], +m[2]] : fb; }
  function timeWord(s) { var p = hmParts(s, null); if (!p) return ""; var ap = p[0] < 12 ? "오전" : "오후", h = p[0] % 12 || 12; return ap + " " + h + "시" + (p[1] ? " " + p[1] + "분" : ""); }
  // 읍·면·동 → «○○읍 행정복지센터»(동·읍·면 모두 행정복지센터로 부른다)
  function office(area) { return (area ? area + " " : "") + "행정복지센터"; }

  // ── ⑥ 알림톡 문구 ──────────────────────────────────────────
  var KINDS = [
    { id: "visit", label: "방문 예정 안내" },
    { id: "absent", label: "부재 안내" },
    { id: "link", label: "연계 안내(신청 도움)" }
  ];
  /**
   * kind: visit|absent|link, o = { area, date:"YYYY-MM-DD", time:"10:30" | slot:"오전", nextDate, nextSlot, team, phone }
   * → { title, body, buttons:[...], chars, kind } — 이름·주소·서비스명은 입력으로 받지도 않는다.
   */
  function alimtalk(kind, o) {
    o = o || {};
    var team = o.team || "맞춤형복지팀", phone = o.phone || DEMO_PHONE, from = office(o.area);
    var when = o.date ? md(o.date) + " " + (o.time ? timeWord(o.time) + "쯤" : (SLOT_WORD[o.slot] || "")) : "";
    var head = "안녕하세요, " + from + " " + team + "입니다.";
    var body, title;
    if (kind === "absent") {
      title = "다시 찾아뵐 안내";
      var nx = o.nextDate ? md(o.nextDate) + " " + (SLOT_WORD[o.nextSlot] || "") : "가까운 날";
      body = [head, "", (when ? when.trim() + "에 " : "") + "댁에 들렀으나 뵙지 못했습니다.", nx.trim() + "에 다시 찾아뵙겠습니다.",
        "", "편하신 때가 따로 있으시면 아래 번호로 알려 주세요.", "☎ " + phone + " (평일 9시~18시)"];
    } else if (kind === "link") {
      title = "신청 도움 안내";
      body = [head, "", "지난번 상담 때 함께 살펴본 지원의 신청을 도와드리려고 연락드렸습니다.", "필요한 서류와 절차는 통화로 차근차근 안내해 드리겠습니다.",
        "", "편하신 때 아래 번호로 연락 주세요.", "☎ " + phone + " (평일 9시~18시)"];
    } else {
      kind = "visit"; title = "방문 예정 안내";
      body = [head, "", (when ? when.trim() + "에 " : "곧 ") + "댁으로 찾아뵙고, 생활에 불편하신 점이 없는지 여쭈려 합니다.",
        "시간이 맞지 않으시면 아래 번호로 편하게 알려 주세요.", "☎ " + phone + " (평일 9시~18시)"];
    }
    var text = body.join("\n");
    return { kind: kind, title: title, body: text, sender: "상주시 " + from, buttons: ["담당자에게 전화"], chars: text.length,
      copy: "[" + title + "]\n" + text };
  }
  /** 문구 점검: 넣으면 안 되는 말(이름·주소·광고성) — 시험·화면 공용 */
  var BANNED = /(무료|할인|혜택|경품|상품권|이벤트|당첨|지원금 지급)/;
  function lint(text, avoid) {
    var bad = [], m = BANNED.exec(text); if (m) bad.push("광고성 낱말: " + m[1]);
    (avoid || []).forEach(function (w) { if (w && String(text).indexOf(w) >= 0) bad.push("들어가면 안 되는 값: " + w); });
    return bad;
  }

  // ── ⑦ .ics ────────────────────────────────────────────────
  function esc(s) { return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  function utf8len(ch) { var c = ch.codePointAt(0); return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
  /** RFC 5545 §3.1: 한 줄 75옥텟 이하, 넘으면 CRLF + 공백 하나로 접는다(UTF-8 글자 중간에서 자르지 않음) */
  function fold(line) {
    var out = [], cur = "", n = 0, lim = 75;
    Array.from(line).forEach(function (ch) {
      var b = utf8len(ch);
      if (n + b > lim) { out.push(cur); cur = " "; n = 1; }
      cur += ch; n += b;
    });
    out.push(cur);
    return out.join("\r\n");
  }
  function stampUTC(d) { d = new Date(d); return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z"; }
  function local(date, hm) { var p = hmParts(hm, [9, 0]); return String(date).replace(/-/g, "") + "T" + pad(p[0]) + pad(p[1]) + "00"; }
  function addMin(hm, min) { var p = hmParts(hm, [9, 0]), t = p[0] * 60 + p[1] + min; return pad(Math.floor(t / 60) % 24) + ":" + pad(t % 60); }

  /** 하루 동선 1장(F.daySheet.build 결과) → 일정 줄. 이름·사유·주의는 버리고 읍면동·순번·시각만 남긴다. */
  function fromSheet(sheet) {
    return ((sheet && sheet.stops) || []).map(function (x) {
      var t = String(x.time || "").split("~");
      return { date: sheet.date, no: x.no, area: x.area || "", start: t[0] || "09:30", end: t[1] || addMin(t[0] || "09:30", 30), exact: true, kind: "visit" };
    });
  }
  /** 닷새치 재시도 일정(F.contacts.plan) → 방문 줄만(전화·문자는 달력에 넣지 않음). skipDate 날짜는 빼고(오늘 동선과 겹치지 않게) */
  function fromPlan(plan, skipDate) {
    var out = [];
    (plan || []).forEach(function (d) {
      if (d.date === skipDate) return;
      var no = 0;
      (d.items || []).forEach(function (x) {
        if (x.channel !== "visit") return;
        var tt = SLOT_TIME[x.slot] || SLOT_TIME["오전"]; no++;
        out.push({ date: d.date, no: no, area: x.area || "", start: tt[0], end: tt[1], exact: false, slot: x.slot, kind: x.kind === "followup" ? "followup" : "retry" });
      });
    });
    return out;
  }
  var KIND_TXT = { visit: "방문", retry: "재방문", followup: "사후 확인 방문" };
  /**
   * events: [{date, no, area, start, end, exact, slot, kind}] → .ics 문자열(CRLF)
   * o = { now: Date(DTSTAMP), calName }
   */
  function ics(events, o) {
    o = o || {};
    var stamp = stampUTC(o.now || new Date());
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Daeum//Visit Schedule 1.0//KO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "X-WR-CALNAME:" + esc(o.calName || "닿음 방문 일정"), "X-WR-TIMEZONE:Asia/Seoul",
      "BEGIN:VTIMEZONE", "TZID:Asia/Seoul", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0900", "TZOFFSETTO:+0900", "TZNAME:KST", "END:STANDARD", "END:VTIMEZONE"];
    (events || []).forEach(function (e) {
      var what = KIND_TXT[e.kind] || "방문";
      L.push("BEGIN:VEVENT",
        "UID:daeum-" + String(e.date).replace(/-/g, "") + "-" + (e.kind || "visit") + "-" + e.no + "@daeum.invalid",
        "DTSTAMP:" + stamp,
        "DTSTART;TZID=Asia/Seoul:" + local(e.date, e.start),
        "DTEND;TZID=Asia/Seoul:" + local(e.date, e.end),
        "SUMMARY:" + esc(what + " " + e.no + " · " + (e.area || "관할")),
        "LOCATION:" + esc((e.area || "") + " 일대"),
        "DESCRIPTION:" + esc("닿음 " + (e.exact ? "하루 동선 예정 시각" : (e.slot || "") + " 시간대(시각은 어림)") + ". 가구 이름·주소는 넣지 않았습니다 — 닿음 «경로» 화면에서 확인하세요."),
        "TRANSP:OPAQUE", "END:VEVENT");
    });
    L.push("END:VCALENDAR");
    return L.map(fold).join("\r\n") + "\r\n";
  }

  var api = { KINDS: KINDS, SLOT_TIME: SLOT_TIME, DEMO_PHONE: DEMO_PHONE, alimtalk: alimtalk, lint: lint,
    fold: fold, esc: esc, stampUTC: stampUTC, fromSheet: fromSheet, fromPlan: fromPlan, ics: ics, ymd: ymdOf,
    SOURCE_ICS: "출처: IETF · RFC 5545 iCalendar 규격 · 2009-09",
    SOURCE_TALK: "근거: 알림톡 발송 대행업체 안내(bizgo.io, 2026-10 조회) — 사전 승인된 정보성 템플릿만 발송·광고성 금지 · 문구는 닿음 시연용 예시(가상)" };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DaeumNotify = api;
})(this);
