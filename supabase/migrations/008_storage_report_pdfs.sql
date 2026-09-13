-- =============================================================================
-- Thesis — Migration 008
-- Private Storage bucket for report PDFs. Path: {family_id}/{report_id}.pdf
-- =============================================================================

insert into schema_migrations (id, name) values (8, '008_storage_report_pdfs.sql');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-pdfs',
  'report-pdfs',
  false,
  26214400,
  array['application/pdf']
)
on conflict (id) do nothing;

drop policy if exists report_pdfs_select on storage.objects;
drop policy if exists report_pdfs_insert on storage.objects;
drop policy if exists report_pdfs_update on storage.objects;
drop policy if exists report_pdfs_delete on storage.objects;

create policy report_pdfs_select on storage.objects for select
  using (
    bucket_id = 'report-pdfs'
    and user_can_read_family((storage.foldername(name))[1]::uuid)
  );

create policy report_pdfs_insert on storage.objects for insert
  with check (
    bucket_id = 'report-pdfs'
    and user_can_write_family((storage.foldername(name))[1]::uuid)
  );

create policy report_pdfs_update on storage.objects for update
  using (
    bucket_id = 'report-pdfs'
    and user_can_write_family((storage.foldername(name))[1]::uuid)
  );

create policy report_pdfs_delete on storage.objects for delete
  using (
    bucket_id = 'report-pdfs'
    and user_can_write_family((storage.foldername(name))[1]::uuid)
  );
