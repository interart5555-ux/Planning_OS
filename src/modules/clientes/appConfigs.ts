import type { AppConfig, AppKey, Term } from './types';

/**
 * Terminologia e campos por aplicação AppOS. Os componentes lêem sempre daqui;
 * nenhum texto de "alojamento" ou "lavandaria" está fixo no núcleo.
 */
export const APP_CONFIGS: Record<AppKey, AppConfig> = {
  limpezas: {
    key: 'limpezas',
    label: 'Limpezas',
    client: { singular: 'Cliente', plural: 'Clientes', gender: 'm' },
    location: { singular: 'Alojamento', plural: 'Alojamentos', gender: 'm' },
    unit: { singular: 'Unidade', plural: 'Unidades', gender: 'f', hint: 'Apartamento ou quarto', types: ['Apartamento', 'Quarto', 'Estúdio'], capacityLabel: 'Hóspedes' },
    jobs: 'Reservas',
    segments: ['Alojamento Local', 'Gestão de Imóveis', 'Hotelaria', 'Particular'],
    services: [
      { id: 'estadia', label: 'Limpeza de estadia', tone: 'ok' },
      { id: 'profunda', label: 'Limpeza profunda', tone: 'info' },
      { id: 'checkin', label: 'Check-in / check-out', tone: 'neutral' },
    ],
    locationSubtitle: 'Configura as unidades, equipa e preferências deste alojamento.',
    features: { defaultTeam: true, hourlyRate: true, ical: true, laundry: true, stayTimes: true },
  },
  formacao: {
    key: 'formacao',
    label: 'Formação',
    client: { singular: 'Cliente', plural: 'Clientes', gender: 'm' },
    location: { singular: 'Instalação', plural: 'Instalações', gender: 'f' },
    unit: { singular: 'Sala', plural: 'Salas', gender: 'f', hint: 'Turma, sala ou sessão', types: ['Sala', 'Auditório', 'Laboratório'], capacityLabel: 'Lugares' },
    jobs: 'Sessões',
    segments: ['Empresa', 'Escola', 'Entidade formadora'],
    services: [
      { id: 'presencial', label: 'Formação presencial', tone: 'ok' },
      { id: 'logistica', label: 'Apoio logístico', tone: 'info' },
    ],
    locationSubtitle: 'Configura as salas e preferências desta instalação.',
    features: {},
  },
  manutencao: {
    key: 'manutencao',
    label: 'Manutenção',
    client: { singular: 'Cliente', plural: 'Clientes', gender: 'm' },
    location: { singular: 'Edifício', plural: 'Edifícios', gender: 'm' },
    unit: { singular: 'Fração', plural: 'Frações', gender: 'f', hint: 'Equipamento, fração ou área', types: ['Fração', 'Equipamento', 'Área comum'], capacityLabel: 'Área (m²)' },
    jobs: 'Intervenções',
    segments: ['Empresa', 'Condomínio', 'Proprietário'],
    services: [
      { id: 'preventiva', label: 'Manutenção preventiva', tone: 'ok' },
      { id: 'corretiva', label: 'Manutenção corretiva', tone: 'info' },
    ],
    locationSubtitle: 'Configura as frações e preferências deste edifício.',
    features: {},
  },
  nucleo: {
    key: 'nucleo',
    label: 'AppOS',
    client: { singular: 'Cliente', plural: 'Clientes', gender: 'm' },
    location: { singular: 'Local de serviço', plural: 'Locais de serviço', gender: 'm' },
    unit: { singular: 'Unidade', plural: 'Unidades', gender: 'f', hint: 'Subdivisão do local', types: ['Unidade'], capacityLabel: 'Capacidade' },
    jobs: 'Trabalhos',
    segments: ['Empresa', 'Particular'],
    services: [{ id: 'servico', label: 'Serviço principal', tone: 'ok' }],
    locationSubtitle: 'Configura as unidades e preferências deste local de serviço.',
    features: {},
  },
};

/* ------------------------------------------------------------------ */
/* Helpers de texto                                                    */
/* ------------------------------------------------------------------ */

const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

/** "alojamento", "alojamentos". */
export const lower = (term: Term, plural = false): string => lowerFirst(plural ? term.plural : term.singular);

/** "Novo alojamento", "Nova instalação". */
export const newLabel = (term: Term): string => `${term.gender === 'f' ? 'Nova' : 'Novo'} ${lower(term)}`;

/** "do alojamento", "da instalação". */
export const ofThe = (term: Term): string => `${term.gender === 'f' ? 'da' : 'do'} ${lower(term)}`;

/** "neste alojamento", "nesta instalação". */
export const inThis = (term: Term): string => `${term.gender === 'f' ? 'nesta' : 'neste'} ${lower(term)}`;

/** "2 alojamentos", "1 unidade". */
export const count = (n: number, term: Term): string => `${n} ${lower(term, n !== 1)}`;
