
/**
 * Utilities for validating and managing audio URLs
 */

/**
 * Test if a Blob URL is still valid
 * 
 * @param url The URL to check
 * @returns Promise that resolves to true if the URL is valid, false otherwise
 */
export const isValidBlobUrl = async (url: string): Promise<boolean> => {
  if (!url || !url.startsWith('blob:')) {
    return false;
  }

  // Try to fetch the blob URL with a HEAD request to check if it's valid
  try {
    // Use a shorter timeout to improve user experience
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    try {
      // First try the fetch method
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (fetchError) {
      // If HEAD method failed, try with a regular fetch (GET)
      // Some browsers don't support HEAD for blob URLs
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 1000);
        
        const response = await fetch(url, {
          signal: controller2.signal,
        });
        
        clearTimeout(timeoutId2);
        return response.ok;
      } catch (error) {
        console.log('[audio-url-validator] Blob URL validation failed with both methods');
        return false;
      }
    }
  } catch (error) {
    console.log('[audio-url-validator] URL validation failed:', error);
    return false;
  }
};

/**
 * Creates a new Blob URL from file data
 */
export const createNewBlobUrl = (file: File): string | null => {
  if (!file || !(file instanceof File) || !file.name) {
    console.warn('[audio-url-validator] Invalid file object provided to createNewBlobUrl');
    return null;
  }

  // Release any previous URL that might be associated with this file
  if ('preview' in file && typeof file.preview === 'string' && file.preview.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(file.preview);
    } catch (e) {
      console.warn('[audio-url-validator] Failed to revoke URL:', e);
    }
  }
  
  // Create a new blob URL with validation
  try {
    console.log('[audio-url-validator] Creating new blob URL for file:', file.name);
    const url = URL.createObjectURL(file);
    return url;
  } catch (error) {
    console.error('[audio-url-validator] Error creating object URL:', error);
    return null;
  }
};

/**
 * Safely retrieve a valid blob URL for a file
 * If the existing URL is invalid, creates a new one
 */
export const ensureValidBlobUrl = async (file: File): Promise<string> => {
  if (!file || !(file instanceof File)) {
    console.error('[audio-url-validator] Invalid file object provided to ensureValidBlobUrl');
    throw new Error('Invalid file object provided');
  }

  // Check if file has a valid name
  if (!file.name) {
    console.error('[audio-url-validator] File object has no name property');
    throw new Error('File object has no name');
  }
  
  // First check if file has a storage URL (prioritize this over blob URLs)
  if ('storageUrl' in file && typeof file.storageUrl === 'string' && file.storageUrl) {
    console.log('[audio-url-validator] Using storage URL instead of blob URL');
    return file.storageUrl;
  }
  
  // Check if file has a preview URL
  const hasPreview = 'preview' in file && typeof file.preview === 'string';
  
  // If no preview or not a blob URL, create one
  if (!hasPreview || !(file.preview as string).startsWith('blob:')) {
    console.log('[audio-url-validator] No valid preview, creating new blob URL');
    const newBlobUrl = createNewBlobUrl(file);
    if (!newBlobUrl) {
      throw new Error('Failed to create blob URL');
    }
    return newBlobUrl;
  }
  
  // Check if the existing URL is valid
  const isValid = await isValidBlobUrl(file.preview as string);
  
  if (!isValid) {
    console.log('[audio-url-validator] Blob URL invalid, creating new one');
    const newBlobUrl = createNewBlobUrl(file);
    if (!newBlobUrl) {
      throw new Error('Failed to create blob URL');
    }
    return newBlobUrl;
  }
  
  // If valid, return it
  return file.preview as string;
};

/**
 * Check if a URL is a Supabase Storage URL
 */
export const isSupabaseStorageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  // Check for common Supabase storage URL patterns
  return url.includes('supabase.co/storage/v1/object/public/') || 
         url.includes('supabase.co/storage/v1/object/sign/');
};

/**
 * Try to convert a preview URL to an actual audio element-compatible URL
 * This handles both blob URLs and Supabase storage URLs
 */
export const getPlayableAudioUrl = (file: any): string | null => {
  // Check for Supabase storage URL first (most reliable)
  if (file.storageUrl && typeof file.storageUrl === 'string') {
    return file.storageUrl;
  }
  
  // Fall back to preview URL if available
  if (file.preview && typeof file.preview === 'string') {
    return file.preview;
  }
  
  // Last resort: create a new blob URL if it's a File object
  if (file instanceof File) {
    return URL.createObjectURL(file);
  }
  
  return null;
};
