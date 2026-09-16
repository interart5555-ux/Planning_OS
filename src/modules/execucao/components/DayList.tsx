import { cx, focusRing, Icon } from '../../shared/ui';
import { EXEC_FEATURES, STATUS_META } from '../config';
import { dayNumber, durationShort, formatDay, minutesOf, plural, timeOf, totalHours, weekDays, weekdayShort } from '../dates';
import { countDone, displayStatus, isJob, itemsOn, pendingOf } from '../rules';
import type { DayItem, ExecJob } from '../types';
import { useExec } from './context';
import { TopNotice } from './MessagesBits';
import { BigButton, ScreenTitle, StatusPill, Timer } from './parts';

/** Seletor semanal compacto (segunda a domingo). */
export function WeekStrip() {
  const { data, date, setDate, today, config } = useExec();
  return (
    <div role="group" aria-label="Semana" className="mt-4 grid grid-cols-7 gap-1.5">
      {weekDays(date).map((d) => {
        const has = data.items.some((i) => i.date === d && isJob(i));
        const selected = d === date;
        return (
          <button key={d} type="button" onClick={() => setDate(d)} aria-pressed={selected} aria-current={d === today ? 'date' : undefined}
            aria-label={`${formatDay(d)}${has ? '' : `, sem ${config.job.plural.toLowerCase()}`}`}
            className={cx('relative flex min-h-[58px] flex-col items-center justify-center rounded-xl border', focusRing,
              selected ? 'border-[#17643e] bg-[#17643e] text-white' : d === today ? 'border-[#cde5d6] bg-white shadow-[inset_0_-3px_0_#cde5d6]' : 'border-[#e6e8ec] bg-white')}>
            <small className={cx('text-[12px]', selected ? 'text-white' : 'text-slate-500')}>{weekdayShort(d)}</small>
            <b className={cx('text-[17px] font-semibold tabular-nums', !selected && 'text-slate-900')}>{dayNumber(d)}</b>
            {has && <i aria-hidden="true" className={cx('absolute bottom-1.5 h-[5px] w-[5px] rounded-full', selected ? 'bg-white' : 'bg-[#17643e]')} />}
          </button>
        );
      })}
    </div>
  );
}

function DaySummary({ items }: { items: DayItem[] }) {
  const { config, today, nowMin } = useExec();
  const jobs = items.filter(isJob);
  if (!jobs.length) return null;
  const minutes = jobs.reduce((m, j) => m + minutesOf(j.end) - minutesOf(j.start), 0);
  const toRead = jobs.filter((j) => j.status === 'planned').length;
  const late = jobs.filter((j) => displayStatus(j, today, nowMin()) === 'late').length;
  const done = jobs.filter((j) => j.status === 'done').length;
  const flagged = jobs.filter((j) => j.issues.length).length;
  const tag = 'inline-flex min-h-[26px] items-center gap-1 rounded-full px-[9px] text-[12.5px] font-semibold';
  return (
    <div aria-label="Resumo do dia" className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[14px] text-slate-700">
      <span><b className="font-semibold text-slate-900">{plural(jobs.length, config.job.singular.toLowerCase(), config.job.plural.toLowerCase())}</b> · {totalHours(minutes)}</span>
      {toRead > 0 && <span className={cx(tag, 'bg-[#fdf3c8] text-[#5b4506]')}>{toRead} por confirmar</span>}
      {late > 0 && <span className={cx(tag, 'bg-[#fde8e6] text-[#9b2318]')}>{late} em atraso</span>}
      {flagged > 0 && <span className={cx(tag, 'bg-[#fde8e6] text-[#9b2318]')}><Icon name="triangle" className="h-3.5 w-3.5" />{plural(flagged, 'aviso', 'avisos')}</span>}
      {done > 0 && <span className={cx(tag, 'bg-[#e8f5ed] text-[#17643e]')}>{done} {done === 1 ? 'concluída' : 'concluídas'}</span>}
    </div>
  );
}

