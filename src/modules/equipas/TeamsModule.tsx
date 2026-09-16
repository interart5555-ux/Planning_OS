import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { CompanyOnboardingResult } from '../onboarding';
import { AbsenceDrawer } from './components/AbsenceDrawer';
import { AbsencesTab } from './components/AbsencesTab';
import { AddPersonDrawer } from './components/AddPersonDrawer';
import { CollaboratorsTab } from './components/CollaboratorsTab';
import { TeamsContext, type TeamsContextValue } from './components/context';
import { type AppSection, AppTopBar, Button, ConfirmDialog, type ConfirmOptions, focusRing, Icon, type IconName, sectionLabel, ToastMessage } from '../shared/ui';
import { PersonDrawer } from './components/PersonDrawer';
import { TeamDrawer } from './components/TeamDrawer';
import { TeamsTab } from './components/TeamsTab';
import type { CompanyMode, TeamsData, TeamsTab as Tab } from './types';
import { useTeamsModule } from './useTeamsModule';

export type { AppSection };

interface TeamsModuleProps {
  /**
   * Resultado do Módulo 1. `is_admin_also_manager` define se a empresa é
   * microempresa ou tem responsabilidades separadas.
   */
  company?: Pick<CompanyOnboardingResult, 'is_admin_also_manager'>;
  /** Força o modo (útil em pré-visualização); tem prioridade sobre `company`. */
  mode?: CompanyMode;
  initialData?: TeamsData;
  /** Data de referência; por omissão usa a data de demonstração. */
  today?: string;
  /** Iniciais do utilizador autenticado (avatar do topo). */
  userInitials?: string;
  onNavigate?: (section: AppSection) => void;
}

type Panel =
  | { kind: 'person'; id: string }
  | { kind: 'addPerson'; role: 'collab' | 'manager' }
  | { kind: 'team'; id: string | null; focus?: 'lead' }
  | { kind: 'absence'; personId?: string }
  | null;


const TABS: Array<[Tab, string]> = [['colab', 'Colaboradores'], ['teams', 'Equipas'], ['abs', 'Ausências']];

/**
 * Módulo 2 — Equipas.
 * Gestão centralizada de colaboradores, gestoras, equipas, ausências e acessos.
 * Simulação visual: dados em memória, sem envio real de emails.
 */
