-- =============================================================================
-- Thesis — Migration 025
-- Operator plan activation. Subscribe writes invoices.status = pending only.
-- It does not change families.plan_id. platform_admin calls
-- thesis_admin_set_family_plan from /admin/accounts (THS-ADM-001).
-- =============================================================================

insert into schema_migrations (id, name) values (25, '025_admin_plan_activation.sql');

drop policy if exists invoices_admin_select on invoices;
create policy invoices_admin_select on invoices
  for select using (is_current_user_platform_admin());

drop policy if exists families_admin_update on families;
create policy families_admin_update on families
  for update using (is_current_user_platform_admin())
  with check (is_current_user_platform_admin());

create or replace function thesis_admin_set_family_plan(
  p_family_id uuid,
  p_plan_id uuid,
  p_billing_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_by uuid;
  v_status text := lower(trim(coalesce(p_billing_status, '')));
  v_plan uuid := p_plan_id;
  v_slug text;
begin
  if not is_current_user_platform_admin() then
    raise exception 'THS-ADM-001 platform admin required' using errcode = '42501';
  end if;

  if v_status not in ('subscribed', 'trial', 'cancelled') then
    raise exception 'THS-PLAN-001 billing_status must be subscribed, trial, or cancelled' using errcode = '22023';
  end if;

  if p_family_id is null then
    raise exception 'THS-PLAN-001 family is required' using errcode = '22023';
  end if;

  if v_status in ('trial', 'cancelled') then
    select id into v_plan from plans where slug = 'trial' limit 1;
  end if;

  if v_plan is null then
    raise exception 'THS-PLAN-001 plan is required' using errcode = '22023';
  end if;

  select slug into v_slug from plans where id = v_plan;
  if v_slug is null then
    raise exception 'THS-PLAN-001 plan was not found' using errcode = '22023';
  end if;

  select created_by into v_created_by from families where id = p_family_id;
  if v_created_by is null then
    raise exception 'THS-PLAN-001 family was not found' using errcode = '22023';
  end if;

  update families
     set plan_id = v_plan,
         billing_status = v_status
   where id = p_family_id;

  if v_status = 'subscribed' then
    update invoices
       set status = 'succeeded'
     where family_id = p_family_id
       and status = 'pending'
       and (plan_id = v_plan or plan_id is null);
  else
    update invoices
       set status = 'cancelled'
     where family_id = p_family_id
       and status = 'pending';
  end if;

  insert into audit_log (actor_id, target_user_id, family_id, action, metadata)
  values (
    auth.uid(),
    v_created_by,
    p_family_id,
    'plan_set',
    jsonb_build_object(
      'plan_id', v_plan,
      'plan_slug', v_slug,
      'billing_status', v_status
    )
  );
end;
$$;

grant execute on function thesis_admin_set_family_plan(uuid, uuid, text) to authenticated;
