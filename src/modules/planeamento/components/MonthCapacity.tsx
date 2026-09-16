import { useRef, useState } from 'react';
import { Icon, TextLink, type IconName } from '../../shared/ui';
import { lowerFirst } from '../config';
import { formatMonth, MONTHS, plural, shortMonth, toDate } from '../dates';
import { demoCheckouts } from '../mockData';
import { analyseMonth } from '../rules';
import { usePlanning } from './context';

/*
 * Cores do gráfico validadas (tamanho, croma, separação CVD). Os destaques
 * levam sempre valor escrito, legenda e tabela — nunca só cor.
 */
const BAR = '#279a5e';
const BAR_HIGH = '#e39212';
const BAR_PEAK = '#c9302a';

function SummaryCard({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub?: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#e9f4ee] text-[#17643e]"><Icon name={icon} /></span>
      <div>
        <small className="block text-xs text-slate-500">{label}</small>
        <b className="mt-0.5 block text-lg font-bold tracking-tight">{value}</b>
        {sub && <span className="block text-[12.5px] text-slate-600">{sub}</span>}
      </div>
    </div>
  );
}

/** Vista mensal: capacidade baseada só em saídas (check-outs). */
export function MonthCapacity({ date, values: providedValues }: { date: string; values?: number[] }) {
  const { data, config, people } = usePlanning();
  const d = toDate(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const values = providedValues ?? demoCheckouts(year, month);
  const M = analyseMonth(values, year, month, people, data.absences, config.capacity.perPersonDay);
  const [metricOne, metricMany] = config.capacity.metric;
  const monthName = MONTHS[month];
  const max = Math.max(15, Math.ceil(M.peak.value / 5) * 5);
  const ticks = Array.from({ length: max / 5 + 1 }, (_, i) => i * 5);
  const [showTable, setShowTable] = useState(false);
  const [tip, setTip] = useState<{ day: number; value: number; x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const tagFor = (day: number) => (day === M.peak.day ? `Pico de ${metricMany}` : day === M.high.day ? 'Dia de maior carga' : '');
  const showTip = (el: HTMLElement, day: number, value: number) => {
    const card = cardRef.current?.getBoundingClientRect();
    const bar = el.getBoundingClientRect();
    const mark = el.querySelector('i')?.getBoundingClientRect();
    if (!card || !mark) return;
    setTip({ day, value, x: bar.left - card.left + bar.width / 2, y: mark.top - card.top - 8 });
  };
  const top2 = [M.peak, M.high].sort((a, b) => a.day - b.day);
  const capitalised = metricMany.charAt(0).toUpperCase() + metricMany.slice(1);

  return (
    <>
      <section className="mt-5">
        <h2 className="text-xl font-bold tracking-tight">Capacidade mensal</h2>
        <p className="mt-1 text-[14.5px] text-slate-600">{config.capacity.subtitle}</p>
      </section>

      {M.extraPeople > 0 ? (
        <div role="alert" className="mt-4 flex gap-3 rounded-xl border border-[#f3c3be] bg-[#fdf0ef] px-4 py-3 text-[#8f2219]">
          <Icon name="alert" className="mt-px h-[18px] w-[18px]" />
          <div>
            <b className="block font-semibold">Pico de {metricMany} previsto</b>
            <p className="mt-0.5 text-[13px] text-slate-700">
              Existem {M.peak.value} {metricMany} no dia {M.peak.day} de {monthName}. Com {plural(M.availablePeople, `${lowerFirst(config.person.singular)} disponível`, `${lowerFirst(config.person.plural)} disponíveis`)} (≈ {M.capacity} {metricMany}),
              recomendamos reforçar a equipa com mais {M.extraPeople}–{M.extraPeople + 1} {lowerFirst(config.person.plural)}.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-3 rounded-xl border border-[#cde5d6] bg-[#e7f5ec] px-4 py-3 text-[#17643e]">
          <Icon name="check" className="mt-px h-[18px] w-[18px]" />
          <div>
            <b className="block font-semibold">Capacidade suficiente</b>
            <p className="mt-0.5 text-[13px] text-slate-700">O dia com mais {metricMany} ({M.peak.day} de {monthName}, {M.peak.value}) está dentro da capacidade estimada.</p>
          </div>
        </div>
      )}

      <div ref={cardRef} className="relative mt-4 rounded-xl border border-slate-200 bg-white px-[18px] pb-3 pt-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div>
            <h3 id="capacity-title" className="text-base font-semibold">{config.capacity.title}</h3>
            <p className="mt-0.5 text-[12.5px] text-slate-500">{formatMonth(date)} · {config.capacity.scopeNote}</p>
          </div>
          <div aria-hidden="true" className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-slate-700">
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: BAR }} />{capitalised}</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: BAR_HIGH }} />Dia de maior carga</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: BAR_PEAK }} />Pico de {metricMany}</span>
          </div>
        </div>

        <div className="mt-2.5 overflow-x-auto">
          <div className="min-w-[620px] pt-3" onMouseLeave={() => setTip(null)}>
            <div role="img" aria-labelledby="capacity-title" aria-describedby="capacity-desc" className="grid grid-cols-[28px_1fr]">
              <div aria-hidden="true" className="relative h-[200px]">
                {ticks.map((t) => <span key={t} className="absolute right-1.5 translate-y-1/2 text-[11px] tabular-nums text-slate-500" style={{ bottom: `${(t / max) * 100}%` }}>{t}</span>)}
              </div>
              <div className="relative h-[200px] border-b border-slate-300">
                {ticks.map((t) => <div key={t} className="absolute inset-x-0 h-px bg-slate-200" style={{ bottom: `${(t / max) * 100}%` }} />)}
                <div className="absolute inset-0 grid items-end gap-0.5" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
                  {values.map((v, i) => {
                    const day = i + 1;
                    const tag = tagFor(day);
                    const color = day === M.peak.day ? BAR_PEAK : day === M.high.day ? BAR_HIGH : BAR;
                    return (
                      <div key={day} tabIndex={0} aria-label={`${day} de ${monthName}: ${v} ${metricMany}${tag ? `, ${tag}` : ''}`}
                        onMouseEnter={(e) => showTip(e.currentTarget, day, v)} onFocus={(e) => showTip(e.currentTarget, day, v)} onBlur={() => setTip(null)}
                        className="relative flex h-full items-end justify-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
                        {tag && <span className="absolute text-[11.5px] font-bold tabular-nums text-slate-900" style={{ bottom: `calc(${(v / max) * 100}% + 3px)` }}>{v}</span>}
                        <i className="block w-[min(70%,18px)] rounded-t transition hover:brightness-90" style={{ height: `${(v / max) * 100}%`, background: color }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div aria-hidden="true" className="ml-7 grid gap-0.5" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
              {values.map((_, i) => {
                const weekday = new Date(year, month, i + 1).getDay();
                return <span key={i} className={`pt-1 text-center text-[10.5px] tabular-nums ${weekday === 0 || weekday === 6 ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>{i + 1}</span>;
              })}
            </div>
          </div>
        </div>
        {tip && (
          <div role="status" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-[#16201b] px-2.5 py-1.5 text-xs text-white shadow-xl" style={{ left: tip.x, top: tip.y }}>
            <b className="block">{tip.day} de {monthName}</b>{tip.value} {metricMany}{tagFor(tip.day) ? ` · ${tagFor(tip.day)}` : ''}
          </div>
        )}
        <p id="capacity-desc" className="sr-only">Pico no dia {M.peak.day} com {M.peak.value} {metricMany}; segundo dia de maior carga no dia {M.high.day} com {M.high.value}.</p>

        <div className="mt-2"><TextLink aria-expanded={showTable} onClick={() => setShowTable((v) => !v)}>{showTable ? 'Esconder tabela' : 'Ver dados em tabela'}</TextLink></div>
        {showTable && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px] tabular-nums">
              <thead><tr className="bg-slate-50 text-left text-slate-500 [&>th]:border-b [&>th]:border-slate-200 [&>th]:px-2 [&>th]:py-1.5 [&>th]:font-medium"><th>Dia</th><th>{capitalised}</th><th>Destaque</th></tr></thead>
              <tbody>
                {values.map((v, i) => (
                  <tr key={i} className="[&>td]:border-b [&>td]:border-slate-200 [&>td]:px-2 [&>td]:py-1.5">
                    <td>{i + 1} {shortMonth(month)}</td><td>{v}</td><td>{i + 1 === M.peak.day ? 'Pico' : i + 1 === M.high.day ? 'Maior carga' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h3 className="mt-5 text-base font-semibold">Resumo do mês</h3>
      <div className="mt-2.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon="calendar" label={`Total de ${metricMany}`} value={String(M.total)} />
        <SummaryCard icon="bars" label="Média diária" value={M.average.toFixed(1).replace('.', ',')} />
        <SummaryCard icon="checkout" label={`Dia com mais ${metricMany}`} value={`${M.peak.day} de ${monthName}`} sub={plural(M.peak.value, metricOne, metricMany)} />
        <SummaryCard icon="users" label="Dias de maior carga" value={`${top2[0].day} e ${top2[1].day} de ${monthName}`} sub={`${top2[0].value} e ${top2[1].value} ${metricMany}`} />
      </div>
    </>
  );
}
