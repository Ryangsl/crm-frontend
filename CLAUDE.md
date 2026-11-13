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
| E2E (Playwright) | `[CONCLUÍDO — fluxo principal + acessibilidade]` | `e2e/`, `npm run test:e2e`, contra o backend real; no CI roda no job `browser-e2e` do `crm-backend` — ver o bloco "E2E de navegador" abaixo |
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

**Leads (D-094):** `LeadForm` tem nome, telefone, e-mail, CPF/CNPJ e origem (`lib/lead-input.ts` valida e monta o corpo). A tela exige nome, origem e telefone ou e-mail; a API aceita sem (importação). Sem origem cadastrada, o formulário orienta a cadastrar em `/settings/lead-sources` (Configurações > Origens de Lead, `lead_sources:*`). Na conversão, "Novo cliente" (`LeadConvertForm`) abre com nome, documento, telefone e e-mail do Lead como valores iniciais editáveis (`convertCustomerValues` em `lib/lead-input.ts`: `phone` → `primary_phone`, `email` → `primary_email`; dado ausente = campo vazio); cancelar desmonta o formulário, então reabrir volta aos dados do Lead.

**Importação de Leads (D-096):** `/leads/imports` (envio do CSV/XLSX com origem e responsável opcional, lista das importações) e `/leads/imports/:id` (andamento, contadores, motivo de interrupção, linhas com filtro e link para o Lead criado ou já existente); botão "Importar" na lista de Leads, com `leads:create` e `leads:read`. O backend processa em segundo plano (`202`); a tela só acompanha: `useLeadImportQuery` reconsulta a cada 2 s **enquanto** a importação está `queued`/`processing` (`isLeadImportRunning`) e para depois; as linhas recarregam a cada avanço de `processed_rows`; ao terminar, invalida `['leads']`. Motivos chegam como código (`reason`, `failure_code`) e são traduzidos em `lib/lead-import-labels.ts`. Envio multipart por `apiPostForm` (`services/api.ts`). Testes: `features/leads/pages/LeadImports.test.tsx`.

**Motivos de perda e de desqualificação (D-099):** `features/closing-reasons/`. Configurações > Motivos (`/settings/closing-reasons`) mostra as duas listas; todos leem, só quem tem `tenant_settings:update` cria, renomeia e exclui; "Outro" (`is_other`) não tem ações. Perder Oportunidade e desqualificar Lead usam `ClosingReasonFields` (seletor da lista + observação, que vira "Justificativa" obrigatória com "Outro") e enviam `{ reason_id, note? }` (`toChoice`); `isChoiceComplete` só antecipa o que o backend recusa (`422 CLOSING_REASON_INVALID`/`CLOSING_REASON_NOTE_REQUIRED`, traduzidos em `choiceErrorMessage`). O detalhe mostra o nome do motivo e a observação; registros antigos trazem o texto livre em `lost_reason`/`disqualify_reason`. Testes que abrem esses formulários mockam `@/features/closing-reasons/services` (`testing.ts` tem a lista de exemplo).

**Ficha de registro e textos (12/11/2026):** o detalhe de Lead, Cliente e Oportunidade usa `components/record/Record.tsx`: `RecordHeader` (caminho, título, selo e ações principais), `StageSteps` (onde o registro está no funil; o texto diz a etapa, a barra reforça), `RecordLayout` (coluna de trabalho com histórico, conversas e acompanhamento; ao lado, e primeiro no celular, o `SummaryCard` com os dados em `SummaryItem`). Tela nova de registro reutiliza esses componentes. **Texto de tela é português com acentos**: `src/ui-text.test.ts` falha se "Nao", "possivel", "Historico" e afins voltarem fora de comentário (comentários seguem sem acento). Nada de "tenant" em texto visível: use "empresa".

