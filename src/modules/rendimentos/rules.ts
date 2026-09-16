import { AVG_JOB_HOURS, FIRST_INVOICE_MONTH, HEALTH_LIMITS, PRODUCT_COST } from './config';
import { daysIn, isoAdd, monthIdx, MON3, pad, prevMonth, yearOf } from './format';
import type { HealthCheck, HealthLevel, Invoice, InvoiceStatus, IsoDate, MonthKey, Period, RevenueClient, RevenueData, TeamRow, Totals, UnitStats, BillableUnit } from './types';

/* Sazonalidade das horas faturáveis (setembro 2026 = 1). */
const SEASON: Record<string, number[]> = {
  2025: [0.54, 0.5, 0.61, 0.72, 0.79, 0.87, 1.0, 1.06, 0.9, 0.74, 0.58, 0.63],
  2026: [0.6, 0.56, 0.68, 0.8, 0.88, 0.97, 1.12, 1.18, 1.0, 0.8, 0.62, 0.68],
};
/* Horas executadas ÷ horas faturáveis (esperas e reforços no pico de verão). */
const EXEC_RATIO: Record<string, number[]> = {
  2025: [1, 1, 1, 1, 1, 1.02, 1.06, 1.12, 1, 1, 1, 1],
  2026: [1, 1, 1, 1, 1, 1.03, 1.08, 1.15, 1, 1, 1, 1],
};
const season = (mk: MonthKey): number => SEASON[yearOf(mk)]?.[monthIdx(mk)] ?? 1;
const execRatio = (mk: MonthKey): number => EXEC_RATIO[yearOf(mk)]?.[monthIdx(mk)] ?? 1;

/** Meses com dados, de janeiro 2025 até ao último mês fechado. */
export function allMonths(lastMonth: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let y = 2025; y <= Number(yearOf(lastMonth)); y++) for (let m = 1; m <= 12; m++) { const k = `${y}-${pad(m)}`; if (k <= lastMonth) out.push(k); }
  return out;
}
export const monthsOfYear = (year: string, lastMonth: MonthKey): MonthKey[] => allMonths(lastMonth).filter((k) => yearOf(k) === year);
export const periodMonths = (p: Period, lastMonth: MonthKey): MonthKey[] => (p.view === 'year' ? monthsOfYear(p.year, lastMonth) : [p.month]);

/* ------------------------------------------------------------------ */
/* Receita e custos                                                    */
/* ------------------------------------------------------------------ */

/** receita = horas faturáveis × valor/hora + suplemento (só quando os produtos estão incluídos). */
export function unitMonth(client: RevenueClient, unit: BillableUnit, mk: MonthKey) {
  const hours = Math.round(unit.hours * season(mk));
  const jobs = Math.round(hours / AVG_JOB_HOURS);
  const included = client.supply === 'included';
  const supplementRev = included ? jobs * client.supplement : 0;
  return { hours, jobs, supplementRev, revenue: hours * unit.rate + supplementRev, products: included ? jobs * PRODUCT_COST : 0 };
}

export const clientMonthRevenue = (client: RevenueClient, mk: MonthKey): number => client.units.reduce((s, u) => s + unitMonth(client, u, mk).revenue, 0);

/** custo base = horas executadas × valor/hora; deslocações são custo mas não faturação. */
export function teamMonth(data: RevenueData, mk: MonthKey): { billedHours: number; execHours: number; rows: TeamRow[]; base: number; travel: number; total: number } {
  const billedHours = data.clients.reduce((s, c) => s + c.units.reduce((t, u) => t + unitMonth(c, u, mk).hours, 0), 0);
  const execHours = Math.round(billedHours * execRatio(mk));
  let left = execHours;
  const rows = data.team.map((person, i): TeamRow => {
    const hours = i === data.team.length - 1 ? left : Math.round(execHours * person.share);
    left -= hours;
    const travel = Math.round(person.travel * season(mk));
    return { person, hours, base: hours * person.rate, travel, total: hours * person.rate + travel, paid: data.teamPaid[mk]?.[person.id] ?? null };
  });
  const base = rows.reduce((s, r) => s + r.base, 0);
  const travel = rows.reduce((s, r) => s + r.travel, 0);
  return { billedHours, execHours, rows, base, travel, total: base + travel };
}

