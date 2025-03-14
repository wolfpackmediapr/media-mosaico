
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ClientEmptyStateProps {
  hasFilter?: boolean;
  onAddClient: () => void;
}

export function ClientEmptyState({ hasFilter = false, onAddClient }: ClientEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="bg-primary-foreground p-4 rounded-full mb-4">
        <Users className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-medium">No hay clientes{hasFilter ? ' con este filtro' : ''}</h3>
      <p className="text-muted-foreground mt-2 max-w-md">
        {hasFilter 
          ? 'No se encontraron clientes con los filtros aplicados. Intente con otros criterios o elimine los filtros.'
          : 'Aún no hay clientes registrados. Utilice el botón "Nuevo Cliente" para crear el primero.'}
      </p>
      
      {!hasFilter && (
        <Button onClick={onAddClient} className="mt-4">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      )}
    </div>
  );
}
