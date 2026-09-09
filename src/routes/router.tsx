import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '../components/layout/AppShell';
import { HomePage } from '../app/pages/HomePage';
import { NotFoundPage } from '../app/pages/NotFoundPage';
import { StatusPage } from '../features/status/pages/StatusPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'status', element: <StatusPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
