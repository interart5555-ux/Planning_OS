import type { BillingCycle, HealthLevel, InvoiceStatus, RevenueAppKey, RevenueConfig, Viewer, ViewerRole } from './types';

export const REVENUE_CONFIGS: Record<RevenueAppKey, RevenueConfig> = {
  limpezas: {
    key: 'limpezas', label: 'Limpezas', job: { singular: 'limpeza', plural: 'limpezas' }, location: { singular: 'Alojamento', plural: 'alojamentos' },
    person: { singular: 'Colaborador', plural: 'Colaboradores', feminine: 'colaboradora' }, roleBase: 'Equipa de limpeza', roleLead: 'Supervisora',
    products: 'Produtos e consumíveis', productsShort: 'produtos', supply: 'Fornecimento de produtos', supplement: 'Suplemento de produtos por limpeza', perJob: 'por limpeza',
    hoursBilled: 'Horas de limpeza faturadas',
    clientNames: ['Porto Charming Suites', 'Ribeira Apartments', 'Clérigos View', 'Boavista Flats', 'Foz Guest House', 'Aliados Residence', 'Trindade Studios', 'Market Square Apts'],
    unitNames: [['PCS – Downtown', 'PCS – Riverside', 'PCS – Garden', 'PCS – City View', 'PCS – Balcony'], ['Ribeira – Cais', 'Ribeira – Duque', 'Ribeira – Sé'], ['Clérigos – Torre', 'Clérigos – Galeria'], ['Boavista – Rotunda', 'Boavista – Parque', 'Boavista – Casa da Música'], ['Foz – Farol', 'Foz – Jardim'], ['Aliados – Praça', 'Aliados – Estúdio'], ['Trindade – T1', 'Trindade – T2', 'Trindade – Loft'], ['Market Square – A', 'Market Square – B']],
  },
  formacao: {
    key: 'formacao', label: 'Formação', job: { singular: 'sessão', plural: 'sessões' }, location: { singular: 'Instalação', plural: 'instalações' },
    person: { singular: 'Formador', plural: 'Formadores', feminine: 'formadora' }, roleBase: 'Formador', roleLead: 'Coordenadora',
    products: 'Materiais didáticos', productsShort: 'materiais', supply: 'Fornecimento de materiais', supplement: 'Suplemento de materiais por sessão', perJob: 'por sessão',
    hoursBilled: 'Horas de formação faturadas',
    clientNames: ['Grupo Nortenha', 'Ribeira Consultores', 'Clérigos Academia', 'Boavista Seguros', 'Foz Tecnologia', 'Aliados Retalho', 'Trindade Saúde', 'Market Square Hotels'],
    unitNames: [['Nortenha – Sala A', 'Nortenha – Sala B', 'Nortenha – Auditório', 'Nortenha – Online', 'Nortenha – Lab'], ['Ribeira – Sala 1', 'Ribeira – Sala 2', 'Ribeira – Online'], ['Clérigos – Sala Torre', 'Clérigos – Galeria'], ['Boavista – Piso 2', 'Boavista – Piso 4', 'Boavista – Online'], ['Foz – Sala Mar', 'Foz – Lab'], ['Aliados – Loja', 'Aliados – Sede'], ['Trindade – Sala 1', 'Trindade – Sala 2', 'Trindade – Online'], ['Market Square – Sala A', 'Market Square – Sala B']],
  },
  manutencao: {
    key: 'manutencao', label: 'Manutenção', job: { singular: 'intervenção', plural: 'intervenções' }, location: { singular: 'Edifício', plural: 'edifícios' },
    person: { singular: 'Técnico', plural: 'Técnicos', feminine: 'técnica' }, roleBase: 'Técnico de manutenção', roleLead: 'Chefe de equipa',
    products: 'Materiais e peças', productsShort: 'materiais', supply: 'Fornecimento de materiais', supplement: 'Suplemento de materiais por intervenção', perJob: 'por intervenção',
    hoursBilled: 'Horas de manutenção faturadas',
    clientNames: ['Condomínio Porto Charming', 'Ribeira Imóveis', 'Clérigos Offices', 'Boavista Park', 'Foz Residence', 'Aliados Business', 'Trindade Lofts', 'Market Square Mall'],
    unitNames: [['Bloco A', 'Bloco B', 'Bloco C', 'Garagem', 'Cobertura'], ['Ribeira – Cais', 'Ribeira – Duque', 'Ribeira – Sé'], ['Torre Norte', 'Torre Sul'], ['Boavista – Lote 1', 'Boavista – Lote 2', 'Boavista – Lote 3'], ['Foz – Frente', 'Foz – Traseiras'], ['Aliados – Piso 1', 'Aliados – Piso 3'], ['Trindade – Loja', 'Trindade – Lofts', 'Trindade – Pátio'], ['Market Square – Ala A', 'Market Square – Ala B']],
  },
};

/** Custo médio de produtos por limpeza quando estão incluídos no serviço (€). */
export const PRODUCT_COST = 1.8;
/** Duração média de uma limpeza (h), para estimar o número de limpezas. */
export const AVG_JOB_HOURS = 2.5;
/** Primeiro mês com faturas simuladas; antes disso tudo está recebido. */
export const FIRST_INVOICE_MONTH = '2026-07';

/** Metas da saúde financeira: [limite saudável, limite de atenção]. */
export const HEALTH_LIMITS = { receipts: [70, 50], team: [55, 62], products: [4, 6], margin: [35, 25] } as const;

export const VIEWERS: Record<ViewerRole, Viewer> = {
  gestora: { name: 'Carla Mendes', initials: 'CM', role: 'Gestora', canView: true },
  admin: { name: 'Ana Rocha', initials: 'AR', role: 'Administradora', canView: true },
  colab: { name: 'Miguel Ferreira', initials: 'MF', role: 'Colaborador', canView: false },
};

export const CYCLE_LABEL: Record<BillingCycle, string> = { weekly: 'Semanal', monthly: 'Mensal', custom: 'Personalizado · quinzenal' };

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: HealthLevel }> = {
  paid: { label: 'Pago', tone: 'ok' },
  pending: { label: 'Pendente', tone: 'warn' },
  late: { label: 'Em atraso', tone: 'bad' },
};

export const HEALTH_LABEL: Record<HealthLevel, string> = { ok: 'Saudável', warn: 'Atenção', bad: 'Em risco' };

export const CLIENT_STATE: Record<HealthLevel, { label: string; text: string }> = {
  ok: { label: 'Cliente saudável', text: 'Boa margem e pagamentos dentro do prazo.' },
  warn: { label: 'Atenção ao pagamento', text: 'Há pagamentos a vencer em breve ou pagos só em parte.' },
  bad: { label: 'Em atraso', text: 'Existem faturas vencidas por pagar.' },
};

export const PAYMENT_METHODS = ['Transferência bancária', 'Numerário', 'Cheque', 'Outro'];

/** Cores do gráfico (referência aprovada). */
export const CHART_COLORS = { revenue: '#17643e', team: '#3f9a68', products: '#93cfa9' };
