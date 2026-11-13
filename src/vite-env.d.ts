/// <reference types="vite/client" />

// Variaveis de ambiente lidas no build (Vite). Todas opcionais; ver .env.example.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SALES_CONTACT_URL?: string;
  // D-101: captura de erros (Sentry). Sem DSN, desligada.
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
