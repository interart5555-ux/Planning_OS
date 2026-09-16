import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { roleLabel } from '../format';
import type { TeamDraft } from '../types';
import { validateTeamName } from '../validation';
import { AccessPill } from './CollaboratorsTab';
import { useTeams } from './context';
import { Avatar, Button, Drawer, DrawerTitle, Field, Icon, IconButton, inputBase, inputError, selectBase, selectStyle, Switch } from '../../shared/ui';

function Section({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-5 border-t border-slate-200 pt-5">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h3 className="text-[14.5px] font-semibold">{title}</h3>
        {meta != null && <span className="text-[12.5px] text-slate-500">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

const List = ({ children }: { children: ReactNode }) => (
  <div className="divide-y divide-slate-200 overflow-hidden rounded-[10px] border border-slate-200">{children}</div>
);

/**
 * Criar (teamId null) ou editar uma equipa. As alterações ficam num rascunho
 * e só são aplicadas ao guardar.
 */
export function TeamDrawer({ teamId, focus, onClose }: { teamId: string | null; focus?: 'lead'; onClose: () => void }) {
  const { data, mode, actions } = useTeams();
  const uid = useId();
  const source = teamId ? data.teams.find((t) => t.id === teamId) : undefined;

  const [draft, setDraft] = useState<TeamDraft>(() => ({
    name: source?.name ?? '',
    leadId: source?.leadId ?? '',
    memberIds: source ? data.people.filter((p) => p.teamId === source.id && !p.archived).map((p) => p.id) : [],
    zones: source?.zones ?? [],
    clientIds: source?.clientIds ?? [],
    accommodationIds: source?.accommodationIds ?? [],
    defaultAccommodationIds: source ? data.accommodations.filter((a) => a.defaultTeamId === source.id).map((a) => a.id) : [],
  }));
  const [nameError, setNameError] = useState<string>();
  const [memberToAdd, setMemberToAdd] = useState('');
  const [zoneInput, setZoneInput] = useState('');
  const [accToAdd, setAccToAdd] = useState('');

  const patch = (p: Partial<TeamDraft>) => setDraft((d) => ({ ...d, ...p }));
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const personById = (id: string) => data.people.find((p) => p.id === id);

  const candidates = data.people
    .filter((p) => !p.archived && p.role === 'collab' && !draft.memberIds.includes(p.id))
    .sort((a, b) => Number(Boolean(a.teamId)) - Number(Boolean(b.teamId)) || a.name.localeCompare(b.name, 'pt'));
  const accCandidates = data.accommodations.filter((a) => !draft.accommodationIds.includes(a.id));

  const addMember = () => {
    if (!memberToAdd) return;
    // A primeira pessoa adicionada a uma equipa sem responsável fica responsável.
    patch({ memberIds: [...draft.memberIds, memberToAdd], leadId: draft.leadId || memberToAdd });
    setMemberToAdd('');
  };
  const removeMember = (id: string) =>
    patch({ memberIds: draft.memberIds.filter((x) => x !== id), leadId: draft.leadId === id ? '' : draft.leadId });

  const addZone = () => {
    const zone = zoneInput.trim();
    if (zone && !draft.zones.includes(zone)) patch({ zones: [...draft.zones, zone] });
    setZoneInput('');
  };
  const onZoneKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addZone(); } };

  const addAccommodation = () => {
    const acc = data.accommodations.find((a) => a.id === accToAdd);
    if (!acc) return;
    patch({
      accommodationIds: [...draft.accommodationIds, acc.id],
      // Sem equipa por defeito? Esta passa a ser a sugerida.
      defaultAccommodationIds: acc.defaultTeamId ? draft.defaultAccommodationIds : [...draft.defaultAccommodationIds, acc.id],
    });
    setAccToAdd('');
  };

  const save = () => {
    const error = validateTeamName(draft.name, data.teams, teamId ?? undefined);
    setNameError(error);
    if (error) { document.getElementById(`${uid}-name`)?.focus(); return; }
    actions.saveTeam(teamId, draft);
    onClose();
  };

  return (
    <Drawer
      label={source ? `Detalhe de ${source.name}` : 'Criar equipa'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>{source ? 'Guardar alterações' : 'Criar equipa'}</Button>
        </>
      }
    >
      <DrawerTitle eyebrow={source ? 'Equipa' : 'Nova equipa'} title={source?.name ?? 'Criar equipa'}>
        {source
          ? `${draft.memberIds.length} ${draft.memberIds.length === 1 ? 'elemento' : 'elementos'} · alterações aplicadas ao guardar.`
          : 'Define o nome, os elementos e onde a equipa trabalha.'}
      </DrawerTitle>

      <div className="mt-5 flex flex-col gap-4">
        <Field label="Nome da equipa" htmlFor={`${uid}-name`} error={nameError} errorId={`${uid}-name-e`}>
          <input id={`${uid}-name`} {...(focus !== 'lead' ? { 'data-autofocus': true } : {})} value={draft.name} placeholder="Ex.: Equipa Porto Oriental"
            onChange={(e) => patch({ name: e.target.value })} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? `${uid}-name-e` : undefined}
            className={`${inputBase} ${nameError ? inputError : ''}`} />
        </Field>
        <Field label="Responsável" htmlFor={`${uid}-lead`} help="A responsável tem de pertencer à equipa.">
          <select id={`${uid}-lead`} {...(focus === 'lead' ? { 'data-autofocus': true } : {})} value={draft.leadId} onChange={(e) => patch({ leadId: e.target.value })} className={selectBase} style={selectStyle}>
            <option value="">{draft.memberIds.length ? 'Escolher responsável…' : 'Adiciona elementos primeiro'}</option>
            {draft.memberIds.map((id) => <option key={id} value={id}>{personById(id)?.name}</option>)}
          </select>
        </Field>
      </div>

      <Section title="Elementos" meta={draft.memberIds.length}>
        {draft.memberIds.length > 0 ? (
          <List>
            {draft.memberIds.map((id) => {
              const p = personById(id);
              if (!p) return null;
              const origin = p.teamId && p.teamId !== teamId ? data.teams.find((t) => t.id === p.teamId) : undefined;
              const isLead = draft.leadId === id;
              return (
                <div key={id} className="flex items-center gap-2.5 py-2 pl-3 pr-2">
                  <Avatar name={p.name} highlight={isLead} />
                  <div className="min-w-0 flex-1">
                    <b className="block font-medium">
                      {p.name}
                      {isLead && <span className="ml-1.5 rounded-md bg-slate-100 px-[7px] py-px text-[11px] font-semibold text-slate-600">Responsável</span>}
                    </b>
                    {origin
                      ? <small className="block text-xs text-[#80570a]">Sai da {origin.name} ao guardar</small>
                      : <small className="block text-xs text-slate-500">{roleLabel(p, mode)}</small>}
                  </div>
                  <span className="hidden sm:inline"><AccessPill person={p} /></span>
                  <IconButton icon="x" label={`Remover ${p.name} da equipa`} onClick={() => removeMember(id)} />
                </div>
              );
            })}
          </List>
        ) : (
          <p className="text-[13px] text-slate-500">Ainda sem elementos.</p>
        )}
        <div className="mt-2.5 flex gap-2">
          <select aria-label="Escolher colaborador a adicionar" value={memberToAdd} onChange={(e) => setMemberToAdd(e.target.value)} className={`${selectBase} min-w-0 flex-1`} style={selectStyle}>
            <option value="">Adicionar colaborador…</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {data.teams.find((t) => t.id === p.teamId)?.name ?? 'sem equipa'}</option>
            ))}
          </select>
          <Button icon="plus" onClick={addMember} disabled={!memberToAdd}>Adicionar</Button>
        </div>
      </Section>

      <Section title="Zonas" meta={draft.zones.length}>
        <div className="flex flex-wrap gap-1.5">
          {draft.zones.length === 0 && <span className="text-[13px] text-slate-500">Sem zonas associadas.</span>}
          {draft.zones.map((z) => (
            <span key={z} className="inline-flex h-[26px] items-center gap-1.5 rounded-[7px] border border-slate-200 bg-slate-50 pl-2.5 pr-1 text-[12.5px] text-slate-600">
              <Icon name="pin" className="h-[13px] w-[13px] text-slate-400" />{z}
              <button type="button" aria-label={`Remover ${z}`} onClick={() => patch({ zones: draft.zones.filter((x) => x !== z) })} className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-red-700">
                <Icon name="x" className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2.5 flex gap-2">
          <input aria-label="Nova zona" placeholder="Ex.: Paranhos" value={zoneInput} onChange={(e) => setZoneInput(e.target.value)} onKeyDown={onZoneKey} className={`${inputBase} min-w-0 flex-1`} />
          <Button icon="plus" onClick={addZone} disabled={!zoneInput.trim()}>Adicionar</Button>
        </div>
      </Section>

      <Section title="Clientes" meta={`${draft.clientIds.length} selecionados`}>
        <div className="flex flex-wrap gap-2">
          {data.clients.map((c) => {
            const on = draft.clientIds.includes(c.id);
            return (
              <button key={c.id} type="button" aria-pressed={on} onClick={() => patch({ clientIds: toggle(draft.clientIds, c.id) })}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-600 aria-pressed:border-[#17643e] aria-pressed:bg-[#e9f4ee] aria-pressed:text-[#17643e]">
                <Icon name={on ? 'check' : 'building'} className="h-3.5 w-3.5" />{c.name}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Alojamentos" meta={draft.accommodationIds.length}>
        {draft.accommodationIds.length > 0 ? (
          <List>
            {draft.accommodationIds.map((id) => {
              const acc = data.accommodations.find((a) => a.id === id);
              if (!acc) return null;
              const isDefault = draft.defaultAccommodationIds.includes(id);
              const otherDefault = !isDefault && acc.defaultTeamId && acc.defaultTeamId !== teamId
                ? data.teams.find((t) => t.id === acc.defaultTeamId) : undefined;
              return (
                <div key={id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 py-2 pl-3 pr-2">
                  <span className="grid h-7 w-7 place-items-center rounded-[7px] bg-slate-100 text-slate-600"><Icon name="home" className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <b className="block font-medium">{acc.name}</b>
                    <small className="block text-xs text-slate-500">{acc.zone}{otherDefault && ` · Por defeito: ${otherDefault.name}`}</small>
                  </div>
                  <Switch small label="Por defeito" checked={isDefault} onChange={() => patch({ defaultAccommodationIds: toggle(draft.defaultAccommodationIds, id) })} />
                  <IconButton icon="x" label={`Remover ${acc.name}`}
                    onClick={() => patch({ accommodationIds: draft.accommodationIds.filter((x) => x !== id), defaultAccommodationIds: draft.defaultAccommodationIds.filter((x) => x !== id) })} />
                </div>
              );
            })}
          </List>
        ) : (
          <p className="text-[13px] text-slate-500">Sem alojamentos associados.</p>
        )}
        {accCandidates.length > 0 && (
          <div className="mt-2.5 flex gap-2">
            <select aria-label="Escolher alojamento" value={accToAdd} onChange={(e) => setAccToAdd(e.target.value)} className={`${selectBase} min-w-0 flex-1`} style={selectStyle}>
              <option value="">Associar alojamento…</option>
              {accCandidates.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.zone}</option>)}
            </select>
            <Button icon="plus" onClick={addAccommodation} disabled={!accToAdd}>Associar</Button>
          </div>
        )}
        <p className="mt-2.5 flex gap-2 text-[12.5px] text-slate-600">
          <Icon name="star" className="mt-px h-[15px] w-[15px] text-[#17643e]" />
          <span>A <b>equipa por defeito</b> é sugerida automaticamente quando se agenda uma limpeza nesse alojamento. Cada alojamento tem só uma.</span>
        </p>
      </Section>
    </Drawer>
  );
}
