import { DAY_HOURS, DAY_START_HOUR, lowerFirst } from './config';
import { formatShortDay, minutesOf, timeOf } from './dates';
import type { Assignment, Job, PlanAbsence, PlanFilters, PlanPerson, PlanningConfig, PlanningData } from './types';

export const jobHours = (job: Pick<Job, 'start' | 'end'>): number => (minutesOf(job.end) - minutesOf(job.start)) / 60;

export const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean => aStart < bEnd && bStart < aEnd;

export const absencesOn = (absences: PlanAbsence[], date: string, personId?: string): PlanAbsence[] =>
  absences.filter((a) => (!personId || a.personId === personId) && date >= a.start && date <= a.end);

/** Minutos ocupados por uma ausência dentro do dia de trabalho. */
export function absenceRange(a: PlanAbsence): { from: number; to: number } {
  if (a.allDay || !a.from || !a.to) return { from: DAY_START_HOUR * 60, to: (DAY_START_HOUR + DAY_HOURS) * 60 };
  return { from: minutesOf(a.from), to: minutesOf(a.to) };
}

export const absenceLabel = (a: PlanAbsence): string => `${a.type} · ${a.allDay ? 'Dia inteiro' : `${a.from}–${a.to}`}`;

/**
 * Intervalo de trabalho de uma pessoa num trabalho: começa no início e dura as
 * horas atribuídas (é a largura do cartão na linha dessa pessoa).
 */
export function spanOf(job: Pick<Job, 'start' | 'end' | 'assignees'>, personId: string): { from: number; to: number } {
  const from = minutesOf(job.start);
  const a = job.assignees.find((x) => x.personId === personId);
  return { from, to: a ? from + Math.round(a.hours * 60) : minutesOf(job.end) };
}

/** Trabalhos em curso ou concluídos já não se arrastam nem se esticam. */
export const isMovable = (job: Pick<Job, 'status'>): boolean => job.status !== 'done' && job.status !== 'in_progress';

export interface Conflict {
  kind: 'absence' | 'overlap';
  personId: string;
  text: string;
}

/**
 * Conflitos de um trabalho para as pessoas atribuídas: ausências no horário
 * (bloqueiam a atribuição) e sobreposição com outros trabalhos (aviso).
 */
export function conflictsFor(job: Job, assignees: Assignment[], data: PlanningData, people: PlanPerson[]): Conflict[] {
  const out: Conflict[] = [];
  assignees.forEach(({ personId, hours }) => {
    const person = people.find((p) => p.id === personId);
    if (!person) return;
    const start = minutesOf(job.start);
    const end = start + Math.round(hours * 60);
    absencesOn(data.absences, job.date, personId).forEach((a) => {
      const r = absenceRange(a);
      if (overlaps(start, end, r.from, r.to)) {
        out.push({ kind: 'absence', personId, text: `${person.name} tem uma ausência (${a.type}) ${a.allDay ? 'o dia inteiro' : `das ${a.from} às ${a.to}`}.` });
      }
    });
    data.jobs.forEach((other) => {
      if (other.id === job.id || other.date !== job.date || !other.assignees.some((x) => x.personId === personId)) return;
      const r = spanOf(other, personId);
      if (overlaps(start, end, r.from, r.to)) {
        out.push({ kind: 'overlap', personId, text: `${person.name} já tem ${other.location} das ${other.start} às ${other.end}.` });
      }
    });
  });
  return out;
}

export const hasConflict = (job: Job, data: PlanningData, people: PlanPerson[]): boolean =>
  conflictsFor(job, job.assignees, data, people).length > 0;

export interface SlotCheck {
  /** blocked: ausência (não deixa largar) · overlap: sobreposição (aviso). */
  state: 'ok' | 'blocked' | 'overlap';
  short?: string;
  text?: string;
}

/** Verifica um intervalo para uma pessoa ao arrastar ou esticar um cartão. */
export function checkSlot(personId: string, date: string, from: number, to: number, exceptJobId: string, data: PlanningData, people: PlanPerson[]): SlotCheck {
  const person = people.find((p) => p.id === personId);
  const name = person?.name ?? personId;
  const absence = absencesOn(data.absences, date, personId).find((a) => { const r = absenceRange(a); return overlaps(from, to, r.from, r.to); });
  if (absence) return { state: 'blocked', short: 'Ausência', text: `${name} está ausente (${absenceLabel(absence)}).` };
  const other = data.jobs.find((j) => {
    if (j.id === exceptJobId || j.date !== date || !j.assignees.some((a) => a.personId === personId)) return false;
    const r = spanOf(j, personId);
    return overlaps(from, to, r.from, r.to);
  });
  if (other) return { state: 'overlap', short: 'Sobreposição', text: `Sobreposição com ${other.location} (${other.start}–${other.end}).` };
  return { state: 'ok' };
}

