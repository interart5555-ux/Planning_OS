# AppOS · Limpezas — Levantamento descritivo, módulo a módulo

Data: 16 de setembro de 2026. Baseado na leitura integral do código em `src/modules/` (144 ficheiros, ~19.500 linhas), dos ficheiros de pré-visualização em `preview/` e do fecho de fase em `docs/fase-1-fecho.md`.

## Visão geral

AppOS · Limpezas é, nesta versão, uma **simulação visual** de uma aplicação de gestão para empresas de limpezas: sem base de dados, sem contas reais, sem pagamentos e sem envios reais (email/SMS/WhatsApp/push). Não existe `package.json` nem ficheiro de build no repositório — o código-fonte TypeScript/React em `src/` não está atualmente ligado a um processo de build reprodutível guardado no projeto; os ficheiros `preview/module-*-react.js` são bundles já compilados (esbuild, IIFE minificado) que as páginas `preview/module-*-react.html` carregam por `<script>`, junto com Tailwind via CDN e a fonte Public Sans do Google Fonts.

Cada módulo "passo" tem, em `preview/`, duas versões lado a lado: um **desenho** estático (HTML/CSS/JS sem React, mockup) e a **versão React** funcional — refletindo um processo de entrega módulo a módulo (ver `raw/passo-N-*.png`).

### Padrão comum de cada módulo (`src/modules/<nome>/`)

- `types.ts` — modelo de dados do módulo.
- `config.ts` (ou `appConfigs.ts`) — vocabulário/terminologia e parâmetros, frequentemente preparados para 3 "apps" AppOS (`limpezas`, `formacao`, `manutencao`), embora só `limpezas` esteja em uso.
- `rules.ts` — funções puras de regras de negócio (cálculos, filtros, validações).
- `mockData.ts` — gerador de dados de demonstração determinísticos.
- `use<Modulo>Module.ts` — hook central de estado (`useReducer`/`useState`), por vezes com `store.tsx`/`context.tsx` em vez de/além do hook.
- `<Modulo>Module.tsx` — componente de topo/rota do módulo.
- `components/` — ecrãs e peças de UI.
- `index.ts` — barril de exportação pública do módulo.

### `src/modules/shared/`

- **`shared/ui`** — kit de componentes comuns: `Button`, `IconButton`, `Drawer`, `DrawerTitle`, `Dialog`, `ConfirmDialog`, `ActionMenu`, `ToastMessage`, `FilterBar`, `Field`, `Pill`, `Avatar`, `Switch`, `ChoiceChips`, `Icon` (biblioteca de ícones SVG), mais utilitários (`cx`, `focusRing`, `inputBase`) e `AppTopBar` (navegação de topo comum, com badges e menu ☰).
- **`shared/company`** — sistema de **módulos ativos**: `MODULOS_BASE` (1–6 e 10, sempre ligados) vs. `MODULOS_OPCIONAIS` (7 Rendimentos, 8 Inventário, 9 Serviços ligados), com `ModulosAtivosProvider`/`useModulosAtivos`, a janela `GerirModulosDialog` e o ecrã `ModuloInativo` ("Módulo indisponível", sem apagar dados). `ModulosAtivosHost` persiste a escolha em `localStorage` quando usado nas pré-visualizações.

---

## Módulos base (1–6, 10) — nunca podem ser desligados

### 1 · Empresa e utilizadores (`onboarding`)

**Propósito:** formulário de arranque que cria a empresa e a conta administradora.

**Ecrãs:** um único ecrã (`CompanyOnboarding.tsx`) — cartão centrado com "Quem faz a gestão diária?", nome da empresa, NIF, contacto, morada.

**Modelo de dados:** `CompanyOnboardingState` (nome, NIF, contacto, morada, `is_admin_also_manager`); `CompanyOnboardingResult` acrescenta `roles` (`Admin`/`Manager`) e `requires_manager_invite`.

**Regras de negócio (`validation.ts`):** validação de NIF português (9 dígitos, prefixo válido, dígito de controlo módulo 11), validação e formatação progressiva de contacto telefónico português (fixo/móvel), morada mínima de 5 caracteres. Se a administradora não faz também a gestão diária, marca `requires_manager_invite = true` para o passo seguinte convidar um gestor.

**Estado:** hook local `useCompanyOnboarding` (useState), sem persistência.

**Ligações:** é módulo-fonte — `isValidNIF`, `isValidContact`, `formatContact` e `CompanyOnboardingResult` são reutilizados por **Clientes** e **Equipas**.

