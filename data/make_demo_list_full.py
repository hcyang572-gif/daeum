#!/usr/bin/env python
"""시연용 가상 발굴 명단(확장판) — 한국사회보장정보원 «복지사각지대 발굴대상자 조회» 엑셀 서식 그대로 → data/demo_list_full.xlsx + .json
S12-i 준비(⚙️ 파로, 2026-11-12). 기존 data/demo_list.xlsx(9가구)는 그대로 두고, 같은 서식·같은 규칙으로 가구 수만 늘린 판.

- 서식 원본: 00_원본/복지사각지대 발굴대상자 조회(서식).xlsx (⛔ 수정 금지) — 그 파일을 열어 3행부터 채워 «다른 이름으로» 저장한다.
  1행 제목(병합)·2행 머리글·시트 이름·열 순서·열 너비·글꼴은 원본 그대로.
- ⛔ 실제 주민 0명. 가구는 data/households.json 의 가상 가구.
  · 발굴우선순위 1~9 = 앱 시연 9가구(officer/demo_seed.js L9 · data/tools/make_demo_list.py PICK)와 같은 가구·같은 값.
  · 10번부터 = 나머지 가상 가구 중 위기 신호가 있는 집을 시드 고정(random.Random(20261112))으로 골라 읍면별로 섞는다.
  · 성명 «가상NN», 주민등록번호 앞 6자리+성별 1자리 외 «******», 전화 054-000-NNNN·휴대폰 010-0000-NNNN(가짜 번호대), 우편번호 «37***».
  · 주소 «경상북도 상주시 <읍면> 가상리 <가구번호 숫자>» — 가상 지명이다. 화면(officer/import_list.js addrKey)이 이 주소로 가상 가구 위치를 찾는다(둘을 함께 바꾼다).
- 처리여부·AI초기상담·최종지원실적·비대상사유 값은 모두 가상(규칙+시드로 만든 값).
쓰는 법: python data/make_demo_list_full.py   (03_시제품 에서, openpyxl 필요) — 몇 번을 돌려도 같은 파일이 나온다.
"""
import copy, json, os, random
from openpyxl import load_workbook

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, ".."))
TEMPLATE = os.path.normpath(os.path.join(ROOT, "..", "00_원본", "복지사각지대 발굴대상자 조회(서식).xlsx"))
OUT_X = os.path.join(ROOT, "data", "demo_list_full.xlsx")
OUT_J = os.path.join(ROOT, "data", "demo_list_full.json")

YM = "2026-10"                 # 차수 1개(기존 시연 명단과 같은 차수)
REF_YEAR = 2026
N_TARGET = 48                  # 발굴대상 45 + 비대상 3
N_NONTARGET = 3
SEED = 20261112

# 앱 시연 9가구 — demo_seed.js L9 와 같은 순서·같은 값(바꾸면 그쪽도 함께)
PICK9 = ["A-009", "Q-033", "P-026", "P-033", "P-013", "B-015", "A-056", "B-059", "A-086"]

D = json.load(open(os.path.join(ROOT, "data", "households.json"), encoding="utf-8"))
NAME = {i["key"]: i["name"] for i in D["indicators"]}
BY = {h["id"]: h for h in D["households"]}
rng = random.Random(SEED)


def hits(h):
    return [k for k, v in h["indicators"].items() if v is True or (isinstance(v, (int, float)) and not isinstance(v, bool) and v > 0)]


def num(hid):
    return int(hid.split("-")[1])


def rrn(h, i):
    age = h["members"][0]["age"]
    yy = (REF_YEAR - age - 1) % 100
    mm = (i * 5) % 12 + 1
    dd = (i * 7) % 28 + 1
    sex = 1 if i % 2 == 0 else 2
    return "%02d%02d%02d-%d******" % (yy, mm, dd, sex)


