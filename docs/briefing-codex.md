# Briefing — app de gestão e planeamento de equipas de serviços

Documento para o agente que vai desenvolver a próxima versão. Contém o domínio, o processo, as
regras técnicas e as lições de uma implementação anterior (ALClean, empresa de limpezas de
alojamento local, levada até uma app a funcionar com base de dados real). Cada regra tem a origem
indicada. Segue-as; quando discordares, di-lo antes de escrever código.

Comunicação com o utilizador em português europeu. Código, identificadores e commits em inglês.

---

## 1. O produto

App para empresas que planeiam equipas e executam trabalhos em locais de clientes (limpezas,
formação, manutenção). Módulos:

| Módulo | Função |
|---|---|
| Equipas | pessoas, papéis, equipas, ausências, remuneração, acesso à app |
| Clientes | clientes, locais, unidades dentro do local, tarifas, calendários externos |
| Planeamento | atribuir trabalhos a pessoas/equipas e datas; publicar o plano |
| Execução | o que a pessoa faz no local: lista de preparação, tarefas, fotografias, ocorrências |
| Aprovações | a gestão revê o trabalho concluído; aprovação automática quando não há ocorrências |
| Mensagens | conversas equipa↔gestão e gestão↔cliente, avisos |
| Rendimentos (opcional) | faturação ao cliente, pagamentos à equipa, margem |
| Inventário, Serviços ligados (opcionais) | stock; parceiros externos (ex. lavandaria) |

Dois perfis com interesses opostos, e é aí que está o risco: **gestão** vê tudo; **quem executa** vê
só os seus trabalhos e nunca vê valores de clientes nem remuneração de colegas.

Vocabulário variável por empresa (trabalho/limpeza/sessão; local/alojamento/instalação;
profissional/colaborador/formador). Nunca fixes estes termos no código.

## 2. Decisões em aberto (não assumas)

1. **Uma instalação por empresa ou um produto único multi-empresa.** Recomendação da auditoria:
   produto único, com o que varia por empresa guardado como configuração em dados. Se for esse o
   caminho, `organization_id` em todas as tabelas e nas regras de acesso, desde a primeira migração.
2. **Stack.** A implementação anterior é React + esbuild, sem framework, com Supabase (Postgres,
   Auth, Storage, Realtime, Edge Functions). Mudar de stack é reescrever a interface, não evoluí-la.
3. **Canal do cliente** (email, WhatsApp): os clientes não têm conta na app.

Confirma estas três com o utilizador antes da arquitetura.

## 3. Processo de trabalho

Planeamento antes de código. Cada fase produz um artefacto aprovado pelo utilizador antes da
seguinte. Não escrevas código de aplicação enquanto as fases 1 a 5 não fecharem.

| # | Fase | Artefacto | Fecha quando |
|---|---|---|---|
| 1 | Domínio e âmbito | `docs/01-prd.md` | problema, perfis, histórias, prioridades, requisitos não funcionais (RGPD, idioma, desempenho) |
| 2 | Processo real da empresa | `docs/02-fluxos.md` | o percurso de um trabalho do início ao fim, tal como a empresa o descreve, e os ecrãs-chave |
| 3 | Modelo de dados e arquitetura | `docs/03-arquitetura.md`, `docs/04-modelo-dados.md`, `docs/adr/` | ver secção 4; decisões de stack em ADR |
| 4 | Critérios de aceitação | `docs/05-criterios.md` | Given/When/Then por história do MVP |
| 5 | Plano | `docs/06-plano.md` | **só o primeiro pedaço**, ver secção 6 |
| 6 | Execução | código | fases 1–5 fechadas |
| 7 | Endurecimento | lista de pendentes triada, teste ponta a ponta com contas reais de cada perfil | — |
| 8 | Produção | ambientes, backups, monitorização, domínio, dados reais, plano de reversão | utilizador assina o arranque |

Regras do processo, todas vindas de falhas reais:

- **Análise de lacunas (fase 2).** Marca cada passo do processo da empresa como *suportado* ou *em
  falta*. O que falta tem de ter ecrã e tarefa. *Na ALClean ninguém o fez: a app chegou ao fim da
  segunda fase sem qualquer forma de criar um trabalho — só os importava de um calendário simulado.*
- **Fora de âmbito é decisão do utilizador**, não tua. Regista cada exclusão e faz-lhe aprovar.
- **Decisões de produto pedem aprovação;** decisões técnicas não. Separa-as quando reportares.
- **Pré-requisitos externos no início:** chaves de serviço, domínio, servidor de email, contas reais,
  método de entrada na app. *Na ALClean, faltar uma chave bloqueou uma tarefa a meio da execução.*
- **Pergunta cedo com que credencial entra quem executa.** *Um domínio inventado (`@empresa.local`)
  foi recusado pela validação de domínio do serviço de autenticação.*
- **Teste do utilizador no fim de cada pedaço**, em ambiente de testes, não só no fim de tudo.
- **Nenhuma credencial em documentos**, mesmo fora do controlo de versões.
- **Retrospetiva no fim de cada pedaço:** houve retrabalho com causa no processo? Se sim, regista e
  propõe a alteração à regra. Se não, não escrevas nada.

