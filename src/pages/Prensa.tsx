
import { useState } from "react";
import PrensaHeader from "@/components/prensa/PrensaHeader";
import PrensaSearch from "@/components/prensa/PrensaSearch";
import NewsList from "@/components/prensa/NewsList";
import FeedStatus from "@/components/prensa/FeedStatus";
import { useNewsFeed } from "@/hooks/use-news-feed";
import { ITEMS_PER_PAGE } from "@/services/news/api";
import type { NewsArticle, FeedSource } from "@/types/prensa";

const Prensa = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  const { 
    feedSources = [] as FeedSource[], 
    isSourcesLoading,
    fetchArticlesQuery,
    isRefreshing, 
    refreshFeed 
  } = useNewsFeed();

  const { 
    data = { articles: [] as NewsArticle[], totalCount: 0 },
    isLoading: isArticlesLoading
  } = fetchArticlesQuery(currentPage, searchTerm);

  const { articles = [], totalCount = 0 } = data;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PrensaHeader 
        isRefreshing={isRefreshing}
        onRefresh={refreshFeed}
      />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <PrensaSearch
            searchTerm={searchTerm}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
          />

          <NewsList
            articles={articles}
            isLoading={isArticlesLoading}
            searchTerm={searchTerm}
            currentPage={currentPage}
            totalPages={totalPages}
            onClearSearch={handleClearSearch}
            onPageChange={handlePageChange}
          />
        </div>

        <div>
          <FeedStatus 
            feedSources={feedSources}
            isLoading={isSourcesLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default Prensa;