**Nota:** ainda não tem página de pré-visualização React própria em `preview/` (confirmado no `fase-1-fecho.md`).

---

### 2 · Equipas (`equipas`)

**Propósito:** gestão de recursos humanos — colaboradoras/gestoras, equipas e ausências.

**Ecrãs:** `CollaboratorsTab` (lista/filtros/ações de acesso), `TeamsTab` (cartões de equipa), `AbsencesTab` (próximas/anteriores), `PersonDrawer` (ficha), `AddPersonDrawer` (wizard 2 passos), `TeamDrawer`, `AbsenceDrawer`.

**Modelo de dados:** `Person` (papel admin/manager/collab, estado de acesso active/sent/none/suspended/failed, valor/hora, histórico de trabalhos), `Team` (responsável, zonas, clientes, alojamentos), `Absence` (tipo férias/folga/indisponibilidade/formação/consulta/baixa, dia inteiro ou parcial).

**Regras de negócio:** email único e válido por empresa; nome de equipa único; deteção (sem bloqueio) de sobreposição de ausências; só se pode eliminar definitivamente quem não é admin e não tem trabalhos concluídos — caso contrário só arquivar.

**Estado:** `useTeamsModule` (`useReducer`) com regras de consistência embutidas (mudar de equipa remove liderança anterior; cada alojamento só tem uma equipa por defeito); sem persistência em localStorage. `sendAccess` simula envio de convite com `setTimeout`.

**Ligações:** consome `CompanyOnboardingResult.is_admin_also_manager` de **Onboarding** para determinar `CompanyMode` (`micro`/`separate`). **Nenhum outro módulo importa `equipas`** — os tipos `Client`/`Accommodation`/"equipa por defeito" existem a pensar no Planeamento, mas essa ligação real ainda não existe.

**Notas:** "Ver todos" dos próximos trabalhos e a agenda completa remetem para um Planeamento ainda não ligado; `DEMO_TODAY` fixo com comentário explícito "substituir por hoje quando houver dados reais".

---

### 3 · Clientes, alojamentos e unidades (`clientes`)

**Propósito:** hierarquia Cliente → Alojamento → Unidade: cadastro de clientes e configuração de cada alojamento (equipa, preço/hora, horários de estadia, lavandaria, calendários iCal) e das suas unidades.

**Ecrãs:** `ClientsList`, `ClientDrawer` (Resumo/Alojamentos/Unidades/Notas), `ClientFormDrawer`, `LocationsView`, `LocationFormDrawer`, `LocationDetail` (Configuração/Unidades/Lavandaria/Produtos*/Notas, com rascunho e aviso de saída sem guardar), `ConfigTab`, `UnitsTab` (edição em massa), `UnitDrawer`, `LaundryTab`, `CalendarEditor` (iCal).

**Modelo de dados:** `Client`, `ServiceLocation` (alojamento, com `checkinTime`/`checkoutTime`, `laundrySetup`), `Unit` (herda do alojamento quando os campos são nulos), `UnitCalendar` (Airbnb/Booking.com/Vrbo/Outro), `LaundryQty`.

**Regras de negócio:** validação de NIF/contacto reaproveitada do Onboarding; `applyToSelectedUnits` propaga configuração do alojamento às unidades selecionadas sem tocar nos calendários; deteção de URL iCal duplicado; sincronização iCal simulada (falha propositadamente se a URL contém "erro").

**Estado:** `useClientsModule` (`useReducer`), sem persistência — `mockData.ts` devolve sempre dados novos. `DEMO_TEAMS` são 3 equipas fixas, stub do módulo Equipas.

**Ligações:** consome `isValidNIF`/`isValidContact`/`formatContact` do **Onboarding**; consome `useModulosAtivos` de `shared/company` e `StaySupplySection`/`useOptionalInventory` do **Inventário** (separador "Produtos", só visível se o módulo estiver ativo). Nenhum módulo consome `clientes` ainda.

**Notas:** comentário explícito "Cliente e empresa são a mesma entidade"; Lavandaria tem um bloco "Como vai funcionar" marcado como fase seguinte; "Ver reservas/trabalhos" é apenas um toast simulado.

---

### 4 · Planeamento (`planeamento`)

**Propósito:** atribuir, rever, ajustar e "publicar" o trabalho por colaboradora/dia/semana/mês; vista simplificada ("O meu dia") para a colaboradora consultar o plano publicado.

