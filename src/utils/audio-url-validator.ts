
/**
 * Audio URL validator utilities
 * Re-exports from the new modular structure for backward compatibility
 */

// Re-export all URL validation functions from the new module
export {
  isValidFileForBlobUrl,
  createNewBlobUrl,
  safelyRevokeBlobUrl,
  isValidBlobUrl,
  isBlobUrlFormat,
  getSafeFileUrl,
  ensureValidBlobUrl
} from './audio/url-validator';
