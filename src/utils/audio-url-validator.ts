
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
    console.warn('[audio-url-validator] Invalid file for blob URL creation');
    return '';
  }
  
  try {
    const url = URL.createObjectURL(file);
    return url;
  } catch (error) {
    console.error('[audio-url-validator] Error creating blob URL:', error);
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
    console.error('[audio-url-validator] Error revoking blob URL:', error);
  }
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
    // Test if the URL is valid by making a HEAD request
    const response = await fetch(file.preview, { method: 'HEAD' });
    
    if (response.ok) {
      return file.preview;
    } else {
      // If the URL is invalid, create a new one
      safelyRevokeBlobUrl(file.preview);
      return createNewBlobUrl(file);
    }
  } catch (error) {
    console.error('[audio-url-validator] Error validating blob URL:', error);
    
    // On error, try to create a new URL
    safelyRevokeBlobUrl(file.preview);
    return createNewBlobUrl(file);
  }
};
