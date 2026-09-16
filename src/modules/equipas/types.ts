/**
 * Módulo 2 — Equipas
 * Modelo de dados e contratos partilhados.
 *
 * Nesta fase os dados vivem apenas em memória (simulação visual):
 * sem base de dados, autenticação real nem envio de emails.
 */

/**
 * Como a empresa distribui responsabilidades (vem do Módulo 1).
 * - `micro`: a administradora também é gestora e tem todas as permissões.
 * - `separate`: administradora e gestora são pessoas distintas.
 */
export type CompanyMode = 'micro' | 'separate';

export type PersonRole = 'admin' | 'manager' | 'collab';

/** Estado do acesso à aplicação. */
export type AccessStatus = 'active' | 'sent' | 'none' | 'suspended' | 'failed';

export interface Person {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: PersonRole;
  teamId: string | null;
  access: AccessStatus;
  /** Valor/hora em euros; opcional. */
  hourlyRate: number | null;
  /**
   * Limpezas concluídas. Com histórico (> 0) a pessoa só pode ser
   * arquivada; sem histórico pode ser eliminada.
   */
  completedJobs: number;
  /** Data de entrada (YYYY-MM-DD). */
  since: string;
  archived: boolean;
  /** Hora (HH:MM) do último envio de acesso simulado. */
  sentAt: string | null;
}

export interface Team {
  id: string;
  name: string;
  /** Responsável; tem de pertencer à equipa. */
  leadId: string | null;
  zones: string[];
  clientIds: string[];
  accommodationIds: string[];
}

export interface Client {
  id: string;
  name: string;
}

export interface Accommodation {
  id: string;
  name: string;
  zone: string;
  /** Equipa sugerida automaticamente no Planeamento. Uma por alojamento. */
  defaultTeamId: string | null;
}

export type AbsenceType =
  | 'ferias'
  | 'folga'
  | 'indisponibilidade'
  | 'formacao'
  | 'consulta'
  | 'baixa';

export type AbsenceStatus = 'pending' | 'approved' | 'rejected';

/**
 * Ausência de dia inteiro, de vários dias ou parcial (por horas).
 * Numa fase seguinte bloqueia atribuições incompatíveis no Planeamento.
 */
export interface Absence {
  id: string;
  personId: string;
  type: AbsenceType;
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD, igual ou posterior a `start`. */
  end: string;
  allDay: boolean;
  /** HH:MM — vazio quando `allDay`. */
  from: string;
  /** HH:MM — vazio quando `allDay`. */
  to: string;
  status: AbsenceStatus;
  note: string;
}

export interface TeamsData {
  people: Person[];
  teams: Team[];
  clients: Client[];
  accommodations: Accommodation[];
  absences: Absence[];
}

/** Formulário "Adicionar colaborador". */
export interface NewPersonInput {
  name: string;
  email: string;
  role: Exclude<PersonRole, 'admin'>;
  teamId: string;
  /** Texto livre ("8,50"); vazio = sem valor/hora. */
  hourlyRate: string;
}

/** Formulário de edição na ficha do colaborador. */
export interface PersonEditInput {
  name: string;
  email: string;
  phone: string;
  role: PersonRole;
  teamId: string;
  hourlyRate: string;
}

/** Rascunho do detalhe de equipa; só é aplicado ao guardar. */
export interface TeamDraft {
  name: string;
  leadId: string;
  memberIds: string[];
  zones: string[];
  clientIds: string[];
  accommodationIds: string[];
  /** Alojamentos em que esta equipa passa a ser a equipa por defeito. */
  defaultAccommodationIds: string[];
}

/** Formulário "Registar ausência". */
export interface AbsenceDraft {
  personId: string;
  type: AbsenceType;
  start: string;
  end: string;
  allDay: boolean;
  from: string;
  to: string;
  status: Exclude<AbsenceStatus, 'rejected'>;
  note: string;
}

export type TeamsTab = 'colab' | 'teams' | 'abs';

/** Erros por campo. Chave ausente = campo válido. */
export type FieldErrors<K extends string> = Partial<Record<K, string>>;
