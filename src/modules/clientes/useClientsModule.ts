import { useCallback, useReducer, useRef, useState } from 'react';
import { createDemoData } from './mockData';
import { applyToSelectedUnits, DEFAULT_CHECKIN, DEFAULT_CHECKOUT, digitsOnly, parseRate } from './rules';
import { DEFAULT_LAUNDRY } from './format';
import type {
  AppFeatures,
  Client,
  ClientInput,
  ClientStatus,
  ClientsData,
  ImageKey,
  LocationInput,
  LocationStatus,
  ServiceLocation,
  UnitSelection,
} from './types';

type Action =
  | { type: 'reset'; data: ClientsData }
  | { type: 'upsertClient'; client: Client }
  | { type: 'setClientStatus'; id: string; status: ClientStatus }
  | { type: 'upsertLocation'; location: ServiceLocation }
  | { type: 'setLocationStatus'; id: string; status: LocationStatus }
  | { type: 'removeLocation'; id: string };

function reducer(data: ClientsData, action: Action): ClientsData {
  switch (action.type) {
    case 'reset':
      return action.data;
    case 'upsertClient': {
      const exists = data.clients.some((c) => c.id === action.client.id);
      return { ...data, clients: exists ? data.clients.map((c) => (c.id === action.client.id ? action.client : c)) : [...data.clients, action.client] };
    }
    case 'setClientStatus':
      return { ...data, clients: data.clients.map((c) => (c.id === action.id ? { ...c, status: action.status } : c)) };
    case 'upsertLocation': {
      const exists = data.locations.some((l) => l.id === action.location.id);
      return { ...data, locations: exists ? data.locations.map((l) => (l.id === action.location.id ? action.location : l)) : [...data.locations, action.location] };
    }
    case 'setLocationStatus':
      return { ...data, locations: data.locations.map((l) => (l.id === action.id ? { ...l, status: action.status } : l)) };
    case 'removeLocation':
      return { ...data, locations: data.locations.filter((l) => l.id !== action.id) };
    default:
      return data;
  }
}

export const newId = (prefix: string): string => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const CLIENT_IMAGES: ImageKey[] = ['facade', 'facade2', 'house'];

interface Options {
  initialData?: ClientsData;
  features: AppFeatures;
}

/**
 * Estado e ações simuladas do Módulo 3. As regras puras estão em `rules.ts`;
 * aqui só se ligam ao estado e às mensagens.
 */
export function useClientsModule({ initialData, features }: Options) {
  const [data, dispatch] = useReducer(reducer, initialData ?? null, (d) => d ?? createDemoData());
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const notify = useCallback((message: string) => setToast({ id: Date.now(), message }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  /** Cria (id null) ou atualiza. Devolve o id do cliente. */
  const saveClient = useCallback((id: string | null, input: ClientInput): string => {
    const current = id ? dataRef.current.clients.find((c) => c.id === id) : undefined;
    const client: Client = {
      id: current?.id ?? newId('c'),
      payment: current?.payment ?? 'ok',
      image: current?.image ?? CLIENT_IMAGES[dataRef.current.clients.length % CLIENT_IMAGES.length],
      since: current?.since ?? 'abr 2026',
      ...input,
      name: input.name.trim(),
      nif: digitsOnly(input.nif),
      contact: input.contact.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      address: input.address.trim(),
      notes: input.notes.trim(),
    };
    dispatch({ type: 'upsertClient', client });
    notify(current ? 'Cliente atualizado.' : `${client.name} criado.`);
    return client.id;
  }, [notify]);

  const setClientStatus = useCallback((id: string, status: ClientStatus) => {
    dispatch({ type: 'setClientStatus', id, status });
    const name = dataRef.current.clients.find((c) => c.id === id)?.name ?? '';
    notify(`${name} ${status === 'active' ? 'reativado' : 'pausado'}.`);
  }, [notify]);

  /** Dados principais do local (formulário rápido). Devolve o id. */
  const saveLocation = useCallback((clientId: string, id: string | null, input: LocationInput, unitType: string): string => {
    const current = id ? dataRef.current.locations.find((l) => l.id === id) : undefined;
    const location: ServiceLocation = {
      ...(current ?? {
        id: newId('l'),
        clientId,
        laundryEnabled: false,
        laundrySetup: { ...DEFAULT_LAUNDRY },
        accessInstructions: '',
        notes: '',
        units: input.unitNames.map((name) => ({ id: newId('u'), name, type: unitType, capacity: 2, status: 'active' as const, teamId: null, hourlyRate: null, laundry: null, checkoutTime: null, checkinTime: null, calendars: [] })),
      }),
      name: input.name.trim(),
      address: input.address.trim(),
      image: input.image,
      status: input.status,
      serviceIds: input.serviceIds,
      teamId: features.defaultTeam ? input.teamId || null : current?.teamId ?? null,
      hourlyRate: features.hourlyRate ? parseRate(input.hourlyRate) : current?.hourlyRate ?? null,
      checkoutTime: features.stayTimes ? input.checkoutTime : current?.checkoutTime ?? DEFAULT_CHECKOUT,
      checkinTime: features.stayTimes ? input.checkinTime : current?.checkinTime ?? DEFAULT_CHECKIN,
    };
    dispatch({ type: 'upsertLocation', location });
    return location.id;
  }, [features]);

  /** Guarda o detalhe do local e aplica a configuração às unidades selecionadas. */
  const commitLocation = useCallback((draft: ServiceLocation, selection: UnitSelection): { location: ServiceLocation; applied: number } => {
    const result = applyToSelectedUnits(draft, selection, features);
    dispatch({ type: 'upsertLocation', location: result.location });
    return result;
  }, [features]);

  const setLocationStatus = useCallback((id: string, status: LocationStatus) => {
    dispatch({ type: 'setLocationStatus', id, status });
    const name = dataRef.current.locations.find((l) => l.id === id)?.name ?? '';
    notify(`${name} ${status === 'active' ? 'reativado' : 'pausado'}.`);
  }, [notify]);

  const removeLocation = useCallback((id: string) => {
    const name = dataRef.current.locations.find((l) => l.id === id)?.name ?? '';
    dispatch({ type: 'removeLocation', id });
    notify(`${name} removido.`);
  }, [notify]);

  const reset = useCallback(() => {
    dispatch({ type: 'reset', data: initialData ?? createDemoData() });
    notify('Dados de demonstração repostos.');
  }, [initialData, notify]);

  return {
    data,
    toast,
    dismissToast,
    actions: { notify, saveClient, setClientStatus, saveLocation, commitLocation, setLocationStatus, removeLocation, reset },
  };
}

export type ClientsModuleActions = ReturnType<typeof useClientsModule>['actions'];
