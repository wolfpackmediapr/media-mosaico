
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

    // Call the database function to schedule content processing
    const { data, error } = await supabase
      .rpc("schedule_content_notification_processing");

    if (error) {
      throw error;
    }

    // Get pending jobs
    const { data: pendingJobs, error: jobsError } = await supabase
      .from("content_processing_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);  // Process in batches of 10

    if (jobsError) {
      throw jobsError;
    }

    console.log(`Found ${pendingJobs.length} pending jobs to process`);

    // Process each job by calling the process_content_notifications function
    const processingPromises = pendingJobs.map(async (job) => {
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/process_content_notifications`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ job_id: job.id }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to process job ${job.id}: ${errorText}`);
        }

        return await response.json();
      } catch (err) {
        console.error(`Error processing job ${job.id}:`, err);
        // Update job status to failed
        await supabase
          .from("content_processing_jobs")
          .update({ 
            status: "failed", 
            error: err.message || "Unknown error",
            processed_at: new Date().toISOString() 
          })
          .eq("id", job.id);
        return { error: err.message, job_id: job.id };
      }
    });

    // Wait for all processing to complete
    const results = await Promise.all(processingPromises);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingJobs.length} jobs`,
        results
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
