import { Button, cx, Drawer, Icon, selectBase, selectStyle } from '../../shared/ui';
import { ABSENCE_CARD, lowerFirst, STATUS_META } from '../config';
import { addDays, formatHours, formatLong, formatWeek, formatWeekday, minutesOf, plural, weekDays } from '../dates';
import { absencesOn, isHighPriority, jobHours } from '../rules';
import type { Job, PlanAbsence } from '../types';
import { PersonAvatar, PriorityDot, StatusPill, teamName, usePlanning } from './context';

type Entry = { key: string; time: string; sort: number; job?: Job; absence?: PlanAbsence };

interface CollaboratorViewProps {
  personId: string;
  view: 'day' | 'week';
  date: string;
  onChange: (next: { personId?: string; view?: 'day' | 'week'; date?: string }) => void;
  onBack: () => void;
}

/** "O meu dia": o plano publicado de uma pessoa, com confirmação de leitura no cartão. */
export function CollaboratorView({ personId, view, date, onChange, onBack }: CollaboratorViewProps) {
  const { data, config, people, teams, today, actions, openDetail } = usePlanning();
  const person = people.find((p) => p.id === personId) ?? people[0];
  let hidden = 0;

  const entriesFor = (d: string): Entry[] => {
    const mine = data.jobs.filter((j) => j.date === d && j.assignees.some((a) => a.personId === person.id));
    hidden += mine.filter((j) => j.status === 'unpublished').length;
    // Só o que já foi publicado é visível para a colaboradora.
    const entries: Entry[] = mine.filter((j) => j.status !== 'unpublished').map((j) => ({ key: j.id, time: j.start, sort: minutesOf(j.start), job: j }));
    absencesOn(data.absences, d, person.id).forEach((a) => entries.push({ key: a.id, time: a.allDay ? 'Dia' : a.from ?? '', sort: a.allDay ? 0 : minutesOf(a.from ?? '00:00'), absence: a }));
    return entries.sort((a, b) => a.sort - b.sort);
  };

  const card = (e: Entry) => {
    if (e.absence) {
      const a = e.absence;
      return (
        <div className={cx('rounded-xl px-4 py-3', ABSENCE_CARD)}>
          <div className="text-[12.5px] font-semibold tabular-nums">{a.allDay ? 'Dia inteiro' : `${a.from} – ${a.to}`}</div>
          <h3 className="mt-0.5 flex items-center gap-1.5 text-[15.5px] font-bold"><Icon name="calendar" className="h-4 w-4" />{a.type}</h3>
          <div className="text-[12.5px] opacity-85">Não disponível</div>
        </div>
      );
    }
    const j = e.job!;
    return (
      <div className={cx('grid gap-x-4 gap-y-2.5 rounded-xl border px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center', STATUS_META[j.status].card)}>
        <div>
          <div className="text-[12.5px] font-semibold tabular-nums opacity-90">{j.start} – {j.end}</div>
          <h3 className="mt-0.5 text-[15.5px] font-bold">{j.location}</h3>
          <div className="text-[12.5px] opacity-85">{j.unit} · {j.typology.split(' · ')[0]} · {teamName(teams, j.teamId)}</div>
          {isHighPriority(j, config) && (
            <div className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold"><PriorityDot />Terminar até às {j.stayTimes.checkin} (entrada de hóspedes)</div>
          )}
          <div className="mt-1.5"><StatusPill status={j.status} small /></div>
        </div>
        <div className="flex items-center justify-between gap-2.5 sm:flex-col sm:items-end">
          {j.status === 'planned' && (
            <Button size="sm" variant="primary" icon="check" onClick={() => { actions.confirmRead(j.id); actions.notify(`Leitura confirmada: ${j.location} (${j.start}).`); }}>
              Confirmar leitura
            </Button>
          )}
          <button type="button" onClick={() => openDetail(j.id)} className="inline-flex items-center gap-1.5 py-0.5 text-[12.5px] font-medium underline underline-offset-[3px] opacity-90">
            <Icon name="doc" className="h-4 w-4" />Ver detalhes
          </button>
        </div>
      </div>
    );
  };

  const timeline = (d: string) => {
    const entries = entriesFor(d);
    if (!entries.length) return <div className="rounded-[10px] border border-dashed border-slate-300 px-3.5 py-2.5 text-[13px] text-slate-500">Sem {lowerFirst(config.job.plural)} publicadas.</div>;
    return (
      <ol className="grid grid-cols-[52px_1fr] gap-x-3 sm:grid-cols-[64px_1fr] sm:gap-x-3.5">
        {entries.map((e) => (
          <li key={e.key} className="contents">
            <span className="relative pr-3.5 pt-3.5 text-right text-[13px] font-semibold tabular-nums text-slate-700 before:absolute before:-bottom-3 before:right-[-4px] before:top-0 before:w-0.5 before:bg-slate-200">
              {e.time}
              <span aria-hidden="true" className="absolute right-[-8px] top-[18px] h-2.5 w-2.5 rounded-full ring-[3px] ring-white" style={{ background: e.job ? STATUS_META[e.job.status].dot : '#c9ced5' }} />
            </span>
            <div className="mb-3">{card(e)}</div>
          </li>
        ))}
      </ol>
    );
  };

  const body = view === 'day'
    ? <div className="mt-[18px]">{timeline(date)}</div>
    : weekDays(date).map((d) => (
      <section key={d} className="mt-[18px]">
        <h3 className="mb-2 text-[13px] font-semibold first-letter:uppercase text-slate-700">{formatWeekday(d)}{d === today ? ' · hoje' : ''}</h3>
        {timeline(d)}
      </section>
    ));

  return (
    <>
      <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
        <div className="flex h-10 flex-[1_1_100%] items-center rounded-[10px] border border-slate-300 bg-white md:flex-none">
          <button type="button" aria-label="Anterior" onClick={() => onChange({ date: addDays(date, view === 'day' ? -1 : -7) })} className="grid h-[38px] w-9 place-items-center rounded-[9px] text-slate-600 hover:bg-slate-50"><Icon name="chevronLeft" /></button>
          <span aria-live="polite" className="min-w-0 flex-1 whitespace-nowrap px-1.5 text-center text-[13.5px] font-medium md:min-w-[176px]">{view === 'day' ? formatLong(date) : formatWeek(date)}</span>
          <button type="button" aria-label="Seguinte" onClick={() => onChange({ date: addDays(date, view === 'day' ? 1 : 7) })} className="grid h-[38px] w-9 place-items-center rounded-[9px] text-slate-600 hover:bg-slate-50"><Icon name="chevronRight" /></button>
        </div>
        <Button onClick={() => onChange({ date: today })}>Hoje</Button>
        <div role="group" aria-label="Vista" className="flex h-10 flex-1 rounded-[10px] border border-slate-300 bg-white p-[3px] md:flex-none">
          {(['day', 'week'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => onChange({ view: v })}
              className="min-w-[74px] flex-1 rounded-[7px] px-3 text-[13.5px] font-medium text-slate-600 aria-pressed:bg-[#17643e] aria-pressed:font-semibold aria-pressed:text-white">
              {v === 'day' ? 'Dia' : 'Semana'}
            </button>
          ))}
        </div>
        <span className="hidden flex-1 md:block" />
        <label className="flex h-10 flex-[1_1_100%] items-center gap-2 rounded-[10px] border border-slate-300 bg-white pl-1.5 focus-within:border-[#17643e] md:flex-none">
          <PersonAvatar person={person} />
          <span className="sr-only">{config.person.singular}</span>
          <select value={person.id} onChange={(e) => onChange({ personId: e.target.value })} className={`${selectBase} !min-h-0 flex-1 !border-0 !ring-0`} style={selectStyle}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({config.job.plural})</option>)}
          </select>
        </label>
      </div>

      {body}

      {hidden > 0 && (
        <p className="mt-3.5 flex gap-2 rounded-[10px] bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-600">
          <Icon name="info" className="mt-px h-4 w-4 text-slate-500" />
          {plural(hidden, `${lowerFirst(config.job.singular)} ainda não publicada`, `${lowerFirst(config.job.plural)} ainda não publicadas`)} não {hidden === 1 ? 'aparece' : 'aparecem'} nesta vista até carregares em “Publicar alterações”.
        </p>
      )}
      <div className="mt-[18px]"><Button icon="back" onClick={onBack}>Voltar ao planeamento</Button></div>
    </>
  );
}

