import { cx, focusRing, Icon } from '../../shared/ui';
import { EXEC_FEATURES } from '../config';
import { durationLong, formatDay, stopwatch, timeOf } from '../dates';
import { canStart, countDone, displayStatus, itemsOn, isJob, missingTasks, pendingOf, quantityDiff, sameQuantities } from '../rules';
import type { ExecJob } from '../types';
import { useExec } from './context';
import { JobMessages } from './MessagesBits';
import { ProductsSection } from './ProductsSection';
import {
  AddPhotoButton, BackButton, BigButton, CheckList, History, IssuesList, Notice, Optional, PhotoTile, ScreenScroll, ScreenTitle, SectionTitle, Stat, StatusPill, Timer,
} from './parts';

function IssueRow({ job }: { job: ExecJob }) {
  const { openIssue } = useExec();
  return (
    <button type="button" onClick={() => openIssue(job.id)}
      className={cx('mt-3 flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-[#e6e8ec] bg-white px-3.5 text-left font-semibold hover:border-slate-300', focusRing)}>
      <Icon name="triangle" className="h-5 w-5 text-[#9b2318]" />
      <span className="flex-1">Registar anomalia ou atraso</span>
      <Icon name="chevronRight" className="h-5 w-5" />
    </button>
  );
}

const photoLabel = (kinds: string[], kind: number) => kinds[kind % kinds.length];

/* ---------------------------------------------------------------- */
/* Detalhe                                                          */
/* ---------------------------------------------------------------- */

export function JobDetail({ job }: { job: ExecJob }) {
  const { config, today, nowMin, go, startJob, actions } = useExec();
  const status = displayStatus(job, today, nowMin());
  const infoIcon = 'mt-px h-[23px] w-[23px] text-slate-700';
  const savedDiff = quantityDiff(job.qtySaved, job.plannedQty, config);

  return (
    <ScreenScroll label="Detalhe">
      <BackButton onClick={() => go('list')}>{config.home}</BackButton>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <ScreenTitle className="min-w-[200px] flex-1">{job.place} · {job.unit}</ScreenTitle>
        <StatusPill status={status} solid />
      </div>
      <IssuesList job={job} />

      <dl className="mt-[18px] flex flex-col gap-3.5">
        <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
          <Icon name="calendar" className={infoIcon} />
          <div><dt className="sr-only">Data e horário</dt><dd className="text-slate-900">{formatDay(job.date)}</dd><dd className="text-slate-700">{job.start} – {job.end} ({durationLong(job.start, job.end)})</dd></div>
        </div>
        <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
          <Icon name="users" className={infoIcon} />
          <div><dt className="text-[13px] font-semibold">Equipa</dt><dd className="text-slate-700">{job.team}</dd></div>
        </div>
        <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
          <Icon name="pin" className={infoIcon} />
          <div><dt className="text-[13px] font-semibold">Morada</dt><dd className="text-slate-700">{job.address[0]}<br />{job.address[1]}</dd></div>
        </div>
      </dl>

      <button type="button" onClick={() => actions.notify(`Abriria o Google Maps com “${job.address.join(', ')}” (simulação).`)}
        className={cx('mt-4 flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-[#cde5d6] bg-[#e9f4ee] px-3.5 text-left font-semibold text-[#17643e]', focusRing)}>
        <Icon name="map" className="h-5 w-5" /><span className="flex-1">Abrir no Google Maps</span><Icon name="external" className="h-5 w-5" />
      </button>

      <div className="mt-3.5 rounded-xl border border-[#f3dfae] bg-[#fffaf0] px-3.5 py-3 text-[14px] text-[#5d4308]">
        <b className="mb-0.5 flex items-center gap-1.5 text-[13px]"><Icon name="note" className="h-4 w-4" />Notas da {config.manager}</b>
        {job.managerNote}
      </div>

      {(job.status === 'planned' || job.status === 'confirmed') && (
        <>
          <hr className="mt-5 border-slate-200" />
          <SectionTitle aside={`${countDone(job.prep)} de ${job.prep.length}`}>Preparação <Optional>(antes de iniciar)</Optional></SectionTitle>
          <CheckList job={job} list="prep" labels={config.prep} compact />
          {job.status === 'planned' && <BigButton variant="outline" icon="book" block className="mt-3" onClick={() => actions.confirmRead(job.id)}>Confirmar leitura</BigButton>}
          {canStart(job, today) ? (
            <>
              <BigButton icon="play" large block className="mt-3" onClick={() => startJob(job.id)}>{config.start}</BigButton>
              <Notice tone="info" icon="info">{EXEC_FEATURES.timer ? 'Ao iniciar, o estado passa para Em curso e o tempo começa a ser contabilizado.' : 'Ao iniciar, o estado passa para Em curso e fica registada a hora de início.'}</Notice>
            </>
          ) : job.date > today ? (
            <Notice tone="info" icon="info">Só podes iniciar no próprio dia ({formatDay(job.date)}).</Notice>
          ) : null}
          <IssueRow job={job} />
        </>
      )}

      {job.status === 'in_progress' && (
        <>
          <Notice tone="info" icon="timer" title={`Em curso desde as ${timeOf(job.startedAt ?? 0)}`} className="mt-[18px]">
            {EXEC_FEATURES.timer && <><Timer job={job} /> · </>}{countDone(job.tasks)} de {job.tasks.length} tarefas
          </Notice>
          <BigButton icon="play" large block className="mt-3" onClick={() => go('run', job.id)}>{config.resume}</BigButton>
        </>
      )}

      {job.status === 'done' && (
        <>
          <hr className="mt-5 border-slate-200" />
          <SectionTitle>Resumo da conclusão</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Início e fim" value={`${timeOf(job.startedAt ?? 0)} – ${timeOf(job.finishedAt ?? 0)}`} />
            {EXEC_FEATURES.timer ? <Stat label="Tempo registado" value={stopwatch(job.durationSec ?? 0)} /> : <Stat label="Avisos" value={job.issues.length} />}
            <Stat label="Tarefas" value={`${countDone(job.tasks)} de ${job.tasks.length}`} />
            <Stat label={config.evidence} value={job.photos.length} />
          </div>
          {job.plannedQty && (
            <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-slate-50 px-[13px] py-[11px] text-[14px]">
              <Icon name="list" className="h-[19px] w-[19px] text-slate-700" />
              <span>{config.quantities.title}: {savedDiff.length ? `diferença registada (${savedDiff.join(', ')})` : 'quantidades confirmadas'}</span>
            </div>
          )}
          {job.photos.length > 0 && (
            <>
              <SectionTitle>{config.evidence}</SectionTitle>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2.5">
                {job.photos.map((p) => <PhotoTile key={p.id} photo={p} label={photoLabel(config.photoKinds, p.kind)} />)}
              </div>
            </>
          )}
          {job.notes && (<><SectionTitle>Notas para a {config.manager}</SectionTitle><p className="text-slate-700">{job.notes}</p></>)}
        </>
      )}
      <History job={job} />
    </ScreenScroll>
  );
}

