# Brief de reconstrução — Template AppOS e ALClean

*Memória descritiva. 19 de setembro de 2026.*

Este documento descreve três coisas, com detalhe suficiente para recomeçar do zero sem o código
atual:

1. **O template AppOS**: o que é, como está construído e o que cada módulo faz (Parte A).
2. **O procedimento** que transforma o template na app de uma empresa (Parte B).
3. **A ALClean**: todas as decisões de negócio validadas, o que foi implementado, as regras técnicas
   que custaram caro a descobrir e o que ficou por fazer (Parte C).

A Parte D é a lista de instruções para recomeçar.

> **Guardar uma cópia fora deste repositório.** Se apagar a pasta `alclean/` ou reiniciar este
> repositório, este ficheiro é a única memória do que foi decidido. Nenhuma credencial está escrita
> aqui, nem deve estar.

### Fontes

Este documento resume, e em caso de dúvida perde para, os seguintes ficheiros:

| Tema | Ficheiro |
|---|---|
| Levantamento do template | `docs/levantamento-modulos.md`, `docs/fase-1-fecho.md` |
| Procedimento | `docs/superpowers/specs/2026-09-16-procedimento-personalizacao-design.md`, `.claude/skills/*` |
| Perfil e módulos da ALClean | `../alclean/perfil-empresa.md`, `../alclean/modulos/*.md` |
| Fork (Fase 1) | `docs/superpowers/specs/2026-09-17-alclean-fork-design.md` e o plano respetivo |
| Backend (Fase 2) | `docs/superpowers/specs/2026-09-18-alclean-fase2-backend-design.md`, plano, e o registo de execução em `.superpowers/sdd/2026-09-18-alclean-fase2-backend/` (`progress.md`, `licoes-modulo.md`, `schema-corrections.md`) |
| Código ALClean | `../alclean/app/` (branch `fase2-backend`), `supabase/migrations/0001…0017` |
| Auditoria e lições | `docs/auditoria-2026-09-19.md`, `docs/superpowers/melhoria-continua.md`, `docs/melhorias-procedimento-resumo.md` |

---

# Parte A — O template AppOS

## A1. Conceito

O AppOS é um **modelo de aplicação de gestão para empresas de serviços** cujo trabalho segue sempre
o mesmo ciclo:

```
Cliente → Local → Unidade → Equipa → Trabalho agendado → Execução no local → Validação → Faturação
```

O primeiro domínio é **limpezas de alojamento local**, mas o código prepara também **formação**
(Sessão / Instalação / Sala / Formadora) e **manutenção** (Intervenção / Edifício / Fração /
Técnico). Esses dois domínios existem só como dicionários de vocabulário e nunca foram usados.

A aplicação tem **10 módulos**:

| # | Módulo | Chave | Tipo |
|---|---|---|---|
| 1 | Empresa e utilizadores | `onboarding` | Base |
| 2 | Equipas | `equipas` | Base |
| 3 | Clientes, alojamentos e unidades | `clientes` | Base |
| 4 | Planeamento | `planeamento` | Base |
| 5 | Execução de trabalho ("O meu dia") | `execucao` | Base |
| 6 | Aprovações e histórico | `aprovacoes` | Base |
| 7 | Rendimentos | `rendimentos` | Opcional |
| 8 | Inventário | `inventario` | Opcional |
| 9 | Serviços ligados (lavandaria, parceiros) | `servicosLigados` | Opcional, **sem código** |
| 10 | Mensagens e notificações | `mensagens` | Base |

Há dois perfis de utilizador: a **gestão** (administradora e/ou gestora) e a **colaboradora**, que
executa. A app da colaboradora é mobile-first; a da gestão é desktop com adaptação a telemóvel.

## A2. Regras de produto fixadas na Fase 1 do template

1. Os módulos 1–6 e 10 são base e nunca se desligam. Só 7, 8 e 9 são opcionais.
2. **Desligar um módulo opcional não apaga dados.** O módulo passa a mostrar "Módulo indisponível"
   com o botão "Gerir módulos ativos".
3. **Aprovação automática:** uma conclusão com checklist completa e sem ocorrências é aprovada
   sozinha e vai direta para o histórico. Só as que têm ocorrências aparecem em Aprovações. Passar
   mais de 30 min do tempo previsto dá "Por rever" com a etiqueta "Duração excedida", mas **não conta
   como anomalia**.
4. **Inventário:** o stock do cliente nunca é custo, compra nem ativo da empresa. Aparece em itens,
   não em euros, e fica fora de compras, encomendas e fornecedores.
5. **Mensagens:** a colaboradora só vê as suas conversas e as das suas limpezas, e não marca
   conversas como resolvidas. O cliente não tem portal nem sessão.

## A3. Estado técnico do template

- **É uma simulação visual.** Não tem base de dados, contas, pagamentos nem envios reais. O texto da
  UI diz "(simulação)" nas ações fingidas.
- **Não tem build reprodutível.** Não há `package.json`, `tsconfig`, configuração do Tailwind nem os
  ficheiros de entrada que montam cada módulo. Os `preview/module-N-*-react.js` são bundles esbuild
  já compilados (IIFE minificado, React 18.3.1) e os pontos de entrada só existem dentro deles.
- **Não há uma app única.** Cada `preview/module-N-*-react.html` arranca a sua própria raiz React.
  `preview/index.html` é uma página estática com um cartão por módulo e dois botões: "Abrir" (React)
  e "Desenho" (o mockup estático em HTML/CSS puro, `preview/module-N-*.html`).
- As páginas carregam Tailwind por CDN (os componentes usam valores arbitrários como
  `bg-[#17643e]`) e a fonte Public Sans do Google Fonts.
- `raw/passo-N-*.png` são as imagens de referência de cada passo de desenho.
- Tamanho: 144 ficheiros, cerca de 19 500 linhas em `src/modules/`.

### Parâmetros de URL das pré-visualizações

| Preview | Parâmetros |
|---|---|
| 2 Equipas | `?modo=separado`, `?modulos=` |
| 3 Clientes | `?app=formacao\|manutencao\|nucleo`, `?modulos=`, `?fresh=1` |
| 4 Planeamento | `?app=`, `?modulos=` |
| 5 Execução | `?app=`, `?clock=HH:MM`, `?offline=1`, `?fresh=1`, `?modulos=` |
| 6 Aprovações | `?app=`, `?perfil=admin\|colab` (omissão: gestora), `?modulos=` |
| 7 Rendimentos | `?app=`, `?perfil=`, `?modulos=` |
| 8 Inventário | `?ecra=produtos\|locais\|movimentos\|fornecedores`, `?modulos=`, `?repor=1`, `?fresh=1` |
| 10 Mensagens | `?vista=hoje`, `?perfil=`, `?modulos=`, `?repor=1`, `?fresh=1` |

`?modulos=` aceita `todos`, `base`, ou uma lista como `rendimentos,-inventario` (o `-` desliga).

### Dados guardados no browser

Só três coisas persistem: `appos.mensagens.v1`, `appos.inventario.v1` e `appos.modulos.preview.v1`
(mais `appos.modulos.demo.v1` nos desenhos HTML). Todos levam `version: 1` e são ignorados se a
versão não coincidir. Os outros módulos reiniciam os dados de demonstração a cada carregamento.

## A4. Arquitetura transversal

### Padrão de ficheiros de cada módulo (`src/modules/<modulo>/`)

| Ficheiro | Papel |
|---|---|
| `types.ts` | Modelo de dados, formulários, filtros |
| `config.ts` / `appConfigs.ts` | Vocabulário por domínio (`limpezas`, `formacao`, `manutencao`), estados, cores, limites |
| `rules.ts` / `validation.ts` | Funções puras com as regras de negócio |
| `format.ts` / `dates.ts` | Formatação PT-PT: datas `AAAA-MM-DD` sem fuso; euro "€ 1.234,50" |
| `mockData.ts` | Dados determinísticos; `createDemo…()` devolve sempre uma cópia nova ("Repor dados") |
| `use<X>Module.ts` ou `store.tsx` | Estado (`useReducer`) ou Context com persistência em `localStorage` |
| `<X>Module.tsx` | Componente de topo |
| `components/` | Ecrãs, painéis, `context.tsx` interno |
| `index.ts` | Exportações públicas |

### Módulos ativos (`shared/company/`)

- `MODULOS_BASE = [onboarding, equipas, clientes, planeamento, execucao, aprovacoes]`, sempre
  `true`. `MODULOS_OPCIONAIS = [rendimentos, inventario, servicosLigados]`, `false` por omissão.
- **Mensagens não está em nenhuma das listas.** É tratado como sempre disponível (o `AppTopBar`
  mostra-o sempre), mas não é uma chave da configuração.
- `resolverModulos` força a base a `true`. `ModulosAtivosProvider` / `useModulosAtivos()`; sem
  Provider só a base está ativa.
