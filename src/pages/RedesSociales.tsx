
import { useEffect, useState } from "react";
import SocialHeader from "@/components/social/SocialHeader";
import SocialFeedList from "@/components/social/SocialFeedList";
import PlatformFilters from "@/components/social/PlatformFilters";
import { useSocialFeeds } from "@/hooks/use-social-feeds";

const RedesSociales = () => {
  const {
    posts,
    platforms,
    isLoading,
    isRefreshing,
    totalCount,
    fetchPosts,
    refreshFeeds,
  } = useSocialFeeds();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // Reset to first page when search term or platforms change
    setCurrentPage(1);
    fetchPosts(1, searchTerm, selectedPlatforms);
  }, [searchTerm, selectedPlatforms]);

  useEffect(() => {
    fetchPosts(currentPage, searchTerm, selectedPlatforms);
  }, [currentPage]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handlePlatformChange = (platforms: string[]) => {
    setSelectedPlatforms(platforms);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <SocialHeader onRefresh={refreshFeeds} isRefreshing={isRefreshing} />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <PlatformFilters 
            platforms={platforms}
            selectedPlatforms={selectedPlatforms}
            onPlatformChange={handlePlatformChange}
          />
        </div>
        <div className="lg:col-span-3">
          <SocialFeedList
            posts={posts}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onClearSearch={() => setSearchTerm("")}
          />
        </div>
      </div>
    </div>
  );
};

export default RedesSociales;
