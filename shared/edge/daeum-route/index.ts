// 닿음 도로 경로 — Supabase Edge Function (Deno). 배포처: 닿음 전용 프로젝트 daeum(ref gicjzrxgktpovnphtjhi) 한 곳뿐.
// ⛔ 상주 정책플랫폼 프로젝트에 배포 금지.
// 배포: npx supabase functions deploy daeum-route --project-ref gicjzrxgktpovnphtjhi --no-verify-jwt
// 비밀: npx supabase secrets set NCP_MAP_KEY_ID=7brwn3eeig NCP_MAP_KEY=<NCP 콘솔 «인증 정보»의 Client Secret> --project-ref gicjzrxgktpovnphtjhi
//       (Client Secret 은 서버 비밀에만. 화면 코드·저장소·로그에 두지 않는다)
// 요청: POST { points:[[lng,lat], ...] }  — 첫 점 출발, 마지막 점 도착, 사이가 경유지(순서 그대로). 최대 32점.
// 응답: { legs:[{m,s}], m, s, path:[[lng,lat],...], calls }  — legs[i] = points[i] → points[i+1] 도로 거리(m)·시간(초)
// 네이버 Directions 15 는 경유지 순서를 바꿔 주지 않는다 → 순서 후보는 화면이 만들고, 여기서는 도로 거리·시간만 잰다.
// 경유지 15곳 한도 → 17점(출발+15+도착)씩 끊어 여러 번 부른다(끝점 공유).

const ALLOW_ORIGINS = ["https://hcyang572-gif.github.io", "http://localhost:8000", "http://127.0.0.1:8000"];
const API = "https://maps.apigw.ntruss.com/map-direction-15/v1/driving";
const MAX_POINTS = 32;
const CHUNK = 17;
// 하루 호출 상한(Directions 호출 수 기준). NCP 무료 한도 소진·악용 대비 — 넘으면 429 → 화면은 직선거리 근사로 돌아간다.
const DAILY_PER_IP = 30;
const DAILY_TOTAL = 90;

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
/** 상한 확인 + n 증가(DB 함수 daeum_route_hit, route_limit.sql). 확인이 실패하면 부르지 않는다. */
async function rateOk(req: Request, n: number): Promise<{ ok: boolean; why?: string }> {
  const url = Deno.env.get("SUPABASE_URL"), sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !sk) return { ok: false, why: "limiter-env" };
  try {
    const r = await fetch(url + "/rest/v1/rpc/daeum_route_hit", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: sk, Authorization: "Bearer " + sk },
      body: JSON.stringify({ p_ip: await ipHash(req), p_n: n, p_ip_limit: DAILY_PER_IP, p_total_limit: DAILY_TOTAL }),
    });
    if (!r.ok) return { ok: false, why: "limiter-" + r.status };
    const j = await r.json();
    return { ok: !!j.ok, why: j.why };
  } catch {
    return { ok: false, why: "limiter-error" };
  }
}

type Pt = [number, number];
const okPt = (p: unknown): p is Pt =>
  Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === "number" && isFinite(v)) &&
  p[0] > 124 && p[0] < 132 && p[1] > 33 && p[1] < 39; // 대한민국 범위만
const fmt = (p: Pt) => p[0].toFixed(6) + "," + p[1].toFixed(6);

