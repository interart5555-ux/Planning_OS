import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';

/** Tons de estado partilhados por todos os módulos AppOS. */
export type Tone = 'ok' | 'warn' | 'bad' | 'dark';

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return `${words[0][0]}${last}`.toUpperCase();
}

export const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ */
/* Tokens (paleta aprovada no preview)                                 */
/* ------------------------------------------------------------------ */

export const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e] focus-visible:ring-offset-2';

/** Classe base para inputs e selects (alvo de toque ≥ 44px). */
export const inputBase =
  'w-full min-h-[44px] rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-slate-900 ' +
  'placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#17643e] ' +
  'focus:outline-none focus:ring-[3px] focus:ring-[#17643e]/15';

export const inputError = 'border-red-600 bg-red-50/40 hover:border-red-600';

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%233d444d' stroke-width='1.6'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5'/%3E%3C/svg%3E\")";

export const selectBase = `${inputBase} cursor-pointer appearance-none bg-[length:11px] bg-[right_12px_center] bg-no-repeat pr-9`;
export const selectStyle = { backgroundImage: chevron };

/* ------------------------------------------------------------------ */
/* Botões                                                              */
/* ------------------------------------------------------------------ */

type Variant = 'primary' | 'outline' | 'soft' | 'danger' | 'dangerSolid' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'border-transparent bg-[#17643e] text-white hover:bg-[#0f4f30]',
  outline: 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 aria-pressed:border-[#17643e] aria-pressed:bg-[#e9f4ee] aria-pressed:text-[#17643e]',
  soft: 'border-transparent bg-[#e9f4ee] text-[#17643e] hover:bg-[#dcede3]',
  danger: 'border-red-200 bg-white text-red-700 hover:bg-red-50',
  dangerSolid: 'border-transparent bg-red-700 text-white hover:bg-red-800',
  ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
}

export function Button({ variant = 'outline', size = 'md', icon, iconRight, loading, className, children, disabled, ...rest }: ButtonProps) {
  const iconSize = size === 'sm' ? 'h-[15px] w-[15px]' : 'h-[18px] w-[18px]';
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap border font-semibold transition disabled:cursor-default disabled:opacity-60',
        size === 'sm' ? 'min-h-[34px] rounded-[9px] px-3 text-[13px]' : 'min-h-[42px] rounded-[10px] px-[18px] text-sm',
        VARIANTS[variant],
        focusRing,
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon && <Icon name={icon} className={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} className={iconSize} />}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ icon, label, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cx('inline-grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 aria-expanded:bg-slate-100', focusRing, className)}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
});

export const Spinner = () => (
  <span aria-hidden="true" className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
);

export function TextLink({ children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx('text-[13px] font-semibold text-[#17643e] underline decoration-[#cde5d6] underline-offset-[3px] hover:decoration-[#17643e]', focusRing, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Estados e avatares                                                  */
/* ------------------------------------------------------------------ */

const TONES: Record<Tone, { pill: string; dot: string }> = {
  ok: { pill: 'bg-[#e7f5ec] text-[#17643e]', dot: 'bg-[#2e9e5b]' },
  warn: { pill: 'bg-[#fdf3d7] text-[#80570a]', dot: 'bg-[#e0a30b]' },
  bad: { pill: 'bg-[#fdecea] text-[#b42318]', dot: 'bg-[#e5484d]' },
  dark: { pill: 'bg-[#e8eaed] text-[#2b3139]', dot: 'bg-[#3b424b]' },
};

export function Pill({ tone, children, title, small }: { tone: Tone; children: ReactNode; title?: string; small?: boolean }) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium',
        small ? 'h-[22px] px-2 text-[11.5px]' : 'h-6 px-2.5 text-[12.5px]',
        TONES[tone].pill,
      )}
    >
      <span aria-hidden="true" className={cx('h-[7px] w-[7px] rounded-full', TONES[tone].dot)} />
      {children}
    </span>
  );
}

const AVATAR_SIZES = { sm: 'h-7 w-7 text-[10px]', md: 'h-8 w-8 text-[11.5px]', lg: 'h-16 w-16 text-[21px]' };

