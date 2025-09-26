
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests - IMMEDIATELY to avoid function failing before handling OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("Received request to check PDF job status");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse the request JSON
    const { jobId } = await req.json();
    
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Missing jobId parameter' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    console.log(`Checking status for job ID: ${jobId}`);
    
    // Get the job details
    const { data: job, error: jobError } = await supabase
      .from('pdf_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError) {
      console.error("Error fetching job:", jobError);
      return new Response(JSON.stringify({ error: 'Job not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // If job is completed, fetch the related clippings
    let clippings = [];
    if (job.status === 'completed') {
      const { data: clippingsData, error: clippingsError } = await supabase
        .from('press_clippings')
        .select('*')
        .eq('file_path', job.file_path)
        .order('page_number', { ascending: true });
      
      if (!clippingsError && clippingsData) {
        clippings = clippingsData;
      }
      
      // If no clippings found but job is completed, fetch the most recent clippings for this user
      if (clippings.length === 0) {
        const { data: recentClippings, error: recentError } = await supabase
          .from('press_clippings')
          .select('*')
          .eq('user_id', job.user_id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (!recentError && recentClippings) {
          // Filter clippings that match the publication name and were created recently
          const maxAge = new Date();
          maxAge.setMinutes(maxAge.getMinutes() - 15); // 15 minutes
          
          clippings = recentClippings.filter(clip => 
            clip.publication_name === job.publication_name && 
            new Date(clip.created_at) > maxAge
          );
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        job,
        clippings: clippings.length > 0 ? clippings : [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking PDF job status:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage || 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
