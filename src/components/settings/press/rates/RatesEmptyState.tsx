
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface RatesEmptyStateProps {
  searchTerm: string;
  onClearSearch: () => void;
  onAddNew: () => void;
}

export function RatesEmptyState({ searchTerm, onClearSearch, onAddNew }: RatesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {searchTerm ? (
        <>
          <p className="text-muted-foreground mb-4">
            No se encontraron tarifas que coincidan con "{searchTerm}"
          </p>
          <Button onClick={onClearSearch} variant="outline" size="sm">
            Mostrar todas las tarifas
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted-foreground mb-4">
            Aún no hay tarifas creadas
          </p>
          <Button onClick={onAddNew} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar primera tarifa
          </Button>
        </>
      )}
    </div>
  );
}
