# Testes — Frontend (crm-frontend)

## Status atual: `[BLOQUEADO]`

Este repositório ainda **não tem nenhum código** — só o `README.md`. Não existe
`package.json`, não existe projeto Vite/React iniciado, então não há nada para testar ainda.
Este arquivo não inventa comandos de um projeto que não existe; ele documenta o que precisa
acontecer antes e o formato que este guia vai assumir assim que houver código.

Ver status geral e dependências em [`crm-backend/CLAUDE.md`](../crm-backend/CLAUDE.md) seção
"Dependências para o frontend" e "STATUS DO PROJETO".

## O que já está pronto do lado do backend para o frontend consumir

Ver `crm-backend/test.md` para validar isso primeiro (é pré-requisito para testar qualquer
fluxo do frontend que fale com a API):

- `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`
- `GET /v1/users/me`
- Contrato de erro padronizado `{ error: { code, message, details } }`
- Swagger em `http://localhost:3000/docs` como referência viva do contrato

## O que falta antes de este arquivo fazer sentido

1. Inicializar o projeto conforme `crm-spec/docs/06-frontend/frontend-architecture.md`
   (Vite + React + TypeScript + Tailwind + TanStack Query + React Hook Form/Zod; PWA via
   plugin do Vite).
2. Implementar o fluxo vertical inicial combinado no plano da Fase 1 do backend: tela de
   login → sessão → área protegida — consumindo os endpoints listados acima.
3. Só então este `test.md` será preenchido no mesmo padrão do backend (sequencial, Windows
   first, cmd/PowerShell, pré-requisitos → `.env` → instalação → cada camada de teste →
   smoke test manual).

## Formato que este arquivo vai seguir (referência, não execute ainda)

Quando o projeto existir, a estrutura esperada aqui é:

1. Pré-requisitos (Node — mesma versão do backend, ver `crm-backend/.nvmrc`)
2. Instalação (`npm install`) e `.env` do frontend (ex.: `VITE_API_URL=http://localhost:3000`)
3. Testes de componente (Vitest + Testing Library) — unidade, sem backend rodando
4. Testes E2E (Playwright, conforme `[DECISÃO PENDENTE]` em
   `crm-spec/docs/09-testing/testing-strategy.md` seção 1 — Playwright vs. Cypress ainda não
   confirmado) — precisa do `crm-backend` rodando (`npm run dev`, ver `crm-backend/test.md`
   seção 8) para os fluxos críticos: login, criar lead, converter em oportunidade, registrar
   atendimento (quando esses módulos existirem)
5. Smoke test manual no navegador

## Próxima ação

Não escrever testes de frontend nem este guia em detalhe antes de existir o projeto e o
fluxo vertical de login. Prioridade atual (ver `crm-backend/CLAUDE.md`): validar a Fase 1 do
backend com Docker real (`crm-backend/test.md`) antes de decidir se o próximo passo é iniciar
este repositório.
