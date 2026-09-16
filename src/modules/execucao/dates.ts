const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const pad = (n: number): string => String(n).padStart(2, '0');
const parse = (iso: string): Date => new Date(`${iso}T00:00:00`);
const toIso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const minutesOf = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
export const timeOf = (minutes: number): string => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** Segunda a domingo da semana da data. */
export function weekDays(iso: string): string[] {
  const d = parse(iso);
  const monday = addDays(iso, -((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** "sexta-feira, 13 de março" */
export function formatDay(iso: string): string {
  const d = parse(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}
export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
export const weekdayShort = (iso: string): string => WEEKDAYS_SHORT[parse(iso).getDay()];
export const dayNumber = (iso: string): number => parse(iso).getDate();

/** "2h", "1h30" */
export function durationShort(start: string, end: string): string {
  const m = minutesOf(end) - minutesOf(start);
  const h = Math.floor(m / 60);
  return h ? `${h}h${m % 60 ? pad(m % 60) : ''}` : `${m}min`;
}
/** "2h", "1h 30min" */
export function durationLong(start: string, end: string): string {
  const m = minutesOf(end) - minutesOf(start);
  const h = Math.floor(m / 60);
  return h ? `${h}h${m % 60 ? ` ${pad(m % 60)}min` : ''}` : `${m} min`;
}
export const totalHours = (minutes: number): string => `${Math.floor(minutes / 60)}h${minutes % 60 ? pad(minutes % 60) : ''}`;

/** Cronómetro "00:42:15". */
export function stopwatch(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
