
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
 * Validates if a file object is proper for creating blob URLs
 * 
 * @param file The file to check
 * @returns boolean indicating if the file is valid
 */
export const isValidFileForBlobUrl = (file: File | null | undefined): boolean => {
  if (!file) return false;
  
  // Check if the file has basic required properties
  if (!file.name || typeof file.size !== 'number' || !file.type) {
    console.warn('[audio-url-validator] Invalid file object properties', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    return false;
  }
  
  // Check if file is an empty/reconstructed file (size near zero)
  if (file.size <= 1) {
    console.warn('[audio-url-validator] File appears to be empty or reconstructed', {
      name: file.name, 
      size: file.size
    });
    return false;
  }
  
  return true;
};

/**
 * Creates a new Blob URL from file data
 */
export const createNewBlobUrl = (file: File): string => {
  // Validate file before attempting to create URL
  if (!isValidFileForBlobUrl(file)) {
    console.warn('[audio-url-validator] Attempted to create blob URL with invalid file', file);
    return '';
  }

  // Release any previous URL that might be associated with this file
  if ('preview' in file && typeof file.preview === 'string' && file.preview.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(file.preview);
    } catch (e) {
      console.warn('[audio-url-validator] Failed to revoke URL:', e);
    }
  }
  
  // Create a new blob URL
  try {
    return URL.createObjectURL(file);
  } catch (error) {
    console.error('[audio-url-validator] Failed to create blob URL:', error);
    return '';
  }
};

/**
 * Safely retrieve a valid blob URL for a file
 * If the existing URL is invalid, creates a new one
 */
export const ensureValidBlobUrl = async (file: File): Promise<string> => {
  // Check if file is valid first
  if (!isValidFileForBlobUrl(file)) {
    console.warn('[audio-url-validator] Cannot ensure valid blob URL for invalid file', file);
    return '';
  }
  
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

/**
 * Safely revokes a blob URL, with proper error handling
 */
export const safelyRevokeBlobUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string' || !url.startsWith('blob:')) {
    return false;
  }
  
  try {
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.warn('[audio-url-validator] Error revoking blob URL:', error);
    return false;
  }
};
