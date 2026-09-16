import type { ReactNode } from 'react';
import { ActionMenu, Button, focusRing, Icon, Pill, type IconName } from '../../shared/ui';
import { count, lower, newLabel } from '../appConfigs';
import { CLIENT_STATUS, formatEuro, LOCATION_STATUS } from '../format';
import type { ServiceLocation } from '../types';
import { CalendarCount } from './CalendarEditor';
import { locationsOf, teamName, unitCountOf, useClients } from './context';
import { Illustration } from './Illustration';
import { Breadcrumbs, PageHead, ServiceChip, TagChip } from './parts';

function Fact({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[24px_minmax(110px,.9fr)_minmax(0,1.2fr)] items-center gap-1 text-[13px]">
      <dt className="contents text-slate-500"><Icon name={icon} className="h-4 w-4" /><span>{label}</span></dt>
      <dd className="flex flex-wrap gap-1.5">{children}</dd>
    </div>
  );
}

function LocationCard({ location }: { location: ServiceLocation }) {
  const { config, teams, actions, confirm, navigate, openLocationForm } = useClients();
  const f = config.features;
  const services = config.services.filter((s) => location.serviceIds.includes(s.id));
  const manage = () => navigate({ name: 'location', clientId: location.clientId, locationId: location.id });
  const term = lower(config.location);

  return (
    <article className="flex flex-col rounded-[14px] border border-slate-200 bg-white p-3 shadow-sm">
      <Illustration image={location.image} className="h-40 rounded-[9px]" />
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3.5">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 text-[17px] font-semibold tracking-tight">{location.name}</h3>
          <Pill tone={LOCATION_STATUS[location.status].tone}>{LOCATION_STATUS[location.status].label}</Pill>
          <ActionMenu
            label={`Mais opções para ${location.name}`}
            items={[
              { label: `Gerir ${term}`, icon: 'gear', onSelect: manage },
              { label: 'Editar dados', icon: 'edit', onSelect: () => openLocationForm(location.clientId, location.id) },
              location.status === 'active'
                ? { label: `Pausar ${term}`, icon: 'pause', onSelect: () => actions.setLocationStatus(location.id, 'paused') }
                : { label: `Reativar ${term}`, icon: 'play', onSelect: () => actions.setLocationStatus(location.id, 'active') },
              'separator',
              {
                label: `Remover ${term}`, icon: 'trash', danger: true,
                onSelect: () => confirm({
                  title: `Remover ${location.name}?`,
                  body: `As ${count(location.units.length, config.unit)} também são removidas. Nesta simulação não há histórico a preservar.`,
                  confirmLabel: 'Remover', danger: true,
                  onConfirm: () => actions.removeLocation(location.id),
                }),
              },
            ]}
          />
        </div>
        <p className="mt-2 flex gap-2 text-[13px] text-slate-600"><Icon name="pin" className="mt-px h-4 w-4 text-slate-500" />{location.address}</p>
        <dl className="mt-3.5 flex flex-col gap-2">
          {f.defaultTeam && <Fact icon="users" label="Equipa por defeito">{teamName(teams, location.teamId)}</Fact>}
          {f.hourlyRate && <Fact icon="clock" label="Valor/hora"><span className="tabular-nums">{formatEuro(location.hourlyRate)}</span></Fact>}
          <Fact icon="grid" label={config.unit.plural}>{location.units.length}</Fact>
          {f.ical && <Fact icon="link" label="Calendários iCal"><CalendarCount units={location.units} /></Fact>}
          <Fact icon="tag" label="Serviços">
            {services.map((s) => <ServiceChip key={s.id} service={s} />)}
            {f.laundry && location.laundryEnabled && <TagChip tone="warn">Lavandaria</TagChip>}
            {!services.length && !(f.laundry && location.laundryEnabled) && <span className="text-slate-500">—</span>}
          </Fact>
        </dl>
        <Button icon="gear" className="mt-4 w-full" onClick={manage}>Gerir {term}</Button>
      </div>
    </article>
  );
}

/** Locais de serviço do cliente (Limpezas: alojamentos). */
export function LocationsView({ clientId }: { clientId: string }) {
  const { data, config, navigate, openLocationForm } = useClients();
  const client = data.clients.find((c) => c.id === clientId);
  if (!client) return null;
  const locations = locationsOf(data, client.id);

  return (
    <>
      <Breadcrumbs items={[{ label: config.client.plural, onClick: () => navigate({ name: 'clients' }) }, { label: client.name }]} />
      <PageHead
        eyebrow={`${config.location.plural} do cliente`}
        title={client.name}
        subtitle={
          <>
            {count(locations.length, config.location)} · {count(unitCountOf(data, client.id), config.unit)}
            {client.status !== 'active' && <Pill tone={CLIENT_STATUS[client.status].tone}>{CLIENT_STATUS[client.status].label}</Pill>}
          </>
        }
        actions={
          <>
            <Button icon="back" onClick={() => navigate({ name: 'clients' })}>Voltar aos clientes</Button>
            <Button variant="primary" icon="plus" onClick={() => openLocationForm(client.id, null)}>{newLabel(config.location)}</Button>
          </>
        }
      />
      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(330px,100%),1fr))] gap-[18px]">
        {locations.map((l) => <LocationCard key={l.id} location={l} />)}
        <button
          type="button"
          onClick={() => openLocationForm(client.id, null)}
          className={`flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-slate-300 font-semibold text-slate-600 transition hover:border-[#17643e] hover:bg-[#e9f4ee] hover:text-[#17643e] ${focusRing}`}
        >
          <span className="grid h-[42px] w-[42px] place-items-center rounded-full bg-[#e9f4ee] text-[#17643e]"><Icon name="plus" /></span>
          {newLabel(config.location)}
        </button>
      </div>
    </>
  );
}
