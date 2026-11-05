import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getPlanSituation, getPlanUsage, startTrial } from '../services/plan';

// O vencimento acontece sem nenhuma acao do usuario: reconsultar periodicamente faz a tela entrar em
// modo de consulta sem precisar recarregar. Se a consulta atrasar, o backend ja bloqueia a escrita.
export const PLAN_POLL_MS = 5 * 60_000;

export const PLAN_KEY = ['plan'];
export const PLAN_USAGE_KEY = ['plan', 'usage'];

export function usePlanQuery(enabled = true) {
  return useQuery({
    queryKey: PLAN_KEY,
    queryFn: getPlanSituation,
    enabled,
    refetchInterval: PLAN_POLL_MS,
  });
}

export function usePlanUsageQuery(enabled: boolean) {
  // Sem cache entre telas: o consumo muda a cada criacao e precisa estar certo ao voltar ao Inicio.
  return useQuery({ queryKey: PLAN_USAGE_KEY, queryFn: getPlanUsage, enabled, staleTime: 0 });
}

export function useStartTrial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startTrial,
    onSuccess: (situation) => {
      queryClient.setQueryData(PLAN_KEY, situation);
    },
  });
}
