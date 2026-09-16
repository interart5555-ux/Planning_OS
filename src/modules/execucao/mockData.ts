import { EXEC_CONFIGS } from './config';
import { addDays, minutesOf, timeOf } from './dates';
import type { DayItem, ExecAppKey, ExecConfig, ExecData, ExecJob, ExecMessage, ExecPerson, ExecStatus, Quantities } from './types';

/** Sexta-feira, 13 de março de 2026 (14 de março é sábado). */
export const DEMO_TODAY = '2026-03-13';
export const DEMO_CLOCK = '08:20';
export const DEMO_PERSON: ExecPerson = { name: 'Dora Martins', firstName: 'Dora', initials: 'DM', team: 'Equipa A' };

interface DemoPlace {
  name: string;
  unit: string;
  address: [string, string];
  note: string;
  qty: Quantities | null;
}

const PLACES: Record<ExecAppKey, DemoPlace[]> = {
  limpezas: [
    { name: 'Rosário 123', unit: 'AP 2 Piso', address: ['Rua do Rosário 123, 2.º Piso', '1200-345 Lisboa'], note: 'Código da caixa das chaves: 4821. Os hóspedes saem até às 08:15.', qty: { lencol: 2, capa: 2, fronha: 4, tbanho: 4, trosto: 4 } },
    { name: 'Avenida Central 45', unit: 'AP 1A', address: ['Avenida Central 45, 1.º A', '1050-012 Lisboa'], note: 'Chave com a porteira (D. Lurdes). Aspirador no armário da entrada.', qty: null },
    { name: 'Jardim das Flores 12', unit: 'AP 3', address: ['Rua Jardim das Flores 12, 3.º', '1300-221 Lisboa'], note: 'Entrada de hóspedes às 16:00: terminar até às 15:30.', qty: { lencol: 3, capa: 3, fronha: 6, tbanho: 6, trosto: 6 } },
    { name: 'Marina View', unit: 'AP 1', address: ['Doca de Alcântara 5', '1350-352 Lisboa'], note: 'Estacionamento na doca, lugar 14.', qty: { lencol: 2, capa: 2, fronha: 4, tbanho: 4, trosto: 4 } },
    { name: 'Costa Azul', unit: 'AP 2', address: ['Rua da Costa 8', '2750-310 Cascais'], note: 'Deixar a chave na caixa do correio.', qty: null },
    { name: 'Sol Nascente', unit: 'AP 3', address: ['Rua do Sol 21', '1100-588 Lisboa'], note: 'Varanda com plantas: regar se estiverem secas.', qty: { lencol: 1, capa: 1, fronha: 2, tbanho: 2, trosto: 2 } },
    { name: 'Boavista 21', unit: 'AP 5', address: ['Rua da Boavista 21, 5.º', '1200-066 Lisboa'], note: 'Elevador em manutenção: subir pelas escadas.', qty: null },
  ],
  formacao: [
    { name: 'Centro Lisboa', unit: 'Sala 2', address: ['Avenida da República 50', '1050-196 Lisboa'], note: 'Pedir o comando do projetor na receção.', qty: { manual: 12, cert: 12, kit: 12 } },
    { name: 'Polo Alcântara', unit: 'Sala 3', address: ['Rua da Cozinha Económica 30', '1300-149 Lisboa'], note: 'A sala só abre às 10:50.', qty: null },
    { name: 'Escola Benfica', unit: 'Auditório', address: ['Estrada de Benfica 529', '1500-078 Lisboa'], note: 'Grupo de 18 formandos. Sessão com avaliação final.', qty: { manual: 18, cert: 18, kit: 6 } },
    { name: 'Centro Lisboa', unit: 'Sala 4', address: ['Avenida da República 50', '1050-196 Lisboa'], note: 'Sessão curta de revisão.', qty: { manual: 10, cert: 0, kit: 10 } },
    { name: 'Polo Oriente', unit: 'Sala 1', address: ['Alameda dos Oceanos 41', '1990-207 Lisboa'], note: 'Estacionamento no piso -1.', qty: null },
    { name: 'Centro Lisboa', unit: 'Laboratório', address: ['Avenida da República 50', '1050-196 Lisboa'], note: 'Ligar os computadores 10 minutos antes.', qty: { manual: 8, cert: 8, kit: 8 } },
    { name: 'Polo Alcântara', unit: 'Sala 1', address: ['Rua da Cozinha Económica 30', '1300-149 Lisboa'], note: 'Sala partilhada: deixar livre às 14:00.', qty: null },
  ],
  manutencao: [
    { name: 'Edifício Aurora', unit: 'Fração B', address: ['Rua Aurora 14', '1100-051 Lisboa'], note: 'Fuga na torneira da cozinha. Moradora em casa.', qty: { lamp: 0, filtro: 1, silicone: 1 } },
    { name: 'Torre Norte', unit: 'Fração 4D', address: ['Avenida D. João II 12', '1990-077 Lisboa'], note: 'Chave na portaria. Pedir cartão de acesso.', qty: null },
    { name: 'Edifício Tejo', unit: 'Fração A', address: ['Rua do Tejo 3', '1200-020 Lisboa'], note: 'Substituir iluminação da entrada.', qty: { lamp: 4, filtro: 0, silicone: 0 } },
    { name: 'Condomínio Parque', unit: 'Garagem', address: ['Rua do Parque 90', '1600-203 Lisboa'], note: 'Portão avariado: entrar pela porta lateral.', qty: { lamp: 6, filtro: 0, silicone: 0 } },
    { name: 'Edifício Aurora', unit: 'Fração F', address: ['Rua Aurora 14', '1100-051 Lisboa'], note: 'Revisão do ar condicionado.', qty: null },
    { name: 'Torre Sul', unit: 'Fração 2C', address: ['Avenida D. João II 20', '1990-078 Lisboa'], note: 'Silicone da banheira.', qty: { lamp: 0, filtro: 0, silicone: 2 } },
    { name: 'Edifício Estrela', unit: 'Fração C', address: ['Rua da Estrela 7', '1200-668 Lisboa'], note: 'Ligar à moradora 10 minutos antes.', qty: null },
  ],
};

