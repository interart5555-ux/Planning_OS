# REPLICATION_GUIDE — Reconstruir a ALClean (AppOS) do zero

*Versão de referência: `alclean-app` commit `2aa3775` (ramo `fase2-backend`, 22/09/2026) e
`Planning_OS` commit `906182b`. Escrito para um engenheiro ou agente de código que nunca viu o
projeto. Nenhuma credencial está aqui, nem deve estar.*

**Guardar uma cópia deste ficheiro e da pasta `rebuild/` fora do computador.** Com eles, o acesso
ao GitHub e ao Supabase, e este guia, reconstrói-se o sistema. Sem eles, reconstrói-se a partir da
documentação (`docs/brief-reconstrucao-appos-alclean.md`) mas com semanas de trabalho.

---

## 0. Como usar este guia

Há dois cenários, e o segundo só se usa se o primeiro for impossível:

| Cenário | Quando | Tempo | Secção |
|---|---|---|---|
| **A — Recuperação** | Os dois repositórios ainda existem no GitHub (o normal: estão lá desde 18/09) | 1 hora | §2 |
| **B — Reconstrução** | Os repositórios desapareceram ou decidiu-se recomeçar num repositório limpo | dias | §3 e seguintes |

Em qualquer dos dois, o projeto Supabase pode ser o atual (`jhwcpaxdlcefglkcmfrg`) ou um novo. Um
novo reconstrói-se com `rebuild/db/` em 15 minutos (§6). Os dados de negócio (pessoas, clientes,
limpezas) não estão em lado nenhum deste kit: vêm de um *backup* do Supabase ou entram pela app.

---

## 1. O sistema numa página

**O que é:** uma aplicação de gestão para a ALClean, empresa de limpezas de alojamento local.
Duas pessoas-tipo: a **gestora** (planeia, atribui, aprova, fatura) e a **colaboradora** (executa
no telemóvel). Oito módulos: Empresa, Equipas, Clientes, Planeamento, Execução, Aprovações,
Rendimentos, Mensagens. Inventário e Serviços ligados foram recusados pela empresa e não se
constroem.

**De que é feito:**

| Peça | Tecnologia | Onde vive |
|---|---|---|
| Interface | React 18 + TypeScript, 8 páginas HTML estáticas com um bundle IIFE cada (esbuild), Tailwind 3 compilado no build | repositório `interart5555-ux/alclean-app` (privado), pasta `preview/` + `src/` |
| Dados, regras, segurança | Supabase: Postgres 17 com RLS, funções e gatilhos; Auth; Realtime; Storage | projeto `alclean` (eu-west-1) |
| Contas das colaboradoras | Edge Function `provision-access` (Deno) | `supabase/functions/` |
| Importação de reservas | Edge Function `sync-calendars` (Deno) + `pg_cron` de hora a hora | `supabase/functions/`, migração `0034` |
| Publicação | Netlify, build automático a cada push do ramo publicado | `netlify.toml`, `DEPLOY.md` |
| Procedimento e documentação | Skills `/personalizar-empresa`, `/personalizar-modulo`, `/implementar-empresa`; brief de reconstrução; auditorias | repositório `interart5555-ux/Planning_OS` (este) |

**Não há servidor próprio.** O browser fala diretamente com o Supabase; quem protege os dados é o
RLS e as funções no Postgres. A chave `service_role` nunca sai do `.env` local e só a usam os
scripts de manutenção e as Edge Functions (que a recebem do próprio Supabase).

---

## 2. Cenário A — Recuperação (1 hora)

Pré-requisitos: Node 22 ou superior, Docker (só para reconstruir a base localmente), Supabase CLI
(`brew install supabase/tap/supabase`, testado com 2.116), `git`, acesso ao GitHub e ao painel do
Supabase.

```sh
# 1. Os dois repositórios, lado a lado (o procedimento assume esta disposição)
mkdir -p "Sandbox" && cd "Sandbox"
git clone git@github.com:interart5555-ux/Planning_OS.git "Planning_OS - V2"
mkdir alclean && git clone git@github.com:interart5555-ux/alclean-app.git alclean/app
cd alclean/app && git checkout fase2-backend   # ou main, depois da junção

# 2. Dependências (versões exatas pelo package-lock.json)
npm ci

# 3. Variáveis locais (nunca no git)
cp .env.example .env
#   SUPABASE_URL           = Project Settings → API → Project URL
#   SUPABASE_ANON_KEY      = a chave publicável (sb_publishable_… ou o JWT anon)
#   SUPABASE_SERVICE_ROLE_KEY = a chave secreta, só para scripts (seed, rls-check, demo)

# 4. Ligar ao projeto Supabase (para deploy das funções)
supabase link --project-ref jhwcpaxdlcefglkcmfrg

# 5. Confirmar que tudo bate certo
npm run typecheck && npm run build && npm run nav-check && npm run ical-check
npm run rls-check          # tem de acabar em "Todas as fronteiras seguras."

# 6. Se as Edge Functions tiverem desaparecido do projeto
supabase functions deploy provision-access
supabase functions deploy sync-calendars
#   e definir os segredos da §7

# 7. Publicação: seguir DEPLOY.md (Netlify lê netlify.toml; só precisa de 2 variáveis)
```

