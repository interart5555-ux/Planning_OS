import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx, Icon, IconButton, inputBase, inputError, selectBase, selectStyle, useDialogFocus, type IconName } from '../../shared/ui';
import { ORDER_STATUS, OWNER_LABEL, STOCK_STATE, type Tone } from '../config';
import { stateOf } from '../rules';
import type { Glyph, OrderStatus, Owner, Product, Screen } from '../types';
import { useInventoryUi } from './context';

export const cardShadow = 'shadow-[0_1px_2px_rgba(17,24,39,.04),0_8px_24px_-16px_rgba(17,24,39,.22)]';
export const card = `rounded-[14px] border border-slate-200 bg-white ${cardShadow}`;
export const ctl = cx(inputBase, 'min-h-10 text-sm');
export const ctlSelect = cx(selectBase, 'min-h-10 text-sm');
export { inputError, selectStyle };

/* ---------- estados ---------- */

const TONES: Record<Tone, { pill: string; dot: string }> = {
  ok: { pill: 'bg-[#e7f5ec] text-[#17643e]', dot: 'bg-[#2e9e5b]' },
  warn: { pill: 'bg-[#fdf6de] text-[#7a5406]', dot: 'bg-[#e0a30b]' },
  bad: { pill: 'bg-[#fdecea] text-[#b42318]', dot: 'bg-[#e5484d]' },
  info: { pill: 'bg-[#e8f1fc] text-[#2a5592]', dot: 'bg-[#3b82d6]' },
  neutral: { pill: 'bg-[#eef0f3] text-slate-700', dot: 'bg-slate-400' },
};

export function TonePill({ tone, children, dot = true, className }: { tone: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-semibold', TONES[tone].pill, className)}>
      {dot && <span aria-hidden="true" className={cx('h-[7px] w-[7px] rounded-full', TONES[tone].dot)} />}{children}
    </span>
  );
}
export const StatePill = ({ product }: { product: Product }) =>
  product.active ? <TonePill tone={STOCK_STATE[stateOf(product)].tone}>{STOCK_STATE[stateOf(product)].label}</TonePill> : <TonePill tone="neutral" dot={false}>Arquivado</TonePill>;
export const OrderPill = ({ status }: { status: OrderStatus }) => <TonePill tone={ORDER_STATUS[status].tone}>{ORDER_STATUS[status].label}</TonePill>;

export function OwnerPill({ owner }: { owner: Owner }) {
  return <span className={cx('inline-flex h-6 items-center whitespace-nowrap rounded-[7px] px-2 text-[12.5px] font-semibold', owner === 'client' ? 'bg-[#e8f1fc] text-[#2a5592]' : 'bg-[#e7f5ec] text-[#17643e]')}>{OWNER_LABEL[owner]}</span>;
}
/** Selo do proprietário na ficha: "Fornecido pelo cliente" ou "Stock da empresa". */
export const SuppliedBadge = ({ owner }: { owner: Owner }) => <TonePill tone={owner === 'client' ? 'info' : 'ok'} className="h-[26px]">{owner === 'client' ? 'Fornecido pelo cliente' : 'Stock da empresa'}</TonePill>;

/* ---------- ícones de produto (em vez de fotografias) ---------- */

