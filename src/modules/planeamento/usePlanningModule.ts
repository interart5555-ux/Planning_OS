import { useCallback, useReducer, useRef, useState } from 'react';
import { createDemoPlanning } from './mockData';
import { coverLongestHours, isMovable, moveAssignment, resizeAssignment } from './rules';
import type { Job, PlanningData } from './types';

type Action =
  | { type: 'reset'; data: PlanningData }
  | { type: 'saveJob'; job: Job }
  | { type: 'removeJob'; id: string }
  | { type: 'publish' }
  | { type: 'confirmRead'; id: string };

function reducer(data: PlanningData, action: Action): PlanningData {
  switch (action.type) {
    case 'reset':
      return action.data;
    case 'saveJob':
      return { ...data, jobs: data.jobs.map((j) => (j.id === action.job.id ? action.job : j)) };
    case 'removeJob': {
      const target = data.jobs.find((j) => j.id === action.id);
      // Regra: só trabalhos manuais podem ser eliminados; os do iCal não.
      if (!target || target.source !== 'manual') return data;
      return { ...data, jobs: data.jobs.filter((j) => j.id !== action.id) };
    }
    case 'publish':
      return { ...data, jobs: data.jobs.map((j) => (j.status === 'unpublished' ? { ...j, status: 'planned' } : j)) };
    case 'confirmRead':
      return { ...data, jobs: data.jobs.map((j) => (j.id === action.id && j.status === 'planned' ? { ...j, status: 'confirmed' } : j)) };
    default:
      return data;
  }
}

/** Estado e ações simuladas do Módulo 4. */
export function usePlanningModule({ initialData }: { initialData?: PlanningData } = {}) {
  const [data, dispatch] = useReducer(reducer, initialData ?? null, (d) => d ?? createDemoPlanning());
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  /** Grava uma nova versão; qualquer alteração fica "Por publicar". Devolve-a (ou null se nada mudou). */
  const commit = useCallback((next: Job): Job | null => {
    const current = dataRef.current.jobs.find((j) => j.id === next.id);
    if (!current || JSON.stringify(current) === JSON.stringify(next)) return null;
    const saved: Job = { ...next, status: 'unpublished' };
    dispatch({ type: 'saveJob', job: saved });
    return saved;
  }, []);

  /** Guarda a atribuição do painel (o fim acompanha a pessoa com mais horas). Devolve se houve alteração. */
  const saveAssignment = useCallback((draft: Job): boolean => Boolean(commit(coverLongestHours(draft))), [commit]);

  /** Volta a colocar em "Por atribuir". */
  const unassign = useCallback((draft: Job) => {
    dispatch({ type: 'saveJob', job: { ...draft, assignees: [], status: 'unpublished' } });
  }, []);

  /** Arrastar: larga numa pessoa, com novo início e (se permitido) novo dia. */
  const moveJob = useCallback((jobId: string, fromPersonId: string | null, toPersonId: string, start: number, date?: string): Job | null => {
    const job = dataRef.current.jobs.find((j) => j.id === jobId);
    if (!job || !isMovable(job)) return null;
    return commit(moveAssignment(job, fromPersonId, toPersonId, start, date));
  }, [commit]);

  /** Pega direita do cartão: novas horas da pessoa. */
  const resizeJob = useCallback((jobId: string, personId: string, hours: number): Job | null => {
    const job = dataRef.current.jobs.find((j) => j.id === jobId);
    if (!job || !isMovable(job)) return null;
    return commit(resizeAssignment(job, personId, hours));
  }, [commit]);

  const removeJob = useCallback((id: string) => dispatch({ type: 'removeJob', id }), []);

  const publish = useCallback((): number => {
    const n = dataRef.current.jobs.filter((j) => j.status === 'unpublished').length;
    dispatch({ type: 'publish' });
    return n;
  }, []);

  const confirmRead = useCallback((id: string) => dispatch({ type: 'confirmRead', id }), []);

  const reset = useCallback(() => {
    dispatch({ type: 'reset', data: initialData ?? createDemoPlanning() });
    notify('Dados de demonstração repostos.');
  }, [initialData, notify]);

  return {
    data,
    toast,
    dismissToast,
    actions: { notify, saveAssignment, unassign, moveJob, resizeJob, removeJob, publish, confirmRead, reset },
  };
}

export type PlanningActions = ReturnType<typeof usePlanningModule>['actions'];