A pasta `alclean/perfil-empresa.md` e `alclean/modulos/*.md` (perfil e decisões validadas por
módulo) não estão em nenhum repositório: estão em `docs/brief-reconstrucao-appos-alclean.md`,
Parte C, que é a cópia autoritativa desde 19/09.

---

## 3. Cenário B — O prompt de reconstrução

Copiar o bloco abaixo para uma conversa nova com um agente de código, dentro de uma pasta vazia
que contenha este ficheiro e `rebuild/`. Substituir só o que está entre parênteses retos.

```text
Vamos reconstruir do zero a aplicação ALClean (AppOS), uma app de gestão para uma empresa
de limpezas de alojamento local. O guia completo está em REPLICATION_GUIDE.md nesta pasta;
lê-o inteiro antes de qualquer ação, e trata-o como fonte de verdade. A pasta rebuild/db/
tem o esquema final da base de dados, já limpo e verificado; não o redesenhes.

Regras de trabalho:
- Português de Portugal em toda a interface, comentários e documentos (nunca "usuário",
  "equipe", "faturamento"). Código e identificadores em inglês.
- Nenhuma credencial em ficheiros versionados, documentos ou registos. O .env fica fora
  do git. A chave service_role nunca entra no bundle nem no Netlify.
- Nunca guardar nem mostrar códigos ou chaves de acesso a alojamentos (regra de segurança
  da empresa).
- Cada regra de negócio da secção 9 do guia é obrigatória; cada padrão da secção 10 é a
  forma validada de a implementar. Em caso de dúvida, a regra ganha ao padrão, e ambos
  ganham a qualquer preferência tua.
- Trabalha por pedaços com verificação no fim de cada um (secção 11): tipos, build,
  nav-check, ical-check e rls-check verdes antes de avançar. Um pedaço sem verificação
  não está feito.
- Antes de qualquer integração externa (Supabase, Netlify, iCal), faz um teste real de
  cinco minutos e só depois planeias.
- Faz-me perguntas quando uma decisão for de produto (o que a app faz) e decide sozinho
  quando for de implementação (como faz), dizendo o que decidiste.

Ordem de execução:
1. Fundação (secções 4 e 5): estrutura de pastas, package.json exato, tsconfig, build.mjs,
   tailwind, netlify.toml, .gitignore, .env.example. Confirma git iniciado e um remoto
   privado previsto (pergunta-me o nome).
2. Base de dados (secção 6): projeto Supabase [novo | existente: jhwcpaxdlcefglkcmfrg],
   aplicar rebuild/db/01, 02, 03; configuração manual do Auth; só depois 04.
3. Camada partilhada (secção 10): cliente Supabase, useSupabaseData, escritas.ts,
   realtime, relógio Europe/Lisbon, AuthProvider + LoginScreen, kit de UI.
4. Edge Functions (secção 7) e scripts de verificação (secção 11), com o rls-check a
   passar contra a base vazia antes de haver ecrãs.
5. Módulos, um de cada vez, cada um com repository.ts + hook + componentes, por esta
   ordem: Empresa → Equipas → Clientes → Planeamento → Execução → Aprovações →
   Mensagens → Rendimentos. Parar no fim de cada um para eu testar.
6. Publicação (secção 12) e critério de pronto (secção 11).

Começa por me confirmar, em dez linhas, o que percebeste do sistema e o que vais fazer
primeiro.
```

---

## 4. Estrutura de pastas recomendada (limpa)

A estrutura atual, menos o que a auditoria de 22/09 identificou como morto. Um ficheiro por
responsabilidade; um módulo por pasta; nada partilhado dentro de um módulo.

