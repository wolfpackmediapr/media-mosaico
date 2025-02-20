
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
    console.log('Converting video to audio:', videoPath)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get signed URL for video file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('media')
      .createSignedUrl(videoPath, 60)

    if (signedUrlError) {
      console.error('Error getting signed URL:', signedUrlError)
      throw new Error('Failed to get video file URL')
    }

    // Initialize CloudConvert
    const cloudConvertApiKey = Deno.env.get('CLOUDCONVERT_API_KEY')
    if (!cloudConvertApiKey) {
      throw new Error('CloudConvert API key not configured')
    }

    // Create conversion job
    const jobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudConvertApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tasks: {
          'import-file': {
            operation: 'import/url',
            url: signedUrlData.signedUrl
          },
          'convert-file': {
            operation: 'convert',
            input: ['import-file'],
            output_format: 'mp3',
            engine: 'ffmpeg'
          },
          'export-file': {
            operation: 'export/url',
            input: ['convert-file']
          }
        }
      })
    })

    if (!jobResponse.ok) {
      const error = await jobResponse.text()
      console.error('CloudConvert job creation failed:', error)
      throw new Error('Failed to start conversion')
    }

    const job = await jobResponse.json()
    console.log('Conversion job created:', job.data.id)

    // Wait for job completion
    let jobStatus
    do {
      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${job.data.id}`, {
        headers: {
          'Authorization': `Bearer ${cloudConvertApiKey}`
        }
      })
      
      if (!statusResponse.ok) {
        throw new Error('Failed to check conversion status')
      }

      jobStatus = await statusResponse.json()
      if (jobStatus.data.status === 'error') {
        throw new Error('Conversion failed: ' + jobStatus.data.message)
      }
      
      if (jobStatus.data.status !== 'finished') {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } while (jobStatus.data.status !== 'finished')

    // Get the converted audio file URL
    const exportTask = jobStatus.data.tasks.find((task: any) => task.operation === 'export/url')
    const audioUrl = exportTask.result.files[0].url

    // Download the audio file
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error('Failed to download converted audio')
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const audioFile = new File([audioBuffer], 'converted.mp3', { type: 'audio/mp3' })

    // Upload audio to Supabase
    const audioPath = `audio/${crypto.randomUUID()}.mp3`
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(audioPath, audioFile)

    if (uploadError) {
      console.error('Error uploading audio:', uploadError)
      throw new Error('Failed to upload converted audio')
    }

    console.log('Audio conversion and upload complete')

    return new Response(
      JSON.stringify({ audioPath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Conversion error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
