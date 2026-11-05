// Simbolo institucional do CRM Universal. Desenho vetorial aproximado a partir da referencia aprovada;
// substituir pelo arquivo oficial da marca quando existir. A cor e fixa de proposito: a identidade do
// produto continua reconhecivel mesmo quando a empresa personaliza a interface.
export function BrandMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      <path fill="#0f62fe" d="M32 4 12 16v12l8 4V21l12-7 12 7-8 5 10 5 8-5V16z" />
      <path fill="#4589ff" d="M32 60l20-12V36l-8-4v11l-12 7-12-7 8-5-10-5-8 5v12z" />
    </svg>
  );
}

export function BrandLockup({ tone = 'sidebar' }: { tone?: 'sidebar' | 'page' }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <span
        className={`text-base font-semibold tracking-tight ${tone === 'sidebar' ? 'text-sidebar-ink' : 'text-neutral-900'}`}
      >
        CRM Universal
      </span>
    </div>
  );
}
