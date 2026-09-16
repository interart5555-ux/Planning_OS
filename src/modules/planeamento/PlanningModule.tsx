import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppTopBar, Button, ConfirmDialog, cx, Icon, sectionLabel, selectBase, selectStyle, TextLink, ToastMessage, type AppSection, type ConfirmOptions } from '../shared/ui';
import { AssignDrawer } from './components/AssignDrawer';
import { CollaboratorView, JobDetailDrawer } from './components/CollaboratorView';
import { Legend, PlanningContext, usePlanning, type PlanningContextValue } from './components/context';
import { DayTimeline } from './components/DayTimeline';
import { MonthCapacity } from './components/MonthCapacity';
import { DragGhost } from './components/Unassigned';
import { useJobDrag } from './components/useJobDrag';
import { WeekGrid } from './components/WeekGrid';
import { lowerFirst, PLANNING_CONFIGS, STATUS_META, statusEmoji, WINDOW_EMOJI } from './config';
import { addDays, addMonths, formatLong, formatMonth, formatWeek, plural, weekDays } from './dates';
import { DEMO_NOW, DEMO_PEOPLE, DEMO_TEAMS, DEMO_TODAY } from './mockData';
import { absencesOn, matchesFilters } from './rules';
import type { JobStatus, PlanFilters, PlanPerson, PlanTeam, PlanView, PlanningAppKey, PlanningConfig, PlanningData, PriorityFilter } from './types';
import { usePlanningModule } from './usePlanningModule';

interface PlanningModuleProps {
  app?: PlanningAppKey | PlanningConfig;
  initialData?: PlanningData;
  people?: PlanPerson[];
  teams?: PlanTeam[];
  /** Data e hora de referência; por omissão a demonstração (12 mar 2026, 10:15). */
  today?: string;
  now?: string;
  userInitials?: string;
  onNavigate?: (section: AppSection) => void;
}

type Panel = { kind: 'assign'; id: string } | { kind: 'detail'; id: string } | null;
const EMPTY_FILTERS: PlanFilters = { teamId: '', status: '', priority: '', hideEmpty: false };

/**
 * Módulo 4 — Planeamento.
 * Atribui, revê e publica o trabalho da equipa; vista da colaboradora com confirmação de leitura.
 */
