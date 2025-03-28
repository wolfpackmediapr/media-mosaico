
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";

export interface TvRatesHeaderProps {
  onAddClick: () => void;
  onImportClick: () => void;
}

export function TvRatesHeader({ onAddClick, onImportClick }: TvRatesHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
      <div>
        <h2 className="text-lg font-semibold">Configuración de tarifas</h2>
        <p className="text-sm text-muted-foreground">
          Añada, importe o modifique las tarifas publicitarias
        </p>
      </div>
      <div className="flex space-x-2 mt-3 sm:mt-0">
        <Button variant="outline" size="sm" onClick={onImportClick}>
          <Upload className="h-4 w-4 mr-2" />
          Importar
        </Button>
        <Button size="sm" onClick={onAddClick}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar
        </Button>
      </div>
    </div>
  );
}
