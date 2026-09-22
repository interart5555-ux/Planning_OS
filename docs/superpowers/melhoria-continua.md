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
| M-007 | `personalizar-modulo` lê `src/` do template para ancorar perguntas e mockups | `personalizar-modulo` cabeçalho e Passo 5 | aplicada 2026-09-19 |
| M-008 | Depois dos mockups, o próximo passo é o modelo de dados e a base real, sem fork intermédio em simulação | proposto: `implementar-empresa` Passos 1 e 4 | proposta |
| M-009 | Comparar o processo descrito pela empresa com o que o template suporta | proposto: `personalizar-modulo` Passo 5 | proposta |
| M-010 | Âmbito rastreável; "fora de âmbito" e decisões de produto aprovados pelo dono | proposto: `implementar-empresa` Passos 4–5 | proposta |
| M-011 | Pré-requisitos externos e método de login pedidos no início | proposto: `personalizar-empresa` + `implementar-empresa` Passo 3 | proposta |
| M-012 | Teste do dono em ambiente de testes no fim de cada pedaço | proposto: `implementar-empresa` Passo 6 | proposta |
| M-013 | Fases de endurecimento e produção; triagem obrigatória dos pendentes | proposto: `implementar-empresa` Passo 7 | proposta |
| M-014 | Dívida do template registada e devolvida no fecho | proposto: registo próprio + `implementar-empresa` Passo 7 | proposta |
| M-015 | Nenhuma credencial em documentos de trabalho | proposto: `implementar-empresa` + `reference-verificacao.md` | proposta |
| M-016 | Modelo de dados cobre apagar/arquivar, suspensão e quem cria cada entidade | proposto: `template-modelo-dados.md` | proposta |
| M-017 | Controlos automáticos de qualidade (tipos, lint, testes, CI) no template | proposto: template + `implementar-empresa` Passo 5 | proposta |
| M-018 | O que fica entre os módulos precisa de tarefas próprias | proposto: `implementar-empresa` Passo 4 | proposta |

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
- **Estado:** proposta (2026-09-18); aplicada (2026-09-19).

### M-008 — Fork em simulação seguido de migração completa

- **Problema:** depois de validados os mockups, a Fase 1 construiu a app personalizada com dados
  simulados no browser. A Fase 2 teve depois de reescrever a camada de dados dos sete módulos para a
  base de dados real. A personalização visual e as regras aproveitaram-se; a forma como cada módulo
  guarda e lê os dados foi feita duas vezes.
- **Onde:** ALClean, Fase 1 → Fase 2.
- **Custo:** as Tasks 9 a 15 da Fase 2 são, em grande parte, a migração de código que a Fase 1 tinha
  acabado de escrever. Foi preciso criar `licoes-modulo.md` para que a mesma migração não repetisse
  os mesmos erros sete vezes.
- **Causa:** procedimento. A ordem "fork em simulação → backend" vinha do template, que é um protótipo
  sem servidor. Numa empresa real, a simulação é um passo intermédio que se deita fora.
- **Alteração proposta:** mockups aprovados → modelo de dados → base (esquema, segurança, login) →
  cada módulo personalizado já sobre dados reais, numa só passagem. A seguir, extrair a base da
  ALClean para o template, para que a próxima empresa parta de uma base já testada.
- **Estado:** proposta (2026-09-19).

### M-009 — A lacuna "criar limpezas" só apareceu na execução

- **Problema:** o perfil da ALClean diz que a gestora cria limpezas manuais, mas o template não tem essa ação; os mockups reutilizaram ecrãs existentes e ninguém comparou.
- **Onde:** ALClean, validação dos módulos → descoberto na Fase 2 (Task 12).
- **Custo:** a app não pode entrar em produção sem uma funcionalidade nova; por planear.
- **Causa:** procedimento — nenhum passo compara o processo descrito com o que o template faz.
- **Alteração proposta:** em `personalizar-modulo`, listar cada passo do processo como "suportado / em falta"; o que falta tem de ter ecrã no mockup.
- **Estado:** proposta (2026-09-19). Aplicação depende da decisão de arquitetura (ver `docs/auditoria-2026-09-19.md`).

### M-010 — Âmbito e decisões de produto sem regresso ao dono

- **Problema:** iCal e modo offline ficaram "fora de âmbito" no spec sem aprovação explícita; decisões de produto (ex. sem aprovação automática após reabertura) foram tomadas pelo controlador.
- **Onde:** ALClean, Fase 2.
- **Custo:** o dono descobre as omissões só no fim.
- **Causa:** procedimento — o spec pode excluir sem regresso ao dono; rulings técnicas e de produto misturadas.
- **Alteração proposta:** matriz de rastreabilidade de `modulos/*.md` para tarefas ou "fora de âmbito" aprovado; rulings de produto pedem aprovação.
- **Estado:** proposta (2026-09-19). Aplicação depende da decisão de arquitetura (ver `docs/auditoria-2026-09-19.md`).

### M-011 — Pré-requisitos externos e login pedidos tarde

- **Problema:** a chave `service_role`, a quota de email e o domínio de login só foram tratados quando bloquearam; `@alclean.local` foi recusado.
- **Onde:** ALClean, Fase 2 (Tasks 6–7, Rulings 8–10).
- **Custo:** uma tarefa parcial e três rulings de contorno.
- **Causa:** procedimento — nenhum passo lista o que o dono tem de fornecer nem pergunta o método de login.
- **Alteração proposta:** lista de pré-requisitos no teste rápido; pergunta "com que credencial entra a colaboradora?" no questionário.
- **Estado:** proposta (2026-09-19). Aplicação depende da decisão de arquitetura (ver `docs/auditoria-2026-09-19.md`).

