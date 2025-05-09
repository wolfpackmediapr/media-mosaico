
import { useCallback, useEffect, useRef } from "react";
import { ensureValidBlobUrl } from "@/utils/audio-url-validator";
import { UploadedFile } from "@/components/radio/types";
import { toast } from "sonner";
import { isUploadedFile, hasPreviewProperties, isReconstructableFile } from "@/utils/file-type-guards";

interface UseFilePreviewUrlsProps {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
}

/**
 * Hook for managing file preview URLs and validating their integrity
 */
export const useFilePreviewUrls = ({
  files,
  setFiles
}: UseFilePreviewUrlsProps) => {
  // Keep track of URLs we've created to clean them up
  const createdUrls = useRef<string[]>([]);
  
  // Validate and refresh blob URLs if needed
  const validateFileUrls = useCallback(async () => {
    if (!Array.isArray(files) || files.length === 0) return;
    
    let hasChanges = false;
    
    // Check each file's URL validity - do it sequentially to avoid overwhelming the browser
    const updatedFiles = [];
    
    for (const file of files) {
      try {
        // Skip invalid file objects
        if (!isUploadedFile(file)) {
          console.warn('[useFilePreviewUrls] Invalid file object in files array');
          updatedFiles.push(file);
          continue;
        }
        
        // Safe access to file name for logging
        const fileName = file.name;
        
        // Prioritize storage URLs as they're more reliable
        if (file.storageUrl) {
          // If we have both preview blob and storage URL, prefer storage URL
          if (file.preview && file.preview.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(file.preview);
              // Remove from tracking
              createdUrls.current = createdUrls.current.filter(url => url !== file.preview);
            } catch (err) {
              // Ignore errors when revoking
            }
            hasChanges = true;
            updatedFiles.push({ ...file, preview: file.storageUrl });
          } else {
            updatedFiles.push(file);
          }
          continue;
        }
        
        // Validate blob URLs
        if (file.preview && file.preview.startsWith('blob:')) {
          try {
            // Try to validate and get a new URL if needed
            const validUrl = await ensureValidBlobUrl(file);
            if (validUrl !== file.preview) {
              console.log('[useFilePreviewUrls] Updating invalid blob URL');
              
              // Revoke old URL
              try {
                URL.revokeObjectURL(file.preview);
                createdUrls.current = createdUrls.current.filter(url => url !== file.preview);
              } catch (e) {
                // Ignore revoke errors
              }
              
              // Track new URL
              createdUrls.current.push(validUrl);
              hasChanges = true;
              updatedFiles.push({ ...file, preview: validUrl });
            } else {
              updatedFiles.push(file);
            }
          } catch (err) {
            console.error('[useFilePreviewUrls] Error validating blob URL:', err, file.name);
            
            // Fallback: Attempt to create a new blob URL ONLY if 'file' is a File instance.
            if (file instanceof File) {
              try {
                // Revoke old URL if it exists and was tracked
                if (file.preview && createdUrls.current.includes(file.preview)) {
                  URL.revokeObjectURL(file.preview);
                  createdUrls.current = createdUrls.current.filter(url => url !== file.preview);
                } else if (file.preview && file.preview.startsWith('blob:')) {
                  // Attempt to revoke even if not tracked, in case it's an old one
                  try { URL.revokeObjectURL(file.preview); } catch (e) { /* ignore */ }
                }
                
                const newPreview = URL.createObjectURL(file); // `file` is a File instance here
                createdUrls.current.push(newPreview); // Track new URL
                hasChanges = true;
                console.log('[useFilePreviewUrls] Created new blob URL as fallback for File instance:', file.name);
                // Spread `file` to retain its UploadedFile properties, then override preview
                updatedFiles.push({ ...(file as UploadedFile), preview: newPreview });
              } catch (e) {
                console.error('[useFilePreviewUrls] Failed to create replacement URL from File instance:', e);
                updatedFiles.push(file); // Keep original to avoid losing the file
              }
            } else if (isUploadedFile(file)) {
              // If `file` is an UploadedFile descriptor but not a File instance, we can't create a new blob URL.
              console.warn('[useFilePreviewUrls] Cannot create new blob URL: file is a descriptor, not a File instance.');
              updatedFiles.push(file); // Keep original
            } else {
              // file is null or undefined, should have been caught by earlier check
              console.warn('[useFilePreviewUrls] Encountered null/undefined file object during fallback URL creation.');
              // No push needed if file is null/undefined
            }
          }
        } else if (!file.preview && file instanceof File) {
          // Create a preview if none exists
          try {
            const preview = URL.createObjectURL(file);
            // Track new URL
            createdUrls.current.push(preview);
            hasChanges = true;
            updatedFiles.push({ ...file, preview });
          } catch (err) {
            console.error('[useFilePreviewUrls] Error creating preview:', err);
            updatedFiles.push(file); // Keep original to avoid losing the file
          }
        } else {
          updatedFiles.push(file);
        }
      } catch (err) {
        console.error('[useFilePreviewUrls] Unexpected error processing file:', err);
        
        // Safely log file name if available, otherwise skip name
        if (isUploadedFile(file)) {
          console.error('[useFilePreviewUrls] Error occurred for file:', file.name);
        }
        
        updatedFiles.push(file); // Keep original to avoid losing the file
      }
    }
    
    // Update files if any URLs were changed
    if (hasChanges) {
      console.log('[useFilePreviewUrls] Updating files with refreshed URLs');
      setFiles(updatedFiles);
    }
  }, [files, setFiles]);

  // Validate URLs when files change, but debounce to avoid excessive processing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateFileUrls();
    }, 50); // Short timeout for debounce
    
    return () => clearTimeout(timeoutId);
  }, [validateFileUrls, files]);

  // Clean up blob URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      // First, try to clean up by checking the current files
      files.forEach(file => {
        if (isUploadedFile(file) && file.preview && file.preview.startsWith('blob:') && !file.storageUrl) {
          try {
            URL.revokeObjectURL(file.preview);
          } catch (err) {
            // Ignore errors when revoking
          }
        }
      });
      
      // Then, also clean up our tracked URLs to be extra safe
      createdUrls.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          // Ignore errors when revoking
        }
      });
      
      createdUrls.current = [];
    };
  }, [files]);

  return {
    validateFileUrls
  };
};