function makeJob(config: ExecConfig, id: string, date: string, start: string, end: string, placeIndex: number, status: ExecStatus, team: string): ExecJob {
  const p = PLACES[config.key][placeIndex];
  const job: ExecJob = {
    id, kind: 'job', date, start, end, place: p.name, unit: p.unit, address: p.address, managerNote: p.note, team, status,
    plannedQty: p.qty, qty: p.qty ? { ...p.qty } : null, qtySaved: null,
    prep: config.prep.map(() => false), tasks: config.tasks.map(() => false),
    photos: [], notes: '', issues: [], events: [], startedAt: null, startedAtMs: null, finishedAt: null, durationSec: null,
  };
  if (status === 'confirmed') job.events = [{ id: `${id}-e1`, time: '19:10', text: 'Leitura confirmada', tone: 'neutral', synced: true }];
  if (status === 'done') {
    const startedAt = minutesOf(start) + 3;
    const finishedAt = minutesOf(end) - 6;
    Object.assign(job, {
      prep: job.prep.map(() => true), tasks: job.tasks.map(() => true),
      photos: [0, 1, 2].map((kind) => ({ id: `${id}-ph${kind}`, kind })),
      qtySaved: p.qty ? { ...p.qty } : null,
      startedAt, finishedAt, durationSec: (finishedAt - startedAt) * 60,
      events: [
        { id: `${id}-e1`, time: timeOf(minutesOf(start) - 90), text: 'Leitura confirmada', tone: 'neutral', synced: true },
        { id: `${id}-e2`, time: timeOf(startedAt), text: `${config.job.singular} iniciada`, tone: 'neutral', synced: true },
        { id: `${id}-e3`, time: timeOf(finishedAt), text: 'Conclusão enviada', tone: 'ok', synced: true },
      ],
    });
  }
  return job;
}

export function createDemoExecution(config: ExecConfig = EXEC_CONFIGS.limpezas, today: string = DEMO_TODAY, person: ExecPerson = DEMO_PERSON): ExecData {
  const solo = `${person.team} · ${person.name} (tu)`;
  const duo = `${person.team} · ${person.firstName} e Sara Lopes`;
  const job = (id: string, dayOffset: number, start: string, end: string, place: number, status: ExecStatus, team = solo) =>
    makeJob(config, id, addDays(today, dayOffset), start, end, place, status, team);

  const withIssue = job('j5', -1, '11:00', '13:00', 4, 'done', duo);
  withIssue.issues = [{ id: 'j5-i1', type: 'dano', delayMin: null, description: config.key === 'limpezas' ? 'Mancha no sofá da sala. Não saiu com o produto habitual.' : 'Dano encontrado durante a execução.', withPhoto: true, time: '12:20', synced: true }];
  withIssue.events.splice(2, 0, { id: 'j5-e9', time: '12:20', text: 'Anomalia registada: Dano', tone: 'bad', synced: true });

  const items: DayItem[] = [
    job('j1', 0, '08:30', '10:30', 0, 'planned'),
    job('j2', 0, '11:00', '12:30', 1, 'confirmed', duo),
    job('j3', 0, '13:30', '15:30', 2, 'planned'),
    { id: 'a1', kind: 'absence', date: today, start: '16:00', end: '17:00', reason: 'Consulta médica' },
    job('j4', -1, '08:30', '10:30', 3, 'done'),
    withIssue,
    job('j6', -1, '14:00', '15:30', 5, 'done'),
    job('j7', -2, '09:00', '11:00', 6, 'done'),
    job('j8', -2, '12:00', '14:00', 2, 'done'),
    job('j9', -3, '09:00', '11:00', 0, 'done'),
    job('j10', -4, '10:00', '12:00', 5, 'done'),
    job('j11', -4, '13:00', '14:30', 1, 'done', duo),
    job('j12', 1, '09:00', '11:00', 3, 'planned'),
    job('j13', 1, '12:00', '14:00', 6, 'confirmed', duo),
  ];

  const messages: ExecMessage[] = [
    { id: 'm1', from: 'Sofia Ramos', role: config.manager, day: 'Hoje', time: '07:45', unread: true,
      text: config.key === 'limpezas' ? 'Bom dia! No Rosário 123 os hóspedes saem até às 08:15. Há roupa extra para a lavandaria.' : `Bom dia! Confirma a leitura das tuas ${config.job.plural.toLowerCase()} de hoje, por favor.` },
    { id: 'm2', from: 'Sofia Ramos', role: config.manager, day: 'Ontem', time: '18:10', unread: false,
      text: `Obrigada pelo registo da anomalia em ${PLACES[config.key][4].name}. Vou tratar do assunto.` },
  ];
  return { items, messages };
}
