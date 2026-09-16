import { useId, useState, type FormEvent } from 'react';
import { ABSENCE_TYPE_LABEL, absenceDuration, absenceHours, addDays, formatRange } from '../format';
import type { AbsenceDraft, AbsenceType } from '../types';
import { findOverlap, hasValidPeriod, validateAbsence } from '../validation';
import { useTeams } from './context';
import { Button, ChoiceChips, Drawer, DrawerTitle, Field, Icon, inputBase, inputError, selectBase, selectStyle, Switch } from '../../shared/ui';

/**
 * Registar ausência de dia inteiro, vários dias ou parcial (por horas).
 * Numa fase seguinte, as ausências bloqueiam atribuições no Planeamento.
 */
export function AbsenceDrawer({ presetPersonId, onClose }: { presetPersonId?: string; onClose: () => void }) {
  const { data, today, actions } = useTeams();
  const uid = useId();
  const tomorrow = addDays(today, 1);
  const [draft, setDraft] = useState<AbsenceDraft>({
    personId: presetPersonId ?? '',
    type: 'ferias',
    start: tomorrow,
    end: tomorrow,
    allDay: true,
    from: '09:00',
    to: '13:00',
    status: 'approved',
    note: '',
  });
  const [errors, setErrors] = useState<ReturnType<typeof validateAbsence>>({});
  const set = <K extends keyof AbsenceDraft>(k: K, v: AbsenceDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  // Colaboradores agrupados por equipa (a administradora não regista ausências aqui).
  const eligible = data.people.filter((p) => !p.archived && p.role !== 'admin');
  const groups = [
    ...data.teams.map((t) => ({ label: t.name, people: eligible.filter((p) => p.teamId === t.id) })),
    { label: 'Sem equipa', people: eligible.filter((p) => !p.teamId) },
  ].filter((g) => g.people.length > 0);

  const person = data.people.find((p) => p.id === draft.personId);
  const periodOk = hasValidPeriod(draft);
  const overlap = draft.personId && periodOk ? findOverlap(draft, data.absences) : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateAbsence(draft);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) { document.getElementById(`${uid}-${first}`)?.focus(); return; }
    actions.addAbsence(draft);
    onClose();
  };

  const formId = `${uid}-form`;
  const err = (k: keyof typeof errors) => ({
    'aria-invalid': Boolean(errors[k]),
    'aria-describedby': errors[k] ? `${uid}-${k}-e` : undefined,
    className: `${inputBase} ${errors[k] ? inputError : ''}`,
  });

  return (
    <Drawer
      label="Registar ausência"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">Registar ausência</Button>
        </>
      }
    >
      <DrawerTitle eyebrow="Ausências" title="Registar ausência">Pode ser um dia inteiro, vários dias ou apenas algumas horas.</DrawerTitle>

      <form id={formId} className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
        <Field label="Colaborador" htmlFor={`${uid}-personId`} error={errors.personId} errorId={`${uid}-personId-e`}>
          <select id={`${uid}-personId`} data-autofocus value={draft.personId} onChange={(e) => set('personId', e.target.value)}
            {...err('personId')} className={`${selectBase} ${errors.personId ? inputError : ''}`} style={selectStyle}>
            <option value="">Escolher colaborador…</option>
            {groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>

        <ChoiceChips<AbsenceType>
          name={`${uid}-type`}
          legend="Tipo"
          value={draft.type}
          onChange={(v) => set('type', v)}
          options={(Object.keys(ABSENCE_TYPE_LABEL) as AbsenceType[]).map((k) => [k, ABSENCE_TYPE_LABEL[k]])}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data de início" htmlFor={`${uid}-start`} error={errors.start} errorId={`${uid}-start-e`}>
            <input id={`${uid}-start`} type="date" value={draft.start} {...err('start')}
              // Mantém o fim coerente quando o início passa à frente.
              onChange={(e) => { const start = e.target.value; setDraft((d) => ({ ...d, start, end: !d.end || d.end < start ? start : d.end })); }} />
          </Field>
          <Field label="Data de fim" htmlFor={`${uid}-end`} error={errors.end} errorId={`${uid}-end-e`}>
            <input id={`${uid}-end`} type="date" min={draft.start || undefined} value={draft.end} onChange={(e) => set('end', e.target.value)} {...err('end')} />
          </Field>
        </div>

        <Switch checked={draft.allDay} onChange={(v) => set('allDay', v)} label="Dia inteiro" description="Desliga para registar uma ausência parcial, durante algumas horas." />

        {!draft.allDay && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hora de início" htmlFor={`${uid}-from`} error={errors.from} errorId={`${uid}-from-e`}>
              <input id={`${uid}-from`} type="time" step={900} value={draft.from} onChange={(e) => set('from', e.target.value)} {...err('from')} />
            </Field>
            <Field label="Hora de fim" htmlFor={`${uid}-to`} error={errors.to} errorId={`${uid}-to-e`}>
              <input id={`${uid}-to`} type="time" step={900} value={draft.to} onChange={(e) => set('to', e.target.value)} {...err('to')} />
            </Field>
          </div>
        )}

        <ChoiceChips<AbsenceDraft['status']>
          name={`${uid}-status`}
          legend="Estado"
          value={draft.status}
          onChange={(v) => set('status', v)}
          options={[['approved', 'Aprovada'], ['pending', 'Pendente de aprovação']]}
        />

        <Field label="Nota" optional htmlFor={`${uid}-note`}>
          <textarea id={`${uid}-note`} rows={3} value={draft.note} onChange={(e) => set('note', e.target.value)} placeholder="Ex.: consulta marcada no centro de saúde"
            className={`${inputBase} resize-y py-2.5`} />
        </Field>

        {overlap && person && (
          <div className="flex gap-2.5 rounded-[10px] border border-[#f3dfae] bg-[#fffaf0] px-3 py-2.5 text-[13px] text-[#80570a]">
            <Icon name="alert" className="h-[17px] w-[17px]" />
            <span>{person.name} já tem uma ausência neste período: {ABSENCE_TYPE_LABEL[overlap.type]}, {formatRange(overlap.start, overlap.end)} ({absenceHours(overlap)}).</span>
          </div>
        )}

        <div aria-live="polite" className="rounded-xl border border-[#cde5d6] bg-[#e9f4ee] px-4 py-3.5">
          <h3 className="mb-1.5 text-[13px] font-semibold text-[#17643e]">Resumo</h3>
          {periodOk ? (
            <dl className="text-sm [&>div]:flex [&>div]:justify-between [&>div]:gap-3 [&>div]:py-1 [&_dd]:text-right [&_dd]:font-semibold [&_dt]:text-slate-600">
              {person && <div><dt>Colaborador</dt><dd>{person.name}</dd></div>}
              <div><dt>Tipo</dt><dd>{ABSENCE_TYPE_LABEL[draft.type]}{draft.allDay ? '' : ' · parcial'}</dd></div>
              <div><dt>Período</dt><dd>{formatRange(draft.start, draft.end)}</dd></div>
              <div><dt>Horário</dt><dd>{absenceHours(draft)}</dd></div>
              <div><dt>Duração</dt><dd>{absenceDuration(draft)}</dd></div>
            </dl>
          ) : (
            <p className="py-1 text-sm text-slate-600">Completa as datas{draft.allDay ? '' : ' e as horas'} para ver a duração.</p>
          )}
          <p className="mt-2.5 flex gap-2 text-[12.5px] text-slate-600">
            <Icon name="calendar" className="mt-px h-[15px] w-[15px] text-[#17643e]" />
            <span>Numa fase seguinte, esta ausência vai bloquear atribuições incompatíveis no Planeamento.</span>
          </p>
        </div>
      </form>
    </Drawer>
  );
}
