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

    console.log(`Starting reassembly for session: ${sessionId}, file: ${fileName}, chunks: ${totalChunks}`);

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

    console.log(`All ${totalChunks} chunks validated. Starting streaming reassembly...`);

    // Enhanced streaming reassembly with timeout handling and performance optimizations
    const reassembleStreamingFile = async () => {
      const startTime = Date.now();
      const maxExecutionTime = 480000; // 8 minutes max (Supabase limit is 10)
      
      // Get file size from session data
      const { data: sessionFileData, error: sessionFileError } = await supabase
        .from('chunked_upload_sessions')
        .select('file_size')
        .eq('session_id', sessionId)
        .single();
      
      const fileSize = sessionFileData?.file_size || 0;
      const fileSizeMB = Math.round(fileSize / 1024 / 1024);
      console.log(`Starting enhanced reassembly for ${fileName} (${totalChunks} chunks, ${fileSizeMB}MB)`);
      
      // Reject files larger than 50MB for edge function processing
      if (fileSize > 50 * 1024 * 1024) { // >50MB
        throw new Error(`File too large for edge function processing (${fileSizeMB}MB > 50MB limit). Use client-side assembly instead.`);
      }
      
      console.log(`Processing small file (${fileSizeMB}MB) with optimized edge function strategy`);
      
      // Create optimized readable stream with batched processing
      const combinedStream = new ReadableStream({
        async start(controller) {
          try {
            let processedChunks = 0;
            let totalBytesProcessed = 0;
            
            // Process chunks with performance monitoring
            for (let i = 0; i < totalChunks; i++) {
              const chunkStartTime = Date.now();
              
              // Check for timeout
              if (Date.now() - startTime > maxExecutionTime) {
                throw new Error(`Reassembly timeout after ${Math.round((Date.now() - startTime) / 1000)}s`);
              }
              
              const chunkPath = `chunks/${sessionId}/chunk_${i.toString().padStart(4, '0')}`;
              
              try {
                // Download chunk with smaller buffer for better streaming
                const { data: chunkData, error: chunkError } = await supabase.storage
                  .from('video')
                  .download(chunkPath);
                  
                if (chunkError || !chunkData) {
                  throw new Error(`Failed to download chunk ${i}: ${chunkError?.message}`);
                }
                
                // Process chunk in smaller segments to avoid memory spikes
                const chunkStream = chunkData.stream();
                const reader = chunkStream.getReader();
                let chunkBytesProcessed = 0;
                
                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    controller.enqueue(value);
                    chunkBytesProcessed += value.length;
                    totalBytesProcessed += value.length;
                  }
                } finally {
                  reader.releaseLock();
                }
                
                processedChunks++;
                const chunkTime = Date.now() - chunkStartTime;
                const progress = (processedChunks / totalChunks * 100).toFixed(1);
                const speed = chunkBytesProcessed / chunkTime * 1000; // bytes per second
                
                console.log(`Chunk ${i + 1}/${totalChunks} (${progress}%) - ${Math.round(chunkBytesProcessed / 1024)}KB in ${chunkTime}ms (${Math.round(speed / 1024)}KB/s)`);
                
                // Yield control periodically to prevent blocking
                if (i % 4 === 0) {
                  await new Promise(resolve => setTimeout(resolve, 1));
                }
                
              } catch (error) {
                throw new Error(`Error processing chunk ${i}: ${error.message}`);
              }
            }
            
            controller.close();
            const totalTime = Date.now() - startTime;
            const avgSpeed = totalBytesProcessed / totalTime * 1000;
            console.log(`Streaming complete: ${Math.round(totalBytesProcessed / 1024 / 1024)}MB in ${Math.round(totalTime / 1000)}s (${Math.round(avgSpeed / 1024)}KB/s avg)`);
            
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        }
      });
      
      // Upload with enhanced error handling - create user-specific path
      const userSpecificPath = `${sessionId}/${fileName}`;
      console.log(`Uploading reassembled file: ${userSpecificPath}`);
      const uploadStartTime = Date.now();
      
      try {
        const { error: uploadError } = await supabase.storage
          .from('video')
          .upload(userSpecificPath, combinedStream, {
            cacheControl: '3600',
            upsert: true
          });
        
        if (uploadError) {
          throw new Error(`Failed to upload final file: ${uploadError.message}`);
        }
        
        const uploadTime = Date.now() - uploadStartTime;
        const totalProcessingTime = Date.now() - startTime;
        console.log(`Upload complete in ${Math.round(uploadTime / 1000)}s. Total processing time: ${Math.round(totalProcessingTime / 1000)}s`);
        
      } catch (uploadError) {
        console.error('Upload failed:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
    };

    // Perform streaming reassembly
    await reassembleStreamingFile();

    // Mark session as completed and store assembled file path
    const { error: completionError } = await supabase
      .from('chunked_upload_sessions')
      .update({ 
        status: 'completed',
        assembled_file_path: userSpecificPath
      })
      .eq('session_id', sessionId);

    if (completionError) {
      console.warn('Warning: Could not update session to completed:', completionError);
    }

    // Clean up chunks in background
    const cleanupPromise = (async () => {
      try {
        const chunkNamesToDelete = [];
        for (let i = 0; i < totalChunks; i++) {
          chunkNamesToDelete.push(`chunks/${sessionId}/chunk_${i.toString().padStart(4, '0')}`);
        }
        
        // Delete chunks in batches to avoid timeout
        const DELETE_BATCH_SIZE = 5; // Smaller batch size for reliability
        for (let i = 0; i < chunkNamesToDelete.length; i += DELETE_BATCH_SIZE) {
          const batch = chunkNamesToDelete.slice(i, i + DELETE_BATCH_SIZE);
          await supabase.storage.from('video').remove(batch);
          
          // Small delay between batches to prevent overwhelming the storage API
          if (i + DELETE_BATCH_SIZE < chunkNamesToDelete.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        console.log(`Cleaned up ${totalChunks} chunks for session ${sessionId}`);
      } catch (cleanupError) {
        console.warn('Error cleaning up chunks:', cleanupError);
      }
    })();

    // Start cleanup in background but don't wait for it
    globalThis.EdgeRuntime?.waitUntil?.(cleanupPromise);

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileName: fileName,
        assembledPath: userSpecificPath,
        message: 'File reassembly completed successfully'
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