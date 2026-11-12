// 서비스 목록 «서버 정본 ID만 받기»(S12-v 1-4 ③, ⚙️ 파로 11-12).
// 화면은 ID 배열(옛 화면은 {id,…} 객체)을 보낸다. 여기서는 ID만 꺼내 정본(catalog.ts)에 있는 것만 남기고,
// 이름·대상·내용은 정본 값으로 채운다 — 화면이 보낸 name·target·support 글은 버린다(외부 AI로 가지 않음).
export type Svc = { id: string; name: string; target: string; support: string };

export function pickServices(raw: unknown, catalog: Record<string, [string, string, string]>, max: number): Svc[] {
  const out: Svc[] = [], seen = new Set<string>();
  for (const x of Array.isArray(raw) ? raw : []) {
    const id = typeof x === "string" ? x : (x && typeof (x as { id?: unknown }).id === "string" ? (x as { id: string }).id : "");
    if (!id || id.length > 40 || seen.has(id) || !Object.prototype.hasOwnProperty.call(catalog, id)) continue;
    seen.add(id);
    const [name, target, support] = catalog[id];
    out.push({ id, name, target, support });
    if (out.length >= max) break;
  }
  return out;
}
