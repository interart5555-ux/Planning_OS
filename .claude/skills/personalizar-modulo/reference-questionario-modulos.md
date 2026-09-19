# Referência — Questionário Módulo a Módulo

Usado por `SKILL.md` desta skill. Contém o padrão geral e as perguntas específicas de cada um dos 9 módulos personalizáveis. As respostas de uma empresa concreta vivem em `<slug>/modulos/<nome>.md`, um diretório irmão da raiz do template, nunca aqui.

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
- Quem pode ver o valor que cada pessoa recebe: só a gestão, ou cada colaboradora vê o seu? (Alimenta o modelo de dados de `/implementar-empresa` — o que é só da gestão fica fora das tabelas que a colaboradora lê.)
- Como é dado acesso a uma nova colaboradora hoje (convite formal, ensino direto)?

## clientes
- Vocabulário: o "local" pode chamar-se "instalação", "edifício", "sala" consoante o domínio — confirmar o termo já capturado no perfil de empresa.
- Um cliente tem tipicamente um ou vários locais? Um local tem tipicamente uma ou várias unidades?
- Há horários de entrada/saída relevantes (check-in/check-out), ou o conceito não se aplica?
- Usam alguma plataforma de reservas externa (Airbnb, Booking) que precise sincronizar?
- Quem fornece o que é usado no local — a empresa ou o cliente?
- O que o cliente paga (tarifa por hora, por trabalho, por local) pode ser visto por quem executa, ou é só da gestão?

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
- Há algum valor deste módulo (faturas, pagamentos à equipa, margens) que alguém além da gestão possa ver? Por omissão, nenhum.

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
