# De onde vêm as limpezas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar à ALClean os dois caminhos que faltam para uma limpeza entrar na aplicação — importada do calendário iCal das plataformas, de hora a hora, e criada à mão pela gestora.

**Arquitetura:** Uma Edge Function (`sync-calendars`) descarrega e interpreta cada endereço iCal e chama funções Postgres que decidem o que criar, alterar ou assinalar; `pg_cron` + `pg_net` chamam-na de hora a hora; dois botões novos nos ecrãs ("Sincronizar agora" em cada quarto, "Nova limpeza" no Planeamento) ligam a gestora às mesmas funções. Não existe tabela de reservas: cada limpeza carrega a sua origem em `jobs.calendar_id` + `jobs.ical_uid`, com unicidade parcial sobre o par.

**Tech Stack:** Supabase (Postgres 15 + RLS + Edge Functions em Deno), React 18 com esbuild (sem `tsc`), Tailwind, `@supabase/supabase-js` v2, Node ≥ 20 para os scripts de verificação.

**Spec:** `/Users/paulorsalgado/Documents/2. Sandbox/Planning_OS - V2/docs/superpowers/specs/2026-09-21-alclean-limpezas-do-calendario-design.md`

**Raiz do código:** `/Users/paulorsalgado/Documents/2. Sandbox/alclean/app`, ramo `fase2-backend`. Todos os caminhos deste plano são relativos a essa raiz.

## Global Constraints

Valem para **todas** as tarefas, sem exceção e sem serem repetidas em cada passo.

1. **Português de Portugal em tudo** — nomes de variáveis e de funções, comentários, texto de interface, mensagens de erro, mensagens de commit. Nunca vocabulário do Brasil ("faturamento", "equipe", "usuário", "tela", "arquivo", "time" por equipa, "deletar", "cadastro"). Diz-se limpeza, alojamento, quarto, colaboradora, gestora, ficheiro, ecrã, apagar, registo.
2. **O projeto não corre `tsc` e não tem `tsconfig.json`.** Nada neste código é verificado por tipos. Um erro de tipo aparece como app desgovernada em produção, não como build vermelho. Lê o que escreves duas vezes; `npm run build` só apanha erros de sintaxe e de resolução de módulos.
3. **Migrações nunca são aplicadas por quem implementa.** Escreve-se o ficheiro `supabase/migrations/00NN_*.sql` e **o utilizador aplica-o à mão** no editor de SQL do Supabase. O mesmo vale para ligar extensões (`pg_cron`, `pg_net`), para publicar Edge Functions e para definir segredos. Nenhuma tarefa deste plano executa `supabase db push`, `supabase functions deploy`, `apply_migration` ou equivalente.
4. **Base de dados viva.** Tem 2 contas reais, 12 limpezas marcadas `[DEMO]` (registadas em `demo_jobs`) e dados criados pelo utilizador — o cliente **"Mater50"** com 4 quartos e endereços iCal reais do Airbnb. **Nunca tocar no que não se criou.** Nunca correr `npm run seed`. Nunca escrever em `company_settings` a partir de testes. Nunca imprimir a chave `service_role` (nem um prefixo dela) em consola, ficheiro ou relatório.
5. **Dados de teste marcados e descartáveis.** Tudo o que um script de verificação cria leva o marcador fixo `RLS-CHECK-TESTE` (em `manager_note`, `name`, `title` ou `month`, consoante a tabela) e é apagado num `finally` que corre mesmo quando uma verificação falha a meio. Encontrar restos de uma corrida anterior faz-se pelo marcador, nunca por um id real.
6. **Cada fronteira de segurança nova tem uma verificação falsificável em `scripts/rls-check.mjs`** — dados reais no alvo (a tabela tem de ter linhas antes de se afirmar que "ninguém as vê"), recusa distinguida de erro de consulta (`42501` para RLS, `P0001` para `raise exception`, `42883`/`42501` para `execute` revogado), e um controlo positivo que prova que o caminho legítimo continua a passar.
7. **`npm run build` e `npm run rls-check` verdes no fim de cada tarefa que lhes mexa.** O relatório de cada tarefa cita a última linha de cada um (`Build ALClean concluído: 8 módulos.` e `Todas as fronteiras seguras.`). Nunca se declara verde sem ter corrido o comando.
8. **Funções Postgres: `security invoker` por omissão**, com `set search_path = public, pg_temp`. `security definer` só onde este plano o diz por escrito (`job_from_ical` e as suas auxiliares), e sempre com `revoke execute ... from public, anon, authenticated`.
9. **Duas escritas em tabelas diferentes são uma só transação** — dentro de uma função Postgres chamada por `supabase.rpc(...)`, nunca duas chamadas seguidas do browser (licoes-modulo.md, ponto 2).
10. **Subscrever uma tabela não a torna observável.** Antes de confiar em tempo real, correr mesmo `select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1;` e, se faltar alguma, acrescentá-la **numa migração** (licoes-modulo.md, ponto 3).
11. **`useSupabaseData(carregar, tabelas, aplicar)`**: `carregar` importada ao nível do módulo ou `useCallback` com dependências estáveis; `aplicar` sempre `useCallback(..., [])`. Uma arrow inline põe a app em ciclo infinito e consome a quota (licoes-modulo.md, ponto 4).
12. **Toda a ação que falha repõe o ecrã**: mostra o erro **e** recarrega do servidor. Em todas as ações, não só na primeira (licoes-modulo.md, ponto 5).
13. **Nunca ler estado por uma `ref` logo depois de despachar.** A função de recarregamento devolve o que carregou e usa-se esse valor (licoes-modulo.md, ponto 6).
14. **Números escritos por pessoas nunca passam por `Number()` nem `parseFloat()`** — em português escreve-se `9,50`. Usar o `parseRate` que já existe em cada módulo. A duração de uma limpeza é um inteiro de minutos escrito num `<input type="number">`, e mesmo aí valida-se com a expressão explícita deste plano, nunca com `Number(texto)` sobre texto livre (licoes-modulo.md, ponto 1).
15. **Nomes e assinaturas das ações existentes não mudam.** O reducer de cada módulo encerra regras validadas com a empresa; este plano só acrescenta ações novas. Qualquer mudança de assinatura tem de ser declarada em voz alta no relatório da tarefa (licoes-modulo.md, ponto 9).
16. **Commits frequentes**, um por passo de "Commit", com mensagem em português.

---

## Estrutura de ficheiros

### Ficheiros criados

| Ficheiro | Responsabilidade |
|---|---|
| `supabase/migrations/0030_origem_das_limpezas.sql` | Esquema: `jobs.calendar_id`/`jobs.ical_uid` + índice parcial único; `cleaning_min` nas três camadas da herança; `unit_defaults(uuid)`, a única origem de "as horas e a duração deste quarto". |
| `supabase/migrations/0031_criar_limpeza.sql` | `create_job(...)` — `security invoker`, o caminho da criação manual. |
| `supabase/migrations/0032_importacao_ical.sql` | `job_from_ical(...)`, `job_ical_desaparecidos(...)` e `aviso_ical(...)` — `security definer`, só `service_role`. A tabela de decisões da spec vive aqui. |
| `supabase/migrations/0033_calendario_nao_esmagado.sql` | `commit_location_detail` deixa de reescrever `status`/`last_sync`/`imported` dos calendários a partir do rascunho do browser. |
| `supabase/migrations/0034_agendador.sql` | `cron.schedule` de hora a hora sobre `net.http_post`, com o URL e o segredo lidos do Vault (nunca do ficheiro). |
| `supabase/functions/sync-calendars/ical.ts` | Interpretador de iCal puro: texto entra, eventos saem. Sem rede, sem Supabase, sem Deno — é isto que o torna testável em Node. |
| `supabase/functions/sync-calendars/enderecos.ts` | O guarda dos endereços: só `https`, nada que aponte para dentro da rede do servidor. Também puro, também testável em Node. |
| `supabase/functions/sync-calendars/index.ts` | A Edge Function: quem chama, descarregar (com os redirecionamentos validados um a um), orquestrar as funções Postgres, carimbar `unit_calendars`. |
| `supabase/functions/sync-calendars/README.md` | Os segredos que a função precisa e como o utilizador a publica. |
| `scripts/ical-check.mjs` | Testes do interpretador contra ficheiros `.ics` verdadeiros. Não toca na base de dados. |
| `scripts/fixtures/ical/*.ics` | Os seis ficheiros da spec: reserva simples, entrada no mesmo dia, bloqueio de anfitrião, evento sem `UID`, ficheiro truncado, calendário vazio. |
| `src/modules/planeamento/components/NewJobDrawer.tsx` | O painel "Nova limpeza": cliente → alojamento → quarto, dia, início, duração, entrada no mesmo dia. |

### Ficheiros modificados

| Ficheiro | Mudança |
|---|---|
| `src/modules/planeamento/repository.ts` | `loadJobTargets()` (a árvore cliente→alojamento→quarto com a herança já resolvida) e `createJobRow()` (chama `create_job`). |
| `src/modules/planeamento/usePlanningModule.ts` | Ação nova `createJob`. Nenhuma ação existente muda de assinatura. |
| `src/modules/planeamento/PlanningModule.tsx` | Botão "Nova limpeza" ao lado de "Publicar alterações" e a montagem do painel. |
| `src/modules/clientes/repository.ts` | `syncCalendarNow(calendarId)` — invoca a Edge Function. |
| `src/modules/clientes/useClientsModule.ts` | Ação nova `syncCalendar`. |
| `src/modules/clientes/components/CalendarEditor.tsx` | Substitui `IMPORT_PENDING_NOTE` pelo botão "Sincronizar agora" e pelo estado verdadeiro do calendário. |
| `scripts/ical-check.mjs` | Tarefa 6 acrescenta-lhe as verificações do guarda de endereços. |
| `scripts/rls-check.mjs` | As fronteiras novas (criar limpeza, chamar as funções da importação, ver o que é por publicar, escrever no estado de um calendário, ler avisos de gestão), cada uma com controlo positivo. |
| `package.json` | Script `ical-check`. |
| `DEPLOY.md` | Secção nova com os três passos manuais do utilizador. |

### Passos manuais do utilizador (onde ficam)

| # | Passo | Onde está escrito |
|---|---|---|
| 1 | Aplicar `0030` no editor de SQL | Tarefa 1, passo 5 |
| 2 | Aplicar `0031` | Tarefa 2, passo 4 |
| 3 | Aplicar `0032` | Tarefa 5, passo 4 |
| 4 | Publicar a Edge Function `sync-calendars` e definir os seus segredos | Tarefa 6, passo 8 |
| 5 | Aplicar `0033` | Tarefa 7, passo 3 |
| 6 | Ligar `pg_cron` e `pg_net`; criar os dois segredos no Vault; aplicar `0034` | Tarefa 8, passos 3 e 4 |

Nenhum deles é feito por quem implementa. Cada tarefa pára, mostra as instruções exatas e espera.

---

## Sequência das tarefas

```
1 esquema ──┬─► 2 create_job ──► 3 "Nova limpeza" (UI)
            │
            └─► 4 interpretador iCal ──► 5 job_from_ical ──► 6 Edge Function ──┬─► 7 botão "Sincronizar agora"
                                                                               └─► 8 agendador ──► 9 fecho
```

---

### Task 1: Esquema da origem das limpezas (migração 0030)

**Files:**
- Create: `supabase/migrations/0030_origem_das_limpezas.sql`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `jobs.calendar_id uuid null` e `jobs.ical_uid text null`, com `unique index jobs_ical_uid_idx on jobs (calendar_id, ical_uid) where ical_uid is not null`.
  - `company_settings.default_cleaning_min integer not null default 120`, `service_locations.cleaning_min integer null`, `units.cleaning_min integer null` — os três com `check (… between 15 and 600)`.
  - `unit_defaults(p_unit uuid) returns table (location_id uuid, team_id uuid, checkout_time time, checkin_time time, cleaning_min integer)` — `stable`, `security invoker`, `grant execute to authenticated, service_role`. Devolve zero linhas se o quarto não existir.

- [ ] **Passo 1: Confirmar o estado vivo antes de escrever seja o que for**

Corre no editor de SQL do Supabase (ou pede ao utilizador que corra) e cola o resultado no relatório da tarefa:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('jobs','units','service_locations','company_settings')
  and column_name in ('calendar_id','ical_uid','cleaning_min','default_cleaning_min')
order by table_name, column_name;

select tablename from pg_publication_tables
where pubname = 'supabase_realtime' order by 1;

select count(*) as limpezas, count(*) filter (where source = 'ical') as do_ical from jobs;
```

Esperado: a primeira consulta devolve **zero linhas** (nenhuma das colunas existe ainda); a segunda inclui `jobs`, `units`, `unit_calendars`, `service_locations`, `notices`, `company_settings`; a terceira mostra as limpezas que lá estão. Se alguma coluna já existir, **pára** e diz no relatório — a migração 0030 foi aplicada por engano e este plano não a reaplica.

- [ ] **Passo 2: Escrever a migração**

Cria `supabase/migrations/0030_origem_das_limpezas.sql`:

```sql
-- De onde vêm as limpezas, parte 1: o esquema.
--
-- Não há tabela de reservas, e é de propósito. Uma tabela de reservas seria um
-- segundo registo da mesma coisa, a precisar de ser mantido em passo com as
-- limpezas, e a levantar a pergunta "qual das duas está certa?" no primeiro dia
-- em que divergirem. Em vez disso, a limpeza carrega a sua própria origem: de
-- que calendário veio e qual o identificador do evento nesse calendário.
--
-- O custo aceite: o nome do hóspede e o número de noites não ficam guardados em
-- lado nenhum. A app é de limpezas, não de reservas.

alter table jobs
  add column calendar_id uuid references unit_calendars(id) on delete set null,
  add column ical_uid text;

comment on column jobs.calendar_id is
  'Calendário iCal de onde esta limpeza nasceu. NULL nas limpezas manuais. ON DELETE SET NULL e não CASCADE: apagar um calendário não pode apagar trabalho já feito.';
comment on column jobs.ical_uid is
  'UID do evento no calendário de origem. Estável entre descarregamentos — é por ele que o sincronizador reconhece a mesma reserva. NULL nas limpezas manuais.';

-- Índice PARCIAL: as limpezas manuais não têm nem calendário nem UID, e sem o
-- `where` todas elas colidiriam no par (null, null)... que em Postgres não
-- colide, mas o índice ficaria a indexar 12 linhas inúteis e a dizer uma regra
-- que não é verdade. O que se garante é uma coisa só: o mesmo evento do mesmo
-- calendário nunca gera duas limpezas.
create unique index jobs_ical_uid_idx on jobs (calendar_id, ical_uid) where ical_uid is not null;

-- ==================================================================
-- Duração de uma limpeza
-- ==================================================================
-- A cadeia de herança é EXATAMENTE a que checkout_time/checkin_time já usam
-- (units nullable a herdar de service_locations, 0001_core.sql:86-87), para não
-- haver duas maneiras diferentes de herdar valores na mesma app:
--   units.cleaning_min  →  service_locations.cleaning_min  →  company_settings.default_cleaning_min
-- O limite 15..600 é o mesmo nos três: menos de um quarto de hora não é uma
-- limpeza, e dez horas é sinal de um engano a escrever.
alter table company_settings
  add column default_cleaning_min integer not null default 120,
  add constraint company_settings_duracao_valida check (default_cleaning_min between 15 and 600);

alter table service_locations
  add column cleaning_min integer,
  add constraint service_locations_duracao_valida check (cleaning_min is null or cleaning_min between 15 and 600);

alter table units
  add column cleaning_min integer,
  add constraint units_duracao_valida check (cleaning_min is null or cleaning_min between 15 and 600);

comment on column company_settings.default_cleaning_min is
  'Duração de uma limpeza, em minutos, quando nem o quarto nem o alojamento dizem outra coisa. Decisão validada com a ALClean: a duração é POR QUARTO.';
comment on column service_locations.cleaning_min is 'Minutos por limpeza neste alojamento. NULL = herda da empresa.';
comment on column units.cleaning_min is 'Minutos por limpeza neste quarto. NULL = herda do alojamento.';

