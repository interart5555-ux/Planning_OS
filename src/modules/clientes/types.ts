/**
 * Módulo 3 — Clientes e locais de serviço (núcleo AppOS)
 *
 * Estrutura genérica: Cliente → Local de serviço → Unidade.
 * Cada aplicação AppOS (Limpezas, Formação, Manutenção…) define apenas a
 * terminologia, os campos próprios e as regras adicionais — ver `appConfigs.ts`.
 *
 * Simulação visual: dados em memória, sem base de dados, iCal real ou faturação.
 */

/* ------------------------------------------------------------------ */
/* Configuração por aplicação                                          */
/* ------------------------------------------------------------------ */

export type AppKey = 'limpezas' | 'formacao' | 'manutencao' | 'nucleo';

export interface Term {
  singular: string;
  plural: string;
  /** Concordância em PT-PT ("Novo alojamento" / "Nova instalação"). */
  gender: 'm' | 'f';
}

export interface ServiceDef {
  id: string;
  label: string;
  tone: 'ok' | 'info' | 'neutral';
}

/**
 * Campos adicionais opcionais. Nenhum é universal: só as aplicações que os
 * ligam os apresentam e validam.
 */
export interface AppFeatures {
  /** Equipa por defeito no local e nas unidades. */
  defaultTeam?: boolean;
  /** Valor/hora cobrado ao cliente. */
  hourlyRate?: boolean;
  /** Calendários iCal por unidade. */
  ical?: boolean;
  /** Lavandaria externa com setup por unidade. */
  laundry?: boolean;
  /** Hora de saída e de entrada dos hóspedes (horário por defeito das estadias). */
  stayTimes?: boolean;
}

export interface AppConfig {
  key: AppKey;
  /** Nome no chip da aplicação, ex.: "Limpezas". */
  label: string;
  client: Term;
  location: Term;
  unit: Term & {
    /** Exemplos para ajuda, ex.: "Apartamento ou quarto". */
    hint: string;
    types: string[];
    capacityLabel: string;
  };
  /** Trabalhos associados ao cliente, ex.: "Reservas" em Limpezas. */
  jobs: string;
  segments: string[];
  services: ServiceDef[];
  locationSubtitle: string;
  features: AppFeatures;
}

/* ------------------------------------------------------------------ */
/* Entidades                                                           */
/* ------------------------------------------------------------------ */

export type ClientStatus = 'active' | 'paused' | 'inactive';
export type PaymentStatus = 'ok' | 'pending' | 'late';
export type BillingPeriod = 'Semanal' | 'Quinzenal' | 'Mensal' | 'Por serviço';
export type LocationStatus = 'active' | 'paused';
export type UnitStatus = 'active' | 'inactive';

/** Ilustrações usadas nesta fase em vez de fotografias. */
export type ImageKey = 'facade' | 'facade2' | 'house' | 'living' | 'bedroom';

/** Cliente e empresa são a mesma entidade (um só formulário). */
export interface Client {
  id: string;
  name: string;
  segment: string;
  /** 9 dígitos, sem espaços; vazio quando não aplicável. */
  nif: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  billing: BillingPeriod;
  payment: PaymentStatus;
  status: ClientStatus;
  image: ImageKey;
  /** Ex.: "fev 2024". */
  since: string;
  notes: string;
}

export type LaundryItem = 'lencol' | 'edredon' | 'fronhas' | 'banho' | 'rosto';
export type LaundryQty = Record<LaundryItem, number>;

export type CalendarPlatform = 'Airbnb' | 'Booking.com' | 'Vrbo' | 'Outro';
export type CalendarStatus = 'connected' | 'error' | 'none';

/** Calendário iCal. Pertence à unidade; uma unidade pode ter vários em simultâneo. */
export interface UnitCalendar {
  id: string;
  platform: CalendarPlatform;
  url: string;
  status: CalendarStatus;
  lastSync: string | null;
  imported: number;
}

/**
 * Unidade (Limpezas: apartamento ou quarto). Quando o local tem uma única
 * unidade, o local e a unidade coincidem na interface.
 */
export interface Unit {
  id: string;
  name: string;
  type: string;
  capacity: number;
  status: UnitStatus;
  /** null = segue a equipa por defeito do local. */
  teamId: string | null;
  /** null = segue o valor/hora do local. */
  hourlyRate: number | null;
  /** null = não envia roupa para lavandaria. */
  laundry: LaundryQty | null;
  /** HH:MM; null = segue a hora de saída do local. */
  checkoutTime: string | null;
  /** HH:MM; null = segue a hora de entrada do local. */
  checkinTime: string | null;
  calendars: UnitCalendar[];
}

/** Local de serviço (Limpezas: alojamento). */
export interface ServiceLocation {
  id: string;
  clientId: string;
  name: string;
  address: string;
  status: LocationStatus;
  image: ImageKey;
  /** Ids do catálogo `AppConfig.services`. */
  serviceIds: string[];
  teamId: string | null;
  hourlyRate: number | null;
  /**
   * Horário por defeito das estadias (HH:MM): saída dos hóspedes e entrada dos
   * seguintes. O Planeamento usa-o para a prioridade e o cumprimento do horário.
   */
  checkoutTime: string;
  checkinTime: string;
  laundryEnabled: boolean;
  /** Setup definido no local; aplica-se apenas às unidades selecionadas. */
  laundrySetup: LaundryQty;
  accessInstructions: string;
  notes: string;
  units: Unit[];
}

export interface TeamRef {
  id: string;
  name: string;
}

export interface ClientsData {
  clients: Client[];
  locations: ServiceLocation[];
}

/* ------------------------------------------------------------------ */
/* Formulários                                                         */
/* ------------------------------------------------------------------ */

export interface ClientInput {
  name: string;
  segment: string;
  nif: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  billing: BillingPeriod;
  status: ClientStatus;
  notes: string;
}

export interface LocationInput {
  name: string;
  address: string;
  image: ImageKey;
  status: LocationStatus;
  serviceIds: string[];
  teamId: string;
  /** Texto livre ("18,00"); vazio = sem valor. */
  hourlyRate: string;
  /** HH:MM */
  checkoutTime: string;
  /** HH:MM */
  checkinTime: string;
  /** Só na criação: nomes das primeiras unidades. */
  unitNames: string[];
}

/** Seleção de unidades usada ao guardar o detalhe do local. */
export interface UnitSelection {
  unitIds: string[];
  /** "Aplicar a todas as unidades selecionadas". */
  apply: boolean;
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export type ClientsView =
  | { name: 'clients' }
  | { name: 'locations'; clientId: string }
  | { name: 'location'; clientId: string; locationId: string };
