alter table public.video_link_logs drop constraint if exists video_link_logs_platform_check;
alter table public.video_link_logs add constraint video_link_logs_platform_check
  check (platform in ('direct','douyin','kuaishou','bilibili','audio_direct','netease','qqmusic','kugou'));

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
  if p_action not in ('parse','download') then raise exception '请求类型无效。'; end if;
  if p_platform not in ('direct','douyin','kuaishou','bilibili','audio_direct','netease','qqmusic','kugou') then raise exception '媒体平台无效。'; end if;
  perform pg_advisory_xact_lock(hashtext(v_user::text));
  if exists(select 1 from public.profiles where id=v_user and is_banned) then raise exception '账号已被停用。'; end if;
  select * into v_entitlement from public.entitlements where user_id=v_user;
  if not found or v_entitlement.status <> 'active' then raise exception '该功能需要激活后使用，请先输入激活码。'; end if;
  if v_entitlement.expires_at is not null and v_entitlement.expires_at <= now() then raise exception '使用权限已到期。'; end if;
  if v_entitlement.remaining_conversions is not null and v_entitlement.remaining_conversions <= 0 then raise exception '剩余次数不足。'; end if;
  select * into v_limits from public.plan_video_limits where plan_type=v_entitlement.plan_type;
  if not found then raise exception '账号使用限额尚未配置。'; end if;
  if exists(select 1 from public.video_link_logs where user_id=v_user and action=p_action and created_at > now()-interval '3 seconds') then raise exception '请求过于频繁，请稍后再试。'; end if;
  if (select count(*) from public.video_link_logs where user_id=v_user and status='started' and created_at > now()-interval '2 minutes') >= 2 then raise exception '已有处理任务进行中，请稍后再试。'; end if;
  select count(*) into v_used from public.video_link_logs where user_id=v_user and action=p_action
    and created_at >= (date_trunc('day',now() at time zone 'Asia/Shanghai') at time zone 'Asia/Shanghai');
  if p_action='parse' and v_used >= v_limits.daily_parse_limit then raise exception '今日解析次数已用完。'; end if;
  if p_action='download' and v_used >= v_limits.daily_download_limit then raise exception '今日下载次数已用完。'; end if;
  insert into public.video_link_logs(user_id,action,platform,source_host)
    values(v_user,p_action,p_platform,left(lower(p_source_host),253)) returning id into v_action_id;
  return jsonb_build_object('actionId',v_action_id,'maxVideoBytes',v_limits.max_video_bytes,
    'dailyLimit',case when p_action='parse' then v_limits.daily_parse_limit else v_limits.daily_download_limit end,
    'usedToday',v_used+1);
end;
$$;

revoke all on function public.reserve_video_link_action(text,text,text) from public;
grant execute on function public.reserve_video_link_action(text,text,text) to authenticated;
