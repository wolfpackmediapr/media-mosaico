
// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import * as storageService from "./storage-service.ts"
import * as transcriptionService from "./transcription-service.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Request received');
    const { videoPath } = await req.json();
    console.log('Video path received:', videoPath);

    if (!videoPath) {
      throw new Error('Video path is required');
    }

    // Initialize Supabase client
    const supabase = storageService.createSupabaseClient();

    // Validate file exists
    await storageService.validateFileExists(supabase, videoPath);
    
    // Generate signed URL
    const signedUrl = await storageService.generateSignedUrl(supabase, videoPath);
    
    // Download the file 
    const fileData = await storageService.downloadFile(signedUrl);

    // Process with OpenAI Whisper
    const whisperResult = await transcriptionService.processWithWhisper(fileData);
    console.log('Transcription completed successfully');

    // Process with AssemblyAI for advanced features
    let assemblyJob = null;
    try {
      assemblyJob = await transcriptionService.processWithAssemblyAI(signedUrl);
      console.log('AssemblyAI job created:', assemblyJob?.id);
    } catch (e) {
      console.error('Error with AssemblyAI:', e);
    }

    // Poll for AssemblyAI result
    let transcriptResult = null;
    let videoDuration = 0;
    
    if (assemblyJob?.id) {
      transcriptResult = await transcriptionService.pollForAssemblyResult(assemblyJob.id);
      
      // Store the video duration if available
      if (transcriptResult?.audio_duration) {
        videoDuration = transcriptResult.audio_duration * 1000; // Convert to milliseconds
        console.log('Video duration detected:', videoDuration, 'ms');
      }
    }

    // Extract news segments from AssemblyAI result
    let newsSegments = transcriptionService.extractNewsSegmentsFromAssemblyAI(transcriptResult);

    // If fewer than 6 segments were found, generate with GPT-4
    let gptGeneratedSegments = [];
    if (newsSegments.length < 6) {
      gptGeneratedSegments = await transcriptionService.generateSegmentsWithGPT(whisperResult.text);
    }

    // Create final segments
    const finalSegments = transcriptionService.createSegments(
      newsSegments,
      gptGeneratedSegments,
      videoDuration,
      whisperResult.text
    );

    console.log(`Returning ${finalSegments.length} news segments with accurate timestamps`);

    // Update the transcription record in the database
    await storageService.updateTranscriptionRecord(
      supabase, 
      videoPath, 
      transcriptResult,
      whisperResult.text
    );
    
    return new Response(
      JSON.stringify({ 
        text: whisperResult.text,
        segments: finalSegments,
        assemblyId: assemblyJob?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
