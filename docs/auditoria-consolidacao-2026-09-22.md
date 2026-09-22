# Auditoria de consolidação — 22 de setembro de 2026

*Âmbito: o sistema completo — o repositório do template (`Planning_OS - V2`), a app da ALClean
(`../alclean/app`, ramo `fase2-backend`), o projeto Supabase `jhwcpaxdlcefglkcmfrg` e a publicação
no Netlify. Pergunta de fundo: se amanhã o computador desaparecer, o que é preciso para recriar
exatamente isto, sem o lixo da prototipagem? A resposta prática está em `REPLICATION_GUIDE.md` e em
`rebuild/`. Este ficheiro é a prova: o que foi verificado, como, e o que se encontrou.*

## 1. Resumo

- **A app está funcional e as fronteiras de segurança aguentam.** Build, verificação de tipos,
  os três testes locais e o teste de segurança contra a base de dados real passaram hoje, todos.
- **A base de dados viva NÃO se reconstrói a partir dos ficheiros de migração.** Provado numa
  instância local: aplicar `0001`→`0035` por ordem falha em `0035` (`SQLSTATE 42723`), porque `0033`
  foi escrita depois de `0035` e cria a mesma função. Além disso, `0034` (agendador iCal) exige passos
  manuais e **nunca foi aplicada ao projeto real**, e o histórico remoto de migrações parou em
  `0027`: `0028` a `0035` foram aplicadas à mão, sem registo.
- **O esquema tem restos identificáveis e removíveis**: uma tabela obsoleta, duas colunas
  substituídas, uma vista que perdeu `security_invoker`, doze funções com `search_path` incompleto,
  uma política de Storage redundante e 26 chaves estrangeiras sem índice.
- **O código tem ~25 ficheiros mortos e muita duplicação**, mas o núcleo (camada de dados, auth,
  escritas, regras no servidor) é sólido e está documentado no próprio código.
- **O repositório do template já não descreve a app**: dos 120 ficheiros de `src/` partilhados,
  114 diferem. O template é hoje um protótipo histórico, mais três skills e a documentação.
- **Recomendação:** não reconstruir. Consolidar no sítio, em três passos pequenos (secção 7), e
  guardar o kit de reconstrução (`rebuild/`) fora do computador. A justificação está na secção 8.

## 2. O que foi verificado hoje, e como

| Verificação | Método | Resultado |
|---|---|---|
| Estado vivo do esquema | `pg_tables`, `pg_policies`, `pg_proc`, `pg_trigger`, `pg_publication_tables`, `storage.buckets`, `vault.secrets`, advisors do Supabase | 34 tabelas, 51 funções, 73 políticas, 19 gatilhos, 3 vistas, 20 enums, 29 tabelas em tempo real, 1 bucket, 0 segredos no Vault |
| Histórico de migrações remoto | `list_migrations` | 29 entradas, última `0027_historico_fechado`; `0028`–`0035` ausentes |
| Extensões | `pg_extension` | `pg_cron` e `pg_net` **não instaladas** → `0034` nunca correu; não há tarefa agendada |
| Reconstrução numa base vazia | `supabase start` local com as 34 migrações (sem `0034`) | **Falha** em `0035`: `function "commit_location_detail" already exists with same argument types` |
| Reconstrução com a ordem corrigida | `0033` aplicada depois de `0035` (renomeada `0036`), `0034` de fora | **Passa.** O esquema obtido tem exatamente os mesmos objetos e corpos que o projeto vivo (só espaços e comentários diferem) |
| Esquema consolidado (`rebuild/db/01`–`03`) | Poda + publicação + sementes aplicadas à instância local; `npm run rls-check` apontado à instância local | **"Todas as fronteiras seguras."** (código de saída 0) sobre a base reconstruída do zero |
| Build | `npm run build` | 8 módulos, CSS compilado, 0 erros |
| Tipos | `npm run typecheck` (strict, `noUnusedLocals`) | 0 erros em 187 ficheiros |
| Navegação por papel | `npm run nav-check` | 12/12 |
| Interpretador iCal | `npm run ical-check` | todos os casos |
| Fronteiras de segurança | `npm run rls-check` contra o projeto real | "Todas as fronteiras seguras." (código de saída 0) |
| Dependências | `npm audit --omit=dev`, `npm outdated` | 0 vulnerabilidades; nada desatualizado dentro da linha fixada (React 18, Tailwind 3, TS 5.6) |
| Código morto e duplicação | agente de leitura ao nível do símbolo (os `index.ts` são *barrels* e mascaram a alcançabilidade por ficheiro) | secção 4 |
| Linhagem das 35 migrações | agente de leitura, ficheiro a ficheiro | secção 5 |

