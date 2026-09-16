import { useEffect, useRef, useState } from 'react';
import { ActionMenu, Button, cx, Icon, IconButton, inputBase, type IconName } from '../../shared/ui';
import { EMOJIS, FILTERS } from '../config';
import { dayLabel, dayOf, plural, shortWhen } from '../format';
import {
  byId, conversationAt, conversationById, conversationPerson, conversationTitle, isManager, isMine, lastMessage, unreadOf, visibleConversations,
} from '../rules';
import { useMessages } from '../store';
import type { Conversation, ConversationFilter, MessageJob } from '../types';
import { Avatar, Bubble, card, Count, DaySeparator, EmptyState, KindTag, pane, Pill, Shot } from './parts';

export interface ConversationsProps {
  conversationId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  notify: (message: string) => void;
  /** Ecrã estreito: lista ou conversa. */
  narrowScreen: 'list' | 'chat';
  onNarrowScreen: (s: 'list' | 'chat') => void;
}

function JobContext({ job, onOpen }: { job: MessageJob; onOpen: () => void }) {
  const { today, yesterday } = useMessages();
  return (
    <div className="mx-4 mb-3 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:mx-5">
      <Icon name="calendar" className="mt-0.5 h-[18px] w-[18px] text-slate-600" />
      <span className="min-w-0"><b className="block text-[13.5px] font-semibold">{job.title}</b>
        <small className="block text-[12.5px] text-slate-500">{dayLabel(`${job.date}T00:00`, today, yesterday)}, {job.time} · {job.status}</small></span>
      <button type="button" onClick={onOpen} className="ml-auto whitespace-nowrap text-[13px] font-semibold text-[#17643e] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">Ver limpeza</button>
    </div>
  );
}

