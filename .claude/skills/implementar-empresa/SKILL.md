---
name: implementar-empresa
description: Use when a company's AppOS modules are validated by /personalizar-modulo and the next step is real code — forking the template for that company, or starting any later implementation phase (backend, database, authentication, permissions, external integrations) on a company that already has a fork.
---

# Implementar Empresa

Leva uma empresa com módulos validados até código a funcionar em `<slug>/app/`, uma fase de cada vez (fork, backend, …). Nunca escreve em `src/` do template. Specs, planos e execução continuam a usar `superpowers:brainstorming`, `superpowers:writing-plans` e `superpowers:subagent-driven-development`; esta skill define o que tem de existir antes, durante e depois deles.

**A pressa não salta passos.** Os Passos 2, 3 e 4 existem porque saltá-los custou rondas inteiras de retrabalho na primeira empresa (`docs/superpowers/melhoria-continua.md`, M-001 a M-003). Se o utilizador tiver pressa, reduzir o âmbito da fase, não os passos.

## Passo 1 — Situar

- Localizar a empresa como no Passo 2 de `personalizar-modulo`. Confirmar em `perfil-empresa.md` que todos os módulos base e os opcionais ativados estão em `modulos_validados`; se faltar algum, parar e indicar `/personalizar-modulo`.
- Identificar a fase: **fork** (ainda não existe `<slug>/app/`, dentro do diretório da empresa, irmão da raiz do template) ou **fase seguinte** (já existe). Numa fase seguinte, ler os specs e planos anteriores desta empresa em `docs/superpowers/` e `<slug>/modelo-dados.md`.

## Passo 2 — Modelo de dados (antes de qualquer código)

Obrigatório no fork. Numa fase seguinte, rever e atualizar o existente em vez de o refazer.

1. Ler `template-modelo-dados.md` (nesta pasta).
2. Inventário: ler os `types.ts` dos módulos que esta empresa usa (do template no fork; de `<slug>/app/` depois) e listar cada entidade definida em mais de um sítio. `onboarding` entra se a app o mantiver; `servicosLigados` não tem código no template.
3. Antes de fixar o significado de um campo, procurar onde o código o lê e o escreve. Se o comentário contradisser o uso, vale o uso.
4. Preencher todas as secções. A visibilidade do dinheiro vem das respostas "quem pode ver" em `modulos/*.md`; o que é só da gestão nunca fica num tipo ou tabela que quem executa precisa de ler.
5. Gravar em `<slug>/modelo-dados.md` e validar com o utilizador. O spec cita este ficheiro; não o repete.

## Passo 3 — Teste rápido das integrações externas (antes do plano)

Para cada serviço externo novo nesta fase (base de dados, autenticação, funções, email, pagamentos, APIs):

1. Criar o recurso real — é uma ação com efeito externo, confirmar com o utilizador.
2. Aplicar a peça mínima que a fase vai usar: uma tabela com a sua política, uma função, um login, um envio.
3. Fazer uma chamada real a partir de onde a app vai chamar (browser, servidor de build), com um papel de cada tipo.

Cada surpresa vai para uma secção "Teste rápido" do spec antes de se escrever o plano. Sem integrações externas nesta fase: saltar e dizê-lo.

## Passo 4 — Spec e plano em pedaços

- Spec com `superpowers:brainstorming`, citando `modelo-dados.md` e o teste rápido. Specs e planos ficam no repositório do template: `docs/superpowers/specs/AAAA-MM-DD-<slug>-<fase>-design.md` e `docs/superpowers/plans/AAAA-MM-DD-<slug>-<fase>[-<pedaço>].md`.
- Plano com `superpowers:writing-plans`, mas **só para o primeiro pedaço**: a base de que o resto depende (esquema, segurança e autenticação numa fase de backend; esqueleto, build e tipos partilhados num fork). Até cerca de 8 tarefas. O plano termina com a lista dos pedaços seguintes, por nome, sem os detalhar.
- Depois de o pedaço estar executado e revisto (Passos 5 e 6), planear o seguinte. As correções ao esquema e as lições entram diretamente nas tarefas novas, não em ficheiros à parte.

## Passo 5 — Executar e rever

Executar com `superpowers:subagent-driven-development`. Todo o brief de implementação ou de revisão que toque em base de dados, segurança, integrações ou no significado de um campo leva colada a secção relevante de `reference-verificacao.md` (nesta pasta) — os subagentes não leem esta skill.

## Passo 6 — Retrospetiva (fim de cada pedaço)

Seguir a secção "Retrospetiva" de `docs/superpowers/melhoria-continua.md`: houve retrabalho com causa no procedimento? Se não, não escrever nada. Se sim e cumprir o critério desse ficheiro, acrescentar lá a entrada e propor ao utilizador a alteração à skill — nunca a aplicar sem aprovação. Depois, voltar ao Passo 4 para o pedaço seguinte, ou seguir para o Passo 7 se a fase terminou.

## Passo 7 — Fim da fase e fim da empresa

- **Fim da fase:** verificação de ponta a ponta com sessões reais de cada papel (`superpowers:verification-before-completion`); atualizar `modelo-dados.md` se o modelo mudou.
- **Fim da empresa** (todas as fases previstas concluídas): fazer a poda do registo (secção "Poda" de `melhoria-continua.md`) e propor o resultado ao utilizador.