## 3. Repositório do template (`Planning_OS - V2`)

### 3.1 Lixo e ficheiros fora do sítio

| Item | O que é | Ação |
|---|---|---|
| `ergoform-codex-pack/` e `ergoform-codex-pack.zip` | Pack de contexto de **outro projeto** (Ergoform), por acaso guardado aqui, não versionado | Mover para `../5_ErgoApp/` e apagar daqui |
| `docs/contexto-entrepostos-codex.md`, `docs/contexto-formacao-codex.md` | Também Ergoform (894 + 444 linhas), não versionados | Mover para `../5_ErgoApp/docs/` |
| `raw/` (12 MB de PNG) e `preview/` (26 ficheiros, 3 MB) | Mockups e protótipos HTML/JS da Fase 1 do template, versionados | Manter só como histórico ou mover para uma *release* do GitHub; não fazem parte do produto |
| `supabase/.temp/linked-project.json` | Este repositório ficou **ligado ao projeto Supabase da ALClean** por engano (é o repositório do template, sem migrações) | Apagar a pasta `supabase/`; a ligação pertence a `alclean/app` |
| `.worktrees/` (vazia), `.DS_Store` | Resíduo | Apagar |
| `.superpowers/sdd/2026-09-18-alclean-fase2-backend/` (42 ficheiros, 528 KB) | Registo de execução da Fase 2 (briefs, relatórios, diffs), ignorado pelo git | Está fora do git: se o computador desaparecer, desaparece. Guardar uma cópia se tiver valor histórico; **contém a password temporária referida na auditoria de 19/09** — confirmar que foi rodada |
| 8 documentos não versionados em `docs/` | Auditoria de 19/09, brief de reconstrução, estado do projeto, caso de estudo, resumo de melhorias | **Fazer commit.** São os documentos que dão sentido ao repositório |

### 3.2 O `src/` do template está morto

`diff -rq src ../alclean/app/src`: 114 ficheiros diferem, 6 só existem na ALClean, 0 iguais com
conteúdo relevante. Nada do backend voltou para o template (é o que `docs/estado-projeto.md` já
dizia). Consequência: qualquer segunda empresa partiria do protótipo sem servidor, e não do código
provado. A decisão "produto único vs. cópia por empresa" (auditoria de 19/09, ainda em aberto) é o
que determina o destino desta pasta; até lá, é o ponto mais enganador do repositório.

## 4. App ALClean — código

### 4.1 Ficheiros e símbolos mortos (não compilados ou inalcançáveis)

