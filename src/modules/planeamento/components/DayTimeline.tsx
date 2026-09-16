import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cx, Icon } from '../../shared/ui';
import { ABSENCE_CARD, DAY_HOURS, DAY_START_HOUR, LINE_EMOJI, lowerFirst, STATUS_META } from '../config';
import { formatLong, minutesOf, timeOf } from '../dates';
import { absenceLabel, absenceRange, absencesOn, assignLanes, hasConflict, isHighPriority, isMovable, matchesFilters, spanOf, windowCheck } from '../rules';
import type { Job, PlanFilters, PlanPerson } from '../types';
import { CardLine, cardClasses, JobAlerts, PersonAvatar, StatusEmoji, StatusLine, teamName, usePlanning, whoEmoji, whoLabel } from './context';
import { UnassignedTray, WindowAlert } from './Unassigned';

/** Altura da faixa: o cartão tem 5 linhas. */
const LANE = 92;
const START = DAY_START_HOUR * 60;
/** Abaixo desta largura, a etiqueta "Alta" passa a ponto. */

/** Largura da hora ajustada ao espaço disponível (mínimo 76px; abaixo disso há scroll horizontal). */
function useTimelineMetrics() {
  const ref = useRef<HTMLDivElement>(null);
  const [m, setM] = useState({ nameCol: 172, hour: 80 });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth;
      const nameCol = width < 560 ? 112 : 172;
      setM({ nameCol, hour: Math.max(76, (width - nameCol - 2) / DAY_HOURS) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  return { ref, ...m };
}

type Item = { from: number; to: number; key: string; render: (pos: { left: number; width: number; top: number }) => ReactNode };

interface DayTimelineProps {
  date: string;
  filters: PlanFilters;
  visiblePeople: PlanPerson[];
  /** Pessoas que o filtro esconde: aparecem enquanto se arrasta, para poderem receber trabalho. */
  hiddenPeople: PlanPerson[];
}

/**
 * Cronograma horizontal: uma linha por pessoa. As limpezas por atribuir ficam
 * fora, no tabuleiro acima, e arrastam-se para as linhas.
 */
export function DayTimeline({ date, filters, visiblePeople, hiddenPeople }: DayTimelineProps) {
  const { data, config, people, teams, today, now, openJob, drag, beginDrag } = usePlanning();
  const { ref, nameCol, hour } = useTimelineMetrics();
  const narrow = nameCol < 172;
  const jobs = data.jobs.filter((j) => j.date === date && matchesFilters(j, filters, data, people, config));
  const toX = (min: number) => ((min - START) / 60) * hour;
  const moving = drag?.kind === 'move';

  const jobItem = (job: Job, personId: string): Item => {
    const conflict = hasConflict(job, data, people);
    const span = spanOf(job, personId);
    const resizing = drag?.kind === 'resize' && drag.jobId === job.id && drag.personId === personId && drag.hours != null;
    const to = resizing ? span.from + Math.round(drag.hours! * 60) : span.to;
    const label = `${STATUS_META[job.status].label}${conflict ? ', com conflito' : ''}`;
    const high = isHighPriority(job, config);
    const w = windowCheck(job, config);
    const movable = isMovable(job);
    const resizeBad = resizing && (drag.slot?.state !== 'ok' || drag.window?.level === 'bad');
    return {
      key: `${job.id}-${personId}`,
      from: span.from,
      to: Math.min(span.to, START + DAY_HOURS * 60),
      render: ({ left, top }) => {
        const width = (Math.min(to, START + DAY_HOURS * 60) - span.from) / 60 * hour - 6;
        return (
          <button
            key={`${job.id}-${personId}`}
            type="button"
            data-job-card
            onPointerDown={movable ? (e) => beginDrag(e, job.id, personId) : undefined}
            onClick={() => openJob(job.id)}
            title={movable ? `${label} · arrasta para mover, estica para ajustar as horas` : label}
            aria-label={`${timeOf(span.from)}–${timeOf(to)}, ${job.location} ${job.unit}, ${teamName(teams, job.teamId)}, ${label}${high ? ', prioridade alta' : ''}${w.level === 'bad' ? `, ${w.short.toLowerCase()}` : ''}`}
            style={{ left, width, top, height: LANE - 6 }}
            className={cx(
              'absolute select-none overflow-hidden rounded-lg border py-1 pl-2 pr-3.5 text-left text-xs leading-[1.3] shadow-sm transition-shadow [-webkit-touch-callout:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]',
              movable ? 'cursor-grab' : 'cursor-pointer',
              !drag && 'hover:shadow-md',
              moving && drag.jobId === job.id && drag.personId === personId && 'opacity-35',
              resizing && (resizeBad ? 'z-[3] ring-2 ring-[#c9302a]' : 'z-[3] ring-2 ring-[#17643e]'),
              cardClasses(job, conflict),
            )}
          >
            {/* 1 estado (+ bola vermelha se prioridade alta) · 2 horário · 3 alojamento e unidade · 4 equipa ou colaboradora · 5 alertas */}
            <StatusLine job={job} />
            <CardLine emoji={LINE_EMOJI.time} className="font-semibold tabular-nums">{timeOf(span.from)}–{timeOf(to)}</CardLine>
            <CardLine emoji={LINE_EMOJI.place} className="font-semibold">{job.location} · {job.unit}</CardLine>
            <CardLine emoji={whoEmoji(job)} className="opacity-85">{whoLabel(job, people, teams)}</CardLine>
            <span className="flex min-h-[15px] items-center gap-1 overflow-hidden whitespace-nowrap text-[11.5px]"><JobAlerts job={job} /></span>
            {movable && (
              <span aria-hidden="true" onPointerDown={(e) => beginDrag(e, job.id, personId, 'resize')}
                className="group/rsz absolute inset-y-0 right-0 grid w-3 cursor-ew-resize touch-none place-items-center [@media(hover:none)]:w-5">
                <span className="h-[18px] w-[3px] rounded-sm bg-current opacity-0 transition-opacity group-hover/rsz:opacity-50 [@media(hover:none)]:opacity-40 [button:hover_&]:opacity-50" />
              </span>
            )}
          </button>
        );
      },
    };
  };

  /** Pré-visualização ao arrastar: horário do alojamento e posição de largada. */
  const dropPreview = (personId: string) => {
    if (!moving || drag.target?.type !== 'track' || drag.target.personId !== personId) return null;
    const t = drag.target;
    const job = data.jobs.find((j) => j.id === drag.jobId);
    if (!job) return null;
    const bad = t.slot.state !== 'ok' || t.window.level === 'bad';
    const checkout = minutesOf(job.stayTimes.checkout);
    const checkin = minutesOf(job.stayTimes.checkin);
    const high = isHighPriority(job, config);
    return (
      <>
        {config.stays && (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-[1] border-x-[1.5px] border-dashed border-[#8cc2a3] bg-[#17643e]/[0.07]" style={{ left: toX(checkout), width: ((checkin - checkout) / 60) * hour }}>
              <span className="absolute bottom-0.5 left-1 whitespace-nowrap text-[10px] font-semibold text-[#17643e]">Saída {job.stayTimes.checkout} · {high ? `entrada ${job.stayTimes.checkin}` : 'sem entrada'}</span>
            </div>
            {high && <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-[1] bg-[repeating-linear-gradient(135deg,rgba(201,48,42,0.07)_0_6px,transparent_6px_12px)]" style={{ left: toX(checkin) }} />}
          </>
        )}
        <div aria-hidden="true" style={{ left: toX(t.start) + 3, width: (drag.duration / 60) * hour - 6 }}
          className={cx('pointer-events-none absolute inset-y-1 z-[2] flex flex-col justify-center overflow-hidden whitespace-nowrap rounded-lg border-2 border-dashed px-2 text-[11.5px] font-semibold tabular-nums',
            t.slot.state === 'blocked' ? 'border-[#c9302a] bg-[repeating-linear-gradient(135deg,rgba(201,48,42,0.12)_0_6px,rgba(255,255,255,0.6)_6px_12px)] text-[#9a2a20]'
              : bad ? 'border-[#c9302a] bg-[#c9302a]/[0.06] text-[#9a2a20]' : 'border-[#17643e] bg-[#17643e]/[0.08] text-[#17643e]')}>
          <span>{timeOf(t.start)}–{timeOf(t.start + drag.duration)}</span>
          {t.slot.state !== 'ok' && <small className="truncate text-[11px] font-medium"><StatusEmoji status="conflict" /> {t.slot.short}</small>}
          {t.window.level === 'bad' ? <small className="truncate text-[11px] font-medium">⚠️ {t.window.short}</small>
            : t.window.level === 'flex' && t.slot.state === 'ok' ? <small className="truncate text-[11px] font-medium">Flexível</small> : null}
        </div>
      </>
    );
  };

  const renderRow = (p: PlanPerson, idle: boolean) => {
    const items: Item[] = jobs.filter((j) => j.assignees.some((a) => a.personId === p.id)).map((j) => jobItem(j, p.id));
    absencesOn(data.absences, date, p.id).forEach((a) => {
      const r = absenceRange(a);
      items.push({
        key: a.id, from: r.from, to: r.to,
        render: ({ left, width, top }) => (
          <div key={a.id} title={`${absenceLabel(a)} (registada no módulo Equipas)`} style={{ left, width, top, height: LANE - 6 }}
            className={cx('absolute flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-lg px-2 text-xs font-medium', ABSENCE_CARD)}>
            <Icon name="calendar" className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{absenceLabel(a)}</span>
          </div>
        ),
      });
    });
    const { items: placed, lanes } = assignLanes(items);
    const over = moving && drag.target?.type === 'track' && drag.target.personId === p.id;
    return (
      <div key={p.id} className="flex border-b border-slate-200">
        <div data-sticky-name style={{ width: nameCol }} className="sticky left-0 z-[3] flex shrink-0 items-center gap-2.5 border-r border-slate-200 bg-white px-3 py-2">
          {!narrow && <PersonAvatar person={p} />}
          <span className="min-w-0">
            <b className="block truncate text-[13.5px] font-semibold">{p.name}</b>
            <small className={cx('block truncate text-xs text-slate-500', idle && 'italic')}>{idle ? `Sem ${lowerFirst(config.job.plural)}` : teamName(teams, p.teamId)}</small>
          </span>
        </div>
        <div
          data-drop="track"
          data-pid={p.id}
          className={cx('relative shrink-0', over && 'bg-[#f7fbf8]')}
          style={{ width: hour * DAY_HOURS, height: lanes * LANE + 12, backgroundImage: `repeating-linear-gradient(to right, #e6e8ec 0 1px, transparent 1px ${hour}px)` }}
        >
          {placed.map((it) => it.render({ left: toX(it.from) + 3, width: ((it.to - it.from) / 60) * hour - 6, top: 6 + it.lane * LANE }))}
          {dropPreview(p.id)}
        </div>
      </div>
    );
  };

  const nowMin = minutesOf(now);
  const showNow = date === today && nowMin >= START && nowMin <= START + DAY_HOURS * 60;
  const unassigned = jobs.filter((j) => !j.assignees.length);

  return (
    <>
      <WindowAlert jobs={jobs} />
      <UnassignedTray jobs={unassigned} />
      <div ref={ref} data-dnd-scroll className="mt-3.5 max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div role="region" aria-label={`Cronograma de ${formatLong(date)}`} className="relative pb-[26px]"
          style={{ width: nameCol + hour * DAY_HOURS, background: `linear-gradient(to right, #fff ${nameCol}px, #f8fafc ${nameCol}px)` }}>
          <div className="sticky top-0 z-[4] flex h-[38px] border-b border-slate-200 bg-slate-50">
            <div style={{ width: nameCol }} className="sticky left-0 z-[5] flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-[12.5px] font-semibold text-slate-700">{config.person.singular}</div>
            <div className="relative shrink-0" style={{ width: hour * DAY_HOURS }}>
              {Array.from({ length: DAY_HOURS }, (_, h) => (
                <span key={h} className="absolute top-2.5 text-xs tabular-nums text-slate-500" style={{ left: h * hour + 6 }}>{String(DAY_START_HOUR + h).padStart(2, '0')}:00</span>
              ))}
            </div>
          </div>

          {visiblePeople.map((p) => renderRow(p, false))}
          {moving && hiddenPeople.map((p) => renderRow(p, true))}

          {showNow && (
            <div aria-hidden="true" className="pointer-events-none absolute bottom-0 top-0 z-[4] w-0.5 bg-[#c9302a]" style={{ left: nameCol + toX(nowMin) }}>
              <span className="absolute bottom-1.5 left-1 whitespace-nowrap rounded bg-[#c9302a] px-1 text-[10.5px] font-semibold text-white">{now}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