/** Horas livres de uma pessoa num dia, sem contar o trabalho em edição. */
export function freeHours(person: PlanPerson, date: string, exceptJobId: string | null, data: PlanningData): number {
  const used = data.jobs
    .filter((j) => j.date === date && j.id !== exceptJobId)
    .reduce((sum, j) => sum + j.assignees.filter((a) => a.personId === person.id).reduce((s, a) => s + a.hours, 0), 0);
  const absent = absencesOn(data.absences, date, person.id).reduce((sum, a) => {
    const r = absenceRange(a);
    return sum + (r.to - r.from) / 60;
  }, 0);
  return Math.max(0, person.capacity - used - Math.min(absent, person.capacity));
}

/* ------------------------------------------------------------------ */
/* Prioridade e horário do alojamento (só aplicações com estadias)     */
/* ------------------------------------------------------------------ */

type StaysConfig = Pick<PlanningConfig, 'stays' | 'location'>;

/** Há entrada de hóspedes no dia da saída. */
export const hasCheckin = (job: Pick<Job, 'checkin'>, config: Pick<PlanningConfig, 'stays'>): boolean => config.stays && job.checkin;

/** Prioridade alta: saída e entrada no mesmo dia (e a limpeza feita nesse dia). */
export const isHighPriority = (job: Pick<Job, 'checkin' | 'date' | 'stayDate'>, config: Pick<PlanningConfig, 'stays'>, date = job.date): boolean =>
  hasCheckin(job, config) && date === job.stayDate;

/** Alta: só no dia da saída. Normal: nesse dia ou num dia seguinte, se a gestora decidir. */
export const isAllowedDate = (job: Pick<Job, 'checkin' | 'date' | 'stayDate'>, date: string, config: Pick<PlanningConfig, 'stays'>): boolean =>
  date === job.date || (config.stays && !job.checkin && date >= job.stayDate);

export interface WindowCheck {
  /** ok: dentro do horário · flex: sem entrada, pode terminar depois ou noutro dia · bad: fora do horário. */
  level: 'ok' | 'flex' | 'bad';
  short: string;
  text: string;
}

/** Cumprimento do horário por defeito do alojamento para um dia e intervalo. */
export function windowCheck(job: Pick<Job, 'start' | 'end' | 'date' | 'stayDate' | 'checkin' | 'stayTimes'>, config: StaysConfig, date = job.date, from = minutesOf(job.start), to = minutesOf(job.end)): WindowCheck {
  if (!config.stays) return { level: 'ok', short: '', text: '' };
  const { checkout, checkin } = job.stayTimes;
  const later = date > job.stayDate;
  if (!later && from < minutesOf(checkout)) {
    return { level: 'bad', short: 'Antes da saída', text: `Começa às ${timeOf(from)}, antes da saída dos hóspedes (${checkout}).` };
  }
  if (isHighPriority(job, config, date) && to > minutesOf(checkin)) {
    return { level: 'bad', short: 'Depois da entrada', text: `Termina às ${timeOf(to)}, depois da entrada dos novos hóspedes (${checkin}). Prioridade alta: tem de terminar antes.` };
  }
  if (later) {
    return { level: 'flex', short: 'Adiada', text: `Saída a ${formatShortDay(job.stayDate)} sem entrada nesse dia: passada para ${formatShortDay(date)}.` };
  }
  if (to > minutesOf(checkin)) {
    return { level: 'flex', short: 'Flexível', text: `Termina depois das ${checkin}, mas não há entrada neste dia: pode terminar mais tarde.` };
  }
  return { level: 'ok', short: 'No horário', text: `Dentro do horário do ${lowerFirst(config.location)} (${checkout}–${checkin}).` };
}

/** "Saída 11:00 · entrada 15:00", "Saída 11:00 · sem entrada" ou "Saída qui., 12 mar · adiada". */
export function stayLabel(job: Pick<Job, 'date' | 'stayDate' | 'checkin' | 'stayTimes'>, config: Pick<PlanningConfig, 'stays'>): string {
  if (job.date > job.stayDate) return `Saída ${formatShortDay(job.stayDate)} · adiada`;
  return `Saída ${job.stayTimes.checkout} · ${hasCheckin(job, config) ? `entrada ${job.stayTimes.checkin}` : 'sem entrada'}`;
}

