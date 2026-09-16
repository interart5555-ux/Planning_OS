import { addDays, addMinutes, dayOf } from './dates';
import { occurrences } from './rules';
import type { ApprovalsConfig, ApprovalsPerson, AuditEvent, QtyDiff, RecordIssue, ReopenState, ReviewState, Stamp, WorkRecord } from './types';

export const DEMO_TODAY = '2026-03-13';
export const DEMO_NOW: Stamp = '2026-03-13 11:30';

export const DEMO_PEOPLE: ApprovalsPerson[] = [
  { id: 'mf', name: 'Miguel Ferreira', initials: 'MF', team: 'Equipa Centro', tone: 0 },
  { id: 'sc', name: 'Sofia Costa', initials: 'SC', team: 'Equipa Centro', tone: 1 },
  { id: 'jp', name: 'João Pereira', initials: 'JP', team: 'Equipa Norte', tone: 2 },
  { id: 'la', name: 'Lara Almeida', initials: 'LA', team: 'Equipa Sul', tone: 3 },
  { id: 'br', name: 'Bruno Rodrigues', initials: 'BR', team: 'Equipa Centro', tone: 4 },
  { id: 'ma', name: 'Mariana Alves', initials: 'MA', team: 'Equipa Centro', tone: 5 },
  { id: 'rs', name: 'Rui Santos', initials: 'RS', team: 'Equipa Sul', tone: 1 },
];

export const DEMO_CLIENTS = ['Silva Properties', 'Homeport', 'Porto Stays', 'Blue Wave Rentals', 'City Break', 'Lisbon Homes', 'Atlantic Stay'];

interface RecOptions {
  planned?: Stamp;
  plannedMin?: number;
  missing?: number[];
  qty?: QtyDiff[];
  notes?: string;
  issues?: RecordIssue[];
  late?: boolean;
  review?: ReviewState;
  /** Eventos posteriores à conclusão (aprovação manual, correção, arquivo…). */
  after?: AuditEvent[];
  archive?: boolean;
  reopenTo?: ReopenState;
}

