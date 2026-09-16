import { useCallback, useReducer, useRef, useState } from 'react';
import type { AuditEvent, ReopenState, ReviewState, Viewer, WorkRecord } from './types';

interface State {
  records: WorkRecord[];
  /** Registos tratados nesta sessão (continuam visíveis em "Pendentes"). */
  acted: ReadonlySet<string>;
}

type Action =
  | { type: 'reset'; records: WorkRecord[] }
  | { type: 'review'; id: string; review: ReviewState; event: AuditEvent; reopenTo?: ReopenState };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'reset':
      return { records: action.records, acted: new Set() };
    case 'review':
      return {
        // O histórico de auditoria só cresce: nenhum evento é editado ou apagado.
        records: state.records.map((r) => (r.id === action.id
          ? { ...r, review: action.review, reopenTo: action.reopenTo ?? r.reopenTo, audit: [...r.audit, action.event] }
          : r)),
        acted: new Set(state.acted).add(action.id),
      };
    default:
      return state;
  }
}

/** Estado e ações simuladas do Módulo 6 (sem base de dados nem notificações reais). */
export function useApprovalsModule({ createRecords, viewer, now }: { createRecords: () => WorkRecord[]; viewer: Viewer; now: string }) {
  const [state, dispatch] = useReducer(reducer, null, () => ({ records: createRecords(), acted: new Set<string>() }));
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const event = useCallback((action: string, note: string, tone: AuditEvent['tone'], icon: AuditEvent['icon']): AuditEvent => (
    { at: now, who: viewer.name, role: viewer.role, action, note, tone, icon }
  ), [now, viewer]);

  /** Só a administradora e a gestora podem validar; devolve o registo afetado. */
  const guard = useCallback((id: string, allowed: (r: WorkRecord) => boolean): WorkRecord | null => {
    const r = stateRef.current.records.find((x) => x.id === id);
    return viewer.canReview && r && allowed(r) ? r : null;
  }, [viewer]);

  const approve = useCallback((id: string): WorkRecord | null => {
    const r = guard(id, (x) => x.review === 'pending');
    if (r) dispatch({ type: 'review', id, review: 'approved', event: event('Conclusão aprovada', '', 'ok', 'checkCircle') });
    return r;
  }, [guard, event]);

  const requestCorrection = useCallback((id: string, message: string): WorkRecord | null => {
    const r = guard(id, (x) => x.review === 'pending');
    if (r && message.trim()) dispatch({ type: 'review', id, review: 'correction', event: event('Correção pedida', message.trim(), 'warn', 'edit') });
    return r;
  }, [guard, event]);

  const reopen = useCallback((id: string, to: ReopenState, reason: string): WorkRecord | null => {
    const r = guard(id, (x) => x.review !== 'reopened');
    if (r && reason.trim()) dispatch({ type: 'review', id, review: 'reopened', reopenTo: to, event: event(`Reaberta · novo estado: ${to}`, reason.trim(), 'vio', 'sync') });
    return r;
  }, [guard, event]);

  const reset = useCallback(() => {
    dispatch({ type: 'reset', records: createRecords() });
    notify('Dados de demonstração repostos.');
  }, [createRecords, notify]);

  return {
    records: state.records,
    acted: state.acted,
    toast,
    dismissToast,
    actions: { notify, approve, requestCorrection, reopen, reset },
  };
}

export type ApprovalsActions = ReturnType<typeof useApprovalsModule>['actions'];
