
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface UnifiedPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageCount?: boolean;
  pageCountText?: string;
}

export function UnifiedPagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageCount = true,
  pageCountText = "Página %current% de %total%"
}: UnifiedPaginationProps) {
  // Generate array of page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    
    // Always include first page
    pages.push(1);
    
    // Add current page and neighbors
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }
    
    // Always include last page if there's more than one page
    if (totalPages > 1 && !pages.includes(totalPages)) {
      // Add ellipsis if there's a gap
      if (totalPages > pages[pages.length - 1] + 1) {
        pages.push(-1); // -1 indicates ellipsis
      }
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  const formattedPageCountText = pageCountText
    .replace('%current%', currentPage.toString())
    .replace('%total%', totalPages.toString());

  return (
    <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-2 mt-4">
      {showPageCount && (
        <div className="text-sm text-muted-foreground order-2 sm:order-1">
          {formattedPageCountText}
        </div>
      )}
      
      <Pagination className="order-1 sm:order-2">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              aria-disabled={currentPage === 1}
            />
          </PaginationItem>

          {getPageNumbers().map((page, index) => (
            page === -1 ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => onPageChange(page)}
                  isActive={page === currentPage}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              aria-disabled={currentPage === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
