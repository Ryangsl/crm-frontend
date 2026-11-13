import { Component, useEffect, useRef } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { reportError } from './monitoring';

// Tela de erro inesperado (D-101). Nao depende de router, sessao nem consulta: precisa funcionar
// quando o que quebrou foi justamente um desses. Mostra so uma mensagem generica, nunca o erro.
export function ErrorScreen() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-4">
      <section
        role="alert"
        aria-labelledby="app-error-title"
        className="bg-surface border-border-subtle rounded-card shadow-card flex w-full max-w-sm flex-col items-center gap-3 border p-6 text-center"
      >
        <TriangleAlert aria-hidden="true" className="text-danger size-8" />
        <h1
          id="app-error-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold text-neutral-900"
        >
          Algo deu errado
        </h1>
        <p className="text-sm text-neutral-600">
          Ocorreu um erro inesperado e esta tela não pôde ser exibida. Recarregue a página para
          continuar. Se o problema se repetir, avise o administrador da sua empresa.
        </p>
        <Button className="mt-2 w-full" onClick={() => window.location.reload()}>
          Recarregar
        </Button>
      </section>
    </main>
  );
}

interface BoundaryState {
  failed: boolean;
}

/**
 * Error boundary no nivel do app: o que quebrar fora das rotas (provedores, roteador) cai aqui. Erros
 * dentro das rotas sao tratados pelo `errorElement` do roteador (`RouteErrorScreen`), que mostra a
 * mesma tela.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    reportError(error, { source: 'render', componentStack: info.componentStack ?? undefined });
  }

  render() {
    return this.state.failed ? <ErrorScreen /> : this.props.children;
  }
}
