import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, IconButton, Pill, selectBase, selectStyle, inputBase } from '../../shared/ui';
import { lower } from '../appConfigs';
import { CALENDAR_PLATFORMS, calendarStatus, hasUrl, nowLabel, plural } from '../format';
import { calendarDuplicate, calendarSummary, simulatedSyncOk } from '../rules';
import { newId } from '../useClientsModule';
import type { CalendarPlatform, Unit, UnitCalendar } from '../types';
import { useClients } from './context';
import { Note, TagChip } from './parts';

export type CalendarPatch = Partial<Pick<UnitCalendar, 'status' | 'lastSync' | 'imported'>>;

/**
 * Sincronização simulada de calendários. `apply` recebe o resultado; se o
 * componente desmontar a meio, o resultado vai para `fallback` (ex.: o
 * rascunho do alojamento quando o painel da unidade já fechou).
 */
export function useCalendarSync(apply: (id: string, patch: CalendarPatch) => void, fallback?: (id: string, patch: CalendarPatch) => void, delayMs = 1200) {
  const [syncing, setSyncing] = useState<string[]>([]);
  const target = useRef({ apply, fallback, mounted: true });
  target.current.apply = apply;
  target.current.fallback = fallback;
  useEffect(() => {
    const t = target.current;
    t.mounted = true;
    return () => { t.mounted = false; };
  }, []);

  const sync = useCallback((calendars: UnitCalendar[], onDone?: (results: Array<UnitCalendar & CalendarPatch>) => void): number => {
    const valid = calendars.filter(hasUrl);
    if (!valid.length) return 0;
    setSyncing((ids) => [...ids, ...valid.map((c) => c.id)]);
    window.setTimeout(() => {
      const t = target.current;
      const results = valid.map((c) => {
        const ok = simulatedSyncOk(c.url);
        const patch: CalendarPatch = { status: ok ? 'connected' : 'error', lastSync: nowLabel(), imported: ok ? 3 + Math.floor(Math.random() * 12) : c.imported };
        (t.mounted ? t.apply : t.fallback)?.(c.id, patch);
        return { ...c, ...patch };
      });
      if (t.mounted) setSyncing((ids) => ids.filter((id) => !valid.some((c) => c.id === id)));
      onDone?.(results);
    }, delayMs);
    return valid.length;
  }, [delayMs]);

  return { syncing, sync };
}

/** Mensagem de resultado da sincronização. */
export function syncMessage(results: UnitCalendar[]): string {
  const errors = results.filter((c) => c.status === 'error').length;
  if (results.length === 1) {
    return errors ? `Não foi possível ler o calendário ${results[0].platform} (simulação).` : `Calendário ${results[0].platform} sincronizado (simulação).`;
  }
  return `${plural(results.length, 'calendário sincronizado', 'calendários sincronizados')}${errors ? ` · ${errors} com erro` : ''} (simulação).`;
}

/** Plataformas de uma unidade com cor por estado. */
export function CalendarChips({ unit, emptyLabel = 'Sem calendário' }: { unit: Unit; emptyLabel?: string | null }) {
  if (!unit.calendars.length) return emptyLabel ? <span className="text-slate-500">{emptyLabel}</span> : null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {unit.calendars.map((c) => {
        const tone = !hasUrl(c) || c.status === 'none' ? 'neutral' : c.status === 'connected' ? 'ok' : 'bad';
        return <TagChip key={c.id} tone={tone} title={calendarStatus(c).label}>{c.platform}{tone === 'bad' ? ' · erro' : ''}</TagChip>;
      })}
    </span>
  );
}

/** "4 ligados · 1 com erro" para cartões e resumos. */
export function CalendarCount({ units }: { units: Unit[] }) {
  const s = calendarSummary(units);
  if (!s.connected && !s.errors) return <span className="text-slate-500">Sem calendários</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {plural(s.connected, 'ligado', 'ligados')}
      {s.errors > 0 && <TagChip tone="bad">{s.errors} com erro</TagChip>}
    </span>
  );
}

