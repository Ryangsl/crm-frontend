import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Badge, StatusIndicator } from './Badge';
import { Breadcrumb } from './Breadcrumb';
import { Drawer, Modal } from './Dialog';
import { Dropdown } from './Dropdown';
import { Pagination } from './Pagination';
import { ProgressBar } from './ProgressBar';
import { Toast } from './Toast';

afterEach(cleanup);

describe('Pagination', () => {
  it('avanca, volta e respeita as pontas', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Pagination page={1} totalPages={2} total={25} noun="lead(s)" onChange={onChange} />,
    );
    expect(screen.getByText('Página 1 de 2 · 25 lead(s)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(onChange).toHaveBeenCalledWith(2);

    rerender(<Pagination page={2} totalPages={2} total={25} noun="lead(s)" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });
});

describe('Modal e Drawer', () => {
  it('Modal: leva o foco para dentro, fecha com Esc e no fundo', () => {
    const onClose = vi.fn();
    render(
      <Modal title="Confirmar" onClose={onClose}>
        Texto
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Confirmar' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.activeElement).toBe(dialog);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('overlay-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('devolve o foco a quem abriu', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const { unmount } = render(
      <Drawer title="Menu" onClose={vi.fn()}>
        Itens
      </Drawer>,
    );
    expect(document.activeElement).not.toBe(opener);

    unmount();

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('Dropdown', () => {
  it('abre, fecha com Esc e ao escolher um item', () => {
    render(
      <Dropdown label="Empresa" trigger={<span>Abrir</span>}>
        <button type="button">Item</button>
      </Dropdown>,
    );
    const trigger = screen.getByRole('button', { name: 'Empresa' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Item' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('demais componentes', () => {
  it('Breadcrumb marca a página atual e não transforma ela em link', () => {
    render(
      <MemoryRouter>
        <Breadcrumb items={[{ label: 'Leads', to: '/leads' }, { label: 'João' }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Leads' })).toHaveAttribute('href', '/leads');
    expect(screen.getByText('João')).toHaveAttribute('aria-current', 'page');
  });

  it('ProgressBar limita o valor entre 0 e 100', () => {
    const { rerender } = render(<ProgressBar label="Uso" percent={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    rerender(<ProgressBar label="Uso" percent={-5} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('Badge e StatusIndicator levam o significado em texto', () => {
    render(
      <>
        <Badge tone="success">Ganha</Badge>
        <StatusIndicator tone="warning" label="Instável" />
      </>,
    );
    expect(screen.getByText('Ganha')).toBeInTheDocument();
    expect(screen.getByText('Instável')).toBeInTheDocument();
  });

  it('Toast e anunciado e some sozinho', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast message="Salvo." onClose={onClose} />);
    expect(screen.getByRole('status')).toHaveTextContent('Salvo.');

    vi.advanceTimersByTime(4000);

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('tokens', () => {
  // Cor literal so existe nos arquivos que definem a identidade. Componente nenhum usa hexadecimal.
  const SRC = join(__dirname, '..', '..');
  const ALLOWED = [
    'styles/index.css',
    'features/branding/lib/theme.ts',
    'components/brand/BrandMark.tsx',
  ];

  function sources(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) sources(full, out);
      else if (/\.(tsx?|css)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
    }
    return out;
  }

  it('nenhum componente usa cor literal', () => {
    const offenders = sources(SRC).filter((file) => {
      const relative = file.slice(SRC.length + 1).replace(/\\/g, '/');
      if (ALLOWED.includes(relative)) return false;
      return /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?!\w)|oklch\(|rgba?\(/.test(
        readFileSync(file, 'utf8'),
      );
    });
    expect(offenders).toEqual([]);
  });
});
