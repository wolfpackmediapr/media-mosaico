
import { Button } from "@/components/ui/button";
import { Newspaper, RefreshCcw, Calendar, Download } from "lucide-react";

interface PrensaHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

const PrensaHeader = ({ onRefresh, isRefreshing }: PrensaHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Newspaper className="h-8 w-8 text-blue-600" />
          Prensa
        </h1>
        <p className="text-gray-500 mt-2">
          Monitoreo y análisis de contenido impreso y digital
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
        <Button variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          Filtrar por fecha
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>
    </div>
  );
};

export default PrensaHeader;
