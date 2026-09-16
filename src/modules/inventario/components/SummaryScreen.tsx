import type { ReactNode } from 'react';
import { Button, cx, Icon, type IconName } from '../../shared/ui';
import { OWNER_LABEL } from '../config';
import { eur2, fmtShort, group, isoAdd, pct, plural, qtyUnit } from '../format';
import { clientById, isOpenOrder, locationName, openOrderFor, openRequests, operationalCost, orderTotal, productById, stateOf, stockAt, stockValue } from '../rules';
import type { Product, RestockRequest } from '../types';
import { useInventoryUi } from './context';
import { alertSort, categoryOptions, clientLines, clientOptions, locationOptions, matchProduct } from './helpers';
import {
  Banner, card, EmptyState, FilterSelect, IconAction, LinkButton, MobileCard, Note, OrderPill, OwnerPill, PageHeader, Panel, ProductGlyph, SectionTabs, td, th,
} from './parts';

function Kpi({ tone, icon, label, value, children, onClick }: { tone: 'plain' | 'client' | 'bad' | 'warn'; icon: IconName; label: string; value: string; children: ReactNode; onClick: () => void }) {
  const tones = {
    plain: 'text-[#17643e]',
    client: 'text-[#3b82d6]',
    bad: 'text-[#d92d20]',
    warn: 'text-[#d98a06]',
  };
  return (
    <button type="button" onClick={onClick}
      className={cx(card, 'flex min-w-0 flex-col gap-2 px-3 py-3.5 text-left hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e] sm:flex-row sm:gap-3.5 sm:px-[18px] sm:py-[18px]',
        tone === 'bad' && '!border-[#f7dcd8] !bg-[#fff8f7]', tone === 'warn' && '!border-[#f5e7c2] !bg-[#fffbf1]')}>
      <Icon name={icon} className={cx('h-6 w-6 sm:h-[26px] sm:w-[26px]', tones[tone])} />
      <span className="min-w-0">
        <small className="block text-[13.5px] font-semibold text-slate-900">{label}</small>
        <b className="mt-1.5 block whitespace-nowrap text-[21px] font-bold leading-tight tabular-nums tracking-tight sm:text-[26px]">{value}</b>
        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-slate-500">{children}</span>
      </span>
    </button>
  );
}

