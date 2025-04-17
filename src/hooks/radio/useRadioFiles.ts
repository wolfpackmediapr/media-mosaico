import { usePersistentState } from "@/hooks/use-persistent-state";
import { useState, useEffect } from "react";
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
  }>>(
    `${persistKey}-metadata`,
    [],
    { storage }
  );
  
  const [files, setFiles] = useState<UploadedFile[]>([]);
  
  const [currentFileIndex, setCurrentFileIndex] = usePersistentState<number>(
    `${persistKey}-current-index`,
    0,
    { storage }
  );

  useEffect(() => {
    if (fileMetadata.length === 0 || files.length > 0) return;
    try {
      const reconstructedFiles = fileMetadata.map(meta => {
        const file = new File([""], meta.name, { 
          type: meta.type,
          lastModified: meta.lastModified
        });
        Object.defineProperty(file, 'size', {
          value: meta.size,
          writable: false
        });
        if (meta.preview) {
          Object.defineProperty(file, 'preview', {
            value: meta.preview,
            writable: true
          });
        }
        return file as UploadedFile;
      });
      console.log('[useRadioFiles] Reconstructed files from metadata:', reconstructedFiles.map(f => f.name));
      setFiles(reconstructedFiles);
    } catch (error) {
      console.error("[useRadioFiles] Error reconstructing files from metadata:", error);
      toast.error("Error al cargar archivos guardados");
      setFileMetadata([]);
    }
  }, [fileMetadata]);

  useEffect(() => {
    if (files.length > 0) {
      const metadata = files.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        preview: file.preview
      }));
      setFileMetadata(metadata);
      console.log('[useRadioFiles] Synced file metadata:', metadata.map(m => m.name));
    } else if (fileMetadata.length > 0 && files.length === 0) {
      setFileMetadata([]);
      console.log('[useRadioFiles] Cleared file metadata; no files remaining');
    }
  }, [files, setFileMetadata]);

  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      console.log('[useRadioFiles] Cleaned up file object URLs');
    };
  }, []);

  const currentFile = files.length > 0 && currentFileIndex < files.length 
    ? files[currentFileIndex] 
    : undefined;

  const handleFilesAdded = (newFiles: File[]) => {
    console.log('[useRadioFiles] handleFilesAdded called. Adding:', newFiles.map(f => f.name));
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
    const uploadedFiles = audioFiles.map((file) => {
      const uploadedFile = new File([file], file.name, { 
        type: file.type,
        lastModified: file.lastModified
      });
      if (uploadedFile.size !== file.size) {
        Object.defineProperty(uploadedFile, 'size', {
          value: file.size,
          writable: false
        });
      }
      const previewUrl = URL.createObjectURL(file);
      Object.defineProperty(uploadedFile, 'preview', {
        value: previewUrl,
        writable: true
      });
      return uploadedFile as UploadedFile;
    });
    setFiles(prevFiles => {
      const updatedFiles = [...prevFiles, ...uploadedFiles];
      console.log('[useRadioFiles] Files after adding:', updatedFiles.map(f => f.name));
      return updatedFiles;
    });
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      if (newFiles[index]?.preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      console.log('[useRadioFiles] handleRemoveFile: newFiles =', newFiles.map(f => f.name));
      if (currentFileIndex >= newFiles.length && currentFileIndex > 0 && newFiles.length > 0) {
        setCurrentFileIndex(newFiles.length - 1);
        console.log('[useRadioFiles] Updated currentFileIndex:', newFiles.length - 1);
      }
      return newFiles;
    });
  };

  return {
    files,
    setFiles,
    currentFileIndex,
    setCurrentFileIndex,
    currentFile,
    handleFilesAdded,
    handleRemoveFile
  };
};
