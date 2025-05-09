
import { useCallback, useEffect, useRef } from "react";
import { ensureValidBlobUrl } from "@/utils/audio-url-validator";
import { UploadedFile } from "@/components/radio/types";
import { toast } from "sonner";

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
        if (!file || typeof file !== 'object') {
          console.warn('[useFilePreviewUrls] Invalid file object in files array');
          updatedFiles.push(file);
          continue;
        }
        
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
            console.error('[useFilePreviewUrls] Error validating blob URL:', err);
            
            // Create a new blob URL as fallback
            // Add robust type checking before using as File
            if (file && 
                (file instanceof File || 
                (typeof file === 'object' && file !== null && 
                 'type' in file && typeof file.type === 'string' && 
                 'name' in file && typeof file.name === 'string'))) {
              try {
                // Revoke old URL if it exists
                if (file.preview) {
                  try {
                    URL.revokeObjectURL(file.preview);
                    createdUrls.current = createdUrls.current.filter(url => url !== file.preview);
                  } catch (e) {
                    // Ignore revoke errors
                  }
                }
                
                const newPreview = URL.createObjectURL(file as File);
                // Track new URL
                createdUrls.current.push(newPreview);
                hasChanges = true;
                console.log('[useFilePreviewUrls] Created new blob URL as fallback');
                updatedFiles.push({ ...file, preview: newPreview });
              } catch (e) {
                console.error('[useFilePreviewUrls] Failed to create replacement URL:', e);
                updatedFiles.push(file); // Keep original to avoid losing the file
              }
            } else {
              console.warn('[useFilePreviewUrls] Invalid file object for URL creation');
              updatedFiles.push(file); // Keep original to avoid losing the file
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
        if (file && file.preview && file.preview.startsWith('blob:') && !file.storageUrl) {
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