- `GerirModulosDialog` ("Módulos ativos"): base com cadeado, opcionais com interruptor, Guardar /
  Cancelar, e a nota "Os dados não são apagados".
- `ModulosAtivosHost` persiste a escolha em `localStorage`. `ModuloInativo` é o ecrã de um opcional
  desligado.

### Vocabulário

**Não há um mecanismo central.** Cada módulo tem o seu dicionário (`APP_CONFIGS`,
`PLANNING_CONFIGS`, `EXEC_CONFIGS`, `APPROVALS_CONFIGS`, `REVENUE_CONFIGS`), com formas diferentes,
e recebe `app?: AppKey | Config` como prop. Equipas, Mensagens, Inventário, `GerirModulosDialog` e
`ModuloInativo` têm "Limpezas" escrito no código. O dicionário mais completo é o de Clientes, com
concordância de género (`newLabel` "Novo alojamento" / "Nova instalação", `ofThe` "do/da",
`inThis` "neste/nesta").

### Kit de UI (`shared/ui/`)

- **Tokens:** verde primário `#17643e` (hover `#0f4f30`, suave `#e9f4ee`, linha `#cde5d6`). Inputs
  com altura mínima de 44 px e raio de 10 px. Anel de foco verde.
- **Tons:** `ok` (verde), `warn` (amarelo `#fdf3d7`/`#80570a`), `bad` (vermelho
  `#fdecea`/`#b42318`), `dark` (cinzento).
- **Componentes:** `Button` (primary, outline, soft, danger, dangerSolid, ghost; 42 px e 34 px;
  `loading`), `IconButton`, `TextLink`, `Pill`, `Avatar` (iniciais), `Field` (erro com
  `role=alert`), `Switch` (`role=switch`), `ChoiceChips`, `Drawer` (540/600 px, ecrã inteiro no
  telemóvel), `Dialog`, `ConfirmDialog` (`role=alertdialog`), `ActionMenu` "⋯" (portal, teclado),
  `ToastMessage` (`aria-live`, 3,2 s), `FilterBar` (pesquisa + 3 selects), `useDialogFocus` (foco
  preso, Escape, devolução de foco).
- **`Icon.tsx`:** cerca de 100 ícones SVG de traço 1.8 (incluindo cama, edredon, almofada, toalha,
  câmara, cronómetro, wifi/sem rede, euro, carrinha, cadeado).
- **`AppTopBar`:** navegação de topo, sem barra lateral. Logótipo "App**OS**". Secções Hoje,
  Planeamento, Equipas, Clientes, Aprovações, Inventário, Rendimentos, Mensagens (as opcionais
  escondem-se se desligadas). Badges vermelhos com texto `sr-only`. Menu ☰: Dados da empresa, Módulos
  ativos, Definições, Terminar sessão.
- **Acessibilidade:** alvos de 44 px, foco visível, diálogos com foco preso, estados com cor **e**
  texto.

## A5. Os módulos do template

### 1 · Empresa e utilizadores (`onboarding`)

Primeiro passo: cria a empresa e deixa quem se regista como administradora.

- **Ecrã único:** "Vamos criar a tua empresa". Pergunta em destaque "A administradora também é a
  gestora?" (Sim / Não), nome da empresa, NIF, contacto e morada. Usa uma paleta própria (slate-900),
  fora do kit.
- **NIF:** 9 dígitos; prefixo em {1,2,3,5,6,8,9} ou {45,70,71,72,74,75,77,78,79,90,91,98,99};
  dígito de controlo módulo 11 (soma de dígito × (9 − i) nos 8 primeiros; resto < 2 → 0, senão
  11 − resto).
- **Contacto:** aceita o indicativo 351; 9 dígitos a começar por 2, 3 ou 9; formatado "9XX XXX XXX".
- Nome ≥ 2 caracteres; morada ≥ 5. Os erros só aparecem nos campos já tocados.
- **Resultado:** `roles = ['Admin','Manager']` se "Sim", senão `['Admin']` com
  `requires_manager_invite = true`. Isto dá o modo de Equipas: `micro` (a mesma pessoa) ou
  `separate`.
- `isValidNIF`, `isValidContact` e `formatContact` são reutilizados em Clientes.
- Não tem pré-visualização React, só o desenho.

### 2 · Equipas (`equipas`)

Pessoas, equipas, ausências e acessos à app.

- **Ecrã:** 3 cartões-resumo clicáveis (colaboradores ativos, equipas ativas, ausências próximas) e
  3 separadores: Colaboradores, Equipas, Ausências.
- **Colaboradores:** tabela (cartões no telemóvel), filtros por função, equipa e estado de acesso.
  Menu por pessoa: ver, enviar/reenviar acesso, suspender/reativar, registar ausência, arquivar ou
  eliminar. No modo `separate` aparece o aviso "Responsabilidades separadas" com "Convidar gestora".
- **Equipas:** cartões com responsável (ou aviso "Sem responsável definido"), zonas, clientes,
  alojamentos e avatares.
- **Ausências:** próximas e anteriores, com aprovar/recusar se pendente.
- **Ficha da pessoa:** visão geral (próximos trabalhos, ausências, condições: valor/hora, trabalhos
  feitos, na empresa desde) e dados pessoais.
- **Adicionar pessoa** (2 passos): dados (nome, email, função, equipa, valor/hora) e acesso (PIN de
  4 dígitos para colaboradoras; email e palavra-passe para gestão).
- **Entidades:** `Person {role admin|manager|collab, access active|sent|none|suspended|failed,
  hourlyRate, completedJobs, archived}`, `Team {leadId, zones, clientIds, accommodationIds}`,
  `Absence {type férias|folga|indisponibilidade|formação|consulta|baixa, allDay, from/to, status
  pending|approved|rejected}`.
- **Regras:**
  - Nome com pelo menos 2 palavras; email obrigatório e **único na empresa**; valor/hora opcional
    no formato "8,50".
  - Nome de equipa único (sem acentos nem maiúsculas).
  - Ausência: fim ≥ início; parcial com horas e fim > início. A sobreposição é **só aviso**.
  - Só se **elimina** quem não é admin e não tem trabalhos concluídos; os restantes só se
    **arquivam**. Arquivar tira a liderança e suspende o acesso.
  - Mudar de equipa tira a liderança da anterior. O responsável tem de ser membro. Cada alojamento
    tem no máximo uma equipa por defeito.
  - Acesso: `none → sent (ou failed) → active`; `active ↔ suspended`. Envio simulado (falha se o
    email contiver "falha").
  - Etiquetas com género pelo primeiro nome (termina em "a" → feminino).
- **Mock:** empresa "Brilho", Porto, Equipas Norte/Centro/Sul, 15 pessoas, `DEMO_TODAY` fixo.

### 3 · Clientes, alojamentos e unidades (`clientes`)

Hierarquia **Cliente → Local (alojamento) → Unidade**.

- **Configuração por domínio** (`appConfigs.ts`): termos com género, tipos de unidade, rótulo de
  capacidade, segmentos, serviços e as *features* `defaultTeam`, `hourlyRate`, `ical`, `laundry`,
  `stayTimes`. Em limpezas estão todas ligadas.
- **Ecrãs:**
  - Lista de clientes com pesquisa (inclui nome e morada dos locais), filtros, ordenação.
  - Ficha do cliente: Resumo, Locais, Unidades, Notas.
  - Formulário do cliente (cliente e empresa são a mesma entidade).
  - Lista de locais do cliente; formulário rápido de local (inclui os nomes das primeiras unidades).
  - **Detalhe do local**, editado sobre um rascunho, com aviso "Sair sem guardar?". Separadores:
    Configuração (geral, equipa e preço, horário das estadias, iCal, lavandaria), Unidades (edição
    em massa), Lavandaria, Produtos (só com Inventário), Notas (instruções de acesso e notas).
  - Ficha da unidade; editor de calendários iCal.
- **Entidades:** `Client {nif, billing Semanal|Quinzenal|Mensal|Por serviço, payment ok|pending|late,
  status active|paused|inactive}`, `ServiceLocation {teamId, hourlyRate, checkoutTime, checkinTime,
  laundryEnabled, laundrySetup, accessInstructions}`, `Unit {teamId, hourlyRate, laundry,
  checkoutTime, checkinTime, calendars}`. **`null` numa unidade significa "herda do local".**
- **Lavandaria:** peças lençol baixo, capa de edredon, fronhas, toalhas de banho, toalhas de rosto;
  omissão 2/2/4/2/2.
- **Regras:**
  - Cliente: nome único; NIF opcional mas válido; pessoa de contacto e email obrigatórios.
  - Local: nome e morada obrigatórios; horas `HH:MM` e **entrada depois da saída**. Omissão:
    saída 11:00, entrada 15:00.
  - Unidade: nome único dentro do local.
  - "Aplicar às unidades selecionadas" põe-nas a herdar do local e copia a lavandaria, **sem nunca
    tocar nos calendários**.
  - URL iCal repetido gera aviso ("criaria reservas duplicadas"). Sincronização simulada (falha se o
    URL contiver "erro").
