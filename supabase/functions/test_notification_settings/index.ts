
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestSettingsPayload {
  client_id: string;
  threshold: number;
  sources: string[];
  notification_channels: string[];
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // Initialize Supabase client with the service role key (for admin privileges)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request
    let payload: TestSettingsPayload;
    
    try {
      payload = await req.json();
    } catch (error) {
      console.error("Error parsing request:", error);
      return new Response(
        JSON.stringify({ error: "Invalid request payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!payload.client_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: client_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, keywords")
      .eq("id", payload.client_id)
      .single();

    if (clientError || !client) {
      console.error("Client not found:", clientError);
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get recent content based on sources from the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();
    
    const contentItems = [];
    
    // Collect relevant content from specified sources
    if (payload.sources.includes("news")) {
      const { data: newsArticles, error } = await supabase
        .from("news_articles")
        .select("id, title, description, source, created_at")
        .gte("created_at", oneWeekAgoStr)
        .limit(50);
        
      if (!error && newsArticles) {
        contentItems.push(...newsArticles.map(item => ({
          id: item.id,
          type: "news",
          title: item.title,
          content: `${item.title} ${item.description || ""}`,
          source: item.source,
          created_at: item.created_at
        })));
      }
    }
    
    if (payload.sources.includes("press")) {
      const { data: pressClippings, error } = await supabase
        .from("press_clippings")
        .select("id, title, content, publication_name, created_at")
        .gte("created_at", oneWeekAgoStr)
        .limit(50);
        
      if (!error && pressClippings) {
        contentItems.push(...pressClippings.map(item => ({
          id: item.id,
          type: "press",
          title: item.title,
          content: `${item.title} ${item.content || ""}`,
          source: item.publication_name,
          created_at: item.created_at
        })));
      }
    }
    
    if (payload.sources.includes("radio") || payload.sources.includes("tv")) {
      const { data: transcriptions, error } = await supabase
        .from("transcriptions")
        .select("id, transcription_text, channel, program, created_at")
        .gte("created_at", oneWeekAgoStr)
        .limit(50);
        
      if (!error && transcriptions) {
        contentItems.push(...transcriptions.map(item => ({
          id: item.id,
          type: item.channel ? "tv" : "radio",
          title: `Transcripción: ${item.channel || item.program || ""}`,
          content: item.transcription_text || "",
          source: item.channel || item.program || "",
          created_at: item.created_at
        })));
      }
    }
    
    if (payload.sources.includes("social")) {
      const { data: socialPosts, error } = await supabase
        .from("media_posts")
        .select("id, caption, created_at")
        .gte("created_at", oneWeekAgoStr)
        .limit(50);
        
      if (!error && socialPosts) {
        contentItems.push(...socialPosts.map(item => ({
          id: item.id,
          type: "social",
          title: "Publicación en redes sociales",
          content: item.caption || "",
          source: "Social Media",
          created_at: item.created_at
        })));
      }
    }
    
    // Filter content items based on the client's keywords
    const matchingContent = [];
    
    for (const item of contentItems) {
      if (!client.keywords || client.keywords.length === 0) continue;
      
      // Filter sources
      if (!payload.sources.includes(item.type)) continue;
      
      // Find matching keywords
      const matchedKeywords = client.keywords.filter((keyword: any) => 
        item.content.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // Skip if no matches or below threshold
      if (matchedKeywords.length < payload.threshold) continue;
      
      matchingContent.push({
        id: item.id,
        type: item.type,
        title: item.title,
        source: item.source,
        created_at: item.created_at,
        matched_keywords: matchedKeywords,
        importance_level: calculateImportance(matchedKeywords.length)
      });
    }
    
    // Sort by created_at (newest first)
    matchingContent.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Aggregate stats by source
    const statsBySource: Record<string, { count: number, importance: number }> = {};
    
    matchingContent.forEach(item => {
      if (!statsBySource[item.type]) {
        statsBySource[item.type] = { count: 0, importance: 0 };
      }
      
      statsBySource[item.type].count++;
      statsBySource[item.type].importance += item.importance_level;
    });
    
    // Calculate averages
    Object.keys(statsBySource).forEach(source => {
      const stats = statsBySource[source];
      stats.importance = stats.count > 0 ? stats.importance / stats.count : 0;
    });

    return new Response(
      JSON.stringify({
        client_id: client.id,
        client_name: client.name,
        content_analyzed: contentItems.length,
        content_matched: matchingContent.length,
        count: matchingContent.length,
        matches: matchingContent.slice(0, 10), // Return only the first 10 for preview
        stats_by_source: statsBySource,
        notification_channels: payload.notification_channels
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to calculate importance level
function calculateImportance(matchCount: number): number {
  if (matchCount >= 5) return 5;
  if (matchCount >= 3) return 4;
  if (matchCount >= 2) return 3;
  return 2;
}
