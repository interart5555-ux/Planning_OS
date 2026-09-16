import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppTopBar, Icon, sectionLabel, ToastMessage, type AppSection } from '../shared/ui';
import { ModuloInativo, ModulosAtivosProvider, useModulosAtivos, type ModulosOpcionais } from '../shared/company';
import { ClientDetail, ClientsScreen } from './components/ClientScreens';
import { RevenueContext, type RevenueContextValue } from './components/context';
import { OverviewScreen } from './components/Overview';
import { InvoicePanel, PersonPanel, RegisterPaymentDialog, SupplyDialog } from './components/Panels';
import { defaultPaymentFilters, PaymentsScreen } from './components/PaymentsScreen';
import { TeamScreen } from './components/TeamScreen';
import { REVENUE_CONFIGS, VIEWERS } from './config';
import { yearOf } from './format';
import { createDemoRevenue, DEMO_LAST_MONTH, DEMO_TODAY } from './mockData';
import type { MonthKey, PaymentFilters, Period, RevenueAppKey, RevenueConfig, RevenueData, Screen, Viewer, ViewerRole } from './types';
import { useRevenueModule } from './useRevenueModule';

interface RevenueModuleProps {
  app?: RevenueAppKey | RevenueConfig;
  /** Perfil simulado; só administradora e gestora têm acesso. */
  viewer?: ViewerRole | Viewer;
  initialData?: RevenueData;
  /** Data de referência e último mês fechado; por omissão a demonstração (6 out 2026 · setembro 2026). */
  today?: string;
  lastMonth?: MonthKey;
  initialScreen?: Exclude<Screen, 'client'>;
  onNavigate?: (section: AppSection) => void;
}

type Layer =
  | { kind: 'invoice'; id: string }
  | { kind: 'person'; id: string; month: MonthKey }
  | null;

/**
 * Módulo 7 — Rendimentos.
 * Faturação, recebimentos, custos de equipa e produtos, margem e saúde financeira (simulação, sem pagamentos reais).
 */
