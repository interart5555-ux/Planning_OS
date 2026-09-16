import { useEffect, useRef, useState } from 'react';
import { cx, focusRing, Icon, inputBase } from '../../shared/ui';
import { QUICK_REPLIES } from '../config';
import { dayLabel, dayOf, plural, shortWhen } from '../format';
import { byId, conversationAt, conversationById, conversationPerson, conversationTitle, isMine, lastMessage, unreadOf, visibleConversations } from '../rules';
import { useMessages } from '../store';
import { Avatar, Bubble, Count, DaySeparator, EmptyState, KindTag } from './parts';

/** Lista e conversa para o telemóvel da colaboradora (Módulo 5). */
export function PhoneMessages({ conversationId, onOpen, onBack, notify, jobId }: {
  conversationId: string; onOpen: (id: string) => void; onBack: () => void; notify: (m: string) => void; jobId?: string;
}) {
  const { data, actions, role, viewer, people, jobs, today, yesterday } = useMessages();
  const [text, setText] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const conversation = conversationId ? conversationById(data, conversationId) : undefined;

  useEffect(() => { setText(''); }, [conversationId]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [conversation?.messages.length, conversationId]);

  const send = (value: string, images?: ['bath']) => {
    if (!value.trim() || !conversation) return;
    actions.send(conversation.id, { text: value.trim(), images });
    setText('');
    notify(images ? 'Fotografia anexada (simulação).' : 'Mensagem enviada (simulação).');
  };

  if (!conversation) {
    const list = visibleConversations(data, role, jobs).sort((a, b) => conversationAt(b).localeCompare(conversationAt(a)));
    const unread = list.reduce((s, c) => s + unreadOf(c, viewer), 0);
    return (
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto bg-[#fbfbfa] px-4 pb-5 pt-4">
        <div><h1 tabIndex={-1} className="text-[22px] font-bold tracking-tight focus:outline-none">Mensagens</h1>
          <p className="mt-0.5 text-[13.5px] text-slate-500">{plural(unread, 'mensagem por ler', 'mensagens por ler')}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3">
          {list.length === 0 ? <EmptyState title="Sem conversas">Ainda não tens mensagens.</EmptyState> : (
            <ul>
              {list.map((c) => {
                const last = lastMessage(c);
                const n = unreadOf(c, viewer);
                return (
                  <li key={c.id} className="border-slate-200 [&+li]:border-t">
                    <button type="button" onClick={() => onOpen(c.id)} className={cx('grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2.5 gap-y-0.5 py-3 text-left', focusRing)}>
                      <span className="row-span-2"><Avatar person={conversationPerson(c, viewer, people)} size="sm" /></span>
                      <span className="flex min-w-0 items-center gap-2"><b className="truncate font-semibold">{conversationTitle(c, viewer, people)}</b><KindTag kind={c.kind} /></span>
                      <span className="text-xs text-slate-500">{shortWhen(conversationAt(c), today, yesterday)}</span>
                      <span className="col-start-2 truncate text-[13px] text-slate-500">{last && isMine(last, viewer) ? 'Tu: ' : ''}{last?.text.replace(/\n/g, ' ')}</span>
                      {n > 0 && <span className="col-start-3 justify-self-end"><Count n={n} label={plural(n, 'por ler', 'por ler')} /></span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  const job = byId(jobs, jobId || conversation.jobId);
  const other = conversationPerson(conversation, viewer, people);
  let lastDay = '';
  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-3 py-2.5">
        <button type="button" onClick={onBack} aria-label="Voltar" className={cx('grid h-9 w-9 place-items-center rounded-[10px] text-slate-600 hover:bg-slate-100', focusRing)}><Icon name="chevronLeft" /></button>
        <Avatar person={other} size="sm" />
        <span className="min-w-0 flex-1"><b className="block truncate text-[15px] font-bold">{conversationTitle(conversation, viewer, people)}</b>
          <small className="block text-xs text-slate-500">{other ? `${other.role}${other.online ? ' · Online' : ''}` : plural(conversation.participants.length, 'participante', 'participantes')}</small></span>
        <button type="button" onClick={() => notify('Chamada fica fora desta simulação.')} aria-label="Telefonar (simulação)" className={cx('grid h-9 w-9 place-items-center rounded-[10px] text-slate-600 hover:bg-slate-100', focusRing)}><Icon name="phone" /></button>
      </div>
      {job && (
        <div className="mx-3 mt-2.5 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Icon name="calendar" className="mt-0.5 h-[18px] w-[18px] text-slate-600" />
          <span><b className="block text-[13.5px] font-semibold">{job.title}</b>
            <small className="block text-[12.5px] text-slate-500">{dayLabel(`${job.date}T00:00`, today, yesterday)}, {job.time} · {job.status}</small></span>
        </div>
      )}
      <div ref={chatRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#fbfbfa] px-3 py-3.5">
        {conversation.messages.map((m) => {
          const showDay = dayOf(m.at) !== lastDay;
          lastDay = dayOf(m.at);
          return (
            <div key={m.id} className="contents">
              {showDay && <DaySeparator>{dayLabel(m.at, today, yesterday)}</DaySeparator>}
              <Bubble message={m} conversation={conversation} viewer={viewer} people={people} today={today} yesterday={yesterday} onShot={() => notify('Fotografia simulada: nenhuma imagem real foi carregada.')} />
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 px-3 pb-2.5">
        {QUICK_REPLIES.map((q) => (
          <button key={q} type="button" onClick={() => setText(q)} className={cx('min-h-[38px] flex-[1_1_44%] rounded-full border border-slate-300 px-2.5 text-[12.5px] font-medium text-slate-700 hover:border-[#17643e] hover:text-[#17643e]', focusRing)}>{q}</button>
        ))}
      </div>
      <div className="flex items-end gap-2 border-t border-slate-200 px-3 py-2.5">
        <button type="button" onClick={() => send(text.trim() || 'Fotografia da ocorrência 📸', ['bath'])} aria-label="Anexar fotografia (simulação)" className={cx('grid h-10 w-10 place-items-center rounded-[10px] text-slate-600 hover:bg-slate-100', focusRing)}><Icon name="clip" /></button>
        <label className="sr-only" htmlFor="phone-composer">Escrever uma mensagem</label>
        <textarea id="phone-composer" rows={1} value={text} placeholder="Escrever uma mensagem…" onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }}
          className={cx(inputBase, 'max-h-[110px] min-h-[42px] flex-1 resize-none py-2.5 text-[14.5px]')} />
        <button type="button" aria-label="Enviar mensagem" disabled={!text.trim()} onClick={() => send(text)}
          className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#17643e] text-white hover:bg-[#0f4f30] disabled:bg-slate-300', focusRing)}><Icon name="send" /></button>
      </div>
    </>
  );
}
