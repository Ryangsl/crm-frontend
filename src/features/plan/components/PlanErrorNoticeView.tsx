import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { formatAmount, resourceLabel } from '../lib/labels';
import type { PlanErrorNotice } from '../lib/labels';

function content(notice: PlanErrorNotice): { title: string; body: string } {
  switch (notice.kind) {
    case 'limit': {
      const { resource, used, limit } = notice.info;
      return {
        title: `Limite de ${resourceLabel(resource)} atingido`,
        body: `Você está usando ${formatAmount(resource, used)} de ${formatAmount(resource, limit)}. Os registros existentes continuam disponíveis.`,
      };
    }
    case 'expired':
      return {
        title: 'Período de avaliação encerrado',
        body: 'Esta operação está indisponível. Seus dados continuam preservados e disponíveis para consulta.',
      };
    case 'not_started':
      return {
        title: 'Período de avaliação não iniciado',
        body: 'Esta operação fica disponível depois que um administrador iniciar a avaliação.',
      };
    case 'feature':
      return {
        title: 'Funcionalidade não incluída no plano',
        body: 'Esta funcionalidade não faz parte do plano atual.',
      };
  }
}

// Aparece só depois de uma tentativa recusada; não abre sozinho ao acessar o sistema.
export function PlanErrorNoticeView({
  notice,
  onClose,
}: {
  notice: PlanErrorNotice;
  onClose: () => void;
}) {
  const { title, body } = content(notice);
  return (
    <div
      className="fixed inset-x-4 bottom-20 z-20 lg:right-4 lg:bottom-4 lg:left-auto lg:w-96"
      data-testid="plan-error-notice"
    >
      <div className="bg-surface rounded-lg shadow-lg">
        <Alert tone="warning" title={title}>
          <p>{body}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Link to="/plan" className="text-brand-700 font-medium underline" onClick={onClose}>
              Conhecer os planos
            </Link>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </Alert>
      </div>
    </div>
  );
}
