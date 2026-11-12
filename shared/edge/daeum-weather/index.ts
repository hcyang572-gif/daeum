// 닿음 오늘 날씨 띠(S12-t) — Supabase Edge Function (Deno). 배포처: 닿음 전용 프로젝트 daeum(ref gicjzrxgktpovnphtjhi) 한 곳뿐.
// ⛔ 상주 정책플랫폼 프로젝트에 배포 금지.
// 배포: npx supabase functions deploy daeum-weather --project-ref gicjzrxgktpovnphtjhi --no-verify-jwt --use-api
// 비밀: KMA_SERVICE_KEY(공공데이터포털 일반 인증키, Decoding 값) — npx supabase secrets set --env-file <임시파일> --project-ref …
//       키는 서버 비밀에만. 화면 코드·저장소·로그에 두지 않는다.
// 자료: 기상청 단기예보 조회서비스(data.go.kr 15084084) 초단기실황·초단기예보 + 기상특보 조회서비스(특보 현황).
// 요청: GET ?nx=81&ny=102  (기상청 격자, 상주시 둘레만 받음)
// 응답: { nx, ny, at:"YYYYMMDDHHmm", t, reh, rn1, pty, sky, wsd, warn:[이름], pre:[예비특보 이름], src:"기상청" }
// 개인정보 0 — 격자 번호만 받고, 가구·주소는 받지 않는다. 결과는 메모리에만 10분 보관(같은 격자 재호출 줄임).

const ALLOW_ORIGINS = ["https://hcyang572-gif.github.io", "http://localhost:8000", "http://127.0.0.1:8000"];
const BASE = "https://apis.data.go.kr/1360000";
const TTL = 10 * 60 * 1000, WARN_TTL = 30 * 60 * 1000;
const cache = new Map<string, { exp: number; v: unknown }>();

function cors(origin: string | null) {
  const o = origin && ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0];
  return { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Vary": "Origin" };
}
function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "max-age=300" } });
}
/** 한국 시각 기준 «mins분 전»의 날짜·시각 */
function kst(minsAgo: number) {
  const d = new Date(Date.now() + 9 * 3600e3 - minsAgo * 60e3), p = (n: number) => String(n).padStart(2, "0");
  return { date: d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()), hh: p(d.getUTCHours()) };
}
async function kma(path: string, q: Record<string, string>, key: string) {
  const u = new URL(BASE + path);
  Object.entries({ serviceKey: key, pageNo: "1", numOfRows: "60", dataType: "JSON", ...q }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u.toString(), { signal: AbortSignal.timeout(7000) });
  const j: any = await r.json().catch(() => null);
  if (!j || j.response?.header?.resultCode !== "00") throw new Error("kma-" + (j?.response?.header?.resultCode || r.status));
  const it = j.response.body?.items?.item;
  return Array.isArray(it) ? it : it ? [it] : [];
}
/** 특보 현황 글(t6 발효·t7 예비)에서 상주(또는 경상북도 전역)에 걸린 특보 이름만 */
export function warnsFor(text: string, place = "상주"): string[] {
  const out: string[] = [];
  String(text || "").split(/\r?\n/).forEach((ln) => {
    const m = ln.match(/o\s*([^:：]+?)\s*[:：]\s*(.+)$/); if (!m) return;
    const name = m[1].replace(/\s+/g, ""), where = m[2];
    if (where.indexOf(place) >= 0 || /경상북도(?!\s*\()/.test(where)) if (out.indexOf(name) < 0) out.push(name);
  });
  return out;
}
async function warnings(key: string) {
  const c = cache.get("warn"); if (c && c.exp > Date.now()) return c.v as { warn: string[]; pre: string[] };
  let v = { warn: [] as string[], pre: [] as string[] };
  try {
    const it = (await kma("/WthrWrnInfoService/getPwnStatus", { numOfRows: "10" }, key))[0] || {};
    v = { warn: warnsFor(it.t6), pre: warnsFor(it.t7) };
  } catch { /* 특보는 없어도 띠는 낸다 */ }
  cache.set("warn", { exp: Date.now() + WARN_TTL, v });
  return v;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "GET") return json({ error: "GET만 받습니다" }, 405, origin);
  if (!origin || !ALLOW_ORIGINS.includes(origin)) return json({ error: "허용되지 않은 출처입니다" }, 403, origin);
  const key = Deno.env.get("KMA_SERVICE_KEY");
  if (!key) return json({ error: "날씨 키가 아직 서버에 없습니다", code: "no-key" }, 503, origin);

  const q = new URL(req.url).searchParams, nx = +(q.get("nx") || 0), ny = +(q.get("ny") || 0);
  if (!Number.isInteger(nx) || !Number.isInteger(ny) || nx < 70 || nx > 95 || ny < 90 || ny > 115) return json({ error: "상주시 둘레 격자만 받습니다" }, 400, origin);

  const ck = nx + "," + ny, hit = cache.get(ck);
  if (hit && hit.exp > Date.now()) return json(hit.v, 200, origin);
  try {
    const n = kst(40), f = kst(45); // 실황은 매시 40분 뒤, 초단기예보는 매시 45분 뒤 올라온다
    const [obs, fc, w] = await Promise.all([
      kma("/VilageFcstInfoService_2.0/getUltraSrtNcst", { base_date: n.date, base_time: n.hh + "00", nx: String(nx), ny: String(ny) }, key),
      kma("/VilageFcstInfoService_2.0/getUltraSrtFcst", { base_date: f.date, base_time: f.hh + "30", nx: String(nx), ny: String(ny) }, key).catch(() => []),
      warnings(key),
    ]);
    const o: Record<string, string> = {}; obs.forEach((x: any) => { o[x.category] = x.obsrValue; });
    if (o.T1H === undefined) throw new Error("kma-empty");
    const sk = fc.filter((x: any) => x.category === "SKY").sort((a: any, b: any) => (a.fcstDate + a.fcstTime).localeCompare(b.fcstDate + b.fcstTime))[0];
    const num = (s: string | undefined) => (s === undefined || isNaN(+s) ? null : +s);
    const v = { nx, ny, at: (obs[0]?.baseDate || n.date) + (obs[0]?.baseTime || n.hh + "00"), t: num(o.T1H), reh: num(o.REH), rn1: num(o.RN1), pty: num(o.PTY), sky: sk ? num(sk.fcstValue) : null, wsd: num(o.WSD), warn: w.warn, pre: w.pre, src: "기상청" };
    cache.set(ck, { exp: Date.now() + TTL, v });
    return json(v, 200, origin);
  } catch (e) {
    return json({ error: "날씨를 받지 못했습니다", code: String((e as Error).message || e).slice(0, 40) }, 502, origin);
  }
});