-- ==================================================================
-- unit_defaults: a única origem de "o que este quarto herda"
-- ==================================================================
-- Tanto a criação manual (0031) como a importação (0032) precisam do mesmo:
-- a que alojamento o quarto pertence, que equipa lhe está por defeito, a que
-- horas os hóspedes saem e entram, e quanto tempo demora a limpeza. Escrito
-- uma vez, as duas regras não podem divergir.
--
-- security invoker: corre com o RLS de quem chama. A gestora vê tudo; o
-- sincronizador corre com service_role, que passa por cima do RLS na mesma.
-- Uma colaboradora que a chame não recebe linhas para um quarto que não pode
-- ler — que é exatamente o que se quer.
create or replace function unit_defaults(p_unit uuid)
returns table (location_id uuid, team_id uuid, checkout_time time, checkin_time time, cleaning_min integer)
language sql stable security invoker set search_path = public, pg_temp as $$
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

comment on function unit_defaults(uuid) is
  'O que um quarto herda: alojamento, equipa por defeito, hora de saída, hora de entrada e duração da limpeza. Zero linhas se o quarto não existir (ou não for legível por quem chama).';

revoke execute on function unit_defaults(uuid) from public, anon;
grant execute on function unit_defaults(uuid) to authenticated, service_role;
```

- [ ] **Passo 3: Rever a migração à mão, linha a linha**

Lê o ficheiro inteiro outra vez e confirma, por escrito no relatório:
- `on delete set null` (e não `cascade`) em `jobs.calendar_id`;
- o índice tem `where ical_uid is not null`;
- os três `check` aceitam `null` onde a coluna é nullable (senão o `alter table` rebenta nas linhas existentes de `units` e `service_locations`, que ficam com `cleaning_min = null`);
- `where u.id = p_unit and s.id` — `company_settings.id` é um **booleano** com valor `true` (ver `0029_dados_empresa.sql`), por isso `and s.id` é a condição correta e não um erro de escrita.

- [ ] **Passo 4: Commit**

```bash
git add supabase/migrations/0030_origem_das_limpezas.sql
git commit -m "feat(esquema): origem das limpezas e duração por quarto (migração 0030)"
```

- [ ] **Passo 5: PASSO MANUAL DO UTILIZADOR — aplicar a migração 0030**

Pára aqui. Mostra ao utilizador exatamente este texto:

> **O que tens de fazer agora (eu não faço isto por ti):**
>
> 1. Abre o painel do Supabase → projeto **alclean** → **SQL Editor** → **New query**.
> 2. Abre o ficheiro `supabase/migrations/0030_origem_das_limpezas.sql` e cola **o conteúdo todo** na janela.
> 3. Carrega em **Run**. Deve dizer "Success. No rows returned".
> 4. Se der erro, não corras mais nada: copia a mensagem e diz-me.
>
> Isto não altera nem apaga nenhuma limpeza existente: só acrescenta colunas vazias e uma função nova. As 12 limpezas `[DEMO]` e os dados do Mater50 ficam exatamente como estão.

- [ ] **Passo 6: Verificar que a migração pegou**

Depois de o utilizador confirmar, pede-lhe que corra isto e cole o resultado:

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='jobs' and column_name in ('calendar_id','ical_uid');

select indexname from pg_indexes where tablename='jobs' and indexname='jobs_ical_uid_idx';

select default_cleaning_min from company_settings where id;

-- Controlo positivo: a herança devolve mesmo valores para um quarto real.
select * from unit_defaults((select id from units limit 1));
```

Esperado: duas colunas, o índice, `120`, e uma linha com `checkout_time`, `checkin_time` e `cleaning_min = 120` preenchidos. Se `unit_defaults` devolver zero linhas para um quarto que existe, a função está errada — corrige e volta ao passo 5.

---

### Task 2: A gestora cria uma limpeza no servidor (migração 0031)

**Files:**
- Create: `supabase/migrations/0031_criar_limpeza.sql`
- Modify: `scripts/rls-check.mjs`

**Interfaces:**
- Consumes: `unit_defaults(uuid)` (Tarefa 1).
- Produces: `create_job(p_location uuid, p_unit uuid, p_scheduled_on date, p_starts_at time, p_ends_at time, p_checkin_same_day boolean, p_note text) returns uuid` — `security invoker`, `grant execute to authenticated`. Devolve o `id` da limpeza criada.

- [ ] **Passo 1: Escrever a migração**

Cria `supabase/migrations/0031_criar_limpeza.sql`:

```sql
-- De onde vêm as limpezas, parte 2: a criação manual.
--
-- security invoker, e não definer, de propósito: a autorização é o RLS, e não
-- uma segunda cópia da regra "só a gestora" que amanhã diverge da primeira.
-- Uma colaboradora que chame esta função é recusada pela política
-- `jobs_manager_all` (0004_rls.sql) com 42501 — pelo servidor, não só pelo ecrã.
--
-- Porquê uma função e não um `insert` do browser: são duas coisas que têm de
-- ser verdade ao mesmo tempo — o quarto tem de pertencer ao alojamento, e as
-- horas da estadia têm de vir da herança, não do que o browser mandar. Com um
-- insert direto, um ecrã com um estado velho podia gravar uma limpeza no
-- alojamento errado, e o carimbo das horas ficava à mercê do cliente.

create or replace function create_job(
  p_location uuid,
  p_unit uuid,
  p_scheduled_on date,
  p_starts_at time,
  p_ends_at time,
  p_checkin_same_day boolean,
  p_note text
) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_loc uuid;
  v_checkout time;
  v_checkin time;
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

comment on function create_job(uuid, uuid, date, time, time, boolean, text) is
  'Cria uma limpeza manual, por publicar. security invoker: só a gestora passa no RLS de jobs. As flags do cliente são carimbadas pelo trigger jobs_stamp_client_flags (0013).';

revoke execute on function create_job(uuid, uuid, date, time, time, boolean, text) from public, anon;
grant execute on function create_job(uuid, uuid, date, time, time, boolean, text) to authenticated;
```

- [ ] **Passo 2: Escrever as verificações falsificáveis em `scripts/rls-check.mjs`**

No `scripts/rls-check.mjs`, dentro do bloco `try` principal e **antes** de `await colabA.auth.signOut();`, acrescenta esta secção. `colabA` é a sessão da colaboradora de teste, `gestoraA` a da gestora de teste, `unidadeProprioId`/`localProprioId` o quarto e o alojamento descartáveis já criados por `preparar()`:

```js
  // ------------------------------------------------- 0031: criar uma limpeza
  // Fronteira: só a gestora cria limpezas. A colaboradora é recusada pelo
  // servidor (RLS de jobs, 42501), não só pelo ecrã.
  const hojeLisboa = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date());

  const { data: criadaPelaColab, error: erroColabCria } = await colabA.rpc('create_job', {
    p_location: localProprioId, p_unit: unidadeProprioId, p_scheduled_on: hojeLisboa,
    p_starts_at: '11:00', p_ends_at: '13:00', p_checkin_same_day: false, p_note: MARCADOR,
  });
  verificar('0031: a colaboradora não cria limpezas',
    criadaPelaColab === null && erroColabCria?.code === '42501');

  // Controlo positivo: a gestora cria, e a linha que fica é mesmo a pedida.
  const { data: criadaPelaGestora, error: erroGestoraCria } = await gestoraA.rpc('create_job', {
    p_location: localProprioId, p_unit: unidadeProprioId, p_scheduled_on: hojeLisboa,
    p_starts_at: '11:00', p_ends_at: '13:00', p_checkin_same_day: true, p_note: MARCADOR,
  });
  let linhaCriada = null;
  if (criadaPelaGestora) {
    jobsCriadosNoTeste.push(criadaPelaGestora);
    const { data } = await admin.from('jobs')
      .select('status,source,stay_date,scheduled_on,checkin_same_day,calendar_id,ical_uid,checkout_time,checkin_time')
      .eq('id', criadaPelaGestora).single();
    linhaCriada = data;
  }
  verificar('0031: a gestora cria uma limpeza manual, por publicar e sem origem iCal',
    !erroGestoraCria && linhaCriada?.status === 'unpublished' && linhaCriada?.source === 'manual'
    && linhaCriada?.stay_date === linhaCriada?.scheduled_on && linhaCriada?.checkin_same_day === true
    && linhaCriada?.calendar_id === null && linhaCriada?.ical_uid === null);

  // O quarto tem de pertencer ao alojamento: o par errado é recusado.
  const { error: erroParErrado } = await gestoraA.rpc('create_job', {
    p_location: outroLocalId, p_unit: unidadeProprioId, p_scheduled_on: hojeLisboa,
    p_starts_at: '11:00', p_ends_at: '13:00', p_checkin_same_day: false, p_note: MARCADOR,
  });
  verificar('0031: um quarto que não é do alojamento indicado é recusado',
    erroParErrado?.code === 'P0001');

  // Fim antes do início é recusado com uma frase, não com o texto cru da restrição.
  const { error: erroHorasAoContrario } = await gestoraA.rpc('create_job', {
    p_location: localProprioId, p_unit: unidadeProprioId, p_scheduled_on: hojeLisboa,
    p_starts_at: '13:00', p_ends_at: '11:00', p_checkin_same_day: false, p_note: MARCADOR,
  });
  verificar('0031: uma limpeza que acaba antes de começar é recusada',
    erroHorasAoContrario?.code === 'P0001');
```

Junto das outras declarações de topo do ficheiro (perto de `const jobsAprovacao = [];`), acrescenta:

```js
const jobsCriadosNoTeste = [];  // limpezas criadas PELAS RPC durante o teste; apagadas no finally
```

E dentro de `limpar()` (a função chamada pelo `finally`), antes de apagar o alojamento descartável, acrescenta:

```js
  // As limpezas criadas pelas RPC deste teste levam o MARCADOR em manager_note,
  // mas as criadas por job_from_ical (Task 5) não o levam — por isso também se
  // apagam por id. Nenhum destes ids é de uma limpeza real: todos saíram de uma
  // chamada feita aqui.
  for (const id of jobsCriadosNoTeste) {
    const { error } = await admin.from('jobs').delete().eq('id', id);
    if (error) console.error(`  aviso: não apaguei a limpeza de teste ${id} — ${error.message}`);
  }
  jobsCriadosNoTeste.length = 0;
```

- [ ] **Passo 3: Commit**

```bash
git add supabase/migrations/0031_criar_limpeza.sql scripts/rls-check.mjs
git commit -m "feat(planeamento): create_job e as suas fronteiras (migração 0031)"
```

- [ ] **Passo 4: PASSO MANUAL DO UTILIZADOR — aplicar a migração 0031**

> **O que tens de fazer agora:**
>
> 1. Supabase → **SQL Editor** → **New query**.
> 2. Cola o conteúdo todo de `supabase/migrations/0031_criar_limpeza.sql`.
> 3. **Run**. Deve dizer "Success. No rows returned".
>
> Isto cria uma função nova. Não altera nenhuma limpeza nem nenhuma tabela.

- [ ] **Passo 5: Correr as verificações**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run rls-check
```

Esperado: as quatro linhas novas em `ok`, e a última linha `Todas as fronteiras seguras.`

Se `0031: a colaboradora não cria limpezas` falhar com `erroColabCria === null`, a função ficou `definer` por engano — corrige a migração, volta ao passo 4 e repete.

---

### Task 3: O botão "Nova limpeza" no Planeamento

**Files:**
- Modify: `src/modules/planeamento/repository.ts`
- Modify: `src/modules/planeamento/usePlanningModule.ts`
- Modify: `src/modules/planeamento/PlanningModule.tsx`
- Create: `src/modules/planeamento/components/NewJobDrawer.tsx`

**Interfaces:**
- Consumes: `create_job(...)` (Tarefa 2), `unit_defaults` indiretamente.
- Produces:
  - `export interface JobTarget { unitId: string; unitName: string; locationId: string; locationName: string; clientName: string; checkoutTime: string; checkinTime: string; cleaningMin: number; }`
  - `export async function loadJobTargets(): Promise<JobTarget[]>`
  - `export interface NewJobInput { locationId: string; unitId: string; date: string; start: string; cleaningMin: number; checkinSameDay: boolean; note: string; }`
  - `export async function createJobRow(input: NewJobInput): Promise<string>`
  - Ação nova no hook: `createJob(input: NewJobInput): Promise<boolean>`
  - `export function NewJobDrawer({ targets, onClose, onCreate }: { targets: JobTarget[]; onClose: () => void; onCreate: (input: NewJobInput) => Promise<boolean> })`

- [ ] **Passo 1: Acrescentar `loadJobTargets` e `createJobRow` ao repositório**

No fim de `src/modules/planeamento/repository.ts`, acrescenta:

```ts
/**
 * A árvore cliente → alojamento → quarto para o painel "Nova limpeza", com a
 * herança já resolvida: escolher o quarto preenche a hora de início com a hora
 * de saída dele e a duração com a dele.
 *
 * A herança é feita aqui, em TypeScript, com os mesmos `coalesce` que
 * `unit_defaults` faz no servidor — porque o painel tem de mostrar os valores
 * ANTES de gravar. O servidor continua a ser quem decide: `create_job` carimba
 * `checkout_time`/`checkin_time` a partir de `unit_defaults`, não do que este
 * ecrã mandar. Se os dois divergirem, o que fica gravado é o do servidor.
 */
export interface JobTarget {
  unitId: string;
  unitName: string;
  locationId: string;
  locationName: string;
  clientName: string;
  /** HH:MM — hora de saída dos hóspedes, herdada do alojamento quando o quarto não a tem. */
  checkoutTime: string;
  /** HH:MM — hora de entrada dos hóspedes seguintes. */
  checkinTime: string;
  /** Minutos, herdados quarto → alojamento → empresa. */
  cleaningMin: number;
}

export async function loadJobTargets(): Promise<JobTarget[]> {
  const [units, locations, clients, empresa] = await Promise.all([
    supabase.from('units').select('id,name,location_id,checkout_time,checkin_time,cleaning_min')
      .eq('status', 'active').order('name'),
    supabase.from('service_locations').select('id,name,client_id,checkout_time,checkin_time,cleaning_min')
      .eq('status', 'active'),
    supabase.from('clients').select('id,name'),
    supabase.from('company_settings').select('default_cleaning_min').eq('id', true).maybeSingle(),
  ]);
  if (units.error) throw units.error;
  if (locations.error) throw locations.error;
  if (clients.error) throw clients.error;
  if (empresa.error) throw empresa.error;

  const duracaoEmpresa = empresa.data?.default_cleaning_min ?? 120;
  const alojamento = new Map((locations.data ?? []).map((l: any) => [l.id, l]));
  const cliente = new Map((clients.data ?? []).map((c: any) => [c.id, c.name]));

  return (units.data ?? []).flatMap((u: any): JobTarget[] => {
    const l = alojamento.get(u.location_id);
    if (!l) return [];  // alojamento pausado: o quarto não é um destino válido
    return [{
      unitId: u.id,
      unitName: u.name,
      locationId: l.id,
      locationName: l.name,
      clientName: cliente.get(l.client_id) ?? '',
      checkoutTime: (u.checkout_time ?? l.checkout_time).slice(0, 5),
      checkinTime: (u.checkin_time ?? l.checkin_time).slice(0, 5),
      cleaningMin: u.cleaning_min ?? l.cleaning_min ?? duracaoEmpresa,
    }];
  });
}

/** O que o painel "Nova limpeza" recolhe. A duração é minutos; o fim calcula-se a partir dela. */
export interface NewJobInput {
  locationId: string;
  unitId: string;
  /** AAAA-MM-DD */
  date: string;
  /** HH:MM */
  start: string;
  cleaningMin: number;
  checkinSameDay: boolean;
  note: string;
}

/** Soma minutos a "HH:MM" e trava às 23:59 — uma limpeza não atravessa a meia-noite. */
export function endOfCleaning(start: string, cleaningMin: number): string {
  const [h, m] = start.split(':');
  const inicio = Number(h) * 60 + Number(m);
  const fim = Math.min(inicio + cleaningMin, 23 * 60 + 59);
  return `${String(Math.floor(fim / 60)).padStart(2, '0')}:${String(fim % 60).padStart(2, '0')}`;
}

/**
 * Cria a limpeza manual (função `create_job`, migração 0031). Uma só chamada,
 * uma só transação: a limpeza e o seu carimbo de horas ou entram juntos ou não
 * entram. `security invoker` — uma colaboradora é recusada pelo servidor.
 */
