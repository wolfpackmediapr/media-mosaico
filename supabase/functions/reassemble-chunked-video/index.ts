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

  try {
    const { sessionId, fileName, totalChunks } = await req.json();

    if (!sessionId || !fileName || !totalChunks) {
      throw new Error('Missing required parameters: sessionId, fileName, or totalChunks');
    }

    console.log(`Reassembling video: ${fileName} with ${totalChunks} chunks`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Update session status to processing
    const { error: sessionUpdateError } = await supabase
      .from('chunked_upload_sessions')
      .update({ status: 'processing' })
      .eq('session_id', sessionId);

    if (sessionUpdateError) {
      console.warn('Warning: Could not update session status:', sessionUpdateError);
    }

    // Use streaming approach to avoid loading entire file into memory
    console.log(`Starting streaming reassembly for ${totalChunks} chunks...`);
    
    // Create a streaming upload using readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let totalSize = 0;
          
          // Stream chunks one by one to avoid memory overload
          for (let i = 0; i < totalChunks; i++) {
            const chunkFileName = `chunks/${sessionId}/chunk_${i.toString().padStart(4, '0')}`;
            
            console.log(`Streaming chunk ${i + 1}/${totalChunks}...`);
            
            // Download chunk
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
            
            // Convert to array buffer and stream it
            const arrayBuffer = await chunkData.arrayBuffer();
            const chunkBytes = new Uint8Array(arrayBuffer);
            totalSize += chunkBytes.length;
            
            // Enqueue the chunk data
            controller.enqueue(chunkBytes);
            
            // Log progress every 10 chunks to reduce log noise
            if (i % 10 === 0 || i === totalChunks - 1) {
              console.log(`Streamed ${i + 1}/${totalChunks} chunks (${Math.round(((i + 1) / totalChunks) * 100)}%)`);
            }
          }
          
          console.log(`Streaming complete. Total size: ${totalSize} bytes`);
          controller.close();
        } catch (error) {
          console.error('Error in streaming:', error);
          controller.error(error);
        }
      }
    });

    // Convert stream to blob for upload
    console.log(`Converting stream to file for upload: ${fileName}`);
    const response = new Response(stream);
    const fileBlob = await response.blob();
    
    console.log(`File blob created (${fileBlob.size} bytes), uploading to storage...`);

    // Upload the reassembled file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video')
      .upload(fileName, fileBlob, {
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
        fileSize: fileBlob.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    // Try to update session status to failed
    try {
      const { sessionId } = await req.json().catch(() => ({}));
      if (sessionId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        
        await supabase
          .from('chunked_upload_sessions')
          .update({ status: 'failed' })
          .eq('session_id', sessionId);
      }
    } catch (sessionError) {
      console.warn('Could not update session status to failed:', sessionError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during file reassembly',
        retryable: true
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});