**Follow-ups, filtros e acessibilidade (12/11/2026):** `/follow-ups` abre em "Meus" (`assigned_to`/`user_id` = quem está logado) e alterna para "Da equipe"; cria **tarefa avulsa** (sem `entity_type`/`entity_id`) e conclui tarefa na própria lista; editar e excluir seguem no registro. Compromisso não tem título no contrato, então só é criado dentro de um registro. `TaskForm` sugere 9h do dia seguinte e deixa escolher o responsável pelo diretório. Toda escrita de tarefa invalida `['follow-up', 'tasks']` e `['tasks']`. Listas de Leads e Oportunidades têm `OwnerFilter` (`features/users`: Todos, Meus, colegas e, só em Leads, "Sem responsável" = `unassigned=true`; `lib/owner-filter.ts` traduz para a API). Lista vazia **com** filtro oferece "Limpar filtros"; **sem** filtro, a ação de cadastrar. Acessibilidade conferida com axe (WCAG 2 A/AA) nas telas principais: `--color-danger` é `#b91c1c` (o anterior não dava AA como texto do selo); dentro de `<dl>` só um nível de `<div>` com `<dt>`/`<dd>` (`SummaryItem`); texto auxiliar usa no mínimo `text-neutral-500` sobre fundo branco e `text-neutral-600` sobre fundo cinza (coluna do pipeline).

**Configuração pela tela (E1, 10/11/2026):** `/settings/availability` liga/desliga o mecanismo de disponibilidade (`GET/PUT /v1/tenant-settings/availability`, só o Admin altera; D-071/D-077/D-078) e invalida as consultas `availability` (seletor, menu Equipe e tela da equipe mudam sem recarregar). `/settings/pipelines` (`features/pipelines/`) cria, renomeia, torna padrão e exclui pipelines e cria, edita (nome, tipo trabalho/ganho/perda, exige valor), reordena (setas: troca o `order` com a vizinha, `lib/stages.ts`) e exclui etapas (RF-09); a leitura continua em `features/opportunities` (`usePipelinesQuery`). O backend decide (`409 PIPELINE_IN_USE`/`STAGE_IN_USE`, `422 STAGE_INVALID_FLAGS`). **Salto de etapa (D-032)** = existe etapa ativa entre origem e destino (`countStagesBetween`), nunca a diferença de `order`, que pode ter lacunas. Testes: `features/pipelines/**`, `AvailabilitySettingsPage.test.tsx`.

**Histórico de etapas (E2, RF-10):** o detalhe da Oportunidade mostra `StageHistorySection` (`GET /v1/opportunities/{id}/stage-history`, cursor opaco, "Carregar mais"): de/para, quem, quando e a justificativa do salto. Chave `['opportunities', 'stage-history', id]`, então mover/ganhar/perder já atualizam a lista.

**Timeline do Cliente consolidada (D-095):** no Cliente, `TimelineSection` mostra também as interações das Oportunidades dele (o backend decide e só envia com `opportunities:read`), marcadas com "· na oportunidade" e link; cada item traz `entity_type`/`entity_id`. Criar ou excluir interação invalida **todas** as timelines em cache (`['interactions', 'timeline']`). O Lead de origem continua fora (D-079).

**Conta e senha (D-064):** `/account` (Minha conta, no menu da empresa) troca a própria senha e guarda o access token novo da resposta. `/redefinir-senha` é **pública**: lê o token do fragmento (`#token=`), apaga-o da barra de endereço e chama `/v1/auth/password-reset[/check]`. Sem "esqueci minha senha" por e-mail (não há provedor): o login orienta a pedir o link ao Admin.

**Várias abas (D-091):** toda renovação de sessão passa por `refreshAccessToken()` em `services/api.ts`, que serializa as renovações **entre abas** com Web Lock (`navigator.locks`) e dentro da aba com uma promise única. Não crie outro caminho de `POST /v1/auth/refresh`. Entrar/sair é avisado às outras abas por BroadcastChannel no `AuthProvider` (sem token na mensagem). Nada de token em `localStorage`/`sessionStorage`. Testes: `services/api.multi-tab.test.ts`, `AuthProvider.multi-tab.test.tsx`.

