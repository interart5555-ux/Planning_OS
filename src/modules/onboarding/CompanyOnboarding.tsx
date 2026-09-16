import { useId } from 'react';
import type { CompanyOnboardingResult } from './types';
import { useCompanyOnboarding } from './useCompanyOnboarding';

interface CompanyOnboardingProps {
  onSubmit?: (result: CompanyOnboardingResult) => void | Promise<void>;
}

/** Classe base partilhada por todos os inputs (alvo de toque >= 48px). */
const inputBase =
  'w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-4 py-3 ' +
  'text-[15px] text-slate-900 placeholder:text-slate-400 transition ' +
  'hover:border-slate-400 focus:border-slate-900 focus:outline-none ' +
  'focus:ring-2 focus:ring-slate-900/15';

const inputError = 'border-red-500 hover:border-red-500 focus:border-red-600 focus:ring-red-500/20';

const labelBase = 'block text-sm font-medium text-slate-700';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-red-600">
      {message}
    </p>
  );
}

/**
 * Módulo 1 — Criação da Empresa.
 * Card centrado, 680px no desktop, coluna única no mobile.
 */
export default function CompanyOnboarding({ onSubmit }: CompanyOnboardingProps) {
  const uid = useId();
  const f = (name: string) => `${uid}-${name}`;

  const {
    state,
    managerChoice,
    errors,
    touched,
    submitting,
    setField,
    setContact,
    chooseManager,
    markTouched,
    handleSubmit,
  } = useCompanyOnboarding({ onSubmit });

  const showError = (field: string) =>
    touched[field] ? (errors as Record<string, string | undefined>)[field] : undefined;

  const managerError = showError('manager_choice');
  const nameError = showError('company_name');
  const nifError = showError('nif');
  const contactError = showError('contact');
  const addressError = showError('address');

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-[680px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Primeiro passo
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
            Vamos criar a tua empresa
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
            Confirma os dados da empresa de limpeza. Ficarás como administradora.
          </p>
        </header>

        <form className="mt-7 space-y-6" onSubmit={handleSubmit} noValidate>
          {/* Bloco destacado: gestão diária */}
          <fieldset className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <legend className="px-1 text-sm font-semibold text-slate-900">
              Quem faz a gestão diária da empresa?
            </legend>

            <div className="mt-3">
              <label htmlFor={f('manager')} className={labelBase}>
                A administradora também é a gestora?
              </label>
              <select
                id={f('manager')}
                name="manager_choice"
                value={managerChoice}
                onChange={(e) => chooseManager(e.target.value as typeof managerChoice)}
                onBlur={() => markTouched('manager_choice')}
                aria-invalid={Boolean(managerError)}
                aria-describedby={`${f('manager-help')}${managerError ? ` ${f('manager-error')}` : ''}`}
                className={`${inputBase} mt-1.5 cursor-pointer appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10 ${managerError ? inputError : ''}`}
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%2364748b' stroke-width='1.75'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5'/%3E%3C/svg%3E\")",
                }}
              >
                <option value="">Escolher uma opção...</option>
                <option value="yes">Sim (A mesma pessoa administra e gere)</option>
                <option value="no">Não (Definir outro utilizador para gestor)</option>
              </select>
              <FieldError id={f('manager-error')} message={managerError} />
              <p id={f('manager-help')} className="mt-2 text-[13px] leading-relaxed text-slate-500">
                Nas microempresas, a mesma pessoa pode administrar a empresa e
                gerir o trabalho diário.
              </p>
            </div>
          </fieldset>

          {/* Nome da empresa */}
          <div>
            <label htmlFor={f('name')} className={labelBase}>
              Nome da empresa
            </label>
            <input
              id={f('name')}
              name="company_name"
              type="text"
              autoComplete="organization"
              value={state.company_name}
              onChange={(e) => setField('company_name', e.target.value)}
              onBlur={() => markTouched('company_name')}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? f('name-error') : undefined}
              className={`${inputBase} mt-1.5 ${nameError ? inputError : ''}`}
            />
            <FieldError id={f('name-error')} message={nameError} />
          </div>

          {/* NIF + Contacto — 2 colunas a partir de sm */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={f('nif')} className={labelBase}>
                NIF
              </label>
              <input
                id={f('nif')}
                name="nif"
                type="text"
                inputMode="numeric"
                maxLength={9}
                value={state.nif}
                onChange={(e) => setField('nif', e.target.value.replace(/\D/g, '').slice(0, 9))}
                onBlur={() => markTouched('nif')}
                aria-invalid={Boolean(nifError)}
                aria-describedby={nifError ? f('nif-error') : undefined}
                className={`${inputBase} mt-1.5 ${nifError ? inputError : ''}`}
              />
              <FieldError id={f('nif-error')} message={nifError} />
            </div>

            <div>
              <label htmlFor={f('contact')} className={labelBase}>
                Contacto
              </label>
              <input
                id={f('contact')}
                name="contact"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={state.contact}
                onChange={(e) => setContact(e.target.value)}
                onBlur={() => markTouched('contact')}
                aria-invalid={Boolean(contactError)}
                aria-describedby={contactError ? f('contact-error') : undefined}
                className={`${inputBase} mt-1.5 ${contactError ? inputError : ''}`}
              />
              <FieldError id={f('contact-error')} message={contactError} />
            </div>
          </div>

          {/* Morada */}
          <div>
            <label htmlFor={f('address')} className={labelBase}>
              Morada
            </label>
            <input
              id={f('address')}
              name="address"
              type="text"
              autoComplete="street-address"
              value={state.address}
              onChange={(e) => setField('address', e.target.value)}
              onBlur={() => markTouched('address')}
              aria-invalid={Boolean(addressError)}
              aria-describedby={addressError ? f('address-error') : undefined}
              className={`${inputBase} mt-1.5 ${addressError ? inputError : ''}`}
            />
            <FieldError id={f('address-error')} message={addressError} />
          </div>

          <div className="pt-1 sm:flex sm:justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] rounded-full bg-slate-900 px-8 text-[15px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {submitting ? 'A criar...' : 'Criar empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
