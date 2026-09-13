-- =============================================================================
-- Thesis — Migration 002
-- users (id = auth.users.id), families, family_members
-- Tenant key is family_id from day one so a later Family account does not
-- rewrite reports / lots (HANDOFF D21).
-- =============================================================================

insert into schema_migrations (id, name) values (2, '002_users_families.sql');

create table users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           citext unique,
  phone_e164      text unique,
  phone_cc        text,
  full_name       text not null,
  tax_residency   tax_residency not null default 'us',
  tax_slab        text,
  role            app_role not null default 'desk_owner',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint users_email_or_phone check (email is not null or phone_e164 is not null)
);

create trigger users_updated_at
  before update on users for each row execute function set_updated_at();

create table families (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  created_by      uuid not null references users(id),
  plan_id         uuid,
  billing_status  text not null default 'trial',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger families_updated_at
  before update on families for each row execute function set_updated_at();

create table family_members (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  member_role     family_member_role not null default 'owner',
  is_active       boolean not null default true,
  invited_by      uuid references users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (family_id, user_id)
);

create trigger family_members_updated_at
  before update on family_members for each row execute function set_updated_at();

create unique index family_members_one_owner
  on family_members (family_id)
  where member_role = 'owner' and is_active = true;

create index family_members_user_idx
  on family_members (user_id)
  where is_active = true;

-- id = auth.uid(); no separate users.id mapping (avoids invoice-processing C2).
create or replace function current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

create or replace function is_current_user_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from users u
    where u.id = auth.uid() and u.role = 'platform_admin'
  );
$$;

create or replace function accessible_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select fm.family_id
  from family_members fm
  where fm.user_id = auth.uid()
    and fm.is_active = true;
$$;

create or replace function user_can_read_family(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = auth.uid()
      and fm.is_active = true
  );
$$;

create or replace function user_can_write_family(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = auth.uid()
      and fm.is_active = true
      and fm.member_role in ('owner', 'member')
  );
$$;

create or replace function user_is_family_owner(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = auth.uid()
      and fm.is_active = true
      and fm.member_role = 'owner'
  );
$$;
