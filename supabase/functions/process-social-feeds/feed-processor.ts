
import { cleanHtmlContent, extractImageUrl } from "./content-utils.ts";
import { POSTS_PER_FEED } from "./constants.ts";

// Process RSS/JSON feed with better error handling
export const processRssJsonFeed = async (supabase: any, feed: any, feedSourceId: string) => {
  console.log(`Fetching JSON feed: ${feed.url}`);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Publimedia-FeedProcessor/1.0',
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Check for response type - must be JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`Expected JSON but got ${contentType} from ${feed.url}`);
      // Continue anyway as some servers may return wrong content-type
    }
    
    let feedData;
    try {
      feedData = await response.json();
    } catch (jsonError) {
      throw new Error(`Invalid JSON response: ${jsonError.message}`);
    }
    
    if (!feedData.items || !Array.isArray(feedData.items)) {
      throw new Error("Invalid feed format: items array not found");
    }
    
    console.log(`Found ${feedData.items.length} items in feed, will process up to ${POSTS_PER_FEED}`);
    
    // Process only the latest posts (up to POSTS_PER_FEED)
    const articlesToInsert = [];
    const itemsToProcess = feedData.items.slice(0, POSTS_PER_FEED);
    
    for (const item of itemsToProcess) {
      const linkUrl = item.url || item.link;
      if (!linkUrl) {
        console.warn(`Skipping item without URL: ${item.title}`);
        continue;
      }
      
      try {
        // Check if article already exists by link
        const { data: existingArticle } = await supabase
          .from("news_articles")
          .select("id")
          .eq("link", linkUrl)
          .maybeSingle();
        
        if (existingArticle) {
          console.log(`Article already exists: ${item.title}`);
          continue;
        }
        
        // Parse the publication date
        let pubDate;
        try {
          pubDate = new Date(item.date_published || item.pubDate || item.published).toISOString();
        } catch (e) {
          console.error(`Error parsing date for "${item.title}": ${e.message}`);
          pubDate = new Date().toISOString();
        }
        
        // Get the best description content (prefer content_html over summary over description)
        const description = cleanHtmlContent(
          item.content_html || item.content || item.summary || item.description || ""
        );
        
        // Extract image URL from multiple possible sources
        const imageUrl = extractImageUrl(item);
        
        const newArticle = {
          feed_source_id: feedSourceId,
          title: item.title || 'Sin título',
          description: description,
          link: linkUrl,
          pub_date: pubDate,
          source: feed.name,
          image_url: imageUrl,
          category: "Social Media",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        articlesToInsert.push(newArticle);
      } catch (itemError) {
        // Log error but continue processing other items
        console.error(`Error processing item "${item.title}": ${itemError.message}`);
      }
    }
    
    // Insert new articles in batch
    if (articlesToInsert.length > 0) {
      try {
        const { data: insertedArticles, error: insertError } = await supabase
          .from("news_articles")
          .insert(articlesToInsert)
          .select("id");
        
        if (insertError) {
          throw new Error(`Error inserting articles: ${insertError.message}`);
        }
        
        console.log(`Successfully inserted ${insertedArticles.length} articles from ${feed.name}`);
        return insertedArticles.length;
      } catch (batchError) {
        console.error(`Batch insert failed for ${feed.name}: ${batchError.message}`);
        
        // Fall back to inserting one by one
        let insertedCount = 0;
        for (const article of articlesToInsert) {
          try {
            const { error } = await supabase
              .from("news_articles")
              .insert([article]);
              
            if (!error) {
              insertedCount++;
            }
          } catch (singleInsertError) {
            console.error(`Single insert failed: ${singleInsertError.message}`);
          }
        }
        
        console.log(`Fallback insertion completed: ${insertedCount}/${articlesToInsert.length} articles inserted`);
        return insertedCount;
      }
    }
    
    console.log(`No new articles to insert for ${feed.name}`);
    return 0;
  } catch (error) {
    console.error(`Failed to process feed ${feed.url}: ${error.message}`);
    throw error;
  }
};

// Update the feed source with success or error information
export const updateFeedSource = async (supabase: any, feedUrl: string, success: boolean, errorMessage?: string) => {
  try {
    // Find the feed source
    const { data: existingSource } = await supabase
      .from("feed_sources")
      .select("id, error_count")
      .eq("url", feedUrl)
      .maybeSingle();
      
    if (existingSource) {
      if (success) {
        // Update with success
        await supabase
          .from("feed_sources")
          .update({ 
            last_successful_fetch: new Date().toISOString(),
            error_count: 0,
            last_fetch_error: null
          })
          .eq("id", existingSource.id);
      } else {
        // Update with error
        await supabase
          .from("feed_sources")
          .update({
            last_fetch_error: errorMessage,
            error_count: existingSource.error_count ? existingSource.error_count + 1 : 1
          })
          .eq("url", feedUrl);
      }
    }
  } catch (error) {
    console.error(`Failed to update feed source: ${error.message}`);
  }
};

// Log processing errors
export const logProcessingError = async (supabase: any, feedInfo: any, errorMessage: string) => {
  try {
    await supabase
      .from("processing_errors")
      .insert({
        stage: "feed_processing",
        error_message: errorMessage,
        article_info: feedInfo
      });
  } catch (logError) {
    console.error(`Failed to log error: ${logError.message}`);
  }
};
