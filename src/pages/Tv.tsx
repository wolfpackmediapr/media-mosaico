import { useState } from "react";
import { Upload, Play, FileVideo, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const Tv = () => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

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

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('video/')
    );

    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Por favor, sube únicamente archivos de video.",
        variant: "destructive"
      });
      return;
    }

    setUploadedFiles(prev => [...prev, ...files]);
    toast({
      title: "Éxito",
      description: `${files.length} video(s) subido(s) correctamente.`
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(file => 
        file.type.startsWith('video/')
      );
      setUploadedFiles(prev => [...prev, ...files]);
      toast({
        title: "Éxito",
        description: `${files.length} video(s) subido(s) correctamente.`
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">BOT TV</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Monitoreo y análisis de contenido televisivo
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subir Videos</CardTitle>
            <CardDescription>
              Arrastra y suelta tus archivos de video o selecciónalos manualmente
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
                Arrastra y suelta tus archivos aquí
              </p>
              <p className="text-xs text-gray-500 mb-4">
                o
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
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileVideo className="w-5 h-5" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost">
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost">
                        <Mail className="w-4 h-4" />
                      </Button>
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