
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ContentSafetySectionProps {
  contentSafety?: {
    status: string;
    results: Array<{
      text: string;
      labels: Array<{
        label: string;
        confidence: number;
        severity: number;
      }>;
      timestamp: {
        start: number;
        end: number;
      };
    }>;
    summary: Record<string, number>;
    severity_score_summary: Record<string, {
      low: number;
      medium: number;
      high: number;
    }>;
  };
}

const ContentSafetySection = ({ contentSafety }: ContentSafetySectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!contentSafety || contentSafety.status !== "success") return null;

  return (
    <Card className="mt-6">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Content Safety Analysis
          </CardTitle>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              {isExpanded ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {Object.entries(contentSafety.summary).map(([label, confidence]) => (
              <div key={label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium capitalize">{label.replace(/_/g, ' ')}</span>
                  <span className="text-sm text-muted-foreground">
                    {(confidence * 100).toFixed(1)}% confidence
                  </span>
                </div>
                <Progress value={confidence * 100} className="h-2" />
                {contentSafety.severity_score_summary[label] && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-green-500">
                      Low: {(contentSafety.severity_score_summary[label].low * 100).toFixed(1)}%
                    </span>
                    <span className="text-yellow-500">
                      Medium: {(contentSafety.severity_score_summary[label].medium * 100).toFixed(1)}%
                    </span>
                    <span className="text-red-500">
                      High: {(contentSafety.severity_score_summary[label].high * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ContentSafetySection;
