# Auditoria global — ALClean como teste do processo

*19 de setembro de 2026. Base: cinco análises independentes (teste às cegas do modelo de dados,
qualidade do código, segurança e camada de dados, prontidão comercial, template e processo), feitas
em modo só de leitura sobre `alclean/app` (branch `fase2-backend`), a base de dados viva e este
repositório. As decisões pedidas estão no fim.*

## 1. Resumo

- **O processo novo funciona onde foi testado.** Um agente sem acesso ao código da ALClean aplicou a
  regra do modelo de dados e chegou, à primeira, ao desenho a que a Fase 2 só chegou depois de várias
  rondas de correção — e em três pontos fez melhor (secção 2).
- **A app ainda não é comercializável.** O núcleo de segurança é sólido, mas há 6 falhas pequenas que
  bloqueiam produção (uma crítica: "suspender acesso" não suspende nada), metade dos módulos ainda é
  simulação, e não existe nenhuma rede automática de qualidade (sem verificação de tipos, testes, CI).
- **A decisão que mais pesa não é técnica, é de produto:** continuar a fazer uma cópia do código por
  empresa, ou transformar o template num único produto configurável para várias empresas. As duas
  análises que olharam para isto concluem o mesmo: a cópia por empresa não escala. Dois dias depois da
  cópia, a ALClean já difere do template em 113 ficheiros, e nada volta para trás.
- **Recomendação:** um único produto multi-empresa, com o que muda por empresa guardado como
  configuração. A altura mais barata para o fazer é agora, enquanto a ALClean só tem dados de teste.

## 2. Teste às cegas do modelo de dados (regra M-001)

Um agente recebeu só o perfil e os módulos validados da ALClean, o código do template e a skill
`implementar-empresa`, sem acesso à app, à Fase 2 nem ao registo de lições. O resultado, comparado
com o esquema real (31 tabelas, 17 migrações):

| Decisão | Na Fase 2 real | No teste às cegas |
|---|---|---|
| Dinheiro fora das tabelas que a colaboradora lê | Descoberto na revisão da Task 4 (3 Critical, 3 migrações extra) | Certo à primeira |
| Colunas protegidas por trigger, não por permissão por coluna | Descoberto no pré-voo (Ruling 1) | Certo à primeira |
| Um só ciclo de vida da limpeza; "em atraso" calculado | Corrigido na Task 13 (Ruling 2) | Certo à primeira |
| Lavandaria ao nível do cliente; sem códigos de acesso | Decidido no fork | Certo à primeira |
| Tempo real declarado em migração | Em falta hoje (10 tabelas só no sistema vivo) | Previsto |
| NIF e contactos do cliente só para a gestão | **Em falta hoje** (a colaboradora lê a linha inteira) | Separado em `cliente_gestao` |
| Histórico de eventos só de acrescentar | **Em falta hoje** (a gestora pode apagar) | Previsto |
| De onde nascem as limpezas (iCal ou manual) | **Lacuna por resolver** — a app não cria limpezas | Previsto (`reserva`, `origem`) |
| O que acontece ao apagar/arquivar pessoas e limpezas | Cascatas destroem pagamentos e prova | **Não tratado** |
| O que "suspender acesso" bloqueia | Não bloqueia nada | **Não tratado** |

**Conclusão:** a regra funciona. As duas falhas comuns aos dois modelos apontam para duas secções que
faltam ao `template-modelo-dados.md`: "Apagar e arquivar" e "Acesso e suspensão" (proposta M-016).

## 3. A decisão de fundo: cópia por empresa ou produto único

| | Cópia por empresa (hoje) | Produto único multi-empresa |
|---|---|---|
| Corrigir um defeito | à mão em N repositórios e N bases de dados | uma vez |
| Nova empresa | copiar, editar código, migrar, rever | criar a empresa e preencher a configuração |
| Segurança | uma fuga fica numa só empresa | uma falha nas regras pode expor outra empresa — controlável com testes entre empresas no CI |
| Custo de alojamento | um projeto Supabase por empresa | um projeto (≈25 USD/mês no plano Pro) |
| Cliente grande que exige isolamento | natural | possível como exceção paga (projeto dedicado com o mesmo código) |

O código já está a meio caminho: os `config.ts` preveem limpezas/formação/manutenção, e os módulos
ativos entram por um provider. Falta: `company_id` em ~27 tabelas e nas regras de acesso, tirar a
ALClean do código fixo (domínio `@alclean.local`, canal `alclean:`, marca, lista de módulos) e pôr
tudo isso em configuração guardada na base de dados. Esforço estimado: 3–4 semanas.

**Consequência para o processo:** as skills `personalizar-empresa`/`personalizar-modulo` passam a
produzir configuração (além do `.md`), e `implementar-empresa` deixa de fazer uma cópia do código:
passa a criar a empresa no produto e a implementar só as extensões que a configuração não cobre.
Por isso, as alterações às skills da secção 6 devem esperar por esta decisão.

## 4. Achados na app, por nível

### 4.1 Segurança — bloqueia produção (todas pequenas ou médias)

