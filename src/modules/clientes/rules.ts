import { isValidContact, isValidNIF } from '../onboarding';
import { hasUrl, normalize } from './format';
import type {
  AppFeatures,
  Client,
  ClientInput,
  FieldErrors,
  LocationInput,
  ServiceLocation,
  Unit,
  UnitCalendar,
  UnitSelection,
} from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RATE_RE = /^\d{1,3}([.,]\d{1,2})?$/;

export const digitsOnly = (v: string): string => v.replace(/\D/g, '');

/** "18,5" → 18.5; vazio → null. Assume texto validado. */
export const parseRate = (value: string): number | null =>
  value.trim() ? Number.parseFloat(value.trim().replace(',', '.')) : null;

export const isValidRate = (value: string): boolean => !value.trim() || RATE_RE.test(value.trim());

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

export type ClientField = 'name' | 'nif' | 'contact' | 'email' | 'phone';

/** NIF e telefone usam as mesmas regras do Módulo 1. */
export function validateClient(input: ClientInput, clients: Client[], selfId?: string): FieldErrors<ClientField> {
  const e: FieldErrors<ClientField> = {};
  const name = input.name.trim();
  if (!name) e.name = 'Indica o nome do cliente.';
  else if (clients.some((c) => c.id !== selfId && normalize(c.name) === normalize(name))) e.name = 'Já existe um cliente com este nome.';
  if (input.nif.trim() && !isValidNIF(input.nif)) e.nif = 'NIF inválido. Confirma os 9 dígitos.';
  if (!input.contact.trim()) e.contact = 'Indica a pessoa de contacto.';
  if (!input.email.trim()) e.email = 'Indica o email.';
  else if (!EMAIL_RE.test(input.email.trim())) e.email = 'Email inválido. Ex.: nome@empresa.pt';
  if (input.phone.trim() && !isValidContact(input.phone)) e.phone = 'Telefone inválido. Ex.: +351 912 345 678';
  return e;
}

export type LocationField = 'name' | 'address' | 'hourlyRate' | 'checkinTime';

/** Horas por defeito das estadias quando o local ainda não as tem. */
export const DEFAULT_CHECKOUT = '11:00';
export const DEFAULT_CHECKIN = '15:00';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Saída e entrada no mesmo dia: a entrada tem de ser depois da saída. */
export function validateStayTimes(checkout: string, checkin: string): string | undefined {
  if (!TIME_RE.test(checkout) || !TIME_RE.test(checkin)) return 'Indica as horas no formato HH:MM.';
  if (checkin <= checkout) return 'A hora de entrada tem de ser depois da hora de saída.';
  return undefined;
}

export function validateLocation(input: Pick<LocationInput, 'name' | 'address' | 'hourlyRate'> & Partial<Pick<LocationInput, 'checkoutTime' | 'checkinTime'>>, features: AppFeatures = {}): FieldErrors<LocationField> {
  const e: FieldErrors<LocationField> = {};
  if (!input.name.trim()) e.name = 'Indica o nome.';
  if (!input.address.trim()) e.address = 'Indica a morada.';
  if (!isValidRate(input.hourlyRate)) e.hourlyRate = 'Valor inválido. Ex.: 18,00';
  if (features.stayTimes) {
    const times = validateStayTimes(input.checkoutTime ?? '', input.checkinTime ?? '');
    if (times) e.checkinTime = times;
  }
  return e;
}

/** Horário efetivo de uma unidade: o seu próprio ou o do local. */
export function stayTimesOf(location: Pick<ServiceLocation, 'checkoutTime' | 'checkinTime'>, unit?: Pick<Unit, 'checkoutTime' | 'checkinTime'>): { checkout: string; checkin: string; inherited: boolean } {
  const own = Boolean(unit && unit.checkoutTime && unit.checkinTime);
  return {
    checkout: own ? unit!.checkoutTime! : location.checkoutTime,
    checkin: own ? unit!.checkinTime! : location.checkinTime,
    inherited: !own,
  };
}

/** `unitLabel` vem da configuração da aplicação, ex.: "uma unidade", "uma sala". */
export function validateUnitName(name: string, units: Unit[], selfId: string, unitLabel = 'uma unidade'): string | undefined {
  const value = name.trim();
  if (!value) return 'Indica o nome.';
  if (units.some((u) => u.id !== selfId && normalize(u.name) === normalize(value))) return `Já existe ${unitLabel} com este nome.`;
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Regras do detalhe do local                                          */
/* ------------------------------------------------------------------ */

/**
 * "Aplicar a todas as unidades selecionadas": as unidades selecionadas passam
 * a seguir a equipa, o valor/hora e o horário de saída/entrada do local e recebem o setup de lavandaria
 * (ou deixam de enviar, se a lavandaria estiver desligada). As restantes
 * mantêm a sua configuração. Os calendários iCal nunca são alterados.
 */
export function applyToSelectedUnits(location: ServiceLocation, selection: UnitSelection, features: AppFeatures): { location: ServiceLocation; applied: number } {
  if (!selection.apply || selection.unitIds.length === 0) return { location, applied: 0 };
  let applied = 0;
  const units = location.units.map((u) => {
    if (!selection.unitIds.includes(u.id)) return u;
    applied += 1;
    return {
      ...u,
      teamId: features.defaultTeam ? null : u.teamId,
      hourlyRate: features.hourlyRate ? null : u.hourlyRate,
      checkoutTime: features.stayTimes ? null : u.checkoutTime,
      checkinTime: features.stayTimes ? null : u.checkinTime,
      laundry: features.laundry ? (location.laundryEnabled ? { ...location.laundrySetup } : null) : u.laundry,
    };
  });
  return { location: { ...location, units }, applied };
}

/* ------------------------------------------------------------------ */
/* Calendários iCal                                                    */
/* ------------------------------------------------------------------ */

/**
 * Onde o URL já existe: repetido na mesma unidade ou ligado a outra unidade.
 * Um calendário duplicado criaria reservas duplicadas.
 */
export function calendarDuplicate(calendar: UnitCalendar, unit: Unit, units: Unit[]): { sameUnit: boolean; unitName?: string } | null {
  const url = calendar.url.trim();
  if (!url) return null;
  if (unit.calendars.some((c) => c.id !== calendar.id && c.url.trim() === url)) return { sameUnit: true };
  const other = units.find((u) => u.id !== unit.id && u.calendars.some((c) => c.url.trim() === url));
  return other ? { sameUnit: false, unitName: other.name } : null;
}

export function calendarSummary(units: Unit[]): { unitsWithCalendar: number; connected: number; errors: number } {
  let connected = 0;
  let errors = 0;
  let unitsWithCalendar = 0;
  units.forEach((u) => {
    const withUrl = u.calendars.filter(hasUrl);
    if (withUrl.length) unitsWithCalendar += 1;
    connected += withUrl.filter((c) => c.status === 'connected').length;
    errors += withUrl.filter((c) => c.status === 'error').length;
  });
  return { unitsWithCalendar, connected, errors };
}

/** Resultado simulado: URLs http(s) válidos ligam; "erro" no URL simula falha. */
export const simulatedSyncOk = (url: string): boolean => /^https?:\/\/\S+\.\S+/.test(url.trim()) && !/erro/i.test(url);
