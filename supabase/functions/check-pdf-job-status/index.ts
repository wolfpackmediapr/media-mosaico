
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
    
    // Fetch batch task progress
    const { data: batches } = await supabase
      .from('pdf_batch_tasks')
      .select('*')
      .eq('job_id', jobId)
      .order('batch_number');

    // Calculate overall progress from batches
    let overallProgress = job.progress || 0;
    let batchInfo = null;

    if (batches && batches.length > 0) {
      const completedBatches = batches.filter(b => b.status === 'completed').length;
      const processingBatch = batches.find(b => b.status === 'processing');
      const totalBatches = batches.length;
      
      overallProgress = Math.floor((completedBatches / totalBatches) * 100);
      
      batchInfo = {
        total: totalBatches,
        completed: completedBatches,
        processing: batches.filter(b => b.status === 'processing').length,
        pending: batches.filter(b => b.status === 'pending').length,
        currentBatch: processingBatch?.batch_number,
        currentBatchProgress: processingBatch?.progress
      };
    }

    // Fetch clippings
    let clippings = [];
    let clippingsCount = 0;

    if (job.status === 'completed' || (batches && batches.some(b => b.status === 'completed'))) {
      console.log('Fetching clippings...');
      
      const { data: foundClippings, count, error: clippingsError } = await supabase
        .from('press_clippings')
        .select('*', { count: 'exact' })
        .eq('user_id', job.user_id)
        .eq('publication_name', job.publication_name)
        .gte('created_at', new Date(job.created_at).toISOString())
        .order('page_number', { ascending: true });

      if (clippingsError) {
        console.error('Error fetching clippings:', clippingsError);
      } else {
        clippings = foundClippings || [];
        clippingsCount = count || 0;
        console.log(`Found ${clippingsCount} clippings`);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        job: {
          ...job,
          progress: overallProgress,
          batches: batchInfo
        },
        clippings,
        clippingsCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error checking PDF job status:', error);
    
    return new Response(
      JSON.stringify({ error: errorMessage || 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
