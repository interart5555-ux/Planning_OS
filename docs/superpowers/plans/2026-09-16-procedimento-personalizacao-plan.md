# Procedimento de Personalização — Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar as duas skills do Claude Code (`/personalizar-empresa` e `/personalizar-modulo`) que operacionalizam o procedimento de personalização do template AppOS, produzindo perfis de empresa e mockups de validação sem gerar nenhum código de aplicação.

**Architecture:** Duas skills em `.claude/skills/`, cada uma com um `SKILL.md` de orquestração e ficheiros estáticos de referência/template que carrega on-demand. `/personalizar-empresa` escreve `perfil-empresa.md` a partir de um template; `/personalizar-modulo <nome>` lê esse perfil, corre o questionário específico do módulo (reutilizando, para Execução/Aprovações, a narrativa "Ciclo de trabalho" já capturada), gera um mockup via Artifact, itera até aprovação, e grava `modulos/<nome>.md`.

**Tech Stack:** Claude Code skills (Markdown + frontmatter YAML), ferramenta Artifact (mockups HTML descartáveis), ferramenta AskUserQuestion (perguntas de escolha múltipla). Sem dependências de build/runtime — nenhum ficheiro em `src/` ou `preview/` é criado ou alterado por este plano.

**Spec:** `docs/superpowers/specs/2026-09-16-procedimento-personalizacao-design.md`

## Global Constraints

- **Correção pós-escrita (16/09/2026):** quando este plano foi escrito, o projeto não era um repositório git, por isso o texto original desta secção dizia "nenhum passo inclui `git commit`". Entretanto o utilizador pediu explicitamente para inicializar git, precisamente para que o workflow `subagent-driven-development` (que exige commit por tarefa para gerar os pacotes de revisão) pudesse funcionar como desenhado. Esta linha está mantida como registo histórico; a regra em vigor é a debaixo.
- O projeto é um repositório git (inicializado em 16/09/2026, branch `main`, com um commit de baseline). Cada tarefa deste plano termina com um `git commit` normal, como o workflow de execução exige. "Gravar"/"guardar" um ficheiro de personalização (`empresas/<slug>/...` ou, nos testes, `piloto-teste-verde/...`) continua a significar só escrever o ficheiro — esses ficheiros de teste são removidos no fim da Task 3, antes do commit final dessa tarefa, precisamente para não ficarem no histórico.
- As skills nunca leem nem escrevem `src/` ou `preview/` do template — o seu universo de ficheiros é `.claude/skills/personalizar-*/` (estático, parte deste plano) e `empresas/<slug>/` ou, durante os testes deste plano, `piloto-teste-verde/` (gerado em runtime, fora do template).
- Diretório de cada empresa: irmão da raiz do template — se o template está em `.../2_Sandbox/Planning_OS - V2/`, a empresa fica em `.../2_Sandbox/<slug>/`. A raiz do template é o diretório que contém `.claude/skills/`.
- Chaves internas dos módulos (frontmatter e ficheiros de referência): `equipas`, `clientes`, `planeamento`, `execucao`, `aprovacoes`, `mensagens`, `rendimentos`, `inventario`, `servicosLigados`. `onboarding` não é uma chave válida em `/personalizar-modulo` — o seu conteúdo é capturado em `/personalizar-empresa`.
- Módulos base (nunca perguntados "querem ativar?"): `equipas`, `clientes`, `planeamento`, `execucao`, `aprovacoes`, `mensagens`. Módulos opcionais (ativação sempre confirmada explicitamente): `rendimentos`, `inventario`, `servicosLigados`.
- Mockups são sempre gerados com a ferramenta Artifact — nunca como ficheiros HTML dentro do repositório do template ou da empresa.
- Antes de gerar qualquer Artifact, carregar a skill `artifact-design` (regra já existente no ambiente, não específica deste plano).

## File Structure

```
.claude/skills/
  personalizar-empresa/
    SKILL.md                        # orquestração: 6 passos
    reference-perfil-empresa.md     # perguntas estáticas (não editar por empresa)
    template-perfil-empresa.md      # esqueleto do ficheiro de saída
  personalizar-modulo/
    SKILL.md                        # orquestração: 9 passos
    reference-questionario-modulos.md  # padrão geral + 9 módulos
    template-modulo.md              # esqueleto do ficheiro de saída
```