export async function createJobRow(input: NewJobInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_job', {
    p_location: input.locationId,
    p_unit: input.unitId,
    p_scheduled_on: input.date,
    p_starts_at: input.start,
    p_ends_at: endOfCleaning(input.start, input.cleaningMin),
    p_checkin_same_day: input.checkinSameDay,
    p_note: input.note,
  });
  if (error) throw error;
  return data as string;
}
```

- [ ] **Passo 2: Acrescentar a ação `createJob` ao hook**

Em `src/modules/planeamento/usePlanningModule.ts`, altera a linha de importação do repositório para incluir o que é novo:

```ts
import { confirmJobRead, createJobRow, deleteJobRow, loadPlanningData, publishJobs, saveJobRow, type NewJobInput } from './repository';
```

E acrescenta a ação, imediatamente antes de `const reset = useCallback(...)`:

```ts
  /**
   * Cria uma limpeza à mão. Ao contrário das outras ações deste módulo, NÃO há
   * despacho otimista: a limpeza nova não existe no ecrã até o servidor lhe dar
   * um id, e inventar um id local traria de volta exatamente o problema do
   * ponto 6 de licoes-modulo.md (o id temporário do browser a ser gravado por
   * cima do id verdadeiro). Recarrega-se e a limpeza aparece com o id certo.
   * Devolve `true` se foi criada.
   */
  const createJob = useCallback(async (input: NewJobInput): Promise<boolean> => {
    try {
      await createJobRow(input);
    } catch (erro) {
      notify(`Não foi possível criar a limpeza: ${mensagemErro(erro)}`);
      return false;
    }
    if (!(await recarregar())) {
      notify('A limpeza foi criada, mas não consegui atualizar o ecrã. Carrega em atualizar.');
      return true;
    }
    notify('Limpeza criada. Fica por publicar até carregares em "Publicar alterações".');
    return true;
  }, [notify, recarregar]);
```

E acrescenta `createJob` ao objeto `actions` devolvido:

```ts
    actions: { notify, saveAssignment, unassign, moveJob, resizeJob, removeJob, publish, confirmRead, createJob, reset },
```

Nenhuma ação existente muda de assinatura.

- [ ] **Passo 3: Escrever o painel "Nova limpeza"**

Cria `src/modules/planeamento/components/NewJobDrawer.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Button, Drawer, DrawerTitle, Field, inputBase, selectBase, selectStyle, Switch } from '../../shared/ui';
import { hojeLocal } from '../../shared/dates';
import { endOfCleaning, type JobTarget, type NewJobInput } from '../repository';

/**
 * Painel "Nova limpeza": cliente → alojamento → quarto, dia, hora de início,
 * duração e "entrada no mesmo dia".
 *
 * Os valores aparecem preenchidos a partir da cadeia de herança — escolher o
 * quarto preenche a hora de início com a hora de saída dele e a duração com a
 * dele. A gestora altera o que quiser; o que ela alterar é o que fica.
 *
 * O dia por omissão é hoje em Lisboa (`hojeLocal`), nunca `new Date()` do
 * telemóvel: perto da meia-noite os dois não dão o mesmo dia.
 */
