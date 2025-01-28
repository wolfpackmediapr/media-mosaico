import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface SpeakersSectionProps {
  speakers?: Array<{
    speaker: string;
    confidence: number;
    start: number;
    end: number;
  }>;
}

const SpeakersSection = ({ speakers }: SpeakersSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!speakers || speakers.length === 0) return null;

  // Get unique speakers
  const uniqueSpeakers = Array.from(new Set(speakers.map(s => s.speaker)));

  return (
    <Card className="mt-6">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Speakers
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
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {uniqueSpeakers.map((speaker, index) => (
                  <Badge
                    key={speaker}
                    variant="secondary"
                    className="text-sm"
                  >
                    Speaker {index + 1}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default SpeakersSection;