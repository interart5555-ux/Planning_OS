import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { round2 } from './format';
import { createDemoInventory, DEMO_COLLAB, DEMO_MANAGER, DEMO_NOW, DEMO_TODAY } from './mockData';
import {
  applyMove, createRequest, locationById, productById, receiveOrder as receiveOrderRule, registerJobUsage as registerJobUsageRule, stateOf, stayById, supplierById, transfer,
  type ApplyResult,
} from './rules';
import type {
  Category, Glyph, InventoryData, IsoDate, JobUsageLine, LocationType, MeasureUnit, MoveType, OrderLine, OrderStatus, Owner, Product, PurchaseOrder, Stay, StockLocation, Supplier,
} from './types';

export const INVENTORY_STORAGE_KEY = 'appos.inventario.v1';

export interface ProductInput {
  name: string;
  category: Category;
  glyph: Glyph;
  unit: MeasureUnit;
  owner: Owner;
  locId: string;
  unitName: string;
  stock: number;
  min: number;
  cost: number;
  notes: string;
}
export interface LocationInput {
  name: string;
  type: LocationType;
  owner: Owner;
  clientId: string;
  stayId: string;
  unit: string;
  detail: string;
  access: string;
}
export interface SupplierInput {
  name: string;
  contact: string;
  phone: string;
  email: string;
  categories: Category[];
  active: boolean;
}

const clone = (d: InventoryData): InventoryData => JSON.parse(JSON.stringify(d)) as InventoryData;

function load(key: string | null, fallback: () => InventoryData): InventoryData {
  if (!key) return fallback();
  try {
    const saved = JSON.parse(window.localStorage.getItem(key) ?? 'null') as InventoryData | null;
    return saved && saved.version === 1 ? saved : fallback();
  } catch {
    return fallback();
  }
}

