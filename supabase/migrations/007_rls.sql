-- =============================================================================
-- Thesis — Migration 007
-- FORCE RLS. Policy is the boundary (D8).
-- holdings/lots: family members OR admin with support_access_grants.
-- reports: family full row; admins use reports_admin_meta (no sections).
-- prompt_versions.body: no authenticated SELECT.
-- usage_events / invoices: owner read; service-role write.
-- =============================================================================

insert into schema_migrations (id, name) values (7, '007_rls.sql');

create or replace function apply_family_rls(p_table regclass, p_write boolean default true)
returns void
language plpgsql
as $$
declare
  t text := p_table::text;
begin
  execute format('alter table %s enable row level security', t);
  execute format('alter table %s force row level security', t);
  execute format('drop policy if exists %I on %s', replace(t, '.', '_') || '_select', t);
  execute format('drop policy if exists %I on %s', replace(t, '.', '_') || '_insert', t);
  execute format('drop policy if exists %I on %s', replace(t, '.', '_') || '_update', t);
  execute format('drop policy if exists %I on %s', replace(t, '.', '_') || '_delete', t);
  execute format(
    'create policy %I on %s for select using (user_can_read_family(family_id))',
    replace(t, '.', '_') || '_select', t
  );
  if p_write then
    execute format(
      'create policy %I on %s for insert with check (user_can_write_family(family_id))',
      replace(t, '.', '_') || '_insert', t
    );
    execute format(
      'create policy %I on %s for update using (user_can_write_family(family_id)) with check (user_can_write_family(family_id))',
      replace(t, '.', '_') || '_update', t
    );
    execute format(
      'create policy %I on %s for delete using (user_can_write_family(family_id))',
      replace(t, '.', '_') || '_delete', t
    );
  end if;
end;
$$;

-- users: self-read; admin read
alter table users enable row level security;
alter table users force row level security;
create policy users_select_own on users
  for select using (id = auth.uid() or is_current_user_platform_admin());
create policy users_update_own on users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- families / members
alter table families enable row level security;
alter table families force row level security;
create policy families_select on families
  for select using (user_can_read_family(id) or is_current_user_platform_admin());
create policy families_update on families
  for update using (user_can_write_family(id)) with check (user_can_write_family(id));

alter table family_members enable row level security;
alter table family_members force row level security;
create policy family_members_select on family_members
  for select using (user_can_read_family(family_id) or is_current_user_platform_admin());
create policy family_members_write on family_members
  for all using (user_is_family_owner(family_id) or is_current_user_platform_admin())
  with check (user_is_family_owner(family_id) or is_current_user_platform_admin());

-- plans / catalog: readable
alter table plans enable row level security;
create policy plans_select on plans for select using (is_active or is_current_user_platform_admin());
create policy plans_admin_write on plans for all using (is_current_user_platform_admin()) with check (is_current_user_platform_admin());

alter table plan_notice_thresholds enable row level security;
create policy plan_notice_select on plan_notice_thresholds for select using (true);
create policy plan_notice_admin on plan_notice_thresholds for all using (is_current_user_platform_admin()) with check (is_current_user_platform_admin());

alter table model_catalog enable row level security;
create policy model_catalog_select on model_catalog for select using (is_active or is_current_user_platform_admin());
create policy model_catalog_admin on model_catalog for all using (is_current_user_platform_admin()) with check (is_current_user_platform_admin());

select apply_family_rls('public.wallets');
select apply_family_rls('public.wallet_topups');
select apply_family_rls('public.invoices');
select apply_family_rls('public.portfolios');
select apply_family_rls('public.holding_lots');
create policy holding_lots_admin_support on holding_lots
  for select using (admin_has_holdings_support_access(family_id));
select apply_family_rls('public.portfolio_import_rows');
select apply_family_rls('public.analysis_requests');
select apply_family_rls('public.analysis_evidence');
select apply_family_rls('public.reports');
select apply_family_rls('public.refinements');

-- usage_events: family read; no authenticated write (service role / RPC)
alter table usage_events enable row level security;
alter table usage_events force row level security;
create policy usage_events_select on usage_events
  for select using (user_can_read_family(family_id) or is_current_user_platform_admin());

-- prompt: admin only; body never to authenticated
alter table prompt_versions enable row level security;
alter table prompt_versions force row level security;
create policy prompt_versions_admin on prompt_versions
  for all using (is_current_user_platform_admin())
  with check (is_current_user_platform_admin());

alter table prompt_version_approvals enable row level security;
alter table prompt_version_approvals force row level security;
create policy prompt_approvals_admin on prompt_version_approvals
  for all using (is_current_user_platform_admin())
  with check (is_current_user_platform_admin());

alter table audit_log enable row level security;
alter table audit_log force row level security;
create policy audit_log_admin_select on audit_log
  for select using (is_current_user_platform_admin());
create policy audit_log_insert_self on audit_log
  for insert with check (
    actor_id = auth.uid() and is_current_user_platform_admin()
  );

alter table support_access_grants enable row level security;
alter table support_access_grants force row level security;
create policy support_grants_family_owner on support_access_grants
  for all using (
    exists (
      select 1 from family_members fm
      where fm.family_id = support_access_grants.family_id
        and fm.user_id = auth.uid()
        and fm.member_role = 'owner'
        and fm.is_active = true
    )
    or is_current_user_platform_admin()
  )
  with check (
    exists (
      select 1 from family_members fm
      where fm.family_id = support_access_grants.family_id
        and fm.user_id = auth.uid()
        and fm.member_role = 'owner'
        and fm.is_active = true
    )
    or is_current_user_platform_admin()
  );

revoke all on prompt_versions from anon, authenticated;
grant select on prompt_versions_meta to authenticated;
grant select on reports_admin_meta to authenticated;
grant select on holdings to authenticated;

-- usage_events / invoices: authenticated cannot insert except via RPC (security definer)
revoke insert, update, delete on usage_events from authenticated, anon;
revoke insert, update, delete on invoices from authenticated, anon;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- Re-apply tighter prompt revoke after blanket grant
revoke all on prompt_versions from authenticated, anon;
grant select on prompt_versions_meta to authenticated;
revoke insert, update, delete on usage_events from authenticated, anon;
revoke insert, update, delete on invoices from authenticated, anon;
revoke insert, update, delete on audit_log from authenticated, anon;
grant insert on audit_log to authenticated; -- gated by RLS admin policy
