
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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

    if (!file || !userId) {
      console.error('Missing required data:', { hasFile: !!file, hasUserId: !!userId });
      throw new Error('Missing required file or user ID');
    }

    console.log('Received file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      userId: userId
    });

    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyKey) {
      console.error('AssemblyAI API key not found');
      throw new Error('AssemblyAI API key not configured');
    }

    console.log('AssemblyAI API key retrieved successfully');

    // Upload to AssemblyAI
    console.log('Uploading file to AssemblyAI...');
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': assemblyKey,
        'Content-Type': 'application/octet-stream',
        'Transfer-Encoding': 'chunked'
      },
      body: await file.arrayBuffer()
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Upload failed:', errorText);
      throw new Error(`Failed to upload audio to AssemblyAI: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('File uploaded successfully:', uploadResult);

    // Start transcription
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
      }),
    });

    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text();
      console.error('Transcription request failed:', errorText);
      throw new Error(`Failed to start transcription: ${errorText}`);
    }

    const transcribeResult = await transcribeResponse.json();
    console.log('Transcription started:', transcribeResult);

    // Poll for completion
    let transcript;
    for (let i = 0; i < 60; i++) {
      console.log(`Polling AssemblyAI (attempt ${i+1}/60)...`);
      const pollingResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcribeResult.id}`,
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

    // Store the transcription in the database
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabase
        .from('radio_transcriptions')
        .insert({
          user_id: userId,
          transcription_text: transcript.text
        });

      console.log('Transcription saved to database');
    } catch (dbError) {
      console.error('Error saving to database:', dbError);
      // Continue execution even if database save fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        text: transcript.text,
        content_safety: transcript.content_safety_labels,
        entities: transcript.entities,
        topics: transcript.iab_categories_result
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
        details: error.stack
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
