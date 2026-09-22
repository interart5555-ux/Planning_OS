# Como criamos a app de cada empresa — o que mudou

*Resumo sem linguagem técnica. Setembro de 2026.*

## O ponto de partida

Temos um **modelo de app** (o "template") para empresas de serviços: planeamento, equipas, clientes,
execução dos trabalhos, aprovações, mensagens e faturação. Para cada empresa nova seguimos um caminho
em três etapas:

1. **Conhecer a empresa** — um questionário sobre como trabalham, que nomes usam, que cores têm.
2. **Validar cada módulo** — para cada parte da app, fazemos perguntas e mostramos um ecrã de exemplo
   até a empresa dizer "é isto".
3. **Construir a app a sério** — copiamos o modelo, adaptamo-lo e ligamo-lo a uma base de dados real,
   com contas e permissões.

A primeira empresa a fazer este caminho completo foi a **ALClean** (limpezas de alojamento local).
Correu bem no fim, mas a etapa 3 custou várias rondas de correção que se podiam ter evitado. Quase
todas vinham da forma como o caminho estava desenhado, não de erros pontuais. Foi isso que corrigimos.

## Os seis problemas, antes e agora

### 1. A "planta" dos dados era decidida tarde demais

**Antes:** começava-se a construir sem decidir primeiro como a informação se organiza. A mesma pessoa
estava descrita de seis maneiras diferentes em partes diferentes da app, e os alojamentos eram
identificados pelo nome (dois alojamentos com o mesmo nome confundiam-se). Os valores que os clientes
pagam estavam guardados ao lado da informação que as colaboradoras precisam de ver.
Resultado: a certa altura foi preciso reorganizar tudo de uma vez, com os sete módulos ao mesmo tempo.

**Agora:** antes de qualquer código escreve-se uma "planta" dos dados, que a empresa valida: que
coisas existem (pessoas, clientes, alojamentos, limpezas…), onde está a versão oficial de cada uma,
como se ligam entre si, o que é calculado na hora, e **que valores de dinheiro só a gestão pode ver**.
Esta última pergunta passa a ser feita logo quando se valida cada módulo.

### 2. Planeava-se a ligação a serviços externos sem os experimentar

**Antes:** o plano de ligação à base de dados, às contas e ao email foi escrito com base na
documentação. Na prática, esses serviços tinham comportamentos que a documentação não deixava
adivinhar — um bloqueio de segurança do browser, uma quota de emails esgotada num projeto novo, um
endereço de email recusado. Cada surpresa custou uma ronda de correção.

**Agora:** antes de planear, faz-se um **teste rápido**: cria-se o serviço a sério, monta-se uma peça
mínima e faz-se uma chamada real a partir de onde a app vai funcionar. As surpresas aparecem em
minutos e entram no plano antes de ele ser escrito.

### 3. O plano era escrito todo de uma vez

**Antes:** a fase de ligação à base de dados tinha 16 tarefas planeadas de uma só vez. O que se
aprendeu nas primeiras não chegava às seguintes, e foi preciso andar a remendar instruções a meio.

**Agora:** planeia-se **por pedaços**. Primeiro só a base (a estrutura dos dados, a segurança e o
login); executa-se, revê-se, e só depois se planeia o pedaço seguinte, já com o que se aprendeu.

### 4. As revisões olhavam para o papel, não para a realidade

**Antes:** para confirmar a segurança, lia-se o que estava escrito nos ficheiros. Mas o que está
escrito e o que está realmente ativo na base de dados nem sempre coincidem. Uma regra que devia
proteger as mensagens estava ativa, mas não protegia nada.

**Agora:** as revisões confirmam **o que está realmente em funcionamento** e exigem que tudo o que
está ativo esteja também registado por escrito (para a app poder ser reconstruída sem perdas).

### 5. Havia testes de segurança que passavam sempre

**Antes:** o primeiro teste automático de segurança dava 18 verificações certas em 18. Mas 6 delas
passariam mesmo sem proteção nenhuma — verificavam gavetas vazias. E o próprio teste chegou a ter um
erro que teria apagado dados reais de tarifas.

**Agora:** um teste de segurança só vale se **conseguir falhar**: verifica sobre dados que existem,
distingue "acesso recusado" de "deu erro", confirma também que quem deve ver consegue ver, e usa
apenas dados de teste que cria e apaga ele próprio — nunca toca em dados reais.

### 6. Confiava-se em notas em vez de confirmar o que o código faz

**Antes:** uma decisão foi tomada com base num comentário escrito no código que dizia o contrário do
que o código realmente fazia. Se não tivesse sido apanhada, as colaboradoras seriam mandadas levar
material precisamente aos clientes que já o fornecem.

**Agora:** antes de decidir o que um campo significa, vê-se **como o código o usa**. Se a nota
disser outra coisa, vale o comportamento e corrige-se a nota.

### E um sétimo, mais pequeno

Na etapa 2, as regras proibiam consultar o modelo da app para fazer as perguntas. Resultado: numa
ocasião inventou-se um ecrã de exemplo quando o modelo já tinha uma solução melhor pensada. **Agora**
consulta-se sempre o modelo antes de perguntar ou desenhar (sem nunca o alterar).

## O que torna isto contínuo

Corrigir estes seis problemas não chega — a próxima empresa vai revelar outros. Por isso o próprio
caminho passou a corrigir-se a si mesmo:

- **Uma pergunta no fim de cada etapa:** *"houve alguma coisa que obrigou a refazer trabalho, e a
  culpa era do procedimento?"* Se não, não se escreve nada.
- **Um registo único** (`docs/superpowers/melhoria-continua.md`) com cada problema real: o que
  aconteceu, em que empresa, quanto custou, e o que mudou no procedimento por causa disso.
- **Um filtro:** só entra o que tem causa no procedimento e vai voltar a acontecer noutra empresa.
  Um engano pontual ou um erro de escrita não é uma lição.
- **Limpeza periódica:** no fim de cada empresa relê-se o registo e retira-se o que já não faz
  sentido ou já está absorvido, para o procedimento não crescer sem fim.
- **A decisão é sempre do responsável:** o sistema regista e propõe; ninguém altera o procedimento
  sem aprovação explícita.

## Em resumo

| | Antes | Agora |
|---|---|---|
| Organização dos dados | decidida a meio da construção | decidida e validada antes de começar |
| Serviços externos | planeados a partir da documentação | experimentados antes de planear |
| Plano | todo de uma vez | por pedaços, aprendendo pelo caminho |
| Revisões | ao que está escrito | ao que está realmente ativo |
| Testes de segurança | podiam passar sem provar nada | têm de conseguir falhar |
| Significado dos dados | lido nas notas | confirmado no comportamento |
| Lições aprendidas | ficavam na memória de quem fez | mudam o procedimento, com aprovação |
