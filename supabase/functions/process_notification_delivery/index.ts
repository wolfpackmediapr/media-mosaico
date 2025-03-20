
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

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

    // Get pending delivery logs
    const { data: pendingDeliveries, error: deliveriesError } = await supabase
      .from("notification_delivery_log")
      .select("*, client_alerts(*)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20);  // Process in batches

    if (deliveriesError) {
      throw deliveriesError;
    }

    console.log(`Found ${pendingDeliveries.length} pending deliveries to process`);

    // Process each delivery
    const deliveryResults = [];
    
    for (const delivery of pendingDeliveries) {
      try {
        const notification = delivery.client_alerts;
        
        if (!notification) {
          throw new Error(`Notification not found for delivery ${delivery.id}`);
        }

        // Get client info
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", notification.client_id)
          .single();

        if (clientError || !client) {
          throw new Error(`Client not found for notification ${notification.id}`);
        }

        // Process based on channel type
        let success = false;
        let errorMsg = "";

        switch (delivery.channel) {
          case "email":
            // Simulate email delivery for now
            console.log(`[EMAIL] Sending to client ${client.name}: ${notification.title}`);
            console.log(`Email content: ${notification.description}`);
            // In a real implementation, you would call your email service here
            success = true;
            break;

          case "sms":
            // Simulate SMS delivery for now
            console.log(`[SMS] Sending to client ${client.name}: ${notification.title}`);
            // In a real implementation, you would call your SMS service here
            success = true;
            break;

          case "push":
            // Simulate push notification delivery for now
            console.log(`[PUSH] Sending to client ${client.name}: ${notification.title}`);
            // In a real implementation, you would call your push notification service here
            success = true;
            break;

          default:
            errorMsg = `Unsupported channel type: ${delivery.channel}`;
            break;
        }

        // Update delivery status
        if (success) {
          await supabase
            .from("notification_delivery_log")
            .update({ 
              status: "sent", 
              sent_at: new Date().toISOString() 
            })
            .eq("id", delivery.id);

          deliveryResults.push({
            id: delivery.id,
            channel: delivery.channel,
            status: "sent"
          });
        } else {
          await supabase
            .from("notification_delivery_log")
            .update({ 
              status: "failed", 
              error: errorMsg
            })
            .eq("id", delivery.id);

          deliveryResults.push({
            id: delivery.id,
            channel: delivery.channel,
            status: "failed",
            error: errorMsg
          });
        }
      } catch (err) {
        console.error(`Error processing delivery ${delivery.id}:`, err);
        
        // Update delivery status to failed
        await supabase
          .from("notification_delivery_log")
          .update({ 
            status: "failed", 
            error: err.message || "Unknown error"
          })
          .eq("id", delivery.id);

        deliveryResults.push({
          id: delivery.id,
          status: "failed",
          error: err.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingDeliveries.length} deliveries`,
        results: deliveryResults
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
