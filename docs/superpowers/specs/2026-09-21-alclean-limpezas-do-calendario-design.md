# De onde vêm as limpezas — importação iCal e criação manual

**Data:** 2026-09-21
**Empresa:** ALClean (`/Users/paulorsalgado/Documents/2. Sandbox/alclean/app`, ramo `fase2-backend`)
**Estado anterior:** Fase 2 concluída — sete módulos ligados ao Supabase, com RLS, tempo real e contas reais.

## O problema

A app sabe organizar o trabalho, executá-lo, aprová-lo e contá-lo. Não sabe
recebê-lo. Não existe nenhum caminho, em lado nenhum, para uma limpeza entrar
na aplicação: `usePlanningModule` expõe atribuir, desatribuir, mover, esticar,
apagar e publicar, e a função que grava recusa qualquer limpeza que ainda não
exista (`usePlanningModule.ts:79`). As doze limpezas que existem foram postas
por um script de demonstração.

Enquanto isso, o ecrã dos calendários prometia o contrário: guardava um
endereço iCal e um botão "Sincronizar agora" inventava um resultado —
`imported: 3 + Math.floor(Math.random() * 12)`. Essa simulação foi removida em
`c0aa208`; o endereço continua guardado, à espera de quem o leia.

Este documento resolve as duas pontas: as limpezas passam a nascer dos
calendários das plataformas, e a gestora passa a poder criar uma à mão.

## O que já existe e vamos usar

O esquema foi desenhado para isto e nunca foi ligado:

- `jobs.source` é o enum `job_source = ('ical','manual')`, por omissão
  `'manual'` (`0002_jobs.sql:2,16`).
- `jobs.platform text` espelha a plataforma do calendário (`0002_jobs.sql:17`).
- `jobs.stay_date` é o dia da saída do hóspede, distinto de `scheduled_on`
  (o dia em que a limpeza está marcada) — é isso que permite adiar uma limpeza
  para o dia seguinte sem perder de que estadia nasceu.
- `jobs.checkin_same_day` é o critério de prioridade alta do Planeamento, dito
  por escrito em `0002_jobs.sql:36-37`.
- `jobs.checkout_time` / `checkin_time` carimbam as horas do alojamento no
  momento da criação.
- `unit_calendars` guarda `platform`, `url`, `status`, `last_sync` e `imported`
  — as três últimas nunca foram escritas por um sincronizador a sério.
- `isHighPriority` (`planeamento/rules.ts:113-115`) já desenha o ponto vermelho
  a partir de `checkin_same_day` e da igualdade `scheduled_on = stay_date`;
  `windowCheck` (`:129-146`) já avisa quando a limpeza acaba depois da hora de
  entrada do hóspede seguinte.

Nada disto é preciso inventar. O que falta é o que preenche estas colunas.

## Decisões tomadas com a empresa

Registadas em conversa a 2026-09-21:

1. Uma saída com entrada de outro hóspede no mesmo dia é **prioritária**, com
   ponto vermelho no cartão do Planeamento.
2. A duração de uma limpeza é **por quarto**.
3. A app **nunca apaga sozinha** uma limpeza já atribuída ou publicada por
   causa de uma alteração no calendário — avisa a gestora e ela decide.
4. Sincronização **de hora a hora**, mais um botão manual.
5. A gestora tem de poder **criar uma limpeza à mão**.

## Arquitetura

Três peças, com uma fronteira clara entre elas:

**1. O sincronizador** — uma Edge Function (`sync-calendars`) que descarrega
cada endereço iCal, interpreta-o, e decide o que criar, alterar ou assinalar.
Corre com a chave `service_role`, porque só a gestora pode inserir em `jobs`
(`jobs_manager_all`, `0004_rls.sql:44-60`) e o sincronizador não é ninguém.

**2. O agendador** — `pg_cron` chama a Edge Function de hora a hora através de
`pg_net`. Ambas as extensões existem no projeto e estão **desligadas**; ligá-las
é um passo manual do utilizador, como a aplicação das migrações.

**3. Os ecrãs** — o botão "Sincronizar agora" em cada quarto, e "Nova limpeza"
no Planeamento.

A Edge Function é o sítio certo para a rede e a interpretação do iCal, e não o
Postgres: o browser não pode ir buscar o calendário (o Airbnb não o permite de
outra origem), e pôr um interpretador de iCal dentro de uma função de base de
dados seria escrevê-lo em SQL sem necessidade.

### Porquê sem tabela de reservas

O conceito de reserva não existe hoje no esquema, e resistimos a criá-lo. Uma
tabela de reservas seria um segundo registo da mesma coisa, a precisar de ser
mantido em passo com as limpezas, e a levantar a pergunta "qual das duas está
certa?" no primeiro dia em que divergirem.

