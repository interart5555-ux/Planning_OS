export type RevenueAppKey = 'limpezas' | 'formacao' | 'manutencao';

/** Mês no formato "AAAA-MM". */
export type MonthKey = string;
/** Data no formato "AAAA-MM-DD". */
export type IsoDate = string;

/** Período de pagamento do cliente. */
export type BillingCycle = 'weekly' | 'monthly' | 'custom';

/** Quem fornece produtos e consumíveis. */
export type SupplyModel = 'included' | 'client';

export type InvoiceStatus = 'paid' | 'pending' | 'late';
export type HealthLevel = 'ok' | 'warn' | 'bad';

export interface RevenueConfig {
  key: RevenueAppKey;
  label: string;
  job: { singular: string; plural: string };
  location: { singular: string; plural: string };
  person: { singular: string; plural: string; feminine: string };
  roleBase: string;
  roleLead: string;
  /** "Produtos e consumíveis", "Materiais didáticos"… */
  products: string;
  productsShort: string;
  supply: string;
  supplement: string;
  perJob: string;
  hoursBilled: string;
  clientNames: string[];
  unitNames: string[][];
}

export interface BillableUnit {
  name: string;
  /** Valor/hora faturado ao cliente. */
  rate: number;
  /** Horas faturáveis de referência (setembro 2026). */
  hours: number;
}

export interface RevenueClient {
  id: string;
  name: string;
  cycle: BillingCycle;
  /** Dias até ao vencimento. */
  terms: number;
  supply: SupplyModel;
  /** Suplemento por limpeza quando os produtos estão incluídos. */
  supplement: number;
  contact: { name: string; email: string; phone: string };
  units: BillableUnit[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  /** Valor/hora definido no perfil do colaborador. */
  rate: number;
  /** Parte das horas executadas pela pessoa. */
  share: number;
  /** Deslocações de referência por mês (€). */
  travel: number;
  tone: number;
}

export interface PaymentRecord {
  date: IsoDate;
  amount: number;
  method: string;
  note: string;
  by: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  month: MonthKey;
  from: IsoDate;
  to: IsoDate;
  issued: IsoDate;
  due: IsoDate;
  amount: number;
  payments: PaymentRecord[];
}

export interface RevenueData {
  clients: RevenueClient[];
  team: TeamMember[];
  invoices: Invoice[];
  /** Pagamentos à equipa: mês → pessoa → data. */
  teamPaid: Record<MonthKey, Record<string, IsoDate>>;
}

export interface Period {
  view: 'month' | 'year';
  month: MonthKey;
  year: string;
}

export interface Totals {
  months: MonthKey[];
  hours: number;
  execHours: number;
  revenue: number;
  supplementRev: number;
  /** Custo de equipa = custo base + deslocações. */
  team: number;
  teamBase: number;
  travel: number;
  products: number;
  costs: number;
  margin: number;
  received: number;
  /** Valor já vencido e quanto dele foi recebido. */
  dueAmount: number;
  receivedDue: number;
}

export interface TeamRow {
  person: TeamMember;
  hours: number;
  base: number;
  travel: number;
  total: number;
  paid: IsoDate | null;
}

export interface UnitStats {
  name: string;
  rate: number;
  hours: number;
  jobs: number;
  supplementRev: number;
  revenue: number;
  team: number;
  products: number;
  margin: number;
}

export interface HealthCheck {
  key: 'receipts' | 'team' | 'products' | 'margin';
  value: number;
  level: HealthLevel;
}

export type ViewerRole = 'gestora' | 'admin' | 'colab';
export interface Viewer {
  name: string;
  initials: string;
  role: string;
  canView: boolean;
}

export type Screen = 'overview' | 'payments' | 'team' | 'clients' | 'client';

export interface PaymentFilters {
  q: string;
  status: '' | 'open' | InvoiceStatus;
  /** Mês ou 'all' (últimos 3 meses). */
  period: string;
  sort: 'due' | 'amount' | 'client' | 'status';
}
