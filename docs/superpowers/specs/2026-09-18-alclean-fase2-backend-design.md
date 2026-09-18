# Fase 2 (1/3) — Backend, base de dados e autenticação — ALClean — Design

Data: 18 de setembro de 2026.

## Objetivo

A app da ALClean (`alclean/app`) está completa como **simulação visual** (Fase 1): os 7 módulos funcionam, com o vocabulário, a marca e as regras de negócio da empresa, mas todo o estado vive na memória do browser e os dados são de exemplo. Este documento desenha o primeiro dos três sub-projetos da Fase 2: dar-lhe **dados reais, persistentes e partilhados, com contas reais**, sem alterar a experiência já validada nos 7 mockups aprovados.

Os outros dois sub-projetos da Fase 2 — **pagamentos reais** e **envios reais** (WhatsApp/email/SMS/push) — dependem deste e ficam fora de âmbito aqui. Cada um terá o seu próprio ciclo spec → plano → implementação.

Documentos a montante: `docs/superpowers/specs/2026-09-17-alclean-fork-design.md` (o fork da Fase 1), `alclean/perfil-empresa.md` e `alclean/modulos/*.md` (as decisões de negócio validadas com a empresa, que continuam a ser a autoridade sobre comportamento).

## Decisões tomadas

| Decisão | Escolha |
|---|---|
| Plataforma | Supabase (Postgres + Auth + Realtime + Storage) |
| Âmbito de empresas | Só ALClean — um projeto Supabase dedicado, tal como o fork de código é dedicado |
| Acesso à base de dados | Cliente Supabase direto no browser, protegido por Row Level Security — sem servidor intermédio |
| Módulos migrados | Os 7 de uma vez |
| Atualizações | Tempo real (subscrições Supabase) |
| Alojamento | App publicada online (Vercel ou Netlify) |
| Contas | Gestora e colaboradoras, todas com conta real, provisionadas diretamente pela gestora |

## Arquitetura

```
Browser (app React já existente, build esbuild)
  │
  ├── SDK Supabase ──► Postgres  (RLS decide o que cada sessão vê e altera)
  ├── SDK Supabase ──► Auth      (sessão da gestora / das colaboradoras)
  ├── SDK Supabase ──► Realtime  (mudanças chegam sem refrescar)
  └── SDK Supabase ──► Storage   (fotografias das limpezas)

Alojamento estático (Vercel/Netlify) ──► serve o build; sem servidor próprio.
```

Não há camada de API intermédia. A segurança fica na base de dados (políticas RLS), que é o padrão nativo do Supabase e o que dispensa manter infraestrutura adicional. Se, mais tarde, aparecer lógica que não caiba em RLS nem no cliente (por exemplo gerar faturas em PDF), acrescenta-se uma Edge Function pontual sem redesenhar nada.

## Modelo de dados

O código da Fase 1 tem três problemas estruturais que impedem um mapeamento direto tipo-a-tabela, e que este esquema resolve:

1. **Identidade duplicada.** A mesma pessoa existe em seis formas diferentes (`equipas.Person`, `planeamento.PlanPerson`, `execucao.ExecPerson`, `aprovacoes.ApprovalsPerson`, `mensagens.Person`, `rendimentos.TeamMember`), ligadas apenas por coincidência de identificadores nos dados de exemplo. O mesmo acontece com clientes e alojamentos. Passa a haver **uma tabela por entidade real**.
2. **Referências por nome.** `planeamento.Job.location`, `execucao.ExecJob.place`, `aprovacoes.WorkRecord.client` e vários outros guardam o **nome** do alojamento/cliente/equipa, não uma referência. Passam todos a chaves estrangeiras.
3. **Ciclo de vida partido.** `Job` (Planeamento), `ExecJob` (Execução) e `WorkRecord` (Aprovações) são três representações independentes do mesmo trabalho. Passam a ser **uma tabela `jobs`** com estado, mais tabelas filhas para o detalhe de cada fase.

### Núcleo partilhado

| Tabela | Função | Referências |
|---|---|---|
| `people` | Gestora e colaboradoras. Substitui os seis tipos duplicados. Inclui `per_job_rate`, `access_status`, `archived`, e `auth_user_id` (ligação ao Supabase Auth). | `team_id` |
| `teams` | Equipas (Alfa, Beta). | `lead_id` → `people` |
| `clients` | Clientes: identificação, contactos, morada, estado e a configuração de lavandaria **ao nível do cliente** (decisão validada em Clientes). A configuração de faturação vive em `client_billing`, não aqui; o estado de pagamento é deduzido das faturas, não guardado. | — |
| `service_locations` | Alojamentos. | `client_id`, `team_id` |
| `units` | Quartos. Valores nulos herdam do alojamento (equipa, horários, tarifa), tal como hoje. | `location_id`, `team_id` |
| `unit_calendars` | Configuração iCal (Airbnb, Booking.com). Guarda a configuração; a importação automática fica fora de âmbito (ver abaixo). | `unit_id` |
| `absences` | Ausências, incluindo o tipo "não comunicada" validado em Equipas. | `person_id` |

