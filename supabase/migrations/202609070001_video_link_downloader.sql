create table if not exists public.plan_video_limits (
  plan_type text primary key check (plan_type in ('trial', 'monthly', 'yearly', 'lifetime', 'credits')),
  daily_parse_limit integer not null check (daily_parse_limit between 0 and 1000),
  daily_download_limit integer not null check (daily_download_limit between 0 and 1000),
  max_video_bytes bigint not null default 52428800 check (max_video_bytes between 1048576 and 104857600),
  updated_at timestamptz not null default now()
);

insert into public.plan_video_limits(plan_type, daily_parse_limit, daily_download_limit, max_video_bytes) values
  ('trial', 3, 3, 20971520),
  ('monthly', 20, 20, 52428800),
  ('yearly', 50, 50, 52428800),
  ('lifetime', 100, 100, 52428800),
  ('credits', 10, 10, 52428800)
on conflict(plan_type) do nothing;

create table if not exists public.video_source_domains (
  hostname text primary key,
  label text not null,
  enabled boolean not null default true,
  allow_subdomains boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.video_source_domains(hostname, label, enabled, allow_subdomains) values
  ('developer.mozilla.org', 'MDN 公共示例媒体', true, false)
on conflict(hostname) do nothing;

create table if not exists public.video_link_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('parse', 'download')),
  platform text not null check (platform in ('direct', 'douyin', 'kuaishou', 'bilibili')),
  source_host text not null,
  status text not null default 'started' check (status in ('started', 'completed', 'failed')),
  title text check (char_length(title) <= 200),
  content_type text check (char_length(content_type) <= 100),
  content_length bigint,
  error_code text check (char_length(error_code) <= 80),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists video_link_logs_user_created_idx on public.video_link_logs(user_id, created_at desc);
create index if not exists video_link_logs_rate_idx on public.video_link_logs(user_id, action, created_at desc);

alter table public.plan_video_limits enable row level security;
alter table public.video_source_domains enable row level security;
alter table public.video_link_logs enable row level security;

create policy "video_link_logs_select_own" on public.video_link_logs for select to authenticated using (user_id = auth.uid());

create or replace function public.reserve_video_link_action(p_action text, p_platform text, p_source_host text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_entitlement public.entitlements%rowtype;
  v_limits public.plan_video_limits%rowtype;
  v_used integer;
  v_action_id uuid;
begin
  if v_user is null then raise exception '请先登录。'; end if;
  if p_action not in ('parse', 'download') then raise exception '请求类型无效。'; end if;
  if p_platform not in ('direct', 'douyin', 'kuaishou', 'bilibili') then raise exception '视频平台无效。'; end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  if exists(select 1 from public.profiles where id=v_user and is_banned) then raise exception '账号已被停用。'; end if;
  select * into v_entitlement from public.entitlements where user_id=v_user;
  if not found or v_entitlement.status <> 'active' then raise exception '该功能需要激活后使用，请先输入兑换码。'; end if;
  if v_entitlement.expires_at is not null and v_entitlement.expires_at <= now() then raise exception '使用权限已到期。'; end if;
  if v_entitlement.remaining_conversions is not null and v_entitlement.remaining_conversions <= 0 then raise exception '剩余次数不足。'; end if;
  select * into v_limits from public.plan_video_limits where plan_type=v_entitlement.plan_type;
  if not found then raise exception '套餐未配置视频解析额度。'; end if;
  if exists(select 1 from public.video_link_logs where user_id=v_user and created_at > now()-interval '3 seconds') then raise exception '请求过于频繁，请稍后再试。'; end if;
  if (select count(*) from public.video_link_logs where user_id=v_user and status='started' and created_at > now()-interval '2 minutes') >= 2 then raise exception '已有解析任务进行中，请稍后再试。'; end if;
  select count(*) into v_used from public.video_link_logs where user_id=v_user and action=p_action and created_at >= (date_trunc('day', now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai');
  if p_action='parse' and v_used >= v_limits.daily_parse_limit then raise exception '今日解析次数已用完。'; end if;
  if p_action='download' and v_used >= v_limits.daily_download_limit then raise exception '今日下载次数已用完。'; end if;
  insert into public.video_link_logs(user_id, action, platform, source_host) values(v_user,p_action,p_platform,left(lower(p_source_host),253)) returning id into v_action_id;
  return jsonb_build_object('actionId',v_action_id,'maxVideoBytes',v_limits.max_video_bytes,'dailyLimit',case when p_action='parse' then v_limits.daily_parse_limit else v_limits.daily_download_limit end,'usedToday',v_used+1);
end;
$$;

create or replace function public.finish_video_link_action(p_action_id uuid, p_status text, p_title text default null, p_content_type text default null, p_content_length bigint default null, p_error_code text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '请先登录。'; end if;
  if p_status not in ('completed','failed') then raise exception '状态无效。'; end if;
  update public.video_link_logs set status=p_status,title=left(p_title,200),content_type=left(p_content_type,100),content_length=p_content_length,error_code=left(p_error_code,80),completed_at=now()
  where id=p_action_id and user_id=auth.uid() and status='started';
  if not found then raise exception '任务记录不存在。'; end if;
end;
$$;

revoke all on function public.reserve_video_link_action(text,text,text) from public;
revoke all on function public.finish_video_link_action(uuid,text,text,text,bigint,text) from public;
grant execute on function public.reserve_video_link_action(text,text,text) to authenticated;
grant execute on function public.finish_video_link_action(uuid,text,text,text,bigint,text) to authenticated;
