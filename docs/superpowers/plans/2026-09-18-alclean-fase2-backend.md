# ALClean Fase 2 (1/3) — Backend, base de dados e autenticação — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar `alclean/app` de simulação client-side numa aplicação real com dados persistentes no Supabase, contas reais para gestora e colaboradoras, isolamento por RLS, atualizações em tempo real e publicação online.

**Architecture:** Um projeto Supabase dedicado à ALClean (Postgres + Auth + Realtime + Storage). A app React existente fala diretamente com o Supabase pelo SDK; a autorização vive em políticas RLS. Os *reducers* puros de cada módulo mantêm-se intactos (encerram regras de negócio já validadas); o que muda é que cada ação passa também a escrever no Supabase através de um `repository.ts` por módulo, e que o estado inicial deixa de vir de `mockData.ts` e passa a ser hidratado da base de dados, com subscrições Realtime a aplicar mudanças externas.

**Tech Stack:** TypeScript, React 18, esbuild 0.24, `@supabase/supabase-js` v2, Postgres 17 (Supabase), Supabase Edge Functions (Deno) — uma só função, Vercel ou Netlify para alojamento estático.

**Spec:** `docs/superpowers/specs/2026-09-18-alclean-fase2-backend-design.md`

## Global Constraints

- **Português de Portugal em todo o texto visível e em todos os comentários.** Nunca vocabulário do Brasil (`faturamento`, `equipe`, `usuário`, `time`, `aplicativo`). Usar: faturação, equipa, utilizador, app.
- **Marca ALClean:** cor primária `#0D9488`. Nunca reintroduzir o verde do template (`#17643e` e derivados).
- **Nenhum código ou chave de acesso ao alojamento** pode ser guardado ou mostrado em nenhum ecrã ou tabela. Regra de segurança da empresa: um telemóvel roubado não pode comprometer um cliente.
- **Nunca alterar o template** em `/Users/paulorsalgado/Documents/2. Sandbox/Planning_OS - V2/`. Todo o código desta implementação vive em `/Users/paulorsalgado/Documents/2. Sandbox/alclean/app/` (que é a raiz do seu próprio repositório git).
- **Vocabulário do domínio:** Limpeza, Alojamento, Quarto, Colaborador(a), Gestora. Papéis existentes: só `manager` e `collab` — **não existe `admin`**.
- **O comportamento validado manda.** Perante dúvida sobre o que um ecrã deve fazer, a autoridade é `/Users/paulorsalgado/Documents/2. Sandbox/alclean/modulos/<modulo>.md`, não o código antigo.
- **Não há type-checking no build** (esbuild só transpila, `typescript` não está instalado). Erros de tipo não rebentam o build — verificar comportamento a correr, não a compilar.
- **Organização Supabase:** `aianeuczvvsolbvasfcv`. Região: `eu-west-1`.
- **Nomes de tabelas e colunas em `snake_case`**, em inglês, exatamente como definidos nas Tasks 1–3. Os tipos TypeScript mantêm o `camelCase` que já têm — a tradução acontece no `repository.ts` de cada módulo.

---

## Estrutura de ficheiros

**Novos:**
- `supabase/migrations/0001_core.sql` — núcleo partilhado (pessoas, equipas, clientes, alojamentos, quartos, calendários, ausências)
- `supabase/migrations/0002_jobs.sql` — ciclo de vida da limpeza
- `supabase/migrations/0003_messages_revenue.sql` — mensagens, rendimentos, definições
- `supabase/migrations/0004_rls.sql` — funções auxiliares, RLS e permissões de coluna
- `supabase/migrations/0005_storage.sql` — bucket de fotografias e respetivas políticas
- `supabase/migrations/0006_revenue_view.sql` — vista de agregação mensal das limpezas concluídas
- `supabase/functions/provision-access/index.ts` — Edge Function que cria/atualiza contas de colaboradoras
- `src/modules/shared/supabase/client.ts` — cliente único do Supabase
- `src/modules/shared/supabase/realtime.ts` — helper de subscrição
- `src/modules/shared/supabase/useSupabaseData.ts` — hidratação + tempo real, usado pelos 7 módulos
- `src/modules/shared/supabase/index.ts` — barrel
- `src/modules/shared/auth/AuthProvider.tsx` — sessão, pessoa autenticada, logout
- `src/modules/shared/auth/LoginScreen.tsx` — ecrã de entrada (gestora: email+palavra-passe; colaboradora: nome+PIN)
- `src/modules/shared/auth/index.ts` — barrel
- `src/modules/<mod>/repository.ts` — um por módulo (7 ficheiros)
- `scripts/seed.mjs` — popula a base de dados com os dados de exemplo da ALClean
- `scripts/rls-check.mjs` — verifica as fronteiras de acesso
- `.env.example`
- `netlify.toml`

**Modificados:**
- `package.json` — dependência `@supabase/supabase-js`, scripts `seed` e `rls-check`
- `build.mjs` — `define` para as duas variáveis públicas
- `.gitignore` — ignorar `.env`
- `src/entries/*.tsx` (7) — envolver cada módulo no `AuthProvider`
- `src/modules/shared/ui/AppTopBar.tsx` — iniciais e "Terminar sessão" reais
- os 6 `use<Mod>Module.ts` + `mensagens/store.tsx` — hidratação, escrita e tempo real
- `src/modules/aprovacoes/ApprovalsModule.tsx` e `src/modules/rendimentos/RevenueModule.tsx` — definições saem do `localStorage`

---

### Task 1: Projeto Supabase e núcleo partilhado

**Files:**
- Create: `supabase/migrations/0001_core.sql`
- Create: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nada.
- Produces: o projeto Supabase (guardar `project ref`, URL e chave anon), e as tabelas `teams`, `people`, `clients`, `service_locations`, `units`, `unit_calendars`, `absences` com as colunas exatas abaixo. Todas as tasks seguintes dependem destes nomes.

- [ ] **Passo 1: Criar o projeto Supabase**

Confirmar com o utilizador antes de executar — criar um projeto é uma ação com efeitos fora deste computador. Usar a ferramenta MCP `create_project` com:
- `name`: `alclean`
- `organization_id`: `aianeuczvvsolbvasfcv`
- `region`: `eu-west-1`

Guardar o `project ref` devolvido. Obter o URL com `get_project_url` e a chave anon com `get_publishable_keys`. Registar ambos no relatório da task — as tasks 5, 7, 8 e 16 precisam deles.

- [ ] **Passo 2: Escrever a migração do núcleo**

`supabase/migrations/0001_core.sql`:

```sql
create type person_role as enum ('manager','collab');
create type access_status as enum ('none','sent','active','suspended','failed');
create type client_status as enum ('active','paused','inactive');
create type location_status as enum ('active','paused');
create type unit_status as enum ('active','inactive');
create type calendar_platform as enum ('Airbnb','Booking.com','Outro');
create type calendar_status as enum ('connected','error','none');
create type absence_type as enum ('ferias','folga','indisponibilidade','formacao','consulta','baixa','nao_comunicada');
create type absence_status as enum ('pending','approved','rejected');

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lead_id uuid,
  zones text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text not null default '',
  phone text not null default '',
  role person_role not null default 'collab',
  team_id uuid references teams(id) on delete set null,
  access access_status not null default 'none',
  per_job_rate numeric(10,2),
  completed_jobs integer not null default 0,
  since date not null default current_date,
  archived boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table teams
  add constraint teams_lead_fk foreign key (lead_id) references people(id) on delete set null;

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  segment text not null default '',
  nif text not null default '',
  contact text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  status client_status not null default 'active',
  image text not null default 'facade',
  since text not null default '',
  notes text not null default '',
  laundry_enabled boolean not null default false,
  laundry_setup jsonb not null default '{"lencol":0,"edredon":0,"fronhas":0,"banho":0,"rosto":0}'::jsonb,
  created_at timestamptz not null default now()
);

create table service_locations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  address text not null default '',
  status location_status not null default 'active',
  image text not null default 'facade',
  service_ids text[] not null default '{}',
  team_id uuid references teams(id) on delete set null,
  hourly_rate numeric(10,2),
  checkout_time time not null default '11:00',
  checkin_time time not null default '15:00',
  access_instructions text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

comment on column service_locations.access_instructions is
  'Indicações de acesso em texto livre. NUNCA guardar códigos, chaves ou combinações: regra de segurança da ALClean.';

create table units (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references service_locations(id) on delete cascade,
  name text not null,
  type text not null default '',
  capacity integer not null default 2,
  status unit_status not null default 'active',
  team_id uuid references teams(id) on delete set null,
  hourly_rate numeric(10,2),
  laundry jsonb,
  checkout_time time,
  checkin_time time,
  created_at timestamptz not null default now()
);

create table unit_calendars (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  platform calendar_platform not null,
  url text not null,
  status calendar_status not null default 'none',
  last_sync timestamptz,
  imported integer not null default 0
);

create table absences (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  type absence_type not null,
  starts_on date not null,
  ends_on date not null,
  all_day boolean not null default true,
  starts_at time,
  ends_at time,
  status absence_status not null default 'approved',
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint absences_range check (ends_on >= starts_on)
);

create index people_team_idx on people(team_id);
create index locations_client_idx on service_locations(client_id);
create index units_location_idx on units(location_id);
create index absences_person_idx on absences(person_id, starts_on);
```

Nota sobre `people.role`: só `manager` e `collab`. O template tinha `admin`; a ALClean decidiu não ter esse nível.

- [ ] **Passo 3: Aplicar a migração**

Usar a ferramenta MCP `apply_migration` com `name: "0001_core"` e o conteúdo do ficheiro.

- [ ] **Passo 4: Confirmar**

`list_tables` deve devolver as 7 tabelas. Correr via `execute_sql`:
```sql
select table_name from information_schema.tables where table_schema='public' order by 1;
```
Esperado: `absences, clients, people, service_locations, teams, unit_calendars, units`.

- [ ] **Passo 5: `.env.example` e `.gitignore`**

