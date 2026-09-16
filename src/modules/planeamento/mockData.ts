import { jobHours } from './rules';
import type { Job, JobSource, JobStatus, PlanPerson, PlanTeam, PlanningData, StayTimes } from './types';

/** Data e hora fixas de demonstração (dia de referência da imagem). */
export const DEMO_TODAY = '2026-03-12';
export const DEMO_NOW = '10:15';

export const DEMO_TEAMS: PlanTeam[] = [
  { id: 'A', name: 'Equipa A' },
  { id: 'B', name: 'Equipa B' },
];

export const DEMO_PEOPLE: PlanPerson[] = [
  { id: 'dora', name: 'Dora', initials: 'DO', teamId: 'A', capacity: 8 },
  { id: 'paula', name: 'Paula', initials: 'PA', teamId: 'B', capacity: 8 },
  { id: 'marta', name: 'Marta', initials: 'MA', teamId: 'A', capacity: 8 },
  { id: 'sara', name: 'Sara', initials: 'SR', teamId: 'B', capacity: 6 },
];

const stay = (checkout: string, checkin: string): StayTimes => ({ checkout, checkin });

/** `stayTimes`: horário por defeito da unidade (em Clientes: Local → Unidade). */
const UNITS: Record<string, { location: string; unit: string; typology: string; teamId: string; stayTimes: StayTimes }> = {
  marina: { location: 'Marina View', unit: 'AP 1', typology: 'T1 · 2 hóspedes', teamId: 'A', stayTimes: stay('10:00', '15:00') },
  sol: { location: 'Sol Nascente', unit: 'AP 3', typology: 'T3 · 6 hóspedes', teamId: 'A', stayTimes: stay('11:00', '16:00') },
  costa: { location: 'Costa Azul', unit: 'AP 2', typology: 'T2 · 4 hóspedes', teamId: 'B', stayTimes: stay('10:00', '15:00') },
  rossio: { location: 'Rossio 78', unit: 'AP 1', typology: 'T1 · 2 hóspedes', teamId: 'B', stayTimes: stay('11:00', '15:00') },
  jardim: { location: 'Jardim do Mar', unit: 'AP 4', typology: 'T2 · 4 hóspedes', teamId: 'B', stayTimes: stay('11:00', '15:00') },
  atlantico: { location: 'Atlântico', unit: 'AP 2', typology: 'T2 · 4 hóspedes', teamId: 'B', stayTimes: stay('11:00', '16:00') },
  rosario: { location: 'Rosário 123', unit: 'AP 2 Piso', typology: 'T2 · 4 hóspedes', teamId: 'B', stayTimes: stay('11:00', '15:00') },
  liberdade: { location: 'Liberdade 12', unit: 'AP 3', typology: 'T1 · 2 hóspedes', teamId: 'A', stayTimes: stay('11:00', '15:00') },
  boavista: { location: 'Boavista 21', unit: 'Quarto 1', typology: 'Quarto · 2 hóspedes', teamId: 'A', stayTimes: stay('10:00', '14:00') },
  vista: { location: 'Vista Alegre', unit: 'AP 2', typology: 'T2 · 4 hóspedes', teamId: 'A', stayTimes: stay('11:00', '15:00') },
};

