/**
 * Módulo 4 — Planeamento (núcleo AppOS)
 *
 * Gere trabalhos operacionais: data, horário, duração, local, unidade, equipa,
 * colaboradores, estado, disponibilidade, conflitos e publicação.
 * A aplicação ativa define a linguagem (Limpezas: limpeza, alojamento, iCal…).
 *
 * Simulação visual: dados em memória, sem iCal real nem publicação real.
 */

export type PlanningAppKey = 'limpezas' | 'formacao' | 'manutencao';

export interface PlanningConfig {
  key: PlanningAppKey;
  label: string;
  /** Trabalho operacional, ex.: "Limpeza". */
  job: { singular: string; plural: string };
  /** Quem executa, ex.: "Colaboradora". */
  person: { singular: string; plural: string };
  location: string;
  unit: string;
  /** Origem iCal disponível nesta aplicação. */
  ical: boolean;
  /**
   * Trabalho ligado a estadias (saídas e entradas de hóspedes): ativa a
   * prioridade e o cumprimento do horário do alojamento.
   */
  stays: boolean;
  /** Emoji do estado "Em curso" nesta aplicação (ex.: 🧹 em Limpezas). */
  progressEmoji: string;
  capacity: {
    title: string;
    subtitle: string;
    /** Métrica contada na vista mensal, ex.: ["saída", "saídas"]. */
    metric: [string, string];
    /** Nota junto ao gráfico, ex.: "só saídas (check-outs), sem entradas". */
    scopeNote: string;
    /** Trabalhos que uma pessoa consegue fazer por dia (estimativa). */
    perPersonDay: number;
  };
}

/**
 * - unpublished: alterado e ainda não publicado (laranja claro)
 * - planned: publicado, a aguardar confirmação de leitura (amarelo pastel)
 * - confirmed: leitura confirmada (verde escuro)
 * - in_progress: em curso (azul claro)
 * - done: concluído (verde muito suave)
 * - late: em atraso (vermelho claro)
 */
export type JobStatus = 'unpublished' | 'planned' | 'confirmed' | 'in_progress' | 'done' | 'late';

export type JobSource = 'ical' | 'manual';

export interface Assignment {
  personId: string;
  /** Participação em horas. */
  hours: number;
}

export interface Job {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  start: string;
  /** HH:MM */
  end: string;
  location: string;
  unit: string;
  /** Ex.: "T2 · 4 hóspedes". */
  typology: string;
  /** Equipa por defeito do local/unidade. */
  teamId: string;
  /** Vazio = "Por atribuir". */
  assignees: Assignment[];
  status: JobStatus;
  /** Só trabalhos manuais podem ser eliminados. */
  source: JobSource;
  platform: string | null;
  /** Dia da saída (check-out). Uma limpeza sem entrada nesse dia pode passar para depois. */
  stayDate: string;
  /** Há entrada (check-in) de hóspedes no mesmo dia da saída → prioridade alta. */
  checkin: boolean;
  /** Horário por defeito da unidade, vindo de Clientes (Local → Unidade). */
  stayTimes: StayTimes;
}

export interface StayTimes {
  /** HH:MM — saída dos hóspedes. */
  checkout: string;
  /** HH:MM — entrada dos hóspedes seguintes. */
  checkin: string;
}

/** Ausência vinda do módulo Equipas (dia inteiro, vários dias ou por horas). */
export interface PlanAbsence {
  id: string;
  personId: string;
  type: string;
  start: string;
  end: string;
  allDay: boolean;
  from?: string;
  to?: string;
}

export interface PlanPerson {
  id: string;
  name: string;
  initials: string;
  teamId: string;
  /** Horas de trabalho por dia. */
  capacity: number;
}

export interface PlanTeam {
  id: string;
  name: string;
}

export interface PlanningData {
  jobs: Job[];
  absences: PlanAbsence[];
}

export type PlanView = 'day' | 'week' | 'month';

export type PriorityFilter = '' | 'high' | 'normal' | 'offWindow';

export interface PlanFilters {
  teamId: string;
  /** '' | JobStatus | 'conflict' */
  status: string;
  priority: PriorityFilter;
  /** Por defeito mostram-se todas as pessoas, mesmo sem trabalho. */
  hideEmpty: boolean;
}