function JobCard({ job }: { job: ExecJob }) {
  const { today, nowMin, openJob, actions } = useExec();
  const status = displayStatus(job, today, nowMin());
  const label = `${job.place} · ${job.unit}`;
  const onlyDelay = job.issues.length === 1 && job.issues[0].type === 'atraso';
  return (
    <article aria-label={`${label}, ${STATUS_META[status].label}`}
      className={cx('relative min-w-0 rounded-[14px] border px-3.5 py-[13px] hover:shadow-[0_6px_18px_-10px_rgba(17,24,39,.35)]', STATUS_META[status].card,
        job.issues.length > 0 && 'pl-[18px] shadow-[inset_5px_0_0_#d9463b]')}>
      <button type="button" onClick={() => openJob(job.id)}
        aria-label={`Abrir ${label}, ${job.start} a ${job.end}, ${STATUS_META[status].label}${job.issues.length ? ', com aviso' : ''}`}
        className="absolute inset-0 z-[1] rounded-[inherit] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e] focus-visible:ring-offset-2" />
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-[16px] font-semibold leading-snug">{label}</h3>
        <Icon name="chevronRight" className="mt-0.5 h-5 w-5 opacity-70" />
      </div>
      <div className="mt-[3px] text-[14.5px] tabular-nums opacity-90">{job.start} – {job.end} · {durationShort(job.start, job.end)}</div>
      <div className="mt-[3px] flex min-w-0 items-center gap-1.5 text-[13.5px] opacity-85">
        <Icon name="users" className="h-[15px] w-[15px]" /><span className="truncate">{job.team}</span>
      </div>
      {status === 'late' && job.date === today && <div className="mt-1.5 text-[13.5px] font-semibold">Início previsto às {job.start} · ainda não iniciada</div>}
      {status === 'in_progress' && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[14px]">
          {EXEC_FEATURES.timer
            ? <span className="inline-flex items-center gap-1.5 font-semibold"><Icon name="timer" className="h-[17px] w-[17px]" /><Timer job={job} /></span>
            : <span className="font-semibold">Iniciada às {timeOf(job.startedAt ?? 0)}</span>}
          <span>· {countDone(job.tasks)} de {job.tasks.length} tarefas</span>
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <StatusPill status={status} />
        {job.issues.length > 0 && (
          <span className="inline-flex min-h-[26px] items-center gap-1 rounded-full border border-[#f4c3bd] bg-white px-[9px] text-[12.5px] font-bold text-[#9b2318]">
            <Icon name="triangle" className="h-[15px] w-[15px]" />{onlyDelay ? 'Atraso' : plural(job.issues.length, 'aviso', 'avisos')}
          </span>
        )}
        {pendingOf(job) > 0 && (
          <span className="inline-flex min-h-[26px] items-center gap-1 rounded-full bg-[#edf3fb] px-[9px] text-[12.5px] font-semibold text-[#2a5592]">
            <Icon name="cloudOff" className="h-[15px] w-[15px]" />Por sincronizar
          </span>
        )}
      </div>
      {job.status === 'planned' && (
        <BigButton icon="book" block className="relative z-[2] mt-3" onClick={() => actions.confirmRead(job.id)}>Confirmar leitura</BigButton>
      )}
    </article>
  );
}

function AbsenceCard({ item }: { item: Extract<DayItem, { kind: 'absence' }> }) {
  return (
    <div className={cx('min-w-0 rounded-[14px] border px-3.5 py-[13px]', STATUS_META.absence.card)}>
      <h3 className="text-[16px] font-semibold">Ausência</h3>
      <div className="mt-[3px] text-[14.5px] tabular-nums opacity-90">{item.start} – {item.end} · {durationShort(item.start, item.end)}</div>
      <div className="mt-[3px] text-[13.5px] opacity-85">{item.reason}</div>
      <div className="mt-2.5"><StatusPill status="absence" /></div>
    </div>
  );
}

/** "O meu dia": resumo, semana e cronograma vertical. */
export function DayList() {
  const { config, person, data, date, today, nowMin } = useExec();
  const items = itemsOn(data, date);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-[680px] px-4 pb-7 pt-[18px] md:px-6">
        <ScreenTitle>{config.home}</ScreenTitle>
        <p className="mt-1 text-slate-700">{person.name} · {formatDay(date)}{date === today ? ' · hoje' : ''}</p>
        <WeekStrip />
        {date === today && <TopNotice />}
        <DaySummary items={items} />
        <ol className="mt-[18px]">
          {!items.length && (
            <li className="rounded-[14px] border border-dashed border-slate-300 px-4 py-6 text-center text-slate-500">Dia livre · sem {config.job.plural.toLowerCase()} planeadas.</li>
          )}
          {items.map((item, idx) => {
            const status = displayStatus(item, today, nowMin());
            return (
              <li key={item.id} className="relative grid grid-cols-[50px_18px_minmax(0,1fr)] gap-x-1.5 pb-3.5">
                {idx < items.length - 1 && <span aria-hidden="true" className="absolute bottom-[-2px] left-[64px] top-[22px] w-0.5 bg-slate-200" />}
                <span className="pt-[13px] text-[14px] tabular-nums text-slate-700">{item.start}</span>
                <span aria-hidden="true" className={cx('relative z-[1] ml-px mt-[17px] h-3.5 w-3.5 rounded-full shadow-[0_0_0_3px_#fff]', STATUS_META[status].dot)} />
                {isJob(item) ? <JobCard job={item} /> : <AbsenceCard item={item} />}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
