
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface FileUploadZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  accept?: string;
  message?: string;
}

const FileUploadZone = ({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  isUploading = false,
  uploadProgress = 0,
  accept,
  message = "Arrastra y suelta archivos aquí o selecciónalos manualmente"
}: FileUploadZoneProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir Archivos</CardTitle>
        <CardDescription>
          {message}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? "border-primary bg-primary/10" : "border-gray-300"
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          {isUploading ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Subiendo archivo...</p>
              <Progress value={uploadProgress} className="w-full h-2" />
              <p className="text-xs text-gray-500">{uploadProgress.toFixed(0)}% completado</p>
            </div>
          ) : (
            <>
              <p className="mb-2 text-sm text-gray-500">
                {message}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Tamaño máximo permitido: 100MB
              </p>
              <Button
                variant="outline"
                onClick={() => document.getElementById("fileInput")?.click()}
              >
                Seleccionar Archivos
              </Button>
            </>
          )}
          <input
            id="fileInput"
            type="file"
            className="hidden"
            accept={accept}
            multiple
            onChange={onFileInput}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploadZone;
