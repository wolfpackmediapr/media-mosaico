import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { NewsCard } from "@/components/ui/news-cards";

const ITEMS_PER_PAGE = 10;

// Social media platforms list (same as in social/api.ts)
const SOCIAL_PLATFORMS = ['twitter', 'facebook', 'instagram', 'youtube', 'linkedin', 'social_media'];

export type SourceTypeFilter = 'all' | 'prensa' | 'social';
export type SentimentFilter = 'all' | 'positive' | 'negative' | 'neutral' | 'mixed';

export interface CombinedFeedFilters {
  sourceType: SourceTypeFilter;
  sentiment: SentimentFilter;
  clientId: string | null;
}

export interface ClientInfo {
  id: string;
  name: string;
  relevance?: string;
}

export interface ExtendedNewsCard extends NewsCard {
  sentiment?: string;
  sentimentScore?: number;
  matchedClients?: ClientInfo[];
}

export interface CombinedFeedResult {
  items: ExtendedNewsCard[];
  totalCount: number;
  prensaCount: number;
  socialCount: number;
  sentimentCounts: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
}

async function fetchCombinedNewsFeed(
  page: number, 
  filters: CombinedFeedFilters
): Promise<CombinedFeedResult> {
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Build query with filters
  let query = supabase
    .from('news_articles')
    .select(`
      id,
      title,
      description,
      link,
      pub_date,
      source,
      image_url,
      category,
      feed_source_id,
      sentiment,
      sentiment_score,
      clients,
      feed_source:feed_source_id (
        name,
        platform,
        platform_display_name
      )
    `, { count: 'exact' })
    .order('pub_date', { ascending: false });

  // Apply sentiment filter
  if (filters.sentiment !== 'all') {
    query = query.eq('sentiment', filters.sentiment);
  }

  // Apply client filter
  if (filters.clientId) {
    query = query.contains('clients', [{ id: filters.clientId }]);
  }

  const { data: articles, error: articlesError, count } = await query.range(from, to);

  if (articlesError) {
    console.error('Error fetching articles:', articlesError);
    throw articlesError;
  }

  // Count articles by type and sentiment
  let prensaCount = 0;
  let socialCount = 0;
  const sentimentCounts = {
    positive: 0,
    negative: 0,
    neutral: 0,
    mixed: 0
  };

  // Get all articles to count by type (just get the feed_source platform and sentiment)
  const { data: allArticlesForCount } = await supabase
    .from('news_articles')
    .select(`
      id,
      sentiment,
      feed_source:feed_source_id (
        platform
      )
    `);

  if (allArticlesForCount) {
    allArticlesForCount.forEach(article => {
      const feedSource = article.feed_source as { platform?: string } | null;
      const platform = feedSource?.platform;
      const isSocial = platform && SOCIAL_PLATFORMS.includes(platform);
      
      if (isSocial) {
        socialCount++;
      } else {
        prensaCount++;
      }

      // Count by sentiment
      const sentiment = article.sentiment as keyof typeof sentimentCounts;
      if (sentiment && sentimentCounts.hasOwnProperty(sentiment)) {
        sentimentCounts[sentiment]++;
      }
    });
  }

  // Filter items by source type (after fetching, since we need to join with feed_source)
  let filteredArticles = articles || [];
  if (filters.sourceType !== 'all') {
    filteredArticles = filteredArticles.filter(article => {
      const feedSource = article.feed_source as { platform?: string } | null;
      const platform = feedSource?.platform;
      const isSocial = platform && SOCIAL_PLATFORMS.includes(platform);
      
      if (filters.sourceType === 'social') {
        return isSocial;
      } else {
        return !isSocial;
      }
    });
  }

  // Transform articles to NewsCard format
  const items: ExtendedNewsCard[] = filteredArticles.map(article => {
    const feedSource = article.feed_source as { name?: string; platform?: string; platform_display_name?: string } | null;
    
    // Determine if social based on the feed_source's platform field
    const platform = feedSource?.platform;
    const isSocial = platform && SOCIAL_PLATFORMS.includes(platform);
    
    // Determine category and subcategory
    const category = isSocial ? 'Redes Sociales' : 'Prensa Digital';
    const subcategory = feedSource?.name || article.source || 'Desconocido';
    
    // Format time ago
    const timeAgo = article.pub_date 
      ? formatDistanceToNow(new Date(article.pub_date), { addSuffix: true, locale: es })
      : 'Fecha desconocida';
    
    // Determine gradient colors based on type and sentiment
    let gradientColors = isSocial 
      ? ['from-blue-500/20', 'to-purple-500/20']
      : ['from-emerald-500/20', 'to-teal-500/20'];

    // Override with sentiment colors if available
    if (article.sentiment === 'positive') {
      gradientColors = ['from-green-500/20', 'to-emerald-500/20'];
    } else if (article.sentiment === 'negative') {
      gradientColors = ['from-red-500/20', 'to-rose-500/20'];
    } else if (article.sentiment === 'mixed') {
      gradientColors = ['from-amber-500/20', 'to-orange-500/20'];
    }

    // Parse clients from the article
    let matchedClients: ClientInfo[] = [];
    if (article.clients && Array.isArray(article.clients)) {
      matchedClients = article.clients.map((c: any) => ({
        id: c.id || '',
        name: c.name || '',
        relevance: c.relevance || 'media'
      }));
    }

    return {
      id: article.id,
      title: article.title,
      category,
      subcategory,
      timeAgo,
      location: article.category || 'General',
      image: article.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=400&fit=crop',
      gradientColors,
      content: article.description ? [article.description] : undefined,
      link: article.link,
      sentiment: article.sentiment || undefined,
      sentimentScore: article.sentiment_score || undefined,
      matchedClients,
    };
  });

  return {
    items,
    totalCount: count || 0,
    prensaCount,
    socialCount,
    sentimentCounts,
  };
}

export function useCombinedNewsFeed(
  page: number = 1, 
  filters: CombinedFeedFilters = { sourceType: 'all', sentiment: 'all', clientId: null }
) {
  return useQuery({
    queryKey: ['combined-news-feed', page, filters],
    queryFn: () => fetchCombinedNewsFeed(page, filters),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

// Hook to fetch available clients for filtering
export function useClientsForFilter() {
  return useQuery({
    queryKey: ['clients-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
