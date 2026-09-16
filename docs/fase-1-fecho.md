# AppOS · Limpezas — Fecho da Fase 1

Data: 16 de setembro de 2026

A Fase 1 é uma **simulação visual** da aplicação: sem base de dados, sem contas, sem pagamentos e sem envios reais (email, SMS, WhatsApp ou notificações). Todos os dados de exemplo ficam guardados no browser.

## O que ficou pronto

| # | Módulo | Tipo | Desenho | React |
|---|--------|------|---------|-------|
| 1 | Empresa e utilizadores | Base | ✔ | ✔ (sem página própria de pré-visualização) |
| 2 | Equipas | Base | ✔ | ✔ |
| 3 | Clientes, alojamentos e unidades | Base | ✔ | ✔ |
| 4 | Planeamento | Base | ✔ | ✔ |
| 5 | Execução de trabalho | Base | ✔ | ✔ |
| 6 | Aprovações e histórico | Base | ✔ | ✔ |
| 7 | Rendimentos | Opcional | ✔ | ✔ |
| 8 | Inventário | Opcional | ✔ | ✔ |
| 9 | Serviços ligados | Opcional | — | — (em espera) |
| 10 | Mensagens e notificações | Base | ✔ | ✔ |

Ponto de entrada: [preview/index.html](../preview/index.html).

Código: `src/modules/<módulo>/`, com o que é comum em `src/modules/shared/` (barra de topo, ícones, botões, janelas, gestão de módulos ativos).

## Regras de negócio fixadas nesta fase

1. **Módulos 1 a 6 e 10 são base** e nunca podem ser desligados. Só 7 (Rendimentos), 8 (Inventário) e 9 (Serviços ligados) são opcionais, para gestoras que não os queiram gerir.
2. **Desligar um módulo opcional não apaga dados.** O módulo passa a mostrar "Módulo indisponível" com o botão "Gerir módulos ativos".
3. **Aprovações:** uma limpeza concluída, com checklist completa e sem ocorrências, é aprovada automaticamente e vai direta para o histórico. Só as limpezas com ocorrências aparecem em Aprovações. Passar mais de 30 minutos do tempo previsto fica "Por rever", com a etiqueta "Duração excedida", e não conta como anomalia.
4. **Inventário:** o stock do cliente nunca é tratado como custo, compra ou ativo da empresa. Aparece em itens, não em euros, e fica fora de compras, encomendas e fornecedores.
5. **Mensagens:** a colaboradora vê apenas as suas conversas e as das suas limpezas, e não marca conversas como resolvidas. O cliente não tem portal nem sessão nesta fase.

## Ligações entre módulos

- **Inventário → Clientes:** separador "Produtos" na ficha do alojamento, com "Quem fornece os produtos?".
- **Inventário → Execução:** bloco "Produtos usados" dentro da limpeza.
- **Mensagens → Execução:** sino de avisos, aviso no topo do dia, "Enviar mensagem à gestora" dentro da limpeza e separador Mensagens com conversas reais.
- **Inventário → Rendimentos:** custo operacional preparado, sem lançamentos financeiros automáticos.

Quando o módulo opcional está desligado, estas ligações desaparecem e os ecrãs voltam ao que foi aprovado no respetivo passo.

## Dados guardados no browser

`appos.inventario.v1`, `appos.mensagens.v1`, `appos.modulos.preview.v1` (React) e `appos.modulos.demo.v1` (desenhos em HTML). Cada pré-visualização tem "Repor dados" na barra de topo; o parâmetro `?repor=1` faz o mesmo.

## Fase 2 — o que fica em aberto

- **Passo 9, Serviços ligados** (lavandaria e outros parceiros), em espera por decisão tomada a 16 de setembro de 2026.
- **Cronómetro em tempo real na Execução**, escondido atrás de `EXEC_FEATURES.timer = false`; por agora só se registam hora de início e de fim.
- **Base de dados, contas e permissões reais**, envios reais de mensagens e portal do cliente.
- **Lacuna conhecida:** `preview/module-3-clientes.html` não tem os campos "Hora de saída/entrada" que já existem na versão React.
- O módulo 1 ainda não tem página de pré-visualização React própria.