function useInventoryState({ initialData, storageKey, today, now, manager, collaborator }: { initialData?: InventoryData; storageKey: string | null; today: IsoDate; now: string; manager: string; collaborator: string }) {
  const create = useCallback(() => (initialData ? clone(initialData) : createDemoInventory()), [initialData]);
  const [data, setData] = useState<InventoryData>(() => load(storageKey, create));
  const ref = useRef(data);
  ref.current = data;

  // Persistência local (browser). Desativar o módulo não apaga estes dados.
  useEffect(() => {
    if (!storageKey) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* sem armazenamento disponível */ }
  }, [data, storageKey]);

  /** Aplica uma alteração a uma cópia e devolve o resultado de forma síncrona. */
  const mutate = useCallback(<T,>(fn: (d: InventoryData) => T): T => {
    const draft = clone(ref.current);
    const result = fn(draft);
    ref.current = draft;
    setData(draft);
    return result;
  }, []);

  const at = `${today}T${now}`;
  const base = useMemo(() => ({ at, user: manager }), [at, manager]);

  const actions = useMemo(() => ({
    registerEntry: (pid: string, input: { qty: number; type: MoveType; unitCost: number | null; note: string }): ApplyResult =>
      mutate((d) => applyMove(d, pid, { ...base, qty: input.qty, type: input.type, origin: input.type === 'Reposição do cliente' ? 'Cliente' : 'Entrada manual', unitCost: input.unitCost, note: input.note })),

    registerUse: (pid: string, input: { qty: number; type: MoveType; job: string; note: string }): ApplyResult =>
      mutate((d) => applyMove(d, pid, { ...base, qty: -input.qty, type: input.type, origin: input.job ? 'Equipa de limpeza' : 'Ajuste manual', job: input.job, note: input.note })),

    adjustStock: (pid: string, input: { counted: number; reason: string; note: string }): ApplyResult =>
      mutate((d) => applyMove(d, pid, { ...base, qty: input.counted - productById(d, pid)!.stock, type: 'Ajuste manual', origin: 'Ajuste manual', note: [input.reason, input.note].filter(Boolean).join(' · ') })),

    transferStock: (pid: string, input: { destLocId: string; qty: number; note: string }) =>
      mutate((d) => transfer(d, pid, input.destLocId, input.qty, base, input.note)),

    saveProduct: (input: ProductInput, id?: string): Product => mutate((d) => {
      if (id) {
        const p = productById(d, id)!;
        Object.assign(p, { name: input.name, category: input.category, glyph: input.glyph, unit: input.unit, unitName: p.owner === 'client' ? input.unitName : '', min: input.min, cost: p.owner === 'client' ? 0 : round2(input.cost), notes: input.notes });
        return { ...p };
      }
      const loc = locationById(d, input.locId)!;
      const p: Product = {
        id: `p${++d.seq.p}`, name: input.name, category: input.category, glyph: input.glyph, unit: input.unit, owner: loc.owner, clientId: loc.clientId, stayId: loc.stayId,
        unitName: loc.owner === 'client' ? input.unitName || loc.unit : '', locId: loc.id, stock: 0, min: input.min, cost: loc.owner === 'client' ? 0 : round2(input.cost), notes: input.notes, active: true,
      };
      d.products.push(p);
      if (input.stock > 0) applyMove(d, p.id, { ...base, qty: input.stock, type: 'Ajuste manual', origin: 'Stock inicial', note: 'Stock inicial do produto' });
      if (stateOf(p) !== 'ok') createRequest(d, p.id, 'Alerta de stock baixo', 'Sistema', today);
      return { ...p };
    }),

    setProductActive: (pid: string, active: boolean) => mutate((d) => {
      const p = productById(d, pid)!;
      p.active = active;
      if (!active) d.requests.forEach((r) => { if (r.productId === pid && r.status === 'open') r.status = 'dismissed'; });
    }),

    setMinimum: (pid: string, min: number) => mutate((d) => {
      const p = productById(d, pid)!;
      const before = stateOf(p);
      p.min = min;
      const alert = before === 'ok' && stateOf(p) !== 'ok' ? createRequest(d, pid, 'Alerta de stock baixo', 'Sistema', today) : null;
      if (stateOf(p) === 'ok') d.requests.forEach((r) => { if (r.productId === pid && r.status === 'open' && r.source === 'Alerta de stock baixo') r.status = 'done'; });
      return { alert };
    }),

    createLocation: (input: LocationInput): StockLocation => mutate((d) => {
      const isClient = input.owner === 'client';
      const l: StockLocation = { id: `L${++d.seq.l}`, ...input, clientId: isClient ? input.clientId : '', stayId: isClient ? input.stayId : '', unit: isClient ? input.unit : '', active: true };
      d.locations.push(l);
      const stay = stayById(d, l.stayId);
      if (stay && stay.supply === 'client') {
        const current = locationById(d, stay.locId);
        if (!current || !current.active || current.stayId !== stay.id) stay.locId = l.id;
      }
      return { ...l };
    }),

    /** Só arquiva locais sem stock; os produtos a zero ficam arquivados com o local. */
    setLocationActive: (id: string, active: boolean): { ok: boolean } => mutate((d) => {
      const l = locationById(d, id)!;
      if (!active && d.products.some((p) => p.locId === id && p.active && p.stock > 0)) return { ok: false };
      l.active = active;
      if (!active) d.products.forEach((p) => { if (p.locId === id) p.active = false; });
      return { ok: true };
    }),

    createOrder: (input: { supplierId: string; expected: IsoDate; lines: OrderLine[] }, status: OrderStatus): PurchaseOrder => mutate((d) => {
      const lines = input.lines.filter((l) => productById(d, l.productId)?.owner === 'company');
      const o: PurchaseOrder = { id: `EC-${today.slice(0, 4)}-${String(++d.seq.o).padStart(3, '0')}`, supplierId: input.supplierId, created: today, expected: input.expected, status, receivedAt: '', note: '', lines };
      d.orders.push(o);
      const s = supplierById(d, o.supplierId)!;
      lines.forEach((l) => { if (!s.productIds.includes(l.productId)) s.productIds.push(l.productId); });
      return { ...o };
    }),

    setOrderStatus: (id: string, status: OrderStatus) => mutate((d) => { d.orders.find((o) => o.id === id)!.status = status; }),

    receiveOrder: (id: string, received: number[]) => mutate((d) => receiveOrderRule(d, id, received, base)),

    createSupplier: (input: SupplierInput): Supplier => mutate((d) => {
      const s: Supplier = { id: `s${++d.seq.s}`, ...input, productIds: [] };
      d.suppliers.push(s);
      return { ...s };
    }),

    setSupplierActive: (id: string, active: boolean) => mutate((d) => { supplierById(d, id)!.active = active; }),

    dismissRequest: (id: string) => mutate((d) => { d.requests.find((r) => r.id === id)!.status = 'dismissed'; }),

    /** Consumos da colaboradora durante a limpeza (Módulo 5). */
    registerJobUsage: (stayId: string, unitName: string, lines: JobUsageLine[], note: string, user = collaborator) =>
      mutate((d) => registerJobUsageRule(d, stayById(d, stayId)!, unitName, lines, note, { at, user })),

    /** Configuração do alojamento (Módulo 3 · "Quem fornece os produtos?"). */
    configureStay: (stayId: string, patch: Partial<Pick<Stay, 'supply' | 'locId' | 'supplement' | 'productIds'>>) => mutate((d) => {
      const stay = stayById(d, stayId)!;
      Object.assign(stay, patch);
      if (patch.supply === 'client' && !patch.locId) stay.locId = d.locations.find((l) => l.active && l.owner === 'client' && l.stayId === stay.id)?.id ?? '';
      if (patch.supply === 'company' && !patch.locId) stay.locId = d.locations.find((l) => l.active && l.owner === 'company' && l.type === 'Carrinha')?.id ?? 'L1';
      if (stay.supply === 'company') stay.productIds = stay.productIds.filter((pid) => productById(d, pid)?.locId === stay.locId);
      return { ...stay };
    }),

    /** Garante o alojamento no inventário (alojamentos criados no módulo Clientes). */
    ensureStay: (stay: Pick<Stay, 'id' | 'clientId' | 'name' | 'address' | 'units'>, clientName: string) => mutate((d) => {
      if (!d.clients.some((c) => c.id === stay.clientId)) d.clients.push({ id: stay.clientId, name: clientName });
      const existing = stayById(d, stay.id);
      if (existing) { Object.assign(existing, { name: stay.name, address: stay.address, units: stay.units }); return; }
      d.stays.push({ ...stay, supply: 'client', locId: '', supplement: 0, productIds: [] });
    }),

    reset: () => { const fresh = create(); ref.current = fresh; setData(fresh); },
  }), [at, base, collaborator, create, mutate, today]);

  return { data, actions };
}