`.env.example`:
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<chave anon publicável>
SUPABASE_SERVICE_ROLE_KEY=<só para scripts/seed.mjs e scripts/rls-check.mjs; nunca vai para o browser>
```

Acrescentar `.env` ao `.gitignore` (que hoje tem só `node_modules/` e `preview/*.js`).

- [ ] **Passo 6: Commit**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app"
git add supabase/migrations/0001_core.sql .env.example .gitignore
git commit -m "feat(db): núcleo partilhado — pessoas, equipas, clientes, alojamentos, quartos"
```

---

### Task 2: Ciclo de vida da limpeza

**Files:**
- Create: `supabase/migrations/0002_jobs.sql`

**Interfaces:**
- Consumes: `people`, `teams`, `units`, `service_locations` (Task 1).
- Produces: `jobs`, `job_assignments`, `job_checklist_items`, `job_laundry_counts`, `job_photos`, `job_issues`, `job_events`, `job_approval_audit`.

- [ ] **Passo 1: Escrever a migração**

`supabase/migrations/0002_jobs.sql`:

```sql
create type job_status as enum ('unpublished','planned','confirmed','in_progress','done');
create type job_source as enum ('ical','manual');
create type review_state as enum ('pending','approved','correction','reopened','archived');
create type checklist_kind as enum ('prep','task');
create type issue_type as enum ('atraso','dano','material','acesso','outro');

create table jobs (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete restrict,
  location_id uuid not null references service_locations(id) on delete restrict,
  team_id uuid references teams(id) on delete set null,
  scheduled_on date not null,
  starts_at time not null,
  ends_at time not null,
  status job_status not null default 'unpublished',
  source job_source not null default 'manual',
  platform text,
  stay_date date not null,
  checkin_same_day boolean not null default false,
  checkout_time time not null,
  checkin_time time not null,
  supplies_own_products boolean not null default false,
  laundry_collection_active boolean not null default false,
  manager_note text not null default '',
  notes text not null default '',
  started_at timestamptz,
  finished_at timestamptz,
  duration_sec integer,
  review review_state not null default 'pending',
  reopen_to text,
  auto_approved boolean not null default false,
  created_at timestamptz not null default now()
);

comment on column jobs.checkin_same_day is
  'true quando há entrada de hóspedes no mesmo dia da saída: é o critério de prioridade alta do Planeamento.';
comment on column jobs.review is
  'Só relevante depois de status=done. "Em atraso" NUNCA é guardado — é calculado a partir de starts_at e do relógio.';

create table job_assignments (
  job_id uuid not null references jobs(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  hours numeric(4,2) not null default 0,
  primary key (job_id, person_id)
);

create table job_checklist_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  kind checklist_kind not null,
  position integer not null,
  label text not null,
  done boolean not null default false,
  unique (job_id, kind, position)
);

create table job_laundry_counts (
  job_id uuid not null references jobs(id) on delete cascade,
  item text not null,
  planned integer not null default 0,
  counted integer not null default 0,
  confirmed integer,
  primary key (job_id, item)
);

create table job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  storage_path text not null,
  kind text not null default '',
  created_at timestamptz not null default now()
);

create table job_issues (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  type issue_type not null,
  delay_min integer,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  person_id uuid references people(id) on delete set null,
  text text not null,
  tone text not null default 'neutral',
  created_at timestamptz not null default now()
);

create table job_approval_audit (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  person_id uuid references people(id) on delete set null,
  action text not null,
  note text not null default '',
  tone text not null default '',
  created_at timestamptz not null default now()
);

comment on table job_events is 'Append-only: nunca editar nem apagar.';
comment on table job_approval_audit is 'Append-only: nunca editar nem apagar.';

create index jobs_day_idx on jobs(scheduled_on);
create index jobs_review_idx on jobs(review) where status = 'done';
create index assignments_person_idx on job_assignments(person_id);
create index events_job_idx on job_events(job_id, created_at);
```

- [ ] **Passo 2: Aplicar e confirmar**

`apply_migration` com `name: "0002_jobs"`. Depois, via `execute_sql`, confirmar que uma inserção sem `unit_id` falha (a coluna é `not null`):
```sql
select count(*) from jobs;
```
Esperado: `0`, sem erro.

- [ ] **Passo 3: Commit**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app"
git add supabase/migrations/0002_jobs.sql
git commit -m "feat(db): ciclo de vida da limpeza numa só tabela jobs com filhas append-only"
```

---

### Task 3: Mensagens, rendimentos e definições

**Files:**
- Create: `supabase/migrations/0003_messages_revenue.sql`

**Interfaces:**
- Consumes: `people`, `clients`, `units`, `jobs` (Tasks 1–2).
- Produces: `conversations`, `conversation_participants`, `messages`, `message_reads`, `message_attachments`, `notices`, `client_billing`, `billable_units`, `invoices`, `invoice_payments`, `team_payments`, `company_settings`.

- [ ] **Passo 1: Escrever a migração**

`supabase/migrations/0003_messages_revenue.sql`:

```sql
create type conversation_kind as enum ('equipa','cliente','interna');
create type message_state as enum ('sent','delivered','read','scheduled','failed');
create type billing_cycle as enum ('weekly','monthly','custom');
create type supply_model as enum ('included','client');

create table conversations (
  id uuid primary key default gen_random_uuid(),
  kind conversation_kind not null,
  title text not null default '',
  client_id uuid references clients(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  priority text not null default '',
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  primary key (conversation_id, person_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  from_person_id uuid not null references people(id) on delete restrict,
  text text not null default '',
  state message_state not null default 'sent',
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create table message_reads (
  message_id uuid not null references messages(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, person_id)
);

comment on table message_reads is
  'Substitui o booleano unread da Fase 1: com vários participantes, o estado de leitura é por pessoa.';

create table message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  storage_path text not null,
  name text not null default '',
  size text not null default '',
  kind text not null default 'file'
);

create table notices (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  priority text not null default 'info',
  audience text not null default 'todos',
  icon text not null default '',
  title text not null,
  text text not null default '',
  action text not null default '',
  target_type text,
  target_id uuid,
  read boolean not null default false,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

create table client_billing (
  client_id uuid primary key references clients(id) on delete cascade,
  cycle billing_cycle not null default 'custom',
  terms integer not null default 0,
  supply supply_model not null default 'client',
  supplement numeric(10,2) not null default 0
);

comment on table client_billing is
  'Omissões da ALClean: cycle=custom (quinzenal), terms=0 (à vista), supply=client.';

create table billable_units (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  name text not null,
  rate numeric(10,2) not null default 0
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  month text not null,
  period_from date not null,
  period_to date not null,
  issued_on date not null,
  due_on date not null,
  amount numeric(10,2) not null
);

create table invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  paid_on date not null,
  amount numeric(10,2) not null,
  method text not null default '',
  note text not null default '',
  registered_by uuid references people(id) on delete set null
);

comment on table invoice_payments is
  'O estado da fatura (paga/pendente/em atraso) é DEDUZIDO daqui e de due_on. Nunca guardar esse estado.';

create table team_payments (
  person_id uuid not null references people(id) on delete cascade,
  month text not null,
  paid_on date not null,
  primary key (person_id, month)
);

create table company_settings (
  id boolean primary key default true,
  duration_tolerance_min integer not null default 30,
  health_limits jsonb not null default
    '{"receipts":[70,50],"team":[55,62],"products":[4,6],"margin":[35,25]}'::jsonb,
  travel_included boolean not null default true,
  constraint company_settings_singleton check (id)
);

insert into company_settings (id) values (true);

create index messages_conversation_idx on messages(conversation_id, created_at);
create index participants_person_idx on conversation_participants(person_id);
create index invoices_client_idx on invoices(client_id);
```

- [ ] **Passo 2: Aplicar e confirmar**

`apply_migration` com `name: "0003_messages_revenue"`. Confirmar a linha única de definições:
```sql
select duration_tolerance_min, travel_included, health_limits from company_settings;
```
Esperado: `30`, `true`, o JSON com os quatro pares.

- [ ] **Passo 3: Commit**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app"
git add supabase/migrations/0003_messages_revenue.sql
git commit -m "feat(db): mensagens, faturação e definições da empresa"
```

---

### Task 4: RLS — a fronteira de segurança

**Files:**
- Create: `supabase/migrations/0004_rls.sql`

**Interfaces:**
- Consumes: todas as tabelas (Tasks 1–3).
- Produces: as funções `current_person_id()`, `is_manager()`, `my_team_id()` (usadas por políticas e pela app), e RLS ativa em todas as tabelas.

Esta é a task mais importante do plano. Um erro aqui expõe a faturação da empresa às colaboradoras.

- [ ] **Passo 1: Escrever a migração**

`supabase/migrations/0004_rls.sql`:

```sql
create or replace function current_person_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from people where auth_user_id = auth.uid()
$$;

create or replace function is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from people
    where auth_user_id = auth.uid() and role = 'manager' and not archived
  )
$$;

create or replace function my_team_id() returns uuid
language sql stable security definer set search_path = public as $$
  select team_id from people where auth_user_id = auth.uid()
$$;

create or replace function assigned_to_me(job uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from job_assignments
    where job_id = job and person_id = current_person_id()
  )
$$;

-- Ativar RLS em tudo. Sem política = sem acesso.
do $$
declare t text;
begin
  foreach t in array array[
    'teams','people','clients','service_locations','units','unit_calendars','absences',
    'jobs','job_assignments','job_checklist_items','job_laundry_counts','job_photos',
    'job_issues','job_events','job_approval_audit',
    'conversations','conversation_participants','messages','message_reads',
    'message_attachments','notices',
    'client_billing','billable_units','invoices','invoice_payments','team_payments',
    'company_settings'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- A gestora faz tudo, em todas as tabelas.
do $$
declare t text;
begin
  foreach t in array array[
    'teams','people','clients','service_locations','units','unit_calendars','absences',
    'jobs','job_assignments','job_checklist_items','job_laundry_counts','job_photos',
    'job_issues','job_events','job_approval_audit',
    'conversations','conversation_participants','messages','message_reads',
    'message_attachments','notices',
    'client_billing','billable_units','invoices','invoice_payments','team_payments',
    'company_settings'
  ] loop
    execute format(
      'create policy %I on %I for all to authenticated using (is_manager()) with check (is_manager())',
      t || '_manager_all', t);
  end loop;
end $$;

-- Colaboradora: leitura do que precisa para trabalhar.
create policy people_collab_read on people for select to authenticated
  using (team_id = my_team_id() or role = 'manager' or id = current_person_id());

create policy teams_collab_read on teams for select to authenticated using (true);

create policy locations_collab_read on service_locations for select to authenticated
  using (exists (select 1 from jobs j where j.location_id = service_locations.id
                 and (assigned_to_me(j.id) or j.team_id = my_team_id())));

create policy units_collab_read on units for select to authenticated
  using (exists (select 1 from jobs j where j.unit_id = units.id
                 and (assigned_to_me(j.id) or j.team_id = my_team_id())));

create policy clients_collab_read on clients for select to authenticated
  using (exists (select 1 from service_locations l
                 join jobs j on j.location_id = l.id
                 where l.client_id = clients.id
                   and (assigned_to_me(j.id) or j.team_id = my_team_id())));

create policy absences_collab_own on absences for select to authenticated
  using (person_id = current_person_id());

create policy jobs_collab_read on jobs for select to authenticated
  using (assigned_to_me(id) or team_id = my_team_id());

create policy assignments_collab_read on job_assignments for select to authenticated
  using (person_id = current_person_id() or exists (
    select 1 from jobs j where j.id = job_id and j.team_id = my_team_id()));

-- Colaboradora: escrita, só nas limpezas que lhe estão atribuídas.
create policy jobs_collab_update on jobs for update to authenticated
  using (assigned_to_me(id)) with check (assigned_to_me(id));

revoke update on jobs from authenticated;
grant update (status, started_at, finished_at, duration_sec, notes) on jobs to authenticated;

create policy checklist_collab on job_checklist_items for all to authenticated
  using (assigned_to_me(job_id)) with check (assigned_to_me(job_id));

create policy laundry_collab on job_laundry_counts for all to authenticated
  using (assigned_to_me(job_id)) with check (assigned_to_me(job_id));

create policy photos_collab on job_photos for all to authenticated
  using (assigned_to_me(job_id)) with check (assigned_to_me(job_id));

create policy issues_collab on job_issues for select to authenticated
  using (assigned_to_me(job_id));
create policy issues_collab_insert on job_issues for insert to authenticated
  with check (assigned_to_me(job_id));

create policy events_collab on job_events for select to authenticated
  using (assigned_to_me(job_id));
create policy events_collab_insert on job_events for insert to authenticated
  with check (assigned_to_me(job_id));

-- Mensagens: só as conversas em que participa.
create policy conversations_collab on conversations for select to authenticated
  using (exists (select 1 from conversation_participants p
                 where p.conversation_id = conversations.id
                   and p.person_id = current_person_id()));

create policy participants_collab on conversation_participants for select to authenticated
  using (person_id = current_person_id());

create policy messages_collab_read on messages for select to authenticated
  using (exists (select 1 from conversation_participants p
                 where p.conversation_id = messages.conversation_id
                   and p.person_id = current_person_id()));

create policy messages_collab_send on messages for insert to authenticated
  with check (from_person_id = current_person_id()
    and exists (select 1 from conversation_participants p
                where p.conversation_id = conversation_id
                  and p.person_id = current_person_id()));

create policy reads_collab on message_reads for all to authenticated
  using (person_id = current_person_id()) with check (person_id = current_person_id());

create policy attachments_collab on message_attachments for select to authenticated
  using (exists (select 1 from messages m
                 join conversation_participants p on p.conversation_id = m.conversation_id
                 where m.id = message_id and p.person_id = current_person_id()));

create policy notices_collab on notices for select to authenticated
  using (audience in ('todos','colab'));

-- Rendimentos: a colaboradora só vê o SEU pagamento. Mais nada.
create policy team_payments_collab on team_payments for select to authenticated
  using (person_id = current_person_id());

create policy settings_read on company_settings for select to authenticated using (true);
```

Nota deliberada: `client_billing`, `billable_units`, `invoices` e `invoice_payments` **não têm nenhuma política para colaboradoras**. Sem política, o RLS nega. É assim que a faturação fica fechada.

- [ ] **Passo 2: Aplicar e confirmar**

`apply_migration` com `name: "0004_rls"`. Depois:
```sql
select tablename, count(*) as politicas
from pg_policies where schemaname='public' group by 1 order by 1;
```
Esperado: todas as 27 tabelas presentes; `invoices` e `invoice_payments` com exatamente **1** política cada (só a da gestora).

- [ ] **Passo 3: Verificar que não sobrou nenhuma tabela sem RLS**

```sql
select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
```
Esperado: **zero linhas**. Se devolver alguma tabela, acrescentá-la aos dois arrays do `do $$` e reaplicar.

- [ ] **Passo 4: Commit**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app"
git add supabase/migrations/0004_rls.sql
git commit -m "feat(db): RLS — gestora vê tudo, colaboradora só o seu trabalho e o seu pagamento"
```

---

### Task 5: Cliente Supabase e variáveis no build

**Files:**
- Create: `src/modules/shared/supabase/client.ts`, `src/modules/shared/supabase/realtime.ts`, `src/modules/shared/supabase/index.ts`
- Modify: `package.json`, `build.mjs`

**Interfaces:**
- Consumes: URL e chave anon (Task 1).
- Produces:
  - `supabase` — instância `SupabaseClient` partilhada.
  - `subscribeTable(table: string, onChange: () => void): () => void` — subscreve INSERT/UPDATE/DELETE de uma tabela e devolve a função para cancelar.
  - `useSupabaseData<T>(carregar: () => Promise<T>, tabelas: string[], aplicar: (dados: T) => void): boolean` — carrega uma vez, volta a carregar a cada mudança nas tabelas indicadas, e devolve se já carregou. **É este o helper que as Tasks 9 a 15 usam para hidratar; nenhuma delas repete a lógica de carregamento e subscrição.**

- [ ] **Passo 1: Instalar a dependência**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app"
npm install @supabase/supabase-js@^2
```

- [ ] **Passo 2: Injetar as variáveis no build**

Em `build.mjs`, acrescentar ao objeto passado a `build({...})` dentro do ciclo:

```js
      define: {
        'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL ?? ''),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY ?? ''),
      },
```

E em `package.json`, mudar o script para carregar o `.env` sem dependências extra (Node 20.6+):
```json
    "build": "node --env-file=.env build.mjs",
```

- [ ] **Passo 3: Escrever o cliente**

`src/modules/shared/supabase/client.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Faltam SUPABASE_URL e SUPABASE_ANON_KEY. Copia .env.example para .env antes de compilar.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
```

`src/modules/shared/supabase/realtime.ts`:
```ts
import { supabase } from './client';

/** Subscreve as mudanças de uma tabela e devolve a função que cancela a subscrição. */
export function subscribeTable(table: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`alclean:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
```

`src/modules/shared/supabase/useSupabaseData.ts` — o padrão de hidratação, escrito **uma só vez** e usado pelos 7 módulos:
```ts
import { useEffect, useState } from 'react';
import { subscribeTable } from './realtime';

/**
 * Carrega dados do Supabase, volta a carregar sempre que uma das tabelas muda,
 * e devolve `true` assim que o primeiro carregamento termina.
 */
export function useSupabaseData<T>(
  carregar: () => Promise<T>,
  tabelas: string[],
  aplicar: (dados: T) => void,
): boolean {
  const [carregado, setCarregado] = useState(false);
  const chave = tabelas.join(',');

  useEffect(() => {
    let vivo = true;
    const recarregar = () => {
      void carregar()
        .then((dados) => {
          if (!vivo) return;
          aplicar(dados);
          setCarregado(true);
        })
        .catch((erro) => {
          console.error('Falha a carregar do Supabase:', erro);
          if (vivo) setCarregado(true);
        });
    };
    recarregar();
    const cancelar = chave ? chave.split(',').map((t) => subscribeTable(t, recarregar)) : [];
    return () => {
      vivo = false;
      cancelar.forEach((c) => c());
    };
    // `carregar` e `aplicar` têm de ser estáveis (useCallback) no chamador.
  }, [carregar, aplicar, chave]);

  return carregado;
}
```

`src/modules/shared/supabase/index.ts`:
```ts
export { supabase } from './client';
export { subscribeTable } from './realtime';
export { useSupabaseData } from './useSupabaseData';
```

- [ ] **Passo 4: Ativar Realtime nas tabelas**

Via `execute_sql`:
```sql
alter publication supabase_realtime add table jobs, job_events, job_checklist_items,
  job_laundry_counts, job_issues, messages, conversations, notices, absences, people;
```

- [ ] **Passo 5: Compilar**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app"
cp .env.example .env   # preencher com os valores reais da Task 1
npm run build
```
Esperado: `Build ALClean concluído: 7 módulos.` sem erros.

- [ ] **Passo 6: Commit**

```bash
git add package.json package-lock.json build.mjs src/modules/shared/supabase/
git commit -m "feat: cliente Supabase e injeção das variáveis públicas no build"
```

---

### Task 6: Autenticação — sessão, ecrã de entrada e provisionamento

**Files:**
- Create: `src/modules/shared/auth/AuthProvider.tsx`, `src/modules/shared/auth/LoginScreen.tsx`, `src/modules/shared/auth/index.ts`
- Create: `supabase/functions/provision-access/index.ts`
- Modify: os 7 `src/entries/*.tsx`, `src/modules/shared/ui/AppTopBar.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 5), `people` (Task 1).
- Produces:
  - `AuthProvider({ children }: { children: ReactNode })` — mostra `LoginScreen` enquanto não há sessão; só renderiza `children` com sessão válida.
  - `useAuth(): { person: SessionPerson; signOut: () => Promise<void> }`
  - `interface SessionPerson { id: string; name: string; initials: string; role: 'manager' | 'collab'; teamId: string | null; canReview: boolean }`
  - Edge Function `provision-access`, invocável por `supabase.functions.invoke('provision-access', { body: { personId, pin } })`.

Porquê uma Edge Function: criar a conta de outra pessoa exige a chave `service_role`, que nunca pode ir para o browser — `supabase.auth.signUp()` no browser trocaria a sessão da gestora pela da colaboradora. É a exceção prevista no spec ("uma Edge Function pontual").

- [ ] **Passo 1: Escrever o provedor de sessão**

`src/modules/shared/auth/AuthProvider.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../supabase';
import { initials } from '../ui';
import { LoginScreen } from './LoginScreen';

export interface SessionPerson {
  id: string;
  name: string;
  initials: string;
  role: 'manager' | 'collab';
  teamId: string | null;
  canReview: boolean;
}

interface AuthValue {
  person: SessionPerson;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth precisa do AuthProvider.');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [person, setPerson] = useState<SessionPerson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setPerson(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('people')
        .select('id,name,role,team_id')
        .eq('auth_user_id', session.session.user.id)
        .single();
      setPerson(
        data
          ? {
              id: data.id,
              name: data.name,
              initials: initials(data.name),
              role: data.role,
              teamId: data.team_id,
              canReview: data.role === 'manager',
            }
          : null,
      );
      setLoading(false);
    }
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void load());
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (!person) return <LoginScreen />;

  return (
    <AuthContext.Provider
      value={{ person, signOut: async () => { await supabase.auth.signOut(); } }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Passo 2: Escrever o ecrã de entrada**

`src/modules/shared/auth/LoginScreen.tsx` — dois modos num só ecrã. A gestora entra com email e palavra-passe; a colaboradora escolhe o seu nome e introduz o PIN de 6 dígitos. O PIN é a palavra-passe da conta interna `<slug>@alclean.local`; 6 dígitos porque o Supabase exige um mínimo de 6 caracteres.

```tsx
import { useState } from 'react';
import { supabase } from '../supabase';
import { Button, Field, inputBase } from '../ui';

const slug = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');

export function LoginScreen() {
  const [modo, setModo] = useState<'colab' | 'gestora'>('colab');
  const [nome, setNome] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [aEntrar, setAEntrar] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setAEntrar(true);
    const credenciais =
      modo === 'gestora'
        ? { email, password }
        : { email: `${slug(nome)}@alclean.local`, password: pin };
    const { error } = await supabase.auth.signInWithPassword(credenciais);
    setAEntrar(false);
    if (error) setErro('Não foi possível entrar. Confirma os dados e tenta outra vez.');
  }

  return (
    <div className="min-h-screen grid place-items-center bg-white p-6">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-4">
        <div className="text-2xl font-bold">
          AL<span className="text-[#0D9488]">Clean</span>
        </div>
        {modo === 'gestora' ? (
          <>
            <Field label="Email">
              <input className={inputBase} type="email" value={email}
                     onChange={(ev) => setEmail(ev.target.value)} required />
            </Field>
            <Field label="Palavra-passe">
              <input className={inputBase} type="password" value={password}
                     onChange={(ev) => setPassword(ev.target.value)} required />
            </Field>
          </>
        ) : (
          <>
            <Field label="O teu nome">
              <input className={inputBase} value={nome}
                     onChange={(ev) => setNome(ev.target.value)} required />
            </Field>
            <Field label="PIN">
              <input className={inputBase} inputMode="numeric" pattern="\d{6}" value={pin}
                     onChange={(ev) => setPin(ev.target.value)} required />
            </Field>
          </>
        )}
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <Button type="submit" disabled={aEntrar}>{aEntrar ? 'A entrar…' : 'Entrar'}</Button>
        <button type="button" className="text-sm text-[#0D9488] underline"
                onClick={() => setModo(modo === 'colab' ? 'gestora' : 'colab')}>
          {modo === 'colab' ? 'Entrar como gestora' : 'Entrar como colaboradora'}
        </button>
      </form>
    </div>
  );
}
```

`src/modules/shared/auth/index.ts`:
```ts
export { AuthProvider, useAuth } from './AuthProvider';
export type { SessionPerson } from './AuthProvider';
```

- [ ] **Passo 3: Escrever a Edge Function de provisionamento**

`supabase/functions/provision-access/index.ts`:
```ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const slug = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');

Deno.serve(async (req) => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const caller = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );

  const { data: quemChama } = await caller
    .from('people').select('role').eq('auth_user_id',
      (await caller.auth.getUser()).data.user?.id ?? '').single();
  if (quemChama?.role !== 'manager') {
    return new Response(JSON.stringify({ error: 'Só a gestora pode dar acesso.' }), { status: 403 });
  }

  const { personId, pin } = await req.json();
  if (!/^\d{6}$/.test(pin ?? '')) {
    return new Response(JSON.stringify({ error: 'O PIN tem de ter 6 dígitos.' }), { status: 400 });
  }

  const { data: pessoa } = await admin
    .from('people').select('id,name,auth_user_id').eq('id', personId).single();
  if (!pessoa) {
    return new Response(JSON.stringify({ error: 'Pessoa não encontrada.' }), { status: 404 });
  }

  const email = `${slug(pessoa.name)}@alclean.local`;
  let authUserId = pessoa.auth_user_id as string | null;

  if (authUserId) {
    await admin.auth.admin.updateUserById(authUserId, { password: pin });
  } else {
    const { data: criado, error } = await admin.auth.admin.createUser({
      email, password: pin, email_confirm: true,
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    authUserId = criado.user.id;
  }

  await admin.from('people')
    .update({ auth_user_id: authUserId, email, access: 'active', sent_at: new Date().toISOString() })
    .eq('id', personId);

  return new Response(JSON.stringify({ ok: true, email }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Publicar com a ferramenta MCP `deploy_edge_function` (nome `provision-access`).

- [ ] **Passo 4: Envolver os 7 pontos de entrada**

Em cada um dos 7 `src/entries/*.tsx`, acrescentar o import e envolver o conteúdo. Exemplo completo para `src/entries/equipas.tsx` (os outros seis seguem a mesma forma, trocando o módulo importado):

```tsx
import { createRoot } from 'react-dom/client';
import { TeamsModule } from '../modules/equipas';
import { ModulosAtivosProvider } from '../modules/shared/company';
import { AuthProvider } from '../modules/shared/auth';

/** Configuração de módulos da ALClean: base + Rendimentos ativo, Inventário e Serviços ligados por ativar. */
const ALCLEAN_MODULOS = { rendimentos: true, inventario: false, servicosLigados: false };

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <ModulosAtivosProvider value={ALCLEAN_MODULOS}>
      <TeamsModule mode="micro" />
    </ModulosAtivosProvider>
  </AuthProvider>,
);
```

- [ ] **Passo 5: Ligar a barra de topo à sessão**

Em `src/modules/shared/ui/AppTopBar.tsx`, o item de menu "Terminar sessão" chama hoje `notify('Sessão terminada (simulação).')`. Passa a terminar a sessão a sério, e as iniciais passam a vir da pessoa autenticada:

```tsx
import { useAuth } from '../auth';

