import { useRef } from 'react';
import { cx, Icon, inputBase, TextLink, type IconName } from '../../shared/ui';
import { APPROVAL_PERIODS, APPROVAL_STATUS_OPTIONS, DURATION_TOLERANCE, HISTORY_PERIODS, HISTORY_STATUS_OPTIONS } from '../config';
import { lowerFirst, plural } from '../dates';
import { approvalsList, autoApprovedCounts, historyList, isPending, placeOptions, reopenedToday } from '../rules';
import type { ApprovalFilters, HistoryFilters } from '../types';
import { useApprovals } from './context';
import { EmptyList, RecordList } from './RecordList';
import { SelectField } from './parts';

export const DEFAULT_APPROVAL_FILTERS: ApprovalFilters = { client: '', place: '', status: 'pending', person: '', period: '7' };
export const DEFAULT_HISTORY_FILTERS: HistoryFilters = { period: '30', client: '', status: '', person: '', q: '' };

const filterGrid = 'mt-[22px] grid items-end gap-2.5 sm:gap-3 grid-cols-2 min-[600px]:grid-cols-3';

function Kpi({ tone, icon, count, title, subtitle, pressed, onClick }: { tone: 'review' | 'bad' | 'reopen'; icon: IconName; count: number; title: string; subtitle: string; pressed: boolean; onClick: () => void }) {
  const tones = {
    review: { ico: 'bg-[#fdf1d2] text-[#c98a06]', title: '' },
    bad: { ico: 'bg-[#fde4e1] text-[#c9302a]', title: 'text-[#b42318]' },
    reopen: { ico: 'bg-[#e3ecfb] text-[#2a5592]', title: 'text-[#2a5592]' },
  }[tone];
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick}
      className={cx('flex w-full items-center gap-4 rounded-[14px] border bg-white p-4 text-left shadow-[0_1px_2px_rgba(17,24,39,.04),0_8px_24px_-16px_rgba(17,24,39,.22)] sm:p-[18px]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e] focus-visible:ring-offset-2',
        pressed ? 'border-[#17643e] ring-1 ring-[#17643e]' : 'border-slate-200 hover:border-slate-300')}>
      <span className={cx('grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full', tones.ico)}><Icon name={icon} className="h-[26px] w-[26px]" /></span>
      <span>
        <b className="block text-[26px] font-bold leading-none tabular-nums">{count}</b>
        <strong className={cx('mt-0.5 block text-[15px] font-semibold', tones.title)}>{title}</strong>
        <small className="block text-[12.5px] text-slate-500">{subtitle}</small>
      </span>
    </button>
  );
}

function ResultLine({ text, onClear }: { text: string; onClear?: () => void }) {
  return (
    <div aria-live="polite" className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate-500">
      <span>{text}</span>
      {onClear && <TextLink onClick={onClear}>Limpar filtros</TextLink>}
    </div>
  );
}

export function ApprovalsScreen({ filters: f, onChange, onAutoHistory }: { filters: ApprovalFilters; onChange: (f: ApprovalFilters) => void; onAutoHistory: () => void }) {
  const { config, records, acted, people, clients, today } = useApprovals();
  const firstFilter = useRef<HTMLDivElement>(null);
  const list = approvalsList(records, f, acted, today);
  const pending = records.filter(isPending);
  const auto = autoApprovedCounts(records, today);
  const set = (patch: Partial<ApprovalFilters>) => onChange({ ...f, ...patch });
  const kpi = (status: ApprovalFilters['status']) => set({ status: f.status === status && status !== 'pending' ? 'pending' : status, ...(status === 'reopened' ? { period: '' } : {}) });
  const otherFilters = Boolean(f.client || f.place || f.person || f.period !== '7');
  const hasFilters = otherFilters || f.status !== 'pending';

  return (
    <>
      <div className="mt-[22px] grid gap-2.5 md:grid-cols-3 md:gap-3.5">
        <Kpi tone="review" icon="clock" count={pending.length} title="Por rever" subtitle="Conclusões com ocorrências" pressed={f.status === 'pending'} onClick={() => kpi('pending')} />
        <Kpi tone="bad" icon="triangle" count={pending.filter((r) => r.issues.length).length} title="Com anomalia" subtitle="Requerem atenção" pressed={f.status === 'anomaly'} onClick={() => kpi('anomaly')} />
        <Kpi tone="reopen" icon="sync" count={reopenedToday(records, today)} title="Reabertas hoje" subtitle="Voltaram ao fluxo operacional" pressed={f.status === 'reopened'} onClick={() => kpi('reopened')} />
      </div>

      <div role="note" className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#c3e3cf] bg-[#e7f5ec] px-3.5 py-[11px] text-[13.5px] text-[#14532f]">
        <Icon name="shield" className="h-[18px] w-[18px] text-[#17643e]" />
        <span className="min-w-0 flex-[1_1_320px]">
          <b className="font-semibold">Aprovação automática ativa.</b> {config.job.plural} completas e sem ocorrências (anomalia, atraso, tarefa em falta, {lowerFirst(config.qty.label)} ou
          duração mais de {DURATION_TOLERANCE} min acima do previsto) são aprovadas automaticamente e ficam no histórico. Hoje: {auto.today} · últimos 7 dias: {auto.week}.
        </span>
        <TextLink onClick={onAutoHistory}>Ver no histórico</TextLink>
      </div>

      <div ref={firstFilter} role="group" aria-label="Filtros" className={cx(filterGrid, 'lg:grid-cols-5')}>
        <SelectField id="fa-client" label="Cliente" value={f.client} onChange={(client) => set({ client, place: f.place && !placeOptions(records, client).includes(f.place) ? '' : f.place })}
          options={[['', 'Todos os clientes'], ...clients.map((c): [string, string] => [c, c])]} />
        <SelectField id="fa-place" label={config.location.singular} value={f.place} onChange={(place) => set({ place })}
          options={[['', `Todos os ${config.location.plural}`], ...placeOptions(records, f.client).map((p): [string, string] => [p, p])]} />
        <SelectField id="fa-status" label="Estado" value={f.status} onChange={(status) => set({ status: status as ApprovalFilters['status'] })} options={APPROVAL_STATUS_OPTIONS} />
        <SelectField id="fa-person" label={config.person.singular} value={f.person} onChange={(person) => set({ person })}
          options={[['', `Todos os ${lowerFirst(config.person.plural)}`], ...people.map((p): [string, string] => [p.id, p.name])]} />
        <SelectField id="fa-period" label="Data de conclusão" value={f.period} onChange={(period) => set({ period })} options={APPROVAL_PERIODS} />
      </div>

      <ResultLine text={plural(list.length, 'conclusão', 'conclusões')}
        onClear={hasFilters ? () => { onChange(DEFAULT_APPROVAL_FILTERS); firstFilter.current?.querySelector('select')?.focus(); } : undefined} />

      {list.length
        ? <RecordList records={list} mode="approvals" />
        : f.status === 'pending' && !otherFilters
          ? <EmptyList title="Tudo revisto">Não há conclusões à espera de validação.</EmptyList>
          : <EmptyList title="Sem resultados">Ajusta os filtros para ver outras conclusões.</EmptyList>}
    </>
  );
}