- Plataformas iCal: Airbnb, Booking.com, Vrbo, Outro. Imagens são ilustrações, não fotografias.

### 4 · Planeamento (`planeamento`)

Atribuir, rever e publicar o trabalho. Inclui a vista da colaboradora.

- **Vistas:** Dia (cronograma horizontal 08:00–20:00, uma linha por pessoa, arrastar e esticar com
  passo de 15 min), Semana (pessoas × 7 dias), Mês (capacidade: saídas por dia, pico, alerta de
  reforço). Tabuleiro "Por atribuir" acima do cronograma, que também serve para devolver trabalhos.
- **Estados** (com emoji e cor): Por publicar 📝, Planeado 🗓️, Confirmado 👍, Em curso 🧹, Concluído
  ✅, Em atraso ⏰.
- **Painel de atribuição:** origem (iCal ou manual), prioridade e horário do alojamento, data e
  horas, "Atribuir equipa", lista de colaboradoras disponíveis com horas livres e participação em
  horas, avisos de conflito.
- **Vista da colaboradora:** só mostra trabalhos **publicados**, com "Confirmar leitura".
- **Arrastar** por Pointer Events (rato, caneta e toque com pressão longa), com fantasma que mostra
  o resultado da verificação.
- **Regras:**
  - Trabalhos Em curso ou Concluídos não se movem.
  - Ausência no horário **bloqueia**; sobreposição com outro trabalho da mesma pessoa **só avisa**.
  - Horas livres = capacidade − horas atribuídas − horas de ausência.
  - **Prioridade alta** = há entrada no mesmo dia da saída. Só pode ser feita nesse dia e tem de
    terminar antes da entrada. Prioridade normal pode ser adiada para qualquer dia posterior.
  - Janela do alojamento: começar antes da saída é "bad"; alta que acaba depois da entrada é "bad";
    adiada é "flex"; acabar depois da hora de entrada sem entrada nesse dia é "flex".
  - **Qualquer alteração volta a pôr o trabalho em "Por publicar".** "Publicar alterações" passa
    todos a "Planeado". A colaboradora confirma a leitura → "Confirmado".
  - Só trabalhos manuais se eliminam; os do iCal nunca.
  - Capacidade do mês: 3 trabalhos por pessoa por dia; reforço = ⌈(pico − capacidade) / 3⌉.
- **Sinal visual de prioridade:** `PriorityDot` (bolinha vermelha) no cartão; o texto completo fica
  numa lista de alertas agregada (`WindowAlert`).
- **Na prática, os dados são autónomos:** pessoas e equipas diferentes das de Equipas.

### 5 · Execução (`execucao`) — "O meu dia"

App móvel da colaboradora.

- **Barra inferior:** Hoje, Plano, Mensagens, Perfil. Barra superior com estado de rede e sino de
  avisos.
- **Hoje:** tira da semana, resumo do dia, cartões de trabalho e de ausência.
- **Fluxo de um trabalho:** detalhe (morada, nota da gestora, preparação, "Confirmar leitura",
  "Iniciar") → execução (tempo decorrido, barra de progresso, checklist, quantidades com +/−,
  "Anomalia ou atraso", "Concluir") → conclusão (tarefas em falta, quantidades, fotografias, notas)
  → enviado ("A seguir: …").
- **Anomalia ou atraso:** tipo (Atraso, Dano, Falta de material, Acesso impossível, Outro), minutos
  de atraso (15/30/45/60+), descrição, foto opcional.
- **Configuração de limpezas:** 5 itens de preparação, 7 tarefas, quantidades de roupa (5 peças),
  4 tipos de foto (Quarto, Casa de banho, Cozinha, Sala). `EXEC_FEATURES.timer = false`
  (cronómetro em tempo real adiado; regista-se só início e fim).
- **Regras:**
  - **"Em atraso"** se não iniciado 10 min depois da hora prevista (`LATE_AFTER_MIN = 10`), ou se
    tem um atraso registado. Recalculado a cada 30 s.
  - Só se inicia no próprio dia e em Planeado/Confirmado. **Só um trabalho em curso de cada vez.**
  - Iniciar um trabalho Planeado regista também "Leitura confirmada".
  - Quantidades nunca abaixo de 0; a diferença gera texto "+1 Fronhas, −1 Toalhas de rosto".
  - **Notas obrigatórias se houver tarefas por fazer**; bloqueia o envio.
  - Duração mínima 60 s. Cada evento fica no histórico do trabalho.
  - **Modo sem rede** simulado: tudo continua a funcionar e sincroniza ao voltar a rede.
- **Ligações reais:** Mensagens (sino, avisos, conversa dentro do trabalho) e Inventário (produtos
  usados/perdidos/em falta, só se ativo; a ligação ao alojamento é **pelo nome**).

### 6 · Aprovações e histórico (`aprovacoes`)

Validar as conclusões com ocorrências.

- **Separadores:** Aprovações (com contador) e Histórico. Na primeira: 3 indicadores-filtro (Por
  rever, Com anomalia, Reabertas hoje), nota "Aprovação automática ativa" com contagens, filtros,
  tabela. No Histórico: período, cliente, estado, colaborador, pesquisa.
