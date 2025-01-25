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
    console.log('Starting video conversion process')
    const { videoPath } = await req.json()
    
    if (!videoPath) {
      throw new Error('Video path is required')
    }

    console.log('Video path received:', videoPath)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Download the video file
    console.log('Attempting to download video from storage')
    const { data: videoData, error: downloadError } = await supabase.storage
      .from('media')
      .download(videoPath)

    if (downloadError) {
      console.error('Download error:', downloadError)
      throw new Error(`Failed to download video: ${JSON.stringify(downloadError)}`)
    }

    if (!videoData) {
      throw new Error('No video data received')
    }

    console.log('Video downloaded successfully, size:', videoData.size)

    // Create temporary files for FFmpeg processing
    const tempVideoPath = await Deno.makeTempFile({ suffix: '.mp4' })
    const tempAudioPath = await Deno.makeTempFile({ suffix: '.mp3' })

    // Write video data to temp file
    await Deno.writeFile(tempVideoPath, new Uint8Array(await videoData.arrayBuffer()))
    console.log('Video data written to temporary file')

    // Use FFmpeg to convert video to audio
    console.log('Starting FFmpeg conversion')
    const ffmpegCommand = new Deno.Command('ffmpeg', {
      args: [
        '-i', tempVideoPath,
        '-vn',                // Disable video
        '-ar', '16000',       // Set sample rate to 16kHz
        '-ac', '1',           // Convert to mono
        '-b:a', '64k',        // Set bitrate
        '-f', 'mp3',          // Force mp3 format
        tempAudioPath
      ],
    })

    const { success: conversionSuccess, stderr } = await ffmpegCommand.output()
    
    if (!conversionSuccess) {
      console.error('FFmpeg conversion error:', new TextDecoder().decode(stderr))
      throw new Error('FFmpeg conversion failed')
    }

    console.log('Audio conversion completed')

    // Read the converted audio file
    const audioData = await Deno.readFile(tempAudioPath)
    console.log('Audio file read, size:', audioData.length)

    // Upload the converted audio file
    const audioPath = `${videoPath.split('.')[0]}_audio.mp3`
    console.log('Uploading converted audio:', audioPath)

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(audioPath, audioData, {
        contentType: 'audio/mp3',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to upload audio: ${uploadError.message}`)
    }

    // Update transcription record
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({ 
        audio_file_path: audioPath,
        status: 'ready_for_transcription',
        progress: 50
      })
      .eq('original_file_path', videoPath)

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(`Failed to update transcription record: ${updateError.message}`)
    }

    // Clean up temporary files
    try {
      await Deno.remove(tempVideoPath)
      await Deno.remove(tempAudioPath)
      console.log('Temporary files cleaned up')
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError)
    }

    console.log('Conversion process completed successfully')

    return new Response(
      JSON.stringify({ 
        message: 'Video converted successfully',
        audioPath 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
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