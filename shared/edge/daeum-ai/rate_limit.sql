-- 닿음 daeum-ai 하루 호출 상한(S5b-2, 10-29 케르 재검수 ③ — Origin 위조로 허용 출처 검사를 뚫는 비용 악용 대비)
-- ⛔ 닿음 전용 프로젝트 daeum(ref gicjzrxgktpovnphtjhi)에만 적용한다. 상주 정책플랫폼 프로젝트 금지.
-- IP 원문은 저장하지 않는다(함수가 SHA-256 해시 앞 16자만 넘긴다). 날짜는 한국 시각 기준.
create table if not exists public.daeum_ai_usage (
  day     date not null,
  ip_hash text not null,          -- '*' = 하루 전체 합계 줄
  calls   integer not null default 0,
  primary key (day, ip_hash)
);
alter table public.daeum_ai_usage enable row level security;   -- 정책 없음 = anon·authenticated 는 행에 못 닿음
revoke all on public.daeum_ai_usage from anon, authenticated;
grant select, insert, update, delete on public.daeum_ai_usage to service_role;

-- 한 번에 «IP 줄 +1, 전체 줄 +1» 하고 상한을 넘었는지 돌려준다(원자적). 넘으면 더하지 않는다.
create or replace function public.daeum_ai_hit(p_ip text, p_ip_limit integer, p_total_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (now() at time zone 'Asia/Seoul')::date;
  ip_calls integer;
  all_calls integer;
begin
  insert into daeum_ai_usage(day, ip_hash, calls) values (d, p_ip, 0), (d, '*', 0) on conflict do nothing;
  select calls into ip_calls from daeum_ai_usage where day = d and ip_hash = p_ip for update;
  select calls into all_calls from daeum_ai_usage where day = d and ip_hash = '*' for update;
  if ip_calls >= p_ip_limit then
    return jsonb_build_object('ok', false, 'why', 'ip', 'ip', ip_calls, 'total', all_calls);
  end if;
  if all_calls >= p_total_limit then
    return jsonb_build_object('ok', false, 'why', 'total', 'ip', ip_calls, 'total', all_calls);
  end if;
  update daeum_ai_usage set calls = calls + 1 where day = d and ip_hash in (p_ip, '*');
  -- 오래된 줄 정리(7일 지난 것)
  delete from daeum_ai_usage where day < d - 7;
  return jsonb_build_object('ok', true, 'ip', ip_calls + 1, 'total', all_calls + 1);
end;
$$;
revoke all on function public.daeum_ai_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.daeum_ai_hit(text, integer, integer) to service_role;
