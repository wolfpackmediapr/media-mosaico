
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
    fetchArticles(currentPage);
    fetchFeedSources();
  }, [currentPage]);

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.clients.some(client => client.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PrensaHeader onRefresh={refreshFeed} isRefreshing={isRefreshing} />
      
      <FeedStatus feedSources={feedSources} />

      <PrensaSearch 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <NewsList
        articles={filteredArticles}
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
