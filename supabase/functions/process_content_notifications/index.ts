
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentPayload {
  job_id: string;
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
    let payload: ContentPayload;
    
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

    if (!payload.job_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: job_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from("content_processing_jobs")
      .select("*")
      .eq("id", payload.job_id)
      .single();

    if (jobError || !job) {
      console.error("Job not found:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update job status to processing
    await supabase
      .from("content_processing_jobs")
      .update({ status: "processing" })
      .eq("id", job.id);

    console.log(`Processing ${job.content_type} content with ID ${job.content_id}`);

    // Get content based on content_type
    let content;
    let contentText = "";
    let contentTitle = "";
    let contentSource = "";

    switch (job.content_type) {
      case "news":
        const { data: newsArticle } = await supabase
          .from("news_articles")
          .select("*")
          .eq("id", job.content_id)
          .single();
        
        content = newsArticle;
        contentText = `${newsArticle?.title || ""} ${newsArticle?.description || ""}`;
        contentTitle = newsArticle?.title || "";
        contentSource = newsArticle?.source || "";
        break;

      case "press":
        const { data: pressClipping } = await supabase
          .from("press_clippings")
          .select("*")
          .eq("id", job.content_id)
          .single();
        
        content = pressClipping;
        contentText = `${pressClipping?.title || ""} ${pressClipping?.content || ""}`;
        contentTitle = pressClipping?.title || "";
        contentSource = pressClipping?.publication_name || "";
        break;

      case "radio":
      case "tv":
        const { data: transcription } = await supabase
          .from("transcriptions")
          .select("*")
          .eq("id", job.content_id)
          .single();
        
        content = transcription;
        contentText = transcription?.transcription_text || "";
        contentTitle = `Transcripción: ${transcription?.channel || transcription?.program || ""}`;
        contentSource = transcription?.channel || transcription?.program || "";
        break;

      case "social":
        const { data: socialPost } = await supabase
          .from("media_posts")
          .select("*")
          .eq("id", job.content_id)
          .single();
        
        content = socialPost;
        contentText = socialPost?.caption || "";
        contentTitle = "Publicación en redes sociales";
        contentSource = "Social Media";
        break;

      default:
        throw new Error(`Unsupported content type: ${job.content_type}`);
    }

    if (!content) {
      throw new Error(`Content not found for ${job.content_type} with ID ${job.content_id}`);
    }

    // Get all clients with their keywords
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, keywords");

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    // Process each client
    const notificationsGenerated = [];
    
    for (const client of clients) {
      // Skip clients without keywords
      if (!client.keywords || client.keywords.length === 0) {
        continue;
      }

      // Find keyword matches
      const matchedKeywords = client.keywords.filter((keyword: string) => 
        contentText.toLowerCase().includes(keyword.toLowerCase())
      );

      // Skip if no matches
      if (matchedKeywords.length === 0) {
        continue;
      }

      // Get client's notification preferences
      const { data: preferences, error: preferencesError } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("client_id", client.id)
        .eq("is_active", true);

      if (preferencesError) {
        console.error(`Failed to fetch preferences for client ${client.id}:`, preferencesError);
        continue;
      }

      // Calculate importance level based on number of matches
      const importanceLevel = calculateImportance(matchedKeywords.length);
      
      // Create notification
      const notificationData = {
        client_id: client.id,
        title: `Nuevo contenido con menciones de ${client.name}`,
        description: `Se encontraron ${matchedKeywords.length} coincidencias en ${contentSource}: "${contentTitle}"`,
        content_id: job.content_id,
        content_type: job.content_type,
        keyword_matched: matchedKeywords,
        importance_level: importanceLevel,
        priority: getPriorityFromImportance(importanceLevel),
        metadata: {
          content_title: contentTitle,
          match_count: matchedKeywords.length,
          source: contentSource
        }
      };

      // Insert notification
      const { data: notification, error: notificationError } = await supabase
        .from("client_alerts")
        .insert(notificationData)
        .select();

      if (notificationError) {
        console.error(`Failed to create notification for client ${client.id}:`, notificationError);
        continue;
      }

      notificationsGenerated.push(notification[0]);

      // Schedule external delivery if needed
      if (preferences && preferences.length > 0) {
        for (const pref of preferences) {
          if (shouldSendExternalNotification(pref, importanceLevel, job.content_type)) {
            await scheduleExternalNotifications(supabase, notification[0].id, pref.notification_channels);
          }
        }
      }
    }

    // Update job as completed
    await supabase
      .from("content_processing_jobs")
      .update({ 
        status: "completed", 
        processed_at: new Date().toISOString() 
      })
      .eq("id", job.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id: job.id,
        notifications_count: notificationsGenerated.length,
        notifications: notificationsGenerated
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    
    // Try to update job status to failed if we have the job ID
    try {
      const payload = await req.json();
      if (payload.job_id) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from("content_processing_jobs")
          .update({ 
            status: "failed", 
            error: error.message || "Unknown error",
            processed_at: new Date().toISOString() 
          })
          .eq("id", payload.job_id);
      }
    } catch (e) {
      console.error("Failed to update job status:", e);
    }
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper functions
function calculateImportance(matchCount: number): number {
  if (matchCount >= 5) return 5;
  if (matchCount >= 3) return 4;
  if (matchCount >= 2) return 3;
  return 2;
}

function getPriorityFromImportance(importance: number): string {
  if (importance >= 5) return "urgent";
  if (importance >= 4) return "high";
  if (importance >= 3) return "medium";
  return "low";
}

function shouldSendExternalNotification(
  preference: any, 
  importanceLevel: number,
  contentType: string
): boolean {
  // Check threshold
  if (importanceLevel < (preference.threshold || 1)) {
    return false;
  }

  // Check source type
  if (contentType && 
      preference.sources && 
      preference.sources.length > 0 && 
      !preference.sources.includes(contentType)) {
    return false;
  }

  // Only send if there are external channels configured
  const hasExternalChannels = preference.notification_channels &&
    preference.notification_channels.some((channel: string) => 
      channel !== "in_app");

  return hasExternalChannels;
}

async function scheduleExternalNotifications(
  supabase: any,
  notificationId: string,
  channels: string[]
): Promise<void> {
  // Only process external channels (not in_app)
  const externalChannels = channels.filter(channel => channel !== "in_app");
  
  if (externalChannels.length === 0) {
    return;
  }

  // Create delivery log entries for each channel
  const deliveryLogs = externalChannels.map(channel => ({
    notification_id: notificationId,
    channel: channel,
    status: "pending"
  }));

  await supabase.from("notification_delivery_log").insert(deliveryLogs);
}
