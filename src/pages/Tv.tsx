import { useState, useCallback } from "react";
import { Upload, Play, Pause, Volume2, FileVideo, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

interface UploadedFile extends File {
  preview?: string;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

const Tv = () => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Error",
        description: "Por favor, sube únicamente archivos de video.",
        variant: "destructive"
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Archivo grande detectado",
        description: "El archivo excede el tamaño permitido. Convertiendo a formato MP3 para continuar...",
      });
    } else {
      toast({
        title: "Archivo cargado correctamente",
        description: "Listo para procesar con transcripción.",
      });
    }

    return true;
  };

  const handleFiles = useCallback((files: FileList) => {
    const validFiles = Array.from(files).filter(validateFile);

    const filesWithPreviews = validFiles.map(file => {
      const preview = URL.createObjectURL(file);
      return Object.assign(file, { preview });
    });

    setUploadedFiles(prev => [...prev, ...filesWithPreviews]);
  }, []);

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

  const handleProcess = async (file: UploadedFile) => {
    setIsProcessing(true);
    setProgress(0);

    // Simulate processing progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    // Here we'll add the actual API calls later
    toast({
      title: "Procesando archivo",
      description: "Transcribiendo archivo... Esto puede tardar unos momentos dependiendo del tamaño del archivo.",
    });
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">MONITOREO TV</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Sube, transcribe y gestiona contenido de video de manera eficiente
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subir Videos</CardTitle>
            <CardDescription>
              Arrastra y suelta archivos de video aquí o selecciónalos manualmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">
                Arrastra y suelta archivos de video aquí o selecciona un archivo para subir.
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Archivos mayores a 25MB serán convertidos automáticamente a formato audio.
              </p>
              <Button
                variant="outline"
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                Seleccionar Archivos
              </Button>
              <input
                id="fileInput"
                type="file"
                className="hidden"
                accept="video/*"
                multiple
                onChange={handleFileInput}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Videos Subidos</CardTitle>
            <CardDescription>
              Lista de videos listos para procesar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadedFiles.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No hay videos subidos
                </p>
              ) : (
                uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="space-y-4 p-4 bg-muted rounded-lg"
                  >
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
                      <Button size="icon" variant="ghost" onClick={() => togglePlayback()}>
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                    </div>

                    {file.preview && (
                      <video
                        className="w-full rounded-lg"
                        src={file.preview}
                        controls={false}
                        poster={file.preview}
                      />
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4" />
                        <Slider
                          value={volume}
                          onValueChange={setVolume}
                          max={100}
                          step={1}
                        />
                      </div>

                      {isProcessing && (
                        <Progress value={progress} className="w-full" />
                      )}

                      <div className="flex justify-between gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => handleProcess(file)}
                          disabled={isProcessing}
                        >
                          Procesar Transcripción
                        </Button>
                        <Button size="icon" variant="outline">
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Tv;