def base_row(h, i, rank):
    """make_demo_list.py 와 같은 규칙으로 기본 열을 채운다(i = 0부터 줄 번호)."""
    hid = h["id"]
    age = h["members"][0]["age"]
    lonely = h["single"] and age >= 75
    child = any(m.get("role") == "자녀" and m.get("age", 99) < 18 for m in h["members"])
    recip = h.get("status") == "기초생활 수급"
    addr = "경상북도 상주시 %s 가상리 %d" % (h["area"], num(hid))
    hs = hits(h)
    return {
        "발굴년월": YM,
        "소재행정동": h["area"],
        "발굴우선순위": rank,
        "대상구분": "발굴대상",
        "성명": "가상%02d" % (i + 1),
        "주민등록번호": rrn(h, i),
        "발굴변수변동내역": "·".join(NAME[k] for k in hs),
        "발굴횟수": 3 if h["indicators"].get("health_ins_arrears", 0) >= 6 else (2 if len(hs) >= 2 else 1),
        "처리여부": "미처리",
        "이동전화번호요청상태": "요청완료",
        "(행복이음)주소": addr,
        "(행복이음)우편번호": "37***",
        "(행복이음)전화번호": "054-000-%04d" % (1000 + i),
        "(행복이음)휴대폰번호": "010-0000-%04d" % (2000 + i),
        "(행안부)주소": addr,
        "(행안부)연락처": "010-0000-%04d" % (2000 + i),
        "담당자": "○○○(가상)",
        "AI초기상담요청상태": "미요청",
        "기초생계급여": "Y" if recip else None,
        "기초의료급여": "Y" if recip else None,
        "기초주거급여": "Y" if recip else None,
        "차상위계층확인": "Y" if h.get("status") == "차상위" else None,
        "기초연금": "Y" if age >= 65 else None,
        "장애인연금": "Y" if h.get("disability") else None,
        "우선방문대상자_e아동": "Y" if child else None,
        "우선방문대상자_고독사": "Y" if lonely else None,
    }


# ── 1~9: 앱 시연 9가구(기존 demo_list.xlsx 와 같은 값) ──
rows, ids = [], []
for i, hid in enumerate(PICK9):
    h = BY[hid]
    v = base_row(h, i, i + 1)
    if hid in ("A-056", "B-015"):
        v["기초연금"] = None
    v["차상위계층확인"] = None  # 기존 시연본(9가구)에 없던 값 — 앱이 읽는 열은 기존과 똑같이
    if i in (2, 5):
        v.update({"처리여부": "처리중", "최초처리일자": "2026-10-28", "최초처리구분": "전화상담", "최초처리상태": "부재" if i == 2 else "상담완료"})
    if i in (1, 4):
        v.update({"AI초기상담요청일시": "2026-10-27 10:00", "AI초기상담요청상태": "완료",
                  "AI초기상담상담결과": "통화 연결 안 됨(가상)" if i == 1 else "도움 필요 응답(가상)"})
    rows.append(v)
    ids.append(hid)

# ── 10번부터: 위기 신호가 있는 나머지 가상 가구를 시드 고정으로 고른다(읍면 고루) ──
pool = [h for h in D["households"] if h["id"] not in PICK9 and hits(h)]
by_area = {}
for h in sorted(pool, key=lambda x: x["id"]):
    by_area.setdefault(h["area"], []).append(h)
for a in by_area:
    rng.shuffle(by_area[a])
areas = sorted(by_area)
need = N_TARGET - len(PICK9)
extra, k = [], 0
while len(extra) < need:
    a = areas[k % len(areas)]
    if by_area[a]:
        extra.append(by_area[a].pop())
    k += 1
# 위기 신호 무게가 큰 집이 앞 순위에 오게(정보원 순위 흉내) — 비대상 3가구는 맨 뒤
W = {i["key"]: i["weight"] for i in D["indicators"]}
def wsum(h):
    return sum(W[x] for x in hits(h)) + (10 if h["single"] and h["members"][0]["age"] >= 75 else 0) + rng.random()
extra.sort(key=wsum, reverse=True)

PROC_KIND = ["전화상담", "방문상담", "전화상담", "방문상담", "문자안내"]
PROC_STATE_DOING = ["부재", "상담완료", "재방문 예정", "부재", "상담완료"]
SUPPORT = ["기초연금 신청 연계(가상)", "긴급복지 생계지원 연계(가상)", "노인맞춤돌봄서비스 연계(가상)", "에너지바우처 안내(가상)",
           "주거급여 신청 연계(가상)", "푸드뱅크 연계(가상)", "민간 후원 연계(가상)"]
AI_RES = ["통화 연결 안 됨(가상)", "도움 필요 응답(가상)", "도움 불필요 응답(가상)", "통화 연결 안 됨(가상)", "상담원 연결 희망(가상)"]
NONT = [("기존 수급자", "기초생활 수급 중(가상)", "이미 맞춤형 급여 지원 중(가상)"),
        ("전출", "관외 전출(가상)", "타 시군 전출 확인(가상)"),
        ("연락 거부", "본인 지원 거부(가상)", "지원 의사 없음 확인·3개월 뒤 재확인(가상)")]

