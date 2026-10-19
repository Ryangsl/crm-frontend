import { Alert } from '@/components/ui/Alert';
import { useAccessStatusQuery } from '../hooks/useAccessControl';

// F4.7: banner preventivo "fora do horario". So aparece para quem esta sujeito a restricao, com a
// restricao em vigor e algum recurso bloqueado AGORA (ja considerando excecoes vigentes). Falha ao
// consultar o status nunca bloqueia nada: o backend e a autoridade (403 OUTSIDE_BUSINESS_HOURS).
export function AccessStatusBanner() {
  const { data } = useAccessStatusQuery();
  if (!data || !data.restriction_enabled || !data.applies_to_me) return null;

  const blocked = [!data.access.leads && 'Leads', !data.access.conversations && 'Conversas'].filter(
    (name): name is string => Boolean(name),
  );
  if (blocked.length === 0) return null;

  return (
    <div className="mb-4" data-testid="access-status-banner">
      <Alert tone="warning" title="Fora do horario de funcionamento">
        O acesso a {blocked.join(' e ')} esta indisponivel neste horario. Se precisar acessar agora,
        peca uma liberacao excepcional a um Admin ou Gerente.
      </Alert>
    </div>
  );
}
