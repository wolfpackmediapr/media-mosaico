import { FileVideo, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import VideoPlayer from "./VideoPlayer";

interface UploadedFile extends File {
  preview?: string;
}

interface VideoPreviewProps {
  uploadedFiles: UploadedFile[];
  isPlaying: boolean;
  volume: number[];
  isProcessing: boolean;
  progress: number;
  onTogglePlayback: () => void;
  onVolumeChange: (value: number[]) => void;
  onProcess: (file: UploadedFile) => void;
  onTranscriptionComplete?: (text: string) => void;
  onRemoveFile?: (index: number) => void;
}

const VideoPreview = ({
  uploadedFiles,
  isProcessing,
  progress,
  onProcess,
  onTranscriptionComplete,
  onRemoveFile,
}: VideoPreviewProps) => {
  const handleProcess = async (file: UploadedFile) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para procesar transcripciones",
          variant: "destructive",
        });
        return;
      }

      if (file.size <= 25 * 1024 * 1024) {
        // For files under 25MB, use direct transcription
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', user.id);

        const { data, error } = await supabase.functions.invoke('secure-transcribe', {
          body: formData,
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.text) {
          onTranscriptionComplete?.(data.text);
          toast({
            title: "Transcripción completada",
            description: "El archivo ha sido procesado exitosamente",
          });
        }
      } else {
        // For larger files, use the existing process
        onProcess(file);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Videos Subidos</CardTitle>
        <CardDescription>Lista de videos listos para procesar</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {uploadedFiles.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay videos subidos</p>
          ) : (
            uploadedFiles.map((file, index) => (
              <div key={index} className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileVideo className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => onRemoveFile?.(index)}
                    className="text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {file.preview && (
                  <VideoPlayer src={file.preview} />
                )}

                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={progress} className="w-full" />
                    <p className="text-xs text-center text-gray-500">
                      {progress === 100 ? 'Procesamiento completado' : `Procesando: ${progress}%`}
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => handleProcess(file)}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Procesando...' : 'Procesar Transcripción'}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoPreview;