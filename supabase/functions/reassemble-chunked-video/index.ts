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

    console.log(`Reassembling video: ${fileName} with ${totalChunks} chunks`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check if session is already completed
    const { data: sessionData, error: sessionCheckError } = await supabase
      .from('chunked_upload_sessions')
      .select('status')
      .eq('session_id', sessionId)
      .single();

    if (sessionCheckError) {
      console.warn('Could not check session status:', sessionCheckError);
    } else if (sessionData?.status === 'completed') {
      console.log(`Session ${sessionId} already completed, returning success`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          fileName: fileName,
          message: 'File already assembled'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate chunks exist before processing
    const firstChunk = `chunks/${sessionId}/chunk_0000`;
    const { data: firstChunkCheck, error: chunkCheckError } = await supabase.storage
      .from('video')
      .download(firstChunk);

    if (chunkCheckError || !firstChunkCheck) {
      throw new Error(`Chunks not found for session ${sessionId}. They may have been cleaned up already.`);
    }

    // Update session status to processing
    const { error: sessionUpdateError } = await supabase
      .from('chunked_upload_sessions')
      .update({ status: 'processing' })
      .eq('session_id', sessionId);

    if (sessionUpdateError) {
      console.warn('Warning: Could not update session status:', sessionUpdateError);
    }

    // Use direct streaming to storage without creating blob
    console.log(`Starting direct stream assembly for ${totalChunks} chunks...`);
    
    // Create a direct streaming upload without memory conversion
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let totalSize = 0;
          
          // Process chunks in smaller batches to reduce memory usage
          const BATCH_SIZE = 5; // Process 5 chunks at a time
          
          for (let batchStart = 0; batchStart < totalChunks; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, totalChunks);
            
            for (let i = batchStart; i < batchEnd; i++) {
              const chunkFileName = `chunks/${sessionId}/chunk_${i.toString().padStart(4, '0')}`;
              
              // Download and stream chunk immediately
              const { data: chunkData, error: downloadError } = await supabase.storage
                .from('video')
                .download(chunkFileName);
              
              if (downloadError) {
                controller.error(new Error(`Failed to download chunk ${i}: ${downloadError.message}`));
                return;
              }
              
              if (!chunkData) {
                controller.error(new Error(`Chunk ${i} data is null`));
                return;
              }
              
              // Stream directly without storing in memory
              const reader = chunkData.stream().getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                totalSize += value.length;
                controller.enqueue(value);
              }
              
              // Log progress periodically
              if (i % 10 === 0 || i === totalChunks - 1) {
                console.log(`Processed chunk ${i + 1}/${totalChunks} (${Math.round(((i + 1) / totalChunks) * 100)}%)`);
              }
            }
            
            // Small delay between batches to prevent overwhelming
            if (batchEnd < totalChunks) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }
          
          console.log(`Stream processing complete. Total size: ${totalSize} bytes`);
          controller.close();
        } catch (error) {
          console.error('Error in streaming:', error);
          controller.error(error);
        }
      }
    });

    console.log(`Uploading directly to storage: ${fileName}`);

    // Upload the stream directly without blob conversion
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video')
      .upload(fileName, stream, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading reassembled file:', uploadError);
      throw new Error(`Failed to upload reassembled file: ${uploadError.message}`);
    }

    console.log(`Successfully uploaded reassembled file: ${fileName}`);

    // Update session status to completed
    const { error: completionError } = await supabase
      .from('chunked_upload_sessions')
      .update({ status: 'completed' })
      .eq('session_id', sessionId);

    if (completionError) {
      console.warn('Warning: Could not update session to completed:', completionError);
    }

    // Clean up chunks in background (don't wait for completion)
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
        message: 'File assembled successfully'
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