// dentro de AppTopBar, antes do return:
const { person, signOut } = useAuth();
const iniciais = userInitials || person.initials;

// no ActionMenu, substituir o item de "Terminar sessão" por:
<MenuItem onClick={() => { void signOut(); }}>Terminar sessão</MenuItem>
```

Usar `iniciais` onde o componente usa hoje `userInitials`. A prop mantém-se como override (fica vazia na app real), para não partir chamadas existentes nem as pré-visualizações.

Cuidado com a ordem de importação: `shared/ui` não pode importar `shared/auth` no barrel (`index.ts`), senão cria um ciclo — `AuthProvider` importa `initials` de `shared/ui`. O import acima é direto ao ficheiro (`'../auth'` resolve para `shared/auth/index.ts`, que não reexporta nada de `shared/ui`), por isso não há ciclo. Confirmar que `npm run build` não emite aviso de dependência circular.

- [ ] **Passo 6: Criar a conta da gestora e verificar**

Via `execute_sql`, criar a linha da Carla e ligá-la a um utilizador criado no painel do Supabase (Authentication → Add user, email real da gestora):
```sql
insert into people (name, email, role, access)
values ('Carla Mendes', '<email da gestora>', 'manager', 'active')
returning id;

update people set auth_user_id = '<uuid do utilizador criado>'
where email = '<email da gestora>';
```

Compilar e abrir `preview/module-2-equipas-react.html`. Esperado: aparece o ecrã de entrada; ao entrar com o email e palavra-passe da gestora, o módulo abre; o menu ☰ → "Terminar sessão" volta ao ecrã de entrada.

- [ ] **Passo 7: Commit**

```bash
git add src/modules/shared/auth/ src/entries/ src/modules/shared/ui/AppTopBar.tsx supabase/functions/
git commit -m "feat(auth): sessão real, ecrã de entrada e provisionamento de acessos"
```

---

### Task 7: Seed — os dados da ALClean na base de dados

**Files:**
- Create: `scripts/seed.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: todas as tabelas (Tasks 1–3).
- Produces: a base de dados populada com os mesmos exemplos já aprovados: 4 clientes, 5 pessoas, 2 equipas, alojamentos, quartos e as limpezas do dia de referência.

- [ ] **Passo 1: Escrever o script**

`scripts/seed.mjs` — usa a chave `service_role` (corre no terminal, nunca no browser) e é idempotente: apaga e repõe.

```js
import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const limpar = async () => {
  for (const t of ['job_approval_audit','job_events','job_issues','job_photos',
    'job_laundry_counts','job_checklist_items','job_assignments','jobs',
    'message_attachments','message_reads','messages','conversation_participants',
    'conversations','notices','invoice_payments','invoices','billable_units',
    'client_billing','team_payments','unit_calendars','units','service_locations',
    'clients','absences']) {
    await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
  await db.from('people').delete().eq('role', 'collab');
  await db.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
};

const inserir = async (tabela, linhas) => {
  const { data, error } = await db.from(tabela).insert(linhas).select();
  if (error) throw new Error(`${tabela}: ${error.message}`);
  return data;
};

await limpar();

const [alfa, beta] = await inserir('teams', [{ name: 'Equipa Alfa' }, { name: 'Equipa Beta' }]);

const pessoas = await inserir('people', [
  { name: 'Sofia Martins',  role: 'collab', team_id: alfa.id, per_job_rate: 10.00, access: 'none' },
  { name: 'Rui Cabral',     role: 'collab', team_id: alfa.id, per_job_rate:  9.50, access: 'none' },
  { name: 'Inês Ferreira',  role: 'collab', team_id: beta.id, per_job_rate: 10.50, access: 'none' },
  { name: 'Beatriz Teles',  role: 'collab', team_id: beta.id, per_job_rate:  9.00, access: 'none' },
]);
const porNome = Object.fromEntries(pessoas.map((p) => [p.name, p.id]));

await db.from('teams').update({ lead_id: porNome['Sofia Martins'] }).eq('id', alfa.id);
await db.from('teams').update({ lead_id: porNome['Inês Ferreira'] }).eq('id', beta.id);

const clientes = await inserir('clients', [
  { name: 'Apartamentos Baixa-Chiado', segment: 'Alojamento Local', nif: '509876543',
    contact: 'Marta Nogueira', email: 'marta@baixachiadoapartments.pt', phone: '+351 917 234 561',
    address: 'Rua Nova do Almada 78, 1200-288 Lisboa', since: 'jan 2025',
    laundry_enabled: true,
    laundry_setup: { lencol: 2, edredon: 2, fronhas: 4, banho: 2, rosto: 2 } },
  { name: 'Villa Mar Cascais', segment: 'Alojamento Local', nif: '507112233',
    contact: 'Henrique Salvador', email: 'henrique@villamarcascais.pt', phone: '+351 919 887 012',
    address: 'Avenida Valbom 24, 2750-508 Cascais', since: 'mar 2025',
    laundry_enabled: true,
    laundry_setup: { lencol: 3, edredon: 3, fronhas: 5, banho: 3, rosto: 3 } },
  { name: 'Residencial Setúbal', segment: 'Gestão de Imóveis', nif: '508445566',
    contact: 'Fernando Duarte', email: 'fernando.duarte@residencialsetubal.pt',
    phone: '+351 913 456 720', address: 'Avenida Luísa Todi 140, 2900-451 Setúbal',
    since: 'set 2024', laundry_enabled: false },
  { name: 'João Teixeira', segment: 'Particular', nif: '',
    contact: 'João Teixeira', email: 'joao.teixeira@email.pt', phone: '+351 916 203 447',
    address: 'Rua da Prata 12, 1100-415 Lisboa', since: 'jun 2025', laundry_enabled: false },
]);
const cliente = Object.fromEntries(clientes.map((c) => [c.name, c.id]));

await inserir('client_billing', clientes.map((c) => ({
  client_id: c.id, cycle: 'custom', terms: 0, supply: 'client', supplement: 0,
})));

const alojamentos = await inserir('service_locations', [
  { client_id: cliente['Apartamentos Baixa-Chiado'], name: 'Apto. Baixa 2ºD',
    address: 'Rua Nova do Almada 78, 2ºD, 1200-288 Lisboa', team_id: alfa.id },
  { client_id: cliente['Apartamentos Baixa-Chiado'], name: 'Apto. Baixa 4ºE',
    address: 'Rua Nova do Almada 78, 4ºE, 1200-288 Lisboa', team_id: alfa.id },
  { client_id: cliente['Apartamentos Baixa-Chiado'], name: 'Apto. Chiado Loft',
    address: 'Rua Garrett 44, 1200-204 Lisboa', team_id: alfa.id },
  { client_id: cliente['Villa Mar Cascais'], name: 'Villa Mar Cascais',
    address: 'Avenida Valbom 24, 2750-508 Cascais', team_id: beta.id },
  { client_id: cliente['Residencial Setúbal'], name: 'Residencial Setúbal — A',
    address: 'Avenida Luísa Todi 140, 2900-451 Setúbal', team_id: beta.id },
  { client_id: cliente['Residencial Setúbal'], name: 'Residencial Setúbal — B',
    address: 'Avenida Luísa Todi 142, 2900-451 Setúbal', team_id: beta.id },
  { client_id: cliente['João Teixeira'], name: 'Apartamento João Teixeira',
    address: 'Rua da Prata 12, 1100-415 Lisboa', team_id: alfa.id },
]);
const aloj = Object.fromEntries(alojamentos.map((l) => [l.name, l.id]));

const quartos = await inserir('units', [
  { location_id: aloj['Apto. Baixa 2ºD'], name: 'Quarto 1', type: 'Quarto duplo', capacity: 2 },
  { location_id: aloj['Apto. Baixa 2ºD'], name: 'Quarto 2', type: 'Quarto duplo', capacity: 2 },
  { location_id: aloj['Apto. Baixa 4ºE'], name: 'Quarto 1', type: 'Quarto duplo', capacity: 2 },
  { location_id: aloj['Apto. Chiado Loft'], name: 'Chiado Loft', type: 'Estúdio', capacity: 2 },
  { location_id: aloj['Villa Mar Cascais'], name: 'Quarto Vista Mar', type: 'Suite', capacity: 2 },
  { location_id: aloj['Villa Mar Cascais'], name: 'Quarto Jardim', type: 'Quarto duplo', capacity: 2 },
  { location_id: aloj['Residencial Setúbal — A'], name: 'Quarto 1', type: 'Quarto duplo', capacity: 2 },
  { location_id: aloj['Residencial Setúbal — B'], name: 'Quarto 1', type: 'Quarto duplo', capacity: 2 },
  { location_id: aloj['Apartamento João Teixeira'], name: 'Apartamento', type: 'T1', capacity: 3 },
]);

await inserir('billable_units', quartos.map((u) => {
  const alojamento = alojamentos.find((l) => l.id === u.location_id);
  return { client_id: alojamento.client_id, unit_id: u.id,
           name: `${alojamento.name} · ${u.name}`, rate: 18.00 };
}));

console.log(`Seed concluído: ${clientes.length} clientes, ${alojamentos.length} alojamentos, ` +
            `${quartos.length} quartos, ${pessoas.length} colaboradoras.`);
```

