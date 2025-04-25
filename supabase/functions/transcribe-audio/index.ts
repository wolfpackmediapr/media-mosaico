
// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting transcription process...');
    
    const formData = await req.formData();
    const file = formData.get('file');
    const userId = formData.get('userId');

    // Enhanced validation
    if (!file) {
      throw new Error('File is missing from request');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate file size and contents
    if (file.size === 0) {
      throw new Error('File is empty');
    }

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error('File buffer is empty');
    }

    console.log('File validation passed:', {
      name: file.name,
      type: file.type,
      size: file.size,
      userId: userId
    });

    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyKey) {
      throw new Error('AssemblyAI API key not configured');
    }

    // Upload file to AssemblyAI
    console.log('Uploading file to AssemblyAI...');
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': assemblyKey,
        'Content-Type': 'application/octet-stream',
        'Transfer-Encoding': 'chunked'
      },
      body: buffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', errorText);
      throw new Error(`Failed to upload audio: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('File uploaded successfully:', uploadResult);

    // Start transcription with enhanced configuration
    console.log('Starting AssemblyAI transcription...');
    const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: uploadResult.upload_url,
        language_code: 'es',
        speech_model: 'nano',
        speaker_labels: true,
        punctuate: true,
        format_text: true,
        entity_detection: true
      }),
    });

    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text();
      console.error('Transcription request failed:', errorText);
      throw new Error(`Failed to start transcription: ${errorText}`);
    }

    const transcribeResult = await transcribeResponse.json();
    console.log('Transcription started:', transcribeResult);
    
    const transcriptId = transcribeResult.id;
    let transcript;
    let attempts = 0;
    const maxAttempts = 60;
    
    // Poll for completion with enhanced error handling
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Polling AssemblyAI (attempt ${attempts}/${maxAttempts})...`);
      
      const pollingResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            'Authorization': assemblyKey,
          },
        }
      );

      if (!pollingResponse.ok) {
        const errorText = await pollingResponse.text();
        console.error('Polling failed:', errorText);
        throw new Error(`Failed to check transcription status: ${errorText}`);
      }

      transcript = await pollingResponse.json();
      console.log('Polling status:', transcript.status);

      if (transcript.status === 'completed') {
        console.log('Transcription completed successfully');
        break;
      }

      if (transcript.status === 'error') {
        console.error('Transcription failed with error:', transcript.error);
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (!transcript || transcript.status !== 'completed') {
      throw new Error('Transcription timed out');
    }

    // Initialize Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save transcription with robust error handling that matches the table schema
    try {
      console.log('Saving transcription to database...');
      const { data: transcriptionData, error: insertError } = await supabase
        .from('radio_transcriptions')
        .insert({
          user_id: userId,
          transcription_text: transcript.text,
          emisora: 'default',
          programa: 'default',
          horario: new Date().toISOString(),
          analysis_result: {
            entities: transcript.entities,
            content_safety: transcript.content_safety_labels,
            topics: transcript.iab_categories_result
          }
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Database insertion error:', insertError);
        throw new Error(`Failed to save transcription: ${insertError.message}`);
      }

      if (!transcriptionData) {
        throw new Error('No data returned from database insertion');
      }

      return new Response(
        JSON.stringify({
          success: true,
          text: transcript.text,
          transcript_id: transcriptId,
          transcription_id: transcriptionData.id,
          metadata: {
            audio_duration: transcript.audio_duration,
            confidence: transcript.confidence
          }
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );

    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      throw new Error(`Database operation failed: ${dbError.message}`);
    }

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
