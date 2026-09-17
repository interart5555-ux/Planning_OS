# Fork de Implementação ALClean — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `alclean/app/` — um fork de código, dedicado só à ALClean, do template AppOS — aplicando as decisões validadas em `alclean/modulos/*.md` aos 7 módulos (Equipas, Clientes, Planeamento, Execução, Aprovações, Mensagens, Rendimentos), com um build mínimo que o template atual não tem.

**Architecture:** Cópia de `src/`+`preview/` para `alclean/app/`, com `package.json`+`esbuild` novos (o template não tem nenhum processo de build guardado em repositório, nem os ficheiros de entrada React que os bundles de `preview/` pressupõem — são escritos de raiz nesta implementação). Cada `config.ts` fica só com a configuração ALClean (a abstração `limpezas/formacao/manutencao` é podada). Regras hoje fixas como constantes (tolerância de duração, limiares de saúde, custo de equipa) passam a estado local + `localStorage`, seguindo o padrão que o template já usa (`appos.*.v1`).

**Tech Stack:** React 18 + TypeScript, esbuild (bundler, sem type-check em CI), Tailwind via CDN (já usado por `preview/*-react.html`, sem alterações). Sem framework de testes (o template original não tem nenhum).

**Spec:** `docs/superpowers/specs/2026-09-17-alclean-fork-design.md`

## Global Constraints

- O template em `Planning_OS - V2/src/` e `preview/` nunca é alterado — todas as escritas deste plano vivem em `alclean/app/`.
- Sem base de dados, sem autenticação real, sem envios reais (WhatsApp/email/SMS) — continua a ser simulação client-side, como a Fase 1.
- Sem framework de testes automatizados — verificação por `npm run build` (falha em erro de TS/bundle) e inspeção visual real no browser, módulo a módulo, contra `alclean/modulos/*.md`.
- Português de Portugal em todo o código/UI/copy novo — nunca vocabulário do Brasil (faturamento→faturação, equipe→equipa, usuário→utilizador, etc.).
- Cor primária da marca: `#0D9488`. Nome a mostrar: "ALClean" (sem prefixo "AppOS ·").
- `modulos_opcionais`: `rendimentos: true`, `inventario: false`, `servicosLigados: false` — só Rendimentos dos 3 opcionais é implementado neste plano.

---

### Task 1: Bootstrap do fork — cópia, build e ficheiros de entrada

**Files:**
- Create: `alclean/app/package.json`
- Create: `alclean/app/build.mjs`
- Create: `alclean/app/src/entries/equipas.tsx`, `clientes.tsx`, `planeamento.tsx`, `execucao.tsx`, `aprovacoes.tsx`, `mensagens.tsx`, `rendimentos.tsx`
- Copy: `Planning_OS - V2/src/` → `alclean/app/src/` (todos os módulos, incluindo `shared/`)
- Copy: `Planning_OS - V2/preview/` → `alclean/app/preview/` (só as páginas `*-react.html` e `index.html` — os "desenhos" estáticos não-React ficam de fora, este fork só usa a via React)
- Test: nenhum framework — verificação por `npm run build` sem erros e abertura visual de `preview/index.html`.

**Interfaces:**
- Produces: `alclean/app/preview/module-2-equipas-react.js` … `module-10-mensagens-react.js` (7 bundles), consumidos pelas Tasks 2–8 como alvo de verificação (rebuild após cada edição de módulo).

- [ ] **Passo 1: Copiar `src/` e `preview/` do template para o fork**

```bash
mkdir -p "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app"
cp -R "/Users/paulorsalgado/Documents/2. Sandbox/Planning_OS - V2/src" "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app/src"
mkdir -p "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app/preview"
cp "/Users/paulorsalgado/Documents/2. Sandbox/Planning_OS - V2/preview/index.html" "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app/preview/index.html"
for f in module-2-equipas-react.html module-3-clientes-react.html module-4-planeamento-react.html module-5-execucao-react.html module-6-aprovacoes-react.html module-7-rendimentos-react.html module-10-mensagens-react.html; do
  cp "/Users/paulorsalgado/Documents/2. Sandbox/Planning_OS - V2/preview/$f" "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app/preview/$f"
done
```

Expected: `alclean/app/src/modules/` tem os 10 módulos; `alclean/app/preview/` tem `index.html` + os 7 `*-react.html`. Os `*-react.js` antigos (do template) **não** são copiados — vão ser gerados de novo pelo build desta task.

- [ ] **Passo 2: Escrever `package.json`**

```json
{
  "name": "alclean-app",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node build.mjs"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "esbuild": "^0.24.0"
  }
}
```

- [ ] **Passo 3: Escrever `build.mjs`**

```js
import { build } from 'esbuild';

const modules = [
  ['equipas', 'module-2-equipas-react'],
  ['clientes', 'module-3-clientes-react'],
  ['planeamento', 'module-4-planeamento-react'],
  ['execucao', 'module-5-execucao-react'],
  ['aprovacoes', 'module-6-aprovacoes-react'],
  ['rendimentos', 'module-7-rendimentos-react'],
  ['mensagens', 'module-10-mensagens-react'],
];

for (const [mod, outName] of modules) {
  await build({
    entryPoints: [`src/entries/${mod}.tsx`],
    bundle: true,
    minify: true,
    format: 'iife',
    outfile: `preview/${outName}.js`,
    jsx: 'automatic',
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
    logLevel: 'info',
  });
}

console.log('Build ALClean concluído: 7 módulos.');
```

- [ ] **Passo 4: Escrever os 7 ficheiros de entrada**

`src/entries/equipas.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { TeamsModule } from '../modules/equipas';

createRoot(document.getElementById('root')!).render(<TeamsModule mode="micro" />);
```

`src/entries/clientes.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { ClientsModule } from '../modules/clientes';

createRoot(document.getElementById('root')!).render(<ClientsModule />);
```

`src/entries/planeamento.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { PlanningModule } from '../modules/planeamento';

createRoot(document.getElementById('root')!).render(<PlanningModule />);
```

`src/entries/execucao.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { ExecutionModule } from '../modules/execucao';

createRoot(document.getElementById('root')!).render(<ExecutionModule />);
```

`src/entries/aprovacoes.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { ApprovalsModule } from '../modules/aprovacoes';

createRoot(document.getElementById('root')!).render(<ApprovalsModule />);
```

