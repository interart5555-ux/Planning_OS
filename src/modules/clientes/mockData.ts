import type { CalendarPlatform, CalendarStatus, ClientsData, LaundryQty, TeamRef, Unit, UnitCalendar } from './types';

/** Equipas do Módulo 2 usadas como "equipa por defeito" na demonstração. */
export const DEMO_TEAMS: TeamRef[] = [
  { id: 'norte', name: 'Equipa Norte' },
  { id: 'centro', name: 'Equipa Centro' },
  { id: 'sul', name: 'Equipa Sul' },
];

const q = (lencol: number, edredon: number, fronhas: number, banho: number, rosto: number): LaundryQty => ({ lencol, edredon, fronhas, banho, rosto });

const cal = (id: string, platform: CalendarPlatform, url: string, status: CalendarStatus, lastSync: string | null, imported: number): UnitCalendar =>
  ({ id, platform, url, status, lastSync, imported });

const unit = (id: string, name: string, type: string, capacity: number, laundry: LaundryQty | null, calendars: UnitCalendar[] = [], extra: Partial<Unit> = {}): Unit =>
  ({ id, name, type, capacity, status: 'active', teamId: null, hourlyRate: null, laundry, checkoutTime: null, checkinTime: null, calendars, ...extra });

const AIR = 'https://www.airbnb.pt/calendar/ical/';
const BOOK = 'https://admin.booking.com/hotel/hoteladmin/ical.html?t=';

