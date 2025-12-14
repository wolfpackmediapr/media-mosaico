import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { NewsCard } from "@/components/ui/news-cards";

const ITEMS_PER_PAGE = 10;

// Social media platforms list (same as in social/api.ts)
const SOCIAL_PLATFORMS = ['twitter', 'facebook', 'instagram', 'youtube', 'linkedin', 'social_media'];

export interface CombinedFeedResult {
  items: NewsCard[];
  totalCount: number;
  prensaCount: number;
  socialCount: number;
}

async function fetchCombinedNewsFeed(page: number): Promise<CombinedFeedResult> {
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Fetch all feed sources to categorize them
  const { data: feedSources, error: sourcesError } = await supabase
    .from('feed_sources')
    .select('id, name, platform');

  if (sourcesError) {
    console.error('Error fetching feed sources:', sourcesError);
    throw sourcesError;
  }

  // Categorize feed sources
  const socialSourceIds = feedSources?.filter(fs => 
    fs.platform && SOCIAL_PLATFORMS.includes(fs.platform)
  ).map(fs => fs.id) || [];
  
  const prensaSourceIds = feedSources?.filter(fs => 
    !fs.platform || !SOCIAL_PLATFORMS.includes(fs.platform)
  ).map(fs => fs.id) || [];

  // Fetch articles from all sources
  const { data: articles, error: articlesError, count } = await supabase
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
      feed_source:feed_source_id (
        name,
        platform,
        platform_display_name
      )
    `, { count: 'exact' })
    .order('pub_date', { ascending: false })
    .range(from, to);

  if (articlesError) {
    console.error('Error fetching articles:', articlesError);
    throw articlesError;
  }

  // Get counts for each type
  const { count: prensaCount } = await supabase
    .from('news_articles')
    .select('id', { count: 'exact', head: true })
    .in('feed_source_id', prensaSourceIds.length > 0 ? prensaSourceIds : ['none']);

  const { count: socialCount } = await supabase
    .from('news_articles')
    .select('id', { count: 'exact', head: true })
    .in('feed_source_id', socialSourceIds.length > 0 ? socialSourceIds : ['none']);

  // Transform articles to NewsCard format
  const items: NewsCard[] = (articles || []).map(article => {
    const feedSource = article.feed_source as { name?: string; platform?: string; platform_display_name?: string } | null;
    const isSocial = article.feed_source_id && socialSourceIds.includes(article.feed_source_id);
    
    // Determine category and subcategory
    const category = isSocial ? 'Redes Sociales' : 'Prensa Digital';
    const subcategory = feedSource?.name || article.source || 'Desconocido';
    
    // Format time ago
    const timeAgo = article.pub_date 
      ? formatDistanceToNow(new Date(article.pub_date), { addSuffix: true, locale: es })
      : 'Fecha desconocida';
    
    // Determine gradient colors based on type
    const gradientColors = isSocial 
      ? ['from-blue-500/20', 'to-purple-500/20']
      : ['from-emerald-500/20', 'to-teal-500/20'];

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
    };
  });

  return {
    items,
    totalCount: count || 0,
    prensaCount: prensaCount || 0,
    socialCount: socialCount || 0,
  };
}

export function useCombinedNewsFeed(page: number = 1) {
  return useQuery({
    queryKey: ['combined-news-feed', page],
    queryFn: () => fetchCombinedNewsFeed(page),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}
