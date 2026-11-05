// Estado de carregamento com a forma do conteudo. Decorativo: quem usa informa o carregamento em texto
// ou por `aria-busy`.
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-surface-muted rounded-control animate-pulse ${className}`}
    />
  );
}
