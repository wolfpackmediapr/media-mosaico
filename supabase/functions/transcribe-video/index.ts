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
    const { videoPath } = await req.json()
    console.log('Processing video path:', videoPath)

    if (!videoPath) {
      throw new Error('Video path is required')
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Generating signed URL for:', videoPath)
    
    // Generate a signed URL for secure access
    const { data: urlData, error: urlError } = await supabase.storage
      .from('media')
      .createSignedUrl(videoPath, 60) // 60 second expiry

    if (urlError) {
      console.error('Signed URL generation error:', urlError)
      throw new Error(`Failed to generate signed URL: ${urlError.message}`)
    }

    if (!urlData?.signedUrl) {
      throw new Error('No signed URL generated')
    }

    console.log('Successfully generated signed URL')

    // Fetch the file using the signed URL
    const videoResponse = await fetch(urlData.signedUrl)
    if (!videoResponse.ok) {
      console.error('Video fetch error:', videoResponse.status, videoResponse.statusText)
      throw new Error(`Failed to fetch video: ${videoResponse.statusText}`)
    }

    // Convert the response to a blob
    const fileData = await videoResponse.blob()
    console.log('File downloaded successfully, size:', fileData.size)

    // Check if file is too large (25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB in bytes
    if (fileData.size > MAX_FILE_SIZE) {
      console.log('File is too large, needs conversion')
      throw new Error('File is too large. Please wait for automatic conversion to complete.')
    }

    console.log('Preparing file for OpenAI transcription')

    // Prepare form data for OpenAI
    const formData = new FormData()
    formData.append('file', fileData, 'video.mp4')
    formData.append('model', 'whisper-1')
    formData.append('language', 'es')
    formData.append('response_format', 'json')

    console.log('Sending to OpenAI Whisper API')

    // Send to OpenAI Whisper API
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

    // Update transcription record with the result
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