**Ecrãs:** `WeekGrid` (pessoas × 7 dias), `DayTimeline` (cronograma horizontal com arrastar/esticar), `MonthCapacity` (capacidade mensal, alerta de pico), `AssignDrawer` (atribuir, ver conflitos), `CollaboratorView`/`JobDetailDrawer`, `UnassignedTray`/`WindowAlert` (fora do horário do alojamento). `useJobDrag.ts` é o motor de arrastar via Pointer Events (auto-scroll, snap de 15 min).

**Modelo de dados:** `Job` (status unpublished/planned/confirmed/in_progress/done/late; `assignees: Assignment[]`; `source: 'ical'|'manual'`), `PlanAbsence`, `PlanPerson`, `PlanTeam`.

**Regras de negócio:** deteção de sobreposição e de ausência no horário; cálculo de horas livres; prioridade e verificação do horário do alojamento (checkout/checkin, "flex"/"bad"); trabalhos `done`/`in_progress` não são movíveis; `analyseMonth` calcula pico e capacidade estimada.

**Estado:** `usePlanningModule` (`useReducer`), **sem persistência** — reinicia a cada carregamento a menos que receba `initialData` (ponto de injeção não usado por nenhum outro módulo ainda).

**Ligações:** **nenhum import real** de Equipas/Clientes/Execução — `people`/`teams`/`absences`/`stayTimes` são recebidos como props, com comentários a indicar de onde "viriam" (Equipas, Clientes), mas sem integração de código efetiva.

---

### 5 · Execução de trabalho (`execucao`)

**Propósito:** "O meu dia" — app mobile-first da colaboradora: consulta do dia, checklist, quantidades, fotos simuladas, registo de anomalias/atrasos e envio da conclusão.

**Ecrãs:** `AppBar`/`TabBar` (Hoje/Plano/Mensagens/Perfil), `DayList` (resumo do dia), `JobScreens` (Detail → Run → Finish → Sent), `IssueSheet` (anomalia/atraso), `MessagesBits` (sino, aviso do dia, mensagens dentro do trabalho), `PlanTab`/`ProfileTab`, `ProductsSection` (só se Inventário ativo).

**Modelo de dados:** `ExecJob` (status planned/confirmed/in_progress/done, `events` de auditoria), `Issue` (atraso/dano/material/acesso/outro), `Photo`, `HistoryEvent`.

**Regras de negócio:** "Em atraso" se não iniciado 10 min após a hora prevista; só um trabalho "em curso" de cada vez; diferenças de quantidade planeada vs. registada; notas obrigatórias se houver tarefas por concluir.

**Estado:** `useExecutionModule` — relógio simulado, `online`/`syncing` (perda/reposição de rede simulada com 1,6 s), **sem persistência em localStorage** (ao contrário de Mensagens/Inventário).

**Configuração:** `EXEC_FEATURES = { timer: false }` — único feature flag do projeto encontrado explicitamente por nome; cronómetro em tempo real fica para a Fase 2 (confirma o `fase-1-fecho.md`); por agora só se regista hora de início/fim.

**Ligações:** consome **Mensagens** (sino, avisos, conversa dentro do trabalho, com *fallback* local se o módulo não estiver montado) e **Inventário** (produtos usados/perdidos/em falta, condicional a `modulosAtivos.inventario`). É o módulo com mais integrações reais de código.

---

### 6 · Aprovações e histórico (`aprovacoes`)

**Propósito:** validação das limpezas concluídas pela gestora/administradora; conclusões completas e sem ocorrências são aprovadas automaticamente.

**Ecrãs (por `components/`):** `RecordList`, `RecordDrawer` (Detalhes/Evidência/Auditoria), `ReviewDialogs` (aprovar, pedir correção, reabrir), `Screens` (Aprovações/Histórico).

**Modelo de dados:** `WorkRecord` (checklist `tasks: boolean[]`, `qty` diffs, `issues`, `late`, `review`: pending/approved/correction/reopened/archived, `auto`, `audit: AuditEvent[]` — histórico append-only).

**Regras de negócio (confirmadas no código):** `occurrences()` lista o que obriga a revisão (anomalias, atraso, tarefas em falta, diferenças de roupa/material, duração excedida); `DURATION_TOLERANCE = 30` minutos — acima disso conta como "Duração excedida" mas **não** como anomalia (bate certo com a regra documentada no `fase-1-fecho.md`); só quem tem `canReview` (gestora/admin) pode aprovar, pedir correção ou reabrir; reabrir só devolve a "Planeado" ou "Em curso".

