-- =============================================================================
-- Thesis — Migration 023
-- Admin prompt registry: platform_admin may insert/update/select body;
-- promote RPC; meta view includes role.
-- Desk JWT still fails RLS (is_current_user_platform_admin).
-- Do not apply without CONFIRM_APPLY=1 and a named target.
-- =============================================================================

insert into schema_migrations (id, name) values (23, '023_admin_prompt_promote.sql')
on conflict (id) do nothing;

grant select, insert, update on prompt_versions to authenticated;
grant select, insert on prompt_version_approvals to authenticated;

create or replace view prompt_versions_meta as
select id, semver, role, submitted_by, promoted_at, promoted_by, superseded_at, created_at
from prompt_versions;

grant select on prompt_versions_meta to authenticated;

create or replace function thesis_admin_promote_prompt(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if not is_current_user_platform_admin() then
    raise exception 'THS-ADM-001 platform admin required' using errcode = '42501';
  end if;
  select role into v_role from prompt_versions where id = p_id;
  if v_role is null then
    raise exception 'prompt version not found' using errcode = 'P0002';
  end if;
  update prompt_versions
     set superseded_at = now()
   where role = v_role
     and promoted_at is not null
     and superseded_at is null
     and id <> p_id;
  update prompt_versions
     set promoted_at = now(),
         promoted_by = auth.uid(),
         superseded_at = null
   where id = p_id;
end;
$$;

revoke all on function thesis_admin_promote_prompt(uuid) from public, anon;
grant execute on function thesis_admin_promote_prompt(uuid) to authenticated;
