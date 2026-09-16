import { Button, cx } from '../../shared/ui';
import { ORDER_STATUS } from '../config';
import { eur2, fmtDate, plural } from '../format';
import { isOpenOrder, orderTotal, productById, supplierById } from '../rules';
import type { OrderStatus } from '../types';
import { useInventoryUi } from './context';
import { Banner, EmptyState, FilterSelect, MobileCard, OrderPill, PageHeader, SectionTabs, tableWrap, td, th, TonePill, UnderlineTabs } from './parts';

export function SuppliersScreen() {
  const { data, suppliers: [f, setF], openDrawer, openDialog } = useInventoryUi();
  const isOrders = f.tab === 'orders';
  const orders = data.orders.filter((o) => !f.status || o.status === f.status).sort((a, b) => b.id.localeCompare(a.id));
  const open = data.orders.filter((o) => isOpenOrder(o) && o.status !== 'draft');

  return (
    <>
      <PageHeader title="Fornecedores e compras" lede="Gere fornecedores e encomendas de produtos da empresa.">
        {isOrders
          ? <Button variant="primary" icon="plus" onClick={() => openDialog({ kind: 'order' })}>Nova encomenda</Button>
          : <Button variant="primary" icon="plus" onClick={() => openDialog({ kind: 'supplier' })}>Novo fornecedor</Button>}
      </PageHeader>
      <SectionTabs />
      <Banner tone="green" icon="lock" title="Só produtos da empresa">Os produtos fornecidos pelos clientes nunca aparecem em compras, encomendas, fornecedores ou custos da empresa.</Banner>
      <UnderlineTabs className="mt-[18px]" label="Fornecedores e compras" value={f.tab} onChange={(tab) => setF({ ...f, tab })} tabs={[['orders', `Encomendas (${data.orders.length})`], ['suppliers', `Fornecedores (${data.suppliers.length})`]]} />

      {isOrders ? (
        <>
          <div className="mt-3.5 flex flex-wrap items-center gap-3">
            <FilterSelect id="sf-status" label="Estado" value={f.status} onChange={(status) => setF({ ...f, status: status as '' | OrderStatus })} className="w-full sm:w-[260px]"
              options={[['', 'Estado: Todos'], ...(Object.keys(ORDER_STATUS) as OrderStatus[]).map((k): [string, string] => [k, `Estado: ${ORDER_STATUS[k].label}`])]} />
            <span className="text-slate-500">Em aberto: <b className="text-slate-900">{eur2(open.reduce((s, o) => s + orderTotal(o), 0))}</b> em {plural(open.length, 'encomenda', 'encomendas')}</span>
          </div>
          {!orders.length ? <div className={tableWrap}><EmptyState title="Sem encomendas">Cria uma encomenda para repor stock da empresa.</EmptyState></div> : (
            <>
              <div className={cx(tableWrap, 'hidden min-[860px]:block')}>
                <table className="w-full border-collapse">
                  <caption className="sr-only">Encomendas</caption>
                  <thead><tr>{['Número', 'Fornecedor', 'Produtos', 'Criada', 'Data prevista'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}<th scope="col" className={cx(th, 'text-right')}>Total</th><th scope="col" className={th}>Estado</th><th scope="col" className={cx(th, 'text-right')}>Ação</th></tr></thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className={cx(td, 'whitespace-nowrap font-semibold')}>{o.id}</td>
                        <td className={cx(td, 'whitespace-nowrap')}>{supplierById(data, o.supplierId)?.name}</td>
                        <td className={cx(td, 'min-w-[200px]')}>{plural(o.lines.length, 'produto', 'produtos')}<small className="block text-xs text-slate-500">{o.lines.map((l) => productById(data, l.productId)?.name).join(', ')}</small></td>
                        <td className={cx(td, 'whitespace-nowrap tabular-nums')}>{fmtDate(o.created)}</td>
                        <td className={cx(td, 'whitespace-nowrap tabular-nums')}>{o.status === 'received' ? <><small className="text-xs text-slate-500">Recebida </small>{fmtDate(o.receivedAt)}</> : fmtDate(o.expected)}</td>
                        <td className={cx(td, 'whitespace-nowrap text-right tabular-nums')}>{eur2(orderTotal(o))}</td>
                        <td className={td}><OrderPill status={o.status} /></td>
                        <td className={cx(td, 'text-right')}><Button size="sm" aria-label={`Ver encomenda ${o.id}`} onClick={() => openDrawer({ kind: 'order', id: o.id })}>Ver</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-col gap-2.5 min-[860px]:hidden">
                {orders.map((o) => (
                  <MobileCard key={o.id} title={o.id} subtitle={supplierById(data, o.supplierId)?.name} badge={<OrderPill status={o.status} />}
                    facts={[['Total', eur2(orderTotal(o))], ['Data prevista', fmtDate(o.expected)]]} actions={<Button onClick={() => openDrawer({ kind: 'order', id: o.id })}>Ver encomenda</Button>} />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className={cx(tableWrap, 'mt-4 hidden min-[860px]:block')}>
            <table className="w-full border-collapse">
              <caption className="sr-only">Fornecedores</caption>
              <thead><tr>{['Fornecedor', 'Telefone', 'Email', 'Categorias'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}<th scope="col" className={cx(th, 'text-right')}>Produtos</th><th scope="col" className={cx(th, 'text-right')}>Compras</th><th scope="col" className={th}>Estado</th><th scope="col" className={cx(th, 'text-right')}>Ação</th></tr></thead>
              <tbody>
                {data.suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className={cx(td, 'whitespace-nowrap')}><b className="font-semibold">{s.name}</b><small className="block text-xs text-slate-500">{s.contact || '—'}</small></td>
                    <td className={cx(td, 'whitespace-nowrap tabular-nums')}>{s.phone || '—'}</td>
                    <td className={td}>{s.email || '—'}</td>
                    <td className={cx(td, 'min-w-[160px]')}>{s.categories.join(', ')}</td>
                    <td className={cx(td, 'text-right tabular-nums')}>{s.productIds.length}</td>
                    <td className={cx(td, 'text-right tabular-nums')}>{data.orders.filter((o) => o.supplierId === s.id && o.status === 'received').length}</td>
                    <td className={td}><TonePill tone={s.active ? 'ok' : 'neutral'}>{s.active ? 'Ativo' : 'Inativo'}</TonePill></td>
                    <td className={cx(td, 'text-right')}><Button size="sm" aria-label={`Ver ${s.name}`} onClick={() => openDrawer({ kind: 'supplier', id: s.id })}>Ver</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-col gap-2.5 min-[860px]:hidden">
            {data.suppliers.map((s) => (
              <MobileCard key={s.id} title={s.name} subtitle={`${s.contact} · ${s.phone}`} badge={<TonePill tone={s.active ? 'ok' : 'neutral'}>{s.active ? 'Ativo' : 'Inativo'}</TonePill>}
                facts={[['Categorias', s.categories.join(', ')], ['Produtos', String(s.productIds.length)]]} actions={<Button onClick={() => openDrawer({ kind: 'supplier', id: s.id })}>Ver fornecedor</Button>} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
