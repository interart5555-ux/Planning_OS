# Guião de instalação — ALClean do zero

*Para quem não é programador. São 16 etapas, numeradas, pela ordem. Cada uma diz quem a faz (tu ou
o Claude), o que fazer, e como saber que ficou bem. Com o Claude Code, escreves START e ele leva-te
por aqui; sem ele, segues sozinho. Tempo: uma tarde.*

**Precisas de:** um Mac com internet, um email teu, um cartão (Supabase e Netlify pedem-no mesmo no
plano gratuito), e este pack extraído numa pasta tua (por exemplo `Documentos/ALClean`).

**Nunca escrevas passwords ou chaves em ficheiros que vão para o GitHub, nem no chat.** "Guarda"
quer dizer no gestor de passwords do Mac ou num papel.

---

## Parte 1 — Contas (tu, 30 minutos)

### Etapa 1 — Três contas

**GitHub** (onde o código fica guardado):
1. https://github.com/signup → cria conta (ou entra na tua).
2. https://github.com/new → repositório **privado** chamado `alclean-app`, sem README. Anota o
   endereço `https://github.com/<conta>/alclean-app`.

**Supabase** (a base de dados):
1. https://supabase.com → **Start your project** → conta com o email ou com o GitHub.
2. Cria uma organização (nome livre, plano Free).
3. **New project**: Name `alclean`; Database Password: gera uma forte e **guarda-a** (vais usá-la
   duas vezes); Region **West EU (Ireland)**. Espera até "Active" (2–3 min).
4. **Project Settings → General**: anota o **Reference ID** ("ref", 20 letras).
5. **Project Settings → API Keys**: anota a **Project URL**, a chave **publishable**
   (`sb_publishable_…`) e a chave **secret** (`sb_secret_…`, trata-a como a password do banco).
6. Botão **Connect** (no topo) → separador **Session pooler** → copia a linha `postgresql://…` e
   substitui `[YOUR-PASSWORD]` pela password da base de dados. É a "ligação à base".

**Netlify** (o site): https://app.netlify.com → **Sign up with GitHub**. Mais nada por agora.

**Ficou bem quando:** tens anotados ref, URL, chave publicável, chave secreta, ligação à base, e
o endereço do repositório.

---

## Parte 2 — Ferramentas no Mac (Claude, 20 minutos)

### Etapa 2 — Instalar

Abre o **Terminal** (Launchpad → Outros). Uma linha de cada vez; a primeira pede a password do Mac.

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git node@22 supabase/tap/supabase libpq
brew link --overwrite node@22 && brew link --force libpq
```

**Ficou bem quando:**
```sh
git --version && node --version && supabase --version && psql --version
```
mostra quatro versões (Node a começar por v22 ou superior; Supabase 2.116 ou superior).

---

## Parte 3 — Preparar a app (10 minutos)

### Etapa 3 — O ficheiro das chaves (tu)

```sh
cd ~/Documentos/ALClean/app
cp .env.example .env
open -e .env
```

Preenche as quatro linhas com o que anotaste na Etapa 1 e guarda:

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```

Este ficheiro fica só no teu computador (está na lista dos que o git ignora).

**Ficou bem quando:** `grep -c "^SUPABASE_" .env` responde `4`.

### Etapa 4 — Instalar as dependências (Claude)

```sh
cd ~/Documentos/ALClean/app && npm ci
```

**Ficou bem quando:** termina sem "ERR" e existe a pasta `node_modules`.

---

## Parte 4 — A base de dados (30 minutos)

### Etapa 5 — O esquema (Claude)

```sh
cd ~/Documentos/ALClean
instalador/aplicar-sql.sh db/01_esquema_publico.sql
instalador/aplicar-sql.sh db/02_tempo_real_e_storage.sql
instalador/aplicar-sql.sh db/03_sementes_estruturais.sql
```

**Ficou bem quando** este comando dá exatamente estes números:

```sh
instalador/sql.sh "select 'tabelas', count(*) from pg_tables where schemaname='public'
union all select 'tempo real', count(*) from pg_publication_tables where pubname='supabase_realtime'
union all select 'funções', count(*) from pg_proc where pronamespace='public'::regnamespace
union all select 'políticas', count(*) from pg_policies where schemaname='public'
union all select 'bucket', count(*) from storage.buckets
union all select 'checklist', count(*) from exec_checklist_template;"
```

```
tabelas|33
tempo real|29
funções|51
políticas|72
bucket|1
checklist|11
```

### Etapa 6 — Autenticação (tu, no painel do Supabase → Authentication)

1. **Sign In / Providers → Email**: "Enable Email provider" ligado; **"Confirm email" desligado**.
2. No topo da mesma página: **"Allow new users to sign up" desligado**.
3. **Attack Protection**: **"Leaked password protection" ligado**.
4. **URL Configuration**: Site URL `http://localhost:8000` por agora (muda na Etapa 15).