- [ ] **Passo 2: Acrescentar o script ao `package.json`**

```json
    "seed": "node --env-file=.env scripts/seed.mjs",
```

- [ ] **Passo 3: Correr e confirmar**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app"
npm run seed
```
Esperado: `Seed concluído: 4 clientes, 7 alojamentos, 9 quartos, 4 colaboradoras.`

Confirmar via `execute_sql` que a lavandaria ficou ao nível do cliente:
```sql
select name, laundry_enabled, laundry_setup->>'fronhas' as fronhas from clients order by name;
```
Esperado: `Apartamentos Baixa-Chiado` com `true` e `4`; `Residencial Setúbal` e `João Teixeira` com `false`.

- [ ] **Passo 4: Commit**

```bash
git add scripts/seed.mjs package.json
git commit -m "feat: seed com os clientes, alojamentos e equipas reais da ALClean"
```

---

### Task 8: Verificação das fronteiras de acesso

**Files:**
- Create: `scripts/rls-check.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: RLS (Task 4), auth (Task 6), seed (Task 7).
- Produces: `npm run rls-check`, que sai com código 1 se alguma fronteira falhar.

Este é o único teste automatizado do plano, e existe porque é a única parte onde um erro silencioso expõe dados a sério.

- [ ] **Passo 1: Escrever o teste**

`scripts/rls-check.mjs`:
```js
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

const falhas = [];
const verificar = (nome, condicao) => {
  if (condicao) console.log(`  ok   ${nome}`);
  else { console.error(`  FALHA ${nome}`); falhas.push(nome); }
};

// Prepara uma colaboradora de teste com PIN conhecido.
const { data: sofia } = await admin.from('people').select('id,name').eq('name', 'Sofia Martins').single();
const email = 'sofia.martins@alclean.local';
const { data: existente } = await admin.auth.admin.listUsers();
const jaCriado = existente.users.find((u) => u.email === email);
const pin = '654321';
if (jaCriado) await admin.auth.admin.updateUserById(jaCriado.id, { password: pin });
else {
  const { data } = await admin.auth.admin.createUser({ email, password: pin, email_confirm: true });
  await admin.from('people').update({ auth_user_id: data.user.id, email, access: 'active' }).eq('id', sofia.id);
}

console.log('Sessão sem autenticação:');
const anonimo = createClient(url, anon);
for (const t of ['people', 'jobs', 'invoices', 'clients']) {
  const { data } = await anonimo.from(t).select('*').limit(1);
  verificar(`${t} não é legível sem sessão`, !data || data.length === 0);
}

console.log('Sessão de colaboradora:');
const colab = createClient(url, anon);
const { error: erroEntrada } = await colab.auth.signInWithPassword({ email, password: pin });
verificar('a colaboradora consegue entrar', !erroEntrada);

const { data: faturas } = await colab.from('invoices').select('*');
verificar('não lê faturação da empresa', !faturas || faturas.length === 0);

const { data: pagamentos } = await colab.from('invoice_payments').select('*');
verificar('não lê recebimentos', !pagamentos || pagamentos.length === 0);

const { data: faturacaoCliente } = await colab.from('client_billing').select('*');
verificar('não lê condições de faturação dos clientes', !faturacaoCliente || faturacaoCliente.length === 0);

const { data: meus } = await colab.from('team_payments').select('*');
verificar('só vê os próprios pagamentos',
  (meus ?? []).every((p) => p.person_id === sofia.id));

const { error: erroEscrita } = await colab.from('clients')
  .update({ name: 'alterado indevidamente' }).eq('name', 'Villa Mar Cascais');
verificar('não consegue alterar clientes', !!erroEscrita);

console.log(falhas.length ? `\n${falhas.length} fronteira(s) em falha.` : '\nTodas as fronteiras seguras.');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Passo 2: Acrescentar o script**

```json
    "rls-check": "node --env-file=.env scripts/rls-check.mjs",
```

- [ ] **Passo 3: Correr**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app"
npm run rls-check
```
Esperado: todas as linhas `ok`, e `Todas as fronteiras seguras.` com código de saída 0. **Se alguma falhar, corrigir a política na Task 4 antes de continuar** — nenhuma task seguinte deve avançar com uma fronteira aberta.

- [ ] **Passo 4: Commit**

```bash
git add scripts/rls-check.mjs package.json
git commit -m "test: verificação automática das fronteiras de acesso"
```

---

### Task 9: Equipas — dados reais

**Files:**
- Create: `src/modules/equipas/repository.ts`
- Modify: `src/modules/equipas/useTeamsModule.ts`

**Interfaces:**
- Consumes: `supabase`, `subscribeTable` (Task 5); `useAuth` (Task 6); tabelas `people`, `teams`, `absences` (Task 1); Edge Function `provision-access` (Task 6).
- Produces: `loadTeamsData(): Promise<TeamsData>` e as escritas listadas abaixo, reutilizáveis por outros módulos que precisem de pessoas e equipas.

- [ ] **Passo 1: Escrever o repositório**

`src/modules/equipas/repository.ts`. Traduz entre `snake_case` (base de dados) e os tipos `camelCase` do módulo, que **não mudam**:

```ts
import { supabase } from '../shared/supabase';
import type { Absence, AbsenceDraft, NewPersonInput, Person, PersonEditInput, TeamDraft, TeamsData } from './types';

const paraPessoa = (r: any): Person => ({
  id: r.id, name: r.name, email: r.email, phone: r.phone, role: r.role,
  teamId: r.team_id, access: r.access, perJobRate: r.per_job_rate,
  completedJobs: r.completed_jobs, since: r.since, archived: r.archived, sentAt: r.sent_at,
});

export async function loadTeamsData(): Promise<TeamsData> {
  const [people, teams, absences, clients, locations] = await Promise.all([
    supabase.from('people').select('*').order('name'),
    supabase.from('teams').select('*').order('name'),
    supabase.from('absences').select('*').order('starts_on'),
    supabase.from('clients').select('id,name').order('name'),
    supabase.from('service_locations').select('id,name,team_id,client_id').order('name'),
  ]);
  // Team.clientIds e Team.accommodationIds não são colunas: a associação real é
  // service_locations.team_id. São derivadas daqui, nunca guardadas em duplicado.
  const alojamentosDaEquipa = (teamId: string) =>
    (locations.data ?? []).filter((l: any) => l.team_id === teamId);

  return {
    people: (people.data ?? []).map(paraPessoa),
    teams: (teams.data ?? []).map((t: any) => ({
      id: t.id, name: t.name, leadId: t.lead_id, zones: t.zones,
      accommodationIds: alojamentosDaEquipa(t.id).map((l: any) => l.id),
      clientIds: [...new Set(alojamentosDaEquipa(t.id).map((l: any) => l.client_id))] as string[],
    })),
    clients: (clients.data ?? []).map((c: any) => ({ id: c.id, name: c.name })),
    accommodations: (locations.data ?? []).map((l: any) => ({
      id: l.id, name: l.name, zone: '', defaultTeamId: l.team_id,
    })),
    absences: (absences.data ?? []).map((a: any): Absence => ({
      id: a.id, personId: a.person_id, type: a.type, start: a.starts_on, end: a.ends_on,
      allDay: a.all_day, from: a.starts_at ?? '', to: a.ends_at ?? '',
      status: a.status, note: a.note,
    })),
  };
}

export async function insertPerson(input: NewPersonInput): Promise<string> {
  const { data, error } = await supabase.from('people').insert({
    name: input.name.trim(), email: input.email.trim(), role: input.role,
    team_id: input.teamId || null,
    per_job_rate: input.perJobRate ? Number(input.perJobRate) : null,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function updatePersonRow(id: string, input: PersonEditInput): Promise<void> {
  const { error } = await supabase.from('people').update({
    name: input.name.trim(), email: input.email.trim(), phone: input.phone.trim(),
    role: input.role, team_id: input.teamId || null,
    per_job_rate: input.perJobRate ? Number(input.perJobRate) : null,
  }).eq('id', id);
  if (error) throw error;
}

/** Cria (ou renova) a conta da colaboradora. Só a gestora consegue: a Edge Function verifica. */
export async function provisionAccess(personId: string, pin: string): Promise<void> {
  const { error } = await supabase.functions.invoke('provision-access', { body: { personId, pin } });
  if (error) throw error;
}

export async function setAccess(id: string, access: Person['access']): Promise<void> {
  const { error } = await supabase.from('people').update({ access }).eq('id', id);
  if (error) throw error;
}

export async function setArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await supabase.from('people')
    .update({ archived, ...(archived ? { access: 'suspended' as const } : {}) }).eq('id', id);
  if (error) throw error;
}

export async function deletePersonRow(id: string): Promise<void> {
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw error;
}

export async function saveTeamRow(teamId: string | null, draft: TeamDraft): Promise<string> {
  const linha = { name: draft.name.trim(), lead_id: draft.leadId || null, zones: draft.zones };
  const { data, error } = teamId
    ? await supabase.from('teams').update(linha).eq('id', teamId).select('id').single()
    : await supabase.from('teams').insert(linha).select('id').single();
  if (error) throw error;
  const id = data.id;
  await supabase.from('people').update({ team_id: null }).eq('team_id', id);
  if (draft.memberIds.length) {
    await supabase.from('people').update({ team_id: id }).in('id', draft.memberIds);
  }
  if (draft.defaultAccommodationIds.length) {
    await supabase.from('service_locations')
      .update({ team_id: id }).in('id', draft.defaultAccommodationIds);
  }
  return id;
}

export async function deleteTeamRow(id: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) throw error;
}

export async function insertAbsence(draft: AbsenceDraft): Promise<string> {
  const { data, error } = await supabase.from('absences').insert({
    person_id: draft.personId, type: draft.type, starts_on: draft.start, ends_on: draft.end,
    all_day: draft.allDay, starts_at: draft.allDay ? null : draft.from,
    ends_at: draft.allDay ? null : draft.to, status: draft.status, note: draft.note.trim(),
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function updateAbsenceStatus(id: string, status: Absence['status']): Promise<void> {
  const { error } = await supabase.from('absences').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteAbsence(id: string): Promise<void> {
  const { error } = await supabase.from('absences').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Passo 2: Hidratar o hook**

Em `src/modules/equipas/useTeamsModule.ts`, a linha ≈185 é hoje:
```ts
const [data, dispatch] = useReducer(reducer, initialData ?? null, (d) => d ?? createDemoData());
```
Substituir o arranque por estado vazio e hidratar com o helper da Task 5:
```ts
import { useSupabaseData } from '../shared/supabase';
import { loadTeamsData } from './repository';

const VAZIO: TeamsData = { people: [], teams: [], clients: [], accommodations: [], absences: [] };

const [data, dispatch] = useReducer(reducer, initialData ?? VAZIO);

const aplicar = useCallback((d: TeamsData) => dispatch({ type: 'reset', data: d }), []);
const carregado = useSupabaseData(
  loadTeamsData, ['people', 'teams', 'absences', 'service_locations'], aplicar);
