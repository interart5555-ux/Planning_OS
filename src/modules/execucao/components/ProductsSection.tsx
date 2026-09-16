import { useState } from 'react';
import { cx, focusRing, Icon, inputBase } from '../../shared/ui';
import { useModulosAtivos } from '../../shared/company';
import { locationName, qtyUnit, stateOf, stayByName, stayProducts, useOptionalInventory, type JobUsageLine } from '../../inventario';
import type { ExecJob } from '../types';
import { useExec } from './context';
import { BigButton, Notice, Optional, SectionTitle } from './parts';

type Line = JobUsageLine & { lostOpen: boolean };
const blank = (productId: string): Line => ({ productId, used: 0, lost: 0, missing: false, suggest: false, lostOpen: false });

function Stepper({ label, value, max, onChange, small }: { label: string; value: number; max: number; onChange: (v: number) => void; small?: boolean }) {
  const size = small ? 'h-9 w-9' : 'h-11 w-11';
  return (
    <span role="group" aria-label={label} className="flex items-center gap-1">
      <button type="button" aria-label="Menos" disabled={value <= 0} onClick={() => onChange(value - 1)}
        className={cx('grid place-items-center rounded-[10px] border border-[#d3d8de] bg-white text-[#17643e] disabled:cursor-default disabled:text-slate-400 disabled:opacity-60', size, focusRing)}>
        <Icon name="minus" className="h-5 w-5" />
      </button>
      <output aria-live="polite" className="min-w-[30px] text-center text-[17px] font-semibold tabular-nums">{value}</output>
      <button type="button" aria-label="Mais" disabled={value >= max} onClick={() => onChange(value + 1)}
        className={cx('grid place-items-center rounded-[10px] border border-[#d3d8de] bg-white text-[#17643e] disabled:cursor-default disabled:text-slate-400 disabled:opacity-60', size, focusRing)}>
        <Icon name="plus" className="h-5 w-5" />
      </button>
    </span>
  );
}

function Chip({ pressed, tone, icon, children, onClick, disabled }: { pressed: boolean; tone: 'bad' | 'ok'; icon?: 'triangle' | 'box'; children: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-pressed={pressed} disabled={disabled} onClick={onClick}
      className={cx('inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium disabled:opacity-60', focusRing,
        pressed ? (tone === 'bad' ? 'border-[#f0a8a0] bg-[#fde8e6] font-semibold text-[#9b2318]' : 'border-[#17643e] bg-[#e9f4ee] font-semibold text-[#17643e]') : 'border-[#d3d8de] bg-white text-slate-700')}>
      {icon && <Icon name={icon} className="h-4 w-4" />}{children}
    </button>
  );
}

/**
 * Módulo 8 (opcional) na execução: produtos usados, faltas, perdas e sugestões de reposição.
 * Produtos do cliente reduzem o stock do alojamento sem custo; produtos da empresa reduzem o stock da empresa.
 */
