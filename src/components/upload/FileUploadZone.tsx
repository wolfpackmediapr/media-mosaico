
import React, { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { UploadCloud } from "lucide-react";

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
  icon?: ReactNode;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  isUploading = false,
  uploadProgress = 0,
  accept = "*",
  message = "Arrastra y suelta archivos o haz clic para seleccionarlos",
  icon
}) => {
  return (
    <Card
      className={cn(
        "border-dashed border-2 rounded-lg p-12 transition-colors text-center flex flex-col items-center justify-center cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => document.getElementById("file-upload")?.click()}
    >
      {icon || <UploadCloud className="h-8 w-8 mb-2 text-muted-foreground" />}
      <p className="text-sm text-muted-foreground mb-2">{message}</p>
      
      {isUploading && (
        <div className="w-full mt-4 bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
      
      <input
        id="file-upload"
        type="file"
        className="hidden"
        onChange={onFileInput}
        accept={accept}
        multiple
      />
    </Card>
  );
};

export default FileUploadZone;
