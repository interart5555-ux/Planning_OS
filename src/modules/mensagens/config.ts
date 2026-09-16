import type { IconName } from '../shared/ui';
import type { ConversationKind, MessageState, NoticePriority, ViewerRole } from './types';

export const MAX_LENGTH = 1000;

export const KIND_LABEL: Record<ConversationKind, { label: string; className: string }> = {
  equipa: { label: 'Equipa', className: 'bg-[#e7f5ec] text-[#17643e]' },
  cliente: { label: 'Cliente', className: 'bg-[#e8f1fc] text-[#2a5592]' },
  interna: { label: 'Interna', className: 'bg-[#ede9fb] text-[#5b3fb0]' },
};

export const STATE_LABEL: Record<MessageState, { label: string; icon: IconName }> = {
  sent: { label: 'Enviada', icon: 'send' },
  delivered: { label: 'Entregue', icon: 'check' },
  read: { label: 'Lida', icon: 'checkCircle' },
  scheduled: { label: 'Agendada', icon: 'clock' },
  failed: { label: 'Não foi possível enviar', icon: 'triangle' },
};

export const PRIORITY: Record<NoticePriority, { label: string; pill: string; card: string; icon: string; title: string }> = {
  alta: { label: 'Alta prioridade', pill: 'bg-[#fdecea] text-[#b42318]', card: 'border-[#f4c3bd] border-l-[#d9463b] bg-[#fff8f7]', icon: 'bg-[#fdecea] text-[#b42318]', title: 'text-[#9b2318]' },
  media: { label: 'Média prioridade', pill: 'bg-[#fdf6de] text-[#7a5406]', card: 'border-[#f1dfa4] border-l-[#e0a30b] bg-[#fffcf3]', icon: 'bg-[#fdf6de] text-[#7a5406]', title: 'text-[#7a5406]' },
  baixa: { label: 'Baixa prioridade', pill: 'bg-[#e8f1fc] text-[#2a5592]', card: 'border-[#d5e2f3] border-l-[#2f6fca] bg-[#f7faff]', icon: 'bg-[#edf3fb] text-[#2a5592]', title: 'text-[#2a5592]' },
  info: { label: 'Informativo', pill: 'bg-[#e7f5ec] text-[#17643e]', card: 'border-[#c3e3cf] border-l-[#17643e] bg-[#f6fbf8]', icon: 'bg-[#e7f5ec] text-[#17643e]', title: 'text-[#17643e]' },
};

export const VIEWERS: Record<ViewerRole, { id: string; label: string; canAll: boolean }> = {
  gestora: { id: 'carla', label: 'Gestora', canAll: true },
  admin: { id: 'ana', label: 'Administradora', canAll: true },
  colab: { id: 'dora', label: 'Colaboradora', canAll: false },
};

export const FILTERS: Array<['todas' | 'equipa' | 'clientes' | 'naolidas', string]> = [
  ['todas', 'Todas'], ['equipa', 'Equipa'], ['clientes', 'Clientes'], ['naolidas', 'Não lidas'],
];

export const EMOJIS = ['🙂', '😊', '👍', '🙌', '✅', '❗', '⏰', '🧽', '🧼', '🧺', '🚿', '🔑', '📸', '💚', '🙏', '👋'];

export const QUICK_REPLIES = ['Já cheguei ao local. ✅', 'Vou precisar de mais 15 minutos.', 'Falta produto no alojamento.', 'Limpeza concluída. 🙌'];

export const MODULE_LABEL: Record<'inventario' | 'servicosLigados', string> = { inventario: 'Inventário', servicosLigados: 'Serviços ligados' };
