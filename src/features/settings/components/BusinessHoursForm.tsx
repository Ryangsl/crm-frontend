import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ApiError } from '@/services/api';
import { useSaveBusinessHours } from '../hooks/useBusinessHours';
import type { BusinessHours } from '../types/businessHours';

const WEEKDAYS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
  { value: 7, label: 'Dom' },
] as const;

interface WindowState {
  key: number;
  days: number[];
  start: string;
  end: string;
}

interface BusinessHoursFormProps {
  initial: BusinessHours;
  readOnly?: boolean;
}

function timezoneOptions(current: string): string[] {
  const supported =
    (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.(
      'timeZone',
    ) ?? [];
  return Array.from(new Set(['America/Sao_Paulo', ...supported, 'UTC', current])).sort();
}

// Edita o formato v1 de `crm.business_hours`. Validacao local so para dar retorno rapido;
// o backend continua sendo a autoridade (400/422 sao exibidos).
export function BusinessHoursForm({ initial, readOnly = false }: BusinessHoursFormProps) {
  const nextKey = useRef(initial.weekly.length);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [windows, setWindows] = useState<WindowState[]>(
    initial.weekly.map((window, index) => ({ key: index, ...window })),
  );
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mutation = useSaveBusinessHours();
  const submitting = mutation.isPending;

  function updateWindow(key: number, patch: Partial<WindowState>) {
    setSaved(false);
    setWindows((current) =>
      current.map((window) => (window.key === key ? { ...window, ...patch } : window)),
    );
  }

  function toggleDay(window: WindowState, day: number) {
    const days = window.days.includes(day)
      ? window.days.filter((value) => value !== day)
      : [...window.days, day];
    updateWindow(window.key, { days });
  }

  function addWindow() {
    setSaved(false);
    nextKey.current += 1;
    setWindows((current) => [
      ...current,
      { key: nextKey.current, days: [1, 2, 3, 4, 5], start: '08:00', end: '18:00' },
    ]);
  }

  function removeWindow(key: number) {
    setSaved(false);
    setWindows((current) => current.filter((window) => window.key !== key));
  }

  function validate(): boolean {
    const found: Record<number, string> = {};
    if (windows.length === 0) {
      setFormError('Adicione pelo menos uma janela de horario.');
      setErrors({});
      return false;
    }
    for (const window of windows) {
      if (window.days.length === 0) found[window.key] = 'Selecione pelo menos um dia.';
      else if (!window.start || !window.end) found[window.key] = 'Informe inicio e fim.';
      else if (window.start >= window.end)
        found[window.key] =
          'O inicio deve ser anterior ao fim (janelas que viram a noite nao sao suportadas).';
    }
    setErrors(found);
    setFormError(null);
    return Object.keys(found).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || readOnly || !validate()) return;

    setSaved(false);
    setFormError(null);
    try {
      await mutation.mutateAsync({
        schema_version: 1,
        timezone,
        weekly: windows.map(({ days, start, end }) => ({
          days: [...days].sort((a, b) => a - b),
          start,
          end,
        })),
      });
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setFormError('Voce nao tem permissao para alterar esta configuracao.');
        return;
      }
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Nao foi possivel salvar o horario de funcionamento.',
      );
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      {formError && (
        <Alert tone="danger" title="Nao foi possivel salvar">
          {formError}
        </Alert>
      )}
      {saved && <Alert tone="success">Horario de funcionamento salvo.</Alert>}

      <Select
        label="Fuso horario"
        value={timezone}
        disabled={readOnly}
        onChange={(event) => {
          setSaved(false);
          setTimezone(event.target.value);
        }}
      >
        {timezoneOptions(initial.timezone).map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </Select>

      {windows.map((window, index) => (
        <fieldset
          key={window.key}
          className="border-border-subtle flex flex-col gap-3 rounded-xl border p-3"
        >
          <legend className="px-1 text-sm font-medium text-neutral-800">Janela {index + 1}</legend>

          <div
            role="group"
            aria-label={`Dias da janela ${index + 1}`}
            className="flex flex-wrap gap-2"
          >
            {WEEKDAYS.map((day) => (
              <label
                key={day.value}
                className="min-h-touch bg-surface border-border-subtle flex items-center gap-1 rounded-lg border px-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={window.days.includes(day.value)}
                  disabled={readOnly}
                  onChange={() => toggleDay(window, day.value)}
                />
                {day.label}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Inicio (janela ${index + 1})`}
              type="time"
              value={window.start}
              disabled={readOnly}
              onChange={(event) => updateWindow(window.key, { start: event.target.value })}
            />
            <Input
              label={`Fim (janela ${index + 1})`}
              type="time"
              value={window.end}
              disabled={readOnly}
              onChange={(event) => updateWindow(window.key, { end: event.target.value })}
            />
          </div>

          {errors[window.key] && <p className="text-danger text-sm">{errors[window.key]}</p>}

          {!readOnly && windows.length > 1 && (
            <div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeWindow(window.key)}
              >
                {`Remover janela ${index + 1}`}
              </Button>
            </div>
          )}
        </fieldset>
      ))}

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={addWindow} disabled={submitting}>
            Adicionar janela
          </Button>
          <Button type="submit" loading={submitting} disabled={submitting}>
            Salvar
          </Button>
        </div>
      )}
    </form>
  );
}
