
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { AlertTriangle, FileText, Upload, CheckCircle2, XCircle } from "lucide-react";
import { parseRatesCSV, importRates, ImportedRateType } from "@/services/radio/rates/rateImport";

interface RadioRatesImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function RadioRatesImport({ open, onOpenChange, onImportComplete }: RadioRatesImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importedRates, setImportedRates] = useState<ImportedRateType[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'review' | 'importing' | 'complete'>('upload');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    errors: number;
    message: string;
  } | null>(null);

  const resetState = () => {
    setFile(null);
    setErrorMessage(null);
    setImportedRates([]);
    setImportStep('upload');
    setImportResult(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      await handleFileSelection(droppedFile);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = async (selectedFile: File) => {
    setErrorMessage(null);
    setImportStep('upload');
    
    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMessage('Por favor seleccione un archivo CSV.');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setErrorMessage('El archivo es demasiado grande. El tamaño máximo es 10MB.');
      return;
    }
    
    setFile(selectedFile);
    
    try {
      setIsAnalyzing(true);
      const parsedRates = await parseRatesCSV(selectedFile);
      
      if (parsedRates.length === 0) {
        setErrorMessage('No se encontraron datos de tarifas en el archivo CSV.');
        setFile(null);
        return;
      }
      
      setImportedRates(parsedRates);
      setImportStep('review');
    } catch (error) {
      console.error("Error parsing CSV:", error);
      setErrorMessage(`Error al analizar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImport = async () => {
    if (importedRates.length === 0) {
      setErrorMessage('No hay tarifas para importar.');
      return;
    }
    
    try {
      setImportStep('importing');
      setIsUploading(true);
      
      const result = await importRates(importedRates);
      setImportResult(result);
      setImportStep('complete');
      
      if (result.success) {
        // Only show toast for success, the modal will show errors
        if (result.errors === 0) {
          toast.success(`Importación completada: ${result.imported} tarifas importadas.`);
        }
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      console.error("Error importing rates:", error);
      setErrorMessage(`Error durante la importación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setImportStep('review'); // Go back to review
    } finally {
      setIsUploading(false);
    }
  };

  const completeImport = () => {
    onImportComplete();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importar Tarifas de Radio</DialogTitle>
          <DialogDescription>
            Suba un archivo CSV con las tarifas de radio para importarlas.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {importStep === 'upload' && (
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-primary bg-primary/10' : 'border-border'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('rate-file-input')?.click()}
          >
            <input
              type="file"
              id="rate-file-input"
              className="hidden"
              accept=".csv"
              onChange={handleFileInputChange}
            />
            <FileText className="h-10 w-10 mb-3 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              Arrastre y suelte el archivo CSV aquí o haga clic para seleccionar
            </p>
            {file && <p className="text-sm font-medium">{file.name}</p>}
            
            <div className="mt-4 text-xs text-muted-foreground">
              <p>El archivo debe tener las siguientes columnas:</p>
              <p className="font-mono bg-muted p-1 mt-1 rounded">
                station_name, program_name, days, start_time, end_time, rate_15s, rate_30s, rate_45s, rate_60s
              </p>
            </div>
          </div>
        )}

        {importStep === 'review' && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Archivo analizado correctamente</AlertTitle>
              <AlertDescription className="text-sm">
                Se encontraron {importedRates.length} tarifas para importar.
                Revise la información antes de continuar.
              </AlertDescription>
            </Alert>
            
            <div className="max-h-40 overflow-y-auto border rounded-md">
              <div className="p-2 bg-muted text-xs font-medium">
                Estaciones: {new Set(importedRates.map(r => r.station_name)).size} | 
                Programas: {new Set(importedRates.map(r => r.program_name)).size}
              </div>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="p-2 text-left">Estación</th>
                    <th className="p-2 text-left">Programa</th>
                    <th className="p-2 text-left">Horario</th>
                  </tr>
                </thead>
                <tbody>
                  {importedRates.slice(0, 5).map((rate, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{rate.station_name}</td>
                      <td className="p-2">{rate.program_name}</td>
                      <td className="p-2">
                        {rate.start_time.substring(0, 5)} - {rate.end_time.substring(0, 5)}
                      </td>
                    </tr>
                  ))}
                  {importedRates.length > 5 && (
                    <tr>
                      <td colSpan={3} className="p-2 text-center text-muted-foreground">
                        ... y {importedRates.length - 5} más
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {file?.name} - {(file?.size || 0) / 1024 < 1000 
                  ? `${Math.round((file?.size || 0) / 1024)} KB` 
                  : `${Math.round((file?.size || 0) / 1024 / 1024 * 10) / 10} MB`}
              </p>
              <Button variant="outline" size="sm" onClick={() => setImportStep('upload')}>
                Cambiar archivo
              </Button>
            </div>
          </div>
        )}

        {importStep === 'importing' && (
          <div className="py-6 flex flex-col items-center justify-center">
            <Upload className="h-10 w-10 animate-pulse mb-4 text-primary" />
            <p className="text-center">Importando tarifas...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Esto puede tardar un momento. Por favor, no cierre esta ventana.
            </p>
          </div>
        )}

        {importStep === 'complete' && importResult && (
          <div className="space-y-4">
            <Alert variant={importResult.errors === 0 ? "default" : "warning"}>
              {importResult.errors === 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle>Importación {importResult.success ? 'completada' : 'finalizada con errores'}</AlertTitle>
              <AlertDescription className="text-sm">
                {importResult.message}
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">{importResult.imported}</p>
                <p className="text-sm text-muted-foreground">Tarifas importadas</p>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <p className={`text-2xl font-bold ${importResult.errors > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {importResult.errors}
                </p>
                <p className="text-sm text-muted-foreground">Errores</p>
              </div>
            </div>
            
            {importResult.errors > 0 && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertTitle>Algunas tarifas no pudieron ser importadas</AlertTitle>
                <AlertDescription className="text-xs">
                  Esto puede deberse a que la estación no existe, el programa no es válido o hay datos en formato incorrecto.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {importStep === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button 
                disabled={!file || isAnalyzing} 
                onClick={() => document.getElementById('rate-file-input')?.click()}
              >
                {isAnalyzing ? 'Analizando...' : 'Seleccionar archivo'}
              </Button>
            </>
          )}
          
          {importStep === 'review' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleImport} disabled={isUploading || importedRates.length === 0}>
                Importar {importedRates.length} tarifas
              </Button>
            </>
          )}
          
          {importStep === 'complete' && (
            <Button onClick={completeImport}>
              {importResult?.success ? 'Continuar' : 'Cerrar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
