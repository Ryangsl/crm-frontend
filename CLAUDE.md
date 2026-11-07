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

**Restrição por horário (F4.7, D-082/D-083):** `features/access-control/`. O backend decide (`403 OUTSIDE_BUSINESS_HOURS`); a UI só informa: banner `AccessStatusBanner` no `AppShell` (a partir de `GET /v1/access-status`, reconsultado a cada minuto), `OutsideBusinessHoursAlert` nas telas de Leads e Conversas (sem "tentar novamente": repetir não muda o resultado), toggle global em `/settings/business-hours` (**só quem tem `tenant_settings:update`**, i.e. o Admin; o Gerente não vê botão) e a tela `/settings/access-exceptions` ("Liberações", `access_exceptions:manage` — Admin e Gerente). Não assumir que um recurso está liberado: nunca esconder/mostrar acesso por conta própria, só pelo status devolvido. Testes: `features/access-control/**` e `AppShell.access-control.test.tsx`; testes que renderizam telas de Leads/Conversas com erro 403 usam `OutsideBusinessHours.test.tsx` como modelo.

**Trial e planos (D-085):** `features/plan/`. O backend decide (`403 TRIAL_EXPIRED`, `TRIAL_NOT_STARTED`, `PLAN_LIMIT_REACHED`, `FEATURE_NOT_AVAILABLE`, sem encerrar a sessão); a UI só apresenta o que `GET /v1/plan` e `GET /v1/plan/usage` devolvem. `PlanAccessProvider` (no `AppShell`) desabilita as ações de escrita e mostra o aviso quando a API recusa. **Toda ação nova que altera dados usa `<Button writes>`**; navegação, filtros, paginação e "tentar novamente" não usam. Falha ao consultar o plano nunca bloqueia nada. Modo de consulta aparece em toda tela (`TrialShellNotice`); o aviso dos últimos dias só no Início. Não há checkout: `VITE_SALES_CONTACT_URL` é opcional. Armazenamento vem com `monitored: false`: mostrar o limite configurado, nunca zero como consumo. Testes: `features/plan/plan.test.tsx`; testes do `AppShell` consultam o plano.

**Identidade visual e tema por tenant (D-086, ADR-011):** cor só por token (`src/styles/index.css`); `design-system.test.tsx` falha com cor literal fora de `styles/index.css`, `features/branding/lib/theme.ts` e `components/brand/`. A identidade do tenant (`GET /v1/branding`) é aplicada pelo `BrandingApplier` no `AppShell` e limpa ao sair; a padrão não escreve nada. A tela de Identidade Visual tem três modos: `branding:manage` (plataforma) edita; `branding:request` (Admin) vê e solicita; `branding:read` (Diretor) só vê. Componentes do design system em `components/ui` (Table, Pagination, Badge, Modal/Drawer, Dropdown, Toast...): reutilize antes de criar outro. Navegação: sidebar a partir de `lg`; abaixo disso, barra inferior com 4 atalhos + "Mais" (não adicione itens nela). Painel inicial só com dados reais (`GET /v1/dashboard/summary`).

**Endereço da empresa (D-088, ADR-012):** o endereço aberto no navegador identifica a empresa no login, então a API é chamada **na mesma origem** (`VITE_API_URL` vazio; o proxy do Vite encaminha `/v1` ao backend sem trocar o `Host`). Em desenvolvimento, abra `http://exemplo.localhost:5173` ou `http://trial.localhost:5173` (seed do backend), nunca `localhost:5173` nem uma API em `localhost:3000`. Nenhuma chamada envia tenant. A tela de login mostra a empresa de `GET /v1/auth/tenant` e trata `404 TENANT_DOMAIN_NOT_FOUND`.

**Menu e visibilidade (D-087, D-089):** a seção Administração do `AppShell` aparece só para quem tem o papel `admin` (`user.roles`); Liberações ficam no menu principal para o Gerente. Nomes de colegas (responsáveis, seletores de atribuição e de liberação) vêm de `GET /v1/users/directory`, nunca da lista completa, que é só do Admin. O proxy do Vite repassa `/v1` e `/health`.

**Usuários (D-087, D-093, D-064):** `features/users/`. Consulta, criação, edição de nome e papéis, desativação, **reativação** (inativos, `users:delete`) e **link de senha** (ativos, outra pessoa, `users:update`). O backend decide a concessão (`403 ROLE_ASSIGNMENT_FORBIDDEN`/`USER_MANAGEMENT_FORBIDDEN`, `409 LAST_ADMIN`, `PLAN_LIMIT_REACHED`); `lib/access.ts` só antecipa o motivo de uma opção indisponível e traduz os erros. O link de senha (`/redefinir-senha#token=...`, montado em `lib/reset-link.ts`) é mostrado **uma vez** (`PasswordLinkModal`) e nunca guardado. Testes: `features/users/pages/UsersPage.test.tsx`.

**Leads (D-094):** `LeadForm` tem nome, telefone, e-mail, CPF/CNPJ e origem (`lib/lead-input.ts` valida e monta o corpo). A tela exige nome, origem e telefone ou e-mail; a API aceita sem (importação). Sem origem cadastrada, o formulário orienta a cadastrar em `/settings/lead-sources` (Configurações > Origens de Lead, `lead_sources:*`).

**Conta e senha (D-064):** `/account` (Minha conta, no menu da empresa) troca a própria senha e guarda o access token novo da resposta. `/redefinir-senha` é **pública**: lê o token do fragmento (`#token=`), apaga-o da barra de endereço e chama `/v1/auth/password-reset[/check]`. Sem "esqueci minha senha" por e-mail (não há provedor): o login orienta a pedir o link ao Admin.

**Várias abas (D-091):** toda renovação de sessão passa por `refreshAccessToken()` em `services/api.ts`, que serializa as renovações **entre abas** com Web Lock (`navigator.locks`) e dentro da aba com uma promise única. Não crie outro caminho de `POST /v1/auth/refresh`. Entrar/sair é avisado às outras abas por BroadcastChannel no `AuthProvider` (sem token na mensagem). Nada de token em `localStorage`/`sessionStorage`. Testes: `services/api.multi-tab.test.ts`, `AuthProvider.multi-tab.test.tsx`.

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
