import { useId, useState, type ReactNode } from 'react';
import { ActionMenu, Button, ChoiceChips, Dialog, inputBase, Pill, selectBase, selectStyle, type MenuItem } from '../../shared/ui';
import { count, lower, newLabel } from '../appConfigs';
import { formatEuro, laundryTotal, UNIT_STATUS } from '../format';
import { isValidRate, parseRate, stayTimesOf } from '../rules';
import { newId } from '../useClientsModule';
import type { Unit, UnitStatus } from '../types';
import { CalendarChips } from './CalendarEditor';
import { teamName, useClients } from './context';
import type { DetailState } from './LocationDetail';
import { MiniTag } from './parts';

export function UnitsTab({ state }: { state: DetailState }) {
  const { config, teams, actions, confirm } = useClients();
  const { draft, setDraft, selected, setSelected } = state;
  const [bulkOpen, setBulkOpen] = useState(false);
  const f = config.features;
  const units = draft.units;
  const unitTerm = lower(config.unit);
  const fromLocation = `${config.location.gender === 'f' ? 'Da' : 'Do'} ${lower(config.location)}`;
  const selectedUnits = units.filter((u) => selected.includes(u.id));
  const busySelected = selectedUnits.some((u) => u.calendars.some((c) => state.syncing.includes(c.id)));

  const toggle = (id: string, on: boolean) => setSelected(on ? [...selected, id] : selected.filter((x) => x !== id));

  const menu = (u: Unit): MenuItem[] => {
    const items: MenuItem[] = [{ label: `Editar ${unitTerm}`, icon: 'edit', onSelect: () => state.openUnit(u) }];
    if (f.ical) items.push({ label: 'Calendários iCal', icon: 'link', onSelect: () => state.openUnit(u, true) });
    items.push({
      label: 'Duplicar', icon: 'copy', onSelect: () => {
        // Os URLs iCal são únicos por unidade: a cópia fica sem calendários.
        const copy: Unit = { ...u, id: newId('u'), name: `${u.name} (cópia)`, calendars: [] };
        setDraft((d) => {
          const i = d.units.findIndex((x) => x.id === u.id);
          return { ...d, units: [...d.units.slice(0, i + 1), copy, ...d.units.slice(i + 1)] };
        });
        setSelected([...selected, copy.id]);
        actions.notify(`${copy.name} criada${f.ical ? ', sem calendários iCal' : ''}.`);
      },
    });
    if ((f.defaultTeam && u.teamId) || (f.hourlyRate && u.hourlyRate != null) || (f.stayTimes && u.checkoutTime)) {
      items.push({
        label: `Repor valores ${config.location.gender === 'f' ? 'da' : 'do'} ${lower(config.location)}`, icon: 'refresh',
        onSelect: () => setDraft((d) => ({ ...d, units: d.units.map((x) => (x.id === u.id ? { ...x, teamId: null, hourlyRate: null, checkoutTime: null, checkinTime: null } : x)) })),
      });
    }
    items.push('separator', {
      label: `Remover ${unitTerm}`, icon: 'trash', danger: true,
      onSelect: () => confirm({
        title: `Remover ${u.name}?`,
        body: `A ${unitTerm} é removida ao guardar as alterações.`,
        confirmLabel: 'Remover', danger: true,
        onConfirm: () => {
          setDraft((d) => ({ ...d, units: d.units.filter((x) => x.id !== u.id) }));
          setSelected(selected.filter((x) => x !== u.id));
        },
      }),
    });
    return items;
  };

  const cells = (u: Unit) => ({
    team: u.teamId ? teamName(teams, u.teamId) : <>{teamName(teams, draft.teamId)}<MiniTag>{fromLocation}</MiniTag></>,
    rate: u.hourlyRate != null ? formatEuro(u.hourlyRate) : <>{formatEuro(draft.hourlyRate)}<MiniTag>{fromLocation}</MiniTag></>,
    times: (() => { const t = stayTimesOf(draft, u); return <>{t.checkout} · {t.checkin}{t.inherited && <MiniTag>{fromLocation}</MiniTag>}</>; })(),
    laundry: !draft.laundryEnabled ? <span className="text-slate-500">Desativada</span>
      : u.laundry ? <Pill tone="ok" small>{laundryTotal(u.laundry)} peças</Pill> : <span className="text-slate-500">Não envia</span>,
    status: <Pill tone={UNIT_STATUS[u.status].tone} small>{UNIT_STATUS[u.status].label}</Pill>,
  });

  const nameButton = (u: Unit) => (
    <button type="button" onClick={() => state.openUnit(u)} className="text-left font-semibold hover:text-[#17643e] hover:underline hover:underline-offset-[3px]">{u.name}</button>
  );

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 text-[13px] text-slate-600">
          {units.length > 0 ? (
            <>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="h-[18px] w-[18px] accent-[#17643e]" checked={selected.length === units.length}
                  onChange={(e) => setSelected(e.target.checked ? units.map((u) => u.id) : [])} />
                Selecionar todas
              </label>
              <span className="text-slate-500">{selected.length} de {units.length} selecionadas</span>
            </>
          ) : <span className="text-slate-500">{config.unit.hint}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {f.ical && (
            <Button size="sm" icon="refresh" loading={busySelected} disabled={!selected.length} onClick={() => state.syncCalendars(selectedUnits)}>
              {busySelected ? 'A sincronizar…' : 'Sincronizar selecionadas'}
            </Button>
          )}
          <Button size="sm" icon="copy" disabled={!selected.length} onClick={() => setBulkOpen(true)}>Aplicar a {selected.length} selecionadas</Button>
          <Button size="sm" variant="primary" icon="plus" onClick={() => state.openUnit(null)}>{newLabel(config.unit)}</Button>
        </div>
      </div>

      {units.length > 0 ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Tabela: tablet e desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-left text-[12.5px] text-slate-500 [&>th]:whitespace-nowrap [&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3.5 [&>th]:py-2.5 [&>th]:font-medium">
                  <th className="w-11"><span className="sr-only">Seleção</span></th>
                  <th>{config.unit.singular}</th>
                  {f.defaultTeam && <th>Equipa</th>}
                  {f.hourlyRate && <th>Valor/hora</th>}
                  {f.stayTimes && <th>Saída · entrada</th>}
                  {f.laundry && <th>Lavandaria</th>}
                  {f.ical && <th>Calendários iCal</th>}
                  <th>Estado</th>
                  <th className="w-12"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => {
                  const c = cells(u);
                  const on = selected.includes(u.id);
                  return (
                    <tr key={u.id} className={`border-b border-slate-200 last:border-0 [&>td]:px-3.5 [&>td]:py-2.5 ${on ? 'bg-[#f7fbf8]' : ''}`}>
                      <td><input type="checkbox" aria-label={`Selecionar ${u.name}`} className="h-[18px] w-[18px] accent-[#17643e]" checked={on} onChange={(e) => toggle(u.id, e.target.checked)} /></td>
                      <td>{nameButton(u)}<small className="block text-xs text-slate-500">{u.type} · {config.unit.capacityLabel}: {u.capacity}</small></td>
                      {f.defaultTeam && <td>{c.team}</td>}
                      {f.hourlyRate && <td className="tabular-nums">{c.rate}</td>}
                      {f.stayTimes && <td className="tabular-nums">{c.times}</td>}
                      {f.laundry && <td>{c.laundry}</td>}
                      {f.ical && <td><CalendarChips unit={u} /></td>}
                      <td>{c.status}</td>
                      <td className="text-right"><ActionMenu label={`Mais opções para ${u.name}`} items={menu(u)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Cartões: telemóvel */}
          <ul className="divide-y divide-slate-200 md:hidden">
            {units.map((u) => {
              const c = cells(u);
              const on = selected.includes(u.id);
              return (
                <li key={u.id} className={`flex gap-2.5 py-3 pl-3.5 pr-2 text-[13px] ${on ? 'bg-[#f7fbf8]' : ''}`}>
                  <input type="checkbox" aria-label={`Selecionar ${u.name}`} className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#17643e]" checked={on} onChange={(e) => toggle(u.id, e.target.checked)} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-sm">{nameButton(u)}</div>
                    <small className="block text-xs text-slate-500">{u.type} · {config.unit.capacityLabel}: {u.capacity}</small>
                    {f.defaultTeam && <div><span className="text-slate-500">Equipa: </span>{c.team}</div>}
                    {f.hourlyRate && <div><span className="text-slate-500">Valor/hora: </span>{c.rate}</div>}
                    {f.stayTimes && <div><span className="text-slate-500">Saída · entrada: </span>{c.times}</div>}
                    {f.laundry && <div><span className="text-slate-500">Lavandaria: </span>{c.laundry}</div>}
                    {f.ical && <div className="flex flex-wrap items-center gap-1"><span className="text-slate-500">iCal: </span><CalendarChips unit={u} /></div>}
                    <div>{c.status}</div>
                  </div>
                  <ActionMenu label={`Mais opções para ${u.name}`} items={menu(u)} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-slate-500">
          <b className="mb-1 block font-semibold text-slate-900">Ainda sem {lower(config.unit, true)}</b>
          Cria a primeira {unitTerm} ({config.unit.hint.toLowerCase()}).
        </div>
      )}
      <p className="mt-3 text-[12.5px] text-slate-500">
        {f.ical && `Os calendários iCal são definidos em cada ${unitTerm}: abre a ${unitTerm} para os gerir. `}
        Alterações às {lower(config.unit, true)} ficam por guardar até carregares em “Guardar alterações”.
      </p>

      {bulkOpen && <BulkApplyDialog state={state} onClose={() => setBulkOpen(false)} />}
    </>
  );
}

function ApplyOption({ label, checked, disabled, onToggle, children }: { label: string; checked: boolean; disabled?: boolean; onToggle: (on: boolean) => void; children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-slate-200 p-3">
      <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold">
        <input type="checkbox" disabled={disabled} className="h-[18px] w-[18px] accent-[#17643e]" checked={checked} onChange={(e) => onToggle(e.target.checked)} />
        {label}
      </label>
      <div className={`mt-2.5 pl-7 ${checked ? '' : 'pointer-events-none opacity-45'}`}>{children}</div>
    </div>
  );
}

/** Aplicar configurações comuns a várias unidades de uma vez. */
function BulkApplyDialog({ state, onClose }: { state: DetailState; onClose: () => void }) {
  const { config, teams, actions } = useClients();
  const uid = useId();
  const { draft, setDraft, selected } = state;
  const f = config.features;
  const n = selected.length;
  const loc = `${config.location.gender === 'f' ? 'da' : 'do'} ${lower(config.location)}`;

  const [use, setUse] = useState({ team: false, rate: false, laundry: false, status: false });
  const [teamId, setTeamId] = useState('');
  const [rate, setRate] = useState('');
  const [laundry, setLaundry] = useState<'setup' | 'none'>('setup');
  const [status, setStatus] = useState<UnitStatus>('active');

  const run = () => {
    if (!Object.values(use).some(Boolean)) { actions.notify('Escolhe pelo menos uma opção.'); return; }
    if (use.rate && !isValidRate(rate)) { actions.notify('Valor/hora inválido. Ex.: 18,00'); return; }
    setDraft((d) => ({
      ...d,
      units: d.units.map((u) => {
        if (!selected.includes(u.id)) return u;
        return {
          ...u,
          ...(use.team ? { teamId: teamId || null } : {}),
          ...(use.rate ? { hourlyRate: parseRate(rate) } : {}),
          ...(use.laundry ? { laundry: laundry === 'setup' ? { ...d.laundrySetup } : null } : {}),
          ...(use.status ? { status } : {}),
        };
      }),
    }));
    actions.notify(`Configuração aplicada a ${count(n, config.unit)} (por guardar).`);
    onClose();
  };

  return (
    <Dialog
      wide
      title={`Aplicar a ${count(n, config.unit)} ${n === 1 ? 'selecionada' : 'selecionadas'}`}
      description={`Escolhe o que queres aplicar. O resto mantém-se em cada ${lower(config.unit)}.`}
      onClose={onClose}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={run}>Aplicar</Button></>}
    >
      <div className="mt-4 flex flex-col gap-3">
        {f.defaultTeam && (
          <ApplyOption checked={use.team} onToggle={(on) => setUse((s) => ({ ...s, team: on }))} label="Equipa por defeito">
            <select aria-label="Equipa" value={teamId} onChange={(e) => setTeamId(e.target.value)} className={selectBase} style={selectStyle}>
              <option value="">Seguir o valor {loc} ({teamName(teams, draft.teamId)})</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </ApplyOption>
        )}
        {f.hourlyRate && (
          <ApplyOption checked={use.rate} onToggle={(on) => setUse((s) => ({ ...s, rate: on }))} label="Valor/hora">
            <div className="relative">
              <input aria-label="Valor/hora" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={`Vazio = seguir o valor ${loc} (${formatEuro(draft.hourlyRate)})`} className={`${inputBase} pr-10`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
            </div>
          </ApplyOption>
        )}
        {f.laundry && (
          <ApplyOption checked={use.laundry} onToggle={(on) => setUse((s) => ({ ...s, laundry: on }))} label={`Setup de lavandaria${draft.laundryEnabled ? '' : ` (desativada ${loc})`}`} disabled={!draft.laundryEnabled}>
            <ChoiceChips<'setup' | 'none'> name={`${uid}-laundry`} legend="Lavandaria" value={laundry} onChange={setLaundry}
              options={[['setup', `Usar o setup ${loc} (${laundryTotal(draft.laundrySetup)} peças)`], ['none', 'Não enviar para lavandaria']]} />
          </ApplyOption>
        )}
        <ApplyOption checked={use.status} onToggle={(on) => setUse((s) => ({ ...s, status: on }))} label="Estado">
          <ChoiceChips<UnitStatus> name={`${uid}-status`} legend="Estado" value={status} onChange={setStatus}
            options={(Object.keys(UNIT_STATUS) as UnitStatus[]).map((k) => [k, UNIT_STATUS[k].label])} />
        </ApplyOption>
        <p className="text-[12.5px] text-slate-500">
          {draft.units.filter((u) => selected.includes(u.id)).map((u) => u.name).join(', ')}
          {f.ical && `. Os calendários iCal não são alterados (são únicos por ${lower(config.unit)}).`}
        </p>
      </div>
    </Dialog>
  );
}
