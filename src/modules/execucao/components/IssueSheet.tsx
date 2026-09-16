import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx, focusRing, IconButton, useDialogFocus } from '../../shared/ui';
import { DELAY_OPTIONS, delayLabel, ISSUE_TYPES } from '../config';
import type { ExecJob, IssueType } from '../types';
import { useExec } from './context';
import { AddPhotoButton, BigButton, Notice, Optional, PhotoTile } from './parts';

function Chips<T extends string | number>({ name, legend, value, options, onChange, tone }: { name: string; legend: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void; tone: 'bad' | 'ok' }) {
  return (
    <fieldset className="mt-[18px]">
      <legend className="mb-2 text-[14px] font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, label]) => (
          <label key={String(v)} className="relative">
            <input type="radio" name={name} checked={v === value} onChange={() => onChange(v)} className="peer absolute inset-0 m-0 cursor-pointer opacity-0" />
            <span className={cx('inline-flex min-h-[44px] items-center rounded-full border border-[#d3d8de] bg-white px-3.5 text-[14.5px] font-medium peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-[#17643e] peer-focus-visible:ring-offset-2',
              tone === 'bad' ? 'peer-checked:border-[#9b2318] peer-checked:bg-[#fde8e6] peer-checked:text-[#9b2318]' : 'peer-checked:border-[#17643e] peer-checked:bg-[#e9f4ee] peer-checked:text-[#17643e]')}>
              {label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** "Registar anomalia ou atraso": folha inferior no telemóvel, diálogo centrado no tablet. */
export function IssueSheet({ job, onClose }: { job: ExecJob; onClose: () => void }) {
  const { config, online, actions } = useExec();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [type, setType] = useState<IssueType>('atraso');
  const [delay, setDelay] = useState(30);
  const [description, setDescription] = useState('');
  const [withPhoto, setWithPhoto] = useState(false);
  const [error, setError] = useState(false);
  useDialogFocus(ref, onClose);

  const save = () => {
    if (!description.trim()) {
      setError(true);
      document.getElementById('exec-issue-desc')?.focus();
      return;
    }
    actions.addIssue(job.id, { type, delayMin: type === 'atraso' ? delay : null, description, withPhoto });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] text-[15px] text-[#15181c] antialiased">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div ref={ref} data-dialog role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[20px] bg-white shadow-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[min(520px,calc(100%-48px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[18px]">
        <div aria-hidden="true" className="mx-auto mt-2 h-[5px] w-10 rounded-full bg-slate-300 md:hidden" />
        <div className="flex items-center justify-between gap-2.5 px-4 pb-1.5 pt-4">
          <h2 id={titleId} className="text-[19px] font-bold">Registar anomalia ou atraso</h2>
          <IconButton icon="x" label="Fechar" onClick={onClose} className="h-11 w-11" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1.5">
          <p className="text-slate-700">{job.place} · {job.unit} · {job.start}–{job.end}</p>
          <Chips name="exec-issue-type" legend="Tipo" value={type} options={ISSUE_TYPES} onChange={setType} tone="bad" />
          {type === 'atraso' && (
            <Chips name="exec-issue-delay" legend="Atraso previsto" value={delay} options={DELAY_OPTIONS.map((m) => [m, delayLabel(m)] as [number, string])} onChange={setDelay} tone="ok" />
          )}
          <label htmlFor="exec-issue-desc" className="mb-2 mt-3.5 block text-[14px] font-semibold">Descrição</label>
          <textarea id="exec-issue-desc" value={description}
            onChange={(e) => { setDescription(e.target.value); if (e.target.value.trim()) setError(false); }}
            placeholder={type === 'atraso' ? 'Ex.: hóspedes ainda no alojamento, começo às 09:00.' : 'Ex.: vidro da janela da sala partido.'}
            aria-invalid={error || undefined} aria-describedby={error ? 'exec-issue-desc-error' : undefined}
            className={cx('block min-h-[96px] w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-[15px] focus:outline-none focus:ring-2',
              error ? 'border-[#9b2318] focus:ring-[#9b2318]/30' : 'border-[#d3d8de] focus:border-[#17643e] focus:ring-[#17643e]/20')} />
          {error && <p id="exec-issue-desc-error" role="alert" className="mt-1.5 text-[13.5px] font-medium text-[#9b2318]">Descreve o que aconteceu.</p>}
          <span className="mb-2 mt-3.5 block text-[14px] font-semibold">Fotografia <Optional /></span>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,108px))] gap-2.5">
            {withPhoto
              ? <PhotoTile photo={{ kind: 1 }} label="Foto" onRemove={() => { setWithPhoto(false); requestAnimationFrame(() => document.getElementById('exec-issue-photo')?.focus()); }} />
              : <AddPhotoButton id="exec-issue-photo" label={config.addEvidence} onClick={() => setWithPhoto(true)} />}
          </div>
          <Notice tone="info" icon="info">
            Fica no histórico da {config.job.singular.toLowerCase()} e a {config.manager} vai poder consultá-lo.{!online && ' Sem rede: será enviado quando houver ligação.'}
          </Notice>
        </div>
        <div className="flex flex-wrap gap-2.5 border-t border-slate-200 px-4 pb-4 pt-3 [&>button]:flex-[1_1_140px]">
          <BigButton variant="outline" onClick={onClose}>Cancelar</BigButton>
          <BigButton onClick={save} className={focusRing}>Registar</BigButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