---

### Task 1: Skill `personalizar-empresa`

**Files:**
- Create: `.claude/skills/personalizar-empresa/reference-perfil-empresa.md`
- Create: `.claude/skills/personalizar-empresa/template-perfil-empresa.md`
- Create: `.claude/skills/personalizar-empresa/SKILL.md`
- Test: nenhum ficheiro de teste automatizado — verificação por invocação real da skill (Passo de verificação abaixo). Não há framework de testes neste projeto porque o artefacto é uma skill de instruções, não código executável.

**Interfaces:**
- Produces: `empresas/<slug>/perfil-empresa.md` (ou, nos testes deste plano, `piloto-teste-verde/perfil-empresa.md`) com este esquema de frontmatter exato — Task 2 e Task 3 consomem estes nomes de campo tal como estão:
  - `empresa` (string), `slug` (string), `area_negocio` (string)
  - `vocabulario.trabalho.singular` / `.plural`
  - `vocabulario.local.singular` / `.plural`
  - `vocabulario.profissional.singular` / `.plural` / `.feminino`
  - `marca.nome_app`, `marca.cor_primaria`, `marca.tom`
  - `modulos_opcionais.rendimentos` / `.inventario` / `.servicosLigados` (bool)
  - `modulos_validados` (lista de chaves de módulo, string)
  - `data_criacao` (string AAAA-MM-DD)
  - Corpo com secções `## Processo de trabalho` (subsecções `### Equipas`, `### Clientes`, `### Planeamento`, `### Ciclo de trabalho (Execução + Aprovações)`, `### Mensagens`), `## Justificação dos módulos opcionais`, `## Casos por confirmar`.

- [ ] **Passo 1: Escrever `reference-perfil-empresa.md`**

```markdown
# Referência — Questionário do Perfil de Empresa

Usado por `SKILL.md` desta skill. Contém as perguntas estáticas a fazer; as respostas de uma empresa concreta vivem em `empresas/<slug>/perfil-empresa.md`, nunca aqui.

## 1. Identificação
- Nome da empresa.
- Slug (nome do diretório — kebab-case, sem acentos; propor um a partir do nome e confirmar).
- Área de negócio: limpezas / formação / manutenção / outra (se "outra", pedir uma descrição curta em texto livre).

## 2. Vocabulário-base
- Nome do "trabalho" — singular e plural (ex.: Limpeza/Limpezas, Sessão/Sessões, Intervenção/Intervenções).
- Nome do "local" — singular e plural (ex.: Alojamento/Alojamentos, Instalação/Instalações, Edifício/Edifícios).
- Nome do "profissional" — singular, plural, e forma feminina (ex.: Colaborador/Colaboradores/colaboradora).

## 3. Marca
- Nome a mostrar na app (ex.: "AppOS · <Nome>").
- Cor primária (pedir um hex; se não souberem, sugerir uma cor coerente com o setor e confirmar).
- Tom de comunicação: formal ou informal.

## 4. Processo de trabalho, módulo a módulo (só módulos base)

Uma pergunta de processo por módulo, de forma conversacional — não pedir tudo de uma vez:

- **Equipas** — Como estão organizadas as equipas/colaboradoras hoje? Fixas por cliente, rotativas, uma só pessoa a gerir tudo?
- **Clientes** — Como está estruturada a carteira: um cliente tem um ou vários locais? Há unidades dentro de cada local?
- **Planeamento** — Como decidem quem vai a que trabalho e quando? Manual, calendário, reservas externas (ex. Airbnb)?
- **Execução + Aprovações** — usar a narrativa guiada da secção 5 abaixo, não uma pergunta solta.
- **Mensagens** — Como comunicam hoje com a equipa e com os clientes no dia a dia? WhatsApp, telefone, papel?

Depois das seis respostas, derivar (não perguntar diretamente) o sinal de ativação dos módulos opcionais:
- Faturação/cobrança por trabalho mencionada em Execução ou Planeamento → candidato a **Rendimentos**.
- Produtos, materiais ou stock geridos mencionados → candidato a **Inventário**.
- Parceiro ou serviço externo mencionado (ex. lavandaria, subcontratação) → candidato a **Serviços ligados**.

Apresentar os candidatos encontrados e a frase que os motivou, e confirmar cada ativação explicitamente, um módulo de cada vez. Nunca marcar `true` em `modulos_opcionais` sem confirmação explícita para esse módulo específico.

## 5. Ciclo de trabalho: Execução + Aprovações

Pergunta única, mais profunda que as outras, porque cobre os dois módulos centrais do projeto:

> "Descreva o ciclo de vida de um trabalho típico, do início ao fim — desde o momento em que a colaboradora chega ao local até ao momento em que a gestora o dá como concluído."

Guiar com estas sub-perguntas, uma de cada vez, só se a resposta inicial não as cobrir:
1. Como começa — a colaboradora confirma que vai, há alguma preparação antes de chegar ao local?
2. Que passos são feitos no local, e em que ordem?
3. O que é registado durante o trabalho — fotos, quantidades, tempo, notas?
4. O que corre mal tipicamente, e como é registado nesse momento — incidência, atraso, dano, material em falta?
5. Como e quando a colaboradora dá o trabalho como "terminado"?
6. O que acontece a seguir — alguém revê sempre, ou só quando há um problema?
7. Se algo não está bem, o que acontece — pede-se correção, reabre-se o trabalho, outra coisa?

Guardar a narrativa completa (não um resumo) no campo "Ciclo de trabalho" do perfil — `/personalizar-modulo execucao` e `/personalizar-modulo aprovacoes` vão lê-la e decompor dela a checklist, os tipos de evidência, os tipos de anomalia e o critério de aprovação automática, sem voltar a perguntar o processo.

## Casos limite
- Se o utilizador não souber responder a um campo: perguntar se quer que se assuma a omissão mais próxima do domínio já existente no template (ex. limpezas). Se sim, preencher com essa omissão e marcar o campo em "Casos por confirmar" no ficheiro gravado.
- Nunca inventar uma resposta definitiva sem a marcar como assumida.
```

