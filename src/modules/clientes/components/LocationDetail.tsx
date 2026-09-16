import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Button, Field, inputBase } from '../../shared/ui';
import { useModulosAtivos } from '../../shared/company';
import { StaySupplySection, useOptionalInventory } from '../../inventario';
import { lower } from '../appConfigs';
import { validateStayTimes } from '../rules';
import type { ServiceLocation, Unit } from '../types';
import { useCalendarSync, type CalendarPatch } from './CalendarEditor';
import { ConfigTab } from './ConfigTab';
import { useClients } from './context';
import { LaundryTab } from './LaundryTab';
import { Breadcrumbs, Card, PageHead } from './parts';
import { UnitDrawer } from './UnitDrawer';
import { UnitsTab } from './UnitsTab';

export type DetailTab = 'config' | 'units' | 'laundry' | 'products' | 'notes';

const clone = (l: ServiceLocation): ServiceLocation => JSON.parse(JSON.stringify(l)) as ServiceLocation;

/** Estado partilhado pelos separadores do detalhe. */
export interface DetailState {
  draft: ServiceLocation;
  setDraft: (update: (d: ServiceLocation) => ServiceLocation) => void;
  selected: string[];
  setSelected: (ids: string[]) => void;
  apply: boolean;
  setApply: (v: boolean) => void;
  syncing: string[];
  syncCalendars: (units: Unit[]) => void;
  openUnit: (unit: Unit | null, focusCalendars?: boolean) => void;
  goTo: (tab: DetailTab) => void;
}

/**
 * Detalhe do local (Limpezas: alojamento). Todas as alterações ficam num
 * rascunho até "Guardar alterações".
 */