function ListPane({ conversationId, onSelect, onNew, filter, setFilter, query, setQuery }: ConversationsProps & { filter: ConversationFilter; setFilter: (f: ConversationFilter) => void; query: string; setQuery: (q: string) => void }) {
  const { data, role, viewer, people, jobs, today, yesterday } = useMessages();
  const all = visibleConversations(data, role, jobs);
  const counts: Record<ConversationFilter, number> = {
    todas: all.length,
    equipa: all.filter((c) => c.kind !== 'cliente').length,
    clientes: all.filter((c) => c.kind === 'cliente').length,
    naolidas: all.filter((c) => unreadOf(c, viewer)).length,
  };
  const q = query.trim().toLowerCase();
  const list = all
    .filter((c) => (filter === 'equipa' ? c.kind !== 'cliente' : filter === 'clientes' ? c.kind === 'cliente' : filter === 'naolidas' ? unreadOf(c, viewer) > 0 : true))
    .filter((c) => !q || `${conversationTitle(c, viewer, people)} ${c.messages.map((m) => m.text).join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => conversationAt(b).localeCompare(conversationAt(a)));

  return (
    <section aria-label="Conversas" className={cx(pane, 'h-full')}>
      <div className="border-b border-slate-200 px-4 pb-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="text-lg font-bold tracking-tight">Conversas</h2>
          <Button size="sm" variant="primary" icon="plus" onClick={onNew}>Nova mensagem</Button>
        </div>
        <label className="relative mt-3 block">
          <span className="sr-only">Pesquisar conversas</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar conversas…" className={cx(inputBase, 'min-h-10 pl-[38px] text-sm')} />
        </label>
        <div role="group" aria-label="Filtros de conversas" className="mt-3 flex gap-1.5 overflow-x-auto">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}
              className={cx('h-8 shrink-0 rounded-full border px-3 text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]',
                filter === key ? 'border-[#17643e] bg-[#e9f4ee] font-semibold text-[#17643e]' : 'border-slate-300 font-medium text-slate-600')}>
              {label} ({counts[key]})
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? <EmptyState title="Sem conversas">Ajusta a pesquisa ou os filtros.</EmptyState> : (
        <ul className="flex-1 overflow-y-auto p-1.5">
          {list.map((c) => {
            const last = lastMessage(c);
            const n = unreadOf(c, viewer);
            return (
              <li key={c.id}>
                <button type="button" onClick={() => onSelect(c.id)} aria-current={c.id === conversationId}
                  className={cx('grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 rounded-[10px] border-l-[3px] px-2.5 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]',
                    c.id === conversationId ? 'border-l-[#17643e] bg-[#e9f4ee]' : 'border-l-transparent hover:bg-slate-50')}>
                  <span className="row-span-3"><Avatar person={conversationPerson(c, viewer, people)} /></span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    {c.priority === 'alta' && <Icon name="triangle" className="h-[15px] w-[15px] shrink-0 text-[#b42318]" />}
                    <b className="min-w-0 truncate font-semibold">{conversationTitle(c, viewer, people)}</b>
                    <KindTag kind={c.kind} />
                  </span>
                  <span className="whitespace-nowrap text-xs text-slate-500">{shortWhen(conversationAt(c), today, yesterday)}</span>
                  <span className={cx('col-start-2 truncate text-[13px]', n ? 'font-semibold text-slate-900' : 'text-slate-500')}>
                    {last && isMine(last, viewer) ? 'Tu: ' : ''}{last?.text.replace(/\n/g, ' ')}
                  </span>
                  <span className="col-start-3 row-start-2 justify-self-end">
                    {n > 0 ? <Count n={n} label={plural(n, 'mensagem não lida', 'mensagens não lidas')} /> : c.resolved ? <Pill tone="ok">Resolvida</Pill> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ChatPane({ conversation, props, onDetails }: { conversation: Conversation | undefined; props: ConversationsProps; onDetails: () => void }) {
  const { data, actions, viewer, people, jobs, today, yesterday, role } = useMessages();
  const [draft, setDraft] = useState('');
  const [emoji, setEmoji] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const { notify, onNarrowScreen } = props;

  useEffect(() => { setDraft(''); setEmoji(false); }, [conversation?.id]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [conversation?.messages.length, conversation?.id]);

  if (!conversation) {
    return <section aria-label="Conversa" className={cx(pane, 'h-full')}><EmptyState title="Escolhe uma conversa">As mensagens aparecem aqui.</EmptyState></section>;
  }
  const c = conversationById(data, conversation.id) ?? conversation;
  const job = byId(jobs, c.jobId);
  const others = c.participants.filter((p) => p !== viewer).map((p) => people[p]?.name ?? p);
  const send = (text: string, extra?: { images?: ['bath']; files?: [{ name: string; size: string }] }) => {
    if (!text.trim()) return;
    actions.send(c.id, { text: text.trim(), ...extra });
    setDraft('');
    setEmoji(false);
    notify(extra ? (extra.images ? 'Fotografia anexada (simulação).' : 'Documento anexado (simulação).') : 'Mensagem enviada (simulação).');
  };

  let lastDay = '';
  return (
    <section aria-label="Conversa" className={cx(pane, 'h-full')}>
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <IconButton icon="chevronLeft" label="Voltar às conversas" className="min-[700px]:hidden" onClick={() => onNarrowScreen('list')} />
        <Avatar person={conversationPerson(c, viewer, people)} />
        <span className="min-w-0 flex-1">
          <b className="flex flex-wrap items-center gap-2 text-base font-bold tracking-tight">{conversationTitle(c, viewer, people)}<KindTag kind={c.kind} />{c.resolved && <Pill tone="ok">Resolvida</Pill>}</b>
          <small className="block text-[12.5px] text-slate-500">Com {others.join(' e ')}</small>
        </span>
        <IconButton icon="info" label="Ver detalhes do contexto" className="min-[1180px]:hidden" onClick={onDetails} />
        <ActionMenu label="Ações da conversa" items={[
          { label: 'Marcar como não lida', icon: 'chat', onSelect: () => { actions.markUnread(c.id); onNarrowScreen('list'); notify('Conversa marcada como não lida.'); } },
          ...(isManager(role) ? [{ label: c.resolved ? 'Reabrir conversa' : 'Marcar como resolvida', icon: 'checkCircle' as const, onSelect: () => { actions.setResolved(c.id, !c.resolved); notify(c.resolved ? 'Conversa reaberta.' : 'Conversa marcada como resolvida.'); } }] : []),
          ...(job ? [{ label: 'Ver limpeza', icon: 'eye' as const, onSelect: () => notify('“Ver limpeza” abre a Execução (fica fora desta simulação).') }] : []),
        ]} />
      </div>
      {job && <JobContext job={job} onOpen={() => notify('“Ver limpeza” abre a Execução (fica fora desta simulação).')} />}
      <div ref={chatRef} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-4">
        {c.messages.map((m) => {
          const showDay = dayOf(m.at) !== lastDay;
          lastDay = dayOf(m.at);
          return (
            <div key={m.id} className="contents">
              {showDay && <DaySeparator>{dayLabel(m.at, today, yesterday)}</DaySeparator>}
              <Bubble message={m} conversation={c} viewer={viewer} people={people} today={today} yesterday={yesterday} onShot={() => notify('Fotografia simulada: nenhuma imagem real foi carregada.')} />
            </div>
          );
        })}
      </div>
      <div className="relative flex items-end gap-2 border-t border-slate-200 px-3.5 py-3">
        <ActionMenu label="Anexar imagem ou ficheiro (simulação)" icon="clip" items={[
          { label: 'Fotografia da limpeza', icon: 'camera', onSelect: () => send(draft.trim() || 'Fotografia da limpeza 📸', { images: ['bath'] }) },
          { label: 'Documento (PDF)', icon: 'doc', onSelect: () => send(draft.trim() || 'Documento em anexo', { files: [{ name: 'plano-limpeza.pdf', size: '128 KB' }] }) },
        ]} />
        <IconButton icon="smile" label="Emoji" aria-expanded={emoji} onClick={() => setEmoji(!emoji)} />
        <label className="sr-only" htmlFor="composer">Escrever uma mensagem</label>
        <textarea id="composer" rows={1} value={draft} placeholder="Escrever uma mensagem…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }}
          className={cx(inputBase, 'max-h-[120px] min-h-[44px] flex-1 resize-none py-2.5 text-[14.5px]')} />
        <button type="button" aria-label="Enviar mensagem" disabled={!draft.trim()} onClick={() => send(draft)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#17643e] text-white hover:bg-[#0f4f30] disabled:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
          <Icon name="send" />
        </button>
        {emoji && (
          <div role="group" aria-label="Emoji" className={cx('absolute bottom-[70px] right-3.5 z-10 flex w-[236px] flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2', 'shadow-[0_18px_50px_-18px_rgba(17,24,39,.38)]')}>
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => { setDraft((d) => d + e); setEmoji(false); }} className="h-[34px] w-[34px] rounded-lg text-lg hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">{e}</button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function DetailsPane({ conversation, notify, onLinkJob, inDrawer }: { conversation: Conversation | undefined; notify: (m: string) => void; onLinkJob: () => void; inDrawer?: boolean }) {
  const { data, actions, viewer, people, jobs, clients, today, yesterday, role } = useMessages();
  if (!conversation) return null;
  const c = conversationById(data, conversation.id) ?? conversation;
  const job = byId(jobs, c.jobId);
  const client = byId(clients, c.clientId || job?.clientId || '');
  const person = conversationPerson(c, viewer, people);
  const worker = job ? people[job.personId] : undefined;
  const facts: Array<[IconName, string, string]> = [];
  if (job) {
    if (client) facts.push(['users', 'Cliente', client.name]);
    facts.push(['building', 'Alojamento e unidade', `${job.place} · ${job.unit}`]);
    facts.push(['pin', 'Morada', job.address]);
    facts.push(['calendar', 'Data e hora', `${dayLabel(`${job.date}T00:00`, today, yesterday)}, ${job.time}`]);
    if (worker) facts.push(['user', 'Colaboradora atribuída', worker.name]);
  } else {
    if (person) facts.push(['user', person.clientId ? 'Contacto do cliente' : 'Pessoa', person.name]);
    if (person) facts.push(['list', 'Perfil', person.role]);
    if (client) facts.push(['users', 'Cliente', client.name]);
    facts.push(['chat', 'Mensagens', plural(c.messages.length, 'mensagem', 'mensagens')]);
  }
  const body = (
    <div className="px-4 py-4 sm:px-5">
      <h3 className="mb-2.5 text-base font-bold">Detalhes</h3>
      {job && <><Shot kind={job.shot} className="h-[132px] w-full rounded-xl" /><p className="mt-3 text-[14.5px] font-semibold">{job.title}</p>
        <p className="mt-2"><Pill tone={job.status === 'Em curso' ? 'ok' : job.status === 'Concluída' ? 'neutral' : 'warn'}>{job.status}</Pill></p></>}
      <ul className="mt-2.5">
        {facts.map(([icon, label, value]) => (
          <li key={label} className="flex gap-2.5 py-2">
            <Icon name={icon} className="mt-0.5 h-[18px] w-[18px] text-slate-600" />
            <span><small className="block text-xs text-slate-500">{label}</small><b className="block text-[13.5px] font-medium">{value}</b></span>
          </li>
        ))}
      </ul>
      <div className="mt-3.5 flex flex-col gap-2">
        {job ? (
          <>
            <Button icon="calendar" className="!border-[#17643e] !text-[#17643e]" onClick={() => notify('“Ver no planeamento” abre o Planeamento (fica fora desta simulação).')}>Ver no planeamento</Button>
            <Button icon="eye" onClick={() => notify('“Ver limpeza” abre a Execução (fica fora desta simulação).')}>Ver limpeza</Button>
          </>
        ) : <Button icon="calendar" onClick={onLinkJob}>Associar a uma limpeza</Button>}
      </div>
      <h3 className="mb-2 mt-5 text-base font-bold">Etiquetas</h3>
      <div className="flex flex-wrap gap-1.5">
        <KindTag kind={c.kind} />
        {unreadOf(c, viewer) ? <Pill tone="bad">Não lida</Pill> : <Pill tone="neutral">Lida</Pill>}
        {c.priority === 'alta' && <Pill tone="bad">Prioridade</Pill>}
        {c.resolved && <Pill tone="ok">Resolvida</Pill>}
      </div>
      {isManager(role) && (
        <Button icon="checkCircle" className="mt-3.5 w-full" onClick={() => { actions.setResolved(c.id, !c.resolved); notify(c.resolved ? 'Conversa reaberta.' : 'Conversa marcada como resolvida.'); }}>
          {c.resolved ? 'Reabrir conversa' : 'Marcar como resolvida'}
        </Button>
      )}
    </div>
  );
  return inDrawer ? body : <section aria-label="Detalhes" className={cx(pane, 'h-full overflow-y-auto')}>{body}</section>;
}

export function ConversationsScreen(props: ConversationsProps & { onLinkJob: () => void; onDetails: () => void }) {
  const { data, role, jobs } = useMessages();
  const [filter, setFilter] = useState<ConversationFilter>('todas');
  const [query, setQuery] = useState('');
  const conversation = visibleConversations(data, role, jobs).find((c) => c.id === props.conversationId);
  return (
    <div className={cx('mt-4 grid min-h-[520px] gap-3.5 lg:h-[calc(100dvh-230px)]', 'grid-cols-1 min-[700px]:grid-cols-[290px_minmax(0,1fr)] min-[1180px]:grid-cols-[320px_minmax(0,1fr)_304px]')}>
      <div className={cx('min-w-0', props.narrowScreen === 'chat' && 'hidden min-[700px]:block')}>
        <ListPane {...props} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} />
      </div>
      <div className={cx('min-w-0', props.narrowScreen === 'list' && 'hidden min-[700px]:block')}>
        <ChatPane conversation={conversation} props={props} onDetails={props.onDetails} />
      </div>
      <div className={cx('hidden min-w-0 min-[1180px]:block', card, 'border-0 shadow-none')}>
        <DetailsPane conversation={conversation} notify={props.notify} onLinkJob={props.onLinkJob} />
      </div>
    </div>
  );
}
