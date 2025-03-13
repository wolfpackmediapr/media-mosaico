
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse the request JSON
    const { jobId } = await req.json();
    
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Missing jobId parameter' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Get the job details
    const { data: job, error: jobError } = await supabase
      .from('pdf_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // If job is completed, get the clippings
    let clippings = [];
    if (job.status === 'completed') {
      const { data: clippingsData, error: clippingsError } = await supabase
        .from('press_clippings')
        .select('*')
        .eq('publication_name', job.publication_name)
        .order('page_number', { ascending: true });
      
      if (!clippingsError && clippingsData) {
        clippings = clippingsData;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        job,
        clippings: job.status === 'completed' ? clippings : []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking job status:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
