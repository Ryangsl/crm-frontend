import { createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { AppShell } from '../components/layout/AppShell';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { AccountPage } from '../features/account/pages/AccountPage';
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
import { BusinessHoursPage } from '../features/settings/pages/BusinessHoursPage';
import { TeamAvailabilityPage } from '../features/availability/pages/TeamAvailabilityPage';
import { AccessExceptionsPage } from '../features/access-control/pages/AccessExceptionsPage';
import { ConversationListPage } from '../features/conversations/pages/ConversationListPage';
import { ConversationDetailPage } from '../features/conversations/pages/ConversationDetailPage';
import { PlanPage } from '../features/plan/pages/PlanPage';
import { BrandIdentityPage } from '../features/branding/pages/BrandIdentityPage';
import { FollowUpsPage } from '../features/follow-up/pages/FollowUpsPage';
import { SearchPage } from '../features/search/pages/SearchPage';
import { RolesPage, SettingsHomePage } from '../features/settings/pages/SettingsPages';
import { UsersPage } from '../features/users/pages/UsersPage';
import { LeadSourcesPage } from '../features/leads/pages/LeadSourcesPage';
import { AvailabilitySettingsPage } from '../features/availability/pages/AvailabilitySettingsPage';
import { PipelinesSettingsPage } from '../features/pipelines/pages/PipelinesSettingsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  // D-064: link de redefinicao de senha (publico, no endereco da empresa).
  { path: '/redefinir-senha', element: <ResetPasswordPage /> },
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
          { path: 'conversations', element: <ConversationListPage /> },
          { path: 'conversations/:id', element: <ConversationDetailPage /> },
          { path: 'settings/business-hours', element: <BusinessHoursPage /> },
          { path: 'team/availability', element: <TeamAvailabilityPage /> },
          { path: 'settings/access-exceptions', element: <AccessExceptionsPage /> },
          { path: 'plan', element: <PlanPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'follow-ups', element: <FollowUpsPage /> },
          { path: 'account', element: <AccountPage /> },
          { path: 'settings', element: <SettingsHomePage /> },
          { path: 'settings/users', element: <UsersPage /> },
          { path: 'settings/lead-sources', element: <LeadSourcesPage /> },
          { path: 'settings/pipelines', element: <PipelinesSettingsPage /> },
          { path: 'settings/availability', element: <AvailabilitySettingsPage /> },
          { path: 'settings/roles', element: <RolesPage /> },
          { path: 'settings/brand-identity', element: <BrandIdentityPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
