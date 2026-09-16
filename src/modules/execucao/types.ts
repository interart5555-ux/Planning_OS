import type { IconName } from '../shared/ui';

export type ExecAppKey = 'limpezas' | 'formacao' | 'manutencao';

/** Estado guardado de um trabalho. */
export type ExecStatus = 'planned' | 'confirmed' | 'in_progress' | 'done';
/** Estado apresentado: acrescenta "Em atraso" (calculado) e "Ausência". */
export type DisplayStatus = ExecStatus | 'late' | 'absence';

export type IssueType = 'atraso' | 'dano' | 'material' | 'acesso' | 'outro';

export type Quantities = Record<string, number>;

export interface QuantityItem {
  key: string;
  label: string;
  icon: IconName;
}

/** Terminologia e listas por aplicação AppOS (o núcleo é o mesmo). */
export interface ExecConfig {
  key: ExecAppKey;
  label: string;
  /** "Execução de trabalho" → "O meu dia". */
  home: string;
  job: { singular: string; plural: string };
  checklist: string;
  evidence: string;
  addEvidence: string;
  start: string;
  resume: string;
  finish: string;
  send: string;
  /** Quem planeia ("gestora", "coordenadora"). */
  manager: string;
  prep: string[];
  tasks: string[];
  quantities: { title: string; note: string; items: QuantityItem[] };
  photoKinds: string[];
}

export interface HistoryEvent {
  id: string;
  time: string;
  text: string;
  tone: 'neutral' | 'ok' | 'bad';
  /** false enquanto não houver rede. */
  synced: boolean;
}

export interface Issue {
  id: string;
  type: IssueType;
  delayMin: number | null;
  description: string;
  withPhoto: boolean;
  time: string;
  synced: boolean;
}

export interface Photo {
  id: string;
  /** Índice em `config.photoKinds` (fotografia simulada). */
  kind: number;
}

export interface ExecJob {
  id: string;
  kind: 'job';
  date: string;
  start: string;
  end: string;
  place: string;
  unit: string;
  address: [string, string];
  managerNote: string;
  team: string;
  status: ExecStatus;
  /** Quantidades configuradas (lavandaria/materiais); null quando não se aplica. */
  plannedQty: Quantities | null;
  qty: Quantities | null;
  /** Última confirmação ou diferença registada. */
  qtySaved: Quantities | null;
  prep: boolean[];
  tasks: boolean[];
  photos: Photo[];
  notes: string;
  issues: Issue[];
  events: HistoryEvent[];
  /** Minutos desde as 00:00 (hora simulada). */
  startedAt: number | null;
  startedAtMs: number | null;
  finishedAt: number | null;
  durationSec: number | null;
}

export interface ExecAbsence {
  id: string;
  kind: 'absence';
  date: string;
  start: string;
  end: string;
  reason: string;
}

export type DayItem = ExecJob | ExecAbsence;

export interface ExecMessage {
  id: string;
  from: string;
  role: string;
  day: string;
  time: string;
  text: string;
  unread: boolean;
}

export interface ExecPerson {
  name: string;
  firstName: string;
  initials: string;
  team: string;
}

export interface ExecData {
  items: DayItem[];
  messages: ExecMessage[];
}

export type ExecTab = 'hoje' | 'plano' | 'mensagens' | 'perfil';
export type ExecScreen = 'list' | 'detail' | 'run' | 'finish' | 'sent';

export interface IssueInput {
  type: IssueType;
  delayMin: number | null;
  description: string;
  withPhoto: boolean;
}
