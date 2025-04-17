
import { toast } from "sonner";
import { UploadedFile } from "./types";

// Handler logic for FileUploadSection to reduce main component size, no logic changes!
interface UseFileUploadHandlersProps {
  files: UploadedFile[];
  setFiles: (files: UploadedFile[]) => void;
  currentFileIndex: number;
  setCurrentFileIndex: (index: number) => void;
}
export function useFileUploadHandlers({
  files,
  setFiles,
  currentFileIndex,
  setCurrentFileIndex,
}: UseFileUploadHandlersProps) {
  const handleFilesAdded = (newFiles: File[]) => {
    console.log('[FileUploadSection] handleFilesAdded called', { incomingFiles: newFiles.map(f => f.name) });
    const audioFiles = newFiles.filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length < newFiles.length) {
      toast.warning('Se omitieron algunos archivos que no son de audio');
    }
    if (audioFiles.length === 0) {
      toast.error('No se seleccionaron archivos de audio válidos');
      return;
    }
    const uploadedFiles = audioFiles.map((file) => {
      const uploadedFile = new File([file], file.name, { type: file.type });
      const preview = URL.createObjectURL(file);
      Object.defineProperty(uploadedFile, 'preview', {
        value: preview,
        writable: true
      });
      return uploadedFile as UploadedFile;
    });
    if (uploadedFiles.length > 0) {
      setFiles([...files, ...uploadedFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    console.log('[FileUploadSection] Removing file at index', index, files[index]?.name);
    const newFiles = [...files];
    if (newFiles[index]?.preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }
    newFiles.splice(index, 1);
    setFiles(newFiles);
    if (currentFileIndex >= newFiles.length && currentFileIndex > 0) {
      setCurrentFileIndex(Math.max(0, newFiles.length - 1));
    }
  };

  return { handleFilesAdded, handleRemoveFile };
}
