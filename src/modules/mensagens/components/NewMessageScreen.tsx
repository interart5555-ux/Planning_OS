import { useState } from 'react';
import { Button, cx, Icon, inputBase, selectBase, selectStyle } from '../../shared/ui';
import { MAX_LENGTH } from '../config';
import { dayLabel, fullWhen } from '../format';
import { isManager } from '../rules';
import { useMessages } from '../store';
import type { NewMessageDraft } from '../types';
import { Avatar, card } from './parts';

type Errors = Partial<Record<'to' | 'text' | 'when', string>>;

/** Nova mensagem: equipa interna ou cliente, com associação a limpeza e envio agendado. */
export function NewMessageScreen({ onDone, onCancel, notify }: { onDone: (conversationId: string) => void; onCancel: () => void; notify: (m: string) => void }) {
  const { actions, people, jobs, clients, role, viewer, today, yesterday, now } = useMessages();
  const [f, setF] = useState<NewMessageDraft>({ kind: 'equipa', to: [], text: '', jobId: '', planId: '', when: 'now', date: today, time: '17:00' });
  const [errors, setErrors] = useState<Errors>({});
  const set = (patch: Partial<NewMessageDraft>) => { setF({ ...f, ...patch }); setErrors({}); };

  const teamIds = ['dora', 'rita', 'bruno', 'sara', 'carla', 'ana'].filter((id) => id !== viewer && people[id]);
  const options = f.kind === 'cliente'
    ? clients.filter((c) => c.contact).map((c): [string, string] => [c.contact, `${c.name} · ${people[c.contact]?.name ?? ''}`])
    : teamIds.map((id): [string, string] => [id, `${people[id].name} · ${people[id].role}`]);
  const free = options.filter(([id]) => !f.to.includes(id));

  const submit = () => {
    const e: Errors = {};
    if (!f.to.length) e.to = f.kind === 'cliente' ? 'Escolhe o cliente.' : 'Escolhe pelo menos uma pessoa.';
    if (!f.text.trim()) e.text = 'Escreve a mensagem.';
    if (f.when === 'later' && (!f.date || !f.time || `${f.date}T${f.time}` <= `${today}T${now}`)) e.when = `Escolhe uma data e hora posteriores a hoje, ${now}.`;
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) { document.getElementById(`nm-${first === 'when' ? 'date' : first}`)?.focus(); return; }
    const created = actions.createMessage(f);
    const scheduled = f.when === 'later';
    notify(scheduled ? `Mensagem agendada para ${fullWhen(`${f.date}T${f.time}`, today, yesterday)} (simulação).`
      : created.length > 1 ? `${created.length} conversas atualizadas · mensagem enviada (simulação).`
      : 'Mensagem enviada (simulação).');
    onDone(created[0].id);
  };

  const label = 'mb-1.5 block text-[13.5px] font-semibold text-slate-800';
  return (
    <>
      <button type="button" onClick={onCancel} className="mb-2.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#17643e] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
        <Icon name="back" className="h-4 w-4" />Voltar às conversas
      </button>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">Limpezas · Mensagens</p>
      <h1 id="page-title" tabIndex={-1} className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight focus:outline-none sm:text-[30px]">Nova mensagem</h1>
      <p className="mt-1.5 text-[14.5px] text-slate-600">Envia agora ou agenda o envio. Nesta fase nada sai do browser: sem email, SMS ou notificações reais.</p>

      <div className="mt-5 grid items-start gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-label="Nova mensagem" className={cx(card, 'p-5')}>
          <span className={label} id="nm-kind">Destinatários</span>
          <div role="group" aria-labelledby="nm-kind" className="grid grid-cols-2 gap-2.5">
            {([['equipa', 'Equipa interna', 'users'], ['cliente', 'Cliente', 'user']] as const).map(([k, text, icon]) => (
              <button key={k} type="button" aria-pressed={f.kind === k} onClick={() => setF({ ...f, kind: k, to: [] })}
                className={cx('flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]',
                  f.kind === k ? 'border-[#17643e] bg-[#e9f4ee] text-[#17643e]' : 'border-slate-300 text-slate-600')}>
                <Icon name={icon} />{text}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label htmlFor="nm-to" className={label}>{f.kind === 'cliente' ? 'Selecionar cliente' : 'Selecionar colaborador(es)'} <span aria-hidden="true" className="text-red-700">*</span></label>
            <select id="nm-to" value="" disabled={!free.length} aria-required="true" aria-invalid={Boolean(errors.to)} aria-describedby={errors.to ? 'nm-to-error' : undefined}
              onChange={(e) => { if (!e.target.value) return; set({ to: f.kind === 'cliente' ? [e.target.value] : [...f.to, e.target.value] }); }}
              className={cx(selectBase, 'min-h-10 text-sm', errors.to && 'border-red-600')} style={selectStyle}>
              <option value="">{free.length ? (f.kind === 'cliente' ? 'Selecionar cliente…' : 'Selecionar colaborador(es)…') : 'Sem mais destinatários'}</option>
              {free.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
            </select>
            {errors.to && <p id="nm-to-error" className="mt-1.5 text-[13px] font-medium text-red-700">{errors.to}</p>}
            {f.to.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.to.map((id) => (
                  <span key={id} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-300 py-0 pl-1 pr-1.5 text-[13px]">
                    <Avatar person={people[id]} size="sm" />{people[id]?.name}
                    <button type="button" aria-label={`Remover ${people[id]?.name}`} onClick={() => set({ to: f.to.filter((x) => x !== id) })}
                      className="grid h-5 w-5 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#17643e]">
                      <Icon name="x" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <label htmlFor="nm-text" className={label}>Mensagem <span aria-hidden="true" className="text-red-700">*</span></label>
            <textarea id="nm-text" rows={5} maxLength={MAX_LENGTH} value={f.text} placeholder="Escrever mensagem…" aria-required="true" aria-invalid={Boolean(errors.text)} aria-describedby={errors.text ? 'nm-text-error' : undefined}
              onChange={(e) => set({ text: e.target.value })} className={cx(inputBase, 'resize-y py-2.5', errors.text && 'border-red-600')} />
            <div className="mt-1 text-right text-xs text-slate-500">{f.text.length}/{MAX_LENGTH}</div>
            {errors.text && <p id="nm-text-error" className="text-[13px] font-medium text-red-700">{errors.text}</p>}
          </div>

          <div className="mt-4">
            <span className={label}>Associar a <span className="font-normal text-slate-400">(opcional)</span></span>
            <div className="grid gap-2.5 min-[560px]:grid-cols-2">
              <div>
                <label className="sr-only" htmlFor="nm-job">Associar limpeza</label>
                <select id="nm-job" value={f.jobId} onChange={(e) => set({ jobId: e.target.value })} className={cx(selectBase, 'min-h-10 text-sm')} style={selectStyle}>
                  <option value="">Selecionar limpeza…</option>
                  {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} · {dayLabel(`${j.date}T00:00`, today, yesterday)}</option>)}
                </select>
              </div>
              <div>
                <label className="sr-only" htmlFor="nm-plan">Associar item do planeamento</label>
                <select id="nm-plan" value={f.planId} onChange={(e) => set({ planId: e.target.value })} className={cx(selectBase, 'min-h-10 text-sm')} style={selectStyle}>
                  <option value="">Selecionar item do planeamento…</option>
                  {jobs.map((j) => <option key={j.id} value={j.id}>{dayLabel(`${j.date}T00:00`, today, yesterday)} · {j.time} · {j.place}</option>)}
                </select>
              </div>
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className={label}>Envio</legend>
            <div className="flex flex-wrap gap-4">
              {([['now', 'Enviar agora'], ['later', 'Agendar envio']] as const).map(([v, text]) => (
                <label key={v} className="inline-flex items-center gap-2 text-sm">
                  <input type="radio" name="nm-when" value={v} checked={f.when === v} onChange={() => set({ when: v })} className="h-[17px] w-[17px] accent-[#17643e]" />{text}
                </label>
              ))}
            </div>
            {f.when === 'later' && (
              <>
                <div className="mt-2.5 grid gap-2.5 min-[560px]:grid-cols-2">
                  <div><label className="sr-only" htmlFor="nm-date">Data de envio</label>
                    <input id="nm-date" type="date" min={today} value={f.date} onChange={(e) => set({ date: e.target.value })} className={cx(inputBase, 'min-h-10 text-sm', errors.when && 'border-red-600')} /></div>
                  <div><label className="sr-only" htmlFor="nm-time">Hora de envio</label>
                    <input id="nm-time" type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} className={cx(inputBase, 'min-h-10 text-sm', errors.when && 'border-red-600')} /></div>
                </div>
                {errors.when ? <p className="mt-1.5 text-[13px] font-medium text-red-700">{errors.when}</p>
                  : <p className="mt-1.5 text-[12.5px] text-slate-500">A mensagem fica guardada como “Agendada” até à hora escolhida (simulação).</p>}
              </>
            )}
          </fieldset>

          <div className="mt-5 flex flex-wrap justify-end gap-2.5">
            <Button onClick={onCancel}>Cancelar</Button>
            <Button variant="primary" icon="send" onClick={submit}>{f.when === 'later' ? 'Agendar mensagem' : 'Enviar mensagem'}</Button>
          </div>
        </section>

        <aside aria-label="Dicas" className="rounded-[14px] border border-[#f1dfa4] bg-[#fffdf5] p-[18px]">
          <h2 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-[#7a5406]"><Icon name="bulb" />Dicas</h2>
          <p className="text-[13.5px] text-slate-700">Usa as mensagens para alinhar detalhes, partilhar informações e manter a equipa e os clientes sempre atualizados.</p>
          <h3 className="mb-1.5 mt-3.5 text-[13px] font-semibold">Podes também:</h3>
          <ul className="list-disc pl-5 text-[13.5px] text-slate-700 [&>li+li]:mt-1.5">
            <li>Anexar uma limpeza ou um item do planeamento</li>
            <li>Agendar o envio da mensagem</li>
            <li>Adicionar fotos ou documentos (simulados)</li>
          </ul>
          {!isManager(role) && <p className="mt-3 text-[12.5px] text-slate-500">Como colaboradora, as mensagens ficam visíveis para a gestora e para quem participa na conversa.</p>}
        </aside>
      </div>
    </>
  );
}
