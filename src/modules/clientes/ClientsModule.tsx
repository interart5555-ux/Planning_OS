import { useCallback, useMemo, useRef, useState } from 'react';
import { AppTopBar, ConfirmDialog, sectionLabel, ToastMessage, type AppSection, type ConfirmOptions } from '../shared/ui';
import { APP_CONFIGS, lower } from './appConfigs';
import { ClientDrawer } from './components/ClientDrawer';
import { ClientFormDrawer } from './components/ClientFormDrawer';
import { ClientsList } from './components/ClientsList';
import { ClientsContext, type ClientDrawerTab, type ClientsContextValue } from './components/context';
import { LocationDetail } from './components/LocationDetail';
import { LocationFormDrawer } from './components/LocationFormDrawer';
import { LocationsView } from './components/LocationsView';
import { DEMO_TEAMS } from './mockData';
import type { AppConfig, AppKey, ClientsData, ClientsView, TeamRef } from './types';
import { useClientsModule } from './useClientsModule';

interface ClientsModuleProps {
  /** Aplicação AppOS ativa (ou uma configuração própria). Por omissão: Limpezas. */
  app?: AppKey | AppConfig;
  initialData?: ClientsData;
  /** Equipas para "equipa por defeito" (Módulo 2). */
  teams?: TeamRef[];
  userInitials?: string;
  onNavigate?: (section: AppSection) => void;
}

type Panel =
  | { kind: 'client'; id: string; tab?: ClientDrawerTab }
  | { kind: 'clientForm'; id: string | null }
  | { kind: 'locationForm'; clientId: string; locationId: string | null }
  | null;

/**
 * Módulo 3 — Clientes e locais de serviço (reutilizável entre aplicações AppOS).
 * Cliente → Local de serviço → Unidade, com terminologia e campos por aplicação.
 */
export default function ClientsModule({ app = 'limpezas', initialData, teams = DEMO_TEAMS, userInitials = 'PS', onNavigate }: ClientsModuleProps) {
  const config = typeof app === 'string' ? APP_CONFIGS[app] : app;
  const { data, toast, dismissToast, actions } = useClientsModule({ initialData, features: config.features });

  const [view, setView] = useState<ClientsView>({ name: 'clients' });
  const [panel, setPanel] = useState<Panel>(null);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const dirtyRef = useRef(false);
  const onDirtyChange = useCallback((dirty: boolean) => { dirtyRef.current = dirty; }, []);

  /** Sair do detalhe com alterações por guardar pede confirmação. */
  const guard = useCallback((proceed: () => void) => {
    if (!dirtyRef.current) { proceed(); return; }
    setConfirmState({
      title: 'Sair sem guardar?',
      body: `Tens alterações por guardar ${config.location.gender === 'f' ? 'nesta' : 'neste'} ${lower(config.location)}. Se saíres agora, perdem-se.`,
      confirmLabel: 'Sair sem guardar',
      danger: true,
      onConfirm: () => { dirtyRef.current = false; proceed(); },
    });
  }, [config.location]);

  const navigate = useCallback((next: ClientsView) => guard(() => {
    setPanel(null);
    setView(next);
    window.scrollTo({ top: 0 });
  }), [guard]);

  const ctx = useMemo<ClientsContextValue>(() => ({
    data,
    config,
    teams,
    actions,
    navigate,
    confirm: setConfirmState,
    openClient: (id, tab) => setPanel({ kind: 'client', id, tab }),
    openClientForm: (id) => setPanel({ kind: 'clientForm', id }),
    openLocationForm: (clientId, locationId) => setPanel({ kind: 'locationForm', clientId, locationId }),
  }), [data, config, teams, actions, navigate]);

  const topNavigate = (section: AppSection) => {
    if (section === 'clientes') { navigate({ name: 'clients' }); return; }
    if (onNavigate) guard(() => onNavigate(section));
    else actions.notify(section === 'equipas' ? '“Equipas” é o Módulo 2.' : `“${sectionLabel(section)}” fica disponível num passo seguinte.`);
  };

  return (
    <ClientsContext.Provider value={ctx}>
      <div className="min-h-screen bg-white text-sm text-slate-900 antialiased">
        <AppTopBar active="clientes" appLabel={config.label} userInitials={userInitials} onNavigate={topNavigate} notify={actions.notify} />

        <main className="mx-auto max-w-[1200px] px-4 pb-10 pt-5 md:px-8 md:pb-14 md:pt-7">
          {view.name === 'clients' && <ClientsList />}
          {view.name === 'locations' && <LocationsView clientId={view.clientId} />}
          {view.name === 'location' && <LocationDetail key={view.locationId} locationId={view.locationId} onDirtyChange={onDirtyChange} />}
        </main>

        {panel?.kind === 'client' && <ClientDrawer key={panel.id} clientId={panel.id} initialTab={panel.tab} onClose={() => setPanel(null)} />}
        {panel?.kind === 'clientForm' && (
          <ClientFormDrawer clientId={panel.id} onClose={() => setPanel(null)} onCreated={(id) => setPanel({ kind: 'client', id })} />
        )}
        {panel?.kind === 'locationForm' && (
          <LocationFormDrawer
            clientId={panel.clientId}
            locationId={panel.locationId}
            onClose={() => setPanel(null)}
            onCreated={(id) => {
              navigate({ name: 'location', clientId: panel.clientId, locationId: id });
              actions.notify(`${lower(config.location).charAt(0).toUpperCase()}${lower(config.location).slice(1)} criado. Configura as ${lower(config.unit, true)} e as preferências.`);
            }}
          />
        )}
        {confirmState && <ConfirmDialog options={confirmState} onClose={() => setConfirmState(null)} />}
        <ToastMessage toast={toast} onDismiss={dismissToast} />
      </div>
    </ClientsContext.Provider>
  );
}
