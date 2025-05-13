
/**
 * URL validation utilities
 * Provides functions for validating and managing blob URLs
 */

/**
 * Validates if a file is suitable for blob URL creation
 * @param file The file to check
 * @returns boolean indicating if file is valid for blob URLs
 */
export const isValidFileForBlobUrl = (file: File): boolean => {
  return (
    file !== null && 
    file !== undefined && 
    typeof file === 'object' && 
    'size' in file && 
    file.size > 1 && 
    'type' in file && 
    !!file.type &&
    'name' in file && 
    !!file.name
  );
};

/**
 * Safely creates a new blob URL from a file
 * @param file The file to create URL from
 * @returns The created URL or empty string if failed
 */
export const createNewBlobUrl = (file: File): string => {
  if (!isValidFileForBlobUrl(file)) {
    console.warn('[url-validator] Invalid file for blob URL creation');
    return '';
  }
  
  try {
    const url = URL.createObjectURL(file);
    return url;
  } catch (error) {
    console.error('[url-validator] Error creating blob URL:', error);
    return '';
  }
};

/**
 * Safely revokes a blob URL
 * @param url The URL to revoke
 */
export const safelyRevokeBlobUrl = (url: string): void => {
  if (!url || !url.startsWith('blob:')) return;
  
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('[url-validator] Error revoking blob URL:', error);
  }
};

/**
 * Checks if a blob URL is valid by testing if a media element can load it
 * @param url The blob URL to validate
 * @returns Promise resolving to boolean indicating validity
 */
export const isValidBlobUrl = async (url: string): Promise<boolean> => {
  if (!url || !url.startsWith('blob:')) {
    return false;
  }
  
  return new Promise((resolve) => {
    // Use an audio element for validation
    const audio = new Audio();
    let resolved = false;
    
    // Set a timeout in case the load hangs
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        console.warn('[url-validator] Blob URL validation timed out');
        resolved = true;
        resolve(false);
      }
    }, 2000);
    
    // Set up event handlers
    audio.onloadedmetadata = () => {
      if (!resolved) {
        clearTimeout(timeoutId);
        resolved = true;
        resolve(true);
      }
    };
    
    audio.onerror = () => {
      if (!resolved) {
        clearTimeout(timeoutId);
        resolved = true;
        console.warn('[url-validator] Error validating blob URL with audio element');
        resolve(false);
      }
    };
    
    // Start loading the audio
    try {
      audio.src = url;
      audio.load();
    } catch (err) {
      if (!resolved) {
        clearTimeout(timeoutId);
        resolved = true;
        console.error('[url-validator] Exception during blob URL validation:', err);
        resolve(false);
      }
    }
  });
};

/**
 * Simple synchronous check for blob URL format validity
 * This doesn't validate if the URL is accessible, just if it has the right format
 * @param url URL to check
 * @returns boolean indicating if the format is valid
 */
export const isBlobUrlFormat = (url: string): boolean => {
  return typeof url === 'string' && url.startsWith('blob:');
};

/**
 * Create a safe URL for the file, with fallback to object URL
 * @param file File to get URL for
 * @param existingUrl Optional existing URL
 * @returns Safe URL string
 */
export const getSafeFileUrl = (file: File, existingUrl?: string): string => {
  if (existingUrl && isBlobUrlFormat(existingUrl)) {
    return existingUrl;
  }
  return createNewBlobUrl(file);
};

/**
 * Ensures a blob URL is valid and accessible
 * @param file File with preview URL to check/fix
 * @returns A valid URL or empty string if failed
 */
export const ensureValidBlobUrl = async (file: File & { preview?: string }): Promise<string> => {
  // If there's no preview or it's not a blob URL
  if (!file.preview || !file.preview.startsWith('blob:')) {
    return createNewBlobUrl(file);
  }
  
  try {
    // Try validating with audio element
    const isValid = await isValidBlobUrl(file.preview);
    
    if (isValid) {
      return file.preview;
    } else {
      // If the URL is invalid, create a new one
      safelyRevokeBlobUrl(file.preview);
      return createNewBlobUrl(file);
    }
  } catch (error) {
    console.error('[url-validator] Error validating blob URL:', error);
    
    // On error, try to create a new URL
    safelyRevokeBlobUrl(file.preview);
    return createNewBlobUrl(file);
  }
};
