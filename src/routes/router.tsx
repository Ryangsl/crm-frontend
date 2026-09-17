import { createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '../components/routing/ProtectedRoute';
import { AppShell } from '../components/layout/AppShell';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { HomePage } from '../app/pages/HomePage';
import { NotFoundPage } from '../app/pages/NotFoundPage';
import { StatusPage } from '../features/status/pages/StatusPage';

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
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
