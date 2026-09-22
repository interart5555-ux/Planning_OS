-- Tempo real e Storage — estado vivo do projeto ALClean a 2026-09-22.
-- Aplicar depois de 01_esquema_publico.sql num projeto NOVO.
--
-- Nada disto entra num `pg_dump --schema public`: a publicação é um objeto
-- global e o bucket/políticas vivem no esquema storage.

-- ---------------------------------------------------------------------------
-- Publicação de tempo real: as 29 tabelas que a app subscreve.
-- Bloco condicional (mesmo padrão da migração 0025): reexecutável.
-- Fora da publicação, de propósito: message_attachments,
-- exec_checklist_template, exec_laundry_template, demo_jobs.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'teams','people','clients','service_locations','units','unit_calendars',
    'absences','jobs','job_assignments','job_checklist_items','job_laundry_counts',
    'job_photos','job_issues','job_events','job_approval_audit',
    'conversations','conversation_participants','messages','message_reads','notices',
    'notice_reads','client_billing','invoices','invoice_payments','team_payments',
    'company_settings','people_pay','unit_rates','location_rates'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Bucket privado das fotografias das limpezas. Caminho: <job_id>/<uuid>.jpg
-- (o check job_photos_caminho_da_limpeza exige que a primeira pasta seja o id
-- da limpeza, e é por isso que as políticas abaixo leem storage.foldername).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-photos', 'job-photos', false, 15728640,
        array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;

drop policy if exists "fotos: gestora gere tudo" on storage.objects;
create policy "fotos: gestora gere tudo" on storage.objects
  for all to authenticated
  using (bucket_id = 'job-photos' and is_manager())
  with check (bucket_id = 'job-photos' and is_manager());

drop policy if exists "fotos: colaboradora vê as suas" on storage.objects;
create policy "fotos: colaboradora vê as suas" on storage.objects
  for select to authenticated
  using (bucket_id = 'job-photos' and assigned_to_me((storage.foldername(name))[1]::uuid));

drop policy if exists "fotos: colaboradora envia as suas" on storage.objects;
create policy "fotos: colaboradora envia as suas" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'job-photos'
    and assigned_to_me((storage.foldername(name))[1]::uuid)
    and exists (
      select 1 from jobs j
      where j.id = (storage.foldername(name))[1]::uuid
        and j.status in ('planned', 'confirmed', 'in_progress')
    )
  );

drop policy if exists "fotos: colaboradora apaga as suas" on storage.objects;
create policy "fotos: colaboradora apaga as suas" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'job-photos'
    and assigned_to_me((storage.foldername(name))[1]::uuid)
    and exists (
      select 1 from jobs j
      where j.id = (storage.foldername(name))[1]::uuid
        and j.status in ('confirmed', 'in_progress')
    )
  );
