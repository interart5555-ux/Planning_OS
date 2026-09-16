import { VIEWERS } from './config';
import type { Conversation, Message, MessageJob, MessagesData, Notice, OptionalModule, Person, ViewerRole } from './types';

export const byId = <T extends { id: string }>(list: T[], id: string): T | undefined => list.find((x) => x.id === id);
export const conversationById = (d: MessagesData, id: string) => byId(d.conversations, id);
export const noticeById = (d: MessagesData, id: string) => byId(d.notices, id);
export const viewerId = (role: ViewerRole): string => VIEWERS[role].id;
export const isManager = (role: ViewerRole): boolean => VIEWERS[role].canAll;

export const lastMessage = (c: Conversation): Message | undefined =>
  c.messages.filter((m) => m.state !== 'scheduled').slice(-1)[0] ?? c.messages.slice(-1)[0];
export const conversationAt = (c: Conversation): string => lastMessage(c)?.at ?? '';
export const isMine = (m: Message, viewer: string): boolean => m.from === viewer;
/** Mensagens por ler de quem está a ver (as próprias nunca contam). */
export const unreadOf = (c: Conversation, viewer: string): number => c.messages.filter((m) => m.unread && m.from !== viewer).length;

/** Título do ponto de vista de quem vê: nas conversas de equipa mostra a outra pessoa. */
export function conversationTitle(c: Conversation, viewer: string, people: Record<string, Person>): string {
  if (c.kind !== 'equipa') return c.title;
  const other = c.participants.find((p) => p !== viewer);
  return other && people[other] ? people[other].name : c.title;
}
export function conversationPerson(c: Conversation, viewer: string, people: Record<string, Person>): Person | null {
  if (c.kind === 'interna') return null;
  const other = c.participants.find((p) => p !== viewer) ?? '';
  return people[other] ?? null;
}

/** A colaboradora só vê as suas conversas e as das suas limpezas. */
export function visibleConversations(d: MessagesData, role: ViewerRole, jobs: MessageJob[]): Conversation[] {
  if (isManager(role)) return d.conversations.slice();
  const me = viewerId(role);
  return d.conversations.filter((c) => {
    if (c.participants.includes(me)) return true;
    const job = byId(jobs, c.jobId);
    return Boolean(job && job.personId === me);
  });
}
export const totalUnread = (d: MessagesData, role: ViewerRole, jobs: MessageJob[]): number =>
  visibleConversations(d, role, jobs).reduce((s, c) => s + unreadOf(c, viewerId(role)), 0);

const ORDER = { alta: 0, media: 1, baixa: 2, info: 3 };
/** Avisos por prioridade; os de módulos opcionais só com o módulo ativo. */
export function visibleNotices(d: MessagesData, role: ViewerRole, modules: Record<OptionalModule extends '' ? never : 'inventario' | 'servicosLigados', boolean>): Notice[] {
  const forColab = !isManager(role);
  return d.notices
    .filter((n) => !n.dismissed && (!n.requires || modules[n.requires]) && (n.audience === 'todos' || (forColab ? n.audience === 'colab' : n.audience === 'gestao')))
    .sort((a, b) => ORDER[a.priority] - ORDER[b.priority] || b.at.localeCompare(a.at));
}
export const unreadNotices = (d: MessagesData, role: ViewerRole, modules: { inventario: boolean; servicosLigados: boolean }): number =>
  visibleNotices(d, role, modules).filter((n) => !n.read).length;

export const jobByPlace = (jobs: MessageJob[], place: string, unit?: string): MessageJob | undefined =>
  jobs.find((j) => j.place.toLowerCase() === place.trim().toLowerCase() && (!unit || j.unit.toLowerCase() === unit.trim().toLowerCase()))
  ?? jobs.find((j) => j.place.toLowerCase() === place.trim().toLowerCase());

/* ---------- alterações (sobre uma cópia dos dados) ---------- */

export function markRead(c: Conversation, viewer: string): void {
  c.messages.forEach((m) => { if (m.from !== viewer) m.unread = false; });
}

export interface SendOptions {
  from: string;
  at: string;
  images?: Message['images'];
  files?: Message['files'];
  scheduledFor?: string;
}
export function pushMessage(d: MessagesData, c: Conversation, text: string, opts: SendOptions): Message {
  const m: Message = {
    id: `m${++d.seq.m}`, from: opts.from, at: opts.at, text, images: opts.images ?? [], files: opts.files ?? [],
    state: opts.scheduledFor ? 'scheduled' : 'delivered', scheduledFor: opts.scheduledFor, unread: false,
  };
  c.messages.push(m);
  c.resolved = false;
  return m;
}
export function createConversation(d: MessagesData, base: Partial<Conversation>): Conversation {
  const c: Conversation = {
    id: `cv${++d.seq.c}`, kind: 'equipa', title: '', clientId: '', participants: [], jobId: '', priority: '', resolved: false, messages: [], ...base,
  };
  d.conversations.push(c);
  return c;
}
/** Conversa individual com alguém (cria se ainda não existir). */
export function conversationWith(d: MessagesData, viewer: string, personId: string, people: Record<string, Person>, jobId = ''): Conversation {
  const found = d.conversations.find((c) => c.kind !== 'interna' && c.participants.includes(personId) && c.participants.includes(viewer) && (!jobId || c.jobId === jobId))
    ?? d.conversations.find((c) => c.kind !== 'interna' && c.participants.includes(personId) && c.participants.includes(viewer));
  if (found) return found;
  const p = people[personId];
  return createConversation(d, { kind: p?.clientId ? 'cliente' : 'equipa', title: p?.name ?? '', clientId: p?.clientId ?? '', participants: [viewer, personId], jobId });
}
export function addNotice(d: MessagesData, base: Partial<Notice> & { title: string; text: string; at: string }): Notice {
  const n: Notice = {
    id: `n${++d.seq.n}`, type: 'message', priority: 'info', audience: 'todos', icon: 'chat', read: false, dismissed: false, action: '', target: '', requires: '', ...base,
  };
  d.notices.unshift(n);
  return n;
}