export function ProductsSection({ job }: { job: ExecJob }) {
  const { actions: exec } = useExec();
  const modulos = useModulosAtivos();
  const inventory = useOptionalInventory();
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [note, setNote] = useState('');
  const [log, setLog] = useState<Array<[string, string]>>([]);
  if (!modulos.inventario || !inventory) return null;

  const { data, actions } = inventory;
  const stay = stayByName(data, job.place);
  const isClient = stay?.supply === 'client';
  const products = stay ? stayProducts(data, stay) : [];
  const line = (pid: string) => lines[pid] ?? blank(pid);
  const patch = (pid: string, p: Partial<Line>) => setLines({ ...lines, [pid]: { ...line(pid), ...p } });
  const pending = Object.values(lines).filter((l) => l.used || l.lost || l.missing || l.suggest);
  const where = stay ? locationName(data, isClient ? products[0]?.locId ?? stay.locId : stay.locId) : '';

  const save = () => {
    if (!stay || !pending.length) return;
    const res = actions.registerJobUsage(stay.id, job.unit, pending.map(({ lostOpen: _open, ...l }) => l), note.trim());
    const entries: Array<[string, string]> = [];
    pending.forEach((l) => {
      const p = data.products.find((x) => x.id === l.productId)!;
      if (l.used) entries.push([p.name, `−${qtyUnit(l.used, p.unit)}`]);
      if (l.lost) entries.push([`${p.name} (perda)`, `−${qtyUnit(l.lost, p.unit)}`]);
      if (l.missing) entries.push([p.name, 'Falta registada']);
      else if (l.suggest) entries.push([p.name, 'Reposição sugerida']);
    });
    setLog([...log, ...entries]);
    setLines({});
    setNote('');
    let message = `Produtos registados · ${isClient ? 'stock do cliente atualizado, sem custo para a empresa.' : 'stock da empresa atualizado.'}`;
    if (res.alerts.length) message += ` Alerta de stock baixo enviado à gestora (${res.alerts.map((p) => p.name).join(', ')}).`;
    else if (res.requests.length) message += ' Pedido de reposição enviado à gestora.';
    exec.notify(message);
  };

  return (
    <>
      <SectionTitle aside={stay ? (isClient ? 'Produtos do cliente' : 'Produtos da empresa') : undefined}>Produtos usados</SectionTitle>
      {!stay || !products.length ? (
        <Notice tone="info" icon="info">Ainda não há produtos configurados para este alojamento. A gestora pode configurá-los na ficha do alojamento.</Notice>
      ) : (
        <>
          <p className="-mt-1 mb-2.5 flex items-center gap-1.5 text-[13.5px] text-slate-700"><Icon name="pin" className="h-4 w-4" />{where}{isClient && ' · sem custo para a empresa'}</p>
          <ul className="overflow-hidden rounded-xl border border-[#e6e8ec]">
            {products.map((p) => {
              const l = line(p.id);
              const st = stateOf(p);
              const lostShown = l.lostOpen || l.lost > 0;
              return (
                <li key={p.id} className="border-[#e6e8ec] px-3.5 py-3 [&+&]:border-t">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <b className="block font-semibold">{p.name}</b>
                      <small className={cx('block text-[12.5px]', st === 'ok' ? 'text-slate-500' : 'font-semibold text-[#9b2318]')}>Disponível: {qtyUnit(p.stock, p.unit)}{st === 'low' ? ' · abaixo do mínimo' : st === 'out' ? ' · sem stock' : ''}</small>
                    </span>
                    <Stepper label={`Quantidade usada de ${p.name}`} value={l.used} max={p.stock - l.lost} onChange={(used) => patch(p.id, { used })} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Chip tone="bad" icon="triangle" pressed={l.missing} onClick={() => patch(p.id, { missing: !l.missing })}>Falta de produto</Chip>
                    <Chip tone="bad" pressed={lostShown} onClick={() => patch(p.id, lostShown ? { lostOpen: false, lost: 0 } : { lostOpen: true })}>Perda ou desperdício</Chip>
                    <Chip tone="ok" icon="box" pressed={l.suggest || l.missing} disabled={l.missing} onClick={() => patch(p.id, { suggest: !l.suggest })}>Sugerir reposição</Chip>
                  </div>
                  {lostShown && (
                    <div className="mt-2.5 flex items-center justify-between gap-2.5 rounded-[10px] bg-[#fde8e6] px-3 py-1.5 text-[13.5px] font-medium text-[#9b2318]">
                      Perdido ou desperdiçado
                      <Stepper small label={`Quantidade perdida de ${p.name}`} value={l.lost} max={p.stock - l.used} onChange={(lost) => patch(p.id, { lost })} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <label htmlFor={`exec-products-note-${job.id}`} className="mb-1.5 mt-3.5 block font-semibold">Nota para a gestora <Optional /></label>
          <textarea id={`exec-products-note-${job.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: o detergente está quase no fim" className={cx(inputBase, 'resize-y py-2.5 text-[15px]')} />
          <BigButton variant="soft" icon="checkCircle" block className="mt-3" disabled={!pending.length} onClick={save}>Guardar produtos usados</BigButton>
          {log.length > 0 && (
            <Notice tone="ok" icon="checkCircle" title="Registado nesta limpeza">
              <ul className="mt-1">{log.map(([name, value], i) => <li key={i} className="flex justify-between gap-3"><span>{name}</span><b className="tabular-nums">{value}</b></li>)}</ul>
            </Notice>
          )}
        </>
      )}
    </>
  );
}
