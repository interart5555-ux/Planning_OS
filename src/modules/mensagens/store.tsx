import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { VIEWERS } from './config';
import { CLIENTS, createDemoMessages, DEMO_NOW, DEMO_TODAY, DEMO_YESTERDAY, JOBS, PEOPLE } from './mockData';
import {
  addNotice, byId, conversationById, conversationWith, createConversation, markRead, noticeById, pushMessage, viewerId,
} from './rules';
import type { Conversation, Message, MessageClient, MessageJob, MessagesData, NewMessageDraft, Person, ShotKind, ViewerRole } from './types';

export const MESSAGES_STORAGE_KEY = 'appos.mensagens.v1';

const clone = (d: MessagesData): MessagesData => JSON.parse(JSON.stringify(d)) as MessagesData;

function load(key: string | null, fallback: () => MessagesData): MessagesData {
  if (!key) return fallback();
  try {
    const saved = JSON.parse(window.localStorage.getItem(key) ?? 'null') as MessagesData | null;
    return saved && saved.version === 1 ? saved : fallback();
  } catch {
    return fallback();
  }
}

export interface SendPayload {
  text: string;
  images?: ShotKind[];
  files?: Message['files'];
}

function useMessagesState({ initialData, storageKey, today, now, role, jobs, people }: {
  initialData?: MessagesData; storageKey: string | null; today: string; now: string; role: ViewerRole; jobs: MessageJob[]; people: Record<string, Person>;
}) {
  const create = useCallback(() => (initialData ? clone(initialData) : createDemoMessages()), [initialData]);
  const [data, setData] = useState<MessagesData>(() => load(storageKey, create));
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    if (!storageKey) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* sem armazenamento */ }
  }, [data, storageKey]);

  const mutate = useCallback(<T,>(fn: (d: MessagesData) => T): T => {
    const draft = clone(ref.current);
    const result = fn(draft);
    ref.current = draft;
    setData(draft);
    return result;
  }, []);

  const at = `${today}T${now}`;
  const viewer = viewerId(role);

  const actions = useMemo(() => ({
    /** Envia na conversa indicada (simulação: fica "Entregue"). */
    send: (conversationId: string, payload: SendPayload) => mutate((d) => {
      const c = conversationById(d, conversationId);
      if (!c) return null;
      return pushMessage(d, c, payload.text, { from: viewer, at, images: payload.images, files: payload.files });
    }),

    markRead: (conversationId: string) => mutate((d) => {
      const c = conversationById(d, conversationId);
      if (c) markRead(c, viewer);
    }),

    markUnread: (conversationId: string) => mutate((d) => {
      const c = conversationById(d, conversationId);
      const last = c?.messages.filter((m) => m.from !== viewer).slice(-1)[0];
      if (last) last.unread = true;
    }),

    setResolved: (conversationId: string, resolved: boolean) => mutate((d) => {
      const c = conversationById(d, conversationId);
      if (c) c.resolved = resolved;
    }),

    linkJob: (conversationId: string, jobId: string) => mutate((d) => {
      const c = conversationById(d, conversationId);
      if (c) c.jobId = jobId;
    }),

    /** Nova mensagem: uma conversa por pessoa ou um grupo interno quando há vários destinatários. */
    createMessage: (draft: NewMessageDraft): Conversation[] => mutate((d) => {
      const jobId = draft.jobId || draft.planId;
      const scheduledFor = draft.when === 'later' ? `${draft.date}T${draft.time}` : undefined;
      const created: Conversation[] = [];
      if (draft.kind === 'equipa' && draft.to.length > 1) {
        const job = byId(jobs, jobId);
        const title = job ? `Equipa — ${job.title.replace('Limpeza — ', '')}` : `Equipa — ${draft.to.map((id) => people[id]?.name.split(' ')[0] ?? id).join(', ')}`;
        created.push(createConversation(d, { kind: 'interna', title, participants: [viewer, ...draft.to], jobId }));
      } else {
        draft.to.forEach((personId) => {
          const c = conversationWith(d, viewer, personId, people, jobId);
          if (jobId) c.jobId = jobId;
          created.push(c);
        });
      }
      created.forEach((c) => pushMessage(d, c, draft.text.trim(), { from: viewer, at, scheduledFor }));
      return created.map((c) => ({ ...c }));
    }),

    /** Conversa com a gestora (app da colaboradora). */
    openWithManager: (jobId = ''): string => mutate((d) => {
      const target = viewer === 'carla' ? 'dora' : 'carla';
      const c = conversationWith(d, viewer, target, people, jobId);
      markRead(c, viewer);
      return c.id;
    }),

    readNotice: (id: string) => mutate((d) => { const n = noticeById(d, id); if (n) n.read = true; }),
    readAllNotices: (ids: string[]) => mutate((d) => { d.notices.forEach((n) => { if (ids.includes(n.id)) n.read = true; }); }),
    dismissNotice: (id: string) => mutate((d) => { const n = noticeById(d, id); if (n) { n.dismissed = true; n.read = true; } }),
    addNotice: (base: Parameters<typeof addNotice>[1]) => mutate((d) => addNotice(d, base)),

    reset: () => { const fresh = create(); ref.current = fresh; setData(fresh); },
  }), [at, create, jobs, mutate, people, viewer]);

  return { data, actions };
}

export type MessagesActions = ReturnType<typeof useMessagesState>['actions'];

export interface MessagesContextValue {
  data: MessagesData;
  actions: MessagesActions;
  today: string;
  yesterday: string;
  now: string;
  role: ViewerRole;
  viewer: string;
  people: Record<string, Person>;
  jobs: MessageJob[];
  clients: MessageClient[];
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

export interface MessagesProviderProps {
  children: ReactNode;
  initialData?: MessagesData;
  /** Chave de persistência no browser; `null` desliga a persistência. */
  storageKey?: string | null;
  today?: string;
  yesterday?: string;
  now?: string;
  /** Perfil simulado; a colaboradora só vê as suas conversas. */
  role?: ViewerRole;
  jobs?: MessageJob[];
  people?: Record<string, Person>;
  clients?: MessageClient[];
}

/** Mensagens e avisos partilhados entre módulos (Mensagens, Hoje e Execução). */
export function MessagesProvider({
  children, initialData, storageKey = MESSAGES_STORAGE_KEY, today = DEMO_TODAY, yesterday = DEMO_YESTERDAY, now = DEMO_NOW, role = 'gestora', jobs = JOBS, people = PEOPLE, clients = CLIENTS,
}: MessagesProviderProps) {
  const { data, actions } = useMessagesState({ initialData, storageKey, today, now, role, jobs, people });
  const value = useMemo<MessagesContextValue>(() => ({
    data, actions, today, yesterday, now, role, viewer: VIEWERS[role].id, people, jobs, clients,
  }), [data, actions, today, yesterday, now, role, people, jobs, clients]);
  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

/** `null` fora de um `MessagesProvider`. */
export const useOptionalMessages = (): MessagesContextValue | null => useContext(MessagesContext);

export function useMessages(): MessagesContextValue {
  const value = useContext(MessagesContext);
  if (!value) throw new Error('useMessages tem de ser usado dentro de <MessagesProvider>.');
  return value;
}
