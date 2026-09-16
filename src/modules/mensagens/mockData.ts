import type { MessageClient, MessageJob, MessagesData, Message, Person } from './types';

/** Sexta-feira, 13 de março de 2026, 10:24 (a mesma data dos restantes módulos). */
export const DEMO_TODAY = '2026-03-13';
export const DEMO_YESTERDAY = '2026-03-12';
export const DEMO_NOW = '10:24';

export const PEOPLE: Record<string, Person> = {
  carla: { id: 'carla', name: 'Carla Mendes', role: 'Gestora', tone: 3, online: true },
  ana: { id: 'ana', name: 'Ana Rocha', role: 'Administradora', tone: 4 },
  dora: { id: 'dora', name: 'Dora Martins', role: 'Colaboradora', tone: 0, online: true },
  rita: { id: 'rita', name: 'Rita Almeida', role: 'Colaboradora', tone: 1 },
  bruno: { id: 'bruno', name: 'Bruno Rocha', role: 'Colaborador', tone: 2 },
  sara: { id: 'sara', name: 'Sara Lopes', role: 'Supervisora', tone: 4, online: true },
  carlos: { id: 'carlos', name: 'Carlos Mendes', role: 'Cliente · Maternidade 50', tone: 5, clientId: 'c2' },
  sofia: { id: 'sofia', name: 'Sofia Costa', role: 'Cliente · Casa da Praia', tone: 1, clientId: 'c3' },
  ribeiro: { id: 'ribeiro', name: 'Ana Ribeiro', role: 'Cliente · Porto Charming Suites', tone: 2, clientId: 'c1' },
};

export const CLIENTS: MessageClient[] = [
  { id: 'c1', name: 'Porto Charming Suites', contact: 'ribeiro' },
  { id: 'c2', name: 'Maternidade 50', contact: 'carlos' },
  { id: 'c3', name: 'Casa da Praia', contact: 'sofia' },
  { id: 'c4', name: 'Rui Almeida', contact: '' },
];

export const JOBS: MessageJob[] = [
  { id: 'j1', title: 'Limpeza — Maternidade 50 · T1 Esquerdo', clientId: 'c2', place: 'Maternidade 50', unit: 'T1 Esquerdo', address: 'Rua da Maternidade 50, Porto', date: DEMO_TODAY, time: '09:00 – 11:00', status: 'Em curso', personId: 'dora', shot: 'bed' },
  { id: 'j2', title: 'Limpeza — Rosário 123 · AP 2 Piso', clientId: 'c1', place: 'Rosário 123', unit: 'AP 2 Piso', address: 'Rua do Rosário 123, Porto', date: DEMO_TODAY, time: '13:00 – 15:00', status: 'Por iniciar', personId: 'dora', shot: 'living' },
  { id: 'j3', title: 'Limpeza — Cedofeita 88 · Quarto 1', clientId: 'c1', place: 'Cedofeita 88', unit: 'Quarto 1', address: 'Rua de Cedofeita 88, Porto', date: DEMO_YESTERDAY, time: '09:00 – 11:00', status: 'Concluída', personId: 'rita', shot: 'bath' },
];

const msg = (id: string, from: string, at: string, text: string, extra: Partial<Message> = {}): Message =>
  ({ id, from, at, text, images: [], files: [], state: 'read', ...extra });

