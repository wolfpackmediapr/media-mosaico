
import StandardPagination from "@/components/pagination/StandardPagination";

interface ProgramsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ProgramsPagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: ProgramsPaginationProps) {
  return (
    <StandardPagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
    />
  );
}