export function NewJobDrawer({
  targets, onClose, onCreate,
}: {
  targets: JobTarget[];
  onClose: () => void;
  onCreate: (input: NewJobInput) => Promise<boolean>;
}) {
  const [unitId, setUnitId] = useState('');
  const [date, setDate] = useState(hojeLocal);
  const [start, setStart] = useState('');
  const [duracao, setDuracao] = useState('');
  const [checkinSameDay, setCheckinSameDay] = useState(false);
  const [nota, setNota] = useState('');
  const [aGravar, setAGravar] = useState(false);
  const [erro, setErro] = useState('');

  // Agrupados por cliente e alojamento, para a lista se ler como a app fala.
  const grupos = useMemo(() => {
    const porAlojamento = new Map<string, { etiqueta: string; quartos: JobTarget[] }>();
    for (const t of targets) {
      const etiqueta = t.clientName ? `${t.clientName} · ${t.locationName}` : t.locationName;
      const g = porAlojamento.get(t.locationId) ?? { etiqueta, quartos: [] };
      g.quartos.push(t);
      porAlojamento.set(t.locationId, g);
    }
    return [...porAlojamento.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'pt'));
  }, [targets]);

  const alvo = targets.find((t) => t.unitId === unitId) ?? null;

  /** Escolher o quarto preenche início e duração com o que ele herda. */
  const escolherQuarto = (id: string) => {
    setUnitId(id);
    setErro('');
    const t = targets.find((x) => x.unitId === id);
    if (t) {
      setStart(t.checkoutTime);
      setDuracao(String(t.cleaningMin));
    }
  };

  // Minutos inteiros, entre 15 e 600 — o mesmo intervalo que o `check` das
  // três colunas `cleaning_min` impõe no servidor. Validado por expressão
  // explícita e não por `Number(texto)`: um campo vazio dá `Number('') === 0`,
  // que passaria como número e só rebentava na base de dados.
  const duracaoValida = /^\d{1,3}$/.test(duracao.trim())
    && Number(duracao.trim()) >= 15 && Number(duracao.trim()) <= 600;
  const horaValida = /^([01]\d|2[0-3]):[0-5]\d$/.test(start);
  const diaValido = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const podeGravar = Boolean(alvo) && diaValido && horaValida && duracaoValida && !aGravar;

  const fim = horaValida && duracaoValida ? endOfCleaning(start, Number(duracao.trim())) : '';

  const gravar = async () => {
    if (!alvo || !podeGravar) return;
    setAGravar(true);
    setErro('');
    const ok = await onCreate({
      locationId: alvo.locationId,
      unitId: alvo.unitId,
      date,
      start,
      cleaningMin: Number(duracao.trim()),
      checkinSameDay,
      note: nota.trim(),
    });
    setAGravar(false);
    if (ok) onClose();
    else setErro('A limpeza não foi criada. Vê a mensagem no fundo do ecrã.');
  };

  return (
    <Drawer
      label="Nova limpeza"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="plus" disabled={!podeGravar} loading={aGravar} onClick={gravar}>
            Criar limpeza
          </Button>
        </div>
      }
    >
      <DrawerTitle eyebrow="Planeamento" title="Nova limpeza">
        Criada à mão, por publicar. As colaboradoras só a veem depois de carregares em "Publicar alterações".
      </DrawerTitle>

      <div className="flex flex-col gap-3">
        <Field label="Quarto" htmlFor="nova-quarto">
          <select
            id="nova-quarto"
            value={unitId}
            onChange={(e) => escolherQuarto(e.target.value)}
            className={selectBase}
            style={selectStyle}
          >
            <option value="">Escolhe o quarto…</option>
            {grupos.map((g) => (
              <optgroup key={g.etiqueta} label={g.etiqueta}>
                {g.quartos.map((q) => <option key={q.unitId} value={q.unitId}>{q.unitName}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field label="Dia" htmlFor="nova-dia">
          <input id="nova-dia" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputBase} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Começa às" htmlFor="nova-inicio">
            <input id="nova-inicio" type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputBase} />
          </Field>
          <Field label="Duração (minutos)" htmlFor="nova-duracao">
            <input
              id="nova-duracao"
              type="number"
              min={15}
              max={600}
              step={5}
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
              className={inputBase}
            />
          </Field>
        </div>

        {alvo && (
          <p className="text-slate-600">
            Saída dos hóspedes às {alvo.checkoutTime} · entrada dos seguintes às {alvo.checkinTime}
            {fim && ` · esta limpeza acaba às ${fim}`}
          </p>
        )}

        <Switch
          checked={checkinSameDay}
          onChange={setCheckinSameDay}
          label="Entram hóspedes no mesmo dia"
          description="Prioridade alta: aparece com a bolinha vermelha no cartão e tem de acabar antes da hora de entrada."
        />

        <Field label="Nota para a colaboradora (opcional)" htmlFor="nova-nota">
          <input id="nova-nota" type="text" value={nota} onChange={(e) => setNota(e.target.value)} className={inputBase} />
        </Field>

        {erro && <p className="text-red-700">{erro}</p>}
      </div>
    </Drawer>
  );
}
```

- [ ] **Passo 4: Ligar o botão no `PlanningModule`**

Em `src/modules/planeamento/PlanningModule.tsx`:

1. Acrescenta às importações:

```tsx
import { NewJobDrawer } from './components/NewJobDrawer';
import { loadJobTargets, type JobTarget } from './repository';
```

2. Dentro do componente que já tem o `publish` e o estado dos filtros, acrescenta o estado e o carregamento dos destinos:

```tsx
  const [novaAberta, setNovaAberta] = useState(false);
  const [destinos, setDestinos] = useState<JobTarget[]>([]);

  // Carregado só quando o painel abre: é uma leitura de três tabelas que nada
  // no ecrã principal usa, e não vale a pena pagá-la em cada visita.
  useEffect(() => {
    if (!novaAberta) return;
    let vivo = true;
    void loadJobTargets()
      .then((d) => { if (vivo) setDestinos(d); })
      .catch((e) => { console.error('Falha a carregar os quartos:', e); if (vivo) setDestinos([]); });
    return () => { vivo = false; };
  }, [novaAberta]);
```

(Confirma que `useState` e `useEffect` já estão importados de `react` no topo do ficheiro; se `useEffect` não estiver, acrescenta-o.)

3. Imediatamente **antes** do botão "Publicar alterações" (linha ~158), acrescenta:

```tsx
                <Button icon="plus" onClick={() => setNovaAberta(true)}>Nova limpeza</Button>
```

4. No fim do JSX devolvido, ao lado de onde já são montados os outros painéis e o `ToastMessage`, acrescenta:

```tsx
      {novaAberta && (
        <NewJobDrawer
          targets={destinos}
          onClose={() => setNovaAberta(false)}
          onCreate={actions.createJob}
        />
      )}
```

(Se neste componente as ações vierem por um nome diferente de `actions`, usa o que lá está — a ação chama-se sempre `createJob`.)

- [ ] **Passo 5: Compilar**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run build
```

Esperado: `Build ALClean concluído: 8 módulos.` Se falhar por `Field` ou `Switch` terem uma assinatura diferente, abre `src/modules/shared/ui/ui.tsx` e usa a que lá está — não inventes props.

- [ ] **Passo 6: Confirmar à mão no browser**

Abre `preview/module-4-planeamento-react.js` pela página correspondente em `preview/`, entra com a conta da gestora e:
1. Carrega em **Nova limpeza**.
2. Escolhe um quarto do cliente **Mater50** → confirma que "Começa às" e "Duração" se preenchem sozinhos.
3. Cria a limpeza com o dia de hoje.
4. Confirma que aparece no Planeamento como **Por publicar**, e que o botão de apagar funciona (é `source = 'manual'`).
5. **Apaga a limpeza que criaste** — foste tu que a criaste, por isso podes; não toques em mais nenhuma.

Escreve no relatório o que viste. Se não houver browser disponível, di-lo por escrito em vez de dizer que verificaste.

- [ ] **Passo 7: Commit**

```bash
git add src/modules/planeamento
git commit -m "feat(planeamento): painel Nova limpeza ligado a create_job"
```

---

### Task 4: O interpretador de iCal e os seus testes

**Files:**
- Create: `supabase/functions/sync-calendars/ical.ts`
- Create: `scripts/ical-check.mjs`
- Create: `scripts/fixtures/ical/reserva-simples.ics`, `entrada-mesmo-dia.ics`, `bloqueio-anfitriao.ics`, `sem-uid.ics`, `truncado.ics`, `vazio.ics`
- Modify: `package.json`

**Interfaces:**
- Consumes: nada. Este ficheiro não importa nada — nem Deno, nem Supabase, nem rede. É essa a razão de ele poder ser testado em Node.
- Produces:
  - `export class ErroIcal extends Error {}`
  - `export interface EventoIcal { uid: string; inicio: string; fim: string; resumo: string; bloqueio: boolean; }` (`inicio`/`fim` em `AAAA-MM-DD`; `fim` é exclusivo, isto é, o dia da saída)
  - `export function lerIcal(texto: string): EventoIcal[]`

- [ ] **Passo 1: Escrever os ficheiros de exemplo**

Cria `scripts/fixtures/ical/reserva-simples.ics`:

```
BEGIN:VCALENDAR
PRODID:-//Airbnb Inc//Hosting Calendar 1.0.0//EN
CALSCALE:GREGORIAN
VERSION:2.0
BEGIN:VEVENT
DTSTAMP:20260921T083000Z
DTSTART;VALUE=DATE:20261002
DTEND;VALUE=DATE:20261006
UID:1a2b3c4d5e@airbnb.com
SUMMARY:Reserved
DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/de
 tails/HMABCD1234
END:VEVENT
END:VCALENDAR
```

Cria `scripts/fixtures/ical/entrada-mesmo-dia.ics`:

```
BEGIN:VCALENDAR
PRODID:-//Airbnb Inc//Hosting Calendar 1.0.0//EN
CALSCALE:GREGORIAN
VERSION:2.0
BEGIN:VEVENT
DTSTAMP:20260921T083000Z
DTSTART;VALUE=DATE:20261002
DTEND;VALUE=DATE:20261006
UID:saida@airbnb.com
SUMMARY:Reserved
END:VEVENT
BEGIN:VEVENT
DTSTAMP:20260921T083000Z
DTSTART;VALUE=DATE:20261006
DTEND;VALUE=DATE:20261009
UID:entrada@airbnb.com
SUMMARY:Reserved
END:VEVENT
END:VCALENDAR
```

Cria `scripts/fixtures/ical/bloqueio-anfitriao.ics`:

```
BEGIN:VCALENDAR
PRODID:-//Airbnb Inc//Hosting Calendar 1.0.0//EN
CALSCALE:GREGORIAN
VERSION:2.0
BEGIN:VEVENT
DTSTAMP:20260921T083000Z
DTSTART;VALUE=DATE:20261010
DTEND;VALUE=DATE:20261012
UID:bloqueio@airbnb.com
SUMMARY:Airbnb (Not available)
END:VEVENT
BEGIN:VEVENT
DTSTAMP:20260921T083000Z
DTSTART;VALUE=DATE:20261015
DTEND;VALUE=DATE:20261017
UID:bloqueio2@booking.com
SUMMARY:CLOSED - Not available
END:VEVENT
BEGIN:VEVENT
DTSTAMP:20260921T083000Z
DTSTART:20261020T150000Z
DTEND:20261023T110000Z
UID:reserva-com-horas@booking.com
SUMMARY:CLOSED - Booking
END:VEVENT
END:VCALENDAR
```

Cria `scripts/fixtures/ical/sem-uid.ics`:

```
BEGIN:VCALENDAR
PRODID:-//Plataforma Desconhecida//EN
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261101
DTEND;VALUE=DATE:20261104
SUMMARY:Reserved
END:VEVENT
END:VCALENDAR
```

Cria `scripts/fixtures/ical/truncado.ics`:

```
BEGIN:VCALENDAR
PRODID:-//Airbnb Inc//Hosting Calendar 1.0.0//EN
VERSION:2.0
BEGIN:VEVENT
DTSTAMP:20260921T083000Z
DTSTART;VALUE=DATE:20261002
DTEND;VALUE
```

Cria `scripts/fixtures/ical/vazio.ics`:

```
BEGIN:VCALENDAR
PRODID:-//Airbnb Inc//Hosting Calendar 1.0.0//EN
CALSCALE:GREGORIAN
VERSION:2.0
END:VCALENDAR
```

- [ ] **Passo 2: Escrever o interpretador**

Cria `supabase/functions/sync-calendars/ical.ts`:

```ts
/**
 * Interpretador de iCal (RFC 5545), reduzido ao que um calendário de
 * alojamento traz. Não importa nada — nem Deno, nem Supabase, nem rede — e é
 * isso que permite testá-lo em Node com `npm run ical-check` sem publicar
 * nada nem tocar na base de dados.
 *
 * O que entra: o texto de um ficheiro .ics.
 * O que sai: os eventos, já com os dias em AAAA-MM-DD e já classificados em
 * reserva ou bloqueio do anfitrião.
 */

/** O ficheiro não é um calendário legível. Quem chama tem de marcar o calendário como `error`. */
export class ErroIcal extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroIcal';
  }
}

export interface EventoIcal {
  /**
   * Identificador estável do evento. Vem do `UID` quando existe; quando não
   * existe, é derivado das próprias datas (ver `uidDerivado`). Nunca vazio.
   */
  uid: string;
  /** Dia de entrada do hóspede (DTSTART), AAAA-MM-DD. */
  inicio: string;
  /** Dia de saída do hóspede (DTEND — o fim é exclusivo, a última noite é a anterior), AAAA-MM-DD. */
  fim: string;
  resumo: string;
  /** true = dia bloqueado pelo anfitrião; não gera limpeza. */
  bloqueio: boolean;
}

/**
 * Desdobra as linhas: no iCal uma linha longa é partida e as continuações
 * começam por espaço ou tabulação. Sem isto, um `SUMMARY` longo partido a meio
 * dava uma propriedade truncada e uma linha órfã que não se percebia.
 */
function desdobrarLinhas(texto: string): string[] {
  const cruas = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const linhas: string[] = [];
  for (const crua of cruas) {
    if ((crua.startsWith(' ') || crua.startsWith('\t')) && linhas.length > 0) {
      linhas[linhas.length - 1] += crua.slice(1);
    } else {
      linhas.push(crua);
    }
  }
  return linhas;
}

/**
 * "DTSTART;VALUE=DATE:20261002" → ["DTSTART", "20261002"].
 * O nome da propriedade pode trazer parâmetros depois de `;`, e o valor pode
 * conter `:` (um URL, por exemplo), por isso só o PRIMEIRO `:` separa.
 */
function partirPropriedade(linha: string): [string, string] | null {
  const doisPontos = linha.indexOf(':');
  if (doisPontos < 1) return null;
  const nome = linha.slice(0, doisPontos).split(';')[0].trim().toUpperCase();
  return [nome, linha.slice(doisPontos + 1).trim()];
}

/**
 * "20261002" ou "20261002T110000Z" → "2026-10-02". Só interessa o dia: a hora
 * a que a plataforma diz que a reserva acaba não é a hora a que o alojamento
 * deixa os hóspedes sair — essa vem de `service_locations.checkout_time`.
 * Devolve null quando o valor não tem a forma de uma data.
 */
function dataDeIcal(valor: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(valor.trim());
  if (!m) return null;
  const [, ano, mes, dia] = m;
  const n = Number(mes);
  const d = Number(dia);
  if (n < 1 || n > 12 || d < 1 || d > 31) return null;
  return `${ano}-${mes}-${dia}`;
}

/**
 * Lista de exclusão explícita. Um calendário do Airbnb traz reservas E os dias
 * que o anfitrião bloqueou; os bloqueios não são hóspedes e não geram limpeza.
 *
 * Qualquer evento que NÃO seja reconhecido como bloqueio conta como reserva:
 * falhar a criar uma limpeza é pior do que criar uma a mais, que a gestora
 * apaga. Por isso a lista é de exclusão, e não de inclusão.
 *
 * Nota sobre o Booking.com: o resumo dele é "CLOSED - <alguma coisa>" tanto
 * para reservas como para bloqueios; é o "Not available" que distingue, e é
 * por isso que se procura a expressão e não o prefixo.
 */
const EXPRESSOES_DE_BLOQUEIO = [
  /not\s*available/i,
  /unavailable/i,
  /\bblocked\b/i,
  /\bblock\b/i,
  /indispon[ií]vel/i,
  /bloquead/i,
];

export function ehBloqueio(resumo: string): boolean {
  return EXPRESSOES_DE_BLOQUEIO.some((e) => e.test(resumo));
}

/**
 * Um evento sem `UID` acontece em calendários de plataformas menos cuidadosas.
 * Ignorá-lo seria perder a limpeza; inventar um identificador aleatório criava
 * uma limpeza nova a cada sincronização, de hora a hora, para sempre. Por isso
 * deriva-se um identificador das próprias datas: é estável enquanto a reserva
 * não mudar, e se ela mudar de datas trata-se como uma reserva diferente — o
 * pior que acontece é a gestora ver uma limpeza a mais, que apaga.
 */
function uidDerivado(inicio: string, fim: string): string {
  return `sem-uid:${inicio}:${fim}`;
}

export function lerIcal(texto: string): EventoIcal[] {
  if (typeof texto !== 'string' || !texto.trim()) {
    throw new ErroIcal('O calendário veio vazio.');
  }
  const linhas = desdobrarLinhas(texto);
  const temInicio = linhas.some((l) => l.trim().toUpperCase() === 'BEGIN:VCALENDAR');
  const temFim = linhas.some((l) => l.trim().toUpperCase() === 'END:VCALENDAR');
  if (!temInicio) {
    throw new ErroIcal('A resposta não é um calendário iCal (falta BEGIN:VCALENDAR).');
  }
  if (!temFim) {
    // Um ficheiro truncado tem de ser um erro, nunca "um calendário com menos
    // eventos": tratá-lo como calendário curto apagaria as limpezas por
    // publicar dos eventos que ficaram de fora.
    throw new ErroIcal('O calendário chegou incompleto (falta END:VCALENDAR).');
  }

  const eventos: EventoIcal[] = [];
  let dentro = false;
  let uid = '';
  let inicio: string | null = null;
  let fim: string | null = null;
  let resumo = '';

  for (const linha of linhas) {
    const limpa = linha.trim();
    if (limpa.toUpperCase() === 'BEGIN:VEVENT') {
      dentro = true;
      uid = '';
      inicio = null;
      fim = null;
      resumo = '';
      continue;
    }
    if (limpa.toUpperCase() === 'END:VEVENT') {
      if (dentro && inicio && fim) {
        eventos.push({
          uid: uid || uidDerivado(inicio, fim),
          inicio,
          fim,
          resumo,
          bloqueio: ehBloqueio(resumo),
        });
      }
      dentro = false;
      continue;
    }
    if (!dentro) continue;

    const p = partirPropriedade(limpa);
    if (!p) continue;
    const [nome, valor] = p;
    if (nome === 'UID') uid = valor;
    else if (nome === 'DTSTART') inicio = dataDeIcal(valor);
    else if (nome === 'DTEND') fim = dataDeIcal(valor);
    else if (nome === 'SUMMARY') resumo = valor;
  }

  return eventos;
}
```

- [ ] **Passo 3: Escrever os testes**

Cria `scripts/ical-check.mjs`:

```js
// Testes do interpretador de iCal contra ficheiros verdadeiros.
//
// Não toca na base de dados, não precisa de `.env`, não faz rede. Compila o
// `ical.ts` com o esbuild para um ficheiro temporário — o mesmo caminho que o
// `rls-check.mjs` já usa para correr código TypeScript da app em Node, porque
// este projeto não tem `tsc` nem executa TypeScript diretamente.

import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const falhas = [];
const verificar = (nome, condicao) => {
  if (condicao) console.log(`  ok   ${nome}`);
  else { console.error(`  FALHA ${nome}`); falhas.push(nome); }
};

const exemplo = (nome) => readFileSync(join('scripts', 'fixtures', 'ical', nome), 'utf8');

let pasta = null;
try {
  pasta = mkdtempSync(join(process.cwd(), 'node_modules', '.cache-ical-'));
  const saida = join(pasta, 'ical.mjs');
  await build({
    entryPoints: ['supabase/functions/sync-calendars/ical.ts'],
    bundle: true, platform: 'node', format: 'esm', outfile: saida,
    loader: { '.ts': 'ts' }, logLevel: 'silent',
  });
  const { lerIcal, ehBloqueio, ErroIcal } = await import(pathToFileURL(saida).href);

  // ---------------------------------------------------- reserva simples
  const simples = lerIcal(exemplo('reserva-simples.ics'));
  verificar('reserva simples: um evento',
    simples.length === 1);
  verificar('reserva simples: DTEND é o dia da saída',
    simples[0]?.inicio === '2026-10-02' && simples[0]?.fim === '2026-10-06');
  verificar('reserva simples: o UID vem do ficheiro',
    simples[0]?.uid === '1a2b3c4d5e@airbnb.com');
  verificar('reserva simples: não é bloqueio',
    simples[0]?.bloqueio === false);

  // Linha desdobrada: o DESCRIPTION partido a meio não deve inventar eventos
  // nem sujar o resumo.
  verificar('reserva simples: o resumo não apanha a continuação da linha seguinte',
    simples[0]?.resumo === 'Reserved');

  // ---------------------------------------------------- entrada no mesmo dia
  const duas = lerIcal(exemplo('entrada-mesmo-dia.ics'));
  verificar('entrada no mesmo dia: dois eventos', duas.length === 2);
  verificar('entrada no mesmo dia: o DTEND de uma é o DTSTART da outra',
    duas[0]?.fim === '2026-10-06' && duas[1]?.inicio === '2026-10-06');

  // ---------------------------------------------------- bloqueios
  const bloqueios = lerIcal(exemplo('bloqueio-anfitriao.ics'));
  verificar('bloqueio: os três eventos são lidos', bloqueios.length === 3);
  verificar('bloqueio: "Not available" do Airbnb é bloqueio',
    bloqueios[0]?.bloqueio === true);
  verificar('bloqueio: "CLOSED - Not available" do Booking é bloqueio',
    bloqueios[1]?.bloqueio === true);
  verificar('bloqueio: "CLOSED - Booking" NÃO é bloqueio (na dúvida, é reserva)',
    bloqueios[2]?.bloqueio === false);
  verificar('bloqueio: um DTEND com hora dá na mesma só o dia',
    bloqueios[2]?.fim === '2026-10-23');

  // Controlo positivo da classificação, sem ficheiro pelo meio.
  verificar('ehBloqueio: "Reserved" não é bloqueio', ehBloqueio('Reserved') === false);
  verificar('ehBloqueio: "Indisponível" é bloqueio', ehBloqueio('Indisponível') === true);

  // ---------------------------------------------------- evento sem UID
  const semUid = lerIcal(exemplo('sem-uid.ics'));
  verificar('sem UID: o evento não se perde', semUid.length === 1);
  verificar('sem UID: ganha um identificador derivado das datas',
    semUid[0]?.uid === 'sem-uid:2026-11-01:2026-11-04');
  verificar('sem UID: o identificador é o MESMO numa segunda leitura',
    lerIcal(exemplo('sem-uid.ics'))[0]?.uid === semUid[0]?.uid);

  // ---------------------------------------------------- ficheiro truncado
  let erroTruncado = null;
  try { lerIcal(exemplo('truncado.ics')); } catch (e) { erroTruncado = e; }
  verificar('truncado: rebenta com ErroIcal, não devolve um calendário curto',
    erroTruncado instanceof ErroIcal);

  // ---------------------------------------------------- calendário vazio
  let eventosVazio = null;
  let erroVazio = null;
  try { eventosVazio = lerIcal(exemplo('vazio.ics')); } catch (e) { erroVazio = e; }
  verificar('vazio: é um calendário válido com zero eventos',
    erroVazio === null && Array.isArray(eventosVazio) && eventosVazio.length === 0);

  // ---------------------------------------------------- resposta que não é iCal
  let erroHtml = null;
  try { lerIcal('<!doctype html><html><body>404 Not Found</body></html>'); } catch (e) { erroHtml = e; }
  verificar('uma página HTML não passa por calendário', erroHtml instanceof ErroIcal);

  let erroNada = null;
  try { lerIcal(''); } catch (e) { erroNada = e; }
  verificar('uma resposta vazia não passa por calendário', erroNada instanceof ErroIcal);
} catch (erro) {
  console.error(`\nErro fatal: ${erro.message}`);
  falhas.push('execução completa (erro fatal)');
} finally {
  if (pasta) rmSync(pasta, { recursive: true, force: true });
}

console.log(falhas.length ? `\n${falhas.length} verificação(ões) do iCal em falha.` : '\nInterpretador de iCal correto.');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Passo 4: Registar o script**

Em `package.json`, no objeto `scripts`, acrescenta a linha (a seguir a `"rls-check"`):

```json
    "ical-check": "node scripts/ical-check.mjs",
```

- [ ] **Passo 5: Correr os testes e vê-los passar**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run ical-check
```

Esperado: todas as linhas `ok` e, no fim, `Interpretador de iCal correto.`

- [ ] **Passo 6: Provar que os testes são falsificáveis**

Comenta temporariamente a linha `if (!temFim) {` … `}` em `ical.ts` (o bloco inteiro do `END:VCALENDAR`) e volta a correr:

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run ical-check
```

Esperado: `FALHA truncado: rebenta com ErroIcal, não devolve um calendário curto` e saída com código 1. **Repõe a linha** e volta a correr até dar verde. Escreve no relatório que fizeste esta prova.

- [ ] **Passo 7: Commit**

```bash
git add supabase/functions/sync-calendars/ical.ts scripts/ical-check.mjs scripts/fixtures package.json
git commit -m "feat(ical): interpretador de calendários e os seus testes"
```

---

### Task 5: As regras do sincronizador em SQL (migração 0032)

**Files:**
- Create: `supabase/migrations/0032_importacao_ical.sql`
- Modify: `scripts/rls-check.mjs`

**Interfaces:**
- Consumes: `unit_defaults(uuid)` (Tarefa 1), `jobs.calendar_id`/`jobs.ical_uid` (Tarefa 1).
- Produces (todas `security definer`, `execute` revogado a `public`, `anon` e `authenticated`, concedido **só** a `service_role`):
  - `job_from_ical(p_calendar uuid, p_uid text, p_stay_date date, p_checkin_same_day boolean) returns text` — devolve uma de `'criada'`, `'atualizada'`, `'inalterada'`, `'avisada'`, `'ignorada'`.
  - `job_ical_desaparecidos(p_calendar uuid, p_uids text[]) returns text[]` — devolve o que fez, uma entrada por limpeza afetada (`'apagada:<id>'` ou `'avisada:<id>'`).
  - `aviso_ical(p_job uuid, p_titulo text, p_texto text, p_prioridade text) returns void`.

- [ ] **Passo 1: Escrever a migração**

Cria `supabase/migrations/0032_importacao_ical.sql`:

```sql
-- De onde vêm as limpezas, parte 3: as regras da importação.
--
-- Estas funções são o ÚNICO sítio da app que escreve em `jobs` sem ser a
-- gestora. Por isso:
--   * são `security definer` com `search_path = public, pg_temp`;
--   * `execute` é revogado a public, anon e authenticated, e concedido só a
--     `service_role` — a chave com que a Edge Function corre;
--   * nenhuma delas recebe um endereço, um texto de calendário ou qualquer
--     outra coisa vinda da internet: recebem factos já interpretados (um
--     identificador, um dia, um booleano). A interpretação do iCal fica na
--     Edge Function, que corre fora do Postgres.
--
-- O relógio é sempre o de Lisboa — `(now() at time zone 'Europe/Lisbon')::date`
-- — o mesmo que `src/modules/shared/dates/relogio.ts` usa no browser. Nunca o
-- fuso do servidor nem o do telemóvel: perto da meia-noite não dão o mesmo dia.

-- ==================================================================
-- O aviso para a gestora
-- ==================================================================
-- Um aviso por limpeza afetada, substituído se a mesma limpeza voltar a mudar,
-- para o quadro do "Hoje" não acumular avisos sobre a mesma coisa.
-- audience='gestao': `notices_collab` (0004, apertada em 0025) só deixa a
-- colaboradora ler 'todos' e 'colab', por isso um aviso de gestão nunca lhe
-- aparece.
create or replace function aviso_ical(
  p_job uuid, p_titulo text, p_texto text, p_prioridade text
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from notices
  where target_type = 'job' and target_id = p_job and type in ('reservation', 'priority');

  insert into notices (type, priority, audience, icon, title, text, action, target_type, target_id)
  values ('reservation', p_prioridade, 'gestao', 'calendar', p_titulo, p_texto,
          'Abrir no Planeamento', 'job', p_job);
end $$;

revoke execute on function aviso_ical(uuid, text, text, text) from public, anon, authenticated;
grant execute on function aviso_ical(uuid, text, text, text) to service_role;

-- ==================================================================
-- A semana em curso
-- ==================================================================
-- Regra validada em `alclean/modulos/mensagens.md:15`: os avisos de iCal só
-- existem para a semana em curso. Uma reserva para daqui a dois meses entra em
-- silêncio — a gestora vê-a no Planeamento quando lá chegar. Sem este limite, o
-- quadro do "Hoje" enchia-se de avisos sobre trabalho que ninguém vai fazer
-- esta semana, e deixava de se ler.
-- `date_trunc('week', …)` dá a segunda-feira, que é como a semana se conta cá.
create or replace function na_semana_em_curso(p_dia date) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select p_dia >= date_trunc('week', (now() at time zone 'Europe/Lisbon')::date)::date
     and p_dia <  (date_trunc('week', (now() at time zone 'Europe/Lisbon')::date) + interval '7 days')::date
$$;

revoke execute on function na_semana_em_curso(date) from public, anon, authenticated;
grant execute on function na_semana_em_curso(date) to service_role;

-- ==================================================================
-- Um evento do calendário
-- ==================================================================
create or replace function job_from_ical(
  p_calendar uuid,
  p_uid text,
  p_stay_date date,
  p_checkin_same_day boolean
) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
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

comment on function job_from_ical(uuid, text, date, boolean) is
  'Cria ou atualiza a limpeza de um evento de calendário. Só service_role. Devolve criada | atualizada | inalterada | avisada | ignorada.';

revoke execute on function job_from_ical(uuid, text, date, boolean) from public, anon, authenticated;
grant execute on function job_from_ical(uuid, text, date, boolean) to service_role;

-- ==================================================================
-- Eventos que desapareceram do calendário
-- ==================================================================
-- Chamada UMA VEZ por calendário, no fim, e SÓ quando a leitura correu bem.
-- Um calendário que não se consegue ler não é um calendário vazio: tratá-lo
-- como vazio apagaria todas as limpezas por publicar do quarto. Por isso quem
-- chama nunca a invoca depois de um erro de rede — ver a Edge Function.
create or replace function job_ical_desaparecidos(
  p_calendar uuid,
  p_uids text[]
) returns text[]
language plpgsql security definer set search_path = public, pg_temp as $$
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

comment on function job_ical_desaparecidos(uuid, text[]) is
  'Trata as limpezas deste calendário cujo evento já não existe. NUNCA chamar depois de uma leitura falhada: um calendário ilegível não é um calendário vazio.';

revoke execute on function job_ical_desaparecidos(uuid, text[]) from public, anon, authenticated;
grant execute on function job_ical_desaparecidos(uuid, text[]) to service_role;
```

- [ ] **Passo 2: Escrever as verificações falsificáveis**

Em `scripts/rls-check.mjs`, imediatamente a seguir à secção da Tarefa 2, acrescenta:

```js
  // ------------------------------------------- 0032: a importação do iCal
  // Fronteira: as funções da importação são `definer` e só corre com elas a
  // `service_role`. Nem a colaboradora nem a gestora lhes chegam.
  const { error: erroColabImporta } = await colabA.rpc('job_from_ical', {
    p_calendar: calendarioTesteId, p_uid: `${MARCADOR}-x`, p_stay_date: hojeLisboa, p_checkin_same_day: false,
  });
  verificar('0032: a colaboradora não chama job_from_ical',
    erroColabImporta?.code === '42501' || erroColabImporta?.code === '42883');

  const { error: erroGestoraImporta } = await gestoraA.rpc('job_from_ical', {
    p_calendar: calendarioTesteId, p_uid: `${MARCADOR}-x`, p_stay_date: hojeLisboa, p_checkin_same_day: false,
  });
  verificar('0032: nem a gestora chama job_from_ical — só o sincronizador',
    erroGestoraImporta?.code === '42501' || erroGestoraImporta?.code === '42883');

  const { error: erroColabDesap } = await colabA.rpc('job_ical_desaparecidos', {
    p_calendar: calendarioTesteId, p_uids: [],
  });
  verificar('0032: a colaboradora não chama job_ical_desaparecidos',
    erroColabDesap?.code === '42501' || erroColabDesap?.code === '42883');

  // Controlo positivo: com service_role, a função cria mesmo a limpeza — e a
  // linha que fica traz a origem e o estado certos.
  const amanhaLisboa = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' })
    .format(new Date(Date.now() + 24 * 3600 * 1000));
  const uidTeste = `${MARCADOR}-uid-1`;
  const { data: acaoCriada, error: erroAdminCria } = await admin.rpc('job_from_ical', {
    p_calendar: calendarioTesteId, p_uid: uidTeste, p_stay_date: amanhaLisboa, p_checkin_same_day: true,
  });
  const { data: importada } = await admin.from('jobs')
    .select('id,status,source,platform,stay_date,scheduled_on,checkin_same_day,calendar_id,ical_uid')
    .eq('calendar_id', calendarioTesteId).eq('ical_uid', uidTeste).maybeSingle();
  if (importada?.id) jobsCriadosNoTeste.push(importada.id);
  verificar('0032: o sincronizador cria a limpeza do evento, por publicar e com origem iCal',
    !erroAdminCria && acaoCriada === 'criada' && importada?.status === 'unpublished'
    && importada?.source === 'ical' && importada?.calendar_id === calendarioTesteId
    && importada?.ical_uid === uidTeste && importada?.checkin_same_day === true
    && importada?.stay_date === amanhaLisboa);

  // Uma segunda leitura do mesmo evento não faz nada.
  const { data: acaoRepetida } = await admin.rpc('job_from_ical', {
    p_calendar: calendarioTesteId, p_uid: uidTeste, p_stay_date: amanhaLisboa, p_checkin_same_day: true,
  });
  const { count: quantasDoUid } = await admin.from('jobs')
    .select('*', { count: 'exact', head: true }).eq('calendar_id', calendarioTesteId).eq('ical_uid', uidTeste);
  verificar('0032: o mesmo evento nunca gera duas limpezas',
    acaoRepetida === 'inalterada' && quantasDoUid === 1);

  // A colaboradora NÃO vê a limpeza por publicar criada pela importação —
  // mesmo estando-lhe atribuída. Semeia-se a atribuição primeiro, senão o
  // "não vê" não prova nada.
  await admin.from('job_assignments').insert({ job_id: importada.id, person_id: pessoaId, hours: 2 });
  await confirmarSemente('job_assignments', 1, (q) => q.eq('job_id', importada.id));
  const { data: vistaPelaColab, error: erroVistaColab } = await colabA.from('jobs')
    .select('id').eq('id', importada.id);
  verificar('0032: a colaboradora não vê a limpeza por publicar criada pela importação',
    vazioAutenticado(vistaPelaColab, erroVistaColab));

  // Controlo positivo: publicada, passa a vê-la. Senão, o teste acima passaria
  // mesmo que a colaboradora não visse limpeza NENHUMA por outro motivo.
  await admin.from('jobs').update({ status: 'planned' }).eq('id', importada.id);
  const { data: vistaDepois, error: erroVistaDepois } = await colabA.from('jobs')
    .select('id').eq('id', importada.id);
  verificar('0032: depois de publicada, a colaboradora vê-a (controlo positivo)',
    !erroVistaDepois && vistaDepois?.length === 1);
  await admin.from('jobs').update({ status: 'unpublished' }).eq('id', importada.id);

  // Publicada: a alteração de data não lhe toca e deixa aviso de gestão.
  await admin.from('jobs').update({ status: 'planned' }).eq('id', importada.id);
  const { data: acaoAvisada } = await admin.rpc('job_from_ical', {
    p_calendar: calendarioTesteId, p_uid: uidTeste, p_stay_date: hojeLisboa, p_checkin_same_day: false,
  });
  const { data: depoisDoAviso } = await admin.from('jobs')
    .select('stay_date,scheduled_on').eq('id', importada.id).single();
  const { data: avisos } = await admin.from('notices')
    .select('id,audience,type').eq('target_type', 'job').eq('target_id', importada.id);
  verificar('0032: uma limpeza publicada não é movida pela importação — é avisada',
    acaoAvisada === 'avisada' && depoisDoAviso?.stay_date === amanhaLisboa
    && avisos?.length === 1 && avisos[0].audience === 'gestao');

  // O aviso de gestão não é legível pela colaboradora.
  await confirmarSemente('notices', 1, (q) => q.eq('target_id', importada.id));
  const { data: avisoPelaColab, error: erroAvisoColab } = await colabA.from('notices')
    .select('id').eq('target_id', importada.id);
  verificar('0032: a colaboradora não lê os avisos de gestão da importação',
    vazioAutenticado(avisoPelaColab, erroAvisoColab));

  // Um evento que desapareceu NÃO apaga uma limpeza publicada.
  const { data: desapPublicada } = await admin.rpc('job_ical_desaparecidos', {
    p_calendar: calendarioTesteId, p_uids: [],
  });
  const { count: aindaLa } = await admin.from('jobs')
    .select('*', { count: 'exact', head: true }).eq('id', importada.id);
  verificar('0032: uma limpeza publicada não é apagada por a reserva desaparecer',
    aindaLa === 1 && (desapPublicada ?? []).some((r) => r === `avisada:${importada.id}`));

  // Controlo positivo do apagar: por publicar e sem ninguém, a limpeza sai.
  await admin.from('job_assignments').delete().eq('job_id', importada.id);
  await admin.from('jobs').update({ status: 'unpublished' }).eq('id', importada.id);
  const { data: desapPorPublicar } = await admin.rpc('job_ical_desaparecidos', {
    p_calendar: calendarioTesteId, p_uids: [],
  });
  const { count: jaNaoLa } = await admin.from('jobs')
    .select('*', { count: 'exact', head: true }).eq('id', importada.id);
  verificar('0032: por publicar e sem ninguém, a limpeza cancelada é apagada',
    jaNaoLa === 0 && (desapPorPublicar ?? []).some((r) => r === `apagada:${importada.id}`));

  // A colaboradora não escreve no estado de um calendário.
  const { data: calEscrito, error: erroCalEscrito } = await colabA.from('unit_calendars')
    .update({ status: 'connected', imported: 99 }).eq('id', calendarioTesteId).select('id');
  verificar('0032: a colaboradora não altera o estado de um calendário',
    (erroCalEscrito?.code === '42501') || (!erroCalEscrito && calEscrito?.length === 0));
```

E acrescenta, em `preparar()`, logo a seguir à criação de `unidadeProprioId`, o calendário descartável — com um endereço que nunca será descarregado por este script:

```js
  // Calendário descartável no quarto de teste. O endereço nunca é lido por
  // ninguém aqui: estas verificações chamam as funções Postgres diretamente,
  // sem passar pela Edge Function nem pela rede.
  const { data: calendarioTeste, error: erroCalendario } = await admin.from('unit_calendars')
    .insert({ unit_id: unidadeProprioId, platform: 'Airbnb', url: 'https://exemplo.invalid/rls-check.ics' })
    .select('id').single();
  if (erroCalendario) throw new Error(`criar calendário de teste: ${erroCalendario.message}`);
  calendarioTesteId = calendarioTeste.id;
```

E a declaração de topo, junto das outras:

```js
let calendarioTesteId = null;  // calendário descartável dentro do quarto de teste
```

O calendário de teste sai em cascata com o alojamento descartável, que `limpar()` já apaga por `name = MARCADOR` — não é preciso apagá-lo à mão.

Os avisos, não: `notices.target_id` **não tem chave estrangeira** para `jobs`, por isso apagar a limpeza deixa o aviso órfão na tabela. Em `limpar()`, imediatamente **antes** do ciclo que apaga `jobsCriadosNoTeste` (e por essa ordem, senão já não se sabe que ids apagar), acrescenta:

```js
  for (const id of jobsCriadosNoTeste) {
    const { error } = await admin.from('notices').delete().eq('target_type', 'job').eq('target_id', id);
    if (error) console.error(`  aviso: não apaguei os avisos de teste de ${id} — ${error.message}`);
  }
```

- [ ] **Passo 3: Commit**

```bash
git add supabase/migrations/0032_importacao_ical.sql scripts/rls-check.mjs
git commit -m "feat(ical): regras da importação em SQL e as suas fronteiras (migração 0032)"
```

- [ ] **Passo 4: PASSO MANUAL DO UTILIZADOR — aplicar a migração 0032**

> **O que tens de fazer agora:**
>
> 1. Supabase → **SQL Editor** → **New query**.
> 2. Cola o conteúdo todo de `supabase/migrations/0032_importacao_ical.sql`.
> 3. **Run**. Deve dizer "Success. No rows returned".
>
> Isto cria quatro funções novas e não altera nenhuma limpeza. As funções só
> correm com a chave `service_role`: nem a tua sessão de gestora lhes chega, e
> é de propósito — só o sincronizador as usa.

- [ ] **Passo 5: Correr as verificações**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run rls-check
```

Esperado: as doze linhas novas em `ok` e `Todas as fronteiras seguras.`

- [ ] **Passo 6: Confirmar que os dados do utilizador não foram tocados**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && node --env-file=.env -e "
import('@supabase/supabase-js').then(async ({ createClient }) => {
  const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { count: demo } = await a.from('demo_jobs').select('*', { count: 'exact', head: true });
  const { count: todas } = await a.from('jobs').select('*', { count: 'exact', head: true });
  const { data: mater } = await a.from('clients').select('id,name').eq('name', 'Mater50').maybeSingle();
  const { count: quartos } = await a.from('units').select('*, service_locations!inner(client_id)', { count: 'exact', head: true }).eq('service_locations.client_id', mater?.id ?? '00000000-0000-0000-0000-000000000000');
  console.log({ limpezasDemo: demo, limpezasTotais: todas, mater50: mater?.name ?? null, quartosDoMater50: quartos });
});
"
```

Esperado: `limpezasDemo: 12`, `mater50: 'Mater50'`, `quartosDoMater50: 4`. Se algum destes números mudou, **pára** e diz.

---

### Task 6: A Edge Function `sync-calendars`

**Files:**
- Create: `supabase/functions/sync-calendars/index.ts`
- Create: `supabase/functions/sync-calendars/README.md`

**Interfaces:**
- Consumes: `lerIcal`, `ErroIcal`, `EventoIcal` de `./ical.ts` (Tarefa 4); `job_from_ical`, `job_ical_desaparecidos` (Tarefa 5).
- Produces: um ponto `POST` que aceita `{ calendarId?: string }` e devolve
  `{ ok: true, calendarios: Array<{ id: string; unitId: string; status: 'connected' | 'error'; importadas: number; erro: string | null }> }`,
  ou `{ error: string }` com 400/403/500.

- [ ] **Passo 1: Escrever a função**

Cria `supabase/functions/sync-calendars/index.ts`:

```ts
// O sincronizador: descarrega cada endereço iCal, interpreta-o, e manda as
// funções Postgres decidirem o que criar, alterar ou assinalar.
//
// Porquê aqui e não no Postgres: o browser não pode ir buscar o calendário (o
// Airbnb não o permite de outra origem), e pôr um interpretador de iCal dentro
// de uma função de base de dados seria escrevê-lo em SQL sem necessidade.
//
// Corre com a chave `service_role`, porque só a gestora pode inserir em `jobs`
// (`jobs_manager_all`, 0004_rls.sql) e o sincronizador não é ninguém. É a única
// coisa nesta app que escreve em `jobs` sem ser a gestora.
//
// Quem a pode chamar, e só estes dois:
//   * o agendador, por um segredo partilhado no cabeçalho `x-alclean-cron`;
//   * a gestora, pela sua sessão (`caller.rpc('is_manager')`), exatamente como
//     `provision-access` já faz.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ErroIcal, lerIcal, type EventoIcal } from './ical.ts';
import { enderecoAceite } from './enderecos.ts';

/** Saídas até 90 dias à frente. Mais longe do que isto não é planeamento, é adivinhação. */
const HORIZONTE_DIAS = 90;
/** Um calendário que não responde neste tempo é um calendário em erro. */
const TEMPO_LIMITE_MS = 20_000;
/** Redirecionamentos seguidos à mão, para poder validar cada salto. */
const MAX_REDIRECIONAMENTOS = 3;

const origensPermitidas = (Deno.env.get('ALCLEAN_ORIGENS') ?? '')
  .split(',').map((o) => o.trim()).filter(Boolean);

const corsPara = (req: Request) => {
  const origem = req.headers.get('Origin');
  const permitida = origensPermitidas.length === 0
    ? '*'
    : (origem && origensPermitidas.includes(origem) ? origem : origensPermitidas[0]);
  return {
    'Access-Control-Allow-Origin': permitida,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-alclean-cron',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    ...(origensPermitidas.length ? { Vary: 'Origin' } : {}),
  };
};

/** Comparação de segredos que não desiste ao primeiro caractere diferente. */
function segredoIgual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i += 1) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

/** Hoje em Lisboa, AAAA-MM-DD. O mesmo relógio de `shared/dates/relogio.ts`. */
function hojeLisboa(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date());
}

