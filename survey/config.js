/* 닿음 현장 확인 설문 설정 — 공개 정적 배포라 누구나 보인다.
   여기에는 «공개용(publishable) 키»만 둔다. 이 키로는 field_survey 에 «넣기»만 되고 읽기는 막혀 있다(RLS·GRANT, 01_리서치/현장설문/migration_field_survey.sql).
   ⛔ service_role·secret 키는 절대 여기 두지 않는다(조회는 01_리서치/현장설문/read_survey.js + .env). */
window.SURVEY_CONFIG = {
  url: "https://gicjzrxgktpovnphtjhi.supabase.co",
  key: "sb_publishable_Gh5BZa8H-8YP4cLT3fW2-g_l0Bqn7ZR",
  table: "field_survey",
  formVersion: "v3",          // v3(10-30): 닿음 소개·왜 묻나요·기능 판단(answers.feat). v2: 한 화면 한 문항. 집계 때 form_version 으로 구분
  tokenKey: "daeum_field_survey_token",
  doneKey: "daeum_field_survey_done",
  draftKey: "daeum_field_survey_draft"   // 카톡 창이 닫혀도 이어서 답하도록 기기에만 임시 저장(제출하면 지움)
};
