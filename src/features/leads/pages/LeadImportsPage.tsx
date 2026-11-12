import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table';
import { useAuth } from '@/features/auth/useAuth';
import { useUserDirectory } from '@/features/users/hooks/useUsers';
import { useImportLeads, useLeadImportsQuery } from '../hooks/useLeadImports';
import { useLeadSourcesQuery } from '../hooks/useLeads';
import { IMPORT_STATUS } from '../lib/lead-import-labels';

const ACCEPTED = '.csv,.xlsx';
const MAX_BYTES = 10 * 1024 * 1024;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// D-096: envio da planilha e lista das importacoes. O processamento roda em segundo plano no
// backend; a tela so acompanha.
export function LeadImportsPage() {
  const { hasPermission } = useAuth();
  const canImport = hasPermission('leads:create') && hasPermission('leads:read');

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb items={[{ label: 'Leads', to: '/leads' }, { label: 'Importações' }]} />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Importar leads</h1>
        <p className="text-sm text-neutral-500">
          Envie uma planilha e acompanhe o processamento. Ele continua em segundo plano: você pode
          sair desta tela.
        </p>
      </header>

      {canImport ? (
        <>
          <ImportForm />
          <ImportList />
        </>
      ) : (
        <Alert tone="warning" title="Sem permissão para importar">
          Importar exige permissão para criar e ver leads.
        </Alert>
      )}
    </div>
  );
}

function ImportForm() {
  const navigate = useNavigate();
  const sources = useLeadSourcesQuery();
  const directory = useUserDirectory();
  const mutation = useImportLeads();

  const [file, setFile] = useState<File | null>(null);
  const [sourceId, setSourceId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [fileError, setFileError] = useState<string>();
  const [sourceError, setSourceError] = useState<string>();

  const sourceList = sources.data?.data ?? [];
  const activeUsers = (directory.data?.data ?? []).filter((user) => user.status === 'active');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextFileError = !file
      ? 'Escolha um arquivo CSV ou XLSX.'
      : !/\.(csv|xlsx)$/i.test(file.name)
        ? 'Formato não aceito. Envie um arquivo CSV ou XLSX.'
        : file.size > MAX_BYTES
          ? 'O arquivo passa de 10 MB.'
          : undefined;
    const nextSourceError = sourceId ? undefined : 'Escolha a origem dos leads.';
    setFileError(nextFileError);
    setSourceError(nextSourceError);
    if (nextFileError || nextSourceError || !file) return;

    mutation.mutate(
      { file, sourceId, ownerId: ownerId || undefined },
      { onSuccess: (created) => navigate(`/leads/imports/${created.id}`) },
    );
  }

  return (
    <Card title="Novo arquivo">
      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <p className="text-sm text-neutral-600">
          CSV ou XLSX com até 5.000 linhas e 10 MB. A primeira linha é o cabeçalho; colunas
          reconhecidas: <strong>nome</strong>, <strong>documento</strong> (CPF ou CNPJ),{' '}
          <strong>telefone</strong> e <strong>email</strong>. Linhas que repetem um lead já
          cadastrado são ignoradas.
        </p>

        <div className="flex flex-col gap-1">
          <label htmlFor="lead-import-file" className="text-sm font-medium text-neutral-800">
            Arquivo
          </label>
          <input
            id="lead-import-file"
            type="file"
            accept={ACCEPTED}
            aria-invalid={fileError ? true : undefined}
            aria-describedby={fileError ? 'lead-import-file-error' : undefined}
            className="file:rounded-control file:bg-surface-muted min-h-touch lg:min-h-control text-sm text-neutral-700 file:mr-3 file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-800"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setFileError(undefined);
            }}
          />
          {fileError && (
            <p id="lead-import-file-error" className="text-danger text-sm">
              {fileError}
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Select
              label="Origem"
              value={sourceId}
              error={sourceError}
              disabled={sources.isPending}
              onChange={(event) => {
                setSourceId(event.target.value);
                setSourceError(undefined);
              }}
            >
              <option value="">{sources.isPending ? 'Carregando...' : 'Selecione'}</option>
              {sourceList.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </Select>
            {sources.isError && (
              <p className="text-danger text-sm">Não foi possível carregar as origens.</p>
            )}
            {sources.data && sourceList.length === 0 && (
              <p className="text-sm text-neutral-500">
                Nenhuma origem cadastrada.{' '}
                <Link to="/settings/lead-sources" className="text-brand-700 hover:underline">
                  Cadastrar origens
                </Link>
              </p>
            )}
          </div>

          <Select
            label="Responsável"
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
          >
            <option value="">Distribuição automática</option>
            {activeUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </div>

        {mutation.isError && (
          <Alert tone="danger" title="Não foi possível enviar o arquivo">
            {mutation.error instanceof Error ? mutation.error.message : 'Erro desconhecido.'}
          </Alert>
        )}

        <div>
          <Button type="submit" writes loading={mutation.isPending} disabled={mutation.isPending}>
            Enviar arquivo
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ImportList() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, isFetching, refetch } = useLeadImportsQuery(page);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <Card title="Importações enviadas">
      {isPending && (
        <p className="flex items-center gap-2 text-neutral-600">
          <Spinner size="sm" /> Carregando importações...
        </p>
      )}
      {isError && (
        <Alert tone="danger" title="Não foi possível carregar as importações">
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      )}
      {data && data.data.length === 0 && (
        <EmptyState
          title="Nenhuma importação ainda"
          description="Os arquivos enviados aparecem aqui."
        />
      )}
      {data && data.data.length > 0 && (
        <div className="flex flex-col gap-3">
          <Table label="Importações" busy={isFetching}>
            <Thead>
              <Th>Arquivo</Th>
              <Th>Situação</Th>
              <Th>Linhas</Th>
              <Th className="hidden md:table-cell">Importadas</Th>
              <Th className="hidden md:table-cell">Com erro</Th>
              <Th className="hidden lg:table-cell">Enviada por</Th>
              <Th className="hidden md:table-cell">Enviada em</Th>
            </Thead>
            <Tbody>
              {data.data.map((item) => (
                <Tr key={item.id}>
                  <Td className="max-w-56">
                    <Link
                      to={`/leads/imports/${item.id}`}
                      className="block truncate font-medium text-neutral-900 hover:underline"
                    >
                      {item.file_name}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={IMPORT_STATUS[item.status].tone}>
                      {IMPORT_STATUS[item.status].label}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {item.processed_rows} de {item.total_rows}
                  </Td>
                  <Td className="hidden md:table-cell">{item.created_count}</Td>
                  <Td className="hidden md:table-cell">{item.error_count}</Td>
                  <Td className="hidden max-w-40 truncate lg:table-cell">{item.created_by.name}</Td>
                  <Td className="hidden whitespace-nowrap md:table-cell">
                    {formatDateTime(item.created_at)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Pagination
            page={data.page}
            totalPages={totalPages}
            total={data.total}
            noun="importação(ões)"
            disabled={isFetching}
            onChange={setPage}
          />
        </div>
      )}
    </Card>
  );
}