/** Dados da configuração Limpezas. Devolve sempre uma cópia nova. */
export function createDemoData(): ClientsData {
  return {
    clients: [
      { id: 'c1', name: 'Porto Charming Suites', segment: 'Alojamento Local', nif: '510123457', contact: 'Ana Ribeiro', email: 'ana@portocharming.pt', phone: '+351 912 345 678',
        address: 'Rua de Cedofeita 200, 4050-174 Porto', billing: 'Mensal', payment: 'ok', status: 'active', image: 'facade', since: 'fev 2024',
        notes: 'Check-outs até às 11h. Preferem contacto por WhatsApp.' },
      { id: 'c2', name: 'Maternidade 50', segment: 'Gestão de Imóveis', nif: '514876212', contact: 'Carlos Mendes', email: 'carlos@maternidade50.pt', phone: '+351 913 222 111',
        address: 'Rua da Maternidade 50, 4050-371 Porto', billing: 'Quinzenal', payment: 'pending', status: 'active', image: 'facade2', since: 'set 2024', notes: '' },
      { id: 'c3', name: 'Casa da Praia', segment: 'Alojamento Local', nif: '516234986', contact: 'Sofia Costa', email: 'sofia@casadapraia.pt', phone: '+351 914 555 333',
        address: 'Avenida da Praia 12, 4405-693 Vila Nova de Gaia', billing: 'Por serviço', payment: 'ok', status: 'paused', image: 'house', since: 'mai 2025',
        notes: 'Temporada fechada até maio.' },
      { id: 'c4', name: 'Rui Almeida', segment: 'Particular', nif: '', contact: 'Rui Almeida', email: 'rui.almeida@email.pt', phone: '+351 916 204 118',
        address: 'Rua do Passeio Alegre 480, 4150-570 Porto', billing: 'Por serviço', payment: 'ok', status: 'active', image: 'living', since: 'jan 2026',
        notes: 'Apartamento inteiro: o alojamento e a unidade coincidem.' },
    ],
    locations: [
      { id: 'l1', clientId: 'c1', name: 'Rosário 123', address: 'Rua do Rosário 123, 4050-521 Porto', status: 'active', image: 'living',
        serviceIds: ['estadia'], teamId: 'centro', hourlyRate: 18, checkoutTime: '11:00', checkinTime: '15:00', laundryEnabled: true, laundrySetup: q(2, 2, 4, 2, 2),
        accessInstructions: 'Cofre de chaves à entrada · código 4821', notes: 'Aspirador no arrumo do piso 0.',
        units: [
          unit('u1', 'AP 1 Frente', 'Apartamento', 4, q(2, 2, 4, 2, 2), [cal('k1', 'Airbnb', `${AIR}48213377.ics`, 'connected', 'Hoje, 09:12', 9), cal('k2', 'Booking.com', `${BOOK}a81f20`, 'connected', 'Hoje, 09:12', 5)]),
          unit('u2', 'AP 2 Piso', 'Apartamento', 4, q(2, 2, 4, 2, 2), [cal('k3', 'Airbnb', `${AIR}48213391.ics`, 'connected', 'Hoje, 09:12', 7)]),
          unit('u3', 'AP 3 Traseiras', 'Apartamento', 2, q(1, 1, 2, 2, 2), [], { hourlyRate: 20, checkoutTime: '11:00', checkinTime: '16:00' }),
        ] },
      { id: 'l2', clientId: 'c1', name: 'Cedofeita 88', address: 'Rua de Cedofeita 88, 4050-174 Porto', status: 'active', image: 'bedroom',
        serviceIds: ['estadia', 'profunda'], teamId: 'norte', hourlyRate: 16, checkoutTime: '10:00', checkinTime: '15:00', laundryEnabled: false, laundrySetup: q(2, 2, 4, 2, 2), accessInstructions: '', notes: '',
        units: [
          unit('u4', 'Quarto 1', 'Quarto', 2, null, [cal('k4', 'Booking.com', `${BOOK}c77d02`, 'connected', 'Hoje, 08:30', 4)]),
          unit('u5', 'Quarto 2', 'Quarto', 2, null, [cal('k5', 'Airbnb', `${AIR}erro-50211.ics`, 'error', 'Ontem, 18:40', 0)]),
        ] },
      { id: 'l3', clientId: 'c2', name: 'Maternidade 50', address: 'Rua da Maternidade 50, 4050-371 Porto', status: 'active', image: 'facade2',
        serviceIds: ['estadia', 'profunda'], teamId: 'centro', hourlyRate: 16, checkoutTime: '11:00', checkinTime: '15:00', laundryEnabled: true, laundrySetup: q(1, 1, 2, 2, 2), accessInstructions: 'Porteiro das 8h às 20h.', notes: '',
        units: [
          unit('u6', 'T1 Esquerdo', 'Apartamento', 2, q(1, 1, 2, 2, 2), [cal('k6', 'Booking.com', `${BOOK}9f3c21`, 'connected', 'Hoje, 07:55', 6)]),
          unit('u7', 'T1 Direito', 'Apartamento', 2, q(1, 1, 2, 2, 2), [cal('k7', 'Airbnb', `${AIR}39920417.ics`, 'connected', 'Hoje, 07:55', 8), cal('k8', 'Vrbo', 'https://www.vrbo.com/icalendar/erro-7731.ics', 'error', 'Ontem, 18:40', 0)]),
          unit('u8', 'T2 Recuado', 'Apartamento', 4, null, [], { teamId: 'norte' }),
        ] },
      { id: 'l4', clientId: 'c3', name: 'Casa da Praia Granja', address: 'Avenida da Praia 12, 4405-693 Vila Nova de Gaia', status: 'paused', image: 'house',
        serviceIds: ['estadia'], teamId: 'sul', hourlyRate: 20, checkoutTime: '11:00', checkinTime: '16:00', laundryEnabled: false, laundrySetup: q(2, 2, 4, 4, 2), accessInstructions: 'Chave com a vizinha do n.º 14.', notes: '',
        units: [
          unit('u9', 'Quarto Mar', 'Quarto', 2, null, [cal('k9', 'Airbnb', `${AIR}59120044.ics`, 'connected', '10 abr, 08:00', 3)]),
          unit('u10', 'Quarto Jardim', 'Quarto', 3, null),
        ] },
      // Alojamento que coincide com a unidade (apartamento inteiro).
      { id: 'l5', clientId: 'c4', name: 'Foz T1', address: 'Rua do Passeio Alegre 480, 4150-570 Porto', status: 'active', image: 'bedroom',
        serviceIds: ['estadia'], teamId: 'norte', hourlyRate: 17, checkoutTime: '11:00', checkinTime: '15:00', laundryEnabled: false, laundrySetup: q(2, 2, 4, 2, 2), accessInstructions: 'Código da porta 1908.', notes: '',
        units: [unit('u11', 'Foz T1', 'Apartamento', 3, null, [cal('k10', 'Airbnb', `${AIR}61022810.ics`, 'connected', 'Hoje, 09:40', 11), cal('k11', 'Booking.com', `${BOOK}f0a912`, 'connected', 'Hoje, 09:40', 4)])] },
    ],
  };
}
