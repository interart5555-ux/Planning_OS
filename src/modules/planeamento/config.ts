import type { JobStatus, PlanningAppKey, PlanningConfig } from './types';

export const PLANNING_CONFIGS: Record<PlanningAppKey, PlanningConfig> = {
  limpezas: {
    key: 'limpezas',
    label: 'Limpezas',
    job: { singular: 'Limpeza', plural: 'Limpezas' },
    person: { singular: 'Colaboradora', plural: 'Colaboradoras' },
    location: 'Alojamento',
    unit: 'Unidade',
    ical: true,
    stays: true,
    progressEmoji: '🧹',
    capacity: {
      title: 'Saídas por dia',
      subtitle: 'Análise de saídas (check-outs) e carga de trabalho da equipa.',
      metric: ['saída', 'saídas'],
      scopeNote: 'só saídas (check-outs), sem entradas',
      perPersonDay: 3,
    },
  },
  formacao: {
    key: 'formacao',
    label: 'Formação',
    job: { singular: 'Sessão', plural: 'Sessões' },
    person: { singular: 'Formadora', plural: 'Formadoras' },
    location: 'Instalação',
    unit: 'Sala',
    ical: false,
    stays: false,
    progressEmoji: '📚',
    capacity: {
      title: 'Sessões por dia',
      subtitle: 'Análise de sessões agendadas e carga das formadoras.',
      metric: ['sessão', 'sessões'],
      scopeNote: 'sessões agendadas',
      perPersonDay: 3,
    },
  },
  manutencao: {
    key: 'manutencao',
    label: 'Manutenção',
    job: { singular: 'Intervenção', plural: 'Intervenções' },
    person: { singular: 'Técnico', plural: 'Técnicos' },
    location: 'Edifício',
    unit: 'Fração',
    ical: false,
    stays: false,
    progressEmoji: '🔧',
    capacity: {
      title: 'Intervenções por dia',
      subtitle: 'Análise de intervenções agendadas e carga dos técnicos.',
      metric: ['intervenção', 'intervenções'],
      scopeNote: 'intervenções agendadas',
      perPersonDay: 3,
    },
  },
};

/** Cronograma diário: 08:00–20:00. */
export const DAY_START_HOUR = 8;
export const DAY_HOURS = 12;

export const STATUS_META: Record<JobStatus, { label: string; card: string; dot: string; emoji: string }> = {
  // Cinzento até estar confirmado; confirmado em verde pastel.
  unpublished: { label: 'Por publicar', card: 'border-[#cfd5dc] bg-[#f1f3f5] text-[#3d444d]', dot: '#9aa1ab', emoji: '📝' },
  planned: { label: 'Planeado', card: 'border-[#c3cad2] bg-[#eceff2] text-[#343b43]', dot: '#6b7280', emoji: '🗓️' },
  confirmed: { label: 'Confirmado', card: 'border-[#a6d3b6] bg-[#dcefe3] text-[#14532f]', dot: '#17643e', emoji: '👍' },
  in_progress: { label: 'Em curso', card: 'border-[#b6d0f0] bg-[#e1edfb] text-[#1f4d85]', dot: '#3b82c4', emoji: '▶️' },
  done: { label: 'Concluído', card: 'border-[#cfe5d7] bg-[#f3faf5] text-[#3b6a4f]', dot: '#8fc4a4', emoji: '✅' },
  late: { label: 'Em atraso', card: 'border-[#e8948c] bg-[#fbd6d2] text-[#8f1d15]', dot: '#c9302a', emoji: '⏰' },
};

/** Alertas (conflito e fora do horário) usam sempre a exclamação. */
export const ALERT_EMOJI = '⚠️';
export const CONFLICT_EMOJI = ALERT_EMOJI;
/** Fora do horário do alojamento. */
export const WINDOW_EMOJI = ALERT_EMOJI;
/** Etiqueta de alerta: texto branco sobre preto. */
export const ALERT_TAG = 'inline-flex max-w-full shrink-0 items-center gap-[3px] overflow-hidden text-ellipsis whitespace-nowrap rounded bg-[#111] px-[5px] font-semibold text-white';

/** Emojis das linhas do cartão (2 horário · 3 alojamento · 4 pessoa/equipa · 5 horário flexível e informação). */
export const LINE_EMOJI = { time: '🕐', place: '🏠', person: '👤', team: '👥', flex: '↔️', info: '🔑' } as const;

/** Emoji do estado (ou do conflito); "Em curso" usa o da aplicação. */
export const statusEmoji = (status: JobStatus | 'conflict', config: Pick<PlanningConfig, 'progressEmoji'>): string =>
  status === 'conflict' ? CONFLICT_EMOJI : status === 'in_progress' ? config.progressEmoji : STATUS_META[status].emoji;

/** Encaixe ao arrastar e redimensionar (minutos). */
export const SNAP_MINUTES = 15;

/** Cartão com conflito (ausência ou sobreposição): laranja. */
export const CONFLICT_CARD = 'border-[#f2b57a] bg-[#fde3c8] text-[#7a3d0b]';

/** Ausência: tracejado discreto. */
export const ABSENCE_CARD =
  'border border-dashed border-[#efbdb7] text-[#9b4a42] bg-[repeating-linear-gradient(135deg,#fbecea_0_6px,#ffffff_6px_12px)]';

export const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);