| Onde | O quê | Prova |
|---|---|---|
| `src/modules/inventario/` (~20 ficheiros) | Módulo inteiro; não há `entries/inventario.tsx`, `build.mjs` não o compila, `InventoryProvider` nunca é montado | As duas pontes (`execucao/ProductsSection.tsx:50`, `clientes/LocationDetail.tsx:62`) estão atrás de `modulos.inventario`, que é `false` nas 8 entradas. Ainda assim os *barrels* arrastam-no para os bundles de Clientes e Execução |
| `src/modules/onboarding/` | `CompanyOnboarding.tsx`, `useCompanyOnboarding.ts`, `validateOnboarding` | Só 3 funções de `validation.ts` (`isValidNIF`, `isValidContact`, `formatContact`) e um tipo são usados fora |
| `mockData.ts` em aprovacoes, execucao, planeamento, clientes, equipas | 5 ficheiros sem um único consumidor (só o reexport do `index.ts`) | `inventario/mockData.ts` é usado, mas pelo módulo morto |
| `shared/company/GerirModulosDialog.tsx` | Órfão | Só se usa a si próprio |
| `shared/company/modulosAtivos.tsx` | `useModulosState`, `modulosDoParametro` | Zero referências; comentário diz "para pré-visualizações" |
| `rendimentos/rules.ts` | 5 funções exportadas nunca chamadas de fora (`unitMonth`, `clientMonthRevenue`, `totalBilledJobs`, `sumTotals`, `periodsFor`) | |
| `aprovacoes/rules.ts` | `occurrenceCodes`, `OccurrenceCode` | **Atenção:** o `rls-check` compila `rules.ts` e compara os códigos de ocorrência com o servidor. Confirmar antes de apagar |
| `.superpowers/t14/` (3 ficheiros, 439 linhas) | Harness descartável da Task 14 | Fora do git; apagar |
| `../alclean/copia-seguranca-2026-09-21/` | Exportação JSON de todas as tabelas (184 KB) | Cópia de segurança pontual, fora do git. Guardar fora do computador ou apagar; não é um mecanismo de backup |

### 4.2 Duplicação (a partilha parou a meio)

- `shared/dates/` só exporta 3 funções; `pad`, `addDays`, `plural` (7 cópias), `MON3` (4 cópias),
  `timeOf` (4 cópias com **três semânticas diferentes**), `lowerFirst` (4), `initials` (2) vivem
  repetidos em `aprovacoes/dates.ts`, `execucao/dates.ts`, `planeamento/dates.ts` e nos `format.ts`.
- 7 ficheiros `components/parts.tsx` (1 204 linhas) reimplementam `Avatar`, `StatusPill`,
  `PageHeader`, `Panel`, `EmptyState`… que `shared/ui/ui.tsx` já tem. `inventario/parts.tsx` e
  `rendimentos/parts.tsx` são quase iguais.
- `shared/supabase/escritas.ts::escrever()` foi criado para unificar as escritas e só 3 dos 9
  `repository.ts` o usam. O helper `falhou()` está escrito 4 vezes com assinaturas diferentes (em
  `execucao` sem `?? []`, em `rendimentos` com os argumentos invertidos). A cache de URLs assinados
  está copiada literalmente em `aprovacoes/repository.ts` e `execucao/repository.ts`.
- `LATE_AFTER_MIN = 10` existe em `execucao/config.ts` **e** `mensagens/rules.ts`; o servidor tem a
  sua própria cópia em `aprov_margem_atraso_min()`. Uma constante de negócio em três sítios.

### 4.3 Tipagem e higiene

- 104 linhas com `any`, **todas** em `src/modules/*/repository.ts`: a fronteira com o Supabase não
  tem tipos. Os tipos gerados (`supabase gen types`) não são usados.
- 0 `@ts-ignore`, 0 `console.log` em `src/`, 0 TODO reais. 1 `eslint-disable` sem ESLint instalado.
- Comentários desatualizados em `tsconfig.json` (fala de 183 ficheiros e um aviso; são 187 e zero).
- `scripts/README.md` documenta 3 dos 6 scripts (`nav-check`, `ical-check`, `janela-prevista` ficam
  de fora); `DEPLOY.md` diz que `0028` está por aplicar (está aplicada) e nada diz de `0029`–`0035`.
- `netlify.toml` tem cabeçalhos de segurança mas **sem `Content-Security-Policy`**, numa app que
  guarda o JWT em `localStorage`.

### 4.4 Dependências

