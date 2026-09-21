-- The owner account is always an administrator with unlimited access.
-- Each customer activation code binds to one account and grants five conversions.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict do nothing;

  if lower(coalesce(new.email, '')) = '3819837002@qq.com' then
    insert into public.admin_users(user_id) values(new.id) on conflict do nothing;
    insert into public.entitlements(user_id, plan_type, activated_at, expires_at, remaining_conversions, status, source_code_id, updated_at)
    values(new.id, 'lifetime', now(), null, null, 'active', null, now())
    on conflict(user_id) do update set plan_type='lifetime', expires_at=null,
      remaining_conversions=null, status='active', source_code_id=null, updated_at=now();
  end if;
  return new;
end;
$$;

insert into public.admin_users(user_id)
select id from auth.users where lower(email) = '3819837002@qq.com'
on conflict do nothing;

insert into public.entitlements(user_id, plan_type, activated_at, expires_at, remaining_conversions, status, source_code_id, updated_at)
select id, 'lifetime', now(), null, null, 'active', null, now()
from auth.users where lower(email) = '3819837002@qq.com'
on conflict(user_id) do update set plan_type='lifetime', expires_at=null,
  remaining_conversions=null, status='active', source_code_id=null, updated_at=now();

-- Bring existing non-owner access in line with the five-conversion rule.
update public.entitlements e
set plan_type='credits',
    expires_at=null,
    remaining_conversions=greatest(0, 5 - (
      select count(*)::integer from public.conversion_logs l
      where l.user_id=e.user_id and l.created_at >= e.activated_at
    )),
    updated_at=now()
where not exists (
  select 1 from auth.users u
  where u.id=e.user_id and lower(u.email)='3819837002@qq.com'
);

update public.redemption_codes
set plan_type='credits', conversion_limit=5, validity_days=null
where activated_by is null;

create or replace function public.redeem_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_code public.redemption_codes%rowtype;
  v_current public.entitlements%rowtype;
begin
  if v_user is null then raise exception '请先登录。'; end if;
  select lower(email) into v_email from auth.users where id=v_user;
  if v_email='3819837002@qq.com' then
    insert into public.admin_users(user_id) values(v_user) on conflict do nothing;
    insert into public.entitlements(user_id,plan_type,activated_at,expires_at,remaining_conversions,status,source_code_id,updated_at)
    values(v_user,'lifetime',now(),null,null,'active',null,now())
    on conflict(user_id) do update set plan_type='lifetime',expires_at=null,
      remaining_conversions=null,status='active',source_code_id=null,updated_at=now();
    return (select to_jsonb(e) from public.entitlements e where e.user_id=v_user);
  end if;
  if exists(select 1 from public.profiles where id=v_user and is_banned) then raise exception '账号已被停用。'; end if;

  select * into v_code from public.redemption_codes
    where code_hash=encode(digest(upper(trim(p_code)), 'sha256'), 'hex') for update;
  if not found then raise exception '激活码无效。'; end if;
  if v_code.disabled_at is not null then raise exception '激活码已被禁用。'; end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then raise exception '激活码已过期。'; end if;
  if v_code.activated_by is not null and v_code.activated_by <> v_user then raise exception '激活码已绑定其他账号。'; end if;
  if v_code.activated_by = v_user then
    return (select to_jsonb(e) from public.entitlements e where e.user_id=v_user);
  end if;

  select * into v_current from public.entitlements where user_id=v_user for update;
  if found and v_current.status='active' and coalesce(v_current.remaining_conversions, 0) > 0 then
    raise exception '当前账号还有剩余次数，用完后再兑换新激活码。';
  end if;

  insert into public.entitlements(user_id,plan_type,activated_at,expires_at,remaining_conversions,status,source_code_id,updated_at)
  values(v_user,'credits',now(),null,5,'active',v_code.id,now())
  on conflict(user_id) do update set plan_type='credits',activated_at=excluded.activated_at,
    expires_at=null,remaining_conversions=5,status='active',source_code_id=excluded.source_code_id,updated_at=now();
  update public.redemption_codes
  set plan_type='credits',conversion_limit=5,activated_by=v_user,activated_at=now()
  where id=v_code.id;
  return (select to_jsonb(e) from public.entitlements e where e.user_id=v_user);
end;
$$;

revoke all on function public.redeem_code(text) from public;
grant execute on function public.redeem_code(text) to authenticated;