/** 한 덩어리(≤17점) 경로 → 구간별 {m,s}·경로선 */
async function directions(pts: Pt[], id: string, key: string) {
  const q = new URLSearchParams({ start: fmt(pts[0]), goal: fmt(pts[pts.length - 1]), option: "traoptimal" });
  const mid = pts.slice(1, -1);
  if (mid.length) q.set("waypoints", mid.map(fmt).join("|"));
  const r = await fetch(API + "?" + q.toString(), { headers: { "x-ncp-apigw-api-key-id": id, "x-ncp-apigw-api-key": key } });
  const text = await r.text();
  let j: any = null; try { j = JSON.parse(text); } catch { /* 아래에서 처리 */ }
  if (!r.ok) return { error: "ncp-http-" + r.status, detail: (j && (j.error?.message || j.message)) || text.slice(0, 120) };
  if (!j || j.code !== 0) return { error: "ncp-code-" + (j ? j.code : "?"), detail: j ? j.message : "" };
  const route = j.route?.traoptimal?.[0];
  if (!route) return { error: "ncp-empty" };
  const legsN = pts.length - 1;
  let legs: { m: number; s: number }[] = [];
  // ① 안내(guide)에서 경유지(87)·목적지(88) 도착 표시로 구간을 나눈다
  const guide: any[] = route.guide || [];
  if (guide.filter((g) => g.type === 87 || g.type === 88).length === legsN) {
    let m = 0, s = 0;
    for (const g of guide) {
      m += g.distance || 0; s += (g.duration || 0) / 1000;
      if (g.type === 87 || g.type === 88) { legs.push({ m: Math.round(m), s: Math.round(s) }); m = 0; s = 0; }
    }
  }
  // ② 요약의 경유지 정보(있을 때)
  if (legs.length !== legsN && Array.isArray(route.summary?.waypoints) && route.summary.waypoints.length === legsN - 1) {
    const w = route.summary.waypoints; legs = [];
    let pm = 0, ps = 0;
    for (const x of w) { legs.push({ m: Math.round(x.distance), s: Math.round(x.duration / 1000) }); pm += x.distance; ps += x.duration / 1000; }
    legs.push({ m: Math.max(0, Math.round(route.summary.distance - pm)), s: Math.max(0, Math.round(route.summary.duration / 1000 - ps)) });
  }
  const total = { m: route.summary.distance as number, s: Math.round(route.summary.duration / 1000) };
  return { legs: legs.length === legsN ? legs : null, total, path: (route.path || []) as Pt[] };
}

/** 경로선 줄이기(지도 그리기용, 최대 약 1,200점) */
function thin(path: Pt[], max = 1200): Pt[] {
  if (path.length <= max) return path;
  const step = Math.ceil(path.length / max), out: Pt[] = [];
  for (let i = 0; i < path.length; i += step) out.push(path[i]);
  const last = path[path.length - 1]; if (out[out.length - 1] !== last) out.push(last);
  return out;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "POST만 받습니다" }, 405, origin);
  if (!origin || !ALLOW_ORIGINS.includes(origin)) return json({ error: "허용되지 않은 출처입니다" }, 403, origin);

  const id = Deno.env.get("NCP_MAP_KEY_ID"), key = Deno.env.get("NCP_MAP_KEY");
  if (!id || !key) return json({ error: "도로 경로 키가 아직 서버에 없습니다", code: "no-key" }, 503, origin);

  let body: { points?: unknown };
  try { body = await req.json(); } catch { return json({ error: "JSON 형식이 아닙니다" }, 400, origin); }
  const pts = Array.isArray(body.points) ? body.points : [];
  if (pts.length < 2 || pts.length > MAX_POINTS || !pts.every(okPt)) return json({ error: "점은 2~" + MAX_POINTS + "개, [경도,위도] 국내 좌표만" }, 400, origin);

  const chunks: Pt[][] = [];
  for (let i = 0; i < pts.length - 1; i += CHUNK - 1) chunks.push((pts as Pt[]).slice(i, Math.min(pts.length, i + CHUNK)));
  const lim = await rateOk(req, chunks.length);
  if (!lim.ok) return json({ error: "오늘 도로 경로 조회 한도에 닿았습니다", code: "limit", why: lim.why }, 429, origin);

  const legs: { m: number; s: number }[] = []; let path: Pt[] = [], m = 0, s = 0;
  for (const c of chunks) {
    const r: any = await directions(c, id, key);
    if (r.error) return json({ error: "도로 경로를 받지 못했습니다", code: r.error, detail: r.detail }, 502, origin);
    if (r.legs) legs.push(...r.legs);
    else { // 구간 분리가 안 되면 덩어리 전체를 점 수로 나눔(표시만, 화면이 «구간 근사»로 적는다)
      const n = c.length - 1; for (let i = 0; i < n; i++) legs.push({ m: Math.round(r.total.m / n), s: Math.round(r.total.s / n), split: true } as any);
    }
    m += r.total.m; s += r.total.s; path = path.concat(r.path);
  }
  return json({ legs, m, s, path: thin(path), calls: chunks.length }, 200, origin);
});
