import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError, apiPost, setAccessToken } from '@/services/api';

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
}

const MIN = 8;
const MAX = 72;

function changeErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Não foi possível trocar a senha. Tente novamente.';
  switch (error.code) {
    case 'INVALID_CURRENT_PASSWORD':
      return 'A senha atual não confere.';
    case 'PASSWORD_UNCHANGED':
      return 'A nova senha precisa ser diferente da atual.';
    case 'RATE_LIMITED':
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.';
    default:
      return error.message || 'Não foi possível trocar a senha.';
  }
}

// Minha conta (D-064): dados da pessoa logada e troca da propria senha. Trocar encerra as sessoes
// dos outros dispositivos; esta continua com o par novo devolvido pela API.
export function AccountPage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: () =>
      apiPost<AccessTokenResponse>('/v1/users/me/password', {
        current_password: current,
        new_password: next,
      }),
    onSuccess: (tokens) => {
      setAccessToken(tokens.access_token);
      setCurrent('');
      setNext('');
      setConfirm('');
      setToast('Senha alterada. As sessões dos outros dispositivos foram encerradas.');
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (next.length < MIN || next.length > MAX) {
      setFormError(`A nova senha precisa ter de ${MIN} a ${MAX} caracteres.`);
      return;
    }
    if (next !== confirm) {
      setFormError('A confirmação não é igual à nova senha.');
      return;
    }
    change.mutate();
  }

  const error = formError ?? (change.isError ? changeErrorMessage(change.error) : null);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Minha conta' }]} />
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Minha conta</h1>
        {user && (
          <p className="text-sm break-all text-neutral-500">
            {user.name} · {user.email}
          </p>
        )}
      </header>

      <Card className="max-w-xl">
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-neutral-900">Trocar senha</h2>
            <p className="text-sm text-neutral-500">
              Ao trocar, você continua conectado aqui e as sessões dos outros dispositivos são
              encerradas.
            </p>
          </div>
          {error && (
            <Alert tone="danger" title="Senha não alterada">
              {error}
            </Alert>
          )}
          <Input
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            required
          />
          <Input
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            hint={`De ${MIN} a ${MAX} caracteres.`}
            value={next}
            onChange={(event) => setNext(event.target.value)}
            required
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
          <div>
            <Button
              type="submit"
              loading={change.isPending}
              disabled={change.isPending || !current || !next || !confirm}
            >
              Trocar senha
            </Button>
          </div>
        </form>
      </Card>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
