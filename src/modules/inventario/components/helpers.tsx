import { CATEGORIES } from '../config';
import { clientById, locationName, stateOf, stayById } from '../rules';
import type { InventoryData, Product, ProductFilters, StockLocation } from '../types';

export const clientOptions = (d: InventoryData, first: string): Array<[string, string]> => [['', first], ...d.clients.map((c): [string, string] => [c.id, c.name])];
export const stayOptions = (d: InventoryData, clientId: string, first: string): Array<[string, string]> =>
  [['', first], ...d.stays.filter((s) => !clientId || s.clientId === clientId).map((s): [string, string] => [s.id, clientId ? s.name : `${s.name} · ${clientById(d, s.clientId)?.name ?? ''}`])];
export const locationOptions = (d: InventoryData, first: string, all = false): Array<[string, string]> =>
  [['', first], ...d.locations.filter((l) => all || l.active).map((l): [string, string] => [l.id, l.name])];
export const categoryOptions = (first: string): Array<[string, string]> => [['', first], ...CATEGORIES.map((c): [string, string] => [c, c])];

export function matchProduct(d: InventoryData, p: Product, f: Partial<ProductFilters>): boolean {
  if (f.q && !`${p.name} ${p.category} ${locationName(d, p.locId)}`.toLowerCase().includes(f.q.trim().toLowerCase())) return false;
  if (f.owner && p.owner !== f.owner) return false;
  if (f.client && p.clientId !== f.client) return false;
  if (f.stay && p.stayId !== f.stay) return false;
  if (f.loc && p.locId !== f.loc) return false;
  if (f.cat && p.category !== f.cat) return false;
  if (f.state === 'archived') return !p.active;
  if (!p.active) return false;
  if (f.state === 'alert') return stateOf(p) !== 'ok';
  if (f.state && stateOf(p) !== f.state) return false;
  return true;
}

/** Sem stock primeiro; depois pela proporção stock/mínimo. */
export const alertSort = (a: Product, b: Product): number =>
  (stateOf(a) === 'out' ? 0 : 1) - (stateOf(b) === 'out' ? 0 : 1) || a.stock / Math.max(1, a.min) - b.stock / Math.max(1, b.min) || a.name.localeCompare(b.name);

/** Nome do cliente e, opcionalmente, alojamento · unidade. */
export function clientLines(d: InventoryData, o: Pick<Product, 'owner' | 'clientId' | 'stayId'> & { unitName?: string; unit?: string }) {
  if (o.owner !== 'client') return null;
  const client = clientById(d, o.clientId)?.name ?? '—';
  const stay = stayById(d, o.stayId);
  const unit = o.unitName ?? o.unit ?? '';
  const detail = stay && (stay.name !== client || unit) ? `${stay.name}${unit ? ` · ${unit}` : ''}` : '';
  return { client, detail };
}

export const isClientLocation = (l: StockLocation) => l.owner === 'client';