```
alclean-app/
├── .env.example            # SUPABASE_URL, SUPABASE_ANON_KEY (+ SERVICE_ROLE só local)
├── .gitattributes          # *.ics -text  (CRLF obrigatório pela RFC 5545)
├── .gitignore              # node_modules/ preview/*.js preview/app.css .env supabase/.temp/
├── .node-version           # 22
├── package.json  package-lock.json  tsconfig.json  tailwind.config.js
├── build.mjs               # valida as variáveis, compila CSS e os 8 bundles
├── netlify.toml            # build, publish=preview, NODE_VERSION=22, cabeçalhos de segurança
├── DEPLOY.md               # publicação passo a passo
├── preview/                # as 8 páginas HTML (versionadas) + favicon.svg; app.css e *.js gerados
│   ├── index.html                       # índice dos módulos
│   ├── module-1-empresa-react.html      … module-7-rendimentos-react.html
│   └── module-10-mensagens-react.html
├── src/
│   ├── entries/            # um ficheiro por módulo: monta Providers + o módulo; 8 ficheiros
│   ├── styles/app.css      # @tailwind base/components/utilities
│   └── modules/
│       ├── shared/
│       │   ├── supabase/   # client.ts, useSupabaseData.ts, escritas.ts, realtime.ts, sessionCache.ts
│       │   ├── auth/       # AuthProvider.tsx, LoginScreen.tsx, entrada.ts
│       │   ├── dates/      # relogio.ts (hojeLocal, agoraLocal, carimboLocal) + os helpers hoje repetidos
│       │   ├── ui/         # ui.tsx (kit), AppTopBar.tsx, Icon.tsx, paginas.ts
│       │   ├── company/    # modulosAtivos.tsx, ModuloInativo.tsx, nomeEmpresa.ts
│       │   └── badges/     # contadores da barra de topo
│       ├── empresa/  equipas/  clientes/  planeamento/  execucao/  aprovacoes/  mensagens/  rendimentos/
│       │   # cada um: index.ts, <Nome>Module.tsx, use<Nome>Module.ts, repository.ts, types.ts,
│       │   #          rules.ts (funções puras), config.ts (rótulos), components/
│       └── validation/     # isValidNIF, isValidContact, formatContact (o que sobra de onboarding/)
├── scripts/
│   ├── README.md           # descreve os 6 scripts
│   ├── seed.mjs  demo-jobs.mjs  rls-check.mjs  janela-prevista.mjs  nav-check.mjs  ical-check.mjs
│   └── fixtures/ical/*.ics
└── supabase/
    ├── config.toml         # gerado por `supabase init`
    ├── migrations/         # começa com os 4 ficheiros de rebuild/db (ver §6.4)
    └── functions/
        ├── provision-access/index.ts
        └── sync-calendars/{index,sincronizar,descarregar,enderecos,ical}.ts + README.md
```

**Não recriar:** `src/modules/inventario/` (módulo recusado, nunca compilado), `onboarding/`
(exceto as 3 validações), os `mockData.ts`, `GerirModulosDialog.tsx`, `useModulosState`,
`modulosDoParametro`, `.superpowers/`, `preview/*.js` gerados.

---

## 5. Stack e versões exatas

`package.json` (copiar tal e qual; `npm ci` fixa o resto pelo `package-lock.json`):

```json
{
  "name": "alclean-app",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node --env-file-if-exists=.env build.mjs",
    "typecheck": "tsc -p tsconfig.json",
    "seed": "node --env-file=.env scripts/seed.mjs",
    "rls-check": "node --env-file=.env scripts/rls-check.mjs",
    "nav-check": "node scripts/nav-check.mjs",
    "ical-check": "node scripts/ical-check.mjs",
    "demo:criar": "node --env-file-if-exists=.env scripts/demo-jobs.mjs --criar",
    "demo:remover": "node --env-file-if-exists=.env scripts/demo-jobs.mjs --remover"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.116.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "22.9.0",
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "esbuild": "^0.24.0",
    "postcss": "^8.5.28",
    "tailwindcss": "^3.4.19",
    "typescript": "5.6.3"
  }
}
```

| Componente | Versão | Porquê fixa |
|---|---|---|
| Node | 22 (`.node-version`, `NODE_VERSION` no Netlify) | supabase-js exige ≥ 22; a máquina de desenvolvimento corre 24 |
| React | 18.3.1 | A app não usa nada de 19 |
| Tailwind | 3.4.x | A v4 muda a paleta e o preflight; a cor da marca entra como valor arbitrário `bg-[#0D9488]` |
| TypeScript | 5.6.3, `strict`, `noUnusedLocals`, `noEmit` | Só verificação; quem compila é o esbuild |
| esbuild | 0.24.x | IIFE minificado, `jsx: automatic`, `define` das duas variáveis |
| Supabase CLI | 2.116 | `link`, `functions deploy`, `db dump` |
| Postgres | 17 (imagem `supabase/postgres:17.6.1`) | O do projeto |
| Deno | o do Supabase Edge Runtime; `jsr:@supabase/supabase-js@2` nas funções | |

`tsconfig.json`, `tailwind.config.js`, `build.mjs` e `netlify.toml` copiam-se do repositório; os
quatro têm o porquê de cada opção em comentário. O essencial de `build.mjs`: recusa compilar se
`SUPABASE_URL` não for `https:`, se a chave for secreta (`sb_secret_` ou JWT `service_role`) ou
sem forma de chave; compila `src/styles/app.css` com PostCSS+Tailwind e exige que 7 classes
(incluindo a cor da marca) existam no resultado; compila `src/entries/<modulo>.tsx` para
`preview/module-N-<modulo>-react.js`.