/** Devolve sempre uma cópia nova (permite "repor dados"). */
export function createDemoPlanning(): PlanningData {
  const jobs: Job[] = [];
  let seq = 0;
  const add = (date: string, key: string, start: string, end: string, people: string[], status: JobStatus, source: JobSource, platform: string | null = null, checkin = false) => {
    const { stayTimes, ...u } = UNITS[key];
    const hours = jobHours({ start, end });
    jobs.push({
      id: `j${(seq += 1)}`, date, start, end, ...u,
      assignees: people.map((personId) => ({ personId, hours })),
      status, source, platform,
      stayDate: date, checkin, stayTimes: { ...stayTimes },
    });
  };

  // 12 de março — dia de referência (checkin = entrada no mesmo dia → prioridade alta)
  add(DEMO_TODAY, 'marina', '10:00', '12:00', ['dora'], 'planned', 'ical', 'Airbnb', true);
  add(DEMO_TODAY, 'sol', '12:30', '14:30', ['dora'], 'confirmed', 'ical', 'Airbnb', true);
  add(DEMO_TODAY, 'costa', '10:00', '12:00', ['paula'], 'in_progress', 'ical', 'Booking.com');
  add(DEMO_TODAY, 'rossio', '12:30', '14:30', ['paula'], 'unpublished', 'manual');
  add(DEMO_TODAY, 'jardim', '14:30', '16:30', ['paula'], 'planned', 'ical', 'Airbnb', true); // termina depois da entrada (15:00)
  add(DEMO_TODAY, 'atlantico', '17:00', '19:00', ['paula'], 'planned', 'ical', 'Booking.com'); // só saída: flexível
  add(DEMO_TODAY, 'boavista', '10:00', '11:30', ['marta'], 'late', 'ical', 'Airbnb', true);
  add(DEMO_TODAY, 'rosario', '11:00', '13:00', [], 'unpublished', 'ical', 'Airbnb', true);
  add(DEMO_TODAY, 'liberdade', '14:00', '16:00', [], 'unpublished', 'ical', 'Booking.com');

  // Restantes dias da semana (9 a 15 de março)
  const pool = ['marina', 'sol', 'costa', 'rossio', 'jardim', 'atlantico', 'liberdade', 'boavista', 'vista', 'rosario'];
  const slots: Array<[string, string]> = [['11:00', '13:00'], ['13:00', '15:00'], ['15:00', '17:00']];
  [9, 10, 11, 13, 14, 15].forEach((day, di) => {
    const date = `2026-03-${String(day).padStart(2, '0')}`;
    DEMO_PEOPLE.forEach((p, pi) => {
      if (p.id === 'sara' && day === 13) return; // folga
      if (p.id === 'dora' && day >= 14) return; // férias
      const n = ((di + pi) % 3) + 1;
      for (let k = 0; k < n; k += 1) {
        const key = pool[(di * 3 + pi * 2 + k) % pool.length];
        const status: JobStatus = day < 12 ? 'done' : k === 0 && day === 13 ? 'confirmed' : (di + k) % 3 === 0 ? 'unpublished' : 'planned';
        const manual = key === 'rosario';
        add(date, key, slots[k][0], slots[k][1], [p.id], status, manual ? 'manual' : 'ical', manual ? null : 'Airbnb', !manual && k < 2 && (di + pi + k) % 3 === 0);
      }
    });
    if (day >= 13) add(date, pool[(di + 5) % pool.length], '12:00', '14:00', [], 'unpublished', 'ical', 'Airbnb', di % 2 === 0);
  });

  return {
    jobs,
    absences: [
      { id: 'a1', personId: 'dora', type: 'Férias', start: '2026-03-12', end: '2026-03-12', allDay: false, from: '15:00', to: '19:00' },
      { id: 'a2', personId: 'paula', type: 'Consulta médica', start: '2026-03-12', end: '2026-03-12', allDay: false, from: '18:30', to: '19:30' },
      { id: 'a3', personId: 'sara', type: 'Folga', start: '2026-03-13', end: '2026-03-13', allDay: true },
      { id: 'a4', personId: 'dora', type: 'Férias', start: '2026-03-14', end: '2026-03-16', allDay: true },
    ],
  };
}

/** Saídas (check-outs) por dia. Março de 2026 segue a imagem; outros meses são gerados. */
const MARCH_2026 = [3, 5, 6, 4, 7, 6, 8, 10, 4, 6, 8, 8, 6, 7, 12, 6, 7, 6, 8, 9, 7, 6, 9, 7, 8, 7, 6, 8, 9, 7, 4];

export function demoCheckouts(year: number, month: number): number[] {
  if (year === 2026 && month === 2) return [...MARCH_2026];
  const days = new Date(year, month + 1, 0).getDate();
  let seed = year * 12 + month;
  return Array.from({ length: days }, (_, i) => {
    seed = (seed * 9301 + 49297) % 233280;
    const weekday = new Date(year, month, i + 1).getDay();
    return 3 + Math.floor((seed / 233280) * 5) + (weekday === 0 || weekday === 6 ? 3 : 0);
  });
}
