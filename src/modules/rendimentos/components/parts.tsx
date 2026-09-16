import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx, Icon, IconButton, selectBase, selectStyle, useDialogFocus, type IconName } from '../../shared/ui';
import { INVOICE_STATUS } from '../config';
import { monthLabel, MON3, monthIdx, yearOf } from '../format';
import { allMonths } from '../rules';
import type { HealthLevel, InvoiceStatus, SupplyModel, TeamMember } from '../types';
import { useRevenue } from './context';

export const cardShadow = 'shadow-[0_1px_2px_rgba(17,24,39,.04),0_8px_24px_-16px_rgba(17,24,39,.22)]';
export const card = `rounded-[14px] border border-slate-200 bg-white ${cardShadow}`;

const TONE_PILL: Record<HealthLevel | 'neutral', { pill: string; dot: string }> = {
  ok: { pill: 'bg-[#e7f5ec] text-[#17643e]', dot: 'bg-[#2e9e5b]' },
  warn: { pill: 'bg-[#fdf6de] text-[#7a5406]', dot: 'bg-[#e0a30b]' },
  bad: { pill: 'bg-[#fdecea] text-[#b42318]', dot: 'bg-[#e5484d]' },
  neutral: { pill: 'bg-[#eef0f3] text-slate-700', dot: 'bg-slate-400' },
};

export function TonePill({ tone, children, className }: { tone: HealthLevel | 'neutral'; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-semibold', TONE_PILL[tone].pill, className)}>
      <span aria-hidden="true" className={cx('h-[7px] w-[7px] rounded-full', TONE_PILL[tone].dot)} />{children}
    </span>
  );
}

export const StatusPill = ({ status }: { status: InvoiceStatus }) => <TonePill tone={INVOICE_STATUS[status].tone}>{INVOICE_STATUS[status].label}</TonePill>;

export function SupplyPill({ supply }: { supply: SupplyModel }) {
  return supply === 'included' ? <TonePill tone="ok">Incluído no serviço</TonePill> : <TonePill tone="neutral">Fornecido pelo cliente</TonePill>;
}

const AV_TONES = ['bg-[#f3ead8] text-[#7a5406]', 'bg-[#fde4e1] text-[#a4271c]', 'bg-[#e3ecfb] text-[#2a5592]', 'bg-[#e2f3e8] text-[#17643e]', 'bg-[#ece6fb] text-[#5b3fb0]', 'bg-[#e6f1f3] text-[#1f6470]'];
export function MemberAvatar({ person }: { person: TeamMember }) {
  const parts = person.name.split(' ');
  return (
    <span aria-hidden="true" className={cx('inline-grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold', AV_TONES[person.tone % AV_TONES.length])}>
      {parts[0][0]}{parts[parts.length - 1][0]}
    </span>
  );
}

/** Cartão de resumo com ícone verde no canto. */
export function Kpi({ label, value, icon, children, className }: { label: string; value: string; icon: IconName; children?: ReactNode; className?: string }) {
  return (
    <div className={cx(card, 'relative min-w-0 px-3.5 py-3 sm:px-[18px] sm:py-4', className)}>
      <small className="block pr-8 text-[13px] text-slate-600">{label}</small>
      <Icon name={icon} className="absolute right-3.5 top-3.5 h-5 w-5 text-[#17643e] sm:h-6 sm:w-6" />
      <b className="mt-1.5 block whitespace-nowrap text-[21px] font-bold leading-tight tabular-nums tracking-tight sm:text-[26px]">{value}</b>
      {children && <div className="mt-1.5 text-[12.5px] text-slate-500">{children}</div>}
    </div>
  );
}

export function Delta({ current, previous, label, lowerIsBetter }: { current: number; previous: number | null; label: string; lowerIsBetter?: boolean }) {
  if (!previous) return <span>Sem período anterior</span>;
  const d = ((current - previous) / Math.abs(previous)) * 100;
  const up = d >= 0;
  const good = lowerIsBetter ? !up : up;
  return (
    <span className="flex items-center gap-1.5">
      <Icon name={up ? 'trendUp' : 'trendDown'} className={cx('h-3.5 w-3.5', good ? 'text-[#17643e]' : 'text-[#b42318]')} />
      {up ? '+ ' : '− '}{Math.abs(Math.round(d))}% {label}
    </span>
  );
}

