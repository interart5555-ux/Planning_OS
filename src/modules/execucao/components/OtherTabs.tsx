import { useEffect } from 'react';
import { cx, focusRing, Icon } from '../../shared/ui';
import { STATUS_META } from '../config';
import { capitalize, durationShort, formatDay, plural, weekDays } from '../dates';
import { displayStatus, isJob, itemsOn } from '../rules';
import { useExec } from './context';
import { WeekStrip } from './DayList';
import { Notice, ScreenScroll, ScreenTitle } from './parts';

/** Plano da semana (consulta). */
export function PlanTab() {
  const { data, date, today, nowMin, person, openJob } = useExec();
  return (
    <ScreenScroll label="Plano">
      <ScreenTitle>Plano da semana</ScreenTitle>
      <p className="mt-1 text-slate-700">{person.name}</p>
      <WeekStrip />
      {weekDays(date).map((d) => {
        const items = itemsOn(data, d);
        return (
          <section key={d} className="mt-[18px]" aria-label={formatDay(d)}>
            <h3 className={cx('mb-2 text-[14px] font-semibold', d === today ? 'text-[#17643e]' : 'text-slate-700')}>{capitalize(formatDay(d))}{d === today ? ' · hoje' : ''}</h3>
            {!items.length && <p className="text-[14px] text-slate-500">Dia livre</p>}
            {items.map((item) => {
              const status = displayStatus(item, today, nowMin());
              const dot = <span aria-hidden="true" className={cx('h-2.5 w-2.5 shrink-0 rounded-full', STATUS_META[status].dot)} />;
              const row = 'mt-1.5 flex min-h-[58px] w-full items-center gap-3 rounded-xl border border-[#e6e8ec] bg-white px-3 py-2 text-left';
              if (!isJob(item)) {
                return (
                  <div key={item.id} className={row}>
                    <span className="w-12 text-[14px] font-semibold tabular-nums">{item.start}</span>{dot}
                    <span className="min-w-0 flex-1"><b className="block font-semibold">Ausência</b><small className="block text-[13px] text-slate-500">{item.reason}</small></span>
                  </div>
                );
              }
              return (
                <button key={item.id} type="button" onClick={() => openJob(item.id)} className={cx(row, focusRing)}>
                  <span className="w-12 text-[14px] font-semibold tabular-nums">{item.start}</span>{dot}
                  <span className="min-w-0 flex-1">
                    <b className="block truncate font-semibold">{item.place} · {item.unit}</b>
                    <small className="block text-[13px] text-slate-500">{STATUS_META[status].label} · {durationShort(item.start, item.end)}{item.issues.length ? ` · ${plural(item.issues.length, 'aviso', 'avisos')}` : ''}</small>
                  </span>
                  <Icon name="chevronRight" className="h-5 w-5 text-slate-500" />
                </button>
              );
            })}
          </section>
        );
      })}
    </ScreenScroll>
  );
}

export function MessagesTab() {
  const { data, config, actions } = useExec();
  useEffect(() => {
    const t = window.setTimeout(actions.markMessagesRead, 1200);
    return () => window.clearTimeout(t);
  }, [actions.markMessagesRead]);
  return (
    <ScreenScroll label="Mensagens">
      <ScreenTitle>Mensagens</ScreenTitle>
      <p className="mt-1 text-slate-700">Da {config.manager} e da equipa</p>
      {data.messages.map((m) => (
        <article key={m.id} className={cx('mt-3 rounded-[14px] border px-3.5 py-3', m.unread ? 'border-[#cde5d6] bg-[#f7fbf8]' : 'border-[#e6e8ec] bg-white')}>
          <header className="flex justify-between gap-2.5 text-[13px] text-slate-500">
            <b className="font-semibold text-slate-900">{m.from} · {m.role}</b><span>{m.day}, {m.time}</span>
          </header>
          <p className="mt-1">{m.text}</p>
        </article>
      ))}
      <Notice tone="info" icon="info">
        Os avisos que registas ficam no histórico de cada {config.job.singular.toLowerCase()}. A {config.manager} vai consultá-los no Planeamento numa fase posterior.
      </Notice>
    </ScreenScroll>
  );
}

export function ProfileTab() {
  const { person, config, data, online, syncing, lastSync, actions } = useExec();
  const queue = data.items.filter(isJob).flatMap((j) => j.events.filter((e) => !e.synced).map((e) => ({ ...e, where: j.place })));
  return (
    <ScreenScroll label="Perfil">
      <ScreenTitle>Perfil</ScreenTitle>
      <div className="mt-2.5 flex items-center gap-3.5">
        <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-[#17643e] text-[18px] font-semibold text-white">{person.initials}</span>
        <div><b className="text-[17px]">{person.name}</b><p className="text-slate-700">{person.team} · {config.label}</p></div>
      </div>
      <div className="mt-[18px] overflow-hidden rounded-[14px] border border-[#e6e8ec]">
        <div className="flex min-h-[58px] items-center gap-3 px-3.5 py-2.5">
          <span className="min-w-0 flex-1"><b>Ligação à rede</b><small className="block text-[13px] text-slate-500">Simulação: desliga para testar o modo sem rede.</small></span>
          <button type="button" role="switch" aria-checked={online} aria-label="Ligação à rede" onClick={() => actions.setOnline(!online)}
            className={cx('relative h-8 w-[52px] shrink-0 rounded-full transition-colors', online ? 'bg-[#17643e]' : 'bg-[#cfd5dc]', focusRing)}>
            <span aria-hidden="true" className={cx('absolute left-[3px] top-[3px] h-[26px] w-[26px] rounded-full bg-white shadow transition-transform', online && 'translate-x-5')} />
          </button>
        </div>
        <div className="flex min-h-[58px] items-center gap-3 border-t border-[#e6e8ec] px-3.5 py-2.5">
          <span className="min-w-0 flex-1">
            <b>Sincronização</b>
            <small className="block text-[13px] text-slate-500">
              {syncing ? 'A sincronizar…' : queue.length ? plural(queue.length, 'registo por sincronizar', 'registos por sincronizar') : `Tudo sincronizado · última às ${lastSync}`}
            </small>
          </span>
          <Icon name={queue.length ? 'cloudOff' : 'checkCircle'} className="h-5 w-5 text-slate-600" />
        </div>
        {queue.length > 0 && (
          <ol className="px-3.5 pb-3 text-[13.5px] text-slate-700">
            {queue.map((e) => <li key={e.id} className="flex gap-2 py-1"><time className="font-semibold tabular-nums text-slate-900">{e.time}</time><span>{e.where} · {e.text}</span></li>)}
          </ol>
        )}
      </div>
    </ScreenScroll>
  );
}