### Ciclo de vida da limpeza

| Tabela | Função | Referências |
|---|---|---|
| `jobs` | **Uma limpeza, do planeamento à aprovação.** Dois estados independentes: o operacional (`unpublished` → `planned` → `confirmed` → `in_progress` → `done`) e o de revisão (`pending` → `approved` / `correction` / `reopened` / `archived`), este último só relevante depois de concluída. Guarda data/horas, origem (manual/iCal), dia da estadia e se há entrada no mesmo dia (o critério de prioridade alta do Planeamento). "Em atraso" é calculado, não guardado. | `unit_id`, `location_id`, `team_id` |
| `job_assignments` | Quem faz a limpeza e com que participação. | `job_id`, `person_id` |
| `job_checklist_items` | Preparação e tarefas, uma linha por item. Os itens condicionais (levar material de limpeza, levar sacos de lavandaria) são criados conforme o fornecimento do cliente. | `job_id` |
| `job_laundry_counts` | Inventário da roupa a lavar: quantidade prevista e recolhida por peça. Sempre presente, mesmo sem recolha para lavandaria ativa (decisão validada em Execução). | `job_id` |
| `job_photos` | Evidência fotográfica. O ficheiro vive no Supabase Storage; a linha guarda o caminho e o tipo. | `job_id` |
| `job_issues` | Anomalias e atrasos. Aceita registo só com descrição de texto — fotografia é opcional (decisão validada em Execução). | `job_id` |
| `job_events` | Histórico da limpeza. **Append-only**: nunca se edita nem apaga. | `job_id` |
| `job_approval_audit` | Auditoria da revisão (aprovar, corrigir, reabrir). **Append-only**, como já é hoje no código. | `job_id`, `person_id` |

A aprovação automática ("limpezas completas e sem ocorrências são aprovadas automaticamente") continua a ser uma **regra aplicada no momento da conclusão**, não uma coluna mantida à mão — as ocorrências (anomalia, atraso, tarefa em falta, falta no inventário de roupa, duração acima da tolerância) são deduzidas dos dados da própria limpeza.

### Mensagens

| Tabela | Função | Referências |
|---|---|---|
| `conversations` | Conversas internas, com a equipa e com clientes. | `client_id`, `job_id` (ambos opcionais) |
| `conversation_participants` | Participantes. | `conversation_id`, `person_id` |
| `messages` | Mensagens, com estado (enviada/entregue/lida/agendada). | `conversation_id`, `from_person_id` |
| `message_attachments` | Imagens e ficheiros anexados. | `message_id` |
| `notices` | Avisos. O alvo passa a par `target_type` + `target_id`, em vez do texto `"job:j1"` usado hoje. | — |

### Rendimentos

| Tabela | Função | Referências |
|---|---|---|
| `client_billing` | Ciclo de faturação (quinzenal), prazo (à vista), modelo de fornecimento e suplemento, por cliente. | `client_id` |
| `billable_units` | Tarifa por unidade faturável. | `client_id`, `unit_id` |
| `invoices` | Faturas emitidas. | `client_id` |
| `invoice_payments` | Recebimentos. O estado da fatura (paga/pendente/em atraso) **é deduzido** destes registos, não guardado. | `invoice_id` |
| `team_payments` | Pagamentos à equipa, por pessoa e período. | `person_id` |

Toda a parte analítica de Rendimentos — faturado, custos, margem, saúde financeira, rentabilidade por cliente — continua a ser **calculada**, nunca guardada, tal como já é hoje. A diferença é a origem: hoje vem de uma tabela de sazonalidade simulada (`SEASON`/`EXEC_RATIO` em `rules.ts`); passa a vir das limpezas realmente executadas e aprovadas. A correção de alocação de custos por trabalho (`totalBilledJobs`) feita na Fase 1 mantém-se válida.

### Definições

| Tabela | Função |
|---|---|
| `company_settings` | Linha única com as definições editáveis pela gestora: tolerância de duração das aprovações (omissão 30 min), limiares de saúde financeira, e se as deslocações entram no custo de equipa. Substitui os valores hoje guardados em `localStorage`. |

## Autenticação e autorização

**Todas as pessoas têm conta real** — gestora e colaboradoras. A diferença face a um sistema comum está em **como a conta nasce**: não há autoregisto nem link de convite. A gestora cria o acesso diretamente no ecrã de Equipas e entrega a credencial à colaboradora — exatamente o comportamento já validado no módulo Equipas ("acesso por ensino direto, sem fluxo de convite formal").

