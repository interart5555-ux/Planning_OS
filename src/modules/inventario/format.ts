import type { IsoDate, IsoDateTime, MeasureUnit } from './types';

export const MON3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const pad = (n: number) => String(n).padStart(2, '0');

export const group = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
export const round2 = (n: number): number => Math.round(n * 100) / 100;
export const pct = (n: number): string => `${Math.round(n)}%`;

/** "€ 1.924,30" com espaço inseparável. */
export function eur2(n: number): string {
  const v = round2(n);
  const [int, dec] = Math.abs(v).toFixed(2).split('.');
  return `${v < 0 ? '−' : ''}€ ${group(Number(int))},${dec}`;
}
export function dec2(n: number): string {
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  return `${group(Number(int))},${dec}`;
}
export const signed = (n: number): string => `${n > 0 ? '+' : n < 0 ? '−' : ''}${group(Math.abs(n))}`;

/** Aceita "1.234,5", "1234.5", "€ 3,10". */
export function parseNum(s: string): number {
  let t = String(s ?? '').trim().replace(/\s|€/g, '');
  if (!t) return NaN;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  return Number(t);
}
export const isInt = (n: number): boolean => Number.isInteger(n);

export const unitLabel = (unit: MeasureUnit, n: number): string => (unit === 'rolo' && n !== 1 ? 'rolos' : unit);
export const qtyUnit = (n: number, unit: MeasureUnit): string => `${group(n)} ${unitLabel(unit, n)}`;

export const fmtDate = (iso: IsoDate): string => `${Number(iso.slice(8, 10))} ${MON3[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
export const fmtShort = (iso: IsoDate | IsoDateTime): string => `${Number(iso.slice(8, 10))} ${MON3[Number(iso.slice(5, 7)) - 1]}`;
export const fmtDateTime = (iso: IsoDateTime): string => `${fmtDate(iso)}, ${iso.slice(11, 16)}`;
export const fmtShortTime = (iso: IsoDateTime): string => `${fmtShort(iso)}, ${iso.slice(11, 16)}`;

export function isoAdd(iso: IsoDate, days: number): IsoDate {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
