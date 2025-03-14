
import { Button } from "@/components/ui/button";
import { UserIcon, Plus } from "lucide-react";

interface UserEmptyStateProps {
  hasFilter: boolean;
  onAddUser: () => void;
}

export function UserEmptyState({ hasFilter, onAddUser }: UserEmptyStateProps) {
  return (
    <div className="text-center py-10 border rounded-lg bg-muted/10">
      <div className="flex justify-center mb-4">
        <UserIcon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">
        {hasFilter
          ? "No se encontraron usuarios con los filtros actuales"
          : "No hay usuarios registrados"}
      </h3>
      <p className="text-muted-foreground mt-2">
        {hasFilter
          ? "Prueba cambiando los filtros o busca otro término"
          : "Comienza agregando un nuevo usuario al sistema"}
      </p>
      <Button 
        onClick={onAddUser} 
        className="mt-4"
      >
        <Plus className="h-4 w-4 mr-2" />
        {hasFilter ? "Agregar usuario" : "Agregar primer usuario"}
      </Button>
    </div>
  );
}
