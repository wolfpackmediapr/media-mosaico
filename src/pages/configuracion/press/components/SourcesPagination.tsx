
import { MediaPagination } from "@/components/settings/media/MediaPagination";

interface SourcesPaginationProps {
  currentPage: number;
  totalPages: number;
  filteredItemsCount: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function SourcesPagination({
  currentPage,
  totalPages,
  filteredItemsCount,
  itemsPerPage,
  onPageChange
}: SourcesPaginationProps) {
  return (
    <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="text-sm">
        REGISTRO {(currentPage - 1) * itemsPerPage + 1} A {Math.min(currentPage * itemsPerPage, filteredItemsCount)} DE {filteredItemsCount}
      </div>
      <MediaPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
