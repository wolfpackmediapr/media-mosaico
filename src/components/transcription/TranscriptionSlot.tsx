import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Mail, FileDown } from "lucide-react";

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
  const [isSaving, setIsSaving] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTranscriptionChange(e.target.value);
    // Simulate autosave
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
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
  };

  const exportAsPDF = () => {
    // TODO: Implement PDF export functionality
    console.log("Export as PDF clicked");
  };

  const sendEmail = () => {
    // TODO: Implement email sending functionality
    console.log("Send email clicked");
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