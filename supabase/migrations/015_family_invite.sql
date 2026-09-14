-- =============================================================================
-- Thesis — Migration 015
-- Owner invites an existing user onto family_members (P8-00).
-- =============================================================================

insert into schema_migrations (id, name) values (15, '015_family_invite.sql');

create or replace function thesis_invite_family_member(
  p_email text,
  p_role family_member_role
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
  v_user uuid;
  v_id uuid;
begin
  if p_role not in ('member', 'viewer') then
    raise exception 'THS-FAM-002 role must be member or viewer' using errcode = '22023';
  end if;
  select fm.family_id into v_family
    from family_members fm
   where fm.user_id = auth.uid()
     and fm.member_role = 'owner'
     and fm.is_active = true
   limit 1;
  if v_family is null then
    raise exception 'THS-FAM-001 owner required' using errcode = '42501';
  end if;
  select u.id into v_user from users u where lower(u.email::text) = lower(trim(p_email));
  if v_user is null then
    raise exception 'THS-FAM-003 user not found' using errcode = '22023';
  end if;
  insert into family_members (family_id, user_id, member_role, invited_by)
  values (v_family, v_user, p_role, auth.uid())
  on conflict (family_id, user_id) do update
    set member_role = excluded.member_role,
        is_active = true,
        invited_by = excluded.invited_by,
        updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function thesis_invite_family_member(text, family_member_role) to authenticated;
