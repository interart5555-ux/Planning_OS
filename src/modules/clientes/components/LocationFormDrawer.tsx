import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button, ChoiceChips, Drawer, DrawerTitle, Field, IconButton, inputBase, inputError, selectBase, selectStyle } from '../../shared/ui';
import { lower, newLabel } from '../appConfigs';
import { LOCATION_STATUS, rateToInput } from '../format';
import { DEFAULT_CHECKIN, DEFAULT_CHECKOUT, validateLocation, type LocationField } from '../rules';
import type { FieldErrors, ImageKey, LocationInput, LocationStatus } from '../types';
import { useClients } from './context';
import { IMAGE_KEYS, Illustration } from './Illustration';

/** Criar local (com as primeiras unidades) ou editar os dados principais. */
export function LocationFormDrawer({ clientId, locationId, onClose, onCreated }: { clientId: string; locationId: string | null; onClose: () => void; onCreated: (id: string) => void }) {
  const { data, config, teams, actions } = useClients();
  const uid = useId();
  const f = config.features;
  const client = data.clients.find((c) => c.id === clientId);
  const current = locationId ? data.locations.find((l) => l.id === locationId) : undefined;
  const term = lower(config.location);

  const [v, setV] = useState<LocationInput>(() => ({
    name: current?.name ?? '',
    address: current?.address ?? '',
    image: current?.image ?? 'living',
    status: current?.status ?? 'active',
    serviceIds: current?.serviceIds ?? config.services.slice(0, 1).map((s) => s.id),
    teamId: current?.teamId ?? '',
    hourlyRate: rateToInput(current?.hourlyRate ?? null),
    checkoutTime: current?.checkoutTime ?? DEFAULT_CHECKOUT,
    checkinTime: current?.checkinTime ?? DEFAULT_CHECKIN,
    unitNames: [],
  }));
  const [unitInput, setUnitInput] = useState('');
  const [errors, setErrors] = useState<FieldErrors<LocationField>>({});
  const set = <K extends keyof LocationInput>(k: K, value: LocationInput[K]) => setV((s) => ({ ...s, [k]: value }));
  const id = (x: string) => `${uid}-${x}`;

  const addUnit = () => {
    const name = unitInput.trim();
    if (name && !v.unitNames.includes(name)) set('unitNames', [...v.unitNames, name]);
    setUnitInput('');
  };
  const onUnitKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addUnit(); } };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateLocation(v, f);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) { document.getElementById(id(first))?.focus(); return; }
    const savedId = actions.saveLocation(clientId, current?.id ?? null, v, config.unit.types[0]);
    onClose();
    if (current) actions.notify(`${v.name.trim()} atualizado.`);
    else onCreated(savedId);
  };

  const formId = id('form');
  return (
    <Drawer
      label={current ? `Editar ${term}` : newLabel(config.location)}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">{current ? 'Guardar' : `Criar ${term}`}</Button>
        </>
      }
    >
      <DrawerTitle eyebrow={client?.name ?? ''} title={current?.name ?? newLabel(config.location)}>
        {current
          ? `Dados principais. A configuração completa está em “Gerir ${term}”.`
          : `Cria o ${term} e as primeiras ${lower(config.unit, true)}. Podes completar a configuração a seguir.`}
      </DrawerTitle>

      <form id={formId} noValidate onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <Field label={`Nome do ${term}`} htmlFor={id('name')} error={errors.name} errorId={`${id('name')}-e`}>
          <input id={id('name')} data-autofocus placeholder="Ex.: Rosário 123" value={v.name} onChange={(e) => set('name', e.target.value)}
            aria-invalid={Boolean(errors.name)} className={`${inputBase} ${errors.name ? inputError : ''}`} />
        </Field>
        <Field label="Morada" htmlFor={id('address')} error={errors.address} errorId={`${id('address')}-e`}>
          <input id={id('address')} placeholder="Rua, n.º, código postal e localidade" value={v.address} onChange={(e) => set('address', e.target.value)}
            aria-invalid={Boolean(errors.address)} className={`${inputBase} ${errors.address ? inputError : ''}`} />
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-slate-700">Imagem</legend>
          <div className="grid grid-cols-5 gap-2">
            {IMAGE_KEYS.map((key) => (
              <label key={key} className="relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-lg border-2 border-transparent has-[:checked]:border-[#17643e] has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-[#17643e]/25">
                <input type="radio" name={id('image')} value={key} checked={v.image === key} onChange={() => set('image', key as ImageKey)} className="absolute opacity-0" aria-label={`Imagem ${key}`} />
                <Illustration image={key} className="h-full w-full" />
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-[12.5px] text-slate-500">Simulação: nesta fase escolhe uma ilustração em vez de carregar uma fotografia.</p>
        </fieldset>

        {(f.defaultTeam || f.hourlyRate) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {f.defaultTeam && (
              <Field label="Equipa por defeito" htmlFor={id('team')}>
                <select id={id('team')} value={v.teamId} onChange={(e) => set('teamId', e.target.value)} className={selectBase} style={selectStyle}>
                  <option value="">Sem equipa</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            )}
            {f.hourlyRate && (
              <Field label="Valor/hora cobrado" optional htmlFor={id('hourlyRate')} error={errors.hourlyRate} errorId={`${id('hourlyRate')}-e`}>
                <div className="relative">
                  <input id={id('hourlyRate')} inputMode="decimal" placeholder="18,00" value={v.hourlyRate} onChange={(e) => set('hourlyRate', e.target.value)}
                    aria-invalid={Boolean(errors.hourlyRate)} className={`${inputBase} pr-10 ${errors.hourlyRate ? inputError : ''}`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
                </div>
              </Field>
            )}
          </div>
        )}

        {f.stayTimes && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hora de saída" htmlFor={id('checkoutTime')} help="Check-out por defeito.">
              <input id={id('checkoutTime')} type="time" step={900} value={v.checkoutTime} onChange={(e) => set('checkoutTime', e.target.value)} className={inputBase} />
            </Field>
            <Field label="Hora de entrada" htmlFor={id('checkinTime')} help="Check-in por defeito." error={errors.checkinTime} errorId={`${id('checkinTime')}-e`}>
              <input id={id('checkinTime')} type="time" step={900} value={v.checkinTime} onChange={(e) => set('checkinTime', e.target.value)}
                aria-invalid={Boolean(errors.checkinTime)} className={`${inputBase} ${errors.checkinTime ? inputError : ''}`} />
            </Field>
          </div>
        )}

        <ChoiceChips<LocationStatus> name={id('status')} legend="Estado" value={v.status} onChange={(s) => set('status', s)}
          options={(Object.keys(LOCATION_STATUS) as LocationStatus[]).map((k) => [k, LOCATION_STATUS[k].label])} />

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-slate-700">Serviços ativos</legend>
          <div className="flex flex-wrap gap-2">
            {config.services.map((s) => {
              const on = v.serviceIds.includes(s.id);
              return (
                <button key={s.id} type="button" aria-pressed={on}
                  onClick={() => set('serviceIds', on ? v.serviceIds.filter((x) => x !== s.id) : [...v.serviceIds, s.id])}
                  className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3.5 text-[13.5px] font-medium text-slate-600 aria-pressed:border-[#17643e] aria-pressed:bg-[#e9f4ee] aria-pressed:font-semibold aria-pressed:text-[#17643e]">
                  {s.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {!current && (
          <Field label={<>{config.unit.plural} <span className="font-normal text-slate-400">({config.unit.hint.toLowerCase()})</span></>} htmlFor={id('unit')}
            help={`Prime Enter para adicionar. Podes criar mais ${lower(config.unit, true)} depois.`}>
            {v.unitNames.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {v.unitNames.map((n) => (
                  <span key={n} className="inline-flex h-7 items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 pl-2.5 text-[13px]">
                    {n}
                    <IconButton icon="x" label={`Remover ${n}`} className="h-6 w-6" onClick={() => set('unitNames', v.unitNames.filter((x) => x !== n))} />
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input id={id('unit')} placeholder="Ex.: AP 1 Frente" value={unitInput} onChange={(e) => setUnitInput(e.target.value)} onKeyDown={onUnitKey} className={`${inputBase} min-w-0 flex-1`} />
              <Button icon="plus" onClick={addUnit} disabled={!unitInput.trim()}>Adicionar</Button>
            </div>
          </Field>
        )}
      </form>
    </Drawer>
  );
}
