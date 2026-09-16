import { useGerirModulos, useModulosAtivos, type ModuloOpcional, type ModulosAtivos } from '../company/modulosAtivos';
import { ActionMenu, focusRing } from './ui';

export type AppSection = 'hoje' | 'planeamento' | 'equipas' | 'clientes' | 'aprovacoes' | 'inventario' | 'rendimentos' | 'mensagens';

const NAV: Array<[AppSection, string]> = [
  ['hoje', 'Hoje'],
  ['planeamento', 'Planeamento'],
  ['equipas', 'Equipas'],
  ['clientes', 'Clientes'],
  ['aprovacoes', 'Aprovações'],
  ['inventario', 'Inventário'],
  ['rendimentos', 'Rendimentos'],
  ['mensagens', 'Mensagens'],
];

/** Secções de módulos opcionais (7–9); as da versão base aparecem sempre. */
const OPTIONAL_SECTION: Partial<Record<AppSection, ModuloOpcional>> = { inventario: 'inventario', rendimentos: 'rendimentos' };

/** Uma secção da navegação só aparece se o módulo correspondente estiver ativo. */
export function sectionEnabled(section: AppSection, m: ModulosAtivos): boolean {
  const key = OPTIONAL_SECTION[section];
  return key ? m[key] : true;
}

export const sectionLabel = (section: AppSection): string => NAV.find(([s]) => s === section)?.[1] ?? section;

interface AppTopBarProps {
  active: AppSection;
  /** Aplicação AppOS ativa (chip verde), ex.: "Limpezas". */
  appLabel: string;
  userInitials: string;
  onNavigate: (section: AppSection) => void;
  /** Ações simuladas do chip e do menu ☰. */
  notify: (message: string) => void;
  /** Contadores vermelhos na navegação, ex.: { aprovacoes: 5 }. */
  badges?: Partial<Record<AppSection, { count: number; label: string }>>;
  /** Por omissão usa a configuração da empresa (`ModulosAtivosProvider`). */
  modulos?: ModulosAtivos;
}

/** Navegação de topo comum aos módulos AppOS (sem barra lateral). */
export function AppTopBar({ active, appLabel, userInitials, onNavigate, notify, badges, modulos }: AppTopBarProps) {
  const fromCompany = useModulosAtivos();
  const enabled = modulos ?? fromCompany;
  const gerirModulos = useGerirModulos();
  return (
    <header className="sticky top-0 z-40 grid grid-cols-[1fr_auto] items-center border-b border-slate-200 bg-white px-4 lg:grid-cols-[1fr_auto_1fr] lg:px-7">
      <button type="button" onClick={() => onNavigate('hoje')} className={`h-16 justify-self-start text-[22px] font-bold tracking-[-0.035em] ${focusRing}`}>
        App<span className="text-[#17643e]">OS</span>
      </button>
      <nav aria-label="Principal" className="order-3 col-span-2 -mx-4 flex h-[46px] gap-0.5 overflow-x-auto border-t border-slate-200 px-1.5 lg:order-none lg:col-span-1 lg:mx-0 lg:h-16 lg:border-0 lg:px-0">
        {NAV.filter(([section]) => sectionEnabled(section, enabled)).map(([section, label]) => {
          const isActive = section === active;
          const badge = badges?.[section];
          return (
            <a
              key={section}
              href={`#${section}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={(e) => { e.preventDefault(); onNavigate(section); }}
              className={`relative -mb-px flex items-center whitespace-nowrap border-b-2 px-3.5 font-medium ${isActive ? 'border-[#17643e] font-semibold text-[#17643e]' : 'border-transparent text-slate-600 hover:text-slate-900'} ${focusRing}`}
            >
              {label}
              {badge && badge.count > 0 && (
                <>
                  <span aria-hidden="true" className="absolute right-0 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#d92d20] px-[5px] text-[11px] font-bold text-white shadow-[0_0_0_2px_#fff] lg:top-[11px]">{badge.count}</span>
                  <span className="sr-only">, {badge.label}</span>
                </>
              )}
            </a>
          );
        })}
      </nav>
      <div className="flex items-center justify-end gap-2.5">
        <button type="button" onClick={() => notify(`Aplicação ativa: ${appLabel}.`)} className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-[#17643e] px-3 font-semibold text-white hover:bg-[#0f4f30] sm:px-3.5 ${focusRing}`}>
          ✦ {appLabel}
        </button>
        <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{userInitials}</span>
        <ActionMenu
          label="Menu"
          icon="menu"
          items={[
            { label: 'Dados da empresa', icon: 'building', onSelect: () => notify('Dados da empresa — Módulo 1.') },
            ...(gerirModulos ? [{ label: 'Módulos ativos', icon: 'grid' as const, onSelect: gerirModulos }] : []),
            { label: 'Definições', icon: 'edit', onSelect: () => notify('Definições — simulação.') },
            'separator',
            { label: 'Terminar sessão', icon: 'arrow', onSelect: () => notify('Sessão terminada (simulação).') },
          ]}
        />
      </div>
    </header>
  );
}