/** Conversas, mensagens e avisos de demonstração. Devolve sempre uma cópia nova. */
export function createDemoMessages(): MessagesData {
  const T = DEMO_TODAY, Y = DEMO_YESTERDAY;
  return {
    version: 1,
    seq: { c: 20, m: 200, n: 20 },
    conversations: [
      { id: 'cv1', kind: 'equipa', title: 'Dora Martins', clientId: '', participants: ['carla', 'dora'], jobId: 'j1', priority: '', resolved: false, messages: [
        msg('m1', 'dora', `${Y}T17:40`, 'Boa tarde! Amanhã começo pela Maternidade 50, certo?'),
        msg('m2', 'carla', `${Y}T17:52`, 'Sim, das 09:00 às 11:00. A chave está no porteiro.'),
        msg('m3', 'dora', `${T}T10:18`, 'Já terminei a limpeza da Maternidade 50 · T1 Esquerdo. Deixo algumas fotos. ✅', { images: ['bed', 'bath', 'towels'] }),
        msg('m4', 'carla', `${T}T10:24`, 'Ótimo trabalho, Dora! 🙌\nPodes fechar a tarefa no planeamento.'),
        msg('m5', 'dora', `${T}T10:26`, 'Já está. Obrigada! 😊', { unread: true }),
      ] },
      { id: 'cv2', kind: 'cliente', title: 'Limpeza — Maternidade 50 · T1 Esquerdo', clientId: 'c2', participants: ['carla', 'carlos'], jobId: 'j1', priority: '', resolved: false, messages: [
        msg('m6', 'carla', `${Y}T09:05`, 'Bom dia, Sr. Carlos. A limpeza do T1 Esquerdo fica marcada para amanhã às 09:00.'),
        msg('m7', 'carlos', `${Y}T09:20`, 'Perfeito. A porta do prédio está com o código novo: 4821.'),
        msg('m8', 'carla', `${Y}T09:24`, 'Obrigada, já passei a indicação à equipa.'),
        msg('m9', 'carlos', `${Y}T18:30`, 'Muito obrigada pelo excelente serviço! Ficou impecável.', { unread: true }),
      ] },
      { id: 'cv3', kind: 'equipa', title: 'Rita Almeida', clientId: '', participants: ['carla', 'rita'], jobId: '', priority: 'alta', resolved: false, messages: [
        msg('m10', 'rita', `${Y}T19:10`, 'Posso trocar o turno de amanhã? Tenho uma consulta às 10:00.'),
        msg('m11', 'carla', `${Y}T19:22`, 'Vou ver com a Sara e digo-te ainda hoje.'),
      ] },
      { id: 'cv4', kind: 'interna', title: 'Equipa — Rosário 123 · AP 2 Piso', clientId: 'c1', participants: ['carla', 'dora', 'sara'], jobId: 'j2', priority: 'alta', resolved: false, messages: [
        msg('m12', 'sara', `${T}T08:40`, 'Bom dia. A limpeza das 13:00 vai precisar de reforço: saída tardia dos hóspedes.'),
        msg('m13', 'dora', `${T}T08:52`, 'Falta detergente multiusos no armário. Consigo levar da carrinha?', { unread: true }),
        msg('m14', 'sara', `${T}T08:55`, 'Sim, leva dois frascos e regista o consumo.', { unread: true }),
      ] },
      { id: 'cv5', kind: 'equipa', title: 'Bruno Rocha', clientId: '', participants: ['carla', 'bruno'], jobId: '', priority: '', resolved: true, messages: [
        msg('m15', 'bruno', '2026-03-11T16:10', 'Material de vidro já foi reposto no armazém.', { files: [{ name: 'recibo-vidros.pdf', size: '82 KB' }] }),
        msg('m16', 'carla', '2026-03-11T16:32', 'Obrigada, Bruno. Fecho o assunto.'),
      ] },
      { id: 'cv6', kind: 'cliente', title: 'Casa da Praia — Sofia Costa', clientId: 'c3', participants: ['carla', 'sofia'], jobId: '', priority: '', resolved: false, messages: [
        msg('m17', 'sofia', '2026-03-10T11:05', 'Quando podem voltar? A casa reabre em maio.'),
        msg('m18', 'carla', '2026-03-10T11:40', 'Assim que tiver as datas, marcamos a limpeza de reabertura.'),
      ] },
      { id: 'cv7', kind: 'cliente', title: 'Porto Charming Suites — Ana Ribeiro', clientId: 'c1', participants: ['carla', 'ribeiro'], jobId: 'j3', priority: '', resolved: false, messages: [
        msg('m19', 'ribeiro', `${Y}T12:10`, 'Podem deixar a roupa suja preparada para a lavandaria?'),
        msg('m20', 'carla', `${Y}T12:26`, 'Sim, fica junto à entrada, identificada por unidade.'),
      ] },
    ],
    notices: [
      { id: 'n1', type: 'confirm', priority: 'alta', audience: 'gestao', icon: 'triangle', title: 'Confirmação de limpeza pendente',
        text: 'A limpeza de Maternidade 50 · T1 Esquerdo ainda não foi confirmada pelo cliente.', at: `${T}T10:30`, read: false, dismissed: false, action: 'Ver limpeza', target: 'job:j1', requires: '' },
      { id: 'n2', type: 'stock', priority: 'media', audience: 'gestao', icon: 'box', title: 'Stock em nível baixo',
        text: 'Detergente multiusos 1L com stock abaixo do mínimo na Carrinha 1.', at: `${T}T09:15`, read: false, dismissed: false, action: 'Ver inventário', target: 'mod:inventario', requires: 'inventario' },
      { id: 'n3', type: 'laundry', priority: 'baixa', audience: 'gestao', icon: 'car', title: 'Entrega da lavandaria em trânsito',
        text: 'A entrega #LD-4587 está a caminho e deve chegar hoje.', at: `${T}T08:20`, read: false, dismissed: false, action: 'Ver serviço', target: 'mod:servicosLigados', requires: 'servicosLigados' },
      { id: 'n4', type: 'next', priority: 'info', audience: 'todos', icon: 'calendar', title: 'Próxima tarefa',
        text: 'Limpeza — Rosário 123 · AP 2 Piso começa às 13:00.', at: `${T}T09:00`, read: false, dismissed: false, action: 'Ver no planeamento', target: 'job:j2', requires: '' },
      { id: 'n5', type: 'message', priority: 'media', audience: 'colab', icon: 'chat', title: 'Reunião de equipa às 17h',
        text: 'Sessão rápida na sede. Contamos com a tua presença! 👋', at: `${T}T08:05`, read: false, dismissed: false, action: 'Ver mensagens', target: 'conv:cv4', requires: '' },
      { id: 'n6', type: 'confirm', priority: 'alta', audience: 'colab', icon: 'triangle', title: 'Confirma a limpeza das 13:00',
        text: 'Rosário 123 · AP 2 Piso ainda não tem leitura confirmada.', at: `${T}T09:40`, read: false, dismissed: false, action: 'Ver limpeza', target: 'job:j2', requires: '' },
    ],
  };
}
