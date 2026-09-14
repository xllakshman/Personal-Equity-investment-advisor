-- =============================================================================
-- Thesis — Migration 013
-- analysis_feedback (P5-05). One row per reports.id. No sections, lots, or prompt.
-- =============================================================================

insert into schema_migrations (id, name) values (13, '013_analysis_feedback.sql');

create table analysis_feedback (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families(id) on delete cascade,
  report_id       uuid not null unique references reports(id) on delete cascade,
  user_id         uuid not null references users(id),
  ticker          text not null,
  model_id        text not null references model_catalog(id),
  helpful         boolean not null,
  dim_evidence    smallint,
  dim_decision    smallint,
  dim_bear        smallint,
  dim_next_steps  smallint,
  dim_personal_fit smallint,
  comment         text,
  created_at      timestamptz not null default now(),
  constraint analysis_feedback_dim_evidence_chk
    check (dim_evidence is null or dim_evidence between 1 and 5),
  constraint analysis_feedback_dim_decision_chk
    check (dim_decision is null or dim_decision between 1 and 5),
  constraint analysis_feedback_dim_bear_chk
    check (dim_bear is null or dim_bear between 1 and 5),
  constraint analysis_feedback_dim_next_steps_chk
    check (dim_next_steps is null or dim_next_steps between 1 and 5),
  constraint analysis_feedback_dim_personal_fit_chk
    check (dim_personal_fit is null or dim_personal_fit between 1 and 5),
  constraint analysis_feedback_comment_len
    check (comment is null or char_length(comment) <= 2000)
);

alter table analysis_feedback enable row level security;
alter table analysis_feedback force row level security;

create policy analysis_feedback_select on analysis_feedback
  for select using (
    user_can_read_family(family_id) or is_current_user_platform_admin()
  );

create policy analysis_feedback_insert on analysis_feedback
  for insert with check (
    user_id = auth.uid()
    and user_can_write_family(family_id)
  );

revoke update, delete on analysis_feedback from authenticated, anon;

create or replace function thesis_submit_analysis_feedback(
  p_report_id uuid,
  p_helpful boolean,
  p_dim_evidence smallint default null,
  p_dim_decision smallint default null,
  p_dim_bear smallint default null,
  p_dim_next_steps smallint default null,
  p_dim_personal_fit smallint default null,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid;
  v_ticker text;
  v_model text;
  v_sample boolean;
  v_id uuid;
  v_comment text;
begin
  if p_helpful is null then
    raise exception 'THS-FB-001 helpful required' using errcode = '22023';
  end if;

  select r.family_id, r.ticker, r.model_id, r.is_library_sample
    into v_family, v_ticker, v_model, v_sample
    from reports r
   where r.id = p_report_id;

  if v_family is null then
    raise exception 'THS-FB-002 report not found' using errcode = '42501';
  end if;
  if not user_can_write_family(v_family) then
    raise exception 'THS-FB-002 report not found' using errcode = '42501';
  end if;
  if v_sample then
    raise exception 'THS-FB-003 sample reports have no survey' using errcode = '42501';
  end if;

  v_comment := nullif(trim(coalesce(p_comment, '')), '');
  if v_comment is not null and char_length(v_comment) > 2000 then
    raise exception 'THS-FB-004 comment too long' using errcode = '22023';
  end if;

  insert into analysis_feedback (
    family_id, report_id, user_id, ticker, model_id, helpful,
    dim_evidence, dim_decision, dim_bear, dim_next_steps, dim_personal_fit, comment
  ) values (
    v_family, p_report_id, auth.uid(), v_ticker, v_model, p_helpful,
    p_dim_evidence, p_dim_decision, p_dim_bear, p_dim_next_steps, p_dim_personal_fit,
    v_comment
  )
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    raise exception 'THS-FB-005 already submitted' using errcode = '23505';
end;
$$;

grant execute on function thesis_submit_analysis_feedback(
  uuid, boolean, smallint, smallint, smallint, smallint, smallint, text
) to authenticated;

grant select, insert on analysis_feedback to authenticated;
revoke update, delete on analysis_feedback from authenticated, anon;