| Pacote | Fixado | Última | Decisão |
|---|---|---|---|
| react / react-dom | 18.3.1 | 19.3 | Manter 18 (a app usa `createRoot` e nada de 19) |
| tailwindcss | 3.4.19 | 4.3 | Manter 3 (justificado em `tailwind.config.js`: a v4 muda a paleta) |
| typescript | 5.6.3 | 7.0 | Subir dentro da 5.x é seguro; 7 é outra linha |
| esbuild | 0.24.2 | 0.28 | Subir é seguro |
| @supabase/supabase-js | 2.116.0 | — | Atual |
| Node | 22 (`.node-version`, Netlify) | máquina local corre 24 | Coerente; ambos ≥ 22 |

Nenhuma dependência obsoleta ou vulnerável. `@types/node` em código de browser existe só para
`process.env` no cliente Supabase (substituído pelo esbuild).

## 5. Base de dados

### 5.1 Deriva entre os ficheiros e o projeto vivo

1. **Histórico remoto parado em `0027`.** `0028`–`0033` e `0035` foram aplicadas pelo SQL Editor (os
   objetos existem: `job_assignments_guard_update`, `company_settings.name`, `cleaning_min`,
   `create_job`, `job_from_ical`, `save_company_settings` com 9 argumentos). `supabase db push`
   contra o projeto real tentaria reaplicar tudo.
2. **`0034` nunca aplicada.** Sem `pg_cron`, sem `pg_net`, sem os três segredos no Vault. A
   importação iCal de hora a hora **não está a correr**; só o botão "Sincronizar agora" funciona.
3. **Colisão `0033`/`0035`** (provada localmente): `0035` faz `drop`+`create` de
   `commit_location_detail` com 14 argumentos; `0033`, escrita depois mas numerada antes, já cria
   essa assinatura com `create or replace`. Por ordem numérica, `0035` rebenta. A definição boa é a de
   `0033`.
4. **Sementes dentro de migrações**: `0016` insere os 11 itens da checklist e os 5 da roupa (rótulos
   de interface); `0025` insere em `demo_jobs` a partir de um `like '[DEMO]%'` sobre texto — só faz
   sentido contra a base que existia nesse dia.
5. `README.md` das migrações diz "0001 → 0029" e não conhece `0030`–`0035`.

### 5.2 Objetos obsoletos, redundantes ou incoerentes

| Objeto | Problema | Prova | Poda |
|---|---|---|---|
| `billable_units` | Obsoleta desde `0024`; comentário na tabela diz-o | Nenhum código a lê ou escreve (`rendimentos/repository.ts:12`, `seed.mjs:283` confirmam) | `drop table` |
| `notices.read`, `notices.dismissed` | Substituídas por `notice_reads` (`0019`) e nunca apagadas | A app lê e escreve só `notice_reads` (`mensagens/repository.ts:70,286`) | `drop column` |
| `job_month_stats` | Recriada em `0026` sem `with (security_invoker = true)`; o advisor assinala-a como *security definer view* | Advisor `security_definer_view` (ERROR) | `alter view … set (security_invoker = true)` |
| 12 funções `invoker` | `set search_path = public` sem `pg_temp` (`upsert_person`, `upsert_client`, `upsert_location`, `commit_location_detail`, `save_company_settings`, `exec_add_photo`, `exec_add_issue`, `exec_insert_events`, `messages_autoria`, `marcar_conversa_lida`, `criar_conversa`, `enviar_mensagem`) | `pg_proc.proconfig` | uniformizar |
| `jobs.reopen_to` | Texto livre que só aceita `'Planeado'`/`'Em curso'`, validado só dentro de `aprov_rever` | | `check` constraint |
| `review_state.'archived'` | Valor de enum que nada escreve | | Não se remove (limitação do Postgres); documentado |
| Política Storage `"fotos: gestora vê tudo"` | Contida em `"fotos: gestora gere tudo"` (`for all`) | `pg_policies` schema `storage` | `drop policy` |
| `jobs.platform` (texto) | Cópia desnormalizada de `unit_calendars.platform` (enum) | Mostrada no Planeamento; sobrevive ao apagar do calendário | **Manter**, de propósito |
| `demo_jobs` | Tabela só de `service_role`, RLS sem políticas (advisor INFO) | Usada por `scripts/demo-jobs.mjs` | Manter |
| 26 FKs sem índice | Advisor de desempenho | Irrelevante ao volume atual (42 limpezas) mas gratuito | Índices nos caminhos quentes |
| 41 tabelas com duas políticas permissivas (`manager_all` + `collab_*`) | Advisor de desempenho (WARN) | É o desenho: gestora vê tudo, colaboradora vê o seu | Aceitar; documentar |
| 7 funções `security definer` executáveis por `authenticated` | Advisor (WARN): `is_manager`, `current_person_id`, `my_team_id`, `assigned_to_me`, `conversa_criada_por_mim`, `participo_na_conversa`, `exec_transition` | As seis primeiras só devolvem factos sobre o próprio chamador; `exec_transition` verifica atribuição e é a porta única | Aceitar; documentar |
| Leaked password protection desligada | Advisor (WARN) | Definição do Auth | Ligar no painel |

