import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useHealth } from '../hooks/useHealth';
import { apiBaseUrl } from '../services/api';

/*
 * Pagina de infraestrutura: mostra se o frontend consegue falar com a API.
 * Nao e tela de negocio — existe para validar a fundacao ponta a ponta na Fase 1
 * e exercita os tres estados obrigatorios (loading / error / conteudo).
 */
export function StatusPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useHealth();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Status da fundacao</h1>
        <p className="text-sm text-neutral-500">API monitorada: {apiBaseUrl}</p>
      </header>

      <Card title="Backend">
        {isPending && (
          <p className="flex items-center gap-2 text-neutral-600">
            <Spinner size="sm" /> Consultando /health...
          </p>
        )}

        {isError && (
          <Alert tone="danger" title="Sem resposta do backend">
            {error instanceof Error ? error.message : 'Erro desconhecido'}. Verifique se a API esta
            rodando.
          </Alert>
        )}

        {data && (
          <div className="flex flex-col gap-2">
            <p>
              Status geral:{' '}
              <span className={data.status === 'ok' ? 'text-success' : 'text-danger'}>
                {data.status}
              </span>
            </p>
            <ul className="flex flex-col gap-1">
              {Object.entries(data.details ?? {}).map(([name, detail]) => (
                <li key={name} className="flex justify-between border-b border-dashed py-1">
                  <span className="text-neutral-700">{name}</span>
                  <span className={detail.status === 'up' ? 'text-success' : 'text-danger'}>
                    {detail.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <Button variant="secondary" size="sm" loading={isFetching} onClick={() => void refetch()}>
            Verificar novamente
          </Button>
        </div>
      </Card>
    </div>
  );
}
