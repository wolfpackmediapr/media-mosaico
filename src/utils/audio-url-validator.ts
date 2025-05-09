
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
  if (!url || typeof url !== 'string' || !url.startsWith('blob:')) {
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
export const createNewBlobUrl = (file: File | Blob | null): string | null => {
  // Add safety checks
  if (!file) {
    console.warn('[audio-url-validator] No file provided to createNewBlobUrl');
    return null;
  }

  // Ensure it's a valid File or Blob object
  if (!(file instanceof File) && !(file instanceof Blob)) {
    console.warn('[audio-url-validator] Invalid file object provided to createNewBlobUrl');
    return null;
  }
  
  // Create a new blob URL with validation
  try {
    console.log('[audio-url-validator] Creating new blob URL');
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
export const ensureValidBlobUrl = async (file: any): Promise<string> => {
  // Add robust type checking
  if (!file) {
    console.error('[audio-url-validator] No file provided to ensureValidBlobUrl');
    throw new Error('No file object provided');
  }

  // First check if file has a storage URL (prioritize this over blob URLs)
  if (file && typeof file === 'object' && 'storageUrl' in file && 
      typeof file.storageUrl === 'string' && file.storageUrl) {
    console.log('[audio-url-validator] Using storage URL instead of blob URL');
    return file.storageUrl;
  }
  
  // Check if file has a preview URL
  const hasPreview = file && typeof file === 'object' && 'preview' in file && 
                     typeof file.preview === 'string' && file.preview;
  
  // If not a blob URL or no preview, create new blob URL if possible
  if (!hasPreview || !(file.preview as string).startsWith('blob:')) {
    // Check if file is a valid File/Blob for creating URL
    if (file instanceof File || file instanceof Blob) {
      console.log('[audio-url-validator] No valid preview, creating new blob URL');
      const newBlobUrl = createNewBlobUrl(file);
      if (!newBlobUrl) {
        throw new Error('Failed to create blob URL');
      }
      return newBlobUrl;
    } else {
      throw new Error('Invalid file object, cannot create blob URL');
    }
  }
  
  // Check if the existing URL is valid
  const isValid = await isValidBlobUrl(file.preview as string);
  
  if (!isValid) {
    console.log('[audio-url-validator] Blob URL invalid, creating new one');
    // Check if file is a valid File/Blob for creating URL
    if (file instanceof File || file instanceof Blob) {
      const newBlobUrl = createNewBlobUrl(file);
      if (!newBlobUrl) {
        throw new Error('Failed to create blob URL');
      }
      return newBlobUrl;
    } else {
      throw new Error('Invalid file object, cannot create blob URL');
    }
  }
  
  // If valid, return it
  return file.preview as string;
};

/**
 * Check if a URL is a Supabase Storage URL
 */
export const isSupabaseStorageUrl = (url: string | null | undefined): boolean => {
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
  // Add more robust null/undefined checking
  if (!file || typeof file !== 'object') {
    return null;
  }

  // Check for Supabase storage URL first (most reliable)
  if ('storageUrl' in file && typeof file.storageUrl === 'string' && file.storageUrl) {
    return file.storageUrl;
  }
  
  // Fall back to preview URL if available
  if ('preview' in file && typeof file.preview === 'string' && file.preview) {
    return file.preview;
  }
  
  // Last resort: create a new blob URL if it's a File object
  if (file instanceof File || file instanceof Blob) {
    try {
      return URL.createObjectURL(file);
    } catch (err) {
      console.error('[audio-url-validator] Error creating blob URL:', err);
      return null;
    }
  }
  
  return null;
};
