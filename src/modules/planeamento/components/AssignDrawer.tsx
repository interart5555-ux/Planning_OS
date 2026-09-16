import { useState, type ReactNode } from 'react';
import { Button, cx, Drawer, Icon, inputBase, selectBase, selectStyle, type IconName } from '../../shared/ui';
import { lowerFirst, WINDOW_EMOJI } from '../config';
import { formatHours, formatLong, formatShortDay, minutesOf, plural } from '../dates';
import { absenceLabel, absenceRange, absencesOn, conflictsFor, freeHours, hasCheckin, isHighPriority, jobHours, overlaps, windowCheck } from '../rules';
import type { Job } from '../types';
import { Emoji, PersonAvatar, PriorityTag, StatusPill, teamName, usePlanning } from './context';

function Section({ icon, title, aside, children }: { icon?: IconName; title: string; aside?: string; children: ReactNode }) {
  return (
    <section className="mt-[18px]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">{icon && <Icon name={icon} className="h-[17px] w-[17px] text-slate-500" />}{title}</h3>
        {aside && <small className="text-xs text-slate-500">{aside}</small>}
      </div>
      {children}
    </section>
  );
}

const NOTICE_TONES = {
  bad: 'border-[#f3c3be] bg-[#fdf0ef] text-[#8f2219]',
  warn: 'border-[#f3dfae] bg-[#fffaf0] text-[#80570a]',
  info: 'border-[#d5e2f3] bg-[#edf3fb] text-[#2a5592]',
  ok: 'border-[#cde5d6] bg-[#e7f5ec] text-[#17643e]',
};

function Notice({ tone, title, icon, children }: { tone: keyof typeof NOTICE_TONES; title?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div role={tone === 'bad' ? 'alert' : undefined} className={cx('mt-3 flex gap-2.5 rounded-[10px] border px-3 py-2.5 text-[13px]', NOTICE_TONES[tone])}>
      {icon ?? <Icon name={tone === 'bad' ? 'alert' : tone === 'ok' ? 'check' : 'info'} className="mt-px h-[17px] w-[17px] shrink-0" />}
      <div>{title && <b className="block font-semibold">{title}</b>}{children}</div>
    </div>
  );
}

/**
 * Atribuir limpeza: equipa, colaboradores, participação e capacidade.
 * Ausências no horário bloqueiam; sobreposições mostram aviso.
 */
