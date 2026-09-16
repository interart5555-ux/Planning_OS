import { useId } from 'react';
import { Button, ChoiceChips, cx, Field, Icon, inputBase, inputError, selectBase, selectStyle, TextLink } from '../../shared/ui';
import { lower } from '../appConfigs';
import { LAUNDRY_ITEMS, laundryTotal, LOCATION_STATUS, rateToInput } from '../format';
import { calendarSummary, isValidRate, parseRate, validateStayTimes } from '../rules';
import type { LaundryItem, LocationStatus, UnitCalendar } from '../types';
import { CalendarChips, CalendarEditor } from './CalendarEditor';
import { useClients } from './context';
import type { DetailState } from './LocationDetail';
import { Card, Note } from './parts';

const joinPt = (list: string[]) => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`);

export function ConfigTab({ state }: { state: DetailState }) {
  const { config, teams } = useClients();
  const uid = useId();
  const { draft, setDraft, selected, setSelected, apply, setApply } = state;
  const f = config.features;
  const units = draft.units;
  const unitTerm = lower(config.unit);
  const locTerm = lower(config.location);
  const selectedNames = units.filter((u) => selected.includes(u.id)).map((u) => u.name);

  const setQty = (item: LaundryItem, value: number) =>
    setDraft((d) => ({ ...d, laundrySetup: { ...d.laundrySetup, [item]: Math.max(0, Math.min(20, value)) } }));

  /* ---- resumo do que acontece ao guardar ---- */
  let summary: string;
  if (!units.length) summary = `Ao guardar, só o ${locTerm} é atualizado.`;
  else if (apply && selected.length) {
    const what = [
      f.defaultTeam ? 'a equipa por defeito' : '',
      f.hourlyRate ? 'o valor/hora' : '',
      f.stayTimes ? 'o horário de saída e entrada' : '',
      f.laundry ? (draft.laundryEnabled ? 'o setup de lavandaria' : 'a desativação da lavandaria') : '',
    ].filter(Boolean);
    const target = `${selected.length} ${lower(config.unit, selected.length !== 1)} ${selected.length === 1 ? 'selecionada' : 'selecionadas'}`;
    summary = what.length ? `Ao guardar, ${joinPt(what)} ${what.length > 1 ? 'são aplicados' : 'é aplicado'} a ${target}.` : `Ao guardar, as preferências são aplicadas a ${target}.`;
  } else summary = `Ao guardar, só o ${locTerm} é atualizado; as ${lower(config.unit, true)} mantêm a configuração atual.`;

  /* ---- iCal: editor direto quando o local tem uma única unidade ---- */
  const calendars = (() => {
    if (!f.ical) return null;
    if (!units.length) return <p className="text-slate-500">Os calendários ficam em cada {unitTerm}. Cria primeiro as {lower(config.unit, true)}.</p>;
    if (units.length === 1) {
      const only = units[0];
      return (
        <>
          <p className="-mt-1.5 mb-3 text-[12.5px] text-slate-500">Este {locTerm} tem uma única {unitTerm} ({only.name}): os calendários ficam associados a ela. Podes ter vários em simultâneo, um por plataforma.</p>
          <CalendarEditor unit={only} units={units} syncing={state.syncing}
            onChange={(cals: UnitCalendar[]) => setDraft((d) => ({ ...d, units: d.units.map((u) => (u.id === only.id ? { ...u, calendars: cals } : u)) }))}
            onSync={(c) => state.syncCalendars([{ ...only, calendars: [c] }])} />
        </>
      );
    }
    const s = calendarSummary(units);
    const busy = units.some((u) => u.calendars.some((c) => state.syncing.includes(c.id)));
    return (
      <>
        <p className="-mt-1.5 mb-1.5 text-[13px] text-slate-600">
          <b>{s.unitsWithCalendar} de {units.length}</b> {lower(config.unit, true)} com calendário · {s.connected} {s.connected === 1 ? 'ligado' : 'ligados'}
          {s.errors > 0 && <span className="font-medium text-[#b42318]"> · {s.errors} com erro</span>}
        </p>
        {units.map((u) => (
          <div key={u.id} className="flex items-center gap-2.5 border-t border-slate-200 py-2 text-[13.5px]">
            <span className="min-w-0 flex-1">{u.name}</span>
            <CalendarChips unit={u} />
          </div>
        ))}
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button size="sm" icon="refresh" loading={busy} disabled={!s.connected && !s.errors && !units.some((u) => u.calendars.length)} onClick={() => state.syncCalendars(units)}>
            {busy ? 'A sincronizar…' : 'Sincronizar todas'}
          </Button>
          <Button size="sm" variant="ghost" iconRight="arrow" onClick={() => state.goTo('units')}>Gerir nas {lower(config.unit, true)}</Button>
        </div>
        <p className="mt-2 text-[12.5px] text-slate-500">Cada calendário pertence a uma {unitTerm} e não é afetado por “Aplicar a todas as unidades selecionadas”.</p>
      </>
    );
  })();

  const left = (
    <div className="flex min-w-0 flex-col gap-4">
      <Card title="Informação geral">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label={`Nome do ${locTerm}`} htmlFor={`${uid}-name`}>
            <input id={`${uid}-name`} value={draft.name} onChange={(e) => { const v = e.target.value; setDraft((d) => ({ ...d, name: v })); }} aria-invalid={!draft.name.trim()} className={inputBase} />
          </Field>
          <Field label="Morada" htmlFor={`${uid}-address`}>
            <input id={`${uid}-address`} value={draft.address} onChange={(e) => { const v = e.target.value; setDraft((d) => ({ ...d, address: v })); }} aria-invalid={!draft.address.trim()} className={inputBase} />
          </Field>
        </div>
        <div className="mt-3.5">
          <ChoiceChips<LocationStatus> name={`${uid}-status`} legend="Estado" value={draft.status} onChange={(s) => setDraft((d) => ({ ...d, status: s }))}
            options={(Object.keys(LOCATION_STATUS) as LocationStatus[]).map((k) => [k, LOCATION_STATUS[k].label])} />
        </div>
      </Card>

      <Card
        title={`${config.unit.plural} ${config.location.gender === 'f' ? 'desta' : 'deste'} ${locTerm}`}
        aside={units.length > 0 && (
          <TextLink onClick={() => setSelected(selected.length === units.length ? [] : units.map((u) => u.id))}>
            {selected.length === units.length ? 'Limpar seleção' : 'Selecionar todas'}
          </TextLink>
        )}
      >
        {units.length ? (
          <>
            <div className="flex flex-wrap gap-x-[22px] gap-y-2.5">
              {units.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2 text-[13.5px]">
                  <input type="checkbox" className="h-[18px] w-[18px] accent-[#17643e]" checked={selected.includes(u.id)}
                    onChange={(e) => setSelected(e.target.checked ? [...selected, u.id] : selected.filter((x) => x !== u.id))} />
                  {u.name}
                </label>
              ))}
            </div>
            <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 border-t border-slate-200 pt-3.5">
              <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] accent-[#17643e]" checked={apply} onChange={(e) => setApply(e.target.checked)} />
              <span>
                <b className="block font-medium">Aplicar a todas as unidades selecionadas</b>
                <small className="mt-0.5 block text-[12.5px] text-slate-500">As preferências abaixo serão aplicadas a todas as unidades selecionadas.</small>
              </span>
            </label>
          </>
        ) : (
          <p className="text-slate-500">Ainda sem {lower(config.unit, true)}. <TextLink onClick={() => state.goTo('units')}>Criar {lower(config.unit, true)}</TextLink></p>
        )}
      </Card>

      {(f.defaultTeam || f.hourlyRate) && (
        <Card title="Equipa e preço">
          <div className="grid gap-3.5 sm:grid-cols-2">
            {f.defaultTeam && (
              <Field label="Equipa por defeito" htmlFor={`${uid}-team`} help={`Sugerida no Planeamento para este ${locTerm}.`}>
                <select id={`${uid}-team`} value={draft.teamId ?? ''} onChange={(e) => { const v = e.target.value || null; setDraft((d) => ({ ...d, teamId: v })); }} className={selectBase} style={selectStyle}>
                  <option value="">Sem equipa</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            )}
            {f.hourlyRate && <RateField id={`${uid}-rate`} value={draft.hourlyRate} onChange={(v) => setDraft((d) => ({ ...d, hourlyRate: v }))} />}
          </div>
        </Card>
      )}

      {f.stayTimes && (() => {
        const timesError = validateStayTimes(draft.checkoutTime, draft.checkinTime);
        return (
          <Card title="Horário das estadias" aside="Por defeito">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Hora de saída" htmlFor={`${uid}-out`} help="Check-out: os hóspedes saem até esta hora.">
                <input id={`${uid}-out`} type="time" step={900} value={draft.checkoutTime} onChange={(e) => { const v = e.target.value; setDraft((d) => ({ ...d, checkoutTime: v })); }} className={inputBase} />
              </Field>
              <Field label="Hora de entrada" htmlFor={`${uid}-in`} help="Check-in: os hóspedes seguintes entram a partir desta hora." error={timesError} errorId={`${uid}-in-e`}>
                <input id={`${uid}-in`} type="time" step={900} value={draft.checkinTime} onChange={(e) => { const v = e.target.value; setDraft((d) => ({ ...d, checkinTime: v })); }}
                  aria-invalid={Boolean(timesError)} className={`${inputBase} ${timesError ? inputError : ''}`} />
              </Field>
            </div>
            <Note className="mt-3">
              No Planeamento, uma {lower(config.unit)} com saída e entrada no mesmo dia tem prioridade alta e a limpeza tem de caber entre estas horas. Cada {lower(config.unit)} herda este horário e pode ter o seu.
            </Note>
          </Card>
        );
      })()}

      {f.ical && (
        <Card title="Integração iCal" aside={`Simulação · por ${unitTerm}`}>{calendars}</Card>
      )}
    </div>
  );

  const right = f.laundry && (
    <div className="flex min-w-0 flex-col gap-4">
      <Card>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" role="switch" className="peer sr-only" checked={draft.laundryEnabled} onChange={(e) => { const v = e.target.checked; setDraft((d) => ({ ...d, laundryEnabled: v })); }} />
          <span aria-hidden="true" className="relative mt-px h-6 w-[42px] shrink-0 rounded-full bg-slate-300 transition after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow after:transition after:content-[''] peer-checked:bg-[#17643e] peer-checked:after:translate-x-[18px] peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#17643e]/25" />
          <span>
            <b className="block text-[13.5px] font-semibold">Envia roupa para lavandaria externa</b>
            <small className="mt-0.5 block text-[12.5px] text-slate-500">Ativa se este {locTerm} envia a roupa para uma lavandaria externa.</small>
          </span>
        </label>
      </Card>
      {draft.laundryEnabled && (
        <Card title="Setup de lavandaria" aside={`${laundryTotal(draft.laundrySetup)} peças`}>
          <p className="-mt-1.5 mb-1.5 text-[12.5px] text-slate-500">Quantidades por unidade</p>
          {LAUNDRY_ITEMS.map(([item, label]) => (
            <div key={item} className="flex items-center justify-between gap-3 border-t border-slate-200 py-1.5 first-of-type:border-0">
              <label htmlFor={`${uid}-q-${item}`} className="text-[13.5px] text-slate-700">{label}</label>
              <div className="flex items-center overflow-hidden rounded-[9px] border border-slate-300 bg-white">
                <button type="button" aria-label={`Diminuir ${label}`} onClick={() => setQty(item, draft.laundrySetup[item] - 1)} className="grid h-[34px] w-8 place-items-center bg-slate-50 text-slate-600 hover:bg-slate-100"><Icon name="minus" className="h-4 w-4" /></button>
                <input id={`${uid}-q-${item}`} type="number" min={0} max={20} value={draft.laundrySetup[item]}
                  onChange={(e) => setQty(item, Number.parseInt(e.target.value, 10) || 0)}
                  className="h-[34px] w-12 border-x border-slate-300 text-center tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none" />
                <button type="button" aria-label={`Aumentar ${label}`} onClick={() => setQty(item, draft.laundrySetup[item] + 1)} className="grid h-[34px] w-8 place-items-center bg-slate-50 text-slate-600 hover:bg-slate-100"><Icon name="plus" className="h-4 w-4" /></button>
                <span className="px-2 text-xs text-slate-500">un.</span>
              </div>
            </div>
          ))}
          <Note className="mt-3">
            Estas quantidades serão aplicadas às unidades selecionadas.{selectedNames.length > 0 && <b> {selectedNames.join(', ')}.</b>}
          </Note>
          {(!apply || !selected.length) && units.length > 0 && (
            <Note tone="warn" icon="alert" className="mt-2">
              {!selected.length ? 'Seleciona pelo menos uma unidade.' : 'Ativa “Aplicar a todas as unidades selecionadas” para aplicar este setup.'}
            </Note>
          )}
        </Card>
      )}
    </div>
  );

  return (
    <>
      <div className={cx('mt-4 grid items-start gap-4', right ? 'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]' : 'max-w-[760px]')}>
        {left}
        {right}
      </div>
      <div aria-live="polite" className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#cde5d6] bg-[#e9f4ee] px-3.5 py-3 text-[13px] text-slate-700">
        <Icon name="info" className="h-[18px] w-[18px] text-[#17643e]" />
        <span>{summary}</span>
      </div>
    </>
  );
}

/** Valor/hora com texto livre; só grava números válidos. */
function RateField({ id, value, onChange }: { id: string; value: number | null; onChange: (v: number | null) => void }) {
  const text = rateToInput(value);
  return (
    <Field label="Valor/hora" htmlFor={id} help="Valor cobrado ao cliente por hora.">
      <div className="relative">
        <input id={id} key={text} inputMode="decimal" defaultValue={text}
          onBlur={(e) => { if (isValidRate(e.target.value)) onChange(parseRate(e.target.value)); else e.target.value = text; }}
          className={`${inputBase} pr-10`} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
      </div>
    </Field>
  );
}