- [ ] **Passo 2: Escrever `template-perfil-empresa.md`**

```markdown
---
empresa: ""
slug: ""
area_negocio: ""
vocabulario:
  trabalho:
    singular: ""
    plural: ""
  local:
    singular: ""
    plural: ""
  profissional:
    singular: ""
    plural: ""
    feminino: ""
marca:
  nome_app: ""
  cor_primaria: ""
  tom: ""
modulos_opcionais:
  rendimentos: false
  inventario: false
  servicosLigados: false
modulos_validados: []
data_criacao: ""
---

# Perfil de Empresa — {{empresa}}

## Processo de trabalho

### Equipas

### Clientes

### Planeamento

### Ciclo de trabalho (Execução + Aprovações)

### Mensagens

## Justificação dos módulos opcionais

<!-- Para cada módulo opcional ativado ou recusado, citar a frase do processo
     que motivou a decisão. Se nenhum foi ativado, dizer isso explicitamente. -->

## Casos por confirmar

<!-- Campos onde se assumiu a omissão do domínio mais próximo, por o
     utilizador não saber responder. Vazio se não houver nenhum. -->
```

- [ ] **Passo 3: Escrever `SKILL.md`**

```markdown
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
```

- [ ] **Passo 4: Verificação — correr a skill com o piloto "Verde Manutenção"**

Numa sessão de Claude Code aberta na raiz do template, invocar `/personalizar-empresa` e responder exatamente com este guião (empresa fictícia de manutenção de jardins, escolhida por não ser nenhum dos 3 domínios pré-existentes no template — testa a genericidade):

