import { forwardRef, useMemo, useState, type ReactNode } from 'react';
import {
  ABSENCE_STATUS_META,
  ABSENCE_TYPE_LABEL,
  absenceDuration,
  absenceHours,
  formatDay,
  formatRange,
  isUpcoming,
  normalize,
  teamLabel,
} from '../format';
import type { Absence, AbsenceStatus, AbsenceType } from '../types';
import { useTeams } from './context';
import { ActionMenu, Avatar, FilterBar, Pill, TextLink, type MenuItem } from '../../shared/ui';

const HISTORY_PREVIEW = 3;

interface Filters {
  query: string;
  team: string;
  type: '' | AbsenceType;
  status: '' | AbsenceStatus;
}
const EMPTY: Filters = { query: '', team: '', type: '', status: '' };

const Tag = ({ children }: { children: ReactNode }) => (
  <span className="ml-1.5 rounded-md bg-slate-100 px-[7px] py-px align-[1px] text-[11px] font-semibold text-slate-600">{children}</span>
);

function useAbsenceMenu() {
  const { data, today, actions, confirm, openPerson } = useTeams();
  return (a: Absence): MenuItem[] => {
    const person = data.people.find((p) => p.id === a.personId);
    const upcoming = isUpcoming(a, today);
    const items: MenuItem[] = [];
    if (upcoming && a.status === 'pending') {
      items.push({ label: 'Aprovar ausência', icon: 'check', onSelect: () => actions.setAbsenceStatus(a.id, 'approved') });
      items.push({ label: 'Recusar ausência', icon: 'reject', onSelect: () => actions.setAbsenceStatus(a.id, 'rejected') });
    }
    items.push({ label: 'Ver colaborador', icon: 'user', onSelect: () => openPerson(a.personId) });
    if (upcoming) {
      items.push('separator', {
        label: 'Cancelar ausência',
        icon: 'trash',
        danger: true,
        onSelect: () =>
          confirm({
            title: 'Cancelar ausência?',
            body: `A ausência de ${person?.name ?? ''} (${ABSENCE_TYPE_LABEL[a.type]}, ${formatRange(a.start, a.end)}) é removida.`,
            confirmLabel: 'Cancelar ausência',
            danger: true,
            onConfirm: () => actions.cancelAbsence(a.id),
          }),
      });
    }
    return items;
  };
}

