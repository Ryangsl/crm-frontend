import { useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Dialog';
import { useCreatePasswordResetLink, useReactivateUser } from '../hooks/useUsers';
import type { PasswordResetLink, TenantUser } from '../hooks/useUsers';
import { userErrorMessage } from '../lib/access';
import { PasswordLinkModal } from './PasswordLinkModal';

interface UserAccessActionModalProps {
  kind: 'reset-link' | 'reactivate';
  user: TenantUser;
  onClose: () => void;
  onDone: (message: string) => void;
}

// Confirmacao + resultado das duas acoes que geram link de senha (D-064 e D-093). A decisao e do
// backend; aqui so se explica o efeito e se mostra o link gerado.
export function UserAccessActionModal({ kind, user, onClose, onDone }: UserAccessActionModalProps) {
  const createLink = useCreatePasswordResetLink();
  const reactivate = useReactivateUser();
  const pending = createLink.isPending || reactivate.isPending;
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<PasswordResetLink | null>(null);
  const reactivating = kind === 'reactivate';

  async function confirm() {
    setError(null);
    try {
      if (reactivating) {
        const result = await reactivate.mutateAsync(user.id);
        setLink(result.password_reset);
      } else {
        setLink(await createLink.mutateAsync(user.id));
      }
    } catch (err) {
      setError(
        userErrorMessage(
          err,
          reactivating ? 'Não foi possível reativar o usuário.' : 'Não foi possível gerar o link.',
        ),
      );
    }
  }

  if (link) {
    return (
      <PasswordLinkModal
        title={reactivating ? 'Usuário reativado' : 'Link de redefinição de senha'}
        userName={user.name}
        intro={
          reactivating
            ? `${user.name} voltou a ter acesso, com os mesmos papéis. A senha antiga não vale mais: envie o link abaixo para a pessoa definir uma nova.`
            : 'Envie o link abaixo para a pessoa definir uma senha nova. A senha atual continua valendo até o link ser usado; ao usar, todas as sessões dela são encerradas.'
        }
        link={link}
        onClose={() => onDone(reactivating ? 'Usuário reativado.' : 'Link gerado.')}
      />
    );
  }

  return (
    <Modal
      title={reactivating ? 'Reativar usuário' : 'Gerar link de senha'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={() => void confirm()} loading={pending} disabled={pending} writes>
            {reactivating ? 'Reativar' : 'Gerar link'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && (
          <Alert
            tone="danger"
            title={reactivating ? 'Não foi possível reativar' : 'Não foi possível gerar'}
          >
            {error}
          </Alert>
        )}
        {reactivating ? (
          <p>
            Reativar <strong className="text-neutral-900">{user.name}</strong>? Os papéis anteriores
            voltam a valer e o usuário ocupa uma vaga do plano. A senha antiga deixa de valer: você
            recebe um link de uso único para a pessoa definir uma nova.
          </p>
        ) : (
          <p>
            Gerar um link de redefinição de senha para{' '}
            <strong className="text-neutral-900">{user.name}</strong>? Ele vale uma vez, por 24
            horas, e um link anterior deixa de valer.
          </p>
        )}
      </div>
    </Modal>
  );
}
