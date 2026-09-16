import type { IsoDate, IsoDateTime } from './types';

export const MON3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
export const dayOf = (iso: IsoDateTime): IsoDate => iso.slice(0, 10);
export const timeOf = (iso: IsoDateTime): string => iso.slice(11, 16);

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase();
}

/** "Hoje", "Ontem" ou "12 mar". */
export function dayLabel(iso: IsoDateTime, today: IsoDate, yesterday: IsoDate): string {
  const d = dayOf(iso);
  if (d === today) return 'Hoje';
  if (d === yesterday) return 'Ontem';
  return `${Number(d.slice(8, 10))} ${MON3[Number(d.slice(5, 7)) - 1]}`;
}
/** Hora nas mensagens de hoje; dia nas mais antigas. */
export const shortWhen = (iso: IsoDateTime, today: IsoDate, yesterday: IsoDate): string =>
  (dayOf(iso) === today ? timeOf(iso) : dayLabel(iso, today, yesterday));
export const fullWhen = (iso: IsoDateTime, today: IsoDate, yesterday: IsoDate): string => `${dayLabel(iso, today, yesterday)}, ${timeOf(iso)}`;

export const longDate = (iso: IsoDate): string => {
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const WEEK = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const d = new Date(`${iso}T12:00:00`);
  const week = WEEK[d.getDay()];
  return `${week.charAt(0).toUpperCase()}${week.slice(1)}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
};
