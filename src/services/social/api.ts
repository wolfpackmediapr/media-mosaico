
import { supabase } from "@/integrations/supabase/client";
import type { SocialPost, SocialPlatform } from "@/types/social";

// List of social media platforms to include
export const SOCIAL_PLATFORMS = ['twitter', 'facebook', 'instagram', 'youtube', 'linkedin', 'social_media'];

// Social feed URLs - ensure we're using the correct .json format
export const SOCIAL_FEED_URLS = [
  "https://rss.app/feeds/v1.1/nrAbJHacD1J6WUYp.json", // Jay Fonseca
  "https://rss.app/feeds/v1.1/zk9arb6A8VuE0TNe.json"  // Jugando Pelota Dura
];

// Constants
export const ITEMS_PER_PAGE = 10;

// Fetch platforms from the database
export const fetchPlatformsData = async () => {
  // Only get social media platforms, exclude news platforms
  const { data, error } = await supabase
    .from('feed_sources')
    .select('id, platform, platform_display_name, name')
    .in('platform', SOCIAL_PLATFORMS)
    .not('platform', 'is', null)
    .order('name');

  if (error) throw error;
  return data;
};

// Fetch platform counts
export const fetchPlatformCounts = async () => {
  // Get feed source IDs for social feeds
  const { data: feedSources } = await supabase
    .from('feed_sources')
    .select('id, name, platform')
    .in('url', SOCIAL_FEED_URLS)
    .in('platform', SOCIAL_PLATFORMS);
  
  const feedSourceIds = feedSources?.map(fs => fs.id) || [];
  
  // Now get articles only from these feed sources
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, feed_source_id, feed_source:feed_source_id(name, platform)')
    .in('feed_source_id', feedSourceIds);
    
  if (error) throw error;
  return articles;
};

// Fetch social media posts
export const fetchSocialPosts = async (
  page: number, 
  searchTerm: string = '', 
  selectedPlatforms: string[] = []
) => {
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Get feed source IDs for social feeds - only those marked as social platforms
  const { data: feedSources } = await supabase
    .from('feed_sources')
    .select('id, name')
    .in('url', SOCIAL_FEED_URLS)
    .in('platform', SOCIAL_PLATFORMS);
  
  const feedSourceIds = feedSources?.map(fs => fs.id) || [];
  
  // If no feed sources found, return empty result
  if (feedSourceIds.length === 0) {
    return { data: [], count: 0 };
  }

  console.log(`Fetching posts from feed sources: ${feedSourceIds.join(', ')}`);

  let query = supabase
    .from('news_articles')
    .select(`
      *,
      feed_source:feed_source_id (
        name,
        platform,
        platform_display_name,
        platform_icon,
        last_successful_fetch
      )
    `, { count: 'exact' })
    .in('feed_source_id', feedSourceIds);

  // Filter by source names if specificSources is provided
  if (selectedPlatforms.length > 0) {
    // Get feed sources that match the selected names/platforms
    const { data: filteredSources } = await supabase
      .from('feed_sources')
      .select('id')
      .in('name', selectedPlatforms)
      .in('platform', SOCIAL_PLATFORMS);
    
    if (filteredSources && filteredSources.length > 0) {
      const filteredSourceIds = filteredSources.map(fs => fs.id);
      query = query.in('feed_source_id', filteredSourceIds);
    }
  }

  // Apply search filter if searchTerm exists
  if (searchTerm) {
    const searchPattern = `%${searchTerm}%`;
    query = query.or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`);
  }

  // Get total count and paginated results
  const { data, error, count } = await query
    .order('pub_date', { ascending: false })
    .range(from, to);

  if (error) throw error;
  
  return { data, count: count || 0 };
};

// Refresh social feeds via the edge function
export const refreshSocialFeeds = async () => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new Error('Error al verificar la sesión');
  }
  
  if (!session) {
    throw new Error('Debe iniciar sesión para actualizar el feed');
  }

  const { data, error } = await supabase.functions.invoke('process-social-feeds', {
    body: { 
      timestamp: new Date().toISOString(),
      forceFetch: true // Add this flag to force fetching even if no changes
    }
  });

  if (error) {
    throw error;
  }
  
  return data;
};