| # | Problema | Correção | Esforço |
|---|---|---|---|
| C1 | **"Suspender acesso" não tem efeito** — a colaboradora continua a entrar e a ver tudo (confirmado: nenhuma regra consulta o estado `suspended`) | As funções de identidade passam a exigir acesso ativo; banir no Auth; teste | S |
| A1 | Uma sessão sem pessoa associada (conta órfã ou registo público) lê equipas, definições, avisos e os contactos da gestora | Desligar o registo público; regras exigem pessoa associada; apagar a conta de Auth ao apagar a pessoa | S |
| A2 | Autenticação fraca: PIN de 6 dígitos e email previsível a partir do nome | PIN mais longo ou identificador aleatório, limites de tentativas, proteção de passwords comprometidas | M |
| A3 | A função de criar contas aceita uma **gestora arquivada** (confirmado) e pode repor o PIN de qualquer pessoa; ignora erros e diz "ok" | Usar a verificação de gestora ativa; recusar alvos gestora; verificar erros | S |
| A4 | Apagar uma pessoa apaga em cascata os pagamentos feitos e as atribuições; apagar uma limpeza apaga fotografias e auditoria | Pessoas só se arquivam; limpezas concluídas não se apagam | M |
| A5 | A base não se reconstrói das migrações: 10 tabelas de tempo real só existem no sistema vivo; histórico de migrações divergente; a 0017 ainda sem commit | Migração com a publicação completa; alinhar o histórico | S |
| M1 | A aprovação automática confia em dados da colaboradora: concluir em 60 segundos não levanta ocorrência | Ocorrência "duração muito abaixo"; mínimo de fotografias | S |

Pode esperar pelas primeiras semanas: minimização de dados de clientes e colegas (RGPD), retenção
e exportação de dados, histórico de eventos só de acrescentar, restrições de integridade em falta
(email único, valores não negativos), funções executáveis por visitantes anónimos.

### 4.2 Qualidade do código

O núcleo é razoável: as regras de negócio (`rules.ts`) são funções puras prontas a testar, e a
verificação de tipos estrita só dá 2 erros reais. O problema é não haver rede:

1. **Sem verificação automática nenhuma** — sem `tsconfig`, lint, formatador, testes, CI. (S)
2. **67 `any` na fronteira com a base de dados** — uma coluna renomeada só rebenta em uso. Gerar os
   tipos da base de dados. (M)
3. **Sem proteção contra ecrã branco** e com erros do Postgres, em inglês, mostrados ao utilizador;
   uma falha de carregamento aparece como "lista vazia". (S)
4. **Duplicação** — a mesma pessoa tipada em 4 sítios, formatadores de datas e dinheiro repetidos
   3 a 6 vezes, componentes de interface copiados por módulo. (M)
5. **Restos do protótipo em produção** — Rendimentos e Mensagens ainda são 100% simulação; dados de
   demonstração dentro de ecrãs reais; o Inventário, desligado, vai no pacote. (M/L)
6. **7 aplicações separadas** de ~450 KB cada, com React e o cliente Supabase repetidos, e o estilo
   (Tailwind) carregado de um CDN que não se destina a produção. Uma só aplicação com navegação
   interna; estilo compilado. (M)
7. Mistura de português e inglês nos nomes; sem formatador. Regra escrita: código em inglês,
   interface e comentários em português de Portugal. (S)

### 4.3 Produto — o que falta para uso diário

- **Criar limpezas** — não existe nenhum caminho na interface. (M) — *bloqueia*
- **Importar reservas iCal** (Airbnb/Booking) — configuração existe, importação não. (L) — *bloqueia
  para alojamento local*
- **Terminar Aprovações, Mensagens e Rendimentos** com dados reais. (M) — *bloqueia*
- **Recuperar acesso** ("esqueci-me da password"). (S) — *bloqueia*
- **Entrada das colaboradoras** por lista, sem escrever o nome (dois nomes iguais colidem). (M)
- Gestão de conta, várias gestoras, notificações reais, instalação no telemóvel (PWA). (S–L)

### 4.4 Operação

Nada disto existe hoje: ambientes separados (desenvolvimento, testes, produção — hoje os scripts de
teste correm contra a única base, que tem clientes com nomes reais), CI com migrações, alojamento e
domínio, **backups** (o plano gratuito não os tem), monitorização de erros. (S–M cada)

### 4.5 Legal e comercial

A empresa cliente é a responsável pelos dados; o produto é subcontratante. Antes de vender: acordo de
tratamento de dados com cada empresa e aceitar o do Supabase; registo de tratamentos; prazos de
conservação das fotografias; exportação e apagamento a pedido; termos, política de privacidade.
Atenção: os tipos de ausência "baixa" e "consulta" são **dados de saúde** (regime especial do RGPD) —
guardar o motivo de forma genérica. Depois: faturação da subscrição, suporte.

**Credencial em documento:** a password temporária da gestora está escrita em claro no registo da
Fase 2. Rodar a password e retirá-la do ficheiro.

## 5. Pendentes da Fase 2 (triagem)