- Nome: `Verde Manutenção`
- Slug: `piloto-teste-verde` (usar este slug exato, não o derivado automaticamente do nome, para que os passos seguintes o encontrem previsivelmente)
- Área de negócio: outra — "Manutenção de jardins e espaços verdes para condomínios"
- Vocabulário: trabalho = Intervenção/Intervenções; local = Condomínio/Condomínios; profissional = Jardineiro/Jardineiros/jardineira
- Marca: nome_app "AppOS · Verde"; cor primária `#2f7d3c`; tom informal
- Equipas: "Temos 3 equipas fixas por zona da cidade, cada uma com 2 jardineiros e uma responsável."
- Clientes: "Cada condomínio é um cliente único, normalmente só com um local, mas às vezes há várias zonas dentro do mesmo condomínio (jardim frontal, jardim das traseiras, piscina) que tratamos como unidades separadas."
- Planeamento: "A gestora marca manualmente num calendário semanal, sem reservas externas — a frequência é fixa (ex. quinzenal) por contrato."
- Ciclo de trabalho: "O jardineiro chega ao condomínio, tira uma foto do estado inicial, faz a lista de tarefas (cortar relva, podar, regar, limpar folhas caídas), regista se falta algum material, e no fim tira fotos do resultado. Se houver um problema grande (ex. árvore doente), regista como incidência com foto e descrição. A gestora só revê se houver incidência ou se o jardineiro demorar muito mais que o previsto; senão é aprovado automaticamente."
- Mensagens: "Uso o WhatsApp para tudo — não há um sistema formal."

Este guião menciona gestão de material (sinal de Inventário) mas não faturação por trabalho nem parceiros externos — a skill deve propor **só** Inventário como candidato opcional. Confirmar "sim" a essa proposta.

Verificar `piloto-teste-verde/perfil-empresa.md`:
```bash
FILE="<caminho-da-raiz-do-template>/../piloto-teste-verde/perfil-empresa.md"
grep -q 'empresa: "Verde Manutenção"' "$FILE"
grep -q 'slug: "piloto-teste-verde"' "$FILE"
grep -q 'singular: "Intervenção"' "$FILE"
grep -q 'singular: "Condomínio"' "$FILE"
grep -q 'feminino: "jardineira"' "$FILE"
grep -q 'nome_app: "AppOS · Verde"' "$FILE"
grep -q 'inventario: true' "$FILE"
grep -q 'rendimentos: false' "$FILE"
grep -q 'servicosLigados: false' "$FILE"
grep -q 'modulos_validados: \[\]' "$FILE"
grep -qi 'aprovado automaticamente' "$FILE"
```
Expected: todos os `grep` encontram uma correspondência (exit code 0). Se algum falhar, corrigir o `SKILL.md`/template antes de continuar — não avançar para a Task 2 com este passo a falhar.

Não apagar `piloto-teste-verde/` no fim desta tarefa — a Task 2 continua a usá-lo.

---

### Task 2: Skill `personalizar-modulo`

**Files:**
- Create: `.claude/skills/personalizar-modulo/reference-questionario-modulos.md`
- Create: `.claude/skills/personalizar-modulo/template-modulo.md`
- Create: `.claude/skills/personalizar-modulo/SKILL.md`
- Test: verificação por invocação real da skill (Passo de verificação abaixo), reutilizando a empresa-piloto criada na Task 1.

**Interfaces:**
- Consumes: `piloto-teste-verde/perfil-empresa.md` produzido na Task 1, com exatamente os nomes de campo listados nas Interfaces da Task 1.
- Produces: `empresas/<slug>/modulos/<modulo>.md` (ou, no teste, `piloto-teste-verde/modulos/<modulo>.md`) com este esquema:
  - Frontmatter: `empresa`, `modulo`, `ativado` (bool), `data_validacao`, `mockup_url`.
  - Corpo: `## Respostas`, `## Casos por confirmar`, `## Histórico de iterações`.
  - Efeito colateral: acrescenta `<modulo>` a `modulos_validados` em `perfil-empresa.md` (lista, sem duplicar).

- [ ] **Passo 1: Escrever `reference-questionario-modulos.md`**

