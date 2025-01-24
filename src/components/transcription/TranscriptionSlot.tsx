import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Mail, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TranscriptionSlotProps {
  isProcessing: boolean;
  transcriptionText: string;
  onTranscriptionChange: (text: string) => void;
}

const TranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  onTranscriptionChange,
}: TranscriptionSlotProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    onTranscriptionChange(newText);
    
    // Simulate autosave
    setIsSaving(true);
    try {
      // Here you would typically save to Supabase
      // await supabase.from('transcriptions').update...
      setTimeout(() => setIsSaving(false), 1000);
    } catch (error) {
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la transcripción",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

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
        body: { text: transcriptionText }
      });

      if (error) throw error;

      // Convert base64 to blob and download
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
        body: { text: transcriptionText }
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
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Transcripción Generada</CardTitle>
        <CardDescription>
          La transcripción del video aparecerá aquí una vez que se complete el proceso.
          {isSaving && <span className="text-primary ml-2">Guardando...</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Aquí aparecerá el texto transcrito..."
          className="min-h-[200px] resize-y"
          value={transcriptionText}
          onChange={handleTextChange}
          disabled={isProcessing}
        />
        
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
      </CardContent>
    </Card>
  );
};

export default TranscriptionSlot;