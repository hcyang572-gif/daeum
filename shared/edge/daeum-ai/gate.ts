// AI 사용 기간·끄기 스위치(11-02 호창님 지시 «심사에 탈락할 경우 AI 비용이 더이상 발생하지 않도록»).
// 제출 11-08 · 본선 진출 통지 11-25 → 기본 종료 2026-11-26 00:00(한국시각). 이후에는 Anthropic·DB를 부르지 않는다.
//   즉시 끄기 : npx supabase secrets set DAEUM_AI_OFF=1 --project-ref gicjzrxgktpovnphtjhi
//   다시 켜기 : npx supabase secrets unset DAEUM_AI_OFF --project-ref gicjzrxgktpovnphtjhi
//   본선 연장 : npx supabase secrets set DAEUM_AI_UNTIL=2027-01-31T00:00:00+09:00 --project-ref gicjzrxgktpovnphtjhi
// 순수 함수라 시험(gate.test.mjs)에서 그대로 부른다. 날짜 형식이 틀리면 기본값으로(연장이 조용히 무한이 되지 않게).

export const DEFAULT_AI_UNTIL = "2026-11-26T00:00:00+09:00";

export type Gate = { open: boolean; why?: "off" | "ended"; until: string; daysLeft: number };

export function aiGate(now: number, env: { off?: string | null; until?: string | null }): Gate {
  let until = DEFAULT_AI_UNTIL;
  const u = (env.until ?? "").trim();
  if (u && !Number.isNaN(Date.parse(u))) until = u;
  const end = Date.parse(until);
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  const off = /^(1|true|on|yes)$/i.test((env.off ?? "").trim());
  if (off) return { open: false, why: "off", until, daysLeft };
  if (now >= end) return { open: false, why: "ended", until, daysLeft: 0 };
  return { open: true, until, daysLeft };
}
