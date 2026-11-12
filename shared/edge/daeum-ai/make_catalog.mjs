/* 서버 정본 서비스 목록 만들기(S12-v 1-4 ③, ⚙️ 파로 11-12).
   실행: node shared/edge/daeum-ai/make_catalog.mjs   (03_시제품에서) → 같은 폴더 catalog.ts 를 다시 쓴다.
   data/services.json 이 바뀌면 다시 돌리고 daeum-ai 를 재배포한다(catalog.test.mjs 가 어긋남을 잡는다).
   함수는 화면이 보낸 서비스 «ID»만 받고, 이름·대상·내용은 이 정본에서 꺼낸다 — 화면이 보낸 글이 외부 AI로 가지 않게. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.join(here, "..", "..", "..", "data", "services.json");
const clip = (v, n) => { v = v == null ? "" : String(v); return v.length > n ? v.slice(0, n) : v; };

/** services.json → { id: [이름60, 대상160, 내용120] } (공공 서비스 공개 자료만 — 개인정보 없음) */
export function buildCatalog(json) {
  const out = {};
  for (const s of json.services || []) if (s && typeof s.id === "string" && s.name) out[s.id] = [clip(s.name, 60), clip(s.target, 160), clip(s.support, 120)];
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cat = buildCatalog(JSON.parse(fs.readFileSync(SRC, "utf8")));
  const body = "// 자동 생성 — 손으로 고치지 말 것. node shared/edge/daeum-ai/make_catalog.mjs (원본 data/services.json)\n" +
    "// 서버 정본 서비스 목록: id → [이름, 대상, 내용]. 함수는 화면이 보낸 ID만 받아 여기서 꺼낸다(S12-v 1-4 ③).\n" +
    "export const CATALOG: Record<string, [string, string, string]> = " + JSON.stringify(cat) + ";\n";
  fs.writeFileSync(path.join(here, "catalog.ts"), body);
  console.log("catalog.ts 서비스", Object.keys(cat).length, "건 ·", body.length, "바이트");
}
