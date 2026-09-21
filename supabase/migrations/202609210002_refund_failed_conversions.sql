-- Failed processing must not consume one of a customer's five conversions.
create or replace function public.finish_conversion(p_conversion_id uuid, p_status text, p_error_message text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_log public.conversion_logs%rowtype;
begin
  if v_user is null then raise exception '请先登录。'; end if;
  if p_status not in ('completed','failed') then raise exception '状态无效。'; end if;

  select * into v_log from public.conversion_logs
  where id=p_conversion_id and user_id=v_user and status='started'
  for update;
  if not found then raise exception '转换记录不存在。'; end if;

  update public.conversion_logs
  set status=p_status, error_message=left(p_error_message,500), completed_at=now()
  where id=p_conversion_id;

  if p_status='failed' then
    update public.entitlements
    set remaining_conversions=remaining_conversions+1, updated_at=now()
    where user_id=v_user and remaining_conversions is not null;
  end if;
end;
$$;

revoke all on function public.finish_conversion(uuid,text,text) from public;
grant execute on function public.finish_conversion(uuid,text,text) to authenticated;
