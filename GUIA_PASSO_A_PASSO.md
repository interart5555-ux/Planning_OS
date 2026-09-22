# Guião passo a passo — recriar a ALClean do zero

*Para quem não é programador. Segue os passos pela ordem, sem saltar. Cada passo diz o que fazer,
onde, e como saber que ficou bem. No fim há uma lista de verificação para confirmares que o
resultado é igual ao de hoje. Tempo total: uma tarde, a maior parte à espera de instalações.*

**Precisas de:** um computador Mac com internet, um endereço de email teu, um cartão (o Supabase e
o Netlify têm plano gratuito, mas pedem cartão para alguns passos), e a pasta `rebuild/` deste
repositório.

**Nunca escrevas passwords, chaves ou segredos em ficheiros que vão para o GitHub, nem em
mensagens.** Quando este guião diz "guarda", é no gestor de passwords do Mac ou num papel.

---

## Parte 1 — Contas (30 minutos)

### 1. Conta no GitHub

1. Vai a https://github.com/signup e cria uma conta (ou entra na que já tens:
   `interart5555-ux`).
2. Se o repositório `alclean-app` ainda existir na conta antiga, salta para a Parte 3. Se não
   existir, continua.
3. Em https://github.com/new cria dois repositórios **privados**, sem README:
   `Planning_OS` e `alclean-app`. Anota os dois endereços (`https://github.com/<conta>/<nome>`).

**Ficou bem quando:** vês os dois repositórios vazios na tua página do GitHub, com o cadeado
"Private".

### 2. Conta no Supabase (a base de dados)

1. Vai a https://supabase.com e cria uma conta com o teu email (ou "Continue with GitHub").
2. Cria uma organização quando pedir (nome livre, plano Free).
3. Carrega em **New project**:
   - Name: `alclean`
   - Database Password: gera uma forte e **guarda-a**; vais precisar dela duas vezes.
   - Region: **West EU (Ireland)**.
4. Espera 2 a 3 minutos até o projeto ficar "Active".
5. Vai a **Project Settings → General** e anota o **Reference ID** (20 letras, por exemplo
   `jhwcpaxdlcefglkcmfrg`). Chama-se "ref" no resto do guião.
6. Vai a **Project Settings → API Keys** e anota:
   - **Project URL** (`https://<ref>.supabase.co`)
   - a chave **publishable** (começa por `sb_publishable_`)
   - a chave **secret** (começa por `sb_secret_`) — **guarda-a** como se fosse a password do banco.
     Ela passa por cima de todas as proteções.

**Ficou bem quando:** tens anotados ref, URL, chave publicável e chave secreta.

### 3. Conta no Netlify (o site)

1. Vai a https://app.netlify.com e entra com "Sign up with GitHub". Autoriza.
2. Não cries nada ainda; fica para a Parte 6.

---

## Parte 2 — Ferramentas no computador (20 minutos)

Abre a aplicação **Terminal** (Launchpad → Outros → Terminal). Copia e cola uma linha de cada vez
e carrega em Enter.

### 4. Homebrew, Git, Node e Supabase CLI

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git node@22 supabase/tap/supabase
brew link --overwrite node@22
```

Confirma:

```sh
git --version        # qualquer versão serve
node --version       # tem de começar por v22 ou superior
supabase --version   # 2.116 ou superior
```

### 5. Docker (só para verificar a base de dados em local; opcional mas recomendado)

1. Descarrega o Docker Desktop em https://www.docker.com/products/docker-desktop/ e instala.
2. Abre-o uma vez e deixa-o a correr.

**Ficou bem quando:** as três versões aparecem sem erros.

---

## Parte 3 — Os dois repositórios (15 minutos)

### 6. Ir buscar o código

**Se os repositórios ainda existem no GitHub:**

```sh
mkdir -p ~/Documents/Sandbox && cd ~/Documents/Sandbox
git clone https://github.com/interart5555-ux/Planning_OS.git "Planning_OS - V2"
mkdir alclean && git clone https://github.com/interart5555-ux/alclean-app.git alclean/app
cd alclean/app && git checkout fase2-backend
```

**Se desapareceram** (só tens este guião e a pasta `rebuild/`): o código da app tem de ser
reconstruído por um programador ou por um agente de código a partir de `REPLICATION_GUIDE.md`
(secção 3, o prompt). Este guião assume que o código existe. Continua na Parte 4 para a base de
dados, que não depende do código.

### 7. Instalar as dependências da app

```sh
cd ~/Documents/Sandbox/alclean/app
npm ci
```

**Ficou bem quando:** termina sem a palavra "ERR" e aparece uma pasta `node_modules`.

### 8. O ficheiro `.env` (as chaves, só no teu computador)

```sh
cp .env.example .env
open -e .env
```

No editor que abre, preenche:

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

Guarda e fecha. Este ficheiro está na lista dos ignorados pelo git: nunca vai para o GitHub.

---

## Parte 4 — A base de dados (30 minutos)

### 9. Aplicar o esquema

No painel do Supabase → **SQL Editor** → **New query**. Para cada ficheiro abaixo, por esta ordem:
abre o ficheiro no Mac (pasta `Planning_OS - V2/rebuild/db/`), seleciona tudo (⌘A), copia (⌘C),
cola na janela do SQL Editor (⌘V), carrega em **Run**. Espera pela mensagem "Success".

1. `01_esquema_publico.sql` (demora uns 10 segundos; é grande)
2. `02_tempo_real_e_storage.sql`
3. `03_sementes_estruturais.sql`

**Ficou bem quando:** corres esta consulta e obténs exatamente estes números:

```sql
select 'tabelas' as o_que, count(*) from pg_tables where schemaname = 'public'
union all select 'tempo real', count(*) from pg_publication_tables where pubname = 'supabase_realtime'
union all select 'funções', count(*) from pg_proc where pronamespace = 'public'::regnamespace
union all select 'políticas', count(*) from pg_policies where schemaname = 'public'
union all select 'bucket', count(*) from storage.buckets
union all select 'checklist', count(*) from exec_checklist_template;
```

| o_que | count |
|---|---|
| tabelas | 33 |
| tempo real | 29 |
| funções | 51 |
| políticas | 72 |
| bucket | 1 |
| checklist | 11 |

### 10. Configurar a autenticação

No painel → **Authentication**:

1. **Sign In / Providers → Email**: deixa "Enable Email provider" ligado; **desliga** "Confirm
   email" (as contas são criadas pela gestora e confirmadas na hora).
2. **Sign In / Providers**, no topo: **desliga** "Allow new users to sign up". Ninguém se regista
   sozinho nesta app.
3. **Attack Protection** (ou "Password"): **liga** "Leaked password protection".
4. **URL Configuration**: por agora escreve `http://localhost:8000` em Site URL. Voltas aqui na
   Parte 6 com o endereço do Netlify.

