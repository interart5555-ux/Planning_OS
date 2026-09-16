import { useState } from 'react';
import { Button, cx, Icon } from '../../shared/ui';
import { LOCATION_TYPES } from '../config';
import { group, plural } from '../format';
import { clientById, itemsAt, productsAt, stateOf, stayById } from '../rules';
import type { LocationFilters, LocationType, Owner, StockLocation } from '../types';
import { useInventoryUi } from './context';
import { clientLines, clientOptions, stayOptions } from './helpers';
import {
  card, ctl, ctlSelect, EmptyState, errProps, FilterSelect, FormField, LocationIcon, MobileCard, OwnerPill, PageHeader, SearchInput, SectionTabs, Segmented, selectStyle, tableWrap, td, th, UnderlineTabs,
} from './parts';

export interface NewLocationPreset { clientId: string; stayId: string; name: string }

type Draft = { name: string; type: LocationType; owner: Owner; clientId: string; stayId: string; unit: string; detail: string; access: string };
const emptyDraft = (owner: Owner = 'client', preset?: NewLocationPreset | null): Draft => ({
  name: preset?.name ?? '', type: owner === 'client' ? 'Alojamento' : 'Armazém', owner, clientId: preset?.clientId ?? '', stayId: preset?.stayId ?? '', unit: '', detail: '', access: '',
});

