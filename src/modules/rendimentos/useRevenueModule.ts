import { useCallback, useReducer, useRef, useState } from 'react';
import { refreshUnpaidInvoices } from './rules';
import type { IsoDate, MonthKey, PaymentRecord, RevenueData, SupplyModel, Viewer } from './types';

type Action =
  | { type: 'reset'; data: RevenueData }
  | { type: 'payment'; invoiceId: string; payment: PaymentRecord }
  | { type: 'teamPaid'; month: MonthKey; personId: string; date: IsoDate }
  | { type: 'supply'; clientId: string; supply: SupplyModel; supplement: number };

function reducer(data: RevenueData, action: Action): RevenueData {
  switch (action.type) {
    case 'reset':
      return action.data;
    case 'payment':
      return { ...data, invoices: data.invoices.map((inv) => (inv.id === action.invoiceId ? { ...inv, payments: [...inv.payments, action.payment] } : inv)) };
    case 'teamPaid':
      return { ...data, teamPaid: { ...data.teamPaid, [action.month]: { ...data.teamPaid[action.month], [action.personId]: action.date } } };
    case 'supply': {
      const client = data.clients.find((c) => c.id === action.clientId);
      if (!client) return data;
      const next = { ...client, supply: action.supply, supplement: action.supplement };
      return { ...data, clients: data.clients.map((c) => (c.id === next.id ? next : c)), invoices: refreshUnpaidInvoices(data.invoices, next) };
    }
    default:
      return data;
  }
}

/** Estado e ações simuladas do Módulo 7 (sem pagamentos reais, faturação certificada nem base de dados). */
export function useRevenueModule({ createData, viewer, today }: { createData: () => RevenueData; viewer: Viewer; today: IsoDate }) {
  const [data, dispatch] = useReducer(reducer, null, createData);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const registerPayment = useCallback((invoiceId: string, payment: Omit<PaymentRecord, 'by'>) => {
    if (!viewer.canView) return;
    dispatch({ type: 'payment', invoiceId, payment: { ...payment, by: viewer.name } });
  }, [viewer]);

  const markTeamPaid = useCallback((month: MonthKey, personId: string) => {
    if (viewer.canView) dispatch({ type: 'teamPaid', month, personId, date: today });
  }, [viewer, today]);

  const setSupply = useCallback((clientId: string, supply: SupplyModel, supplement: number) => {
    if (viewer.canView) dispatch({ type: 'supply', clientId, supply, supplement });
  }, [viewer]);

  const reset = useCallback(() => {
    dispatch({ type: 'reset', data: createData() });
    notify('Dados de demonstração repostos.');
  }, [createData, notify]);

  return { data, toast, dismissToast, actions: { notify, registerPayment, markTeamPaid, setSupply, reset } };
}

export type RevenueActions = ReturnType<typeof useRevenueModule>['actions'];
