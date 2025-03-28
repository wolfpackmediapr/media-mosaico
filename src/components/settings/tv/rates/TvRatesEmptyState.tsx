
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface TvRatesEmptyStateProps {
  onAddClick: () => void;
}

export function TvRatesEmptyState({ onAddClick }: TvRatesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <Plus className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-medium mb-2">No hay tarifas</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        No se encontraron tarifas de televisión. Empiece agregando una nueva tarifa o
        importando tarifas desde un archivo CSV.
      </p>
      <Button onClick={onAddClick}>
        <Plus className="h-4 w-4 mr-2" />
        Agregar tarifa
      </Button>
    </div>
  );
}
