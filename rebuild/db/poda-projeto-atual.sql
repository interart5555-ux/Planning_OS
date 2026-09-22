-- Poda do esquema — para aplicar ao projeto Supabase ATUAL (jhwcpaxdlcefglkcmfrg)
-- ou a qualquer base reconstruída a partir das 35 migrações históricas.
--
-- Auditoria de 2026-09-22. Cada bloco remove ou corrige algo que ficou para
-- trás durante a prototipagem e que nenhum código lê ou escreve (verificado
-- por grep em src/, scripts/ e supabase/functions/, e por leitura do estado
-- vivo em pg_policies, pg_proc, pg_publication_tables).
--
-- Reexecutável: todos os passos são `if exists` ou idempotentes.
-- Depois de aplicar: `npm run rls-check` tem de acabar em
-- "Todas as fronteiras seguras."

-- ---------------------------------------------------------------------------
-- 1. Tabela obsoleta desde a migração 0024 (a tarifa é
--    coalesce(unit_rates.hourly_rate, location_rates.hourly_rate)).
-- ---------------------------------------------------------------------------
drop table if exists billable_units;

-- ---------------------------------------------------------------------------
-- 2. Colunas globais de leitura substituídas por notice_reads (0019).
--    A app lê e escreve só notice_reads (mensagens/repository.ts).
-- ---------------------------------------------------------------------------
alter table notices drop column if exists read;
alter table notices drop column if exists dismissed;

-- ---------------------------------------------------------------------------
-- 3. A vista job_month_stats perdeu `security_invoker` quando foi recriada
--    em 0026 (o advisor do Supabase assinala-a como SECURITY DEFINER VIEW).
--    person_month_jobs e job_approval_facts já o têm.
-- ---------------------------------------------------------------------------
alter view job_month_stats set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- 4. reopen_to só admite os dois destinos que aprov_rever aceita. A regra
--    vivia só dentro da função; passa a viver também na tabela.
-- ---------------------------------------------------------------------------
alter table jobs drop constraint if exists jobs_reopen_to_valido;
alter table jobs add constraint jobs_reopen_to_valido
  check (reopen_to is null or reopen_to in ('Planeado', 'Em curso'));

-- ---------------------------------------------------------------------------
-- 5. search_path uniforme em todas as funções do esquema público:
--    `public, pg_temp`. As campanhas de 0021 e 0025 deixaram 12 funções
--    `invoker` só com `public`, e 0033/0035 regrediram outras três.
-- ---------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
  loop
    execute format('alter function %s set search_path = public, pg_temp', f.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Política de Storage redundante: "fotos: gestora vê tudo" (select) está
--    contida em "fotos: gestora gere tudo" (for all).
-- ---------------------------------------------------------------------------
drop policy if exists "fotos: gestora vê tudo" on storage.objects;

-- ---------------------------------------------------------------------------
-- 7. Índices nas chaves estrangeiras que as leituras da app percorrem
--    (advisor de desempenho: 26 FKs sem índice). Só os caminhos quentes;
--    os restantes são tabelas pequenas ou só de gestão.
-- ---------------------------------------------------------------------------
create index if not exists jobs_unit_idx on jobs (unit_id);
create index if not exists jobs_location_idx on jobs (location_id);
create index if not exists jobs_team_idx on jobs (team_id);
create index if not exists jobs_calendar_idx on jobs (calendar_id);
create index if not exists job_photos_job_idx on job_photos (job_id);
create index if not exists job_issues_job_idx on job_issues (job_id);
create index if not exists job_approval_audit_job_idx on job_approval_audit (job_id, created_at);
create index if not exists conversations_job_idx on conversations (job_id);
create index if not exists conversations_client_idx on conversations (client_id);
create index if not exists messages_from_idx on messages (from_person_id);
create index if not exists message_reads_person_idx on message_reads (person_id);
create index if not exists notice_reads_person_idx on notice_reads (person_id);
create index if not exists unit_calendars_unit_idx on unit_calendars (unit_id);
create index if not exists units_team_idx on units (team_id);
create index if not exists service_locations_team_idx on service_locations (team_id);

-- ---------------------------------------------------------------------------
-- O que NÃO se poda, e porquê:
--  * review_state.'archived' — o Postgres não remove valores de enum; nenhum
--    código o escreve. Fica documentado como valor sem uso.
--  * demo_jobs — usada por scripts/demo-jobs.mjs (só service_role).
--  * jobs.platform (texto) — cópia desnormalizada de unit_calendars.platform
--    que o Planeamento mostra; útil quando o calendário é apagado
--    (calendar_id fica NULL). Mantida de propósito.
-- ---------------------------------------------------------------------------