export default function PlanningModule({ app = 'limpezas', initialData, people = DEMO_PEOPLE, teams = DEMO_TEAMS, today = DEMO_TODAY, now = DEMO_NOW, userInitials = 'PS', onNavigate }: PlanningModuleProps) {
  const config = typeof app === 'string' ? PLANNING_CONFIGS[app] : app;
  const { data, toast, dismissToast, actions } = usePlanningModule({ initialData });

  const [tab, setTab] = useState<'plan' | 'me'>('plan');
  const [view, setView] = useState<PlanView>('day');
  const [date, setDate] = useState(today);
  const [filters, setFilters] = useState<PlanFilters>(EMPTY_FILTERS);
  const [me, setMe] = useState({ personId: people[0]?.id ?? '', view: 'day' as 'day' | 'week', date: today });
  const [panel, setPanel] = useState<Panel>(null);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const { drag, beginDrag, ghostRef, ghostOrigin } = useJobDrag({ data, people, config, actions });

  const ctx = useMemo<PlanningContextValue>(() => ({
    data, config, people, teams, today, now, actions, drag, beginDrag,
    openJob: (id) => setPanel({ kind: 'assign', id }),
    openDetail: (id) => setPanel({ kind: 'detail', id }),
    confirm: setConfirmState,
  }), [data, config, people, teams, today, now, actions, drag, beginDrag]);

  const navigate = (section: AppSection) => {
    if (section === 'planeamento') { setTab('plan'); return; }
    if (onNavigate) onNavigate(section);
    else actions.notify(section === 'equipas' ? '“Equipas” é o Módulo 2.' : section === 'clientes' ? '“Clientes” é o Módulo 3.' : `“${sectionLabel(section)}” fica disponível num passo seguinte.`);
  };

  const unpublished = data.jobs.filter((j) => j.status === 'unpublished').length;
  const publish = () => setConfirmState({
    title: `Publicar ${plural(unpublished, 'alteração', 'alterações')}?`,
    body: `As ${lowerFirst(config.job.plural)} por publicar passam a “Planeado” e ficam visíveis para as ${lowerFirst(config.person.plural)} (simulação, sem notificações reais).`,
    confirmLabel: 'Publicar',
    onConfirm: () => { const n = actions.publish(); actions.notify(`${plural(n, 'alteração publicada', 'alterações publicadas')}.`); },
  });

  const step = (dir: 1 | -1) => setDate((d) => (view === 'day' ? addDays(d, dir) : view === 'week' ? addDays(d, 7 * dir) : addMonths(d, dir)));
  const periodLabel = view === 'day' ? formatLong(date) : view === 'week' ? formatWeek(date) : formatMonth(date);

  // Por defeito mostram-se todas as pessoas; o filtro pode esconder quem não tem trabalho no período.
  const range = view === 'week' ? weekDays(date) : [date];
  const teamPeople = people.filter((p) => !filters.teamId || p.teamId === filters.teamId);
  const visiblePeople = teamPeople.filter((p) => !filters.hideEmpty || range.some((d) =>
    data.jobs.some((j) => j.date === d && j.assignees.some((a) => a.personId === p.id) && matchesFilters(j, filters, data, people, config))
    || absencesOn(data.absences, d, p.id).length > 0));
  const hiddenPeople = teamPeople.filter((p) => !visiblePeople.includes(p));

  return (
    <PlanningContext.Provider value={ctx}>
      <div className="min-h-screen bg-white text-sm text-slate-900 antialiased">
        <AppTopBar active="planeamento" appLabel={config.label} userInitials={userInitials} onNavigate={navigate} notify={actions.notify} />

        <main className="mx-auto max-w-[1240px] px-4 pb-10 pt-5 md:px-8 md:pb-14 md:pt-7">
          <section>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">{config.label} · Planeamento</p>
            <h1 className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight sm:text-[30px]">{tab === 'me' ? 'O meu dia' : 'Planeamento'}</h1>
            <p className="mt-1.5 text-[14.5px] text-slate-600">
              {tab === 'me' ? `Vê o teu plano de ${lowerFirst(config.job.plural)} e confirma a leitura.` : 'Atribui, revê e publica o trabalho da equipa.'}
            </p>
          </section>

          <div role="tablist" aria-label="Vistas do planeamento" className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200">
            {([['plan', 'Planeamento'], ['me', `Vista da ${lowerFirst(config.person.singular)}`]] as const).map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} tabIndex={tab === key ? 0 : -1} onClick={() => setTab(key)}
                onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') setTab(tab === 'plan' ? 'me' : 'plan'); }}
                className={cx('-mb-px whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5', tab === key ? 'border-[#17643e] bg-[#e9f4ee] font-semibold text-[#17643e]' : 'border-transparent font-medium text-slate-600 hover:bg-slate-50')}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'plan' ? (
            <>
              {/* Controlos numa só linha (em telemóvel quebram de forma ordenada). */}
              <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
                <div className="flex h-10 flex-[1_1_100%] items-center rounded-[10px] border border-slate-300 bg-white md:flex-none">
                  <button type="button" aria-label="Anterior" onClick={() => step(-1)} className="grid h-[38px] w-9 place-items-center rounded-[9px] text-slate-600 hover:bg-slate-50"><Icon name="chevronLeft" /></button>
                  <span aria-live="polite" className="min-w-0 flex-1 whitespace-nowrap px-1.5 text-center text-[13.5px] font-medium md:min-w-[176px]">{periodLabel}</span>
                  <button type="button" aria-label="Seguinte" onClick={() => step(1)} className="grid h-[38px] w-9 place-items-center rounded-[9px] text-slate-600 hover:bg-slate-50"><Icon name="chevronRight" /></button>
                </div>
                <Button onClick={() => setDate(today)}>Hoje</Button>
                <div role="group" aria-label="Vista" className="flex h-10 flex-1 rounded-[10px] border border-slate-300 bg-white p-[3px] md:flex-none">
                  {(['day', 'week', 'month'] as const).map((v) => (
                    <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
                      className="min-w-[74px] flex-1 rounded-[7px] px-3 text-[13.5px] font-medium text-slate-600 aria-pressed:bg-[#17643e] aria-pressed:font-semibold aria-pressed:text-white">
                      {{ day: 'Dia', week: 'Semana', month: 'Mês' }[v]}
                    </button>
                  ))}
                </div>
                <span className="hidden flex-1 md:block" />
                <FiltersButton filters={filters} onChange={setFilters} />
                <Button variant="primary" icon="send" disabled={!unpublished} onClick={publish} className="flex-[1_1_100%] md:flex-none">
                  Publicar alterações
                  {unpublished > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 text-[11.5px] font-bold text-[#17643e]">{unpublished}</span>}
                </Button>
              </div>

              {view === 'day' && <DayTimeline date={date} filters={filters} visiblePeople={visiblePeople} hiddenPeople={hiddenPeople} />}
              {view === 'week' && <WeekGrid date={date} filters={filters} visiblePeople={visiblePeople} hiddenPeople={hiddenPeople} />}
              {view === 'month' && <MonthCapacity date={date} />}
              {/* Legenda no fundo do cronograma. */}
              {view !== 'month' && <Legend />}
              {view !== 'month' && !visiblePeople.length && (
                <p className="mt-3 flex gap-2 rounded-[10px] bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-600">
                  <Icon name="info" className="mt-px h-4 w-4 text-slate-500" />
                  Nenhuma {lowerFirst(config.person.singular)} com {lowerFirst(config.job.plural)} neste período. Usa “Filtros” para mostrar todas.
                </p>
              )}
            </>
          ) : (
            <CollaboratorView
              personId={me.personId}
              view={me.view}
              date={me.date}
              onChange={(next) => setMe((m) => ({ ...m, ...next }))}
              onBack={() => setTab('plan')}
            />
          )}
        </main>

        {panel?.kind === 'assign' && <AssignDrawer key={panel.id} jobId={panel.id} onClose={() => setPanel(null)} />}
        {panel?.kind === 'detail' && <JobDetailDrawer key={panel.id} jobId={panel.id} onClose={() => setPanel(null)} />}
        {confirmState && <ConfirmDialog options={confirmState} onClose={() => setConfirmState(null)} />}
        <ToastMessage toast={toast} onDismiss={dismissToast} />
        <DragGhost drag={drag} ghostRef={ghostRef} origin={ghostOrigin} />
      </div>
    </PlanningContext.Provider>
  );
}

/** Botão "Filtros" com painel: equipa, estado, prioridade e pessoas sem trabalho. */
function FiltersButton({ filters, onChange }: { filters: PlanFilters; onChange: (f: PlanFilters) => void }) {
  const { config, teams } = usePlanning();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const count = (filters.teamId ? 1 : 0) + (filters.status ? 1 : 0) + (filters.priority && config.stays ? 1 : 0) + (filters.hideEmpty ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);

  return (
    <div ref={wrap} className="relative">
      <Button icon="filter" aria-expanded={open} aria-controls="planning-filters" onClick={() => setOpen((v) => !v)}>
        Filtros{count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#17643e] px-1.5 text-[11.5px] font-bold text-white">{count}</span>}
      </Button>
      {open && (
        <div id="planning-filters" role="dialog" aria-label="Filtros" className="absolute right-0 top-full z-30 mt-1.5 flex w-[280px] flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xl">
          <label className="text-[12.5px] font-medium text-slate-700">Equipa
            <select value={filters.teamId} onChange={(e) => onChange({ ...filters, teamId: e.target.value })} className={`${selectBase} mt-1`} style={selectStyle}>
              <option value="">Todas as equipas</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="text-[12.5px] font-medium text-slate-700">Estado
            <select value={filters.status} onChange={(e) => onChange({ ...filters, status: e.target.value })} className={`${selectBase} mt-1`} style={selectStyle}>
              <option value="">Todos os estados</option>
              {(Object.keys(STATUS_META) as JobStatus[]).map((s) => <option key={s} value={s}>{statusEmoji(s, config)} {STATUS_META[s].label}</option>)}
              <option value="conflict">{statusEmoji('conflict', config)} Com conflito</option>
            </select>
          </label>
          {config.stays && (
            <label className="text-[12.5px] font-medium text-slate-700">Prioridade
              <select value={filters.priority} onChange={(e) => onChange({ ...filters, priority: e.target.value as PriorityFilter })} className={`${selectBase} mt-1`} style={selectStyle}>
                <option value="">Todas as prioridades</option>
                <option value="high">Alta · entrada no mesmo dia</option>
                <option value="normal">Normal · só saída</option>
                <option value="offWindow">{WINDOW_EMOJI} Fora do horário do {lowerFirst(config.location)}</option>
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="h-[18px] w-[18px] accent-[#17643e]" checked={filters.hideEmpty} onChange={(e) => onChange({ ...filters, hideEmpty: e.target.checked })} />
            Esconder {lowerFirst(config.person.plural)} sem {lowerFirst(config.job.plural)}
          </label>
          <TextLink className="self-start" onClick={() => { onChange(EMPTY_FILTERS); close(); }}>Limpar filtros</TextLink>
        </div>
      )}
    </div>
  );
}
