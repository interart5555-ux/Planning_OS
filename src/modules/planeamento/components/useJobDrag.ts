import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CONFLICT_EMOJI, DAY_HOURS, DAY_START_HOUR, lowerFirst, SNAP_MINUTES, WINDOW_EMOJI } from '../config';
import { formatHours, formatShortDay, minutesOf, timeOf } from '../dates';
import { checkSlot, freeHours, isAllowedDate, isHighPriority, isMovable, spanOf, windowCheck, type SlotCheck, type WindowCheck } from '../rules';
import type { PlanPerson, PlanningConfig, PlanningData } from '../types';
import type { PlanningActions } from '../usePlanningModule';

const DAY_START = DAY_START_HOUR * 60;
const DAY_END = (DAY_START_HOUR + DAY_HOURS) * 60;
/** Toque: é preciso manter o dedo um instante, para não impedir o scroll. */
const LONG_PRESS_MS = 280;

export type DropTarget =
  | { type: 'tray' }
  | { type: 'track'; personId: string; start: number; slot: SlotCheck; window: WindowCheck }
  | { type: 'cell'; personId: string; date: string; allowed: boolean; slot: SlotCheck; window: WindowCheck };

export interface DragState {
  kind: 'move' | 'resize';
  jobId: string;
  /** Linha de origem; null = "Por atribuir". */
  personId: string | null;
  /** Duração do cartão arrastado, em minutos. */
  duration: number;
  target: DropTarget | null;
  /** Só ao esticar: horas atuais e verificações. */
  hours?: number;
  slot?: SlotCheck;
  window?: WindowCheck;
}

interface Session {
  pointerId: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  touch: boolean;
  active: boolean;
  timer: number;
  raf: number;
  el: HTMLElement;
  kind: DragState['kind'];
  jobId: string;
  personId: string | null;
  duration: number;
  /** Maior duração do trabalho (para não passar do fim do dia). */
  span: number;
  /** Minutos entre o início do cartão e o ponto onde foi agarrado. */
  grabOffset: number;
  pxPerHour: number;
  hours0: number;
  scroller: HTMLElement | null;
  scroll0: number;
}

interface Options {
  data: PlanningData;
  people: PlanPerson[];
  config: PlanningConfig;
  actions: PlanningActions;
}

const snap = (minutes: number): number => Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;

/**
 * Arrastar cartões para o cronograma (ou de volta a "Por atribuir") e esticar
 * as horas pela pega direita. Usa Pointer Events: rato, caneta e toque.
 * As zonas de largada marcam-se com `data-drop` (+ `data-pid`, `data-date`).
 */
