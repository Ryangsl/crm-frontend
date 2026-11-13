// Valores especiais do filtro; qualquer outro valor e o id de um colega.
export const OWNER_MINE = 'me';
export const OWNER_UNASSIGNED = 'none';

// Traduz a escolha do filtro nos parametros da API.
export function ownerFilterParams(
  value: string,
  currentUserId: string | undefined,
): { owner_id?: string; unassigned?: true } {
  if (value === OWNER_UNASSIGNED) return { unassigned: true };
  if (value === OWNER_MINE) return currentUserId ? { owner_id: currentUserId } : {};
  return value ? { owner_id: value } : {};
}
