
import type { NewsArticle, FeedSource } from "@/types/prensa";

// Transform sources data to FeedSource type
export const transformSourcesToFeedSources = (sourcesData: any[]): FeedSource[] => {
  return sourcesData?.map(source => ({
    id: source.id,
    name: source.name,
    url: source.url,
    active: source.active,
    last_successful_fetch: source.last_successful_fetch,
    last_fetch_error: source.last_fetch_error,
    error_count: source.error_count
  })) || [];
};

// Transform database article to NewsArticle type
export const transformDatabaseArticlesToNewsArticles = (articlesData: any[]): NewsArticle[] => {
  if (!articlesData || articlesData.length === 0) {
    return [];
  }
  
  // Transform the article data to match NewsArticle type
  return articlesData.map(article => {
    // Handle clients array properly - ensure it's a string array
    let clients: string[] = [];
    if (article.clients) {
      if (Array.isArray(article.clients)) {
        // Convert each item to string
        clients = article.clients.map(client => String(client));
      } else if (typeof article.clients === 'string') {
        clients = [article.clients];
      } else if (typeof article.clients === 'object') {
        // Handle clients as JSONB object
        try {
          const clientsObj = article.clients as Record<string, any>;
          clients = Object.values(clientsObj)
            .filter(Boolean)
            .map(value => String(value)); // Convert all values to strings
        } catch (e) {
          console.error('Error parsing clients:', e);
        }
      }
    }

    // Create a properly structured NewsArticle object
    return {
      id: article.id,
      title: article.title || '',
      description: article.description || '',
      link: article.link || '',
      pub_date: article.pub_date || '',
      source: article.source || '',
      summary: article.summary || '',
      category: article.category || '',
      clients: clients,
      keywords: Array.isArray(article.keywords) 
        ? article.keywords.map(keyword => String(keyword))
        : [],
      image_url: article.image_url || undefined,
      last_processed: article.last_processed || undefined,
      feed_source: article.feed_source ? {
        name: article.feed_source.name || '',
        last_successful_fetch: article.feed_source.last_successful_fetch
      } : undefined
    };
  });
};
