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

export interface BrandingRequestState {
  pending: {
    message: string;
    requested_at: string;
    requested_by: { id: string; name: string | null };
  } | null;
}

export interface BrandingInput {
  display_name: string | null;
  theme: BrandingTheme;
  colors: BrandingColors;
}
