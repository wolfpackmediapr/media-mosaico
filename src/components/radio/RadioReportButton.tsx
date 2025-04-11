
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RadioReportButtonProps {
  transcriptionText: string;
  metadata?: {
    emisora?: string;
    programa?: string;
    horario?: string;
    categoria?: string;
    station_id?: string;
    program_id?: string;
  };
  isProcessing: boolean;
}

const RadioReportButton = ({ 
  transcriptionText, 
  metadata, 
  isProcessing 
}: RadioReportButtonProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true);
      toast.loading('Generando reporte...');
      
      const { data, error } = await supabase.functions.invoke('generate-radio-report', {
        body: {
          transcriptionText,
          metadata,
          type: 'radio',
          format: 'pdf',
        },
      });

      if (error) throw error;
      
      toast.dismiss();
      toast.success('Reporte generado exitosamente');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.dismiss();
      toast.error('Error al generar el reporte');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleGenerateReport}
      disabled={isProcessing || !transcriptionText || isGeneratingReport}
      className="w-full sm:w-auto"
    >
      <FileBarChart className="mr-2 h-4 w-4" />
      {isGeneratingReport ? 'Generando...' : 'Generar Reporte'}
    </Button>
  );
};

export default RadioReportButton;
