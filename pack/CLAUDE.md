# Instruções para o Claude Code — pack de instalação da ALClean

Estás dentro de um pack de instalação de uma aplicação de gestão para uma empresa de limpezas de
alojamento local (ALClean). A pessoa que te fala **não é programadora**. O teu trabalho é instalar
a aplicação do zero, seguindo `GUIA_INSTALACAO.md`, passo a passo, e chegar a um resultado igual
ao do dia em que o pack foi feito.

## Gatilho

Quando a pessoa escrever `START` (em qualquer capitalização):

1. Lê `LEIA-ME.md`, este ficheiro e `GUIA_INSTALACAO.md` por inteiro.
2. Se existir `PROGRESSO.md`, lê-o e continua a partir do último passo marcado como feito.
   Se não existir, cria-o com a lista de passos do guião, todos por fazer.
3. Explica em dez linhas, em linguagem simples, o que vais fazer e o que vais precisar dela
   (contas, um cartão para o Supabase e o Netlify, uma password para guardar).
4. Começa no primeiro passo por fazer.

## Como trabalhar

- **Português de Portugal**, sempre. Nunca "usuário", "equipe", "faturamento", "arquivo" (é
  "ficheiro"), "tela" (é "ecrã"). Tom simples e direto; frases curtas; nada de jargão sem explicar.
- **Um passo de cada vez.** Antes de cada passo, diz em duas ou três frases o que ele faz e porquê.
  Depois de cada passo, confirma que ficou bem com a verificação que o guião indica, e só então
  marca-o em `PROGRESSO.md` e avança.
- **Faz tu tudo o que se faz no terminal**: instalar ferramentas (mostra o comando e pede-lhe para
  o correr se pedir a password do Mac), `npm ci`, aplicar os ficheiros SQL com
  `instalador/aplicar-sql.sh`, correr os scripts, `supabase functions deploy`, `git`.
- **Pede à pessoa o que se faz num painel web** (criar contas, criar o projeto no Supabase, copiar
  chaves, ligar extensões, configurar a autenticação, criar o site no Netlify). Diz-lhe exatamente
  onde clicar, com os nomes dos menus tal como o guião os escreve, e **espera pela confirmação**
  antes de continuar. Nunca assumas que fez.
- **Segredos:** nunca peças que te colem chaves ou passwords no chat. Pede-lhes que abram
  `app/.env` (com `open -e app/.env`) e escrevam lá. Tu só verificas que as variáveis existem e
  têm a forma certa (`grep -c` ao nome, nunca ao valor). Nunca imprimas o conteúdo de `app/.env`,
  nunca faças `cat` a esse ficheiro, nunca o metas no git. O único segredo que passa pelo chat é
  a password da gestora gerada por `npm run gestora:criar`, e só porque a pessoa precisa dela; diz-
  lhe para a guardar e a mudar depois de entrar.
- **Não alteres nada em `db/`, `dados/` nem no código de `app/`** a não ser o `.env`. Se um ficheiro
  SQL falhar, o problema é da ordem ou de um pré-requisito em falta; lê a mensagem de erro (diz o
  que falta) e resolve isso, não o ficheiro.
- **Quando algo falha**, pára, explica em linguagem simples o que aconteceu e o que vais tentar,
  e só continua com o acordo da pessoa. Não tentes três coisas em silêncio.
- **Verifica antes de dizer "feito".** Cada etapa do guião tem um "Ficou bem quando". Corre-o.
- Podes usar a tabela "Se algo correr mal" no fim do guião.

## Ferramentas que vais precisar no Mac

`git`, `node` (22 ou superior), `npm`, `supabase` (CLI, 2.116 ou superior), `psql` (`brew install
libpq && brew link --force libpq`) ou o Docker como alternativa. O guião, Parte 2, tem os comandos
de instalação. Confirma as versões antes de avançar.

## O ficheiro `app/.env`

Quatro linhas, todas obrigatórias para a instalação (a quarta só serve aos scripts de instalação):

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```

A `SUPABASE_DB_URL` é a "Session pooler" que o painel mostra em **Connect** (botão no topo do
projeto), com a password da base de dados no lugar de `[YOUR-PASSWORD]`. É por ela que os scripts
de `instalador/` aplicam os ficheiros SQL sem a pessoa ter de os colar à mão.

## Etapas (espelho do guião; os detalhes estão lá)

| # | Etapa | Quem faz |
|---|---|---|
| 1 | Contas: GitHub, Supabase (projeto `alclean`, região West EU Ireland), Netlify | pessoa |
| 2 | Ferramentas no Mac | tu (comandos), pessoa (password do Mac) |
| 3 | `app/.env` com as quatro variáveis | pessoa escreve, tu verificas a forma |
| 4 | `cd app && npm ci` | tu |
| 5 | Esquema: `instalador/aplicar-sql.sh db/01…`, `02…`, `03…`; verificação das contagens com `instalador/sql.sh` | tu |
| 6 | Autenticação no painel (registo público desligado, confirmação de email desligada, leaked password protection ligada) | pessoa |
| 7 | Gestora: `cd app && npm run gestora:criar -- --nome "…" --email …` | tu (a pessoa dá nome e email) |
| 8 | Opcional, dados antigos: `instalador/restaurar-dados.sh dados/dados-*.sql` e repetir o passo 7 | tu, com autorização explícita |
| 9 | `supabase login` (browser) e `supabase link --project-ref <ref>` (pede a password da base) | pessoa no browser/prompt, tu lança |
| 10 | Extensões `pg_cron` e `pg_net` no painel | pessoa |
| 11 | Segredos: gerar `openssl rand -hex 32`; `supabase secrets set ALCLEAN_CRON_SEGREDO=…`; no Vault via `instalador/sql.sh` com `vault.create_secret(...)` os três segredos; depois `aplicar-sql.sh db/04…` | tu |
| 12 | `supabase functions deploy provision-access` e `sync-calendars` | tu |
| 13 | Verificação: `npm run typecheck`, `build`, `nav-check`, `ical-check`, `rls-check` | tu |
| 14 | GitHub: `git init`, commit, remoto privado, push (a pessoa cria o repositório vazio) | ambos |
| 15 | Netlify: importar o repositório, 2 variáveis, deploy; depois Site URL e Redirect URLs no Supabase; `supabase secrets set ALCLEAN_ORIGENS=…` | pessoa, tu no fim |
| 16 | Lista final de 13 verificações na app | pessoa, guiada por ti |

Quando as 16 estiverem marcadas em `PROGRESSO.md`, diz à pessoa que a instalação está igual à de
referência e o que deve guardar (a password da base de dados, a da gestora, o segredo do agendador)
num sítio seguro.
