import type { ReactNode } from 'react';
import { cx, focusRing, Icon, type IconName } from '../../shared/ui';
import type { ServiceDef } from '../types';

export function PageHead({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p>}
        <h1 className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]">{title}</h1>
        {subtitle && <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[14.5px] text-slate-600">{subtitle}</div>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">{actions}</div>}
    </section>
  );
}

export interface Crumb {
  label: string;
  onClick?: () => void;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Localização" className="mb-3.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-slate-500">
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true" className="text-slate-400">/</span>}
          {c.onClick ? (
            <button type="button" onClick={c.onClick} className={`hover:text-[#17643e] hover:underline hover:underline-offset-[3px] ${focusRing}`}>{c.label}</button>
          ) : (
            <span aria-current="page" className="font-medium text-slate-700">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Card({ title, aside, className, children }: { title?: ReactNode; aside?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:px-[18px] sm:py-4', className)}>
      {(title || aside) && (
        <div className="mb-3 flex items-center justify-between gap-2.5">
          {title && <h3 className="text-[14.5px] font-semibold">{title}</h3>}
          {aside && <div className="text-[12.5px] text-slate-500">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const SVC_TONES = {
  ok: 'bg-[#e7f5ec] text-[#17643e]',
  info: 'bg-[#edf3fb] text-[#2a5592]',
  neutral: 'bg-slate-100 text-slate-600',
  warn: 'bg-[#fdf3d7] text-[#80570a]',
  bad: 'bg-[#fdecea] text-[#b42318]',
} as const;

export type ChipTone = keyof typeof SVC_TONES;

export function TagChip({ tone, title, children }: { tone: ChipTone; title?: string; children: ReactNode }) {
  return <span title={title} className={cx('inline-flex h-[22px] items-center whitespace-nowrap rounded-md px-2 text-[11.5px] font-medium', SVC_TONES[tone])}>{children}</span>;
}

export const ServiceChip = ({ service }: { service: ServiceDef }) => <TagChip tone={service.tone}>{service.label}</TagChip>;

/** Pequena etiqueta cinzenta (ex.: "Do alojamento"). */
export const MiniTag = ({ children }: { children: ReactNode }) => (
  <span className="ml-1.5 rounded-[5px] bg-slate-100 px-1.5 py-px align-[1px] text-[11px] font-semibold text-slate-500">{children}</span>
);

export function Note({ tone = 'info', icon = 'info', children, className }: { tone?: 'info' | 'warn' | 'plain'; icon?: IconName; children: ReactNode; className?: string }) {
  const tones = {
    info: 'border-[#d5e2f3] bg-[#edf3fb] text-[#2a5592]',
    warn: 'border-[#f3dfae] bg-[#fffaf0] text-[#80570a]',
    plain: 'border-slate-200 bg-slate-50 text-slate-600',
  };
  return (
    <div className={cx('flex gap-2 rounded-[10px] border px-3 py-2.5 text-[12.5px]', tones[tone], className)}>
      <Icon name={icon} className="mt-px h-4 w-4" />
      <div>{children}</div>
    </div>
  );
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
      <b className="block text-[22px] font-bold tracking-tight tabular-nums">{value}</b>
      <span className="text-[12.5px] text-slate-500">{label}</span>
    </div>
  );
}
