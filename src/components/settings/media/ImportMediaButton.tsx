
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { seedMediaOutlets } from "@/services/media/mediaImportService";

interface ImportMediaButtonProps {
  onImportComplete: () => void;
  csvData: string;
  disabled?: boolean;
}

export function ImportMediaButton({ 
  onImportComplete,
  csvData,
  disabled = false
}: ImportMediaButtonProps) {
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!csvData.trim()) {
      toast.error("No hay datos para importar");
      return;
    }

    try {
      setIsImporting(true);
      await seedMediaOutlets(csvData);
      toast.success("Medios importados correctamente");
      onImportComplete();
    } catch (error) {
      console.error("Error importing media:", error);
      toast.error("Error al importar los medios");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Button
      onClick={handleImport}
      disabled={disabled || isImporting}
      variant="outline"
      className="gap-2"
    >
      {isImporting ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Importando...
        </>
      ) : (
        <>
          <Upload className="h-4 w-4" />
          Importar Medios
        </>
      )}
    </Button>
  );
}
