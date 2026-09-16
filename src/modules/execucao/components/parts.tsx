import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx, focusRing, Icon, type IconName } from '../../shared/ui';
import { issueLabel, delayLabel, STATUS_META } from '../config';
import { stopwatch } from '../dates';
import { elapsedSeconds } from '../rules';
import type { DisplayStatus, ExecJob, Photo } from '../types';
import { useExec } from './context';

/* ---------- botões grandes (alvos de toque ≥ 48px) ---------- */

type BigVariant = 'primary' | 'outline' | 'soft' | 'danger';
const BIG: Record<BigVariant, string> = {
  primary: 'border-transparent bg-[#17643e] text-white hover:bg-[#0f4f30]',
  outline: 'border-[#d3d8de] bg-white text-[#15181c] hover:border-slate-400',
  soft: 'border-[#cde5d6] bg-[#e9f4ee] text-[#17643e] hover:bg-[#dcede3]',
  danger: 'border-[#f4c3bd] bg-white text-[#9b2318] hover:bg-[#fdf0ef]',
};

export function BigButton({ variant = 'primary', icon, large, block, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BigVariant; icon?: IconName; large?: boolean; block?: boolean }) {
  return (
    <button type="button"
      className={cx('inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl border px-[18px] font-semibold transition disabled:cursor-default disabled:opacity-50',
        large ? 'min-h-[56px] text-[17px]' : 'min-h-[48px] text-[15.5px]', block && 'flex w-full', BIG[variant], focusRing, className)}
      {...rest}>
      {icon && <Icon name={icon} className="h-5 w-5" />}
      {children}
    </button>
  );
}

export function BackButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cx('-ml-2 mb-1.5 inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] pl-1 pr-2.5 text-[15px] font-medium text-slate-700 hover:bg-slate-100', focusRing)}>
      <Icon name="chevronLeft" className="h-[22px] w-[22px]" />
      {children}
    </button>
  );
}

/** Título do ecrã; recebe o foco depois de navegar (leitores de ecrã e teclado). */
export function ScreenTitle({ children, className }: { children: ReactNode; className?: string }) {
  const { focusRequest } = useExec();
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusRequest.current) {
      focusRequest.current = false;
      ref.current?.focus({ preventScroll: true });
    }
  }, [focusRequest]);
  return <h1 ref={ref} tabIndex={-1} className={cx('text-[27px] font-bold leading-tight tracking-[-0.025em] focus:outline-none', className)}>{children}</h1>;
}

export function SectionTitle({ children, aside, className }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <h2 className={cx('mb-2.5 mt-[22px] flex items-baseline justify-between gap-2.5 text-[17px] font-bold tracking-[-0.01em]', className)}>
      <span>{children}</span>
      {aside != null && <small className="text-[13px] font-medium text-slate-500">{aside}</small>}
    </h2>
  );
}

export const Optional = ({ children = '(opcional)' }: { children?: ReactNode }) => <span className="text-[14px] font-normal text-slate-500">{children}</span>;

export function StatusPill({ status, solid }: { status: DisplayStatus; solid?: boolean }) {
  const meta = STATUS_META[status];
  return (
    <span className={cx('inline-flex min-h-[28px] items-center gap-1.5 whitespace-nowrap rounded-full px-[11px] text-[13px] font-semibold', solid ? meta.pillSolid : meta.pill)}>
      <Icon name={meta.icon} className="h-4 w-4" />
      {status === 'absence' ? 'Não disponível' : meta.label}
    </span>
  );
}

type NoticeTone = 'info' | 'warn' | 'bad' | 'ok';
const NOTICE: Record<NoticeTone, string> = {
  info: 'border-[#d5e2f3] bg-[#edf3fb] text-[#2a5592]',
  warn: 'border-[#f3dfae] bg-[#fffaf0] text-[#80570a]',
  bad: 'border-[#f4c3bd] bg-[#fde8e6] text-[#9b2318]',
  ok: 'border-[#bfe0cb] bg-[#e8f5ed] text-[#17643e]',
};
export function Notice({ tone, icon, title, children, className }: { tone: NoticeTone; icon: IconName; title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cx('mt-3 flex gap-2.5 rounded-xl border px-[13px] py-[11px] text-[14px]', NOTICE[tone], className)}>
      <Icon name={icon} className="mt-px h-[19px] w-[19px]" />
      <span className="min-w-0">
        {title && <b className="block font-semibold">{title}</b>}
        {children}
      </span>
    </div>
  );
}

/** Cronómetro simulado que avança a cada segundo. */
export function Timer({ job }: { job: ExecJob }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (job.status !== 'in_progress') return;
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [job.status]);
  return <span className="tabular-nums">{stopwatch(elapsedSeconds(job, nowMs))}</span>;
}

