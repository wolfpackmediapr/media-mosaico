
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

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
  onPageChange
}: TvRatesFooterProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalRates);
  
  return (
    <div className="flex flex-col-reverse sm:flex-row justify-between w-full">
      <div className="text-sm text-muted-foreground mt-4 sm:mt-0">
        {totalRates > 0 ? (
          <>
            Mostrando {startItem} a {endItem} de {totalRates} tarifas
          </>
        ) : (
          'No hay tarifas que mostrar'
        )}
      </div>
      
      <div className="flex gap-2 justify-end">
        {totalPages > 1 && (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => 
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1)
              )
              .map((page, index, array) => {
                // Add ellipsis
                if (index > 0 && page - array[index - 1] > 1) {
                  return (
                    <span 
                      key={`ellipsis-${page}`} 
                      className="flex items-center justify-center w-9 h-9 text-sm"
                    >
                      ...
                    </span>
                  );
                }
                
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => onPageChange(page)}
                    disabled={isLoading}
                  >
                    {page}
                  </Button>
                );
              })}
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  );
}