export function monthTotals(data: RevenueData, mk: MonthKey, today: IsoDate): Totals {
  const team = teamMonth(data, mk);
  let revenue = 0;
  let products = 0;
  let supplementRev = 0;
  for (const c of data.clients) {
    // Faturação arredondada por cliente, como nas faturas.
    revenue += Math.round(clientMonthRevenue(c, mk));
    for (const u of c.units) { const s = unitMonth(c, u, mk); products += s.products; supplementRev += s.supplementRev; }
  }
  const inv = invoiceMoney(data.invoices.filter((x) => x.month === mk), today);
  const simulated = mk >= FIRST_INVOICE_MONTH;
  return {
    months: [mk], hours: team.billedHours, execHours: team.execHours, revenue, supplementRev,
    team: team.total, teamBase: team.base, travel: team.travel, products, costs: team.total + products, margin: revenue - team.total - products,
    received: simulated ? Math.min(revenue, inv.paid) : revenue,
    dueAmount: simulated ? inv.due : revenue,
    receivedDue: simulated ? inv.paidOfDue : revenue,
  };
}

export function sumTotals(list: Totals[]): Totals {
  const keys = ['hours', 'execHours', 'revenue', 'supplementRev', 'team', 'teamBase', 'travel', 'products', 'costs', 'margin', 'received', 'dueAmount', 'receivedDue'] as const;
  const out = { months: list.flatMap((t) => t.months) } as Totals;
  for (const k of keys) out[k] = list.reduce((s, t) => s + t[k], 0);
  return out;
}

export const totalsFor = (data: RevenueData, months: MonthKey[], today: IsoDate): Totals => sumTotals(months.map((mk) => monthTotals(data, mk, today)));

/** Mês anterior, ou os mesmos meses do ano anterior. */
export function comparison(p: Period, lastMonth: MonthKey): { months: MonthKey[]; label: string } {
  const all = allMonths(lastMonth);
  if (p.view === 'year') {
    const n = monthsOfYear(p.year, lastMonth).length;
    const prevYear = String(Number(p.year) - 1);
    return { months: all.filter((k) => yearOf(k) === prevYear).slice(0, n), label: `vs. ${MON3[0]}–${MON3[n - 1]} ${prevYear}` };
  }
  const prev = prevMonth(p.month);
  return { months: all.includes(prev) ? [prev] : [], label: `vs. ${MON3[monthIdx(prev)]} ${yearOf(prev)}` };
}

/** Custos de equipa alocados a cada alojamento pelas horas faturáveis (incluem deslocações). */
export function clientStats(data: RevenueData, client: RevenueClient, months: MonthKey[]): { units: UnitStats[]; total: Omit<UnitStats, 'name'> & { costs: number } } {
  const units: UnitStats[] = client.units.map((u) => ({ name: u.name, rate: u.rate, hours: 0, jobs: 0, supplementRev: 0, revenue: 0, team: 0, products: 0, margin: 0 }));
  for (const mk of months) {
    const team = teamMonth(data, mk);
    const perHour = team.billedHours ? team.total / team.billedHours : 0;
    client.units.forEach((u, i) => {
      const s = unitMonth(client, u, mk);
      const row = units[i];
      row.hours += s.hours; row.jobs += s.jobs; row.supplementRev += s.supplementRev; row.revenue += s.revenue; row.products += s.products; row.team += s.hours * perHour;
    });
  }
  for (const r of units) r.margin = r.revenue - r.team - r.products;
  const sum = (k: keyof Omit<UnitStats, 'name' | 'rate'>) => units.reduce((s, r) => s + r[k], 0);
  const hours = sum('hours');
  const revenue = sum('revenue');
  const supplementRev = sum('supplementRev');
  const teamCost = sum('team');
  const products = sum('products');
  return {
    units,
    total: { rate: hours ? (revenue - supplementRev) / hours : 0, hours, jobs: sum('jobs'), supplementRev, revenue, team: teamCost, products, margin: sum('margin'), costs: teamCost + products },
  };
}

/* ------------------------------------------------------------------ */
/* Faturas                                                             */
/* ------------------------------------------------------------------ */

export function periodsFor(client: RevenueClient, mk: MonthKey): Array<{ from: IsoDate; to: IsoDate; days: number }> {
  const n = daysIn(mk);
  const ranges = client.cycle === 'weekly' ? [[1, 7], [8, 14], [15, 21], [22, n]] : client.cycle === 'custom' ? [[1, 15], [16, n]] : [[1, n]];
  return ranges.map(([a, b]) => ({ from: `${mk}-${pad(a)}`, to: `${mk}-${pad(b)}`, days: b - a + 1 }));
}