**Estado:** `useApprovalsModule` (`useReducer`), auditoria só cresce (nenhum evento é editado/apagado); sem persistência.

**Configuração:** `APPROVALS_CONFIGS` para 3 apps (limpezas/formação/manutenção), cada uma com a sua checklist e vocabulário.

**Ligações:** só `shared/ui`; `WorkRecord` é gerado localmente em `mockData.ts` — não há import real de Execução/Planeamento (a "limpeza concluída" que chegaria de lá é simulada aqui, não recebida via integração de código).

---

### 10 · Mensagens e notificações (`mensagens`)

**Propósito:** conversas de equipa/cliente, quadro de avisos do dia ("Hoje") e vista telemóvel para a colaboradora.

**Ecrãs:** `ConversationsScreen` (lista + chat + painel de detalhes, "Marcar como resolvida" só para gestão), `NewMessageScreen`, `NoticesBoard`/`TodayScreen`, `PhoneMessages` (vista compacta usada na Execução).

**Modelo de dados:** `Conversation` (kind equipa/cliente/interna, `resolved`, `jobId`), `Message` (estados sent/delivered/read/scheduled/failed), `Notice` (tipo, prioridade, `audience` gestao/colab/todos, `requires` módulo opcional).

**Regras de negócio (confirmam o `fase-1-fecho.md`):** `visibleConversations` — a colaboradora só vê conversas onde participa ou ligadas às suas limpezas; "Marcar como resolvida" só aparece para quem gere; sem portal/sessão do cliente nesta fase.

**Estado:** `store.tsx` com `MessagesProvider`/`useMessages` — mutação por clonagem profunda; **persistência em `localStorage` sob `appos.mensagens.v1`** (confirma a chave documentada), com validação de versão.

**Ligações:** consumido pela **Execução** (sino/badge de não lidas, `PhoneMessages`, avisos "Hoje"); consulta `useModulosAtivos` para esconder avisos de módulos opcionais inativos.

---

## Módulos opcionais (7–9) — a empresa decide

### 7 · Rendimentos (`rendimentos`)

**Propósito:** faturação, recebimentos, custos de equipa/produtos, margem e "saúde financeira" por período e por cliente.

**Ecrãs:** `OverviewScreen` (KPIs, semáforo de saúde financeira, faturação vs. custos), `PaymentsScreen`, `TeamScreen` (custos de equipa por mês), `ClientScreens` (rentabilidade por cliente/unidade), `InvoicePanel`/`PersonPanel`/`RegisterPaymentDialog`/`SupplyDialog`.

**Modelo de dados:** `RevenueClient` (`cycle` semanal/mensal/custom, `supply` included/client, `supplement`), `Invoice`/`PaymentRecord`, `TeamMember` (`share` das horas), `HealthCheck` (ok/warn/bad).

**Regras de negócio:** sazonalidade de horas faturáveis por tabelas fixas 2025/2026; custo de equipa repartido por `share`; `financialHealth`/`clientHealth` contra limites configuráveis (`HEALTH_LIMITS`).

**Estado:** `useRevenueModule` (`useReducer`), escrita bloqueada se `viewer.canView` for falso (colaboradora não vê); **sem persistência**.

**Ligações e lacuna relevante:** o `fase-1-fecho.md` fala de "Inventário → Rendimentos: custo operacional preparado, sem lançamentos financeiros automáticos" — mas **não existe nenhum import real de `inventario`, `equipas` ou `clientes` no código deste módulo**. O custo de produtos usa uma constante fixa (`PRODUCT_COST = €1,80/trabalho`), não dados reais de stock. É controlado como opcional via `shared/company` (`ModuloInativo` se `modulos.rendimentos` for falso). Nenhum outro módulo consome `rendimentos`.

---

### 8 · Inventário (`inventario`)

**Propósito:** produtos, locais de stock, movimentos, reposições, fornecedores e encomendas — tanto stock da empresa como stock pertencente aos clientes guardado nos alojamentos.

**Ecrãs:** `SummaryScreen` (KPIs, stock por proprietário, reposições pendentes), `ProductsScreen`, `LocationsScreen` (lista/mapa por cliente), `MovementsScreen` (histórico), `SuppliersScreen` (Encomendas/Fornecedores), `Panels`/`Dialogs`, `StaySupplySection` (embutida no módulo Clientes).

