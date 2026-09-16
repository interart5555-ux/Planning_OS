import { Button, cx, Icon } from '../../shared/ui';
import { useModulosAtivos } from '../../shared/company';
import { MODULE_LABEL, PRIORITY } from '../config';
import { fullWhen, longDate, plural } from '../format';
import { unreadNotices, visibleNotices } from '../rules';
import { useMessages } from '../store';
import type { Notice } from '../types';
import { Count, EmptyState, NoticeCard, Pill } from './parts';

export interface NoticesBoardProps {
  notify: (message: string) => void;
  /** Abrir a conversa indicada por um aviso. */
  onOpenConversation?: (id: string) => void;
  compact?: boolean;
}

/** "Avisos de hoje": temporários, por prioridade, com ler, dispensar e ação. */
export function NoticesBoard({ notify, onOpenConversation, compact }: NoticesBoardProps) {
  const { data, actions, role, today, yesterday } = useMessages();
  const modulos = useModulosAtivos();
  const list = visibleNotices(data, role, modulos);
  const unread = unreadNotices(data, role, modulos);

  const act = (n: Notice) => {
    actions.readNotice(n.id);
    if (n.target.startsWith('conv:') && onOpenConversation) { onOpenConversation(n.target.slice(5)); return; }
    notify(`${n.action} fica fora desta simulação.`);
  };

  return (
    <section aria-labelledby="notices-title" className={compact ? '' : 'mt-6'}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 id="notices-title" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <Icon name="bell" className="h-6 w-6 text-slate-700" />Avisos de hoje
          {unread > 0 && <Count n={unread} label={plural(unread, 'aviso por ler', 'avisos por ler')} />}
        </h2>
        {unread > 0 && (
          <Button size="sm" icon="check" onClick={() => { actions.readAllNotices(list.map((n) => n.id)); notify('Todos os avisos marcados como lidos.'); }}>Marcar todos como lidos</Button>
        )}
        <p className="basis-full text-sm text-slate-600">Informações importantes e atualizações do dia.</p>
      </div>
      {list.length === 0 ? (
        <div className="mt-3.5 rounded-[14px] border border-slate-200 bg-white"><EmptyState icon="checkCircle" title="Sem avisos">Não há nada pendente para hoje.</EmptyState></div>
      ) : (
        <ul className="mt-3.5 flex flex-col gap-3">
          {list.map((n) => (
            <NoticeCard key={n.id} priority={n.priority} icon={n.icon} title={n.title}
              badge={n.requires ? <span className="ml-2 align-[2px] inline-flex h-[22px] items-center rounded-full bg-[#eef0f3] px-2 text-xs font-semibold text-slate-600">Opcional · {MODULE_LABEL[n.requires]}</span> : undefined}
              text={n.text}
              meta={<><span className={cx('inline-flex h-6 items-center rounded-full px-2.5 text-[12.5px] font-semibold', PRIORITY[n.priority].pill)}>{PRIORITY[n.priority].label}</span>
                {n.read ? <Pill tone="neutral">Lida</Pill> : <Pill tone="bad">Não lida</Pill>}</>}
              when={fullWhen(n.at, today, yesterday)}
              action={<Button size="sm" onClick={() => act(n)}>{n.action}</Button>}
              onDismiss={() => { actions.dismissNotice(n.id); notify(`Aviso dispensado: ${n.title}.`); }} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Página "Hoje" da simulação: avisos e três cartões de resumo. */
export function TodayScreen({ notify, onOpenConversation, onOpenMessages }: NoticesBoardProps & { onOpenMessages: () => void }) {
  const { data, role, jobs, people, viewer, today } = useMessages();
  const modulos = useModulosAtivos();
  const unread = unreadNotices(data, role, modulos);
  const todayJobs = jobs.filter((j) => j.date === today);
  const next = todayJobs.find((j) => j.status !== 'Concluída') ?? todayJobs[0];
  const messages = data.conversations.reduce((s, c) => s + c.messages.filter((m) => m.unread && m.from !== viewer).length, 0);
  const cards: Array<[string, string, string]> = [
    ['Limpezas de hoje', String(todayJobs.length), next ? `Próxima às ${next.time.slice(0, 5)} · ${next.place}` : 'Sem limpezas'],
    ['Mensagens por ler', String(messages), 'Abrir mensagens'],
    ['Avisos por ler', String(unread), 'Ordenados por prioridade'],
  ];
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">Limpezas · Hoje</p>
          <h1 id="page-title" tabIndex={-1} className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight focus:outline-none sm:text-[30px]">Hoje</h1>
          <p className="mt-1.5 text-[14.5px] text-slate-600">Bom dia, {people[viewer]?.name.split(' ')[0]}. Aqui está o que precisas de saber.</p>
        </div>
        <span className="text-[13px] text-slate-500">{longDate(today)}</span>
      </div>
      <NoticesBoard notify={notify} onOpenConversation={onOpenConversation} />
      <div className="mt-5 grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {cards.map(([label, value, foot], i) => (
          <div key={label} className="rounded-[14px] border border-slate-200 bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(17,24,39,.04),0_8px_24px_-16px_rgba(17,24,39,.22)]">
            <small className="block text-[12.5px] text-slate-500">{label}</small>
            <b className="mt-1 block text-2xl font-bold tracking-tight">{value}</b>
            <span className="mt-2 flex items-center gap-2 text-[13px] text-slate-700">
              <Icon name={i === 0 ? 'calendar' : i === 1 ? 'chat' : 'bell'} className="h-4 w-4 text-slate-500" />
              {i === 1 ? <button type="button" onClick={onOpenMessages} className="font-semibold text-[#17643e] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">{foot}</button> : foot}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
