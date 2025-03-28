
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface TvRatesFooterProps {
  onRefresh: () => void;
  isLoading: boolean;
  totalRates: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function TvRatesFooter({
  onRefresh,
  isLoading,
  totalRates,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
}: TvRatesFooterProps) {
  // Calculate the range of items being displayed
  const start = totalRates === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalRates);

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
      <div className="text-sm text-muted-foreground">
        {totalRates > 0
          ? `Mostrando ${start} a ${end} de ${totalRates} tarifas`
          : "No hay tarifas para mostrar"}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
          >
            Anterior
          </Button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <Button
              key={i}
              variant={currentPage === i + 1 ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(i + 1)}
              disabled={isLoading}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
          >
            Siguiente
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>
    </div>
  );
}
