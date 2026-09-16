import { createContext, useContext } from 'react';
import type { ConfirmOptions } from '../../shared/ui';
import type { ClientsModuleActions } from '../useClientsModule';
import type { AppConfig, ClientsData, ClientsView, TeamRef } from '../types';

export type ClientDrawerTab = 'summary' | 'locations' | 'units' | 'notes';

export interface ClientsContextValue {
  data: ClientsData;
  config: AppConfig;
  teams: TeamRef[];
  actions: ClientsModuleActions;
  /** Muda de ecrã; pede confirmação se houver alterações por guardar. */
  navigate: (view: ClientsView) => void;
  confirm: (options: ConfirmOptions) => void;
  openClient: (id: string, tab?: ClientDrawerTab) => void;
  openClientForm: (id: string | null) => void;
  openLocationForm: (clientId: string, locationId: string | null) => void;
}

export const ClientsContext = createContext<ClientsContextValue | null>(null);

export function useClients(): ClientsContextValue {
  const value = useContext(ClientsContext);
  if (!value) throw new Error('useClients tem de ser usado dentro de <ClientsModule>.');
  return value;
}

/** Selectores simples partilhados pelos ecrãs. */
export const locationsOf = (data: ClientsData, clientId: string) => data.locations.filter((l) => l.clientId === clientId);
export const unitCountOf = (data: ClientsData, clientId: string) => locationsOf(data, clientId).reduce((n, l) => n + l.units.length, 0);
export const teamName = (teams: TeamRef[], id: string | null) => teams.find((t) => t.id === id)?.name ?? 'Sem equipa';
