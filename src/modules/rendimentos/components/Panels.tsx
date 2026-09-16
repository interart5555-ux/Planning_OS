import { useId, useState } from 'react';
import { Button, cx, Dialog, Icon, inputBase, inputError, selectBase, selectStyle } from '../../shared/ui';
import { CYCLE_LABEL, PAYMENT_METHODS, PRODUCT_COST } from '../config';
import { cap, eur, eur2, formatDay, formatDay2, hrs, invoicePeriodLabel, monthLabel, parseEuro } from '../format';
import { invoiceStatus, missingOf, paidOf, teamMonth } from '../rules';
import type { MonthKey, SupplyModel } from '../types';
import { useRevenue } from './context';
import { InfoBanner, MetaList, MoneyRows, Note, SidePanel, StatusPill, TonePill } from './parts';

export function InvoicePanel({ invoiceId, onClose, onRegister, fromClient }: { invoiceId: string; onClose: () => void; onRegister: () => void; fromClient: boolean }) {
  const { data, today, viewer, openClient } = useRevenue();
  const inv = data.invoices.find((x) => x.id === invoiceId);
  const client = inv && data.clients.find((c) => c.id === inv.clientId);
  if (!inv || !client) return null;
  const st = invoiceStatus(inv, today);
  const miss = missingOf(inv);

  return (
    <SidePanel title={client.name} subtitle={`${cap(invoicePeriodLabel(inv.from, inv.to))} · ${inv.id}`} badge={<StatusPill status={st} />} onClose={onClose}
      footer={<>
        {miss > 0 && viewer.canView
          ? <Button variant="primary" icon="euro" className="min-h-[46px]" onClick={onRegister}>Registar pagamento</Button>
          : <TonePill tone="ok" className="self-start">Fatura paga na totalidade</TonePill>}
        {!fromClient && <Button variant="ghost" iconRight="arrow" className="text-[#17643e] hover:bg-[#e9f4ee]" onClick={() => openClient(client.id)}>Ver rentabilidade do cliente</Button>}
      </>}>
      <MoneyRows rows={[
        { label: 'Total da fatura', value: eur(inv.amount) },
        { label: 'Valor recebido', value: eur(paidOf(inv)), tone: 'ok' },
        { label: 'Em falta', value: eur(miss), tone: miss ? 'bad' : undefined, sum: true },
      ]} />
      <MetaList items={[
        ['Cliente', client.name],
        ['Período', invoicePeriodLabel(inv.from, inv.to)],
        ['Emitida', formatDay2(inv.issued)],
        ['Vencimento', formatDay2(inv.due), st === 'late' ? 'text-[#b42318]' : undefined],
        ['Condição', `Pagamento a ${client.terms} dias · ${CYCLE_LABEL[client.cycle].toLowerCase()}`],
      ]} />
      <h3 className="mb-2 mt-5 text-sm font-semibold">Histórico de pagamentos</h3>
      {inv.payments.length ? (
        <ol className="divide-y divide-slate-200">
          {inv.payments.map((p, i) => (
            <li key={i} className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-start gap-2.5 py-2.5">
              <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#e7f5ec] text-[#17643e]"><Icon name="check" className="h-[15px] w-[15px]" /></span>
              <span><b className="font-semibold">{formatDay(p.date)}</b><small className="block text-xs text-slate-500">{p.method} · registado por {p.by}</small>{p.note && <small className="block text-xs text-slate-500">{p.note}</small>}</span>
              <span className="font-bold tabular-nums text-[#17643e]">{eur(p.amount)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 px-4 py-[26px] text-center text-[13px] text-slate-500">
          <Icon name="doc" className="h-[34px] w-[34px] text-slate-600" />Ainda não existem pagamentos registados para esta fatura.
        </div>
      )}
      <Note>Registo simulado: sem ligação a bancos, links de pagamento ou fornecedores de pagamentos.</Note>
    </SidePanel>
  );
}

export function PersonPanel({ personId, month, onClose }: { personId: string; month: MonthKey; onClose: () => void }) {
  const { config, data, viewer, actions } = useRevenue();
  const row = teamMonth(data, month).rows.find((r) => r.person.id === personId);
  if (!row) return null;
  const p = row.person;
  return (
    <SidePanel title={p.name} subtitle={`${p.role} · ${monthLabel(month)}`} badge={row.paid ? <TonePill tone="ok">Pago</TonePill> : <TonePill tone="warn">Pendente</TonePill>} onClose={onClose}
      footer={viewer.canView && !row.paid ? (
        <Button variant="primary" icon="check" className="min-h-[46px]" onClick={() => { actions.markTeamPaid(month, p.id); actions.notify(`Pagamento a ${p.name} marcado como pago (simulação).`); }}>Marcar como pago</Button>
      ) : undefined}>
      <MoneyRows rows={[
        { label: `${hrs(row.hours)} × ${eur2(p.rate)}`, value: eur(row.base) },
        { label: 'Deslocações', value: eur(row.travel) },
        { label: 'Total a pagar', value: eur(row.total), sum: true },
      ]} />
      <MetaList items={[
        ['Valor/hora', eur2(p.rate)],
        ['Origem do valor/hora', `Perfil do ${config.person.singular.toLowerCase()} (Equipas)`],
        ['Horas executadas', hrs(row.hours)],
        ['Pagamento', row.paid ? `Pago a ${formatDay(row.paid)}` : 'Por pagar'],
      ]} />
      <InfoBanner className="mt-4" icon="car" title="Deslocações: custo da empresa">
        {eur(row.travel)} pagos a {p.name.split(' ')[0]}. Não entram na faturação dos clientes.
      </InfoBanner>
    </SidePanel>
  );
}

function Required() {
  return <><i aria-hidden="true" className="not-italic text-[#b42318]"> *</i><span className="sr-only"> (obrigatório)</span></>;
}
const fieldLabel = 'mb-1.5 block text-[13.5px] font-semibold';
const errText = 'mt-1 text-[13px] font-medium text-[#b42318]';

export function RegisterPaymentDialog({ invoiceId, onClose }: { invoiceId: string; onClose: () => void }) {
  const { data, today, actions } = useRevenue();
  const id = useId();
  const inv = data.invoices.find((x) => x.id === invoiceId);
  const miss = inv ? missingOf(inv) : 0;
  const [amount, setAmount] = useState(String(miss).replace('.', ','));
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({});
  if (!inv) return null;
  const client = data.clients.find((c) => c.id === inv.clientId);

  const save = () => {
    const value = parseEuro(amount);
    const next = {
      amount: Number.isNaN(value) || value <= 0 ? 'Indica um montante superior a € 0.' : value > miss ? `O montante não pode ser superior ao valor em falta (${eur(miss)}).` : undefined,
      date: !date ? 'Indica a data do pagamento.' : date > today ? 'A data não pode ser posterior a hoje.' : undefined,
    };
    setErrors(next);
    if (next.amount || next.date) { document.getElementById(next.amount ? `${id}-amount` : `${id}-date`)?.focus(); return; }
    const rounded = Math.round(value * 100) / 100;
    actions.registerPayment(inv.id, { date, amount: rounded, method, note: note.trim() });
    const left = miss - rounded;
    actions.notify(left <= 0 ? `Pagamento de ${eur(rounded)} registado · ${inv.id} está paga (simulação).` : `Pagamento parcial de ${eur(rounded)} registado · faltam ${eur(left)} (simulação).`);
    onClose();
  };

  return (
    <Dialog wide title="Registar pagamento" onClose={onClose}
      description={<>{client?.name} · {inv.id}. Em falta: <b>{eur(miss)}</b>.</>}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Registar pagamento</Button></>}>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-amount`} className={fieldLabel}>Montante recebido<Required /></label>
          <span className="relative block">
            <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
            <input id={`${id}-amount`} data-autofocus inputMode="decimal" value={amount} aria-required="true" aria-invalid={errors.amount ? true : undefined} aria-describedby={errors.amount ? `${id}-amount-err` : undefined}
              onChange={(e) => { setAmount(e.target.value); setErrors((x) => ({ ...x, amount: undefined })); }} className={cx(inputBase, 'pl-7', errors.amount && inputError)} />
          </span>
          {errors.amount && <p id={`${id}-amount-err`} className={errText}>{errors.amount}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-date`} className={fieldLabel}>Data do pagamento<Required /></label>
          <input id={`${id}-date`} type="date" max={today} value={date} aria-required="true" aria-invalid={errors.date ? true : undefined} aria-describedby={errors.date ? `${id}-date-err` : undefined}
            onChange={(e) => { setDate(e.target.value); setErrors((x) => ({ ...x, date: undefined })); }} className={cx(inputBase, errors.date && inputError)} />
          {errors.date && <p id={`${id}-date-err`} className={errText}>{errors.date}</p>}
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor={`${id}-method`} className={fieldLabel}>Método</label>
        <select id={`${id}-method`} value={method} onChange={(e) => setMethod(e.target.value)} className={selectBase} style={selectStyle}>
          {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="mt-4">
        <label htmlFor={`${id}-note`} className={fieldLabel}>Nota <span className="font-normal text-slate-500">(opcional)</span></label>
        <input id={`${id}-note`} maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: referência da transferência" className={inputBase} />
      </div>
      <p className="mt-3 text-[12.5px] text-slate-500">Se o montante for inferior ao valor em falta, a fatura fica paga em parte.</p>
    </Dialog>
  );
}

export function SupplyDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { config, data, actions } = useRevenue();
  const id = useId();
  const client = data.clients.find((c) => c.id === clientId);
  const [supply, setSupply] = useState<SupplyModel>(client?.supply ?? 'included');
  const [value, setValue] = useState((client?.supplement ?? 0).toFixed(2).replace('.', ','));
  const [error, setError] = useState('');
  if (!client) return null;
  const productsLower = config.products.toLowerCase();

  const save = () => {
    let supplement = client.supplement;
    if (supply === 'included') {
      const v = parseEuro(value);
      const err = Number.isNaN(v) || v < 0 ? 'Indica um valor igual ou superior a € 0.' : v > 20 ? 'O suplemento não pode ultrapassar € 20,00.' : '';
      setError(err);
      if (err) { document.getElementById(`${id}-sup`)?.focus(); return; }
      supplement = Math.round(v * 100) / 100;
    }
    actions.setSupply(client.id, supply, supplement);
    actions.notify(supply === 'included' ? `Incluído no serviço · suplemento de ${eur2(supplement)} ${config.perJob}.` : `Fornecido pelo cliente · sem custos nem suplemento de ${config.productsShort}.`);
    onClose();
  };

  const option = (v: SupplyModel, title: string, text: string) => (
    <label className={cx('mt-2 flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-[11px]', supply === v ? 'border-[#17643e] bg-[#e9f4ee]' : 'border-slate-300')}>
      <input type="radio" name={`${id}-supply`} value={v} checked={supply === v} onChange={() => { setSupply(v); setError(''); }} className="mt-[3px] accent-[#17643e]" {...(supply === v ? { 'data-autofocus': true } : {})} />
      <span><b className="block font-semibold">{title}</b><small className="block text-[12.5px] text-slate-500">{text}</small></span>
    </label>
  );

  return (
    <Dialog wide title={config.supply} onClose={onClose} description={`${client.name}. Define quem fornece os ${productsLower}.`}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={save}>Guardar</Button></>}>
      <fieldset className="mt-4">
        <legend className="text-[13.5px] font-semibold">Modelo</legend>
        {option('included', 'Incluído no serviço', `O consumo entra nos custos operacionais e aplica-se um suplemento ${config.perJob}.`)}
        {option('client', 'Fornecido pelo cliente', 'Sem custo de stock para a empresa e sem suplemento.')}
      </fieldset>
      {supply === 'included' && (
        <div className="mt-4">
          <label htmlFor={`${id}-sup`} className={fieldLabel}>{config.supplement}<Required /></label>
          <span className="relative block max-w-[180px]">
            <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
            <input id={`${id}-sup`} inputMode="decimal" value={value} aria-required="true" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-sup-err` : `${id}-sup-help`}
              onChange={(e) => { setValue(e.target.value); setError(''); }} className={cx(inputBase, 'pl-7', error && inputError)} />
          </span>
          {error ? <p id={`${id}-sup-err`} className={errText}>{error}</p> : <p id={`${id}-sup-help`} className="mt-1 text-[12.5px] text-slate-500">Custo estimado de {config.productsShort}: {eur2(PRODUCT_COST)} {config.perJob}.</p>}
        </div>
      )}
      <p className="mt-3 text-[12.5px] text-slate-500">Simulação: a rentabilidade é recalculada e as faturas ainda sem pagamentos são atualizadas.</p>
    </Dialog>
  );
}
