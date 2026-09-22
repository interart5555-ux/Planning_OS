# Caso de estudo — ALClean v1.0

*22 de setembro de 2026. Primeira empresa a sair do template AppOS e a chegar a
produção.*

Este documento descreve o **resultado final**: o que a aplicação faz, como está
construída, que dados guarda, e qual o modelo a seguir nas empresas seguintes.
Não conta o percurso nem as correções pelo caminho — para isso existem
`docs/auditoria-2026-09-19.md` e o registo de execução da Fase 2.

Escrito a partir do estado vivo: o código em `../alclean/app` (ramo
`fase2-backend`) e a base de dados real do projeto Supabase `alclean`,
inspecionados a 22 de setembro de 2026.

---

## 1. O que é

Um sistema de gestão operacional para uma **empresa de limpezas de alojamento
local**, com dois perfis: **gestora** e **colaboradora**.

Oito módulos ligados a dados reais, com autenticação, papéis e proteção ao nível
da linha.

| Módulo | Página | O que faz |
|---|---|---|
| **1 · Empresa** | `module-1-empresa-react` | Nome, morada, contactos, horas por omissão de estadia (check-out/check-in), duração por omissão de uma limpeza, tolerância de duração, deslocações incluídas. Metas de saúde financeira só para consulta, com ligação a Rendimentos. |
| **2 · Equipas** | `module-2-equipas-react` | Colaboradoras e gestoras, equipas com responsável e zonas, ausências (férias, folga, baixa, formação, consulta, indisponibilidade), convites de acesso e suspensão, valor por limpeza e deslocação por limpeza, arquivo em vez de eliminação. |
| **3 · Clientes** | `module-3-clientes-react` | Hierarquia **Cliente → Alojamento → Quarto**, com equipa por omissão, tarifa/hora, horários de estadia, duração por quarto, lavandaria, instruções de acesso e calendários iCal (Airbnb, Booking.com, Outro). |
| **4 · Planeamento** | `module-4-planeamento-react` | Semana × pessoas, cronograma do dia com arrastar e esticar, capacidade mensal, atribuição com deteção de sobreposição e de ausência, publicação do plano, criação manual de limpezas. Vista "O meu dia" para a colaboradora. |
| **5 · Execução** | `module-5-execucao-react` | A app da colaboradora: o dia, o detalhe, a checklist (preparação + tarefas), contagens de lavandaria, fotos, anomalias e atrasos, iniciar e terminar com registo de duração e histórico. |
| **6 · Aprovações** | `module-6-aprovacoes-react` | Revisão das limpezas concluídas: aprovar, pedir correção, reabrir. Auditoria imutável de cada decisão. |
| **7 · Rendimentos** | `module-7-rendimentos-react` | Faturação por cliente, pagamentos, custo de equipa, margem, produtos, metas de saúde financeira. |
| **10 · Mensagens** | `module-10-mensagens-react` | Conversas (equipa, cliente, interna), leitura por pessoa, mensagens agendadas, quadro de avisos, vista "Hoje". |

**Transversal:** autenticação Supabase, papéis, tempo real em 30 tabelas, fotos
em bucket privado, sincronização iCal por Edge Function.

### O que não existe, declarado

- **Inventário (módulo 8) e Serviços ligados (9)** estão desligados nesta
  empresa. O Inventário tem interface em `src/modules/inventario/` mas não tem
  `repository.ts` nem página: não está ligado ao servidor.
- **Nenhuma ação cria faturas.** As tabelas `invoices` e `invoice_payments`
  existem e estão vazias.
- **Não há sincronização iCal automática.** Ver §5.

---

## 2. Arquitetura

**Multi-página, não aplicação de página única.** Cada módulo é um bundle IIFE
próprio, compilado por esbuild a partir de `src/entries/<modulo>.tsx` e servido
como ficheiro HTML independente em `preview/`. A navegação entre módulos é um
salto de página; a sessão sobrevive no `localStorage` da mesma origem.

```
Browser — 8 páginas React 18, Tailwind compilado no build
   │  chave publicável (nunca a service_role)
   ▼
Supabase
   ├─ Postgres + RLS   ← a fronteira de segurança está AQUI
   ├─ RPC (51 funções) — toda a escrita com regra
   ├─ Realtime (30 tabelas publicadas)
   ├─ Storage (bucket privado job-photos)
   └─ Edge Functions: provision-access, sync-calendars (service_role)
```

### Padrão canónico de um módulo

É o que dá consistência ao todo e o que se copia para a empresa seguinte:

```
src/modules/<modulo>/
  types.ts          modelo camelCase do módulo
  rules.ts          regras puras (cálculo, validação, filtros)
  repository.ts     ÚNICA fronteira com o Supabase; traduz snake_case ⇄ camelCase
  use<X>Module.ts   estado (useReducer) + orquestração
  <X>Module.tsx     componente de topo
  components/       ecrãs
  index.ts          barril público
```

### O que está em `src/modules/shared/`

- **`supabase/`** — cliente, `subscribeTable` (um canal por subscrição),
  `useSupabaseData` com guarda de sequência (uma resposta lenta nunca escreve
  por cima de uma mais recente) e agrupamento de rajadas a 120 ms.
- **`auth/`** — `AuthProvider` com estados distintos para "acesso desativado" e
  "falha de ligação": dizer a quem tem acesso que lhe foi retirado é uma mentira
  que a manda falar com a gestora por nada.
- **`ui/`** — kit de componentes, `AppTopBar`, e o mapa de páginas
  (`paginas.ts`), único sítio que sabe o URL de cada secção.
- **`company/`** — módulos ativos: base (1–6) sempre ligada, opcionais (7–9) por
  empresa. Desligar nunca apaga dados.
- **`badges/`, `dates/`**.

### Princípios que o código aplica com rigor

1. **O servidor é a fronteira, não a interface.** Guardas em trigger e políticas
   RLS; a app nunca é a única a dizer não.
2. **Estado derivado nunca é guardado.** "Em atraso", "fatura paga" e o desvio
   de duração são calculados a partir dos factos e do relógio.
3. **Escrita com regra passa por RPC**, não por `PATCH` cru: `save_job`,
   `exec_transition`, `aprov_rever`, `create_job`, `upsert_*`,
   `save_company_settings`.
4. **Integridade do passado vale para toda a gente, incluindo a `service_role`**
   (`people_guard_delete`, `job_assignments_guard_fechada`). É distinta das
   guardas de permissão, que deixam passar os scripts de manutenção de
   propósito.
5. **O build falha em vez de publicar mal.** Valida `SUPABASE_URL` e a chave
   (recusa uma `service_role`) e verifica que o CSS compilado tem mesmo as
   classes da marca.

### Verificação

`npm run typecheck` · `rls-check` (236 verificações de fronteira, com controlos
positivos) · `nav-check` · `ical-check`.

---

## 3. Estrutura de dados

**30 tabelas, 3 vistas, 51 funções. Todas as tabelas com RLS ligado.**

### Núcleo operacional

- `people` — papel `manager|collab`, `access` `none|sent|active|suspended|failed`,
  `team_id`, `archived`
- `teams` · `absences`
- `clients` → `service_locations` → `units` → `unit_calendars`
- **`jobs`** — a tabela central:
  - `status`: `unpublished → planned → confirmed → in_progress → done`
  - `source`: `ical | manual`; `calendar_id` + `ical_uid` na origem iCal
  - `stay_date`, `checkin_same_day` (critério de prioridade alta do Planeamento)
  - `review`: `pending | approved | correction | reopened | archived`
  - `started_at`, `finished_at`, `duration_sec`
- Satélites de `jobs`: `job_assignments` (pessoa + horas), `job_checklist_items`,
  `job_laundry_counts` (planeado / contado / confirmado), `job_photos`,
  `job_issues`, e dois registos **append-only**: `job_events` e
  `job_approval_audit`.

### Dinheiro — separado de propósito

A colaboradora lê `people` e `units` para ver a equipa e o trabalho. Por isso os
valores vivem fora dessas tabelas:

- `people_pay` (valor por limpeza + deslocação por limpeza)
- `unit_rates` / `location_rates` — a tarifa de um quarto é
  `coalesce(unit_rates.hourly_rate, location_rates.hourly_rate)`
- `client_billing` · `invoices` → `invoice_payments` · `team_payments`

### Comunicação

`conversations` → `messages` → `message_reads` / `message_attachments`;
`notices` → `notice_reads`. A leitura é **por pessoa**, não um booleano global.

### Configuração

- `company_settings` — **linha única** (`id boolean check (id)`)
- `exec_checklist_template`, `exec_laundry_template`

### Vistas

- `job_approval_facts` — atraso e desvio de duração calculados
- `job_month_stats`, `person_month_jobs`

### Herança em cascata

O padrão mais próprio deste modelo: `cleaning_min` e os horários de estadia
resolvem-se **quarto → alojamento → empresa**, com `NULL` a significar "herda".

### Tabela obsoleta

`billable_units` está vazia e obsoleta desde `0024`. Nenhum código a lê ou
escreve. Apagá-la é decisão do dono do projeto.

---

## 4. Publicação

