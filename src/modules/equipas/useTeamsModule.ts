import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { absenceDuration, isUpcoming, nowHHMM } from './format';
import { createDemoData, DEMO_TODAY } from './mockData';
import type {
  Absence,
  AbsenceDraft,
  AbsenceStatus,
  AccessStatus,
  NewPersonInput,
  Person,
  PersonEditInput,
  TeamDraft,
  TeamsData,
} from './types';
import { parseRate } from './validation';

/* ------------------------------------------------------------------ */
/* Reducer — todas as regras de negócio que alteram dados              */
/* ------------------------------------------------------------------ */

type Action =
  | { type: 'reset'; data: TeamsData }
  | { type: 'addPerson'; person: Person }
  | { type: 'updatePerson'; id: string; input: PersonEditInput }
  | { type: 'setAccess'; id: string; access: AccessStatus; sentAt?: string }
  | { type: 'archivePerson'; id: string }
  | { type: 'restorePerson'; id: string }
  | { type: 'deletePerson'; id: string }
  | { type: 'saveTeam'; id: string; isNew: boolean; draft: TeamDraft }
  | { type: 'archiveTeam'; id: string }
  | { type: 'addAbsence'; absence: Absence }
  | { type: 'setAbsenceStatus'; id: string; status: AbsenceStatus }
  | { type: 'cancelAbsence'; id: string };

const clearLead = (data: TeamsData, personId: string): TeamsData['teams'] =>
  data.teams.map((t) => (t.leadId === personId ? { ...t, leadId: null } : t));

const patchPerson = (data: TeamsData, id: string, patch: Partial<Person>): TeamsData['people'] =>
  data.people.map((p) => (p.id === id ? { ...p, ...patch } : p));

