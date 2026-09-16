import { useMemo, useState } from 'react';
import { Button, cx, Icon } from '../../shared/ui';
import { useModulosAtivos } from '../../shared/company';
import { MAX_SUPPLEMENT } from '../config';
import { dec2, eur2, isInt, parseNum, plural, qtyUnit } from '../format';
import { locationName, operationalCost, productsAt, stateOf, stayById } from '../rules';
import { useInventory } from '../store';
import type { Owner } from '../types';
import { InventoryUiContext, type DialogState, type InventoryUiValue } from './context';
import { InventoryDialogs } from './Dialogs';
import { NewLocationForm } from './LocationsScreen';
import { Banner, ctl, ctlSelect, FormDialog, Note, ProductGlyph, selectStyle, StatePill, tableWrap, td, th } from './parts';

export interface StayRef {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  address: string;
  units: string[];
}

/**
 * Módulo 3 · ficha do alojamento — "Quem fornece os produtos?".
 * Só aparece com o Inventário ativo; as alterações ficam logo guardadas no inventário.
 */
export function StaySupplySection({ stay: ref, notify }: { stay: StayRef; notify: (message: string) => void }) {
  const { data, actions, today, now } = useInventory();
  const modulos = useModulosAtivos();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [newLocation, setNewLocation] = useState(false);
  const stay = stayById(data, ref.id);

  const ctx = useMemo<InventoryUiValue>(() => ({
    data, actions, today, now, withRevenue: modulos.rendimentos, screen: 'resumo', go: () => undefined, notify,
    drawer: null, openDrawer: () => undefined, dialog, openDialog: setDialog, closeDialog: () => setDialog(null),
    summary: [{ loc: '', owner: '', client: '', cat: '', state: '' }, () => undefined],
    products: [{ q: '', owner: '', client: '', stay: '', loc: '', cat: '', state: '' }, () => undefined],
    locations: [{ q: '', owner: '', client: '', status: 'active', tab: 'list' }, () => undefined],
    movements: [{ from: today, to: today, type: '', product: '', owner: '', loc: '', client: '', stay: '', origin: '', more: false }, () => undefined],
    suppliers: [{ tab: 'orders', status: '' }, () => undefined],
  }), [data, actions, today, now, modulos.rendimentos, notify, dialog]);

  if (!stay) {
    return (
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-[17px] font-bold">Quem fornece os produtos?</h3>
        <p className="mt-1 text-slate-600">Este alojamento ainda não está configurado no inventário.</p>
        <Button className="mt-3" variant="primary" onClick={() => { actions.ensureStay(ref, ref.clientName); notify('Alojamento adicionado ao inventário.'); }}>Configurar produtos</Button>
      </section>
    );
  }

  const isClient = stay.supply === 'client';
  const clientLocs = data.locations.filter((l) => l.active && l.owner === 'client' && l.stayId === stay.id);
  const companyLocs = data.locations.filter((l) => l.active && l.owner === 'company');
  const authorized = data.products.filter((p) => p.active && p.owner === 'client' && p.stayId === stay.id);
  const available = productsAt(data, stay.locId).filter((p) => p.owner === 'company');

  const setSupply = (supply: Owner) => {
    actions.configureStay(stay.id, { supply });
    notify(supply === 'client' ? 'Cliente fornece os produtos: os consumos reduzem o stock do cliente, sem custo para a empresa.' : 'Empresa inclui os produtos no serviço: os consumos usam stock da empresa.');
  };
  const setMin = (pid: string, value: string) => {
    const p = data.products.find((x) => x.id === pid)!;
    const n = parseNum(value);
    if (!isInt(n) || n < 0) { notify('Indica um número inteiro igual ou superior a 0.'); return; }
    if (n === p.min) return;
    const { alert } = actions.setMinimum(pid, n);
    notify(`Stock mínimo de ${p.name}: ${qtyUnit(n, p.unit)}.${alert ? ' Ficou abaixo do mínimo: alerta criado.' : ''}`);
  };
  const setSupplement = (value: string) => {
    const v = parseNum(value);
    if (Number.isNaN(v) || v < 0 || v > MAX_SUPPLEMENT) { notify(`Indica um suplemento entre € 0,00 e € ${MAX_SUPPLEMENT},00.`); return; }
    if (v === stay.supplement) return;
    actions.configureStay(stay.id, { supplement: Math.round(v * 100) / 100 });
    notify(`Suplemento de produtos: ${eur2(v)} por limpeza.`);
  };
  const monthCost = operationalCost(data, `${today.slice(0, 8)}01`, today, stay.name).cost;

  const option = (value: Owner, title: string, text: string) => (
    <label className={cx('flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-3', stay.supply === value ? 'border-[#17643e] bg-[#e9f4ee]' : 'border-slate-300 bg-white')}>
      <input type="radio" name={`supply-${stay.id}`} checked={stay.supply === value} onChange={() => setSupply(value)} className="mt-[3px] accent-[#17643e]" />
      <span><b className="block font-semibold">{title}</b><small className="block text-[12.5px] text-slate-500">{text}</small></span>
    </label>
  );

  return (
    <InventoryUiContext.Provider value={ctx}>
      <section aria-labelledby={`supply-title-${stay.id}`} className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 id={`supply-title-${stay.id}`} className="text-[17px] font-bold tracking-tight">Quem fornece os produtos?</h3>
        <p className="mb-3.5 mt-1 text-slate-600">Define se as limpezas deste alojamento usam produtos do cliente ou produtos da empresa.</p>
        <fieldset>
          <legend className="sr-only">Quem fornece os produtos?</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {option('client', 'Cliente fornece os produtos', 'Os produtos são do cliente e ficam guardados no alojamento. Não geram custo para a empresa.')}
            {option('company', 'Empresa inclui os produtos no serviço', 'Usa stock da empresa. Pode ter suplemento de produtos por limpeza.')}
          </div>
        </fieldset>

        {isClient ? (
          <>
            <div className="mt-4 max-w-[420px]">
              <label htmlFor={`stay-loc-${stay.id}`} className="mb-1.5 block text-[13px] font-semibold text-slate-800">Local de stock do alojamento</label>
              {clientLocs.length ? (
                <select id={`stay-loc-${stay.id}`} value={stay.locId} onChange={(e) => { actions.configureStay(stay.id, { locId: e.target.value }); notify(`Local de stock do alojamento: ${locationName(data, e.target.value)}.`); }} className={ctlSelect} style={selectStyle}>
                  {!clientLocs.some((l) => l.id === stay.locId) && <option value="">Selecionar local…</option>}
                  {clientLocs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              ) : <Banner tone="warn" className="mt-0" title="Sem local de stock">Cria o armário ou a despensa onde o cliente guarda os produtos.</Banner>}
              <button type="button" onClick={() => setNewLocation(true)} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#17643e] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]"><Icon name="plus" className="h-4 w-4" />Criar local de stock</button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5">
              <h4 className="text-[15px] font-semibold">Produtos autorizados ({authorized.length})</h4>
              <Button size="sm" icon="plus" disabled={!clientLocs.length} className="!border-[#17643e] !text-[#17643e]"
                onClick={() => setDialog({ kind: 'product', preset: { owner: 'client', clientId: stay.clientId, stayId: stay.id, locId: clientLocs.some((l) => l.id === stay.locId) ? stay.locId : clientLocs[0]?.id } })}>
                Adicionar produto autorizado
              </Button>
            </div>
            {authorized.length ? (
              <div className={tableWrap}>
                <table className="w-full border-collapse">
                  <caption className="sr-only">Produtos autorizados</caption>
                  <thead><tr><th scope="col" className={th}>Produto</th><th scope="col" className={th}>Local</th><th scope="col" className={cx(th, 'text-right')}>Stock</th><th scope="col" className={cx(th, 'text-right')}>Stock mínimo</th><th scope="col" className={th}>Estado</th><th scope="col" className={cx(th, 'text-right')}>Ações</th></tr></thead>
                  <tbody>
                    {authorized.map((p) => (
                      <tr key={p.id}>
                        <td className={td}><span className="flex min-w-[170px] items-center gap-2.5"><ProductGlyph glyph={p.glyph} /><span><b className="font-semibold">{p.name}</b>{p.unitName && <small className="block text-xs text-slate-500">{p.unitName}</small>}</span></span></td>
                        <td className={cx(td, 'min-w-[120px]')}>{locationName(data, p.locId)}</td>
                        <td className={cx(td, 'whitespace-nowrap text-right tabular-nums', stateOf(p) !== 'ok' && 'font-bold text-[#b42318]')}>{qtyUnit(p.stock, p.unit)}</td>
                        <td className={cx(td, 'text-right')}>
                          <label htmlFor={`min-${p.id}`} className="sr-only">Stock mínimo de {p.name}</label>
                          <input key={`${p.id}-${p.min}`} id={`min-${p.id}`} type="number" min={0} step={1} inputMode="numeric" defaultValue={p.min} onBlur={(e) => setMin(p.id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} className={cx(ctl, 'ml-auto !min-h-[34px] w-[84px] text-right tabular-nums')} />
                        </td>
                        <td className={td}><StatePill product={p} /></td>
                        <td className={td}>
                          <span className="flex justify-end gap-1.5">
                            <Button size="sm" icon="download" onClick={() => setDialog({ kind: 'stock', stock: 'entrada', id: p.id })}>Reposição entregue</Button>
                            <Button size="sm" icon="minus" disabled={p.stock <= 0} aria-label={`Registar consumo de ${p.name}`} title="Registar consumo" onClick={() => setDialog({ kind: 'stock', stock: 'consumo', id: p.id })}>Consumo</Button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-slate-500">Sem produtos autorizados. Adiciona os produtos que o cliente deixa no alojamento.</p>}
            <Banner title="Sem custo para a empresa">Os consumos destes produtos reduzem o stock do alojamento. Quando o stock fica abaixo do mínimo, a gestora recebe um alerta de reposição.</Banner>
          </>
        ) : (
          <>
            <div className="mt-4 grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor={`stay-supp-${stay.id}`} className="mb-1.5 block text-[13px] font-semibold text-slate-800">Suplemento de produtos por limpeza</label>
                <span className="relative block"><span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
                  <input key={stay.supplement} id={`stay-supp-${stay.id}`} inputMode="decimal" defaultValue={dec2(stay.supplement)} onBlur={(e) => setSupplement(e.target.value)} className={cx(ctl, 'pl-7 tabular-nums')} /></span>
                <p className="mt-1.5 text-[12.5px] text-slate-500">Valor cobrado ao cliente por limpeza.</p>
              </div>
              <div>
                <label htmlFor={`stay-cloc-${stay.id}`} className="mb-1.5 block text-[13px] font-semibold text-slate-800">Local de stock da empresa</label>
                <select id={`stay-cloc-${stay.id}`} value={stay.locId} onChange={(e) => { actions.configureStay(stay.id, { locId: e.target.value }); notify(`As limpezas deste alojamento usam stock de ${locationName(data, e.target.value)}.`); }} className={ctlSelect} style={selectStyle}>
                  {companyLocs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <p className="mt-1.5 text-[12.5px] text-slate-500">De onde saem os produtos usados neste alojamento.</p>
              </div>
            </div>
            <fieldset className="mt-5">
              <legend className="mb-2 text-[15px] font-semibold">Produtos usados nas limpezas ({stay.productIds.length})</legend>
              {available.length ? (
                <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
                  {available.map((p) => {
                    const on = stay.productIds.includes(p.id);
                    return (
                      <label key={p.id} className={cx('flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2', on ? 'border-[#17643e] bg-[#e9f4ee]' : 'border-slate-300')}>
                        <input type="checkbox" checked={on} className="h-4 w-4 accent-[#17643e]" onChange={() => actions.configureStay(stay.id, { productIds: on ? stay.productIds.filter((x) => x !== p.id) : [...stay.productIds, p.id] })} />
                        <ProductGlyph glyph={p.glyph} />
                        <span className="min-w-0"><b className="block font-semibold">{p.name}</b><small className="block text-xs text-slate-500">Stock {qtyUnit(p.stock, p.unit)}{modulos.rendimentos && ` · ${eur2(p.cost)}/${p.unit}`}</small></span>
                      </label>
                    );
                  })}
                </div>
              ) : <p className="text-slate-500">Sem produtos neste local. Escolhe outro local ou adiciona produtos da empresa no Inventário.</p>}
            </fieldset>
            {modulos.rendimentos
              ? <Banner tone="green" title="Preparado para Rendimentos">O consumo destes produtos gera custo operacional (custo médio × quantidade). Este mês, neste alojamento: {eur2(monthCost)}. Os cálculos financeiros finais ficam no módulo Rendimentos.</Banner>
              : <Note>Rendimentos inativo: o custo fica registado no inventário, sem relatórios financeiros.</Note>}
          </>
        )}
        <p className="mt-3 text-[12.5px] text-slate-500">{plural(data.moves.filter((m) => m.stayId === stay.id || m.job.startsWith(stay.name)).length, 'movimento', 'movimentos')} de stock associados a este alojamento · guardado automaticamente no inventário.</p>
      </section>

      {newLocation && (
        <FormDialog title="Novo local de stock" lead={`${ref.clientName} · ${stay.name}`} onClose={() => setNewLocation(false)} footer={<Button onClick={() => setNewLocation(false)}>Cancelar</Button>}>
          <div className="-mt-1"><NewLocationForm bare preset={{ clientId: stay.clientId, stayId: stay.id, name: `${stay.name} · ` }} onCreated={() => setNewLocation(false)} /></div>
        </FormDialog>
      )}
      <InventoryDialogs />
    </InventoryUiContext.Provider>
  );
}
