import type { Stamp } from './types';

const MON3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const pad = (n: number): string => String(n).padStart(2, '0');
export const plural = (n: number, singular: string, pluralForm: string): string => `${n} ${n === 1 ? singular : pluralForm}`;
export const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

const toDate = (s: string): Date => new Date(s.length === 10 ? `${s}T00:00:00` : `${s.replace(' ', 'T')}:00`);

export const dayOf = (s: Stamp): string => s.slice(0, 10);
export const timeOf = (s: Stamp): string => s.slice(11, 16);

export function addDays(iso: string, n: number): string {
  const d = toDate(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Hora "HH:MM" n minutos depois do carimbo. */
export function addMinutes(s: Stamp, n: number): string {
  const d = toDate(s);
  d.setMinutes(d.getMinutes() + n);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "13 mar 2026" */
export function formatDate(s: string): string {
  const d = toDate(dayOf(s));
  return `${d.getDate()} ${MON3[d.getMonth()]} ${d.getFullYear()}`;
}

/** "13 mar" */
export function formatShort(s: string): string {
  const d = toDate(dayOf(s));
  return `${d.getDate()} ${MON3[d.getMonth()]}`;
}

/** "Hoje", "Ontem" ou "11 mar". */
export function relativeDay(s: Stamp, today: string): string {
  const day = dayOf(s);
  if (day === today) return 'Hoje';
  if (day === addDays(today, -1)) return 'Ontem';
  return formatShort(s);
}

/** "13 mar 2026, 10:24" */
export const formatStamp = (s: Stamp): string => `${formatDate(s)}, ${timeOf(s)}`;

export const minutesBetween = (a: Stamp, b: Stamp): number => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 60000);

/** "2h 12m" ou "45 min" */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  return h ? `${h}h ${pad(min % 60)}m` : `${min} min`;
}

export const daysAgo = (s: Stamp, today: string): number => Math.round((toDate(today).getTime() - toDate(dayOf(s)).getTime()) / 86400000);