### M-012 — O dono só testa no fim

- **Problema:** o erro das datas de demonstração só foi apanhado no teste do dono, no fim.
- **Onde:** ALClean, Fase 2.
- **Custo:** retrabalho tardio em módulos já dados como concluídos.
- **Causa:** procedimento — sem ponto de teste do dono por pedaço.
- **Alteração proposta:** teste do dono em ambiente de testes no fim de cada pedaço.
- **Estado:** proposta (2026-09-19). Aplicação depende da decisão de arquitetura (ver `docs/auditoria-2026-09-19.md`).

### M-013 — Sem fase de endurecimento e produção

- **Problema:** `implementar-empresa` acaba na "fase"; ~35 pendentes ficaram dispersos no registo de execução sem dono; a auditoria encontrou 6 bloqueios de produção.
- **Onde:** ALClean, auditoria de 2026-09-19.
- **Custo:** falhas de segurança por fechar e nenhum caminho definido até produção.
- **Causa:** procedimento — faltam as fases finais.
- **Alteração proposta:** fases de endurecimento (pendentes triados a/b/c, teste de ponta a ponta) e de produção (domínio, backups, dados reais, arranque assinado pelo dono).
- **Estado:** proposta (2026-09-19). Aplicação depende da decisão de arquitetura (ver `docs/auditoria-2026-09-19.md`).

### M-014 — Defeitos do template sem caminho de volta

- **Problema:** `DEMO_TODAY` fixo, cores fixas, e as correções de segurança da Fase 2 ficaram só na ALClean; a cópia já difere em 113 ficheiros.
- **Onde:** ALClean, Fases 1–2.
- **Custo:** a próxima empresa herdaria os mesmos defeitos.
- **Causa:** procedimento — o fork é uma cópia sem regresso.
- **Alteração proposta:** registo de "dívida do template" e passo de devolução no fecho (ou produto único, ver auditoria).
- **Estado:** proposta (2026-09-19). Aplicação depende da decisão de arquitetura (ver `docs/auditoria-2026-09-19.md`).

### M-015 — Credencial escrita num documento de trabalho

- **Problema:** a password temporária da gestora ficou em claro no registo de execução.
- **Onde:** ALClean, Fase 2 (Task 7).
- **Custo:** credencial a rodar.
- **Causa:** procedimento — nenhuma regra o proíbe.
- **Alteração proposta:** regra: nenhuma credencial em documentos, mesmo fora do git.
- **Estado:** proposta (2026-09-19). Aplicação depende da decisão de arquitetura (ver `docs/auditoria-2026-09-19.md`).

### M-016 — Modelo de dados sem apagar, arquivar e suspender

- **Problema:** no esquema real, suspender não bloqueia nada e apagar uma pessoa destrói pagamentos; o teste às cegas também não tratou estes pontos.
- **Onde:** ALClean, auditoria de segurança e teste às cegas, 2026-09-19.
- **Custo:** uma falha crítica e uma alta.
- **Causa:** procedimento — o `template-modelo-dados.md` não tem estas secções.
- **Alteração proposta:** secções "Apagar e arquivar", "Acesso e suspensão" e "quem cria cada entidade" no template do modelo de dados.
- **Estado:** proposta (2026-09-19). Aplicação depende da decisão de arquitetura (ver `docs/auditoria-2026-09-19.md`).

### M-017 — Sem controlos automáticos de qualidade

- **Problema:** sem tsconfig, lint, testes nem CI; 67 `any` na fronteira com a base de dados; erros só apanhados em revisão humana.
- **Onde:** ALClean, auditoria de código, 2026-09-19.
- **Custo:** defeitos detetados tarde e só por revisão.
- **Causa:** procedimento/template — o template nunca teve estes controlos.
- **Alteração proposta:** controlos no template, herdados por todas as empresas; o Passo 5 exige-os verdes.
- **Estado:** proposta (2026-09-19). Aplicação depende da decisão de arquitetura (ver `docs/auditoria-2026-09-19.md`).

### M-018 — O que está entre os módulos ficou sem dono

- **Problema:** dezasseis tarefas e mais de vinte revisões, todas focadas num módulo de cada vez. O
  que atravessa módulos não tinha dono: a página inicial continuou a anunciar "Fase 1 concluída, sem
  base de dados, sem contas", e os botões da barra de topo não navegavam para lado nenhum, porque as
  entradas nunca passavam a função de navegação. Ao corrigir, descobriu-se que um parâmetro de vista
  estava morto desde o primeiro commit do fork.
- **Onde:** ALClean, Fase 2 — encontrado pelo utilizador no site publicado, depois da revisão final.
- **Custo:** duas correções depois de a fase ter sido dada como revista, e uma app publicada que
  desmentia a si própria na primeira página.
- **Causa:** procedimento — o plano é organizado por módulo, e nada cobre o que os liga.
- **Alteração proposta:** cada fase inclui uma tarefa explícita para o que atravessa módulos
  (página inicial, navegação, sessão partilhada, textos de estado do projeto), e a verificação final
  percorre a app como um utilizador, de módulo em módulo, e não módulo a módulo isoladamente.
- **Estado:** proposta (2026-09-21).

## Retiradas e fundidas

(nenhuma)
