import { useMemo, useState, type KeyboardEvent } from 'react';
import { ACCESS_META, normalize, roleLabel, teamLabel } from '../format';
import type { AccessStatus, Person, PersonRole } from '../types';
import { canDeletePerson } from '../validation';
import { useTeams } from './context';
import { ActionMenu, Avatar, Button, FilterBar, Icon, type MenuItem, Pill, Spinner, TextLink } from '../../shared/ui';

interface Filters {
  query: string;
  role: '' | PersonRole;
  team: string; // '' | teamId | 'none'
  access: '' | AccessStatus | 'archived';
}

const EMPTY: Filters = { query: '', role: '', team: '', access: '' };
const ROLE_ORDER: Record<PersonRole, number> = { admin: 0, manager: 1, collab: 2 };

export function AccessPill({ person, small }: { person: Person; small?: boolean }) {
  if (person.archived) return <Pill tone="dark" small={small}>Arquivado</Pill>;
  const meta = ACCESS_META[person.access];
  return <Pill tone={meta.tone} title={meta.description} small={small}>{meta.label}</Pill>;
}

/** Ações do menu "⋯" de um colaborador (partilhado com a ficha). */
export function usePersonMenu() {
  const { actions, confirm, openPerson, openAbsence } = useTeams();

  return (p: Person): MenuItem[] => {
    const items: MenuItem[] = [{ label: 'Ver detalhe', icon: 'eye', onSelect: () => openPerson(p.id) }];
    if (p.archived) {
      items.push({ label: 'Restaurar colaborador', icon: 'restore', onSelect: () => actions.restorePerson(p.id) });
      return items;
    }
    if (p.access === 'none') items.push({ label: 'Enviar acesso', icon: 'send', onSelect: () => actions.sendAccess(p.id) });
    else if (p.access !== 'suspended') items.push({ label: 'Reenviar acesso', icon: 'send', onSelect: () => actions.sendAccess(p.id) });
    if (p.role === 'admin') return items;

    if (p.access === 'suspended') {
      items.push({ label: 'Reativar acesso', icon: 'play', onSelect: () => actions.reactivateAccess(p.id) });
    } else if (p.access === 'active' || p.access === 'sent') {
      items.push({ label: 'Suspender acesso', icon: 'pause', onSelect: () => confirmSuspend(p) });
    }
    items.push({ label: 'Registar ausência', icon: 'calendar', onSelect: () => openAbsence(p.id) });
    items.push('separator');
    items.push(
      canDeletePerson(p)
        ? { label: 'Eliminar colaborador', icon: 'trash', danger: true, onSelect: () => confirmDelete(p) }
        : { label: 'Arquivar colaborador', icon: 'archive', danger: true, onSelect: () => confirmArchive(p) },
    );
    return items;
  };

  function confirmSuspend(p: Person) {
    confirm({
      title: 'Suspender acesso?',
      body: `${p.name} deixa de conseguir entrar na aplicação. Os dados e as atribuições mantêm-se.`,
      confirmLabel: 'Suspender acesso',
      danger: true,
      onConfirm: () => actions.suspendAccess(p.id),
    });
  }
  function confirmArchive(p: Person) {
    confirm({
      title: 'Arquivar colaborador?',
      body: `${p.name} tem histórico operacional (${p.completedJobs} limpezas). O acesso é suspenso e a pessoa sai das listas ativas, mas os registos anteriores ficam preservados.`,
      confirmLabel: 'Arquivar',
      danger: true,
      onConfirm: () => actions.archivePerson(p.id),
    });
  }
  function confirmDelete(p: Person) {
    confirm({
      title: 'Eliminar colaborador?',
      body: `${p.name} não tem histórico operacional, por isso pode ser eliminado definitivamente. Esta ação não pode ser anulada.`,
      confirmLabel: 'Eliminar',
      danger: true,
      onConfirm: () => actions.deletePerson(p.id),
    });
  }
}

function ManagerBanner() {
  const { data, mode, openAddPerson, openPerson } = useTeams();
  // A opção de gestora só existe com responsabilidades separadas.
  if (mode !== 'separate') return null;
  const manager = data.people.find((p) => p.role === 'manager' && !p.archived);

  return (
    <div className={`mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border px-4 py-3.5 ${manager ? 'border-slate-200 bg-slate-50' : 'border-[#f3dfae] bg-[#fffaf0]'}`}>
      <Icon name="shield" className={`h-[18px] w-[18px] ${manager ? 'text-[#17643e]' : 'text-[#80570a]'}`} />
      <div className="min-w-[220px] flex-1">
        <b className="block font-semibold">Responsabilidades separadas</b>
        <p className="mt-0.5 text-[13px] text-slate-600">
          {manager
            ? `${manager.name} é ${roleLabel(manager, mode).toLowerCase()} da empresa.`
            : 'A administração e a gestão diária são feitas por pessoas diferentes. Ainda não existe uma gestora atribuída.'}
        </p>
      </div>
      {manager ? (
        <>
          <AccessPill person={manager} />
          <Button size="sm" onClick={() => openPerson(manager.id)}>Ver ficha</Button>
        </>
      ) : (
        <Button size="sm" variant="soft" icon="plus" onClick={() => openAddPerson('manager')}>Convidar gestora</Button>
      )}
    </div>
  );
}