```markdown
# Referência — Questionário Módulo a Módulo

Usado por `SKILL.md` desta skill. Contém o padrão geral e as perguntas específicas de cada um dos 9 módulos personalizáveis. As respostas de uma empresa concreta vivem em `empresas/<slug>/modulos/<nome>.md`, nunca aqui.

## Padrão geral

Além do vocabulário-base já herdado de `perfil-empresa.md`, cada módulo cobre:

1. **Vocabulário específico** — termos que não são o job/location/person genérico.
2. **Checklist/processo próprio** — para módulos com tarefas ou passos: a lista real desta empresa, não a genérica de limpezas.
3. **Regras de negócio ajustáveis** — valores hoje fixos como constantes no código do template (ex. tolerância de atraso, custo de produto), perguntados como "qual o valor certo para vocês?".
4. **Features do módulo** — coisas hoje on/off no template (ex. cronómetro em tempo real) — precisam já, ou fica para depois?
5. **Casos especiais** — campo livre para nuances que não cabem nos anteriores.

**Exceção — Execução e Aprovações:** o ponto 2 (checklist/processo) não se pergunta aqui. Vem da narrativa "Ciclo de trabalho" já gravada em `perfil-empresa.md` (secção "Ciclo de trabalho (Execução + Aprovações)"). Ler essa secção primeiro e decompô-la — não voltar a perguntar "como funciona o vosso processo".

## equipas
- Como chamam os papéis (Admin/Gestor/Colaborador) — nomes reais usados na empresa.
- Modelo de equipa: fixas por cliente/zona, ou atribuição rotativa dia a dia?
- Que tipos de ausência existem de facto (férias, folga, baixa, formação, outro) e se há aprovação formal ou é informal.
- Modelo de pagamento: valor/hora fixo, salário, por tarefa?
- Como é dado acesso a uma nova colaboradora hoje (convite formal, ensino direto)?

## clientes
- Vocabulário: o "local" pode chamar-se "instalação", "edifício", "sala" consoante o domínio — confirmar o termo já capturado no perfil de empresa.
- Um cliente tem tipicamente um ou vários locais? Um local tem tipicamente uma ou várias unidades?
- Há horários de entrada/saída relevantes (check-in/check-out), ou o conceito não se aplica?
- Usam alguma plataforma de reservas externa (Airbnb, Booking) que precise sincronizar?
- Quem fornece o que é usado no local — a empresa ou o cliente?

## planeamento
- Vista mais usada no dia a dia: dia, semana ou mês?
- Quantos trabalhos/horas uma pessoa consegue tipicamente fazer por dia (para alertas de pico de capacidade)?
- Há casos de "saída e entrada no mesmo dia" (virada rápida) que sejam críticos?
- As colaboradoras veem o plano só depois de "publicado", ou em tempo real?

## execucao
Ler primeiro a secção "Ciclo de trabalho" em `perfil-empresa.md` e confirmar/ajustar:
- A checklist e os tipos de foto tal como saíram da narrativa — falta algum passo, ou há algum que não se aplica sempre?

Depois perguntar o que falta:
- Precisam de cronómetro em tempo real, ou basta registar hora de início/fim?
- As colaboradoras trabalham em zonas sem internet com frequência (relevante para o modo offline)?

## aprovacoes
Ler primeiro a secção "Ciclo de trabalho" em `perfil-empresa.md` e confirmar/ajustar:
- Os tipos de anomalia e quando um trabalho é aprovado automaticamente vs. quando obriga revisão, tal como saíram da narrativa.

Depois perguntar o que falta:
- Rótulo da diferença de quantidades (ex. "Roupa em falta" vs "Diferença de materiais") e se só conta falhas ou também excessos.
- Minutos de tolerância acima do previsto antes de "Duração excedida"?
- Quem pode aprovar, pedir correção ou reabrir um trabalho?

## mensagens
- Canais reais usados hoje (WhatsApp, telefone, papel, outro).
- Quem fala com quem: a colaboradora fala diretamente com o cliente, ou só com a gestora?
- Que tipos de aviso fazem sentido (ex. stock baixo, confirmação de leitura, próximo trabalho).

## rendimentos (opcional)
- Ciclo de faturação: semanal, mensal, período customizado?
- Prazo de pagamento (dias até vencimento)?
- Modelo de custo de equipa: só valor/hora, ou com deslocações à parte?
- O que conta como alerta de saúde financeira (limites de margem, atraso de recebimento)?

## inventario (opcional)
- Confirmar com o que já veio do processo de trabalho: há stock, é da empresa, do cliente, ou ambos?
- Categorias de produtos relevantes.
- Tipos de local de stock (armazém, carrinha, local do cliente...).
- Limite do suplemento cobrado por trabalho quando a empresa fornece produtos?
- Processo de encomenda a fornecedores: formal ou informal?

## servicosLigados (opcional, sem implementação de referência no template)
- Que parceiros externos existem (lavandaria, subcontratação, outro).
- Como funciona hoje esse processo (envio, receção, faturação do parceiro).
- Nota para quem responde ao questionário: este módulo não tem ecrãs de referência no template — o mockup gerado desenha requisitos de raiz, não adapta ecrãs existentes.
```

