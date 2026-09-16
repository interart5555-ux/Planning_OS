import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, cx, Icon, IconButton, useDialogFocus, type IconName } from '../../shared/ui';
import { AUDIT_TONES } from '../config';
import { formatDuration, formatShort, formatStamp, lowerFirst, minutesBetween, plural, relativeDay, timeOf } from '../dates';
import { durationExceeded, isPending, lastEvent, occurrences, overrun, statusOf } from '../rules';
import type { DrawerTab, WorkRecord } from '../types';
import { useApprovals } from './context';
import { InfoBox, PersonAvatar, PhotoTile, StatusPill, Thumb } from './parts';

const TABS: Array<[DrawerTab, string]> = [['details', 'Detalhes'], ['evidence', 'Evidências'], ['audit', 'Auditoria']];

function Steps({ record: r }: { record: WorkRecord }) {
  const { config } = useApprovals();
  const approval = r.audit.filter((e) => e.icon === 'shield' || e.action === 'Conclusão aprovada').pop();
  const autoApproval = approval?.icon === 'shield';
  const last = r.audit[r.audit.length - 1];
  const third: { tone: string; icon: IconName; title: string; sub: string } =
    r.review === 'approved' ? { tone: 'done', icon: autoApproval ? 'shield' : 'check', title: autoApproval ? 'Aprovada automaticamente' : 'Aprovada', sub: approval ? `${formatShort(approval.at)}, ${timeOf(approval.at)}` : '' }
    : r.review === 'correction' ? { tone: 'warn', icon: 'edit', title: 'Correção pedida', sub: `Aguarda ${config.person.feminine}` }
    : r.review === 'reopened' ? { tone: 'vio', icon: 'sync', title: 'Reaberta', sub: `Novo estado: ${r.reopenTo}` }
    : r.review === 'archived' ? { tone: 'done', icon: 'archive', title: 'Arquivada', sub: formatShort(last.at) }
    : { tone: '', icon: 'clock', title: 'Em revisão', sub: 'Aguarda validação' };
  const dot = { done: 'border-[#17643e] bg-[#17643e] text-white', warn: 'border-[#8a4b06] bg-[#8a4b06] text-white', vio: 'border-[#5b3fb0] bg-[#5b3fb0] text-white', '': 'border-slate-300 bg-white text-slate-400' } as Record<string, string>;

  const step = (tone: string, icon: IconName, title: string, sub: ReactNode) => (
    <li className="flex min-w-0 gap-2">
      <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border-[1.5px]', dot[tone])}><Icon name={icon} className="h-3.5 w-3.5" /></span>
      <span className="min-w-0"><b className="block text-[13px] font-semibold leading-tight">{title}</b>{sub}</span>
    </li>
  );
  const small = 'block text-xs text-slate-500';

  return (
    <ol aria-label="Linha cronológica" className="grid gap-2 border-b border-slate-200 py-4 min-[440px]:grid-cols-3">
      {step('done', 'check', `${config.job.singular} iniciada`, <>
        <small className={small}>{formatShort(r.started)}, {timeOf(r.started)}</small>
        {r.late && r.planned && <small className="block text-xs font-semibold text-[#b42318]">Previsto às {timeOf(r.planned)}</small>}
      </>)}
      {step('done', 'check', `${config.job.singular} concluída`, <small className={small}>{formatShort(r.finished)}, {timeOf(r.finished)}{r.late ? ' · fora de horas' : ''}</small>)}
      {step(third.tone, third.icon, third.title, <small className={small}>{third.sub}</small>)}
    </ol>
  );
}

function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx('min-w-0 py-3.5 [&:nth-child(even)]:border-l [&:nth-child(even)]:border-slate-200 [&:nth-child(even)]:pl-4 [&:nth-child(n+3)]:border-t [&:nth-child(n+3)]:border-slate-200', className)}>
      <small className="mb-1.5 block text-[12.5px] text-slate-500">{label}</small>
      {children}
    </div>
  );
}

function NotesBox({ record }: { record: WorkRecord }) {
  const { config } = useApprovals();
  return (
    <InfoBox icon="note" title={`Notas do ${lowerFirst(config.person.singular)}`}>
      <p className="mt-0.5">{record.notes || <span className="text-slate-400">Sem notas.</span>}</p>
    </InfoBox>
  );
}

