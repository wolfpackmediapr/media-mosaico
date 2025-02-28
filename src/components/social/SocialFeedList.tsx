
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import SocialPostCard from "./SocialPostCard";
import { Skeleton } from "@/components/ui/skeleton";
import SocialEmptyState from "./SocialEmptyState";
import { Card } from "@/components/ui/card";
import type { SocialPost } from "@/types/social";

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

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Buscar por título, descripción o contenido..."
          className="pl-10 pr-10"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((post) => (
              <SocialPostCard key={post.id} post={post} />
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="join">
                <Button
                  variant="outline"
                  className="join-item"
                  disabled={currentPage === 1}
                  onClick={() => onPageChange(currentPage - 1)}
                >
                  «
                </Button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    className="join-item"
                    onClick={() => onPageChange(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  className="join-item"
                  disabled={currentPage === totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                >
                  »
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SocialFeedList;
