import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog, cx, type ConfirmOptions } from '../shared/ui';
import { AppBar, ExecToastView, TabBar } from './components/AppChrome';
import { ExecContext, type ExecContextValue } from './components/context';
import { DayList } from './components/DayList';
import { IssueSheet } from './components/IssueSheet';
import { EmptyMain, FinishScreen, JobDetail, RunScreen, SentScreen } from './components/JobScreens';
import { PhoneMessagesTab } from './components/MessagesBits';
import { MessagesTab, PlanTab, ProfileTab } from './components/OtherTabs';
import { useOptionalMessages } from '../mensagens';
import { EXEC_CONFIGS } from './config';
import { DEMO_CLOCK, DEMO_PERSON, DEMO_TODAY } from './mockData';
import { findJob } from './rules';
import type { ExecAppKey, ExecConfig, ExecData, ExecPerson, ExecScreen, ExecTab } from './types';
import { useExecutionModule } from './useExecutionModule';

interface ExecutionModuleProps {
  app?: ExecAppKey | ExecConfig;
  initialData?: ExecData;
  person?: ExecPerson;
  /** Data de referência; por omissão sexta-feira, 13 de março de 2026. */
  today?: string;
  /** Hora simulada ("08:20"); às "09:00" uma limpeza das 08:30 não iniciada fica "Em atraso". */
  clock?: string;
  initialOnline?: boolean;
  className?: string;
}

/**
 * Módulo 5 — Execução de trabalho ("O meu dia" em Limpezas).
 * Mobile-first: consultar o dia, confirmar leitura, iniciar, checklist, quantidades,
 * fotografias e notas simuladas, anomalias, conclusão e modo sem rede.
 */
export default function ExecutionModule({ app = 'limpezas', initialData, person = DEMO_PERSON, today = DEMO_TODAY, clock = DEMO_CLOCK, initialOnline, className }: ExecutionModuleProps) {
  const config = typeof app === 'string' ? EXEC_CONFIGS[app] : app;
  const { data, online, syncing, lastSync, toast, dismissToast, nowMin, actions } = useExecutionModule({ config, today, clock, person, initialData, initialOnline });

  const withMessages = Boolean(useOptionalMessages());
  const [tab, setTabState] = useState<ExecTab>('hoje');
  const [screen, setScreen] = useState<ExecScreen>('list');
  const [jobId, setJobId] = useState<string | null>(null);
  const [date, setDateState] = useState(today);
  const [issueJobId, setIssueJobId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [notesError, setNotesError] = useState(false);
  const focusRequest = useRef(false);

  // O estado "Em atraso" depende da hora simulada: recalcula a cada 30 s.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 30000);
    return () => window.clearInterval(t);
  }, []);

  const go = useCallback((next: ExecScreen, id?: string) => {
    focusRequest.current = true;
    setNotesError(false);
    setScreen(next);
    setJobId(next === 'list' ? null : id ?? null);
  }, []);

  const setTab = useCallback((next: ExecTab) => {
    focusRequest.current = next !== 'hoje';
    if (next === 'hoje' && tab === 'hoje') { setDateState(today); go('list'); return; }
    setTabState(next);
  }, [go, tab, today]);

  const setDate = useCallback((next: string) => {
    setDateState(next);
    // No telemóvel, mudar de dia volta à lista.
    if (window.matchMedia('(max-width: 767px)').matches) { setScreen('list'); setJobId(null); }
  }, []);

  const openJob = useCallback((id: string) => {
    const job = findJob(data, id);
    if (!job) return;
    setTabState('hoje');
    setDateState(job.date);
    go(job.status === 'in_progress' ? 'run' : 'detail', id);
  }, [data, go]);

  const startJob = useCallback((id: string) => {
    const result = actions.start(id);
    if (result.ok) { go('run', id); return; }
    const busy = result.busy;
    setConfirm({
      title: `Já tens uma ${config.job.singular.toLowerCase()} em curso`,
      body: `${busy.place} · ${busy.unit} está em curso. Conclui-a antes de iniciar outra.`,
      confirmLabel: 'Abrir a que está em curso',
      onConfirm: () => go('run', busy.id),
    });
  }, [actions, config.job.singular, go]);

  const send = useCallback((id: string) => {
    const result = actions.send(id);
    if (result.ok) { go('sent', id); return; }
    setNotesError(true);
    requestAnimationFrame(() => {
      const el = document.getElementById('exec-notes');
      el?.scrollIntoView({ block: 'center' });
      el?.focus({ preventScroll: true });
    });
  }, [actions, go]);

  const ctx: ExecContextValue = useMemo(() => ({
    config, person, today, data, online, syncing, lastSync, nowMin, actions,
    tab, screen, date, setDate, setTab, go, openJob, startJob, openIssue: setIssueJobId, focusRequest,
  }), [actions, config, data, date, go, lastSync, nowMin, online, openJob, person, screen, setDate, setTab, startJob, syncing, tab, today]);

  const job = findJob(data, jobId);
  const current = job ? screen : 'list';
  const issueJob = findJob(data, issueJobId);

  let main = <EmptyMain />;
  if (job && current === 'detail') main = <JobDetail job={job} />;
  if (job && current === 'run') main = <RunScreen job={job} />;
  if (job && current === 'finish') main = <FinishScreen job={job} notesError={notesError} onSend={() => send(job.id)} />;
  if (job && current === 'sent') main = <SentScreen job={job} />;

  return (
    <ExecContext.Provider value={ctx}>
      <div className={cx('flex h-[100dvh] flex-col overflow-hidden bg-white text-[15px] leading-[1.45] text-[#15181c] antialiased', className)}>
        <AppBar />
        {tab === 'hoje' ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(330px,380px)_minmax(0,1fr)]">
            <section aria-label={config.home} className={cx('min-h-0 flex-col md:flex md:border-r md:border-[#e6e8ec] md:bg-[#fcfcfb]', current === 'list' ? 'flex' : 'hidden')}>
              <DayList />
            </section>
            <section aria-label="Detalhe" key={`${current}-${jobId ?? ''}`} className={cx('min-h-0 flex-col md:flex', current === 'list' ? 'hidden' : 'flex')}>
              {main}
            </section>
          </div>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col" key={tab}>
            {tab === 'plano' ? <PlanTab /> : tab === 'mensagens' ? (withMessages ? <PhoneMessagesTab /> : <MessagesTab />) : <ProfileTab />}
          </section>
        )}
        <TabBar />
      </div>
      {issueJob && <IssueSheet job={issueJob} onClose={() => setIssueJobId(null)} />}
      {confirm && <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />}
      <ExecToastView toast={toast} onDismiss={dismissToast} />
    </ExecContext.Provider>
  );
}