function DetailsTab({ record: r, onEvidence }: { record: WorkRecord; onEvidence: () => void }) {
  const { config, people, today, acted } = useApprovals();
  const person = people.find((p) => p.id === r.personId);
  const done = r.tasks.filter(Boolean).length;
  const missing = done < r.tasks.length;
  const qtyTotal = r.qty.reduce((s, x) => s + x.diff, 0);
  const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');
  const exceeded = durationExceeded(r);
  const correction = lastEvent(r, 'edit');
  const reopened = lastEvent(r, 'sync');
  const shown = Math.min(r.photos, 5);

  return (
    <>
      <div className="flex items-center gap-3.5 border-b border-slate-200 pb-4">
        <Thumb index={r.thumb} large />
        <span className="min-w-0 flex-1"><b className="block text-base font-semibold">{r.place} · {r.unit}</b><small className="text-slate-500">{r.client} · {r.city}</small></span>
        <span className="text-right">
          <StatusPill status={statusOf(r)} />
          <small className="mt-[5px] block text-[11.5px] leading-tight text-slate-500">Conclusão submetida<br />{lowerFirst(relativeDay(r.finished, today))}, {timeOf(r.finished)}</small>
        </span>
      </div>

      <Steps record={r} />

      <div className="grid grid-cols-2 border-b border-slate-200">
        <Fact label={config.person.singular}>
          <span className="flex items-center gap-2.5 font-semibold"><PersonAvatar person={person} size="md" /><span>{person?.name}<small className="block font-normal text-slate-500">{r.team}</small></span></span>
        </Fact>
        <Fact label="Duração">
          <span className="text-lg font-semibold tabular-nums">{formatDuration(minutesBetween(r.started, r.finished))}</span>
          <small className={cx('mt-1 block text-[12.5px]', exceeded ? 'font-semibold text-[#b42318]' : 'text-slate-500')}>
            Previsto {formatDuration(r.plannedMin)}{exceeded ? ` · +${overrun(r)} min` : ''}
          </small>
        </Fact>
        <Fact label="Checklist">
          <span className="flex items-center gap-2.5 font-semibold">
            <span className={cx('grid h-[26px] w-[26px] place-items-center rounded-full text-white', missing ? 'bg-[#e0a30b]' : 'bg-[#17643e]')}>
              <Icon name={missing ? 'alert' : 'check'} className="h-[15px] w-[15px]" />
            </span>
            {done}/{r.tasks.length} concluídas
          </span>
          <details className="mt-1.5">
            <summary className="cursor-pointer list-none text-[13px] font-semibold text-[#17643e] [&::-webkit-details-marker]:hidden">Ver tarefas</summary>
            <ul className="mt-2 flex flex-col gap-1 text-[13px] text-slate-600">
              {config.tasks.map((t, i) => (
                <li key={t} className={cx('flex items-start gap-[7px]', !r.tasks[i] && 'text-[#b42318]')}>
                  <Icon name={r.tasks[i] ? 'check' : 'x'} className={cx('mt-0.5 h-[15px] w-[15px]', r.tasks[i] ? 'text-[#17643e]' : 'text-[#b42318]')} />
                  {t}{r.tasks[i] ? '' : ' · por fazer'}
                </li>
              ))}
            </ul>
          </details>
        </Fact>
        <Fact label={config.qty.label}>
          <span className={cx('flex items-center gap-2.5 font-semibold', r.qty.length > 0 && 'text-[#b42318]')}>
            <Icon name="shirt" />
            {r.qty.length ? `${config.qty.missingOnly ? '' : sign(qtyTotal)}${plural(Math.abs(qtyTotal), config.qty.item[0], config.qty.item[1])}` : config.qty.none}
          </span>
          {r.qty.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 text-[13px] font-semibold text-[#b42318]">
              {r.qty.map((x) => <li key={x.label}>{sign(x.diff)}{Math.abs(x.diff)} {x.label}</li>)}
            </ul>
          )}
        </Fact>
      </div>

      <NotesBox record={r} />
      {r.issues.length > 0 && (
        <InfoBox tone="bad" icon="triangle" title={r.issues.length === 1 ? 'Anomalia' : 'Anomalias'}>
          {r.issues.map((x) => <p key={x.at + x.type} className="mt-0.5"><strong>{x.type}</strong> · {x.text} <span className="opacity-80">({formatShort(x.at)}, {timeOf(x.at)})</span></p>)}
        </InfoBox>
      )}
      {r.review === 'correction' && correction && (
        <InfoBox tone="warn" icon="edit" title={`Correção pedida por ${correction.who}`}><p className="mt-0.5">{correction.note}</p></InfoBox>
      )}
      {r.review === 'reopened' && reopened && (
        <InfoBox tone="vio" icon="sync" title={`Reaberta · ${r.reopenTo === 'Em curso' ? 'voltou à Execução (Em curso)' : 'voltou ao Planeamento (Planeado)'}`}>
          <p className="mt-0.5">{reopened.note} — {reopened.who}, {formatStamp(reopened.at)}</p>
        </InfoBox>
      )}
      {isPending(r) && (
        <InfoBox tone="warn" icon="alert" title="Porque precisa de revisão"><p className="mt-0.5">{occurrences(r, config).join(' · ')}</p></InfoBox>
      )}
      {r.review === 'approved' && r.auto && (
        <InfoBox tone="ok" icon="shield" title="Aprovada automaticamente">
          <p className="mt-0.5">Checklist completa e sem ocorrências. Se detetares um problema, podes reabrir a {config.job.singular.toLowerCase()}.</p>
        </InfoBox>
      )}
      {r.review === 'approved' && acted.has(r.id) && (
        <InfoBox tone="ok" icon="checkCircle" title="Conclusão aprovada"><p className="mt-0.5">Registada no histórico de auditoria.</p></InfoBox>
      )}

      <h3 className="mb-2 mt-[18px] text-sm font-semibold">Fotos ({r.photos})</h3>
      <div className="grid grid-cols-3 gap-2 min-[480px]:grid-cols-6">
        {Array.from({ length: shown }, (_, i) => <PhotoTile key={i} index={r.thumb + i} label={config.photoKinds[i % config.photoKinds.length]} />)}
        {r.photos > 5 && (
          <button type="button" onClick={onEvidence} aria-label={`Ver as ${r.photos} evidências`}
            className="grid aspect-square place-items-center rounded-[9px] border border-slate-200 bg-slate-50 text-[15px] font-semibold text-slate-600 hover:bg-slate-100">
            +{r.photos - 5}
          </button>
        )}
      </div>
    </>
  );
}

