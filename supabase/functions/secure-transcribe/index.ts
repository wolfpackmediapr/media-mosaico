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
    const formData = await req.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')

    if (!file || !(file instanceof File)) {
      throw new Error('No file provided')
    }

    if (!userId) {
      throw new Error('No user ID provided')
    }

    console.log('Processing file:', file.name, 'type:', file.type)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update initial progress
    await updateProgress(supabase, file.name, 20, 'preparing')

    // Prepare form data for OpenAI
    const whisperFormData = new FormData()
    whisperFormData.append('file', file, file.name)
    whisperFormData.append('model', 'whisper-1')
    whisperFormData.append('response_format', 'verbose_json')
    whisperFormData.append('language', 'es')

    // Update progress before API call
    await updateProgress(supabase, file.name, 50, 'transcribing')
    console.log('Calling Whisper API...')

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: whisperFormData,
    })

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      console.error('Whisper API error:', errorText)
      throw new Error(`Whisper API error: ${errorText}`)
    }

    // Update progress after successful transcription
    await updateProgress(supabase, file.name, 80, 'processing')

    const result = await whisperResponse.json()
    console.log('Transcription completed successfully')

    // Save transcription to database
    const { error: dbError } = await supabase
      .from('transcriptions')
      .insert({
        user_id: userId,
        transcription_text: result.text,
        status: 'completed',
        progress: 100,
        original_file_path: file.name
      })

    if (dbError) {
      console.error('Error saving transcription:', dbError)
      throw new Error('Failed to save transcription')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        text: result.text 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in secure-transcribe function:', error)
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
    )
  }
})

async function updateProgress(supabase: any, filePath: string, progress: number, status: string) {
  const { error } = await supabase
    .from('transcriptions')
    .update({ 
      status: status,
      progress: progress 
    })
    .eq('original_file_path', filePath)

  if (error) {
    console.error('Error updating progress:', error)
  }
}