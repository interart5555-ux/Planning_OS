---
name: personalizar-modulo
description: Use when personalizing one specific AppOS template module (equipas, clientes, planeamento, execucao, aprovacoes, mensagens, rendimentos, inventario, or servicosLigados) to a company's reality. Runs that module's questionnaire, generates a validation mockup via Artifact, iterates with the user until approved, and records the validated module profile. Requires a company profile from /personalizar-empresa first.
---

# Personalizar Módulo

Personaliza um módulo específico do template AppOS para uma empresa já identificada por `/personalizar-empresa`. Corre-se uma vez por módulo, em qualquer ordem, em qualquer sessão. Nunca lê nem escreve `src/` ou `preview/` do template — só produz um documento em `<slug>/modulos/` (dentro do diretório da empresa, irmão da raiz do template) e um mockup Artifact.

## Passo 1 — Identificar o módulo pedido

O argumento passado a esta skill é o nome do módulo. Normalizar para uma das 9 chaves internas: `equipas`, `clientes`, `planeamento`, `execucao`, `aprovacoes`, `mensagens`, `rendimentos`, `inventario`, `servicosLigados` (aceitar variações óbvias em português/maiúsculas — ex. "Aprovações" → `aprovacoes`, "inventário" → `inventario`). Se o argumento não corresponder a nenhuma das 9, listar as opções e pedir para escolher.

`onboarding` não é uma opção válida aqui — o seu conteúdo já é capturado por `/personalizar-empresa`.

## Passo 2 — Localizar a empresa ativa

A raiz do template é o diretório que contém `.claude/skills/personalizar-modulo/` (este ficheiro); o diretório de cada empresa é irmão dessa raiz.

- Se a conversa já identificou uma empresa em curso, usar essa.
- Caso contrário, procurar candidatos entre os diretórios irmãos da raiz do template: um "candidato" é um diretório irmão que contenha um ficheiro `perfil-empresa.md` na sua própria raiz. Se existir exatamente um candidato, usar esse. Se existirem zero ou mais do que um, perguntar ao utilizador o nome/slug da empresa (zero candidatos: pedir o nome; mais do que um: pedir para escolher qual).
- Procurar `<raiz-do-template>/../<slug>/perfil-empresa.md`.
  - Se não existir, avisar o utilizador e oferecer invocar `/personalizar-empresa` primeiro. Não continuar com um perfil implícito ou parcial.

## Passo 3 — Ler o perfil de empresa

Ler `perfil-empresa.md` da empresa: vocabulário-base, marca, `modulos_opcionais`, e — se o módulo pedido for `execucao` ou `aprovacoes` — a secção "Ciclo de trabalho (Execução + Aprovações)".

## Passo 4 — Confirmar ativação (só módulos opcionais)

Se o módulo pedido for `rendimentos`, `inventario` ou `servicosLigados` e `modulos_opcionais.<modulo>` for `false` no perfil, perguntar: "Este módulo não está marcado como necessário no perfil da empresa. Querem ativá-lo agora?". Se sim, atualizar esse campo para `true` em `perfil-empresa.md` antes de continuar, e prosseguir normalmente a partir do Passo 5. Se não, saltar os Passos 5–7 (sem questionário nem mockup) e ir diretamente ao Passo 8 para gravar um `modulos/<modulo>.md` mínimo com `ativado: false` — ver a nota "Módulo recusado" nesse passo — e depois ao Passo 9 para reportar.

## Passo 5 — Ler o questionário de referência

Ler `reference-questionario-modulos.md` (na mesma pasta deste ficheiro). Ir à secção "Padrão geral" e depois à secção com o nome exato do módulo pedido.

Antes da primeira pergunta, ler a implementação do módulo no template: `src/modules/<modulo>/` (`types.ts`, `config.ts`, `mockData.ts`, `rules.ts` e os `components/` relevantes; `servicosLigados` não tem). Usar o questionário como lista de *temas*: onde o código já tem uma resposta concreta (valor por omissão, estado, convenção visual), perguntar para confirmar ou ajustar esse valor, citando-o, em vez de perguntar em abstrato. O mockup do Passo 6 reutiliza a linguagem visual que o código já tem.

- Para `execucao` e `aprovacoes`: seguir a exceção do padrão geral — não repetir a pergunta de processo; decompor a narrativa "Ciclo de trabalho" já lida no Passo 3 nos campos concretos (checklist, tipos de evidência, tipos de anomalia, critério de aprovação automática) e confirmar com o utilizador que a decomposição está correta antes de avançar, só depois perguntando os campos mecânicos restantes dessa secção.
- Para os restantes módulos: perguntar os pontos da secção do módulo, um de cada vez.