**Ficou bem quando:** as três opções estão como acima. Diz ao Claude "feito".

### Etapa 7 — A conta da gestora (Claude, com o teu nome e email)

```sh
cd ~/Documentos/ALClean/app
npm run gestora:criar -- --nome "Nome Apelido" --email gestora@empresa.pt
```

O script imprime uma password **uma única vez**. Guarda-a e muda-a depois de entrares.

**Ficou bem quando:** `instalador/sql.sh "select name, role, access from people;"` mostra a gestora
com `manager|active`.

### Etapa 8 — Os dados antigos (opcional; Claude, só se lhe disseres que sim)

Se o pack tiver `dados/dados-<data>.sql` e quiseres as pessoas, clientes e limpezas de então:

```sh
cd ~/Documentos/ALClean
instalador/restaurar-dados.sh dados/dados-2026-09-22.sql
cd app && npm run gestora:criar -- --nome "Nome Apelido" --email gestora@empresa.pt
```

As colaboradoras ficam sem acesso até a gestora lhes voltar a dar acesso no módulo Equipas (o PIN
antigo não sobrevive à mudança de projeto). As fotografias não vêm.

**Ficou bem quando:** `instalador/sql.sh "select count(*) from jobs;"` dá um número maior que 0.

---

## Parte 5 — Funções e agendador (20 minutos)

### Etapa 9 — Ligar o computador ao projeto (os dois)

```sh
cd ~/Documentos/ALClean/app
supabase login
supabase link --project-ref <ref>
```

O primeiro abre o browser: autoriza. O segundo pede a password da base de dados: escreve-a (não
aparece enquanto escreves).

**Ficou bem quando:** `supabase link` termina com "Finished supabase link."

### Etapa 10 — Extensões (tu, painel → Database → Extensions)

Procura `pg_cron` → liga. Procura `pg_net` → liga.

**Ficou bem quando:** `instalador/sql.sh "select extname from pg_extension where extname in ('pg_cron','pg_net');"` mostra as duas.

### Etapa 11 — Segredos e agendador (Claude)

```sh
cd ~/Documentos/ALClean
SEGREDO=$(openssl rand -hex 32)
( cd app && supabase secrets set ALCLEAN_CRON_SEGREDO="$SEGREDO" )
instalador/sql.sh "select vault.create_secret('$SEGREDO', 'alclean_cron_segredo');"
instalador/sql.sh "select vault.create_secret('https://<ref>.supabase.co/functions/v1/sync-calendars', 'alclean_functions_url');"
instalador/sql.sh "select vault.create_secret('<sb_publishable_...>', 'alclean_chave_publicavel');"
instalador/aplicar-sql.sh db/04_agendador_ical.sql
```

(O Claude substitui `<ref>` e a chave publicável lendo-os do `.env` sem os mostrar.)

**Ficou bem quando:** `instalador/sql.sh "select jobname, schedule, active from cron.job;"` mostra
`alclean-sincronizar-calendarios|7 * * * *|t`.

### Etapa 12 — Publicar as funções (Claude)

```sh
cd ~/Documentos/ALClean/app
supabase functions deploy provision-access
supabase functions deploy sync-calendars
```

**Ficou bem quando:** painel → **Edge Functions** mostra as duas com estado Active.

### Etapa 13 — Verificação completa (Claude)

```sh
cd ~/Documentos/ALClean/app
npm run typecheck && npm run build && npm run nav-check && npm run ical-check
npm run rls-check
```

**Ficou bem quando:** os quatro primeiros acabam sem "ERR" e o último termina com
**"Todas as fronteiras seguras."** Se não, pára aqui: a mensagem diz qual a verificação que falhou
e o Claude explica-a.

---

## Parte 6 — O site (20 minutos)

### Etapa 14 — O código para o GitHub (Claude, com o teu repositório)

```sh
cd ~/Documentos/ALClean/app
git init -b main
git add -A && git commit -m "ALClean: instalação a partir do pack"
git remote add origin https://github.com/<conta>/alclean-app.git
git push -u origin main
```

O `git push` pode pedir para entrares no GitHub no browser. O `.env` **não** vai (o `.gitignore`
já o exclui; o Claude confirma com `git ls-files .env`, que tem de não mostrar nada).

**Ficou bem quando:** vês os ficheiros no GitHub e **não** vês nenhum `.env`.

### Etapa 15 — Netlify e o endereço do site (tu, depois o Claude)

1. https://app.netlify.com → **Add new project → Import an existing project → GitHub** → autoriza
   o acesso ao `alclean-app` → escolhe-o.
