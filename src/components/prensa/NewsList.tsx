
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

const ArticleSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex flex-col md:flex-row border rounded-lg overflow-hidden">
      {/* Image skeleton */}
      <div className="md:w-1/4 h-48 bg-muted"></div>
      
      <div className="md:w-3/4 p-6 space-y-4">
        {/* Title and metadata skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>

        {/* Tags skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>

        {/* Button skeleton */}
        <Skeleton className="h-9 w-36 mt-4" />
      </div>
    </div>
  </div>
);

const PaginationSkeleton = () => (
  <div className="flex justify-center mt-8">
    <div className="flex gap-2">
      <Skeleton className="h-10 w-24" /> {/* Previous */}
      <Skeleton className="h-10 w-10" />
      <Skeleton className="h-10 w-10" />
      <Skeleton className="h-10 w-10" />
      <Skeleton className="h-10 w-24" /> {/* Next */}
    </div>
  </div>
);

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
      <div className="space-y-6">
        {Array.from({ length: 10 }).map((_, index) => (
          <ArticleSkeleton key={index} />
        ))}
        <PaginationSkeleton />
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
