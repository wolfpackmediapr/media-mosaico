
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import SocialPostCard from "./SocialPostCard";
import { Skeleton } from "@/components/ui/skeleton";
import SocialEmptyState from "./SocialEmptyState";
import { Card } from "@/components/ui/card";
import type { SocialPost } from "@/types/social";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";

interface SocialFeedListProps {
  posts: SocialPost[];
  isLoading: boolean;
  searchTerm: string;
  currentPage: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onPageChange: (page: number) => void;
}

const ITEMS_PER_PAGE = 10;

const SocialFeedList = ({
  posts,
  isLoading,
  searchTerm,
  currentPage,
  totalCount,
  onSearchChange,
  onClearSearch,
  onPageChange,
}: SocialFeedListProps) => {
  const [inputValue, setInputValue] = useState(searchTerm);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(inputValue);
  };

  const handleClear = () => {
    setInputValue("");
    onClearSearch();
  };

  // Function to render pagination
  const renderPagination = () => {
    // If only one page, don't show pagination
    if (totalPages <= 1) {
      return null;
    }

    // Function to determine which page numbers to display
    const getPaginationItems = () => {
      const items = [];
      
      // Always show first page
      items.push(
        <PaginationItem key="page-1">
          <PaginationLink 
            onClick={() => onPageChange(1)}
            isActive={currentPage === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );
      
      // Add ellipsis if needed
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis-1">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      
      // Add pages around current page
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (i <= currentPage + 1 && i >= currentPage - 1) {
          items.push(
            <PaginationItem key={`page-${i}`}>
              <PaginationLink 
                onClick={() => onPageChange(i)}
                isActive={currentPage === i}
              >
                {i}
              </PaginationLink>
            </PaginationItem>
          );
        }
      }
      
      // Add ellipsis if needed
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-2">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      
      // Always show last page if it's not the first page
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={`page-${totalPages}`}>
            <PaginationLink 
              onClick={() => onPageChange(totalPages)}
              isActive={currentPage === totalPages}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }
      
      return items;
    };

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => onPageChange(currentPage - 1)}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
              aria-disabled={currentPage === 1}
            />
          </PaginationItem>
          
          {getPaginationItems()}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => onPageChange(currentPage + 1)}
              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
              aria-disabled={currentPage === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="space-y-6 w-full">
      <form onSubmit={handleSearch} className="relative w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Buscar por título, descripción o contenido..."
          className="pl-10 pr-10 w-full"
        />
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Limpiar búsqueda</span>
          </Button>
        )}
      </form>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-4">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <SocialEmptyState 
          searchTerm={searchTerm} 
          onClearSearch={onClearSearch} 
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {posts.map((post) => (
              <SocialPostCard key={post.id} post={post} />
            ))}
          </div>
          
          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default SocialFeedList;
