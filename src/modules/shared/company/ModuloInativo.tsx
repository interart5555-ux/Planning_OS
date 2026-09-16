import { useCallback, useState } from 'react';
import { AppTopBar, Button, Icon, sectionLabel, ToastMessage, type AppSection } from '../ui';
import { MODULO_LABEL, useGerirModulos, type ModuloOpcional } from './modulosAtivos';

interface ModuloInativoProps {
  /** Só módulos opcionais podem estar inativos. */
  modulo: ModuloOpcional;
  /** Secção de topo correspondente (ecrãs de gestão); omitir na app móvel da colaboradora. */
  section?: AppSection;
  appLabel?: string;
  userInitials?: string;
  onNavigate?: (section: AppSection) => void;
  /** Abre a gestão de módulos; por omissão usa `GerirModulosProvider`. */
  onManageModules?: () => void;
}

/** Rota de um módulo desligado para esta empresa. Os dados do módulo mantêm-se guardados. */
export function ModuloInativo({ modulo, section, appLabel = 'Limpezas', userInitials = 'PS', onNavigate, onManageModules }: ModuloInativoProps) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  const dismiss = useCallback(() => setToast(null), []);
  const gerir = useGerirModulos();
  const manage = onManageModules ?? gerir ?? (() => notify('A gestão de módulos fica na configuração da empresa (simulação).'));
  const label = MODULO_LABEL[modulo];

  return (
    <div className="min-h-screen bg-white text-sm text-slate-900 antialiased">
      {section && (
        <AppTopBar active={section} appLabel={appLabel} userInitials={userInitials} notify={notify}
          onNavigate={(s) => (onNavigate ? onNavigate(s) : notify(`“${sectionLabel(s)}” fica fora desta simulação.`))} />
      )}
      <main className="mx-auto max-w-[1240px] px-4 pb-10 pt-[18px] md:px-8 md:pt-[26px]">
        <div role="status" aria-label={`${label}: módulo indisponível`} className="mx-auto mt-10 max-w-[560px] rounded-2xl border border-slate-200 px-7 py-8 text-center shadow-[0_1px_2px_rgba(17,24,39,.04),0_8px_24px_-16px_rgba(17,24,39,.22)]">
          <Icon name="lock" className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mb-1.5 mt-3 text-2xl font-bold tracking-tight">Módulo indisponível</h1>
          <p className="text-slate-600">Esta funcionalidade não está ativa para a tua empresa.</p>
          <Button variant="primary" className="mt-5" onClick={manage}>Gerir módulos ativos</Button>
          <p className="mt-3.5 text-[12.5px] text-slate-500">Os dados de {label} ficam guardados e voltam a estar disponíveis quando o módulo for reativado.</p>
        </div>
      </main>
      <ToastMessage toast={toast} onDismiss={dismiss} />
    </div>
  );
}
