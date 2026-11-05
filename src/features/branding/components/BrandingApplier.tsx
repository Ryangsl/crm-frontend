import { useEffect } from 'react';

import { useAuth } from '@/features/auth/useAuth';
import { useBrandingQuery } from '../hooks/useBranding';
import { applyBranding, resetBranding } from '../lib/theme';

// Aplica a identidade do tenant autenticado. Sem dado (carregando, erro ou API indisponivel), vale a
// identidade padrao e a interface segue funcionando. Sair do AppShell limpa tudo: o AuthProvider esvazia
// o cache no fim da sessao, entao nenhuma cor de um tenant chega a outra sessao.
export function BrandingApplier() {
  const { user } = useAuth();
  const { data } = useBrandingQuery(Boolean(user));

  useEffect(() => {
    applyBranding(data);
  }, [data]);

  useEffect(() => () => resetBranding(), []);

  return null;
}
