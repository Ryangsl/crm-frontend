import { useContext } from 'react';

import { UiContext } from '../app/ui-context';
import type { UiState } from '../app/ui-context';

export function useUi(): UiState {
  const context = useContext(UiContext);
  if (!context) {
    throw new Error('useUi precisa estar dentro de <UiProvider>');
  }
  return context;
}
