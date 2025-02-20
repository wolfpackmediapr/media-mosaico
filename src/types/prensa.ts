
export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  link: string;
  pub_date: string;
  source: string;
  summary: string;
  category: string;
  clients: string[];
  keywords: string[];
  image_url?: string;
  last_processed?: string;
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