`src/entries/mensagens.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { MessagesModule } from '../modules/mensagens';

createRoot(document.getElementById('root')!).render(<MessagesModule />);
```

`src/entries/rendimentos.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { RevenueModule } from '../modules/rendimentos';

createRoot(document.getElementById('root')!).render(<RevenueModule />);
```

- [ ] **Passo 5: Instalar dependências e correr o build de referência (sem personalização ainda)**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm install && npm run build
```

Expected: `npm run build` termina sem erros e imprime "Build ALClean concluído: 7 módulos."; os 7 ficheiros `preview/module-*-react.js` existem e têm tamanho > 0.

- [ ] **Passo 6: Verificação visual de referência**

Abrir `alclean/app/preview/index.html` no browser (ex.: `open "alclean/app/preview/index.html"` no Mac) e clicar em "Abrir" em Equipas, Clientes, Planeamento, Execução, Aprovações, Mensagens, Rendimentos. Expected: cada módulo carrega e mostra os dados de demonstração genéricos do template (ainda não personalizados — isso é o objetivo das Tasks 2–8). Nenhum ecrã em branco nem erro na consola do browser.

- [ ] **Passo 7: Commit**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && git init -q 2>/dev/null; cd "/Users/paulorsalgado/Documents/2. Sandbox/Planning_OS - V2" && echo "nota: alclean/ fica fora deste repositório git (é irmão do template, não subpasta)"
```

Nota: `alclean/` está fora da raiz do repositório git do template (`Planning_OS - V2/`), por isso não há `git add`/`git commit` a fazer neste repositório para os ficheiros do fork. Se o utilizador quiser versionar `alclean/app/` como o seu próprio repositório git, iniciar um novo repositório dentro de `alclean/app/` é uma decisão dele, fora do âmbito deste passo — confirmar com o utilizador antes de o fazer.

---

### Task 2: Equipas — papéis, pagamento por limpeza, ausências, acesso direto

**Files:**
- Modify: `alclean/app/src/modules/equipas/types.ts`
- Modify: `alclean/app/src/modules/equipas/format.ts`
- Modify: `alclean/app/src/modules/equipas/validation.ts`
- Modify: `alclean/app/src/modules/equipas/useTeamsModule.ts`
- Modify: `alclean/app/src/modules/equipas/components/PersonDrawer.tsx`
- Modify: `alclean/app/src/modules/equipas/components/AddPersonDrawer.tsx`
- Modify: `alclean/app/src/modules/equipas/components/AbsenceDrawer.tsx`
- Modify: `alclean/app/src/modules/equipas/components/AbsencesTab.tsx`
- Modify: `alclean/app/src/modules/equipas/mockData.ts`

**Interfaces:**
- Consumes: nenhuma dependência de outra task de módulo.
- Produces: `Person.perJobRate: number | null` (substitui `hourlyRate`), `AbsenceType` com `'nao_comunicada'`, ausências sempre `status: 'approved'`, novas pessoas sempre `access: 'active'`.

- [ ] **Passo 1: Renomear `hourlyRate` para `perJobRate` em `types.ts`**

Em `Person` (linha ~29-30), `NewPersonInput` (~112) e `PersonEditInput` (~122), substituir:

```ts
/** Valor/hora em euros; opcional. */
hourlyRate: number | null;
```
por
```ts
/** Valor por limpeza em euros; opcional. */
perJobRate: number | null;
```
(e o mesmo campo, como `string`, nos dois tipos de input — só o nome e o comentário mudam, o tipo `string`/`number | null` mantém-se).

- [ ] **Passo 2: Atualizar `format.ts` — `formatRate` e `roleLabel`**

Substituir:
```ts
export function formatRate(rate: number | null): string {
  if (rate == null) return '—';
  return `${rate.toFixed(2).replace('.', ',')} €/h`;
}
```
por:
```ts
export function formatRate(rate: number | null): string {
  if (rate == null) return '—';
  return `${rate.toFixed(2).replace('.', ',')} €/limpeza`;
}
```

Substituir `roleLabel` (linhas ~54-62) para nunca mostrar "Administradora"/"Administrador" — a ALClean só tem Gestora e Colaborador(a):
```ts
export function roleLabel(person: Pick<Person, 'name' | 'role'>, mode: CompanyMode): string {
  const f = isFeminine(person.name);
  if (person.role === 'admin') return f ? 'Gestora' : 'Gestor';
  if (person.role === 'manager') return f ? 'Gestora' : 'Gestor';
  return f ? 'Colaboradora' : 'Colaborador';
}
```
(o parâmetro `mode` fica sem uso dentro da função — não remover da assinatura, só deixar de ramificar por ele, para não obrigar a mudar todas as chamadas.)

Acrescentar `'nao_comunicada'` ao mapa de rótulos de ausência (linhas ~25-32):
```ts
export const ABSENCE_LABEL: Record<AbsenceType, string> = {
  ferias: 'Férias',
  folga: 'Folga',
  indisponibilidade: 'Indisponibilidade',
  formacao: 'Formação',
  consulta: 'Consulta médica',
  baixa: 'Baixa',
  nao_comunicada: 'Não comunicada',
};
```
(ajustar o nome exato da constante ao que o ficheiro já usa — confirmar visualmente o nome antes de editar, mantendo a mesma forma `Record<AbsenceType, string>`.)

- [ ] **Passo 3: Acrescentar `'nao_comunicada'` a `AbsenceType` em `types.ts`**

```ts
export type AbsenceType =
  | 'ferias'
  | 'folga'
  | 'indisponibilidade'
  | 'formacao'
  | 'consulta'
  | 'baixa'
  | 'nao_comunicada';
```

- [ ] **Passo 4: Remover o fluxo formal de aprovação de ausências**

Em `AbsenceDrawer.tsx`, remover a opção `'pending'` do `ChoiceChips` "Estado" (linhas ~116-122), deixando só `'approved'` — ou remover o controlo inteiramente e gravar sempre `status: 'approved'` no submit, já que só existe um estado possível agora. Em `AbsencesTab.tsx`, remover do `useAbsenceMenu` (linhas ~31-59) os itens de menu "Aprovar ausência"/"Recusar ausência" e a lógica `upcoming && a.status === 'pending'` que os condiciona — uma ausência registada já nasce aprovada, não há nada para rever. Manter o campo `AbsenceStatus`/`status` no tipo (não remover), só deixar de expor os caminhos `pending`/`rejected` na UI de registo/gestão.