/** Formulário "Novo local de stock"; `bare` sem cartão (dentro de um diálogo). */
export function NewLocationForm({ preset, onCreated, bare }: { preset: NewLocationPreset | null; onCreated?: (l: StockLocation) => void; bare?: boolean }) {
  const { data, actions, notify } = useInventoryUi();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft('client', preset));
  const locked = Boolean(bare && preset);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const isClient = draft.owner === 'client';
  const stay = stayById(data, draft.stayId);
  const types = LOCATION_TYPES.filter(([t]) => (isClient ? t === 'Alojamento' || t === 'Unidade' : t === 'Armazém' || t === 'Carrinha'));
  const set = (patch: Partial<Draft>) => { setDraft({ ...draft, ...patch }); setErrors((e) => { const next = { ...e }; Object.keys(patch).forEach((k) => delete next[k as keyof Draft]); return next; }); };

  const submit = () => {
    const e: typeof errors = {};
    if (!draft.name.trim() || draft.name.trim().endsWith('·')) e.name = 'Indica o nome do local.';
    if (isClient && !draft.clientId) e.clientId = 'Escolhe o cliente.';
    if (isClient && !draft.stayId) e.stayId = 'Escolhe o alojamento.';
    if (isClient && draft.type === 'Unidade' && !draft.unit) e.unit = 'Escolhe a unidade.';
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) { document.getElementById(`nl-${first}`)?.focus(); return; }
    const l = actions.createLocation({ ...draft, name: draft.name.trim(), detail: draft.detail.trim(), access: draft.access.trim() });
    notify(`Local de stock criado: ${l.name}.`);
    setDraft(emptyDraft(draft.owner));
    onCreated?.(l);
    document.getElementById('nl-name')?.focus();
  };

  return (
    <section aria-labelledby={bare ? undefined : 'nl-title'} className={bare ? '' : cx(card, 'px-4 py-[18px] sm:px-5')}>
      {!bare && <h2 id="nl-title" className="text-base font-semibold">Novo local de stock</h2>}
      <FormField id="nl-name" label="Nome do local" required error={errors.name}>
        <input id="nl-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder={isClient ? 'Ex.: Armário de limpeza' : 'Ex.: Carrinha 2'} className={ctl} aria-required="true" {...errProps('nl-name', errors.name)} />
      </FormField>
      <FormField id="nl-type" label="Tipo de local">
        <select id="nl-type" value={draft.type} onChange={(e) => set({ type: e.target.value as LocationType })} className={ctlSelect} style={selectStyle}>
          {types.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </FormField>
      {!locked && <div className="mt-3.5">
        <span className="mb-1.5 block text-[13px] font-semibold text-slate-800">Proprietário do stock</span>
        <Segmented label="Proprietário do stock" value={draft.owner} options={[['company', 'Empresa'], ['client', 'Cliente']]}
          onChange={(owner) => { setDraft(emptyDraft(owner)); setErrors({}); }} />
      </div>}
      {isClient && !locked && (
        <>
          <FormField id="nl-clientId" label="Cliente" required error={errors.clientId}>
            <select id="nl-clientId" value={draft.clientId} onChange={(e) => set({ clientId: e.target.value, stayId: '', unit: '' })} className={ctlSelect} style={selectStyle} aria-required="true" {...errProps('nl-clientId', errors.clientId)}>
              {clientOptions(data, 'Selecionar cliente…').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </FormField>
          <div className="grid gap-x-3 min-[480px]:grid-cols-2">
            <FormField id="nl-stayId" label="Alojamento" required error={errors.stayId}>
              <select id="nl-stayId" value={draft.stayId} disabled={!draft.clientId} onChange={(e) => set({ stayId: e.target.value, unit: '' })} className={ctlSelect} style={selectStyle} aria-required="true" {...errProps('nl-stayId', errors.stayId)}>
                {stayOptions(data, draft.clientId, draft.clientId ? 'Selecionar…' : 'Escolhe o cliente').filter(([v]) => v === '' || !!draft.clientId).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </FormField>
            <FormField id="nl-unit" label="Unidade" required={draft.type === 'Unidade'} optional={draft.type !== 'Unidade'} error={errors.unit}>
              <select id="nl-unit" value={draft.unit} disabled={!stay} onChange={(e) => set({ unit: e.target.value })} className={ctlSelect} style={selectStyle} {...errProps('nl-unit', errors.unit)}>
                <option value="">Nenhuma</option>
                {(stay?.units ?? []).map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </FormField>
          </div>
        </>
      )}
      {locked && stay && (
        <FormField id="nl-unit" label="Unidade" required={draft.type === 'Unidade'} optional={draft.type !== 'Unidade'} error={errors.unit}>
          <select id="nl-unit" value={draft.unit} onChange={(e) => set({ unit: e.target.value })} className={ctlSelect} style={selectStyle} {...errProps('nl-unit', errors.unit)}>
            <option value="">Nenhuma</option>
            {stay.units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </FormField>
      )}
      <FormField id="nl-detail" label="Morada / Detalhes">
        <input id="nl-detail" value={draft.detail} onChange={(e) => set({ detail: e.target.value })} placeholder={isClient ? 'Ex.: Armário de limpeza · 2.º Frente' : 'Ex.: Rua da Indústria 120, Porto'} className={ctl} />
      </FormField>
      <FormField id="nl-access" label="Descrição ou indicação de acesso" optional>
        <textarea id="nl-access" rows={2} value={draft.access} onChange={(e) => set({ access: e.target.value })} placeholder="Ex.: Pedir a chave ao porteiro" className={cx(ctl, 'resize-y py-2.5')} />
      </FormField>
      <Button variant="primary" icon="plus" className="mt-[18px] w-full" onClick={submit}>Criar local de stock</Button>
    </section>
  );
}

function MapView({ list }: { list: StockLocation[] }) {
  const { data, openDrawer } = useInventoryUi();
  const groups: Array<{ title: string; icon: 'building' | 'users'; locs: StockLocation[] }> = [];
  const company = list.filter((l) => l.owner === 'company');
  if (company.length) groups.push({ title: 'Empresa', icon: 'building', locs: company });
  data.clients.forEach((c) => { const locs = list.filter((l) => l.clientId === c.id); if (locs.length) groups.push({ title: c.name, icon: 'users', locs }); });
  return (
    <div className="mt-3.5 grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {groups.map((g) => (
        <section key={g.title} className={cx(card, 'p-4')} aria-label={g.title}>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold"><Icon name={g.icon} />{g.title}<small className="ml-auto text-[12.5px] font-medium text-slate-500">{plural(g.locs.reduce((s, l) => s + itemsAt(data, l.id), 0), 'item', 'itens')}</small></h3>
          <ul className="mt-2.5">
            {g.locs.map((l) => {
              const alerts = productsAt(data, l.id).filter((p) => stateOf(p) !== 'ok').length;
              return (
                <li key={l.id} className="border-t border-dashed border-slate-300">
                  <button type="button" onClick={() => openDrawer({ kind: 'location', id: l.id })} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2.5 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
                    <LocationIcon type={l.type} />
                    <span className="min-w-0"><b className="block font-semibold">{l.name}</b><small className="block text-xs text-slate-500">{l.type}{alerts > 0 && <> · <span className="font-semibold text-[#b42318]">{plural(alerts, 'alerta', 'alertas')}</span></>}</small></span>
                    <span className="ml-auto font-semibold tabular-nums">{itemsAt(data, l.id)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function LocationsScreen({ preset, onPresetCreated }: { preset: NewLocationPreset | null; onPresetCreated?: (l: StockLocation) => void }) {
  const { data, locations: [f, setF], openDrawer } = useInventoryUi();
  const set = (patch: Partial<LocationFilters>) => setF({ ...f, ...patch });
  const all = data.locations.filter((l) => (f.status === 'archived' ? !l.active : l.active));
  const list = all.filter((l) => (!f.q || `${l.name} ${l.detail}`.toLowerCase().includes(f.q.trim().toLowerCase())) && (!f.owner || l.owner === f.owner) && (!f.client || l.clientId === f.client));

  return (
    <>
      <PageHeader title="Locais de stock" lede="Gere os locais onde guardas o stock da empresa e o stock dos clientes." />
      <SectionTabs />
      <div className="mt-[18px] grid items-start gap-[18px] min-[1060px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <UnderlineTabs label="Vista dos locais" value={f.tab} onChange={(tab) => set({ tab })} tabs={[['list', `Locais (${all.length})`], ['map', 'Mapa']]} />
          <div role="group" aria-label="Filtros de locais" className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <SearchInput id="lf-q" label="Pesquisar locais" value={f.q} onChange={(q) => set({ q })} placeholder="Pesquisar locais…" className="col-span-2 sm:col-span-1" />
            <FilterSelect id="lf-owner" label="Proprietário" value={f.owner} onChange={(owner) => set({ owner: owner as LocationFilters['owner'] })} options={[['', 'Proprietário: Todos'], ['company', 'Proprietário: Empresa'], ['client', 'Proprietário: Cliente']]} />
            <FilterSelect id="lf-client" label="Cliente" value={f.client} onChange={(client) => set({ client })} options={clientOptions(data, 'Cliente: Todos')} />
            <FilterSelect id="lf-status" label="Estado" value={f.status} onChange={(status) => set({ status: status as LocationFilters['status'] })} options={[['active', 'Estado: Ativos'], ['archived', 'Estado: Arquivados']]} className="col-span-2 sm:col-span-1" />
          </div>
          {!list.length ? (
            <div className={tableWrap}><EmptyState title={f.status === 'archived' ? 'Sem locais arquivados' : 'Sem locais'}>Ajusta a pesquisa ou os filtros.</EmptyState></div>
          ) : f.tab === 'map' ? <MapView list={list} /> : (
            <>
              <div className={cx(tableWrap, 'hidden min-[860px]:block')}>
                <table className="w-full border-collapse">
                  <caption className="sr-only">Locais de stock</caption>
                  <thead><tr>{['Local', 'Tipo', 'Proprietário', 'Cliente', 'Morada / Detalhes'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}<th scope="col" className={cx(th, 'text-right')}>Itens</th><th scope="col" className={cx(th, 'text-right')}>Ação</th></tr></thead>
                  <tbody>
                    {list.map((l) => (
                      <tr key={l.id}>
                        <td className={td}><span className="flex min-w-[170px] items-center gap-2.5"><LocationIcon type={l.type} /><b className="font-semibold">{l.name}</b></span></td>
                        <td className={td}>{l.type}</td>
                        <td className={td}><OwnerPill owner={l.owner} /></td>
                        <td className={cx(td, 'min-w-[110px]')}>{clientLines(data, l)?.client ?? <span className="text-slate-400">—</span>}</td>
                        <td className={cx(td, 'min-w-[150px]')}>{l.detail || '—'}</td>
                        <td className={cx(td, 'text-right tabular-nums')}>{group(itemsAt(data, l.id))}</td>
                        <td className={cx(td, 'text-right')}><Button size="sm" variant="primary" aria-label={`Ver stock de ${l.name}`} onClick={() => openDrawer({ kind: 'location', id: l.id })}>Ver stock</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-col gap-2.5 min-[860px]:hidden">
                {list.map((l) => (
                  <MobileCard key={l.id} lead={<LocationIcon type={l.type} />} title={l.name} subtitle={l.detail || l.type} badge={<OwnerPill owner={l.owner} />}
                    facts={[['Tipo', l.type], ['Stock', plural(itemsAt(data, l.id), 'item', 'itens')], ...(l.owner === 'client' ? [['Cliente', clientById(data, l.clientId)?.name ?? '—'] as [string, string]] : [])]}
                    actions={<Button variant="primary" onClick={() => openDrawer({ kind: 'location', id: l.id })}>Ver stock</Button>} />
                ))}
              </div>
            </>
          )}
          <p className="mt-3 text-[13px] text-slate-500">A mostrar {list.length} de {plural(all.length, 'local', 'locais')}</p>
        </div>
        <NewLocationForm key={preset ? `${preset.stayId}` : 'new'} preset={preset} onCreated={onPresetCreated} />
      </div>
    </>
  );
}
