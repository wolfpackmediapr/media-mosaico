import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Received transcription request');
    
    // Validate content type
    const contentType = req.headers.get('content-type') || '';
    console.log('Request content-type:', contentType);
    
    if (!contentType.includes('multipart/form-data')) {
      throw new Error('Invalid content type. Expected multipart/form-data');
    }

    // Parse form data
    const formData = await req.formData();
    console.log('FormData received');

    // Extract and validate file
    const file = formData.get('file');
    const userId = formData.get('userId');

    if (!file || !(file instanceof File || file instanceof Blob)) {
      console.error('No valid file in request:', file);
      throw new Error('No file provided');
    }

    if (!userId) {
      console.error('No user ID in request');
      throw new Error('No user ID provided');
    }

    console.log('Processing file:', {
      fileName: file instanceof File ? file.name : 'blob',
      fileSize: file.size,
      fileType: file.type,
      userId: userId
    });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();
    const audioData = new Uint8Array(fileBuffer);

    console.log('Uploading to AssemblyAI');

    // Upload to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
      },
      body: audioData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('AssemblyAI upload failed:', errorText);
      throw new Error('Failed to upload audio to AssemblyAI');
    }

    const { upload_url } = await uploadResponse.json();
    console.log('File uploaded to AssemblyAI:', upload_url);

    // Start transcription
    const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: 'es',
      }),
    });

    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text();
      console.error('AssemblyAI transcription failed:', errorText);
      throw new Error('Failed to start transcription');
    }

    const { id: transcriptId } = await transcribeResponse.json();
    console.log('Transcription started with ID:', transcriptId);

    // Poll for completion
    let transcript;
    let attempts = 0;
    const maxAttempts = 30; // Maximum polling attempts

    while (attempts < maxAttempts) {
      const pollingResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
          },
        }
      );

      if (!pollingResponse.ok) {
        console.error('Polling failed:', await pollingResponse.text());
        throw new Error('Failed to poll for transcription status');
      }

      transcript = await pollingResponse.json();
      console.log('Polling status:', transcript.status);

      if (transcript.status === 'completed') {
        break;
      } else if (transcript.status === 'error') {
        console.error('Transcription failed:', transcript.error);
        throw new Error('Transcription failed');
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (attempts >= maxAttempts) {
      throw new Error('Transcription timeout');
    }

    // Save transcription to database
    const { error: dbError } = await supabase
      .from('transcriptions')
      .insert({
        user_id: userId,
        transcription_text: transcript.text,
        original_file_path: file instanceof File ? file.name : 'uploaded_audio.mp3',
        status: 'completed',
        progress: 100
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to save transcription: ${dbError.message}`);
    }

    console.log('Transcription completed and saved');

    return new Response(
      JSON.stringify({ 
        success: true, 
        text: transcript.text 
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
        error: error.message 
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