---

## 6. Base de dados

### 6.1 Ordem de aplicação num projeto novo

```sh
# Projeto criado no painel (região eu-west-1, Postgres 17). Depois, no SQL Editor ou com
# psql "$DB_URL" -f <ficheiro>, por esta ordem:
rebuild/db/01_esquema_publico.sql        # esquema public completo (tabelas, funções, RLS, gatilhos, vistas)
rebuild/db/02_tempo_real_e_storage.sql   # publicação supabase_realtime (29 tabelas), bucket job-photos, 4 políticas
rebuild/db/03_sementes_estruturais.sql   # company_settings (1 linha), modelos da checklist (11) e da roupa (5)
# --- pré-requisitos manuais (6.2) ---
rebuild/db/04_agendador_ical.sql         # pg_cron de hora a hora → sync-calendars; lê o Vault, pára se faltar algo
```

Alternativa com histórico limpo: copiar `01`, `02`, `03` para `supabase/migrations/` como
`20260922000001_esquema_publico.sql`, `…0002_tempo_real_e_storage.sql`, `…0003_sementes.sql` e
correr `supabase db push`; `04` fica como `…0004_agendador.sql` e só se empurra depois de 6.2.

### 6.2 Configuração manual do projeto (não há API para tudo)

| Onde | O quê | Porquê |
|---|---|---|
| Authentication → Providers → Email | Confirmar email **desligado** para contas criadas pela API; **desligar o registo público** (Sign-ups) | As contas são criadas pela gestora via `provision-access` com `email_confirm: true`; o domínio `@alclean.local` não recebe email |
| Authentication → URL Configuration | Site URL = endereço do Netlify; Redirect URLs = `https://<site>.netlify.app/**` e `http://localhost:*/**` | Sem isto a entrada falha em silêncio |
| Authentication → Password | Ligar *leaked password protection* | Advisor do Supabase |
| Database → Extensions | Ligar `pg_cron` e `pg_net` | Exigidos por `04` |
| Vault (Project Settings → Vault) | `alclean_functions_url` = `https://<ref>.supabase.co/functions/v1/sync-calendars`; `alclean_cron_segredo` = texto aleatório longo; `alclean_chave_publicavel` = a chave publicável | `04` lê-os a cada execução; nunca a `service_role` |
| Edge Functions → Secrets | ver §7 | |
| Conta da gestora | Criar pela API de administração (`auth.admin.createUser`, `email_confirm: true`) e inserir a linha em `people` com `role='manager'`, `access='active'`, `auth_user_id` | Não há registo público; a primeira gestora é a única conta criada à mão |

### 6.3 O modelo de dados em uma página

Tudo ligado por `uuid`, nunca por nome. Estados operacionais em enums; o que é calculado não se
guarda.

| Grupo | Tabelas | Notas essenciais |
|---|---|---|
| Pessoas | `people`, `teams`, `people_pay`, `absences` | `people.role` manager/collab, `access` none/sent/active/suspended/failed, `archived`. **Dinheiro em `people_pay`** (`per_job_rate`, `travel_per_job`), fora de `people`, porque a colaboradora lê `people` |
| Clientes | `clients`, `client_billing`, `service_locations`, `location_rates`, `units`, `unit_rates`, `unit_calendars` | Cliente → Alojamento → Quarto. Lavandaria e produtos ao nível do **cliente** (`laundry_enabled`, `laundry_setup`, `client_billing.supply`). Tarifa = `coalesce(unit_rates, location_rates)`. `cleaning_min` herda quarto → alojamento → empresa (`unit_defaults()`). `access_instructions` é texto livre e **nunca** contém códigos |
| Limpezas | `jobs` + filhas `job_assignments`, `job_checklist_items`, `job_laundry_counts`, `job_photos`, `job_issues`, `job_events`, `job_approval_audit` | Uma só tabela para o ciclo de vida: `status` unpublished→planned→confirmed→in_progress→done e `review` pending/approved/correction/reopened. `source` ical/manual, `calendar_id`+`ical_uid` (índice único parcial). "Em atraso" calcula-se. `job_events` e `job_approval_audit` são só de acrescentar |
| Mensagens | `conversations`, `conversation_participants`, `messages`, `message_reads`, `message_attachments`, `notices`, `notice_reads` | Leitura por pessoa; avisos por pessoa em `notice_reads` |
| Faturação | `invoices`, `invoice_payments`, `team_payments` | O estado da fatura deduz-se dos pagamentos e de `due_on` |
| Empresa | `company_settings` (linha única, `id boolean` com `check (id)`) | nome, contactos, horas por omissão, `default_cleaning_min`, `duration_tolerance_min`, `travel_included`, `health_limits` |
| Modelos | `exec_checklist_template`, `exec_laundry_template` | O servidor materializa as listas de cada limpeza a partir daqui (gatilho `jobs_materializar_listas`) |
| Operação | `demo_jobs` | Só `service_role`; marca das limpezas de demonstração |

