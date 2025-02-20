
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RadioTranscriptionMetadata from "./RadioTranscriptionMetadata";
import RadioTranscriptionEditor from "./RadioTranscriptionEditor";
import RadioAnalysis from "./RadioAnalysis";

interface RadioTranscriptionSlotProps {
  isProcessing: boolean;
  transcriptionText: string;
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
  };
  onTranscriptionChange: (text: string) => void;
}

const RadioTranscriptionSlot = ({
  isProcessing,
  transcriptionText,
  metadata,
  onTranscriptionChange,
}: RadioTranscriptionSlotProps) => {
  const handleGenerateReport = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-radio-report', {
        body: {
          transcriptionText,
          metadata,
          type: 'radio',
          format: 'pdf',
        },
      });

      if (error) throw error;
      toast.success('Reporte generado exitosamente');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error al generar el reporte');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <RadioTranscriptionMetadata metadata={metadata} />
        <CardContent className="space-y-4">
          <RadioTranscriptionEditor
            transcriptionText={transcriptionText}
            isProcessing={isProcessing}
            onTranscriptionChange={onTranscriptionChange}
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={handleGenerateReport}
              disabled={isProcessing || !transcriptionText}
            >
              <FileBarChart className="mr-2 h-4 w-4" />
              Generar Reporte
            </Button>
          </div>
        </CardContent>
      </Card>

      <RadioAnalysis transcriptionText={transcriptionText} />
    </div>
  );
};

export default RadioTranscriptionSlot;
