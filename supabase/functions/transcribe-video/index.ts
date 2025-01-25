import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Request received');
    const { videoPath } = await req.json();
    console.log('Video path:', videoPath);

    if (!videoPath) {
      throw new Error('Video path is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the audio file path from the transcription record
    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .select('audio_file_path')
      .eq('original_file_path', videoPath)
      .single();

    if (transcriptionError) {
      console.error('Error fetching transcription:', transcriptionError);
      throw new Error('Failed to fetch transcription record');
    }

    if (!transcription?.audio_file_path) {
      throw new Error('Audio file not found. Video must be converted to audio first.');
    }

    // Download the audio file
    console.log('Downloading audio file:', transcription.audio_file_path);
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('media')
      .download(transcription.audio_file_path);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download audio file: ${downloadError.message}`);
    }

    if (!audioData) {
      throw new Error('No audio data received');
    }

    // Update progress
    await supabase
      .from('transcriptions')
      .update({ progress: 75, status: 'transcribing' })
      .eq('original_file_path', videoPath);

    // Prepare form data for OpenAI Whisper API
    console.log('Preparing Whisper API request');
    const formData = new FormData();
    formData.append('file', audioData, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('language', 'es');

    // Call OpenAI Whisper API
    console.log('Calling Whisper API');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await whisperResponse.json();
    console.log('Transcription completed successfully');

    // Update transcription record
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({ 
        transcription_text: result.text,
        status: 'completed',
        progress: 100
      })
      .eq('original_file_path', videoPath);

    if (updateError) {
      console.error('Error updating transcription record:', updateError);
      throw new Error(`Error updating transcription: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    // Update transcription status to error
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    try {
      const { videoPath } = await req.json();
      if (videoPath) {
        await supabase
          .from('transcriptions')
          .update({ 
            status: 'error',
            progress: 0
          })
          .eq('original_file_path', videoPath);
      }
    } catch (updateError) {
      console.error('Error updating transcription status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});