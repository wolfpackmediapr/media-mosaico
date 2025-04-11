
import { useState } from "react";
import { toast } from "sonner";

interface UploadedFile extends File {
  preview?: string;
}

export const useRadioFiles = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  
  const currentFile = files.length > 0 && currentFileIndex < files.length 
    ? files[currentFileIndex] 
    : undefined;
  
  const handleFilesAdded = (newFiles: File[]) => {
    const audioFiles = newFiles.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length < newFiles.length) {
      toast.warning('Se omitieron algunos archivos que no son de audio');
    }

    const uploadedFiles = audioFiles.map((file) => {
      const uploadedFile = new File([file], file.name, { type: file.type });
      Object.defineProperty(uploadedFile, 'preview', {
        value: URL.createObjectURL(file),
        writable: true
      });
      return uploadedFile as UploadedFile;
    });
    
    setFiles([...files, ...uploadedFiles]);
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = [...files];
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }
    newFiles.splice(index, 1);
    
    setFiles(newFiles);
    
    if (currentFileIndex >= newFiles.length && currentFileIndex > 0) {
      setCurrentFileIndex(newFiles.length - 1);
    }
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
