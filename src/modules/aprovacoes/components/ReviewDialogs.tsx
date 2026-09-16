import { useId, useState } from 'react';
import { Button, cx, Dialog, Icon, inputBase, inputError, selectBase, selectStyle } from '../../shared/ui';
import { REOPEN_OPTIONS, theJob, thisJob } from '../config';
import type { ReopenState } from '../types';
import { useApprovals } from './context';

const MAX = 500;

function Required() {
  return <><i aria-hidden="true" className="not-italic text-[#b42318]"> *</i><span className="sr-only"> (obrigatório)</span></>;
}

function MessageField({ id, label, value, onChange, error, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; placeholder: string }) {
  return (
    <div className="mt-[18px]">
      <label htmlFor={id} className="mb-1.5 block text-[13.5px] font-semibold">{label}<Required /></label>
      <textarea id={id} data-autofocus value={value} maxLength={MAX} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        aria-required="true" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined}
        className={cx(inputBase, 'min-h-[96px] resize-y py-2.5', error && inputError)} />
      <div className="mt-1 text-right text-xs text-slate-500">{value.length}/{MAX}</div>
      {error && <p id={`${id}-err`} className="mt-1 text-[13px] font-medium text-[#b42318]">{error}</p>}
    </div>
  );
}

export function CorrectionDialog({ recordId, onClose }: { recordId: string; onClose: () => void }) {
  const { config, records, people, actions } = useApprovals();
  const id = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  const r = records.find((x) => x.id === recordId);
  if (!r) return null;
  const person = people.find((p) => p.id === r.personId);

  const send = () => {
    if (!text.trim()) {
      setError(true);
      document.getElementById(`${id}-msg`)?.focus();
      return;
    }
    if (actions.requestCorrection(r.id, text)) actions.notify(`Pedido de correção enviado a ${person?.name ?? config.person.feminine} (simulação).`);
    onClose();
  };

  return (
    <Dialog wide title="Pedir correção" onClose={onClose}
      description={`${r.place} · ${r.unit}. ${person?.name ?? ''} recebe o pedido e ${theJob(config)} fica em “Correção pedida”.`}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={send}>Enviar pedido de correção</Button></>}>
      <MessageField id={`${id}-msg`} label={`Mensagem para a ${config.person.feminine}`} value={text} placeholder="Ex.: faltam fotografias da casa de banho."
        onChange={(v) => { setText(v); if (v.trim()) setError(false); }} error={error ? `Escreve a mensagem para a ${config.person.feminine}.` : undefined} />
    </Dialog>
  );
}

export function ReopenDialog({ recordId, onClose }: { recordId: string; onClose: () => void }) {
  const { config, records, actions } = useApprovals();
  const id = useId();
  const [reason, setReason] = useState('');
  const [state, setState] = useState<ReopenState | ''>('');
  const [errors, setErrors] = useState({ reason: false, state: false });
  const r = records.find((x) => x.id === recordId);
  if (!r) return null;

  const submit = () => {
    const next = { reason: !reason.trim(), state: state !== 'Planeado' && state !== 'Em curso' };
    setErrors(next);
    if (next.reason || next.state) {
      document.getElementById(next.reason ? `${id}-reason` : `${id}-state`)?.focus();
      return;
    }
    const to = state as ReopenState;
    if (actions.reopen(r.id, to, reason)) {
      actions.notify(`${config.job.singular} reaberta como ${to} · ${to === 'Em curso' ? 'voltou à Execução' : 'voltou ao Planeamento'}. A equipa foi notificada (simulação).`);
    }
    onClose();
  };

  return (
    <Dialog wide title={`Reabrir ${config.job.singular.toLowerCase()}`} onClose={onClose}
      description={`Ao reabrir ${thisJob(config)} (${r.place} · ${r.unit}), o registo volta ao fluxo operacional e fica disponível para a equipa. Todo o histórico de auditoria é preservado.`}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={submit}>Reabrir {config.job.singular.toLowerCase()}</Button></>}>
      <MessageField id={`${id}-reason`} label="Motivo da reabertura" value={reason} placeholder="Indica o motivo da reabertura…"
        onChange={(v) => { setReason(v); if (v.trim()) setErrors((e) => ({ ...e, reason: false })); }} error={errors.reason ? 'Indica o motivo da reabertura.' : undefined} />
      <div className="mt-1.5">
        <label htmlFor={`${id}-state`} className="mb-1.5 block text-[13.5px] font-semibold">Novo estado<Required /></label>
        <select id={`${id}-state`} value={state} aria-required="true" aria-invalid={errors.state ? true : undefined} aria-describedby={errors.state ? `${id}-state-err` : undefined}
          onChange={(e) => { setState(e.target.value as ReopenState | ''); if (e.target.value) setErrors((x) => ({ ...x, state: false })); }}
          className={cx(selectBase, errors.state && inputError)} style={selectStyle}>
          <option value="">Escolher o novo estado</option>
          {REOPEN_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {errors.state && <p id={`${id}-state-err`} className="mt-1 text-[13px] font-medium text-[#b42318]">Escolhe Planeado ou Em curso.</p>}
      </div>
      <div role="note" className="mt-4 flex gap-2.5 rounded-[10px] border border-[#f1dfa4] bg-[#fdf6de] px-3 py-[11px] text-[13.5px] text-[#7a5406]">
        <Icon name="alert" className="mt-px h-[18px] w-[18px] text-[#c98a06]" />
        <span>A equipa atribuída será notificada sobre esta reabertura.</span>
      </div>
    </Dialog>
  );
}
