
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
    const { videoPath, transcriptionId } = await req.json()
    console.log('Converting video to audio:', videoPath)

    if (!videoPath) {
      throw new Error('Video path is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update transcription status
    if (transcriptionId) {
      await supabase
        .from('transcriptions')
        .update({ 
          status: 'converting',
          progress: 10
        })
        .eq('id', transcriptionId)
      
      console.log(`Updated transcription ${transcriptionId} status to 'converting'`)
    }

    // Get signed URL for video file
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('media')
      .createSignedUrl(videoPath, 60)

    if (signedUrlError) {
      console.error('Error getting signed URL:', signedUrlError)
      throw new Error('Failed to get video file URL')
    }

    // Update progress
    if (transcriptionId) {
      await supabase
        .from('transcriptions')
        .update({ progress: 20 })
        .eq('id', transcriptionId)
    }

    // Initialize CloudConvert
    const cloudConvertApiKey = Deno.env.get('CLOUDCONVERT_API_KEY')
    if (!cloudConvertApiKey) {
      throw new Error('CloudConvert API key not configured')
    }

    const isMovFile = videoPath.toLowerCase().endsWith('.mov')
    
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
            engine: 'ffmpeg',
            audio_codec: 'mp3',
            audio_bitrate: '128k',
            audio_frequency: '44100',
            // Add specific settings for MOV files if needed
            ...(isMovFile ? {
              input_format: 'mov',
              video_codec: 'skip'  // Skip video encoding, extract audio only
            } : {})
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

    // Update progress
    if (transcriptionId) {
      await supabase
        .from('transcriptions')
        .update({ progress: 40 })
        .eq('id', transcriptionId)
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
      console.log('Job status:', jobStatus.data.status)
      
      if (jobStatus.data.status === 'error') {
        const taskWithError = jobStatus.data.tasks.find((task: any) => task.status === 'error')
        const errorMessage = taskWithError?.message || 'Unknown conversion error'
        console.error('Conversion error details:', errorMessage)
        throw new Error(`Conversion failed: ${errorMessage}`)
      }
      
      if (jobStatus.data.status !== 'finished') {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } while (jobStatus.data.status !== 'finished')

    // Update progress
    if (transcriptionId) {
      await supabase
        .from('transcriptions')
        .update({ progress: 60 })
        .eq('id', transcriptionId)
    }

    // Get the converted audio file URL
    const exportTask = jobStatus.data.tasks.find((task: any) => task.operation === 'export/url')
    if (!exportTask?.result?.files?.[0]?.url) {
      throw new Error('No converted file URL found')
    }

    const audioUrl = exportTask.result.files[0].url
    console.log('Converted audio URL:', audioUrl)

    // Download the audio file
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error('Failed to download converted audio')
    }

    // Update progress
    if (transcriptionId) {
      await supabase
        .from('transcriptions')
        .update({ progress: 80 })
        .eq('id', transcriptionId)
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

    // Update transcription record with the audio file path
    if (transcriptionId) {
      await supabase
        .from('transcriptions')
        .update({
          audio_file_path: audioPath,
          status: 'ready_for_transcription',
          progress: 90
        })
        .eq('id', transcriptionId)
    }

    console.log('Audio conversion and upload complete')

    return new Response(
      JSON.stringify({ audioPath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Conversion error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
