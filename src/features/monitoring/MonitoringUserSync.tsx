import { useEffect } from 'react';

import { useAuth } from '../auth/useAuth';
import { setMonitoringUser } from './monitoring';

// Mantem no monitoramento so o id do usuario logado (D-101): nunca nome, e-mail ou token.
export function MonitoringUserSync() {
  const { user } = useAuth();
  const id = user?.id ?? null;

  useEffect(() => {
    setMonitoringUser(id);
  }, [id]);

  return null;
}
