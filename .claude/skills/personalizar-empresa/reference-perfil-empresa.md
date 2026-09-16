# Referência — Questionário do Perfil de Empresa

Usado por `SKILL.md` desta skill. Contém as perguntas estáticas a fazer; as respostas de uma empresa concreta vivem em `empresas/<slug>/perfil-empresa.md`, nunca aqui.

## 1. Identificação
- Nome da empresa.
- Slug (nome do diretório — kebab-case, sem acentos; propor um a partir do nome e confirmar).
- Área de negócio: limpezas / formação / manutenção / outra (se "outra", pedir uma descrição curta em texto livre).

## 2. Vocabulário-base
- Nome do "trabalho" — singular e plural (ex.: Limpeza/Limpezas, Sessão/Sessões, Intervenção/Intervenções).
- Nome do "local" — singular e plural (ex.: Alojamento/Alojamentos, Instalação/Instalações, Edifício/Edifícios).
- Nome do "profissional" — singular, plural, e forma feminina (ex.: Colaborador/Colaboradores/colaboradora).

## 3. Marca
- Nome a mostrar na app (ex.: "AppOS · <Nome>").
- Cor primária (pedir um hex; se não souberem, sugerir uma cor coerente com o setor e confirmar).
- Tom de comunicação: formal ou informal.

## 4. Processo de trabalho, módulo a módulo (só módulos base)

Uma pergunta de processo por módulo, de forma conversacional — não pedir tudo de uma vez:

- **Equipas** — Como estão organizadas as equipas/colaboradoras hoje? Fixas por cliente, rotativas, uma só pessoa a gerir tudo?
- **Clientes** — Como está estruturada a carteira: um cliente tem um ou vários locais? Há unidades dentro de cada local?
- **Planeamento** — Como decidem quem vai a que trabalho e quando? Manual, calendário, reservas externas (ex. Airbnb)?
- **Execução + Aprovações** — usar a narrativa guiada da secção 5 abaixo, não uma pergunta solta.
- **Mensagens** — Como comunicam hoje com a equipa e com os clientes no dia a dia? WhatsApp, telefone, papel?

Depois das seis respostas, derivar (não perguntar diretamente) o sinal de ativação dos módulos opcionais:
- Faturação/cobrança por trabalho mencionada em Execução ou Planeamento → candidato a **Rendimentos**.
- Produtos, materiais ou stock geridos mencionados → candidato a **Inventário**.
- Parceiro ou serviço externo mencionado (ex. lavandaria, subcontratação) → candidato a **Serviços ligados**.

Apresentar os candidatos encontrados e a frase que os motivou, e confirmar cada ativação explicitamente, um módulo de cada vez. Nunca marcar `true` em `modulos_opcionais` sem confirmação explícita para esse módulo específico.

## 5. Ciclo de trabalho: Execução + Aprovações

Pergunta única, mais profunda que as outras, porque cobre os dois módulos centrais do projeto:

> "Descreva o ciclo de vida de um trabalho típico, do início ao fim — desde o momento em que a colaboradora chega ao local até ao momento em que a gestora o dá como concluído."

Guiar com estas sub-perguntas, uma de cada vez, só se a resposta inicial não as cobrir:
1. Como começa — a colaboradora confirma que vai, há alguma preparação antes de chegar ao local?
2. Que passos são feitos no local, e em que ordem?
3. O que é registado durante o trabalho — fotos, quantidades, tempo, notas?
4. O que corre mal tipicamente, e como é registado nesse momento — incidência, atraso, dano, material em falta?
5. Como e quando a colaboradora dá o trabalho como "terminado"?
6. O que acontece a seguir — alguém revê sempre, ou só quando há um problema?
7. Se algo não está bem, o que acontece — pede-se correção, reabre-se o trabalho, outra coisa?

Guardar a narrativa completa (não um resumo) no campo "Ciclo de trabalho" do perfil — `/personalizar-modulo execucao` e `/personalizar-modulo aprovacoes` vão lê-la e decompor dela a checklist, os tipos de evidência, os tipos de anomalia e o critério de aprovação automática, sem voltar a perguntar o processo.

## Casos limite
- Se o utilizador não souber responder a um campo: perguntar se quer que se assuma a omissão mais próxima do domínio já existente no template (ex. limpezas). Se sim, preencher com essa omissão e marcar o campo em "Casos por confirmar" no ficheiro gravado.
- Nunca inventar uma resposta definitiva sem a marcar como assumida.
