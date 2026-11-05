import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { WriteAccessContext } from '@/components/ui/write-access';
import { useAuth } from '@/features/auth/useAuth';
import { setApiErrorListener } from '@/services/api';
import { PLAN_KEY, usePlanQuery } from '../hooks/usePlan';
import { toPlanErrorNotice, writeBlockReason } from '../lib/labels';
import type { PlanErrorNotice } from '../lib/labels';
import { PlanErrorNoticeView } from './PlanErrorNoticeView';

// D-085: leva a situação do plano para a interface. Desabilita as ações de escrita em modo de consulta
// e mostra um aviso quando a API recusa uma operação por causa do plano. Apenas UX: o backend é a
// autoridade, e uma falha ao consultar o plano nunca bloqueia nada aqui.
export function PlanAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const { data } = usePlanQuery(Boolean(user));
  const [notice, setNotice] = useState<{ value: PlanErrorNotice; path: string } | null>(null);
  // O aviso vale para a tela da tentativa: ao navegar, deixa de aparecer.
  const currentPath = useRef(pathname);

  useEffect(() => {
    setApiErrorListener((error) => {
      const value = toPlanErrorNotice(error);
      if (!value) return;
      setNotice({ value, path: currentPath.current });
      // O vencimento pode ter ocorrido depois da última consulta: a tela entra em modo de consulta já.
      // A chave também cobre o consumo.
      void queryClient.invalidateQueries({ queryKey: PLAN_KEY });
    });
    return () => setApiErrorListener(null);
  }, [queryClient]);

  useEffect(() => {
    currentPath.current = pathname;
  }, [pathname]);

  return (
    <WriteAccessContext.Provider value={writeBlockReason(data)}>
      {children}
      {notice?.path === pathname && (
        <PlanErrorNoticeView notice={notice.value} onClose={() => setNotice(null)} />
      )}
    </WriteAccessContext.Provider>
  );
}
