update public.redemption_codes
set disabled_at = now(),
    note = left(concat_ws(' · ', nullif(note, ''), '旧套餐已停止销售'), 200)
where plan_type <> 'lifetime' and activated_at is null and disabled_at is null;

create or replace function public.redeem_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user uuid := auth.uid();
  v_code public.redemption_codes%rowtype;
  v_current public.entitlements%rowtype;
begin
  if v_user is null then raise exception '请先登录。'; end if;
  if exists(select 1 from public.profiles where id=v_user and is_banned) then raise exception '账号已被停用。'; end if;
  select * into v_code from public.redemption_codes
    where code_hash=encode(digest(upper(trim(p_code)), 'sha256'), 'hex') for update;
  if not found then raise exception '激活码无效。'; end if;
  if v_code.disabled_at is not null then raise exception '激活码已被禁用。'; end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then raise exception '激活码已过期。'; end if;
  if v_code.activated_by is not null and v_code.activated_by <> v_user then raise exception '激活码已被其他账号使用。'; end if;
  if v_code.activated_by = v_user then
    return (select to_jsonb(e) from public.entitlements e where e.user_id=v_user);
  end if;
  if v_code.plan_type <> 'lifetime' then raise exception '该激活码所属的旧套餐已停止使用。'; end if;

  select * into v_current from public.entitlements where user_id=v_user for update;
  if found and v_current.status='active' and (v_current.expires_at is null or v_current.expires_at > now())
    and (v_current.remaining_conversions is null or v_current.remaining_conversions > 0) then
    raise exception '该账号已经激活，无需重复兑换。';
  end if;

  insert into public.entitlements(user_id,plan_type,activated_at,expires_at,remaining_conversions,status,source_code_id,updated_at)
  values(v_user,'lifetime',now(),null,null,'active',v_code.id,now())
  on conflict(user_id) do update set plan_type='lifetime',activated_at=excluded.activated_at,
    expires_at=null,remaining_conversions=null,status='active',source_code_id=excluded.source_code_id,updated_at=now();
  update public.redemption_codes set activated_by=v_user,activated_at=now() where id=v_code.id;
  return (select to_jsonb(e) from public.entitlements e where e.user_id=v_user);
end;
$$;

revoke all on function public.redeem_code(text) from public;
grant execute on function public.redeem_code(text) to authenticated;
