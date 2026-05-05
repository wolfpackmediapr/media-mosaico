
export interface ArticleClient {
  id: string;
  name: string;
  relevance?: 'alta' | 'media' | 'baja' | string;
  keywords?: string[];
}

export type ArticleSentiment = 'positive' | 'negative' | 'neutral' | 'mixed';

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  link: string;
  pub_date: string;
  source: string;
  summary: string;
  category: string;
  clients: ArticleClient[];
  keywords: string[];
  image_url?: string;
  last_processed?: string;
  sentiment?: ArticleSentiment;
  sentiment_score?: number;
  feed_source?: {
    name: string;
    last_successful_fetch: string | null;
  };
}

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  active: boolean;
  last_successful_fetch: string | null;
  last_fetch_error: string | null;
  error_count: number;
}
