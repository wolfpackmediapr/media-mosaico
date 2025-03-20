
import { supabase } from "@/integrations/supabase/client";
import type { SocialPost, SocialPlatform } from "@/types/social";

// List of social media platforms to include
export const SOCIAL_PLATFORMS = ['twitter', 'facebook', 'instagram', 'youtube', 'linkedin', 'social_media'];

// Social feed URLs - ensure we're using the correct .json format
export const SOCIAL_FEEDS = [
  {
    url: "https://rss.app/feeds/v1.1/LQAaHOXtVRGhYhlc.json", 
    name: "Jay Fonseca",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/zk9arb6A8VuE0TNe.json",  
    name: "Jugando Pelota Dura",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/BB3hsnvn6hOHtwVS.json",
    name: "Molusco",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/MRcCrwF4ucCwL3Ps.json",
    name: "Benjamín Torres Gotay",
    platform: "twitter"
  }
];

// Constants
export const ITEMS_PER_PAGE = 10;

// Fetch platforms from the database
export const fetchPlatformsData = async () => {
  console.log('Fetching platforms data...');
  
  // Only get social media platforms, exclude news platforms
  const { data, error } = await supabase
    .from('feed_sources')
    .select('id, platform, platform_display_name, name')
    .in('platform', SOCIAL_PLATFORMS)
    .not('platform', 'is', null)
    .order('name');

  if (error) {
    console.error('Error fetching platforms:', error);
    throw error;
  }
  
  console.log('Fetched platforms:', data?.length || 0);
  return data;
};

// Fetch platform counts
export const fetchPlatformCounts = async () => {
  console.log('Fetching platform counts...');
  
  // Get feed source IDs for social feeds
  const { data: feedSources, error: sourcesError } = await supabase
    .from('feed_sources')
    .select('id, name, platform')
    .in('platform', SOCIAL_PLATFORMS);
  
  if (sourcesError) {
    console.error('Error fetching feed sources:', sourcesError);
    throw sourcesError;
  }
  
  console.log('Feed sources found:', feedSources?.map(s => s.name));
  
  const feedSourceIds = feedSources?.map(fs => fs.id) || [];
  if (feedSourceIds.length === 0) {
    console.log('No feed sources found, returning empty array');
    return [];
  }
  
  // Now get articles only from these feed sources
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('id, feed_source_id, feed_source:feed_source_id(name, platform)')
    .in('feed_source_id', feedSourceIds);
    
  if (error) {
    console.error('Error fetching article counts:', error);
    throw error;
  }
  
  console.log('Articles for platform counts:', articles?.length || 0);
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

  console.log('Fetching social posts with params:', { page, searchTerm, selectedPlatforms });
  
  // Get all feed sources that match social platforms
  const { data: feedSources, error: sourcesError } = await supabase
    .from('feed_sources')
    .select('id, name, platform')
    .in('platform', SOCIAL_PLATFORMS);
  
  if (sourcesError) {
    console.error('Error fetching social feed sources:', sourcesError);
    throw sourcesError;
  }
  
  const feedSourceIds = feedSources?.map(fs => fs.id) || [];
  console.log('All social feed source IDs:', feedSourceIds);
  console.log('Feed sources:', feedSources?.map(fs => `${fs.name} (${fs.platform})`));
  
  // If no feed sources found, return empty result
  if (feedSourceIds.length === 0) {
    console.log('No feed sources found, returning empty result');
    return { data: [], count: 0 };
  }

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

  // Filter by source names if selectedPlatforms is provided
  if (selectedPlatforms.length > 0) {
    console.log('Filtering by selected platforms:', selectedPlatforms);
    
    // Get feed sources that match the selected names/platforms
    const filteredSourceIds = feedSources
      .filter(fs => selectedPlatforms.includes(fs.name))
      .map(fs => fs.id);
    
    console.log('Filtered source IDs:', filteredSourceIds);
    
    if (filteredSourceIds.length > 0) {
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

  if (error) {
    console.error('Error fetching social posts:', error);
    throw error;
  }
  
  console.log(`Fetched ${data?.length || 0} social posts out of ${count} total`);
  
  // Debug the actual data fetched
  if (data && data.length > 0) {
    console.log('First post pub_date:', data[0].pub_date);
    console.log('Sources in fetched data:', [...new Set(data.map(item => item.feed_source?.name))]);
  }
  
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

  console.log('Invoking process-social-feeds function with SOCIAL_FEEDS:', SOCIAL_FEEDS.map(f => f.name));
  
  const { data, error } = await supabase.functions.invoke('process-social-feeds', {
    body: { 
      timestamp: new Date().toISOString(),
      forceFetch: true // Force fetching regardless of last fetch time
    }
  });

  if (error) {
    console.error('Error refreshing social feeds:', error);
    throw error;
  }
  
  return data;
};
