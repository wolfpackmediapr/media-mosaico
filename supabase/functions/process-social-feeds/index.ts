
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { SOCIAL_FEEDS } from "./constants.ts"
import { processRssJsonFeed, updateFeedSource, logProcessingError } from "./feed-processor.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a promise-based timeout function
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
}

// Process a single feed with timeout
async function processFeedWithTimeout(
  supabase: any, 
  feed: any, 
  timeoutMs: number = 10000
): Promise<{ success: boolean, articlesAdded: number, error?: string }> {
  try {
    console.log(`Checking feed source: ${feed.name} (${feed.platform})`);
    
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
    // Use Promise.race to implement timeout
    const articlesAdded = await Promise.race([
      processRssJsonFeed(supabase, feed, sourceId),
      timeout(timeoutMs)
    ]);
    
    console.log(`Added ${articlesAdded} new articles from ${feed.name}`);
    
    // Update feed source with success
    await updateFeedSource(supabase, feed.url, true);
    
    return { success: true, articlesAdded };
    
  } catch (feedError) {
    console.error(`Error processing feed ${feed.name}:`, feedError);
    
    // Log the error and update feed source with error
    await logProcessingError(supabase, feed, feedError.message);
    await updateFeedSource(supabase, feed.url, false, feedError.message);
    
    return { success: false, articlesAdded: 0, error: feedError.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting process-social-feeds function...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the request payload if any
    const requestData = await req.json().catch(() => ({}));
    const forceFetch = requestData.forceFetch === true;
    
    console.log(`Processing social feeds with force fetch: ${forceFetch}`);

    // Process feeds in parallel with error isolation
    const results = await Promise.allSettled(
      SOCIAL_FEEDS.map(feed => processFeedWithTimeout(supabase, feed, 15000))
    );
    
    // Count successes and failures
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failCount = SOCIAL_FEEDS.length - successCount;
    
    // Log summary
    console.log(`Processed ${SOCIAL_FEEDS.length} feeds: ${successCount} succeeded, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Social feeds processed: ${successCount} succeeded, ${failCount} failed`,
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
