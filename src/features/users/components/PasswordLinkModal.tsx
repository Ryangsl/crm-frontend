import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Dialog';
import type { PasswordResetLink } from '../hooks/useUsers';
import { formatExpiry, resetLinkUrl } from '../lib/reset-link';

interface PasswordLinkModalProps {
  title: string;
  userName: string;
  intro: string;
  link: PasswordResetLink;
  onClose: () => void;
}

// Mostra o link de redefinicao UMA vez (D-064): o CRM nao guarda o token e nao envia e-mail. Quem
// gerou entrega o link a pessoa por um canal seguro.
export function PasswordLinkModal({
  title,
  userName,
  intro,
  link,
  onClose,
}: PasswordLinkModalProps) {
  const url = resetLinkUrl(link);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <p>{intro}</p>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-900">Link para {userName}</span>
          <textarea
            readOnly
            value={url}
            rows={3}
            aria-label={`Link de redefinição de senha para ${userName}`}
            onFocus={(event) => event.currentTarget.select()}
            className="rounded-control border-border bg-surface-muted w-full resize-none border p-2 font-mono text-xs break-all text-neutral-900"
          />
        </label>
        <div>
          <Button size="sm" variant="secondary" onClick={() => void copy()}>
            {copied ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            {copied ? 'Copiado' : 'Copiar link'}
          </Button>
        </div>
        <Alert tone="warning" title="Entregue por um canal seguro">
          Vale uma única vez, até {formatExpiry(link.expires_at)}. Quem tiver o link define a senha
          da conta: não o publique em grupos. Este link não será mostrado de novo; gerar outro
          inválida este.
        </Alert>
      </div>
    </Modal>
  );
}
