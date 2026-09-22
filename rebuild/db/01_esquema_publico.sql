


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."absence_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."absence_status" OWNER TO "postgres";


CREATE TYPE "public"."absence_type" AS ENUM (
    'ferias',
    'folga',
    'indisponibilidade',
    'formacao',
    'consulta',
    'baixa',
    'nao_comunicada'
);


ALTER TYPE "public"."absence_type" OWNER TO "postgres";


CREATE TYPE "public"."access_status" AS ENUM (
    'none',
    'sent',
    'active',
    'suspended',
    'failed'
);


ALTER TYPE "public"."access_status" OWNER TO "postgres";


CREATE TYPE "public"."billing_cycle" AS ENUM (
    'weekly',
    'monthly',
    'custom'
);


ALTER TYPE "public"."billing_cycle" OWNER TO "postgres";


CREATE TYPE "public"."calendar_platform" AS ENUM (
    'Airbnb',
    'Booking.com',
    'Outro'
);


ALTER TYPE "public"."calendar_platform" OWNER TO "postgres";


CREATE TYPE "public"."calendar_status" AS ENUM (
    'connected',
    'error',
    'none'
);


ALTER TYPE "public"."calendar_status" OWNER TO "postgres";


CREATE TYPE "public"."checklist_kind" AS ENUM (
    'prep',
    'task'
);


ALTER TYPE "public"."checklist_kind" OWNER TO "postgres";


CREATE TYPE "public"."client_status" AS ENUM (
    'active',
    'paused',
    'inactive'
);


ALTER TYPE "public"."client_status" OWNER TO "postgres";


CREATE TYPE "public"."conversation_kind" AS ENUM (
    'equipa',
    'cliente',
    'interna'
);


ALTER TYPE "public"."conversation_kind" OWNER TO "postgres";


CREATE TYPE "public"."issue_type" AS ENUM (
    'atraso',
    'dano',
    'material',
    'acesso',
    'outro'
);


ALTER TYPE "public"."issue_type" OWNER TO "postgres";


CREATE TYPE "public"."job_source" AS ENUM (
    'ical',
    'manual'
);


ALTER TYPE "public"."job_source" OWNER TO "postgres";


CREATE TYPE "public"."job_status" AS ENUM (
    'unpublished',
    'planned',
    'confirmed',
    'in_progress',
    'done'
);


ALTER TYPE "public"."job_status" OWNER TO "postgres";


CREATE TYPE "public"."location_status" AS ENUM (
    'active',
    'paused'
);


ALTER TYPE "public"."location_status" OWNER TO "postgres";


CREATE TYPE "public"."message_state" AS ENUM (
    'sent',
    'delivered',
    'read',
    'scheduled',
    'failed'
);


ALTER TYPE "public"."message_state" OWNER TO "postgres";


CREATE TYPE "public"."person_role" AS ENUM (
    'manager',
    'collab'
);


ALTER TYPE "public"."person_role" OWNER TO "postgres";


CREATE TYPE "public"."review_state" AS ENUM (
    'pending',
    'approved',
    'correction',
    'reopened',
    'archived'
);


ALTER TYPE "public"."review_state" OWNER TO "postgres";


CREATE TYPE "public"."supply_model" AS ENUM (
    'included',
    'client'
);


ALTER TYPE "public"."supply_model" OWNER TO "postgres";


CREATE TYPE "public"."unit_status" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."unit_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."aprov_carimbar_auditoria"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  new.created_at := clock_timestamp();
  if coalesce(current_setting('alclean.fluxo_execucao', true), '') = 'on' then
    new.person_id := null;
  else
    new.person_id := current_person_id();
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."aprov_carimbar_auditoria"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."aprov_margem_atraso_min"() RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$ select 10 $$;


ALTER FUNCTION "public"."aprov_margem_atraso_min"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."aprov_ocorrencias"("p_job" "uuid", "p_duracao_sec" integer DEFAULT NULL::integer) RETURNS "text"[]
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select array_remove(array[
    case when f.anomalias > 0 then 'anomalia' end,
    case when f.atrasada then 'atraso' end,
    case when f.sem_inicio then 'sem_inicio' end,
    case when f.tarefas_em_falta > 0 then 'tarefas' end,
    case when f.roupa_em_falta > 0 then 'roupa' end,
    case when f.duracao_prevista_min > 0 and greatest(0,
        coalesce(round(p_duracao_sec / 60.0)::integer, f.duracao_real_min, 0) - f.duracao_prevista_min)
      > coalesce((select s.duration_tolerance_min from company_settings s where s.id), 30)
      then 'duracao' end
  ], null)
  from job_approval_facts f
  where f.job_id = p_job;
$$;


