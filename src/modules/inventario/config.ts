import type { Category, Glyph, LocationType, MeasureUnit, MoveOrigin, MoveType, OrderStatus, StockState } from './types';

export const CATEGORIES: Category[] = ['Produtos de limpeza', 'Consumíveis', 'Equipamentos', 'EPIs', 'Outros'];
export const UNITS: Array<[MeasureUnit, string]> = [['un', 'Unidade (un)'], ['emb', 'Embalagem (emb)'], ['cx', 'Caixa (cx)'], ['rolo', 'Rolo'], ['L', 'Litro (L)'], ['kg', 'Quilograma (kg)']];
export const LOCATION_TYPES: Array<[LocationType, string]> = [['Armazém', 'Armazém'], ['Carrinha', 'Carrinha'], ['Alojamento', 'Armário de limpeza do alojamento'], ['Unidade', 'Stock de uma unidade']];
export const MOVE_TYPES: MoveType[] = ['Compra', 'Reposição do cliente', 'Consumo em limpeza', 'Ajuste manual', 'Transferência', 'Devolução', 'Perda ou desperdício'];
export const ORIGINS: MoveOrigin[] = ['Stock inicial', 'Encomenda', 'Cliente', 'Equipa de limpeza', 'Ajuste manual', 'Entrada manual', 'Transferência'];
export const GLYPHS: Array<[Glyph, string]> = [['bottle', 'Frasco'], ['jug', 'Garrafão'], ['spray', 'Pulverizador'], ['roll', 'Rolo de papel'], ['bag', 'Sacos'], ['cloth', 'Pano'], ['sponge', 'Esfregão'], ['glove', 'Luvas'], ['mask', 'Máscara'], ['vacuum', 'Aspirador'], ['mop', 'Mopa'], ['box', 'Caixa']];
export const ADJUST_REASONS = ['Contagem de inventário', 'Correção de registo', 'Produto danificado', 'Outro'];

type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';
export const STOCK_STATE: Record<StockState, { label: string; tone: Tone }> = {
  ok: { label: 'OK', tone: 'ok' },
  low: { label: 'Stock baixo', tone: 'warn' },
  out: { label: 'Sem stock', tone: 'bad' },
};
export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Rascunho', tone: 'neutral' },
  ordered: { label: 'Encomendada', tone: 'info' },
  transit: { label: 'Em trânsito', tone: 'warn' },
  received: { label: 'Recebida', tone: 'ok' },
  cancelled: { label: 'Cancelada', tone: 'bad' },
};
export type { Tone };

export const OWNER_LABEL = { company: 'Empresa', client: 'Cliente' } as const;
export const MAX_SUPPLEMENT = 20;