export function AssignDrawer({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { data, config, people, teams, actions, confirm } = usePlanning();
  const job = data.jobs.find((j) => j.id === jobId);
  const [draft, setDraft] = useState<Job | null>(() => (job ? JSON.parse(JSON.stringify(job)) as Job : null));
  if (!job || !draft) return null;

  const jobTerm = lowerFirst(config.job.singular);
  const validTime = minutesOf(draft.end) > minutesOf(draft.start);
  const duration = validTime ? jobHours(draft) : 0;
  const conflicts = validTime ? conflictsFor(draft, draft.assignees, data, people) : [];
  const absenceConflicts = conflicts.filter((c) => c.kind === 'absence');
  const overlapConflicts = conflicts.filter((c) => c.kind === 'overlap');
  const ordered = [...people].sort((a, b) => Number(a.teamId !== draft.teamId) - Number(b.teamId !== draft.teamId));
  const assignedHours = draft.assignees.reduce((s, a) => s + a.hours, 0);

  const setTime = (field: 'start' | 'end', value: string) => setDraft((d) => {
    if (!d) return d;
    const next = { ...d, [field]: value };
    // Quem tinha a duração completa acompanha a nova duração.
    if (minutesOf(next.end) > minutesOf(next.start)) {
      const oldHours = jobHours(d);
      const hours = jobHours(next);
      next.assignees = d.assignees.map((a) => (a.hours === oldHours || d.assignees.length === 1 ? { ...a, hours } : a));
    }
    return next;
  });

  const absentInSlot = (personId: string) =>
    validTime && absencesOn(data.absences, draft.date, personId).filter((a) => {
      const r = absenceRange(a);
      return overlaps(minutesOf(draft.start), minutesOf(draft.end), r.from, r.to);
    });

  const toggle = (personId: string, on: boolean) => setDraft((d) => d && ({
    ...d,
    assignees: on ? [...d.assignees, { personId, hours: Math.max(0.5, jobHours(d)) }] : d.assignees.filter((a) => a.personId !== personId),
  }));

  const assignTeam = () => {
    const members = people.filter((p) => p.teamId === draft.teamId && !draft.assignees.some((a) => a.personId === p.id) && !(absentInSlot(p.id) || []).length);
    setDraft((d) => d && ({ ...d, assignees: [...d.assignees, ...members.map((p) => ({ personId: p.id, hours: jobHours(d) }))] }));
    actions.notify(members.length
      ? `${teamName(teams, draft.teamId)}: ${plural(members.length, `${lowerFirst(config.person.singular)} adicionada`, `${lowerFirst(config.person.plural)} adicionadas`)} (sem ausências).`
      : `Não há mais ${lowerFirst(config.person.plural)} disponíveis nesta equipa.`);
  };

  const stayCheck = validTime ? windowCheck(draft, config) : null;
  const high = isHighPriority(draft, config);
  const fixedDay = hasCheckin(draft, config);

  const save = () => {
    const changed = actions.saveAssignment(draft);
    onClose();
    const after = windowCheck(draft, config);
    actions.notify(!changed ? 'Sem alterações.'
      : `${draft.assignees.length ? 'Atribuição guardada · por publicar.' : 'Guardada em “Por atribuir” · por publicar.'}${after.level === 'bad' ? ` ${WINDOW_EMOJI} ${after.short}.` : draft.date !== job.date ? ` Passou para ${formatShortDay(draft.date)}.` : ''}`);
  };

  const source = job.source === 'ical'
    ? (config.ical ? `iCal · ${job.platform ?? 'calendário'}` : 'Importada')
    : 'Manual';

  return (
    <Drawer
      label={`Atribuir ${jobTerm}`}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-col gap-2 [&_button]:!flex-auto">
          <Button variant="primary" disabled={absenceConflicts.length > 0 || !validTime} onClick={save}>Guardar atribuição</Button>
          {(job.assignees.length > 0 || draft.assignees.length > 0) && (
            <Button size="sm" onClick={() => { actions.unassign(draft); onClose(); actions.notify(`${job.location} voltou a “Por atribuir”.`); }}>Voltar a colocar em Por atribuir</Button>
          )}
          {job.source === 'manual' ? (
            <>
              <Button size="sm" variant="ghost" icon="trash" className="!text-red-700 hover:!bg-red-50"
                onClick={() => confirm({
                  title: `Remover ${jobTerm} manual?`,
                  body: `${job.location} · ${job.unit}, ${job.start}–${job.end}. Esta ação não pode ser anulada.`,
                  confirmLabel: 'Remover',
                  danger: true,
                  onConfirm: () => { actions.removeJob(job.id); onClose(); actions.notify(`${config.job.singular} manual removida.`); },
                })}>
                Remover {jobTerm} manual
              </Button>
              <p className="text-center text-xs text-slate-500">Esta {jobTerm} foi criada manualmente e pode ser eliminada.</p>
            </>
          ) : (
            <p className="text-center text-xs text-slate-500">
              {config.ical ? `Criada a partir do iCal (${job.platform ?? 'calendário'}): não pode ser eliminada manualmente.` : 'Importada automaticamente: não pode ser eliminada manualmente.'}
            </p>
          )}
        </div>
      }
    >
      <div className="pr-9">
        <h2 className="text-xl font-bold tracking-tight">{job.location} · {job.unit}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusPill status={job.status} />
          {!draft.assignees.length && <span className="inline-flex h-6 items-center rounded-full border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-600">Por atribuir</span>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-[18px] gap-y-2 text-[13.5px] text-slate-700">
        <span className="inline-flex items-center gap-1.5"><Icon name="calendar" className="h-4 w-4 text-slate-500" />{formatLong(draft.date)}</span>
        <span className="inline-flex items-center gap-1.5"><Icon name="clock" className="h-4 w-4 text-slate-500" />{draft.start} – {draft.end} ({formatHours(duration)})</span>
      </div>
      <div className="mt-3.5 grid gap-x-4 gap-y-2.5 rounded-[10px] bg-slate-50 px-3.5 py-3 sm:grid-cols-2">
        <div><small className="block text-xs text-slate-500">{config.unit}</small><b className="block font-medium">{job.location} · {job.unit}</b><span className="block text-[12.5px] text-slate-500">{job.typology}</span></div>
        <div><small className="block text-xs text-slate-500">Origem</small><b className="block font-medium">{source}</b><span className="block text-[12.5px] text-slate-500">{job.source === 'ical' ? 'Saída importada automaticamente' : 'Criada no Planeamento'}</span></div>
      </div>

      {config.stays && (
        <Section icon="home" title={`Prioridade e horário do ${lowerFirst(config.location)}`}>
          <div className="grid gap-x-4 gap-y-2.5 rounded-[10px] border border-slate-200 px-3.5 py-3 sm:grid-cols-2">
            <div>
              <small className="block text-xs text-slate-500">Prioridade</small>
              <b className="flex items-center gap-1.5 font-medium">{high ? <><PriorityTag />Saída e entrada no mesmo dia</> : fixedDay ? 'Normal · adiada' : 'Normal · só saída'}</b>
              <span className="block text-[12.5px] text-slate-500">{high ? 'Tem de terminar antes da chegada dos hóspedes.' : 'Sem entrada neste dia: há flexibilidade.'}</span>
            </div>
            <div>
              <small className="block text-xs text-slate-500">Horário por defeito</small>
              <b className="block font-medium">Saída {draft.stayTimes.checkout} · Entrada {draft.stayTimes.checkin}</b>
              <span className="block text-[12.5px] text-slate-500">Definido no {lowerFirst(config.location)} (Clientes)</span>
            </div>
          </div>
          {stayCheck?.level === 'bad' && <Notice tone="bad" title={`Fora do horário do ${lowerFirst(config.location)}`} icon={<Emoji className="mt-px">{WINDOW_EMOJI}</Emoji>}>{stayCheck.text}</Notice>}
          {stayCheck?.level === 'flex' && <Notice tone="info">{stayCheck.text}{draft.date === draft.stayDate ? ' Também podes passar para outro dia.' : ''}</Notice>}
          {stayCheck?.level === 'ok' && <Notice tone="ok">{stayCheck.text}</Notice>}
        </Section>
      )}

      <Section icon="clock" title="Horário e duração">
        {config.stays && (
          <div className="mb-2.5 grid items-end gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <label className="text-xs text-slate-500">Data
              <input type="date" min={draft.stayDate} value={draft.date} disabled={fixedDay}
                onChange={(e) => { const v = e.target.value; setDraft((d) => d && ({ ...d, date: !v || v < d.stayDate ? d.stayDate : v })); }}
                className={`${inputBase} mt-1 disabled:bg-slate-50 disabled:text-slate-400`} />
            </label>
            <p className="pb-2.5 text-[12.5px] text-slate-500">
              {fixedDay ? `Prioridade alta: fica no dia da saída (${formatShortDay(draft.stayDate)}).` : 'Sem entrada no dia da saída: a gestora pode passar para outro dia.'}
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <label className="text-xs text-slate-500">Início<input type="time" step={900} value={draft.start} onChange={(e) => setTime('start', e.target.value)} className={`${inputBase} mt-1`} /></label>
          <label className="text-xs text-slate-500">Fim<input type="time" step={900} value={draft.end} onChange={(e) => setTime('end', e.target.value)} className={`${inputBase} mt-1`} /></label>
          <div className="text-xs text-slate-500">Duração<div className={`${inputBase} mt-1 flex items-center bg-slate-50`}>{validTime ? formatHours(duration) : '—'}</div></div>
        </div>
        {!validTime && <Notice tone="bad">A hora de fim tem de ser depois do início.</Notice>}
      </Section>

      <Section icon="users" title="Equipa por defeito">
        <div className="flex gap-2">
          <select aria-label="Equipa" value={draft.teamId} onChange={(e) => { const v = e.target.value; setDraft((d) => d && ({ ...d, teamId: v })); }} className={selectBase} style={selectStyle}>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Button className="shrink-0" onClick={assignTeam}>Atribuir equipa</Button>
        </div>
      </Section>

      <Section title={`${config.person.plural} disponíveis`} aside="Horas livres · participação">
        <div className="divide-y divide-slate-200 overflow-hidden rounded-[10px] border border-slate-200">
          {ordered.map((p) => {
            const assignment = draft.assignees.find((a) => a.personId === p.id);
            const free = freeHours(p, draft.date, draft.id, data);
            const absent = absentInSlot(p.id) || [];
            const blocked = absent.length > 0 && !assignment;
            const pct = Math.round((free / p.capacity) * 100);
            return (
              <div key={p.id} className={cx('grid grid-cols-[22px_30px_minmax(0,1fr)_70px] items-center gap-x-2.5 gap-y-1.5 px-2.5 py-2 sm:grid-cols-[22px_30px_minmax(0,1fr)_92px_74px]', assignment && 'bg-[#f7fbf8]', blocked && 'bg-[#fdf6f5]')}>
                <input type="checkbox" aria-label={`Atribuir a ${p.name}`} className="h-[18px] w-[18px] accent-[#17643e]" checked={Boolean(assignment)} disabled={blocked} onChange={(e) => toggle(p.id, e.target.checked)} />
                <PersonAvatar person={p} />
                <span className="min-w-0">
                  <b className="block truncate text-[13.5px] font-medium">{p.name}</b>
                  {absent.length
                    ? <small className="block truncate text-[11.5px] font-medium text-red-700">Ausente · {absenceLabel(absent[0])}</small>
                    : <small className="block truncate text-[11.5px] text-slate-500">{teamName(teams, p.teamId)}{p.teamId === draft.teamId ? ' · equipa por defeito' : ''}</small>}
                </span>
                <span className="col-span-2 col-start-3 row-start-2 text-[11.5px] tabular-nums text-slate-700 sm:col-span-1 sm:col-start-auto sm:row-start-auto" title={`${formatHours(free)} livres de ${p.capacity}h`}>
                  {formatHours(free)} livres
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <i className={cx('block h-full rounded-full', pct === 0 ? 'bg-[#c9302a]' : pct < 35 ? 'bg-[#e39212]' : 'bg-[#17643e]')} style={{ width: `${Math.max(pct, 3)}%` }} />
                  </span>
                </span>
                <label className="col-start-4 row-start-1 flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white sm:col-start-auto sm:row-start-auto">
                  <span className="sr-only">Horas de {p.name}</span>
                  <input type="number" min={0.5} max={12} step={0.5} disabled={!assignment} value={assignment ? assignment.hours : 0}
                    onChange={(e) => {
                      const hours = Math.max(0.5, Math.min(12, Number.parseFloat(e.target.value) || 0.5));
                      setDraft((d) => d && ({ ...d, assignees: d.assignees.map((a) => (a.personId === p.id ? { ...a, hours } : a)) }));
                    }}
                    className="h-8 w-full border-0 text-center tabular-nums disabled:bg-slate-50 disabled:text-slate-400 [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <span className="pr-2 text-xs text-slate-500">h</span>
                </label>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[12.5px] text-slate-500">
          {draft.assignees.length
            ? `${plural(draft.assignees.length, lowerFirst(config.person.singular), lowerFirst(config.person.plural))} · ${formatHours(assignedHours)} atribuídas para ${formatHours(duration)} de ${jobTerm}`
            : `Sem ${lowerFirst(config.person.plural)}: fica em “Por atribuir”.`}
        </p>
        {absenceConflicts.length > 0 && (
          <Notice tone="bad" title="Conflito de horário">{absenceConflicts.map((c) => c.text).join(' ')} Não é possível atribuir durante uma ausência.</Notice>
        )}
        {overlapConflicts.length > 0 && (
          <Notice tone="bad" title="Sobreposição de horário">{overlapConflicts.map((c) => c.text).join(' ')}</Notice>
        )}
        {(() => {
          const over = draft.assignees
            .map((a) => ({ a, p: people.find((x) => x.id === a.personId) }))
            .filter(({ a, p }) => p && a.hours > freeHours(p, draft.date, draft.id, data))
            .map(({ a, p }) => `${p!.name} fica com ${formatHours(a.hours - freeHours(p!, draft.date, draft.id, data))} acima das horas livres`);
          return over.length > 0 && <Notice tone="warn">{over.join('. ')}.</Notice>;
        })()}
      </Section>
    </Drawer>
  );
}
