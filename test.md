# Testes — Frontend (crm-frontend)

## Status atual: `FUNDAÇÃO PRONTA`

O projeto existe e os testes rodam. A estratégia completa está em
[`crm-spec/docs/09-testing/testing-strategy.md`](../crm-spec/docs/09-testing/testing-strategy.md).

## Como rodar

```bash
npm install
npm test          # roda uma vez
npm run test:watch
```

Não é preciso backend nem Docker para os testes atuais — nenhum deles faz rede.

## O que existe hoje (Fase 1)

| Suíte | Cobre |
|---|---|
| `src/components/ui/Button.test.tsx` | Renderização, clique e bloqueio durante `loading` |
| `src/app/App.test.tsx` | A aplicação monta, roteamento e navegação principal respondem |

Ferramentas: **Vitest** + **Testing Library** (unit/componente) e **jsdom**.

## O que ainda não existe — e por quê

- **E2E (Playwright)**: [D-020](../crm-spec/docs/00-governance/decision-register.md#d-020--ferramenta-de-e2e-de-frontend)
  já decidiu a ferramenta, mas os fluxos críticos que a estratégia manda cobrir (login, criar
  lead, converter em oportunidade, registrar atendimento) só passam a existir da Fase 2 em
  diante. Montar E2E agora seria testar uma vitrine de componentes.
- **Testes de formulário/validação**: chegam com o primeiro formulário real (Fase 2).
- **Testes de permissão na UI**: dependem de RBAC no frontend (Fase 2).

## Regra ao adicionar tela nova

Todo componente que consome dado assíncrono precisa de teste dos três estados obrigatórios —
**loading, empty e error** ([frontend-architecture](../crm-spec/docs/06-frontend/frontend-architecture.md)
seção 5).