```
Devolver `carregado` no objeto do hook, para o módulo poder mostrar um estado de carregamento. `loadTeamsData` é estável por ser importada do módulo; `aplicar` é estabilizada com `useCallback`.

- [ ] **Passo 3: Ligar cada ação à escrita**

Manter **todos os nomes e assinaturas das ações** (`addPerson`, `updatePerson`, `sendAccess`, `suspendAccess`, `reactivateAccess`, `simulateAccess`, `archivePerson`, `restorePerson`, `deletePerson`, `saveTeam`, `archiveTeam`, `addAbsence`, `setAbsenceStatus`, `cancelAbsence`, `reset`, `notify`). Cada uma passa a fazer o `dispatch` local (para a UI reagir já) **e** a chamada ao repositório. Mapa exato:

| Ação | Chamada |
|---|---|
| `addPerson` | `insertPerson(input)` — devolve o id real; usar esse id no dispatch |
| `updatePerson` | `updatePersonRow(id, input)` |
| `sendAccess` | `provisionAccess(id, pin)` — a UI passa a pedir um PIN de 6 dígitos; em caso de erro, `setAccess(id, 'failed')` |
| `suspendAccess` | `setAccess(id, 'suspended')` |
| `reactivateAccess` | `setAccess(id, 'active')` |
| `simulateAccess` | remover: deixa de fazer sentido com contas reais |
| `archivePerson` / `restorePerson` | `setArchived(id, true/false)` |
| `deletePerson` | `deletePersonRow(id)` — manter a guarda local `completedJobs > 0` |
| `saveTeam` | `saveTeamRow(teamId, draft)` |
| `archiveTeam` | `deleteTeamRow(id)` |
| `addAbsence` | `insertAbsence(draft)` |
| `setAbsenceStatus` | `updateAbsenceStatus(id, status)` |
| `cancelAbsence` | `deleteAbsence(id)` |
| `reset` | recarrega do Supabase (`loadTeamsData`), já não recria dados de exemplo |
| `notify` | inalterada (só toast) |

Se a escrita falhar, mostrar toast com a mensagem de erro e recarregar do servidor — a UI nunca deve ficar a mostrar algo que não foi guardado.

- [ ] **Passo 4: Verificar no browser**

```bash
npm run build
```
Abrir `preview/module-2-equipas-react.html`, entrar como gestora. Esperado: as 4 colaboradoras e as 2 equipas vindas da base de dados; criar uma ausência e confirmar via `execute_sql` que `select count(*) from absences` aumentou; recarregar a página e a ausência continuar lá.

- [ ] **Passo 5: Commit**

```bash
git add src/modules/equipas/
git commit -m "feat(equipas): dados reais do Supabase com tempo real"
```

---

### Task 10: Clientes — dados reais

**Files:**
- Create: `src/modules/clientes/repository.ts`
- Modify: `src/modules/clientes/useClientsModule.ts`

**Interfaces:**
- Consumes: `supabase`, `subscribeTable`; tabelas `clients`, `service_locations`, `units`, `unit_calendars`.
- Produces: `loadClientsData(): Promise<ClientsData>` e as escritas abaixo.

- [ ] **Passo 1: Escrever o repositório**

`src/modules/clientes/repository.ts`. Atenção ao detalhe estrutural: na base de dados `units` é uma tabela própria; no tipo `ServiceLocation` os quartos vêm **aninhados** em `.units`. A tradução acontece aqui.

```ts
import { supabase } from '../shared/supabase';
import type { Client, ClientInput, ClientsData, LaundryQty, LocationInput,
  ServiceLocation, Unit } from './types';

export async function loadClientsData(): Promise<ClientsData> {
  const [clients, locations, units, calendars] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('service_locations').select('*').order('name'),
    supabase.from('units').select('*').order('name'),
    supabase.from('unit_calendars').select('*'),
  ]);
  const calendariosDe = (unitId: string) =>
    (calendars.data ?? []).filter((c: any) => c.unit_id === unitId).map((c: any) => ({
      id: c.id, platform: c.platform, url: c.url, status: c.status,
      lastSync: c.last_sync, imported: c.imported,
    }));
  const quartosDe = (locationId: string): Unit[] =>
    (units.data ?? []).filter((u: any) => u.location_id === locationId).map((u: any) => ({
      id: u.id, name: u.name, type: u.type, capacity: u.capacity, status: u.status,
      teamId: u.team_id, hourlyRate: u.hourly_rate, laundry: u.laundry,
      checkoutTime: u.checkout_time, checkinTime: u.checkin_time,
      calendars: calendariosDe(u.id),
    }));
  return {
    clients: (clients.data ?? []).map((c: any): Client => ({
      id: c.id, name: c.name, segment: c.segment, nif: c.nif, contact: c.contact,
      email: c.email, phone: c.phone, address: c.address, billing: 'Quinzenal',
      payment: 'ok', status: c.status, image: c.image, since: c.since, notes: c.notes,
      laundryEnabled: c.laundry_enabled, laundrySetup: c.laundry_setup as LaundryQty,
    })),
    locations: (locations.data ?? []).map((l: any): ServiceLocation => ({
      id: l.id, clientId: l.client_id, name: l.name, address: l.address, status: l.status,
      image: l.image, serviceIds: l.service_ids, teamId: l.team_id, hourlyRate: l.hourly_rate,
      checkoutTime: l.checkout_time, checkinTime: l.checkin_time,
      accessInstructions: l.access_instructions, notes: l.notes, units: quartosDe(l.id),
    })),
  };
}

export async function saveClientRow(id: string | null, input: ClientInput): Promise<string> {
  const linha = {
    name: input.name.trim(), segment: input.segment, nif: input.nif.replace(/\D/g, ''),
    contact: input.contact.trim(), email: input.email.trim(), phone: input.phone.trim(),
    address: input.address.trim(), status: input.status, notes: input.notes.trim(),
    laundry_enabled: input.laundryEnabled, laundry_setup: input.laundrySetup,
  };
  const { data, error } = id
    ? await supabase.from('clients').update(linha).eq('id', id).select('id').single()
    : await supabase.from('clients').insert(linha).select('id').single();
  if (error) throw error;
  if (!id) {
    await supabase.from('client_billing').insert({ client_id: data.id, cycle: 'custom', terms: 0 });
  }
  return data.id;
}

export async function setClientStatusRow(id: string, status: Client['status']): Promise<void> {
  const { error } = await supabase.from('clients').update({ status }).eq('id', id);
  if (error) throw error;
}

/** A lavandaria é do cliente e vale para todos os alojamentos dele — decisão validada em Clientes. */
export async function setClientLaundryRow(
  id: string, laundryEnabled: boolean, laundrySetup: LaundryQty,
): Promise<void> {
  const { error } = await supabase.from('clients')
    .update({ laundry_enabled: laundryEnabled, laundry_setup: laundrySetup }).eq('id', id);
  if (error) throw error;
}

export async function saveLocationRow(
  clientId: string, id: string | null, input: LocationInput, unitType: string,
): Promise<string> {
  const linha = {
    client_id: clientId, name: input.name.trim(), address: input.address.trim(),
    image: input.image, status: input.status, service_ids: input.serviceIds,
    team_id: input.teamId || null,
    hourly_rate: input.hourlyRate ? Number(input.hourlyRate) : null,
    checkout_time: input.checkoutTime || '11:00', checkin_time: input.checkinTime || '15:00',
  };
  const { data, error } = id
    ? await supabase.from('service_locations').update(linha).eq('id', id).select('id').single()
    : await supabase.from('service_locations').insert(linha).select('id').single();
  if (error) throw error;
  if (!id && input.unitNames.length) {
    await supabase.from('units').insert(input.unitNames.map((name) => ({
      location_id: data.id, name: name.trim(), type: unitType, capacity: 2,
    })));
  }
  return data.id;
}

export async function saveUnitRows(units: Unit[]): Promise<void> {
  for (const u of units) {
    const { error } = await supabase.from('units').update({
      name: u.name, type: u.type, capacity: u.capacity, status: u.status,
      team_id: u.teamId, hourly_rate: u.hourlyRate, laundry: u.laundry,
      checkout_time: u.checkoutTime, checkin_time: u.checkinTime,
    }).eq('id', u.id);
    if (error) throw error;
  }
}

export async function setLocationStatusRow(id: string, status: ServiceLocation['status']): Promise<void> {
  const { error } = await supabase.from('service_locations').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteLocationRow(id: string): Promise<void> {
  const { error } = await supabase.from('service_locations').delete().eq('id', id);
  if (error) throw error;
}
```

- [ ] **Passo 2: Hidratar o hook**

Em `src/modules/clientes/useClientsModule.ts`, linha ≈66, substituir o inicializador `(d) => d ?? createDemoData()` por estado vazio e hidratar:

```ts
import { useSupabaseData } from '../shared/supabase';
import { loadClientsData } from './repository';

const [data, dispatch] = useReducer(reducer, initialData ?? { clients: [], locations: [] });

const aplicar = useCallback((d: ClientsData) => dispatch({ type: 'reset', data: d }), []);
const carregado = useSupabaseData(
  loadClientsData, ['clients', 'service_locations', 'units', 'unit_calendars'], aplicar);
```
Devolver `carregado` no objeto do hook.

- [ ] **Passo 3: Ligar as ações**

| Ação | Chamada |
|---|---|
| `saveClient` | `saveClientRow(id, input)` |
| `setClientStatus` | `setClientStatusRow(id, status)` |
| `setClientLaundry` | `setClientLaundryRow(id, laundryEnabled, laundrySetup)` |
| `saveLocation` | `saveLocationRow(clientId, id, input, unitType)` |
| `commitLocation` | `saveLocationRow(...)` seguido de `saveUnitRows(draft.units)` — manter o cálculo local de `applyToSelectedUnits` antes de gravar |
| `setLocationStatus` | `setLocationStatusRow(id, status)` |
| `removeLocation` | `deleteLocationRow(id)` |
| `reset` | recarrega com `loadClientsData()` |

- [ ] **Passo 4: Verificar**

`npm run build`, abrir `preview/module-3-clientes-react.html`. Esperado: os 4 clientes reais; abrir "Apartamentos Baixa-Chiado" → aba Lavandaria mostra o interruptor ligado com as quantidades do seed; desligar e confirmar com `select laundry_enabled from clients where name='Apartamentos Baixa-Chiado'` que ficou `false`.

- [ ] **Passo 5: Commit**

```bash
git add src/modules/clientes/
git commit -m "feat(clientes): dados reais, com quartos e lavandaria ao nível do cliente"
```

---

### Task 11: Planeamento — dados reais

**Files:**
- Create: `src/modules/planeamento/repository.ts`
- Modify: `src/modules/planeamento/usePlanningModule.ts`, `src/modules/planeamento/PlanningModule.tsx`

**Interfaces:**
- Consumes: `supabase`, `subscribeTable`; tabelas `jobs`, `job_assignments`, `absences`, `people`, `teams`, `units`, `service_locations`.
- Produces: `loadPlanningData(): Promise<PlanningData>`, `loadPlanningPeople(): Promise<PlanPerson[]>`, `loadPlanningTeams(): Promise<PlanTeam[]>`.

Nota estrutural importante: hoje `Job.location` e `Job.unit` são **nomes em texto**. Na base de dados são `location_id` e `unit_id`. O repositório resolve os nomes ao carregar e os ids ao gravar.

- [ ] **Passo 1: Escrever o repositório**

```ts
import { supabase } from '../shared/supabase';
import type { Job, PlanAbsence, PlanningData, PlanPerson, PlanTeam } from './types';

export async function loadPlanningData(): Promise<PlanningData> {
  const [jobs, assignments, absences, units, locations] = await Promise.all([
    supabase.from('jobs').select('*').order('scheduled_on').order('starts_at'),
    supabase.from('job_assignments').select('*'),
    supabase.from('absences').select('*'),
    supabase.from('units').select('id,name,type,capacity'),
    supabase.from('service_locations').select('id,name'),
  ]);
  const nomeAloj = new Map((locations.data ?? []).map((l: any) => [l.id, l.name]));
  const quarto = new Map((units.data ?? []).map((u: any) => [u.id, u]));
  return {
    jobs: (jobs.data ?? []).map((j: any): Job => ({
      id: j.id, date: j.scheduled_on, start: j.starts_at.slice(0, 5), end: j.ends_at.slice(0, 5),
      location: nomeAloj.get(j.location_id) ?? '', unit: quarto.get(j.unit_id)?.name ?? '',
      typology: `${quarto.get(j.unit_id)?.type ?? ''} · ${quarto.get(j.unit_id)?.capacity ?? 0} hóspedes`,
      teamId: j.team_id ?? '', status: j.status, source: j.source, platform: j.platform,
      stayDate: j.stay_date, checkin: j.checkin_same_day,
      stayTimes: { checkout: j.checkout_time.slice(0, 5), checkin: j.checkin_time.slice(0, 5) },
      assignees: (assignments.data ?? [])
        .filter((a: any) => a.job_id === j.id)
        .map((a: any) => ({ personId: a.person_id, hours: Number(a.hours) })),
    })),
    absences: (absences.data ?? []).map((a: any): PlanAbsence => ({
      id: a.id, personId: a.person_id, type: a.type, start: a.starts_on, end: a.ends_on,
      allDay: a.all_day, from: a.starts_at ?? undefined, to: a.ends_at ?? undefined,
    })),
  };
}

export async function loadPlanningPeople(): Promise<PlanPerson[]> {
  const { data } = await supabase.from('people')
    .select('id,name,team_id').eq('archived', false).eq('role', 'collab').order('name');
  return (data ?? []).map((p: any) => ({
    id: p.id, name: p.name,
    initials: p.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(),
    teamId: p.team_id ?? '', capacity: 8,
  }));
}

export async function loadPlanningTeams(): Promise<PlanTeam[]> {
  const { data } = await supabase.from('teams').select('id,name').order('name');
  return (data ?? []).map((t: any) => ({ id: t.id, name: t.name }));
}

export async function saveJobRow(job: Job): Promise<void> {
  const { error } = await supabase.from('jobs').update({
    scheduled_on: job.date, starts_at: job.start, ends_at: job.end,
    team_id: job.teamId || null, status: job.status,
  }).eq('id', job.id);
  if (error) throw error;
  await supabase.from('job_assignments').delete().eq('job_id', job.id);
  if (job.assignees.length) {
    await supabase.from('job_assignments').insert(job.assignees.map((a) => ({
      job_id: job.id, person_id: a.personId, hours: a.hours,
    })));
  }
}

export async function deleteJobRow(id: string): Promise<void> {
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) throw error;
}

