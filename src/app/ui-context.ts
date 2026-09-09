import { createContext } from 'react';

/*
 * Estado global de UI via Context API (D-018 — sem store externa no MVP).
 * Aqui entra apenas estado transversal de interface. Estado de servidor e do
 * TanStack Query; nunca duplicar dado de API aqui.
 */
export interface UiState {
  online: boolean;
  setOnline: (value: boolean) => void;
}

export const UiContext = createContext<UiState | undefined>(undefined);