- [ ] **Passo 2: Escrever `template-modulo.md`**

```markdown
---
empresa: ""
modulo: ""
ativado: true
data_validacao: ""
mockup_url: ""
---

# {{Nome do módulo}} — {{empresa}}

## Respostas

<!-- Uma entrada por pergunta do questionário deste módulo, formato
     "**Pergunta** — resposta". -->

## Casos por confirmar

<!-- Campos marcados "não sei, decide tu", se existirem. Vazio se não houver nenhum. -->

## Histórico de iterações

<!-- Ajustes pedidos ao mockup até aprovação, se relevante. Vazio se aprovado
     na primeira versão. -->
```

- [ ] **Passo 3: Escrever `SKILL.md`**

```markdown
---
name: personalizar-modulo
description: Use when personalizing one specific AppOS template module (equipas, clientes, planeamento, execucao, aprovacoes, mensagens, rendimentos, inventario, or servicosLigados) to a company's reality. Runs that module's questionnaire, generates a validation mockup via Artifact, iterates with the user until approved, and records the validated module profile. Requires a company profile from /personalizar-empresa first.
---

# Personalizar Módulo

Personaliza um módulo específico do template AppOS para uma empresa já identificada por `/personalizar-empresa`. Corre-se uma vez por módulo, em qualquer ordem, em qualquer sessão. Nunca lê nem escreve `src/` ou `preview/` do template — só produz um documento em `empresas/<slug>/modulos/` e um mockup Artifact.

## Passo 1 — Identificar o módulo pedido

O argumento passado a esta skill é o nome do módulo. Normalizar para uma das 9 chaves internas: `equipas`, `clientes`, `planeamento`, `execucao`, `aprovacoes`, `mensagens`, `rendimentos`, `inventario`, `servicosLigados` (aceitar variações óbvias em português/maiúsculas — ex. "Aprovações" → `aprovacoes`, "inventário" → `inventario`). Se o argumento não corresponder a nenhuma das 9, listar as opções e pedir para escolher.

`onboarding` não é uma opção válida aqui — o seu conteúdo já é capturado por `/personalizar-empresa`.

## Passo 2 — Localizar a empresa ativa

A raiz do template é o diretório que contém `.claude/skills/personalizar-modulo/` (este ficheiro); o diretório de cada empresa é irmão dessa raiz.

- Se a conversa já identificou uma empresa em curso, ou existir só um diretório-empresa candidato ao lado do template, usar esse.
- Caso contrário, perguntar o nome/slug da empresa.
- Procurar `<raiz-do-template>/../<slug>/perfil-empresa.md`.
  - Se não existir, avisar o utilizador e oferecer invocar `/personalizar-empresa` primeiro. Não continuar com um perfil implícito ou parcial.

## Passo 3 — Ler o perfil de empresa

Ler `perfil-empresa.md` da empresa: vocabulário-base, marca, `modulos_opcionais`, e — se o módulo pedido for `execucao` ou `aprovacoes` — a secção "Ciclo de trabalho (Execução + Aprovações)".

## Passo 4 — Confirmar ativação (só módulos opcionais)

Se o módulo pedido for `rendimentos`, `inventario` ou `servicosLigados` e `modulos_opcionais.<modulo>` for `false` no perfil, perguntar: "Este módulo não está marcado como necessário no perfil da empresa. Querem ativá-lo agora?". Se sim, atualizar esse campo para `true` em `perfil-empresa.md` antes de continuar. Se não, terminar sem gerar mockup nem gravar ficheiro.

## Passo 5 — Ler o questionário de referência

Ler `reference-questionario-modulos.md` (na mesma pasta deste ficheiro). Ir à secção "Padrão geral" e depois à secção com o nome exato do módulo pedido.

- Para `execucao` e `aprovacoes`: seguir a exceção do padrão geral — não repetir a pergunta de processo; decompor a narrativa "Ciclo de trabalho" já lida no Passo 3 nos campos concretos (checklist, tipos de evidência, tipos de anomalia, critério de aprovação automática) e confirmar com o utilizador que a decomposição está correta antes de avançar, só depois perguntando os campos mecânicos restantes dessa secção.
- Para os restantes módulos: perguntar os pontos da secção do módulo, um de cada vez.

Aplicar os mesmos casos limite do perfil de empresa: se não souber responder, assumir a omissão do domínio mais próximo e marcar em "Casos por confirmar". Se uma resposta contradisser o perfil de empresa, sinalizar o conflito ao utilizador em vez de o resolver silenciosamente.

## Passo 6 — Gerar o mockup

Antes de publicar, carregar a skill `artifact-design` (e `artifact-diagramming`/`artifact-capabilities` só se forem mesmo necessárias), como para qualquer Artifact.

- Um Artifact HTML, com 2 a 4 ecrãs-chave deste módulo que mostrem as decisões tomadas (vocabulário, checklist/regras, marca) — não é preciso reproduzir a app toda.
- Vocabulário, marca e regras aplicados exatamente como capturados nas respostas.
- Dados de exemplo coerentes com o processo descrito por esta empresa — usar nomes/locais/situações que apareçam nas respostas, não os "Lisboa/Porto" genéricos do template.
- Publicar com a ferramenta Artifact (`action: publish`), favicon e descrição adequados ao módulo.

## Passo 7 — Validar com o utilizador

Mostrar o link e perguntar se está aprovado. Se pedirem ajustes, voltar ao Passo 6 e republicar sobre o mesmo `url` (nunca criar um Artifact novo a cada iteração). Registar cada pedido de ajuste para o "Histórico de iterações" do ficheiro final.

## Passo 8 — Gravar o módulo validado

- Ler `template-modulo.md` (na mesma pasta).
- Preencher todos os campos de frontmatter e secções do corpo: `empresa` (slug), `modulo` (chave), `ativado` (true, ou o valor confirmado no Passo 4), `data_validacao` (hoje, AAAA-MM-DD), `mockup_url` (link do Artifact aprovado), respostas do questionário, casos por confirmar, histórico de iterações.
- Escrever em `<raiz-do-template>/../<slug>/modulos/<modulo>.md` (criar a pasta `modulos/` se não existir).
- Atualizar `perfil-empresa.md`: acrescentar `<modulo>` a `modulos_validados` (sem duplicar, se já lá estiver).

## Passo 9 — Reportar e sugerir próximo passo

Confirmar o caminho do ficheiro gravado e o link do mockup. Olhar para `modulos_validados` em `perfil-empresa.md` e sugerir o próximo módulo por validar, seguindo a ordem recomendada: Equipas → Clientes → Planeamento → Execução → Aprovações → Mensagens → opcionais ativados.
```