- **Código:** GitHub privado, `interart5555-ux/alclean-app`, ramo
  `fase2-backend` (falta juntar ao `main`).
- **Site:** Netlify, build `node build.mjs`, com `SUPABASE_URL` e
  `SUPABASE_ANON_KEY` nas variáveis de ambiente.
- **A `service_role` nunca sai do computador local.** Vive só no `.env`, para os
  scripts de manutenção.
- Guia completo: `DEPLOY.md` no repositório da app.

---

## 5. Dois desalinhamentos entre os ficheiros e o que está vivo

Medidos a 22 de setembro de 2026 contra a base de dados real:

1. **`supabase_migrations.schema_migrations` pára em `0027`**, mas o esquema
   vivo já tem `0028`–`0033` e `0035` (guardas de atribuições, dados da empresa,
   origem das limpezas, criação manual, importação iCal, duração na interface).
   O registo remoto mente; **os ficheiros em `supabase/migrations/` é que são a
   fonte da verdade**, como o `README.md` dessa pasta já avisa. Não correr
   `supabase db push` contra o projeto real sem alinhar primeiro o histórico.
2. **`0034_agendador` não está aplicada.** As extensões `pg_cron` e `pg_net`
   estão desligadas no projeto. Consequência prática: **a sincronização iCal só
   corre quando a gestora a pede**; não há sincronização automática de hora a
   hora. Para a ligar, faltam os pré-requisitos manuais descritos no cabeçalho
   dessa migração (ligar as duas extensões e pôr três segredos no Vault).

---

## 6. O modelo a seguir

**Uma instalação por empresa (single-tenant), com o template como upstream
comum.** Cada empresa = um projeto Supabase + um site Netlify + um fork do
template.

### Porquê, e não o produto único multi-empresa

- **O esquema atual não tem `company_id` em nenhuma das 30 tabelas**, e
  `company_settings` é literalmente uma linha só. Passar a multi-empresa não é
  acrescentar uma coluna: é reescrever todas as políticas RLS, as 51 funções e
  cada `select` dos nove `repository.ts`. É deitar fora a Fase 2 inteira.
- **O isolamento sai de graça.** A pior falha de um sistema multi-empresa — a
  empresa A ver os dados da B — é impossível quando não há base de dados
  partilhada. Para dados de faturação e moradas de clientes, isto vende-se.
- **O procedimento já é este.** `personalizar-empresa` → `personalizar-modulo` →
  `implementar-empresa` termina num fork. O modelo técnico só tem de acompanhar
  o modelo comercial já escolhido.
- **A escala não o exige.** Multi-tenant paga-se a partir de dezenas de
  clientes. Com poucas empresas, o custo por instalação é baixo e o ganho de
  simplicidade é imediato.

### O que fazer para o modelo aguentar a segunda empresa

1. **O template passa a upstream de verdade.** O backend da ALClean — as 35
   migrações, os `repository.ts`, o `shared/`, o `build.mjs`, o `rls-check` —
   tem de voltar para o template genérico. Hoje não voltou nada, e por isso a
   empresa nº 2 recomeçaria do zero.
2. **Tudo o que é ALClean vive em dados, não em código.** `company_settings` já
   lá está; falta tirar do código os `ALCLEAN_MODULOS` fixos em cada
   `src/entries/*.tsx`, o nome nos ecrãs de autenticação, o `#0D9488` no
   `build.mjs` e o prefixo `alclean_` nos segredos.
3. **As migrações são numeradas e partilhadas.** Uma correção de segurança
   aplica-se às N bases de dados por ordem, com o `rls-check` a provar cada uma.
4. **Antes de qualquer empresa nova**, fechar os pendentes da auditoria que se
   replicariam N vezes: autenticação (código de seis dígitos com email
   previsível), RGPD (minimização, retenção, exportação), backups e ambientes
   separados, e os controlos automáticos de qualidade em CI.

> Se um dia o multi-tenant fizer sentido, a porta de entrada é acrescentar
> `company_id` **primeiro no template**, antes de existir a segunda instalação —
> nunca depois.

---

## 7. Documentos relacionados

| Para quê | Ficheiro |
|---|---|
| Ponto de situação das duas frentes | `docs/estado-projeto.md` |
| Recomeçar do zero sem o código atual | `docs/brief-reconstrucao-appos-alclean.md` |
| Achados por nível e decisões pedidas | `docs/auditoria-2026-09-19.md` |
| Lições que mudam o procedimento | `docs/superpowers/melhoria-continua.md` |
| Pôr a app online, passo a passo | `DEPLOY.md` (repositório da app) |
| Como reconstruir a base de dados | `supabase/migrations/README.md` (repositório da app) |
