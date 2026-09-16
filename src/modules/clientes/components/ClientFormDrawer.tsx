import { useId, useState, type FormEvent } from 'react';
import { Button, ChoiceChips, Drawer, DrawerTitle, Field, inputBase, inputError, selectBase, selectStyle } from '../../shared/ui';
import { formatContact } from '../../onboarding';
import { BILLING_PERIODS, CLIENT_STATUS, formatNif } from '../format';
import { digitsOnly, validateClient, type ClientField } from '../rules';
import type { BillingPeriod, ClientInput, ClientStatus, FieldErrors } from '../types';
import { useClients } from './context';

const SectionTitle = ({ children }: { children: string }) => (
  <p className="mt-1.5 border-t border-slate-200 pt-3.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{children}</p>
);

/** Criar ou editar cliente — dados do cliente e da empresa no mesmo formulário. */
export function ClientFormDrawer({ clientId, onClose, onCreated }: { clientId: string | null; onClose: () => void; onCreated: (id: string) => void }) {
  const { data, config, actions } = useClients();
  const uid = useId();
  const current = clientId ? data.clients.find((c) => c.id === clientId) : undefined;
  const [v, setV] = useState<ClientInput>(() => current
    ? { name: current.name, segment: current.segment, nif: formatNif(current.nif), contact: current.contact, email: current.email, phone: current.phone, address: current.address, billing: current.billing, status: current.status, notes: current.notes }
    : { name: '', segment: config.segments[0] ?? '', nif: '', contact: '', email: '', phone: '', address: '', billing: 'Mensal', status: 'active', notes: '' });
  const [errors, setErrors] = useState<FieldErrors<ClientField>>({});
  const set = <K extends keyof ClientInput>(k: K, value: ClientInput[K]) => setV((s) => ({ ...s, [k]: value }));

  const segments = config.segments.includes(v.segment) || !v.segment ? config.segments : [...config.segments, v.segment];
  const id = (f: string) => `${uid}-${f}`;
  const control = (f: ClientField) => ({
    id: id(f),
    'aria-invalid': Boolean(errors[f]),
    'aria-describedby': errors[f] ? `${id(f)}-e` : undefined,
    className: `${inputBase} ${errors[f] ? inputError : ''}`,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateClient(v, data.clients, current?.id);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) { document.getElementById(id(first))?.focus(); return; }
    const savedId = actions.saveClient(current?.id ?? null, v);
    onClose();
    if (!current) onCreated(savedId);
  };

  const formId = id('form');
  return (
    <Drawer
      label={current ? 'Editar cliente' : 'Novo cliente'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">{current ? 'Guardar cliente' : 'Criar cliente'}</Button>
        </>
      }
    >
      <DrawerTitle eyebrow={current ? 'Cliente' : 'Novo cliente'} title={current?.name ?? 'Novo cliente'}>
        Dados do cliente e da empresa no mesmo formulário.
      </DrawerTitle>

      <form id={formId} noValidate onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <Field label="Nome" htmlFor={id('name')} help="Nome comercial ou nome da pessoa." error={errors.name} errorId={`${id('name')}-e`}>
          <input {...control('name')} data-autofocus autoComplete="organization" placeholder="Ex.: Porto Charming Suites" value={v.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Segmento" htmlFor={id('segment')}>
            <select id={id('segment')} value={v.segment} onChange={(e) => set('segment', e.target.value)} className={selectBase} style={selectStyle}>
              {segments.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="NIF" optional htmlFor={id('nif')} error={errors.nif} errorId={`${id('nif')}-e`}>
            <input {...control('nif')} inputMode="numeric" placeholder="123 456 789" value={v.nif}
              onChange={(e) => set('nif', digitsOnly(e.target.value).slice(0, 9))} onBlur={() => set('nif', formatNif(digitsOnly(v.nif)))} />
          </Field>
        </div>

        <SectionTitle>Contacto</SectionTitle>
        <Field label="Pessoa de contacto" htmlFor={id('contact')} error={errors.contact} errorId={`${id('contact')}-e`}>
          <input {...control('contact')} autoComplete="name" value={v.contact} onChange={(e) => set('contact', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor={id('email')} error={errors.email} errorId={`${id('email')}-e`}>
            <input {...control('email')} type="email" placeholder="nome@empresa.pt" value={v.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Telefone" optional htmlFor={id('phone')} error={errors.phone} errorId={`${id('phone')}-e`}>
            <input {...control('phone')} type="tel" inputMode="tel" placeholder="+351 912 345 678" value={v.phone} onChange={(e) => set('phone', formatContact(e.target.value))} />
          </Field>
        </div>
        <Field label="Morada" optional htmlFor={id('address')}>
          <input id={id('address')} autoComplete="street-address" placeholder="Rua, n.º, código postal e localidade" value={v.address} onChange={(e) => set('address', e.target.value)} className={inputBase} />
        </Field>

        <SectionTitle>Faturação e estado</SectionTitle>
        <ChoiceChips<BillingPeriod> name={id('billing')} legend="Período de pagamento" value={v.billing} onChange={(b) => set('billing', b)} options={BILLING_PERIODS.map((b) => [b, b])} />
        <ChoiceChips<ClientStatus> name={id('status')} legend="Estado" value={v.status} onChange={(s) => set('status', s)}
          options={(Object.keys(CLIENT_STATUS) as ClientStatus[]).map((k) => [k, CLIENT_STATUS[k].label])} />
        <Field label="Notas" optional htmlFor={id('notes')}>
          <textarea id={id('notes')} rows={3} placeholder="Preferências, horários, contactos alternativos…" value={v.notes} onChange={(e) => set('notes', e.target.value)} className={`${inputBase} resize-y py-2.5`} />
        </Field>
      </form>
    </Drawer>
  );
}