for j, h in enumerate(extra):
    i = len(PICK9) + j
    rank = i + 1
    v = base_row(h, i, rank)
    # 발굴횟수: 기본 규칙에 시드로 반복 발굴을 섞는다(1~4회)
    if rng.random() < 0.18:
        v["발굴횟수"] = min(4, v["발굴횟수"] + rng.choice([1, 2]))
    r = rng.random()
    day = 26 + rng.randint(0, 5)
    if r < 0.55:
        pass  # 미처리
    elif r < 0.82:
        v.update({"처리여부": "처리중", "최초처리일자": "2026-10-%02d" % day, "최초처리구분": rng.choice(PROC_KIND), "최초처리상태": rng.choice(PROC_STATE_DOING)})
    else:
        v.update({"처리여부": "처리완료", "최초처리일자": "2026-10-%02d" % day, "최초처리구분": rng.choice(["방문상담", "전화상담"]),
                  "최초처리상태": "상담완료", "최종지원실적": rng.choice(SUPPORT)})
    a = rng.random()
    if a < 0.22:
        v.update({"AI초기상담요청일시": "2026-10-%02d %02d:00" % (rng.randint(24, 28), rng.choice([10, 11, 14, 15])), "AI초기상담요청상태": "완료", "AI초기상담상담결과": rng.choice(AI_RES)})
    elif a < 0.30:
        v.update({"AI초기상담요청일시": "2026-10-30 10:00", "AI초기상담요청상태": "요청"})
    if rng.random() < 0.06:
        v["긴급복지"] = "Y"
    if j >= len(extra) - N_NONTARGET:      # 맨 뒤 3가구 = 비대상
        reason = NONT[j - (len(extra) - N_NONTARGET)]
        v.update({"대상구분": "비대상", "비대상사유": reason[0], "비대상사유상세": reason[1], "비대상상세내용": reason[2],
                  "처리여부": "처리완료", "최초처리일자": "2026-10-29", "최초처리구분": "전화상담", "최초처리상태": "상담완료"})
        v.pop("최종지원실적", None)
    rows.append(v)
    ids.append(h["id"])

# ── 서식에 채우기(원본은 읽기만, 다른 이름으로 저장) ──
wb = load_workbook(TEMPLATE)
ws = wb.active
head = [c.value for c in ws[2]]
col = {name: n + 1 for n, name in enumerate(head)}
assert head[0] == "발굴년월" and head[-1] == "우선방문대상자_고독사", "서식 머리글이 예상과 다름"
border = copy.copy(ws.cell(row=2, column=1).border)
for i, v in enumerate(rows):
    for key, val in v.items():
        assert key in col, key
    for name, c in col.items():
        cell = ws.cell(row=3 + i, column=c, value=v.get(name))
        cell.border = border
wb.save(OUT_X)

# ── 같은 내용 JSON(시안이 엑셀 없이 읽게) — 열 순서 그대로, 빈 칸은 "" ──
out = {
    "meta": {"title": ws["A1"].value, "sheet": ws.title, "round": YM, "rows": len(rows),
             "source": "가상 시연 데이터 — data/make_demo_list_full.py 로 생성(시드 %d). 실제 주민 정보 없음." % SEED,
             "template": "00_원본/복지사각지대 발굴대상자 조회(서식).xlsx"},
    "columns": head,
    "rows": [[("" if v.get(name) is None else v.get(name)) for name in head] for v in rows],
    "householdIds": ids,
}
with open(OUT_J, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
# S12-i1: 앱 기본 탑재용 .js 사본(브라우저가 fetch 없이 읽게 — 공무원 앱 첫 화면 48가구)
with open(OUT_J[:-5] + ".js", "w", encoding="utf-8") as f:
    f.write("/* 자동 생성 — data/make_demo_list_full.py. 같은 이름 .json 과 같은 내용입니다(가상 48가구). 손으로 고치지 마세요. */
")
    f.write("window.__DAEUM_DEMO_LIST__ = " + json.dumps(out, ensure_ascii=False) + ";
")
print("demo_list_full:", len(rows), "줄 →", OUT_X)
