
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

interface UploadedFile extends File {
  preview?: string;
}

interface UseRadioFilesOptions {
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
}

export const useRadioFiles = (options: UseRadioFilesOptions = {}) => {
  const {
    persistKey = "radio-files",
    storage = 'sessionStorage',
  } = options;

  const [fileMetadata, setFileMetadata] = usePersistentState<Array<{
    name: string;
    type: string;
    size: number;
    lastModified: number;
    preview?: string;
    blobUrl?: string;  // Store blob URL for faster reconstruction
  }>>(
    `${persistKey}-metadata`,
    [],
    { storage }
  );
  
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [currentFileIndex, setCurrentFileIndex] = usePersistentState<number>(
    `${persistKey}-current-index`,
    0,
    { storage }
  );

  // Ref to track original Blob URLs for cleanup
  const blobUrlsRef = useRef<Map<string, string>>(new Map());

  // Function to create a persistent file object
  const createPersistentFile = useCallback((file: File, options?: { createPreview?: boolean }): Promise<UploadedFile> => {
    return new Promise((resolve) => {
      // Create a new File object with same metadata
      const uploadedFile = new File([file], file.name, { 
        type: file.type,
        lastModified: file.lastModified
      });
      
      // Set correct size
      if (uploadedFile.size !== file.size) {
        Object.defineProperty(uploadedFile, 'size', {
          value: file.size,
          writable: false
        });
      }
      
      // Create and store preview URL if needed
      if (options?.createPreview !== false) {
        const previewUrl = URL.createObjectURL(file);
        Object.defineProperty(uploadedFile, 'preview', {
          value: previewUrl,
          writable: true
        });
        
        // Track the URL for cleanup
        blobUrlsRef.current.set(file.name, previewUrl);
      }
      
      resolve(uploadedFile as UploadedFile);
    });
  }, []);

  // Enhanced file reconstruction on mount/tab changes
  useEffect(() => {
    if (fileMetadata.length === 0 || isInitialized) return;
    
    let isMounted = true;
    
    const reconstructFiles = async () => {
      try {
        console.log('[useRadioFiles] Attempting to reconstruct files from metadata:', fileMetadata.length);
        
        const reconstructedFiles: UploadedFile[] = [];
        
        // Check IndexedDB for file data first
        for (const meta of fileMetadata) {
          try {
            // Try to create a File object from metadata
            const emptyFile = new File([""], meta.name, { 
              type: meta.type,
              lastModified: meta.lastModified
            });
            
            // Set size property
            Object.defineProperty(emptyFile, 'size', {
              value: meta.size,
              writable: false
            });
            
            // Add preview URL if available
            if (meta.preview || meta.blobUrl) {
              const previewUrl = meta.blobUrl || meta.preview;
              Object.defineProperty(emptyFile, 'preview', {
                value: previewUrl,
                writable: true
              });
              
              // Track URL for cleanup
              if (previewUrl) {
                blobUrlsRef.current.set(meta.name, previewUrl);
              }
            }
            
            reconstructedFiles.push(emptyFile as UploadedFile);
          } catch (error) {
            console.error(`[useRadioFiles] Error reconstructing file ${meta.name}:`, error);
          }
        }
        
        if (isMounted) {
          console.log('[useRadioFiles] Successfully reconstructed files:', reconstructedFiles.map(f => f.name));
          setFiles(reconstructedFiles);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("[useRadioFiles] Error reconstructing files from metadata:", error);
        toast.error("Error al cargar archivos guardados");
        if (isMounted) {
          setFileMetadata([]);
          setIsInitialized(true);
        }
      }
    };
    
    reconstructFiles();
    
    return () => {
      isMounted = false;
    };
  }, [fileMetadata, setFileMetadata, isInitialized]);

  // Sync file metadata when files change
  useEffect(() => {
    if (files.length > 0 && isInitialized) {
      const metadata = files.map(file => {
        // Extract the essentials to persist
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          preview: file.preview,
          blobUrl: file.preview // Store blob URL for reconstruction
        };
      });
      
      console.log('[useRadioFiles] Syncing file metadata:', metadata.length);
      setFileMetadata(metadata);
    } else if (fileMetadata.length > 0 && files.length === 0 && isInitialized) {
      console.log('[useRadioFiles] Clearing file metadata; no files remaining');
      setFileMetadata([]);
    }
  }, [files, setFileMetadata, fileMetadata.length, isInitialized]);

  // Cleanup URL objects on unmount
  useEffect(() => {
    return () => {
      // Clean up all tracked URLs
      blobUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
          console.log(`[useRadioFiles] Revoked URL: ${url}`);
        } catch (e) {
          console.warn(`[useRadioFiles] Failed to revoke URL: ${url}`, e);
        }
      });
      blobUrlsRef.current.clear();
      console.log('[useRadioFiles] Cleaned up file object URLs on unmount');
    };
  }, []);

  const currentFile = files.length > 0 && currentFileIndex < files.length 
    ? files[currentFileIndex] 
    : undefined;

  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    console.log('[useRadioFiles] handleFilesAdded called. Adding:', newFiles.length, 'files');
    if (!newFiles || newFiles.length === 0) {
      return;
    }
    
    const audioFiles = newFiles.filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length < newFiles.length) {
      toast.warning('Se omitieron algunos archivos que no son de audio');
    }
    
    if (audioFiles.length === 0) {
      toast.error('No se seleccionaron archivos de audio válidos');
      return;
    }
    
    try {
      // Create persistent versions of uploaded files
      const uploadedFiles = await Promise.all(
        audioFiles.map(file => createPersistentFile(file))
      );
      
      setFiles(prevFiles => {
        const updatedFiles = [...prevFiles, ...uploadedFiles];
        console.log('[useRadioFiles] Files after adding:', updatedFiles.length);
        return updatedFiles;
      });
      
      setIsInitialized(true);
    } catch (error) {
      console.error('[useRadioFiles] Error creating persistent files:', error);
      toast.error('Error al procesar los archivos de audio');
    }
  }, [createPersistentFile]);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      
      // Revoke object URL before removing
      if (newFiles[index]?.preview) {
        try {
          URL.revokeObjectURL(newFiles[index].preview!);
          blobUrlsRef.current.delete(newFiles[index].name);
        } catch (e) {
          console.warn(`[useRadioFiles] Failed to revoke URL for ${newFiles[index].name}`, e);
        }
      }
      
      newFiles.splice(index, 1);
      console.log('[useRadioFiles] handleRemoveFile: files after removal =', newFiles.length);
      
      // Update current file index if needed
      if (currentFileIndex >= newFiles.length && currentFileIndex > 0 && newFiles.length > 0) {
        setCurrentFileIndex(newFiles.length - 1);
        console.log('[useRadioFiles] Updated currentFileIndex:', newFiles.length - 1);
      }
      
      return newFiles;
    });
  }, [currentFileIndex, setCurrentFileIndex]);

  return {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    handleFilesAdded,
    handleRemoveFile,
    isInitialized
  };
}, []);
