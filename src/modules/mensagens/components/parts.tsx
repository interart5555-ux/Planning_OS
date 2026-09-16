import type { ReactNode } from 'react';
import { cx, Icon, type IconName } from '../../shared/ui';
import { KIND_LABEL, PRIORITY, STATE_LABEL } from '../config';
import { dayLabel, initials, timeOf } from '../format';
import { isMine } from '../rules';
import type { Conversation, ConversationKind, Message, NoticePriority, Person, ShotKind } from '../types';

export const cardShadow = 'shadow-[0_1px_2px_rgba(17,24,39,.04),0_8px_24px_-16px_rgba(17,24,39,.22)]';
export const card = `rounded-[14px] border border-slate-200 bg-white ${cardShadow}`;
export const pane = `flex min-w-0 flex-col overflow-hidden ${card}`;

const AV_TONES = ['bg-[#f3ead8] text-[#7a5406]', 'bg-[#fde4e1] text-[#a4271c]', 'bg-[#e3ecfb] text-[#2a5592]', 'bg-[#e2f3e8] text-[#17643e]', 'bg-[#ece6fb] text-[#5b3fb0]', 'bg-[#e6f1f3] text-[#1f6470]'];
const AV_SIZE = { sm: 'h-[30px] w-[30px] text-[11px]', md: 'h-10 w-10 text-[13px]', lg: 'h-[46px] w-[46px] text-[15px]' };

export function Avatar({ person, size = 'md' }: { person: Person | null; size?: keyof typeof AV_SIZE }) {
  if (!person) {
    return <span aria-hidden="true" className={cx('relative grid shrink-0 place-items-center rounded-full bg-[#ece6fb] text-[#5b3fb0]', AV_SIZE[size])}><Icon name="users" className="h-[18px] w-[18px]" /></span>;
  }
  return (
    <span aria-hidden="true" className={cx('relative grid shrink-0 place-items-center rounded-full font-semibold', AV_SIZE[size], AV_TONES[person.tone % AV_TONES.length])}>
      {initials(person.name)}
      {person.online && <i className="absolute -bottom-px -right-px h-[11px] w-[11px] rounded-full bg-[#2e9e5b] ring-2 ring-white" />}
    </span>
  );
}

export const KindTag = ({ kind }: { kind: ConversationKind }) => (
  <span className={cx('inline-flex h-[22px] shrink-0 items-center rounded-[7px] px-2 text-xs font-semibold', KIND_LABEL[kind].className)}>{KIND_LABEL[kind].label}</span>
);

export const Count = ({ n, label }: { n: number; label: string }) => (
  <span aria-label={label} className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#d92d20] px-1.5 text-[11.5px] font-bold text-white">{n}</span>
);

const PILL = {
  ok: 'bg-[#e7f5ec] text-[#17643e]', warn: 'bg-[#fdf6de] text-[#7a5406]', bad: 'bg-[#fdecea] text-[#b42318]',
  info: 'bg-[#e8f1fc] text-[#2a5592]', neutral: 'bg-[#eef0f3] text-slate-700',
};
const DOT = { ok: 'bg-[#2e9e5b]', warn: 'bg-[#e0a30b]', bad: 'bg-[#e5484d]', info: 'bg-[#3b82d6]', neutral: 'bg-slate-400' };
export function Pill({ tone, children, dot = true }: { tone: keyof typeof PILL; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cx('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-semibold', PILL[tone])}>
      {dot && <i aria-hidden="true" className={cx('h-[7px] w-[7px] rounded-full', DOT[tone])} />}{children}
    </span>
  );
}

/* Ilustrações simples em vez de fotografias. */
const SHOTS: Record<ShotKind, ReactNode> = {
  bed: <><rect width="120" height="90" fill="#eef2f4" /><rect x="14" y="40" width="92" height="30" rx="4" fill="#dfe6ea" /><rect x="18" y="30" width="36" height="14" rx="3" fill="#fff" /><rect x="58" y="30" width="36" height="14" rx="3" fill="#fff" /><rect x="14" y="52" width="92" height="12" fill="#cfd9df" /></>,
  bath: <><rect width="120" height="90" fill="#eef4f4" /><rect x="18" y="44" width="84" height="26" rx="12" fill="#fff" stroke="#cfd9df" /><path d="M60 24v20" stroke="#b9c6cc" strokeWidth="3" /><circle cx="60" cy="22" r="6" fill="#dfe6ea" /></>,
  towels: <><rect width="120" height="90" fill="#f1f3f2" /><rect x="20" y="26" width="34" height="42" rx="6" fill="#fff" stroke="#d6dedc" /><rect x="60" y="34" width="30" height="34" rx="6" fill="#e8efec" stroke="#cfdad6" /></>,
  living: <><rect width="120" height="90" fill="#f2f0ec" /><rect x="16" y="46" width="88" height="24" rx="6" fill="#dfd9cf" /><rect x="22" y="36" width="24" height="12" rx="3" fill="#fff" /><rect x="52" y="34" width="30" height="14" rx="3" fill="#fff" /></>,
};
export const Shot = ({ kind, className }: { kind: ShotKind; className?: string }) => (
  <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={cx('block', className)}>{SHOTS[kind]}</svg>
);

