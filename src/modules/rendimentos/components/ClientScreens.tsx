import type { ReactNode } from 'react';
import { Button, cx, Icon, type IconName } from '../../shared/ui';
import { CLIENT_STATE, CYCLE_LABEL, FIRST_INVOICE_MONTH, PRODUCT_COST } from '../config';
import { cap, eur, eur2, formatDay, formatDay2, hrs, invoicePeriodLabel, monthLabel, pct, plural } from '../format';
import { clientHealth, clientStats, invoiceStatus, nextInvoiceDate, paidOf, periodMonths } from '../rules';
import type { HealthLevel, RevenueClient } from '../types';
import { useRevenue } from './context';
import { card, cardsWrap, Kpi, LinkButton, MobileCard, Note, PageHeader, Panel, PeriodControls, periodLabel, SectionTabs, StatusPill, SupplyPill, TonePill, tableWrap, td, th } from './parts';

const pctOf = (a: number, b: number) => (b ? (a / b) * 100 : 0);

export function ClientsScreen() {
  const { config, data, period, lastMonth, today, openClient } = useRevenue();
  const months = periodMonths(period, lastMonth);
  const rows = data.clients
    .map((c) => { const s = clientStats(data, c, months); return { c, t: s.total, st: clientHealth(data, c, today, pctOf(s.total.margin, s.total.revenue)) }; })
    .sort((a, b) => b.t.margin - a.t.margin);
  const location = (c: RevenueClient) => plural(c.units.length, config.location.singular.toLowerCase(), config.location.plural);

  return (
    <>
      <PageHeader eyebrow="Rendimentos" title="Rentabilidade por cliente" lede="Compara faturação, custos alocados e margem de cada cliente."><PeriodControls /></PageHeader>
      <SectionTabs />
      <div className="mt-3.5 flex flex-wrap justify-between gap-2 text-[13px] text-slate-500">
        <span>{plural(rows.length, 'cliente', 'clientes')} · {periodLabel(period.view, period.month, period.year, lastMonth)}</span><span>Ordenado por margem</span>
      </div>
      <div className={tableWrap}>
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Rentabilidade por cliente</caption>
          <thead><tr>
            <th scope="col" className={th}>Cliente</th><th scope="col" className={th}>{config.supply}</th>
            {['Horas faturadas', 'Faturado', 'Custos alocados', 'Margem'].map((h) => <th key={h} scope="col" className={cx(th, 'text-right')}>{h}</th>)}
            <th scope="col" className={th}>Estado financeiro</th><th scope="col" className={cx(th, 'text-right')}>Ação</th>
          </tr></thead>
          <tbody>
            {rows.map(({ c, t, st }) => (
              <tr key={c.id}>
                <td className={td}><b className="font-semibold">{c.name}</b><small className="block text-xs text-slate-500">{location(c)} · {CYCLE_LABEL[c.cycle]}</small></td>
                <td className={td}><SupplyPill supply={c.supply} /></td>
                <td className={cx(td, 'text-right tabular-nums')}>{hrs(t.hours)}</td>
                <td className={cx(td, 'text-right tabular-nums')}>{eur(t.revenue)}</td>
                <td className={cx(td, 'text-right tabular-nums')}>{eur(t.costs)}</td>
                <td className={cx(td, 'text-right tabular-nums')}><b>{eur(t.margin)}</b> <small className="text-slate-500">({pct(pctOf(t.margin, t.revenue))})</small></td>
                <td className={td}><TonePill tone={st}>{CLIENT_STATE[st].label}</TonePill></td>
                <td className={cx(td, 'text-right')}><Button size="sm" aria-label={`Ver rentabilidade de ${c.name}`} onClick={() => openClient(c.id)}>Ver</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={cardsWrap}>
        {rows.map(({ c, t, st }) => (
          <MobileCard key={c.id} title={c.name} subtitle={`${location(c)} · ${CYCLE_LABEL[c.cycle]}`} badge={<TonePill tone={st}>{CLIENT_STATE[st].label}</TonePill>}
            facts={[['Faturado', eur(t.revenue)], ['Margem', `${eur(t.margin)} (${pct(pctOf(t.margin, t.revenue))})`], [config.supply, <SupplyPill supply={c.supply} />]]}
            action={<Button onClick={() => openClient(c.id)}>Ver rentabilidade</Button>} />
        ))}
      </div>
    </>
  );
}

function Fact({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className={cx(card, 'flex min-w-0 gap-3 px-4 py-3.5')}>
      <Icon name={icon} className="mt-0.5 h-[26px] w-[26px] text-[#17643e]" />
      <div className="min-w-0"><small className="block text-[12.5px] text-slate-500">{label}</small>{children}</div>
    </div>
  );
}

const STATE_BOX: Record<HealthLevel, string> = {
  ok: 'border-[#c3e3cf] bg-[#e7f5ec] text-[#17643e]',
  warn: 'border-[#f1dfa4] bg-[#fdf6de] text-[#7a5406]',
  bad: 'border-[#f4c3bd] bg-[#fdecea] text-[#b42318]',
};
const STATE_DOT: Record<HealthLevel, string> = { ok: 'bg-[#2e9e5b]', warn: 'bg-[#e0a30b]', bad: 'bg-[#e5484d]' };

export function ClientDetail({ clientId, tab, onTab, onEditSupply }: { clientId: string; tab: 'fin' | 'inv'; onTab: (t: 'fin' | 'inv') => void; onEditSupply: () => void }) {
  const { config, data, period, lastMonth, today, viewer, actions, go, openInvoice } = useRevenue();
  const c = data.clients.find((x) => x.id === clientId);
  if (!c) return null;
  const s = clientStats(data, c, periodMonths(period, lastMonth));
  const t = s.total;
  const st = clientHealth(data, c, today, pctOf(t.margin, t.revenue));
  const included = c.supply === 'included';
  const label = periodLabel(period.view, period.month, period.year, lastMonth);
  const invoices = data.invoices.filter((x) => x.clientId === c.id).sort((a, b) => b.due.localeCompare(a.due));
  const rateVaries = c.units.some((u) => u.rate !== c.units[0].rate);
  const productsLower = config.products.toLowerCase();

  return (
    <>
      <div className="mb-2"><LinkButton onClick={() => go('clients')}><Icon name="back" className="h-4 w-4" />Voltar a rentabilidade por cliente</LinkButton></div>
      <PageHeader eyebrow="Rentabilidade por cliente" title={c.name} lede={`${label} · ${plural(c.units.length, config.location.singular.toLowerCase(), config.location.plural)}`}>
        <PeriodControls />
        <Button icon="download" onClick={() => actions.notify(`Relatório de ${c.name} · ${label} preparado (simulação, nenhum ficheiro foi criado).`)}>Descarregar relatório</Button>
      </PageHeader>

      <div role="tablist" aria-label="Secções do cliente" className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {([['fin', 'Visão financeira'], ['inv', 'Histórico de faturação']] as const).map(([key, l]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => onTab(key)}
            className={cx('-mb-px whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5', tab === key ? 'border-[#17643e] bg-[#e9f4ee] font-semibold text-[#17643e]' : 'border-transparent font-medium text-slate-600 hover:bg-slate-50')}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'inv' ? (
        <>
          <div className="mt-3 overflow-x-auto rounded-[14px] border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Histórico de faturação de {c.name}</caption>
              <thead><tr>
                <th scope="col" className={th}>Fatura / Período</th><th scope="col" className={cx(th, 'text-right')}>Montante</th><th scope="col" className={cx(th, 'text-right')}>Recebido</th>
                <th scope="col" className={th}>Vencimento</th><th scope="col" className={th}>Estado</th><th scope="col" className={cx(th, 'text-right')}>Ação</th>
              </tr></thead>
              <tbody>
                {invoices.map((inv) => {
                  const ist = invoiceStatus(inv, today);
                  return (
                    <tr key={inv.id}>
                      <td className={td}>{inv.id}<small className="block text-xs text-slate-500">{invoicePeriodLabel(inv.from, inv.to)}</small></td>
                      <td className={cx(td, 'text-right tabular-nums')}>{eur(inv.amount)}</td>
                      <td className={cx(td, 'text-right tabular-nums')}>{eur(paidOf(inv))}</td>
                      <td className={cx(td, 'tabular-nums', ist === 'late' && 'text-[#b42318]')}>{formatDay2(inv.due)}</td>
                      <td className={td}><StatusPill status={ist} /></td>
                      <td className={cx(td, 'text-right')}><Button size="sm" aria-label={`Ver ${inv.id}`} onClick={() => openInvoice(inv.id)}>Ver</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Note>Faturas simuladas desde {monthLabel(FIRST_INVOICE_MONTH).toLowerCase()}. Sem faturação certificada nem ligação a contabilidade.</Note>
        </>
      ) : (
        <>
          <div className="mt-[22px] grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5 xl:gap-3.5 [&>:last-child]:col-span-2 md:[&>:last-child]:col-span-1">
            <Kpi label={config.hoursBilled} value={hrs(t.hours)} icon="clock">{plural(t.jobs, config.job.singular, config.job.plural)}</Kpi>
            <Kpi label="Valor/hora" value={eur2(t.rate)} icon="tag">{rateVaries ? `Média ponderada · varia por ${config.location.singular.toLowerCase()}` : `Igual em todos os ${config.location.plural}`}</Kpi>
            <Kpi label="Total faturado" value={eur(t.revenue)} icon="doc">{t.supplementRev ? `Inclui ${eur(t.supplementRev)} de suplemento` : `Sem suplemento de ${config.productsShort}`}</Kpi>
            <Kpi label="Custos alocados" value={eur(t.costs)} icon="users">
              <span className="block">{eur(t.team)} equipa</span><span className="block">{eur(t.products)} {config.productsShort}</span>
            </Kpi>
            <Kpi label="Margem" value={eur(t.margin)} icon="bars"><span className="font-semibold text-[#17643e]">{pct(pctOf(t.margin, t.revenue))}</span></Kpi>
          </div>

          <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
            <Fact icon="bottle" label={config.supply}>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <SupplyPill supply={c.supply} />
                {viewer.canView && <button type="button" onClick={onEditSupply} className="text-[13px] font-semibold text-[#17643e] underline decoration-[#cde5d6] underline-offset-[3px]">Alterar</button>}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {included ? `Os ${productsLower} são fornecidos pela empresa: o consumo entra nos custos e na margem.` : `O cliente fornece os ${productsLower}: sem custo de stock para a empresa e sem suplemento.`}
              </p>
            </Fact>
            <Fact icon="euro" label={config.supplement}>
              <b className="mt-0.5 block text-[15px] font-semibold">{included ? eur2(c.supplement) : 'Não aplicável'}</b>
              <p className="mt-1 text-xs text-slate-500">{included ? `Somado à faturação de cada ${config.job.singular}. Custo estimado: ${eur2(PRODUCT_COST)} ${config.perJob}.` : `Só existe quando os ${config.productsShort} estão incluídos no serviço.`}</p>
            </Fact>
            <Fact icon="calendar" label="Período de pagamento">
              <b className="mt-0.5 block text-[15px] font-semibold">{CYCLE_LABEL[c.cycle]}</b>
              <p className="mt-1 text-xs text-slate-500">Condição: pagamento a {c.terms} dias</p>
            </Fact>
            <Fact icon="doc" label="Próxima fatura">
              <b className="mt-0.5 block text-[15px] font-semibold">{formatDay2(nextInvoiceDate(data, c))}</b>
              <p className="mt-1 text-xs text-slate-500">Emitida no fim de cada período</p>
            </Fact>
          </div>

          <Panel className="mt-3.5" labelledBy="units-title" title={`${cap(config.location.plural)} (${c.units.length})`}>
            <div className="mt-3 hidden overflow-x-auto rounded-xl border border-slate-200 min-[860px]:block">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">Rentabilidade por {config.location.singular.toLowerCase()}</caption>
                <thead><tr>
                  <th scope="col" className={th}>{config.location.singular}</th>
                  {['Horas do período', 'Valor/hora', `Suplemento de ${config.productsShort}`, 'Total faturado', 'Custos de equipa', `Custos de ${config.productsShort}`, 'Margem'].map((h) => <th key={h} scope="col" className={cx(th, 'text-right')}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {s.units.map((u) => (
                    <tr key={u.name}>
                      <td className={td}>{u.name}</td>
                      <td className={cx(td, 'text-right tabular-nums')}>{hrs(u.hours)}</td>
                      <td className={cx(td, 'text-right tabular-nums')}>{eur2(u.rate)}</td>
                      <td className={cx(td, 'text-right tabular-nums', !u.supplementRev && 'text-slate-400')}>{u.supplementRev ? <>{eur(u.supplementRev)}<small className="block text-xs text-slate-500">{u.jobs} × {eur2(c.supplement)}</small></> : '—'}</td>
                      <td className={cx(td, 'text-right tabular-nums')}>{eur(u.revenue)}</td>
                      <td className={cx(td, 'text-right tabular-nums')}>{eur(u.team)}</td>
                      <td className={cx(td, 'text-right tabular-nums', !u.products && 'text-slate-400')}>{u.products ? eur(u.products) : '—'}</td>
                      <td className={cx(td, 'text-right tabular-nums')}><b>{eur(u.margin)}</b> <small className="text-slate-500">({pct(pctOf(u.margin, u.revenue))})</small></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold [&_td]:border-t [&_td]:border-slate-300 [&_td]:px-3.5 [&_td]:py-2.5">
                  <tr>
                    <td>Total</td><td className="text-right tabular-nums">{hrs(t.hours)}</td><td className="text-right tabular-nums">{eur2(t.rate)}</td>
                    <td className="text-right tabular-nums">{t.supplementRev ? eur(t.supplementRev) : '—'}</td><td className="text-right tabular-nums">{eur(t.revenue)}</td>
                    <td className="text-right tabular-nums">{eur(t.team)}</td><td className="text-right tabular-nums">{t.products ? eur(t.products) : '—'}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{eur(t.margin)} ({pct(pctOf(t.margin, t.revenue))})</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-3 flex flex-col gap-2.5 min-[860px]:hidden">
              {s.units.map((u) => (
                <MobileCard key={u.name} title={u.name} subtitle={`${hrs(u.hours)} × ${eur2(u.rate)}`} badge={<b className="whitespace-nowrap tabular-nums">{eur(u.margin)} ({pct(pctOf(u.margin, u.revenue))})</b>}
                  facts={[['Total faturado', eur(u.revenue)], [`Suplemento de ${config.productsShort}`, u.supplementRev ? eur(u.supplementRev) : '—'], ['Custos de equipa', eur(u.team)], [`Custos de ${config.productsShort}`, u.products ? eur(u.products) : '—']]} />
              ))}
              <MobileCard title="Total" badge={<b className="whitespace-nowrap tabular-nums">{eur(t.margin)} ({pct(pctOf(t.margin, t.revenue))})</b>} facts={[['Horas', hrs(t.hours)], ['Faturado', eur(t.revenue)], ['Custos', eur(t.costs)]]} />
            </div>
            <Note>Custos de equipa alocados pelas horas faturáveis e incluem deslocações. As deslocações não são faturadas ao cliente.</Note>
          </Panel>

          <div className="mt-3.5 grid items-start gap-3.5 md:grid-cols-2">
            <Panel>
              <div role="status" className={cx('flex gap-3 rounded-xl border px-3.5 py-[13px]', STATE_BOX[st])}>
                <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full text-white', STATE_DOT[st])}><Icon name={st === 'ok' ? 'check' : 'alert'} className="h-4 w-4" /></span>
                <div><b className="block font-semibold">{CLIENT_STATE[st].label}</b><p className="text-[12.5px]">{CLIENT_STATE[st].text}</p></div>
              </div>
              <h3 className="mb-1.5 mt-5 text-sm font-semibold">Últimos pagamentos</h3>
              <ul className="divide-y divide-slate-200">
                {invoices.slice(0, 4).map((inv) => {
                  const last = inv.payments[inv.payments.length - 1];
                  return (
                    <li key={inv.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 py-[9px] text-[13px]">
                      <span>{last ? formatDay(last.date) : `Vence ${formatDay(inv.due)}`}<small className="block text-xs text-slate-500">{inv.id}</small></span>
                      <b className="font-semibold tabular-nums">{eur(inv.amount)}</b>
                      <StatusPill status={invoiceStatus(inv, today)} />
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2"><LinkButton onClick={() => onTab('inv')}>Ver histórico de faturação</LinkButton></div>
            </Panel>
            <Panel labelledBy="contact-title" title="Contacto">
              <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-[13px]">
                <dt className="text-slate-500">Nome</dt><dd>{c.contact.name}</dd>
                <dt className="text-slate-500">Email</dt><dd className="break-words">{c.contact.email}</dd>
                <dt className="text-slate-500">Telefone</dt><dd>{c.contact.phone}</dd>
              </dl>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

