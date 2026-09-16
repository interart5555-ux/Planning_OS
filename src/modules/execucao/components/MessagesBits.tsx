import { useRef, useState, type ReactNode } from 'react';
import { cx, focusRing, Icon, useDialogFocus } from '../../shared/ui';
import { useModulosAtivos } from '../../shared/company';
import {
  jobByPlace, NoticesBoard, PhoneMessages, plural, unreadNotices, useOptionalMessages, visibleNotices, type Notice,
} from '../../mensagens';
import type { ExecJob } from '../types';
import { useExec } from './context';
import { BigButton, Notice as ExecNotice, SectionTitle } from './parts';

/* Módulo 10 (Mensagens) na app da colaboradora: sino, aviso do dia e conversa da limpeza. */

/** Folha que sobe do fundo (avisos e conversa), com foco preso e Escape para fechar. */
function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-slate-900/40" onClick={onClose}>
      <div ref={ref} data-dialog role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-white">
        {children}
      </div>
    </div>
  );
}

/** Sino com o número de avisos por ler; abre a folha de avisos. */
export function NoticeBell() {
  const messages = useOptionalMessages();
  const modulos = useModulosAtivos();
  const { actions } = useExec();
  const [open, setOpen] = useState(false);
  if (!messages) return null;
  const count = unreadNotices(messages.data, messages.role, modulos);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={plural(count, 'aviso por ler', 'avisos por ler')}
        className={cx('relative grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] text-slate-700 hover:bg-slate-100', focusRing)}>
        <Icon name="bell" className="h-[21px] w-[21px]" />
        {count > 0 && <span aria-hidden="true" className="absolute right-0 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#d92d20] px-[5px] text-[11px] font-bold text-white">{count}</span>}
      </button>
      {open && (
        <Sheet label="Avisos de hoje" onClose={() => setOpen(false)}>
          <div className="overflow-y-auto px-4 pb-6 pt-4">
            <NoticesBoard compact notify={actions.notify} />
            <BigButton variant="outline" block className="mt-4" onClick={() => setOpen(false)}>Fechar</BigButton>
          </div>
        </Sheet>
      )}
    </>
  );
}

/** Aviso mais importante do dia, no topo da lista. */
export function TopNotice() {
  const messages = useOptionalMessages();
  const modulos = useModulosAtivos();
  const { actions } = useExec();
  if (!messages) return null;
  const list: Notice[] = visibleNotices(messages.data, messages.role, modulos);
  const top = list.find((n) => !n.read) ?? list[0];
  if (!top) return null;
  const tone = top.priority === 'alta' ? 'bad' : top.priority === 'media' ? 'warn' : 'info';
  return (
    <ExecNotice tone={tone} icon={top.icon} title={top.title} className="mt-3.5">
      {top.text}
      <span className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => { messages.actions.readNotice(top.id); actions.notify(`${top.action} fica fora desta simulação.`); }}
          className={cx('min-h-[34px] rounded-full border border-current/30 bg-white/70 px-3 text-[13px] font-semibold', focusRing)}>{top.action}</button>
        <button type="button" onClick={() => { messages.actions.dismissNotice(top.id); actions.notify('Aviso dispensado.'); }}
          className={cx('min-h-[34px] rounded-full px-3 text-[13px] font-medium', focusRing)}>Dispensar</button>
      </span>
    </ExecNotice>
  );
}

/** Conversa da limpeza: mensagem rápida à gestora sem sair da tarefa. */
export function JobMessages({ job }: { job: ExecJob }) {
  const messages = useOptionalMessages();
  const { actions, setTab } = useExec();
  const [conversationId, setConversationId] = useState('');
  if (!messages) return null;
  const jobRef = jobByPlace(messages.jobs, job.place, job.unit);
  return (
    <>
      <SectionTitle>Mensagens</SectionTitle>
      <p className="-mt-1 mb-2.5 text-[13.5px] text-slate-700">Fala com a gestora sobre esta limpeza sem sair da tarefa.</p>
      <BigButton variant="soft" icon="chat" block onClick={() => setConversationId(messages.actions.openWithManager(jobRef?.id ?? ''))}>Enviar mensagem à gestora</BigButton>
      <button type="button" onClick={() => setTab('mensagens')} className={cx('mt-2 w-full py-1 text-[13.5px] font-semibold text-[#17643e]', focusRing)}>Ver todas as mensagens</button>
      {conversationId && (
        <Sheet label="Mensagem à gestora" onClose={() => setConversationId('')}>
          <PhoneMessages conversationId={conversationId} jobId={jobRef?.id} onOpen={() => undefined} onBack={() => setConversationId('')} notify={actions.notify} />
        </Sheet>
      )}
    </>
  );
}

/** Separador "Mensagens" da app: conversas reais quando o Módulo 10 está ligado. */
export function PhoneMessagesTab() {
  const messages = useOptionalMessages();
  const { actions } = useExec();
  const [current, setCurrent] = useState('');
  if (!messages) return null;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PhoneMessages conversationId={current} notify={actions.notify}
        onOpen={(id) => { messages.actions.markRead(id); setCurrent(id); }}
        onBack={() => setCurrent('')} />
    </div>
  );
}
