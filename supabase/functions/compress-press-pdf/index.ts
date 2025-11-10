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
    const { jobId, filePath } = await req.json();
    console.log('[compress-press-pdf] Starting compression for:', filePath);

    if (!jobId || !filePath) {
      throw new Error('Job ID and file path are required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update job status to compressing
    await supabase
      .from('pdf_processing_jobs')
      .update({ 
        status: 'processing',
        progress: 10 
      })
      .eq('id', jobId);

    // Download original PDF from storage
    console.log('[compress-press-pdf] Downloading original PDF...');
    
    // Split bucket and path (filePath format: "bucket_name/path/to/file.pdf")
    const [bucketId, ...pathParts] = filePath.split('/');
    const path = pathParts.join('/');
    
    console.log(`[compress-press-pdf] Bucket: ${bucketId}, Path: ${path}`);
    
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketId)
      .download(path);

    if (!fileData || downloadError) {
      throw new Error('Error downloading PDF: ' + downloadError?.message);
    }

    const originalSize = fileData.size;
    console.log(`[compress-press-pdf] Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

    // Create CloudConvert compression job
    console.log('[compress-press-pdf] Creating CloudConvert job...');
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
          'optimize-1': {
            operation: 'optimize',
            input: 'import-1',
            input_format: 'pdf',
            output_format: 'pdf',
            image_quality: 70,
            image_max_width: 1200,
            image_max_height: 1200,
            remove_duplicate_fonts: true,
            compress_streams: true
          },
          'export-1': {
            operation: 'export/url',
            input: 'optimize-1'
          }
        },
        tag: 'press-pdf-compression'
      })
    });

    const jobData = await createJobResponse.json();
    console.log('[compress-press-pdf] Job created:', jobData.data?.id);

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

    console.log('[compress-press-pdf] Uploading to CloudConvert...');
    const uploadResponse = await fetch(uploadTask.result.form.url, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to CloudConvert');
    }

    // Poll for job completion
    console.log('[compress-press-pdf] Waiting for compression to complete...');
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
      console.log('[compress-press-pdf] Job status:', jobStatus.data?.status);
      
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Compression job timed out');
      }
    } while (jobStatus.data?.status === 'waiting' || jobStatus.data?.status === 'processing');

    if (jobStatus.data?.status !== 'finished') {
      throw new Error(`Compression job failed: ${jobStatus.data?.status}`);
    }

    // Get the compressed PDF download URL
    const exportTask = jobStatus.data.tasks.find((task: any) => task.operation === 'export/url');
    if (!exportTask?.result?.files?.[0]?.url) {
      throw new Error('No download URL found for compressed PDF');
    }

    // Download compressed PDF
    console.log('[compress-press-pdf] Downloading compressed PDF...');
    const compressedPdfResponse = await fetch(exportTask.result.files[0].url);
    if (!compressedPdfResponse.ok) {
      throw new Error('Failed to download compressed PDF');
    }

    const compressedPdfBlob = await compressedPdfResponse.blob();
    const compressedSize = compressedPdfBlob.size;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
    
    console.log(`[compress-press-pdf] Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[compress-press-pdf] Compression ratio: ${compressionRatio}%`);
    
    // Generate compressed file path (use the same bucket as source)
    const pathWithoutExtension = path.replace(/\.[^/.]+$/, '');
    const compressedPath = `${pathWithoutExtension}_compressed.pdf`;
    
    // Upload compressed PDF to Supabase storage (use same bucket)
    console.log(`[compress-press-pdf] Uploading compressed PDF to ${bucketId}:`, compressedPath);
    const { error: uploadError } = await supabase
      .storage
      .from(bucketId)
      .upload(compressedPath, compressedPdfBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/pdf'
      });

    if (uploadError) {
      throw new Error('Error uploading compressed PDF: ' + uploadError.message);
    }

    // Update job with compressed file path (include bucket prefix)
    await supabase
      .from('pdf_processing_jobs')
      .update({ 
        status: 'pending',
        progress: 20,
        compressed_file_path: `${bucketId}/${compressedPath}`,
        original_size_bytes: originalSize,
        compressed_size_bytes: compressedSize,
        compression_ratio: parseFloat(compressionRatio)
      })
      .eq('id', jobId);

    console.log('[compress-press-pdf] Compression completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        compressedPath: `${bucketId}/${compressedPath}`,
        originalPath: filePath,
        originalSize,
        compressedSize,
        compressionRatio: parseFloat(compressionRatio),
        message: 'PDF compressed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('[compress-press-pdf] Error:', error);
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
