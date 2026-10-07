import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ApiError } from '@/services/api';
import { useCreateMessage } from '../hooks/useConversations';
import { conversationErrorMessage } from '../lib/labels';
import type { MessageDirection } from '../types/conversations';

interface MessageComposerProps {
  conversationId: string;
}

// Registro MANUAL de mensagem (F4.6): nao envia nada a nenhum canal. A direcao e opcional —
// sem ela a mensagem e uma anotacao interna da conversa.
export function MessageComposer({ conversationId }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [direction, setDirection] = useState<'' | MessageDirection>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mutation = useCreateMessage(conversationId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending || !content.trim()) return;
    setErrorMessage(null);
    try {
      await mutation.mutateAsync({
        content: content.trim(),
        ...(direction ? { direction } : {}),
      });
      setContent('');
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError
          ? conversationErrorMessage(err.code, err.message)
          : 'Nao foi possivel registrar a mensagem.',
      );
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
      {errorMessage && (
        <Alert tone="danger" title="Nao foi possivel registrar">
          {errorMessage}
        </Alert>
      )}
      <Textarea
        label="Mensagem"
        required
        maxLength={5000}
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <Select
        label="Tipo"
        value={direction}
        onChange={(event) => setDirection(event.target.value as '' | MessageDirection)}
      >
        <option value="">Anotacao interna</option>
        <option value="inbound">Entrada (o contato falou)</option>
        <option value="outbound">Saida (nos falamos)</option>
      </Select>
      <div>
        <Button
          type="submit"
          size="sm"
          loading={mutation.isPending}
          disabled={mutation.isPending || !content.trim()}
        >
          Registrar mensagem
        </Button>
      </div>
    </form>
  );
}