export function CollaboratorsTab() {
  const { data, mode, sendingIds, openPerson } = useTeams();
  const buildMenu = usePersonMenu();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((f) => ({ ...f, [key]: value }));

  const hasManagers = mode === 'separate' || data.people.some((p) => p.role === 'manager');
  const total = data.people.filter((p) => !p.archived).length;

  const list = useMemo(() => {
    const q = normalize(filters.query);
    return data.people
      .filter((p) => {
        if (filters.access === 'archived') { if (!p.archived) return false; }
        else if (p.archived || (filters.access && p.access !== filters.access)) return false;
        if (filters.role && p.role !== filters.role) return false;
        if (filters.team === 'none' ? p.teamId : filters.team && p.teamId !== filters.team) return false;
        return !q || normalize(`${p.name} ${p.email}`).includes(q);
      })
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name, 'pt'));
  }, [data.people, filters]);

  const isLead = (id: string) => data.teams.some((t) => t.leadId === id);
  const onRowKey = (e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPerson(id); }
  };

  const empty = (
    <div className="px-4 py-9 text-center text-slate-500">
      <b className="mb-1 block font-semibold text-slate-900">Nenhum colaborador encontrado</b>
      Ajusta a pesquisa ou os filtros. <TextLink onClick={() => setFilters(EMPTY)}>Limpar filtros</TextLink>
    </div>
  );

  return (
    <>
      <ManagerBanner />

      <FilterBar
        query={filters.query}
        onQuery={(v) => set('query', v)}
        searchLabel="Pesquisar colaboradores"
        placeholder="Pesquisar por nome ou email…"
        filters={[
          {
            label: 'Filtrar por função',
            value: filters.role,
            onChange: (v) => set('role', v as Filters['role']),
            options: [
              ['', 'Todas as funções'],
              ['admin', mode === 'micro' ? 'Administração e gestão' : 'Administração'],
              ...(hasManagers ? [['manager', 'Gestão'] as [string, string]] : []),
              ['collab', 'Colaboradores'],
            ],
          },
          {
            label: 'Filtrar por equipa',
            value: filters.team,
            onChange: (v) => set('team', v),
            options: [['', 'Todas as equipas'], ...data.teams.map((t): [string, string] => [t.id, t.name]), ['none', 'Sem equipa']],
          },
          {
            label: 'Filtrar por estado de acesso',
            value: filters.access,
            onChange: (v) => set('access', v as Filters['access']),
            options: [['', 'Todos os acessos'], ...(Object.keys(ACCESS_META) as AccessStatus[]).map((k): [string, string] => [k, ACCESS_META[k].label]), ['archived', 'Arquivados']],
          },
        ]}
      />

      <div className="mt-3.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Tabela: tablet e desktop */}
        <table className="hidden w-full border-collapse md:table">
          <thead>
            <tr className="bg-slate-50 text-left text-[12.5px] font-medium text-slate-500">
              <th className="border-b border-slate-200 px-4 py-2.5 font-medium">Nome</th>
              <th className="border-b border-slate-200 px-4 py-2.5 font-medium">Função</th>
              <th className="border-b border-slate-200 px-4 py-2.5 font-medium">Equipa</th>
              <th className="border-b border-slate-200 px-4 py-2.5 font-medium">Acesso</th>
              <th className="w-14 border-b border-slate-200"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr
                key={p.id}
                tabIndex={0}
                aria-label={`Abrir ${p.name}`}
                onClick={() => openPerson(p.id)}
                onKeyDown={(e) => onRowKey(e, p.id)}
                className="cursor-pointer border-b border-slate-200 transition last:border-0 hover:bg-slate-50/60 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#17643e]"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.name} />
                    <span>
                      <b className="block font-semibold">{p.name}</b>
                      {isLead(p.id) && <small className="block text-[12.5px] text-slate-500">Responsável de equipa</small>}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{roleLabel(p, mode)}</td>
                <td className="px-4 py-2.5 text-slate-600">{teamLabel(p, data.teams)}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-2"><AccessPill person={p} />{sendingIds.includes(p.id) && <span className="text-slate-400"><Spinner /></span>}</span>
                </td>
                <td className="pr-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <ActionMenu label={`Mais opções para ${p.name}`} items={buildMenu(p)} />
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5}>{empty}</td></tr>}
          </tbody>
        </table>

        {/* Cartões: telemóvel */}
        <ul className="divide-y divide-slate-200 md:hidden">
          {list.map((p) => (
            <li key={p.id} className="flex gap-2 py-3.5 pl-3.5 pr-2">
              <button type="button" onClick={() => openPerson(p.id)} className="flex min-w-0 flex-1 gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
                <Avatar name={p.name} />
                <span className="min-w-0">
                  <b className="block font-semibold">{p.name}</b>
                  {isLead(p.id) && <small className="block text-[12.5px] text-slate-500">Responsável de equipa</small>}
                  <span className="mt-1 block text-[13px] text-slate-600">{roleLabel(p, mode)} · {teamLabel(p, data.teams)}</span>
                  <span className="mt-1.5 flex items-center gap-2"><AccessPill person={p} />{sendingIds.includes(p.id) && <Spinner />}</span>
                </span>
              </button>
              <ActionMenu label={`Mais opções para ${p.name}`} items={buildMenu(p)} />
            </li>
          ))}
          {list.length === 0 && <li>{empty}</li>}
        </ul>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 text-[13px] text-slate-500">
        <span>{list.length === total && filters.access !== 'archived' ? `${total} colaboradores` : `${list.length} de ${total} colaboradores`}</span>
        <span className="flex flex-wrap items-center gap-1.5">
          Estados:
          {(Object.keys(ACCESS_META) as AccessStatus[]).map((k) => (
            <Pill key={k} tone={ACCESS_META[k].tone} title={ACCESS_META[k].description} small>{ACCESS_META[k].label}</Pill>
          ))}
        </span>
      </div>
    </>
  );
}
