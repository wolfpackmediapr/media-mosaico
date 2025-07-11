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

    // Download all chunks
    const chunkDataArray: Uint8Array[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkFileName = `chunks/${sessionId}/chunk_${i.toString().padStart(4, '0')}`;
      
      console.log(`Downloading chunk ${i + 1}/${totalChunks}: ${chunkFileName}`);
      
      const { data: chunkData, error: downloadError } = await supabase.storage
        .from('video')
        .download(chunkFileName);

      if (downloadError) {
        console.error(`Error downloading chunk ${i}:`, downloadError);
        throw new Error(`Failed to download chunk ${i}: ${downloadError.message}`);
      }

      if (!chunkData) {
        throw new Error(`Chunk ${i} data is null`);
      }

      const arrayBuffer = await chunkData.arrayBuffer();
      chunkDataArray.push(new Uint8Array(arrayBuffer));
    }

    console.log(`Downloaded all ${totalChunks} chunks, reassembling...`);

    // Calculate total size
    const totalSize = chunkDataArray.reduce((sum, chunk) => sum + chunk.length, 0);
    console.log(`Total reassembled file size: ${totalSize} bytes`);

    // Reassemble chunks into a single file
    const reassembledFile = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunkDataArray) {
      reassembledFile.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(`Reassembled file, uploading to final location: ${fileName}`);

    // Upload the reassembled file to the final location
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

    // Clean up chunks
    try {
      for (let i = 0; i < totalChunks; i++) {
        const chunkFileName = `chunks/${sessionId}/chunk_${i.toString().padStart(4, '0')}`;
        await supabase.storage
          .from('video')
          .remove([chunkFileName]);
      }
      console.log(`Cleaned up ${totalChunks} chunks for session ${sessionId}`);
    } catch (cleanupError) {
      console.warn('Error cleaning up chunks:', cleanupError);
      // Don't fail the whole operation if cleanup fails
    }

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
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred during file reassembly'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});