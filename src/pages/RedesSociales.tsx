
import { useState } from "react";
import SocialHeader from "@/components/social/SocialHeader";
import SocialFeedList from "@/components/social/SocialFeedList";
import PlatformFilters from "@/components/social/PlatformFilters";
import { useSocialFeeds } from "@/hooks/use-social-feeds";
import { ITEMS_PER_PAGE } from "@/services/social/api";
import type { SocialPost, SocialPlatform } from "@/types/social";

const RedesSociales = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { 
    platforms = [] as SocialPlatform[], 
    isPlatformsLoading,
    fetchPostsQuery,
    isRefreshing, 
    refreshFeeds
  } = useSocialFeeds();

  const { 
    data = { posts: [] as SocialPost[], totalCount: 0 },
    isLoading: isPostsLoading
  } = fetchPostsQuery(currentPage, searchTerm, selectedPlatforms);

  const { posts = [], totalCount = 0 } = data;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handlePlatformSelect = (platforms: string[]) => {
    setSelectedPlatforms(platforms);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <SocialHeader 
        isRefreshing={isRefreshing}
        onRefresh={refreshFeeds}
      />

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <PlatformFilters
            platforms={platforms}
            selectedPlatforms={selectedPlatforms}
            onSelectPlatforms={handlePlatformSelect}
            isLoading={isPlatformsLoading}
          />
        </div>

        <div className="md:col-span-3">
          <SocialFeedList
            posts={posts}
            isLoading={isPostsLoading}
            searchTerm={searchTerm}
            currentPage={currentPage}
            totalCount={totalCount}
            onSearchChange={handleSearch}
            onClearSearch={handleClearSearch}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default RedesSociales;