/** Registos de demonstração com o histórico de auditoria completo. */
export function createDemoApprovals(config: ApprovalsConfig, today = DEMO_TODAY, people = DEMO_PEOPLE): WorkRecord[] {
  const cleaning = config.key === 'limpezas';
  const job = config.job.singular;
  const who = config.person.singular;

  const rec = (id: string, place: number, client: number, personId: string, started: Stamp, finished: Stamp, photos: number, o: RecOptions = {}): WorkRecord => {
    const [placeName, unit, city] = config.places[place];
    const person = people.find((p) => p.id === personId) ?? people[0];
    const prev = addDays(dayOf(started), -1);
    const r: WorkRecord = {
      id, place: placeName, unit, city, thumb: place, client: DEMO_CLIENTS[client], personId: person.id, team: person.team,
      planned: o.planned ?? null, plannedMin: o.plannedMin ?? 120, started, finished, photos,
      tasks: config.tasks.map((_, i) => !(o.missing ?? []).includes(i)),
      qty: o.qty ?? [], notes: o.notes ?? '', issues: o.issues ?? [], late: Boolean(o.late),
      review: o.review ?? 'pending', auto: false, reopenTo: null, audit: [],
    };
    r.audit.push({ at: `${prev} 18:00`, who: 'Carla Mendes', role: 'Gestora', action: `${job} planeada`, note: '', tone: '', icon: 'calendar' });
    r.audit.push({ at: `${prev} 20:15`, who: person.name, role: who, action: 'Leitura confirmada', note: '', tone: '', icon: 'book' });
    r.audit.push({ at: started, who: person.name, role: who, action: `${job} iniciada`, note: '', tone: '', icon: 'play' });
    r.issues.forEach((x) => r.audit.push({ at: x.at, who: person.name, role: who, action: `Anomalia registada: ${x.type}`, note: x.text, tone: 'bad', icon: 'triangle' }));
    r.audit.push({ at: finished, who: person.name, role: who, action: 'Conclusão submetida', note: r.notes, tone: '', icon: 'flag' });
    // Regra: completa e sem ocorrências → aprovada automaticamente (vai direta para o histórico).
    if (r.review === 'pending' && !occurrences(r, config).length) {
      r.review = 'approved';
      r.auto = true;
      r.audit.push({ at: `${dayOf(finished)} ${addMinutes(finished, 1)}`, who: 'AppOS', role: 'Automático', action: 'Aprovada automaticamente', note: 'Checklist completa e sem ocorrências.', tone: 'ok', icon: 'shield' });
    }
    r.audit.push(...(o.after ?? []));
    if (o.archive) r.review = 'archived';
    if (o.reopenTo) { r.review = 'reopened'; r.reopenTo = o.reopenTo; }
    return r;
  };

  const T = today;
  const Y = addDays(T, -1);
  const d = (n: number) => addDays(T, -n);

  return [
    rec('r1', 0, 0, 'mf', `${T} 08:12`, `${T} 10:24`, 6, { qty: [{ label: cleaning ? 'Fronhas' : 'Manuais', diff: -1 }], notes: cleaning ? 'Faltava uma fronha. Deixámos uma garrafa de água de boas-vindas.' : 'Tudo conforme.' }),
    rec('r2', 1, 1, 'sc', `${T} 07:30`, `${T} 09:18`, 4, { notes: cleaning ? 'Hóspedes deixaram o apartamento arrumado.' : '' }),
    rec('r3', 2, 2, 'jp', `${Y} 19:05`, `${Y} 21:47`, 3, { late: true, planned: `${Y} 18:00`, notes: cleaning ? 'Os hóspedes saíram só às 19:00, por isso comecei mais tarde.' : 'Comecei mais tarde por falta de acesso.' }),
    rec('r4', 3, 3, 'la', `${Y} 13:40`, `${Y} 16:03`, 6, {
      missing: [5], qty: [{ label: cleaning ? 'Toalhas de banho' : 'Certificados', diff: -2 }], notes: cleaning ? 'Faltavam duas toalhas de banho.' : 'Faltavam dois itens.',
      issues: [{ type: 'Dano', at: `${Y} 15:10`, text: cleaning ? 'Mancha no sofá da sala que não sai com o produto habitual.' : 'Dano encontrado durante a execução.' }],
    }),
    rec('r5', 4, 4, 'br', `${d(3)} 12:05`, `${d(3)} 14:26`, 8),
    rec('r16', 6, 6, 'rs', `${T} 06:55`, `${T} 09:40`, 5, { notes: cleaning ? 'Muita areia no apartamento e na varanda depois da estadia.' : 'Trabalho mais demorado do que o previsto.' }),
    rec('r6', 5, 5, 'ma', `${d(1)} 09:02`, `${d(1)} 11:11`, 4, { issues: [{ type: 'Falta de material', at: `${d(1)} 10:20`, text: cleaning ? 'Sem sacos do lixo no alojamento. Usei os da carrinha.' : 'Material em falta no local.' }], notes: cleaning ? 'Repor sacos do lixo no armário.' : '' }),
    rec('r7', 6, 6, 'rs', `${d(4)} 16:20`, `${d(4)} 18:35`, 7),
    rec('r8', 0, 0, 'mf', `${d(3)} 09:40`, `${d(3)} 12:10`, 6),
    rec('r9', 4, 4, 'br', `${d(2)} 10:00`, `${d(2)} 12:20`, 5, {
      reopenTo: 'Planeado',
      after: [{ at: `${T} 09:40`, who: 'Carla Mendes', role: 'Gestora', action: 'Reaberta · novo estado: Planeado', note: cleaning ? 'Reclamação do hóspede: casa de banho por limpar.' : 'Reclamação do cliente.', tone: 'vio', icon: 'sync' }],
    }),
    rec('r10', 1, 1, 'sc', `${d(5)} 10:15`, `${d(5)} 12:05`, 4),
    rec('r11', 2, 2, 'jp', `${d(7)} 11:00`, `${d(7)} 13:30`, 3, { archive: true, after: [{ at: `${d(1)} 19:00`, who: 'Ana Rocha', role: 'Administradora', action: 'Registo arquivado', note: 'Fecho do mês.', tone: '', icon: 'archive' }] }),
    rec('r12', 3, 3, 'la', `${d(2)} 14:00`, `${d(2)} 16:10`, 2, { review: 'correction', notes: 'Tudo feito.', after: [{ at: `${d(1)} 10:05`, who: 'Carla Mendes', role: 'Gestora', action: 'Correção pedida', note: cleaning ? 'Faltam fotografias da casa de banho e da cozinha.' : 'Faltam evidências.', tone: 'warn', icon: 'edit' }] }),
    rec('r13', 5, 5, 'ma', `${d(8)} 15:30`, `${d(8)} 18:05`, 4, { review: 'approved', late: true, planned: `${d(8)} 14:00`, after: [{ at: `${d(7)} 09:30`, who: 'Carla Mendes', role: 'Gestora', action: 'Conclusão aprovada', note: 'Atraso justificado pelo check-out tardio.', tone: 'ok', icon: 'checkCircle' }] }),
    rec('r14', 6, 6, 'rs', `${d(11)} 09:00`, `${d(11)} 11:15`, 5, { archive: true, after: [{ at: `${d(2)} 19:00`, who: 'Ana Rocha', role: 'Administradora', action: 'Registo arquivado', note: '', tone: '', icon: 'archive' }] }),
    rec('r15', 0, 0, 'mf', `${d(40)} 09:30`, `${d(40)} 11:40`, 6, { archive: true, after: [{ at: `${d(20)} 19:00`, who: 'Ana Rocha', role: 'Administradora', action: 'Registo arquivado', note: '', tone: '', icon: 'archive' }] }),
  ];
}
