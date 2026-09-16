import type { ReactNode } from 'react';
import { Button, cx, Icon, type IconName } from '../../shared/ui';
import { ORDER_STATUS, STOCK_STATE } from '../config';
import { eur2, fmtDate, fmtDateTime, fmtShort, group, plural, qtyUnit, signed, unitLabel } from '../format';
import { clientById, itemsAt, locationById, locationName, movesOf, openOrderFor, openRequestFor, orderById, orderTotal, productById, productsAt, stateOf, stayById, stockValue, supplierById } from '../rules';
import type { Movement, Product } from '../types';
import { useInventoryUi, type DrawerState } from './context';
import { Banner, LocationIcon, Note, OrderPill, OwnerPill, ProductGlyph, SidePanel, SuppliedBadge, TonePill, UnderlineTabs } from './parts';

const USE_TYPES = ['Consumo em limpeza', 'Perda ou desperdício'];

function MoveList({ list, withCost }: { list: Movement[]; withCost: boolean }) {
  if (!list.length) return <p className="text-slate-500">Sem movimentos registados.</p>;
  return (
    <ul>
      {list.map((m) => (
        <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-slate-200 py-2.5 [&+&]:border-t">
          <span className="min-w-0">
            <b className="font-semibold">{m.type}</b>
            <small className="block text-xs text-slate-500">{fmtDateTime(m.at)} · {m.user}</small>
            {(m.job || m.note) && <small className="block text-xs text-slate-500">{[m.job, m.note].filter(Boolean).join(' · ')}</small>}
          </span>
          <span className="text-right tabular-nums">
            <b className={m.qty < 0 ? 'text-[#b42318]' : 'text-[#17643e]'}>{signed(m.qty)}</b>
            <small className="block text-xs text-slate-500">Stock: {group(m.result)}</small>
            {withCost && m.owner === 'company' && m.cost > 0 && <small className="block text-xs text-slate-500">{eur2(m.cost)}</small>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Fact({ icon, label, children, sub }: { icon: IconName; label: string; children: ReactNode; sub?: string }) {
  return (
    <li className="flex gap-3.5 py-2.5">
      <Icon name={icon} className="mt-0.5 h-[22px] w-[22px] text-slate-600" />
      <span className="min-w-0"><small className="block text-[12.5px] text-slate-500">{label}</small><b className="block font-medium">{children}</b>{sub && <small className="block text-[12.5px] text-slate-500">{sub}</small>}</span>
    </li>
  );
}

function Stat({ label, value, unit, alert }: { label: string; value: number; unit: string; alert?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3.5 py-3">
      <small className="block text-[12.5px] text-slate-500">{label}</small>
      <b className={cx('mt-1 block text-2xl font-bold tabular-nums', alert && 'text-[#b42318]')}>{group(value)} <span className="text-[15px] font-semibold text-slate-600">{unit}</span></b>
    </div>
  );
}

function Meta({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-[7px] text-[13px]">
      {items.map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium [overflow-wrap:anywhere]">{v}</dd></div>)}
    </dl>
  );
}

const sectionTitle = 'mb-1.5 mt-[22px] text-sm font-semibold';

function ProductPanel({ product: p, drawer }: { product: Product; drawer: Extract<DrawerState, { kind: 'product' }> }) {
  const { data, today, withRevenue, actions, notify, openDrawer, openDialog } = useInventoryUi();
  const moves = movesOf(data, p.id);
  const uses = moves.filter((m) => USE_TYPES.includes(m.type));
  const loc = locationById(data, p.locId);
  const st = stateOf(p);
  const request = openRequestFor(data, p.id);
  const order = p.owner === 'company' ? openOrderFor(data, p.id) : undefined;
  const month = today.slice(0, 7);
  const close = () => openDrawer(null);

  const head = (
    <>
      <div className="flex items-center gap-4">
        <ProductGlyph glyph={p.glyph} large archived={!p.active} />
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">{p.name}</h2>
          <p className="mb-1.5 mt-0.5 text-slate-500">{p.category}</p>
          <span className="flex flex-wrap gap-1.5"><SuppliedBadge owner={p.owner} />{!p.active && <TonePill tone="neutral" dot={false}>Arquivado</TonePill>}</span>
        </div>
      </div>
      <UnderlineTabs className="mt-4" label="Ficha do produto" value={drawer.tab} onChange={(tab) => openDrawer({ ...drawer, tab })}
        tabs={[['resumo', 'Resumo'], ['movimentos', 'Movimentos'], ['consumos', 'Consumos']]} />
    </>
  );

  const footer = p.active ? (
    <>
      <Button variant="primary" icon="download" className="min-h-11" onClick={() => openDialog({ kind: 'stock', stock: 'entrada', id: p.id })}>Registar entrada</Button>
      <div className="grid grid-cols-2 gap-2 [&>button]:min-h-11">
        <Button disabled={p.stock <= 0} onClick={() => openDialog({ kind: 'stock', stock: 'consumo', id: p.id })}>Registar consumo</Button>
        <Button onClick={() => openDialog({ kind: 'stock', stock: 'ajuste', id: p.id })}>Ajustar stock</Button>
        <Button disabled={p.stock <= 0} onClick={() => openDialog({ kind: 'stock', stock: 'transfer', id: p.id })}>Transferir stock</Button>
        <Button icon="edit" onClick={() => openDialog({ kind: 'product', id: p.id })}>Editar produto</Button>
      </div>
      <Button variant="ghost" icon="archive" className="!text-red-700 hover:!bg-red-50" onClick={() => { actions.setProductActive(p.id, false); notify('Produto arquivado. O histórico de movimentos mantém-se.'); }}>Arquivar produto</Button>
    </>
  ) : (
    <>
      <Button variant="primary" className="min-h-11" onClick={() => { actions.setProductActive(p.id, true); notify('Produto reativado.'); }}>Reativar produto</Button>
      <Button icon="edit" onClick={() => openDialog({ kind: 'product', id: p.id })}>Editar produto</Button>
    </>
  );

  let body: ReactNode;
  if (drawer.tab === 'movimentos') body = <MoveList list={moves} withCost={withRevenue} />;
  else if (drawer.tab === 'consumos') {
    const consumed = uses.filter((m) => m.at.startsWith(month)).reduce((s, m) => s - m.qty, 0);
    body = (
      <>
        <div className="grid grid-cols-2 gap-2.5"><Stat label="Consumido este mês" value={consumed} unit={unitLabel(p.unit, consumed)} /><Stat label="Registos" value={uses.length} unit="" /></div>
        <h3 className={sectionTitle}>Consumos e perdas</h3>
        <MoveList list={uses} withCost={withRevenue} />
      </>
    );
  } else {
    const monthCost = uses.filter((m) => m.at.startsWith(month)).reduce((s, m) => s + m.cost, 0);
    body = (
      <>
        <ul>
          {p.owner === 'client' && <Fact icon="building" label="Cliente">{clientById(data, p.clientId)?.name}</Fact>}
          {p.owner === 'client' && <Fact icon="home" label={p.unitName ? 'Alojamento e unidade' : 'Alojamento'}>{stayById(data, p.stayId)?.name}{p.unitName && ` · ${p.unitName}`}</Fact>}
          <Fact icon="pin" label="Localização" sub={loc?.detail}>{loc?.name}</Fact>
        </ul>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <Stat label="Stock atual" value={p.stock} unit={unitLabel(p.unit, p.stock)} alert={st !== 'ok'} />
          <Stat label="Stock mínimo" value={p.min} unit={unitLabel(p.unit, p.min)} />
        </div>
        <p className={cx('mt-3.5 flex items-center gap-2 font-semibold', st === 'ok' ? 'text-[#17643e]' : st === 'low' ? 'text-[#a15c00]' : 'text-[#b42318]')}>
          <span aria-hidden="true" className={cx('h-[9px] w-[9px] rounded-full', st === 'ok' ? 'bg-[#2e9e5b]' : st === 'low' ? 'bg-[#e0a30b]' : 'bg-[#e5484d]')} />{STOCK_STATE[st].label}
        </p>
        {request && <Banner tone="warn" icon="box" title={`Reposição pendente · ${qtyUnit(request.qty, p.unit)} sugeridas`}>{request.source} · {fmtShort(request.date)}{request.note ? ` · “${request.note}”` : ''}</Banner>}
        {order && (
          <button type="button" onClick={() => openDrawer({ kind: 'order', id: order.id, back: drawer })} className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
            <Banner icon="car" title={`${order.id} · ${ORDER_STATUS[order.status].label}`}>{supplierById(data, order.supplierId)?.name} · prevista para {fmtDate(order.expected)}</Banner>
          </button>
        )}
        {p.owner === 'company' ? (
          <>
            <div className="mt-3.5"><Meta items={[['Custo médio', `${eur2(p.cost)} / ${p.unit}`], ['Valor em stock', eur2(stockValue(p))], ...(withRevenue ? [['Consumo este mês', eur2(monthCost)] as [string, string]] : [])]} /></div>
            {withRevenue && <Note>O custo dos consumos fica preparado para Rendimentos.</Note>}
          </>
        ) : <Note>Produto do cliente: não entra em custos, compras ou fornecedores da empresa.</Note>}
        {p.notes && <><h3 className={sectionTitle}>Observações</h3><p className="text-slate-700">{p.notes}</p></>}
        <h3 className={sectionTitle}>Movimentos recentes</h3>
        <MoveList list={moves.slice(0, 4)} withCost={withRevenue} />
      </>
    );
  }

  return <SidePanel label={p.name} head={head} footer={footer} onClose={close} onBack={drawer.back ? () => openDrawer(drawer.back ?? null) : undefined}>{body}</SidePanel>;
}

function LocationPanel({ id }: { id: string }) {
  const { data, actions, notify, openDrawer, openDialog } = useInventoryUi();
  const l = locationById(data, id)!;
  const products = productsAt(data, id);
  const items = itemsAt(data, id);
  const self: DrawerState = { kind: 'location', id };
  const head = (
    <div className="flex items-center gap-4">
      <span className="grid h-14 w-14 place-items-center rounded-[14px] bg-slate-100"><LocationIcon type={l.type} /></span>
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight">{l.name}</h2>
        <p className="mb-1.5 mt-0.5 text-slate-500">{l.type} · {plural(items, 'item', 'itens')}</p>
        <span className="flex flex-wrap gap-1.5"><OwnerPill owner={l.owner} />{!l.active && <TonePill tone="neutral" dot={false}>Arquivado</TonePill>}</span>
      </div>
    </div>
  );
  const footer = l.active ? (
    <>
      <Button variant="primary" icon="plus" className="min-h-11" onClick={() => openDialog({ kind: 'product', preset: { owner: l.owner, clientId: l.clientId, stayId: l.stayId, locId: l.id, unitName: l.unit } })}>Adicionar produto</Button>
      <Button variant="ghost" icon="archive" className="!text-red-700 hover:!bg-red-50" onClick={() => {
        const r = actions.setLocationActive(id, false);
        notify(r.ok ? 'Local arquivado. Podes reativá-lo em Estado: Arquivados.' : 'Este local ainda tem stock. Transfere ou ajusta o stock antes de arquivar.');
      }}>Arquivar local</Button>
    </>
  ) : <Button variant="primary" className="min-h-11" onClick={() => { actions.setLocationActive(id, true); notify('Local reativado.'); }}>Reativar local</Button>;

  return (
    <SidePanel label={l.name} head={head} footer={footer} onClose={() => openDrawer(null)}>
      <Meta items={[
        ['Proprietário', l.owner === 'client' ? 'Cliente' : 'Empresa'],
        ...(l.owner === 'client' ? [['Cliente', clientById(data, l.clientId)?.name ?? '—'], ['Alojamento', stayById(data, l.stayId)?.name ?? '—'], ['Unidade', l.unit || '—']] as Array<[string, string]> : []),
        ['Morada / Detalhes', l.detail || '—'],
        ['Acesso', l.access || '—'],
      ]} />
      <h3 className={sectionTitle}>Produtos neste local ({products.length})</h3>
      {products.length ? (
        <ul>
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5 border-slate-200 py-2.5 [&+&]:border-t">
              <ProductGlyph glyph={p.glyph} />
              <span className="min-w-0 flex-1">
                <button type="button" onClick={() => openDrawer({ kind: 'product', id: p.id, tab: 'resumo', back: self })} className="text-left font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">{p.name}</button>
                <small className="block text-xs text-slate-500">Mínimo {qtyUnit(p.min, p.unit)}</small>
              </span>
              <span className="text-right"><b className={cx('tabular-nums', stateOf(p) !== 'ok' && 'text-[#b42318]')}>{qtyUnit(p.stock, p.unit)}</b><small className="block text-xs text-slate-500">{STOCK_STATE[stateOf(p)].label}</small></span>
            </li>
          ))}
        </ul>
      ) : <p className="text-slate-500">Ainda não há produtos neste local.</p>}
    </SidePanel>
  );
}

function SupplierPanel({ id }: { id: string }) {
  const { data, actions, notify, openDrawer, openDialog } = useInventoryUi();
  const s = supplierById(data, id)!;
  const orders = data.orders.filter((o) => o.supplierId === id).sort((a, b) => b.id.localeCompare(a.id));
  const self: DrawerState = { kind: 'supplier', id };
  const head = (
    <div>
      <h2 className="text-xl font-bold tracking-tight">{s.name}</h2>
      <p className="mb-1.5 mt-0.5 text-slate-500">{s.categories.join(' · ')}</p>
      <TonePill tone={s.active ? 'ok' : 'neutral'}>{s.active ? 'Ativo' : 'Inativo'}</TonePill>
    </div>
  );
  const footer = (
    <>
      {s.active && <Button variant="primary" icon="plus" className="min-h-11" onClick={() => openDialog({ kind: 'order', supplierId: s.id })}>Nova encomenda</Button>}
      <Button onClick={() => { actions.setSupplierActive(id, !s.active); notify(`${s.name} ${s.active ? 'desativado. O histórico de compras mantém-se.' : 'ativado.'}`); }}>{s.active ? 'Desativar fornecedor' : 'Ativar fornecedor'}</Button>
    </>
  );
  return (
    <SidePanel label={s.name} head={head} footer={footer} onClose={() => openDrawer(null)}>
      <Meta items={[['Contacto', s.contact || '—'], ['Telefone', s.phone || '—'], ['Email', s.email || '—']]} />
      <h3 className={sectionTitle}>Produtos associados ({s.productIds.length})</h3>
      {s.productIds.length ? (
        <ul>
          {s.productIds.map((pid) => productById(data, pid)).filter((p): p is Product => Boolean(p)).map((p) => (
            <li key={p.id} className="flex items-center gap-2.5 border-slate-200 py-2.5 [&+&]:border-t">
              <ProductGlyph glyph={p.glyph} />
              <span className="min-w-0 flex-1"><b className="font-semibold">{p.name}</b><small className="block text-xs text-slate-500">{locationName(data, p.locId)}</small></span>
              <span className="text-right"><b className="tabular-nums">{eur2(p.cost)}</b><small className="block text-xs text-slate-500">custo médio</small></span>
            </li>
          ))}
        </ul>
      ) : <p className="text-slate-500">Sem produtos associados.</p>}
      <h3 className={sectionTitle}>Histórico de compras</h3>
      {orders.length ? (
        <ul>
          {orders.map((o) => (
            <li key={o.id} className="flex items-center gap-2.5 border-slate-200 py-2.5 [&+&]:border-t">
              <span className="min-w-0 flex-1">
                <button type="button" onClick={() => openDrawer({ kind: 'order', id: o.id, back: self })} className="font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">{o.id}</button>
                <small className="block text-xs text-slate-500">{fmtDate(o.created)} · {plural(o.lines.length, 'produto', 'produtos')}</small>
              </span>
              <span className="text-right"><b className="tabular-nums">{eur2(orderTotal(o))}</b><small className="block text-xs text-slate-500">{ORDER_STATUS[o.status].label}</small></span>
            </li>
          ))}
        </ul>
      ) : <p className="text-slate-500">Ainda não há compras a este fornecedor.</p>}
    </SidePanel>
  );
}

function OrderPanel({ drawer }: { drawer: Extract<DrawerState, { kind: 'order' }> }) {
  const { data, actions, notify, openDrawer, openDialog } = useInventoryUi();
  const o = orderById(data, drawer.id)!;
  const status = (to: typeof o.status, msg: string) => { actions.setOrderStatus(o.id, to); notify(msg); };
  const head = (
    <div>
      <h2 className="text-xl font-bold tracking-tight">{o.id}</h2>
      <p className="mb-1.5 mt-0.5 text-slate-500">{supplierById(data, o.supplierId)?.name}</p>
      <OrderPill status={o.status} />
    </div>
  );
  const open = o.status === 'draft' || o.status === 'ordered' || o.status === 'transit';
  const footer = (
    <>
      {o.status === 'draft' && <Button variant="primary" className="min-h-11" onClick={() => status('ordered', `${o.id} marcada como encomendada.`)}>Marcar como encomendada</Button>}
      {(o.status === 'ordered' || o.status === 'transit') && <Button variant="primary" icon="download" className="min-h-11" onClick={() => openDialog({ kind: 'receive', id: o.id })}>Registar receção</Button>}
      {o.status === 'ordered' && <Button icon="car" onClick={() => status('transit', `${o.id} marcada em trânsito.`)}>Marcar em trânsito</Button>}
      {open && <Button variant="ghost" className="!text-red-700 hover:!bg-red-50" onClick={() => status('cancelled', `${o.id} cancelada.`)}>Cancelar encomenda</Button>}
      {o.status === 'received' && <span className="self-start"><TonePill tone="ok">Recebida em {fmtDate(o.receivedAt)} · stock atualizado</TonePill></span>}
      {o.status === 'cancelled' && <span className="self-start"><TonePill tone="bad">Encomenda cancelada</TonePill></span>}
    </>
  );
  return (
    <SidePanel label={o.id} head={head} footer={footer} onClose={() => openDrawer(null)} onBack={drawer.back ? () => openDrawer(drawer.back ?? null) : undefined}>
      <table className="w-full border-collapse text-[13.5px]">
        <caption className="sr-only">Produtos da encomenda</caption>
        <thead><tr className="text-left text-xs text-slate-600"><th scope="col" className="py-1.5 font-semibold">Produto</th><th scope="col" className="py-1.5 text-right font-semibold">Qtd.</th><th scope="col" className="py-1.5 text-right font-semibold">Preço un.</th><th scope="col" className="py-1.5 text-right font-semibold">Total</th></tr></thead>
        <tbody>
          {o.lines.map((l) => {
            const p = productById(data, l.productId)!;
            return (
              <tr key={l.productId} className="align-top">
                <td className="py-1.5 pr-2">{p.name}<small className="block text-xs text-slate-500">{locationName(data, p.locId)}</small></td>
                <td className="whitespace-nowrap py-1.5 text-right tabular-nums">{qtyUnit(l.qty, p.unit)}</td>
                <td className="whitespace-nowrap py-1.5 pl-2 text-right tabular-nums">{eur2(l.price)}</td>
                <td className="whitespace-nowrap py-1.5 pl-2 text-right tabular-nums">{eur2(l.qty * l.price)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot><tr className="border-t border-slate-200 font-bold"><td colSpan={3} className="pt-2.5">Total</td><td className="pt-2.5 text-right tabular-nums">{eur2(orderTotal(o))}</td></tr></tfoot>
      </table>
      <div className="mt-3.5"><Meta items={[['Criada', fmtDate(o.created)], ['Data prevista', fmtDate(o.expected)], ...(o.receivedAt ? [['Recebida em', fmtDate(o.receivedAt)] as [string, string]] : []), ...(o.note ? [['Nota', o.note] as [string, string]] : [])]} /></div>
      <Note>Ao registar a receção, o stock da empresa e o custo médio de cada produto são atualizados.</Note>
    </SidePanel>
  );
}

/** Painel lateral ativo (produto, local, fornecedor ou encomenda). */
export function InventoryPanels() {
  const { data, drawer } = useInventoryUi();
  if (!drawer) return null;
  if (drawer.kind === 'product') { const p = productById(data, drawer.id); return p ? <ProductPanel key={p.id} product={p} drawer={drawer} /> : null; }
  if (drawer.kind === 'location') return locationById(data, drawer.id) ? <LocationPanel key={drawer.id} id={drawer.id} /> : null;
  if (drawer.kind === 'supplier') return supplierById(data, drawer.id) ? <SupplierPanel key={drawer.id} id={drawer.id} /> : null;
  return orderById(data, drawer.id) ? <OrderPanel key={drawer.id} drawer={drawer} /> : null;
}