export function Avatar({ name, size = 'md', highlight, className }: { name: string; size?: keyof typeof AVATAR_SIZES; highlight?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold',
        highlight ? 'bg-[#e9f4ee] text-[#17643e]' : 'bg-slate-100 text-slate-700',
        AVATAR_SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Campos                                                              */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  htmlFor,
  optional,
  help,
  helpId,
  error,
  errorId,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  optional?: boolean;
  help?: ReactNode;
  helpId?: string;
  error?: string;
  errorId?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-slate-700">
        {label}
        {optional && <span className="font-normal text-slate-400"> (opcional)</span>}
      </label>
      {children}
      {help && <p id={helpId} className="mt-1.5 text-[12.5px] text-slate-500">{help}</p>}
      {error && <p id={errorId} role="alert" className="mt-1.5 text-[12.5px] font-medium text-red-700">{error}</p>}
    </div>
  );
}

/** Interruptor acessível (checkbox com role="switch"). */
export function Switch({ checked, onChange, label, description, small }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; small?: boolean }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-3', !small && 'rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3')}>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className={cx(
          'relative mt-px shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-[#17643e] peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#17643e]/20',
          "after:absolute after:left-[3px] after:top-[3px] after:rounded-full after:bg-white after:shadow after:transition after:content-['']",
          small
            ? 'h-5 w-[34px] after:h-3.5 after:w-3.5 peer-checked:after:translate-x-3.5'
            : 'h-6 w-10 after:h-[18px] after:w-[18px] peer-checked:after:translate-x-4',
        )}
      />
      <span className={small ? 'text-[12.5px] text-slate-700' : ''}>
        {small ? label : <b className="block text-sm font-semibold">{label}</b>}
        {description && <small className="mt-px block text-[12.5px] text-slate-500">{description}</small>}
      </span>
    </label>
  );
}

