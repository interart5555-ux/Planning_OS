import { applyMove, locationById, productById } from './rules';
import type { Category, Glyph, InventoryData, MeasureUnit, MoveOrigin, MoveType, Owner } from './types';

/** Sexta-feira, 13 de março de 2026, 10:24 (a mesma data da Execução e das Aprovações). */
export const DEMO_TODAY = '2026-03-13';
export const DEMO_NOW = '10:24';
export const DEMO_MANAGER = 'Carla Mendes';
export const DEMO_COLLAB = 'Dora Martins';

type ProductRow = [string, string, Category, Glyph, MeasureUnit, Owner, string, number, number, number, string];
/* [id, nome, categoria, ícone, unidade, proprietário, local, stock atual, mínimo, custo médio, observações] */
const PRODUCTS: ProductRow[] = [
  ['p1', 'Desinfetante multiusos 5L', 'Produtos de limpeza', 'jug', 'un', 'company', 'L1', 24, 10, 6.9, ''],
  ['p2', 'Papel higiénico (12 rolos)', 'Consumíveis', 'roll', 'emb', 'company', 'L1', 8, 30, 5.2, 'Consumo alto no verão.'],
  ['p3', 'Pano microfibras azul', 'Consumíveis', 'cloth', 'un', 'company', 'L1', 12, 30, 0.85, ''],
  ['p4', 'Luva nitrilo M (cx 100)', 'EPIs', 'glove', 'cx', 'company', 'L1', 45, 20, 7.5, ''],
  ['p5', 'Detergente WC 1L', 'Produtos de limpeza', 'bottle', 'un', 'company', 'L1', 18, 10, 2.4, ''],
  ['p6', 'Saco do lixo 50L (rolo)', 'Consumíveis', 'bag', 'rolo', 'company', 'L1', 26, 20, 1.95, ''],
  ['p7', 'Esfregão verde', 'Consumíveis', 'sponge', 'un', 'company', 'L1', 40, 30, 0.45, ''],
  ['p8', 'Aspirador portátil', 'Equipamentos', 'vacuum', 'un', 'company', 'L1', 2, 1, 89, 'Revisão anual em outubro.'],
  ['p9', 'Mopa com balde', 'Equipamentos', 'mop', 'un', 'company', 'L1', 3, 2, 24.9, ''],
  ['p10', 'Desinfetante multiusos 1L', 'Produtos de limpeza', 'spray', 'un', 'company', 'L2', 4, 6, 1.95, ''],
  ['p11', 'Papel de cozinha (rolo duplo)', 'Consumíveis', 'roll', 'emb', 'company', 'L1', 0, 10, 3.1, ''],
  ['p12', 'Máscara FFP2', 'EPIs', 'mask', 'un', 'company', 'L1', 60, 40, 0.35, ''],
  ['p13', 'Ambientador spray', 'Outros', 'spray', 'un', 'company', 'L2', 5, 4, 2.8, ''],
  ['p25', 'Pano microfibras azul', 'Consumíveis', 'cloth', 'un', 'company', 'L2', 14, 10, 0.85, ''],
  ['p26', 'Saco do lixo 30L (rolo)', 'Consumíveis', 'bag', 'rolo', 'company', 'L2', 6, 4, 1.6, ''],
  ['p14', 'Detergente neutro 5L', 'Produtos de limpeza', 'jug', 'un', 'client', 'L4', 3, 10, 0, 'Marca escolhida pelo cliente.'],
  ['p15', 'Saco do lixo 50L (rolo)', 'Consumíveis', 'bag', 'rolo', 'client', 'L4', 5, 20, 0, ''],
  ['p16', 'Papel higiénico (12 rolos)', 'Consumíveis', 'roll', 'emb', 'client', 'L4', 6, 4, 0, ''],
  ['p17', 'Detergente loiça 1L', 'Produtos de limpeza', 'bottle', 'un', 'client', 'L4', 2, 3, 0, ''],
  ['p18', 'Detergente chão neutro 5L', 'Produtos de limpeza', 'jug', 'un', 'client', 'L5', 3, 15, 0, ''],
  ['p19', 'Esfregão verde', 'Consumíveis', 'sponge', 'un', 'client', 'L5', 28, 20, 0, ''],
  ['p20', 'Desinfetante WC 1L', 'Produtos de limpeza', 'bottle', 'un', 'client', 'L5', 4, 15, 0, ''],
  ['p21', 'Pano microfibras azul', 'Consumíveis', 'cloth', 'un', 'client', 'L5', 12, 10, 0, ''],
  ['p22', 'Papel higiénico (4 rolos)', 'Consumíveis', 'roll', 'emb', 'client', 'L6', 1, 3, 0, ''],
  ['p23', 'Detergente multiusos 750 ml', 'Produtos de limpeza', 'spray', 'un', 'client', 'L6', 0, 2, 0, 'O cliente prefere produtos ecológicos.'],
  ['p24', 'Pastilhas máquina da loiça', 'Consumíveis', 'box', 'cx', 'client', 'L6', 2, 1, 0, ''],
];

