import type { Tone } from '../shared/ui';
import type {
  BillingPeriod,
  CalendarPlatform,
  CalendarStatus,
  ClientStatus,
  LaundryItem,
  LaundryQty,
  LocationStatus,
  PaymentStatus,
  UnitCalendar,
  UnitStatus,
} from './types';

export const CLIENT_STATUS: Record<ClientStatus, { tone: Tone; label: string }> = {
  active: { tone: 'ok', label: 'Ativo' },
  paused: { tone: 'warn', label: 'Pausado' },
  inactive: { tone: 'dark', label: 'Inativo' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { tone: Tone; label: string }> = {
  ok: { tone: 'ok', label: 'Em dia' },
  pending: { tone: 'warn', label: 'Pendente' },
  late: { tone: 'bad', label: 'Em atraso' },
};

export const LOCATION_STATUS: Record<LocationStatus, { tone: Tone; label: string }> = {
  active: { tone: 'ok', label: 'Ativo' },
  paused: { tone: 'warn', label: 'Pausado' },
};

export const UNIT_STATUS: Record<UnitStatus, { tone: Tone; label: string }> = {
  active: { tone: 'ok', label: 'Ativa' },
  inactive: { tone: 'dark', label: 'Inativa' },
};

export const CALENDAR_STATUS: Record<CalendarStatus, { tone: Tone; label: string }> = {
  connected: { tone: 'ok', label: 'Ligado' },
  error: { tone: 'bad', label: 'Erro na ligação' },
  none: { tone: 'dark', label: 'Não sincronizado' },
};

export const BILLING_PERIODS: BillingPeriod[] = ['Semanal', 'Quinzenal', 'Mensal', 'Por serviço'];
export const CALENDAR_PLATFORMS: CalendarPlatform[] = ['Airbnb', 'Booking.com', 'Vrbo', 'Outro'];

export const LAUNDRY_ITEMS: Array<[LaundryItem, string]> = [
  ['lencol', 'Lençol baixo'],
  ['edredon', 'Capa de edredon'],
  ['fronhas', 'Fronhas'],
  ['banho', 'Toalhas de banho'],
  ['rosto', 'Toalhas de rosto'],
];

export const DEFAULT_LAUNDRY: LaundryQty = { lencol: 2, edredon: 2, fronhas: 4, banho: 2, rosto: 2 };

export const laundryTotal = (qty: LaundryQty | null): number =>
  qty ? LAUNDRY_ITEMS.reduce((sum, [k]) => sum + (qty[k] || 0), 0) : 0;

export const formatEuro = (value: number | null): string =>
  value == null ? '—' : `${value.toFixed(2).replace('.', ',')} €`;

/** Valor para inputs: 18 → "18,00". */
export const rateToInput = (value: number | null): string =>
  value == null ? '' : value.toFixed(2).replace('.', ',');

export const formatNif = (nif: string): string =>
  nif.length === 9 ? `${nif.slice(0, 3)} ${nif.slice(3, 6)} ${nif.slice(6)}` : nif;

/** Localidade a partir de "…, 4050-521 Porto". */
export const cityOf = (address: string): string => /\d{4}-\d{3}\s+(.+)$/.exec(address)?.[1].trim() ?? '';

export const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const plural = (n: number, singular: string, pluralForm: string): string => `${n} ${n === 1 ? singular : pluralForm}`;

export const hasUrl = (c: UnitCalendar): boolean => c.url.trim().length > 0;

export function calendarStatus(c: UnitCalendar): { tone: Tone; label: string } {
  return hasUrl(c) ? CALENDAR_STATUS[c.status] : { tone: 'dark', label: 'Sem URL' };
}

export const nowLabel = (): string => {
  const d = new Date();
  return `Hoje, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
