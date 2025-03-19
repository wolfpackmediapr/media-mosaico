
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
    fetchPlatforms,
    refreshFeeds,
  } = useSocialFeeds();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Initial load - fetch platforms and posts
  useEffect(() => {
    console.log('Initial load of RedesSociales component');
    
    // First load platforms to populate the filter
    fetchPlatforms();
    
    // Then fetch the initial posts with no filters
    fetchPosts(1);
  }, []); // Empty dependency array means this runs once when component mounts

  // When search term or selected platforms change, reset to first page and fetch
  useEffect(() => {
    console.log('Search term or platforms changed:', searchTerm, selectedPlatforms);
    setCurrentPage(1);
    fetchPosts(1, searchTerm, selectedPlatforms);
  }, [searchTerm, selectedPlatforms, fetchPosts]);

  // When only page changes, fetch the new page
  useEffect(() => {
    if (currentPage > 1) { // Skip first page as it's handled by the above effect
      console.log('Page changed to:', currentPage);
      fetchPosts(currentPage, searchTerm, selectedPlatforms);
    }
  }, [currentPage, fetchPosts, searchTerm, selectedPlatforms]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handlePlatformChange = (platforms: string[]) => {
    console.log('Platform selection changed to:', platforms);
    setSelectedPlatforms(platforms);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = async () => {
    console.log('Manually refreshing feeds');
    await refreshFeeds();
    // After refresh, reset filters and fetch all posts
    setSearchTerm("");
    setSelectedPlatforms([]);
    fetchPosts(1);
  };

  return (
    <div className="w-full space-y-6">
      <SocialHeader onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      
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
            onClearSearch={() => {
              setSearchTerm("");
              setSelectedPlatforms([]);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default RedesSociales;
