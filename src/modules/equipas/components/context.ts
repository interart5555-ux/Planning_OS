import { createContext, useContext } from 'react';
import type { TeamsModuleActions } from '../useTeamsModule';
import type { CompanyMode, TeamsData } from '../types';
import type { ConfirmOptions } from '../../shared/ui';

/** Abre painéis e diálogos a partir de qualquer separador. */
export interface TeamsNavigation {
  openPerson: (id: string) => void;
  openAddPerson: (presetRole?: 'collab' | 'manager') => void;
  openTeam: (id: string | null, focus?: 'lead') => void;
  openAbsence: (personId?: string) => void;
  confirm: (options: ConfirmOptions) => void;
}

export interface TeamsContextValue extends TeamsNavigation {
  data: TeamsData;
  today: string;
  mode: CompanyMode;
  sendingIds: string[];
  actions: TeamsModuleActions;
}

export const TeamsContext = createContext<TeamsContextValue | null>(null);

export function useTeams(): TeamsContextValue {
  const value = useContext(TeamsContext);
  if (!value) throw new Error('useTeams tem de ser usado dentro de <TeamsModule>.');
  return value;
}
