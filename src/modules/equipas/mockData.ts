import { addDays } from './format';
import type { AccessStatus, Person, PersonRole, TeamsData } from './types';

/**
 * Data fixa de demonstração, para que as ausências de abril e maio
 * apareçam como "próximas". Substituir por hoje quando houver dados reais.
 */
export const DEMO_TODAY = '2026-04-13';

function person(
  id: string,
  name: string,
  email: string,
  role: PersonRole,
  teamId: string | null,
  access: AccessStatus,
  hourlyRate: number | null,
  completedJobs: number,
  phone: string,
  since: string,
): Person {
  return { id, name, email, role, teamId, access, hourlyRate, completedJobs, phone, since, archived: false, sentAt: null };
}

/** Devolve sempre uma cópia nova (permite "repor dados"). */
export function createDemoData(): TeamsData {
  return {
    people: [
      person('paula', 'Paula Santos', 'paula.santos@brilho.pt', 'admin', null, 'active', null, 0, '912 345 678', '2023-02-01'),
      person('dora', 'Dora Martins', 'dora.martins@email.pt', 'collab', 'norte', 'active', 9.5, 184, '913 220 481', '2023-05-15'),
      person('luis', 'Luís Carvalho', 'luis.carvalho@email.pt', 'collab', 'norte', 'sent', 8.5, 23, '915 004 312', '2025-11-03'),
      person('andreia', 'Andreia Ferreira', 'andreia.ferreira@email.pt', 'collab', 'norte', 'active', 8.5, 96, '936 118 204', '2024-03-11'),
      person('tiago', 'Tiago Moreira', 'tiago.moreira@email.pt', 'collab', 'norte', 'active', 8, 41, '926 441 090', '2025-01-20'),
      person('sofia', 'Sofia Lopes', 'sofia.lopes@email.pt', 'collab', 'norte', 'sent', 8, 12, '918 770 213', '2026-02-02'),
      person('joao', 'João Rocha', 'joao.rocha@email.pt', 'collab', 'centro', 'active', 9.5, 152, '912 887 610', '2023-06-01'),
      person('nena', 'Nena Costa', 'nena.costa@email.pt', 'collab', 'centro', 'sent', 8.5, 0, '934 551 872', '2026-03-30'),
      person('pedro', 'Pedro Costa', 'pedro.costa@email.pt', 'collab', 'centro', 'failed', 8, 64, '917 302 118', '2024-09-09'),
      person('teresa', 'Teresa Matos', 'teresa.matos@email.pt', 'collab', 'centro', 'active', 8.5, 77, '963 210 457', '2024-04-22'),
      person('ana', 'Ana Silva', 'ana.silva@email.pt', 'collab', 'sul', 'active', 9.5, 131, '914 663 205', '2023-09-18'),
      person('maria', 'Maria Fernandes', 'maria.fernandes@email.pt', 'collab', 'sul', 'suspended', 8.5, 58, '912 095 334', '2024-06-03'),
      person('catia', 'Cátia Teixeira', 'catia.teixeira@email.pt', 'collab', 'sul', 'active', 8, 35, '939 400 128', '2025-04-07'),
      person('rui', 'Rui Ferreira', 'rui.ferreira@email.pt', 'collab', 'sul', 'none', 8, 9, '927 118 546', '2026-01-12'),
      person('rita', 'Rita Silva', 'rita.silva@email.pt', 'collab', null, 'none', 8, 0, '911 203 667', '2026-04-06'),
    ],
    teams: [
      { id: 'norte', name: 'Equipa Norte', leadId: 'dora', zones: ['Matosinhos', 'Foz do Douro'], clientIds: ['clinica', 'tejo'], accommodationIds: ['al-foz', 'al-mat'] },
      { id: 'centro', name: 'Equipa Centro', leadId: 'joao', zones: ['Porto – Baixa', 'Boavista'], clientIds: ['flores', 'ribeira'], accommodationIds: ['al-rib', 'al-bai'] },
      { id: 'sul', name: 'Equipa Sul', leadId: 'ana', zones: ['Vila Nova de Gaia'], clientIds: ['atlantico'], accommodationIds: ['al-gaia'] },
    ],
    clients: [
      { id: 'clinica', name: 'Clínica Saúde+' },
      { id: 'tejo', name: 'Escritórios Tejo' },
      { id: 'flores', name: 'Condomínio das Flores' },
      { id: 'ribeira', name: 'Hotel Ribeira' },
      { id: 'atlantico', name: 'Ginásio Atlântico' },
      { id: 'aurora', name: 'Colégio Aurora' },
    ],
    accommodations: [
      { id: 'al-foz', name: 'AL Foz Mar T2', zone: 'Foz do Douro', defaultTeamId: 'norte' },
      { id: 'al-mat', name: 'AL Matosinhos Praia T1', zone: 'Matosinhos', defaultTeamId: 'norte' },
      { id: 'al-rib', name: 'AL Ribeira Loft', zone: 'Porto – Ribeira', defaultTeamId: 'centro' },
      { id: 'al-bai', name: 'AL Baixa Studio', zone: 'Porto – Baixa', defaultTeamId: 'centro' },
      { id: 'al-gaia', name: 'AL Gaia Vista T1', zone: 'Vila Nova de Gaia', defaultTeamId: 'sul' },
      { id: 'al-bol', name: 'AL Bolhão Suite', zone: 'Porto – Bolhão', defaultTeamId: null },
    ],
    absences: [
      { id: 'a1', personId: 'ana', type: 'ferias', start: '2026-04-22', end: '2026-04-25', allDay: true, from: '', to: '', status: 'pending', note: '' },
      { id: 'a2', personId: 'luis', type: 'formacao', start: '2026-05-15', end: '2026-05-15', allDay: false, from: '10:00', to: '12:00', status: 'approved', note: 'Formação de produtos' },
      { id: 'a3', personId: 'maria', type: 'ferias', start: '2026-05-12', end: '2026-05-16', allDay: true, from: '', to: '', status: 'pending', note: '' },
      { id: 'a4', personId: 'joao', type: 'consulta', start: '2026-05-18', end: '2026-05-18', allDay: false, from: '14:00', to: '18:00', status: 'approved', note: '' },
      { id: 'a5', personId: 'nena', type: 'indisponibilidade', start: '2026-04-20', end: '2026-04-20', allDay: false, from: '08:00', to: '12:00', status: 'approved', note: '' },
      { id: 'a6', personId: 'dora', type: 'folga', start: '2026-04-24', end: '2026-04-24', allDay: true, from: '', to: '', status: 'approved', note: '' },
      { id: 'a7', personId: 'dora', type: 'ferias', start: '2026-03-10', end: '2026-03-14', allDay: true, from: '', to: '', status: 'approved', note: '' },
      { id: 'a8', personId: 'pedro', type: 'baixa', start: '2026-02-03', end: '2026-02-05', allDay: true, from: '', to: '', status: 'approved', note: '' },
      { id: 'a9', personId: 'sofia', type: 'consulta', start: '2026-04-02', end: '2026-04-02', allDay: false, from: '09:00', to: '11:00', status: 'approved', note: '' },
      { id: 'a10', personId: 'tiago', type: 'folga', start: '2026-03-27', end: '2026-03-27', allDay: true, from: '', to: '', status: 'rejected', note: '' },
      { id: 'a11', personId: 'andreia', type: 'formacao', start: '2026-01-22', end: '2026-01-22', allDay: false, from: '09:00', to: '13:00', status: 'approved', note: '' },
    ],
  };
}

