
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Upload, AlertCircle, CheckCircle2, FileWarning } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { importRatesFromCsv } from "@/services/radio/rates";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface RadioRatesImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function RadioRatesImport({
  isOpen,
  onClose,
  onImportComplete,
}: RadioRatesImportProps) {
  const [step, setStep] = useState<"upload" | "review" | "result">("upload");
  const [csvContent, setCsvContent] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState(",");
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    errors: any[];
  } | null>(null);

  // Reset the state when the dialog opens
  const handleClose = () => {
    setCsvContent("");
    setCsvFile(null);
    setDelimiter(",");
    setStep("upload");
    setImportResult(null);
    setIsLoading(false);
    onClose();
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  // Handle import
  const handleImport = async () => {
    if (!csvContent) return;

    setIsLoading(true);

    try {
      const result = await importRatesFromCsv(csvContent, delimiter);
      setImportResult(result);
      setStep("result");

      if (result.success) {
        toast.success(`Importación completada. ${result.imported} tarifas importadas.`);
        if (result.errors.length > 0) {
          toast.warning(`Hubo ${result.errors.length} errores durante la importación.`);
        }
      } else {
        toast.error("Error durante la importación. Revisa los detalles.");
      }

      // Refresh the rates list
      onImportComplete();
    } catch (error) {
      toast.error("Error durante la importación");
      console.error("Import error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pasting CSV content
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCsvContent(e.target.value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Importar Tarifas</DialogTitle>
          <DialogDescription>
            Importa tarifas de radio desde un archivo CSV.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file" className="mt-4">
          <TabsList className="mb-4">
            <TabsTrigger value="file">Archivo CSV</TabsTrigger>
            <TabsTrigger value="paste">Pegar Contenido</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            <div className="border border-dashed border-gray-300 rounded-md p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500 mb-2">
                Arrastra y suelta un archivo CSV o haz clic para seleccionar
              </p>
              <Input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                Seleccionar Archivo
              </Button>
              {csvFile && (
                <p className="mt-2 text-sm font-medium">
                  Archivo seleccionado: {csvFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="delimiter">Delimitador</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={delimiter === "," ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDelimiter(",")}
                >
                  Coma (,)
                </Button>
                <Button
                  type="button"
                  variant={delimiter === ";" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDelimiter(";")}
                >
                  Punto y coma (;)
                </Button>
                <Button
                  type="button"
                  variant={delimiter === "\t" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDelimiter("\t")}
                >
                  Tabulador
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-content">Contenido CSV</Label>
              <Textarea
                id="csv-content"
                placeholder="Pega el contenido CSV aquí..."
                rows={10}
                value={csvContent}
                onChange={handleContentChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delimiter">Delimitador</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={delimiter === "," ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDelimiter(",")}
                >
                  Coma (,)
                </Button>
                <Button
                  type="button"
                  variant={delimiter === ";" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDelimiter(";")}
                >
                  Punto y coma (;)
                </Button>
                <Button
                  type="button"
                  variant={delimiter === "\t" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDelimiter("\t")}
                >
                  Tabulador
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {step === "result" && importResult && (
          <div className="mt-4 space-y-4">
            <Alert
              variant={importResult.success ? "default" : "destructive"}
              className="mb-4"
            >
              {importResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {importResult.success
                  ? "Importación completada"
                  : "Error en la importación"}
              </AlertTitle>
              <AlertDescription>
                {importResult.success
                  ? `Se importaron ${importResult.imported} tarifas correctamente.`
                  : "No se pudieron importar las tarifas."}
                {importResult.errors.length > 0 &&
                  ` Se encontraron ${importResult.errors.length} errores.`}
              </AlertDescription>
            </Alert>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Errores encontrados:</h4>
                <div className="max-h-60 overflow-y-auto border rounded-md p-4">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="mb-2 pb-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <FileWarning className="h-4 w-4 text-destructive" />
                        <Badge variant="destructive">
                          {error.line ? `Línea ${error.line}` : "Error"}
                        </Badge>
                        <span className="text-sm">{error.error}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!csvContent || isLoading}
              >
                {isLoading ? "Importando..." : "Importar"}
              </Button>
            </>
          )}

          {step === "result" && (
            <Button onClick={handleClose}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