Em vez disso, a limpeza carrega a sua própria origem: de que calendário veio e
qual o identificador do evento nesse calendário. Cada evento iCal traz um `UID`
estável, que a plataforma mantém entre descarregamentos. Duas colunas novas em
`jobs` bastam, e a unicidade `(calendar_id, ical_uid)` garante que o mesmo
evento nunca gera duas limpezas.

O custo desta escolha: se um dia for preciso mostrar o nome do hóspede ou o
número de noites, isso não está guardado em lado nenhum. Aceitamos — a app é de
limpezas, não de reservas, e nada no processo validado com a ALClean precisa do
hóspede.

## Esquema (migração 0030)

**Em `jobs`:**

| coluna | tipo | porquê |
|---|---|---|
| `calendar_id` | `uuid null references unit_calendars(id) on delete set null` | de que calendário veio. `set null` e não `cascade`: apagar um calendário não pode apagar trabalho já feito. |
| `ical_uid` | `text null` | o identificador do evento nesse calendário. |

Unicidade: `create unique index jobs_ical_uid_idx on jobs (calendar_id, ical_uid) where ical_uid is not null`.
Um índice parcial, porque as limpezas manuais não têm nem uma coisa nem outra.

**Duração, com a mesma cadeia de herança das horas:**

| coluna | tipo | omissão |
|---|---|---|
| `company_settings.default_cleaning_min` | `integer not null` | `120` |
| `service_locations.cleaning_min` | `integer null` | herda da empresa |
| `units.cleaning_min` | `integer null` | herda do alojamento |

`check (cleaning_min between 15 and 600)` nos três. A cadeia é exatamente a que
`checkout_time`/`checkin_time` já usam (`units` nullable a herdar de
`service_locations`, `0001_core.sql:86-87`), para não haver duas maneiras
diferentes de herdar valores na mesma app.

**Funções novas:**

- `job_from_ical(...) returns uuid` — `security definer`, chamada só pelo
  sincronizador com `service_role`. Cria ou atualiza a limpeza de um evento,
  aplicando as regras da secção seguinte, e devolve o que fez.
- `create_job(p_location, p_unit, p_scheduled_on, p_starts_at, p_ends_at,
  p_checkin_same_day, p_note) returns uuid` — `security invoker`, para o botão
  "Nova limpeza". O RLS da gestora aplica-se; uma colaboradora é recusada pelo
  servidor, não só pelo ecrã.

Ambas carimbam `checkout_time`/`checkin_time` a partir do quarto (que herda do
alojamento), como o trigger `jobs_stamp_client_flags` já faz com as flags do
cliente.

## O sincronizador, regra a regra

**Que eventos contam.** Um calendário do Airbnb traz reservas **e** os dias que
o anfitrião bloqueou. Os bloqueios não são hóspedes e não geram limpeza. Os dois
distinguem-se pelo `SUMMARY` do evento: uma reserva diz `Reserved`, um bloqueio
diz `Not available` (ou `Blocked`). A regra é uma lista de exclusão explícita, e
qualquer evento que não seja reconhecido como bloqueio **conta como reserva** —
falhar a criar uma limpeza é pior do que criar uma a mais, que a gestora apaga.

**Qual o dia da limpeza.** No iCal, `DTEND` de uma reserva é o dia da saída
(o fim é exclusivo — a última noite é a anterior). Logo `stay_date = DTEND` e,
à entrada, `scheduled_on = stay_date`.

**A que horas.** `starts_at` = hora de saída do quarto (herdada);
`ends_at = starts_at + duração` (herdada). Se `ends_at` passar das 23:59,
fica às 23:59 — a restrição `jobs_fim_depois_do_inicio` (`0024:32`) tem de
continuar satisfeita, e uma limpeza que atravessa a meia-noite não existe neste
negócio.

**Entrada no mesmo dia.** `checkin_same_day` é verdadeiro quando existe, no
mesmo calendário, outro evento de reserva cujo `DTSTART` é igual a este `DTEND`.
Isto é o ponto vermelho da decisão 1. Note-se que a regra olha só para o mesmo
calendário: um quarto com dois calendários (Airbnb e Booking) pode ter a entrada
seguinte no outro — tratamos isso olhando para **todos** os calendários do mesmo
quarto, não só o que está a ser lido.

**Horizonte.** Saídas até 90 dias à frente. O passado nunca é tocado: um evento
com `DTEND` anterior a hoje é ignorado, e uma limpeza já existente cujo dia já
passou nunca é alterada nem apagada.

**O que acontece a cada evento:**

| situação | ação |
|---|---|
| evento novo | cria a limpeza, `status='unpublished'`, `source='ical'`, `platform` do calendário |
| evento conhecido, datas iguais | não faz nada |
| evento conhecido, data mudou, limpeza **por publicar e sem ninguém atribuído** | muda a data, em silêncio |
| evento conhecido, data mudou, limpeza **atribuída ou publicada** | não toca; cria um aviso para a gestora |
| evento desapareceu, limpeza **por publicar e sem ninguém** | apaga a limpeza |
| evento desapareceu, limpeza **atribuída ou publicada** | não toca; cria um aviso |
| limpeza `in_progress` ou `done` | nunca é tocada, em nenhuma circunstância |

