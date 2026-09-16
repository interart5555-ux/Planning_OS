import { Button, cx, Icon } from '../../shared/ui';
import { MOVE_TYPES, ORIGINS } from '../config';
import { dec2, eur2, fmtShortTime, group, plural, signed } from '../format';
import { locationName, locationById, productById, sortMoves } from '../rules';
import type { InventoryData, Movement, MovementFilters } from '../types';
import { useInventoryUi } from './context';
import { clientLines, clientOptions, locationOptions, stayOptions } from './helpers';
import { Banner, ctl, EmptyState, FilterSelect, LinkButton, MobileCard, OwnerPill, PageHeader, ProductGlyph, SectionTabs, tableWrap, td, th } from './parts';

export const defaultMovementFilters = (today: string): MovementFilters => ({ from: `${today.slice(0, 8)}01`, to: today, type: '', product: '', owner: '', loc: '', client: '', stay: '', origin: '', more: false });

export function filterMoves(d: InventoryData, f: MovementFilters): Movement[] {
  return sortMoves(d.moves.filter((m) => {
    const day = m.at.slice(0, 10);
    const p = productById(d, m.productId);
    return (!f.from || day >= f.from) && (!f.to || day <= f.to) && (!f.type || m.type === f.type) && (!f.product || p?.name === f.product) && (!f.owner || m.owner === f.owner)
      && (!f.loc || m.locId === f.loc) && (!f.client || m.clientId === f.client) && (!f.stay || m.stayId === f.stay) && (!f.origin || m.origin === f.origin);
  }));
}

