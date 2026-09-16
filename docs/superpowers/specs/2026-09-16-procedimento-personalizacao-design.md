# Procedimento de Personalização — Design

Data: 16 de setembro de 2026.

## Objetivo

`Planning_OS - V2` deixa de ser vista como "a app" e passa a ser vista como **o template**: uma estrutura de 10 módulos, reutilizável para qualquer empresa cujo trabalho se organize em "cliente → local → equipa → trabalho agendado → execução → validação", independentemente do domínio concreto (limpezas, formação, manutenção, ou outro).

Este documento desenha um **procedimento de personalização**: uma forma repetível de, para uma empresa concreta, capturar a sua realidade módulo a módulo e produzir mockups visuais que validam essa personalização — sem escrever código de aplicação. O código só é desenvolvido depois de os módulos relevantes estarem validados; este spec cobre apenas o procedimento de captura e validação.

O procedimento fica formalizado como **duas skills do Claude Code**, reutilizáveis para qualquer nova empresa: `/personalizar-empresa` (uma vez por empresa) e `/personalizar-modulo <nome>` (repetível, um módulo de cada vez, em qualquer ordem, em qualquer sessão).

## Arquitetura geral

```
2_Sandbox/
  Planning_OS - V2/          ← o template (este projeto). Nunca é alterado
    src/  preview/  docs/       pelo procedimento — fica sempre genérico.
    .claude/skills/
      personalizar-empresa/
      personalizar-modulo/

  <nome-empresa>/             ← criado pelo procedimento, irmão do template
    perfil-empresa.md
    modulos/
      equipas.md
      clientes.md
      planeamento.md
      ...
```

Cada empresa personalizada vive no seu **próprio diretório, irmão do template** (dentro de `2_Sandbox/`), não numa subpasta de `docs/`. Duas razões:

1. `docs/` é documentação sobre o próprio template (ex.: `fase-1-fecho.md`, `levantamento-modulos.md`); misturar aí dados de clientes concretos suja essa pasta à medida que forem aparecendo empresas.
2. Dentro da app, "Cliente" já tem um significado próprio (o cliente do módulo 3). Chamar "clientes" à pasta das empresas que personalizam o template colidiria com esse vocabulário — por isso usa-se **"empresas"**, o mesmo termo que o próprio Módulo 1 ("Empresa e utilizadores") já usa.

O diretório de cada empresa é criado **antes** de haver qualquer código — contém só os documentos de personalização. Quando, numa fase posterior, se decidir avançar para código para essa empresa, o template (`src/`, `preview/`) é copiado para dentro desse mesmo diretório, ao lado dos perfis já validados, em vez de se moverem ficheiros mais tarde. O projeto não é atualmente um repositório git, pelo que esta cópia é uma cópia de ficheiros simples, não um fork/branch.

## Fluxo de alto nível

```
1ª vez para uma empresa nova:
  /personalizar-empresa
    → Q&A: identificação, vocabulário-base, marca, processo por módulo base
    → grava empresas/<slug>/perfil-empresa.md

Por cada módulo, em qualquer ordem, em qualquer sessão:
  /personalizar-modulo <nome>
    → lê perfil-empresa.md (corre uma versão mínima de /personalizar-empresa
      na hora, se ainda não existir)
    → confirma ativação, se for módulo opcional
    → Q&A específica do módulo (só o que não foi já herdado do perfil)
    → gera mockup (Artifact HTML) com o vocabulário/marca/regras aplicados
    → utilizador aprova, ou pede ajustes → repete até aprovação
    → grava empresas/<slug>/modulos/<nome>.md e assinala o módulo
      como validado em perfil-empresa.md
```

Não há ordem obrigatória entre módulos nem é preciso validar todos de uma vez — a empresa avança para a fase de código com os módulos que estiverem validados, mesmo que não sejam todos. Ordem sugerida por omissão (uns dão contexto aos outros): **Equipas → Clientes → Planeamento → Execução → Aprovações → Mensagens → opcionais**.

## `/personalizar-empresa` — Perfil de Empresa

Intake de uma vez só, antes de qualquer módulo. Quase todos os `config.ts` que já existem no template (Aprovações, Execução, Rendimentos, Planeamento, Clientes) partilham a mesma forma de vocabulário — `job.singular/plural`, `location.singular/plural`, `unit`, `person.singular/plural/feminine`. Este vocabulário é capturado **uma vez** aqui, e cada módulo herda-o como omissão, só perguntando o que for específico dele.