**Captura de erros (D-101):** `features/monitoring/`. Sentry **desligado por padrão**: sem `VITE_SENTRY_DSN` (lida no build) `initErrorMonitoring()` (em `main.tsx`) não registra nada e o chunk do SDK não é baixado (fica fora do precache do PWA, `globIgnores` no `vite.config.ts`). Só `sentry-reporter.ts` importa `@sentry/react`, e só por import dinâmico; o resto usa `reportError`/`setMonitoringUser` de `monitoring.ts`. Erro de tela cai no `errorElement` das rotas de topo (`RouteErrorScreen`) ou no `AppErrorBoundary` (fora das rotas): mesma `ErrorScreen`, com "Recarregar". `ApiError` 4xx (inclusive 401 de sessão) nunca é reportado (`report-filter.ts`). Sai só `user.id`, a origem e o padrão da tela (`/leads/:id`); `scrub-event.ts` (`beforeSend`) remove requisição, query string, **fragmento** (`#token=`), corpo, cabeçalhos, breadcrumbs e dados do usuário. Dado sensível novo entra no `scrub-event.ts`, com caso em `monitoring.test.tsx`. Sem replay, sem integrações padrão. Runbook: `crm-spec/docs/08-devops/runbook-error-monitoring.md`.

**E2E de navegador (Playwright, D-020):** pasta `e2e/` (fora do Vitest; coberta por ESLint e `tsc`). Precisa do backend real com o seed e do frontend em `http://exemplo.localhost:5173`: `npm run test:e2e` (ou `E2E_WEB_SERVER=1 npm run test:e2e` para o Playwright subir o Vite; `E2E_BASE_URL` troca o endereço). Um worker só; cada grupo entra uma vez e reutiliza a página (o refresh é rotacionado, então não se copia sessão entre contextos). Em desenvolvimento, o backend limita logins (20/min por endereço): rodar a suíte várias vezes seguidas pode pedir `RATE_LIMIT_LOGIN_MAX` maior no backend, como o CI faz.
- `01-main-flow.spec.ts`: login → Lead (nome, telefone, origem) → qualificar → converter em Cliente novo → Oportunidade → ganhar → "Ganha" na tela, inclusive após recarregar. Dados com sufixo único por execução.
- `02-accessibility.spec.ts`: axe (WCAG 2 A e AA) em 15 telas autenticadas + diálogo aberto, em quatro identidades (padrão clara, **tema escuro**, personalizada clara, personalizada escura), e no login (sempre identidade padrão: a da empresa só vale após entrar). Mais: foco visível (contorno ≥ 2 px e contraste ≥ 3:1 com o fundo), diálogo (foco entra, fica dentro, Esc fecha, foco volta), menu por teclado, "Mais" no celular e 390 px sem rolagem horizontal.
- **Tema escuro no teste:** `e2e/support/branding.ts` responde ao `GET /v1/branding` com `page.route` (aplicar de verdade exige `branding:manage`, da plataforma). O caminho exercitado é o real do frontend (`BrandingApplier` → `deriveThemeVars`); gravação e validação no backend ficam com os e2e da API. Cores de estado do tema (`success`/`warning`/`danger`) passam por `ensureContrast` contra o próprio fundo suave; na barra lateral o contorno de foco usa `sidebar-ink`.
- Seletores só por papel e rótulo. Mudou rótulo de botão ou campo usado pela suíte: ajuste o spec no mesmo PR. Tela nova entra na lista `SCREENS`. No CI a suíte roda no `crm-backend` (job `browser-e2e`), não aqui: o backend é privado.

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
npm run test:e2e  # Playwright; precisa do backend real e do frontend em exemplo.localhost:5173
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
