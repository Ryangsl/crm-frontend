import { useQuery } from '@tanstack/react-query';

import { fetchHealth } from '../services/health';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 30_000,
  });
}