function RevenueModuleContent({ app = 'limpezas', viewer: viewerProp = 'gestora', initialData, today = DEMO_TODAY, lastMonth = DEMO_LAST_MONTH, initialScreen = 'overview', onNavigate }: RevenueModuleProps) {
  const config = typeof app === 'string' ? REVENUE_CONFIGS[app] : app;
  const viewer = typeof viewerProp === 'string' ? VIEWERS[viewerProp] : viewerProp;
  const createData = useCallback(() => initialData ?? createDemoRevenue(config, today, lastMonth), [initialData, config, today, lastMonth]);
  const { data, toast, dismissToast, actions } = useRevenueModule({ createData, viewer, today });

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [period, setPeriod] = useState<Period>({ view: 'month', month: lastMonth, year: yearOf(lastMonth) });
  const [paymentFilters, setPaymentFilters] = useState<PaymentFilters>(() => defaultPaymentFilters(lastMonth));
  const [teamMonthKey, setTeamMonthKey] = useState<MonthKey>(lastMonth);
  const [client, setClient] = useState<{ id: string; tab: 'fin' | 'inv' } | null>(null);
  const [layer, setLayer] = useState<Layer>(null);
  const [dialog, setDialog] = useState<'register' | 'supply' | null>(null);
  const focusTitle = useRef(false);

  useEffect(() => {
    if (!focusTitle.current) return;
    focusTitle.current = false;
    document.getElementById('page-title')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [screen, client?.id]);

  const go = useCallback((next: Screen) => { focusTitle.current = true; setLayer(null); setDialog(null); setScreen(next); }, []);

  const ctx = useMemo<RevenueContextValue>(() => ({
    config, data, today, lastMonth, viewer, actions, period, setPeriod, screen, go,
    openInvoice: (id) => setLayer({ kind: 'invoice', id }),
    openPerson: (id, month) => setLayer({ kind: 'person', id, month }),
    openClient: (id) => { setClient({ id, tab: 'fin' }); go('client'); },
    seeOpenPayments: () => { setPaymentFilters({ q: '', status: 'open', period: 'all', sort: 'status' }); go('payments'); },
  }), [config, data, today, lastMonth, viewer, actions, period, screen, go]);

  const navigate = (section: AppSection) => {
    if (section === 'rendimentos') { go('overview'); return; }
    if (onNavigate) onNavigate(section);
    else actions.notify(`“${sectionLabel(section)}” fica fora desta simulação.`);
  };

  return (
    <RevenueContext.Provider value={ctx}>
      <div className="min-h-screen bg-white text-sm text-slate-900 antialiased">
        <AppTopBar active="rendimentos" appLabel={config.label} userInitials={viewer.initials} onNavigate={navigate} notify={actions.notify} />

        <main className="mx-auto max-w-[1240px] px-4 pb-10 pt-[18px] md:px-8 md:pb-14 md:pt-[26px]">
          {!viewer.canView ? (
            <>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">{config.label} · Rendimentos</p>
              <h1 className="mt-1.5 text-[26px] font-bold tracking-tight sm:text-[30px]">Rendimentos</h1>
              <div role="status" className="mx-auto mt-10 max-w-[560px] rounded-2xl border border-slate-200 p-7 text-center shadow-sm">
                <Icon name="lock" className="mx-auto h-9 w-9 text-slate-400" />
                <h2 className="mb-1 mt-2.5 text-xl font-bold">Sem acesso a esta área</h2>
                <p className="text-slate-600">Rendimentos está disponível apenas para a administradora e a gestora. Como {config.person.feminine}, não podes consultar valores financeiros, margens ou pagamentos.</p>
              </div>
            </>
          ) : screen === 'payments' ? <PaymentsScreen filters={paymentFilters} onChange={setPaymentFilters} />
            : screen === 'team' ? <TeamScreen month={teamMonthKey} onMonth={setTeamMonthKey} />
            : screen === 'clients' ? <ClientsScreen />
            : screen === 'client' && client ? <ClientDetail clientId={client.id} tab={client.tab} onTab={(tab) => setClient({ ...client, tab })} onEditSupply={() => setDialog('supply')} />
            : <OverviewScreen />}
        </main>

        {viewer.canView && layer?.kind === 'invoice' && (
          <InvoicePanel invoiceId={layer.id} fromClient={screen === 'client'} onClose={() => { setLayer(null); setDialog(null); }} onRegister={() => setDialog('register')} />
        )}
        {viewer.canView && layer?.kind === 'person' && <PersonPanel personId={layer.id} month={layer.month} onClose={() => setLayer(null)} />}
        {viewer.canView && dialog === 'register' && layer?.kind === 'invoice' && <RegisterPaymentDialog invoiceId={layer.id} onClose={() => setDialog(null)} />}
        {viewer.canView && dialog === 'supply' && client && <SupplyDialog clientId={client.id} onClose={() => setDialog(null)} />}
        <ToastMessage toast={toast} onDismiss={dismissToast} />
      </div>
    </RevenueContext.Provider>
  );
}

/** Rota do módulo, controlada pelos módulos ativos da empresa (`modulos` sobrepõe-se ao Provider). */
export default function RevenueModule({ modulos: override, ...rest }: RevenueModuleProps & { modulos?: Partial<ModulosOpcionais> }) {
  const company = useModulosAtivos();
  const modulos = override ? { ...company, ...override } : company;
  if (!modulos.rendimentos) return <ModuloInativo modulo="rendimentos" section="rendimentos" appLabel={typeof rest.app === 'object' ? rest.app.label : REVENUE_CONFIGS[rest.app ?? 'limpezas'].label} onNavigate={rest.onNavigate} />;
  return <ModulosAtivosProvider value={modulos}><RevenueModuleContent {...rest} /></ModulosAtivosProvider>;
}
