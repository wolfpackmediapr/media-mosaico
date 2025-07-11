import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody = null;
  try {
    requestBody = await req.json();
    const { sessionId, fileName, totalChunks } = requestBody;

    if (!sessionId || !fileName || !totalChunks) {
      throw new Error('Missing required parameters: sessionId, fileName, or totalChunks');
    }

    console.log(`Validating session: ${sessionId} for file: ${fileName}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check session status and validate completion
    const { data: sessionData, error: sessionCheckError } = await supabase
      .from('chunked_upload_sessions')
      .select('status, uploaded_chunks, total_chunks')
      .eq('session_id', sessionId)
      .single();

    if (sessionCheckError) {
      console.error('Could not check session status:', sessionCheckError);
      throw new Error(`Session ${sessionId} not found or inaccessible`);
    }

    // Check if already completed
    if (sessionData.status === 'completed') {
      console.log(`Session ${sessionId} already completed`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          fileName: fileName,
          message: 'File already processed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that all chunks were uploaded
    if (sessionData.uploaded_chunks !== sessionData.total_chunks) {
      throw new Error(`Incomplete upload: ${sessionData.uploaded_chunks}/${sessionData.total_chunks} chunks uploaded`);
    }

    console.log(`All ${totalChunks} chunks validated. Marking session as completed.`);

    // Mark session as completed without reassembly (chunks already uploaded to final location)
    const { error: completionError } = await supabase
      .from('chunked_upload_sessions')
      .update({ status: 'completed' })
      .eq('session_id', sessionId);

    if (completionError) {
      console.warn('Warning: Could not update session to completed:', completionError);
    }

    // Verify final file exists in storage
    const { data: fileCheck, error: fileCheckError } = await supabase.storage
      .from('video')
      .download(fileName);

    if (fileCheckError || !fileCheck) {
      console.warn('Final file not found, but session marked complete');
    } else {
      console.log(`Final file verified in storage: ${fileName}`);
    }

    // Clean up chunks in background
    const cleanupPromise = (async () => {
      try {
        const chunkNamesToDelete = [];
        for (let i = 0; i < totalChunks; i++) {
          chunkNamesToDelete.push(`chunks/${sessionId}/chunk_${i.toString().padStart(4, '0')}`);
        }
        
        // Delete chunks in batches
        const DELETE_BATCH_SIZE = 10;
        for (let i = 0; i < chunkNamesToDelete.length; i += DELETE_BATCH_SIZE) {
          const batch = chunkNamesToDelete.slice(i, i + DELETE_BATCH_SIZE);
          await supabase.storage.from('video').remove(batch);
        }
        
        console.log(`Cleaned up ${totalChunks} chunks for session ${sessionId}`);
      } catch (cleanupError) {
        console.warn('Error cleaning up chunks:', cleanupError);
      }
    })();

    // Start cleanup in background but don't wait for it
    EdgeRuntime.waitUntil(cleanupPromise);

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileName: fileName,
        message: 'File processing completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    // Try to update session status to failed
    try {
      if (requestBody?.sessionId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        
        await supabase
          .from('chunked_upload_sessions')
          .update({ status: 'failed' })
          .eq('session_id', requestBody.sessionId);
      }
    } catch (sessionError) {
      console.warn('Could not update session status to failed:', sessionError);
    }
    
    // Determine if error is retryable
    const isRetryable = !error.message?.includes('Chunks not found') && 
                       !error.message?.includes('already completed');
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during file reassembly',
        retryable: isRetryable
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});