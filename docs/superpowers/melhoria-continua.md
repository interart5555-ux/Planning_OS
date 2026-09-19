# Melhoria contínua do procedimento de criação de empresas

Registo vivo dos problemas de eficiência encontrados ao criar empresas a partir deste template
(`/personalizar-empresa` → `/personalizar-modulo` → fork → fases de implementação) e da alteração
que cada um provocou no procedimento. Uma entrada só existe se mudou, ou propõe mudar, o caminho.

## Critério — lição ou incidente?

Uma entrada só entra neste registo se cumprir **as duas** condições:

1. **Causa no procedimento** — um passo, uma verificação ou uma regra das skills, do spec ou do plano
   podia ter evitado o problema a baixo custo. Um erro pontual de quem executou, que nenhum passo
   razoável apanharia, é um incidente e não entra.
2. **Vai repetir-se noutra empresa** — não depende de um pormenor único desta empresa, desta
   ferramenta num dia concreto, ou de um erro de digitação.

Se só uma se cumprir, não se escreve nada.

## Retrospetiva (obrigatória no fim de cada etapa)

No fim de `/personalizar-empresa`, de cada `/personalizar-modulo` e de cada fase ou pedaço de
implementação, responder a uma pergunta:

> Houve alguma coisa que custou retrabalho (uma ronda de correção, uma pergunta repetida, um mockup
> refeito, uma tarefa reescrita) e cuja causa estava no procedimento?

- **Não** → não se escreve nada. Sem entradas de enchimento.
- **Sim, e cumpre o critério acima** → acrescentar uma entrada em "Entradas" com o estado
  `proposta`, e propor ao utilizador a alteração concreta à skill (ficheiro, passo, texto).
- Registar aqui é automático. **Alterar uma skill exige aprovação explícita do utilizador**; só
  depois de aplicada a entrada passa a `aplicada`, com a data.

## Poda (no fim de cada empresa)

Quando uma empresa termina, reler "Regras em vigor" e, para cada uma:

- **Absorvida** — já é um passo explícito de uma skill e ninguém precisa de ler esta entrada para a
  seguir → passar a `absorvida` e sair da tabela "Regras em vigor".
- **Obsoleta** — a ferramenta, o template ou o domínio mudaram e deixou de se aplicar → `retirada`,
  com uma linha a dizer porquê, e remover o texto correspondente da skill.
- **Sobreposta** — duas regras dizem o mesmo → fundir numa só.

A poda também é proposta, não aplicada: o utilizador aprova.

## Regras em vigor

| # | Regra | Onde vive no procedimento | Estado |
|---|---|---|---|
| M-001 | Decidir o modelo de dados antes de qualquer código | `implementar-empresa` Passo 2 + `template-modelo-dados.md`; perguntas "quem pode ver" em `reference-questionario-modulos.md` | aplicada 2026-09-19 |
| M-002 | Teste rápido contra o sistema real antes de planear uma integração | `implementar-empresa` Passo 3 | aplicada 2026-09-19 |
| M-003 | Planos em pedaços: base primeiro, o resto depois | `implementar-empresa` Passo 4 | aplicada 2026-09-19 |
| M-004 | Rever o estado vivo, não só os ficheiros | `implementar-empresa/reference-verificacao.md` secção A | aplicada 2026-09-19 |
| M-005 | Testes de segurança têm de conseguir falhar | `implementar-empresa/reference-verificacao.md` secção B | aplicada 2026-09-19 |
| M-006 | O comportamento do código ganha ao comentário | `implementar-empresa` Passo 2.3 + `reference-verificacao.md` secção C | aplicada 2026-09-19 |
| M-007 | `personalizar-modulo` lê `src/` do template para ancorar perguntas e mockups | `personalizar-modulo` Passo 5 (cabeçalho por alterar) | parcialmente aplicada |

## Entradas

### M-001 — Modelo de dados decidido tarde demais

- **Problema:** o fork da Fase 1 deixou a mesma pessoa definida em seis tipos diferentes, alojamentos
  referidos por nome em vez de id, e o ciclo de vida de uma limpeza partido em três representações
  que só coincidiam por acaso nos dados de exemplo. Os valores monetários (`per_job_rate`,
  `hourly_rate`) viviam em tabelas operacionais que a colaboradora precisava de ler.
- **Onde:** ALClean, fork (Fase 1) → descoberto na Fase 2.
- **Custo:** a Fase 2 teve de normalizar o modelo e migrar os sete módulos ao mesmo tempo. A
  separação do dinheiro (Ruling 4) só apareceu na revisão da Task 4: 3 Critical, três migrações
  extra (0005–0007), numeração deslocada duas vezes e briefs das Tasks 9, 10 e 15 reescritos.
- **Causa:** procedimento — nem as skills nem o spec do fork tinham um passo de modelo de dados.
- **Alteração ao procedimento:** passo obrigatório antes de qualquer código: escrever as entidades
  reais, a fonte única de cada uma, as ligações entre módulos por id, o que é calculado e nunca
  guardado, e que valores monetários são só da gestão. Validado pelo utilizador.
- **Estado:** proposta (2026-09-18); aplicada (2026-09-19).

### M-002 — Integrações externas planeadas sem as tocar

- **Problema:** comportamentos do sistema real que o plano não previa: Edge Function sem CORS
  (preflight 403, provisionamento inacessível à app); permissões por coluna aplicam-se ao papel
  `authenticated`, comum à gestora e à colaboradora; o registo recusa `@alclean.local` por consulta
  DNS/MX e o projeto novo esgotou a quota de email; o PostgREST envia NULL explícito em inserts em
  lote heterogéneos, contornando defaults; colunas `time` devolvem `HH:MM:SS`; políticas guardadas
  de forma diferente da escrita.