- [ ] **Passo 5: Simplificar o acesso de nova colaboradora para "ensino direto"**

Em `AddPersonDrawer.tsx`, remover o passo 2 ("Acesso à aplicação", linhas ~86-140) do wizard — a nova pessoa fica com `access: 'active'` diretamente ao ser criada, sem chamar `actions.sendAccess`. Ajustar `useTeamsModule.ts`'s `addPerson` (linha ~210) para definir sempre `access: 'active'` numa nova pessoa (em vez de `'none'`), em vez de esperar por um envio de acesso simulado. Manter `suspendAccess`/`reactivateAccess`/`AccessPill`/`ACCESS_META` intactos — continuam a fazer sentido para gerir acesso depois do primeiro dia.

- [ ] **Passo 6: Substituir `mockData.ts` pelos dados da ALClean**

Reescrever `createDemoData()` com: **Carla Mendes** (gestora e dona da empresa, `role: 'admin'`, `perJobRate: null` — o mesmo nome já usado como gestora em Aprovações/Rendimentos/Mensagens, para ficar consistente em todo o fork), e Sofia Martins, Rui Cabral, Inês Ferreira, Beatriz Teles (colaboradores, `role: 'collab'`, `perJobRate` entre 9 e 11), equipas "Equipa Alfa" e "Equipa Beta", clientes/alojamentos coerentes com os já usados nos outros módulos (Apartamentos Baixa-Chiado, Villa Mar Cascais, Residencial Setúbal, João Teixeira), e pelo menos uma ausência do tipo `nao_comunicada` (Inês Ferreira, sem aviso prévio) entre as ausências de exemplo. Todas as pessoas com `access: 'active'`.

- [ ] **Passo 7: Rebuild e verificação visual**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run build
```
Expected: sem erros. Abrir `preview/module-2-equipas-react.html`: papéis mostram só "Gestora"/"Colaborador(a)", valores em "€/limpeza", ausências sem opção de aprovar/recusar, nova colaboradora fica ativa de imediato, e existe uma ausência "Não comunicada" na lista.

---

### Task 3: Clientes — "Quarto", fornecimento por cliente, iCal

**Files:**
- Modify: `alclean/app/src/modules/clientes/appConfigs.ts`
- Modify: `alclean/app/src/modules/clientes/types.ts`
- Modify: `alclean/app/src/modules/clientes/rules.ts`
- Modify: `alclean/app/src/modules/clientes/useClientsModule.ts`
- Modify: `alclean/app/src/modules/clientes/format.ts`
- Modify: `alclean/app/src/modules/clientes/components/ConfigTab.tsx`
- Modify: `alclean/app/src/modules/clientes/components/LaundryTab.tsx`
- Modify: `alclean/app/src/modules/clientes/components/ClientDrawer.tsx`
- Modify: `alclean/app/src/modules/clientes/components/UnitsTab.tsx`
- Modify: `alclean/app/src/modules/clientes/mockData.ts`

**Interfaces:**
- Consumes: nenhuma.
- Produces: `Client.laundryEnabled: boolean` + `Client.laundrySetup: LaundryQty` (novo, substitui os campos equivalentes em `ServiceLocation`), usados por Execução (Task 5) como referência narrativa (não há import real entre módulos nesta app — ver nota na Task 5).

- [ ] **Passo 1: Podar `formacao`/`manutencao`/`nucleo` e renomear "Unidade" para "Quarto" em `appConfigs.ts`**

`appConfigs.ts` tem 4 configurações (`limpezas`/`formacao`/`manutencao`/`nucleo`) em `APP_CONFIGS` — remover as 3 que não são `limpezas`, deixando só essa. No config `limpezas` (linha ~13), substituir:
```ts
unit: { singular: 'Unidade', plural: 'Unidades', gender: 'f', hint: 'Apartamento ou quarto', types: ['Apartamento', 'Quarto', 'Estúdio'], capacityLabel: 'Hóspedes' },
```
por:
```ts
unit: { singular: 'Quarto', plural: 'Quartos', gender: 'm', hint: 'Divisão dentro do alojamento', types: ['Quarto', 'Estúdio', 'Suite'], capacityLabel: 'Hóspedes' },
```
`gender: 'm'` é essencial — `newLabel`/`ofThe`/`inThis` (linhas ~72-87) ramificam por ele para gerar "Novo quarto"/"do quarto"/"no quarto" corretamente em vez de "Nova unidade"/"da unidade". Não é preciso tocar em mais nenhum ficheiro — os ~40 pontos de render já leem `config.unit.*`.

- [ ] **Passo 2: Mover `laundryEnabled`/`laundrySetup` de `ServiceLocation` para `Client`**

Em `types.ts`, remover de `ServiceLocation` (~linha 140-163):
```ts
laundryEnabled: boolean;
laundrySetup: LaundryQty;
```
e acrescentar ao `Client` (~linha 81-98), a seguir a `notes`:
```ts
/** Fornecimento aplica-se a todos os alojamentos deste cliente, não por alojamento individual. */
laundryEnabled: boolean;
laundrySetup: LaundryQty;
```
Fazer o mesmo em `ClientInput` (~179-190): acrescentar os dois campos; e remover de `LocationInput`/onde estivessem em qualquer input de alojamento, se existirem aí (o relatório de investigação confirmou que o formulário rápido de alojamento — `LocationInput`, ~192-207 — já não os tinha, por isso este passo é só no `Client`/`ClientInput`).

- [ ] **Passo 3: Atualizar `rules.ts` — `applyToSelectedUnits` lê do cliente**

A função (linhas ~101-117) hoje lê `location.laundryEnabled`/`location.laundrySetup`. Mudar a assinatura para receber o cliente e ler dele:
```ts
export function applyToSelectedUnits(client: Client, location: ServiceLocation, selectedUnitIds: string[]): ServiceLocation {
  return {
    ...location,
    units: location.units.map((u) =>
      selectedUnitIds.includes(u.id)
        ? { ...u, laundry: client.laundryEnabled ? { ...client.laundrySetup } : null }
        : u,
    ),
  };
}
```
(ajustar ao corpo exato já existente, preservando o resto da lógica de propagação — só a origem de `laundryEnabled`/`laundrySetup` muda de `location.*` para `client.*`, e a função ganha um parâmetro `client` novo). Atualizar a chamada desta função em `UnitsTab.tsx`/`BulkApplyDialog` (linha ~218) para passar o cliente em vez de o location.

- [ ] **Passo 4: Mover a UI de edição de lavandaria para o `ClientDrawer`**

Remover de `ConfigTab.tsx` (linhas ~172-211) o bloco de toggle + steppers de lavandaria que hoje edita `draft.laundryEnabled`/`draft.laundrySetup` (o draft do alojamento). Acrescentar um separador ou secção equivalente em `ClientDrawer.tsx`, editando `client.laundryEnabled`/`client.laundrySetup` diretamente (mesmo padrão de toggle + steppers, só a origem dos dados muda). Atualizar `LaundryTab.tsx` (linhas ~19,23,36-57) para ler `client.laundryEnabled`/`client.laundrySetup` em vez de `draft.laundryEnabled`/`draft.laundrySetup` — este separador deixa de fazer sentido dentro do alojamento e deve mostrar antes uma nota "Definido ao nível do cliente — ver ficha do cliente" com um atalho para lá.

- [ ] **Passo 5: Restringir plataformas de iCal a Airbnb e Booking.com**

Em `types.ts`:
```ts
export type CalendarPlatform = 'Airbnb' | 'Booking.com' | 'Outro';
```
Em `format.ts`:
```ts
export const CALENDAR_PLATFORMS: CalendarPlatform[] = ['Airbnb', 'Booking.com', 'Outro'];
```
(remove `'Vrbo'` de ambos; `'Outro'` fica como recurso residual, já que o `add()` do `CalendarEditor.tsx` já trata `'Outro'` como fallback final quando as outras opções estão todas em uso.)

- [ ] **Passo 6: Substituir `mockData.ts` pelos dados da ALClean**

Reescrever `createDemoData()` com os 4 clientes já usados nos mockups aprovados: "Apartamentos Baixa-Chiado" (3 alojamentos: Apto. Baixa 2ºD com 2 quartos, Apto. Chiado Loft com 1 quarto, Apto. Baixa 4ºE com 3 quartos — `laundryEnabled: true` no cliente), "Villa Mar Cascais" (1 alojamento, 2 quartos, `laundryEnabled: true`), "Residencial Setúbal" (2 alojamentos, `laundryEnabled: false` — cliente fornece os seus produtos), "João Teixeira (particular)" (1 alojamento, `laundryEnabled: false`). Calendários iCal Airbnb/Booking.com nos alojamentos do primeiro cliente.

- [ ] **Passo 7: Rebuild e verificação visual**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run build
```
Expected: sem erros. Abrir `preview/module-3-clientes-react.html`: "Quarto"/"Quartos" em todo o lado (nunca "Unidade"), a ficha de "Apartamentos Baixa-Chiado" tem o toggle de lavandaria ao nível do cliente, e o separador de lavandaria dentro de cada alojamento mostra a nota a apontar para a ficha do cliente.

