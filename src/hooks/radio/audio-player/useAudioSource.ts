
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
      
      // Test the audio to ensure it's actually playable
      const testAudio = new Audio();
      
      const errorHandler = () => {
        console.error('Error loading audio file in test:', file.name);
        URL.revokeObjectURL(objectUrl);
        setAudioSource(prev => ({
          ...prev,
          isValid: false
        }));
        options?.onError?.('Error loading audio file');
      };
      
      testAudio.addEventListener('error', errorHandler);
      
      // Add a timeout to detect if audio is taking too long to load
      const timeoutId = setTimeout(() => {
        if (!testAudio.readyState) {
          errorHandler();
          testAudio.src = '';
          clearTimeout(timeoutId);
        }
      }, 5000);
      
      testAudio.addEventListener('canplaythrough', () => {
        clearTimeout(timeoutId);
      });
      
      testAudio.src = objectUrl;
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