export function HistoryScreen({ filters: f, onChange }: { filters: HistoryFilters; onChange: (f: HistoryFilters) => void }) {
  const { config, records, people, clients, today } = useApprovals();
  const firstFilter = useRef<HTMLDivElement>(null);
  const list = historyList(records, f, people, today);
  const set = (patch: Partial<HistoryFilters>) => onChange({ ...f, ...patch });
  const hasFilters = Boolean(f.client || f.status || f.person || f.q || f.period !== '30');

  return (
    <>
      <div ref={firstFilter} role="group" aria-label="Filtros" className={cx(filterGrid, 'lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.3fr)]')}>
        <SelectField id="fh-period" label="Período" value={f.period} onChange={(period) => set({ period })} options={HISTORY_PERIODS} />
        <SelectField id="fh-client" label="Cliente" value={f.client} onChange={(client) => set({ client })}
          options={[['', 'Todos os clientes'], ...clients.map((c): [string, string] => [c, c])]} />
        <SelectField id="fh-status" label="Estado" value={f.status} onChange={(status) => set({ status: status as HistoryFilters['status'] })} options={HISTORY_STATUS_OPTIONS} />
        <SelectField id="fh-person" label={`${config.person.singular} / Equipa`} value={f.person} onChange={(person) => set({ person })}
          options={[['', `Todos os ${lowerFirst(config.person.plural)}`], ...people.map((p): [string, string] => [p.id, p.name])]} />
        <div className="col-span-2 min-w-0 min-[600px]:col-span-1 lg:col-span-1">
          <label htmlFor="fh-q" className="mb-[5px] block text-xs font-medium text-slate-600">Pesquisa <span className="font-normal text-slate-400">(opcional)</span></label>
          <span className="relative block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-slate-400" />
            <input id="fh-q" type="search" value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder={`${config.location.singular}, cliente ou pessoa`}
              className={cx(inputBase, 'min-h-10 pl-[38px] text-sm')} />
          </span>
        </div>
      </div>

      <ResultLine text={plural(list.length, 'registo', 'registos')}
        onClear={hasFilters ? () => { onChange(DEFAULT_HISTORY_FILTERS); firstFilter.current?.querySelector('select')?.focus(); } : undefined} />

      {list.length ? <RecordList records={list} mode="history" /> : <EmptyList title="Sem registos">Ajusta o período ou os filtros.</EmptyList>}
    </>
  );
}

export function DeniedScreen() {
  const { config } = useApprovals();
  return (
    <div role="status" className="mx-auto mt-10 max-w-[560px] rounded-2xl border border-slate-200 p-7 text-center shadow-[0_1px_2px_rgba(17,24,39,.04),0_8px_24px_-16px_rgba(17,24,39,.22)]">
      <Icon name="lock" className="mx-auto h-9 w-9 text-slate-400" />
      <h2 className="mb-1 mt-2.5 text-xl font-bold">Sem acesso a esta área</h2>
      <p className="text-slate-600">
        Aprovações e {lowerFirst(config.history)} estão disponíveis para a administradora e a gestora. Como {config.person.feminine}, não podes aprovar,
        pedir correção nem reabrir {lowerFirst(config.job.plural)}.
      </p>
    </div>
  );
}
