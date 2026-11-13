import { RouterProvider } from 'react-router-dom';

import { AppErrorBoundary } from '../features/monitoring/ErrorScreen';
import { router } from '../routes/router';
import { Providers } from './providers';

export function App() {
  return (
    <AppErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </AppErrorBoundary>
  );
}