- Depois das perguntas específicas do módulo, perguntar sempre uma questão final aberta: "Há alguma particularidade deste módulo para esta empresa que não tenha sido coberta pelas perguntas anteriores?". Registar a resposta (ou a sua ausência) em "Casos especiais" no ficheiro final.

Aplicar os mesmos casos limite do perfil de empresa: se não souber responder, assumir a omissão do domínio mais próximo e marcar em "Casos por confirmar". Se uma resposta contradisser o perfil de empresa, sinalizar o conflito ao utilizador em vez de o resolver silenciosamente.

## Passo 6 — Gerar o mockup

Antes de publicar, carregar a skill `artifact-design` (e `artifact-diagramming`/`artifact-capabilities` só se forem mesmo necessárias), como para qualquer Artifact.

- Um Artifact HTML, com 2 a 4 ecrãs-chave deste módulo que mostrem as decisões tomadas (vocabulário, checklist/regras, marca) — não é preciso reproduzir a app toda.
- Vocabulário, marca e regras aplicados exatamente como capturados nas respostas.
- Dados de exemplo coerentes com o processo descrito por esta empresa — usar nomes/locais/situações que apareçam nas respostas, não os "Lisboa/Porto" genéricos do template.
- Publicar com a ferramenta Artifact (`action: publish`), favicon e descrição adequados ao módulo.

## Passo 7 — Validar com o utilizador

Mostrar o link e perguntar se está aprovado. Se pedirem ajustes, voltar ao Passo 6 e republicar sobre o mesmo `url` (nunca criar um Artifact novo a cada iteração); se o pedido de ajuste chegar numa sessão diferente da que publicou o mockup, ler primeiro o Artifact existente (`action: read`, usando o `mockup_url` já gravado em `modulos/<modulo>.md`) antes de o republicar. Registar cada pedido de ajuste para o "Histórico de iterações" do ficheiro final.

## Passo 8 — Gravar o módulo validado

- Ler `template-modulo.md` (na mesma pasta).
- Preencher todos os campos de frontmatter e secções do corpo: `empresa` (slug), `modulo` (chave), `ativado` (true, ou o valor confirmado no Passo 4), `data_validacao` (hoje, AAAA-MM-DD), `mockup_url` (link do Artifact aprovado), respostas do questionário, casos especiais, casos por confirmar, histórico de iterações. Substituir os comentários `<!-- -->` de orientação do template pelo conteúdo real; se uma secção ficar vazia, remover o comentário e deixar a secção genuinamente vazia (não deixar o texto de orientação).
- **Módulo recusado (vindo do Passo 4):** gravar a mesma estrutura, mas com `ativado: false`, `mockup_url` vazio, e `## Respostas`, `## Casos especiais` e `## Histórico de iterações` vazias — serve só para registar a recusa e evitar reperguntar em sessões futuras.
- Escrever em `<raiz-do-template>/../<slug>/modulos/<modulo>.md` (criar a pasta `modulos/` se não existir). Se já existir um `modulos/<modulo>.md` desta empresa (ex. uma iteração numa sessão anterior), atualizar esse ficheiro preservando o `## Histórico de iterações` já gravado e acrescentando a nova iteração, em vez de o substituir do zero.
- Atualizar `perfil-empresa.md`: acrescentar `<modulo>` a `modulos_validados` (sem duplicar, se já lá estiver; manter o estilo flow — `modulos_validados: [equipas, clientes]` — o mesmo que o template usa). Não acrescentar no caso de "Módulo recusado" acima — só módulos com mockup aprovado entram em `modulos_validados`.

## Passo 9 — Reportar e sugerir próximo passo

Confirmar o caminho do ficheiro gravado e o link do mockup (se o módulo foi recusado no Passo 4, não há mockup — reportar só o caminho do ficheiro e a recusa registada). Olhar para `modulos_validados` em `perfil-empresa.md` e sugerir o próximo módulo por validar, seguindo a ordem recomendada: Equipas → Clientes → Planeamento → Execução → Aprovações → Mensagens → opcionais ativados. Quando todos os módulos base e opcionais ativados estiverem validados, o próximo passo é `/implementar-empresa`.

## Passo 10 — Retrospetiva

Seguir a secção "Retrospetiva" de `<raiz-do-template>/docs/superpowers/melhoria-continua.md` para este módulo: houve retrabalho (mockup refeito, pergunta repetida, correção do utilizador) com causa no procedimento? Se não, não escrever nada. Se sim e cumprir o critério desse ficheiro, acrescentar lá a entrada e propor ao utilizador a alteração à skill — nunca a aplicar sem aprovação.
