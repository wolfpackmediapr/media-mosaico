
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Import cors headers
import { corsHeaders } from "../process-social-feeds/cors.ts";

// Get Supabase credentials from environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types for better type safety
interface NotificationData {
  client_id: string;
  title: string;
  description?: string;
  content_id?: string;
  content_type?: "news" | "social" | "radio" | "tv" | "press";
  keyword_matched?: string[];
  importance_level: number;
  metadata?: Record<string, any>;
}

// Main function to serve HTTP requests
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse the request body
    const requestData = await req.json();
    console.log("Received notification request:", requestData);

    // Validate input data
    if (!requestData.client_id || !requestData.title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: client_id and title are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create the notification in the database
    const { data, error } = await supabase.from("client_alerts").insert({
      client_id: requestData.client_id,
      title: requestData.title,
      description: requestData.description || null,
      content_id: requestData.content_id || null,
      content_type: requestData.content_type || null,
      keyword_matched: requestData.keyword_matched || null,
      importance_level: requestData.importance_level || 3,
      status: "unread",
      metadata: requestData.metadata || null,
    }).select();

    if (error) {
      console.error("Error creating notification:", error);
      throw error;
    }

    console.log("Notification created successfully:", data);

    // Check notification preferences for this client
    const { data: preferences, error: prefError } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("client_id", requestData.client_id)
      .eq("is_active", true);

    if (prefError) {
      console.error("Error fetching notification preferences:", prefError);
      // We don't throw here because we still created the notification successfully
    }

    if (preferences && preferences.length > 0) {
      console.log("Found notification preferences:", preferences);
      
      // TODO: For each preference, check if it matches the criteria (source, threshold, etc.)
      // and then send notifications via the specified channels (email, SMS, etc.)
      // This would be implemented in Phase 2
    }

    return new Response(JSON.stringify({ success: true, notification: data[0] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
