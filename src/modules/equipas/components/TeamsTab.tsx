import type { ReactNode } from 'react';
import type { Team } from '../types';
import { useTeams } from './context';
import { ActionMenu, Avatar, Button, focusRing, Icon } from '../../shared/ui';

const MAX_AVATARS = 4;

function Chip({ icon, children }: { icon?: 'pin' | 'building' | 'home'; children: ReactNode }) {
  return (
    <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-[7px] border border-slate-200 bg-slate-50 px-2.5 text-[12.5px] text-slate-600">
      {icon && <Icon name={icon} className="h-[13px] w-[13px] text-slate-400" />}
      {children}
    </span>
  );
}

function TeamCard({ team }: { team: Team }) {
  const { data, actions, confirm, openTeam } = useTeams();
  const members = data.people.filter((p) => p.teamId === team.id && !p.archived);
  const lead = team.leadId ? data.people.find((p) => p.id === team.leadId) : undefined;
  const firstClient = data.clients.find((c) => c.id === team.clientIds[0]);
  const extraClients = team.clientIds.length - 1;

  const archive = () =>
    confirm({
      title: `Arquivar ${team.name}?`,
      body: `${members.length ? `Os ${members.length} elementos ficam sem equipa. ` : ''}Os alojamentos com esta equipa por defeito deixam de ter sugestão automática.`,
      confirmLabel: 'Arquivar equipa',
      danger: true,
      onConfirm: () => actions.archiveTeam(team.id),
    });

  return (
    <article className="flex flex-col gap-3.5 rounded-[14px] border border-slate-200 bg-white p-[18px] shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight">{team.name}</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">{members.length} {members.length === 1 ? 'colaborador' : 'colaboradores'}</p>
        </div>
        <ActionMenu
          label={`Mais opções para ${team.name}`}
          triggerClassName="-mr-2 -mt-1.5"
          items={[
            { label: 'Ver equipa', icon: 'eye', onSelect: () => openTeam(team.id) },
            { label: 'Definir responsável', icon: 'star', onSelect: () => openTeam(team.id, 'lead') },
            'separator',
            { label: 'Arquivar equipa', icon: 'archive', danger: true, onSelect: archive },
          ]}
        />
      </div>

      <div>
        <span className="mb-1.5 block text-xs text-slate-500">Responsável</span>
        {lead ? (
          <div className="flex items-center gap-2.5 font-medium"><Avatar name={lead.name} highlight />{lead.name}</div>
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-red-700"><Icon name="alert" className="h-4 w-4" />Sem responsável definido</div>
        )}
      </div>

      {(team.zones.length > 0 || firstClient || team.accommodationIds.length > 0) && (
        <div>
          <span className="mb-1.5 block text-xs text-slate-500">Zonas, clientes e alojamentos</span>
          <div className="flex flex-wrap gap-1.5">
            {team.zones.slice(0, 2).map((z) => <Chip key={z} icon="pin">{z}</Chip>)}
            {firstClient && <Chip icon="building">{firstClient.name}</Chip>}
            {extraClients > 0 && <Chip>+{extraClients} {extraClients === 1 ? 'cliente' : 'clientes'}</Chip>}
            {team.accommodationIds.length > 0 && (
              <Chip icon="home">{team.accommodationIds.length} {team.accommodationIds.length === 1 ? 'alojamento' : 'alojamentos'}</Chip>
            )}
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-slate-200 pt-3.5">
        <div className="flex items-center" aria-label={`${members.length} elementos`}>
          {members.slice(0, MAX_AVATARS).map((p, i) => (
            <Avatar key={p.id} name={p.name} size="sm" className={`border-2 border-white ${i ? '-ml-[7px]' : ''}`} />
          ))}
          {members.length > MAX_AVATARS && (
            <span className="-ml-[7px] inline-grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-700">
              +{members.length - MAX_AVATARS}
            </span>
          )}
          {members.length === 0 && <span className="text-[13px] text-slate-500">Sem elementos</span>}
        </div>
        <Button size="sm" variant="soft" iconRight="arrow" onClick={() => openTeam(team.id)}>Ver equipa</Button>
      </div>
    </article>
  );
}

export function TeamsTab() {
  const { data, openTeam } = useTeams();
  return (
    <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4">
      {data.teams.map((t) => <TeamCard key={t.id} team={t} />)}
      <button
        type="button"
        onClick={() => openTeam(null)}
        className={`flex min-h-[230px] flex-col items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-slate-300 font-semibold text-slate-600 transition hover:border-[#17643e] hover:bg-[#e9f4ee] hover:text-[#17643e] ${focusRing}`}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e9f4ee] text-[#17643e]"><Icon name="plus" /></span>
        Criar equipa
      </button>
    </div>
  );
}
