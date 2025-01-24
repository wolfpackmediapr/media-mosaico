import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { FFmpeg } from 'https://deno.land/x/ffmpeg@v1.0.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting video conversion process');
    const { videoPath } = await req.json();
    
    if (!videoPath) {
      throw new Error('Video path is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Download the video file
    console.log('Downloading video:', videoPath);
    const { data: videoData, error: downloadError } = await supabase.storage
      .from('media')
      .download(videoPath)

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error(`Failed to download video: ${downloadError.message}`);
    }

    if (!videoData) {
      throw new Error('No video data received');
    }

    // Convert video to audio using FFmpeg
    console.log('Converting video to audio');
    const ffmpeg = new FFmpeg();
    const inputBuffer = await videoData.arrayBuffer();
    
    const command = ffmpeg
      .input(inputBuffer)
      .addOption('-vn')           // Disable video
      .addOption('-ar', '16000')  // Set sample rate to 16kHz (required by Whisper)
      .addOption('-ac', '1')      // Convert to mono
      .addOption('-b:a', '64k')   // Set bitrate
      .toFormat('mp3');
    
    const audioData = await command.execute();

    // Upload the converted audio file
    const audioPath = `${videoPath.split('.')[0]}_audio.mp3`;
    console.log('Uploading converted audio:', audioPath);

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(audioPath, audioData, {
        contentType: 'audio/mp3',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Update transcription record
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({ 
        audio_file_path: audioPath,
        status: 'ready_for_transcription'
      })
      .eq('original_file_path', videoPath);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update transcription record: ${updateError.message}`);
    }

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
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});