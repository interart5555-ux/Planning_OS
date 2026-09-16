import type {
  CompanyOnboardingState,
  FieldErrors,
  ManagerChoice,
} from './types';

/** Primeiros dígitos válidos para NIF português (singulares e colectivos). */
const NIF_SINGLE_PREFIXES = ['1', '2', '3', '5', '6', '8', '9'];
const NIF_DOUBLE_PREFIXES = [
  '45', '70', '71', '72', '74', '75', '77', '78', '79',
  '90', '91', '98', '99',
];

export const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/**
 * Valida um NIF português: 9 dígitos, prefixo reconhecido e dígito de
 * controlo (módulo 11) correcto.
 */
export function isValidNIF(value: string): boolean {
  const nif = digitsOnly(value);
  if (nif.length !== 9) return false;

  const hasValidPrefix =
    NIF_SINGLE_PREFIXES.includes(nif[0]) ||
    NIF_DOUBLE_PREFIXES.includes(nif.slice(0, 2));
  if (!hasValidPrefix) return false;

  let sum = 0;
  for (let i = 0; i < 8; i += 1) {
    sum += Number(nif[i]) * (9 - i);
  }
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;

  return checkDigit === Number(nif[8]);
}

/**
 * Valida um contacto telefónico português: 9 dígitos, com ou sem
 * indicativo +351. Fixos começam por 2, móveis por 9.
 */
export function isValidContact(value: string): boolean {
  let digits = digitsOnly(value);
  if (digits.startsWith('351')) digits = digits.slice(3);
  if (digits.length !== 9) return false;
  return /^[239]/.test(digits);
}

/** Formata progressivamente um contacto como "9XX XXX XXX". */
export function formatContact(value: string): string {
  const hasPlus = value.trim().startsWith('+');
  let digits = digitsOnly(value).slice(0, hasPlus ? 12 : 9);
  let prefix = '';
  if (hasPlus) {
    prefix = `+${digits.slice(0, 3)} `;
    digits = digits.slice(3);
  }
  const groups = digits.match(/.{1,3}/g) ?? [];
  return `${prefix}${groups.join(' ')}`.trimEnd();
}

/** Valida todos os campos e devolve apenas os que têm erro. */
export function validateOnboarding(
  state: CompanyOnboardingState,
  managerChoice: ManagerChoice,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!managerChoice) {
    errors.manager_choice = 'Escolhe quem faz a gestão diária da empresa.';
  }

  const name = state.company_name.trim();
  if (!name) {
    errors.company_name = 'Indica o nome da empresa.';
  } else if (name.length < 2) {
    errors.company_name = 'O nome tem de ter pelo menos 2 caracteres.';
  }

  if (!state.nif.trim()) {
    errors.nif = 'Indica o NIF da empresa.';
  } else if (digitsOnly(state.nif).length !== 9) {
    errors.nif = 'O NIF tem de ter 9 dígitos.';
  } else if (!isValidNIF(state.nif)) {
    errors.nif = 'NIF inválido. Confirma os dígitos.';
  }

  if (!state.contact.trim()) {
    errors.contact = 'Indica um contacto telefónico.';
  } else if (!isValidContact(state.contact)) {
    errors.contact = 'Contacto inválido. Ex.: 912 345 678.';
  }

  if (!state.address.trim()) {
    errors.address = 'Indica a morada da empresa.';
  } else if (state.address.trim().length < 5) {
    errors.address = 'A morada parece demasiado curta.';
  }

  return errors;
}
