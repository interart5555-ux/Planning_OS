import { round2 } from './format';
import type {
  InventoryData, IsoDate, IsoDateTime, JobUsageLine, MoveOrigin, Movement, MoveType, Owner, Product, PurchaseOrder, RequestSource, RestockRequest, Stay, StockLocation, StockState,
} from './types';

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

const byId = <T extends { id: string }>(list: T[], id: string): T | undefined => list.find((x) => x.id === id);
export const productById = (d: InventoryData, id: string) => byId(d.products, id);
export const locationById = (d: InventoryData, id: string) => byId(d.locations, id);
export const clientById = (d: InventoryData, id: string) => byId(d.clients, id);
export const stayById = (d: InventoryData, id: string) => byId(d.stays, id);
export const supplierById = (d: InventoryData, id: string) => byId(d.suppliers, id);
export const orderById = (d: InventoryData, id: string) => byId(d.orders, id);

export const stateOf = (p: Pick<Product, 'stock' | 'min'>): StockState => (p.stock <= 0 ? 'out' : p.stock < p.min ? 'low' : 'ok');
export const isAlert = (p: Product): boolean => p.active && stateOf(p) !== 'ok';
/** Só produtos da empresa têm valor; o stock do cliente não é ativo nem custo da empresa. */
export const stockValue = (p: Product): number => (p.owner === 'company' ? p.stock * p.cost : 0);
export const staysOf = (d: InventoryData, clientId: string) => d.stays.filter((s) => s.clientId === clientId);
export const productsAt = (d: InventoryData, locId: string, includeArchived = false) => d.products.filter((p) => p.locId === locId && (includeArchived || p.active));
export const itemsAt = (d: InventoryData, locId: string): number => productsAt(d, locId).reduce((s, p) => s + Math.max(0, p.stock), 0);
export const locationName = (d: InventoryData, id: string): string => locationById(d, id)?.name ?? '—';
export const sortMoves = (list: Movement[]) => [...list].sort((a, b) => b.at.localeCompare(a.at) || b.seq - a.seq);
export const movesOf = (d: InventoryData, pid: string) => sortMoves(d.moves.filter((m) => m.productId === pid));
export const openRequests = (d: InventoryData) => d.requests.filter((r) => r.status === 'open' && productById(d, r.productId)?.active);
export const openRequestFor = (d: InventoryData, pid: string) => d.requests.find((r) => r.productId === pid && r.status === 'open');
export const isOpenOrder = (o: PurchaseOrder) => o.status === 'draft' || o.status === 'ordered' || o.status === 'transit';
export const openOrderFor = (d: InventoryData, pid: string) => d.orders.find((o) => isOpenOrder(o) && o.lines.some((l) => l.productId === pid));
export const orderTotal = (o: PurchaseOrder): number => round2(o.lines.reduce((s, l) => s + l.qty * l.price, 0));
/** Stock num instante passado (desfaz os movimentos posteriores). */
export const stockAt = (d: InventoryData, p: Product, at: IsoDateTime): number =>
  p.stock - d.moves.filter((m) => m.productId === p.id && m.at > at).reduce((s, m) => s + m.qty, 0);
export const suggestedQty = (p: Product): number => Math.max(1, p.min * 2 - p.stock);

/** Transferências só entre locais do mesmo proprietário (e do mesmo cliente). */
export const transferTargets = (d: InventoryData, p: Product): StockLocation[] =>
  d.locations.filter((l) => l.active && l.id !== p.locId && l.owner === p.owner && (p.owner === 'company' || l.clientId === p.clientId));

/** Produtos disponíveis numa limpeza do alojamento, conforme quem fornece os produtos. */
export function stayProducts(d: InventoryData, stay: Stay): Product[] {
  if (stay.supply === 'client') return d.products.filter((p) => p.active && p.owner === 'client' && p.stayId === stay.id);
  return stay.productIds.map((id) => productById(d, id)).filter((p): p is Product => Boolean(p && p.active && p.owner === 'company'));
}
export const stayByName = (d: InventoryData, name: string) => d.stays.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());

/** Custo operacional preparado para Rendimentos: só consumos e perdas de produtos da empresa. */
export function operationalCost(d: InventoryData, from: IsoDate, to: IsoDate, jobPrefix?: string) {
  const inRange = (m: Movement) => m.at.slice(0, 10) >= from && m.at.slice(0, 10) <= to && (!jobPrefix || m.job.startsWith(jobPrefix));
  const company = d.moves.filter((m) => inRange(m) && m.owner === 'company' && m.cost > 0 && (m.type === 'Consumo em limpeza' || m.type === 'Perda ou desperdício'));
  const client = d.moves.filter((m) => inRange(m) && m.owner === 'client' && m.type === 'Consumo em limpeza');
  return { cost: round2(company.reduce((s, m) => s + m.cost, 0)), moves: company.length, clientMoves: client.length };
}

/* ------------------------------------------------------------------ */
/* Alterações — operam sobre uma cópia dos dados (ver store.tsx)       */
/* ------------------------------------------------------------------ */

export interface MoveInput {
  qty: number;
  type: MoveType;
  origin: MoveOrigin;
  at: IsoDateTime;
  user: string;
  unitCost?: number | null;
  note?: string;
  job?: string;
}

export interface ApplyResult {
  move: Movement;
  product: Product;
  /** Pedido de reposição criado porque o produto ficou abaixo do mínimo. */
  alert: RestockRequest | null;
}

