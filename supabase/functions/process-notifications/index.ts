
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// Define the notification payload structure
interface NotificationPayload {
  client_id: string;
  title: string;
  description?: string;
  content_id?: string;
  content_type?: "news" | "social" | "radio" | "tv" | "press";
  keyword_matched?: string[];
  importance_level?: number;
  metadata?: Record<string, any>;
}

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    let payload: NotificationPayload;
    
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

    // Validate required fields
    if (!payload.client_id || !payload.title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: client_id and title are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check client existence
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name")
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

    // Get notification preferences for this client
    const { data: preferences, error: preferenceError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("client_id", payload.client_id)
      .eq("is_active", true);

    if (preferenceError) {
      console.error("Error fetching notification preferences:", preferenceError);
    }

    console.log(`Creating notification for client ${client.name} (${client.id})`);

    // Create the notification record
    const { data: notification, error: insertError } = await supabase
      .from("client_alerts")
      .insert({
        client_id: payload.client_id,
        title: payload.title,
        description: payload.description || null,
        content_id: payload.content_id || null,
        content_type: payload.content_type || null,
        keyword_matched: payload.keyword_matched || null,
        importance_level: payload.importance_level || 3,
        status: "unread",
        priority: getPriorityFromImportance(payload.importance_level || 3),
        metadata: payload.metadata || null
      })
      .select();

    if (insertError) {
      console.error("Error creating notification:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create notification" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If there are preferences, handle external notification channels
    if (preferences && preferences.length > 0) {
      // For each preference, determine if we should send notifications to external channels
      for (const pref of preferences) {
        // Check if we should send based on thresholds, etc.
        const shouldSend = checkShouldSendNotification(pref, payload);
        
        if (shouldSend) {
          // Send to all channels defined in the preference
          await sendToExternalChannels(pref, payload, client.name);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notification }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to determine notification priority from importance level
function getPriorityFromImportance(importance: number): string {
  if (importance >= 5) return "urgent";
  if (importance >= 4) return "high";
  if (importance >= 3) return "medium";
  return "low";
}

// Helper function to check if we should send a notification based on preferences
function checkShouldSendNotification(
  preference: any, 
  payload: NotificationPayload
): boolean {
  // Check threshold
  const matchCount = payload.keyword_matched?.length || 0;
  if (matchCount < (preference.threshold || 1)) {
    return false;
  }

  // Check source type
  if (payload.content_type && 
      preference.sources && 
      preference.sources.length > 0 && 
      !preference.sources.includes(payload.content_type)) {
    return false;
  }

  // TODO: Check frequency (real-time, hourly, daily, weekly)
  // For now, we'll only implement real-time

  return true;
}

// Helper function to send notifications to external channels
async function sendToExternalChannels(
  preference: any,
  payload: NotificationPayload,
  clientName: string
): Promise<void> {
  // Skip if no channels or only in-app
  if (!preference.notification_channels || 
      preference.notification_channels.length === 0 ||
      (preference.notification_channels.length === 1 && preference.notification_channels[0] === "in_app")) {
    return;
  }

  // For each channel type, send notification
  for (const channel of preference.notification_channels) {
    switch (channel) {
      case "email":
        // TODO: Implement email notifications
        console.log(`Would send email notification to client ${clientName}`);
        break;

      case "sms":
        // TODO: Implement SMS notifications
        console.log(`Would send SMS notification to client ${clientName}`);
        break;

      case "push":
        // TODO: Implement push notifications
        console.log(`Would send push notification to client ${clientName}`);
        break;

      default:
        // Skip unknown channels
        break;
    }
  }
}
