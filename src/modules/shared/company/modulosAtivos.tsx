import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Módulos ativos por empresa.
 * Os módulos 1–6 formam a versão base e estão sempre ativos; só os módulos 7–9 são opcionais.
 * Controla apenas o que aparece na navegação, nos atalhos e nas rotas; não altera o UI dos módulos.
 * Desativar um módulo nunca apaga os seus dados.
 */

/** Versão base (módulos 1–6), obrigatória para operar. Inclui o histórico (6) e as mensagens da execução (5). */
export const MODULOS_BASE = ['onboarding', 'equipas', 'clientes', 'planeamento', 'execucao', 'aprovacoes'] as const;
export type ModuloBase = (typeof MODULOS_BASE)[number];

/** Módulos 7–9, que cada empresa pode ativar quando os conseguir gerir. */
export const MODULOS_OPCIONAIS = ['rendimentos', 'inventario', 'servicosLigados'] as const;
export type ModuloOpcional = (typeof MODULOS_OPCIONAIS)[number];

/** Configuração da empresa: só os módulos opcionais são configuráveis. */
export type ModulosOpcionais = Record<ModuloOpcional, boolean>;

/** Configuração resolvida: base sempre `true` + opcionais da empresa. */
export type ModulosAtivos = Record<ModuloBase, true> & ModulosOpcionais;
export type ModuloKey = keyof ModulosAtivos;

export const MODULOS_OPCIONAIS_PADRAO: Readonly<ModulosOpcionais> = {
  rendimentos: false,
  inventario: false,
  servicosLigados: false,
};

export const MODULO_LABEL: Record<ModuloKey, string> = {
  onboarding: 'Empresa',
  equipas: 'Equipas',
  clientes: 'Clientes, alojamentos e unidades',
  planeamento: 'Planeamento',
  execucao: 'Execução',
  aprovacoes: 'Aprovações e histórico',
  rendimentos: 'Rendimentos',
  inventario: 'Inventário',
  servicosLigados: 'Serviços ligados',
};

/** Número e descrição curta de cada módulo (janela "Módulos ativos"). */
export const MODULO_INFO: Record<ModuloKey, [number, string]> = {
  onboarding: [1, 'Dados da empresa e utilizadores'],
  equipas: [2, 'Colaboradoras, equipas e disponibilidade'],
  clientes: [3, 'Clientes, moradas e configuração dos alojamentos'],
  planeamento: [4, 'Agenda e distribuição das limpezas'],
  execucao: [5, 'O dia da colaboradora, checklist e conclusão'],
  aprovacoes: [6, 'Validação das limpezas concluídas'],
  rendimentos: [7, 'Faturação, custos e margem'],
  inventario: [8, 'Produtos, stock, consumos e compras'],
  servicosLigados: [9, 'Lavandaria e outros parceiros'],
};

export const isModuloOpcional = (key: string): key is ModuloOpcional => (MODULOS_OPCIONAIS as readonly string[]).includes(key);

/** Completa a configuração da empresa; a base nunca pode ser desligada. */
export function resolverModulos(opcionais?: Partial<ModulosOpcionais>): ModulosAtivos {
  const out = { ...MODULOS_OPCIONAIS_PADRAO } as ModulosAtivos;
  for (const key of MODULOS_OPCIONAIS) if (typeof opcionais?.[key] === 'boolean') out[key] = opcionais[key];
  for (const key of MODULOS_BASE) out[key] = true;
  return out;
}

/** Todos os módulos da lista estão ativos. */
export const modulosAtivos = (m: ModulosAtivos, ...keys: ModuloKey[]): boolean => keys.every((k) => m[k]);

/** Só a parte configurável (opcionais) de uma configuração resolvida. */
export const opcionaisDe = (m: ModulosOpcionais): ModulosOpcionais => ({ rendimentos: m.rendimentos, inventario: m.inventario, servicosLigados: m.servicosLigados });

/**
 * Configuração vinda de um parâmetro de URL (pré-visualizações).
 * "todos", "base" ou uma lista: "rendimentos,inventario,-servicosLigados" (prefixo "-" desliga).
 * Módulos da base são ignorados.
 */
export function modulosDoParametro(valor: string | null, base: ModulosOpcionais = MODULOS_OPCIONAIS_PADRAO): ModulosOpcionais {
  const out: ModulosOpcionais = { ...base };
  if (!valor) return out;
  for (const raw of valor.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (raw === 'todos') MODULOS_OPCIONAIS.forEach((k) => { out[k] = true; });
    else if (raw === 'base') Object.assign(out, MODULOS_OPCIONAIS_PADRAO);
    else {
      const off = raw.startsWith('-');
      const key = off ? raw.slice(1) : raw;
      if (isModuloOpcional(key)) out[key] = !off;
    }
  }
  return out;
}

interface ModulosContextValue {
  modulos: ModulosAtivos;
  /** Presente quando quem fornece a configuração permite alterá-la. */
  setModulos?: (next: ModulosOpcionais) => void;
}

const ModulosAtivosContext = createContext<ModulosContextValue>({ modulos: resolverModulos() });
const GerirModulosContext = createContext<(() => void) | null>(null);

/** Fornece a configuração da empresa a todos os módulos por baixo. `onChange` permite geri-la ("Módulos ativos"). */
export function ModulosAtivosProvider({ value, onChange, children }: { value?: Partial<ModulosOpcionais>; onChange?: (next: ModulosOpcionais) => void; children: ReactNode }) {
  const parent = useContext(ModulosAtivosContext);
  const setModulos = onChange ?? parent.setModulos;
  const ctx = useMemo(() => ({ modulos: resolverModulos(value), setModulos }), [value, setModulos]);
  return <ModulosAtivosContext.Provider value={ctx}>{children}</ModulosAtivosContext.Provider>;
}

/** Configuração ativa; sem Provider só a versão base está ativa. */
export const useModulosAtivos = (): ModulosAtivos => useContext(ModulosAtivosContext).modulos;
export const useSetModulosAtivos = () => useContext(ModulosAtivosContext).setModulos;

/** Abre a janela "Módulos ativos" (null quando não há quem a mostre). */
export const useGerirModulos = () => useContext(GerirModulosContext);

/** Liga a janela "Módulos ativos" a quem a abre (menu ☰, ecrã "Módulo indisponível"). */
export function GerirModulosProvider({ open, children }: { open: () => void; children: ReactNode }) {
  return <GerirModulosContext.Provider value={open}>{children}</GerirModulosContext.Provider>;
}

/** Estado local da configuração (pré-visualizações e testes). */
export function useModulosState(initial: ModulosOpcionais) {
  const [value, setValue] = useState<ModulosOpcionais>(initial);
  const onChange = useCallback((next: ModulosOpcionais) => setValue(next), []);
  return [value, onChange] as const;
}