- **Gestora** (Carla Mendes): email e palavra-passe.
- **Colaboradoras**: identificador interno (`<nome>@alclean.local`) e um PIN como credencial. Do lado da colaboradora, a experiência é escolher o seu nome e introduzir o PIN — sem email, sem convite.
- A coluna `access_status` que já existe na UI de Equipas (ativo / enviado / sem acesso / suspenso / falha) passa a refletir o **estado real da conta**, deixando de ser simulada.
- `people.auth_user_id` liga cada pessoa ao utilizador do Supabase Auth. É esta ligação que as políticas RLS usam.

### Políticas de acesso (RLS)

| Quem | Vê | Altera |
|---|---|---|
| Gestora | Tudo. | Tudo. |
| Colaboradora | As suas limpezas e as da sua equipa, os seus dados pessoais, as suas ausências, as suas conversas, e **só os seus próprios pagamentos**. | O progresso das limpezas que lhe estão atribuídas (checklist, inventário de roupa, fotografias, anomalias) e as suas mensagens. |
| Sem sessão | Nada. | Nada. |

Rendimentos ao nível da empresa — faturação, margem, rentabilidade por cliente, custos totais de equipa — **não é acessível a colaboradoras**, nem por leitura. É a fronteira de segurança mais importante deste desenho.

## Tempo real

A app subscreve as mudanças nas tabelas que alimentam ecrãs partilhados (`jobs`, `job_events`, `messages`, `notices` e as tabelas filhas de execução). Uma mensagem enviada pela colaboradora aparece nas conversas da gestora sem refrescar, e uma limpeza reatribuída no Planeamento muda no telemóvel de quem a vai fazer — o mesmo comportamento que a simulação já tinha, agora entre dispositivos diferentes em vez de entre separadores do mesmo browser.

## Estratégia de implementação

Cada módulo tem hoje um hook (`use<Módulo>Module.ts`) que gere estado local a partir de `mockData.ts`, e componentes que consomem o que esse hook devolve. A migração concentra-se **dentro dos hooks**:

- Novo `src/lib/supabase.ts` — cliente único, sessão e tratamento de erros.
- Cada hook passa a carregar do Supabase, subscrever tempo real e escrever no Supabase, mantendo **a mesma forma de dados** à saída. Os componentes e a UI ficam praticamente intactos — é essa a razão de ser desta abordagem.
- Atualização otimista: a UI reage imediatamente e reconcilia com a resposta do servidor, para não perder a fluidez atual.
- `mockData.ts` deixa de ser carregado em runtime e passa a **script de seed**, usado uma vez para popular o Supabase com os mesmos exemplos já aprovados, para o primeiro arranque não estar vazio.
- Um ecrã de autenticação novo, partilhado: email/palavra-passe para a gestora, nome/PIN para as colaboradoras.

## Verificação

- **Fronteira de segurança (automatizada).** Um script que verifica as políticas RLS com sessões reais: uma colaboradora não consegue ler Rendimentos nem tocar em limpezas de outra equipa; uma sessão sem autenticação não lê nada; a gestora lê tudo. É o único teste automatizado deste sub-projeto, e existe porque é a única parte onde um erro silencioso expõe dados a sério.
- **Funcional (visual).** Percorrer os 7 módulos contra `alclean/modulos/*.md`, como foi feito na Fase 1, agora com dois dispositivos/sessões abertos em simultâneo para confirmar o tempo real e o isolamento entre perfis.

## Fora de âmbito

- **Pagamentos reais** (processamento, referências, cobrança) — sub-projeto 2 da Fase 2.
- **Envios reais** — WhatsApp, email, SMS, push — sub-projeto 3 da Fase 2.
- **Importação iCal automática.** A configuração dos calendários é guardada, mas a importação periódica de reservas do Airbnb/Booking exige tarefas agendadas no servidor e fica para um sub-projeto próprio. Os avisos que dependem dela (nova reserva, alteração de reserva) ficam também de fora; os restantes avisos continuam a ser criados pelas ações da app.
- **Funcionamento offline.** A simulação atual mostra estado de ligação e uma fila de pendentes; a app passa a assumir ligação à internet. É a única regressão face à Fase 1, e é deliberada: offline real (fila de escrita, resolução de conflitos) é um problema próprio, não um detalhe deste.
- **Suporte a várias empresas.** Este backend é dedicado à ALClean, tal como o fork de código. A próxima empresa repete o processo.

## Próximos passos

Este documento cobre o desenho. A implementação — criar o projeto Supabase, o esquema, as políticas, a autenticação e a migração dos 7 hooks — é trabalho a planear via `writing-plans`, depois de este spec ser revisto.
