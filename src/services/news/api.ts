
import { supabase } from "@/integrations/supabase/client";
import type { NewsArticle, FeedSource } from "@/types/prensa";
import { SOCIAL_PLATFORMS } from "@/services/social/api";

// Constants
export const ITEMS_PER_PAGE = 10;

// Fetch news sources from the database
export const fetchNewsSourcesFromDatabase = async () => {
  // Only get news sources, exclude social media platforms
  const { data: sourcesData, error } = await supabase
    .from('feed_sources')
    .select('id, name, url, active, last_successful_fetch, last_fetch_error, error_count')
    .not('platform', 'in', `(${SOCIAL_PLATFORMS.join(',')})`)
    .or('platform.eq.news,platform.is.null')
    .order('name');

  if (error) throw error;
  
  return sourcesData;
};

// Fetch articles from the database
export const fetchArticlesFromDatabase = async (page: number, searchTerm: string = '') => {
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Get only news articles, not social media posts
  let query = supabase
    .from('news_articles')
    .select(`
      *,
      feed_source:feed_source_id(*)
    `, { count: 'exact' });
  
  // Get feed sources that are NOT social media platforms
  const { data: newsSources } = await supabase
    .from('feed_sources')
    .select('id')
    .not('platform', 'in', `(${SOCIAL_PLATFORMS.join(',')})`)
    .or('platform.eq.news,platform.is.null');
  
  if (newsSources && newsSources.length > 0) {
    const newsSourceIds = newsSources.map(source => source.id);
    // Only include articles from news sources
    query = query.in('feed_source_id', newsSourceIds);
  }

  // Add search term filter if provided
  if (searchTerm) {
    const searchPattern = `%${searchTerm}%`;
    query = query.or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`);
  }

  // Execute the query with pagination
  const { data: articlesData, error, count } = await query
    .order('pub_date', { ascending: false })
    .range(from, to);

  if (error) throw error;
  
  return { articlesData, count };
};

// Refresh the news feed via the edge function
export const refreshNewsFeedViaFunction = async () => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new Error('Error al verificar la sesión');
  }
  
  if (!session) {
    throw new Error('Debe iniciar sesión para actualizar el feed');
  }

  const { data, error } = await supabase.functions.invoke('process-rss-feed', {
    body: { timestamp: new Date().toISOString() }
  });

  if (error) {
    throw error;
  }
  
  return data;
};
