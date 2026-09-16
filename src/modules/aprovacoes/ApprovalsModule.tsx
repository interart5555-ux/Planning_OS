import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AppTopBar, cx, sectionLabel, ToastMessage, type AppSection } from '../shared/ui';
import { ApprovalsContext, type ApprovalsContextValue, type ModalState } from './components/context';
import { RecordDrawer } from './components/RecordDrawer';
import { CorrectionDialog, ReopenDialog } from './components/ReviewDialogs';
import { ApprovalsScreen, DEFAULT_APPROVAL_FILTERS, DEFAULT_HISTORY_FILTERS, DeniedScreen, HistoryScreen } from './components/Screens';
import { APPROVALS_CONFIGS, VIEWERS } from './config';
import { lowerFirst, plural } from './dates';
import { createDemoApprovals, DEMO_CLIENTS, DEMO_NOW, DEMO_PEOPLE, DEMO_TODAY } from './mockData';
import { pendingCount } from './rules';
import type { ApprovalFilters, ApprovalsAppKey, ApprovalsConfig, ApprovalsPerson, DrawerTab, HistoryFilters, Screen, Viewer, ViewerRole, WorkRecord } from './types';
import { useApprovalsModule } from './useApprovalsModule';

interface ApprovalsModuleProps {
  app?: ApprovalsAppKey | ApprovalsConfig;
  /** Perfil simulado; só administradora e gestora têm acesso. */
  viewer?: ViewerRole | Viewer;
  initialRecords?: WorkRecord[];
  people?: ApprovalsPerson[];
  clients?: string[];
  /** Data e hora de referência; por omissão a demonstração (13 mar 2026, 11:30). */
  today?: string;
  now?: string;
  initialScreen?: Screen;
  onNavigate?: (section: AppSection) => void;
}

/**
 * Módulo 6 — Aprovações e histórico.
 * Conclusões com ocorrências esperam validação; as completas e sem ocorrências são aprovadas automaticamente.
 */
export default function ApprovalsModule({ app = 'limpezas', viewer: viewerProp = 'gestora', initialRecords, people = DEMO_PEOPLE, clients = DEMO_CLIENTS, today = DEMO_TODAY, now = DEMO_NOW, initialScreen = 'approvals', onNavigate }: ApprovalsModuleProps) {
  const config = typeof app === 'string' ? APPROVALS_CONFIGS[app] : app;
  const viewer = typeof viewerProp === 'string' ? VIEWERS[viewerProp] : viewerProp;
  const createRecords = useCallback(() => initialRecords ?? createDemoApprovals(config, today, people), [initialRecords, config, today, people]);
  const { records, acted, toast, dismissToast, actions } = useApprovalsModule({ createRecords, viewer, now });

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [approvalFilters, setApprovalFilters] = useState<ApprovalFilters>(DEFAULT_APPROVAL_FILTERS);
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>(DEFAULT_HISTORY_FILTERS);
  const [drawer, setDrawer] = useState<{ id: string; tab: DrawerTab } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusTitle = useRef(false);

  // Mudar de perfil fecha painéis que o novo perfil não pode usar.
  useEffect(() => { setModal(null); }, [viewer]);
  useEffect(() => {
    if (!focusTitle.current) return;
    focusTitle.current = false;
    titleRef.current?.focus({ preventScroll: true });
  }, [screen, historyFilters]);

  const ctx = useMemo<ApprovalsContextValue>(() => ({
    config, records, acted, people, clients, today, viewer, actions,
    openRecord: (id, tab = 'details') => setDrawer({ id, tab }),
    openModal: (m) => { if (viewer.canReview) setModal(m); },
  }), [config, records, acted, people, clients, today, viewer, actions]);

  const go = (next: Screen) => { focusTitle.current = true; setScreen(next); };
  const navigate = (section: AppSection) => {
    if (section === 'aprovacoes') { go('approvals'); return; }
    if (onNavigate) onNavigate(section);
    else actions.notify(`“${sectionLabel(section)}” fica fora desta simulação.`);
  };

  const pending = viewer.canReview ? pendingCount(records) : 0;
  const tabs = ([['approvals', 'Aprovações'], ['history', config.history]] as Array<[Screen, string]>);
  const onTabKey = (e: KeyboardEvent) => {
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const next = screen === 'approvals' ? 'history' : 'approvals';
      setScreen(next);
      document.getElementById(`screen-tab-${next}`)?.focus();
    }
  };

  return (
    <ApprovalsContext.Provider value={ctx}>
      <div className="min-h-screen bg-white text-sm text-slate-900 antialiased">
        <AppTopBar active="aprovacoes" appLabel={config.label} userInitials={viewer.initials} onNavigate={navigate} notify={actions.notify}
          badges={{ aprovacoes: { count: pending, label: plural(pending, 'aprovação pendente', 'aprovações pendentes') } }} />

        <main className="mx-auto max-w-[1240px] px-4 pb-10 pt-[18px] md:px-8 md:pb-14 md:pt-[26px]">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">{config.label} · {screen === 'history' && viewer.canReview ? 'Histórico' : 'Aprovações'}</p>
          <h1 ref={titleRef} tabIndex={-1} className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight focus:outline-none sm:text-[30px]">
            {screen === 'history' && viewer.canReview ? config.history : 'Aprovações'}
          </h1>

          {!viewer.canReview ? <DeniedScreen /> : (
            <>
              <p className="mt-1.5 text-[14.5px] text-slate-600">
                {screen === 'history' ? `Consulta o histórico de ${lowerFirst(config.job.plural)} concluídas, reabertas e arquivadas.` : 'Revê conclusões, anomalias e alterações pendentes.'}
              </p>
              <div role="tablist" aria-label="Secções" onKeyDown={onTabKey} className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
                {tabs.map(([key, label]) => (
                  <button key={key} id={`screen-tab-${key}`} type="button" role="tab" aria-selected={screen === key} tabIndex={screen === key ? 0 : -1} onClick={() => go(key)}
                    className={cx('-mb-px inline-flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]',
                      screen === key ? 'border-[#17643e] bg-[#e9f4ee] font-semibold text-[#17643e]' : 'border-transparent font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
                    {label}
                    {key === 'approvals' && pending > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#d92d20] px-1.5 text-[11px] font-bold text-white">{pending}</span>}
                  </button>
                ))}
              </div>

              {screen === 'approvals'
                ? <ApprovalsScreen filters={approvalFilters} onChange={setApprovalFilters}
                    onAutoHistory={() => { setHistoryFilters({ ...DEFAULT_HISTORY_FILTERS, period: '7', status: 'auto' }); go('history'); }} />
                : <HistoryScreen filters={historyFilters} onChange={setHistoryFilters} />}
            </>
          )}
        </main>

        {drawer && viewer.canReview && (
          <RecordDrawer recordId={drawer.id} tab={drawer.tab} onTab={(tab) => setDrawer({ ...drawer, tab })} onClose={() => { setDrawer(null); setModal(null); }} />
        )}
        {modal?.type === 'correction' && <CorrectionDialog recordId={modal.id} onClose={() => setModal(null)} />}
        {modal?.type === 'reopen' && <ReopenDialog recordId={modal.id} onClose={() => setModal(null)} />}
        <ToastMessage toast={toast} onDismiss={dismissToast} />
      </div>
    </ApprovalsContext.Provider>
  );
}