---

### Task 4: Planeamento — poda e dados de exemplo (sem alterações de regras)

**Files:**
- Modify: `alclean/app/src/modules/planeamento/config.ts`
- Modify: `alclean/app/src/modules/planeamento/mockData.ts`

**Interfaces:**
- Consumes: nenhuma.
- Produces: nenhuma nova (o `isHighPriority`/`PriorityDot`/`WindowAlert` já validados continuam exatamente como estão).

- [ ] **Passo 1: Podar `formacao`/`manutencao` de `PLANNING_CONFIGS`**

Em `config.ts`, remover as entradas `formacao:` e `manutencao:` de `PLANNING_CONFIGS`, deixando só `limpezas:`. Não tocar no tipo `PlanningAppKey` nem em mais nada — os componentes continuam a resolver `PLANNING_CONFIGS['limpezas']` por omissão, só deixam de ter as outras duas opções disponíveis.

- [ ] **Passo 2: Substituir `mockData.ts` pelos dados da ALClean**

Reescrever `DEMO_TEAMS` (`Equipa Alfa`/`Equipa Beta`, ids `alfa`/`beta`), `DEMO_PEOPLE` (Sofia Martins, Rui Cabral, Inês Ferreira, Beatriz Teles — ids consistentes com os usados na Task 2), e `UNITS` com os alojamentos já usados nos outros módulos (Apto. Baixa 2ºD, Villa Mar Cascais, Apto. Chiado Loft, Residencial Setúbal A/B, Apto. Baixa 4ºE), mantendo a mesma forma de `createDemoPlanning()` — incluindo pelo menos duas limpezas com `checkin: true` no dia de referência, para que a bolinha vermelha de prioridade alta (já validada no mockup) apareça na demonstração.

