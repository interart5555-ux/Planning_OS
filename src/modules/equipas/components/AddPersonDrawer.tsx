import { useId, useState, type FormEvent } from 'react';
import { firstName, isFeminine, roleLabel, usesPin } from '../format';
import type { FieldErrors, NewPersonInput } from '../types';
import { validatePerson } from '../validation';
import { AccessPill } from './CollaboratorsTab';
import { useTeams } from './context';
import { Button, Drawer, DrawerTitle, Field, Icon, inputBase, inputError, selectBase, selectStyle } from '../../shared/ui';

type Role = NewPersonInput['role'];

const EMPTY = (role: Role): NewPersonInput => ({ name: '', email: '', role, teamId: '', hourlyRate: '' });

const ROLE_HELP: Record<Role, string> = {
  collab: 'Executa as limpezas. Entra na aplicação com um PIN de 4 dígitos.',
  manager: 'Gere planeamento, equipas e ausências. Entra com credenciais completas.',
};

function Steps({ step }: { step: 1 | 2 }) {
  const dot = 'inline-grid h-5 w-5 place-items-center rounded-full text-[11px]';
  return (
    <div aria-hidden="true" className="mt-4 flex items-center gap-2.5 text-[12.5px] text-slate-500">
      <span className={`inline-flex items-center gap-1.5 ${step === 1 ? 'font-semibold text-[#17643e]' : ''}`}>
        <b className={`${dot} ${step === 1 ? 'bg-[#17643e] text-white' : 'bg-[#e9f4ee] text-[#17643e]'}`}>{step === 1 ? '1' : '✓'}</b>Dados
      </span>
      <i className="h-px w-7 bg-slate-300" />
      <span className={`inline-flex items-center gap-1.5 ${step === 2 ? 'font-semibold text-[#17643e]' : ''}`}>
        <b className={`${dot} ${step === 2 ? 'bg-[#17643e] text-white' : 'bg-slate-100 text-slate-600'}`}>2</b>Acesso
      </span>
    </div>
  );
}

/**
 * "Adicionar colaborador" em dois passos:
 * 1. dados (nome, email, função, equipa, valor/hora);
 * 2. envio simulado do acesso à aplicação.
 */
