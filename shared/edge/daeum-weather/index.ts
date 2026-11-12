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

// S12-v U28(4-3): IP 는 cf-connecting-ip 만 믿는다 — x-forwarded-for 첫 값은 호출자가 마음대로 적을 수 있어 IP별 상한 우회에 쓰였다.
//   cf-connecting-ip 가 없으면 하나의 공용 칸("no-cf")으로 센다(헤더 위조로 새 칸을 못 만듦). 그 칸은 IP별 상한 대신 전체 상한만 받는다
//   (모든 사용자가 한 칸에 모이므로 IP 상한을 걸면 정상 사용자가 막힘). DAEUM_IP_STRICT=1 이면 없을 때 거절.
//   ipSrc("cf"|"none")를 응답에 실어 배포 뒤 실제 헤더가 오는지 확인한다(IP 원문·해시는 내보내지 않음).
function envInt(name: string, d: number): number { const v = parseInt(Deno.env.get(name) || "", 10); return Number.isFinite(v) && v > 0 ? v : d; }
function clientIp(req: Request): { ip: string | null; src: "cf" | "none" } {
  const ip = (req.headers.get("cf-connecting-ip") || "").trim();
  if (ip) return { ip, src: "cf" };
  return { ip: Deno.env.get("DAEUM_IP_STRICT") === "1" ? null : "no-cf", src: "none" };
}
async function ipHash(ip: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("daeum:" + ip));
  return Array.from(new Uint8Array(d)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}
// S12-v U27: 날씨 호출 상한 — 캐시를 비켜 기상청까지 가는 호출만 센다(db/migration_s12v_hardening.sql daeum_kind_hit, 표 daeum_ai_usage 의 'wx:' 줄).
//   기상청 개발 계정 하루 한도(일 10,000건, 한 번에 2~3건 소모) 보호. 상한 DB 가 아직 없거나 실패하면 «열어 둔다»(무료 자료라 가용성 우선).
const WX_PER_IP = envInt("DAEUM_WX_PER_IP", 200), WX_TOTAL = envInt("DAEUM_WX_TOTAL", 2000);
async function wxOk(req: Request): Promise<boolean> {
  const who = clientIp(req);
  if (!who.ip) return false;
  const url = Deno.env.get("SUPABASE_URL"), sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !sk) return true;
  try {
    const r = await fetch(url + "/rest/v1/rpc/daeum_kind_hit", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: sk, Authorization: "Bearer " + sk },
      body: JSON.stringify({ p_kind: "wx", p_ip: await ipHash(who.ip), p_n: 1, p_ip_limit: who.src === "cf" ? WX_PER_IP : WX_TOTAL, p_total_limit: WX_TOTAL }),
    });
    if (!r.ok) return true;
    const j = await r.json();
    return j.ok !== false;
  } catch {
    return true;
  }
}

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
  if (!(await wxOk(req))) return json({ error: "오늘 날씨 조회 한도에 닿았습니다", code: "limit" }, 429, origin);
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
