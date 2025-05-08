
import { useCallback, useEffect } from "react";
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
  // Validate and refresh blob URLs if needed
  const validateFileUrls = useCallback(async () => {
    if (files.length === 0) return;
    
    let hasChanges = false;
    
    // Check each file's URL validity
    const updatedFiles = await Promise.all(
      files.map(async (file) => {
        // Prioritize storage URLs as they're more reliable
        if (file.storageUrl) {
          // If we have both preview blob and storage URL, prefer storage URL
          if (file.preview && file.preview.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(file.preview);
            } catch (err) {
              // Ignore errors when revoking
            }
            hasChanges = true;
            return { ...file, preview: file.storageUrl };
          }
          return file;
        }
        
        // Validate blob URLs
        if (file.preview && file.preview.startsWith('blob:')) {
          try {
            // Try to validate and get a new URL if needed
            const validUrl = await ensureValidBlobUrl(file);
            if (validUrl !== file.preview) {
              console.log('[useFilePreviewUrls] Updating invalid blob URL');
              hasChanges = true;
              return { ...file, preview: validUrl };
            }
          } catch (err) {
            console.error('[useFilePreviewUrls] Error validating blob URL:', err);
            // Create a new blob URL as fallback
            if (file instanceof File || (file.type && file.name)) {
              try {
                const newPreview = URL.createObjectURL(file);
                hasChanges = true;
                console.log('[useFilePreviewUrls] Created new blob URL as fallback');
                return { ...file, preview: newPreview };
              } catch (e) {
                console.error('[useFilePreviewUrls] Failed to create replacement URL:', e);
              }
            }
          }
        } else if (!file.preview && file instanceof File) {
          // Create a preview if none exists
          try {
            const preview = URL.createObjectURL(file);
            hasChanges = true;
            return { ...file, preview };
          } catch (err) {
            console.error('[useFilePreviewUrls] Error creating preview:', err);
          }
        }
        return file;
      })
    );
    
    // Update files if any URLs were changed
    if (hasChanges) {
      console.log('[useFilePreviewUrls] Updating files with refreshed URLs');
      setFiles(updatedFiles);
    }
  }, [files, setFiles]);

  // Validate URLs when files change
  useEffect(() => {
    validateFileUrls();
  }, [validateFileUrls]);

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview && file.preview.startsWith('blob:') && !file.storageUrl) {
          try {
            URL.revokeObjectURL(file.preview);
          } catch (err) {
            // Ignore errors when revoking
          }
        }
      });
    };
  }, [files]);

  return {
    validateFileUrls
  };
};