export type InventoryActions = ReturnType<typeof useInventoryState>['actions'];

export interface InventoryContextValue {
  data: InventoryData;
  actions: InventoryActions;
  today: IsoDate;
  now: string;
  manager: string;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export interface InventoryProviderProps {
  children: ReactNode;
  initialData?: InventoryData;
  /** Chave de persistência no browser; `null` desliga a persistência. */
  storageKey?: string | null;
  today?: IsoDate;
  now?: string;
  manager?: string;
  collaborator?: string;
}

/**
 * Dados do Inventário partilhados entre módulos (Inventário, Clientes e Execução).
 * Nesta fase ficam guardados localmente no browser.
 */
export function InventoryProvider({ children, initialData, storageKey = INVENTORY_STORAGE_KEY, today = DEMO_TODAY, now = DEMO_NOW, manager = DEMO_MANAGER, collaborator = DEMO_COLLAB }: InventoryProviderProps) {
  const { data, actions } = useInventoryState({ initialData, storageKey, today, now, manager, collaborator });
  const value = useMemo(() => ({ data, actions, today, now, manager }), [data, actions, today, now, manager]);
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

/** Dados do inventário; `null` fora de um `InventoryProvider`. */
export const useOptionalInventory = (): InventoryContextValue | null => useContext(InventoryContext);

export function useInventory(): InventoryContextValue {
  const value = useContext(InventoryContext);
  if (!value) throw new Error('useInventory tem de ser usado dentro de <InventoryProvider>.');
  return value;
}