export function PageHeader({ eyebrow, title, lede, children }: { eyebrow: string; title: string; lede: ReactNode; children?: ReactNode }) {
  const { config } = useRevenue();
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3.5">
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">{config.label} · {eyebrow}</p>
        <h1 id="page-title" tabIndex={-1} className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight focus:outline-none sm:text-[30px]">{title}</h1>
        <p className="mt-1.5 text-[14.5px] text-slate-600">{lede}</p>
      </div>
      {children && <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">{children}</div>}
    </div>
  );
}

export function Select({ id, label, value, options, onChange, hideLabel, className }: { id: string; label: string; value: string; options: Array<[string, string]>; onChange: (v: string) => void; hideLabel?: boolean; className?: string }) {
  return (
    <div className={cx('min-w-0', className)}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'mb-[5px] block text-xs font-medium text-slate-600'}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cx(selectBase, 'min-h-10 text-sm')} style={selectStyle}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

const yearLabel = (y: string, lastMonth: string) => `Ano ${y}${y === yearOf(lastMonth) ? ` (até ${MON3[monthIdx(lastMonth)]})` : ''}`;
export function periodLabel(view: 'month' | 'year', month: string, year: string, lastMonth: string): string {
  return view === 'year' ? yearLabel(year, lastMonth) : monthLabel(month);
}

