import { createContext, useContext } from 'react';
import type { RevenueActions } from '../useRevenueModule';
import type { IsoDate, MonthKey, Period, RevenueConfig, RevenueData, Screen, Viewer } from '../types';

export interface RevenueContextValue {
  config: RevenueConfig;
  data: RevenueData;
  today: IsoDate;
  lastMonth: MonthKey;
  viewer: Viewer;
  actions: RevenueActions;
  period: Period;
  setPeriod: (p: Period) => void;
  screen: Screen;
  go: (screen: Screen) => void;
  openInvoice: (id: string) => void;
  openPerson: (id: string, month: MonthKey) => void;
  openClient: (id: string) => void;
  /** Pagamentos de clientes filtrados por receber (últimos 3 meses). */
  seeOpenPayments: () => void;
}

export const RevenueContext = createContext<RevenueContextValue | null>(null);

export function useRevenue(): RevenueContextValue {
  const value = useContext(RevenueContext);
  if (!value) throw new Error('useRevenue tem de ser usado dentro de <RevenueModule>.');
  return value;
}
