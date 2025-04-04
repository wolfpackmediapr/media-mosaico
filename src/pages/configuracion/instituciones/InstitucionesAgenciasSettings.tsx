
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function InstitucionesAgenciasSettings() {
  return (
    <CardContent className="p-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="relative flex-1">
            {/* Search filter will go here */}
          </div>
          
          <Button className="sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Agencia
          </Button>
        </div>

        <div className="bg-gray-50 p-10 text-center rounded-md border border-dashed border-gray-300">
          <h3 className="font-medium text-gray-900 mb-1">No hay agencias</h3>
          <p className="text-sm text-gray-500 mb-4">
            Agregue agencias para comenzar a gestionarlas
          </p>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Agencia
          </Button>
        </div>
      </div>
    </CardContent>
  );
}
