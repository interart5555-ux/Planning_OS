import { createContext, useContext, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { cx } from '../../shared/ui';
import { ABSENCE_CARD, ALERT_TAG, CONFLICT_CARD, LINE_EMOJI, lowerFirst, STATUS_META, statusEmoji, WINDOW_EMOJI } from '../config';
import { conflictsFor, isHighPriority, windowCheck, stayLabel, type WindowCheck } from '../rules';
import type { PlanningActions } from '../usePlanningModule';
import type { ConfirmOptions } from '../../shared/ui';
import type { Job, JobStatus, PlanPerson, PlanTeam, PlanningConfig, PlanningData } from '../types';
import type { DragState } from './useJobDrag';

export interface PlanningContextValue {
  data: PlanningData;
  config: PlanningConfig;
  people: PlanPerson[];
  teams: PlanTeam[];
  /** Data e hora de referência (demonstração). */
  today: string;
  now: string;
  actions: PlanningActions;
  openJob: (id: string) => void;
  openDetail: (id: string) => void;
  confirm: (options: ConfirmOptions) => void;
  /** Arrastar em curso (null quando não há). */
  drag: DragState | null;
  beginDrag: (e: ReactPointerEvent<HTMLElement>, jobId: string, personId: string | null, kind?: DragState['kind']) => void;
}

export const PlanningContext = createContext<PlanningContextValue | null>(null);

export function usePlanning(): PlanningContextValue {
  const value = useContext(PlanningContext);
  if (!value) throw new Error('usePlanning tem de ser usado dentro de <PlanningModule>.');
  return value;
}

export const teamName = (teams: PlanTeam[], id: string): string => teams.find((t) => t.id === id)?.name ?? 'Sem equipa';

/** Emoji decorativo: o texto ao lado (ou o aria-label do cartão) já diz o estado. */
export function Emoji({ children, className, title }: { children: string; className?: string; title?: string }) {
  return (
    <span aria-hidden={title ? undefined : true} title={title}
      className={cx('shrink-0 font-normal leading-none [font-family:"Apple_Color_Emoji","Segoe_UI_Emoji","Noto_Color_Emoji",sans-serif]', className)}>
      {children}
    </span>
  );
}

export function StatusEmoji({ status, className }: { status: JobStatus | 'conflict'; className?: string }) {
  const { config } = usePlanning();
  return <Emoji className={className}>{statusEmoji(status, config)}</Emoji>;
}

export function StatusPill({ status, onDark, small }: { status: JobStatus; onDark?: boolean; small?: boolean }) {
  const meta = STATUS_META[status];
  return (
    <span className={cx(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold',
      small ? 'h-[22px] px-2 text-[11.5px]' : 'h-6 px-2.5 text-xs',
      onDark ? 'border-white/35 bg-white/15 text-white' : meta.card,
    )}>
      <StatusEmoji status={status} />
      {meta.label}
    </span>
  );
}

/** Etiqueta "Alta": entrada de hóspedes no mesmo dia da saída. */
export function PriorityTag({ className }: { className?: string }) {
  return (
    <i title="Prioridade alta: entrada de hóspedes no mesmo dia" className={cx('inline-flex h-4 shrink-0 items-center rounded bg-[#b42318] px-[5px] text-[10.5px] font-bold not-italic leading-none tracking-[0.02em] text-white', className)}>
      Alta
    </i>
  );
}

/** Versão compacta para cartões estreitos. */
export function PriorityDot({ className }: { className?: string }) {
  return <i title="Prioridade alta" className={cx('inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-[#b42318] shadow-[0_0_0_1.5px_#fff]', className)} />;
}

/** "⚠️ Depois da entrada" (fora do horário, alerta preto) ou "↔️ Flexível"/"Adiada". */
export function WindowTag({ check, className }: { check: WindowCheck; className?: string }) {
  if (check.level === 'ok') return null;
  return (
    <span title={check.text} className={cx(check.level === 'bad' ? ALERT_TAG : 'inline-flex max-w-full items-center gap-[3px] overflow-hidden text-ellipsis whitespace-nowrap rounded bg-white px-[5px] font-semibold text-[#2a5592]', className)}>
      <Emoji>{check.level === 'bad' ? WINDOW_EMOJI : LINE_EMOJI.flex}</Emoji>{check.short}
    </span>
  );
}

export const cardClasses = (job: Job, conflict: boolean): string => (conflict ? CONFLICT_CARD : STATUS_META[job.status].card);

/** Linha 4 do cartão: colaboradoras atribuídas ou, sem ninguém, a equipa por defeito. */
export const whoLabel = (job: Job, people: PlanPerson[], teams: PlanTeam[]): string =>
  job.assignees.length ? job.assignees.map((a) => people.find((p) => p.id === a.personId)?.name ?? a.personId).join(' + ') : teamName(teams, job.teamId);

/** 👤 uma colaboradora; 👥 equipa (sem ninguém atribuído) ou várias pessoas. */
export const whoEmoji = (job: Job): string => (job.assignees.length === 1 ? LINE_EMOJI.person : LINE_EMOJI.team);

/** Linha 1 do cartão: emoji e estado, com a bola vermelha (prioridade alta) ou ↔️ (horário flexível). */
export function StatusLine({ job }: { job: Job }) {
  const { config } = usePlanning();
  const w = windowCheck(job, config);
  return (
    <span className="flex min-h-[15px] items-center gap-1 overflow-hidden whitespace-nowrap font-semibold">
      <StatusEmoji status={job.status} /><span className="truncate">{STATUS_META[job.status].label}</span>
      {isHighPriority(job, config) && <PriorityDot className="ml-0.5" />}
      {w.level === 'flex' && <FlexEmoji check={w} />}
    </span>
  );
}

/** Só o ícone ↔️; o texto (Flexível/Adiada e o motivo) fica no title. */
export function FlexEmoji({ check, className }: { check: WindowCheck; className?: string }) {
  return <span role="img" aria-label={check.short} title={`${check.short}: ${check.text}`} className={cx('shrink-0 cursor-help leading-none [font-family:"Apple_Color_Emoji","Segoe_UI_Emoji","Noto_Color_Emoji",sans-serif]', className)}>{LINE_EMOJI.flex}</span>;
}

/** Linha do cartão com emoji à esquerda. */
export function CardLine({ emoji, className, children }: { emoji: string; className?: string; children: ReactNode }) {
  return (
    <span className={cx('flex min-h-[15px] items-center gap-1 overflow-hidden whitespace-nowrap', className)}>
      <Emoji>{emoji}</Emoji><span className="truncate">{children}</span>
    </span>
  );
}

/**
 * Linha 5 do cartão: conflitos e fora do horário (prioridade e flexível estão na linha 1).
 * `withInfo` mostra o horário quando não há alertas.
 */
export function JobAlerts({ job, withInfo }: { job: Job; withInfo?: boolean }) {
  const { data, config, people } = usePlanning();
  const conflicts = conflictsFor(job, job.assignees, data, people);
  const w = windowCheck(job, config);
  return (
    <>
      {conflicts.length > 0 && (
        <span title={conflicts.map((c) => c.text).join(' ')} className={ALERT_TAG}>
          <StatusEmoji status="conflict" />{conflicts.some((c) => c.kind === 'absence') ? 'Ausência' : 'Sobreposição'}
        </span>
      )}
      {w.level === 'bad' ? <WindowTag check={w} /> : withInfo && config.stays ? <span className="flex min-w-0 items-center gap-[3px] opacity-90"><Emoji>{LINE_EMOJI.info}</Emoji><span className="truncate">{stayLabel(job, config)}</span></span> : null}
    </>
  );
}

export function Legend() {
  const { config } = usePlanning();
  const swatch = 'inline-block h-2.5 w-3.5 rounded-[3px] border';
  const item = 'inline-flex items-center gap-1.5';
  return (
    <div aria-label="Legenda" className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-slate-500">
      {(Object.keys(STATUS_META) as JobStatus[]).map((s) => (
        <span key={s} className={item}><i className={cx(swatch, STATUS_META[s].card)} /><StatusEmoji status={s} />{STATUS_META[s].label}</span>
      ))}
      <span className={item}><i className={cx(swatch, ABSENCE_CARD)} />Ausência</span>
      <span className={item}><i className={cx(swatch, CONFLICT_CARD)} /><StatusEmoji status="conflict" />Conflito</span>
      {config.stays && (
        <>
          <span className={item}><PriorityDot />Prioridade alta · entrada no mesmo dia</span>
          <span className={item}><Emoji>{LINE_EMOJI.flex}</Emoji>Flexível · sem entrada no dia</span>
          <span className={item}><Emoji>{WINDOW_EMOJI}</Emoji>Fora do horário do {lowerFirst(config.location)}</span>
        </>
      )}
    </div>
  );
}

export function PersonAvatar({ person, className }: { person: Pick<PlanPerson, 'initials'>; className?: string }) {
  return <span aria-hidden="true" className={cx('grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700', className)}>{person.initials}</span>;
}
