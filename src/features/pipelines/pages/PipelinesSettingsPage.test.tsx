import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@/features/auth/auth-context';
import type { AuthState } from '@/features/auth/auth-context';
import * as opportunitiesService from '@/features/opportunities/services/opportunities';
import type { Pipeline, Stage } from '@/features/opportunities/types/opportunity';
import { ApiError } from '@/services/api';
import * as pipelinesService from '../services/pipelines';
import { PipelinesSettingsPage } from './PipelinesSettingsPage';

vi.mock('@/features/opportunities/services/opportunities');
vi.mock('../services/pipelines');

const ALL = ['pipelines:read', 'pipelines:create', 'pipelines:update', 'pipelines:delete'];

function stage(id: string, name: string, order: number, extra: Partial<Stage> = {}): Stage {
  return {
    id,
    pipeline_id: 'p1',
    name,
    order,
    is_won: false,
    is_lost: false,
    requires_value: false,
    created_at: '',
    updated_at: '',
    ...extra,
  };
}

const DEFAULT_PIPELINE: Pipeline = {
  id: 'p1',
  name: 'Pipeline Padrão',
  is_default: true,
  // Fora de ordem de propósito: a tela ordena por `order`.
  stages: [
    stage('s3', 'Proposta enviada', 3),
    stage('s1', 'Novo', 1),
    stage('s2', 'Em negociação', 2),
    stage('s4', 'Ganho', 4, { is_won: true }),
    stage('s5', 'Perdido', 5, { is_lost: true }),
  ],
  created_at: '',
  updated_at: '',
};

const EMPTY_PIPELINE: Pipeline = {
  id: 'p2',
  name: 'Corporativo',
  is_default: false,
  stages: [],
  created_at: '',
  updated_at: '',
};