export function LocationDetail({ locationId, onDirtyChange }: { locationId: string; onDirtyChange: (dirty: boolean) => void }) {
  const { data, config, actions, navigate } = useClients();
  const source = data.locations.find((l) => l.id === locationId);
  const client = source ? data.clients.find((c) => c.id === source.clientId) : undefined;

  const [draft, setDraftState] = useState<ServiceLocation | null>(() => (source ? clone(source) : null));
  const [original, setOriginal] = useState(() => (source ? JSON.stringify(source) : ''));
  const [selected, setSelected] = useState<string[]>(() => source?.units.map((u) => u.id) ?? []);
  const [apply, setApply] = useState(true);
  const [tab, setTab] = useState<DetailTab>('config');
  const [unitPanel, setUnitPanel] = useState<{ unit: Unit | null; focusCalendars: boolean } | null>(null);
  const tabRefs = useRef<Partial<Record<DetailTab, HTMLButtonElement | null>>>({});
  const modulos = useModulosAtivos();
  const inventory = useOptionalInventory();
  // Módulo 8 (opcional): "Quem fornece os produtos?" só existe com o Inventário ativo.
  const withProducts = modulos.inventario && Boolean(inventory) && config.key === 'limpezas';

  const setDraft = (update: (d: ServiceLocation) => ServiceLocation) => setDraftState((d) => (d ? update(d) : d));
  const patchCalendar = (id: string, patch: CalendarPatch) =>
    setDraft((d) => ({ ...d, units: d.units.map((u) => ({ ...u, calendars: u.calendars.map((c) => (c.id === id ? { ...c, ...patch } : c)) })) }));
  const { syncing, sync } = useCalendarSync(patchCalendar);

  const dirty = useMemo(() => Boolean(draft) && JSON.stringify(draft) !== original, [draft, original]);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const f = config.features;
  const tabs: Array<[DetailTab, string]> = [
    ['config', 'Configuração'],
    ['units', `${config.unit.plural} (${draft?.units.length ?? 0})`],
    ...(f.laundry ? [['laundry', 'Lavandaria'] as [DetailTab, string]] : []),
    ...(withProducts ? [['products', 'Produtos'] as [DetailTab, string]] : []),
    ['notes', 'Notas'],
  ];
  const activeTab = tabs.some(([t]) => t === tab) ? tab : 'config';

  if (!source || !client || !draft) return null;

  const save = () => {
    if (!draft.name.trim() || !draft.address.trim()) {
      setTab('config');
      actions.notify(`Indica o nome e a morada ${config.location.gender === 'f' ? 'da' : 'do'} ${lower(config.location)}.`);
      return;
    }
    const timesError = f.stayTimes ? validateStayTimes(draft.checkoutTime, draft.checkinTime) : undefined;
    if (timesError) {
      setTab('config');
      actions.notify(timesError);
      return;
    }
    const { location, applied } = actions.commitLocation({ ...draft, name: draft.name.trim(), address: draft.address.trim() }, { unitIds: selected, apply });
    setDraftState(clone(location));
    setOriginal(JSON.stringify(location));
    actions.notify(`Alterações guardadas${applied ? ` · aplicadas a ${applied} ${lower(config.unit, applied !== 1)}` : ''}.`);
  };

  const syncCalendars = (units: Unit[]) => {
    const calendars = units.flatMap((u) => u.calendars);
    const n = sync(calendars, (results) => actions.notify(
      results.length === 1
        ? (results[0].status === 'error' ? `Não foi possível ler o calendário ${results[0].platform} (simulação).` : `Calendário ${results[0].platform} sincronizado (simulação).`)
        : `${results.length} calendários sincronizados${results.some((r) => r.status === 'error') ? ` · ${results.filter((r) => r.status === 'error').length} com erro` : ''} (simulação).`,
    ));
    if (!n) actions.notify(`Nenhum calendário com URL ${units.length === 1 ? `em ${units[0].name}` : 'nas unidades escolhidas'}.`);
  };

  const state: DetailState = {
    draft,
    setDraft,
    selected,
    setSelected,
    apply,
    setApply,
    syncing,
    syncCalendars,
    openUnit: (unit, focusCalendars = false) => setUnitPanel({ unit, focusCalendars }),
    goTo: (t) => { setTab(t); requestAnimationFrame(() => tabRefs.current[t]?.focus()); },
  };

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabs.findIndex(([t]) => t === activeTab);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length][0];
    state.goTo(next);
  };

  const term = lower(config.location);
  return (
    <>
      <Breadcrumbs items={[
        { label: config.client.plural, onClick: () => navigate({ name: 'clients' }) },
        { label: client.name, onClick: () => navigate({ name: 'locations', clientId: client.id }) },
        { label: draft.name || 'Sem nome' },
      ]} />
      <PageHead
        title={draft.name || 'Sem nome'}
        subtitle={config.locationSubtitle}
        actions={
          <>
            {dirty && (
              <span className="inline-flex w-full items-center gap-1.5 text-[12.5px] font-medium text-[#80570a] sm:w-auto">
                <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-[#e0a30b]" />Alterações por guardar
              </span>
            )}
            <Button icon="back" onClick={() => navigate({ name: 'locations', clientId: client.id })}>Voltar</Button>
            <Button variant="primary" icon="save" onClick={save}>Guardar alterações</Button>
          </>
        }
      />

      <div role="tablist" aria-label={`Secções do ${term}`} onKeyDown={onTabKey} className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map(([key, label]) => {
          const on = key === activeTab;
          return (
            <button key={key} ref={(el) => { tabRefs.current[key] = el; }} type="button" role="tab" id={`loc-tab-${key}`} aria-controls="loc-panel" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => setTab(key)}
              className={`-mb-px whitespace-nowrap rounded-t-lg border-b-2 px-3.5 py-2.5 ${on ? 'border-[#17643e] bg-[#e9f4ee] font-semibold text-[#17643e]' : 'border-transparent font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              {label}
            </button>
          );
        })}
      </div>

      <section id="loc-panel" role="tabpanel" aria-labelledby={`loc-tab-${activeTab}`}>
        {activeTab === 'config' && <ConfigTab state={state} />}
        {activeTab === 'units' && <UnitsTab state={state} />}
        {activeTab === 'laundry' && <LaundryTab state={state} />}
        {activeTab === 'products' && withProducts && (
          <div>
            <StaySupplySection stay={{ id: source.id, clientId: client.id, clientName: client.name, name: source.name, address: source.address, units: source.units.map((u) => u.name) }} notify={actions.notify} />
          </div>
        )}
        {activeTab === 'notes' && (
          <div className="mt-4 flex max-w-[760px] flex-col gap-4">
            <Card title="Instruções de acesso">
              <Field label="Como entrar" htmlFor="loc-access" help="Visível para a equipa na aplicação (simulação).">
                <textarea id="loc-access" rows={3} placeholder="Ex.: cofre de chaves, código da porta, porteiro…" value={draft.accessInstructions}
                  onChange={(e) => { const v = e.target.value; setDraft((d) => ({ ...d, accessInstructions: v })); }} className={`${inputBase} resize-y py-2.5`} />
              </Field>
            </Card>
            <Card title="Notas para a equipa">
              <Field label="Notas" htmlFor="loc-notes">
                <textarea id="loc-notes" rows={3} placeholder="Materiais, cuidados especiais, preferências do cliente…" value={draft.notes}
                  onChange={(e) => { const v = e.target.value; setDraft((d) => ({ ...d, notes: v })); }} className={`${inputBase} resize-y py-2.5`} />
              </Field>
            </Card>
          </div>
        )}
      </section>

      {unitPanel && (
        <UnitDrawer
          unit={unitPanel.unit}
          focusCalendars={unitPanel.focusCalendars}
          locationName={draft.name}
          locationTimes={{ checkoutTime: draft.checkoutTime, checkinTime: draft.checkinTime }}
          units={draft.units}
          onDetachedSync={patchCalendar}
          onClose={() => setUnitPanel(null)}
          onSave={(unit, isNew) => {
            setDraft((d) => ({ ...d, units: isNew ? [...d.units, unit] : d.units.map((u) => (u.id === unit.id ? unit : u)) }));
            if (isNew) setSelected([...selected, unit.id]);
            actions.notify(`${unit.name} ${isNew ? 'criada' : 'atualizada'} (por guardar).`);
          }}
        />
      )}
    </>
  );
}