/** Lista de verificação com caixas grandes. */
export function CheckList({ job, list, labels, compact, markMissing }: { job: ExecJob; list: 'prep' | 'tasks'; labels: string[]; compact?: boolean; markMissing?: boolean }) {
  const { actions } = useExec();
  return (
    <ul className="flex flex-col gap-2">
      {labels.map((label, i) => {
        const checked = job[list][i];
        return (
          <li key={label}>
            <label className={cx('flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2', compact ? 'min-h-[44px] text-[14.5px]' : 'min-h-[50px] text-[15px]',
              checked ? 'border-[#cde5d6] bg-white' : markMissing ? 'border-[#f3dfae] bg-[#fffaf0]' : 'border-[#e6e8ec] bg-white')}>
              <span className="relative grid h-6 w-6 shrink-0 place-items-center">
                <input type="checkbox" checked={checked} onChange={(e) => actions.toggleCheck(job.id, list, i, e.target.checked)}
                  className="peer m-0 h-6 w-6 cursor-pointer appearance-none rounded-md border-2 border-[#b9c0c8] bg-white checked:border-[#17643e] checked:bg-[#17643e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e] focus-visible:ring-offset-2" />
                <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute h-4 w-4 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
              </span>
              <span className={cx(checked && 'text-slate-700')}>{label}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

const PHOTO_BG = ['bg-gradient-to-br from-[#cdb89a] to-[#8c7457]', 'bg-gradient-to-br from-[#b8c7cf] to-[#6f8794]', 'bg-gradient-to-br from-[#b5bda9] to-[#6d7a61]', 'bg-gradient-to-br from-[#c9b3a7] to-[#8a6e62]'];

/** Fotografia simulada (sem upload real). */
export function PhotoTile({ photo, label, onRemove }: { photo: Pick<Photo, 'kind'>; label: string; onRemove?: () => void }) {
  return (
    <div role="img" aria-label={`${label} (simulada)`}
      className={cx('relative flex aspect-square max-w-full flex-col justify-end overflow-hidden rounded-xl p-[7px] text-[11.5px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,.4)]', PHOTO_BG[photo.kind % PHOTO_BG.length])}>
      <Icon name="image" className="absolute left-1/2 top-1/2 h-[30px] w-[30px] -translate-x-1/2 -translate-y-[62%] opacity-80" />
      <span>{label}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remover ${label}`}
          className={cx('absolute right-[5px] top-[5px] grid h-[30px] w-[30px] place-items-center rounded-full bg-white text-slate-900 shadow', focusRing)}>
          <Icon name="x" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function AddPhotoButton({ label, onClick, id }: { label: string; onClick: () => void; id?: string }) {
  return (
    <button type="button" id={id} onClick={onClick}
      className={cx('flex aspect-square max-w-full flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-[#17643e] bg-[#e9f4ee] p-1.5 text-center text-[13px] font-semibold leading-tight text-[#17643e]', focusRing)}>
      <Icon name="camera" className="h-[26px] w-[26px]" />
      {label}
    </button>
  );
}

export function IssuesList({ job }: { job: ExecJob }) {
  const { config } = useExec();
  if (!job.issues.length) return null;
  return (
    <ul aria-label="Anomalias e atrasos" className="mt-3 flex flex-col gap-2">
      {job.issues.map((i) => (
        <li key={i.id} className="flex gap-2.5 rounded-xl border border-[#f4c3bd] bg-[#fde8e6] px-[13px] py-[11px] text-[14px] text-[#9b2318]">
          <Icon name="triangle" className="mt-px h-[19px] w-[19px]" />
          <div className="min-w-0">
            <b className="block font-bold">{issueLabel(i.type)}{i.delayMin ? ` · ${delayLabel(i.delayMin)}` : ''}</b>
            <p className="mt-px text-[#6e1c14]">{i.description}</p>
            <small className="mt-[3px] block text-[12.5px] opacity-85">{i.time}{i.withPhoto ? ' · com fotografia' : ''} · {i.synced ? `enviado à ${config.manager}` : 'por sincronizar'}</small>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function History({ job }: { job: ExecJob }) {
  if (!job.events.length) return null;
  return (
    <>
      <SectionTitle>Histórico</SectionTitle>
      <ol className="pl-1">
        {job.events.map((e, idx) => (
          <li key={e.id} className="relative pb-3 pl-5 text-[14px] text-slate-700">
            <span aria-hidden="true" className={cx('absolute left-0 top-1.5 h-2 w-2 rounded-full', e.tone === 'bad' ? 'bg-[#d9463b]' : e.tone === 'ok' ? 'bg-[#3c9a66]' : 'bg-slate-300')} />
            {idx < job.events.length - 1 && <span aria-hidden="true" className="absolute bottom-px left-[3px] top-[17px] w-0.5 bg-slate-200" />}
            <time className="mr-1.5 font-semibold tabular-nums text-slate-900">{e.time}</time>
            {e.text}
            {!e.synced && <span className="ml-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#2a5592]"><Icon name="cloudOff" className="h-3.5 w-3.5" />por sincronizar</span>}
          </li>
        ))}
      </ol>
    </>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <small className="block text-[12.5px] text-slate-500">{label}</small>
      <b className="text-[16px] font-semibold tabular-nums">{value}</b>
    </div>
  );
}

/** Contentor com deslocação própria e barra de ações fixa no fundo. */
export function ScreenScroll({ children, actions, label }: { children: ReactNode; actions?: ReactNode; label?: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-label={label}>
      <div className="mx-auto max-w-[680px] px-4 pb-7 pt-[18px] md:px-6">{children}</div>
      {actions && (
        <div className="sticky bottom-0 z-[3] bg-gradient-to-t from-white from-80% to-white/0 px-4 py-3 md:px-6">
          <div className="mx-auto flex max-w-[680px] flex-wrap gap-2.5 [&>button]:flex-[1_1_180px]">{actions}</div>
        </div>
      )}
    </div>
  );
}
