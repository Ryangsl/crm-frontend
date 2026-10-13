# CLAUDE.md — crm-frontend

Guia operacional deste repositório. Não duplica `crm-spec` — aponta para lá. O guia geral do
agente de frontend está em
[`crm-spec/agents/codex-frontend.md`](../crm-spec/agents/codex-frontend.md).

## STATUS

| Item | Status | Nota |
|---|---|---|
| Fase 1 — fundação | `[CONCLUÍDO]` | Vite + React 19 + TS + Tailwind 4 + PWA; build/lint/testes verdes |
| Roteamento | `[CONCLUÍDO]` | React Router, com AppShell e 404 |
| Design system base | `[CONCLUÍDO]` | Button, Input, Card, Alert, Spinner, EmptyState + tokens |
| Mobile First | `[CONCLUÍDO]` | bottom navigation até `md`, sidebar a partir de `lg`; alvo de toque 44px |
| PWA | `[CONCLUÍDO]` | manifest + service worker gerados no build (offline só de leitura — D-041) |
| Estado global | `[CONCLUÍDO]` | Context API (D-018); estado de servidor no TanStack Query |
| Camada de API | `[CONCLUÍDO]` | `services/api.ts` — só HTTP, sem regra de negócio; `credentials:'include'` já ligado (backend entrega refresh token em cookie httpOnly) |
| Estrutura por feature (`features/<domínio>/`) | `[CONCLUÍDO]` | reorganizado ao fechar a Fase 2 do backend, antes das entidades da Fase 3 chegarem — ver README |
| Backend da Fase 2 (auth/usuários/tenants) | `[PRONTO NA API]` | login/refresh/logout/logout-all, CRUD de usuários — tudo por `curl`/Postgres, nenhuma tela ainda (decisão formal: [D-063](../crm-spec/docs/00-governance/decision-register.md#d-063--fase-2-não-exige-interface-mínima-opção-b), Fase 2 não exige UI) |
| Autenticação na UI | `[PENDENTE — sem fase associada]` | Bearer em memória + refresh por cookie httpOnly (ADR-008); constrói quando a UI de negócio começar, não amarrado a um número de fase |
| RBAC na UI | `[PENDENTE — sem fase associada]` | idem acima |
| Telas de negócio (leads, pipeline, atendimento) | `[PENDENTE]` | Fases 3 e 4 |
| E2E (Playwright) | `[PENDENTE]` | D-020 decidiu a ferramenta; os fluxos só existem na Fase 2 — ver `test.md` |
| Paleta de marca | `[BLOQUEADO]` | D-043 — validação de negócio; hoje há paleta neutra em tokens |

## FASES 3–4 — ESTADO E REGRAS DA UI (resumo; fonte de verdade: `crm-spec/PROJECT-CONTEXT.md`)

> A tabela acima é histórica (Fases 1–2). Hoje existem telas de negócio de Customers, Leads, Opportunities/Pipeline, follow-up (Notes/Tasks/Appointments), disponibilidade (seletor + `/team/availability`), configurações (`/settings/business-hours`), histórico (`TimelineSection`) e conversas (F4.6).

**Conversas (F4.6, D-081):**
- Rotas `/conversations` (lista) e `/conversations/:id` (contexto CRM, responsável, encerrar/reabrir, mensagens com cursor). O item de menu só aparece com `conversations:read`; a seção "Conversas" (`EntityConversationsSection`) fica no detalhe de Cliente, Lead e Oportunidade e é o ponto de entrada para abrir uma conversa.
- A UI é do **core agnóstico de canal**: registra mensagens **manualmente** (direção opcional). Não há envio a canal, status de entrega, anexo, tempo real, inbox omnichannel nem tela de configuração de canal — tudo isso é da Fase 5. Não adicionar.
- Atribuição é **manual** (`conversations:assign`); o seletor de usuários só aparece com `users:read`. Permissão na UI é apenas UX; o backend é a autoridade.
- Mensagens vêm da API da mais recente para a mais antiga (cursor opaco `next_cursor`, nunca montado no cliente); a tela inverte para ordem cronológica e oferece "Carregar anteriores".
- Testes de conversas usam o helper `features/conversations/testing.tsx`.
- O backend devolve `context.*` (nome/estado de Cliente, Lead, Oportunidade) como `null` quando o usuário não tem a leitura do recurso (BR-32). A UI já cai em rótulos genéricos ("Ver cliente", título "Oportunidade"/"Conversa"): nunca assumir que o nome existe.

**Notificações (F4.5, D-080):** `NotificationBell` no `AppShell` (polling de 30 s; sem permissão própria; só o próprio usuário). **Qualquer teste que renderize o `AppShell` precisa de `QueryClientProvider` e do serviço de notificações mockado** (ver `AppShell.test.tsx`).

**Sessão × cache (regra):** o `AuthProvider` cancela as consultas e esvazia o cache do TanStack Query em todo fim efetivo de sessão (logout, logout-all, 401 após refresh falho, falha ao restaurar) e no login; renovar o token com sucesso **não** limpa. As chaves do React Query não incluem o usuário, então **não** remover essa limpeza nem criar outro caminho de encerramento de sessão que a ignore. Testes: `AuthProvider.session-cache.test.tsx`.

## Antes de implementar qualquer coisa

1. [Decision Register](../crm-spec/docs/00-governance/decision-register.md) — o que está
   decidido, adiado ou pendente de stakeholder.
2. [Contrato de API](../crm-spec/docs/05-api/openapi.yaml) — nunca invente endpoint ou
   formato de resposta.
3. [Design system](../crm-spec/docs/06-frontend/design-system.md) e
   [responsividade](../crm-spec/docs/06-frontend/responsive.md).

## Como rodar e testar

```bash
npm install
npm run dev     # http://localhost:5173 (backend precisa estar em :3000)
npm test        # Vitest
npm run lint
npm run build   # typecheck + build (gera sw.js e manifest)
```

## O que nunca fazer aqui

- Nunca acessar banco ou qualquer armazenamento fora da API.
- Nunca colocar regra de negócio crítica no frontend — quem decide é o backend.
- Nunca deixar componente assíncrono sem tratar **loading, empty e error**.
- Nunca usar cor literal: sempre token (`--color-brand-*`), porque a marca vai mudar (D-043).
- Nunca desenhar para desktop primeiro — Mobile First é requisito (RNF-12).
- Nunca antecipar fase: sem login, RBAC, CRUD, pipeline ou dashboard antes da fase deles.

## Estrutura

Ver [README.md](README.md). Cada `features/`/`pages/` novo espelha o vocabulário dos módulos
do backend (`crm-spec/docs/03-architecture/architecture.md` seção 2).
