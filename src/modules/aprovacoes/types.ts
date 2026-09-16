import type { IconName } from '../shared/ui';

export type ApprovalsAppKey = 'limpezas' | 'formacao' | 'manutencao';

/** Data e hora local no formato "AAAA-MM-DD HH:MM". */
export type Stamp = string;

/** Estado de validação guardado no registo. */
export type ReviewState = 'pending' | 'approved' | 'correction' | 'reopened' | 'archived';

/** Estado apresentado (pendentes dividem-se em Por rever, Em atraso e Com anomalia). */
export type RecordStatus = 'review' | 'done' | 'late' | 'anomaly' | 'reopened' | 'correction' | 'archived';

/** Reabrir só pode devolver o trabalho a um destes estados. */
export type ReopenState = 'Planeado' | 'Em curso';

export type AuditTone = '' | 'ok' | 'bad' | 'warn' | 'vio';

export interface AuditEvent {
  at: Stamp;
  who: string;
  role: string;
  action: string;
  note: string;
  tone: AuditTone;
  icon: IconName;
}

export interface RecordIssue {
  type: string;
  at: Stamp;
  text: string;
}

/** Diferença de quantidades (negativo = em falta). */
export interface QtyDiff {
  label: string;
  diff: number;
}

export interface WorkRecord {
  id: string;
  place: string;
  unit: string;
  city: string;
  /** Índice do gradiente da miniatura. */
  thumb: number;
  client: string;
  personId: string;
  team: string;
  /** Início previsto (só relevante quando houve atraso). */
  planned: Stamp | null;
  plannedMin: number;
  started: Stamp;
  finished: Stamp;
  photos: number;
  /** Uma entrada por tarefa da checklist: true = concluída. */
  tasks: boolean[];
  qty: QtyDiff[];
  notes: string;
  issues: RecordIssue[];
  late: boolean;
  review: ReviewState;
  /** Aprovada automaticamente (completa e sem ocorrências). */
  auto: boolean;
  reopenTo: ReopenState | null;
  audit: AuditEvent[];
}

export interface ApprovalsPerson {
  id: string;
  name: string;
  initials: string;
  team: string;
  tone: number;
}

export interface ApprovalsConfig {
  key: ApprovalsAppKey;
  label: string;
  job: { singular: string; plural: string };
  history: string;
  location: { singular: string; plural: string };
  unit: string;
  person: { singular: string; plural: string; feminine: string };
  qty: { label: string; item: [string, string]; none: string; missingOnly: boolean };
  tasks: string[];
  photoKinds: string[];
  places: Array<[place: string, unit: string, city: string]>;
}

export type ViewerRole = 'gestora' | 'admin' | 'colab';

export interface Viewer {
  name: string;
  initials: string;
  role: string;
  /** Administradora e gestora: aprovar, pedir correção e reabrir. */
  canReview: boolean;
}

export type Screen = 'approvals' | 'history';
export type DrawerTab = 'details' | 'evidence' | 'audit';

export interface ApprovalFilters {
  client: string;
  place: string;
  /** 'pending' = pendentes (e as tratadas nesta sessão); '' = todos. */
  status: '' | 'pending' | RecordStatus;
  person: string;
  period: string;
}

export interface HistoryFilters {
  period: string;
  client: string;
  /** 'auto' = aprovadas automaticamente. */
  status: '' | 'auto' | RecordStatus;
  person: string;
  q: string;
}
