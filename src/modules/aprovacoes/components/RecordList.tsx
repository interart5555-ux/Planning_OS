import { Button, cx, Icon } from '../../shared/ui';
import { formatDate, plural, relativeDay, timeOf } from '../dates';
import { isFlagged, isPending, occurrences, statusOf } from '../rules';
import type { WorkRecord } from '../types';
import { useApprovals } from './context';
import { AutoTag, OccurrenceTags, PersonAvatar, StatusPill, Thumb } from './parts';

type Mode = 'approvals' | 'history';

function RowActions({ record, mode, block }: { record: WorkRecord; mode: Mode; block?: boolean }) {
  const { viewer, openRecord, openModal } = useApprovals();
  const size = block ? 'md' : 'sm';
  const grow = block ? 'min-h-11 flex-1' : '';
  const label = `${record.place} ${record.unit}`;
  return (
    <>
      {isPending(record) && mode === 'approvals'
        ? <Button variant="primary" size={size} className={grow} aria-label={`Rever ${label}`} onClick={() => openRecord(record.id)}>Rever</Button>
        : <Button size={size} className={grow} aria-label={`Ver registo de ${label}`} onClick={() => openRecord(record.id)}>Ver registo</Button>}
      {mode === 'history' && viewer.canReview && record.review !== 'reopened' && (
        <Button variant="ghost" size={size} className={cx('text-[#17643e] hover:bg-[#e9f4ee]', grow)} aria-label={`Reabrir ${label}`}
          onClick={() => openModal({ type: 'reopen', id: record.id })}>Reabrir</Button>
      )}
    </>
  );
}

function StatusCell({ record, mode }: { record: WorkRecord; mode: Mode }) {
  const { config } = useApprovals();
  return (
    <>
      <StatusPill status={statusOf(record)} />
      {mode === 'approvals' && isPending(record) ? <OccurrenceTags items={occurrences(record, config)} /> : <AutoTag record={record} />}
    </>
  );
}

const th = 'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3.5 py-[11px] text-left text-[12.5px] font-semibold text-slate-600';
const td = 'border-b border-slate-200 px-3.5 py-[11px] align-middle group-last:border-b-0';

