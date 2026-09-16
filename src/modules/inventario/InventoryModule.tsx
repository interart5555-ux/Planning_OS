import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppTopBar, sectionLabel, ToastMessage, type AppSection } from '../shared/ui';
import { ModuloInativo, ModulosAtivosProvider, useModulosAtivos, type ModulosOpcionais } from '../shared/company';
import { InventoryUiContext, type DialogState, type DrawerState, type InventoryUiValue } from './components/context';
import { InventoryDialogs } from './components/Dialogs';
import { LocationsScreen, type NewLocationPreset } from './components/LocationsScreen';
import { defaultMovementFilters, MovementsScreen } from './components/MovementsScreen';
import { InventoryPanels } from './components/Panels';
import { ProductsScreen } from './components/ProductsScreen';
import { SummaryScreen } from './components/SummaryScreen';
import { SuppliersScreen } from './components/SuppliersScreen';
import { InventoryProvider, useOptionalInventory, type InventoryProviderProps } from './store';
import type { LocationFilters, MovementFilters, ProductFilters, Screen, SummaryFilters, SupplierFilters } from './types';

export interface InventoryModuleProps {
  initialScreen?: Screen;
  /** Abre "Novo local de stock" já preenchido (ex.: a partir da ficha do alojamento). */
  newLocation?: NewLocationPreset | null;
  userInitials?: string;
  onNavigate?: (section: AppSection) => void;
}

/**
 * Módulo 8 — Inventário (opcional).
 * Produtos, stock da empresa e dos clientes, locais, movimentos, reposições, fornecedores e compras.
 * Simulação local: sem base de dados; os dados ficam guardados no browser.
 */
function InventoryModuleContent({ initialScreen = 'resumo', newLocation = null, userInitials = 'CM', onNavigate }: InventoryModuleProps) {
  const store = useOptionalInventory()!;
  const modulos = useModulosAtivos();
  const [screen, setScreen] = useState<Screen>(newLocation ? 'locais' : initialScreen);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [preset, setPreset] = useState<NewLocationPreset | null>(newLocation);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [summary, setSummary] = useState<SummaryFilters>({ loc: '', owner: '', client: '', cat: '', state: '' });
  const [products, setProducts] = useState<ProductFilters>({ q: '', owner: '', client: '', stay: '', loc: '', cat: '', state: '' });
  const [locations, setLocations] = useState<LocationFilters>({ q: '', owner: '', client: '', status: 'active', tab: 'list' });
  const [movements, setMovements] = useState<MovementFilters>(() => defaultMovementFilters(store.today));
  const [suppliers, setSuppliers] = useState<SupplierFilters>({ tab: 'orders', status: '' });
  const focusTitle = useRef(false);

  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  const dismissToast = useCallback(() => setToast(null), []);
  const go = useCallback((next: Screen) => { focusTitle.current = true; setDrawer(null); setDialog(null); setScreen(next); }, []);

  useEffect(() => {
    if (!focusTitle.current) return;
    focusTitle.current = false;
    document.getElementById('page-title')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [screen]);

  useEffect(() => {
    if (!preset) return;
    requestAnimationFrame(() => { const el = document.getElementById('nl-name') as HTMLInputElement | null; el?.scrollIntoView({ block: 'center' }); el?.focus(); });
  }, [preset]);

  const ctx = useMemo<InventoryUiValue>(() => ({
    data: store.data, actions: store.actions, today: store.today, now: store.now, withRevenue: modulos.rendimentos,
    screen, go, notify, drawer, openDrawer: setDrawer, dialog, openDialog: setDialog, closeDialog: () => setDialog(null),
    summary: [summary, setSummary], products: [products, setProducts], locations: [locations, setLocations], movements: [movements, setMovements], suppliers: [suppliers, setSuppliers],
  }), [store, modulos.rendimentos, screen, go, notify, drawer, dialog, summary, products, locations, movements, suppliers]);

  const navigate = (section: AppSection) => {
    if (section === 'inventario') { go('resumo'); return; }
    if (onNavigate) onNavigate(section);
    else notify(`“${sectionLabel(section)}” fica fora desta simulação.`);
  };

  return (
    <InventoryUiContext.Provider value={ctx}>
      <div className="min-h-screen bg-white text-sm text-slate-900 antialiased">
        <AppTopBar active="inventario" appLabel="Limpezas" userInitials={userInitials} onNavigate={navigate} notify={notify}
          badges={{ aprovacoes: { count: 5, label: '5 aprovações pendentes' } }} />
        <main className="mx-auto max-w-[1240px] px-4 pb-10 pt-[18px] md:px-8 md:pb-14 md:pt-[26px]">
          {screen === 'produtos' ? <ProductsScreen />
            : screen === 'locais' ? <LocationsScreen preset={preset} onPresetCreated={() => setPreset(null)} />
            : screen === 'movimentos' ? <MovementsScreen />
            : screen === 'fornecedores' ? <SuppliersScreen />
            : <SummaryScreen />}
        </main>
        <InventoryPanels />
        <InventoryDialogs />
        <ToastMessage toast={toast} onDismiss={dismissToast} />
      </div>
    </InventoryUiContext.Provider>
  );
}

/** Garante os dados partilhados: usa o `InventoryProvider` da aplicação ou cria um próprio. */
function WithInventory({ children, ...provider }: Omit<InventoryProviderProps, 'children'> & { children: ReactNode }) {
  return useOptionalInventory() ? <>{children}</> : <InventoryProvider {...provider}>{children}</InventoryProvider>;
}

/**
 * Rota do módulo. Só fica disponível com `modulosAtivos.inventario === true`;
 * caso contrário mostra "Módulo indisponível". Desativar não apaga os dados.
 */
export default function InventoryModule({ modulos: override, storageKey, ...rest }: InventoryModuleProps & { modulos?: Partial<ModulosOpcionais>; storageKey?: string | null }) {
  const company = useModulosAtivos();
  const modulos = override ? { ...company, ...override } : company;
  if (!modulos.inventario) return <ModuloInativo modulo="inventario" section="inventario" userInitials={rest.userInitials ?? 'CM'} onNavigate={rest.onNavigate} />;
  return (
    <ModulosAtivosProvider value={modulos}>
      <WithInventory storageKey={storageKey}>
        <InventoryModuleContent {...rest} />
      </WithInventory>
    </ModulosAtivosProvider>
  );
}
