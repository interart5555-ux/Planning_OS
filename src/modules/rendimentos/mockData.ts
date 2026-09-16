import { FIRST_INVOICE_MONTH } from './config';
import { daysIn, isoAdd, pad } from './format';
import { allMonths, clientMonthRevenue, periodsFor } from './rules';
import type { BillingCycle, MonthKey, RevenueConfig, RevenueData, SupplyModel } from './types';

export const DEMO_TODAY = '2026-10-06';
export const DEMO_LAST_MONTH: MonthKey = '2026-09';

interface ClientSeed {
  id: string;
  cycle: BillingCycle;
  terms: number;
  supply: SupplyModel;
  supplement: number;
  contact: [string, string, string];
  /** [valor/hora, horas faturáveis em setembro]. */
  units: Array<[number, number]>;
}

const CLIENTS: ClientSeed[] = [
  { id: 'pcs', cycle: 'monthly', terms: 15, supply: 'included', supplement: 2.5, contact: ['Marta Couto', 'financeiro@portocharming.pt', '+351 912 345 678'], units: [[20, 56], [20, 52], [20, 40], [20, 32], [22, 20]] },
  { id: 'rib', cycle: 'weekly', terms: 7, supply: 'client', supplement: 2.5, contact: ['Rui Moreira', 'contas@ribeira-apartments.pt', '+351 913 222 104'], units: [[19, 64], [19, 48], [19, 40]] },
  { id: 'cle', cycle: 'monthly', terms: 20, supply: 'included', supplement: 3, contact: ['Inês Lacerda', 'ines@clerigosview.pt', '+351 926 410 330'], units: [[21, 56], [21, 44]] },
  { id: 'boa', cycle: 'custom', terms: 20, supply: 'client', supplement: 2.5, contact: ['Paulo Reis', 'pagamentos@boavistaflats.pt', '+351 917 880 512'], units: [[18, 60], [18, 52], [18, 36]] },
  { id: 'foz', cycle: 'monthly', terms: 15, supply: 'included', supplement: 2, contact: ['Helena Sá', 'helena@fozguesthouse.pt', '+351 934 501 278'], units: [[22, 48], [22, 40]] },
  { id: 'ali', cycle: 'weekly', terms: 7, supply: 'included', supplement: 2.5, contact: ['Tiago Brandão', 'tiago@aliadosresidence.pt', '+351 915 632 901'], units: [[20, 72], [20, 56]] },
  { id: 'tri', cycle: 'monthly', terms: 30, supply: 'client', supplement: 2.5, contact: ['Sofia Neves', 'sofia@trindadestudios.pt', '+351 938 114 650'], units: [[19, 44], [19, 40], [19, 32]] },
  { id: 'msq', cycle: 'monthly', terms: 15, supply: 'included', supplement: 2.5, contact: ['André Pinto', 'ap@marketsquare.pt', '+351 919 770 043'], units: [[20, 50], [20, 38]] },
];

const TEAM: Array<{ id: string; name: string; rate: number; share: number; travel: number; lead?: boolean; tone: number }> = [
  { id: 'as', name: 'Ana Silva', rate: 9.5, share: 0.15, travel: 150, tone: 0 },
  { id: 'br', name: 'Bruno Rocha', rate: 9.5, share: 0.14, travel: 100, tone: 2 },
  { id: 'sl', name: 'Sara Lopes', rate: 11.5, share: 0.13, travel: 170, lead: true, tone: 4 },
  { id: 'df', name: 'Diogo Ferreira', rate: 9.5, share: 0.145, travel: 130, tone: 1 },
  { id: 'ip', name: 'Inês Pereira', rate: 10, share: 0.14, travel: 120, tone: 3 },
  { id: 'jo', name: 'João Oliveira', rate: 9.5, share: 0.145, travel: 100, tone: 5 },
  { id: 'mf', name: 'Marta Fonseca', rate: 9.5, share: 0.15, travel: 130, tone: 0 },
];

/** Pagamentos à equipa ainda por fazer. */
const TEAM_PENDING: Record<MonthKey, string[]> = { '2026-09': ['sl', 'df', 'jo'] };
/** Situações de demonstração: fatura em atraso e pagamento parcial. */
const UNPAID: Record<string, 'late' | 'partial'> = { 'msq|2026-08-01': 'late', 'ali|2026-09-15': 'partial' };
const PAID_EARLY: Record<string, string> = { 'foz|2026-09-01': '2026-10-02' };

export function createDemoRevenue(config: RevenueConfig, today = DEMO_TODAY, lastMonth = DEMO_LAST_MONTH): RevenueData {
  const data: RevenueData = {
    clients: CLIENTS.map((c, i) => ({
      id: c.id, name: config.clientNames[i], cycle: c.cycle, terms: c.terms, supply: c.supply, supplement: c.supplement,
      contact: { name: c.contact[0], email: c.contact[1], phone: c.contact[2] },
      units: c.units.map(([rate, hours], j) => ({ name: config.unitNames[i][j], rate, hours })),
    })),
    team: TEAM.map((p) => ({ id: p.id, name: p.name, role: p.lead ? config.roleLead : config.roleBase, rate: p.rate, share: p.share, travel: p.travel, tone: p.tone })),
    invoices: [],
    teamPaid: {},
  };

  for (const mk of allMonths(lastMonth)) {
    data.teamPaid[mk] = {};
    for (const p of data.team) {
      if (!(TEAM_PENDING[mk] ?? []).includes(p.id)) data.teamPaid[mk][p.id] = isoAdd(`${mk}-${pad(daysIn(mk))}`, 5);
    }
  }

  let seq = 61;
  for (const mk of allMonths(lastMonth).filter((m) => m >= FIRST_INVOICE_MONTH)) {
    data.clients.forEach((c, ci) => {
      const total = Math.round(clientMonthRevenue(c, mk));
      const parts = periodsFor(c, mk);
      let left = total;
      parts.forEach((p, pi) => {
        const amount = pi === parts.length - 1 ? left : Math.round((total * p.days) / daysIn(mk));
        left -= amount;
        const due = isoAdd(p.to, c.terms);
        const key = `${c.id}|${p.from}`;
        const invoice = { id: `FAC/2026/${String(seq++).padStart(3, '0')}`, clientId: c.id, month: mk, from: p.from, to: p.to, issued: isoAdd(p.to, 1), due, amount, payments: [] as RevenueData['invoices'][number]['payments'] };
        if (UNPAID[key] === 'partial') invoice.payments.push({ date: isoAdd(due, -1), amount: Math.round(amount * 0.4), method: 'Transferência bancária', note: 'Pagamento parcial.', by: 'Carla Mendes' });
        else if (PAID_EARLY[key]) invoice.payments.push({ date: PAID_EARLY[key], amount, method: 'Transferência bancária', note: '', by: 'Carla Mendes' });
        else if (!UNPAID[key] && due < today) invoice.payments.push({ date: isoAdd(due, -((seq + ci) % 5)), amount, method: ci % 4 === 3 ? 'Numerário' : 'Transferência bancária', note: '', by: ci % 2 ? 'Ana Rocha' : 'Carla Mendes' });
        data.invoices.push(invoice);
      });
    });
  }
  return data;
}
