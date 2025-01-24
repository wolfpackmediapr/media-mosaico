import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Mail, FileDown, Tag, Clock, Radio, Tv } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface TranscriptionSlotProps {
  isProcessing: boolean;
  transcriptionText: string;
  metadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
    keywords?: string[];
  };
  onTranscriptionChange: (text: string) => void;
}

const TranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  metadata,
  onTranscriptionChange,
}: TranscriptionSlotProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    onTranscriptionChange(newText);
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('transcriptions')
        .update({ transcription_text: newText })
        .eq('transcription_text', transcriptionText);

      if (error) throw error;

      setTimeout(() => setIsSaving(false), 1000);
      
      toast({
        title: "Guardado automático",
        description: "La transcripción se ha guardado correctamente",
      });
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
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Transcripción Generada</CardTitle>
        <CardDescription>
          La transcripción del video aparecerá aquí una vez que se complete el proceso.
          {isSaving && <span className="text-primary ml-2">Guardando...</span>}
        </CardDescription>
        {metadata && (
          <div className="flex flex-wrap gap-2 mt-2">
            {metadata.channel && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Tv className="w-3 h-3" />
                {metadata.channel}
              </Badge>
            )}
            {metadata.program && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Radio className="w-3 h-3" />
                {metadata.program}
              </Badge>
            )}
            {metadata.broadcastTime && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(metadata.broadcastTime).toLocaleString('es-ES')}
              </Badge>
            )}
            {metadata.category && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {metadata.category}
              </Badge>
            )}
          </div>
        )}
        {metadata?.keywords && metadata.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {metadata.keywords.map((keyword, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        )}
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