Vistas: `job_approval_facts` (factos da aprovação, `security_invoker`), `job_month_stats` e
`person_month_jobs` (agregados para Rendimentos, filtram por `is_manager()`).

### 6.4 Segurança: quem vê e altera o quê

Funções de identidade (`security definer`, `stable`, `search_path = public, pg_temp`):
`current_person_id()`, `is_manager()`, `my_team_id()`, `assigned_to_me(job)`. Todas exigem
`not archived and access = 'active'`: **suspender ou arquivar corta tudo no servidor.**

| Quem | Vê | Altera |
|---|---|---|
| Gestora | Tudo (`<tabela>_manager_all` em cada tabela) | Tudo, exceto auditoria e eventos, que só lê e acrescenta |
| Colaboradora | Colegas da equipa e gestoras; equipas; clientes, alojamentos e quartos **só onde tem limpezas**; as suas ausências; limpezas atribuídas a si ou à equipa **depois de publicadas**; conversas onde participa; avisos `todos`/`colab`; o seu pagamento e a sua tarifa | O progresso das suas limpezas **só por `exec_transition`**; `done`/`counted`/`confirmed` da checklist e da roupa enquanto a limpeza está aberta; fotos e anomalias; as suas mensagens |
| Sem sessão | Nada | Nada; nenhuma RPC executável por `anon` |

Guardas por gatilho (em vez de permissões por coluna, que se aplicariam à gestora também):

- `jobs_guard_collab_update`: a colaboradora não toca em revisão, agendamento, equipa, quarto,
  notas da gestora, flags do cliente, nem em estado/horas fora de `exec_transition` (marcador
  `alclean.fluxo_execucao`).
- `jobs_guard_fechada`, `jobs_guard_delete`: uma limpeza em curso ou concluída não muda de
  horário, equipa nem local, não recua de estado (só por `aprov_rever`, marcador
  `alclean.fluxo_aprovacao`) e não se apaga.
- `job_assignments_guard_fechada` / `_update`: quem fez uma limpeza concluída, e as horas, não
  mudam. **Vale também para a `service_role`** (integridade do passado, não permissão).
- `people_guard_delete`: ninguém apaga a própria conta; pessoa com limpezas concluídas
  arquiva-se, não se apaga. `people_guard_self`: a gestora não se tranca fora.
- Checklist e roupa: a colaboradora não insere nem apaga; nunca altera `planned`.
- Eventos, anomalias e auditoria: autor e hora carimbados pelo servidor.

Doutrina das guardas: as de **permissão** saem por `auth.uid() is null` (scripts de manutenção
precisam de arrumar a base); as de **integridade do passado** valem para toda a gente.

### 6.5 Regras para as migrações daqui em diante

- Uma migração nova por alteração, `NNNN_nome_em_portugues.sql`, com um comentário no topo a dizer
  o que corrige e porquê. Nunca editar uma migração aplicada.
- Uma função que muda de assinatura é `drop function <assinatura exata>` + `create`; `create or
  replace` com assinatura nova cria uma sobrecarga e o PostgREST escolhe a errada.
- Toda a função com `set search_path = public, pg_temp`. `security definer` só para identidade,
  transições e carimbos, com o motivo escrito.
- Tabela nova subscrita pela app → entra na publicação **na mesma migração**.
- Depois de cada migração: `npm run rls-check`. Depois de cada bloco: `get_advisors` (segurança e
  desempenho) e reler `pg_policies`, `pg_proc.prosecdef`, `pg_publication_tables`.
- Aplicar com `supabase db push` (histórico coerente). O projeto atual tem o histórico parado em
  `0027`; antes de qualquer `push` é preciso alinhá-lo (`supabase migration repair`) ou recomeçar
  num projeto novo com `rebuild/db/`.

---

## 7. Edge Functions

| Função | Chamada por | Segredos (Edge Functions → Secrets) | Faz |
|---|---|---|---|
| `provision-access` | Módulo Equipas, com a sessão da gestora | automáticos: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; opcional `ALCLEAN_ORIGENS` (lista de domínios do site, separados por vírgula) | Verifica `is_manager()` com o JWT de quem chama; valida PIN `^\d{6}$`; cria (`email_confirm: true`) ou repõe o PIN de `slug(nome)@alclean.local`; recusa nomes que colidem (409); modo `sincronizarEmail` após mudança de nome; grava `auth_user_id`, `access='active'`, `sent_at` |
| `sync-calendars` | Botão "Sincronizar agora" (gestora) e o agendador (`x-alclean-cron`) | os automáticos + `ALCLEAN_CRON_SEGREDO` (obrigatório para o agendador) + opcional `ALCLEAN_ORIGENS` | Descarrega cada iCal (redirecionamentos validados), interpreta, e chama `job_from_ical` / `job_ical_desaparecidos` no Postgres. **Um calendário ilegível não é um calendário vazio**: fica em `error` e nada é apagado |