/** Seletor de período e, opcionalmente, Mensal/Anual. */
export function PeriodControls({ withView = true }: { withView?: boolean }) {
  const { period, setPeriod, lastMonth } = useRevenue();
  const months = allMonths(lastMonth).slice().reverse();
  const years = [...new Set(months.map(yearOf))];
  return (
    <>
      <span className="text-[13px] text-slate-500" aria-hidden="true">Período</span>
      {period.view === 'year'
        ? <Select id="period-year" label="Período" hideLabel className="min-w-[170px] flex-1 sm:flex-none" value={period.year} onChange={(year) => setPeriod({ ...period, year })} options={years.map((y) => [y, yearLabel(y, lastMonth)])} />
        : <Select id="period-month" label="Período" hideLabel className="min-w-[170px] flex-1 sm:flex-none" value={period.month} onChange={(month) => setPeriod({ ...period, month, year: yearOf(month) })} options={months.map((m) => [m, monthLabel(m)])} />}
      {withView && (
        <div role="group" aria-label="Vista" className="flex h-10 rounded-[10px] border border-slate-300 bg-white p-[3px]">
          {(['month', 'year'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={period.view === v} onClick={() => setPeriod({ ...period, view: v })}
              className="min-w-[78px] rounded-[7px] px-3.5 text-[13.5px] font-medium text-slate-600 aria-pressed:bg-[#17643e] aria-pressed:font-semibold aria-pressed:text-white">
              {v === 'month' ? 'Mensal' : 'Anual'}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function SectionTabs() {
  const { screen, go } = useRevenue();
  const active = screen === 'client' ? 'clients' : screen;
  const tabs: Array<[typeof active, string]> = [['overview', 'Visão geral'], ['payments', 'Pagamentos de clientes'], ['team', 'Custos de equipa'], ['clients', 'Rentabilidade por cliente']];
  return (
    <div role="tablist" aria-label="Secções de rendimentos" className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map(([key, label]) => (
        <button key={key} type="button" role="tab" aria-selected={active === key} onClick={() => go(key)}
          className={cx('-mb-px whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]',
            active === key ? 'border-[#17643e] bg-[#e9f4ee] font-semibold text-[#17643e]' : 'border-transparent font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Panel({ title, action, children, className, labelledBy }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; labelledBy?: string }) {
  return (
    <section aria-labelledby={labelledBy} className={cx(card, 'min-w-0 px-3.5 py-4 sm:px-5 sm:py-[18px]', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {title && <h2 id={labelledBy} className="text-base font-semibold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function LinkButton({ children, onClick, icon }: { children: ReactNode; onClick: () => void; icon?: IconName }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-[#17643e] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
      {children}{icon && <Icon name={icon} className="h-[15px] w-[15px]" />}
    </button>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-2.5 flex gap-2 text-xs text-slate-500"><Icon name="info" className="mt-px h-[15px] w-[15px]" /><span>{children}</span></p>;
}

/** Aviso azul (ex.: deslocações pagas, não faturadas). */
export function InfoBanner({ icon, title, children, className }: { icon: IconName; title: string; children: ReactNode; className?: string }) {
  return (
    <div role="note" className={cx('flex gap-3 rounded-xl border border-[#d5e2f3] bg-[#edf3fb] px-4 py-[13px] text-[#2a5592]', className)}>
      <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[#2f6fca] text-white"><Icon name={icon} className="h-[15px] w-[15px]" /></span>
      <div><b className="block text-sm font-semibold">{title}</b><p className="mt-0.5 text-[13px] text-[#3b5d8d]">{children}</p></div>
    </div>
  );
}

/** Tabela em ecrãs largos (≥ 860 px); por baixo usa-se a lista de cartões. */
export const tableWrap = `mt-3 hidden overflow-x-auto rounded-[14px] border border-slate-200 bg-white ${cardShadow} min-[860px]:block`;
export const th = 'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3.5 py-[11px] text-left text-[12.5px] font-semibold text-slate-600';
export const td = 'whitespace-nowrap border-b border-slate-200 px-3.5 py-2.5 align-middle';
export const cardsWrap = 'mt-3 flex flex-col gap-2.5 min-[860px]:hidden';

export function MobileCard({ title, subtitle, badge, facts, action }: { title: ReactNode; subtitle?: ReactNode; badge?: ReactNode; facts: Array<[string, ReactNode]>; action?: ReactNode }) {
  return (
    <article className={cx(card, 'p-3.5')}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0"><b className="block font-semibold">{title}</b>{subtitle && <small className="block text-[12.5px] text-slate-500">{subtitle}</small>}</div>
        {badge}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {facts.map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>)}
      </dl>
      {action && <div className="mt-3 flex gap-2 [&>button]:min-h-11 [&>button]:flex-1">{action}</div>}
    </article>
  );
}

/** Painel lateral direito com cabeçalho, conteúdo e rodapé. */
export function SidePanel({ title, subtitle, badge, footer, onClose, children }: { title: string; subtitle: string; badge?: ReactNode; footer?: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useDialogFocus(ref, onClose);
  return createPortal(
    <div className="fixed inset-0 z-50 text-sm text-slate-900 antialiased">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside ref={ref} data-dialog role="dialog" aria-modal="true" aria-labelledby="panel-title" className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-white shadow-2xl">
        <div className="relative px-4 pt-5 sm:px-6">
          <h2 id="panel-title" className="pr-10 text-[21px] font-bold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-slate-500">{subtitle}</p>
          {badge && <div className="mt-2.5">{badge}</div>}
          <IconButton icon="x" label="Fechar" data-autofocus onClick={onClose} className="absolute right-3.5 top-3.5" />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-[18px] sm:px-6">{children}</div>
        {footer && <div className="flex flex-col gap-1.5 border-t border-slate-200 px-4 py-3.5 sm:px-6">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}

export function MoneyRows({ rows }: { rows: Array<{ label: ReactNode; value: string; tone?: 'ok' | 'bad'; sum?: boolean }> }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3.5 py-1">
      {rows.map((r, i) => (
        <div key={i} className={cx('flex justify-between gap-3 py-[9px] text-[13.5px] text-slate-600', i > 0 && (r.sum ? 'border-t border-slate-300' : 'border-t border-slate-200'))}>
          <span>{r.label}</span>
          <b className={cx('text-[15px] tabular-nums', r.tone === 'ok' ? 'text-[#17643e]' : r.tone === 'bad' ? 'text-[#b42318]' : 'text-slate-900')}>{r.value}</b>
        </div>
      ))}
    </div>
  );
}

export function MetaList({ items }: { items: Array<[string, ReactNode, string?]> }) {
  return (
    <dl className="mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-[7px] text-[13px]">
      {items.map(([k, v, cls]) => (
        <div key={k} className="contents">
          <dt className="text-slate-500">{k}</dt>
          <dd className={cx('text-right font-medium', cls)}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
