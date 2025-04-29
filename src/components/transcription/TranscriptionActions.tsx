
import { Button } from "@/components/ui/button";
import { FileText, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TranscriptionActionsProps {
  transcriptionText: string;
  metadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
    keywords?: string[];
  };
  isProcessing: boolean;
}

const TranscriptionActions = ({ transcriptionText, metadata, isProcessing }: TranscriptionActionsProps) => {
  const exportAsTXT = () => {
    const blob = new Blob([transcriptionText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcripcion.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Exportación exitosa", {
      description: "El archivo TXT ha sido descargado"
    });
  };

  const exportAsPDF = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: { text: transcriptionText, metadata }
      });

      if (error) throw error;

      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transcripcion.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Exportación exitosa", {
        description: "El archivo PDF ha sido descargado"
      });
    } catch (error) {
      toast.error("Error en la exportación", {
        description: "No se pudo generar el archivo PDF"
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={exportAsPDF}
        disabled={!transcriptionText || isProcessing}
      >
        <FileText className="mr-2 h-4 w-4" />
        Exportar como PDF
      </Button>
      <Button
        variant="outline"
        onClick={exportAsTXT}
        disabled={!transcriptionText || isProcessing}
      >
        <FileDown className="mr-2 h-4 w-4" />
        Exportar como TXT
      </Button>
    </div>
  );
};

export default TranscriptionActions;
