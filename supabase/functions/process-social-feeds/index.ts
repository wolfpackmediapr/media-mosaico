import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4" 
import { SOCIAL_FEEDS, POSTS_PER_FEED } from "./constants.ts"
import { processRssJsonFeed, updateFeedSource, logProcessingError } from "./feed-processor.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting process-social-feeds function...');
    
    // Parse request body if available
    const requestData = req.headers.get("Content-Type")?.includes("application/json")
      ? await req.json()
      : {};
      
    const forceFetch = requestData?.forceFetch === true;
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // Process each feed in the SOCIAL_FEEDS array
    const results = [];
    
    for (const feed of SOCIAL_FEEDS) {
      try {
        console.log(`Processing feed: ${feed.name} (${feed.platform})`);
        
        // Check if this feed source exists in the database
        let { data: existingSource, error: sourceError } = await supabase
          .from('feed_sources')
          .select('id, last_successful_fetch')
          .eq('url', feed.url)
          .maybeSingle();
        
        if (sourceError) {
          throw new Error(`Error checking feed source: ${sourceError.message}`);
        }
        
        let feedSourceId;
        
        if (!existingSource) {
          // Create the feed source if it doesn't exist
          const { data: newSource, error: createError } = await supabase
            .from('feed_sources')
            .insert({
              name: feed.name,
              url: feed.url,
              platform: feed.platform,
              platform_display_name: feed.name,
              active: true
            })
            .select('id')
            .single();
          
          if (createError) {
            throw new Error(`Error creating feed source: ${createError.message}`);
          }
          
          feedSourceId = newSource.id;
          console.log(`Created new feed source: ${feed.name} with ID ${feedSourceId}`);
        } else {
          feedSourceId = existingSource.id;
          
          // Check if we should skip this feed (if recently updated and not forcing)
          if (!forceFetch && existingSource.last_successful_fetch) {
            const lastFetchTime = new Date(existingSource.last_successful_fetch);
            const hoursSinceLastFetch = (Date.now() - lastFetchTime.getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceLastFetch < 1) { // Skip if fetched less than 1 hour ago
              console.log(`Skipping ${feed.name}, last fetched ${hoursSinceLastFetch.toFixed(2)} hours ago`);
              continue;
            }
          }
        }
        
        // Process the feed
        const articlesInserted = await processRssJsonFeed(supabase, feed, feedSourceId);
        
        // Update the feed source with success
        await updateFeedSource(supabase, feed.url, true);
        
        results.push({
          feed: feed.name,
          success: true,
          articles_inserted: articlesInserted,
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error processing feed ${feed.name}:`, error);
        
        // Log the error and update feed source
        await logProcessingError(supabase, feed, errorMessage);
        await updateFeedSource(supabase, feed.url, false, errorMessage);
        
        results.push({
          feed: feed.name,
          success: false,
          error: errorMessage
        });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Social feeds processed", 
        results
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
    console.error('Error in process-social-feeds function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: errorStack
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
