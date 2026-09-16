/* Datas em strings YYYY-MM-DD e horas HH:MM, sem fusos horários. */

export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const pad = (n: number): string => String(n).padStart(2, '0');

export const toDate = (iso: string): Date => new Date(`${iso}T00:00:00`);
export const toIso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

export function addMonths(iso: string, months: number): string {
  const d = toDate(iso);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return toIso(d);
}

/** Segunda-feira da semana. */
export function weekStart(iso: string): string {
  const d = toDate(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toIso(d);
}

export const weekDays = (iso: string): string[] => Array.from({ length: 7 }, (_, i) => addDays(weekStart(iso), i));

export function formatLong(iso: string): string {
  const d = toDate(iso);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "qui., 12 mar" */
export function formatShortDay(iso: string): string {
  const d = toDate(iso);
  return `${WEEKDAYS_SHORT[d.getDay()]}., ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "quinta, 12 de março" */
export function formatWeekday(iso: string): string {
  const d = toDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export function formatWeek(iso: string): string {
  const a = toDate(weekStart(iso));
  const b = toDate(addDays(weekStart(iso), 6));
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} de ${MONTHS[a.getMonth()]} de ${a.getFullYear()}`
    : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
}

export function formatMonth(iso: string): string {
  const d = toDate(iso);
  return `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export const shortMonth = (monthIndex: number): string => MONTHS_SHORT[monthIndex];

/** 615 → "10:15". */
export const timeOf = (minutes: number): string => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 2 → "2h", 6.5 → "6h30". */
export function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const rest = Math.round((hours - whole) * 60);
  return rest ? `${whole}h${pad(rest)}` : `${whole}h`;
}

export const plural = (n: number, singular: string, pluralForm: string): string => `${n} ${n === 1 ? singular : pluralForm}`;
