import { useMemo, useState, type KeyboardEvent } from 'react';
import { ActionMenu, Button, Icon, inputBase, Pill, selectBase, selectStyle, TextLink, type MenuItem } from '../../shared/ui';
import { lower } from '../appConfigs';
import { BILLING_PERIODS, CLIENT_STATUS, cityOf, normalize, PAYMENT_STATUS, plural } from '../format';
import type { Client, ClientStatus, PaymentStatus } from '../types';
import { locationsOf, unitCountOf, useClients } from './context';
import { Illustration } from './Illustration';
import { PageHead } from './parts';

interface Filters {
  query: string;
  status: '' | ClientStatus;
  city: string;
  segment: string;
  billing: string;
  payment: '' | PaymentStatus;
}
const EMPTY: Filters = { query: '', status: '', city: '', segment: '', billing: '', payment: '' };
type Sort = 'name' | 'name-desc' | 'locations' | 'units';

/** Ações partilhadas entre a linha da lista e outros ecrãs. */
export function useClientMenu() {
  const { config, actions, navigate, openClient, openClientForm } = useClients();
  return (c: Client): MenuItem[] => [
    { label: 'Ver detalhe', icon: 'eye', onSelect: () => openClient(c.id) },
    { label: `Ver ${lower(config.location, true)}`, icon: 'home', onSelect: () => navigate({ name: 'locations', clientId: c.id }) },
    { label: 'Editar cliente', icon: 'edit', onSelect: () => openClientForm(c.id) },
    { label: `Ver ${config.jobs.toLowerCase()}`, icon: 'calendar', onSelect: () => actions.notify(jobsMessage(config.jobs, c.name)) },
    'separator',
    c.status === 'paused'
      ? { label: 'Reativar cliente', icon: 'play', onSelect: () => actions.setClientStatus(c.id, 'active') }
      : { label: 'Pausar cliente', icon: 'pause', onSelect: () => actions.setClientStatus(c.id, 'paused') },
  ];
}

/** No núcleo AppOS, "Ver reservas" será a lista de trabalhos filtrada pelo cliente. */
export const jobsMessage = (jobs: string, clientName: string) => `${jobs} de ${clientName}: lista filtrada por cliente numa fase seguinte.`;

