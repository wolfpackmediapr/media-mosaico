import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoPath } = await req.json();
    console.log('[compress-tv-video] Starting compression for:', videoPath);

    if (!videoPath) {
      throw new Error('Video path is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download original video from storage
    console.log('[compress-tv-video] Downloading original video...');
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('media')
      .download(videoPath);

    if (downloadError) {
      throw new Error('Error downloading video: ' + downloadError.message);
    }

    // Create CloudConvert compression job
    console.log('[compress-tv-video] Creating CloudConvert job...');
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
            output_format: 'mp4',
            engine: 'ffmpeg',
            video_codec: 'h264',
            // Optimize for AI readability - reduce size while preserving text clarity
            crf: 28, // Higher CRF for more compression
            preset: 'medium',
            video_bitrate: '800k', // Reduced bitrate
            audio_codec: 'aac',
            audio_bitrate: '96k', // Reduced audio bitrate
            // Scale down if needed while maintaining aspect ratio
            width: 720, // Max width for AI processing
            height: 480, // Max height for AI processing
            fit: 'scale'
          },
          'export-1': {
            operation: 'export/url',
            input: 'convert-1'
          }
        },
        tag: 'tv-video-compression'
      })
    });

    const jobData = await createJobResponse.json();
    console.log('[compress-tv-video] Job created:', jobData.data?.id);

    if (!jobData.data?.id) {
      throw new Error('Failed to create compression job');
    }

    // Upload the file to CloudConvert
    const uploadTask = jobData.data.tasks.find((task: any) => task.operation === 'import/upload');
    if (!uploadTask?.result?.form) {
      throw new Error('No upload form found in job');
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(uploadTask.result.form.parameters)) {
      formData.append(key, value as string);
    }
    formData.append('file', fileData);

    console.log('[compress-tv-video] Uploading to CloudConvert...');
    const uploadResponse = await fetch(uploadTask.result.form.url, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to CloudConvert');
    }

    // Poll for job completion
    console.log('[compress-tv-video] Waiting for compression to complete...');
    let jobStatus;
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max
    
    do {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('CLOUDCONVERT_API_KEY')}`,
        }
      });

      jobStatus = await statusResponse.json();
      console.log('[compress-tv-video] Job status:', jobStatus.data?.status);
      
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Compression job timed out');
      }
    } while (jobStatus.data?.status === 'waiting' || jobStatus.data?.status === 'processing');

    if (jobStatus.data?.status !== 'finished') {
      throw new Error(`Compression job failed: ${jobStatus.data?.status}`);
    }

    // Get the compressed video download URL
    const exportTask = jobStatus.data.tasks.find((task: any) => task.operation === 'export/url');
    if (!exportTask?.result?.files?.[0]?.url) {
      throw new Error('No download URL found for compressed video');
    }

    // Download compressed video
    console.log('[compress-tv-video] Downloading compressed video...');
    const compressedVideoResponse = await fetch(exportTask.result.files[0].url);
    if (!compressedVideoResponse.ok) {
      throw new Error('Failed to download compressed video');
    }

    const compressedVideoBlob = await compressedVideoResponse.blob();
    
    // Generate compressed file path
    const fileExtension = videoPath.split('.').pop();
    const compressedPath = videoPath.replace(`.${fileExtension}`, `_compressed.${fileExtension}`);
    
    // Upload compressed video to Supabase storage
    console.log('[compress-tv-video] Uploading compressed video to storage:', compressedPath);
    const { error: uploadError } = await supabase
      .storage
      .from('media')
      .upload(compressedPath, compressedVideoBlob, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw new Error('Error uploading compressed video: ' + uploadError.message);
    }

    console.log('[compress-tv-video] Compression completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        compressedPath,
        originalPath: videoPath,
        message: 'Video compressed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('[compress-tv-video] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});