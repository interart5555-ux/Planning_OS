import { useState } from 'react';
import { cx, Icon } from '../../shared/ui';
import { CHART_COLORS, CYCLE_LABEL, HEALTH_LABEL, HEALTH_LIMITS } from '../config';
import { eur, formatDay2, invoicePeriodLabel, lowerFirst, monthLabel, monthShort, pct, plural, thousands, yearOf } from '../format';
import { allMonths, clientStats, comparison, financialHealth, invoiceStatus, missingOf, monthsOfYear, monthTotals, openInvoices, periodMonths, totalsFor } from '../rules';
import type { HealthCheck, HealthLevel, Totals } from '../types';
import { useRevenue } from './context';
import { Delta, Kpi, LinkButton, PageHeader, Panel, PeriodControls, SectionTabs, StatusPill, TonePill } from './parts';

export function OverviewScreen() {
  const { data, period, lastMonth, today, config } = useRevenue();
  const t = totalsFor(data, periodMonths(period, lastMonth), today);
  const cmp = comparison(period, lastMonth);
  const prev = cmp.months.length ? totalsFor(data, cmp.months, today) : null;

  return (
    <>
      <PageHeader eyebrow="Rendimentos" title="Rendimentos" lede="Acompanha faturação, custos e saúde financeira."><PeriodControls /></PageHeader>
      <SectionTabs />
      <div className="mt-[22px] grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
        <Kpi label="Faturado" value={eur(t.revenue)} icon="bars"><Delta current={t.revenue} previous={prev?.revenue ?? null} label={cmp.label} /></Kpi>
        <Kpi label="Recebido" value={eur(t.received)} icon="creditCard">{pct((t.received / t.revenue) * 100)} do faturado · {eur(t.revenue - t.received)} por receber</Kpi>
        <Kpi label={`Custos de equipa e ${config.productsShort}`} value={eur(t.costs)} icon="users"><Delta current={t.costs} previous={prev?.costs ?? null} label={cmp.label} lowerIsBetter /></Kpi>
        <Kpi label="Margem prevista" value={eur(t.margin)} icon="pie">
          <span className="flex items-center gap-1.5"><Icon name="trendUp" className="h-3.5 w-3.5 text-[#17643e]" />{pct((t.margin / t.revenue) * 100)} de margem</span>
        </Kpi>
      </div>
      <div className="mt-3.5 grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3.5"><HealthCard /><RevenueChart /></div>
        <div className="flex min-w-0 flex-col gap-3.5"><Receivables /><TopClients /></div>
      </div>
    </>
  );
}

const LIGHT: Record<HealthLevel, string> = { bad: 'bg-[#ef4444] shadow-[0_0_12px_#ef4444]', warn: 'bg-[#f5b40b] shadow-[0_0_12px_#f5b40b]', ok: 'bg-[#22c55e] shadow-[0_0_12px_#22c55e]' };
const CHECK_DOT: Record<HealthLevel, string> = { ok: 'bg-[#2e9e5b]', warn: 'bg-[#e0a30b]', bad: 'bg-[#e5484d]' };