### 11. Criar a conta da gestora

1. **Authentication → Users → Add user → Create new user**:
   - Email: o email da gestora (hoje é `gestora@alclean.com`)
   - Password: uma password forte; **guarda-a** e entrega-a à gestora
   - Liga "Auto Confirm User". Cria.
2. Na lista de utilizadores, copia o **UID** dessa conta (uma sequência longa com traços).
3. **SQL Editor**, substitui os dois valores entre `<>`:

```sql
insert into people (auth_user_id, name, email, role, access)
values ('<UID copiado>', '<Nome da gestora>', '<email da gestora>', 'manager', 'active');
```

**Ficou bem quando:** `select name, role, access from people;` mostra a gestora com `manager` e
`active`.

### 12. Extensões e segredos para a importação automática de reservas

1. **Database → Extensions**: procura `pg_cron` e liga; procura `pg_net` e liga.
2. **Project Settings → Vault → Add new secret**, três vezes:

| Name | Secret |
|---|---|
| `alclean_functions_url` | `https://<ref>.supabase.co/functions/v1/sync-calendars` |
| `alclean_chave_publicavel` | a chave `sb_publishable_...` do passo 2 |
| `alclean_cron_segredo` | inventa um texto longo e aleatório (40+ caracteres, letras e números) e **guarda-o**: vais precisar dele no passo 14 |

3. Só agora: **SQL Editor** → cola e corre `04_agendador_ical.sql`. Se faltar algo, a mensagem de
   erro diz exatamente o quê.

**Ficou bem quando:** `select jobname, schedule, active from cron.job;` mostra
`alclean-sincronizar-calendarios`, `7 * * * *`, `true`.

---

## Parte 5 — As funções e os testes (20 minutos)

### 13. Ligar o computador ao projeto

```sh
cd ~/Documents/Sandbox/alclean/app
supabase login            # abre o browser; autoriza
supabase link --project-ref <ref>      # pede a Database Password do passo 2
```

### 14. Publicar as duas funções e o segredo

```sh
supabase functions deploy provision-access
supabase functions deploy sync-calendars
supabase secrets set ALCLEAN_CRON_SEGREDO=<o texto que puseste no Vault no passo 12>
```

**Ficou bem quando:** no painel → **Edge Functions** aparecem `provision-access` e
`sync-calendars` com estado Active.

### 15. Verificar tudo a partir do computador

```sh
npm run typecheck
npm run build
npm run nav-check
npm run ical-check
npm run rls-check
```

**Ficou bem quando:** os quatro primeiros acabam sem "ERR", e o último termina com a frase
**"Todas as fronteiras seguras."** Se não terminar assim, pára aqui: alguma coisa na base de dados
não ficou igual. A mensagem diz qual foi a verificação que falhou.

### 16. Dados de arranque (opcional)

A base está vazia, exceto a gestora. Tens duas opções:

- **Começar limpo**: a gestora cria equipas, colaboradoras (Equipas → dar acesso, que cria a conta
  com PIN) e clientes na própria app. É o caminho normal.
- **Dados de demonstração** (equipas, 4 colaboradoras, 4 clientes, 7 alojamentos, 9 quartos, tudo
  fictício):

```sh
npm run seed -- --forcar <ref>
```

