
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, AlertTriangle, File, Check, X, FileText, Info } from "lucide-react";
import { parseRatesCSV, importRates, ImportedRateType } from "@/services/radio/importService";
import { toast } from "sonner";

interface RadioRatesImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function RadioRatesImport({
  open,
  onOpenChange,
  onImportComplete
}: RadioRatesImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportedRateType[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'review' | 'importing' | 'complete'>('upload');
  const [importStats, setImportStats] = useState<{
    imported: number;
    errors: number;
    message: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const parseFile = async () => {
    if (!file) {
      setError("Por favor seleccione un archivo");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Check file extension
      if (!file.name.toLowerCase().endsWith('.csv')) {
        throw new Error('Solo se permiten archivos CSV');
      }
      
      const data = await parseRatesCSV(file);
      
      if (data.length === 0) {
        throw new Error('El archivo no contiene datos válidos');
      }
      
      setParsedData(data);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartImport = async () => {
    if (!parsedData) return;
    
    setIsLoading(true);
    setStep('importing');
    setImportProgress(10);
    
    try {
      // Start the import process
      const result = await importRates(parsedData);
      
      setImportProgress(100);
      setImportStats({
        imported: result.imported,
        errors: result.errors,
        message: result.message
      });
      
      toast[result.success ? 'success' : 'error'](result.message);
      
      // If successful, update the parent component
      if (result.success) {
        setStep('complete');
        // Notify parent component to refresh the rates list
        onImportComplete();
      } else {
        setError('Hubo errores durante la importación');
        setStep('review');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error durante la importación');
      setStep('review');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setError(null);
    setImportProgress(0);
    setImportStats(null);
    setStep('upload');
  };

  const handleClose = () => {
    if (step === 'complete') {
      handleReset();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importar Tarifas de Radio</DialogTitle>
          <DialogDescription>
            Cargue un archivo CSV con las tarifas de radio para importar.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'upload' && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center ${
              isLoading ? 'opacity-50 pointer-events-none' : ''
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center gap-4">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="font-medium">Arrastre un archivo o haga clic para seleccionar</h3>
                <p className="text-sm text-muted-foreground">
                  Formato requerido: CSV con columnas station_name, program_name, days, start_time, end_time, rate_15s, rate_30s, etc.
                </p>
              </div>
              
              <input
                type="file"
                id="rate-file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('rate-file')?.click()}
                disabled={isLoading}
              >
                Seleccionar archivo
              </Button>
              
              {file && (
                <div className="flex items-center mt-4 p-2 bg-muted rounded">
                  <FileText className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'review' && parsedData && (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Listo para importar</AlertTitle>
              <AlertDescription>
                Se encontraron {parsedData.length} tarifas en el archivo. 
                Revise que el archivo sea correcto y confirme para importar.
              </AlertDescription>
            </Alert>
            
            <div className="border rounded-md p-4 space-y-3">
              <h3 className="font-medium">Resumen del archivo</h3>
              <div className="text-sm space-y-2">
                <div><strong>Nombre:</strong> {file?.name}</div>
                <div><strong>Tamaño:</strong> {file ? (file.size / 1024).toFixed(1) + ' KB' : 'Desconocido'}</div>
                <div><strong>Tarifas detectadas:</strong> {parsedData.length}</div>
                {parsedData.length > 0 && (
                  <div><strong>Estaciones:</strong> {new Set(parsedData.map(r => r.station_name)).size}</div>
                )}
                {parsedData.length > 0 && (
                  <div><strong>Programas:</strong> {new Set(parsedData.map(r => r.program_name)).size}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground">
              Importando tarifas, esto puede tomar unos minutos...
            </p>
            <Progress value={importProgress} className="h-2" />
          </div>
        )}

        {step === 'complete' && importStats && (
          <div className="space-y-4">
            <Alert variant={importStats.errors === 0 ? "default" : "warning"}>
              {importStats.errors === 0 ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle>Importación completada</AlertTitle>
              <AlertDescription>{importStats.message}</AlertDescription>
            </Alert>
            
            <div className="flex justify-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{importStats.imported}</div>
                <div className="text-sm text-muted-foreground">Importadas</div>
              </div>
              {importStats.errors > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">{importStats.errors}</div>
                  <div className="text-sm text-muted-foreground">Errores</div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={parseFile} 
                disabled={!file || isLoading}
              >
                {isLoading ? 'Procesando...' : 'Continuar'}
              </Button>
            </>
          )}
          
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={handleReset}>
                Volver
              </Button>
              <Button 
                onClick={handleStartImport}
                disabled={isLoading}
              >
                Importar {parsedData?.length} Tarifas
              </Button>
            </>
          )}
          
          {step === 'importing' && (
            <Button disabled>
              Importando...
            </Button>
          )}
          
          {step === 'complete' && (
            <>
              <Button variant="outline" onClick={handleReset}>
                Importar otro archivo
              </Button>
              <Button onClick={handleClose}>
                Finalizar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