interface CalendarEditorProps {
  unit: Unit;
  /** Todas as unidades do local (com a unidade em edição), para detetar duplicados. */
  units: Unit[];
  onChange: (calendars: UnitCalendar[]) => void;
  syncing: string[];
  onSync: (calendar: UnitCalendar) => void;
}

/** Lista de calendários iCal de uma unidade. Vários podem coexistir. */
export function CalendarEditor({ unit, units, onChange, syncing, onSync }: CalendarEditorProps) {
  const { config, actions } = useClients();
  const lastAdded = useRef<string | null>(null);

  useEffect(() => {
    if (!lastAdded.current) return;
    document.getElementById(`cal-url-${lastAdded.current}`)?.focus();
    lastAdded.current = null;
  }, [unit.calendars.length]);

  const patch = (id: string, p: Partial<UnitCalendar>) => onChange(unit.calendars.map((c) => (c.id === id ? { ...c, ...p } : c)));

  const add = () => {
    const platform = CALENDAR_PLATFORMS.find((p) => p !== 'Outro' && !unit.calendars.some((c) => c.platform === p)) ?? 'Outro';
    const calendar: UnitCalendar = { id: newId('k'), platform, url: '', status: 'none', lastSync: null, imported: 0 };
    lastAdded.current = calendar.id;
    onChange([...unit.calendars, calendar]);
  };

  const remove = (c: UnitCalendar) => {
    onChange(unit.calendars.filter((x) => x.id !== c.id));
    actions.notify(`Calendário ${c.platform} removido (por guardar).`);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {unit.calendars.length === 0 && (
        <p className="text-slate-500">Sem calendários. Adiciona um por cada plataforma onde {unit.name || `esta ${lower(config.unit)}`} está anunciada.</p>
      )}
      {unit.calendars.map((c) => {
        const busy = syncing.includes(c.id);
        const status = calendarStatus(c);
        const dup = calendarDuplicate(c, unit, units);
        return (
          <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-[136px_minmax(0,1fr)_auto]">
            <select aria-label="Plataforma" value={c.platform} onChange={(e) => patch(c.id, { platform: e.target.value as CalendarPlatform })} className={`${selectBase} min-h-[38px]`} style={selectStyle}>
              {CALENDAR_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              id={`cal-url-${c.id}`}
              type="url"
              aria-label={`URL iCal ${c.platform}`}
              placeholder="https://…/calendar.ics"
              value={c.url}
              onChange={(e) => patch(c.id, { url: e.target.value, status: 'none' })}
              className={`${inputBase} col-span-2 row-start-2 min-h-[38px] sm:col-span-1 sm:row-start-auto`}
            />
            <div className="flex items-center gap-0.5 justify-self-end">
              <Button size="sm" icon="refresh" loading={busy} onClick={() => (hasUrl(c) ? onSync(c) : actions.notify('Indica o URL iCal antes de sincronizar.'))}>
                {busy ? 'A sincronizar…' : 'Sincronizar agora'}
              </Button>
              <IconButton icon="trash" label={`Remover calendário ${c.platform}`} onClick={() => remove(c)} />
            </div>
            <div className="col-span-full flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-slate-500">
              <Pill tone={status.tone} small>{status.label}</Pill>
              <span>Última sincronização: {c.lastSync ?? '—'}</span>
              {hasUrl(c) && c.status === 'connected' && <span>{plural(c.imported, 'reserva importada', 'reservas importadas')}</span>}
            </div>
            {dup && (
              <Note tone="warn" icon="alert" className="col-span-full">
                Este URL já está {dup.sameUnit ? `repetido nesta ${lower(config.unit)}` : `ligado a ${dup.unitName}`}. As {config.jobs.toLowerCase()} ficariam duplicadas.
              </Note>
            )}
            {!dup && hasUrl(c) && c.status === 'error' && (
              <Note tone="warn" icon="alert" className="col-span-full">Não foi possível ler este calendário. Confirma o URL e sincroniza novamente.</Note>
            )}
          </div>
        );
      })}
      <div><Button size="sm" variant="soft" icon="plus" onClick={add}>Adicionar calendário</Button></div>
    </div>
  );
}
