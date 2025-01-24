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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('media')
      .download(videoPath)

    if (downloadError) {
      console.error('Download error:', downloadError)
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    const fileSize = fileData.size
    console.log('File downloaded, size:', fileSize)

    // If file is larger than 25MB, convert using CloudConvert
    if (fileSize > 25 * 1024 * 1024) {
      console.log('File is too large, needs conversion')
      
      // Create CloudConvert job
      const createJobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('CLOUDCONVERT_API_KEY')}`,
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
      })

      const jobData = await createJobResponse.json()
      console.log('Conversion job created:', jobData)

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

      // Wait for conversion to complete
      let jobStatus
      do {
        const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
          headers: {
            'Authorization': `Bearer ${Deno.env.get('CLOUDCONVERT_API_KEY')}`
          }
        })
        jobStatus = await statusResponse.json()
        
        if (jobStatus.data.status === 'error') {
          throw new Error('Conversion failed: ' + jobStatus.data.message)
        }
        
        if (jobStatus.data.status !== 'finished') {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } while (jobStatus.data.status !== 'finished')

      // Get the converted audio file
      const exportTask = jobStatus.data.tasks.find((task: any) => task.operation === 'export/url')
      if (!exportTask?.result?.files?.[0]?.url) {
        throw new Error('No converted file URL found')
      }

      const audioResponse = await fetch(exportTask.result.files[0].url)
      fileData = await audioResponse.blob()
      console.log('File converted successfully')
    }

    // Prepare form data for OpenAI Whisper API
    const formData = new FormData()
    formData.append('file', fileData, 'audio.mp3')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('language', 'es')
    formData.append('timestamp_granularities[]', 'word')

    console.log('Sending to OpenAI Whisper API')

    // Call OpenAI Whisper API
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

    // Update transcription record
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