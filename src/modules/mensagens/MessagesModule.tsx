import { useCallback, useEffect, useRef, useState } from 'react';
import { AppTopBar, Button, cx, Dialog, Drawer, IconButton, sectionLabel, selectBase, selectStyle, ToastMessage, type AppSection } from '../shared/ui';
import { ConversationsScreen, DetailsPane } from './components/ConversationsScreen';
import { NewMessageScreen } from './components/NewMessageScreen';
import { TodayScreen } from './components/NoticesBoard';
import { plural } from './format';
import { byId, conversationById, totalUnread, visibleConversations } from './rules';
import { MessagesProvider, useMessages, useOptionalMessages, type MessagesProviderProps } from './store';
import type { Screen, ViewerRole } from './types';

export interface MessagesModuleProps {
  /** "mensagens" (conversas) ou "hoje" (avisos do dia). */
  view?: 'mensagens' | 'hoje';
  initialScreen?: Screen;
  initialConversationId?: string;
  userInitials?: string;
  onNavigate?: (section: AppSection) => void;
}

/**
 * Módulo 10 — Mensagens e notificações operacionais.
 * Conversas com equipa e clientes, avisos do dia e ligação às limpezas.
 * Simulação local: sem email, SMS ou notificações push; os dados ficam no browser.
 */
function MessagesModuleContent({ view = 'mensagens', initialScreen = 'conversas', initialConversationId, userInitials, onNavigate }: MessagesModuleProps) {
  const { data, actions, role, jobs, people, viewer } = useMessages();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [current, setCurrent] = useState(() => initialConversationId ?? visibleConversations(data, role, jobs)[0]?.id ?? '');
  const [narrow, setNarrow] = useState<'list' | 'chat'>('list');
  const [details, setDetails] = useState(false);
  const [linkJob, setLinkJob] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState('');
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [page, setPage] = useState<'mensagens' | 'hoje'>(view);
  const focusTitle = useRef(false);

  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!focusTitle.current) return;
    focusTitle.current = false;
    document.getElementById('page-title')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [screen, page]);

  const openConversation = useCallback((id: string) => {
    actions.markRead(id);
    setCurrent(id);
    setNarrow('chat');
    setPage('mensagens');
    setScreen('conversas');
  }, [actions]);

  const unread = totalUnread(data, role, jobs);
  const initials = userInitials ?? people[viewer]?.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() ?? 'CM';
  const navigate = (section: AppSection) => {
    if (section === 'mensagens') { focusTitle.current = true; setPage('mensagens'); setScreen('conversas'); return; }
    if (section === 'hoje') { focusTitle.current = true; setPage('hoje'); return; }
    if (onNavigate) onNavigate(section);
    else notify(`“${sectionLabel(section)}” fica fora desta simulação.`);
  };

  const conversation = current ? conversationById(data, current) : undefined;

  return (
    <div className="min-h-screen bg-white text-sm text-slate-900 antialiased">
      <AppTopBar active={page === 'hoje' ? 'hoje' : 'mensagens'} appLabel="Limpezas" userInitials={initials} onNavigate={navigate} notify={notify}
        badges={{ aprovacoes: { count: 5, label: '5 aprovações pendentes' }, mensagens: { count: unread, label: plural(unread, 'mensagem não lida', 'mensagens não lidas') } }} />

      <main className="mx-auto max-w-[1240px] px-4 pb-10 pt-[18px] md:px-8 md:pb-14 md:pt-[26px]">
        {page === 'hoje' ? (
          <TodayScreen notify={notify} onOpenConversation={openConversation} onOpenMessages={() => { focusTitle.current = true; setPage('mensagens'); }} />
        ) : screen === 'nova' ? (
          <NewMessageScreen notify={notify} onCancel={() => { focusTitle.current = true; setScreen('conversas'); }}
            onDone={(id) => { focusTitle.current = true; setScreen('conversas'); setCurrent(id); setNarrow('chat'); }} />
        ) : (
          <>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">Limpezas · Mensagens</p>
            <h1 id="page-title" tabIndex={-1} className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight focus:outline-none sm:text-[30px]">Mensagens</h1>
            <p className="mt-1.5 text-[14.5px] text-slate-600">
              Comunicação operacional com a equipa e com os clientes{role === 'colab' ? ' — vês as tuas conversas e as das tuas limpezas' : ''}.
              {unread > 0 && <> <b>{plural(unread, 'mensagem por ler', 'mensagens por ler')}.</b></>}
            </p>
            <ConversationsScreen conversationId={current} onSelect={openConversation} onNew={() => { focusTitle.current = true; setScreen('nova'); }}
              notify={notify} narrowScreen={narrow} onNarrowScreen={setNarrow}
              onDetails={() => setDetails(true)} onLinkJob={() => { setLinkJob(current); setLinkValue(conversation?.jobId ?? ''); }} />
          </>
        )}
      </main>

      {details && (
        <Drawer label="Detalhes da conversa" onClose={() => setDetails(false)}>
          <DetailsPane conversation={conversation} notify={notify} inDrawer onLinkJob={() => { setDetails(false); setLinkJob(current); setLinkValue(conversation?.jobId ?? ''); }} />
        </Drawer>
      )}

      {linkJob && (
        <Dialog title="Associar a uma limpeza" description="A conversa passa a mostrar o contexto da limpeza escolhida." onClose={() => setLinkJob(null)}
          footer={<><Button onClick={() => setLinkJob(null)}>Cancelar</Button>
            <Button variant="primary" onClick={() => {
              actions.linkJob(linkJob, linkValue);
              setLinkJob(null);
              notify(linkValue ? `Conversa associada a ${byId(jobs, linkValue)?.title}.` : 'Limpeza associada removida.');
            }}>Guardar</Button></>}>
          <div className="mt-3.5">
            <label htmlFor="link-job" className="mb-1.5 block text-[13px] font-semibold text-slate-800">Limpeza</label>
            <select id="link-job" value={linkValue} onChange={(e) => setLinkValue(e.target.value)} className={cx(selectBase, 'min-h-10 text-sm')} style={selectStyle}>
              <option value="">Sem limpeza associada</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </div>
        </Dialog>
      )}
      <ToastMessage toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

/** Mensagens é um módulo base: está sempre disponível. */
export default function MessagesModule({ role, storageKey, initialData, today, yesterday, now, jobs, people, clients, ...rest }: MessagesModuleProps & Omit<MessagesProviderProps, 'children'> & { role?: ViewerRole }) {
  const existing = useOptionalMessages();
  const content = <MessagesModuleContent {...rest} />;
  if (existing) return content;
  return (
    <MessagesProvider role={role} storageKey={storageKey} initialData={initialData} today={today} yesterday={yesterday} now={now} jobs={jobs} people={people} clients={clients}>
      {content}
    </MessagesProvider>
  );
}

export { IconButton };
