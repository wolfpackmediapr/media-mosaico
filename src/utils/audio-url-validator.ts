
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('[audio-url-validator] URL validation failed:', error);
    return false;
  }
};

/**
 * Creates a new Blob URL from file data
 */
export const createNewBlobUrl = (file: File): string => {
  // Release any previous URL that might be associated with this file
  if ('preview' in file && typeof file.preview === 'string' && file.preview.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(file.preview);
    } catch (e) {
      console.warn('[audio-url-validator] Failed to revoke URL:', e);
    }
  }
  
  // Create a new blob URL
  return URL.createObjectURL(file);
};

/**
 * Safely retrieve a valid blob URL for a file
 * If the existing URL is invalid, creates a new one
 */
export const ensureValidBlobUrl = async (file: File): Promise<string> => {
  // Check if file has a preview URL
  const hasPreview = 'preview' in file && typeof file.preview === 'string';
  
  // If no preview or not a blob URL, create one
  if (!hasPreview || !(file.preview as string).startsWith('blob:')) {
    return createNewBlobUrl(file);
  }
  
  // Check if the existing URL is valid
  const isValid = await isValidBlobUrl(file.preview as string);
  
  // If valid, return it; otherwise create a new one
  return isValid ? file.preview as string : createNewBlobUrl(file);
};