/** Publica tudo o que está por publicar e devolve quantas limpezas passaram a planeadas. */
export async function publishJobs(): Promise<number> {
  const { data, error } = await supabase.from('jobs')
    .update({ status: 'planned' }).eq('status', 'unpublished').select('id');
  if (error) throw error;
  return (data ?? []).length;
}

export async function confirmJobRead(id: string): Promise<void> {
  const { error } = await supabase.from('jobs').update({ status: 'confirmed' }).eq('id', id);
  if (error) throw error;
}
```

- [ ] **Passo 2: Hidratar**

Em `usePlanningModule.ts` (linha ≈36):

```ts
import { useSupabaseData } from '../shared/supabase';
import { loadPlanningData } from './repository';

const [data, dispatch] = useReducer(reducer, initialData ?? { jobs: [], absences: [] });

const aplicar = useCallback((d: PlanningData) => dispatch({ type: 'reset', data: d }), []);
const carregado = useSupabaseData(
  loadPlanningData, ['jobs', 'job_assignments', 'absences'], aplicar);
```

Em `PlanningModule.tsx`, as props `people` e `teams` vêm hoje de `DEMO_PEOPLE`/`DEMO_TEAMS`. Passam a vir da base de dados, mantendo as props como override:

```ts
const [pessoas, setPessoas] = useState<PlanPerson[]>([]);
const [equipas, setEquipas] = useState<PlanTeam[]>([]);

useSupabaseData(loadPlanningPeople, ['people'], useCallback(setPessoas, []));
useSupabaseData(loadPlanningTeams, ['teams'], useCallback(setEquipas, []));

const peopleFinal = peopleProp ?? pessoas;
const teamsFinal = teamsProp ?? equipas;
```

- [ ] **Passo 3: Ligar as ações**

| Ação | Chamada |
|---|---|
| `saveAssignment` | `saveJobRow(draft)` |
| `unassign` | `saveJobRow({ ...draft, assignees: [], status: 'unpublished' })` |
| `moveJob` | `saveJobRow(próximo)` — manter a guarda `isMovable` |
| `resizeJob` | `saveJobRow(próximo)` |
| `removeJob` | `deleteJobRow(id)` — manter a guarda `source === 'manual'` |
| `publish` | `publishJobs()` |
| `confirmRead` | `confirmJobRead(id)` |
| `reset` | `loadPlanningData()` |

- [ ] **Passo 4: Verificar**

`npm run build`, abrir `preview/module-4-planeamento-react.html`. Como o seed não cria limpezas, inserir três via `execute_sql` para o dia de hoje (uma com `checkin_same_day = true`, para confirmar a bolinha de prioridade alta). Esperado: aparecem no cronograma; arrastar uma para outra colaboradora e confirmar com `select person_id from job_assignments where job_id='…'` que mudou; abrir a mesma página noutro separador e ver a mudança aparecer sem refrescar.

- [ ] **Passo 5: Commit**

```bash
git add src/modules/planeamento/
git commit -m "feat(planeamento): limpezas reais com atribuições e tempo real"
```

---

### Task 12: Execução — dados reais

**Files:**
- Create: `src/modules/execucao/repository.ts`, `supabase/migrations/0005_storage.sql`
- Modify: `src/modules/execucao/useExecutionModule.ts`, `src/modules/execucao/ExecutionModule.tsx`

**Interfaces:**
- Consumes: `supabase`, `subscribeTable`, `useAuth`; tabelas `jobs`, `job_checklist_items`, `job_laundry_counts`, `job_photos`, `job_issues`, `job_events`, `absences`; bucket `job-photos` (Task 13 cria as políticas; o bucket em si é criado aqui).
- Produces: `loadExecutionData(personId: string, date: string): Promise<ExecData>` e as escritas abaixo.

Esta task remove a simulação de offline: `online`, `syncing`, `lastSync` e todas as marcas `synced` deixam de existir, conforme o spec.

- [ ] **Passo 1: Criar o bucket de fotografias**

`supabase/migrations/0005_storage.sql`:
```sql
insert into storage.buckets (id, name, public) values ('job-photos', 'job-photos', false);

create policy "fotos: gestora vê tudo" on storage.objects for select to authenticated
  using (bucket_id = 'job-photos' and is_manager());

create policy "fotos: colaboradora envia as suas" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-photos'
    and assigned_to_me(((storage.foldername(name))[1])::uuid));

create policy "fotos: colaboradora vê as suas" on storage.objects for select to authenticated
  using (bucket_id = 'job-photos'
    and assigned_to_me(((storage.foldername(name))[1])::uuid));
```
O caminho de cada ficheiro é `<job_id>/<uuid>.jpg` — é daí que a política tira o `job_id`.

Aplicar com `apply_migration`, nome `0005_storage`.

- [ ] **Passo 2: Escrever o repositório**

```ts
import { supabase } from '../shared/supabase';
import type { ExecData, ExecJob, IssueInput, Quantities } from './types';

export async function loadExecutionData(personId: string, date: string): Promise<ExecData> {
  const { data: atribuidas } = await supabase.from('job_assignments')
    .select('job_id').eq('person_id', personId);
  const ids = (atribuidas ?? []).map((a: any) => a.job_id);
  if (!ids.length) return { items: [], messages: [] };

  const [jobs, checklist, laundry, photos, issues, events, locations, units, absences] =
    await Promise.all([
      supabase.from('jobs').select('*').in('id', ids).eq('scheduled_on', date),
      supabase.from('job_checklist_items').select('*').in('job_id', ids).order('position'),
      supabase.from('job_laundry_counts').select('*').in('job_id', ids),
      supabase.from('job_photos').select('*').in('job_id', ids),
      supabase.from('job_issues').select('*').in('job_id', ids).order('created_at'),
      supabase.from('job_events').select('*').in('job_id', ids).order('created_at'),
      supabase.from('service_locations').select('id,name,address'),
      supabase.from('units').select('id,name'),
      supabase.from('absences').select('*').eq('person_id', personId).eq('starts_on', date),
    ]);

  const aloj = new Map((locations.data ?? []).map((l: any) => [l.id, l]));
  const quarto = new Map((units.data ?? []).map((u: any) => [u.id, u.name]));
  const doJob = (lista: any[], id: string) => lista.filter((r) => r.job_id === id);
  const quantidades = (id: string, campo: 'planned' | 'counted' | 'confirmed'): Quantities =>
    Object.fromEntries(doJob(laundry.data ?? [], id).map((r) => [r.item, r[campo] ?? 0]));

  const items = (jobs.data ?? []).map((j: any): ExecJob => ({
    id: j.id, kind: 'job', date: j.scheduled_on,
    start: j.starts_at.slice(0, 5), end: j.ends_at.slice(0, 5),
    place: aloj.get(j.location_id)?.name ?? '', unit: quarto.get(j.unit_id) ?? '',
    address: [aloj.get(j.location_id)?.address ?? '', ''],
    managerNote: j.manager_note, team: '', status: j.status,
    suppliesOwnProducts: j.supplies_own_products,
    laundryCollectionActive: j.laundry_collection_active,
    plannedQty: quantidades(j.id, 'planned'),
    qty: quantidades(j.id, 'counted'),
    qtySaved: quantidades(j.id, 'confirmed'),
    prep: doJob(checklist.data ?? [], j.id).filter((c) => c.kind === 'prep').map((c) => c.done),
    tasks: doJob(checklist.data ?? [], j.id).filter((c) => c.kind === 'task').map((c) => c.done),
    photos: doJob(photos.data ?? [], j.id).map((p: any) => ({ id: p.id, kind: 0 })),
    notes: j.notes,
    issues: doJob(issues.data ?? [], j.id).map((i: any) => ({
      id: i.id, type: i.type, delayMin: i.delay_min, description: i.description,
      withPhoto: false, time: i.created_at.slice(11, 16), synced: true,
    })),
    events: doJob(events.data ?? [], j.id).map((e: any) => ({
      id: e.id, time: e.created_at.slice(11, 16), text: e.text, tone: e.tone, synced: true,
    })),
    startedAt: null, startedAtMs: j.started_at ? Date.parse(j.started_at) : null,
    finishedAt: null, durationSec: j.duration_sec,
  }));

  const ausencias = (absences.data ?? []).map((a: any) => ({
    id: a.id, kind: 'absence' as const, date: a.starts_on,
    start: (a.starts_at ?? '00:00').slice(0, 5), end: (a.ends_at ?? '23:59').slice(0, 5),
    reason: a.note || a.type,
  }));

  return { items: [...items, ...ausencias], messages: [] };
}

export async function addEvent(jobId: string, text: string, tone = 'neutral'): Promise<void> {
  const { error } = await supabase.from('job_events').insert({ job_id: jobId, text, tone });
  if (error) throw error;
}

export async function setJobStatus(
  jobId: string, status: ExecJob['status'], extra: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.from('jobs').update({ status, ...extra }).eq('id', jobId);
  if (error) throw error;
}

export async function setChecklistItem(
  jobId: string, kind: 'prep' | 'task', position: number, done: boolean,
): Promise<void> {
  const { error } = await supabase.from('job_checklist_items')
    .update({ done }).eq('job_id', jobId).eq('kind', kind).eq('position', position);
  if (error) throw error;
}

export async function setLaundryCount(jobId: string, item: string, counted: number): Promise<void> {
  const { error } = await supabase.from('job_laundry_counts')
    .update({ counted }).eq('job_id', jobId).eq('item', item);
  if (error) throw error;
}

export async function confirmLaundry(jobId: string, qty: Quantities): Promise<void> {
  for (const [item, valor] of Object.entries(qty)) {
    const { error } = await supabase.from('job_laundry_counts')
      .update({ confirmed: valor }).eq('job_id', jobId).eq('item', item);
    if (error) throw error;
  }
}