function AbsenceTable({ rows, emptyTitle, onClearFilters, footer }: { rows: Absence[]; emptyTitle: string; onClearFilters?: () => void; footer?: ReactNode }) {
  const { data, openPerson } = useTeams();
  const buildMenu = useAbsenceMenu();
  const personOf = (a: Absence) => data.people.find((p) => p.id === a.personId);

  const empty = (
    <div className="px-4 py-9 text-center text-slate-500">
      <b className="mb-1 block font-semibold text-slate-900">{emptyTitle}</b>
      {onClearFilters && <>Ajusta a pesquisa ou os filtros. <TextLink onClick={onClearFilters}>Limpar filtros</TextLink></>}
    </div>
  );

  const th = 'border-b border-slate-200 px-4 py-2.5 font-medium';
  return (
    <div className="mt-3.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* 7 colunas só cabem a partir de desktop; abaixo usa cartões. */}
      <table className="hidden w-full border-collapse lg:table">
        <thead>
          <tr className="bg-slate-50 text-left text-[12.5px] text-slate-500">
            <th className={th}>Colaborador</th><th className={th}>Tipo</th><th className={th}>Período</th>
            <th className={th}>Horário</th><th className={th}>Duração</th><th className={th}>Estado</th>
            <th className="w-14 border-b border-slate-200"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const p = personOf(a);
            if (!p) return null;
            return (
              <tr
                key={a.id}
                tabIndex={0}
                aria-label={`${p.name}, ${ABSENCE_TYPE_LABEL[a.type]}`}
                onClick={() => openPerson(p.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') openPerson(p.id); }}
                className="cursor-pointer border-b border-slate-200 transition last:border-0 hover:bg-slate-50/60 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#17643e]"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.name} />
                    <span><b className="block font-semibold">{p.name}</b><small className="block text-[12.5px] text-slate-500">{teamLabel(p, data.teams)}</small></span>
                  </div>
                </td>
                <td className="px-4 py-2.5">{ABSENCE_TYPE_LABEL[a.type]}</td>
                <td className="px-4 py-2.5 tabular-nums">{formatRange(a.start, a.end)}</td>
                <td className="px-4 py-2.5 tabular-nums">{absenceHours(a)}{!a.allDay && <Tag>Parcial</Tag>}</td>
                <td className="px-4 py-2.5 tabular-nums">{absenceDuration(a)}</td>
                <td className="px-4 py-2.5"><Pill tone={ABSENCE_STATUS_META[a.status].tone}>{ABSENCE_STATUS_META[a.status].label}</Pill></td>
                <td className="pr-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <ActionMenu label={`Mais opções para a ausência de ${p.name}`} items={buildMenu(a)} />
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={7}>{empty}</td></tr>}
        </tbody>
      </table>

      <ul className="divide-y divide-slate-200 lg:hidden">
        {rows.map((a) => {
          const p = personOf(a);
          if (!p) return null;
          return (
            <li key={a.id} className="flex gap-2 py-3.5 pl-3.5 pr-2">
              <button type="button" onClick={() => openPerson(p.id)} className="flex min-w-0 flex-1 gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
                <Avatar name={p.name} />
                <span className="min-w-0 text-[13px] text-slate-600">
                  <b className="block text-sm font-semibold text-slate-900">{p.name}</b>
                  <small className="block text-[12.5px] text-slate-500">{teamLabel(p, data.teams)}</small>
                  <span className="mt-1.5 block"><b className="font-semibold text-slate-900">{ABSENCE_TYPE_LABEL[a.type]}</b> · {formatRange(a.start, a.end)}</span>
                  <span className="block">{absenceHours(a)} · {absenceDuration(a)}{!a.allDay && <Tag>Parcial</Tag>}</span>
                  <span className="mt-1.5 block"><Pill tone={ABSENCE_STATUS_META[a.status].tone}>{ABSENCE_STATUS_META[a.status].label}</Pill></span>
                </span>
              </button>
              <ActionMenu label={`Mais opções para a ausência de ${p.name}`} items={buildMenu(a)} />
            </li>
          );
        })}
        {rows.length === 0 && <li>{empty}</li>}
      </ul>
      {footer}
    </div>
  );
}

interface AbsencesTabProps {
  /** Controlado pelo botão "Histórico" do cabeçalho. */
  showFullHistory: boolean;
  onToggleHistory: () => void;
}

export const AbsencesTab = forwardRef<HTMLHeadingElement, AbsencesTabProps>(function AbsencesTab({ showFullHistory, onToggleHistory }, historyRef) {
  const { data, today } = useTeams();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const filtered = Boolean(filters.query || filters.team || filters.type || filters.status);

  const { upcoming, past } = useMemo(() => {
    const q = normalize(filters.query);
    const list = data.absences.filter((a) => {
      const p = data.people.find((x) => x.id === a.personId);
      if (!p) return false;
      if (q && !normalize(p.name).includes(q)) return false;
      if (filters.team && p.teamId !== filters.team) return false;
      if (filters.type && a.type !== filters.type) return false;
      return !filters.status || a.status === filters.status;
    });
    return {
      upcoming: list.filter((a) => isUpcoming(a, today)).sort((a, b) => a.start.localeCompare(b.start)),
      past: list.filter((a) => !isUpcoming(a, today)).sort((a, b) => b.start.localeCompare(a.start)),
    };
  }, [data, filters, today]);

  const shownPast = showFullHistory ? past : past.slice(0, HISTORY_PREVIEW);
  const count = (n: number) => `${n} ${n === 1 ? 'registo' : 'registos'}`;

  return (
    <>
      <FilterBar
        query={filters.query}
        onQuery={(v) => set('query', v)}
        searchLabel="Pesquisar por colaborador"
        placeholder="Pesquisar por colaborador…"
        filters={[
          { label: 'Filtrar por equipa', value: filters.team, onChange: (v) => set('team', v), options: [['', 'Todas as equipas'], ...data.teams.map((t): [string, string] => [t.id, t.name])] },
          { label: 'Filtrar por tipo', value: filters.type, onChange: (v) => set('type', v as Filters['type']), options: [['', 'Todos os tipos'], ...(Object.keys(ABSENCE_TYPE_LABEL) as AbsenceType[]).map((k): [string, string] => [k, ABSENCE_TYPE_LABEL[k]])] },
          { label: 'Filtrar por estado', value: filters.status, onChange: (v) => set('status', v as Filters['status']), options: [['', 'Todos os estados'], ['pending', 'Pendente'], ['approved', 'Aprovada'], ['rejected', 'Recusada']] },
        ]}
      />

      <div className="mt-7 flex items-baseline gap-2.5">
        <h2 className="text-[17px] font-semibold tracking-tight">Próximas ausências</h2>
        <span className="text-[13px] text-slate-500">{count(upcoming.length)}</span>
      </div>
      <AbsenceTable rows={upcoming} emptyTitle="Sem ausências próximas" onClearFilters={filtered ? () => setFilters(EMPTY) : undefined} />

      <div className="mt-7 flex items-baseline gap-2.5">
        <h2 ref={historyRef} tabIndex={-1} className="scroll-mt-24 text-[17px] font-semibold tracking-tight focus:outline-none">Ausências anteriores</h2>
        <span className="text-[13px] text-slate-500">{count(past.length)} · anteriores a {formatDay(today, true)}</span>
      </div>
      <AbsenceTable
        rows={shownPast}
        emptyTitle="Sem ausências anteriores"
        onClearFilters={filtered ? () => setFilters(EMPTY) : undefined}
        footer={
          past.length > HISTORY_PREVIEW && (
            <div className="flex justify-center border-t border-slate-200 p-2.5">
              <TextLink onClick={onToggleHistory}>{showFullHistory ? 'Mostrar só as mais recentes' : `Ver histórico completo (${past.length})`}</TextLink>
            </div>
          )
        }
      />
    </>
  );
});
