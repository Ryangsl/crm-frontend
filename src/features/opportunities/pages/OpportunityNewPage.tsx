import { useNavigate, useSearchParams } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { useCustomerQuery } from '@/features/customers/hooks/useCustomers';
import { OpportunityForm } from '../components/OpportunityForm';

// Aceita ?lead_id=...&customer_id=... — usado pelo detalhe de um lead convertido (BR-04): o
// cliente vem vinculado ao lead e a oportunidade nasce com lead_id.
export function OpportunityNewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const leadId = params.get('lead_id') ?? undefined;
  const customerId = params.get('customer_id') ?? undefined;

  const { data: customer, isPending } = useCustomerQuery(customerId);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Nova oportunidade</h1>
      </header>

      <Card className="max-w-lg">
        {customerId && isPending ? (
          <p className="text-neutral-600">Carregando cliente...</p>
        ) : (
          <OpportunityForm
            initialCustomer={customer ? { id: customer.id, name: customer.name } : null}
            leadId={leadId}
            onSuccess={(opportunity) =>
              navigate(`/opportunities/${opportunity.id}`, { replace: true })
            }
            onCancel={() => navigate('/opportunities')}
          />
        )}
      </Card>
    </div>
  );
}
