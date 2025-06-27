
export async function validateAndGetFile(supabase: any, videoPath: string): Promise<string> {
  console.log('[process-tv-with-gemini] Validating file path:', videoPath);
  
  // Check if file exists by listing files in the directory
  const pathParts = videoPath.split('/');
  if (pathParts.length < 2) {
    throw new Error(`Invalid file path format: ${videoPath}. Expected format: userId/filename`);
  }
  
  const userId = pathParts[0];
  const fileName = pathParts.slice(1).join('/');
  
  console.log('[process-tv-with-gemini] File validation:', { userId, fileName, fullPath: videoPath });
  
  // List files in the user's directory
  const { data: filesList, error: listError } = await supabase.storage
    .from('media')
    .list(userId, { limit: 100 });
  
  if (listError) {
    console.error('[process-tv-with-gemini] Error listing files:', listError);
    throw new Error(`Failed to list files: ${listError.message}`);
  }
  
  console.log('[process-tv-with-gemini] Available files:', filesList?.map(f => f.name) || []);
  
  // Check if our file exists
  const fileExists = filesList?.some(f => fileName.includes(f.name) || f.name.includes(fileName.split('_').pop() || ''));
  
  if (!fileExists) {
    console.error('[process-tv-with-gemini] File not found in storage:', {
      searchingFor: fileName,
      availableFiles: filesList?.map(f => f.name) || []
    });
    throw new Error(`File not found in storage: ${fileName}`);
  }
  
  // Create signed URL
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('media')
    .createSignedUrl(videoPath, 3600); // 1 hour expiry
  
  if (signedUrlError) {
    console.error('[process-tv-with-gemini] Error creating signed URL:', signedUrlError);
    throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
  }
  
  console.log('[process-tv-with-gemini] Successfully created signed URL for file');
  return signedUrlData.signedUrl;
}

export async function downloadVideoWithRetry(videoUrl: string, maxRetries = 3): Promise<Blob> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[process-tv-with-gemini] Downloading video (attempt ${attempt}/${maxRetries})`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const videoResponse = await fetch(videoUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!videoResponse.ok) {
        throw new Error(`Download failed: ${videoResponse.status} ${videoResponse.statusText}`);
      }
      
      const videoBuffer = await videoResponse.arrayBuffer();
      const videoBlob = new Blob([videoBuffer]);
      
      console.log('[process-tv-with-gemini] Video downloaded successfully:', {
        size: videoBlob.size,
        type: videoBlob.type,
        attempt: attempt
      });
      
      return videoBlob;
      
    } catch (error) {
      console.error(`[process-tv-with-gemini] Download attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to download video after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
  
  throw new Error('Download failed after all attempts');
}
