
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/deploy_node_app

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

// Social media feeds to process
const SOCIAL_FEEDS = [
  {
    url: "https://rss.app/feeds/v1.1/nrAbJHacD1J6WUYp.json",
    name: "Jay Fonseca",
    platform: "twitter"
  },
  {
    url: "https://rss.app/feeds/v1.1/zk9arb6A8VuE0TNe.json",
    name: "Jugando Pelota Dura",
    platform: "twitter"
  }
];

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
        const { data: existingSource } = await supabase
          .from("feed_sources")
          .select("id")
          .eq("url", feed.url)
          .single();
        
        if (existingSource) {
          feedSourceId = existingSource.id;
          console.log(`Using existing feed source ID: ${feedSourceId}`);
          
          // Update the last successful fetch time
          await supabase
            .from("feed_sources")
            .update({ 
              last_successful_fetch: new Date().toISOString(),
              error_count: 0,
              last_fetch_error: null
            })
            .eq("id", feedSourceId);
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
        
        // Fetch the JSON feed
        const response = await fetch(feed.url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const feedData = await response.json();
        
        if (!feedData.items || !Array.isArray(feedData.items)) {
          throw new Error("Invalid feed format: items array not found");
        }
        
        console.log(`Found ${feedData.items.length} items in feed`);
        
        // Process each item in the feed
        const articlesToInsert = [];
        
        for (const item of feedData.items) {
          // Check if article already exists by link
          const { data: existingArticle } = await supabase
            .from("news_articles")
            .select("id")
            .eq("link", item.url)
            .maybeSingle();
          
          if (existingArticle) {
            console.log(`Article already exists: ${item.title}`);
            continue;
          }
          
          // Parse the publication date
          let pubDate;
          try {
            pubDate = new Date(item.date_published).toISOString();
            console.log(`Parsed date for "${item.title}": ${pubDate}`);
          } catch (e) {
            console.error(`Error parsing date for "${item.title}": ${e.message}`);
            pubDate = new Date().toISOString();
          }
          
          const newArticle = {
            feed_source_id: feedSourceId,
            title: item.title,
            description: item.content_html || item.summary,
            link: item.url,
            pub_date: pubDate,
            source: feed.name,
            image_url: item.image || (item.attachments && item.attachments[0]?.url),
            category: "Social Media",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          articlesToInsert.push(newArticle);
        }
        
        // Insert new articles in batch
        if (articlesToInsert.length > 0) {
          const { data: insertedArticles, error: insertError } = await supabase
            .from("news_articles")
            .insert(articlesToInsert)
            .select("id");
          
          if (insertError) {
            throw new Error(`Error inserting articles: ${insertError.message}`);
          }
          
          console.log(`Successfully inserted ${insertedArticles.length} articles`);
          results.push({
            feed: feed.name,
            inserted: insertedArticles.length
          });
        } else {
          console.log(`No new articles to insert for ${feed.name}`);
          results.push({
            feed: feed.name,
            inserted: 0
          });
        }
      } catch (error) {
        console.error(`Error processing feed ${feed.name}: ${error.message}`);
        
        // Update feed source with error
        await supabase
          .from("feed_sources")
          .update({
            last_fetch_error: error.message,
            error_count: supabase.rpc("increment", { row_id: feed.url })
          })
          .eq("url", feed.url);
        
        // Log the error in the processing_errors table
        await supabase
          .from("processing_errors")
          .insert({
            stage: "feed_processing",
            error_message: error.message,
            article_info: { feed_url: feed.url, feed_name: feed.name }
          });
        
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
