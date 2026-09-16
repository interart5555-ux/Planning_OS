import { Button, cx } from '../../shared/ui';
import { eur2, group, plural, qtyUnit } from '../format';
import { locationName, stateOf } from '../rules';
import type { ProductFilters } from '../types';
import { useInventoryUi } from './context';
import { categoryOptions, clientLines, clientOptions, locationOptions, matchProduct, stayOptions } from './helpers';
import { EmptyState, FilterSelect, LinkButton, MobileCard, OwnerPill, PageHeader, ProductGlyph, SearchInput, SectionTabs, StatePill, tableWrap, td, th } from './parts';

const EMPTY: ProductFilters = { q: '', owner: '', client: '', stay: '', loc: '', cat: '', state: '' };

export function ProductsScreen() {
  const { data, products: [f, setF], openDrawer, openDialog } = useInventoryUi();
  const set = (patch: Partial<ProductFilters>) => setF({ ...f, ...patch });
  const list = data.products.filter((p) => matchProduct(data, p, f)).sort((a, b) => a.name.localeCompare(b.name) || locationName(data, a.locId).localeCompare(locationName(data, b.locId)));
  const total = data.products.filter((p) => p.active).length;
  const hasFilters = Object.entries(f).some(([, v]) => v);
  const open = (id: string) => openDrawer({ kind: 'product', id, tab: 'resumo' });

  return (
    <>
      <PageHeader title="Produtos" lede="Gere o catálogo de produtos e os níveis de stock da empresa e dos clientes.">
        <Button variant="primary" icon="plus" onClick={() => openDialog({ kind: 'product' })}>Novo produto</Button>
      </PageHeader>
      <SectionTabs />

      <div role="group" aria-label="Filtros de produtos" className="mt-[18px] grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3">
        <SearchInput id="pf-q" label="Pesquisar produtos" value={f.q} onChange={(q) => set({ q })} placeholder="Pesquisar produtos…" className="col-span-2 sm:col-span-3 lg:col-span-1" />
        <FilterSelect id="pf-owner" label="Proprietário" value={f.owner} onChange={(owner) => set({ owner: owner as ProductFilters['owner'] })} options={[['', 'Proprietário: Todos'], ['company', 'Proprietário: Empresa'], ['client', 'Proprietário: Cliente']]} />
        <FilterSelect id="pf-client" label="Cliente" value={f.client} onChange={(client) => set({ client, stay: '' })} options={clientOptions(data, 'Cliente: Todos')} />
        <FilterSelect id="pf-stay" label="Alojamento" value={f.stay} onChange={(stay) => set({ stay })} options={stayOptions(data, f.client, 'Alojamento: Todos')} />
        <FilterSelect id="pf-loc" label="Localização" value={f.loc} onChange={(loc) => set({ loc })} options={locationOptions(data, 'Localização: Todas')} />
        <FilterSelect id="pf-cat" label="Categoria" value={f.cat} onChange={(cat) => set({ cat })} options={categoryOptions('Categoria: Todas')} />
        <FilterSelect id="pf-state" label="Estado" value={f.state} onChange={(state) => set({ state: state as ProductFilters['state'] })}
          options={[['', 'Estado: Todos os ativos'], ['alert', 'Stock baixo ou sem stock'], ['low', 'Stock baixo'], ['out', 'Sem stock'], ['ok', 'OK'], ['archived', 'Arquivados']]} />
        {hasFilters && <div className="flex items-center"><LinkButton onClick={() => setF(EMPTY)}>Limpar filtros</LinkButton></div>}
      </div>

      {!list.length ? (
        <div className={tableWrap}><EmptyState title={f.state === 'archived' ? 'Sem produtos arquivados' : 'Sem produtos'}>Ajusta a pesquisa ou os filtros.</EmptyState></div>
      ) : (
        <>
          <div className={cx(tableWrap, 'hidden min-[860px]:block')}>
            <table className="w-full border-collapse">
              <caption className="sr-only">Produtos</caption>
              <thead>
                <tr>
                  {['Produto', 'Categoria', 'Proprietário', 'Cliente', 'Localização'].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
                  <th scope="col" className={cx(th, 'text-right')}>Stock</th><th scope="col" className={th}>Un.</th><th scope="col" className={cx(th, 'text-right')}>Stock mín.</th>
                  <th scope="col" className={cx(th, 'text-right')}>Custo médio</th><th scope="col" className={th}>Estado</th><th scope="col" className={cx(th, 'text-right')}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const cl = clientLines(data, p);
                  return (
                    <tr key={p.id} className={p.active ? '' : 'text-slate-500'}>
                      <td className={td}><span className="flex min-w-[180px] items-center gap-2.5"><ProductGlyph glyph={p.glyph} archived={!p.active} /><b className="font-semibold">{p.name}</b></span></td>
                      <td className={cx(td, 'whitespace-nowrap')}>{p.category}</td>
                      <td className={td}><OwnerPill owner={p.owner} /></td>
                      <td className={cx(td, 'min-w-[140px]')}>{cl ? <>{cl.client}{cl.detail && <small className="block text-xs text-slate-500">{cl.detail}</small>}</> : <span className="text-slate-400">—</span>}</td>
                      <td className={cx(td, 'min-w-[130px]')}>{locationName(data, p.locId)}</td>
                      <td className={cx(td, 'text-right tabular-nums', p.active && stateOf(p) !== 'ok' && 'font-bold text-[#b42318]')}>{group(p.stock)}</td>
                      <td className={td}>{p.unit}</td>
                      <td className={cx(td, 'text-right tabular-nums')}>{group(p.min)}</td>
                      <td className={cx(td, 'whitespace-nowrap text-right tabular-nums')}>{p.owner === 'company' ? eur2(p.cost) : <span className="text-slate-400">—</span>}</td>
                      <td className={td}><StatePill product={p} /></td>
                      <td className={cx(td, 'text-right')}><Button size="sm" aria-label={`Ver ${p.name} em ${locationName(data, p.locId)}`} onClick={() => open(p.id)}>Ver</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-col gap-2.5 min-[860px]:hidden">
            {list.map((p) => (
              <MobileCard key={p.id} lead={<ProductGlyph glyph={p.glyph} archived={!p.active} />} title={p.name} subtitle={`${p.category} · ${locationName(data, p.locId)}`} badge={<StatePill product={p} />}
                facts={[
                  ['Stock', <span className={p.active && stateOf(p) !== 'ok' ? 'text-[#b42318]' : ''}>{qtyUnit(p.stock, p.unit)}</span>],
                  ['Stock mínimo', qtyUnit(p.min, p.unit)],
                  ['Proprietário', <OwnerPill owner={p.owner} />],
                  [p.owner === 'client' ? 'Cliente' : 'Custo médio', p.owner === 'client' ? clientLines(data, p)!.client : eur2(p.cost)],
                ]}
                actions={<Button onClick={() => open(p.id)}>Ver produto</Button>} />
            ))}
          </div>
        </>
      )}
      <p aria-live="polite" className="mt-3 text-[13px] text-slate-500">
        {f.state === 'archived' ? plural(list.length, 'produto arquivado', 'produtos arquivados') : `A mostrar ${list.length} de ${plural(total, 'produto', 'produtos')}`}
      </p>
    </>
  );
}