/** "AAAA-MM-DD" mais N dias, sem passar por fuso nenhum. */
function maisDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Descarrega, seguindo redirecionamentos à mão para validar cada salto — senão
 * um endereço aparentemente inocente podia redirecionar o servidor para dentro
 * da própria rede dele. O guarda está em `./enderecos.ts`.
 */
async function descarregar(url: string): Promise<string> {
  let atual = url;
  for (let salto = 0; salto <= MAX_REDIRECIONAMENTOS; salto += 1) {
    const recusa = enderecoAceite(atual);
    if (recusa) throw new ErroIcal(recusa);

    const resposta = await fetch(atual, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      headers: { Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1' },
    });

    if (resposta.status >= 300 && resposta.status < 400) {
      const destino = resposta.headers.get('Location');
      if (!destino) throw new ErroIcal(`O sítio respondeu ${resposta.status} sem dizer para onde.`);
      atual = new URL(destino, atual).toString();
      continue;
    }
    if (!resposta.ok) {
      throw new ErroIcal(`O sítio respondeu ${resposta.status}. Confirma o endereço na plataforma.`);
    }
    return await resposta.text();
  }
  throw new ErroIcal('O endereço salta de sítio em sítio demasiadas vezes.');
}

Deno.serve(async (req) => {
  const corsHeaders = corsPara(req);
  const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ---------------------------------------------------------- quem chama
    const segredoConfigurado = Deno.env.get('ALCLEAN_CRON_SEGREDO') ?? '';
    const segredoRecebido = req.headers.get('x-alclean-cron') ?? '';
    const doAgendador = Boolean(segredoConfigurado) && segredoIgual(segredoConfigurado, segredoRecebido);

    if (!doAgendador) {
      const caller = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
      );
      const { data: ehGestora, error: erroGestora } = await caller.rpc('is_manager');
      if (erroGestora || ehGestora !== true) {
        return json({ error: 'Só a gestora pode sincronizar calendários.' }, 403);
      }
    }

    let corpo: { calendarId?: string } = {};
    if (req.headers.get('Content-Type')?.includes('application/json')) {
      try { corpo = await req.json(); } catch { corpo = {}; }
    }

    // -------------------------------------------- que calendários se leem
    // Um pedido para UM calendário lê na mesma todos os do MESMO QUARTO: a
    // entrada no mesmo dia pode vir do outro calendário (um quarto anunciado
    // no Airbnb e no Booking ao mesmo tempo), e sem os dois a bolinha vermelha
    // ficava por pôr.
    let unidades: string[];
    if (corpo.calendarId) {
      const { data, error } = await admin.from('unit_calendars')
        .select('unit_id').eq('id', corpo.calendarId).maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: 'Calendário não encontrado.' }, 404);
      unidades = [data.unit_id];
    } else {
      const { data, error } = await admin.from('unit_calendars').select('unit_id');
      if (error) return json({ error: error.message }, 400);
      unidades = [...new Set((data ?? []).map((c) => c.unit_id as string))];
    }

    const hoje = hojeLisboa();
    const limite = maisDias(hoje, HORIZONTE_DIAS);
    const relatorio: Array<{ id: string; unitId: string; status: string; importadas: number; erro: string | null }> = [];

    for (const unitId of unidades) {
      const { data: calendarios, error: erroCals } = await admin.from('unit_calendars')
        .select('id,unit_id,url,platform').eq('unit_id', unitId);
      if (erroCals) return json({ error: erroCals.message }, 400);

      // 1.ª volta: descarregar e interpretar TUDO o que é deste quarto, sem
      // escrever nada. Só depois de saber quem entra é que se decide quem tem
      // entrada no mesmo dia.
      const lidos: Array<{ id: string; url: string; eventos: EventoIcal[] }> = [];
      const falhados: Array<{ id: string; erro: string }> = [];

      for (const cal of calendarios ?? []) {
        if (!cal.url?.trim()) {
          falhados.push({ id: cal.id, erro: 'Sem endereço guardado.' });
          continue;
        }
        try {
          lidos.push({ id: cal.id, url: cal.url, eventos: lerIcal(await descarregar(cal.url)) });
        } catch (e) {
          const mensagem = e instanceof ErroIcal ? e.message
            : e instanceof Error && e.name === 'TimeoutError' ? 'O sítio demorou demasiado a responder.'
            : e instanceof Error ? e.message : 'Não foi possível ler o calendário.';
          falhados.push({ id: cal.id, erro: mensagem });
        }
      }

      // Dias em que ENTRA um hóspede, vindos de TODOS os calendários do quarto
      // que se conseguiram ler. Se um calendário irmão falhou, este conjunto
      // fica incompleto — mas uma entrada a menos é uma bolinha vermelha a
      // menos, nunca uma limpeza a menos, e a gestora vê o calendário em erro.
      const diasDeEntrada = new Set<string>();
      for (const c of lidos) {
        for (const ev of c.eventos) if (!ev.bloqueio) diasDeEntrada.add(ev.inicio);
      }

      // 2.ª volta: escrever, calendário a calendário.
      for (const c of lidos) {
        let criadas = 0;
        const uidsVistos: string[] = [];
        let erroEscrita: string | null = null;

        for (const ev of c.eventos) {
          if (ev.bloqueio) continue;                 // bloqueio do anfitrião: não é hóspede
          if (ev.fim < hoje || ev.fim > limite) continue;  // passado, ou fora do horizonte
          uidsVistos.push(ev.uid);
          const { data: acao, error } = await admin.rpc('job_from_ical', {
            p_calendar: c.id,
            p_uid: ev.uid,
            p_stay_date: ev.fim,                     // DTEND é o dia da saída
            p_checkin_same_day: diasDeEntrada.has(ev.fim),
          });
          if (error) { erroEscrita = error.message; break; }
          if (acao === 'criada') criadas += 1;
        }

        if (erroEscrita) {
          falhados.push({ id: c.id, erro: erroEscrita });
          continue;
        }

        // Só agora, e só porque a leitura correu bem: um calendário que não se
        // consegue ler não é um calendário vazio.
        const { error: erroDesap } = await admin.rpc('job_ical_desaparecidos', {
          p_calendar: c.id, p_uids: uidsVistos,
        });
        if (erroDesap) {
          falhados.push({ id: c.id, erro: erroDesap.message });
          continue;
        }

        await admin.from('unit_calendars')
          .update({ status: 'connected', last_sync: new Date().toISOString(), imported: criadas })
          .eq('id', c.id);
        relatorio.push({ id: c.id, unitId, status: 'connected', importadas: criadas, erro: null });
      }

      for (const f of falhados) {
        // Nenhuma limpeza é criada, alterada ou apagada a partir de um
        // calendário que falhou. `imported` fica como estava: o número da
        // última leitura boa continua a ser verdade.
        await admin.from('unit_calendars')
          .update({ status: 'error', last_sync: new Date().toISOString() })
          .eq('id', f.id);
        relatorio.push({ id: f.id, unitId, status: 'error', importadas: 0, erro: f.erro });
      }
    }

    return json({ ok: true, calendarios: relatorio });
  } catch (erro) {
    console.error('sync-calendars:', erro);
    return json({ error: erro instanceof Error ? erro.message : 'Erro inesperado.' }, 500);
  }
});
```

- [ ] **Passo 2: Escrever o guarda dos endereços**

Cria `supabase/functions/sync-calendars/enderecos.ts`:

```ts
/**
 * O guarda dos endereços iCal. Separado do `index.ts` por uma razão só: não
 * importa nada — nem Deno, nem rede — e por isso pode ser testado em Node por
 * `npm run ical-check`, sem publicar nada.
 *
 * O endereço iCal é dado do cliente e vai para um pedido de rede feito pelo
 * servidor. Colar um endereço não pode servir para fazer o servidor falar com
 * coisas que não são da internet.
 */