export function AddPersonDrawer({ presetRole = 'collab', onClose }: { presetRole?: Role; onClose: () => void }) {
  const { data, mode, sendingIds, actions, openPerson } = useTeams();
  const uid = useId();
  const [values, setValues] = useState<NewPersonInput>(EMPTY(presetRole));
  const [errors, setErrors] = useState<FieldErrors<'name' | 'email' | 'hourlyRate'>>({});
  const [createdId, setCreatedId] = useState<string | null>(null);
  const set = <K extends keyof NewPersonInput>(k: K, v: NewPersonInput[K]) => setValues((s) => ({ ...s, [k]: v }));
  const isManagerInvite = presetRole === 'manager';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validatePerson(values, data.people);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setCreatedId(actions.addPerson(values));
  };

  const person = createdId ? data.people.find((p) => p.id === createdId) : undefined;

  /* ---------------- Passo 2: acesso ---------------- */
  if (person) {
    const team = person.teamId ? data.teams.find((t) => t.id === person.teamId) : undefined;
    const sending = sendingIds.includes(person.id);
    return (
      <Drawer
        label="Acesso à aplicação"
        onClose={onClose}
        footer={
          <>
            <Button variant="ghost" icon="plus" onClick={() => { setCreatedId(null); setValues(EMPTY('collab')); setErrors({}); }}>Adicionar outro</Button>
            <Button onClick={() => { onClose(); openPerson(person.id); }}>Ver ficha</Button>
            <Button variant="primary" onClick={onClose}>Concluir</Button>
          </>
        }
      >
        <DrawerTitle eyebrow="Novo elemento" title="Acesso à aplicação" />
        <Steps step={2} />

        <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#e7f5ec] px-3.5 py-3 text-[#17643e]">
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#17643e] text-white"><Icon name="check" /></span>
          <div>
            <b className="block">Colaborador guardado</b>
            <span className="text-[13px] text-slate-600">
              {person.name} foi adicionad{isFeminine(person.name) ? 'a' : 'o'}{team ? ` à ${team.name}` : ' sem equipa'} como {roleLabel(person, mode).toLowerCase()}.
            </span>
          </div>
        </div>

        <section className="mt-4 rounded-xl border border-slate-200 px-4 py-3.5">
          <div className="mb-2 flex items-center gap-2">
            <Icon name="key" className="h-[17px] w-[17px] text-[#17643e]" />
            <h3 className="flex-1 text-[14.5px] font-semibold">Acesso à aplicação</h3>
            <AccessPill person={person} />
          </div>
          <p className="text-slate-600">
            O email <b>ativa ou cria a conta</b> de {firstName(person.name)}: se já existir uma conta com <b>{person.email}</b>, é ativada; caso contrário, é criada.
          </p>

          <div className="mt-3 flex items-center gap-3.5 rounded-[10px] bg-slate-50 px-3.5 py-3">
            {usesPin(person) ? (
              <span aria-hidden="true" className="flex shrink-0 gap-1">
                {[0, 1, 2, 3].map((i) => <i key={i} className="grid h-8 w-[26px] place-items-center rounded-md border border-slate-300 bg-white font-bold not-italic text-[#17643e]">•</i>)}
              </span>
            ) : (
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-slate-300 bg-white text-[#17643e]"><Icon name="key" /></span>
            )}
            <div>
              <b className="block font-semibold">{usesPin(person) ? 'Ativação com PIN de 4 dígitos' : 'Credenciais completas'}</b>
              <span className="text-[12.5px] text-slate-600">
                {usesPin(person)
                  ? 'Para colaboradoras operacionais: definem um PIN no telemóvel e entram sem palavra-passe.'
                  : 'Administradoras e gestoras criam palavra-passe e entram com email e palavra-passe.'}
              </span>
            </div>
          </div>

          {person.access === 'none' && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" icon="send" loading={sending} onClick={() => actions.sendAccess(person.id)}>{sending ? 'A enviar…' : 'Enviar acesso'}</Button>
              {!sending && (
                <Button variant="ghost" onClick={() => { onClose(); actions.notify(`${person.name} guardado sem acesso. Podes enviar mais tarde.`); }}>Enviar mais tarde</Button>
              )}
            </div>
          )}
          {person.access === 'failed' && (
            <>
              <div className="mt-3.5 flex gap-2.5 rounded-[10px] border border-[#f3dfae] bg-[#fffaf0] px-3 py-2.5 text-[13px] text-[#80570a]">
                <Icon name="alert" className="h-[17px] w-[17px]" />
                <span>O envio para {person.email} falhou. Confirma o email na ficha e reenvia.</span>
              </div>
              <div className="mt-3"><Button icon="send" loading={sending} onClick={() => actions.sendAccess(person.id)}>Reenviar acesso</Button></div>
            </>
          )}
          {(person.access === 'sent' || person.access === 'active') && (
            <div className="mt-3.5 flex items-center gap-3 rounded-xl bg-[#e7f5ec] px-3.5 py-3">
              <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#17643e] text-white"><Icon name="send" className="h-4 w-4" /></span>
              <div>
                <b className="block text-[#17643e]">Acesso enviado</b>
                <span className="text-[13px] text-slate-600">Email enviado para {person.email}{person.sentAt ? ` às ${person.sentAt}` : ''}. Aguarda ativação.</span>
              </div>
            </div>
          )}
        </section>
        <p className="mt-3 text-[12.5px] text-slate-500">Simulação: nenhum email é enviado nesta fase.</p>
      </Drawer>
    );
  }

  /* ---------------- Passo 1: dados ---------------- */
  const formId = `${uid}-form`;
  return (
    <Drawer
      label={isManagerInvite ? 'Convidar gestora' : 'Adicionar colaborador'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={formId} variant="primary">Guardar colaborador</Button>
        </>
      }
    >
      <DrawerTitle eyebrow={isManagerInvite ? 'Responsabilidades separadas' : 'Novo elemento'} title={isManagerInvite ? 'Convidar gestora' : 'Adicionar colaborador'}>
        Os dados ficam disponíveis no Planeamento. O acesso à aplicação é enviado no passo seguinte.
      </DrawerTitle>
      <Steps step={1} />

      <form id={formId} className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
        <Field label="Nome completo" htmlFor={`${uid}-name`} error={errors.name} errorId={`${uid}-name-e`}>
          <input id={`${uid}-name`} data-autofocus autoComplete="off" placeholder="Ex.: Joana Pereira" value={values.name} onChange={(e) => set('name', e.target.value)}
            aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${uid}-name-e` : undefined} className={`${inputBase} ${errors.name ? inputError : ''}`} />
        </Field>
        <Field label="Email" htmlFor={`${uid}-email`} error={errors.email} errorId={`${uid}-email-e`} helpId={`${uid}-email-h`}
          help="Usado para enviar o acesso. Um email com “falha” simula um erro de envio.">
          <input id={`${uid}-email`} type="email" autoComplete="off" placeholder="nome@email.pt" value={values.email} onChange={(e) => set('email', e.target.value)}
            aria-invalid={Boolean(errors.email)} aria-describedby={`${uid}-email-h${errors.email ? ` ${uid}-email-e` : ''}`} className={`${inputBase} ${errors.email ? inputError : ''}`} />
        </Field>
        <Field label="Função" htmlFor={`${uid}-role`} help={ROLE_HELP[values.role]} helpId={`${uid}-role-h`}>
          <select id={`${uid}-role`} value={values.role} onChange={(e) => set('role', e.target.value as Role)} aria-describedby={`${uid}-role-h`} className={selectBase} style={selectStyle}>
            <option value="collab">Colaborador(a) operacional</option>
            {/* Gestora só existe com responsabilidades separadas. */}
            {mode === 'separate' && <option value="manager">Gestor(a)</option>}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Equipa" optional htmlFor={`${uid}-team`}>
            <select id={`${uid}-team`} value={values.teamId} onChange={(e) => set('teamId', e.target.value)} className={selectBase} style={selectStyle}>
              <option value="">Sem equipa</option>
              {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Valor/hora" optional htmlFor={`${uid}-rate`} error={errors.hourlyRate} errorId={`${uid}-rate-e`}>
            <div className="relative">
              <input id={`${uid}-rate`} inputMode="decimal" placeholder="8,50" value={values.hourlyRate} onChange={(e) => set('hourlyRate', e.target.value)}
                aria-invalid={Boolean(errors.hourlyRate)} className={`${inputBase} pr-12 ${errors.hourlyRate ? inputError : ''}`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">€/h</span>
            </div>
          </Field>
        </div>
      </form>
    </Drawer>
  );
}
