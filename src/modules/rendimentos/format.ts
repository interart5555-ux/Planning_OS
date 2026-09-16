import type { IsoDate, MonthKey } from './types';

const MON = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MON3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const pad = (n: number): string => String(n).padStart(2, '0');
export const plural = (n: number, singular: string, pluralForm: string): string => `${n} ${n === 1 ? singular : pluralForm}`;
export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
export const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

const group = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** "€ 24.850" (espaço fixo, sem decimais). */
export function eur(n: number): string {
  const v = Math.round(n);
  return `${v < 0 ? '−' : ''}€ ${group(Math.abs(v))}`;
}

/** "€ 12,00" */
export function eur2(n: number): string {
  const v = Math.round(n * 100) / 100;
  const [int, dec] = Math.abs(v).toFixed(2).split('.');
  return `${v < 0 ? '−' : ''}€ ${group(Number(int))},${dec}`;
}

export const pct = (n: number): string => `${Math.round(n)}%`;
export const hrs = (n: number): string => `${group(Math.round(n))} h`;
export const thousands = (n: number): string => (n ? `${group(n / 1000)} k` : '0');

/** Aceita "1.234,50", "1234.5" ou "€ 99". */
export function parseEuro(s: string): number {
  const v = s.trim().replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  return v === '' || Number.isNaN(Number(v)) ? Number.NaN : Number(v);
}

export const yearOf = (mk: MonthKey): string => mk.slice(0, 4);
export const monthIdx = (mk: MonthKey): number => Number(mk.slice(5, 7)) - 1;
export const daysIn = (mk: MonthKey): number => new Date(Number(yearOf(mk)), monthIdx(mk) + 1, 0).getDate();

export function isoAdd(iso: IsoDate, n: number): IsoDate {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function prevMonth(mk: MonthKey): MonthKey {
  const y = Number(yearOf(mk));
  const m = monthIdx(mk);
  return m === 0 ? `${y - 1}-12` : `${y}-${pad(m)}`;
}

/** "Setembro 2026" */
export const monthLabel = (mk: MonthKey): string => `${cap(MON[monthIdx(mk)])} ${yearOf(mk)}`;
export const monthShort = (mk: MonthKey): string => cap(MON3[monthIdx(mk)]);

/** "15 out 2026" com ou sem zero à esquerda. */
export const formatDay = (iso: IsoDate): string => `${Number(iso.slice(8, 10))} ${MON3[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
export const formatDay2 = (iso: IsoDate): string => `${iso.slice(8, 10)} ${MON3[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** "setembro 2026" ou "15–21 set 2026". */
export function invoicePeriodLabel(from: IsoDate, to: IsoDate): string {
  const mk = from.slice(0, 7);
  if (from.slice(8) === '01' && Number(to.slice(8)) === daysIn(mk)) return `${MON[monthIdx(mk)]} ${yearOf(mk)}`;
  return `${Number(from.slice(8))}–${Number(to.slice(8))} ${MON3[monthIdx(mk)]} ${yearOf(mk)}`;
}
