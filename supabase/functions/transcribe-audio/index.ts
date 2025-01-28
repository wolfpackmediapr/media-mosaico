import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from './cors.ts';
import { uploadToAssemblyAI, startTranscription, pollTranscription } from './assemblyai.ts';
import { saveTranscription } from './database.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request');
    const formData = await req.formData();
    const audioFile = formData.get('audioFile');
    const userId = formData.get('userId');

    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error('No audio file provided');
    }

    if (!userId) {
      throw new Error('No user ID provided');
    }

    console.log('Processing file:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    // Convert File to ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();
    
    // Upload to AssemblyAI
    const audioUrl = await uploadToAssemblyAI(arrayBuffer);
    console.log('File uploaded to AssemblyAI:', audioUrl);

    // Start transcription
    const transcriptId = await startTranscription(audioUrl);
    console.log('Transcription started:', transcriptId);

    // Poll for results
    const result = await pollTranscription(transcriptId);
    console.log('Transcription completed');

    // Save to database
    await saveTranscription({
      user_id: userId,
      original_file_path: audioFile.name,
      transcription_text: result.text,
      status: 'completed',
      progress: 100,
      assembly_content_safety: result.content_safety_labels,
      assembly_entities: result.entities,
      assembly_topics: result.iab_categories_result,
      assembly_sentiment_analysis: result.sentiment_analysis_results,
      assembly_summary: result.summary,
      assembly_key_phrases: result.auto_highlights_result,
      language: result.language_code,
    });

    return new Response(
      JSON.stringify({
        text: result.text,
        language: result.language_code,
        analysis: {
          content_safety: result.content_safety_labels,
          entities: result.entities,
          topics: result.iab_categories_result,
          sentiment_analysis: result.sentiment_analysis_results,
          summary: result.summary,
          key_phrases: result.auto_highlights_result,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
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