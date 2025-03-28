
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileUpload, Upload, X, AlertCircle, FileDown } from "lucide-react";
import { toast } from "sonner";
import { importRatesFromCSV } from "@/services/tv/rates";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TvRatesImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function TvRatesImport({ isOpen, onClose, onImportComplete }: TvRatesImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Validate file is CSV
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        setError("Por favor seleccione un archivo CSV válido");
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setError(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Validate file is CSV
      if (!droppedFile.name.toLowerCase().endsWith('.csv')) {
        setError("Por favor seleccione un archivo CSV válido");
        return;
      }
      
      setFile(droppedFile);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!file) {
      setError("Por favor seleccione un archivo para importar");
      return;
    }
    
    setIsImporting(true);
    setError(null);
    
    try {
      await importRatesFromCSV(file);
      toast.success("Importación completada correctamente");
      onImportComplete();
      onClose();
    } catch (error) {
      console.error("Import error:", error);
      setError(typeof error === 'string' ? error : "Error al importar tarifas");
      toast.error("Error al importar tarifas");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    onClose();
  };
  
  const downloadTemplateCSV = () => {
    const csvContent = `channel_id,program_id,days,start_time,end_time,rate_15s,rate_30s,rate_45s,rate_60s
channel-uuid-here,program-uuid-here,"Mon,Tue,Wed",08:00,09:00,500,1000,1300,1600`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'tarifas_tv_plantilla.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Tarifas</DialogTitle>
          <DialogDescription>
            Suba un archivo CSV con las tarifas de televisión.
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className={`border-2 border-dashed rounded-md p-8 text-center ${error ? 'border-destructive' : 'border-muted-foreground/25'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {file ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileUpload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate max-w-[180px]">
                  {file.name}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setFile(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <Label 
                htmlFor="file-upload" 
                className="text-sm font-medium cursor-pointer text-primary hover:underline"
              >
                Seleccionar archivo CSV
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">o arrastre y suelte el archivo aquí</p>
            </div>
          )}
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            size="sm" 
            type="button"
            onClick={downloadTemplateCSV}
            className="flex items-center"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Descargar plantilla CSV
          </Button>
        </div>
        
        <DialogFooter className="flex space-x-2 sm:justify-end">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isImporting}
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={handleImport}
            disabled={!file || isImporting}
          >
            {isImporting ? 'Importando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