type MoveRow = [string, string, MoveType, MoveOrigin, number, number | null, string, string, string];
/* [data e hora, produto, tipo, origem, quantidade, custo unitário, responsável, nota, limpeza] */
const MOVES: MoveRow[] = [
  ['2026-02-16T09:10', 'p2', 'Consumo em limpeza', 'Equipa de limpeza', -6, null, DEMO_COLLAB, '', 'Casa da Praia Granja · Quarto Mar'],
  ['2026-02-20T15:40', 'p14', 'Reposição do cliente', 'Cliente', 4, null, DEMO_MANAGER, 'Entregue pelo Carlos Mendes', ''],
  ['2026-02-24T11:05', 'p18', 'Consumo em limpeza', 'Equipa de limpeza', -2, null, 'Bruno Rocha', '', 'Rosário 123 · AP 1 Frente'],
  ['2026-02-27T16:30', 'p3', 'Perda ou desperdício', 'Equipa de limpeza', -4, null, 'Bruno Rocha', 'Panos danificados na máquina de lavar', ''],
  ['2026-03-02T10:15', 'p22', 'Consumo em limpeza', 'Equipa de limpeza', -2, null, DEMO_COLLAB, '', 'Foz T1'],
  ['2026-03-03T09:45', 'p20', 'Reposição do cliente', 'Cliente', 10, null, DEMO_MANAGER, 'Entregue no alojamento', ''],
  ['2026-03-04T12:20', 'p16', 'Reposição do cliente', 'Cliente', 6, null, DEMO_MANAGER, '', ''],
  ['2026-03-05T11:20', 'p15', 'Consumo em limpeza', 'Equipa de limpeza', -5, null, DEMO_COLLAB, '', 'Maternidade 50 · T1 Direito'],
  ['2026-03-06T14:00', 'p20', 'Consumo em limpeza', 'Equipa de limpeza', -3, null, 'Bruno Rocha', '', 'Rosário 123 · AP 1 Frente'],
  ['2026-03-07T10:40', 'p23', 'Consumo em limpeza', 'Equipa de limpeza', -1, null, DEMO_COLLAB, 'Frasco terminou a meio da limpeza', 'Foz T1'],
  ['2026-03-08T16:03', 'p21', 'Consumo em limpeza', 'Equipa de limpeza', -3, null, 'Bruno Rocha', '', 'Rosário 123 · AP 3 Traseiras'],
  ['2026-03-09T09:30', 'p20', 'Consumo em limpeza', 'Equipa de limpeza', -3, null, 'Bruno Rocha', '', 'Rosário 123 · AP 2 Piso'],
  ['2026-03-09T17:10', 'p12', 'Ajuste manual', 'Ajuste manual', -5, null, DEMO_MANAGER, 'Contagem mensal', ''],
  ['2026-03-10T09:18', 'p1', 'Compra', 'Encomenda', 12, 6.9, DEMO_MANAGER, 'EC-2026-012', ''],
  ['2026-03-10T09:18', 'p5', 'Compra', 'Encomenda', 10, 2.4, DEMO_MANAGER, 'EC-2026-012', ''],
  ['2026-03-10T09:18', 'p7', 'Compra', 'Encomenda', 20, 0.45, DEMO_MANAGER, 'EC-2026-012', ''],
  ['2026-03-11T08:05', 'p3', 'Transferência', 'Transferência', -6, null, DEMO_MANAGER, 'De Armazém principal para Carrinha 1', ''],
  ['2026-03-11T08:05', 'p25', 'Transferência', 'Transferência', 6, null, DEMO_MANAGER, 'De Armazém principal para Carrinha 1', ''],
  ['2026-03-11T14:12', 'p2', 'Consumo em limpeza', 'Equipa de limpeza', -4, null, DEMO_COLLAB, '', 'Casa da Praia Granja · Quarto Jardim'],
  ['2026-03-12T10:24', 'p14', 'Consumo em limpeza', 'Equipa de limpeza', -2, null, DEMO_COLLAB, '', 'Maternidade 50 · T1 Esquerdo'],
  ['2026-03-12T12:50', 'p10', 'Consumo em limpeza', 'Equipa de limpeza', -2, null, DEMO_COLLAB, '', 'Cedofeita 88 · Quarto 1'],
  ['2026-03-12T13:05', 'p13', 'Consumo em limpeza', 'Equipa de limpeza', -1, null, DEMO_COLLAB, '', 'Cedofeita 88 · Quarto 1'],
];

