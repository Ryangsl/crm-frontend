import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { BrandLockup } from '@/components/brand/BrandMark';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/services/api';
import { useAuth } from '../useAuth';

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Ja autenticado (ex.: sessao restaurada apos abrir /login direto) — nao mostra o
  // formulario, volta para de onde o usuario veio ou para a area protegida padrao.
  if (status === 'authenticated') {
    const from = (location.state as LocationState | null)?.from?.pathname ?? '/';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      const from = (location.state as LocationState | null)?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Nao foi possivel entrar. Tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="bg-sidebar hidden w-1/2 max-w-xl flex-col justify-between p-10 lg:flex">
        <BrandLockup />
        <div>
          <p className="text-sidebar-ink text-3xl font-semibold tracking-tight">
            Mais clientes. Mais resultados.
          </p>
          <p className="text-sidebar-muted mt-3 text-sm">
            Leads, clientes, oportunidades e conversas em um só lugar.
          </p>
        </div>
        <span />
      </aside>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
        <div className="flex flex-col items-center gap-2 lg:hidden">
          <BrandLockup tone="page" />
          <p className="text-sm text-neutral-500">Mais clientes. Mais resultados.</p>
        </div>
      <Card title="Entrar" className="w-full max-w-sm">
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
          {error && (
            <Alert tone="danger" title="Nao foi possivel entrar">
              {error}
            </Alert>
          )}
          <Input
            label="E-mail"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" loading={submitting} disabled={submitting}>
            Entrar
          </Button>
        </form>
      </Card>
      </main>
    </div>
  );
}
