
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { SOCIAL_FEEDS } from "./constants.ts"
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
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Get the request payload if any
    const requestData = await req.json().catch(() => ({}));
    const forceFetch = requestData.forceFetch === true;
    
    console.log(`Processing social feeds with force fetch: ${forceFetch}`);

    // Get or create feed sources
    for (const feed of SOCIAL_FEEDS) {
      try {
        console.log(`Processing feed source: ${feed.name} (${feed.platform})`);
        
        // Check if this feed source already exists
        const { data: existingSource, error: sourceError } = await supabase
          .from('feed_sources')
          .select('id, name, platform, url, last_successful_fetch')
          .eq('name', feed.name)
          .eq('platform', feed.platform)
          .maybeSingle();

        if (sourceError) {
          throw new Error(`Error checking feed source: ${sourceError.message}`);
        }

        let sourceId;
        
        if (existingSource) {
          sourceId = existingSource.id;
          console.log(`Found existing source: ${existingSource.name} (ID: ${sourceId})`);
          
          // Update URL if it's different
          if (existingSource.url !== feed.url) {
            console.log(`Updating URL for ${feed.name} from ${existingSource.url} to ${feed.url}`);
            
            await supabase
              .from('feed_sources')
              .update({ 
                url: feed.url,
                platform_display_name: feed.platform === 'twitter' ? 'X (Twitter)' : feed.platform,
                platform_icon: feed.platform
              })
              .eq('id', sourceId);
          }
          
          // Skip if we recently fetched and not forcing
          if (!forceFetch && existingSource.last_successful_fetch) {
            const lastFetch = new Date(existingSource.last_successful_fetch);
            const hoursSinceLastFetch = (Date.now() - lastFetch.getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceLastFetch < 1) {
              console.log(`Skipping ${feed.name}, last fetched ${hoursSinceLastFetch.toFixed(1)} hours ago`);
              continue;
            }
          }
        } else {
          // Create new feed source
          console.log(`Creating new feed source for: ${feed.name} (${feed.platform})`);
          
          const { data: newSource, error: createError } = await supabase
            .from('feed_sources')
            .insert({
              name: feed.name,
              url: feed.url,
              platform: feed.platform,
              platform_display_name: feed.platform === 'twitter' ? 'X (Twitter)' : feed.platform,
              platform_icon: feed.platform,
              active: true
            })
            .select('id')
            .single();

          if (createError) {
            throw new Error(`Error creating feed source: ${createError.message}`);
          }
          
          sourceId = newSource.id;
          console.log(`Created new source with ID: ${sourceId}`);
        }

        // Now process the feed and add new articles
        const articlesAdded = await processRssJsonFeed(supabase, feed, sourceId);
        console.log(`Added ${articlesAdded} new articles from ${feed.name}`);
        
        // Update feed source with success
        await updateFeedSource(supabase, feed.url, true);
        
      } catch (feedError) {
        console.error(`Error processing feed ${feed.name}:`, feedError);
        
        // Log the error and update feed source with error
        await logProcessingError(supabase, feed, feedError.message);
        await updateFeedSource(supabase, feed.url, false, feedError.message);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Social feeds processed successfully",
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in process-social-feeds function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
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
