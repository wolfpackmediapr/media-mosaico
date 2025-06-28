
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[process-tv-with-gemini] === UNIFIED PROCESSING START ===');
    
    // Step 1: Validate environment
    const { supabaseUrl, supabaseServiceKey, geminiApiKey } = validateEnvironment();
    
    // Step 2: Parse and validate request
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('[process-tv-with-gemini] Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { videoPath, transcriptionId } = requestBody;
    
    console.log('[process-tv-with-gemini] Request details:', {
      videoPath,
      transcriptionId,
      hasVideoPath: !!videoPath,
      hasTranscriptionId: !!transcriptionId
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
      await supabase.auth.getUser(token);
    }

    // Step 4: Update initial processing status
    if (transcriptionId) {
      await updateTranscriptionRecord(supabase, transcriptionId, {
        status: 'processing',
        progress: 10
      });
    }

    // Step 5: Validate and get video file
    console.log('[process-tv-with-gemini] Validating video file...');
    const videoUrl = await validateAndGetFile(supabase, videoPath);

    if (transcriptionId) {
      await updateTranscriptionRecord(supabase, transcriptionId, {
        progress: 20
      });
    }

    // Step 6: Download video with retry
    console.log('[process-tv-with-gemini] Downloading video...');
    const videoBlob = await downloadVideoWithRetry(videoUrl);

    if (transcriptionId) {
      await updateTranscriptionRecord(supabase, transcriptionId, {
        progress: 30
      });
    }

    // Step 7: Process video with unified Gemini workflow
    console.log('[process-tv-with-gemini] Starting unified video processing...');
    const result = await processVideoWithGemini(
      videoBlob, 
      geminiApiKey, 
      videoPath,
      (progress) => {
        // Progress callback for updating database
        if (transcriptionId) {
          updateTranscriptionRecord(supabase, transcriptionId, {
            progress: Math.min(30 + Math.floor(progress * 0.6), 90)
          }).catch(err => console.warn('Progress update failed:', err));
        }
      }
    );

    // Step 8: Update database with complete results
    if (transcriptionId) {
      await updateTranscriptionRecord(supabase, transcriptionId, {
        transcription_text: result.transcription,
        status: 'completed',
        progress: 100,
        summary: result.summary,
        keywords: result.keywords,
        analysis_summary: result.summary,
        analysis_quien: result.analysis?.who,
        analysis_que: result.analysis?.what,
        analysis_cuando: result.analysis?.when,
        analysis_donde: result.analysis?.where,
        analysis_porque: result.analysis?.why,
        analysis_keywords: result.keywords,
        updated_at: new Date().toISOString()
      });
    }

    console.log('[process-tv-with-gemini] === UNIFIED PROCESSING COMPLETED ===');

    // Step 9: Return unified response
    return new Response(
      JSON.stringify({
        transcription: result.transcription,
        visual_analysis: result.visual_analysis,
        segments: result.segments,
        keywords: result.keywords,
        summary: result.summary,
        analysis: result.analysis,
        utterances: result.utterances,
        success: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[process-tv-with-gemini] === UNIFIED PROCESSING FAILED ===');
    console.error('[process-tv-with-gemini] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    const { statusCode, userMessage } = categorizeError(error);
    
    return new Response(
      JSON.stringify({ 
        error: userMessage,
        details: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
