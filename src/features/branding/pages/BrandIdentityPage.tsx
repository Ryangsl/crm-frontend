import { ImageOff, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { BrandingEditorFields, Preview, Swatches, ThemeLabel } from '../components/BrandingFields';
import { BrandingRequestPanel } from '../components/BrandingRequestPanel';
import { useBrandingQuery, useResetBranding, useUpdateBranding } from '../hooks/useBranding';
import type { Branding, BrandingColors, BrandingProposal, BrandingTheme } from '../types/branding';

function errorDetails(error: unknown): string[] {
  if (error instanceof ApiError && error.details.length > 0) {
    return error.details.map((detail) => `${detail.field}: ${detail.issue}`);
  }
  return [error instanceof Error ? error.message : 'Não foi possível salvar.'];
}

interface Draft {
  version: number;
  values: { display_name: string; theme: BrandingTheme; colors: BrandingColors } | null;
}

// D-086: a identidade visual e um servico administrado pelo CRM Universal. Tres modos, pelas permissoes:
// a plataforma (`branding:manage`) aplica e restaura, e pode carregar a proposta da solicitacao no
// editor; o Admin da empresa (`branding:request`) ve e propoe; quem tem `branding:read` (ex.: Diretor)
// so ve. O backend decide em todos os casos.
export function BrandIdentityPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('branding:manage');
  const canRead = hasPermission('branding:read') || canManage;
  const canRequest = hasPermission('branding:request');
  const { data, isLoading, isError, refetch } = useBrandingQuery(canRead);
  const [toast, setToast] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ version: 0, values: null });

  function loadProposal(proposal: BrandingProposal) {
    setDraft((current) => ({
      version: current.version + 1,
      values: {
        display_name: proposal.display_name ?? data?.display_name ?? '',
        theme: proposal.theme,
        colors: proposal.colors,
      },
    }));
    setToast('Proposta carregada no editor. Revise e salve para aplicar.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const header = (
    <header className="flex flex-col gap-1">
      <Breadcrumb
        items={[{ label: 'Configurações', to: '/settings' }, { label: 'Identidade Visual' }]}
      />
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Identidade Visual</h1>
      <p className="text-sm text-neutral-500">
        {canManage
          ? 'Nome, cores e tema desta empresa. Módulos, telas, regras e permissões continuam os mesmos.'
          : 'A identidade visual é configurada pela equipe do CRM Universal.'}
      </p>
    </header>
  );

  if (!canRead) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para ver a identidade visual da empresa.
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      {isLoading && <Spinner />}
      {isError && (
        <Alert tone="danger" title="Não foi possível carregar a identidade visual">
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      )}
      {data && canManage && (
        <BrandIdentityForm
          key={`${data.updated_at ?? 'padrao'}-${draft.version}`}
          branding={data}
          initial={draft.values}
          onSaved={() => setToast('Identidade visual salva.')}
          onReset={() => setToast('Identidade padrão restaurada.')}
        />
      )}
      {data && !canManage && <CurrentIdentity branding={data} />}
      {data && (
        <BrandingRequestPanel
          key={data.updated_at ?? 'padrao'}
          current={data}
          canRequest={canRequest && !canManage}
          canDismiss={canManage}
          onSent={() => setToast('Solicitação enviada à equipe do CRM Universal.')}
          onUseProposal={canManage ? loadProposal : undefined}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// Consulta da identidade em uso, sem nenhum controle de edicao.
function CurrentIdentity({ branding }: { branding: Branding }) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-3">
      <Card title="Identidade atual" className="xl:col-span-2">
        <dl className="mb-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">Nome de exibição</dt>
            <dd className="font-medium text-neutral-900">{branding.display_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Tema</dt>
            <dd className="font-medium text-neutral-900">
              <ThemeLabel theme={branding.theme} />
              {branding.is_default ? ' · identidade padrão do CRM Universal' : ''}
            </dd>
          </div>
        </dl>
        <Swatches colors={branding.colors} />
      </Card>
      <Card title="Pré-visualização">
        <Preview name={branding.display_name} colors={branding.colors} />
      </Card>
    </div>
  );
}

// Nasce com os valores salvos (ou com a proposta carregada); salvar ou restaurar gera nova versao e o
// formulario reinicia com ela.
function BrandIdentityForm({
  branding: data,
  initial,
  onSaved,
  onReset,
}: {
  branding: Branding;
  initial: Draft['values'];
  onSaved: () => void;
  onReset: () => void;
}) {
  const update = useUpdateBranding();
  const reset = useResetBranding();
  const [name, setName] = useState(initial?.display_name ?? data.display_name);
  const [theme, setTheme] = useState<BrandingTheme>(initial?.theme ?? data.theme);
  const [colors, setColors] = useState<BrandingColors>(initial?.colors ?? data.colors);
  const [confirming, setConfirming] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await update.mutateAsync({ display_name: name.trim() || null, theme, colors });
    onSaved();
  }

  async function handleReset() {
    setConfirming(false);
    await reset.mutateAsync();
    onReset();
  }

  return (
    <>
      <form
        onSubmit={(event) => void handleSubmit(event).catch(() => undefined)}
        className="grid items-start gap-4 xl:grid-cols-3"
      >
        <div className="flex flex-col gap-4 xl:col-span-2">
          {initial && (
            <Alert tone="info" title="Proposta carregada">
              Estes valores vieram da solicitação. Salvar aplica a identidade e encerra a
              solicitação.
            </Alert>
          )}
          <BrandingEditorFields
            idPrefix="apply"
            name={name}
            theme={theme}
            colors={colors}
            onName={setName}
            onTheme={setTheme}
            onColors={setColors}
          />
          <div className="border-border-subtle rounded-control flex gap-3 border border-dashed p-3">
            <ImageOff aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-neutral-500" />
            <div>
              <p className="font-medium text-neutral-800">Logotipo e favicon</p>
              <p className="text-xs text-neutral-500">
                Ainda indisponíveis: o CRM não tem envio seguro de arquivos. Enquanto isso, a
                interface usa as iniciais da empresa.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-0">
          <Card title="Pré-visualização">
            <Preview name={name || data.display_name} colors={colors} />
          </Card>

          {update.isError && (
            <Alert tone="danger" title="Ajuste as cores para manter a leitura">
              <ul className="list-inside list-disc">
                {errorDetails(update.error).map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </Alert>
          )}
          {reset.isError && (
            <Alert tone="danger" title="Não foi possível restaurar o padrão">
              {errorDetails(reset.error)[0]}
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button writes type="submit" loading={update.isPending} disabled={update.isPending}>
              Salvar alterações
            </Button>
            <Button
              writes
              type="button"
              variant="secondary"
              disabled={data.is_default || reset.isPending}
              onClick={() => setConfirming(true)}
            >
              <RotateCcw aria-hidden="true" className="size-4" /> Restaurar padrão
            </Button>
          </div>
        </div>
      </form>

      {confirming && (
        <Modal
          title="Restaurar a identidade padrão?"
          onClose={() => setConfirming(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
              <Button writes onClick={() => void handleReset().catch(() => undefined)}>
                Restaurar
              </Button>
            </>
          }
        >
          Nome e cores personalizados serão descartados e a empresa volta à identidade do CRM
          Universal. Nenhum outro dado é alterado.
        </Modal>
      )}
    </>
  );
}