/** Detalhe só de leitura para a colaboradora. */
export function JobDetailDrawer({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { data, config, people, teams, actions } = usePlanning();
  const job = data.jobs.find((j) => j.id === jobId);
  if (!job) return null;
  const who = job.assignees.map((a) => `${people.find((p) => p.id === a.personId)?.name ?? a.personId} (${formatHours(a.hours)})`).join(', ');
  return (
    <Drawer
      label="Detalhes"
      onClose={onClose}
      footer={job.status === 'planned'
        ? <Button variant="primary" icon="check" onClick={() => { actions.confirmRead(job.id); onClose(); actions.notify(`Leitura confirmada: ${job.location}.`); }}>Confirmar leitura</Button>
        : <Button onClick={onClose}>Fechar</Button>}
    >
      <h2 className="pr-9 text-xl font-bold tracking-tight">{job.location} · {job.unit}</h2>
      <div className="mt-2"><StatusPill status={job.status} /></div>
      <div className="mt-3 flex flex-wrap gap-x-[18px] gap-y-2 text-[13.5px] text-slate-700">
        <span className="inline-flex items-center gap-1.5"><Icon name="calendar" className="h-4 w-4 text-slate-500" />{formatLong(job.date)}</span>
        <span className="inline-flex items-center gap-1.5"><Icon name="clock" className="h-4 w-4 text-slate-500" />{job.start} – {job.end} ({formatHours(jobHours(job))})</span>
      </div>
      <div className="mt-3.5 grid gap-x-4 gap-y-2.5 rounded-[10px] bg-slate-50 px-3.5 py-3 sm:grid-cols-2">
        <div><small className="block text-xs text-slate-500">{config.unit}</small><b className="block font-medium">{job.unit}</b><span className="block text-[12.5px] text-slate-500">{job.typology}</span></div>
        <div><small className="block text-xs text-slate-500">Equipa</small><b className="block font-medium">{teamName(teams, job.teamId)}</b><span className="block text-[12.5px] text-slate-500">{who || '—'}</span></div>
      </div>
      <div className="mt-3 flex gap-2.5 rounded-[10px] border border-[#d5e2f3] bg-[#edf3fb] px-3 py-2.5 text-[13px] text-[#2a5592]">
        <Icon name="home" className="mt-px h-4 w-4" />Instruções de acesso e notas do {lowerFirst(config.location)} vêm do módulo Clientes (simulação).
      </div>
    </Drawer>
  );
}