2. Confirma: Branch `main`, Build command `npm run build`, Publish directory `preview`.
3. **Add environment variables**: `SUPABASE_URL` e `SUPABASE_ANON_KEY` (os da Etapa 1). **Nunca**
   a chave secreta.
4. **Deploy**. Espera 2–3 minutos. Anota o endereço `https://<nome>.netlify.app`.
5. Painel do Supabase → **Authentication → URL Configuration**: Site URL `https://<nome>.netlify.app`;
   Redirect URLs: `https://<nome>.netlify.app/**` e `http://localhost:*/**`.
6. Diz o endereço ao Claude, que fecha as funções ao teu site:

```sh
cd ~/Documentos/ALClean/app && supabase secrets set ALCLEAN_ORIGENS=https://<nome>.netlify.app
```

**Ficou bem quando:** o endereço abre e mostra "ALClean" com os oito módulos.

---

## Parte 7 — Confirmar que é igual (tu, guiado pelo Claude)

### Etapa 16 — As 13 verificações

Numa janela privada do browser, no endereço do site:

| # | Tem de ser verdade | Onde |
|---|---|---|
| 1 | O índice mostra "ALClean" em teal e 8 módulos: Empresa, Equipas, Clientes, Planeamento, Execução, Aprovações, Rendimentos, Mensagens | Página inicial |
| 2 | F12 → Console: sem erros vermelhos | |
| 3 | A gestora entra com o email e a password da Etapa 7 | Qualquer módulo |
| 4 | Em Empresa, nome, contactos e horas por omissão (11:00 / 15:00, 120 min, tolerância 30) guardam e reaparecem depois de recarregar | Módulo 1 |
| 5 | Em Equipas, criar uma colaboradora e "Dar acesso" com um PIN de 6 dígitos diz acesso ativo | Módulo 2 |
| 6 | No telemóvel, a colaboradora entra com o nome e o PIN e vê "O meu dia" | Módulo 5 |
| 7 | Em Clientes, criar cliente → alojamento → quarto; o quarto herda as horas | Módulo 3 |
| 8 | Em Planeamento, "Nova limpeza" cria uma limpeza por publicar; atribuir e publicar; a colaboradora só a vê depois de publicada | Módulos 4 e 5 |
| 9 | A colaboradora confirma, inicia, marca as 7 tarefas, tira uma foto, conclui; em Aprovações aparece "aprovada automaticamente" | Módulos 5 e 6 |
| 10 | Uma mensagem enviada no telemóvel aparece no computador sem recarregar | Módulo 10 |
| 11 | Rendimentos não aparece à colaboradora | Índice, com a sessão dela |
| 12 | Num quarto com um endereço iCal real, "Sincronizar agora" cria as limpezas das reservas futuras; passada uma hora, `instalador/sql.sh "select status, start_time from cron.job_run_details order by start_time desc limit 3;"` mostra execuções | Módulo 3 |
| 13 | `npm run rls-check` volta a dizer "Todas as fronteiras seguras." | Terminal |

Se as 13 forem verdade, a instalação é igual à de referência (22 de setembro de 2026): mesmo esquema,
mesmas regras, mesmas proteções. Guarda num sítio seguro: a password da base de dados, a da gestora
e o segredo do agendador (`SEGREDO` da Etapa 11, que também está no Vault do Supabase).

---

## Se algo correr mal

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `aplicar-sql.sh` diz "Falta SUPABASE_DB_URL" ou "password authentication failed" | Ligação à base mal copiada, ou `[YOUR-PASSWORD]` não substituído | Refaz a Etapa 3, linha 4 |
| `01_esquema_publico.sql` falha com "already exists" | Já tinha sido aplicado | Salta para o ficheiro seguinte |
| `04_agendador_ical.sql` diz "Falta o segredo …" ou "extensão não está ligada" | Etapa 10 ou 11 incompleta | A mensagem diz exatamente o que falta |
| O build no Netlify falha com "Faltam SUPABASE_URL…" | Variáveis por definir no Netlify | Site configuration → Environment variables |
| O build falha com "tem uma chave secreta" | Puseste a `sb_secret_` no lugar da publicável | Troca pela `sb_publishable_` |
| A entrada no site falha com "redirect" | Etapa 15, ponto 5 por fazer | Authentication → URL Configuration |
| A colaboradora não entra | Acesso não está ativo, ou o nome escrito não é exatamente o registado | Equipas → ficha da pessoa → Dar acesso |
| `rls-check` falha numa linha `0032:` | Agendador ou Vault | Ver `app/supabase/functions/sync-calendars/README.md`, "Ver se está a correr" |
| O agendador diz "succeeded" mas não importa nada | Segredo do Vault diferente do da função | `instalador/sql.sh "select status_code from net._http_response order by created desc limit 5;"`: 403 = segredos diferentes; 401 = chave publicável errada |