const GLYPH: Record<Glyph, ReactNode> = {
  bottle: <><path d="M9.5 2h5v3l2 3v13a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V8l2-3z" fill="#3b82d6" /><rect x="9" y="11" width="6" height="5" rx="1" fill="#fff" opacity=".85" /></>,
  jug: <><path d="M8 3h5v2h3a3 3 0 0 1 3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9l3-4z" fill="#eef1f5" stroke="#9aa6b2" /><rect x="8" y="12" width="7" height="5" rx="1" fill="#3b82d6" /></>,
  spray: <><path d="M8 8.5h7V21a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" fill="#3b82d6" /><path d="M9 4h5l3.5 2H15v2.5H9z" fill="#1f5fa8" /><rect x="9.5" y="12.5" width="4" height="4" rx=".6" fill="#fff" opacity=".85" /></>,
  roll: <><path d="M9 5h9v14H9" fill="#f7f7f8" stroke="#a1a1aa" /><ellipse cx="9" cy="12" rx="5" ry="7" fill="#f7f7f8" stroke="#a1a1aa" /><ellipse cx="9" cy="12" rx="1.6" ry="2.4" fill="#d4d4d8" /></>,
  bag: <><rect x="3.5" y="7" width="17" height="11" rx="5.5" fill="#27272a" /><ellipse cx="8" cy="12.5" rx="2" ry="3" fill="#52525b" /></>,
  cloth: <><path d="M3 12.5 12 5l9 6-9 8z" fill="#3b82d6" /><path d="M3 12.5l9 6.5v2l-9-6.5z" fill="#1f5fa8" /></>,
  sponge: <><path d="M3.5 10 14 5l6.5 4-10 6z" fill="#16a34a" /><path d="M3.5 10v4l7 5v-4z" fill="#15803d" /><path d="M10.5 15v4l10-6V9z" fill="#facc15" /></>,
  glove: <path d="M8 21v-6L5 11a1.3 1.3 0 0 1 2-1.6l2 2V4.5a1.2 1.2 0 0 1 2.4 0V10 3.5a1.2 1.2 0 0 1 2.4 0V10 4.5a1.2 1.2 0 0 1 2.4 0V11 7a1.2 1.2 0 0 1 2.4 0v8l-2 6z" fill="#60a5fa" />,
  mask: <><path d="M4 10c3-3 13-3 16 0v4c-3 4-13 4-16 0z" fill="#f7f7f8" stroke="#a1a1aa" /><path d="M4 11H2M20 11h2M8 12h8" stroke="#a1a1aa" /></>,
  vacuum: <><rect x="5.5" y="9" width="9" height="11" rx="3" fill="#71717a" /><circle cx="10" cy="14.5" r="2.4" fill="#d4d4d8" /><path d="M14.5 12 19 3.5" stroke="#3f3f46" strokeWidth="2" strokeLinecap="round" /></>,
  mop: <><path d="M12 2v12" stroke="#a16207" strokeWidth="2" strokeLinecap="round" /><path d="M6 14h12l1 7H5z" fill="#60a5fa" /></>,
  box: <><path d="M3 8l9-4 9 4v9l-9 4-9-4z" fill="#d6a15a" /><path d="M3 8l9 4 9-4M12 12v9" stroke="#a86f2a" fill="none" /></>,
};

export function ProductGlyph({ glyph, large, archived }: { glyph: Glyph; large?: boolean; archived?: boolean }) {
  return (
    <span aria-hidden="true" className={cx('grid shrink-0 place-items-center bg-slate-100', large ? 'h-[84px] w-[84px] rounded-2xl' : 'h-[34px] w-[34px] rounded-[9px]', archived && 'opacity-60 grayscale')}>
      <svg viewBox="0 0 24 24" className={large ? 'h-[52px] w-[52px]' : 'h-[22px] w-[22px]'}>{GLYPH[glyph]}</svg>
    </span>
  );
}

export const LOCATION_ICON: Record<string, IconName> = { Armazém: 'building', Carrinha: 'car', Alojamento: 'home', Unidade: 'bed' };
export function LocationIcon({ type }: { type: string }) {
  return <span aria-hidden="true" className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-slate-100 text-slate-600"><Icon name={LOCATION_ICON[type] ?? 'pin'} className="h-[18px] w-[18px]" /></span>;
}

/* ---------- cabeçalho e navegação ---------- */

export function PageHeader({ title, lede, children }: { title: string; lede: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3.5">
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">Limpezas · Inventário</p>
        <h1 id="page-title" tabIndex={-1} className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight focus:outline-none sm:text-[30px]">{title}</h1>
        <p className="mt-1.5 text-[14.5px] text-slate-600">{lede}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  );
}

