
import { useCallback, useEffect } from "react";
import { ensureValidBlobUrl } from "@/utils/audio-url-validator";
import { UploadedFile } from "@/components/radio/types";

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
  // Validate and refresh blob URLs if needed
  const validateFileUrls = useCallback(async () => {
    if (files.length === 0) return;
    
    // Check each file's URL validity
    const updatedFiles = await Promise.all(
      files.map(async (file) => {
        // Skip files with storage URLs as they're more reliable
        if (file.storageUrl) return file;
        
        // Validate blob URLs
        if (file.preview && file.preview.startsWith('blob:')) {
          try {
            // Try to validate and get a new URL if needed
            const validUrl = await ensureValidBlobUrl(file);
            if (validUrl !== file.preview) {
              console.log('[useFilePreviewUrls] Updating invalid blob URL');
              return { ...file, preview: validUrl };
            }
          } catch (err) {
            console.error('[useFilePreviewUrls] Error validating blob URL:', err);
          }
        }
        return file;
      })
    );
    
    // Update files if any URLs were changed
    const hasChanges = updatedFiles.some((file, i) => file.preview !== files[i].preview);
    if (hasChanges) {
      console.log('[useFilePreviewUrls] Updating files with refreshed URLs');
      setFiles(updatedFiles);
    }
  }, [files, setFiles]);

  // Validate URLs when files change
  useEffect(() => {
    validateFileUrls();
  }, [validateFileUrls]);

  return {
    validateFileUrls
  };
};
