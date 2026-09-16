import { useCallback, useEffect, useRef, useState } from 'react';
import { delayLabel, issueLabel } from './config';
import { minutesOf, plural, timeOf } from './dates';
import { createDemoExecution } from './mockData';
import { canStart, elapsedSeconds, findJob, isJob, jobInProgress, notesRequired, pendingAll, quantityDiff, sameQuantities } from './rules';
import type { ExecConfig, ExecData, ExecJob, ExecPerson, IssueInput } from './types';

export interface ExecToast {
  id: number;
  message: string;
  offline?: boolean;
}

export type StartResult = { ok: true } | { ok: false; busy: ExecJob };
export type SendResult = { ok: true } | { ok: false; reason: 'notes' };

interface Options {
  config: ExecConfig;
  today: string;
  /** Hora simulada de início ("08:20"). */
  clock: string;
  person: ExecPerson;
  initialData?: ExecData;
  initialOnline?: boolean;
}

let seq = 0;
const newId = (prefix: string): string => `${prefix}${Date.now().toString(36)}${(seq += 1)}`;

/** Estado e ações simuladas do Módulo 5 (sem rede real, sem upload, sem geolocalização). */
export function useExecutionModule({ config, today, clock, person, initialData, initialOnline = true }: Options) {
  const [data, setData] = useState<ExecData>(() => initialData ?? createDemoExecution(config, today, person));
  const [online, setOnlineState] = useState(initialOnline);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('08:05');
  const [toast, setToast] = useState<ExecToast | null>(null);
  const clockRef = useRef({ minutes: minutesOf(clock), at: Date.now() });
  const onlineRef = useRef(online);
  onlineRef.current = online;
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => { clockRef.current = { minutes: minutesOf(clock), at: Date.now() }; }, [clock]);

  /** Minutos simulados agora. */
  const nowMin = useCallback(() => clockRef.current.minutes + Math.floor((Date.now() - clockRef.current.at) / 60000), []);

  const notify = useCallback((message: string, offline = false) => setToast({ id: Date.now(), message, offline }), []);
  const dismissToast = useCallback(() => setToast(null), []);
  /** Mensagem com a indicação de que fica guardado quando não há rede. */
  const saved = useCallback((message: string) => {
    if (onlineRef.current) notify(message);
    else notify(`${message} Fica guardado e será sincronizado.`, true);
  }, [notify]);

  /** Registo do histórico (sem efeitos: pode correr dentro de um updater). */
  const event = useCallback((text: string, tone: 'neutral' | 'ok' | 'bad' = 'neutral') =>
    ({ id: newId('e'), time: timeOf(nowMin()), text, tone, synced: onlineRef.current }), [nowMin]);

  const patch = useCallback((id: string, fn: (job: ExecJob) => ExecJob) => {
    setData((d) => ({ ...d, items: d.items.map((i) => (isJob(i) && i.id === id ? fn(i) : i)) }));
    if (onlineRef.current) setLastSync(timeOf(nowMin()));
  }, [nowMin]);

  const confirmRead = useCallback((id: string) => {
    const job = findJob(dataRef.current, id);
    if (!job || job.status !== 'planned') return;
    patch(id, (j) => ({ ...j, status: 'confirmed', events: [...j.events, event('Leitura confirmada')] }));
    saved(`Leitura confirmada · ${job.place} passou a Confirmado.`);
  }, [event, patch, saved]);

  const toggleCheck = useCallback((id: string, list: 'prep' | 'tasks', index: number, value: boolean) => {
    patch(id, (j) => ({ ...j, [list]: j[list].map((v, i) => (i === index ? value : v)) }));
    const job = findJob(dataRef.current, id);
    if (list === 'tasks' && value && job?.status === 'in_progress' && job.tasks.every((v, i) => v || i === index)) {
      notify(`Todas as tarefas concluídas. Podes ${config.finish.toLowerCase()}.`);
    }
  }, [config.finish, notify, patch]);

  const start = useCallback((id: string): StartResult => {
    const busy = jobInProgress(dataRef.current);
    if (busy && busy.id !== id) return { ok: false, busy };
    const job = findJob(dataRef.current, id);
    if (!job || !canStart(job, today)) return { ok: true };
    patch(id, (j) => ({
      ...j,
      status: 'in_progress',
      startedAt: nowMin(),
      startedAtMs: Date.now(),
      events: [...j.events, ...(j.status === 'planned' ? [event('Leitura confirmada')] : []), event(`${config.job.singular} iniciada`)],
    }));
    saved(`${config.job.singular} iniciada · Em curso.`);
    return { ok: true };
  }, [config.job.singular, event, nowMin, patch, saved, today]);

  const changeQty = useCallback((id: string, key: string, delta: number) => {
    patch(id, (j) => (j.qty ? { ...j, qty: { ...j.qty, [key]: Math.max(0, j.qty[key] + delta) } } : j));
  }, [patch]);

  const qtyEventText = useCallback((j: ExecJob) => {
    const diff = quantityDiff(j.qty, j.plannedQty, config);
    return `${config.quantities.title}: ${diff.length ? `diferença registada (${diff.join(', ')})` : 'quantidades confirmadas'}`;
  }, [config]);

  const saveQty = useCallback((id: string) => {
    const job = findJob(dataRef.current, id);
    if (!job?.qty) return;
    const diff = quantityDiff(job.qty, job.plannedQty, config);
    patch(id, (j) => ({ ...j, qtySaved: j.qty ? { ...j.qty } : null, events: [...j.events, event(qtyEventText(j))] }));
    saved(diff.length ? `Diferença registada: ${diff.join(', ')} (simulação).` : 'Quantidades confirmadas.');
  }, [config, event, patch, qtyEventText, saved]);

  const addPhoto = useCallback((id: string) => {
    const job = findJob(dataRef.current, id);
    if (!job) return;
    const kind = job.photos.length;
    patch(id, (j) => ({ ...j, photos: [...j.photos, { id: newId('ph'), kind }], events: [...j.events, event(`Fotografia adicionada (${config.photoKinds[kind % config.photoKinds.length]})`)] }));
    saved('Fotografia adicionada (simulada).');
  }, [config.photoKinds, event, patch, saved]);

  const removePhoto = useCallback((id: string, photoId: string) => {
    patch(id, (j) => ({ ...j, photos: j.photos.filter((p) => p.id !== photoId) }));
    notify('Fotografia removida.');
  }, [notify, patch]);

  const setNotes = useCallback((id: string, notes: string) => patch(id, (j) => ({ ...j, notes })), [patch]);

  const addIssue = useCallback((id: string, input: IssueInput) => {
    const text = input.type === 'atraso' && input.delayMin ? `Atraso registado (${delayLabel(input.delayMin)})` : `Anomalia registada: ${issueLabel(input.type)}`;
    patch(id, (j) => ({
      ...j,
      issues: [...j.issues, { id: newId('i'), ...input, description: input.description.trim(), time: timeOf(nowMin()), synced: onlineRef.current }],
      events: [...j.events, event(text, 'bad')],
    }));
    saved(`${input.type === 'atraso' ? 'Atraso registado' : 'Anomalia registada'} · a ${config.manager} vai ver o aviso.`);
  }, [config.manager, event, nowMin, patch, saved]);

  const send = useCallback((id: string): SendResult => {
    const job = findJob(dataRef.current, id);
    if (!job) return { ok: true };
    if (notesRequired(job, config)) return { ok: false, reason: 'notes' };
    patch(id, (j) => {
      const extra = [];
      if (j.plannedQty && !sameQuantities(j.qty, j.qtySaved, config)) extra.push(event(qtyEventText(j)));
      if (j.notes.trim()) extra.push(event(`Nota para a ${config.manager}: “${j.notes.trim()}”`));
      extra.push(event(onlineRef.current ? 'Conclusão enviada' : 'Conclusão guardada no telemóvel', 'ok'));
      return {
        ...j,
        status: 'done',
        qtySaved: j.plannedQty && j.qty ? { ...j.qty } : j.qtySaved,
        durationSec: Math.max(60, Math.round(elapsedSeconds(j, Date.now()))),
        finishedAt: nowMin(),
        events: [...j.events, ...extra],
      };
    });
    if (onlineRef.current) notify(`${config.job.singular} concluída e enviada à ${config.manager}.`);
    else notify('Conclusão guardada. Será enviada quando houver ligação.', true);
    return { ok: true };
  }, [config, event, nowMin, notify, patch, qtyEventText]);

  const syncTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(syncTimer.current), []);

  /** Simula perda e reposição de rede; ao voltar, sincroniza o que ficou pendente. */
  const setOnline = useCallback((value: boolean) => {
    if (value === onlineRef.current) return;
    onlineRef.current = value;
    setOnlineState(value);
    if (!value) { notify('Sem rede. Podes continuar: tudo fica guardado no telemóvel.', true); return; }
    const pending = pendingAll(dataRef.current);
    if (!pending) { notify('Ligação reposta.'); return; }
    setSyncing(true);
    syncTimer.current = window.setTimeout(() => {
      setData((d) => ({
        ...d,
        items: d.items.map((i) => (isJob(i) ? { ...i, events: i.events.map((e) => ({ ...e, synced: true })), issues: i.issues.map((x) => ({ ...x, synced: true })) } : i)),
      }));
      setSyncing(false);
      setLastSync(timeOf(nowMin()));
      notify(`${plural(pending, 'registo sincronizado', 'registos sincronizados')} com a ${config.manager}.`);
    }, 1600);
  }, [config.manager, notify, nowMin]);

  const markMessagesRead = useCallback(() => {
    setData((d) => (d.messages.some((m) => m.unread) ? { ...d, messages: d.messages.map((m) => ({ ...m, unread: false })) } : d));
  }, []);

  const reset = useCallback(() => {
    window.clearTimeout(syncTimer.current);
    setData(createDemoExecution(config, today, person));
    onlineRef.current = true;
    setOnlineState(true);
    setSyncing(false);
    notify('Dados de demonstração repostos.');
  }, [config, notify, person, today]);

  return {
    data, online, syncing, lastSync, toast, dismissToast, nowMin,
    actions: { confirmRead, toggleCheck, start, changeQty, saveQty, addPhoto, removePhoto, setNotes, addIssue, send, setOnline, markMessagesRead, reset, notify },
  };
}

export type ExecActions = ReturnType<typeof useExecutionModule>['actions'];