const NOMES_RECUSADOS = /^(localhost|.*\.local|.*\.internal|.*\.localdomain)$/i;

/** Devolve `null` se o endereço é aceite, ou a frase a mostrar à gestora se não é. */
export function enderecoAceite(valor: string): string | null {
  let u: URL;
  try {
    u = new URL(valor);
  } catch {
    return 'O endereço não é um URL válido.';
  }
  if (u.protocol !== 'https:') return 'O endereço tem de começar por https://.';
  const nome = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (NOMES_RECUSADOS.test(nome)) return 'Esse endereço aponta para dentro do servidor.';

  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(nome);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    const privado = a === 0 || a === 10 || a === 127
      || (a === 169 && b === 254)                 // o 169.254.169.254 serve as credenciais da máquina
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127)
      || a >= 224;
    if (privado) return 'Esse endereço aponta para dentro da rede do servidor.';
  }
  // As formas de escrever um endereço privado em IPv6 são demasiadas para uma
  // lista, por isso não se aceitam endereços IPv6 crus — só nomes.
  if (nome.includes(':')) return 'Endereços IPv6 não são aceites; usa o nome do sítio.';

  return null;
}
```

- [ ] **Passo 3: Escrever o README da função**

Cria `supabase/functions/sync-calendars/README.md`:

```markdown
# sync-calendars

Lê os endereços iCal dos quartos e cria, altera ou assinala as limpezas.

## Segredos (Supabase → Edge Functions → sync-calendars → Secrets)

| Nome | Valor | Obrigatório |
|---|---|---|
| `SUPABASE_URL` | preenchido pelo Supabase | automático |
| `SUPABASE_SERVICE_ROLE_KEY` | preenchido pelo Supabase | automático |
| `SUPABASE_ANON_KEY` | preenchido pelo Supabase | automático |
| `ALCLEAN_CRON_SEGREDO` | texto aleatório longo, inventado por ti | sim, para o agendador |
| `ALCLEAN_ORIGENS` | `https://<o-teu-site>.netlify.app` | não (por omissão aceita qualquer origem) |

`ALCLEAN_CRON_SEGREDO` é o que distingue uma chamada do agendador de uma
chamada de qualquer pessoa da internet. Sem ele definido, o agendador não
consegue entrar e só a gestora pode sincronizar — que é o comportamento seguro.

## Quem a pode chamar

1. O agendador, com o cabeçalho `x-alclean-cron: <ALCLEAN_CRON_SEGREDO>`.
2. A gestora, com a sua sessão no cabeçalho `Authorization` (é o que o botão
   "Sincronizar agora" faz). A verificação é `is_manager()` — a mesma função
   que o RLS usa.

Mais ninguém.

## Corpo do pedido

* `{}` ou sem corpo — sincroniza todos os calendários de todos os quartos.
* `{"calendarId": "<uuid>"}` — sincroniza o quarto a que esse calendário
  pertence (todos os calendários dele, porque a entrada no mesmo dia pode vir
  do outro).
```

- [ ] **Passo 4: Acrescentar aos testes a prova do guarda de endereços**

O guarda de endereços é código puro, e por isso é testável em Node exatamente como o interpretador. Em `scripts/ical-check.mjs`, muda o bloco do `build` para compilar também o guarda, e acrescenta as verificações.

Substitui o bloco do `build` por este:

```js
  pasta = mkdtempSync(join(process.cwd(), 'node_modules', '.cache-ical-'));
  const saida = join(pasta, 'ical.mjs');
  await build({
    entryPoints: ['supabase/functions/sync-calendars/ical.ts'],
    bundle: true, platform: 'node', format: 'esm', outfile: saida,
    loader: { '.ts': 'ts' }, logLevel: 'silent',
  });
  const { lerIcal, ehBloqueio, ErroIcal } = await import(pathToFileURL(saida).href);

  const saidaEnderecos = join(pasta, 'enderecos.mjs');
  await build({
    entryPoints: ['supabase/functions/sync-calendars/enderecos.ts'],
    bundle: true, platform: 'node', format: 'esm', outfile: saidaEnderecos,
    loader: { '.ts': 'ts' }, logLevel: 'silent',
  });
  const { enderecoAceite } = await import(pathToFileURL(saidaEnderecos).href);
```

E acrescenta, imediatamente antes do `} catch (erro) {` final:

```js
  // ------------------------------------------- guarda dos endereços iCal
  // Colar um endereço não pode servir para fazer o servidor falar com coisas
  // que não são da internet.
  verificar('endereço: um iCal verdadeiro do Airbnb passa',
    enderecoAceite('https://www.airbnb.com/calendar/ical/12345.ics?s=abc') === null);
  verificar('endereço: um iCal verdadeiro do Booking passa',
    enderecoAceite('https://admin.booking.com/hotel/hoteladmin/ical.html?t=abc') === null);
  for (const mau of [
    'http://www.airbnb.com/calendar/ical/1.ics',
    'https://localhost/x.ics',
    'https://algo.local/x.ics',
    'https://127.0.0.1/x.ics',
    'https://169.254.169.254/latest/meta-data/',
    'https://10.0.0.5/x.ics',
    'https://192.168.1.1/x.ics',
    'https://172.16.0.1/x.ics',
    'https://[::1]/x.ics',
    'nao-e-um-url',
  ]) {
    verificar(`endereço recusado: ${mau}`, typeof enderecoAceite(mau) === 'string');
  }
```

- [ ] **Passo 5: Correr os testes e compilar a função**

Este projeto não corre `tsc`, mas o esbuild resolve os `import` e apanha erros de sintaxe — é o mais perto de uma verificação de tipos que aqui existe.

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run ical-check && npx esbuild supabase/functions/sync-calendars/index.ts --bundle --platform=neutral --format=esm --external:jsr:* --outfile=/dev/null
```

Esperado: `Interpretador de iCal correto.` e o esbuild sem saída de erro. Um `import` de `./ical.ts` ou de `./enderecos.ts` mal escrito aparece aqui.

- [ ] **Passo 6: Provar que o guarda é falsificável**

Em `enderecos.ts`, troca temporariamente `if (u.protocol !== 'https:')` por `if (false)` e corre `npm run ical-check`.

Esperado: `FALHA endereço recusado: http://www.airbnb.com/calendar/ical/1.ics`. **Repõe a linha** e corre outra vez até dar verde. Escreve no relatório que fizeste esta prova.

- [ ] **Passo 7: Commit**

```bash
git add supabase/functions/sync-calendars scripts/ical-check.mjs
git commit -m "feat(ical): Edge Function sync-calendars e guarda de endereços"
```

- [ ] **Passo 8: PASSO MANUAL DO UTILIZADOR — publicar a função e definir os segredos**

> **O que tens de fazer agora (eu não publico funções):**
>
> **a) Inventar o segredo do agendador.** No terminal, corre e guarda o que sair:
> ```bash
> openssl rand -hex 32
> ```
>
> **b) Definir os segredos.** Supabase → **Edge Functions** → **Secrets** (ou
> Project Settings → Edge Functions → Secrets) → **Add new secret**:
>
> | Nome | Valor |
> |---|---|
> | `ALCLEAN_CRON_SEGREDO` | o que saiu do `openssl rand -hex 32` |
> | `ALCLEAN_ORIGENS` | o endereço do teu site, ex. `https://alclean.netlify.app` |
>
> Os três `SUPABASE_*` já lá estão — o Supabase preenche-os sozinho.
>
> **c) Publicar a função.** Na tua máquina, na pasta `alclean/app`:
> ```bash
> npx supabase functions deploy sync-calendars --project-ref <o-teu-project-ref>
> ```
> O `project-ref` é a parte do meio do endereço do projeto
> (`https://<project-ref>.supabase.co`). Se te pedir para entrares, corre
> `npx supabase login` primeiro.
>
> **d) Guardar o segredo onde eu o não veja.** Não me colas o
> `ALCLEAN_CRON_SEGREDO` aqui — vais precisar dele outra vez na Tarefa 8, e
> vais pô-lo no Vault do Supabase, não numa conversa.

- [ ] **Passo 9: Verificar a publicação sem sincronizar nada**

Pede ao utilizador que corra isto (é um pedido **sem** sessão e **sem** segredo — tem de ser recusado):

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  "https://<o-teu-project-ref>.supabase.co/functions/v1/sync-calendars" \
  -H "Content-Type: application/json" -d '{}'
```

Esperado: `403` (ou `401`, se a proteção de JWT da plataforma estiver ligada). Se devolver `200`, a verificação de quem chama não está a funcionar — **pára** e corrige antes de avançar.

---

### Task 7: O botão "Sincronizar agora", e o calendário que deixa de ser esmagado

**Files:**
- Create: `supabase/migrations/0033_calendario_nao_esmagado.sql`
- Modify: `src/modules/clientes/repository.ts`
- Modify: `src/modules/clientes/useClientsModule.ts`
- Modify: `src/modules/clientes/components/CalendarEditor.tsx`

**Interfaces:**
- Consumes: a Edge Function `sync-calendars` (Tarefa 6).
- Produces:
  - `export async function syncCalendarNow(calendarId: string): Promise<{ importadas: number; erro: string | null }>` em `clientes/repository.ts`.
  - Ação nova no hook: `syncCalendar(calendarId: string): Promise<void>`.
  - `commit_location_detail` deixa de escrever `status`, `last_sync` e `imported` em `unit_calendars`.

**Porquê a migração 0033 existe:** `commit_location_detail` (`0010_clients_rpc.sql:169-188`) reescreve `status`, `last_sync` e `imported` de cada calendário a partir do rascunho que o browser tem em memória. A partir do momento em que o sincronizador escreve números verdadeiros nessas três colunas, a gestora a carregar em "Guardar alterações" no ecrã do alojamento apaga-os — e o ecrã volta a dizer "0 importadas, nunca sincronizado". É um bug novo criado pela Tarefa 6, e fecha-se aqui.

- [ ] **Passo 1: Escrever a migração**

Cria `supabase/migrations/0033_calendario_nao_esmagado.sql`:

```sql
-- O estado de um calendário passa a pertencer a quem o lê.
--
-- Até aqui, `commit_location_detail` (0010) reescrevia `status`, `last_sync` e
-- `imported` a partir do rascunho que o browser tinha em memória. Enquanto
-- ninguém sincronizava a sério, isso não tinha consequência nenhuma: as três
-- colunas eram sempre 'none', null e 0. Desde a Edge Function `sync-calendars`,
-- tem: a gestora a abrir o alojamento e a carregar em "Guardar alterações"
-- apagava o resultado da última sincronização, e o ecrã voltava a dizer "nunca
-- sincronizado" sobre um calendário que tinha corrido bem há cinco minutos.
--
-- O ecrã do alojamento passa a mandar no que é dele — a plataforma e o endereço
-- — e o sincronizador no que é dele. Um calendário NOVO nasce 'none', sem data
-- e com zero: ainda não foi lido por ninguém, e é verdade.
--
-- Muda-se só o corpo da função: a assinatura e tudo o resto ficam iguais, por
-- isso nenhum código do browser precisa de mudar.

