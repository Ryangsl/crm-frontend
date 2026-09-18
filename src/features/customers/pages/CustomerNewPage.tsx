import { useNavigate } from 'react-router-dom';

import { Card } from '@/components/ui/Card';
import { CustomerForm } from '../components/CustomerForm';

export function CustomerNewPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-lg font-semibold text-neutral-900">Novo cliente</h1>
      </header>

      <Card className="max-w-lg">
        <CustomerForm
          onSuccess={(customer) => navigate(`/customers/${customer.id}`, { replace: true })}
          onCancel={() => navigate('/customers')}
        />
      </Card>
    </div>
  );
}
