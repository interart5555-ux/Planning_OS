import { minutesOf, normalize } from './format';
import type {
  Absence,
  AbsenceDraft,
  FieldErrors,
  NewPersonInput,
  Person,
  PersonEditInput,
  Team,
} from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RATE_RE = /^\d{1,3}([.,]\d{1,2})?$/;

/** "8,50" → 8.5; vazio → null. Assume texto já validado. */
export const parseRate = (value: string): number | null =>
  value.trim() ? Number.parseFloat(value.trim().replace(',', '.')) : null;

type PersonFields = Pick<NewPersonInput & PersonEditInput, 'name' | 'email' | 'hourlyRate'>;

/** Valida nome, email (único na empresa) e valor/hora opcional. */
export function validatePerson(
  input: PersonFields,
  people: Person[],
  selfId?: string,
): FieldErrors<'name' | 'email' | 'hourlyRate'> {
  const errors: FieldErrors<'name' | 'email' | 'hourlyRate'> = {};
  const name = input.name.trim();
  const email = input.email.trim();

  if (!name) errors.name = 'Indica o nome completo.';
  else if (name.split(/\s+/).length < 2) errors.name = 'Indica nome e apelido.';

  if (!email) errors.email = 'Indica o email — é usado para enviar o acesso.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Email inválido. Ex.: nome@email.pt';
  else if (people.some((p) => p.id !== selfId && p.email.toLowerCase() === email.toLowerCase())) {
    errors.email = 'Já existe alguém com este email.';
  }

  if (input.hourlyRate.trim() && !RATE_RE.test(input.hourlyRate.trim())) {
    errors.hourlyRate = 'Valor inválido. Ex.: 8,50';
  }
  return errors;
}

export function validateTeamName(name: string, teams: Team[], selfId?: string): string | undefined {
  const value = name.trim();
  if (!value) return 'Indica o nome da equipa.';
  if (teams.some((t) => t.id !== selfId && normalize(t.name) === normalize(value))) {
    return 'Já existe uma equipa com este nome.';
  }
  return undefined;
}

type AbsenceField = 'personId' | 'start' | 'end' | 'from' | 'to';

/**
 * Regras: data de fim ≥ início; se não for dia inteiro, as horas são
 * obrigatórias e a hora de fim tem de ser posterior à de início.
 */
export function validateAbsence(draft: AbsenceDraft): FieldErrors<AbsenceField> {
  const errors: FieldErrors<AbsenceField> = {};
  if (!draft.personId) errors.personId = 'Escolhe o colaborador.';
  if (!draft.start) errors.start = 'Indica a data de início.';
  if (!draft.end) errors.end = 'Indica a data de fim.';
  else if (draft.start && draft.end < draft.start) errors.end = 'A data de fim não pode ser anterior ao início.';

  if (!draft.allDay) {
    if (!draft.from) errors.from = 'Indica a hora de início.';
    if (!draft.to) errors.to = 'Indica a hora de fim.';
    else if (draft.from && minutesOf(draft.to) <= minutesOf(draft.from)) {
      errors.to = 'A hora de fim tem de ser depois do início.';
    }
  }
  return errors;
}

/** Período completo o suficiente para calcular duração. */
export const hasValidPeriod = (draft: AbsenceDraft): boolean =>
  Object.keys(validateAbsence({ ...draft, personId: draft.personId || '-' })).length === 0;

/**
 * Primeira ausência (não recusada) da mesma pessoa que se sobrepõe ao
 * rascunho. Duas ausências parciais só colidem se as horas se cruzarem.
 * Não bloqueia o registo — serve apenas de aviso.
 */
export function findOverlap(draft: AbsenceDraft, absences: Absence[]): Absence | undefined {
  return absences.find((a) => {
    if (a.personId !== draft.personId || a.status === 'rejected') return false;
    if (a.end < draft.start || a.start > draft.end) return false;
    if (!a.allDay && !draft.allDay) {
      return minutesOf(a.from) < minutesOf(draft.to) && minutesOf(draft.from) < minutesOf(a.to);
    }
    return true;
  });
}

/** Com histórico operacional só é possível arquivar. */
export const canDeletePerson = (person: Person): boolean =>
  person.role !== 'admin' && person.completedJobs === 0;
