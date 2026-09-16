import { useEffect } from 'react';
import { cx, focusRing, Icon, type IconName } from '../../shared/ui';
import { pendingAll } from '../rules';
import type { ExecTab } from '../types';
import type { ExecToast } from '../useExecutionModule';
import { useExec } from './context';
import { NoticeBell } from './MessagesBits';
import { totalUnread, useOptionalMessages } from '../../mensagens';

/** Estado de ligação e sincronização, sempre visível no topo. */
function NetChip() {
  const { data, online, syncing, setTab } = useExec();
  const pending = pendingAll(data);
  const base = cx('inline-flex min-h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full border px-[11px] text-[13px] font-medium', focusRing);
  if (syncing) {
    return (
      <button type="button" onClick={() => setTab('perfil')} aria-label="A sincronizar registos" className={cx(base, 'border-[#d5e2f3] bg-[#edf3fb] text-[#2a5592]')}>
        <span className="animate-spin"><Icon name="sync" className="h-[17px] w-[17px]" /></span><span className="max-[359px]:sr-only">A sincronizar…</span>
      </button>
    );
  }
  if (!online) {
    return (
      <button type="button" onClick={() => setTab('perfil')} aria-label={`Sem rede, ${pending} por sincronizar`} className={cx(base, 'border-[#f4c3bd] bg-[#fde8e6] text-[#9b2318]')}>
        <Icon name="wifiOff" className="h-[17px] w-[17px]" /><span className="max-[359px]:sr-only">Sem rede</span>
        {pending > 0 && <b className="grid h-[19px] min-w-[19px] place-items-center rounded-full bg-[#9b2318] px-[5px] text-[11px] text-white">{pending}</b>}
      </button>
    );
  }
  return (
    <button type="button" onClick={() => setTab('perfil')} aria-label="Com ligação, tudo sincronizado" className={cx(base, 'border-[#e6e8ec] bg-white text-slate-700')}>
      <Icon name="wifi" className="h-[17px] w-[17px] text-[#17643e]" /><span className="max-[359px]:sr-only">Com ligação</span>
    </button>
  );
}

export function AppBar() {
  const { config, person, online } = useExec();
  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-2.5 border-b border-[#e6e8ec] bg-white px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[21px] font-bold tracking-[-0.035em] text-[#17643e]">AppOS</span>
          <span className="inline-flex h-[26px] items-center whitespace-nowrap rounded-full bg-[#e9f4ee] px-2.5 text-[12.5px] font-semibold text-[#17643e]">{config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <NetChip />
          <NoticeBell />
          <span aria-label={person.name} className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#17643e] text-[13px] font-semibold text-white">{person.initials}</span>
        </div>
      </header>
      {!online && (
        <div role="status" className="flex shrink-0 items-center gap-2.5 border-b border-[#f4c3bd] bg-[#fde8e6] px-4 py-[9px] text-[13.5px] text-[#9b2318]">
          <Icon name="cloudOff" className="h-[18px] w-[18px]" />
          <span><b>Sem rede</b> — o registo será sincronizado quando houver ligação.</span>
        </div>
      )}
    </>
  );
}

const TABS: Array<[ExecTab, string, IconName]> = [['hoje', 'Hoje', 'home'], ['plano', 'Plano', 'planner'], ['mensagens', 'Mensagens', 'chat'], ['perfil', 'Perfil', 'user']];

/** Navegação inferior (mobile-first; mantém-se em tablet). */
export function TabBar() {
  const { tab, setTab, data } = useExec();
  const messages = useOptionalMessages();
  // Com o Módulo 10 ligado, o contador vem das conversas reais.
  const unread = messages ? totalUnread(messages.data, messages.role, messages.jobs) : data.messages.filter((m) => m.unread).length;
  return (
    <nav aria-label="Navegação" className={cx('grid shrink-0 grid-cols-4 border-t border-[#e6e8ec] bg-white pb-[env(safe-area-inset-bottom)]')}>
      {TABS.map(([key, label, icon]) => (
        <button key={key} type="button" onClick={() => setTab(key)} aria-current={tab === key ? 'page' : undefined}
          className={cx('relative flex min-h-[62px] flex-col items-center justify-center gap-[3px] text-[12.5px]', focusRing, tab === key ? 'font-bold text-[#17643e]' : 'font-medium text-slate-500')}>
          <Icon name={icon} className="h-[23px] w-[23px]" />
          {label}
          {key === 'mensagens' && unread > 0 && (
            <span aria-label={`${unread} por ler`} className="absolute left-[calc(50%+8px)] top-[9px] grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#9b2318] px-1 text-[10.5px] font-bold text-white">{unread}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

/** Aviso temporário acima da navegação inferior. */
export function ExecToastView({ toast, onDismiss }: { toast: ExecToast | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDismiss, 3600);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[78px] z-[80] flex justify-center px-4">
      {toast && (
        <div key={toast.id} role="status" className="flex max-w-[520px] items-center gap-2.5 rounded-xl bg-[#16201b] px-4 py-3 text-[14.5px] text-white shadow-xl">
          <Icon name={toast.offline ? 'cloudOff' : 'check'} className={cx('h-5 w-5', toast.offline ? 'text-[#f5a39b]' : 'text-[#6fd49d]')} />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