/** Tabela em ecrãs largos; cartões abaixo de 860 px. */
export function RecordList({ records, mode }: { records: WorkRecord[]; mode: Mode }) {
  const { config, people, acted, today } = useApprovals();
  const person = (r: WorkRecord) => people.find((p) => p.id === r.personId);
  const evidence = (r: WorkRecord) => (
    <span aria-label={plural(r.photos, 'evidência', 'evidências')} className="inline-flex items-center gap-1.5 tabular-nums text-slate-600">
      <Icon name="image" className="h-4 w-4" /><span aria-hidden="true">{r.photos}</span>
    </span>
  );
  const place = (r: WorkRecord) => (
    <span className="flex min-w-0 items-center gap-[11px]">
      <Thumb index={r.thumb} />
      <span className="min-w-0"><b className="block whitespace-nowrap font-semibold">{r.place}</b><small className="block whitespace-nowrap text-xs text-slate-500">{r.city}</small></span>
    </span>
  );

  return (
    <>
      <div className="mt-3 hidden overflow-x-auto rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(17,24,39,.04),0_8px_24px_-16px_rgba(17,24,39,.22)] min-[860px]:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{mode === 'approvals' ? 'Conclusões para rever' : config.history}</caption>
          <thead>
            <tr>
              {mode === 'history' && <th scope="col" aria-sort="descending" className={th}>Data <Icon name="arrowDown" className="inline h-[13px] w-[13px] align-[-2px]" /></th>}
              <th scope="col" className={th}>{config.location.singular}</th>
              <th scope="col" className={th}>{config.unit}</th>
              {mode === 'history' && <th scope="col" className={th}>Cliente</th>}
              <th scope="col" className={th}>{config.person.singular}{mode === 'history' ? ' / Equipa' : ''}</th>
              {mode === 'approvals' && <th scope="col" aria-sort="descending" className={th}>Conclusão <Icon name="arrowDown" className="inline h-[13px] w-[13px] align-[-2px]" /></th>}
              <th scope="col" className={th}>Evidências</th>
              <th scope="col" className={th}>Estado</th>
              <th scope="col" className={cx(th, 'text-right')}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const st = statusOf(r);
              const p = person(r);
              const rowTone = mode === 'approvals' && isFlagged(st) ? 'bg-[#fdf3f2]' : mode === 'approvals' && acted.has(r.id) ? 'bg-[#f7fbf8]' : '';
              return (
                <tr key={r.id} className={cx('group', rowTone)}>
                  {mode === 'history' && (
                    <td className={td}><span className="whitespace-nowrap tabular-nums"><b className="block font-medium">{formatDate(r.finished)}</b><small className="block text-xs text-slate-500">{timeOf(r.finished)}</small></span></td>
                  )}
                  <td className={td}>{place(r)}</td>
                  <td className={cx(td, 'whitespace-nowrap')}>{r.unit}</td>
                  {mode === 'history' && <td className={cx(td, 'whitespace-nowrap')}>{r.client}</td>}
                  <td className={td}>
                    <span className="flex items-center gap-[9px] whitespace-nowrap">
                      <PersonAvatar person={p} />
                      {mode === 'history' ? <span>{p?.name}<small className="block text-xs text-slate-500">{r.team}</small></span> : p?.name}
                    </span>
                  </td>
                  {mode === 'approvals' && (
                    <td className={td}>
                      <span className="whitespace-nowrap tabular-nums">
                        <b className={cx('block font-medium', r.late && 'text-[#b42318]')}>{relativeDay(r.finished, today)}, {timeOf(r.finished)}</b>
                        <small className="block text-xs text-slate-500">{formatDate(r.finished)}</small>
                      </span>
                    </td>
                  )}
                  <td className={td}>{evidence(r)}</td>
                  <td className={td}><StatusCell record={r} mode={mode} /></td>
                  <td className={cx(td, 'whitespace-nowrap text-right [&>button+button]:ml-1.5')}><RowActions record={r} mode={mode} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-col gap-2.5 min-[860px]:hidden">
        {records.map((r) => {
          const st = statusOf(r);
          const p = person(r);
          return (
            <article key={r.id} aria-label={`${r.place} · ${r.unit}`}
              className={cx('rounded-[14px] border p-3.5 shadow-[0_1px_2px_rgba(17,24,39,.04),0_8px_24px_-16px_rgba(17,24,39,.22)]', isFlagged(st) && mode === 'approvals' ? 'border-[#f4c3bd] bg-[#fdf3f2]' : 'border-slate-200 bg-white')}>
              <div className="flex items-start justify-between gap-2.5">
                <span className="flex min-w-0 items-center gap-[11px]">
                  <Thumb index={r.thumb} />
                  <span className="min-w-0">
                    <b className="block font-semibold">{r.place} · {r.unit}</b>
                    <small className="block text-xs text-slate-500">{mode === 'history' ? `${r.client} · ${r.city}` : r.city}</small>
                  </span>
                </span>
                <span className="flex flex-col items-end"><StatusPill status={st} /><AutoTag record={r} /></span>
              </div>
              {mode === 'approvals' && isPending(r) && <OccurrenceTags items={occurrences(r, config)} className="mt-2" />}
              <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] text-slate-600">
                <span className="inline-flex items-center gap-1.5"><PersonAvatar person={p} size="xs" />{p?.name}</span>
                <span className="inline-flex items-center gap-1.5"><Icon name="clock" className="h-[15px] w-[15px] text-slate-400" />{relativeDay(r.finished, today)}, {timeOf(r.finished)}</span>
                <span className="inline-flex items-center gap-1.5"><Icon name="image" className="h-[15px] w-[15px] text-slate-400" />{plural(r.photos, 'evidência', 'evidências')}</span>
              </div>
              <div className="mt-3 flex gap-2"><RowActions record={r} mode={mode} block /></div>
            </article>
          );
        })}
      </div>
    </>
  );
}

export function EmptyList({ title, children }: { title: string; children: string }) {
  return (
    <div className="mt-3 rounded-[14px] border border-slate-200 bg-white px-4 py-9 text-center text-slate-500">
      <b className="mb-0.5 block text-[15px] text-slate-900">{title}</b>{children}
    </div>
  );
}