create or replace function commit_location_detail(
  p_location_id uuid, p_name text, p_address text, p_image text,
  p_status location_status, p_service_ids text[], p_team_id uuid,
  p_hourly_rate numeric, p_checkout_time time, p_checkin_time time,
  p_access_instructions text, p_notes text, p_units jsonb
) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_unit jsonb;
  v_cal jsonb;
  v_unit_id uuid;
  v_cal_id uuid;
  v_seen_units uuid[] := '{}';
  v_seen_cals uuid[];
begin
  update service_locations set
    name = p_name, address = p_address, image = p_image, status = p_status,
    service_ids = p_service_ids, team_id = p_team_id,
    checkout_time = p_checkout_time, checkin_time = p_checkin_time,
    access_instructions = p_access_instructions, notes = p_notes
  where id = p_location_id;
  if not found then raise exception 'Alojamento não encontrado.'; end if;

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
      v_unit_id := null;   -- id local atribuído no browser: é um quarto novo
    end;
    if v_unit_id is not null and not exists (
      select 1 from units where id = v_unit_id and location_id = p_location_id
    ) then
      v_unit_id := null;
    end if;

    if v_unit_id is null then
      insert into units (location_id, name, type, capacity, status, team_id, laundry, checkout_time, checkin_time)
      values (p_location_id, coalesce(v_unit->>'name', ''), coalesce(v_unit->>'type', ''),
              coalesce((v_unit->>'capacity')::int, 2),
              coalesce((v_unit->>'status')::unit_status, 'active'),
              nullif(v_unit->>'teamId', '')::uuid,
              case when v_unit->'laundry' = 'null'::jsonb then null else v_unit->'laundry' end,
              nullif(v_unit->>'checkoutTime', '')::time, nullif(v_unit->>'checkinTime', '')::time)
      returning id into v_unit_id;
    else
      update units set
        name = coalesce(v_unit->>'name', ''), type = coalesce(v_unit->>'type', ''),
        capacity = coalesce((v_unit->>'capacity')::int, 2),
        status = coalesce((v_unit->>'status')::unit_status, 'active'),
        team_id = nullif(v_unit->>'teamId', '')::uuid,
        laundry = case when v_unit->'laundry' = 'null'::jsonb then null else v_unit->'laundry' end,
        checkout_time = nullif(v_unit->>'checkoutTime', '')::time,
        checkin_time = nullif(v_unit->>'checkinTime', '')::time
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
      if v_cal_id is not null and not exists (
        select 1 from unit_calendars where id = v_cal_id and unit_id = v_unit_id
      ) then
        v_cal_id := null;
      end if;

      if v_cal_id is null then
        -- Um calendário novo nasce por ler: 'none', sem data, zero importadas.
        -- É o sincronizador que lhe dá estado, na primeira vez que o ler.
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

revoke execute on function commit_location_detail(uuid, text, text, text, location_status, text[], uuid, numeric, time, time, text, text, jsonb) from public, anon;
grant execute on function commit_location_detail(uuid, text, text, text, location_status, text[], uuid, numeric, time, time, text, text, jsonb) to authenticated;
```

**Antes de escrever este ficheiro**, abre `supabase/migrations/0010_clients_rpc.sql` e copia daí o corpo verdadeiro da função, alterando **só** os dois blocos do calendário. O bloco acima foi reconstruído a partir do que se vê em `0010:161-196`; se alguma linha do original não bater certo com ele (um `coalesce` diferente, uma coluna a mais), **manda a do original** — o código ganha ao comentário.

- [ ] **Passo 2: Commit da migração**

```bash
git add supabase/migrations/0033_calendario_nao_esmagado.sql
git commit -m "fix(clientes): guardar o alojamento deixa de apagar o estado dos calendários (migração 0033)"
```

- [ ] **Passo 3: PASSO MANUAL DO UTILIZADOR — aplicar a migração 0033**

> **O que tens de fazer agora:**
>
> 1. Supabase → **SQL Editor** → **New query**.
> 2. Cola o conteúdo todo de `supabase/migrations/0033_calendario_nao_esmagado.sql`.
> 3. **Run**.
>
> Isto substitui uma função que já existe. Nenhum calendário, quarto ou
> alojamento é alterado — só muda o que a função faz da próxima vez que
> carregares em "Guardar alterações".

- [ ] **Passo 4: Escrever a chamada à Edge Function**

No fim de `src/modules/clientes/repository.ts`, acrescenta:

```ts
/**
 * Pede uma sincronização imediata de um calendário (botão "Sincronizar agora").
 *
 * A função `sync-calendars` corre com a chave `service_role` e verifica quem a
 * chama com `is_manager()` — a mesma função que o RLS usa. Uma colaboradora
 * recebe 403 do servidor, não só um botão escondido.
 *
 * O quarto inteiro é sincronizado, não só este calendário: a entrada no mesmo
 * dia pode vir do outro (um quarto anunciado no Airbnb e no Booking ao mesmo
 * tempo). Por isso a resposta traz o relatório de todos, e aqui só se lê o
 * deste — os outros aparecem no ecrã sozinhos, por tempo real.
 */