/** Grupo de opções em "pílula" (radio). */
export function ChoiceChips<T extends string>({ name, legend, value, options, onChange }: { name: string; legend: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-slate-700">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, label]) => (
          <label key={v} className="relative">
            <input type="radio" name={name} value={v} checked={v === value} onChange={() => onChange(v)} className="peer absolute inset-0 cursor-pointer opacity-0" />
            <span className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3.5 text-[13.5px] font-medium text-slate-700 peer-checked:border-[#17643e] peer-checked:bg-[#e9f4ee] peer-checked:font-semibold peer-checked:text-[#17643e] peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#17643e]/20">
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Diálogos: foco preso, Escape e devolução de foco                    */
/* ------------------------------------------------------------------ */

const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Foco preso num diálogo, Escape para fechar e devolução de foco ao sair. */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (!node) return;
      // Só o diálogo de topo reage (diálogos empilhados).
      const dialogs = document.querySelectorAll('[data-dialog]');
      if (dialogs[dialogs.length - 1] !== node) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === head) { e.preventDefault(); tail.focus(); }
      else if (!e.shiftKey && document.activeElement === tail) { e.preventDefault(); head.focus(); }
      else if (!node.contains(document.activeElement)) { e.preventDefault(); head.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [ref]);
}

/** Painel lateral direito; ecrã inteiro em telemóvel. */
export function Drawer({ label, onClose, footer, wide, children }: { label: string; onClose: () => void; footer?: ReactNode; wide?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useDialogFocus(ref, onClose);
  return createPortal(
    <div className="fixed inset-0 z-50 text-sm text-slate-900 antialiased">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside
        ref={ref}
        data-dialog
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cx('absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl', wide ? 'max-w-[600px]' : 'max-w-[540px]')}
      >
        <IconButton icon="x" label="Fechar" onClick={onClose} className="absolute right-3 top-3 z-10" />
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-7 pt-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2.5 border-t border-slate-200 bg-white px-4 py-3.5 sm:px-6 [&>button]:flex-1 sm:[&>button]:flex-none">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}

export function DrawerTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="pr-9">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-1 text-[22px] font-bold tracking-tight text-slate-900">{title}</h2>
      {children && <p className="mt-1.5 text-slate-600">{children}</p>}
    </div>
  );
}

export interface ConfirmOptions {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogFocus(ref, onClose);
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 text-sm text-slate-900 antialiased">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div ref={ref} data-dialog role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="relative w-full max-w-[420px] rounded-2xl bg-white p-[22px] shadow-2xl">
        <h2 id={titleId} className="text-lg font-bold text-slate-900">{options.title}</h2>
        <p className="mt-2 text-slate-600">{options.body}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2.5">
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            data-autofocus
            variant={options.danger ? 'dangerSolid' : 'primary'}
            onClick={() => { onClose(); options.onConfirm(); }}
          >
            {options.confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Diálogo centrado com conteúdo livre (formulários curtos). */
export function Dialog({ title, description, onClose, footer, wide, children }: { title: string; description?: ReactNode; onClose: () => void; footer: ReactNode; wide?: boolean; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogFocus(ref, onClose);
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 text-sm text-slate-900 antialiased">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div ref={ref} data-dialog role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={cx('relative flex max-h-[calc(100dvh-32px)] w-full flex-col rounded-2xl bg-white shadow-2xl', wide ? 'max-w-[520px]' : 'max-w-[440px]')}>
        <div className="overflow-y-auto p-[22px]">
          <h2 id={titleId} className="text-lg font-bold text-slate-900">{title}</h2>
          {description && <p className="mt-1.5 text-slate-600">{description}</p>}
          {children}
        </div>
        <div className="flex flex-wrap justify-end gap-2.5 border-t border-slate-200 px-[22px] py-3.5">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Menu de ações ("⋯")                                                 */
/* ------------------------------------------------------------------ */

export type MenuItem = { label: string; icon: IconName; danger?: boolean; onSelect: () => void } | 'separator';

export function ActionMenu({ label, items, icon = 'more', triggerClassName }: { label: string; items: MenuItem[]; icon?: IconName; triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setPos(null);
    if (refocus) trigger.current?.focus({ preventScroll: true });
  }, []);

  // Posição fixa calculada a partir do botão: não é cortada por tabelas com overflow.
  // Recalcula se o tamanho do menu mudar (ex.: fontes ou estilos carregados depois).
  useLayoutEffect(() => {
    const node = menu.current;
    if (!open || !trigger.current || !node) return;
    const place = () => {
      if (!trigger.current) return;
      const r = trigger.current.getBoundingClientRect();
      const { offsetWidth: w, offsetHeight: h } = node;
      let top = r.bottom + 6;
      if (top + h > window.innerHeight - 8) top = r.top - h - 6;
      setPos({
        top: Math.max(8, Math.min(top, window.innerHeight - h - 8)),
        left: Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)),
      });
    };
    place();
    node.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    const observer = new ResizeObserver(place);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) close(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    const onScroll = () => close(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, close]);

  const onMenuKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const els = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus();
  };

  return (
    <>
      <IconButton
        ref={trigger}
        icon={icon}
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={triggerClassName}
        onClick={(e) => { e.stopPropagation(); if (open) close(); else setOpen(true); }}
      />
      {open &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            onKeyDown={onMenuKey}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className="fixed z-[70] min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          >
            {items.map((item, i) =>
              item === 'separator' ? (
                <div key={`sep-${i}`} role="separator" className="mx-1 my-1.5 h-px bg-slate-200" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => { close(); item.onSelect(); }}
                  className={cx(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-100 focus:bg-slate-100 focus:outline-none',
                    item.danger ? 'text-red-700' : 'text-slate-900',
                  )}
                >
                  <Icon name={item.icon} className={cx('h-4 w-4', item.danger ? 'text-red-700' : 'text-slate-500')} />
                  {item.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

export function ToastMessage({ toast, onDismiss }: { toast: { id: number; message: string } | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  return createPortal(
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex justify-center px-4">
      {toast && (
        <div key={toast.id} role="status" className="flex max-w-full items-center gap-2.5 rounded-[11px] bg-[#16201b] px-4 py-2.5 text-sm text-white shadow-xl">
          <Icon name="check" className="h-[18px] w-[18px] text-[#6fd49d]" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Barra de pesquisa + filtros (Colaboradores e Ausências)             */
/* ------------------------------------------------------------------ */

export interface FilterSelect {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}

export function FilterBar({ query, onQuery, placeholder, searchLabel, filters }: { query: string; onQuery: (v: string) => void; placeholder: string; searchLabel: string; filters: FilterSelect[] }) {
  return (
    <div className="mt-5 grid gap-2.5 lg:grid-cols-[minmax(220px,1.3fr)_3fr]">
      <label className="relative block">
        <span className="sr-only">{searchLabel}</span>
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
        <input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} className={`${inputBase} pl-[38px]`} />
      </label>
      {/* Em telemóvel os filtros deslizam na horizontal. */}
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
        {filters.map((f) => (
          <select key={f.label} aria-label={f.label} value={f.value} onChange={(e) => f.onChange(e.target.value)} className={`${selectBase} min-w-[170px] sm:min-w-0`} style={selectStyle}>
            {f.options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        ))}
      </div>
    </div>
  );
}
