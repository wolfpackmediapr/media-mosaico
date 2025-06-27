
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { validateEnvironment } from './environment.ts';
import { testGeminiConnectivity, uploadToGemini, waitForFileProcessing, generateAnalysis, cleanupGeminiFile } from './gemini-client.ts';
import { validateAndGetFile, downloadVideoWithRetry } from './storage-utils.ts';
import { parseAnalysisText } from './analysis-parser.ts';
import { updateTranscriptionRecord } from './database-utils.ts';
import { categorizeError } from './error-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NewsSegment {
  headline: string;
  text: string;
  start: number;
  end: number;
  keywords?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[process-tv-with-gemini] === REQUEST START ===');
    
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

    // Step 3: Test Gemini connectivity
    await testGeminiConnectivity(geminiApiKey);

    // Step 4: Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth context
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      await supabase.auth.getUser(token);
    }

    // Step 5: Validate and get video file
    const videoUrl = await validateAndGetFile(supabase, videoPath);

    // Step 6: Download video with retry
    const videoBlob = await downloadVideoWithRetry(videoUrl);

    // Step 7: Upload to Gemini
    const { fileUri, fileName } = await uploadToGemini(videoBlob, geminiApiKey, videoPath);

    // Step 8: Wait for file processing
    await waitForFileProcessing(fileName, geminiApiKey);

    // Step 9: Generate analysis
    const analysisText = await generateAnalysis(fileUri, geminiApiKey);

    // Step 10: Parse analysis
    const parsedAnalysis = parseAnalysisText(analysisText);

    // Step 11: Update database if transcription ID provided
    if (transcriptionId) {
      await updateTranscriptionRecord(supabase, transcriptionId, parsedAnalysis);
    }

    // Step 12: Cleanup Gemini file
    await cleanupGeminiFile(fileName, geminiApiKey);

    console.log('[process-tv-with-gemini] === REQUEST COMPLETED SUCCESSFULLY ===');

    // Step 13: Return successful response
    return new Response(
      JSON.stringify({
        text: parsedAnalysis.transcription || 'Transcripción procesada exitosamente',
        visual_analysis: parsedAnalysis.visual_analysis || 'Análisis visual completado',
        segments: parsedAnalysis.segments || [],
        keywords: parsedAnalysis.keywords || [],
        summary: parsedAnalysis.summary || 'Análisis completado exitosamente',
        analysis: parsedAnalysis.analysis || {},
        success: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[process-tv-with-gemini] === REQUEST FAILED ===');
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
