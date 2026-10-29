-- 닿음 daeum-route 하루 호출 상한(S9c, 10-29) — 네이버 Directions 15 무료 한도 소진·악용 대비.
-- ⛔ 닿음 전용 프로젝트 daeum(ref gicjzrxgktpovnphtjhi)에만 적용. 상주 정책플랫폼 프로젝트 금지.
-- AI 함수와 같은 표(daeum_ai_usage)를 쓰되 줄 이름에 'route:' 앞머리를 붙여 AI 상한과 섞이지 않게 한다.
create or replace function public.daeum_route_hit(p_ip text, p_n integer, p_ip_limit integer, p_total_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (now() at time zone 'Asia/Seoul')::date;
  k text := 'route:' || p_ip;
  ip_calls integer;
  all_calls integer;
begin
  if p_n < 1 or p_n > 4 then
    return jsonb_build_object('ok', false, 'why', 'n');
  end if;
  insert into daeum_ai_usage(day, ip_hash, calls) values (d, k, 0), (d, 'route:*', 0) on conflict do nothing;
  select calls into ip_calls from daeum_ai_usage where day = d and ip_hash = k for update;
  select calls into all_calls from daeum_ai_usage where day = d and ip_hash = 'route:*' for update;
  if ip_calls + p_n > p_ip_limit then
    return jsonb_build_object('ok', false, 'why', 'ip', 'ip', ip_calls, 'total', all_calls);
  end if;
  if all_calls + p_n > p_total_limit then
    return jsonb_build_object('ok', false, 'why', 'total', 'ip', ip_calls, 'total', all_calls);
  end if;
  update daeum_ai_usage set calls = calls + p_n where day = d and ip_hash in (k, 'route:*');
  return jsonb_build_object('ok', true, 'ip', ip_calls + p_n, 'total', all_calls + p_n);
end;
$$;
revoke all on function public.daeum_route_hit(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.daeum_route_hit(text, integer, integer, integer) to service_role;
