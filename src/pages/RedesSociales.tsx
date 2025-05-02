import { useEffect, useState } from "react";
import SocialHeader from "@/components/social/SocialHeader";
import SocialFeedList from "@/components/social/SocialFeedList";
import PlatformFilters from "@/components/social/PlatformFilters";
import { useSocialFeeds } from "@/hooks/social/use-social-feeds";
import { ITEMS_PER_PAGE } from "@/services/social/api";
import { SocialPost } from "@/types/social";

const RedesSociales = () => {
  // Use the refactored hook
  const {
    posts,
    platforms,
    isLoading,
    isRefreshing,
    totalCount,
    fetchPosts,
    fetchPlatforms,
    refreshFeeds,
    lastRefreshTime,
    displayPosts,
    setDisplayPosts
  } = useSocialFeeds();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Initial load - fetch platforms and posts
  useEffect(() => {
    console.log('Initial load of RedesSociales component');
    
    // Force a refresh of feeds on initial load to ensure fresh data
    const initialLoad = async () => {
      try {
        console.log('Performing initial refresh of social feeds');
        await refreshFeeds();
      } catch (error) {
        console.error('Error during initial refresh:', error);
        // If refresh fails, fall back to regular fetching
        fetchPlatforms();
        fetchPosts(1);
      }
    };
    
    initialLoad();
  }, []); 

  // When search term or selected platforms change, reset to first page and fetch
  useEffect(() => {
    console.log('Search term or platforms changed:', searchTerm, selectedPlatforms);
    setCurrentPage(1);
    const fetchData = async () => {
      const result = await fetchPosts(1, searchTerm, selectedPlatforms);
      setDisplayPosts(result);
    };
    fetchData();
  }, [searchTerm, selectedPlatforms, fetchPosts, setDisplayPosts]);

  // When only page changes, fetch the new page
  useEffect(() => {
    if (currentPage > 1) { // Skip first page as it's handled by the above effect
      console.log('Page changed to:', currentPage);
      const fetchPageData = async () => {
        const result = await fetchPosts(currentPage, searchTerm, selectedPlatforms);
        setDisplayPosts(result);
      };
      fetchPageData();
    }
  }, [currentPage, fetchPosts, searchTerm, selectedPlatforms, setDisplayPosts]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handlePlatformChange = (platforms: string[]) => {
    console.log('Platform selection changed to:', platforms);
    setSelectedPlatforms(platforms);
  };

  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || (totalCount > 0 && page > Math.ceil(totalCount / ITEMS_PER_PAGE))) {
      return;
    }
    
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefresh = async () => {
    console.log('Manually refreshing feeds');
    await refreshFeeds();
    // After refresh, reset filters and fetch all posts
    setSearchTerm("");
    setSelectedPlatforms([]);
    setCurrentPage(1);
  };

  // Log platforms for debugging
  console.log('Platforms in component:', platforms);

  return (
    <div className="w-full space-y-6">
      <SocialHeader onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      
      {lastRefreshTime && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Última actualización: {lastRefreshTime.toLocaleString()}
          </p>
        </div>
      )}
      
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
            posts={displayPosts}
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