- [ ] **Passo 4: Verificação — `/personalizar-modulo equipas` sobre a empresa-piloto**

Na mesma sessão (ou reabrindo, reconhecendo `piloto-teste-verde/` já existente), invocar `/personalizar-modulo equipas` e responder:
- Papéis: "Gestora, Responsável de equipa, Jardineiro."
- Modelo de equipa: "Fixas por zona da cidade."
- Ausências: "Férias e folgas, com pedido informal à gestora por WhatsApp."
- Pagamento: "Valor/hora fixo."
- Acesso: "A gestora ensina diretamente no primeiro dia, sem convite formal."

Aprovar o mockup gerado na primeira versão.

Verificar `piloto-teste-verde/modulos/equipas.md`:
```bash
FILE="<caminho-da-raiz-do-template>/../piloto-teste-verde/modulos/equipas.md"
grep -q 'empresa: "piloto-teste-verde"' "$FILE"
grep -q 'modulo: "equipas"' "$FILE"
grep -q 'ativado: true' "$FILE"
grep -qi 'mockup_url: "https' "$FILE"
grep -qi 'Jardineiro' "$FILE"
```
Expected: todos os `grep` encontram uma correspondência.

Verificar também `piloto-teste-verde/perfil-empresa.md`:
```bash
grep -q 'modulos_validados: \[equipas\]' "<...>/piloto-teste-verde/perfil-empresa.md"
```
(ou formato de lista YAML equivalente, ex. `modulos_validados:\n  - equipas` — aceitar qualquer um; ajustar o `SKILL.md` para ser consistente com o formato escolhido em `template-perfil-empresa.md`.)

