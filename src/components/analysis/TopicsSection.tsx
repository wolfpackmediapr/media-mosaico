
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TopicsSectionProps {
  topics?: {
    status: string;
    results: Array<{
      text: string;
      labels: Array<{
        label: string;
        relevance: number;
      }>;
      timestamp: {
        start: number;
        end: number;
      };
    }>;
    summary: Record<string, number>;
  };
}

const TopicsSection = ({ topics }: TopicsSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!topics || topics.status !== "success") return null;

  return (
    <Card className="mt-6">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Topics
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
          <CardContent className="space-y-4">
            {Object.entries(topics.summary)
              .sort(([, a], [, b]) => b - a)
              .map(([topic, relevance]) => (
                <div key={topic} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {topic.split('>').map((part, i, arr) => (
                        <span key={i}>
                          {i > 0 && <span className="mx-1 text-muted-foreground">›</span>}
                          <span className={i === arr.length - 1 ? "text-primary" : "text-muted-foreground"}>
                            {part}
                          </span>
                        </span>
                      ))}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {(relevance * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={relevance * 100} className="h-2" />
                </div>
              ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default TopicsSection;
