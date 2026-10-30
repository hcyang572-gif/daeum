// 닿음 AI — Supabase Edge Function (Deno). 배포처는 닿음 전용 프로젝트 daeum(ref gicjzrxgktpovnphtjhi) 한 곳뿐(10-29 A안).
// 배포: 임시 폴더에 supabase/functions/daeum-ai/{index.ts,redact.ts} 로 복사한 뒤 그 폴더에서
//       npx supabase functions deploy daeum-ai --project-ref gicjzrxgktpovnphtjhi --no-verify-jwt --use-api
//       supabase secrets set ANTHROPIC_API_KEY=...   (키는 서버 비밀에만. 화면 코드·저장소에 두지 않는다)
// 요청: POST { situation, proxy:{isProxy, relation}, profile, services:[{id,name,target,support}] }
// 응답: { summary, picks:[{ id, reason }], redacted:{phone:1,name:2…} }  — id 는 반드시 services 안의 것. 화면도 한 번 더 거른다.
// 개인정보 가림(S10l-①): situation·profile 은 외부 AI로 보내기 전에 redact.ts 로 전화·주민번호·이메일·계좌·주소·이름을 표식으로 바꾼다.

import { redactText, redactValue } from "./redact.ts";

const MODEL = "claude-sonnet-5-5";
const MAX_SITUATION = 1200;
// 비용 상한: 화면이 규칙으로 먼저 추린 후보만 받는다(400건 통째로 보내면 1회 약 9만 토큰 ≈ 270원, 60건이면 약 40원 — 추정)
const MAX_SERVICES = 60;
// 하루 호출 상한(S5b-2 케르 재검수 ③): Origin 은 위조할 수 있으므로 IP별·전체 하루 상한을 DB(rate_limit.sql)로 건다.
// 넘으면 429 → 화면은 자동으로 규칙 모드. 1회 ≈ 34원(추정) → 전체 200회/일 ≈ 6,800원/일 상한. 최후 방어선은 콘솔 월 한도 $20.
const DAILY_PER_IP = 20;
const DAILY_TOTAL = 200;
const ALLOW_ORIGINS = ["https://hcyang572-gif.github.io", "http://localhost:8000", "http://127.0.0.1:8000"];

const SYSTEM = `너는 복지 상담 창구의 안내자다. 사람이 자기(또는 가족의) 상황을 말하면, 함께 받은 «서비스 목록»에서 받을 수 있을 만한 것을 고른다.
규칙:
1. 반드시 목록에 있는 서비스만 고른다. 목록에 없는 서비스·금액·기준을 지어내지 않는다. 금액은 말하지 않는다.
2. 각 서비스마다 «왜 해당될 수 있는지»를 말한 사람의 말에 기대어 한 문장으로 쓴다(예: "82세이시고 혼자 지내신다고 하셔서").
3. 확실하지 않으면 "해당될 수 있어요"라고 쓰고, 소득·재산 조사가 필요한 서비스는 그렇다고 밝힌다.
4. 쉬운 말, 존댓말, 짧은 문장. 가르치는 말투·과장·감탄·이모지 금지.
5. 극단적 생각·위기 표현이 있으면 상담전화(109 등) 서비스를 맨 앞에 둔다.
6. 가족을 대신해 묻는 경우 그 가족을 주어로 쓴다(예: "어머님이 …").
7. 최대 8개. 관련이 큰 순서.
출력은 JSON 하나만: {"summary":"상황을 어떻게 이해했는지 두 문장 이내","picks":[{"id":"서비스ID","reason":"한 문장"}]}`;

function cors(origin: string | null) {
  const o = origin && ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" } });
}

