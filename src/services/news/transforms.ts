
import type { NewsArticle, FeedSource, ArticleClient, ArticleSentiment } from "@/types/prensa";

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
    // Normalize the JSONB `clients` column into structured ArticleClient objects.
    const toClient = (raw: any): ArticleClient | null => {
      if (!raw) return null;
      if (typeof raw === 'string') {
        const name = raw.trim();
        return name ? { id: '', name } : null;
      }
      if (typeof raw === 'object') {
        const name = String(raw.name ?? raw.client ?? raw.label ?? '').trim();
        if (!name) return null;
        return {
          id: String(raw.id ?? ''),
          name,
          relevance: raw.relevance,
          keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : undefined,
        };
      }
      return null;
    };

    let clients: ArticleClient[] = [];
    if (Array.isArray(article.clients)) {
      clients = article.clients.map(toClient).filter(Boolean) as ArticleClient[];
    } else if (article.clients && typeof article.clients === 'object') {
      clients = Object.values(article.clients).map(toClient).filter(Boolean) as ArticleClient[];
    } else if (typeof article.clients === 'string') {
      const single = toClient(article.clients);
      if (single) clients = [single];
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
        ? article.keywords.map((keyword: any) => String(keyword))
        : [],
      image_url: article.image_url || undefined,
      last_processed: article.last_processed || undefined,
      sentiment: (article.sentiment as ArticleSentiment) || undefined,
      sentiment_score: typeof article.sentiment_score === 'number' ? article.sentiment_score : undefined,
      feed_source: article.feed_source ? {
        name: article.feed_source.name || '',
        last_successful_fetch: article.feed_source.last_successful_fetch
      } : undefined
    };
  });
};