function renderPage(permissions = ALL) {
  const auth: AuthState = {
    status: 'authenticated',
    user: { id: 'u1', name: 'Ana', email: 'ana@x.com', status: 'active', permissions, roles: [] },
    login: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    hasPermission: (key) => permissions.includes(key),
  };
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <PipelinesSettingsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function stageNames(pipelineName: string): string[] {
  const list = screen.getByRole('list', { name: `Etapas de ${pipelineName}` });
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.font-medium')?.textContent ?? '');
}

beforeEach(() => {
  vi.mocked(opportunitiesService.listPipelines).mockResolvedValue({
    data: [DEFAULT_PIPELINE, EMPTY_PIPELINE],
    page: 1,
    limit: 100,
    total: 2,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Pipelines e etapas (RF-09)', () => {
  it('lista os pipelines com as etapas em ordem, o padrão e o que falta para usar cada um', async () => {
    renderPage();
    expect(await screen.findByText('Pipeline Padrão')).toBeInTheDocument();
    expect(stageNames('Pipeline Padrão')).toEqual([
      'Novo',
      'Em negociação',
      'Proposta enviada',
      'Ganho',
      'Perdido',
    ]);
    expect(screen.getByText('Padrão')).toBeInTheDocument();

    // Pipeline novo, sem etapas: os três avisos.
    expect(screen.getByText(/Sem etapa de trabalho/)).toBeInTheDocument();
    expect(screen.getByText(/Sem etapa de ganho/)).toBeInTheDocument();
    expect(screen.getByText(/Sem etapa de perda/)).toBeInTheDocument();
    expect(screen.getAllByText(/Sem etapa de/)).toHaveLength(3);
  });

  it('cria um pipeline', async () => {
    vi.mocked(pipelinesService.createPipeline).mockResolvedValue({
      ...EMPTY_PIPELINE,
      id: 'p3',
      name: 'Consórcio',
    });
    renderPage();
    await screen.findByText('Pipeline Padrão');

    fireEvent.change(screen.getByLabelText('Novo pipeline'), { target: { value: '  Consórcio ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() =>
      expect(pipelinesService.createPipeline).toHaveBeenCalledWith({ name: 'Consórcio' }),
    );
    expect(await screen.findByText('Pipeline criado.')).toBeInTheDocument();
    expect(opportunitiesService.listPipelines).toHaveBeenCalledTimes(2);
  });

  it('nome curto não chama a API', async () => {
    renderPage();
    await screen.findByText('Pipeline Padrão');
    fireEvent.change(screen.getByLabelText('Novo pipeline'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    expect(
      await screen.findByText('Informe um nome com ao menos 2 caracteres.'),
    ).toBeInTheDocument();
    expect(pipelinesService.createPipeline).not.toHaveBeenCalled();
  });

  it('adiciona uma etapa de ganho ao pipeline certo', async () => {
    vi.mocked(pipelinesService.createStage).mockResolvedValue(
      stage('s9', 'Fechado', 1, { pipeline_id: 'p2', is_won: true }),
    );
    renderPage();
    await screen.findByText('Corporativo');

    const form = screen.getByRole('form', { name: 'Nova etapa em Corporativo' });
    fireEvent.change(within(form).getByLabelText('Nova etapa'), { target: { value: 'Fechado' } });
    fireEvent.change(within(form).getByLabelText('Tipo da etapa'), {
      target: { value: 'won' },
    });
    fireEvent.click(within(form).getByRole('button', { name: /Adicionar etapa/ }));

    await waitFor(() =>
      expect(pipelinesService.createStage).toHaveBeenCalledWith('p2', {
        name: 'Fechado',
        is_won: true,
        is_lost: false,
      }),
    );
    expect(await screen.findByText('Etapa adicionada.')).toBeInTheDocument();
  });

  it('desce uma etapa trocando a posição com a vizinha', async () => {
    vi.mocked(pipelinesService.updateStage).mockResolvedValue(stage('s1', 'Novo', 2));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Descer Novo' }));

    await waitFor(() => expect(pipelinesService.updateStage).toHaveBeenCalledTimes(2));
    expect(pipelinesService.updateStage).toHaveBeenNthCalledWith(1, 'p1', 's1', { order: 2 });
    expect(pipelinesService.updateStage).toHaveBeenNthCalledWith(2, 'p1', 's2', { order: 1 });
    expect(screen.getByRole('button', { name: 'Subir Novo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descer Perdido' })).toBeDisabled();
  });

  it('edita a etapa mandando só o que mudou', async () => {
    vi.mocked(pipelinesService.updateStage).mockResolvedValue(
      stage('s3', 'Proposta enviada', 3, { requires_value: true }),
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Proposta enviada' }));

    const dialog = screen.getByRole('dialog', { name: 'Editar etapa' });
    fireEvent.click(within(dialog).getByLabelText(/Exige valor/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(pipelinesService.updateStage).toHaveBeenCalledWith('p1', 's3', {
        requires_value: true,
      }),
    );
    expect(await screen.findByText('Etapa atualizada.')).toBeInTheDocument();
  });

  it('mudar o tipo de uma etapa com oportunidades: mostra a recusa do backend', async () => {
    vi.mocked(pipelinesService.updateStage).mockRejectedValue(
      new ApiError(409, 'STAGE_IN_USE', 'em uso'),
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Em negociação' }));

    const dialog = screen.getByRole('dialog', { name: 'Editar etapa' });
    fireEvent.change(within(dialog).getByLabelText('Tipo'), { target: { value: 'lost' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(pipelinesService.updateStage).toHaveBeenCalledWith('p1', 's2', {
        is_won: false,
        is_lost: true,
      }),
    );
    expect(await within(dialog).findByText(/tem oportunidades ativas/)).toBeInTheDocument();
  });

  it('exclui uma etapa', async () => {
    vi.mocked(pipelinesService.deleteStage).mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir etapa Em negociação' }));

    const dialog = screen.getByRole('dialog', { name: 'Excluir etapa' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(pipelinesService.deleteStage).toHaveBeenCalledWith('p1', 's2'));
    expect(await screen.findByText('Etapa excluída.')).toBeInTheDocument();
  });

  it('excluir pipeline com oportunidades: recusa explicada, modal continua aberto', async () => {
    vi.mocked(pipelinesService.deletePipeline).mockRejectedValue(
      new ApiError(409, 'PIPELINE_IN_USE', 'em uso'),
    );
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir Pipeline Padrão' }));

    const dialog = screen.getByRole('dialog', { name: 'Excluir pipeline' });
    expect(within(dialog).getByText(/Este é o pipeline padrão/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(pipelinesService.deletePipeline).toHaveBeenCalledWith('p1'));
    expect(await within(dialog).findByText(/Mova ou exclua as oportunidades/)).toBeInTheDocument();
  });

  it('renomeia e torna padrão', async () => {
    vi.mocked(pipelinesService.updatePipeline).mockResolvedValue({
      ...EMPTY_PIPELINE,
      is_default: true,
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Tornar Corporativo o padrão' }));
    await waitFor(() =>
      expect(pipelinesService.updatePipeline).toHaveBeenCalledWith('p2', { is_default: true }),
    );
    expect(await screen.findByText('Pipeline padrão alterado.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Renomear Corporativo' }));
    const dialog = screen.getByRole('dialog', { name: 'Renomear pipeline' });
    fireEvent.change(within(dialog).getByLabelText('Nome do pipeline'), {
      target: { value: 'Vendas corporativas' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(pipelinesService.updatePipeline).toHaveBeenCalledWith('p2', {
        name: 'Vendas corporativas',
      }),
    );
  });

  it('só leitura: vê os pipelines sem nenhuma ação de gestão', async () => {
    renderPage(['pipelines:read']);
    expect(await screen.findByText('Pipeline Padrão')).toBeInTheDocument();
    expect(screen.queryByLabelText('Novo pipeline')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Editar|Excluir|Subir|Descer|Renomear)/ })).toBe(
      null,
    );
    expect(screen.queryByRole('form', { name: /Nova etapa/ })).not.toBeInTheDocument();
  });

  it('sem pipelines:read não consulta', () => {
    renderPage([]);
    expect(screen.getByText(/não tem permissão para ver os pipelines/)).toBeInTheDocument();
    expect(opportunitiesService.listPipelines).not.toHaveBeenCalled();
  });

  it('erro ao carregar oferece tentar novamente', async () => {
    vi.mocked(opportunitiesService.listPipelines).mockRejectedValueOnce(new Error('rede'));
    renderPage();
    expect(await screen.findByText('Não foi possível carregar os pipelines')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Pipeline Padrão')).toBeInTheDocument();
  });
});
