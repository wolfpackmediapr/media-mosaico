import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const CLOUDCONVERT_API_KEY = Deno.env.get('CLOUDCONVERT_API_KEY')

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

    if (!videoPath) {
      throw new Error('Video path is required')
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Download video from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('videos')
      .download(videoPath)

    if (downloadError) {
      throw new Error('Error downloading video: ' + downloadError.message)
    }

    // Create job with CloudConvert
    const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tasks: {
          'import-1': {
            operation: 'import/upload'
          },
          'convert-1': {
            operation: 'convert',
            input: 'import-1',
            output_format: 'mp3',
            engine: 'ffmpeg',
            input_format: videoPath.split('.').pop(),
            audio_codec: 'mp3',
            audio_bitrate: '128k',
            audio_frequency: '44100'
          },
          'export-1': {
            operation: 'export/url',
            input: 'convert-1'
          }
        },
        tag: 'video-conversion'
      })
    })

    const jobData = await createJobResponse.json()
    console.log('Job created:', jobData)

    if (!jobData.data?.id) {
      throw new Error('Failed to create conversion job')
    }

    // Upload the file to CloudConvert
    const uploadTask = jobData.data.tasks.find((task: any) => task.operation === 'import/upload')
    if (!uploadTask?.result?.form) {
      throw new Error('No upload form found in job')
    }

    const formData = new FormData()
    for (const [key, value] of Object.entries(uploadTask.result.form.parameters)) {
      formData.append(key, value as string)
    }
    formData.append('file', fileData)

    const uploadResponse = await fetch(uploadTask.result.form.url, {
      method: 'POST',
      body: formData
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to CloudConvert')
    }

    // Wait for the job to complete
    let jobStatus
    do {
      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
        headers: {
          'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}`
        }
      })
      jobStatus = await statusResponse.json()
      console.log('Job status:', jobStatus)
      
      if (jobStatus.data.status === 'error') {
        throw new Error('Conversion failed: ' + jobStatus.data.message)
      }
      
      if (jobStatus.data.status !== 'finished') {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } while (jobStatus.data.status !== 'finished')

    // Get the converted file URL
    const exportTask = jobStatus.data.tasks.find((task: any) => task.operation === 'export/url')
    if (!exportTask?.result?.files?.[0]?.url) {
      throw new Error('No converted file URL found')
    }

    const audioUrl = exportTask.result.files[0].url

    // Download the converted audio file
    const audioResponse = await fetch(audioUrl)
    const audioBlob = await audioResponse.blob()

    // Upload the converted audio to Supabase
    const audioPath = videoPath.replace(/\.[^/.]+$/, '.mp3')
    const { error: uploadError } = await supabase
      .storage
      .from('videos')
      .upload(audioPath, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: true
      })

    if (uploadError) {
      throw new Error('Failed to upload converted audio: ' + uploadError.message)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        audioPath,
        message: 'Video successfully converted to audio'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error in convert-video function:', error)
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