function reducer(data: TeamsData, action: Action): TeamsData {
  switch (action.type) {
    case 'reset':
      return action.data;

    case 'addPerson':
      return { ...data, people: [...data.people, action.person] };

    case 'updatePerson': {
      const current = data.people.find((p) => p.id === action.id);
      if (!current) return data;
      const teamId = action.input.teamId || null;
      // Quem muda de equipa deixa de ser responsável da anterior.
      const teams = teamId !== current.teamId ? clearLead(data, current.id) : data.teams;
      return {
        ...data,
        teams,
        people: patchPerson(data, action.id, {
          name: action.input.name.trim(),
          email: action.input.email.trim(),
          phone: action.input.phone.trim(),
          role: current.role === 'admin' ? 'admin' : action.input.role,
          teamId,
          hourlyRate: parseRate(action.input.hourlyRate),
        }),
      };
    }

    case 'setAccess':
      return {
        ...data,
        people: patchPerson(data, action.id, {
          access: action.access,
          ...(action.sentAt ? { sentAt: action.sentAt } : {}),
        }),
      };

    case 'archivePerson':
      // Arquivar preserva o histórico; o acesso fica suspenso.
      return {
        ...data,
        teams: clearLead(data, action.id),
        people: patchPerson(data, action.id, { archived: true, access: 'suspended' }),
      };

    case 'restorePerson':
      return { ...data, people: patchPerson(data, action.id, { archived: false }) };

    case 'deletePerson': {
      const target = data.people.find((p) => p.id === action.id);
      // Regra: só se elimina quem não tem histórico operacional.
      if (!target || target.role === 'admin' || target.completedJobs > 0) return data;
      return {
        ...data,
        teams: clearLead(data, action.id),
        people: data.people.filter((p) => p.id !== action.id),
        absences: data.absences.filter((a) => a.personId !== action.id),
      };
    }

    case 'saveTeam': {
      const { id, draft } = action;
      const team = {
        id,
        name: draft.name.trim(),
        leadId: draft.leadId && draft.memberIds.includes(draft.leadId) ? draft.leadId : null,
        zones: draft.zones,
        clientIds: draft.clientIds,
        accommodationIds: draft.accommodationIds,
      };
      const movedIn = new Set(draft.memberIds);

      // Quem entra vindo de outra equipa deixa de ser responsável dessa equipa.
      const teams = data.teams.map((t) => {
        if (t.id === id) return team;
        return t.leadId && movedIn.has(t.leadId) ? { ...t, leadId: null } : t;
      });

      return {
        ...data,
        teams: action.isNew ? [...teams, team] : teams,
        people: data.people.map((p) => {
          if (movedIn.has(p.id)) return p.teamId === id ? p : { ...p, teamId: id };
          return p.teamId === id ? { ...p, teamId: null } : p;
        }),
        // Cada alojamento tem no máximo uma equipa por defeito.
        accommodations: data.accommodations.map((a) => {
          const isDefaultHere = draft.defaultAccommodationIds.includes(a.id) && draft.accommodationIds.includes(a.id);
          if (isDefaultHere) return a.defaultTeamId === id ? a : { ...a, defaultTeamId: id };
          return a.defaultTeamId === id ? { ...a, defaultTeamId: null } : a;
        }),
      };
    }

    case 'archiveTeam':
      return {
        ...data,
        teams: data.teams.filter((t) => t.id !== action.id),
        people: data.people.map((p) => (p.teamId === action.id ? { ...p, teamId: null } : p)),
        accommodations: data.accommodations.map((a) => (a.defaultTeamId === action.id ? { ...a, defaultTeamId: null } : a)),
      };

    case 'addAbsence':
      return { ...data, absences: [...data.absences, action.absence] };

    case 'setAbsenceStatus':
      return {
        ...data,
        absences: data.absences.map((a) => (a.id === action.id ? { ...a, status: action.status } : a)),
      };

    case 'cancelAbsence':
      return { ...data, absences: data.absences.filter((a) => a.id !== action.id) };

    default:
      return data;
  }
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export interface Toast {
  id: number;
  message: string;
}

interface Options {
  initialData?: TeamsData;
  /** Data de referência para "próximas" vs "anteriores". */
  today?: string;
  /** Duração do envio simulado de acesso (ms). */
  sendDelayMs?: number;
}

const newId = (prefix: string): string =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Estado, regras de negócio e ações simuladas do Módulo 2.
 * Mantém os componentes de apresentação livres de lógica.
 */
export function useTeamsModule({ initialData, today = DEMO_TODAY, sendDelayMs = 1000 }: Options = {}) {
  const [data, dispatch] = useReducer(reducer, initialData ?? null, (d) => d ?? createDemoData());
  const [sendingIds, setSendingIds] = useState<string[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const dataRef = useRef(data);
  dataRef.current = data;
  const findPerson = (id: string) => dataRef.current.people.find((p) => p.id === id);

  /* ---- colaboradores ---- */

  const addPerson = useCallback((input: NewPersonInput): string => {
    const person: Person = {
      id: newId('p'),
      name: input.name.trim(),
      email: input.email.trim(),
      phone: '',
      role: input.role,
      teamId: input.teamId || null,
      access: 'none',
      hourlyRate: parseRate(input.hourlyRate),
      completedJobs: 0,
      since: today,
      archived: false,
      sentAt: null,
    };
    dispatch({ type: 'addPerson', person });
    return person.id;
  }, [today]);

  const updatePerson = useCallback((id: string, input: PersonEditInput) => {
    dispatch({ type: 'updatePerson', id, input });
    notify(`Dados de ${input.name.trim()} atualizados.`);
  }, [notify]);

  /**
   * Envio simulado. Não envia email: após um atraso marca "Acesso enviado".
   * Um email que contenha "falha" simula "Falha no envio".
   */
  const sendAccess = useCallback((id: string) => {
    const person = findPerson(id);
    if (!person) return;
    setSendingIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    const timer = window.setTimeout(() => {
      setSendingIds((ids) => ids.filter((x) => x !== id));
      if (/falha/i.test(person.email)) {
        dispatch({ type: 'setAccess', id, access: 'failed' });
        notify(`Não foi possível enviar o email para ${person.email}.`);
        return;
      }
      dispatch({ type: 'setAccess', id, access: 'sent', sentAt: nowHHMM() });
      notify(`Acesso enviado para ${person.email} (simulação).`);
    }, sendDelayMs);
    timers.current.push(timer);
  }, [notify, sendDelayMs]);

  const suspendAccess = useCallback((id: string) => {
    dispatch({ type: 'setAccess', id, access: 'suspended' });
    notify(`Acesso de ${findPerson(id)?.name ?? ''} suspenso.`);
  }, [notify]);

  const reactivateAccess = useCallback((id: string) => {
    dispatch({ type: 'setAccess', id, access: 'active' });
    notify(`Acesso de ${findPerson(id)?.name ?? ''} reativado.`);
  }, [notify]);

  /** Apenas para a pré-visualização: simula a pessoa a ativar a conta ou falha. */
  const simulateAccess = useCallback((id: string, access: Extract<AccessStatus, 'active' | 'failed'>) => {
    dispatch({ type: 'setAccess', id, access });
    notify(access === 'active' ? `${findPerson(id)?.name ?? ''} ativou a conta (simulação).` : 'Falha no envio simulada.');
  }, [notify]);

  const archivePerson = useCallback((id: string) => {
    dispatch({ type: 'archivePerson', id });
    notify(`${findPerson(id)?.name ?? ''} arquivado. Registos preservados.`);
  }, [notify]);

  const restorePerson = useCallback((id: string) => {
    dispatch({ type: 'restorePerson', id });
    notify(`${findPerson(id)?.name ?? ''} restaurado. O acesso continua suspenso.`);
  }, [notify]);

  const deletePerson = useCallback((id: string) => {
    const name = findPerson(id)?.name ?? '';
    dispatch({ type: 'deletePerson', id });
    notify(`${name} eliminado.`);
  }, [notify]);

  /* ---- equipas ---- */

  /** Cria (teamId null) ou atualiza uma equipa. Devolve o id. */
  const saveTeam = useCallback((teamId: string | null, draft: TeamDraft): string => {
    const id = teamId ?? newId('t');
    dispatch({ type: 'saveTeam', id, isNew: !teamId, draft });
    notify(teamId ? `${draft.name.trim()} atualizada.` : `${draft.name.trim()} criada.`);
    return id;
  }, [notify]);

  const archiveTeam = useCallback((id: string) => {
    const name = dataRef.current.teams.find((t) => t.id === id)?.name ?? '';
    dispatch({ type: 'archiveTeam', id });
    notify(`${name} arquivada.`);
  }, [notify]);

  /* ---- ausências ---- */

  const addAbsence = useCallback((draft: AbsenceDraft) => {
    const absence: Absence = {
      id: newId('a'),
      ...draft,
      from: draft.allDay ? '' : draft.from,
      to: draft.allDay ? '' : draft.to,
      note: draft.note.trim(),
    };
    dispatch({ type: 'addAbsence', absence });
    const past = !isUpcoming(absence, today);
    notify(`Ausência registada: ${findPerson(draft.personId)?.name ?? ''} · ${absenceDuration(absence)}${past ? ' (histórico)' : ''}.`);
  }, [notify, today]);

  const setAbsenceStatus = useCallback((id: string, status: AbsenceStatus) => {
    const absence = dataRef.current.absences.find((a) => a.id === id);
    dispatch({ type: 'setAbsenceStatus', id, status });
    const name = absence ? findPerson(absence.personId)?.name ?? '' : '';
    notify(`Ausência de ${name} ${status === 'approved' ? 'aprovada' : 'recusada'}.`);
  }, [notify]);

  const cancelAbsence = useCallback((id: string) => {
    dispatch({ type: 'cancelAbsence', id });
    notify('Ausência cancelada.');
  }, [notify]);

  const reset = useCallback(() => {
    dispatch({ type: 'reset', data: initialData ?? createDemoData() });
    notify('Dados de demonstração repostos.');
  }, [initialData, notify]);

  /* ---- resumo ---- */

  const stats = useMemo(() => {
    const active = data.people.filter((p) => !p.archived);
    const upcoming = data.absences.filter((a) => isUpcoming(a, today) && a.status !== 'rejected');
    return {
      activePeople: active.length,
      withActiveAccess: active.filter((p) => p.access === 'active').length,
      awaitingAccess: active.filter((p) => p.access === 'sent' || p.access === 'none' || p.access === 'failed').length,
      withoutTeam: active.filter((p) => p.role === 'collab' && !p.teamId).length,
      teams: data.teams.length,
      upcomingAbsences: upcoming.length,
      pendingAbsences: upcoming.filter((a) => a.status === 'pending').length,
    };
  }, [data, today]);

  return {
    data,
    today,
    stats,
    sendingIds,
    toast,
    dismissToast,
    actions: {
      notify,
      addPerson,
      updatePerson,
      sendAccess,
      suspendAccess,
      reactivateAccess,
      simulateAccess,
      archivePerson,
      restorePerson,
      deletePerson,
      saveTeam,
      archiveTeam,
      addAbsence,
      setAbsenceStatus,
      cancelAbsence,
      reset,
    },
  };
}

export type TeamsModuleActions = ReturnType<typeof useTeamsModule>['actions'];
