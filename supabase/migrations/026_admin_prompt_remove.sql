-- =============================================================================
-- Thesis — Migration 026
-- Admin may Remove a prompt that is not the live Analyse / gate / digest row.
-- Hard-delete when nothing points at the row; otherwise set archived_at.
-- Table-level DELETE is not granted; the RPC is the only remover.
-- Do not apply without CONFIRM_APPLY=1 and a named target.
-- =============================================================================

insert into schema_migrations (id, name) values (26, '026_admin_prompt_remove.sql');

alter table prompt_versions
  add column if not exists archived_at timestamptz;

create or replace view prompt_versions_meta as
select id, semver, submitted_by, promoted_at, promoted_by, superseded_at, created_at, role, archived_at
from prompt_versions;

grant select on prompt_versions_meta to authenticated;

create or replace function thesis_admin_remove_prompt(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promoted timestamptz;
  v_superseded timestamptz;
  v_archived timestamptz;
  v_referenced boolean;
begin
  if not is_current_user_platform_admin() then
    raise exception 'THS-ADM-001 platform admin required' using errcode = '42501';
  end if;

  select promoted_at, superseded_at, archived_at
    into v_promoted, v_superseded, v_archived
    from prompt_versions
   where id = p_id;

  if not found then
    raise exception 'prompt version not found' using errcode = 'P0002';
  end if;

  if v_promoted is not null and v_superseded is null then
    raise exception 'THS-PROMPT-001 This is the prompt Analyse is using. Promote another version first.'
      using errcode = 'P0001';
  end if;

  if v_archived is not null then
    return;
  end if;

  select exists (select 1 from reports r where r.prompt_version_id = p_id)
      or exists (select 1 from weekly_digests w where w.prompt_version_id = p_id)
    into v_referenced;

  if v_referenced then
    update prompt_versions
       set archived_at = now()
     where id = p_id
       and archived_at is null;
    return;
  end if;

  begin
    delete from prompt_versions where id = p_id;
  exception
    when foreign_key_violation then
      update prompt_versions
         set archived_at = now()
       where id = p_id
         and archived_at is null;
  end;
end;
$$;

revoke all on function thesis_admin_remove_prompt(uuid) from public, anon;
grant execute on function thesis_admin_remove_prompt(uuid) to authenticated;