export default function TeamsModule({ company, mode: forcedMode, initialData, today, userInitials = 'PS', onNavigate }: TeamsModuleProps) {
  const mode: CompanyMode = forcedMode ?? (company && !company.is_admin_also_manager ? 'separate' : 'micro');
  const { data, today: refDay, stats, sendingIds, toast, dismissToast, actions } = useTeamsModule({ initialData, today });

  const [tab, setTab] = useState<Tab>('colab');
  const [panel, setPanel] = useState<Panel>(null);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const historyRef = useRef<HTMLHeadingElement>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ colab: null, teams: null, abs: null });

  const closePanel = useCallback(() => setPanel(null), []);

  const ctx = useMemo<TeamsContextValue>(() => ({
    data,
    today: refDay,
    mode,
    sendingIds,
    actions,
    openPerson: (id) => setPanel({ kind: 'person', id }),
    openAddPerson: (role = 'collab') => setPanel({ kind: 'addPerson', role }),
    openTeam: (id, focus) => setPanel({ kind: 'team', id, focus }),
    openAbsence: (personId) => setPanel({ kind: 'absence', personId }),
    confirm: setConfirmState,
  }), [data, refDay, mode, sendingIds, actions]);

  const navigate = (section: AppSection) => {
    if (onNavigate) onNavigate(section);
    else if (section !== 'equipas') actions.notify(`“${sectionLabel(section)}” fica disponível num passo seguinte.`);
  };

  const toggleHistory = () => {
    setShowFullHistory((v) => {
      if (!v) requestAnimationFrame(() => historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      return !v;
    });
  };

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.findIndex(([t]) => t === tab);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length][0];
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const tabCounts: Record<Tab, number> = { colab: stats.activePeople, teams: stats.teams, abs: stats.upcomingAbsences };

  return (
    <TeamsContext.Provider value={ctx}>
      <div className="min-h-screen bg-white text-sm text-slate-900 antialiased">
        <AppTopBar active="equipas" appLabel="Limpezas" userInitials={userInitials} onNavigate={navigate} notify={actions.notify} />

        <main className="mx-auto max-w-[1200px] px-4 pb-10 pt-6 md:px-8 md:pb-14 md:pt-8">
          {/* ---------- Cabeçalho ---------- */}
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">Limpezas · Equipas</p>
              <h1 className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]">Equipa</h1>
              <p className="mt-1.5 text-[14.5px] text-slate-600">Gere colaboradores, equipas, ausências e acessos à aplicação.</p>
            </div>
            <div className="flex w-full flex-wrap gap-2.5 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
              {tab === 'colab' && <Button variant="primary" icon="plus" onClick={() => ctx.openAddPerson()}>Adicionar colaborador</Button>}
              {tab === 'teams' && <Button variant="primary" icon="plus" onClick={() => ctx.openTeam(null)}>Criar equipa</Button>}
              {tab === 'abs' && (
                <>
                  <Button variant="primary" icon="plus" onClick={() => ctx.openAbsence()}>Registar ausência</Button>
                  <Button icon="history" aria-pressed={showFullHistory} onClick={toggleHistory}>Histórico</Button>
                </>
              )}
            </div>
          </section>

          {/* ---------- Resumo ---------- */}
          <section aria-label="Resumo" className="mt-5 grid gap-2 sm:grid-cols-3 sm:gap-3">
            <StatCard icon="user" value={stats.activePeople} label="Colaboradores ativos"
              detail={`${stats.withActiveAccess} com acesso ativo · ${stats.awaitingAccess} por ativar`} onClick={() => setTab('colab')} />
            <StatCard icon="users" value={stats.teams} label="Equipas ativas"
              detail={stats.withoutTeam ? `${stats.withoutTeam} ${stats.withoutTeam === 1 ? 'pessoa' : 'pessoas'} sem equipa` : 'Todos com equipa atribuída'} onClick={() => setTab('teams')} />
            <StatCard icon="calendar" value={stats.upcomingAbsences} label="Ausências próximas"
              detail={`${stats.pendingAbsences} por aprovar`} onClick={() => setTab('abs')} />
          </section>

          {/* ---------- Separadores ---------- */}
          <div role="tablist" aria-label="Secções de Equipas" onKeyDown={onTabKey} className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
            {TABS.map(([t, label]) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  ref={(el) => { tabRefs.current[t] = el; }}
                  type="button"
                  role="tab"
                  id={`equipas-tab-${t}`}
                  aria-controls="equipas-panel"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTab(t)}
                  className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 ${active ? 'border-[#17643e] bg-[#e9f4ee] font-semibold text-[#17643e]' : 'border-transparent font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'} ${focusRing}`}
                >
                  {label}
                  <span className={`grid h-5 min-w-[22px] place-items-center rounded-full px-1.5 text-[11.5px] font-semibold tabular-nums ${active ? 'bg-white text-[#17643e]' : 'bg-slate-100 text-slate-600'}`}>
                    {tabCounts[t]}
                  </span>
                </button>
              );
            })}
          </div>

          <section id="equipas-panel" role="tabpanel" aria-labelledby={`equipas-tab-${tab}`}>
            {tab === 'colab' && <CollaboratorsTab />}
            {tab === 'teams' && <TeamsTab />}
            {tab === 'abs' && <AbsencesTab ref={historyRef} showFullHistory={showFullHistory} onToggleHistory={toggleHistory} />}
          </section>
        </main>

        {/* ---------- Painéis e diálogos ---------- */}
        {panel?.kind === 'person' && <PersonDrawer key={panel.id} personId={panel.id} onClose={closePanel} />}
        {panel?.kind === 'addPerson' && <AddPersonDrawer presetRole={panel.role} onClose={closePanel} />}
        {panel?.kind === 'team' && <TeamDrawer key={panel.id ?? 'new'} teamId={panel.id} focus={panel.focus} onClose={closePanel} />}
        {panel?.kind === 'absence' && <AbsenceDrawer presetPersonId={panel.personId} onClose={closePanel} />}
        {confirmState && <ConfirmDialog options={confirmState} onClose={() => setConfirmState(null)} />}
        <ToastMessage toast={toast} onDismiss={dismissToast} />
      </div>
    </TeamsContext.Provider>
  );
}

function StatCard({ icon, value, label, detail, onClick }: { icon: IconName; value: number; label: string; detail: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-sm transition hover:border-[#cde5d6] sm:flex-col sm:items-start sm:gap-2.5 sm:px-4 sm:py-3.5 lg:flex-row lg:items-center lg:gap-3.5 ${focusRing}`}
    >
      <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-[#e9f4ee] text-[#17643e] sm:h-10 sm:w-10"><Icon name={icon} /></span>
      <span className="order-3 ml-auto text-[22px] font-bold leading-none tracking-tight tabular-nums sm:order-none sm:ml-0 sm:text-2xl">{value}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold">{label}</span>
        <span className="mt-px block text-xs text-slate-500">{detail}</span>
      </span>
    </button>
  );
}