Para ter **os mesmos dados de hoje**, é preciso uma cópia da base antiga, feita antes de a perder:
`supabase db dump --linked --data-only -f dados.sql` no projeto antigo, e depois
`psql "<ligação ao projeto novo>" -f dados.sql`. Sem essa cópia, os dados não se recuperam.

---

## Parte 6 — Pôr o site no ar (20 minutos)

### 17. Enviar o código para o GitHub (se criaste repositórios novos no passo 1)

```sh
cd ~/Documents/Sandbox/alclean/app
git remote set-url origin https://github.com/<conta>/alclean-app.git
git push -u origin fase2-backend
cd "~/Documents/Sandbox/Planning_OS - V2"
git remote set-url origin https://github.com/<conta>/Planning_OS.git
git push -u origin main
```

### 18. Netlify

1. https://app.netlify.com → **Add new project → Import an existing project → GitHub**.
2. Autoriza o acesso ao repositório `alclean-app` (privado) e escolhe-o.
3. Confirma: Branch `fase2-backend`, Build command `npm run build`, Publish directory `preview`.
4. **Add environment variables**: `SUPABASE_URL` e `SUPABASE_ANON_KEY` (os do passo 2). **Nunca**
   a chave secreta.
5. **Deploy**. Espera 2 a 3 minutos. Anota o endereço `https://<nome>.netlify.app`.

### 19. Dizer ao Supabase qual é o endereço do site

Painel → **Authentication → URL Configuration**:
- Site URL: `https://<nome>.netlify.app`
- Redirect URLs: `https://<nome>.netlify.app/**` e `http://localhost:*/**`

E, no Terminal, fecha as funções ao teu domínio:

```sh
supabase secrets set ALCLEAN_ORIGENS=https://<nome>.netlify.app
```

---

## Parte 7 — Confirmar que é igual ao de hoje

Abre o endereço numa janela privada do browser e percorre a lista. Cada linha tem de ser verdade.

| # | Verificação | Onde |
|---|---|---|
| 1 | A página abre com o cabeçalho "ALClean" em teal e o índice com 8 módulos (Empresa, Equipas, Clientes, Planeamento, Execução, Aprovações, Rendimentos, Mensagens) | `index.html` |
| 2 | Na consola do browser (F12 → Console) não há erros vermelhos | |
| 3 | A gestora entra com email e password | Qualquer módulo |
| 4 | Em **Empresa**, o nome, contactos e horas por omissão (11:00 / 15:00, 120 min, tolerância 30) guardam e reaparecem depois de recarregar | Módulo 1 |
| 5 | Em **Equipas**, criar uma colaboradora e "Dar acesso" com um PIN de 6 dígitos diz "acesso ativo" | Módulo 2 |
| 6 | No telemóvel, a colaboradora entra com o nome e o PIN e vê "O meu dia" vazio | Módulo 5 |
| 7 | Em **Clientes**, criar um cliente com um alojamento e um quarto; o quarto herda as horas | Módulo 3 |
| 8 | Em **Planeamento**, "Nova limpeza" cria uma limpeza por publicar; atribuí-la e publicar; a colaboradora passa a vê-la **só depois** de publicada | Módulos 4 e 5 |
| 9 | A colaboradora confirma, inicia, marca as 7 tarefas, tira uma foto, conclui; a limpeza aparece em **Aprovações** como aprovada automaticamente (sem ocorrências) | Módulos 5 e 6 |
| 10 | Uma mensagem enviada no telemóvel aparece no computador **sem recarregar** | Módulo 10 |
| 11 | **Rendimentos** não aparece à colaboradora | Índice, sessão da colaboradora |
| 12 | Num quarto com um endereço iCal real, "Sincronizar agora" cria as limpezas das reservas futuras; uma hora depois (minuto 7) `select * from cron.job_run_details order by start_time desc limit 3;` mostra execuções | Módulo 3 e SQL Editor |
| 13 | `npm run rls-check` volta a dizer "Todas as fronteiras seguras." depois de haver dados | Terminal |

Se as 13 forem verdade, o sistema está igual ao de 22 de setembro de 2026: mesmo esquema, mesmas
regras, mesmas proteções. A única coisa que pode diferir são os dados (passo 16).

---

## Se algo correr mal

| Sintoma | Causa provável | Onde ver |
|---|---|---|
| O build no Netlify falha com "Faltam SUPABASE_URL…" | Variáveis não definidas no Netlify | Site configuration → Environment variables |
| O build falha com "tem uma chave secreta" | Colaste a `sb_secret_` no sítio da publicável | Idem; troca pela `sb_publishable_` |
| A entrada falha com "redirect" | Passo 19 por fazer | Authentication → URL Configuration |
| A colaboradora não consegue entrar | Acesso não está `active`, ou o nome escrito não é exatamente o registado | Equipas → ficha da pessoa |
| `rls-check` falha numa linha `0032:` | O agendador ou o Vault | `functions/sync-calendars/README.md`, secção "Ver se está a correr" |
| `cron.job_run_details` diz "succeeded" mas nada é importado | O segredo do Vault não é igual ao da função | `select status_code from net._http_response order by created desc limit 5;` → 403 = segredos diferentes; 401 = chave publicável errada |
