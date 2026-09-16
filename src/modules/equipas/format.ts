import type {
  AbsenceStatus,
  AbsenceType,
  AccessStatus,
  CompanyMode,
  Person,
  Team,
} from './types';
import { initials, type Tone } from '../shared/ui';

/* ------------------------------------------------------------------ */
/* Etiquetas                                                           */
/* ------------------------------------------------------------------ */

export type { Tone };

export const ACCESS_META: Record<AccessStatus, { tone: Tone; label: string; description: string }> = {
  active: { tone: 'ok', label: 'Acesso ativo', description: 'Ativou a conta e pode entrar na aplicação.' },
  sent: { tone: 'warn', label: 'Acesso enviado', description: 'O email foi enviado e aguarda ativação.' },
  none: { tone: 'bad', label: 'Sem acesso enviado', description: 'Existe na equipa, mas ainda não recebeu acesso à aplicação.' },
  suspended: { tone: 'dark', label: 'Suspenso', description: 'O acesso à aplicação foi suspenso.' },
  failed: { tone: 'dark', label: 'Falha no envio', description: 'O envio do email falhou. Confirma o endereço e reenvia.' },
};

export const ABSENCE_TYPE_LABEL: Record<AbsenceType, string> = {
  ferias: 'Férias',
  folga: 'Folga',
  indisponibilidade: 'Indisponibilidade',
  formacao: 'Formação',
  consulta: 'Consulta médica',
  baixa: 'Baixa',
};

export const ABSENCE_STATUS_META: Record<AbsenceStatus, { tone: Tone; label: string }> = {
  pending: { tone: 'warn', label: 'Pendente' },
  approved: { tone: 'ok', label: 'Aprovada' },
  rejected: { tone: 'bad', label: 'Recusada' },
};

/* ------------------------------------------------------------------ */
/* Pessoas                                                             */
/* ------------------------------------------------------------------ */

export const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';

export { initials };

/**
 * Heurística para concordância de género em PT-PT a partir do primeiro nome
 * (Ana, Nena → feminino; João, Luís → masculino). Só afeta etiquetas.
 */
export const isFeminine = (name: string): boolean => /a$/i.test(firstName(name));

export function roleLabel(person: Pick<Person, 'name' | 'role'>, mode: CompanyMode): string {
  const f = isFeminine(person.name);
  if (person.role === 'admin') {
    if (mode === 'micro') return f ? 'Administradora / Gestora' : 'Administrador / Gestor';
    return f ? 'Administradora' : 'Administrador';
  }
  if (person.role === 'manager') return f ? 'Gestora' : 'Gestor';
  return f ? 'Colaboradora' : 'Colaborador';
}

export function teamLabel(person: Pick<Person, 'role' | 'teamId'>, teams: Team[]): string {
  const team = person.teamId ? teams.find((t) => t.id === person.teamId) : undefined;
  if (team) return team.name;
  return person.role === 'collab' ? 'Sem equipa' : 'Todas as equipas';
}

/** Colaboradoras operacionais entram com PIN; admin e gestão com credenciais. */
export const usesPin = (person: Pick<Person, 'role'>): boolean => person.role === 'collab';

export function formatRate(rate: number | null): string {
  if (rate == null) return '—';
  return `${rate.toFixed(2).replace('.', ',')} €/h`;
}

export const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ------------------------------------------------------------------ */
/* Datas (strings YYYY-MM-DD, sem fusos horários)                      */
/* ------------------------------------------------------------------ */

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const pad = (n: number): string => String(n).padStart(2, '0');
const toDate = (iso: string): Date => new Date(`${iso}T00:00:00`);
const toIso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

/** Número de dias de calendário entre duas datas, inclusive. */
export const dayCount = (start: string, end: string): number =>
  Math.round((toDate(end).getTime() - toDate(start).getTime()) / 86_400_000) + 1;

export function formatDay(iso: string, withYear = false): string {
  const d = toDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
}

/** "22 abr – 25 abr 2026" ou "15 mai 2026". */
export const formatRange = (start: string, end: string): string =>
  start === end ? formatDay(start, true) : `${formatDay(start)} – ${formatDay(end, true)}`;

/** "Amanhã, 14 abr", "Qua, 16 abr". */
export function relativeDay(iso: string, today: string): string {
  const diff = dayCount(today, iso) - 1;
  if (diff === 0) return `Hoje, ${formatDay(iso)}`;
  if (diff === 1) return `Amanhã, ${formatDay(iso)}`;
  return `${WEEKDAYS[toDate(iso).getDay()]}, ${formatDay(iso)}`;
}

export const nowHHMM = (): string => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/* ------------------------------------------------------------------ */
/* Ausências                                                           */
/* ------------------------------------------------------------------ */

export const minutesOf = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes ? `${whole} h ${pad(minutes)}` : `${whole} h`;
}

type AbsencePeriod = { start: string; end: string; allDay: boolean; from: string; to: string };

/** "4 dias", "2 h", "6 h · 3 dias". */
export function absenceDuration(a: AbsencePeriod): string {
  const days = dayCount(a.start, a.end);
  if (a.allDay) return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  const perDay = (minutesOf(a.to) - minutesOf(a.from)) / 60;
  return days > 1 ? `${formatHours(perDay * days)} · ${days} dias` : formatHours(perDay);
}

export const absenceHours = (a: AbsencePeriod): string =>
  a.allDay ? 'Dia inteiro' : `${a.from} – ${a.to}`;

/** Próxima = ainda não terminou à data de hoje. */
export const isUpcoming = (a: { end: string }, today: string): boolean => a.end >= today;
