import { useState } from "react";
import { Upload, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useChunkedVideoUpload } from "@/hooks/use-chunked-video-upload";
import { useFileUpload } from "@/hooks/use-file-upload";

interface TvVideoUploaderProps {
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
  onFilesUploaded: (files: File[]) => void;
}

const TvVideoUploader = ({ 
  isDragging, 
  setIsDragging,
  onFilesUploaded 
}: TvVideoUploaderProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Regular upload for smaller files
  const { isUploading: isRegularUploading, uploadProgress: regularProgress, uploadFile } = useFileUpload();
  
  // Chunked upload for larger files
  const { 
    isUploading: isChunkedUploading, 
    uploadProgress: chunkedProgress, 
    chunkProgress,
    totalChunks,
    isPaused,
    uploadFileChunked,
    pauseUpload,
    resumeUpload
  } = useChunkedVideoUpload();

  const isUploading = isRegularUploading || isChunkedUploading;
  const uploadProgress = isChunkedUploading ? chunkedProgress : regularProgress;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    
    const uploadedFiles: File[] = [];
    
    for (const file of fileArray) {
      // Use chunked upload for all video files for consistency and reliability
      const result = await uploadFileChunked(file);
      
      if (result) {
        const uploadedFile = Object.assign(file, { preview: result.preview });
        uploadedFiles.push(uploadedFile);
      }
    }
    
    if (uploadedFiles.length > 0) {
      onFilesUploaded(uploadedFiles);
    }
    
    setSelectedFiles([]);
  };

  const cancelUpload = () => {
    if (isChunkedUploading) {
      pauseUpload();
    }
    setSelectedFiles([]);
  };

  const getProgressText = () => {
    if (isChunkedUploading && totalChunks > 0) {
      if (uploadProgress >= 100 && chunkProgress >= 100) {
        return "Procesando archivo... Esto puede tomar unos minutos para archivos grandes.";
      }
      return `Subiendo fragmento ${Math.round(chunkProgress)}/${totalChunks} - ${uploadProgress.toFixed(0)}% completado`;
    }
    return `${uploadProgress.toFixed(0)}% completado`;
  };

  const getFileSizeLimit = () => {
    return "Archivos de video de cualquier tamaño";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir Videos TV</CardTitle>
        <CardDescription>
          Sube archivos de video para transcribir. Archivos grandes se suben automáticamente por fragmentos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? "border-primary bg-primary/10" : "border-gray-300"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          {isUploading ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                {isChunkedUploading ? "Subiendo archivo grande..." : "Subiendo archivo..."}
              </p>
              <Progress value={uploadProgress} className="w-full h-2" />
              <p className="text-xs text-gray-500">{getProgressText()}</p>
              
              {isChunkedUploading && (
                <div className="flex gap-2 justify-center">
                  {!isPaused ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={pauseUpload}
                      className="flex items-center gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      Pausar
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resumeUpload}
                      className="flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Reanudar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelUpload}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="mb-2 text-sm text-gray-500">
                Arrastra y suelta videos aquí o selecciónalos manualmente
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {getFileSizeLimit()}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Todos los archivos se suben de forma segura por fragmentos
              </p>
              <Button
                variant="outline"
                onClick={() => document.getElementById("tvFileInput")?.click()}
              >
                Seleccionar Videos
              </Button>
            </>
          )}
          <input
            id="tvFileInput"
            type="file"
            className="hidden"
            accept="video/*"
            multiple
            onChange={handleFileInput}
          />
        </div>
        
        {selectedFiles.length > 0 && !isUploading && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Archivos seleccionados:</h4>
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                    <span className="ml-2 text-blue-600">(Subida por fragmentos)</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TvVideoUploader;