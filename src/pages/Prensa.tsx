
import { useEffect, useState } from "react";
import PrensaHeader from "@/components/prensa/PrensaHeader";
import PrensaSearch from "@/components/prensa/PrensaSearch";
import NewsList from "@/components/prensa/NewsList";
import FeedStatus from "@/components/prensa/FeedStatus";
import { useNewsFeed } from "@/hooks/use-news-feed";

const ITEMS_PER_PAGE = 10;

const Prensa = () => {
  const {
    articles,
    feedSources,
    isLoading,
    isRefreshing,
    totalCount,
    fetchArticles,
    fetchFeedSources,
    refreshFeed,
  } = useNewsFeed();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // Reset to first page when search term changes
    setCurrentPage(1);
    fetchArticles(1, searchTerm);
    fetchFeedSources();
  }, [searchTerm]);

  useEffect(() => {
    fetchArticles(currentPage, searchTerm);
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  return (
    <div className="w-full space-y-6">
      <PrensaHeader onRefresh={refreshFeed} isRefreshing={isRefreshing} />
      
      <FeedStatus feedSources={feedSources} />

      <PrensaSearch 
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
      />

      <NewsList
        articles={articles}
        isLoading={isLoading}
        searchTerm={searchTerm}
        currentPage={currentPage}
        totalPages={totalPages}
        onClearSearch={() => setSearchTerm("")}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default Prensa;