function makeMove(d: InventoryData, p: Product, input: MoveInput, result: number): Movement {
  let cost = 0;
  if (p.owner === 'company') {
    if (input.type === 'Compra' && input.unitCost != null) cost = round2(input.qty * input.unitCost);
    else if (input.qty < 0 && (input.type === 'Consumo em limpeza' || input.type === 'Perda ou desperdício')) cost = round2(-input.qty * p.cost);
  }
  const seq = d.seq.m++;
  return {
    id: `m${seq}`, seq, at: input.at, productId: p.id, type: input.type, origin: input.origin, owner: p.owner, clientId: p.clientId, stayId: p.stayId, locId: p.locId,
    qty: input.qty, result, cost, user: input.user, note: input.note ?? '', job: input.job ?? '',
  };
}

export function createRequest(d: InventoryData, pid: string, source: RequestSource, by: string, date: IsoDate, note = ''): RestockRequest {
  const existing = openRequestFor(d, pid);
  if (existing) return existing;
  const p = productById(d, pid)!;
  const r: RestockRequest = { id: `r${++d.seq.r}`, productId: pid, qty: suggestedQty(p), source, by, date, note, status: 'open' };
  d.requests.push(r);
  return r;
}

/** Aplica um movimento: atualiza stock (nunca negativo), custo médio das compras e alertas de reposição. */
export function applyMove(d: InventoryData, pid: string, input: MoveInput): ApplyResult {
  const p = productById(d, pid);
  if (!p) throw new Error(`Produto ${pid} inexistente`);
  if (p.stock + input.qty < 0) throw new Error('Stock insuficiente');
  const before = stateOf(p);
  if (p.owner === 'company' && input.type === 'Compra' && input.unitCost != null && input.qty > 0) {
    p.cost = round2((p.stock * p.cost + input.qty * input.unitCost) / Math.max(1, p.stock + input.qty));
  }
  p.stock += input.qty;
  const move = makeMove(d, p, input, p.stock);
  d.moves.push(move);
  const after = stateOf(p);
  const alert = after !== 'ok' && before === 'ok' ? createRequest(d, pid, 'Alerta de stock baixo', 'Sistema', input.at.slice(0, 10)) : null;
  if (after === 'ok') d.requests.forEach((r) => { if (r.productId === pid && r.status === 'open') r.status = 'done'; });
  return { move, product: p, alert };
}

export function transfer(d: InventoryData, pid: string, destLocId: string, qty: number, base: Pick<MoveInput, 'at' | 'user'>, note = '') {
  const p = productById(d, pid)!;
  const src = locationById(d, p.locId)!;
  const dest = locationById(d, destLocId)!;
  if (dest.owner !== p.owner || (p.owner === 'client' && dest.clientId !== p.clientId)) throw new Error('Destino de outro proprietário');
  let twin = d.products.find((x) => x.locId === destLocId && x.name === p.name && x.owner === p.owner && x.clientId === p.clientId);
  if (!twin) {
    twin = { ...p, id: `p${++d.seq.p}`, clientId: dest.clientId, stayId: dest.stayId, unitName: dest.unit, locId: destLocId, stock: 0, min: 0, notes: '', active: true };
    d.products.push(twin);
  }
  twin.active = true;
  if (p.owner === 'company') twin.cost = twin.stock + qty ? round2((twin.stock * twin.cost + qty * p.cost) / (twin.stock + qty)) : p.cost;
  const text = `De ${src.name} para ${dest.name}${note ? ` · ${note}` : ''}`;
  const out = applyMove(d, pid, { ...base, qty: -qty, type: 'Transferência', origin: 'Transferência', note: text });
  applyMove(d, twin.id, { ...base, qty, type: 'Transferência', origin: 'Transferência', note: text });
  return { out, twin };
}

/** Receção de encomenda: só produtos da empresa entram em stock, com o preço da encomenda. */
export function receiveOrder(d: InventoryData, oid: string, received: number[], base: Pick<MoveInput, 'at' | 'user'>) {
  const o = orderById(d, oid)!;
  o.lines.forEach((l, i) => {
    const q = received[i] ?? l.qty;
    const p = productById(d, l.productId);
    if (!p || p.owner !== 'company' || q <= 0) return;
    applyMove(d, p.id, { ...base, qty: q, type: 'Compra', origin: 'Encomenda', unitCost: l.price, note: o.id });
  });
  o.status = 'received';
  o.receivedAt = base.at.slice(0, 10);
  return o;
}

/** Consumos da execução: reduzem o stock do cliente ou da empresa conforme o alojamento. */
export function registerJobUsage(d: InventoryData, stay: Stay, unitName: string, lines: JobUsageLine[], note: string, base: Pick<MoveInput, 'at' | 'user'>) {
  const job = stay.name + (unitName && unitName !== stay.name ? ` · ${unitName}` : '');
  const res = { moves: 0, cost: 0, alerts: [] as Product[], requests: [] as RestockRequest[] };
  const date = base.at.slice(0, 10);
  for (const l of lines) {
    const p = productById(d, l.productId);
    if (!p) continue;
    if (l.used > 0) {
      const a = applyMove(d, p.id, { ...base, qty: -l.used, type: 'Consumo em limpeza', origin: 'Equipa de limpeza', note, job });
      res.moves += 1; res.cost += a.move.cost; if (a.alert) res.alerts.push(p);
    }
    if (l.lost > 0) {
      const a = applyMove(d, p.id, { ...base, qty: -l.lost, type: 'Perda ou desperdício', origin: 'Equipa de limpeza', note: note || 'Registado na limpeza', job });
      res.moves += 1; res.cost += a.move.cost; if (a.alert && !res.alerts.includes(p)) res.alerts.push(p);
    }
    if (l.missing) res.requests.push(createRequest(d, p.id, 'Falta registada na limpeza', base.user, date, note));
    else if (l.suggest) res.requests.push(createRequest(d, p.id, 'Sugestão da colaboradora', base.user, date, note));
  }
  res.cost = round2(res.cost);
  return res;
}

export type { Owner };
