export type BrandingTheme = 'light' | 'dark';

export interface BrandingColors {
  primary: string;
  secondary: string;
  button: string;
  sidebar: string;
  background: string;
  surface: string;
  text: string;
}

export interface Branding {
  display_name: string;
  theme: BrandingTheme;
  colors: BrandingColors;
  // Sempre nulos por enquanto: nao existe upload seguro de arquivos (D-086).
  logo_url: string | null;
  favicon_url: string | null;
  is_default: boolean;
  updated_at: string | null;
}

// Proposta estruturada da solicitacao (nome, tema e cores), validada pelo backend como na aplicacao.
export interface BrandingProposal {
  display_name: string | null;
  theme: BrandingTheme;
  colors: BrandingColors;
}

export interface BrandingRequestState {
  pending: {
    message: string;
    proposal: BrandingProposal | null;
    requested_at: string;
    requested_by: { id: string; name: string | null };
  } | null;
}

export interface BrandingRequestInput {
  message?: string;
  proposal?: BrandingProposal;
}

export interface BrandingInput {
  display_name: string | null;
  theme: BrandingTheme;
  colors: BrandingColors;
}
