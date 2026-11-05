import { createContext, useContext } from 'react';

// Motivo pelo qual as acoes de escrita estao indisponiveis agora (null = disponiveis). Apenas UX: quem
// bloqueia de verdade e o backend. Sem provider, nada e bloqueado.
export const WriteAccessContext = createContext<string | null>(null);

export function useWriteBlockReason(): string | null {
  return useContext(WriteAccessContext);
}