export function ClientsList() {
  const { data, config, openClient, openClientForm } = useClients();
  const buildMenu = useClientMenu();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<Sort>('name');
  const [moreOpen, setMoreOpen] = useState(false);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const cities = useMemo(() => [...new Set(data.clients.map((c) => cityOf(c.address)).filter(Boolean))].sort(), [data.clients]);
  const segments = useMemo(() => [...new Set([...config.segments, ...data.clients.map((c) => c.segment)])], [config.segments, data.clients]);
  const moreCount = [filters.segment, filters.billing, filters.payment].filter(Boolean).length;

  const list = useMemo(() => {
    const q = normalize(filters.query);
    const byName = (a: Client, b: Client) => a.name.localeCompare(b.name, 'pt');
    const sorters: Record<Sort, (a: Client, b: Client) => number> = {
      name: byName,
      'name-desc': (a, b) => byName(b, a),
      locations: (a, b) => locationsOf(data, b.id).length - locationsOf(data, a.id).length || byName(a, b),
      units: (a, b) => unitCountOf(data, b.id) - unitCountOf(data, a.id) || byName(a, b),
    };
    return data.clients
      .filter((c) => {
        if (filters.status && c.status !== filters.status) return false;
        if (filters.city && cityOf(c.address) !== filters.city) return false;
        if (filters.segment && c.segment !== filters.segment) return false;
        if (filters.billing && c.billing !== filters.billing) return false;
        if (filters.payment && c.payment !== filters.payment) return false;
        if (!q) return true;
        // Pesquisa também pelos locais do cliente.
        const hay = [c.name, c.contact, c.email, c.phone, ...locationsOf(data, c.id).map((l) => `${l.name} ${l.address}`)].join(' ');
        return normalize(hay).includes(q);
      })
      .sort(sorters[sort]);
  }, [data, filters, sort]);

  const onRowKey = (e: KeyboardEvent, id: string) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openClient(id); }
  };

  return (
    <>
      <PageHead
        eyebrow={`${config.label} · ${config.client.plural}`}
        title={config.client.plural}
        subtitle={`Gere clientes, ${lower(config.location, true)} e ${lower(config.unit, true)}.`}
        actions={<Button variant="primary" icon="plus" onClick={() => openClientForm(null)}>Novo cliente</Button>}
      />

      <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-[minmax(220px,2.4fr)_repeat(3,minmax(0,1fr))]">
        <label className="relative col-span-2 block md:col-span-3 lg:col-span-1">
          <span className="sr-only">Pesquisar</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
          <input type="search" value={filters.query} onChange={(e) => set('query', e.target.value)} placeholder="Pesquisar clientes, contactos ou locais…" className={`${inputBase} pl-[38px]`} />
        </label>
        <select aria-label="Filtrar por estado" value={filters.status} onChange={(e) => set('status', e.target.value as Filters['status'])} className={selectBase} style={selectStyle}>
          <option value="">Estado</option>
          {(Object.keys(CLIENT_STATUS) as ClientStatus[]).map((k) => <option key={k} value={k}>{CLIENT_STATUS[k].label}</option>)}
        </select>
        <select aria-label="Filtrar por cidade" value={filters.city} onChange={(e) => set('city', e.target.value)} className={selectBase} style={selectStyle}>
          <option value="">Cidade</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls="clients-more-filters"
          onClick={() => setMoreOpen((v) => !v)}
          className={`${inputBase} col-span-2 flex items-center justify-between gap-2 text-left md:col-span-1`}
        >
          Mais filtros
          {moreCount ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#17643e] px-1.5 text-[11px] font-semibold text-white">{moreCount}</span> : <Icon name="chevronDown" className="h-4 w-4 text-slate-600" />}
        </button>
      </div>

      {moreOpen && (
        <div id="clients-more-filters" className="mt-2.5 grid gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
          <select aria-label="Segmento" value={filters.segment} onChange={(e) => set('segment', e.target.value)} className={selectBase} style={selectStyle}>
            <option value="">Todos os segmentos</option>
            {segments.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Período de pagamento" value={filters.billing} onChange={(e) => set('billing', e.target.value)} className={selectBase} style={selectStyle}>
            <option value="">Todos os períodos</option>
            {BILLING_PERIODS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select aria-label="Estado de pagamento" value={filters.payment} onChange={(e) => set('payment', e.target.value as Filters['payment'])} className={selectBase} style={selectStyle}>
            <option value="">Todos os pagamentos</option>
            {(Object.keys(PAYMENT_STATUS) as PaymentStatus[]).map((k) => <option key={k} value={k}>{PAYMENT_STATUS[k].label}</option>)}
          </select>
        </div>
      )}

      <div className="mb-2.5 mt-4 flex flex-wrap items-center justify-between gap-2.5 text-[13px] text-slate-500">
        <span>{list.length === data.clients.length ? plural(list.length, 'cliente', 'clientes') : `${list.length} de ${plural(data.clients.length, 'cliente', 'clientes')}`}</span>
        <label className="flex items-center gap-2.5 whitespace-nowrap">
          Ordenar por
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${selectBase} min-h-[38px] w-auto min-w-[170px]`} style={selectStyle}>
            <option value="name">Nome (A–Z)</option>
            <option value="name-desc">Nome (Z–A)</option>
            <option value="locations">Mais {lower(config.location, true)}</option>
            <option value="units">Mais {lower(config.unit, true)}</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2.5">
        {list.map((c) => {
          const nLoc = locationsOf(data, c.id).length;
          const nUnits = unitCountOf(data, c.id);
          const status = <Pill tone={CLIENT_STATUS[c.status].tone}>{CLIENT_STATUS[c.status].label}</Pill>;
          return (
            <article
              key={c.id}
              tabIndex={0}
              aria-label={`Abrir ${c.name}`}
              onClick={() => openClient(c.id)}
              onKeyDown={(e) => onRowKey(e, c.id)}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-[#cde5d6] hover:bg-[#fbfdfc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e] md:gap-4 lg:items-center"
            >
              <Illustration image={c.image} className="h-12 w-12 shrink-0 rounded-lg md:h-14 md:w-16" />
              <div className="grid min-w-0 flex-1 gap-2.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.45fr)_92px_92px_108px] lg:items-center lg:gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <b className="block text-[15px] font-semibold tracking-tight">{c.name}</b>
                    <small className="mt-0.5 block text-[12.5px] text-slate-500">{c.segment}</small>
                  </div>
                  <span className="lg:hidden">{status}</span>
                </div>
                <div className="flex min-w-0 gap-2.5 text-[12.5px] text-slate-600">
                  <Icon name="user" className="mt-px h-4 w-4 text-slate-500" />
                  <div className="min-w-0">
                    <b className="block text-[13.5px] font-medium text-slate-900">{c.contact}</b>
                    <span className="block truncate">{c.email}</span>
                    <span className="block">{c.phone}</span>
                  </div>
                </div>
                <div className="flex gap-6 lg:contents">
                  <Count icon="home" value={nLoc} label={lower(config.location, nLoc !== 1)} />
                  <Count icon="grid" value={nUnits} label={lower(config.unit, nUnits !== 1)} />
                </div>
                <span className="hidden lg:block">{status}</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <ActionMenu label={`Mais opções para ${c.name}`} items={buildMenu(c)} />
              </div>
            </article>
          );
        })}
        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">
            <b className="mb-1 block font-semibold text-slate-900">Nenhum cliente encontrado</b>
            Ajusta a pesquisa ou os filtros. <TextLink onClick={() => setFilters(EMPTY)}>Limpar filtros</TextLink>
          </div>
        )}
      </div>
    </>
  );
}

function Count({ icon, value, label }: { icon: 'home' | 'grid'; value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5 lg:grid lg:grid-cols-[auto_1fr] lg:items-center lg:gap-x-2">
      <Icon name={icon} className="h-[17px] w-[17px] self-center text-slate-600" />
      <b className="text-sm font-semibold tabular-nums lg:text-base">{value}</b>
      <small className="text-xs text-slate-500 lg:col-start-2">{label}</small>
    </div>
  );
}
