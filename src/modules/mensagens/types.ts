import type { IconName } from '../shared/ui';

/* Módulo 10 — Mensagens e notificações operacionais. */

export type IsoDate = string;
/** "AAAA-MM-DDTHH:MM" */
export type IsoDateTime = string;

export type ConversationKind = 'equipa' | 'cliente' | 'interna';
export type MessageState = 'sent' | 'delivered' | 'read' | 'scheduled' | 'failed';
export type NoticePriority = 'alta' | 'media' | 'baixa' | 'info';
export type NoticeAudience = 'gestao' | 'colab' | 'todos';
export type OptionalModule = '' | 'inventario' | 'servicosLigados';
export type ShotKind = 'bed' | 'bath' | 'towels' | 'living';
export type ViewerRole = 'gestora' | 'admin' | 'colab';

export interface Person {
  id: string;
  name: string;
  role: string;
  /** Cor do avatar (0–5). */
  tone: number;
  online?: boolean;
  /** Preenchido nos contactos de cliente. */
  clientId?: string;
}

export interface MessageFile {
  name: string;
  size: string;
}

export interface Message {
  id: string;
  /** Id da pessoa que enviou. */
  from: string;
  at: IsoDateTime;
  text: string;
  images: ShotKind[];
  files: MessageFile[];
  state: MessageState;
  scheduledFor?: IsoDateTime;
  /** Por ler para quem não a enviou. */
  unread?: boolean;
}

export interface Conversation {
  id: string;
  kind: ConversationKind;
  /** Título de grupo ou de cliente; nas conversas de equipa mostra-se a outra pessoa. */
  title: string;
  clientId: string;
  participants: string[];
  /** Limpeza associada (contexto). */
  jobId: string;
  priority: '' | 'alta';
  resolved: boolean;
  messages: Message[];
}

export interface Notice {
  id: string;
  type: 'confirm' | 'next' | 'stock' | 'laundry' | 'message';
  priority: NoticePriority;
  audience: NoticeAudience;
  icon: IconName;
  title: string;
  text: string;
  at: IsoDateTime;
  read: boolean;
  dismissed: boolean;
  action: string;
  /** "job:j1", "conv:cv4" ou "mod:inventario". */
  target: string;
  /** Só aparece com o módulo opcional ativo. */
  requires: OptionalModule;
}

export interface MessagesData {
  version: 1;
  seq: { c: number; m: number; n: number };
  conversations: Conversation[];
  notices: Notice[];
}

/** Limpeza usada como contexto das conversas (Planeamento/Execução). */
export interface MessageJob {
  id: string;
  title: string;
  clientId: string;
  place: string;
  unit: string;
  address: string;
  date: IsoDate;
  time: string;
  status: string;
  personId: string;
  shot: ShotKind;
}

export interface MessageClient {
  id: string;
  name: string;
  contact: string;
}

export type Screen = 'conversas' | 'nova';
export type ConversationFilter = 'todas' | 'equipa' | 'clientes' | 'naolidas';

export interface NewMessageDraft {
  kind: 'equipa' | 'cliente';
  to: string[];
  text: string;
  jobId: string;
  planId: string;
  when: 'now' | 'later';
  date: IsoDate;
  time: string;
}
