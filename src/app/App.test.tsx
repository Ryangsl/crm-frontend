import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Sem cookie de sessao valido (ambiente de teste nao tem backend nem sessao previa),
  // o refresh inicial falha e o ProtectedRoute redireciona para /login (D-066) — a
  // navegacao principal e a Home so aparecem depois de autenticado.
  it('sem sessao autenticada, redireciona para a tela de login', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'x' } }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
    );

    render(<App />);

    expect(await screen.findByRole('heading', { name: /entrar/i })).toBeInTheDocument();
  });
});
