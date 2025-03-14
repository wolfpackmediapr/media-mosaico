
import { Filter, Users } from "lucide-react";

interface ClientEmptyStateProps {
  hasFilter: boolean;
}

export function ClientEmptyState({ hasFilter }: ClientEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="bg-primary-foreground p-4 rounded-full mb-4">
        <Users className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-medium">No hay clientes{hasFilter ? ' con este filtro' : ''}</h3>
      <p className="text-muted-foreground mt-2 max-w-md">
        {hasFilter 
          ? 'No se encontraron clientes con los filtros aplicados. Intente con otros criterios o elimine los filtros.'
          : 'Aún no hay clientes registrados. Utilice el botón "Añadir Cliente" para crear el primero.'}
      </p>
      {hasFilter && (
        <div className="mt-4 flex items-center text-sm text-muted-foreground">
          <Filter className="h-4 w-4 mr-1" />
          <span>Filtro activo: intente con otros criterios</span>
        </div>
      )}
    </div>
  );
}
