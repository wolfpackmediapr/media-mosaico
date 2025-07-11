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

    // Download chunks in parallel batches to avoid memory overload
    const BATCH_SIZE = 5; // Process 5 chunks at a time
    const chunkDataArray: Uint8Array[] = new Array(totalChunks);
    
    console.log(`Downloading ${totalChunks} chunks in batches of ${BATCH_SIZE}...`);
    
    for (let batchStart = 0; batchStart < totalChunks; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, totalChunks);
      console.log(`Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: chunks ${batchStart}-${batchEnd - 1}`);
      
      // Download batch in parallel
      const batchPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        const chunkFileName = `chunks/${sessionId}/chunk_${i.toString().padStart(4, '0')}`;
        batchPromises.push(
          supabase.storage.from('video').download(chunkFileName).then(result => ({ index: i, result }))
        );
      }
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      for (const promiseResult of batchResults) {
        if (promiseResult.status === 'fulfilled') {
          const { index, result } = promiseResult.value;
          const { data: chunkData, error: downloadError } = result;
          
          if (downloadError) {
            throw new Error(`Failed to download chunk ${index}: ${downloadError.message}`);
          }
          
          if (!chunkData) {
            throw new Error(`Chunk ${index} data is null`);
          }
          
          const arrayBuffer = await chunkData.arrayBuffer();
          chunkDataArray[index] = new Uint8Array(arrayBuffer);
        } else {
          throw new Error(`Failed to download chunk in batch: ${promiseResult.reason}`);
        }
      }
    }

    console.log(`Downloaded all ${totalChunks} chunks, calculating total size...`);

    // Calculate total size without keeping all chunks in memory
    const totalSize = chunkDataArray.reduce((sum, chunk) => sum + chunk.length, 0);
    console.log(`Total reassembled file size: ${totalSize} bytes`);

    // Stream reassembly to reduce memory usage
    console.log(`Creating reassembled file of ${totalSize} bytes...`);
    const reassembledFile = new Uint8Array(totalSize);
    let offset = 0;
    
    for (let i = 0; i < totalChunks; i++) {
      const chunk = chunkDataArray[i];
      reassembledFile.set(chunk, offset);
      offset += chunk.length;
      
      // Clear chunk from memory immediately after use
      chunkDataArray[i] = null as any;
      
      // Log progress every 20 chunks
      if (i % 20 === 0 || i === totalChunks - 1) {
        console.log(`Reassembled ${i + 1}/${totalChunks} chunks (${Math.round(((i + 1) / totalChunks) * 100)}%)`);
      }
    }

    console.log(`Reassembled file complete, uploading to final location: ${fileName}`);

    // Upload the reassembled file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video')
      .upload(fileName, reassembledFile, {
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
        fileSize: totalSize
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