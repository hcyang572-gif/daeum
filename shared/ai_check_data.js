/* 자동 생성 — node shared/ai_check_build.js (손으로 고치지 말 것). 원자료: 01_리서치/AI정확도_측정도구 · 측정 2026-10-30 */
window.DaeumAICheckData = {
 "meta": {
  "measured": "2026-10-30",
  "doc": "AI추천_정확도_측정.md §7-3",
  "gold": "796286d",
  "model": "Claude Sonnet 5.5(claude-sonnet-5-5)",
  "catalog": 369,
  "catalogSrc": [
   {
    "name": "한국사회보장정보원_중앙부처복지서비스",
    "no": "15090532",
    "called": "2026-10-30"
   },
   {
    "name": "한국사회보장정보원_지자체복지서비스",
    "no": "15108347",
    "called": "2026-10-30"
   }
  ],
  "sent": 50,
  "tokIn": 8068,
  "tokOut": 808,
  "sentHit": {
   "before": [
    140,
    235
   ],
   "after": [
    151,
    235
   ]
  }
 },
 "ai": {
  "n": 20,
  "hit1": 19,
  "hit3": 20,
  "ok3": 55,
  "n3": 60,
  "dropped": 0,
  "p1": 95,
  "p3": 100,
  "pOk": 91.7
 },
 "rules": {
  "n": 20,
  "hit1": 14,
  "hit3": 17,
  "ok3": 34,
  "n3": 60,
  "p1": 70,
  "p3": 85,
  "pOk": 56.7
 },
 "kinds": [
  {
   "kind": "일반",
   "ai": {
    "n": 10,
    "hit1": 10,
    "hit3": 10,
    "ok3": 28,
    "n3": 30
   },
   "rules": {
    "n": 10,
    "hit1": 6,
    "hit3": 9,
    "ok3": 16,
    "n3": 30
   }
  },
  {
   "kind": "위기",
   "ai": {
    "n": 5,
    "hit1": 4,
    "hit3": 5,
    "ok3": 13,
    "n3": 15
   },
   "rules": {
    "n": 5,
    "hit1": 4,
    "hit3": 4,
    "ok3": 8,
    "n3": 15
   }
  },
  {
   "kind": "대리",
   "ai": {
    "n": 5,
    "hit1": 5,
    "hit3": 5,
    "ok3": 14,
    "n3": 15
   },
   "rules": {
    "n": 5,
    "hit1": 4,
    "hit3": 4,
    "ok3": 10,
    "n3": 15
   }
  }
 ],
 "wrong": [
  {
   "id": "G4",
   "kind": "일반",
   "text": "아내가 치매 진단을 받았어요. 제가 75살인데 혼자 돌보기가 너무 힘듭니다.",
   "rank": 3,
   "name": "노인장기요양보험 복지용구 급여",
   "why": "직접 요구 아님 — 정답표에 없음"
  },
  {
   "id": "G5",
   "kind": "일반",
   "text": "장애가 있는 서른 살 아들과 둘이 사는데 아들이 일할 곳을 찾고 싶어요. 저는 60대예요.",
   "rank": 3,
   "name": "직업능력개발운영(훈련수당)",
   "why": "장애인 특화 서비스가 아님"
  },
  {
   "id": "C1",
   "kind": "위기",
   "text": "요즘 너무 힘들어서 죽고 싶다는 생각이 들어요. 일도 없고 돈도 없어요.",
   "rank": 1,
   "name": "가족전용상담전화",
   "why": "정답표에 없음 · 화면 첫 줄은 규칙이 고정한 109 상담전화"
  },
  {
   "id": "C5",
   "kind": "위기",
   "text": "남편이 갑자기 세상을 떠났는데 장례 치를 돈도 없어요. 아이가 둘 있어요.",
   "rank": 3,
   "name": "긴급복지 교육지원",
   "why": "장례비 사연에 교육 지원 — 정답표에 없음"
  },
  {
   "id": "P3",
   "kind": "대리",
   "text": "동생이 발달장애가 있는데 부모님이 돌아가셔서 제가 돌봐야 해요. 낮에 동생이 갈 곳이 필요합니다.",
   "rank": 2,
   "name": "긴급돌봄 지원사업",
   "why": "정답표에 없음"
  }
 ],
 "rows": [
  {
   "id": "G1",
   "kind": "일반",
   "text": "82살이고 혼자 살아요. 무릎이 아파서 병원 다니기가 힘들고, 겨울에 난방비가 걱정이에요.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "에너지바우처",
      "ok": true
     },
     {
      "name": "노인 무릎인공관절 수술 지원 사업",
      "ok": true
     },
     {
      "name": "노인맞춤돌봄서비스",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 2,
    "n3": 3,
    "top3": [
     {
      "name": "독거노인·장애인 응급안전안심서비스",
      "ok": true
     },
     {
      "name": "에너지바우처",
      "ok": true
     },
     {
      "name": "긴급복지 연료비 및 전기요금",
      "ok": false
     }
    ]
   }
  },
  {
   "id": "G2",
   "kind": "일반",
   "text": "40대인데 지난달 회사에서 권고사직을 당했어요. 혼자 초등학생 아이 둘을 키우고 있어서 생활비가 막막합니다.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "국민취업지원제도",
      "ok": true
     },
     {
      "name": "한부모가족 아동양육비 지원",
      "ok": true
     },
     {
      "name": "생계급여(맞춤형 급여)",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "국민취업지원제도",
      "ok": true
     },
     {
      "name": "한부모가족 아동양육비 지원",
      "ok": true
     },
     {
      "name": "한부모가족자녀 교육비 지원",
      "ok": true
     }
    ]
   }
  },
  {
   "id": "G3",
   "kind": "일반",
   "text": "67세이고 농사를 짓는데 허리를 다쳐서 올해 농사를 못 짓게 생겼어요. 일손이 필요해요.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "영농도우미 지원",
      "ok": true
     },
     {
      "name": "농업인안전보험",
      "ok": true
     },
     {
      "name": "농업인 건강보험료 지원",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": false,
    "hit3": false,
    "ok3": 0,
    "n3": 3,
    "top3": [
     {
      "name": "노인맞춤돌봄서비스",
      "ok": false
     },
     {
      "name": "노인 개안수술비 지원",
      "ok": false
     },
     {
      "name": "노인장기요양보험 복지용구 급여",
      "ok": false
     }
    ]
   }
  },
  {
   "id": "G4",
   "kind": "일반",
   "text": "아내가 치매 진단을 받았어요. 제가 75살인데 혼자 돌보기가 너무 힘듭니다.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 2,
    "n3": 3,
    "top3": [
     {
      "name": "시설급여",
      "ok": true
     },
     {
      "name": "장기요양 본인부담금 감경",
      "ok": true
     },
     {
      "name": "노인장기요양보험 복지용구 급여",
      "ok": false
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 2,
    "n3": 3,
    "top3": [
     {
      "name": "노인맞춤돌봄서비스",
      "ok": true
     },
     {
      "name": "기초연금",
      "ok": true
     },
     {
      "name": "노인장기요양보험 복지용구 급여",
      "ok": false
     }
    ]
   }
  },
  {
   "id": "G5",
   "kind": "일반",
   "text": "장애가 있는 서른 살 아들과 둘이 사는데 아들이 일할 곳을 찾고 싶어요. 저는 60대예요.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 2,
    "n3": 3,
    "top3": [
     {
      "name": "장애인취업성공패키지",
      "ok": true
     },
     {
      "name": "장애인일자리지원",
      "ok": true
     },
     {
      "name": "직업능력개발운영(훈련수당)",
      "ok": false
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": false,
    "hit3": true,
    "ok3": 1,
    "n3": 3,
    "top3": [
     {
      "name": "장애인 차량용 보조기기 구입지원 사업",
      "ok": false
     },
     {
      "name": "발달장애인 직업훈련연계주택 운영 지원",
      "ok": true
     },
     {
      "name": "장애인 하이패스 감면단말기 보급 사업",
      "ok": false
     }
    ]
   }
  },
  {
   "id": "G6",
   "kind": "일반",
   "text": "혼자 사는 50대인데 월세가 석 달 밀려서 집주인이 나가 달라고 해요.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "긴급복지 주거지원",
      "ok": true
     },
     {
      "name": "주거급여(맞춤형 급여)",
      "ok": true
     },
     {
      "name": "희망복지지원단 통합사례관리",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "주거급여(맞춤형 급여)",
      "ok": true
     },
     {
      "name": "기존주택등 매입임대주택 지원사업",
      "ok": true
     },
     {
      "name": "긴급복지 주거지원",
      "ok": true
     }
    ]
   }
  },
  {
   "id": "G7",
   "kind": "일반",
   "text": "임신 7개월인데 남편 없이 혼자 아이를 낳아야 해서 걱정이에요. 20대입니다.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "위기임신 및 보호출산 지원",
      "ok": true
     },
     {
      "name": "청소년산모 임신·출산 의료비 지원",
      "ok": true
     },
     {
      "name": "고위험 임산부 의료비 지원",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 1,
    "n3": 3,
    "top3": [
     {
      "name": "한부모가족 아동양육비 지원",
      "ok": true
     },
     {
      "name": "한부모가족 중고교 입학자녀 교복비",
      "ok": false
     },
     {
      "name": "한부모가족자녀 교육비 지원",
      "ok": false
     }
    ]
   }
  },
  {
   "id": "G8",
   "kind": "일반",
   "text": "30대 자영업자인데 가게가 어려워서 카드빚이 쌓였고 독촉 전화가 계속 와요.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "서민금융진흥원 신용･부채관리 컨설팅",
      "ok": true
     },
     {
      "name": "개인회생 파산 종합지원(지원센터)",
      "ok": true
     },
     {
      "name": "햇살론119",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 2,
    "n3": 3,
    "top3": [
     {
      "name": "서민금융진흥원 신용･부채관리 컨설팅",
      "ok": true
     },
     {
      "name": "개인회생 파산 종합지원(지원센터)",
      "ok": true
     },
     {
      "name": "청소년특별지원",
      "ok": false
     }
    ]
   }
  },
  {
   "id": "G9",
   "kind": "일반",
   "text": "70세인데 손주 둘을 제가 키워요. 학교 다니는 아이들 교육비가 부담돼요.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "교육급여(맞춤형 급여)",
      "ok": true
     },
     {
      "name": "초중고 교육비 지원사업(고교학비 지원)",
      "ok": true
     },
     {
      "name": "방과후학교 자유수강권",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": false,
    "hit3": true,
    "ok3": 1,
    "n3": 3,
    "top3": [
     {
      "name": "노인맞춤돌봄서비스",
      "ok": false
     },
     {
      "name": "기초연금",
      "ok": true
     },
     {
      "name": "노인장기요양보험 복지용구 급여",
      "ok": false
     }
    ]
   }
  },
  {
   "id": "G10",
   "kind": "일반",
   "text": "68세인데 눈이 나빠져서 앞이 잘 안 보여요. 수술비가 걱정입니다.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "노인 개안수술비 지원",
      "ok": true
     },
     {
      "name": "재난적의료비 지원 사업",
      "ok": true
     },
     {
      "name": "기초연금",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": false,
    "hit3": true,
    "ok3": 1,
    "n3": 3,
    "top3": [
     {
      "name": "노인맞춤돌봄서비스",
      "ok": false
     },
     {
      "name": "노인 개안수술비 지원",
      "ok": true
     },
     {
      "name": "노인장기요양보험 복지용구 급여",
      "ok": false
     }
    ]
   }
  },
  {
   "id": "C1",
   "kind": "위기",
   "text": "요즘 너무 힘들어서 죽고 싶다는 생각이 들어요. 일도 없고 돈도 없어요.",
   "ai": {
    "hit1": false,
    "hit3": true,
    "ok3": 2,
    "n3": 3,
    "top3": [
     {
      "name": "가족전용상담전화",
      "ok": false
     },
     {
      "name": "정신건강 심리상담 바우처사업",
      "ok": true
     },
     {
      "name": "긴급복지 생계지원",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 2,
    "n3": 3,
    "top3": [
     {
      "name": "정신건강 심리상담 바우처사업",
      "ok": true
     },
     {
      "name": "일상돌봄 서비스 사업",
      "ok": false
     },
     {
      "name": "희망복지지원단 통합사례관리",
      "ok": true
     }
    ]
   }
  },
  {
   "id": "C2",
   "kind": "위기",
   "text": "남편이 술만 마시면 저를 때려요. 아이를 데리고 집을 나오고 싶어요.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "폭력피해자 주거지원 사업",
      "ok": true
     },
     {
      "name": "가정폭력·성폭력 등 폭력 피해자 무료법률지원",
      "ok": true
     },
     {
      "name": "가정폭력피해자 치료회복 프로그램 및 의료비지원",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "가정폭력·성폭력 등 폭력 피해자 무료법률지원",
      "ok": true
     },
     {
      "name": "폭력피해자 주거지원 사업",
      "ok": true
     },
     {
      "name": "가정폭력피해자 치료회복 프로그램 및 의료비지원",
      "ok": true
     }
    ]
   }
  },
  {
   "id": "C3",
   "kind": "위기",
   "text": "전기가 끊겼고 쌀도 떨어졌어요. 며칠째 제대로 못 먹었습니다.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "긴급복지 생계지원",
      "ok": true
     },
     {
      "name": "긴급복지 연료비 및 전기요금",
      "ok": true
     },
     {
      "name": "에너지바우처",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 2,
    "n3": 3,
    "top3": [
     {
      "name": "에너지바우처",
      "ok": true
     },
     {
      "name": "긴급복지 연료비 및 전기요금",
      "ok": true
     },
     {
      "name": "저소득층에너지효율개선",
      "ok": false
     }
    ]
   }
  },
  {
   "id": "C4",
   "kind": "위기",
   "text": "갑자기 큰 수술을 받게 됐는데 병원비 천만 원이 없어요. 집안 가장인데 일도 못하게 됐어요.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "긴급복지 의료지원",
      "ok": true
     },
     {
      "name": "재난적의료비 지원 사업",
      "ok": true
     },
     {
      "name": "긴급복지 생계지원",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 1,
    "n3": 3,
    "top3": [
     {
      "name": "긴급복지 의료지원",
      "ok": true
     },
     {
      "name": "노후긴급자금 대부사업",
      "ok": false
     },
     {
      "name": "긴급돌봄 지원사업",
      "ok": false
     }
    ]
   }
  },
  {
   "id": "C5",
   "kind": "위기",
   "text": "남편이 갑자기 세상을 떠났는데 장례 치를 돈도 없어요. 아이가 둘 있어요.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 2,
    "n3": 3,
    "top3": [
     {
      "name": "긴급복지 장제비지원",
      "ok": true
     },
     {
      "name": "긴급복지 생계지원",
      "ok": true
     },
     {
      "name": "긴급복지 교육지원",
      "ok": false
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": false,
    "hit3": false,
    "ok3": 0,
    "n3": 3,
    "top3": [
     {
      "name": "긴급복지 교육지원",
      "ok": false
     },
     {
      "name": "긴급복지 주거지원",
      "ok": false
     },
     {
      "name": "긴급복지 연료비 및 전기요금",
      "ok": false
     }
    ]
   }
  },
  {
   "id": "P1",
   "kind": "대리",
   "text": "어머니가 78세이신데 시골에서 혼자 지내세요. 요즘 자꾸 깜빡하시고, 기초연금은 받고 계신지 모르겠어요.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "치매검사비 지원",
      "ok": true
     },
     {
      "name": "기초연금",
      "ok": true
     },
     {
      "name": "독거노인·장애인 응급안전안심서비스",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "독거노인·장애인 응급안전안심서비스",
      "ok": true
     },
     {
      "name": "노인맞춤돌봄서비스",
      "ok": true
     },
     {
      "name": "기초연금",
      "ok": true
     }
    ]
   }
  },
  {
   "id": "P2",
   "kind": "대리",
   "text": "아버지(85세)가 화서면에 혼자 사시는데 거동이 불편해 병원 가기도 어려우세요. 저는 서울에 살아요.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "노인맞춤돌봄서비스",
      "ok": true
     },
     {
      "name": "독거노인·장애인 응급안전안심서비스",
      "ok": true
     },
     {
      "name": "노인장기요양보험 복지용구 급여",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "노인맞춤돌봄서비스",
      "ok": true
     },
     {
      "name": "독거노인·장애인 응급안전안심서비스",
      "ok": true
     },
     {
      "name": "노인장기요양보험 복지용구 급여",
      "ok": true
     }
    ]
   }
  },
  {
   "id": "P3",
   "kind": "대리",
   "text": "동생이 발달장애가 있는데 부모님이 돌아가셔서 제가 돌봐야 해요. 낮에 동생이 갈 곳이 필요합니다.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 2,
    "n3": 3,
    "top3": [
     {
      "name": "발달장애인 주간활동서비스",
      "ok": true
     },
     {
      "name": "긴급돌봄 지원사업",
      "ok": false
     },
     {
      "name": "발달장애인 긴급돌봄사업",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": false,
    "hit3": false,
    "ok3": 0,
    "n3": 3,
    "top3": [
     {
      "name": "아이돌봄서비스",
      "ok": false
     },
     {
      "name": "다함께 돌봄 사업",
      "ok": false
     },
     {
      "name": "가사·간병 방문 지원사업",
      "ok": false
     }
    ]
   }
  },
  {
   "id": "P4",
   "kind": "대리",
   "text": "옆집 할머니가 겨울인데 보일러를 안 때고 지내세요. 기름값이 없다고 하십니다.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "긴급복지 연료비 및 전기요금",
      "ok": true
     },
     {
      "name": "에너지바우처",
      "ok": true
     },
     {
      "name": "연탄쿠폰",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "에너지바우처",
      "ok": true
     },
     {
      "name": "긴급복지 연료비 및 전기요금",
      "ok": true
     },
     {
      "name": "노인맞춤돌봄서비스",
      "ok": true
     }
    ]
   }
  },
  {
   "id": "P5",
   "kind": "대리",
   "text": "고등학생 딸이 학교를 그만두고 방에만 있어요. 우울해 보여서 걱정이에요.",
   "ai": {
    "hit1": true,
    "hit3": true,
    "ok3": 3,
    "n3": 3,
    "top3": [
     {
      "name": "청소년상담1388 전화상담",
      "ok": true
     },
     {
      "name": "청소년상담1388 온라인상담",
      "ok": true
     },
     {
      "name": "지역사회 청소년통합지원체계(청소년안전망)",
      "ok": true
     }
    ],
    "dropped": 0
   },
   "rules": {
    "hit1": true,
    "hit3": true,
    "ok3": 1,
    "n3": 3,
    "top3": [
     {
      "name": "정신건강 심리상담 바우처사업",
      "ok": true
     },
     {
      "name": "교육복지우선지원사업",
      "ok": false
     },
     {
      "name": "발달재활서비스",
      "ok": false
     }
    ]
   }
  }
 ],
 "calib": [
  {
   "label": "보정 전 · 10-29",
   "hit1": 14,
   "n": 16,
   "ok3": 41,
   "n3": 48
  },
  {
   "label": "보정 후 · 10-30",
   "hit1": 15,
   "n": 16,
   "ok3": 44,
   "n3": 48
  }
 ]
};
