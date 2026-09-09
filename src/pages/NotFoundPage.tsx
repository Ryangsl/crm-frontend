import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-2xl font-semibold text-neutral-900">404</p>
      <p className="text-sm text-neutral-600">Pagina nao encontrada.</p>
      <Link to="/" className="text-brand-700 min-h-touch inline-flex items-center underline">
        Voltar ao inicio
      </Link>
    </div>
  );
}
