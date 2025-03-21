
import { supabase } from "@/integrations/supabase/client";
import type { NewsArticle, FeedSource } from "@/types/prensa";
import { SOCIAL_PLATFORMS } from "@/services/social/api";
import { transformDatabaseArticlesToNewsArticles } from "./transforms";

// Constants
export const ITEMS_PER_PAGE = 10;
export const NEWS_CACHE_TIME = 5 * 60 * 1000; // 5 minutes cache

// Keep track of last fetch time to optimize requests
let lastSourcesFetchTime = 0;
let cachedSources: FeedSource[] | null = null;

/**
 * Fetch news sources with optimized caching
 * - Uses in-memory cache for rapid consecutive requests
 * - Bypasses cache after expiration time
 */
export const fetchNewsSourcesFromDatabase = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Return cached data if it's fresh enough and not forced to refresh
  if (!forceRefresh && cachedSources && now - lastSourcesFetchTime < NEWS_CACHE_TIME) {
    console.log("Returning cached news sources");
    return cachedSources;
  }
  
  console.log("Fetching fresh news sources");
  
  // Only get news sources, exclude social media platforms
  const { data: sourcesData, error } = await supabase
    .from('feed_sources')
    .select('id, name, url, active, last_successful_fetch, last_fetch_error, error_count')
    .not('platform', 'in', `(${SOCIAL_PLATFORMS.join(',')})`)
    .or('platform.eq.news,platform.is.null')
    .order('name');

  if (error) throw error;
  
  // Update cache
  cachedSources = sourcesData;
  lastSourcesFetchTime = now;
  
  return sourcesData;
};

// Cache structure for articles by query parameters
interface ArticlesCacheItem {
  data: NewsArticle[];
  count: number;
  timestamp: number;
}

const articlesCache = new Map<string, ArticlesCacheItem>();

/**
 * Generate a cache key for articles query
 */
function getArticlesCacheKey(page: number, searchTerm: string, sourceId: string, dateFilter: string): string {
  return `articles:${page}:${searchTerm}:${sourceId}:${dateFilter}`;
}

/**
 * Fetch articles from the database with optimized caching
 */
export const fetchArticlesFromDatabase = async (
  page: number, 
  searchTerm: string = '', 
  sourceId: string = '',
  dateFilter: string = '',
  forceRefresh = false
) => {
  const cacheKey = getArticlesCacheKey(page, searchTerm, sourceId, dateFilter);
  const now = Date.now();
  
  // Check cache first if not forced to refresh
  if (!forceRefresh) {
    const cached = articlesCache.get(cacheKey);
    if (cached && now - cached.timestamp < NEWS_CACHE_TIME) {
      console.log("Returning cached articles for:", cacheKey);
      return { articlesData: cached.data, count: cached.count };
    }
  }
  
  console.log("Fetching fresh articles for:", cacheKey);
  
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
  
  // Add source filter if provided
  if (sourceId) {
    query = query.eq('feed_source_id', sourceId);
  }
  
  // Add date filter if provided
  if (dateFilter) {
    query = query.gte('pub_date', `${dateFilter}T00:00:00`)
                .lt('pub_date', `${dateFilter}T23:59:59`);
  }

  // Execute the query with pagination
  const { data: articlesData, error, count } = await query
    .order('pub_date', { ascending: false })
    .range(from, to);

  if (error) throw error;
  
  // Transform database articles to NewsArticle type before caching
  const transformedArticles = transformDatabaseArticlesToNewsArticles(articlesData);
  
  // Update cache
  articlesCache.set(cacheKey, {
    data: transformedArticles,
    count: count || 0,
    timestamp: now
  });
  
  return { articlesData: transformedArticles, count };
};

/**
 * Clear the articles cache - useful when new articles are added
 */
export const clearArticlesCache = () => {
  articlesCache.clear();
};

/**
 * Refresh the news feed via the edge function
 */
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
  
  // Clear caches after refresh
  clearArticlesCache();
  cachedSources = null;
  
  return data;
};