export async function uploadPhoto(jobId: string, ficheiro: Blob): Promise<string> {
  const caminho = `${jobId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('job-photos').upload(caminho, ficheiro);
  if (error) throw error;
  const { data, error: erroLinha } = await supabase.from('job_photos')
    .insert({ job_id: jobId, storage_path: caminho }).select('id').single();
  if (erroLinha) throw erroLinha;
  return data.id;
}

export async function removePhoto(photoId: string): Promise<void> {
  const { data } = await supabase.from('job_photos').select('storage_path').eq('id', photoId).single();
  if (data) await supabase.storage.from('job-photos').remove([data.storage_path]);
  const { error } = await supabase.from('job_photos').delete().eq('id', photoId);
  if (error) throw error;
}

export async function setJobNotes(jobId: string, notes: string): Promise<void> {
  const { error } = await supabase.from('jobs').update({ notes }).eq('id', jobId);
  if (error) throw error;
}

/** A fotografia é opcional: uma anomalia só com descrição é válida — decisão validada em Execução. */
export async function addIssueRow(jobId: string, input: IssueInput): Promise<string> {
  const { data, error } = await supabase.from('job_issues').insert({
    job_id: jobId, type: input.type, delay_min: input.delayMin,
    description: input.description.trim(),
  }).select('id').single();
  if (error) throw error;
  return data.id;
}
```

- [ ] **Passo 3: Adaptar o hook**

Em `useExecutionModule.ts` (linha ≈32), trocar `useState(() => initialData ?? createDemoExecution(...))` por estado vazio e hidratar. A pessoa vem de `useAuth()`, deixando de vir da prop `person` (manter a prop como override para pré-visualização):

```ts
import { useSupabaseData } from '../shared/supabase';
import { useAuth } from '../shared/auth';
import { loadExecutionData } from './repository';

const { person: sessao } = useAuth();

const [data, setData] = useState<ExecData>(initialData ?? { items: [], messages: [] });

// `ExecPerson` (a prop `person`) só tem nome/iniciais/equipa, não tem id — serve para
// apresentação. Quem identifica a colaboradora para efeitos de dados é a sessão.
const carregar = useCallback(() => loadExecutionData(sessao.id, today), [sessao.id, today]);
const carregado = useSupabaseData(
  carregar,
  ['jobs', 'job_checklist_items', 'job_laundry_counts', 'job_issues', 'job_events'],
  useCallback(setData, []),
);
```

Remover: `online`, `syncing`, `lastSync`, `setOnline`, e os campos `synced`. A ação `notify` perde o parâmetro `offline`.

| Ação | Chamada |
|---|---|
| `confirmRead` | `setJobStatus(id, 'confirmed')` + `addEvent(id, 'Leitura confirmada')` |
| `toggleCheck` | `setChecklistItem(id, list, index, value)` |
| `start` | `setJobStatus(id, 'in_progress', { started_at: new Date().toISOString() })` + `addEvent` — manter a guarda de "já há uma limpeza em curso" |
| `changeQty` | `setLaundryCount(id, key, novoValor)` |
| `saveQty` | `confirmLaundry(id, qty)` + `addEvent` com a diferença |
| `addPhoto` | `uploadPhoto(id, ficheiro)` — a UI passa a abrir a câmara/ficheiro em vez de simular |
| `removePhoto` | `removePhoto(photoId)` |
| `setNotes` | `setJobNotes(id, notes)` |
| `addIssue` | `addIssueRow(id, input)` + `addEvent(..., 'bad')` |
| `send` | `setJobStatus(id, 'done', { finished_at, duration_sec })` + `addEvent` — manter a guarda `notesRequired` |
| `markMessagesRead` | passa a ser tratada pelo módulo Mensagens (Task 14) |
| `reset` | recarrega do Supabase |

- [ ] **Passo 4: Verificar**

`npm run build`. Entrar como colaboradora (usar o PIN criado na Task 8) e abrir `preview/module-5-execucao-react.html`. Esperado: só aparecem as limpezas atribuídas a essa pessoa; iniciar uma e confirmar `select status, started_at from jobs where id='…'`; marcar tarefas e confirmar em `job_checklist_items`; registar uma anomalia **sem fotografia** e confirmar que grava.

- [ ] **Passo 5: Commit**

```bash
git add src/modules/execucao/ supabase/migrations/0005_storage.sql
git commit -m "feat(execucao): limpezas reais, fotografias no Storage, sem simulação de offline"
```

---

### Task 13: Aprovações — dados reais

**Files:**
- Create: `src/modules/aprovacoes/repository.ts`
- Modify: `src/modules/aprovacoes/useApprovalsModule.ts`, `src/modules/aprovacoes/ApprovalsModule.tsx`

**Interfaces:**
- Consumes: `supabase`, `subscribeTable`, `useAuth`; tabelas `jobs`, `job_approval_audit`, `job_issues`, `job_checklist_items`, `job_laundry_counts`, `job_photos`, `company_settings`.
- Produces: `loadWorkRecords(): Promise<WorkRecord[]>`, `approveJob`, `requestCorrectionRow`, `reopenJob`, `loadDurationTolerance`, `saveDurationTolerance`.

- [ ] **Passo 1: Escrever o repositório**

```ts
import { supabase } from '../shared/supabase';
import type { ReopenState, WorkRecord } from './types';

export async function loadWorkRecords(): Promise<WorkRecord[]> {
  const { data: jobs } = await supabase.from('jobs').select('*').eq('status', 'done')
    .order('finished_at', { ascending: false });
  const ids = (jobs ?? []).map((j: any) => j.id);
  if (!ids.length) return [];
  const [audit, issues, checklist, laundry, photos, locations, units, clients, assignments, people] =
    await Promise.all([
      supabase.from('job_approval_audit').select('*').in('job_id', ids).order('created_at'),
      supabase.from('job_issues').select('*').in('job_id', ids),
      supabase.from('job_checklist_items').select('*').in('job_id', ids).eq('kind', 'task').order('position'),
      supabase.from('job_laundry_counts').select('*').in('job_id', ids),
      supabase.from('job_photos').select('job_id').in('job_id', ids),
      supabase.from('service_locations').select('id,name,address,client_id'),
      supabase.from('units').select('id,name'),
      supabase.from('clients').select('id,name'),
      supabase.from('job_assignments').select('job_id,person_id').in('job_id', ids),
      supabase.from('people').select('id,name'),
    ]);

  const aloj = new Map((locations.data ?? []).map((l: any) => [l.id, l]));
  const quarto = new Map((units.data ?? []).map((u: any) => [u.id, u.name]));
  const cliente = new Map((clients.data ?? []).map((c: any) => [c.id, c.name]));
  const nome = new Map((people.data ?? []).map((p: any) => [p.id, p.name]));
  const doJob = (lista: any[], id: string) => lista.filter((r) => r.job_id === id);

  return (jobs ?? []).map((j: any): WorkRecord => {
    const local = aloj.get(j.location_id);
    const responsavel = doJob(assignments.data ?? [], j.id)[0]?.person_id ?? '';
    return {
      id: j.id, place: local?.name ?? '', unit: quarto.get(j.unit_id) ?? '',
      city: (local?.address ?? '').split(',').pop()?.trim() ?? '',
      thumb: 0, client: cliente.get(local?.client_id) ?? '',
      personId: responsavel, team: '',
      planned: `${j.scheduled_on} ${j.starts_at.slice(0, 5)}`,
      plannedMin: 0,
      started: (j.started_at ?? '').slice(0, 16).replace('T', ' '),
      finished: (j.finished_at ?? '').slice(0, 16).replace('T', ' '),
      photos: doJob(photos.data ?? [], j.id).length,
      tasks: doJob(checklist.data ?? [], j.id).map((c: any) => c.done),
      qty: doJob(laundry.data ?? [], j.id)
        .filter((q: any) => (q.confirmed ?? q.counted) < q.planned)
        .map((q: any) => ({ label: q.item, diff: (q.confirmed ?? q.counted) - q.planned })),
      notes: j.notes,
      issues: doJob(issues.data ?? [], j.id).map((i: any) => ({
        type: i.type, at: i.created_at.slice(0, 16).replace('T', ' '), text: i.description,
      })),
      late: false,
      review: j.review, auto: j.auto_approved, reopenTo: j.reopen_to,
      audit: doJob(audit.data ?? [], j.id).map((a: any) => ({
        at: a.created_at.slice(0, 16).replace('T', ' '),
        who: nome.get(a.person_id) ?? '', role: 'Gestora',
        action: a.action, note: a.note, tone: a.tone, icon: 'checkCircle',
      })),
    };
  });
}

async function registarAuditoria(
  jobId: string, action: string, note: string, tone: string, personId: string,
): Promise<void> {
  const { error } = await supabase.from('job_approval_audit')
    .insert({ job_id: jobId, person_id: personId, action, note, tone });
  if (error) throw error;
}

export async function approveJob(jobId: string, personId: string): Promise<void> {
  const { error } = await supabase.from('jobs').update({ review: 'approved' }).eq('id', jobId);
  if (error) throw error;
  await registarAuditoria(jobId, 'Conclusão aprovada', '', 'ok', personId);
}

export async function requestCorrectionRow(
  jobId: string, mensagem: string, personId: string,
): Promise<void> {
  const { error } = await supabase.from('jobs').update({ review: 'correction' }).eq('id', jobId);
  if (error) throw error;
  await registarAuditoria(jobId, 'Correção pedida', mensagem.trim(), 'warn', personId);
}

export async function reopenJob(
  jobId: string, para: ReopenState, motivo: string, personId: string,
): Promise<void> {
  const estado = para === 'Planeado' ? 'planned' : 'in_progress';
  const { error } = await supabase.from('jobs')
    .update({ review: 'reopened', reopen_to: para, status: estado }).eq('id', jobId);
  if (error) throw error;
  await registarAuditoria(jobId, `Reaberta para ${para}`, motivo.trim(), 'vio', personId);
}

export async function loadDurationTolerance(): Promise<number> {
  const { data } = await supabase.from('company_settings')
    .select('duration_tolerance_min').single();
  return data?.duration_tolerance_min ?? 30;
}

export async function saveDurationTolerance(minutos: number): Promise<void> {
  const { error } = await supabase.from('company_settings')
    .update({ duration_tolerance_min: minutos }).eq('id', true);
  if (error) throw error;
}
```

- [ ] **Passo 2: Adaptar o hook e o módulo**

Em `useApprovalsModule.ts` (linha ≈33), substituir `createRecords()` por hidratação. O `viewer` deixa de vir de `VIEWERS[viewerProp]` e passa a vir de `useAuth()`, mantendo a prop como override:

```ts
import { useSupabaseData } from '../shared/supabase';
import { useAuth } from '../shared/auth';
import { loadWorkRecords } from './repository';

const { person } = useAuth();
const viewer: Viewer = viewerProp
  ? (typeof viewerProp === 'string' ? VIEWERS[viewerProp] : viewerProp)
  : { name: person.name, initials: person.initials, role: 'Gestora', canReview: person.canReview };

const aplicar = useCallback(
  (records: WorkRecord[]) => dispatch({ type: 'load', records }), []);
const carregado = useSupabaseData(
  loadWorkRecords, ['jobs', 'job_approval_audit'], aplicar);
```
Acrescentar ao reducer o caso `'load'`, que substitui `records` e mantém `acted` intacto (as revisões feitas nesta sessão continuam visíveis em "Pendentes", como já acontece hoje).

Em `ApprovalsModule.tsx`, a tolerância de duração está hoje em `localStorage['appos.aprovacoes.tolerancia.v1']` (linhas ≈47-55). Substituir por `loadDurationTolerance()` no arranque e `saveDurationTolerance(min)` no setter. **Apagar a leitura e a escrita do `localStorage`.**

| Ação | Chamada |
|---|---|
| `approve` | `approveJob(id, person.id)` |
| `requestCorrection` | `requestCorrectionRow(id, message, person.id)` |
| `reopen` | `reopenJob(id, to, reason, person.id)` |
| `reset` | `loadWorkRecords()` |

- [ ] **Passo 3: Verificar**

`npm run build`, entrar como gestora, abrir `preview/module-6-aprovacoes-react.html`. Concluir uma limpeza no módulo de Execução (noutro separador, como colaboradora) e confirmar que aparece aqui para revisão **sem refrescar**. Aprovar e confirmar `select review from jobs where id='…'` → `approved`, e que `job_approval_audit` ganhou uma linha. Mudar a tolerância para 45 e confirmar `select duration_tolerance_min from company_settings` → `45`.

- [ ] **Passo 4: Commit**

```bash
git add src/modules/aprovacoes/
git commit -m "feat(aprovacoes): revisão real com auditoria persistida e tolerância em company_settings"
```

---

### Task 14: Mensagens — dados reais

**Files:**
- Create: `src/modules/mensagens/repository.ts`
- Modify: `src/modules/mensagens/store.tsx`

**Interfaces:**
- Consumes: `supabase`, `subscribeTable`, `useAuth`; tabelas `conversations`, `conversation_participants`, `messages`, `message_reads`, `notices`.
- Produces: `loadMessagesData(personId: string): Promise<MessagesData>` e as escritas abaixo.

- [ ] **Passo 1: Escrever o repositório**

```ts
import { supabase } from '../shared/supabase';
import type { Conversation, Message, MessagesData, NewMessageDraft } from './types';

export async function loadMessagesData(personId: string): Promise<MessagesData> {
  const [conversas, participantes, mensagens, leituras, avisos] = await Promise.all([
    supabase.from('conversations').select('*').order('created_at'),
    supabase.from('conversation_participants').select('*'),
    supabase.from('messages').select('*').order('created_at'),
    supabase.from('message_reads').select('*').eq('person_id', personId),
    supabase.from('notices').select('*').eq('dismissed', false).order('created_at'),
  ]);
  const lidas = new Set((leituras.data ?? []).map((r: any) => r.message_id));
  return {
    version: 1,
    seq: { c: 0, m: 0, n: 0 },
    conversations: (conversas.data ?? []).map((c: any): Conversation => ({
      id: c.id, kind: c.kind, title: c.title, clientId: c.client_id ?? '',
      participants: (participantes.data ?? [])
        .filter((p: any) => p.conversation_id === c.id).map((p: any) => p.person_id),
      jobId: c.job_id ?? '', priority: c.priority, resolved: c.resolved,
      messages: (mensagens.data ?? [])
        .filter((m: any) => m.conversation_id === c.id)
        .map((m: any): Message => ({
          id: m.id, from: m.from_person_id, at: m.created_at.slice(0, 16),
          text: m.text, images: [], files: [], state: m.state,
          scheduledFor: m.scheduled_for ?? undefined,
          unread: m.from_person_id !== personId && !lidas.has(m.id),
        })),
    })),
    notices: (avisos.data ?? []).map((n: any) => ({
      id: n.id, type: n.type, priority: n.priority, audience: n.audience, icon: n.icon,
      title: n.title, text: n.text, at: n.created_at.slice(0, 16),
      read: n.read, dismissed: n.dismissed, action: n.action,
      target: n.target_type ? `${n.target_type}:${n.target_id}` : '',
      requires: '',
    })),
  };
}

export async function sendMessage(
  conversationId: string, fromPersonId: string, text: string, scheduledFor?: string,
): Promise<string> {
  const { data, error } = await supabase.from('messages').insert({
    conversation_id: conversationId, from_person_id: fromPersonId, text,
    state: scheduledFor ? 'scheduled' : 'sent', scheduled_for: scheduledFor ?? null,
  }).select('id').single();
  if (error) throw error;
  await supabase.from('conversations').update({ resolved: false }).eq('id', conversationId);
  return data.id;
}

export async function markConversationRead(conversationId: string, personId: string): Promise<void> {
  const { data } = await supabase.from('messages')
    .select('id').eq('conversation_id', conversationId).neq('from_person_id', personId);
  if (!data?.length) return;
  const { error } = await supabase.from('message_reads')
    .upsert(data.map((m: any) => ({ message_id: m.id, person_id: personId })));
  if (error) throw error;
}

export async function setConversationResolved(id: string, resolved: boolean): Promise<void> {
  const { error } = await supabase.from('conversations').update({ resolved }).eq('id', id);
  if (error) throw error;
}

export async function linkConversationJob(id: string, jobId: string): Promise<void> {
  const { error } = await supabase.from('conversations')
    .update({ job_id: jobId || null }).eq('id', id);
  if (error) throw error;
}

export async function createConversationRow(
  draft: NewMessageDraft, fromPersonId: string,
): Promise<string[]> {
  const grupo = draft.kind === 'equipa' && draft.to.length > 1;
  const destinos = grupo ? [draft.to] : draft.to.map((t) => [t]);
  const ids: string[] = [];
  for (const participantes of destinos) {
    const { data, error } = await supabase.from('conversations').insert({
      kind: grupo ? 'interna' : draft.kind,
      title: '', job_id: draft.jobId || draft.planId || null,
    }).select('id').single();
    if (error) throw error;
    await supabase.from('conversation_participants').insert(
      [...participantes, fromPersonId].map((person_id) => ({ conversation_id: data.id, person_id })),
    );
    await sendMessage(data.id, fromPersonId, draft.text,
      draft.when === 'later' ? `${draft.date}T${draft.time}` : undefined);
    ids.push(data.id);
  }
  return ids;
}

export async function setNoticeRead(id: string, read = true): Promise<void> {
  const { error } = await supabase.from('notices').update({ read }).eq('id', id);
  if (error) throw error;
}

export async function dismissNoticeRow(id: string): Promise<void> {
  const { error } = await supabase.from('notices')
    .update({ dismissed: true, read: true }).eq('id', id);
  if (error) throw error;
}
```

- [ ] **Passo 2: Adaptar o store**

Em `store.tsx`: apagar `MESSAGES_STORAGE_KEY`, a função `load()` e o `useEffect` que grava no `localStorage` (linhas ≈33 e ≈37-40). O `viewer` passa a ser o id da sessão em vez de `viewerId(role)`:

```ts
import { useSupabaseData } from '../shared/supabase';
import { useAuth } from '../shared/auth';
import { loadMessagesData } from './repository';

const { person } = useAuth();
const viewer = person.id;

const [data, setData] = useState<MessagesData>(
  initialData ?? { version: 1, seq: { c: 0, m: 0, n: 0 }, conversations: [], notices: [] },
);

const carregar = useCallback(() => loadMessagesData(person.id), [person.id]);
const carregado = useSupabaseData(
  carregar,
  ['messages', 'conversations', 'conversation_participants', 'notices'],
  useCallback(setData, []),
);
```
A prop `storageKey` deixa de existir — apagar da interface `MessagesProviderProps` e de quem a passa.

| Ação | Chamada |
|---|---|
| `send` | `sendMessage(conversationId, person.id, payload.text)` |
| `markRead` | `markConversationRead(conversationId, person.id)` |
| `markUnread` | apagar a linha de `message_reads` da última mensagem recebida |
| `setResolved` | `setConversationResolved(id, resolved)` |
| `linkJob` | `linkConversationJob(id, jobId)` |
| `createMessage` | `createConversationRow(draft, person.id)` |
| `openWithManager` | procura conversa 1:1 com a gestora; se não existir, cria-a com `createConversationRow` |
| `readNotice` / `readAllNotices` | `setNoticeRead(id)` |
| `dismissNotice` | `dismissNoticeRow(id)` |
| `addNotice` | inserção direta em `notices` |
| `reset` | `loadMessagesData(person.id)` |

**Anexos:** a tabela `message_attachments` fica criada (Task 3) e é lida no carregamento, mas **o envio de anexos não é implementado nesta task** — `images` e `files` continuam a chegar vazios. A evidência fotográfica que a operação precisa é a das limpezas (`job_photos`, Task 12); anexar ficheiros a mensagens é conveniência, não requisito validado. Fica registado aqui para não parecer esquecimento.

- [ ] **Passo 3: Verificar**

`npm run build`. Abrir dois separadores: gestora em `module-10-mensagens-react.html`, colaboradora em `module-5-execucao-react.html`. Enviar uma mensagem de um lado e confirmar que **aparece no outro sem refrescar**. Confirmar em `select count(*) from messages` e que `localStorage` já não tem a chave `appos.mensagens.v1`.

- [ ] **Passo 4: Commit**

```bash
git add src/modules/mensagens/
git commit -m "feat(mensagens): conversas reais entre dispositivos, sem localStorage"
```

---

### Task 15: Rendimentos — números reais

**Files:**
- Create: `src/modules/rendimentos/repository.ts`, `supabase/migrations/0006_revenue_view.sql`
- Modify: `src/modules/rendimentos/useRevenueModule.ts`, `src/modules/rendimentos/RevenueModule.tsx`, `src/modules/rendimentos/rules.ts`

**Interfaces:**
- Consumes: `supabase`, `useSupabaseData` (Task 5), `useAuth` (Task 6); tabelas `clients`, `client_billing`, `billable_units`, `invoices`, `invoice_payments`, `team_payments`, `people`, `jobs`, `job_assignments`, `company_settings`.
- Produces: `loadRevenueData(): Promise<RevenueData>`, `registerPaymentRow`, `markTeamPaidRow`, `setSupplyRow`, `loadSettings`, `saveHealthLimits`, `saveTravelIncluded`.

Mudança de fundo: as horas e os trabalhos deixam de vir das tabelas de sazonalidade simuladas (`SEASON`/`EXEC_RATIO` em `rules.ts`) e passam a ser **contados a partir das limpezas concluídas**.

- [ ] **Passo 1: Criar a vista de agregação**

Via `apply_migration`, nome `0006_revenue_view`:
```sql
create view job_month_stats as
select
  to_char(j.scheduled_on, 'YYYY-MM') as month,
  l.client_id,
  j.unit_id,
  count(*) as jobs,
  sum(extract(epoch from (j.ends_at - j.starts_at)) / 3600.0) as hours
from jobs j
join service_locations l on l.id = j.location_id
where j.status = 'done'
group by 1, 2, 3;

grant select on job_month_stats to authenticated;
```
A vista herda o RLS das tabelas de origem, por isso uma colaboradora não a consegue usar para contornar as políticas.

- [ ] **Passo 2: Escrever o repositório**

```ts
import { supabase } from '../shared/supabase';
import type { HealthLimits, Invoice, MonthKey, PaymentRecord, RevenueData,
  SupplyModel } from './types';

export async function loadRevenueData(): Promise<RevenueData> {
  const [clients, billing, units, stats, invoices, payments, team, teamPaid] = await Promise.all([
    supabase.from('clients').select('id,name').order('name'),
    supabase.from('client_billing').select('*'),
    supabase.from('billable_units').select('*'),
    supabase.from('job_month_stats').select('*'),
    supabase.from('invoices').select('*').order('due_on'),
    supabase.from('invoice_payments').select('*'),
    supabase.from('people').select('id,name,role,per_job_rate').eq('archived', false),
    supabase.from('team_payments').select('*'),
  ]);
  const cond = new Map((billing.data ?? []).map((b: any) => [b.client_id, b]));
  return {
    clients: (clients.data ?? []).map((c: any) => {
      const b = cond.get(c.id);
      return {
        id: c.id, name: c.name, cycle: b?.cycle ?? 'custom', terms: b?.terms ?? 0,
        supply: b?.supply ?? 'client', supplement: Number(b?.supplement ?? 0),
        contact: { name: '', email: '', phone: '' },
        units: (units.data ?? []).filter((u: any) => u.client_id === c.id).map((u: any) => ({
          name: u.name, rate: Number(u.rate),
          hours: (stats.data ?? [])
            .filter((s: any) => s.unit_id === u.unit_id)
            .reduce((total: number, s: any) => total + Number(s.hours), 0),
        })),
      };
    }),
    team: (team.data ?? []).filter((p: any) => p.role === 'collab').map((p: any) => ({
      id: p.id, name: p.name, role: 'Equipa de limpeza',
      perJobRate: Number(p.per_job_rate ?? 0), share: 0, travel: 0, tone: 0,
    })),
    invoices: (invoices.data ?? []).map((i: any): Invoice => ({
      id: i.id, clientId: i.client_id, month: i.month, from: i.period_from, to: i.period_to,
      issued: i.issued_on, due: i.due_on, amount: Number(i.amount),
      payments: (payments.data ?? []).filter((p: any) => p.invoice_id === i.id)
        .map((p: any): PaymentRecord => ({
          date: p.paid_on, amount: Number(p.amount), method: p.method, note: p.note, by: '',
        })),
    })),
    teamPaid: (teamPaid.data ?? []).reduce((acc: any, r: any) => {
      acc[r.month] = { ...(acc[r.month] ?? {}), [r.person_id]: r.paid_on };
      return acc;
    }, {}),
  };
}

export async function registerPaymentRow(
  invoiceId: string, pagamento: Omit<PaymentRecord, 'by'>, personId: string,
): Promise<void> {
  const { error } = await supabase.from('invoice_payments').insert({
    invoice_id: invoiceId, paid_on: pagamento.date, amount: pagamento.amount,
    method: pagamento.method, note: pagamento.note, registered_by: personId,
  });
  if (error) throw error;
}

export async function markTeamPaidRow(
  month: MonthKey, personId: string, hoje: string,
): Promise<void> {
  const { error } = await supabase.from('team_payments')
    .upsert({ person_id: personId, month, paid_on: hoje });
  if (error) throw error;
}

export async function setSupplyRow(
  clientId: string, supply: SupplyModel, supplement: number,
): Promise<void> {
  const { error } = await supabase.from('client_billing')
    .update({ supply, supplement }).eq('client_id', clientId);
  if (error) throw error;
}

export async function loadSettings(): Promise<{ healthLimits: HealthLimits; travelIncluded: boolean }> {
  const { data } = await supabase.from('company_settings')
    .select('health_limits,travel_included').single();
  return {
    healthLimits: data?.health_limits as HealthLimits,
    travelIncluded: data?.travel_included ?? true,
  };
}

export async function saveHealthLimits(limits: HealthLimits): Promise<void> {
  const { error } = await supabase.from('company_settings')
    .update({ health_limits: limits }).eq('id', true);
  if (error) throw error;
}

export async function saveTravelIncluded(incluir: boolean): Promise<void> {
  const { error } = await supabase.from('company_settings')
    .update({ travel_included: incluir }).eq('id', true);
  if (error) throw error;
}
```

- [ ] **Passo 3: Tirar a sazonalidade simulada do `rules.ts`**

Em `rules.ts`, `unitMonth()` aplica hoje multiplicadores das constantes `SEASON` e `EXEC_RATIO` para projetar horas e trabalhos. Como `BillableUnit.hours` passa a trazer as horas reais do mês (vindas de `job_month_stats`), **remover as duas constantes e as multiplicações**: `hours` é o valor recebido e `jobs` passa a ser contado da mesma origem.

**Preservar `totalBilledJobs()` tal como está** — é a correção de alocação de custos feita na Fase 1 e continua correta: o denominador do custo por trabalho tem de ser a soma real de trabalhos de todos os clientes, não os trabalhos da equipa.

- [ ] **Passo 4: Adaptar o hook e o módulo**

Em `useRevenueModule.ts` (linha ≈32), trocar `createData` por hidratação:

```ts
import { useSupabaseData } from '../shared/supabase';
import { useAuth } from '../shared/auth';
import { loadRevenueData } from './repository';

const { person } = useAuth();   // usado em registerPayment, como quem registou

const [data, dispatch] = useReducer(reducer, {
  clients: [], team: [], invoices: [], teamPaid: {},
});

const aplicar = useCallback((d: RevenueData) => dispatch({ type: 'load', data: d }), []);
const carregado = useSupabaseData(
  loadRevenueData, ['invoices', 'invoice_payments', 'team_payments', 'jobs'], aplicar);
```
Acrescentar ao reducer o caso `'load'`, que substitui a árvore de dados inteira.

Em `RevenueModule.tsx`, apagar as leituras/escritas de `localStorage` das linhas ≈55, ≈61, ≈67 e ≈73 (`appos.rendimentos.limiares.v1` e `appos.rendimentos.deslocacoes.v1`) e usar `loadSettings()`, `saveHealthLimits()` e `saveTravelIncluded()`.

| Ação | Chamada |
|---|---|
| `registerPayment` | `registerPaymentRow(invoiceId, payment, person.id)` |
| `markTeamPaid` | `markTeamPaidRow(month, personId, today)` |
| `setSupply` | `setSupplyRow(clientId, supply, supplement)` |
| `reset` | `loadRevenueData()` |

- [ ] **Passo 5: Verificar**

`npm run build`, entrar como gestora, abrir `preview/module-7-rendimentos-react.html`. Esperado: os 4 clientes com "Personalizado · quinzenal" e prazo à vista; alterar os limiares de saúde financeira e confirmar `select health_limits from company_settings`; alternar "+ deslocações" e confirmar `travel_included`. Sair e entrar como colaboradora: a aba Rendimentos **não deve mostrar dados** (o RLS nega, e a Task 8 já o verifica automaticamente).

- [ ] **Passo 6: Commit**

```bash
git add src/modules/rendimentos/ supabase/migrations/0006_revenue_view.sql
git commit -m "feat(rendimentos): números das limpezas reais, definições em company_settings"
```

---

### Task 16: Publicação online

**Files:**
- Create: `netlify.toml`
- Modify: `.gitignore` (nada a mudar se `.env` já lá estiver — confirmar)

**Interfaces:**
- Consumes: o build completo (Tasks 5–15).
- Produces: a app publicada num URL acessível, ligada ao projeto Supabase.

- [ ] **Passo 1: Escrever a configuração**

`netlify.toml`:
```toml
[build]
  command = "npm run build:ci"
  publish = "preview"

[build.environment]
  NODE_VERSION = "20"
```

Como o `script` de build local usa `--env-file=.env` (que não existe no CI), acrescentar um segundo script ao `package.json`:
```json
    "build:ci": "node build.mjs",
```
No CI as variáveis vêm do ambiente do Netlify, não de um ficheiro.

- [ ] **Passo 2: Publicar**

Confirmar com o utilizador antes de avançar — publicar expõe a app num URL público.

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app"
npx netlify-cli deploy --build --prod
```
Definir no painel do Netlify (Site settings → Environment variables) as duas variáveis: `SUPABASE_URL` e `SUPABASE_ANON_KEY`. **Nunca** definir lá `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Passo 3: Autorizar o URL no Supabase**

No painel do Supabase, Authentication → URL Configuration, acrescentar o URL do site a *Site URL* e a *Redirect URLs*.

- [ ] **Passo 4: Verificar de ponta a ponta**

Abrir o URL público num browser onde nunca houve sessão. Esperado: ecrã de entrada; entrar como gestora e percorrer os 7 módulos; abrir o mesmo URL num telemóvel, entrar como colaboradora com o PIN, e confirmar que uma mensagem enviada no telemóvel aparece no computador sem refrescar.

Correr uma última vez a verificação de segurança:
```bash
npm run rls-check
```
Esperado: `Todas as fronteiras seguras.`

- [ ] **Passo 5: Commit**

```bash
git add netlify.toml package.json
git commit -m "feat: publicação da app no Netlify ligada ao Supabase"
```

---

## Verificação final integrada

Depois da Task 16, percorrer os 7 módulos contra `/Users/paulorsalgado/Documents/2. Sandbox/alclean/modulos/*.md`, como foi feito na Fase 1, mas agora com **duas sessões abertas ao mesmo tempo** (gestora no computador, colaboradora no telemóvel):

- **Equipas** — só "Gestora"/"Colaborador(a)"; valores em €/limpeza; dar acesso a uma colaboradora gera conta real e ela consegue entrar com o PIN.
- **Clientes** — "Quarto" e não "Unidade"; lavandaria ao nível do cliente, a propagar-se a todos os alojamentos dele.
- **Planeamento** — bolinha de prioridade alta quando há entrada no mesmo dia; arrastar uma limpeza muda-a no telemóvel da colaboradora sem refrescar.
- **Execução** — preparação sem qualquer código ou chave; material e lavandaria condicionais ao fornecimento do cliente; "Inventário da roupa a lavar" sempre visível; anomalia só com texto é aceite.
- **Aprovações** — "Inventário de Roupa"; tolerância de duração editável e persistente; só a gestora aprova.
- **Mensagens** — colaboradora a falar diretamente com um cliente; mensagens a chegar entre dispositivos.
- **Rendimentos** — ciclo quinzenal, prazo à vista, custo por limpeza com deslocações opcionais, limiares editáveis; **invisível para a colaboradora**.

Esperado: os 7 pontos confirmados, sem erros na consola em nenhum módulo, e `npm run rls-check` a passar.
