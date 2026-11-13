import { Select } from '@/components/ui/Select';
import { useAuth } from '@/features/auth/useAuth';
import { useUserDirectory } from '../hooks/useUsers';
import { OWNER_MINE, OWNER_UNASSIGNED } from '../lib/owner-filter';

interface OwnerFilterProps {
  value: string;
  onChange: (value: string) => void;
  // So faz sentido onde o registro pode ficar sem responsavel (Leads).
  allowUnassigned?: boolean;
}

// Filtro de responsavel das listas. Os nomes vem do diretorio (D-089); se ele falhar, sobram
// "Todos" e "Meus", que nao dependem da lista de colegas.
export function OwnerFilter({ value, onChange, allowUnassigned = false }: OwnerFilterProps) {
  const { user } = useAuth();
  const { data } = useUserDirectory();
  const colleagues = (data?.data ?? []).filter(
    (person) => person.status === 'active' && person.id !== user?.id,
  );

  return (
    <Select label="Responsável" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Todos</option>
      <option value={OWNER_MINE}>Meus</option>
      {allowUnassigned && <option value={OWNER_UNASSIGNED}>Sem responsável</option>}
      {colleagues.length > 0 && (
        <optgroup label="Equipe">
          {colleagues.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </optgroup>
      )}
    </Select>
  );
}