Campos:

1. **Identificação** — nome da empresa, slug (nome do diretório), área de negócio (limpezas / formação / manutenção / outra — se "outra", descrição livre).
2. **Vocabulário-base** — nome do "trabalho" (ex. Limpeza/Sessão/Intervenção), nome do "local" (Alojamento/Instalação/Edifício), nome do "profissional" (Colaborador/Formador/Técnico).
3. **Marca** — nome a mostrar na app, cor primária, tom de comunicação (formal/informal).
4. **Processo de trabalho, módulo a módulo** — só para os módulos base (nunca para os opcionais). Não é um checklist; é uma pergunta de processo por módulo, através de perguntas abertas orientadoras:
   - **Equipas** — como estão organizadas as equipas/colaboradoras hoje? Fixas por cliente, rotativas, uma só pessoa a gerir tudo?
   - **Clientes** — como está estruturada a carteira: um cliente tem um ou vários locais? Há unidades dentro de cada local?
   - **Planeamento** — como decidem quem vai a que trabalho e quando? Manual, calendário, reservas externas (ex. Airbnb)?
   - **Execução + Aprovações** — estes dois módulos são o propósito central do projeto (fazer o trabalho, depois validá-lo), por isso não levam uma pergunta solta como os restantes: levam uma narrativa guiada só deles — ver "Ciclo de trabalho: Execução + Aprovações" a seguir.
   - **Mensagens** — como comunicam hoje com a equipa e com os clientes no dia a dia? WhatsApp, telefone, papel?

   Destas respostas deriva-se o sinal para ativar (ou não) os módulos opcionais — não se pergunta diretamente "querem Rendimentos/Inventário/Serviços ligados?": se surgir faturação por trabalho, aponta para **Rendimentos**; se surgir gestão de stock, aponta para **Inventário**; se surgir um parceiro externo (ex. lavandaria), aponta para **Serviços ligados**. A decisão final de ativação é confirmada com o utilizador, não assumida silenciosamente.

### Ciclo de trabalho: Execução + Aprovações

Execução e Aprovações são duas metades do mesmo ciclo — uma faz o trabalho, a outra confirma que ficou bem feito — por isso, ao contrário dos outros módulos base, não recebem uma pergunta de processo solta cada: recebem uma única narrativa mais profunda, recolhida aqui no perfil de empresa.

Pergunta-se: **"Descreva o ciclo de vida de um trabalho típico, do início ao fim — desde o momento em que a colaboradora chega ao local até ao momento em que a gestora o dá como concluído."** Guiada por:

- Como começa — a colaboradora confirma que vai, há alguma preparação antes de chegar ao local?
- Que passos são feitos no local, e em que ordem?
- O que é registado durante o trabalho — fotos, quantidades, tempo, notas?
- O que corre mal tipicamente, e como é registado nesse momento — incidência, atraso, dano, material em falta?
- Como e quando a colaboradora dá o trabalho como "terminado"?
- O que acontece a seguir — alguém revê sempre, ou só quando há um problema?
- Se algo não está bem, o que acontece — pede-se correção, reabre-se o trabalho, outra coisa?

Esta narrativa é a fonte de verdade para os dois módulos: os passos no local tornam-se a checklist do Módulo 5; o que é registado torna-se os tipos de evidência dos Módulos 5 e 6; o que corre mal torna-se os tipos de anomalia do Módulo 6; e "alguém revê sempre, ou só quando há problema" torna-se o critério de aprovação automática do Módulo 6. `/personalizar-modulo execucao` e `/personalizar-modulo aprovacoes` não voltam a perguntar "como funciona o vosso processo" — cada um decompõe a parte da narrativa que lhe interessa e só pergunta os campos mecânicos que sobram (ver secções 5 e 6 do questionário módulo a módulo).

O Módulo 1 (Onboarding/Empresa) não tem questionário próprio em `/personalizar-modulo` — o seu conteúdo (nome, NIF, contacto, morada da empresa) é, na prática, o mesmo que o ponto 1 deste perfil; não há personalização de vocabulário ou regras de negócio a fazer aí além da identificação já aqui capturada.

## `/personalizar-modulo <nome>` — fluxo interno