- **Painel do registo:** Detalhes (linha cronológica, factos, anomalias, "Porque precisa de
  revisão"), Evidências (fotos), Auditoria.
- **Ações:** Aprovar conclusão, Pedir correção (mensagem obrigatória), Reabrir (motivo obrigatório e
  destino "Planeado · volta ao Planeamento" ou "Em curso · volta à Execução").
- **Ocorrências** (`occurrences()`): anomalias; atraso; tarefas em falta; diferença de quantidades
  (em limpezas só conta **falta**, rótulo "Roupa em falta"); duração excedida (real − prevista >
  `DURATION_TOLERANCE = 30` min).
- **Estados de revisão:** `pending`, `approved`, `correction`, `reopened`, `archived`. Aprovar e
  pedir correção só a partir de `pending`.
- **Só quem tem `canReview` (gestão) revê**; a colaboradora vê "Sem acesso a esta área".
- **A auditoria só cresce**: nenhum evento é editado ou apagado.
- Dados independentes dos outros módulos no template.

### 7 · Rendimentos (`rendimentos`) — opcional

Faturação, recebimentos, custos, margem e saúde financeira. Tudo calculado.

- **Separadores:** Visão geral (KPIs Faturado / Recebido / Custos / Margem, semáforo de saúde,
  gráfico faturação vs custos), Pagamentos de clientes, Custos de equipa, Rentabilidade por cliente
  (com detalhe por alojamento).
- **Entidades:** `RevenueClient {cycle weekly|monthly|custom, terms (dias), supply included|client,
  supplement (€/limpeza), units: BillableUnit[{rate, hours}]}`, `TeamMember {rate, share, travel}`,
  `Invoice {period, issued, due, amount, payments[]}`.
- **Regras:**
  - Faturas por ciclo: semanal 1–7/8–14/15–21/22–fim; quinzenal 1–15/16–fim; mensal. Valor
    proporcional aos dias. Emissão = fim + 1 dia; vencimento = fim + prazo.
  - **Estado da fatura calculado:** paga se nada falta; em atraso se venceu; senão pendente.
  - Registar pagamento: > 0 e ≤ em falta; data ≤ hoje; parciais permitidos.
  - Suplemento só se a empresa fornece os produtos, entre 0 e 20 €. Mudar o fornecimento recalcula
    as faturas ainda sem pagamentos.
  - Custo de equipa = horas × valor/hora + deslocações (as deslocações são custo e **não** se
    faturam). Custo de produtos = 1,80 € por limpeza (constante).
  - **Limiares de saúde** (saudável / atenção): recebido ≥ 70 / ≥ 50 %; equipa ≤ 55 / ≤ 62 %;
    produtos ≤ 4 / ≤ 6 %; margem ≥ 35 / ≥ 25 %. O estado global é o pior dos quatro.
  - Cliente: em risco com faturas em atraso; atenção com pagamento parcial, vencimento em ≤ 5 dias ou
    margem < 25 %.
  - As horas vêm de uma tabela de **sazonalidade simulada** (2025–2026).
- **A colaboradora não vê nada deste módulo.**

### 8 · Inventário (`inventario`) — opcional

Produtos, stock da empresa **e** stock dos clientes guardado nos alojamentos.

- **Separadores:** Resumo, Produtos, Locais (lista e mapa por cliente), Movimentos, Fornecedores e
  encomendas.
- **Embutido noutros módulos:** separador Produtos no alojamento (Clientes: "Quem fornece os
  produtos?") e bloco Produtos na limpeza (Execução).
- **Regras:**
  - O stock nunca fica negativo. Compra da empresa recalcula o **custo médio ponderado**.
  - Produtos do cliente custam sempre 0 e não entram em valor de stock, compras nem encomendas.
  - Transferências só entre locais do mesmo dono.
  - Descer abaixo do mínimo cria um pedido de reposição automático; voltar ao normal fecha-o.
  - Um local só se arquiva sem stock.
  - `operationalCost` soma só consumos e perdas da empresa (preparado para Rendimentos, mas
    Rendimentos não o lê).
- Encomendas: Rascunho → Encomendada → Em trânsito → Recebida (ou Cancelada).

### 9 · Serviços ligados (`servicosLigados`)

Sem código. Existe só como chave opcional, como requisito de alguns avisos e como separador
"Lavandaria · fase seguinte" em Clientes.

### 10 · Mensagens e notificações (`mensagens`)

- **Ecrãs:** Mensagens (lista, conversa, painel de detalhes), Nova mensagem (equipa ou cliente,
  vários destinatários, limpeza associada, enviar agora ou agendar), Hoje (quadro de avisos e 3
  cartões-resumo), e a versão de telemóvel usada na Execução.
- **Entidades:** `Conversation {kind equipa|cliente|interna, jobId, resolved}`, `Message {state
  sent|delivered|read|scheduled|failed, images, files}`, `Notice {type, priority alta|media|baixa|info,
  audience gestao|colab|todos, target, requires}`.
- **Regras:**
  - A colaboradora só vê conversas onde participa ou ligadas às suas limpezas.
  - Só a gestão marca como resolvida. Enviar reabre a conversa.
  - Avisos de módulos opcionais só aparecem com o módulo ativo.
  - Texto até 1000 caracteres; agendamento no futuro.
  - Mensagem a vários da equipa cria um grupo "Equipa — {limpeza}".
- Respostas rápidas: "Já cheguei ao local. ✅", "Vou precisar de mais 15 minutos.", "Falta produto no
  alojamento.", "Limpeza concluída. 🙌".

## A6. Ligações entre módulos e defeitos conhecidos do template

**Ligações reais no código:** Onboarding → Equipas (modo micro/separado) e → Clientes (validações);
Clientes ⇄ Inventário; Execução ⇄ Inventário; Execução ⇄ Mensagens; Mensagens → módulos ativos;
todos → `AppTopBar` e módulos ativos.

**Sem ligação:** Equipas, Planeamento, Execução, Aprovações e Rendimentos têm cada um o seu mock,
com pessoas, equipas, datas e cidades diferentes. A mesma pessoa está descrita em **seis tipos**
diferentes (`Person`, `PlanPerson`, `ExecPerson`, `ApprovalsPerson`, `mensagens.Person`,
`TeamMember`) e os locais são referidos **pelo nome**, não por id. Um trabalho tem **três
representações** (`Job`, `ExecJob`, `WorkRecord`).

**Defeitos a não repetir numa reconstrução:**

- Sem build, `tsconfig`, lint, testes nem CI.
- Datas de demonstração fixas (`DEMO_TODAY`) em vários módulos.
- Vocabulário espalhado por 5 dicionários e "Limpezas" escrito no código.
- Mensagens fora de `MODULOS_BASE`.
- Badge "5 aprovações" fixo em Mensagens e Inventário.
- Ausências de Equipas não bloqueiam o Planeamento na prática.
- O desenho estático de Clientes não tem as horas de saída/entrada.

---

# Parte B — O procedimento de criação de uma empresa

O template nunca é alterado por uma empresa. Cada empresa vive num diretório **irmão** do template
(`2. Sandbox/<slug>/`), com os documentos de personalização e, mais tarde, o código em `<slug>/app/`.

## B1. As três skills

### `/personalizar-empresa` (uma vez por empresa)

Grava `<slug>/perfil-empresa.md` com:

1. **Identificação:** nome, slug, área de negócio.
2. **Vocabulário-base:** trabalho, local, profissional (singular, plural, feminino).
3. **Marca:** nome na app, cor primária (hex), tom formal/informal.
4. **Processo de trabalho**, uma pergunta aberta por módulo base (Equipas, Clientes, Planeamento,
   Mensagens) e uma **narrativa guiada do ciclo de trabalho** (Execução + Aprovações) com 7
   sub-perguntas: como começa, passos no local, o que se regista, o que corre mal, como termina,
   quem revê, o que acontece se algo não está bem.
5. **Módulos opcionais derivados**, não perguntados diretamente: faturação → Rendimentos; stock →
   Inventário; parceiro externo → Serviços ligados. Cada ativação é confirmada uma a uma.

### `/personalizar-modulo <nome>` (uma vez por módulo, qualquer ordem)

1. Lê o perfil (recusa avançar sem ele) e **lê `src/modules/<modulo>/` do template** para perguntar
   sobre valores concretos que o código já tem, em vez de perguntar em abstrato.
2. Questionário do módulo: vocabulário específico, checklist, regras ajustáveis (constantes do
   código), features on/off, casos especiais, e uma pergunta final aberta.
3. Gera um **mockup Artifact** com 2–4 ecrãs, com o vocabulário, a marca e dados de exemplo da
   própria empresa. Ajustes republicam o mesmo link.
4. Com aprovação explícita, grava `<slug>/modulos/<modulo>.md` e acrescenta o módulo a
   `modulos_validados`.

Ordem sugerida: Equipas → Clientes → Planeamento → Execução → Aprovações → Mensagens → opcionais.

### `/implementar-empresa`

Passos obrigatórios, que existem porque saltá-los custou retrabalho na ALClean:

1. **Situar:** confirmar que todos os módulos estão validados; identificar a fase.
2. **Modelo de dados antes de qualquer código** (`<slug>/modelo-dados.md`, a partir de
   `template-modelo-dados.md`): entidades e a sua fonte única, duplicações encontradas, ligações por
   id, ciclos de vida, o que é calculado e nunca guardado, **dinheiro e quem o vê**, significados
   confirmados no código. Validado pelo dono.
3. **Teste rápido** de cada serviço externo: criar o recurso real, aplicar uma peça mínima, fazer
   uma chamada real de onde a app vai chamar. As surpresas entram no spec antes do plano.
4. **Spec e plano em pedaços:** primeiro pedaço só a base (esquema, segurança, autenticação), até
   ~8 tarefas. Os pedaços seguintes planeiam-se depois de executar e rever o anterior.
5. **Executar e rever**, colando nos briefs as secções de `reference-verificacao.md`: rever o estado
   vivo, testes de segurança que conseguem falhar, significado dos campos pelo uso.
6. **Retrospetiva** no fim de cada pedaço.
7. **Fim da fase / da empresa:** verificação de ponta a ponta com sessões reais; poda do registo de
   melhoria contínua.

## B2. Melhoria contínua

`docs/superpowers/melhoria-continua.md` é o registo único. Uma entrada só existe se o problema tiver
**causa no procedimento** e for **repetir-se noutra empresa**. Registar é automático; alterar uma
skill exige aprovação do dono. No fim de cada empresa faz-se a poda (absorvida, obsoleta, fundida).

| # | Regra | Estado |
|---|---|---|
| M-001 | Modelo de dados decidido antes de qualquer código | aplicada |
| M-002 | Teste rápido contra o sistema real antes de planear integrações | aplicada |
| M-003 | Planos em pedaços, base primeiro | aplicada |
| M-004 | Rever o estado vivo (políticas, funções, publicações), não só os ficheiros; tudo o que está vivo tem migração | aplicada |
| M-005 | Testes de segurança têm de conseguir falhar | aplicada |
| M-006 | O comportamento do código ganha ao comentário | aplicada |
| M-007 | `personalizar-modulo` lê o código do template | aplicada |
| M-008 | Sem fork em simulação: dos mockups vai-se direto ao modelo de dados e à base real | proposta |
| M-009 | Comparar cada passo do processo da empresa com o que o template suporta; o que falta tem ecrã no mockup | proposta |
| M-010 | Âmbito rastreável; "fora de âmbito" e decisões de produto aprovados pelo dono | proposta |
| M-011 | Pré-requisitos externos (chaves, domínio, email) e método de login pedidos no início | proposta |
| M-012 | Teste do dono em ambiente de testes no fim de cada pedaço | proposta |
| M-013 | Fases de endurecimento e de produção; triagem obrigatória dos pendentes | proposta |
| M-014 | Dívida do template registada e devolvida no fecho | proposta |
| M-015 | Nenhuma credencial em documentos de trabalho | proposta |
| M-016 | Modelo de dados cobre apagar/arquivar, suspensão e quem cria cada entidade | proposta |
| M-017 | Controlos automáticos de qualidade (tipos, lint, testes, CI) no template | proposta |

As propostas M-008 a M-017 esperam pela decisão de arquitetura (secção D1).

---

# Parte C — ALClean

## C1. A empresa

| Campo | Valor |
|---|---|
| Nome / slug | ALClean / `alclean` |
| Área | Limpezas de alojamento local |
| Vocabulário | **Limpeza / Limpezas**, **Alojamento / Alojamentos**, **Colaborador / Colaboradores / colaboradora** |
| Unidade | **Quarto** |
| Marca | Nome "ALClean", cor primária **teal `#0D9488`**, tom **informal** (tratamento por "tu") |
| Módulos opcionais | Rendimentos **ativo** (a pedido explícito); Inventário e Serviços ligados **recusados por agora** |
| Validados (17/09/2026) | Equipas, Clientes, Planeamento, Execução, Aprovações, Mensagens, Rendimentos |

**Pessoas e dados reais de arranque:**

- **Gestora:** Carla Mendes. É também colaboradora e dona da empresa.
- **Equipa Alfa:** Sofia Martins (responsável), Rui Cabral.
- **Equipa Beta:** Inês Ferreira (responsável), Beatriz Teles.
- **Clientes:** Apartamentos Baixa-Chiado e Villa Mar Cascais (com lavandaria); Residencial Setúbal
  e João Teixeira (sem lavandaria). No total 7 alojamentos e 9 quartos.
- Hoje comunicam por WhatsApp e telefone.

### Processo descrito pela empresa

- **Equipas:** equipas pré-definidas que a gestora reorganiza conforme a necessidade. A gestora gere
  tudo.
- **Clientes:** um cliente tem um ou vários alojamentos; cada alojamento tem um ou mais quartos.
- **Planeamento:** as limpezas nascem das reservas iCal (Airbnb, Booking.com) **e** de criação manual
  pela gestora. **Quem decide e atribui é sempre a gestora.**
- **Ciclo de trabalho:**
  1. **Início:** a colaboradora vê a limpeza atribuída e confirma-a. Antes de sair revê as notas da
     gestora e confirma o acesso ao alojamento. Leva material de limpeza **só quando o cliente não
     fornece os produtos** (opção do cliente), e sacos de roupa só quando o cliente tem a opção de
     lavandaria.
  2. **No local:** quartos (limpeza e arrumação), casas de banho (limpeza e desinfeção), cozinha
     (superfícies), sala (limpeza e arrumação), repor consumíveis, verificar danos, deixar portas e
     janelas em segurança.
  3. **Registo:** fotos por espaço (quarto, casa de banho, cozinha, sala); quantidades de roupa
     (lençóis, capas de edredon, fronhas, toalhas de banho, toalhas de rosto); hora de início e de
     fim, sem cronómetro.
  4. **O que corre mal:** atraso, dano, falta de material, acesso impossível, outro — registado com
     foto **ou** mensagem, no momento.
  5. **Fim:** conclui a checklist e envia à gestora.
  6. **Revisão:** só manual se houver ocorrência (incidência, atraso, tarefas por fazer, diferença na
     roupa, duração muito acima do previsto). Sem ocorrências → aprovada automaticamente.
  7. **Se algo não está bem:** a gestora pede correção ou reabre.

## C2. Decisões validadas por módulo

Cada módulo tem um mockup aprovado (links em `../alclean/modulos/*.md`). **Estas decisões são a
autoridade sobre o comportamento; o código tem de as seguir.**

### Equipas

| Tema | Decisão |
|---|---|
| Papéis | **Gestora** e **Colaborador(a)**. Não há nível Admin separado: a gestora é também dona e colaboradora (modo `micro`). |
| Modelo de equipa | Equipas base pré-definidas que a gestora reorganiza. |
| Ausências | Férias, Folga, Baixa médica e **Não comunicada** (marcada pela gestora quando a colaboradora não aparece nem avisa). |
| Aprovação de ausências | **Informal**, sem pedido/aprovação; ficam todas aprovadas. Só a gestora as regista. |
| Pagamento | **Por limpeza** (€/limpeza), não à hora nem salário. |
| Acesso | Ensino direto pela gestora no primeiro dia, **sem convite formal**. A gestora cria o acesso e entrega a credencial. |
| Âmbito do mockup | Não validou dispositivo/responsividade. |

### Clientes

| Tema | Decisão |
|---|---|
| Unidade | **Quarto**. |
| Estrutura | Cliente → Alojamento → Quarto. |
| Check-in / check-out | Relevantes: condicionam quando a limpeza pode acontecer. |
| iCal | **Airbnb e Booking.com** (mais "Outro"; Vrbo removido). |
| Produtos e lavandaria | Configuráveis **ao nível do cliente**, não do alojamento. Uma única definição aplica-se a todos os alojamentos do cliente. (No template vive no alojamento; tem de subir para o cliente.) |

### Planeamento

| Tema | Decisão |
|---|---|
| Vista mais usada | **Dia**. O arrastar-e-largar da atribuição é o ecrã principal. |
| Capacidade | Varia muito; **sem alerta automático** fixo de pico. |
| Viradas rápidas (saída e entrada no mesmo dia) | Críticas e frequentes; **prioridade alta**. |
| Sinal visual | Só o `PriorityDot` (bolinha vermelha) no cartão, **sem texto repetido**. O texto "saída e entrada no mesmo dia" fica numa lista de alertas agregada. |
| Visibilidade | As colaboradoras **só veem o plano depois de a gestora o publicar**. |

### Execução

| Tema | Decisão |
|---|---|
| Checklist ("Tarefas de limpeza") | As 7 tarefas nativas: Quartos; Casas de banho; Cozinha; Sala; Repor consumíveis; Verificar danos; Portas e janelas em segurança. |
| Preparação | Rever notas da gestora; Confirmar acesso ao alojamento; Levar material de limpeza (**só se o cliente não fornece**); Levar sacos de roupa para a lavandaria (**só se o cliente tem lavandaria**). |
| **Regra de segurança** | **A app nunca guarda nem mostra códigos ou chaves de acesso.** Um telemóvel roubado não pode comprometer o cliente. "Confirmar acesso" é um passo sem campo. O item "Verificar códigos ou chaves" do template foi removido. |
| Fotografias | Quarto, Casa de banho, Cozinha, Sala. |
| **"Inventário da roupa a lavar"** | Renomeado de "Quantidades de lavandaria". **Sempre disponível em todas as limpezas**, mesmo sem recolha para lavandaria, para validar as quantidades contra o previsto. |
| Incidências | Atraso, Dano, Falta de material, Acesso impossível, Outro. Um registo só com texto é válido; a foto é opcional. |
| Cronómetro | Desligado; só hora de início e de fim. |
| Offline | Validado como "relevante", mas **retirado deliberadamente na Fase 2** (a app assume rede). A linha validada está ultrapassada e deve ser rediscutida com o dono. |

### Aprovações

| Tema | Decisão |
|---|---|
| Tipos de anomalia | Os mesmos da Execução. |
| Aprovação automática | Sem nenhuma ocorrência (sem incidência, sem atraso, checklist completa, sem falta na roupa, duração dentro do previsto) → aprovada e direta para o histórico. Com qualquer ocorrência → "Por rever". |
| Correção / reabertura | A gestora pede correção ou reabre (volta ao Planeamento ou à Execução). |
| Rótulo | **"Inventário de Roupa"** (antes "Roupa em falta"); **só conta faltas, não excessos**. |
| Tolerância de duração | 30 min por omissão, **ajustável pela gestora**. |
| Quem revê | **Só a gestora.** |

### Mensagens

| Tema | Decisão |
|---|---|
| Quem fala com quem | A colaboradora pode falar **diretamente com o cliente**, não só com a gestora. |
| Avisos | Confirmação de leitura; próximo trabalho a caminho; **nova reserva ou alteração via iCal, só quando cai na semana em curso**; **virada rápida do dia** (prioridade alta, com o critério do Planeamento). |

### Rendimentos

| Tema | Decisão |
|---|---|
| Ciclo de faturação | **Quinzenal** (ciclo "personalizado"). |
| Prazo de pagamento | **À vista** (0 dias). |
| Custo de equipa | Pelo **valor pago por limpeza**, com opção configurável: só o valor por limpeza, **ou** valor por limpeza + deslocações. |
| Limiares de saúde | Os do template (secção A5·7), **ajustáveis pela gestora**. |
| Custo de produtos | Não rastreado enquanto o Inventário estiver desligado; a métrica fica escondida. |

## C3. Regras transversais da ALClean

1. **Nunca guardar códigos ou chaves de acesso**, em nenhum campo, tabela ou nota estruturada.
2. **Dinheiro só para a gestão.** A colaboradora nunca vê faturação, margens, tarifas dos clientes nem
   o pagamento das colegas. Vê **só o seu próprio** valor por limpeza.
3. **A gestora decide e atribui tudo.** A colaboradora executa, confirma, regista e conclui.
4. **Lavandaria e produtos são definições do cliente**, propagadas a todas as suas limpezas.
5. **O que decide a aprovação automática não pode vir da colaboradora.** Horas e duração são do
   servidor; a colaboradora não pode alterar uma limpeza concluída.
6. **O histórico e a auditoria só crescem.**
7. **Datas e horas em Europe/Lisbon**, com o relógio real (nunca datas de demonstração).
8. **Português de Portugal** em toda a interface; tom informal ("tu").

## C4. Fase 1 — Fork em simulação (17/09/2026)

Em `alclean/app/` (repositório git próprio, com remoto no GitHub): cópia do `src/` e `preview/` do
template, com um build novo.

- **Build:** `package.json` com `react`/`react-dom` 18.3 e `esbuild`; `build.mjs` compila
  `src/entries/<modulo>.tsx` → `preview/module-N-*-react.js` (IIFE, minificado) para 7 módulos.
  Inventário e Onboarding não são compilados.
- Removidas as variantes de formação/manutenção; tudo só "limpezas".
- Paleta verde `#17643e` substituída por teal `#0D9488` (285 substituições) e logótipo "AL**Clean**".
- Dados de exemplo com as pessoas, equipas e clientes reais (C1).
- Todas as decisões de C2 aplicadas no código, com as regras ajustáveis guardadas em `localStorage`.
- Correção herdada para Rendimentos: o custo de equipa por cliente deixou de ser subalocado
  (`totalBilledJobs`).

Lição (M-008): esta fase foi quase toda refeita na Fase 2. **Numa reconstrução, não repetir.**

## C5. Fase 2 — Backend, base de dados e autenticação (18–19/09/2026)

### Decisões de arquitetura

| Decisão | Escolha |
|---|---|
| Plataforma | **Supabase** (Postgres + Auth + Realtime + Storage), projeto dedicado à ALClean, região eu-west-1 |
| Acesso aos dados | Cliente Supabase direto no browser, protegido por **RLS**; sem servidor intermédio |
| Lógica sensível | Funções Postgres (RPC) e triggers; uma Edge Function para criar contas |
| Tempo real | Subscrições Supabase Realtime |
| Alojamento | App estática (Vercel ou Netlify) — **ainda não publicada** |
| Contas | Gestora e colaboradoras, todas com conta real, criadas pela gestora |
| Fora de âmbito | Pagamentos reais, envios reais (WhatsApp/email/SMS/push), importação iCal, offline, várias empresas |

### Estrutura do código

- `src/modules/shared/supabase/client.ts` — cliente único (URL e chave anon injetadas no build por
  `define`; a chave `service_role` **nunca** entra no bundle).
- `shared/supabase/realtime.ts` — `subscribeTable(tabela, cb)` (canal `alclean:<tabela>`).
- `shared/supabase/useSupabaseData.ts` — `useSupabaseData(carregar, tabelas, aplicar, aoFalhar?)`:
  carrega, recarrega a cada mudança nas tabelas, devolve `carregado`.
- `shared/auth/AuthProvider.tsx` + `LoginScreen.tsx` — sessão e ecrã de entrada.
- `shared/dates/relogio.ts` — `hojeLocal()`, `agoraLocal()`, `carimboLocal(iso)`, sempre
  Europe/Lisbon.
- Cada módulo ganhou um `repository.ts` (leituras e escritas); o hook do módulo mantém a mesma forma
  de dados à saída, para a UI ficar quase intacta.
- Padrão de escrita: despachar localmente (otimista), escrever no Supabase; **se falhar, mostrar o
  erro e recarregar do servidor**.
- `.env` (fora do git): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. O build
  usa `--env-file-if-exists` para funcionar também sem ficheiro (CI).

### Scripts (`npm run …`)

| Script | Função |
|---|---|
| `build` | Compila os 7 módulos |
| `seed` | Apaga e repõe os dados de arranque (equipas, 4 colaboradoras, tarifas, 4 clientes, 7 alojamentos, 9 quartos, faturação do cliente). Não apaga gestoras. **Não cria a conta da gestora** (foi criada à mão pela API de administração). |
| `rls-check` | Teste de regressão das fronteiras de segurança com sessões reais descartáveis: **140 verificações** |
| `demo:criar` / `demo:remover` | 12 limpezas de demonstração desta semana, marcadas `[DEMO]` na nota da gestora; a remoção só apaga o que tem o marcador (incluindo fotos) |

### Modelo de dados (31 tabelas, 17 migrações)

**Núcleo (0001):**

| Tabela | Conteúdo |
|---|---|
| `people` | Gestora e colaboradoras (fonte única da pessoa): `auth_user_id`, `name`, `email`, `phone`, `role manager\|collab`, `team_id`, `access none\|sent\|active\|suspended\|failed`, `completed_jobs`, `since`, `archived`, `sent_at` |
| `teams` | `name`, `lead_id`, `zones[]` |
| `clients` | Identificação, contactos, NIF, estado, notas, **`laundry_enabled` e `laundry_setup` (jsonb lencol/edredon/fronhas/banho/rosto) ao nível do cliente** |
| `service_locations` | Alojamentos: `client_id`, `team_id`, horários de saída/entrada (11:00/15:00), `access_instructions` (**nunca códigos**), notas |
| `units` | Quartos: `location_id`, tipo, capacidade, `team_id`, horários opcionais (nulo herda) |
| `unit_calendars` | iCal: plataforma (Airbnb, Booking.com, Outro), URL, estado |
| `absences` | Tipos `ferias`, `folga`, `indisponibilidade`, `formacao`, `consulta`, `baixa`, `nao_comunicada`; `status` por omissão `approved` |

**Ciclo de vida da limpeza (0002)** — **uma só tabela `jobs`**, do planeamento à aprovação:

- Estado operacional `unpublished → planned → confirmed → in_progress → done`.
- Estado de revisão `pending → approved | correction | reopened | archived`.
- `unit_id`, `location_id`, `team_id`, `scheduled_on`, `starts_at`, `ends_at`, `source ical|manual`,
  `platform`, `stay_date`, **`checkin_same_day`** (critério de prioridade alta), horários,
  **`supplies_own_products`** e **`laundry_collection_active`** (carimbados do cliente),
  `manager_note`, `notes`, `started_at`, `finished_at`, `duration_sec`, `review`, `reopen_to`,
  `auto_approved`.
- **"Em atraso" não é guardado; é calculado.**
- Filhas: `job_assignments (job, person, hours)`, `job_checklist_items (kind prep|task, position,
  label, done)`, `job_laundry_counts (item, planned, counted, confirmed)`, `job_photos (storage_path,
  kind)`, `job_issues (type, delay_min, description, photo_id, person_id)`, `job_events` e
  `job_approval_audit` (só de acrescentar).

**Mensagens, faturação e definições (0003):**

- `conversations (kind, title, client_id, job_id, priority, resolved, created_by)`,
  `conversation_participants`, `messages (from_person_id, text, state, scheduled_for)`,
  `message_reads` (leitura por pessoa), `message_attachments`, `notices (type, priority, audience,
  target…)`.
- `client_billing (cycle custom = quinzenal, terms 0, supply 'client', supplement)`,
  `billable_units`, `invoices`, `invoice_payments` (**o estado da fatura deduz-se daqui**),
  `team_payments (person, month, paid_on)` — sem montante, que se calcula.
- `company_settings` — **linha única** (`id boolean` com check): `duration_tolerance_min` (30, entre
  0 e 480), `health_limits` jsonb, `travel_included`.

**Dinheiro separado (0005)** — porque o RLS filtra linhas, não colunas:

| Tabela | Quem acede |
|---|---|
| `people_pay (person_id, per_job_rate)` | Gestora; a colaboradora lê **só a sua linha** |
| `unit_rates (unit_id, hourly_rate)` | Só gestora (quarto sem tarifa herda do alojamento) |
| `location_rates (location_id, hourly_rate)` | Só gestora |

**Modelos das listas (0016):** `exec_checklist_template` (4 itens de preparação, 2 condicionais
`material`/`lavandaria`; 7 tarefas) e `exec_laundry_template` (lencol, capa, fronha, tbanho, trosto
mapeados para as chaves do cliente). Têm de ser iguais a `execucao/config.ts`.

### Segurança (RLS) — quem vê e altera o quê

Funções auxiliares (`security definer`, `stable`): `current_person_id()`, `is_manager()` (gestora e
não arquivada), `my_team_id()`, `assigned_to_me(job)`. Pessoas arquivadas deixam de ter identidade.

| Quem | Vê | Altera |
|---|---|---|
| Gestora | Tudo | Tudo (política `for all` em cada tabela), exceto a auditoria, que só lê e acrescenta |
| Colaboradora | Pessoas da sua equipa, as gestoras e ela própria; equipas; clientes, alojamentos e quartos **só onde tem limpezas**; as suas ausências; limpezas atribuídas a si ou à sua equipa; conversas onde participa; avisos para `todos`/`colab`; os seus pagamentos; a sua tarifa | O progresso das suas limpezas **através das funções de execução**; marcar tarefas e contar roupa enquanto a limpeza não está concluída; fotos e anomalias; as suas mensagens |
| Sem sessão | Nada | Nada |

Pormenores que têm de se manter:

- **Trigger de guarda em `jobs`** (em vez de permissões por coluna, que se aplicariam também à
  gestora): a colaboradora não altera revisão, reabertura, aprovação automática, agendamento, equipa,
  quarto, alojamento, nota da gestora, flags do cliente, dados da reserva, `created_at`, nem estado,
  horas e duração fora do fluxo de execução. Não altera nada numa limpeza `done` ou `unpublished`.
- **Estado, horas e duração só mudam dentro de `exec_transition`**, que liga um marcador de
  transação (`alclean.fluxo_execucao = on`) que o trigger reconhece.
- Transições permitidas: `planned→confirmed`, `planned→in_progress`, `confirmed→in_progress`,
  `in_progress→done`. Nunca para trás (só a gestora reabre).
- Checklist e roupa: a colaboradora **não insere nem apaga**; só muda `done` / `counted` /
  `confirmed`; nunca o `planned` da roupa.
- Eventos e anomalias: hora e autora **carimbadas pelo servidor** (`clock_timestamp()`,
  `current_person_id()`); só com a limpeza ativa.
- Fotos: inserir com a limpeza planeada, confirmada ou em curso; apagar só confirmada ou em curso;
  nunca depois de concluída (é a prova da gestora).
- Conversas: a colaboradora só cria em seu nome e sobre clientes/limpezas onde tem trabalho; só se
  junta a conversas que criou ou onde já está.
- `revoke truncate` a `anon` e `authenticated` em todas as tabelas.

### Funções (RPC)

| Função | Tipo | Faz |
|---|---|---|
| `upsert_person` | invoker | Pessoa + tarifa numa transação |
| `upsert_client` | invoker | Cliente (+ `client_billing` na criação) |
| `upsert_location` | invoker | Alojamento, primeiros quartos, tarifa |
| `commit_location_detail` | invoker | Reconcilia numa transação todos os quartos (cria, atualiza, apaga), tarifas e calendários |
| `save_job` | invoker | Atualiza a limpeza e substitui as atribuições |
| `exec_transition(job, status, notes, qty, events)` | **definer** | Única forma de mudar estado e horas. Verifica atribuição, bloqueia a linha, valida a transição, grava a roupa, horas do servidor (duração ≥ 60 s) e eventos. Na conclusão decide a aprovação automática. |
| `exec_add_photo` / `exec_add_issue` / `exec_insert_events` | — | Registo de foto (valida o caminho), anomalia (foto opcional), eventos |
| `exec_materializar(job)` + trigger `jobs_materializar_listas` | definer, não exposta | Cria a checklist e a roupa **no servidor** ao inserir a limpeza, a partir dos modelos e das flags do cliente; `planned` da roupa vem de `clients.laundry_setup` |
| trigger `jobs_stamp_client_flags` | definer | Carimba `supplies_own_products = (supply = 'client')` e `laundry_collection_active = clients.laundry_enabled` |
| `aprov_ocorrencias(job)` | invoker | Códigos, por esta ordem: `anomalia`, `atraso`, `tarefas`, `roupa`, `duracao` |
| vista `job_approval_facts` | security invoker | Início previsto (Lisboa), atrasada (início real > previsto + **10 min**), duração prevista (atravessa a meia-noite), duração real, anomalias, tarefas em falta, roupa em falta (`coalesce(confirmed, counted) < planned`) |
| `aprov_rever(job, 'aprovar'\|'corrigir'\|'reabrir', nota, 'Planeado'\|'Em curso')` | invoker | Só gestora (senão 42501). Aprovar/corrigir só de `pending`; corrigir e reabrir exigem nota; reabrir exige destino e limpeza `done`. Estado + auditoria numa transação. |

**Significado confirmado de `supplies_own_products`:** `true` = **o cliente fornece os produtos**, logo
**não** se leva material. O comentário original dizia o contrário; o código é que estava certo.

### Aprovação automática (decidida no servidor)

Na passagem `in_progress → done`, `exec_transition` calcula as ocorrências só com dados que o servidor
controla:

- anomalia registada;
- **atraso:** início real mais de **10 min** depois do previsto (igual a `LATE_AFTER_MIN` da
  Execução; o `rls-check` falha se divergirem);
- tarefas por fazer;
- **falta** na roupa (excesso não conta);
- duração real > prevista + `company_settings.duration_tolerance_min`.

Sem nenhuma → `review='approved'`, `auto_approved=true` e linha "Aprovada automaticamente" na
auditoria com autor "Sistema". Com alguma → `pending`. **Uma limpeza reaberta nunca se aprova
automaticamente.** `rules.ts::occurrenceCodes()` da app devolve exatamente os mesmos códigos; o
`rls-check` compila o código da app e compara-o com o servidor.

### Autenticação

- **Gestora:** email e palavra-passe (`gestora@alclean.local`).
- **Colaboradora:** escolhe/escreve o nome e um **PIN de 6 dígitos**. Por trás, o email é sintético
  `slug-do-nome@alclean.local` e o PIN é a palavra-passe do Supabase Auth.
- **Edge Function `provision-access`:** chamada pela gestora no ecrã de Equipas. Confirma pelo JWT
  que quem chama é gestora; valida o PIN (`^\d{6}$`); com a chave `service_role` cria o utilizador
  (`email_confirm: true`) ou repõe o PIN; grava `auth_user_id`, `email`, `access='active'` e
  `sent_at`. Tem CORS (também nas respostas de erro).
- `AuthProvider`: sessão → pessoa por `auth_user_id` → `{id, name, initials, role, teamId,
  canReview}`. Sem pessoa, mostra o ecrã de entrada. Menu ☰ com "Terminar sessão".
- Descobertas do teste real: o registo público recusa `@alclean.local` (consulta DNS/MX); um projeto
  novo esgota a quota de email; é preciso a API de administração.

### Storage

Bucket privado `job-photos` (15 MB; jpeg, png, webp, heic, heif), caminho `<job_id>/<uuid>.jpg`.
Políticas espelham as de `job_photos`. Imagens lidas por URLs assinados (1 h). A app redimensiona
para JPEG ≤ 1600 px antes de enviar; se o registo falhar, apaga o ficheiro.

### Tempo real

Nas migrações: `people_pay`, `teams`, `service_locations`, `clients`, `units`, `unit_calendars`,
`unit_rates`, `location_rates`, `job_assignments`, `job_photos`, `job_approval_audit`,
`company_settings`. `jobs` e `absences` foram acrescentadas **à mão** (sem migração). `people`,
`job_checklist_items`, `job_laundry_counts`, `job_issues` e `job_events` são subscritas pela app mas
não aparecem em nenhuma migração. **Numa reconstrução, declarar a publicação completa numa
migração.**

### Estado de cada módulo no fim da Fase 2 (Task 13 de 16)

| Módulo | Estado | Resta mock ou em falta |
|---|---|---|
| Equipas | **Dados reais**, tempo real | "Próximas limpezas" da ficha inventadas; `saveTeamRow` não atómico |
| Clientes | **Dados reais**, quartos e lavandaria no cliente | **Seletor de equipas com dados de demonstração** (ids `'alfa'`/`'beta'` numa coluna uuid, falha provável); `billing`/`payment` fixos; iCal simulado |
| Planeamento | **Dados reais**, relógio real | Capacidade do mês com dados de demonstração; **não existe forma de criar limpezas**; publicar não notifica; rótulo "Unidade" em vez de "Quarto"; "Confirmar leitura" só funciona para a gestora |
| Execução | **Dados reais**, fotos no Storage, sem offline | Separador Mensagens vazio; pedido de correção não chega à colaboradora |
| Aprovações | **Dados reais**, aprovação automática no servidor, tolerância em `company_settings` | Evidências mostram mosaicos simulados em vez das fotos |
| Mensagens | **100 % mock** (`localStorage`) | Esquema e RLS prontos, não ligados (Task 14) |
| Rendimentos | **100 % mock** (`localStorage`, `DEMO_TODAY`) | Tabelas prontas, não ligadas; limiares e deslocações deviam ir para `company_settings` (Task 15) |
| Inventário / Onboarding | Não usados | — |
| Publicação online | Por fazer | Task 16 |

Navegação: cada módulo continua a ser uma página separada; a barra de topo não navega.

## C6. Lacunas e riscos (auditoria de 19/09/2026)

**Bloqueiam produção (segurança):**

| # | Problema |
|---|---|
| C1 | **"Suspender acesso" não tem efeito** — nenhuma regra consulta `suspended` |
| A1 | Uma sessão sem pessoa associada lê equipas, definições, avisos e contactos da gestora; o registo público está ligado |
| A2 | Autenticação fraca: PIN de 6 dígitos e email previsível a partir do nome; dois nomes iguais colidem |
| A3 | `provision-access` aceita uma gestora arquivada, pode repor o PIN de qualquer pessoa e ignora erros |
| A4 | Apagar uma pessoa apaga em cascata pagamentos e atribuições; apagar uma limpeza apaga fotos e auditoria |
| A5 | A base não se reconstrói só das migrações (tempo real, histórico de migrações divergente) |
| M1 | Concluir em 60 s não levanta ocorrência (falta "duração muito abaixo" e mínimo de fotos) |

**Falta para uso diário:** criar limpezas (manual); importar reservas iCal; terminar Mensagens e
Rendimentos; recuperar acesso; entrada das colaboradoras por lista; gestão de conta; notificações
reais; instalação no telemóvel (PWA).

**Qualidade:** sem `tsconfig`, lint, testes (além do `rls-check`) nem CI; 67 `any` na fronteira com
a base; erros do Postgres mostrados em inglês; ecrã branco sem proteção; duplicação de formatadores;
7 bundles de ~450 KB com React repetido; Tailwind por CDN.

**Operação:** um só ambiente (os testes correm contra a base com nomes reais); sem backups (plano
gratuito), monitorização nem domínio.

**Legal (RGPD):** a empresa cliente é responsável, o produto é subcontratante. Faltam acordo de
tratamento de dados, registo de tratamentos, prazos de conservação das fotos, exportação e
apagamento a pedido, termos e política de privacidade. **Os tipos de ausência "baixa" e "consulta"
são dados de saúde**: guardar o motivo de forma genérica.

**Credenciais:** uma password temporária da gestora ficou escrita no registo de execução. Tem de ser
rodada e retirada do ficheiro.

---

# Parte D — Recomeçar do zero

## D1. A decisão que vem primeiro

A auditoria deixou uma decisão por tomar, e ela muda tudo o resto:

| | Cópia do código por empresa (feito até agora) | Produto único multi-empresa (recomendado pela auditoria) |
|---|---|---|
| Corrigir um defeito | à mão em N repositórios e N bases | uma vez |
| Nova empresa | copiar, editar código, migrar, rever | criar a empresa e preencher a configuração |
| Segurança | uma fuga fica numa empresa | exige `company_id` em todas as tabelas e regras, e testes entre empresas |
| Custo | um projeto Supabase por empresa | um projeto |

Dois dias depois da cópia, a ALClean já diferia do template em 113 ficheiros. Se escolher o produto
único, tudo o que abaixo diz "da ALClean" passa a ser **configuração da empresa** guardada na base de
dados (vocabulário, cor, módulos ativos, checklist, tolerâncias, limiares, domínio de login), e as
skills passam a produzir essa configuração em vez de uma cópia do código.

## D2. Ordem recomendada

1. **Fundação técnica** (antes de qualquer módulo):
   - Uma só aplicação com navegação interna (não 7 páginas), TypeScript estrito com `tsconfig`,
     lint, formatador, testes das `rules.ts`, CI, estilo compilado (não Tailwind por CDN).
   - Kit de UI partilhado (A4) com os tokens da marca vindos de configuração.
   - Um único dicionário de vocabulário (substitui os 5 atuais).
   - Relógio real em Europe/Lisbon desde o primeiro dia (`hojeLocal`, `agoraLocal`); nenhuma data
     de demonstração no código.
   - Código em inglês; interface e comentários em português de Portugal.
   - Ambientes separados (desenvolvimento/testes e produção).
2. **Perfil e módulos** (`/personalizar-empresa`, `/personalizar-modulo`). Para a ALClean, as
   respostas estão todas na Parte C e podem ser reaproveitadas. Em cada módulo, marcar cada passo do
   processo como "suportado / em falta" (M-009) — foi assim que "criar limpezas" escapou.
3. **Pré-requisitos externos e login** pedidos logo aqui (M-011): conta Supabase e chave
   `service_role`, domínio, email de envio, método de entrada das colaboradoras.
4. **Modelo de dados** (M-001, M-016), partindo do esquema de C5 e acrescentando:
   - o que acontece ao **apagar e arquivar** (pessoas só se arquivam; limpezas concluídas não se
     apagam; nada apaga pagamentos nem prova);
   - o que **suspender** bloqueia (as funções de identidade exigem acesso ativo; banir no Auth);
   - **quem cria cada entidade** (incluindo limpezas manuais e vindas do iCal: `reserva`, `origem`);
   - NIF e contactos do cliente numa tabela só da gestão;
   - `company_id` em tudo, se for produto único.
5. **Teste rápido** do Supabase (M-002): uma tabela com política, uma função, um login de cada papel,
   uma chamada à Edge Function a partir do browser (CORS).
6. **Base** (primeiro pedaço): esquema, RLS, autenticação, `rls-check`. Tudo o que existe no sistema
   vivo está numa migração, incluindo a publicação de tempo real.
7. **Módulos já sobre dados reais**, um pedaço de cada vez, com teste do dono no fim de cada um
   (M-012): Equipas → Clientes → Planeamento (**com criação manual de limpezas**) → Execução →
   Aprovações → Mensagens → Rendimentos → importação iCal.
8. **Endurecimento** (M-013): fechar C6; teste de ponta a ponta com contas reais.
9. **Produção:** domínio, email próprio, backups, monitorização, RGPD, dados reais, formação da
   gestora; o dono assina o arranque.
10. **Fecho:** retrospetiva, poda do registo de melhoria contínua, devolver ao template o que for
    genérico.

## D3. Regras técnicas a manter desde o primeiro dia

Todas estas custaram pelo menos uma ronda de correção na Fase 2:

1. **Uma entidade, uma tabela, ligada por id.** Nunca por nome.
2. **Uma só tabela para o ciclo de vida do trabalho**, com o estado operacional e o de revisão
   separados. "Em atraso", estado de fatura, margem e saúde são **calculados, nunca guardados**.
3. **Dinheiro em tabelas próprias**, fora de tudo o que a colaboradora precisa de ler. O RLS não
   esconde colunas.
4. **Colunas protegidas por trigger**, não por `GRANT` por coluna (que se aplica ao papel
   `authenticated`, comum à gestora e à colaboradora).
5. **Tudo o que decide a aprovação é escrito pelo servidor:** horas, duração, listas, autoria e hora
   dos eventos. A aprovação automática corre no servidor, e a app usa exatamente o mesmo critério
   (testado).
6. **Listas de trabalho criadas pelo servidor** a partir de modelos, não pela app.
7. **Funções chamadas pela app são `security invoker`**; `definer` só com justificação escrita
   (identidade, transições, carimbos).
8. **Duas escritas em tabelas diferentes = uma função = uma transação.**
9. **Auditoria e histórico só de acrescentar**, também para a gestora (`revoke update, delete`).
10. **Tempo real declarado em migração.** Uma tabela fora da publicação falha em silêncio.
11. **Rever o estado vivo:** `pg_policies`, `pg_proc.prosecdef`, `pg_publication_tables`, funções
    publicadas, preflight CORS.
12. **Testes de segurança que conseguem falhar:** semear e confirmar antes de testar a recusa;
    distinguir recusa (`42501`, `P0001`) de erro; controlo positivo; cada coluna protegida; sonda de
    sanidade com nome errado que tem de falhar; só dados descartáveis com marcador, apagados em
    `finally`; nunca tocar no que não criou (cuidado com tabelas cuja chave é o id de uma entidade
    real).
13. **O comportamento do código ganha ao comentário.** Ler onde um campo é lido e escrito antes de
    decidir o que significa.
14. **Números escritos por pessoas** ("9,50") passam pelo parser do módulo, nunca por `Number()`.
15. **Colunas `time` devolvem `HH:MM:SS`**; normalizar para `HH:MM` na leitura.
16. **Inserts em lote heterogéneos pelo PostgREST enviam `NULL` explícito** e contornam os defaults;
    preencher sempre os campos com default.
17. **`useSupabaseData` com referências estáveis** (`carregar` ao nível do módulo, `aplicar` com
    `useCallback(..., [])`), senão entra em ciclo infinito.
18. **Não ler estado por uma `ref` logo depois de despachar:** o recarregamento devolve os dados.
19. **Toda a ação que falha repõe o ecrã** (mostra o erro e recarrega).
20. **Nenhuma credencial em documentos**, scripts versionados ou relatórios. A `service_role` nunca
    entra no bundle.

## D4. Critério de "pronto" para a ALClean

- A gestora cria limpezas (manual e por iCal), atribui, publica; a colaboradora só as vê depois de
  publicadas.
- A colaboradora entra com credenciais seguras, confirma, executa, fotografa, regista anomalias e
  conclui; não vê nenhum código de acesso nem dinheiro que não seja o seu.
- Aprovação automática no servidor, igual ao que a gestora vê; revisão, correção (que **chega à
  colaboradora**) e reabertura com auditoria.
- Mensagens e avisos reais, incluindo conversa direta colaboradora ↔ cliente e os 4 avisos de C2.
- Rendimentos a partir das limpezas aprovadas, ciclo quinzenal, à vista, custo por limpeza com ou
  sem deslocações, limiares editáveis.
- Suspender e arquivar bloqueiam de facto; nada apaga prova ou pagamentos.
- `rls-check` verde num ambiente de testes; tipos, lint, testes e CI verdes; backups ativos.
- A app está publicada num domínio, instalável no telemóvel, e o dono aprovou o arranque.
