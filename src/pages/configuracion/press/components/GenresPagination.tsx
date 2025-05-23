
import { MediaPagination } from "@/components/settings/media/MediaPagination";

interface GenresPaginationProps {
  currentPage: number;
  totalPages: number;
  filteredItemsCount: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function GenresPagination({
  currentPage,
  totalPages,
  filteredItemsCount,
  itemsPerPage,
  onPageChange
}: GenresPaginationProps) {
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