const SCREENS: Array<[Screen, string]> = [['resumo', 'Resumo'], ['produtos', 'Produtos'], ['locais', 'Locais de stock'], ['movimentos', 'Movimentos'], ['fornecedores', 'Fornecedores e compras']];
export function SectionTabs() {
  const { screen, go } = useInventoryUi();
  return (
    <div role="tablist" aria-label="Secções do inventário" className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {SCREENS.map(([key, label]) => (
        <button key={key} type="button" role="tab" aria-selected={screen === key} onClick={() => go(key)}
          className={cx('-mb-px whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]',
            screen === key ? 'border-[#17643e] bg-[#e9f4ee] font-semibold text-[#17643e]' : 'border-transparent font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Separadores sublinhados (dentro de uma secção ou painel). */
export function UnderlineTabs<T extends string>({ label, value, tabs, onChange, className }: { label: string; value: T; tabs: Array<[T, string]>; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cx('flex gap-[18px] border-b border-slate-200', className)}>
      {tabs.map(([key, text]) => (
        <button key={key} type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)}
          className={cx('-mb-px border-b-2 px-0.5 py-2.5 text-[13.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]', value === key ? 'border-[#17643e] font-semibold text-[#17643e]' : 'border-transparent font-medium text-slate-500 hover:text-slate-800')}>
          {text}
        </button>
      ))}
    </div>
  );
}

/* ---------- blocos ---------- */

export function Panel({ title, action, children, className, id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  const titleId = useId();
  return (
    <section id={id} tabIndex={id ? -1 : undefined} aria-labelledby={title ? titleId : undefined} className={cx(card, 'min-w-0 px-3.5 py-4 focus:outline-none sm:px-5 sm:py-[18px]', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {title && <h2 id={titleId} className="text-base font-semibold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function LinkButton({ children, onClick, icon, className }: { children: ReactNode; onClick: () => void; icon?: IconName; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cx('inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-[#17643e] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]', className)}>
      {children}{icon && <Icon name={icon} className="h-[15px] w-[15px]" />}
    </button>
  );
}

export function Note({ children, icon = 'info', className }: { children: ReactNode; icon?: IconName; className?: string }) {
  return <p className={cx('mt-2.5 flex gap-2 text-[12.5px] text-slate-500', className)}><Icon name={icon} className="mt-px h-[15px] w-[15px]" /><span>{children}</span></p>;
}

const BANNER = {
  info: 'border-[#d5e2f3] bg-[#edf3fb] text-[#2a5592] [&_p]:text-[#3b5d8d]',
  green: 'border-[#c3e3cf] bg-[#e7f5ec] text-[#17643e] [&_p]:text-[#2f6a4a]',
  warn: 'border-[#f1dfa4] bg-[#fdf6de] text-[#7a5406] [&_p]:text-[#7a5406]',
};
export function Banner({ tone = 'info', icon = 'info', title, children, className }: { tone?: keyof typeof BANNER; icon?: IconName; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div role="note" className={cx('mt-4 flex gap-3 rounded-xl border px-4 py-[13px]', BANNER[tone], className)}>
      <Icon name={icon} className="mt-px h-[22px] w-[22px]" />
      <div><b className="block text-sm font-semibold">{title}</b>{children && <p className="mt-0.5 text-[13px]">{children}</p>}</div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="px-4 py-9 text-center text-slate-500"><b className="mb-0.5 block text-[15px] text-slate-900">{title}</b>{children}</div>;
}

/* ---------- campos ---------- */

export function FilterSelect({ id, label, value, options, onChange, icon, className }: { id: string; label: string; value: string; options: Array<[string, string]>; onChange: (v: string) => void; icon?: IconName; className?: string }) {
  return (
    <div className={cx('relative min-w-0', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      {icon && <Icon name={icon} className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-600" />}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cx(ctlSelect, icon && 'pl-[38px]')} style={selectStyle}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

export function SearchInput({ id, label, value, onChange, placeholder, className }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cx('relative min-w-0', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
      <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(ctl, 'pl-[38px]')} />
    </div>
  );
}

/** Rótulo, campo e erro acessível. */
export function FormField({ id, label, required, optional, error, hint, children, className }: { id: string; label: ReactNode; required?: boolean; optional?: boolean; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx('mt-3.5 min-w-0', className)}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-slate-800">
        {label}{required && <span aria-hidden="true" className="text-red-700"> *</span>}{optional && <span className="font-normal text-slate-400"> (opcional)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-[12.5px] text-slate-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1.5 text-[13px] font-medium text-red-700">{error}</p>}
    </div>
  );
}
export const errProps = (id: string, error?: string) => (error ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {});

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex h-10 w-full rounded-[10px] border border-slate-300 bg-white p-[3px]">
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className="flex-1 rounded-[7px] px-3 text-[13.5px] font-medium text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e] aria-pressed:bg-[#17643e] aria-pressed:font-semibold aria-pressed:text-white">
          {text}
        </button>
      ))}
    </div>
  );
}

/* ---------- tabelas e cartões ---------- */

export const tableWrap = `relative mt-3 overflow-x-auto rounded-[14px] border border-slate-200 bg-white ${cardShadow}`;
export const th = 'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-[11px] text-left text-[12.5px] font-semibold text-slate-600';
export const td = 'border-b border-slate-200 px-3 py-2.5 align-middle text-[13.5px] [tr:last-child>&]:border-b-0';
export const onlyWide = 'hidden min-[860px]:block';
export const onlyNarrow = 'mt-3 flex flex-col gap-2.5 min-[860px]:hidden';

export function MobileCard({ title, subtitle, lead, badge, facts, actions }: { title: ReactNode; subtitle?: ReactNode; lead?: ReactNode; badge?: ReactNode; facts: Array<[string, ReactNode]>; actions?: ReactNode }) {
  return (
    <article className={cx(card, 'p-3.5')}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">{lead}<div className="min-w-0"><b className="block font-semibold">{title}</b>{subtitle && <small className="block text-[12.5px] text-slate-500">{subtitle}</small>}</div></div>
        {badge}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {facts.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-xs text-slate-500">{k}</dt><dd className="font-semibold tabular-nums [overflow-wrap:anywhere]">{v}</dd></div>)}
      </dl>
      {actions && <div className="mt-3 flex flex-wrap gap-2 [&>button]:min-h-11 [&>button]:flex-[1_1_120px]">{actions}</div>}
    </article>
  );
}

export function IconAction({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-[#17643e] hover:text-[#17643e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}

/* ---------- camadas ---------- */

/** Painel lateral direito com cabeçalho livre, conteúdo e rodapé. */
export function SidePanel({ label, head, footer, onClose, onBack, children }: { label: string; head: ReactNode; footer?: ReactNode; onClose: () => void; onBack?: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useDialogFocus(ref, onClose);
  return createPortal(
    <div className="fixed inset-0 z-50 text-sm text-slate-900 antialiased">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside ref={ref} data-dialog role="dialog" aria-modal="true" aria-label={label} className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col bg-white shadow-2xl">
        <div className="flex justify-between px-3 pt-3">
          {onBack ? <IconButton icon="chevronLeft" label="Voltar" onClick={onBack} /> : <span />}
          <IconButton icon="x" label="Fechar" data-autofocus onClick={onClose} />
        </div>
        <div className="px-4 sm:px-6">{head}</div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-[18px] sm:px-6">{children}</div>
        {footer && <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3.5 sm:px-6">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}

/** Diálogo centrado (formulários); `size="wide"` para encomendas. */
export function FormDialog({ title, lead, onClose, footer, size = 'md', children }: { title: string; lead?: ReactNode; onClose: () => void; footer: ReactNode; size?: 'md' | 'lg' | 'wide'; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogFocus(ref, onClose);
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 text-sm text-slate-900 antialiased">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div ref={ref} data-dialog role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={cx('relative flex max-h-[calc(100dvh-32px)] w-full flex-col rounded-2xl bg-white shadow-2xl', size === 'wide' ? 'max-w-[680px]' : size === 'lg' ? 'max-w-[600px]' : 'max-w-[520px]')}>
        <IconButton icon="x" label="Fechar" onClick={onClose} className="absolute right-3 top-3 z-10" />
        <div className="overflow-y-auto px-4 pb-5 pt-[22px] sm:px-6">
          <h2 id={titleId} className="pr-9 text-xl font-bold tracking-tight">{title}</h2>
          {lead && <p className="mt-1.5 text-slate-600">{lead}</p>}
          {children}
        </div>
        <div className="flex flex-wrap justify-end gap-2.5 border-t border-slate-200 px-4 py-3.5 sm:px-6 max-[479px]:[&>button]:flex-1">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}