"Sem ninguém atribuído" significa zero linhas em `job_assignments`. "Por
publicar" significa `status = 'unpublished'`.

**Os avisos.** Vão para `notices`, com `audience='gestao'`, e aparecem no quadro
do ecrã "Hoje" — que até hoje só recebia confirmações de leitura de mensagens.
Um aviso por limpeza afetada, substituído se a mesma limpeza voltar a mudar, para
não acumular. Texto que diz o que mudou e o que fazer, não "erro de
sincronização".

**O estado do calendário.** No fim de cada leitura, `unit_calendars` recebe
`status` (`connected` ou `error`), `last_sync = now()` e `imported` = número de
limpezas criadas nesta leitura. Desta vez são números verdadeiros.

**Quando a leitura falha.** Endereço inacessível, resposta que não é iCal,
ficheiro ilegível: o calendário fica `error`, com a razão guardada, e **nenhuma
limpeza é criada, alterada ou apagada a partir desse calendário**. Um calendário
que não se consegue ler não é um calendário vazio — tratá-lo como vazio apagaria
todas as limpezas por publicar do quarto.

## A criação manual

Botão "Nova limpeza" no Planeamento. Um painel com: cliente → alojamento →
quarto, dia, hora de início, duração, e uma marca de "entrada no mesmo dia".

Os valores aparecem preenchidos a partir da cadeia de herança: escolher o quarto
preenche a hora de início com a hora de saída dele e a duração com a dele. A
gestora altera o que quiser.

A limpeza nasce `status='unpublished'`, `source='manual'`, `stay_date =
scheduled_on`, `calendar_id` e `ical_uid` nulos. `usePlanningModule.ts:125` já
só deixa apagar limpezas com `source='manual'` — essa regra passa a fazer
sentido, em vez de proteger um caso que nunca acontecia.

## Segurança

- O sincronizador corre com `service_role`, fora de qualquer sessão. É a única
  coisa nesta app que escreve em `jobs` sem ser a gestora, e por isso a sua
  função é `security definer` com `search_path = public, pg_temp`, com
  `execute` revogado a `public`, `anon` e `authenticated`.
- A Edge Function verifica quem a chama: do agendador, por um segredo partilhado
  no cabeçalho; do botão, pela sessão da gestora (`caller.rpc('is_manager')`),
  exatamente como `provision-access` já faz.
- `create_job` é `security invoker`: o RLS trata da autorização, e não há uma
  segunda cópia da regra "só a gestora" para divergir da primeira.
- O endereço iCal é dado do cliente e vai para um pedido de rede feito pelo
  servidor. Só `https://` é aceite, e endereços que apontem para dentro da rede
  do próprio servidor são recusados, para que colar um endereço não sirva para
  fazer o servidor falar com coisas que não são da internet.
- As limpezas criadas entram `unpublished`: invisíveis para as colaboradoras até
  a gestora publicar (`jobs_collab_read`, `0025:169-172`).

## Verificação

- Testes do interpretador de iCal com ficheiros verdadeiros: uma reserva
  simples, uma reserva com entrada no mesmo dia, um bloqueio de anfitrião, um
  evento sem `UID`, um ficheiro truncado, um calendário vazio.
- Cada linha da tabela de decisões acima verificada com dados descartáveis:
  criar, mudar em silêncio, recusar-se a mudar e avisar, apagar, recusar-se a
  apagar e avisar, nunca tocar no que está em curso ou concluído.
- Uma falha de rede não apaga nada.
- `npm run rls-check` acaba em `Todas as fronteiras seguras.`, com verificações
  novas: a colaboradora não cria limpezas, não chama `job_from_ical`, e não vê
  as limpezas por publicar criadas pela importação.
- As duas contas reais, as doze limpezas `[DEMO]` e os dados do utilizador não
  são tocados por nenhum teste.

## O que fica de fora

- **Nome do hóspede, número de noites, valor da reserva.** Não são precisos para
  limpar.
- **Sincronização em tempo real.** As plataformas atualizam os seus calendários
  com atraso próprio, de minutos a horas; de hora a hora é tão rápido quanto
  faz sentido.
- **Escrever de volta para a plataforma.** A app lê calendários, não os altera.
- **Faturação a partir das reservas.** Continua sem existir faturação.

## Passos manuais do utilizador

1. Ligar `pg_cron` e `pg_net` no painel do Supabase.
2. Aplicar a migração 0030 no editor de SQL.
3. Publicar a Edge Function `sync-calendars` e definir os seus segredos.

Cada um com instruções exatas no momento próprio. Nenhum deles é feito por nós.