export function useJobDrag({ data, people, config, actions }: Options) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const session = useRef<Session | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const suppressClickUntil = useRef(0);
  const latest = useRef({ data, people, config, actions });
  latest.current = { data, people, config, actions };
  const dragRef = useRef<DragState | null>(null);

  const publish = (next: DragState | null) => {
    if (JSON.stringify(next) === JSON.stringify(dragRef.current)) return;
    dragRef.current = next;
    setDrag(next);
  };

  const placeGhost = () => {
    const s = session.current;
    if (s && ghostRef.current) ghostRef.current.style.transform = `translate(${s.x + 14}px, ${s.y + 12}px)`;
  };

  /** Recalcula o destino a partir da posição atual do ponteiro. */
  const update = useCallback(() => {
    const s = session.current;
    if (!s?.active) return;
    const { data: d, people: ppl, config: cfg } = latest.current;
    const job = d.jobs.find((j) => j.id === s.jobId);
    if (!job) return;
    placeGhost();

    if (s.kind === 'resize') {
      const start = minutesOf(job.start);
      const scrolled = s.scroller ? s.scroller.scrollLeft - s.scroll0 : 0;
      const raw = s.hours0 + (s.x - s.x0 + scrolled) / s.pxPerHour;
      const hours = Math.max(0.5, Math.min(Math.round(raw * 4) / 4, (DAY_END - start) / 60));
      const others = job.assignees.filter((a) => a.personId !== s.personId).reduce((m, a) => Math.max(m, a.hours), 0);
      publish({
        kind: 'resize', jobId: job.id, personId: s.personId, duration: hours * 60, target: null, hours,
        slot: checkSlot(s.personId!, job.date, start, start + hours * 60, job.id, d, ppl),
        window: windowCheck(job, cfg, job.date, start, start + Math.max(hours, others) * 60),
      });
      return;
    }

    const base: DragState = { kind: 'move', jobId: job.id, personId: s.personId, duration: s.duration, target: null };
    const hit = document.elementFromPoint(s.x, s.y);
    const zone = hit instanceof Element ? hit.closest<HTMLElement>('[data-drop]') : null;
    if (!zone) { publish(base); return; }
    const type = zone.dataset.drop;
    const personId = zone.dataset.pid ?? '';

    if (type === 'tray') {
      publish({ ...base, target: job.assignees.length ? { type: 'tray' } : null });
    } else if (type === 'track') {
      const rect = zone.getBoundingClientRect();
      const pxPerHour = rect.width / DAY_HOURS;
      let start = snap(DAY_START + ((s.x - rect.left) / pxPerHour) * 60 - s.grabOffset);
      start = Math.max(DAY_START, Math.min(start, DAY_END - s.span));
      const jobLength = minutesOf(job.end) - minutesOf(job.start);
      publish({
        ...base,
        target: {
          type: 'track', personId, start,
          slot: checkSlot(personId, job.date, start, start + s.duration, job.id, d, ppl),
          window: windowCheck(job, cfg, job.date, start, start + jobLength),
        },
      });
    } else if (type === 'cell') {
      const date = zone.dataset.date ?? job.date;
      const allowed = isAllowedDate(job, date, cfg);
      const start = minutesOf(job.start);
      publish({
        ...base,
        target: {
          type: 'cell', personId, date, allowed,
          slot: allowed ? checkSlot(personId, date, start, start + s.duration, job.id, d, ppl) : { state: 'ok' },
          window: allowed ? windowCheck(job, cfg, date) : { level: 'ok', short: '', text: '' },
        },
      });
    } else publish(base);
  }, []);

  const autoScroll = useCallback(() => {
    const s = session.current;
    if (!s?.active) return;
    let moved = false;
    if (s.scroller) {
      const r = s.scroller.getBoundingClientRect();
      const sticky = s.scroller.querySelector<HTMLElement>('[data-sticky-name]')?.offsetWidth ?? 0;
      if (s.y > r.top && s.y < r.bottom) {
        if (s.x > r.right - 36 && s.scroller.scrollLeft < s.scroller.scrollWidth - s.scroller.clientWidth) { s.scroller.scrollLeft += 10; moved = true; }
        else if (s.x > r.left && s.x < r.left + sticky + 24 && s.scroller.scrollLeft > 0) { s.scroller.scrollLeft -= 10; moved = true; }
      }
    }
    if (s.y > window.innerHeight - 36) { window.scrollBy(0, 10); moved = true; }
    else if (s.y < 90 && window.scrollY > 0) { window.scrollBy(0, -10); moved = true; }
    if (moved) update();
    s.raf = requestAnimationFrame(autoScroll);
  }, [update]);

  const start = useCallback(() => {
    const s = session.current;
    if (!s) return;
    s.active = true;
    s.scroller = s.el.closest<HTMLElement>('[data-dnd-scroll]') ?? document.querySelector<HTMLElement>('[data-dnd-scroll]');
    s.scroll0 = s.scroller?.scrollLeft ?? 0;
    const track = s.el.closest<HTMLElement>('[data-drop="track"]');
    if (track) {
      s.pxPerHour = track.getBoundingClientRect().width / DAY_HOURS;
      if (s.kind === 'move') s.grabOffset = ((s.x0 - s.el.getBoundingClientRect().left) / s.pxPerHour) * 60;
    }
    document.body.style.userSelect = 'none';
    document.body.style.cursor = s.kind === 'resize' ? 'ew-resize' : 'grabbing';
    update();
    s.raf = requestAnimationFrame(autoScroll);
  }, [autoScroll, update]);

  const finish = useCallback((commit: boolean) => {
    const s = session.current;
    session.current = null;
    if (!s) return;
    window.clearTimeout(s.timer);
    if (!s.active) return;
    cancelAnimationFrame(s.raf);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    suppressClickUntil.current = Date.now() + 80;
    const state = dragRef.current;
    publish(null);
    if (!commit || !state) return;

    const { data: d, people: ppl, config: cfg, actions: act } = latest.current;
    const job = d.jobs.find((j) => j.id === state.jobId);
    if (!job) return;
    const jobTerm = lowerFirst(cfg.job.singular);

    if (state.kind === 'resize') {
      if (state.hours == null || !state.personId) return;
      const current = job.assignees.find((a) => a.personId === state.personId)?.hours;
      if (state.hours === current) return;
      if (state.slot?.state === 'blocked') { act.notify(`Não é possível: ${state.slot.text}`); return; }
      const saved = act.resizeJob(job.id, state.personId, state.hours);
      if (!saved) return;
      const person = ppl.find((p) => p.id === state.personId);
      const w = windowCheck(saved, cfg);
      const end = timeOf(minutesOf(saved.start) + Math.round(state.hours * 60));
      const extra = state.slot?.state === 'overlap' ? ` ${state.slot.text}`
        : person && state.hours > freeHours(person, saved.date, saved.id, d) ? ' Fica acima das horas livres.' : '';
      act.notify(`${person?.name ?? ''} · ${saved.location}: ${formatHours(state.hours)} (${saved.start}–${end}) · por publicar.${extra}${w.level === 'bad' ? ` ${WINDOW_EMOJI} ${w.text}` : ''}`);
      return;
    }

    const t = state.target;
    if (!t) return;
    if (t.type === 'tray') {
      act.unassign(job);
      act.notify(`${job.location} voltou a “Por atribuir” · por publicar.`);
      return;
    }
    if (t.type === 'cell' && !t.allowed) {
      act.notify(isHighPriority(job, cfg)
        ? `Prioridade alta (entrada no mesmo dia): fica em ${formatShortDay(job.stayDate)}.`
        : cfg.stays && t.date < job.stayDate
          ? `Não pode ser antes da saída (${formatShortDay(job.stayDate)}).`
          : `Esta ${jobTerm} é em ${formatShortDay(job.date)}: larga-a na coluna desse dia.`);
      return;
    }
    if (t.slot.state === 'blocked') { act.notify(`Não é possível: ${t.slot.text}`); return; }
    const saved = t.type === 'track'
      ? act.moveJob(job.id, state.personId, t.personId, t.start)
      : act.moveJob(job.id, state.personId, t.personId, minutesOf(job.start), t.date);
    if (!saved) return;
    const person = ppl.find((p) => p.id === t.personId);
    const w = windowCheck(saved, cfg);
    const movedDay = saved.date !== job.date;
    act.notify(`${saved.location} → ${person?.name ?? ''}, ${movedDay ? `${formatShortDay(saved.date)} ` : ''}${saved.start}–${saved.end} · por publicar.`
      + `${t.slot.state === 'overlap' ? ` ${CONFLICT_EMOJI} ${t.slot.text}` : ''}${w.level === 'bad' ? ` ${WINDOW_EMOJI} ${w.text}` : ''}`);
  }, []);

  /** Liga-se a `onPointerDown` de um cartão (mover) ou da sua pega direita (esticar). */
  const beginDrag = useCallback((e: ReactPointerEvent<HTMLElement>, jobId: string, personId: string | null, kind: DragState['kind'] = 'move') => {
    if (e.button !== 0 || session.current) return;
    const { data: d } = latest.current;
    const job = d.jobs.find((j) => j.id === jobId);
    if (!job || !isMovable(job) || (kind === 'resize' && !personId)) return;
    const el = e.currentTarget.closest<HTMLElement>('[data-job-card]') ?? e.currentTarget;
    const span = personId ? spanOf(job, personId) : { from: minutesOf(job.start), to: minutesOf(job.end) };
    const duration = span.to - span.from;
    session.current = {
      pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
      touch: e.pointerType === 'touch', active: false, timer: 0, raf: 0, el, kind, jobId, personId,
      duration, span: Math.max(duration, minutesOf(job.end) - minutesOf(job.start)), grabOffset: 0, pxPerHour: 80,
      hours0: personId ? job.assignees.find((a) => a.personId === personId)?.hours ?? 0 : 0, scroller: null, scroll0: 0,
    };
    if (kind === 'resize') {
      e.preventDefault();
      e.stopPropagation();
      start();
    } else if (e.pointerType === 'touch') {
      session.current.timer = window.setTimeout(() => {
        if (session.current && !session.current.active) { start(); navigator.vibrate?.(12); }
      }, LONG_PRESS_MS);
    }
  }, [start]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const s = session.current;
      if (!s || e.pointerId !== s.pointerId) return;
      s.x = e.clientX;
      s.y = e.clientY;
      const distance = Math.abs(e.clientX - s.x0) + Math.abs(e.clientY - s.y0);
      if (!s.active) {
        if (s.touch) { if (distance > 8) finish(false); return; }
        if (distance < 5) return;
        start();
      }
      update();
    };
    const onUp = (e: PointerEvent) => {
      const s = session.current;
      if (!s || e.pointerId !== s.pointerId) return;
      if (s.active) { s.x = e.clientX; s.y = e.clientY; update(); }
      finish(s.active);
    };
    const onCancel = (e: PointerEvent) => { if (session.current && e.pointerId === session.current.pointerId) finish(false); };
    const onTouchMove = (e: TouchEvent) => { if (session.current?.active) e.preventDefault(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && session.current?.active) { e.stopPropagation(); finish(false); } };
    const onClick = (e: MouseEvent) => { if (Date.now() < suppressClickUntil.current) { e.preventDefault(); e.stopPropagation(); } };
    const onContext = (e: MouseEvent) => { if (session.current) e.preventDefault(); };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('contextmenu', onContext);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('contextmenu', onContext);
    };
  }, [finish, start, update]);

  return { drag, beginDrag, ghostRef, ghostOrigin: () => (session.current ? { x: session.current.x, y: session.current.y } : null) };
}
