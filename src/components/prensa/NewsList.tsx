
import { Skeleton } from "@/components/ui/skeleton";
import NewsArticleCard from "./NewsArticleCard";
import PrensaEmptyState from "./PrensaEmptyState";
import type { NewsArticle } from "@/types/prensa";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface NewsListProps {
  articles: NewsArticle[];
  isLoading: boolean;
  searchTerm: string;
  currentPage: number;
  totalPages: number;
  onClearSearch: () => void;
  onPageChange: (page: number) => void;
}

const NewsList = ({
  articles,
  isLoading,
  searchTerm,
  currentPage,
  totalPages,
  onClearSearch,
  onPageChange,
}: NewsListProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-6">
        {[1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[200px]" />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <PrensaEmptyState 
        searchTerm={searchTerm}
        onClearSearch={onClearSearch}
      />
    );
  }

  return (
    <>
      <div className="grid gap-6">
        {articles.map((article) => (
          <NewsArticleCard key={article.id} article={article} />
        ))}
      </div>

      <Pagination className="mt-8">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNumber = i + 1;
            return (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  onClick={() => onPageChange(pageNumber)}
                  isActive={currentPage === pageNumber}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {totalPages > 5 && (
            <>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  onClick={() => onPageChange(totalPages)}
                  isActive={currentPage === totalPages}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </>
  );
};

export default NewsList;