function EvidenceTab({ record: r }: { record: WorkRecord }) {
  const { config } = useApprovals();
  return (
    <>
      <h3 className="mb-2 text-sm font-semibold">Fotografias <small className="font-normal text-slate-500">({r.photos} · simuladas)</small></h3>
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: r.photos }, (_, i) => <PhotoTile key={i} index={r.thumb + i} label={config.photoKinds[i % config.photoKinds.length]} />)}
      </div>
      <NotesBox record={r} />
      {r.issues.length > 0 && (
        <InfoBox tone="bad" icon="triangle" title="Anomalias">
          {r.issues.map((x) => <p key={x.at + x.type} className="mt-0.5"><strong>{x.type}</strong> · {x.text}</p>)}
        </InfoBox>
      )}
    </>
  );
}

function AuditTab({ record: r }: { record: WorkRecord }) {
  return (
    <>
      <h3 className="mb-2 text-sm font-semibold">Histórico de auditoria <small className="font-normal text-slate-500">({plural(r.audit.length, 'evento', 'eventos')})</small></h3>
      <ol>
        {r.audit.map((e, i) => (
          <li key={`${e.at}-${i}`} className="relative grid grid-cols-[30px_minmax(0,1fr)] gap-2.5 pb-4">
            {i < r.audit.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-3.5 top-[30px] w-0.5 bg-slate-200" />}
            <span className={cx('grid h-[30px] w-[30px] place-items-center rounded-full border', AUDIT_TONES[e.tone])}><Icon name={e.icon} className="h-[15px] w-[15px]" /></span>
            <div className="min-w-0">
              <b className="font-semibold">{e.action}</b>
              <span className="block text-[12.5px] text-slate-500">{formatStamp(e.at)} · {e.who} ({e.role})</span>
              {e.note && <q className="mt-1 block rounded-lg bg-slate-50 px-2.5 py-[7px] text-[13px] text-slate-600 [quotes:none]">{e.note}</q>}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-center gap-2 text-[12.5px] text-slate-500">
        <Icon name="lock" className="h-[15px] w-[15px]" />Os eventos não podem ser editados nem apagados. Reabrir cria um novo evento e mantém o registo original.
      </p>
    </>
  );
}

/** Painel lateral com Detalhes, Evidências e Auditoria; ações no rodapé. */
export function RecordDrawer({ recordId, tab, onTab, onClose }: { recordId: string; tab: DrawerTab; onTab: (tab: DrawerTab) => void; onClose: () => void }) {
  const { config, records, viewer, actions, openModal } = useApprovals();
  const ref = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  const r = records.find((x) => x.id === recordId);
  if (!r) return null;

  const pending = isPending(r);
  const canReopen = viewer.canReview && r.review !== 'reopened';
  const approve = () => {
    if (actions.approve(r.id)) actions.notify(`Conclusão aprovada · ${r.place} passou a Concluída.`);
  };
  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.findIndex(([k]) => k === tab);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0];
    onTab(next);
    tabsRef.current?.querySelector<HTMLElement>(`#dt-${next}`)?.focus();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 text-sm text-slate-900 antialiased">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside ref={ref} data-dialog role="dialog" aria-modal="true" aria-labelledby="record-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-[580px] flex-col bg-white shadow-2xl">
        <div className="relative px-4 pt-4 sm:px-6 sm:pt-5">
          <h2 id="record-title" className="pr-10 text-[21px] font-bold tracking-tight">{r.place} · {r.unit}</h2>
          <p className="mt-0.5 text-slate-500">{r.city}</p>
          <IconButton icon="x" label="Fechar" data-autofocus onClick={onClose} className="absolute right-3.5 top-3.5" />
        </div>
        <div ref={tabsRef} role="tablist" onKeyDown={onTabKey} className="mx-4 mt-3.5 grid grid-cols-3 border-b border-slate-200 sm:mx-6">
          {TABS.map(([key, label]) => (
            <button key={key} id={`dt-${key}`} type="button" role="tab" aria-selected={tab === key} aria-controls="record-panel" tabIndex={tab === key ? 0 : -1}
              onClick={() => onTab(key)}
              className={cx('-mb-px border-b-2 px-1.5 py-2.5 focus:outline-none focus-visible:bg-[#e9f4ee]', tab === key ? 'border-[#17643e] font-semibold text-[#17643e]' : 'border-transparent font-medium text-slate-600')}>
              {label}{key === 'audit' ? ` (${r.audit.length})` : ''}
            </button>
          ))}
        </div>
        <div id="record-panel" role="tabpanel" aria-labelledby={`dt-${tab}`} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-[18px] sm:px-6">
          {tab === 'details' && <DetailsTab record={r} onEvidence={() => onTab('evidence')} />}
          {tab === 'evidence' && <EvidenceTab record={r} />}
          {tab === 'audit' && <AuditTab record={r} />}
        </div>
        {viewer.canReview && (
          <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-200 px-4 py-3 sm:px-6 sm:py-3.5">
            {pending && <Button variant="primary" icon="check" className="min-h-11 flex-[1_1_150px]" onClick={approve}>Aprovar conclusão</Button>}
            {pending && <Button className="min-h-11 flex-[1_1_150px] !border-[#17643e] !text-[#17643e]" onClick={() => openModal({ type: 'correction', id: r.id })}>Pedir correção</Button>}
            {canReopen && (
              <Button variant="ghost" className="min-h-11 flex-[1_1_100%] text-[#17643e] hover:bg-[#e9f4ee] min-[480px]:ml-auto min-[480px]:flex-none"
                onClick={() => openModal({ type: 'reopen', id: r.id })}>Reabrir {config.job.singular.toLowerCase()}</Button>
            )}
            {!canReopen && (
              <span className="text-[13px] text-slate-500">
                {config.job.singular} reaberta: acompanha-a no {r.reopenTo === 'Em curso' ? 'módulo Execução.' : 'Planeamento.'}
              </span>
            )}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}

