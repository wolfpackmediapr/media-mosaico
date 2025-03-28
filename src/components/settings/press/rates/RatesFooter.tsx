
import { Button } from "@/components/ui/button";
import { RatesPagination } from "@/pages/configuracion/press/components/RatesPagination";

interface RatesFooterProps {
  onRefresh: () => void;
  isLoading: boolean;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function RatesFooter({
  onRefresh,
  isLoading,
  totalCount,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange
}: RatesFooterProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
        Refrescar
      </Button>
      
      {totalCount > 0 && (
        <RatesPagination
          currentPage={currentPage}
          totalPages={totalPages}
          filteredItemsCount={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