- [ ] **Passo 3: Rebuild e verificação visual**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run build
```
Expected: sem erros. Abrir `preview/module-4-planeamento-react.html`: nomes/alojamentos da ALClean, e pelo menos uma limpeza do dia de referência com a bolinha vermelha de prioridade alta visível no cartão.

---

### Task 5: Execução — segurança de acesso, preparação condicional, inventário de roupa

**Files:**
- Modify: `alclean/app/src/modules/execucao/config.ts`
- Modify: `alclean/app/src/modules/execucao/types.ts`
- Modify: `alclean/app/src/modules/execucao/components/JobScreens.tsx`
- Modify: `alclean/app/src/modules/execucao/mockData.ts`

**Interfaces:**
- Consumes: nomes de clientes/alojamentos e a configuração de fornecimento (Task 3) — sem import real entre módulos nesta app (cada módulo tem dados mock autocontidos, confirmado pela investigação); os valores em `mockData.ts` desta task são escolhidos manualmente para bater certo com os da Task 3.
- Produces: `ExecJob.suppliesOwnProducts: boolean`, `ExecJob.laundryCollectionActive: boolean` (novos campos, consumidos só dentro deste módulo).

- [ ] **Passo 1: Podar `formacao`/`manutencao`, remover "Verificar códigos ou chaves" e renomear "Roupa para lavandaria"**

Em `config.ts`, remover as entradas `formacao:`/`manutencao:` de `EXEC_CONFIGS`, deixando só `limpezas:`. Nessa entrada, o `prep` (linha ~9) passa de:
```ts
prep: ['Confirmar acesso ao alojamento', 'Verificar códigos ou chaves', 'Levar material de limpeza', 'Levar sacos de roupa para lavandaria', 'Rever notas da gestora'],
```
para (só os dois itens sempre presentes — os condicionais saem daqui, ver Passo 3):
```ts
prep: ['Confirmar acesso ao alojamento', 'Rever notas da gestora'],
```
E acrescentar logo a seguir, no mesmo objeto de config:
```ts
condPrep: {
  material: 'Levar material de limpeza',
  lavandaria: 'Levar sacos de roupa para lavandaria',
},
```
Renomear o título das quantidades:
```ts
quantities: {
  title: 'Inventário da roupa a lavar',
  note: 'Confere sempre as quantidades recolhidas — ajuda a detetar material em falta, mesmo sem recolha para lavandaria ativa.',
  items: [ /* mantém os 5 items existentes (lencol, capa, fronha, tbanho, trosto) sem alteração */ ],
},
```

- [ ] **Passo 2: Acrescentar os dois campos novos a `ExecJob` e ao tipo de config**

Em `types.ts`, acrescentar a `ExecJob` (perto de `managerNote`):
```ts
/** Se o cliente não fornece produtos de limpeza, a colaboradora tem de os levar. */
suppliesOwnProducts: boolean;
/** Se este alojamento tem a recolha para lavandaria ativa. */
laundryCollectionActive: boolean;
```
E a `ExecConfig`:
```ts
condPrep: { material: string; lavandaria: string };
```

- [ ] **Passo 3: Compor a lista de preparação final em `JobScreens.tsx`**

Nos três locais que hoje passam `config.prep` diretamente para `CheckList`/leem os rótulos de preparação (`JobDetail`, `RunScreen` — os mesmos sítios que já usam `config.quantities.title`), substituir a leitura direta de `config.prep` por uma lista calculada por trabalho:
```tsx
const prepLabels = [
  ...config.prep,
  ...(job.suppliesOwnProducts ? [] : [config.condPrep.material]),
  ...(job.laundryCollectionActive ? [config.condPrep.lavandaria] : []),
];
```
e passar `prepLabels` (em vez de `config.prep`) a `<CheckList list="prep" labels={prepLabels} .../>` e a `countDone(job.prep)`/`${prepLabels.length}` no `SectionTitle aside`. `job.prep: boolean[]` continua com o mesmo tamanho de `prepLabels` — é `mockData.ts` (Passo 4) que garante isso ao criar cada trabalho.

- [ ] **Passo 4: Substituir `mockData.ts` pelos dados da ALClean**

Reescrever `PLACES` com os alojamentos da ALClean (Apto. Baixa 2ºD, Villa Mar Cascais, Apto. Chiado Loft, Residencial Setúbal A, Apto. Baixa 4ºE — nomes coerentes com a Task 3), cada um com `suppliesOwnProducts`/`laundryCollectionActive` a bater certo com o `laundryEnabled` do respetivo cliente na Task 3 (ex.: alojamentos de "Apartamentos Baixa-Chiado" → `suppliesOwnProducts: false, laundryCollectionActive: true`; alojamentos de "Residencial Setúbal"/"João Teixeira" → `suppliesOwnProducts: true, laundryCollectionActive: false`). **Todos os `qty`/`plannedQty` passam a ter um valor real (nunca `null`)** — o inventário da roupa fica sempre visível, mesmo nos alojamentos sem recolha para lavandaria ativa (é um registo de quantidades recolhidas, não uma opção do cliente). `makeJob` cria `prep: boolean[]` do tamanho de `config.prep.length + (suppliesOwnProducts?0:1) + (laundryCollectionActive?1:0)`, todos `false` (ou `true` para trabalhos `done`). Colaboradora "Sofia Martins" (não "Dora Martins"), gestora "Carla Mendes" (não "Sofia Ramos" — alinhar com o nome já usado em Aprovações/Rendimentos/Mensagens).

- [ ] **Passo 5: Rebuild e verificação visual**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run build
```
Expected: sem erros. Abrir `preview/module-5-execucao-react.html`: nenhum passo de preparação menciona código/chave; num alojamento cujo cliente fornece produtos, "Levar material de limpeza" não aparece na checklist; a secção de quantidades chama-se "Inventário da roupa a lavar" e aparece em todos os trabalhos, mesmo nos alojamentos sem lavandaria ativa; registar uma incidência só com texto (sem foto) grava normalmente.

---

### Task 6: Aprovações — rótulo, tolerância editável

**Files:**
- Modify: `alclean/app/src/modules/aprovacoes/config.ts`
- Modify: `alclean/app/src/modules/aprovacoes/types.ts`
- Modify: `alclean/app/src/modules/aprovacoes/rules.ts`
- Modify: `alclean/app/src/modules/aprovacoes/ApprovalsModule.tsx`
- Modify: `alclean/app/src/modules/aprovacoes/components/context.tsx`
- Modify: `alclean/app/src/modules/aprovacoes/components/Screens.tsx`
- Modify: `alclean/app/src/modules/aprovacoes/components/RecordDrawer.tsx`
- Modify: `alclean/app/src/modules/aprovacoes/mockData.ts`

**Interfaces:**
- Consumes: nenhuma.
- Produces: `ApprovalsContextValue.durationTolerance: number` + `ApprovalsContextValue.setDurationTolerance: (min: number) => void`, guardado em `localStorage` (`appos.aprovacoes.tolerancia.v1`).

- [ ] **Passo 1: Podar `formacao`/`manutencao` e renomear `qty.label`**

Em `config.ts`, remover as entradas `formacao:`/`manutencao:` de `APPROVALS_CONFIGS`, deixando só `limpezas:`. Nessa entrada, mudar:
```ts
qty: { label: 'Roupa em falta', item: ['peça', 'peças'], none: 'Nenhuma', missingOnly: true },
```
para:
```ts
qty: { label: 'Inventário de Roupa', item: ['peça', 'peças'], none: 'Nenhuma', missingOnly: true },
```
(os 3 pontos de leitura — `rules.ts:20`, `Screens.tsx:68`, `RecordDrawer.tsx:118` — herdam o novo rótulo automaticamente, sem mais edições.)

