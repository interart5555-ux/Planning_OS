import type { IconName } from '../shared/ui';
import type { DisplayStatus, ExecAppKey, ExecConfig, IssueType } from './types';

export const EXEC_CONFIGS: Record<ExecAppKey, ExecConfig> = {
  limpezas: {
    key: 'limpezas', label: 'Limpezas', home: 'O meu dia', job: { singular: 'Limpeza', plural: 'Limpezas' },
    checklist: 'Tarefas de limpeza', evidence: 'Fotografias', addEvidence: 'Adicionar foto',
    start: 'Iniciar limpeza', resume: 'Continuar limpeza', finish: 'Concluir limpeza', send: 'Enviar conclusão', manager: 'gestora',
    prep: ['Confirmar acesso ao alojamento', 'Verificar códigos ou chaves', 'Levar material de limpeza', 'Levar sacos de roupa para lavandaria', 'Rever notas da gestora'],
    tasks: ['Quartos: limpeza e arrumação', 'Casas de banho: limpeza e desinfeção', 'Cozinha: limpeza de superfícies', 'Sala: limpeza e arrumação', 'Repor consumíveis', 'Verificar danos', 'Deixar portas e janelas em segurança'],
    quantities: {
      title: 'Roupa para lavandaria',
      note: 'Quantidades configuradas para a unidade. Ajusta se a roupa recolhida for diferente.',
      items: [
        { key: 'lencol', label: 'Lençol baixo', icon: 'bed' },
        { key: 'capa', label: 'Capa de edredon', icon: 'duvet' },
        { key: 'fronha', label: 'Fronhas', icon: 'pillow' },
        { key: 'tbanho', label: 'Toalhas de banho', icon: 'towel' },
        { key: 'trosto', label: 'Toalhas de rosto', icon: 'towelSmall' },
      ],
    },
    photoKinds: ['Quarto', 'Casa de banho', 'Cozinha', 'Sala'],
  },
  formacao: {
    key: 'formacao', label: 'Formação', home: 'A minha agenda', job: { singular: 'Sessão', plural: 'Sessões' },
    checklist: 'Tarefas da sessão', evidence: 'Evidências', addEvidence: 'Adicionar evidência',
    start: 'Iniciar sessão', resume: 'Continuar sessão', finish: 'Concluir sessão', send: 'Enviar conclusão', manager: 'coordenadora',
    prep: ['Confirmar acesso à sala', 'Verificar projetor e som', 'Levar manuais e folhas de presença', 'Preparar certificados', 'Rever notas da coordenadora'],
    tasks: ['Registar presenças', 'Apresentar objetivos da sessão', 'Parte teórica', 'Exercício prático', 'Avaliação da sessão', 'Recolher folhas de presença', 'Arrumar a sala'],
    quantities: {
      title: 'Materiais entregues',
      note: 'Quantidades previstas para a sessão. Ajusta se entregaste um número diferente.',
      items: [
        { key: 'manual', label: 'Manuais', icon: 'book' },
        { key: 'cert', label: 'Certificados', icon: 'award' },
        { key: 'kit', label: 'Kits de exercício', icon: 'box' },
      ],
    },
    photoKinds: ['Sala', 'Presenças', 'Quadro', 'Grupo'],
  },
  manutencao: {
    key: 'manutencao', label: 'Manutenção', home: 'As minhas intervenções', job: { singular: 'Intervenção', plural: 'Intervenções' },
    checklist: 'Tarefas da intervenção', evidence: 'Evidências', addEvidence: 'Adicionar evidência',
    start: 'Iniciar intervenção', resume: 'Continuar intervenção', finish: 'Concluir intervenção', send: 'Enviar conclusão', manager: 'gestora',
    prep: ['Confirmar acesso ao edifício', 'Verificar chaves ou códigos', 'Levar ferramentas e peças', 'Levar equipamento de proteção', 'Rever notas da gestora'],
    tasks: ['Diagnóstico do problema', 'Isolar a zona de trabalho', 'Reparação ou substituição', 'Testar o funcionamento', 'Limpar a zona de trabalho', 'Verificar outros danos', 'Deixar a fração em segurança'],
    quantities: {
      title: 'Materiais utilizados',
      note: 'Materiais previstos para a intervenção. Ajusta com o que usaste.',
      items: [
        { key: 'lamp', label: 'Lâmpadas', icon: 'bulb' },
        { key: 'filtro', label: 'Filtros', icon: 'box' },
        { key: 'silicone', label: 'Cartuchos de silicone', icon: 'box' },
      ],
    },
    photoKinds: ['Antes', 'Depois', 'Peça', 'Zona'],
  },
};