export interface DemoJob {
  date: string;
  time: string;
  place: string;
  teamName: string;
}

/**
 * Próximos trabalhos fictícios, derivados dos clientes e alojamentos da
 * equipa. Salta dias cobertos por ausências de dia inteiro. Será substituído
 * pelos dados do módulo Planeamento.
 */
export function demoUpcomingJobs(person: Person, data: TeamsData, today: string): DemoJob[] {
  const team = person.teamId ? data.teams.find((t) => t.id === person.teamId) : undefined;
  if (!team || person.archived || person.role !== 'collab') return [];

  const places = [
    ...team.clientIds.map((id) => data.clients.find((c) => c.id === id)?.name),
    ...team.accommodationIds.map((id) => data.accommodations.find((a) => a.id === id)?.name),
  ].filter((p): p is string => Boolean(p));
  if (places.length === 0) return [];

  const slots: Array<[number, string]> = [[1, '08:00 – 12:00'], [3, '09:00 – 13:00'], [4, '14:00 – 17:00'], [5, '08:00 – 12:00']];
  return slots
    .map(([offset, time], i) => ({ date: addDays(today, offset), time, place: places[i % places.length], teamName: team.name }))
    .filter(
      (job) =>
        !data.absences.some(
          (a) => a.personId === person.id && a.status !== 'rejected' && a.allDay && job.date >= a.start && job.date <= a.end,
        ),
    )
    .slice(0, 3);
}