export async function syncCalendarNow(calendarId: string): Promise<{ importadas: number; erro: string | null }> {
  const { data, error } = await supabase.functions.invoke('sync-calendars', {
    body: { calendarId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  const linha = (data?.calendarios ?? []).find((c: any) => c.id === calendarId);
  if (!linha) return { importadas: 0, erro: 'O servidor não devolveu o resultado deste calendário.' };
  return { importadas: Number(linha.importadas ?? 0), erro: linha.erro ?? null };
}
```

- [ ] **Passo 5: Acrescentar a ação ao hook dos Clientes**

Em `src/modules/clientes/useClientsModule.ts`, acrescenta `syncCalendarNow` à importação do repositório e, imediatamente antes de `const reset = useCallback(...)`, acrescenta:

```ts
  /**
   * Sincroniza um calendário e recarrega. Não há despacho otimista: o número
   * de limpezas importadas só existe depois de o servidor o contar, e inventar
   * um número era exatamente o que a versão simulada fazia
   * (`imported: 3 + Math.floor(Math.random() * 12)`), e que foi removida em
   * c0aa208.
   */
  const syncCalendar = useCallback(async (calendarId: string): Promise<void> => {
    try {
      const { importadas, erro } = await syncCalendarNow(calendarId);
      await recarregar();
      if (erro) notify(`Não consegui ler este calendário: ${erro}`);
      else if (importadas === 0) notify('Calendário lido. Nenhuma limpeza nova.');
      else notify(`Calendário lido. ${importadas} ${importadas === 1 ? 'limpeza nova' : 'limpezas novas'}, por publicar.`);
    } catch (erro) {
      notify(`Não foi possível sincronizar: ${mensagemErro(erro)}`);
      await recarregar();
    }
  }, [notify, recarregar]);
```

(Se neste ficheiro o auxiliar de mensagem de erro tiver outro nome, usa o que lá está — não crias um segundo.)

E acrescenta `syncCalendar` ao objeto `actions`:

```ts
    actions: { notify, saveClient, setClientStatus, setClientLaundry, saveLocation, commitLocation, setLocationStatus, removeLocation, syncCalendar, reset },
```

- [ ] **Passo 6: Substituir a nota "ainda não importa" pelo botão**

Em `src/modules/clientes/components/CalendarEditor.tsx`:

1. Apaga a constante `IMPORT_PENDING_NOTE` e a linha `<Note tone="plain">{IMPORT_PENDING_NOTE}</Note>`, e acrescenta no lugar dela, dentro do `<div className="flex flex-col gap-2.5">`:

```tsx
      <Note tone="plain">
        Cada endereço é lido automaticamente de hora a hora. "Sincronizar agora" lê-o já — as
        limpezas novas entram por publicar, e ficam invisíveis para as colaboradoras até publicares.
      </Note>
```

2. Confirma que `IMPORT_PENDING_NOTE` não é importado em mais lado nenhum:

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && grep -rn "IMPORT_PENDING_NOTE" src/
```

Se aparecer noutro ficheiro, apaga lá a utilização também (e não deixes a constante só porque alguém a importa — apaga os dois lados).

3. Acrescenta às importações do topo:

```tsx
import { useState } from 'react';
import { carimboLocal } from '../../shared/dates';
```

(`useEffect` e `useRef` já lá estão; junta `useState` à mesma linha de `react`.)

4. Dentro de `CalendarEditor`, acrescenta o estado de quem está a sincronizar:

```tsx
  const [aSincronizar, setASincronizar] = useState<string | null>(null);

  const sincronizar = async (c: UnitCalendar) => {
    setASincronizar(c.id);
    await actions.syncCalendar(c.id);
    setASincronizar(null);
  };
```

5. No bloco de cada calendário, substitui a linha do `<Pill>` por esta, que mostra o estado verdadeiro e o botão:

```tsx
            <div className="col-span-full flex flex-wrap items-center gap-2">
              <Pill tone={status.tone} small>{status.label}</Pill>
              {c.lastSync && (
                <span className="text-slate-600">
                  Última leitura: {carimboLocal(c.lastSync)} · {c.imported} {c.imported === 1 ? 'limpeza criada' : 'limpezas criadas'}
                </span>
              )}
              <Button
                size="sm"
                variant="soft"
                icon="sync"
                loading={aSincronizar === c.id}
                disabled={Boolean(urlError) || !c.url.trim() || aSincronizar !== null || !isUuid(c.id)}
                onClick={() => void sincronizar(c)}
              >
                Sincronizar agora
              </Button>
            </div>
```

6. E o auxiliar que impede o botão de disparar sobre um calendário que ainda não foi gravado (`newId('k')` dá um id local, não um `uuid`) — acrescenta-o ao nível do módulo, antes de `CalendarEditor`:

```tsx
/** Um calendário acabado de acrescentar tem um id local ('k…'), não um uuid: ainda não existe no servidor. */
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
```

7. Confirma que `Button` está entre as importações de `../../shared/ui` no topo do ficheiro; se não estiver, acrescenta-o (`Note` e `Pill` já lá estão).

- [ ] **Passo 7: Compilar**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run build
```

Esperado: `Build ALClean concluído: 8 módulos.`

- [ ] **Passo 8: Provar com os endereços verdadeiros do utilizador**

Isto é a primeira vez que o sistema inteiro corre de ponta a ponta, e corre sobre os calendários reais do Airbnb do cliente **Mater50**, que o utilizador criou.

Antes de carregar no botão, tira uma fotografia do que lá está:

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && node --env-file=.env -e "
import('@supabase/supabase-js').then(async ({ createClient }) => {
  const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { count: antes } = await a.from('jobs').select('*', { count: 'exact', head: true });
  const { count: demo } = await a.from('demo_jobs').select('*', { count: 'exact', head: true });
  const { data: cals } = await a.from('unit_calendars').select('id,platform,status,last_sync,imported');
  console.log({ limpezasAntes: antes, demo, calendarios: cals });
});
"
```

Depois, no browser, entra com a conta da gestora, vai a **Clientes → Mater50 → o alojamento → um quarto → Calendários**, e carrega em **Sincronizar agora**. Confirma:
1. O botão fica a carregar e devolve uma mensagem com um número **verdadeiro**.
2. O estado do calendário passa a **Ligado** e mostra a data da última leitura.
3. No **Planeamento**, as limpezas novas aparecem como **Por publicar**, com a plataforma certa e no dia da saída.
4. As que têm entrada no mesmo dia mostram a **bolinha vermelha** (`PriorityDot`).
5. No ecrã do **Hoje**, os avisos das reservas **desta semana** aparecem; os de daqui a dois meses **não**.

Volta a correr o comando de cima e compara: `demo` tem de continuar a ser **12**, e `limpezasAntes` só pode ter **crescido**.

Escreve no relatório os dois números e o que viste em cada um dos cinco pontos. Se não houver browser, chama a função com a sessão da gestora por `curl` e di-lo por escrito — não digas que viste o que não viste.

- [ ] **Passo 9: Commit**

```bash
git add src/modules/clientes
git commit -m "feat(clientes): botão Sincronizar agora com o estado verdadeiro do calendário"
```

---

### Task 8: O agendador de hora a hora (migração 0034)

**Files:**
- Create: `supabase/migrations/0034_agendador.sql`

**Interfaces:**
- Consumes: a Edge Function publicada (Tarefa 6) e o segredo `ALCLEAN_CRON_SEGREDO`.
- Produces: a tarefa `cron.schedule('alclean-sincronizar-calendarios', '7 * * * *', …)`.

- [ ] **Passo 1: Escrever a migração**

Cria `supabase/migrations/0034_agendador.sql`:

```sql
-- O agendador: de hora a hora, `pg_cron` chama a Edge Function por `pg_net`.
--
-- As plataformas atualizam os seus calendários com atraso próprio, de minutos
-- a horas; de hora a hora é tão rápido quanto faz sentido. O minuto 7 e não o
-- 0: à hora certa toda a gente do planeta corre as suas tarefas ao mesmo tempo,
-- e o Airbnb responde pior.
--
-- Nem o endereço do projeto nem o segredo do agendador estão escritos neste
-- ficheiro. Vêm do Vault do Supabase, onde o utilizador os põe à mão antes de
-- aplicar esta migração — um ficheiro de migração vive no Git, e um segredo no
-- Git é um segredo publicado.
--
-- PRÉ-REQUISITOS, feitos à mão pelo utilizador ANTES de aplicar isto:
--   1. Database → Extensions → ligar `pg_cron` e `pg_net`.
--   2. Os dois segredos no Vault: `alclean_functions_url` e `alclean_cron_segredo`.
-- Se faltar algum, esta migração pára com uma mensagem que diz qual.

do $$
declare
  v_url text;
  v_segredo text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'A extensão pg_cron não está ligada. Painel do Supabase → Database → Extensions → pg_cron.';
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'A extensão pg_net não está ligada. Painel do Supabase → Database → Extensions → pg_net.';
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'alclean_functions_url';
  if v_url is null then
    raise exception 'Falta o segredo alclean_functions_url no Vault (ex.: https://<projeto>.supabase.co/functions/v1/sync-calendars).';
  end if;

  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'alclean_cron_segredo';
  if v_segredo is null then
    raise exception 'Falta o segredo alclean_cron_segredo no Vault (o mesmo valor que ALCLEAN_CRON_SEGREDO na Edge Function).';
  end if;
end $$;

-- Seguro para reexecução: tirar a tarefa antes de a voltar a pôr evita duas
-- tarefas iguais a correr ao mesmo tempo se esta migração for aplicada duas
-- vezes.
select cron.unschedule('alclean-sincronizar-calendarios')
where exists (select 1 from cron.job where jobname = 'alclean-sincronizar-calendarios');

-- O corpo da tarefa lê o Vault a cada execução, e não uma só vez aqui: assim,
-- trocar o segredo é mudar o Vault, sem voltar a aplicar migração nenhuma.
select cron.schedule(
  'alclean-sincronizar-calendarios',
  '7 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'alclean_functions_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-alclean-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'alclean_cron_segredo')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);

comment on extension pg_cron is
  'Usada por uma tarefa só: alclean-sincronizar-calendarios, de hora a hora ao minuto 7.';
```

- [ ] **Passo 2: Commit**

```bash
git add supabase/migrations/0034_agendador.sql
git commit -m "feat(ical): agendador de hora a hora com pg_cron e pg_net (migração 0034)"
```

- [ ] **Passo 3: PASSO MANUAL DO UTILIZADOR — ligar as extensões e guardar os segredos**

> **O que tens de fazer agora, por esta ordem:**
>
> **a) Ligar as duas extensões.** Supabase → **Database** → **Extensions**.
> Procura `pg_cron` e liga. Procura `pg_net` e liga. As duas já lá estão
> listadas, desligadas.
>
> **b) Guardar os dois segredos no Vault.** Supabase → **Integrations** →
> **Vault** (ou Project Settings → Vault) → **Add new secret**, duas vezes:
>
> | Name | Secret |
> |---|---|
> | `alclean_functions_url` | `https://<o-teu-project-ref>.supabase.co/functions/v1/sync-calendars` |
> | `alclean_cron_segredo` | **exatamente** o mesmo valor que puseste em `ALCLEAN_CRON_SEGREDO` na Tarefa 6 |
>
> Se os dois valores do segredo não forem iguais, o agendador é recusado com
> 403 de hora a hora e nunca ninguém repara — por isso confere caractere a
> caractere. Não me colas nenhum dos dois aqui.

- [ ] **Passo 4: PASSO MANUAL DO UTILIZADOR — aplicar a migração 0034**

> 1. Supabase → **SQL Editor** → **New query**.
> 2. Cola o conteúdo todo de `supabase/migrations/0034_agendador.sql`.
> 3. **Run**.
>
> Se der `A extensão pg_cron não está ligada` ou `Falta o segredo …`, é porque
> o passo anterior ficou a meio: acaba-o e volta a correr. A migração não faz
> nada até estar tudo pronto — de propósito.

- [ ] **Passo 5: Verificar que o agendador está mesmo a correr**

Pede ao utilizador que corra isto **uma hora depois** (ou logo a seguir ao minuto 7 da hora seguinte):

```sql
-- A tarefa existe e está ativa?
select jobid, jobname, schedule, active from cron.job where jobname = 'alclean-sincronizar-calendarios';

-- Correu, e correu bem? (as últimas cinco execuções)
select status, return_message, start_time, end_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'alclean-sincronizar-calendarios')
order by start_time desc limit 5;

-- E os calendários foram mesmo lidos?
select id, platform, status, last_sync, imported from unit_calendars order by last_sync desc nulls last;
```

Esperado: uma tarefa `active = true`; `status = 'succeeded'` nas execuções; e `last_sync` dos calendários a avançar de hora a hora.

Se `cron.job_run_details` disser `succeeded` mas `last_sync` não avançar, a chamada chegou à função e foi **recusada** — os dois valores do segredo não são iguais. Confirma o `ALCLEAN_CRON_SEGREDO` da função e o `alclean_cron_segredo` do Vault.

---

### Task 9: Fecho — documentação, tempo real e verificação final

**Files:**
- Modify: `DEPLOY.md`
- Modify: `supabase/migrations/README.md`
- Modify: `src/modules/planeamento/repository.ts` (só se a consulta do passo 2 mostrar uma tabela em falta)

- [ ] **Passo 1: Confirmar a publicação de tempo real, mesmo**

Não confies na lista de nenhuma migração: corre a consulta (ou pede ao utilizador que a corra) e cola o resultado no relatório.

```sql
select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1;
```

As tabelas que os ecrãs deste plano subscrevem são `jobs`, `job_assignments`, `absences` (Planeamento) e `clients`, `service_locations`, `units`, `unit_calendars`, `unit_rates`, `location_rates`, `company_settings` (Clientes), mais `notices` (Mensagens). Todas devem estar na lista — `unit_calendars` desde 0010, `notices` e `jobs` desde 0025.

Se alguma **faltar**, cria `supabase/migrations/0035_tempo_real_em_falta.sql` com o bloco seguinte (a lista é a das que faltaram, não a lista toda), e acrescenta um passo manual para o utilizador a aplicar:

```sql
-- Sem isto, o canal abre e nunca dispara: nenhum erro, só silêncio, e as
-- mudanças nunca chegam ao ecrã (licoes-modulo.md, ponto 3).
do $$
declare t text;
begin
  foreach t in array array['<as-que-faltaram>'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
```

Se não faltar nenhuma, **não cries a migração** e escreve no relatório que a lista está completa.

- [ ] **Passo 2: Escrever os passos manuais no `DEPLOY.md`**

Acrescenta ao fim de `DEPLOY.md`:

```markdown
---

## 7. Ligar a importação dos calendários

Isto é o que faz as limpezas nascerem sozinhas das reservas. Sem estes passos, a
app continua a funcionar — só não importa nada, e o botão "Sincronizar agora"
diz que não conseguiu.

### a) Aplicar as migrações

No **SQL Editor**, uma de cada vez, pela ordem, colando o ficheiro inteiro:

| Ficheiro | O que faz |
|---|---|
| `0030_origem_das_limpezas.sql` | colunas de origem em `jobs` e a duração por quarto |
| `0031_criar_limpeza.sql` | a criação manual ("Nova limpeza") |
| `0032_importacao_ical.sql` | as regras da importação |
| `0033_calendario_nao_esmagado.sql` | guardar o alojamento deixa de apagar o estado dos calendários |

Nenhuma delas altera limpezas existentes.

### b) Publicar a Edge Function

Na tua máquina, na pasta `alclean/app`:

```bash
npx supabase login
npx supabase functions deploy sync-calendars --project-ref <o-teu-project-ref>
```

### c) Definir os segredos da função

Supabase → **Edge Functions** → **Secrets**:

| Nome | Valor |
|---|---|
| `ALCLEAN_CRON_SEGREDO` | texto aleatório longo — gera com `openssl rand -hex 32` |
| `ALCLEAN_ORIGENS` | o endereço do site, ex. `https://alclean.netlify.app` |

Guarda o `ALCLEAN_CRON_SEGREDO`: é preciso outra vez no passo (e).

### d) Ligar as extensões do agendador

Supabase → **Database** → **Extensions**: liga `pg_cron` e `pg_net`.

### e) Guardar os segredos do agendador no Vault

Supabase → **Vault** → **Add new secret**, duas vezes:

| Name | Secret |
|---|---|
| `alclean_functions_url` | `https://<project-ref>.supabase.co/functions/v1/sync-calendars` |
| `alclean_cron_segredo` | **o mesmo** valor de `ALCLEAN_CRON_SEGREDO` |

### f) Aplicar a última migração

`0034_agendador.sql` no **SQL Editor**. Se ela se queixar de uma extensão ou de
um segredo, é porque (d) ou (e) ficaram a meio.

### g) Confirmar

Uma hora depois, no SQL Editor:

```sql
select status, start_time from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'alclean-sincronizar-calendarios')
order by start_time desc limit 3;

select platform, status, last_sync, imported from unit_calendars order by last_sync desc nulls last;
```

`succeeded` nas execuções e `last_sync` a avançar = está a funcionar.
```

- [ ] **Passo 3: Registar as migrações novas no README**

Em `supabase/migrations/README.md`, acrescenta à lista, no mesmo formato das anteriores:

```markdown
| `0030_origem_das_limpezas.sql` | `jobs.calendar_id`/`ical_uid` com unicidade parcial; `cleaning_min` na cadeia quarto → alojamento → empresa; `unit_defaults()`. |
| `0031_criar_limpeza.sql` | `create_job()` — a criação manual, `security invoker`. |
| `0032_importacao_ical.sql` | `job_from_ical()`, `job_ical_desaparecidos()`, `aviso_ical()`, `na_semana_em_curso()` — `security definer`, só `service_role`. |
| `0033_calendario_nao_esmagado.sql` | `commit_location_detail` deixa de reescrever `status`/`last_sync`/`imported` dos calendários. |
| `0034_agendador.sql` | `cron.schedule` de hora a hora sobre `net.http_post`, com URL e segredo no Vault. |
```

- [ ] **Passo 4: Correr tudo**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run build && npm run ical-check && npm run rls-check
```

Esperado, as três últimas linhas:
```
Build ALClean concluído: 8 módulos.
Interpretador de iCal correto.
Todas as fronteiras seguras.
```

Cola-as no relatório. Se alguma falhar, **não** escrevas que está feito: corrige e volta a correr.

- [ ] **Passo 5: Confirmar, pela última vez, que nada do utilizador foi tocado**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && node --env-file=.env -e "
import('@supabase/supabase-js').then(async ({ createClient }) => {
  const a = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { count: demo } = await a.from('demo_jobs').select('*', { count: 'exact', head: true });
  const { count: contas } = await a.from('people').select('*', { count: 'exact', head: true }).not('auth_user_id', 'is', null);
  const { data: mater } = await a.from('clients').select('id').eq('name', 'Mater50').maybeSingle();
  const { count: quartos } = await a.from('units').select('*, service_locations!inner(client_id)', { count: 'exact', head: true }).eq('service_locations.client_id', mater?.id ?? '00000000-0000-0000-0000-000000000000');
  const { count: restos } = await a.from('jobs').select('*', { count: 'exact', head: true }).eq('manager_note', 'RLS-CHECK-TESTE');
  console.log({ limpezasDemo: demo, contasComAcesso: contas, quartosDoMater50: quartos, restosDeTeste: restos });
});
"
```

Esperado: `limpezasDemo: 12`, `contasComAcesso: 2`, `quartosDoMater50: 4`, `restosDeTeste: 0`.

`restosDeTeste` diferente de zero quer dizer que o `finally` do `rls-check` não apagou tudo: corrige a limpeza antes de fechar a tarefa.

- [ ] **Passo 6: Commit**

```bash
git add DEPLOY.md supabase/migrations/README.md
git commit -m "docs: como ligar a importação dos calendários, do princípio ao fim"
```

---

## Auto-revisão contra a spec

**1. Cobertura da spec** — secção a secção:

| Secção da spec | Onde é implementada |
|---|---|
| `jobs.source`, `platform`, `stay_date`, `checkin_same_day`, `checkout_time`/`checkin_time` já existentes | Usados como estão em `create_job` (T2) e `job_from_ical` (T5); nenhuma coluna é recriada. |
| Decisão 1 — entrada no mesmo dia é prioritária | `p_checkin_same_day` calculado na Edge Function a partir de `diasDeEntrada` de **todos** os calendários do quarto (T6), gravado por `job_from_ical` (T5); a bolinha vermelha já é desenhada por `isHighPriority`. |
| Decisão 2 — duração por quarto | `units.cleaning_min` → `service_locations.cleaning_min` → `company_settings.default_cleaning_min`, via `unit_defaults` (T1). |
| Decisão 3 — a app nunca apaga sozinha trabalho atribuído ou publicado | Ramos `avisada` de `job_from_ical` e de `job_ical_desaparecidos` (T5), com verificação falsificável no `rls-check`. |
| Decisão 4 — de hora a hora + botão manual | `cron.schedule` ao minuto 7 (T8); botão "Sincronizar agora" (T7). |
| Decisão 5 — criar à mão | `create_job` (T2) + `NewJobDrawer` (T3). |
| Sem tabela de reservas; `(calendar_id, ical_uid)` único | `jobs_ical_uid_idx`, índice parcial (T1), verificado em `rls-check` ("o mesmo evento nunca gera duas limpezas"). |
| Esquema 0030 — colunas, tipos, `on delete set null`, `check 15..600` | T1, passo 2, com revisão explícita no passo 3. |
| `job_from_ical` definer, `create_job` invoker | T5 e T2, com `revoke`/`grant` escritos e verificados. |
| Que eventos contam (lista de exclusão, na dúvida é reserva) | `EXPRESSOES_DE_BLOQUEIO` + `ehBloqueio` (T4), com o caso `"CLOSED - Booking"` a provar que a dúvida cai do lado da reserva. |
| `DTEND` é o dia da saída; `stay_date = DTEND`; `scheduled_on = stay_date` | `lerIcal` devolve `fim` = DTEND (T4); `job_from_ical` usa-o para as duas colunas (T5). |
| Horas: início = saída herdada; fim = início + duração, travado às 23:59 | `job_from_ical` em minutos, com a nota de que `time + interval` dá a volta ao relógio (T5); `endOfCleaning` faz o mesmo no browser (T3). |
| Entrada no mesmo dia olha para **todos** os calendários do quarto | Primeira volta da Edge Function, que junta os `DTSTART` de todos antes de escrever (T6). |
| Horizonte de 90 dias; o passado nunca é tocado | `HORIZONTE_DIAS` e o filtro `ev.fim < hoje` (T6); `p_stay_date < hoje` e `scheduled_on < hoje` em SQL (T5) — as duas pontas, porque o SQL não pode confiar em quem o chama. |
| Tabela de decisões, linha a linha | Os seis ramos de `job_from_ical` + `job_ical_desaparecidos` (T5); todos com verificação em `rls-check`. |
| Avisos só da semana em curso, um por limpeza, substituído | `na_semana_em_curso` e `aviso_ical` com `delete` antes do `insert` (T5). |
| O terceiro tipo de aviso (virada rápida) fica ligado ao da reserva nova | Um só aviso, com o título e o texto a mudarem quando `p_checkin_same_day` é verdadeiro (T5) — não se gera um segundo. |
| `unit_calendars` recebe `status`, `last_sync`, `imported` verdadeiros | T6; e T7 impede que o ecrã do alojamento os apague a seguir. |
| Leitura falhada: `error` e **nada** criado, alterado ou apagado | `falhados` nunca chega à segunda volta, e `job_ical_desaparecidos` só corre depois de uma leitura boa (T6). `imported` fica como estava. |
| Criação manual: painel, herança pré-preenchida, `source='manual'`, ids nulos | T3, com a `stay_date = scheduled_on` garantida pelo servidor (T2). |
| Segurança: definer/invoker, quem chama a função, só `https`, sem rede interna | T2, T5, T6 (`enderecoAceite` com testes) e T6 passo 9 (403 sem sessão). |
| As criadas entram `unpublished` | T2, T5; provado pelos dois lados no `rls-check` (não vê / publicada vê). |
| Verificação: seis ficheiros `.ics`, cada linha da tabela, falha de rede, `rls-check` verde, dados reais intactos | T4 (os seis), T5 (a tabela), T6 (a falha de rede não chega a escrever), T9 (os três comandos verdes e a contagem final). |
| Passos manuais do utilizador | Seis, listados na tabela da secção "Estrutura de ficheiros" e escritos por extenso em T1/5, T2/4, T5/4, T6/9, T7/3, T8/3-4, com o resumo em `DEPLOY.md` (T9). |

Sem lacunas.

**2. Varrimento de espaços por preencher** — não há "TBD", nem "adicionar validação adequada", nem "semelhante à Tarefa N". Cada passo que pede código traz o código. As duas repetições de propósito (o corpo de `commit_location_detail` em T7 e o texto dos passos manuais, primeiro no momento próprio e depois reunido em `DEPLOY.md`) estão escritas por inteiro, e T7 manda expressamente confrontar a reconstrução com o original em `0010` e dar razão ao original.

**3. Consistência de tipos e nomes** — verificado:
- `unit_defaults` devolve sempre `(location_id, team_id, checkout_time, checkin_time, cleaning_min)`, e é assim que T2 e T5 a leem.
- `create_job` tem a mesma ordem de parâmetros em T2 (SQL), em `createJobRow` (T3) e no `rls-check` (T2).
- `job_from_ical(p_calendar, p_uid, p_stay_date, p_checkin_same_day)` é a mesma assinatura em T5, na Edge Function (T6) e no `rls-check`.
- `lerIcal` devolve `{ uid, inicio, fim, resumo, bloqueio }`, e é `ev.fim` (nunca `ev.inicio`) que vai para `p_stay_date`.
- `endOfCleaning(start, cleaningMin)` é exportada de `planeamento/repository.ts` e importada por `NewJobDrawer` com esse nome exato.
- `syncCalendarNow` devolve `{ importadas, erro }`, e é assim que `syncCalendar` a lê.
- `enderecoAceite` devolve `null` quando aceita e uma `string` quando recusa — a mesma convenção em `index.ts` e nos testes.

**Uma nota que o executor tem de ler:** a spec diz que a alteração de uma reserva numa limpeza por publicar e sem ninguém se faz "em silêncio", e diz também que uma alteração na semana em curso gera aviso. Este plano lê "em silêncio" como "sem pedir decisão à gestora" e mantém o aviso quando o dia cai na semana em curso — está escrito no comentário do código e é a leitura que respeita `mensagens.md:15`. Se o utilizador discordar, o que muda é uma condição só, em `job_from_ical`.