ALTER FUNCTION "public"."aprov_ocorrencias"("p_job" "uuid", "p_duracao_sec" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."aprov_rever"("p_job" "uuid", "p_acao" "text", "p_nota" "text", "p_para" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_job jobs%rowtype;
  v_nota text := btrim(coalesce(p_nota, ''));
begin
  if not is_manager() then
    raise exception 'Só a gestora pode aprovar, pedir correção ou reabrir.' using errcode = '42501';
  end if;

  select * into v_job from jobs where id = p_job for update;
  if not found then raise exception 'Limpeza não encontrada.'; end if;

  if p_acao = 'aprovar' then
    if v_job.status <> 'done' or v_job.review <> 'pending' then
      raise exception 'Esta limpeza já não está por rever.';
    end if;
    update jobs set review = 'approved', auto_approved = false where id = p_job;
    insert into job_approval_audit (job_id, action, note, tone)
    values (p_job, 'Conclusão aprovada', v_nota, 'ok');

  elsif p_acao = 'corrigir' then
    if v_job.status <> 'done' or v_job.review <> 'pending' then
      raise exception 'Esta limpeza já não está por rever.';
    end if;
    if v_nota = '' then raise exception 'Escreve a mensagem para a colaboradora.'; end if;
    update jobs set review = 'correction' where id = p_job;
    insert into job_approval_audit (job_id, action, note, tone)
    values (p_job, 'Correção pedida', v_nota, 'warn');

  elsif p_acao = 'reabrir' then
    if v_job.status <> 'done' or v_job.review = 'reopened' then
      raise exception 'Só se reabre uma limpeza concluída.';
    end if;
    if coalesce(p_para, '') not in ('Planeado', 'Em curso') then
      raise exception 'Escolhe Planeado ou Em curso.';
    end if;
    if v_nota = '' then raise exception 'Indica o motivo da reabertura.'; end if;
    perform set_config('alclean.fluxo_aprovacao', 'on', true);
    update jobs set
      review = 'reopened', reopen_to = p_para, auto_approved = false,
      status = case when p_para = 'Planeado' then 'planned' else 'in_progress' end::job_status
    where id = p_job;
    perform set_config('alclean.fluxo_aprovacao', 'off', true);
    insert into job_approval_audit (job_id, action, note, tone)
    values (p_job, 'Reaberta · novo estado: ' || p_para, v_nota, 'vio');

  else
    raise exception 'Ação desconhecida: %.', p_acao;
  end if;
end $$;


ALTER FUNCTION "public"."aprov_rever"("p_job" "uuid", "p_acao" "text", "p_nota" "text", "p_para" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assigned_to_me"("job" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1 from job_assignments a
    join jobs j on j.id = a.job_id
    where a.job_id = job and a.person_id = current_person_id()
      and j.status <> 'unpublished'
  )
$$;


ALTER FUNCTION "public"."assigned_to_me"("job" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."avisar_leitura"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  r record;
begin
  for r in
    select m.conversation_id, n.person_id, p.name as leitora,
           (array_agg(m.text order by m.created_at desc))[1] as texto
    from novas n
    join messages m on m.id = n.message_id
    join people p on p.id = n.person_id and p.role <> 'manager'
    join people autor on autor.id = m.from_person_id and autor.role = 'manager'
    group by m.conversation_id, n.person_id, p.name
  loop
    delete from notices
    where type = 'confirm' and target_type = 'conv' and target_id = r.conversation_id and person_id = r.person_id;
    insert into notices (type, priority, audience, icon, title, text, action, target_type, target_id, person_id)
    values ('confirm', 'info', 'gestao', 'checkCircle', 'Mensagem lida',
            r.leitora || ' leu: «' || left(r.texto, 80) || case when char_length(r.texto) > 80 then '…' else '' end || '»',
            'Ver conversa', 'conv', r.conversation_id, r.person_id);
  end loop;
  return null;
end $$;


ALTER FUNCTION "public"."avisar_leitura"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."aviso_ical"("p_job" "uuid", "p_titulo" "text", "p_texto" "text", "p_prioridade" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  delete from notices
  where target_type = 'job' and target_id = p_job and type in ('reservation', 'priority');

  insert into notices (type, priority, audience, icon, title, text, action, target_type, target_id)
  values ('reservation', p_prioridade, 'gestao', 'calendar', p_titulo, p_texto,
          'Abrir no Planeamento', 'job', p_job);
end $$;


ALTER FUNCTION "public"."aviso_ical"("p_job" "uuid", "p_titulo" "text", "p_texto" "text", "p_prioridade" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."checklist_guard_collab_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if is_manager() then return new; end if;
  if new.id is distinct from old.id
     or new.job_id is distinct from old.job_id
     or new.kind is distinct from old.kind
     or new.position is distinct from old.position
     or new.label is distinct from old.label then
    raise exception 'Uma colaboradora só pode marcar ou desmarcar a tarefa.';
  end if;
  perform exec_trancar_limpeza_aberta(new.job_id);
  return new;
end $$;


ALTER FUNCTION "public"."checklist_guard_collab_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."commit_location_detail"("p_location_id" "uuid", "p_name" "text", "p_address" "text", "p_image" "text", "p_status" "public"."location_status", "p_service_ids" "text"[], "p_team_id" "uuid", "p_hourly_rate" numeric, "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_cleaning_min" integer, "p_access_instructions" "text", "p_notes" "text", "p_units" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_unit jsonb;
  v_cal jsonb;
  v_unit_id uuid;
  v_cal_id uuid;
  v_unit_min integer;
  v_seen_units uuid[] := '{}';
  v_seen_cals uuid[];
begin
  if p_cleaning_min is not null and p_cleaning_min not between 15 and 600 then
    raise exception 'A duração de uma limpeza tem de estar entre 15 e 600 minutos.' using errcode = '22023';
  end if;

  update service_locations set
    name = p_name, address = p_address, image = p_image, status = p_status,
    service_ids = p_service_ids, team_id = p_team_id,
    checkout_time = p_checkout_time, checkin_time = p_checkin_time,
    cleaning_min = p_cleaning_min,
    access_instructions = p_access_instructions, notes = p_notes
  where id = p_location_id;
  if not found then raise exception 'Local não encontrado.'; end if;

  if p_hourly_rate is null then
    delete from location_rates where location_id = p_location_id;
  else
    insert into location_rates (location_id, hourly_rate) values (p_location_id, p_hourly_rate)
    on conflict (location_id) do update set hourly_rate = excluded.hourly_rate;
  end if;

  for v_unit in select * from jsonb_array_elements(coalesce(p_units, '[]'::jsonb)) loop
    begin
      v_unit_id := (v_unit->>'id')::uuid;
    exception when invalid_text_representation then
      v_unit_id := null;
    end;
    if v_unit_id is not null and not exists (select 1 from units where id = v_unit_id and location_id = p_location_id) then
      v_unit_id := null;
    end if;

    -- `nullif(…, '')` pelo mesmo motivo que as horas logo abaixo: um campo
    -- deixado vazio no browser chega como string vazia, e `''::int` rebentava
    -- a transação inteira em vez de significar "herda do alojamento".
    v_unit_min := nullif(v_unit->>'cleaningMin', '')::integer;
    if v_unit_min is not null and v_unit_min not between 15 and 600 then
      raise exception 'A duração de uma limpeza tem de estar entre 15 e 600 minutos (%).', coalesce(v_unit->>'name', '?')
        using errcode = '22023';
    end if;

    if v_unit_id is null then
      insert into units (location_id, name, type, capacity, status, team_id, laundry, checkout_time, checkin_time, cleaning_min)
      values (p_location_id, v_unit->>'name', v_unit->>'type', coalesce((v_unit->>'capacity')::int, 2),
        coalesce((v_unit->>'status')::unit_status, 'active'), nullif(v_unit->>'teamId', '')::uuid,
        nullif(v_unit->'laundry', 'null'::jsonb), nullif(v_unit->>'checkoutTime', '')::time, nullif(v_unit->>'checkinTime', '')::time,
        v_unit_min)
      returning id into v_unit_id;
    else
      update units set
        name = v_unit->>'name', type = v_unit->>'type', capacity = (v_unit->>'capacity')::int,
        status = (v_unit->>'status')::unit_status, team_id = nullif(v_unit->>'teamId', '')::uuid,
        laundry = nullif(v_unit->'laundry', 'null'::jsonb),
        checkout_time = nullif(v_unit->>'checkoutTime', '')::time, checkin_time = nullif(v_unit->>'checkinTime', '')::time,
        cleaning_min = v_unit_min
      where id = v_unit_id;
    end if;

    v_seen_units := v_seen_units || v_unit_id;

    if (v_unit->>'hourlyRate') is null then
      delete from unit_rates where unit_id = v_unit_id;
    else
      insert into unit_rates (unit_id, hourly_rate) values (v_unit_id, (v_unit->>'hourlyRate')::numeric)
      on conflict (unit_id) do update set hourly_rate = excluded.hourly_rate;
    end if;

    v_seen_cals := '{}';
    for v_cal in select * from jsonb_array_elements(coalesce(v_unit->'calendars', '[]'::jsonb)) loop
      begin
        v_cal_id := (v_cal->>'id')::uuid;
      exception when invalid_text_representation then
        v_cal_id := null;
      end;
      if v_cal_id is not null and not exists (select 1 from unit_calendars where id = v_cal_id and unit_id = v_unit_id) then
        v_cal_id := null;
      end if;

      if v_cal_id is null then
        -- Um calendário novo nasce por ler: 'none', sem data, zero importadas.
        -- É o sincronizador que lhe dá estado, na primeira vez que o ler — e
        -- as três colunas ficam com o `default` da tabela, que diz isso mesmo.
        insert into unit_calendars (unit_id, platform, url)
        values (v_unit_id, (v_cal->>'platform')::calendar_platform, coalesce(v_cal->>'url', ''))
        returning id into v_cal_id;
      else
        -- SÓ a plataforma e o endereço. `status`, `last_sync` e `imported` são
        -- do sincronizador: este ecrã nunca os sabe melhor do que ele.
        update unit_calendars set
          platform = (v_cal->>'platform')::calendar_platform,
          url = coalesce(v_cal->>'url', '')
        where id = v_cal_id;
      end if;
      v_seen_cals := v_seen_cals || v_cal_id;
    end loop;
    delete from unit_calendars where unit_id = v_unit_id and not (id = any(v_seen_cals));
  end loop;

  delete from units where location_id = p_location_id and not (id = any(v_seen_units));
end $$;


ALTER FUNCTION "public"."commit_location_detail"("p_location_id" "uuid", "p_name" "text", "p_address" "text", "p_image" "text", "p_status" "public"."location_status", "p_service_ids" "text"[], "p_team_id" "uuid", "p_hourly_rate" numeric, "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_cleaning_min" integer, "p_access_instructions" "text", "p_notes" "text", "p_units" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."conversa_criada_por_mim"("conv" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (select 1 from conversations
                 where id = conv and created_by = current_person_id())
$$;


ALTER FUNCTION "public"."conversa_criada_por_mim"("conv" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."conversations_apaga_avisos"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  delete from notices where target_type = 'conv' and target_id = old.id;
  return old;
end $$;


ALTER FUNCTION "public"."conversations_apaga_avisos"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_job"("p_location" "uuid", "p_unit" "uuid", "p_scheduled_on" "date", "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_checkin_same_day" boolean, "p_note" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_id uuid;
  v_loc uuid;
  v_checkout time;
  v_checkin time;
  v_unit_status unit_status;
  v_location_status location_status;
begin
  select d.location_id, d.checkout_time, d.checkin_time
    into v_loc, v_checkout, v_checkin
  from unit_defaults(p_unit) d;

  if v_loc is null then
    raise exception 'Quarto não encontrado.' using errcode = 'P0001';
  end if;

  -- O alojamento não é aceite tal como vem: tem de ser mesmo o do quarto. Um
  -- ecrã com dados velhos mandaria o par errado, e a limpeza aparecia no
  -- alojamento de outro cliente.
  if p_location is distinct from v_loc then
    raise exception 'Este quarto não pertence ao alojamento indicado.' using errcode = 'P0001';
  end if;

  -- Estado do quarto e do alojamento: ver a nota de decisão no topo do
  -- ficheiro. unit_defaults (0030) não filtra por estado de propósito, por
  -- isso é aqui, na criação manual, que um inativo/pausado é recusado.
  select u.status, l.status into v_unit_status, v_location_status
  from units u
  join service_locations l on l.id = u.location_id
  where u.id = p_unit;

  if v_unit_status is distinct from 'active' then
    raise exception 'Este quarto está inativo.' using errcode = 'P0001';
  end if;

  if v_location_status is distinct from 'active' then
    raise exception 'Este alojamento está em pausa.' using errcode = 'P0001';
  end if;

  if p_scheduled_on is null then
    raise exception 'Falta o dia da limpeza.' using errcode = 'P0001';
  end if;

  -- A mesma regra que `jobs_fim_depois_do_inicio` (0024) já impõe, dita aqui
  -- para a gestora receber uma frase em vez do texto cru da restrição.
  if p_ends_at is null or p_starts_at is null or p_ends_at <= p_starts_at then
    raise exception 'A limpeza tem de acabar depois de começar.' using errcode = 'P0001';
  end if;

  -- stay_date = scheduled_on: uma limpeza criada à mão nasce no dia da saída
  -- que a gestora escolheu. calendar_id e ical_uid ficam nulos — é isso que
  -- distingue uma limpeza manual, e é isso que `usePlanningModule.ts:125` já
  -- exige para a deixar apagar.
  -- As horas da estadia são carimbadas pela HERANÇA do quarto, não pelo que o
  -- browser mandou: são um facto do alojamento, não uma escolha do formulário.
  insert into jobs (
    unit_id, location_id, team_id, scheduled_on, starts_at, ends_at,
    status, source, platform, stay_date, checkin_same_day,
    checkout_time, checkin_time, manager_note
  )
  select p_unit, v_loc, d.team_id, p_scheduled_on, p_starts_at, p_ends_at,
         'unpublished', 'manual', null, p_scheduled_on, coalesce(p_checkin_same_day, false),
         v_checkout, v_checkin, coalesce(btrim(p_note), '')
  from unit_defaults(p_unit) d
  returning id into v_id;

  return v_id;
end $$;


ALTER FUNCTION "public"."create_job"("p_location" "uuid", "p_unit" "uuid", "p_scheduled_on" "date", "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_checkin_same_day" boolean, "p_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_job"("p_location" "uuid", "p_unit" "uuid", "p_scheduled_on" "date", "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_checkin_same_day" boolean, "p_note" "text") IS 'Cria uma limpeza manual, por publicar. security invoker: só a gestora passa no RLS de jobs. Recusa um quarto inativo ou um alojamento em pausa — decisão da Tarefa 2 sobre o resíduo da Tarefa 1 (unit_defaults não filtra por estado); ver o comentário no topo do ficheiro da migração. As flags do cliente são carimbadas pelo trigger jobs_stamp_client_flags (0013).';



CREATE OR REPLACE FUNCTION "public"."criar_conversa"("p_kind" "public"."conversation_kind", "p_title" "text", "p_client" "uuid", "p_job" "uuid", "p_participantes" "uuid"[], "p_texto" "text", "p_agendada_local" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_eu uuid := current_person_id();
  v_id uuid := gen_random_uuid();
  v_agendada timestamptz;
  v_texto text := btrim(coalesce(p_texto, ''));
begin
  if v_eu is null then
    raise exception 'Sessão sem pessoa associada.' using errcode = '42501';
  end if;
  if p_kind = 'cliente' and p_client is null then
    raise exception 'Uma conversa com cliente precisa do cliente.';
  end if;
  if char_length(v_texto) > 1000 then
    raise exception 'A mensagem tem mais de 1000 caracteres.';
  end if;
  if p_agendada_local is not null and p_agendada_local <> '' then
    -- A data e hora escolhidas na app são de Lisboa.
    v_agendada := (p_agendada_local::timestamp at time zone 'Europe/Lisbon');
    if v_agendada <= now() then
      raise exception 'A hora de envio tem de ser posterior a agora.';
    end if;
  end if;

  -- Sem RETURNING: ela só vê a conversa depois de ser participante.
  insert into conversations (id, kind, title, client_id, job_id, created_by)
  values (v_id, p_kind, coalesce(p_title, ''), p_client, p_job, v_eu);

  insert into conversation_participants (conversation_id, person_id)
  select distinct v_id, x from unnest(array_append(coalesce(p_participantes, '{}'), v_eu)) as x
  where x is not null;

  if v_texto <> '' then
    insert into messages (conversation_id, from_person_id, text, state, scheduled_for)
    values (v_id, v_eu, v_texto,
            case when v_agendada is null then 'sent' else 'scheduled' end::message_state, v_agendada);
  end if;
  return v_id;
end $$;


ALTER FUNCTION "public"."criar_conversa"("p_kind" "public"."conversation_kind", "p_title" "text", "p_client" "uuid", "p_job" "uuid", "p_participantes" "uuid"[], "p_texto" "text", "p_agendada_local" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_person_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select id from people
  where auth_user_id = auth.uid() and not archived and access = 'active'
$$;


ALTER FUNCTION "public"."current_person_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enviar_mensagem"("p_conv" "uuid", "p_texto" "text", "p_agendada_local" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_id uuid;
  v_agendada timestamptz;
  v_texto text := btrim(coalesce(p_texto, ''));
begin
  if v_texto = '' then
    raise exception 'A mensagem está vazia.';
  end if;
  if char_length(v_texto) > 1000 then
    raise exception 'A mensagem tem mais de 1000 caracteres.';
  end if;
  if p_agendada_local is not null and p_agendada_local <> '' then
    v_agendada := (p_agendada_local::timestamp at time zone 'Europe/Lisbon');
    if v_agendada <= now() then
      raise exception 'A hora de envio tem de ser posterior a agora.';
    end if;
  end if;
  insert into messages (conversation_id, from_person_id, text, state, scheduled_for)
  values (p_conv, current_person_id(), v_texto,
          case when v_agendada is null then 'sent' else 'scheduled' end::message_state, v_agendada)
  returning id into v_id;
  return v_id;
end $$;


ALTER FUNCTION "public"."enviar_mensagem"("p_conv" "uuid", "p_texto" "text", "p_agendada_local" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enviar_nova_mensagem"("p_itens" "jsonb", "p_texto" "text", "p_job" "uuid", "p_agendada_local" "text") RETURNS "uuid"[]
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  it jsonb;
  v_ids uuid[] := '{}';
  v_conv uuid;
begin
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Escolhe pelo menos um destinatário.';
  end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    v_conv := nullif(it->>'conv', '')::uuid;
    if v_conv is not null then
      perform enviar_mensagem(v_conv, p_texto, p_agendada_local);
      if p_job is not null and is_manager() then
        update conversations set job_id = p_job where id = v_conv and job_id is distinct from p_job;
      end if;
    else
      v_conv := criar_conversa(
        (it->>'kind')::conversation_kind,
        coalesce(it->>'title', ''),
        nullif(it->>'client', '')::uuid,
        p_job,
        coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(it->'participants', '[]'::jsonb)) as x), '{}'),
        p_texto,
        p_agendada_local);
    end if;
    v_ids := v_ids || v_conv;
  end loop;
  return v_ids;
end $$;


ALTER FUNCTION "public"."enviar_nova_mensagem"("p_itens" "jsonb", "p_texto" "text", "p_job" "uuid", "p_agendada_local" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_add_issue"("p_job" "uuid", "p_type" "public"."issue_type", "p_delay_min" integer, "p_description" "text", "p_photo_id" "uuid", "p_event" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_id uuid;
begin
  if p_photo_id is not null and not exists (
    select 1 from job_photos where id = p_photo_id and job_id = p_job
  ) then
    raise exception 'A fotografia não pertence a esta limpeza.';
  end if;
  insert into job_issues (job_id, type, delay_min, description, photo_id)
  values (p_job, p_type, p_delay_min, coalesce(btrim(p_description), ''), p_photo_id)
  returning id into v_id;
  perform exec_insert_events(p_job,
    jsonb_build_array(jsonb_build_object('text', p_event, 'tone', 'bad')));
  return v_id;
end $$;


ALTER FUNCTION "public"."exec_add_issue"("p_job" "uuid", "p_type" "public"."issue_type", "p_delay_min" integer, "p_description" "text", "p_photo_id" "uuid", "p_event" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_add_photo"("p_job" "uuid", "p_path" "text", "p_kind" "text", "p_event" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_id uuid;
begin
  if split_part(p_path, '/', 1) <> p_job::text then
    raise exception 'O caminho da fotografia não pertence a esta limpeza.';
  end if;
  insert into job_photos (job_id, storage_path, kind)
  values (p_job, p_path, coalesce(p_kind, ''))
  returning id into v_id;
  perform exec_insert_events(p_job, jsonb_build_array(jsonb_build_object('text', p_event)));
  return v_id;
end $$;


ALTER FUNCTION "public"."exec_add_photo"("p_job" "uuid", "p_path" "text", "p_kind" "text", "p_event" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_carimbar_autoria"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if is_manager() then
    new.created_at := coalesce(new.created_at, clock_timestamp());
    return new;
  end if;
  new.created_at := clock_timestamp();
  new.person_id := current_person_id();
  return new;
end $$;


ALTER FUNCTION "public"."exec_carimbar_autoria"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_insert_events"("p_job" "uuid", "p_events" "jsonb") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  insert into job_events (job_id, person_id, text, tone, created_at)
  select p_job, current_person_id(), e.value->>'text',
         coalesce(e.value->>'tone', 'neutral'),
         now() + (e.ordinality * interval '1 millisecond')
  from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) with ordinality as e(value, ordinality);
$$;


ALTER FUNCTION "public"."exec_insert_events"("p_job" "uuid", "p_events" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_materializar"("p_job" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  j jobs%rowtype;
  v_setup jsonb;
begin
  select * into j from jobs where id = p_job;
  if not found then return; end if;

  if not exists (select 1 from job_checklist_items where job_id = p_job and kind = 'prep') then
    insert into job_checklist_items (job_id, kind, position, label)
    select p_job, 'prep', (row_number() over (order by t.ordem)) - 1, t.label
    from exec_checklist_template t
    where t.kind = 'prep'
      and (t.condicao is null
           or (t.condicao = 'material' and not j.supplies_own_products)
           or (t.condicao = 'lavandaria' and j.laundry_collection_active))
    on conflict do nothing;
  end if;

  if not exists (select 1 from job_checklist_items where job_id = p_job and kind = 'task') then
    insert into job_checklist_items (job_id, kind, position, label)
    select p_job, 'task', (row_number() over (order by t.ordem)) - 1, t.label
    from exec_checklist_template t where t.kind = 'task'
    on conflict do nothing;
  end if;

  if not exists (select 1 from job_laundry_counts where job_id = p_job) then
    select c.laundry_setup into v_setup
    from service_locations l join clients c on c.id = l.client_id
    where l.id = j.location_id;
    insert into job_laundry_counts (job_id, item, planned, counted)
    select p_job, t.item,
           coalesce((v_setup ->> t.chave_cliente)::integer, 0),
           coalesce((v_setup ->> t.chave_cliente)::integer, 0)
    from exec_laundry_template t
    on conflict do nothing;
  end if;
end $$;


ALTER FUNCTION "public"."exec_materializar"("p_job" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_trancar_limpeza_aberta"("p_job" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_estado job_status;
begin
  if is_manager() then return; end if;
  select status into v_estado from jobs where id = p_job for share;
  if v_estado is null or v_estado not in ('planned', 'confirmed', 'in_progress') then
    raise exception 'Esta limpeza já não pode ser alterada pela colaboradora.';
  end if;
end $$;


ALTER FUNCTION "public"."exec_trancar_limpeza_aberta"("p_job" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_transicao_valida"("p_de" "public"."job_status", "p_para" "public"."job_status") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select (p_de, p_para) in (
    ('planned'::job_status, 'confirmed'::job_status),
    ('planned', 'in_progress'),
    ('confirmed', 'in_progress'),
    ('in_progress', 'done'));
$$;


ALTER FUNCTION "public"."exec_transicao_valida"("p_de" "public"."job_status", "p_para" "public"."job_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exec_transition"("p_job" "uuid", "p_status" "public"."job_status", "p_notes" "text", "p_qty" "jsonb", "p_events" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_job jobs%rowtype;
  v_concluir boolean;
  v_duracao integer;
  v_auto boolean := false;
begin
  if current_person_id() is null or not (assigned_to_me(p_job) or is_manager()) then
    raise exception 'Limpeza não encontrada.' using errcode = '42501';
  end if;

  select * into v_job from jobs where id = p_job for update;
  if not found then raise exception 'Limpeza não encontrada.'; end if;

  if not is_manager() and v_job.status in ('done', 'unpublished') then
    raise exception 'Esta limpeza já não pode ser alterada pela colaboradora.';
  end if;

  if p_status is not null and p_status is distinct from v_job.status
     and not exec_transicao_valida(v_job.status, p_status) then
    raise exception 'Mudança de estado inválida: % → %.', v_job.status, p_status;
  end if;

  if p_qty is not null then
    update job_laundry_counts c set
      counted = (q.value)::integer,
      confirmed = (q.value)::integer
    from jsonb_each_text(p_qty) q
    where c.job_id = p_job and c.item = q.key;
  end if;

  v_concluir := p_status = 'done' and v_job.status = 'in_progress';
  if v_concluir then
    v_duracao := greatest(60, round(extract(epoch from now() - coalesce(v_job.started_at, now()))))::integer;
    v_auto := v_job.review is distinct from 'reopened'
      and v_job.reopen_to is null
      and cardinality(aprov_ocorrencias(p_job, v_duracao)) = 0;
  end if;

  perform set_config('alclean.fluxo_execucao', 'on', true);
  update jobs set
    status = coalesce(p_status, status),
    started_at = case when p_status = 'in_progress' and v_job.status <> 'in_progress'
      then coalesce(started_at, now()) else started_at end,
    finished_at = case when p_status = 'done' and v_job.status <> 'done' then now() else finished_at end,
    duration_sec = case when v_concluir then v_duracao
      when p_status = 'done' and v_job.status <> 'done'
      then greatest(60, round(extract(epoch from now() - coalesce(started_at, now()))))::integer
      else duration_sec end,
    review = case when v_concluir then (case when v_auto then 'approved' else 'pending' end)::review_state
      else review end,
    auto_approved = case when v_concluir then v_auto else auto_approved end,
    notes = coalesce(p_notes, notes)
  where id = p_job;

  if v_auto then
    insert into job_approval_audit (job_id, action, note, tone)
    values (p_job, 'Aprovada automaticamente', 'Checklist completa e sem ocorrências.', 'ok');
  end if;
  perform set_config('alclean.fluxo_execucao', 'off', true);

  perform exec_insert_events(p_job, p_events);
end $$;


ALTER FUNCTION "public"."exec_transition"("p_job" "uuid", "p_status" "public"."job_status", "p_notes" "text", "p_qty" "jsonb", "p_events" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_manager"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1 from people
    where auth_user_id = auth.uid() and role = 'manager' and not archived and access = 'active'
  )
$$;


ALTER FUNCTION "public"."is_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."job_assignments_guard_fechada"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_status job_status;
begin
  select status into v_status from jobs where id = old.job_id;

  -- Sem limpeza pai: ou a limpeza está a ser apagada agora (cascata — a linha
  -- do pai já não existe quando o filho é apagado), ou nunca existiu. Em
  -- qualquer dos casos não há histórico a proteger.
  if not found then return old; end if;

  if v_status = 'done' then
    raise exception 'Uma limpeza concluída não muda de quem a fez. Reabre-a pelas Aprovações se for mesmo preciso corrigir.';
  end if;

  return old;
end $$;


ALTER FUNCTION "public"."job_assignments_guard_fechada"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."job_assignments_guard_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_status_antigo job_status;
  v_status_novo job_status;
begin
  -- Nada mudou de facto: um UPDATE que reescreve a linha com os mesmos
  -- valores não reescreve história nenhuma, e não vale a pena recusá-lo.
  if new.job_id is not distinct from old.job_id
     and new.person_id is not distinct from old.person_id
     and new.hours is not distinct from old.hours then
    return new;
  end if;

  select status into v_status_antigo from jobs where id = old.job_id;
  if found and v_status_antigo = 'done' then
    raise exception 'Uma limpeza concluída não muda de quem a fez nem das horas registadas. Reabre-a pelas Aprovações se for mesmo preciso corrigir.';
  end if;

  -- Mover uma atribuição PARA uma limpeza concluída inventa trabalho num mês
  -- fechado — o mesmo estrago, do outro lado.
  if new.job_id is distinct from old.job_id then
    select status into v_status_novo from jobs where id = new.job_id;
    if found and v_status_novo = 'done' then
      raise exception 'Não se acrescenta quem fez o trabalho a uma limpeza já concluída. Reabre-a pelas Aprovações se for mesmo preciso corrigir.';
    end if;
  end if;

  return new;
end $$;


ALTER FUNCTION "public"."job_assignments_guard_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."job_from_ical"("p_calendar" "uuid", "p_uid" "text", "p_stay_date" "date", "p_checkin_same_day" boolean) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_unit uuid;
  v_platform text;
  v_loc uuid;
  v_team uuid;
  v_checkout time;
  v_checkin time;
  v_dur integer;
  v_job jobs%rowtype;
  v_hoje date;
  v_inicio_min integer;
  v_fim_min integer;
  v_ends time;
  v_atribuida boolean;
  v_quarto text;
begin
  v_hoje := (now() at time zone 'Europe/Lisbon')::date;

  select c.unit_id, c.platform::text into v_unit, v_platform
  from unit_calendars c where c.id = p_calendar;
  if v_unit is null then
    raise exception 'Calendário não encontrado.' using errcode = 'P0001';
  end if;

  select d.location_id, d.team_id, d.checkout_time, d.checkin_time, d.cleaning_min
    into v_loc, v_team, v_checkout, v_checkin, v_dur
  from unit_defaults(v_unit) d;
  if v_loc is null then
    raise exception 'O quarto deste calendário já não existe.' using errcode = 'P0001';
  end if;

  select u.name into v_quarto from units u where u.id = v_unit;

  -- O passado nunca é tocado.
  if p_stay_date < v_hoje then
    return 'ignorada';
  end if;

  -- O fim é o início mais a duração, travado às 23:59: a restrição
  -- `jobs_fim_depois_do_inicio` (0024) tem de continuar satisfeita, e uma
  -- limpeza que atravessa a meia-noite não existe neste negócio.
  -- Feito em minutos de propósito: `time '23:00' + interval '2 hours'` em
  -- Postgres dá `01:00`, e não `23:59` — a soma direta dá a volta ao relógio.
  v_inicio_min := extract(hour from v_checkout)::int * 60 + extract(minute from v_checkout)::int;
  v_fim_min := least(v_inicio_min + v_dur, 23 * 60 + 59);
  if v_fim_min <= v_inicio_min then
    -- Hora de saída às 23:59 ou depois: não cabe limpeza nenhuma nesse dia.
    return 'ignorada';
  end if;
  v_ends := make_time(v_fim_min / 60, v_fim_min % 60, 0);

  select * into v_job from jobs
  where calendar_id = p_calendar and ical_uid = p_uid
  for update;

  -- ---------------------------------------------------------- evento novo
  if v_job.id is null then
    insert into jobs (
      unit_id, location_id, team_id, scheduled_on, starts_at, ends_at,
      status, source, platform, stay_date, checkin_same_day,
      checkout_time, checkin_time, calendar_id, ical_uid
    ) values (
      v_unit, v_loc, v_team, p_stay_date, v_checkout, v_ends,
      'unpublished', 'ical', v_platform, p_stay_date, coalesce(p_checkin_same_day, false),
      v_checkout, v_checkin, p_calendar, p_uid
    ) returning * into v_job;

    if na_semana_em_curso(p_stay_date) then
      perform aviso_ical(
        v_job.id,
        case when coalesce(p_checkin_same_day, false)
             then 'Reserva nova esta semana, com entrada no mesmo dia'
             else 'Reserva nova esta semana' end,
        format('%s (%s): limpeza a %s às %s.%s', v_quarto, v_platform,
               to_char(p_stay_date, 'DD/MM'), to_char(v_checkout, 'HH24:MI'),
               case when coalesce(p_checkin_same_day, false)
                    then format(' Entram hóspedes nesse dia às %s — prioridade alta, tem de acabar antes.',
                                to_char(v_checkin, 'HH24:MI'))
                    else '' end),
        case when coalesce(p_checkin_same_day, false) then 'alta' else 'media' end);
    end if;
    return 'criada';
  end if;

  -- ------------------------------------ evento conhecido: o que já está feito
  -- Uma limpeza em curso ou concluída nunca é tocada, em nenhuma circunstância.
  if v_job.status in ('in_progress', 'done') then
    return 'ignorada';
  end if;

  -- Nem uma limpeza cujo dia já passou.
  if v_job.scheduled_on < v_hoje then
    return 'ignorada';
  end if;

  -- ------------------------------------ evento conhecido, nada mudou
  if v_job.stay_date = p_stay_date
     and v_job.checkin_same_day = coalesce(p_checkin_same_day, false) then
    return 'inalterada';
  end if;

  select exists (select 1 from job_assignments a where a.job_id = v_job.id) into v_atribuida;

  -- ------------------------- por publicar e sem ninguém: muda-se em silêncio
  -- "Em silêncio" quer dizer sem pedir decisão à gestora — não quer dizer sem
  -- aviso: `mensagens.md:15` manda avisar de uma ALTERAÇÃO na semana em curso,
  -- e uma limpeza que muda de dia dentro desta semana é precisamente isso.
  if v_job.status = 'unpublished' and not v_atribuida then
    update jobs set
      scheduled_on = p_stay_date,
      stay_date = p_stay_date,
      starts_at = v_checkout,
      ends_at = v_ends,
      checkin_same_day = coalesce(p_checkin_same_day, false)
    where id = v_job.id;

    if na_semana_em_curso(p_stay_date) or na_semana_em_curso(v_job.stay_date) then
      perform aviso_ical(
        v_job.id,
        'Reserva mudou de dia',
        format('%s (%s): a limpeza passou de %s para %s. Ainda não estava atribuída nem publicada, por isso já foi movida.',
               v_quarto, v_platform, to_char(v_job.stay_date, 'DD/MM'), to_char(p_stay_date, 'DD/MM')),
        'media');
    end if;
    return 'atualizada';
  end if;

  -- ------------------------- atribuída ou publicada: não se toca, avisa-se
  -- A app NUNCA desfaz sozinha trabalho já atribuído ou publicado por causa de
  -- uma alteração no calendário (decisão 3, validada com a empresa). Avisa a
  -- gestora e ela decide.
  if na_semana_em_curso(p_stay_date) or na_semana_em_curso(v_job.stay_date) then
    perform aviso_ical(
      v_job.id,
      'Reserva mudou e a limpeza já está marcada',
      format('%s (%s): a reserva passou de %s para %s, mas a limpeza já está %s. Não lhe toquei — decide tu no Planeamento.',
             v_quarto, v_platform, to_char(v_job.stay_date, 'DD/MM'), to_char(p_stay_date, 'DD/MM'),
             case when v_atribuida then 'atribuída' else 'publicada' end),
      'alta');
  end if;
  return 'avisada';
end $$;


ALTER FUNCTION "public"."job_from_ical"("p_calendar" "uuid", "p_uid" "text", "p_stay_date" "date", "p_checkin_same_day" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."job_from_ical"("p_calendar" "uuid", "p_uid" "text", "p_stay_date" "date", "p_checkin_same_day" boolean) IS 'Cria ou atualiza a limpeza de um evento de calendário. Só service_role. Devolve criada | atualizada | inalterada | avisada | ignorada.';



CREATE OR REPLACE FUNCTION "public"."job_ical_desaparecidos"("p_calendar" "uuid", "p_uids" "text"[]) RETURNS "text"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_hoje date;
  v_resultado text[] := '{}';
  v_linha record;
  v_atribuida boolean;
  v_quarto text;
  v_platform text;
begin
  v_hoje := (now() at time zone 'Europe/Lisbon')::date;

  select u.name, c.platform::text into v_quarto, v_platform
  from unit_calendars c join units u on u.id = c.unit_id
  where c.id = p_calendar;
  if v_quarto is null then
    raise exception 'Calendário não encontrado.' using errcode = 'P0001';
  end if;

  for v_linha in
    select j.* from jobs j
    where j.calendar_id = p_calendar
      and j.ical_uid is not null
      and not (j.ical_uid = any (coalesce(p_uids, '{}')))
      and j.scheduled_on >= v_hoje
      and j.status not in ('in_progress', 'done')
    for update
  loop
    select exists (select 1 from job_assignments a where a.job_id = v_linha.id) into v_atribuida;

    if v_linha.status = 'unpublished' and not v_atribuida then
      delete from jobs where id = v_linha.id;
      v_resultado := v_resultado || ('apagada:' || v_linha.id::text);
    else
      if na_semana_em_curso(v_linha.scheduled_on) then
        perform aviso_ical(
          v_linha.id,
          'Reserva cancelada e a limpeza já está marcada',
          format('%s (%s): a reserva de %s desapareceu do calendário, mas a limpeza já está %s. Não lhe toquei — decide tu no Planeamento.',
                 v_quarto, v_platform, to_char(v_linha.scheduled_on, 'DD/MM'),
                 case when v_atribuida then 'atribuída' else 'publicada' end),
          'alta');
      end if;
      v_resultado := v_resultado || ('avisada:' || v_linha.id::text);
    end if;
  end loop;

  return v_resultado;
end $$;


ALTER FUNCTION "public"."job_ical_desaparecidos"("p_calendar" "uuid", "p_uids" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."job_ical_desaparecidos"("p_calendar" "uuid", "p_uids" "text"[]) IS 'Trata as limpezas deste calendário cujo evento já não existe. NUNCA chamar depois de uma leitura falhada: um calendário ilegível não é um calendário vazio.';



CREATE OR REPLACE FUNCTION "public"."job_issues_trancar"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  perform exec_trancar_limpeza_aberta(new.job_id);
  return new;
end $$;


ALTER FUNCTION "public"."job_issues_trancar"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jobs_guard_collab_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_fluxo boolean := coalesce(current_setting('alclean.fluxo_execucao', true), '') = 'on';
  v_decisao boolean;
begin
  -- Sem `auth.uid()` (service_role: o sincronizador do iCal, manutenção) não
  -- há guarda. Ver a nota no topo desta secção da migração 0032.
  if auth.uid() is null then return new; end if;

  if is_manager() then return new; end if;

  if old.status in ('done', 'unpublished') then
    raise exception 'Esta limpeza já não pode ser alterada pela colaboradora.';
  end if;

  v_decisao := v_fluxo
    and old.status = 'in_progress' and new.status = 'done'
    and ((new.review = 'approved' and new.auto_approved)
         or (new.review = 'pending' and not new.auto_approved));

  if new.id is distinct from old.id
     or (not v_decisao and new.review is distinct from old.review)
     or (not v_decisao and new.auto_approved is distinct from old.auto_approved)
     or new.reopen_to is distinct from old.reopen_to
     or new.scheduled_on is distinct from old.scheduled_on
     or new.starts_at is distinct from old.starts_at
     or new.ends_at is distinct from old.ends_at
     or new.team_id is distinct from old.team_id
     or new.unit_id is distinct from old.unit_id
     or new.location_id is distinct from old.location_id
     or new.manager_note is distinct from old.manager_note
     or new.supplies_own_products is distinct from old.supplies_own_products
     or new.laundry_collection_active is distinct from old.laundry_collection_active
     or new.stay_date is distinct from old.stay_date
     or new.checkin_time is distinct from old.checkin_time
     or new.checkout_time is distinct from old.checkout_time
     or new.checkin_same_day is distinct from old.checkin_same_day
     or new.source is distinct from old.source
     or new.platform is distinct from old.platform
     or new.created_at is distinct from old.created_at then
    raise exception 'Uma colaboradora só pode alterar o estado e o registo da limpeza.';
  end if;

  if not v_fluxo and (
       new.status is distinct from old.status
       or new.started_at is distinct from old.started_at
       or new.finished_at is distinct from old.finished_at
       or new.duration_sec is distinct from old.duration_sec) then
    raise exception 'O estado e as horas da limpeza só mudam pelas ações da app (confirmar, iniciar, concluir).';
  end if;

  if new.status is distinct from old.status and not exec_transicao_valida(old.status, new.status) then
    raise exception 'Mudança de estado inválida: % → %.', old.status, new.status;
  end if;

  return new;
end $$;


ALTER FUNCTION "public"."jobs_guard_collab_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jobs_guard_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if auth.uid() is not null and old.status in ('in_progress', 'done') then
    raise exception 'Uma limpeza em curso ou concluída não pode ser eliminada.';
  end if;
  return old;
end $$;


ALTER FUNCTION "public"."jobs_guard_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jobs_guard_fechada"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- Sem `auth.uid()` (service_role, manutenção) não há guarda: senão os
  -- scripts deixavam de conseguir arrumar a base de dados.
  if auth.uid() is null then return new; end if;
  if old.status not in ('in_progress', 'done') then return new; end if;

  if new.scheduled_on is distinct from old.scheduled_on
     or new.starts_at is distinct from old.starts_at
     or new.ends_at is distinct from old.ends_at
     or new.team_id is distinct from old.team_id
     or new.unit_id is distinct from old.unit_id
     or new.location_id is distinct from old.location_id then
    raise exception 'Uma limpeza em curso ou concluída não muda de horário, de equipa nem de local.';
  end if;

  -- 'in_progress' juntou-se à lista: reabrir uma limpeza concluída é voltar
  -- atrás, mesmo quando o estado de destino não é um estado de planeamento.
  if new.status is distinct from old.status
     and new.status in ('unpublished', 'planned', 'confirmed', 'in_progress')
     and coalesce(current_setting('alclean.fluxo_aprovacao', true), '') <> 'on' then
    raise exception 'Uma limpeza em curso ou concluída só volta atrás pela revisão das Aprovações.';
  end if;

  return new;
end $$;


ALTER FUNCTION "public"."jobs_guard_fechada"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jobs_materializar_listas"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  perform exec_materializar(new.id);
  return null;
end $$;


ALTER FUNCTION "public"."jobs_materializar_listas"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jobs_stamp_client_flags"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  select coalesce(b.supply, 'client') = 'client', c.laundry_enabled
    into new.supplies_own_products, new.laundry_collection_active
  from service_locations l
  join clients c on c.id = l.client_id
  left join client_billing b on b.client_id = c.id
  where l.id = new.location_id;
  return new;
end $$;


ALTER FUNCTION "public"."jobs_stamp_client_flags"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."laundry_guard_collab_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if is_manager() then return new; end if;
  if new.job_id is distinct from old.job_id
     or new.item is distinct from old.item
     or new.planned is distinct from old.planned then
    raise exception 'Uma colaboradora só pode registar as quantidades contadas.';
  end if;
  perform exec_trancar_limpeza_aberta(new.job_id);
  return new;
end $$;


ALTER FUNCTION "public"."laundry_guard_collab_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."marcar_conversa_lida"("conv" "uuid") RETURNS "void"
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  insert into message_reads (message_id, person_id)
  select m.id, current_person_id() from messages m
  where m.conversation_id = conv
    and m.from_person_id is distinct from current_person_id()
    and (m.state <> 'scheduled' or m.scheduled_for <= now())
  on conflict do nothing
$$;


ALTER FUNCTION "public"."marcar_conversa_lida"("conv" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."messages_autoria"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- Sem sessão (service_role, tarefas do servidor): fica como veio.
  if auth.uid() is null then return new; end if;
  if is_manager() then
    new.from_person_id := coalesce(new.from_person_id, current_person_id());
    new.created_at := coalesce(new.created_at, now());
  else
    new.from_person_id := current_person_id();
    new.created_at := now();
    -- A colaboradora não marca as suas mensagens como entregues ou lidas.
    if new.state is distinct from 'scheduled' or new.scheduled_for is null or new.scheduled_for <= now() then
      new.state := 'sent';
      new.scheduled_for := null;
    end if;
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."messages_autoria"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."messages_reabre_conversa"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  update conversations set resolved = false where id = new.conversation_id and resolved;
  return new;
end $$;


ALTER FUNCTION "public"."messages_reabre_conversa"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_team_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select team_id from people
  where auth_user_id = auth.uid() and not archived and access = 'active'
$$;


ALTER FUNCTION "public"."my_team_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."na_semana_em_curso"("p_dia" "date") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select p_dia >= date_trunc('week', (now() at time zone 'Europe/Lisbon')::date)::date
     and p_dia <  (date_trunc('week', (now() at time zone 'Europe/Lisbon')::date) + interval '7 days')::date
$$;


ALTER FUNCTION "public"."na_semana_em_curso"("p_dia" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."participo_na_conversa"("conv" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (select 1 from conversation_participants
                 where conversation_id = conv and person_id = current_person_id())
$$;


ALTER FUNCTION "public"."participo_na_conversa"("conv" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."people_guard_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- Ninguém apaga a sua própria conta: ficaria sem pessoa, sem sessão útil e
  -- sem ninguém com permissão para a repor.
  if auth.uid() is not null and old.auth_user_id = auth.uid() then
    raise exception 'Não podes eliminar a tua própria conta. Pede a outra pessoa com acesso de gestão.';
  end if;

  -- Com limpezas concluídas, apagar reescreve o passado (custo de equipa,
  -- margem, aprovações). O caminho é arquivar.
  if exists (
    select 1 from job_assignments a
    join jobs j on j.id = a.job_id
    where a.person_id = old.id and j.status = 'done'
  ) then
    raise exception 'Esta pessoa tem limpezas concluídas: arquiva-a em vez de a eliminares.';
  end if;

  return old;
end $$;


ALTER FUNCTION "public"."people_guard_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."people_guard_self"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  if auth.uid() is not null and old.auth_user_id = auth.uid()
     and (new.access is distinct from old.access
          or new.archived is distinct from old.archived
          or new.role is distinct from old.role
          or new.auth_user_id is distinct from old.auth_user_id) then
    raise exception 'Não podes alterar o teu próprio acesso, arquivo ou função.';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."people_guard_self"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rev_set_supply"("p_client" "uuid", "p_supply" "public"."supply_model", "p_supplement" numeric, "p_amounts" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  r record;
begin
  if not is_manager() then
    raise exception 'Só a gestora altera o fornecimento de produtos.' using errcode = '42501';
  end if;
  if p_supplement is null or p_supplement < 0 then
    raise exception 'Suplemento inválido.';
  end if;

  insert into client_billing (client_id, supply, supplement)
  values (p_client, p_supply, p_supplement)
  on conflict (client_id) do update
    set supply = excluded.supply, supplement = excluded.supplement;

  -- Só faturas deste cliente e ainda sem nenhum pagamento registado.
  for r in
    select (e->>'id')::uuid as id, (e->>'amount')::numeric as amount
    from jsonb_array_elements(coalesce(p_amounts, '[]'::jsonb)) e
  loop
    update invoices i set amount = r.amount
    where i.id = r.id and i.client_id = p_client
      and not exists (select 1 from invoice_payments p where p.invoice_id = i.id);
  end loop;
end $$;


ALTER FUNCTION "public"."rev_set_supply"("p_client" "uuid", "p_supply" "public"."supply_model", "p_supplement" numeric, "p_amounts" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" boolean DEFAULT true NOT NULL,
    "duration_tolerance_min" integer DEFAULT 30 NOT NULL,
    "health_limits" "jsonb" DEFAULT '{"team": [55, 62], "margin": [35, 25], "products": [4, 6], "receipts": [70, 50]}'::"jsonb" NOT NULL,
    "travel_included" boolean DEFAULT true NOT NULL,
    "name" "text" DEFAULT 'ALClean'::"text" NOT NULL,
    "address" "text" DEFAULT ''::"text" NOT NULL,
    "phone" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "default_checkout_time" time without time zone DEFAULT '11:00:00'::time without time zone NOT NULL,
    "default_checkin_time" time without time zone DEFAULT '15:00:00'::time without time zone NOT NULL,
    "default_cleaning_min" integer DEFAULT 120 NOT NULL,
    CONSTRAINT "company_settings_duracao_valida" CHECK ((("default_cleaning_min" >= 15) AND ("default_cleaning_min" <= 600))),
    CONSTRAINT "company_settings_horas_validas" CHECK (("default_checkin_time" > "default_checkout_time")),
    CONSTRAINT "company_settings_nome_nao_vazio" CHECK (("length"("btrim"("name")) > 0)),
    CONSTRAINT "company_settings_singleton" CHECK ("id"),
    CONSTRAINT "company_settings_tolerancia_valida" CHECK ((("duration_tolerance_min" >= 0) AND ("duration_tolerance_min" <= 480)))
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."company_settings"."name" IS 'Nome da empresa. Aparece na barra de topo de todos os módulos (AppTopBar). O ecrã de entrada NÃO o usa: settings_read exige sessão, e quem ainda não entrou não o pode ler.';



COMMENT ON COLUMN "public"."company_settings"."default_checkout_time" IS 'Hora de saída sugerida ao CRIAR um alojamento novo. Não toca nos alojamentos existentes: cada um guarda as suas em service_locations.';



COMMENT ON COLUMN "public"."company_settings"."default_checkin_time" IS 'Hora de entrada sugerida ao CRIAR um alojamento novo. Ver default_checkout_time.';



COMMENT ON COLUMN "public"."company_settings"."default_cleaning_min" IS 'Duração de uma limpeza, em minutos, quando nem o quarto nem o alojamento dizem outra coisa. Decisão validada com a ALClean: a duração é POR QUARTO.';



CREATE OR REPLACE FUNCTION "public"."save_company_settings"("p_name" "text", "p_address" "text", "p_phone" "text", "p_email" "text", "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_default_cleaning_min" integer, "p_duration_tolerance_min" integer, "p_travel_included" boolean) RETURNS "public"."company_settings"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v company_settings;
begin
  -- O `check` da coluna diz o mesmo, mas diz-lho em linguagem de Postgres
  -- ("new row for relation … violates check constraint"). Esta mensagem é a
  -- que a gestora lê no toast quando o ecrã falha a validação do browser —
  -- por um teclado numérico que aceita a colagem de um valor absurdo, por
  -- exemplo.
  if p_default_cleaning_min is null or p_default_cleaning_min not between 15 and 600 then
    raise exception 'A duração de uma limpeza tem de estar entre 15 e 600 minutos.' using errcode = '22023';
  end if;

  update company_settings set
    name = btrim(p_name),
    address = btrim(p_address),
    phone = btrim(p_phone),
    email = btrim(p_email),
    default_checkout_time = p_checkout_time,
    default_checkin_time = p_checkin_time,
    default_cleaning_min = p_default_cleaning_min,
    duration_tolerance_min = p_duration_tolerance_min,
    travel_included = p_travel_included
  where id
  returning * into v;

  -- Zero linhas é sempre falta de permissão: a linha única existe desde 0003
  -- (`insert into company_settings (id) values (true)`), por isso só o RLS a
  -- pode esconder de um `update`.
  if v.id is null then
    raise exception 'Sem permissão para alterar os dados da empresa.' using errcode = '42501';
  end if;

  -- As metas de saúde financeira ficam de fora de propósito: continuam a
  -- editar-se em Rendimentos (`saveHealthLimits`), ao lado do painel que
  -- colorem — quatro pares de números que só se percebem a olhar para ele.
  return v;
end $$;


ALTER FUNCTION "public"."save_company_settings"("p_name" "text", "p_address" "text", "p_phone" "text", "p_email" "text", "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_default_cleaning_min" integer, "p_duration_tolerance_min" integer, "p_travel_included" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_job"("p_id" "uuid", "p_scheduled_on" "date", "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_team_id" "uuid", "p_status" "public"."job_status", "p_assignees" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_estado job_status;
begin
  select status into v_estado from jobs where id = p_id for update;
  if not found then raise exception 'Trabalho não encontrado.'; end if;
  if v_estado in ('in_progress', 'done') then
    raise exception 'Esta limpeza já começou ou está concluída: não se altera no Planeamento.';
  end if;
  if p_status is null or p_status not in ('unpublished', 'planned', 'confirmed') then
    raise exception 'O Planeamento não muda uma limpeza para %.', p_status;
  end if;

  update jobs set
    scheduled_on = p_scheduled_on,
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    team_id = p_team_id,
    status = p_status
  where id = p_id;
  if not found then raise exception 'Trabalho não encontrado.'; end if;

  delete from job_assignments where job_id = p_id;
  insert into job_assignments (job_id, person_id, hours)
  select p_id, (a->>'person_id')::uuid, (a->>'hours')::numeric
  from jsonb_array_elements(coalesce(p_assignees, '[]'::jsonb)) as a;
end $$;


ALTER FUNCTION "public"."save_job"("p_id" "uuid", "p_scheduled_on" "date", "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_team_id" "uuid", "p_status" "public"."job_status", "p_assignees" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unit_defaults"("p_unit" "uuid") RETURNS TABLE("location_id" "uuid", "team_id" "uuid", "checkout_time" time without time zone, "checkin_time" time without time zone, "cleaning_min" integer)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select l.id,
         coalesce(u.team_id, l.team_id),
         coalesce(u.checkout_time, l.checkout_time),
         coalesce(u.checkin_time, l.checkin_time),
         coalesce(u.cleaning_min, l.cleaning_min, s.default_cleaning_min)
  from units u
  join service_locations l on l.id = u.location_id
  cross join company_settings s
  where u.id = p_unit and s.id
$$;


ALTER FUNCTION "public"."unit_defaults"("p_unit" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unit_defaults"("p_unit" "uuid") IS 'O que um quarto herda: alojamento, equipa por defeito, hora de saída, hora de entrada e duração da limpeza. Zero linhas se o quarto não existir (ou não for legível por quem chama).';



CREATE OR REPLACE FUNCTION "public"."upsert_client"("p_id" "uuid", "p_name" "text", "p_segment" "text", "p_nif" "text", "p_contact" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_status" "public"."client_status", "p_notes" "text", "p_laundry_enabled" boolean, "p_laundry_setup" "jsonb", "p_image" "text", "p_since" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_id uuid;
begin
  if p_id is null then
    insert into clients (name, segment, nif, contact, email, phone, address,
      status, notes, laundry_enabled, laundry_setup, image, since)
    values (p_name, p_segment, p_nif, p_contact, p_email, p_phone, p_address,
      p_status, p_notes, p_laundry_enabled, p_laundry_setup, p_image, p_since)
    returning id into v_id;
    insert into client_billing (client_id) values (v_id);
  else
    update clients set
      name = p_name, segment = p_segment, nif = p_nif, contact = p_contact,
      email = p_email, phone = p_phone, address = p_address, status = p_status,
      notes = p_notes, laundry_enabled = p_laundry_enabled, laundry_setup = p_laundry_setup
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Cliente não encontrado.'; end if;
  end if;
  return v_id;
end $$;


ALTER FUNCTION "public"."upsert_client"("p_id" "uuid", "p_name" "text", "p_segment" "text", "p_nif" "text", "p_contact" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_status" "public"."client_status", "p_notes" "text", "p_laundry_enabled" boolean, "p_laundry_setup" "jsonb", "p_image" "text", "p_since" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_location"("p_id" "uuid", "p_client_id" "uuid", "p_name" "text", "p_address" "text", "p_image" "text", "p_status" "public"."location_status", "p_service_ids" "text"[], "p_team_id" "uuid", "p_hourly_rate" numeric, "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_cleaning_min" integer, "p_unit_names" "text"[], "p_unit_type" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_id uuid; v_name text;
begin
  -- NULL é um valor legítimo e quer dizer "herda da empresa" — é por isso que
  -- a coluna é `nullable`. Só um número FORA dos limites é um engano.
  if p_cleaning_min is not null and p_cleaning_min not between 15 and 600 then
    raise exception 'A duração de uma limpeza tem de estar entre 15 e 600 minutos.' using errcode = '22023';
  end if;

  if p_id is null then
    insert into service_locations (client_id, name, address, image, status,
      service_ids, team_id, checkout_time, checkin_time, cleaning_min)
    values (p_client_id, p_name, p_address, p_image, p_status, p_service_ids,
      p_team_id, p_checkout_time, p_checkin_time, p_cleaning_min)
    returning id into v_id;
    if p_unit_names is not null then
      foreach v_name in array p_unit_names loop
        insert into units (location_id, name, type, capacity) values (v_id, v_name, p_unit_type, 2);
      end loop;
    end if;
  else
    update service_locations set
      name = p_name, address = p_address, image = p_image, status = p_status,
      service_ids = p_service_ids, team_id = p_team_id,
      checkout_time = p_checkout_time, checkin_time = p_checkin_time,
      cleaning_min = p_cleaning_min
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Local não encontrado.'; end if;
  end if;

  if p_hourly_rate is null then
    delete from location_rates where location_id = v_id;
  else
    insert into location_rates (location_id, hourly_rate) values (v_id, p_hourly_rate)
    on conflict (location_id) do update set hourly_rate = excluded.hourly_rate;
  end if;

  return v_id;
end $$;


ALTER FUNCTION "public"."upsert_location"("p_id" "uuid", "p_client_id" "uuid", "p_name" "text", "p_address" "text", "p_image" "text", "p_status" "public"."location_status", "p_service_ids" "text"[], "p_team_id" "uuid", "p_hourly_rate" numeric, "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_cleaning_min" integer, "p_unit_names" "text"[], "p_unit_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_person"("p_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "public"."person_role", "p_team_id" "uuid", "p_rate" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare v_id uuid;
begin
  if p_id is null then
    insert into people (name, email, phone, role, team_id)
    values (p_name, p_email, p_phone, p_role, p_team_id)
    returning id into v_id;
  else
    update people set name = p_name, email = p_email, phone = p_phone,
                      role = p_role, team_id = p_team_id
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Colaborador não encontrado.'; end if;
  end if;

  if p_rate is null then
    delete from people_pay where person_id = v_id;
  else
    insert into people_pay (person_id, per_job_rate) values (v_id, p_rate)
    on conflict (person_id) do update set per_job_rate = excluded.per_job_rate;
  end if;

  return v_id;
end $$;


ALTER FUNCTION "public"."upsert_person"("p_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "public"."person_role", "p_team_id" "uuid", "p_rate" numeric) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."absences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "person_id" "uuid" NOT NULL,
    "type" "public"."absence_type" NOT NULL,
    "starts_on" "date" NOT NULL,
    "ends_on" "date" NOT NULL,
    "all_day" boolean DEFAULT true NOT NULL,
    "starts_at" time without time zone,
    "ends_at" time without time zone,
    "status" "public"."absence_status" DEFAULT 'approved'::"public"."absence_status" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "absences_range" CHECK (("ends_on" >= "starts_on"))
);


ALTER TABLE "public"."absences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_billing" (
    "client_id" "uuid" NOT NULL,
    "cycle" "public"."billing_cycle" DEFAULT 'custom'::"public"."billing_cycle" NOT NULL,
    "terms" integer DEFAULT 0 NOT NULL,
    "supply" "public"."supply_model" DEFAULT 'client'::"public"."supply_model" NOT NULL,
    "supplement" numeric(10,2) DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."client_billing" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_billing" IS 'Omissões da ALClean: cycle=custom (quinzenal), terms=0 (à vista), supply=client.';



CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "segment" "text" DEFAULT ''::"text" NOT NULL,
    "nif" "text" DEFAULT ''::"text" NOT NULL,
    "contact" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "phone" "text" DEFAULT ''::"text" NOT NULL,
    "address" "text" DEFAULT ''::"text" NOT NULL,
    "status" "public"."client_status" DEFAULT 'active'::"public"."client_status" NOT NULL,
    "image" "text" DEFAULT 'facade'::"text" NOT NULL,
    "since" "text" DEFAULT ''::"text" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "laundry_enabled" boolean DEFAULT false NOT NULL,
    "laundry_setup" "jsonb" DEFAULT '{"banho": 0, "rosto": 0, "lencol": 0, "edredon": 0, "fronhas": 0}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "conversation_id" "uuid" NOT NULL,
    "person_id" "uuid" NOT NULL
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kind" "public"."conversation_kind" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "client_id" "uuid",
    "job_id" "uuid",
    "priority" "text" DEFAULT ''::"text" NOT NULL,
    "resolved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "conversations_cliente_tem_cliente" CHECK ((("kind" <> 'cliente'::"public"."conversation_kind") OR ("client_id" IS NOT NULL)))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."conversations"."created_by" IS 'Quem iniciou a conversa. É o que permite à colaboradora juntar-se à sua própria conversa sem se poder juntar às dos outros.';



CREATE TABLE IF NOT EXISTS "public"."demo_jobs" (
    "job_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."demo_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."demo_jobs" IS 'Limpezas de demonstração criadas por scripts/demo-jobs.mjs. A marca vive fora de jobs para que editar a nota da limpeza não a torne "real". Só service_role (RLS ligado, sem políticas).';



CREATE TABLE IF NOT EXISTS "public"."exec_checklist_template" (
    "kind" "public"."checklist_kind" NOT NULL,
    "ordem" integer NOT NULL,
    "label" "text" NOT NULL,
    "condicao" "text",
    CONSTRAINT "exec_checklist_template_condicao_check" CHECK (("condicao" = ANY (ARRAY['material'::"text", 'lavandaria'::"text"])))
);


ALTER TABLE "public"."exec_checklist_template" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exec_laundry_template" (
    "item" "text" NOT NULL,
    "ordem" integer NOT NULL,
    "chave_cliente" "text" NOT NULL
);


ALTER TABLE "public"."exec_laundry_template" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "paid_on" "date" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "method" "text" DEFAULT ''::"text" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "registered_by" "uuid"
);


ALTER TABLE "public"."invoice_payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoice_payments" IS 'O estado da fatura (paga/pendente/em atraso) é DEDUZIDO daqui e de due_on. Nunca guardar esse estado.';



CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "month" "text" NOT NULL,
    "period_from" "date" NOT NULL,
    "period_to" "date" NOT NULL,
    "issued_on" "date" NOT NULL,
    "due_on" "date" NOT NULL,
    "amount" numeric(10,2) NOT NULL
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_approval_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "person_id" "uuid",
    "action" "text" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "tone" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_approval_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_approval_audit" IS 'Append-only: nunca editar nem apagar.';



CREATE TABLE IF NOT EXISTS "public"."job_checklist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "kind" "public"."checklist_kind" NOT NULL,
    "position" integer NOT NULL,
    "label" "text" NOT NULL,
    "done" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."job_checklist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_issues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "type" "public"."issue_type" NOT NULL,
    "delay_min" integer,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "photo_id" "uuid",
    "person_id" "uuid"
);


ALTER TABLE "public"."job_issues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_laundry_counts" (
    "job_id" "uuid" NOT NULL,
    "item" "text" NOT NULL,
    "planned" integer DEFAULT 0 NOT NULL,
    "counted" integer DEFAULT 0 NOT NULL,
    "confirmed" integer
);


ALTER TABLE "public"."job_laundry_counts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "unit_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "team_id" "uuid",
    "scheduled_on" "date" NOT NULL,
    "starts_at" time without time zone NOT NULL,
    "ends_at" time without time zone NOT NULL,
    "status" "public"."job_status" DEFAULT 'unpublished'::"public"."job_status" NOT NULL,
    "source" "public"."job_source" DEFAULT 'manual'::"public"."job_source" NOT NULL,
    "platform" "text",
    "stay_date" "date" NOT NULL,
    "checkin_same_day" boolean DEFAULT false NOT NULL,
    "checkout_time" time without time zone NOT NULL,
    "checkin_time" time without time zone NOT NULL,
    "supplies_own_products" boolean DEFAULT false NOT NULL,
    "laundry_collection_active" boolean DEFAULT false NOT NULL,
    "manager_note" "text" DEFAULT ''::"text" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "duration_sec" integer,
    "review" "public"."review_state" DEFAULT 'pending'::"public"."review_state" NOT NULL,
    "reopen_to" "text",
    "auto_approved" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "calendar_id" "uuid",
    "ical_uid" "text",
    CONSTRAINT "jobs_fim_depois_do_inicio" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "jobs_reopen_to_valido" CHECK ((("reopen_to" IS NULL) OR ("reopen_to" = ANY (ARRAY['Planeado'::"text", 'Em curso'::"text"]))))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."jobs"."checkin_same_day" IS 'true quando há entrada de hóspedes no mesmo dia da saída: é o critério de prioridade alta do Planeamento.';



COMMENT ON COLUMN "public"."jobs"."review" IS 'Só relevante depois de status=done. "Em atraso" NUNCA é guardado — é calculado a partir de starts_at e do relógio.';



COMMENT ON COLUMN "public"."jobs"."calendar_id" IS 'Calendário iCal de onde esta limpeza nasceu. NULL nas limpezas manuais. ON DELETE SET NULL e não CASCADE: apagar um calendário não pode apagar trabalho já feito.';



COMMENT ON COLUMN "public"."jobs"."ical_uid" IS 'UID do evento no calendário de origem. Estável entre descarregamentos — é por ele que o sincronizador reconhece a mesma reserva. NULL nas limpezas manuais.';



CREATE OR REPLACE VIEW "public"."job_approval_facts" WITH ("security_invoker"='true') AS
 SELECT "id" AS "job_id",
    (("scheduled_on" + "starts_at") AT TIME ZONE 'Europe/Lisbon'::"text") AS "inicio_previsto",
    COALESCE(("started_at" > ((("scheduled_on" + "starts_at") AT TIME ZONE 'Europe/Lisbon'::"text") + "make_interval"("mins" => "public"."aprov_margem_atraso_min"()))), false) AS "atrasada",
        CASE
            WHEN ("ends_at" > "starts_at") THEN ((EXTRACT(epoch FROM ("ends_at" - "starts_at")) / (60)::numeric))::integer
            WHEN ("ends_at" < "starts_at") THEN (((EXTRACT(epoch FROM ("ends_at" - "starts_at")) / (60)::numeric))::integer + 1440)
            ELSE 0
        END AS "duracao_prevista_min",
        CASE
            WHEN ("duration_sec" IS NULL) THEN NULL::integer
            ELSE ("round"((("duration_sec")::numeric / 60.0)))::integer
        END AS "duracao_real_min",
    (( SELECT "count"(*) AS "count"
           FROM "public"."job_issues" "i"
          WHERE ("i"."job_id" = "j"."id")))::integer AS "anomalias",
    (( SELECT "count"(*) AS "count"
           FROM "public"."job_checklist_items" "c"
          WHERE (("c"."job_id" = "j"."id") AND ("c"."kind" = 'task'::"public"."checklist_kind") AND (NOT "c"."done"))))::integer AS "tarefas_em_falta",
    (( SELECT "count"(*) AS "count"
           FROM "public"."job_laundry_counts" "l"
          WHERE (("l"."job_id" = "j"."id") AND (COALESCE("l"."confirmed", "l"."counted") < "l"."planned"))))::integer AS "roupa_em_falta",
    (("started_at" IS NULL) AND ("status" = ANY (ARRAY['in_progress'::"public"."job_status", 'done'::"public"."job_status"]))) AS "sem_inicio"
   FROM "public"."jobs" "j";


ALTER VIEW "public"."job_approval_facts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_assignments" (
    "job_id" "uuid" NOT NULL,
    "person_id" "uuid" NOT NULL,
    "hours" numeric(4,2) DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."job_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "person_id" "uuid",
    "text" "text" NOT NULL,
    "tone" "text" DEFAULT 'neutral'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_events" IS 'Append-only: nunca editar nem apagar.';



CREATE TABLE IF NOT EXISTS "public"."service_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text" DEFAULT ''::"text" NOT NULL,
    "status" "public"."location_status" DEFAULT 'active'::"public"."location_status" NOT NULL,
    "image" "text" DEFAULT 'facade'::"text" NOT NULL,
    "service_ids" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "team_id" "uuid",
    "checkout_time" time without time zone DEFAULT '11:00:00'::time without time zone NOT NULL,
    "checkin_time" time without time zone DEFAULT '15:00:00'::time without time zone NOT NULL,
    "access_instructions" "text" DEFAULT ''::"text" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cleaning_min" integer,
    CONSTRAINT "service_locations_duracao_valida" CHECK ((("cleaning_min" IS NULL) OR (("cleaning_min" >= 15) AND ("cleaning_min" <= 600))))
);


ALTER TABLE "public"."service_locations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."service_locations"."access_instructions" IS 'Indicações de acesso em texto livre. NUNCA guardar códigos, chaves ou combinações: regra de segurança da ALClean.';



COMMENT ON COLUMN "public"."service_locations"."cleaning_min" IS 'Minutos por limpeza neste alojamento. NULL = herda da empresa.';



CREATE OR REPLACE VIEW "public"."job_month_stats" WITH ("security_invoker"='true') AS
 SELECT "to_char"(("j"."scheduled_on")::timestamp with time zone, 'YYYY-MM'::"text") AS "month",
    "l"."client_id",
    "j"."unit_id",
    ("count"(*))::integer AS "jobs",
    ("sum"(
        CASE
            WHEN ("j"."ends_at" > "j"."starts_at") THEN (EXTRACT(epoch FROM ("j"."ends_at" - "j"."starts_at")) / 3600.0)
            WHEN ("j"."ends_at" < "j"."starts_at") THEN ((EXTRACT(epoch FROM ("j"."ends_at" - "j"."starts_at")) / 3600.0) + (24)::numeric)
            ELSE (0)::numeric
        END))::numeric(10,2) AS "hours"
   FROM ("public"."jobs" "j"
     JOIN "public"."service_locations" "l" ON (("l"."id" = "j"."location_id")))
  WHERE (("j"."status" = 'done'::"public"."job_status") AND "public"."is_manager"())
  GROUP BY ("to_char"(("j"."scheduled_on")::timestamp with time zone, 'YYYY-MM'::"text")), "l"."client_id", "j"."unit_id";


ALTER VIEW "public"."job_month_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."job_month_stats" IS 'Limpezas concluídas por mês (de Lisboa: scheduled_on é a data local) e quarto. Horas = duração planeada (ends_at − starts_at). Só a gestora vê linhas.';



CREATE TABLE IF NOT EXISTS "public"."job_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "kind" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "job_photos_caminho_da_limpeza" CHECK (("split_part"("storage_path", '/'::"text", 1) = ("job_id")::"text"))
);


ALTER TABLE "public"."job_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_rates" (
    "location_id" "uuid" NOT NULL,
    "hourly_rate" numeric(10,2)
);


ALTER TABLE "public"."location_rates" OWNER TO "postgres";


COMMENT ON TABLE "public"."location_rates" IS 'Tarifa por omissão do alojamento; um quarto sem tarifa própria herda esta.';



CREATE TABLE IF NOT EXISTS "public"."message_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "size" "text" DEFAULT ''::"text" NOT NULL,
    "kind" "text" DEFAULT 'file'::"text" NOT NULL
);


ALTER TABLE "public"."message_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reads" (
    "message_id" "uuid" NOT NULL,
    "person_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."message_reads" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_reads" IS 'Substitui o booleano unread da Fase 1: com vários participantes, o estado de leitura é por pessoa.';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "from_person_id" "uuid" NOT NULL,
    "text" "text" DEFAULT ''::"text" NOT NULL,
    "state" "public"."message_state" DEFAULT 'sent'::"public"."message_state" NOT NULL,
    "scheduled_for" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notice_reads" (
    "notice_id" "uuid" NOT NULL,
    "person_id" "uuid" NOT NULL,
    "dismissed" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notice_reads" OWNER TO "postgres";


COMMENT ON TABLE "public"."notice_reads" IS 'Aviso lido/dispensado por pessoa. Substitui notices.read/dismissed, que eram globais.';



CREATE TABLE IF NOT EXISTS "public"."notices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "priority" "text" DEFAULT 'info'::"text" NOT NULL,
    "audience" "text" DEFAULT 'todos'::"text" NOT NULL,
    "icon" "text" DEFAULT ''::"text" NOT NULL,
    "title" "text" NOT NULL,
    "text" "text" DEFAULT ''::"text" NOT NULL,
    "action" "text" DEFAULT ''::"text" NOT NULL,
    "target_type" "text",
    "target_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "person_id" "uuid"
);


ALTER TABLE "public"."notices" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notices"."person_id" IS 'Pessoa a que o aviso se refere (ex.: quem leu a mensagem). Usado para não repetir avisos.';



CREATE TABLE IF NOT EXISTS "public"."people" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "phone" "text" DEFAULT ''::"text" NOT NULL,
    "role" "public"."person_role" DEFAULT 'collab'::"public"."person_role" NOT NULL,
    "team_id" "uuid",
    "access" "public"."access_status" DEFAULT 'none'::"public"."access_status" NOT NULL,
    "since" "date" DEFAULT CURRENT_DATE NOT NULL,
    "archived" boolean DEFAULT false NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."people" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."people_pay" (
    "person_id" "uuid" NOT NULL,
    "per_job_rate" numeric(10,2),
    "travel_per_job" numeric(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "people_pay_travel_per_job_check" CHECK (("travel_per_job" >= (0)::numeric))
);


ALTER TABLE "public"."people_pay" OWNER TO "postgres";


COMMENT ON TABLE "public"."people_pay" IS 'Valor por limpeza, fora de `people` porque a colaboradora lê `people` para ver a equipa.';



COMMENT ON COLUMN "public"."people_pay"."travel_per_job" IS 'Deslocações pagas por limpeza concluída (€). Só entram no custo de equipa quando company_settings.travel_included está ligado. Não são faturadas ao cliente.';



CREATE OR REPLACE VIEW "public"."person_month_jobs" WITH ("security_invoker"='true') AS
 SELECT "to_char"(("j"."scheduled_on")::timestamp with time zone, 'YYYY-MM'::"text") AS "month",
    "a"."person_id",
    ("count"(*))::integer AS "jobs"
   FROM ("public"."job_assignments" "a"
     JOIN "public"."jobs" "j" ON (("j"."id" = "a"."job_id")))
  WHERE (("j"."status" = 'done'::"public"."job_status") AND "public"."is_manager"())
  GROUP BY ("to_char"(("j"."scheduled_on")::timestamp with time zone, 'YYYY-MM'::"text")), "a"."person_id";


ALTER VIEW "public"."person_month_jobs" OWNER TO "postgres";


COMMENT ON VIEW "public"."person_month_jobs" IS 'Limpezas concluídas por pessoa e mês, a partir de job_assignments. Só a gestora vê linhas.';



CREATE TABLE IF NOT EXISTS "public"."team_payments" (
    "person_id" "uuid" NOT NULL,
    "month" "text" NOT NULL,
    "paid_on" "date" NOT NULL
);


ALTER TABLE "public"."team_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "lead_id" "uuid",
    "zones" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unit_calendars" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "unit_id" "uuid" NOT NULL,
    "platform" "public"."calendar_platform" NOT NULL,
    "url" "text" NOT NULL,
    "status" "public"."calendar_status" DEFAULT 'none'::"public"."calendar_status" NOT NULL,
    "last_sync" timestamp with time zone,
    "imported" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."unit_calendars" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unit_rates" (
    "unit_id" "uuid" NOT NULL,
    "hourly_rate" numeric(10,2)
);


ALTER TABLE "public"."unit_rates" OWNER TO "postgres";


COMMENT ON TABLE "public"."unit_rates" IS 'Tarifa cobrada ao cliente por quarto. Fora de `units` pela mesma razão.';



CREATE TABLE IF NOT EXISTS "public"."units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT ''::"text" NOT NULL,
    "capacity" integer DEFAULT 2 NOT NULL,
    "status" "public"."unit_status" DEFAULT 'active'::"public"."unit_status" NOT NULL,
    "team_id" "uuid",
    "laundry" "jsonb",
    "checkout_time" time without time zone,
    "checkin_time" time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cleaning_min" integer,
    CONSTRAINT "units_duracao_valida" CHECK ((("cleaning_min" IS NULL) OR (("cleaning_min" >= 15) AND ("cleaning_min" <= 600))))
);


ALTER TABLE "public"."units" OWNER TO "postgres";


COMMENT ON COLUMN "public"."units"."cleaning_min" IS 'Minutos por limpeza neste quarto. NULL = herda do alojamento.';



ALTER TABLE ONLY "public"."absences"
    ADD CONSTRAINT "absences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_billing"
    ADD CONSTRAINT "client_billing_pkey" PRIMARY KEY ("client_id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "person_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."demo_jobs"
    ADD CONSTRAINT "demo_jobs_pkey" PRIMARY KEY ("job_id");



ALTER TABLE ONLY "public"."exec_checklist_template"
    ADD CONSTRAINT "exec_checklist_template_pkey" PRIMARY KEY ("kind", "ordem");



ALTER TABLE ONLY "public"."exec_laundry_template"
    ADD CONSTRAINT "exec_laundry_template_pkey" PRIMARY KEY ("item");



ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_approval_audit"
    ADD CONSTRAINT "job_approval_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_assignments"
    ADD CONSTRAINT "job_assignments_pkey" PRIMARY KEY ("job_id", "person_id");



ALTER TABLE ONLY "public"."job_checklist_items"
    ADD CONSTRAINT "job_checklist_items_job_id_kind_position_key" UNIQUE ("job_id", "kind", "position");



ALTER TABLE ONLY "public"."job_checklist_items"
    ADD CONSTRAINT "job_checklist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_events"
    ADD CONSTRAINT "job_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_issues"
    ADD CONSTRAINT "job_issues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_laundry_counts"
    ADD CONSTRAINT "job_laundry_counts_pkey" PRIMARY KEY ("job_id", "item");



ALTER TABLE ONLY "public"."job_photos"
    ADD CONSTRAINT "job_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_rates"
    ADD CONSTRAINT "location_rates_pkey" PRIMARY KEY ("location_id");



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_pkey" PRIMARY KEY ("message_id", "person_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notice_reads"
    ADD CONSTRAINT "notice_reads_pkey" PRIMARY KEY ("notice_id", "person_id");



ALTER TABLE ONLY "public"."notices"
    ADD CONSTRAINT "notices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."people_pay"
    ADD CONSTRAINT "people_pay_pkey" PRIMARY KEY ("person_id");



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_locations"
    ADD CONSTRAINT "service_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_payments"
    ADD CONSTRAINT "team_payments_pkey" PRIMARY KEY ("person_id", "month");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unit_calendars"
    ADD CONSTRAINT "unit_calendars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unit_rates"
    ADD CONSTRAINT "unit_rates_pkey" PRIMARY KEY ("unit_id");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");



CREATE INDEX "absences_person_idx" ON "public"."absences" USING "btree" ("person_id", "starts_on");



CREATE INDEX "assignments_person_idx" ON "public"."job_assignments" USING "btree" ("person_id");



CREATE INDEX "conversations_client_idx" ON "public"."conversations" USING "btree" ("client_id");



CREATE INDEX "conversations_job_idx" ON "public"."conversations" USING "btree" ("job_id");



CREATE INDEX "events_job_idx" ON "public"."job_events" USING "btree" ("job_id", "created_at");



CREATE INDEX "invoices_client_idx" ON "public"."invoices" USING "btree" ("client_id");



CREATE INDEX "job_approval_audit_job_idx" ON "public"."job_approval_audit" USING "btree" ("job_id", "created_at");



CREATE INDEX "job_issues_job_idx" ON "public"."job_issues" USING "btree" ("job_id");



CREATE INDEX "job_photos_job_idx" ON "public"."job_photos" USING "btree" ("job_id");



CREATE INDEX "jobs_calendar_idx" ON "public"."jobs" USING "btree" ("calendar_id");



CREATE INDEX "jobs_day_idx" ON "public"."jobs" USING "btree" ("scheduled_on");



CREATE UNIQUE INDEX "jobs_ical_uid_idx" ON "public"."jobs" USING "btree" ("calendar_id", "ical_uid") WHERE ("ical_uid" IS NOT NULL);



CREATE INDEX "jobs_location_idx" ON "public"."jobs" USING "btree" ("location_id");



CREATE INDEX "jobs_review_idx" ON "public"."jobs" USING "btree" ("review") WHERE ("status" = 'done'::"public"."job_status");



CREATE INDEX "jobs_team_idx" ON "public"."jobs" USING "btree" ("team_id");



CREATE INDEX "jobs_unit_idx" ON "public"."jobs" USING "btree" ("unit_id");



CREATE INDEX "locations_client_idx" ON "public"."service_locations" USING "btree" ("client_id");



CREATE INDEX "message_reads_person_idx" ON "public"."message_reads" USING "btree" ("person_id");



CREATE INDEX "messages_conversation_idx" ON "public"."messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "messages_from_idx" ON "public"."messages" USING "btree" ("from_person_id");



CREATE INDEX "notice_reads_person_idx" ON "public"."notice_reads" USING "btree" ("person_id");



CREATE INDEX "participants_person_idx" ON "public"."conversation_participants" USING "btree" ("person_id");



CREATE INDEX "people_team_idx" ON "public"."people" USING "btree" ("team_id");



CREATE INDEX "service_locations_team_idx" ON "public"."service_locations" USING "btree" ("team_id");



CREATE INDEX "unit_calendars_unit_idx" ON "public"."unit_calendars" USING "btree" ("unit_id");



CREATE INDEX "units_location_idx" ON "public"."units" USING "btree" ("location_id");



CREATE INDEX "units_team_idx" ON "public"."units" USING "btree" ("team_id");



CREATE OR REPLACE TRIGGER "checklist_guard_collab" BEFORE UPDATE ON "public"."job_checklist_items" FOR EACH ROW EXECUTE FUNCTION "public"."checklist_guard_collab_update"();



CREATE OR REPLACE TRIGGER "conversations_apaga_avisos" AFTER DELETE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."conversations_apaga_avisos"();



CREATE OR REPLACE TRIGGER "job_approval_audit_carimbar" BEFORE INSERT ON "public"."job_approval_audit" FOR EACH ROW EXECUTE FUNCTION "public"."aprov_carimbar_auditoria"();



CREATE OR REPLACE TRIGGER "job_assignments_guard_fechada" BEFORE DELETE ON "public"."job_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."job_assignments_guard_fechada"();



CREATE OR REPLACE TRIGGER "job_assignments_guard_update" BEFORE UPDATE ON "public"."job_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."job_assignments_guard_update"();



CREATE OR REPLACE TRIGGER "job_events_carimbar" BEFORE INSERT ON "public"."job_events" FOR EACH ROW EXECUTE FUNCTION "public"."exec_carimbar_autoria"();



CREATE OR REPLACE TRIGGER "job_issues_carimbar" BEFORE INSERT ON "public"."job_issues" FOR EACH ROW EXECUTE FUNCTION "public"."exec_carimbar_autoria"();



CREATE OR REPLACE TRIGGER "job_issues_trancar" BEFORE INSERT ON "public"."job_issues" FOR EACH ROW EXECUTE FUNCTION "public"."job_issues_trancar"();



CREATE OR REPLACE TRIGGER "jobs_guard_collab" BEFORE UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."jobs_guard_collab_update"();



CREATE OR REPLACE TRIGGER "jobs_guard_delete" BEFORE DELETE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."jobs_guard_delete"();



CREATE OR REPLACE TRIGGER "jobs_guard_fechada" BEFORE UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."jobs_guard_fechada"();



CREATE OR REPLACE TRIGGER "jobs_materializar_listas" AFTER INSERT ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."jobs_materializar_listas"();



CREATE OR REPLACE TRIGGER "jobs_stamp_client_flags" BEFORE INSERT OR UPDATE OF "location_id" ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."jobs_stamp_client_flags"();



CREATE OR REPLACE TRIGGER "laundry_guard_collab" BEFORE UPDATE ON "public"."job_laundry_counts" FOR EACH ROW EXECUTE FUNCTION "public"."laundry_guard_collab_update"();



CREATE OR REPLACE TRIGGER "message_reads_aviso" AFTER INSERT ON "public"."message_reads" REFERENCING NEW TABLE AS "novas" FOR EACH STATEMENT EXECUTE FUNCTION "public"."avisar_leitura"();



CREATE OR REPLACE TRIGGER "messages_autoria" BEFORE INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."messages_autoria"();



CREATE OR REPLACE TRIGGER "messages_reabre_conversa" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."messages_reabre_conversa"();



CREATE OR REPLACE TRIGGER "people_guard_delete" BEFORE DELETE ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."people_guard_delete"();



CREATE OR REPLACE TRIGGER "people_guard_self" BEFORE UPDATE ON "public"."people" FOR EACH ROW EXECUTE FUNCTION "public"."people_guard_self"();



ALTER TABLE ONLY "public"."absences"
    ADD CONSTRAINT "absences_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_billing"
    ADD CONSTRAINT "client_billing_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."people"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."demo_jobs"
    ADD CONSTRAINT "demo_jobs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "invoice_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_payments"
    ADD CONSTRAINT "invoice_payments_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."people"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_approval_audit"
    ADD CONSTRAINT "job_approval_audit_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_approval_audit"
    ADD CONSTRAINT "job_approval_audit_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_assignments"
    ADD CONSTRAINT "job_assignments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_assignments"
    ADD CONSTRAINT "job_assignments_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_checklist_items"
    ADD CONSTRAINT "job_checklist_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_events"
    ADD CONSTRAINT "job_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_events"
    ADD CONSTRAINT "job_events_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_issues"
    ADD CONSTRAINT "job_issues_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_issues"
    ADD CONSTRAINT "job_issues_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_issues"
    ADD CONSTRAINT "job_issues_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "public"."job_photos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_laundry_counts"
    ADD CONSTRAINT "job_laundry_counts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_photos"
    ADD CONSTRAINT "job_photos_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "public"."unit_calendars"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."service_locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."location_rates"
    ADD CONSTRAINT "location_rates_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."service_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_from_person_id_fkey" FOREIGN KEY ("from_person_id") REFERENCES "public"."people"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."notice_reads"
    ADD CONSTRAINT "notice_reads_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notice_reads"
    ADD CONSTRAINT "notice_reads_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notices"
    ADD CONSTRAINT "notices_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."people_pay"
    ADD CONSTRAINT "people_pay_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."people"
    ADD CONSTRAINT "people_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_locations"
    ADD CONSTRAINT "service_locations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_locations"
    ADD CONSTRAINT "service_locations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_payments"
    ADD CONSTRAINT "team_payments_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_lead_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."people"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."unit_calendars"
    ADD CONSTRAINT "unit_calendars_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."unit_rates"
    ADD CONSTRAINT "unit_rates_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."service_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE "public"."absences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "absences_collab_own" ON "public"."absences" FOR SELECT TO "authenticated" USING (("person_id" = "public"."current_person_id"()));



CREATE POLICY "absences_manager_all" ON "public"."absences" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



CREATE POLICY "assignments_collab_read" ON "public"."job_assignments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_assignments"."job_id") AND ("j"."status" <> 'unpublished'::"public"."job_status") AND (("job_assignments"."person_id" = "public"."current_person_id"()) OR ("j"."team_id" = "public"."my_team_id"()))))));



CREATE POLICY "attachments_collab" ON "public"."message_attachments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."conversation_participants" "p" ON (("p"."conversation_id" = "m"."conversation_id")))
  WHERE (("m"."id" = "message_attachments"."message_id") AND ("p"."person_id" = "public"."current_person_id"())))));



CREATE POLICY "attachments_collab_insert" ON "public"."message_attachments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."conversation_participants" "p" ON (("p"."conversation_id" = "m"."conversation_id")))
  WHERE (("m"."id" = "message_attachments"."message_id") AND ("p"."person_id" = "public"."current_person_id"())))));



CREATE POLICY "checklist_collab_read" ON "public"."job_checklist_items" FOR SELECT TO "authenticated" USING ("public"."assigned_to_me"("job_id"));



CREATE POLICY "checklist_collab_update" ON "public"."job_checklist_items" FOR UPDATE TO "authenticated" USING (("public"."assigned_to_me"("job_id") AND (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_checklist_items"."job_id") AND ("j"."status" = ANY (ARRAY['planned'::"public"."job_status", 'confirmed'::"public"."job_status", 'in_progress'::"public"."job_status"]))))))) WITH CHECK (("public"."assigned_to_me"("job_id") AND (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_checklist_items"."job_id") AND ("j"."status" = ANY (ARRAY['planned'::"public"."job_status", 'confirmed'::"public"."job_status", 'in_progress'::"public"."job_status"])))))));



ALTER TABLE "public"."client_billing" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_billing_manager_all" ON "public"."client_billing" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_collab_read" ON "public"."clients" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."service_locations" "l"
     JOIN "public"."jobs" "j" ON (("j"."location_id" = "l"."id")))
  WHERE (("l"."client_id" = "clients"."id") AND ("public"."assigned_to_me"("j"."id") OR ("j"."team_id" = "public"."my_team_id"()))))));



CREATE POLICY "clients_manager_all" ON "public"."clients" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_settings_manager_all" ON "public"."company_settings" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversation_participants_manager_all" ON "public"."conversation_participants" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_collab" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "p"
  WHERE (("p"."conversation_id" = "conversations"."id") AND ("p"."person_id" = "public"."current_person_id"())))));



CREATE POLICY "conversations_collab_insert" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "public"."current_person_id"()) AND (("client_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM ("public"."service_locations" "l"
     JOIN "public"."jobs" "j" ON (("j"."location_id" = "l"."id")))
  WHERE (("l"."client_id" = "conversations"."client_id") AND ("public"."assigned_to_me"("j"."id") OR ("j"."team_id" = "public"."my_team_id"())))))) AND (("job_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "conversations"."job_id") AND ("public"."assigned_to_me"("j"."id") OR ("j"."team_id" = "public"."my_team_id"()))))))));



CREATE POLICY "conversations_manager_all" ON "public"."conversations" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."demo_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_collab" ON "public"."job_events" FOR SELECT TO "authenticated" USING ("public"."assigned_to_me"("job_id"));



CREATE POLICY "events_collab_insert" ON "public"."job_events" FOR INSERT TO "authenticated" WITH CHECK (("public"."assigned_to_me"("job_id") AND (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_events"."job_id") AND ("j"."status" = ANY (ARRAY['planned'::"public"."job_status", 'confirmed'::"public"."job_status", 'in_progress'::"public"."job_status"])))))));



ALTER TABLE "public"."exec_checklist_template" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exec_checklist_template_manager" ON "public"."exec_checklist_template" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



CREATE POLICY "exec_checklist_template_read" ON "public"."exec_checklist_template" FOR SELECT TO "authenticated" USING (("public"."current_person_id"() IS NOT NULL));



ALTER TABLE "public"."exec_laundry_template" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exec_laundry_template_manager" ON "public"."exec_laundry_template" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



CREATE POLICY "exec_laundry_template_read" ON "public"."exec_laundry_template" FOR SELECT TO "authenticated" USING (("public"."current_person_id"() IS NOT NULL));



ALTER TABLE "public"."invoice_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_payments_manager_all" ON "public"."invoice_payments" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_manager_all" ON "public"."invoices" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



CREATE POLICY "issues_collab" ON "public"."job_issues" FOR SELECT TO "authenticated" USING ("public"."assigned_to_me"("job_id"));



CREATE POLICY "issues_collab_insert" ON "public"."job_issues" FOR INSERT TO "authenticated" WITH CHECK (("public"."assigned_to_me"("job_id") AND (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_issues"."job_id") AND ("j"."status" = ANY (ARRAY['planned'::"public"."job_status", 'confirmed'::"public"."job_status", 'in_progress'::"public"."job_status"])))))));



ALTER TABLE "public"."job_approval_audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_approval_audit_manager_insert" ON "public"."job_approval_audit" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_manager"());



CREATE POLICY "job_approval_audit_manager_read" ON "public"."job_approval_audit" FOR SELECT TO "authenticated" USING ("public"."is_manager"());



ALTER TABLE "public"."job_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_assignments_manager_all" ON "public"."job_assignments" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."job_checklist_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_checklist_items_manager_all" ON "public"."job_checklist_items" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."job_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_events_manager_all" ON "public"."job_events" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."job_issues" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_issues_manager_all" ON "public"."job_issues" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."job_laundry_counts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_laundry_counts_manager_all" ON "public"."job_laundry_counts" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."job_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_photos_manager_all" ON "public"."job_photos" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jobs_collab_read" ON "public"."jobs" FOR SELECT TO "authenticated" USING ((("status" <> 'unpublished'::"public"."job_status") AND ("public"."assigned_to_me"("id") OR ("team_id" = "public"."my_team_id"()))));



CREATE POLICY "jobs_collab_update" ON "public"."jobs" FOR UPDATE TO "authenticated" USING ("public"."assigned_to_me"("id")) WITH CHECK ("public"."assigned_to_me"("id"));



CREATE POLICY "jobs_manager_all" ON "public"."jobs" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



CREATE POLICY "laundry_collab_read" ON "public"."job_laundry_counts" FOR SELECT TO "authenticated" USING ("public"."assigned_to_me"("job_id"));



CREATE POLICY "laundry_collab_update" ON "public"."job_laundry_counts" FOR UPDATE TO "authenticated" USING (("public"."assigned_to_me"("job_id") AND (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_laundry_counts"."job_id") AND ("j"."status" = ANY (ARRAY['planned'::"public"."job_status", 'confirmed'::"public"."job_status", 'in_progress'::"public"."job_status"]))))))) WITH CHECK (("public"."assigned_to_me"("job_id") AND (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_laundry_counts"."job_id") AND ("j"."status" = ANY (ARRAY['planned'::"public"."job_status", 'confirmed'::"public"."job_status", 'in_progress'::"public"."job_status"])))))));



ALTER TABLE "public"."location_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "location_rates_manager_all" ON "public"."location_rates" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



CREATE POLICY "locations_collab_read" ON "public"."service_locations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."location_id" = "service_locations"."id") AND ("public"."assigned_to_me"("j"."id") OR ("j"."team_id" = "public"."my_team_id"()))))));



ALTER TABLE "public"."message_attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "message_attachments_manager_all" ON "public"."message_attachments" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."message_reads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "message_reads_manager_all" ON "public"."message_reads" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_collab_read" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "p"
  WHERE (("p"."conversation_id" = "messages"."conversation_id") AND ("p"."person_id" = "public"."current_person_id"())))));



CREATE POLICY "messages_collab_send" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((("from_person_id" = "public"."current_person_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "p"
  WHERE (("p"."conversation_id" = "messages"."conversation_id") AND ("p"."person_id" = "public"."current_person_id"()))))));



CREATE POLICY "messages_manager_all" ON "public"."messages" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."notice_reads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notice_reads_manager_all" ON "public"."notice_reads" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



CREATE POLICY "notice_reads_own" ON "public"."notice_reads" TO "authenticated" USING (("person_id" = "public"."current_person_id"())) WITH CHECK ((("person_id" = "public"."current_person_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."notices" "n"
  WHERE ("n"."id" = "notice_reads"."notice_id")))));



ALTER TABLE "public"."notices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notices_collab" ON "public"."notices" FOR SELECT TO "authenticated" USING ((("public"."current_person_id"() IS NOT NULL) AND ("audience" = ANY (ARRAY['todos'::"text", 'colab'::"text"]))));



CREATE POLICY "notices_manager_all" ON "public"."notices" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



CREATE POLICY "participants_collab" ON "public"."conversation_participants" FOR SELECT TO "authenticated" USING ((("person_id" = "public"."current_person_id"()) OR "public"."participo_na_conversa"("conversation_id")));



CREATE POLICY "participants_collab_insert" ON "public"."conversation_participants" FOR INSERT TO "authenticated" WITH CHECK (("public"."conversa_criada_por_mim"("conversation_id") OR "public"."participo_na_conversa"("conversation_id")));



ALTER TABLE "public"."people" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "people_collab_read" ON "public"."people" FOR SELECT TO "authenticated" USING ((("public"."current_person_id"() IS NOT NULL) AND (("team_id" = "public"."my_team_id"()) OR ("role" = 'manager'::"public"."person_role") OR ("id" = "public"."current_person_id"()))));



CREATE POLICY "people_manager_all" ON "public"."people" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."people_pay" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "people_pay_collab_own" ON "public"."people_pay" FOR SELECT TO "authenticated" USING (("person_id" = "public"."current_person_id"()));



CREATE POLICY "people_pay_manager_all" ON "public"."people_pay" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



CREATE POLICY "photos_collab_delete" ON "public"."job_photos" FOR DELETE TO "authenticated" USING (("public"."assigned_to_me"("job_id") AND (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_photos"."job_id") AND ("j"."status" = ANY (ARRAY['confirmed'::"public"."job_status", 'in_progress'::"public"."job_status"])))))));



CREATE POLICY "photos_collab_insert" ON "public"."job_photos" FOR INSERT TO "authenticated" WITH CHECK (("public"."assigned_to_me"("job_id") AND (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."id" = "job_photos"."job_id") AND ("j"."status" = ANY (ARRAY['planned'::"public"."job_status", 'confirmed'::"public"."job_status", 'in_progress'::"public"."job_status"])))))));



CREATE POLICY "photos_collab_read" ON "public"."job_photos" FOR SELECT TO "authenticated" USING ("public"."assigned_to_me"("job_id"));



CREATE POLICY "reads_collab_delete" ON "public"."message_reads" FOR DELETE TO "authenticated" USING (("person_id" = "public"."current_person_id"()));



CREATE POLICY "reads_collab_insert" ON "public"."message_reads" FOR INSERT TO "authenticated" WITH CHECK ((("person_id" = "public"."current_person_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE ("m"."id" = "message_reads"."message_id")))));



CREATE POLICY "reads_collab_read" ON "public"."message_reads" FOR SELECT TO "authenticated" USING (("person_id" = "public"."current_person_id"()));



CREATE POLICY "reads_sender_read" ON "public"."message_reads" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."id" = "message_reads"."message_id") AND ("m"."from_person_id" = "public"."current_person_id"())))));



ALTER TABLE "public"."service_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_locations_manager_all" ON "public"."service_locations" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



CREATE POLICY "settings_read" ON "public"."company_settings" FOR SELECT TO "authenticated" USING (("public"."current_person_id"() IS NOT NULL));



ALTER TABLE "public"."team_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_payments_collab" ON "public"."team_payments" FOR SELECT TO "authenticated" USING (("person_id" = "public"."current_person_id"()));



CREATE POLICY "team_payments_manager_all" ON "public"."team_payments" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_collab_read" ON "public"."teams" FOR SELECT TO "authenticated" USING (("public"."current_person_id"() IS NOT NULL));



CREATE POLICY "teams_manager_all" ON "public"."teams" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."unit_calendars" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "unit_calendars_manager_all" ON "public"."unit_calendars" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."unit_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "unit_rates_manager_all" ON "public"."unit_rates" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



ALTER TABLE "public"."units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "units_collab_read" ON "public"."units" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE (("j"."unit_id" = "units"."id") AND ("public"."assigned_to_me"("j"."id") OR ("j"."team_id" = "public"."my_team_id"()))))));



CREATE POLICY "units_manager_all" ON "public"."units" TO "authenticated" USING ("public"."is_manager"()) WITH CHECK ("public"."is_manager"());



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."aprov_carimbar_auditoria"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."aprov_carimbar_auditoria"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."aprov_margem_atraso_min"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."aprov_margem_atraso_min"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."aprov_margem_atraso_min"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."aprov_ocorrencias"("p_job" "uuid", "p_duracao_sec" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."aprov_ocorrencias"("p_job" "uuid", "p_duracao_sec" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."aprov_ocorrencias"("p_job" "uuid", "p_duracao_sec" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."aprov_rever"("p_job" "uuid", "p_acao" "text", "p_nota" "text", "p_para" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."aprov_rever"("p_job" "uuid", "p_acao" "text", "p_nota" "text", "p_para" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."aprov_rever"("p_job" "uuid", "p_acao" "text", "p_nota" "text", "p_para" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assigned_to_me"("job" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assigned_to_me"("job" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assigned_to_me"("job" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."avisar_leitura"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."avisar_leitura"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."aviso_ical"("p_job" "uuid", "p_titulo" "text", "p_texto" "text", "p_prioridade" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."aviso_ical"("p_job" "uuid", "p_titulo" "text", "p_texto" "text", "p_prioridade" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."checklist_guard_collab_update"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."checklist_guard_collab_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."commit_location_detail"("p_location_id" "uuid", "p_name" "text", "p_address" "text", "p_image" "text", "p_status" "public"."location_status", "p_service_ids" "text"[], "p_team_id" "uuid", "p_hourly_rate" numeric, "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_cleaning_min" integer, "p_access_instructions" "text", "p_notes" "text", "p_units" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."commit_location_detail"("p_location_id" "uuid", "p_name" "text", "p_address" "text", "p_image" "text", "p_status" "public"."location_status", "p_service_ids" "text"[], "p_team_id" "uuid", "p_hourly_rate" numeric, "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_cleaning_min" integer, "p_access_instructions" "text", "p_notes" "text", "p_units" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."commit_location_detail"("p_location_id" "uuid", "p_name" "text", "p_address" "text", "p_image" "text", "p_status" "public"."location_status", "p_service_ids" "text"[], "p_team_id" "uuid", "p_hourly_rate" numeric, "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_cleaning_min" integer, "p_access_instructions" "text", "p_notes" "text", "p_units" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."conversa_criada_por_mim"("conv" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."conversa_criada_por_mim"("conv" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."conversa_criada_por_mim"("conv" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."conversations_apaga_avisos"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."conversations_apaga_avisos"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_job"("p_location" "uuid", "p_unit" "uuid", "p_scheduled_on" "date", "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_checkin_same_day" boolean, "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_job"("p_location" "uuid", "p_unit" "uuid", "p_scheduled_on" "date", "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_checkin_same_day" boolean, "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_job"("p_location" "uuid", "p_unit" "uuid", "p_scheduled_on" "date", "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_checkin_same_day" boolean, "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."criar_conversa"("p_kind" "public"."conversation_kind", "p_title" "text", "p_client" "uuid", "p_job" "uuid", "p_participantes" "uuid"[], "p_texto" "text", "p_agendada_local" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."criar_conversa"("p_kind" "public"."conversation_kind", "p_title" "text", "p_client" "uuid", "p_job" "uuid", "p_participantes" "uuid"[], "p_texto" "text", "p_agendada_local" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."criar_conversa"("p_kind" "public"."conversation_kind", "p_title" "text", "p_client" "uuid", "p_job" "uuid", "p_participantes" "uuid"[], "p_texto" "text", "p_agendada_local" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_person_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_person_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_person_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enviar_mensagem"("p_conv" "uuid", "p_texto" "text", "p_agendada_local" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enviar_mensagem"("p_conv" "uuid", "p_texto" "text", "p_agendada_local" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enviar_mensagem"("p_conv" "uuid", "p_texto" "text", "p_agendada_local" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."enviar_nova_mensagem"("p_itens" "jsonb", "p_texto" "text", "p_job" "uuid", "p_agendada_local" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enviar_nova_mensagem"("p_itens" "jsonb", "p_texto" "text", "p_job" "uuid", "p_agendada_local" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enviar_nova_mensagem"("p_itens" "jsonb", "p_texto" "text", "p_job" "uuid", "p_agendada_local" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."exec_add_issue"("p_job" "uuid", "p_type" "public"."issue_type", "p_delay_min" integer, "p_description" "text", "p_photo_id" "uuid", "p_event" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."exec_add_issue"("p_job" "uuid", "p_type" "public"."issue_type", "p_delay_min" integer, "p_description" "text", "p_photo_id" "uuid", "p_event" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_add_issue"("p_job" "uuid", "p_type" "public"."issue_type", "p_delay_min" integer, "p_description" "text", "p_photo_id" "uuid", "p_event" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."exec_add_photo"("p_job" "uuid", "p_path" "text", "p_kind" "text", "p_event" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."exec_add_photo"("p_job" "uuid", "p_path" "text", "p_kind" "text", "p_event" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_add_photo"("p_job" "uuid", "p_path" "text", "p_kind" "text", "p_event" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."exec_carimbar_autoria"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."exec_carimbar_autoria"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."exec_insert_events"("p_job" "uuid", "p_events" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."exec_insert_events"("p_job" "uuid", "p_events" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_insert_events"("p_job" "uuid", "p_events" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."exec_materializar"("p_job" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."exec_materializar"("p_job" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."exec_trancar_limpeza_aberta"("p_job" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."exec_trancar_limpeza_aberta"("p_job" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."exec_transicao_valida"("p_de" "public"."job_status", "p_para" "public"."job_status") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."exec_transicao_valida"("p_de" "public"."job_status", "p_para" "public"."job_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_transicao_valida"("p_de" "public"."job_status", "p_para" "public"."job_status") TO "service_role";



REVOKE ALL ON FUNCTION "public"."exec_transition"("p_job" "uuid", "p_status" "public"."job_status", "p_notes" "text", "p_qty" "jsonb", "p_events" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."exec_transition"("p_job" "uuid", "p_status" "public"."job_status", "p_notes" "text", "p_qty" "jsonb", "p_events" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_transition"("p_job" "uuid", "p_status" "public"."job_status", "p_notes" "text", "p_qty" "jsonb", "p_events" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_manager"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_manager"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_manager"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."job_assignments_guard_fechada"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."job_assignments_guard_fechada"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."job_assignments_guard_update"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."job_assignments_guard_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."job_from_ical"("p_calendar" "uuid", "p_uid" "text", "p_stay_date" "date", "p_checkin_same_day" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."job_from_ical"("p_calendar" "uuid", "p_uid" "text", "p_stay_date" "date", "p_checkin_same_day" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."job_ical_desaparecidos"("p_calendar" "uuid", "p_uids" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."job_ical_desaparecidos"("p_calendar" "uuid", "p_uids" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."job_issues_trancar"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."job_issues_trancar"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."jobs_guard_collab_update"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jobs_guard_collab_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."jobs_guard_delete"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jobs_guard_delete"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."jobs_guard_fechada"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jobs_guard_fechada"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."jobs_materializar_listas"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jobs_materializar_listas"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."jobs_stamp_client_flags"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."jobs_stamp_client_flags"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."laundry_guard_collab_update"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."laundry_guard_collab_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."marcar_conversa_lida"("conv" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."marcar_conversa_lida"("conv" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."marcar_conversa_lida"("conv" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."messages_autoria"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."messages_autoria"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."messages_reabre_conversa"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."messages_reabre_conversa"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."my_team_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_team_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_team_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."na_semana_em_curso"("p_dia" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."na_semana_em_curso"("p_dia" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."participo_na_conversa"("conv" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."participo_na_conversa"("conv" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."participo_na_conversa"("conv" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."people_guard_delete"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."people_guard_delete"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."people_guard_self"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."people_guard_self"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."rev_set_supply"("p_client" "uuid", "p_supply" "public"."supply_model", "p_supplement" numeric, "p_amounts" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rev_set_supply"("p_client" "uuid", "p_supply" "public"."supply_model", "p_supplement" numeric, "p_amounts" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rev_set_supply"("p_client" "uuid", "p_supply" "public"."supply_model", "p_supplement" numeric, "p_amounts" "jsonb") TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."company_settings" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_company_settings"("p_name" "text", "p_address" "text", "p_phone" "text", "p_email" "text", "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_default_cleaning_min" integer, "p_duration_tolerance_min" integer, "p_travel_included" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_company_settings"("p_name" "text", "p_address" "text", "p_phone" "text", "p_email" "text", "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_default_cleaning_min" integer, "p_duration_tolerance_min" integer, "p_travel_included" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_company_settings"("p_name" "text", "p_address" "text", "p_phone" "text", "p_email" "text", "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_default_cleaning_min" integer, "p_duration_tolerance_min" integer, "p_travel_included" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_job"("p_id" "uuid", "p_scheduled_on" "date", "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_team_id" "uuid", "p_status" "public"."job_status", "p_assignees" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_job"("p_id" "uuid", "p_scheduled_on" "date", "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_team_id" "uuid", "p_status" "public"."job_status", "p_assignees" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_job"("p_id" "uuid", "p_scheduled_on" "date", "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_team_id" "uuid", "p_status" "public"."job_status", "p_assignees" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."unit_defaults"("p_unit" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."unit_defaults"("p_unit" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unit_defaults"("p_unit" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_client"("p_id" "uuid", "p_name" "text", "p_segment" "text", "p_nif" "text", "p_contact" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_status" "public"."client_status", "p_notes" "text", "p_laundry_enabled" boolean, "p_laundry_setup" "jsonb", "p_image" "text", "p_since" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_client"("p_id" "uuid", "p_name" "text", "p_segment" "text", "p_nif" "text", "p_contact" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_status" "public"."client_status", "p_notes" "text", "p_laundry_enabled" boolean, "p_laundry_setup" "jsonb", "p_image" "text", "p_since" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_client"("p_id" "uuid", "p_name" "text", "p_segment" "text", "p_nif" "text", "p_contact" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_status" "public"."client_status", "p_notes" "text", "p_laundry_enabled" boolean, "p_laundry_setup" "jsonb", "p_image" "text", "p_since" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_location"("p_id" "uuid", "p_client_id" "uuid", "p_name" "text", "p_address" "text", "p_image" "text", "p_status" "public"."location_status", "p_service_ids" "text"[], "p_team_id" "uuid", "p_hourly_rate" numeric, "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_cleaning_min" integer, "p_unit_names" "text"[], "p_unit_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_location"("p_id" "uuid", "p_client_id" "uuid", "p_name" "text", "p_address" "text", "p_image" "text", "p_status" "public"."location_status", "p_service_ids" "text"[], "p_team_id" "uuid", "p_hourly_rate" numeric, "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_cleaning_min" integer, "p_unit_names" "text"[], "p_unit_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_location"("p_id" "uuid", "p_client_id" "uuid", "p_name" "text", "p_address" "text", "p_image" "text", "p_status" "public"."location_status", "p_service_ids" "text"[], "p_team_id" "uuid", "p_hourly_rate" numeric, "p_checkout_time" time without time zone, "p_checkin_time" time without time zone, "p_cleaning_min" integer, "p_unit_names" "text"[], "p_unit_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_person"("p_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "public"."person_role", "p_team_id" "uuid", "p_rate" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_person"("p_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "public"."person_role", "p_team_id" "uuid", "p_rate" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_person"("p_id" "uuid", "p_name" "text", "p_email" "text", "p_phone" "text", "p_role" "public"."person_role", "p_team_id" "uuid", "p_rate" numeric) TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."absences" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."absences" TO "authenticated";
GRANT ALL ON TABLE "public"."absences" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."client_billing" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."client_billing" TO "authenticated";
GRANT ALL ON TABLE "public"."client_billing" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."clients" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."conversation_participants" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."conversations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."demo_jobs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."exec_checklist_template" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."exec_checklist_template" TO "authenticated";
GRANT ALL ON TABLE "public"."exec_checklist_template" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."exec_laundry_template" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."exec_laundry_template" TO "authenticated";
GRANT ALL ON TABLE "public"."exec_laundry_template" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."invoice_payments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."invoice_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_payments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."invoices" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."job_approval_audit" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,MAINTAIN ON TABLE "public"."job_approval_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."job_approval_audit" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."job_checklist_items" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."job_checklist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."job_checklist_items" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."job_issues" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."job_issues" TO "authenticated";
GRANT ALL ON TABLE "public"."job_issues" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."job_laundry_counts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."job_laundry_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."job_laundry_counts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."jobs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT SELECT ON TABLE "public"."job_approval_facts" TO "authenticated";
GRANT ALL ON TABLE "public"."job_approval_facts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."job_assignments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."job_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."job_assignments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."job_events" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."job_events" TO "authenticated";
GRANT ALL ON TABLE "public"."job_events" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."service_locations" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."service_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."service_locations" TO "service_role";



GRANT ALL ON TABLE "public"."job_month_stats" TO "service_role";
GRANT SELECT ON TABLE "public"."job_month_stats" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."job_photos" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."job_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."job_photos" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."location_rates" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."location_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."location_rates" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."message_attachments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."message_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."message_attachments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."message_reads" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."message_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reads" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."messages" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."notice_reads" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."notice_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."notice_reads" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."notices" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."notices" TO "authenticated";
GRANT ALL ON TABLE "public"."notices" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."people" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."people" TO "authenticated";
GRANT ALL ON TABLE "public"."people" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."people_pay" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."people_pay" TO "authenticated";
GRANT ALL ON TABLE "public"."people_pay" TO "service_role";



GRANT ALL ON TABLE "public"."person_month_jobs" TO "service_role";
GRANT SELECT ON TABLE "public"."person_month_jobs" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."team_payments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."team_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."team_payments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."teams" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."unit_calendars" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."unit_calendars" TO "authenticated";
GRANT ALL ON TABLE "public"."unit_calendars" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."unit_rates" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."unit_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."unit_rates" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."units" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,MAINTAIN,UPDATE ON TABLE "public"."units" TO "authenticated";
GRANT ALL ON TABLE "public"."units" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







