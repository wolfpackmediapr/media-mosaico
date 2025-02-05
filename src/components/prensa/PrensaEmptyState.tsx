
import { Button } from "@/components/ui/button";
import { Newspaper } from "lucide-react";

interface PrensaEmptyStateProps {
  searchTerm: string;
  onClearSearch: () => void;
}

const PrensaEmptyState = ({ searchTerm, onClearSearch }: PrensaEmptyStateProps) => {
  return (
    <div className="text-center py-12 bg-gray-50 rounded-lg">
      <Newspaper className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">No hay artículos disponibles</h3>
      <p className="mt-2 text-gray-500">
        {searchTerm 
          ? "No se encontraron artículos que coincidan con tu búsqueda."
          : "Haz clic en \"Actualizar\" para cargar nuevos artículos."}
      </p>
      {searchTerm && (
        <Button
          variant="outline"
          className="mt-4"
          onClick={onClearSearch}
        >
          Limpiar búsqueda
        </Button>
      )}
    </div>
  );
};

export default PrensaEmptyState;
