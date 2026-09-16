import { DURATION_TOLERANCE } from './config';
import { dayOf, daysAgo, minutesBetween, plural } from './dates';
import type { ApprovalFilters, ApprovalsConfig, ApprovalsPerson, AuditEvent, HistoryFilters, RecordStatus, WorkRecord } from './types';

/** Minutos acima da duração prevista (0 se dentro do previsto). */
export const overrun = (r: WorkRecord): number => Math.max(0, minutesBetween(r.started, r.finished) - r.plannedMin);
export const durationExceeded = (r: WorkRecord): boolean => overrun(r) > DURATION_TOLERANCE;
export const missingTasks = (r: WorkRecord): number => r.tasks.filter((t) => !t).length;

/**
 * Ocorrências que obrigam a revisão pela gestora.
 * Sem nenhuma, uma conclusão completa é aprovada automaticamente.
 */
export function occurrences(r: WorkRecord, config: ApprovalsConfig): string[] {
  const out: string[] = [];
  if (r.issues.length) out.push(r.issues.length === 1 ? 'Anomalia' : plural(r.issues.length, 'anomalia', 'anomalias'));
  if (r.late) out.push('Atraso');
  const miss = missingTasks(r);
  if (miss) out.push(plural(miss, 'tarefa em falta', 'tarefas em falta'));
  if (r.qty.length) out.push(config.qty.label);
  if (durationExceeded(r)) out.push(`Duração excedida (+${overrun(r)} min)`);
  return out;
}

export function statusOf(r: WorkRecord): RecordStatus {
  if (r.review === 'approved') return 'done';
  if (r.review === 'pending') return r.issues.length ? 'anomaly' : r.late ? 'late' : 'review';
  return r.review;
}

export const isPending = (r: WorkRecord): boolean => r.review === 'pending';
export const isFlagged = (status: RecordStatus): boolean => status === 'late' || status === 'anomaly';
export const pendingCount = (records: WorkRecord[]): number => records.filter(isPending).length;
export const isAutoApproved = (r: WorkRecord): boolean => r.auto && r.review === 'approved';

const inPeriod = (r: WorkRecord, period: string, today: string): boolean => !period || daysAgo(r.finished, today) < Number(period);
const newestFirst = (a: WorkRecord, b: WorkRecord): number => b.finished.localeCompare(a.finished);

export function reopenedToday(records: WorkRecord[], today: string): number {
  return records.filter((r) => r.review === 'reopened' && r.audit.some((e) => e.icon === 'sync' && dayOf(e.at) === today)).length;
}

export function autoApprovedCounts(records: WorkRecord[], today: string): { today: number; week: number } {
  const auto = records.filter((r) => r.auto);
  return {
    today: auto.filter((r) => dayOf(r.finished) === today).length,
    week: auto.filter((r) => daysAgo(r.finished, today) < 7).length,
  };
}

/** Lista de Aprovações; "Pendentes" mantém visíveis as tratadas nesta sessão. */
export function approvalsList(records: WorkRecord[], f: ApprovalFilters, acted: ReadonlySet<string>, today: string): WorkRecord[] {
  return records.filter((r) => {
    const st = statusOf(r);
    const statusOk = f.status === 'pending' ? isPending(r) || acted.has(r.id) : !f.status || st === f.status;
    return statusOk && (!f.client || r.client === f.client) && (!f.place || r.place === f.place)
      && (!f.person || r.personId === f.person) && inPeriod(r, f.period, today);
  }).sort(newestFirst);
}

/** Histórico: tudo o que já não espera validação. */
export function historyList(records: WorkRecord[], f: HistoryFilters, people: ApprovalsPerson[], today: string): WorkRecord[] {
  const q = f.q.trim().toLowerCase();
  return records.filter((r) => {
    const st = statusOf(r);
    if (st === 'review' || st === 'anomaly') return false;
    const statusOk = !f.status || st === f.status || (f.status === 'auto' && isAutoApproved(r));
    const name = people.find((p) => p.id === r.personId)?.name ?? '';
    return statusOk && inPeriod(r, f.period, today) && (!f.client || r.client === f.client) && (!f.person || r.personId === f.person)
      && (!q || `${r.place} ${r.unit} ${r.client} ${name} ${r.city}`.toLowerCase().includes(q));
  }).sort(newestFirst);
}

export function placeOptions(records: WorkRecord[], client: string): string[] {
  return [...new Set(records.filter((r) => !client || r.client === client).map((r) => r.place))];
}

export const lastEvent = (r: WorkRecord, icon: AuditEvent['icon']): AuditEvent | undefined => r.audit.filter((e) => e.icon === icon).pop();
