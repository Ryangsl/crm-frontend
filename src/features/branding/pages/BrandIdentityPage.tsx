import { ImageOff, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/services/api';
import { BrandingRequestPanel } from '../components/BrandingRequestPanel';
import { useBrandingQuery, useResetBranding, useUpdateBranding } from '../hooks/useBranding';
import { deriveThemeVars, DEFAULT_COLORS } from '../lib/theme';
import type { Branding, BrandingColors, BrandingTheme } from '../types/branding';

const COLOR_FIELDS: Array<{ key: keyof BrandingColors; label: string; hint: string }> = [
  { key: 'primary', label: 'Cor primária', hint: 'Links, foco e destaques.' },
  { key: 'secondary', label: 'Cor secundária', hint: 'Textos de apoio.' },
  { key: 'button', label: 'Botões principais', hint: 'O texto do botão se ajusta sozinho.' },
  { key: 'sidebar', label: 'Barra lateral', hint: 'O texto do menu se ajusta sozinho.' },
  { key: 'background', label: 'Fundo', hint: 'Atrás do conteúdo.' },
  { key: 'surface', label: 'Superfícies', hint: 'Cartões, tabelas e campos.' },
  { key: 'text', label: 'Texto', hint: 'Títulos e texto principal.' },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        type="color"
        aria-label={`${label}: seletor`}
        value={HEX.test(value) ? value : DEFAULT_COLORS.light.text}
        onChange={(event) => onChange(event.target.value)}
        className="border-border-strong rounded-control min-h-touch lg:min-h-control mt-6 w-12 shrink-0 cursor-pointer border bg-transparent p-1"
      />
      <div className="min-w-0 flex-1">
        <Input
          label={label}
          hint={hint}
          value={value}
          maxLength={7}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

// Amostra com as cores do formulario, antes de salvar. As variaveis valem so dentro deste bloco.
function Preview({ name, colors }: { name: string; colors: BrandingColors }) {
  const vars = useMemo(
    () => (Object.values(colors).every((c) => HEX.test(c)) ? deriveThemeVars(colors) : null),
    [colors],
  );
  if (!vars) return <p className="text-neutral-500">Informe cores no formato #RRGGBB.</p>;
  return (
    <div
      data-testid="brand-preview"
      style={vars as CSSProperties}
      className="border-border-subtle rounded-control bg-background flex overflow-hidden border"
    >
      <div className="bg-sidebar flex w-24 shrink-0 flex-col gap-1 p-2 text-xs sm:w-32">
        <span className="text-sidebar-ink mb-1 truncate font-semibold">{name}</span>
        <span className="bg-sidebar-active text-on-sidebar-active rounded px-2 py-1">Início</span>
        <span className="text-sidebar-muted px-2 py-1">Leads</span>
        <span className="text-sidebar-muted px-2 py-1">Clientes</span>
      </div>
      <div className="min-w-0 flex-1 p-3">
        <p className="text-base font-semibold text-neutral-900">Título</p>
        <p className="mb-2 text-xs text-neutral-500">Texto de apoio</p>
        <div className="bg-surface border-border-subtle rounded-control flex flex-wrap items-center gap-2 border p-2">
          <span className="bg-button text-on-button rounded-control px-3 py-1.5 text-xs font-medium">
            Botão
          </span>
          <span className="text-brand-700 text-xs underline">Link</span>
          <span className="text-xs text-neutral-900">Conteúdo</span>
        </div>
      </div>
    </div>
  );
}

function errorDetails(error: unknown): string[] {
  if (error instanceof ApiError && error.details.length > 0) {
    return error.details.map((detail) => `${detail.field}: ${detail.issue}`);
  }
  return [error instanceof Error ? error.message : 'Não foi possível salvar.'];
}

// D-086: a identidade visual e um servico administrado pelo CRM Universal. Tres modos, pelas permissoes:
// a plataforma (`branding:manage`) aplica e restaura; o Admin da empresa (`branding:request`) ve e
// solicita; quem tem `branding:read` (ex.: Diretor) so ve. O backend decide em todos os casos.
export function BrandIdentityPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('branding:manage');
  const canRead = hasPermission('branding:read') || canManage;
  const canRequest = hasPermission('branding:request');
  const { data, isLoading, isError, refetch } = useBrandingQuery(canRead);
  const [toast, setToast] = useState<string | null>(null);

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
          key={data.updated_at ?? 'padrao'}
          branding={data}
          onSaved={() => setToast('Identidade visual salva.')}
          onReset={() => setToast('Identidade padrão restaurada.')}
        />
      )}
      {data && !canManage && <CurrentIdentity branding={data} />}
      {data && (
        <BrandingRequestPanel
          canRequest={canRequest && !canManage}
          canDismiss={canManage}
          onSent={() => setToast('Solicitação enviada à equipe do CRM Universal.')}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

const SWATCHES: Array<{ key: keyof BrandingColors; label: string }> = [
  { key: 'primary', label: 'Primária' },
  { key: 'secondary', label: 'Secundária' },
  { key: 'button', label: 'Botões' },
  { key: 'sidebar', label: 'Barra lateral' },
  { key: 'background', label: 'Fundo' },
  { key: 'surface', label: 'Superfícies' },
  { key: 'text', label: 'Texto' },
];

// Consulta da identidade em uso, sem nenhum controle de edicao.
function CurrentIdentity({ branding }: { branding: Branding }) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-3">
      <Card title="Identidade atual" className="xl:col-span-2">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-neutral-500">Nome de exibição</dt>
            <dd className="font-medium text-neutral-900">{branding.display_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Tema</dt>
            <dd className="font-medium text-neutral-900">
              {branding.theme === 'light' ? 'Claro' : 'Escuro'}
              {branding.is_default ? ' · identidade padrão do CRM Universal' : ''}
            </dd>
          </div>
        </dl>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map((swatch) => (
            <li key={swatch.key} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="border-border-strong rounded-control size-8 shrink-0 border"
                style={{ backgroundColor: branding.colors[swatch.key] }}
              />
              <span className="min-w-0">
                <span className="block text-xs text-neutral-500">{swatch.label}</span>
                <span className="block text-xs font-medium text-neutral-900">
                  {branding.colors[swatch.key]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Pré-visualização">
        <Preview name={branding.display_name} colors={branding.colors} />
      </Card>
    </div>
  );
}

// Nasce com os valores salvos; salvar ou restaurar gera nova versao e o formulario reinicia com ela.
function BrandIdentityForm({
  branding: data,
  onSaved,
  onReset,
}: {
  branding: Branding;
  onSaved: () => void;
  onReset: () => void;
}) {
  const update = useUpdateBranding();
  const reset = useResetBranding();
  const [name, setName] = useState(data.display_name);
  const [theme, setTheme] = useState<BrandingTheme>(data.theme);
  const [colors, setColors] = useState<BrandingColors>(data.colors);
  const [confirming, setConfirming] = useState(false);

  function chooseTheme(next: BrandingTheme) {
    setTheme(next);
    setColors(DEFAULT_COLORS[next]);
  }

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
          <Card title="Empresa">
            <div className="flex flex-col gap-4">
              <Input
                label="Nome de exibição"
                hint="Aparece na barra superior. Em branco, usa o nome da empresa."
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
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
          </Card>

          <Card title="Tema">
            <fieldset className="flex flex-wrap gap-4">
              <legend className="sr-only">Tema</legend>
              {(['light', 'dark'] as const).map((option) => (
                <label key={option} className="min-h-touch flex items-center gap-2 lg:min-h-0">
                  <input
                    type="radio"
                    name="theme"
                    checked={theme === option}
                    onChange={() => chooseTheme(option)}
                    className="size-4"
                  />
                  {option === 'light' ? 'Claro' : 'Escuro'}
                </label>
              ))}
            </fieldset>
            <p className="mt-2 text-xs text-neutral-500">
              Trocar o tema preenche as cores padrão daquele tema.
            </p>
          </Card>

          <Card title="Cores">
            <div className="grid gap-4 md:grid-cols-2">
              {COLOR_FIELDS.map((field) => (
                <ColorField
                  key={field.key}
                  label={field.label}
                  hint={field.hint}
                  value={colors[field.key]}
                  onChange={(value) => setColors((current) => ({ ...current, [field.key]: value }))}
                />
              ))}
            </div>
          </Card>
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
