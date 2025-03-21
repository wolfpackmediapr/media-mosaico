
import { MediaPagination } from "@/components/settings/media/MediaPagination";
import { memo } from "react";

interface RatesPaginationProps {
  currentPage: number;
  totalPages: number;
  filteredItemsCount: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const RatesPagination = memo(function RatesPagination({
  currentPage,
  totalPages,
  filteredItemsCount,
  itemsPerPage,
  onPageChange
}: RatesPaginationProps) {
  // Calculate visible range
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredItemsCount);
  
  return (
    <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="text-sm">
        REGISTRO {startItem} A {endItem} DE {filteredItemsCount}
      </div>
      <MediaPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
});
