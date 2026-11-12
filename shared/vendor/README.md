# shared/vendor — 같은 출처로 내려 둔 외부 라이브러리 (S12-v U30 · 보안 점검표 5-5)

CDN이 파일을 바꿔치기해도 로그인 세션 토큰을 다루는 코드가 바뀌지 않게, 버전을 고정한 파일을 저장소에 둔다(CDN 의존·SRI 문제를 한 번에 해결).

| 파일 | 원본 | 버전 | sha384(base64) | 라이선스 |
|---|---|---|---|---|
| `xlsx-0.18.5.full.min.js` | https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js | 0.18.5 (2026-11-12 내려받음, 67회차) | sha512 `r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfuyQM4tIRAI062MaV8sfjQKYVGjOBaZBOA87z+IhZE9DA==`(코드의 SRI와 같음) | Apache-2.0 (SheetJS) |
| `supabase-js-2.45.4.min.js` | https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js | 2.45.4 (2026-11-12 내려받음) | `GFr3yTh5lJznCbZfpTtXnwboFsxqtTQoeTZCRHhE0579KrRmlCzen5AA8ohaB5ug` | MIT (Supabase) |

- 쓰는 곳: `shared/sync.js` 의 `LIB` 주소(줄1 P5에서 이 경로로 교체 — 이 줄에서는 손대지 않음). ⚠ 동적 `<script>` 의 상대 경로는 «문서» 기준이라(첫 화면 `/`·사무 화면 `/officer/`가 다름) `sync.js` 를 읽는 순간의 `document.currentScript.src` 기준으로 만든다: `var LIB = new URL("vendor/supabase-js-2.45.4.min.js", (document.currentScript || {}).src || location.href).href;` (`crossOrigin` 줄은 같은 출처라 있어도 무해).
- 손으로 고치지 않는다. 버전을 올릴 때는 새 이름으로 내려받고 위 표·해시를 바꾼 뒤 `node shared/s12v_line2.test.js` 로 해시를 확인한다.