## 4. Modelo de dados — o que o documento tem de conter

Antes de qualquer código, e validado pelo utilizador:

1. **Entidades e fonte única.** Uma entidade, um sítio que a define. Todos os outros referem-na por
   identificador. *A implementação anterior tinha a mesma pessoa definida em seis tipos diferentes e
   locais referidos por nome; corrigir isso obrigou a migrar sete módulos ao mesmo tempo.*
2. **Ligações por identificador, nunca por nome.**
3. **Ciclo de vida único por entidade.** Uma lista de estados e transições, e quem pode fazer cada
   uma. *Antes havia três representações do estado de um trabalho, que só coincidiam por acaso nos
   dados de exemplo.*
4. **Calculado, nunca guardado.** Estado de fatura, atraso, margem: fórmula e origem. *"Em atraso"
   estava guardado num sítio e calculado noutro, e nunca aparecia.*
5. **Dinheiro e visibilidade.** Cada valor monetário: onde vive e quem o vê. Ver secção 5.
6. **Apagar e arquivar.** O que acontece a cada entidade: pessoas arquivam-se, não se apagam;
   trabalhos concluídos não se apagam. *Apagar uma pessoa levava em cascata pagamentos já feitos e as
   atribuições que sustentam o cálculo de custos.*
7. **Acesso e suspensão.** O que cada estado de conta bloqueia, e onde é verificado. *O estado
   "suspenso" existia e nenhuma regra o consultava: suspender não suspendia nada.*
8. **Quem cria cada entidade,** por que ecrã ou processo automático.
9. **Significados confirmados no código.** Antes de fixares o que um campo significa, procura onde é
   lido e escrito. Se o comentário contradisser o uso, vale o uso. *Um comentário errado quase
   inverteu a regra que diz a quem se leva material.*

## 5. Segurança — regras não negociáveis

- **Proteção ao nível da linha em todas as tabelas.** Sem exceções.
- **As permissões por coluna não servem para separar perfis.** Aplicam-se ao papel da base de dados,
  que é o mesmo para a gestão e para quem executa. *Consequência prática:* dados sensíveis
  (remuneração, tarifas de cliente, NIF, contactos, notas internas) vivem em **tabelas próprias**, só
  da gestão. A proteção ao nível da linha filtra linhas, não colunas.
- **Colunas que quem executa pode alterar:** impõe por *trigger* as transições permitidas, não por
  permissão de coluna. *Sem isso, quem executa consegue aprovar o próprio trabalho.*
- **Funções com privilégios elevados** só com justificação escrita, caminho de pesquisa fixo, e
  permissão de execução revogada a quem não deve chamá-las.
- **A aprovação automática não pode confiar em valores declarados por quem executa** (duração,
  quantidades, tarefas marcadas). Deteta também o caso oposto: concluído em segundos.
- **Quem chama uma função de administração tem de estar ativo,** não basta ter o papel. *Uma gestora
  arquivada conseguia repor o código de acesso de qualquer pessoa.*
- **Sem registo público de contas.** Uma sessão autenticada sem pessoa associada não pode ler nada.
- **Autenticação:** um código de 6 dígitos com email previsível não chega. Identificador não
  adivinhável, limite de tentativas, proteção contra passwords comprometidas.
- **Ficheiros (fotografias):** repositório privado, caminho validado por política, sem acesso a
  ficheiros de outro trabalho, e rotina que remove órfãos.
- **Dados pessoais:** minimização (quem executa não precisa do NIF do cliente nem do telefone das
  colegas), retenção de fotografias, exportação e apagamento a pedido. Motivos de ausência como
  "baixa" são dados de saúde: guarda-os de forma genérica.

## 6. Planos e execução

- **Planeia um pedaço de cada vez.** O primeiro é a base: esquema, segurança, autenticação. Executa,
  revê, e só depois planeia o seguinte, já com o que aprendeste. Até cerca de 8 tarefas por pedaço.
  *Um plano de 16 tarefas escrito de uma vez obrigou a remendar instruções a meio.*
- **Antes de planear uma integração externa, experimenta-a:** cria o recurso a sério, aplica a peça
  mínima e faz uma chamada real a partir de onde a app vai chamar. *Assim se descobrem em minutos:
  falta de cabeçalhos entre origens numa função publicada, quotas de email, formatos de hora
  inesperados, valores nulos enviados em inserções em lote que contornam os valores por omissão.*
- **Revê o sistema vivo, não os ficheiros.** Confirma políticas, funções, triggers, publicações e
  funções publicadas contra o sistema real. **Tudo o que existe no sistema vivo tem de existir numa
  migração.** *Dez tabelas ficaram com tempo real ativado por comando manual: quem reconstruísse a
  base a partir das migrações perdia-o sem aviso.*
- **Duas escritas em tabelas diferentes são uma transação.** Uma função na base de dados, uma
  chamada. *Caso contrário a interface diz "não guardei" e metade ficou guardada.*
