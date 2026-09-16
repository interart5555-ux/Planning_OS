/**
 * Módulo 1 — Criação da Empresa (Company Onboarding)
 * Modelo de dados e contratos partilhados.
 */

/** Estado do formulário de onboarding da empresa. */
export interface CompanyOnboardingState {
  company_name: string;
  nif: string;
  contact: string;
  address: string;
  is_admin_also_manager: boolean;
}

/** Opções do dropdown de gestão diária. */
export type ManagerChoice = '' | 'yes' | 'no';

/** Permissões atribuídas à conta que cria a empresa. */
export type Role = 'Admin' | 'Manager';

/** Resultado entregue ao módulo seguinte após submissão válida. */
export interface CompanyOnboardingResult extends CompanyOnboardingState {
  /** Papéis a atribuir imediatamente ao utilizador que criou a empresa. */
  roles: Role[];
  /**
   * Quando `is_admin_also_manager` é false, o Módulo 2 tem de recolher
   * e convidar um gestor secundário antes de concluir o setup.
   */
  requires_manager_invite: boolean;
}

/** Erros por campo. Chave ausente = campo válido. */
export type FieldErrors = Partial<
  Record<keyof CompanyOnboardingState | 'manager_choice', string>
>;

export const EMPTY_ONBOARDING_STATE: CompanyOnboardingState = {
  company_name: '',
  nif: '',
  contact: '',
  address: '',
  is_admin_also_manager: false,
};
