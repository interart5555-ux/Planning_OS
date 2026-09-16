import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cx, Icon } from '../../shared/ui';
import { CONFLICT_EMOJI, LINE_EMOJI, lowerFirst, STATUS_META, WINDOW_EMOJI } from '../config';
import { formatHours, formatShortDay, minutesOf, plural, timeOf } from '../dates';
import { hasConflict, isHighPriority, isMovable, windowCheck } from '../rules';
import type { Job } from '../types';
import { CardLine, cardClasses, Emoji, JobAlerts, PriorityDot, StatusEmoji, StatusLine, usePlanning, whoEmoji, whoLabel } from './context';
import type { DragState } from './useJobDrag';

/** Aviso com as limpezas (não concluídas) fora do horário do alojamento. */
export function WindowAlert({ jobs, withDay }: { jobs: Job[]; withDay?: boolean }) {
  const { config, openJob } = usePlanning();
  if (!config.stays) return null;
  const bad = jobs.filter((j) => j.status !== 'done' && windowCheck(j, config).level === 'bad');
  if (!bad.length) return null;
  const loc = lowerFirst(config.location);
  return (
    <div role="status" className="mt-3.5 flex gap-2.5 rounded-xl border border-[#f3c3be] bg-[#fdf0ef] px-3.5 py-2.5 text-[13px] text-[#8f2219]">
      <Emoji className="text-[17px]">{WINDOW_EMOJI}</Emoji>
      <div className="min-w-0">
        <b className="block font-semibold">{plural(bad.length, `${lowerFirst(config.job.singular)} fora do horário do ${loc}`, `${lowerFirst(config.job.plural)} fora do horário do ${loc}`)}</b>
        <ul className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1">
          {bad.map((j) => {
            const early = minutesOf(j.start) < minutesOf(j.stayTimes.checkout);
            return (
              <li key={j.id}>
                <button type="button" onClick={() => openJob(j.id)} className="text-left text-[12.5px] underline underline-offset-[3px]">
                  {j.location} {j.unit}{withDay ? ` (${formatShortDay(j.date)})` : ''}: {j.start}–{j.end}, {early ? `saída ${j.stayTimes.checkout}` : `entrada ${j.stayTimes.checkin}`}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/**
 * "Por atribuir" fora do cronograma: os cartões arrastam-se para a linha de
 * uma pessoa. Também é zona de largada para voltar a colocar um trabalho aqui.
 */
export function UnassignedTray({ jobs, withDay }: { jobs: Job[]; withDay?: boolean }) {
  const { data, config, people, teams, openJob, drag, beginDrag } = usePlanning();
  const high = jobs.filter((j) => isHighPriority(j, config));
  const sorted = [...jobs].sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date)
      : Number(!isHighPriority(a, config)) - Number(!isHighPriority(b, config)) || a.start.localeCompare(b.start));
  const dragged = drag?.kind === 'move' ? data.jobs.find((j) => j.id === drag.jobId) : undefined;
  const canReceive = Boolean(dragged?.assignees.length);
  const over = drag?.target?.type === 'tray';

  return (
    <section data-drop="tray" aria-label="Por atribuir"
      className={cx('mt-3.5 rounded-xl border px-3.5 pb-3.5 pt-3 shadow-sm transition-colors', over ? 'border-[#17643e] bg-[#e9f4ee]' : 'border-slate-200 bg-[#fcfcfb]')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3.5 gap-y-1">
        <h3 className="flex items-center gap-2 text-[14.5px] font-semibold">
          Por atribuir
          <span className={cx('grid h-[22px] min-w-[22px] place-items-center rounded-full px-[7px] text-xs font-bold', jobs.length ? 'bg-[#fde3c8] text-[#7a3d0b]' : 'bg-slate-100 text-slate-500')}>{jobs.length}</span>
          {config.stays && high.length > 0 && <span title="Prioridade alta" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-600"><PriorityDot />{high.length}</span>}
        </h3>
        <p className="text-[12.5px] text-slate-500">
          {withDay
            ? 'Arrasta para a célula da pessoa pretendida, na coluna do próprio dia.'
            : 'Arrasta para a linha pretendida no cronograma. Estica um cartão pela extremidade direita para ajustar as horas.'}
        </p>
      </div>

      {sorted.length ? (
        <div className="-mx-3.5 mt-2.5 flex gap-2 overflow-x-auto px-3.5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {sorted.map((j) => {
            const conflict = hasConflict(j, data, people);
            const movable = isMovable(j);
            return (
              <button key={j.id} type="button" data-job-card
                onPointerDown={movable ? (e) => beginDrag(e, j.id, null) : undefined}
                onClick={() => openJob(j.id)}
                title="Arrasta para o cronograma ou abre para atribuir"
                aria-label={`${j.location} ${j.unit}, ${withDay ? `${formatShortDay(j.date)}, ` : ''}${j.start}–${j.end}, ${STATUS_META[j.status].label}${isHighPriority(j, config) ? ', prioridade alta' : ''}. Abrir para atribuir`}
                className={cx('flex shrink-0 select-none items-stretch gap-1 rounded-[10px] border py-[7px] pl-[3px] pr-2.5 text-left text-xs leading-[1.3] shadow-sm transition-shadow [-webkit-touch-callout:none] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]',
                  withDay ? 'w-[280px]' : 'w-[216px] sm:w-[232px]', movable ? 'cursor-grab' : 'cursor-pointer',
                  drag?.kind === 'move' && drag.jobId === j.id && 'opacity-35', cardClasses(j, conflict))}>
                <span aria-hidden="true" className="grid w-4 place-items-center opacity-50"><Icon name="grip" className="h-3.5 w-3.5" /></span>
                <span className="min-w-0 flex-1">
                  <StatusLine job={j} />
                  <CardLine emoji={LINE_EMOJI.time} className="font-semibold tabular-nums">{withDay && `${formatShortDay(j.date)} · `}{j.start}–{j.end} · {formatHours((minutesOf(j.end) - minutesOf(j.start)) / 60)}</CardLine>
                  <CardLine emoji={LINE_EMOJI.place} className="text-[13px] font-semibold">{j.location} · {j.unit}</CardLine>
                  <CardLine emoji={whoEmoji(j)} className="opacity-85">{whoLabel(j, people, teams)}</CardLine>
                  <span className="flex min-h-[15px] items-center gap-1 overflow-hidden whitespace-nowrap text-[11.5px]"><JobAlerts job={j} withInfo /></span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-2.5 rounded-[10px] border border-dashed border-slate-300 px-3 py-2.5 text-[13px] text-slate-500">
          Sem {lowerFirst(config.job.plural)} por atribuir {withDay ? 'nesta semana' : 'neste dia'}.
        </div>
      )}

      {canReceive && (
        <div className={cx('mt-2.5 rounded-[10px] border-[1.5px] border-dashed p-3 text-center text-[13px] font-medium', over ? 'border-[#17643e] text-[#17643e]' : 'border-slate-300 text-slate-600')}>
          Larga aqui para voltar a “Por atribuir”
        </div>
      )}
    </section>
  );
}

/** Etiqueta que acompanha o ponteiro enquanto se arrasta ou estica. */
export function DragGhost({ drag, ghostRef, origin }: { drag: DragState | null; ghostRef: RefObject<HTMLDivElement>; origin: () => { x: number; y: number } | null }) {
  const { data, people } = usePlanning();
  if (!drag) return null;
  const job = data.jobs.find((j) => j.id === drag.jobId);
  if (!job) return null;
  const at = origin();
  const style = { transform: at ? `translate(${at.x + 14}px, ${at.y + 12}px)` : undefined };
  const base = 'pointer-events-none fixed left-0 top-0 z-[1000] flex max-w-[280px] items-center gap-1.5 whitespace-nowrap rounded-[9px] border px-2.5 py-1.5 text-xs font-semibold shadow-[0_14px_30px_-10px_rgba(17,24,39,0.45)]';

  let content: ReactNode;
  let tone: string;
  if (drag.kind === 'resize' && drag.hours != null) {
    const person = people.find((p) => p.id === drag.personId);
    const end = timeOf(minutesOf(job.start) + Math.round(drag.hours * 60));
    tone = 'border-[#16201b] bg-[#16201b] text-white tabular-nums';
    content = (
      <span className="truncate">
        {person?.name} · {formatHours(drag.hours)} ({job.start}–{end})
        {drag.slot && drag.slot.state !== 'ok' && ` · ${CONFLICT_EMOJI} ${drag.slot.short}`}
        {drag.window?.level === 'bad' ? ` · ${WINDOW_EMOJI} ${drag.window.short} (${job.stayTimes.checkin})` : drag.window?.level === 'flex' ? ' · flexível' : ''}
      </span>
    );
  } else {
    const conflict = hasConflict(job, data, people);
    tone = cardClasses(job, conflict);
    content = <><StatusEmoji status={conflict ? 'conflict' : job.status} /><span className="truncate">{job.location} · {job.unit}</span></>;
  }
  return createPortal(<div ref={ghostRef} aria-hidden="true" style={style} className={cx(base, tone)}>{content}</div>, document.body);
}
