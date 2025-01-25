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

    console.log('Processing audio file:', file.name)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upload file to temporary storage
    const fileBuffer = await file.arrayBuffer()
    const audioData = new Uint8Array(fileBuffer)

    // Upload to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
      },
      body: audioData,
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload audio to AssemblyAI')
    }

    const { upload_url } = await uploadResponse.json()

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
    })

    if (!transcribeResponse.ok) {
      throw new Error('Failed to start transcription')
    }

    const { id: transcriptId } = await transcribeResponse.json()

    // Poll for completion
    let transcript
    while (true) {
      const pollingResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
          },
        }
      )

      transcript = await pollingResponse.json()

      if (transcript.status === 'completed') {
        break
      } else if (transcript.status === 'error') {
        throw new Error('Transcription failed')
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Save transcription to database
    const { error: dbError } = await supabase
      .from('transcriptions')
      .insert({
        user_id: userId,
        transcription_text: transcript.text,
        original_file_path: file.name,
        status: 'completed',
        progress: 100
      })

    if (dbError) {
      throw new Error(`Failed to save transcription: ${dbError.message}`)
    }

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
    )

  } catch (error) {
    console.error('Error in transcribe-audio function:', error)
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