import { useState } from 'react';
import { Button, cx, Icon } from '../../shared/ui';
import { ADJUST_REASONS, CATEGORIES, GLYPHS, UNITS } from '../config';
import { dec2, eur2, group, isInt, isoAdd, parseNum, qtyUnit } from '../format';
import { clientById, locationById, locationName, openRequestFor, orderById, productById, stayById, suggestedQty, supplierById, transferTargets } from '../rules';
import type { Category, Glyph, MeasureUnit, MoveType, Owner } from '../types';
import { useInventoryUi, type DialogState, type StockKind } from './context';
import { clientOptions, stayOptions } from './helpers';
import { Banner, ctl, ctlSelect, errProps, FormDialog, FormField, Note, OwnerPill, Segmented, selectStyle } from './parts';

type Errors = Record<string, string>;
const firstError = (errors: Errors, ids: Record<string, string>) => { const k = Object.keys(errors)[0]; if (k) document.getElementById(ids[k] ?? k)?.focus(); return Boolean(k); };
const Options = ({ list }: { list: Array<[string, string]> }) => <>{list.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</>;

/* ------------------------------------------------------------------ */
/* Produto                                                             */
/* ------------------------------------------------------------------ */

function ProductDialog({ state, onClose }: { state: Extract<DialogState, { kind: 'product' }>; onClose: () => void }) {
  const { data, actions, notify, openDrawer } = useInventoryUi();
  const existing = state.id ? productById(data, state.id) : undefined;
  const edit = Boolean(existing);
  const preset = state.preset ?? {};
  const [f, setF] = useState(() => ({
    name: existing?.name ?? '', category: (existing?.category ?? 'Produtos de limpeza') as Category, glyph: (existing?.glyph ?? 'bottle') as Glyph, unit: (existing?.unit ?? 'un') as MeasureUnit,
    owner: (existing?.owner ?? preset.owner ?? 'company') as Owner, clientId: existing?.clientId ?? preset.clientId ?? '', stayId: existing?.stayId ?? preset.stayId ?? '',
    unitName: existing?.unitName ?? preset.unitName ?? '', locId: existing?.locId ?? preset.locId ?? '', stock: '0', min: String(existing?.min ?? 0), cost: dec2(existing?.cost ?? 0), notes: existing?.notes ?? '',
  }));
  const [errors, setErrors] = useState<Errors>({});
  const isClient = f.owner === 'client';
  const stay = stayById(data, f.stayId);
  const locs = data.locations.filter((l) => l.active && l.owner === f.owner && (!isClient || (l.clientId === f.clientId && l.stayId === f.stayId)));
  const set = (patch: Partial<typeof f>) => { setF({ ...f, ...patch }); setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; }); };

  const save = () => {
    const e: Errors = {};
    const min = parseNum(f.min); const stock = parseNum(f.stock); const cost = parseNum(f.cost);
    if (!f.name.trim()) e.name = 'Indica o nome do produto.';
    if (!edit) {
      if (isClient && !f.clientId) e.clientId = 'Escolhe o cliente.';
      if (isClient && !f.stayId) e.stayId = 'Escolhe o alojamento.';
      if (!f.locId) e.locId = 'Escolhe a localização de stock.';
      if (!isInt(stock) || stock < 0) e.stock = 'Indica um número inteiro igual ou superior a 0.';
    }
    if (!isInt(min) || min < 0) e.min = 'Indica um número inteiro igual ou superior a 0.';
    if (!isClient && (Number.isNaN(cost) || cost < 0)) e.cost = 'Indica um custo igual ou superior a € 0.';
    setErrors(e);
    if (firstError(e, { name: 'mp-name', clientId: 'mp-client', stayId: 'mp-stay', locId: 'mp-loc', stock: 'mp-stock', min: 'mp-min', cost: 'mp-cost' })) return;
    const p = actions.saveProduct({ name: f.name.trim(), category: f.category, glyph: f.glyph, unit: f.unit, owner: f.owner, locId: f.locId, unitName: f.unitName, stock: edit ? 0 : stock, min, cost: isClient ? 0 : cost, notes: f.notes.trim() }, existing?.id);
    onClose();
    openDrawer({ kind: 'product', id: p.id, tab: 'resumo' });
    notify(edit ? 'Alterações guardadas.' : `Produto criado · ${isClient ? `fornecido pelo cliente (${clientById(data, p.clientId)?.name}).` : 'stock da empresa.'}`);
  };

  return (
    <FormDialog title={edit ? 'Editar produto' : 'Novo produto'} onClose={onClose} size="lg"
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>{edit ? 'Guardar alterações' : 'Criar produto'}</Button></>}>
      <FormField id="mp-name" label="Nome" required error={errors.name}>
        <input id="mp-name" data-autofocus value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Detergente neutro 5L" className={ctl} aria-required="true" {...errProps('mp-name', errors.name)} />
      </FormField>
      <div className="grid gap-x-3 min-[480px]:grid-cols-2">
        <FormField id="mp-cat" label="Categoria"><select id="mp-cat" value={f.category} onChange={(e) => set({ category: e.target.value as Category })} className={ctlSelect} style={selectStyle}><Options list={CATEGORIES.map((c) => [c, c])} /></select></FormField>
        <FormField id="mp-glyph" label="Ícone" optional><select id="mp-glyph" value={f.glyph} onChange={(e) => set({ glyph: e.target.value as Glyph })} className={ctlSelect} style={selectStyle}><Options list={GLYPHS} /></select></FormField>
        <FormField id="mp-unit" label="Unidade de medida"><select id="mp-unit" value={f.unit} onChange={(e) => set({ unit: e.target.value as MeasureUnit })} className={ctlSelect} style={selectStyle}><Options list={UNITS} /></select></FormField>
        <div className="mt-3.5 min-w-0">
          <span className="mb-1.5 block text-[13px] font-semibold text-slate-800">Proprietário</span>
          {edit ? <p className="pt-2"><OwnerPill owner={f.owner} /></p>
            : <Segmented label="Proprietário" value={f.owner} options={[['company', 'Empresa'], ['client', 'Cliente']]} onChange={(owner) => { setF({ ...f, owner, clientId: '', stayId: '', unitName: '', locId: '' }); setErrors({}); }} />}
        </div>
      </div>
      {isClient && !edit && (
        <div className="grid gap-x-3 min-[480px]:grid-cols-2">
          <FormField id="mp-client" label="Cliente" required error={errors.clientId}>
            <select id="mp-client" value={f.clientId} onChange={(e) => {
              const stays = data.stays.filter((s) => s.clientId === e.target.value);
              const stayId = stays.length === 1 ? stays[0].id : '';
              const loc = data.locations.filter((l) => l.active && l.owner === 'client' && l.stayId === stayId);
              set({ clientId: e.target.value, stayId, unitName: '', locId: loc.length === 1 ? loc[0].id : '' });
            }} className={ctlSelect} style={selectStyle} aria-required="true" {...errProps('mp-client', errors.clientId)}>
              <Options list={clientOptions(data, 'Selecionar cliente…')} />
            </select>
          </FormField>
          <FormField id="mp-stay" label="Alojamento" required error={errors.stayId}>
            <select id="mp-stay" value={f.stayId} disabled={!f.clientId} onChange={(e) => {
              const loc = data.locations.filter((l) => l.active && l.owner === 'client' && l.stayId === e.target.value);
              set({ stayId: e.target.value, unitName: '', locId: loc.length === 1 ? loc[0].id : '' });
            }} className={ctlSelect} style={selectStyle} aria-required="true" {...errProps('mp-stay', errors.stayId)}>
              <Options list={f.clientId ? stayOptions(data, f.clientId, 'Selecionar…') : [['', 'Escolhe o cliente']]} />
            </select>
          </FormField>
        </div>
      )}
      {isClient && edit && <dl className="mt-3.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]"><dt className="text-slate-500">Cliente</dt><dd className="font-medium">{clientById(data, f.clientId)?.name}</dd><dt className="text-slate-500">Alojamento</dt><dd className="font-medium">{stay?.name}</dd></dl>}
      {isClient && (
        <FormField id="mp-unitname" label="Unidade associada" optional>
          <select id="mp-unitname" value={f.unitName} disabled={!stay} onChange={(e) => set({ unitName: e.target.value })} className={ctlSelect} style={selectStyle}>
            <option value="">Todo o alojamento</option>
            {(stay?.units ?? []).map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </FormField>
      )}
      {edit ? (
        <>
          <dl className="mt-3.5 grid grid-cols-[auto_1fr] gap-x-3 text-[13px]"><dt className="text-slate-500">Localização</dt><dd className="font-medium">{locationName(data, f.locId)}</dd></dl>
          <Note>Para mudar de local usa “Transferir stock”; para corrigir quantidades usa “Ajustar stock”.</Note>
        </>
      ) : (
        <FormField id="mp-loc" label="Localização de stock" required error={errors.locId}
          hint={isClient && f.stayId && !locs.length ? 'Este alojamento ainda não tem local de stock. Cria-o em Locais de stock.' : undefined}>
          <select id="mp-loc" value={f.locId} disabled={!locs.length} onChange={(e) => set({ locId: e.target.value })} className={ctlSelect} style={selectStyle} aria-required="true" {...errProps('mp-loc', errors.locId)}>
            <option value="">{locs.length ? 'Selecionar local…' : isClient && !f.stayId ? 'Escolhe o alojamento' : 'Sem locais disponíveis'}</option>
            {locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </FormField>
      )}
      <div className={cx('grid gap-x-3', isClient ? 'min-[480px]:grid-cols-2' : 'min-[480px]:grid-cols-3')}>
        {!edit && (
          <FormField id="mp-stock" label="Stock inicial" error={errors.stock}>
            <input id="mp-stock" type="number" min={0} step={1} inputMode="numeric" value={f.stock} onChange={(e) => set({ stock: e.target.value })} className={cx(ctl, 'tabular-nums')} {...errProps('mp-stock', errors.stock)} />
          </FormField>
        )}
        <FormField id="mp-min" label="Stock mínimo" error={errors.min}>
          <input id="mp-min" type="number" min={0} step={1} inputMode="numeric" value={f.min} onChange={(e) => set({ min: e.target.value })} className={cx(ctl, 'tabular-nums')} {...errProps('mp-min', errors.min)} />
        </FormField>
        {!isClient && (
          <FormField id="mp-cost" label="Custo médio" error={errors.cost}>
            <span className="relative block"><span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
              <input id="mp-cost" inputMode="decimal" value={f.cost} onChange={(e) => set({ cost: e.target.value })} className={cx(ctl, 'pl-7 tabular-nums')} {...errProps('mp-cost', errors.cost)} /></span>
          </FormField>
        )}
      </div>
      {isClient && <Note>Produtos do cliente não têm custo médio e nunca entram em compras ou fornecedores.</Note>}
      <FormField id="mp-notes" label="Observações" optional>
        <textarea id="mp-notes" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} className={cx(ctl, 'resize-y py-2.5')} />
      </FormField>
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Entrada, consumo, ajuste e transferência                           */
/* ------------------------------------------------------------------ */

const STOCK_TITLE: Record<StockKind, string> = { entrada: 'Registar entrada', consumo: 'Registar consumo', ajuste: 'Ajustar stock', transfer: 'Transferir stock' };

function StockDialog({ state, onClose }: { state: Extract<DialogState, { kind: 'stock' }>; onClose: () => void }) {
  const { data, actions, notify, withRevenue } = useInventoryUi();
  const p = productById(data, state.id)!;
  const k = state.stock;
  const isClient = p.owner === 'client';
  const request = openRequestFor(data, p.id);
  const [f, setF] = useState(() => ({
    type: (k === 'entrada' ? (isClient ? 'Reposição do cliente' : 'Compra') : 'Consumo em limpeza') as MoveType,
    qty: k === 'ajuste' ? String(p.stock) : k === 'entrada' && request ? String(request.qty) : '',
    cost: dec2(p.cost), job: '', reason: ADJUST_REASONS[0], dest: '', note: '',
  }));
  const [errors, setErrors] = useState<Errors>({});
  const set = (patch: Partial<typeof f>) => { setF({ ...f, ...patch }); setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((key) => delete n[key]); return n; }); };
  const targets = transferTargets(data, p);
  const q = parseNum(f.qty);
  const isBuy = !isClient && k === 'entrada' && f.type === 'Compra';

  let after: number | null = null;
  if (k === 'entrada' && isInt(q) && q > 0) after = p.stock + q;
  if ((k === 'consumo' || k === 'transfer') && isInt(q) && q > 0 && q <= p.stock) after = p.stock - q;
  if (k === 'ajuste' && isInt(q) && q >= 0) after = q;

  const stay = stayById(data, p.stayId);
  const jobs = isClient && stay
    ? stay.units.map((u) => (u === stay.name ? stay.name : `${stay.name} · ${u}`))
    : data.stays.filter((s) => s.supply === 'company').flatMap((s) => s.units.map((u) => `${s.name} · ${u}`));

  const save = () => {
    const e: Errors = {};
    if (k === 'entrada') {
      if (!isInt(q) || q <= 0) e.qty = 'Indica uma quantidade inteira superior a 0.';
      const c = parseNum(f.cost);
      if (isBuy && (Number.isNaN(c) || c < 0)) e.cost = 'Indica um custo igual ou superior a € 0.';
    }
    if (k === 'consumo' || k === 'transfer') {
      if (!isInt(q) || q <= 0) e.qty = 'Indica uma quantidade inteira superior a 0.';
      else if (q > p.stock) e.qty = `Só existem ${qtyUnit(p.stock, p.unit)} em stock.`;
    }
    if (k === 'transfer' && !f.dest) e.dest = 'Escolhe o local de destino.';
    if (k === 'ajuste') {
      if (!isInt(q) || q < 0) e.qty = 'Indica um número inteiro igual ou superior a 0.';
      else if (q === p.stock) e.qty = 'O stock contado é igual ao stock atual.';
    }
    setErrors(e);
    if (firstError(e, { qty: 'ms-qty', cost: 'ms-cost', dest: 'ms-dest' })) return;

    let message = '';
    let alert = false;
    if (k === 'entrada') {
      const r = actions.registerEntry(p.id, { qty: q, type: f.type, unitCost: isBuy ? parseNum(f.cost) : null, note: f.note.trim() });
      alert = Boolean(r.alert);
      message = f.type === 'Reposição do cliente' ? `Reposição do cliente registada: +${qtyUnit(q, p.unit)}, sem custo para a empresa.` : isBuy ? `Compra registada: +${qtyUnit(q, p.unit)} · custo médio ${eur2(r.product.cost)}.` : `Devolução registada: +${qtyUnit(q, p.unit)}.`;
    } else if (k === 'consumo') {
      const r = actions.registerUse(p.id, { qty: q, type: f.type, job: f.job, note: f.note.trim() });
      alert = Boolean(r.alert);
      message = `${f.type} registado: −${qtyUnit(q, p.unit)}${isClient ? ', sem custo para a empresa.' : '.'}`;
    } else if (k === 'ajuste') {
      const r = actions.adjustStock(p.id, { counted: q, reason: f.reason, note: f.note.trim() });
      alert = Boolean(r.alert);
      message = `Stock ajustado para ${qtyUnit(q, p.unit)}.`;
    } else {
      const r = actions.transferStock(p.id, { destLocId: f.dest, qty: q, note: f.note.trim() });
      alert = Boolean(r.out.alert);
      message = `${qtyUnit(q, p.unit)} transferidos para ${locationName(data, f.dest)}.`;
    }
    onClose();
    notify(alert ? `${message} Ficou abaixo do mínimo: alerta de reposição criado para a gestora.` : message);
  };

  const qtyField = (label: string, max?: number) => (
    <FormField id="ms-qty" label={`${label} (${p.unit})`} required error={errors.qty}>
      <input id="ms-qty" data-autofocus type="number" min={k === 'ajuste' ? 0 : 1} max={max} step={1} inputMode="numeric" value={f.qty} onChange={(e) => set({ qty: e.target.value })} className={cx(ctl, 'tabular-nums')} aria-required="true" {...errProps('ms-qty', errors.qty)} />
    </FormField>
  );

  return (
    <FormDialog title={STOCK_TITLE[k]} onClose={onClose}
      lead={<><b className="text-slate-900">{p.name}</b> · {locationName(data, p.locId)}<br />Stock atual: <b className="text-slate-900">{qtyUnit(p.stock, p.unit)}</b> (mínimo {group(p.min)})</>}
      footer={<><Button onClick={onClose}>Cancelar</Button>{!(k === 'transfer' && !targets.length) && <Button variant="primary" onClick={save}>{STOCK_TITLE[k]}</Button>}</>}>
      {k === 'entrada' && (
        <>
          <div className="grid gap-x-3 min-[480px]:grid-cols-2">
            <FormField id="ms-type" label="Tipo de entrada">
              <select id="ms-type" value={f.type} onChange={(e) => set({ type: e.target.value as MoveType })} className={ctlSelect} style={selectStyle}>
                <Options list={(isClient ? ['Reposição do cliente', 'Devolução'] : ['Compra', 'Devolução']).map((t) => [t, t])} />
              </select>
            </FormField>
            {qtyField('Quantidade')}
          </div>
          {isBuy && (
            <FormField id="ms-cost" label="Custo unitário" error={errors.cost} hint="Atualiza o custo médio do produto.">
              <span className="relative block max-w-[220px]"><span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
                <input id="ms-cost" inputMode="decimal" value={f.cost} onChange={(e) => set({ cost: e.target.value })} className={cx(ctl, 'pl-7 tabular-nums')} {...errProps('ms-cost', errors.cost)} /></span>
            </FormField>
          )}
          {isClient && <Note>Reposição entregue pelo cliente: aumenta o stock do alojamento, sem custo nem compra da empresa.</Note>}
        </>
      )}
      {k === 'consumo' && (
        <>
          <div className="grid gap-x-3 min-[480px]:grid-cols-2">
            <FormField id="ms-type" label="Tipo">
              <select id="ms-type" value={f.type} onChange={(e) => set({ type: e.target.value as MoveType })} className={ctlSelect} style={selectStyle}>
                <Options list={[['Consumo em limpeza', 'Consumo em limpeza'], ['Perda ou desperdício', 'Perda ou desperdício']]} />
              </select>
            </FormField>
            {qtyField('Quantidade', p.stock)}
          </div>
          <FormField id="ms-job" label="Limpeza" optional>
            <select id="ms-job" value={f.job} onChange={(e) => set({ job: e.target.value })} className={ctlSelect} style={selectStyle}>
              <option value="">Sem limpeza associada</option>
              {jobs.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
          </FormField>
          <Note>{isClient ? 'Reduz o stock do cliente, sem custo para a empresa.' : `Reduz o stock da empresa${withRevenue ? ' e fica preparado como custo operacional em Rendimentos.' : '.'}`}</Note>
        </>
      )}
      {k === 'ajuste' && (
        <div className="grid gap-x-3 min-[480px]:grid-cols-2">
          {qtyField('Stock contado')}
          <FormField id="ms-reason" label="Motivo">
            <select id="ms-reason" value={f.reason} onChange={(e) => set({ reason: e.target.value })} className={ctlSelect} style={selectStyle}><Options list={ADJUST_REASONS.map((r) => [r, r])} /></select>
          </FormField>
        </div>
      )}
      {k === 'transfer' && (targets.length ? (
        <>
          <div className="grid gap-x-3 min-[480px]:grid-cols-2">
            <FormField id="ms-dest" label="Local de destino" required error={errors.dest}>
              <select id="ms-dest" value={f.dest} onChange={(e) => set({ dest: e.target.value })} className={ctlSelect} style={selectStyle} aria-required="true" {...errProps('ms-dest', errors.dest)}>
                <option value="">Selecionar local…</option>
                {targets.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </FormField>
            {qtyField('Quantidade', p.stock)}
          </div>
          {isClient && <Note icon="lock">O stock do cliente nunca passa para locais da empresa.</Note>}
        </>
      ) : (
        <Banner tone="warn" title="Sem locais de destino">{isClient ? 'O stock do cliente só pode ser transferido entre locais do mesmo cliente.' : 'Cria outro local de stock da empresa para transferir.'}</Banner>
      ))}
      {!(k === 'transfer' && !targets.length) && (
        <>
          <FormField id="ms-note" label={k === 'ajuste' ? 'Nota' : 'Observações'} optional>
            <input id="ms-note" maxLength={140} value={f.note} onChange={(e) => set({ note: e.target.value })} className={ctl} />
          </FormField>
          <p aria-live="polite" className="mt-3 rounded-[10px] bg-slate-50 px-3 py-2.5 text-[13px] text-slate-700">
            {after === null ? 'Indica a quantidade para ver o stock resultante.' : <>Stock {k === 'transfer' ? 'neste local' : 'resultante'}: <b className="text-slate-900">{group(p.stock)} → {qtyUnit(after, p.unit)}</b>{after < p.min && <> · <span className="font-semibold text-[#b42318]">abaixo do mínimo</span></>}</>}
          </p>
        </>
      )}
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Encomenda, receção e fornecedor                                    */
/* ------------------------------------------------------------------ */

type Line = { productId: string; qty: string; price: string };

function OrderDialog({ state, onClose }: { state: Extract<DialogState, { kind: 'order' }>; onClose: () => void }) {
  const { data, today, actions, notify, openDrawer } = useInventoryUi();
  const preset = state.productId ? productById(data, state.productId) : undefined;
  const [supplierId, setSupplierId] = useState(() => state.supplierId ?? (preset ? data.suppliers.find((s) => s.active && s.productIds.includes(preset.id))?.id ?? '' : ''));
  const [expected, setExpected] = useState(isoAdd(today, 5));
  const [lines, setLines] = useState<Line[]>(() => [{ productId: preset?.id ?? '', qty: preset ? String(state.qty ?? suggestedQty(preset)) : '', price: preset ? dec2(preset.cost) : '' }]);
  const [errors, setErrors] = useState<Errors>({});
  const supplier = supplierById(data, supplierId);
  const company = data.products.filter((p) => p.active && p.owner === 'company');
  const mine = supplier ? company.filter((p) => supplier.productIds.includes(p.id)) : [];
  const rest = company.filter((p) => !mine.includes(p));
  const total = lines.reduce((s, l) => { const q = parseNum(l.qty); const pr = parseNum(l.price); return s + (Number.isNaN(q) || Number.isNaN(pr) ? 0 : q * pr); }, 0);
  const setLine = (i: number, patch: Partial<Line>) => { setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l))); setErrors((e) => { const n = { ...e }; delete n.lines; return n; }); };

  const save = (status: 'draft' | 'ordered') => {
    const e: Errors = {};
    if (!supplierId) e.supplierId = 'Escolhe o fornecedor.';
    if (!expected || expected < today) e.expected = 'Indica uma data igual ou posterior a hoje.';
    const filled = lines.filter((l) => l.productId || l.qty || l.price);
    if (!filled.length) e.lines = 'Adiciona pelo menos um produto.';
    const seen = new Set<string>();
    for (const l of filled) {
      const p = productById(data, l.productId); const q = parseNum(l.qty); const pr = parseNum(l.price);
      if (!p || p.owner !== 'company') { e.lines = 'Escolhe um produto da empresa em cada linha.'; break; }
      if (seen.has(p.id)) { e.lines = `O produto “${p.name}” está repetido.`; break; }
      if (!isInt(q) || q <= 0) { e.lines = `Indica uma quantidade inteira superior a 0 para “${p.name}”.`; break; }
      if (Number.isNaN(pr) || pr < 0) { e.lines = `Indica um preço igual ou superior a € 0 para “${p.name}”.`; break; }
      seen.add(p.id);
    }
    setErrors(e);
    if (firstError(e, { supplierId: 'mo-sup', expected: 'mo-date', lines: 'ol-p0' })) return;
    const o = actions.createOrder({ supplierId, expected, lines: filled.map((l) => ({ productId: l.productId, qty: parseNum(l.qty), price: Math.round(parseNum(l.price) * 100) / 100 })) }, status);
    onClose();
    openDrawer({ kind: 'order', id: o.id });
    notify(`${status === 'draft' ? 'Rascunho' : 'Encomenda'} ${o.id} criad${status === 'draft' ? 'o' : 'a'} · ${eur2(o.lines.reduce((s, l) => s + l.qty * l.price, 0))}.`);
  };

  const productSelect = (l: Line, i: number) => (
    <select id={`ol-p${i}`} aria-label={`Produto ${i + 1}`} value={l.productId} className={ctlSelect} style={selectStyle}
      onChange={(e) => { const p = productById(data, e.target.value); setLine(i, { productId: e.target.value, qty: l.qty || (p ? String(suggestedQty(p)) : ''), price: l.price || (p ? dec2(p.cost) : '') }); }}>
      <option value="">Selecionar produto…</option>
      {mine.length > 0 && <optgroup label="Produtos deste fornecedor">{mine.map((p) => <option key={p.id} value={p.id}>{p.name} · {locationName(data, p.locId)}</option>)}</optgroup>}
      {mine.length > 0 ? <optgroup label="Outros produtos da empresa">{rest.map((p) => <option key={p.id} value={p.id}>{p.name} · {locationName(data, p.locId)}</option>)}</optgroup>
        : rest.map((p) => <option key={p.id} value={p.id}>{p.name} · {locationName(data, p.locId)}</option>)}
    </select>
  );

  return (
    <FormDialog title="Nova encomenda" onClose={onClose} size="wide"
      footer={<><Button onClick={onClose}>Cancelar</Button><Button onClick={() => save('draft')}>Guardar rascunho</Button><Button variant="primary" onClick={() => save('ordered')}>Criar encomenda</Button></>}>
      <div className="grid gap-x-3 min-[480px]:grid-cols-2">
        <FormField id="mo-sup" label="Fornecedor" required error={errors.supplierId}>
          <select id="mo-sup" data-autofocus value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setErrors((x) => { const n = { ...x }; delete n.supplierId; return n; }); }} className={ctlSelect} style={selectStyle} aria-required="true" {...errProps('mo-sup', errors.supplierId)}>
            <option value="">Selecionar fornecedor…</option>
            {data.suppliers.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FormField>
        <FormField id="mo-date" label="Data prevista" required error={errors.expected}>
          <input id="mo-date" type="date" min={today} value={expected} onChange={(e) => setExpected(e.target.value)} className={ctl} aria-required="true" {...errProps('mo-date', errors.expected)} />
        </FormField>
      </div>
      <fieldset className="mt-3.5 min-w-0">
        <legend className="mb-1.5 text-[13px] font-semibold text-slate-800">Produtos <span aria-hidden="true" className="text-red-700">*</span></legend>
        <ul className="flex flex-col gap-2.5">
          {lines.map((l, i) => {
            const qn = parseNum(l.qty); const pr = parseNum(l.price);
            return (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border border-slate-200 p-2.5 min-[600px]:grid-cols-[minmax(0,1fr)_84px_104px_92px_auto] min-[600px]:items-center min-[600px]:border-0 min-[600px]:p-0">
                <div className="col-span-2 min-[600px]:col-span-1">{productSelect(l, i)}</div>
                <label className="min-w-0"><span className="sr-only">Quantidade</span><input id={`ol-q${i}`} type="number" min={1} step={1} placeholder="Qtd." value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} className={cx(ctl, 'tabular-nums')} /></label>
                <label className="min-w-0"><span className="sr-only">Preço unitário (€)</span><input id={`ol-pr${i}`} inputMode="decimal" placeholder="Preço (€)" value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} className={cx(ctl, 'tabular-nums')} /></label>
                <span className="self-center text-right tabular-nums">{Number.isNaN(qn) || Number.isNaN(pr) ? '—' : eur2(qn * pr)}</span>
                <button type="button" aria-label={`Remover linha ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}
                  className="grid h-10 w-10 place-items-center justify-self-end rounded-lg border border-slate-300 text-slate-600 hover:border-red-300 hover:text-red-700 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
        {errors.lines && <p id="ol-error" className="mt-1.5 text-[13px] font-medium text-red-700">{errors.lines}</p>}
        <div className="mt-2.5 flex items-center justify-between border-t border-slate-200 pt-2.5">
          <button type="button" onClick={() => setLines([...lines, { productId: '', qty: '', price: '' }])} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#17643e] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]"><Icon name="plus" className="h-4 w-4" />Adicionar linha</button>
          <b className="tabular-nums">{eur2(total)}</b>
        </div>
      </fieldset>
      <Note icon="lock">Só produtos da empresa podem ser encomendados. Produtos dos clientes não aparecem nesta lista.</Note>
    </FormDialog>
  );
}

function ReceiveDialog({ state, onClose }: { state: Extract<DialogState, { kind: 'receive' }>; onClose: () => void }) {
  const { data, actions, notify } = useInventoryUi();
  const o = orderById(data, state.id)!;
  const [qty, setQty] = useState(() => o.lines.map((l) => String(l.qty)));
  const [error, setError] = useState('');
  const save = () => {
    const qs = qty.map(parseNum);
    const e = qs.some((q) => !isInt(q) || q < 0) ? 'Indica quantidades inteiras iguais ou superiores a 0.' : !qs.some((q) => q > 0) ? 'Indica pelo menos uma quantidade recebida.' : '';
    setError(e);
    if (e) { document.getElementById('rc-0')?.focus(); return; }
    actions.receiveOrder(o.id, qs);
    onClose();
    notify(`Receção de ${o.id} registada · stock da empresa atualizado (${qs.filter((q) => q > 0).length} ${qs.filter((q) => q > 0).length === 1 ? 'produto' : 'produtos'}).`);
  };
  return (
    <FormDialog title="Registar receção" lead={`${o.id} · ${supplierById(data, o.supplierId)?.name}`} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Confirmar receção</Button></>}>
      <table className="mt-3 w-full border-collapse text-[13.5px]">
        <thead><tr className="text-left text-xs text-slate-600"><th scope="col" className="py-1.5 font-semibold">Produto</th><th scope="col" className="py-1.5 text-right font-semibold">Encomendado</th><th scope="col" className="w-[110px] py-1.5 pl-3 font-semibold">Recebido</th></tr></thead>
        <tbody>
          {o.lines.map((l, i) => {
            const p = productById(data, l.productId)!;
            return (
              <tr key={l.productId} className="align-top">
                <td className="py-1.5">{p.name}<small className="block text-xs text-slate-500">{locationById(data, p.locId)?.name} · stock {qtyUnit(p.stock, p.unit)}</small></td>
                <td className="whitespace-nowrap py-1.5 pt-3 text-right tabular-nums">{qtyUnit(l.qty, p.unit)}</td>
                <td className="py-1.5 pl-3"><label className="sr-only" htmlFor={`rc-${i}`}>Recebido de {p.name}</label><input id={`rc-${i}`} data-autofocus={i === 0 || undefined} type="number" min={0} step={1} value={qty[i]} onChange={(e) => setQty(qty.map((x, j) => (j === i ? e.target.value : x)))} className={cx(ctl, 'tabular-nums')} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {error && <p className="mt-1.5 text-[13px] font-medium text-red-700">{error}</p>}
      <Note>Cria movimentos “Compra” e atualiza o stock e o custo médio dos produtos da empresa.</Note>
    </FormDialog>
  );
}

function SupplierDialog({ onClose }: { onClose: () => void }) {
  const { actions, notify, openDrawer, suppliers: [sf, setSf] } = useInventoryUi();
  const [f, setF] = useState({ name: '', contact: '', phone: '', email: '', categories: [] as Category[], active: true });
  const [errors, setErrors] = useState<Errors>({});
  const save = () => {
    const e: Errors = {};
    if (!f.name.trim()) e.name = 'Indica o nome do fornecedor.';
    if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = 'Indica um email válido.';
    if (!f.categories.length) e.categories = 'Escolhe pelo menos uma categoria.';
    setErrors(e);
    if (firstError(e, { name: 'sp-name', email: 'sp-email', categories: 'sp-cat0' })) return;
    const s = actions.createSupplier({ name: f.name.trim(), contact: f.contact.trim(), phone: f.phone.trim(), email: f.email.trim(), categories: CATEGORIES.filter((c) => f.categories.includes(c)), active: f.active });
    onClose();
    setSf({ ...sf, tab: 'suppliers' });
    openDrawer({ kind: 'supplier', id: s.id });
    notify(`Fornecedor criado: ${s.name}.`);
  };
  return (
    <FormDialog title="Novo fornecedor" onClose={onClose} footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Criar fornecedor</Button></>}>
      <FormField id="sp-name" label="Nome" required error={errors.name}>
        <input id="sp-name" data-autofocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={ctl} aria-required="true" {...errProps('sp-name', errors.name)} />
      </FormField>
      <div className="grid gap-x-3 min-[480px]:grid-cols-2">
        <FormField id="sp-contact" label="Contacto"><input id="sp-contact" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="Nome da pessoa" className={ctl} /></FormField>
        <FormField id="sp-phone" label="Telefone"><input id="sp-phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+351 …" className={ctl} /></FormField>
      </div>
      <FormField id="sp-email" label="Email" error={errors.email}>
        <input id="sp-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={ctl} {...errProps('sp-email', errors.email)} />
      </FormField>
      <fieldset className="mt-3.5">
        <legend className="mb-1.5 text-[13px] font-semibold text-slate-800">Categorias fornecidas <span aria-hidden="true" className="text-red-700">*</span></legend>
        <div className="grid gap-2 min-[480px]:grid-cols-2">
          {CATEGORIES.map((c, i) => (
            <label key={c} className={cx('flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2', f.categories.includes(c) ? 'border-[#17643e] bg-[#e9f4ee]' : 'border-slate-300')}>
              <input id={`sp-cat${i}`} type="checkbox" checked={f.categories.includes(c)} className="h-4 w-4 accent-[#17643e]"
                onChange={(e) => { setF({ ...f, categories: e.target.checked ? [...f.categories, c] : f.categories.filter((x) => x !== c) }); setErrors((x) => { const n = { ...x }; delete n.categories; return n; }); }} />
              {c}
            </label>
          ))}
        </div>
        {errors.categories && <p className="mt-1.5 text-[13px] font-medium text-red-700">{errors.categories}</p>}
      </fieldset>
      <label className="mt-4 flex cursor-pointer items-center gap-2.5">
        <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="h-4 w-4 accent-[#17643e]" />Fornecedor ativo
      </label>
    </FormDialog>
  );
}

/** Diálogo ativo do módulo. */
export function InventoryDialogs() {
  const { data } = useInventoryUi();
  const ui = useInventoryUi();
  const d = ui.dialog;
  const close = ui.closeDialog;
  if (!d) return null;
  if (d.kind === 'product') return <ProductDialog state={d} onClose={close} />;
  if (d.kind === 'stock') return productById(data, d.id) ? <StockDialog key={`${d.stock}-${d.id}`} state={d} onClose={close} /> : null;
  if (d.kind === 'order') return <OrderDialog state={d} onClose={close} />;
  if (d.kind === 'receive') return orderById(data, d.id) ? <ReceiveDialog state={d} onClose={close} /> : null;
  return <SupplierDialog onClose={close} />;
}
