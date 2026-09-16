import { useState, type ReactNode } from 'react';
import { Button, Drawer, Icon, Pill, TextLink, type IconName } from '../../shared/ui';
import { lower } from '../appConfigs';
import { CLIENT_STATUS, formatNif, LOCATION_STATUS, PAYMENT_STATUS } from '../format';
import { CalendarChips } from './CalendarEditor';
import { jobsMessage } from './ClientsList';
import { locationsOf, unitCountOf, useClients, type ClientDrawerTab } from './context';
import { Illustration } from './Illustration';
import { Stat } from './parts';

function InfoRow({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 border-t border-slate-200 py-2.5 first:border-0 sm:grid-cols-[22px_minmax(120px,.9fr)_minmax(0,1.2fr)]">
      <dt className="contents text-slate-500">
        <Icon name={icon} className="h-4 w-4" />
        <span>{label}</span>
      </dt>
      <dd className="col-start-2 break-words sm:col-start-auto">{children}</dd>
    </div>
  );
}

/** Detalhe do cliente: contactos, NIF, faturação e totais. */
export function ClientDrawer({ clientId, initialTab = 'summary', onClose }: { clientId: string; initialTab?: ClientDrawerTab; onClose: () => void }) {
  const { data, config, actions, navigate, openClientForm, openLocationForm } = useClients();
  const [tab, setTab] = useState<ClientDrawerTab>(initialTab);
  const client = data.clients.find((c) => c.id === clientId);
  if (!client) return null;

  const locations = locationsOf(data, client.id);
  const units = unitCountOf(data, client.id);
  const tabs: Array<[ClientDrawerTab, string]> = [
    ['summary', 'Resumo'],
    ['locations', `${config.location.plural} (${locations.length})`],
    ['units', `${config.unit.plural} (${units})`],
    ['notes', 'Notas'],
  ];

  return (
    <Drawer
      wide
      label={`Detalhe de ${client.name}`}
      onClose={onClose}
      footer={
        <>
          <Button icon="edit" onClick={() => openClientForm(client.id)}>Editar cliente</Button>
          <Button icon="calendar" onClick={() => actions.notify(jobsMessage(config.jobs, client.name))}>Ver {config.jobs.toLowerCase()}</Button>
          <Button variant="primary" icon="plus" onClick={() => openLocationForm(client.id, null)}>Adicionar {lower(config.location)}</Button>
        </>
      }
    >
      <div className="flex items-center gap-3.5 pr-9">
        <Illustration image={client.image} className="h-16 w-[72px] shrink-0 rounded-lg" />
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight">
            {client.name}
            <Pill tone={CLIENT_STATUS[client.status].tone}>{CLIENT_STATUS[client.status].label}</Pill>
          </h2>
          <p className="mt-0.5 text-slate-500">{client.segment}</p>
        </div>
      </div>

      <div role="tablist" className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className="-mb-px whitespace-nowrap border-b-2 border-transparent px-3 py-2 font-medium text-slate-600 aria-selected:border-[#17643e] aria-selected:font-semibold aria-selected:text-[#17643e]">
            {label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <>
          <section className="mt-3.5 rounded-xl border border-slate-200 px-4 py-3.5">
            <h3 className="mb-1.5 text-[14.5px] font-semibold">Informação do cliente</h3>
            <dl>
              <InfoRow icon="user" label="Pessoa de contacto">{client.contact}</InfoRow>
              <InfoRow icon="mail" label="Email">{client.email}</InfoRow>
              <InfoRow icon="phone" label="Telefone">{client.phone || '—'}</InfoRow>
              <InfoRow icon="idCard" label="NIF">{client.nif ? formatNif(client.nif) : '—'}</InfoRow>
              <InfoRow icon="pin" label="Morada">{client.address || '—'}</InfoRow>
              <InfoRow icon="receipt" label="Período de faturação">{client.billing}</InfoRow>
              <InfoRow icon="wallet" label="Estado de pagamento"><Pill tone={PAYMENT_STATUS[client.payment].tone}>{PAYMENT_STATUS[client.payment].label}</Pill></InfoRow>
            </dl>
          </section>
          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            <Stat value={locations.length} label={locations.length === 1 ? config.location.singular : config.location.plural} />
            <Stat value={units} label={units === 1 ? config.unit.singular : config.unit.plural} />
          </div>
          <p className="mt-3 text-[12.5px] text-slate-500">Cliente desde {client.since}.</p>
        </>
      )}

      {tab === 'locations' && (
        <>
          <section className="mt-3.5 divide-y divide-slate-200 rounded-xl border border-slate-200 px-4">
            {locations.map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-2.5">
                <Illustration image={l.image} className="h-11 w-[52px] shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <b className="block font-semibold">{l.name}</b>
                  <small className="block truncate text-[12.5px] text-slate-500">{l.address}</small>
                  <small className="block text-[12.5px] text-slate-500">{l.units.length} {lower(config.unit, l.units.length !== 1)}</small>
                </div>
                <Pill tone={LOCATION_STATUS[l.status].tone}>{LOCATION_STATUS[l.status].label}</Pill>
                <Button size="sm" onClick={() => navigate({ name: 'location', clientId: client.id, locationId: l.id })}>Gerir</Button>
              </div>
            ))}
            {locations.length === 0 && <p className="py-3 text-slate-500">Ainda sem {lower(config.location, true)}.</p>}
          </section>
          <div className="mt-3"><TextLink onClick={() => navigate({ name: 'locations', clientId: client.id })}>Abrir {lower(config.location, true)} do cliente</TextLink></div>
        </>
      )}

      {tab === 'units' && (
        <div className="mt-3.5 flex flex-col gap-3">
          {locations.map((l) => (
            <section key={l.id} className="rounded-xl border border-slate-200 px-4 py-3.5">
              <h4 className="mb-2 text-[13px] font-semibold text-slate-700">{l.name}</h4>
              <div className="flex flex-wrap gap-1.5">
                {l.units.map((u) => (
                  <span key={u.id} className="inline-flex min-h-7 flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-0.5 pl-2.5 pr-1 text-[12.5px]">
                    {u.name} <small className="text-slate-500">{u.type}</small>
                    {config.features.ical && <CalendarChips unit={u} emptyLabel={null} />}
                  </span>
                ))}
                {l.units.length === 0 && <span className="text-slate-500">Sem {lower(config.unit, true)}.</span>}
              </div>
            </section>
          ))}
          {locations.length === 0 && <p className="text-slate-500">Sem {lower(config.unit, true)}.</p>}
        </div>
      )}

      {tab === 'notes' && (
        <section className="mt-3.5 rounded-xl border border-slate-200 px-4 py-3.5">
          <h3 className="mb-1.5 flex items-center gap-2 text-[14.5px] font-semibold"><Icon name="doc" className="h-4 w-4 text-slate-500" />Notas</h3>
          {client.notes ? <p className="whitespace-pre-wrap">{client.notes}</p> : <p className="text-slate-500">Sem notas. Usa “Editar cliente” para adicionar.</p>}
        </section>
      )}
    </Drawer>
  );
}
