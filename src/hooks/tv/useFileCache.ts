/**
 * Module-level cache for original File objects
 * This allows blob URLs to be recreated after tab switches
 * since File objects cannot be serialized to sessionStorage
 */

interface CachedFile {
  file: File;
  blobUrl: string;
  originalSize: number;
}

// Module-level cache - survives component re-renders but not page reloads
const fileCache = new Map<string, CachedFile>();

/**
 * Generate a unique ID for a file based on its properties
 */
export const getFileId = (file: File | { name: string; size: number; lastModified: number }): string => {
  return `${file.name}-${file.size}-${file.lastModified}`;
};

/**
 * Cache a file and create a blob URL for it
 */
export const cacheFile = (file: File): { fileId: string; blobUrl: string } => {
  const fileId = getFileId(file);
  
  // Check if already cached
  const existing = fileCache.get(fileId);
  if (existing) {
    console.log('[FileCache] File already cached:', fileId);
    return { fileId, blobUrl: existing.blobUrl };
  }
  
  // Create new blob URL and cache
  const blobUrl = URL.createObjectURL(file);
  fileCache.set(fileId, {
    file,
    blobUrl,
    originalSize: file.size
  });
  
  console.log('[FileCache] Cached file:', fileId, 'blobUrl:', blobUrl.substring(0, 50));
  return { fileId, blobUrl };
};

/**
 * Get a cached file by ID
 */
export const getCachedFile = (fileId: string): CachedFile | undefined => {
  return fileCache.get(fileId);
};

/**
 * Recreate a blob URL for a cached file (useful after tab switch invalidates old URL)
 */
export const recreateBlobUrl = (fileId: string): string | null => {
  const cached = fileCache.get(fileId);
  if (!cached) {
    console.log('[FileCache] No cached file found for:', fileId);
    return null;
  }
  
  // Revoke old URL and create new one
  try {
    URL.revokeObjectURL(cached.blobUrl);
  } catch (e) {
    // Ignore if already revoked
  }
  
  const newBlobUrl = URL.createObjectURL(cached.file);
  cached.blobUrl = newBlobUrl;
  
  console.log('[FileCache] Recreated blob URL for:', fileId, 'new:', newBlobUrl.substring(0, 50));
  return newBlobUrl;
};

/**
 * Get the original file size from cache
 */
export const getOriginalSize = (fileId: string): number | null => {
  const cached = fileCache.get(fileId);
  return cached ? cached.originalSize : null;
};

/**
 * Remove a file from cache and revoke its blob URL
 */
export const removeFromCache = (fileId: string): void => {
  const cached = fileCache.get(fileId);
  if (cached) {
    try {
      URL.revokeObjectURL(cached.blobUrl);
    } catch (e) {
      // Ignore if already revoked
    }
    fileCache.delete(fileId);
    console.log('[FileCache] Removed file from cache:', fileId);
  }
};

/**
 * Clear all cached files
 */
export const clearFileCache = (): void => {
  fileCache.forEach((cached, fileId) => {
    try {
      URL.revokeObjectURL(cached.blobUrl);
    } catch (e) {
      // Ignore if already revoked
    }
  });
  fileCache.clear();
  console.log('[FileCache] Cleared all cached files');
};

/**
 * Check if a blob URL is valid by testing if we can create a request for it
 */
export const isBlobUrlValid = async (blobUrl: string): Promise<boolean> => {
  if (!blobUrl.startsWith('blob:')) return true;
  
  try {
    const response = await fetch(blobUrl, { method: 'HEAD' });
    return response.ok;
  } catch (e) {
    return false;
  }
};