Não apagar `piloto-teste-verde/` no fim desta tarefa — a Task 3 continua a usá-lo.

---

### Task 3: Cobertura de casos restantes e limpeza final

**Files:**
- Nenhum ficheiro novo do produto — só o resto do diretório de teste `piloto-teste-verde/`, removido no último passo.

**Interfaces:**
- Consumes: skills completas das Task 1 e Task 2.
- Produces: confirmação de que o procedimento cobre módulo opcional ativado, módulo opcional recusado, e que o template nunca é tocado.

- [ ] **Passo 1: Módulo opcional já sinalizado — `inventario`**

Invocar `/personalizar-modulo inventario` (já `true` em `modulos_opcionais` desde a Task 1) e responder:
- Confirmação do stock: "Sim, temos stock de sementes, adubo e ferramentas pequenas, tudo da empresa — os condomínios não têm stock próprio."
- Categorias: "Sementes, adubos, ferramentas pequenas, combustível para máquinas."
- Locais de stock: "Um armazém central e a carrinha de cada equipa."
- Suplemento por trabalho: "Não cobramos suplemento — está incluído no contrato mensal."
- Encomendas: "Informal, a responsável de equipa avisa a gestora por WhatsApp quando falta algo."

Aprovar o mockup na primeira versão. Verificar:
```bash
FILE="<...>/piloto-teste-verde/modulos/inventario.md"
grep -q 'modulo: "inventario"' "$FILE"
grep -qi 'armazém' "$FILE"
```
Expected: ambos encontram correspondência.

- [ ] **Passo 2: Módulo opcional não sinalizado — `rendimentos`**

Invocar `/personalizar-modulo rendimentos` (ainda `false` em `modulos_opcionais`). Confirmar que a skill segue o Passo 4 do seu `SKILL.md`: pergunta explicitamente se quer ativar antes de mostrar qualquer questionário ou gerar mockup. Responder "não".

Verificar que **não** foi criado `piloto-teste-verde/modulos/rendimentos.md`:
```bash
test ! -f "<...>/piloto-teste-verde/modulos/rendimentos.md" && echo "OK: não criado"
```
Expected: imprime "OK: não criado". Se o ficheiro existir, o Passo 4 do `SKILL.md` de `personalizar-modulo` está a ignorar a confirmação de ativação — corrigir antes de continuar.

- [ ] **Passo 3: Confirmar que o template não foi tocado**

Antes de começar a Task 1, não foi registado um "estado zero" — para este passo, confirmar por inspeção que os únicos ficheiros criados por todo este plano estão dentro de `.claude/skills/personalizar-empresa/`, `.claude/skills/personalizar-modulo/` e `piloto-teste-verde/`:
```bash
find "<raiz-do-template>/src" "<raiz-do-template>/preview" -newer "<raiz-do-template>/docs/superpowers/specs/2026-09-16-procedimento-personalizacao-design.md"
```
Expected: sem output (nenhum ficheiro em `src/` ou `preview/` mais recente do que o spec, ou seja, nenhum foi tocado durante a implementação).

- [ ] **Passo 4: Limpeza do diretório de teste**

Confirmar o conteúdo antes de remover:
```bash
ls -R "<raiz-do-template>/../piloto-teste-verde"
```
Expected: só `perfil-empresa.md` e `modulos/{equipas.md,inventario.md}` (mais nada — se houver algo inesperado, investigar antes de apagar).

Remover o diretório de teste por completo:
```bash
rm -rf "<raiz-do-template>/../piloto-teste-verde"
```

Isto encerra o plano: as duas skills ficam prontas para uso real em `.claude/skills/`, e o diretório de teste não deixa rasto fora dele.