- [ ] **Passo 2: Tornar `DURATION_TOLERANCE` um estado editável**

Remover a constante fixa de `config.ts`:
```ts
export const DURATION_TOLERANCE = 30;
```
(fica só como valor por omissão, ver Passo 3). Em `rules.ts`, mudar `overrun`/`durationExceeded` para receberem a tolerância como parâmetro em vez de a importarem:
```ts
export const overrun = (r: WorkRecord): number => Math.max(0, minutesBetween(r.started, r.finished) - r.plannedMin);
export const durationExceeded = (r: WorkRecord, toleranceMin: number): boolean => overrun(r) > toleranceMin;
```
E `occurrences` (que já recebe `config: ApprovalsConfig`) passa a receber também a tolerância:
```ts
export function occurrences(r: WorkRecord, config: ApprovalsConfig, toleranceMin: number): string[] {
  const out: string[] = [];
  if (r.issues.length) out.push(r.issues.length === 1 ? 'Anomalia' : plural(r.issues.length, 'anomalia', 'anomalias'));
  if (r.late) out.push('Atraso');
  const miss = missingTasks(r);
  if (miss) out.push(plural(miss, 'tarefa em falta', 'tarefas em falta'));
  if (r.qty.length) out.push(config.qty.label);
  if (durationExceeded(r, toleranceMin)) out.push(`Duração excedida (+${overrun(r)} min)`);
  return out;
}
```

- [ ] **Passo 3: Guardar a tolerância em `localStorage`, expor via contexto**

Em `ApprovalsModule.tsx`, acrescentar um estado local:
```tsx
const [durationTolerance, setDurationToleranceState] = useState<number>(() => {
  try {
    const saved = window.localStorage.getItem('appos.aprovacoes.tolerancia.v1');
    return saved ? Number(saved) : 30;
  } catch { return 30; }
});
const setDurationTolerance = useCallback((min: number) => {
  setDurationToleranceState(min);
  try { window.localStorage.setItem('appos.aprovacoes.tolerancia.v1', String(min)); } catch { /* sem armazenamento */ }
}, []);
```
Acrescentar `durationTolerance`/`setDurationTolerance` ao objeto `ctx` (o `useMemo` que já constrói o valor do contexto, junto a `config`/`viewer`/`actions`) e ao tipo `ApprovalsContextValue` em `components/context.tsx`. Atualizar `Screens.tsx:69` para ler `const { durationTolerance } = useApprovals();` em vez de importar `DURATION_TOLERANCE`, e usar `durationTolerance` na frase já existente. Atualizar todas as chamadas a `durationExceeded(r)`/`occurrences(r, config)` em `RecordDrawer.tsx` e `RecordList.tsx` para passarem `durationTolerance` do contexto como argumento adicional.

- [ ] **Passo 4: Janela de definições para a gestora ajustar a tolerância**

Acrescentar, em `Screens.tsx` (ou num novo componente `SettingsPanel` importado por ele), um pequeno controlo com "−"/"+", visível só para `viewer.canReview`, que chama `setDurationTolerance(durationTolerance ± 5)` dentro de um intervalo razoável (mínimo 5, máximo 120), mostrando o valor atual em minutos — mesmo desenho do stepper já validado no mockup de Rendimentos/Aprovações.

- [ ] **Passo 5: Substituir `mockData.ts` pelos dados da ALClean**

Reescrever `config.places` (em `config.ts`, não em `mockData.ts` — confirmar isso antes de editar) com os alojamentos já usados (Apto. Baixa 2ºD, Villa Mar Cascais, Residencial Setúbal A, etc.), `DEMO_PEOPLE` com Sofia Martins/Rui Cabral/Inês Ferreira/Beatriz Teles, `VIEWERS.gestora.name` já é "Carla Mendes" (manter), e substituir os nomes literais "Carla Mendes" hardcoded dentro de `rec()`/eventos de auditoria em `mockData.ts` para continuarem consistentes (já estão corretos, só confirmar que não há outro nome hardcoded a escapar). `DEMO_CLIENTS` passa a `['Apartamentos Baixa-Chiado', 'Villa Mar Cascais', 'Residencial Setúbal', "João Teixeira (particular)"]`.

