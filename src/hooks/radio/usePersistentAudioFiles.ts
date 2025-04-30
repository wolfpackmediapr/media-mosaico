import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { uploadFileToStorage, saveAudioFileMetadata, deleteFileFromStorage, getUserAudioFiles } from "@/services/supabase/fileStorage";
import { supabase } from "@/integrations/supabase/client";
import { UploadedFile } from "@/components/radio/types";

export interface AudioFile extends File {
  id?: string;
  preview?: string;
  remoteUrl?: string;
  storagePath?: string;
  isUploaded?: boolean;
}

interface AudioFileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  preview?: string;
  remoteUrl?: string;
  storagePath?: string;
  isUploaded?: boolean;
}

interface UsePersistentAudioFilesOptions {
  persistKey?: string;
  storage?: 'localStorage' | 'sessionStorage';
  autoUpload?: boolean;
}

export const usePersistentAudioFiles = ({
  persistKey = "audio-files",
  storage = 'sessionStorage',
  autoUpload = true
}: UsePersistentAudioFilesOptions = {}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const { isAuthenticated } = useAuthStatus();

  // Store file metadata in persistent storage
  const [fileMetadata, setFileMetadata] = usePersistentState<AudioFileMetadata[]>(
    `${persistKey}-metadata`,
    [],
    { storage }
  );
  
  // In-memory files array
  const [files, setFiles] = useState<AudioFile[]>([]);
  
  // Current selected file index
  const [currentFileIndex, setCurrentFileIndex] = usePersistentState<number>(
    `${persistKey}-current-index`,
    0,
    { storage }
  );

  // Fetch remote files on initial load if authenticated
  useEffect(() => {
    const fetchRemoteFiles = async () => {
      if (!isAuthenticated) return;
      
      try {
        // Use the getUserAudioFiles function
        const { data, error } = await getUserAudioFiles();
        
        if (error) {
          console.error("Error fetching remote audio files:", error);
          toast.error("Error fetching saved files");
          return;
        }

        if (data && data.length > 0) {
          console.log(`[usePersistentAudioFiles] Found ${data.length} remote files`);
          
          // Create file metadata from remote files, ensuring type compatibility
          const remoteFileMetadata: AudioFileMetadata[] = data.map((file) => {
            const publicUrlResult = supabase.storage.from('audio').getPublicUrl(file.storage_path);
            // Ensure remoteUrl is string | undefined to match AudioFileMetadata
            const remoteUrl = publicUrlResult.data?.publicUrl || undefined; 

            return {
              id: file.id,
              name: file.filename,
              type: file.mime_type || 'audio/mpeg',
              size: file.file_size || 0,
              lastModified: new Date(file.created_at).getTime(),
              remoteUrl: remoteUrl, // Assign string | undefined
              storagePath: file.storage_path,
              isUploaded: true
            };
          });
          
          // Explicitly type mergedMetadata as AudioFileMetadata[]
          const mergedMetadata: AudioFileMetadata[] = [...remoteFileMetadata];
          
          // Only add local files that aren't already present remotely
          fileMetadata.forEach(localFile => {
            // Check using a unique identifier if possible (e.g., id if local files have stable ids)
            // Using name and size as a fallback uniqueness check
            if (!remoteFileMetadata.some(remoteFile => 
              remoteFile.name === localFile.name && 
              remoteFile.size === localFile.size)) {
              mergedMetadata.push(localFile); // Push AudioFileMetadata into AudioFileMetadata[]
            }
          });
          
          // Sort merged data if needed, e.g., by lastModified date
          mergedMetadata.sort((a, b) => b.lastModified - a.lastModified);

          setFileMetadata(mergedMetadata);
        }
      } catch (err) {
        console.error("Error in fetchRemoteFiles:", err);
        toast.error("Error processing saved files");
      }
    };
    
    // Debounce or ensure this runs only once appropriately if fileMetadata dependency causes loops
    fetchRemoteFiles(); 
    // Consider refining dependencies if fetchRemoteFiles modifies fileMetadata causing loops
  }, [isAuthenticated, setFileMetadata]); // Adjusted dependencies

  // Reconstruct files from metadata on mount
  useEffect(() => {
    if (fileMetadata.length === 0 || files.length > 0) return;
    
    try {
      console.log('[usePersistentAudioFiles] Reconstructing files from metadata:', fileMetadata.length);
      
      // Create file objects from metadata
      const reconstructedFiles = fileMetadata.map(meta => {
        // For files with remote URLs, create a special File object
        if (meta.remoteUrl) {
          const file = new File([""], meta.name, { 
            type: meta.type,
            lastModified: meta.lastModified
          }) as AudioFile;
          
          // Add remote properties
          file.remoteUrl = meta.remoteUrl;
          file.storagePath = meta.storagePath;
          file.isUploaded = true;
          file.id = meta.id;
          
          // Set size property
          Object.defineProperty(file, 'size', {
            value: meta.size,
            writable: false
          });
          
          return file;
        }
        
        // For local files, create a regular File object
        const file = new File([""], meta.name, { 
          type: meta.type,
          lastModified: meta.lastModified
        }) as AudioFile;
        
        // Set size property
        Object.defineProperty(file, 'size', {
          value: meta.size,
          writable: false
        });
        
        // Add preview URL if available
        if (meta.preview) {
          file.preview = meta.preview;
        }
        
        return file;
      });
      
      console.log('[usePersistentAudioFiles] Successfully reconstructed files:', reconstructedFiles.map(f => f.name));
      setFiles(reconstructedFiles);
    } catch (error) {
      console.error("[usePersistentAudioFiles] Error reconstructing files from metadata:", error);
      toast.error("Error al cargar archivos guardados");
      setFileMetadata([]);
    }
  }, [fileMetadata, setFileMetadata]);

  // Sync file metadata when files change
  useEffect(() => {
    if (files.length > 0) {
      const metadata: AudioFileMetadata[] = files.map(file => ({
        id: file.id || uuidv4(),
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        preview: file.preview,
        remoteUrl: file.remoteUrl,
        storagePath: file.storagePath,
        isUploaded: file.isUploaded
      }));
      
      console.log('[usePersistentAudioFiles] Syncing file metadata:', metadata.length);
      setFileMetadata(metadata);
    } else if (fileMetadata.length > 0 && files.length === 0) {
      console.log('[usePersistentAudioFiles] Clearing file metadata; no files remaining');
      setFileMetadata([]);
    }
  }, [files, setFileMetadata, fileMetadata.length]);

  // Upload a single file to Supabase
  const uploadFile = useCallback(async (file: File): Promise<AudioFile | null> => {
    if (!isAuthenticated) {
      toast.error("Debe iniciar sesión para guardar archivos");
      return null;
    }
    
    setIsUploading(true);
    
    try {
      const fileId = uuidv4();
      // Update progress for this specific file
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev[fileId] >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return {
            ...prev,
            [fileId]: prev[fileId] + Math.random() * 10
          };
        });
      }, 300);
      
      // Upload to Supabase storage
      const { path, url, error } = await uploadFileToStorage(file);
      
      clearInterval(progressInterval);
      
      if (error) {
        toast.error("Error al subir archivo");
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        return null;
      }
      
      // Update progress to 100% when complete
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
      
      // Save metadata in database
      await saveAudioFileMetadata(file, path);
      
      // Create preview URL for local use
      const preview = URL.createObjectURL(file);
      
      // Create and return enhanced file
      const uploadedFile = new File([file], file.name, { type: file.type }) as AudioFile;
      uploadedFile.preview = preview;
      uploadedFile.remoteUrl = url;
      uploadedFile.storagePath = path;
      uploadedFile.isUploaded = true;
      uploadedFile.id = fileId;
      
      return uploadedFile;
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir archivo");
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [isAuthenticated]);

  // Add files handler with optional auto-upload
  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    console.log('[usePersistentAudioFiles] handleFilesAdded called. Adding:', newFiles.length, 'files');
    if (!newFiles || newFiles.length === 0) {
      return [];
    }
    
    const audioFiles = newFiles.filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length < newFiles.length) {
      toast.warning('Se omitieron algunos archivos que no son de audio');
    }
    
    if (audioFiles.length === 0) {
      toast.error('No se seleccionaron archivos de audio válidos');
      return [];
    }
    
    // First create local preview files
    const localFiles = audioFiles.map((file) => {
      const localFile = new File([file], file.name, { 
        type: file.type,
        lastModified: file.lastModified
      }) as AudioFile;
      
      // Set correct size
      Object.defineProperty(localFile, 'size', {
        value: file.size,
        writable: false
      });
      
      // Create and store preview URL
      const previewUrl = URL.createObjectURL(file);
      localFile.preview = previewUrl;
      localFile.id = uuidv4();
      
      return localFile;
    });
    
    // Add local files first for immediate display
    setFiles(prevFiles => [...prevFiles, ...localFiles]);
    
    // If auto-upload is enabled and user is authenticated, upload files in background
    if (autoUpload && isAuthenticated) {
      // Upload files one by one and collect results
      const uploadedFiles: AudioFile[] = [];
      
      for (const file of audioFiles) {
        const uploadedFile = await uploadFile(file);
        if (uploadedFile) {
          uploadedFiles.push(uploadedFile);
        }
      }
      
      // Update files with remote URLs
      if (uploadedFiles.length > 0) {
        setFiles(prevFiles => {
          // Replace local files with uploaded ones based on file name and size
          const updatedFiles = prevFiles.map(file => {
            const uploadedVersion = uploadedFiles.find(
              uploaded => uploaded.name === file.name && uploaded.size === file.size
            );
            return uploadedVersion || file;
          });
          
          return updatedFiles;
        });
      }
    }
    
    return localFiles;
  }, [isAuthenticated, autoUpload, setFiles, uploadFile]);

  // Remove file handler
  const handleRemoveFile = useCallback(async (index: number) => {
    const fileToRemove = files[index];
    
    if (!fileToRemove) {
      return;
    }
    
    // If file has a storage path, delete it from Supabase
    if (fileToRemove.storagePath && isAuthenticated) {
      await deleteFileFromStorage(fileToRemove.storagePath);
    }
    
    // Remove local preview URL
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    
    // Remove file from state
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      newFiles.splice(index, 1);
      
      // Update current file index if needed
      if (currentFileIndex >= newFiles.length && currentFileIndex > 0 && newFiles.length > 0) {
        setCurrentFileIndex(newFiles.length - 1);
      }
      
      return newFiles;
    });
    
    toast.success("Archivo eliminado");
  }, [files, currentFileIndex, setCurrentFileIndex, isAuthenticated]);

  const currentFile = files[currentFileIndex];

  return {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    isUploading,
    uploadProgress,
    handleFilesAdded,
    handleRemoveFile,
    uploadFile
  };
};
