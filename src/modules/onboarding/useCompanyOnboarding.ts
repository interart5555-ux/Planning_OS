import { useCallback, useMemo, useState } from 'react';
import {
  EMPTY_ONBOARDING_STATE,
  type CompanyOnboardingResult,
  type CompanyOnboardingState,
  type FieldErrors,
  type ManagerChoice,
} from './types';
import { formatContact, validateOnboarding } from './validation';

interface Options {
  onSubmit?: (result: CompanyOnboardingResult) => void | Promise<void>;
}

/**
 * Estado, validação e regras de negócio do Módulo 1.
 * Mantém o componente de apresentação livre de lógica.
 */
export function useCompanyOnboarding({ onSubmit }: Options = {}) {
  const [state, setState] = useState<CompanyOnboardingState>(
    EMPTY_ONBOARDING_STATE,
  );
  const [managerChoice, setManagerChoice] = useState<ManagerChoice>('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback(
    <K extends keyof CompanyOnboardingState>(
      field: K,
      value: CompanyOnboardingState[K],
    ) => {
      setState((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const { [field]: _removed, ...rest } = prev;
        return rest;
      });
    },
    [],
  );

  const setContact = useCallback(
    (raw: string) => setField('contact', formatContact(raw)),
    [setField],
  );

  const chooseManager = useCallback((choice: ManagerChoice) => {
    setManagerChoice(choice);
    // Regra de negócio: "Sim" => admin acumula a gestão diária.
    setState((prev) => ({ ...prev, is_admin_also_manager: choice === 'yes' }));
    setErrors((prev) => {
      const { manager_choice: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const isComplete = useMemo(
    () =>
      Object.keys(validateOnboarding(state, managerChoice)).length === 0,
    [state, managerChoice],
  );

  const handleSubmit = useCallback(
    async (event?: { preventDefault: () => void }) => {
      event?.preventDefault();
      const found = validateOnboarding(state, managerChoice);
      setErrors(found);
      setTouched({
        manager_choice: true,
        company_name: true,
        nif: true,
        contact: true,
        address: true,
      });
      if (Object.keys(found).length > 0) return null;

      const result: CompanyOnboardingResult = {
        ...state,
        // Admin acumula Manager quando gere o dia-a-dia.
        roles: state.is_admin_also_manager ? ['Admin', 'Manager'] : ['Admin'],
        // Módulo seguinte terá de convidar um gestor secundário.
        requires_manager_invite: !state.is_admin_also_manager,
      };

      setSubmitting(true);
      try {
        await onSubmit?.(result);
      } finally {
        setSubmitting(false);
      }
      return result;
    },
    [state, managerChoice, onSubmit],
  );

  return {
    state,
    managerChoice,
    errors,
    touched,
    submitting,
    isComplete,
    setField,
    setContact,
    chooseManager,
    markTouched,
    handleSubmit,
  };
}
