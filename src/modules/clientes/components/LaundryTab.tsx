import { Button } from '../../shared/ui';
import { lower } from '../appConfigs';
import { LAUNDRY_ITEMS, laundryTotal } from '../format';
import { useClients } from './context';
import type { DetailState } from './LocationDetail';
import { Card, Stat, TagChip } from './parts';

/** Resumo da lavandaria externa por unidade (campo específico de Limpezas). */
export function LaundryTab({ state }: { state: DetailState }) {
  const { config } = useClients();
  const { draft, setDraft } = state;
  const withLaundry = draft.units.filter((u) => u.laundry);
  const loc = lower(config.location);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <Card>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" role="switch" className="peer sr-only" checked={draft.laundryEnabled} onChange={(e) => { const v = e.target.checked; setDraft((d) => ({ ...d, laundryEnabled: v })); }} />
          <span aria-hidden="true" className="relative mt-px h-6 w-[42px] shrink-0 rounded-full bg-slate-300 transition after:absolute after:left-[3px] after:top-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow after:transition after:content-[''] peer-checked:bg-[#17643e] peer-checked:after:translate-x-[18px] peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#17643e]/25" />
          <span>
            <b className="block text-[13.5px] font-semibold">Envia roupa para lavandaria externa</b>
            <small className="mt-0.5 block text-[12.5px] text-slate-500">O setup é definido no {loc} mas aplica-se apenas às unidades selecionadas.</small>
          </span>
        </label>
      </Card>

      {!draft.laundryEnabled ? (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-slate-500">
          <b className="mb-1 block font-semibold text-slate-900">Lavandaria externa desativada</b>
          Ativa o interruptor para definir o setup de lavandaria.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat value={`${withLaundry.length}/${draft.units.length}`} label="unidades com lavandaria" />
            <Stat value={laundryTotal(draft.laundrySetup)} label={`peças no setup do ${loc}`} />
            <Stat value={withLaundry.reduce((s, u) => s + laundryTotal(u.laundry), 0)} label="peças se todas forem limpas" />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[12.5px] text-slate-500 [&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3.5 [&>th]:py-2.5 [&>th]:font-medium">
                  <th>{config.unit.singular}</th>
                  {LAUNDRY_ITEMS.map(([k, label]) => <th key={k}>{label}</th>)}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {draft.units.map((u) => (
                  <tr key={u.id} className="border-b border-slate-200 tabular-nums last:border-0 [&>td]:px-3.5 [&>td]:py-2.5">
                    <td className="font-semibold">{u.name}</td>
                    {LAUNDRY_ITEMS.map(([k]) => <td key={k}>{u.laundry ? u.laundry[k] : <span className="text-slate-400">—</span>}</td>)}
                    <td className="font-semibold">{u.laundry ? laundryTotal(u.laundry) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div><Button size="sm" icon="gear" onClick={() => state.goTo('config')}>Editar setup e seleção</Button></div>

          <Card title="Como vai funcionar" aside={<TagChip tone="neutral">Fase seguinte</TagChip>}>
            <ol className="grid gap-2.5 md:grid-cols-3">
              {[
                ['Durante a limpeza', 'A colaboradora confirma as quantidades de roupa da unidade.'],
                ['Registo de envio', 'O sistema cria o registo de envio para a lavandaria.'],
                ['Controlo', `Receção e diferenças ficam associadas ao ${loc}.`],
              ].map(([title, text], i) => (
                <li key={title} className="rounded-[10px] bg-slate-50 p-3 text-[13px] text-slate-600">
                  <b className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                    <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#e9f4ee] text-xs text-[#17643e]">{i + 1}</span>{title}
                  </b>
                  {text}
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}
    </div>
  );
}
