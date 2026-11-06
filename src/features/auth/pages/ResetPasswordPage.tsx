import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { BrandLockup } from '@/components/brand/BrandMark';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError, apiPost } from '@/services/api';

const MIN = 8;
const MAX = 72;

// O token chega no fragmento (#token=...), que o navegador nao envia ao servidor. Lido uma vez e
// apagado da barra de endereco e do historico, para nao ficar exposto na tela nem em "voltar".
function takeTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = params.get('token');
  if (token) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return token;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'INVALID_PASSWORD_RESET_TOKEN') {
      return 'Este link não vale mais: já foi usado, venceu ou foi substituído. Peça um novo ao Admin da empresa.';
    }
    if (error.code === 'TENANT_DOMAIN_NOT_FOUND') {
      return 'Este endereço não corresponde a nenhuma empresa. Abra o link exatamente como recebeu.';
    }
    if (error.code === 'RATE_LIMITED') {
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.';
    }
  }
  return 'Não foi possível concluir. Tente novamente.';
}

// Redefinicao de senha pelo link gerado pelo Admin (D-064) ou na reativacao (D-093). Rota publica, no
// endereco da empresa (D-088). Quem decide se o link vale e o backend.
export function ResetPasswordPage() {
  const [token] = useState(takeTokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const check = useQuery({
    queryKey: ['auth', 'password-reset', 'check'],
    queryFn: () => apiPost<{ expires_at: string }>('/v1/auth/password-reset/check', { token }),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });

  const redeem = useMutation({
    mutationFn: () => apiPost<void>('/v1/auth/password-reset', { token, new_password: password }),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (password.length < MIN || password.length > MAX) {
      setFormError(`A senha precisa ter de ${MIN} a ${MAX} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setFormError('A confirmação não é igual à senha.');
      return;
    }
    redeem.mutate();
  }

  let body;
  if (!token) {
    body = (
      <Alert tone="danger" title="Link incompleto">
        Abra o link de redefinição exatamente como recebeu.
      </Alert>
    );
  } else if (redeem.isSuccess) {
    body = (
      <div className="flex flex-col gap-3">
        <Alert tone="success" title="Senha definida">
          Sua senha nova já vale. Sessões abertas em outros dispositivos foram encerradas.
        </Alert>
        <Link to="/login" className="text-brand-700 font-medium hover:underline">
          Entrar no CRM
        </Link>
      </div>
    );
  } else if (check.isLoading) {
    body = <Spinner />;
  } else if (check.isError) {
    body = (
      <Alert tone="danger" title="Link inválido">
        {errorMessage(check.error)}
      </Alert>
    );
  } else {
    const error = formError ?? (redeem.isError ? errorMessage(redeem.error) : null);
    body = (
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        {error && (
          <Alert tone="danger" title="Senha não definida">
            {error}
          </Alert>
        )}
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          hint={`De ${MIN} a ${MAX} caracteres.`}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
        <Button
          type="submit"
          loading={redeem.isPending}
          disabled={redeem.isPending || !password || !confirm}
        >
          Definir senha
        </Button>
      </form>
    );
  }

  return (
    <div className="bg-background flex min-h-dvh items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col gap-6">
        <BrandLockup />
        <Card>
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold text-neutral-900">Definir senha</h1>
            {body}
          </div>
        </Card>
      </div>
    </div>
  );
}
