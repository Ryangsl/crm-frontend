import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('monta a aplicacao e renderiza a navegacao principal', () => {
    render(<App />);
    expect(screen.getAllByRole('navigation', { name: 'Principal' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /fundacao tecnica/i })).toBeInTheDocument();
  });
});