/** Bolha de mensagem; as próprias ficam à direita, em verde. */
export function Bubble({ message, conversation, viewer, people, today, yesterday, onShot }: {
  message: Message; conversation: Conversation; viewer: string; people: Record<string, Person>; today: string; yesterday: string; onShot: () => void;
}) {
  const mine = isMine(message, viewer);
  const person = people[message.from] ?? null;
  const kind: ConversationKind = person?.clientId ? 'cliente' : conversation.kind === 'cliente' ? 'cliente' : 'interna';
  const state = STATE_LABEL[message.state];
  return (
    <div className={cx('flex max-w-[88%] items-end gap-2.5', mine && 'flex-row-reverse self-end')}>
      <Avatar person={person} size="sm" />
      <div className={cx('min-w-0 rounded-2xl border px-3.5 py-2.5', message.state === 'scheduled' ? 'border-[#f1dfa4] bg-[#fdf6de]' : mine ? 'border-[#cde5d6] bg-[#e9f4ee]' : 'border-slate-200 bg-slate-50')}>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <b className="text-[13px] font-semibold text-slate-900">{person?.name ?? 'Desconhecido'}</b>{timeOf(message.at)}<KindTag kind={kind} />
        </div>
        <p className="whitespace-pre-wrap text-[14.5px] [overflow-wrap:anywhere]">{message.text}</p>
        {message.images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.images.map((k, i) => (
              <button key={`${k}${i}`} type="button" onClick={onShot} aria-label="Ver fotografia (simulação)" className="h-[78px] w-[104px] overflow-hidden rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
                <Shot kind={k} className="h-full w-full" />
              </button>
            ))}
          </div>
        )}
        {message.files.map((f) => (
          <div key={f.name} className="mt-2 flex items-center gap-2.5 rounded-[10px] border border-slate-300 bg-white px-2.5 py-2 text-[13px]">
            <Icon name="doc" className="h-[18px] w-[18px] text-slate-600" />
            <span><b className="font-semibold">{f.name}</b><small className="block text-xs text-slate-500">{f.size} · simulação</small></span>
          </div>
        ))}
        {mine && (
          <span className="mt-1.5 flex items-center gap-1 text-[11.5px] text-slate-500">
            <Icon name={state.icon} className="h-[13px] w-[13px]" />{state.label}
            {message.state === 'scheduled' && message.scheduledFor ? ` para ${dayLabel(message.scheduledFor, today, yesterday)}, ${timeOf(message.scheduledFor)}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export const DaySeparator = ({ children }: { children: ReactNode }) => (
  <span className="self-center rounded-full bg-slate-100 px-3 py-0.5 text-xs text-slate-500">{children}</span>
);

export function EmptyState({ icon = 'chat', title, children }: { icon?: IconName; title: string; children: ReactNode }) {
  return (
    <div className="px-4 py-9 text-center text-slate-500">
      <Icon name={icon} className="mx-auto h-8 w-8 text-slate-300" />
      <b className="mb-0.5 mt-2 block text-[15px] text-slate-900">{title}</b>{children}
    </div>
  );
}

/** Cartão de aviso com cor por prioridade. */
export function NoticeCard({ priority, icon, title, badge, text, meta, when, action, onDismiss }: {
  priority: NoticePriority; icon: IconName; title: string; badge?: ReactNode; text: string; meta: ReactNode; when: string; action: ReactNode; onDismiss: () => void;
}) {
  const p = PRIORITY[priority];
  return (
    <li className={cx('grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-1 rounded-[14px] border border-l-[5px] px-4 py-3.5 min-[720px]:grid-cols-[auto_minmax(0,1fr)_auto_auto]', p.card)}>
      <span className={cx('row-span-2 grid h-[34px] w-[34px] place-items-center rounded-full', p.icon)}><Icon name={icon} className="h-5 w-5" /></span>
      <b className={cx('text-[15px] font-bold', p.title)}>{title}{badge}</b>
      <p className="col-start-2 mt-0.5 text-[13.5px] text-slate-700">{text}</p>
      <span className="col-start-2 mt-2 flex flex-wrap gap-2">{meta}</span>
      <span className="col-start-2 whitespace-nowrap text-[12.5px] text-slate-500 min-[720px]:col-start-3 min-[720px]:text-right">{when}</span>
      <span className="col-start-2 mt-2 justify-self-start min-[720px]:col-start-3 min-[720px]:row-start-2 min-[720px]:mt-0 min-[720px]:justify-self-end min-[720px]:self-end">{action}</span>
      <span className="col-start-3 row-start-1 justify-self-end min-[720px]:col-start-4 min-[720px]:row-span-3">
        <button type="button" onClick={onDismiss} aria-label={`Dispensar aviso: ${title}`} className="grid h-9 w-9 place-items-center rounded-[9px] text-slate-500 hover:bg-white/70 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
          <Icon name="x" />
        </button>
      </span>
    </li>
  );
}
