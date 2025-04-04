
import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";

export function InstitucionesAgenciasSettings() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <CardContent className="p-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar agencia..."
              className="pl-10 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
