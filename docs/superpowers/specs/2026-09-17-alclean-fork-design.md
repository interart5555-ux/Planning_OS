# Fork de Implementação — ALClean — Design

Data: 17 de setembro de 2026.

## Objetivo

Os 7 módulos personalizáveis da ALClean (Equipas, Clientes, Planeamento, Execução, Aprovações, Mensagens, Rendimentos) estão todos capturados e validados em `alclean/perfil-empresa.md` e `alclean/modulos/*.md`, cada um com um mockup Artifact aprovado. Este documento desenha a fase seguinte, já antecipada (mas fora de âmbito) pelo spec do procedimento de personalização (`2026-09-16-procedimento-personalizacao-design.md`): transformar essas decisões validadas em código real, continuando o padrão de **simulação visual** já usado na Fase 1 do template (sem base de dados, sem contas reais, sem envios reais) — mas agora com o vocabulário, a marca e as regras de negócio da ALClean a funcionar de facto no código, não só documentados.

Não é uma app de produção: sem backend, sem autenticação real, sem envios reais (WhatsApp/email). Isso fica para uma fase posterior, fora de âmbito.

## Arquitetura e tooling

```
2_Sandbox/
  Planning_OS - V2/        ← o template. Nunca é alterado por este trabalho.
    src/  preview/
  alclean/
    perfil-empresa.md      ← já existente
    modulos/*.md           ← já existentes
    app/                   ← novo: o fork de código
      src/                 ← cópia de src/ do template, personalizada
      preview/              ← cópia de preview/ do template, personalizada
      package.json          ← novo: dependências mínimas (esbuild)
      build.(mjs|sh)        ← novo: script de build (TS/React → bundles IIFE)
```

- `alclean/app/` é uma **cópia dedicada** do template — não uma alteração ao template nem um mecanismo de configuração multi-empresa. A próxima empresa a passar para código repete este mesmo processo de fork a partir do template genérico.
- O template atual não tem `package.json` nem processo de build guardado em repositório — os bundles em `preview/module-*-react.js` são pré-compilados e não reprodutíveis a partir do `src/` sem reconstruir esse processo. `alclean/app/` ganha o seu próprio `package.json` + script `esbuild` mínimo, para poder compilar `src/` → bundles que `preview/` carrega.
- **Simplificação:** os `config.ts` de cada módulo hoje suportam três domínios (`limpezas`/`formacao`/`manutencao`). Como este fork serve só a ALClean, essa abstração multi-domínio é removida — cada `config.ts` fica só com a configuração da ALClean, sem as variantes de formação/manutenção mortas.
- `mockData.ts` de cada módulo passa a gerar dados coerentes com a ALClean (clientes e alojamentos já usados nos mockups aprovados — Apartamentos Baixa-Chiado, Villa Mar Cascais, Residencial Setúbal, etc. — em vez dos genéricos Lisboa/Porto do template).

## Como as decisões dos módulos viram código

- **Vocabulário e marca** — substituem diretamente os valores por omissão em cada `config.ts` (nomes, cor primária `#0D9488`, tom informal na cópia da UI).
- **Regras ajustáveis pela gestora** — tolerância de duração (Aprovações), limiares de saúde financeira (Rendimentos), modelo de custo de equipa por limpeza/+deslocações (Rendimentos) deixam de ser `const` fixas no código e passam a estado guardado em `localStorage`, seguindo o padrão que o template já usa para módulos ativos/inventário/mensagens (`appos.*.v1`), com uma janela de "Definições" por módulo para as editar — como já desenhado nos Artifacts aprovados.
- **Alterações reais ao modelo de dados** (não só cosméticas):
  - Fornecimento de produtos/lavandaria sobe de `ServiceLocation` (alojamento) para `Client`, e propaga-se a todos os alojamentos desse cliente.
  - Nenhum campo armazena código/chave de acesso ao alojamento (regra de segurança).
  - "Inventário da roupa a lavar" (Execução) fica sempre disponível por limpeza, independentemente de o alojamento ter a recolha para lavandaria ativa.
  - Registo de incidência aceita só descrição de texto, sem obrigar foto (o campo `description` já existe no modelo; deixa de ser tratado como secundário face a `withPhoto`).
- **Módulos opcionais** — Rendimentos ativado por omissão; Inventário e Serviços ligados continuam presentes no seletor "Gerir módulos ativos" (`ModulosAtivosProvider`, já suportado nativamente) mas desligados por omissão.

## Resumo de alterações por módulo

- **Equipas** — Papéis Gestora/Colaborador(a), sem nível Admin. Pagamento por limpeza (não €/hora). Novo tipo de ausência "Não comunicada"; aprovação de ausências sempre informal. Acesso por ensino direto, sem fluxo de convite formal.
- **Clientes** — Unidade renomeada "Quarto". Fornecimento de produtos/lavandaria ao nível do cliente (ver acima). Check-in/check-out mantidos. iCal: Airbnb e Booking.com.
- **Planeamento** — Sem alterações de regras: `isHighPriority`/`PriorityDot`/`WindowAlert` já são o comportamento nativo do template e já correspondem ao que a ALClean validou. Só tema/marca e dados de exemplo.
- **Execução** — Preparação sem qualquer campo de código/chave. "Levar material de limpeza" e "levar sacos de lavandaria" condicionais ao fornecimento do cliente. Secção de quantidades renomeada "Inventário da roupa a lavar" e sempre visível. Incidência aceita registo só por mensagem.
- **Aprovações** — Rótulo "Inventário de Roupa" (mantendo a lógica de só contar falta, não excesso). Tolerância de duração editável (omissão 30 min). Só a gestora aprova/corrige/reabre.
- **Mensagens** — Colaboradora pode conversar diretamente com um cliente. Avisos novos: próximo trabalho a caminho; nova reserva/alteração via iCal (só quando cai na semana em curso); virada rápida do dia (ligado ao critério de Planeamento).
- **Rendimentos** — Ciclo de faturação quinzenal e prazo de pagamento à vista por omissão. Custo de equipa com opção configurável (só valor por limpeza / + deslocações). Limiares de saúde financeira editáveis. Métrica de custo de produtos ocultada enquanto o Inventário estiver inativo.

## Verificação

O template original não tem framework de testes automatizados — é uma simulação client-side, e este fork mantém essa opção. Verificação por **inspeção visual real**: compilar com `npm run build` dentro de `alclean/app/`, abrir `alclean/app/preview/index.html` no browser, e percorrer os 7 módulos confirmando o comportamento contra `alclean/modulos/*.md` (o mesmo conteúdo já aprovado nos Artifacts, agora funcional em vez de só desenhado) — checklist, drag & drop do Planeamento, aprovações, definições editáveis, etc., testados por interação manual.

## Fora de âmbito deste spec

- Base de dados, contas/autenticação reais, envios reais (WhatsApp/email/SMS/push).
- Qualquer mecanismo de configuração multi-empresa no template (este fork é dedicado só à ALClean).
- Implementação de Inventário e Serviços ligados (módulos opcionais recusados pela ALClean).
- Testes automatizados (fora do padrão já estabelecido pelo template original).

## Próximos passos

Este documento cobre o design do fork. A implementação — criar `alclean/app/` com o build mínimo e aplicar as alterações módulo a módulo listadas acima — é trabalho a planear via `writing-plans`, depois de este spec ser revisto.
