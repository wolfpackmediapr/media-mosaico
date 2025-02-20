
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TranscriptionAnalysisProps {
  transcriptionText?: string;
}

const TranscriptionAnalysis = ({ transcriptionText }: TranscriptionAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState("");

  const analyzeContent = async () => {
    if (!transcriptionText) {
      toast({
        title: "Error",
        description: "No hay texto para analizar",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-content', {
        body: { transcriptionText }
      });

      if (error) throw error;

      if (data?.analysis) {
        setAnalysis(data.analysis);
        toast({
          title: "Análisis completado",
          description: "El contenido ha sido analizado exitosamente.",
        });
      }
    } catch (error) {
      console.error('Error analyzing content:', error);
      toast({
        title: "Error",
        description: "No se pudo analizar el contenido. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="bg-gradient-to-r from-primary-50 to-transparent">
        <CardTitle className="text-2xl font-bold text-primary-900">
          Análisis de Contenido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex justify-end">
          <Button
            onClick={analyzeContent}
            disabled={isAnalyzing || !transcriptionText}
            className="w-full sm:w-auto"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analizando...
              </>
            ) : (
              'Analizar Contenido'
            )}
          </Button>
        </div>
        <Textarea
          value={analysis}
          readOnly
          className="min-h-[200px] font-mono text-sm"
          placeholder="El análisis del contenido aparecerá aquí..."
        />
      </CardContent>
    </Card>
  );
};

export default TranscriptionAnalysis;
