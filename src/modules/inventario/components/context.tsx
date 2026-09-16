import { createContext, useContext } from 'react';
import type { InventoryActions } from '../store';
import type { InventoryData, IsoDate, LocationFilters, MovementFilters, ProductFilters, Screen, SummaryFilters, SupplierFilters } from '../types';

export type DrawerState =
  | { kind: 'product'; id: string; tab: 'resumo' | 'movimentos' | 'consumos'; back?: DrawerState }
  | { kind: 'location'; id: string }
  | { kind: 'supplier'; id: string }
  | { kind: 'order'; id: string; back?: DrawerState }
  | null;

export type StockKind = 'entrada' | 'consumo' | 'ajuste' | 'transfer';

export type DialogState =
  | { kind: 'product'; id?: string; preset?: { owner?: 'company' | 'client'; clientId?: string; stayId?: string; locId?: string; unitName?: string } }
  | { kind: 'stock'; stock: StockKind; id: string }
  | { kind: 'order'; supplierId?: string; productId?: string; qty?: number }
  | { kind: 'supplier' }
  | { kind: 'receive'; id: string }
  | null;

export interface InventoryUiValue {
  data: InventoryData;
  actions: InventoryActions;
  today: IsoDate;
  now: string;
  /** Rendimentos ativo: mostra custos operacionais preparados. */
  withRevenue: boolean;
  screen: Screen;
  go: (screen: Screen) => void;
  notify: (message: string) => void;
  drawer: DrawerState;
  openDrawer: (d: DrawerState) => void;
  dialog: DialogState;
  openDialog: (d: DialogState) => void;
  closeDialog: () => void;
  summary: [SummaryFilters, (f: SummaryFilters) => void];
  products: [ProductFilters, (f: ProductFilters) => void];
  locations: [LocationFilters, (f: LocationFilters) => void];
  movements: [MovementFilters, (f: MovementFilters) => void];
  suppliers: [SupplierFilters, (f: SupplierFilters) => void];
}

export const InventoryUiContext = createContext<InventoryUiValue | null>(null);

export function useInventoryUi(): InventoryUiValue {
  const value = useContext(InventoryUiContext);
  if (!value) throw new Error('useInventoryUi tem de ser usado dentro de <InventoryModule>.');
  return value;
}
