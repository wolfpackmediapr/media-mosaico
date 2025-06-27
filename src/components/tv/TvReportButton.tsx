
import React from "react";
import { Button } from "@/components/ui/button";
import { FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NewsSegment } from "@/hooks/tv/useTvVideoProcessor";

interface TvReportButtonProps {
  segments?: NewsSegment[];
  transcriptionText: string;
  notepadContent?: string;
  metadata?: {
    channel?: string;
    program?: string;
    category?: string;
    broadcastTime?: string;
  };
  isProcessing?: boolean;
}

const TvReportButton: React.FC<TvReportButtonProps> = ({
  segments = [],
  transcriptionText,
  notepadContent = "",
  metadata,
  isProcessing = false,
}) => {
  const handleGenerateReport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          type: 'tv_transcription',
          format: 'pdf',
          segments,
          transcriptionText,
          notepadContent,
          metadata: {
            channel: metadata?.channel,
            program: metadata?.program,
            category: metadata?.category,
            broadcastTime: metadata?.broadcastTime,
          },
        },
      });

      if (error) throw error;
      
      toast.success('Reporte generado exitosamente', {
        description: 'El reporte de TV ha sido creado correctamente'
      });
    } catch (error) {
      console.error('Error generating TV report:', error);
      toast.error('Error al generar reporte', {
        description: 'No se pudo generar el reporte de TV'
      });
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleGenerateReport}
      disabled={isProcessing || !transcriptionText}
      className="w-full sm:w-auto"
    >
      <FileBarChart className="mr-2 h-4 w-4" />
      Generar Reporte TV
    </Button>
  );
};

export default TvReportButton;