Dos ~35 pontos adiados no registo de execução: **14 a fechar antes de produção** (entre eles: tempo
real fora das migrações, email único, seletor de equipas com dados de demonstração, datas fixas em
três módulos, fotografias HEIC gravadas como JPG, lista de preparação que não se refaz ao mudar de
alojamento, script de demonstração por rever); **16 a corrigir no template para todas as empresas**
(histórico só de acrescentar, carregamento duplo da sessão, erros traduzidos, operações não atómicas,
ficheiros órfãos, teste de segurança em ambiente próprio, …); o resto é aceitável.

## 6. Melhorias ao processo de criação

Registadas em `docs/superpowers/melhoria-continua.md` como propostas M-009 a M-017:

| # | Problema | Proposta |
|---|---|---|
| M-009 | Ninguém compara o processo descrito pela empresa com o que o template sabe fazer — foi assim que "criar limpezas" escapou | Em cada módulo, cada passo do processo marcado "suportado / em falta"; o que falta tem de aparecer no mockup |
| M-010 | O que fica "fora de âmbito" e as decisões de produto tomadas durante a execução não voltam ao dono | Matriz de rastreabilidade; decisões de produto pedem aprovação |
| M-011 | Chaves, contas, domínio, email e método de login pedidos tarde | Lista de pré-requisitos e pergunta de login no início |
| M-012 | O dono só testa no fim — o erro das datas só apareceu aí | Teste do dono em ambiente de testes no fim de cada pedaço |
| M-013 | Não há fase de endurecimento nem de produção; pendentes sem dono | Fases 6 e 7 do fluxo abaixo; triagem obrigatória dos pendentes |
| M-014 | Defeitos do template descobertos numa empresa não voltam ao template | Registo próprio de "dívida do template" e passo de devolução no fecho |
| M-015 | Credenciais escritas em documentos de trabalho | Regra: nenhuma credencial em documentos |
| M-016 | O modelo de dados não pergunta o que acontece ao apagar/arquivar nem ao suspender | Duas secções novas no `template-modelo-dados.md` (e "quem cria cada entidade") |
| M-017 | O template não tem verificação de tipos, testes nem CI — tudo depende de revisão humana | Controlos de qualidade no template, herdados por todas as empresas |

### Fluxo alvo (supondo o produto único)

| Fase | Entrega | Quem valida |
|---|---|---|
| 0. Produto base (uma vez) | Base extraída da ALClean, consolidada; multi-empresa; configuração por empresa; controlos de qualidade; empresa de demonstração a passar todos os testes | Revisão + testes |
| 1. Perfil | Perfil, pré-requisitos externos, método de login | Dono |
| 2. Módulos | Configuração + análise de lacunas + mockup (a própria app em modo demonstração) | Dono, por módulo |
| 3. Modelo e âmbito | Extensões ao modelo de dados, matriz de rastreabilidade, "fora de âmbito" aprovado | Dono (âmbito), revisão (modelo) |
| 4. Criar a empresa | Empresa criada no produto, configuração carregada, testes de segurança verdes | Testes |
| 5. Extensões por pedaços | Só o que a configuração não cobre; teste do dono em cada pedaço | Revisão + dono |
| 6. Endurecimento | Pendentes críticos fechados; teste de ponta a ponta com contas reais | Revisão |
| 7. Produção | Domínio, email próprio, backups, dados reais importados, formação, plano de reversão | Dono assina o arranque |
| 8. Fecho | Retrospetiva, dívida do template devolvida, poda do registo | Dono |

## 7. Roteiro proposto

1. **Travar os riscos (dias).** C1, A1, A3, A5 e M1 na ALClean; rodar a password; controlos de
   qualidade (tipos, lint, testes das regras, CI); estilo compilado. Tudo pequeno.
2. **Decidir a arquitetura e construir o produto base (3–4 semanas).** Consolidar as 17 migrações
   numa base limpa com `company_id`; uma só aplicação; configuração por empresa; ambientes
   separados; testes de segurança entre empresas. A ALClean passa a ser a primeira empresa do produto.
3. **Completar a ALClean (2–3 semanas).** Aprovações, Mensagens e Rendimentos com dados reais;
   criar limpezas; iCal; recuperação de acesso; entrada por lista.
4. **Produção e piloto (1–2 semanas).** Backups, monitorização, domínio, RGPD e termos; a ALClean
   usa a app todos os dias. Retrospetiva e poda do registo.
5. **Segunda empresa, de preferência de outra área** (formação ou manutenção) — o verdadeiro teste de
   que o produto e o processo são genéricos.

## 8. Decisões pedidas

1. **Arquitetura:** produto único multi-empresa (recomendado) ou manter uma cópia por empresa?
2. **Ordem:** travar os riscos (passo 1) já, na branch atual da ALClean?
3. **Trabalho em curso:** há uma sessão a trabalhar nas Aprovações da ALClean (ficheiros por fazer
   commit). Se a decisão 1 for o produto único, convém fechar esse trabalho e parar a Fase 2 no fim
   da Task 13, em vez de construir Mensagens e Rendimentos sobre uma base que vai mudar.
4. **Processo:** aprovar as propostas M-008 a M-017 — aplicadas às skills só depois da decisão 1,
   porque o produto único muda o que as skills produzem.