- **Nunca converter números escritos por pessoas com o conversor por omissão.** `9,50` dá valor
  inválido e entra na base de dados sem erro.
- **Toda a ação que falha repõe o ecrã** a partir do servidor; não deixes a interface a mostrar algo
  que nunca foi guardado.
- **Relógio injetável.** Nada de datas de demonstração no código de produção. *Uma data fixa fez o
  planeamento aparecer vazio no teste do utilizador.*

## 7. Qualidade — a partir do primeiro dia

Nada disto existia na implementação anterior, e a consequência foi depender inteiramente de revisão
humana:

- Verificação de tipos estrita em integração contínua; proibido o tipo livre na fronteira com a base
  de dados (gera os tipos a partir do esquema).
- Formatador e analisador estático.
- Testes unitários às regras de negócio puras (as regras já devem ser funções puras, sem relógio nem
  acesso a dados).
- Teste automático de segurança (ver secção 8) em integração contínua.
- Alguns testes ponta a ponta dos percursos principais: entrar, planear, executar, aprovar.
- Proteção contra ecrã branco, estados de carregamento, erro e vazio distintos, e mensagens de erro
  traduzidas — nunca o texto cru da base de dados.
- Sem dados de demonstração no código de produção; sem código morto; sem módulos desligados no pacote
  final.
- Uma só aplicação com navegação interna, com o código dividido por rota. *Sete aplicações separadas
  repetiam a biblioteca de interface e o cliente de dados em cada uma.*

## 8. Teste de segurança — critérios de validade

Um teste que não consegue falhar não prova nada. *O primeiro teste da implementação anterior passava
18 em 18, e seis das verificações passariam mesmo sem proteção nenhuma.* Cada verificação negativa
("X não consegue ver Y") exige:

1. **Dados que existem no alvo**, semeados antes, e confirmados com uma sessão privilegiada.
2. **Recusa distinta de erro:** leitura negada = zero linhas *sem erro* numa tabela que tem linhas;
   escrita negada = o código de erro exato esperado. Qualquer outro erro faz falhar o teste.
3. **Controlo positivo:** quem deve ver a mesma linha, vê-a.
4. **Cada coluna protegida testada**, não só uma.

E o conjunto exige:

5. **Sonda de sanidade:** uma verificação com um nome de tabela errado de propósito, que tem de
   falhar. *Sem ela, um nome mal escrito contava como "seguro".*
6. **Dados descartáveis:** contas e linhas criadas pelo teste, marcadas, apagadas no fim mesmo em
   caso de falha. Nunca contas de pessoas reais nem credenciais fixas no repositório.
7. **Nunca alterar nem apagar o que o teste não criou.** *Atenção a tabelas cuja chave é o
   identificador de outra entidade real: apagar a "linha de teste" apaga a verdadeira.*
8. **Correr contra um ambiente de testes**, não contra a base com dados de clientes reais.

Cobertura mínima: leitura cruzada entre equipas e entre empresas, valores monetários, auto-aprovação,
entrada em conversas alheias, ficheiros de outro trabalho, contas suspensas e arquivadas, sessão sem
pessoa associada, visitante anónimo, e o filtro das subscrições em tempo real.

## 9. Lista curta: fazer e não fazer

**Fazer**

- Decidir o modelo de dados antes do código, e fazê-lo validar.
- Separar em tabelas próprias tudo o que um perfil não pode ver.
- Experimentar cada serviço externo antes de o planear.
- Planear um pedaço de cada vez.
- Verificar o sistema vivo e exigir migração para tudo o que lá está.
- Escrever testes de segurança que conseguem falhar.
- Confirmar o significado de um campo pelo uso no código.
- Arquivar em vez de apagar; manter o histórico só de acrescentar.
- Pôr os controlos de qualidade automáticos antes da primeira funcionalidade.

**Não fazer**

- Guardar códigos ou chaves de acesso a casas de clientes. *Se o telemóvel de quem executa for
  roubado, essas chaves vão com ele.*
- Confiar em permissões por coluna para separar perfis.
- Escrever o plano todo de uma vez.
- Verificar segurança lendo ficheiros.
- Deixar datas de demonstração, dados simulados ou módulos desligados no código de produção.
- Mostrar erros da base de dados ao utilizador.
- Guardar o que pode ser calculado.
- Escrever credenciais em documentos.
- Tomar decisões de produto sem aprovação.

## 10. Definição de concluído

Uma tarefa está concluída quando, com prova apresentada:

- critérios de aceitação cumpridos;
- testes novos escritos e toda a bateria verde (mostra o resultado);
- verificação de tipos e análise estática sem erros novos;
- teste de segurança verde, incluindo isolamento entre perfis e entre empresas, se tocou em dados;
- migração criada e aplicável de raiz, se tocou no esquema;
- sistema vivo confere com as migrações;
- sem dados de demonstração, sem código morto, sem credenciais;
- documentação atualizada se o comportamento visível mudou;
- pendentes adiados registados com dono, nunca dispersos por relatórios.