```sh
supabase functions deploy provision-access     # verify_jwt fica ligado (omissão)
supabase functions deploy sync-calendars
supabase secrets set ALCLEAN_CRON_SEGREDO=<texto aleatório longo>
# o mesmo valor vai para o Vault como alclean_cron_segredo (§6.2)
```

Os quatro ficheiros de `sync-calendars` que não importam Deno (`sincronizar`, `descarregar`,
`enderecos`, `ical`) são testados em Node por `npm run ical-check`, com as fixtures de
`scripts/fixtures/ical/`.

---

## 8. Autenticação

- **Sem OTP nem magic link**: `signInWithPassword` nos dois papéis.
- **Colaboradora**: escreve o nome completo e um PIN de 6 dígitos. O ecrã deriva o email
  `slug(nome)@alclean.local` (minúsculas, sem acentos, não-letras → `.`); o PIN é a palavra-passe.
  Nenhum email é enviado (domínio inexistente; contas confirmadas na criação).
- **Gestora**: email e palavra-passe próprios (hoje `gestora@alclean.com`), criados pela API de
  administração.
- `AuthProvider`: sessão → linha de `people` por `auth_user_id` → `{id, name, role, teamId,
  canReview}`. Três estados distintos: sem sessão (ecrã de entrada), sessão sem pessoa ("acesso
  desativado"), erro de ligação (repetir). Terminar sessão limpa as caches (URLs assinados).
- Após entrar, uma marca em `sessionStorage` (`alclean:entrou-agora`) redireciona uma única vez
  para a página do papel (`paginaDepoisDeEntrar`); a app **não impõe o papel** nas páginas — a
  fronteira é o RLS, e é por isso que o `rls-check` é obrigatório.
- Fragilidades conhecidas e aceites por agora (auditoria de 19/09, A2): PIN de 6 dígitos e
  identificador previsível; depende do *rate limiting* do Auth. A recuperação de acesso é feita
  pela gestora (repor o PIN), não por email.

---

## 9. Regras de negócio essenciais (validadas com a empresa)

Estas são a autoridade sobre o comportamento. O código tem de as seguir.

**Transversais**

1. A app nunca guarda nem mostra códigos ou chaves de acesso a alojamentos.
2. Dinheiro só para a gestão. A colaboradora vê **só o seu** valor por limpeza; nunca tarifas,
   faturação, margens nem o pagamento das colegas.
3. A gestora decide e atribui tudo. A colaboradora vê o plano **só depois de publicado**, confirma,
   executa, regista e conclui.
4. Lavandaria e produtos são definições do **cliente**, carimbadas em cada limpeza
   (`supplies_own_products` = o cliente fornece → não se leva material;
   `laundry_collection_active`).
5. O que decide a aprovação não vem da colaboradora: horas, duração, listas, autoria e hora dos
   eventos são do servidor.
6. Histórico e auditoria só crescem. Limpezas concluídas não se apagam; pessoas com limpezas
   concluídas arquivam-se.
7. Datas e horas em `Europe/Lisbon`, com o relógio real. Nenhuma data de demonstração no código.
8. Português de Portugal, tom informal ("tu"). Marca: "ALClean", teal `#0D9488`.

**Por módulo**

| Módulo | Regras |
|---|---|
| Empresa | Nome, contactos, horas por omissão de saída/entrada (11:00/15:00), duração por omissão (120 min), tolerância de duração (30 min), deslocações incluídas no custo de equipa. Editáveis só pela gestora; as metas de saúde financeira editam-se em Rendimentos |
| Equipas | Papéis gestora/colaboradora (a gestora é também dona e colaboradora). Equipas pré-definidas que a gestora reorganiza. Ausências: férias, folga, baixa, consulta, formação, indisponibilidade, **não comunicada**; sem fluxo de aprovação (ficam aprovadas). Pagamento **por limpeza** (+ deslocações opcionais). Acesso criado pela gestora; sem convite formal |
| Clientes | Cliente → Alojamento → Quarto. iCal Airbnb, Booking.com, Outro. Horas de saída/entrada por alojamento, com herança para o quarto. Faturação: ciclo quinzenal (`custom`), à vista (`terms 0`), `supply` cliente por omissão |
| Planeamento | Limpezas nascem do iCal ou à mão (`create_job`, sempre `unpublished`, quarto ativo e alojamento não em pausa). Vista principal: dia, arrastar-e-largar. Entrada no mesmo dia = prioridade alta (só a bolinha no cartão; texto na lista de alertas). Publicar torna visível à colaboradora. Uma limpeza concluída ou em curso não se move nem se desfaz daqui |
| Execução | Preparação: confirmar acesso (sem campo), rever notas, levar material (só se o cliente não fornece), levar sacos de roupa (só com lavandaria). Tarefas: quartos, casas de banho, cozinha, sala, repor consumíveis, verificar danos, portas e janelas. Fotos por espaço. "Inventário da roupa a lavar" sempre disponível. Incidências: atraso, dano, falta de material, acesso impossível, outro; foto opcional. Transições só para a frente: planned→confirmed→in_progress→done. Sem cronómetro; sem offline (assume rede) |
| Aprovações | Ao concluir, o servidor calcula ocorrências: anomalia registada; atraso (início real > previsto + **10 min**); tarefas por fazer; **falta** na roupa (excesso não conta); duração > prevista + tolerância; sem hora de início. Sem nenhuma → aprovada automaticamente e direta para o histórico. Uma limpeza reaberta nunca se aprova sozinha. Só a gestora aprova, pede correção (com nota) ou reabre (para Planeado ou Em curso, com motivo); tudo com auditoria |
| Mensagens | A colaboradora fala com a gestora e diretamente com o cliente; só vê as suas conversas e as das suas limpezas; não marca conversas como resolvidas; leitura por pessoa. Avisos: confirmação de leitura, próximo trabalho, reserva nova ou alterada por iCal **só quando cai na semana em curso**, entrada no mesmo dia. O cliente não tem portal |
| Rendimentos | Faturação a partir das limpezas concluídas: tarifa/hora do quarto (herda do alojamento) × horas previstas. Custo de equipa = valor por limpeza (+ deslocações se ligado). Estado da fatura deduzido dos pagamentos. Limiares de saúde editáveis. Custo de produtos escondido enquanto o Inventário está desligado |
| Importação iCal | De hora a hora (minuto 7) e a pedido. Cria limpezas `unpublished` com origem `ical`, horas da herança do quarto, não do calendário. Reserva que muda: move a limpeza só se por publicar e sem ninguém; senão avisa. Reserva que desaparece: apaga só se por publicar e sem ninguém; senão avisa. Reservas passadas ignoradas. Em curso ou concluída: nunca tocada |

---

## 10. Padrões de código validados

Cada um custou pelo menos uma ronda de correção. Manter desde o primeiro dia.

**Camada de dados (`src/modules/shared/supabase/`)**

- `client.ts`: um único `createClient(url, anonKey, { auth: { persistSession: true,
  autoRefreshToken: true } })`; URL e chave vêm de `process.env.*` substituídos pelo `define` do
  esbuild; lança no arranque se faltarem.
- `useSupabaseData(carregar, tabelas, aplicar, aoFalhar?) → carregado`: carrega, subscreve cada
  tabela e recarrega a cada evento; guarda de sequência (só a resposta do último pedido é aplicada);
  agrupa rajadas em 120 ms (uma RPC toca várias tabelas). **`carregar` e `aplicar` têm de ser
  referências estáveis** (`useCallback(..., [])`), senão entra em ciclo.
- `realtime.ts`: `subscribeTable(tabela, cb)` com um canal por subscrição
  (`alclean:<tabela>:<n>`); dois módulos no mesmo ecrã não podem partilhar o nome do canal.
- `escritas.ts`: com RLS, um `update`/`delete` recusado devolve **zero linhas e `error: null`**.
  `escrever(query, { minimo })` exige `.select()` e lança `EscritaRecusada` se vierem menos linhas.
  `mensagemDaFalha()` distingue "Não tens permissão… Nada foi guardado." de "Não foi possível…".
  **Todos** os `repository.ts` devem usar isto (hoje só três usam).
- `sessionCache.ts`: caches (URLs assinados, 1 h) registam-se para serem limpas ao sair.
- Cada `repository.ts` é a fronteira `snake_case` ↔ `camelCase` e liga por id, nunca por nome.
  Colunas `time` chegam como `HH:MM:SS`; normalizar para `HH:MM` na leitura. Inserts em lote
  heterogéneos enviam `NULL` explícito e contornam defaults: preencher tudo.
- Duas escritas em tabelas diferentes = uma função no Postgres = uma transação (`upsert_*`,
  `save_job`, `create_job`, `commit_location_detail`, `exec_transition`, `aprov_rever`,
  `criar_conversa`, `enviar_mensagem`, `save_company_settings`, `rev_set_supply`).
- Padrão de escrita na UI: despacho local otimista → escrita → **se falhar, mostrar o erro e
  recarregar do servidor**. Nunca ler estado por `ref` logo depois de despachar.
- Números escritos por pessoas ("9,50") passam pelo parser do módulo, nunca por `Number()`.

**Regras e apresentação**

- `rules.ts` são funções puras, sem React nem Supabase, prontas a testar. O `rls-check` compila
  `aprovacoes/rules.ts` e compara os códigos de ocorrência com o servidor: os dois têm de coincidir
  (e `LATE_AFTER_MIN = 10` tem de ser igual a `aprov_margem_atraso_min()`).
- `shared/dates/relogio.ts`: `hojeLocal()`, `agoraLocal()`, `carimboLocal(iso)` em Europe/Lisbon.
  Nada de `new Date()` solto nos módulos.
- Kit de UI em `shared/ui/ui.tsx`; os módulos não reimplementam `Avatar`, `StatusPill`, `Drawer`.
- Erros para o utilizador em português, nunca o texto cru do Postgres. Um ecrã que falha a carregar
  diz que falhou; não mostra "lista vazia".

**Build e publicação**

- `preview/*.html` versionados; `preview/*.js` e `app.css` gerados no build e ignorados.
- Só `SUPABASE_URL` e `SUPABASE_ANON_KEY` entram no bundle; o build recusa uma chave secreta.
- Tailwind compilado, nunca por CDN. Cabeçalhos de segurança no `netlify.toml` (falta CSP: item
  aberto).

---

## 11. Verificação e critério de "pronto"

| Comando | Prova | Precisa de |
|---|---|---|
| `npm run typecheck` | Tipos estritos, sem locais por usar | nada |
| `npm run build` | Variáveis válidas, CSS com a marca, 8 bundles | `.env` |
| `npm run nav-check` | Para onde vai cada papel ao entrar | nada |
| `npm run ical-check` | Interpretador e sincronização iCal, com fixtures e espiões | nada |
| `npm run rls-check` | 236 verificações de fronteira com sessões reais (anónima, colaboradora, gestora), controlos positivos, dados descartáveis marcados `RLS-CHECK-TESTE` | `.env` com `service_role`; **de preferência uma base de testes**, não a de produção |
| `npm run seed -- --forcar <ref>` | Repõe os dados de arranque (apaga tudo antes) | só em bases sem dados reais |
| `npm run demo:criar` / `demo:remover` | Limpezas de demonstração marcadas em `demo_jobs` | recusa-se se houver limpezas reais |

**Pronto** quando: os cinco primeiros passam; a gestora cria limpezas (à mão e por iCal), atribui
e publica; a colaboradora só as vê depois de publicadas, confirma, executa, fotografa, regista e
conclui, sem ver códigos de acesso nem dinheiro que não seja o seu; a aprovação automática do
servidor coincide com o que a gestora vê; correção e reabertura chegam à colaboradora com
auditoria; mensagens e avisos em tempo real entre dois aparelhos; Rendimentos a partir das limpezas
aprovadas; suspender e arquivar cortam o acesso de facto; a app está publicada e o dono aprovou.

---

## 12. Publicação

`DEPLOY.md` tem os seis passos com capturas de decisão. Resumo: Netlify → importar o repositório
do GitHub → confirma `netlify.toml` (build `npm run build`, publish `preview`, Node 22) → duas
variáveis (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) → deploy → Site URL e Redirect URLs no Auth do
Supabase → teste em janela privada nos sete módulos, no telemóvel, com tempo real entre dois
aparelhos, e confirmar que Rendimentos não aparece à colaboradora. O Netlify **não** corre
migrações: aplicam-se antes do código que delas depende. Voltar atrás = republicar o deploy
anterior.

---

## 13. O que NÃO reconstruir

- O `src/` do repositório `Planning_OS` (protótipo sem servidor; 114 ficheiros diferentes dos da
  app). O que vale no template são as três skills em `.claude/skills/`, a documentação em
  `docs/` e o registo de melhoria contínua.
- `preview/` e `raw/` do template (mockups da Fase 1).
- `inventario/`, `onboarding/` (menos as validações), `mockData.ts`, `GerirModulosDialog.tsx`.
- Qualquer coisa em `.superpowers/` (registos de execução) ou `copia-seguranca-*`.
- A migração `0034` **não** se reconstrói pelo histórico: aplica-se `rebuild/db/04` depois dos
  pré-requisitos.
- O pack `ergoform-codex-pack/` e `docs/contexto-*-codex.md`: são de outro projeto.

---

## 14. Onde está a verdade, por ordem

1. O código e as migrações em `alclean-app` (cada ficheiro explica-se em comentário).
2. `rebuild/db/` (esquema final, verificado a 22/09/2026).
3. Este guia.
4. `docs/brief-reconstrucao-appos-alclean.md` (Partes A–D: template, procedimento, decisões da
   ALClean, regras técnicas) e `docs/auditoria-2026-09-19.md` (o que falta para produção e a
   decisão produto único vs. cópia por empresa).
5. `docs/auditoria-consolidacao-2026-09-22.md` (o que foi encontrado e a lista priorizada).
6. `docs/superpowers/melhoria-continua.md` (regras M-001 a M-018 do procedimento).
