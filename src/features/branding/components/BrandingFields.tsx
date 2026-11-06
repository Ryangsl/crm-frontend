import { useMemo } from 'react';
import type { CSSProperties } from 'react';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { deriveThemeVars, DEFAULT_COLORS } from '../lib/theme';
import type { BrandingColors, BrandingTheme } from '../types/branding';

// Campos, amostra e consulta da identidade visual, usados por quem aplica (plataforma) e por quem
// propoe (Admin da empresa). As regras de contraste sao do backend; aqui so se monta o pedido.
const COLOR_FIELDS: Array<{ key: keyof BrandingColors; label: string; hint: string }> = [
  { key: 'primary', label: 'Cor primária', hint: 'Links, foco e destaques.' },
  { key: 'secondary', label: 'Cor secundária', hint: 'Textos de apoio.' },
  { key: 'button', label: 'Botões principais', hint: 'O texto do botão se ajusta sozinho.' },
  { key: 'sidebar', label: 'Barra lateral', hint: 'O texto do menu se ajusta sozinho.' },
  { key: 'background', label: 'Fundo', hint: 'Atrás do conteúdo.' },
  { key: 'surface', label: 'Superfícies', hint: 'Cartões, tabelas e campos.' },
  { key: 'text', label: 'Texto', hint: 'Títulos e texto principal.' },
];

const SWATCHES: Array<{ key: keyof BrandingColors; label: string }> = [
  { key: 'primary', label: 'Primária' },
  { key: 'secondary', label: 'Secundária' },
  { key: 'button', label: 'Botões' },
  { key: 'sidebar', label: 'Barra lateral' },
  { key: 'background', label: 'Fundo' },
  { key: 'surface', label: 'Superfícies' },
  { key: 'text', label: 'Texto' },
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

// Amostra com as cores informadas, antes de salvar. As variaveis valem so dentro deste bloco.
export function Preview({ name, colors }: { name: string; colors: BrandingColors }) {
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

export function Swatches({ colors }: { colors: BrandingColors }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SWATCHES.map((swatch) => (
        <li key={swatch.key} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="border-border-strong rounded-control size-8 shrink-0 border"
            style={{ backgroundColor: colors[swatch.key] }}
          />
          <span className="min-w-0">
            <span className="block text-xs text-neutral-500">{swatch.label}</span>
            <span className="block text-xs font-medium text-neutral-900">{colors[swatch.key]}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ThemeLabel({ theme }: { theme: BrandingTheme }) {
  return <>{theme === 'light' ? 'Claro' : 'Escuro'}</>;
}

// Nome, tema e cores controlados por quem usa. `idPrefix` evita nomes de radio repetidos quando dois
// conjuntos de campos estao na mesma tela.
export function BrandingEditorFields({
  idPrefix,
  name,
  theme,
  colors,
  onName,
  onTheme,
  onColors,
}: {
  idPrefix: string;
  name: string;
  theme: BrandingTheme;
  colors: BrandingColors;
  onName: (value: string) => void;
  onTheme: (value: BrandingTheme) => void;
  onColors: (value: BrandingColors) => void;
}) {
  return (
    <>
      <Card title="Empresa">
        <Input
          label="Nome de exibição"
          hint="Aparece na barra superior. Em branco, usa o nome da empresa."
          value={name}
          maxLength={80}
          onChange={(event) => onName(event.target.value)}
        />
      </Card>
      <Card title="Tema">
        <fieldset className="flex flex-wrap gap-4">
          <legend className="sr-only">Tema</legend>
          {(['light', 'dark'] as const).map((option) => (
            <label key={option} className="min-h-touch flex items-center gap-2 lg:min-h-0">
              <input
                type="radio"
                name={`${idPrefix}-theme`}
                checked={theme === option}
                onChange={() => {
                  onTheme(option);
                  onColors(DEFAULT_COLORS[option]);
                }}
                className="size-4"
              />
              <ThemeLabel theme={option} />
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
              onChange={(value) => onColors({ ...colors, [field.key]: value })}
            />
          ))}
        </div>
      </Card>
    </>
  );
}