export const paidOf = (inv: Invoice): number => inv.payments.reduce((s, p) => s + p.amount, 0);
export const missingOf = (inv: Invoice): number => Math.max(0, inv.amount - paidOf(inv));
export const invoiceStatus = (inv: Invoice, today: IsoDate): InvoiceStatus => (missingOf(inv) <= 0 ? 'paid' : inv.due < today ? 'late' : 'pending');

function invoiceMoney(list: Invoice[], today: IsoDate) {
  const out = { amount: 0, paid: 0, due: 0, paidOfDue: 0 };
  for (const inv of list) {
    const paid = Math.min(inv.amount, paidOf(inv));
    out.amount += inv.amount;
    out.paid += paid;
    if (inv.due < today) { out.due += inv.amount; out.paidOfDue += paid; }
  }
  return out;
}

/** Em atraso primeiro, depois por data de vencimento. */
export function openInvoices(data: RevenueData, today: IsoDate): Invoice[] {
  return data.invoices.filter((inv) => invoiceStatus(inv, today) !== 'paid').sort((a, b) => {
    const la = invoiceStatus(a, today) === 'late';
    const lb = invoiceStatus(b, today) === 'late';
    return la !== lb ? (la ? -1 : 1) : a.due.localeCompare(b.due);
  });
}

/** Recalcula as faturas sem pagamentos de um cliente (ex.: mudou o fornecimento de produtos). */
export function refreshUnpaidInvoices(invoices: Invoice[], client: RevenueClient): Invoice[] {
  return invoices.map((inv) => {
    if (inv.clientId !== client.id || inv.payments.length) return inv;
    const total = Math.round(clientMonthRevenue(client, inv.month));
    const parts = periodsFor(client, inv.month);
    const idx = parts.findIndex((p) => p.from === inv.from);
    const share = (i: number) => Math.round((total * parts[i].days) / daysIn(inv.month));
    const amount = idx === parts.length - 1 ? total - parts.slice(0, idx).reduce((s, _, i) => s + share(i), 0) : share(idx);
    return { ...inv, amount };
  });
}

export function nextInvoiceDate(data: RevenueData, client: RevenueClient): IsoDate {
  const last = data.invoices.filter((x) => x.clientId === client.id).map((x) => x.to).sort().pop();
  if (!last) return '';
  const from = isoAdd(last, 1);
  const parts = periodsFor(client, from.slice(0, 7));
  return isoAdd((parts.find((p) => p.from === from) ?? parts[0]).to, 1);
}

/* ------------------------------------------------------------------ */
/* Saúde financeira                                                    */
/* ------------------------------------------------------------------ */

const level = (value: number, [good, warn]: readonly number[], higherIsBetter: boolean): HealthLevel =>
  higherIsBetter ? (value >= good ? 'ok' : value >= warn ? 'warn' : 'bad') : value <= good ? 'ok' : value <= warn ? 'warn' : 'bad';

/** Considera recebimentos (sobre o valor vencido), custos de equipa, produtos e margem. */
export function financialHealth(t: Totals): { state: HealthLevel; checks: HealthCheck[] } {
  const receipts = t.dueAmount ? (t.receivedDue / t.dueAmount) * 100 : 100;
  const checks: HealthCheck[] = [
    { key: 'receipts', value: receipts, level: level(receipts, HEALTH_LIMITS.receipts, true) },
    { key: 'team', value: (t.team / t.revenue) * 100, level: level((t.team / t.revenue) * 100, HEALTH_LIMITS.team, false) },
    { key: 'products', value: (t.products / t.revenue) * 100, level: level((t.products / t.revenue) * 100, HEALTH_LIMITS.products, false) },
    { key: 'margin', value: (t.margin / t.revenue) * 100, level: level((t.margin / t.revenue) * 100, HEALTH_LIMITS.margin, true) },
  ];
  const state: HealthLevel = checks.some((c) => c.level === 'bad') ? 'bad' : checks.some((c) => c.level === 'warn') ? 'warn' : 'ok';
  return { state, checks };
}

export function clientHealth(data: RevenueData, client: RevenueClient, today: IsoDate, marginPct?: number): HealthLevel {
  const open = data.invoices.filter((inv) => inv.clientId === client.id && invoiceStatus(inv, today) !== 'paid');
  if (open.some((inv) => invoiceStatus(inv, today) === 'late')) return 'bad';
  if (open.some((inv) => inv.payments.length || inv.due <= isoAdd(today, 5))) return 'warn';
  if (marginPct !== undefined && marginPct < HEALTH_LIMITS.margin[1]) return 'warn';
  return 'ok';
}
