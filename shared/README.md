# 닿음 공통 모듈(shared/)

국민 창구(`citizen/`)와 공무원 창구(`officer/`)가 함께 쓰는 파일. 빌드 없는 정적 JS다.

| 파일 | 하는 일 |
|---|---|
| `tokens.css` | 색·글자 토큰(정본). 창구별 CSS는 변수만 가져다 쓴다 |
| `config.js` | `window.DAEUM_CONFIG` — AI 주소, 시연 지역·**읍면 정본**(`data/households.json` areas와 같아야 함), 데이터 경로, 요청 저장 키. ⛔ 비밀값 금지 |
| `ai.js` | 국민 `DaeumAI.recommend(input, catalog)`·공무원 `DaeumAI.summarize(text, ctx)` — 같은 Edge Function 하나를 같은 형식으로 부르고, 실패하면 규칙 기반으로 돌아간다(옛 `officer/ai-officer.js` 통합) |
| `requests.js` | `DaeumRequests` — 국민 «도움 요청» 저장·조회·상태 변경 |
| `netguard.js` | 끊김·자료 사본·AI 미연결 안내 띠(`#netguard`) |
| `edge/daeum-ai/index.ts` | Supabase Edge Function 소스(Claude API 호출, 키는 서버 비밀). 배포: 닿음 전용 프로젝트 daeum(7c5296b). 보내기 전 `redact.ts`가 전화·주민번호·이메일·계좌·주소·이름을 표식으로 가리고 응답 `redacted` 건수를 화면이 «개인정보 N건을 가린 뒤 AI에 보냈어요»로 띄운다(시험 `node shared/edge/daeum-ai/redact.test.mjs`) |

## AI 모드
- 함수 형식은 하나: POST `{situation, proxy, profile, services[{id,name,target,support}]}` → `{summary, picks[{id,reason}]}`. 허용 출처 github.io·localhost:8000·127.0.0.1:8000(그 밖은 403 → 규칙 모드).
- 공무원 요약은 상담 기록을 `situation`(앞에 «[담당 공무원 상담 기록]»), 사전 지표·욕구를 `profile`로 보낸다. 쟁점·욕구·긴급은 화면 규칙 값을 쓰고 요약·연계 후보만 AI 답으로 바꾼다.
- `config.js`의 `aiEndpoint`가 비어 있으면 **규칙 기반 시연 모드**(`mode:"rules"`). 화면에 «AI 연결 전 시연 모드»를 표시한다.
- 채우면 Edge Function을 부르고, 돌아온 서비스 ID 중 **목록에 있는 것만** 남긴다. 실패하면 자동으로 규칙 모드로 돌아간다.
- 규칙: 각 서비스의 `rule` — `ageMin`·`ageMax`(본인 나이), `ageAlt`(이 태그가 있으면 나이 조건 면제), `all`(모두 필요), `any`(하나 이상), `boost`(가산), `childAgeMin`·`childAgeMax`(자녀 나이 하한·상한), `req`(이 중 하나는 꼭 — 장애·산모·한부모·치매 사업), `name`(이름 속 상황어 — 사용자 태그와 겹치면 +3), `core`(상황별 기본 서비스 가점), `base`(기본 서비스 가산점). 고정 카드(S5b-2 재검수): 생명 위기 낱말 → 109, 폭력 피해(`violence` 태그) → 1366, 생계 위기(끼니·쫓겨남, 또는 위기·갑자기+실직·폐업·수입·돈·월세) → 129. «막막·급하·당장»만이면 안내 띠만. AI 함수는 하루 IP별 20회·전체 200회 상한(`edge/daeum-ai/rate_limit.sql`, 넘으면 429 → 규칙 모드). 태그 목록은 `citizen/data/services.sample.json` `meta.tag_vocab`.

## 도움 요청 형식 (공무원 창구가 읽는다)
저장 위치: `localStorage["daeum.requests"]` = 아래 객체의 **JSON 배열**(오래된 것부터). 같은 브라우저의 다른 탭이 바꾸면 `storage` 이벤트가 온다 — `DaeumRequests.onChange(fn)`.

```json
{
  "v": 1,
  "id": "REQ-20261029-0001",
  "createdAt": "2026-10-29T08:12:00.000Z",
  "status": "new",
  "history": [{ "at": "…", "status": "new", "by": "citizen", "note": "" }],
  "region": "동면",
  "contactPref": "visit",
  "displayName": "김○○",
  "proxy": { "isProxy": true, "relation": "어머니" },
  "subject": { "age": 78, "ageBand": "70대", "tags": ["alone", "dementia", "senior"], "childAges": [] },
  "situation": "국민이 쓴 원문",
  "summary": "상황 요약(AI 또는 규칙)",
  "matched": [{ "id": "C002", "name": "노인맞춤돌봄서비스", "reason": "…" }],
  "urgent": false,
  "mode": "rules",
  "consent": { "agreed": true, "at": "…", "text": "동의 문구 원문" }
}
```

| 필드 | 값 |
|---|---|
| `status` | `new`(새 요청) · `seen`(확인) · `visiting`(방문 예정) · `done`(완료) · `cancelled`(국민이 취소). 바꿀 때 `DaeumRequests.setStatus(id, status, by, note)` → `history`에 쌓임 |
| `region` | `DAEUM_CONFIG.regions` 중 하나(상주시 24개 읍면동 — 적용 예시, 가구는 가상) |
| `contactPref` | `visit`(집으로 와 주세요) · `phone`(전화) · `center`(제가 행정복지센터로 갈게요) |
| `displayName` | 부르실 이름 — 시연은 가명. 실제 운영에서는 본인확인 뒤 연락처를 따로 받는다 |
| `subject.tags` | `ai.js` 상황 태그(`senior` `alone` `lowIncome` `unemployed` `working` `singleParent` `child` `infant` `pregnancy` `sick` `careNeed` `dementia` `disability` `housing` `energy` `debt` `crisis` `food` `mental`) |
| `urgent` | 위기·마음 건강 낱말이 있으면 `true` — 공무원 창구 명단에 +15점 |
| `demo` | 공무원 창구 «시연 요청 넣기»로 만든 가상 요청이면 `true`(선택) |

공무원 창구는 `cancelled`·`done`을 명단에서 빼고, 요청 행의 연계 후보를 저장하면 `new` → `seen`으로 바꾼다. 옛 필드(`area`·`who`·`matchedServiceIds`)는 S5에서 폐기했다.

⛔ 시연에는 실제 개인정보를 넣지 않는다. 화면에도 그렇게 안내한다.
