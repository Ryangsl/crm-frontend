import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { initErrorMonitoring } from './features/monitoring/monitoring';
import '@fontsource-variable/inter';
import './styles/index.css';

// D-101: sem VITE_SENTRY_DSN nao faz nada (nem baixa o SDK).
void initErrorMonitoring();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Elemento #root não encontrado no index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
