import type { IconName } from '../shared/ui';
import type { ApprovalsAppKey, ApprovalsConfig, AuditTone, RecordStatus, ReopenState, Viewer, ViewerRole } from './types';

export const APPROVALS_CONFIGS: Record<ApprovalsAppKey, ApprovalsConfig> = {
  limpezas: {
    key: 'limpezas', label: 'Limpezas', job: { singular: 'Limpeza', plural: 'Limpezas' }, history: 'Histórico de limpezas',
    location: { singular: 'Alojamento', plural: 'alojamentos' }, unit: 'Unidade',
    person: { singular: 'Colaborador', plural: 'Colaboradores', feminine: 'colaboradora' },
    qty: { label: 'Roupa em falta', item: ['peça', 'peças'], none: 'Nenhuma', missingOnly: true },
    tasks: ['Quartos: limpeza e arrumação', 'Casas de banho: limpeza e desinfeção', 'Cozinha: limpeza de superfícies', 'Sala: limpeza e arrumação', 'Repor consumíveis', 'Verificar danos', 'Deixar portas e janelas em segurança'],
    photoKinds: ['Quarto', 'Casa de banho', 'Sala', 'Cozinha', 'Varanda', 'Entrada'],
    places: [['Rosário 123', 'AP 2 Piso', 'Lisboa'], ['Alfama Views', 'Estúdio B', 'Lisboa'], ['Riverside Flats', 'AP 1A', 'Porto'], ['Ocean View', 'AP 3', 'Cascais'], ['Central Apartments', 'AP 5', 'Lisboa'], ['Graça House', 'T1', 'Lisboa'], ['Beach House', 'AP 1', 'Cascais']],
  },
  formacao: {
    key: 'formacao', label: 'Formação', job: { singular: 'Sessão', plural: 'Sessões' }, history: 'Histórico de sessões',
    location: { singular: 'Instalação', plural: 'instalações' }, unit: 'Sala',
    person: { singular: 'Formador', plural: 'Formadores', feminine: 'formadora' },
    qty: { label: 'Diferença de materiais', item: ['unidade', 'unidades'], none: 'Sem diferenças', missingOnly: false },
    tasks: ['Registar presenças', 'Apresentar objetivos', 'Parte teórica', 'Exercício prático', 'Avaliação da sessão', 'Recolher folhas de presença', 'Arrumar a sala'],
    photoKinds: ['Sala', 'Presenças', 'Quadro', 'Grupo', 'Materiais', 'Entrada'],
    places: [['Centro Lisboa', 'Sala 2', 'Lisboa'], ['Polo Alcântara', 'Sala 3', 'Lisboa'], ['Centro Porto', 'Sala 1', 'Porto'], ['Polo Cascais', 'Auditório', 'Cascais'], ['Centro Lisboa', 'Laboratório', 'Lisboa'], ['Polo Oriente', 'Sala 1', 'Lisboa'], ['Polo Cascais', 'Sala 2', 'Cascais']],
  },
  manutencao: {
    key: 'manutencao', label: 'Manutenção', job: { singular: 'Intervenção', plural: 'Intervenções' }, history: 'Histórico de intervenções',
    location: { singular: 'Edifício', plural: 'edifícios' }, unit: 'Fração',
    person: { singular: 'Técnico', plural: 'Técnicos', feminine: 'técnica' },
    qty: { label: 'Diferença de materiais', item: ['unidade', 'unidades'], none: 'Sem diferenças', missingOnly: false },
    tasks: ['Diagnóstico do problema', 'Isolar a zona de trabalho', 'Reparação ou substituição', 'Testar o funcionamento', 'Limpar a zona de trabalho', 'Verificar outros danos', 'Deixar a fração em segurança'],
    photoKinds: ['Antes', 'Depois', 'Peça', 'Zona', 'Quadro elétrico', 'Entrada'],
    places: [['Edifício Aurora', 'Fração B', 'Lisboa'], ['Torre Norte', 'Fração 4D', 'Lisboa'], ['Edifício Douro', 'Fração A', 'Porto'], ['Condomínio Mar', 'Fração 3', 'Cascais'], ['Edifício Tejo', 'Fração 5', 'Lisboa'], ['Edifício Graça', 'Fração T1', 'Lisboa'], ['Condomínio Praia', 'Fração 1', 'Cascais']],
  },
};

