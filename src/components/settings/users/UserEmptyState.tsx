
import { Button } from "@/components/ui/button";
import { FilterX, UserPlus } from "lucide-react";

interface UserEmptyStateProps {
  hasFilter: boolean;
  onAddUser: () => void;
}

export function UserEmptyState({ hasFilter, onAddUser }: UserEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {hasFilter ? (
        <>
          <FilterX className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No se encontraron resultados</h3>
          <p className="text-muted-foreground mt-2 mb-4">
            No hay usuarios que coincidan con los filtros aplicados.
          </p>
        </>
      ) : (
        <>
          <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No hay usuarios</h3>
          <p className="text-muted-foreground mt-2 mb-4">
            Comienza agregando tu primer usuario al sistema.
          </p>
        </>
      )}
      
      <Button onClick={onAddUser}>
        <UserPlus className="h-4 w-4 mr-2" />
        {hasFilter ? "Limpiar filtros" : "Agregar usuario"}
      </Button>
    </div>
  );
}
