---
empresa: ""
fase_criacao: ""
data_validacao: ""
---

# Modelo de dados — {{empresa}}

## Entidades

<!-- Uma linha por entidade real do negócio. A fonte única é o único tipo/tabela
     que a define; todos os outros sítios referem-na por id. -->

| Entidade | O que é | Fonte única | Módulos que a usam |
|---|---|---|---|

## Duplicações encontradas no código

<!-- Tipos que hoje descrevem a mesma entidade (ex. a mesma pessoa em vários
     types.ts): onde estão e qual passa a ser a fonte única. -->

## Ligações entre módulos

<!-- Sempre por id, nunca por nome. Uma linha por ligação: `A.campo → B.id`. -->

## Ciclo de vida

<!-- Para cada entidade com estados: uma única lista de estados e transições,
     e quem pode fazer cada transição. Nenhum módulo tem a sua própria versão. -->

## Calculado, nunca guardado

<!-- Valores derivados (ex. estado de uma fatura, atraso, margem): a fórmula
     e de onde vêm os dados. Não existe coluna nem campo guardado para eles. -->

## Dinheiro e visibilidade

<!-- Cada valor monetário. "Só gestão" implica que vive fora de qualquer
     tabela/tipo que quem executa precisa de ler. -->

| Valor | Onde vive | Quem vê | Origem da decisão (`modulos/<x>.md`) |
|---|---|---|---|

## Significados confirmados no código

<!-- Campos cujo significado foi confirmado pelo uso no código. Assinalar os casos
     em que o comentário ou o tipo diziam o contrário. -->
