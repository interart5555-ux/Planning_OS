import { useEffect, useId, useState } from 'react';
import { Button, ChoiceChips, Drawer, DrawerTitle, Field, inputBase, inputError } from '../../shared/ui';
import { lower, newLabel } from '../appConfigs';
import { hasUrl, UNIT_STATUS } from '../format';
import { validateStayTimes, validateUnitName } from '../rules';
import { newId } from '../useClientsModule';
import type { Unit, UnitCalendar, UnitStatus } from '../types';
import { CalendarEditor, syncMessage, useCalendarSync, type CalendarPatch } from './CalendarEditor';
import { useClients } from './context';

interface UnitDrawerProps {
  /** null = nova unidade. */
  unit: Unit | null;
  locationName: string;
  /** Horário por defeito do local, herdado quando a unidade não tem o seu. */
  locationTimes: { checkoutTime: string; checkinTime: string };
  /** Unidades do rascunho do local (para nomes e URLs duplicados). */
  units: Unit[];
  focusCalendars?: boolean;
  onSave: (unit: Unit, isNew: boolean) => void;
  /** Resultado de uma sincronização que termina depois de o painel fechar. */
  onDetachedSync: (calendarId: string, patch: CalendarPatch) => void;
  onClose: () => void;
}

/** Dados da unidade e os seus calendários iCal (vários em simultâneo). */
export function UnitDrawer({ unit, locationName, locationTimes, units, focusCalendars, onSave, onDetachedSync, onClose }: UnitDrawerProps) {
  const { config, actions } = useClients();
  const uid = useId();
  const isNew = !unit;
  const [draft, setDraft] = useState<Unit>(() => unit
    ? { ...unit, calendars: unit.calendars.map((c) => ({ ...c })) }
    : { id: newId('u'), name: '', type: config.unit.types[0], capacity: 2, status: 'active', teamId: null, hourlyRate: null, laundry: null, checkoutTime: null, checkinTime: null, calendars: [] });
  const [timesError, setTimesError] = useState<string>();
  const ownTimes = Boolean(draft.checkoutTime && draft.checkinTime);
  const [nameError, setNameError] = useState<string>();
  const set = <K extends keyof Unit>(k: K, value: Unit[K]) => setDraft((d) => ({ ...d, [k]: value }));

  const applyPatch = (id: string, patch: CalendarPatch) =>
    setDraft((d) => ({ ...d, calendars: d.calendars.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const { syncing, sync } = useCalendarSync(applyPatch, onDetachedSync);

  // Aberto a partir de "Calendários iCal": leva o utilizador à secção.
  useEffect(() => {
    if (!focusCalendars) return;
    const section = document.getElementById(`${uid}-cal`);
    section?.scrollIntoView({ block: 'start' });
    section?.parentElement?.querySelector<HTMLElement>('section button')?.focus({ preventScroll: true });
  }, [focusCalendars, uid]);

  const unitsView = isNew ? [...units, draft] : units.map((u) => (u.id === draft.id ? draft : u));
  const term = lower(config.unit);

  const save = () => {
    const error = validateUnitName(draft.name, units, draft.id, `uma ${term}`);
    setNameError(error);
    if (error) { document.getElementById(`${uid}-name`)?.focus(); return; }
    const timeError = ownTimes ? validateStayTimes(draft.checkoutTime ?? '', draft.checkinTime ?? '') : undefined;
    setTimesError(timeError);
    if (timeError) { document.getElementById(`${uid}-in`)?.focus(); return; }
    // Calendários vazios, nunca sincronizados, não são guardados.
    onSave({ ...draft, name: draft.name.trim(), calendars: draft.calendars.filter((c) => hasUrl(c) || c.lastSync) }, isNew);
    onClose();
  };

  return (
    <Drawer
      wide
      label={isNew ? newLabel(config.unit) : `Editar ${unit.name}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>{isNew ? `Criar ${term}` : `Guardar ${term}`}</Button>
        </>
      }
    >
      <DrawerTitle eyebrow={locationName} title={isNew ? newLabel(config.unit) : unit.name}>{config.unit.hint}.</DrawerTitle>

      <div className="mt-5 flex flex-col gap-4">
        <Field label="Nome" htmlFor={`${uid}-name`} error={nameError} errorId={`${uid}-name-e`}>
          <input id={`${uid}-name`} {...(focusCalendars ? {} : { 'data-autofocus': true })} placeholder="Ex.: AP 4 Terraço" value={draft.name} onChange={(e) => set('name', e.target.value)}
            aria-invalid={Boolean(nameError)} className={`${inputBase} ${nameError ? inputError : ''}`} />
        </Field>
        <ChoiceChips<string> name={`${uid}-type`} legend="Tipo" value={draft.type} onChange={(t) => set('type', t)} options={config.unit.types.map((t) => [t, t])} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={config.unit.capacityLabel} htmlFor={`${uid}-cap`}>
            <input id={`${uid}-cap`} type="number" min={0} max={999} value={draft.capacity} onChange={(e) => set('capacity', Math.max(0, Number.parseInt(e.target.value, 10) || 0))} className={inputBase} />
          </Field>
          <ChoiceChips<UnitStatus> name={`${uid}-status`} legend="Estado" value={draft.status} onChange={(s) => set('status', s)}
            options={(Object.keys(UNIT_STATUS) as UnitStatus[]).map((k) => [k, UNIT_STATUS[k].label])} />
        </div>

        {config.features.stayTimes && (
          <section aria-labelledby={`${uid}-times`} className="border-t border-slate-200 pt-4">
            <h3 id={`${uid}-times`} className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Horário das estadias</h3>
            <p className="mb-3 mt-1 text-[12.5px] text-slate-500">Usado no Planeamento para a prioridade e o cumprimento do horário das {lower(config.unit, true)}.</p>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] accent-[#17643e]" checked={!ownTimes}
                onChange={(e) => setDraft((d) => (e.target.checked
                  ? { ...d, checkoutTime: null, checkinTime: null }
                  : { ...d, checkoutTime: locationTimes.checkoutTime, checkinTime: locationTimes.checkinTime }))} />
              <span>
                <b className="block font-medium">Usar o horário {config.location.gender === 'f' ? 'da' : 'do'} {lower(config.location)}</b>
                <small className="block text-[12.5px] text-slate-500">Saída {locationTimes.checkoutTime} · entrada {locationTimes.checkinTime}</small>
              </span>
            </label>
            {ownTimes && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Hora de saída" htmlFor={`${uid}-out`} help="Os hóspedes saem até esta hora.">
                  <input id={`${uid}-out`} type="time" step={900} value={draft.checkoutTime ?? ''} onChange={(e) => set('checkoutTime', e.target.value)} className={inputBase} />
                </Field>
                <Field label="Hora de entrada" htmlFor={`${uid}-in`} help="Os hóspedes seguintes entram a partir desta hora." error={timesError} errorId={`${uid}-in-e`}>
                  <input id={`${uid}-in`} type="time" step={900} value={draft.checkinTime ?? ''} onChange={(e) => set('checkinTime', e.target.value)}
                    aria-invalid={Boolean(timesError)} className={`${inputBase} ${timesError ? inputError : ''}`} />
                </Field>
              </div>
            )}
          </section>
        )}

        {config.features.ical && (
          <section aria-labelledby={`${uid}-cal`} className="border-t border-slate-200 pt-4">
            <h3 id={`${uid}-cal`} className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Calendários iCal</h3>
            <p className="mb-3 mt-1 text-[12.5px] text-slate-500">Um por cada plataforma onde esta {term} está anunciada. Podem estar ativos em simultâneo.</p>
            <div>
              <CalendarEditor
                unit={draft}
                units={unitsView}
                syncing={syncing}
                onChange={(calendars: UnitCalendar[]) => set('calendars', calendars)}
                onSync={(c) => sync([c], (results) => actions.notify(syncMessage(results)))}
              />
            </div>
          </section>
        )}
      </div>
    </Drawer>
  );
}
