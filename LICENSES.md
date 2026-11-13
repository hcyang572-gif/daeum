# 닿음 시제품 — 외부 자원 출처 대장

| 자원 | 쓰는 곳 | 라이선스 | 출처 |
|---|---|---|---|
| Pretendard | `shared/tokens.css` | SIL OFL 1.1(상업 이용 가능) | https://github.com/orioncactus/pretendard |
| Manrope | `shared/tokens.css`·`officer/s11.css` | SIL OFL 1.1 | https://fonts.google.com/specimen/Manrope |
| IBM Plex Sans KR | `officer/s11.css` | SIL OFL 1.1 | https://fonts.google.com/specimen/IBM+Plex+Sans+KR |
| SUIT Variable 2.0.5 | 닿음 랜딩 apps/daeum/(`APP-LANDING/daeum/_work/template.html`, jsDelivr) | SIL OFL 1.1(상업 이용 가능) | https://github.com/sun-typeface/SUIT |
| Noto Sans KR · Space Grotesk | `_design/S12-h_전면재설계/index.html`(시안, Google Fonts) | SIL OFL 1.1(상업 이용 가능) | https://fonts.google.com/specimen/Noto+Sans+KR · https://fonts.google.com/specimen/Space+Grotesk |
| Noto Sans KR(Windows 내장 가변 글꼴) | `04_발표/그림_S12-91/` 그림 표지·구성도 글자(91회차 서식4 그림) | SIL OFL 1.1(상업 이용 가능) | https://fonts.google.com/specimen/Noto+Sans+KR |
| 네이버 지도 화면(앱 캡처 속 지도 타일) | `04_발표/그림_S12-91/그림1·그림3`(라이브 앱 실제 화면 캡처, «NAVER» 표기 그대로 둠) | 네이버 지도 API 이용약관(앱 화면 표시 그대로, 지도 단독 재가공 없음) | https://www.ncloud.com/product/applicationService/maps |
| supabase-js 2.45.4 | `shared/vendor/supabase-js-2.45.4.min.js`(같은 출처로 내려받아 둠, `shared/sync.js`가 읽음 · S12-v U30) | MIT License | https://github.com/supabase/supabase-js · 해시는 `shared/vendor/README.md` |
| SheetJS(xlsx) 0.18.5 | `shared/vendor/xlsx-0.18.5.full.min.js`(명단 엑셀 읽기, `officer/import_list.js`가 먼저 읽고 안 되면 cdnjs · 67회차) | Apache License 2.0 | https://github.com/SheetJS/sheetjs · 해시는 `shared/vendor/README.md` |
| «딩동» 알림음 | `officer/s11d2.js` | 직접 합성(Web Audio) | 외부 음원 없음 |
| 아이콘 | 전 화면 | 직접 그린 SVG | 외부 아이콘 없음 |
| 데이터 출처 아이콘 `data-source.svg` | `shared/icons/data-source.svg`·`shared/datasrc.css`(`.src-ico`) | **자체 제작 SVG**(2026-11-12, 미르) — 겹친 명단 시트 모양, 특정 기관 CI·로고와 무관 | 외부 소스 없음 · 기관 로고 대신 «아이콘+기관명 글자»로 표기(케르⚖️ CI 반려, `01_리서치/S12-i_선결조건.md`) |
| 앱 아이콘(«찾아가는 길») | `shared/icons/` icon-192·icon-512·icon-maskable-512·apple-touch-icon·daeum.svg·daeum-maskable.svg | **AI 생성 이미지** — Higgsfield `gpt_image_2`(2026-11-12, 시안 1k medium job `60810b33…` → 확정 2k high job `08e9e502-34c1-4c1f-a8bf-c1a677984330`), 크기·모서리 가공만 함 | 유료 플랜 생성물, Higgsfield 이용약관 따름 · 독점·상표 주장 안 함 · 케르⚖️ 조건부 승인 `af07805` |
| 닿음 QR 2장(랜딩·앱) | `04_발표/QR_S12-90/` daeum_qr_landing·daeum_qr_app (.png 1600px·.svg, 생성 `make_qr.py`) | **자체 제작**(2026-11-13, 미르) — QR 행렬 segno(BSD-3), 가운데는 위 앱 아이콘 재사용, 꼬리말 서체 Pretendard(SIL OFL 1.1, PNG에 렌더) | 외부 이미지 없음 · «QR Code»는 DENSO WAVE 등록상표(규격 자체는 무상 이용) |

- 서체는 CDN에서 불러오므로 방문자 IP가 CDN 제공자에 전달된다(일반 웹 서체 사용과 같음). 도입 단계에서 서체 자체 호스팅 검토.
- 시연 데이터의 인물·주소(«가상리» 등)는 모두 가상이다.