export function MovementsScreen() {
  const { data, today, movements: [f, setF], openDrawer, notify } = useInventoryUi();
  const set = (patch: Partial<MovementFilters>) => setF({ ...f, ...patch });
  const list = filterMoves(data, f);
  const names = [...new Set(data.products.map((p) => p.name))].sort();
  const moreActive = Boolean(f.client || f.stay || f.origin);
  const showMore = f.more || moreActive;

  return (
    <>
      <PageHeader title="Movimentos de stock" lede="Consulta todos os movimentos de stock, incluindo compras, reposições, ajustes, transferências e consumos." />
      <SectionTabs />

      <div role="group" aria-label="Filtros de movimentos" className="mt-[18px] flex flex-wrap items-center gap-2.5 lg:gap-3">
        <div className="flex flex-[1_1_300px] items-center gap-2">
          <label htmlFor="mf-from" className="sr-only">Desde</label>
          <input id="mf-from" type="date" max={today} value={f.from} onChange={(e) => set({ from: e.target.value })} className={ctl} />
          <Icon name="arrow" className="h-4 w-4 text-slate-400" />
          <label htmlFor="mf-to" className="sr-only">Até</label>
          <input id="mf-to" type="date" max={today} value={f.to} onChange={(e) => set({ to: e.target.value })} className={ctl} />
        </div>
        <FilterSelect id="mf-type" label="Tipo de movimento" value={f.type} onChange={(type) => set({ type })} options={[['', 'Todos os tipos'], ...MOVE_TYPES.map((t): [string, string] => [t, t])]} className="flex-[1_1_170px]" />
        <FilterSelect id="mf-product" label="Produto" value={f.product} onChange={(product) => set({ product })} options={[['', 'Todos os produtos'], ...names.map((n): [string, string] => [n, n])]} className="flex-[1_1_170px]" />
        <FilterSelect id="mf-owner" label="Proprietário" value={f.owner} onChange={(owner) => set({ owner: owner as MovementFilters['owner'] })} options={[['', 'Todos os proprietários'], ['company', 'Empresa'], ['client', 'Cliente']]} className="flex-[1_1_170px]" />
        <FilterSelect id="mf-loc" label="Localização" value={f.loc} onChange={(loc) => set({ loc })} options={locationOptions(data, 'Todas as localizações', true)} className="flex-[1_1_170px]" />
        <Button icon="filter" aria-expanded={showMore} aria-controls="mf-more" onClick={() => set(showMore ? { more: false, client: '', stay: '', origin: '' } : { more: true })}>{showMore ? 'Menos filtros' : 'Mais filtros'}</Button>
        <Button icon="download" onClick={() => notify(`Exportação de ${plural(list.length, 'movimento', 'movimentos')} preparada (simulação, nenhum ficheiro foi criado).`)}>Exportar</Button>
      </div>
      {showMore && (
        <div id="mf-more" role="group" aria-label="Mais filtros" className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <FilterSelect id="mf-client" label="Cliente" value={f.client} onChange={(client) => set({ client, stay: '' })} options={clientOptions(data, 'Todos os clientes')} className="flex-[1_1_200px]" />
          <FilterSelect id="mf-stay" label="Alojamento" value={f.stay} onChange={(stay) => set({ stay })} options={stayOptions(data, f.client, 'Todos os alojamentos')} className="flex-[1_1_200px]" />
          <FilterSelect id="mf-origin" label="Origem" value={f.origin} onChange={(origin) => set({ origin })} options={[['', 'Todas as origens'], ...ORIGINS.map((o): [string, string] => [o, o])]} className="flex-[1_1_200px]" />
          <LinkButton onClick={() => setF(defaultMovementFilters(today))}>Limpar filtros</LinkButton>
        </div>
      )}

      {!list.length ? (
        <div className={tableWrap}><EmptyState title="Sem movimentos">Ajusta o período ou os filtros.</EmptyState></div>
      ) : (
        <>
          <div className={cx(tableWrap, 'hidden min-[860px]:block')}>
            <table className="w-full border-collapse">
              <caption className="sr-only">Movimentos de stock</caption>
              <thead>
                <tr>
                  {['Data', 'Produto', 'Tipo', 'Origem', 'Proprietário', 'Localização'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
                  <th scope="col" className={cx(th, 'text-right')}>Quantidade</th><th scope="col" className={cx(th, 'text-right')}>Stock resultante</th><th scope="col" className={cx(th, 'text-right')}>Custo (€)</th><th scope="col" className={th}>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => {
                  const p = productById(data, m.productId)!;
                  const cl = clientLines(data, m);
                  return (
                    <tr key={m.id}>
                      <td className={cx(td, 'whitespace-nowrap tabular-nums')}>{fmtShortTime(m.at)}</td>
                      <td className={cx(td, 'min-w-[170px]')}>
                        <button type="button" onClick={() => openDrawer({ kind: 'product', id: p.id, tab: 'movimentos' })} className="text-left font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">{p.name}</button>
                        {(m.job || m.note) && <small className="block text-xs text-slate-500">{m.job || m.note}</small>}
                      </td>
                      <td className={cx(td, 'min-w-[110px]')}>{m.type}</td>
                      <td className={cx(td, 'min-w-[90px]')}>{m.origin}</td>
                      <td className={cx(td, 'min-w-[120px]')}><OwnerPill owner={m.owner} />{cl && <small className="mt-0.5 block text-xs text-slate-500">{cl.client}</small>}</td>
                      <td className={cx(td, 'min-w-[120px]')}>{locationName(data, m.locId)}</td>
                      <td className={cx(td, 'text-right font-bold tabular-nums', m.qty < 0 ? 'text-[#b42318]' : 'text-[#17643e]')}>{signed(m.qty)}</td>
                      <td className={cx(td, 'text-right tabular-nums')}>{group(m.result)}</td>
                      <td className={cx(td, 'whitespace-nowrap text-right tabular-nums')}>{m.owner === 'client' ? <span className="text-slate-500">Sem custo</span> : m.cost ? dec2(m.cost) : <span className="text-slate-400">—</span>}</td>
                      <td className={cx(td, 'whitespace-nowrap')}>{m.user}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-col gap-2.5 min-[860px]:hidden">
            {list.slice(0, 40).map((m) => {
              const p = productById(data, m.productId)!;
              return (
                <MobileCard key={m.id} lead={<ProductGlyph glyph={p.glyph} />} title={p.name} subtitle={`${fmtShortTime(m.at)} · ${m.type}`}
                  badge={<b className={cx('tabular-nums', m.qty < 0 ? 'text-[#b42318]' : 'text-[#17643e]')}>{signed(m.qty)}</b>}
                  facts={[['Proprietário', <OwnerPill owner={m.owner} />], ['Stock resultante', group(m.result)], ['Localização', locationById(data, m.locId)?.name ?? '—'], ['Custo', m.owner === 'client' ? 'Sem custo' : m.cost ? eur2(m.cost) : '—']]} />
              );
            })}
          </div>
        </>
      )}
      <p className="mt-3 text-[13px] text-slate-500">A mostrar {plural(list.length, 'movimento', 'movimentos')}</p>
      <Banner title="Os consumos de produtos fornecidos pelo cliente reduzem o stock do alojamento, sem gerar custo para a empresa.">
        Estes movimentos são registados como “Consumo em limpeza” e afetam apenas o stock do cliente.
      </Banner>
    </>
  );
}
