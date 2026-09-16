import { createContext, useContext, type MutableRefObject } from 'react';
import type { ExecActions } from '../useExecutionModule';
import type { ExecConfig, ExecData, ExecPerson, ExecScreen, ExecTab } from '../types';

export interface ExecContextValue {
  config: ExecConfig;
  person: ExecPerson;
  today: string;
  data: ExecData;
  online: boolean;
  syncing: boolean;
  lastSync: string;
  nowMin: () => number;
  actions: ExecActions;
  tab: ExecTab;
  screen: ExecScreen;
  date: string;
  setDate: (date: string) => void;
  setTab: (tab: ExecTab) => void;
  /** Navega dentro de "Hoje" (lista, detalhe, execução, conclusão). */
  go: (screen: ExecScreen, jobId?: string) => void;
  openJob: (jobId: string) => void;
  startJob: (jobId: string) => void;
  openIssue: (jobId: string) => void;
  /** true uma vez depois de navegar: o título do novo ecrã recebe o foco. */
  focusRequest: MutableRefObject<boolean>;
}

export const ExecContext = createContext<ExecContextValue | null>(null);

export function useExec(): ExecContextValue {
  const value = useContext(ExecContext);
  if (!value) throw new Error('useExec tem de ser usado dentro de <ExecutionModule>.');
  return value;
}

/** "a limpeza", "a sessão", "a intervenção" (todas femininas nas três aplicações). */
export const theJob = (config: ExecConfig): string => `a ${config.job.singular.toLowerCase()}`;
export const aJob = (config: ExecConfig): string => `uma ${config.job.singular.toLowerCase()}`;
