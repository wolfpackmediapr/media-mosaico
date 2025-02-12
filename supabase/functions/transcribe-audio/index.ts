
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function validateFormData(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    if (!contentType.includes('multipart/form-data')) {
      throw new Error('Invalid content type. Expected multipart/form-data');
    }

    const formData = await req.formData();
    const file = formData.get('audioFile');
    const userId = formData.get('userId');

    console.log('Form data received:', {
      fileExists: !!file,
      fileIsFile: file instanceof File,
      userIdExists: !!userId
    });

    if (!file || !(file instanceof File)) {
      throw new Error('No valid file provided');
    }

    if (!userId) {
      throw new Error('No user ID provided');
    }

    // Verify file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/webm'];
    console.log('File type:', file.type);
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Got ${file.type}, expected one of: ${allowedTypes.join(', ')}`);
    }

    console.log('File validation successful:', {
      type: file.type,
      size: file.size,
      name: file.name
    });

    return { file, userId };
  } catch (error) {
    console.error('Form data validation failed:', error);
    throw error;
  }
}

async function uploadToAssemblyAI(audioData: Uint8Array) {
  try {
    console.log('Starting AssemblyAI upload...');
    
    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyKey) {
      console.error('AssemblyAI API key not found in environment variables');
      throw new Error('AssemblyAI API key not configured');
    }

    console.log('Preparing upload request...');
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': assemblyKey,
        'Content-Type': 'application/octet-stream',
        'Transfer-Encoding': 'chunked'
      },
      body: audioData,
    });

    console.log('Upload response status:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('AssemblyAI upload failed:', {
        status: uploadResponse.status,
        response: errorText,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      });
      throw new Error(`Failed to upload audio to AssemblyAI: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('Upload successful:', uploadResult);
    return uploadResult;
  } catch (error) {
    console.error('Upload to AssemblyAI failed:', error);
    throw error;
  }
}

async function startTranscription(uploadUrl: string) {
  try {
    console.log('Starting transcription for:', uploadUrl);
    
    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyKey) {
      console.error('AssemblyAI API key not found in environment variables');
      throw new Error('AssemblyAI API key not configured');
    }

    console.log('Preparing transcription request...');
    const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: uploadUrl,
        language_code: 'es',
        speaker_labels: true,
        entity_detection: true,
        auto_chapters: true,
        sentiment_analysis: true,
        content_safety: true,
        auto_highlights: true,
        summarization: true,
        summary_model: 'informative',
        summary_type: 'bullets'
      }),
    });

    console.log('Transcription response status:', transcribeResponse.status);

    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text();
      console.error('AssemblyAI transcription failed:', {
        status: transcribeResponse.status,
        response: errorText,
        headers: Object.fromEntries(transcribeResponse.headers.entries())
      });
      throw new Error(`Failed to start transcription: ${errorText}`);
    }

    const transcribeResult = await transcribeResponse.json();
    console.log('Transcription started:', transcribeResult);
    return transcribeResult;
  } catch (error) {
    console.error('Start transcription failed:', error);
    throw error;
  }
}

async function pollTranscription(transcriptId: string) {
  try {
    const maxAttempts = 60;
    const pollInterval = 3000;
    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');

    if (!assemblyKey) {
      console.error('AssemblyAI API key not found in environment variables');
      throw new Error('AssemblyAI API key not configured');
    }

    console.log('Starting polling for transcript:', transcriptId);

    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      console.log(`Polling attempt ${attempts + 1}/${maxAttempts}`);
      
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
        console.error('Polling failed:', {
          status: pollingResponse.status,
          response: errorText,
          headers: Object.fromEntries(pollingResponse.headers.entries())
        });
        throw new Error(`Failed to poll for transcription status: ${errorText}`);
      }

      const transcript = await pollingResponse.json();
      console.log('Polling status:', transcript.status);

      if (transcript.status === 'completed') {
        console.log('Transcription completed:', transcript);
        return transcript;
      }
      
      if (transcript.status === 'error') {
        console.error('Transcription error:', transcript.error);
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      console.log(`Waiting ${pollInterval}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Transcription timeout after maximum polling attempts');
  } catch (error) {
    console.error('Polling failed:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received transcription request');
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const { file, userId } = await validateFormData(req);
    console.log('Processing file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId: userId
    });

    const fileBuffer = await file.arrayBuffer();
    const audioData = new Uint8Array(fileBuffer);
    console.log('File converted to Uint8Array, size:', audioData.length);

    console.log('Uploading to AssemblyAI');
    const { upload_url } = await uploadToAssemblyAI(audioData);
    console.log('File uploaded to AssemblyAI:', upload_url);

    const transcriptResult = await startTranscription(upload_url);
    console.log('Transcription started with ID:', transcriptResult.id);

    const transcript = await pollTranscription(transcriptResult.id);

    // Initialize Supabase client
    console.log('Initializing Supabase client');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Save transcription to database with all advanced features
    console.log('Saving transcription to database');
    const { error: dbError } = await supabase
      .from('transcriptions')
      .insert({
        user_id: userId,
        transcription_text: transcript.text,
        original_file_path: file.name,
        status: 'completed',
        progress: 100,
        assembly_chapters: transcript.chapters,
        assembly_content_safety: transcript.content_safety_labels,
        assembly_entities: transcript.entities,
        assembly_key_phrases: transcript.auto_highlights_result,
        assembly_sentiment_analysis: transcript.sentiment_analysis_results,
        assembly_summary: transcript.summary,
        assembly_topics: transcript.iab_categories_result
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to save transcription: ${dbError.message}`);
    }

    console.log('Transcription completed and saved with advanced features');

    return new Response(
      JSON.stringify({ 
        success: true, 
        text: transcript.text,
        chapters: transcript.chapters,
        content_safety: transcript.content_safety_labels,
        sentiment: transcript.sentiment_analysis_results,
        summary: transcript.summary,
        topics: transcript.iab_categories_result,
        entities: transcript.entities,
        key_phrases: transcript.auto_highlights_result
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        errorDetails: error.stack
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
