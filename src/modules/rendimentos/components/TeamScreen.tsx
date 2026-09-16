import { Button, cx } from '../../shared/ui';
import { eur, eur2, hrs, monthLabel, plural } from '../format';
import { allMonths, monthTotals, teamMonth } from '../rules';
import type { MonthKey } from '../types';
import { useRevenue } from './context';
import { cardsWrap, InfoBanner, Kpi, MemberAvatar, MobileCard, PageHeader, SectionTabs, Select, TonePill, tableWrap, td, th } from './parts';

export function TeamScreen({ month, onMonth }: { month: MonthKey; onMonth: (m: MonthKey) => void }) {
  const { config, data, today, lastMonth, openPerson } = useRevenue();
  const t = teamMonth(data, month);
  const products = monthTotals(data, month, today).products;
  const paid = t.rows.filter((r) => r.paid).length;
  const personLower = config.person.singular.toLowerCase();

  return (
    <>
      <PageHeader eyebrow="Rendimentos" title="Custos de equipa" lede="Controla os custos com a tua equipa e acompanha os pagamentos.">
        <span className="text-[13px] text-slate-500" aria-hidden="true">Período</span>
        <Select id="team-month" label="Período" hideLabel className="min-w-[170px] flex-1 sm:flex-none" value={month} onChange={onMonth}
          options={allMonths(lastMonth).slice().reverse().map((m): [string, string] => [m, monthLabel(m)])} />
      </PageHeader>
      <SectionTabs />

      <div className="mt-[22px] grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
        <Kpi label="Total de horas" value={hrs(t.execHours)} icon="clock">{hrs(t.billedHours)} faturáveis aos clientes</Kpi>
        <Kpi label="Custo base (horas)" value={eur(t.base)} icon="clock">Horas executadas × valor/hora</Kpi>
        <Kpi label={config.products} value={eur(products)} icon="bottle">Custo da empresa, não pago à equipa</Kpi>
        <Kpi label="Total a pagar" value={eur(t.total)} icon="wallet">Custo base + {eur(t.travel)} deslocações</Kpi>
      </div>

      <InfoBanner className="mt-4" icon="car" title="Deslocações pagas, não faturadas ao cliente">
        {eur(t.travel)} em deslocações entram no total a pagar à equipa e nos custos da empresa, mas não aumentam a faturação dos clientes.
      </InfoBanner>

      <div className="mt-3.5 flex flex-wrap justify-between gap-2 text-[13px] text-slate-500">
        <span>{plural(t.rows.length, personLower, config.person.plural.toLowerCase())} · {paid} pagos</span>
        <span>O valor/hora é definido no perfil de cada {personLower}.</span>
      </div>

      <div className={tableWrap}>
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Custos de equipa · {monthLabel(month)}</caption>
          <thead><tr>
            <th scope="col" className={th}>{config.person.singular}</th><th scope="col" className={th}>Função</th>
            {['Valor/hora', 'Horas executadas', 'Custo base', 'Deslocações', 'Total a pagar'].map((h) => <th key={h} scope="col" className={cx(th, 'text-right')}>{h}</th>)}
            <th scope="col" className={th}>Estado</th><th scope="col" className={cx(th, 'text-right')}>Ação</th>
          </tr></thead>
          <tbody>
            {t.rows.map((r) => (
              <tr key={r.person.id}>
                <td className={td}><span className="flex items-center gap-[9px]"><MemberAvatar person={r.person} />{r.person.name}</span></td>
                <td className={td}>{r.person.role}</td>
                <td className={cx(td, 'text-right tabular-nums')}>{eur2(r.person.rate)}</td>
                <td className={cx(td, 'text-right tabular-nums')}>{hrs(r.hours)}</td>
                <td className={cx(td, 'text-right tabular-nums')}>{eur(r.base)}</td>
                <td className={cx(td, 'text-right tabular-nums')}>{eur(r.travel)}</td>
                <td className={cx(td, 'text-right font-bold tabular-nums')}>{eur(r.total)}</td>
                <td className={td}>{r.paid ? <TonePill tone="ok">Pago</TonePill> : <TonePill tone="warn">Pendente</TonePill>}</td>
                <td className={cx(td, 'text-right')}><Button size="sm" aria-label={`Ver ${r.person.name}`} onClick={() => openPerson(r.person.id, month)}>Ver</Button></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-bold">
            <tr>
              <td colSpan={3} className="border-t border-slate-300 px-3.5 py-2.5">Total</td>
              <td className="border-t border-slate-300 px-3.5 py-2.5 text-right tabular-nums">{hrs(t.execHours)}</td>
              <td className="border-t border-slate-300 px-3.5 py-2.5 text-right tabular-nums">{eur(t.base)}</td>
              <td className="border-t border-slate-300 px-3.5 py-2.5 text-right tabular-nums">{eur(t.travel)}</td>
              <td className="border-t border-slate-300 px-3.5 py-2.5 text-right tabular-nums">{eur(t.total)}</td>
              <td colSpan={2} className="border-t border-slate-300" />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className={cardsWrap}>
        {t.rows.map((r) => (
          <MobileCard key={r.person.id} title={r.person.name} subtitle={`${r.person.role} · ${eur2(r.person.rate)}/h`}
            badge={r.paid ? <TonePill tone="ok">Pago</TonePill> : <TonePill tone="warn">Pendente</TonePill>}
            facts={[['Horas executadas', hrs(r.hours)], ['Deslocações', eur(r.travel)], ['Custo base', eur(r.base)], ['Total a pagar', eur(r.total)]]}
            action={<Button aria-label={`Ver ${r.person.name}`} onClick={() => openPerson(r.person.id, month)}>Ver</Button>} />
        ))}
        <MobileCard title="Total" facts={[['Horas', hrs(t.execHours)], ['Total a pagar', eur(t.total)], ['Custo base', eur(t.base)], ['Deslocações', eur(t.travel)]]} />
      </div>
    </>
  );
}
