create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.redemption_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_prefix text not null,
  plan_type text not null check (plan_type in ('trial', 'monthly', 'yearly', 'lifetime', 'credits')),
  validity_days integer check (validity_days is null or validity_days > 0),
  conversion_limit integer check (conversion_limit is null or conversion_limit > 0),
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  activated_by uuid references auth.users(id),
  activated_at timestamptz,
  disabled_at timestamptz,
  note text check (char_length(note) <= 200)
);

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_type text not null check (plan_type in ('trial', 'monthly', 'yearly', 'lifetime', 'credits')),
  activated_at timestamptz not null default now(),
  expires_at timestamptz,
  remaining_conversions integer check (remaining_conversions is null or remaining_conversions >= 0),
  status text not null default 'active' check (status in ('active', 'disabled')),
  source_code_id uuid references public.redemption_codes(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversion_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('image', 'document', 'audio', 'video')),
  input_format text not null check (char_length(input_format) between 1 and 16),
  output_format text not null check (char_length(output_format) between 1 and 16),
  file_size bigint not null check (file_size between 0 and 52428800),
  status text not null default 'started' check (status in ('started', 'completed', 'failed')),
  error_message text check (char_length(error_message) <= 500),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists conversion_logs_user_created_idx on public.conversion_logs(user_id, created_at desc);
create index if not exists redemption_codes_status_idx on public.redemption_codes(activated_at, disabled_at);

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.redemption_codes enable row level security;
alter table public.entitlements enable row level security;
alter table public.conversion_logs enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admin_users_select_self" on public.admin_users for select to authenticated using (user_id = auth.uid());
create policy "entitlements_select_own" on public.entitlements for select to authenticated using (user_id = auth.uid());
create policy "conversion_logs_select_own" on public.conversion_logs for select to authenticated using (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.profiles(id, display_name)
select id, coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1)) from auth.users
on conflict(id) do nothing;

create or replace function public.redeem_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user uuid := auth.uid();
  v_code public.redemption_codes%rowtype;
  v_current public.entitlements%rowtype;
  v_expires timestamptz;
  v_remaining integer;
begin
  if v_user is null then raise exception '请先登录。'; end if;
  if exists(select 1 from public.profiles where id = v_user and is_banned) then raise exception '账号已被停用。'; end if;
  select * into v_code from public.redemption_codes
    where code_hash = encode(digest(upper(trim(p_code)), 'sha256'), 'hex') for update;
  if not found then raise exception '兑换码无效。'; end if;
  if v_code.disabled_at is not null then raise exception '兑换码已被禁用。'; end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then raise exception '兑换码已过期。'; end if;
  if v_code.activated_by is not null and v_code.activated_by <> v_user then raise exception '兑换码已被其他账号使用。'; end if;
  if v_code.activated_by = v_user then
    return (select to_jsonb(e) from public.entitlements e where e.user_id = v_user);
  end if;

  select * into v_current from public.entitlements where user_id = v_user for update;
  if v_code.plan_type = 'lifetime' then
    v_expires := null; v_remaining := null;
  elsif v_code.plan_type = 'credits' then
    v_expires := v_current.expires_at;
    v_remaining := coalesce(v_current.remaining_conversions, 0) + v_code.conversion_limit;
  else
    v_expires := greatest(now(), coalesce(v_current.expires_at, now())) + make_interval(days => v_code.validity_days);
    v_remaining := case when v_code.conversion_limit is null then null else coalesce(v_current.remaining_conversions, 0) + v_code.conversion_limit end;
  end if;

  insert into public.entitlements(user_id, plan_type, activated_at, expires_at, remaining_conversions, status, source_code_id, updated_at)
  values(v_user, v_code.plan_type, now(), v_expires, v_remaining, 'active', v_code.id, now())
  on conflict(user_id) do update set plan_type=excluded.plan_type, activated_at=excluded.activated_at,
    expires_at=excluded.expires_at, remaining_conversions=excluded.remaining_conversions,
    status='active', source_code_id=excluded.source_code_id, updated_at=now();

  update public.redemption_codes set activated_by=v_user, activated_at=now() where id=v_code.id;
  return (select to_jsonb(e) from public.entitlements e where e.user_id = v_user);
end;
$$;

create or replace function public.reserve_conversion(p_kind text, p_input_format text, p_output_format text, p_file_size bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_entitlement public.entitlements%rowtype;
  v_log_id uuid;
begin
  if v_user is null then raise exception '请先登录。'; end if;
  if p_file_size <= 0 or p_file_size > 52428800 then raise exception '文件必须大于 0 且不超过 50MB。'; end if;
  if exists(select 1 from public.profiles where id=v_user and is_banned) then raise exception '账号已被停用。'; end if;
  select * into v_entitlement from public.entitlements where user_id=v_user for update;
  if not found or v_entitlement.status <> 'active' then raise exception '该功能需要激活后使用，请先输入兑换码。'; end if;
  if v_entitlement.expires_at is not null and v_entitlement.expires_at <= now() then raise exception '使用权限已到期，请兑换新的激活码。'; end if;
  if v_entitlement.remaining_conversions is not null and v_entitlement.remaining_conversions <= 0 then raise exception '转换次数已用完，请兑换新的次数卡。'; end if;
  if v_entitlement.remaining_conversions is not null then
    update public.entitlements set remaining_conversions=remaining_conversions-1, updated_at=now() where user_id=v_user returning * into v_entitlement;
  end if;
  insert into public.conversion_logs(user_id, kind, input_format, output_format, file_size)
    values(v_user, lower(p_kind), lower(p_input_format), lower(p_output_format), p_file_size) returning id into v_log_id;
  return jsonb_build_object('conversionId', v_log_id, 'remainingConversions', v_entitlement.remaining_conversions);
end;
$$;

create or replace function public.finish_conversion(p_conversion_id uuid, p_status text, p_error_message text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '请先登录。'; end if;
  if p_status not in ('completed','failed') then raise exception '状态无效。'; end if;
  update public.conversion_logs set status=p_status, error_message=left(p_error_message,500), completed_at=now()
    where id=p_conversion_id and user_id=auth.uid() and status='started';
  if not found then raise exception '转换记录不存在。'; end if;
end;
$$;

revoke all on function public.redeem_code(text) from public;
revoke all on function public.reserve_conversion(text,text,text,bigint) from public;
revoke all on function public.finish_conversion(uuid,text,text) from public;
grant execute on function public.redeem_code(text) to authenticated;
grant execute on function public.reserve_conversion(text,text,text,bigint) to authenticated;
grant execute on function public.finish_conversion(uuid,text,text) to authenticated;

-- 创建首位管理员：先在 Authentication 中注册账号，再只执行一次下面语句并替换邮箱。
-- insert into public.admin_users(user_id) select id from auth.users where email = 'owner@example.com';
