import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';

/*
 * Vitrine da fundacao visual. Nao ha tela de negocio na Fase 1 — leads, pipeline e
 * atendimento chegam nas Fases 3 e 4 (crm-spec/docs/10-roadmap/roadmap.md).
 */
export function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Fundacao tecnica</h1>
        <p className="text-sm text-neutral-500">
          Fase 1: esqueleto executavel. Modulos de negocio comecam na Fase 2.
        </p>
      </header>

      <Card title="Componentes base">
        <div className="flex flex-wrap gap-2">
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Destrutivo</Button>
          <Button loading>Carregando</Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="Campo de exemplo" placeholder="Digite algo" hint="Texto de apoio" />
          <Input label="Campo com erro" defaultValue="valor invalido" error="Mensagem de erro" />
        </div>
      </Card>

      <Card title="Estados">
        <div className="flex flex-col gap-3">
          <Alert tone="info" title="Info">
            Paleta neutra provisoria ate a definicao de marca (D-043).
          </Alert>
          <EmptyState title="Nenhum dado ainda" description="Estado vazio padrao do design system." />
        </div>
      </Card>
    </div>
  );
}