1. **Localizar a empresa ativa** — se corrido de dentro de `2_Sandbox/<empresa>/` (onde já existe `perfil-empresa.md`), usa essa; caso contrário pede o nome/slug. Se `perfil-empresa.md` não existir, oferece correr `/personalizar-empresa` primeiro.
2. **Ler o perfil de empresa** — vocabulário-base, marca, e a resposta de processo desse módulo (se for módulo base) como ponto de partida.
3. **Confirmar ativação** — se o módulo é opcional e o perfil de empresa não o sinalizou como necessário, pergunta se querem ativá-lo agora antes de continuar.
4. **Questionário específico do módulo** — ver padrão e lista módulo a módulo abaixo.
5. **Gerar mockup** (Artifact HTML) — ecrãs-chave desse módulo, com o vocabulário/marca/regras aplicados e dados de exemplo coerentes com o processo descrito (não os "Lisboa/Porto" genéricos do template).
6. **Validar** — aprova, ou pede ajustes e volta ao passo 4/5 até aprovação. Pedidos de ajuste republicam o mesmo Artifact (mesmo link), em vez de gerar um novo a cada iteração.
7. **Gravar** `empresas/<slug>/modulos/<nome>.md` (respostas + link do mockup aprovado + data) e assinala o módulo como validado em `perfil-empresa.md`.

### Casos limite

- **Não sabe responder** — pode dizer "não sei, decide tu"; usa-se a omissão do domínio mais próximo já existente no template (ex. limpezas) e o campo fica marcado como "por confirmar" no ficheiro gravado, em vez de se inventar uma resposta definitiva.
- **Contradição com o perfil de empresa** — se uma resposta dada a um módulo contradisser o perfil de empresa, o conflito é sinalizado ao utilizador, não resolvido silenciosamente.

## Questionário por módulo — padrão

Além do vocabulário-base herdado do perfil de empresa, cada módulo cobre:

1. **Vocabulário específico** — termos que não são o job/location/person genérico.
2. **Checklist/processo próprio** — para módulos com tarefas ou passos: a lista real desta empresa, não a genérica de limpezas.
3. **Regras de negócio ajustáveis** — valores hoje fixos como constantes no código (ex. `DURATION_TOLERANCE`, `PRODUCT_COST`, `LATE_AFTER_MIN`), perguntados como "qual o valor certo para vocês?".
4. **Features do módulo** — coisas hoje on/off no código (ex. `EXEC_FEATURES.timer`) — precisam já, ou fica para depois?
5. **Casos especiais** — campo livre para nuances que não cabem nos anteriores.

Exceção: em **Execução** e **Aprovações**, o ponto 2 (checklist/processo) não é perguntado aqui — já vem da narrativa "Ciclo de trabalho" recolhida no perfil de empresa (ver secção anterior). O questionário desses dois módulos serve só para confirmar/ajustar essa narrativa e preencher os campos mecânicos que sobram (pontos 3 e 4).

## Questionário módulo a módulo

### 2 · Equipas
- Como chamam os papéis (Admin/Gestor/Colaborador) — nomes reais usados na empresa.
- Modelo de equipa: fixas por cliente/zona, ou atribuição rotativa dia a dia?
- Que tipos de ausência existem de facto (férias, folga, baixa, formação, outro) e se há aprovação formal ou é informal.
- Modelo de pagamento: valor/hora fixo, salário, por tarefa?
- Como é dado acesso a uma nova colaboradora hoje (convite formal, ensino direto)?

### 3 · Clientes, alojamentos e unidades
- Vocabulário: "alojamento" pode ser "instalação", "edifício", "sala" consoante o domínio.
- Um cliente tem tipicamente um ou vários locais? Um local tem tipicamente uma ou várias unidades?
- Há horários de entrada/saída relevantes (check-in/check-out), ou o conceito não se aplica?
- Usam alguma plataforma de reservas externa (Airbnb, Booking) que precise sincronizar?
- Quem fornece o que é usado no local — a empresa ou o cliente?

### 4 · Planeamento
- Vista mais usada no dia a dia: dia, semana ou mês?
- Quantos trabalhos/horas uma pessoa consegue tipicamente fazer por dia (para alertas de pico de capacidade)?
- Há casos de "saída e entrada no mesmo dia" (virada rápida) que sejam críticos?
- As colaboradoras veem o plano só depois de "publicado", ou em tempo real?

