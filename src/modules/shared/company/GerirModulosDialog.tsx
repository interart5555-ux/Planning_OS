import { useCallback, useState, type ReactNode } from 'react';
import { Button, cx, Dialog, Icon } from '../ui';
import { GerirModulosProvider, MODULO_INFO, MODULO_LABEL, MODULOS_BASE, MODULOS_OPCIONAIS, ModulosAtivosProvider, opcionaisDe, useModulosAtivos, type ModulosOpcionais } from './modulosAtivos';

/** Janela "Módulos ativos": base 1–6 bloqueada, opcionais 7–9 com interruptor. */
export function GerirModulosDialog({ onClose, onSave }: { onClose: () => void; onSave: (next: ModulosOpcionais) => void }) {
  const atual = useModulosAtivos();
  const [draft, setDraft] = useState<ModulosOpcionais>(() => opcionaisDe(atual));
  const row = 'flex items-center gap-3 border-slate-200 py-[11px] [&+&]:border-t';
  const num = (n: number) => <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-[13px] font-bold text-slate-600">{n}</span>;
  return (
    <Dialog title="Módulos ativos" description="Configuração da empresa · Limpezas" onClose={onClose} wide
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" data-autofocus onClick={() => onSave(draft)}>Guardar</Button></>}>
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Versão base · obrigatórios</h3>
      <ul className="mt-1">
        {MODULOS_BASE.map((k) => (
          <li key={k} className={row}>
            {num(MODULO_INFO[k][0])}
            <span className="min-w-0 flex-1"><b className="block font-semibold">{MODULO_LABEL[k]}</b><small className="block text-[12.5px] text-slate-500">{MODULO_INFO[k][1]}</small></span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] text-slate-500"><Icon name="lock" className="h-3.5 w-3.5" />Sempre ativo</span>
          </li>
        ))}
      </ul>
      <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Opcionais</h3>
      <ul className="mt-1">
        {MODULOS_OPCIONAIS.map((k) => (
          <li key={k} className={row}>
            {num(MODULO_INFO[k][0])}
            <label htmlFor={`mod-${k}`} className="min-w-0 flex-1 cursor-pointer"><b className="block font-semibold">{MODULO_LABEL[k]}</b><small className="block text-[12.5px] text-slate-500">{MODULO_INFO[k][1]}</small></label>
            <span className="relative inline-flex h-6 w-[42px] shrink-0">
              <input id={`mod-${k}`} type="checkbox" role="switch" checked={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.checked })}
                className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0" />
              <span aria-hidden="true" className={cx('absolute inset-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#17643e] peer-focus-visible:ring-offset-2', draft[k] ? 'bg-[#17643e]' : 'bg-slate-300')} />
              <span aria-hidden="true" className={cx('absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform', draft[k] && 'translate-x-[18px]')} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex gap-2 text-[12.5px] text-slate-500"><Icon name="info" className="mt-px h-[15px] w-[15px]" /><span>Desativar um módulo esconde menus, atalhos e páginas. Os dados não são apagados e voltam a aparecer ao reativar.</span></p>
    </Dialog>
  );
}

/**
 * Configuração da empresa com gestão local (pré-visualizações): fornece os módulos ativos,
 * liga "Gerir módulos ativos" à janela e guarda a escolha no browser quando há `storageKey`.
 */
export function ModulosAtivosHost({ initial, storageKey, onSaved, children }: { initial: ModulosOpcionais; storageKey?: string; onSaved?: (before: ModulosOpcionais, after: ModulosOpcionais) => void; children: ReactNode }) {
  const [value, setValue] = useState<ModulosOpcionais>(() => {
    if (!storageKey) return initial;
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null') as Partial<ModulosOpcionais> | null;
      return saved ? { ...initial, ...saved } : initial;
    } catch { return initial; }
  });
  const [open, setOpen] = useState(false);
  const change = useCallback((next: ModulosOpcionais) => {
    setValue((before) => { onSaved?.(before, next); return next; });
    if (storageKey) try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* sem armazenamento */ }
  }, [onSaved, storageKey]);
  const openDialog = useCallback(() => setOpen(true), []);
  return (
    <ModulosAtivosProvider value={value} onChange={change}>
      <GerirModulosProvider open={openDialog}>
        {children}
        {open && <GerirModulosDialog onClose={() => setOpen(false)} onSave={(next) => { change(next); setOpen(false); }} />}
      </GerirModulosProvider>
    </ModulosAtivosProvider>
  );
}
