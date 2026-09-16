import { createContext, useContext } from 'react';
import type { ApprovalsActions } from '../useApprovalsModule';
import type { ApprovalsConfig, ApprovalsPerson, DrawerTab, Viewer, WorkRecord } from '../types';

export type ModalState = { type: 'correction' | 'reopen'; id: string } | null;

export interface ApprovalsContextValue {
  config: ApprovalsConfig;
  records: WorkRecord[];
  acted: ReadonlySet<string>;
  people: ApprovalsPerson[];
  clients: string[];
  today: string;
  viewer: Viewer;
  actions: ApprovalsActions;
  openRecord: (id: string, tab?: DrawerTab) => void;
  openModal: (modal: NonNullable<ModalState>) => void;
}

export const ApprovalsContext = createContext<ApprovalsContextValue | null>(null);

export function useApprovals(): ApprovalsContextValue {
  const value = useContext(ApprovalsContext);
  if (!value) throw new Error('useApprovals tem de ser usado dentro de <ApprovalsModule>.');
  return value;
}
