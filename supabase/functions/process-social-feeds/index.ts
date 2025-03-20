
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "./cors.ts";
import { SOCIAL_FEEDS } from "./constants.ts";
import { processRssJsonFeed, updateFeedSource, logProcessingError } from "./feed-processor.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestData = await req.json();
    const timestamp = requestData.timestamp || new Date().toISOString();
    const specificFeed = requestData.specificFeed;
    const forceFetch = requestData.forceFetch || false;

    console.log(`Starting social feed processing at ${timestamp}`);

    // Determine which feeds to process
    const feedsToProcess = specificFeed
      ? SOCIAL_FEEDS.filter(feed => feed.url === specificFeed)
      : SOCIAL_FEEDS;

    if (feedsToProcess.length === 0) {
      console.log(`No matching feeds found for ${specificFeed}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No matching feeds found" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }

    const results = [];

    // Process each feed
    for (const feed of feedsToProcess) {
      console.log(`Processing feed: ${feed.name} (${feed.url})`);
      
      try {
        // First, ensure the feed source exists in the database
        let feedSourceId;
        
        // Check if feed source already exists
        const { data: existingSource, error: sourceQueryError } = await supabase
          .from("feed_sources")
          .select("id")
          .eq("url", feed.url)
          .maybeSingle();
        
        if (sourceQueryError) {
          console.error(`Error checking for existing feed source: ${sourceQueryError.message}`);
        }
        
        if (existingSource) {
          feedSourceId = existingSource.id;
          console.log(`Using existing feed source ID: ${feedSourceId}`);
          
          // Update the last successful fetch time
          await updateFeedSource(supabase, feed.url, true);
        } else {
          // Create a new feed source
          const { data: newSource, error: sourceError } = await supabase
            .from("feed_sources")
            .insert({
              name: feed.name,
              url: feed.url,
              platform: feed.platform,
              platform_display_name: feed.name,
              active: true,
              last_successful_fetch: new Date().toISOString()
            })
            .select("id")
            .single();
          
          if (sourceError) {
            throw new Error(`Error creating feed source: ${sourceError.message}`);
          }
          
          feedSourceId = newSource.id;
          console.log(`Created new feed source with ID: ${feedSourceId}`);
        }
        
        // Process the feed based on its format
        const insertedCount = await processRssJsonFeed(supabase, feed, feedSourceId);
        
        results.push({
          feed: feed.name,
          inserted: insertedCount
        });
      } catch (error) {
        console.error(`Error processing feed ${feed.name}: ${error.message}`);
        console.error(error.stack);
        
        // Update feed source with error
        await updateFeedSource(supabase, feed.url, false, error.message);
        
        // Log the error in the processing_errors table
        await logProcessingError(supabase, { feed_url: feed.url, feed_name: feed.name }, error.message);
        
        results.push({
          feed: feed.name,
          error: error.message
        });
      }
    }
    
    console.log("Feed processing completed");
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Feed processing completed",
        results: results
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error(`Global error: ${error.message}`);
    console.error(error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
