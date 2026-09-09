import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { UiContext } from './ui-context';
import type { UiState } from './ui-context';

export function UiProvider({ children }: { children: ReactNode }) {
  const [online, setOnlineState] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  const setOnline = useCallback((value: boolean) => setOnlineState(value), []);
  const value = useMemo<UiState>(() => ({ online, setOnline }), [online, setOnline]);

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}
