import { useId, useState, type FormEvent, type ReactNode } from 'react';
import {
  ABSENCE_STATUS_META,
  ABSENCE_TYPE_LABEL,
  ACCESS_META,
  absenceDuration,
  absenceHours,
  formatDay,
  formatRange,
  formatRate,
  isFeminine,
  isUpcoming,
  relativeDay,
  roleLabel,
  teamLabel,
  usesPin,
} from '../format';
import { demoUpcomingJobs } from '../mockData';
import type { FieldErrors, Person, PersonEditInput } from '../types';
import { canDeletePerson, validatePerson } from '../validation';
import { AccessPill, usePersonMenu } from './CollaboratorsTab';
import { useTeams } from './context';
import { Avatar, Button, Drawer, Field, Icon, type IconName, inputBase, inputError, Pill, selectBase, selectStyle, TextLink } from '../../shared/ui';

function Box({ icon, title, action, children }: { icon: IconName; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-3.5 rounded-xl border border-slate-200 px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2">
        <Icon name={icon} className="h-[17px] w-[17px] text-[#17643e]" />
        <h3 className="flex-1 text-[14.5px] font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const Row = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 border-t border-slate-200 py-2.5 first-of-type:border-0">{children}</div>
);
const Sub = ({ children }: { children: ReactNode }) => <span className="block text-[12.5px] text-slate-500">{children}</span>;

export function PersonDrawer({ personId, onClose }: { personId: string; onClose: () => void }) {
  const { data, mode, sendingIds, actions, openAbsence } = useTeams();
  const buildMenu = usePersonMenu();
  const [tab, setTab] = useState<'overview' | 'data'>('overview');
  const [editing, setEditing] = useState(false);

  const person = data.people.find((p) => p.id === personId);
  if (!person) return null; // eliminado enquanto aberto

  // Reutiliza as mesmas regras do menu "⋯" para os botões da ficha.
  const menu = buildMenu(person).filter((i): i is Exclude<typeof i, 'separator'> => i !== 'separator' && i.label !== 'Ver detalhe' && i.label !== 'Registar ausência');
  const sending = sendingIds.includes(person.id);
  const method = usesPin(person) ? 'Entrada com PIN de 4 dígitos.' : 'Entrada com credenciais completas (email e palavra-passe).';
  const accessText = person.archived
    ? 'Colaborador arquivado. Os registos anteriores estão preservados.'
    : person.access === 'sent'
      ? `Email enviado para ${person.email}${person.sentAt ? ` às ${person.sentAt}` : ''}. Aguarda ativação.`
      : ACCESS_META[person.access].description;

  return (
    <Drawer label={`Detalhe de ${person.name}`} onClose={onClose}>
      <div className="flex items-center gap-4 pr-9">
        <Avatar name={person.name} size="lg" />
        <div>
          <h2 className="text-[21px] font-bold tracking-tight">{person.name}</h2>
          <p className="mt-0.5 text-slate-600">{roleLabel(person, mode)}</p>
          <p className="text-[13px] text-slate-500">{teamLabel(person, data.teams)}</p>
        </div>
      </div>

      <div className="mt-4">
        <AccessPill person={person} />
        <p className="mt-1.5 text-[13px] text-slate-600">{accessText} {method}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" icon="edit" onClick={() => { setTab('data'); setEditing(true); }}>Editar</Button>
        {menu.map((item) => {
          const isSend = item.icon === 'send';
          return (
            <Button
              key={item.label}
              size="sm"
              icon={item.icon}
              loading={isSend && sending}
              variant={item.danger ? 'danger' : isSend && person.access === 'none' ? 'soft' : 'outline'}
              onClick={item.onSelect}
            >
              {isSend && sending ? 'A enviar…' : item.label}
            </Button>
          );
        })}
      </div>

      <div role="tablist" className="mt-5 flex gap-1 border-b border-slate-200">
        {(['overview', 'data'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setEditing(false); }}
            className="-mb-px border-b-2 border-transparent px-3 py-2 font-medium text-slate-600 aria-selected:border-[#17643e] aria-selected:font-semibold aria-selected:text-[#17643e]"
          >
            {t === 'overview' ? 'Visão geral' : 'Dados pessoais'}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview person={person} onRegisterAbsence={() => { onClose(); openAbsence(person.id); }} />}
      {tab === 'data' && !editing && <PersonalData person={person} method={method} />}
      {tab === 'data' && editing && (
        <EditForm
          person={person}
          onCancel={() => setEditing(false)}
          onSave={(input) => { actions.updatePerson(person.id, input); setEditing(false); }}
        />
      )}

      {!person.archived && (person.access === 'sent' || person.access === 'failed') && (
        <div className="mt-5 rounded-[10px] border border-dashed border-slate-300 px-3.5 py-3 text-[12.5px] text-slate-500">
          <b className="font-semibold text-slate-700">Simulação</b> — sem envio real de emails nesta fase.
          <div className="mt-1.5 flex flex-wrap gap-3.5">
            {person.access === 'sent' ? (
              <>
                <TextLink onClick={() => actions.simulateAccess(person.id, 'active')}>Simular ativação da conta</TextLink>
                <TextLink onClick={() => actions.simulateAccess(person.id, 'failed')}>Simular falha no envio</TextLink>
              </>
            ) : (
              <span>Usa “Reenviar acesso” para voltar a tentar.</span>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Overview({ person: p, onRegisterAbsence }: { person: Person; onRegisterAbsence: () => void }) {
  const { data, today, actions } = useTeams();
  const jobs = demoUpcomingJobs(p, data, today);
  const absences = data.absences.filter((a) => a.personId === p.id && isUpcoming(a, today)).sort((a, b) => a.start.localeCompare(b.start));
  const admin = p.role === 'admin';
  return (
    <>
      <Box icon="calendar" title="Próximos trabalhos" action={jobs.length > 0 && <TextLink onClick={() => actions.notify('A agenda completa fica disponível no módulo Planeamento.')}>Ver todos</TextLink>}>
        {jobs.length ? jobs.map((j) => (
          <Row key={j.date + j.time}>
            <div>{relativeDay(j.date, today)}<Sub>{j.time}</Sub></div>
            <div>{j.place}<Sub>{j.teamName}</Sub></div>
          </Row>
        )) : <p className="py-1 text-[13px] text-slate-500">{admin ? 'Sem limpezas atribuídas diretamente.' : 'Sem trabalhos agendados.'}</p>}
      </Box>

      <Box icon="clock" title="Próximas ausências" action={!admin && !p.archived && <TextLink onClick={onRegisterAbsence}>Registar</TextLink>}>
        {absences.length ? absences.map((a) => (
          <Row key={a.id}>
            <div>{formatRange(a.start, a.end)}<Sub>{absenceHours(a)} · {absenceDuration(a)}</Sub></div>
            <div className="text-right">{ABSENCE_TYPE_LABEL[a.type]}<span className="mt-1 block"><Pill tone={ABSENCE_STATUS_META[a.status].tone}>{ABSENCE_STATUS_META[a.status].label}</Pill></span></div>
          </Row>
        )) : <p className="py-1 text-[13px] text-slate-500">Sem ausências registadas.</p>}
      </Box>

      <Box icon="user" title="Condições">
        <Row><span className="text-slate-500">Valor/hora</span><span className="text-right tabular-nums">{formatRate(p.hourlyRate)}</span></Row>
        <Row><span className="text-slate-500">Histórico operacional</span><span className="text-right tabular-nums">{p.completedJobs ? `${p.completedJobs} limpezas concluídas` : 'Sem registos'}</span></Row>
        <Row><span className="text-slate-500">Na empresa desde</span><span className="text-right">{formatDay(p.since, true)}</span></Row>
      </Box>

      <div className="mt-3.5 flex gap-2.5 rounded-[10px] bg-slate-50 px-3.5 py-3 text-[13px] text-slate-600">
        <Icon name={admin ? 'shield' : canDeletePerson(p) ? 'trash' : 'archive'} className="mt-px h-[17px] w-[17px] text-slate-500" />
        <span>
          {admin && `Conta ${isFeminine(p.name) ? 'da administradora' : 'do administrador'} da empresa. Não pode ser arquivada nem eliminada.`}
          {!admin && !canDeletePerson(p) && <>Tem histórico operacional, por isso só pode ser <b>arquivado</b>: os registos anteriores ficam preservados.</>}
          {!admin && canDeletePerson(p) && <>Sem histórico operacional: pode ser <b>eliminado</b> definitivamente.</>}
        </span>
      </div>
    </>
  );
}

function PersonalData({ person, method }: { person: Person; method: string }) {
  const { data, mode } = useTeams();
  const rows: Array<[string, string]> = [
    ['Nome completo', person.name],
    ['Email', person.email],
    ['Telefone', person.phone || '—'],
    ['Função', roleLabel(person, mode)],
    ['Equipa', teamLabel(person, data.teams)],
    ['Valor/hora', formatRate(person.hourlyRate)],
    ['Na empresa desde', formatDay(person.since, true)],
    ['Entrada na aplicação', method],
  ];
  return (
    <dl className="mt-2">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-0.5 border-t border-slate-200 py-2.5 first:border-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-3">
          <dt className="text-slate-500">{k}</dt>
          <dd className="break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function EditForm({ person, onCancel, onSave }: { person: Person; onCancel: () => void; onSave: (input: PersonEditInput) => void }) {
  const { data, mode } = useTeams();
  const uid = useId();
  const [v, setV] = useState<PersonEditInput>({
    name: person.name,
    email: person.email,
    phone: person.phone,
    role: person.role,
    teamId: person.teamId ?? '',
    hourlyRate: person.hourlyRate == null ? '' : String(person.hourlyRate).replace('.', ','),
  });
  const [errors, setErrors] = useState<FieldErrors<'name' | 'email' | 'hourlyRate'>>({});
  const set = <K extends keyof PersonEditInput>(k: K, value: PersonEditInput[K]) => setV((s) => ({ ...s, [k]: value }));
  const f = isFeminine(person.name);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validatePerson(v, data.people, person.id);
    setErrors(found);
    if (Object.keys(found).length === 0) onSave(v);
  };

  return (
    <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
      <Field label="Nome completo" htmlFor={`${uid}-name`} error={errors.name} errorId={`${uid}-name-e`}>
        <input id={`${uid}-name`} data-autofocus autoFocus value={v.name} onChange={(e) => set('name', e.target.value)} aria-invalid={Boolean(errors.name)} className={`${inputBase} ${errors.name ? inputError : ''}`} />
      </Field>
      <Field label="Email" htmlFor={`${uid}-email`} error={errors.email} errorId={`${uid}-email-e`}>
        <input id={`${uid}-email`} type="email" value={v.email} onChange={(e) => set('email', e.target.value)} aria-invalid={Boolean(errors.email)} className={`${inputBase} ${errors.email ? inputError : ''}`} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone" htmlFor={`${uid}-phone`}>
          <input id={`${uid}-phone`} inputMode="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} className={inputBase} />
        </Field>
        <Field label="Valor/hora" optional htmlFor={`${uid}-rate`} error={errors.hourlyRate}>
          <div className="relative">
            <input id={`${uid}-rate`} inputMode="decimal" value={v.hourlyRate} onChange={(e) => set('hourlyRate', e.target.value)} aria-invalid={Boolean(errors.hourlyRate)} className={`${inputBase} pr-12 ${errors.hourlyRate ? inputError : ''}`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">€/h</span>
          </div>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Função" htmlFor={`${uid}-role`}>
          {person.role === 'admin' ? (
            <input id={`${uid}-role`} value={roleLabel(person, mode)} disabled className={`${inputBase} bg-slate-50 text-slate-500`} />
          ) : (
            <select id={`${uid}-role`} value={v.role} onChange={(e) => set('role', e.target.value as PersonEditInput['role'])} className={selectBase} style={selectStyle}>
              <option value="collab">{f ? 'Colaboradora' : 'Colaborador'}</option>
              {(mode === 'separate' || person.role === 'manager') && <option value="manager">{f ? 'Gestora' : 'Gestor'}</option>}
            </select>
          )}
        </Field>
        <Field label="Equipa" htmlFor={`${uid}-team`}>
          <select id={`${uid}-team`} value={v.teamId} onChange={(e) => set('teamId', e.target.value)} className={selectBase} style={selectStyle}>
            <option value="">{person.role === 'collab' ? 'Sem equipa' : 'Todas as equipas'}</option>
            {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2.5">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary">Guardar alterações</Button>
      </div>
    </form>
  );
}
