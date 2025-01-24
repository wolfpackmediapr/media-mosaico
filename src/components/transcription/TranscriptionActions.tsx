import { Button } from "@/components/ui/button";
import { FileText, Mail, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

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
    
    toast({
      title: "Exportación exitosa",
      description: "El archivo TXT ha sido descargado",
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

      toast({
        title: "Exportación exitosa",
        description: "El archivo PDF ha sido descargado",
      });
    } catch (error) {
      toast({
        title: "Error en la exportación",
        description: "No se pudo generar el archivo PDF",
        variant: "destructive",
      });
    }
  };

  const sendEmail = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: { 
          text: transcriptionText,
          metadata,
          subject: `Transcripción: ${metadata?.program || 'Sin título'}`
        }
      });

      if (error) throw error;

      toast({
        title: "Correo enviado",
        description: "La transcripción ha sido enviada por correo electrónico",
      });
    } catch (error) {
      toast({
        title: "Error al enviar",
        description: "No se pudo enviar el correo electrónico",
        variant: "destructive",
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
      <Button
        variant="outline"
        onClick={sendEmail}
        disabled={!transcriptionText || isProcessing}
      >
        <Mail className="mr-2 h-4 w-4" />
        Enviar por Correo Electrónico
      </Button>
    </div>
  );
};

export default TranscriptionActions;