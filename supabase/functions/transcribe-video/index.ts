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

    console.log('Attempting to download from media bucket:', videoPath)

    // Get file data from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('media')
      .download(videoPath)

    if (downloadError) {
      console.error('Download error:', downloadError)
      throw new Error(`Error downloading video: ${downloadError.message}`)
    }

    if (!fileData) {
      throw new Error('No file data received')
    }

    console.log('File downloaded successfully, size:', fileData.size)

    // Check if file is too large (25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB in bytes
    if (fileData.size > MAX_FILE_SIZE) {
      // If file is too large, we should convert it to audio first
      console.log('File is too large, needs conversion')
      throw new Error('File is too large. Please wait for automatic conversion to complete.')
    }

    console.log('Preparing file for OpenAI transcription')

    // Convert to form data for OpenAI
    const formData = new FormData()
    formData.append('file', fileData, 'video.mp4')
    formData.append('model', 'whisper-1')

    console.log('Sending to OpenAI for transcription')

    // Send to OpenAI for transcription
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${errorText}`)
    }

    const result = await response.json()
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