- [ ] **Passo 6: Rebuild e verificação visual**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run build
```
Expected: sem erros. Abrir `preview/module-6-aprovacoes-react.html`: o rótulo "Inventário de Roupa" aparece em vez de "Roupa em falta"; a tolerância de duração é editável na UI e o valor novo passa a valer para "Duração excedida" nos registos.

---

### Task 7: Mensagens — conversa direta com cliente, avisos novos

**Files:**
- Modify: `alclean/app/src/modules/mensagens/types.ts`
- Modify: `alclean/app/src/modules/mensagens/components/NoticesBoard.tsx`
- Modify: `alclean/app/src/modules/mensagens/mockData.ts`

**Interfaces:**
- Consumes: nenhuma (confirmado: mensagens não tem nenhuma ligação real a Planeamento/Clientes hoje — os avisos novos são dados de exemplo autocontidos, não uma regra computada, seguindo o padrão já 100% estático deste módulo).
- Produces: `Notice.type` com `'priority'` e `'reservation'` acrescentados.

- [ ] **Passo 1: Acrescentar os dois novos tipos de aviso**

Em `types.ts`:
```ts
export type NoticeType = 'confirm' | 'next' | 'stock' | 'laundry' | 'message' | 'priority' | 'reservation';
```
(ajustar ao nome exato do tipo, que hoje está inline em `Notice.type` — extrair para um alias `NoticeType` se ainda não existir, ou editar a união inline diretamente, mantendo os 5 valores existentes e acrescentando os 2 novos.)

- [ ] **Passo 2: Garantir que `NoticesBoard.tsx` sabe desenhar os 2 tipos novos**

Confirmar o mapeamento tipo→ícone/estilo em `NoticesBoard.tsx` (ou onde a lista de avisos escolhe o ícone por `type`) e acrescentar entradas para `'priority'` (ícone `alert`, prioridade `alta`) e `'reservation'` (ícone `calendar`, prioridade `media`), ao mesmo padrão das entradas existentes.

- [ ] **Passo 3: Substituir `mockData.ts` — elenco ALClean, conversa direta com cliente, avisos novos**

Reescrever `PEOPLE` (Carla Mendes gestora, Sofia Martins/Rui Cabral/Inês Ferreira/Beatriz Teles colaboradoras, mais um contacto de cliente "Sr. Costa" de Villa Mar Cascais), `CLIENTS`, `JOBS` com os alojamentos já usados nos outros módulos.

Acrescentar às conversas uma conversa de tipo `'cliente'` cujos `participants` incluam **a colaboradora** (não só a gestora) — ex.: conversa com "Villa Mar Cascais" tendo `participants: ['sofia', 'sr-costa']` — isto é o suficiente para a colaboradora falar diretamente com o cliente: `visibleConversations` já mostra a um não-gestora qualquer conversa onde ela conste em `participants`, sem precisar de nenhuma alteração de código.

Acrescentar aos avisos (`notices`):
```ts
{ id: 'n7', type: 'next', priority: 'baixa', audience: 'colab', icon: 'clock', title: 'Próximo trabalho a caminho', text: 'Apto. Chiado Loft às 16:00.', at: /* hora coerente com DEMO_TODAY */, read: false, dismissed: false, action: 'Ver', target: 'planeamento', requires: undefined },
{ id: 'n8', type: 'priority', priority: 'alta', audience: 'todos', icon: 'alert', title: 'Virada rápida hoje', text: 'Apto. Baixa 2ºD — saída 11:00, entrada 15:00.', at: /* ... */, read: false, dismissed: false, action: 'Ver', target: 'planeamento', requires: undefined },
{ id: 'n9', type: 'reservation', priority: 'media', icon: 'calendar', title: 'Nova reserva via iCal', text: 'Villa Mar Cascais — check-in sex., ainda esta semana.', at: /* ... */, read: false, dismissed: false, action: 'Ver', target: 'clientes', requires: undefined },
```
(ajustar campos exatos ao formato real de `Notice` confirmado no Passo 1 — `audience`/`requires` seguem o mesmo padrão dos avisos já existentes.) Acrescentar um comentário acima destes três registos:
```ts
// "Nova reserva via iCal" só se justifica quando a reserva cai na semana em curso —
// isto é mantido por quem edita os dados de exemplo, não computado em runtime
// (este módulo não tem nenhum motor de regras para avisos, é tudo dados estáticos).
```

- [ ] **Passo 4: Rebuild e verificação visual**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run build
```
Expected: sem erros. Abrir `preview/module-10-mensagens-react.html`: a colaboradora Sofia Martins consegue ver e responder à conversa com Villa Mar Cascais; os 3 avisos novos aparecem na lista de Avisos com o ícone/prioridade certos.

---

### Task 8: Rendimentos — ciclo, prazo, custo por limpeza, limiares editáveis

**Files:**
- Modify: `alclean/app/src/modules/rendimentos/config.ts`
- Modify: `alclean/app/src/modules/rendimentos/types.ts`
- Modify: `alclean/app/src/modules/rendimentos/rules.ts`
- Modify: `alclean/app/src/modules/rendimentos/RevenueModule.tsx`
- Modify: `alclean/app/src/modules/rendimentos/components/context.tsx`
- Modify: `alclean/app/src/modules/rendimentos/components/Overview.tsx`
- Modify: `alclean/app/src/modules/rendimentos/components/TeamScreen.tsx`
- Modify: `alclean/app/src/modules/rendimentos/mockData.ts`

**Interfaces:**
- Consumes: nenhuma.
- Produces: `RevenueContextValue.healthLimits`/`setHealthLimits`, `RevenueContextValue.travelIncluded`/`setTravelIncluded`, ambos guardados em `localStorage`.

- [ ] **Passo 1: Podar `formacao`/`manutencao`**

Em `config.ts`, remover as entradas `formacao:`/`manutencao:` de `REVENUE_CONFIGS`, deixando só `limpezas:`.

- [ ] **Passo 2: Renomear `TeamMember.rate` para `perJobRate`; reescrever `teamMonth`**

Em `types.ts`, `TeamMember.rate: number` (€/hora) passa a `perJobRate: number` (€/limpeza) — mesmo tipo, novo nome/comentário. Em `rules.ts`, reescrever `teamMonth` para repartir **trabalhos**, não horas, e para respeitar o novo interruptor de deslocações:
```ts
export function teamMonth(data: RevenueData, mk: string, travelIncluded: boolean) {
  const billedHours = data.clients.reduce((s, c) => s + c.units.reduce((t, u) => t + unitMonth(c, u, mk).hours, 0), 0);
  const totalJobs = Math.round(billedHours / AVG_JOB_HOURS);
  const execJobs = Math.round(totalJobs * execRatio(mk));
  let left = execJobs;
  const rows = data.team.map((person, i) => {
    const jobs = i === data.team.length - 1 ? left : Math.round(execJobs * person.share);
    left -= jobs;
    const travel = travelIncluded ? Math.round(person.travel * season(mk)) : 0;
    const base = jobs * person.perJobRate;
    return { person, jobs, base, travel, total: base + travel };
  });
  const base = rows.reduce((s, r) => s + r.base, 0);
  const travel = rows.reduce((s, r) => s + r.travel, 0);
  return { billedHours, billedJobs: execJobs, rows, base, travel, total: base + travel };
}
```
(preservar qualquer campo adicional que a função original já devolvesse além dos aqui mostrados — o relatório de investigação confirmou exatamente esta forma de base, só ajustar `hours`→`jobs` e acrescentar o parâmetro `travelIncluded`.) Atualizar `clientStats` (linhas ~101-123) para repartir o custo de equipa pelos trabalhos do cliente (`perJob = team.total / team.billedJobs`) em vez de pelas horas (`perHour = team.total / team.billedHours`).

- [ ] **Passo 3: Tornar `HEALTH_LIMITS` e o interruptor de deslocações editáveis**

