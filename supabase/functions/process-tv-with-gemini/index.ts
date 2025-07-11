
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateEnvironment } from './environment.ts';
import { processVideoWithGemini } from './gemini-unified-processor.ts';
import { validateAndGetFile, downloadVideoWithRetry } from './storage-utils.ts';
import { updateTranscriptionRecord } from './database-utils.ts';
import { categorizeError } from './error-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to process chunked video files for audio extraction
async function processChunksForAudio(supabase: any, manifest: any, requestId: string): Promise<Blob> {
  console.log(`[${requestId}] Processing ${manifest.total_chunks} chunks for audio extraction...`);
  
  const chunkOrder = manifest.chunk_order;
  const chunks: Uint8Array[] = [];
  
  // Download all chunks sequentially to avoid memory issues
  for (let i = 0; i < chunkOrder.length; i++) {
    const chunkInfo = chunkOrder[i];
    console.log(`[${requestId}] Downloading chunk ${i + 1}/${chunkOrder.length}...`);
    
    const { data: chunkBlob, error } = await supabase.storage
      .from('video')
      .download(chunkInfo.path);
    
    if (error || !chunkBlob) {
      console.error(`[${requestId}] Failed to download chunk ${i}:`, error);
      throw new Error(`Failed to download chunk ${i}: ${error?.message || 'Unknown error'}`);
    }
    
    // Convert blob to array buffer and then to Uint8Array
    const arrayBuffer = await chunkBlob.arrayBuffer();
    chunks.push(new Uint8Array(arrayBuffer));
  }
  
  console.log(`[${requestId}] All chunks downloaded, reassembling for processing...`);
  
  // Calculate total size
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  
  // Create combined array
  const combined = new Uint8Array(totalSize);
  let offset = 0;
  
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  
  // Create blob for processing
  const reassembledBlob = new Blob([combined], { type: manifest.mime_type || 'video/mp4' });
  
  console.log(`[${requestId}] Chunk reassembly completed:`, {
    totalChunks: chunkOrder.length,
    totalSize: reassembledBlob.size,
    type: reassembledBlob.type
  });
  
  return reassembledBlob;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] === UNIFIED PROCESSING START ===`);
    
    // Step 1: Validate environment
    const { supabaseUrl, supabaseServiceKey, geminiApiKey } = validateEnvironment();
    console.log(`[${requestId}] Environment validated successfully`);
    
    // Step 2: Parse and validate request
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { videoPath, transcriptionId } = requestBody;
    
    console.log(`[${requestId}] Request details:`, {
      videoPath,
      transcriptionId,
      hasVideoPath: !!videoPath,
      hasTranscriptionId: !!transcriptionId,
      videoPathLength: videoPath?.length
    });
    
    if (!videoPath) {
      return new Response(
        JSON.stringify({ 
          error: 'Video path is required',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth context
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError) {
        console.error(`[${requestId}] Auth error:`, authError);
      } else {
        console.log(`[${requestId}] Authenticated user:`, user?.id);
      }
    }

    // Step 3.5: Fetch categories and clients for dynamic prompt
    console.log(`[${requestId}] Fetching categories and clients for dynamic prompt...`);
    let categories = [];
    let clients = [];
    
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('name_es, name_en');
      
      if (!categoriesError && categoriesData) {
        categories = categoriesData;
        console.log(`[${requestId}] Fetched ${categories.length} categories`);
      }
      
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('name, category, keywords');
      
      if (!clientsError && clientsData) {
        clients = clientsData;
        console.log(`[${requestId}] Fetched ${clients.length} clients`);
      }
    } catch (fetchError) {
      console.warn(`[${requestId}] Failed to fetch categories/clients, using defaults:`, fetchError);
    }

    // Step 4: Update initial processing status
    if (transcriptionId) {
      await updateTranscriptionRecord(supabase, transcriptionId, {
        status: 'processing',
        progress: 10
      });
      console.log(`[${requestId}] Updated transcription status to processing`);
    }

    // Step 5: Handle chunked vs assembled video files
    let videoBlob;
    
    if (videoPath.startsWith('chunked:')) {
      // Handle chunked video files
      const sessionId = videoPath.replace('chunked:', '');
      console.log(`[${requestId}] Processing chunked video with session ID: ${sessionId}`);
      
      // Get chunk manifest
      const { data: manifest, error: manifestError } = await supabase
        .from('video_chunk_manifests')
        .select('*')
        .eq('session_id', sessionId)
        .single();
      
      if (manifestError || !manifest) {
        throw new Error(`Failed to load chunk manifest for session: ${sessionId}`);
      }
      
      console.log(`[${requestId}] Found chunk manifest with ${manifest.total_chunks} chunks`);
      
      // Process chunks for audio extraction (without reassembly)
      videoBlob = await processChunksForAudio(supabase, manifest, requestId);
      
    } else {
      // Handle regular assembled video files
      console.log(`[${requestId}] Processing assembled video file from video bucket...`);
      const videoUrl = await validateAndGetFile(supabase, videoPath);
      console.log(`[${requestId}] Video file validated successfully`);
      
      if (transcriptionId) {
        await updateTranscriptionRecord(supabase, transcriptionId, {
          progress: 20
        });
      }

      // Download video with retry
      console.log(`[${requestId}] Downloading video...`);
      videoBlob = await downloadVideoWithRetry(videoUrl);
    }
    
    console.log(`[${requestId}] Video processing prepared:`, {
      size: videoBlob.size,
      type: videoBlob.type
    });

    if (transcriptionId) {
      await updateTranscriptionRecord(supabase, transcriptionId, {
        progress: 30
      });
    }

    // Step 7: Process video with unified Gemini workflow (now with dynamic data)
    console.log(`[${requestId}] Starting unified video processing with dynamic prompt...`);
    const result = await processVideoWithGemini(
      videoBlob, 
      geminiApiKey, 
      videoPath,
      (progress) => {
        // Progress callback for updating database
        const progressPercent = Math.min(30 + Math.floor(progress * 60), 90);
        console.log(`[${requestId}] Processing progress: ${(progress * 100).toFixed(1)}% (${progressPercent}%)`);
        
        if (transcriptionId) {
          updateTranscriptionRecord(supabase, transcriptionId, {
            progress: progressPercent
          }).catch(err => console.warn(`[${requestId}] Progress update failed:`, err));
        }
      },
      categories,
      clients
    );

    console.log(`[${requestId}] Processing completed, updating database...`);

    // Step 8: Update database with complete results
    if (transcriptionId) {
      await updateTranscriptionRecord(supabase, transcriptionId, {
        transcription_text: result.transcription || 'Transcripción procesada',
        status: 'completed',
        progress: 100,
        summary: result.summary || 'Análisis completado',
        keywords: result.keywords || [],
        analysis_summary: result.summary,
        analysis_quien: result.analysis?.who,
        analysis_que: result.analysis?.what,
        analysis_cuando: result.analysis?.when,
        analysis_donde: result.analysis?.where,
        analysis_porque: result.analysis?.why,
        analysis_keywords: result.keywords || [],
        // Store the full comprehensive analysis
        analysis_content_summary: result.full_analysis || result.summary,
        updated_at: new Date().toISOString()
      });
      console.log(`[${requestId}] Database updated with results`);
    }

    console.log(`[${requestId}] === UNIFIED PROCESSING COMPLETED ===`);

    // Step 9: Return unified response
    return new Response(
      JSON.stringify({
        transcription: result.transcription || 'Transcripción procesada',
        visual_analysis: result.visual_analysis || 'Análisis visual completado',
        segments: result.segments || [],
        keywords: result.keywords || [],
        summary: result.summary || 'Análisis completado',
        analysis: result.analysis || {},
        utterances: result.utterances || [],
        full_analysis: result.full_analysis || '',
        success: true,
        requestId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error(`[${requestId}] === UNIFIED PROCESSING FAILED ===`);
    console.error(`[${requestId}] Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Update transcription status to failed if we have the ID
    const requestBody = await req.clone().json().catch(() => ({}));
    if (requestBody.transcriptionId) {
      try {
        const { supabaseUrl, supabaseServiceKey } = validateEnvironment();
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await updateTranscriptionRecord(supabase, requestBody.transcriptionId, {
          status: 'failed',
          progress: 100
        });
      } catch (updateError) {
        console.error(`[${requestId}] Failed to update error status:`, updateError);
      }
    }
    
    const { statusCode, userMessage } = categorizeError(error);
    
    return new Response(
      JSON.stringify({ 
        error: userMessage,
        details: error.message,
        success: false,
        timestamp: new Date().toISOString(),
        requestId
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