- **Onde:** ALClean, Fase 2 (Tasks 4, 6, 7, 10).
- **Custo:** cerca de uma ronda de correção por surpresa; a Task 7 ficou bloqueada até haver a chave
  `service_role`.
- **Causa:** procedimento — o plano foi escrito a partir da documentação, sem uma chamada real.
- **Alteração ao procedimento:** antes de planear uma integração, criar o recurso a sério, aplicar
  uma peça mínima (uma tabela com política, uma função, um login) e fazer uma chamada real a partir
  de onde a app vai chamar. As surpresas entram no spec antes do plano.
- **Estado:** proposta (2026-09-18); aplicada (2026-09-19).

### M-003 — Plano de 16 tarefas escrito de uma vez

- **Problema:** o que se aprendeu nas primeiras tarefas não entrou nas seguintes. Foi preciso criar
  ficheiros à parte (`licoes-modulo.md`, `schema-corrections.md`) para levar correções aos briefs,
  e defeitos do plano continuaram a aparecer até à Task 12 (Ruling 13; quatro bugs no brief da
  Task 10).
- **Onde:** ALClean, Fase 2.
- **Custo:** rondas de correção evitáveis e briefs remendados a meio da execução.
- **Causa:** procedimento — o plano da fase não tinha pontos de corte.
- **Alteração ao procedimento:** o primeiro pedaço é só a base (esquema, segurança, autenticação).
  Executa-se e revê-se, e só depois se planeia o pedaço seguinte, já com o que se aprendeu.
- **Estado:** proposta (2026-09-18); aplicada (2026-09-19).

### M-004 — Revisão feita aos ficheiros, não ao sistema

- **Problema:** a política de envio de mensagens estava autocorrelacionada e não restringia nada;
  `jobs` e `absences` entraram na publicação de tempo real à mão e não constam de nenhuma migração.
  Só a leitura do estado vivo (`pg_policies`, `pg_publication_tables`, a função publicada) mostrou
  isto.
- **Onde:** ALClean, Fase 2 (Tasks 4, 5, 11).
- **Custo:** 3 rondas de correção na Task 4. Uma base de dados reconstruída a partir das migrações
  ficaria sem tempo real nessas duas tabelas.
- **Causa:** procedimento — os critérios de revisão não exigiam verificar o estado vivo.
- **Alteração ao procedimento:** as revisões confirmam políticas, funções (incluindo
  `prosecdef`), publicações e funções publicadas na base de dados viva. Tudo o que existir no
  sistema vivo tem de existir numa migração.
- **Estado:** proposta (2026-09-18); aplicada (2026-09-19).

### M-005 — Testes de segurança que não conseguiam falhar

- **Problema:** o primeiro `rls-check` passava 18 em 18, mas 6 verificações liam tabelas vazias para
  toda a gente e nenhuma distinguia uma recusa de um erro de consulta: um nome de tabela mal escrito
  passava como seguro. A primeira correção semeava e apagava tarifas pelos ids reais, o que apagaria
  a tarifa verdadeira em cada execução.
- **Onde:** ALClean, Fase 2 (Task 8).
- **Custo:** 2 rondas de correção, uma delas por um Critical introduzido pela própria correção.
- **Causa:** plano — o brief pedia verificações sem dizer o que torna uma verificação válida.
- **Alteração ao procedimento:** cada verificação de segurança tem de: correr sobre dados que
  existem; distinguir a recusa (código esperado, ex. `42501`) de um erro; ter um controlo positivo;
  usar contas e linhas descartáveis, criadas e apagadas pelo próprio teste; nunca alterar o que não
  criou. Uma sonda com o nome errado tem de falhar.
- **Estado:** proposta (2026-09-18); aplicada (2026-09-19).

### M-006 — Decisão tomada a partir de um comentário

- **Problema:** a Ruling 13(a) inverteu o significado de `suppliesOwnProducts` porque o comentário
  do tipo dizia o contrário do que `JobScreens.tsx` fazia. O implementador recusou-se a aplicá-la e
  foi assim que se deu pelo erro.
- **Onde:** ALClean, Fase 2 (Task 12).
- **Custo:** baixo, porque foi apanhado a tempo. Sem isso, as colaboradoras levariam material
  precisamente aos clientes que já o fornecem.
- **Causa:** execução, mas repete-se sempre que um fork herda comentários do template. O modelo de
  dados (M-001) e os briefs são os sítios onde um passo barato o evita.
- **Alteração ao procedimento:** antes de fixar o significado de um campo, ler onde o código o usa.
  Se o comentário contradisser o uso, fica o uso e corrige-se o comentário.
- **Estado:** proposta (2026-09-18); aplicada (2026-09-19).

### M-007 — `personalizar-modulo` proibido de ler o código do template

- **Problema:** a skill diz que "nunca lê nem escreve `src/`". Ao validar o Planeamento da ALClean
  inventou-se uma convenção visual ("Virada rápida" em texto em cada cartão) quando o template já
  tinha a certa (`PriorityDot` + lista agregada de alertas).
- **Onde:** ALClean, `/personalizar-modulo planeamento`.
- **Custo:** duas correções do utilizador e um mockup refeito.
- **Causa:** procedimento — a regra impedia a leitura que teria dado a resposta.
- **Alteração ao procedimento:** ler `src/modules/<modulo>/` (types, config, mockData, rules,
  components) antes do questionário e do mockup; nunca escrever.
- **Estado:** proposta (2026-09-18); parcialmente aplicada (2026-09-19). O Passo 5 já manda ler
  `src/modules/<modulo>/`, mas a frase do cabeçalho "nunca lê nem escreve `src/`" continua lá: a
  edição foi bloqueada pelo classificador de permissões e aguarda o utilizador.

## Retiradas e fundidas

(nenhuma)