function Trend({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (!previous) return <>Sem valor no início do mês</>;
  const d = Math.round(((current - previous) / previous) * 100);
  return (
    <>
      <span className={cx('inline-flex items-center gap-0.5 font-semibold', d >= 0 ? 'text-[#17643e]' : 'text-[#b42318]')}>
        <Icon name={d >= 0 ? 'trendUp' : 'trendDown'} className="h-3.5 w-3.5" />{Math.abs(d)}%
      </span>{label}
    </>
  );
}

function Donut({ company, clients, value }: { company: number; clients: number; value: number }) {
  const total = company + clients;
  const r = 62;
  const c = 2 * Math.PI * r;
  const gap = company && clients ? 3 : 0;
  const le = total ? (company / total) * c : 0;
  const lc = total ? (clients / total) * c : 0;
  const rows: Array<[string, string, number, string]> = [
    ['Stock da empresa', '#17643e', company, `${plural(company, 'item', 'itens')} · ${eur2(value)}`],
    ['Stock dos clientes', '#5aa3e6', clients, `${plural(clients, 'item', 'itens')} · sem custo`],
  ];
  return (
    <Panel title="Stock por proprietário">
      <div className="mt-4 grid items-center justify-items-center gap-5 min-[460px]:grid-cols-[auto_minmax(0,1fr)] min-[460px]:justify-items-stretch">
        <div className="relative h-[176px] w-[176px]">
          <svg viewBox="0 0 160 160" role="img" aria-label={`Stock por proprietário: empresa ${company} itens, clientes ${clients} itens`} className="h-full w-full -rotate-90">
            <circle cx="80" cy="80" r={r} fill="none" stroke="#eef0f3" strokeWidth="26" />
            {le > 0 && <circle cx="80" cy="80" r={r} fill="none" stroke="#17643e" strokeWidth="26" strokeDasharray={`${Math.max(0, le - gap)} ${c}`}><title>Stock da empresa: {company} itens</title></circle>}
            {lc > 0 && <circle cx="80" cy="80" r={r} fill="none" stroke="#5aa3e6" strokeWidth="26" strokeDasharray={`${Math.max(0, lc - gap)} ${c}`} strokeDashoffset={-le}><title>Stock dos clientes: {clients} itens</title></circle>}
          </svg>
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <b className="text-[22px] font-bold tabular-nums tracking-tight">{group(total)}</b>
            <span className="text-[12.5px] text-slate-500">{total === 1 ? 'item' : 'itens'} em stock</span>
          </div>
        </div>
        <ul className="flex w-full flex-col gap-4">
          {rows.map(([label, color, n, sub]) => (
            <li key={label} className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-baseline gap-x-2.5 gap-y-1">
              <span aria-hidden="true" className="h-3 w-3 translate-y-px rounded-full" style={{ background: color }} />
              <b className="font-semibold">{label}</b>
              <span className="row-span-2 self-center font-semibold tabular-nums text-slate-700">{total ? pct((n / total) * 100) : '—'}</span>
              <span className="col-start-2 text-[13px] tabular-nums text-slate-500">{sub}</span>
            </li>
          ))}
        </ul>
      </div>
      <Note>O stock dos clientes não é valorizado: não é custo, compra nem ativo da empresa.</Note>
    </Panel>
  );
}

function Requests({ list }: { list: RestockRequest[] }) {
  const { data, actions, openDrawer, openDialog, notify } = useInventoryUi();
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Panel id="restock-panel" title={`Reposições pendentes (${sorted.length})`}>
      <p className="mt-0.5 text-[12.5px] text-slate-500">Sugestões da equipa e alertas de stock baixo.</p>
      {sorted.length ? (
        <ul className="mt-2">
          {sorted.map((r) => {
            const p = productById(data, r.productId)!;
            const order = p.owner === 'company' ? openOrderFor(data, p.id) : undefined;
            const where = p.owner === 'client' ? clientById(data, p.clientId)?.name : locationName(data, p.locId);
            return (
              <li key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-slate-200 py-[11px] [&+&]:border-t">
                <ProductGlyph glyph={p.glyph} />
                <div className="min-w-0">
                  <button type="button" onClick={() => openDrawer({ kind: 'product', id: p.id, tab: 'resumo' })} className="text-left font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">{p.name}</button>
                  <small className="block text-xs text-slate-500">{OWNER_LABEL[p.owner]} · {where} · {qtyUnit(p.stock, p.unit)} (mín. {p.min})</small>
                  <small className="block text-xs text-slate-500">{r.source} · {fmtShort(r.date)}{r.note ? ` · “${r.note}”` : ''}</small>
                </div>
                <div className="col-start-2 flex flex-wrap items-center gap-1.5">
                  {p.owner === 'client'
                    ? <Button size="sm" className="!border-[#17643e] !text-[#17643e]" onClick={() => openDialog({ kind: 'stock', stock: 'entrada', id: p.id })}>Registar reposição</Button>
                    : order
                      ? <button type="button" onClick={() => openDrawer({ kind: 'order', id: order.id })} aria-label={`Ver encomenda ${order.id}`} className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]"><OrderPill status={order.status} /><span className="sr-only"> {order.id}</span></button>
                      : <Button size="sm" className="!border-[#17643e] !text-[#17643e]" onClick={() => openDialog({ kind: 'order', productId: p.id, qty: r.qty })}>Criar encomenda</Button>}
                  {order && <span className="text-xs font-medium text-slate-500">{order.id}</span>}
                  <IconAction icon="x" label={`Dispensar reposição de ${p.name}`} onClick={() => { actions.dismissRequest(r.id); notify(`Reposição dispensada: ${p.name}.`); }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : <EmptyState title="Sem reposições pendentes">Os alertas de stock baixo e as sugestões da equipa aparecem aqui.</EmptyState>}
    </Panel>
  );
}

function LowStockTable({ list, total }: { list: Product[]; total: number }) {
  const { data, openDrawer, openDialog } = useInventoryUi();
  const actionsFor = (p: Product) => ({
    view: () => openDrawer({ kind: 'product', id: p.id, tab: 'resumo' }),
    restock: () => openDialog({ kind: 'stock', stock: 'entrada', id: p.id }),
    adjust: () => openDialog({ kind: 'stock', stock: 'ajuste', id: p.id }),
  });
  return (
    <>
      <div className="relative mt-2.5 hidden overflow-x-auto min-[860px]:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">Produtos com stock baixo</caption>
          <thead><tr>{['Produto', 'Proprietário', 'Cliente', 'Localização'].map((h) => <th key={h} scope="col" className={cx(th, 'bg-transparent')}>{h}</th>)}<th scope="col" className={cx(th, 'bg-transparent text-right')}>Stock atual</th><th scope="col" className={cx(th, 'bg-transparent text-right')}>Stock mínimo</th><th scope="col" className={cx(th, 'bg-transparent text-right')}>Ação</th></tr></thead>
          <tbody>
            {list.map((p) => {
              const a = actionsFor(p);
              return (
                <tr key={p.id}>
                  <td className={td}><span className="flex items-center gap-2.5"><ProductGlyph glyph={p.glyph} /><b className="font-semibold">{p.name}</b></span></td>
                  <td className={td}><OwnerPill owner={p.owner} /></td>
                  <td className={td}>{clientLines(data, p)?.client ?? <span className="text-slate-400">—</span>}</td>
                  <td className={td}>{locationName(data, p.locId)}</td>
                  <td className={cx(td, 'text-right font-bold tabular-nums text-[#b42318]')}>{group(p.stock)}</td>
                  <td className={cx(td, 'text-right tabular-nums')}>{group(p.min)}</td>
                  <td className={td}>
                    <span className="flex justify-end gap-1.5">
                      <Button size="sm" variant="primary" onClick={a.view}>Ver produto</Button>
                      <IconAction icon="download" label={`Registar reposição de ${p.name}`} onClick={a.restock} />
                      <IconAction icon="gear" label={`Registar ajuste de ${p.name}`} onClick={a.adjust} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2.5 flex flex-col gap-2.5 min-[860px]:hidden">
        {list.map((p) => {
          const a = actionsFor(p);
          return (
            <MobileCard key={p.id} lead={<ProductGlyph glyph={p.glyph} />} title={p.name} subtitle={locationName(data, p.locId)} badge={<OwnerPill owner={p.owner} />}
              facts={[['Stock atual', <span className="text-[#b42318]">{qtyUnit(p.stock, p.unit)}</span>], ['Stock mínimo', qtyUnit(p.min, p.unit)], ...(p.owner === 'client' ? [['Cliente', clientLines(data, p)!.client] as [string, string]] : [])]}
              actions={<><Button variant="primary" onClick={a.view}>Ver produto</Button><Button onClick={a.restock}>Registar reposição</Button><Button onClick={a.adjust}>Registar ajuste</Button></>} />
          );
        })}
      </div>
      {total > list.length && <Note>A mostrar {list.length} de {total}. Os produtos sem stock aparecem primeiro.</Note>}
    </>
  );
}

export function SummaryScreen() {
  const { data, today, now, withRevenue, summary: [f, setF], products: [, setProductFilters], go, notify } = useInventoryUi();
  const base = data.products.filter((p) => matchProduct(data, p, { loc: f.loc, owner: f.owner, client: f.client, cat: f.cat }));
  const company = base.filter((p) => p.owner === 'company');
  const clients = base.filter((p) => p.owner === 'client');
  const monthStart = `${today.slice(0, 8)}01T00:00`;
  const weekAgo = `${isoAdd(today, -7)}T${now}`;
  const value = company.reduce((s, p) => s + stockValue(p), 0);
  const valuePrev = company.reduce((s, p) => s + Math.max(0, stockAt(data, p, monthStart)) * p.cost, 0);
  const items = clients.reduce((s, p) => s + Math.max(0, p.stock), 0);
  const itemsPrev = clients.reduce((s, p) => s + Math.max(0, stockAt(data, p, monthStart)), 0);
  const alerts = base.filter((p) => stateOf(p) !== 'ok');
  const alertsPrev = base.filter((p) => { const s = stockAt(data, p, weekAgo); return s <= 0 || s < p.min; }).length;
  const requests = openRequests(data).filter((r) => base.some((p) => p.id === r.productId));
  const ordersValue = data.orders.filter((o) => isOpenOrder(o) && o.status !== 'draft').reduce((s, o) => s + orderTotal(o), 0);
  const low = alerts.filter((p) => !f.state || stateOf(p) === f.state).sort(alertSort);
  const diff = alerts.length - alertsPrev;
  const set = (patch: Partial<typeof f>) => setF({ ...f, ...patch });
  const hasFilters = Boolean(f.loc || f.owner || f.client || f.cat || f.state);

  const seeProducts = (patch: Partial<Parameters<typeof setProductFilters>[0]>) => {
    setProductFilters({ q: '', owner: f.owner, client: f.client, stay: '', loc: f.loc, cat: f.cat, state: '', ...patch });
    go('produtos');
  };
  const cost = operationalCost(data, `${today.slice(0, 8)}01`, today);

  return (
    <>
      <PageHeader title="Inventário" lede="Controla produtos, stock, consumos e reposições da empresa e dos clientes.">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500">
          Última atualização: hoje, {now}
          <button type="button" aria-label="Atualizar dados" onClick={() => notify(`Dados atualizados às ${now} (simulação).`)} className="grid h-[30px] w-[30px] place-items-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]"><Icon name="refresh" className="h-4 w-4" /></button>
        </span>
      </PageHeader>
      <SectionTabs />

      <div className="mt-[22px] grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
        <Kpi tone="plain" icon="building" label="Stock da empresa" value={eur2(value)} onClick={() => seeProducts({ owner: 'company' })}><Trend current={value} previous={valuePrev} label="vs. início do mês" /></Kpi>
        <Kpi tone="client" icon="users" label="Stock dos clientes" value={plural(items, 'item', 'itens')} onClick={() => seeProducts({ owner: 'client' })}><Trend current={items} previous={itemsPrev} label="vs. início do mês" /></Kpi>
        <Kpi tone="bad" icon="triangle" label="Produtos com stock baixo" value={String(alerts.length)} onClick={() => seeProducts({ state: 'alert' })}>
          {diff ? <><span className={cx('inline-flex items-center gap-0.5 font-semibold', diff > 0 ? 'text-[#b42318]' : 'text-[#17643e]')}><Icon name={diff > 0 ? 'trendUp' : 'trendDown'} className="h-3.5 w-3.5" />{Math.abs(diff)}</span>vs. semana anterior</> : 'Igual à semana anterior'}
        </Kpi>
        <Kpi tone="warn" icon="box" label="Reposições pendentes" value={String(requests.length)} onClick={() => { const el = document.getElementById('restock-panel'); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); el?.focus({ preventScroll: true }); }}>
          <span className="font-semibold text-[#a15c00]">{eur2(ordersValue)}</span>em encomendas
        </Kpi>
      </div>

      <div role="group" aria-label="Filtros do resumo" className="mt-[18px] grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
        <FilterSelect id="rf-loc" label="Localização" icon="pin" value={f.loc} onChange={(loc) => set({ loc })} options={locationOptions(data, 'Todos os locais')} />
        <FilterSelect id="rf-owner" label="Proprietário" icon="grid" value={f.owner} onChange={(owner) => set({ owner: owner as typeof f.owner })} options={[['', 'Todos os proprietários'], ['company', 'Empresa'], ['client', 'Cliente']]} />
        <FilterSelect id="rf-client" label="Cliente" icon="users" value={f.client} onChange={(client) => set({ client })} options={clientOptions(data, 'Todos os clientes')} />
        <FilterSelect id="rf-cat" label="Categoria" icon="list" value={f.cat} onChange={(cat) => set({ cat })} options={categoryOptions('Todas as categorias')} />
        <FilterSelect id="rf-state" label="Estado de stock" icon="triangle" value={f.state} onChange={(state) => set({ state: state as typeof f.state })} options={[['', 'Todos os estados de stock'], ['low', 'Stock baixo'], ['out', 'Sem stock']]} className="col-span-2 sm:col-span-1" />
      </div>
      {hasFilters && <div className="mt-2 text-right"><LinkButton onClick={() => setF({ loc: '', owner: '', client: '', cat: '', state: '' })}>Limpar filtros</LinkButton></div>}

      <Panel className="mt-3.5" title={`Produtos com stock baixo (${low.length})`} action={low.length > 0 && <LinkButton icon="arrow" onClick={() => seeProducts({ state: f.state || 'alert' })}>Ver todos ({low.length})</LinkButton>}>
        {low.length ? <LowStockTable list={low.slice(0, 6)} total={low.length} /> : <EmptyState title="Sem alertas de stock">Todos os produtos filtrados estão acima do stock mínimo.</EmptyState>}
        {withRevenue && (
          <Banner tone="green" title="Preparado para Rendimentos">
            Consumo de produtos da empresa em março: {eur2(cost.cost)} ({plural(cost.moves, 'movimento', 'movimentos')}). {plural(cost.clientMoves, 'consumo de produtos de clientes', 'consumos de produtos de clientes')}, sem custo para a empresa.
          </Banner>
        )}
      </Panel>

      <div className="mt-3.5 grid items-start gap-3.5 min-[900px]:grid-cols-2">
        <Donut company={company.reduce((s, p) => s + Math.max(0, p.stock), 0)} clients={items} value={value} />
        <Requests list={requests} />
      </div>
    </>
  );
}