### 5.3 O que está bem e não se toca

- Dinheiro em tabelas próprias (`people_pay`, `unit_rates`, `location_rates`), fora do que a
  colaboradora lê. Guardas por gatilho em `jobs`, `job_assignments`, `people`, checklist e roupa.
- Uma só tabela `jobs` com estado operacional e de revisão separados; "em atraso" calculado.
- Transições e aprovação automática decididas no servidor (`exec_transition`, `aprov_ocorrencias`),
  com marcadores de transação (`alclean.fluxo_execucao`, `alclean.fluxo_aprovacao`).
- Histórico só de acrescentar (`job_events`, `job_approval_audit`); `revoke truncate` a `anon` e
  `authenticated`; nenhuma RPC executável por `anon` (verificado com `has_function_privilege`).
- 236 verificações de segurança que sabem falhar, incluindo controlos positivos.

## 6. Lista priorizada

Pontuação: (Impacto + Risco) × (6 − Esforço), 1–5 cada.

| # | Item | Imp. | Risco | Esf. | Prio. | Justificação |
|---|---|---|---|---|---|---|
| 1 | Guardar o kit de reconstrução fora do computador (`rebuild/`, `REPLICATION_GUIDE.md`, commit dos docs, push dos dois repositórios) | 5 | 5 | 1 | **50** | É a única defesa contra o cenário da pergunta. Hoje 8 docs e 42 ficheiros de registo não estão no git |
| 2 | Alinhar as migrações: renumerar `0033`→`0036`, registar `0028`–`0036` no histórico remoto (`supabase migration repair`), atualizar o README | 4 | 5 | 1 | **45** | Sem isto a base não se reconstrói e `db push` é perigoso |
| 3 | Aplicar `0034` (ligar `pg_cron`/`pg_net`, 3 segredos no Vault) | 5 | 3 | 2 | **32** | A importação iCal automática, funcionalidade central, está desligada em produção |
| 4 | Poda do esquema (`rebuild/db/poda-projeto-atual.sql`) + `rls-check` | 3 | 3 | 1 | **30** | Fecha o advisor ERROR e remove o que já não existe no código |
| 5 | Apagar código morto (`inventario/`, `onboarding/` parcial, 5 `mockData.ts`, `GerirModulosDialog`, `t14/`) | 3 | 2 | 2 | **20** | Menos ~25 ficheiros nos bundles; menos confusão para quem lê |
| 6 | Uniformizar escritas: todos os `repository.ts` com `escrever()` e `mensagemDaFalha()` | 3 | 3 | 3 | **18** | Hoje uma recusa de RLS em Mensagens/Rendimentos/Empresa não diz "Não tens permissão" |
| 7 | Tipos gerados do Supabase nos `repository.ts` (elimina os 104 `any`) | 3 | 3 | 3 | **18** | Uma coluna renomeada só rebenta em uso |
| 8 | Consolidar `dates`/`format`/`parts` em `shared/` | 2 | 2 | 3 | **12** | Qualidade; sem risco funcional |
| 9 | `Content-Security-Policy` no Netlify; ligar leaked-password protection | 2 | 3 | 2 | **20** | Barato; a app guarda um JWT em `localStorage` |
| 10 | Arrumar o template: mover Ergoform, apagar `supabase/`, decidir `preview/` e `raw/` | 2 | 1 | 1 | **15** | Higiene; evita ligar o repositório errado ao projeto |
| 11 | Decidir "produto único vs. cópia por empresa" antes da segunda empresa | 5 | 4 | 5 | **9** | O esforço é o de uma refundação; não é remediação, é estratégia (auditoria de 19/09) |

