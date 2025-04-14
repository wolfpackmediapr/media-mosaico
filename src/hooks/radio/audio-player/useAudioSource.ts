
import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface AudioSource {
  url: string | null;
  type: "blob" | "remote" | null;
  metadata: {
    fileName: string;
    fileSize?: number;
    fileType?: string;
    lastModified?: number;
  } | null;
  isValid: boolean;
}

interface UseAudioSourceOptions {
  onError?: (error: string) => void;
}

export function useAudioSource(file?: File, options?: UseAudioSourceOptions) {
  const [audioSource, setAudioSource] = useState<AudioSource>({
    url: null,
    type: null,
    metadata: null,
    isValid: false,
  });

  useEffect(() => {
    // Clean up previous URL if it exists and is a blob
    if (audioSource.url && audioSource.type === "blob") {
      URL.revokeObjectURL(audioSource.url);
    }
    
    // Reset audio source when no file is provided
    if (!file) {
      setAudioSource({
        url: null,
        type: null,
        metadata: null,
        isValid: false,
      });
      return;
    }
    
    // Validate the file
    if (!(file instanceof File)) {
      console.error('Invalid file object provided to useAudioSource:', file);
      options?.onError?.('Invalid file object');
      return;
    }

    if (file.size === 0) {
      console.error('File has zero size:', file.name);
      options?.onError?.('File is empty');
      return;
    }
    
    try {
      // Create a new blob URL from the file
      const objectUrl = URL.createObjectURL(file);
      
      setAudioSource({
        url: objectUrl,
        type: "blob",
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          lastModified: file.lastModified
        },
        isValid: true,
      });
      
      // Less strict validation - just check if blob URL was created successfully
      // Don't use Audio element test as it might be too restrictive on certain browsers
      console.log(`Created object URL for file: ${file.name}, size: ${file.size}, type: ${file.type || 'unknown'}`);
      
    } catch (error) {
      console.error('Error creating object URL:', error);
      options?.onError?.('Error creating audio preview');
    }
    
    // Clean up on unmount
    return () => {
      if (audioSource.url && audioSource.type === "blob") {
        URL.revokeObjectURL(audioSource.url);
      }
    };
  }, [file]);

  return {
    audioSource,
    isValid: audioSource.isValid,
    url: audioSource.url,
    metadata: audioSource.metadata,
  };
}
