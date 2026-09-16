/* Módulo 8 — Inventário (opcional). Tipos de dados. */

export type IsoDate = string;
/** "AAAA-MM-DDTHH:MM" */
export type IsoDateTime = string;

/** Empresa: comprado e fornecido pela empresa. Cliente: pertence ao cliente e fica no alojamento. */
export type Owner = 'company' | 'client';
export type Category = 'Produtos de limpeza' | 'Consumíveis' | 'Equipamentos' | 'EPIs' | 'Outros';
export type MeasureUnit = 'un' | 'emb' | 'cx' | 'rolo' | 'L' | 'kg';
export type Glyph = 'bottle' | 'jug' | 'spray' | 'roll' | 'bag' | 'cloth' | 'sponge' | 'glove' | 'mask' | 'vacuum' | 'mop' | 'box';
export type LocationType = 'Armazém' | 'Carrinha' | 'Alojamento' | 'Unidade';
export type MoveType = 'Compra' | 'Reposição do cliente' | 'Consumo em limpeza' | 'Ajuste manual' | 'Transferência' | 'Devolução' | 'Perda ou desperdício';
export type MoveOrigin = 'Stock inicial' | 'Encomenda' | 'Cliente' | 'Equipa de limpeza' | 'Ajuste manual' | 'Entrada manual' | 'Transferência';
export type StockState = 'ok' | 'low' | 'out';
export type OrderStatus = 'draft' | 'ordered' | 'transit' | 'received' | 'cancelled';
export type RequestSource = 'Sugestão da colaboradora' | 'Alerta de stock baixo' | 'Falta registada na limpeza';
export type RequestStatus = 'open' | 'done' | 'dismissed';

export interface InventoryClient {
  id: string;
  name: string;
}

/** Alojamento (Módulo 3) visto pelo inventário: quem fornece os produtos e de onde saem. */
export interface Stay {
  /** O mesmo id do alojamento no módulo Clientes. */
  id: string;
  clientId: string;
  name: string;
  address: string;
  units: string[];
  supply: Owner;
  /** Cliente: local de stock do alojamento. Empresa: local da empresa usado nas limpezas. */
  locId: string;
  /** Suplemento de produtos por limpeza (só quando a empresa inclui os produtos). */
  supplement: number;
  /** Produtos da empresa usados nas limpezas deste alojamento. */
  productIds: string[];
}

export interface StockLocation {
  id: string;
  name: string;
  type: LocationType;
  owner: Owner;
  clientId: string;
  stayId: string;
  unit: string;
  detail: string;
  access: string;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  glyph: Glyph;
  unit: MeasureUnit;
  owner: Owner;
  clientId: string;
  stayId: string;
  /** Unidade associada (opcional, só produtos do cliente). */
  unitName: string;
  locId: string;
  stock: number;
  min: number;
  /** Custo médio; sempre 0 em produtos do cliente. */
  cost: number;
  notes: string;
  active: boolean;
}

export interface Movement {
  id: string;
  seq: number;
  at: IsoDateTime;
  productId: string;
  type: MoveType;
  origin: MoveOrigin;
  owner: Owner;
  clientId: string;
  stayId: string;
  locId: string;
  /** Positivo entra, negativo sai. */
  qty: number;
  result: number;
  /** Só produtos da empresa (compras e consumos); 0 no stock do cliente. */
  cost: number;
  user: string;
  note: string;
  /** Limpeza associada, ex.: "Maternidade 50 · T1 Esquerdo". */
  job: string;
}

export interface RestockRequest {
  id: string;
  productId: string;
  qty: number;
  source: RequestSource;
  by: string;
  date: IsoDate;
  note: string;
  status: RequestStatus;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  categories: Category[];
  productIds: string[];
  active: boolean;
}

export interface OrderLine {
  productId: string;
  qty: number;
  price: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  created: IsoDate;
  expected: IsoDate;
  status: OrderStatus;
  receivedAt: IsoDate;
  note: string;
  lines: OrderLine[];
}

export interface InventoryData {
  version: 1;
  seq: { p: number; l: number; m: number; r: number; o: number; s: number };
  clients: InventoryClient[];
  stays: Stay[];
  locations: StockLocation[];
  products: Product[];
  moves: Movement[];
  requests: RestockRequest[];
  suppliers: Supplier[];
  orders: PurchaseOrder[];
}

export type Screen = 'resumo' | 'produtos' | 'locais' | 'movimentos' | 'fornecedores';

export interface SummaryFilters { loc: string; owner: '' | Owner; client: string; cat: string; state: '' | 'low' | 'out' }
export interface ProductFilters { q: string; owner: '' | Owner; client: string; stay: string; loc: string; cat: string; state: '' | 'alert' | StockState | 'archived' }
export interface LocationFilters { q: string; owner: '' | Owner; client: string; status: 'active' | 'archived'; tab: 'list' | 'map' }
export interface MovementFilters { from: IsoDate; to: IsoDate; type: string; product: string; owner: '' | Owner; loc: string; client: string; stay: string; origin: string; more: boolean }
export interface SupplierFilters { tab: 'orders' | 'suppliers'; status: '' | OrderStatus }

/** Linha de consumo registada na execução de uma limpeza. */
export interface JobUsageLine {
  productId: string;
  used: number;
  lost: number;
  missing: boolean;
  suggest: boolean;
}
