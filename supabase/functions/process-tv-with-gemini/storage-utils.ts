
export async function validateAndGetFile(supabase: any, videoPath: string): Promise<string> {
  console.log('[storage-utils] Validating file path:', videoPath);
  
  // Handle both formats: userId/filename and filename-timestamp
  let userId: string;
  let fileName: string;
  
  if (videoPath.includes('/')) {
    // Format: userId/filename
    const pathParts = videoPath.split('/');
    if (pathParts.length < 2) {
      throw new Error(`Invalid file path format: ${videoPath}. Expected format: userId/filename`);
    }
    userId = pathParts[0];
    fileName = pathParts.slice(1).join('/');
  } else {
    // Format: filename-timestamp, need to extract userId from context
    // This is a fallback - we'll try to find the file across user directories
    console.log('[storage-utils] Legacy format detected, searching for file:', videoPath);
    
    // Try to get current user from auth context
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required to process video files');
    }
    
    userId = user.id;
    fileName = videoPath;
  }
  
  console.log('[storage-utils] File validation details:', { 
    userId, 
    fileName, 
    originalPath: videoPath,
    bucketUsed: 'video'
  });
  
  // List files in the user's directory in the video bucket
  const { data: filesList, error: listError } = await supabase.storage
    .from('video')
    .list(userId, { limit: 100 });
  
  if (listError) {
    console.error('[storage-utils] Error listing files in video bucket:', listError);
    throw new Error(`Failed to list files in video bucket: ${listError.message}`);
  }
  
  console.log('[storage-utils] Available files in video bucket:', filesList?.map((f: any) => f.name) || []);
  
  // Check if our file exists - be flexible with matching
  const fileExists = filesList?.some((f: any) => {
    // Exact match
    if (f.name === fileName) return true;
    
    // Check if filename contains the uploaded file name (for timestamp-based matching)
    if (fileName.includes(f.name) || f.name.includes(fileName.split('_').pop() || '')) return true;
    
    // Check base name matching (remove extensions and timestamps)
    const baseName = fileName.replace(/^\d+_/, '').replace(/\.[^/.]+$/, '');
    const baseFileName = f.name.replace(/^\d+_/, '').replace(/\.[^/.]+$/, '');
    if (baseName === baseFileName) return true;
    
    return false;
  });
  
  if (!fileExists) {
    console.error('[storage-utils] File not found in video bucket:', {
      searchingFor: fileName,
      availableFiles: filesList?.map((f: any) => f.name) || [],
      userId
    });
    throw new Error(`File not found in video storage: ${fileName}`);
  }
  
  // Find the exact file path for signed URL
  const matchedFile = filesList?.find((f: any) => {
    if (f.name === fileName) return true;
    if (fileName.includes(f.name) || f.name.includes(fileName.split('_').pop() || '')) return true;
    const baseName = fileName.replace(/^\d+_/, '').replace(/\.[^/.]+$/, '');
    const baseFileName = f.name.replace(/^\d+_/, '').replace(/\.[^/.]+$/, '');
    return baseName === baseFileName;
  });
  
  const actualFilePath = `${userId}/${matchedFile?.name || fileName}`;
  
  // Create signed URL from video bucket
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('video')
    .createSignedUrl(actualFilePath, 3600); // 1 hour expiry
  
  if (signedUrlError) {
    console.error('[storage-utils] Error creating signed URL from video bucket:', signedUrlError);
    throw new Error(`Failed to create signed URL from video bucket: ${signedUrlError.message}`);
  }
  
  console.log('[storage-utils] Successfully created signed URL for video file');
  return signedUrlData.signedUrl;
}

export async function downloadVideoWithRetry(videoUrl: string, maxRetries = 3): Promise<Blob> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[storage-utils] Downloading video (attempt ${attempt}/${maxRetries})`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      const videoResponse = await fetch(videoUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Supabase-Edge-Function/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!videoResponse.ok) {
        throw new Error(`Download failed: ${videoResponse.status} ${videoResponse.statusText}`);
      }
      
      const videoBuffer = await videoResponse.arrayBuffer();
      const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
      
      console.log('[storage-utils] Video downloaded successfully:', {
        size: videoBlob.size,
        type: videoBlob.type,
        attempt: attempt,
        sizeInMB: (videoBlob.size / (1024 * 1024)).toFixed(2)
      });
      
      if (videoBlob.size === 0) {
        throw new Error('Downloaded video file is empty');
      }
      
      return videoBlob;
      
    } catch (error) {
      console.error(`[storage-utils] Download attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to download video after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Wait before retry with exponential backoff
      const waitTime = Math.min(2000 * Math.pow(1.5, attempt - 1), 10000);
      console.log(`[storage-utils] Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Download failed after all attempts');
}