### 5 · Execução
Checklist de tarefas e tipos de evidência (fotos) vêm diretamente da narrativa "Ciclo de trabalho" do perfil de empresa — este passo confirma/ajusta esse detalhe e pergunta só o que falta:
- Confirmar a checklist e os tipos de foto tal como saíram da narrativa — falta algum passo, ou há algum que não se aplica sempre?
- Precisam de cronómetro em tempo real, ou basta registar hora de início/fim?
- As colaboradoras trabalham em zonas sem internet com frequência (relevante para o modo offline)?

### 6 · Aprovações
Os tipos de anomalia e o critério de aprovação automática vêm diretamente da narrativa "Ciclo de trabalho" do perfil de empresa — este passo confirma/ajusta esse detalhe e pergunta só o que falta:
- Confirmar os tipos de anomalia e quando um trabalho é aprovado automaticamente vs. quando obriga revisão, tal como saíram da narrativa.
- Rótulo da diferença de quantidades (ex. "Roupa em falta" vs "Diferença de materiais") e se só conta falhas ou também excessos.
- Minutos de tolerância acima do previsto antes de "Duração excedida" (hoje fixo em 30).
- Quem pode aprovar, pedir correção ou reabrir um trabalho.

### 10 · Mensagens
- Canais reais usados hoje (WhatsApp, telefone, papel, outro).
- Quem fala com quem: a colaboradora fala diretamente com o cliente, ou só com a gestora?
- Que tipos de aviso fazem sentido (ex. stock baixo, confirmação de leitura, próximo trabalho).

### 7 · Rendimentos (opcional)
- Ciclo de faturação: semanal, mensal, período customizado?
- Prazo de pagamento (dias até vencimento)?
- Modelo de custo de equipa: só valor/hora, ou com deslocações à parte?
- O que conta como alerta de saúde financeira (limites de margem, atraso de recebimento)?

### 8 · Inventário (opcional)
- Confirmar com o que já veio do processo de trabalho: há stock, é da empresa, do cliente, ou ambos?
- Categorias de produtos relevantes.
- Tipos de local de stock (armazém, carrinha, local do cliente...).
- Limite do suplemento cobrado por trabalho quando a empresa fornece produtos (hoje fixo em €20).
- Processo de encomenda a fornecedores: formal ou informal?

### 9 · Serviços ligados (opcional, sem código no template ainda)
- Que parceiros externos existem (lavandaria, subcontratação, outro).
- Como funciona hoje esse processo (envio, receção, faturação do parceiro).
- Nota: sem implementação de referência no template — aqui o mockup serve para desenhar requisitos de raiz, não para adaptar ecrãs existentes.

## Mockups

Um Artifact HTML por módulo, com os ecrãs-chave desse módulo já com o vocabulário/marca/regras aplicados e dados de exemplo tirados da descrição real do processo desta empresa. Não têm ligação a `src/`/`preview/` do template nem a lógica real — são visualização estática para validação. Pedidos de ajuste republicam o mesmo Artifact.

## Armazenamento

```
empresas/<slug>/
  perfil-empresa.md          # identificação, vocabulário-base, marca,
                              # processo por módulo base, módulos opcionais ativados
  modulos/
    <nome>.md                # respostas do questionário + link do mockup
                              # aprovado + data de validação
```

## Critério de "validado"

Um módulo fica validado quando o utilizador aprova explicitamente o mockup gerado. Não há validação automática ou implícita. A empresa passa para a fase de código com os módulos que estiverem validados nesse momento — não é preciso validar os 10 de uma vez.

## Fora de âmbito deste spec

- Geração de código de aplicação a partir dos perfis validados (fase seguinte, só depois de validado).
- Implementação do módulo 9 (Serviços ligados) no template.
- Mecanismo de introspeção automática de `config.ts`/`types.ts` para derivar perguntas (mencionado como possível evolução futura, não necessário agora — os questionários acima já cobrem os 9 módulos personalizáveis).

## Próximos passos

Este documento cobre o design do procedimento. A implementação em si — os ficheiros das skills `/personalizar-empresa` e `/personalizar-modulo` dentro de `.claude/skills/` — é trabalho a planear separadamente (via writing-plans), depois de este spec ser revisto. Isto não conflitua com "o código só é desenvolvido depois de validado": as skills são a ferramenta do próprio procedimento de captura/validação, não código da aplicação AppOS.
