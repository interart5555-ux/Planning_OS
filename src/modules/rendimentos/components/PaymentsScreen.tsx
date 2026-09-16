import { useRef } from 'react';
import { Button, cx, Icon, inputBase, TextLink } from '../../shared/ui';
import { CYCLE_LABEL, FIRST_INVOICE_MONTH } from '../config';
import { eur, formatDay2, invoicePeriodLabel, monthLabel, plural } from '../format';
import { allMonths, invoiceStatus, missingOf, paidOf } from '../rules';
import type { Invoice, PaymentFilters } from '../types';
import { useRevenue } from './context';
import { cardsWrap, MobileCard, PageHeader, SectionTabs, Select, StatusPill, tableWrap, td, th } from './parts';

export const defaultPaymentFilters = (lastMonth: string): PaymentFilters => ({ q: '', status: '', period: lastMonth, sort: 'due' });
const ORDER = { late: 0, pending: 1, paid: 2 };

export function PaymentsScreen({ filters: f, onChange }: { filters: PaymentFilters; onChange: (f: PaymentFilters) => void }) {
  const { data, today, lastMonth, openInvoice } = useRevenue();
  const search = useRef<HTMLInputElement>(null);
  const clientName = (inv: Invoice) => data.clients.find((c) => c.id === inv.clientId)?.name ?? '';
  const q = f.q.trim().toLowerCase();
  const list = data.invoices
    .filter((inv) => {
      const st = invoiceStatus(inv, today);
      return (f.period === 'all' || inv.month === f.period) && (!f.status || st === f.status || (f.status === 'open' && st !== 'paid'))
        && (!q || clientName(inv).toLowerCase().includes(q) || inv.id.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (f.sort === 'amount') return b.amount - a.amount;
      if (f.sort === 'client') return clientName(a).localeCompare(clientName(b)) || a.due.localeCompare(b.due);
      if (f.sort === 'status') return ORDER[invoiceStatus(a, today)] - ORDER[invoiceStatus(b, today)] || a.due.localeCompare(b.due);
      return a.due.localeCompare(b.due);
    });
  const sums = { received: 0, pending: 0, late: 0 };
  for (const inv of list) {
    const st = invoiceStatus(inv, today);
    sums.received += Math.min(inv.amount, paidOf(inv));
    if (st !== 'paid') sums[st] += missingOf(inv);
  }
  const months = allMonths(lastMonth).filter((m) => m >= FIRST_INVOICE_MONTH).reverse();
  const set = (patch: Partial<PaymentFilters>) => onChange({ ...f, ...patch });
  const filtered = f.q || f.status || f.period !== lastMonth || f.sort !== 'due';

  return (
    <>
      <PageHeader eyebrow="Rendimentos" title="Pagamentos de clientes" lede="Consulta o estado dos pagamentos e regista recebimentos." />
      <SectionTabs />
      <div role="group" aria-label="Filtros" className="mt-[22px] grid grid-cols-2 items-end gap-2.5 sm:gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <label htmlFor="pay-q" className="mb-[5px] block text-xs font-medium text-slate-600">Pesquisar cliente</label>
          <span className="relative block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
            <input ref={search} id="pay-q" type="search" value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Nome do cliente ou fatura…" className={cx(inputBase, 'min-h-10 pl-[38px] text-sm')} />
          </span>
        </div>
        <Select id="pay-status" label="Estado" value={f.status} onChange={(status) => set({ status: status as PaymentFilters['status'] })}
          options={[['', 'Todos'], ['open', 'Por receber'], ['paid', 'Pago'], ['pending', 'Pendente'], ['late', 'Em atraso']]} />
        <Select id="pay-period" label="Período" value={f.period} onChange={(period) => set({ period })} options={[...months.map((m): [string, string] => [m, monthLabel(m)]), ['all', 'Últimos 3 meses']]} />
        <Select id="pay-sort" label="Ordenar por" value={f.sort} onChange={(sort) => set({ sort: sort as PaymentFilters['sort'] })}
          options={[['due', 'Data de vencimento'], ['amount', 'Montante (maior primeiro)'], ['client', 'Cliente (A–Z)'], ['status', 'Estado']]} />
        <div className="lg:pb-2.5">{filtered && <TextLink onClick={() => { onChange(defaultPaymentFilters(lastMonth)); search.current?.focus(); }}>Limpar filtros</TextLink>}</div>
      </div>

      <div aria-live="polite" className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate-500">
        <span>{plural(list.length, 'fatura', 'faturas')} · {eur(list.reduce((s, x) => s + x.amount, 0))} faturado</span>
        <span className="flex flex-wrap gap-2 font-semibold">
          <span className="rounded-full bg-[#e7f5ec] px-2.5 py-1 text-xs text-[#17643e]">Recebido {eur(sums.received)}</span>
          <span className="rounded-full bg-[#fdf6de] px-2.5 py-1 text-xs text-[#7a5406]">Pendente {eur(sums.pending)}</span>
          <span className="rounded-full bg-[#fdecea] px-2.5 py-1 text-xs text-[#b42318]">Em atraso {eur(sums.late)}</span>
        </span>
      </div>

      {!list.length ? (
        <p className="mt-3 rounded-[14px] border border-slate-200 px-4 py-9 text-center text-slate-500"><b className="mb-0.5 block text-[15px] text-slate-900">Sem faturas</b>Ajusta a pesquisa ou os filtros.</p>
      ) : (
        <>
          <div className={tableWrap}>
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Pagamentos de clientes</caption>
              <thead><tr>
                <th scope="col" className={th}>Cliente</th><th scope="col" className={th}>Fatura / Período</th><th scope="col" className={cx(th, 'text-right')}>Montante</th>
                <th scope="col" className={cx(th, 'text-right')}>Em falta</th><th scope="col" className={th}>Data de vencimento</th><th scope="col" className={th}>Estado</th><th scope="col" className={cx(th, 'text-right')}>Ação</th>
              </tr></thead>
              <tbody className="[&>tr:last-child>td]:border-b-0">
                {list.map((inv) => {
                  const st = invoiceStatus(inv, today);
                  const client = data.clients.find((c) => c.id === inv.clientId);
                  return (
                    <tr key={inv.id}>
                      <td className={td}><b className="font-semibold">{client?.name}</b><small className="block text-xs text-slate-500">{client && CYCLE_LABEL[client.cycle]}</small></td>
                      <td className={td}>{inv.id}<small className="block text-xs text-slate-500">{invoicePeriodLabel(inv.from, inv.to)}</small></td>
                      <td className={cx(td, 'text-right tabular-nums')}>{eur(inv.amount)}</td>
                      <td className={cx(td, 'text-right tabular-nums', st === 'late' ? 'text-[#b42318]' : st === 'paid' && 'text-slate-400')}>{eur(missingOf(inv))}</td>
                      <td className={cx(td, 'tabular-nums', st === 'late' && 'text-[#b42318]')}>{formatDay2(inv.due)}</td>
                      <td className={td}><StatusPill status={st} />{st !== 'paid' && paidOf(inv) > 0 && <small className="block text-xs text-slate-500">Pago em parte</small>}</td>
                      <td className={cx(td, 'text-right')}><Button size="sm" aria-label={`Ver ${inv.id} de ${client?.name}`} onClick={() => openInvoice(inv.id)}>Ver</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={cardsWrap}>
            {list.map((inv) => {
              const st = invoiceStatus(inv, today);
              return (
                <MobileCard key={inv.id} title={clientName(inv)} subtitle={`${inv.id} · ${invoicePeriodLabel(inv.from, inv.to)}`} badge={<StatusPill status={st} />}
                  facts={[['Montante', eur(inv.amount)], ['Em falta', <span className={st === 'late' ? 'text-[#b42318]' : ''}>{eur(missingOf(inv))}</span>], ['Vencimento', formatDay2(inv.due)]]}
                  action={<Button aria-label={`Ver ${inv.id}`} onClick={() => openInvoice(inv.id)}>Ver</Button>} />
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
