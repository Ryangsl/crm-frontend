# crm-frontend

PWA **Mobile First** do CRM + Call Center SaaS. Consome exclusivamente a API do
`crm-backend`, pelos contratos de [`crm-spec/docs/05-api/`](../crm-spec/docs/05-api/).

> Fase atual: **1 — Fundação técnica**. Existe o esqueleto (roteamento, design system base,
> PWA, camada de acesso à API). **Não** existe tela de negócio: login, RBAC, leads, pipeline e
> dashboard chegam a partir da Fase 2 — ver
> [roadmap](../crm-spec/docs/10-roadmap/roadmap.md).

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · TanStack Query · React Router · vite-plugin-pwa

Decisões que governam este repositório: [ADR-007](../crm-spec/docs/adr/ADR-007.md) (React + PWA),
[D-018](../crm-spec/docs/00-governance/decision-register.md#d-018--estado-global-no-frontend)
(Context API, sem store externa),
[D-041](../crm-spec/docs/00-governance/decision-register.md#d-041--escopo-de-funcionamento-offline-do-pwa)
(offline só de leitura),
[D-043](../crm-spec/docs/00-governance/decision-register.md#d-043--paleta-de-marca) (paleta placeholder).

## Rodar

```bash
cp .env.example .env
npm install
npm run dev        # http://localhost:5173
```

O backend precisa estar de pé em `http://localhost:3000` (ver [README do workspace](../README.md)).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (hot reload) |
| `npm run build` | Typecheck + build de produção (gera service worker e manifest) |
| `npm run preview` | Serve o build localmente |
| `npm test` | Vitest (unit + componente) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Estrutura

```
src/
  app/          bootstrap, providers (TanStack Query + Context de UI)
  components/
    ui/         design system base (Button, Input, Card, Alert, Spinner, EmptyState)
    layout/     AppShell — bottom navigation no mobile, sidebar no desktop
  pages/        telas
  routes/       definição de rotas
  services/     acesso HTTP à API
  hooks/        hooks compartilhados
  types/        tipos de contrato
  styles/       tokens do design system (Tailwind @theme)
  test/         setup do Vitest
```

## Regras que não se quebram aqui

- Nunca acessar banco ou qualquer armazenamento fora da API.
- Nunca implementar regra de negócio crítica no frontend — a autoridade é do backend
  ([api-guidelines](../crm-spec/docs/05-api/api-guidelines.md) seção 10).
- Todo componente assíncrono trata **loading, empty e error**.
- Todo componente novo nasce mobile-first, com alvo de toque mínimo de 44px.
- Cor sempre por token (`--color-brand-*`), nunca literal — a marca ainda vai mudar (D-043).