/** Dados de demonstração (Limpezas, Porto). Os alojamentos usam os ids do módulo Clientes. Devolve sempre uma cópia nova. */
export function createDemoInventory(): InventoryData {
  const d: InventoryData = {
    version: 1,
    seq: { p: 40, l: 10, m: 1, r: 10, o: 15, s: 4 },
    clients: [
      { id: 'c1', name: 'Porto Charming Suites' },
      { id: 'c2', name: 'Maternidade 50' },
      { id: 'c3', name: 'Casa da Praia' },
      { id: 'c4', name: 'Rui Almeida' },
    ],
    stays: [
      { id: 'l1', clientId: 'c1', name: 'Rosário 123', address: 'Rua do Rosário 123, 4050-521 Porto', units: ['AP 1 Frente', 'AP 2 Piso', 'AP 3 Traseiras'], supply: 'client', locId: 'L5', supplement: 0, productIds: [] },
      { id: 'l2', clientId: 'c1', name: 'Cedofeita 88', address: 'Rua de Cedofeita 88, 4050-174 Porto', units: ['Quarto 1', 'Quarto 2'], supply: 'company', locId: 'L2', supplement: 2.5, productIds: ['p10', 'p13', 'p25', 'p26'] },
      { id: 'l3', clientId: 'c2', name: 'Maternidade 50', address: 'Rua da Maternidade 50, 4050-371 Porto', units: ['T1 Esquerdo', 'T1 Direito', 'T2 Recuado'], supply: 'client', locId: 'L4', supplement: 0, productIds: [] },
      { id: 'l4', clientId: 'c3', name: 'Casa da Praia Granja', address: 'Avenida da Praia 12, 4405-693 Vila Nova de Gaia', units: ['Quarto Mar', 'Quarto Jardim'], supply: 'company', locId: 'L1', supplement: 3, productIds: ['p1', 'p2', 'p5'] },
      { id: 'l5', clientId: 'c4', name: 'Foz T1', address: 'Rua do Passeio Alegre 480, 4150-570 Porto', units: ['Foz T1'], supply: 'client', locId: 'L6', supplement: 0, productIds: [] },
      // Local da demonstração da Execução (Passo 5): produtos da empresa, na carrinha.
      { id: 'x1', clientId: 'c1', name: 'Avenida Central 45', address: 'Avenida Central 45, 1.º A', units: ['AP 1A'], supply: 'company', locId: 'L2', supplement: 2.5, productIds: ['p10', 'p13', 'p25', 'p26'] },
    ],
    locations: [
      { id: 'L1', name: 'Armazém principal', type: 'Armazém', owner: 'company', clientId: '', stayId: '', unit: '', detail: 'Rua da Indústria 120, 4100-120 Porto', access: 'Chave no escritório · alarme 2580', active: true },
      { id: 'L2', name: 'Carrinha 1', type: 'Carrinha', owner: 'company', clientId: '', stayId: '', unit: '', detail: 'AA-12-BC · Equipa Centro', access: 'Chave com a supervisora', active: true },
      { id: 'L3', name: 'Armazém secundário', type: 'Armazém', owner: 'company', clientId: '', stayId: '', unit: '', detail: 'Rua Soares dos Reis 45, Vila Nova de Gaia', access: '', active: true },
      { id: 'L4', name: 'Maternidade 50 · Armário de limpeza', type: 'Alojamento', owner: 'client', clientId: 'c2', stayId: 'l3', unit: '', detail: 'Rua da Maternidade 50 · Armário do piso 0', access: 'Pedir a chave ao porteiro (8h–20h)', active: true },
      { id: 'L5', name: 'Rosário 123 · Arrumo do piso 0', type: 'Alojamento', owner: 'client', clientId: 'c1', stayId: 'l1', unit: '', detail: 'Rua do Rosário 123 · Arrumo do piso 0', access: 'Cofre de chaves à entrada · código 4821', active: true },
      { id: 'L6', name: 'Foz T1 · Despensa', type: 'Alojamento', owner: 'client', clientId: 'c4', stayId: 'l5', unit: '', detail: 'Rua do Passeio Alegre 480 · Despensa', access: 'Código da porta 1908', active: true },
    ],
    products: [],
    moves: [],
    requests: [],
    suppliers: [
      { id: 's1', name: 'Higiluz Distribuição', contact: 'Joana Lima', phone: '+351 223 456 780', email: 'encomendas@higiluz.pt', categories: ['Consumíveis', 'Produtos de limpeza'], productIds: ['p2', 'p3', 'p6', 'p7', 'p11', 'p25', 'p26'], active: true },
      { id: 's2', name: 'ProClean Norte', contact: 'Ricardo Sousa', phone: '+351 229 110 245', email: 'ricardo@proclean-norte.pt', categories: ['Produtos de limpeza', 'Equipamentos', 'Outros'], productIds: ['p1', 'p5', 'p8', 'p9', 'p10', 'p13'], active: true },
      { id: 's3', name: 'SegurEPI', contact: 'Marta Faria', phone: '+351 252 301 998', email: 'geral@segurepi.pt', categories: ['EPIs'], productIds: ['p4', 'p12'], active: true },
      { id: 's4', name: 'Limpa Mais Lda.', contact: 'Hugo Pires', phone: '+351 220 998 112', email: 'hugo@limpamais.pt', categories: ['Consumíveis'], productIds: [], active: false },
    ],
    orders: [
      { id: 'EC-2026-010', supplierId: 's2', created: '2026-02-12', expected: '2026-02-20', status: 'cancelled', receivedAt: '', note: 'Fornecedor sem stock', lines: [{ productId: 'p9', qty: 2, price: 24.9 }] },
      { id: 'EC-2026-012', supplierId: 's2', created: '2026-03-04', expected: '2026-03-10', status: 'received', receivedAt: '2026-03-10', note: '', lines: [{ productId: 'p1', qty: 12, price: 6.9 }, { productId: 'p5', qty: 10, price: 2.4 }, { productId: 'p7', qty: 20, price: 0.45 }] },
      { id: 'EC-2026-013', supplierId: 's2', created: '2026-03-11', expected: '2026-03-18', status: 'ordered', receivedAt: '', note: '', lines: [{ productId: 'p10', qty: 12, price: 1.95 }, { productId: 'p13', qty: 6, price: 2.8 }] },
      { id: 'EC-2026-014', supplierId: 's1', created: '2026-03-09', expected: '2026-03-16', status: 'transit', receivedAt: '', note: '', lines: [{ productId: 'p2', qty: 40, price: 5.2 }, { productId: 'p11', qty: 20, price: 3.1 }, { productId: 'p3', qty: 30, price: 0.85 }] },
      { id: 'EC-2026-015', supplierId: 's3', created: '2026-03-12', expected: '2026-03-20', status: 'draft', receivedAt: '', note: '', lines: [{ productId: 'p12', qty: 40, price: 0.35 }] },
    ],
  };

  for (const r of PRODUCTS) {
    const loc = locationById(d, r[6])!;
    d.products.push({ id: r[0], name: r[1], category: r[2], glyph: r[3], unit: r[4], owner: r[5], clientId: loc.clientId, stayId: loc.stayId, unitName: loc.unit, locId: r[6], stock: r[7], min: r[8], cost: r[5] === 'company' ? r[9] : 0, notes: r[10], active: true });
  }

  // Stock inicial = stock atual − movimentos seguintes; depois reaplica o histórico (custo e stock resultante coerentes).
  const sorted = [...MOVES].sort((a, b) => a[0].localeCompare(b[0]));
  const finalState = d.products.map((p) => ({ id: p.id, stock: p.stock, cost: p.cost }));
  for (const p of d.products) {
    p.stock -= sorted.filter((m) => m[1] === p.id).reduce((s, m) => s + m[4], 0);
    d.moves.push({ id: `m${d.seq.m}`, seq: d.seq.m++, at: '2026-02-01T08:00', productId: p.id, type: 'Ajuste manual', origin: 'Stock inicial', owner: p.owner, clientId: p.clientId, stayId: p.stayId, locId: p.locId, qty: p.stock, result: p.stock, cost: 0, user: DEMO_MANAGER, note: 'Contagem inicial do inventário', job: '' });
  }
  for (const m of sorted) applyMove(d, m[1], { at: m[0], type: m[2], origin: m[3], qty: m[4], unitCost: m[5], user: m[6], note: m[7], job: m[8] });
  // Os custos médios de demonstração são os indicados na tabela; as reposições automáticas dos dados de exemplo são substituídas pelas abaixo.
  for (const f of finalState) { const p = productById(d, f.id)!; p.cost = f.cost; p.stock = f.stock; }
  d.requests = [
    { id: 'r1', productId: 'p14', qty: 8, source: 'Sugestão da colaboradora', by: DEMO_COLLAB, date: '2026-03-12', note: 'Só resta um garrafão e meio.', status: 'open' },
    { id: 'r2', productId: 'p20', qty: 11, source: 'Alerta de stock baixo', by: 'Sistema', date: '2026-03-09', note: '', status: 'open' },
    { id: 'r3', productId: 'p23', qty: 3, source: 'Falta registada na limpeza', by: DEMO_COLLAB, date: '2026-03-07', note: 'Frasco terminou a meio da limpeza.', status: 'open' },
    { id: 'r4', productId: 'p2', qty: 40, source: 'Alerta de stock baixo', by: 'Sistema', date: '2026-03-09', note: '', status: 'open' },
    { id: 'r5', productId: 'p10', qty: 12, source: 'Alerta de stock baixo', by: 'Sistema', date: '2026-03-12', note: '', status: 'open' },
  ];
  d.seq.r = 10;
  return d;
}
