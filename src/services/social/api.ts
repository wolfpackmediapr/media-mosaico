
import { supabase } from "@/integrations/supabase/client";
import type { SocialPost, SocialPlatform } from "@/types/social";

// List of social media platforms to include
export const SOCIAL_PLATFORMS = ['twitter', 'facebook', 'instagram', 'youtube', 'linkedin', 'social_media'];

// Constants
export const ITEMS_PER_PAGE = 10;

// Fetch platforms from the database
export const fetchPlatformsData = async () => {
  // Only get social media platforms, exclude news platforms
  const { data, error } = await supabase
    .from('feed_sources')
    .select('platform, platform_display_name')
    .in('platform', SOCIAL_PLATFORMS)
    .not('platform', 'is', null)
    .order('platform');

  if (error) throw error;
  return data;
};

// Fetch platform counts
export const fetchPlatformCounts = async () => {
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, feed_source_id, feed_source:feed_source_id(platform)')
    .in('feed_source.platform', SOCIAL_PLATFORMS);
    
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
    .in('feed_source.platform', SOCIAL_PLATFORMS); // Only include social media platforms

  // Filter by platform if specified
  if (selectedPlatforms.length > 0) {
    query = query.in('feed_source.platform', selectedPlatforms);
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

  const { data, error } = await supabase.functions.invoke('process-rss-feed', {
    body: { timestamp: new Date().toISOString() }
  });

  if (error) {
    throw error;
  }
  
  return data;
};
