
import { RssIcon, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SocialEmptyStateProps {
  searchTerm?: string;
  onClearSearch?: () => void;
}

const SocialEmptyState = ({ 
  searchTerm, 
  onClearSearch 
}: SocialEmptyStateProps) => {
  if (searchTerm) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No se encontraron resultados</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          No se encontraron publicaciones que coincidan con "<strong>{searchTerm}</strong>".
          Intenta con otra búsqueda o limpia los filtros.
        </p>
        {onClearSearch && (
          <Button onClick={onClearSearch} variant="outline">
            Limpiar búsqueda
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <RssIcon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No hay contenido disponible</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        No hay publicaciones de redes sociales disponibles en este momento.
        Puede que no haya fuentes configuradas o que necesites actualizar los feeds.
      </p>
      <Button 
        variant="outline"
        className="flex items-center"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Refrescar página
      </Button>
    </div>
  );
};

export default SocialEmptyState;
