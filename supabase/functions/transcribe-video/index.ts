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

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('media')
      .download(videoPath)

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    const fileSize = fileData.size;
    console.log('File size:', fileSize);

    let audioData = fileData;

    // If file is larger than 25MB, convert using CloudConvert
    if (fileSize > 25 * 1024 * 1024) {
      console.log('File too large, converting...');
      
      const { data: signedUrl } = await supabase.storage
        .from('media')
        .createSignedUrl(videoPath, 60);

      if (!signedUrl) {
        throw new Error('Failed to create signed URL for video');
      }

      const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('CLOUDCONVERT_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tasks: {
            'import-1': {
              operation: 'import/url',
              url: signedUrl
            },
            'convert-1': {
              operation: 'convert',
              input: 'import-1',
              output_format: 'mp3',
              audio_codec: 'mp3',
              audio_bitrate: '128k',
              audio_frequency: '44100'
            },
            'export-1': {
              operation: 'export/url',
              input: 'convert-1'
            }
          }
        })
      });

      const jobData = await createJobResponse.json();
      console.log('Conversion job created:', jobData);

      // Wait for conversion to complete
      let jobStatus;
      do {
        const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
          headers: {
            'Authorization': `Bearer ${Deno.env.get('CLOUDCONVERT_API_KEY')}`
          }
        });
        jobStatus = await statusResponse.json();
        
        if (jobStatus.data.status === 'error') {
          throw new Error('Conversion failed: ' + jobStatus.data.message);
        }
        
        if (jobStatus.data.status !== 'finished') {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } while (jobStatus.data.status !== 'finished');

      // Get the converted audio file
      const exportTask = jobStatus.data.tasks.find((task: any) => task.operation === 'export/url');
      if (!exportTask?.result?.files?.[0]?.url) {
        throw new Error('No converted file URL found');
      }

      const audioResponse = await fetch(exportTask.result.files[0].url);
      audioData = await audioResponse.blob();
      console.log('File converted successfully');
    }

    // Prepare form data for OpenAI Whisper API
    console.log('Preparing Whisper API request');
    const formData = new FormData();
    formData.append('file', audioData, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('language', 'es');
    formData.append('timestamp_granularities[]', 'word');

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
        status: 'completed'
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});