function HealthCard() {
  const { data, period, lastMonth, today, config } = useRevenue();
  const [scope, setScope] = useState<'month' | 'year'>(period.view);
  const [lastView, setLastView] = useState(period.view);
  // Mudar para Mensal/Anual acompanha o âmbito do semáforo.
  if (lastView !== period.view) { setLastView(period.view); setScope(period.view); }

  const month = period.view === 'year' ? (period.year === yearOf(lastMonth) ? lastMonth : `${period.year}-12`) : period.month;
  const year = period.view === 'year' ? period.year : yearOf(period.month);
  const t: Totals = scope === 'year' ? totalsFor(data, monthsOfYear(year, lastMonth), today) : monthTotals(data, month, today);
  const { state, checks } = financialHealth(t);
  const names: Record<HealthCheck['key'], string> = { receipts: 'Recebimentos', team: 'Custos de equipa', products: config.products, margin: 'Margem' };
  const weak = checks.filter((c) => c.level !== 'ok').map((c) => lowerFirst(names[c.key]));
  const text = state === 'ok'
    ? 'A faturação e os recebimentos estão dentro do esperado e a margem mantém-se estável.'
    : `${state === 'warn' ? 'Acompanha de perto' : 'Ação necessária'}: ${weak.join(', ')} ${weak.length === 1 ? 'fora da meta' : 'fora das metas'}.${checks[1].level !== 'ok' ? ' As horas executadas superaram as horas faturáveis.' : ''}`;
  const line = (c: HealthCheck) => {
    const v = pct(c.value);
    switch (c.key) {
      case 'receipts': return <><b className="font-semibold text-slate-900">Recebimentos: {v}</b> do valor vencido (meta ≥ {HEALTH_LIMITS.receipts[0]}%)</>;
      case 'team': return <><b className="font-semibold text-slate-900">Custos de equipa: {v}</b> do faturado (meta ≤ {HEALTH_LIMITS.team[0]}%)</>;
      case 'products': return <><b className="font-semibold text-slate-900">{config.products}: {v}</b> do faturado (meta ≤ {HEALTH_LIMITS.products[0]}%)</>;
      default: return <><b className="font-semibold text-slate-900">Margem: {v}</b> (meta ≥ {HEALTH_LIMITS.margin[0]}%)</>;
    }
  };

  return (
    <Panel labelledBy="health-title"
      title={<>{scope === 'year' ? 'Saúde financeira do ano' : 'Saúde financeira do mês'} <small className="text-[13px] font-normal text-slate-500">· {scope === 'year' ? year : monthLabel(month)}</small></>}
      action={
        <div role="group" aria-label="Âmbito da saúde financeira" className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5">
          {(['month', 'year'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={scope === s} onClick={() => setScope(s)}
              className="rounded-md px-2.5 py-1 text-[12.5px] font-medium text-slate-600 aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:text-slate-900 aria-pressed:shadow-sm">
              {s === 'month' ? 'Mês' : 'Ano'}
            </button>
          ))}
        </div>
      }>
      <div className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-[22px] gap-y-4 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
        <div role="img" aria-label={`Semáforo: ${HEALTH_LABEL[state]}`} className="flex flex-col gap-[7px] rounded-[14px] bg-[#1f2429] px-2 py-[9px]">
          {(['bad', 'warn', 'ok'] as const).map((l) => <i key={l} className={cx('block h-6 w-6 rounded-full', state === l ? LIGHT[l] : 'bg-[#3a4047]')} />)}
        </div>
        <div>
          <h3 className={cx('text-2xl font-bold tracking-tight', state === 'ok' ? 'text-[#17643e]' : state === 'warn' ? 'text-[#9a6700]' : 'text-[#b42318]')}>{HEALTH_LABEL[state]}</h3>
          <p className="mt-1 text-[13.5px] text-slate-600">{text}</p>
        </div>
        <ul className="col-span-2 flex flex-col gap-2 sm:col-span-1">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start gap-2 text-[13px] text-slate-600">
              <span className={cx('-mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full text-white', CHECK_DOT[c.level])}>
                <Icon name={c.level === 'ok' ? 'check' : c.level === 'warn' ? 'alert' : 'x'} className="h-3 w-3" />
              </span>
              <span>{line(c)}<span className="sr-only"> — {c.level === 'ok' ? 'dentro da meta' : c.level === 'warn' ? 'atenção' : 'em risco'}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

const stepFor = (v: number) => (v > 40000 ? 20000 : v > 20000 ? 10000 : 5000);

/** Faturação (barra) vs custos de equipa + produtos (barra empilhada), com dica e vista em tabela. */
function RevenueChart() {
  const { data, period, lastMonth, today, config } = useRevenue();
  const [asTable, setAsTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const all = allMonths(lastMonth);
  const months = period.view === 'year' ? monthsOfYear(period.year, lastMonth) : all.slice(Math.max(0, all.indexOf(period.month) - 8), all.indexOf(period.month) + 1);
  const rows = months.map((mk) => monthTotals(data, mk, today));
  const peak = Math.max(...rows.map((r) => Math.max(r.revenue, r.costs))) * 1.05;
  const step = stepFor(peak);
  const max = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const tip = hover !== null ? rows[hover] : null;
  const legend: Array<[string, string]> = [[CHART_COLORS.revenue, 'Faturação'], [CHART_COLORS.team, 'Custos de equipa'], [CHART_COLORS.products, config.products]];

  return (
    <Panel labelledBy="chart-title" title="Faturação vs Custos operacionais"
      action={
        <ul aria-label="Legenda" className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] text-slate-600">
          {legend.map(([color, label]) => <li key={label} className="flex items-center gap-1.5"><span className="h-[11px] w-[11px] rounded-[3px]" style={{ background: color }} />{label}</li>)}
        </ul>
      }>
      {asTable ? (
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Faturação e custos por mês</caption>
            <thead><tr>{['Mês', 'Faturação', 'Custos de equipa', config.products, 'Margem'].map((h, i) => <th key={h} scope="col" className={cx('whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] font-semibold text-slate-600', i ? 'text-right' : 'text-left')}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.months[0]} className="border-b border-slate-200 last:border-0">
                  <th scope="row" className="px-3 py-2 text-left font-medium">{monthLabel(r.months[0])}</th>
                  <td className="px-3 py-2 text-right tabular-nums">{eur(r.revenue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{eur(r.team)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{eur(r.products)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{eur(r.margin)} <small className="text-slate-500">({pct((r.margin / r.revenue) * 100)})</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-3.5 h-[210px] pl-10 sm:h-[236px] sm:pl-[52px]" onMouseLeave={() => setHover(null)}>
          <div className="absolute bottom-[26px] left-10 right-0 top-0 sm:left-[52px]" aria-hidden="true">
            {ticks.map((v) => (
              <div key={v} className={cx('absolute inset-x-0 border-t', v ? 'border-slate-100' : 'border-slate-300')} style={{ bottom: `${(v / max) * 100}%` }}>
                <span className="absolute right-[calc(100%+8px)] top-[-8px] whitespace-nowrap text-[11.5px] tabular-nums text-slate-500">{thousands(v)}</span>
              </div>
            ))}
          </div>
          <div className="absolute inset-y-0 left-10 right-0 flex sm:left-[52px]">
            {rows.map((r, i) => {
              const selected = period.view === 'month' && r.months[0] === period.month;
              return (
                <button key={r.months[0]} type="button" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  aria-label={`${monthLabel(r.months[0])}: faturação ${eur(r.revenue)}, custos de equipa ${eur(r.team)}, ${lowerFirst(config.products)} ${eur(r.products)}, margem ${eur(r.margin)}`}
                  className="group relative flex min-w-0 flex-1 flex-col items-center rounded-lg focus:outline-none">
                  <span className={cx('flex w-full flex-1 items-end justify-center gap-0.5 rounded-t-lg px-px sm:gap-[3px] sm:px-[3px]', hover === i && 'bg-[#17643e]/[0.06]', 'group-focus-visible:ring-2 group-focus-visible:ring-[#17643e]')}>
                    <span className="flex h-full w-[min(12px,32%)] flex-col-reverse sm:w-[min(16px,34%)]">
                      <i className="block rounded-t" style={{ height: `${(r.revenue / max) * 100}%`, background: CHART_COLORS.revenue }} />
                    </span>
                    <span className="flex h-full w-[min(12px,32%)] flex-col-reverse gap-0.5 sm:w-[min(16px,34%)]">
                      <i className="block" style={{ height: `${(r.team / max) * 100}%`, background: CHART_COLORS.team }} />
                      <i className="block rounded-t" style={{ height: `${Math.max((r.products / max) * 100, 0.8)}%`, background: CHART_COLORS.products }} />
                    </span>
                  </span>
                  <span className={cx('flex h-[26px] items-center text-[11px] sm:text-xs', selected ? 'font-bold text-slate-900' : 'text-slate-500')}>{monthShort(r.months[0])}</span>
                  {selected && <span aria-hidden="true" className="absolute bottom-0.5 h-0.5 w-3.5 rounded bg-[#17643e]" />}
                </button>
              );
            })}
          </div>
          {tip && hover !== null && (
            <div className="pointer-events-none absolute top-[-8px] z-10 w-[210px] rounded-[10px] bg-[#16201b] px-3 py-2.5 text-[12.5px] text-white shadow-xl"
              style={{ left: `clamp(0px, calc(${((hover + 0.5) / rows.length) * 100}% - 105px), calc(100% - 210px))` }}>
              <b className="mb-1 block text-[13px]">{monthLabel(tip.months[0])}</b>
              {([[CHART_COLORS.revenue, 'Faturação', tip.revenue], [CHART_COLORS.team, 'Custos de equipa', tip.team], [CHART_COLORS.products, config.products, tip.products]] as const).map(([c, l, v]) => (
                <div key={l} className="flex items-center justify-between gap-2.5 leading-[1.7]"><span className="flex items-center gap-1.5 text-[#cfd8d3]"><i className="h-[11px] w-[11px] rounded-[3px]" style={{ background: c }} />{l}</span>{eur(v)}</div>
              ))}
              <div className="mt-1 flex justify-between border-t border-white/20 pt-1"><span className="text-[#cfd8d3]">Margem</span>{eur(tip.margin)} · {pct((tip.margin / tip.revenue) * 100)}</div>
            </div>
          )}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 rounded-[9px] bg-[#edf3fb] px-3 py-2 text-[12.5px] text-[#2a5592]">
        <Icon name="info" className="h-4 w-4" />Custos operacionais incluem custos de equipa (horas e deslocações) e {lowerFirst(config.products)}.
      </div>
      <div className="mt-2 text-right"><LinkButton icon={asTable ? 'bars' : 'table'} onClick={() => setAsTable((v) => !v)}>{asTable ? 'Ver gráfico' : 'Ver como tabela'}</LinkButton></div>
    </Panel>
  );
}

const rowButton = 'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1 rounded-lg px-1 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e] min-[460px]:grid-cols-[minmax(0,1fr)_auto_auto]';

function Receivables() {
  const { data, today, openInvoice, seeOpenPayments } = useRevenue();
  const open = openInvoices(data, today);
  const late = open.filter((x) => invoiceStatus(x, today) === 'late');
  const pending = open.filter((x) => invoiceStatus(x, today) === 'pending');
  const sum = (list: typeof open) => list.reduce((s, x) => s + missingOf(x), 0);

  return (
    <Panel labelledBy="recv-title" title="Pagamentos a receber" action={<LinkButton icon="arrow" onClick={seeOpenPayments}>Ver todos</LinkButton>}>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="min-w-[120px] flex-1 rounded-[10px] bg-[#fdecea] px-2.5 py-2 text-xs text-[#b42318]"><b className="block text-[15px] tabular-nums">{eur(sum(late))}</b>{plural(late.length, 'fatura em atraso', 'faturas em atraso')}</span>
        <span className="min-w-[120px] flex-1 rounded-[10px] bg-[#fdf6de] px-2.5 py-2 text-xs text-[#7a5406]"><b className="block text-[15px] tabular-nums">{eur(sum(pending))}</b>{plural(pending.length, 'fatura pendente', 'faturas pendentes')}</span>
      </div>
      {open.length ? (
        <ul className="mt-2.5 divide-y divide-slate-200">
          {open.slice(0, 5).map((inv) => {
            const client = data.clients.find((c) => c.id === inv.clientId);
            return (
              <li key={inv.id}>
                <button type="button" className={rowButton} onClick={() => openInvoice(inv.id)}>
                  <span className="min-w-0"><b className="block truncate font-semibold">{client?.name}</b><small className="block text-xs text-slate-500">Fatura {inv.id} · {invoicePeriodLabel(inv.from, inv.to)}</small></span>
                  <span className="text-right"><b className="block whitespace-nowrap tabular-nums">{eur(missingOf(inv))}</b><small className="block text-xs text-slate-500">{formatDay2(inv.due)}</small></span>
                  <span className="col-span-2 min-[460px]:col-span-1"><StatusPill status={invoiceStatus(inv, today)} /></span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="px-4 py-9 text-center text-slate-500"><b className="block text-[15px] text-slate-900">Tudo recebido</b>Não há pagamentos por receber.</p>}
    </Panel>
  );
}

function TopClients() {
  const { data, period, lastMonth, openClient, go } = useRevenue();
  const months = periodMonths(period, lastMonth);
  const rows = data.clients.map((c) => ({ c, t: clientStats(data, c, months).total })).sort((a, b) => b.t.margin - a.t.margin).slice(0, 4);
  return (
    <Panel labelledBy="top-title" title="Rentabilidade por cliente" action={<LinkButton icon="arrow" onClick={() => go('clients')}>Ver todos</LinkButton>}>
      <ul className="mt-2.5 divide-y divide-slate-200">
        {rows.map(({ c, t }) => (
          <li key={c.id}>
            <button type="button" className={rowButton} onClick={() => openClient(c.id)}>
              <span className="min-w-0"><b className="block truncate font-semibold">{c.name}</b><small className="block text-xs text-slate-500">{c.supply === 'included' ? 'Incluído no serviço' : 'Fornecido pelo cliente'} · {CYCLE_LABEL[c.cycle]}</small></span>
              <span className="text-right"><b className="block whitespace-nowrap tabular-nums">{eur(t.margin)}</b><small className="block text-xs text-slate-500">de {eur(t.revenue)}</small></span>
              <span className="col-span-2 min-[460px]:col-span-1"><TonePill tone="neutral">{pct((t.margin / t.revenue) * 100)}</TonePill></span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
