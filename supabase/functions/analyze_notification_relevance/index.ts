
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RelevancePayload {
  client_id: string;
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
    let payload: RelevancePayload;
    
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

    // Get client's notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from("client_alerts")
      .select("*, content_type")
      .eq("client_id", payload.client_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (notificationsError) {
      console.error("Error fetching notifications:", notificationsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch client notifications" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // No notifications to analyze
    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No notifications found for analysis",
          suggestions: [] 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate keyword engagement metrics
    const keywordEngagement: Record<string, { count: number, readCount: number, engagementRate: number }> = {};
    const contentTypePreference: Record<string, { count: number, readCount: number, engagementRate: number }> = {};
    
    // Analyze each notification
    notifications.forEach(notification => {
      // Process keywords
      if (notification.keyword_matched && Array.isArray(notification.keyword_matched)) {
        notification.keyword_matched.forEach((keyword: string) => {
          if (!keywordEngagement[keyword]) {
            keywordEngagement[keyword] = { count: 0, readCount: 0, engagementRate: 0 };
          }
          
          keywordEngagement[keyword].count++;
          
          if (notification.status === 'read' || notification.status === 'archived') {
            keywordEngagement[keyword].readCount++;
          }
        });
      }
      
      // Process content types
      if (notification.content_type) {
        if (!contentTypePreference[notification.content_type]) {
          contentTypePreference[notification.content_type] = { count: 0, readCount: 0, engagementRate: 0 };
        }
        
        contentTypePreference[notification.content_type].count++;
        
        if (notification.status === 'read' || notification.status === 'archived') {
          contentTypePreference[notification.content_type].readCount++;
        }
      }
    });
    
    // Calculate engagement rates
    Object.keys(keywordEngagement).forEach(keyword => {
      const item = keywordEngagement[keyword];
      item.engagementRate = item.count > 0 ? (item.readCount / item.count) : 0;
    });
    
    Object.keys(contentTypePreference).forEach(type => {
      const item = contentTypePreference[type];
      item.engagementRate = item.count > 0 ? (item.readCount / item.count) : 0;
    });
    
    // Generate suggestions
    const suggestions = [];
    
    // 1. Identify high and low engagement keywords
    const highEngagementKeywords = Object.entries(keywordEngagement)
      .filter(([_, data]) => data.count >= 5 && data.engagementRate >= 0.7)
      .map(([keyword, data]) => ({
        keyword,
        count: data.count,
        engagementRate: data.engagementRate
      }));
      
    const lowEngagementKeywords = Object.entries(keywordEngagement)
      .filter(([_, data]) => data.count >= 5 && data.engagementRate <= 0.3)
      .map(([keyword, data]) => ({
        keyword,
        count: data.count,
        engagementRate: data.engagementRate
      }));
    
    // 2. Suggest content type preferences based on engagement
    const contentTypeEngagement = Object.entries(contentTypePreference)
      .map(([type, data]) => ({
        type,
        count: data.count,
        engagementRate: data.engagementRate
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate);
    
    // 3. Generate actionable recommendations
    if (highEngagementKeywords.length > 0) {
      suggestions.push({
        type: "keyword_enhancement",
        title: "Keywords con alta interacción",
        description: "Estos keywords generan un alto nivel de interacción y podrían configurarse con un umbral más bajo",
        items: highEngagementKeywords
      });
    }
    
    if (lowEngagementKeywords.length > 0) {
      suggestions.push({
        type: "keyword_refinement",
        title: "Keywords con baja interacción",
        description: "Estos keywords generan notificaciones que rara vez se leen. Considere refinarlos o aumentar el umbral",
        items: lowEngagementKeywords
      });
    }
    
    if (contentTypeEngagement.length > 0) {
      suggestions.push({
        type: "content_type_preference",
        title: "Preferencias por tipo de contenido",
        description: "Tipos de contenido ordenados por nivel de interacción",
        items: contentTypeEngagement
      });
    }
    
    // 4. Threshold suggestions
    const overallEngagementRate = notifications.filter(n => 
      n.status === 'read' || n.status === 'archived'
    ).length / notifications.length;
    
    let thresholdSuggestion;
    if (overallEngagementRate < 0.3 && notifications.length > 20) {
      thresholdSuggestion = {
        type: "threshold_increase",
        title: "Ajuste de umbral recomendado",
        description: "La tasa general de interacción es baja. Considere aumentar el umbral para recibir menos notificaciones pero más relevantes",
        current_engagement: overallEngagementRate,
        recommended_threshold: 3
      };
    } else if (overallEngagementRate > 0.8 && notifications.length < 20) {
      thresholdSuggestion = {
        type: "threshold_decrease",
        title: "Ajuste de umbral recomendado",
        description: "La tasa de interacción es alta. Podría disminuir el umbral para recibir más notificaciones",
        current_engagement: overallEngagementRate,
        recommended_threshold: 1
      };
    }
    
    if (thresholdSuggestion) {
      suggestions.push(thresholdSuggestion);
    }

    return new Response(
      JSON.stringify({
        client_id: client.id,
        client_name: client.name,
        analyzed_count: notifications.length,
        overall_engagement: overallEngagementRate,
        suggestions
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