/* ---------------------------------------------------------------- */
/* Em curso                                                         */
/* ---------------------------------------------------------------- */

function QuantitySection({ job }: { job: ExecJob }) {
  const { config, actions } = useExec();
  if (!job.plannedQty || !job.qty) return null;
  const diff = quantityDiff(job.qty, job.plannedQty, config);
  const isSaved = sameQuantities(job.qty, job.qtySaved, config);
  return (
    <>
      <SectionTitle>{config.quantities.title}</SectionTitle>
      <p className="-mt-1 mb-2.5 text-[13.5px] text-slate-700">{config.quantities.note}</p>
      <ul className="overflow-hidden rounded-xl border border-[#e6e8ec]">
        {config.quantities.items.map((it) => {
          const value = job.qty![it.key];
          const planned = job.plannedQty![it.key];
          return (
            <li key={it.key} className="flex min-h-[58px] items-center gap-3 border-[#e6e8ec] py-1.5 pl-3.5 pr-2.5 [&+&]:border-t">
              <Icon name={it.icon} className="h-[22px] w-[22px] text-slate-700" />
              <span className="min-w-0 flex-1">
                {it.label}
                {value !== planned && <small className="block text-[12.5px] font-semibold text-[#80570a]">Configurado: {planned} ({value > planned ? '+' : '−'}{Math.abs(value - planned)})</small>}
              </span>
              <span className="flex items-center gap-1">
                <button type="button" aria-label={`Menos ${it.label}`} disabled={value <= 0} onClick={() => actions.changeQty(job.id, it.key, -1)}
                  className={cx('grid h-11 w-11 place-items-center rounded-[10px] border border-[#d3d8de] bg-white text-[#17643e] disabled:cursor-default disabled:text-slate-400 disabled:opacity-60', focusRing)}>
                  <Icon name="minus" className="h-5 w-5" />
                </button>
                <output aria-live="polite" aria-label={it.label} className="min-w-[30px] text-center text-[17px] font-semibold tabular-nums">{value}</output>
                <button type="button" aria-label={`Mais ${it.label}`} onClick={() => actions.changeQty(job.id, it.key, 1)}
                  className={cx('grid h-11 w-11 place-items-center rounded-[10px] border border-[#d3d8de] bg-white text-[#17643e]', focusRing)}>
                  <Icon name="plus" className="h-5 w-5" />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {isSaved ? (
        <Notice tone="ok" icon="checkCircle">{diff.length ? `Diferença registada: ${diff.join(', ')}.` : 'Quantidades confirmadas, sem diferenças.'}</Notice>
      ) : (
        <BigButton variant="soft" icon="list" block className="mt-3" onClick={() => actions.saveQty(job.id)}>{diff.length ? 'Registar diferença' : 'Confirmar quantidades'}</BigButton>
      )}
    </>
  );
}

export function RunScreen({ job }: { job: ExecJob }) {
  const { config, go, openIssue } = useExec();
  const done = countDone(job.tasks);
  const total = job.tasks.length;
  return (
    <ScreenScroll label="Em curso" actions={
      <>
        <BigButton variant="danger" icon="triangle" onClick={() => openIssue(job.id)}>Anomalia ou atraso</BigButton>
        <BigButton icon="checkCircle" onClick={() => go('finish', job.id)}>{config.finish}</BigButton>
      </>
    }>
      <BackButton onClick={() => go('detail', job.id)}>{job.place} · {job.unit}</BackButton>
      <div className="flex items-start justify-between gap-3">
        <div>
          <ScreenTitle>Em curso</ScreenTitle>
          <p className="mt-1 text-slate-700">Iniciada às {timeOf(job.startedAt ?? 0)}</p>
        </div>
        {EXEC_FEATURES.timer && (
          <div role="timer" aria-label="Tempo decorrido" className="inline-flex items-center gap-[7px] text-[25px] font-bold tracking-[-0.01em] text-[#17643e]">
            <Icon name="timer" className="h-[26px] w-[26px]" /><Timer job={job} />
          </div>
        )}
      </div>
      <div role="progressbar" aria-label="Tarefas concluídas" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="mt-4 h-3 overflow-hidden rounded-full bg-[#e9ecef]">
        <i className="block h-full rounded-full bg-[#17643e] transition-[width]" style={{ width: `${Math.round((done / total) * 100)}%` }} />
      </div>
      <div className="mt-1.5 text-right text-[13.5px] text-slate-700">{done} de {total} concluídas</div>
      <SectionTitle className="mt-1.5">{config.checklist}</SectionTitle>
      <CheckList job={job} list="tasks" labels={config.tasks} />
      <QuantitySection job={job} />
      <ProductsSection job={job} />
      <JobMessages job={job} />
      {job.issues.length > 0 && (<><SectionTitle>Anomalias e atrasos</SectionTitle><IssuesList job={job} /></>)}
    </ScreenScroll>
  );
}

/* ---------------------------------------------------------------- */
/* Concluir                                                         */
/* ---------------------------------------------------------------- */

export function FinishScreen({ job, notesError, onSend }: { job: ExecJob; notesError: boolean; onSend: () => void }) {
  const { config, online, go, actions } = useExec();
  const missing = missingTasks(job, config);
  const diff = quantityDiff(job.qty, job.plannedQty, config);
  const showError = notesError && !job.notes.trim();

  return (
    <ScreenScroll label={config.finish} actions={<BigButton icon="check" large onClick={onSend}>{config.send}</BigButton>}>
      <BackButton onClick={() => go('run', job.id)}>{job.place} · {job.unit}</BackButton>
      <ScreenTitle>{config.finish}</ScreenTitle>
      {!online && <Notice tone="bad" icon="cloudOff">Sem rede — o registo será sincronizado quando houver ligação.</Notice>}

      <SectionTitle aside={`${countDone(job.tasks)} de ${job.tasks.length} concluídas`}>Resumo de tarefas</SectionTitle>
      <CheckList job={job} list="tasks" labels={config.tasks} compact markMissing />
      {missing.length > 0 && (
        <Notice tone="warn" icon="triangle" title={missing.length === 1 ? '1 tarefa em falta' : `${missing.length} tarefas em falta`}>
          Podes marcá-las acima ou explicar nas notas porque ficaram por fazer.
        </Notice>
      )}

      {job.plannedQty && (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-slate-50 px-[13px] py-[11px] text-[14px]">
          <Icon name="list" className="h-[19px] w-[19px] text-slate-700" />
          <span className="flex-1">
            {config.quantities.title}: {sameQuantities(job.qty, job.qtySaved, config)
              ? diff.length ? `diferença registada (${diff.join(', ')})` : 'quantidades confirmadas'
              : 'por confirmar · ao enviar ficam as quantidades atuais'}
          </span>
          <button type="button" onClick={() => go('run', job.id)} className={cx('min-h-[40px] rounded-[10px] px-2.5 font-medium text-slate-700 hover:bg-slate-100', focusRing)}>Rever</button>
        </div>
      )}

      <SectionTitle aside={job.photos.length}>{config.evidence} <Optional /></SectionTitle>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2.5">
        <AddPhotoButton id="exec-add-photo" label={config.addEvidence} onClick={() => actions.addPhoto(job.id)} />
        {job.photos.map((p) => (
          <PhotoTile key={p.id} photo={p} label={photoLabel(config.photoKinds, p.kind)}
            onRemove={() => { actions.removePhoto(job.id, p.id); document.getElementById('exec-add-photo')?.focus({ preventScroll: true }); }} />
        ))}
      </div>

      <label htmlFor="exec-notes" className="mb-2 mt-3.5 block text-[14px] font-semibold">
        Notas para a {config.manager} <Optional>{missing.length ? '(obrigatório com tarefas em falta)' : '(opcional)'}</Optional>
      </label>
      <textarea id="exec-notes" value={job.notes} onChange={(e) => actions.setNotes(job.id, e.target.value)}
        placeholder="Ex.: tudo conforme, hóspede muito simpático…" aria-invalid={showError || undefined} aria-describedby={showError ? 'exec-notes-error' : undefined}
        className={cx('block min-h-[96px] w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-[15px] focus:outline-none focus:ring-2',
          showError ? 'border-[#9b2318] focus:ring-[#9b2318]/30' : 'border-[#d3d8de] focus:border-[#17643e] focus:ring-[#17643e]/20')} />
      {showError && <p id="exec-notes-error" role="alert" className="mt-1.5 text-[13.5px] font-medium text-[#9b2318]">Explica porque {missing.length === 1 ? 'ficou 1 tarefa' : `ficaram ${missing.length} tarefas`} por fazer.</p>}

      <IssuesList job={job} />
      <IssueRow job={job} />
    </ScreenScroll>
  );
}

/* ---------------------------------------------------------------- */
/* Enviado                                                          */
/* ---------------------------------------------------------------- */

export function SentScreen({ job }: { job: ExecJob }) {
  const { config, data, go, openJob } = useExec();
  const pending = pendingOf(job) > 0;
  const next = itemsOn(data, job.date).filter(isJob).find((j) => j.id !== job.id && (j.status === 'planned' || j.status === 'confirmed'));
  return (
    <ScreenScroll label="Conclusão">
      <div className="pt-6 text-center">
        <span className={cx('inline-grid h-[84px] w-[84px] place-items-center rounded-full', pending ? 'bg-[#edf3fb] text-[#2a5592]' : 'bg-[#e8f5ed] text-[#17643e]')}>
          <Icon name={pending ? 'cloudOff' : 'checkCircle'} className="h-11 w-11" />
        </span>
        <ScreenTitle className="mt-4">{pending ? 'Conclusão guardada' : `${config.job.singular} concluída`}</ScreenTitle>
        <p className="mt-1 text-slate-700">
          {job.place} · {job.unit}<br />
          {pending ? `Será enviada à ${config.manager} quando houver ligação.` : `Enviada à ${config.manager} às ${timeOf(job.finishedAt ?? 0)}.`}
        </p>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        {EXEC_FEATURES.timer
          ? <Stat label="Tempo registado" value={stopwatch(job.durationSec ?? 0)} />
          : <Stat label="Início e fim" value={`${timeOf(job.startedAt ?? 0)} – ${timeOf(job.finishedAt ?? 0)}`} />}
        <Stat label="Tarefas" value={`${countDone(job.tasks)} de ${job.tasks.length}`} />
        <Stat label={config.evidence} value={job.photos.length} />
        <Stat label="Avisos" value={job.issues.length} />
      </div>
      {next && <BigButton large block className="mt-5" onClick={() => openJob(next.id)}>A seguir: {next.start} {next.place}</BigButton>}
      <BigButton variant="outline" block className="mt-2.5" onClick={() => go('list')}>Voltar a {config.home}</BigButton>
    </ScreenScroll>
  );
}

export function EmptyMain() {
  const { config } = useExec();
  return (
    <div className="grid h-full place-items-center p-6 text-center text-slate-500">
      <div>
        <Icon name="home" className="mx-auto mb-2 h-10 w-10 text-slate-300" />
        <p>Escolhe uma {config.job.singular.toLowerCase()} para ver o detalhe.</p>
      </div>
    </div>
  );
}