interface StatusMeta {
  label: string;
  icon: IconName;
  /** Cartão da lista. */
  card: string;
  /** Etiqueta dentro do cartão. */
  pill: string;
  /** Etiqueta isolada (detalhe). */
  pillSolid: string;
  dot: string;
}

const BAD = {
  card: 'border-[#f4c3bd] bg-[#fde8e6] text-[#9b2318]',
  pill: 'bg-white/75 text-[#9b2318]',
  pillSolid: 'border border-[#f4c3bd] bg-[#fde8e6] text-[#9b2318]',
  dot: 'bg-[#d9463b]',
};

/** Cores aprovadas: amarelo pastel, branco com estado verde, azul claro, verde claro, vermelho claro. */
export const STATUS_META: Record<DisplayStatus, StatusMeta> = {
  planned: { label: 'Planeado', icon: 'calendar', card: 'border-[#f1dc8a] bg-[#fdf3c8] text-[#5b4506]', pill: 'bg-[#f6de7c] text-[#4a3804]', pillSolid: 'border border-[#f1dc8a] bg-[#fdf3c8] text-[#5b4506]', dot: 'bg-[#e0b632]' },
  confirmed: { label: 'Confirmado', icon: 'checkCircle', card: 'border-[#d3d8de] bg-white text-[#15181c]', pill: 'bg-[#17643e] text-white', pillSolid: 'border border-[#17643e] bg-[#17643e] text-white', dot: 'bg-[#17643e]' },
  in_progress: { label: 'Em curso', icon: 'sync', card: 'border-[#bcd3ef] bg-[#e3eefb] text-[#1f4d85]', pill: 'bg-white/75 text-[#1f4d85]', pillSolid: 'border border-[#bcd3ef] bg-[#e3eefb] text-[#1f4d85]', dot: 'bg-[#3b7fd0]' },
  done: { label: 'Concluído', icon: 'checkCircle', card: 'border-[#bfe0cb] bg-[#e8f5ed] text-[#17643e]', pill: 'bg-white/75 text-[#17643e]', pillSolid: 'border border-[#bfe0cb] bg-[#e8f5ed] text-[#17643e]', dot: 'bg-[#3c9a66]' },
  late: { label: 'Em atraso', icon: 'triangle', ...BAD },
  absence: { label: 'Ausência', icon: 'ban', ...BAD },
};

export const ISSUE_TYPES: Array<[IssueType, string]> = [
  ['atraso', 'Atraso'],
  ['dano', 'Dano'],
  ['material', 'Falta de material'],
  ['acesso', 'Acesso impossível'],
  ['outro', 'Outro'],
];

export const DELAY_OPTIONS = [15, 30, 45, 60];

/**
 * Funcionalidades em standby.
 * `timer`: cronómetro em tempo real — Fase 2. Enquanto estiver desligado regista-se só a hora de início e de fim.
 */
export const EXEC_FEATURES = { timer: false } as const;

/** Minutos de tolerância antes de uma limpeza não iniciada passar a "Em atraso". */
export const LATE_AFTER_MIN = 10;

export const issueLabel = (type: IssueType): string => ISSUE_TYPES.find(([k]) => k === type)?.[1] ?? type;
export const delayLabel = (min: number): string => (min >= 60 ? '1 hora ou mais' : `${min} min`);
export const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);
