
interface MediaEmptyStateProps {
  hasFilter: boolean;
}

export function MediaEmptyState({ hasFilter }: MediaEmptyStateProps) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      {hasFilter 
        ? 'No hay medios que coincidan con el filtro aplicado.'
        : 'No hay medios de comunicación configurados.'}
    </div>
  );
}
