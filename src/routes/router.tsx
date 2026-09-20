import { createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { AppShell } from '../components/layout/AppShell';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { HomePage } from '../app/pages/HomePage';
import { NotFoundPage } from '../app/pages/NotFoundPage';
import { StatusPage } from '../features/status/pages/StatusPage';
import { CustomerListPage } from '../features/customers/pages/CustomerListPage';
import { CustomerNewPage } from '../features/customers/pages/CustomerNewPage';
import { CustomerDetailPage } from '../features/customers/pages/CustomerDetailPage';
import { CustomerEditPage } from '../features/customers/pages/CustomerEditPage';
import { LeadListPage } from '../features/leads/pages/LeadListPage';
import { LeadNewPage } from '../features/leads/pages/LeadNewPage';
import { LeadDetailPage } from '../features/leads/pages/LeadDetailPage';
import { LeadEditPage } from '../features/leads/pages/LeadEditPage';
import { OpportunityListPage } from '../features/opportunities/pages/OpportunityListPage';
import { OpportunityNewPage } from '../features/opportunities/pages/OpportunityNewPage';
import { OpportunityDetailPage } from '../features/opportunities/pages/OpportunityDetailPage';
import { OpportunityEditPage } from '../features/opportunities/pages/OpportunityEditPage';
import { PipelineBoardPage } from '../features/opportunities/pages/PipelineBoardPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'status', element: <StatusPage /> },
          { path: 'customers', element: <CustomerListPage /> },
          { path: 'customers/new', element: <CustomerNewPage /> },
          { path: 'customers/:id', element: <CustomerDetailPage /> },
          { path: 'customers/:id/edit', element: <CustomerEditPage /> },
          { path: 'leads', element: <LeadListPage /> },
          { path: 'leads/new', element: <LeadNewPage /> },
          { path: 'leads/:id', element: <LeadDetailPage /> },
          { path: 'leads/:id/edit', element: <LeadEditPage /> },
          { path: 'opportunities', element: <OpportunityListPage /> },
          { path: 'opportunities/new', element: <OpportunityNewPage /> },
          { path: 'opportunities/:id', element: <OpportunityDetailPage /> },
          { path: 'opportunities/:id/edit', element: <OpportunityEditPage /> },
          { path: 'pipeline', element: <PipelineBoardPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
