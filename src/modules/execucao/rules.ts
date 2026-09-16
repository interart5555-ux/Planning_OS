import { LATE_AFTER_MIN } from './config';
import { minutesOf } from './dates';
import type { DayItem, DisplayStatus, ExecConfig, ExecData, ExecJob, Quantities } from './types';

export const isJob = (item: DayItem): item is ExecJob => item.kind === 'job';

/** "Em atraso": não iniciada 10 min depois da hora prevista (hoje) ou com atraso registado. */
export function displayStatus(item: DayItem, today: string, nowMin: number): DisplayStatus {
  if (!isJob(item)) return 'absence';
  if (item.status === 'planned' || item.status === 'confirmed') {
    if (item.issues.some((i) => i.type === 'atraso')) return 'late';
    if (item.date === today && nowMin > minutesOf(item.start) + LATE_AFTER_MIN) return 'late';
  }
  return item.status;
}

export const itemsOn = (data: ExecData, date: string): DayItem[] =>
  data.items.filter((i) => i.date === date).sort((a, b) => a.start.localeCompare(b.start));

export const findJob = (data: ExecData, id: string | null): ExecJob | undefined =>
  data.items.find((i): i is ExecJob => isJob(i) && i.id === id);

export const jobInProgress = (data: ExecData): ExecJob | undefined =>
  data.items.find((i): i is ExecJob => isJob(i) && i.status === 'in_progress');

export const pendingOf = (job: DayItem): number => (isJob(job) ? job.events.filter((e) => !e.synced).length : 0);
export const pendingAll = (data: ExecData): number => data.items.reduce((n, i) => n + pendingOf(i), 0);

export const countDone = (list: boolean[]): number => list.filter(Boolean).length;
export const missingTasks = (job: ExecJob, config: ExecConfig): string[] => config.tasks.filter((_, i) => !job.tasks[i]);

/** Só no próprio dia e antes de iniciar. */
export const canStart = (job: ExecJob, today: string): boolean => job.date === today && (job.status === 'planned' || job.status === 'confirmed');

export const sameQuantities = (a: Quantities | null, b: Quantities | null, config: ExecConfig): boolean =>
  Boolean(a && b) && config.quantities.items.every((it) => a![it.key] === b![it.key]);

/** "+1 Fronhas, −1 Toalhas de rosto" face ao configurado. */
export function quantityDiff(qty: Quantities | null, planned: Quantities | null, config: ExecConfig): string[] {
  if (!qty || !planned) return [];
  return config.quantities.items
    .filter((it) => qty[it.key] !== planned[it.key])
    .map((it) => {
      const d = qty[it.key] - planned[it.key];
      return `${d > 0 ? '+' : '−'}${Math.abs(d)} ${it.label}`;
    });
}

export const elapsedSeconds = (job: ExecJob, nowMs: number): number =>
  job.durationSec ?? (job.startedAtMs ? (nowMs - job.startedAtMs) / 1000 : 0);

/** Notas obrigatórias quando se envia com tarefas em falta. */
export const notesRequired = (job: ExecJob, config: ExecConfig): boolean => missingTasks(job, config).length > 0 && !job.notes.trim();
