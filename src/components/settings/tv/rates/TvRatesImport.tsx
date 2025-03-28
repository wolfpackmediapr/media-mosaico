
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText, Upload } from "lucide-react";
import { importRatesFromCsv } from "@/services/tv/rates/rateImport";
import { toast } from "sonner";

interface TvRatesImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function TvRatesImport({
  isOpen,
  onClose,
  onImportComplete,
}: TvRatesImportProps) {
  const [csvText, setCsvText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!csvText.trim()) {
      setError("Por favor ingrese o cargue datos CSV");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await importRatesFromCsv(csvText);
      
      if (result.success) {
        toast.success(`Se importaron ${result.imported} tarifas correctamente`);
        
        if (result.errors.length > 0) {
          console.error("Import errors:", result.errors);
          toast.warning(`Se encontraron ${result.errors.length} errores durante la importación`);
        }
        
        setCsvText("");
        onImportComplete();
        onClose();
      } else {
        if (result.errors.length > 0) {
          const firstError = result.errors[0].error;
          setError(`Error en la importación: ${firstError}`);
        } else {
          setError("La importación falló por un error desconocido");
        }
      }
    } catch (error) {
      console.error("Import error:", error);
      setError(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content || "");
    };
    reader.onerror = () => {
      setError("Error al leer el archivo");
    };
    reader.readAsText(file);
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar tarifas</DialogTitle>
          <DialogDescription>
            Importe tarifas de TV desde un archivo CSV o pegue los datos aquí.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="csv-data">Datos CSV</Label>
            <Textarea
              id="csv-data"
              placeholder="Pegue los datos CSV aquí o seleccione un archivo..."
              rows={10}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSelectFile}
              disabled={isUploading}
            >
              <FileText className="h-4 w-4 mr-2" />
              Seleccionar archivo
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>El formato CSV debe incluir estas columnas:</p>
            <ul className="list-disc list-inside ml-2 mt-1">
              <li>channel (nombre del canal)</li>
              <li>program (nombre del programa)</li>
              <li>days (días de la semana, separados por comas)</li>
              <li>start_time (hora de inicio)</li>
              <li>end_time (hora de fin)</li>
              <li>Al menos una de: rate_15s, rate_30s, rate_45s, rate_60s</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
