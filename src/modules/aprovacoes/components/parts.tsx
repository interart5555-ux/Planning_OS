import type { ReactNode } from 'react';
import { cx, Icon, selectBase, selectStyle } from '../../shared/ui';
import { STATUS_META } from '../config';
import { isAutoApproved } from '../rules';
import type { ApprovalsPerson, RecordStatus, WorkRecord } from '../types';

export function StatusPill({ status }: { status: RecordStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cx('inline-flex h-[26px] items-center gap-[5px] whitespace-nowrap rounded-full border px-2.5 text-[12.5px] font-semibold', meta.pill)}>
      <Icon name={meta.icon} className="h-3.5 w-3.5" />{meta.label}
    </span>
  );
}

const GRADIENTS = [
  'linear-gradient(150deg,#d8c7ab,#8e7759)', 'linear-gradient(150deg,#b9c9d2,#6f8795)', 'linear-gradient(150deg,#b8c0ac,#6d7a61)',
  'linear-gradient(150deg,#9cc3d6,#3f7892)', 'linear-gradient(150deg,#d4b8a6,#8a6a58)', 'linear-gradient(150deg,#c9c0d8,#7a6a97)',
  'linear-gradient(150deg,#e0cfa2,#a0864a)',
];
export const gradient = (i: number): string => GRADIENTS[i % GRADIENTS.length];

/** Miniatura simulada do local. */
export function Thumb({ index, large }: { index: number; large?: boolean }) {
  return (
    <span aria-hidden="true" style={{ background: gradient(index) }}
      className={cx('grid shrink-0 place-items-center text-white/85', large ? 'h-[52px] w-[66px] rounded-[9px]' : 'h-9 w-11 rounded-[7px]')}>
      <Icon name="home" className={large ? 'h-[22px] w-[22px]' : 'h-[17px] w-[17px]'} />
    </span>
  );
}

const TONES = ['bg-[#f3ead8] text-[#7a5406]', 'bg-[#fde4e1] text-[#a4271c]', 'bg-[#e3ecfb] text-[#2a5592]', 'bg-[#e2f3e8] text-[#17643e]', 'bg-[#ece6fb] text-[#5b3fb0]', 'bg-[#e6f1f3] text-[#1f6470]'];
const SIZES = { xs: 'h-[26px] w-[26px] text-[10.5px]', sm: 'h-[30px] w-[30px] text-[11px]', md: 'h-9 w-9 text-xs' };

export function PersonAvatar({ person, size = 'sm' }: { person: ApprovalsPerson | undefined; size?: keyof typeof SIZES }) {
  return (
    <span aria-hidden="true" className={cx('inline-grid shrink-0 place-items-center rounded-full font-semibold', SIZES[size], TONES[(person?.tone ?? 0) % TONES.length])}>
      {person?.initials ?? '?'}
    </span>
  );
}

/** Etiquetas das ocorrências que levaram à revisão. */
export function OccurrenceTags({ items, className }: { items: string[]; className?: string }) {
  if (!items.length) return null;
  return (
    <span className={cx('mt-[5px] flex flex-wrap gap-1', className)}>
      {items.map((x) => (
        <span key={x} className="whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-1.5 py-px text-[11.5px] font-medium text-slate-600">{x}</span>
      ))}
    </span>
  );
}

export function AutoTag({ record, className }: { record: WorkRecord; className?: string }) {
  if (!isAutoApproved(record)) return null;
  return (
    <span className={cx('mt-1 flex items-center gap-1 whitespace-nowrap text-[11.5px] font-semibold text-[#17643e]', className)}>
      <Icon name="shield" className="h-[13px] w-[13px]" />Automática
    </span>
  );
}

export function SelectField({ id, label, value, options, onChange, className }: { id: string; label: ReactNode; value: string; options: Array<[string, string]>; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={cx('min-w-0', className)}>
      <label htmlFor={id} className="mb-[5px] block text-xs font-medium text-slate-600">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cx(selectBase, 'min-h-10 text-sm')} style={selectStyle}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

/** Caixa informativa do painel (notas, anomalias, motivos). */
export function InfoBox({ tone = 'plain', icon, title, children }: { tone?: 'plain' | 'bad' | 'warn' | 'vio' | 'ok'; icon: Parameters<typeof Icon>[0]['name']; title: ReactNode; children: ReactNode }) {
  const tones = {
    plain: 'border-slate-200 text-slate-900 [&_p]:text-slate-600',
    bad: 'border-[#f4c3bd] bg-[#fdecea] text-[#b42318] [&_p]:text-[#7d1f15]',
    warn: 'border-[#efc98a] bg-[#fbe7c6] text-[#8a4b06] [&_p]:text-[#6b3a05]',
    vio: 'border-[#d9cff7] bg-[#efeafd] text-[#5b3fb0] [&_p]:text-[#46318a]',
    ok: 'border-[#c3e3cf] bg-[#e7f5ec] text-[#17643e] [&_p]:text-[#14532f]',
  };
  return (
    <div className={cx('mt-3.5 flex gap-3 rounded-xl border px-3.5 py-3', tones[tone])}>
      <Icon name={icon} className={cx('mt-px h-5 w-5', tone === 'plain' && 'text-slate-600')} />
      <div className="min-w-0">
        <b className="block text-[13px] font-semibold">{title}</b>
        {children}
      </div>
    </div>
  );
}

/** Mosaico de fotografias simuladas. */
export function PhotoTile({ index, label }: { index: number; label: string }) {
  return (
    <div role="img" aria-label={`${label} (fotografia simulada)`} style={{ background: gradient(index) }}
      className="relative flex aspect-square max-w-full items-end overflow-hidden rounded-[9px] p-[5px] text-[10.5px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,.45)]">
      <Icon name="image" className="absolute left-1/2 top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-[60%] opacity-75" />
      <span className="relative truncate">{label}</span>
    </div>
  );
}
