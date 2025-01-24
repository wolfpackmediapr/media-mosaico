import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function downloadVideo(videoPath: string, supabase: any) {
  console.log('Attempting to download video:', videoPath);
  
  const { data, error } = await supabase.storage
    .from('media')
    .createSignedUrl(videoPath, 60);
    
  if (error) {
    console.error('Signed URL generation error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  console.log('Successfully generated signed URL');
  
  const videoResponse = await fetch(data.signedUrl);
  if (!videoResponse.ok) {
    console.error('Video fetch error:', videoResponse.status, videoResponse.statusText);
    throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
  }

  console.log('Successfully downloaded video');
  return videoResponse;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { videoPath } = await req.json()
    console.log('Processing video path:', videoPath)

    if (!videoPath) {
      throw new Error('Video path is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const videoResponse = await downloadVideo(videoPath, supabase);
    const fileData = await videoResponse.blob()
    console.log('File downloaded successfully, size:', fileData.size)

    if (fileData.size > 25 * 1024 * 1024) {
      console.log('File is too large, needs conversion')
      throw new Error('File is too large. Please wait for automatic conversion to complete.')
    }

    console.log('Preparing file for OpenAI transcription')

    const formData = new FormData()
    formData.append('file', fileData, 'audio.mp4')
    formData.append('model', 'whisper-1')
    formData.append('language', 'es')
    formData.append('response_format', 'json')

    console.log('Sending to OpenAI Whisper API')

    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${errorText}`)
    }

    const result = await openaiResponse.json()
    console.log('Transcription completed successfully')

    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({ 
        transcription_text: result.text,
        status: 'completed'
      })
      .eq('original_file_path', videoPath)

    if (updateError) {
      console.error('Error updating transcription record:', updateError)
      throw new Error(`Error updating transcription: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})