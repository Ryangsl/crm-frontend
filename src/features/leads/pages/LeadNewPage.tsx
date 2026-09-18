import { useNavigate } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { LeadForm } from '../components/LeadForm';

export function LeadNewPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Novo lead</h1>
      </header>

      <Card className="max-w-lg">
        <LeadForm
          onSuccess={(lead) => navigate(`/leads/${lead.id}`, { replace: true })}
          onCancel={() => navigate('/leads')}
        />
      </Card>
    </div>
  );
}
