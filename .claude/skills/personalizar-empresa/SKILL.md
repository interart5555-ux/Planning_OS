---
name: personalizar-empresa
description: Use when starting to personalize the AppOS planning-app template for a new company. Captures the one-time company profile — identification, base vocabulary, brand, and a work-process narrative per base module (including the shared Execução+Aprovações cycle) — before any module-specific personalization with /personalizar-modulo begins.
---

# Personalizar Empresa

Cria (ou revê) o perfil de uma empresa que vai usar o template AppOS. É o primeiro passo do procedimento de personalização, corrido uma vez por empresa; os módulos específicos são depois tratados um a um com `/personalizar-modulo <nome>`.

Este skill nunca lê nem escreve `src/` ou `preview/` do template — só produz documentos em `empresas/<slug>/`.

## Passo 1 — Localizar a raiz do template e a empresa alvo

A raiz do template é o diretório que contém `.claude/skills/personalizar-empresa/` (este ficheiro). O diretório de cada empresa é sempre irmão dessa raiz, nunca uma subpasta dela.

- Se já existir um argumento com o nome da empresa, ou a conversa já tiver identificado uma empresa em curso, usar esse nome.
- Caso contrário, perguntar: "Para que empresa é este perfil?"
- Verificar se `<raiz-do-template>/../<slug-provável>/perfil-empresa.md` já existe.
  - Se existir, ler o ficheiro e perguntar ao utilizador se quer rever/atualizar campos existentes, ou se o pedido é para outra empresa.
  - Se não existir, prosseguir para o Passo 2 com um perfil novo.

## Passo 2 — Ler o questionário de referência

Ler `reference-perfil-empresa.md` (na mesma pasta deste ficheiro) antes de perguntar seja o que for. Esse ficheiro tem o texto exato de cada pergunta e a lógica de derivação dos módulos opcionais — não inventar perguntas novas nem saltar secções.

## Passo 3 — Percorrer o questionário

Seguir as secções 1 a 5 de `reference-perfil-empresa.md`, por esta ordem: Identificação, Vocabulário-base, Marca, Processo de trabalho por módulo (Equipas, Clientes, Planeamento, Mensagens), e por fim a narrativa "Ciclo de trabalho" (Execução + Aprovações).

- Uma pergunta de cada vez; preferir AskUserQuestion quando a pergunta sugerir opções fechadas (ex. tom formal/informal); pergunta aberta em texto para tudo o resto, sobretudo a narrativa do ciclo de trabalho.
- Aplicar os "Casos limite" de `reference-perfil-empresa.md` sempre que o utilizador não souber responder.

## Passo 4 — Derivar e confirmar módulos opcionais

Depois de recolhidas as seis respostas de processo, aplicar a lógica de derivação da secção 4 de `reference-perfil-empresa.md`. Apresentar os módulos opcionais candidatos e a frase do processo que os motivou, e perguntar explicitamente, um a um: "Ativar {{módulo}}?". Nunca marcar `true` em `modulos_opcionais` sem confirmação explícita para esse módulo.

## Passo 5 — Escrever o perfil

- Ler `template-perfil-empresa.md` (na mesma pasta).
- Preencher todos os campos de frontmatter e todas as secções do corpo com as respostas recolhidas. Campos sem resposta vão para "Casos por confirmar" em vez de ficarem vazios.
- `data_criacao`: data de hoje, formato AAAA-MM-DD.
- `modulos_validados`: lista vazia (nenhum módulo específico foi ainda validado nesta fase).
- Calcular o caminho de destino: `<raiz-do-template>/../<slug>/perfil-empresa.md`. Criar o diretório `<raiz-do-template>/../<slug>/` se não existir.
- Escrever o ficheiro.

## Passo 6 — Reportar e sugerir próximo passo

Confirmar o caminho do ficheiro criado, listar os módulos opcionais ativados (se algum), e sugerir a ordem recomendada para `/personalizar-modulo`: Equipas → Clientes → Planeamento → Execução → Aprovações → Mensagens → opcionais ativados.