/* ------------------------------------------------------------------ */
/* Alterações ao arrastar, esticar e guardar                           */
/* ------------------------------------------------------------------ */

/**
 * Larga um trabalho numa pessoa: vindo de "Por atribuir" fica só com ela;
 * vindo de outra pessoa troca-a (ou junta, se já lá estava). O início muda
 * para `start` e a data para `date` (quando permitido).
 */
export function moveAssignment(job: Job, fromPersonId: string | null, toPersonId: string, start: number, date = job.date): Job {
  let assignees = job.assignees.map((a) => ({ ...a }));
  if (!fromPersonId) assignees = [{ personId: toPersonId, hours: jobHours(job) }];
  else if (fromPersonId !== toPersonId) {
    assignees = assignees.some((a) => a.personId === toPersonId)
      ? assignees.filter((a) => a.personId !== fromPersonId)
      : assignees.map((a) => (a.personId === fromPersonId ? { ...a, personId: toPersonId } : a));
  }
  const shift = start - minutesOf(job.start);
  return { ...job, assignees, date, start: timeOf(start), end: timeOf(minutesOf(job.end) + shift) };
}

/** O fim do trabalho acompanha a pessoa com mais horas (sem passar do fim do dia). */
export function coverLongestHours(job: Job, shrink = false): Job {
  const longest = job.assignees.reduce((m, a) => Math.max(m, a.hours), 0);
  if (!longest) return job;
  const end = Math.min((DAY_START_HOUR + DAY_HOURS) * 60, minutesOf(job.start) + Math.round(longest * 60));
  return shrink || end > minutesOf(job.end) ? { ...job, end: timeOf(end) } : job;
}

/** Estica ou encolhe as horas de uma pessoa (pega direita do cartão). */
export function resizeAssignment(job: Job, personId: string, hours: number): Job {
  return coverLongestHours({ ...job, assignees: job.assignees.map((a) => (a.personId === personId ? { ...a, hours } : a)) }, true);
}

/** Distribui itens por faixas para que não se sobreponham numa linha compacta. */
export function assignLanes<T extends { from: number; to: number }>(items: T[]): { items: Array<T & { lane: number }>; lanes: number } {
  const ends: number[] = [];
  const placed = [...items].sort((a, b) => a.from - b.from).map((item) => {
    let lane = ends.findIndex((e) => e <= item.from);
    if (lane === -1) { lane = ends.length; ends.push(0); }
    ends[lane] = item.to;
    return { ...item, lane };
  });
  return { items: placed, lanes: Math.max(1, ends.length) };
}

export function matchesFilters(job: Job, filters: PlanFilters, data: PlanningData, people: PlanPerson[], config: StaysConfig): boolean {
  if (filters.teamId && job.teamId !== filters.teamId) return false;
  if (filters.status && (filters.status === 'conflict' ? !hasConflict(job, data, people) : job.status !== filters.status)) return false;
  if (filters.priority && config.stays) {
    if (filters.priority === 'high' && !isHighPriority(job, config)) return false;
    if (filters.priority === 'normal' && isHighPriority(job, config)) return false;
    if (filters.priority === 'offWindow' && windowCheck(job, config).level !== 'bad') return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Capacidade mensal (baseada só em saídas / check-outs)               */
/* ------------------------------------------------------------------ */

export interface MonthAnalysis {
  values: number[];
  total: number;
  average: number;
  peak: { day: number; value: number };
  high: { day: number; value: number };
  availablePeople: number;
  capacity: number;
  /** Colaboradoras a reforçar no dia de pico (0 = capacidade suficiente). */
  extraPeople: number;
}

export function analyseMonth(values: number[], year: number, month: number, people: PlanPerson[], absences: PlanAbsence[], perPersonDay: number): MonthAnalysis {
  const total = values.reduce((a, b) => a + b, 0);
  const ranked = values.map((value, i) => ({ day: i + 1, value })).sort((a, b) => b.value - a.value || a.day - b.day);
  const peak = ranked[0];
  const high = ranked[1] ?? ranked[0];
  const peakIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(peak.day).padStart(2, '0')}`;
  // Pessoas sem ausência de dia inteiro no dia de pico.
  const availablePeople = people.filter((p) => !absencesOn(absences, peakIso, p.id).some((a) => a.allDay)).length;
  const capacity = availablePeople * perPersonDay;
  return {
    values,
    total,
    average: values.length ? total / values.length : 0,
    peak,
    high,
    availablePeople,
    capacity,
    extraPeople: Math.max(0, Math.ceil((peak.value - capacity) / perPersonDay)),
  };
}
