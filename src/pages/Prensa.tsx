
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
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Load feed sources on mount
  useEffect(() => {
    if (feedSources.length === 0) {
      fetchFeedSources();
    }
  }, [feedSources.length, fetchFeedSources]);

  // Fetch articles when filters or page changes
  useEffect(() => {
    const sourceId = selectedOutlet === "all" ? "" : selectedOutlet;
    fetchArticles(currentPage, searchTerm, sourceId);
  }, [currentPage, searchTerm, selectedOutlet, fetchArticles]);

  // Reset to page 1 when search term or outlet filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedOutlet]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };
  
  const handleOutletChange = (value: string) => {
    setSelectedOutlet(value);
  };
  
  // Transform feedSources to the format required by the outlet filter
  const outletOptions = feedSources.map(source => ({
    id: source.id,
    name: source.name
  }));

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col space-y-1.5">
        <h2 className="text-3xl font-bold tracking-tight">Prensa Digital</h2>
        <p className="text-muted-foreground">
          Monitoreo de noticias de medios digitales
        </p>
      </div>
      
      <PrensaHeader onRefresh={refreshFeed} isRefreshing={isRefreshing} />
      
      <FeedStatus feedSources={feedSources} />

      <PrensaSearch 
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        selectedOutlet={selectedOutlet}
        onOutletChange={handleOutletChange}
        outlets={outletOptions}
      />

      <NewsList
        articles={articles}
        isLoading={isLoading}
        searchTerm={searchTerm}
        currentPage={currentPage}
        totalPages={totalPages}
        onClearSearch={() => {
          setSearchTerm("");
          setSelectedOutlet("all");
        }}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default Prensa;