async function ipHash(req: Request): Promise<string> {
  const ip = (req.headers.get("cf-connecting-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0] || "unknown").trim();
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("daeum:" + ip));
  return Array.from(new Uint8Array(d)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 상한 확인 + 1 증가(원자적, DB 함수 daeum_ai_hit). 확인 자체가 실패하면 AI를 부르지 않는다(비용 쪽으로 안전하게). */
async function rateOk(req: Request): Promise<{ ok: boolean; why?: string }> {
  const url = Deno.env.get("SUPABASE_URL"), sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !sk) return { ok: false, why: "limiter-env" };
  try {
    const r = await fetch(url + "/rest/v1/rpc/daeum_ai_hit", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: sk, Authorization: "Bearer " + sk },
      body: JSON.stringify({ p_ip: await ipHash(req), p_ip_limit: DAILY_PER_IP, p_total_limit: DAILY_TOTAL }),
    });
    if (!r.ok) return { ok: false, why: "limiter-" + r.status };
    const j = await r.json();
    return { ok: !!j.ok, why: j.why };
  } catch {
    return { ok: false, why: "limiter-error" };
  }
}

type Svc = { id: string; name: string; target?: string; support?: string };

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "POST만 받습니다" }, 405, origin);
  // 허용 목록 밖에서 온 호출은 AI 비용이 나가기 전에 막는다
  if (!origin || !ALLOW_ORIGINS.includes(origin)) return json({ error: "허용되지 않은 출처입니다" }, 403, origin);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "서버에 AI 키가 설정되지 않았습니다" }, 503, origin);

  let body: { situation?: string; proxy?: { isProxy?: boolean; relation?: string }; profile?: unknown; services?: Svc[] };
  try { body = await req.json(); } catch { return json({ error: "JSON 형식이 아닙니다" }, 400, origin); }

  const redacted: Record<string, number> = {};
  const situation = redactText(String(body.situation ?? "").slice(0, MAX_SITUATION).trim(), redacted);
  const profile = redactValue(body.profile ?? {}, redacted);
  const services = (Array.isArray(body.services) ? body.services : []).slice(0, MAX_SERVICES)
    .filter((s) => s && typeof s.id === "string" && typeof s.name === "string");
  if (!situation || !services.length) return json({ error: "상황 문장과 서비스 목록이 필요합니다" }, 400, origin);
  const rl = await rateOk(req);
  if (!rl.ok) return json({ error: "오늘 AI 안내 사용량을 넘었습니다(" + (rl.why || "") + ")" }, 429, origin);

  const ids = new Set(services.map((s) => s.id));
  const catalog = services.map((s) => `${s.id} | ${s.name} | 대상: ${(s.target ?? "").slice(0, 160)} | 내용: ${(s.support ?? "").slice(0, 120)}`).join("\n");
  const who = body.proxy?.isProxy ? `가족(${body.proxy.relation || "가족"})을 대신해 묻는 질문입니다.` : "본인의 질문입니다.";

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      // Sonnet 5.5는 생각이 기본으로 켜져 답이 잘린다(10-29 502) → 도구 없는 단순 선택이라 생각을 끈다
      max_tokens: 1600,
      thinking: { type: "between_tools" },
      system: SYSTEM,
      messages: [{ role: "user", content: `${who}\n\n[상황]\n${situation}\n\n[참고: 화면이 뽑은 조건]\n${JSON.stringify(profile)}\n\n[서비스 목록]\n${catalog}` }],
    }),
  });
  if (!r.ok) return json({ error: `AI 호출 실패 ${r.status}` }, 502, origin);
  const data = await r.json();
  const text: string = (data.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return json({ error: "AI 답을 해석하지 못했습니다" }, 502, origin);
  let out: { summary?: string; picks?: { id: string; reason: string }[] };
  try { out = JSON.parse(m[0]); } catch { return json({ error: "AI 답을 해석하지 못했습니다" }, 502, origin); }

  // 지어낸 서비스 차단: 목록에 있는 ID만 남긴다
  const picks = (out.picks ?? []).filter((p) => p && ids.has(p.id)).slice(0, 8)
    .map((p) => ({ id: p.id, reason: String(p.reason ?? "").slice(0, 200) }));
  return json({ summary: String(out.summary ?? "").slice(0, 400), picks, model: MODEL, usage: data.usage ?? null, redacted }, 200, origin);
});