## 7. Plano faseado

**Fase 0 — hoje (1 hora, sem tocar em código):** item 1. Fazer commit e push dos dois repositórios
com `REPLICATION_GUIDE.md`, `rebuild/`, os 8 docs e este ficheiro. Guardar `.superpowers/` e
`copia-seguranca-2026-09-21/` num arquivo fora do computador se tiverem valor.

**Fase 1 — base de dados (meio dia):** itens 2, 3, 4, por esta ordem, cada um seguido de
`npm run rls-check`. A poda é reexecutável e não toca em dados de negócio.

**Fase 2 — código (1 a 2 dias, um commit por passo):** itens 5, 6, 7, 9. Depois de cada passo:
`typecheck`, `build`, `nav-check`, `ical-check`. O item 8 só se sobrar tempo.

**Fase 3 — template (1 hora):** item 10. E juntar `fase2-backend` ao `main` da ALClean, que já
foi testado no site.

**Depois:** item 11, com a segunda empresa à vista.

## 8. Reconstruir do zero ou consolidar no sítio?

A pergunta foi feita de forma direta e merece resposta direta: **consolidar no sítio.**

O que uma reconstrução a partir do guia daria de melhor do que o repositório atual:

| Aspeto | Reconstruída do guia | Atual, depois das fases 1–2 |
|---|---|---|
| Esquema | 4 ficheiros SQL limpos em vez de 35 migrações com correções em cascata | O mesmo estado final (é de onde o esquema limpo foi extraído), mais as 35 migrações como história |
| Código morto | Não nasce | Apagado em meio dia |
| Duplicação | Só se o guia for seguido à letra e alguém escrever o `shared/` primeiro | Continua até se fazer o item 8 |
| Tipos na fronteira com a base | Só se for feito desde o início | Item 7 |
| Histórico | Perdido: 93 commits com o porquê de cada regra, e as 35 migrações que são a melhor documentação de segurança do projeto | Mantido |
| Risco | Reescrever 30 000 linhas que hoje passam 236 verificações de segurança sem um teste de regressão da interface | Cada passo é verificável com os testes que já existem |
| Custo | Semanas | 2 a 3 dias |

O que faz o repositório atual valer mais do que o guia: o próprio código explica cada decisão
(cada migração começa por dizer o que corrige e porquê; `build.mjs` conta o incidente que o motivou),
e as verificações que provam que funciona existem e passaram hoje. Um *clean install* deitaria fora
exatamente isso, para ganhar o que a poda e dois dias de limpeza dão sem perder nada.

Há um caso em que a resposta muda: se a decisão do item 11 for **produto único multi-empresa**, aí a
base muda de forma (`company_id` em tudo, configuração por empresa, uma só aplicação com navegação
interna). Isso é uma refundação, e nesse dia o `REPLICATION_GUIDE.md` e o esquema consolidado são o
ponto de partida certo, não o repositório com as 35 migrações. Até lá, o guia é seguro de vida, não
plano de obra.
