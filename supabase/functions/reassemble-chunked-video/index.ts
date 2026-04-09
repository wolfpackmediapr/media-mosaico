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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check session status
    const { data: sessionData, error: sessionCheckError } = await supabase
      .from('chunked_upload_sessions')
      .select('status, uploaded_chunks, total_chunks, assembled_file_path, playback_type, manifest_created')
      .eq('session_id', sessionId)
      .single();

    if (sessionCheckError) {
      console.error('Could not check session status:', sessionCheckError);
      throw new Error(`Session ${sessionId} not found or inaccessible`);
    }

    // If already assembled, return the cached path immediately
    if (sessionData.assembled_file_path) {
      console.log(`Session ${sessionId} already has assembled file: ${sessionData.assembled_file_path}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          fileName: fileName,
          assembledPath: sessionData.assembled_file_path,
          message: 'File already assembled (cached)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For manifest-based uploads, chunks should equal total_chunks
    // Don't require status !== 'completed' — manifest uploads are marked completed after chunk upload
    if (sessionData.uploaded_chunks !== sessionData.total_chunks) {
      throw new Error(`Incomplete upload: ${sessionData.uploaded_chunks}/${sessionData.total_chunks} chunks uploaded`);
    }

    console.log(`All ${totalChunks} chunks validated. Starting streaming reassembly...`);

    // Normalize fileName to basename to prevent path duplication
    const baseName = fileName.includes('/') ? fileName.split('/').pop()! : fileName;
    const userSpecificPath = `${sessionId}/${baseName}`;

    console.log(`Normalized assembly path: ${userSpecificPath} (from fileName: ${fileName})`);

    // Streaming reassembly
    const reassembleStreamingFile = async () => {
      const startTime = Date.now();
      const maxExecutionTime = 480000; // 8 minutes

      const combinedStream = new ReadableStream({
        async start(controller) {
          try {
            let processedChunks = 0;
            let totalBytesProcessed = 0;

            for (let i = 0; i < totalChunks; i++) {
              const chunkStartTime = Date.now();

              if (Date.now() - startTime > maxExecutionTime) {
                throw new Error(`Reassembly timeout after ${Math.round((Date.now() - startTime) / 1000)}s`);
              }

              const chunkPath = `chunks/${sessionId}/chunk_${i.toString().padStart(4, '0')}`;

              const { data: chunkData, error: chunkError } = await supabase.storage
                .from('video')
                .download(chunkPath);

              if (chunkError || !chunkData) {
                throw new Error(`Failed to download chunk ${i}: ${chunkError?.message}`);
              }

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
              console.log(`Chunk ${i + 1}/${totalChunks} (${progress}%) - ${Math.round(chunkBytesProcessed / 1024)}KB in ${chunkTime}ms`);

              if (i % 4 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1));
              }
            }

            controller.close();
            const totalTime = Date.now() - startTime;
            console.log(`Streaming complete: ${Math.round(totalBytesProcessed / 1024 / 1024)}MB in ${Math.round(totalTime / 1000)}s`);
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        }
      });

      console.log(`Uploading reassembled file: ${userSpecificPath}`);
      const uploadStartTime = Date.now();

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
      console.log(`Upload complete in ${Math.round(uploadTime / 1000)}s`);
    };

    await reassembleStreamingFile();

    // Persist the assembled path back to the session
    const { error: completionError } = await supabase
      .from('chunked_upload_sessions')
      .update({ 
        assembled_file_path: userSpecificPath
      })
      .eq('session_id', sessionId);

    if (completionError) {
      console.warn('Warning: Could not update assembled_file_path:', completionError);
    }

    // Clean up chunks in background
    const cleanupPromise = (async () => {
      try {
        const chunkNamesToDelete = [];
        for (let i = 0; i < totalChunks; i++) {
          chunkNamesToDelete.push(`chunks/${sessionId}/chunk_${i.toString().padStart(4, '0')}`);
        }
        const DELETE_BATCH_SIZE = 5;
        for (let i = 0; i < chunkNamesToDelete.length; i += DELETE_BATCH_SIZE) {
          const batch = chunkNamesToDelete.slice(i, i + DELETE_BATCH_SIZE);
          await supabase.storage.from('video').remove(batch);
          if (i + DELETE_BATCH_SIZE < chunkNamesToDelete.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        console.log(`Cleaned up ${totalChunks} chunks for session ${sessionId}`);
      } catch (cleanupError) {
        console.warn('Error cleaning up chunks:', cleanupError);
      }
    })();

    (globalThis as any).EdgeRuntime?.waitUntil?.(cleanupPromise);

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
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRetryable = !errorMessage?.includes('Chunks not found') && 
                       !errorMessage?.includes('already assembled');
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage || 'An error occurred during file reassembly',
        retryable: isRetryable
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