Remover `HEALTH_LIMITS` como constante fixa de `config.ts` (fica só como valor por omissão). Em `RevenueModule.tsx`, seguir exatamente o padrão do Passo 3 da Task 6 (Aprovações): estado local inicializado de `localStorage` (`appos.rendimentos.limiares.v1` para os limiares, `appos.rendimentos.deslocacoes.v1` para o boolean de deslocações), setters que persistem, ambos expostos via `RevenueContextValue`/`useMemo` do contexto. Atualizar `rules.ts`'s `financialHealth`/`clientHealth` para receberem os limiares como parâmetro em vez de importarem a constante. Atualizar `Overview.tsx`'s `HealthCard` para ler os limiares do contexto (`useRevenue()`) em vez de importar `HEALTH_LIMITS` diretamente. Atualizar `TeamScreen.tsx` para ler `travelIncluded` do contexto e mostrar/editar o interruptor "Só valor por limpeza" / "+ deslocações". Procurar **todas** as chamadas a `teamMonth(...)` no módulo (grep por `teamMonth(` em `components/` e `rules.ts`, incluindo `Overview.tsx`/`ClientScreens.tsx` se também a chamarem) e acrescentar `travelIncluded` (do contexto) como terceiro argumento em cada uma.

- [ ] **Passo 4: Ocultar o custo de produtos (Inventário inativo)**

Em `mockData.ts`, garantir que **nenhum** cliente ALClean tem `supply: 'included'` (usar o valor alternativo do tipo, ex. `'client'` ou `'excluded'` — confirmar o nome exato em `types.ts` antes de escrever) — com isso, `unitMonth`'s `products: included ? jobs * PRODUCT_COST : 0` fica sempre `0` para todos os clientes, sem precisar de tocar nos ficheiros de UI que mostram a métrica de produtos (ela continua a existir no código, só nunca tem valor a mostrar). Não editar `Overview.tsx`/`ClientScreens.tsx`/`TeamScreen.tsx` para esconder a métrica — deixar de a povoar nos dados é suficiente e mais simples.

- [ ] **Passo 5: Substituir `mockData.ts` pelos dados da ALClean**

Reescrever `CLIENTS` com os 4 clientes já usados (Apartamentos Baixa-Chiado, Villa Mar Cascais, Residencial Setúbal, João Teixeira), todos com `cycle: 'custom'` (quinzenal) e `terms: 0` (à vista), `supply` nunca `'included'` (Passo 4). `team` com Sofia Martins/Rui Cabral/Inês Ferreira/Beatriz Teles, `perJobRate` entre 9 e 11 €, `share` a somar 1 entre os 3-4 elementos.

- [ ] **Passo 6: Rebuild e verificação visual**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run build
```
Expected: sem erros. Abrir `preview/module-7-rendimentos-react.html`: ciclo "Personalizado · quinzenal" e prazo "0 dias"/"à vista" nos 4 clientes; o custo de equipa mostra-se em €/limpeza, com o interruptor de deslocações a funcionar; os limiares de saúde financeira são editáveis; a métrica de produtos aparece sempre a zero/nenhuma.

---

### Task 9: Marca, navegação e verificação final integrada

**Files:**
- Modify: `alclean/app/preview/index.html`
- Modify: `alclean/app/preview/module-*-react.html` (7 ficheiros — só o `<title>`)
- Modify: `alclean/app/src/modules/shared/ui/AppTopBar.tsx` (só a cor do chip, se hardcoded)

**Interfaces:**
- Consumes: os 7 módulos já personalizados (Tasks 2–8).
- Produces: nenhuma nova — esta task é só acabamento visual e verificação de conjunto.

- [ ] **Passo 1: Atualizar `preview/index.html`**

Substituir `<title>AppOS · Limpezas — Fase 1</title>` por `<title>ALClean</title>`; `<div class="logo">L</div><b>AppOS · Limpezas</b>` por `<div class="logo">AL</div><b>ALClean</b>`; a variável CSS `--g:#17643e` (verde do template) por `--g:#0D9488` (verde-água da ALClean) — isto recolore a barra de topo e os botões "Abrir" desta página de índice. Remover o cartão do módulo 9 (Serviços ligados) e ajustar a lista de opcionais para só mostrar Rendimentos (ativo) e Inventário (desativado, mas presente).

- [ ] **Passo 2: Atualizar o `<title>` das 7 páginas React**

Em cada `preview/module-*-react.html`, mudar `<title>X · AppOS (React)</title>` para `<title>X · ALClean</title>` (mantendo o nome do módulo, só trocando "AppOS" por "ALClean").

- [ ] **Passo 3: Recolorir o chip "✦ {appLabel}" do `AppTopBar`**

Em `AppTopBar.tsx`, o botão do chip usa `bg-[#17643e]`/`hover:bg-[#0f4f30]` (linha ~76) e a aba ativa usa `border-[#17643e]`/`text-[#17643e]` (linha ~62) — substituir os 3 hex por `#0D9488`/`#0b7a70` (hover mais escuro), a cor primária da ALClean. Isto é partilhado por todos os módulos, por isso um único ficheiro recolore a app inteira de uma vez.

- [ ] **Passo 4: Rebuild final**

```bash
cd "/Users/paulorsalgado/Documents/2. Sandbox/alclean/app" && npm run build
```
Expected: sem erros.

- [ ] **Passo 5: Verificação final integrada — percorrer os 7 módulos contra `alclean/modulos/*.md`**

Abrir `alclean/app/preview/index.html` e, para cada módulo, confirmar contra o ficheiro `alclean/modulos/<nome>.md` correspondente (o mesmo conteúdo já aprovado nos Artifacts):
- **Equipas**: só "Gestora"/"Colaborador(a)", valores em €/limpeza, sem aprovação formal de ausências, nova colaboradora ativa de imediato.
- **Clientes**: "Quarto" em vez de "Unidade", fornecimento por cliente (não por alojamento).
- **Planeamento**: bolinha vermelha de prioridade alta numa virada rápida do dia de referência.
- **Execução**: sem código/chave na preparação; material/lavandaria condicionais; "Inventário da roupa a lavar" sempre visível.
- **Aprovações**: "Inventário de Roupa"; tolerância de duração editável.
- **Mensagens**: colaboradora a conversar com um cliente; os 3 avisos novos visíveis.
- **Rendimentos**: ciclo quinzenal, prazo à vista, custo por limpeza com deslocações opcionais, limiares editáveis, produtos sempre a zero.

Expected: todos os 7 pontos confirmados visualmente, sem erros na consola do browser em nenhum módulo. Isto fecha a implementação do fork da ALClean.
