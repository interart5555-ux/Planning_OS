# Pack de instalação da ALClean

Este pack tem tudo o que é preciso para pôr a aplicação ALClean a funcionar do zero, num
computador limpo, com contas novas. Foi feito para ser seguido por uma pessoa sem formação técnica,
com a ajuda do Claude Code.

## O que está aqui

| Pasta ou ficheiro | O que é |
|---|---|
| `LEIA-ME.md` | Este ficheiro |
| `CLAUDE.md` | As instruções que o Claude Code lê sozinho quando escreves START |
| `GUIA_INSTALACAO.md` | O guião passo a passo, para leigos. É o mesmo caminho que o Claude segue |
| `REPLICATION_GUIDE.md` | O guia técnico completo, para programadores ou para reconstruir o código |
| `app/` | O código da aplicação, tal como está publicado (sem chaves, sem ficheiros gerados) |
| `db/` | O esquema da base de dados em 4 ficheiros SQL, mais o README que os explica |
| `dados/` | Uma exportação dos dados do dia em que o pack foi feito. **Tem dados pessoais.** Opcional |
| `instalador/` | Três pequenos scripts que o Claude usa para falar com a base de dados |
| `docs/` | A memória do projeto: decisões da empresa, auditorias, lições |
| `template/skills/` | As três skills usadas para personalizar a app a uma empresa nova |

## Como começar (5 minutos)

1. Extrai o pack para uma pasta tua, por exemplo `Documentos/ALClean`. Não a metas no iCloud Drive
   nem no Google Drive: as chaves que vais escrever no passo seguinte ficam nessa pasta.
2. Instala o Claude Code, se ainda não o tens: https://claude.com/claude-code (a página diz como).
3. Abre a aplicação **Terminal** e escreve, substituindo pelo caminho da tua pasta:

```sh
cd ~/Documentos/ALClean
claude
```

4. Quando o Claude aparecer, escreve **START** e carrega em Enter.

O Claude lê o `CLAUDE.md`, explica-te o que vai fazer, e vai avançando pelo `GUIA_INSTALACAO.md`
passo a passo. Faz sozinho tudo o que se pode fazer no terminal. Quando um passo é teu (criar uma
conta, copiar uma chave do painel, carregar num botão), diz-te exatamente o que fazer e espera que
confirmes. Podes fechar e voltar mais tarde: ele guarda o ponto onde ficou em `PROGRESSO.md`, e um
novo START continua de lá.

## Três regras

- **Nunca partilhes este pack com a pasta `dados/` dentro.** Tem nomes e contactos reais.
- **Nunca escrevas passwords ou chaves no chat do Claude** quando ele te pedir para as pores no
  ficheiro `app/.env`. Abre o ficheiro e escreve lá diretamente; o Claude só precisa de saber que
  está preenchido.
- A chave que começa por `sb_secret_` é a mais perigosa: fica só no `app/.env` do teu computador.
  Nunca vai para o GitHub nem para o Netlify.

## Se preferires sem o Claude

`GUIA_INSTALACAO.md` é completo por si. Cada passo diz o que fazer e como saber que ficou bem.
