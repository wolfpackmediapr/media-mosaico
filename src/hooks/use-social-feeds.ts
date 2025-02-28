
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { SocialPost, SocialPlatform } from "@/types/social";

const ITEMS_PER_PAGE = 10;

// List of social media platforms to include
const SOCIAL_PLATFORMS = ['twitter', 'facebook', 'instagram', 'youtube', 'linkedin', 'social_media'];

export const useSocialFeeds = () => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchPlatforms = async () => {
    try {
      // Only get social media platforms, exclude news platforms
      const { data, error } = await supabase
        .from('feed_sources')
        .select('platform, platform_display_name')
        .in('platform', SOCIAL_PLATFORMS)
        .not('platform', 'is', null)
        .order('platform');

      if (error) throw error;
      
      if (data) {
        // Group by platform and count
        const platformCounts: Record<string, number> = {};
        const platformNames: Record<string, string> = {};
        
        // Get all social media posts to count by platform
        const { data: articles, error: articlesError } = await supabase
          .from('news_articles')
          .select('id, feed_source_id, feed_source:feed_source_id(platform)')
          .in('feed_source.platform', SOCIAL_PLATFORMS);
          
        if (articlesError) throw articlesError;
        
        // Count articles by platform
        if (articles) {
          articles.forEach(article => {
            if (article.feed_source?.platform) {
              platformCounts[article.feed_source.platform] = 
                (platformCounts[article.feed_source.platform] || 0) + 1;
            }
          });
        }
        
        // Create platform names mapping
        data.forEach(fs => {
          if (fs.platform) {
            platformNames[fs.platform] = fs.platform_display_name || fs.platform;
          }
        });
        
        // Transform data to match SocialPlatform interface
        const platformData: SocialPlatform[] = Object.keys(platformNames).map(platform => ({
          id: platform,
          name: platformNames[platform] || platform,
          count: platformCounts[platform] || 0
        }));
        
        // Sort by count descending, then name ascending
        platformData.sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.name.localeCompare(b.name);
        });
        
        setPlatforms(platformData);
      }
    } catch (error) {
      console.error('Error fetching platforms:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las plataformas",
        variant: "destructive",
      });
    }
  };

  const fetchPosts = async (page: number, searchTerm: string = '', selectedPlatforms: string[] = []) => {
    try {
      console.log('Fetching posts for page:', page, 'search:', searchTerm, 'platforms:', selectedPlatforms);
      setIsLoading(true);
      
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
      const { data: articlesData, error, count } = await query
        .order('pub_date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setTotalCount(count || 0);

      if (articlesData) {
        // Transform the data to include platform information
        const transformedPosts: SocialPost[] = articlesData.map(article => ({
          id: article.id,
          title: article.title,
          description: article.description || '',
          link: article.link,
          pub_date: article.pub_date,
          source: article.feed_source?.name || article.source,
          image_url: article.image_url,
          platform: article.feed_source?.platform || 'social_media',
          platform_display_name: article.feed_source?.platform_display_name || article.feed_source?.platform || 'Social Media',
          platform_icon: article.feed_source?.platform_icon
        }));

        setPosts(transformedPosts);
      }

      // Fetch platforms with counts
      await fetchPlatforms();
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las publicaciones",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFeeds = async () => {
    setIsRefreshing(true);
    try {
      console.log('Refreshing social feeds...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Error al verificar la sesión');
      }
      
      if (!session) {
        toast({
          title: "Error de autenticación",
          description: "Debe iniciar sesión para actualizar el feed",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('process-rss-feed', {
        body: { timestamp: new Date().toISOString() }
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }
      
      console.log('Social feed refresh response:', data);
      
      // Reset to first page after refresh
      await fetchPosts(1);
      await fetchPlatforms();

      toast({
        title: "¡Éxito!",
        description: "Feeds de redes sociales actualizados correctamente",
      });
    } catch (error) {
      console.error('Error refreshing feeds:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron actualizar los feeds",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    posts,
    platforms,
    isLoading,
    isRefreshing,
    totalCount,
    fetchPosts,
    fetchPlatforms,
    refreshFeeds,
  };
};