/** Minutos acima da duração prevista tolerados antes de contar como ocorrência. */
export const DURATION_TOLERANCE = 30;

export const VIEWERS: Record<ViewerRole, Viewer> = {
  gestora: { name: 'Carla Mendes', initials: 'CM', role: 'Gestora', canReview: true },
  admin: { name: 'Ana Rocha', initials: 'AR', role: 'Administradora', canReview: true },
  colab: { name: 'Miguel Ferreira', initials: 'MF', role: 'Colaborador', canReview: false },
};

export const STATUS_META: Record<RecordStatus, { label: string; icon: IconName; pill: string }> = {
  review: { label: 'Por rever', icon: 'clock', pill: 'border-[#f1dfa4] bg-[#fdf6de] text-[#7a5406]' },
  done: { label: 'Concluída', icon: 'checkCircle', pill: 'border-[#c3e3cf] bg-[#e7f5ec] text-[#17643e]' },
  late: { label: 'Em atraso', icon: 'triangle', pill: 'border-[#f4c3bd] bg-[#fdecea] text-[#b42318]' },
  anomaly: { label: 'Com anomalia', icon: 'triangle', pill: 'border-[#f4c3bd] bg-[#fdecea] text-[#b42318]' },
  reopened: { label: 'Reaberta', icon: 'sync', pill: 'border-[#d9cff7] bg-[#efeafd] text-[#5b3fb0]' },
  correction: { label: 'Correção pedida', icon: 'edit', pill: 'border-[#efc98a] bg-[#fbe7c6] text-[#8a4b06]' },
  archived: { label: 'Arquivada', icon: 'archive', pill: 'border-[#d8dce2] bg-[#eef0f3] text-[#4b5563]' },
};

export const REOPEN_OPTIONS: Array<[ReopenState, string]> = [
  ['Planeado', 'Planeado · volta ao Planeamento'],
  ['Em curso', 'Em curso · volta à Execução'],
];

export const APPROVAL_STATUS_OPTIONS: Array<[string, string]> = [
  ['pending', 'Pendentes'], ['review', 'Por rever'], ['anomaly', 'Com anomalia'], ['late', 'Em atraso'],
  ['correction', 'Correção pedida'], ['done', 'Concluída'], ['reopened', 'Reaberta'], ['', 'Todos os estados'],
];

export const HISTORY_STATUS_OPTIONS: Array<[string, string]> = [
  ['', 'Todos os estados'], ['done', 'Concluída'], ['auto', 'Aprovada automaticamente'], ['late', 'Em atraso'],
  ['reopened', 'Reaberta'], ['archived', 'Arquivada'], ['correction', 'Correção pedida'],
];

export const APPROVAL_PERIODS: Array<[string, string]> = [['1', 'Hoje'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['', 'Todo o período']];
export const HISTORY_PERIODS: Array<[string, string]> = [['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias'], ['', 'Todo o período']];

export const AUDIT_TONES: Record<AuditTone, string> = {
  '': 'border-slate-200 bg-slate-50 text-slate-600',
  ok: 'border-[#c3e3cf] bg-[#e7f5ec] text-[#17643e]',
  bad: 'border-[#f4c3bd] bg-[#fdecea] text-[#b42318]',
  warn: 'border-[#efc98a] bg-[#fbe7c6] text-[#8a4b06]',
  vio: 'border-[#d9cff7] bg-[#efeafd] text-[#5b3fb0]',
};

/** Todos os trabalhos são femininos: "a limpeza", "esta sessão", "a intervenção". */
export const theJob = (config: ApprovalsConfig): string => `a ${config.job.singular.toLowerCase()}`;
export const thisJob = (config: ApprovalsConfig): string => `esta ${config.job.singular.toLowerCase()}`;
