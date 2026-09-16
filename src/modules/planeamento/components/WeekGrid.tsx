import { cx } from '../../shared/ui';
import { ABSENCE_CARD, lowerFirst, STATUS_META, WINDOW_EMOJI } from '../config';
import { formatShortDay, formatWeek, weekDays } from '../dates';
import { absenceLabel, absencesOn, hasConflict, isAllowedDate, isHighPriority, isMovable, matchesFilters, stayLabel, windowCheck } from '../rules';
import type { Job, PlanFilters, PlanPerson } from '../types';
import { cardClasses, Emoji, FlexEmoji, PersonAvatar, PriorityDot, StatusEmoji, teamName, usePlanning } from './context';
import { UnassignedTray, WindowAlert } from './Unassigned';

interface WeekGridProps {
  date: string;
  filters: PlanFilters;
  visiblePeople: PlanPerson[];
  hiddenPeople: PlanPerson[];
}

/**
 * Semana: pessoas × 7 dias. As limpezas por atribuir ficam no tabuleiro acima;
 * as de prioridade normal podem ser largadas num dia seguinte (adiadas).
 */
export function WeekGrid({ date, filters, visiblePeople, hiddenPeople }: WeekGridProps) {
  const { data, config, people, teams, today, openJob, drag, beginDrag } = usePlanning();
  const days = weekDays(date);
  const moving = drag?.kind === 'move';
  const dragged = moving ? data.jobs.find((j) => j.id === drag.jobId) : undefined;
  const inWeek = data.jobs.filter((j) => j.date >= days[0] && j.date <= days[6] && matchesFilters(j, filters, data, people, config));
  const jobsFor = (d: string, pred: (j: Job) => boolean) => inWeek.filter((j) => j.date === d && pred(j)).sort((a, b) => a.start.localeCompare(b.start));

  const chips = (list: Job[], personId: string) => list.map((j) => {
    const conflict = hasConflict(j, data, people);
    const w = windowCheck(j, config);
    const movable = isMovable(j);
    return (
      <button key={j.id} type="button" data-job-card
        onPointerDown={movable ? (e) => beginDrag(e, j.id, personId) : undefined}
        onClick={() => openJob(j.id)}
        title={`${STATUS_META[j.status].label}${conflict ? ', com conflito' : ''}${config.stays ? ` · ${stayLabel(j, config)}` : ''}`}
        className={cx('block w-full select-none truncate rounded-md border px-1.5 py-0.5 text-left text-[11.5px] leading-[1.3] [-webkit-touch-callout:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]',
          movable ? 'cursor-grab' : 'cursor-pointer', moving && drag.jobId === j.id && drag.personId === personId && 'opacity-35', cardClasses(j, conflict))}>
        <StatusEmoji status={conflict ? 'conflict' : j.status} />{' '}
        {isHighPriority(j, config) && <PriorityDot className="mr-1 align-[1px]" />}
        {w.level === 'flex' && <FlexEmoji check={w} className="mr-1" />}
        <b className="font-semibold tabular-nums">{j.start}</b> {j.location}
        {w.level === 'bad' && <> <Emoji title={w.text}>{WINDOW_EMOJI}</Emoji></>}
      </button>
    );
  });

  const cell = 'flex min-h-[58px] flex-col gap-1 border-b border-r border-slate-200 p-1.5';
  const nameCell = 'sticky left-0 z-[1] flex items-center gap-2 border-b border-r border-slate-200 bg-white px-2.5 py-2';

  const row = (p: PlanPerson, idle: boolean) => [
    <div key={`${p.id}-n`} role="rowheader" data-sticky-name className={nameCell}>
      <PersonAvatar person={p} className="hidden sm:grid" />
      <span>
        <b className="block text-[13px] font-semibold">{p.name}</b>
        <small className={cx('block text-[11.5px] text-slate-500', idle && 'italic')}>{idle ? `Sem ${lowerFirst(config.job.plural)}` : teamName(teams, p.teamId)}</small>
      </span>
    </div>,
    ...days.map((d) => {
      const target = drag?.target?.type === 'cell' && drag.target.personId === p.id && drag.target.date === d ? drag.target : null;
      const bad = target && (!target.allowed || target.slot.state !== 'ok' || target.window.level === 'bad');
      return (
        <div key={`${p.id}-${d}`} role="cell" data-drop="cell" data-pid={p.id} data-date={d}
          className={cx(cell,
            d === today && 'bg-[#eef7f1] shadow-[inset_1px_0_0_#a6d3b6,inset_-1px_0_0_#a6d3b6]',
            dragged && isAllowedDate(dragged, d, config) && 'bg-[#f7fbf8]',
            target && (bad ? 'bg-[#fdf0ef] shadow-[inset_0_0_0_2px_#c9302a]' : 'bg-[#e9f4ee] shadow-[inset_0_0_0_2px_#17643e]'))}>
          {absencesOn(data.absences, d, p.id).map((a) => (
            <div key={a.id} className={cx('rounded-md px-1.5 py-0.5 text-[11.5px] font-medium', ABSENCE_CARD)}>{absenceLabel(a)}</div>
          ))}
          {chips(jobsFor(d, (j) => j.assignees.some((x) => x.personId === p.id)), p.id)}
        </div>
      );
    }),
  ];

  return (
    <>
      <WindowAlert jobs={inWeek} withDay />
      <UnassignedTray jobs={inWeek.filter((j) => !j.assignees.length)} withDay />
      <div data-dnd-scroll className="mt-3.5 max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div role="table" aria-label={`Semana de ${formatWeek(date)}`} className="grid min-w-[1010px] grid-cols-[122px_repeat(7,minmax(128px,1fr))] sm:grid-cols-[172px_repeat(7,minmax(128px,1fr))]">
          <div role="columnheader" className="sticky left-0 top-0 z-[3] border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700">{config.person.singular}</div>
          {days.map((d) => (
            <div key={d} role="columnheader" aria-current={d === today ? 'date' : undefined}
              className={cx('sticky top-0 z-[2] border-b border-r border-slate-200 px-2.5 py-2 text-xs font-semibold', d === today ? 'bg-[#dcefe3] text-[#14532f] shadow-[inset_0_-3px_0_#17643e]' : 'bg-slate-50 text-slate-700')}>
              {formatShortDay(d)}
              {d === today && <b className="ml-1.5 inline-block rounded-full bg-[#17643e] px-1.5 text-[10.5px] leading-[17px] text-white">Hoje</b>}
            </div>
          ))}
          {visiblePeople.map((p) => row(p, false))}
          {moving && hiddenPeople.map((p) => row(p, true))}
        </div>
      </div>
    </>
  );
}