**Modelo de dados:** `Product`/`Movement` com `owner: 'company'|'client'` — **custo é sempre 0 para produtos do cliente**; `RestockRequest`; `Supplier`/`PurchaseOrder` (só produtos da empresa); `Stay` (visão do alojamento pelo inventário).

**Regras de negócio (confirmam o `fase-1-fecho.md`):** `stockValue` só valoriza produtos `owner: 'company'`; `applyMove` impede stock negativo e recalcula custo médio ponderado; `transfer` só entre locais do mesmo dono; `receiveOrder` só entra em stock para produtos da empresa; `operationalCost` isola consumos/perdas da empresa (sem custo para os do cliente).

**Estado:** `store.tsx` (Context + `useState`), **persistência em `localStorage` sob `appos.inventario.v1`** (confirma a chave documentada); desativar o módulo não apaga os dados (comentado explicitamente no código).

**Ligações:** `StaySupplySection` é consumida por **Clientes** (separador "Produtos"); `stayProducts`/`stateOf`/etc. são consumidos por **Execução** (`ProductsSection`); ambas condicionais a `modulosAtivos.inventario`. `operationalCost` prepara dados para Rendimentos, mas — como acima — a ligação final não existe ainda no lado de Rendimentos.

---

### 9 · Serviços ligados (`servicosLigados`)

Não implementado nesta fase — em espera por decisão tomada a 16 de setembro de 2026 (confirmado no `fase-1-fecho.md`). Já existe como chave em `MODULOS_OPCIONAIS` (`shared/company/modulosAtivos.tsx`) e em `MODULO_LABEL`/`MODULO_INFO`, pronto para ser ligado quando houver código, mas sem diretório em `src/modules/`.

---

## Mapa de integração real entre módulos (código, não intenção)

| De → Para | Tipo de ligação |
|---|---|
| Equipas → Onboarding | `CompanyOnboardingResult.is_admin_also_manager` (modo micro/separado) |
| Clientes → Onboarding | `isValidNIF`, `isValidContact`, `formatContact` |
| Clientes → Inventário | `StaySupplySection`, `useOptionalInventory` (separador "Produtos", condicional) |
| Execução → Mensagens | sino/badges, avisos "Hoje", conversa dentro do trabalho (com *fallback* se ausente) |
| Execução → Inventário | registo de produtos usados/perdidos (condicional) |
| Todos os módulos | `shared/ui` e `shared/company` (`useModulosAtivos`) |

Planeamento, Aprovações e Rendimentos **não têm nenhum import real** de outros módulos de domínio — recebem dados via props/mock local, com comentários no código a descrever de onde essas ligações "viriam" numa integração futura. Não existe, em `src/`, nenhum ficheiro de tipo `App.tsx`/shell/router que monte os 10 módulos numa única aplicação corrida: cada `preview/module-N-*-react.html` arranca a sua própria raiz React de forma independente, e `preview/index.html` é apenas uma página estática com uma ligação para cada pré-visualização.

## Persistência em `localStorage`

Só **Mensagens** (`appos.mensagens.v1`) e **Inventário** (`appos.inventario.v1`) persistem dados entre recarregamentos, como documentado no `fase-1-fecho.md`. Os restantes 7 módulos guardam estado apenas em memória React (`useReducer`/`useState`) e reiniciam para os dados de demonstração a cada carregamento da página.

## Observações transversais

- **Sem build reprodutível no repositório:** não há `package.json`, `tsconfig.json` nem configuração de bundler commitada; os `.js` em `preview/` são bundles esbuild pré-gerados.
- **Sem TODO/FIXME no código** — as limitações da Fase 1 estão documentadas em comentários descritivos ("simulação", "sem base de dados", "fica fora desta simulação") em vez de marcadores de tarefa.
- **Arquitetura multi-app latente:** quase todos os módulos preparam configuração para `limpezas`/`formacao`/`manutencao` (por vezes `nucleo`), sugerindo que o AppOS foi desenhado para ser reutilizado além de limpezas, embora só a app "limpezas" esteja em uso nesta fase.
- **Lacuna entre documentação e código:** a ligação "Inventário → Rendimentos" descrita no `fase-1-fecho.md` ainda não existe como import real — Rendimentos usa uma constante fixa de custo de produto.
- **Lacuna conhecida já registada:** `preview/module-3-clientes.html` (desenho estático) não tem os campos de hora de saída/entrada já presentes na versão React.
