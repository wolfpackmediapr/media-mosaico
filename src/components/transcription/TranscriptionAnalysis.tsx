
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import FiveWAnalysis from "./FiveWAnalysis";
import SummarySection from "./SummarySection";
import AlertsSection from "./AlertsSection";
import KeywordsSection from "./KeywordsSection";

interface TranscriptionAnalysisProps {
  analysis?: {
    quien?: string;
    que?: string;
    cuando?: string;
    donde?: string;
    porque?: string;
    summary?: string;
    alerts?: string[];
    keywords?: string[];
  };
}

const TranscriptionAnalysis = ({ analysis }: TranscriptionAnalysisProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!analysis) return null;

  return (
    <Card className="mt-6 border-primary-100 shadow-md">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-primary-50 to-transparent">
          <CardTitle className="text-2xl font-bold text-primary-900">Análisis de Contenido</CardTitle>
          <CollapsibleTrigger className="rounded-full p-2 hover:bg-primary-100/50 transition-colors">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-primary-700" />
            ) : (
              <ChevronDown className="h-4 w-4 text-primary-700" />
            )}
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent className="space-y-6">
          <CardContent>
            <FiveWAnalysis
              quien={analysis.quien}
              que={analysis.que}
              cuando={analysis.cuando}
              donde={analysis.donde}
              porque={analysis.porque}
            />
            {analysis.summary && <SummarySection summary={analysis.summary} />}
            {analysis.alerts && analysis.alerts.length > 0 && <AlertsSection alerts={analysis.alerts} />}
            {analysis.keywords && analysis.keywords.length > 0 && <KeywordsSection keywords={analysis.keywords} />}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default TranscriptionAnalysis;
