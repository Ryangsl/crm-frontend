import { useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Dialog';
import { useDeactivateUser } from '../hooks/useUsers';
import type { TenantUser } from '../hooks/useUsers';
import { userErrorMessage } from '../lib/access';

interface DeactivateUserModalProps {
  user: TenantUser;
  isSelf: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}

export function DeactivateUserModal({ user, isSelf, onClose, onDone }: DeactivateUserModalProps) {
  const deactivate = useDeactivateUser();
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    try {
      await deactivate.mutateAsync(user.id);
      onDone('Usuário desativado.');
    } catch (err) {
      setError(userErrorMessage(err, 'Não foi possível desativar o usuário.'));
    }
  }

  return (
    <Modal
      title="Desativar usuário"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={deactivate.isPending}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => void confirm()}
            loading={deactivate.isPending}
            disabled={deactivate.isPending}
            writes
          >
            Desativar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && (
          <Alert tone="danger" title="Não foi possível desativar">
            {error}
          </Alert>
        )}
        <p>
          Desativar <strong className="text-neutral-900">{user.name}</strong>? A pessoa perde o
          acesso na hora e todas as sessões abertas são encerradas.
        </p>
        {isSelf && <p className="text-warning">Você está desativando o seu próprio acesso.</p>}
        <p className="text-neutral-500">
          A reativação ainda não está disponível no CRM. Para voltar a dar acesso, fale com o
          suporte.
        </p>
      </div>
    </Modal>
  );
}
